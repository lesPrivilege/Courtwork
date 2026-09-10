# EX-IC1 · Icon family specimen

**Design only. No family was selected by the author. Nothing in this directory is imported by the app.**

Base `2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`. Production selection is unchanged: Lucide static SVG
1.41.0 remains the only shipped general-purpose family (IC-5, IC-7). This specimen migrates nothing,
replaces nothing and mixes nothing.

## The question this exists to answer

With Courtwork's semantics, typography, density, shape grammar and real control slots held constant,
which Regular family produces the strongest coherent product language: current Lucide, MingCute Core
Regular, or Phosphor Regular?

## Open it

Any static file server rooted at this directory, e.g.

```bash
python3 -m http.server 8873 --directory engineering/design/icon-specimen
```

then `http://127.0.0.1:8873/index.html`. `?theme=light` / `?theme=dark` pins the scheme so a capture is
reproducible from the URL alone; with no parameter the page follows the viewer's own preference.
The page fetches nothing at runtime — every glyph is inlined from the frozen commits recorded in
`sources.json`. No CDN, no webfont, no icon font, no framework, no dependency, no lockfile change.

## What is here

| File | What it is |
|---|---|
| `index.html` | Generated. Primary board, inventory appendix, squint diagnostic, negative controls. |
| `specimen.css` | Hand-written. Colour, role and geometry tokens transcribed from `app/web/styles.css` at the base SHA so the slots are Courtwork's own. One rule set for all three columns. |
| `mapping.json` | Hand-authored. Courtwork semantic → per-family asset, with status, reasoning and the candidates considered and rejected. The input the board is built from. |
| `build.py` | Generated the assets, `sources.json` and `index.html` from `mapping.json` plus three pinned checkouts. Kept for reproducibility. |
| `sources.json` | Per-asset provenance: family, tag, commit, upstream path, upstream URL, SHA-256, byte length, upstream viewBox, licence, and the Courtwork semantics it serves. |
| `measurements.json` | 54 glyph records × 5 rendered contexts. Facts only — no score, no weighting, no ranking. |
| `observations.md` | Per-semantic and per-family descriptions, squint notes, ambiguities, questions for the user. |
| `assets/<family>/` | The consumed SVGs, byte-identical to upstream, plus each family's LICENSE. |
| `captures/` | `D-1440-L`, `D-1440-D`, `M-390-L`, `M-390-D`, the representative 200 % capture and its focus/hit-target probe. |

## Method, and the rule it protects

The main board compares **authored family character**, so the candidates are not normalized before
comparison. Lucide keeps its stroked 24 grid with round caps and joins; MingCute keeps its stroked 24
grid with its own caps and joins; Phosphor Regular keeps its filled 256 canvas. Only `width`, `height`,
`class`, `aria-hidden` and `focusable` are set on the root element — viewBox, path data and
fill/stroke treatment are carried through untouched.

IC-6's "normalize a donor glyph to canonical geometry" rule applies *after* an individual foreign glyph
has been admitted into production for a demonstrated semantic gap. It does not apply to a family-level
comparison, and applying it here would have destroyed the independent variable. There is deliberately no
fourth "Courtwork-normalized MingCute" column.

Candidate matching is by product meaning, never by filename similarity. Where two candidates were
plausible the ambiguity is written down in `mapping.json` before one was chosen for display. Where no
confident equivalent exists the cell renders an explicit `NO MATCH`; it never falls back to Lucide.
`NO MATCH` is evidence.

Every family column shares one DOM anatomy, one set of visible strings, one type scale, one spacing
scale, one set of control dimensions and hit areas, one radius, one border, one surface, one foreground
token, one state and one set of neighbours. `specimen.css` contains no per-family selector except the
column label.

## Sources

| Family | Variant | Repository | Tag | Commit | Licence |
|---|---|---|---|---|---|
| Lucide | Regular (shipped baseline) | `lucide-icons/lucide` | 1.41.0 | `bca7e75a816dcf1e75e8feb5a3198a68cbb8a052` | ISC (Feather MIT notice retained upstream) |
| MingCute | Core Regular | `mingcute-design/mingcute-icons` | v3.0.2 | `e884b033f868d1c38286537c75e764000dc74442` | Apache-2.0 |
| Phosphor | Regular | `phosphor-icons/core` | v2.0.8 | `d42782b2abe747d904b971ccab48b182a1455f86` | MIT |

Two source notes, both recorded in `sources.json`:

- MingCute publishes the same Core Regular geometry twice inside that commit. `assets/svg/core/regular/`
  hardcodes `stroke="#10161F"`; `packages/svg/core-regular/` carries `stroke="currentColor"`. The
  specimen consumes the `currentColor` distribution so all three columns inherit one foreground token.
  Both are upstream-authored; the path data differs in encoding, not in shape, and nothing was redrawn.
- Phosphor Regular is authored as a filled outline on a 256 canvas (`fill="currentColor"`), not as a
  stroked 24 grid. That is the family's own Regular weight, not the Fill weight, and it is preserved as
  authored. No icon font or webfont was used.

Fill, Duotone, Bold, Thin and Light are out of scope for this round and appear nowhere.

## Negative controls

`Answer`, `Allow this write`, `Deny`, `Approve`, `Reject` and `Retry` stay visible text under every
family, and no candidate icon is compared in that area. The point is that changing the icon family does
not move Courtwork's semantic boundary: authorization, adjudication and retry keep their words, their
scope and their consequences (IC-1, glyph-semantics §5).

## Pre-existing issue found, not repaired

`BASELINE-PROVENANCE-01`. At the base SHA, `plug` is in the renderer allowlist in
`app/web/ui-controls.mjs` and present as a `<symbol>` in `app/web/vendor/icons.svg`, but
`app/web/vendor/manifest.json`'s Lucide asset listing has no `plug.svg` entry — it lists 23 glyph files
plus `LICENSE` for a 24-symbol sprite. Confirmed by direct comparison of the three files at
`2e9da09`. Reported here as a pre-existing defect; **not fixed in this PR**, which writes nothing under
`app/`.

## Scope

Not done, deliberately: production family selection · production asset migration · semantic-registry
implementation or semantic adapter · Fill/Duotone experiment · custom or domain glyph design ·
redesign of universal actions · any change under `app/`, `brand/`, `domains/`, `tools/`, `contracts/`
or any package/lockfile.

The four outcomes this specimen is built to let the user choose between — keep Lucide, advance MingCute
Regular, advance Phosphor Regular, or no family-level migration at all — are set out in
`../../mvp/execution/work-surface-kit/explore/ex-ic1-icon-specimen.md`. None is preselected.
