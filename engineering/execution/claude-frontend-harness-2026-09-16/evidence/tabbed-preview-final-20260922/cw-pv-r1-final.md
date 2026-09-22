# PV-R1 independent delta review

Date: 2026-09-22
Candidate: `4698d8b` (tip delivery record `31c09e5`)
Previous source: `736e0f7`
Worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-tabbed-preview-20260921`

## Verification

Bounded focused command under `caffeinate -is`:

```text
node --test tests/preview-tabs.test.mjs tests/work-surface-tabs.test.mjs tests/presentation-view.test.mjs tests/coding-start-friction.test.mjs tests/spark-routing.test.mjs
```

Result: **50/50 passed, exit 0**. Raw log: `/tmp/cw-pv-r1-final.log`.

No browser, provider, credentials, ports, full suite, checkout, or source edits were used.

## PV-R1 acceptance

The delta closes the previously identified Workspace-read lifecycle gap. `closePreviewTab` now calls `retireWorkspaceReads()` for any closed Workspace tab, before either selecting a neighbour or hiding the pane (`app/web/app.mjs:4005-4017`). This applies to active and inactive Workspace tabs.

`retireWorkspaceReads` increments the surface context request id and Workspace tree generation, clears the cached Workspace tree, calls the existing `disposeSurfaceRenderer()`, and clears the surface container (`app/web/app.mjs:4028-4035`). The existing disposer aborts the surface fetch through `invalidateSurfaceFetches()`, aborts renderer control, clears context/info/projection/owned container, and disposes the mounted renderer (`app/web/app.mjs:1369-1390`). Therefore a late fetch/import/update fails the existing surface and fetch guards; reopening creates a new tab and starts fresh reads.

Hiding Preview through `closeSurface` remains separate: it keeps tabs and does not call `retireWorkspaceReads`, preserving the deliberate hide/reopen cache and scroll policy. File/run/draft paths remain covered by the focused suite; no regression appeared.

The added `PV-R1` test in `work-surface-tabs.test.mjs` is source-level lifecycle coverage, while the parent’s real browser gate supplies the public-route check. I found no additional source defect in this delta.

## Scope note

The review accepts the fetch/renderer/tree invalidation correction and the preserved hide/file/run/draft behavior. Visual density and any browser-specific polish remain separate parent grammar/browser follow-up, outside this source-only check.

Disposition: **accept PV-R1**.
