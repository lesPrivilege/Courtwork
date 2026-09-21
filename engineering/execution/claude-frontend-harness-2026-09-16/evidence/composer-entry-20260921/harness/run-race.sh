#!/bin/bash
# Evidence harness only. Fresh Host from <app> on 8951 (scripted provider 8952),
# the gate proxy on 8953 in front of it, then race.mjs into <out>.
# Usage: run-race.sh <app> <label> <out> <scratch> [race|recovery]
set -euo pipefail
APP="$1"; LABEL="$2"; OUT="$3"; SCRATCH="$4"; MODE="${5:-race}"
HERE="$(cd "$(dirname "$0")" && pwd)"
FOLDER="$SCRATCH/src/synthetic-parcel-repository-with-a-deliberately-long-folder-name"
DATA="$SCRATCH/race-$LABEL-data"; LOG="$SCRATCH/race-$LABEL-host.log"
rm -rf "$DATA" "$LOG"; mkdir -p "$OUT"; rm -f "$OUT/$MODE.json" "$OUT/$MODE-gate.jsonl"
cd "$HERE"
node start.mjs --app "$APP" --data "$DATA" --port 8951 --provider-port 8952 > "$LOG" 2>&1 &
HOST=$!
node gate-proxy.mjs --listen 8953 --target 8951 --log "$OUT/$MODE-gate.jsonl" > "$SCRATCH/race-$LABEL-proxy.log" 2>&1 &
PROXY=$!
for i in $(seq 1 60); do grep -q http "$LOG" 2>/dev/null && break; sleep 0.5; done
grep -q http "$LOG" || { cat "$LOG"; kill $HOST $PROXY; exit 1; }
STATUS=0
node race.mjs --url http://127.0.0.1:8953 --gate http://127.0.0.1:8953 --out "$OUT" --folder "$FOLDER" --profile "$SCRATCH" --mode "$MODE" || STATUS=$?
kill $HOST $PROXY || true
exit $STATUS
