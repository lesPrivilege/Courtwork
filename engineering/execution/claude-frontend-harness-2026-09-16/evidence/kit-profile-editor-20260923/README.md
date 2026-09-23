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

## Delivery (author)

**Fixed product source: `a0bed5ab934f6a277713669fc0dad425f6001542`** on `claude/kit-profile-editor-20260923`, whose parent is the pre-edit record `9dd4dc7`, which in turn sits on `c91ff75`. The evidence commit follows the source commit. Nothing is merged or pushed.

Changed product paths, all frontend:

| Path | Change |
|---|---|
| `app/web/profile-editor.mjs` (new) | DOM-free controller with one slot per (Session, profile), holding base, draft, fresh, preview and save. It also exports the pure `editorReading` and `editEligibility` and the live adapter over the existing endpoints. |
| `app/web/profile-editor-view.mjs` (new) | A persistent panel per slot, updated in place. It covers source field, measure line, source-level refusals and reconciliation, decision area and preview readings. |
| `app/server/index.mjs` | Only the two exact static entries for the new modules. |
| `app/web/runtime-view.mjs` | `profileEditor` option; an `editing` set cleared on Session change; an **Edit source** action for an eligible row; the panel beside the bounded reader; `openResource(id, {edit})`, including the pending first-visit destination; owner facts (`activeRuns`, `revision`) shared after each snapshot. |
| `app/web/agent-chooser-view.mjs` | The Settings destination says **Edit … source** for the chat's own session-scope selection and **View** otherwise. |
| `app/web/app.mjs` | Creates the controller and view beside the page. A confirmed save refreshes the E1 Agent choice and the Workbench snapshot. |
| `app/web/styles.css` | `.profile-editor*` rules only, using existing tokens. |
| `app/tests/profile-editor.test.mjs` (new) | 17 controller seam tests. |

No Host, runtime, Store, API, schema, provider, native, package or Pages change. No missing Host seam was found. K4 plus the existing PUT and resource read were sufficient.

### Behavior as built

- **Eligibility (display only; the Host decides).** Edit is offered for an imported `agent_profile` selected at `{type:"session", id}` for this Chat, outside global Attention. Builtin, inherited and other profiles stay **View**. The managed-executor Chat gets the Host's actual `kit_runtime_unsupported` refusal on Preview.
- **Base.** `GET /runtime-resources/:id?sessionId` returns `{revision, resource, content}` together. The editor keeps the original id/kind/title/scope, the source hash, the exact bytes and the revision they were read at. v2 JSON is never regenerated.
- **Preview.** The request body is exactly `{expectedRevision: base.revision, profileId, content}`. A reply is shown only if it matches the submission: `preview:true`, `applied:false`, the same revision, Session and profile, and `draftSha256` equal to the sha256 of the submitted text. A newer request drops an earlier reply by epoch. Typing after a reply marks it **Outdated**. A preview in flight holds the action only for the same text. `runtime_conflict` re-reads, keeps the draft and holds the new reading apart (`fresh`).
- **Readings.** The editor shows Result (passthrough, compiled or refused), composition status and missing items, pins, executor and Kit compatibility, and candidate UTF-8 bytes against UTF-16 characters with the Host limits. It also shows `save.available`/`reason`, diagnostics, requirements, referenced sources, and tool permissions labelled **advisory**. Hashes and the candidate text sit behind the "Candidate context and hashes" disclosure. There is no candidate on refusal. The field's own counts (UTF-16 against UTF-8) sit under it. The 100000 limit is left to Host validation.
- **Save.** One `PUT /runtime-control?sessionId` carrying `{revision: base.revision, operation:"put", resource:{id,kind,title,scope,content}}`. The submitted text is frozen, and typing continues in the field. Success is confirmed only when the reply's resource hash equals the submitted sha256. Nothing is retried, queued, auto-selected or saved on close.
  - `runtime_conflict` keeps the draft and offers **Keep my text over the current source** or **Use the current source (discard my text)**.
  - `active_run` is shown as frozen. Save stays held until a fresh owner fact shows no active run: a Workbench snapshot, a preview with an open save gate, or **Check again**.
  - A lost reply is **unknown**. Save is held and one read-back runs. A matching hash says it "confirms the current saved bytes, not which request wrote them". A different hash is kept apart and never overwritten. If the read-back fails, the state stays unknown until **Check again**.
