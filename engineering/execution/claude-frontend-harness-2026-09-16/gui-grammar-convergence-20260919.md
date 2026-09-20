# GUI grammar convergence · PR registration (draft, uncommitted)

> Integration note (Astra, 2026-09-20): author delivery history is preserved below. Later Astra review dispositions and the final local-integration acceptance control acceptance status; earlier supersession/whole-file replacement instructions do not discard reviewer or Orchestra records.

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
| Presentation | light and dark · native 200% zoom with reflow · reduced motion · keyboard pass. Native zoom is unexecuted and explicitly deferred from local integration below; CSS-equivalent captures do not satisfy it. |

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

## Independent fresh-node review — 2026-09-20

**Astra decision: hold candidate acceptance.** The explicit final construction report and conditional writer handoff are present on `claude/gui-grammar-20260919@fc6eccf4fa29a34edebd17f524cc9b59437f4a46`. G4 captures refer to its product parent `fc8dd6182bb990fba8d383508ccdd4e902ef0867`. The isolated non-author review fixed that candidate against `main@72c91a2f070cc8e134f1d09cebc7de735ff89415`; it did not infer completion from a clean tree. Main has not moved, and no merge, task-tree cleanup or core slice has begun.

Evidence: [Luna functional review](evidence/gui-independent-20260920/luna-functional.md), [Luna style and evidence review](evidence/gui-independent-20260920/luna-style-evidence.md), and [Astra browser observations](evidence/gui-independent-20260920/astra-browser.md). Functional checks passed 52/52; the style review passed 19/19 focused checks and spacing lint, with overlapping tests between these runs. These are not an aggregate distinct-test count or a fresh full-suite result. OpenAI computer use independently exercised a new synthetic Host; no provider or credentials were used.

The review labels below locate findings in this existing owner record, not a new roadmap. Claude remains the serial product/remediation owner; G3 may use the existing Sonnet assignment. Astra owns disposition and subsequent integration; Luna verifies the returned delta independently.

| Input | Disposition and reason | Original owner / required return |
|---|---|---|
| Functional F-01: stale Attention project scope | **Adopt; blocks acceptance.** Closing the example leaves a synthetic row after Projects/Continue become empty; reload clears it. The retention default predates G1, but this candidate's empty-project claim is unmet and removing the old selector exposes the gap. | G1 Home / Attention owner under Claude. Invalidate removed/changed scope, preserve request generations, prevent old rows crossing scope boundaries; return a regression check for example exit/project removal and project selection. |
| Style finding 4: spacing gate bypasses | **Adopt; blocks G3 gate acceptance.** A missing final semicolon escapes parsing; undefined token names pass; selector/value exceptions admit a different property. Passing the existing lint is insufficient. | G3 Sonnet under Claude. Handle the final declaration, resolve declared allowed token identities, scope exceptions by property, and add negative counterexamples. Return source SHA and focused checks. |
| G4 empty label, PNG count, coverage | **Adopt; evidence correction required.** The packet has 19 PNGs, and its alleged empty cell contains the auto-opened example. Normal Chat does not prove long Chat, Usage or markdown-reader coverage. | G4 capture owner under Claude. Correct counts/labels and preconditions; capture a real empty state or cite the bounded independent observation accurately. Keep original source identity and separately identify replacement captures. |
| Native 200%, Waiting/approval and burst | **Adjust; remain unexecuted required matrix cells.** CSS 720×450 at 2x is not native zoom. Approval/burst can use deterministic local fixtures or event replay; a paid model is not a prerequisite. | G4 owner supplies bounded offline evidence before matrix acceptance, or returns a specific limitation for Astra's explicit scope decision. Do not silently lower the governing matrix. Forced colors/screen-reader remain separately unexecuted; no WCAG certification is claimed. |
| Functional F-02: zero-result 28-day Activity | **Adjust the empty-block rule.** Retaining the period selector when the narrower period has no runs lets users return to 84 days. This is an explicit bounded exception; no-data overall still hides Activity. | G1 owner adds an accurate empty-period sentence and records the exception with its focused projection check. |
| Functional F-03: merged pagination says records omitted after all loaded | **Adopt.** The visible receipt must describe the merged set, not an individual offset page. | G1 owner corrects merged truncation facts and verifies a final 31-of-31 page. |
| Functional F-04: filter persistence / collapse focus | **Adjust.** Preserving a selected set across returning Home is acceptable continuity; mandatory clearing is rejected. Losing focus after the set shrinks is not. | G1 owner keeps scoped continuity and adds a stable heading/row fallback when Show all no longer exists, with a shrink-while-expanded check. |
| Show all route | **Adjust original destination wording.** The author and live UI use an in-place set with All work and preserved focus. Accept that existing navigation pattern; do not invent a new destination surface for this slice. | G1 documentation owner synchronizes the ruling. The functional report's description of this as already ruled refers to author implementation text, not the earlier destination wording. |
| Narrow composer intersection | **Accept the bounded observation only.** At 390×844, scrolling brought the entire Activity object above the dock; Enter toggled its native disclosure. An initial rectangle intersection alone is not a clipping failure. | G4 record consumes the independent observation. Other viewport/content cells remain unproven. |
| 16 px glyph/title offset and old body-height discrepancy | **Defer as explicit visual residuals**, with no state, permission or evidence authority change established by this review. | Existing G4/UI grammar owner; not a new core workstream or blanket visual acceptance. |

