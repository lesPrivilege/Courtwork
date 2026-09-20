# Luna round-2 review: PA-R1–R3 at `6b39ecc`

Review tree: `/Users/lesprivilege/Projects/.worktrees/courtwork-prepare-approval-20260920`

Reviewed released HEAD `6b39ecc920500ecac63903b3085f3c3d6b35f824`, against `68ef4cd`. The review was read-only. Source hashes at this HEAD:

- `app/web/app.mjs` `0394a1182a48c1e82c3b4a42796cbbde729fe1625361cd33ca55f3f74f08e096`
- `app/web/home-preparation.mjs` `87acfeca07a50417918e98b9a218714895404629a247702b26be9738d34b836d`
- `app/web/workspace-card.mjs` `811ea86181016d43a27cf73683c4d03590d41125e6271deffee499d15d94ed3f`
- `app/tests/prepare-lifecycle.test.mjs` `56127be5872db7f7cccc516b34201e3b12e415bb8c61ed3b70b72f355c4633dc`

## Adopted evidence

PA-R1 is correctly wired through the product path. `prepareChat` reads the Host Session before deciding which steps remain, uses the Host's current binding/candidate revisions, adopts the Host binding's canonical `rootPath`, and keeps the marker's request/candidate IDs. `renderWorkspaceCard` routes an unfinished prepared Session to `prepareHomeChat` and suppresses ordinary folder/candidate mutation controls. This closes the lost candidate reply / fresh-identity 409 path.

PA-R3 is correctly scoped at the run receipt. `submitSessionRun` calls `retirePreparedChat(sessionId)` only after a matching Run receipt; the matching Session detail and restored-marker reconciliation cover work admitted elsewhere. `retirePreparedChat` only clears the matching prepared marker, leaving Home draft text, materials and staged path untouched. Failed or unconfirmed admission does not reach retirement.

## Confirmed remaining blockers

1. **Unconfirmed preparation does not lock Remove.** `app/web/app.mjs:6298` passes `PREPARE_BUSY` only for `phase.status === "preparing"`. For an unconfirmed marker, `homeWorkspaceDraft.locked` disables Start, but `workspace-card.mjs:157–162` computes `busy` without `draft.locked`, so Remove remains enabled. An inline probe against the actual card at this HEAD returned:

   `{"removeDisabled":false,"startDisabled":true,"hasChooser":false}`

   This is a real recovery break: browser evidence shows Remove can clear the staged path; after Check status recovers the Session, Continue preparation reaches `PREPARE_NO_FOLDER`, while the workspace chip has no path to continue against. The marker's instruction/session identity survives, but its required folder intent has been erased by a control that should have been locked.

2. **Unfinished preparation with a missing/failed binding has no correction route.** When a prepared Session has no active binding, `renderWorkspaceCard` enters the `resuming` branch (`app/web/workspace-card.mjs:183–191`), displays “Not connected yet” and only “Finish preparing this chat”. It does not expose Open folder, typed path, or a previously connected-folder chooser. The actual card probe returned no `change-folder`, `path`, or `connect` control. If the original path is invalid or was cleared, retry cannot repair the binding; `prepareHomeChat` falls back to `state.homeRepositoryPath` and otherwise fails `PREPARE_NO_FOLDER`. This leaves the user without a usable correction path.

These are narrow PA-R2/PA-R1 recovery gaps and should remain in the original owner record rather than being accepted by the helper-controller tests alone.

## Verification

Focused command from `app/`:

```text
node --test tests/prepare-lifecycle.test.mjs tests/prepare-and-approval.test.mjs tests/workspace-card.test.mjs tests/coding-start-friction.test.mjs tests/candidate-ui.test.mjs
```

Result: **52 passed, 0 failed** (11 lifecycle, 41 existing owner suites). `git diff --check 68ef4cd..6b39ecc` passed. No full suite, provider, browser, user port, credential store, or source edit was used. The author evidence says 1312 full-suite passes while its raw command output says 1313; this review does not treat that full-suite count as independent verification.

Recommendation: **adjust before adoption** for the two recovery blockers above; adopt the R1 reconciliation and R3 retirement portions as reviewed.
