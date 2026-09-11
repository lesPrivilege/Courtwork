# Motto diff and CourtWork UI handoff — 2026-09-11

Bounded research for the parent thread. This file records source evidence only; no CourtWork source was edited.

## Fixed source identity

- Motto checkout: `/Users/lesprivilege/Projects/Motto`
- Motto origin: `https://github.com/lesPrivilege/motto.git`
- Fixed source commit: `a510036ec0ba2a55bbd41bfb8313debd14588fc2` (`HEAD -> motto/main`, 2026-09-09, `docs(maintenance): record controlled Pi upgrade to v0.85.1 — MOTTO-UPGRADE-4 落账`).
- Fixed tree: `f4f36517de7d5d0f9e915f8d3d0d367729e1f15c`.
- Relevant blob IDs at that commit:
  - `packages/coding-agent/src/modes/interactive/components/diff.ts` → `54e88273df85df15837b6ef859d672d3f24e2748`
  - `packages/coding-agent/src/core/tools/renderers/edit.ts` → `6db55567109f8efc388fb0782b951b3678c8dea6`
  - `packages/coding-agent/src/core/tools/edit-diff.ts` → `c79f5eb7b360c0f32c7ed1bb09d8483494b61ade`
  - `packages/coding-agent/src/modes/interactive/theme/theme.ts` → `23f519310ddf7822ec7bbc78f4c6808284a08b39`
  - `packages/coding-agent/src/modes/interactive/theme/theme-schema.json` → `62c3c509fc639ee72da2f115d2c870cdd15f4185`
  - `packages/coding-agent/src/modes/interactive/theme/dark.json` → `3f4c698a71dc3dde81df7dff9b0b4a026f6e9a51`
  - `packages/coding-agent/src/modes/interactive/theme/light.json` → `20f67835a911af7c33feaab76f8da0657919e085`
- `origin/motto/main` currently resolves remotely to `871c0aecfaf75f93c517e59ad37d3756d16042ec`; use the fixed local commit above for reproducible source references. `/Users/lesprivilege/Projects/motto-dsh` at `99f6f02` is a separate DeepSeek harness fork and is not Motto authority.
- Motto worktree has an unrelated untracked `scripts/diag1180.mjs`; preserve it.

CourtWork working state inspected before research: `/Users/lesprivilege/Projects/Courtwork`, branch `main`, HEAD `26d949b7a24b06b3280b0a3d19f721a76b9b5aef` (`docs: register deferred Chat Attention snapshot`). It has unrelated existing modifications/untracked paths; preserve them.

## Motto diff facts

`packages/coding-agent/src/modes/interactive/components/diff.ts:1-147` is the display renderer. It parses `+/-/space + line-number + content` (`:8-12`), replaces tabs with three spaces (`:14-19`), colors context/deletion/addition with `theme.fg("toolDiffContext"/"toolDiffRemoved"/"toolDiffAdded", ...)` (`:89`, `:124-142`), and groups consecutive removals before additions (`:94-111`). Intra-line highlighting uses `Diff.diffWords`; it is intentionally enabled only for exactly one removed line plus one added line (`:113-125`), strips leading indentation from inverse highlighting (`:37-54`), and uses terminal `theme.inverse` on changed words (`:45`, `:57`). Multi-line replacements are shown unchanged (`:126-133`). `RenderDiffOptions.filePath` is explicitly unused (`:68-71`). This is display semantics only: context / removed / added, with no approval or review-state meaning.

`packages/coding-agent/src/core/tools/renderers/edit.ts:9-15,87-149` is the only current renderer consumer found. Both the edit preview body (`:141-149`) and a differing settled result (`:108-111`) call `renderDiff`; preview headers use separate pending/success/error background slots (`:115-129`). `packages/coding-agent/src/core/tools/edit-diff.ts:364-499` emits a line-numbered display diff from `Diff.diffLines`, with default four context lines and `...` elision; `:510-543` computes that diff before execution for TUI preview. This source does not provide a browser renderer or a CourtWork semantic projection.

Motto theme evidence: `theme-schema.json:74-76,239-249` requires `toolDiffAdded`, `toolDiffRemoved`, `toolDiffContext`; dark/light JSON map them to green/red/gray. `theme.ts:202-230` emits ANSI foreground/background (`38;2`/`48;2` in truecolor, `38;5`/`48;5` in 256-color); `:323-333` resets with `39/49`; `:347-349` defines `inverse` as chalk reverse-video. `createTheme` (`:528-545`) has only these background keys: `selectedBg`, `searchMatchBg`, `userMessageBg`, `customMessageBg`, `toolPendingBg`, `toolSuccessBg`, `toolErrorBg`. There are no dedicated diff background tokens. Therefore do not port Motto ANSI code into the browser and do not treat inverse as a portable semantic color role.

Historical reference only: Motto commit `5117187362fad23752b0c6c512e0717bcf05cb79` introduced the intra-line renderer; commit `c75f53f6f220e9c736126f823cc9cd2b46be92f7` used `diffLines` + two context lines + chalk red/green/dim. These are references, not CourtWork implementation contracts.

## CourtWork diff and Settings entry points

