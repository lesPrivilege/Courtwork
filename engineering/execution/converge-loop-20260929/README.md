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

### S7 · A revoke no longer deadlocks the configuration gate

- **Defect, reproduced (Sonnet probe, then the parent).** Revoking a repository candidate or binding cancelled the dependent Runs inside `#withConfiguration`, the Host's serial configuration queue. `cancelRun` waits for the Run to settle, and a `repo_write` the person has just approved queues on the same gate. With the approval landing while the revoke held the gate, neither finished:
  - the revoke never returned;
  - the Run stayed `stopping`;
  - every later configuration call hung, including in other Sessions;
  - the Host could not close.

  Found while checking the three copies of "revoke, then cancel dependent Runs" for divergence; the copies themselves were equivalent.
- **Fact owner.** Host service (`app/server/service.mjs`), the gate's scope; the Store already owns `runsToCancel`. Contract: [repository binding](../../../app/docs/repository-binding.md).
- **Change.** The revoke is still committed inside the gate. The dependent Runs are cancelled after the gate is released, by one helper that replaces the three copies; the `503 *_cancellation_pending` responses are unchanged. Nothing can use the revoked scope in between: every write, read and check rechecks the durable revocation, and a Run admitted afterwards carries no snapshot of it.
- **Checks.** New `repository-revoke-gate.test.mjs` races each kind of revoke against an approved write. It checks that both settle, the Run ends `cancelled`, no write is confirmed, the source is untouched and a later configuration change goes through. Both cases fail against the previous code (the Host cannot even close) and pass after. `npm --prefix app test` 1854/1854.
- **Non-author review (Sonnet).** Confirmed: the revocation is durable before release on all four paths (fresh, replayed, binding, binding replay); every return path has the new shape; errors and HTTP are unchanged. No other `cancelRun` runs inside the gate, and the only path from a Run into the gate is the repository write. Adopted: the test also asserts that no write was confirmed. The `503` pending path stays untested and is reachable only through a store failure.
- **Also cleared by the same probe.** The permission-mode lead is intentional:
  - `governTools` is the single enforcer for every tool, and the hard-coded `draft` only stops `ws_write` from asking twice;
  - the live permission-mode read equals the Run's frozen mode, because mode changes are refused while any Run is active.

### S8 · The Sources panel shows the Core's staleness verdict

- **Defect, reproduced.** The chat Sources panel (`web/chat-sources.mjs`) decided "Source revision changed" by comparing every candidate's source version with the Matter's. It was wrong both ways:
  - an accepted or rejected candidate from an older source raised a warning, though the Core never revokes historical decisions;
  - a pending candidate stale because the Matter version or contract moved raised none, though the Core treats it as stale and withholds its `decide` action.
- **Fact owner.** Work Core (`core/owner.mjs`, `candidateBasis`); contract [Work Core](../../../docs/work-core/contract.md). The web had recomputed one of the Core's three reasons.
- **Change.** `workProjection` gives each pending candidate `basis: {current, reasons}`, and `workPacket` passes it through. The panel's label and note follow pending candidates whose basis is not current: "Source revision changed" when a source moved, otherwise "Work version changed". The Work Core contract states the field.
- **Checks.** A new panel test fails against the previous web code, which labelled a decided candidate; a new Core test covers `basis` on pending and decided candidates. `npm --prefix app test` 1856/1856 on a clean run.
- **Non-author review (Sonnet).** It found a blocking bug in the first version: the status line still referenced the removed local variable, so every bound Work panel would have shown "Work sources unavailable". Fixed; the test now asserts that the panel never enters that state. It also confirmed:
  - no byte-for-byte or strict-key consumer of projected candidates;
  - `stateVersion` is unaffected;
  - no other local staleness computation in the web;
  - the new copy passes the copy convention.
- **Returned to the UX owner.** The two new strings ("Work version changed" and its note) are for the owner's copy review.
- **Flake observed.** Two full suites ran concurrently by mistake, and each showed load failures that pass alone. `models-save-flow` MS-R2 failed a second time under load; it is now a candidate for the known-flake list.

