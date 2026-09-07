# Fresh Work Agent — runtime and Web application

The Runtime Control Plane backend and new-frontend handoff are documented in
[the runtime index](../docs/runtime-control/INDEX.md). New control endpoints extend
the existing API without editing `web/*`.

This tree pairs the unchanged V7 frontend (`web/*`, byte-identical to the G2
r2 archive) with a rebuilt backend execution core. The execution owner is
still the single `/api/v5` service (`server/service.mjs`); what changed is
what it runs on: `runtime/pi-session-runtime.mjs` drives Pi coding-agent v3's
in-process `AgentSession` SDK (`@earendil-works/pi-coding-agent@0.85.1`)
instead of the old bare `Agent` (`@earendil-works/pi-agent-core@0.83.0`). The
old `runtime/pi-runtime.mjs` is deleted, not kept as a fallback.

The HTTP contract a client codes against — endpoints, fields, event types,
error codes, and the "current file vs content version" distinction — is
`docs/api-v6.md`.

The current runtime foundation, independent entry point, model/capability API and
shutdown behavior are documented in [runtime-foundation.md](docs/runtime-foundation.md).
Run `npm run smoke` for the local material → tool → result → restart → revision path.

## What is real vs. fake

- **`fake-openai-loopback`** — a loopback HTTP server (`runtime/fake-provider.mjs`)
  that never leaves the process, used by every test and by default. Ordinary
  replies say `SIMULATED`. Its credential is a well-known constant
  (`fake-local-loopback-key`), but it is resolved through the *same*
  `ModelRuntime`/`setRuntimeApiKey`/credential-store lane as a real provider —
  the fake route is a deterministic stand-in for the execution path, not a
  separate code path.
