"""Sync endpoints: idempotent batches, out-of-order blobs, consent, limits, ETag/304, pack replies."""
import os
import uuid

os.environ["MOCK_LLM"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SAAO_TOKEN"] = "test-saao"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

JPEG = {"Content-Type": "image/jpeg"}
SAAO = {"X-SAAO-Token": "test-saao"}


def case(**kw) -> dict:
    base = {
        "case_id": str(uuid.uuid4()), "created_at": "2026-10-04T06:00:00+06:00", "kind": "leaf",
        "upazila": "SIR", "class": "brown_spot", "confidence": 0.8, "taps": {"stage": "tillering"},
        "output_code": "SURVIVES_CHECK", "card": "C1", "date_used": "2026-10-04", "simulated_date": False,
        "consent": True, "has_thumb": True, "has_photo": False, "has_voice": False,
    }
    return base | kw


def post(c: TestClient, cases: list[dict], device="dev-1"):
    return c.post("/api/cases/batch", json={"device_id": device, "cases": cases})


def test_health_headers_and_probe():
    with TestClient(app) as c:
        r = c.get("/api/health")
        assert r.headers["cache-control"] == "no-store" and r.headers["x-health"] == "1"
        p = c.get("/api/probe.bin")
        assert len(p.content) == 32768 and p.headers["cache-control"] == "no-store"


def test_batch_retry_is_idempotent():
    with TestClient(app) as c:
        k = case(upazila="IDEM")
        for _ in range(2):  # the second call is the retry after a lost response
            assert post(c, [k]).json() == {"accepted": [k["case_id"]], "rejected": []}
        assert len(c.get("/api/cases", params={"upazila": "IDEM"}, headers=SAAO).json()) == 1


def test_consent_rejected_and_batch_limit():
    with TestClient(app) as c:
        k = case(consent=False)
        assert post(c, [k]).json() == {"accepted": [], "rejected": [{"case_id": k["case_id"], "reason": "no_consent"}]}
        assert post(c, [case() for _ in range(21)]).status_code == 422


def test_blob_before_case_and_listing():
    with TestClient(app) as c:
        k = case(upazila="OOO")
        assert c.put(f"/api/cases/{k['case_id']}/thumb", content=b"abc", headers=JPEG).json()["bytes"] == 3
        assert c.put(f"/api/cases/{k['case_id']}/voice", content=b"v", headers={"Content-Type": "audio/webm"}).status_code == 200
        post(c, [k])
        row = c.get("/api/cases", params={"upazila": "OOO"}, headers=SAAO).json()[0]
        assert row["blobs"] == {"thumb": True, "photo": False, "voice": True} and row["class"] == "brown_spot"
        assert row["reply"] is None
        assert c.get(f"/api/cases/{k['case_id']}/thumb", headers=SAAO).content == b"abc"
        assert c.get(f"/api/cases/{k['case_id']}/photo", headers=SAAO).status_code == 404
        # repeat PUT replaces, same result
        r = c.put(f"/api/cases/{k['case_id']}/thumb", content=b"abc", headers=JPEG).json()
        assert r["sha256"] == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        c.post(f"/api/cases/{k['case_id']}/reply", json={"text": "I will visit Thursday", "by": "saao"}, headers=SAAO)
        assert c.get("/api/cases", params={"upazila": "OOO"}, headers=SAAO).json()[0]["reply"]["text"] == "I will visit Thursday"


def test_blob_size_limits():
    with TestClient(app) as c:
        cid = str(uuid.uuid4())
        assert c.put(f"/api/cases/{cid}/thumb", content=b"x" * (64 * 1024 + 1), headers=JPEG).status_code == 413
        assert c.put(f"/api/cases/{cid}/thumb", content=b"x" * (64 * 1024), headers=JPEG).status_code == 200
        assert c.put(f"/api/cases/{cid}/photo", content=b"x" * (1024 * 1024 + 1), headers=JPEG).status_code == 413
        big = {"Content-Type": "audio/ogg"}
        assert c.put(f"/api/cases/{cid}/voice", content=b"x" * (1024 * 1024 + 1), headers=big).status_code == 413
        assert c.put(f"/api/cases/{cid}/photo", content=b"x", headers={"Content-Type": "text/plain"}).status_code == 415


def test_reply_validation():
    with TestClient(app) as c:
        k = case()
        post(c, [k])
        url = f"/api/cases/{k['case_id']}/reply"
        assert c.post(url, json={"text": "", "by": "saao"}, headers=SAAO).status_code == 422
        assert c.post(url, json={"text": "x" * 501, "by": "saao"}, headers=SAAO).status_code == 422
        assert c.post(f"/api/cases/{uuid.uuid4()}/reply", json={"text": "hi", "by": "saao"}, headers=SAAO).status_code == 404


def test_manifest_and_part_304():
    with TestClient(app) as c:
        m = c.get("/api/pack/manifest", params={"upazila": "SIR"})
        assert set(m.json()["parts"]) == {"forecast", "flood", "advisories", "prices", "case_replies", "rules", "cards"}
        assert c.get("/api/pack/manifest", params={"upazila": "SIR"}, headers={"If-None-Match": m.headers["etag"]}).status_code == 304
        p = c.get("/api/pack/flood", params={"upazila": "SIR"})
        body = p.json()
        assert body["seeded"] is True and body["data"]["station"]
        assert c.get("/api/pack/flood", params={"upazila": "SIR"}, headers={"If-None-Match": p.headers["etag"]}).status_code == 304
        assert c.get("/api/pack/flood", params={"upazila": "NOPE"}).status_code == 404
        assert c.get("/api/pack/bogus", params={"upazila": "SIR"}).status_code == 404


def test_pack_case_replies_per_device():
    with TestClient(app) as c:
        a, b = case(), case()
        post(c, [a], device="devA")
        post(c, [b], device="devB")
        c.post(f"/api/cases/{a['case_id']}/reply", json={"text": "for A", "by": "saao"}, headers=SAAO)
        get = lambda d: c.get("/api/pack/case_replies", params={"upazila": "SIR", "device_id": d}).json()["data"]["replies"]
        assert [r["text"] for r in get("devA")] == ["for A"]
        assert get("devB") == []


def test_dashboard_needs_saao_code() -> None:
    with TestClient(app) as c:
        k = case(upazila="AUTH")
        post(c, [k])
        assert c.get("/api/cases", params={"upazila": "AUTH"}).status_code == 401
        assert c.get("/api/cases", params={"upazila": "AUTH"}, headers={"X-SAAO-Token": "wrong"}).status_code == 401
        assert c.get(f"/api/cases/{k['case_id']}/thumb").status_code == 401
        assert c.post(f"/api/cases/{k['case_id']}/reply", json={"text": "hi", "by": "saao"}).status_code == 401
        assert c.get("/api/cases", params={"upazila": "AUTH"}, headers=SAAO).status_code == 200


def test_cors_exposes_x_health_and_etag():
    # Cross-origin (Vercel -> Railway) the browser hides these unless exposed; the phone's probe and ETag cache need them.
    with TestClient(app) as c:
        r = c.get("/api/health", headers={"Origin": "http://localhost:3000"})
        exposed = r.headers["access-control-expose-headers"].lower()
        assert "x-health" in exposed and "etag" in exposed


def test_pack_works_for_real_upazila_codes_and_is_fresh():
    from datetime import datetime, timezone

    with TestClient(app) as c:
        code = "SRJ-SIRAJGANJ"  # the app sends codes like this (places.json), not the 4 mock folders
        assert c.get("/api/pack/manifest", params={"upazila": code}).status_code == 200
        p = c.get("/api/pack/flood", params={"upazila": code}).json()
        assert p["seeded"] is True
        age = datetime.now(timezone.utc) - datetime.fromisoformat(p["fetched_at"])
        assert age.total_seconds() < 24 * 3600  # engine ignores flood data older than 24 h
        assert c.get("/api/pack/flood", params={"upazila": "../etc"}).status_code == 404
