# 06a · Agent profile → Kits → execution summary · first frontend slice

2026-09-20 · **Status: reviewed, returned, corrected. Ready for the bounded re-review of the changed seams. Not self-accepted, not integrated, not a backend claim.**
Writer: Claude (serial). Independent verification: Luna. Disposition and contract freeze: Astra.
Order: [06 · Agents frontend first](06-agents-frontend-first-20260920.md).
Return: [independent review and bounded corrections](evidence/agents-profile-review-20260920/README.md), retaining the direction and holding acceptance for AP-R1…AP-R6. All six are applied; see [Corrections returned and applied](#corrections-returned-and-applied).

Built on base `95ed9cfb068300d154dca9643bf754beebe1d295` and delivered as the single commit at
the tip of the isolated worktree
`/Users/lesprivilege/Projects/.worktrees/courtwork-agents-frontend-20260920`, branch
`claude-agents-frontend-20260920`. Nothing was pushed, deployed or merged; no other tree was
touched. `app/node_modules` was installed there with `npm ci` because a fresh worktree has none.

**Sequencing, corrected.** This slice was built while slice 11 was still recorded as *ready to
dispatch, not executed*, which is a deviation from the order. The earlier claim that the
precondition is now satisfied because slice 11 was delivered is withdrawn: `d0bfeba` explicitly
holds order 11's readiness *for correction*, its author branch has since advanced with corrective
commits, and neither a delivery nor a corrective commit is a final handoff or an acceptance. The
precondition remains open, under order 11, and this work does not close it or depend on closing it.
This branch touches none of the dogfood paths.

## What this delivers

One complete, interactive **Settings → Agents → Agent profiles** journey — read the agents, open
one, change its Role and Kits, choose a runtime, read the effective model and permission scope,
save, and recover from every way that can go wrong — running against an explicit synthetic adapter.
The view and controller are production modules with a narrow injected seam, not a prototype to be
thrown away. That seam is what the frontend offers; it is **not** a claim that integration is only
an adapter swap. The projection below asks the existing owners for facts they do not expose today,
and nothing here can be built against until those owners have agreed it.

**It does not** implement any backend, register an Agents group in the live Settings navigation,
manage a runtime connection, touch a credential, or claim that any runtime, Kit or permission named
in the preview exists.

## Files

| Path | What it is |
|---|---|
| `app/web/agent-profiles-contract.d.ts` | The consumer projection and the five intents, each field annotated with its existing owner and whether the implementation is exposed |
| `app/web/agent-profiles.mjs` | Controller: saved-vs-draft, epochs, per-profile drafts, and `projectProfile`, a pure projection. No DOM, no `fetch`, no clock |
| `app/web/agent-profiles-view.mjs` | View: the Settings anatomy, whole-panel re-render with focus restored by `data-focus-key` |
| `app/tests/fixtures/agent-profiles/adapter.mjs` | The synthetic adapter and its seven scenarios |
| `app/tests/fixtures/agent-profiles/{index.html,preview.mjs,specimen.css}` | The preview page, its wiring and its page frame |
| `app/scripts/agent-profiles-preview.mjs` | Read-only fixture host, copied from the chat-continuity preview |
| `app/tests/agent-profiles-specimen.test.mjs` | 22 seam tests over the controller/adapter transitions |
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

## The adapter contract, and what each owner would have to expose

The full shape is in `app/web/agent-profiles-contract.d.ts`. **Every fact here already has an
owner.** What several of them lack is an implementation exposed to this consumer, which is a
different statement and the one this table makes. **Proposed transport is proposed**: no route name
or field shape below is agreed, and the frontend does not become authoritative by needing something.

Owners, per Astra's disposition: profile composition and its revision → Runtime Control; Role
semantics → the existing product / Host admission contract; Kit admission and context → Harness
Extension / RD-009; runtime registration, capability and lifecycle → Runtime Adapter / RD-001;
provider, model and authentication → their existing configuration owner; cross-layer seams →
adjudicated by Astra.

| Consumer intent | Object / scope | Distinctions it must keep | Version / precondition | Result and error | Permission | Owner | Exposed today / still to be exposed |
|---|---|---|---|---|---|---|---|
| List the agents by responsibility | `agent_profile`, host scope | saved values only; `activeRun.revision` separate from `revision` | none | `{rows}`; a load failure is shown in place | read | Runtime Control | `agent_profile` exists as a resource kind ([INDEX](../../../docs/runtime-control/INDEX.md)). The row's `responsibility`, `roleName`, `kitNames`, `runtimeName`, `runtimeAvailability` and `nextAction` are **not exposed** |
| Open one agent | one `agent_profile` + the catalogues it is read against | `roles`/`kits`/`runtimes` are offers, not selections | none | one reply; a late reply for another profile is discarded | read | Runtime Control (composition); Host admission (Role); RD-009 (Kit); RD-001 (runtime) | `AgentCompositionSource` carries `resourceIds`, `rules`, `uiSlots`. Role as a first-class object, Kit identity/version/`supportedRuntimeIds` and the runtime registry are **not exposed** |
| Change Role / Kits / Runtime | the draft, client-side only | draft never merges into saved | none | none — local | none | **frontend only** | — |
| Save the draft | one `agent_profile` | requested vs confirmed; confirmed revision is named | `expectedRevision`; **must** fail with `profile_conflict` on mismatch, never merge | returns the confirmed detail; `profile_conflict`, `profile_frozen`, and a retryable failure that keeps the draft | write; frozen while a Run holds the profile | Runtime Control | `RuntimeChange{operation:'profile'}` carries a revision for a scoped profile **selection**, and `RuntimeSnapshot` carries a configuration-wide `revision` plus a numeric `activeRuns`. A **per-profile** revision, the `{runId, revision}` binding and a Role/Kit/Runtime composition save are **proposed, not implemented** |
| Read the effective model | the chosen runtime | owner / effective / source / requested, four separate readings | none | four strings plus an optional note | read | the existing provider/model configuration owner | `/provider-config` exists; its scope is global future-runs, which the copy states verbatim. Per-agent model binding and a runtime-native model reading are **not exposed** |
| Read the permission scope | each action a Kit requests | **requested** (Kit) vs **supported** (runtime) vs **granted** (permission owner) | none | one row per action; an unreported effect stays unreported | read | Runtime Control | `PermissionExplanation` / `evaluatePermission` exist. The runtime's supported-action set is **not exposed** |
| Read a runtime's detail | one runtime | observed vs not observed; who owns authentication | none | one record | read | RD-001 | **not exposed**; slice 1 reads it from a fixture on purpose |

No second ledger and no new owner follow from this preview. Where a fact is not exposed, the
frontend shows that rather than a default.

Three separations are load-bearing and should survive backend integration unchanged:

1. **saved vs draft** — never merged; a failed save keeps the draft exactly as composed.
2. **this run vs the next** — `activeRun.revision` is what a running Run is bound to. Saving is not
   offered while a Run holds the profile, and the draft says it will *not* apply itself afterwards.
   No queue is invented. The sentence is `ACTIVE_RUN_SENTENCE`, reused from `runtime-view.mjs`.
3. **requested vs supported vs granted** — an action a runtime cannot perform reads as
   *not supported by that runtime*; an action it can perform that the permission owner has not
   reported reads as *not reported*. Neither becomes a denial, and neither asks for a runtime that
   has already been chosen.

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
  refuses to save whenever that is false, and the view renders the reason beside the withdrawn
  action. The `read-only` scenario exercises that branch rather than leaving it to a comment.
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
  revision; a failed save keeps the draft, stays retryable and keeps the keyboard on the retry; a
  successful save moves focus to the receipt; a conflict offers Reload, which brings the other
  writer's values and merges nothing; a host that cannot save says why beside the withdrawn action;
  drafts are per profile id and survive the list.
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
Viewport / scheme / keyboard / failure / zoom / fallback coverage: see the evidence notes
  (browser-journey.md for the first round, corrections.md for the return).
Checks: see evidence/agents-profile-journey-20260920/checks.txt
Visual change: new surface; there is no before. No baseline is proposed and no screenshot is offered
  as golden.
Author checks: lints, targeted suite, full suite, doc links — all in checks.txt
Independent review: Luna (controller/contract, 16/16 plus two counterexamples) and Astra (browser,
  OpenAI computer use) at 0f76407; six bounded returns AP-R1…AP-R6, all applied. Re-review of the
  changed seams pending.
Remaining work: the owners above must agree the proposed projection before anything is built against
  it; runtime management and Role-first Composer are the following slices and are not started.
```

## Corrections returned and applied

All six returns are applied inside the 06a controller/view/fixture/tests and this record. The only
existing-product change is still the one static-allowlist line; no backend, runtime CRUD, credential,
hook or Composer work was touched, and no new architecture API was created.

| ID | What was wrong | What changed | How it was checked |
|---|---|---|---|
| **AP-R1** | `openList()`/`openProfile()` closed the runtime detail without retiring its request epoch, so a reply already in flight could reopen it over the list. | `detailEpoch` is now retired by both navigations, next to the profile and save epochs they already retired. | New seam test: a gated detail read released after leaving for the list, and again after moving to another profile, leaves `runtimeDetail.status === 'closed'`. |
| **AP-R2** | `discardDraft()` had no guard at the controller boundary, and the divergent-draft branch adopted the confirmed detail while leaving `dirty: false` — a confirmed revision 5 sitting beside a draft that disagreed with it, reported as clean. | Discard is a no-op while a save is out, which is the rule the view already enforced. The divergent branch now adopts the confirmed detail, names its revision in the receipt, and re-measures the draft against it; it no longer implies the write was cancelled. | Two seam tests: save → discard → reply (discard refused, reply lands coherently), and save → edit → reply (write happened, receipt names revision 5, draft still `dirty`). |
| **AP-R3** | Pressing Save disabled the focused button, so focus fell to `body` on both success and failure; after a failed save the next Tab went to Back at the top of the form instead of the retry. | Focus is remembered as an intent, not lost: when the control that held it cannot take it, the key is kept and restored as soon as it can. Failure returns focus to Save; success moves it to the completed receipt, which is focusable only once it is a receipt. A pending restore is abandoned the moment anything else takes focus. | In the browser: failed save leaves focus on `save` and the next real Tab goes to `Discard changes`; successful save leaves focus on `save-receipt` reading the confirmed revision; focus moved to Back during a slow save is **not** taken back on completion. |
| **AP-R4** | With Pi unavailable, the row's only action opened a read-only runtime card whose only control was Close, so the profile could no longer be opened to choose another runtime. | A row has one action and it opens its profile. The unavailability travels with the person — in the row's own text, in the runtime row's explanation, and in the Runtime detail still reachable from inside. The speculative second destination is gone from the contract. | In the browser, Pi unavailable → row still reads `Open` → profile opens → blocker explains → choose Hermes → blocker clears → Save confirms a revision. Plus a seam test for the same path. |
| **AP-R5** | `capabilities.reason` was never rendered, so a host that cannot save would show a dead button and no reason; and a supported action with no reported effect read "choose a runtime", asking for a choice already made. | The reason is rendered beside the unavailable Save. The permission reading now distinguishes three silences: no runtime chosen, not supported by this runtime, and *not reported* by the permission owner. Two fixture states were added — `read-only` (`canSave:false` with a reason) and `grant-unreported` — and both are in the preview's scenario menu. | Two seam tests plus the browser: the reason renders with Save disabled and the draft still composable; `Read connected reference material` reads `Permission effect not reported` while the other effects are unaffected. |
| **AP-R6** | The contract and record said "no owner today" for facts whose owner exists but is not exposed; treated per-profile revision, the `{runId, revision}` binding and the composition save shape as implemented; claimed integration needs only an adapter swap; and called order 11's precondition satisfied. | Ownership is restated per Astra's disposition and the missing-implementation distinction is used throughout. Proposed fields are marked proposed in the `.d.ts` and in the table. The adapter-swap claim is withdrawn. The sequencing paragraph now says the precondition remains open under order 11. | `node tools/check-doc-links.mjs`; the corrected text is in this record and `app/web/agent-profiles-contract.d.ts`. |

Luna's F-05 is AP-R6 and is applied. Luna's additional note — a list refresh shows stale rows
without a loading indication until the reply lands — was recorded as a UI/continuity follow-up
rather than a correctness failure, and is **not** changed here; it stays open.

## Evidence

[Browser journey and its limits](evidence/agents-profile-journey-20260920/browser-journey.md) ·
[correction round](evidence/agents-profile-journey-20260920/corrections.md) ·
[author check output](evidence/agents-profile-journey-20260920/checks.txt) ·
[complete full-suite log on the corrected tree](evidence/agents-profile-journey-20260920/full-suite-corrected.log)
(1260/1260, zero failure markers; the npm exit code was lost to the capture, so the raw log stands
in for it rather than a claimed exit 0).

Every required interactive case was exercised in the browser and is quoted verbatim there: empty
list, loaded list, loaded profile, dirty draft, saving, confirmed revision, failed save with the
draft retained, stale-revision conflict and its recovery, runtime unavailable in both the list and
the detail, incompatible Kit/runtime, and the active-run freeze. Out-of-order replies are not
reachable by hand and are covered by gated-reply seam tests instead.

`app/tests/agent-profiles-specimen.test.mjs`: 22 tests, all passing — the original 16 plus the six
regressions the return asked for. They test the transitions and the adapter seam — late replies, the
three save guards, discard-under-save, detail invalidation on navigation, capability gating, draft
reconciliation on reopen, the purity of `projectProfile` — not the DOM the view builds.

The correction round's own browser checks are in
[the return evidence](evidence/agents-profile-journey-20260920/corrections.md): focus through a
failed and a successful save, focus not stolen back after the person moves on, the unavailable-runtime
recovery path end to end, and the two new capability/permission states.

## Limits, stated rather than implied

- **No backend.** Every reading in the preview is synthetic. A confirmed revision is confirmed by a
  `Map` in one browser tab.
- **The cast is an example, not a discovery.** "Pi", "Hermes", "Codex", "Praxis", the versions and
  the permission effects are invented for this preview. Nothing was read from this machine.
- **Escape-to-close** was not executable by the author (the pane's automated Escape does not reach
  the page; a bare control `<dialog>` behaved identically). Astra's independent run through an
  OpenAI computer-use provider did exercise it: the dialog closes and focus returns to
  `runtime-detail`. That fills the gap; it does not change the author's own provenance.
- **The browser driver is not the one the order names.** The order asks for an OpenAI computer-use
  provider; this was driven from the Claude Code in-app browser. The evidence is real interaction
  with a real browser, but it is not that provider, and an acceptor who needs that specific chain
  should re-run it.
- **One full-suite failure was never identified.** The author saw green, one failure, green across
  three runs and lost the failing name to a summary filter. Luna's independent run reports
  1254/1254 with zero failures and did not reproduce it. A later green run cannot reconstruct the
  earlier name, so it stays recorded as unidentified rather than explained away.
- **Real browser zoom at 200% was not used** — the equivalent halved viewport was, and it reflows
  without clipping or horizontal scroll.
- **Screen-reader verification was not performed.** Roles, labels and the live region are in place
  and the accessibility tree reads correctly, but no assistive technology was run against this page.
  This is not part of the old G4 campaign and does not inherit its coverage.
- **`precedents.md` is unchanged.** This surface is a candidate; promoting it is Astra's decision.

## Release

Claude releases the corrected slice and takes no further scope from order 06 until it is accepted.
No next frontend journey starts, and the stable order 11 handoff remains separately unaccepted. The source
and its evidence tree stay in place. The next serial frontend consumers — runtime connection and
local management, then the Role-first Composer — remain as the order describes them and are not
started.

## Astra round-2 acceptance — 2026-09-20

[Independent acceptance](evidence/agents-profile-round2-20260920/README.md) adopts AP-R1…R6 at `aca21c8`, after Luna 22/22 and Astra's bounded OpenAI browser checks; integrated main `b98e8ae` passes 28/28 seam/static-manifest checks. This accepts the synthetic frontend journey only. Order 11's stable handoff and basic real coding loop are now independently accepted; the historical early-start deviation remains. Proposed backend facts remain proposed. List-refresh continuity is assigned to the finite Claude dogfood-friction batch; native zoom, screen readers and long labels retain their disclosed gaps.
