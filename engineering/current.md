# Current engineering status

This page is a maintained snapshot: where the work stands and where to continue. It is edited in place. Events, receipts, test output and acceptance detail belong in the owner record linked from each row, not here. The dated log that this page used to accumulate, 2026-09-08 to 2026-09-29, is kept as [history](archive/current-log-2026-09-08-to-2026-09-29.md).

Last reconciled: 2026-09-29, against local `main` after the documentation convergence and the D1–D5 fixes.

## Baseline

| Fact | Now | Owner of the fact |
|---|---|---|
| Main line | `main` = `origin/main` at `6cb47b1` (pushed 2026-09-29 from `ffe68fb`: documentation convergence and the D1–D5 fixes; [push receipt](reviews/doc-driven-code-review-2026-09-29/publication.json)). Remote CI results are not recorded. | Git; push receipts in the pushing task's evidence |
| Default test suite | `npm --prefix app test`: 1833/1834 at `ffe68fb` (a stale N07-R1 source assertion, fixed as D11); 1845/1845 with the D1–D5 fixes. A green suite is not acceptance; see the review's open findings. | [Verification method](verification.md) |
| Data schemas | Host RuntimeStore 22; Core user 4; bridge app 5. They evolve separately; upgraded data is never shared with an older Host. | [Runtime data and migration](../app/README.md), [architecture](architecture.md#data-ownership) |
| What production startup actually wires | In-process Pi 0.85.1 only. Local Pi process: opt-in `localPiWorker`. Managed Agents-API executor: only with an injected trusted factory, not wired by `npm start`. Hermes: standalone `/v1/runs` adapter, not registered with the Host. Kit admission: in-process Pi only. | [Supported preview](../app/docs/supported-preview.md) |
| End-to-end check, 2026-09-29 | Real UI with the deterministic Local test executor: bind a Matter, tool-submitted candidate, human accept with reason, Host restart, new chat continues the same Matter and reads the accepted Artifact. Real-model capability was not exercised. | [2026-09-29 review](reviews/doc-driven-code-review-2026-09-29/README.md#end-to-end-walkthrough) |
| Public surface | Install and screenshot pins `fd96f96`; last recorded Pages deployment 2026-09-15 (`fe7f317`); Paper adoption pinned to SE 9.6. | [Public readiness](execution/2026-09-08-main-round/public-readiness.md), [PAPER.md](../PAPER.md) |

## Who holds what

| Lane | Holder | Source |
|---|---|---|
| Architecture, integration and migration decisions; independent acceptance and main integration | Astra | [AGENTS.md](../AGENTS.md) |
| Critical core implementation (Host, Runtime, Core) | Astra, after external-reference recall (user, 2026-09-28) | [core-runtime-loop](execution/claude-frontend-harness-2026-09-16/core-runtime-loop-20260921.md#2026-09-28--external-recall-and-astra-core-ownership) |
| All UX decisions and implementation; serial frontend writer | Original Claude (user-expanded, 2026-09-28) | [UX record](execution/claude-frontend-harness-2026-09-16/ux-polish-release-20260924.md#user-expanded-ux-ownership--2026-09-28) |
| Documentation governance convergence and the doc-driven code review | Claude (Opus) session with Sonnet explorers/workers (user, 2026-09-29) | [intake](research/document-governance-2026-09-28/README.md) |
| Review fixes D1–D5 (Run terminal arbitration, `check_run` approval and process-group cleanup) | Claude (Opus), reassigned from Astra by the user on 2026-09-29; D6, D7, D9, D10 stay with Astra | [review](reviews/doc-driven-code-review-2026-09-29/README.md#fixes-after-reassignment) |
| Serial convergence loop: documentation and source refactoring across lanes, one reviewed slice at a time | Claude (Opus) session with Sonnet and Opus workers (user, 2026-09-29). Lane queues and decisions stay with their holders; acceptance stays with Astra for core and with the UX owner for UI | [convergence loop](execution/converge-loop-20260929/README.md) |
| Exploration and non-author verification | Luna; Sonnet via Claude. Sol for isolated, disjoint backend work. | [RD-005 routing](research/RD-005-multi-agent-selection.md#2026-09-20--current-execution-routing) |

Authors do not accept their own work. A lane grants implementation authority inside its scope only; paid runs, key entry, pushes and deployment still need the user's authorization for that action.

## Open work

| Thread | State | Next or open obligation | Owner record |
|---|---|---|---|
| UX queue | Active, original Claude | P1 narrow Composer labels (375/390 px), then answered `ask_user` selection/toggle. Returned from the 2026-09-29 review and convergence loop, order for the owner to decide: U1 Enter cancels the project/rename/session dialogs; U2 Continue in Matter lists Matters by ID; the delete dialog calls every 409 "a Run is active" and Delete stays enabled during a compaction; the tab activity label says "Running" for `stopping`; review the new Sources-panel copy "Work version changed". For the public README (generated from `site/src/readme.mjs`): the Host now needs Git at `/usr/bin/git`. From the loop's S20 web projection fixes:
- review the new strings;
- the dead question-card branch;
- whether to show the provider-config `configurationStatus` and hold Send on an unavailable route;
- per-scope profile selectability;
- a Host frozen fact for Delete and configuration controls. Not claimed: physical touch, Safari, full accessibility matrices, whole-product UX. | [UX record](execution/claude-frontend-harness-2026-09-16/ux-polish-release-20260924.md) |
| Doc-driven code review findings | Partly fixed | Fixed: D1, D3, D5, D11. D2 ruled by design. D4: the approval names the model-written files, but `check_run` still runs with Host rights beside credentials (containment open under RD-009). With Astra: D6/D9/D10 small permission and HTTP-outcome fixes, D7 optional hardening. With UX: U1–U2. A non-author Sonnet review found one D4 defect (unknown-outcome writes omitted), since fixed; no Astra or human acceptance yet. | [2026-09-29 review](reviews/doc-driven-code-review-2026-09-29/README.md) |
| Convergence loop | Paused for integration with `claude/architect-integration-20260929`: trial merge conflicts in 7 files (check runner, path policy, docs); S11 corrected for Astra's CR1, awaiting re-review; branch `claude/converge-loop-20260929` not merged or pushed | Seven reproduced defects fixed with tests:<br>• deleting a compacted chat broke the next start;<br>• compaction skipped Run provider-route checks;<br>• a question queued behind a cancel reopened the Run;<br>• parallel questions restarted the deadline;<br>• a cancel could settle as a budget failure;<br>• a repository revoke deadlocked with an approved write;<br>• the Sources panel recomputed staleness wrongly;<br>• (S10–S13) close and restart recovery, the check process guard, Spark findings lost at close, parallel Spark delegation; (S14) unreadable replaced sources, undecidable duplicate-obligation candidates, human actions racing Run admission; (S15) MCP calls over 15 s cut to unknown, orphaned async tasks unsettleable; (S16) a saved key sent to a changed endpoint, provider key echoes into the journal, telemetry and logs, ambient OpenAI SDK env; (S17) case-variant material names, concurrent profile saves, cross-scope profile selection, Runtime Control left by deleted Sessions, an unreachable 1 MiB material limit, workspace deny rules bypassed by case; (S19) one oversized Matter breaking the governance directory, runtime Attention paths skipping Matter disclosure; (S20) the web showing unknown Runs as Failed and coded refusals as unconfirmed deliveries.<br>Also: per-write Kit validation made linear, verified dead code removed, artifact-history Git environment closed, architecture module map and Run-record ownership documented. S1–S3, S5, S7 and S8 had non-author Sonnet reviews, S4 is worker output reviewed by the parent, S6 was fact-checked by Sonnet; Astra's S10–S11 review finds no blocker in S10's tested scope and returned S11 for CR1 (guard exits before remaining descendants), since corrected and awaiting re-review; S1–S9 and UX acceptance are not covered. See the owner record for the required D4 sandbox integration checks. Removals of accepted, deferred or preview code wait for the user's ruling. | [convergence loop](execution/converge-loop-20260929/README.md) |
| Hermes native runtime | Blocked | Native API-server execution is refused by the original permission review, and the refusal stands. The standalone adapter is accepted ([acf5694](execution/claude-frontend-harness-2026-09-16/evidence/hermes-protocol-final-20260927/README.md)). Native profile/MCP tool-loop conformance exists only as author evidence on branch `claude/runtime-settings-i1-20260927` (`224d221`, head `ebb735b`); it is neither reviewed nor adopted. | [core-runtime-loop](execution/claude-frontend-harness-2026-09-16/core-runtime-loop-20260921.md#2026-09-27--next-hermes-consumer-native-profile-and-mcp-tool-loop-conformance) |
| Public readiness | Open | G1 fresh-user configuration, G4 residuals, timed media, whole-release acceptance. G5 fact mapping is accepted. Public README/Pages/media stay with original Claude. | [public readiness](execution/2026-09-08-main-round/public-readiness.md) |
| Attention × Hermes integration | Research registered; waits on Hermes | Full Attention tool/Host integration needs native tool lockdown and Run-bound authority. | [Attention research](research/attention-assistant-20260927/README.md) |
| Live runtime management and executor selector UI | Deferred | Production runtime-management API and native credentials are unimplemented; inventory rows report `not_checked`. | [06c](execution/claude-frontend-harness-2026-09-16/06c-runtime-management-20260921.md) |

## Dormant residuals

These were stated as open by earlier entries and have no active owner. They stay closed to new work until a named trigger occurs; the owner record keeps the detail.

| Residual | Reopen when | Owner record |
|---|---|---|
| Local Pi exact-root recovery; extension lifecycle and hooks | A user-operable Local Pi or hook consumer is scheduled | [local-pi-worker-loop](execution/claude-frontend-harness-2026-09-16/local-pi-worker-loop-20260922.md), [gap map](execution/claude-frontend-harness-2026-09-16/evidence/harness-gap-map-20260923/README.md) |
| Composer CE-F2 initial focus/scroll; lost post-create bind/read-back replies | Composer creation flow changes | [06b](execution/claude-frontend-harness-2026-09-16/06b-dogfood-friction-20260920.md) |
| Host-persisted, reload-restored Kit draft (G1 draft) | Kit authoring is scheduled | [K3 contract](execution/claude-frontend-harness-2026-09-16/kit-run-binding-20260922.md) |
| Streaming poll cadence, row rebuilds, measured TPS and motion recipe | Streaming performance is reported as a user problem | [streaming](execution/claude-frontend-harness-2026-09-16/live-assistant-text-streaming-20260916.md) |
| Live Agents-API probes; durable remote binding | The user authorizes credentials and budget for a managed runtime | [Agents API research](research/agents-api-first-2026-09-14/README.md) |
| Main-node N-list (N-02, N-03, N-05, N-07, N-09, N-13) and slice 10 | Their areas are next touched; check each against current code first | [node acceptance](execution/claude-frontend-harness-2026-09-16/node-acceptance-20260919.md) |
| Coordination heartbeat `courtwork-claude` | Its status is unknown since it was paused on 2026-09-23; confirm before relying on it | [status log](archive/current-log-2026-09-08-to-2026-09-29.md) |

## Standing boundaries

- No paid provider or real-model run, user key entry, restart of the user's Host (port 8787), push or deployment unless the user authorizes that action. The 2026-09-08 main takeover is neither deployment nor product acceptance.
- The native Hermes permission refusal stands until the user revisits it.
- Test counts belong to the command and source that produced them. A green suite supports only its assertions; architecture, capability and end-to-end claims need their own evidence ([verification](verification.md)).

## Maintaining this page

When work changes state, first update its owner record, then edit the matching row here: state, next step, link. Add a row only for a new active thread. Remove a row when its thread is accepted with nothing left open; the owner record keeps its history. Do not add dated entries, receipts or test output. See [governance](governance.md#status-and-history).
