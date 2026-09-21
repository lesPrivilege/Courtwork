#!/bin/bash
# Evidence harness only. Starts a fresh Host from <app> on a port that is
# checked to be free (never 8787/8899), seeds the synthetic fixture, runs one
# capture part and stops the Host. Usage:
#   run.sh <app-dir> <tabs|location> <before|after> <out-dir> <scratch-dir> [port] [cdp-port]
set -euo pipefail
APP="$(cd "$1" && pwd)"; PART="$2"; VARIANT="$3"; OUT="$4"; SCRATCH="$5"; PORT="${6:-8963}"; CDP="${7:-9341}"
case "$PORT" in 8787|8899) echo "refusing the user's port $PORT"; exit 2;; esac
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $PORT is in use"; exit 2; fi
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="$SCRATCH/$VARIANT-$PART-data"; FOLDERS="$SCRATCH/$VARIANT-$PART-folders"; LOG="$SCRATCH/$VARIANT-$PART-host.log"
rm -rf "$DATA" "$FOLDERS" "$LOG"; mkdir -p "$FOLDERS" "$OUT" "$SCRATCH/chrome"
cd "$HERE"
node start.mjs --app "$APP" --data "$DATA" --folder-root "$FOLDERS" --port "$PORT" > "$LOG" 2>&1 &
HOST=$!
for i in $(seq 1 120); do grep -q '"url"' "$LOG" 2>/dev/null && break; sleep 0.5; done
grep -q '"url"' "$LOG" || { cat "$LOG"; kill $HOST; exit 1; }
FOLDER="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8').trim().split('\n').pop()).folder)" "$LOG")"
STATUS=0
node capture.mjs --url "http://127.0.0.1:$PORT" --part "$PART" --variant "$VARIANT" --out "$OUT" --folder "$FOLDER" --profile "$SCRATCH/chrome" --port "$CDP" || STATUS=$?
kill $HOST || true
exit $STATUS
