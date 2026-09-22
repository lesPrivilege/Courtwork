# E1 live adapter contract handoff

## Current adoption — 2026-09-23

[K3 parent final acceptance](../kit-run-final-20260923/README.md) integrates source8e7171c/packet84d6dfa at main65c3b30 with RuntimeStore21. The concrete backend interface below is now available in main. E1 UI/combined journey remains the original Claude and parent acceptance scope; no client draft is reclassified as Host persistence. The original handoff snapshot below preserves its then-candidate status and source pin.

## Original parallel handoff

2026-09-22 · Parent Arch consumes the K3 author's stable [contract snapshot](contract-at-76d91d6.md), [source pin](source.json), from76d91d6 with Store candidate eb32011. These are **candidate implementation facts for parallel frontend work**, not a claim that K3/schema21 is accepted or available in main. The backend still owns final fixed-byte evidence and its release.

Claude should adapt selectedA to this actual Runtime Control interface rather than porting the synthetic06a per-profile store shape. Profile identity/source hash and whole-configuration revision are distinct facts. Builtin General has no imported source hash; null/inherit and explicit General remain distinct commands. Model scope stays global future Runs.

For Send, use `runtimeSelection:{revision,profileId,sourceHash}` from a fresh effective reading. The candidate service checks it against the admitted binding after original-command replay lookup; stale new intent receives409 runtime_selection_conflict with no Run/provider request. The parent inspected those exact service lines and the author race test, but has not yet independently accepted the final K3 tree. Keep the actual bound response separate from any newer local draft.

A local `{profileId,sourceHash,observedConfigRevision}` draft is not Host persistence or reload recovery. PUT selection uses existing config CAS; a lost reply requires readback without blindly overwriting another change, and no invented operation receipt. `active_run` blocks actual configuration edits; do not promise queuing/hot-swap. Other admission/resource/compatibility/permission errors remain distinct.

Read a recorded Run from its recorded binding, not current profile detail. For no-Kit/v1 Runs, use the recorded Runtime Control composition when available; missing historical fields must remain missing rather than filled from today's labels or revisions. Compatibility declaration absence stays unchecked and does not itself become a verified unsupported blocker.

Frontend app/web changes remain with original Claude06e/E1. Backend owns Host/API/Store/static allowlist. Publish required module names/API gaps to the backend owner instead of editing its file concurrently. Both lanes consume [the implementation boundary](../../frontend-backend-live-integration-20260922.md); parent accepts their combined actual journey.
