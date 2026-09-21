# 06d independent source review

Date: 2026-09-22
Tip: `9860c6ce4c6084dc2385f41ad500d40c06fa050f`
Source B: `736e0f7`; A1: `90be9af`; A2: `dfc90b7`; stated base: `b714c08`.
Worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-tabbed-preview-20260921`.

## Verification

Bounded focused command under `caffeinate -is`:

```text
node --test tests/preview-tabs.test.mjs tests/work-surface-tabs.test.mjs tests/presentation-view.test.mjs tests/coding-start-friction.test.mjs tests/spark-routing.test.mjs tests/chat-work-shell.test.mjs tests/entry-audit.test.mjs
```

Result: **58/58 passed, exit 0**. Raw log: `/tmp/cw-06d-independent.log`.

The run covered object identity and duplicate opens, recorded versions, cross-Work scope, active/inactive/last close model behavior, keyboard/focus strip behavior, file late reads after switch/close, workspace/presentation wiring, Spark routing, and the A1/A2 adjacent regressions. No full suite, browser, provider, credentials, ports, or source edits were used.

## Accepted behavior

- `preview-tabs.mjs` keys tabs from existing owner identity fields and scopes sets by `sessionId`; same object reselects, recorded versions remain distinct, and Work A/B sets do not cross.
- `createFileView` generation/abort guards prevent a switched-away or closed file response from painting.
- Run reads use `runReadGeneration` plus an AbortController; tab selection and session changes invalidate older reads. Presentation callbacks require the selected presentation ref.
- Draft/session continuity and selected-tab scroll restoration are wired through existing session maps and the pane lifecycle. The in-memory scope map is intentionally page-lifetime state, matching the order's stated restoration policy; it is not persisted or a domain registry.
- A2 keeps the title/close initial focus and does not alter command locks. The affected tests pass.
- Removing the old Spark rail hook/polling does not break the public Spark route in the focused six-case `spark-routing` coverage: stable bound-owner selection, no invented Work session, and stale navigation cancellation all pass. No actual Spark delivery claim is made by this source review.

## Concrete return: closed Workspace tab leaves its fetch live

`closePreviewTab` aborts only the active Run controller and pauses the file reader (`app/web/app.mjs:4005-4016`). It does not call `invalidateSurfaceFetches()` for a Workspace tab, whether that tab is active or inactive. `loadSurface`'s acceptance guard (`:4899-4925`) checks session/epoch/request/controller identity but does not require `state.surface.open` or that the Workspace tab is still selected after the request starts.

Reachable sequence:

1. Open a Session's Workspace tab; `loadSurface` begins `/sessions/:id/surface`.
2. Close that Workspace tab before the response arrives (or switch away, then close it while another tab is active).
3. The request is neither aborted nor invalidated. Its response can pass `guardForSurfaceFetch`, update `state.surface.info/projection`, and mount/update the hidden Workspace renderer after the tab is gone.

This violates the order's close rule that an in-flight read for a closed tab is aborted and its late answer ignored. It does not recreate the closed tab, but it can retain a renderer and mutate hidden surface state after close. Smallest fix: on closing any Workspace tab, invalidate/abort the surface fetch associated with that tab before removing it; keep the existing renderer lifecycle policy otherwise. Add a delayed Workspace response regression through the public close-tab route.

## Cosmetic follow-up

The delivery's visual density/toolbar spacing and any broader tab-strip polish need the parent browser/grammar review. I found no source-level behavior defect to add for those concerns, and no visual acceptance is inferred from this focused test run.

## Disposition

Accept A1, A2, and the tab identity/scope/focus/late-file-read portions of B within the tested scope. Return B for the concrete Workspace-fetch invalidation above before claiming the close lifecycle fully satisfies 06d. The old Spark polling removal has no focused routing regression; keep any visual/density observations separate from this behavior return.
