# Backend (owner: Omar)
- Routes in `app/main.py`, tables and request models in `app/models.py`, DB setup in `app/db.py`, LLM providers in `app/llm.py`.
- New endpoint: write it in `../contract/api.md` first, add a test to `tests/test_smoke.py`, then implement.
- Every external API gets a mock path (env flag or recorded JSON in `mocks/`), so tests and the demo never need the network.
- Async routes: no blocking calls; set timeouts on every outbound request.
- Run tests: `.venv/bin/python -m pytest -q` (or `make smoke` from the root).
