# GUI grammar convergence · PR registration (draft, uncommitted)

2026-09-19 · User-requested round that makes the [Home layout zoning PR](home-layout-zoning-pr-20260919.md) the first sub-item of a cross-surface convergence of page zoning, card use, event weight and token discipline. Opus keeps the final ruling. Sonnet explores and implements bounded slices. This draft makes no claims about product code, screenshot baselines, deployment or visual acceptance, and does not reorder the 00–13 queue.

**User boundary (confirmed 2026-09-19).** On Modules Home the slogan/identity, composer, Attention and Activity may coexist. This round does not presuppose removing the heatmap or fixing Activity at the bottom. The focus is state adaptivity, density and visual zoning. Home order and the geometry invariant were held open until external evidence supported a re-ruling. They were re-ruled the same day in G1 with that evidence; the heatmap is kept.

**Standing ruling.** CourtWork's visual complexity should come from the work itself, not from the interface's components. This round converges the existing owners. It does not create a second design framework, token set or lexicon (packet [README · 统一 grammar](README.md#统一-grammar-与文字收敛), [UX-07](../../design/ux-grammar.md)). Two gaps become rules: UX-09 (page zoning, order by relative importance) and UX-10 (event weight).

## Facts at `main@72c91a2`

- **Home, Modules, desktop.** DOM order is `#home-module-band` (greeting masthead with the Example line beside it, the `Show/Hide modules` disclosure, the Attention card and the Activity heatmap) → composer → `#home-top-band` (`Your work`: three stat tiles) → `#message-stream` sections `Waiting for you` / `Continue` / `Needs a look`. Sources: `app/web/app.mjs` Home placement in `renderChat`; `home-view.mjs::renderHomeModuleBand`, `renderHomeBand`, `renderHome`. The code records modules-above-composer as an earlier user refinement.
- The three stat tiles always render, including zero and missing values. The same counts reappear as section count badges below. Sections other than `Continue` are skipped at zero (WK-47). Attention at zero renders a card holding one sentence. Simple Home hides only the module band.
- **Current geometry rules coexist.** Simple anchors the composer centre at ≥55% of the main area via `--home-lead`, with non-chrome content above it capped at 180 ([ui-composition-standard](../../design/ui-composition-standard.md), Home column). Modules instead uses a finite 24 px lead in document flow ([home-composition](../../design/home-composition-2026-09-10/README.md)). The zoning PR is relational: slogan growth may move the card grid, but it may not change the grid's internal top alignment.
- **Thread.** `execution-disclosure.mjs::projectExecutionDisclosures` groups successful tool results per run. Failed tools, pending permissions, questions and errors render individually. Questions and permissions use `.question-card`; errors use `.message.error`.
- **Tokens.** `--space-1…8` = 4/8/12/16/20/24/32; 48/64 exist only as named layout tokens (`--band-top`, `--home-lead`). Of 638 raw px values in margin/padding/gap declarations in `styles.css`, 226 (≈35%, 22 distinct values) fall off the 4/8/12/16/24/32/48 set. Type uses eight `--text-*` roles, plus about twenty raw font sizes outside them. `tools/lint-shapes.mjs` gates radii. Nothing gates spacing or font size.

## Disposition of the proposal

| Proposal item | Disposition | Where it lands | Reason |
|---|---|---|---|
| Layer model (chrome, identity, primary action, work objects, state/event, trace/evidence, ambient) | **Adopt as zoning** in UX-09 (proposed); the order stays with each surface contract | [UX Grammar](../../design/ux-grammar.md) | Absent today. The layers name distinct zones with their own density. A fixed global order would decide the open Home question by rule |
| Home single axis identity → composer → actionable → recent → ambient | **Adopt, adjusted** after evidence | G1 re-ruling | Centred composer anchor; blocks below by relative importance; per-block disclosure ≤3 rows; heatmap kept |
| Card = bounded, openable/continuable object | **Already adopted** | [surface-hierarchy](../../design/surface-hierarchy.md) | G1 judges Home's stat tiles against it |
| Shared card left edge / title / content / meta lines | **Adopt** | UX-09, G1 | Rows share the composer's inner content line; absolute boxes rejected (WCAG F69/F104) |
| Spacing scale 4/8/12/16/24/32/48 | **Adjust** | UX-07, `--space-*`, G3 | No new `space.*` set. The existing scale keeps 20 and the named 48/64 layout tokens. The defect is raw off-scale values |
| Event syntax and weight | **Adopt, adjusted**, as UX-10 | UX Grammar, G2 | A review vocabulary over existing thread rows, not a runtime enum (UX-05). Summary rows use owner facts only |
| Linear `thought / response / elicitation / error` | **Reference only** | — | Not verified as a primary source in this round |
| About four text levels | **Reject** | [type-density-constraints](../../design/type-density-constraints.md) | Eight roles are adopted and tokenised. The defect is raw literals (G3) |
| Status badge carries only status | **Adopt** within UX-10 | UX Grammar | Follows UX-01 no duplication |
| ~80-character measure | **Not a rule** | ui-composition-standard 740 px measure | G4 records characters per line as an observation |
| 200% zoom with reflow | **Already required**; still unexecuted | [frontend-contract](../../design/agent-interface-2026-09-10/frontend-contract.md) | G4 records a labelled CSS-equivalent substitute (720×450 @2x). Native browser zoom is not available headlessly and remains open |
| Visual state matrix | **Adopt** as G4 | G4 | Generalises the zoning PR's exit evidence |
| External samples and the three existing reference images | **Design input** | — | Neither is presented as general external practice or as a visual baseline |

## Slices

Serial order G1 → G2 → G3 → G4.

**User-confirmed execution ruling, 2026-09-19:** Claude constructs serially; the proposed concurrent G1/G3 work is not adopted. A bounded Sonnet slice begins only after its predecessor is handed over, with one active product writer. After the agreed construction is reported and the fresh node independently checked, Astra merges accepted work and safely cleans up task worktrees; core R&D begins afterward. See the [integration sequence](orchestra-start-node-20260919.md#authorized-sequence--serial-construction-integrate-clean-up-then-core-rd). Opus's design ruling and G4's non-author acceptance requirement remain unchanged.

### G1 · Home zoning and state adaptivity (absorbs the zoning PR)

Owner **P / Home composition**. The data owners (Profile, `home-greeting.mjs`, Attention, Activity and the session projections) are unchanged.

**Held before the evidence (repository only):**

- Identity, composer, Attention and Activity remain distinct zones on Modules Home. The identity zone is unframed text and never a card. The Example line stays one quiet sentence with its action ([P](p-home-identity.md) precedent).
- Each zone's density follows its state: absent or one line when empty, object rows when populated, and in-place loading or failure. A zero category does not occupy a full block.
- The stat strip currently shows the counts twice and renders tiles for zero or missing values. That is a defect under UX-01 and surface-hierarchy. The remedy is ruled below (item 5).
- **Default disclosure and scale converge per block** (user direction 2026-09-19, consistent with UX-01/02 and surface-hierarchy). A Home block's default layer is its label plus a small number of unframed object rows with one meta line each. Charts, totals, paging and detail open in place or at the block's destination. Each block converges on its own, with the state adaptivity above. The G1 diff lists every current block against this and names its default layer: Attention's raised card, Activity's full heatmap instrument, the stat tiles, the `Your work` heading and the count badges. The heatmap's placement and the row limit are ruled below (items 3–4).
- The zoning PR's clauses remain in force: native `details` disclosure, preference, keyboard/focus continuity, no overlay or absolute anchor on copy, and relational card alignment measured from the containers.

**Design input · four user reference screenshots (2026-09-19, viewed by Opus, not stored in the repository).** These are four screens from the user's own desktop: Claude Chat, Claude Code, Codex and Claude Cowork. They count as design input only. They are not evidence of general external practice and not a visual baseline. They support switching density and skeleton by state, not a fixed Activity position.

| State | Skeleton observed | Geometry observed |
|---|---|---|
| Empty (Claude Chat) | A display greeting with glyph, and the composer directly below; nothing else in the main area | Greeting and composer form one group centred near mid-height. Greeting length can only move the group as a whole |
| Returning with history (Claude Code) | A small greeting at the top left; **one** usage object (Overview/Models tabs, period switch, six stat cells, heatmap, one footnote); scope chips (Local · project · branch · worktree) attached above a composer docked at the bottom | The greeting, the usage object, the chips and the composer share one left edge. The composer is bottom-anchored, so the greeting and history cannot move it. The stat cells are the inside of one object, not page-level tiles |
| Pending next actions (Codex) | A glyph and question centred at mid-height; three unframed action rows (glyph + one line, no card chrome); a scope strip attached above a composer docked at the bottom | The composer is bottom-anchored. The action rows sit in the flexible space between identity and composer, and their text aligns with the composer's inner content line |
| Upcoming work (Cowork) | The same display greeting and centred composer as the empty state; plain-text scope controls (project or folder · permission · output) directly under the composer; a small `Scheduled` label and one unframed row (glyph, title, date meta) | The greeting and composer sit at the same coordinates as the empty state. Content hangs below the composer and grows downward, so it never moves the composer. The scope controls and the row share the composer's inner content line. This is a counterexample to "populated means docked" |

Common to all four: no equal-weight card stacks, and at most one framed object in the main area. Scope and context sit on the composer, not in the body. The composer is the geometric anchor: identity attaches to it, and work content grows away from it. What differs from CourtWork Home is chiefly the default **disclosure level and scale** of each block. Each block shows a small label, a few unframed rows and one meta line; counts, charts and detail stay behind the block's destination. Order relative to the composer varies (Codex and Claude Code above a docked composer; Cowork below a centred one), so order is not what these references settle.

**Evidence (bounded primary-source check, 2026-09-19).** Sonnet made 24 tool calls. Apple HIG and Material 3 were then read by Opus in a JS-capable browser. Only fetched and read text counts here.

| Source | What it supports |
|---|---|
| [Apple HIG · Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (updated 2026-09-09) | Order content by relative importance, most important near the top and leading side. Aligned items read as related. Group related items with negative space, container shapes or separators. Use progressive disclosure "to reduce how much content to initially display". Containers grow with Dynamic Type so text is not cropped and does not overlap. macOS: avoid placing controls or critical information at the bottom of a window |
| [Material 3 · Cards](https://m3.material.io/components/cards/guidelines) | A card holds content and actions on a single subject. Do not force content into cards when spacing, headlines or dividers give a simpler hierarchy. Do not scroll within a card to reveal information. Swap cards for lists on compact screens |
| [GOV.UK Design System · Components](https://design-system.service.gov.uk/components/) | No card component exists in its vocabulary; rows and lists carry content |
| WCAG 2.2 Understanding [1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) | Documented failures: F69 (text clipped, truncated or obscured at 200%), F102 (content disappearing after reflow), F104 (clipped or overlapped content under text spacing) |
| [Linear · Agent interaction](https://linear.app/developers/agent-interaction) | Six activity types: `thought`, `elicitation`, `action`, `response`, `error`, `prompt` (user-only). Elicitation is distinct because it pauses for the human. This is reference support for UX-10's weighting, not a taxonomy to copy |
| Not found | No primary guidance on centred versus docked composers. No first-party documentation of an agent home that defaults to statistics above the primary input |

**Re-ruling (Opus, 2026-09-19).** The evidence, the four design inputs and the repository's own Home standard converge. G1 is now implementable.

1. **Geometry: the composer is the anchor.** On desktop Home it is a **centred anchor**, using the existing Simple rule for both layouts: composer centre at ≥55% via `--home-lead`, with non-chrome content above it capped at 180 and containing no numbers ([ui-composition-standard](../../design/ui-composition-standard.md), Home column). The reasons:
   - The same coordinates hold empty and populated, as in Claude Chat and Cowork.
   - HIG advises against critical controls at the bottom of a macOS window.
   - The repository standard already says this; Modules departed from it.

   The identity attaches above the composer and grows upward inside that budget. No box is reserved and nothing is clamped (F69/F104). When zoom or text size exceeds the budget, the page degrades to plain flow in the same order and clips nothing. Mobile and Work keep their docked composer. **Relational and absolute-box geometry are rejected** as the Home rule.
2. **Order: identity above the composer; work blocks below, in order of relative importance** (HIG):
   - `Waiting for you`
   - Attention items that need a decision
   - `Needs a look`
   - `Continue`
   - Activity

   A block with nothing to show is absent, except for `Continue`'s WK-47 condition sentence. Activity is last because it is ambient history, the least actionable block. It is kept, not removed. This supersedes the modules-above-composer refinement and the 24 px Modules lead. The user reserved final rulings for Opus, and this reversal is recorded here.
3. **Disclosure per block.** Each block's default layer is a small label plus at most **3 unframed object rows** with one meta line each. A `Show all` link goes to the block's existing destination (Attention workspace, sessions, Usage). No block is a raised or recessed card on Home. Decision cards stay at the decision surface (surface-hierarchy), and Home rows point to them (Material: no forced cards).
4. **Activity** is one object with at most one frame. Its heatmap is kept at the existing 28/84-day projection. It is collapsible in place through its own native `details` (UX-03). That preference replaces `homeModuleBand` with no compatibility path.
5. **Stat strip:** `#home-top-band` / `renderHomeBand` is removed in both layouts. Counts stay on block labels only, and never as standalone page tiles (UX-01, surface-hierarchy, Material).
6. **Simple vs Modules:** both use the same anchor. Simple omits the Attention and Activity blocks.
7. **Zoning PR:** the no-overlay/absolute-anchor clause and the disclosure-continuity clause carry into item 4. The two-column Attention|Activity alignment clause and the band-chrome placement of `Show/Hide modules` are superseded.

Exit evidence:
- the zoning PR's list;
- empty Home, a project with only `Continue`, and a project with items in every block;
- composer coordinates identical across these states at 1440 and 1280;
- a long slogan growing upward within budget;
- degradation to flow at native 200% zoom with no clipping;
- a keyboard pass through the Activity disclosure.

#### G1 delivery · author evidence (Claude/Opus, 2026-09-20)

Branch `claude/gui-grammar-20260919`, isolated worktree, from `main@72c91a2`. The author supplies this evidence; the visual/layout decision needs a non-author review (Luna or the user), because Opus authored G1.

**Change.** Nearest precedents: the Simple composer anchor (`measureHomeLead`, `--home-lead`), the WK-47 set rows, and the native `details` disclosure. Affected grammar: UX-01/02/03/07/09.
- `app/web/home-view.mjs`: rewritten around one slot per block with its own fingerprint and focus restoration. The order is Waiting for you → Attention → Needs a look → Continue → Activity, with at most `HOME_ROWS` = 3 rows each. `Show all` expands a set in place through the existing filter and returns via `All work`. Attention uses the shared `.home-row` anatomy and opens the Attention workspace at the item. Activity is a flat native `details` with the heatmap, period switch and `Open Usage`. Removed: `renderHomeBand` (stat strip), `renderHomeModuleBand` (band, masthead, two-column cards), `workCard`, the in-place Attention detail/preview/paging, and the `today` registry entry.
- `app/web/app.mjs`:
  - Identity sits in the composer intro on both layouts. Desktop Home order is composer → blocks; docked (mobile) Home order is identity → blocks → composer.
  - `measureHomeLead` uses one centred anchor. The Modules 24 px lead is gone.
  - The anchor also re-measures when `#conversation-body` or `#home-composer-intro` resizes. Without this, the first load left a stale lead (composer at 59% instead of 56%).
  - The Attention registry query takes 3 rows, with no first-item preview fetch. `openHomeAttention` is removed.
  - Focus moves to `All work` when a set expands, and back to the set's `Show all` when it collapses.
- `app/web/settings-view.mjs`: the preference `homeModuleBand` is replaced by `homeActivity` (`expanded|collapsed`), with no compatibility read.
- `app/web/index.html`: `#home-top-band` and `#home-module-band` are removed.
- `app/web/styles.css`:
  - Removed: the stat strip, module band, insight cards, masthead and old Attention card rules.
  - Added: flat block rules, the Activity disclosure chevron (with reduced-motion handling), fixed 12/16 px heatmap cells, and the mobile identity inset.
  - The `.home-composer-intro` `max-height:120px; overflow:hidden` clipping box is removed (WCAG F69/F104).
  - `.home-attention-state` is kept because the Attention workspace consumes it.
- Tests: `home-presentation`, `settings-preferences`, `settings-navigation` and `workspace-card` are updated to the new structure. `engineering/design/product-semantics/raw-consumers.json` re-registers the four `activity` data-identifier lines.

**Checks.**
- `npm --prefix app test`: 1208/1208 pass.
- Pass: `lint-colors`, `lint-shapes`, `lint-materials`, `lint-interaction`, `check-semantic-consumers` and `contrast-report`.
- `check-doc-links`: one problem on this branch alone. The Astra paragraph above links `orchestra-start-node-20260919.md`, which exists only in the shared main checkout. It resolves in the combined tree.

**Browser evidence.** Isolated host on port 8871 with a scratch data directory; the example workspace was the synthetic data. No personal data and no paid provider.
- **1440×900, light:**
  - The populated Home shows identity → composer → Attention (1) → Continue (7, 3 shown, `Show all`) → Activity.
  - Composer top is 472 px, with its centre at 56%, in both the populated and the empty state. The identity grew from 38 to 69 px and the lead fell from 333 to 302 px.
  - A long injected greeting grew the intro to 145 px and cut the lead to 226 px, while the composer top stayed at 472.
  - Blocks share the composer's left edge (438).
  - `Show all`, `All work` and focus return, plus Activity collapse persisting across reload, were checked by script.
- **1280×800, dark:** composer centre at 56%, shared left edge at 358, no horizontal overflow.
- **375×812:** order is identity → blocks → docked composer. No overlap after scrolling, no horizontal overflow, and range buttons are 44 px.

**Deviations and residuals.**
- The Attention registry query supports only offset/limit, so the block shows the registry's first 3 items with their state words, not only items that need a decision. A status filter belongs to the Attention owner.
- The empty-projects guard added during the author check was **not sufficient**: the cached Attention scope itself survived. See F-01 in the review dispositions below.
- The block rows keep their existing glyph difference: Continue has a chat glyph, the other rows have none. So title start lines differ by 16 px between blocks. This is recorded for G4, not changed.
- `#conversation-body` extends 48 px below the viewport under the top band. This existed before G1 and is recorded for G4.
- **Not executed at G1 time:** native 200% zoom (the tool only emulates viewport size), forced colors, a full screen-reader pass, and the 390 and 1280 cells in the other colour scheme. G4 later executed the approval and burst cells; the rest stay open.
- The historical evidence scripts (`fe01`, `fe02`, `wk13`) still reference the removed band DOM. They are preserved unchanged as history.

### G2 · Event weight in the thread

Owners **04 run surface / thread projection**; consumers are Chat and Attention process rows.

1. Record in the delivery note, row by row, the UX-10 class of every `projectThread` row kind (`user`, `assistant`, `tool`, `question`, `permission`, `presentation`, `artifact`, `notice`, `error`, `run-status`) and fix any row whose weight disagrees.
2. Summary rows (the execution-disclosure summary, Attention process rows, Home work rows) use the subject · action · object · outcome · time form. Each part comes only from owner facts; a missing part is omitted.
3. Event-burst fixture: ≥100 tool events in one run, with one failure, one pending permission and one produced artifact. The failure, the permission and the artifact must stay individually visible, the successes must group, and the reading position must hold across reload.
4. Out of scope: new runtime event types, exposure of model thinking, and any change to the grouping predicate without the evidence above.

#### G2 delivery · author evidence (Claude/Opus, 2026-09-20)

Same branch as G1. Nearest precedents: `projectThread`, `projectExecutionDisclosures` and the shared row renderers in `app.mjs` and `attention-agent-view.mjs`. Affected grammar: UX-05 and UX-10.

**UX-10 class of every thread row kind, as rendered at this SHA.**

| Row kind | UX-10 class | Current weight | Disposition |
|---|---|---|---|
| `user` | person's input | message body | conforms |
| `assistant` | response / result | message body | conforms |
| `tool`, successful result | ordinary progress | grouped into one `Execution · N successful tool actions` disclosure per Run | conforms; the summary names the object (tool actions) and the outcome (successful) from owner facts. No time part, because the row has no owner timestamp |
| `tool`, running | ordinary progress / current state | one row with its state word | conforms |
| `tool`, failed or unknown | exception | individual row outside the group | conforms |
| `question` / `permission`, pending | decision object | `.question-card` / `.permission-card` | conforms; the one card weight in the thread |
| `permission`, resolved allow for a grouped call | trace | inside the Execution group | conforms |
| `question` / `permission`, other resolved | history | `details` row | conforms |
| `presentation` | result / new artifact | inline presentation object with Open | conforms |
| `artifact` | new artifact | file row (glyph, path, `Recorded version`, opens) | conforms |
| `notice`, runtime progress | ordinary progress | **was** a start line and an end line per compaction or retry | **fixed:** a paired `*_end` removes its `*_start`, so only the outcome remains. An unpaired start still reads as the current state |
| `notice`, `unrecorded_files` | exception | `.notice-row.attention` in danger colour | conforms |
| `error` | exception | `.message.error` with danger rule | conforms |
| `run-status` | state | one badge line per Run; the latest Run's state lives in the activity locus | conforms; the badge carries the status word only |

**Change.** `app/web/thread-projection.mjs` adds the `noticePairs` aggregation (`compaction_end`→`compaction_start`, `auto_retry_end`→`auto_retry_start`). Chat and Attention both read it.

**New test:** `app/tests/event-weight.test.mjs` builds the G2 burst fixture: 100 successful tool calls, 1 failure, 1 pending permission, 1 produced artifact, and a compaction notice pair.
- Successes group, `callCount` = 100.
- The failure, the permission and the artifact are not group members.
- There is one state line per Run.
- The paired notice leaves only its outcome; an unpaired start remains.

`npm --prefix app test` passes 1210/1210.

**Residuals.** Reading position across reload for a burst was not re-run in a browser. The execution summary's reading key is `[session, run, "execution", run]`, stable across reload, and capture/restore is covered by `chat-reading.test.mjs`. A live host burst needs a provider that emits 100 tool calls and was not run (no paid provider).

### G3 · Token discipline (bounded; suitable for a Sonnet worker)

Owner **styles.css / visual contract**.

- Replace raw spacing values that equal a `--space-*` token with the token. Snap other off-scale values to the nearest token, with a before/after check on the affected surface. Values the standards name without a token become registered exceptions with a reason: the 6 px label↔field gap, 1–2 px hairline or optical offsets, and named layout tokens.
- Same treatment for font sizes: map each to a `--text-*` role, or register it as a display exception allowed by ui-composition-standard.
- Add `tools/lint-spacing.mjs` and a type-size check, following `tools/lint-shapes.mjs` and `app/tests/shape-governance.test.mjs`. No debt allowlist.
- If a real gap needs a new token value, stop and ask for an Opus ruling.

#### G3 delivery · Sonnet author, Opus review (2026-09-20)

Same branch. A Sonnet worker implemented G3 from this spec after G2 was handed over; Opus reviewed the result and adjusted it. Precedent: `tools/lint-shapes.mjs` and `app/tests/shape-governance.test.mjs`.

**Change.** The scope is `styles.css`, `summary-disclosure.css` and `markdown-reader.css`; `surface-layout.css` was already clean.
- Spacing: 584 raw px values before the change.
  - 422 were mechanical replacements, token-equal values rewritten as `var(--space-*)` with no visual change.
  - 64 were snapped to the nearest token.
  - 58 selector+value pairs were registered with reasons, mostly the 6 px label/chrome rhythm and ≥40 px page-level paddings.
  - 1–3 px hairlines are allowed by one documented global rule.
- Font size: 23 raw values before the change. 2 became role tokens, 6 were snapped and 16 registered as display exceptions (hero, greeting, dialog title, avatar glyph, reading-document h1, Usage total).
- New gate `tools/lint-spacing.mjs` with two rules, spacing and font size, plus `app/tests/spacing-governance.test.mjs`. `ui-composition-standard` points to it. No new token value was added.

**Opus review dispositions.**
- **Adjusted, restored as registered control anatomy:**
  - global `button` padding 5×10 (type-density-constraints);
  - `input` inline padding 10;
  - `.home-greeting-date` 17 px (user ruling 2026-09-16).
- **Adjusted, restored as written derivations rather than snaps:**
  - `.usage-weekdays` padding-top 27 = 3 + `--space-4` + `--space-2`, the offset of the heatmap's first row;
  - `.context-tab` bottom 15 = `--space-3` overlap + 3, symmetric with its top.
- **Ruled, two worker "needs ruling" items registered:**
  - `.markdown-body h1` 23, a reading-document level above `--text-title`;
  - `.usage-total` 28/24, the one summary figure per page, and not a general "large number" role.
- **Accepted after before/after comparison** (pre-G3 `fbab236` on port 8872 against the branch on 8871, 1440×900 light):
  - Home: rows +2 px, sidebar rows ±1 px.
  - Settings › Preferences: indistinguishable.
  - Attention detail: the heading goes from 22 to 18, which is the title role, and the hierarchy holds. Segments are 2 px narrower.
  - `nav-filter` input: +2 px, with icon clearance kept.

The complete snap table was generated in the author scratchpad; the registration table in the lint carries the durable reasons.

**Checks.** `npm --prefix app test` passes 1215/1215. `lint-spacing`, `lint-colors`, `lint-shapes`, `lint-materials`, `lint-interaction`, `check-semantic-consumers` and `contrast-report` pass. Surfaces not compared visually: Chat thread with long content, Usage dialog, markdown reader. G4 captures Spark but **not** the other three, so they stay unexecuted and open for the reviewer.

### G4 · Cross-surface visual state matrix (non-author acceptance)

One fixed synthetic dataset on one candidate SHA. The surfaces are Home, Chat and Attention, plus Spark only if Spark renders a surface on that SHA.

| Axis | Cells |
|---|---|
| Content state | empty Home · normal Home · long slogan + long Example + long Profile address · Waiting/approval present · event burst (G2 fixture) · failure |
| Viewport | 1440 · 1280 · 390; sidebar collapsed at 1440 |
| Presentation | light and dark · reduced motion · keyboard pass · a labelled CSS-equivalent 200% substitute (native browser zoom remains unexecuted) |

In every cell, check the zone order ruled for that surface, weights against UX-10, the stable card left edge and content-start line, and that there is no overlap or horizontal overflow. Record characters per line as an observation. The author supplies captures; a non-author decides. Unexecuted cells are listed as unexecuted.

#### G4 candidate evidence (Sonnet capture, 2026-09-20)

The [candidate evidence packet](../../../evidence/gui-grammar-20260920/README.md) was captured by headless Chrome over CDP with a reproducible `capture.mjs` and `manifest.json`. It has 19 executed cells and 19 viewport PNGs covering Home, Chat, Attention and Spark (recaptured 2026-09-20 after the independent review; see the review dispositions below):
- Home at 1440 in empty, normal, long-content and simulated-failure states;
- Home at 1280 and 390, light and dark, sidebar collapsed, and reduced motion;
- a CSS-equivalent 200% cell (720×450 @2x), which is not native zoom.

Each cell's method is labelled: real, INJECTED DOM TEXT, SIMULATED NETWORK FAILURE, or CSS-equivalent. **Not executed:**
- Waiting/approval present: the example fixture has no pending item, and no data was faked into the host.
- A live event burst: this needs a provider that emits 100 tool calls, and no paid provider was run. `event-weight.test.mjs` covers it at unit level.
- Native 200% zoom, forced colors and a screen-reader pass.

**Measured facts recorded for the reviewer.**
- The composer top holds at 472 px with its centre at 56% across the empty, normal and long-content states. In the long-content state the intro grew from 69 to 222 px and the lead fell from 302 to 150 px.
- Every captured Home cell shares one left edge.
- The 30-step keyboard sequence is recorded, and the Activity summary toggles on Enter.
- At 390 and at 720 @2x, the docked composer's box intersects a block that has not been scrolled yet. The docked composer is sticky at the end of the scrolling body. In the G1 author pass at 375×812, scrolling brought the Activity block fully above the dock; the capture did not exercise scrolling.

**Acceptance is not claimed.** Per the start node, the next step is non-author verification (Luna), and the visual/layout decision for G1–G3 belongs to that review.

## Independent review dispositions (2026-09-20)

Non-author review of candidate `fc6eccf`: [functional](evidence/gui-independent-20260920/luna-functional.md), [style and evidence](evidence/gui-independent-20260920/luna-style-evidence.md), [browser observations](evidence/gui-independent-20260920/astra-browser.md). The candidate was held, not accepted. Each finding is disposed below, serially, by Opus. Those three review records live in the shared main checkout and are not carried on this branch, so their links resolve in the combined tree.

| Finding | Disposition | Change |
|---|---|---|
| **F-01** The Attention scope survives a removed or changed project (acceptance blocker) | **Adopt** | One owner now decides the scope (`homeAttentionScope`: the workspace choice when it names a project, otherwise the first project). `loadProjects` invalidates a scope whose project is gone, and the workspace picker moves the scope with it. A cleared scope drops its rows instead of showing another project's items as "the last loaded records" |
| **F-02** A zero 28-day Activity packet renders a full empty heatmap | **Adopt** | The block keeps its period control, but an empty period states `No runs recorded in the last N days.` instead of an all-zero grid. The widest empty period stays absent, as ruled |
| **F-03** Merged `Show all` pages can claim items are outside the page | **Adopt** | The truncation sentence is computed from the merged collection, so it appears only while the displayed set holds fewer items than the total |
| **F-04** The Home filter is never cleared; the collapse focus fallback can disappear | **Adopt in part** | The focus fallback is adopted. The clearing is **not**: the user ruled on 2026-09-20 that an expanded set is continuity, so returning Home shows the set the person was reading and `All work` stays the only way out. A first-round clearing in `goHome` was removed again in the third round |
| **Style 1** Packet metadata and the empty-cell fixture label | **Adopt** | The owner count now reads 19 PNGs. The first capture screenshotted the "empty" cell before closing the example, so it showed the example dataset. `capture.mjs` now closes the example, reloads, and asserts zero projects, no example badge and no Attention/Activity slot before recording. The packet was recaptured |
| **Style 2** Native 200% zoom described inconsistently | **Adopt** | The disposition table and the G4 axis now say native zoom is unexecuted, with a labelled CSS-equivalent substitute |
| **Style 3** G3 overclaims G4 coverage | **Adopt** | The G3 note lists Chat long content, the Usage dialog and the markdown reader as unexecuted; the packet records them as not captured |
| **Style 4** Three enforceability holes in the spacing gate | **Adopt** | The parser reads a block's last declaration without a semicolon; `var()` must name a token defined in CSS or set at runtime in JS unless it carries a fallback; registrations are keyed by selector **and property**, so a `padding` reason no longer covers `margin`. Three negative tests cover exactly these cases |
| **Style 5 / browser** Narrow-layout overlap and snap impact | **Adopt as recorded evidence** | The packet records that two independent live passes (author at 375, non-author at 390) scrolled the Activity block fully above the docked composer, and that the capture measures the unscrolled rectangles. The snap impact stays in the G3 note. Neither becomes a pass/fail claim |

New tests: `app/tests/home-scope.test.mjs` covers F-01 through F-04, and `app/tests/spacing-governance.test.mjs` gains the three negative cases.

### Second review round (2026-09-20)

The reviewer accepted the Attention fix, the Activity empty state, the pagination sentence, the three original lint holes and the empty-page evidence correction, and named three items still open. Each is closed here.

| Item | Disposition |
|---|---|
| **F-04** keep the ruled filter continuity, but complete the focus fallback once a list goes to zero | **Adopt.** The chain is now: the set's own `Show all` → that block's first row → the block itself (`tabindex="-1"`, so it catches focus without joining the tab sequence) → any Home row → the composer. Focus cannot fall out of the page. Covered by `home-scope.test.mjs`. The `goHome` clearing left over from the first round survived this round by mistake and was removed in the third |
| **lint** `var(--space-7, 7px)` still bypassed the scale | **Adopt.** A `var()` fallback is the value the declaration actually uses, so it is checked by the same rules: an undefined token with a literal fallback is rejected, a token or hairline fallback passes. The earlier test that asserted the opposite contract is rewritten |
| **G4** the recapture still carried the old source SHA; the approval and burst cells had to be executed, not excused | **Adopt.** The packet states its true provenance (the 19 cells from the tree that became `3413978`; the new cells at `3413978` itself) and both cells are now **executed for real** with the local deterministic provider — no paid provider, no faked server data |

**The two cells, as executed.** One real session carries both, driven through the local provider's `/fixture` directives:
- **Home · Waiting/approval present:** a real `/fixture question` run reaches `waiting_user`; Home's `Waiting for you` block shows the unanswered item and Chat shows the live question card (`home-waiting-1440-light.png`, `chat-pending-decision-1440-light.png`).
- **Chat · event burst, session level:** 102 tool rows in one session across six runs — 100 successful calls grouped into five `Execution` disclosures (1/32/32/32/3), one failing `ws_read` (real ENOENT) and one pending `ws_write` permission card, both outside every disclosure. Reading position and session identity were identical before and after a real reload (`chat-burst-1440-light.png`).
- **Chat · event burst, single run** (`chat-burst-single-run-1440-light.png`), which is what the weighting claim is actually about. Run `4f1aa25a`, session `816dc884`, one `/fixture script` of 28 calls:
  - 26 successful (25 `ws_list` + one approved `ws_write`) in **one** `Execution · 26 successful tool actions` disclosure, whose `aria-controls` lists 27 members (26 calls plus the resolved approval row);
  - 1 failed `ws_read` on `materials/single-run-does-not-exist.txt`, real ENOENT, shown outside the disclosure as `Failed · file does not exist`;
  - 1 produced artifact, `out/single-run-artifact.txt`, 59 B, sha256 `4fef558a3a21…`, as a `Recorded version` row outside the disclosure;
  - 1 pending `ws_write` on `out/single-run-pending.txt` as a live `Approve this file write?` card outside the disclosure;
  - reload: `scrollTop` 0 and the same first visible row before and after a real `Page.reload`, same `activeSessionId`, with the artifact row and the pending card both still present.

**The per-run cap, stated plainly.** The local provider rejects a script longer than 32 calls (`app/runtime/fake-provider.mjs`, left unmodified — product code is not edited to produce evidence). So the 100-success figure is a **session-level** burst, and a **single run with ≥100 tool events remains unexecuted in a browser**; `app/tests/event-weight.test.mjs` is its only coverage. That item is recorded in the packet's not-executed table and in `manifest.json`, not excused by rewriting the matrix.

Still not executed, and recorded as such in both the packet README and `manifest.json`: native browser zoom, forced colors, a screen-reader pass, the Usage dialog, the markdown reader, and a long-content Chat thread.

**One finding passed to another owner.** Driving two Home-composer sends back to back can trip the navigation-epoch guard in `submitHomeRun()`. The capture script first described this as a silent drop; it is not. That branch sets `operation.error = "The chat was created; your instruction has not been sent. Return Home to continue."`, which Home renders. The path is untouched by this branch, so it is pre-existing behaviour under scripted back-to-back navigation and belongs to the Home composer / session-creation owner. The correction is recorded in the packet.

### Third review round (2026-09-20)

The reviewer accepted the focus fallback, the lint fallback rule and the 23-cell evidence within its stated limits, and named two defects. Both are mine, and both are fixed.

| Item | Disposition |
|---|---|
| `goHome()` still cleared the expanded set, and a test still demanded it, contradicting the ruled continuity | **Adopt.** The clearing is removed and the test now asserts the opposite: Home entry keeps the set, and only the filter control changes it. `All work` remains the way back to the whole of Home |
| Both new capture scripts imported `tmpdir` but called `os.tmpdir()`, so a default start would throw | **Adopt.** They call `tmpdir()`. The startup expression of each script was evaluated to confirm it resolves to a scratch path outside the repository |

Astra's ruling stands for the rest: native 200% zoom, a single run with ≥100 tool events, long-content Chat, the Usage dialog, the markdown reader, forced colors and a screen-reader pass stay with the G4 owner and do not block local integration. This is **not** full G4 acceptance.

## Construction report and writer release (Claude/Opus, 2026-09-20)

**Deliverable.** Branch `claude/gui-grammar-20260919` from `main@72c91a2`, with commits `9b4fc2f` (owner record), `e431d0b` (G1), `fbab236` (G2), `fc8dd61` (G3) and the G4 evidence commit that follows `fc8dd61`. The agreed GUI scope G1 → G4 is complete as author work. Visual acceptance is pending non-author review.

**Integration notes for Astra.**
- The shared main checkout still holds **older uncommitted copies** of this slice's documents: `ux-grammar.md`, this record, the zoning PR note, the packet README line and the GUI `current.md` entry. The branch versions supersede them, so take the branch bytes for these paths. The Orchestra entry in main's `current.md` belongs to another author and must be kept; the two entries sit in adjacent hunks.
- On this branch alone `check-doc-links` reports one problem: the Astra paragraph in this record links `orchestra-start-node-20260919.md`, untracked in main. The three independent-review records under `…/evidence/gui-independent-20260920/` are likewise only in main. All resolve in the combined tree.
- `app/node_modules` in the task worktree is an untracked symlink to main's dependencies, used only to run tests. It is not part of the deliverable.

**Residuals, each with an owner.**
- Attention status filter for Home: Attention owner.
- The 16 px title-start difference between glyph and no-glyph rows, and `#conversation-body` extending 48 px under the top band: G4 reviewer disposition.
- The not-executed cells listed above: G4 reviewer.
- Historical evidence scripts `fe01`, `fe02` and `wk13` reference the removed DOM; they are preserved as history.

**Not covered by this scope.** This GUI round ran **no coding-dogfood path**: no CW agent read, admitted an edit, invoked a check or reopened a path. N-02 and the RD-006/DF-04 closure stay with their owners and are not advanced by this report.

**Writer release.** Claude releases the files this branch changes once it is integrated. The isolated host ports used here (8871, 8873) were stopped or are scratch; no shared data directory or port is held.

## Division of labour

Opus rules and authors G1 and G2's weight mapping. Sonnet explores, implements G3 and captures G4 evidence. New grammar questions raised during a slice come back to Opus; they are not settled inside the slice.
