# Spark / Attention · three paired directions · 2026-09-11

Answer to Astra's [product atmosphere revision](../../../release/ui-publication-closure-2026-09-11/icon-atmosphere-20260911/README.md) (baseline 34baa408): the provisional source → fan-out and streams → ring shapes are replaced. Look at `sheet.html` first; the notes are at its foot on purpose.

## What is here

| Item | Path |
|---|---|
| Direction sources (editable, 24 grid · 2px · round · currentColor · 1px safe edge) | `directions/a/`, `directions/b/`, `directions/c/` — `spark.svg` + `attention.svg` each |
| The replaced provisional pair, kept as history | `directions/current/spark.svg`, `directions/current/attention.svg` (bytes identical to 2c7d181's `tools/ui-vendor/courtwork/*.svg`) |
| Notes per direction and the recommendation | `directions.json` |
| Sheet: glyph + product name first at 16 / 18 / 20 / 24, light and dark, beside Chat and generic seats; then real-nav photographs; explanations last | `sheet.html` ← `node build-sheet.mjs` |
| Real navigation photographs, 1× and 2×, light and dark, one per direction | `nav/nav-<direction>-<theme>-<dpr>x.png` ← `node capture-nav.mjs --origin http://127.0.0.1:<port>` (swaps the glyph in the live DOM; served sprite untouched) |
| After integration, the served sprite as-is | `nav/nav-integrated-*.png` ← `node capture-nav.mjs --integrated` |
| Hashes | `directions-manifest.json` |

## The three directions

| | Spark | Attention | Character |
|---|---|---|---|
| **A · Strike · Awake** | a struck spark: one oblique stroke leaving the lower left, three short rays flying off its tip | an eye just opened: upper lid and pupil only, no lower lid | one long line plus small marks; Spark leans and leaves, Attention is level and still |
| **B · Pop · Hold** | a dot with three detached motion dashes bursting up-right | a dot held in an open cup | the dot is the shared subject; round and warm |
| **C · Sprout · Regard** | a shoot with one leaf and a free grain of light | a still centre between two open arcs — ( • ) | organic against geometric; the most poetic, the least like the Lucide neighbours |

## Recommendation and replacement scope

**Direction A is integrated** (author recommendation; visual acceptance stays with non-author review and user feedback). Reasons and trade-offs are in `directions.json` and at the foot of the sheet.

Replaced: `tools/ui-vendor/courtwork/spark.svg` and `attention.svg` bytes and their `sources.json` hashes/origins; the built sprite symbols `#spark` and `#attention` in `app/web/vendor/icons.svg`; `vendor/manifest.json`; the Stage 1 contact sheet and `glyph-manifest.json`; the two meaning cells in the Stage 1 README. Unchanged: semantic keys `spark.surface` / `attention.agent`, product names, visible labels, permissions, Review state, owners, hit regions, `chat.svg`, every Lucide glyph, all consumers (`setSemanticControl` calls, Settings tabs, Chat page). The 19 structural tests pass against the new bytes; they prove the contract, not the shape.

Kept as history: the old SVGs under `directions/current/`, the Stage 1 screenshots (`evidence/publication-final-20260911/`, `s1-*`), and the user's navigation screenshot in Astra's revision folder.

Not done here: no red, glow, gradient or animation; no fill/line variants by state; no change to the generic icon family.
