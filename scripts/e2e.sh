#!/usr/bin/env bash
# Starts the real server on a spare port with the mock LLM, streams one run, checks the events.
set -euo pipefail
cd "$(dirname "$0")/../backend"
PORT=8765
DB=e2e.db
rm -f "$DB"
MOCK_LLM=1 DATABASE_URL="sqlite:///./$DB" .venv/bin/uvicorn app.main:app --port "$PORT" --log-level warning &
PID=$!
trap 'kill $PID 2>/dev/null || true; rm -f "$DB"' EXIT

for _ in $(seq 1 40); do
  curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null && break
  sleep 0.25
done

now_ms() { python3 -c "import time; print(int(time.time()*1000))"; }
START=$(now_ms)
OUT=$(curl -sfN -X POST "http://127.0.0.1:$PORT/api/run" -H 'Content-Type: application/json' -d '{"input":"e2e check"}')
MS=$(( $(now_ms) - START ))

grep -q "event: token" <<<"$OUT" || { echo "e2e FAIL: no tokens streamed"; exit 1; }
grep -q "event: done" <<<"$OUT" || { echo "e2e FAIL: stream never finished"; echo "$OUT" | tail -5; exit 1; }
curl -sf "http://127.0.0.1:$PORT/api/runs" | grep -q "e2e check" || { echo "e2e FAIL: run not saved"; exit 1; }
echo "e2e OK: streamed and saved in ${MS} ms (mock LLM)"
