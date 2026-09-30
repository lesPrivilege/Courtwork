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

- **`profile-editor` K5-R2**, formerly on the known-flake list. `save` awaits a WebCrypto SHA-256 digest before calling the adapter, and the digest runs on libuv's thread pool. The test waited one `setTimeout(0)` tick for the held adapter call; when the thread pool was busy, that tick ended before `release` existed ("release is not a function").
  - CPU stress alone did not reproduce it (0/8), because the thread pool, not the CPU, sets the timing. Occupying the pool with eight `pbkdf2` jobs just before the save reproduces the exact error in the previous test.
  - Fix: the test waits until the save is actually held in the adapter; the fixed test passes under the same load.
  - [Verification](../../verification.md) no longer lists K5-R2 as a known flake. It now states that an intermittent failure is closed by a demonstrated mechanism, not by a passing rerun.

- **`review-core-client-lifecycle`**, the last listed known flake, which also failed in this loop's baseline.
  - Every archived failure is the second test ("a request with no response…") at about 2003 ms with `bridge ready timeout`.
  - The fixture execs `worker.py` directly. On macOS the first exec of a freshly created executable is checked by the system: 0.25–0.6 s idle, rising to seconds when many fresh executables start at once (probe first-exec 0.56 s alone, 3.0 s beside 32, 9.2 s beside 96). A warm exec takes about 30 ms.
  - The first test kills the worker at its deliberate 80 ms deadline, before that first check finishes. The second test then waits out the check against the fixture's 2 s ready deadline. This is why failures appeared in fresh trees and full runs and never on a rerun.
  - Reproduced on a freshly extracted tree under fresh-exec load: 5 of 12 runs failed with the exact signature. CPU load, thread-pool starvation, event-loop stall and a cold interpreter were ruled out.
  - Fix: the fixture's ordinary ready deadline is 30 s; the no-ready test keeps its explicit 80 ms. With a 2.2 s start delay, the previous file fails 11 of 13 tests and the fixed file 1. That one is the no-ready test, which fails under this synthetic shell wrapper for the old and new file alike (3/3 each) and passes normally.
  - Product exposure: the shipped client runs `python3 bridge.py`, an already-checked interpreter with a script argument, so its 5 s ready deadline does not meet this mechanism. A cold first launch of a newly installed Python was not tested.

[Verification](../../verification.md) now lists no known flakes.

### S13 · Spark: close keeps settled findings; one delegation per parent Run

Input: a Sonnet audit of the Harness layer (`app/harness/`) against [Spark](../../../app/docs/spark-agent.md) and [coordination](../../../app/docs/coordination.md). It used deterministic reproductions plus seeded fuzzing: 12 Spark seeds (cancel, retry, reconcile, archive, disable, concurrent human Runs, pump) and 8 coordination seeds. Coordination held; three Spark defects were found.

- **Defect D3, reproduced (10/10): a graceful close lost settled findings.** A Spark child Run turns terminal before `#executeRun`'s `finally` settles its attempt. `close()` waited only for non-terminal Runs, and `#executeRun` removes the entry from `active` before that settle. A close in that window released the Store under the settle: `runtime store lock is unavailable`, the attempt stayed `active` beside a `completed` Run, the findings were lost, and the next start blocked the assignment for review.
  - Fix: the service keeps each Run's execution task until it fully settles (`runTasks`), and `close()` awaits them before closing anything else.
- **Defect D1, reproduced: parallel delegation.** Pi runs one turn's tool calls in parallel. Two `spark_explore` calls both passed the parent's admission gate before the first delegation closed it, creating two assignments, each with a full budget, from one parent Run. The parent's remaining time and turns were handed to both, which contradicts "closes further parent tool admission".
  - Fix: `Subagents.create`, the assignment owner, refuses a second runtime-originated assignment for the same parent Run, with `spark_closed`, in the persisted write. The refused call returns a tool error to the model.
- **Checks.** New tests `spark-close-settle` (0/5 before, 5/5 after) and `spark-single-delegation` (two assignments before, one after). `npm --prefix app test` 1870/1870.
- **Non-author review (Sonnet).** Both fixes confirmed:
  - no new hang path, since a Run turns terminal only after every wait on the runtime, and its tail after that is bounded Store work;
  - Spark settle does not pump while closing;
  - Local Pi and remote Runs share the same task;
  - replay and human-originated creates are unaffected;
  - nothing legitimately creates two assignments from one parent Run.

  Adopted: a failed Run settlement is logged, not swallowed.
