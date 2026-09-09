# Attention backend contract v1

ATT-BE-01 extends the single WorkCoreOwner, private Core worker and existing `extensions/evidence-memo/state.db`. Its three domain tables hold current state, append-only audit events and immutable request receipts in the same SQLite transaction. RuntimeStore stores no Attention facts. Current Core4/app5 adds [Matter disclosure and governed directory reads](governance.md); Runtime7 is unchanged by that addition. A Session, Run, UI, cache, personal practice directory or missing producer cannot resolve or delete an Attention.

## Persistence and migration

The ATT-BE-01 migration described here originally targeted Core3/app4. Current startup continues through the subsequent [Core4/app5 governance migration](governance.md). Its original accepted input pairs are Core1/app1, Core1/app2, Core2/app3 and Core3/app4; other pairs fail before migration. Owned table columns, keys, foreign keys, CHECK constraints and the source membership trigger are validated. Existing app3 must have the complete final ES file schema, including verification record integrity fields. Intermediate pre-fix ES shapes are unsupported.

Core1/app1 or app2 first follows the existing ES transaction to Core2/app3 and `.pre-file-core-v2-app-v3.bak`. A second transaction installs the Attention tables and both Core3/app4 markers after an exclusive `.pre-attention-core-v3-app-v4.bak` SQLite backup. New databases need no migration backups. Existing backups, including symlinks, are refused without replacement. Current-schema missing or malformed tables are refused; startup does not repair them. If the second transaction fails after the first completed, the intermediate Core2/app3 database and its backups are the recovery boundary. Inspect the failure and backups before explicitly retrying; a backup is never overwritten automatically.

Old Core2 Store/bridge refuse Core3. Rollback means copying the appropriate backup into a **separate directory** with its matching old host. An old host must never share the upgraded runtime4 data directory. Disabling an Attention consumer does not remove its formal rows. `app_run.matter_id` remains non-null and Matter-bound. No user database was used for development verification.

## Identity and state

Identity is `(project_id, attention_id)`, with an ID up to200 characters. This permits the same supplied ID in two projects without exposing a uniqueness conflict across scopes. Within a local project, at most1000 objects,32KiB UTF-8 per object and request,16 source refs and32 relation/provenance refs are accepted. There is no cross-user ACL claim: authenticated local humans can select any existing local project. Runtime consumers are narrowed to their host-observed Session project.

Create uses revision0 and commits revision1, status `investigating`, freshness `unknown`, seen `false`. Status is `investigating|needs_you|waiting|later|resolved`. Descriptor is `{title,summary}` (title1–200 characters; summary null or1–2000). A reason is1–4000 characters. Next action is `{kind,label,trigger,due_at}`: kinds `inspect|decide|wait|follow_up|none`, triggers `manual|at|after|external`, label1–500, due_at null or timezone-qualified ISO timestamp. Trigger `at` requires due_at. A recorded due time or condition is not a scheduler.

Source refs are `{kind,matter_id,source_id,version,locator,role,digest}`. Kind `core` binds a same-project Matter, retained source membership, immutable source version and SHA-256 bytes. Kind `external` requires null matter_id/digest, stays `unknown` and is never dereferenced. Role is `supports|reports|contradicts`; locator is1–2048 characters. The reference does not copy or overwrite Matter facts. Historical source reads retain the selected version after the Matter's source set changes; missing bytes are unavailable and mismatched bytes cause integrity refusal.

Relations are `{kind,id,relation}`, where kind is `matter|session|run|external` and relation is `about|execution|origin`. Matter refs are checked inside Core against `app_work_scope`. The host checks Session/Runtime Run project ownership and captures `{kind,id,project_id,session_id,adapter_id,observed_at,availability:'observed'}` privately before attachment. If the Run also exists in Core, its Matter scope is checked there. These are historical observations, not proof of continued execution availability; `basis.execution_availability` says so. Removing a current relation preserves the audit and captured provenance. External IDs are inert strings.

Each stored state carries revision, last_event_id, updated_at and a digest. Its last event and request receipt are cross-checked on read/update. Historical receipt identities include the full original request and host context. Digests detect corruption; they are not an adversarial signature or source-of-authority substitute.

## HTTP and typed human actions

All routes have `/api/v5` prefix and use the existing host token/origin checks. Responses are the Core JSON result, without a Session surface envelope. Unknown envelope fields, including actor/context, are rejected.

| Route | Request / result |
|---|---|
| `GET /attention/registry?projectId=…` | Minimal visible registry, default first20 entries; only projectId is accepted |
| `GET /attention/:id?projectId=…` | Policy-filtered object details |
| `POST /attention/query` | `{projectId,query}`; typed queries below |
| `POST /attention` | `{projectId,request}`; only create |
| `POST /attention/:id/actions` | `{projectId,request}`; non-create human action, path matches request identity |

An action request is exactly `{schema_version:1,request_id,attention_id,expected_revision,action,payload}`. Request IDs are scoped to a project. The host sets actor `local-user`, purpose `human-attention`, execution null. The browser cannot supply trusted actor, scope context, provenance or a Runtime signal through these routes.