- **Scope beside Save.** A user- or workspace-scope source says that other chats selecting the profile use the saved text in their next runs. A session-scope source says it is saved for this chat only.
- **Save consequence.** A refused preview says the Host can still save valid JSON but runs will be refused. With no preview, the line says what Save does and doesn't check.
- **Continuity.** Drafts survive Settings ↔ Chat navigation, Escape and Session switches. They are in memory only; no reload persistence is claimed. The field node is persistent across Workbench re-renders, so its value, caret and scroll are kept, and focus is restored by focus key. Escape from Settings returns focus to the Agent control. Composer text, caret and Chat material are unchanged.

## Verification

Author checks on `a0bed5a`, independent of each other:

1. **Targeted:** `node --test tests/profile-editor.test.mjs tests/agent-choice.test.mjs tests/runtime-view-pending-open.test.mjs tests/settings-navigation.test.mjs tests/semantic-guards.test.mjs tests/kit-profile-preview.test.mjs`. Result **65/65**: [log](targeted-tests.log), [exit](targeted-tests.exit).
2. **Full app suite:** `npm --prefix app test`. Result **1660/1660**, exit 0: [log](full-tests.log), [exit](full-tests.exit). An earlier run (1659/1660) failed `semantic-guards` because the raw literal `"file-text"` was used as a class. The fix was a scoped `.profile-editor-candidate` class, not a ledger exception.
3. **Lints:** `node tools/lint-colors.mjs`, `lint-interaction`, `lint-materials`, `lint-spacing`, `lint-shapes`, `check-product-copy`, `check-semantic-consumers` and `contrast-report` all exit 0. `lint-shapes` output is identical to baseline.
4. **Real product journey:** [host fixture](host.mjs.txt) and [journey script](journey.mjs.txt). The fixture is `boot()` with temporary data and port 0, installed Pi 0.85.1, the loopback fake provider, and a synthetic Agents loopback for the managed Chat. The script drives headless Chrome through the installed Playwright. [Journey log](journey.log): **16/16 PASS**, `pageerror` none ([checks](browser/checks.json)). [Host receipt](host-results.json): provider requests **3**, which are the old Run, the held active Run and the new Run. Managed Agents posts **0**. The main Chat has 3 Runs, all completed; the other Chats have 0. [Request log](browser/requests.json).

| Scene | Evidence |
|---|---|
| Existing Chat with old Run → chooser **Edit** → focus in field, shared scope beside Save | [01](browser/01-editor-open-light-1440.png) |
| Preview compiled; candidate equals the Host's expected context; 0 writes, 0 Runs, revision unchanged | [02](browser/02-preview-compiled-light-1440.png) |
| Late reply for an earlier text lands after the newer one and is dropped | checks.json |
| Refused Kit: `source-missing … required`, no candidate, save consequence | [03](browser/03-refused-kit-light-1440.png) |
| Malformed JSON: `invalid_runtime_config` beside the source | [04](browser/04-malformed-light-1440.png) |
| Independent CAS change → `runtime_conflict`, draft kept, reconciliation choice | [05](browser/05-stale-config-light-1440.png) |
| Active Run: preview reports the freeze; Save → `active_run`, held; after completion nothing applied; Check again unlocks | [06](browser/06-active-run-light-1440.png) |
| Dropped Save reply + failed read-back → unknown, Save held, 1 PUT; newer typing separate | [07](browser/07-unknown-light-1440.png) |
| Check again → hash match confirms saved bytes; later typing marked unsaved | [08](browser/08-readback-confirmed-light-1440.png) |
| Saved user-scope source reaches the sibling Chat's composition | checks.json |
| Escape → same Chat, focus on Agent control, draft and caret 7/7 unchanged, material retained | [09](browser/09-return-chat-light-1440.png) |
| Send → new Run `kitContext.text` equals the previewed candidate, `sourceSha256` equals the draft hash; old Run context deep-equal | [10](browser/10-new-run-light-1440.png) |
| Managed-executor Chat → `kit_runtime_unsupported` | [11](browser/11-managed-refused-light-1440.png) |
| Keyboard: chip → ArrowDown → Tab → Enter lands in the field; dirty draft survives Escape and return | checks.json |
| Long/error dark 1440; narrow dark and light 390 | [12](browser/12-long-error-dark-1440.png), [13](browser/13-narrow-dark-390.png), [14](browser/14-narrow-light-390-actions.png) |

### Measured composition

