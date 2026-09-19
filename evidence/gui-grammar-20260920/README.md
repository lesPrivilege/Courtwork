# G4 · cross-surface visual state matrix — candidate evidence

2026-09-20 · **Candidate evidence only, not acceptance.** This packet captures the
state matrix scoped in [gui-grammar-convergence-20260919.md § G4](../../engineering/execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md#g4--cross-surface-visual-state-matrix-non-author-acceptance).
It records what was observed — screenshots and measured DOM facts — against
the zoning ruled in G1 and the event weighting ruled in G2. It does not say
"accepted", "passes visually", or otherwise render a judgment. A non-author
reviewer decides.

## Source

- Branch `claude/gui-grammar-20260919`, in an isolated task worktree.
- HEAD at capture time: `fc8dd6182bb990fba8d383508ccdd4e902ef0867` (`git rev-parse HEAD`).
- No commits, stashes or resets were made in this worktree; only files under
  `evidence/gui-grammar-20260920/` were written.

## Host and capture setup

- App server: `node app/server/index.mjs --data-dir <scratch dir> --port 8873`,
  a fresh empty data directory under this session's scratchpad (not committed,
  contains no personal data — only the app's own synthetic "example workspace"
  fixture, `app/web/samples/preview/responses.json`, and one Profile field set
  through the real Settings UI, see the long-content cell below).
- Browser: real headless Chromium driven over CDP, reusing the pattern of
  `evidence/final-integration-20260908/browser.mjs`. Chrome launched fresh for
  each pass with `--headless=new` and a temporary `--user-data-dir`, CDP ports
  19661/19663/19664 (within the assigned 19660–19669 range; 8871/8872 and
  their hosts were left untouched, per instruction).
