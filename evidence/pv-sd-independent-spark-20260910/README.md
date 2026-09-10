# SD-01 independent verification

2026-09-10 · independent verifier (Luna) · fixed delivery tree
`6b6257937e2dff0bcf46f9a31f40184ee95c57b3`, checked against baseline
`9c8b64e`.  This directory is evidence only; no product files in the shared
checkout were changed.

The verifier used a clean detached worktree at
`/private/tmp/cw-sd-independent-20260910`, a fresh synthetic data directory,
loopback HTTP, and a separate Chrome/CDP port.  It did not read credentials or
invoke a paid provider.  `checks.mjs` is a new browser scenario driver with
independent project IDs, assertions, and delayed-response race.  It reuses the
repository's dependency-free CDP transport helper
`evidence/sd-01/browser.mjs`; the helper launches real headless Chrome.  This
is browser/CDP evidence, not an actual Computer Use run.  The
page fetch shim is limited to the unimplemented `/api/v5/work-derivations`
route, so the bootstrap, project creation, page, and all five static JSON
requests remain real server traffic.

## Run

```sh
data_dir=$(mktemp -d /private/tmp/sd-independent-data.XXXXXX)
node app/server/index.mjs --port 8947 --data-dir "$data_dir" \
  > /private/tmp/sd-independent-server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for i in $(seq 1 120); do
  curl -fsS http://127.0.0.1:8947/api/v5/bootstrap >/dev/null && break
  sleep 0.1
done
APP_URL=http://127.0.0.1:8947 SD01_CDP_PORT=19947 \
  node evidence/pv-sd-independent-spark-20260910/checks.mjs
```

The captured result is `checks.json`.  The run covers the real 404 entry,
sample entry and five scenario files, inert sample rows, valid non-empty live
and valid empty live replacement, 404 preservation, non-404 failure, project
switch, stale delayed response rejection after a project-generation change,
slow sample JSON across project switch and close/reopen, hide during a slow
sample body, hide during a live probe, and static-route
byte/content-type/unknown/traversal/POST checks.

## Result

`checks.json` records the exact origin, generated project IDs, each check's
observed detail, and the aggregate pass bit.  On the original tree, SDI-11
(scenario selection during a delayed live probe), SDI-12 (close/reopen during
a delayed sample body), and SDI-13 (hide during a delayed sample body) are
expected red counterexamples; SDI-14 confirms hide does not cancel the live
probe.  The independent rerun against `dc3068b30a16fe06f10a62c812c1e44e994cbe2f`
records all 15 checks passing at
`evidence/pv-sd-integration-20260910/fixed-independent-checks.json` in that
worktree.  The run is verification evidence, not a replacement for the
author's delivery page or for later BE-41/provider integration.  Real provider
execution remains `not_run`; live payload behavior is deliberately a
synthetic transport fixture because the original tree's `/work-derivations`
endpoint is genuinely 404.

Explicit evidence paths:

- driver: `evidence/pv-sd-independent-spark-20260910/checks.mjs`
- original result: `evidence/pv-sd-independent-spark-20260910/checks.json`
- this README: `evidence/pv-sd-independent-spark-20260910/README.md`
- fixed result (root's integration worktree): `evidence/pv-sd-integration-20260910/fixed-dc3068b-checks.json`
- fixed-result README (root's integration worktree): `evidence/pv-sd-integration-20260910/fixed-independent-README.md`
