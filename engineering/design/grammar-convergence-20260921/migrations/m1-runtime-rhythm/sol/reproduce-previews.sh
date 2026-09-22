#!/bin/sh
set -eu

ROOT=${1:-$(git rev-parse --show-toplevel)}
BASE_SHA=aa765ede3d008c80cc9e4e6dcd50704cfa95db61
SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/cw-m1-runtime-rhythm.XXXXXX")
BASELINE=$SCRATCH/baseline
mkdir -p "$BASELINE"
git -C "$ROOT" cat-file -e "$BASE_SHA^{commit}"
git -C "$ROOT" archive "$BASE_SHA" | tar -x -C "$BASELINE"

SOL=$ROOT/engineering/design/grammar-convergence-20260921/migrations/m1-runtime-rhythm/sol
printf '%s\n' \
  "Baseline normal/large query preview:" \
  "  node $SOL/serve-preview.mjs --app $BASELINE/app --port 0" \
  "Candidate normal/large query preview:" \
  "  node $SOL/serve-preview.mjs --app $ROOT/app --port 0" \
  "Use ?text=normal&theme=light or ?text=large&theme=dark on the printed URLs." \
  "Disposable baseline retained at: $BASELINE"
