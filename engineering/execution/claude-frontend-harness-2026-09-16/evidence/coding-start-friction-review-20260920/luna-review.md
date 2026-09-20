# 06b coding-start friction bounded review

Date: 2026-09-20. Reviewer: Luna (non-author). Candidate `55bee59c0d148ae7b5a4d11133b13a9dd19054c2`, based on `a04b9ac056e6f197897702eefeefe4007bba7f9a`, in `/Users/lesprivilege/Projects/.worktrees/courtwork-frontend-friction-20260920`. The author tree was clean before and after review; no browser, provider, user instance, 8787, or 8899 was touched.

## Scope and result

Read 06b, the coding-start-friction README, change record, counterexamples, exploration, and checks. The delta contains the four intended production files (`workspace-card.mjs`, `app.mjs`, `agent-profiles.mjs`, `agent-profiles-view.mjs`) plus the new seam test and evidence. `git diff --check a04b9ac..55bee59` exited 0.

Recommendation: **adopt the bounded 06b candidate**, subject to Astra’s integration decision. I found no correctness blocker in the requested seams.

## Verification

Exact command, run from the candidate’s `app/` directory:

```text
node --test tests/coding-start-friction.test.mjs tests/candidate-ui.test.mjs tests/agent-profiles-specimen.test.mjs tests/diff-view.test.mjs
exit=0
ℹ tests 45
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

This covers all 12 new tests and the selected adjacent owner suites (33 tests). No full suite was rerun because the focused seams passed and the delivery supplied no new broad-risk signal. Output is in `/tmp/cw-friction-luna-tests.log`.

Corrected source hashes:

```text
2bf0e4e4b315753271eeb5c3c23c20110f82372b12974c134ae89190ecdf0eea  app/web/workspace-card.mjs
a9bd268cb533b3079f88b4fd55d84108827f0f22b7316f9123226c97865884d9  app/web/app.mjs
9536c750421f3d21beb338e37b5b9df4323d9a757f1168d64944975efbbf7690  app/web/agent-profiles.mjs
16d5217744e91de7e3c0c0d7d95291c7633b363be1223c08adabe8b70603a501  app/web/agent-profiles-view.mjs
ce8caeafc4c6746529a143eb58b4e90586879e38ed6eb82e2923b5ae26ac3c59  app/tests/coding-start-friction.test.mjs
```

## Findings

**Write-count identity and outcomes: pass.** `candidateWriteRevision()` starts from the active candidate’s Session receipt, folds only `repository.write.confirmed`, filters by the same candidate ID, and takes the later revision. Prepared, failed, cancelled, and other-candidate effects cannot increase the count because they do not match the confirmation type and identity. The card uses this projection, while the diff dialog first uses the projection and then replaces only its separate heading from the diff receipt’s `writeRevision`, before rebuilding the patch body. Write, check, source, and candidate identities remain separate.

**Folder change, permission, and focus: pass.** The card displays Project, Folder, read-only source access, File access, and Private candidate as separate readings. Change folder reuses the existing bind command and states the Host’s active-candidate precondition; it is removed while a candidate exists rather than presenting a known-failing action. The focus chain keeps keyboard focus on Review changes after candidate creation, on Start private candidate after stopping edits, and preserves typed folder input when leaving the change path. The selected tests exercise these paths.

**Boundary copy: pass.** The old claims that nothing was uploaded or read before send are removed. The replacement states that path/Git metadata may be read during preparation, that the folder is never written, and that file content read by a run is sent to the configured model. It does not claim a particular runtime or expose credentials. This matches the recorded counterexample and does not add a warning wall.

**List pending/race: pass.** The 06a list retains useful previous rows and its navigation anchor while marking the section `aria-busy` and adding a status line that the rows are from the previous reading. `openProfile()` retires the list epoch, so a late list reply cannot land behind the newer profile navigation. The 12-test seam and adjacent 06a suite both pass.

I found no overclaim in the requested production behavior. The implementation remains synthetic/frontend-only and does not turn the UI into an authority.

## Additional bounded follow-ups from parent inspection

Two small presentation issues remain outside the four seam acceptance items:

1. The `Which is which` File access definition (`app/web/workspace-card.mjs:167-170`) says an exact file/content is either shown for approval or it is not. The owner’s actual three labels are `Ask before editing`, `Allow edits`, and `Read only` (`app/web/settings-view.mjs:87-90`). The disclosure therefore omits the distinction between automatic edits and no-edit/read-only execution. The card’s live label is correct; only the explanatory definition needs a three-state wording.
2. `app.mjs:7771` re-renders an open Workspace card on every `renderAll()` event. `workspace-card.mjs` keeps the change path, typed directory and command focus intent in closure state, but recreates the `Which is which` `<details>` without restoring its `open` state. An expanded disclosure will collapse when an event refreshes the card. This is a continuity/presentation follow-up; the tested change-folder and keyboard paths still pass.

## Remaining scope and follow-ups

The two explorations remain correctly unimplemented: pre-staging a private candidate before the first inference is an existing-Host/frontend follow-up, and showing candidate revision in approval details is a separate frontend follow-up. Pending request arguments for non-approval tool starts remain a Host projection gap. Native zoom, screen-reader, forced-colors, visual screenshots, and real-model execution remain unverified as the delivery states. These do not block adoption of the four bounded seams.
