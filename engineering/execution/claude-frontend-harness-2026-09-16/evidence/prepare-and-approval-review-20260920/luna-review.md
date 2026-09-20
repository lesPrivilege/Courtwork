# Prepare-before-inference bounded review

Date: 2026-09-20. Non-author review of `afc9f3193bf5b5913da566937e35e1554da14935` in `/Users/lesprivilege/Projects/.worktrees/courtwork-prepare-approval-20260920`, based on `962046d`. Source and main were not edited; no provider, 8787, 8899, or external message was used.

## Verification

Targeted command from `app/`:

```text
node --test tests/prepare-and-approval.test.mjs tests/workspace-card.test.mjs tests/candidate-ui.test.mjs tests/check-approval-revision.test.mjs tests/workspace.test.mjs
exit=0
tests 56
pass 56
fail 0
```

The 12 preparation/approval tests, Workspace/candidate UI, approval CAS, and workspace safety suites pass. No full suite was rerun. Raw output and adversarial probes are in `/tmp/cw-prepare-approval-luna-review.log`.

The candidate’s recorded source commit is `afc9f3193bf5b5913da566937e35e1554da14935`. The delivery’s checks record reports 12/12 new tests, 69/69 owner tests, and 1302/1302 full-suite tests; this review independently reran the narrower 56-test set.

## Findings

**Preparation sequence and no hidden Run: pass.** `home-preparation.mjs` persists each client identity before its command, reuses the same session/bind/candidate IDs after a lost reply, reads the Session between steps, and issues no `/runs`. The real-Host test confirms an active candidate with zero events. The tests cover lost replies after each command, failed/no-Git/mismatched receipts, half-complete recovery, repeated preparation, and next-send reuse. Browser evidence records reload-preserved draft/materials and zero duplicate create/bind/candidate calls.

**Approval historical identity: pass.** `approvalCandidate()` and the recorded identity renderer read only the permission payload. Missing candidate fields remain absent, recorded zero remains zero, and a decided approval keeps the old candidate/revision after the live candidate is stopped and replaced. The check approval correctly shows its recorded write revision without inventing a candidate revision.

**Confirmed blocker: partial preparation loses the module’s retry route.** If the bind or candidate command reaches the Host but its reply is lost, `prepareHomeChat()` retains `operation.session` and exits through its `finally`. `renderWorkspaceCard()` then uses `preparedHomeChat()` and passes `draft: null` (`app/web/app.mjs:6238-6255`), so the Home preparation owner (`onPrepare: () => prepareHomeChat()`, `app/web/app.mjs:6163-6172`) is no longer reachable. For a missing candidate, the card exposes ordinary `workspace-card.mjs:startCandidate()` (`:305-340`), which mints a new request/candidate identity instead of reusing the persisted `candidateRequestId`/`candidateId` owned by `home-preparation.mjs:97-109`. A lost bind reply similarly leaves the marker’s stale pre-bind Session visible and routes the user to ordinary binding controls. This contradicts the delivery’s claim that the persisted marker recovers each lost-reply step through the actual UI. The seam helper tests pass because they call `prepareChat()` directly; they do not exercise the post-error Home card route.

Smallest fix direction: keep a “Resume preparation” action owned by `prepareHomeChat()` while the marker is prepared but missing binding/candidate, or keep the preparation draft owner attached until all three receipts are read back. That action must reuse the persisted IDs and perform the Session read-back before exposing ordinary controls.

**Confirmed blocker: pending Home preparation leaves destructive/reentrant controls enabled.** The card computes `busy` as `pending || choosing || active` (`workspace-card.mjs:138`), but the Home draft exposes `draft.preparing` separately. The adversarial DOM probe produced:

```text
{"removeDisabled":false,"startDisabled":false,"startText":"Sending…"}
```

Thus `Remove` can clear the staged path while `prepareHomeChat()` is awaiting the three commands, and `Start private candidate` is displayed as `Sending…` but remains enabled. `prepareHomeChat()` itself rejects reentry, but the UI still permits conflicting state changes. The minimal local correction is to include `draft?.preparing` in the card’s busy calculation and cover Remove/start disabled during preparation.

**Secondary adversarial edge:** `prepareChat()` treats any active Session binding as sufficient and does not compare `binding.rootPath` with its `rootPath` argument (`home-preparation.mjs:72-95`). A stale marker/session with an active binding to another folder causes inspection and candidate creation against the existing binding, silently ignoring the requested path. Current Home controls lock the path once a Session exists, so this is lower risk than the unreachable retry route, but the helper contract should either reject a mismatch or explicitly rebind.

**Confirmed lifecycle blocker: opening the prepared Chat from Recent and sending does not retire `homeStart`.** Recent navigation calls `selectSession()` (`app/web/app.mjs:1724`), and ordinary first send goes through `submitSessionRun()` (`:5540`); neither clears or marks the prepared Home start. The only retirement is in the Home-specific `submitHomeRun()` path (`:5509-5512`). Consequently, after a prepared Chat is opened from Recent and its first message is sent, the Home marker can still render “Chat and private candidate are ready. Nothing was sent; send to start work in them.” and `startNewSession()` still refuses a new Chat because `homeStart.session` remains set (`:6603-6609`). This is separate from lost-reply recovery and needs a small lifecycle handoff when the prepared Session’s first ordinary Run is admitted: clear the Home marker/draft preparation status only after the matching run receipt is accepted, while preserving the Session’s own draft/material state.

## Disposition

Adopt the approval projection and the normal successful preparation path. Hold acceptance of the complete preparation UX until the two concrete UI recovery issues above are corrected and covered at the Home card seam. No Host/backend gap was found for the requested preparation or approval identity facts.
