# EX-IC1 · Icon family specimen — handoff

2026-09-10 · Design only · **user decision required** · no production diff.

## 1. Frozen base SHA

`2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f` (`main`, "docs: add web GPT design handoff").

## 2. Branch and commit

Branch `claude/ex-ic1-icon-specimen`, cut from the base SHA in an isolated worktree.
Commit SHA recorded in the final response; this document is written in the same commit.

## 3. Exact changed paths

```
engineering/design/icon-specimen/README.md
engineering/design/icon-specimen/build.py
engineering/design/icon-specimen/index.html
engineering/design/icon-specimen/mapping.json
engineering/design/icon-specimen/measurements.json
engineering/design/icon-specimen/observations.md
engineering/design/icon-specimen/sources.json
engineering/design/icon-specimen/specimen.css
engineering/design/icon-specimen/template.html
engineering/design/icon-specimen/assets/lucide/**            (24 SVG + LICENSE)
engineering/design/icon-specimen/assets/mingcute-regular/**  (24 SVG + LICENSE)
engineering/design/icon-specimen/assets/phosphor-regular/**  (23 SVG + LICENSE)
engineering/design/icon-specimen/captures/D-1440-L.png
engineering/design/icon-specimen/captures/D-1440-D.png
engineering/design/icon-specimen/captures/M-390-L.png
engineering/design/icon-specimen/captures/M-390-D.png
engineering/design/icon-specimen/captures/Z-200-L.png
engineering/design/icon-specimen/captures/zoom200-focus-check.json
engineering/mvp/execution/work-surface-kit/explore/ex-ic1-icon-specimen.md
```

Nothing else. `app/**`, `brand/**`, `domains/**`, `tools/**`, `contracts/**`, `AGENTS.md`,
`engineering/current.md`, `engineering/design/icon-controls.md`, `engineering/design/atlas/**`,
`intake-round-3.md`, `dispatch-round-4.md`, `web-gpt-design-handoff-20260910.md`, `package.json` and
`package-lock.json` are untouched. No dependency was added.

## 4. Family source / version / commit / licence

| Family | Variant | Repository | Tag | Commit | Licence | Upstream asset dir |
|---|---|---|---|---|---|---|
| Lucide | Regular · shipped baseline | `lucide-icons/lucide` | 1.41.0 | `bca7e75a816dcf1e75e8feb5a3198a68cbb8a052` | ISC (Feather MIT notice retained upstream) | `icons/` |
| MingCute | **Core Regular only** | `mingcute-design/mingcute-icons` | v3.0.2 | `e884b033f868d1c38286537c75e764000dc74442` | Apache-2.0 | `packages/svg/core-regular/` |
| Phosphor | **Regular only** | `phosphor-icons/core` | v2.0.8 | `d42782b2abe747d904b971ccab48b182a1455f86` | MIT | `assets/regular/` |

The Lucide commit is the one already pinned by IC-5 and by `app/web/vendor/manifest.json`; it was
re-resolved from the 1.41.0 tag rather than copied from the manifest, and it matches.

`sources.json` records, for every one of the 71 consumed assets: family, tag, commit, upstream path,
upstream URL, SHA-256, byte length, upstream viewBox, licence, local path and the Courtwork semantics it
serves. Each family's LICENSE is vendored beside its assets with its own SHA-256.

Two source facts worth carrying forward:

- **MingCute currentColor distribution.** The same Core Regular geometry ships twice in that commit:
  `assets/svg/core/regular/` hardcodes `stroke="#10161F"`, `packages/svg/core-regular/` carries
  `stroke="currentColor"`. The specimen consumes the `currentColor` distribution so all three columns
  inherit one foreground token. Both are upstream-authored; the path data differs in encoding only.
  Nothing was redrawn locally.
- **Phosphor Regular is filled, not stroked.** Phosphor authors its Regular weight as a filled outline on
  a 256 canvas (`fill="currentColor"`). That is the family's Regular weight, not the Fill weight, and it
  is preserved as authored. No icon font or webfont was used. Courtwork's existing "normalize to a 2 px
  centred stroke" donor rule does not describe this construction — a real consequence if Phosphor is
  advanced.

Fill, Duotone, Bold, Thin and Light appear nowhere.

## 5. Sixteen-semantic mapping

Matched by product meaning, not filename. Candidates considered and rejected are recorded per row in
`mapping.json`.

