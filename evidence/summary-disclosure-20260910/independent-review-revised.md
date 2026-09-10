# Independent static review — production surface at `a432f09`

- Reviewer: Luna, non-author, bounded static review only.
- Fixed product: `a432f09d546bbd6ded3ea840e096321ba3e19d3b` (`a432f09`).
- Checkout: `/Users/lesprivilege/.codex/worktrees/8802/Courtwork`, branch `codex/summary-disclosure-r2`.
- Scope: production host/session surface, summary projection, tab/navigation wiring, static routes, and the required targeted checks. No product files were changed by this reviewer.
- Data boundary: synthetic/local-fake checks only; no personal credentials, personal data, paid provider, migration, deploy, or external message.

## Review result

The fixed `a432f09` source has no blocking static or architecture finding in the reviewed paths. The 38 targeted product tests, 13 bounded shell/architecture tests, syntax checks, interaction/color/contrast lint, and whitespace check all passed. The findings below were uncovered by source inspection at that SHA; they were not covered by the existing unit assertions.

### P2 — expanded header action was announced as “Open” while collapsing the surface

In the ≥1680 three-pane state, the chat column remains present, so `show-surface-button` remains visible. At `a432f09:app/web/app.mjs:3710-3713`, its accessible label was selected as `Open work surface` whenever `expanded` was true. The same button's handler at `a432f09:app/web/app.mjs:6272-6275` calls `openSurfaceRail()` in that state; `a432f09:app/web/app.mjs:3585-3591` leaves the surface open and changes it to the collapsed card rail. The announced action therefore did not match the resulting action for keyboard or assistive-technology users. The 1024–1679 view-switch header is hidden by `a432f09:app/web/surface-layout.css:36-50`, so this finding is specific to the expanded desktop header.

The parent author applied a local follow-up label change to `Collapse work surface` after this fixed-SHA review. That follow-up was outside `a432f09` and was not independently re-tested here.

### P2 — compact strip could omit the Run entry before a Run identity was selected

The Run summary deliberately falls back to the most recent run when no surface run is selected: `a432f09:app/web/app.mjs:3894-3898`. In the compact desktop strip, however, `a432f09:app/web/app.mjs:3919-3923` filtered every module through `module.adapter(facts)`. The Run adapter returns `null` when `facts.runId` is absent (`a432f09:app/web/surface-modules.mjs:124-148`), so a fresh session with available `facts.runs` could render the summary card's Run object in the ordinary rail but omit the Run glyph from the strip. The strip threshold is computed at `a432f09:app/web/app.mjs:3620-3625`; this affects the dense desktop presentation under the live width threshold and removes the compact entry point for the primary Run object.

The parent author applied a local follow-up using the same `runSummarySnapshot()` fallback for strip presence and guarding the click against session/generation/run changes. That follow-up was outside `a432f09` and was not independently re-tested here.

## Static contract checks

The host keeps facts and navigation in `app.mjs`: `runSummarySnapshot()` selects the current or latest Run and passes only the UI generation to `projectRunSummary()` (`a432f09:app/web/app.mjs:3894-3903`); rail visibility, B/C view selection, `hidden`/`inert`, tab visibility, and panel modality are reconciled together (`a432f09:app/web/app.mjs:3641-3761`); Escape walks expanded → cards → closed (`a432f09:app/web/app.mjs:5898-5908`); tab activation and keyboard movement remain host-owned (`a432f09:app/web/app.mjs:6120-6157`). The module table remains a projection/intent boundary (`a432f09:app/web/surface-modules.mjs:1-24`).

The production entry loads the summary and surface layout styles (`a432f09:app/web/index.html:8-11`), and the server exposes them through the exact static allowlist (`a432f09:app/server/index.mjs:14-32`). The production CSS bounds the collapsed card layer, allows its own scroll, and lets the tab list scroll without pushing toolbar actions (`a432f09:app/web/surface-layout.css:7-34`, `:52-63`). No duplicate fixture authority or new production endpoint was found in the reviewed source.

## Checks run against an isolated checkout at `a432f09`

