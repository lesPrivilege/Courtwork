# 06c · Runtime management — first complete frontend journey

2026-09-21 · Astra. **Authorized and ready for Opus pickup.** The user authorizes the next round after [Composer acceptance and cleanup](evidence/composer-ce-r1-final-20260921/completion.md). Planning source is main `77e87ac1d01af5ea3ff4e98acb62d02d7cf7fc2c`; read actual main and this order at pickup. This implements the next consumer in [order 06](06-agents-frontend-first-20260920.md), not a separate roadmap. No author process or worktree is claimed by this registration.

## Outcome and first stop

An experienced agent user opens **Settings → Agents → Runtimes**, finds the engine used by an agent, understands who owns its configuration, connects it, disables it for future admissions while existing work keeps its recorded binding, and reconnects or disconnects without losing history or unsaved input.

Deliver this one working journey with an **explicit synthetic adapter**. The shared controller/view should be reusable by a later real consumer, but a later adapter swap is not promised to complete backend integration. Pi and Hermes are labelled examples, not discovery of installed software. An unavailable engine is not a permission denial. Runtime is the execution engine; Models still owns provider/model connections; Tools owns extensions/hooks; Agent profiles compose Role/Kits/runtime choices.

## Writer and consumption

- Opus owns the finite frontend implementation and its author evidence. Sonnet may do one bounded preflight, below. Codex owns architecture, independent acceptance, OpenAI computer use, integration and cleanup.
- Read AGENTS → current → this order → [UX Grammar](../../design/ux-grammar.md) → [frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md), relevant precedent-map entries and [Design Scout](../../design/scout/README.md). Consume the [control-plane precedent disposition](../../research/architecture-node-2026-09-13/control-plane-precedents-20260921.md), especially configured versus bound execution. Do not rescan the ecosystem without an unresolved question.
- Nearest implementations: `app/web/agent-profiles{,-view}.mjs`, its proposed consumption contract and synthetic fixture, `runtime-intake.mjs`, `runtime-view.mjs`, `settings-view.mjs`, `ui-controls.mjs`. Retain the 06a fixes for stale replies, saved-versus-draft identity, focus restoration, refusal reasons and runtime capability versus permission.
- Before edits, record source baseline, exact owned files, affected UX rules, nearest implemented behavior and proposed backend fields in this order's author section or linked packet. Prefer existing primitives and adopted libraries; justified mature library use remains allowed under order 06. No framework or design-system replacement.
- Create an isolated tree only at author pickup, from actual main. Other writers are not to be reverted. Keep user 8787/8899, their processes/data, the accepted profiles preview and persistent checkout untouched; use a checked-free preview port.

## Required journey

1. **List and inspect.** One useful entry per runtime. Show connection/availability, configuration owner and one sensible next action. Empty, loading, failed read and stale refresh remain distinguishable; preserve rows/position while refreshing. Process metrics and protocol detail are disclosed only when useful.
2. **Connect.** Inspect the proposed configuration and owner before the command. Native-managed authentication describes the native next step; CW-managed authentication uses a visibly synthetic reference/status. No real key input, CLI invocation or native settings modification. Read-back confirms exact identity/revision and capability facts supplied by the adapter.
3. **Disable for future work.** Say what changes on the next admission. An existing Run retains its recorded binding; disable does not cancel, migrate or queue work. If the adapter cannot support an action, show its reason near that action.
4. **Reconnect/disconnect and return.** Preserve the runtime's identity/history references. Disconnect removes only the connection described by this command, not native installation or prior work. If disconnect is unsupported while bound, keep it unavailable with that reason; never imply forced teardown. Return to the same item with sensible focus.
5. **Recover.** Failed commands retain draft. Unknown outcomes remain unknown and block conflicting mutations; a status/reconciliation action may settle the original operation. Do not blindly resend after a lost reply. Duplicate clicks, stale revisions and late reads/replies cannot create a second effect or overwrite another runtime's page. Navigation or client abort does not prove cancellation of an already submitted command.

Use explicit Preview identity throughout, including receipts and entry points. Reuse the existing Settings anatomy in the fixture. Do not add a second production Settings shell or route users from live Settings into simulated success.

## Minimum consumer contract and responsibility

Document only facts used by this journey: stable runtime identity, connection/configuration owner, availability and supported actions/reasons, requested/saved/effective/bound distinctions, revision/precondition, draft identity, operation identity and pending/unknown/confirmed outcome, retained bound Run references and future-admission effect.