| Cluster | Courtwork semantic | Lucide | MingCute Regular | Phosphor Regular |
|---|---|---|---|---|
| Navigation | `nav.home` Home | `house` | `home-3` · MATCH | `house` · MATCH |
| Navigation | `project.object` Project object | `folder` | `folder` · MATCH | `folder` · MATCH |
| Navigation | `session.new` New session | `square-pen` | `edit` · MATCH | `note-pencil` · MATCH |
| Navigation | `app.settings` Settings | `settings-2` | `settings-2` · MATCH | `sliders-horizontal` · MATCH |
| Chrome | `chrome.nav.toggle` Toggle navigation | `panel-left` | `layout-left` · MATCH | `sidebar-simple` · MATCH |
| Chrome | `chrome.work.toggle` Toggle work surface | `panel-right` | `layout-right` · MATCH | — · **NO MATCH** |
| Chrome | `surface.close` Close named surface | `x` | `close` · MATCH | `x` · MATCH |
| Chrome | `disclosure.open` Disclosure / open | `chevron-right` | `right` · MATCH | `caret-right` · MATCH |
| Agent/work | `run.activity` Run / activity | `activity` | `heartbeat` · **AMBIGUOUS** | `pulse` · MATCH |
| Agent/work | `object.file` File | `file-text` | `document-2` · MATCH | `file-text` · MATCH |
| Agent/work | `question.pending` Question | `message-square` | `message-2` · MATCH | `chat` · MATCH |
| Contextual | `content.copy` Copy exact content | `copy` | `copy` · **AMBIGUOUS** | `copy` · MATCH |
| Contextual | `read.refresh` Refresh named read | `refresh-cw` | `refresh-3` · MATCH | `arrows-clockwise` · MATCH |
| Composer | `session.files` Session files | `paperclip` | `attachment` · MATCH | `paperclip` · MATCH |
| Composer | `composer.send` Send | `arrow-up` | `arrow-up` · MATCH | `arrow-up` · MATCH |
| Composer | `run.cancel` Cancel run | `square` | `square` · MATCH | `square` · MATCH |

Each row is rendered in its actual placement and size, resolved from `app/web/ui-controls.mjs` and
`app/web/styles.css` rather than invented: glyph 16 in a row, 18 on a control, 20 in navigation;
hit area 32 desktop and 44 narrow/coarse, taken from `--control`, never from a viewBox.

## 6. Twenty-four-glyph inventory result

The primary sixteen plus these eight cover the whole renderer allowlist (16 + 8 = 24).

| Courtwork glyph | Lucide | MingCute | Phosphor |
|---|---|---|---|
| `plus` | `plus` | `add` · MATCH | `plus` · MATCH |
| `search` | `search` | `search` · MATCH | `magnifying-glass` · MATCH |
| `plug` | `plug` | `plugin` · MATCH | `plug` · MATCH |
| `chevron-down` | `chevron-down` | `down` · MATCH | `caret-down` · MATCH |
| `maximize-2` | `maximize-2` | `fullscreen-2` · MATCH | `arrows-out-simple` · MATCH |
| `minimize-2` | `minimize-2` | `fullscreen-exit-2` · MATCH | `arrows-in-simple` · MATCH |
| `arrow-down` | `arrow-down` | `arrow-down` · MATCH | `arrow-down` · MATCH |
| `external-link` | `external-link` | `external-link` · MATCH | `arrow-square-out` · MATCH |

**Totals across all 24 rows.** Lucide 24 MATCH. MingCute 22 MATCH + 2 AMBIGUOUS + 0 NO MATCH.
Phosphor 22 MATCH + 0 AMBIGUOUS + 1 NO MATCH, plus 1 row (`chrome.work.toggle`) accounting for that gap.
No missing mapping silently falls back to Lucide anywhere; the Phosphor gap renders an explicit
`NO MATCH` token that keeps its own accessible label.

The appendix is diagnostic. It is not a product surface and not a 24-button application.

## 7. Objective measurement summary

`measurements.json`: 54 glyph records per rendered context, five contexts (1440 light, 1440 dark,
390 light, 390 dark, 200 % at a 720 px layout viewport). Per record: semantic, family, asset, slot role,
source viewBox, rendered CSS size, slot size, hit size, ink bbox, centre offset, ink coverage, clipped.

`ink_bbox` is the union of every shape's `getBBox()` expanded by half the computed stroke width where
the family strokes, converted to CSS px. Deterministic, defined in the file, no dependency added.
Fill-only Phosphor gets no expansion because none applies. `ink_coverage` is a bounding-box occupancy
ratio and is labelled as such: it is not optical weight and not ink area.

