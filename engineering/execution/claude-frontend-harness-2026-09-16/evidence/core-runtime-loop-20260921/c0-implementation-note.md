# P03-C · implementation note (C0)

2026-09-21 · Claude/Fable, author. Within [the minimum Host contract](../../p03c-host-consumer-contract-20260921.md); consumes [the traceable index](../core-loop-index-20260921/luna-index.md) and the [preflight disposition](../p03c-host-preflight-20260921/README.md). This fixes names, the transition table, the migration and the native evidence chosen. It is not another architecture document and claims no live Agents API fact.

Writer note: the dispatched background session `1e0858d6` never started model work (CLI not logged in). The user pasted the same dispatch into an authenticated desktop session, which stopped the blocked session and is the single writer of `codex/core-runtime-loop-20260921`.

## Responsibility, owner, precedent

| Change | Owner | Nearest precedent |
|---|---|---|
| Schema 19 records, validators, atomic transitions | RuntimeStore; rules in new `app/server/remote-action-state.mjs` | `async-task-state.mjs` (validator module), `repositoryWriteEffects` (bounded Session-owned receipts, request-hash equality, 512 / 64 MiB budgets, restart fence) |
| Retained result bytes | existing `ArtifactHistory`, bound by digest + length from the claim | repository write payload (`#writeRepositoryCandidateUnderGate`) and `runtime.mcp.result` |
| One remote Run's ordering | new `app/runtime/agents-host-gateway.mjs` (the thin Host adapter/gateway) | `pi-runtime-port.mjs`: same `openSession().start() → {abort, run, getUsage, steer}` shape |
| Function declaration forwarding | accepted transport, narrow allowlist | — |
| Re-opening adapter state for a bound native session | accepted adapter, `attachSession` (local only) | `createSession` state construction |
| Explicit runtime injection | `createRuntime({ runtimePort })`, default `createPiRuntimePort` | the single existing `runtimePort:` seam |

Cross-layer hunks, each isolated: `app/server/index.mjs` threads the optional `runtimePort` factory from `startServer` to `createRuntime` (one parameter, no route); `app/tests/helpers.mjs` `boot()` accepts it so the consumer is tested through the real HTTP routes. No `app/web/**`, 06d, Settings, provider, Work Core or bridge file is touched. Pi internals are unchanged.

## Strict types (schema 19)

`Session.remoteBinding: null | { runtimeId:"agents-api", bindingId, revision≥1, nativeSessionId, environment:"none", nativeEnvironmentId:null|id, protocol:{betaHeader,docsRevision,sdk}, connection, origin:{sessionId,runId}, createdAt }`

`Run.remoteBinding: null | { bindingId, bindingRevision, nativeSessionId:null|id, connection, scope, rootTurn:null|{turnId, attribution:"turn.created", eventId, associatedAt} }`

`connection = { connectionId, configHash, configVersion, credentialGeneration }` — `configHash` is SHA-256 over `[provider, api, model, baseUrl, reasoningEffort]`; reuse requires equal `connectionId`, `configHash` and `credentialGeneration`. `scope = { repositoryBindingId, repositoryBindingRevision, repositoryCandidateId, repositoryCandidateRevision }` (each pair null together).

`Session.remoteActions: Action[]` (≤ 512), tagged by `kind`:

- intent, `kind ∈ create|input|tool_result|cancel`: `{ id, kind, runId, requestId, requestHash, native:{sessionId,turnId,callId}, phase, error:null|{code,message≤4 KiB}, resolution, createdAt, settledAt }`. `id = sha256([kind, runId, turnId, callId])`; for every kind but `create` it is also the caller-owned wire key. `create` has `requestId:null` — the pinned SDK has no creation identity, and the local id is never presented as one.
- claim, `kind:"call"`: `{ id = sha256(["call", nativeSession, turn, call]), runId, native, tool, argumentsJson≤16 KiB|null, argumentsSha256, scope, execution, result:null|{success,sha256,bytes≤4 MiB}, delivery:{intentId,state}, resolution, createdAt, executedAt }`.
- `resolution: null | { evidence:"root_terminal"|"native_item", nativeRef, resolvedAt }` exists only on an `unknown` record. The unknown receipt is never rewritten; evidence observed later is appended beside it. C never writes one — the field is part of schema 19 so that D's observation recovery needs no further migration.

