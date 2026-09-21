# P03-C Host remote-binding preflight

Date: 2026-09-21
Source: Courtwork main at 77e87ac1d01af5ea3ff4e98acb62d02d7cf7fc2c
Scope: source-only review of the queued P03-C Host consumer after accepted transport 32f4f8b and Pi Runtime Port. No provider, credential, server, port, test, or product invocation was performed.

## Boundary and existing owners

engineering/current.md:17-19,24-34 and engineering/execution/claude-frontend-harness-2026-09-16/p03c-agents-transport-20260921.md:16-20,64-66 are aligned: transport is accepted, but Host selection, durable remote binding/receipts, and live Agents access are still absent. The next increment is one governed read round trip; D/E retain uncertain submission and restart recovery.

The Store's existing hostSession is deliberately Pi-shaped: app/server/store.mjs:200-204 validates exactly {id,path}, and the same field is validated on Session and Run at :432-495. Pi owns that shape in app/runtime/pi-runtime-port.mjs:52-79; its recover and submitToolResult are explicitly unsupported at :31-38,92-93. A remote locator must therefore be a separate versioned field. Do not widen hostSession into a union or put a remote ID in path.

Run admission is already the Host/Store seam: app/server/service.mjs:2480-2558 obtains the command receipt, checks capability/configuration, and calls serialized store.createRun; app/server/store.mjs:1499-1541 atomically checks command/lineage/repository revisions and writes the Run plus initial events. The current local lifecycle then opens the injected port and persists the Pi locator at service.mjs:2633-2638. This ordering is reusable, but remote creation must add a durable attempt fence before calling the remote create operation.

app/runtime/agents-api-adapter.mjs already owns native event normalization, event-id deduplication, settlement recommendations, and saved-item reconciliation (createEventLedger, createSettlementTracker, mergeRecoveredItems, createAgentsApiRuntimeAdapter). Its adapter state (states and commands) is process memory; createSession returns a binding containing native session/environment references, while submitInput, cancelTurn, submitToolResult, observe, and reconcile forward through that in-memory state. It is not a durable Host binding or a second model loop. app/runtime/openai-agents-transport.mjs:24-29,141-224 is transport-only and has the same boundary.

Repository governance can be reused. app/runtime/repository-tools.mjs:67-129 checks the admitted binding before and after runRepositoryFs, decodes the returned bytes/hash, verifies the root again, and calls the injected recordRead. app/server/service.mjs:2802-2826 supplies these tools through governTools; app/runtime/repository-fs.mjs:31-108 runs one fixed helper with bounded cancellation/timeout. store.recordRepositoryRead (app/server/store.mjs:1303-1337) durably records the binding/revision, operation, path, digest, and source manifests, but not the exact tool-result payload. That is adequate local read evidence, not enough to reconstruct a remote function result after a lost submission.

Startup already fences active work: app/server/service.mjs:335-352 marks in-flight Runs unknown and closes admission; app/server/store.mjs:803-863 performs schema upgrades/backups and fences prepared repository writes as unknown. The remote C slice must join this recovery rule and must never invoke repo_read again merely because a receipt is unknown.

## Smallest candidate persistence shape

This is a migration proposal for Astra/Store-owner review, not an implementation decision.

1. Add a nullable remote binding beside (not inside) hostSession, on the CW Session, with a Run snapshot. The minimum durable locator/config identity is:

    adapterId, protocolRevision, nativeSessionId, nativeEnvironmentId (only when returned/needed), connectionId (provider-plane identity, never a key), configurationVersion, credentialGeneration, status active or unknown, revision.

The adapter/protocol identity and connection/config generation prevent a recovered process from silently using a different route. Do not persist API keys. remoteUrl is optional and should be derived from the Host connection where possible. The Run snapshot must also carry the admitted remote binding revision.

2. Add a bounded per-Run remote action receipt (or an equivalently owned Store collection). Existing operations is schema-18 compaction-only (app/server/store.mjs:1460-1495), so silently reusing it would blur its exact contract. Existing repository-write receipts (store.mjs:344-390,1149-1237) are the closest shape and recovery precedent.

