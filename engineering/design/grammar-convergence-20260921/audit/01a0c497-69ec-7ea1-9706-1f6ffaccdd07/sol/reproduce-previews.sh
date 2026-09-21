#!/bin/sh
set -eu

# Disposable, synthetic-only preview reproduction. Run each final node command
# in its own terminal. The servers print their loopback URL; port 0 chooses an
# unused port. These commands never touch 8787/8899 or user data.
ROOT=${1:-$(git rev-parse --show-toplevel)}
NODE_MODULES=${2:-$ROOT/app/node_modules}
MAIN_SHA=ef73d276bf892a73a818ca5abf94f10c1a106c1d
CANDIDATE_SHA=9860c6ce4c6084dc2385f41ad500d40c06fa050f
WORK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/cw-sol-grammar-repro.XXXXXX")
MAIN_TMP=$WORK_ROOT/main
MAIN_DATA=$WORK_ROOT/main-data
CANDIDATE_TMP=$WORK_ROOT/06d
CANDIDATE_DATA=$WORK_ROOT/06d-data

test -d "$NODE_MODULES" || { printf '%s\n' "Missing dependency directory: $NODE_MODULES" >&2; exit 1; }
git -C "$ROOT" cat-file -e "$MAIN_SHA^{commit}"
git -C "$ROOT" cat-file -e "$CANDIDATE_SHA^{commit}"
mkdir -p "$MAIN_TMP" "$MAIN_DATA" "$CANDIDATE_TMP" "$CANDIDATE_DATA"
git -C "$ROOT" archive "$MAIN_SHA" | tar -x -C "$MAIN_TMP"
ln -s "$NODE_MODULES" "$MAIN_TMP/app/node_modules"
git -C "$ROOT" archive "$CANDIDATE_SHA" | tar -x -C "$CANDIDATE_TMP"
ln -s "$NODE_MODULES" "$CANDIDATE_TMP/app/node_modules"

printf '%s\n' \
  "Main Settings: cd $MAIN_TMP && CW_SPECIMEN_PORT=0 node app/scripts/runtime-management-preview.mjs" \
  "Main Chat: cd $MAIN_TMP && CW_SPECIMEN_PORT=0 node app/scripts/chat-continuity-preview.mjs" \
  "Main full Host: cd $MAIN_TMP/app && node server/index.mjs --data-dir $MAIN_DATA --port 0" \
  "Pinned 06d: cd $CANDIDATE_TMP/app && node server/index.mjs --data-dir $CANDIDATE_DATA --port 0" \
  "Disposable reproduction root (preserved until you remove it): $WORK_ROOT"
