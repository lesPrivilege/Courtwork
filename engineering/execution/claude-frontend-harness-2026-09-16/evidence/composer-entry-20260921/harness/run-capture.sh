#!/bin/bash
# Evidence harness only. Starts a fresh Host from <app> on 8951/8952 and runs
# the capture journey into <out>. Usage: run-capture.sh <app> <variant> <out> <scratch>
set -euo pipefail
APP="$1"; VARIANT="$2"; OUT="$3"; SCRATCH="$4"
HERE="$(cd "$(dirname "$0")" && pwd)"
FOLDER="$SCRATCH/src/synthetic-parcel-repository-with-a-deliberately-long-folder-name"
DATA="$SCRATCH/$VARIANT-data"; LOG="$SCRATCH/$VARIANT-host.log"
pkill -f "start.mjs --app $APP " || true
sleep 1
rm -rf "$DATA" "$LOG"; mkdir -p "$OUT"; find "$OUT" -maxdepth 1 -type f -delete
cd "$HERE"
node start.mjs --app "$APP" --data "$DATA" --port 8951 --provider-port 8952 > "$LOG" 2>&1 &
HOST=$!
for i in $(seq 1 60); do grep -q http "$LOG" 2>/dev/null && break; sleep 0.5; done
grep -q http "$LOG" || { cat "$LOG"; kill $HOST; exit 1; }
STATUS=0
node capture.mjs --url http://127.0.0.1:8951 --variant "$VARIANT" --out "$OUT" --folder "$FOLDER" --profile "$SCRATCH" || STATUS=$?
kill $HOST || true
ls "$OUT" | wc -l
exit $STATUS
