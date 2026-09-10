# EX-IC1 · Observations

2026-09-10 · Design only. Base `2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`.

**No icon family was selected by the author.** Everything below is description. There is no winner,
no recommendation, no score and no migration target. Where a difference is stated as a number it comes
from `measurements.json`; where it is stated as an appearance it comes from the four canonical captures
and the squint board.

Read `ink coverage` as what it is defined to be in `measurements.json`: the bounding box of the drawn
ink divided by the box of the rendered `<svg>`. It is an occupancy ratio, not optical weight and not ink
area. It is quoted here only because it is the one size fact that is deterministic across three families
whose canvases and construction differ.

---

## 1. Per-semantic observations (1440, both schemes)

Format per §13: semantic · slot · recognition/metaphor · apparent weight · centering/optical size ·
interaction with neighbouring type · light/dark anomaly · narrow anomaly · source ambiguity.

### Navigation

**Home** · expanded primary navigation, glyph 20 in a 32 row beside a 13px label.
Metaphor is the same in all three: roof plus door. Lucide occupies most of its box (coverage 0.73);
MingCute `home-3` (0.65) and Phosphor `house` (0.59) sit further inside their safe zones and read a step
smaller beside the same label. Phosphor's filled construction makes its roofline read slightly softer
than Lucide's stroked corner. Centering is within half a pixel everywhere. No light/dark anomaly — all
three inherit `currentColor` from one token. At 390 the row grows to 44 and the glyph stays 20, so the
size relationship between the three is unchanged. MingCute ambiguity: `home-1` and `home-2` are
door-less and would read as a different object; `house`/`house-2` are a different building.

**Project object** · project row, glyph 20 plus a trailing 16 chevron.
All three draw a tabbed folder and are immediately recognisable. Lucide 0.72 / MingCute 0.62 /
Phosphor 0.56 again puts Lucide visibly largest at the same nominal 20. Phosphor's folder is the
lightest of the three next to the same label and, on the dark capture, is the first of the three to
recede against `--frame`. No narrow anomaly. No source ambiguity worth recording.

**New session** · navigation item, glyph 20 + text.
The largest metaphor spread on the board. Lucide `square-pen` (0.77) draws a thin pen crossing an open
square. MingCute `edit` (0.56) draws the same construction but noticeably smaller and quieter in the
row. Phosphor `note-pencil` (0.61) draws a much heavier pencil body with a visible ferrule, which reads
as *a pencil on a page* rather than *edit*; at 16 in the appendix that pencil is the densest single
object any family contributes to this set. Ambiguity: MingCute offers `edit-4` (a document, not a
square) and `edit-2`/`pencil` (a bare pencil, which loses the surface); Phosphor offers
`pencil-simple-line`, which is lighter but reads as *write*, not *new*.

**Settings** · sidebar footer item, glyph 20 + text.
Lucide and MingCute both use horizontal sliders and both measure 0.56; the MingCute drawing packs three
tracks into a tighter vertical band, so it reads denser than its number suggests, and in the squint view
it is one of the two MingCute knots. Phosphor `sliders-horizontal` (0.47) draws only two tracks with
open knobs and is the lightest glyph in the whole Navigation cluster; beside a 13px label it comes close
to disappearing in the dark capture. Ambiguity in both candidate families is only between gear and
slider metaphors, and Lucide's shipped choice is a slider, so the gears were not displayed.

### Chrome

**Toggle navigation** · icon-only 32 (44 narrow) control in a 56 band, glyph 18.
All three read as *a frame with a left column*. Lucide `panel-left` 0.69, MingCute `layout-left` 0.56,
Phosphor `sidebar-simple` 0.56. MingCute's divider rule sits closer to the frame edge and its corner
radius is tighter, which makes the enclosed column read as a solid bar at 18 and as a dark block in the
squint view. Phosphor's is the most open of the three. Source ambiguity, MingCute: `layout-leftbar-open`
and `layout-leftbar-close` encode a *direction of action* that Courtwork's single `aria-expanded` toggle
does not carry, so displaying either would have imported a state distinction the product does not have.

