# Work Core v1 / frontend seam

Construction baseline: `43e3dc058b77cb38d295b261b977469accc18478`. This document freezes the backend semantics for Fable; implementation/independent evidence is recorded in `evidence/harness-core-20260908/`. No frontend completion is implied.

## Ownership and compatibility

`app/core/core.py` owns transactional Matter/Candidate/Decision/Artifact state (B0 SQLite state + audit). `bridge.py` owns the private typed transport and Run admission. `client.mjs` is the sole worker client implementation. The host owns one client; extension lifecycle does not close it. The old evidence-memo client path only re-exports it. Existing data stays at `extensions/evidence-memo/state.db` under the private runtime data directory; the name is a compatibility coordinate, not a second domain owner.

Core user schema remains 1; bridge application schema becomes 2. Before upgrading application schema 1, SQLite backup writes `state.db.pre-core-v2.bak`; transactional DDL adds history membership and durable project ownership. Failed migration rolls back. Old bridge refuses application schema 2. Restore the backup into an independent data directory with the old host; do not let an old runtime open upgraded data. Migration backfills only known current source memberships: previously deleted historical memberships cannot be invented.

Generic envelope fields: `schemaVersion:1`, `contractVersion`, `matter` (id/version/source_version/contract_version/active_artifact/obligations), `candidates`, `artifact`, `sources`, `decisions`, `runs`, `stateVersion`, `humanActions`, `readOnly`, `compatibility`. A candidate is immutable and may carry versioned `domain` payload, `supersedes`, and host-derived human revision `provenance`. Core interprets identity/version/evidence/authority, while the domain adapter interprets rules. Run records freeze public provider identity/executionMode; old simulation records retain their original descriptors.

## Queries

All HTTP routes below have `/api/v5` prefix and use existing local host authentication.

- `GET /sessions/:id/surface`: `{extension,projection}`. Inline/detail consume the same packet and version. If the producer is absent, extension is null and Core history remains available with `readOnly:true`, no humanActions. Unloaded/invalidated producer also exposes no legal mutations. Unsupported contract versions are read-only.
- `GET /sessions/:id/work-query?kind=request&requestId=...`: `{schemaVersion:1,result}`; null means no committed receipt. A receipt from another Matter is rejected.
- `GET /sessions/:id/work-query?kind=source&candidateId=...&sourceId=...&version=1`: historical source bytes from the candidate's frozen source-set revision. Both candidate and source membership are checked against the Session's Matter. This remains available without a producer.
- `DELETE /sessions/:id`: logical deletion of execution catalog records after preserving work ownership; Core work survives. Workspace/journal bytes remain private on disk. This is not secure erasure.
- `GET /projects/:id/work`: durable project-owned Matter identities and extension IDs for continuation. No automatic Matter is created for plain Chat.

## Binding and actions

`POST /sessions/:id/extension` keeps `{extensionId,input}`. New evidence-memo input remains `{title,sourceText}`. Existing work uses `{existingMatterId}`; backend checks durable project + extension ownership. Optional `fromSessionId` supports explicit legacy binding migration, with same-project and exact Matter/extension checks. Bare unowned IDs fail. `{detach:true}` releases the current execution binding after preserving project ownership; formal work survives and plain Chat resumes.

`POST /sessions/:id/actions` keeps `{extensionId,generation,action,payload}`. Actor is host-owned; any actor field is rejected. Mutations require loaded producer, current generation, and no active Run.

| Action | Payload / effect |
|---|---|
| `decide` | `{request_id,candidate_id,base_version,action:'accept'|'reject'|'request_evidence',reason}`. Request ID binds full content. Accept alone atomically creates Artifact, advances version, updates obligations, and appends Decision/audit/receipt. |
| `revise_candidate` | `{candidate_id,new_candidate_id,base_version,proposal:{artifact_text,evidence,obligations}}`. Saves a new candidate, points to parent, preserves old bytes/decisions. Reusing new_candidate_id with changed content is rejected. NDA adds a verified domain payload to proposal. |
| `replace_sources` | `{sources:[{id,version,text,digest}],revision}`. Revision must increase; source id/version bytes are immutable. Old candidates remain readable but stale for subsequent decisions. |
| `save_draft` | `{text}`; draft has no formal effect. |

Legacy action queries `query_request` and `read_source_history` are retained for adapter consumers; frontend should use the GET routes, which work without producer activation.

`humanActions` advertises decisions only for pending candidates whose base/contract/source still match current Matter. Clients never infer authority from Run completed, tool permission, or a visible button; server revalidates. Domain completion may further restrict accept. Refresh surface after mutation or a conflict; retry decisions with the original request ID and content after losing the acknowledgement.

## Errors and fixtures

Core errors are HTTP 409 with `{error:{code,message}}`; host errors keep existing status/code. Important codes: `VERSION_CONFLICT`, `STALE_INPUT`, `IDEMPOTENCY_CONFLICT`, `BINDING_MISMATCH`, `CANDIDATE_CLOSED`, `EVIDENCE_INVALID`, `OBLIGATION_OPEN`, `OBLIGATION_INVALID`, `CONTRACT_UNSUPPORTED`, `SCHEMA_INVALID`, `SCHEMA_NEWER`, `DB_IN_USE`, `CONTEXT_BUDGET`. Host admission includes `generation_mismatch`, `active_run`, `binding_mismatch`, `binding_exists`, `unknown_field`.

Executable synthetic fixtures: `app/tests/work-core.test.mjs` (Core independent of runtime/provider/UI), `work-continuity.test.mjs` (actual service/Pi loopback), and `fixtures/work-core/crash.py` (real SIGKILL around commit). Source anchors use Unicode code-point offsets and UTF-8 SHA-256; no personal data or paid provider is used.

## Validation boundaries and frozen delivery

Code baseline `133269184468f1adf3b38acfc59091818daeb8e8`. Generic pending proposals may retain unverified evidence for review; only accept validates evidence and confers formal effect. Reject/request_evidence do not certify that evidence. The NDA adapter verifies domain evidence before saving any proposal. Terminal Core Run fields are immutable except exact replay; candidate references must belong to that Run and Matter. Missing or partial existing application schema metadata fails closed.

The host requests globally serialized admission atomically in RuntimeStore; standalone Store callers retain per-Session admission semantics. Work Context freezes selected/omitted inputs and host runtime profile provenance in the Core Run. See [NDA seam](nda.md) and [frozen packets](../../app/tests/fixtures/work-core/nda-packets.json) for pending, accepted and producer-unloaded examples.

A failed extension settlement keeps host status `unknown` with `extension_finish_failed`. The work adapter queries durable Core state: an existing terminal result is preserved; an active orphan is closed `unknown` before a new command proceeds. No finisher/tool effect is replayed. If reconciliation itself fails, a separate `extension_reconcile_failed` event records the need for recovery; host restart remains the recovery path when Core is unavailable. Partial tool events use `tool.update`, with only `tool.result` terminal.
