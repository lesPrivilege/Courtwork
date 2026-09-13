# Colophon — candidate brand mark study for les Privilege

## Candidate name

**Colophon** — after the publisher's device placed at the end of a printed text; a sign of craft provenance and editorial discipline.

## Intent

Evolve the current `les Privilege` mark toward a more layered, editorial identity by replacing the two equal-width horizontal bars with a three-bar register system whose widths descend by a constant step. The L-path geometry is preserved byte-for-byte from the observed reference. The aim is quiet unfamiliarity: precise enough to read as intentional, restrained enough to remain a mark rather than a diagram.

## Files

| File | Role |
|---|---|
| `colophon-mark.svg` | Monochrome candidate; all fills are `currentColor` |
| `colophon-mark-tritone.svg` | Tritone colour treatment on the same geometry |

The tritone is a colour variant, not a separate candidate.

## Observed inputs used

| Input | Source | Observation |
|---|---|---|
| L-path geometry | `references/current-mark.svg` | Continuous closed path at `translate(4.5 0)`; vertical arm x 8–17, foot y 47–56, Q-curve corner radius ≈ 2.25 |
| Bar position and size | `references/current-mark.svg` | Two `<rect>` at x=24, width=23, height=7, rx=1.75; y=12 and y=30 |
| Monochrome fill | `references/current-mark.svg` | `currentColor` throughout |
| Tritone palette | `references/current-tritone-mark.svg` | L #242d33, upper bar #c95e55, lower bar #6f7e88 |
| viewBox | Both references | `0 0 64 64` |
| Brand-red constraint | `01-brand-observations.md` | Red is identity colour only; never error, active, review, permission, diff, or safety state |
| External spelling | `00-brief-and-status.md` | `les Privilege` |
| Graphic mark | `00-brief-and-status.md` | `le` |

## What changed and why

### Preserved

- **L-path**: byte-identical to the observed reference, including `translate(4.5 0)`, all Q-curve control points, and corner radii. The L is the structural anchor; changing it would break continuity with the current identity.
- **viewBox**: `0 0 64 64`, preserving 64×64 / 32×32 / 16×16 compatibility.
- **Bar left edge**: all bars begin at x=24, maintaining the fixed gutter between bar group and L arm.
- **Tritone palette**: the same three hex values (#242d33, #c95e55, #6f7e88); no new colour introduced.
- **`currentColor` monochrome**: the monochrome candidate adapts to any host foreground.

### Changed

| Property | Observed | Candidate | Rationale |
|---|---|---|---|
| Bar count | 2 | 3 | Introduces a register-hierarchy reading; three bars distinguish layers instead of pairing them |
| Bar widths | 23, 23 | 23, 17, 11 (−6 step) | Constant 6-unit decrement produces a clean diagonal right edge; each bar is visually distinct |
| Bar height | 7 | 6 | Lighter typographic weight; slightly more editorial proportion against the L arm |
| Bar rx | 1.75 | 1.5 | Proportionally consistent with the reduced height; marginally crisper |
| Bar y-positions | 12, 30 | 10, 24, 38 | Redistributed with uniform 8-unit inter-bar gaps; bar 1 sits closer to the L-arm top |
| Tritone mapping | red = bar 1, grey = bar 2 | red = bar 1, grey = bars 2 + 3 | Red marks the primary identity register; subordinate registers share the grey |

## Interpretations

The following readings informed design decisions. They are not factual claims about the mark's meaning, the project's status, or any company's intent.

1. **Three-register reading.** The three bars can be read as a layered evidence hierarchy — each successively narrower bar suggesting decreasing scope or increasing specificity. This is loosely informed by the project's concern with evidence types (observed / interpreted / unresolved) as recorded in `02-project-and-paper-facts.md`, but the mark does not encode those categories.

2. **Editorial descent.** The stepped right edge gives the composition a sense of settling or narrowing, analogous to the logical narrowing in a colophon or scholarly apparatus. This is an aesthetic reading, not a semantic assertion.

3. **Typographic proportion.** The height and radius adjustments (7 → 6, 1.75 → 1.5) aim for a more typographic, less UI-component sensibility, following the brief's "editorial" direction.

4. **Naming.** "Colophon" references the publisher's-device tradition and the user's philological background. It is a working name for this study, not a product name, trademark, or identity claim.

## Unresolved questions

1. **Third bar at small sizes.** The shortest bar (width 11 in viewBox units) renders at ≈ 2.75 px in a 16×16 rasterisation. Whether to accept the degradation or simplify to two bars at icon sizes is a design decision requiring visual testing.

2. **Bar spacing rhythm.** The current 8-unit inter-bar gaps are mechanically equal. An unequal rhythm (e.g. 8 then 6) might create a more dynamic reading. Untested; left as an open option.

3. **Tritone third-bar colour.** Both subordinate bars share #6f7e88. A distinct lighter grey for bar 3 was considered and deferred to avoid introducing a colour outside the observed palette.

4. **L-arm weight relative to bars.** The L arm is 9 units wide; the bars are now 6 units tall (down from 7). The slightly increased weight contrast is intentional but could be revisited if the arm feels disproportionately heavy.

5. **Dark-mode tritone.** No dark-background tritone variant is included. Producing one requires lightening or inverting the fixed hex palette, which is a separate design decision. The monochrome `currentColor` variant handles dark contexts.

6. **Seal / colophon point.** A small square below the bars (analogous to a Chinese 印章) was considered and excluded to keep the change set minimal. It remains a possible further study.

## Explicit non-claims

- This candidate is **not** accepted, published, legally cleared, or adopted as a product default.
- This candidate does **not** represent Anthropic's mark, intent, or brand direction.
- This candidate does **not** claim that `les Privilege` is a registered company, funded venture, or commercial entity.
- `Juliana Sorel`, `蕾丝`, `Lovelace`, and related names in the source bundle are **supplied creative material**, not observed facts about real people or entities.
- The "evidence register" reading is an **interpretation**, not a factual assertion about what the mark means.
- No external research, provider access, web fetch, or independent verification was used. All inputs are from the supplied package.
- Completion of this candidate package does not constitute brand acceptance, Paper integration, accessibility audit, or deployment authorisation.
