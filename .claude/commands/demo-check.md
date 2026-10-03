---
description: Run the demo path end to end and report anything that would fail on stage
---
1. Run `make smoke` and report pass/fail with the failing assertion.
2. Read `DEMO.md`. For each step, confirm the code path exists and name the file that serves it.
3. Check: `.env` keys present for the provider in use, mock fallback works with `MOCK_LLM=1`, backend URL in `frontend/.env.local` matches the running backend, no `console.error` or Python traceback during the run.
4. Output a table: step · status (ok / risk / broken) · fix. End with "Stage-ready: yes/no". If yes and the tree is clean, suggest `make tag`.