- Contract: `docs/work-core/contract.md:89-93` defines backend `file-diff` as deterministic `codepoint-prefix-suffix-v1` replacement `{offset, removed, inserted}`, with final-newline flags and limits. `docs/reading-marks.md:18` explicitly distinguishes byte comparison from semantic diff.
- Route only: `app/service.mjs:1452-1455` routes `file-diff` to `workCore`; no current browser file-diff consumer was found.
- Current inspector: `app/web/inspector.mjs:320-470` renders recorded/current files as Markdown/plain `<pre>` and reports hash relation; no `file-diff` request or shared diff renderer.
- Current Settings preview: `app/web/settings-view.mjs:1906-1948` (`appearancePreview()`) hardcodes one `notice.md` code block and four `.diff-line` rows (`data-diff="same/add/del"`) plus one real `flowRow`-shaped Chat Flow row. `app/web/styles.css:5298-5344` styles `.diff-line`; add uses `var(--success-soft)` + `var(--success)`, delete uses `var(--danger-soft)` + `var(--danger)`, and visible `+`/`−` markers remain present. `savePrefs`/`renderAppearance` around `settings-view.mjs:2120-2360` rerender the same preview for appearance changes. This is semantic change display, not approval/rejection state.
- Minimal first implementation target: add a pure CourtWork semantic row projection plus DOM renderer (e.g. `app/web/diff-view.mjs`), then make `appearancePreview()` consume it. Keep the existing marker and role-token semantics. A future real file-diff pane can adapt the backend contract to that projection, but it is outside this serial slice. Motto's TUI renderer should remain a source reference, not a direct dependency.

## Current Chat / work-surface tabbar entry (for the later serial task)

CourtWork does not currently have a separate top-level Chat tabbar. The nearest actual tabbar is the expanded work-surface strip:

- DOM: `app/web/index.html:608-682` puts `#surface-back-button` (visible text `Chat` in view-switch mode) beside `#surface-tabs` (`role="tablist"`, `aria-label="Work surface views"`). Current type tabs are Workspace (`:627-636`), Work (`:637-647`, hidden until a run), File (`:648-658`, hidden until a file), plus at most one closable document tab (`:659-681`).
- Registry: `app/web/surface-modules.mjs:467-480` keeps surface module order `[run, file, workspace, runtime]`; only modules with `tabId` become panes/tabs (`app/web/app.mjs:3515-3529`).
- State/render: `app/web/app.mjs:3706-3837` derives open/expanded/view-switch state, sets `hidden`, `inert`, `aria-hidden`, `aria-selected`, roving `tabIndex`, and renders the Chat return control at `:3792-3803`; `:3804-3825` hides unavailable tabs and chooses the surface title.
- Interaction: `app/web/app.mjs:6227-6263` binds clicks to `activateSurface`, document close/back, and ArrowLeft/ArrowRight/Home/End roving within visible role tabs; Delete/Backspace closes the document tab only. `activateSurface` is at `:4080-4100`.
- Skin/layout: `app/web/styles.css:1634-1705` defines the strip, underline-selected type tabs, and separate document select/close hit areas; `app/web/surface-layout.css:55-62` lets the strip scroll while preserving header actions.

This existing surface tabbar is a work-surface object switch, not a Chat/Attention navigation model. Keep that distinction explicit when the later Chat tabbar task is commissioned.

## Screenshot correction: shipped custom Motto mono mapping

The fixed commit also contains the actual Motto brand theme pack under `packages/motto/extensions/motto-themes/`; this is the relevant source for the supplied screenshot, and it supersedes any inference from stock `coding-agent` `dark.json`/`light.json` (those stock themes remain green/red/gray).

- Pack introduction commit: `cda0c3f2a957444080c2cbb60cbef51fa5e27635` (`2026-08-12`, `chore(motto): import Motto product content ...`). The three JSON files are unchanged from that import through fixed commit `a510036...`; only README deployment-path wording changed later.
- Fixed-commit blob IDs:
  - `packages/motto/extensions/motto-themes/motto.json` → `be8b12b876c8a8a52de8dfaf8016f562d00f9d18`
  - `.../motto-dark.json` → `46d9a0fb4d3996e3a304aad6673d2863da642973`
  - `.../motto-light.json` → `9a4bb2c4be26f2dcdf3947b296fb75c5793c433b`
- `motto.json` and `motto-dark.json` define `bg #26282b`, `text #f2f3f4`, `accent #c0453e` (dark red), `dim #a8adb2`, `dimmer #5c6166`, `mid #8a9095`; `motto-light.json` flips bg/text, uses `accent #b03a34`, `dim #5c6166`, `dimmer #b8bdc2`, and keeps `mid #8a9095`.
- All three custom themes map exactly: `toolDiffAdded: accent`, `toolDiffRemoved: mid`, `toolDiffContext: mid`. Thus additions are the one accent/dark-red channel while removed and context are the same gray channel. `diff.ts` retains literal `+`/`-` prefixes (`:124-142`) and applies `theme.inverse` only to changed words (`:45`, `:57`), matching the screenshot's ± plus local reverse-video word segments.
- Pack README (`packages/motto/extensions/motto-themes/README.md:1-35`) calls these the canonical three JSONs, says the five primary slots are `bg/text/accent/dim/dimmer` plus `mid`, forbids new hues, and deploys to the theme directory (`~/.pi/agent/themes/`); auto setting is `motto-light/motto-dark`. `packages/motto/extensions/REGISTRY.md:14,26-27` records the pack as SHIPPED and the theme directory as a separate deployment position.
- Custom loading is repo code: `packages/coding-agent/src/cli/startup-ui.ts:50-87` loads resolved theme resources and registers them before `initTheme`; `packages/coding-agent/src/core/resource-loader.ts:865-939` reads JSON theme paths. No personal external theme or credential store was inspected.

Implementation implication for CourtWork: the supplied screenshot corresponds to this shipped custom pack, so a CW browser projection should preserve grayscale context/removal, one dark-red accent for additions, visible ± markers, and local changed-token emphasis. The stock built-in green/red mapping is not the target visual reference.
