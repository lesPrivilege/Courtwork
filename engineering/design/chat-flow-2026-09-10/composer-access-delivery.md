# P1 Composer Access relocation · delivery record

Task: move Home file access and existing Chat access controls into the composer’s left context, so the usual Home/projectless surface no longer spends a separate row on an actionable setting.

Base SHA / branch: `7e1a1ff047721e1ca6c871deba7f367ccea55a06` / `codex/composer-access-20260914`, isolated worktree `/tmp/courtwork-composer-access-20260914`.

Writer: Luna. Independent reviewer: `/root/explore` (assigned; result pending). User performs the browser visual check.

Owner facts: Home permission is held by `app/web/app.mjs` (`state.homePermissionMode`, `renderHomeComposerContext`, Home draft persistence and `submitHomeRun`); an existing Chat uses the Session `permissionMode`, existing `/permission-mode` update path, and `openConnectionCard`. This slice changes only the static UI placement and styles. It preserves both DOM IDs, labels, listeners, state owner, Session API, and Floating UI anchor.

Semantic / placement: per the P1 contract, the composer contains actionable context for the next execution; below it, only the already-bound Project fact remains. File access stays in the left context beside files and Workspace; model/effort and Send/Stop stay on the right. No permission semantics or Run/Harness behavior changes.

Affected rules: UX-02 (permission remains visible/discoverable near the action), UX-03 (native select and button retain their existing control semantics), UX-07 (remove a redundant row without creating an inner permanent row). No cross-layer change is needed.

Nearest implemented precedent: `engineering/design/agent-interface-2026-09-10/precedent-map.md` → `composer`; `app/web/index.html` → `.composer-context` for files/Workspace and `.composer-buttons` for Model/Send; existing `permission-settings-button` opens the connection/access card through `anchorPopover`. This is an implemented structural precedent, not a new accepted visual baseline.

Kept relationships: Home retains native `select#home-permission-input`; an existing Chat retains `button#permission-settings-button` → existing connection/access card. The Project name remains outside the composer as a bound fact. Home, projectless Chat, and Work Chat retain their current visibility and permission state behavior.

Intentional changes: move `#home-composer-context` and `#permission-settings-button` under `.composer-context`; make `#composer-below` contain only `#composer-project`; replace the contradictory active WK-12/WK-55 placement comments with the adopted rule. Long control labels may clip visually only within a constrained narrow composer control; their option/button accessible names and disclosure surface retain the full value. Send remains a fixed hit target and the composer controls remain a single row.

Fixture: Home with attachment, selected Workspace, and `Ask before editing`; existing Chat with file attachment, full File access label, and a long model/effort name; projectless and bound Project variants. No personal data or provider run required.

Validation plan: a focused DOM/CSS contract test, `node --test app/tests/composer-access-placement.test.mjs`, and `node tools/lint-interaction.mjs`. Viewport layout targets are 390, 768, 1024, 1199, and 1200 CSS px. User visual review covers light/dark, keyboard, long model, 200% zoom, pending/waiting/completed permission availability, and the ordinary complete composer scene. Author does not claim browser visual acceptance.

## Author result · 2026-09-14

Changed paths for this slice: `app/web/index.html`, `app/web/styles.css`, `app/tests/composer-access-placement.test.mjs`, and this record. The shared `app/web/app.mjs` working-tree diff belongs to the already-present Copy P0 work and was not edited for P1.

Implementation: both access controls now live in `.composer-context`; the right-side model/effort and Send/Stop controls remain under `.composer-buttons`; `#composer-below` now contains only `#composer-project`. The stylesheet declares the outer controls and left context non-wrapping across breakpoints; narrow permission labels can shrink while their accessible names/disclosure still expose the full value. The existing Home/session hide conditions, Home `state.homePermissionMode` update, Session permission route, and anchored card listener remain in `app.mjs` untouched. The project fact keeps its existing Home/session/name visibility conditions and the empty below-row rule still hides the container. Actual computed fit still needs browser verification.

Checks run:

- `node --test app/tests/composer-access-placement.test.mjs app/tests/composer-field.test.mjs app/tests/settings-navigation.test.mjs` — 16/16 passed, including three new source-contract cases for placement/IDs, existing state owners, single-row responsive CSS, and narrow touch target.
- `node tools/lint-interaction.mjs` — passed (48 files, no registered exceptions).
- `git diff --check` — passed.

Known check limits:

- `node --test app/tests/permission.test.mjs` could not load because this isolated worktree has no installed `@earendil-works/pi-ai` dependency (`ERR_MODULE_NOT_FOUND`). The placement work does not modify its owner/API; this backend-facing test was not counted as passed.
- `node tools/check-doc-links.mjs` reports nine unresolved links from the pre-existing `engineering/current.md` and P1 input record (including the referenced Copy/Run delivery notes absent from this checkout). It reports no issue in this delivery record; unrelated missing targets were not fabricated or changed.
- No browser/screenshot run was performed. The 390, 768, 1024, 1199, and 1200 widths, long model name, light/dark, keyboard interaction, and 200% zoom still need the user's visual check. The CSS contract test is not a computed-layout or visual acceptance.

Independent review: `/root/explore` has reviewed the first diff and found no owner/semantic blocker; final independent result is pending after its test run. User visual acceptance is pending. No commit, main integration, push, or deployment was performed.
