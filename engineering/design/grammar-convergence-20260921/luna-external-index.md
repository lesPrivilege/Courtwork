# External density, spatial, and interaction grammar index

Date: 2026-09-21
Scope: primary external sources only. No UI code, installs, repository edits, or runtime changes. External facts are separated from CW judgments. The local baseline already has control 28 plus desktop 44 and coarse/narrow variants; this index supplements that grammar and does not claim CW lacks a density system.

## WCAG and WAI-ARIA facts

### Target size

[WCAG 2.2 SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) was fetched 2026-09-21. It is Level AA and requires pointer targets to be at least 24 by 24 CSS pixels, unless one of five exceptions applies: spacing, equivalent control, inline, user-agent control, or essential presentation. The spacing exception is specific: for an undersized target, a 24 CSS-pixel diameter circle centered on its bounding box must not intersect another target or another undersized target's circle. The criterion is independent of zoom; authors cannot claim that zoom will make a small target pass. The page recommends larger targets as a best practice and calls out 2.5.5 for stricter targets.

[WCAG 2.2 SC 2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced) was fetched the same date. It is Level AAA and uses 44 by 44 CSS pixels, with equivalent, inline, user-agent-control, and essential exceptions. It does not use the 2.5.8 spacing exception. The page recommends larger targets for frequent, hard-to-undo, edge-positioned, or sequential controls.

Adopted guidance for CW: keep 24 CSS pixels as the conformance floor for pointer targets and use the existing 44 coarse/desktop treatment where the interaction is important or touch-like. Treat spacing as a fallback exception to verify, not as a reason to make every icon smaller. Do not turn 44 into a universal product rule.

### Resize, reflow, and text spacing

[SC 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) requires text up to 200% without loss of content or functionality. Its approved test rules explicitly include checking that zoomed text is not clipped by CSS overflow.

[SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow) states that 200% text enlargement and reflow overlap: content should be readable without two-dimensional scrolling at the criterion's tested viewport conditions. The page also notes that smaller viewports can change the reflow test boundary.

[SC 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing) requires no loss of content or functionality when users apply, without changing other properties: line height at least 1.5 times font size, paragraph spacing 2 times font size, letter spacing 0.12em, and word spacing 0.16em. Examples explicitly require text to remain inside its container without clipping or overlapping.

Adopted guidance for CW: no fixed-height content region may rely on clipping for normal labels, status text, menus, cards, or tab panels. Density tokens may set a baseline, but text containers need to grow, wrap, scroll in one logical direction, or switch layout. Verify at 200% text/zoom and with the SC 1.4.12 overrides. This is a behavior constraint, not a mandate to remove every bounded panel.

### Keyboard, tabs, and dynamic panels

[WAI-ARIA APG keyboard interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) was fetched 2026-09-21. It requires all interactive elements to be keyboard operable, with logical and predictable DOM/tab order, visible focus, and pointer actions that keep keyboard state synchronized.

[APG Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) defines tablist/tab/tabpanel relationships. Horizontal tabs use Left/Right arrows; Tab enters the active tab and leaves the tablist to the next page sequence element; Delete is optional when tab deletion is supported. Automatic activation is recommended only when panel content is already available without noticeable latency; otherwise manual Enter/Space activation is preferable.

Adopted guidance for CW tabbed Preview: tab identity, panel identity, and active selection stay explicit; close/delete returns focus to the following tab or previous tab when the last tab closes; automatic activation is appropriate only for already-loaded local projections. A lazy or remote panel should use explicit activation and preserve focus during loading. These are semantic requirements, not a visual prescription.

## Compact control and token precedents

### Carbon

[Carbon Button style](https://carbondesignsystem.com/components/button/style/) was fetched 2026-09-21. It documents actual button heights of 24, 32, 40, 48, 64, and 80 CSS pixels, and recommends 16px spacing between grouped buttons. It specifies 16px icon size for ordinary buttons, 20px for expressive icons, and sentence-case labels.

Adopted fact: Carbon demonstrates a named fine-grained size ladder and a separate spacing rule. Local CW should not copy Carbon values wholesale; use its model to keep control size, icon size, group spacing, and label typography separate.

### Primer

[Primer size primitives](https://www.primer.style/product/primitives/size/) was fetched as a current page shell but did not expose stable line-addressable content through this retrieval path. Its official search result reports 24px xsmall and 28px small controls, but that snippet is not treated as independent proof. Therefore the commonly repeated Primer 24/28 claim is recorded as unverified here.

The fetched [Primer Button documentation](https://primer.github.io/brand/components/Button/react/) confirms semantic size variants (small, medium, large), leading/trailing visuals, disabled semantics, and accessibility review, but it does not establish pixel heights in this pass.

### Radix

[Radix Themes spacing](https://www.radix-ui.com/themes/docs/theme/spacing) was fetched 2026-09-21. Its space scale is 4, 8, 12, 16, 24, 32, 40, 48, 64px, and its scaling setting changes spacing, font size, and line height together. [Radix styling](https://www.radix-ui.com/themes/docs/overview/styling) says custom components should consume theme tokens; Radix Primitives are the low-level accessible, unstyled layer, while Themes components are more closed. Portalled custom content needs theme context; token/component/utilities import order matters.

Adopted fact: Radix is useful as a token and scaling donor, not as a mandate to introduce a React dependency. If CW borrows the idea, preserve its existing CSS token system and semantic control roles.

## CW disposition

Adopt:

- WCAG 24px AA target floor, with spacing exception checked geometrically; 44px reserved for coarse/touch or high-consequence controls.
- 200% resize/reflow and text-spacing overrides as mandatory content-integrity tests.
- APG tablist semantics, explicit activation policy, predictable focus return, and dynamic-panel latency rules.
- Carbon's separation of control heights, icon sizes, label type, and group spacing.
- Radix's token/scaling principle only as a conceptual donor.

Adjust:

- Density is per context: fine pointer controls can use the existing 28 baseline where the target still meets 24px; coarse/touch controls retain the local 44 treatment. Do not collapse fine and coarse into one universal row height.
- A compact row is acceptable only when its interactive target remains reachable and its text survives wrapping, zoom, and user spacing overrides.
- Icon glyph geometry and hit area remain separate. A small glyph can sit in a 24px or 44px target; visual size alone is not target size.

Reject/defer:

- Do not claim the cited systems establish one universal chat/sidebar density.
- Do not prescribe Carbon's entire ladder or Radix's tokens as CW schema.
- Do not treat Primer's 24/28 pixel values as verified from this pass.
- Apple sidebar tier guidance was not fetched in this bounded pass and remains unverified.
- Do not infer that WCAG 2.5.8 requires every control to be 44px; 44px is the Enhanced AAA criterion and a useful coarse/high-consequence product choice.

No external source in this pass establishes a universal browser/Preview rail width, chat row height, or glyph-to-hit-area ratio. Those remain CW-local design decisions subject to the adopted accessibility constraints and existing local tokens.
