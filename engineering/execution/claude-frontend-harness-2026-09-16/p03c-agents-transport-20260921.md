# Fable next core order — Agents API transport

2026-09-21 · **Final transport accepted and integrated.** Source `32f4f8b` closes R1/R3 under independent 22/22 plus synthetic probes; integrated main `10b2d52` passes 22/22. [Final disposition and evidence](evidence/p03c-transport-acceptance-20260921/README.md). R2 remains rejected; D2–D4 packet corrections retain unknown-outcome obligations. This supersedes the hold below for this finite transport only. No Host consumer or next slice starts.


## 2026-09-21 · Independent review: two finite returns

Source `b69a4b5` is delivered and writer-released. [Independent disposition](evidence/p03c-transport-review-20260921/README.md) holds integration for P03C-R1 ambient header provenance and P03C-R3 incomplete-page rejection, both assigned back to Fable in the same tree. Luna 22/22 passed; Astra independently accepts mechanical dependency-ledger regeneration and rejects a 204-only ACK restriction as unsupported. Packet recovery claims must follow D2–D4. No next Host consumer starts; historical ready-to-start wording below is superseded by this review status.

2026-09-21 · **Ready for Fable pickup; not started by Codex.** This is the first bounded implementation increment inside original P03-C / DRT-03, after [P03-B acceptance](evidence/p03b-pi-runtime-port-review-20260921/README.md). It is not a new roadmap or full C acceptance. Baseline inspected: main `5554560`; start from actual integrated main when claiming a fresh isolated worktree.

## Outcome and sequence

The existing Agents protocol adapter should make correctly formed requests through a production SDK transport, consume streamed events, and release its connection predictably. All author execution uses an injected synthetic HTTP/fetch endpoint. Deliver real transport code and exact wire evidence; do not advertise a live runtime from fixture success.

Serial core order:

1. **This order: transport + request identity + lifecycle.** Fable may start now. Sonnet may perform the bounded artifact/contract preflight below. Codex independently accepts the candidate before the next increment.
2. **Next C increment, queued:** persisted remote binding and one governed read-tool round trip through the production Host. Codex first freezes the small binding/receipt migration in the original Store/RD-001 owner. Fable then implements that finite consumer. No schema implementation is authorized by the present transport order.
3. **Original D, then E:** uncertain submission, disconnect/cancel/restart recovery, followed by exact repository write/check parity. Preserve original plan ordering; do not launch all directions together. C's live read milestone needs a separately bounded account-authorized test, not the existing DeepSeek browser credential.

Composer working-location stays with its current frontend writer. Runtime-management preview, tools/request-details and local CLI delegation remain their existing queues. Do not start them as side work.

## Mandatory consumption and authority

Read AGENTS/current → this order → [P03-C plan](../../research/agents-api-first-2026-09-14/implementation-plan-20260916.md) → [original protocol delivery](../../research/agents-api-first-2026-09-14/adapter-protocol-20260915.md) → [source map and primary-source recheck](evidence/p03c-dispatch-20260921/README.md).

Consume `app/runtime/agents-api-adapter.mjs`, `agents-api-contract.d.ts`, `app/tests/drt03-agents-api-protocol.test.mjs` and its fixture. They already own native normalization, event/item merging, settlement recommendations and capability exposure. Preserve those owners and P03-B. Do not wrap the managed harness inside Pi, duplicate SSE parsing when the SDK supplies it, introduce a second model loop, or build a general runtime registry.

## Sonnet preflight — at most 12 tool calls

Answer only: (1) which exact package artifact/exports will this transport use; (2) exact create, events, stream, retrieve and items method signatures; (3) actual header/body placement and documented scope of request identity; (4) SDK retry/timeout/abort/iterator disposal behavior; (5) minimum fields/options absent from the current injected-transport contract. Use the pinned artifact and first-party source only. Stop at the call limit with uncertainties; do not exceed it to fill the table. Already verified source mapping is reused, not rescanned.

The existing verified artifact is `openai@7.15.0`; the later plan's `7.16.0` remains a distinct candidate. Start by checking the recorded 7.15.0 tarball hash/exports and the exact methods needed. If usable, pin it exactly for this finite transport and record current-doc differences; no `latest` or incidental Pi upgrade. If an essential method is missing or changed, report the exact alternate artifact/source and compatibility delta for Astra before changing the adopted version. Routine SDK wiring proceeds under this order. Package inspection needs no personal credential or API call.

## Fable ownership

