# Minimal interface contract for the C1/C2 execution skeleton (`/api/v5`)

Batch C2, 2026-09-07 (supersedes the C1 r1 revision). Written for the front-end
batch (C3): it is the contract for key entry, materials, permission cards,
artifact display, and reconnecting to an event stream. Neither C1 nor C2 changed
any file under `app/web/`; everything below is reachable over HTTP today.

The URL prefix is still `/api/v5` — the path did not move. "v6" names this
document's revision of the contract, not a new route namespace.

## Transport

- Base URL: `http://127.0.0.1:<port>`, loopback only; requests from another
  origin are refused (`403 origin_denied`).
- Every request except `GET /api/v5/bootstrap` must carry the work token in the
  `x-work-token` header. `GET /api/v5/bootstrap` returns it (`sessionToken`).
- Request bodies are JSON, at most 1 MiB (`413 body_too_large` above that).
- Unknown body fields are rejected (`400 unknown_field`); this is deliberate, so a
  client typo fails loudly instead of being ignored.
- Errors are `{ "error": { "code", "message" } }`. Messages never contain an API key.
  A few errors add recovery data alongside those two fields — currently
  `cursor_ahead`, which carries `nextSeq`.

## Run and question vocabularies

- `run.status`: `running` · `waiting_user` · `stopping` (active) →
  `completed` · `cancelled` · `failed` · `unknown` (terminal).
  `unknown` means the host cannot honestly claim either outcome (process restart,
  a run not owned by this process, an extension that failed to close).
- `run.admissionOpen` (boolean): whether the run still accepts events and answers.
- `question.status`: `pending` · `resolved` · `expired_restart` · `cancelled`.
  `expired_restart` is set for every pending question at startup: a restart cannot
  resume a wait, and no question is left permanently unanswerable. `cancelled` is
  set when the run a question belongs to reaches a terminal state with the question
  still open. In both cases a late answer is refused (`409`), and the closure is a
  recorded event rather than a silently ignored request.
- `question.kind`: `ask_user` (free-text information) · `permission` (authorise one
  write). A natural-language answer never authorises a write: the permission route
  accepts only `allow` or `deny`.

## Sessions

`POST /api/v5/sessions` — `{ projectId, title?, permissionMode? }`
`permissionMode` is one of:

| mode | effect |
|---|---|
| `read_only` | `ws_write` is not injected at all; the tool does not exist for the model |
| `draft` (default) | writes inside the workspace proceed without asking |
| `ask` | every `ws_write` opens a `permission` question first |

`PUT /api/v5/sessions/:id/permission-mode` — `{ permissionMode }`. Refused with
`409 active_run` while a run is active.

A session response carries `workspaceDir`, `permissionMode`, and
`hostSession: null | { id, path }` (the Pi JSONL session this app session continues).

`GET /api/v5/sessions/:id` → `{ session, events, runs, lastSeq }`

