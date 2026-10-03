#!/usr/bin/env bash
# Records the room in chunks (default 2 h) and transcribes each finished chunk in the background.
# Audio: notes/audio/<start>.ogg (gitignored) · text: notes/transcripts/<start>.md (commit these).
# Ctrl+C stops cleanly: the current chunk is saved and transcribed before exiting.
# Env: CHUNK_SECONDS (default 7200), MIC (macOS device, default ":0", list with `make mics`),
#      WHISPER_MODEL (default small), WHISPER_LANGUAGE (e.g. en; default auto-detect).
set -uo pipefail
cd "$(dirname "$0")/.."

CHUNK_SECONDS="${CHUNK_SECONDS:-7200}"
PY=.venv-rec/bin/python
[ -x "$PY" ] || { echo "Run 'make record-setup' first."; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg missing: brew install ffmpeg"; exit 1; }
mkdir -p notes/audio notes/transcripts

if [ "$(uname)" = "Darwin" ]; then
  INPUT=(-f avfoundation -i "${MIC:-:0}")
  caffeinate -ims -w $$ &  # keep the Mac awake while recording (lid must stay open)
  CAFFEINATE_PID=$!
else
  INPUT=(-f pulse -i default)
fi
JOBS=()

STOP=0
trap 'STOP=1' INT TERM

echo "Recording in $((CHUNK_SECONDS / 60))-minute chunks. Ctrl+C to stop."
while [ "$STOP" -eq 0 ]; do
  STAMP=$(date +%Y-%m-%d-%H%M%S)
  OUT="notes/audio/$STAMP.ogg"
  echo "[$(date +%H:%M)] recording $OUT"
  # 16 kHz mono Opus is what Whisper needs and keeps 2 h at ~20 MB.
  ffmpeg -hide_banner -loglevel error -nostdin "${INPUT[@]}" -t "$CHUNK_SECONDS" \
    -ac 1 -ar 16000 -c:a libopus -b:a 24k "$OUT"
  if [ ! -s "$OUT" ]; then
    echo "No audio written. On macOS allow microphone access for your terminal app (System Settings > Privacy & Security > Microphone), or pick another MIC (make mics)."
    exit 1
  fi
  if [ "$STOP" -eq 0 ]; then
    "$PY" scripts/transcribe.py "$OUT" >>notes/audio/transcribe.log 2>&1 &
    JOBS+=($!)
  fi
done

echo "Stopped. Transcribing the last chunk and waiting for any running transcriptions..."
[ -n "${CAFFEINATE_PID:-}" ] && kill "$CAFFEINATE_PID" 2>/dev/null
"$PY" scripts/transcribe.py "$OUT"
[ ${#JOBS[@]} -gt 0 ] && wait "${JOBS[@]}"
echo "Done. New transcripts are in notes/transcripts/. Commit and push them, then tell Claude."
