# 06b coding-start friction — independent acceptance

2026-09-20 · Astra accepts source `d4a433d214121c762fdb7a1212ea7b013decb55c`: Claude `55bee59`, Sol `ef2b3c1` and the minimal Astra event-poll wiring correction. Local main merge: `f5b375259045d4b9b43cac185145b959a954b925`. This is frontend acceptance within the existing folder/candidate/permission/profile owners, not a new backend or real-model capability claim.

## Evidence and disposition

[Luna original delta review](luna-review.md) passes [45/45](luna-tests.log), adopting the count projection, folder change, focus recovery, boundary copy direction and profile-list epochs/pending state. Preserve the author's [unchanged evidence packet](../coding-start-friction-20260920/README.md), including its before/after counterexamples and full-suite summary; do not relabel those as independent visual evidence.

Three finite corrections are included before acceptance:

1. **Adjust File access copy.** The new explanation omitted Read only. It now follows the actual Host policy: Ask requests write/check approval, Allow edits permits writes but still asks for checks, and Read only blocks writes/checks. No permission semantics changed.
2. **Preserve disclosure state.** Event-driven rendering recreated Which-is-which closed. Sol retains open/closed state using the existing path disclosure precedent; a regression covers both directions and outside focus. [Luna final review](luna-final.md), [45/45 selected tests](luna-final.log).
3. **Complete event wiring.** Astra's browser found Completed in Chat while the open card still said “Available after this run ends” with disabled controls. [Luna source finding](terminal-finding.md) traces this to pollEvents calling renderChat rather than renderAll. Astra adds only an open-card refresh after changed events are merged. [Independent wiring review](wiring-final.md) and [38/38 event/continuity tests](wiring-final.log) pass. The final combined main tree passes [46/46 affected suites](integrated-tests.log), exit 0.

## Independent OpenAI browser evidence

Astra used a new in-app-browser tab on isolated Host 8914 and synthetic profile preview 8915. Both run the candidate source; [served hashes](browser/served-source.json) pin the final four web modules. The user's 8787 Host and main 8899 preview were not used as test fixtures. No credential or paid provider was read or called.

- [Workspace default layer](browser/01-workspace.png) separates Project, Folder access and File access; definitions are disclosed beside them. Initial capture is 1280×720. Later Host captures reflect the actual 591×773 browser pane, not native zoom or a promised 390px result.
- [Start private candidate focus](browser/02-created-focus.png) lands on Review changes. The independent fixture was seeded through public session/bind APIs with no Run; creation itself was clicked in the browser. This is additional evidence that preparation does not require inference, not an implemented Home shortcut.
- A Local test script performs an exact candidate write and fixed node-test, with both approvals clicked in the browser. The source stays unchanged; [receipts](browser/host-receipts.json) and [source integrity](browser/source-integrity.json) are separate from the simulated response. [Diff](browser/03-diff.png) correctly reads 1 write, 1 added/1 removed, matching the existing fixture patch hash.
- [Terminal-before-fix AX](browser/08-terminal-card.txt) and [final terminal AX](browser/10-after-terminal-fixed.txt) establish the real wiring counterexample and correction. To keep the card open during arrival, the later exact check approval was resolved through the isolated public Host API; the same browser session received its events. [Final screenshot](browser/10-after-terminal-fixed.png) and AX retain the expanded/focused definition, Completed Chat and enabled Disconnect/Stop edits without closing/reopening the card.
- The earlier external fixture probe in browser files 04–05 did not cause the active client's poll to refresh; it is retained as an inconclusive attempt, not proof of the old disclosure failure. The later 06–10 captures are the actual subscribed-Run event tests. Disclosure collapse is independently covered at the render seam.
- [Profile-list pending screenshot](browser/11-list-pending.png) visibly marks previous rows while the new read is pending; [settled AX](browser/12-list-settled.txt) records the arrival. The late-reply invariant is covered by Luna's controller tests.

Review tabs are closed and both isolated servers are stopped. Synthetic review data is retained outside Git. No fresh native zoom, screen-reader, forced-colors, 390px/dark or full G4 campaign was run. The author's folder-change journey and independent bind-seam tests are retained; no native folder picker was independently exercised in this pass.

## Next scope and architecture

[Original owner disposition](../../06b-dogfood-friction-20260920.md#astra-exploration-disposition--2026-09-20) adopts two subsequent frontend consumers: explicit preparation of a Chat/candidate before inference, and historical candidate/write-revision readings in approval details. Preserve draft/materials, idempotent identities, lost-reply recovery and zero automatic Runs. No source/binding/current-candidate state may be substituted for the approval's recorded identity.

Non-approval tool arguments remain a Runtime/Host contract gap. Existing approval preview is a 400-character substring, not a general redaction guarantee; arbitrary arguments must not be persisted by analogy. Defer implementation until the existing trace owner defines allowed fields, omission/redaction, explicit truncation and one bounded execution-start snapshot. No streaming argument-token journal or frontend workaround is accepted.

The completed batch remains separate from these next tasks. No push/deploy or real provider use; heartbeat remains paused. Merge is complete; verified preservation/cleanup receipt follows separately.

## Preservation and completion

[Preservation receipt](preservation.json) records both original author/integration HEADs, retained archive refs, unique-commit and patch inventories, tracked/untracked/ignored file manifests, physically restored archives and a Git bundle verified/fetched into the previously restored repository. Both trees matched their snapshots immediately before deletion and all commits are consumed by main. Both ended trees and their branches were removed; archive refs remain. The integration dependency symlink is explicitly archived and its main target retained. Only persistent Courtwork and its frozen shared-Git dependency remain registered. No root-layout migration was performed. User/author/review synthetic data outside these task trees remains preserved.

Document links and diff checks pass. The next frontend scope is ready for Claude pickup under the original order; no next writer has been started by this review.
