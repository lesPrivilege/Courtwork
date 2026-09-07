# Final UI audit · 2026-09-08

Scope: Claude UI through `dd65d2b`, integrated runtime schema 4, parent Home composer and UI composition changes. File fingerprints in `source-sha256.json` identify the reviewed source. Independent review is separate from the parent observations below. All browser fixtures used synthetic data and the deterministic local provider at an isolated host; original author previews were not changed.

## Four-axis judgment

| Axis | Finding and limit |
|---|---|
| Maturity | Home starts from an editable composer; project and write scope remain explicit. One create/run admission, uncertain receipts, late navigation and draft ownership covered by 10 counterexamples. Configuration uses readable rows and explicit scope. New runtime control UI is not implemented. |
| Quietness | Waiting is static and says Waiting for you; it does not shimmer as running. Terminal tool records collapse to ledger rows; input is never auto-sent on completion or reconnect. |
| Identity | A coherent gray palette, shared type/spacing/button rules and independent brand package are present. Court Work brand semantics in product UI are deliberately deferred to the user's first post-merge Claude assignment. |
| Durability | Browser checks at 1280px, 390px and 320px effective width; independent input/state counterexamples; disconnect/restart draft recovery. This is not full real-provider, screen reader, physical IME or browser-zoom certification. |

## Observed browser scenarios

1. Home with no project retained a typed prompt across reload; creating a project returned to that prompt. Send created one session and run. Home and existing-session drafts stayed separate.
2. A question run waited while a next instruction was typed. Cancel closed the question and retained that unsent instruction. A permitted write moved waiting → running → completed and exposed its recorded artifact.
3. Waiting tool labels and composer both said Waiting for you; computed shimmer was `none`. Running and completion had been observed separately. A slow fixture completed before a Cancel click, so that attempt is not counted as cancellation-during-model-wait evidence.
4. Stopping the isolated host showed Connection lost while retaining the last confirmed run state and draft. Restart recovered the run as Cancelled, closed the expired question, restored Send and kept `Recovery check: preserve this unsent next instruction.`; it did not submit it.
5. At 390px, Home composer and list both use 16px side gutters and document scrollWidth equals 390. At 320px, settings and New project dialogs have clientWidth/scrollWidth 286/286; settings content scrolls vertically with reachable actions. No horizontal page overflow in these checks.
6. Shared text size tokens, dialog Cancel, permissions, provider display names, overview labels, form action alignment and Run history heading were reconciled after Luna's read-only inventory. Settings final screenshot shows the primary Save connection at the action edge.

## Captures

- `01-waiting.png`, `02-settings.png`: author preview before parent Home/waiting changes.
- `04-home-composer.png` through `07-permission-390.png`: intermediate parent behavior evidence.
- `08-home-rhythm-390.png`: shared 16px Home boundaries, pending and continuing lists.
- `09-reconnected-draft.png`: recovered terminal run and retained unsent draft.
- `10-settings-reflow-320.png`: settings reflow before final action-alignment change.
- `11-project-dialog-320.png`: final dialog Cancel/Create hierarchy and 320px fit.
- `12-settings-final-320.png`, `13-home-final-desktop.png`: final settings and Home. Saved files were opened for visual inspection.

## Tests and exclusions

`home-final-tests.txt`: 10/10. `ui-final-tests.txt`: 20/20 (surface, run receipts, message edit, focused permissions). Backend tests are covered separately by integration and remote recovery evidence. No paid provider or credentials were used.

There is no continuous canvas zoom handler in current product code; Expand/Restore work surface is a layout operation. Native zoom shortcuts in the embedded preview did not establish a measurable page zoom (visualViewport scale and DPR stayed 1), so only effective-width reflow is claimed. A transient screenshot after viewport change was recaptured after the viewport settled; final settings evidence is the corrected capture. Browser 200% zoom, browser engines beyond the preview, assistive technology and physical-device IME remain explicit follow-up checks.

Parent disposition of the independent credential-order note: the secondary Remove saved key action precedes Save key in both DOM and visual order, following the shared trailing-submit action convention. Neither focus nor Tab activates removal; removal remains an explicit button action. No keyboard-order inversion is introduced. Save key is secondary styling within its own credential section, while Save connection is the primary connection-form submission. This is an intentional ordering decision, with physical assistive-technology validation still outside this pass.