**Toggle work surface** · same slot, mirrored.
Lucide and MingCute both ship the mirrored orientation. **Phosphor has no right-hand panel glyph in
`phosphor-icons/core` v2.0.8**; `sidebar` and `sidebar-simple` exist in the left orientation only, and
`square-split-horizontal` / `columns` mean *split* and *columns*, not *the panel on the right*. This is
the one NO MATCH on the primary board and it lands on a permanent, high-frequency top-chrome control that
sits two hit-targets away from its left-hand twin. Selecting Phosphor would therefore require either a
donor glyph or a locally mirrored asset for a semantic that is neither missing from the product nor rare.

**Close named surface** · icon-only 32 close in a surface header, glyph 18.
The three crosses are the most nearly interchangeable pair of cells on the board: 0.34 / 0.38 / 0.39.
MingCute and Phosphor draw a slightly larger cross than Lucide, which is the one place on the board
where the candidates read *heavier* than the baseline rather than lighter. Butt-capped MingCute versus
round-capped Lucide is visible at 200% and not at 18.

**Disclosure / open** · trailing 16 chevron in a row, `--muted`.
Lucide `chevron-right` 0.19 and MingCute `right` 0.18 are equivalent. Phosphor `caret-right` 0.26 is a
wider, more open angle and is the heaviest disclosure marker of the three. It is also the only glyph in
this cluster with a measurable optical offset (0.5px right of the svg centre), which at the end of a row
is invisible but is the sort of thing a shared row primitive would have to absorb. Because this chevron
also appears nested inside the project row and the file row, the difference repeats three times per
screen in the real shell.

### Agent/work

**Run / activity** · flow row, glyph 16 + title + one metadata word.
Lucide `activity` has the highest coverage on the entire board (0.84): the trace runs nearly edge to
edge, which at 16 makes it the strongest type marker in a Chat Flow row. MingCute `heartbeat` (0.56) and
Phosphor `pulse` (0.63) both draw the same vital-sign metaphor with a shorter trace and more air; in the
squint view both fade toward the row's own text where the Lucide trace still holds. MingCute source
ambiguity is recorded as AMBIGUOUS: the drawn metaphor matches, but MingCute's own name for it is
medical, and a semantic registry would have to bind `run.activity` to a glyph called `heartbeat`
explicitly rather than inherit meaning from the asset name.

**File** · flow row, glyph 16 + path + metadata + trailing chevron.
All three draw a folded-corner page with text rules and all three are recognisable at 16.
MingCute `document-2` puts a shorter rule set higher in the page; Phosphor `file-text` is the lightest.
Source ambiguity, MingCute: `file` is the page *without* rules and is the equivalent of Lucide `file`,
not `file-text` — using it would erase the distinction Courtwork's glyph-semantics contract relies on to
separate a recorded file row from a plain object.

**Question** · flow row, glyph 16 + the question's own text.
All three draw an empty rectangular bubble with a tail, which is what Courtwork needs — a bubble with
dots or rules inside would suggest a conversation rather than one pending question. Lucide 0.80,
MingCute `message-2` 0.65, Phosphor `chat` 0.61. Phosphor's `chat` carries the largest optical offset
measured anywhere on the board (1.0px below centre at 16), because its tail is included in the ink while
the body is not re-centred; against a single line of 13px text the bubble consequently sits a hair low.

### Contextual

**Copy exact content** · icon-only 32 at the end of a message footer, glyph 18.
Lucide `copy` (0.84) is two plain rounded squares. Phosphor `copy` (0.56) is the same construction,
lighter and smaller. MingCute `copy` (0.62) is recorded AMBIGUOUS: it is two sheets, but the front sheet
carries text rules and a corner fold, so at 18 it reads as *duplicate this document* rather than *copy
these exact bytes*, and in the squint view it is the second MingCute knot. Courtwork uses this control
for `Copy source hash` and `Copy proposed content hash` as well as `Copy response`, where a document
metaphor is the wrong object.