- **Defect D2, deferred: needs a ruling (see Deferred).**

### S14 · Formal-work input integrity

Input: a Sonnet audit of the formal work path (work adapter, Work Core, NDA domain, Host human actions) with reproductions. The central guarantees held:
- only a human action through the Work API decides;
- concurrent accept, revise and source replacement produce exactly one winner and one active version pointer;
- request ids refuse reuse across Matters;
- the NDA unresolved-findings rule has no bypass;
- models reach no decide, revise or replace path;
- Run finish and reconcile never replay.

Six problems were found; three are fixed here.

- **D2, reproduced: unreadable sources.** `replace_sources` skipped the rules `create_matter` applies. It stored a source with NUL, a blank one, or one over the adapter's 100 000-character read limit, after which every `se_read_source` failed and NDA review could not be verified. Fix: the bridge runs each replaced source through `validate_source`; the adapter refuses one over `MAX_SOURCE`. The refusal commits nothing.
- **D3, reproduced: undecidable candidates.** A model could submit a candidate with duplicate obligation ids. It was stored pending and advertised as decidable, yet accept, reject and request-evidence all failed with `OBLIGATION_INVALID`, so it stayed in the review queue forever. Fix: `save_candidate` refuses duplicates at submission, and the model gets a tool error. Reject and request-evidence no longer validate the proposal, so a candidate already stored this way can be closed.
- **D5, reproduced with an injected delay: human actions and Run admission.** `humanAction` checked for an idle Host, then awaited Core work outside the configuration queue that Run creation uses. A Run admitted in between ran against a Matter version that the action then moved. Fix: `humanAction` runs inside `#withConfiguration`. Its only caller is the HTTP route.
- **Fact owners.** Work Core bridge and store (`core/bridge.py`, `core/core.py`); work adapter (`extensions/work-adapter.mjs`); Host service.
- **Checks.** New `work-input-integrity.test.mjs`: three tests, each failing against the previous code. `npm --prefix app test` 1873/1873.
- **Non-author review (Sonnet).** Fixes 2 and 3 clean. It confirmed:
  - no caller relies on the refused source shapes;
  - revision and NDA saves go through the same Core save;
  - no deadlock inside the queue: a human action awaits only the Store, Core calls (30 s timeout) and the extension;
  - old databases' duplicate-obligation candidates can now be rejected, while accept still refuses them.

  Findings and dispositions:
  - Adopt: a non-array `sources` became a 500 because the adapter threw a plain `TypeError`. It now uses the adapter's `INVALID_INPUT` error, a 409, with a test.
  - Accept: the Core-side `validate_source` check is only exercised through direct Core calls, because the adapter refuses first.
  - Accept: an idempotent replay of an already-stored duplicate candidate now reports `OBLIGATION_INVALID` instead of its cached result.
  - Note for extension owners: a hung third-party extension `humanAction` now holds the configuration queue, as extension lifecycle already did; extension code has no timeout of its own.
