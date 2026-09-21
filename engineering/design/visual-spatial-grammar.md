# Visual and spatial grammar · mandatory UI consumption

2026-09-21 · Astra. Canonical composition guidance under [UX Grammar](ux-grammar.md), [UI composition](ui-composition-standard.md) and the existing frontend contract. This page maps choices to their owners; it is not another design system, token store or roadmap. [Source intake and disposition](grammar-convergence-20260921/README.md) distinguish external standards, CW decisions and implementation evidence. This architecture session retains final rule/exception/baseline authority; an implementation or audit task proposes and verifies within it.

## The product intent

“舒朗” means that structure is apparent and attention is available for the work. It does not mean uniformly large controls or generous padding everywhere. Use three surface roles together:

| Role | Geometry and hierarchy | Must remain visible |
|---|---|---|
| **Workbench chrome** | Compact, stable navigation, tabs, toolbars and object metadata; low visual weight | Current object, active selection, available action and focus |
| **Reading / review** | Readable measure, line/paragraph rhythm, meaningful headings; chrome recedes | Source/version, substantive content, comparisons and evidence relevant to the review |
| **Action / decision** | Locally concentrated consequence, scope and recovery; a larger target where justified | Exact pending/unknown/confirmed state, authorization scope and necessary failure/recovery information |

One screen may contain all three. A tab and the document it selects should not share a single visual size role. Reduce repeated headers and nested boxes before reducing body text. Geometry can express grouping but cannot replace a necessary permission or unknown-outcome explanation.

## Which grammar governs each choice

| Dimension | Consume first | Construction rule |
|---|---|---|
| Information hierarchy, alignment, spacing and visual emphasis | [UI composition](ui-composition-standard.md), UX-01/07/09 | Same-level objects share axes and rhythm. Distinguish page/section/group/item; do not stack equally prominent headers. Use current spacing tokens, not one-off padding. |
| Density, typography and content measure | Roles and baseline table below; current `styles.css` tokens | Chrome, reading and decisions have different size/leading/measure. Record role and input capability before choosing metrics. |
| Containers, borders, elevation and color | [Surface hierarchy](surface-hierarchy.md), [Atlas](atlas/README.md), current color/material owners | Containers express actual grouping/depth. Spacing or a heading may be sufficient; no extra card merely to make a section conspicuous. Existing semantic color and material rules remain. |
| Navigation, tabs and contextual toolbars | [Frontend contract](agent-interface-2026-09-10/frontend-contract.md), shell/location owners, APG reference below | Navigation identifies location; tabs identify stable objects/panels; toolbars act on the current object. Avoid a second navigation row disguised as actions. Preserve identity, close/return and late-response rules. |
| Buttons, icon actions and labels | [Icon/control rules](icon-controls.md), native HTML and existing `ui-controls.mjs` | Glyph, visible control and interactive target are separate. Keep meaningful labels for consequential decisions; no invented action or unfamiliar icon-only meaning. |
| Copy, disclosure, metadata and empty states | [Copy convention](copy-convention.md), UX-01/02/04 | Keep only text needed to identify, act or recover. Place technical detail behind a real disclosure; never hide the only version/scope/error evidence needed for a decision. Empty states give the next valid action, not another hero. |
| Status, loading, feedback, errors and unknowns | Existing Host/controller facts and UI state vocabulary; UX-04/05 | Local feedback and stable reading order; unknown is not failed or unapplied. Do not invent progress, reserve a clipping box, or replace known rows with decorative skeletons. |
| Forms, Settings and save semantics | Existing Settings/profile/runtime consumer contracts | Label/help/control/action/receipt have predictable anatomy; drafts and confirmed revisions remain separate. A field is not automatically a large standalone section. |
| Motion, focus and scroll continuity | Existing Atlas/overlay/location/reading owners; frontend contract | Motion explains an existing transition. Focus stays visible and returns to its owner; preserve intentional user focus/reading movement. Neither motion nor a CSS resize resets draft or selected work. |
| Responsive layout, zoom, text spacing and accessibility | W3C references and verification below | Grow, wrap, overflow appropriately or change layout. Do not shrink the whole application or clip content to meet a density target. |
| Primitive/library choice | Existing primitive/vendor inventory → relevant Design Scout row | Prefer adopted compatible mechanics. Radix/Primer/Carbon are references, not an instruction to install React, shadcn or a new component framework. Record actual dependency decisions separately. |

## Role metrics: local design baselines, not universal standard values

At inspected main `ef6b267`, the code already defines a 28px default control, 44px narrow/coarse overrides, 4/8/12/16/20/24/32 spacing, separate text roles and a 15px reading role. The 20px existing spacing token is not to be deleted because a donor scale omits it. Component overrides and text-size preferences still require computed inspection. Earlier 32/44 blanket desktop guidance is superseded **for new or explicitly migrated compact roles** by this table; existing accepted surfaces are not globally rewritten by a documentation change.

