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
