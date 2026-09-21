# CE-R1 independent delta review

Date: 2026-09-21
Candidate: `4695426be6cd1ea9f7aca2cc8ed1521e6a521af7`
Tree: `/Users/lesprivilege/Projects/.worktrees/courtwork-work-location-20260921`
Scope: CE-R1 production `workLocationLock` wiring, pending-run admission transition, unknown/refused/recovery ownership, and card states. No browser or provider was used; no source files were changed.

## Verification

The candidate worktree was clean at review start. I reran the 16 bounded owner/adjacent suites listed by `checks-ce-r1.txt` with provider environment variables unset, `/usr/bin/caffeinate`, and Node test concurrency 4:

- **122/122 passed, exit 0**
- Raw log: `/tmp/cw-ce-r1-independent-clean.log`

The new CE-R1 tests cover the production lock helper and real `createWorkspaceCard` for the creating, created/unbound, bound/read-back, run-pending, run-unconfirmed, unknown-create and settled-refusal states. They do not import `app.mjs` or exercise the whole `submitHomeRun` navigation transition.

## Finding F-01 — pending Home Send unlocks during `selectSession` (acceptance blocker)

The return fixes the original post-create gap while `state.view` is still Home, but it leaves a concrete window after the Chat is selected and before Run admission is registered.

Source chain:

1. `submitHomeRun()` awaits `selectSession(session.id, { focus: false })` before clearing `state.homeStart` and before calling `submitSessionRun()` (`app/web/app.mjs:5508-5525`).
2. `selectSession()` sets `state.activeSessionId`, switches to `state.view = "session"`, and renders before its session read and again after the read; it then awaits surface/work-thread loading before returning (`app/web/app.mjs:1540-1598`). The Chat is therefore visible while the Home marker is still `{ pending: true }`.
3. `renderWorkspaceCard()` passes `home = state.view === "home" && !currentSession()` and calls `workLocationLock({ marker, home, session, runPending, runUnconfirmed })` (`app/web/app.mjs:6227-6245`). In this interval `home` is false, `runPending` is false, and `runUnconfirmed` is false because `submitSessionRun()` has not reached `state.pendingRuns.set(...)` (`app/web/app.mjs:5619-5622`).
4. `workLocationLock()` only applies the marker lock when `home` is true (`app/web/home-preparation.mjs:154-180`). With `home=false`, a pending non-prepared marker falls through to `null`.
5. The context strip is visible for a loaded Chat with no run (`app/web/app.mjs:6381-6385`), so this is user-reachable while `selectSession()` is awaiting `loadSurface()`/`loadWorkThread()`.

Independent synthetic probe, using the production helper and real card, reproduced the state:

```text
marker = { prepared:false, pending:true, session:{id:"s1"}, sessionId:"s1" }
current session = s1; home=false; runPending=false; runUnconfirmed=false
workLocationLock(...) => null
card fields => change-folder:false, disconnect:false, start-edits:false
```

Here `false` is the `disabled` property, so all three mutations are enabled. The same card also exposes the folder chooser for an unbound session. This allows a user to change or revoke the location after Chat selection but before the original Send reaches `submitSessionRun()`, despite CE-R1 claiming the lock covers the whole operation.

The parent’s gated browser pass covered bind, draft-save and Run-admission holds, but did not establish this `selectSession()`/`submitSessionRun()` interval. The owner should keep the operation lock through this transition, either by carrying the matching marker lock across session view or by registering the Run ownership before the navigation handoff. This review does not choose the implementation.

## Recovery disposition

Existing preparation unknown/refusal paths remain covered by the focused tests: unknown creation stays locked and Check status remains available; a settled folder refusal unlocks and permits same-Chat correction. Run admission uncertainty is represented by `unconfirmedRuns` and returns `PREPARE_UNCERTAIN` after the pending map clears.

A separate residual is source-visible but was not used as an acceptance blocker: a plain-send bind/read-back failure after the Chat exists is not marked `operation.unconfirmed` because the catch path only sets it when `!operation.session` (`app/web/app.mjs:5527-5532`). If that request's effect is unknown, `pending` is later false and the marker has no uncertainty bit, so `workLocationLock()` can return `null`. The author explicitly records lost bind/draft replies as unexecuted in `ce-r1-return.md:122-129`; this needs owner disposition or a targeted recovery test before claiming full unknown-effect coverage.

Decision: **return for F-01 correction and re-review; do not claim CE-R1 acceptance.** CE-F2 remains outside this review scope.

## Reachability re-review — F-01 withdrawn

The initial F-01 probe represented a state that the ordinary plain Home path cannot expose to a user. A plain Home create posts only `projectId`, `sessionId`, `title`, and `permissionMode` (`app/web/app.mjs:5461-5469`); the Host's session-create owner likewise creates only the ordinary Session/workspace/permission fields and has no extension binding input (`app/server/service.mjs:998-1013`).

`selectSession()` explicitly sets `state.surface.open = false` before rendering (`app/web/app.mjs:1540-1559`, `1590-1594`). `loadSurface()` returns immediately when the surface is closed (`app/web/app.mjs:5127-5134`), and `loadWorkThread()` returns immediately when the Session has no `extensionBinding` (`app/web/app.mjs:5034-5036`). Their awaited returns therefore drain as microtasks; no user event can intervene before `selectSession()` resolves back to `submitHomeRun()`, which clears the Home marker and calls `submitSessionRun()`. The latter registers `pendingRuns` synchronously before its first network await (`app/web/app.mjs:5619-5622`).

The synthetic helper/card state remains a useful negative unit shape, but it is not an operator-reachable plain Home transition. **F-01 is withdrawn and is not an acceptance blocker.** Within the bounded CE-R1 scope, the focused result is therefore **122/122 pass; no independently confirmed production regression**. The explicitly unexecuted post-create bind/read-back lost-reply case remains recorded as an unverified residual and was not expanded here.
