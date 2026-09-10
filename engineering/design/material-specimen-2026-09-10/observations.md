# FE-05 · Material specimen · observations

Base `a579929`. Specimen: [index.html](index.html). Facts:
[measurements.json](measurements.json). Method and source freeze:
[README.md](README.md).

Design specimen only. Nothing here is merged, deployed, accepted or
independently verified. Every recommendation below is revisable by the user's
visual adjudication; §11 reduces the round to five decisions.

Numbers quoted as `mean Δ` are the mean per-pixel maximum channel difference on
0–255 between a candidate and its baseline, both captured at their own element
box with identical content and identical pixel alignment. They isolate material.
`identical across backdrops` means the same figure was produced over the quiet,
code and status backdrop states — the strongest available evidence that a
material is not sampling anything.

---

## 1 · The two facts that decide most of this round

**(a) Nothing scrolls behind the header, and nothing scrolls behind the
composer.** `app/web/index.html:188–281` and `app/web/styles.css` put
`.chat-header` and `footer.composer-area` as `flex: none` siblings *around*
`#conversation-body` inside `main.chat-panel`. Neither overlaps the scroll
container. A `backdrop-filter` on either therefore samples `.chat-panel`'s own
solid `--panel`, and blurring one uniform colour returns that same uniform
colour.

The measurements show this directly rather than by argument:

| candidate | quiet backdrop | code backdrop | status backdrop |
|---|---|---|---|
| H1 vs H0, light | 4.142 | 4.142 | 4.142 |
| H1 vs H0, dark | 12.270 | 12.270 | 12.270 |
| C1 vs C0, light | 3.562 | 3.562 | 3.562 |
| C1 vs C0, dark | 8.000 | 8.000 | 8.000 |
| J0 vs JF, light | 5.306 | 3.001 | 3.260 |
| J0 vs JF, dark | 26.272 | 6.941 | 9.892 |
| P0 vs PF, dark | 16.531 | 13.221 | 14.983 |

Jump-to-latest and the context popover — the two registered consumers, both
genuine overlays — move when the content behind them moves. The header and the
composer do not move at all. Their glass is not layer separation; it is a flat
tint applied to a surface that has nothing behind it.

**(b) The header edge is already dissolved, on the content side, with no
material at all.** `app/web/styles.css` gives `.message-stream`
`mask-image: linear-gradient(to bottom, transparent, #000 16px)` under the
comment *"Scroll surfaces: content dissolves under the header instead of being
cut"*. The problem the progressive-edge candidates were built to solve has a
shipped solution that costs no sampling layer, no fallback and no registry entry.

Board B's bottom row shows the same three recipes with the header moved over the
stream, clearly labelled **COMPOSITION-DEPENDENCY · not a candidate, not current
geometry, not a proposal**. There the mechanics work well (H2o vs H1o mean Δ
4.18–4.94, max 122–176; H3o vs H2o mean Δ 8.13–8.92 light, 10.54–12.05 dark) —
which is exactly the point: these recipes need a composition change before they
mean anything, and FE-05 does not make composition changes.

---

## 2 · The multi-layer branch, cut before construction

EX-CC6 established that with a two-token closed set, stacking pseudo-elements
cannot produce a progressive sequence of blur radii — every layer must re-use
`--blur-chrome` or `--blur-transient`, so the extra layers buy additional
backdrop sampling and compositing and no additional semantic level. It was not
built here. The only progressive candidate is **one sampling layer plus one
gradient mask**, and no `--blur-chrome-soft` is proposed.

Wording is kept honest throughout: `backdrop-filter: blur()` holds the radius
constant; `mask-image` changes where the sampled layer is visible. H2 and H3 are
a **progressive material edge**, not blur-radius interpolation.

---

## 3 · Header

Four stages, one variable each, on the production geometry.

| | H0 | H1 | H2 | H3 |
|---|---|---|---|---|
| background | `--panel` | `--glass` | transparent | transparent |
| sampling layers | 0 | 1 (element) | 1 (`::before`) | 1 (`::before`) |
| blur | none | 12px | 12px | **12px** |
| mask | none | none | `to bottom, #000 62%, transparent` | `to bottom, #000 46%, transparent` |
| sampling extension | 0 | 0 | 0 | 24px desktop / **0 below 768** |
| border | `--line` | `--line` | `--line` | `--line` |

mean Δ against H0 — light / dark, over the quiet, code and status backdrops:

