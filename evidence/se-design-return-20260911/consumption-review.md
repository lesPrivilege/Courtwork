# Independent consumption review · Design return · 2026-09-11

This is a read-only row audit of the returned package. It checks whether each disposition, reason, effect, and cited locator is supported by the fixed Courtwork records. It does not accept the boards, admit assets, authorize a PR, or close a product gate.

## Baseline and method

- Return package: `dbd1efe52d7a078cfdb8af03a82470135f31a9dd`; `RETURN-design.md` is the text twin at `engineering/research/se-control-design-return-2026-09-11/source.tar.gz:return-package/RETURN-design.md`.
- Product references checked: `a01dee89e752111e63012b705ef81350ce518446` and the independently reviewed dark authored-plane fix `5e3a504177e8d5c84471fb73c41388ea9de9952`.
- Review compares the ledger with current contracts, accepted intake rows, source manifests, and the cited implementation/evidence paths. “Pass” means the row is consumable as a bounded specimen or source claim; it is not product acceptance.
- The returned package reports 35 Lucide SVG assets. That count is correct when the 36 manifest entries are read as 35 `.svg` files plus `LICENSE`; the runtime `app/web/ui-controls.mjs` allowlist has 24 names and is a separate count. The current `engineering/design/product-semantics/registry.json` verifies 47 semantic entries, 30 non-null `glyphRef` values, and 22 unique glyph names; it does not verify the return/HANDOFF phrase “36 semantic glyphs,” so that phrase remains a return claim rather than an admitted current count. The row audit yields 32 pass, 12 needs revision, and 1 unverified; severity is 6 high, 12 medium, and 27 low.

## Findings that must be corrected before consumption

1. **SE-10 / C18:** the proposed Lucide `text` donor has no fixed source SHA. `icons/text.svg` at the pinned Lucide commit returns 404; `text-align-start.svg` exists but its hash, alias decision, license record, and optical/a11y review are not established. Keep the header pair as a candidate and do not add a manifest row or semantic key yet.
2. **SE-07 / C15:** `3299730` is the Design Scout layer input, not the fixed Visual Grammar source. Pin `engineering/mvp/execution/work-surface-kit/inputs/shape-grammar-generative-identity-2026-09-09.md` to `5a6d8ac5fcffbcf77d90ad27a58ba3e3a317055`.
3. **WK-135 / C05:** the pilot at `318b137` records the historical `1 specimen / 7 ignore` suggestion. The accepted `8/8 ignore` disposition is `intake-round-3.md` §4an at `ab09b0dee05f73e8e615c0a5f9107a8ba15ff697`; use the pilot only as evidence. “No status tint anywhere” is too broad because the current semantic review token is used for bounded `needs_you` labels.
4. **SE-08 / C16:** the contract supports an explicit review label plus structure/icon, with color supplementary. Replace “Needs you word/weight is the review channel” with that governed statement; weight alone is not the contract.
5. **WK-156…158 / C32:** current `attention-view.mjs` does contain production POST `/attention/{id}/actions`, request identity/CAS, receipt validation, recovery, and re-inspection. The remaining issue is narrower: that implementation does not prove every state/action drawn in the board is live or advertised for every item. Label source-backed mutation protocol and state specimens separately from capability/action coverage gaps.
6. **SE-04 / C12:** the Home README supports the shell and records unresolved composition work; “header pair fix keeps the shell” and the recommended alternative are return recommendations. Cite the local return/production source and mark the visual choice as candidate/adapt until an owner decision exists.
7. **SE-01 / C09 and SE-02 / C10:** the cited contracts support the governing distinctions, but the Spark “never 0” and Explore thread-scoping claims need direct locators to `spark-projection.mjs` / `coordination-projection.mjs` and their owner contracts. Atlas alone does not establish each runtime detail.
8. **SE-14…16 / C22, SE-17 / C23, and C45:** keep Pages, shared chat actions, and the dark bubble as evidence/specimens with their direct local implementation/evidence paths. Convergence alone does not prove WO-VS-01 action coverage, and a return board is not a product acceptance record.

## Row audit

