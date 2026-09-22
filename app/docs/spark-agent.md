# Spark · independent Explore Agent

Implementation contract, 2026-09-13. Implements the internal-source slice of the [Astra design](../../engineering/research/spark-explore-2026-09-13/design.md) and [workspace substrate ruling](../../engineering/research/architecture-node-2026-09-13/workspace-substrate.md). This is an in-process, single-user Host identity and capability boundary. No extra service, OS identity, provider, network tool, parallel lane, or Core acceptance owner is introduced.

## Ownership and persisted identity

RuntimeStore schema15 adds `subagents: {agents, assignments, mounts}` under the existing single writer. The preset has stable `agentId: spark`, manager `local-user`, and immutable `builtin:explore` definition revision1. Enabling/disabling changes its lifecycle; it does not delete assignments or retained findings. An assignment binds an immutable brief revision, original Session/scope, exact source references, actual human/runtime origin, provider configuration version, definition, budgets, attempts, findings history, intermediate-note references and consumption receipts. Ordinary unassigned Chat remains unassigned; no null-project grouping grants access.

Each attempt receives a new Session and workspace. `bindSubagentRun` atomically checks the assigned attempt, actual Run command and parent scope before binding the Run. Child Sessions are omitted from ordinary Recent and Home Continue; their Runs remain recorded for usage and actual pending/error inspection. The child receives its brief and source-reference metadata, with only `spark_source` and `spark_note`. Parent conversation history, shared memory, other task notes, context packages, workspace mutation, Core actions, MCP, shell, network and recursive delegation are absent from its tool/context surface.

Findings and notes are immutable content-addressed bytes in existing ArtifactHistory. Assignment state contains references, never a second copy of their text. Exact material references belong to Intake; exact artifact versions belong to the original Run/ArtifactHistory. No original file is overwritten by a note, finding, mount or consumption receipt.

## Source discovery and progressive consumption

The parent has seven tools:

| Tool | Scope and effect |
|---|---|
| `spark_sources` | Paginated permitted source-version metadata from this Session's retained Intake catalog and content-version artifacts; 20 per page. Explicit coverage excludes unretained files and versions over 64 KiB. |
| `spark_explore` | Creates an idempotent bounded assignment, then ends the parent Run at a tool boundary so the child can acquire the single execution lane. |
| `spark_directory` | Lists only own assignments or explicitly mounted references, with counts, exact result references and source freshness. |
| `spark_findings` | Expands an exact result revision to a bounded 2,000-character synopsis and source/note index. |
| `spark_read` | Expands an immutable finding or intermediate note. |
| `spark_read_source` | Expands an exact assigned source and records the actual consumer Run and digest. |
| `spark_consume` | Records read/adopt/reject/defer against a result revision; adoption requires this Run to have expanded every assigned source. This is a machine consumption statement, not formal human Review. |

The default parent context states only the number of discoverable manifests and the available lookup path. It does not load their bodies. Indexed/existing, read and adopted are separate facts. Source content and derived text remain untrusted data. A model cannot manufacture the actual reader/consumer identity, source digest, assignment origin or an independent acceptance claim.

Retained source freshness is explicitly `current-retained-version` or `historical-version`; workspace artifact freshness is `workspace-freshness-unchecked`. A retained latest version does not claim that an external original has not changed. A new Intake revision leaves old references intact. Missing sources, changed hashes or denied policies fail closed; they are never silently replaced by current same-name files.

Project membership alone does not disclose another task. Explicit project/session mounts grant discovery through references; original ownership remains unchanged. Both source Session and consuming Session policies are checked. Current source policy is checked again on expansion and before each child provider request. Host configuration changes are normally frozen during a Run; the latter check also fences a lower-owner revocation race. Revocation prevents future disclosure, without claiming to recall bytes already sent to a provider.

## Dispatch, settlement and recovery

Assignments are queued, active, blocked, resolved or cancelled. A completed Run alone does not resolve an assignment: retained, bounded findings and actual reads of all assigned source versions are required. Partial findings remain readable with explicit coverage and a blocked assignment. The content's interpretation remains model-reported.

The dispatcher respects RuntimeStore's existing single-active-Run gate. A runtime delegation persists its assignment, closes further parent tool admission, releases the parent lane, then dispatches the child. It never waits inside the occupied parent lane and never automatically resumes the parent. The user/main Agent starts a new parent Run explicitly to consume results. Admission failure settles the failed queue item before checking later items.

Limits are 16 sources, 64 KiB per source, 32 KiB per final finding/note, 32 retained notes, 8 attempts, 8 turns/60 seconds at most per assignment, and 32 tool calls. Root remaining time/turns constrain the initial assignment. Retry subtracts completed attempt execution time, turns and recorded tool starts; it does not create a fresh total budget. Each attempt uses the bound provider configuration; changed routes block dispatch rather than silently selecting a new recipient. Current model selection is reused; no separate faster-model claim is made.

Cancellation records requested state before stopping the Run. A prepared/cancelled/old attempt cannot publish notes or bind a new Run. Repeated commands return their saved outcome; changed payloads conflict, and stale revisions do not mutate state. Late settlement does not overwrite a later result. Failed findings retention leaves a blocked task and explicit reason, preserving the Run outcome.

