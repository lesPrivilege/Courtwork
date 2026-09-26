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


## Final independent acceptance — 2026-09-21

[Source `5f89213` accepted](evidence/runtime-management-final-20260921/README.md): RM-R1/R2/C1 closed for the explicit synthetic frontend scope; Luna34/34, actual-main75/75, OpenAI browser stale-read recovery and submitted/unknown/new-draft checks. Local merge `4a3ac9e` and restore-verified cleanup complete. Production Runtime-management backend remains proposed. The next user-authorized frontend package is [06d tabbed Preview](06d-surface-continuity-20260921.md), not real browser execution.

## 2026-09-26 · Production continuation I1: truthful Host inventory

User authorizes the next order after accepted Order3 at `main@0d06fb91d510398e2319da5d34aa9e485f7c7e84`. Updated routing: an independent bounded backend worker may be GPT-6 Sol; core architecture and frontend/backend integration remain Astra or Opus. This supersedes the earlier all-Claude-only routing for this released backend slice. Parent Astra selects the contract below; Sol implements it; Luna reviews fixed source; Opus consumes only the accepted backend in the subsequent frontend stage. No competing product writer or new roadmap is created.

### Outcome, responsibility and precedent

Before creating a Chat, Settings can read what execution runtimes this Host actually has configured, their declared operations and explicit unavailable reasons. This is the first production06c seam, not another synthetic connection journey. The existing06c controller/fixture remains a design/interaction reference; its successful connect/disable receipts must never be used as live facts.

Luna's bounded next-slice preflight confirms: `RuntimeService.runtimePorts` and composition-root descriptors already own executor facts; `getExecutorChoice(sessionId)` exposes the R1 options but requires a Session; `getRuntimeInfo()` exposes only default/selected identity plus generic Host capabilities. Therefore extend **existing authenticated GET `/api/v5/runtime-info`** additively, rather than create a second endpoint or registry. Nearest precedents are R1 descriptor validation, configuration fingerprint and provider-compatibility refusals. Host configuration is the owner; UI is a projection. No schema, permission, credential, process-control or provider-selection change is needed.

### Astra fixed read contract

Keep every existing runtime-info field/meaning and Session-scoped behavior. Add `executionRuntimes`:

```ts
{
  schemaVersion: 1,
  defaultAdapterId: string, // Host default, not the selected Session's adapter
  items: Array<{
    adapterId: string,
    configured: boolean,
    configurationOwner: "host",
    revision: string | null,          // configured descriptor revision
    configurationRef: string | null, // existing non-secret fingerprint
    capabilities: ExecutorCapabilities | null,
    availability: {
      status: "configured" | "unavailable",
      reasonCode: null | "not_configured" | "descriptor_changed" |
        "descriptor_unavailable" | "provider_unsupported",
      reason: string | null
    },
    liveStatus: "not_checked"
  }>
}
```

`ExecutorCapabilities` is the existing closed R1 operation shape, not the generic Host `capabilities` object. Enumerate actual configured entries plus the existing Pi/managed candidate IDs once; preserve the trusted single-port test seam without discovering or constructing any new port. Place the Host default first and keep other ordering deterministic. Unconfigured candidates have null revision/ref/capabilities and a fixed unavailable reason. Do not invent Hermes or child-only executors.

For each configured entry, read its existing port's synchronous `describe()` (use the current default `runtimePort` seam where appropriate). Validate identity, configured revision and capability shape through the existing descriptor validator. Identity/revision drift returns `descriptor_changed`; an exception or invalid capability description returns `descriptor_unavailable`; expose no raw exception, stack, environment, endpoint, configuration identity text, secret or native Session/root locator. Preserve the configured identity fields as explicitly configured readings; with drift/error capabilities are null rather than a stale effective claim. Read errors are isolated to their row.