### S9 · Documentation follows S1–S8

- **Input.** A read-only Sonnet drift check of current documentation against the behavior S1–S8 changed. Archive, evidence, reviews and dated research are excluded; they keep their bytes.
- **Change.**
  - [HTTP API](../../../app/docs/api-v6.md):
    - `admissionOpen` is false whenever a Run is stopping or terminal;
    - a Run stays `waiting_user` until its last open question is answered;
    - one `run.status` event per status change;
    - a question opened after a cancel is never opened;
    - the deadline pauses from the first open decision to the last and never re-arms for a cancelling Run;
    - the common error list gains the compaction, idempotency, Spark and provider-route codes, and the two revoke `503 *_cancellation_pending` codes.
  - [Repository binding](../../../app/docs/repository-binding.md): the revocation commits inside the configuration queue; dependent Runs are cancelled after it is released; the `503` pending codes, and a replay retries the cancel.
  - [Supported preview](../../../app/docs/supported-preview.md): compaction is admitted only on a route a Run would accept.
  - [Runtime README](../../../app/README.md): the Host runs Git from `/usr/bin/git` with a closed environment.
  - [UX conventions](../../design/ux-conventions.md): seven Run statuses, not eight; `created` does not exist.
- **Returned to the public README owner.** The root `README.md` and `README.zh-CN.md` say only "Git 2.36+". Since S5 the Host needs Git at `/usr/bin/git`. The root README is generated from `site/src/readme.mjs`, and public README and Pages belong to the original Claude lane, so this loop does not edit them.
- **Checks.** `tools/check-doc-links.mjs`, `check-product-copy`, `check-pages-semantics` and `check-semantic-consumers` pass, and `node site/build.mjs` succeeds.

### S10 · Restart recovery: close, write fences, async evidence

Input: a Sonnet restart audit. For each in-flight state kind it checked what a restart leaves, and built reproductions for the gaps. Everything else holds:
- Host Runs, questions, Core Work Runs and their agreement (probed by SIGKILL and reopen);
- a crashed compaction, Spark assignments, coordination, remote actions and MCP dispatches;
- the Host's in-memory gates.

- **Defect B, reproduced: a graceful close left a compaction writing.** `RuntimeService.close()` cancelled Runs but never aborted or awaited running manual compactions. The Store lock was released while the summary request was still in flight. Its late result then wrote a compaction entry into the Pi journal after another Host could have reopened the data. Fix: close aborts each running compaction (reason `shutdown`, settled `cancelled`) and awaits it before cancelling Runs and before the Store closes.
- **Defect A, reproduced: a write fence skipped the restart settlement.** When `RuntimeStore.open` found a prepared repository write, it made the Run terminal itself, so `service.initialize` skipped it. The Run lost its partial answer and its `run.status` event. An unsettled MCP dispatch was then reported as `repository_write_unknown`, which lets the Run be continued despite the unreconciled remote effect. Fix: the Store fences the write and closes the Run's admission; the Host settles every still-active Run, choosing `mcp_effect_unknown`, then `repository_write_unknown`, then `restart_unknown`.
- **Minor, reproduced: async evidence overwritten.** `AsyncTasks.recover` rewrote tasks that were already `unknown` on every restart, overwriting their reason and revision. It now fences only `queued`, `dispatching` and `running` tasks.
- **Fact owners.** RuntimeService (close, restart settlement); RuntimeStore (effect fence, admission); AsyncTasks (task recovery).
- **Checks.** Each new or extended test fails against the previous code:
  - a close during a running compaction, with no journal write after close;
  - an interrupted write with and without an MCP dispatch;
  - a second restart keeps an async task's reason and revision.

  The existing compaction restart test now covers both paths. A graceful close settles `cancelled`; a crash-time state file restored before reopening settles `unknown` with `restart_unknown`.
