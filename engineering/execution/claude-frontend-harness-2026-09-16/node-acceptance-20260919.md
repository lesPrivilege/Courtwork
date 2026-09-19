# Independent acceptance and main node · 2026-09-19

This record covers the independent acceptance of the Claude frontend/Harness candidate. It also records the candidate's merge into `main` as a fresh node and registers the gaps that remain open. It does not replace the per-slice records (00–09, P) or the owner contracts they write back to. [current](../../current.md) holds the project status.

## Scope and roles

| Item | Value |
|---|---|
| Candidate | `fa03143fe56d655271383f7fc34341b75f7bea19`, branch `claude-frontend-harness-20260916`, 70 commits over `f76dd7e`. Slices 00–09 and P, plus the author's response to the 2026-09-16 review (`63da069`, `fa03143`) |
| Main at intake | `9d6624de52350bd97a94cbbad75a67cf1578f145` (English-first README); merged into the candidate with one resolved `current.md` conflict that keeps both sides |
| Acceptance checkout | `Projects/.worktrees/courtwork-node-acceptance-20260919`; not the author's active tree |
| Acceptor | Claude Opus 5 in a fresh session. It did not author any candidate commit (the author was Claude Fable 5.1) and wrote no product code in this pass. Findings stay with the original owner |
| Prior review | Luna / Astra independent review at baseline `f64c7e8`, which withheld acceptance of 09. Its disposition text was previously uncommitted in `/private/tmp/courtwork-claude-review-20260916` and is now committed in [00](00-intake.md#independent-review--2026-09-16) and [09](09-navigation-commands.md#independent-review-disposition--2026-09-16), ahead of the author's response |

## Inputs carried into the node

| Input | Source | Handling |
|---|---|---|
| Independent review disposition and its evidence | Uncommitted review checkout (`/private/tmp`) | 00 and 09 sections applied with a three-way merge. [dogfood-review-source.json](evidence/dogfood-review-source.json) and [review-test-generated-capability.json](evidence/review-test-generated-capability.json) are kept byte for byte |
| Live assistant text streaming PR registration | Uncommitted in the author tree; already linked from the packet [README](README.md) | [Registration](live-assistant-text-streaming-20260916.md) and its `current.md` entry are committed. It remains a registration only. The review has already qualified its claim that no streaming exists: a polling-based delta path does exist |
| RD-006 in-flight records from 2026-09-14 | `Projects/.worktrees/courtwork-rd006-recovery-20260914`, which was rebuilt from Codex logs | All 33 of its modified and untracked app files are byte-identical to `ab4b93d`, so the product code was already in the candidate. The six uncommitted 2026-09-14 owner sections are now placed before the 2026-09-16 section in [RD-006](../../research/RD-006-deferred-workspace-binding.md), in date order. [Work orders](../../research/deferred-workspace-binding-2026-09-12/dogfood-work-orders-2026-09-14.md), the [first-slice independent review](../../research/deferred-workspace-binding-2026-09-12/independent-review-20260914.md), the [second write dogfood round](../../research/deferred-workspace-binding-2026-09-12/write-dogfood-round2.md) and the work orders' [mixed code-reading fixture](../../research/deferred-workspace-binding-2026-09-12/fixtures/code-reading-mixed-20260914.md) are kept byte for byte. Its schema-17 lines in AGENTS and architecture are superseded by 18 |
| English README worktree | `/private/tmp/courtwork-readme-en-20260916` | The node already contains the equivalent content through `9d6624d`. The only remaining difference is an earlier wording of the same `current.md` sentence |

Not carried in: the author tree's modified `evidence/06-capability-consumption.json`. A test run regenerated its random IDs, so it is not new evidence (see N-04).

## Verification

| Check | Result |
|---|---|
| Source review of `63da069` against NAV-R1/R2/R3, the `presentation.mjs` escape and the schema 17→18 test | The fixes address the findings as stated. The traversal now saves the departure anchor before the cursor moves. A new arrival abandons a pending return, and the late reader is fenced by the navigation epoch. Menu enablement is re-listed on every render and re-checked on click |
| `npm test` on the merge tree `ad6bfab` (Node 25.9.0, concurrency 4, historical-fixture precheck included) | **1196/1196**, 0 fail / cancelled / skipped, 240 s. The run then rewrote the tracked capability evidence, which was restored before commit (N-04) |
| `npm run smoke` | exit 0, `realProvider: not_run` |
| `node tools/check-doc-links.mjs` and `git diff --check` on the final tree | pass |
| Browser, isolated Host on port 8873 with a synthetic data dir and the Local test provider, about 1000 px, light | B scrolled to 666.5 → open A → **Back**: B returns at 666.5 with the same first row. **NAV-R1a:** B rescrolled to 266.5 → **Forward** to A → **Back**: 266.5 is restored (before the fix, the stale 666.5 came back). **NAV-R1b:** A's reads delayed by 4 s → Forward to A → Home: Home stays shown, the late A reader is discarded, and Back names A (the pending target stays on the trail). **NAV-R2:** a context menu on example rows opens nothing, but see N-01. **NAV-R3:** not reproducible in the browser because the fake Runs finish too fast; accepted on the tiny-dom test |

Not checked: dark theme, 200 % zoom, 390 px, screen readers, a real provider, or the slices 00–08 and P beyond the full suite and the review's bounded source reading.

## Decision

- **Slice 09 review fixes: accepted**, with the residual N-01 registered. The review's other findings are either fixed in this node or already assigned to 10/11 by the author's response table.
- **Merged into `main` as a fresh node**, as the user instructed. The merge is on local `main` only; it has not been pushed or deployed. Published media and install stay on `fd96f96`.
- **Not accepted:** release readiness, the real coding loop through 01–03, visual acceptance, and full accessibility. A green suite does not settle architecture or capability acceptance ([verification](../../verification.md)).

## Gap register

Each gap stays with the owner named here. The IDs locate gaps; they do not form another roadmap.

| ID | Gap | Owner | Exit evidence |
|---|---|---|---|
| N-01 | Example (preview) Chat rows under a Project still render a `More chat actions` button (`aria-haspopup="menu"`). It is invisible at rest, becomes visible on hover or focus, and opens nothing. `app/web/app.mjs:2288` passes `more` unconditionally, whereas Recent rows at 1903 are real chats only. This contradicts the object-command rule that example rows have no menu | 09 / Object Command | No More control on preview rows, with a test that covers it |
| N-02 | Real coding loop: the RuntimeLock task reaches reads but was not shown to edit or check through CW | RD-006 / DF-04, slices 01–03 and 11 | The same small task on a fixed candidate and an isolated worktree with a real provider, producing a governed edit, a controlled check exit and durable receipts |
| N-03 | Run reading surface: settled intermediate segments carry footers; live paint, settlement and reconnect for visible text are unverified; user-message, Source, tool and group disclosures lack shared anchoring; the positions of Back to latest, `ask_user` selection and Copy feedback remain as reported | Chat Flow / Run Surface, slices 04, 10 and 11; [streaming registration](live-assistant-text-streaming-20260916.md) | The review's exit rows in [00](00-intake.md#independent-review--2026-09-16) |
| N-04 | A full `npm test` rewrites the tracked `evidence/06-capability-consumption.json` with fresh random IDs, so every run dirties the tree | 06 owner | The after-hook writes to a scratch path or produces deterministic bytes; the tracked evidence changes only when someone refreshes it deliberately |
| N-05 | Navigation integration tests pin source patterns. Anchor restoration and async ordering have unit and manual browser evidence only (this record and the author's port-8861 run) | 09 owner | A behavioral test through the real history helper and render path covering both orderings |
| N-06 | `app/docs/repository-binding.md:34` still says RuntimeStore schema 17 | RD-006 / repository-binding owner | The current pointer says 18; historical migration lines are kept |
| N-07 | Slice-level open items remain as recorded in each slice's "未完项" section: 09 has no shortcuts, no dark/200 % check, and the Chat page and Attention rows are not on the shared menu; 01 has no Linux dialog and no A/B/upload fixture; and so on. Slices 10–13 have not started | Each slice record | Per slice |
| N-08 | The Agents API adapter first slice (P03/DRT-03) exists only as uncommitted files in `Projects/.worktrees/courtwork-agents-api-adapter-20260915` (base `caf3edb`): the adapter, the contract `.d.ts`, the protocol test and fixture, the protocol document and the evidence. It claims offline 12/12, which has not been independently verified. It is not in this node | P03 / DRT-03 under the [v4 plan](../../research/agents-api-first-2026-09-14/implementation-plan-20260916.md) | Commit on its own branch, get a non-author check, then merge |
| N-09 | Host RuntimeStore is now schema **18**, while the last published node was 15. Data opened by this node must not be shared with the published `fd96f96` host. Pages and install media still show `fd96f96` | Release owner | A publication decision; not part of this node |
| N-10 | Worktree hygiene. More than 60 admin entries point at vanished `/private/tmp` trees, and 25 `~/.codex/worktrees` remain. They were not pruned, because pruning can make commits that only a worktree HEAD references collectable. The review, README and RD-006 recovery trees are now fully carried in. Together with the author's harness tree, they can be removed once the user signs off | User sign-off, then ordinary cleanup | A ref backup, then prune |