Map each to existing Runtime Adapter/RD-001, Runtime Control, Provider credentials or Tools/RD-009 ownership. **Missing exposed implementation is not missing ownership.** New projection fields, per-runtime revision and command-status lookup remain explicitly proposed until the backend owner accepts them. No global runtime/provider/permission registry or persistence schema is created by this frontend. A synthetic credential reference is not a secret-store implementation or verified authentication.

Prefer dedicated `app/web/runtime-management{,-view}.mjs`, a minimal typed contract, `app/tests/fixtures/runtime-management/`, related tests and a small isolated preview launcher. File names may follow nearer repository convention after source reading. Keep production app wiring and `app/server/service.mjs`, store, runtime admission, native config, credentials and hook execution out of scope. If new web modules require the static allowlist, include only that explicit hunk in the delivery; it does not enable production Runtime management. Accepted profile modules may change only for a necessary documented reusable seam, with their existing tests retained.

## Sonnet preflight — maximum 10 tool calls

Answer only: (1) reusable Settings/list/detail/control patterns and exact symbols; (2) current runtime/configuration/authentication facts versus proposed projections; (3) existing asynchronous operation/reconciliation precedent; (4) the smallest source/test map and any genuine missing primitive. Start with repository and adopted source. Fetch first-party external material only for an unresolved question, at most two useful sources. Stop at the bound with uncertainty; do not implement during exploration. Routine implementation proceeds under this order; material authority or dependency changes return to Astra with a concrete alternative.

## Verification and handoff

Drive the real production controller plus view against the injected adapter. Required cases: empty/unavailable, native-owned and CW-managed auth references, connect success/failure, committed mutation with lost reply then reconciliation, duplicate click, stale revision, late list/detail/command reply after navigation, disable with an existing bound Run, disconnect/history preservation, failure draft/focus retention, and unsupported-action reason. Do not repeat CE-R1's error of proving helper states while the actual page wiring remains untested.

Provide a runnable preview command, deterministic scenarios, full logs with actual subprocess exits, before/after source evidence where correcting existing behavior, and screenshots/interaction records for desktop/narrow, long labels, light/dark, keyboard/Escape/focus. OpenAI computer use remains Codex's independent lane; if unavailable to the author, label the actual browser method and unexecuted cells. Native zoom, screen reader and forced colors are not passed by viewport emulation. No user credentials or paid service.

Deliver exact source SHA, owner/precedent change record, minimum proposed adapter contract, consumed references, test selection/results, fixture traces and explicit writer release. Stop for independent disposition. Do not start Role-first Composer, real backend connection, key/hook management, CLI delegation, CE-F2 polish or another journey. No push/deploy or source/evidence deletion.


## Independent disposition — 84faff9 — 2026-09-21

[Review and finite return](evidence/runtime-management-review-20260921/README.md): Luna new tests 26/26 and adjacent 67/67; Astra OpenAI browser list, disable with frozen bound Run, native-owned connect/lost reply/reconciliation with a newer draft, disconnect/history, Escape, refusal/Tab and 390px dark. Retain the design and explicit synthetic boundary. Hold integration for **RM-R1** (submitted unknown values incorrectly labelled Not applied), **RM-R2** (stale read-back promoted to done and mutations unlocked), plus **RM-C1** (proposed not-applied lookup must establish final non-application, not merely absence). Return only these seams to the original Opus owner in the existing tree. Next journey remains unstarted; no production capability accepted.

## Author pickup — 2026-09-21 (Claude, Opus)

Picked up from actual main `ff553e89ba26ba5e3db6b8ee6071bb3f7cc5bd93` (this order's planning source `77e87ac` plus two documentation commits). Isolated tree `/Users/lesprivilege/Projects/.worktrees/courtwork-runtime-management-20260921`, branch `claude-runtime-management-20260921`; `app/node_modules` cloned copy-on-write from the persistent checkout. The persistent checkout, user 8787/8899 and every other tree are untouched. Sonnet's preflight stayed within its bound (9 of 10 calls). The pre-edit record — owned files, affected UX rules, nearest behavior and proposed backend fields — is in the [author packet](evidence/runtime-management-20260921/README.md#pre-edit-record). Delivery status is kept there, not here.