- **H1** 4.142 / 12.270 · **identical over all three backdrops**
- **H2** 3.330 / 9.852 · **identical over all three backdrops**
- **H3** 5.565, 5.241, 5.391 / 14.335, 14.347, 13.431 · varies slightly
- **H3 vs H2** 2.247, 1.916, 2.069 / 4.650, 4.656, 3.755

Only H3 has any backdrop dependence at all, and only because its 24px extension
reaches over the first sliver of the stream. Its entire contribution over H2 is
about 2/255 in light — under the threshold at which anyone would call it a
different design — and the pixels it changes are the same pixels the stream's
own 16px mask is already fading.

H1's max Δ is 8 (light) and 21 (dark): a uniform shift with no edge structure.
In dark the shift is a 10%-paper film laid over `--panel`, so the header simply
becomes a slightly lighter band. That reads as an unexplained tint, not as a
higher layer.

**Evidence:** measurements.json `pixel_comparisons` rows for `work-header`;
captures `board-b-header__1440-light.png`, `board-b-header__1440-dark.png`,
`board-b-header__1440-light-b2-code.png`, `board-b-header__1440-light-b4-status.png`,
`board-b-header__1440-light-b0-quiet.png`.

**Tradeoff:** choosing solid forgoes a material that other products use to say
"this band floats above the document". Against that: on this geometry the band
does not float above anything, the visible result is backdrop-independent, and
each candidate costs a registry entry, a fallback block, a masked layer and a
mask-clearing rule that no lint can enforce. Choosing H2 or H3 buys a difference
of 2–5/255 that changes when the theme changes but not when the content does.