Return only the corrective source/evidence delta and the updated final report; do not redo the delivered G1–G4 work or restart the core roadmap. Preserve concurrent Orchestra documents and the candidate history. The next review pins the new SHA; merge and preservation/cleanup remain authorized after acceptance, without another user approval. N-02 / RD-006 / DF-04 stays the first missing core closure after that sequence.

## Corrective delta decision — 3413978 — 2026-09-20

**Astra: partial closure; fresh-node acceptance remains held.** The returned candidate is `34139788b16f60866e4c7abc947f428ccdc1c8f5`; the review compares only `fc6eccf..3413978`. The author tree has no tracked modifications and has an untracked dependency symlink; this observation does not replace the author's report or conditional handoff. Main remains `72c91a2`. No merge, task-tree removal or core implementation was performed.

Inputs: [unaltered author report](evidence/gui-rereview-3413978-20260920/author-report.txt), [Luna functional delta](evidence/gui-rereview-3413978-20260920/luna-functional.md), [Luna style/evidence delta](evidence/gui-rereview-3413978-20260920/luna-style-evidence.md), [Astra live check](evidence/gui-rereview-3413978-20260920/astra-browser.md), and [packet hashes](evidence/gui-rereview-3413978-20260920/sha256.json). Luna's focused runs passed 56/56 and 12/12, with overlapping tests; they are not 68 distinct tests. The reported 1222/1222 full suite remains author evidence and was not repeated.

This section and the preceding **Independent fresh-node review** are the integration dispositions. The main copy intentionally contains reviewer decisions absent from the author branch, while that branch contains newer construction notes. Neither copy supersedes all bytes of the other. Consume these decisions rather than raw review recommendations alone; integration must preserve both the author delivery history and these decisions.

| Input | Astra disposition | Remaining original-owner action |
|---|---|---|
| F-01 stale Attention; F-02 empty period; F-03 pagination | **Accept within the corrective scope.** Luna source/tests and the independent live example-exit check close F-01's reproduced failure; F-02/F-03 align with the prior ruling. | No redo. Duplicate scope reads are **deferred** to the Home/Attention owner as a non-blocking efficiency residual; the generation guard discards stale responses. |
| F-04 continuity and zero-row focus | **Adjust; still open.** `goHome()` now forcibly clears the selected set, contrary to the previous disposition. A row-only fallback also fails when the set reaches zero rows or disappears. | Claude/G1 restores selected-set continuity and provides a focusable, persistent heading or suitable Home control when neither Show all nor a row exists. Verify both a shrinking non-empty set and a zero-row/disappeared set, including return to Home; a source-string assertion alone does not prove focus behavior. |
| Original three spacing bypasses | **Accept their fixes.** Final declarations, undefined bare token references and property-scoped registrations now have negative coverage. | Do not reopen these three fixes. |
| New fallback bypass | **Adopt; G3 remains open.** `var(--space-7, 7px)` still passes. An undefined variable with an effective off-scale fallback is not an allowed spacing token merely because `var()` wraps it. | G3 under Claude validates fallback values/chains against the existing spacing/type policy; legitimate runtime variables remain supported. Add positive runtime/on-scale cases and a negative off-scale fallback case. No blanket fallback exemption or new token scale. |
| G4 corrected empty capture and count | **Accept the corrected precondition and 19-file parity**, with the live empty observation independently corroborating behavior. | No repeat of already-valid cells solely for count correction. |
| G4 source identity | **Adopt; repair before evidence acceptance.** At this candidate, repository-root `evidence/gui-grammar-20260920/README.md` still names `fc8dd618…` while replacement captures include later app edits. The manifest does not pin the app/capture bytes. | G4 owner identifies the actual recapture source with a committed source tree or explicit source/capture hashes. Distinguish old and replacement captures. Do not retroactively assert historical hashes unless supported; if exact bytes cannot be established, recapture only the affected evidence. |
| Required G4 coverage | **Keep open; matrix relaxation rejected.** Relabeling 720×450 at 2x truthfully is useful, but does not replace native 200% or waive Waiting/approval and burst/reload observations. The packet's claim that approval/burst require a paid provider is not an adequate offline-fixture limitation. | Restore the governing native-zoom requirement; supply deterministic local fixture/replay evidence for approval and ≥100-event burst with failure/permission/artifact and reload position. Native zoom remains unexecuted pending suitable browser evidence or an explicit subsequent Astra scope decision. Long Chat/Usage/markdown snap-impact checks remain with G3/G4; report concrete technical limits without claiming coverage. |
| “Two independent passes” wording | **Adjust.** Author 375px observation and non-author 390px observation are two passes, only one independent of authorship. | G4 owner corrects the wording; retain the bounded no-clipping conclusion and unexecuted residuals. |

