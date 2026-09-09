# ATT-BE-01 backend delivery

Product: `de38eff022b1eea4eb705de51fe988eba3da12bd`, branch `codex/attention-backend-20260909`. Source Astra's ES integration base is `fa90763a4da1cdede47778b6487c801c0acb74cc`; the task merged that base before changing Core/service. Source Astra owns main/current/shared ledgers. This packet records a bounded backend delivery, not product G1–G5 acceptance or deployment.

## Delivered behavior

Attention is a Core-owned, project-scoped object with an independent lifecycle. Current state, audit event and idempotent receipt commit atomically with revision/CAS and integrity checks. It can reference multiple Matters and observed Session/Run identities while retaining exact Core source versions. Session deletion/replacement, Run completion and producer absence preserve formal facts and history. `app_run.matter_id` is unchanged; Attention references do not copy Matter authority into another service.

Authenticated HTTP supports creation, state-specific typed human actions, minimal registry, inspect, bounded exact/literal grep/relation queries, source/event pages and scoped receipt reconciliation. Runtime gets a host-captured adapter seam, default-denied per-object disclosure grants, and separately granted signal recording. Existence, descriptors, search predicates and counts are checked before disclosure. Signals cannot resolve, reopen, grant authority or send externally. The service does not auto-install tools, call a provider or schedule work.

The [consumer contract](../../docs/work-core/attention.md) freezes the actual wire/schema/actions, policy semantics, limits and failure modes. [Implementation decisions](../../engineering/execution/2026-09-09-attention/README.md) record Astra's ownership and migration choices. The [HTTP/Pi/Core packets](../../app/tests/fixtures/work-core/attention-packets.json) include 23 responses: initial/seen/stale/snoozed/needs_you/resolved, registry-only and full Runtime disclosure, signals, completed Run, closed adapter, cross-scope refusal, deleted-origin replay, unloaded producer, restart, exact source, audit and receipt. Regenerate using `node app/scripts/attention-fixture.mjs`; IDs/timestamps vary because these are real synthetic service calls.

## Author verification

[Machine results](results.json) bind product SHA, exact source hashes for the migration materialization, fixture hash, test totals and log digests. All final checks used the fixed product version above.

| Check | Result / scope |
|---|---|
| `cd app && npm test` | 305 pass / 0 fail / 0 skip; includes 9 Attention Core, 4 HTTP/fixture and 2 SIGKILL tests, plus existing regressions |
| `cd app && npm run smoke` | passed; public runtime service, local-fake, realProvider not_run |
| `ATTENTION_CODE_SHA=de38eff022b1eea4eb705de51fe988eba3da12bd node evidence/attention-backend-20260909/migration-probe.mjs` | passed; fixed old/ES/current Core sources, migration/restore and refusal matrix |
| `node app/scripts/attention-fixture.mjs` | actual synthetic packets generated and checked; fixture SHA/bytes in results.json |
| `git diff --check` | passed; explicit staged paths reviewed |

Core tests include correct and simultaneous CAS, exact/changed replay, explicit needs_you and resolution/reopen, unknown input/schema, source bytes/history, corrupt state/audit/receipt, scoped duplicate IDs, and registry-only disclosure. HTTP tests exercise two Matters with source/Session/Run refs, typed transitions, origin deletion plus exact replay, replacement Session, producer unload and empty-catalog restart, all query categories across scopes, actor/context spoofing, a real active Pi loopback Run, signal restrictions and late-adapter rejection. SIGKILL tests separately demonstrate zero committed effects before commit and one complete effect after commit before acknowledgement, then exact reconciliation without duplicate events.

Astra authored product code and final test execution. Luna supplied the migration and HTTP/recovery test drafts but hit a usage limit before completing review; Astra repaired and extended those drafts. Their provenance is retained, but these final author runs do **not** claim non-author acceptance. Source Astra has received the fixed product for a separate bounded review; its findings and any repair/recheck must be recorded separately before integration acceptance.

## Migration and rollback

Core3/app4 leaves RuntimeStore4 unchanged. The probe covers legitimate Core1/app1 and Core1/app2 both directly through the current host and through fixed ES Core2/app3, preserving Matter digest and Decision receipt. It opens each backup in a separate directory using the corresponding old host. Core1 and Core2 hosts reject the final database without changing its bytes.

The negative matrix checks Core/app pair mismatch, an Attention table appearing in an older schema, an existing Attention backup sentinel, and malformed/missing current Attention tables. Database/sentinel hashes remain unchanged on refusal. Missing older application metadata and malformed legacy table behavior are also retained in the existing Core tests. Migration is staged: a failure after the ES transaction may leave valid Core2/app3 plus backups; recovery must inspect that exact stage. Backups are never overwritten automatically. No user database was opened or upgraded.

## Limits and next consumer

There is no frontend implementation, scheduler, semantic search, external source fetching, external send or cross-user ACL claim. Runtime is a bounded host adapter seam, not an auto-installed model tool or arbitrary-runtime compatibility claim. Registry-only access is weaker than detail/source/event access. External source and historical execution availability remain unknown; retained source bytes do not imply current Matter applicability. Attention does not confer a Matter decision, tool permission or professional-quality acceptance.

ATT-FE consumes the stable contract/packets through the existing single-writer queue after source Astra's backend review. Main/current/ledger integration, real provider, UI and G1–G5 remain with their existing owners and gates. No push or deployment was performed by this task.
