# Command surfaces and compaction availability

This page describes the current CourtWork Host, not the standalone Pi terminal
application. The installed execution SDK is Pi 0.85.1. CourtWork supplies its own
admitted tools and context and deliberately disables Pi filesystem resource
discovery. Installing the SDK does not install its terminal command interface in
the CourtWork composer.

## Current support (2026-09-16 · CMD-01 / CMP-01 first slices)

| Operation | Supported path today |
|---|---|
| Change model or reasoning effort | Existing model picker / Model & effort card and versioned `PUT /api/v5/provider-config`; `/model` opens the picker, `/effort <value>` saves the same Host configuration (all chats, future runs). Existing Run bindings remain historical. |
| Inspect this chat and its tools | `/status` and `/tools` read Host facts through the command dispatcher: no Run, no model request. Existing Runtime/Settings views remain. |
| Stop a Run | Existing Stop action and `POST /api/v5/runs/:id/cancel`. |
| Automatic compaction | Native Pi threshold and overflow recovery, within the Host's compaction policy and execution deadline (unchanged). |
| Manual compaction | `/compact [focus]` or `POST /api/v5/sessions/:id/compactions {requestId, focus?}`: a Host operation on an idle chat that calls Pi's manual `compact()` once. Refused, not queued, while any Run or another compaction is active. |
| `/skill:name`, other slashes | Not commands. See the reading rules below. |

### Typed commands (CMD-01)

`GET /api/v5/sessions/:id/commands` is the one Host-owned catalog: `status` and `tools` (read), `model` (client_ui → the picker), `effort` (setting: exactly the values the Host's reasoning capability lists plus `default`), `compact` (control → the operation below; unavailable with a reason while a Run or compaction is active or the chat has nothing to compact), `fixture` (passthrough, only on the Local test provider). Each descriptor carries `kind`, `availability {available, reason}`, `sideEffects`, `interactive`, `target`, `args`, `source`, `scope` and `version`; the catalog `revision` hashes the facts it was built from. The web menu is a projection of this catalog and keeps no list of its own.

Dispatch (`POST /api/v5/sessions/:id/commands/:name {revision?, args, requestId?}` or the whole-message form `POST /api/v5/sessions/:id/commands {text, revision?, requestId?}`) re-decides from current facts: stale catalog `409 command_revision`, unknown `404 unknown_command`, unavailable `409 command_unavailable`, bad arguments `400 invalid_arguments`. None of these starts a Run or sends a model request; the composer keeps the draft and shows the reason.

How a leading slash is read (`parseSlash`, Host-owned, used by the whole-message form): `//…` is the literal escape and continues as ordinary text `/…`; `/name` or `/name args` with a lowercase name followed by whitespace or the end is a command; everything else (`/Users/me/file`, `/tmp/x`, a leading space, `/status;`, code) is ordinary text. `/fixture …` remains the Local test provider's script notation and is sent as an ordinary Run. `commandId` on Run creation is still the idempotency key and is never a command name.

### Manual compaction (CMP-01)

`POST /api/v5/sessions/:id/compactions {requestId, focus?}` returns an operation record (`running` → `completed | failed | cancelled | unknown`); `GET …/compactions` lists, `GET …/compactions/:opId` queries back, `POST …/compactions/:opId/cancel` cancels. Admission shares Run creation's serialized closure: `409 active_run` while any Run is active (the Run is not aborted), `409 operation_active` while another compaction runs, `409 nothing_to_compact` without a recorded conversation, `409 compaction_unavailable` without a known context window, `409 credential_missing`. Run creation and configuration saves are refused while a compaction runs. The same `requestId` replays the same record; after a lost ACK the client queries back instead of paying for a second summary.

The record keeps `provider` (connection, config version, effort, window, policy), `journal` (summary entries before/after), `result` (`tokensBefore` and `estimatedTokensAfter` as `sdk-estimate`, `usage` as `provider-reported` or `usageMissing`), and `error` (`already_compacted`, `too_small`, `cancelled`, `deadline`, `compaction_failed`, `restart_unknown`) without raw provider text or summary text. Pi 0.85.1's `compact(focus)` runs on the chat's own journal with a fresh tool-less session: no user turn is added, the summary entry is Pi's, and the next Run reads the compacted journal through the existing SessionManager path. A restart marks an in-flight compaction `unknown`; whether its summary landed is answered by the journal (a later `/compact` returns `already_compacted` when nothing new followed). Cancel and deadline write no partial summary.

## Automatic compaction boundaries

Native compaction begins when the SDK context estimate exceeds
`contextWindow - reserveTokens`; it need not wait for a full window. Provider
overflow can also trigger recovery. Real-provider compaction is enabled by
default when a valid context window is available; Local test is opt-in. A route
with an unknown window cannot use automatic compaction until configured with a
valid window. See the [policy and usage contract](api-runtime-mx-r1.md) and
[model-window behavior](runtime-foundation.md).

The default cap is four compactions per Run. The current compaction may finish
at the cap, while subsequent automatic compactions are disabled for that Run;
this does not terminate normal work and is not a monetary cap. The deadline and
cancel path cover summarization too. Summary retries can incur additional
requests, and missing reported usage remains missing.

Pi owns the persistent conversation summary. The Host reconstructs current
admitted tools and context from their original owners and reasserts
`runtime.context` if compaction removed it. Neither a summary nor old loaded
text grants current permissions or changes Core acceptance. Reassertion is not
a claim that all earlier conversation details or revoked source bodies are
erased or perfectly preserved.

Current sanitized `run.notice` compaction events expose reason and outcome;
they do not expose native summary text or public before/after token counts.
Request telemetry distinguishes agent and compaction requests. A future
`estimatedTokensAfter` must remain an estimate, not be labeled provider-exact
usage or decode TPS.

## Command contract (RD-008)

[RD-008](../../engineering/research/RD-008-command-compaction.md) records the
typed command and manual-compaction gaps. Slash is one possible projection of
typed capabilities. Tools keep their own schema, authorization and execution
lifecycle; extension/project/MCP are provenance, not interchangeable effects.
An eventual command dispatcher must reject unsupported command invocations
without a model request and provide explicit literal-text behavior. That is a
future acceptance condition, not a claim about today's ordinary text channel.
