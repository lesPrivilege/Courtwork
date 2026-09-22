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
