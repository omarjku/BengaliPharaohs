"""POST /api/burst: facts up + changed pack parts down in one round trip."""
import os
import uuid

os.environ["MOCK_LLM"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SAAO_TOKEN"] = "test-saao"

from fastapi.testclient import TestClient  # noqa: E402

from app import pack  # noqa: E402
from app.main import app  # noqa: E402
from tests.test_sync import SAAO, case  # noqa: E402

UP = "SRJ-SIRAJGANJ"


def burst(c, cases=(), versions=None, device="b-dev", upazila=UP):
    return c.post("/api/burst", json={"device_id": device, "upazila": upazila, "pack_versions": versions or {}, "cases": list(cases)})


def test_first_burst_returns_every_part_in_priority_order_and_stores_cases():
    with TestClient(app) as c:
        k = case(upazila="BURST1")
        r = burst(c, [k]).json()
        assert r["accepted"] == [k["case_id"]] and r["rejected"] == []
        assert list(r["pack"]["parts"]) == ["case_replies", "flood", "forecast", "advisories", "prices"]
        assert r["pack"]["parts"]["flood"]["data"]["station"] and r["server_time"]
        assert len(c.get("/api/cases", params={"upazila": "BURST1"}, headers=SAAO).json()) == 1


def test_unchanged_versions_return_no_parts_and_changed_ones_return_only_those():
    with TestClient(app) as c:
        full = burst(c).json()["pack"]["parts"]
        have = {n: p["version"] for n, p in full.items()}
        assert burst(c, versions=have).json()["pack"]["parts"] == {}
        have["flood"] = "old"
        assert list(burst(c, versions=have).json()["pack"]["parts"]) == ["flood"]


def test_reply_arrives_in_the_next_burst_for_that_device_only():
    with TestClient(app) as c:
        k = case(upazila="BURST2")
        first = burst(c, [k], device="devR").json()["pack"]["parts"]
        have = {n: p["version"] for n, p in first.items()}
        c.post(f"/api/cases/{k['case_id']}/reply", json={"text": "spray later", "by": "saao"}, headers=SAAO)
        parts = burst(c, versions=have, device="devR").json()["pack"]["parts"]
        assert [r["text"] for r in parts["case_replies"]["data"]["replies"]] == ["spray later"]
        other = burst(c, device="devOther").json()["pack"]["parts"]
        assert other["case_replies"]["data"]["replies"] == []


def test_retry_is_idempotent_consent_rejected_and_limit():
    with TestClient(app) as c:
        k, bad = case(upazila="BURST3"), case(consent=False)
        for _ in range(2):
            assert burst(c, [k]).json()["accepted"] == [k["case_id"]]
        assert burst(c, [bad]).json()["rejected"] == [{"case_id": bad["case_id"], "reason": "no_consent"}]
        assert len(c.get("/api/cases", params={"upazila": "BURST3"}, headers=SAAO).json()) == 1
        assert burst(c, [case() for _ in range(21)]).status_code == 422


def test_unknown_upazila_still_saves_cases_and_no_upazila_means_no_pack():
    with TestClient(app) as c:
        k = case(upazila="BURST4")
        r = burst(c, [k], upazila="NOPE").json()
        assert r["accepted"] == [k["case_id"]] and r["pack"] is None
        assert burst(c, upazila=None).json()["pack"] is None


def test_real_codes_work_without_the_frontend_folder(monkeypatch):
    # Railway deploys backend/ only: the code list must not depend on ../frontend/public/data.
    monkeypatch.setattr(pack, "APP_DATA", pack.MOCKS / "missing")
    with TestClient(app) as c:
        assert c.get("/api/pack/manifest", params={"upazila": UP}).status_code == 200
        assert burst(c).json()["pack"]["parts"]["flood"]
