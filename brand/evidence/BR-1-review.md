# BR-1 source/export review

Review target: `<isolated-checkout>`, branch `codex/brand-host-colors`, baseline `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`. Scope was limited to static source/export consistency; no browser run and no product-tree edits.

## Result: PASS

No blocking source or generated-asset defect found.

- `brand/src/symbol.mjs:33-35,38-42,50-56` now resolves public roles at each paint use with `var(--cw-<role>, themeDefault)`. The previous internal `:root,svg{--cw-*...}` declaration is gone, so inherited host values can reach the shadow SVG. Hierarchical actor/records use `--cw-ink`/`--cw-record`; depth's offset uses `--cw-depth`; review's amendment line uses `--cw-amend`; authority's base uses `--cw-background`; mono and currentColor relationship layers remain separately overridable through `--cw-color`.
- Theme defaults remain explicit in the renderer's light/dark palette. The fallback values match the former internal declarations, so an unthemed/standalone SVG keeps its prior colors. The existing ≤24px expressive-material downgrade remains intact and contains no filter reference for the small glyph path.
- All 40 exports are reproducible from the current renderer and the existing `brand/scripts/build.mjs` inputs: a read-only render-parity check found 0 mismatches. `manifest.json` has 40 assets and all 40 recorded SHA-256 values match the files. Export geometry hashes remain `522d4303216259490fb501458391431e8329a6aff8cfa3b463be6573d4614556`.
- Static checks passed: `node --check` for `symbol.mjs`, `court-symbol.mjs`, and `tests/host-colors.mjs`; an additional 137-assertion token/geometry scan found 0 failures; `git diff --check` was clean at review start. The author-reported browser evidence is intentionally treated as supplied evidence rather than rerun here.

The documented boundary is consistent with the code: large glass/depth/luminous face gradients remain package-owned, while host tokens cover the stated flat/currentColor layers and depth offset. Static SVGs retain fallback colors; page CSS inheritance requires the Web Component or inline SVG, as documented.