Claude retains serial remediation ownership, including G3's existing delegation. Return only these remaining source/evidence changes and updated delivery identity. Completed G1–G4 work stays delivered within the accepted bounded scopes above. Merge and preservation/cleanup are already authorized once the node passes; no new user approval is needed.


### G4 fixture limitation and final-cell intake — 2026-09-20

The author clarifies that the current browser packet contains 102 tool rows in one session across six runs: 100 successes grouped as 1/32/32/32/3, one failed read and one pending write. The pending write produced no artifact. These are author observations reflected in the dirty packet at branch HEAD `3413978`, not an independently accepted single-run burst. A further single-run composite capture is in progress: successes, a real failure, an approved write with an actual artifact, a second write left pending, and reload-position observations.

**Astra disposition:** retain the split evidence honestly. Accept the configured `/fixture script` limit of 32 calls as a concrete limit of this capture route; do not alter product/provider code merely to satisfy the capture count. The multi-run browser exercise does not close the single-run ≥100 tool-event criterion. Its high-volume single-run coverage remains the existing projection test until independently verified or explicitly scoped by Astra at final acceptance. This statement is not a blanket impossibility claim for every replay/test route and does not instruct the author to build another runtime or expand the product scope.

For the final composite cell, distinguish an approved write's recorded artifact from a pending request or a mere tool response. Record the actual run identity/counts and reload observations. A before/after scrollTop of zero establishes that sampled starting position only; it does not demonstrate preservation of a nonzero reading position deep in a burst. Keep that limit explicit instead of generalizing the result. Exact source/capture identity and the previous native-zoom and snap-impact dispositions remain in force. Forced colors and screen reader are disclosed omissions, not newly added gates.

The Home second-send behavior is reported as an existing guarded abandonment with an explicit message, not a silent loss. **Defer to the existing Home composer owner** for any separate investigation; it is outside this corrective delta and does not authorize a new fix here. Await the final committed packet before bounded non-author review. No accepted code/cell is reopened by this intake.


## Final-return review — 213ef4d — 2026-09-20

**Astra decision: accept the closed portions and narrow the remaining integration return to two concrete defects.** Source is `213ef4d55073996cb25cd717dc2905e775d6f560`; review delta is `3413978..213ef4d`. The author report is final for this correction and retains the existing conditional writer release. Main remains `72c91a2`; no merge or cleanup has occurred.

Evidence: [unchanged author report](evidence/gui-rereview-213ef4d-20260920/author-report.txt), [Luna code review](evidence/gui-rereview-213ef4d-20260920/luna-code.md), [Luna G4 review](evidence/gui-rereview-213ef4d-20260920/luna-evidence.md), [Astra observations](evidence/gui-rereview-213ef4d-20260920/astra-observations.md), [review-time source hashes](evidence/gui-rereview-213ef4d-20260920/reviewed-source.json), and [packet hashes](evidence/gui-rereview-213ef4d-20260920/sha256.json). Luna passed 57 focused GUI tests and 8 spacing-governance tests, plus a synthetic view/focus check. The separate evidence reviewer passed 2 event-weight tests already included in the 57; do not sum them as distinct checks. The 1223-test full suite remains author evidence. Astra inspected the supplied single-run PNG; no new live browser/provider run was performed in this review.

