# P03-C dispatch exploration (offline, read-only)

Date: 2026-09-21
Baseline: main `5554560b0b77336a81e76602d016ea2d96f81b36`

## Recommendation

The smallest useful next Fable work order is a **transport-only Agents adapter slice**: implement the production wire transport behind the already-frozen `AgentsApiTransport`, using an injected synthetic `fetch`/HTTP fixture and no credentials or WebUI. This removes the hard missing dependency without touching the Pi-shaped Host or RuntimeStore. Its acceptance should cover create/session request identity, event stream, send/cancel/tool-result request bodies, abort/dispose, and bounded HTTP error mapping.

The first Host consumer should follow as the next C step, still with a synthetic transport and no WebUI. It should prove one read-only function round trip through production Host governance:

1. create one CW Run and bind one native Agents Session/turn;
2. consume `runtime.function_call.pending` for one allowlisted `repo_read`/equivalent read tool;
3. route the call through existing `governTools` and the existing repository reader, including scope/permission checks;
4. persist a bounded call intent/result receipt before sending `agent.session.input.tool_result`;
5. translate native text and terminal observations into the existing Host event vocabulary and settle the Run;
6. continue one later turn on the same native Session in the synthetic fixture.

The transport slice is the smallest useful offline unit because the existing adapter already owns protocol normalization and the current Host cannot consume its native lifecycle without a binding/schema decision. It must be explicitly labeled synthetic and must not expose Agents as a selectable production runtime or claim live capability. The following Host consumer is the smallest vertical proof once the transport exists.

A real Agents API C milestone still requires the separately recorded user-authorized probe. The adapter protocol record says the live sequence is `create → function read → result → final`, and the lane remains unavailable before that probe. The offline slice should therefore be a transport-injected Host proof, not a fake claim that the service is live.

## Why transport comes first

There is no production transport in this checkout. `createAgentsApiRuntimeAdapter` rejects construction unless an object with `createSession` is injected, and no module imports the official SDK or implements HTTP. Therefore a Host consumer first would either duplicate transport behavior in a fixture-only path or fake a runtime integration that cannot be exercised by the real adapter. The first work order should stay below `RuntimeService`: a thin `app/runtime/openai-agents-transport.mjs` (name is provisional) that implements the frozen transport methods over an injected fetch/client, preserves the pinned beta header and endpoint paths, accepts an abort signal, and maps non-success/malformed responses to bounded adapter errors.

The current official reference/SDK record has a request-identity naming drift (`events.create` is documented in the newer reference with `idempotencyKey`, while the pinned 2026-09-15 source record describes an `Idempotency-Key` header). The transport owner must verify the exact chosen SDK or raw HTTP wire before implementation and record the decision; no source record should be silently rewritten. Synthetic wire tests can prove header/body/abort behavior without a credential.

Transport-slice acceptance: create session with `environment:none` and input; send message; cancel intent; submit function result; stream event iteration and abort; get session/items pagination; bounded HTTP status/JSON errors; no automatic retry for create or effect submission; exact request identity; disposal closes the stream. Existing `drt03-agents-api-protocol` remains the protocol layer, and no schema/UI/service files change in this first order.

## What already exists

`app/runtime/agents-api-adapter.mjs` already supplies most protocol mechanics:

- frozen protocol/header/endpoints and verified `openai@7.15.0` artifact pin;
- `createSession`, `submitInput`, `cancelTurn`, `submitToolResult`, `observe`, `reconcile`, `settle`, and `close`;
- environment `none` admission, event-id deduplication, native event normalization, bounded errors, terminal settlement, saved-item recovery and coverage-gap reporting;
- required-action parsing for function calls and environment connections;
- explicit unavailable rows for hosted/self-hosted environments, built-in execution, files, MCP, exact usage, approvals, and other unverified capabilities.

`agents-api-contract.d.ts` is the frozen seam. Existing `drt03-agents-api-protocol.test.mjs` and its synthetic native fixture cover protocol/binding creation, event mapping, cancellation, recovery and settlement. These are offline protocol tests, not Host or live-service acceptance.

P03-B now injects a Pi-specific port into `RuntimeService`, but the Pi port shape is not yet the Agents adapter shape. Pi exposes `openSession({sessionId, workspaceDir, nativeRef}) → {nativeRef, historyIsEmpty, start, steer}`, `compact`, and explicit unsupported `recover`/`submitToolResult`. Agents exposes native Session creation/input/cancel/tool-result, stream/reconcile/settle, and no local journal or compaction. A generic “runtime-neutral” rewrite would erase these real differences and would make Pi's journal assumptions look valid for a remote Session.

## Smallest owner file map