- **`deepseek` and `openai`** — installed catalog models, with native Chat
  Completions or Responses dispatch. DeepSeek's non-default Responses format
  requires an explicit compatible endpoint. See the current
  [provider and cache contract](docs/runtime-foundation.md#api-selection-and-cache-continuity).
- The server never reads `~/.pi/agent/auth.json`, never reads an API key from
  its own process environment for its own use, and if it inherits
  `DEEPSEEK_API_KEY` from its parent process, it deletes that environment
  variable at startup (logged, value never logged) so pi-ai's own per-provider
  env-var fallback cannot silently activate.

## Configuring a key

```sh
curl -X PUT http://127.0.0.1:<port>/api/v5/provider-credential \
  -H "content-type: application/json" -H "x-work-token: <token>" \
  -d '{"provider":"deepseek","apiKey":"sk-..."}'
```

The key is written only to `<dataDir>/credentials.json` (mode 0600),
independent of `runtime-state.json`, and is never echoed back by any endpoint,
event, or log line. `DELETE` the same path with `{"provider":"deepseek"}` to
clear it. Both endpoints (and `PUT /provider-config`) return `409 active_run`
while a Run is active — credentials and provider descriptor are frozen for
the duration of a Run, same as before.

## Run

Node.js >=22.19.0 and Git >=2.36 on PATH. Git is required for artifact writes;
unavailable Git fails the write before workspace publication. Restore the source archive, then from its `app` directory:

```sh
npm ci --ignore-scripts
SE_RUNTIME_DATA_DIR=/absolute/path/to/new-data-dir PORT=8804 node server/index.mjs
```

Use a fresh, independent data directory per instance — the host holds a POSIX
flock on it (`server/runtime-lock.py`, needs `python3` on `PATH`, or set
`WORK_AGENT_PYTHON`); do not run two hosts against the same data directory.
`python3` is a hard requirement, not a nicety: the lock has to live in a
separate process so an owner SIGKILL releases it. If it is missing, the server
refuses to start with `LOCK_NO_PYTHON` naming the reason — it never degrades to
running without a lock.
Stop with a normal signal (SIGINT/SIGTERM to the process, or call the
programmatic `close()`); do not leave a server listening past the end of a
task.

## Data directory layout

```
<dataDir>/
  runtime-state.json        # schemaVersion 4 store (see below)
  runtime-state.schema3.<sha256>.json # exact pre-upgrade backup when migrating
  runtime-control.json      # declarative resource/policy config schema 1, 0600
  runtime-state.json.*.tmp  # only ever transient; a leftover means a crash mid-write, and is swept and logged at startup
  credentials.json          # {provider: apiKey}, 0600, never in the store
  workspaces/<sessionId>/
    materials/               # POST .../materials writes here
    out/                      # where the model is expected to write results
  artifact-history/<sha256(sessionId)>/objects.git/ # private reachable content blobs
  pi-agent/                  # AgentSession agentDir; nothing under ~/.pi is read or written
  pi-sessions/<sessionId>/   # one Pi JSONL session file per app session (the only conversation journal)
```

## Store schema (v4, validated v3 upgrade)

`schemaVersion` is `4`. A valid v3 store upgrades with an exact SHA-256-named
backup before atomic replacement. Older hosts reject v4 instead of ignoring the
control policy layer. v1/v2, malformed and future stores remain rejected with
`INVALID_STATE` without overwriting the input. See the [upgrade boundary](../docs/runtime-control/architecture.md#persistence-upgrade).
 Sessions no longer keep a private
`_history` array: the reopened Pi JSONL session (via `SessionManager.open`)
is the only conversation journal, restored automatically into `AgentSession`
on the next Run for that app session. New session fields: `workspaceDir`,
`permissionMode` (`read_only` | `draft` | `ask`), `hostSession` (`{id,path}`
or `null` until the first Run). New run fields: `commandId`, `artifacts[]`,
`usage` (`{input,output,cacheRead,cacheWrite,turns,missing}`), `hostSession`,
`credentialGeneration`. Top-level `credentialGeneration` (added in v3) is the
persisted counter those run records freeze: it survives a restart, so a
post-restart credential change can never reuse a generation a pre-restart run
already recorded.

State is written to a temp file and renamed into place, so `runtime-state.json`
is always a complete version. A process killed between those two steps leaves a
`.tmp` behind; the next start deletes it and logs that it did, because the tmp
was never a source of truth.

## Artifacts: current file vs content version

`run.artifacts[]` and the `artifact.written` event record a **content version**
— `{path, bytes, sha256, kind: "content-version", writtenAt}`, the bytes as
written at one instant. `GET /sessions/:id/workspace/file` returns the
**current file** — `kind: "current"` plus the file's present `sha256`. Writing
the same path twice produces two content versions and one current file. A
Review or accept step may only quote a content version; a path on its own is
not a reference to content.

## Usage accounting

`run.usage` counters are accumulated in the host handle and read once on the
way out, so cancel and provider-failure paths keep whatever the provider
already reported. `missing: true` means the accounting is *incomplete*, never
that the numbers were reset — read it as "at least this much".

## Tools available to the model

Only `ask_user` and four workspace tools scoped to `workspaceDir`: `ws_list`,
`ws_read` (line-range, rejects binary/over-limit files), `ws_write` (whole-file
overwrite, atomic temp-then-rename, absent in `read_only` mode, gated behind a
persisted user decision in `ask` mode), `ws_grep`. There is no bash tool, no
network tool, and no path outside the workspace — those capabilities do not
exist in this build, they are not merely unconfigured. All default coding
tools (`read`/`bash`/edit`/`write`) are disabled via `noTools: "builtin"`;
resource/extension/skill/prompt-template discovery is disabled via a custom
empty `ResourceLoader`, so `createAgentSession` never constructs
`DefaultResourceLoader` and never reads `~/.pi/agent`.

## Idempotent Run creation

`POST /api/v5/sessions/:id/runs` requires a client-supplied `commandId`. The
same `commandId` with the same `input` returns the original Run (200, same
id); the same `commandId` with a different `input` is `409 command_conflict`.
The uniqueness check runs inside the store's serialized mutation queue, so
this also holds for two concurrent requests racing on the same `commandId`.

## Cancel, failure, and restart

- **Cancel**: `stopping` → `AgentSession.abort()` → settle → `cancelled` (or
  `unknown` if this process never owned the Run). The tool wrapper layer
  receives the same abort signal; `ws_write` writes to a temp file and only
  renames it into place after a successful, non-aborted write, so a
  cancelled write never leaves a half-written file.
- **Failure**: provider/transport errors end the Run `failed` with
  `run.error.code` one of `credential_missing`, `provider_auth_failed`, or
  `provider_error` (the raw provider error text is never key-bearing, and any
  known secret is defensively redacted before it is stored or logged).
- **Questions outliving their Run**: whatever ends a Run, a still-pending
  question or permission is closed with status `cancelled` and a recorded
  `question.resolved`/`permission.resolved` event. An answer that arrives
  afterwards is `409`, never a silently dropped request — and never a write.
- **Restart**: any in-flight Run becomes `unknown`
  (`error.code: "restart_unknown"`), and **every** pending question or
  permission (not just those on affected Runs) is marked `expired_restart` —
  nothing is left permanently unanswerable. The host JSONL session survives;
  the next Run for that app session reopens it with `SessionManager.open`
  and continues the same conversation. Re-sending the same `commandId` after a
  restart returns that original `unknown` Run; it does not re-execute anything.
- **Reconciliation after a restart**: a crash can land between `ws_write`'s
  rename and its artifact record, leaving bytes on disk that the store never
  witnessed. At startup each interrupted session's workspace is compared once
  against the recorded content versions, and anything unaccounted for is
  reported as a `run.notice {kind: "unrecorded_files", files:[{path,sha256}]}`.
  The file is neither back-filled as an artifact nor rewritten: an artifact
  record asserts that the service saw the write happen, and manufacturing one
  after the fact would forge the very evidence a Review relies on.

## Reconnecting a client

`GET /sessions/:id` returns `lastSeq` alongside the snapshot; resume with
`GET /sessions/:id/events?afterSeq=<lastSeq>`. Reads are pure — the same cursor
always returns the same page. A cursor *past* the server's high-water mark is
`400 cursor_ahead` with the current `nextSeq` in the error body, because such a
client can never catch up by waiting and must re-snapshot instead.

## Execution budget

`deadlineMs` (default 600000) is an *execution* budget: it only counts while
a Run is `running`, and is paused for the entire time a Run spends
`waiting_user` (a question or permission open). `maxTurns` (default 40) is
unchanged in spirit — the AgentSession is aborted once exceeded. Both are
overridable via `startServer({ budget })`.

## Checks

From `app`:

```sh
node --test tests/*.test.mjs ../tests/*.test.mjs
```

This runs the full backend/store/runtime suite (credentials, workspace path
guard, permission wait, idempotency, cancel, restart, usage, budget,
durability under SIGKILL, event-cursor reconnection, startup requirements) plus
the unchanged extension/runtime-lock/renderer regressions and the source-string
`ui-event-mapping.test.mjs` check (not itself behavior acceptance). The real
DeepSeek path is exercised only by `evidence/c1/real-provider-e2e.mjs`, which
prints `not_run` and exits 0 when `SE_C1_KEY_FILE` is not set — it is never
run as part of this fixture suite and never obtains a key on its own.

## Test-only crash points

`runtime/test-hooks.mjs` can SIGKILL the process at named points
(`before_tool`, `after_history`, `after_write`, `after_record`, `store_write`) so the durability
tests can observe what actually survives on disk. Two rules govern it:

- `SE_TEST_CRASH_POINT` **alone does nothing**. The hook only arms when
  `SE_TEST_MODE=1` is also set.
- Whenever either variable is present, startup logs one line saying whether the
  point is armed or inert. A build that can kill itself on purpose says so.

Neither variable is set in normal operation, and with them unset the hook
compiles to a name comparison that never matches.

## What did not change

`web/*` and `extensions/*` are untouched (verified byte-identical to the G2
r2 archive baseline in `evidence/c1/boundary-check.json`). The frontend still
talks to `/api/v5` exactly as before; no new event *type strings* were
removed and no existing field was renamed. New event types
(`permission.open`, `permission.resolved`, `artifact.written`, `run.usage`,
`run.notice`) are additions the current frontend simply does not render yet.

## MX-R1 runtime increment

Historical text bytes are now retrieved by `GET /api/v5/sessions/:id/artifacts/file`
with the exact recorded `runId`, `path` and raw content `sha256`. Git blobs are
pinned per session before workspace publication. Old records without a stored
object return 410; current files are never substituted. References have no
automatic deletion policy, so storage grows with distinct saved contents.

Real providers enable Pi native automatic compaction by default. Server-only
`compaction` options are `enabled`, `reserveTokens`, `keepRecentTokens`, and
`maxCompactions` (default 4 per Run). At the cap, the current compaction finishes
and future automatic compactions are disabled for that Run. This cap does not
terminate ordinary turns; existing turn and execution deadline budgets still
apply. Cancel is sticky at the model request boundary, including cancellation
during pre-prompt summarization. Summary usage is counted once; missing failed
or retried summary usage is explicitly incomplete. See [MX-R1 API](docs/api-runtime-mx-r1.md).

This is a generic runtime increment. Orchestration remains an independent caller
of public Run commands, receipts and queries; no scheduler or planner is added.