**Refresh named read** · icon-only 32 in an inspector header, glyph 18.
All three draw two arcs and two arrowheads turning clockwise. Lucide 0.69, MingCute `refresh-3` 0.59,
Phosphor `arrows-clockwise` 0.56. Phosphor's arrowheads are the largest relative to its arcs, so it
reads as the most emphatic of the three for a control the contract deliberately keeps quiet.
MingCute ambiguity: `refresh-4` is the counter-clockwise mirror and `refresh-2` is a single closed ring;
both are plausible from the filename alone and only one matches the shipped direction.

### Composer

**Session files** · icon-only 32 inside the floating composer, glyph 18.
Lucide `paperclip` 0.79 draws a thin single-wire clip. MingCute `attachment` 0.60 draws a doubled,
rounded clip that is the heaviest single mass MingCute contributes to the primary board — on the
floating composer surface it is the first thing the eye lands on, ahead of the placeholder text.
Phosphor `paperclip` 0.58 is closest to Lucide in line but smaller.

**Send** · 32 pill on solid `--accent`, glyph 18, reversed to `--on-accent`.
Coverage is the closest of any row: 0.44 / 0.41 / 0.47. On the filled slot the differences invert —
against the accent fill, Phosphor's heavier shaft reads strongest and MingCute's reads lightest.
This is the one slot where the candidates' larger safe zone helps: all three keep clear of the pill edge.

**Cancel run** · the same physical pill, running state.
Lucide `square` 0.69, MingCute and Phosphor 0.56. Both candidates therefore put a visibly smaller stop
mark in the same accent pill that carries their own send arrow, so the send↔cancel pair changes apparent
size when the state changes — more so than it does today. Phosphor's square has the tightest corner
radius of the three and reads hardest against the pill. Nothing here touches the state machine: the slot,
the accessible names `Send` and `Cancel run`, and the fact that `Cancel run` is not shortened, are
identical in all three columns.

---

## 2. Squint / optical-rhythm diagnostic

Grayscale, mildly blurred, same sizes, no new material. No score is computed.

- **Lucide** keeps the most even rhythm down the column: the glyphs that carry a Chat Flow row
  (`activity`, `file-text`, `message-square`) all survive the blur at 16, and nothing turns into a knot.
  Its cost is at the top end — `copy` and `activity` are close to filling their boxes, so the board
  reads slightly *busier* overall than either candidate.
- **MingCute** produces two conspicuous dark knots at 18, `settings-2` and `attachment`, and one at
  16, `copy`. Everything else in the column sits a step lighter than Lucide, so the same column contains
  both the darkest and several of the lightest cells on the board — the least even rhythm of the three.
- **Phosphor** is the most uniformly light column. `sliders-horizontal` at 20 and `folder` at 20 are the
  two cells that come closest to vanishing beside their own 13px labels in the dark capture, and the
  `caret-right` disclosure is conspicuously the heaviest chevron. Because Phosphor Regular is authored as
  filled outline rather than stroke, its apparent weight does not track a stroke number, and the blur
  makes that most visible in the Navigation cluster.
- Across all three, the **filled accent pill** (Send / Cancel run) is the one slot where the blur order
  reverses relative to the rest of the board.

---

## 3. Objective measurement summary

Full data in `measurements.json`; 54 glyph records per context × 5 contexts.

