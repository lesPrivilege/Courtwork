# K5 independent review

Reviewed candidate `/Users/lesprivilege/Projects/courtwork-kit-profile-editor-20260923`, branch `claude/kit-profile-editor-20260923`, HEAD `756ec6d4dc3d0ead464165b3af9244c824fba49f` (product source), parent/baseline `c91ff759bd6ed315c9f3e2eef709d6c792420b71`. Read the project instructions, current status, K5 order and author evidence record. Candidate worktree was clean at review end; no source or candidate evidence files were changed.

The requested six-file narrow suite passed **65/65** (command and result in `65-tests.log`). Two additional deterministic controller probes passed as reproductions (script and results in `probes.mjs` / `probes.log`).

## Findings

1. **R1 — observed configuration revision does not invalidate current preview.** In `app/web/profile-editor.mjs`, `editorReading` computes `previewCurrent` from draft text and base revision alone (lines 72–74), although it also receives the latest owner revision as `facts.revision`. Probe `K5-PREVIEW-REVISION-01` changes known revision 7→8 and gets both `configMoved: true` and `preview.current: true`. The UI therefore continues treating the preview as current, including its composition and “Save now” gate. This violates K5’s rule that any observed config revision change invalidates a preview. The parent independently reproduced the visible stale preview after changing Selected profile to Notes at revision 8. CAS still prevents a stale save from committing; this is a decision-reading mismatch, not a demonstrated stale write.

2. **R2 — concurrent Save calls can dispatch duplicate PUTs.** In `save()` (lines 247–255), the in-flight state is set only after awaiting `sha256Hex`. Two same-turn invocations both pass the status guard and then dispatch. Probe `K5-SAVE-DOUBLE-01` observed two PUTs before either adapter reply. Whole-config CAS should allow at most one concurrent write to win, but the loser may produce a transient conflict and unnecessary reconciliation. A synchronous guard/status transition before the first await would close this race.

3. **Eligibility can become stale for an open editor.** `rowActions` applies `editEligibility(snapshot, resource)` when exposing the Edit action (`app/web/runtime-view.mjs` around line 1072), but the render path appends a previously-open panel solely from `editing.has(resource.id)` (around lines 1231–1233). After selection changes, an already-open panel is not revalidated against the new snapshot and its controller remains save-capable. This is an identity/eligibility ownership seam adjacent to R1: selection/revision changes must make the panel’s readings and available actions reflect current owner facts. Parent has a direct UI reproduction; Host CAS prevents a stale revision write.

No finding against the controller’s unknown-outcome read-back, conflict draft preservation, frozen active-run handling, per-Session/profile slot keying, or typed Host refusal handling in this bounded review. Controller Save's active-run check is reflected in the view and remains subject to Host authority; direct synthetic controller invocation is not evidence of a UI bypass.

The author’s K5 journey and evidence remain author evidence. This review adds no product acceptance, integration, merge or release claim. Parent retains rendered acceptance and final disposition.