| Role / default fine-pointer baseline | Candidate geometry | Text / glyph guidance |
|---|---|---|
| Micro chrome action: close/copy/overflow | 24–28px target; prefer an existing 28px control where it fits | Existing glyph family, normally 14–16px; smaller glyph does not shrink the target |
| Compact navigation/tab/toolbar control | 28–32px one-line minimum; a tab strip may be 32–36px if its actual content fits | UI role around 13–14px at normal text scale; normally 16px glyph |
| Standard input/selector or ordinary submit | 32–36px initial minimum where a form needs it | Existing body/label roles, not reading-heading typography |
| Prominent action | 36–40px initial minimum, used selectively | No automatic large icon, bold heading and filled container together |
| Coarse/touch target | Retain at least 44×44px CW target convention; keep existing narrow fallback until separately validated | Glyph remains optically appropriate; it need not grow with the hit target |
| Document reading/review | Existing 15px reading baseline; evaluate 15–16px through its role, measure and script | Preserve line/paragraph rhythm and content width; not governed by toolbar density |

These are selection ranges and starting minima, **not fixed content heights or new literal-value exemptions**. Choose one role mapping for each pattern and record it. Use existing CSS tokens; introduce a semantic alias only when a concrete shared consumer needs it, with a single mapping to base tokens. Preserve text scaling and optical exceptions explicitly. Do not create a global “compact mode” setting, replace every 44px with 28px, or encode arbitrary new values outside the existing lint policy.

Pointer capability and viewport width are different. A narrow fine-pointer window is not proof of touch; hybrid/unknown input requires a deliberate fallback. The current 44px narrow/coarse behavior remains until a scoped migration verifies it. Consequential controls may use larger targets without inflating all adjacent chrome.

## Normative floor and borrowed patterns

[WCAG 2.2 target minimum](https://www.w3.org/TR/WCAG22/#target-size-minimum) uses 24×24 CSS px at AA with specified exceptions; [enhanced targets](https://www.w3.org/TR/WCAG22/#target-size-enhanced) use 44×44 at AAA. CW's coarse-target choice is a product convention, not a claim that AA mandates 44. Measure targets and any relied-on spacing exception; glyph viewBox and screenshot pixels are not target dimensions.

Keep tests separate: [text resize](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) up to 200%; [reflow](https://www.w3.org/TR/WCAG22/#reflow) at 320 CSS px width for vertical content (or 256px height for horizontal content), with the specified two-dimensional-content exceptions; and [text-spacing overrides](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing). A 390px screenshot or DPR change is not proof of these criteria. No blanket ban on scroll containers follows; the requirement is preserved content and operation.

[APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) is an informative interaction pattern adopted as CW's tab behavior reference, not a separate normative WCAG criterion. Choose manual activation when loading has noticeable latency; close behavior needs predictable next focus and an explicit close-last outcome. Do not assume a positioning library supplies the entire keyboard/ARIA behavior.

## Required consumption and evidence

Every new UI construction or scoped migration records, in the existing [change template](agent-interface-2026-09-10/change-template.md): surface role; pattern; token mapping; pointer/viewport/text-scale assumptions; owner of focus/scroll/state; geometry exception and why; adjacent scene and preserved behavior. The route is **AGENTS → UX Grammar → frontend contract → this role map → relevant existing owner/precedent**. Do not attach this conversation without making that mapping.

Before changing a representative surface, record actual source SHA and computed geometry: visible control and hit-target bounds, glyph dimensions, font/line-height, padding/gaps, content measure, stacked chrome height and where substantive content begins. Capture the full composition, not only a cropped button. At matching viewport/state compare hierarchy, visible reading area and reachable actions; no universal chrome percentage or screenshot-only AA claim is introduced.

Use fixed synthetic states for normal/loading/long-label/error/unknown and real keyboard actions; preserve per-object reading/focus across async changes. Select meaningful existing lints and behavioral checks, then independently inspect changed visuals with OpenAI computer use. Author screenshots, automation measurements and independent acceptance are separate. Missing native zoom/reader/forced-colors evidence remains explicitly unexecuted, not passed by emulation.

## Incremental convergence and authority

Use **extract → codify → migrate** under the existing GUI grammar work: inventory actual variants and exceptions; reconcile them against these owners; migrate one leased component family with before/after evidence. Do not launch a whole-site redraw. 06d is the first tab/header/toolbar consumer but does not own the full governance project. Its current writer is preserved; a fresh audit task starts read-only and returns candidates to this session. [Fresh Astra loop handoff](grammar-convergence-20260921/astra-loop.md) assigns Luna exploration and Sol implementation only after an unoccupied, bounded source scope is recorded. Final cross-surface rules, exceptions and integration remain with this parent Astra session.
