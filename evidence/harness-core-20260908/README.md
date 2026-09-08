# Harness Core implementation evidence · 2026-09-08

Baseline `43e3dc058b77cb38d295b261b977469accc18478`, isolated branch `codex/harness-core`. No UI/renderer, root README, site, brand or Paper edits. This is backend construction evidence, not G1–G5 product acceptance.

## Node 1

Shared `app/core` owns the existing SQLite state/audit, private bridge and client. Host lifetime owns one worker; legacy transport import is a re-export and existing data coordinate is preserved. Added immutable source history, candidate revision lineage, application-schema-2 migration/backup, durable project scope, Session attach/detach, independent historical queries and legal action projection. Model tools cannot call trusted decisions or set actor. No loop/scheduler/provider implementation was introduced.

Author verification: `node --test tests/extension.test.mjs app/tests/work-core.test.mjs app/tests/work-continuity.test.mjs app/tests/extension-run.test.mjs app/tests/extension-restart.test.mjs` — 16/16, [log](node1-tests.log). Synthetic temporary databases and port 0 loopback provider only. `npm --prefix app ci` installed the existing lockfile. No paid provider or personal credentials used.

Recovery uses real child SIGKILL at after-audit, after-artifact, before-commit, and after-commit-before-ack; reopen/retry yields one Decision/audit/Artifact. V1 migration backs up logical SQLite content (SQLite backup header counters need not be byte-identical), backfills known membership, and a malformed app schema rolls back with original database bytes unchanged. Old memberships already deleted before upgrade cannot be reconstructed.

The Core-client correlation collision discovered by the new revision probe was fixed by reserving JSONL `id`/`op` and naming the business field `new_candidate_id`. Initial test assertions treating SQLite backup headers as byte-identical were corrected to logical dump equivalence; rollback original bytes remain checked.

Independent review is in progress and has not yet accepted this node. The generic Core tests do not establish NDA or legal quality; the forthcoming domain fixture and real-provider evidence remain separate.

Frontend seam: [contract](../../docs/work-core/contract.md). Full-suite/smoke, source dispositions, Paper mapping and final independent evidence follow after subsequent nodes.
