# E1 parent review — combined Host/Kit journey

2026-09-23 · Parent Arch/Astra. Frontend fixed at `8fd2b867d8ced369974f053d2ece44b36dae1995`, including06E-R1 sourcecd5e586. Actual combined review tree `codex/e1-combined-review-20260923` at **4091b8bceec89a46d25a526e4390860cc9c9c03e** contains accepted K3 main354a3b5, those frontend bytes, the exact two static routes and backend capability2b6f2e4. **Hold frontend main acceptance for E1-R1/R2/R3 below.** Original Claude remains writer; its source tree is not cleaned or changed by parent.

## Backend requests disposed

- **R-1 adopt:** two exact static routes, `agent-choice.mjs` and `agent-chooser-view.mjs`, are implemented with their real files in the isolated combined candidate. The bidirectional manifest passes. Do not land the names alone in main before their files. Parent now grants the original Claude owner these exact two `server/index.mjs` entries as an atomic part of its frontend delta; this narrow exception does not transfer broader Host ownership.
- **R-2 adopt and accept:** Sol source `2b6f2e488a6e69089e45b0a24fcd4d8f3942d4a2`, integrated main **a59d188ea48f8c20fb4ed3f23f34b6e96e79fb2d**, advertises `compatibility.runtimeSelection: "expectation-v1"`. It names the already accepted guard; no schema, new registry or admission behavior is introduced. Author41/41, parent source review and actual combined30/30 plus the browser's stale-Send refusal support the finite change.
- **R-3 adjust documentation only:** actual Session scope is not limited to `chat/global`: this ordinary project Chat reports `project`. Preserve existing scope values and global exclusion; do not require `kind === "chat"` to show valid ordinary Chats.

The backend flag is ready for Claude to consume from main. No need to wait for the retired K3 writer or fork another backend loop. Main does not yet contain the frontend modules.

## E1-R1 — adopt, blocking: active-to-terminal refresh re-enters rendering

A real browser Send admitted and completed a Kit Run, but the page remained on **Stop working / Working for0s** with **Connection lost. Reconnecting…** while its transcript showed Completed. [Screenshot](browser/05-kit-run.png), [DOM](browser/05-kit-run-dom.txt), [console](browser/05-console.json) and [actual Host receipt](browser/05-run-receipt.json) are separate evidence: the backend had completed with the correct profile/hash/Kit/unchecked reading and retained context.

At `app.mjs:3815`, `syncAgentChoice` invokes `refresh()` before changing `agentChoiceRunActive`. The actual controller emits loading synchronously before its first await, so its app subscription re-enters the same render with the old active flag. [Luna source assessment](luna-terminal-assessment.md.txt) and a [bounded ordering model](luna-terminal-ordering.log) show20 nested refreshes before a sentinel; the ordering model is not a full production harness. The browser console independently records repeated null-state render errors on that exact refresh/subscription path. Reload restores Send; reload is not an acceptable normal completion action.

Original frontend owner must update/guard lifecycle markers before synchronously emitting calls and ensure one refresh per actual terminal transition. Add a regression through production wiring/controller+view, then run one real Host Run to terminal and demonstrate Send restored, no recursive reads, no console error/reconnect banner, unchanged result/binding and preserved draft. Do not patch a test-only stand-in or hide console errors.

## E1-R2 — adopt: first Settings visit drops the profile destination

From a fresh page, choosing Kit reviewer then **Edit Kit reviewer in Settings** lands at Developer Overview with no expanded target row. [First visit](browser/03-settings.png), [settled DOM](browser/03-settings-first.txt). Returning and using the same command a second time expands and focuses the row: [second visit](browser/04-settings-second.png), [DOM](browser/04-settings-second.txt).

The app starts Settings/Runtime loading asynchronously and immediately calls `runtimeView.openResource`; without a loaded resource map, that call returnsfalse and loses the destination. Retain the requested resource identity in the existing owner until the correct Session's read settles; preserve existing late-read/focus guards and invalidate on departure. Cover first visit and already-loaded visit, including slow read and leaving before it finishes. Existing `runtime-view.mjs` may be changed narrowly for this owner seam; no duplicate Settings controller.

**E1-F1 adjust copy in the same return:** the reached source panel is a read-only inspection surface, not a direct profile/Kit editor. Use a truthful View/Inspect label until an actual editable owner path is implemented. Correct the delivery's assertion that this row already edits sources. Complete Kit editing remains a named follow-up, not achieved by raw JSON appearing in a panel.

