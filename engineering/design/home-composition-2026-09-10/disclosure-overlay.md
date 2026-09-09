# Disclosure / Anchored Overlay Grammar

2026-09-10 · Astra · baseline `c788764`. Consumes the complete supplied 28-result / 3-workstream research (counts user-reported). Extends [Control input](../../mvp/execution/work-surface-kit/inputs/control-grammar-2026-09-09.md), [icon controls](../icon-controls.md), [material](material-grammar.md), [selection/Home](README.md) and [glyph governance](interaction-vocabulary.md). This is a governing design contract and specimen assignment, not a completed specimen board.

Same visual direction does not imply the same interaction contract. Classify intent before choosing a surface. A shared positioning adapter is appropriate; a universal Dropdown with content-dependent accidental semantics is not.

## Family contracts

| Family | Trigger / content / selection | Focus and dismissal | Geometry / glyph / mobile |
|---|---|---|---|
| Select | Named value control; finite single-choice options; current value reflected in trigger | Native select retains platform keyboard behavior. Custom implementation needs complete select/listbox behavior, selected value distinct from focus, typeahead, explicit commit/cancel behavior and return focus. Do not copy menu roles. | Start alignment, at least trigger width where viewport permits; selected-text alignment is a candidate. Chevron may reflect open state. Native picker is the mobile default. |
| Combobox | Named editable search field plus options; search text is not a committed value | Keep input editing keys and IME intact; use a complete combobox focus/active-descendant model, arrow navigation and explicit commit; Escape closes without fabricating selection | Same width policy as Select, constrained to viewport. Large datasets need loading/empty/error handling. Narrow searchable sheet/dialog must preserve the same value contract. |
| Action menu | Named command button; menu of verb-labelled commands; no value projected back onto trigger | Enter/Space opens and focuses item; menu arrow/typeahead behavior, Escape returns focus, Tab exits appropriately. Commands that open another workflow transfer focus there. Selection items, if needed, declare radio/checkbox roles separately. | Content-sized compact surface; ellipsis stays ellipsis. No trigger-width rule. On touch provide visible trigger and accessible command presentation. |
| Context menu | Secondary commands on an explicitly identified object | Same menu model; context-key/Shift+F10 or equivalent keyboard path and visible More alternative. Opening must not silently change the target object | Pointer/object anchor with collision handling; no hover/right-click-only actions on mobile. |
| Popover / mini inspector / filter panel | Named button opens rich text, controls or visualization; no implicit selected value | Ordinary Tab order; declare initial focus, close control/Escape and return-focus behavior. Nonmodal by default. Outside-dismiss and draft retention must be specified; dismissal never applies a draft implicitly | Content-sized, visibly anchored; room for header/body/footer. On narrow hosts use bounded scroll or an explicitly named inspector/dialog with the corresponding focus contract. |
| Disclosure | Button or native summary expands associated inline content | Enter/Space toggles; focus remains on trigger; ordinary document order. No outside-click or Escape dismissal requirement | Parent plane, no overlay shadow/material; right-to-down glyph. Same inline behavior on mobile. |
| Accordion | Group of peer disclosures, not an action list | Declare one/multiple-open policy; heading buttons and normal Tab order, optional arrow navigation only if consistently implemented | Same inline surface; no floating container. |
| Tooltip | Accessible control plus short noninteractive supplementary text | Hover and keyboard focus; no focus transfer; Escape dismissal; never the only accessible name or source of essential information | Compact information surface, collision constrained; touch has a visible/accessible equivalent. No buttons inside tooltip. |
| Dialog | Named focused workflow; actual modality is a separate choice | A modal manages initial focus, trapped Tab order, inert background, close/cancel policy and focus restoration. Nonmodal dialogs do not claim modal behavior. No automatic submit on dismissal | Separate higher surface; smoke only for actual modal obstruction. Consequential review does not automatically require a modal. Narrow layout keeps the same decision and focus contract. |
| Split/combo button | Distinct primary command and secondary command-menu trigger | Two separately named controls; primary never toggles menu or changes because an unrelated item received focus | Related geometry with separate hit targets; no cramped split control on touch. |

