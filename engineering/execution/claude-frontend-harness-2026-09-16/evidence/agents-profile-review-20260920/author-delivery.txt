# 06a · Agent profile → Kits → execution summary · first frontend slice

2026-09-20 · **Status: delivered, ready for independent review. Not self-accepted, not integrated, not a backend claim.**
Writer: Claude (serial). Independent verification: Luna. Disposition and contract freeze: Astra.
Order: [06 · Agents frontend first](06-agents-frontend-first-20260920.md).

Built on base `95ed9cfb068300d154dca9643bf754beebe1d295` and delivered as the single commit at
the tip of the isolated worktree
`/Users/lesprivilege/Projects/.worktrees/courtwork-agents-frontend-20260920`, branch
`claude-agents-frontend-20260920`. Nothing was pushed, deployed or merged; no other tree was
touched. `app/node_modules` was installed there with `npm ci` because a fresh worktree has none.

**Sequencing, stated plainly.** This slice was built while slice 11 was still recorded as
*ready to dispatch, not executed*. During the work, main moved to `d0bfeba` and slice 11 is now
recorded as delivered at `94d60d2` with an independent positive-path rehearsal, so the
precondition in [current](../../current.md) holds at integration time — but it did not hold when
this work started, and that is a deviation the acceptor should weigh rather than discover. This
branch is one docs-only commit behind main; it touches none of the dogfood paths.

## What this delivers

One complete, interactive **Settings → Agents → Agent profiles** journey — read the agents, open
one, change its Role and Kits, choose a runtime, read the effective model and permission scope,
save, and recover from every way that can go wrong — running against an explicit synthetic adapter.
The view and controller are production modules with a narrow injected seam, not a prototype to be
thrown away: replacing the adapter is the whole of what backend integration requires of this
frontend.

**It does not** implement any backend, register an Agents group in the live Settings navigation,
manage a runtime connection, touch a credential, or claim that any runtime, Kit or permission named
in the preview exists.

## Files

| Path | What it is |
|---|---|
| `app/web/agent-profiles-contract.d.ts` | The consumer projection and the five intents, each field annotated with the owner that holds it today or the fact that none does |
| `app/web/agent-profiles.mjs` | Controller: saved-vs-draft, epochs, per-profile drafts, and `projectProfile`, a pure projection. No DOM, no `fetch`, no clock |
| `app/web/agent-profiles-view.mjs` | View: the Settings anatomy, whole-panel re-render with focus restored by `data-focus-key` |
| `app/tests/fixtures/agent-profiles/adapter.mjs` | The synthetic adapter and its five scenarios |
| `app/tests/fixtures/agent-profiles/{index.html,preview.mjs,specimen.css}` | The preview page, its wiring and its page frame |
| `app/scripts/agent-profiles-preview.mjs` | Read-only fixture host, copied from the chat-continuity preview |
| `app/tests/agent-profiles-specimen.test.mjs` | 16 seam tests over the controller/adapter transitions |
| `app/server/index.mjs` | One line: the two new `app/web` modules added to the static allowlist |

That last line is the only change to an existing product file. `app/tests/static-web-manifest.test.mjs`
requires every `app/web/**.mjs` to be routable, so a new module there must be registered. The modules
are inert in production: `index.html` does not load them and no route reaches them.

## Running it

```bash
CW_SPECIMEN_PORT=8899 node app/scripts/agent-profiles-preview.mjs
```

It serves `app/web` plus the fixture directory over loopback, answers `GET`/`HEAD` only, refuses
`/api/*`, and imports no Runtime, store, data directory or API router. It needs no data directory
and no port from the product; pick any free `CW_SPECIMEN_PORT`. It is outside the live Settings
route by construction — there is no Agents group in `SETTINGS_GROUPS` to reach.

## The adapter contract, and who owns each fact

The full shape is in `app/web/agent-profiles-contract.d.ts`. This table is what the journey
consumes and where each fact has to come from. **Proposed transport is proposed**: no route name
below is claimed as agreed.