- **Non-author review (Sonnet).** It found that the existing restart test had silently switched from the crash path to the graceful path; fixed as above. It confirmed:
  - no operation can be added after close snapshots them;
  - `runtime.mjs` is the only production Store open;
  - nothing between Store open and the restart loop acts on Runs;
  - `validateState` accepts the intermediate state;
  - only `unknown` stopped being touched by async recovery.

  Adopted: the Store test asserts the new contract (`running`, admission closed); the constant was moved below the imports. Noted: if the SDK ignores the abort, close waits for the compaction to finish, still before the Store closes.
- **Suite under load.** The machine ran at load average 12–29 during these runs, so full concurrent suites failed a varying one to three timing-sensitive tests. The runs where every file ran alone, three at a time, passed all but three files; each of those passes 3/3 when rerun alone.
  - `profile-editor` K5-R2 is on the known-flake list.
  - `local-pi-transport` and `models-save-flow` MS-R2 are recurring load flakes. MS-R2 has failed three times in this loop; it is a candidate for the known-flake list.
  - `work-summary`'s read-only test raced the Host's own post-Run writes: it lists the data directory right after the Run reports terminal, while `#executeRun`'s `finally` is still persisting, and a temporary file vanished between listing and reading. That race is in the test and predates this loop.
- **Defect C, next slice.** A check's detached process group outlives a Host crash and can keep writing to the candidate.

### S11 · A check's process group does not outlive its Host or its recipe

- **Defect, reproduced (restart audit, defect C).** `check-runner.mjs` spawned each recipe detached in its own process group and kept its timeout and kill timers only in the Host. A Host that died mid-check (SIGKILL, a crash) left the whole group running, able to keep writing the candidate while a restarted Host moved on.
- **First version, returned by review.** A guard (`runtime/check-guard.mjs`) became the group leader: it ran the recipe command and killed the group when the Host's end of its stdin pipe closed. Two reviews found the same gap:
  - a Sonnet review (F3);
  - Astra's independent review (CR1, below).

  The guard exited with the recipe's own process, so a descendant still holding the recipe's output was left unsupervised, and a Host that died next left it running. The Sonnet review also found that the guard re-raising the recipe's exit signal misreported signals Node itself handles (SIGPIPE, SIGUSR1) as exit code 1.
- **Correction.**
  - When the recipe's own process exits, the guard writes its exact status (`exit <code> <signal>`) on fd 3 and kills the whole group, itself included.
  - The Host takes the recipe's status from that report, falls back to the guard's close status when the guard was killed by a stop, and confirms on every exit path that the group is gone.
  - A start failure is still reported on fd 3 and mapped to `spawn_failed`.

  Behavior change: a normal exit now also ends anything the recipe left running. Reaping on every exit matches the D4 sandbox branch's runner change.
- **Fact owner.** Host check runner (`app/runtime/check-runner.mjs`, `check-guard.mjs`); contract [check recipes](../../../app/docs/check-recipes.md).
- **Checks.** New tests each fail against the reviewed guard and pass after:
  - a Host killed while the recipe runs;
  - a recipe that exits leaving a descendant: exit 0 is reported and the descendant is gone;
  - a Host killed after the recipe's leader exited;
  - SIGUSR1, SIGPIPE and SIGTERM reported as the recipe's own signal.

  The existing check test files pass: `check-recipes`, `check-runner-group-kill`, `check-approval-revision`, `check-approval-authored-files`, `p03e-write-check-parity`, `check-ui`, `prepare-and-approval`. Astra's [CR1 probe](evidence/astra-s10-s11/guard-exit-probe.mjs) now stops at its first measurement, because the descendant it expects to find alive has already been killed. The probe pins the defect, so this is the expected change.
- **Suite.** `npm --prefix app test` 1863/1863 on a clean run, with the MS-R2 test fix below.
- **Non-author check of the correction (Sonnet).** It compared the pre-guard runner (`a3321d1`) with the corrected one, side by side:
  - results identical for exit codes, self-signals, timeouts (TERM honoured, trapped or ignored), cancel, truncation and every `spawn_failed` case;
  - no lost exit report in 300 concurrent checks;
  - no survivors in 16 Host SIGKILLs at different moments, for both running and already-exited leaders;
  - fd 3 unreachable from the recipe, and a forged report line has no effect.

  Findings and dispositions:
  - Adopt: a recipe that sent HUP, INT or QUIT to its own group killed the guard and was reported by that signal. The guard now ignores those as well as TERM, with a test that fails before.
  - Accept as a stated limit: a recipe that kills the guard itself (`kill -KILL $PPID`) is reported as SIGKILL and loses Host-death supervision; the Host's timeout and reap still apply. The runner is not a sandbox.
  - Note: Astra's probe pins the old defect and now stops at its first measurement. It is Astra's evidence and stays unchanged; retiring or inverting it is for Astra's re-review.