For a valid descriptor, clone the declared capabilities. Reuse the existing R1 managed/fake-provider compatibility condition to return `provider_unsupported` when applicable. Otherwise `status:"configured"` means a configured, locally describable port only. It does **not** mean connected, authenticated, reachable, healthy, admitted, or verified live; every row remains `liveStatus:"not_checked"`. No network request, subprocess, openSession, Run, control-plane write, revision bump or credential lookup occurs for this inventory. `configurationRef` is the already accepted hash, never a new persisted version or a mutation precondition. Admission and permissions stay authoritative in their current paths.

No change to R1 choice PUT, frozen Run bindings, provider/model readiness, global single-active policy, native recovery, Core or bridge. The view will say configured/unavailable and explain ownership; it must not rename this readout as a completed runtime connection check.

### Sol bounded backend lease

Own only the additive service projection in `app/server/service.mjs`, a small pure helper under `app/server/` if justified, focused HTTP/descriptor tests and the I1 author evidence/subsection of this original record. Add a short API contract document under `app/docs/` if needed. Existing `/runtime-info` routing already supplies authentication; no new endpoint is expected. Do not edit `app/web/**`, global Settings, Store/schema, runtime constructors/factories, dependencies, README capability claims or shared `engineering/current.md`/dispatch/acceptance summaries. If the fixed DTO cannot be derived without new authority, report the concrete issue to parent before changing that boundary; routine implementation choices require no further user approval.

Use an isolated checkout from actual main containing this contract. You are not alone: preserve other writers and all pre-existing main metadata; do not checkout/stash/reset shared or original Claude trees. No paid providers, personal credential stores, user8787/8899 processes, push/deploy or cleanup of others' trees.

Meaningful exit evidence:
1. Public authenticated runtime-info before any Session reports real default Pi and missing managed candidate; no Sessions/Runs/events/config changes or new native history are produced by repeated reads.
2. Existing R1 trusted managed loopback fixture is describable/configured without any live-verification claim; incompatible Provider route is unavailable without executing it.
3. Descriptor throw, invalid capabilities and identity/revision drift produce bounded row refusals; sentinel secret/error strings cannot escape. Other rows remain readable.
4. Returned objects are copies; caller mutation cannot alter configured facts. Default-vs-selected Session semantics and existing runtime-info keys remain intact.
5. Existing R1/Runtime foundation consumers pass; record actual commands and source SHA. Targeted checks first, then required broader verification once source stabilizes. Author tests are not independent acceptance.

Commit explicit owned paths and return a fixed source plus writer stop/handoff. Do not advance into connect/enable/disable/disconnect, executor selection UI or production managed exposure. Parent independently disposes the delivery and integrates before releasing the Opus consumer.

### Subsequent Opus consumer (queued, not a second writer)

After I1 backend acceptance, use the existing Settings/Agents owner and accepted design grammar for a complete read-only list→detail→refresh→return path. Consume `executionRuntimes`, keep loading/failed-read/empty/unavailable distinct and preserve focus/position. Show actual declared operations with their reasons, Host configuration ownership, and explicitly unverified live status. Do not wire synthetic mutation controls or invent per-runtime CAS/command receipts. Astra owns any required cross-layer adjustment and final combined browser acceptance. This paragraph does not launch Opus before the backend handoff.

### Actual I1 dispatch — 2026-09-26

Parent committed the fixed contract as `5c22c02`, created isolated `codex/runtime-inventory-i1-20260926` from that actual main, and dispatched `/root/sol_runtime_inventory_i1` (GPT-6 Sol, high) as the sole bounded backend author. Source checkout is `../.worktrees/courtwork-runtime-inventory-i1-20260926` relative to the persistent project parent arrangement; the only untracked addition is a dependency symlink. This is an actual subagent dispatch, not a new sidebar task or a claimed implementation result. Original Claude and completed integration trees remain preserved; Opus frontend is still queued. Parent owns current/dispatch updates and independent acceptance; the author records only its own delivery here.
