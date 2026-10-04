"""Voice questions: audio + facts in any order -> one AI reply in the farmer's case_replies, transcript for the SAAO."""
import os

os.environ["MOCK_LLM"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SAAO_TOKEN"] = "test-saao"

from fastapi.testclient import TestClient  # noqa: E402

from app import notes  # noqa: E402
from app.main import app  # noqa: E402
from tests.test_sync import SAAO, case, post  # noqa: E402


def replies(c, device):
    r = c.post("/api/burst", json={"device_id": device, "upazila": "SRJ-SIRAJGANJ", "cases": []}).json()
    return r["pack"]["parts"]["case_replies"]["data"]["replies"]


def test_note_gets_one_ai_reply_whatever_arrives_first(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "x")
    monkeypatch.setattr(notes, "transcribe", lambda audio, ct: "পাতা হলুদ হচ্ছে")
    monkeypatch.setattr(notes, "answer", lambda t: "কৃষি অফিসারকে দেখান।")
    with TestClient(app) as c:
        for audio_first in (True, False):
            k = case(kind="note", card="NOTE", output_code="", has_voice=True, upazila="NOTES")
            put = lambda: c.put(f"/api/cases/{k['case_id']}/voice", content=b"ogg", headers={"Content-Type": "audio/webm"})  # noqa: E731
            if audio_first:
                put(); post(c, [k], device="n-dev")  # noqa: E702
            else:
                post(c, [k], device="n-dev"); put()  # noqa: E702
            put()  # a retry must not answer twice
        mine = [r for r in replies(c, "n-dev") if r["by"] == "ai"]
        assert len(mine) == 2 and mine[0]["text"] == "“পাতা হলুদ হচ্ছে”\nকৃষি অফিসারকে দেখান।"
        assert all(x["taps"]["transcript"] == "পাতা হলুদ হচ্ছে" for x in c.get("/api/cases", params={"upazila": "NOTES"}, headers=SAAO).json())


def test_no_key_or_not_a_note_means_no_ai_reply(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(app) as c:
        k = case(kind="note", card="NOTE", has_voice=True)
        post(c, [k], device="n2"); c.put(f"/api/cases/{k['case_id']}/voice", content=b"x", headers={"Content-Type": "audio/webm"})  # noqa: E702
        monkeypatch.setenv("OPENAI_API_KEY", "x")
        monkeypatch.setattr(notes, "transcribe", lambda a, ct: (_ for _ in ()).throw(AssertionError("must not run")))
        leaf = case(has_voice=True)
        post(c, [leaf], device="n2"); c.put(f"/api/cases/{leaf['case_id']}/voice", content=b"x", headers={"Content-Type": "audio/webm"})  # noqa: E702
        assert replies(c, "n2") == []
