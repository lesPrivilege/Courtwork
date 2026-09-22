# P03-C Host consumer — minimum architecture contract

2026-09-21 · Astra. Implementation authority for the first consumer in the [C/D/E author loop](core-runtime-loop-20260921.md), superseding the previous preflight's “not released” status within the scope below. Consume [the preflight disposition](evidence/p03c-host-preflight-20260921/README.md) and [traceable index](evidence/core-loop-index-20260921/README.md). Accepted transport/adapter/Pi source is reused, not rebuilt. These are CW decisions; they do not claim corresponding remote API guarantees.

## Ownership and selection

Host owns admission, CW Session/Run, credentials/configuration, repository/candidate revisions, permissions, durable commands and final status. Agents adapter owns native event/item/turn normalization and observations. RuntimeStore owns new records; Work Core and bridge schemas remain unchanged. Keep Pi `hostSession={id,path}` unchanged. Runtime injection into the production Host must be explicit and testable; default Pi behavior remains. No automatic switching based on model names, no Pi fallback for unsupported native behavior, and no live runtime/UI exposure from synthetic verification.

The first entry is the production service path with an explicitly injected Agents implementation and loopback transport fixture. No new management UI or global runtime registry is required. Account access and a live API read are separate milestones; offline completion may not be labelled full live P03-C acceptance.

## Persistence and migration

Use separate optional remote fields on Session and a frozen Run snapshot, plus a bounded Session-owned remote-action collection. Do not overload Pi's locator or the schema-18 compaction-only `operations`. Author chooses exact internal names and strict tagged-union layout in an initial schema/transition note before product edits; the required facts and constraints below are frozen. That normal implementation note does not need another user approval.

| Record | Required retained facts |
|---|---|
| Remote binding | Existing runtime ID `agents-api`; local binding identity/revision; native session ID; `environment:none`; protocol/SDK identity; existing connection reference, configuration hash/version and credential generation; originating CW Session/Run. Native environment ID only when observed and needed. No secret, guessed native ID or fake path. |
| Run binding | Exact admitted remote binding/configuration and repository/candidate scope; native root-turn ID initially absent and then associated from attributable native evidence; attribution of that association. Parent/root identity is not inferred from child activity or idle. |
| Remote command intent | Local immutable operation/request identity and canonical request hash; CW Session/Run; kind create/input/tool-result/cancel; applicable native IDs; dispatch phase; bounded error code and timestamps. A local create identity is not a remote idempotency key. |
| Native tool-call claim | Native session/turn/call tuple; CW Run; tool name and validated canonical arguments/hash; admitted scope/revisions; execution state; exact bounded result bytes/hash/length when available; separate delivery state/request key. |

Use RuntimeStore's serialized `_mutate` and strict validation. Claim uniqueness and request-hash equality atomically; concurrent duplicate pending actions cannot both execute. Conflicting reuse is rejected. Preserve immutable receipts rather than overwriting them with a later configuration.

Current RuntimeStore is 18. The first required additive migration may advance it to 19 if that remains the next version at pickup. Validate legacy input, save the exact original bytes, add null/empty remote fields, validate the result, then replace atomically through the existing migration path. Do not rewrite historical fixtures. Malformed, interrupted, unsupported-newer and repeated-open cases must be exercised. Synchronize affected version/capability entry points per verification.md; do not migrate user data or run an old Host against upgraded data.

First-slice finite limits: at most 32 native function calls per CW Run; 512 retained remote-action records per Session; 4 MiB per serialized tool result and 64 MiB aggregate retained remote payload per Session. Bound argument JSON to 16 KiB and errors to 4 KiB. These are new consumer ceilings, not claims about an upstream API. Preserve the existing stricter repository/tool limits (including the 512 KiB file reader). Reserve space before executing; do not silently evict unresolved records, omit bytes required for recovery or truncate a result while claiming its original hash. A bounded rejection uses the same retained-result path. Record constants and boundary tests; material increases return to Astra.

## C tool declaration and execution

Only `repo_read` is advertised in C. Derive its parameters from the existing owner: required relative path (1–1000 characters), optional positive integer startLine/endLine, no extra properties; preserve owner validation/permission behavior rather than implement another filesystem reader. Extend the accepted transport narrowly so its `agent.tools` function declaration is not dropped. Verify the actual serialized request with installed `openai@7.15.0`; do not upgrade it or rename request keys opportunistically. No built-in shell, deferred tool loader, MCP discovery or hosted environment.

Only attributable current required actions may request execution. A historical function item is not a pending call. Check native session/root turn/call, advertised tool, argument schema, active CW Run and current scope before dispatch. Reuse the existing governed tool closure and permission/cancellation boundary; repository checks must still occur at execution. Denied, unknown, wrong-turn or out-of-scope calls perform no filesystem read.

Order: admit CW Run → persist creation/input intent → dispatch once → retain observed native binding/root identity → atomically claim native call before execution → execute the existing governed tool once → persist the exact serialized success/error result → persist submission intent → send retained bytes once. Duplicate observations consult the same receipt; they never invoke the tool again. If execution may have happened but no result is retained, preserve unknown and do not rerun.

Keep execution and delivery states independent. HTTP success records **accepted submission**, not consumed result or completed Run. This contract does not invent a per-function consumption-ACK event. Root terminal evidence may settle the Run under the existing settlement rules when no Host effect is unresolved; retain the weaker delivery receipt as such. Stream closure, idle, output-text done, absence of a pending action, or a lookup with no record cannot alone prove completion or non-execution.

## C failures and D extension boundary

An uncertain create with no native locator remains durably unknown; do not auto-create a replacement or invent correlation/list support. A lost result response retains the call result and identity; do not re-execute or automatically resend. Recovery of a known native session is observation-only until D's concrete protocol evidence permits another action. Startup fences in-flight work unknown and expires unsafe approvals using existing owners; it performs no remote mutation or filesystem effect merely to recover.

D may add explicit observation recovery, cancellation intent/confirmation and same-session continuation under the original plan. Reuse subscribe/buffer/read/paginate/merge; reject unusable cursors, wrong root identity, incomplete history and contradictory observations. A retry policy for an individual operation needs verified operation-specific semantics; a message request key is not a blanket tool-result/create guarantee. If the service offers no decisive resolution, leave the operation unknown with a truthful supported outcome rather than manufacture liveness.

E may expose only the existing candidate-write and fixed-check tools after their exact approval/scope/revision guards are wired through the same gateway. Use current implementations and retained effects, no arbitrary shell and no second permission engine. A completed check, model answer or native turn never grants Work Core acceptance.

## Exit evidence

C: one real production-service admission, SDK/adapter loopback required action, governed repo_read, exact retained result, native root terminal and a later input on the same binding; Pi regression/migration intact. Include denied/unknown/out-of-scope, duplicate concurrent call, revoked scope, missing root identity, creation loss, interrupted execution/result persistence, submission loss and restart fences. D/E expand those same fixtures with faults and exact write/check parity. Transport-only or helper-only success cannot substitute for the service path. Live-provider and frontend/browser claims remain separate and explicit.


## Reconciliation clarification — 2026-09-22

[Independent CDE-R1 return](evidence/core-cde-review-20260922/README.md) makes the existing local/native evidence boundary explicit: root-terminal or native-item observations cannot discharge execution-unknown without a decisive matching Host-effect/result receipt. A retained result with unknown delivery is different and can retain its weaker delivery evidence beside known local execution. Never propagate a remote-only resolution through a paired intent/claim to clear a missing-result local execution fence. The approved bounds and original owners remain unchanged.
