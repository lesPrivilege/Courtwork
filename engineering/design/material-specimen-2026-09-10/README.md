# FE-05 · Material / blur specimen

2026-09-10, Claude. Round 6/6 of the web-GPT design line. A design-only specimen:
no product code, no production lint registration, no acceptance, no merge claim.

It answers one question — on Courtwork's already-stable geometry, typography and
interaction hierarchy, **which short functional surfaces gain useful layer
separation from translucency, and which should stay solid** — and reduces the
round to five decisions (A–E, see [observations.md](observations.md) §11).

Material is treated as the last dependent variable. Composition, typography,
shape, interaction semantics and placement are all held constant.

## Source freeze

| Object | SHA |
|---|---|
| execution `main` | `a579929edd66544e6aa7cd8cd7d2399fae8265d3` |
| `app/web/styles.css` (blob) | `c17a68c7d05af3cf74116fc50261b27508159e74` |
| `app/web/index.html` (blob) | `e4e1f1a904feb067b31461ec58380fba9dbffc40` |
| `tools/lint-materials.mjs` (blob) | `a8468cdab4f9aa8649b949761741a2920d21f478` |
| `engineering/design/home-composition-2026-09-10/material-grammar.md` (blob) | `38bae90f3cc42f9a43d8f533400183efdfe7cc86` |
| `engineering/mvp/execution/work-surface-kit/explore/ex-cc6-progressive-blur.md` (blob) | `8e6cdc07afe97995acd83c23b52c24ee07482664` |
| `WO-FE05A-dispatch-prompt.md` (blob) | `911c2d9600463123f8cc77c52fd7a0eef579837d` |
| FE-05a baseline | **DEPENDENCY-NOT-LANDED** |

The planning snapshot named `main@2e9da09`. `2e9da09` is an ancestor of the
execution base; `main` advanced during execution and this branch was rebased
onto `a579929` before the final capture run, so every SHA above and every
capture come from one tree.

### DEPENDENCY-NOT-LANDED · FE-05a

FE-05a has not landed on `main`. Only its dispatch prompt (`5b4c981`) is in the
history; the density work (`0879b32`) is not an ancestor of `main`, and `main`
still carries `--control: 32px` rather than FE-05a's 28px desktop target. The
specimen therefore builds against actual `main` and contains **no private
imitation of a future production baseline**. Typography, control height, shape
and spacing below are today's, not V1's.

## What the specimen is made of

`index.html` links `../../../app/web/styles.css` **verbatim** — it is not copied,
inlined or edited. Every product role, radius, shadow, type step, control
anatomy and hairline in the boards comes from that file. `specimen.css` adds only
the candidate materials, the fallback blocks and this page's own scaffolding;
`specimen.mjs` drives the lab controls, parks each stage's scroll at a fixed
offset, and exposes `window.__specimenMeasure()` / `window.__specimenCheck()`.

Surfaces reuse the product's own class names (`.chat-header`, `.context-popover`,
`.jump-latest-button`, `.composer-form`, `.chat-panel`, `.message-stream`) inside
the real DOM nesting read from `app/web/index.html`, so the header really is a
`flex: none` sibling above the scroll container and the composer really is its own
non-scrolling band. Two deviations, both recorded in `measurements.json`:

- `.context-popover` is `position: absolute` inside its stage rather than
  `position: fixed`, so several can be shown at once. Width, padding, radius,
  border, rim, shadow, type and row anatomy are unchanged.
- `.chat-header`'s composition-dependency diagnostic row (Board B, bottom)
  moves the header over the stream. It is labelled as not a candidate and not a
  proposal, and no recommendation is drawn from it.

No font is added. `app/web/styles.css` declares no sans stack of its own, so the
specimen declares none either and renders in the same UA default the product does.

## Closed variables

Blur radius is fixed at the two existing tokens — `--blur-chrome` 12px and
`--blur-transient` 16px. There is no 8/10/14/20/24/32 comparison board: the
experiment asks where blur belongs, not which arbitrary radius looks nicest.
Shape, depth (`--shadow-float`, `--rim`) and edge colours are constant. The
multi-layer progressive-blur branch was cut before construction (see
[observations.md](observations.md) §2); the only progressive candidate is one
sampling layer plus one gradient mask.

## Frozen proposal values

| Band | Light alpha | Dark alpha | Today on `main` |
|---|---|---|---|
| Chrome (`--glass`) | 0.86 | 0.10 | same — unchanged by this specimen |
| Transient (proposed) | 0.92 | 0.16 | `--glass-muted` equals `--glass` (0.86 / 0.10) |

These are specimen values until selected and implemented. Nothing here installs
a token.

## Generation and capture method

1. A static file server rooted at the repository (port 8931, scratch, stopped
   afterwards) serves `index.html` so the relative link to `app/web/styles.css`
   resolves. No Courtwork application server was started; no data directory was
   created; no provider was configured and no credential file was read.
2. Headless Chrome 152.0.7977.83 over CDP (`--headless=new`, sRGB forced,
   scrollbars hidden, GPU **not** disabled), driven by a scratch script that
   calls the page's own `__specimenMeasure()` / `__specimenCheck()`.
3. `Emulation.setDeviceMetricsOverride` supplies each viewport. The 200% zoom
   condition is a 720×450 CSS viewport at `deviceScaleFactor: 2` — a real 1440
   window at 200% browser zoom — captured with `clip.scale = 2`, so every PNG is
   1:1 device pixels. No screenshot is upscaled.
4. Reduced transparency and forced colours are captured with real
   `Emulation.setEmulatedMedia` features **and** with the page's own simulation
   attribute; the two mechanisms declare identical rules, and
   `measurements.json` records which produced each row. `@supports not
   (backdrop-filter…)` cannot be emulated, so the no-support condition is
   simulated only — stated as such rather than claimed as a capability test.
5. `measurements.json` is written from the live computed styles and from
   pixel comparisons made inside the browser, not transcribed from the CSS.

The engine actually renders `backdrop-filter`: `CSS.supports` reports true and
the same surface captured with and without the material is not pixel-identical
(`render_proof` in `measurements.json`).

## Performance

`frame_cost: not_measured`, everywhere. EX-CC6 already established that the
available headless measurements cannot see compositor or GPU blur cost — the
fixed headless vsync tick hides it and `Performance.getMetrics` reads the wrong
thread. No non-headless trace was taken in this pass, so no FPS, jank or
performance score is reported. What *is* recorded is structural: the number of
backdrop sampling layers, the number of masked layers, the nearest backdrop root
and the nearest clipping ancestor for every candidate.

## Files

```
README.md          this file
index.html         the specimen page (generated; boards A–F)
specimen.css       candidate materials, fallbacks, page scaffolding
specimen.mjs       lab controls, scroll parking, measurement, static checks
measurements.json  facts: computed material properties + pixel comparisons
observations.md    evidence, tradeoffs, recommendations, the five decisions
captures/          1:1 PNGs, named board__viewport-theme-condition
```

## Boundaries

`tools/lint-materials.mjs` is untouched and remains authoritative for
production. Its registry still holds exactly two consumers,
`.jump-latest-button` and `.context-popover`; nothing in this directory enters
that allowlist. `specimen.css` lives outside `app/web`, so the production lint
does not scan it — the specimen validates itself instead, in
`specimen.mjs`'s `__specimenCheck()` (six checks, results in
`measurements.json`). A future FE-05 implementation must make an explicit
production decision first, then register the consumer and its fallback tests in
the same PR.
