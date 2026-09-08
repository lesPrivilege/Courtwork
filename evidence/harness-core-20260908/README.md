# Harness Core implementation evidence · 2026-09-08

Baseline `43e3dc058b77cb38d295b261b977469accc18478`, isolated branch `codex/harness-core`. No UI/renderer, root README, site, brand or Paper edits. This is backend construction evidence, not G1–G5 product acceptance.

## Node 1

Shared `app/core` owns the existing SQLite state/audit, private bridge and client. Host lifetime owns one worker; legacy transport import is a re-export and existing data coordinate is preserved. Added immutable source history, candidate revision lineage, application-schema-2 migration/backup, durable project scope, Session attach/detach, independent historical queries and legal action projection. Model tools cannot call trusted decisions or set actor. No loop/scheduler/provider implementation was introduced.

Author verification: `node --test tests/extension.test.mjs app/tests/work-core.test.mjs app/tests/work-continuity.test.mjs app/tests/extension-run.test.mjs app/tests/extension-restart.test.mjs` — 16/16, [log](node1-tests.log). Synthetic temporary databases and port 0 loopback provider only. `npm --prefix app ci` installed the existing lockfile. No paid provider or personal credentials used.

Recovery uses real child SIGKILL at after-audit, after-artifact, before-commit, and after-commit-before-ack; reopen/retry yields one Decision/audit/Artifact. V1 migration backs up logical SQLite content (SQLite backup header counters need not be byte-identical), backfills known membership, and a malformed app schema rolls back with original database bytes unchanged. Old memberships already deleted before upgrade cannot be reconstructed.

The Core-client correlation collision discovered by the new revision probe was fixed by reserving JSONL `id`/`op` and naming the business field `new_candidate_id`. Initial test assertions treating SQLite backup headers as byte-identical were corrected to logical dump equivalence; rollback original bytes remain checked.

Independent evidence is recorded below; the generic Core tests do not establish NDA or legal quality.

## Nodes 2 and 3 / frozen backend delivery

Code SHA `133269184468f1adf3b38acfc59091818daeb8e8`. Pure NDA schema/rules/verifier consumes the shared generic owner through `inbound-nda`; production domain imports no evaluation fixtures. Four synthetic rules, four development and two holdout cases have fixed hashes. Actual Pi loop → tool → Candidate → human Decision → Artifact → new Session is exercised over isolated loopback HTTP. Missing/conflicting/unknown findings cannot be accepted as complete. Domain facts/playbook and work Context with host profile provenance are frozen per work/Run.

Source replacement retains candidate-bound historical bytes; old candidates remain readable but fail fresh decisions. Logical deletion of the old Session removes execution catalog entries while preserving formal work. Actual producer unload removes its instance, and an empty catalog after host restart still serves Core history with no legal mutations. Plain Chat needs no Matter and receives no NDA tools. The no-renderer NDA manifest has `surface:null`; this does not establish frontend usability.

Review-driven fixes cover missing schema metadata, terminal Run/candidate identity, host atomic admission, and domain contract/reason/anchor checks. Generic unaccepted proposals can retain unverified evidence for review; only accept certifies evidence and causes formal effect. NDA verifies before proposal save. A full-suite failure exposed summary fixture compatibility after global Store admission was introduced; the host now requests the global guard explicitly while standalone Store keeps its former per-Session semantics. A subsequent control-plane regression from that refinement was corrected and its 16 tests rerun. These failures are not hidden by the final passing run.

## Source and independent evidence

- [Original source consumption and fixed hashes](source-consumption.md): full PT2 index/manifest consumption and bounded fixed Paper reading; no private snapshot copied into Git.
- [Architecture dispositions and Paper → code → counterexamples](adoption.md): reuse, thin adaptation, self-owned invariants, deferral and rejection recorded separately from research suggestions.
- [Core independent review](core-independent.md): nonauthor probes and scope.
- [Runtime adapter independent review](adapter-independent.md): reviewer authored the pure domain and does not independently accept that module. The source reviewer separately tested domain expectations and three verifier counterexamples (10/10 focused domain/runtime checks).

The user supplied Pro initial review during delivery. [Finding-by-finding disposition](pro-review-disposition.md) records R-01 settlement and R-04 event fixes, R-02 model-wire source discovery, R-03 provenance evidence, and the bounded [missed-abort probe](question-abort-review.md). Non-author follow-up found the orphan Core Run after a failed finisher; durable-state reconciliation now allows the next command without replaying effects.

## Fable and Pro consumption

Fable: [query/action/error/authority contract](../../docs/work-core/contract.md), [NDA payload and facts](../../docs/work-core/nda.md), [actual synthetic packets](../../app/tests/fixtures/work-core/nda-packets.json), regenerated by `node app/scripts/work-core-fixture.mjs`. The packet contains pending, accepted and producer-unloaded views from actual service calls; inline/detail must consume the same projection/version. Packet SHA-256 `d5ee938289db97148a59442560bde95aee358baa661c042838b96a76cc1e8428`. Its generation preceded final admission hardening; projection contents are unchanged by those fixes.

Pro supplement: review `git diff 43e3dc058b77cb38d295b261b977469accc18478..133269184468f1adf3b38acfc59091818daeb8e8` for the implementation against the actual handoff checkout. Existing Pro baseline equivalence is defined by the handoff; do not substitute this backend diff for an unseen Fable delivery.

## Open product gates

G1 real provider remains **not_run**; a non-fake loopback route tests only trustworthy provenance. G2/G3 backend transitions are exercised, but Review UI, keyboard usability and new-Session GUI integration remain Fable work. G4 actual public UI demonstration and G5 README/Pages/resume evidence remain open. No main integration, deployment, professional-quality benchmark or full H4 lifecycle matrix is claimed.


## Final author verification

At code SHA `1332691`: `npm --prefix app test` **170/170 pass** ([complete log](full-tests.log)); `npm --prefix app run smoke` **pass** ([log](smoke.log)); focused control-plane correction **16/16 pass** ([log](control-recheck.log)). All are synthetic isolated data/port-0 environments using the existing lockfile, without paid provider execution. Earlier node/focused totals overlap and must not be added. Documentation-only final commits preserve this tested code SHA.

The pre-Pro code `aaa61eb` passed 164/164 ([historical log](pre-pro-full-tests.log)); the final suite includes six additional Pro-driven regressions. Focused [settlement](settlement-tests.log) and [question/cancel](question-tests.log) logs overlap the full suite.