| Action | Payload / effect |
|---|---|
| `create` | `{descriptor,reason,next_action,source_refs,relation_refs}`; initial investigating state |
| `acknowledge` | `{}`; seen=true, status unchanged |
| `snooze` | `{reason,next_action}`; later; next action cannot be none |
| `set_waiting` | `{reason,next_action}`; waiting; next action cannot be none |
| `resume` | `{reason,status?}`; investigating or needs_you (default investigating) |
| `resolve` | `{reason}`; explicit human resolution; next action becomes none |
| `reopen` | `{reason,status?}`; only from resolved; investigating or needs_you |
| `attach_relation` | `{operation:'add'|'remove',relation}`; checked relation maintenance |
| `request_disclosure` | `{grant}`; explicit bounded Runtime disclosure/signal policy, or null to revoke |

Resolved objects require reopen before snooze/wait/resume. Seen, signals and relation/disclosure maintenance do not undo resolution. `human_actions` advertises only currently applicable names, action schema1, expected revision and strict `payload_schema`; consumers must understand the schema and still handle server refusal. A visible descriptor or button confers no authority. These actions affect Attention only, not a Matter decision, tool permission or external system.

Each successful action atomically commits one new revision, event and receipt. Same request ID + identical full content/context returns the original receipt without another event, even if revision advanced or an origin Session was deleted. Changed content conflicts. Stale expected_revision fails without a partial event. Responses contain `{schema_version,attention_id,request_id,revision,event_id,status}`; they describe that committed action, not necessarily the latest state. After losing a response, retry unchanged or use the scoped request query, then refresh inspect. A null receipt means no committed result was found; do not infer external effects.

## Disclosure and Runtime seam

`RuntimeService.attentionRuntimeAdapter(sessionId,runId)` captures actual host execution identity and returns schemaVersion1 `query(query)` / `recordSignal(request)` methods. It rechecks Session/Run identity, admission and active running/waiting_user status on every call. No public constructor route or auto-installed Pi tool is provided. The seam is ready for an explicitly scoped Runtime consumer; it is not the broader ATT-RT-01 compatibility matrix or a scheduler.

Runtime context is `{actor:'runtime',project_id,purpose:'attention-runtime',execution:{adapter_id,session_id,run_id}}`, derived by the host. Model argument actor/context fields fail. Grants default to absent. `request_disclosure` accepts null or `{adapter_id,purpose:'attention-runtime',fields,expires_at}`. Fields are a nonempty unique subset of `registry|details|sources|relations|events|signal`, including registry; expiry is a future timezone-qualified ISO timestamp. The stored grant also records issued_revision and policy version. It remains valid until expiry, replacement or revocation; every read and signal rechecks it, including replay. This is per-object/per-adapter local authority, not arbitrary model-supplied scope.

Registry access permits only minimal ID/title/status/freshness/revision/time. Details adds summary, reason, next action, seen, basis and last event. Sources and relations are separate grants. Grep needs details; relation filtering needs relations; both filters operate only on permitted fields. Event reads require events **and** details/sources/relations because event payloads may contain all those fields. Receipt reads require events. Runtime never receives the human policy editor or human action descriptors. Unauthorized existence, malformed hidden object schemas and cross-scope object reads return the same unavailable result; hidden rows never affect visible counts or continuation offsets.

Signal recording additionally requires signal permission. Its action is `record_signal`, payload exactly `{text,source_refs}`. It records an observation and marks freshness unknown; source refs in the event are not promoted to the object's accepted basis. It cannot set status, seen, reason, grants or an external authorization. Run completion, cancellation, replacement, provider/producer absence, read/notification and source instructions do not resolve Attention. The host must not expose Attention tools inside an ES file Run without applying the existing input-observer/coverage contract; this slice does not install those tools.

## Queries and recovery errors

Every query contains `schema_version:1,kind`; unsupported fields or schemas fail. Inspect returns only permitted fields. Registry/exact/grep/relation return `{items,count,offset,next_offset,truncated,disclosure}`, where counts and offsets refer to the visible matching collection. Lists remain minimal even for humans. Limit defaults20, range1–50; offset is nonnegative. Scans are bounded by the1000-object project limit. No regex, semantic retrieval or raw filesystem grep runs.

| Kind | Fields |
|---|---|
| `registry` | offset?, limit? |
| `inspect` | attention_id, expected_revision? |
| `exact` | field=`attention_id|title|status`, value, offset?, limit? |
| `grep` | text1–200; literal, case-sensitive substring of permitted title/summary/reason; offset?, limit? |
| `relation` | relation_kind, relation_id, offset?, limit? |
| `events` | attention_id, offset?, limit?; revision order, adaptive128KiB event page |
| `source` | attention_id, source_index, offset?, limit?; Unicode code-point page, limit1–4000, complete exact-byte verification before slicing |
| `request` | attention_id, request_id; `{schema_version,result:null|receipt}` |

Inspect includes revision, disclosure and basis references. Source pages identify the exact ref, retained/unknown availability and continuation; external unknown returns no text. Event reads carry revision and truncation. No missing source or incomplete page is represented as a complete negative search.

Core errors retain HTTP409 with `{error:{code,message}}`: `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `NOT_FOUND` (uniform unavailable), `DISCLOSURE_DENIED`, `CONTRACT_UNSUPPORTED`, `INVALID`, `INVALID_TRANSITION`, `ATTENTION_LIMIT`, `INTEGRITY_REFUSAL`, plus existing schema/lock errors. Malformed host envelopes retain400 errors. The adapter rejects late calls with `CANDIDATE_CLOSED`. There are no new external effects, provider dependencies, UI changes or product acceptance claims.
