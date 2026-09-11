# Pages branch review · 2026-09-11

This is a read-only, non-author source review for the Pages merge decision. It records Git and source facts; it is not independent visual acceptance, product acceptance, or deployment evidence.

## Fixed refs and worktrees

- `main@590739fa3d1bc401905261172260143e36e82c5e` and detached Pages baseline `9bc6090b5b463bdf6286a0c42bdcd399781fc067` have the same `site/` tree, `e3088b26e4cb81ac36b908f4b13a839589bfe106`. `9bc6090` is an ancestor of `main`.
- The retained preview worktree is `/Users/lesprivilege/Projects/.worktrees/courtwork-pages-20260911`, detached at `9bc6090`. Its only worktree changes are 105 untracked PNG/JSON files under `site/verification/` (including `luna-home/`, `ordered-design/`, and product-page evidence). There is no staged or unstaged Pages source change in `site/src/`, `site/build.mjs`, `site/scripts/`, `site/README.md`, `site/media/`, or `site/specimen/`.
- The former `codex/pages-polish-20260910` branch ref is gone. Its complete tip is retained as tag `archive/pages-polish-20260910` at `590f395f24f7af93f3c7e82cd494ead323d05d5c`. Removing a branch ref does not remove the tag, bundle/archive recall, or the detached preview files.
- The active semantic polish worktree is currently `0ddb8543a9c90ee5239b1e6717610f6ce372fec5`. Its Pages candidate began at `89e437d43a5e6e19ee556811aca3127aad5fe0e2`; `d0ccc09` and `2bbcdf6` are evidence/documentation follow-ups. The latest `0ddb854` source fix restores the accepted research figure grouping described below.

## Five old Pages commits and their source equivalents

The archived Pages line diverged from common base `cd2a5b889150f2bff7d6e0ef49074b7df6464967`. Its five commits are:

| Archived commit | Subject | Main source-equivalent commit | Scope result |
| --- | --- | --- | --- |
| `1d9c5fa1ad07353a723d74d6a184a258f97263e5` | Polish Pages with an archival campaign and reserve Home capture | `c3c5eae3f929b6ac2705c9ba486e8a4d53e030f2` | `site` patch equivalent |
| `66b8a6b6c981183b71290094ea9e448a525f3821` | Neutralize Pages paper palette and refine CourtWork icon lockup | `abb14eced8abb27148cc1af446eba63ec1a2ec0d` | `site` patch equivalent |
| `f617a6c4285f41e2b74be28d2c4756523a7a20df` | Add restrained review attention and restore icon tonal hierarchy | `5e8c1b1e2a781ea4c43837c956491e5a78e56cc7` | `site` patch equivalent |
| `21e8a9b7386f158787da9b7f8a0cfd436dc1bfb0` | Add evidence-backed product tour, acquisition, CLI and product-life pages | `c3810fd9ad7c9925ed7414bfc2c8d8252ac78c57` | `site` patch equivalent |
| `590f395f24f7af93f3c7e82cd494ead323d05d5c` | Promote Paper to primary navigation and research foundation | `197f37ac8d39a00a69d296f2fa9f911bb86c987e` | `site` patch equivalent |

The equivalence is from stable `git patch-id` over each commit's `site` diff. Full commit patches are not byte-identical because documentation/evidence parents and later evidence updates differ. The archived line therefore has no unconsumed Pages source that should be cherry-picked. The receiving range is the already-integrated main sequence (`c3c5eae`, `abb14ec`, `5e8c1b1`, `c3810fd`, `197f37a`) plus its later Pages evolution through `9bc6090`; retain the archive tag for historical recall.

## Accepted composition versus semantic polish candidate

The accepted composition is recorded in `engineering/release/pages-ordered-integration-2026-09-11/README.md`: narrow navigation keeps CourtWork with `Tour / Paper / Release` on one row; the Hero owns the prominent Get CourtWork action; Paper links directly to Schema Engineering; Ideas starts expanded; the 13-slot capture batch remains pending. That decision is implemented by `main`/`9bc6090`.

The VS-05 brief at `engineering/execution/2026-09-11-semantic-polish/pages.md`, first implemented in `89e437d`, deliberately proposes a new composition: `Product / Experts / Eval / Pricing / Download` becomes the primary navigation; Paper, Tour, and Release move to footer or closed Research & architecture; Home proof moves after Hero; the story orders Spark/Attention, Matter → Experts → Review, Models/Tools, Eval/Privacy, Pricing, and acquisition. The 13 Tour slots remain blank and are regrouped into Start, Know, Judge, Specialize, and Control. This is an intentional candidate change, not an automatic continuation of the accepted composition.

The current `site/src/page.mjs` fix at `0ddb854` retains that new IA while restoring the source grouping from `9bc6090`: `researchFigures()` renders the pipeline and the three `long-work-stages` sections (Spark, Attention, Experts & Runtime), using the existing `figure("pipeline"|"spark"|"attention"|"roles")` IDs and SVG registry. This corrects the intermediate `89e437d` arrangement that emitted four standalone figure calls inside Research and lost the three-column stage container. Source comparison confirms the restored selectors and figure IDs; it does not constitute a visual acceptance claim. The related capture review reported the intermediate roles rendering at 1280×916 and the restored grouping at roughly 400×342 per desktop column and a 342px-wide single mobile column; these dimensions remain evidence for the separate visual diff, not independent acceptance here.

The high-value visual decision areas remain the header/Hero action, Paper/Tour default disclosure, old long-work figures versus closed Research, Spark/Attention/Experts ordering, Pricing anchor, 390px navigation wrapping, and Download/Get semantics. Existing 9bc images and the new candidate images are comparison inputs only; old screenshots cannot prove the new layout or the pending capture batch.

## Disposition

- Receive neither the archived five commits nor the detached verification files as new source. Keep `archive/pages-polish-20260910`, the bundle/cleanup recall, and the detached `9bc6090` worktree for history and review.
- Treat `89e437d` and its Pages changes as the semantic-polish candidate, with `0ddb854` as the current source correction. Any merge should be based on the actual candidate tree after root's visual and semantic ruling, not on branch-name precedence.
- Do not call the candidate independently accepted: its evidence still has explicit limits (dark/reduced-motion/no-JS/forced-colour gaps and the pending 13-slot capture batch), and the author/source review here does not replace non-author visual review.