| Context | Family | Glyphs | Coverage min / median / max | Max abs centre offset | Clipped | Min hit box |
|---|---|---|---|---|---|---|
| D-1440-L | Lucide | 18 | 0.194 / 0.694 / 0.841 | 0.42 px | 0 | 32 × 32 |
| D-1440-L | MingCute | 18 | 0.177 / 0.563 / 0.651 | 0.30 px | 0 | 32 × 32 |
| D-1440-L | Phosphor | 17 | 0.258 / 0.559 / 0.629 | 1.00 px | 0 | 32 × 32 |
| M-390-L / 200 % | all three | 18 / 18 / 17 | unchanged | unchanged | 0 | 44 × 44 |

Dark returns the same geometry as light; all three take one `currentColor` from one token.

There is deliberately **no** aggregate score, weighted winner, percentage, aesthetic confidence or
pseudo-statistical ranking.

## 8. Four canonical captures

| Capture | Viewport | Scheme | File |
|---|---|---|---|
| D-1440-L | 1440 | Light | `engineering/design/icon-specimen/captures/D-1440-L.png` |
| D-1440-D | 1440 | Dark | `engineering/design/icon-specimen/captures/D-1440-D.png` |
| M-390-L | 390 | Light | `engineering/design/icon-specimen/captures/M-390-L.png` |
| M-390-D | 390 | Dark | `engineering/design/icon-specimen/captures/M-390-D.png` |

All four are full-page captures of the same document with the same surrounding UI; the only difference
between the two schemes is the pinned `?theme=`, and the only difference between 1440 and 390 is the
viewport. The 390 composition is Courtwork's narrow geometry, not a scaled-down 1440 board: the columns
stack so each family keeps full-width slots, and `--control` becomes 44 through the same
`@media (max-width:1023px), (pointer:coarse)` rule the app uses.

## 9. 200 % zoom, focus, narrow hit targets

`captures/Z-200-L.png` and `captures/zoom200-focus-check.json`, at a 720 CSS px layout viewport with a
2× device scale — a 200 % browser zoom of the 1440 board. Probed for close, Send, Cancel run, navigation,
contextual copy and the Work/File row, in all three columns (18 controls):

- Focus ring (2 px outline, 2 px offset) not clipped by any ancestor, for any of the 18.
- No glyph clipped or collapsed in any of the five measured contexts.
- `Home` and the Work/File row title not truncated; no horizontal page scroll.
- 44 × 44 measured for every icon-only control at 390 and at 200 %, in all three columns — measured from
  the control's own box, not asserted from a screenshot.
- Accessible names preserved and identical across columns; they come from the action semantic, never
  from the SVG filename (`Toggle navigation`, `Open work surface`, `Close session overview`,
  `Copy response`, `Refresh workspace`, `Session files`, `Send`, `Cancel run`, `Inspect this run`).
  Decorative glyphs stay `aria-hidden` and non-focusable.

Not checked: real touch hardware, real screen readers. Viewport emulation is not touch testing.

## 10. Squint-test observations

Grayscale, mild blur, same sizes, no new material, no score. Summary; full text in `observations.md` §2.

- **Lucide** holds the most even rhythm; its 16 px Chat Flow markers all survive the blur; its cost is a
  busier board overall, with `activity` and `copy` close to filling their boxes.
- **MingCute** produces two dark knots at 18 (`settings-2`, `attachment`) and one at 16 (`copy`) inside
  an otherwise lighter column — the least even rhythm of the three.
- **Phosphor** is the most uniformly light; `sliders-horizontal` and `folder` at 20 come closest to
  receding beside their own 13 px labels in the dark capture, while its `caret-right` disclosure is
  conspicuously the heaviest chevron and repeats up to three times per row group.
- The filled accent pill (Send / Cancel run) is the one slot where the blur order reverses.
- The single largest cross-family fact: at the same nominal 16 / 18 / 20, Lucide's median occupancy is
  0.69 against 0.56 for both candidates. Adopting either candidate at today's sizes makes every glyph on
  every surface read a step smaller against unchanged type.

## 11. Semantic ambiguities and NO MATCH rows

