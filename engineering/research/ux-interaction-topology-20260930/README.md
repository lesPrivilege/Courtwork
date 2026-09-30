# Icons in context and interaction topology · intake

2026-09-30 · Claude (Opus). The user pasted two web-chat texts without a request; after the disposition below was proposed, the user approved landing it and assigned the whole-product audit and cleanup of this class of UX, and its rulings, to Opus. Baseline `main@87e2207`, branch `claude/ux-topology-20260930`.

Sources, saved as pasted (Chinese, unedited): [icons](input-icons.md), [interaction topology](input-interaction-topology.md). Both are opinion texts with no citations checked here; the one external claim relied on (WCAG 2.2 target size 24×24 AA) was already adopted in [IC-1](../../design/icon-controls.md#ic-1--优先级与落位).

## Dispositions · icons

| Question | Ruling and reason | Consumer | Remaining |
|---|---|---|---|
| Library grammar: geometry, stroke, cap/join, family consistency | **Already covered.** IC-2/IC-6 fix the canonical geometry (24 grid, 2px, round cap/join, currentColor); IC-8 adds that a normalized donor must sit in the same bbox band as its Lucide neighbours | [icon-controls](../../design/icon-controls.md) IC-2/6/8 | — |
| Phosphor as an already-coordinated vocabulary | **Reject.** The [EX-IC1 specimen](../../design/icon-specimen/README.md) measured Phosphor Regular as filled outlines that fail IC-6 geometry and lack `panel-right`; IC-8 demoted it to reference | IC-8 | — |
| Outline ↔ filled as selected state | **Already covered.** IC-6: Line↔Fill is not a state mechanism | IC-6 | — |
| Drawing: semantic invention and geometric adaptation; "Convention first, character second" | **Adjust.** IC-7 already forbids redrawing generic actions and admits donors only for an evidenced semantic gap; product metaphors go through [product icons](../../design/product-icons-2026-09-11/README.md). The principle matches existing rules and adds no new one | IC-7 | — |
| Opus generating many SVG candidates | **Reject** for shipped glyphs: WK-110 voids generated graphics. Exploration sketches may still inform a donor search | IC-6 (WK-110) | — |
| Component-level `optical-x/y/size` | **Adjust.** Optical correction belongs to the glyph asset (generated `icon-data`), recorded once per glyph; per-instance CSS offsets would give one glyph several corrections | IC-10 | [Rulings](rulings.md) S5 |
| Icon baseline with CJK and Latin text | **Adopt.** No IC rule verifies icon + mixed-script label alignment | IC-10 | [Rulings](rulings.md) S5 |
| Glyph / Set / Component / Page review levels | **Adopt** into the acceptance checklist. EX-IC1 covered Set and Component in real slots; Page was not required | IC-10 | — |
| Separate Icons chapter tree | **Reject.** `icon-controls.md` is the owner; a chapter tree would be a second rule registry (UX grammar, "变更如何进入公共规则") | — | — |

## Dispositions · interaction topology

| Question | Ruling and reason | Consumer | Remaining |
|---|---|---|---|
| Configuration plane vs execution plane; where complexity sits | **Adopt** as UX-11. UX-02 keeps decision facts near the action and the Shell contract sends complexity to secondary surfaces, but no rule forbade routing a repeated choice through a configuration tree | [UX grammar](../../design/ux-grammar.md) UX-11 | [Rulings](rulings.md) |
| Frequency × Interaction Distance × Locality × Load formula | **Adjust.** Kept as fields of a per-action audit record, not a multiplied score, because the factors have no common unit | UX-11 verification; audit ledger | — |
| Flat model vocabulary, provider as secondary metadata | **Already implemented.** `model-picker.mjs` appends the connection label only when a model name is ambiguous | `app/web/model-picker.mjs` | — |
| Change effort from the Composer in one step | **Already implemented** (05 slice B): the Model & effort card draws the Host's exact ladder as segments one disclosure from the Composer | `app/web/model-effort.mjs` | — |
| Change model from the Composer | **Finding.** Composer → card → *Change model* → modal dialog with a select and Save: two disclosures, and the card's entry uses the `settings-2` gear, a configuration glyph, for a runtime choice | [Rulings](rulings.md) S2 | — |
| Semantic locality: current model vs default model | **Defer.** The Composer control writes the global configuration ("all chats, future runs"); the product states this scope honestly, as [composer-pr](../models-provider-registration-2026-09-14/composer-pr.md) item 4 requires. A per-chat choice needs a Host fact the frontend must not fake | Host provider-config owner, composer-pr | Trigger: a Host contract for chat- or session-scoped model/effort |
| Generalize to tools, roles, workspaces | **Already covered** for Agents by the accepted [Role-first Composer](../../design/role-composer-20260922/README.md); tools and workspace are checked by the audit | Audit ledger | — |
| WCAG 24×24 target floor | **Already covered** by IC-1 and the [visual/spatial grammar](../../design/visual-spatial-grammar.md) | — | — |
| "Interaction Topology" chapter | **Reject** as a chapter; the rule is one UX row with an audit method, under the existing registry | UX-11 | — |

## Whole-product audit

The user assigned the audit and cleanup of this UX class, generalized beyond the model selector, with rulings by Opus. Four read-only Sonnet slices recorded each user action (surface, path with code lines, depth, effect scope traced in code, frequency, reversibility, mismatch kind): [composer](audit/composer.md), [shell](audit/shell.md), [settings](audit/settings.md), [icons](audit/icons.md). A separate agent [verified](audit/verification.md) the sixteen claims behind the larger rulings. [Rulings](rulings.md) dispose every finding, order the implementation in six slices (S1 correctness first) and name owners and triggers for what is deferred. Implementation passes to the UX lane holder unless the user reassigns it; no product code changed in this intake.
