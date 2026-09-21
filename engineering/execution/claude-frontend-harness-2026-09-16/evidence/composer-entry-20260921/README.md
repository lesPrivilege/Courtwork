# Work location entry · author delivery

2026-09-21 · Claude (Opus 5), author. This delivery is on branch
`claude-work-location-20260921`, one commit from integrated main `3bf1e0b`, in
its own worktree. It answers the
[working-location ruling](../composer-entry-review-20260921/README.md), and
the [change record](change-record.md) was written before any product file
changed. **Not accepted.** The branch is released for Codex's independent
visual and source acceptance.

## What changed

- **One entry.** The band above the composer now holds a single button.
  - With nothing chosen it reads *Choose work location*.
  - With a choice it names the project and the folder, project first, each
    truncated separately so a long project name cannot hide the folder.
  - Its accessible name states both facts in full, including an absent one
    (for example *no project*), and that the folder is read only. It never
    names the candidate, edits or Local.
  - It is never disabled. When the location cannot change, the panel says why.
- **The composer's Project button and its popover are gone.** The project
  choice (No project / projects / New project…) now sits in the panel, above
  the folder.
- **The panel is titled Work location** and has three sections: Project,
  Folder, Edits.
  - The sections are told apart by one divider and spacing (UX-07), with no
    box inside the box.
  - The folder is shown by its name, with the complete path as a secondary
    line underneath instead of a narrow value column.
  - Access, File access, the private candidate, "Which is which" and every
    recovery sentence are unchanged, and each stays beside its own action.
- **Project is a choice only on Home before any chat exists.** Afterwards it is
  a fact with the sentence *Set when this chat was made. A chat keeps its
  project.* That sentence is accurate: the Host renames chats but has no
  command that moves one between projects.
- **A plain Home send in flight now locks the location with a stated reason**
  (`SEND_BUSY`, or `PREPARE_UNCERTAIN` while unconfirmed) instead of a
  disabled chip that said nothing.
- **Focus.**
  - Escape, Close and light dismissal return focus to the entry.
  - A project choice keeps focus on the option chosen.
  - New project returns to the entry.
  - On an empty Home the panel opens on the selected project option.
- **Stable entry node.** The entry is one node for the life of the page. On
  main the chip was rebuilt on every render, which dropped focus. It also
  meant the panel never actually anchored to it: it fell back to the browser's
  default position, and a tall panel ran off the screen.
- **Panel height.** With real anchoring, `anchorPopover` gained an opt-in
  `fit` option, used only by this panel. It limits the panel to the larger
  free space beside the entry, so `flip` always has a side that fits and the
  panel scrolls inside itself. The vendored floating-ui build has no `size`
  middleware, and no dependency was added.
- **Proportions, measured against existing tokens.**

  | Element | Value |
  |---|---|
  | Entry glyph | 16 px, the `workspace.object` folder, in the 16 slot from `icon-controls.md` |
  | Band text | `--text-meta` (11.5 px), unchanged |
  | Gap | the registered 6 px chrome gap |
  | Name separator | `--space-1` |
  | Panel row glyphs | 18 → 16 px (18 is off the 16/20 slot scale) |
  | Section labels | the existing eyebrow style (`--text-caption`) |
  | Hit areas | 32 px desktop via an invisible extension; a real 44 px in the ≤767 px / coarse-pointer layout. Visual chip height is unchanged at 22.7 px on desktop |

- **Leftovers removed.** Dead `.composer-workspace` and project-popover CSS,
  and the `setAction` call on the removed button (see the note below).

**Unchanged**: every Host command, request identity and preparation decision
in `home-preparation.mjs`; PA-R1 correction; PA-R2 locks; PA-R3 retirement;
Check status and Continue preparing; draft text, materials and the File-access
select. No route, schema, event, token, icon, dependency or permission default
was added.

**Glyph gap, recorded rather than worked around.** The Codex reference shows
device and branch glyphs. `git-branch` is registered single-purpose for Fork
(`message.fork`), and the shipped Lucide subset has no device glyph. Local and
Branch therefore stay text-only; admitting either glyph needs a
product-semantics entry.

## Measured before → after

The same [capture script](harness/capture.mjs) ran both trees on a fresh
synthetic Host each time, via [run-capture.sh](harness/run-capture.sh):
- **Before** was a `git archive` of main `3bf1e0b`; **after** was this tree.
- Loopback 8951/8952, with the evidence-only scripted provider and no key.
  Nothing was sent to a real provider.
- A synthetic git folder with a deliberately long name, plus a long project
  name.
- Headless Chrome, driven over CDP ([cdp.mjs](harness/cdp.mjs)) with its own
  throwaway profile; the user's Chrome profile was not used.
- The user's 8787 and the 8899 preview were not touched.

Raw data: [before](before/measurements.json) · [after](after/measurements.json).

