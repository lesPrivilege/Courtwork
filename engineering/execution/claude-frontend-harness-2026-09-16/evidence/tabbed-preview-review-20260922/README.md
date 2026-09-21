# 06d independent review — A accepted, one B return

2026-09-22 · Parent Astra. Author tip `9860c6ce4c6084dc2385f41ad500d40c06fa050f`; product B `736e0f7`; A1 `90be9af`, A2 `dfc90b7`; base `b714c08`. **A1/A2 accepted and locally merged as `cd6856f31ad9354079417c8f1af2aae039a64aa3`. B is held for PV-R1 below.** The combined author tree/branch remains intact because B is not yet integrated. No cleanup deletion or user Host restart.

## Evidence and scope

[Luna source review](cw-06d-independent.md) and [log](cw-06d-independent.log): 58/58 focused tests, exit 0. Parent's additional [A-focused suites](cw-06d-a-independent.log): 42/42 on the candidate. [Actual-main A integration](cw-06d-a-main.log): 87/87, exit 0, including real profile/card, coding-entry and preparation/plain-Send owner suites. Author full 1388/1388 belongs to `736e0f7` and remains author evidence; no independent full suite or B integration is claimed.

Astra used OpenAI computer use against an independent real Host on 8977, with the author's inspected synthetic fixture setup. Seed objects were made through the Host's Local test provider; no personal key or paid provider. A separate read-only test proxy on 8978 delayed one actual Workspace response without changing it. User 8787 remained PID 65142; 8899 was not listening when checked. Owned review services/tabs were stopped after capture.

Executed browser checks:

- [Recorded v1](01-recorded-v1.png) opens directly from Chat; body/provenance remain readable. Clicking the document's Section 6 outline moved the actual file reader to scrollTop **1832.5**. Opening recorded v2 of the same path produced another tab; selecting v1 restored 1832.5. [Two-version state](02-two-versions.dom.txt).
- Delete on the selected v1 tab selected its right-hand v2 neighbour. Escape retained the Chat draft. Work B showed only its Workspace tab; returning to Work A restored its v2 tab and the original unsent draft. Delete on the last tab hid Preview and preserved the draft. These are actual page actions, not application-state injection.
- A2 bound long-path Work location opened on **Close**, scrollTop **0**, with title visible at 1280×720 and at emulated390×844. [Desktop capture](03-location.png), [narrow DOM](04-location-narrow.dom.txt). This accepts the local initial-focus correction; the author retains broader prepared/unknown before-after measurements.
- Latest Run remains reachable through Chat overview → Work history → Latest · Completed, opening [the Work tab](07-latest-work.dom.txt). The concern that deleting the old card removed this entry is **rejected**. Luna additionally located Measurements → Inspect run in source.

## PV-R1 — adopt; close must invalidate the Workspace read

Closing a Workspace tab currently aborts Run/file reads but does not invalidate the pending `/sessions/:id/surface` fetch. `guardForSurfaceFetch` checks Session/epoch/request/controller identity, which all survive this close, so a late response remains eligible to update hidden Workspace state and, for a renderer-bearing response, mount/update its renderer.

The independent [proxy](cw-06d-workspace-gate.mjs) held the real 200 response after opening Workspace. Astra clicked **Close Workspace · Parcel brief review**, leaving no tab/Preview visible: [closed DOM](05-workspace-closed.dom.txt). Before release there was no client disconnect; [proxy log](cw-06d-workspace-gate.jsonl) records `clientDestroyed:false` on release and a normal completed response afterward. [Visible state](06-after-late-workspace.dom.txt) remains closed. This proves the fetch stays live; **no tab resurrection is claimed**. The hidden-state/renderer eligibility is established by the production source chain in Luna's report, not by reading private browser state. This particular synthetic Session has no contributed renderer, so an actual late renderer mount is not claimed as browser-executed.

Return to the original 06d owner in the same tree:

1. Invalidate/abort the read owned by a Workspace tab when that tab is closed, including closing it after switching to another tab. Use the existing fetch/renderer generation owners and check the tab's lifetime; do not build another cancellation registry.
2. A stale fetch, renderer import or delayed continuation must not mount/update a closed tab or interfere with the selected file/presentation. Closing/hiding distinctions remain explicit: a hidden but retained tab may follow its documented cache policy; a closed tab cannot accept its outstanding read.
3. Add a regression through the actual page/close route: open Workspace → hold response → close → release; also switch away then close the inactive Workspace. Include reopening, which must admit a new read rather than revive the old one. Assert ignored/aborted old work and a working new view. Preserve existing file/run guards, draft/scroll and no-Run-cancellation behavior.

This is the only demonstrated behavior return. Keep already accepted A1/A2 and B's identity/version/scope/normal-close behavior; re-review the correction delta rather than redo the whole feature.

## Scope decisions and remaining follow-ups

- **Adopt** removal of Spark's old rail polling because that card is removed; the existing Spark route remains covered by the focused routing tests. This is not a new Spark delivery claim.
- **Adopt** the user-requested Preview label and multi-object/version tabs in place of the old card launcher/single-document-tab rule. The corresponding registry/test updates are within B's scope and remain pending with B.
- **Keep separate** density/stacked chrome work under [Visual / Spatial Grammar](../../../../design/visual-spatial-grammar.md) and the read-only convergence task. The screenshot shows room for composition refinement, not a measured WCAG violation. This review does not claim a final density baseline or require a whole-site redesign for PV-R1.
- **Register, do not implement here:** Back/Forward after native macOS controls is a later shell/navigation candidate. The existing inset/toolbar hooks provide geometry only; native hit testing, draggable regions, fullscreen and keyboard/focus behavior still need host evidence. The author's “no new mechanism needed” is not accepted as proof of native completeness.

Native shell, real200% zoom, reader/VoiceOver, forced-colors and touch remain unexecuted. This parent browser pass did not repeat the full1920 layout, dark mode, every slow-file case or author34-case campaign; their author evidence is retained separately. No new library, backend Browser, permission semantics, push/deploy or baseline replacement.