- **Not fixed here.** D1 and D4 are under [Needs a ruling](#needs-a-ruling). D6 is low: `attention.source_record` checks project scope but not Matter disclosure, an existence and digest oracle only for a caller that already knows the ids and digest. It is recorded for the Attention owner.

### S15 · External effects: long MCP calls, orphaned async tasks

Input: a Sonnet audit of the external-effects layer (MCP manager, Runtime Control call policy, async tasks, Kit gating) with loopback reproductions. It confirmed:
- dispatch ordering: a denied or cancelled approval sends nothing; an abort in the dispatch window is marked unknown;
- an HTTP 500 fails closed;
- redirects are refused;
- MCP configuration is parsed strictly, with no headers or credentials to leak;
- Run bindings, policies and permission mode are frozen at admission;
- approval is bound to the tool call ID and argument hash;
- result bounds hold;
- async-task scoping, replay, the single cancel attempt and delivery receipts behave;
- there is no automatic relaunch.

- **D1/D2, reproduced: the transport-wide MCP deadline.** `MCPManager.connect` gave the MCP transport a `fetch` wrapper with a 15 s `AbortSignal.timeout`. The deadline covered response bodies, so:
  - every tool call over 15 s was cut and recorded `mcp_effect_unknown` (a Run that cannot be superseded), despite its 60 s call timeout;
  - a legacy-protocol server's standalone SSE stream was dropped after 15 s, and the provider marked degraded until an explicit reconnect, which is frozen during a Run.

  No rationale was recorded; it arrived with the main takeover. Fix: the deadline now covers response headers only: 15 s for ordinary requests, 65 s for `tools/call`, cleared once headers arrive. Bodies stream under the SDK timeouts (15 s connect and list, 60 s call) and callers' signals.
  - The first version removed the deadline entirely. The review showed that this let `connect` hang forever on a legacy server that never answers the `initialized` notification, which the SDK sends without a timeout.
  - With the probes, a 17 s call completes and records its result, and a legacy provider is still healthy at 20 s.
  - New `mcp-long-call.test.mjs` has two tests: a 16 s call (fails before), and the unanswered legacy notification (hangs with no deadline, fails connect at about 15 s now).
- **D3, reproduced: orphaned async tasks.** Deleting a Session retains its async tasks as orphans, but reconcile and cancel of an orphan were refused as "policy denied": `canUse` looked up the deleted Session's Runtime Control and treated the lookup failure as a deny. An `unknown` or `running` remote task could never be settled or cancelled.
  - Fix: for a Session that no longer exists, only an explicit user-scope deny applies. Launching and consuming still need a live origin Run, so only the human reconcile and cancel paths reach this.
  - New `async-orphan.test.mjs` covers reconcile and cancel of an orphan; it fails before (409) and passes after.
- **Fact owners.** `runtime/mcp-manager.mjs`; Host service (`canUse`), with the policy owned by Runtime Control.
- **Suite.** `npm --prefix app test` 1877/1877.
- **Non-author review (Sonnet).** It confirmed:
  - every Host request is bounded;
  - no model path reaches the deleted-Session branch of `canUse`, since launch, dispatch and consumption check a live origin Run first;
  - a user-scope deny still refuses orphan reconcile and cancel;
  - both tests fail against the previous code.

  Findings and dispositions:
  - Adopt: the hang, fixed with the headers deadline and its test.
  - Adopt: a cancel test for orphans.
  - Defer: on a legacy server, an answer arriving after its call was cancelled or timed out is an "unknown message ID". The provider is marked degraded until an explicit reconnect. This predates the loop for answers within 15 s; the headers deadline bounds it at 65 s. Closing it needs each call's request aborted with the call, or the manager to ignore that late response.
  - Defer: after a Session is deleted, a workspace-scope deny set for its project no longer applies to the orphan's human reconcile and cancel; only user-scope denies do.
- **Not fixed here.** D4 and the policy-action findings are under [Needs a ruling](#needs-a-ruling).

### S16 · Provider keys stay with their endpoint and out of every record

Input: a Sonnet audit of provider connections and credential handling, run with synthetic keys against loopback fixtures, with an empty HOME and temp data directories; no real credential store was read. It confirmed:
- the credential file is 0600 and written atomically, under the configuration queue;
- the key-space migration is idempotent;
- deleting a connection retires its key and generation;
- concurrent saves and deletes stay consistent;
- config CAS holds;
- Runs freeze the credential generation;
- verify never uses ambient environment;
- the preview probe does not follow redirects.

Seven defects were fixed. The implementation was by an Opus worker under the parent's rulings; the parent reviewed the diff and a Sonnet non-author reviewed it.

- **D4: a key went to a new endpoint without re-entry.** Editing a compatible connection's `baseUrl` without an `apiKey` reused the saved key, and the new host received it, even for the directory probe. Now `400 credential_required` before any request.
  - A connection with no saved key may change endpoint.
  - Catalog connections keep their documented optional `baseUrl`, now stated as the exception in the API reference.
- **D1: a provider echoing the key put it in Pi's session journal.** `redactingProviderFetch`, at the fetch seam the Pi port already hands Pi, rewrites non-2xx bodies with known secrets redacted before the SDK builds `errorMessage`. Streaming 2xx bodies are untouched.
- **D2: provider-controlled response metadata carried the key.** Verify's `observedModel` and the request-telemetry record were affected, in events and in `runtime-state.json`. Both are redacted now. Telemetry is redacted value by value: the first version redacted the serialized record, and the review showed that a key equal to a quoted field name, such as `"phase"`, made it invalid JSON, so every Run failed as a projection error.
- **D3: logs carried the key.** Logger lines carrying provider or runtime error text, including a compaction failure, are redacted.
- **D5: ambient OpenAI SDK environment reached any endpoint.** The OpenAI SDK reads several `OPENAI_*` variables as request defaults, and startup stripped only two. Now also stripped:
  - `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_ADMIN_KEY`, `OPENAI_BASE_URL`, `OPENAI_WEBHOOK_SECRET`;
  - `OPENAI_CUSTOM_HEADERS`, which adds headers to every request;
  - `OPENAI_LOG`, which prints raw provider bodies.
- **D6: redaction gaps.** Redaction missed keys echoed in JSON-escaped form, and keys shorter than its threshold. There is now one redaction function (`redactSecrets`) that also replaces the escaped form. One constant, `PROVIDER_API_KEY_MIN_LENGTH`, is enforced for saved keys and preview probes. Reusing an older saved key shorter than that asks for the key again (`credential_required`) instead of failing the probe vaguely.
- **D7: Settings showed ready for a refused route.** `configurationStatus` now reads `unavailable` whenever the shared route check (S2) refuses the saved route.
- **Checks.** `credential-echo.test.mjs` has nine tests, each failing against the previous code. `npm --prefix app test` 1886/1886. The structural-key test was checked against the serialized-record redaction it replaces. Docs updated: API reference (stripped variables, `credential_required`, `configurationStatus`, the catalog exception) and runtime foundation.
- **Deferred, with reason.**
  - A key echoed inside a successful stream (text deltas, or an SSE `error` or `response.failed` event on a 2xx response) can still reach Pi's journal. Closing it means rewriting streams frame by frame at the same fetch seam.
  - Echoes in `\uXXXX`-escaped or percent-encoded form, or escaped twice, are not matched.
  - `HTTP_PROXY` with `NODE_USE_ENV_PROXY` could route provider traffic through an ambient proxy; not tested.

### S17 · Material names, profile saves and selection scope, Session cleanup, body limits

Input: a Sonnet audit of material intake and Runtime Control editing, with reproductions. It confirmed:
- same-path uploads serialize with no lost version;
- versions are immutable and hash-addressed;
- workspace path resolution refuses `..`, separators and symlinked roots;
- comparison reads only the two named versions;
- Runtime Control CAS holds, and writes are validated by the same validator startup uses (no write/load divergence);
- preview persists nothing;
- Run admission freezes the selected profile's bound snapshot.

Six defects were fixed, implemented by an Opus worker under the parent's rulings.

- **Material names differing only by case.** On macOS `Brief.md` then `brief.md` wrote one file while both receipts said `written`, silently replacing the first source's workspace copy. `retain()` now refuses a new name equal to an existing one except for case (`409 material_name_conflict`). Names are ASCII-only by pattern, so ASCII folding matches APFS. Old databases already holding both spellings keep working for their exact names.
- **Concurrent profile saves.** Two saves with the same expected revision both returned 200 at revision 1, and the last writer won. `saveProfile` now runs in the configuration queue, and `ProfileStore.save` checks the revision and writes atomically in one serialized step.
- **Profile selection scope.** A session-scoped profile could be selected at user scope, making every other Session's composition incompatible and refusing their Runs. A profile can now be selected only where its own scope reaches (`409 profile_scope_conflict`). Previously saved selections still load, so startup is not affected.
- **Deleted Sessions left Runtime Control entries.** Their session-scoped resources, overrides, policies and selections stayed behind. They could not be removed from any live Session and kept consuming the global content and collection caps, so recovery needed a hand edit.
  - Deleting a Session now removes them, plus entries elsewhere that name them, as one validated revision, and disconnects removed MCP servers.
  - Startup removes entries left by earlier deletes.
  - Failure never undoes the deletion: the response reports `runtimeControlCleanup: "deferred"`, startup retries, and failures are logged.
- **The 1 MiB material limit was unreachable.** The generic 1 MiB request-body cap is smaller than a JSON-encoded 1 MiB material, and the client saw a reset socket. The materials route now has its own limit, six times the material limit plus 64 KiB (the widest JSON escape). Any over-limit body is drained, only after the origin and token checks and up to 256 MiB, so the client gets a typed `413 body_too_large` instead of a reset.
- **Workspace policy by case.** A `ws_write` deny on `out/private*` let `out/PRIVATE.md` overwrite `private.md` on macOS. Workspace paths now match case-insensitively, like repository and candidate paths. On a case-sensitive filesystem this also widens an allow rule to case variants, and narrows a deny the same way; this is accepted as the repository rule's precedent.
- **Checks.** `intake-control-integrity.test.mjs` has six tests, each failing against the previous code. `npm --prefix app test` 1892/1892. One existing test that pinned the socket reset now expects the typed 413. Docs: API reference (body limits, delete response, material conflict, a new Profile section) and Runtime Control API and architecture.
- **Non-author review (Sonnet).** No blocking findings. It confirmed: no collision can pass the name check; no deadlock between the two queues; the coverage rule is right for the global and project scope chains; cleanup runs after proposal recovery and before any MCP connection; draining happens after authentication, on the materials route only. Adopted: a failed MCP disconnect after a delete, and a failed startup cleanup, are logged instead of failing the delete or the start. Noted: an existing gap where removing a resource leaves profile selections naming it (they refuse Runs, by design).

### S18 · Documentation follows S10–S17

- **Input.** A read-only Sonnet drift check of current documentation against S10–S17, excluding archive, evidence, reviews, execution records and dated research. The root README has no drift.
- **Change.** A Sonnet documentation worker wrote the edits, with each fact confirmed against the code; the parent reviewed the diff.
  - Restart error codes by interrupted effect: `mcp_effect_unknown`, then `repository_write_unknown`, then `restart_unknown`. Partial text is kept. Updated in `app/README.md`, the API error table (two new rows) and run attempts.
  - Close order, in runtime foundation: compactions, then Runs, then every Run's settlement.
  - Key length: 6–4000 for credentials, 6–4096 for preview probes.
  - One Spark delegation per parent Run, and graceful close keeping findings: Spark and supported preview.
  - Async orphans: reconcilable and cancellable under user-scope policy; restart fences only in-flight tasks.
  - Every stripped environment variable, listed in `app/README.md`.
  - The materials route body limit.
  - Redaction stated precisely, including its known gaps, replacing "any known secret is defensively redacted".
  - MCP header and body timeouts in Runtime Control API.
- **Checks.** `tools/check-doc-links.mjs` and `tools/check-product-copy.mjs` pass.

### S19 · Attention and governance: per-object availability, one disclosure rule

Input: a Sonnet audit of Attention and governance, with Core-level reproductions and about 4,000 fuzzed inputs. No cross-project leak, resolution-authority break, stale disclosure or receipt defect was found:
- runtimes cannot resolve, snooze or dismiss;
- no Run, notification or delivery path resolves Attention;
- grants, expiry and revocation are checked on every call with the Host-captured identity;
- counts and cursors cover visible items only.

Five problems were fixed, implemented by an Opus worker under the parent's rulings.

- **D1, reproduced: one Matter broke the whole directory.** One Matter over its object budget (129 sources), or with an unsupported domain schema, made the governance registry fail for the whole project. This hit both the human and the runtime, and Attention discovery went with it. Such an object is now listed `unavailable` with its reason code and no `object_version`, and its own detail read keeps the explicit error. A runtime still never sees objects its grant cannot read.
- **D2, reproduced: runtime Attention paths skipped Matter disclosure.** The runtime Attention `source` query returned Matter source bytes without the Matter-disclosure check governance applies, and inspect exposed Matter source ids, locators and digests. This extends S14's `record_signal` oracle (D6). It is not reachable through today's model tools, only through the adapter seam.
  - The disclosure reader moved unchanged into `core/disclosure.py` (the review compared the moved functions structurally), with one `source_disclosed` rule used by governance and Attention alike.
  - For runtimes: inspect, the `source` query (indexed over visible refs, so counts and positions do not leak), event payloads and `record_signal` source refs (uniform `NOT_FOUND` before any existence or digest check) all apply it.
  - Human behavior is unchanged.
- **D3: resolving a resolved item overwrote its reason.** `resolve` (and `resume`) on a resolved item is now `INVALID_TRANSITION`; reopen first. Acknowledge, attach relation and request disclosure are unaffected.
- **D4: items named like fixed routes could not be opened.** Items with ids `registry` or `conversations` were shadowed by the fixed `GET /attention/...` routes. Those ids are refused at create. Existing ones stay reachable through `POST /attention/query`.
- **Minor.** A lone surrogate in a size check raised `UnicodeEncodeError`; one `utf8_size` now maps it to `INVALID` everywhere it was used.
- **Checks.** `attention-governance-integrity.test.mjs` has five tests, each failing against the previous code. `npm --prefix app test` 1897/1897. Docs: Work Core governance and Attention contracts, and the Attention agent guide.
- **Non-author review (Sonnet).** No security findings. It confirmed:
  - the moved disclosure logic is equivalent;
  - the current source set is required and the runtime identity is the Host's;
  - no runtime path bypasses the check, and replay leaks nothing;
  - `unavailable` entries appear only to a runtime already granted registry access;
  - there is no import cycle.

  Noted: a granted runtime sees the reason code; relation refs and memory listings expose Matter ids, as documented boundaries.

### S20 · The web shows the Host's facts

Input: a Sonnet audit of the web client, looking only for places where the UI states a fact the Host or Core contradicts, or decides semantics itself. Copy and layout were out of scope. It confirmed:
- the Sources panel uses Core `basis`, and the review summary uses Core counts;
- the Attention views project Host facts;
- restart codes are shown from the Run error;
- the command menu re-decides from the Host catalog.

This is a projection fix in the UX owner's files, under the loop directive and precedent S8. An Opus worker implemented it, reusing Host messages over new copy; there are no visual changes.

- **Unknown Runs shown as Failed.** Every `run/error` event set the Run `failed`, and a terminal guard then refused the Host's own later `unknown`. A Run the Host settled unknown after a budget, extension or async-dependency error read Failed, which invites a retry of an uncertain effect. Now only `run/status` and Host Run snapshots set status, and a Host terminal status replaces the shown one; the Host never changes a terminal status.
- **Coded refusals shown as unconfirmed deliveries.** Any 5xx was "Delivery is unconfirmed" with Send held. A coded refusal before admission (`provider_unsupported`, `configuration_incomplete`, `effort_unsupported`, `runtime_closing`, `runtime_unavailable`) now shows the Host message and records no unconfirmed Run. No response, an uncoded or `internal_error` 5xx, or a `*_unknown` code stays uncertain, and the lost-ACK recovery is unchanged.
- **Error codes read where they never exist, or not by code at all.** The effort save read `error.code`, which the request helper never sets, and the model picker, materials and chat-delete paths mapped every 409 to one message. They now switch on the Host code: only `config_conflict` re-reads, and only `source_revision_conflict` enters the materials refresh state. Other refusals, such as `material_name_conflict`, `operation_active` and `spark_session_referenced`, show the Host's message.
- **Chat delete enablement.** It considers any loaded active Run, not only the open chat's; the Host still refuses on any Run or operation, and shows its reason.
- **Spark filters over a truncated page.** Filtered truncation notes use Core `byStatus` counts, so a filter over the loaded page no longer claims "no match" when Core counts some.
- **Invented context window.** A window the Host does not report reads "Not reported" instead of an invented 1,000,000 tokens.
- **Checks.** Tests in `host-fact-projection.test.mjs` and six existing web test files, each failing against the previous code. The product-copy and semantic-consumer gates pass. `npm --prefix app test` 1906/1906.
- **Non-author review (Sonnet).** No blocking findings. It confirmed:
  - a stale terminal status cannot override a newer one, because Host terminal status is immutable and the client writes none;
  - every `run.error` is followed by a status settlement;
  - lost-ACK recovery still holds for genuinely uncertain cases;
  - no dead `error.code` reads remain in the live app.

  Noted: the unwired runtime-management and agent-profile controllers read `error.code`, and would need `body.error.code` if wired.
- **Returned to the UX owner.** The new strings "Not reported" and the filtered truncation note. A dead question-card branch ("This run has ended…" is never shown; a closed question renders as the "Closed" history row).
- **Decisions still open, for the UX owner and the Host lane.**
  - Whether Settings and the composer should show the provider-config `configurationStatus`, and hold Send on an unavailable route.
  - A per-scope selectable-profile fact for the picker.
  - A Host "frozen" fact (active Run or operation anywhere) to disable Delete and configuration controls during compactions and other Sessions' Runs.

## Integration with the architect branch

On 2026-09-30 a parallel, unmerged delivery was found: `claude/architect-integration-20260929`, the architect lane's D4 sandbox, D6 traversal, D9/D10 and path-policy work, under Astra's review with acceptance withheld. Neither branch contains the other, and both touch Host core files. Integrating both into `main` is Astra's decision.

The parent made a trial merge of that branch into this one (head `f03f27f`) in a throwaway worktree, with nothing committed or pushed:
- Seven files conflict textually, in 12 hunks: `app/runtime/check-runner.mjs` (4), `app/runtime/control-plane.mjs` (2), `app/tests/check-recipes.test.mjs` (2), `app/tests/control-plane.test.mjs` (1), `app/docs/api-v6.md` (1), `app/docs/check-recipes.md` (1) and `engineering/current.md` (1).
- `app/server/service.mjs` and every other shared file merged without a textual conflict. That is not evidence of semantic compatibility; the combined suite has not been run.

Semantic overlaps and the parent's recommendation for whoever integrates:
- **Path-policy case folding.** S17 made `ws_*` rules case-insensitive with a whole-string fold. The architect branch folds `ws_`, `repo_` and `candidate_` paths one code point at a time, checked against the volume (Unicode normalization and final sigma, "folding never loosens", alias conflicts hold the stricter rule). That is the more complete rule and should replace S17's, keeping S17's separate `profileCovers` selection-scope check. S17's `ws_` test should then be judged against the architect rule.
- **Check runner.** S11's guard (group supervision, Host-death kill, exact exit reporting) and the architect sandbox both change `runCheckRecipe`'s spawn and reap. The guard should run outside the sandbox and start the sandbox's command. Astra's joint test matrix (normal exit, cancel, timeout, spawn failure, Host crash while the leader runs, Host crash after the leader exits, all with the sandbox in force) applies to whichever lands second.
- **Everything else.** Kit-binding validation, the store, service admission and close, the work adapter and the Core owner overlap only textually-cleanly; the combined suite must still run after the merge.

The loop adds no further source slices in these files until the two branches are integrated, so the overlap does not grow.

## Needs a ruling

These are removals or data decisions that the directive does not settle, because an owner record lists the code as accepted, deferred or preview capability.

| Item | What it is now | Question for the user |
|---|---|---|
| Hermes `/v1/runs` adapter (`runtime/hermes-api-runs-adapter.mjs`, `-transport.mjs`, `docs/hermes-api-runs.md`, about 720 lines) | Accepted as a standalone adapter; the Host never registers it; native Hermes stays blocked by the permission refusal | Keep it as the parked consumer for a future Hermes decision, or remove it until that decision is revisited? |
| Managed Agents-API executor (`runtime/agents-api-adapter.mjs`, `agents-host-gateway.mjs`, `openai-agents-transport.mjs`, about 1,500 lines) | Only an injected trusted factory wires it, and `npm start` does not; schema 22's executor choice names it | Keep as a tested seam until credentials and budget are authorized, or remove it together with its schema-22 executor identity? |
| Local Pi worker (`runtime/local-pi-*.mjs`, about 880 lines) | Opt-in `localPiWorker`, off by default; schema 20 depends on it; listed as a dormant residual | Keep dormant, or remove with a schema step? |
| Runtime-management and agent-profile specimen pages (`web/runtime-management*.mjs`, `web/agent-profiles*.mjs`, about 2,450 lines with contracts, fixtures and preview scripts) | Served only through the static allow-list; live runtime management is deferred | Keep as specimens for the deferred UI, or remove until that UI is scheduled? |
| Data-format compatibility: the legacy skin-token format in browser preferences, stream events without segments, the `credentials.json` key-space migration, `legacyWithoutControlSnapshot` Runs | Each reads data written by an earlier build | Can existing local data be declared unsupported, so these readers go? This needs a data ruling, not a code one. |
| Matter size and the Core wire limit (S14 D1) | `matter_view` returns every source and every candidate body in one bridge message; past about 1 MB it is refused. Reproduced two ways, and the Matter became permanently unusable (no surface, no decision, no new Run) either way: one large source replacement, which S14's source limits now block at 100 000 characters, or about ten large human revisions, still open. | Core API change for the core lane: page or bound candidate bodies in `matter_view` and cap the source count, or state a Matter size limit. Which one? |
| Stale pending candidates (S14 D4) | A candidate made stale by a source or version change can be neither accepted nor rejected, since the stale checks apply to every action. It is still listed with its full body in every Run's required context. Reproduced: after six such candidates the context exceeds its budget and every new Run fails, so only a new binding recovers the Matter. | Two decisions: may a stale candidate be closed (reject or request evidence) without being current, and should Run context list stale candidates only by id and reason? |
| Deleting a Session with an unreconciled MCP effect (S15 D4) | Reproduced: a Run with `mcp_effect_unknown` does not block Session deletion. The Run row and every `runtime.mcp.dispatch` event are deleted, so evidence of a remote effect that may have happened is lost. No reconcile operation exists for MCP effects. | Refuse the delete while such a Run exists, which leaves it permanently undeletable, or require an explicit acknowledgement that the evidence will be discarded (a new API flag and delete-dialog copy)? |
| MCP policy actions and permission mode (S15, by inspection) | Three findings: the policy action is `mcp.` + server id + `.` + tool name, and both may contain dots, so servers `local:a` and `local:a.b` can collide and a wildcard for one matches the other; resource-specific rules never fire for MCP tools, because `governTools` passes `*`; `read_only` does not restrict MCP (default `ask`, but an explicit host `allow` dispatches), and extension tools ignore permission mode. | A policy syntax change (separator) would affect saved policies. Should read-only mean no remote writes? |
| `check_run` containment (D4) | Candidate code runs as the Host user and can read the credential file by path | Already open under [RD-009](../../research/RD-009-trusted-harness-extensions.md): choose an OS sandbox, a data directory the check cannot read, or an accepted limitation. |

## Deferred

These are findings kept with a reason; each reopens when its trigger occurs.

- **Spark retry budget after a restart (S13 D2), for the core lane.** The contract says a retry subtracts completed attempt execution time, but an attempt interrupted by a restart has no recorded execution time. The Run keeps `startedAt`, and the restart settlement stamps `endedAt` at the restart. Reproduced by a Sonnet probe:
  - The time charge fails closed: the downtime counts as execution, so after an outage longer than the 60 s assignment budget, reconcile then retry ends `blocked` (`spark_budget`) with no new attempt.
  - The turn charge fails open: the interrupted Run's usage is missing, so it charges 0 turns.

  Event records carry no timestamps, so there is no honest "last alive" time to use. Closing this needs either a persisted liveness timestamp per Run (a Store schema change) or a contract ruling on how an unknown attempt is charged: for example, the whole remaining budget, a fixed charge, or none with an explicit human retry. Reopen when Spark retry after restart is used, or when the Store next changes schema.

- **Domain branches in the generic Run loop.** `service.mjs` hard-codes the Work Extension ids `evidence-memo` and `inbound-nda` six times, and runs file-memo input limits and hooks inside `#executeRun`. Both are real coupling under [dependency boundaries](../../architecture.md#dependency-boundaries). By [change boundaries](../../architecture.md#change-boundaries) the trigger is a new domain, and none is scheduled. Reopen when a third Work Extension or a file-memo profile change is scheduled: move the capability behind the extension adapter (`extensionRun` hooks).

- **Whole-state rewrite per Store write.** Every mutation clones and serializes the entire RuntimeStore state, about 0.3 s per write at 1,000 Runs and 1.1 s at 3,000 on the synthetic state above; coalesced streaming snapshots are writes too. This is the storage design (architecture unit M06), not a slice. Reopen when a user's store reaches a size where writes are felt, or when storage is replaced.