| Reading | Before | After |
|---|---|---|
| Composer controls for location | Project button in composer + Connect folder chip above | One band entry |
| Entry clickable height (hit-tested), 1440 / 390 / 200% | 23.2 / 23.2 / 23.2 | **32.2 / 44.5 / 44.5** |
| Band height, empty Home, 1440 / 390 | 40.7 / 40.7 | 40.7 / **62** |
| Band height, prepared, 390 | 65.3 | **86.7** (the 44 px entry, with Branch wrapping to a second line) |
| Prepared panel top (y), 1440 / 390 / 200% / dark 1440 | 69.5 / 102.8 / **−89.7** / **−61.5** (off screen) | 8 / 8.8 / 8.8 / 8 (inside; scrolls) |
| Panel inner cards | 1 px border, filled, 12 px radius | none |
| Panel headings | Workspace, Edits | Work location, Project, Folder, Edits |
| Focus after Escape (all four viewports) | `<body>` | the entry |
| Focus after choosing a project | n/a (separate popover) | the chosen option |
| Band after choosing a project | unchanged (the project showed only in the composer) | names the project |
| Send after preparation (wide) | only `POST …/runs` | only `POST …/runs`; no create, bind or candidate |
| Horizontal overflow, every step | 0 | 0 |
| Enter on the focused entry | opens | opens |

Screenshots, same names in [before/](before/) and [after/](after/), each at
`wide` (1440×900), `narrow` (390×844), `zoom200` (720×450 at 2× density) and
`dark` (1440×900):

| Suffix | What it shows |
|---|---|
| `-01-home` / `-01-band` | Home, and the band close up |
| `-02-project` | Choosing a project: the popover before, the panel after |
| `-03-panel-empty` | The panel with no folder |
| `-04-panel-staged` | The panel with a folder staged |
| `-05-panel-prepared` | The panel after Start private candidate |
| `-06-home-prepared` / `-06-band-prepared` | Home and the band after the panel closes |

The `wide` set also has:
- `wide-07-chat` / `wide-07-chat-band`: the prepared Chat opened from Recent,
  with no Run.
- `wide-08-chat-panel`: that Chat's panel.
- `wide-10-after-send`: the view after Send.

## Tests (production controller + real card)

[checks.txt](checks.txt) has the commands and totals.

`prepare-lifecycle.test.mjs` now passes `project` and `projectChoice` exactly
as `app.mjs` builds them, and gains three tests over `createHomePreparation`
and `createWorkspaceCard`:
- **One panel.** Project and folder are chosen in one panel, project first. A
  project choice stages no folder and sends nothing to the Host. Focus stays
  on the chosen option. New project goes through its owner.
- **Lost create reply.** With a create's reply lost (unknown outcome), every
  project choice, New project and Remove are disabled, with the reason shown.
  Check status settles it. The chat was made in the project chosen before the
  loss, and afterwards the project is shown as fixed. One create in total.
- **Refused folder.** A definitively refused folder is corrected on the same
  chat. The project is not offered again, and the corrected chat keeps it.

`workspace-card.test.mjs` adds the entry projection (labels, accessible names,
no permission words) and the Send-in-flight lock. Three source pins that
encoded the old vocabulary were rewritten to the new invariants. None was
relaxed: `entry-audit`, the band-wiring pin and `composer-access-placement`,
whose project line now yields to the band.

The results:
- The 15 owner and adjacent suites pass 115/115.
- The five lints and the contrast report pass.
- The full suite gave 1332/1333. Its one failure was a fourth outdated pin in
  `home-scope.test.mjs`, now rewritten to the same invariant; that file passes
  5/5 alone.

**A note on test reach.** No test imports `app.mjs`. A leftover
`setAction($("home-create-project"), …)` stopped the whole page from starting,
and every suite stayed green; the first browser capture caught it. The browser
pass is therefore not optional for this surface.

## Not executed, and why

- **OpenAI computer use.** Not available to this author; Codex owns it. The
  PNGs here are author captures from headless Chrome and are not an accepted
  baseline.
- **Native 200% zoom.** The `zoom200` set emulates it by halving the CSS
  viewport at twice the density. It is not browser page zoom.
- **Screen reader, forced colors and reduced transparency.** Not run.
- **1280 wide, and Safari or a touch device.** Not run. The coarse-pointer 44
  px rule was exercised only through the narrow layout.
- **The native folder dialog.** Headless Chrome cannot drive it; the folder
  was entered through the path field.
- **The New project dialog in the browser.** The focus return after it is
  wired but was not driven in the browser.
- **Screenshots of the error and pending states.** The invalid-folder
  correction and the pending, unconfirmed and send locks are covered by the
  tests, not by screenshots.
- **Tab order through the panel.** Not recorded beyond open and Escape.
- **Known limits.**
  - On opening, focus goes to the folder's first command. In a bound chat
    that is Disconnect, so the panel scrolls it into view and the title
    scrolls out; see `wide-08-chat-panel`.
  - The narrow band is about 21 px deeper, the cost of a real 44 px target.
  - Close, "Which is which", Disconnect and Stop edits keep their existing
    28–30 px heights. They are shared controls outside this change.