A Pi locator and a remote record never coexist on one Session or Run (validated); `publicSession` omits `remoteActions`, which is read through `listRemoteActions` / `hasUnresolvedRemoteAction`.

## Transitions

| Record | From → to | When | Guard |
|---|---|---|---|
| intent | — → `pending` | before the request leaves the Host | same id + same hash → the receipt (`idempotent`, never re-sent); different hash → `REMOTE_INTENT_CONFLICT` |
| intent | `pending` → `accepted` | HTTP success (create: in the same write that binds the Session and the Run) | settled receipts are immutable |
| intent | `pending` → `rejected` | refused locally or answered 4xx (`delivery` `not_sent`/`rejected`) | — |
| intent | `pending` → `unknown` | `delivery:"unresolved"`, or Host restart | never resolved by guessing |
| claim.execution | — → `claimed` | before validation or execution | one claim per native tuple; repeat with equal tool+hash → the receipt, no execution, no send; unequal → `REMOTE_CALL_CONFLICT`; reserves 2 action slots and 4 MiB of the 64 MiB budget; ≤ 32 per Run |
| claim.execution | `claimed` → `succeeded`/`failed`/`rejected` | after the exact bytes are in ArtifactHistory | `result.success ⇔ succeeded` |
| claim.execution | `claimed` → `unknown` | Host restart with no retained result | never re-run |
| claim.delivery | `none` → `pending` | result retained; one write creates the `tool_result` intent | a second begin returns the receipt |
| claim.delivery | follows its intent | same write as the intent | — |
| Run.rootTurn | null → `{turnId,…}` | first root `turn.created` (no `subagent_id`) not owned by another Run of the Session | never inferred from a required action, a child turn or idle |

Unresolved = intent `pending`, execution `claimed`, delivery `pending`, or any `unknown` of those without a `resolution`. An unresolved action refuses the Session's next remote Run (`remote_unreconciled`) and makes this Run's settlement `unknown`. `rejected` = the gateway refused before invoking a tool (wrong turn, no root turn, unadvertised name, invalid arguments, Run stopping); `failed` = the governed tool ran and threw (policy denial, user denial, revoked binding, reader errors). Both are retained and delivered as `success:false` on the same path.

## Migration 18 → 19

Inline in `RuntimeStore.open()`, as every earlier step: validate the legacy shape, build the upgraded state (`remoteBinding:null`, `remoteActions:[]`, `run.remoteBinding:null`), validate it as 19, write the exact original bytes to `runtime-state.schema18.<sha256>.json` with `wx`, then replace atomically. Historical fixtures are not rewritten. The restart fence runs after the existing write/check fences.

## Native evidence chosen, and what stays unknown

- Declaration shape `{type:"function",name,description,parameters}` and `agent.tools` — pinned SDK types (`AgentToolConfigParamFunction`, `SessionCreateParams.agent.tools`); the serialized request is asserted in the service-path test.
- Required action fields `arguments: unknown`, `call_id`, `name`, `turn_id` — pinned SDK type. `arguments` is accepted as an object or a JSON string; anything else is an invalid-arguments rejection.
- Root identity: `agent.session.turn.created` whose `turn.subagent_id` is null. Whether the service emits it before the first required action, and whether a new stream replays earlier events, are **unknown**; the loopback fixture chooses, and the gateway is written to be correct under replay (event-id dedup in process; across restarts, claims, root-turn ownership and turn-scoped text/terminal filtering).
- Settlement reuses the adapter's `createSettlementTracker`, fed only what is attributable to this Run's root turn. HTTP 202 is `accepted` delivery and nothing more. No per-result consumption acknowledgement is invented.
- Limits: 32 calls/Run, 512 actions/Session, 4 MiB/result, 64 MiB retained/Session, 16 KiB arguments, 4 KiB errors; the reader's 512 KiB cap is untouched.

## Known limitations of C (by contract)

Cancel stops observing locally and settles `unknown` (`remote_cancellation_unconfirmed`); confirmed cancellation is D. A lost creation or submission leaves the Session fenced until D's observation recovery. Instructions and the tool declaration are fixed at session creation. Usage is recorded as missing. Extension-bound chats are refused on the remote runtime.