Own a thin `app/runtime/openai-agents-transport.mjs`, directly related tests/fixtures, and only the minimal additions to `agents-api-contract.d.ts` / existing adapter needed to carry caller-owned request identity and cancellation metadata. Preserve historical protocol evidence and IDs. If SDK installation is needed, `app/package.json`, its lock and `app/docs/dependency-ledger.json` are in scope for this exact dependency; record integrity/license verification. Avoid unrelated lockfile churn.

`app/server/service.mjs`, `server/runtime.mjs`, Store/migrations, Pi modules, WebUI, Settings and global provider configuration are **outside this increment**. Do not change production runtime selection or expose a button/flag that implies account access. No current.md/shared acceptance edits by the author; deliver in this order's author subsection or a linked packet. Other writers are active: preserve their files and use separate synthetic data/ports; leave 8787/8899 untouched.

## Transport contract and required behavior

- Implement the existing transport's createSession, sendEvents, streamEvents, getSession and listItems using the verified official SDK. No native Session deletion or remote environment setup. First scope remains `environment:none` with explicit initial input, even if a newer API permits more.
- Credential and connection configuration are supplied explicitly by the caller. Tests supply synthetic credentials and injected fetch/loopback only; do not inspect ambient personal key stores or auto-discover a key. The transport does not persist secrets or rewrite native agent configuration.
- Carry caller-owned operation identity through the adapter/transport to the verified wire representation where supported. Never manufacture a new retry key inside a retry loop. Distinguish create, message, tool result and cancel; a message-idempotency guarantee does not imply a create/effect guarantee.
- Disable implicit SDK retries for mutating operations. A lost response is unresolved outcome, not proof of non-execution. Do not auto-create a replacement Session or rerun a function. Transport tests must count actual HTTP attempts. Existing adapter-local duplicate/ACK-loss behavior is not a durable Host receipt; enumerate the remaining caller obligations for the next C increment.
- Return the SDK event iterator through the existing observation path. Aborting or disposing a stream releases readers/listeners/timers and handles an abort before response headers or during streaming; it does not send native cancel/delete and does not settle a CW Run. A cancel request itself is only intent until the existing root-terminal contract confirms it.
- Preserve precise native identifiers, event payloads and pagination cursors. Do not translate missing or malformed responses into empty successful results. Keep text-done semantics/normalization in the existing adapter. Errors have bounded safe diagnostics; headers, credentials and arbitrary tool/request bodies are not copied into logs.
- Retain `exposureOf` / fixture verification semantics. No test switches `fixture` to `live`, invents a native ID or treats stream end/session idle as completion.

## Acceptance evidence

Use the production SDK with injected synthetic fetch or a real loopback HTTP fixture, and the real existing protocol adapter above it. A hand-written fake SDK that only matches the implementation is insufficient.

1. Record exact method/path/beta header and request bodies for initial create, a later input, cancel intent and function result with real synthetic turn/call IDs. Show request-key placement for the chosen package. Mismatched IDs/invalid inputs must fail at the owning boundary, not be silently rewritten.
2. Drive streamed fragmented frames, done without deltas and normal end through the SDK into the existing adapter. Keep root terminal, child terminal, idle and stream-close outcomes distinct. Existing protocol tests remain green.
3. Abort before headers, while reading a stream and after completion; dispose twice; verify no surviving reader/timer/request and no cancel/delete HTTP call caused by transport disposal.
4. Exercise items pagination/cursors, non-JSON errors, malformed success, refusal/timeout and lost mutation reply. Assert no implicit second create or result submission. Do not claim process-restart exactly-once behavior in this transport-only test.
5. Run relevant protocol/transport/boundary/dependency checks, then the appropriate full suite after the final source change. Capture complete logs and actual subprocess exit codes, including failures. Use engineering/verification.md; no test-only replacement of the production adapter path.

Deliver exact source SHA, artifact/version decision, wire captures, completed/unexecuted matrix, remaining Host/schema obligations and writer release. No paid service, screenshot or visual baseline is required for this backend-only increment. Codex retains independent acceptance/local integration/restore-verified cleanup. Stop after delivery; no automatic next-slice implementation.

## Later Host consumer: reserved boundary, not this order's source permission

The current Store accepts Pi's `{id,path}` hostSession; a remote locator must not be disguised as a path. The next contract needs explicit adapter/native session/root-turn/configuration identity plus durable command and call/result receipts, while preserving existing Pi schema/history and migration backups. It must bind pending actions to the admitted CW Run, reuse the existing governed repository reader, persist the bounded result before submission, and reuse that result on an uncertain ACK. One allowed read, denied/unknown/out-of-scope calls, duplicate pending action and same-session continuation form the first vertical fixture. Fault cases cannot be postponed if they would allow duplicate execution in that first consumer. Full restart/recovery remains original D; unknown must already be safe in C.
