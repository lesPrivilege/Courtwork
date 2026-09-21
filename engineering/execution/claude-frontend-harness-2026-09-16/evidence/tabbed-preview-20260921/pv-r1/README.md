# 06d PV-R1 return · Workspace close invalidates its reads

Answers the 2026-09-22 review; its packet is on main at `6da9347`, `engineering/execution/claude-frontend-harness-2026-09-16/evidence/tabbed-preview-review-20260922/README.md`. Correction commit **`4698d8b`** (on B `736e0f7`, same branch and tree). A1/A2 are unchanged.

**Change.** `closePreviewTab` calls `retireWorkspaceReads()` whenever the closed tab is a Workspace, selected or not. The reads are retired through the existing owners:
- `state.surface.requestId` and `workspaceGeneration` move on.
- `disposeSurfaceRenderer()` aborts the surface fetch through `invalidateSurfaceFetches()` and clears the renderer context, so a late import or mount fails `guardForSurface`.

Reopening starts new reads. Hiding Preview (Escape, ← Chat, Hide, Settings) is not closing, so a retained hidden tab keeps its reads and cache.

**Regression through the real page** (`harness/run.sh <app> workspace-close <variant> …`). The page's own fetch holds the real `/surface` and `/workspace` answers and records whether each signal was aborted when it is released.

| Check | `736e0f7` (before) | `4698d8b` (after) |
|---|---|---|
| R1 open Workspace (held) → close → release: surface read aborted | ✖ `aborted:false` | ✔ |
| R1 no Workspace state (`info`/`workspace`/`context`), no tab afterwards | ✖ `info` and `workspace` filled after close | ✔ |
| R2 switch to a file, close the inactive Workspace → release: read aborted, no state; the file stays selected and readable | ✖ (file ✔) | ✔ |
| R3 reopen admits a new read and shows the files | ✔ | ✔ |

[Before checks](workspace-close-before-checks.json) (4/7) · [after checks](workspace-close-after-checks.json) (7/7) · measurements beside them. The test Session has no contributed renderer, so a late renderer mount is not browser-executed; it is covered by the `guardForSurface` source chain and the `PV-R1` pin in `work-surface-tabs.test.mjs`. The tree read carries no abort signal: its answer is dropped by the generation guard, and R1/R2 show `workspace` stays empty.

**Regression evidence.** B journey rerun 34/34 ([checks](tabs-after-regression-checks.json)). Full suite at `4698d8b`: 1389/1389, exit 0 ([log](full-suite.log)). No change to file/run guards, draft, scroll or run cancellation.