- New thin `app/runtime/openai-agents-runtime.mjs` (or equivalent named by the owner): adapts the existing `createAgentsApiRuntimeAdapter` to a Host-facing runtime port without duplicating normalization, dedup or settlement.
- `app/server/service.mjs`: one bounded consumer path for required actions and native observations, reusing existing `governTools`/repository readers and Host settlement. Keep Pi-specific compaction and journal code behind the Pi port; Agents reports `compact` unavailable.
- `app/server/runtime.mjs`: composition-time injection of the synthetic Agents transport/port only in an explicit test harness or opt-in fixture; default production runtime remains Pi until live capability verification.
- `app/server/store.mjs` plus migration tests: required for a persisted remote binding, as described below. Do not touch WebUI in this slice.
- Focused tests under `app/tests/`: production service + synthetic transport for read-only required action, deny/out-of-scope zero execution, result receipt before tool-result send, final settlement, same-session continuation, duplicate event, cancellation/unknown, and transport reply loss.

No new Work Core, permission registry, tool implementation, frontend reader, or second model loop belongs in this slice.

## Persistence/schema answer

**Yes, real Host integration needs a schema change or an explicitly approved binding union.** Current RuntimeStore `validateHostSession` accepts exactly `{id, path}` (`app/server/store.mjs:200-205`) and many existing readers dereference `hostSession.path`/`.id` for Pi journals and compaction. An Agents binding is a remote locator plus CW identity/configuration lineage, not a filesystem path. Reusing `{id,path}` or smuggling a remote ID into `path` would corrupt the Pi contract and make restart routing ambiguous.

The plan already calls for persisted adapter ID/version, config hash, execution lineage, native locator, pending/recovery state and receipt references. The minimal C proposal should add an explicit runtime binding record (or versioned union) with `adapterId`, native session/turn identity, configuration binding, and recovery/unknown markers, while preserving old Pi `{id,path}` bytes and migration backups. Core schema 4 and bridge schema 5 stay unchanged. If the owner cannot make that narrow migration, stop at the injected adapter/Host harness and do not claim C.

## Current capability gaps that C must close

- No transport implementation or SDK import exists; the adapter only receives an injected transport.
- No service wiring consumes `AgentsApiObservation` or `runtime.function_call.pending`.
- No gateway validates native session/turn/call identity against a CW Run and maps the call to existing governed tools.
- No durable intent/effect receipt is persisted before `submitToolResult`; existing `repositoryWriteEffects` is for repository writes and cannot be repurposed for every remote function call.
- No native binding/recovery record is persisted or reopened after Host restart.
- Current service assumes local Pi history/compaction and `{id,path}` host sessions.
- `createSession` records the adapter-local command only after the transport returns; a lost create ACK can create a second remote Session on retry. This is explicitly deferred to D and must remain unknown/blocked rather than auto-retried.
- `observe` and `reconcile` can open overlapping streams on one adapter state; D must own the one-pump/recovery rule.
- `reconcile` returns `pendingActions` but does not seed the settlement tracker; Host must treat them as unresolved effects or the adapter must be extended in D.
- `exposureOf` intentionally keeps all capabilities unavailable until a live verification; synthetic transport tests must not promote rows to `available`.

## Acceptance counterexamples for this bounded C slice

- required action for an unknown function, wrong native session, wrong root turn, or out-of-scope path: bounded refusal, zero source execution, no tool result sent;
- duplicate event ID and duplicate `required_actions`: one Host call/receipt;
- result persistence fails before native result submission: no native result is sent and Run is blocked/recoverable;
- native result ACK is lost after the local receipt: retry sends the saved result only, never reruns the read;
- terminal event plus pending call/effect: Host remains `unknown` until the effect is reconciled;
- native `turn.completed` with no final text: completed status without invented answer text;
- cancel request followed by delayed `turn.cancelled` or delayed events: intent is not confirmation; late events cannot mutate a closed Run;
- Host restart after a native Session ID is known: binding is reopened/queried by adapter-specific recovery, with no new Session creation;
- same CW command retry after a lost create response: no blind second create and no false success;
- Pi sessions/journals and all existing Host schema 18 fixtures retain byte-compatible meaning.

## Risks of a fake runtime-neutral refactor

A broad interface that forces Agents into Pi's `openSession/historyIsEmpty/compact` shape would imply a local journal for a remote Session, conflate native event IDs with Host event sequence, turn stream closure into cancellation, and hide required-action/effect uncertainty. A generic “runtime” registry would also risk advertising fixture-tested capabilities as live and bypassing existing `governTools`. Keep the adapter-specific native lifecycle and use a thin Host boundary only where the Host needs common facts: identity, observations, cancellation intent, settlement recommendation and explicit unsupported operations.

## Scope boundary

No live transport, credentials, UI selector, `/compact` advertisement, hosted/self-hosted environment, file write, Work Core acceptance, cross-runtime handoff, or full recovery implementation should be included in this offline order. Those belong to the user-authorized probe and later D/E/F slices.
