# G4 · cross-surface visual state matrix — candidate evidence

2026-09-20 · **Candidate evidence only, not acceptance.** This packet captures the
state matrix scoped in [gui-grammar-convergence-20260919.md § G4](../../engineering/execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md#g4--cross-surface-visual-state-matrix-non-author-acceptance).
It records what was observed — screenshots and measured DOM facts — against
the zoning ruled in G1 and the event weighting ruled in G2. It does not say
"accepted", "passes visually", or otherwise render a judgment. A non-author
reviewer decides.

## Source

- Branch `claude/gui-grammar-20260919`, in an isolated task worktree.
- **Corrected provenance (2026-09-20, independent-review finding).** This
  section previously stated `fc8dd6182bb990fba8d383508ccdd4e902ef0867` as "HEAD
  at capture time" for the whole packet. That is stale: it was the HEAD
  *before* the "Recapture note" below's own fix commit landed. The true
  provenance, checked directly against this worktree, is:
  - The **19 cells** described in "Recapture note (2026-09-20)" below were
    captured against the **working tree that became commit `3413978`**
    (`fix(home): dispose independent review findings F-01..F-04 and the
    G3/G4 evidence gaps`) — i.e. the review-fix changes were already present
    in the tree at capture time, and were committed as `3413978` afterward.
    `git log --oneline -3` at the time of this correction:
    `3413978 fix(home): dispose independent review findings F-01..F-04 and
    the G3/G4 evidence gaps`, `fc6eccf docs(evidence): G4 candidate state
    matrix and construction report`, `fc8dd61 refactor(css): G3 spacing and
    type literals onto existing tokens with lint-spacing gate`.
  - The **3 new matrix rows** added by `capture-fixture-cells.mjs` — the two
    missing candidate cells from the task ("Home · Waiting/approval present"
    and "Chat · event burst"), where the first one's own instructions asked
    for both a Home screenshot and a Chat screenshot of the same pending
    item, hence three rows/screenshots for two cells (this correction's own
    work — see "Matrix cells executed" and "Script notes" below) — were
    captured with `git rev-parse HEAD` reporting
    `34139788b16f60866e4c7abc947f428ccdc1c8f5`, i.e. **exactly `3413978`, HEAD
    of this branch, no commits ahead of it**.
  - At the time of THIS capture, `git status --short` on the worktree showed
    five tracked files with **uncommitted working-tree changes** already
    present, none written by this correction: `app/tests/home-scope.test.mjs`,
    `app/tests/spacing-governance.test.mjs`, `app/web/app.mjs`,
    `app/web/home-view.mjs`, `tools/lint-spacing.mjs` (68 insertions / 15
    deletions across the five, per `git diff --stat`), plus an untracked
    `app/node_modules/` (installed dependencies, not source). This capture did
    not create, inspect the purpose of, or rely on the content of those
    changes; they are named here only so the tree state is fully disclosed.
    Those five files are the second-round review fixes (the F-04 focus
    fallback for an emptied list, and the `lint-spacing` fallback-value rule
    with its tests); they are committed together with these cells in the same
    commit that carries this README, so the packet and the code it was
    captured from travel as one revision.
- No commits, stashes or resets were made in this worktree by either capture
  pass; only files under `evidence/gui-grammar-20260920/` were written.

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
- Script: `capture.mjs` (first pass — the 19 cells above) and
  `capture-fixture-cells.mjs` (second, independent pass — the 2 cells below,
  "Home · Waiting/approval present" and "Chat · event burst"). Both are kept
  in this directory for reproducibility; see "Script notes" for how each runs.

**Environment (first pass, `capture.mjs`, 19 cells).** Chrome `153.0.8010.48`
(headless), user agent
`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36`
(from `/json/version`).

**Environment (second pass, `capture-fixture-cells.mjs`, 2 cells below).**
Self-contained: it spawns its own `node app/server/index.mjs --data-dir
<scratch>/data-fixture-cells --port 8878` against a fresh, empty, real
(non-preview) data directory, and its own headless Chrome instance, CDP port
19678. Chrome `153.0.8010.53` (headless), user agent
`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36`
(from `/json/version`; recorded under `manifest.json` → `fixtureCellsEnv`,
kept separate from the first pass's `env` key). The runtime's own fake
provider (`app/runtime/fake-provider.mjs`, wired into every server instance
by `app/server/runtime.mjs::createRuntime` unconditionally — not a
capture-only stub) answered every `/fixture …` directive; no paid provider,
no network egress, no fabricated server data. Both the app server and Chrome
were started and stopped by the script itself and left no process running
after it exited.

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
| Home | empty — example closed, then reloaded; the capture asserts zero projects, no example badge and no Attention/Activity slot before recording | 1440×900 | light | real | `home-empty-1440-light.png` | composer top 472px/left 438px; centre 56.0% of `#conversation-body` height; visible slots: **sessionCandidates only**; left edge 438px shared; no horizontal overflow; intro height 69px; `--home-lead` 302px; overlap check: none |
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
| Home | Waiting/approval present — a real, pending `/fixture question` run, left unanswered | 1440×900 | light | **real (local deterministic provider, /fixture directives)** | `home-waiting-1440-light.png` | composer top 472px/left 438px; centre 56.0%; visible slots now include **pendingItems** (plus sessionCandidates, activity); "Waiting for you 1" row: title `/fixture question`, meta "No project", status "Answer requested"; the same run also appears a second time under Continue with status "Waiting for you"; left edge 438px shared; no horizontal overflow; intro 69px; `--home-lead` 302px; overlap check: none |
| Chat | pending decision card — the same run's `ask_user` question, unanswered | 1440×900 | light | **real (local deterministic provider, /fixture directives)** | `chat-pending-decision-1440-light.png` | session title `/fixture question`, header state "Waiting for you"; question card text: "What should the fake run use as its answer?" with a real `input[aria-label=Answer]` and Answer button; no horizontal overflow |
| Chat | event burst — several consecutive real runs in ONE session (see "Script notes") | 1440×900 | light | **real (local deterministic provider, /fixture directives; several runs, the provider's 32-calls-per-run script cap)** | `chat-burst-1440-light.png` | **102 total tool rows** (`.tool-card`), 100 hidden inside 5 `Execution` disclosures — `1`, `32`, `32`, `32`, `3` successful tool actions (the `1` is the answered question's own `ask_user` call; the three `32`s are three separate `ws_list`-only runs; the `3` is a fourth run's successful calls) — **100 successful tool-call attempts total**; **1 failing** `ws_read` row (`materials/does-not-exist.txt`, "Failed … file does not exist"), visible outside every disclosure; **1 pending** `ws_write` permission card ("Approve this file write? out/burst-fixture-cells.txt … Deny this write / Approve this write"), also visible outside every disclosure, left unresolved; reading position (`#conversation-body` `scrollTop` + first-visible-row text) was **identical before and after a real CDP `Page.reload`** (`scrollTop` 0, first visible row "Execution 3 successful tool actions" both times), and the same session (by id) was still active afterward |
| Chat | **single Run** — one 28-call `/fixture script` (25 `ws_list`, 1 failing `ws_read`, 1 approved `ws_write`, 1 pending `ws_write`), everything below in ONE Run (see "Script notes") | 1440×900 | light | **real (local deterministic provider, /fixture directives — ONE run, ONE script, within the provider's 32-calls-per-run cap, unmodified)** | `chat-burst-single-run-1440-light.png` | Run `4f1aa25a-50c6-4f01-b534-bafa788787a7`, session `816dc884-883b-430f-867e-6a252fdec4ac`. **28 tool rows total for this one Run**: **26 successful** (25 `ws_list` + 1 approved `ws_write`), grouped into **one** `Execution` disclosure, "26 successful tool actions" (`aria-controls` lists 27 member ids: the 26 tool calls plus the one resolved "allow" permission-history row for the approved write); **1 failing** (`ws_read` on `materials/single-run-does-not-exist.txt`, "Failed … file does not exist"), visible outside the disclosure; **1 pending** (`ws_write` on `out/single-run-pending.txt`, "Approve this file write? … Deny this write / Approve this write"), visible outside the disclosure, left unresolved. A real artifact row sits outside the disclosure too: `out/single-run-artifact.txt`, sha256 prefix `4fef558a3a21…` (`runObj.artifacts[0]`, 59 bytes; full 64-hex-char digest `4fef558a3a210f127782a38dba55ef30d2fadedfab917943138e529d461cdb55` is in `manifest.json`). Reading position (`scrollTop` 0, first visible row = the `/fixture script […]` user message) was **identical before and after a real CDP `Page.reload`**, and `activeSessionId` was the same session both times; the pending permission card and the artifact row were both still present after reload. |

**Recapture note (2026-09-20).** An independent review found that the first
version of this packet screenshotted the "empty" cell immediately after
navigation, before closing the example, so a fresh data directory alone did not
establish the precondition and that PNG showed the example dataset. `capture.mjs`
now reaches the empty state explicitly (close the example, reload) and asserts
the precondition before recording; the whole packet was recaptured with that
script against the branch working tree carrying the review fixes (Attention
scope invalidation, the empty Activity period line, the merged-page truncation
sentence and the Home filter reset), which are committed together with this
packet. Cell facts below come from that run.

23 cells executed: the 19 from `capture.mjs` (13 Home + Chat/Attention/Spark
desktop-light real states, plus dark, reduced-motion, sidebar-collapsed,
long-content, failure and zoom-equivalent variants) plus the 3 from
`capture-fixture-cells.mjs` (Home · Waiting/approval present, Chat · pending
decision card, Chat · event burst — the last two both from ONE real session,
see "Script notes") plus 1 from `capture-single-run-burst.mjs` (Chat ·
single Run, requested by review after the session-level burst above — see
"Script notes"). Full raw JSON for every cell is in `manifest.json`; each
capture pass's own env facts (Chrome version, ports, data dir) are under
`manifest.json` → `fixtureCellsEnv` (second pass) and → `singleRunBurstEnv`
(third pass).

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

**Resolved (2026-09-20).** The two rows previously here —
"Home — Waiting/approval present" and "Home — event burst (G2 fixture)" —
were both originally marked not-executed because the *example workspace*
fixture has no provider behind it and carries no pending item. That
constraint was about the example fixture specifically, not about the app as
a whole: every app server instance wires in its own local deterministic
provider unconditionally (`app/runtime/fake-provider.mjs`, started by
`app/server/runtime.mjs::createRuntime` regardless of data directory).
Driving that provider directly with `/fixture question` and `/fixture
script […]` (see `capture-fixture-cells.mjs`) produces a real pending
question, a real 102-tool-call burst across several runs, a real failing
tool call and a real pending write-permission card — no paid provider, no
fabricated server data. Both rows have moved into "Matrix cells executed"
above (as **Home · Waiting/approval present**, **Chat · pending decision
card**, and **Chat · event burst**) and are removed from this table; nothing
below was left unresolved by this correction.

| Cell | Reason |
|---|---|
| Surfaces not captured at all | Usage dialog, markdown reader, and a long-content Chat thread. The G3 note previously pointed at this packet for them; they are unexecuted here and remain open for the reviewer. |
| Forced colors, screen reader | Not exercised in this packet. |
| Chat — single Run with ≥100 tool events (added 2026-09-20) | The local deterministic provider's own script cap is 32 calls per Run (`app/runtime/fake-provider.mjs::scriptForMode`, unmodified — `script.length > 32` is rejected). A single Run therefore cannot script more than 32 tool calls in this build. The 100-successful-call burst recorded above ("Chat · event burst") is a SESSION-level burst across 5 Runs (1/32/32/32/3), not one Run. A single Run demonstrating a failing call, a pending permission and a produced artifact together IS recorded ("Chat · single Run", 28 calls, above) — but a single Run reaching ≥100 tool events remains not executed in a browser; `app/tests/event-weight.test.mjs` is its only coverage, and that coverage is synthetic events, not a live provider Run. |

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

### `capture-fixture-cells.mjs` (second pass — the 2 remaining cells)

- Self-contained: spawns its own `node app/server/index.mjs` against a fresh,
  empty, real data directory (not the example/preview one) and its own
  headless Chrome instance; both are stopped by the script when it finishes.
  Reproduce with `node evidence/gui-grammar-20260920/capture-fixture-cells.mjs`
  from the repo root (optional env overrides: `G4C_SCRATCH`, `G4C_APP_PORT`,
  `G4C_CDP_PORT`).
- Leaves the example/preview workspace (`#preview-leave-button`) immediately,
  same as `capture.mjs`'s empty-Home cell, so every session below is real.
- **One session carries both cells**, not two. The task allowed either; one
  turned out to be the reliable choice, empirically, not merely the
  convenient one: sending a *second* real message from Home a second time
  (i.e. going back to Home mid-script and starting an unrelated new chat)
  was found to race the client's own navigation-epoch guard inside
  `submitHomeRun()` (`app/web/app.mjs`) — the POST to create the session
  still succeeds (a session id is reserved and `state.activeSessionId`
  changes) but the guard's post-await check
  (`state.navigationEpoch !== ticket.navEpoch + 1 || currentSession()?.id
  !== session.id`) can fail under scripted, back-to-back navigation, and the
  Run is then not admitted. **Correction by the reviewing author:** this is a
  guarded abandonment, not a silent drop. That branch sets
  `operation.error = "The chat was created; your instruction has not been
  sent. Return Home to continue."`, which Home renders, so the person is told
  what happened and what to do; the capture script simply did not read that
  state. The path is untouched by this branch (`git diff 72c91a2..HEAD --
  app/web/app.mjs` contains no `submitHomeRun`/`guardRegisterIntent` change),
  so it is pre-existing behaviour under scripted back-to-back navigation and
  belongs to the Home composer / session-creation owner, not to this slice. Every send
  *after* the first one in this script instead goes through the
  already-open session's own composer (`submitSessionRun()`, not
  `submitHomeRun()`), which does not hit that guard and was exercised
  without incident across six consecutive real Runs in the same session.
- Sequence, all in that one session: (1) `/fixture question` → real pending
  question, captured for both **Home · Waiting/approval present** and
  **Chat · pending decision card**; (2) the question is answered (still the
  same session); (3) three separate `/fixture script […]` runs, each 32
  `ws_list` calls — the provider's own per-run script cap
  (`app/runtime/fake-provider.mjs::scriptForMode`, `script.length > 32` is
  rejected) is why the burst needs several runs, not one; (4) one run mixing
  a real failing `ws_read` (a nonexistent path under the session's own
  workspace — a real `resolveWorkspacePath`/`stat` ENOENT, not a scripted
  provider error) with three more successful `ws_list` calls; (5) one final
  run scripting a single `ws_write`, which — because this session's
  `permissionMode` is `ask` (the ordinary default for a session started this
  way) — opens a real pending permission card and is deliberately left
  **unresolved** (neither approved nor denied), captured as **Chat · event
  burst**. No artifact-produced cell was attempted in this run: approving the
  write would have resolved the one pending item this cell needs to show, so
  per the task's own guidance this was skipped rather than complicating the
  pending capture.
- `ws_list` takes no arguments (`Type.Object({})`); calling it 96+ times with
  `arguments: {}` is what supplies the bulk of the burst without needing any
  file to already exist in the workspace.
- The **1** in the "1 / 32 / 32 / 32 / 3" disclosure sequence is the answered
  question's own call: once resolved, the `ask_user` tool call groups into a
  one-item `Execution` disclosure exactly like any other successful tool
  call, which is why the burst's total successful-call count (100) includes
  it rather than starting from 0.
- Reading-position facts (`#conversation-body.scrollTop` and the first
  visible row's text) were read before a real CDP `Page.reload`, then again
  after the reload settled; both matched exactly, and
  `window.__V5_UI__.state.activeSessionId` after reload was the same session
  id as before. The "first visible row" happened to be the last (most
  recent) `Execution` disclosure rather than the very first row of the
  thread in both reads — consistent with the view being scrolled to the
  newest content by default (as a chat surface ordinarily is), not with a
  reload changing anything; this script did not scroll the view up to
  inspect earlier rows, so this cell only speaks to the position it found on
  load, not to full-thread scroll fidelity.
- Both Chrome and the app server were stopped at the end of this run.

### `capture-single-run-burst.mjs` (third pass — the single-Run cell)

- Requested after review: the session-level burst above (5 Runs, 1/32/32/32/3
  successful calls) was accepted as real, but does not satisfy "one Run with
  a burst" — the reviewer asked for a single Run whose receipt states, all at
  once: a failing tool call, a pending approval, a produced artifact, and the
  reading position across reload.
- Self-contained, same pattern as the other two scripts: its own fresh, empty,
  real data directory (`data-single-run-burst`), its own app server (port
  8879) and its own headless Chrome (CDP port 19679), both stopped by the
  script when it finishes. Reproduce with
  `node evidence/gui-grammar-20260920/capture-single-run-burst.mjs` from the
  repo root.
- **One `/fixture script` call, 28 entries, sent once** (the provider's cap is
  32 — `app/runtime/fake-provider.mjs::scriptForMode`, left unmodified by this
  capture; a 29th entry would be rejected and answered as ordinary text): 25
  `ws_list` (arguments `{}`, always succeed), 1 `ws_read` of
  `materials/single-run-does-not-exist.txt` (a real `ENOENT` from
  `resolveWorkspacePath`/`stat`, not a scripted provider error), 1 `ws_write`
  to `out/single-run-artifact.txt`, 1 final `ws_write` to
  `out/single-run-pending.txt`. This is one Run from start to its still-open
  end — the session's only Run.
- The Run pauses automatically (this session's `permissionMode` is `ask`, the
  ordinary default) at the FIRST `ws_write`. The script clicks the real
  `[data-focus-key$=":allow"]` "Approve this write" control (the same one
  `run-chain.mjs` uses) — a real DOM click, not a state mutation. Execution
  resumes on its own and runs straight into the SECOND `ws_write`'s own
  permission ask, which is left **unresolved** (neither clicked) so the
  pending-permission fact is real at capture time.
- The approved write produces a real `artifact/written` event; its record is
  read back from `window.__V5_UI__.state.runs.find(r => r.id === runId)
  .artifacts` (the same field `run-chain.mjs` checks,
  `written.artifacts[0].sha256`), not guessed from the DOM — the DOM's own
  artifact row (`.artifact-thread-row`) was also confirmed present and not
  `hidden`.
- Facts were read with the whole DOM scoped to this one Run (it is the only
  Run in a brand-new session), so no `runId` filtering was needed for the
  `.tool-card` / `.execution-disclosure-summary` counts.
- Reading position (`#conversation-body.scrollTop` + first-visible-row text)
  was read before and after a real CDP `Page.reload`, plus
  `window.__V5_UI__.state.activeSessionId` both times, the same way as the
  session-level burst cell.
- Both Chrome and the app server were stopped at the end of this run.

## Observations for the reviewer

These are measured facts, not a judgment of acceptance.

- **Scroll reachability of the overlapped blocks (added 2026-09-20).** The
  intersection below was checked by two independent live passes, one by the
  author at 375×812 and one by a non-author reviewer at 390×844: scrolling the
  conversation body brings the Activity block and its retention note fully
  above the docked composer. The docked composer is the last element of the
  scrolling body, so content above it is reachable. This disposes the
  intersection for those two fixtures and viewports only; the capture script
  itself still records the unscrolled rectangles below.
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
- **A pending permission card and a pending question card are visible
  outside every `Execution` disclosure**, confirmed by real DOM structure in
  the burst cell, not only by the G2 unit test's synthetic fixture: neither
  `.question-card.permission-card` nor a failed `.tool-card` is ever set
  `hidden` by the collapse/expand logic that hides a disclosure's own
  members (`app/web/app.mjs`'s `executionMember`/`details.hidden` wiring
  applies only to `row.kind === "tool"` rows that
  `projectExecutionDisclosures` actually placed in a plan, and per
  `app/tests/event-weight.test.mjs` a failed tool row and a permission row
  are never placed in one).
- **A real pending write permission survives a reload untouched**: after CDP
  `Page.reload`, the same `.question-card.permission-card` was still present
  with `Approve`/`Deny` still live, the same session id was still active, and
  `#conversation-body`'s `scrollTop` and first-visible-row text were
  unchanged — nothing about the burst or the pending decision was lost or
  reset by a hard reload.
- **The per-Run maximum is 32 scripted calls, and this packet did not raise
  it.** `app/runtime/fake-provider.mjs::scriptForMode` rejects any
  `/fixture script […]` whose array is longer than 32 entries
  (`script.length > 32` → treated as not a script at all); that cap is
  unmodified by any script in this packet. One consequence, confirmed by
  both burst cells above: the **100-successful-call burst is a
  SESSION-level burst across 5 Runs** (`1`, `32`, `32`, `32`, `3`), not one
  Run containing 100 events — a single Run cannot script more than 32 calls
  in this build. The **single-Run cell** (28 calls: 26 successful, 1
  failing, 1 pending, plus a real produced artifact) demonstrates that all
  four receipt facts the reviewer asked for — failure, pending approval,
  artifact, stable reading position across reload — can coexist within one
  Run; it does not, and by the cap cannot, reach 100 tool events in that one
  Run. **A single Run with ≥100 tool events remains NOT EXECUTED in a
  browser** (see "Not executed" below); `app/tests/event-weight.test.mjs` is
  its only coverage, and that coverage is synthetic events fed directly to
  the projection functions, not a live provider Run.