| Row | Family | Status | Fact |
|---|---|---|---|
| `chrome.work.toggle` | Phosphor | **NO MATCH** | `phosphor-icons/core` v2.0.8 ships `sidebar` and `sidebar-simple` in the left orientation only. `square-split-horizontal` and `columns` mean *split* and *columns*, not *right panel*. This lands on a permanent top-chrome control two hit-targets from its left-hand twin. |
| `run.activity` | MingCute | AMBIGUOUS | Drawn metaphor matches Lucide `activity`; the family names it `heartbeat`. A registry would have to bind the meaning explicitly rather than inherit it from the asset name. |
| `content.copy` | MingCute | AMBIGUOUS | Two sheets, but the front sheet carries rules and a fold, so it reads *duplicate document* where Courtwork also uses this control for `Copy source hash` and `Copy proposed content hash`. |
| `chrome.*.toggle` | MingCute | note | `layout-*bar-open` / `-close` encode a direction of action Courtwork's single `aria-expanded` toggle does not carry. |
| `read.refresh` | MingCute | note | `refresh-3` / `refresh-4` are clockwise / counter-clockwise mirrors; the filename alone does not resolve which matches the shipped direction. |
| `object.file` | MingCute | note | `file` equals Lucide `file`, not `file-text`; it would erase a distinction glyph-semantics relies on. |
| `session.new` | Phosphor | note | `note-pencil` draws a much heavier pencil body; it reads as *pencil on page* rather than *new*. |

## 12. BASELINE-PROVENANCE-01

**Confirmed at the base SHA.** `plug` is in the 24-name static allowlist in `app/web/ui-controls.mjs`
and present as `<symbol id="plug">` in `app/web/vendor/icons.svg` (24 symbols), while the Lucide asset
listing in `app/web/vendor/manifest.json` contains 24 entries that are 23 glyph files plus `LICENSE` —
there is no `plug.svg` provenance entry. Verified by direct set comparison of the three files.

Reported as a **pre-existing** issue. Not repaired here: this PR writes nothing under `app/`.
Validation for this Design PR stays green.

## 13. Explicitly omitted work

Production family selection · production asset migration · any change to `app/web/vendor/*`,
`app/web/vendor/icons.svg` or `app/web/ui-controls.mjs` · semantic-registry or semantic-adapter
implementation · Fill / Duotone / Bold / Thin / Light experiment · Line↔Fill state pairing ·
custom or Courtwork-domain glyph design (Matter, Evidence, Expert) · bespoke glyphs for universal
actions · Remix and Hugeicons · any glyph outside the current 24-name allowlist · migration cost,
bundle size and build-chain analysis · real touch and real screen-reader testing · repair of
BASELINE-PROVENANCE-01.

## 14. User decision — A / B / C / D

None is preselected and nothing in this PR implies one.

**A · Keep Lucide.** The shipped family remains the product family. No migration work follows.

**B · Advance MingCute Regular.** MingCute becomes the selected full-family migration candidate. This
authorizes a later migration design and implementation plan only; it does not change production here.
If chosen, two things need a ruling before that plan starts: whether the family's authored butt caps and
miter joins are preserved or replaced by the shipped round cap/join, and how `content.copy` and
`run.activity` are bound given the two AMBIGUOUS rows.

**C · Advance Phosphor Regular.** Same rule: selection authorizes a later bounded migration plan, not an
immediate swap. If chosen, the `chrome.work.toggle` NO MATCH needs a ruling first — donor glyph under
IC-6, mirrored local asset, or a different control — and the filled 256 construction needs a normalization
rule of its own, because "2 px centred stroke on a 24 grid" does not describe it.

**D · No family-level migration.** Lucide stays canonical and future foreign glyphs are admitted only
one at a time through the existing documented semantic-gap donor path (IC-6, IC-7).

A candidate that is visually attractive but has coverage or semantic problems is exposed as that
tradeoff above. This PR does not turn any such tradeoff into a hybrid-family proposal, and no candidate
column contains a glyph from a second family.

Open questions carried to the user are in `engineering/design/icon-specimen/observations.md` §7.

## 15. Statement

**No icon family was selected by the author.**

The author does not merge this, does not push to `main`, does not deploy, and does not claim independent
acceptance of their own work.

## 16. 非作者接受（Fable，2026-09-10）

复核于 `claude/fable-ic-ruling`（main `82c6036` 合入 `f5890fa`，无冲突）：变更路径与 §3 一致，`app/**` 无 diff；`sources.json` 71 条 sha 与 §4 三个 commit 一致；24 行映射状态与 §6 一致；四张截图与 200 % 探针在本树打开复核。裁定 **D**，全文 [WK-163](../intake-round-3.md)；§14 四问的回答在 WK-163 (b)。BASELINE-PROVENANCE-01 转 WO-IC-01。
