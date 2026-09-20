# 06b terminal Workspace-card review

Date: 2026-09-20. Read-only source check against the final integration tree at `ef2b3c1dd1124252fedb523088cd0182ce32e106`; no files were changed.

## Finding

The captured AX result is a real stale-card path: the conversation is `Completed`, while the open Workspace card still says `Available after this run ends.` and has disabled `Disconnect` and `Stop edits`.

`currentRun()` correctly defines active statuses as `created`, `running`, `waiting_user`, and `stopping` (`app/web/app.mjs:540-565`). The terminal event path is the gap:

1. `pollEvents()` calls `mergeEvents(page.events)`.
2. A terminal `run/status` updates `state.runs` through `mergeRun()`.
3. The changed path calls `renderChat()` (`app/web/app.mjs:1110-1117`), and the terminal branch refreshes runtime/surface state.
4. It does not call `renderAll()` or `renderWorkspaceCard()` after `currentRun()` becomes null.

The 06b addition at `app/web/app.mjs:7757-7771` re-renders the Workspace card only when some caller invokes `renderAll()`. `loadRecentSessions()` after a status event only calls `renderRecentSessions()` (`app/web/app.mjs:1004-1009, 1630-1648`), so it does not repair the open card. The card’s `active` value therefore remains the value captured when it was opened, leaving its terminal label and disabled controls stale.

This is a pre-existing refresh-path limitation made relevant by 06b’s new claim that an open card is re-rendered while Run facts advance. The `currentRun()` projection itself is not wrong; the terminal event does not reach the new card refresh.

## Smallest owner fix

In `pollEvents()` immediately after the terminal `mergeEvents()`/`renderChat()` path, invoke the existing `renderWorkspaceCard()` only when `#workspace-popover` is open, or route that terminal branch through the existing `renderAll()` once. The narrower call avoids unrelated full-page repaint and lets the card’s existing focus/disclosure preservation apply. Add one browser/seam check: open the card during a Run, deliver a terminal `run/status`, then assert `active=false`, `Disconnect`/`Stop edits` enabled, and the text changes from `Available after this run ends.`.

No evidence here suggests a Host or permission semantic defect. This is a frontend event-to-open-card refresh seam and should remain a finite 06b follow-up.
