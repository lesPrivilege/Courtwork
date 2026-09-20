# Agent profiles 06a round-2 bounded review

Date: 2026-09-20. Reviewer: Luna (non-author). Review tree: `/Users/lesprivilege/Projects/.worktrees/courtwork-agents-review-20260920`, detached at `aca21c88fff2fc2e582f8c52d23d840d4ce53c3c`. Author tree and preview 8899 were not modified.

## Scope and ancestry

The current project record says the 06a return is under bounded AP-R1…R6 review and remains unmerged (`engineering/current.md:3-13`). The original review establishes the six finite returns and keeps Runtime management and Role-first Composer out of scope (`engineering/execution/claude-frontend-harness-2026-09-16/evidence/agents-profile-review-20260920/README.md`, bounded corrections table). The 06a record says all six are applied, while explicitly remaining “not self-accepted, not integrated, not a backend claim” (06a lines 3-6).

`0f76407ac3f0fc7aa34585a003921e855c80820b` is an ancestor of `aca21c88fff2fc2e582f8c52d23d840d4ce53c3c` (command exit 0). The correction path is preserved: `948121b` applies the six code returns, then `fc1c212` merges the retained review record, and `aca21c8` records the correction checks/evidence. The source delta is bounded to the controller, view, typed projection, fixture adapter/page, seam tests, and the existing static allowlist; the rest of the 41-file range is evidence and delivery documentation.

## Verification

Exact command run in the detached review tree:

```text
node --test app/tests/agent-profiles-specimen.test.mjs
exit=0
ℹ tests 22
ℹ pass 22
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

The 22 tests include the original seam coverage plus the six correction regressions: detail reply invalidation on both navigations; discard during save; reconciliation when a draft changes during save; unavailable-runtime recovery; capability reason/read-only save gating; and unreported permission effect. `git diff --check 0f76407..aca21c8` also exited 0. No full suite, browser, or provider was run.

Relevant corrected source hashes at `aca21c8`:

```text
705700fac8f3498a1fcceaa0de3195014e126d3d8f6ba7a52534886bf36b4601  app/web/agent-profiles.mjs
79bf9f37fa76680589f99250bd5cbd96b732cdec0e050d86251a0eb219569446  app/web/agent-profiles-view.mjs
06c8c8d27a7b6ab8a4a666d66aeaf96e0b8f0f6a21721447a0505c634ef2aa88  app/web/agent-profiles-contract.d.ts
a1526e1738e742ed5f521048ec9f93421e1bfba469ff2df43a574dd21f28820d  app/tests/agent-profiles-specimen.test.mjs
b6dc9e1bd8bee514a1b3e17c218f92a2125c20c083f9a3ec6ffcb0d7563e9e28  app/tests/fixtures/agent-profiles/adapter.mjs
0168e2da2011dcced1ae4d2c3289089c26d2f039dd468b9ada61a62783a86d8e  app/tests/fixtures/agent-profiles/index.html
5606e8d4f61476f7f4b261702b8fb15365412d11786e9f0f8a4894e4b3ed2d27  app/server/index.mjs
```

## Disposition

Adopt AP-R1 through AP-R6 for this bounded correction review. The implementation now retires runtime-detail epochs on list/profile navigation; makes discard a controller-level no-op during save; adopts and names an owner-confirmed revision while keeping a newer draft dirty; preserves save focus/recovery; keeps unavailable-runtime rows openable; renders capability reasons; distinguishes unchosen, unsupported, and unreported permission states; and marks owner/projection/revision facts as proposed where the existing owner does not expose them. The six changes are documented with their corresponding checks in 06a lines 202-207.

Keep the following risks outside this acceptance: the adapter and confirmed revisions remain synthetic; the proposed backend projection still needs its existing owners; native 200% zoom and screen-reader checks remain undone; and the order-11 handoff remains separately unaccepted. These are documented limits, not failures of the six seam returns.

Separate follow-up: Luna's list-refresh observation remains open. Returning from a profile can show stale list rows until the asynchronous list reply arrives, without a loading indication. The 06a record explicitly records this as a UI/continuity follow-up and says it was not changed (lines 209-210). It is not folded into AP-R1…R6 acceptance.

Review tree is clean and recoverable after the detached advance. Test output is in `/tmp/cw-ap-round2-tests.log`.
