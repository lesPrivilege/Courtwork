# K5 correction delta review — acceptance held

2026-09-24. Fixed product `991a0c600d5abc6a8fdd6d13adc1ac0a1b137da1`, author packet `dd0947d778d882750172fefebb2d1b6af98eebaa`, branch `claude/kit-profile-editor-20260923`. Candidate was clean. Main remains `86847b2`; existing untracked user files are untouched. This continues the [original review](../README.md), not a new implementation lane.

The initial uncommitted review present at pickup is preserved [verbatim](initial-delta-review.md.txt). Its Computer Use-unavailable limit is superseded by the successful current-session OpenAI browser work below. Candidate source remains unchanged.

## K5-R2 — keep open: reconciliation releases an outstanding Save

**P2.** `app/web/profile-editor.mjs:356–361` (`keepMine`; the adjacent `useCurrent` has the same reset) accepts a fresh source while Save is still pending, then clears `slot.save` to idle. The view offers these reconciliation actions without a saving guard at `app/web/profile-editor-view.mjs:131–144`.

The [deterministic public-controller probe](reconciliation-probe.mjs) uses synthetic CAS-shaped owner responses. First Save writes revision 8 but its response is held. The person types newer text, returns to Settings (which can read revision 8), explicitly reads the source, and chooses Keep my text over the current source. State changes from `saving` with `fresh.revision:8` to `idle` with Save enabled. A second Save sends a second PUT before either response returns. Both writes pass sequential CAS; revision reaches 9. [Actual output](reconciliation-probe.log). This is a controller reproduction plus source-confirmed UI reachability, not a browser or real-Host reproduction; no data corruption is claimed.

Run the probe with `node <path-to-reconciliation-probe.mjs> <candidate-worktree>`. It asserts the current bug (two outstanding saves); the correction regression must assert at most one outstanding Save.

Original Claude should preserve the per-slot outstanding Save ownership through fresh reads and both reconciliation actions. Prevent these actions from releasing or replacing a pending submission; keep newer typing recoverable, and preserve unknown/readback semantics. Cover a delayed successful response, newer typing, fresh source reconciliation, and a repeated Save. The synchronous double-click fix itself is retained.

## Preserved progress and evidence limits

- Parent reran the original two probes against the corrected tree: one PUT for direct concurrent Save and `preview.current:false` at known revision 8. [Output](original-probes.log). Its hard-coded `sourceSha` remains the historical `756ec6d` label; executed import points at the corrected candidate.
- Parent independently ran the five adjacent suites (Agent choice, pending Settings destination, Settings navigation, semantic guards, Kit preview): [48/48](adjacent-tests.log). Interaction and spacing lints and correction diff whitespace checks pass.
- K5-R1's core revision/suspension implementation addresses the original finding at code/probe level. This is not complete rendered acceptance.
- K5-F1 source uses body 14px/21px and candidate reading 15px/24px. Parent inspected the supplied author screenshots for suspension, narrow actions/candidate, dark narrow and 1.5 text scale, and read the geometry. No obvious clipping was seen in those images; these remain author captures, not a new independent capture.
- Author 23/23, 71/71, full 1666/1666, six new browser scenes and sixteen rerun scenes remain author evidence until separately executed. Full suite was not repeated by parent.
- Computer Use / Browser control is unavailable in this session. No current browser journey, native zoom/200%, screen reader, forced-colors or touch check was executed. The original K5 order explicitly requires parent OpenAI computer-use acceptance; this remains open.

No product edits, merge, push, deployment, accepted-precedent promotion, service operation or cleanup. The correction returns to the same original owner and preserved worktree.

## Current-session independent confirmation and real browser counterexample

GPT-6 Luna [independently consumes the fixed delta](luna-REPORT.md): [23/23 controller tests](luna-controller-tests.log), [original fixed probes](luna-original-probes.log), and [the pending-reconciliation reproduction](luna-reconciliation-probe.log). This confirms the earlier record without changing either checkout. The first synchronous double-submit defect is fixed; the same R2 single-outstanding-save invariant still fails through reconciliation. No new roadmap item or backend lease follows.

Parent OpenAI computer use successfully opened a fresh synthetic Host at991a0c6 using the existing [Host fixture](../host.mjs.txt), on a random loopback port and disposable data. The original R1 browser sequence now works: edited profile preview at revision7 → select Notes → editor suspended/read-only with **Previous preview · not current**, no current Save-now row → select Kit reviewer again → explicit source read/reconciliation needed to resume. [Suspension text](suspended.txt), [image](suspended.png). Parent accepts this bounded R1 correction.

The remaining R2 path was then reproduced through real UI and real Host CAS, with only response delivery delayed:

1. After explicit return/reconciliation, the editor's base is revision9. Click Save for source version2. CDP Fetch interception holds the **200 response** at the response stage for this local `runtime-control` fetch; the Host write already succeeded.
2. Type source version3 while the field stays editable. Click the existing **Refresh the runtime snapshot**, allowing GET responses through. The UI observes revision10 and offers **Read the current source** while still showing **Saving…**.
3. Read current source. It offers both reconciliation choices while the first response is still held: [full DOM](first-save-pending.txt).
4. Click **Keep my text over the current source**. The waiting state is cleared; **Save source** is enabled: [text](guard-cleared.txt), [image](guard-cleared.png).
5. Click Save again. The second actual PUT uses revision10/source version3 and receives200. The [held-response receipt](held-save-receipt.json) records **two successful PUTs with neither response yet released**, at base revisions9 and10. They are successive committed updates under valid CAS; this is no longer merely a controller-model hypothesis.

After capturing the evidence, both held responses were released and interception cleared. UI settled to saved version3/revision11; no final corruption is alleged. The [Host receipt](host-results.json) confirms revision11 and only the preseeded old Run's one provider request, zero managed posts, zero new Runs. The failure is premature release of outstanding-save ownership, not extra inference. Fix both reconciliation branches and preserve the pending submission across reads/rebase/typing; regression should prove one outstanding PUT and correct settlement/draft retention with delayed responses.

Parent also independently verifies K5-F1: source14px/21px and candidate15px/24px, monospace, with390px document width and no horizontal overflow in the checked scene: [geometry](geometry.json), [candidate reading](candidate-narrow.png). These scoped role changes are accepted; fixed12px hash metadata remains an existing limitation. Full text-scale/native zoom, screen reader, forced colors, actual touch and the full original journey were not repeated. The [browser error log](browser-errors.json) is empty.

The CDP delay was confined to this disposable local test tab; all held responses were released, interception cleared, viewport override reset and test tab closed. Host was stopped and its temporary data removed. No user browser state, services, credentials or live provider were changed. Overall K5 acceptance remains held **only for the pending-save/reconciliation portion of K5-R2**. R1/F1 do not need to be rebuilt; the final delta still needs necessary nonauthor verification before merge and precedent promotion.