## E1-R3 — adjust: derive navigation visibility and Send from the current read

[Luna original review](luna-review.md.txt) identifies `syncAgentChoice` capturing state before a synchronously emitting load, then deciding visibility without matching Session/read readiness. [Correction](luna-scope-correction.md.txt) withdraws the unproven claim that an old label necessarily remains and rejects a `kind === chat` restriction. The bounded source finding is mismatched/unready state used as a visibility input; no separate browser reproduction is claimed.

Keep current-session ready non-global state as the authoritative input. During ordinary Chat loading/refusal, do not let hiding the chooser accidentally remove its Send safety/read-error recovery; preserve visible loading/retry guidance as needed. Home with no Session and the real global Attention path keep their existing behavior. Add delayed-read navigation cases for project Chat→another ordinary Chat and global scope; original owner may extract the production coordination seam so tests execute the actual logic.

## Verified journey and limits

1. **Open and preview:** actual ordinary Chat, keyboard Home highlights Kit reviewer, source/Kit declaration reads unchecked; selection is one real Session CAS. [Preview](browser/02-kit-preview.png). Geometry at1440×1000 uses the existing compact anchored menu; no new visual direction selected.
2. **Settings and return:** first destination fails asR2, second succeeds; Escape returns focus to Agent with exact `Review the Kit handoff.` draft and caret23/23. Read-only destination/copy gap remains explicit.
3. **Send and history:** one actual Composer Run completes through real Host/Pi with the Kit context. Backend history passes; terminal UI fails asR1. Recorded profile is `local:e1-kit-reviewer`, config revision4.
4. **Stale selection:** after reload, parent independently changes actual selection to Notes/revision5. Browser Send refuses with the owner message, refreshes the effective Agent to Notes and keeps the exact second draft. [Screenshot](browser/06-stale-refusal.png), [DOM](browser/06-stale-refusal.txt), [before/change](browser/06-external-change.json), [after Host facts](browser/06-after-refusal-receipt.json). Run count stays1 and [total provider requests stays1](browser/request-count.json); old Kit context remains unchanged after the selection edit.
5. **Narrow chooser:**390×844 fine-pointer capture is readable with Close/source action reachable; [screenshot](browser/07-narrow-chooser.png). It covers much of the reading surface as already selectedA does; this is not native touch/zoom/reader acceptance.

OpenAI computer-use operated the in-app browser through CUA. Initial inventory connection failed, but direct in-app tab creation recovered; no alternate browser or user service was used. The temporary viewport was reset, tab closed and synthetic Host stopped. The fixture's control token/data stayed outside Git and were not personal credentials. Only harmless synthetic data entered the test provider. Screenshot01 predates the capability addition and is historical setup evidence only; the meaningful combined journey above uses4091b8b.

[Luna57/57](luna-tests.log) passes controller/profile/friction scope. [Initial combined20/20](combined-frontend-tests.log) covers Agent controller/static manifest; [final combined30/30](combined-kit-static-tests.log) covers24 Kit Host and6 static tests. These are targeted passes, not a full product suite or frontend acceptance. Native zoom, screen reader, forced colours, touch, dark-mode rerun, long-name stress and material return were not rerun in this parent round; critical production failures stopped broader visual acceptance. Home pre-Session Agent selection and bound-Run presentation in the chooser remain original-owner gaps, not backend blockers or claimed delivery.

## Next ownership and preservation

Claude should merge current main into its original branch (preserving reviewed ancestors), apply the exact R-1 static entries, resolve E1-R1/R2/R3 and E1-F1, and rerun the combined Kit/stale-selection paths before releasing a fixed candidate. No next frontend journey starts during this return. The parent combined review branch/tree is retained as a reproducible failed candidate, not a new product line. Backend Sol tree preservation and ordinary main push are recorded in the parent status; no Pages work, user-service migration or deployment follows.

Backend preservation complete: [receipt](backend-preservation.json) records9,633 entries /471,457,106 file bytes, physical archive restoration equality and Git bundle clone/fsck verification. Clean source2b6f2e4 was fully integrated with no cwd holders before only its ended tree/branch was removed. Archive ref remains. The failed combined review candidate and active Claude tree remain. The temporary review dependency symlink was removed; no test Host remains.

Evidence whitespace exception: `luna-terminal-ordering.log` preserves the numbered blank source line3823 with its tab, exactly as produced by the reviewer. It is the sole new raw-log whitespace exception; source and active documentation checks pass.
