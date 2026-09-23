# K5 · Selected-profile editor · author record

2026-09-23 · Claude (original frontend owner) under [K5](../../kit-profile-editor-20260923.md). Parent Astra owns architecture, independent acceptance and integration. This is the author's record; it does not claim acceptance.

## Pickup facts (before product edits)

- Persistent checkout `Courtwork` on `main` at `c91ff759bd6ed315c9f3e2eef709d6c792420b71`, equal to `origin/main` after fetch. Its only untracked files are `.agents/`, `.obsidian/` and `skills-lock.json`, which belong to the user and are left untouched.
- Worktrees at pickup were `Courtwork` (main) and `Courtwork-legacy-frozen` (detached `f9ade85`, read-only). No other product writer tree existed. The ended E1/K4 trees were not revived.
- New isolated tree: `../courtwork-kit-profile-editor-20260923`, branch `claude/kit-profile-editor-20260923`, created from `c91ff75`. Dependencies were installed there with `npm ci` from the unchanged lockfile. No package changes.
- No listening Courtwork Host was found. User service `8787`, user data and credentials are not used. All checks use `tests/helpers.mjs` `boot()` temporary data directories, port 0, installed Pi `0.85.1` and the loopback fake provider.

## Responsibility, owners and cross-layer reason

| Responsibility | Owner (unchanged) | Consumer added here |
|---|---|---|
| Saved source, whole-config revision/CAS, active-run freeze | Runtime Control `PUT /runtime-control` `operation:"put"` (`app/server/service.mjs` `changeRuntimeControl`) | Editor Save sends original `{id,kind,title,scope}` + exact text + the revision its source was read at |
| Unsaved semantic preview | K4 `POST /runtime-control/preview-profile` (`previewRuntimeProfile`) | Editor Preview sends exactly `{expectedRevision,profileId,content}` |
| Current source bytes + revision | `GET /runtime-resources/:id?sessionId` (`getResource` → `{revision,resource,content}`) | Editor base read and explicit read-back |
| Eligibility / selection | Host (preview refusals); snapshot `profileSelections` | Edit action is offered only for the imported profile explicitly selected at this Session's scope; the Host still decides |
| Next-run selection reading / Send expectation | E1 `agent-choice.mjs` controller | Refreshed after a confirmed save |
| Recorded Run context | K3 `GET /runtime-context?sessionId&runId` | Unchanged; read to verify old/new Run |

No Host, runtime, Store, API, schema, provider or native file changes. The cross-layer edits are all frontend: a new DOM-free controller and view, their static entries in `app/server/index.mjs`, wiring in `app.mjs`, the Settings row hook in `runtime-view.mjs`, the chooser destination label in `agent-chooser-view.mjs`, and scoped CSS. The existing surfaces could inspect sources and create v1 packages, but they had no edit → preview → save journey for a selected v2 profile.

## Nearest implemented precedents (fixed SHA `c91ff75`)

- `app/web/agent-choice.mjs` `createAgentChoiceController`: frozen submitted draft, epoch-discarded late replies, `runtime_conflict`/`active_run`/lost-reply handling with read-back and compare. The editor controller follows the same outcome vocabulary.
- `app/web/agent-chooser-view.mjs` `renderPopover` → `openSettings(id, trigger)`: the Settings destination. It currently says **View**, because no editor existed (E1-F1).
- `app/web/runtime-view.mjs` `resourceRow`, `rowActions`, `inspectSource`, `sourceInspector`, `openResource`, `render` (focus-key restore and `holdsTextEntry` polling skip). `renderPackageEditor` creates v1 packages and is **not** reused for editing, because it would regenerate JSON and drop `kits`.
- `app/web/runtime-intake.mjs` `field`/`view` + `.runtime-intake*` CSS: the flat Settings editor anatomy (label, multiline field, form help, actions, inline error). This is the visual precedent for the source field.
- `app/web/ui-controls.mjs` `el`; existing `text-button`, `quiet-button`, `primary-button`, `form-help`, `inline-error`, `data-list` classes.

## Grammar and role mapping (planned; measured values recorded below after construction)

Affected rules: UX-01/02/03/04/06/07/08/09. Surface roles are as follows:

- **Chrome.** The row title and the Edit/View actions reuse the existing `runtime-row-actions` `text-button`s at `--control` (28px), with the existing narrow/coarse 44px fallback.
- **Reading/review.** The source field and preview use the `.runtime-intake-field` anatomy. The text is monospace at `--text-meta`, matching the Skill intake precedent. Preview readings use `data-list`, with the candidate text in `file-text` inside a disclosure.
- **Action/decision.** Preview uses `quiet-button` and Save uses `primary-button`. The scope sentence, the save gate and any unknown or conflict state sit directly beside Save. Hashes and the candidate body are behind a disclosure.

Spacing uses the existing `--space-2/3/4` tokens. No new tokens, colors, radii, shadows or motion.
