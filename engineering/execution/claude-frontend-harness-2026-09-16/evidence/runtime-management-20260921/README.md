# 06c · Runtime management · author packet

2026-09-21 · Claude (Opus), frontend author. Order: [06c Runtime management](../../06c-runtime-management-20260921.md), under [order 06](../../06-agents-frontend-first-20260920.md).

**Status: RM-R1, RM-R2 and RM-C1 returned and corrected; released for Luna's delta review and Astra's integration decision. Not self-accepted, not integrated, not a backend or production claim.** See [Return RM-R1 / RM-R2 / RM-C1](#return-rm-r1--rm-r2--rm-c1). Source is the single commit at the tip of branch `claude-runtime-management-20260921` (parent: main `ff553e8`), in the tree `/Users/lesprivilege/Projects/.worktrees/courtwork-runtime-management-20260921`. The commit SHA is given in the handoff message and can be read from the branch tip; a commit cannot contain its own SHA. Nothing was pushed, deployed or merged. The persistent checkout, the user's 8787/8899 processes and data, and every other tree were not touched.

Delivery sections follow the pre-edit record: [what this delivers](#what-this-delivers), [running it](#running-it), [contract](#minimum-proposed-adapter-contract), [coverage](#required-cases-and-where-each-is-driven), [change record](#owner-and-precedent-change-record), [verification](#verification), [limits](#limits-and-unexecuted-cells), [observations](#observations-for-disposition) and [release](#writer-release).

## Pre-edit record

Written before any product edit, as the order requires.

**Source baseline.** Actual main `ff553e89ba26ba5e3db6b8ee6071bb3f7cc5bd93`. Tree `/Users/lesprivilege/Projects/.worktrees/courtwork-runtime-management-20260921`, branch `claude-runtime-management-20260921`.

**Owned files (new unless stated).**

| Path | Role |
|---|---|
| `app/web/runtime-management.mjs` | Controller: list/detail reads, per-runtime draft, commands with operation identity, reconciliation. No `fetch`, storage, clock or DOM. |
| `app/web/runtime-management-view.mjs` | View over one controller state. Settings anatomy only. |
| `app/web/runtime-management-contract.d.ts` | Minimum consumer projection and intents, each field mapped to its existing owner and marked *exposed* or *proposed*. |
| `app/tests/fixtures/runtime-management/{adapter.mjs,preview.mjs,index.html,specimen.css}` | Explicit synthetic adapter and the preview page. |
| `app/scripts/runtime-management-preview.mjs` | Read-only preview host, copied from `agent-profiles-preview.mjs`. |
| `app/tests/runtime-management.test.mjs` | Controller seam tests and view-driven tests (real view + real controller + fixture, under `tests/tiny-dom.mjs`). |
| `app/server/index.mjs` (one hunk) | Only if the static allowlist needs the two web modules. It does not expose Runtime management in production Settings. |
| This packet and the 06c order's author section. | |

Out of scope and untouched: `app/server/service.mjs`, store, runtime admission, native configuration, credentials, hooks, live Settings (`settings-view.mjs`, `app.mjs`, `index.html`), and the accepted `agent-profiles*` modules.

**Affected UX rules.** UX-01 (resident text must carry a decision), UX-02 (reasons, ownership and unknowns stay beside the action), UX-03 (buttons act, disclosures reveal, no fake switch for a command whose result is not yet known), UX-04 (command outcome in the affected area; no generic success toast), UX-05 (connection, admission, request in flight and outcome are separate facts), UX-06 (no Undo or retry without a contract; a confirmation only where the consequence is real — Disconnect), UX-09 (identity → state → actions → history → technical detail on demand). Frontend contract: requested/saved/effective/bound are not merged; unknown is not unavailable; an unavailable engine is not a permission decision.

**Nearest implemented behavior, reused rather than re-derived.**

| Need | Precedent | Reuse |
|---|---|---|
| List/detail controller with an injected adapter; per-object drafts; epochs that stop late replies landing on another object | `app/web/agent-profiles.mjs` (06a, accepted with AP-R1…R6) | Same shape and guards. |
| Whole-panel render with focus restored by `data-focus-key`; a focus chain for a control that disables itself; list anchor on return | `app/web/agent-profiles-view.mjs` | Same mechanism. |
| Lost reply → unknown outcome → a reconciling action that stays enabled while every mutation is locked; settled refusal recognised only by an explicit code | `app/web/home-preparation.mjs` (`uncertainFailure`, `SETTLED_MUTATION_REFUSALS`), `app/web/workspace-card.mjs` (`PREPARE_UNCERTAIN`) | Same fail-closed classification: an error is a settled refusal only when it carries a listed code; anything else is unknown. |
| Connect / Disconnect with a revision | `mcpLifecycle(id, { action, revision })` in `app/runtime/control-contract.d.ts`; `mcpStateLine` in `app/web/runtime-view.mjs` | Command vocabulary and revision precondition. |
| Active-run wording | `ACTIVE_RUN_SENTENCE` in `app/web/runtime-view.mjs` | Same rule: no "queued", no "applies when the run ends". |
| Settings anatomy | `settingsRow`, `.settings-block`, `.runtime-banner`, `.data-list`, `.settings-advanced`, `.runtime-row-actions`; preview frame from `tests/fixtures/agent-profiles` | No new shape, spacing, type, colour or icon family. |
| Configured versus bound execution | [control-plane precedent disposition](../../../../research/architecture-node-2026-09-13/control-plane-precedents-20260921.md) (OpenHands) and the [local-runtime ruling](../../../../research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#personal-credentials-hooks-and-browser-dogfooding--2026-09-20) | A disable changes the next admission; a Run keeps the binding it recorded. |

**Current facts versus proposed fields** (from Sonnet's bounded preflight, spot-checked).

- *Exposed today:* runtime identity is the adapter id (`service.mjs` `adapterId`), and a Run records it at creation (`store.mjs` `createRun` sets `run.adapterId`) — the bound fact exists. Runtime Control exposes a configuration-wide `revision`, an `activeRuns` count and `mcpLifecycle` with a revision. Provider credentials are connection-id keyed with status-only read-back.
- *Owned but not exposed (proposed here):* a per-runtime projection with configuration owner, connection state and identity, saved/effective admission for new work, per-runtime revision, supported actions with reasons, the list of Runs holding a binding, previous-connection history, and a command-status lookup by operation id. Owners: Runtime Adapter / RD-001 (identity, capability, lifecycle, connection), Runtime Control (admission for new work, revision, binding), Provider credentials / Models (the credential reference and its status), Tools / RD-009 (hooks — not consumed by this journey).
- No registry, persistence schema or secret store is created by this frontend. The synthetic credential reference is a label, not a secret or a verified authentication.

## What this delivers

One working **Settings → Agents → Runtimes** journey against an explicit synthetic adapter: list the runtimes, see who configures each and which agent uses it, connect one after reading what the connect writes and leaves alone, disable it for new work while a bound run keeps its recorded revision, reconnect or disconnect it without losing its identity, history or unsaved input, and recover from a refused command, a lost reply, a stale revision and late replies after navigation.

The controller and view are production modules behind a narrow injected seam, reusable by a later consumer. That does **not** promise that swapping in a production adapter completes backend integration: the contract below asks owners for facts they do not expose today. Pi, Hermes and Codex are labelled examples, not discovery. Nothing here starts a process, reads or writes native configuration, accepts or stores a key, calls a provider or touches live Settings, `service.mjs`, the store, runtime admission, credentials or hooks.

| Path | What it is |
|---|---|
| `app/web/runtime-management.mjs` | Controller. Per-runtime draft and command record; operation id per press; settled refusal only by listed code; `checkStatus` asks about that exact operation id; read and command epochs kept separate. |
| `app/web/runtime-management-view.mjs` | View. Settings anatomy only; focus restored by `data-focus-key` with a chain for controls that disable or disappear; caret and open disclosures survive re-render; Escape closes the Disconnect confirmation. |
| `app/web/runtime-management-contract.d.ts` | Minimum projection and intents, each field marked *exposed* or *proposed* with its owner. |
| `app/tests/fixtures/runtime-management/` | Synthetic owner (`adapter.mjs`: idempotent operation ledger, lost-reply, second writer, status lookup, trace), preview page and wiring. |
| `app/scripts/runtime-management-preview.mjs` | Read-only preview host, derived line for line from `agent-profiles-preview.mjs`. GET/HEAD only, `/api/` 404, no Host, store or data directory. |
| `app/tests/runtime-management.test.mjs` | 26 tests; 23 drive the real view and controller together under `tiny-dom`. |
| `app/server/index.mjs` | One hunk: the two web modules added to the static allowlist, because `static-web-manifest.test.mjs` requires every `app/web/*.mjs` to be served. It exposes no Runtime management in production Settings; nothing imports these modules there. |
| This packet, `browser/` and `logs/` | Author evidence. |

## Running it

```bash
CW_SPECIMEN_PORT=8961 node app/scripts/runtime-management-preview.mjs
```

Then open `http://127.0.0.1:8961/`. The port was free when checked; any free port works (`CW_SPECIMEN_PORT=0` picks one). The page's **Scenario** select switches the synthetic owner between `normal`, `empty`, `read-error`, `connect-refused`, `lost-reply` (the next command lands and its reply is lost), `stale-revision` (a second writer moves the runtime first), `stale-read-back` (the next command lands and the next reading is still the one from before it; added by the return) and `read-only`. **Slow replies** multiplies every delay by six for navigating while a command is out. **Reset preview** restores the seed. `globalThis.__runtimeManagementPreview.trace()` returns the owner's call and effect record.

To regenerate the browser evidence (headless Chrome with a throwaway profile, the composer-entry packet's CDP driver):

```bash
node engineering/execution/claude-frontend-harness-2026-09-16/evidence/runtime-management-20260921/browser/capture.mjs --app "$PWD/app" --out /tmp/rm-shots --profile /tmp
```

## Minimum proposed adapter contract

Only facts this journey reads. *Exposed* means an implementation already gives this consumer the fact; *proposed* means its owner has it in scope but exposes nothing yet. Missing exposure is not missing ownership.

| Fact (contract field) | Owner | Today |
|---|---|---|
| Stable runtime identity (`id`) | Runtime Adapter / RD-001 | **Exposed** as the adapter id (`service.mjs` `adapterId`). |
| Configuration and sign-in owner (`configurationOwner`, `ownership`, `authentication.owner`) | RD-001; Provider credentials for CourtWork-managed | Proposed. The ruling fixes the distinction; no projection. |
| Credential reference and its status (`authentication.references[]`, `status`) | Provider credentials, reached through Models | Status-only read-back is **exposed** per connection; the reference list here is proposed. Never key material. |
| Native next step (`authentication.nativeNextStep`) | RD-001 (adapter of that runtime) | Proposed. |
| Availability (`availability`) | RD-001 | Proposed. Unavailable is a device/installation fact, never a permission decision. |
| Connection state, identity, configuration (`connection`) | RD-001 | Proposed. Nearest command precedent: `mcpLifecycle({ action, revision })`. |
| Previous connections (`history[]`) | RD-001 | Proposed. |
| Saved vs effective admission for new work (`admission.saved`, `effective`, `effectiveReason`) | Runtime Control | Proposed. |
| Runs holding a binding (`boundRuns[]` with `bindingRevision`) | Runtime Control | A Run records its adapter id (**exposed**, `store.mjs` `createRun`); the per-runtime binding revision is proposed. |
| Agent profiles that choose it (`usedBy`) | Runtime Control | Proposed (profile composition is itself proposed in 06a). |
| Per-runtime revision and `savedAt` | Runtime Control | Proposed. A configuration-wide `revision` is **exposed**. |
| Supported actions with reasons (`actions`) | RD-001 for capability; Runtime Control for admission | Proposed. |
| Command (`CommandRequest`: `operationId`, `kind`, `expectedRevision`, `configuration`) → `CommandReceipt` | RD-001 / Runtime Control | Proposed. Same operation id twice must be one effect; `runtime_conflict` on a stale revision, never a merge. |
| Settled refusal codes (`runtime_conflict`, `action_unsupported`, `connect_refused`, `runtime_missing`) | same | Proposed. Anything else is treated as unknown. |
| Command status by operation id (`operationStatus` → confirmed / refused / not-applied / pending / inconclusive) | same | Proposed. No such lookup exists today. `not-applied` requires the owner to establish that the operation was not applied **and can never apply** (it closes the id); absence from a lookup is `inconclusive`, never `not-applied` (RM-C1). |
| Diagnostic facts (`facts`: version, protocol, capabilities, process) | RD-001 | Proposed. Disclosed on demand only. |
| Hooks, extensions | Tools / RD-009 | Not consumed by this journey. |

No registry, persistence schema or secret store is created, and the synthetic reference is not an authentication check. The whole contract is annotated field by field in `app/web/runtime-management-contract.d.ts`.

## Required cases and where each is driven

Every row is exercised through the real controller *and* view unless marked controller-only, and again in the browser record (`browser/shots/interaction-record.json`, steps named in the last column).

| Order case | Test (`app/tests/runtime-management.test.mjs`) | Browser step / capture |
|---|---|---|
| Empty / unavailable | "empty, loading, failed and refreshing lists are four different readings"; "an unavailable engine is not a permission decision and offers no connect" | `16-empty`, `17-read-error`, `15-unavailable-codex` |
| Native-owned and CW-managed auth references | "native-owned sign-in describes the step…"; "CourtWork-managed sign-in chooses a synthetic Models reference and never takes a key" | `04-hermes-connect-proposal`, `02-pi-connected-bound-run` |
| Connect success / failure | "connect shows what it writes before the command, then reads back…"; "a refused connect keeps the typed name and puts the keyboard back on Connect" | `05`, `06`, `13-connect-refused` |
| Committed mutation, lost reply, reconciliation | "a committed command whose reply is lost stays unknown, blocks every mutation, and Check status settles it without resending"; "an unknown outcome the owner never received settles as not applied…"; "an error without a listed code is never read as a refusal" (controller-only) | `09-lost-reply-unknown`, `10-lost-reply-reconciled`; trace: one `command`, `reply-lost`, one `status` with the same operation id, `open` |
| Duplicate click | "a double press sends one command, and the owner treats a repeated operation id as the same one" | — |
| Stale revision | "a revision changed elsewhere is refused, the draft is kept, and Reload shows the owner's values beside it" | `11`, `12` |
| Late list / detail / command reply after navigation | "a late list reply after opening a runtime does not navigate or land"; "a late detail reply for one runtime does not overwrite another runtime's page"; "a command reply that arrives after leaving lands on its own runtime only, and was never cancelled"; "a command confirmed while the list is on screen refreshes the list and keeps its rows" | step "late command reply after navigation": row said *still waiting*, Hermes' page text identical before and after Pi's reply |
| Disable with an existing bound Run | "disabling says what changes on the next admission and leaves the bound run on its recorded revision" | `03-pi-disabled-receipt` |
| Disconnect / history preservation | "disconnect removes only this connection; identity, history and unsaved input survive" | `07`, `08-hermes-disconnected-history` |
| Failure draft / focus retention | refused-connect and stale-revision tests above; "a draft survives leaving for the list and coming back" | `13`, `11`, `12` |
| Unsupported-action reason | "disconnect is unavailable while a run is bound, with its reason beside it"; "a host that cannot change runtimes gives each action its reason and sends nothing" | `14-read-only-reasons`, `03` |
| Keyboard / Escape / focus | "opening a runtime moves the keyboard to its way back, and Back returns to the same row"; "Escape closes the disconnect confirmation and returns the keyboard to Disconnect"; focus assertions in connect, disable, lost-reply, refused and reload tests | Tab order and every focus landing recorded, with `focusVisible` true below the sticky title |
| Preview identity | "every receipt, pending line and entry point carries the preview identity"; preview-host test | page banner in every capture |

## Owner and precedent change record

| Rule / relation | Kept | Changed or added |
|---|---|---|
| Settings anatomy (`settingsRow`, `.settings-block`, `.runtime-banner`, `.data-list`, `.settings-advanced`) | All reused; no CSS added outside the copied preview frame. | — |
| 06a controller guards (epochs, per-object drafts, saved vs draft, focus chain, anchor return) | Reused unchanged in shape. | Commands are keyed by operation id per runtime, not by an epoch: their replies are always recorded against their own runtime, and only touch the page of that runtime. |
| Lost reply → unknown → reconciling action (`home-preparation.mjs`) | Same fail-closed classification and the rule that the reconciling control is never locked. | The reconciliation asks about an operation id instead of re-reading a Session. |
| `ACTIVE_RUN_SENTENCE` (no "queued", no "applies later") | Same rule. | Worded for admission: `DISABLE_SENTENCE`. |
| UX-06 confirmation | — | Disconnect alone gets an inline confirmation (it ends a connection other agents rely on). Escape and Cancel return to Disconnect; opening it sends nothing. |
| UX-01 repetition | — | The full unknown-outcome explanation is said once, in the status region; each locked action carries a short "Locked until…" reason beside it (UX-02). |
| Accepted `agent-profiles*` modules | Untouched. | — |

Two defects were found only in the browser and fixed before delivery: native `append(null)` printed the text "null" (tiny-dom drops nulls, so the tests could not see it; the view now filters every optional child), and focus moved to the command status with `preventScroll`, which left it under the sticky section title (a move now scrolls into view, respecting the section's existing `scroll-padding-top`). Also caught in the browser: focus fell to `<body>` after Reload; the notice is now the landing point, and the regression was shown to fail on the earlier source (`logs/reload-focus-before.log`, exit 1) and pass after (`logs/reload-focus-after.log`, exit 0).

## Verification

All on the final source, Node v25.9.0, under `caffeinate -is`. Full logs with exit codes are in `logs/`.

- `node --test` on this journey's file and the adjacent suites (`runtime-management`, `agent-profiles-specimen`, `coding-start-friction`, `static-web-manifest`): **67/67, exit 0** (`logs/owner-and-adjacent.log`).
- `npm --prefix app test` on the final source: **1378/1378, exit 0** (`logs/full-suite.log`). An earlier full run, before the last copy and focus corrections, was 1377/1378, exit 1: `review-core-client-lifecycle` hit a Core-bridge ready timeout under `--test-concurrency=4`. That file is untouched by this change, and it passed 13/13 alone (`logs/first-full-suite.log`, `logs/first-full-suite-flake-rerun.log`). The load-flake reading is an inference.
- `tools/lint-interaction`, `lint-colors`, `lint-materials`, `lint-shapes`, `lint-spacing`, `check-product-copy`, `check-semantic-consumers`, `contrast-report`: all exit 0 (`logs/*.log`). `tools/check-doc-links.mjs` and `git diff --check` were run on the final tree before commit.
- Browser: headless Google Chrome over CDP with a throwaway profile (`browser/capture.mjs`), preview on 8961, debugging port 9361. Real key events through `Input.dispatchKeyEvent`. 22 PNGs plus `browser/shots/interaction-record.json` covering desktop 1440 light, narrow 390, a 80-character unbroken connection name at 390, dark 1440, and 720 CSS px at DPR 2. Every step records focus, whether the focused element is visible below the sticky title, horizontal overflow (0 everywhere) and whether "null" appears (never). Capture exit: `browser/capture-exit.txt`. The captures were taken one edit before the commit; that edit removed trailing spaces from eight lines of the view and nothing else, and both test runs above are on the committed bytes.

## Limits and unexecuted cells

- **OpenAI computer use was not available to this author.** The browser method is headless Chrome over CDP, driven by script. Codex's independent OpenAI computer-use pass is unexecuted.
- Not executed: native page zoom (720 at DPR 2 is viewport emulation, not zoom), screen readers, forced colors, reduced motion (there is no motion here), 1280 width, Safari, touch.
- `tiny-dom` does not move focus to `<body>` when a focused node is removed, and drops `null` children. The test file models the first at the mount's re-render; the second is covered only by the browser record.
- The fixture is one in-memory owner. Concurrency between two real tabs, restart during a pending command, and a status lookup that itself answers `pending` for a long time are not modelled beyond the controller branch that keeps the outcome unknown.
- No production adapter exists; the read-only variant shows what one would render before its owner exposes these actions.

## Observations for disposition

- `app/web/agent-profiles-view.mjs:348-351` (accepted 06a) passes `runtime.model.note ? … : null` to a native `append`. The contract allows `note: null`, so a production adapter would print "null" there; the 06a fixture always supplies a note, so the preview never shows it. Not changed here (accepted module, outside this order); recorded for its owner.

## Writer release

Claude releases this slice at the commit on `claude-runtime-management-20260921`. No process of this author is running: the preview and headless Chrome were started only by the capture script and stopped with it. The tree and branch stay for independent review; nothing is to be deleted by this author. No Role-first Composer, real backend connection, key or hook management, CLI delegation, CE-F2 polish or other journey was started.

## Return RM-R1 / RM-R2 / RM-C1

2026-09-21 · Claude (Opus), the original author, answering Astra's disposition, recorded on main `9da0886` at `engineering/execution/claude-frontend-harness-2026-09-16/evidence/runtime-management-review-20260921/README.md` (not on this branch), which holds `84faff9` on Luna's F01/F02 and one contract correction. One correction commit on the same branch; `84faff9` stays its parent. The retained design, other scenarios and limits are unchanged.

**Proof of each finding first.** Eight new tests were added before any fix and run against the reviewed controller, view and fixture: **all fail on `84faff9`**, each for the reported reason (`return-r1/before-fix.log`, exit 1). For example, RM-R1's summary read `Requested: name “Independent Hermes”. Not applied; saved is revision 6.` beside an unknown outcome, and RM-R2's stale read ended as `readBack: "done"`. After the correction, the same tests pass (`return-r1/after-fix.log`, 8/8, exit 0).

| Item | Correction | Where |
|---|---|---|
| **RM-R1** (F01) | The page now tells apart what was last confirmed, what was sent without an answer, and what has been typed since. A configuring command that is pending says `Submitted: … Waiting for the answer. Last confirmed: revision N.` When unknown or being checked, it says `Submitted: … It may or may not have been applied; Check status settles it.` Input typed afterwards is added as `Your newer edits, not sent: …`. "Not applied" is said only of a draft that was never sent, or one whose command the owner answered. Locks and the non-resending Check status are unchanged. | `runtime-management-view.mjs` (connection block summary) |
| **RM-R2** (F02) | A reading counts as the command's read-back only when it agrees with the receipt (`readBackOf`). It must have the same runtime id, and either the receipt's revision with the receipt's connection id (`done`), or a later revision (`newer`), which may describe a later connection. In that case the page shows it as newer observed state and keeps the original receipt beside it (Astra's adjustment). An older revision (`stale`), a disagreement at the same revision or a different id (`inconsistent`), a failed read and a deferred one keep every mutation locked: `Locked until a current reading confirms the last command.` **Read again** re-reads the owner and never resends; navigating away and reopening re-evaluates too. The overwrite that marked any successful transport read `done` is gone: `afterConfirmed` now only records `failed` when nothing came back. | `runtime-management.mjs` (`readBackOf`, `SETTLED_READ_BACK`, `adopt`, `afterConfirmed`, `readAgain`); view receipt lines |
| **RM-C1** | The proposed `OperationStatus` now defines `not-applied` as the owner establishing that the operation was not applied **and cannot later apply**, and adds `inconclusive` for lag, queueing, expiry, a missing record without a closed id and any other unresolved case. The consumer treats `pending`, `inconclusive` and any unrecognised status as still unknown and locked. The fixture keeps the stronger promise honestly: answering `not-applied` closes the id, so a late request is refused with the new settled code `operation_closed`. The view's wording now says exactly that instead of "no record, so nothing changed". | `runtime-management-contract.d.ts`, `runtime-management.mjs` (`checkStatus`, `SETTLED_REFUSALS`), fixture `operationStatus`, view |

**New regressions**, all through the real controller and view with the fixture adapter (`app/tests/runtime-management.test.mjs`, "RM-…"):
- The submitted draft with a lost reply is not called "not applied". Newer input typed during reconciliation is described separately. After Check status confirms, the newer input is an ordinary unsent draft against revision 7, and there is still exactly one command.
- A pending configuring command is "waiting", not "not applied".
- A stale reading of revision 6 after a revision-7 receipt stays `stale`, with actions locked. It stays stale after back-and-reopen too. A fresh answer through **Read again** settles it as `done` without a second command.
- At the receipt's revision a different connection is `inconsistent` and locked. A later revision 9 with a different connection is `newer`: actions unlock, and the original receipt (`syn-hermes-conn-2`) is kept and shown.
- A reading that describes another runtime id is never taken as read-back.
- An `inconclusive` lookup, and an unrecognised `not-found`, keep `op-1` unknown and locked with Check status available. A later real answer settles it.
- A fenced id cannot apply later, at the fixture itself. The existing "not applied" case now also asserts that the lost request is refused if it turns up afterwards.
- The preview's own `stale-read-back` scenario reaches the same lock without any test wrapper.

**Checks on the return source.** Owner and adjacent suites: **75/75**, exit 0 (`return-r1/owner-and-adjacent.log`). `npm --prefix app test`: **1386/1386**, exit 0 (`return-r1/full-suite.log`). All eight UI lints and the contrast report exit 0 (`return-r1/*.log`), and `git diff --check` is clean. Browser: the headless-Chrome capture was re-run in full on this source (`browser/capture-exit.txt`, exit 0; 30 steps, with no "null" text, no hidden focus and no overflow). It adds `23-rm-r1-submitted-unknown`, `24-rm-r1-newer-draft` and `25-rm-r2-stale-read-back`. The interaction record shows one `command`, then `reply-lost`, then one `status` with the same operation id for RM-R1, and one `command`, then `stale-read`, then a current read for RM-R2. All earlier captures were regenerated from the same source.

**Still unexecuted.** OpenAI computer use (Codex's lane), native zoom, screen reader, forced colors, Safari, touch, 1280 width, multi-tab and restart recovery. A real owner that can only answer `inconclusive` for a long time is modelled only by the stubbed lookup test. Luna's original stale-read probe script was not in the review packet (only its log), so its before/after rerun is replaced by the equivalent public-controller regression above.

**Release.** Claude releases this return for Luna's delta review and Astra's integration. No process of this author is running. The `agent-profiles-view.mjs` optional-note observation stays with the 06a owner, as ruled. No Role-first Composer, production connection, key or hook work was started.
