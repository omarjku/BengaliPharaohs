.PHONY: setup dev backend frontend smoke e2e tag

setup:
	@cd backend && if command -v uv >/dev/null; then \
		uv venv -q --python 3.12 .venv && uv pip install -q -p .venv -r requirements.txt; \
	else \
		python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else "Need Python 3.10+: install uv (brew install uv) or python@3.12")' && \
		python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt; \
	fi
	cd backend && [ -f .env ] || cp .env.example .env
	cd frontend && npm install
	cd frontend && [ -f .env.local ] || cp .env.example .env.local

backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend

# Demo-path tests (mock LLM), live end-to-end check, frontend type-check + build. Must be green before every commit.
smoke:
	cd backend && .venv/bin/python -m pytest -q && rm -f test.db
	./scripts/e2e.sh
	cd frontend && npx tsc --noEmit && npm run build

e2e:
	./scripts/e2e.sh

tag:
	@test -z "$$(git status --porcelain)" || (echo "Commit first: uncommitted or untracked files" && exit 1)
	@git tag -f demo-ok >/dev/null && echo "Tagged demo-ok at $$(git rev-parse --short HEAD). Recover with: git switch -c recover demo-ok"