Restart never replays queued or active assignments. They become blocked; an interrupted Run retains `unknown`. Explicit read-only reconciliation is required before retrying an unknown attempt. A known finished Run whose result publication was interrupted remains a known Run outcome with a blocked assignment. Archive is non-destructive and only allowed after execution settles; immutable findings remain discoverable by permitted consumers.

Session deletion refuses while Spark still references that Session or its Runs as a parent, child attempt, source, retained result/note, reader/consumer or mount target. The check also applies to archived/completed work and runs atomically in Store; deleting a Chat cannot discard recovery authority or cascade away historical references. Unreferenced Chats retain their ordinary deletion behavior.

## Local control API

All endpoints inherit the existing local Host token boundary.

| Endpoint | Purpose |
|---|---|
| `GET/POST /api/v5/subagents` | List Agent/assignments or create a human-origin assignment with caller-chosen idempotency identity. |
| `PUT /api/v5/subagents/agent` | Set `status: active|disabled`; disabling closes admission and requests active cancellation. |
| `GET /api/v5/subagents/source-directory?sessionId=…&offset=…` | Same bounded source reference catalog as the Agent tool. |
| `GET /api/v5/subagents/:id/result?revision=…` | Exact result, sources, freshness and immutable note references. |
| `GET /api/v5/subagents/:id/sources/:index` | Human source expansion receipt. |
| `GET /api/v5/subagents/:id/notes/:noteId` | Immutable intermediate note. |
| `POST /api/v5/subagents/:id/actions` | Cancel, reconcile, retry or archive using `expectedRevision` and `commandId`; legacy human consumption is supported but not the primary UI workflow. |
| `GET/POST /api/v5/subagents/mounts` | Inspect/create explicit disclosure mounts. |
| `POST /api/v5/subagents/mounts/:id/revoke` | Revoke using the current mount revision. |

Unknown/duplicate query fields, unsupported fields, forged actor attributes and malformed source indices/revisions are rejected. Source, result, note, command and mount relationships are validated, including source-read digests and result-consumption references.

## UI and migration

The Chat right-side surface rail contains the Spark card. Its independent sidebar entry opens the same Agent and assignments. Existing rail cards, narrow strip, mobile surface, dialog header/body scrolling and Escape behavior remain the nearest implemented precedents. A findings view can expand exact sources/notes, return to the original Chat and explicitly mount/revoke project access. Normal Agent consumption does not require a new human review screen. Source maintenance remains available as a separate action inside Spark. The compact rail uses actual module glyphs, with Activity for Run details; it never squeezes a text More directory into the icon strip. Unimplemented directory slots are omitted, while actual loading/error entries retain their state.

The creation form retains the same assignment and optional standalone Session identity when a response is lost, including a reload using a tab-scoped pending receipt. Action and mount retries retain their command identity until receipt. The source picker uses the same owner catalog, caps visible choices at 100 and assignments at 16; it does not infer source identities from rendered filenames.

Schema15 migration validates prior state and retains an exact schema14 backup. [The migration test](../tests/subagent-migration.test.mjs) extracts the actual pre-change Host at fixed commit `2d1ab6816e3dedcd613fee80a35bc61b2067d106`, creates a schema14 state, verifies byte-identical backup, confirms that old Host refuses schema15 without changing it, and restores the backup in an independent directory. Never run an old Host against upgraded mutable data.

[Delivery evidence](../../evidence/spark-agent-20260913/README.md) separates author tests/visual candidates, untested areas and any later independent acceptance. This slice does not claim real-provider coding dogfooding, external exploration, private-data redaction, multi-user IAM, parallel/recursive teams, S4 coding completion or G1–G5 release acceptance.


## Local Pi process consultation

An internal `createRuntime({localPiWorker:true})` injection sends Spark child Runs to the locked upstream Pi0.85.1 one-shot process. Only this Host's exact owned deterministic provider/default model binding is admitted. Normal Runs retain the in-process Pi port; no Settings selection, live credentials or automatic runtime fallback is exposed.

The child receives a hashed packet of approved source versions, with no model-reachable tools, extension/context discovery or persistent native session. This is a trusted local process with explicit private configuration, **not an OS sandbox**. Protocol completion, process close, result retention and formal acceptance are separate. RuntimeStore20 strictly owns dispatch-before-spawn, native observations and exact result references through typed Run events. ArtifactHistory holds packet/result bytes; the existing queue and Session/Run remain authoritative.

Packet inclusion is `provided`, not an actual source-read receipt. Findings remain readable and explicitly consumable, but an assignment with provided-only sources stays blocked for unverified coverage. Human adoption still requires expanding the assigned sources. An empty-source assignment retains the existing empty coverage criterion. Neither result consumption nor native completion changes formal Work acceptance.

After an interrupted local dispatch, existing reconcile/retry cannot clear unknown merely from a terminal Run, process exit or persisted PID. No PID is killed on restart; no automatic process is recreated. Retained output whose publication was interrupted remains evidence, while the assignment is blocked. A separate recovery contract would be needed to advance that state safely. See the [implementation contract and evidence](../../engineering/execution/claude-frontend-harness-2026-09-16/evidence/local-pi-worker-20260922/author-status.md).
