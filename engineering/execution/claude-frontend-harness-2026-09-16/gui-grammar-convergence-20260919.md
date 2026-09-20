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
| 200% zoom with reflow | **Already required** | [frontend-contract](../../design/agent-interface-2026-09-10/frontend-contract.md) | G4 executes native 200% zoom |
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

### G2 · Event weight in the thread

Owners **04 run surface / thread projection**; consumers are Chat and Attention process rows.

1. Record in the delivery note, row by row, the UX-10 class of every `projectThread` row kind (`user`, `assistant`, `tool`, `question`, `permission`, `presentation`, `artifact`, `notice`, `error`, `run-status`) and fix any row whose weight disagrees.
2. Summary rows (the execution-disclosure summary, Attention process rows, Home work rows) use the subject · action · object · outcome · time form. Each part comes only from owner facts; a missing part is omitted.
3. Event-burst fixture: ≥100 tool events in one run, with one failure, one pending permission and one produced artifact. The failure, the permission and the artifact must stay individually visible, the successes must group, and the reading position must hold across reload.
4. Out of scope: new runtime event types, exposure of model thinking, and any change to the grouping predicate without the evidence above.

### G3 · Token discipline (bounded; suitable for a Sonnet worker)

Owner **styles.css / visual contract**.

- Replace raw spacing values that equal a `--space-*` token with the token. Snap other off-scale values to the nearest token, with a before/after check on the affected surface. Values the standards name without a token become registered exceptions with a reason: the 6 px label↔field gap, 1–2 px hairline or optical offsets, and named layout tokens.
- Same treatment for font sizes: map each to a `--text-*` role, or register it as a display exception allowed by ui-composition-standard.
- Add `tools/lint-spacing.mjs` and a type-size check, following `tools/lint-shapes.mjs` and `app/tests/shape-governance.test.mjs`. No debt allowlist.
- If a real gap needs a new token value, stop and ask for an Opus ruling.

### G4 · Cross-surface visual state matrix (non-author acceptance)

One fixed synthetic dataset on one candidate SHA. The surfaces are Home, Chat and Attention, plus Spark only if Spark renders a surface on that SHA.

| Axis | Cells |
|---|---|
| Content state | empty Home · normal Home · long slogan + long Example + long Profile address · Waiting/approval present · event burst (G2 fixture) · failure |
| Viewport | 1440 · 1280 · 390; sidebar collapsed at 1440 |
| Presentation | light and dark · native 200% zoom with reflow · reduced motion · keyboard pass |

In every cell, check the zone order ruled for that surface, weights against UX-10, the stable card left edge and content-start line, and that there is no overlap or horizontal overflow. Record characters per line as an observation. The author supplies captures; a non-author decides. Unexecuted cells are listed as unexecuted.

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
