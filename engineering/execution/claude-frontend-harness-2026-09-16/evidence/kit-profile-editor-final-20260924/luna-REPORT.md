# K5-R2 final delta — bounded nonauthor review

Date: 2026-09-24

Candidate checkout: `/Users/lesprivilege/Projects/courtwork-kit-profile-editor-20260923`

Candidate branch: `claude/kit-profile-editor-20260923`

Candidate HEAD: `1228161cf7e4eb3cb7b449b035a12a6de61d1aaf`

Fixed product source reviewed: `136f1d60b1acd73472bb7dd8f2ec168ac26b1397`

Prior product source: `991a0c600d5abc6a8fdd6d13adc1ac0a1b137da1`

## Scope and result

Reviewed only the three-file R2 product delta: `app/web/profile-editor.mjs`, `app/web/profile-editor-view.mjs`, and `app/tests/profile-editor.test.mjs`. The change keeps a pending Save in `saving` through Settings/source reads, disables/refuses both reconciliation choices while the reply is outstanding, and only clears the fresh reading on success when its revision is at or below the successful write. A newer foreign reading remains held for deliberate reconciliation. Newer typing remains separate. Lost replies still use submitted-hash read-back.

No blocking issue found in this bounded source review or the requested controller/probe checks. This is evidence for this delta only and is not overall K5 or product acceptance.

## Independent checks

- `node --test app/tests/profile-editor.test.mjs`: **26/26 pass**, 0 failed. Full output: `controller-26.log`; exit: `controller-26.exit`.
- Parent reconciliation counterexample, adapted only to cap the second-request wait at 500 × 1 ms and invert the assertion from exactly 2 outstanding requests to at most 1: **pass**. Observed state before: `saving`, fresh revision 8. After Keep: still `saving`, Save disabled. Requests before any response: **1**. Final save settles. Exact adapted script: `reconciliation-probe-adapted.mjs`; output: `reconciliation-probe-adapted.log`; exit: `reconciliation-probe-adapted.exit`. Adaptation was based on author-recorded exact diff in the candidate's `return-r2/probe-adaptation.diff`.
- `git diff --check 991a0c6..136f1d6 --` the three scoped product files: exit 0 (`delta-whitespace.log`, `delta-whitespace.exit`).
- Checkout status after review remained clean (`status-after.txt`).

## Limits

No browser or Host journey was run in this subtask; the parent owns current-session computer-use acceptance. No full app suite or adjacent suites were rerun. No source, branch, main checkout, evidence tree or external service was modified. All review logs and this report are under `/tmp/courtwork-k5-final-independent-20260924`.