| Context | Family | Glyphs | Coverage min / median / max | Max abs centre offset | Clipped | Min hit box |
|---|---|---|---|---|---|---|
| D-1440-L | Lucide | 18 | 0.194 / 0.694 / 0.841 | 0.42 px | 0 | 32 × 32 |
| D-1440-L | MingCute | 18 | 0.177 / 0.563 / 0.651 | 0.30 px | 0 | 32 × 32 |
| D-1440-L | Phosphor | 17 | 0.258 / 0.559 / 0.629 | 1.00 px | 0 | 32 × 32 |
| M-390-L | all three | 18 / 18 / 17 | unchanged | unchanged | 0 | **44 × 44** |
| 200 % (720 px layout) | all three | 18 / 18 / 17 | unchanged | unchanged | 0 | **44 × 44** |

Dark contexts return the same geometry as their light counterparts; all three families take one
`currentColor` from one token, so no family gains or loses size between schemes.

Facts worth carrying, all of them size facts rather than quality facts:

1. At the same nominal 16 / 18 / 20, Lucide's ink fills more of its box than either candidate — median
   0.69 against 0.56 for both. Adopting either candidate at today's sizes makes every glyph on every
   surface read a step smaller against unchanged type, unless the sizes are re-tuned.
2. Lucide's spread is the widest (0.19 → 0.84). Both candidates are tighter and more consistent
   glyph-to-glyph, which is the same fact from the other side.
3. Only Phosphor exceeds a half-pixel optical offset anywhere, and only at `chat` (1.0 px).
4. Nothing is clipped in any of the five contexts, in either scheme, at either viewport, at 200 %.

---

## 4. 200 % zoom, focus and narrow hit targets

Checked at a 720 CSS px layout viewport with a 2× device scale — a 200 % browser zoom of the 1440 board —
for close, Send, Cancel run, navigation, contextual copy, and the Work/File row, in all three columns.
Raw result in `captures/zoom200-focus-check.json`.

- Focus ring (2 px outline, 2 px offset): not clipped by any ancestor for any of the 18 probed controls.
- Glyph: none collapsed or clipped.
- Label: `Home` and the Work/File row title are not truncated at 720; the document ends with no
  horizontal page scroll.
- Hit boxes at 390 and at 200 %: 44 × 44 measured for every icon-only control in all three columns —
  Courtwork's own `@media (max-width:1023px), (pointer:coarse)` floor, mirrored in `specimen.css`, not
  a value asserted from a screenshot.
- Accessible names are unchanged across the three columns and come from the action semantic, never from
  the SVG filename: `Toggle navigation`, `Open work surface`, `Close session overview`, `Copy response`,
  `Refresh workspace`, `Session files`, `Send`, `Cancel run`, `Inspect this run`. The Phosphor NO MATCH
  cell keeps its own `role="img"` label rather than silently borrowing a glyph.

Not checked: real touch hardware and real screen readers (VoiceOver / NVDA). Viewport emulation is not
touch testing.

---

## 5. Semantic ambiguities and NO MATCH

| Row | Family | Status | What it means |
|---|---|---|---|
| `chrome.work.toggle` | Phosphor | **NO MATCH** | No right-oriented panel glyph in core v2.0.8. A permanent top-chrome control. |
| `run.activity` | MingCute | AMBIGUOUS | Drawn metaphor matches; the family's own name (`heartbeat`) is medical. Registry would have to bind meaning explicitly. |
| `content.copy` | MingCute | AMBIGUOUS | Two sheets, but the front sheet carries rules and a fold, so it reads *duplicate document* rather than *copy exact bytes*. |
| `chrome.nav.toggle` / `chrome.work.toggle` | MingCute | note | `layout-*bar-open` / `-close` encode a direction of action Courtwork's single toggle does not have. |
| `read.refresh` | MingCute | note | `refresh-3` and `refresh-4` are clockwise/counter-clockwise mirrors; filename alone does not resolve which matches the shipped direction. |
| `object.file` | MingCute | note | `file` equals Lucide `file`, not `file-text`; choosing it would erase a distinction the glyph-semantics contract uses. |
| `session.new` | Phosphor | note | `note-pencil` is a heavier pencil body than Lucide's; it reads as *pencil on page*, not *new*. |

