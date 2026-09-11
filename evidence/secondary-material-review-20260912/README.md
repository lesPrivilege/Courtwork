# Secondary floating surfaces · bounded review

2026-09-12. User requested a Luna fast review of registered glass/blur semantics. Product baseline: `07688226330121e5877a6ff1e09e6ebf82995ae3`, integrated into `647bc2167efe5437d0ca73a60a406549d9a1e268`.

Luna (Mendel) independently read the CSS and material registry. Astra adjudication: no product patch is warranted by this bounded review.

| Surface | Existing contract and implementation |
|---|---|
| Jump to latest | `.jump-latest-button`, `--glass`, chrome blur |
| Context and connection cards | Shared `.context-popover`, `--glass-muted`, transient blur with saturation |
| Menu, tooltip, toast, model dialog | Solid floating role by design; no blanket glass treatment |

The [material lint](../../tools/lint-materials.mjs) registers exactly the first two selectors. Reduced-transparency, unsupported-backdrop and forced-colors CSS fallbacks resolve them to solid surfaces without blur. Registration describes material use, not authority, approval, or execution state.

Astra reran `node tools/lint-materials.mjs`: PASS, five CSS files, registered selectors and reduced-transparency fallback checks. This is source review and a bounded mechanical check; no new native assistive-technology or OS reduced-transparency test is claimed. Final ordinary light/dark media remains in the [integrated publication receipt](../publication-integrated-20260912/README.md). No new tokens, blur tiers, dependencies or page-specific overrides were introduced.
