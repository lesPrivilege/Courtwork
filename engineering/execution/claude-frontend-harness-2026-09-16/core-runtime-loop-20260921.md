# Claude author loop · P03-C → D → E

2026-09-21 · User-authorized finite long-running backend task. Astra freezes architecture and integrates; Claude/Fable is the core author, with bounded Sonnet source exploration when useful. [Luna's traceable index](evidence/core-loop-index-20260921/README.md) precedes implementation. Observed main `b714c08`; 06d has a separate active frontend tree `courtwork-tabbed-preview-20260921` and must not be duplicated or changed.

## Working mode

Continuously repeat **read the next contract/evidence → choose one missing seam → write a counterexample → implement → run selected checks → record exact source/evidence → commit the finite milestone → continue the next authorized stage**. This is a finite implementation loop, not a periodic `/loop` timer, daemon, automation or permission to spawn endless retries. Stop when the authorized offline C/D/E handoff is complete, when a material unresolved contract blocks dependent work, or when explicitly stopped.

The latest user authorization lets Claude choose asynchronous test/exploration timing and continue C→D→E on its isolated author branch after the preceding author checks and milestone commit. Do not stop merely to ask whether to continue routine work. This supersedes older transport-stage wording requiring a human reply before every next author increment. It does **not** confer independent acceptance: Codex reviews each fixed milestone and alone merges main. Incorporate returns in the same owner/branch without rewriting reviewed history. No automatic push, deployment, cleanup deletion or user Host restart.

One product writer owns this backend lane. Exploration and isolated tests may run asynchronously when independent; no overlapping writers in service/store/runtime modules. Keep raw subprocess exit codes and complete useful failure evidence. Wait for dependent results before acting on them. Do not run competing full suites or repeat a green suite without changed source/new evidence. Do not end with a plan when the next implementation step is already authorized.

## Ordered stages and handoff

| Stage | Work / completion evidence |
|---|---|
| C0: implementation note | Read actual branch/state/index and [the minimum Host contract](p03c-host-consumer-contract-20260921.md). Record exact strict types, transition table, migration and chosen native evidence. This is an implementation note within the frozen rules, not another architecture campaign. |
| C: Host governed-read consumer | Reuse accepted Pi Port, Agents adapter and SDK transport. Narrow function-declaration forwarding; durable remote binding, intent/call/result receipts; one actual service-path repo_read and same-session continuation, plus required negative cases. Commit source and offline evidence. Do not label this the account-authorized live C milestone. |
| D: failure and recovery | Extend the same owner with observation recovery, cancellation confirmation, lost replies/restart/late/duplicate observations and fail-closed unresolved outcomes. Persisted read results are reused only under the established operation semantics; tools are never blindly rerun. Commit a fault matrix and bounded deterministic process evidence. |
| E: same repository read/write/check | Reuse the already accepted candidate write/check implementation and permission identity. Drive an exact synthetic write → approval → fixed check → matching result/diff/reopen, and deny/stale/revoked/cancel/unknown cases, against both the unchanged Pi baseline and new consumer. Commit parity evidence; return frontend contract gaps as small owner proposals rather than edit 06d. |

Use real production service/Store/SDK wiring with injected loopback native responses, disposable repositories/data and checked-free ports. No paid Agents call, user key lookup or credential migration. The user's DeepSeek dogfood connection is not an Agents API account grant. Claude authoring itself uses the explicitly requested installed Claude channel; do not initiate provider experiments to fill the live milestone. Capability exposure stays unavailable until its own live proof exists.

## Files and boundaries

Own `app/server/service.mjs`, `store.mjs`, `runtime.mjs`, the thin Agents Host adapter/gateway and accepted transport/adapter extensions, plus directly related tests/fixtures and original contract/evidence documentation. Preserve Pi internals except a proven shared-port compatibility adjustment with regression evidence. Reuse repository/candidate/check owners; do not fork them. Record cross-layer reasons before edits.

Do not change `app/web/**`, 06d files, browser/shell packages, live Settings, global provider configuration, native Pi/Hermes configuration, Work Core/bridge schema or the frozen Git root. A required shared route/allowlist/documentation hunk must be explicit and isolated. Schema/version changes synchronize their source entry points and bilingual README where applicable; preserve other writers' changes. Do not update `engineering/current.md` or integration/acceptance records as though you were the integrator; write your progress in this task's author record.

A provider/native guarantee that evidence cannot establish is unknown. A materially different owner, permission model, schema topology or required SDK/runtime upgrade goes to Astra with a concrete counterexample and alternatives; continue independent safe checks while that dependency waits. Do not silently broaden the contract, weaken tests, fabricate native facts or turn simulated support into production availability.

## Durable progress and stop report

Keep `engineering/execution/claude-frontend-harness-2026-09-16/evidence/core-runtime-loop-20260921/author-status.md` current at milestones: branch/base/current source SHA, claimed files, current stage, source references consumed, running jobs and their owned ports/data, passed/failed/unexecuted checks, next step and open decisions. No credentials or unbounded telemetry. Commit bounded source/evidence milestones; never `git add .`/`git add -A` or rewrite shared history.

Final handoff names exact C/D/E commits, production paths exercised, author versus independent evidence, retained unknowns, migration/rollback limitations and writer release. Stop owned test processes. Preserve branch, worktree, untracked and non-regenerable ignored content for Codex's integration and restore-verified cleanup. Do not claim complete live C, formal Work acceptance or product browser support from this offline author loop.

Core bridge reliability, local Pi workers and Runtime-management backend remain follow-on scopes, not additional parallel product writers. If a reproducible bridge defect blocks the chosen tests, record and repair only the smallest necessary existing-owner defect; no unrelated soak campaign or blanket timeout increase.


## C/D/E author handoff reviewed — 2026-09-22

Author C eec2244, D37a14a5, E2978f5a, packet45ae12e complete offline and released. [Parent review and seven decisions](evidence/core-cde-review-20260922/README.md) hold integration for **CDE-R1**: native terminal must not resolve execution-unknown local calls without Host-effect evidence. Luna32/32 is retained with an executable counterexample; author1421/1421 is not independent acceptance. Return only the scoped correction/service-path proof in the same branch. ArtifactHistory retention and read-only turns.retrieve are adopted;16KiB argument ceiling remains, so E is bounded parity. Future human cancellation/abandonment and HTTP/UI reconciliation are registered but not added to this return. Do not integrate the unreleased intermediate C schema19 separately.


## Final adoption and writer release — 2026-09-22

[Final parent receipt](evidence/core-cde-final-20260922/README.md) accepts e49232e/CDE-R1 and integrates final C/D/E at main ca859a5. Luna33/33 and actual-main39/39 pass; author1422/1422 stays separately attributed with its earlier failures. Final RuntimeStore19 is adopted; no live runtime exposure or user-data migration. The ended core tree/merged branch were removed only after exact full-byte restoration and Git-bundle verification; the archive ref remains. Original deferred recovery operations and cross-record validation limit remain explicit. This C/D/E writer is released; the [new local Pi loop](local-pi-worker-loop-20260922.md) receives only its bounded later Host/child integration scope.

## 2026-09-27 · Hermes protocol slice: next Claude serial core assignment

**Status: contract ready, queued after CB-D1 delivery and parent disposition; not a second active author.** User assigns core self-development and frontend integration to Claude serially; Astra decides boundaries and acceptance. This continues RD-001/P03 for the next Attention consumer. Do not repeat accepted Pi extraction, C/D/E, Kit or Settings work. Planning baseline `d4a08d7`; author must use actual integrated main at pickup.

**Responsibility / precedent:** Runtime adapter translates native facts; transport owns bounded HTTP/SSE IO. Host continues to own Run admission, effects, persistence, grants and settlement. Work Core owns Attention and formal state. Nearest accepted precedents: `app/runtime/agents-api-adapter.mjs`, `openai-agents-transport.mjs`, `agents-host-gateway.mjs` and DRT03 protocol/transport fixtures. Reuse invariant patterns, not Agents wire shapes or IDs. [Pinned Luna exploration and Astra corrections](evidence/hermes-protocol-preflight-20260927/README.md) are mandatory input.

**Astra selection:** use Hermes API-server `/v1/runs`, pinned `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88` (`v0.21.3`). Build a standalone protocol adapter plus bounded HTTP/SSE transport and deterministic loopback fixture; no production Host registration. This proves one actual wire consumer before widening current executor identity/Store contracts. Do not pretend Hermes is the existing managed Agents adapter. ACP/TUI remain later candidates, one-shot CLI remains consultation-only.

**Owned files:** new focused `app/runtime/hermes-api-runs-adapter.mjs`, `app/runtime/hermes-api-runs-transport.mjs`, corresponding tests/fixture under `app/tests/`, a bounded API contract under `app/docs/`, and this original task/evidence record. Existing shared utility changes require a concrete necessity recorded first; no broad extraction. Do not edit `app/server/{service,store,runtime,executor-choice-state}.mjs`, Pi/Agents behavior, `app/web/**`, dependencies, RuntimeStore/Core schemas, current/dispatch pages or personal runtime settings. You are not alone in the repository; preserve independent writers' edits.

**Wire/identity:** derive exact request/response/error/status examples from pinned source. Nonempty text input; explicit optional native session ID only; Host caller supplies stable bounded idempotency identity. Admission returns a native run ID, not completion; recover lost admission only with the same intent/key/body, never an automatic new key. Native run/session/endpoint/revision stay distinct. Do not guess a session ID from a title or treat native identity as a CW ID. Validate status/event run identity and malformed payloads before accepting observations.

**Streaming:** handle fragmented UTF-8/SSE and comments within explicit byte/time/output limits. Native envelope is `{event,run_id,timestamp,...}`; no guaranteed event ID, sequence or replay cursor. Supported text is `message.delta.delta` and terminal output/status; do not fabricate `message.complete`/`run.started`, suppress legitimate repeated equal deltas, or reconstruct missed content from status. Terminal output may establish final text only when actually returned; stream coverage remains separately truthful. Disconnect/reconnect cannot claim exactly-once event replay. Unknown events are bounded diagnostics, never tool execution.

**Cancel/recovery:** send explicit stop, distinguish stopping intent from matching terminal cancelled. Transport loss, timeout or restart without adequate evidence is unknown; never retry effects implicitly. Status-only reconciliation may observe the pinned interrupted/owner-loss result; it cannot recover missing events or effect receipts. Dispose closes owned connections only, with no implicit stop/delete, and never kills a native/shared gateway. Continuation uses only observed explicit native identity; absence refuses rather than guessing.

**Capability ceiling:** only synthetic conformance is reported. Tool calls/results, approvals, steer, compaction, event replay, cron, notification delivery, browser, native tool isolation, live credentials and production Hermes selection are unsupported. An unexpected approval/tool event must not grant or execute anything and must not produce a successful text-only claim. No Hermes process or provider is started; fixture uses independent disposable ports/data and synthetic bearer values only. Limit first transport to an explicitly supplied loopback fixture endpoint; no environment credentials or implicit endpoint discovery.

**Exit evidence:** exact pinned-wire fixtures for admission, identical-key replay/changed-body conflict, lost response without replacement intent, fragmented Unicode, repeated equal deltas, malformed/wrong-run events/status, unknown events, missing terminal, explicit terminal output, cancellation intent versus confirmed/unknown, owner restart interrupted, unsupported tool/approval behavior and dispose without mutation. Test resource cleanup/bounds with real local sockets. These are observable adapter/transport behaviors, not tests of copied constants. Record author source SHA and useful failing-before/final evidence; run narrow new tests plus directly affected adjacent protocol checks. Parent/Luna independently review the fixed candidate; no fixture-only result enables Host exposure or claims a working Hermes Attention Agent.

**Serial handoff:** Claude consumes this only after parent releases the completed CB-D1 slot. Commit finite source/evidence in the preserved isolated lane and return for review. No push, deployment, user Host restart, native install or paid provider. Further Host schema/allowlist/integration work requires Astra's next concrete contract based on this result, not inference from this assignment.

**Actual Hermes dispatch · 2026-09-27:** after CB-D1/CB-R1 acceptance, Astra sent the committed `67cc742` handoff to the same original Claude Code conversation “Live assistant text streaming” (Opus5.5), instructing actual-main fast-forward in its preserved tree and the exact standalone protocol scope above. UI confirms submitted message and Running/Waiting; [capture](evidence/hermes-protocol-preflight-20260927/claude-dispatch.png). This is a live author dispatch, not delivered implementation or native Hermes execution. No parallel core/frontend writer is created.

### Hermes protocol slice · author pickup and pre-edit record — 2026-09-27 (Claude, Opus)

Picked up on the original serial tree `../.worktrees/courtwork-runtime-settings-i1-20260927`, branch `claude/runtime-settings-i1-20260927`. Its history is preserved; it was fast-forwarded from `b57dad0` to main `67cc742`, and only the dependency symlink is untracked. The shared main checkout, user 8787 and all other trees are untouched.

I read the pinned Hermes source directly, read-only: `/Users/lesprivilege/Projects/hermes-agent` at `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88`. No process, provider, configuration or credential was read or started. The facts the fixture reproduces:

- **Routes** (`api_server_runs.py`): `POST /v1/runs`, `GET /v1/runs/{id}`, `GET /v1/runs/{id}/events`, `POST /v1/runs/{id}/stop`. Approval and steer exist but stay out of scope.
- **Auth.** `Authorization: Bearer`. Failure is 401 with `{error:{message,type:"gateway_auth_error",code:"gateway_auth_failed"}}`.
- **Other errors** use the envelope `{error:{message,type,param,code}}`.
- **Admission.**
  - `Idempotency-Key` must be 1–255 visible ASCII characters, else 400 `invalid_idempotency_key`.
  - A missing `input` gives 400 "Missing 'input' field".
  - First admission is 202 `{run_id, status:"started", replayed:false}`.
  - Same key and body gives 202 `{run_id: original, status: <current>, replayed:true}` plus `Idempotency-Replayed: true`.
  - Same key with a changed body gives 409 `idempotency_key_conflict`.
  - `session_id` comes only from the body, or falls back to `run_id`, and is visible in status, not in the admission response.
- **Status** is `{object:"hermes.run", run_id, status, created_at, updated_at, session_id, model, last_event, …}`. Status values are `queued`, `running`, `stopping` and `waiting_for_approval`; terminal values are `completed`, `failed`, `cancelled` and `interrupted`. Terminal records carry `completed`, `partial` and `interrupted`, plus `output` and `usage`, or `error`.
- **Owner loss.** A durable non-terminal record whose owner is gone reads as `interrupted`, with `error:"The gateway restarted before this run settled."` and `last_event:"run.interrupted"`.
- **SSE.**
  - Frames are `data: <json>\n\n` with `ensure_ascii`, so non-ASCII arrives as `\u` escapes.
  - The envelope is `{event, run_id, timestamp, …}`, with no id, sequence or replay cursor.
  - Keepalive is `: keepalive\n\n` every 10 s.
  - The end is `: stream closed\n\n`. After it, the run's queue is removed, and a later subscriber gets 404: there is no replay.
  - Text is `message.delta` `{delta}`.
  - The terminal event is `run.<status>`, carrying the same fields as the terminal status.
  - Tool, approval, reasoning and subagent events are outside this slice.
- **Stop.** An active run returns 200 `{run_id, status:"stopping"}`. An already-terminal run returns the status body. A run not active in this process gives 409 `run_not_active`.

**Responsibility, owner and precedent.** The adapter translates native facts and the transport owns bounded IO. The Host keeps admission, effects, persistence and settlement; Work Core keeps Attention and formal state. The nearest precedents are the accepted `agents-api-adapter.mjs` and `openai-agents-transport.mjs` (the delivery vocabulary and the no-retry rule) and the DRT03 tests. Their invariants are reused; their wire shapes and ids are not.

**Owned files (all new).**
- `app/runtime/hermes-api-runs-adapter.mjs` and `app/runtime/hermes-api-runs-transport.mjs`.
- `app/tests/fixtures/hermes-api-runs-loopback.mjs` and `app/tests/hermes-api-runs.test.mjs`.
- `app/docs/hermes-api-runs.md`.
- The evidence folder and this record.

No shared utility change is needed. No service, store, runtime composition, executor allowlist, UI, schema, dependency or Pi/Agents code is touched.

### Hermes protocol slice · author delivery — 2026-09-27 (Claude, Opus)

The source commit is `a0d6ea7`; the evidence follows in the next commit. See the [author evidence](evidence/hermes-api-runs-20260927/README.md).

- **What was built.** A standalone `hermes-api-runs` adapter and a bounded loopback-only HTTP/SSE transport, pinned to hermes-agent `d7b836ab`, with a pinned-shape loopback fixture and the contract doc [`app/docs/hermes-api-runs.md`](../../../app/docs/hermes-api-runs.md).
- **Behaviour.**
  - The exact `{event, run_id, timestamp}` envelope is validated.
  - Repeated equal deltas are kept, and streamed text stays apart from terminal `output`.
  - A lost admission is recovered only with the same intent.
  - Stop is an intent; a gap, a missing terminal and owner-loss `interrupted` settle as `unknown`.
  - A tool or approval event rules out success, and unsupported controls refuse before any request.
  - Dispose closes only its own connections.
- **Checks.** 22/22 fault cases over real sockets, stable across 3 runs. The mutation check catches all 5 injected contract violations. Adjacent Agents, DRT03 and executor tests 29/29; doc links clean.
- **Unchanged.** No service, store, runtime composition, allowlist, schema, UI, permission or dependency; no native Hermes or provider.
- **For Astra.**
  1. Host admission and identity (executor id, Store fields) need the next contract.
  2. The fixture reproduces pinned shapes from a source read; there is no live conformance.
  3. `run_not_active` can only be reached with the fixture's `forgetLive`. On the pinned server, a durable record reads as `interrupted` after an owner restart.

Writer stopped for parent review. No push, main merge or 8787 restart.

**Subsequent consumer boundary, Astra · 2026-09-27:** [Host preflight disposition](evidence/hermes-protocol-preflight-20260927/README.md#host-consumer-preflight-consumed--2026-09-27) adopts the current Agents-specific durable-ledger and Pi-only global-role constraints. The active protocol slice remains unchanged. Text-only consultation is not the target Attention implementation; subsequent construction must establish actual Host-governed tool/results and native identity/recovery support, with schema impact decided from the concrete durable contract. Luna's pinned-source tool-seam exploration is preparation only.

**Hermes protocol parent return · 2026-09-27:** [review](evidence/hermes-protocol-review-20260927/README.md) holds `fc7dec8` / `a0d6ea7` for HPR-R1 (frozen-object provenance permits cross-endpoint continuation and forged request bodies) and HPR-R2 (invalid/non-finite limits bypass declared bounds). Parent/Luna probes reproduce; existing51/51 pass independently. Adopt both findings in the original Claude lane, keeping the standalone protocol scope and all current Host/Store/Attention boundaries. No source merge or next consumer release.