All 24 inventory rows resolve to MATCH except the two AMBIGUOUS MingCute rows above and the one Phosphor
NO MATCH. No missing mapping falls back to Lucide anywhere: a missing candidate renders an explicit
`NO MATCH` token.

---

## 6. Family summaries

### Lucide — SHIPPED BASELINE

**Strengths observed** — the most even optical rhythm under blur; the strongest type markers at 16, which
is the size Chat Flow rows actually use; a right-hand panel glyph; complete coverage of all 24 names in
the renderer allowlist; a published construction standard (safe zone, optical volume, centre of gravity)
that Courtwork already cites as the acceptance rule for any admitted local glyph.
**Costs observed** — the busiest board of the three; `copy` and `activity` come close to filling their
boxes; the widest glyph-to-glyph size spread (0.19 → 0.84).
**Outliers** — `activity` 0.84, `copy` 0.84, `message-square` 0.80.
**Missing mappings** — none.

### MingCute Regular — CANDIDATE

**Strengths observed** — complete coverage of all 24 names including both panel orientations; a calmer,
more consistent baseline weight than Lucide at the same nominal size; the closest drawn equivalent to
Lucide's `square-pen` construction of the two candidates; a 24 grid and 2 px stroke that match
Courtwork's existing geometry contract without any conversion.
**Costs observed** — two conspicuous knots at 18 (`settings-2`, `attachment`) inside an otherwise
lighter column, which is the least even rhythm of the three; a `copy` that carries a document metaphor
where Courtwork means exact bytes; butt caps and miter joins where the shipped treatment is round.
**Outliers** — `attachment` (heaviest mass on the primary board), `settings-2`, `copy`.
**Missing mappings** — none. Two AMBIGUOUS (`run.activity`, `content.copy`).

### Phosphor Regular — CANDIDATE

**Strengths observed** — the most uniformly light column and the widest safe zone, which is the easiest
of the three to sit beside dense text without competing; the only family that names the Run trace
neutrally (`pulse`); the strongest reading on the filled accent pill.
**Costs observed** — no right-hand panel glyph at all; the lightest glyphs (`sliders-horizontal`,
`folder`) come closest to receding beside their own labels in the dark capture; the heaviest disclosure
chevron, repeated up to three times per row group; a `note-pencil` that reads as a pencil rather than as
*new*; a filled 256 canvas whose apparent weight does not track a stroke number, so Courtwork's existing
"2 px centred stroke" normalization rule does not describe it.
**Outliers** — `caret-right` 0.26 (heaviest chevron), `chat` (1.0 px offset), `sliders-horizontal` 0.47.
**Missing mappings** — one: `chrome.work.toggle`.

---

## 7. Questions for the user

1. If a candidate is advanced, is the smaller apparent size at today's 16 / 18 / 20 acceptable as-is, or
   would the size grammar be re-tuned as part of the migration? The measurement above says this is not a
   detail: it is a uniform one-step reduction across every surface.
2. Does a NO MATCH on a permanent top-chrome control (Phosphor / `panel-right`) disqualify a family on
   its own, or is it a bounded donor question under the existing IC-6 path?
3. MingCute's Regular set uses butt caps and miter joins. Is "preserve the family's authored treatment"
   or "keep the shipped round cap/join" the rule if MingCute is advanced? The two answers produce
   different products and only the first is what this specimen shows.
4. Should `run.activity` keep a vital-sign metaphor at all, given that only Lucide and Phosphor name it
   neutrally and MingCute would have to be bound to a glyph called `heartbeat`?

## 8. Explicitly not observed

Real touch hardware · real screen readers · Fill / Duotone / Bold / Thin / Light variants ·
any glyph outside the current 24-name allowlist · any Courtwork domain glyph (Matter, Evidence, Expert) ·
Remix and Hugeicons · migration cost · bundle size.
