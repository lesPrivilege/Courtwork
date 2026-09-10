# EX-FE05 · Material / blur specimen

Round 6/6 of the web-GPT design line, 2026-09-10, Claude. Execution base
`main` `a579929`; branch `codex/web-gpt-design-fe05-material`. Design specimen
only — no product code, no production lint registration, no acceptance, no merge.

Deliverable:
[engineering/design/material-specimen-2026-09-10/](../../../../design/material-specimen-2026-09-10/README.md)
— `index.html` (boards A–F), `specimen.css`, `specimen.mjs`,
`measurements.json`, `observations.md`, `captures/` (44 PNGs, 1:1).

## Scope declaration

Files written: the specimen directory above and this file. `app/**`, `tools/**`,
`brand/**`, `domains/**`, `docs/work-core/**`, `contracts/**`, `AGENTS.md`,
`engineering/current.md` and `package*.json` are untouched.
`tools/lint-materials.mjs` is unmodified and its registry still holds exactly
two production consumers, `.jump-latest-button` and `.context-popover`; nothing
in the specimen enters that allowlist. No Reduce-transparency preference is
added to Settings. No blur token is added.

No Courtwork application server was started, no data directory was created, no
provider was configured and no credential file was read. A scratch static file
server (port 8931) served the repository so the specimen's relative link to
`app/web/styles.css` resolved; it and every headless Chrome instance were
stopped afterwards.

## Prerequisite state

**FE-05a: DEPENDENCY-NOT-LANDED.** Only the dispatch prompt (`5b4c981`) is on
`main`; the density commit `0879b32` is not an ancestor, and `main` still
carries `--control: 32px` rather than FE-05a's 28px desktop target. The specimen
builds against actual `main` and contains no private imitation of a future
baseline.

## What the round found

1. **`.chat-header` and `footer.composer-area` are `flex: none` siblings around
   `#conversation-body`, not overlays.** A material on either samples
   `.chat-panel`'s solid `--panel`. Measured consequence: the header and composer
   glass candidates produce a pixel delta that is *identical* over the quiet,
   dense, code, selected and status backdrop states (H1 4.142 light / 12.270
   dark; C1 3.562 / 8.000), while the two registered consumers — which really do
   overlay — vary with what is behind them (J0 5.306 / 3.001 / 3.260 light,
   26.272 / 6.941 / 9.892 dark). The header and composer candidates are flat
   tints, not layer separation.

2. **The header edge is already dissolved without any material.**
   `.message-stream` carries
   `mask-image: linear-gradient(to bottom, transparent, #000 16px)` under the
   comment *"Scroll surfaces: content dissolves under the header instead of
   being cut"*. The progressive-edge candidates re-solve a solved problem at the
   cost of a registry entry, a fallback block and a mask-clearing rule no lint
   enforces.

3. **EX-CC6's four-sided sampling extension is not implementable as written.**
   `.chat-panel` declares `overflow: hidden` and is the header's parent, so an
   outward or upward extension is clipped. A **downward** extension stays inside
   the panel and is not clipped; that is the only direction the H3 candidate uses.

4. **Transient saturation is inert except in exactly the case it was questioned
   for.** `saturate(1.4)` → `saturate(1)` at the proposed alpha changes 0% of
   pixels in light and 0% in dark until semantic status colour passes behind,
   where it moves 26.45% of them. Neutralising costs nothing and removes the
   chroma amplification of `danger` / `success` / review colour on a surface that
   is meant to be neutral.

5. **Token-level misfit, booked not fixed: the dark transient alpha.** At 0.10
   (today) and at the proposed 0.16, red and green status fields remain legible
   *through* a neutral context popover. Only the solid fallback is neutral. Blur
   radius is not implicated — 12/16 behave as specified throughout. In light
   theme the proposed 0.92 alpha makes the transient differ from solid by about
   2.4/255, i.e. the transient recipe is in practice a dark-theme recipe.

6. **Everything falls back cleanly.** Six specimen checks pass: sampling layers
   only on declared variants; blur in {12px, 16px}; no nested sampling layers
   outside the declared negative control; reduced-transparency and no-support
   clear both `backdrop-filter` and `mask-image`; the fallback preserves label,
   control count and geometry for every surface; no content plane carries a
   material. Static contrast in the solid-fallback state: 60 rows, minimum 5.96.

7. **`frame_cost: not_measured`.** EX-CC6's methodological ceiling stands; no
   non-headless trace was taken, so no performance number is claimed.

## Recommendations carried to the user (all pending)

A · header **A0 remain solid** · B · edge **B0 retain `--line`** ·
C · composer **C0 remain solid** · D · transient **D1 `saturate(1)`** ·
E · review tint **E1 5%**.

The conservative baseline in the work order expected the single-layer
progressive-edge candidate to be advanced. The production-geometry measurements
did not support it, and the specimen reports what it measured. The candidate is
not discarded: it is recorded as **COMPOSITION-DEPENDENCY**, correct at the
moment a later round actually puts a header or toolbar over the stream. Board B
carries a labelled overlay-geometry diagnostic showing that the mechanics work
in that case (H2o vs H1o mean Δ 4.18–4.94; H3o vs H2o 8.13–8.92 light,
10.54–12.05 dark), explicitly marked as not a candidate and not a proposal.

## External precedent · REFERENCE only

No external recipe becomes Courtwork token authority.

- **Apple HIG / Liquid Glass** — consumed: functional top layer, control
  emphasis, content underneath, sparse custom material, accessibility
  adaptation, avoid stacked glass. Not consumed: refraction, lensing, dynamic
  thickness, hardware-shaped morphing.
- **Microsoft Fluent Material / Acrylic** — consumed: solid as the common base,
  acrylic for transient light-dismiss surfaces, smoke for modal obstruction, and
  Mica as the demonstration that atmospheric depth need not mean blur. Not
  consumed: Windows material APIs.
- **Linear Liquid Glass** — consumed: a dense professional interface can keep
  translucency while deliberately dropping refraction for readability. Not
  consumed: its glass geometry or implementation.
- **MDN `backdrop-filter` / `prefers-reduced-transparency`** — consumed:
  backdrop-root behaviour, support detection, the reduced-transparency
  mechanism. No browser-specific aesthetic rule.

## Explicitly not done

`app/web` changes · production lint registration · a Reduce-transparency
Settings preference · Inspector implementation · contextual-toolbar
implementation · Pages / provider atmosphere · Dystopia skin · a new blur token ·
icon or Shape changes · any performance claim from headless metrics.