| Check | Result |
|---|---|
| `node --test tests/summary-disclosure.test.mjs tests/work-surface-tabs.test.mjs tests/settings-navigation.test.mjs tests/static-web-manifest.test.mjs` from `app/` | 38/38 passed |
| `node --test` for `architecture-boundaries`, `architecture-maintenance`, `chat-work-shell`, and `shell-layout` from `app/` | 13/13 passed |
| `node --check` on `app/web/app.mjs`, `summary-disclosure.mjs`, `summary-disclosure-projection.mjs`, `evidence/.../serve.mjs`, and `evidence/.../fixture.mjs` | all passed |
| `node tools/lint-interaction.mjs` | passed |
| `node tools/lint-colors.mjs` | passed |
| `node tools/contrast-report.mjs` | passed |
| `git diff --check` | passed |

An isolated copy of the then-current evidence server also started with `SD_FIXTURE_LONG=1` and exited cleanly on controlled `SIGTERM`; this is fixture smoke evidence, not production-host acceptance.

## Visual and browser boundary

This reviewer had no available browser surface (`browsers: []`) and performed no CUA operation. The parent's current-SHA captures (`product-directory-390-light.png`, `product-summary-1440-light.png`, `product-files-1280-light.png`, and `product-three-pane-1680-dark.png`) were treated only as supplied context, never as independent visual acceptance. Existing `cua-steps.json` and `state-checks.json` identify the superseded `2111375` candidate and were not counted as evidence for `a432f09`. Native desktop, keyboard, long-text, light/dark, and responsive visual acceptance therefore remain outside this independent static review.

## Final static delta review at `1ab7f44`

1. **PASS — Run projection and compact-strip entry.** At the final SHA, the strip uses the same `runSummarySnapshot()` latest-run fallback as the summary card (`app/web/app.mjs:3924-3982`), while the Run adapter still fails closed when no run identity exists (`app/web/surface-modules.mjs:124-148`). The strip click rechecks generation, session, and Run identity before opening. The final `selectSession` follow-up (`app/web/app.mjs:1425-1427`) also restores the active session's surface rail before `renderAll()`.
2. **PASS — Header and document close semantics.** Expanded visibility assigns the header action `Collapse work surface` and hides that duplicate control while the surface is expanded (`app/web/app.mjs:3728-3744`); the event wiring preserves the same control contract (`app/web/app.mjs:6078-6087`). The document tab keeps its own selected and close controls (`app/web/index.html:675-698`), with the full path retained as its label/title (`app/web/app.mjs:3791-3811`).
3. **PASS — Maximize is geometry-only.** `toggleSurfaceMaximized()` only guards the expanded desktop state, records reading geometry, toggles layout state, reconciles visibility, and restores message rendering (`app/web/app.mjs:3432-3441`). It does not dispose, pause, or reload the active renderer; those lifecycle actions remain on their existing close/activation paths.
4. **PASS — Long file paths remain openable.** Summary file rows display basename and parent separately, constrain both with `minmax(0, 1fr)` and ellipsis, and retain the complete path in the open action's accessible name and `title` (`app/web/summary-disclosure.mjs:231-269`; `app/web/summary-disclosure.css:76-122`). The existing targeted assertion covers the full-path title.
5. **PASS — Production boundary and checks remain clean.** The evidence server still serves exact production UI bytes and uses only a synthetic config endpoint plus a raw upstream response pipe (`evidence/summary-disclosure-20260910/serve.mjs:1-37`); no fixture injection or replacement path was found. The final targeted suite passes 38/38, and the bounded syntax checks plus `git diff --check` pass at `1ab7f442061bef261d11eff729a93e9741bf5cbc`. This is static acceptance evidence only; browser/visual acceptance remains unavailable because no browser surface was provided.

### Final CSS delta review: `1ab7f44` → `1c4138b`

**PASS — bounded visual-material correction.** `summary-disclosure.css` adds existing tokenized radius, horizontal hit-area padding, and hover/pressed states to the native summary trigger, insets file preview rows, and preserves the full-path/ellipsis contract; `surface-layout.css` adds the existing `--rim` to the floating rail shadow. Static inspection found no blocker; no browser or full tests were run for this bounded delta.