| Consumer intent | Object / scope | Distinctions it must keep | Version / precondition | Result and error | Permission | Owner today | Missing |
|---|---|---|---|---|---|---|---|
| List the agents by responsibility | `agent_profile`, host scope | saved values only; `activeRun.revision` separate from `revision` | none | `{rows}`; a load failure is shown in place | read | Runtime control plane — `agent_profile` resource kind, snapshot `revision` ([INDEX](../../../docs/runtime-control/INDEX.md), `RuntimeSnapshot.profileSelections`) | the row's `responsibility`, `roleName`, `kitNames`, `runtimeName`, `runtimeAvailability` and `nextAction` have no owner |
| Open one agent | one `agent_profile` + the catalogues it is read against | `roles`/`kits`/`runtimes` are offers, not selections | none | one reply; a late reply for another profile is discarded | read | composition source exists (`AgentCompositionSource`: `resourceIds`, `rules`, `uiSlots`) | Role as a first-class object; Kit identity/version/`supportedRuntimeIds`; the runtime registry |
| Change Role / Kits / Runtime | the draft, client-side only | draft never merges into saved | none | none — local | none | **frontend only** | — |
| Save the draft | one `agent_profile` | requested vs confirmed; confirmed revision is named | `expectedRevision`; **must** fail with `profile_conflict` on mismatch, never merge | returns the confirmed detail; `profile_conflict`, `profile_frozen`, and a retryable failure that keeps the draft | write; frozen while a Run holds the profile | CAS and the active-Run freeze exist (`RuntimeChange{operation:'profile'}` carries `revision`; `RuntimeSnapshot.activeRuns`) | `RuntimeChange` has no shape for role/Kit/runtime binding |
| Read the effective model | the chosen runtime | owner / effective / source / requested, four separate readings | none | four strings plus an optional note | read | `/provider-config` — today's scope is global future-runs, which the copy states verbatim | per-agent model binding; what a runtime-native model reports |
| Read the permission scope | each action a Kit requests | **requested** (Kit) vs **supported** (runtime) vs **granted** (permission owner) | none | one row per action | read | `PermissionExplanation` / `evaluatePermission` | the runtime's supported-action set |
| Read a runtime's detail | one runtime | observed vs not observed; who owns authentication | none | one record | read | — | the whole record. Slice 1 reads it from a fixture on purpose |

No second ledger is introduced. Every row either names an existing owner or says the fact has none;
where a fact is missing, the frontend shows the missing thing rather than a default.

Three separations are load-bearing and should survive backend integration unchanged:

1. **saved vs draft** — never merged; a failed save keeps the draft exactly as composed.
2. **this run vs the next** — `activeRun.revision` is what a running Run is bound to. Saving is not
   offered while a Run holds the profile, and the draft says it will *not* apply itself afterwards.
   No queue is invented. The sentence is `ACTIVE_RUN_SENTENCE`, reused from `runtime-view.mjs`.
3. **requested vs supported vs granted** — an action a runtime cannot perform reads as
   *not supported by that runtime*, never as a denial by the permission owner.

