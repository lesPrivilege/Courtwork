# Convergence loop, 2026-09-29

Owner record for the serial documentation and source convergence loop.

## Scope and authority

The user, 2026-09-29, in the session that ran the [documentation convergence](../../research/document-governance-2026-09-28/README.md) and the [doc-driven code review](../../reviews/doc-driven-code-review-2026-09-29/README.md):

> 后续长任务皆可串行做，依然从第一性原理出发，整理文档、重构源码，开放 opus 、Sonnet 作为 worker 或 explorer，parents 掌握 loop 节奏即可。

(Long tasks may continue serially, still from first principles: organize documentation and refactor source, with Opus and Sonnet open as workers or explorers; the parent session paces the loop.)

- **Writer:** the Claude (Opus) parent session, on branch `claude/converge-loop-20260929` in its own worktree. Sonnet and Opus subagents explore, review and do bounded edits; the parent rules, reviews every diff and commits.
- **Lanes:** the directive opens source refactoring to this loop, including code inside the Astra core lane and the original Claude UX lane. The loop does not take over those lanes' queues or decisions. Each slice is behavior-preserving or fixes a reproduced defect; acceptance stays with Astra (core) or the UX owner (UI). Authors do not accept their own work.
- **Selection rule:** [architecture change boundaries](../../architecture.md#change-boundaries). A slice needs a reproducible invariant failure, a concrete coupling named by a stated rule, or an obsolete path. File length or tidiness alone is not a reason.
- **Not authorized by the directive:** pushes, deployment, paid provider or real-model runs, restarting the user's Host, and removal of capabilities that an owner record lists as accepted or deferred. Those removals are listed under [Needs a ruling](#needs-a-ruling).

## Inputs

Three read-only Sonnet surveys against `main` at `87e2207`: architecture-boundary violations; obsolete paths and dead code; the responsibility map of `app/server/service.mjs`. Their findings are disposed in the slices below or under [Needs a ruling](#needs-a-ruling). A finding is not adopted until the parent reproduces or reads the evidence.

Baseline at `87e2207`: `npm --prefix app test` 1844/1845. The failure, `review-core-client-lifecycle`, is the known concurrent flake in [verification](../../verification.md) and passed 13/13 when rerun alone.

## Slices

Slices run in order. Each entry records the defect or coupling, the fact owner, the change, the checks and the non-author review.

### S1 · Persisted state must load again

- **Defect, reproduced.** Deleting a Chat that had a manual compaction record kept the `operations` row, which names the deleted Session. The Store validates the whole state only on load (`validateOperations`), so the next Host start refused the state file: `invalid runtime state: operation.sessionId`. Found by the `service.mjs` survey (refusal gap) and reproduced against `87e2207`.
- **Root cause.** Each Store write checks only what its own mutation touches (`validateLocalPiEvents`, `validateKitBindings`, `validateExecutorState`); nothing held a write to the load rule. An experiment that ran `validateState` on every write found one more divergence: `createSession` accepted a missing `workspaceDir` outside `unassigned` scope, which the loader rejects (test fixtures only; the service always passes one).
- **Fact owner.** Host RuntimeStore (`app/server/store.mjs`), Astra's core lane; contract [HTTP API](../../../app/docs/api-v6.md). Nearest precedent: `deleteSession` already cascades runs, events and questions.
- **Change.**
  - `deleteSession` also removes the Session's compaction records and refuses while that Session's compaction runs; the service refuses `409 operation_active` while any compaction runs, beside the existing any-Run `409 active_run`.
  - `createSession` requires a workspace for every scope.
  - Kit binding validation, which every write runs, indexes `runtime.bound` events once per call instead of filtering all events per Run; the load validator does the same for event → Run lookups.
- **Why not validate every write.** Measured on a synthetic 3,000-Run / 30,000-event state: `validateState` about 0.9–1.7 s; the existing per-write clone and serialization about 1.1 s. Validating each write would roughly double the cost of a write. Instead, every Host a test boots is held to the load rule once when it closes (`tests/helpers.mjs`), which covers the whole suite without a production switch.
- **Measured side effect.** Per-write Kit validation at 3,000 Runs: about 923 ms before, 1.4 ms after (1,000 Runs: 102 → 1.9 ms).
- **Checks.** A new CMP-01 test (compact, delete, restart) fails without the fix and passes with it; the refusal test asserts `409 operation_active` for deletion during a compaction. Each test file alone under the close check: all pass after two fixtures pass a workspace.
- **Suite.** `npm --prefix app test` 1846/1846.
- **Non-author review (Sonnet).** All six claims confirmed. Evidence: store-level probes; a 300-case differential fuzz of the old against the new Kit validator; a check of every collection the loader reads for references a delete leaves behind. `asyncTasks` are retained by design, and the validator accepts their missing Session. Findings and dispositions:
  - Adjust, returned to the UX owner: the delete dialog shows "Unavailable while a Run is active." for any 409, and the row's Delete stays enabled during a compaction (`web/app.mjs` delete dialog, `web/object-commands.mjs`). The refusal is correct; only the copy and enablement lag.
  - Adopt as stated: a close-time validation error in a test's `finally` replaces that test's own error. This is intended; the persisted-state failure is the stronger signal.
  - Defer: Hosts started directly through `startServer` or `RuntimeStore`, not through the helpers, are not held to the close check. Reopen if a divergence shows up in a Store-level fixture.

### S2 · One provider route for every model request

- **Gap, reproduced.** Run admission and manual compaction both send model requests, but compaction repeated only part of Run admission's provider checks. It skipped descriptor validation, the per-kind route and admissible-model checks, and the reasoning-effort check. With a saved effort the model no longer supports, a Run was refused `503 effort_unsupported` while a compaction was accepted (`200`) and sent the summary request with that effort. Found by the `service.mjs` survey (candidate 3).
- **Fact owner.** Host service Run admission (`app/server/service.mjs`); contracts [HTTP API](../../../app/docs/api-v6.md) and [commands and compaction](../../../app/docs/commands-and-compaction.md).
- **Change.** Run admission's route checks moved unchanged into `#admitProviderRoute()`, evaluated against the saved configuration; Run admission and compaction both call it. The command catalog reports `/compact` unavailable on a route it refuses. The provider-save path keeps its own 400-level input validation, and provider verify keeps its own gate; both are separate contracts.
- **Checks.** A new CMP-01 test fails against the previous `service.mjs` (`200` instead of `503`) and passes after the change. `npm --prefix app test` 1847/1847.
- **Non-author review (Sonnet).** Run admission is equivalent: the moved checks read only fields the derived Run provider copies unchanged; no `await` separates the gate from the copy; the Local Pi `baseUrl` override applies to the copy afterwards. No previously valid compaction is refused: only the Pi port supports compaction, and 14 affected test files pass. The only other model-request path, provider verify, has its own gate. Dispositions:
  - Adopt as stated: a compaction whose model no longer resolves now reports `503 provider_unsupported` instead of `503 provider_error`, the same as a Run. The later `!model` guard stays as a defensive check.
  - Adopt as stated: route refusals (503) now precede `409 compaction_unavailable` and `409 credential_missing`, the same order as Run admission.

### S3 · Run liveness while a person decides

Input: the `service.mjs` survey (candidates 1 and 2) and a follow-up liveness survey. That survey checked every site that decides whether a Run still accepts work. All the `admissionOpen` gates hold, because every writer of a stopping or terminal Run also closes admission. Nothing enforced that pairing.

- **Defect 1, reproduced: `stopping` went back to `waiting_user`.** `openQuestion` refused only terminal Runs. A question queued behind a cancel moved the Run `stopping → waiting_user → cancelled`, briefly showing "Waiting for you" and re-enabling the Attention stop button. Answers were already refused.
- **Defect 2, reproduced: parallel questions.** Pi runs one turn's tool calls in parallel, so two questions can be open at once. Answering the first re-armed the execution deadline while the second still waited on a person; the Run ended `unknown` from the budget. It also reported `running` while a question was still open.
- **Defect 3, found in review, reproduced: a cancel reported as a budget failure.** Once the deadline re-arm moved to where a decision ends, a decision ended by a cancel re-armed it. With little budget left and a slow model reply, the deadline fired and the cancel settled `unknown`.
- **Obsolete path.** `cancelRun`'s fallback after `await entry.task` recomputed a final status with a second, weaker rule. It was unreachable: `entry.task` is set when the entry is created, and `#executeRun`'s settlement either makes the Run terminal or rejects. Instrumented, the full suite never reached it.
- **Fact owner.** Host service and RuntimeStore (`app/server/service.mjs`, `app/server/store.mjs`); precedents are review D1–D3 (terminal arbitration) and the existing `resolveQuestion` admission recheck.
- **Change.**
  - `openQuestion` refuses a Run whose admission is closed, and the wait ends as an abort does.
  - The Store closes admission whenever a patch leaves a Run `stopping` or terminal.
  - `#waitForDecision` counts open decisions: the first pauses the deadline, and the last re-arms it only for a Run that is still running or waiting and not being cancelled. The re-arm in `answerQuestion` is gone.
  - A Run stays `waiting_user` until its last open question is answered; a status event is written only when the status changes.
  - The `cancelRun` fallback is removed.
  - The fixture provider can send several tool calls in one message.
- **Checks.** `npm --prefix app test` 1851/1851. Four new tests, each failing against the code before its fix:
  - a question queued behind a cancel;
  - admission closing on stopping or terminal patches;
  - two open questions and the deadline (`T-USAGE-5b`);
  - a cancel during a question with a slow model reply.
- **Non-author reviews (Sonnet, two).** The first confirmed that the fallback was unreachable, that every tool path treats the refused question as an abort, and that no writer keeps admission open when stopping. The second found defect 3 and two edges. Dispositions:
  - Adopt: defect 3, fixed with a test.
  - Defer: a decision ending after `#executeRun`'s `finally` has paused the timer would arm a timer nothing clears. Pi awaits every parallel tool call before the loop returns, and no path reaches this. Reopen with a runtime that returns while a decision is pending.
  - Defer: an orphaned pending question keeps its Run `waiting_user`. A signal abort in Pi aborts the whole Run.
  - Low, pre-existing: in the MCP-unknown state (`running`, admission closed) a question is now refused rather than opened unanswerable, and the deadline re-arms after it.
- **Also observed.** `models-save-flow` MS-R2 failed once under the concurrent suite and passed 3/3 alone. It is not yet on the known-flake list; reopen if it recurs.

### S4 · Remove verified dead code

- **Input.** The obsolete-paths survey. Only items with no caller anywhere were taken, each re-checked by a repository-wide grep before removal. Exports that only tests call are kept as test seams.
- **Writer.** A Sonnet worker with an exact file list; the parent reviewed the diff and removed the one symbol the worker skipped because its type declaration was outside the list.
- **Removed.**
  - The `extensions/evidence-memo/server/core-client.mjs` compatibility re-export and the test that only checked that it resolved.
  - Unused exports and aliases:
    - NDA fixtures and adapter aliases, and `PLAYBOOK_RULES_VERSION`;
    - file-memo schema aliases;
    - fixture-provider alias constants and `fakeProviderDescriptor`;
    - `providerIdentityOf` and `isUserConnection`;
    - `COMMAND_KINDS`, `PROPOSAL_KINDS` and `BUILTIN_PROFILE`;
    - `AGENTS_API_EXPOSURE_RULE` and its declaration.
  - The web copy of `normalizedType`, which now comes from `thread-projection.mjs`.
  - The Run status `created` in the web layer. The Host never writes it: `createRun` writes `running`, and the loader admits only the seven Run statuses.
  - `validateState`'s `legacyDescriptors` option, which every caller set to the same value.
- **Kept, needs a ruling or a data decision.** The legacy skin-token format, which reads existing browser preferences; tokenless Spark samples; segment-less stream events; the credential key-space migration; the web's legacy `runtimeSelection` branch. See [Needs a ruling](#needs-a-ruling).
- **Checks.** The worker ran each of the 117 test files that import a touched module; `tools/check-doc-links.mjs` passes. The parent reran the Agents API tests after the last removal. `npm --prefix app test` 1852/1852 with S5.
- **Returned to the UX owner.** `TAB_ACTIVITY` labels `stopping` as "Running", while the thread, inspector and activity line say "Stopping" (`web/app.mjs`).

### S5 · Artifact history Git gets a closed environment

- **Divergence, from a read-only audit of every Host subprocess.** Every model-reachable child already gets a closed environment allow-list:
  - `check_run`;
  - the repository Git and filesystem helpers;
  - the Core bridge;
  - the Local Pi child.

  One child did not. `runtime/artifact-history.mjs` passed the Host's whole environment minus `GIT_*` to `git`, resolved through `PATH`. Any provider key, agent socket or loader variable in the Host's environment reached it; startup strips only `DEEPSEEK_API_KEY` and `OPENAI_API_KEY`. It is not model-reachable, so this is hardening of a divergent copy of the same rule, not an exploit.
- **Change.** A closed allow-list and an absolute `/usr/bin/git`, matching the repository helpers. `ArtifactHistory` takes a `gitBinary` option, following the `gitBinary` precedent in `repository-candidate.mjs`. The cancellation test injects its slow Git through that option instead of `PATH`, which the fix no longer consults.
- **Checks.** A new test runs a Git stub that records its environment. It checks that the child sees exactly the allow-list and none of a probe variable set in the Host. `artifact-history`, `artifact-history-storage`, `p03c-host-consumer`, `kit-profile-preview` and `repository-candidate` pass.
- **Non-author review (Sonnet).** No blocking findings:
  - every subcommand used runs under exactly this environment, including through the macOS `/usr/bin/git` shim, with no `HOME` warning;
  - CI runs on `ubuntu-latest`, which has `/usr/bin/git`;
  - all constructor call sites still work.

  Adopted: the environment test now asserts the values as well as the key set.
- **Not changed, with reason.**
  - The same audit repeats a finding that already has an owner: `check_run` children run candidate code as the Host user, so they can read the credential file by path whatever their environment. That is D4 containment under [RD-009](../../research/RD-009-trusted-harness-extensions.md), still open.
  - The directory picker and `repository-git-status` forward the real `HOME`. `repository-git-status` neutralizes global and system Git config and runs only `rev-parse`, so this is recorded here without a change.

### S6 · Architecture states what the code has

- **Doc drift, from the architecture-boundary survey.**
  - The module map omitted much of the running code: the composition root, provider connections and credentials, the model tool catalog, ArtifactHistory, the extension catalog, the managed Agents-API port, the Hermes adapter and intake.
  - The Runtime Port section undercounted the remaining Pi coupling.
  - Data ownership did not say that the Core keeps its own Work Run beside the Host Run, or who reconciles the two.
- **Change.** In [architecture](../../architecture.md):
  - Module-map rows for those modules, each naming its contract.
  - The Pi coupling listed with the files involved: tool schemas built with pi-ai's `Type`, `parseFrontmatter`, `validateToolArguments`, and the Pi version inside the persisted executor id.
  - A Data ownership paragraph separating the Host Run from the Core Work Run: owners, settlement through the extension adapter, restart and reconcile. It also separates the Session's Matter binding (Host) from Matter project ownership (Core).
  - [current](../../current.md) gains this loop's lane and open-work rows, and the UX queue row gains the two items returned from S1 and S4.
- **Checks.** `tools/check-doc-links.mjs` reports no link problems. Anchor mode reports five pre-existing problems in archived design and evidence files, none from this change.
- **Non-author fact check (Sonnet).** Every added statement was checked against the code. Corrections adopted:
  - weaker or wrong contract links in five module-map rows;
  - "every model tool" narrowed, since MCP and Work Extension tools use plain JSON schema;
  - the Host marks in-flight Runs `unknown` in service initialization, not on store load;
  - orphan reconciliation happens after a failed settlement;
  - review coverage in current stated per slice.

## Needs a ruling

These are removals or data decisions that the directive does not settle, because an owner record lists the code as accepted, deferred or preview capability.

| Item | What it is now | Question for the user |
|---|---|---|
| Hermes `/v1/runs` adapter (`runtime/hermes-api-runs-adapter.mjs`, `-transport.mjs`, `docs/hermes-api-runs.md`, about 720 lines) | Accepted as a standalone adapter; the Host never registers it; native Hermes stays blocked by the permission refusal | Keep it as the parked consumer for a future Hermes decision, or remove it until that decision is revisited? |
| Managed Agents-API executor (`runtime/agents-api-adapter.mjs`, `agents-host-gateway.mjs`, `openai-agents-transport.mjs`, about 1,500 lines) | Only an injected trusted factory wires it, and `npm start` does not; schema 22's executor choice names it | Keep as a tested seam until credentials and budget are authorized, or remove it together with its schema-22 executor identity? |
| Local Pi worker (`runtime/local-pi-*.mjs`, about 880 lines) | Opt-in `localPiWorker`, off by default; schema 20 depends on it; listed as a dormant residual | Keep dormant, or remove with a schema step? |
| Runtime-management and agent-profile specimen pages (`web/runtime-management*.mjs`, `web/agent-profiles*.mjs`, about 2,450 lines with contracts, fixtures and preview scripts) | Served only through the static allow-list; live runtime management is deferred | Keep as specimens for the deferred UI, or remove until that UI is scheduled? |
| Data-format compatibility: the legacy skin-token format in browser preferences, stream events without segments, the `credentials.json` key-space migration, `legacyWithoutControlSnapshot` Runs | Each reads data written by an earlier build | Can existing local data be declared unsupported, so these readers go? This needs a data ruling, not a code one. |
| `check_run` containment (D4) | Candidate code runs as the Host user and can read the credential file by path | Already open under [RD-009](../../research/RD-009-trusted-harness-extensions.md): choose an OS sandbox, a data directory the check cannot read, or an accepted limitation. |

## Deferred

These are findings kept with a reason; each reopens when its trigger occurs.

- **Domain branches in the generic Run loop.** `service.mjs` hard-codes the Work Extension ids `evidence-memo` and `inbound-nda` six times, and runs file-memo input limits and hooks inside `#executeRun`. Both are real coupling under [dependency boundaries](../../architecture.md#dependency-boundaries). By [change boundaries](../../architecture.md#change-boundaries) the trigger is a new domain, and none is scheduled. Reopen when a third Work Extension or a file-memo profile change is scheduled: move the capability behind the extension adapter (`extensionRun` hooks).

- **Whole-state rewrite per Store write.** Every mutation clones and serializes the entire RuntimeStore state, about 0.3 s per write at 1,000 Runs and 1.1 s at 3,000 on the synthetic state above; coalesced streaming snapshots are writes too. This is the storage design (architecture unit M06), not a slice. Reopen when a user's store reaches a size where writes are felt, or when storage is replaced.
