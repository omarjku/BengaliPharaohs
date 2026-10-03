"""The demo path, end to end, with the mock LLM. Must stay green; run `make smoke`."""
import os

os.environ["MOCK_LLM"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_demo_path():
    with TestClient(app) as c:
        assert c.get("/api/health").json()["ok"] is True

        with c.stream("POST", "/api/run", json={"input": "hello judges"}) as r:
            assert r.status_code == 200
            body = "".join(r.iter_text())
        assert "event: token" in body
        assert "event: done" in body
        assert "event: error" not in body

        runs = c.get("/api/runs").json()
        assert runs and runs[0]["input"] == "hello judges"


def test_rejects_empty_input():
    with TestClient(app) as c:
        assert c.post("/api/run", json={"input": ""}).status_code == 422