- No paid model provider was used; the app's own local/example paths only.
- Script: `capture.mjs` (first pass — all cells except the two fixed below)
  and a follow-up pass folded into the same `manifest.json` (see "Script
  notes"). Both are kept in this directory for reproducibility.

**Environment.** Chrome `153.0.8010.48` (headless), user agent
`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36`
(from `/json/version`).

Raw measured facts for every cell, plus the full 30-step keyboard sequence,
are in [`manifest.json`](manifest.json). The table below summarizes them.

## Matrix cells executed

Composer/block "overlap check" columns come from a `getBoundingClientRect`
intersection test between `#composer-form` and every visible `.home-section`,
run as a follow-up verification once the screenshots suggested it (see
Observations). "Section left edge (shared)" means every visible
`.home-section` and `#composer-form` shared one left coordinate in that cell.

| Surface | State | Viewport | Scheme | Method | File | Measured facts |
|---|---|---|---|---|---|---|
| Home | empty (fresh data dir, example not shown) | 1440×900 | light | real | `home-empty-1440-light.png` | composer top 472px/left 438px; centre 56.0% of `#conversation-body` height; visible slots: attention, sessionCandidates, activity; left edge 438px shared; no horizontal overflow; intro height 69px; `--home-lead` 302px |
| Home | normal (example workspace) | 1440×900 | light | real | `home-normal-1440-light.png` | composer top 472px/left 438px (identical to empty); centre 56.0%; slots: attention, sessionCandidates, activity; left edge 438px shared; no horizontal overflow; intro 69px; `--home-lead` 302px; overlap check: none |
| Home | normal (example workspace) | 1280×800 | light | real | `home-normal-1280-light.png` | composer top 416px/left 358px; centre 56.0%; same slot set; left edge 358px shared; no horizontal overflow; intro 65px; `--home-lead` 250px |
| Home | normal (example workspace) | 390×844 (mobile emulation) | light | real | `home-normal-390-light.png` | composer top 678px/left 16px; centre 89.6% (docked composer, see below); same slot set; left edge 16px shared; no horizontal overflow; intro 164px; `--home-lead` removed (narrow layout); **overlap check: the Activity block (top 679, bottom 956) overlaps the composer (top 678, bottom 844)** |
| Home | normal, sidebar collapsed | 1440×900 | light | real | `home-normal-1440-light-sidebar-collapsed.png` | composer top 472px/left 310px; centre 56.0%; same slot set; left edge 310px shared; no horizontal overflow; intro 69px; `--home-lead` 302px |
| Home | normal (example workspace) | 1280×800 | dark | real | `home-normal-1280-dark.png` | composer top 416px/left 358px; centre 56.0%; left edge 358px shared; no horizontal overflow; intro 65px; `--home-lead` 250px |
| Home | normal (example workspace) | 1440×900 | dark | real | `home-normal-1440-dark.png` | composer top 472px/left 438px; centre 56.0%; left edge 438px shared; no horizontal overflow; intro 69px; `--home-lead` 302px |
| Home | normal, reduced motion (`prefers-reduced-motion: reduce`) | 1440×900 | light | real | `home-normal-1440-light-reduced-motion.png` | composer/geometry identical to the plain 1440 light cell; computed `transition` of `.home-activity > summary > .ui-icon` is `none` |
| Home | long slogan + long Example + long Profile address | 1440×900 | light | real Profile work address (Settings › Profile, `maxlength=40`) + **INJECTED DOM TEXT** (greeting span `#home-composer-intro [data-greeting]`, and the active-preview banner line `#preview-banner-active .preview-banner-text`) | `home-long-1440-light.png` | composer top **472px** (unchanged from the plain cell) / left 438px; centre 56.1%; left edge 438px shared; no horizontal overflow; intro height grew 69px → 222px; `--home-lead` fell 302px → 150px; Profile save confirmed (`change` event fired, real PATCH); both injection targets found |
| Home | failure — Home read failure (preview closed first, so the `work-summary` read is a real network request; see Script notes) | 1440×900 | light | **SIMULATED NETWORK FAILURE** (CDP `Fetch.failRequest` on `*work-summary*`) | `home-failure-1440-light.png` | `.connection-line` present; connection-line text: "Local runtime unavailable" |
| Home | CSS-equivalent (720×450 @2x), not native zoom | 720×450 @2x | light | **CSS-equivalent (720×450 @2x), not native zoom** | `home-normal-zoom-css-equivalent-720-light.png` | no horizontal overflow (`scrollWidth` = `innerWidth` = 720); 4 elements matched the clip/overflow-hidden heuristic, all `.sr-only` accessibility-only spans (not visibly clipped text — see Observations); **overlap check: the Continue/`sessionCandidates` block (top 309, bottom 577) overlaps the composer (top 284, bottom 450)** |
| Chat | normal (example session with tool rows/artifact) | 1440×900 | light | real | `chat-normal-1440-light.png` | session opened: "Final review memo — working artifact" (fixture `story.sessions.artifact`); shows one grouped `Execution · 1 successful tool action` disclosure and one artifact row (`out/project-cedar-review.md · Recorded version`); no horizontal overflow |
| Chat | normal (example session) | 1280×800 | light | real | `chat-normal-1280-light.png` | no horizontal overflow |
| Chat | normal (example session) | 390×844 (mobile emulation) | light | real | `chat-normal-390-light.png` | no horizontal overflow |
| Chat | normal (example session) | 1440×900 | dark | real | `chat-normal-1440-dark.png` | no horizontal overflow |
| Chat | CSS-equivalent (720×450 @2x), not native zoom | 720×450 @2x | light | **CSS-equivalent (720×450 @2x), not native zoom** | `chat-normal-zoom-css-equivalent-720-light.png` | no horizontal overflow; 15 elements matched the clip/overflow-hidden heuristic, all `.sr-only` accessibility-only spans (message/run action labels — not visibly clipped text) |
| Attention | normal (example item) | 1440×900 | light | real | `attention-normal-1440-light.png` | opened at the example item ("Review Project Cedar source change", state Investigating); no horizontal overflow |
| Attention | normal (example item) | 1440×900 | dark | real | `attention-normal-1440-dark.png` | no horizontal overflow |
| Spark | normal, if rendered | 1440×900 | light | real | `spark-1440-light.png` | Spark renders as a modal dialog ("Spark · Explore") layered over a dimmed Home, not a distinct page-level surface |

19 cells executed (13 Home + Chat/Attention/Spark desktop-light real states,
plus dark, reduced-motion, sidebar-collapsed, long-content, failure and
zoom-equivalent variants). Full raw JSON for every cell is in `manifest.json`.

## Keyboard pass — normal Home, 1440×900, light

Starting focus: `#composer-input`. 30 real `Tab` key presses via CDP
`Input.dispatchKeyEvent` (not synthetic `.focus()` calls); `document.activeElement`
was read after each press. Full sequence (tag / `data-focus-key` / aria-label /
id / visible text) is in `manifest.json` → `keyboard.sequence`. Order reached:

1. Composer controls — Attachments, Project, file-access select, Model/effort.
2. Home block rows in the ruled order — the Attention row (`home:attention:…`),
   `Show all` on Continue, then three Continue rows.
3. The Activity `<summary>` (`data-focus-key="home-activity-toggle"`). At this
   point the script pressed **Enter**: `.home-activity` toggled `open`
   `true → false` — the Activity disclosure does toggle on Enter, as scoped.
4. Focus then left the Home content area into the shell chrome: sidebar brand
   link, Home/New chat/Chat/Attention/Spark nav buttons, the chat filter
   input, `New project`, the two example project rows (Project Cedar review,
   Northside housing ledger) with their sessions and `New chat in …` buttons,
   the account button, and the nav-toggle button — i.e. focus moved from the
   main content back into the persistent sidebar navigation, in DOM order.

No focus trap or skipped element was observed in this pass.

## Not executed

| Cell | Reason |
|---|---|
| Home — Waiting/approval present | The example workspace fixture (`app/web/samples/preview/responses.json`) carries no pending question or permission item — the `pendingItems` ("Waiting for you") slot was observed `hidden=true`, 0 rows, both on first load and after a reload. No local action can create a real pending question/permission without a configured paid model provider, which this capture does not use. |
| Home — event burst (G2 fixture) | Requires a live provider Run emitting ≥100 tool events; none is available without a paid provider. Unit coverage exists instead: `app/tests/event-weight.test.mjs` builds the same 100-success/1-failure/1-pending-permission/1-artifact fixture referenced in the G2 slice and asserts the grouping, individual visibility and per-Run state-line behavior. |

Native 200% browser zoom was also not available (headless Chrome only
emulates viewport size/DPR, not the browser's own zoom feature) — per the
task's instruction this was captured instead as the CSS-equivalent
720×450 @2x cells above, labelled accordingly.

## Script notes (for reproducing this run)

- `capture.mjs` is the primary script: launches Chrome, opens the fresh data
  directory, captures the empty-Home cell, opens the example workspace, then
  works through the viewport / presentation / long-content / failure /
  zoom-equivalent cells, the keyboard pass, Attention and Spark. It writes
  `manifest.json`.
- Two cells needed a second pass because the first attempt used the wrong
  selector / didn't account for the example workspace's own request handling;
  both are documented here for anyone reproducing the run:
  - **Chat.** The fixture's `story.sessions.artifact` session
    (`ab845057-7234-4e67-997f-391980d765d6`) is not necessarily in the global
    "Recent" list (`[data-recent-id]`); it is reliably reachable through its
    own project's session row, `[data-nav-key="session:<id>"]`, inside
    `#project-list`.
  - **Home failure.** While the example workspace is active,
    `preview-layer.mjs`'s `WORK_ROUTES` answers `/work-summary` from the
    recorded fixture directly in the page — no real network request is made,
    so CDP `Fetch.failRequest` on `*work-summary*` never matched anything.
    The simulation was therefore run after closing the example
    (`#preview-leave-button`, "Close the example"), which returns Home to a
    real (empty-workspace) network read that `Fetch.failRequest` can catch.
    This is recorded as `SIMULATED NETWORK FAILURE`, same as any other Home
    failure cell, just captured against the real empty workspace rather than
    the synthetic one.
- A third, small standalone script (not kept, `overlap-check.mjs` in this
  session's scratchpad) re-measured the composer/block bounding-box
  intersection noted below using `getBoundingClientRect`, independent of the
  screenshots, once the images suggested it visually.
- Both Chrome and the app server were stopped at the end of this run.

## Observations for the reviewer

These are measured facts, not a judgment of acceptance.

- **Composer/block bounding-box overlap at narrow and short viewports.** At
  390×844 (mobile emulation) the Activity block's rect (top 679, bottom 956)
  overlaps the composer's rect (top 678, bottom 844). At the 720×450 @2x
  CSS-equivalent-zoom capture, the Continue (`sessionCandidates`) block's rect
  (top 309, bottom 577) overlaps the composer's rect (top 284, bottom 450).
  The 1440×900 control shows no such overlap (composer bottom 632, next block
  starts at 664). `horizontalOverflow` measured `false` in all three. This is
  consistent with a fixed/docked composer at narrow layout widths (the G1
  delivery note: "Mobile and Work keep their docked composer") sitting over
  block content that has not yet been scrolled into view, rather than a
  horizontal-overflow or text-clipping defect — but it is a genuine DOM
  bounding-box intersection between the composer and a work block, measured
  independently of the screenshots. Scrolling past the initial position was
  not exercised in this capture, so whether the overlapped content remains
  reachable by scroll is not established here.
- **The composer's geometric anchor held across content states, as G1
  claims.** In the empty vs. normal-Home cells at 1440×900, the composer's
  top/left/centre-% were byte-identical (472px / 438px / 56.0%). In the long
  content cell, the composer top also stayed at 472px while the identity
  intro grew 69px → 222px and `--home-lead` fell 302px → 150px to compensate
  — matching the "composer is the anchor" geometry ruled in G1 item 1.
- **All visible `.home-section` blocks and `#composer-form` shared one left
  edge in every Home cell captured** (438px at 1440, 358px at 1280, 310px
  with the sidebar collapsed, 16px at 390) — no per-block left-edge drift was
  found in this run.
- **The clip/overflow-hidden heuristic's hits were all `.sr-only`
  accessibility spans**, at both the Home and Chat 720×450 @2x captures (4
  and 15 respectively) — e.g. "Toggle navigation", "Copy message", "Run
  started …". These are visually-hidden-by-design utility text for assistive
  technology, not visibly clipped on-screen text; no visibly clipped text was
  found by this heuristic at 200%-equivalent for either surface.
- **The Profile work-address change is server-side, persistent state**, not a
  per-capture artifact: after being set once (for the long-content cell) it
  also appears in the account footer and greeting of later captures from the
  same host, including the failure-cell screenshot ("Still working, Multnomah
  County Circuit Court, Division?"). Anyone re-running or extending this
  capture against the same scratch data directory will see it too.
- **Spark renders as a modal dialog** ("Spark · Explore") over a dimmed Home,
  not as an independent page-level surface the way Chat and Attention are —
  recorded per the task's "Spark only if it renders a surface" instruction;
  Home's own content stays mounted (and visible, dimmed) behind it.
- Keyboard focus order after the ruled Home blocks moves into the persistent
  sidebar chrome (brand link → nav buttons → filter → project tree → account
  → nav toggle) rather than stopping at the end of Home's own content; no
  trap was observed.
