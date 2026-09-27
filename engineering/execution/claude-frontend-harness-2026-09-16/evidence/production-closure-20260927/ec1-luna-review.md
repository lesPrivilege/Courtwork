# EC-1 Luna independent review

Date: 2026-09-27

Reviewed worktree commit: 2dae6aaaf1f663f52e97ec1c7910ded931b58d3d (codex/evidence-input-schema-20260927)

## Scope

Read-only independent review of the EC-1 source diff and bounded tests. No product source, Core schema, file-memo policy, domain proposal schema, provider, credential store, or main checkout was changed by this review. The worktree had only the pre-existing untracked app/node_modules dependency link before the evidence files were added.

The commit changes:

- app/extensions/work-adapter.mjs: generic se_submit_candidate evidence/obligation item schemas.
- app/tests/extension-run.test.mjs: actual-wire schema assertions and malformed-evidence/no-partial-candidate coverage.
- engineering/execution/claude-frontend-harness-2026-09-16/11-coding-dogfood-handoff-20260920.md: owner/boundary handoff entry.

No fixture, golden baseline, domain.proposalSchema, or FILE_MEMO_PROPOSAL_SCHEMA path appears in the commit diff.

## Source review

MEMO_EVIDENCE_ITEM_SCHEMA has the exact six snake_case fields consumed by normalizeEvidence (app/extensions/work-adapter.mjs:134-148), with additionalProperties: false, nonnegative integer coordinates/versions, and adapter-aligned text/identifier bounds. The obligation item declares the exact five fields consumed by normalizeObligation (:150-164) and uses Core's existing open|resolved status enum (app/core/core.py:116-128). evidence_refs.items reuses the same evidence schema.

The schema comment preserves the authority split: source membership, digest/quote equality, and range ordering remain runtime/Core checks. The change is limited to the generic branch at work-adapter.mjs:526-539; domain schemas still come from this.domain?.proposalSchema, and file-memo Runs still use FILE_MEMO_PROPOSAL_SCHEMA at :561-573.

## Verification

Command:

node --test --test-concurrency=1 app/tests/extension-run.test.mjs app/tests/work-continuity.test.mjs app/tests/work-core.test.mjs app/tests/execution-file-continuity.test.mjs app/tests/execution-file-candidates.test.mjs app/tests/nda-producer-contract.test.mjs app/tests/work-actions.test.mjs app/tests/architecture-maintenance.test.mjs

Result: 38 passed, 0 failed, 0 cancelled, 0 skipped; exit code 0; duration 50.509s. Full stdout is in ec1-luna-tests.stdout.txt.

The run includes:

- T-EXT-1/T-EXT-2/T-EXT-3, including actual fake-provider wire schema assertions and malformed evidence with zero persisted candidates.
- File-memo continuity/Core candidate suites.
- NDA domain producer schema and work-action contract suites.
- AM-C retained wire golden/no-op checks.

## Disposition

Adopt. The bounded implementation matches the existing normalizer/Core contract and the actual-wire regression demonstrates the missing item schemas are present. No blocking finding remains in this source/test scope.

Non-blocking test-strength note: T-EXT-3 asserts isError plus no candidate/matter mutation, which is meaningful; a future tightening could also assert the exact evidence has unsupported fields text. This is not required to accept EC-1 because the source normalizer's exact-key guard and the no-side-effect assertions already identify the failure boundary.