Native HTML behavior is preferred where it fits. React Aria/Base UI/Radix are behavior donors for a future React implementation, not dependencies to add to this vanilla host. ARIA roles alone do not install keyboard or focus behavior. Shared Floating UI geometry does not supply family semantics.

## Surface and state rules

Compact Select/Menu uses low internal chrome; rich Popover may use header/body/footer; inline Disclosure has no overlay surface. Consume existing material roles before adding aliases. Proposed registry slots: family-specific surface, border, elevation, radius, padding, width policy, collision margin, motion, anchor and transform origin. These are contract fields, not new CSS already installed.

Specimen geometry: trigger radius 6–8, overlay 10–12, item 4–6, with inner radius approximately outer radius minus inset. These are trial ranges, not universal constants. Clamp width/height to viewport, permit content scrolling, handle long labels, RTL, zoom and anchor removal. Select matching width must not cause overflow; ellipsis menus do not match a 32px trigger.

Persistent selection uses a check or another explicit mark in addition to text; hover/focus uses a weaker transient treatment, and keyboard focus remains discernible. Open state follows actual expansion, not the last click. Disclosure turns right to down; submenu points toward its child (respect RTL); navigation does not rotate on activation; More remains ellipsis. Filled glyph is not an independent state authority.

Motion candidates: menu/select 120–160ms, rich popover 160–200ms, disclosure 160–220ms; small 2–4px directional translation with opacity and optional slight scale for anchored surfaces. Evaluate rather than freeze these ranges. Use resolved collision side/origin, interrupt cleanly and remove decorative displacement under reduced motion. Inline reveal changes document flow. No broad spring or blur animation by default.

Trigger-to-panel morph is experimental only for a small local sort/filter/selector. Exclude project/model pickers, destructive menus and rich context inspectors. Preserve trigger identity, focus and hit testing through transitions. Prefer no submenu; at most one child level when categories are genuinely hierarchical, with pointer safe area and keyboard equivalence. Deep configuration belongs in a searchable picker or inspector.

## Actual consumers and retained specimens

| Specimen | Current source / fact | Remaining work |
|---|---|---|
| D0 Project selector | `app/web/index.html` has native `home-project-input`; `home-view.mjs` has native Attention project select | Keep Project identity; `NDA review` is an example project name. Custom Select visual/keyboard specimen remains pending. |
| D1 Activity range | `home-view.mjs` 28/84 buttons with pressed state | Keep compact mutually exclusive range controls; no dropdown or navigation-tab conversion. |
| D2 Recorded context | `attention-view.mjs` uses native details/summary | Retain inline disclosure. Inspect long recorded data within the parent flow. |
| D3 Context / runtime | `app.mjs` `openContextSummary` opens `context-popover` and focuses its close button; actual content is Session overview | Rich-content family is correct; a measured TPS/cache inspector remains gated by [telemetry contract](runtime-telemetry.md). Current implementation is not proof every popover follows the full contract above. |
| D4 More object actions | Proposed command menu | Add only real owner-backed commands. Do not fabricate Matter lifecycle, Pin/Archive/Duplicate/Delete endpoints to fill a sample. |

Place D0–D4 on one future comparison page with equal content/density. Test mouse, keyboard, touch, Escape/focus return, item focus versus selection, outside click, narrow viewport, 200% zoom, long labels, collision flip, scroll, detached anchor, nested surfaces and reduced motion. Test drafts and command outcomes separately. No specimen or full interaction audit was performed in this intake.

## Source disposition

Primary checks on 2026-09-10: [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) separates selected value, focus management and typeahead; [Radix Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu) is a distinct primitive; [Base UI Popover](https://base-ui.com/react/components/popover) is the rich popup donor. [WAI disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and [menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) support the different expansion and focus contracts. Courtwork geometry/motion values are local hypotheses.

Other supplied leads retained without claiming a new audit: React Aria styling, Base UI Select, Radix Popover, Primer ActionMenu, Carbon Disclosures and Linear Invisible details. Supplied Apple links use a third-party mirror and are not treated as checked Apple primary sources. Bloom and the unattributed Atlassian submenu quote remain experimental leads, not normative evidence.