| ID | Return input | Audit status | Severity | Review and required treatment |
|---|---|---|---|---|
| C01 | Scout L0-1 / WK-134 | pass | low | Correctly treats Scout as data and keeps authority local. Use `engineering/design/se-control-one-shot-2026-09-11/scout-digest.md` §L0 rather than the package SHA alone. |
| C02 | Scout L0-2 / WK-134/137 | pass | low | Consumption-chain statement matches the digest and accepted intake. Keep real-content specimen language bounded to the return. |
| C03 | Scout L0-3 / WK-137 | pass | low | Problem-key routing and the application/public-site boundary are supported by Scout README and intake §4ap. |
| C04 | Scout L0-4/5 / WK-134/135 | needs_revision | medium | The four-disposition rule is supported, but the named sparkle/bell/eye/strike anti-examples are not established by the cited intake row. Cite the return Icons board or a local anti-example record, and do not imply Scout accepted those exact glyphs. |
| C05 | Scout L0-6 / WK-135 | needs_revision | high | Correct the pilot citation and narrow the status-tint effect as described above. Final authority is intake §4an, not pilot §3. |
| C06 | Scout L0-7 / WK-137 | pass | low | Correctly deferred. Keep the contextual-toolbar gap open; “no open row needed” is a return scope choice, not a source decision. |
| C07 | Scout L0-8 / WK-135/137 | pass | low | Pull cadence and no standing subscription match the accepted Scout protocol. |
| C08 | Scout L0-9 research method | pass | low | Correctly consumes method only. It must not become a token, control, or product-style authority. |
| C09 | SE-01 domain distinctions | needs_revision | medium | The semantic rule is valid, but the cited frontend contract does not by itself prove the Spark and Explore examples. Add direct projection/owner locators; retain the unknown-is-unknown rule. |
| C10 | SE-02 projection ≠ control | needs_revision | medium | Atlas supports the separation and sample labeling, but Rebuild, Explore ladder, and chat-gap examples need direct source anchors. Keep “drawing does not wire capability” explicit. |
| C11 | SE-03 PropertyRow / model picker | pass | low | `settings-view.mjs` and the existing property-row contract support reuse and bounded numeric controls. No new row type is a safe local effect. |
| C12 | SE-04 Home/Work/Dashboard composition | needs_revision | medium | The shell precedent is valid, but the header-pair fix and alternative B are return recommendations, not accepted SE-04 facts. Mark as candidate/adapt and cite the local implementation/board. |
| C13 | SE-05 disclosure/overlay | pass | low | Four surface classes and focus rules match `disclosure-overlay.md`; contextual toolbar remains correctly deferred. |
| C14 | SE-06 material tiers | pass | low | Scope matches the material grammar: two registered blur consumers, solid content, and separate Pages atmosphere. |
| C15 | SE-07 Visual Grammar | needs_revision | high | Correct the fixed source from `3299730` to `5a6d8ac5fcffbcf77d90ad27a58ba3e3a317055`. The Shape+Material+Identity+Motion formula and role-to-token direction are otherwise supported. |
| C16 | SE-08 skin ≠ review | needs_revision | high | Rewrite the review claim to label + structure/icon, with color supplementary and skin-independent. Current `needs_you` review color is a bounded semantic use, so “no status tint” cannot be generalized. |
| C17 | SE-09 shape roles | pass | low | `ui-composition-standard.md` supports no new radii, the composer-only pill, and square glyph slots. Keep the effect as a grammar proposal until implementation review. |
| C18 | SE-10 Lucide subset / local reopen | needs_revision | high | The Lucide family and 35-file count are supported; the `text` donor is not. Defer donor admission until exact asset path, SHA, license, geometry, and optical/a11y checks are recorded. |
| C19 | SE-11 composer grammar / dark correction | pass | medium | Direct dark amendment evidence supports mapping dark authored surface to existing `float`, with light unchanged and cards/overlays out of scope. Preserve that narrow scope. |
| C20 | SE-12 BE41 live | pass | medium | BE41 evidence and `spark-view.mjs` support read projection, Refresh as reread, and Rebuild as a separately marked sample/capability gap. Do not infer a new backend action. |
| C21 | SE-13 Scout protocol | pass | low | Correctly delegates to the L0 rows and does not add a second protocol. |
| C22 | SE-14/15/16 Pages copy, capture, review | needs_revision | low | Capture manifest and review evidence support a Pages specimen. “Adopt” should remain evidence/specimen scope and must not imply Pages product acceptance or deployment. |
| C23 | SE-17 EX-IC2 / shared actions | needs_revision | medium | EX-IC2 recall-only and non-ancestry are supported, and `chat-actions.mjs` is the direct shipped source. Cite that source and WO-VS-01 evidence; convergence alone is insufficient for the action-coverage claim. |
| C24 | SE-18 PR chronology | pass | low | Bounded to the convergence record and makes no extra PR-state claim. Keep chronology separate from acceptance. |
| C25 | IC-1 priority and placement | pass | low | Matches the icon contract: navigation keeps text, governed actions keep words, and Retry/Continue remain distinct. |
| C26 | IC-3 hover/focus secondary text | pass | low | Tooltip and decision-point disclosure treatment match IC-3. The board remains a specimen until keyboard/touch/a11y verification. |
| C27 | IC-6 geometry / optical acceptance | unverified | medium | Computed bbox evidence is present; blur comparison, device a11y, and the donor checks are explicitly unrun. Preserve `unverified`; do not promote glyphs to canonical assets. |
| C28 | WK-57 flow-row anatomy | pass | low | Reuse direction matches `ui-controls.mjs` and the Atlas row anatomy. Mark the Explore ladder itself sample-only. |
| C29 | WK-102 material closed set | pass | low | Existing `styles.css` and material grammar support no new blur consumer. |
| C30 | WK-120 maturity hierarchy | needs_revision | medium | Intake defines maturity as density, spacing/alignment, and hierarchy before decoration. “No colour or rule” is too absolute because semantic color exists; narrow it to hierarchy construction in the board. |
| C31 | WK-123 Auto principle | pass | medium | Intake §4ab supports exact grants, no Always allow, and Auto as a strategy-layer mode. Keep it out of the authorization-card button set. |
| C32 | WK-156…158 Attention views/actions/receipts | needs_revision | high | Current `attention-view.mjs` implements production POST actions, request identity/CAS, receipt validation, recovery, and re-inspection. “All drawn states/actions are live” still overstates what the current source proves; action availability depends on each item’s advertised typed actions. |
| C33 | WO-SD-01 / SD-14/17/19 sample rules | pass | medium | `spark-view.mjs` explicitly gates sample data, labels it, keeps it read-only, and prevents navigation. Preserve sample/live separation. |
| C34 | UE-VG01 Carbon layering | pass | low | `engineering/research/ui-ecology-2026-09-11/source-review.md` §UE-VG01 supports adapting the layer→role→state method without Carbon values. |
| C35 | UE-VG02 Atlassian elevation | pass | low | Source-review §UE-VG02 supports bounded sunken/default/raised/overlay vocabulary; local mapping and no new elevation are properly scoped. |
| C36 | UE-VG03 Material 3 roles | pass | low | Source-review §UE-VG03 supports on-role relationships as method/vocabulary only; no imported token names or business semantics. |
| C37 | UE-VG04 Radix scale | pass | low | Correctly rejects the 1–12 palette as a token source while adapting state-slot decomposition. |
| C38 | UE-VG05 Apple materials | pass | medium | Source-review §UE-VG05 and the local material grammar support glass only in registered chrome/transient slots and solid content. Include fallback/legibility checks before implementation. |
| C39 | UE-VG06 Fluent lifetimes | pass | low | Lifetime mapping is supported as a method; do not import Acrylic/Mica/Smoke CSS or blur values as product tokens. |
| C40 | UE-VG07 Carbon type strategies | pass | low | Source-review §UE-VG07 supports expressive serif only in an explicit Pages/editorial slot; controls, tables, and composer remain productive. |
| C41 | UE-S03/S04/S13 behavior donors | pass | low | Correctly reference behavior vocabulary only, with no dependency or default blur. Keep local owners and capabilities authoritative. |
| C42 | External reduced-motion claim | pass | low | Rejection is consistent with the local reduced-motion contract and the return timeline’s static column. Keep the source as an external claim rejection, not a new product rule. |
| C43 | External iridescent/shimmer status | pass | low | Rejection matches final WK-135 `8/8 ignore` and FN-28 material/state separation. Cite intake §4an for final disposition. |
| C44 | Taste formula / 78–82% accuracy | pass | low | Correctly rejects the figure as a measurement; no Courtwork dataset or acceptance claim is made. |
| C45 | CW-PREF dark authored plane lighter | pass | medium | User direction and the dark amendment evidence support the narrow dark `float` mapping, light unchanged, cards/overlays untouched. Keep it as a preference/implementation follow-up, not a general Visual Grammar acceptance. |

## Consumption ruling

The return is usable as a bounded design specimen after the corrections above. The unresolved donor and source-pin issues must remain deferred, and all “live,” “accepted,” “adopted,” or “canonical” language must retain the package’s stated boundary: drawings display existing facts and candidates; they do not create capability, semantic authority, or product acceptance. The row-level machine record is in `consumption-review.json`.
