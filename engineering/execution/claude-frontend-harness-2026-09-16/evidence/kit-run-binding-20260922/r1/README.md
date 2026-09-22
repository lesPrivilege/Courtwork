# K3-R1 — require frozen summaries for retained Kit declarations

2026-09-23. Parent finding **adopted**. Correction source `8e7171c`, based on delivered `cb26d20`, in the same isolated `codex/kit-run-binding-20260922` worktree. Parent review was read at `8761396d84a4489df412b5583a5a4576a5b940ac:engineering/execution/claude-frontend-harness-2026-09-16/evidence/kit-run-parent-review-20260922/README.md`; no main merge or frontend edit occurred. Earlier packet artifacts and checksums remain unchanged.

## Defect and correction

After a real Kit Run completes, removing both summary projections from synthetic persisted state left a nonempty v2 Kit composition. The prior null-summary branch accepted it as no-Kit history, and a reopened Host returned200 without `kitContext`. This is a load-integrity failure, not evidence that normal admission dropped summaries or sent incorrect inference.

Six added product lines in `app/runtime/kit-binding-state.mjs` reject a null Run summary when any retained `runtime.bound` v2 composition declares nonempty Kits. Existing non-null validation still requires the matching event projection. Validation runs at load, post-upgrade and Store mutations; the reader does not reconstruct missing history or consult mutable configuration. No new schema, authority, recovery flow or UI is introduced.

Legitimate schema20 history has no admitted nonempty-v2 Kit declaration and gains a null summary as before. v1 and empty-v2 history remain valid. A forged schema20 file containing such a declaration refuses during post-upgrade validation, before backup/write; it is not treated as legitimate legacy history.

## Evidence

- The byte-identical [parent probe](parent-probe.mjs.txt) reproduces the old failure: [before log](parent-before.log), [exit1](parent-before.exit), actual reopened HTTP200 without Kit context. The [after log](parent-after.log), [exit0](parent-after.exit), records the precise load-validation rejection. The unchanged probe stops once validation rejects; actual reopen rejection is additionally tested below.
- [Author targeted regression](author-targeted.log), [exit0](author-targeted.exit): **32/32** across `kit-run-binding`, `kit-binding-store`, and `local-pi-schema20`. The new test completes a real Host/Pi Run, closes the Host, writes five corrupt persisted variants and attempts actual reopening: both summaries stripped with absent/null event property, absent/null event property alone, and forged schema20. All refuse without rewriting the input or creating a migration backup. Existing v1/empty-v2 positive tests now also reopen, query historical context, retain persisted event values and make zero new provider requests.
- [Initial test log](author-targeted-initial.log), [exit1](author-targeted-initial.exit), preserves a test-oracle correction:31/32 passed; a new positive assertion compared in-memory `errorMessage:undefined` with serialized JSON, which omits that property. The assertion now compares the actual closed-Host persisted event values; product code did not change for this correction.
- Luna's [bounded non-author assessment](luna-assessment.txt) on fixed `8e7171c5a8f42be00e5800e3699568e6bb161fab` passes the [unchanged parent probe](luna-parent-probe.log), [24 Host tests](luna-kit-run-binding.log) and [4 Store tests](luna-kit-binding-store.log), exit0. [Source hashes](luna-source-sha256.txt) identify the checked bytes. No blocker remains within this delta; parent acceptance remains separate.

The earlier full1565/1565 and smoke remain evidence for the prior source. This six-line delta uses the targeted owner/migration regressions and parent counterexample; no new full-suite or UI/real-model claim follows. Only synthetic temporary data and the existing locked dependency installation are used. No user services/data, credentials, paid provider, Pages, main or Claude files are touched.

Final parent delta acceptance and integration remain pending. The finite correction writer is released with the return packet; no next task starts automatically.