[After](browser/measurements.json) and [before at `c91ff75`](before/before-measurements.json) ([script](before.mjs.txt), [1440](before/before-settings-light-1440.png), [390](before/before-settings-light-390.png)). All measurements use a fine pointer at text scale 1.

- **Before.** The chooser said *View*, and focus landed on the row title. The source was a read-only `pre` (12px/20.4px mono) inside the row's bounded reader, whose max-height is 320px. It was 591px tall at 1440 and 734px at 390, so it scrolled inside that reader. Row actions were 28px at desktop and 44px at 390, with 11.5px text.
- **After, 1440.** The editor is a sibling of the bounded reader at the full row measure of 778px. Its row gap is `--space-3` (12px). The field is 778×260 at `--text-meta` 11.5px mono with 17.25px leading; it is resizable vertically and has its own scroll. Preview and Save buttons are 66×30 and 92×30, with a 28px `--control` minimum and 12px text. Help text is 11.5px/18.4px.
- **After, 390.** The field is 324 wide. Preview and Save are 44px tall under the existing narrow/coarse fallback. There is no horizontal overflow in any scene.

The field reuses the Skill intake's monospace `--text-meta` role, not the recorded-source `pre` at 12px/1.7. This is intentional: it is an editing field, not a document reading. The candidate uses the new scoped `.profile-editor-candidate` (`--text-meta`/1.6 mono), because `.file-text` is a guarded glyph literal. Both are recorded for Astra's visual review rather than claimed as canonical.

### Not executed or limited

- Parent OpenAI computer-use rendered acceptance is **not** done. Author screenshots are candidates, not baselines.
- Not executed: native zoom/200% text scale, a screen reader, forced colours, reduced motion (no motion added), real touch/coarse pointer (390px ran with a fine pointer), and reload persistence (not implemented by contract).
- The late-reply and dropped-reply scenes are produced by Playwright request interception in the browser, not by a Host fault. The Host-side write still happened; only the reply was lost.
- The pre-edit record above planned the candidate on the `file-text` class; it was changed as stated. `engineering/design/agent-interface-2026-09-10/precedents.md` does not yet list this editor; syncing that index is left to Astra.
- An in-app browser tab was pointed at an earlier synthetic Host during development. That Host and all fixture Hosts are stopped; no user service, data, credential or paid provider was touched.

## Handoff

Construction has stopped. The finite writer is released for parent Astra's independent review and acceptance. This record does not merge, push, deploy, start a next slice or clean up another tree. The worktree `../courtwork-kit-profile-editor-20260923` is kept as is. Remaining owner work:

- Astra: independent rendered and computer-use acceptance, a decision on the visual role choices above, the precedent-index sync and integration.
- Scoped out by the order and still open: Kit creation/acquisition, runtime selection, scope changes and structured editing.

## Return R1 · pickup (before product edits)

2026-09-23 · This return consumes [Parent review](../kit-profile-editor-review-20260923/README.md) at main `86847b2` (the file lives on main, not in this tree) and the correction lease in the original order. The same tree and branch are used; the candidate was clean at `756ec6d`. There are no other writers here. The ended E1/K4 trees are untouched.

| Finding | Disposition | Owner / symbols | Planned change |
|---|---|---|---|
| K5-R1 | adopt | `profile-editor.mjs` `editorReading`/`observe`/`preview`/`save`/`check`; `profile-editor-view.mjs` `update`/`renderPreview`/`setFacts`; `runtime-view.mjs` `shareFacts` | The controller keeps the latest owner facts per Session: revision, active runs, and the one editable profile id, derived with the existing `editEligibility` from the Workbench snapshot. A newer known revision makes any preview a *previous reading*; Preview/Save wait for an explicit fresh read. A slot whose profile stops being this Chat's selection is **suspended**: its text stays readable and recoverable, the field is read-only, and Preview/Save/Revert are unavailable. It resumes only through an explicit fresh read while eligible again. No new registry or token. |
| K5-R2 | adopt | `profile-editor.mjs` `save` | Capture text, revision and metadata and set `saving` synchronously before `sha256Hex`. Every outcome settles it. Unknown keeps its read-back gate. |
| K5-F1 | adjust | `styles.css` `.profile-editor textarea`, `.profile-editor-candidate` | Source becomes `--text-body` at 1.5 leading; candidate becomes `--text-reading` at 1.6 leading. Both stay monospace. The scoped class is kept, as adopted. |

The Host remains the authority. CAS already prevented stale commits; these are decision-reading and scope fixes.
