# Independent source review — Composer working location

## Scope and verification

Reviewed the pinned candidate `ac6049b63ba855f5adf275a1cfbfbe617cc1ebd4` (`06b: one Work location entry for project and folder`) in `/Users/lesprivilege/Projects/.worktrees/courtwork-work-location-20260921`, based on `3bf1e0b`. The worktree was clean. I read `engineering/current.md`, the finite working-location ruling, and the author delivery/evidence. No product files, main, user ports, personal configuration, or browser sessions were touched.

Relevant source hashes:

```text
app/web/app.mjs                         caf3c84c1d4f177c974d75de55b37afe83cb6c34dc7e4410f59e5ca5205988de
app/web/workspace-card.mjs              d8d697214ee1f9b0363bc60f21a8f57eece86f3148e513201dd888bafd3d4b3b
app/web/ui-controls.mjs                 6a6b77fc9888e25514150d54609157be2e34ba34f1555cbd7bed81aeb2825b61
app/web/index.html                      7f044a501c7149d8a1ded993cf267294044ab31931bfc5173db70e5eb55fe08f
app/web/styles.css                      1b116cb103cceb4fad685f732b41749dc21f77a57e3c3c5c2ac7af80f8c5e975
app/tests/prepare-lifecycle.test.mjs   e1064d24425efc5d93199cf0e004d4aa04da80c2dc634ae74f25998279521976
app/tests/workspace-card.test.mjs       afdff8d9b8413edcdc943062798588df76a5bc1fe8f1db731a48005001f57561
```

The author’s 15 affected suites were rerun independently under `/usr/bin/caffeinate -dimsu` with common provider variables unset: **115/115 passed**, exit 0. `git diff --check 3bf1e0b..HEAD` also passed. Full raw output is `/tmp/cw-composer-independent-review.log` (the test-only log is `/tmp/cw-composer-independent-tests.log`).

## Findings

### F-01 — Plain Home Send can expose mutable location after Chat creation (high, acceptance blocker)

The new `SEND_BUSY` guard only applies while Home has no Session. The source path loses that guard during the remainder of a plain Home send:

1. `submitHomeRun()` marks `operation.pending` and renders before the create (`app/web/app.mjs:5453-5459`), then stores `operation.session` immediately after `POST /sessions` (`:5461-5472`). It does not mark this non-preparation operation as `prepared`.
2. `preparedHomeChat()` returns any marker session without checking `prepared` (`:6180-6187`), so `renderWorkspaceCard()` treats the newly created but still-in-flight Chat as its `session` (`:6221-6227`).
3. The `sending` guard explicitly requires `!session` (`:6239-6242`), and `preparationState()` returns `status: "none"` for this marker because `prepared` is false (`app/web/home-preparation.mjs:109-110`). Consequently `busyReason` is null (`app/web/app.mjs:6274-6282`).
4. If the user opens Work location during the following bind/attachment/draft awaits (`submitHomeRun():5473-5495`), `createWorkspaceCard()` receives `busyReason: null` and `active: false`. It therefore leaves `change-folder`/`disconnect` enabled for a bound Session (`app/web/workspace-card.mjs:301-311`) or exposes folder chooser/connect controls when the bind has not landed (`:313-317`).

The independent minimal card probe in the log produces `change-folder:false`, `disconnect:false`, and `start-edits:false` for that exact post-create/no-busy shape. This is a source-level race even though the affected-suite tests pass: opening the panel while the original Home send is still binding can compete with or revoke the send’s location, violating the ruling that location stays locked while the command is in flight and risking the preparation/Run owner boundary. The owner should carry `SEND_BUSY` through the whole plain-send operation (or otherwise derive the lock from the pending marker after Session creation) and add a regression that opens the panel between `/sessions` and bind.

### F-02 — Light-dismiss focus restoration is conditional, contrary to the registered focus claim (medium, browser confirmation needed)

The author evidence claims Escape, Close, and light dismissal return focus to the Work location entry. The close handler only restores focus when the current active element is the body or still inside the popover (`app/web/app.mjs:7444-7459`). A light-dismiss click on another focusable control leaves focus there because the `now` condition fails. This is deliberate for commands that move to a dialog/diff, but the source does not distinguish those transitions from an ordinary outside click. The parent’s browser review should verify the actual native popover event order; if the focus contract is literal, the handler needs an explicit outside-dismiss path or the evidence claim must be narrowed. No browser was driven in this review.

## Positive checks

- The stable `workLocationButton` identity is retained across strip repaints (`app/web/app.mjs:6368-6412`), and the panel uses the shared `anchorPopover(..., { fit: true })` path (`:7442-7450`); other callers remain opt-in and unchanged.
- Project selection is kept separate from folder binding in the panel, and the affected lifecycle tests cover no-folder staging, lost project-create reply, refused-folder correction, and project/folder permission wording.
- The `fit` option is opt-in; the shared popover callers do not receive the new max-height behavior.

## Decision within this responsibility

The 115/115 tests and static checks pass, and the panel/focus implementation is broadly aligned. F-01 is a concrete lifecycle/permission blocker that the author must correct or explicitly disposition before acceptance. F-02 remains a source/evidence mismatch for the parent’s browser confirmation. This review makes no product acceptance claim.

## Parent browser handoff update

The parent’s independent IAB pass subsequently confirmed New project returns to the Work location entry, folder staging, zero-inference preparation, and Escape focus to `workspace-chip`. It also reproduced the disclosed bound-panel reopen behavior where auto-focus on Disconnect leaves the Work location title/close above the scroll position. Those observations reduce F-02 to a shared focus follow-up; the only unconfirmed branch is ordinary light dismissal onto another focusable outside control. F-01 remains independent and blocking.