Two sentences carry rulings the UI could otherwise quietly break, and are exported so a reviewer can
find them: `NOT_AN_ACCEPTANCE_SENTENCE` ("Saving records this composition. It does not publish an
accepted Work Expert.") and `REQUEST_NOT_GRANT_SENTENCE` ("A Kit states what it needs. It grants
nothing…").

## Fixture and production routing safeguards

- The synthetic adapter lives under `app/tests/fixtures/` and is imported only by the fixture page
  and the fixture test. No product module imports it; nothing in `app/web` references it.
- The preview page carries a permanent visible identity in its own header ("Interactive synthetic
  preview… A confirmed revision below is confirmed by the preview only") and its runtime detail
  states that management has no backend yet.
- The preview keeps no state anywhere but the tab: no `localStorage`, no `cw:prefs`, no Host
  configuration, no credential of any kind — the fixture's authentication fields are sentences about
  ownership, not references to anything.
- `adapter.capabilities()` exists so a production adapter answers `{canSave:false, reason}` and the
  journey becomes read-only with a stated reason instead of a simulated success. The controller
  refuses to save whenever that is false.
- The preview host serves `GET`/`HEAD` only, 404s `/api/*` and path traversal; the test asserts all
  three.

## UI change record

```text
Task / scope: Settings → Agents → Agent profiles, first journey; frontend only, synthetic adapter
Base SHA / branch / isolated checkout: 95ed9cf / claude-agents-frontend-20260920 /
  ~/Projects/.worktrees/courtwork-agents-frontend-20260920
Writer / reviewer: Claude / Luna (pending)

Owner fact + contract: runtime control plane agent_profile + revision/activeRuns; /provider-config
  for the effective model; PermissionExplanation for each effect. Kit, Role-as-object and the runtime
  registry have no owner and are explicitly fixture-supplied.
Semantic / projection / control / placement: saved/draft/effective/bound kept apart; projectProfile
  is a pure function over one adapter reply; controls are the existing select/checkbox/button set;
  the surface is the existing Settings panel, with the runtime detail in the existing runtime-dialog.
Affected UX rule IDs: UX-01 (no text that does not help act or recover), UX-02 (scope, permission,
  failure and unknown next to the action; detail on request), UX-03 (checkbox for a form selection
  pending Save, never a switch), UX-04 (field-level explanation beside its field; the conflict is a
  decision and gets a banner; one status line for the receipt), UX-05 (saving ≠ saved; no progress
  bar), UX-06 (recovery first: draft kept on every failure; no invented Undo), UX-07 (existing
  spacing tokens; one block per decision), UX-08 (no AI decoration), UX-09 (identity → decisions →
  state → actions; no fixed-height box).
Action result / feedback / recovery / draft and scope identity: the receipt names the confirmed
  revision; a failed save keeps the draft and stays retryable; a conflict offers Reload, which brings
  the other writer's values and merges nothing; drafts are per profile id and survive the list.
Nearest precedent: app/web/settings-view.mjs `settingsRow`; app/web/runtime-view.mjs
  `ACTIVE_RUN_SENTENCE` and the frozen/draft-summary pair; app/web/model-picker.mjs `createModelPicker`
  for the saved/draft/expectedVersion/refresh grammar; app/web/local-extension-view.mjs for
  re-render-with-focus-restore; app/tests/fixtures/chat-continuity/{adapter,controller}.mjs for the
  adapter/controller split and epoch discipline; app/tests/fixtures/chat-actions/adapter.mjs for
  failure/abort semantics; app/scripts/chat-continuity-preview.mjs for the read-only fixture host.
  All at 95ed9cf.
Evidence type: implemented precedent (reused), new candidate (this surface)
Governance status: candidate. Nothing here is canonical and precedents.md is not amended — that is
  Astra's call after acceptance.
Kept relationships: Settings row anatomy and spacing; one decision per block; disclosure of technical
  detail behind an explicit control; Escape/return-focus on the overlay; the Runtime group's existing
  frozen vocabulary.
Intentional changes: a new arrangement — responsibility, Kits, execution, permission scope, save —
  in the order the decision is made. That order is this slice's only new composition claim.

New terms / roles / tokens / primitives / dependencies: none. No new CSS token, no new glyph, no new
  control primitive, no library. `plug` was considered for the runtime action and dropped: it is a
  guarded multi-purpose glyph and there is no established mark for "open runtime detail", so both
  runtime actions are text (IC-1).
Reuse / variant / grammar gap decision: reuse throughout. The only judgement call is the kit row's
  explanation line, which is an extra `.settings-row-help` inside the existing row grid rather than a
  new row type.
Skin / review / deterministic semantic color impact: none. No colour literal; lint-colors passes.
Exceptions: order 06 explicitly permits a complete interactive target-Settings preview despite the
  production rule against unsupported placeholders. Scope: this preview route only. Removal
  condition: when the backend owners exist, the production adapter replaces the synthetic one and the
  production rule applies again unchanged.

Fixture and setup command: node app/scripts/agent-profiles-preview.mjs (synthetic; no personal data)
Affected scene + adjacent scene + full composition: the Agents panel, the runtime detail overlay, and
  the whole Settings page frame around them.
Viewport / scheme / keyboard / failure / zoom / fallback coverage: see the evidence note.
Checks: see evidence/agents-profile-journey-20260920/checks.txt
Visual change: new surface; there is no before. No baseline is proposed and no screenshot is offered
  as golden.
Author checks: lints, targeted suite, full suite, doc links — all in checks.txt
Independent review: not started
Remaining work: backend owners per the contract table; runtime management and Role-first Composer are
  the following slices.
```

## Evidence

[Browser journey and its limits](evidence/agents-profile-journey-20260920/browser-journey.md) ·
[author check output](evidence/agents-profile-journey-20260920/checks.txt).

Every required interactive case was exercised in the browser and is quoted verbatim there: empty
list, loaded list, loaded profile, dirty draft, saving, confirmed revision, failed save with the
draft retained, stale-revision conflict and its recovery, runtime unavailable in both the list and
the detail, incompatible Kit/runtime, and the active-run freeze. Out-of-order replies are not
reachable by hand and are covered by gated-reply seam tests instead.

`app/tests/agent-profiles-specimen.test.mjs`: 16 tests, all passing. They test the transitions and
the adapter seam — late replies, the three save guards, draft reconciliation on reopen, the purity
of `projectProfile` — not the DOM the view builds.

## Limits, stated rather than implied

- **No backend.** Every reading in the preview is synthetic. A confirmed revision is confirmed by a
  `Map` in one browser tab.
- **The cast is an example, not a discovery.** "Pi", "Hermes", "Codex", "Praxis", the versions and
  the permission effects are invented for this preview. Nothing was read from this machine.
- **Escape-to-close was not executed.** The browser pane's automated Escape does not reach the page;
  a bare control `<dialog>` on the same page behaved identically, so this is the harness. Closing by
  button, and the focus return after it, were verified.
- **The browser driver is not the one the order names.** The order asks for an OpenAI computer-use
  provider; this was driven from the Claude Code in-app browser. The evidence is real interaction
  with a real browser, but it is not that provider, and an acceptor who needs that specific chain
  should re-run it.
- **The full suite flaked once.** Three full runs: green, one unidentified failure, green. The
  failing name was lost to a summary filter. Recorded in checks.txt rather than dropped.
- **Real browser zoom at 200% was not used** — the equivalent halved viewport was, and it reflows
  without clipping or horizontal scroll.
- **Screen-reader verification was not performed.** Roles, labels and the live region are in place
  and the accessibility tree reads correctly, but no assistive technology was run against this page.
  This is not part of the old G4 campaign and does not inherit its coverage.
- **`precedents.md` is unchanged.** This surface is a candidate; promoting it is Astra's decision.

## Release

Claude releases this slice and takes no further scope from order 06 until it is disposed. The source
and its evidence tree stay in place. The next serial frontend consumers — runtime connection and
local management, then the Role-first Composer — remain as the order describes them and are not
started.
