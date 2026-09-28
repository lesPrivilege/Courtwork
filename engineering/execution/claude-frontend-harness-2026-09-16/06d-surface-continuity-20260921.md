# 06d · Existing UI gaps and a tabbed Preview work surface

### Mandatory density/composition consumption — 2026-09-21

Read [Visual / Spatial Grammar](../../design/visual-spatial-grammar.md) before the remaining tab/header/toolbar design pass. It is now on the AGENTS/UX/continuity path: compact workbench chrome, independently readable document body and explicit decision state. The tab strip, document identity/provenance and reader toolbar are one measured vertical composition; do not make each a separate prominent header or derive CSS dimensions from the user's screenshot. Use current tokens and record role/target/glyph/type/zoom assumptions. This is a design refinement inside 06d, not ownership of whole-site grammar migration. A separate fresh Astra task starts **read-only** and must not modify your product files; parent Astra retains final rules and integration. Existing scope/behavior/identity tests remain.


2026-09-21 · Astra. User requests the browser/shell research to be consumed after Claude's report, with remaining gaps reviewed together. **Ready for Opus pickup after the 06c merge/cleanup receipt is committed.** Read actual main, current, worktrees and this order; create one isolated tree when the writer starts. No author process is launched by this file. This is a continuation of orders 06/08 and the existing shell/focus owners, not a new roadmap.