`lastSeq` is the `seq` of the newest event **in that same snapshot**, and it is the
cursor a client resumes from: `GET events?afterSeq=<lastSeq>` returns exactly the
events the snapshot does not already contain. See [Reconnecting](#reconnecting).

## Materials

`POST /api/v5/sessions/:id/materials` — `{ name, text }` → `{ path, bytes, sha256 }`

- `name` matches `[A-Za-z0-9._-]+` and is then resolved through the same workspace
  path guard the `ws_*` tools use; a name that walks out of `materials/` (`..`) is
  rejected with `400 invalid_input`.
- `text` is UTF-8, at most 1 MiB.
- `path` in the response is workspace-relative (`materials/<name>`).

## Workspace

`GET /api/v5/sessions/:id/workspace` →
`{ tree: [ { path, bytes, sha256, mtime } ] }` — every regular file in the session
workspace, workspace-relative paths, symlinks skipped.

`GET /api/v5/sessions/:id/workspace/file?path=<relative path>` →
`{ path, kind: "current", text, bytes, sha256, truncated }`

- `sha256` is over the file's whole current bytes even when `truncated` is true;
  `text` is at most 512 KiB and `truncated` says whether it was cut.
- Path guard errors are `400 invalid_input`; a missing file is `404 not_found`.
- Artifact locators are per-session: a path is only resolved inside that session's
  own workspace. The app state file, the credential file, and other sessions'
  workspaces are not reachable from this endpoint or from any tool.

### Current file vs content version

These are two different things and the API marks which one it is returning:

| | what it is | where it appears | field |
|---|---|---|---|
| **current file** | the mutable file as it stands now; the next write changes it | `GET workspace/file` | `kind: "current"` |
| **content version** | the bytes as written at one instant, addressed by `sha256` | `run.artifacts[]`, `artifact.written` | `kind: "content-version"` |

A content version entry is `{ path, bytes, sha256, kind: "content-version", writtenAt }`
where `writtenAt` is an ISO 8601 timestamp stamped by the store. Writing the same
path twice yields two entries with different `sha256`; the current file then equals
the second. Any later Review, quote, or accept step must reference a content
version. Referencing a path alone is not a reference to content: the file may
already have changed.

## Provider and credentials

`GET /api/v5/provider-config` →
`{ config: { provider, model, api, baseUrl? }, execution: { mode: "real" | "local-fake", realProvider, adapterId }, credentialStatus: "configured" | "not_configured" }`

`PUT /api/v5/provider-config` — `{ provider, model, api, baseUrl? }`.
Allowed `provider` values: `deepseek` (real; `api` must be `openai-completions`,
model validated against the installed catalog) and `fake-openai-loopback` (tests).

`PUT /api/v5/provider-credential` — `{ provider, apiKey }` → `{ configured: true, provider }`
`DELETE /api/v5/provider-credential` — `{ provider }` → `{ configured: false, provider }`

- The key is stored by the application in its own private file (mode 0600) outside
  the workspace, and handed to the SDK's in-memory credential interface at each
  run. The SDK does not discover or maintain a personal global credential.
- No endpoint ever returns a key, and no event, log line, or error message contains
  one. `credentialStatus` is the only thing a client can read back.
- Both routes are refused with `409 active_run` while a run is active.
- With no credential configured, a real call is refused (`credential_missing`); the
  host never falls back to an environment variable, a personal auth file, or the
  fake provider. `DEEPSEEK_API_KEY` inherited by the process is deleted at startup
  and the removal is logged.
- **The key must never be typed into the chat input.** It goes through
  `PUT /provider-credential` only.

## Runs

`POST /api/v5/sessions/:id/runs` — `{ input, commandId }` → `{ run }`

- `commandId` is a client-generated UUID and is required. Re-sending the same
  `commandId` with the same `input` returns the same run (200) — the safe retry
  after a lost receipt. The same `commandId` with a different `input` is
  `409 command_conflict`. The check and the run record are persisted together, so a
  restart does not forget it.
- A second active run in the same session is `409 active_run`.

`GET /api/v5/runs/:id` → `{ run }`, where a run carries
`{ id, sessionId, status, admissionOpen, adapterId, provider, extension, startedAt, endedAt, error, commandId, artifacts[], usage, hostSession, credentialGeneration }`.

`POST /api/v5/runs/:id/cancel` — `{}` → `{ run }`. Cancel requests a stop
(`stopping`), waits for the host to settle, and only then reports `cancelled`;
if this process does not own the run, the result is `unknown` with
`error.code = "not_in_process"`.

`POST /api/v5/runs/:id/questions/:questionId` —
`{ answer }` for `ask_user`, `{ decision: "allow" | "deny" }` for `permission`.
Answering a question that is not pending is `409 question_unavailable`; answering
after the run closed is `409 run_closed`.

### usage

`run.usage` is `{ input, output, cacheRead, cacheWrite, turns, missing }`.
`missing: true` means the accounting is **incomplete**, not zero: numbers the
provider already reported are kept on every terminal path, including cancel and
provider failure. A client should render "at least N" when `missing` is true.

### Budget

`deadlineMs` (default 600 000) is an execution budget: it only runs down while the
run is `running`, and is paused for the whole of `waiting_user`. `maxTurns`
defaults to 40. Exceeding either ends the run `unknown` with `budget_exceeded`.

## Events

`GET /api/v5/sessions/:id/events?afterSeq=N` → `{ events, nextSeq }`.
Events are per-session, contiguously numbered from 1 (`seq`) with no gaps, each
`{ seq, runId, sessionId, type, data }`. `nextSeq` is the server's current
high-water mark, so an empty page still tells a poller where it stands.

| type | data | meaning |
|---|---|---|
| `user.message` | `{ text }` | the instruction that opened the run |
| `run.status` | `{ status }` | a run status transition |
| `assistant.delta` | `{ text }` | streaming assistant text (cumulative) |
| `assistant.message` | `{ text, stopReason, errorMessage }` | a finished assistant message |
| `tool.start` | `{ callId, name }` | a tool call began |
| `tool.result` | `{ callId, name, text, isError }` | a tool call produced a result; `isError` is the model-visible failure flag |
| `question.open` | `{ id, kind: "ask_user", prompt }` | a free-text question is waiting |
| `question.resolved` | `{ id, kind, answer }` or `{ id, kind, status: "expired_restart" }` | answered, or invalidated by a restart |
| `permission.open` | `{ id, kind: "permission", toolCallId, tool, path, bytes, contentSha256, preview }` | a write is waiting for authorisation |
| `permission.resolved` | `{ id, kind, decision }` or `{ id, kind, status: "expired_restart" }` | allowed/denied, or invalidated by a restart |
| `artifact.written` | `{ path, bytes, sha256, kind: "content-version", writtenAt }` | one write landed |
| `run.usage` | the usage object above | recorded once before the terminal status |
| `run.notice` | `{ kind, ... }` | host-level notice: `compaction_start`/`compaction_end`, `auto_retry_start`/`auto_retry_end`, `unrecorded_files` (below) |
| `run.error` | `{ code, message }` | a run-level error; see codes below |

### Permission cards

A `permission.open` event carries everything a card needs to be honest about what
it authorises:

- `toolCallId` — the exact tool call this decision belongs to.
- `path`, `bytes` — the target and the size.
- `contentSha256` — sha256 of the exact bytes that would be written. After `allow`,
  the file that lands hashes to this value.
- `preview` — the first 400 characters of that content.

An approval is bound to that call and that content. If the model then calls
`ws_write` with different parameters, a **new** question opens; the earlier
`questionId` is already resolved and re-answering it is `409 question_unavailable`.

### Reconnecting

Reading events is a pure read: the same `afterSeq` always returns the same page,
and re-requesting one changes nothing on the server.

The intended loop is:

1. `GET /sessions/:id` → render `events`, keep `lastSeq`.
2. `GET /sessions/:id/events?afterSeq=<lastSeq>` → append, set `lastSeq` to the
   response's `nextSeq`, repeat.

`afterSeq` may equal the current high-water mark (an empty page). `afterSeq`
**past** it is `400 cursor_ahead`, and the error body carries the server's current
`nextSeq`:

```json
{ "error": { "code": "cursor_ahead", "message": "...", "nextSeq": 42 } }
```

This is an error rather than an empty page on purpose. A cursor the server never
issued (a different data directory, a state file rolled back to an earlier
version, a fabricated number) can never be caught up to by waiting; answering
`200` with nothing would leave that client polling a stream it can never rejoin.
The recovery is to refetch the snapshot and resume from its `lastSeq`.

### `unrecorded_files` notices

A crash can land between `ws_write`'s rename and the artifact record: the bytes
are on disk, the content version is not in the store. On the next start, every
session whose run was interrupted has its workspace compared against the content
versions the store holds, and anything unaccounted for is reported once:

```json
{ "type": "run.notice",
  "data": { "kind": "unrecorded_files", "files": [ { "path": "out/memo.md", "sha256": "…" } ] } }
```

The file is **not** turned into an artifact and **not** rewritten. An artifact
record means "a tool wrote these bytes and the service witnessed it"; inventing
one at startup for a file nobody witnessed being written would forge exactly the
evidence a later Review is meant to rely on. The notice hands the discrepancy to a
person instead. Files under `materials/` are excluded: they come from the
materials endpoint and never produce artifacts.

## Error codes

Run-level (`run.error.code`, also `run.error` on the run record):

| code | meaning |
|---|---|
| `credential_missing` | no application credential is configured for the provider |
| `provider_auth_failed` | the provider rejected the credential |
| `provider_error` | provider or transport failure (includes the provider status; never a key) |
| `budget_exceeded` | execution deadline or turn budget exhausted |
| `restart_unknown` | the run was in flight when the process restarted |
| `not_in_process` | cancel was asked of a run this process does not own |
| `extension_close_failed` / `extension_finish_failed` | a bound extension could not close cleanly |

HTTP-level: `unauthorized` (401), `origin_denied` (403), `not_found` (404),
`invalid_json` · `invalid_input` · `invalid_provider` · `invalid_action` ·
`invalid_cursor` · `cursor_ahead` (carries `nextSeq`) · `invalid_path` ·
`unknown_field` (400),
`active_run` · `command_conflict` · `run_closed` · `question_unavailable` ·
`binding_exists` · `binding_mismatch` · `extension_unloaded` ·
`generation_mismatch` · `extension_lifecycle_failed` (409),
`body_too_large` (413), `provider_unsupported` (503), `internal_error` (500).

## Operational requirements

- Node >= 22.19.0.
- A POSIX `python3` on `PATH` (or `WORK_AGENT_PYTHON` pointing at one). It holds
  the flock on the data directory in its own process, which is what makes an owner
  SIGKILL release the lock. If it is missing the server refuses to start
  (`LOCK_NO_PYTHON`); there is no unlocked fallback.
- The state file is `schemaVersion` 3. An older file is refused with a clear error
  and left untouched: there is no migration in either direction, and data
  directories are per-batch.

## What is not here

No bash tool, no network tool, no path outside the session workspace: those
capabilities do not exist in this build rather than being switched off. The
workspace path guard is the boundary of a restricted tool surface, not OS-level
isolation. A real DeepSeek run is an authorised provider network call; it had not
been exercised with a real key when this document was written.

## C4 r1 tool responsiveness correction

`ws_grep` preserves its pattern and result schema. Regular-expression matching
runs in a disposable Node worker with a 2000 ms limit; timeout throws a tool
error instead of blocking the service. Run cancellation terminates and awaits
the worker before the tool settles. The early nested-quantifier check remains
a diagnostic, not a complete complexity bound. No new npm dependency or
model-visible tool is introduced. Workspace enumeration still uses the existing
asynchronous path; this is a bound on the matching worker, not a total filesystem
scan performance guarantee.

An existing command receipt is resolved before checking current provider or
extension availability. Unloading a bound extension does not prevent retrying
the same session/command/input to retrieve its prior Run; changed input remains
`command_conflict`, and new commands still require an available execution route.
