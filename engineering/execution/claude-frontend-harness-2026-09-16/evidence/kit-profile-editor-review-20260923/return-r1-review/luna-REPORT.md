# K5 independent delta verification — 2026-09-24

## Scope and state

- Candidate worktree: `/Users/lesprivilege/Projects/courtwork-kit-profile-editor-20260923`, branch `claude/kit-profile-editor-20260923`, HEAD/author packet `dd0947d778d882750172fefebb2d1b6af98eebaa`, clean at inspection.
- Product source under review: `991a0c600d5abc6a8fdd6d13adc1ac0a1b137da1`; comparison baseline `a0bed5ab934f6a277713669fc0dad425f6001542`.
- MAIN was `/Users/lesprivilege/Projects/Courtwork`, branch `main`, HEAD `86847b225d5d146e4595076ecde1b51071a1e115`. It had pre-existing modifications to `engineering/current.md` and `engineering/execution/claude-frontend-harness-2026-09-16/kit-profile-editor-20260923.md`, plus untracked `.agents/`, `.obsidian/`, the K5 review receipt directory, and `skills-lock.json`. These were only read and left untouched.
- The product-only delta is exactly five paths: `app/tests/profile-editor.test.mjs`, `app/web/profile-editor-view.mjs`, `app/web/profile-editor.mjs`, `app/web/runtime-view.mjs`, and `app/web/styles.css`. No edits were made in either checkout.

## Findings

**K5-R1: fixed at source/controller-probe level.** Replayed the two original controller probes against product `991a0c6`. A known config revision change makes the preview stale (`preview.current:false` at revision 8); changing selected profile also has controller regressions in the candidate test file for suspension and late preview. The exact original probes are recorded at `original-probes.log`. This is not rendered acceptance.

**Original synchronous double-submit R2: fixed at source/controller-probe level.** Replayed `K5-SAVE-DOUBLE-01`: two immediate Save invocations produce one PUT before the held response (`outcome: NOT_REPRODUCED`). The candidate also captures the submission and marks the slot `saving` before awaiting the hash at `app/web/profile-editor.mjs:286-303`. Focused controller suite passed 23/23; output is `controller-tests.log`.

**Adjacent pending-save reconciliation R2 remains open.** Replayed the existing `reconciliation-probe.mjs` from the MAIN receipt against the candidate. First Save reached Host revision 8 while its reply was held. A fresh source read populated `fresh` while the slot remained `saving`; `keepMine` then changed status to `idle` and enabled Save. The second Save issued a second PUT before either reply, advancing the synthetic Host to revision 9. Output: `reconciliation-probe.log`; exit 0 means the probe's intended counterexample assertion passed.

The UI genuinely presents this action while saving: `app/web/profile-editor-view.mjs:131-140` renders Keep/Use current whenever `reading.fresh` exists and does not guard on `reading.save.status`. The controller's `keepMine` and `useCurrent` only check `fresh`/`suspended`, then set save to idle at `app/web/profile-editor.mjs:344-362`. The normal Save button is disabled while saving, but reconciliation releases that guard; another Save is then enabled. The fixed double-submit behavior does not close this adjacent path.

## Checks and limits

- Original two probes: both passed their “not reproduced” expectations against source `991a0c6`.
- Reconciliation counterexample: reproduced exactly; two pending PUTs after explicit Keep my text.
- `node --test app/tests/profile-editor.test.mjs`: 23/23 passed.
- No browser/CUA, real Host, full suite, provider, service, data or credential operation was run. No acceptance is claimed.

The recorded K5 order and MAIN receipt remain authoritative. R1 and the original immediate double-submit R2 show code/probe progress; K5-R2 remains open for pending-save ownership through both reconciliation actions. Independent rendered acceptance and overall K5 acceptance remain outstanding.
