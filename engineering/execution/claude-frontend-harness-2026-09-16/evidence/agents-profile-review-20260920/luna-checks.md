# Claude Agent profiles frontend candidate: independent checks

Date: 2026-09-20. Review tree: `/Users/lesprivilege/Projects/.worktrees/courtwork-agents-review-20260920`, detached at candidate `0f76407ac3f0fc7aa34585a003921e855c80820`. The source author tree `/Users/lesprivilege/Projects/.worktrees/courtwork-agents-frontend-20260920` was left untouched. A temporary `app/node_modules` symlink to the existing main dependency tree was used for the run and removed afterward; the review tree is clean.

Scope is limited to one full-suite rerun, unfiltered log capture, and preview/static routing isolation. No source edits, credentials, personal configuration, browser, real model, paid provider, merge, or deployment were used.

## Full suite

Command executed exactly once in the review tree:

```text
npm --prefix app test > /tmp/cw-agents-full-review-20260920.log 2>&1
```

The complete npm/node output is preserved at `/tmp/cw-agents-full-review-20260920.log` (1,288 lines; no `tail`, grep, or summary filter was applied during capture). The test runner’s terminal summary is:

```text
ℹ tests 1254
ℹ suites 0
ℹ pass 1254
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 241717.924625
```

No failed test names were reported. The outer shell wrapper used during capture attempted to assign `$?` to zsh’s read-only special parameter `status` after npm finished, so the wrapper’s observed exit was `1` with `read-only variable: status`; this is a wrapper error, not a test failure. The node test process completed with the all-green summary above. The author’s recorded run-2 intermittent failure did not reproduce in this one run.

The full suite includes the six `static-web-manifest.test.mjs` assertions and the 16 agent-profile specimen tests; all are included in the 1,254 passing tests.

## Preview host and routing isolation

The implementation in `app/scripts/agent-profiles-preview.mjs:6-30` mounts only `/web/` to product web assets and `/` to `app/tests/fixtures/agent-profiles`, permits `GET`/`HEAD`, rejects `/api/`, resolves real paths before the containment check, and returns 404 for traversal/missing targets. It does not import Runtime, store, data directory, or API router (`:10-13`).

An independent loopback probe started the preview on an ephemeral port and used only synthetic GET/HEAD/POST requests. Results:

| Request | Result |
|---|---:|
| `GET /` | 200; synthetic preview header present; no RuntimeService/API marker |
| `GET /web/agent-profiles.mjs` | 200 |
| `GET /web/no-such.mjs` | 404 |
| `GET /api/v5/bootstrap` | 404 |
| `GET /tests/fixtures/agent-profiles/index.html` | 404 |
| `GET /../tests/fixtures/agent-profiles/index.html` | 404 |
| `GET /web/../scripts/agent-profiles-preview.mjs` | 404 |
| `POST /` | 405 |

The synthetic fixture header is expected only at `/`; no product web/server source references `tests/fixtures/agent-profiles`, `fixtures/agent-profiles`, or `agent-profiles-preview`. The production static map in `app/server/index.mjs:14-31` lists the two agent-profile web modules as exact `/web/...` assets and does not mount the fixture directory. The static allowlist test’s full-suite pass therefore supports route-to-disk and disk-to-route consistency without exposing the fixture through the product server.

## Boundaries and remaining scope

The preview is a candidate-only, synthetic adapter surface as stated in `06a-agents-profile-journey-20260920.md`; it does not register an Agents group in live Settings, manage Runtime connections, touch credentials, or establish backend support. The source record’s known browser limits remain: no browser was run here, no real provider/harness task was run, and this check does not accept the UI semantics or promote the candidate. Parent/controller review owns those decisions.