- **Cost.** The guard is a second Node process per check: first output arrives about 65–120 ms later. Recipe timeouts are 120 s. Two `check-recipes` tests with 200–300 ms fixed windows became timing-sensitive; they now wait on the check's own output or allow 1.5 s.
- **Cleanup error during verification.** After running the new tests against the reviewed guard, the parent removed leftover test processes with `pkill -f 'sleep 30'`. That matches by command line rather than by the recorded pids, and could also have matched an unrelated process of the same name. Later cleanups use recorded pids only.

### S10–S11 · Independent handoff review by Astra

Source: S10 at `c280f8205c71659b242aa7e324f0cf8b6bb9bb5b`, plus the uncommitted S11 guard, runner, group-kill test and check-recipes documentation. [Source identities and verification](evidence/astra-s10-s11/verification.md). Product code was not edited, merged or pushed during this review. S1–S9 are outside this review's acceptance scope.

| Input | Disposition | Reason and landing |
|---|---|---|
| S10 close/restart/async changes | Adopt within the reviewed synthetic scope; no blocking finding | Read the commit and its production paths. The focused compaction, repository restart settlement and independent async recovery tests pass. Graceful close waits for compaction; repository write recovery retains partial text and gives unknown MCP effects precedence; an already-unknown async task retains its reason/revision. Saved-file compaction recovery is evidence for the startup transition, not a real process-crash/journal durability test. |
| S11 claim that the check group dies with its Host | Adopt finding CR1, P1; return S11 for correction | `app/runtime/check-guard.mjs:25-30` exits when the immediate recipe child exits, even when descendants remain. Reproduced with a noninteractive shell that starts a same-group `sleep` inheriting stdout and then exits. Both leader and guard are gone while the runner still awaits output closure; killing the synthetic Host then leaves the descendant alive. This is inside the process group, not the previously disclosed own-session limitation. |
| Claim that isolated rerun passes establish all prior suite failures as load flakes | Adjust | Isolated passes establish those runs passed, not the root cause of repeated failures. In particular repeated MS-R2 failures remain an unresolved verification issue until their timing mechanism is demonstrated or fixed. Follow [verification](../../verification.md#rules-consolidated-from-past-receipts); do not replace the missing successful suite result with an inferred one. This review did not reproduce those earlier failures. |

**CR1 evidence.** [Portable probe](evidence/astra-s10-s11/guard-exit-probe.mjs), [observed result](evidence/astra-s10-s11/guard-exit-result.json). It confirms the descendant's process group equals the guard's PID, that the runner has not settled before the Host crash, and that the descendant survives afterward. The probe cleans up and confirms removal of its own remaining child. Existing S11 tests exercise a still-running leader and therefore pass despite this gap. Required correction: keep lifecycle supervision until the remaining group has been handled, including a normal leader exit, while preserving the recipe's actual exit result. Add the leader-exits-first/Host-dies-next regression before claiming closure.

**Integration obligation.** S11 and the separate D4 sandbox delivery both modify `check-runner.mjs`. The guard's parent-liveness protocol and the sandbox's execution policy must be reviewed and tested together: normal exit, cancel, timeout, spawn failure, Host crash while the leader runs, and Host crash after the leader exits, with the sandbox still in force. The macOS own-session limitation remains explicit. The sandbox branch's reap-on-close change alone cannot close CR1 when a descendant still holds output open and the Host dies before `close`. No cross-branch integration or Linux verification occurred here.

**Checks.** Four existing test files, run serially with file concurrency 1: 19/19. Separate probes preserved exit code 7, SIGTERM, SIGKILL and `spawn_failed`. These passes do not discharge CR1 or the prior F3/D6 findings in the architect delivery. Full command, logs, source hashes and exclusions are in the linked evidence. Only this owner record, its current-status pointer and review evidence were edited.

### Author response to Astra's S10–S11 review

| Finding | Author disposition | Landing |
|---|---|---|
| CR1, P1: the guard exits before remaining descendants | Adopt | Corrected in [S11](#s11--a-checks-process-group-does-not-outlive-its-host-or-its-recipe): the guard reports the recipe's exit and kills the group at leader exit; the leader-exits-first and Host-dies-next regression is added. Closure is for Astra's re-review, not the author. |
| Repeated MS-R2 failures are not shown to be load flakes | Adopt; root cause found and fixed | The earlier wording in S10 is superseded. The cause is a test bug; the product has no race here. The test waited a fixed 50 ms after submitting the connection form, but the tiny DOM's `dispatchEvent` does not await the async handler, and saving a compatible connection is five sequential Host requests (about 13 ms on an idle machine) before "Connection saved.". Reproduced with a Sonnet probe: 5 of 12 runs failed under 12-process CPU stress, and every run failed with 30 ms injected per request. All failures were at the same assertion (`models-save-flow.test.mjs`, the "Connection saved." note). Fix: both fixed 50 ms waits in the file now poll for the outcome, the pattern its sibling test already used. With the fix, 10 of 10 runs pass under the same stress. |
| S11 and the D4 sandbox branch must be integrated and tested together | Adopt, not done here | The sandbox branch (`claude/architect-check-sandbox-20260929`, `c71c6b4`) is another author's unaccepted delivery; this loop does not merge it. The corrected guard already reaps the group on every exit path, the same line the sandbox branch changes. The two branches meet in `runCheckRecipe`'s spawn: the guard runs outside the sandbox and starts the sandbox's command, `execution.command` with `execution.argv`. Whoever integrates second owes the joint test matrix Astra lists, with the sandbox in force: normal exit, cancel, timeout, spawn failure, Host crash while the leader runs, and Host crash after the leader exits. |

### S12 · Test races found while verifying, fixed at their cause

Astra's review asked that repeated failures be explained, not labelled load flakes. Two were test bugs:

- **MS-R2** (`models-save-flow`): the root cause and fix are in the [author response](#author-response-to-astras-s10s11-review) above; landed with S11.
- **`work-summary` read-only test.** A Run's terminal status is written before `#executeRun`'s `finally` has finished persisting its own settlement (question cleanup and the rest). The test snapshotted the data directory right after the status turned terminal. A write still in flight then showed up as a change, or its temporary file vanished between listing and reading (`ENOENT`, seen once in S10's runs).
  - Reproduced by delaying the post-Run question cleanup by 40 ms: the previous test fails with that exact `ENOENT`; the fixed test passes.
  - Fix: the test waits until the Host has released the Run (`service.active`) before snapshotting.
  - Product behavior is unchanged: the read path under test writes nothing.

- **`local-pi-transport` and `local-pi-upstream`.** Each raced a short fixed deadline against real process startup; the product has no race here (Sonnet investigation, reproduced on demand):
  - `local-pi-transport`'s timeout-escalation test used a 180 ms deadline. The child needs about 145 ms idle to boot, import its fixture and spawn its grandchild. A deadline that fires first kills it before its TERM handler exists, so nothing escalates.
  - `local-pi-upstream`'s callback-interruption test relied on a 1 s deadline firing while its native-receipt callback hung. Pi's first event takes 0.5–1 s idle, so under load the deadline fired before the callback was ever entered and produced a plain cancellation.
  - Both were forced deterministically by injecting startup delays.
  - Fixes: the escalation test's deadline is now 2.5 s. The interruption test aborts from inside the hung callback, the same termination path without the timing dependence.
  - Under 24-process CPU stress, the previous tests failed 3/5 and 5/5; the fixed tests 0/5 and 0/5.

Still unexplained: `profile-editor` K5-R2, on the known-flake list, not reproduced in this loop.

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