Minimum receipt facts:

    id, sessionId, runId, kind (create_session, input, repo_read_result), requestId (nullable for create), requestHash, nativeSessionId, nativeTurnId, nativeCallId, bindingId, bindingRevision, toolName, toolArgsHash, resultRef, resultSha256, resultBytes, status, delivery, createdAt, sentAt, settledAt, failure.

resultRef must resolve to a durable bounded copy of the exact serialized tool result (Store-retained payload or an explicitly owned artifact-history entry). A digest/source manifest alone cannot rebuild the bytes sent to submitToolResult. The receipt must be immutable by requestId/request hash; a conflicting reuse is an idempotency error.

Suggested safe state transitions:

    create_session: prepared -> bound
                    prepared -> unknown
    repo_read:      prepared -> sent/awaiting_native -> confirmed
                  prepared -> failed (local rejection or transport rejected)
                  prepared/sent -> unknown (unresolved delivery or restart)

prepared for repo_read is written only after the governed read has returned and its exact result has been persisted, immediately before sending it. sent/awaiting_native is not a claim that the remote turn completed. confirmed requires a native observation contract owned by the Agents adapter/Host. Any unresolved mutation remains unknown; no automatic re-read, function rerun, or automatic resubmission is allowed. A lost create_session response is unknown because the transport has no creation request identity, no correlation lookup, and no session-list operation. It must remain fenced until an explicit reconciliation path is defined.

All new fields must use RuntimeStore's strict validateState/_mutate path and a new migration with the existing exact-backup rule (store.mjs:803-842); do not mutate schema 18 in place without the Store owner's migration entry.

## What can be frozen now

- Keep Pi {id,path} and Pi journal/history ownership unchanged.
- Host owns CW Session/Run identity, admission, provider connection/configuration identity, binding revisions, permission/governed-tool dispatch, receipt persistence, and final Run status. The Agents adapter remains the native normalization/reconciliation owner.
- Persist a local create-attempt before remote create; on uncertain create, fence as unknown and do not create a replacement.
- For one allowed repo_read, use the existing governed repository tool closure and its binding/revision checks; persist the exact bounded result before calling submitToolResult.
- Treat sendEvents delivery as transport evidence only. The transport's documented identities are create: none, message: Idempotency-Key, and undocumented tool-result/cancel guarantees (openai-agents-transport.mjs:24-29). Do not infer exactly-once from an HTTP ACK.
- On restart, mark in-flight remote action receipts and Runs unknown, close admission, and perform no effect-producing recovery. Keep D/E for explicit reconciliation/continuation.

## Questions that require an owner decision before implementation

1. Does the remote binding live on Session plus Run snapshot as above, or in a dedicated Host binding record; what exact schema/migration/retention owner accepts it?
2. How is a remote tool declared and admitted? The current Agents adapter handles required-action normalization and result submission, but the visible createSession input is model/agent/environment/input; the first consumer must define the exact repo_read tool declaration, argument validation, and mapping to createRepositoryTools.
3. Which native event is sufficient to transition repo_read_result from sent/awaiting_native to confirmed, and how is nativeTurnId captured and bound to the CW Run?
4. What explicit operator/reconcile action can resolve a lost create when the API exposes neither create correlation nor session listing? Until answered, unknown create is a permanent fence for automatic continuation.
5. After process restart, may a known active remote binding be observed/reconciled before a new Run, or is continuation blocked until a separately authored D recovery contract? The current Pi port cannot answer this (recover unsupported).
6. Which durable owner retains result bytes and enforces per-Run/payload limits? recordRepositoryRead currently stores only digest/source evidence.

## Bounded first-vertical fixture

Use synthetic transport/adapter fixtures only: admit one Run with an active repository binding; create a remote binding successfully; receive one valid native repo_read required action; dispatch exactly one allowed relative path through the existing governed reader; persist its exact serialized result; submit once with a caller-owned request key; observe native progress/terminal evidence; and assert the Store contains the binding, call identity, result reference/digest, and final evidence. Add denied/out-of-scope and lost-create/lost-submit cases that end in a durable fence without a second filesystem read or remote submission. This is a source contract/fixture target, not an acceptance claim.

No tests or live calls were run in this preflight.