**Author recommendation:** **A0 · remain solid.** If a later round moves the
header over the stream (Round 5's contextual toolbar, or a scroll-under header),
A2 becomes the right candidate at that time and the extension stays a
desktop-only option; this round should not install the material in advance of
the composition that would justify it. Recorded as **COMPOSITION-DEPENDENCY**.

**User decision: pending.**

---

## 4 · Header edge

The sidecar shows the selected candidate with and without `--line`.

**Evidence:** `board-b-header__1440-light.png` / `__1440-dark.png`, edge sidecar
row. With the hairline removed and the material faded, the boundary between band
and content is carried by nothing at all in the reduced-transparency and
no-support states, where the material is gone by contract. The E1 cell in the
`reduce-transparency` capture is a header with neither material nor line.

**Tradeoff:** two boundary languages stacked can read as indecision. But the
hairline is the only boundary that survives every fallback, and WK-127 kept it
deliberately as coexisting structure.

**Author recommendation:** **B0 · retain `--line`.** Under recommendation A0 this
is moot in practice; it is stated so the answer is on record if any Hx is
chosen. The hairline should not be removed because a blurred edge looks
sufficient in the one state where the blur exists.

**User decision: pending.**

---

## 5 · Composer

C0 solid `--float` versus C1 `--glass` + 12px. No mask, no extension, no
geometry change of any kind — the composer keeps its own non-scrolling band, its
inset, its height, its border and its shadow.

mean Δ C1 vs C0: **3.562 light / 8.000 dark, identical over all three
backdrops**, max Δ 14 / 17.

This is the predicted negative result and it arrives cleanly. The difference is
a flat tint that would look the same over a blank page. Nothing in the specimen
introduces an artificial colourful backdrop to make C1 attractive, and none is
available that would change the number, because the composer samples `--panel`
whatever the stream contains.

**Evidence:** measurements.json `pixel_comparisons` rows for `composer`; Board A
row 4 in `board-a-main__1440-light.png` and `__1440-dark.png`.

**Tradeoff:** none identified in favour of C1. A nearly invisible C0→C1
difference is evidence that solid is already the correct material.

**Author recommendation:** **C0 · remain solid.** Recorded as
**COMPOSITION-DEPENDENCY**: if overlay geometry is ever required before glass
makes semantic sense here, that is a composition decision for another round, and
the composer stays solid until then. The specimen deliberately did not move it.

**User decision: pending.**

---

## 6 · Transient alpha and saturation

Sequential ablation. P0 → P1 changes alpha only; P1 → P2 changes saturation only.

| comparison | light (quiet / code / status) | dark (quiet / code / status) |
|---|---|---|
| P1 vs P0 · alpha 0.86→0.92, 0.10→0.16 | 1.119 / 0.986 / 1.095 — 1.9% / 1.2% / 4.8% of pixels | 6.820 / 7.044 / 7.440 — ~61% of pixels |
| P2 vs P1 · `saturate(1.4)`→`saturate(1)` | 0.034 / 0.031 / 0.214 — **0% of pixels** | 0.625 / 0.623 / **1.877 — 26.45% of pixels** |
| P2 vs PF · proposed recipe vs solid | 2.558 / 2.277 / 2.376 | 23.525 / 20.392 / 20.417 |

Three things follow.

**Saturation is inert except in exactly the case the question was asked about.**
At the proposed alpha, dropping `saturate(1.4)` to `saturate(1)` changes nothing
measurable in light and nothing measurable in dark *until* semantic status colour
passes behind, where it moves a quarter of the surface's pixels. That residue is
chroma amplification of `danger` / `success` / review colour on a surface that is
supposed to be semantically neutral. Neutralising costs nothing and removes it.

**In light theme the proposed transient is functionally solid.** P2 differs from
the solid fallback by about 2.4/255. At alpha 0.92 the light recipe is a raised
surface with a rounding error of translucency. That is not an argument against
it — it is an argument that the transient recipe is, in practice, a dark-theme
recipe, and that the light column of any future glass debate is nearly a no-op.

**In dark theme neither candidate alpha achieves semantic neutrality.**
`board-c-transient__1440-dark-b4-status.png` is the clearest capture in the
specimen: at P0 the red and green status fields are plainly legible *through* a
neutral context popover; P1's higher alpha reduces the leakage but does not close
it; P2 removes the amplification but not the leakage itself. Only PF is neutral.

This is a **token-level misfit**, recorded rather than fixed here: the dark
transient alpha of 0.16 does not deliver the neutrality the Transient role
claims, and no local tuning of one component is the right response. Blur radius
is not implicated — 12/16 behave as specified throughout.

**Evidence:** measurements.json `pixel_comparisons` rows for `context-popover`;
captures `board-c-transient__1440-light.png`, `__1440-dark.png`,
`__1440-light-b4-status.png`, `__1440-dark-b4-status.png`,
`__1440-light-b2-code.png`.

**Tradeoff:** keeping `saturate(1.4)` preserves the current shipped recipe and
avoids touching a surface nobody has complained about. Neutralising gives up a
faint richness that is invisible in light and only visible in dark when it is
amplifying exactly the colours Courtwork reserves for meaning.

**Author recommendation:** **D1 · neutralise to `saturate(1)`**, with the
proposed alpha (0.92 / 0.16) visible and independently decidable. Follow-up to
book, not decided here: the dark transient alpha needs to go further than 0.16
before a transient surface can be called semantically neutral over status
content, or such surfaces resolve to solid.

**User decision: pending.**

---

## 7 · Review tint

R0 / R1 / R2 on one solid raised human-decision micro-surface. No blur, no
glass, no different icon, no red text substitution, no red rail, glow, shadow or
focus ring. The only thing that changes is the surface concentration:
`color-mix(in srgb, var(--attention-review) 5% | 10%, var(--float))`.

mean Δ against R0: **R1 11.468 light / 11.120 dark; R2 20.288 / 18.283.**
Backdrop-independent in every state, as a solid surface should be.

In `board-d-review__1440-light.png` R1 reads as a warm cast that separates the
card from the neutral plane without announcing a fault. R2 reads as pink — near
the point where the object starts to look like the error rather than the request.
The explicit *Needs you* label and the existing structure carry the state in all
three, which is the required redundant signal; with the tint removed the card
loses nothing but the cast.

**Evidence:** measurements.json `pixel_comparisons` rows for `review`; captures
`board-d-review__1440-light.png`, `__1440-dark.png`, `__390-light.png`,
`__390-dark.png`, `board-d-review__1440-light-zoom200.png`.

**Tradeoff:** R0 keeps the surface perfectly neutral and puts all the weight on
the label, which is already sufficient. R2 is easier to find at a glance across a
dense list, at the cost of reading as an error state. R1 sits between them.

**Author recommendation:** **E1 · 5%.** It points attention without turning the
object into an error. 10% is not "more expressive and therefore better"; it is a
different claim about severity than *Needs you* is making.

**User decision: pending.**

---

## 8 · Fallback

Three separate conditions, kept separate.

| condition | mechanism | result |
|---|---|---|
| `prefers-reduced-transparency: reduce` | real media emulation **and** an identical page simulation | every surface: 0 sampling layers, 0 masks |
| `@supports not (backdrop-filter)` | simulation only — capability support cannot be emulated | every surface: 0 sampling layers, 0 masks |
| `forced-colors: active` | real media emulation for the media block **and** a page simulation | filters off, tint non-essential, boundary and focus carried by border and text |

Fallback equivalence was asserted mechanically, not by eye:
`__specimenCheck()` toggles the reduced-transparency state and compares every
declared surface's visible text, control count, width and height before and
after. All four are unchanged for every surface — only the material disappears.
`mask-image: none` is enforced as a hard requirement, because a solid surface
that still fades out through a transparency mask is not a fallback; the check
fails if any surface keeps a mask in either fallback state.

`measurements.json.specimen_checks` records six checks, all passing:
sampling layers only on declared variants; blur radius in {12px, 16px}; no
nested sampling layers outside the declared negative control; reduce and
no-support clear both filter and mask; fallback preserves label, control count
and geometry; no content plane carries a material.

Static contrast is reported only for the solid-fallback state, where the surface
really is one opaque colour: 60 measured rows, **minimum 5.96**, none below 4.5.
For the translucent states `foreground_contrast_static` is
`not_measured (surface background is not a single opaque colour)`. A static
figure from one background sample is never offered as proof for every
translucent backdrop; the backdrop-variation evidence is the pixel-comparison
table, a different kind of evidence and labelled as such.

**Evidence:** `board-a-main__1440-light-reduce-transparency.png`,
`__1440-dark-reduce-transparency.png`, `__1440-light-nosupport.png`,
`__1440-light-forced-colors-sim.png`, `board-b-header__*` and `board-c-transient__*`
in the same conditions.

**Tradeoff:** none. This is a constraint, not a choice. The forced-colors state
is a failure-mode check; no Windows high-contrast certification is claimed from a
static specimen.

**Author recommendation:** any candidate whose hierarchy only works while
transparency is available is rejected on that ground alone. The reduced-
transparency header is visually indistinguishable from H0, which is the correct
result and also the reason A0 costs nothing.

**User decision: pending** (no decision is demanded here).

---

## 9 · 390 and 200%

At 390: the sampling extension is **0** for H3 in every measured row; interaction
targets are unchanged; `document.scrollWidth === innerWidth` in both themes, so
there is no horizontal overflow; no focus ring is cropped and no transient is
clipped. Narrow screens do not receive a stronger blur to compensate for the
missing extension — the radius is 12px at every width.

At 200% (a 720×450 CSS viewport at `deviceScaleFactor: 2`, captured 1:1 at 1344
device pixels): the material hides no overflow, focus stays visible and the
header mask crops no text. One thing is worth recording rather than deciding: a
320px transient occupies roughly 44% of the width at that zoom and its content
starts scrolling inside itself. A transient recipe is a recipe for a *small*
surface; the existing narrow-surface contract and `max-height` are what keep it
from becoming a large translucent content panel, and they must survive any
material change. No special glass recipe is proposed for zoom.

**Evidence:** measurements.json `layout` and the 390 rows of `surfaces`;
captures `board-*__390-light.png`, `board-*__390-dark.png`,
`board-c-transient__1440-light-zoom200.png`,
`board-d-review__1440-light-zoom200.png`,
`board-b-header-mechanics__1440-light-zoom200.png`.

**Tradeoff:** none identified.

**Author recommendation:** keep the extension desktop-only if any Hx is ever
selected, and keep the narrow-surface contract as the thing that bounds a
transient at large zoom.

**User decision: pending** (no decision is demanded here).

---

## 10 · Dark mode, performance and compositing

**Dark is where this round actually lives.** Every material difference is two to
three times larger in dark than in light: H1 12.270 vs 4.142; C1 8.000 vs 3.562;
J0 26.272 vs 5.306; P2-vs-solid 23.525 vs 2.558. Dark glass is not the inverted
light formula and was not treated as one — the specimen carries the frozen
distinct alphas (chrome 0.86 / 0.10, transient 0.92 / 0.16). The practical
consequence is that a material decision that looks harmless in light can be the
dominant visual event in dark, which is why the dark status-backdrop captures
are the ones to look at before answering D.

**Compositing.** Every candidate has exactly **one** backdrop sampling layer;
`measurements.json` records `backdrop_sampling_layers` per surface and per
theme, and the specimen check fails if any candidate nests two. The declared
glass-on-glass panel is the single exception and exists only to be marked
REJECTED.

Backdrop roots and clipping ancestors were read from the live tree, not assumed.
The production facts that matter:

- `.chat-panel` declares `overflow: hidden` and is the header's parent, so a
  header `::before` extending **downward** stays inside it and is not clipped —
  an outward or upward extension would be, and EX-CC6's four-sided proposal is
  therefore not implementable as written.
- `.message-stream` carries a `mask-image`, which makes it a backdrop root for
  anything inside it. `.jump-latest-button` is its *sibling*, not its
  descendant, so the registered chrome consumer samples the composited stream
  correctly. Any future material placed *inside* `.message-stream` would not.
- No ancestor of any candidate carries `filter`, `opacity < 1` or
  `mix-blend-mode`. No translucency anywhere in the specimen is produced by
  parent opacity; every surface uses a transparent background colour instead, so
  no foreground text is faded and no backdrop root is created accidentally.

**Frame cost: `not_measured`.** EX-CC6 already showed that this environment
cannot measure compositor or GPU blur cost — the headless vsync tick hides it and
`Performance.getMetrics` reads the main thread. No non-headless trace was taken
in this pass, so no FPS number, jank observation or performance score is
reported, and none should be inferred from the structural counts above. What can
be said without measurement: one sampling layer is cheaper than two, which is
why the multi-layer branch was cut.

**Motion.** The specimen is static. No transition or animation is declared on any
material property; no scroll listener exists; no selected material requires one.
A gradient mask interacting with scrolling content is not an animation of the
mask.

**Evidence:** measurements.json `surfaces[].backdrop_sampling_layers`,
`nearest_backdrop_root`, `clipping_ancestor`, `production_ancestor_facts`,
`frame_cost`; `specimen_checks`.

**Tradeoff:** accepting `not_measured` leaves a real question open. It is the
honest state of the evidence; a fabricated score would be worse than a gap.

**Author recommendation:** if any glass is ever added beyond today's two
consumers, take one real non-headless trace on the actual target WebView in the
implementation PR, recording device, browser, viewport, layer count, visible
jank and trace method.

**User decision: pending** (no decision is demanded here).

---

## 11 · Material-role matrix

| surface | semantic role | baseline | eligible candidate | fallback | proposed disposition |
|---|---|---|---|---|---|
| Jump latest | Chrome | glass | current (J0) | solid raised | **keep** — the only chrome consumer that genuinely samples; it also defines the upper bound of how conspicuous product glass may feel |
| Context popover | Transient | glass | P1 / P2 | solid raised | **user decision** — recommend P2's neutral saturation; dark alpha booked as a misfit |
| Work header | Chrome candidate | solid | H1 / H2 / H3 | solid + line | **user decision** — recommend remain solid; COMPOSITION-DEPENDENCY |
| Composer | resting control surface | solid | C1 only | solid | **user decision** — recommend remain solid; COMPOSITION-DEPENDENCY |
| Inspector | future Transient | none | representative only | solid raised | **recipe candidate** — inherits whatever D selects; no implementation now |
| content / document / diff / table | Content | solid | none | solid | **hard keep** |
| persistent sidebar | Content frame | solid | none | solid | **hard keep** |
| modal | Modal | solid + smoke | none | solid + smoke | **hard keep** |
| review micro-surface | Review | neutral | R1 / R2 | neutral | **user decision** — recommend 5% |

---

## 12 · The five decisions

### A · Header material
- **A0 · remain solid** ← author recommendation
- A1 · uniform Chrome glass
- A2 · single-layer progressive edge
- A3 · progressive edge + desktop sampling extension

### B · Header edge
- **B0 · retain `--line`** ← author recommendation and existing governance default
- B1 · remove `--line`

### C · Composer
- **C0 · remain solid** ← author recommendation
- C1 · Chrome glass

### D · Transient neutrality
- D0 · retain `saturate(1.4)`
- **D1 · neutralise to `saturate(1)`** ← author recommendation
  (proposed transient alpha 0.92 / 0.16 is visible and independently decidable)

### E · Human review tint
- E0 · none
- **E1 · 5%** ← author recommendation
- E2 · 10%

No other product material decision is demanded by this round. Content glass,
sidebar glass, glass-on-glass, refraction, lensing, additional blur levels, blur
animation, decorative noise, modal-smoke semantics, a new elevation level and a
strong blur token are already governed and are not reopened.

---

## 13 · The policy this round is actually delivering

If the recommendations above are taken, FE-05's deliverable is not "glass". It is
a short material policy:

```
Content stays solid.
The resting composer stays solid.
The scrolling header stays solid — its edge already dissolves on the content side.
Tiny floating chrome that genuinely overlays scrolling content may sample the backdrop.
Transient inspectors and popovers share one neutral recipe, and its dark alpha is not finished.
Human review may receive one extremely weak explicit tint.
Everything degrades to the same solid hierarchy.
```

Round 5's Inspector and contextual toolbar consume that policy plus FE-05a's
shape and density; they do not choose their own blur, alpha or shadow. A future
skin may change the neutral scale, the review tint and the surface values. It may
not change which component is eligible for glass, which layer is content, which
action or state exists, the glass-on-glass rule or the fallback semantics.