| Input | Decision / remaining work | Owner |
|---|---|---|
| F-04 empty-list focus | **Accept the bounded correction.** The focusable block and fallback to another row/composer close the absent-row case by source and synthetic view verification. This does not prove the entire Home-return route. | G1 / Claude; no redo of this correction. |
| F-04 selected-set continuity | **Still open; exact remaining code defect.** `app/web/app.mjs:6443` still assigns `state.home.filter = null` inside `goHome()`. `app/tests/home-scope.test.mjs:78-80` still asserts that rejected behavior. The author report's continuity claim is therefore incorrect. | G1 / Claude removes that reset and its obsolete comment, changes the regression expectation to retained selection, and exercises returning Home with a selected set through behavior-level evidence. Keep the accepted focus fallback. |
| Spacing fallback | **Accept.** The literal off-scale fallback is rejected; token and hairline cases pass. No broader lint redesign is requested. | G3 under Claude; no further change for this finding. |
| G4 executed cells | **Accept as bounded author-capture evidence independently inspected for consistency.** The packet has 23 cells / 23 unique PNGs. The single-run cell supports 26 successes grouped, failure/artifact/pending approval separate, and reconstruction at scrollTop 0 after reload. | G4 retains the evidence. The Luna report's phrase “across five runs” counts the five success disclosures; the author reports six total runs in the session. Keep total runs, success groups, tool-call rows and raw events distinct; this correction does not change the single-run conclusion. |
| Capture default startup | **Adopt; exact remaining evidence-tool defect.** Both new scripts import `tmpdir` but call undefined `os.tmpdir()` when `G4C_SCRATCH` is unset (fixture script line 27; single-run script line 23). | G4 / Claude uses the imported `tmpdir()` or an explicit namespace import and verifies default initialization. `node --check` alone does not execute the expression. No full recapture is demanded merely for this portability correction. |
| Capture provenance | **Adjust and accept with an explicit limit.** The README now identifies first-pass app bytes as the tree committed in `3413978` and later dirty app bytes as committed in `213ef4d`; this is author attestation, not a contemporaneous machine hash. The review packet pins the committed bytes inspected now, including scripts and manifest. Portable script edits happened after capture, so do not say the current script is byte-identical to the executed version. | G4 source note preserves this distinction in the final return. No retroactive capture-time digest is to be fabricated and no new provenance subsystem is required. |

### Explicit local-integration scope decision

Astra now **defers the unexecuted original matrix cells from the local-integration gate**, retaining them as open G4/UI-owner work before claiming full G4, accessibility or broad visual acceptance. This is an explicit narrowing of the earlier gate, not acceptance of the author's matrix rewrite or a claim that a CSS viewport substitute is native zoom.

The reason is bounded: the actual local Host has now exercised approval and the single-run failure/artifact/pending composition; independent synthetic tests exercise the 100-success grouping; source changes under this correction are confined to Home focus and lint. Requiring paid inference or changing the provider's 32-call cap adds no justified product work to this correction. The combined evidence supports local integration of these changes with disclosed visual residuals, not completion of the entire original matrix.

Open under the existing G4/UI owner: native 200% browser zoom; single-run ≥100 tool-event browser exercise; nonzero/interior scroll restoration; Usage, markdown reader and long-content Chat snap-impact checks. Forced colors and screen reader remain disclosed unexecuted checks, not new gates. The original native-zoom requirement stays visible in the full matrix; annotate it deferred for local integration rather than replacing it with CSS-equivalent evidence. The prior 16px title offset/body-height observations and Home second-send behavior retain their original owner dispositions.

**Return scope is fixed:** correct the unchanged Home reset/test and the two default scratch expressions, align the delivery/source notes, and return the new source identity with focused evidence. Do not recapture valid cells, reopen accepted code, modify the provider cap, or restart G1–G4. After independent verification of that delta, local merge and preserved-byte cleanup remain authorized without another user approval. Full G4 acceptance and core dogfood acceptance are not implied by that future merge.


## Local integration acceptance — 2b98abb — 2026-09-20

**Astra accepts the GUI candidate for local integration**, under the explicit scope and deferred G4/UI residuals of the previous decision. Candidate: `2b98abb5f412ba5b6f7c04837c4a23ed7d075a93`. The user-forwarded final report and committed third-round delivery record establish the completed corrective scope and existing conditional writer release; actual author status contains only the dependency symlink.

[Luna's non-author final delta verification](evidence/gui-final-2b98abb-20260920/luna-final.md) compared only `213ef4d..2b98abb`: Home-scope tests passed 5/5; mocked execution of the actual `goHome()` body preserved the selected set; both default scratch expressions evaluated successfully without starting a browser, server or provider; syntax and scoped diff checks passed. **Adopt:** both remaining defects are closed. The author's live Home continuity check and reported 1223/1223 suite remain separate author evidence. No accepted slice was rerun or rewritten by the reviewer.

The candidate can now merge locally. Preserve author delivery notes and all main-only Astra review/disposition sections. Full G4, native zoom/accessibility, deep-scroll and real coding-dogfood acceptance remain unclaimed; their existing owners and deferrals survive integration. Continue the already-authorized preserved-byte cleanup after the merge, retaining the frozen shared Git database, then open the first missing RD-006/DF-04/RD-009 slice from the integrated main SHA.