Consume [Astra's source-based selection](../../research/architecture-node-2026-09-13/browser-preview-ruling-20260921.md), its exact local source map and primary-source report; UX Grammar → frontend contract → relevant Design Scout/precedent entries. Reuse CW's tokens, glyphs, controls, Settings and surface lifecycle. ZCode/VS Code are reference code, not permission to migrate the frontend or desktop platform. Sonnet may answer at most four unresolved local implementation questions in 10 tool calls, stopping when the missing seam is located. Do not repeat the external scan.

## A. Close the two existing-owner gaps first

1. **06a optional model note.** Avoid passing null optional children to native append in `agent-profiles-view.mjs`. Keep the existing identity/model/permission readings. Verify a contract-valid absent note through native DOM behavior or an equivalent regression that does not inherit tiny-dom's null filtering. No broad Agent profiles refactor.
2. **CE-F2 work-location initial focus.** Opening a bound Work location panel must initially show its title, location identity and close affordance instead of auto-scrolling to Disconnect. Use the existing focus grammar, not a new global focus manager. Preserve command-driven focus restoration, Escape, deliberate outside-focus movement and every preparation/plain-Send lock. A reason for a locked action must remain available beside it; when it is below the fold, orient the person before sending focus there. Verify bound/unbound/preparing/unknown states, narrow/desktop and long paths with the real production controller/card wiring.

These are production corrections in their original owners, with separate small source commits and before/after counterexamples. Do not reopen already accepted recovery mechanisms or G4 wholesale.

## B. Replace the card-launcher surface with tabbed Preview

**Latest user clarification governs this scope:** implement the tab-style Preview UI first, replacing the current right-side card rows that lead into an expanded surface. A real Browser is added in a later refactor. This section supersedes the earlier idea of building a synthetic Browser/human-takeover journey now.

Use the current production artifact/file/presentation/work readers and renderer lifecycle. The new surface is a stable pane with an object tab strip, a restrained toolbar and the selected content. Opening a file, presentation or work result activates its tab directly; remove the superseded card-launcher layer from that path. Do not retain both old cards and new tabs as competing navigation. Existing Chat entry points and provenance remain.

Required journey: a real existing work object opens in Preview → open a second supported object → switch tabs → close one → expand/restore → return to Chat → reopen the same work with its draft and reading state intact. An isolated deterministic fixture supplies test objects; it is test evidence, not a substitute for production readers.

Required behavior and owner decisions:

- **Tabs identify objects, not fake browser pages.** Each tab is keyed by the existing scope/object/version identity. The same object opened twice reactivates its tab; different recorded versions must not silently replace one another. Title, active/dirty-or-stale/error state and close action use owner facts only. No invented unsaved state for read-only documents.
- Reuse current supported renderers (file/markdown, presentation, Work/Review where actually available). Do not add empty Browser/Terminal tabs or imply a localhost preview server exists. “Preview” names the surface; the selected object's existing title/source/version explains what is being read.
- Closing a tab is a view action: choose the adjacent surviving tab predictably, restore focus, and keep its source/artifact/session intact. Never cancel a Run, revoke a binding, discard the composer, delete an artifact or approve work from tab closure. Close-last has an explicit simple empty or closed-pane state.
- Scope tab order/selection/reading position to the existing work/draft owner; do not carry Work A's document into Work B. Define the smallest restoration policy and its existing preference/storage owner before implementation. Do not create a domain registry to remember UI tabs.
- Keep a stable pane through switches. Preserve document scroll, composer text/materials and return focus. Handle delayed reads after tab close, tab replacement and work navigation; an old response cannot recreate a closed tab or overwrite the active object.
- Use the current expand/maximize/restore and narrow-screen modes, adapted to the single tabbed surface. No global Home geometry, left-navigation/rail redesign, default page shrink-to-fit or new docking framework. Native zoom and viewport emulation remain distinct.
- Header controls should be only those the selected object really supports: title/provenance, reload when meaningful, close, expand/restore. Omit a URL bar, back/forward, pop-out or download command unless it already has a truthful supported target and handler. Browser-specific chrome belongs to later work.

Before code, write the target anatomy, tab identity/close/restore rules and affected nearest grammar into the original owner/change record. Use existing tabs and controls first; consult a mature compatible tab primitive only for a concrete missing mechanic. A fixture screenshot is an author proposal; Codex will inspect the actual implemented journey. No additional user approval step is needed for choices inside this authorized scope.

The controller/renderer boundary should allow a future Browser surface type to project an owned page. Do not implement that backend, its schema, automation permissions, profile access, native process or streaming path now. This keeps the present UI useful with real current objects while preserving the future integration boundary.

## Source boundaries, verification and stop

Own the two named production corrections and their directly affected tests; implement B in the existing surface host/module/tab owners, extracting a small controller only when it removes duplicated lifecycle logic. Include directly related tests/fixtures and any necessary static-allowlist hunk. Consume `surface-modules.mjs`, `app.mjs`, `shell-layout.mjs`, location history and existing panel tests; do not fork the whole app or duplicate their lifecycle. Before edits, record which existing primitives can be reused and any concrete gap. Replacing the card-launcher projection and related right-pane state/rendering is authorized; unrelated shell/backend changes remain out of scope.

Use a checked-free preview port and independent synthetic data. Preserve user 8787/8899 and native apps. One Opus writer; Sonnet exploration does not independently accept its author's code. Codex retains final architecture, OpenAI computer use, integration and restore-verified cleanup.

Deliver production A and tabbed Preview B as separate commits in one handoff, exact source SHA, owner/change record, source consumption, complete test logs and fixture launch command. Tests must cover real controller/view transitions, crossed-work identity, duplicate open, recorded versions, close active/last tab, delayed reads after close/switch, expand/restore, and draft/reading/focus retention. Capture desktop/narrow, long identities, keyboard/Escape, light/dark; label unexecuted native zoom/reader/forced-colors. No paid model or real site is needed.

Stop after the bounded handoff. Left-rail adoption, a real Browser adapter, streaming/pop-out host, Role-first Composer and P03-C/D/E remain separately accepted increments. No push/deployment or author deletion of evidence/worktrees.


## Independent disposition — 2026-09-22

[Review of source736e0f7 / packet9860c6c](evidence/tabbed-preview-review-20260922/README.md) independently accepts A1 `90be9af` and A2 `dfc90b7`, locally merged at `cd6856f` with87/87 main checks. Preserve these commits. B's normal tab/version/scope/draft/reading behavior is verified, but B remains held for **PV-R1**: closing an active or inactive Workspace tab must invalidate its pending surface fetch/late renderer continuation. The public-page gate confirms the closed tab's fetch currently stays live; no tab resurrection is claimed. Original author retains the same tree for this one correction. Spark rail/polling removal, Preview terminology and replacing the single-document-tab rule are within B scope; native Back/Forward and density convergence remain separate follow-ups. No source-tree cleanup until B is accepted or explicitly otherwise disposed.


## Read-only grammar audit follow-up — 2026-09-22

[Parent disposition of the separate audit](../../design/grammar-convergence-20260921/disposition-20260922.md) records identical sampled main/candidate reader stack geometry; do not relabel inherited chrome as a new06d height regression. At390px/fine pointer, close24×24 and Find27.25px did not inherit root44. This is a scoped target-map/coarse-verification follow-up for06d/reader, not by itself an AA failure or an addedPV-R1 blocker. Record any compact fine-pointer exception and separately preserve/verify the coarse target path; no global44 change or global density rewrite. The Runtime M1 lease edits only its own view module, excludes styles.css and all06d files, and does not take this writer's scope.

## Author change record — written before B's code (2026-09-21, Opus)

Base `b714c08` (main), branch `claude-tabbed-preview-20260921`, worktree `.worktrees/courtwork-tabbed-preview-20260921`. A's two corrections are committed separately first (A1 `90be9af`; CE-F2 follows). Filled per [change template](../../design/agent-interface-2026-09-10/change-template.md).

**Owner facts consumed, unchanged.** Run (`GET /runs/:id`, `renderRun`), file readers (`createFileView`: current / content-version / core-file / retained-source, each with its own provenance note and generation guard), presentation instance (`presentation.created` event or `GET …/presentations/:id`), Workspace / extension Work surface (`loadSurface`, renderer mount/update/dispose, `sameSurfaceIdentity`). No Host route, schema or renderer ABI changes.

**Existing primitives reused.** `surface-modules.mjs` (per-kind adapter + pane; the host keeps order, selection, Escape and renderer lifecycle — WK-41), the object-tab anatomy `.surface-document-tab` / `.surface-tab-select` / `.surface-tab-close` (WK-113 ④⑥: separate select and close hit areas, truncated name with full name on `title` and accessible name), `.tab-activity` run marks (WK-118 ⑤), the tablist keyboard (arrows / Home / End, Delete/Backspace closes), `surface-back-button` (← Chat, outside the tablist), `surface-expand-button` maximize/restore, the three geometry modes (≥1680 three-pane C, 1024–1679 view switch B, <1024 modal sheet), `rememberSurfaceFocus` / `surfaceReturnFocus` / `restoreLayerFocus`, R4D-3 chat reading memory, Materials file return.

**Concrete gap.** The strip holds at most one object tab (CC-W 1: "no array, no map" while one trusted active document existed); a second file replaces the first, and run/presentation/workspace are *kind* tabs, not objects. Nothing remembers reading position per object or scopes the set to a Session. No external tab primitive is needed for that; the missing mechanic is a small list model.

**Target anatomy.** One pane named **Preview**: header = [← Chat, B only] [object tablist] [Work memory-scope statement, unchanged] [toolbar: Expand/Restore where the geometry offers it · Hide preview]; body = the selected object's existing renderer and its own provenance/version lines. No URL bar, back/forward, pop-out, download, Browser or Terminal tab. No toolbar Reload: the objects whose reading can change already carry their reload in-pane (Run refresh, Workspace refresh, file Retry), and recorded versions/presentations are immutable. The collapsed right-card rail (Run summary card, File/Workspace/Presentation cards, glyph strip, entry directory) is removed with its projection code; Spark keeps its own header entry.

**Tab identity.** A tab is keyed by scope + kind + the owner's existing identity: Workspace `sessionId`; Run `sessionId, runId`; File `sessionId, kind, path, sha256, runId` (+ core-file `matterId, candidateId, artifactId, candidateDigest, bundleDigest`; retained-source `sourceId, revision`) — the existing `surfaceDocumentKey` fields; Presentation `sessionId, instanceId, revision`. Opening an object whose key is present reactivates that tab; two recorded versions of one path are two tabs, labelled with their short version. Title, full name, version word and run activity come from those facts; no dirty/unsaved state is invented for read-only objects.

**Open / close / restore.** Opening appends to the end of the strip and selects the tab. Closing is a view action only: the right neighbour becomes active, else the left; focus goes to the new active tab; closing an inactive tab leaves selection alone. Closing the last tab closes the pane and returns focus to what opened it (else the header Preview button). Nothing a tab close does cancels a Run, revokes a binding, discards the composer, deletes an artifact or decides work; an in-flight read for the closed tab is aborted and its late answer is ignored. The header entry reopens the Session's remembered set; with none, it opens that Session's Workspace. Escape: a maximized pane restores first, otherwise the pane hides.

**Scope and restoration policy (smallest).** The tab list, selected tab and each tab's reading position (content scroll) belong to the existing Session surface owner in `app.mjs`, held in memory keyed by `sessionId` for the page's lifetime; leaving Work A and entering Work B shows B's set (initially empty) and never A's objects, and returning to A restores A's set closed until reopened. Nothing is written to storage and no registry is created, so a reload starts with no tabs (the pre-existing `surfaceOpen` marker no longer opens anything by itself). `state.surface.kind / runId / fileRef / presentationRef` become read-only projections of the selected tab, so there is one selection fact.

**Delayed reads.** Reads keep their owners' guards (file generation + abort, run read generation, surface fetch id, presentation ref identity). A response can only paint the tab that is still selected in the same Session; no response creates or reselects a tab.

**Future Browser boundary.** A later Browser surface is one more module kind (adapter + pane + tab identity) that projects an owned page; nothing here implements it.

**Affected rules / grammar.** UX-03 (Tab switches peer views; tabs here are objects, per tab-view grammar "Preview / document chrome"), UX-02 (full name/version on the tab's accessible name), UX-09 (no empty rail cards), `docs/ui-composition.md` 检查栏/放大工作面 rows and WK-41/42/72 (card layer), CC-W 1 (single document tab) — superseded here for multiple object tabs; recorded in the owner test with this record as the pointer. Intentional change: no collapsed card layer; the pane opens directly on an object.

## Author delivery — 2026-09-21 (Opus)

A1 `90be9af`, A2 `dfc90b7`, B `736e0f7` (review this SHA) on `claude-tabbed-preview-20260921`. Evidence, logs, fixture command and unexecuted items: [evidence/tabbed-preview-20260921](evidence/tabbed-preview-20260921/README.md). Full suite 1388/1388; B browser journey 34/34; CE-F2 before/after 21/21.

Deviations from the pre-code record: none in behaviour. Consequences recorded:
- Spark's rail card had no host left, so `subagent-view.mjs` lost its rail hook and background poll. Spark is still on its own nav entry.
- The copy row "Open in work surface" became "Open in Preview".
- Stale semantics-registry entries for the removed modules were dropped.
- `writeUiState` no longer writes the unread `surfaceOpen` marker.

Writer released. No push, no deploy, no evidence or worktree deletion.

## PV-R1 return — 2026-09-22 (Opus)

The review on main `6da9347` accepted A1/A2 and held B for PV-R1. Answered at **`4698d8b`** on the same branch: closing a Workspace tab, selected or not, now retires its reads through the existing owners, and reopening starts new ones. Page-route regression, before 4/7 → after 7/7; B journey 34/34; full suite 1389/1389. See the [PV-R1 packet](evidence/tabbed-preview-20260921/pv-r1/README.md). Only the correction delta changed. The Back/Forward-after-native-controls candidate stays registered for the shell/navigation increment; the review's point that geometry hooks are not native completeness is noted.


## PV-R1 final acceptance — 2026-09-22

[Final independent acceptance](evidence/tabbed-preview-final-20260922/README.md) closes PV-R1 at `4698d8b` and integrates complete B/packet31c09e5 as main `6c0bd32`: Luna50/50, OpenAI browser active/inactive close aborts before delayed response release and reopening works, integrated65/65. The ended tree is restore-verified and removed. A1/A2 stay accepted. Density/coarse-target/native-shell follow-ups retain their original scope and unexecuted cells. Idle8787 was updated solely for the new static route with exact Session data equality; no schema migration/provider call.


## 2026-09-28 · Active Preview tab visibility return

Current-source OpenAI browser audit on synthetic main78a1b43 reproduces an existing06d continuity defect, separate from the historical PV-R1 read invalidation fixes. Open recorded `out/preview-a.md`, return to Chat, open `out/preview-b.txt`, choose the first tab, narrow to390×844, then ArrowRight. Body and `aria-selected` correctly move to the second object, but its focused tab remains mostly outside the scroll strip. [Actual screenshot](evidence/ux-continuity-20260928/13-preview-second-390.png) and [DOM bounds](evidence/ux-continuity-20260928/preview-tabs-390-metrics.json): strip x16–306/client290/scrollWidth524/scrollLeft0; active tab x292–496/width204, focused true. This demonstrates visible-target loss, not a claimed full WCAG audit or a new backend defect.

**Original Claude lease, after its active B2-reading adjustment:** ensure a newly opened, selected or keyboard-focused Preview object tab is revealed within its own horizontal strip, including its close affordance where it fits. Preserve stable tab identity/order/labels, roving keyboard model, unchanged-poll DOM stability, per-object body reading position and close/return focus. Do not scroll the page/document body to reveal a tab, continually reset a user's strip scroll during unchanged polling, shrink the whole UI, or replace the tab system. Nearest precedent is existing06d `renderPreviewTabs`/`installPreviewTabKeys` and `showPreview`/`selectPreviewTab`; affected UX-03/07/09 and workbench-chrome role, existing28px/44px target conventions.

Lease minimal `app/web/preview-tabs.mjs` and the actual app.mjs tab-focus/reveal call sites only if needed, plus focused existing Preview tests and evidence. No backend/service/Store/data/permission changes, no unrelated app.mjs rewrite or global CSS change. Reproduce the observed offscreen-active case, verify Arrow/Home/End/open/close selection with horizontal overflow and preserve the unchanged-render invariant. Parent performs current screenshots and geometry at390 and desktop, body-scroll/return-focus checks; narrow behavioral checks suffice unless a new cross-layer change is justified. Keep all author findings/results in this original06d record; current UX audit is the evidence entry, not another roadmap. No user-service restart, native Hermes run, paid provider or deployment.

### Active Preview tab visibility · author result · 2026-09-28 (Claude, Opus)

Implements the return from `9f80175`. Product commit `0695b90`, in the existing isolated tree. This tree is not based on `9f80175`, but the leased product files are identical, so Parent keeps both sides of this record when merging.

**Source reading.** `.surface-header .surface-tabs` is the strip's own `overflow-x: auto` scroll container (`surface-layout.css`). `renderPreviewTabs` replaces all tabs on any changed repaint, and nothing moved the strip to the newly active tab. Emptying the strip clamps `scrollLeft` to 0, so a selection repaint also dropped the strip back to its start. This is source inference; I ran no browser, and Parent's metrics show the result: `scrollLeft 0`, with the second tab at x292–496.

**Change, `app/web/preview-tabs.mjs` only:**
- A new `revealPreviewTab(container, key)` sets only the strip's `scrollLeft`, by the smallest amount that shows the whole tab (select and close targets). A tab wider than the strip shows its start. It never scrolls the page, the body or the object's reading.
- `renderPreviewTabs` keeps the strip's scroll across a repaint. It reveals only when the drawn active key changes: open, select, arrow keys, Home/End, or close handing over to a neighbour.
- Unchanged polls still return early and touch nothing. A changed mark with the same selection keeps the reader's scroll.
- A strip with no layout box owes the reveal to its next paint.
- `installPreviewTabKeys` also reveals the tab when keyboard focus lands on its select or close target (`focusin`).
- Unchanged: tab identity, order and labels, the roving tabindex and keys, close and return focus, and per-object reading positions. `app.mjs` is unchanged, because `renderSurfaceVisibility` shows the panel before it redraws the strip.

**Grammar applied:** existing 06d `renderPreviewTabs`/`installPreviewTabKeys` and `showPreview`/`selectPreviewTab`; UX-03/07/09; the workbench-chrome role. No CSS change.

Author checks:
- `app/tests/preview-tabs.test.mjs` gains three behavioural regressions using a layout stand-in for the observed 390px strip (x16–306, client 290, 204px tabs, clamp when emptied):
  1. The observed case: first tab selected, ArrowRight; the second tab, including its close target, lies inside the strip.
  2. Home/End, open and close all reveal; unchanged and changed-mark repaints keep the reader's scroll.
  3. Focus on an off-strip close target reveals its tab; a hidden strip's owed reveal lands on the next paint.
- All three fail on the unfixed source and pass with the fix.
- preview-tabs, preview-layer, kit-profile-preview and run-rows pass 46/46 ([log](evidence/preview-tab-reveal-20260928/targeted-tests.txt)). `tools/lint-interaction` and `git diff --check` pass.
- Real 390/desktop geometry, body-scroll and return-focus checks remain with Parent.

Writer released pending acceptance. No browser, user-service restart, native Hermes run, paid provider or deployment.


**Active-tab visibility parent acceptance · 2026-09-28.** [Independent packet](evidence/ux-continuity-20260928/README.md) accepts0695b90/e318c7a. Original390px offscreen-active case now scrolls only its strip to234; selected tab/close fit the strip, reading/page position and exact return focus remain. Luna15/15 plus parent actual Arrow/open/inactive-close/last-close browser checks pass. Reject the helper-only close concern as a product blocker after checking actual app.mjs focus and repeating the actual path; do not add speculative auto-scrolling. Historical PV-R1 read-invalidation and untested accessibility matrices retain their earlier status.

## 2026-09-29 · Reader coarse targets · tab close and Version details (Claude, UX owner)

**Input.** Parent's measured reader targets ([packet](evidence/ux-batch-review-20260929/README.md), [measurements](evidence/ux-batch-review-20260929/reader-targets.json)): under actual `pointer: coarse` emulation, Back, Hide, Copy and code-copy go from 28 to 44, but the Preview **tab close stays 24×24**, and the visible **Version details** summary is **17.25px** tall under both pointers. The hash-copy inside the collapsed details isn't a visible target and is excluded. This continues grammar-convergence F2 (coarse verification) for these reader controls. Product commit `b4bfedb`.

**Decisions:**
- **Tab close:** under `pointer: coarse` it takes `var(--control)` (44×44). With a fine pointer it keeps 24×24, the grammar's micro target, and the 18px glyph doesn't grow. The coarse tab row is already 45 tall, so the strip's geometry holds.
- **Version details summary:** a disclosure is a control, so its single line takes `line-height: var(--control)` (28 fine, 44 coarse). That fixes the fine case too, which was below the 24px minimum. `display` stays `list-item`, keeping the native marker; switching the summary to flex would drop it in Chrome and Safari. The change is in the shared `.version-details summary`, so all three consumers (file view, run artifacts, retained materials) change together.
- **Selected by pointer capability, not viewport width** (visual-spatial grammar). No other size, token or layout change.

**Checks:**
- New `app/scripts/reader-targets-browser.mjs` and `app/tests/reader-targets-browser.test.mjs` run real headless Chrome against a disposable Host's own shipped `styles.css`/`surface-layout.css`. The tab strip is rendered by the shipped `preview-tabs.mjs`; the `.version-details` markup matches its consumers. Measured with a fine pointer, then touch emulation (restored). This is the shipped CSS on real markup, not the full reading flow; the full reader capture stays with Parent.
  - **Before** (`13ad62b`, [record](evidence/reader-targets-20260929/reader-targets-before-13ad62b.json)): tab close 24×24 and summary 17.25 under both pointers, reproducing Parent's measurements.
  - **After** ([record](evidence/reader-targets-20260929/reader-targets-after.json)): tab close 24 fine / 44 coarse with the glyph unchanged and its accessible name kept; summary 28 fine / 44 coarse with the marker kept.
- Preview-tabs, inspector, run-row, Chat-page browser and entry-audit suites pass 30/30 with 0 skipped ([log](evidence/reader-targets-20260929/author-targeted-tests.log)). The spacing, interaction, shape, colour and material lints and `git diff --check` pass.

**Capture needed from Parent:** the Preview reading flow at 1440 and 390 with coarse emulation (tab close and Version details, closed and open), plus a fine-pointer check that the strip and file header look unchanged.

**Reader-target independent acceptance · 2026-09-29.** [Parent full-reader packet](evidence/reader-targets-20260929/parent-review/README.md) accepts b4bfedb/bb550dc: independent real-Chrome1/1 (no skip) and actual OpenAI Preview file flow at1440/390 under coarse media, closed/open Version details, mouse24/28 and coarse44/44 measurements, native keyboard disclosure and expanded-corner pointer close/focus return. The marker and glyph remain; the fine summary's intended height increase is explicit. Direct touch-event injection is unavailable in the in-app browser, so physical-touch/Safari/accessibility full matrices are not claimed. Original author30/30 remains separately attributed; no new authority or data change.
