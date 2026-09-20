# 06b terminal Workspace-card wiring acceptance

Date: 2026-09-20. Non-author review of the dirty integration-tree correction in `/Users/lesprivilege/Projects/.worktrees/courtwork-friction-integration-20260920`. The parent’s dirty 06b document and pre-existing `app/node_modules` symlink were not touched.

## Delta reviewed

The `app/web/app.mjs` correction is limited to the `pollEvents()` changed-event branch. After `mergeEvents()` and `renderChat()`, it checks whether `#workspace-popover` is open and calls the existing `renderWorkspaceCard()`. This is the missing event path identified in the terminal review: terminal polling updated `state.runs` but previously left an already-open card with its earlier `active` prop.

Source hash after the dirty correction:

```text
c6b9f5325d71cc12f0221f4ebc614659e67786ba62528cfc94b24894e5d5fc79  app/web/app.mjs
```

`git diff --check` exited 0.

## Verification

Exact focused command, from `app/`:

```text
node --test tests/coding-start-friction.test.mjs tests/workspace-card.test.mjs tests/candidate-ui.test.mjs tests/run-activity.test.mjs tests/sync.test.mjs
exit=0
tests 38
pass 38
fail 0
```

The run covered the 13 friction seams, Workspace/candidate UI continuity, run activity terminal behavior, and event synchronization/terminal re-cancel behavior. No full suite, browser, provider, or author tree was used. Output is in `/tmp/cw-friction-wiring-final.log`.

## Acceptance

**Adopt the wiring correction.** It is the smallest owner-level fix: it runs only for changed event pages and only refreshes the card when the popover is open. It keeps the existing card’s disclosure and focus preservation because it reuses `renderWorkspaceCard()`; the recorded browser retest confirms the expanded card survives check approval through `Completed`, and `Disconnect`/`Stop edits` become enabled after terminal completion.

No new Host, permission, candidate, or run-state semantics are introduced. The parent’s browser evidence supplies the direct visual confirmation; the focused source and continuity tests are green.
