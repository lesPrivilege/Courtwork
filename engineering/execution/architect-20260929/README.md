# Architect lane, 2026-09-29

Owner record for the architecture lane after the user handed it to a Claude (Fable) session.

## Scope and authority

The user, 2026-09-29:

> 接手架构师 role，目前 opus 正在独立施工，可以从文档及已登记的外部参考选择可以推进的任务，从第一性原理出发，可以发散思维，开放 opus 和 Sonnet 作为 worker 或 explorer

(Take over the architect role. Opus is building independently. Choose work that can advance from the documents and the registered external references, from first principles; Opus and Sonnet are open as workers or explorers.)

- **Holder.** This Claude (Fable) session holds architecture, integration and migration decisions and non-author acceptance, the lane [AGENTS.md](../../../AGENTS.md) assigns to Astra. Rulings, contract text and review of every worker diff stay with the holder; Sonnet and Opus subagents explore and do bounded edits.
- **Branch.** `claude/architect-20260929` in its own worktree, from `main` at `87e2207`. Not merged, not pushed.
- **Other writers.** The Claude (Opus) convergence loop is active on `claude/converge-loop-20260929` (owner record `engineering/execution/converge-loop-20260929/README.md` on that branch) with uncommitted edits in `app/server/service.mjs` (repository revoke and Run cancellation). This lane keeps its changes to that file to single hunks outside that region and does not touch the loop's worktree. The UX queue stays with its owner.
- **Not authorized by the directive.** Pushes, deployment, paid provider or real-model runs, key entry, restarting the user's Host, and external messages.

## Acceptance of the D1–D5 fixes

Non-author review by the lane holder of `bdda8bf`, `a3321d1` and `fdb52bb` on `main`, which the [review record](../../reviews/doc-driven-code-review-2026-09-29/README.md#fixes-after-reassignment) left without architect acceptance. Method: read the diffs; list every direct writer of a Run status in `app/server/store.mjs`; run `run-terminal-arbitration`, `check-runner-group-kill`, `check-approval-authored-files` and `cancel` alone on `main` (17/17); probe the check runner with a test file that leaves descendants behind.

| Fix | Ruling | Reason |
|---|---|---|
| D1 terminal status is final | Accept | `applyRunPatch` guards every patch writer; the three direct writers (`openQuestion`, `resolveQuestion`, restart recovery) each check the status in the same mutation. The cancel race is arbitrated inside the write. |
| D2 late cancel settles `cancelled` | Accept the ruling | It is the rule the Local Pi contract already states. The completed answer stays in the Run's events, so nothing is lost and nothing is reported as success. |
| D3 exception under a pending cancel settles `unknown` | Accept | An exception is not a confirmed stop. |
| D4 approval names the model-written files | Accept as disclosure only | It tells the person what will run. It contains nothing; see [A1](#a1--a-check-does-not-bound-the-lifetime-of-what-it-starts) and the containment ruling. |
| D5 group reaped on stop | Accept with finding A1 | Correct for descendants that stay in the group. The group is not a lifetime boundary. |

### A1 · A check does not bound the lifetime of what it starts

Reproduced against `main` at `87e2207` with `runCheckRecipe` and a `node --test` file that starts two long-lived children, one in the check's process group and one in its own session (`detached: true`):

| Case | Host result | Same-group descendant | Own-session descendant |
|---|---|---|---|
| Check exits normally, code 0 | clean result | alive | alive |
| Check cancelled while running | `cancelled`, `groupLingered` false | reaped | alive |

Candidate-authored code can therefore leave a process running as the Host user after the Host has recorded the check as settled, and the settled record says the group is gone. This is the same root as D4: the check has no containment. It is recorded as requirement R7 of the containment ruling and is not fixed separately.

## Findings from counterexample tests

Input: a read-only Sonnet survey of the documents' stated next steps against the code, then two test files written by a Sonnet worker that changed no production code. Each test states an invariant from [architecture](../../architecture.md#minimum-delivery) and reports whether the code holds it. Branch `claude/architect-probes-20260929`.

### A2 · A change of the Pi executor id makes the data directory unopenable

- **Reproduced.** A Host-written state whose Pi executor id differs from the code's constant fails to load: `invalid runtime state: Session executor choice contradicts Run/native history`. The Host does not start. 10 of 11 tests fail; the control, which reopens the unchanged state, passes.
- **Root cause.** `historicalExecutor` (`app/server/executor-choice-state.mjs`) adds the current code constant whenever a Run or Session has a `hostSession`, beside each Run's recorded `adapterId`. Two identities make it return a contradiction. The id embeds the package version and is written as a literal in three modules.
- **Ruling.** A Run's recorded identity is the fact; the code constant is not evidence about the past. `hostSession` implies the Pi lineage only for a Session with no recorded Run. The id names a native session lineage, is defined once, and does not change with a package upgrade inside that lineage. Data of a lineage the Host no longer configures stays readable; a new Run in such a Session is refused `executor_unavailable`; new Sessions are unaffected. No schema change.
- **Not ruled.** Whether to rename the id to drop the version. It would need a schema step and changes nothing the ruling above does not already secure.

### A3 · The person's reasons do not reach the next Run

- **Reproduced in both domains** through the real HTTP Host, a restart and a new Session. The next context carries the accepted Artifact, open obligations and pending candidates (10 of 14 tests pass). It does not carry the reason given with a reject or a request for evidence, and no model tool returns decisions (4 tests fail).
- **Root cause.** `compileWorkContext` (`app/core/owner.mjs`) omits closed candidates and decisions.
- **Ruling.** A reason given with a reject or a request for evidence is the person's instruction for the next attempt, so it is part of the required context. The projection lists those decisions made since the active Artifact was accepted, newest first, within the existing budget. Decisions that do not fit are counted, never cut, and never cause a refusal on their own. Projection `schemaVersion` becomes 3; stored snapshots stay as written.
- **Deferred, with trigger.** Whether a request for evidence should open an obligation in the Core, and whether a reject should advance the Matter version. Both change Core transition rules. Reopen when a domain needs a request for evidence to block the next accept.
- **Observed.** Evidence Memo receives no domain instruction beyond the generic wrapper; the NDA domain adds about 10 KB of playbook and producer contract. This is a domain choice, not a defect.

**State.** Both fixes assigned to a Sonnet worker. Not yet returned.

## Check containment ruling (D4, RD-009)

Inputs: a read-only Sonnet survey of the runner, the data directory layout and the external mechanisms, with primary sources; the review's credentials probe; A1.

**What the check's execution identity may do.**

| ID | Requirement |
|---|---|
| R1 | It cannot read the Host data directory or the user's home directory. Exceptions: the candidate worktree it checks, its own temporary directory, and the Node installation it runs. |
| R2 | It can write only to its own temporary directory. The candidate worktree and its Git metadata are read-only to the check. |
| R3 | It has no network access. |
| R4 | It cannot cause code to run outside the sandbox, for example through Apple Events, launchd or `open`. |
| R5 | When the sandbox is unavailable, no child starts and the check settles with `sandbox_unavailable`. There is no unsandboxed fallback and no switch to disable the sandbox. |
| R6 | The mechanism is an established, maintained implementation pinned to an exact version. |
| R7 | After a check settles, no process of its group remains, on every exit path. A descendant that left the group stays bound by R1–R4. Where the platform can bound lifetime it must; where it cannot, the contract says so. |

**Reasons.**

- *The worktree is read-only (R2).* A check reads the candidate. Candidate files change only through an approved `repo_write`, which is what the approval card lists. A check that could write the worktree would change candidate files and Git metadata without an approval or a receipt.
- *Layout is not a boundary.* Moving candidates out of the data directory leaves every file readable by path, because the child runs as the same OS user. [Architecture](../../architecture.md#dependency-boundaries) already says this.
- *The Node permission model is not a boundary.* Its documentation says it gives no guarantee against malicious code, and Node 22 and 24 cannot deny network access with it.
- *A hand-written allow-by-default Seatbelt profile does not meet R4.* A sandboxed process can still ask an unsandboxed application or launchd to act for it. R4 needs a deny-by-default baseline with curated allowances, and that baseline is the part not worth owning (R6).
- *Mechanism candidate:* `@anthropic-ai/sandbox-runtime`, Seatbelt on macOS and bubblewrap on Linux. It is pre-1.0, so adoption waits on a spike against R1–R5 and R7 on macOS. If the spike fails, the work stops and returns here.

**Verification limits.** This machine has no container runtime, so the Linux path cannot be run locally. It is verified only by CI on a pull request, which needs the user's authorization to push. Until then every Linux claim is recorded as not run.

**State.** Spike and implementation assigned to an Opus worker on `claude/architect-check-sandbox-20260929`. Not yet returned.

## Rulings on parked capabilities

The convergence loop listed six items under "Needs a ruling" in its owner record on `claude/converge-loop-20260929`. Input: a read-only Sonnet survey of each item's consumers, persisted-data coupling and owner-record status. The test applied: code leaves the product tree when nothing can reach it and no stated rule or persisted record depends on it. Code that is the only executable evidence for a stated contract stays.

| Item | Ruling | Reason |
|---|---|---|
| Hermes `/v1/runs` adapter | Keep | It has no Host seam and no persisted coupling, so it costs the product nothing. It is accepted evidence for a direction the user has registered, and its revival waits only on the user's permission decision. A frozen check recipe names its test file. |
| Managed Agents-API executor | Keep | It is the only executable evidence for the Runtime Port obligations that in-process Pi does not exercise: intent before send, unknown delivery, recover and `submitToolResult`. Schema 19 and 22 records name it. Removing it would leave the Port with one consumer and no test of its neutrality. |
| Local Pi worker | Keep, dormant | Schema 20 records name it, and it is the only evidence for dispatch-before-spawn and retained-result recovery of an external process. Its validators return early when no record exists. |
| Runtime-management and agent-profile specimen pages | Remove from `app/`; returned to the UX owner to carry out | Nothing in the product loads them, their contracts describe Host fields that do not exist, and their fixture receipts must not be read as live facts. The production Host still serves them through the static allow-list. Design references belong under `engineering/design/` or in Git history at a recorded SHA, not in the served product tree. |
| Data-format compatibility readers | Needs the user's data ruling; recommendation below | Removing a reader does not delete data, but it makes older data unreadable. Only the user knows whether any data directory or browser profile older than the current formats still matters. |
| Web `runtimeSelection` legacy branch | Remove; returned to the UX owner | The Host always advertises `expectation-v1`, so the branch cannot run against this Host. It is an obsolete path, not a data reader. |
| `check_run` containment | Ruled above | |

**Recommendation on the data readers.** If every data directory the user still needs has been opened by a schema-22 Host, remove the RuntimeStore upgrade path for schemas 3 to 21 with its gated validators, fixtures and tests; the credential key-space migration; the segment-less stream reader; and the legacy skin-token parser. The loader then accepts schema 22 only and refuses anything else with the existing error. This follows the project principle of no compatibility layers. It is not carried out until the user confirms.

**D7, extensions receive the raw Core client.** Closed without a code change. A narrowed facade would not stop in-process code, which can import the client itself. [Architecture](../../architecture.md#dependency-boundaries) already states that host-trusted extensions are inside the trust boundary. Reopen when an extension is loaded that the Host does not trust, which needs process isolation, not a facade.

## Review fixes D6, D9 and D10

Returned to the architecture lane by the [2026-09-29 review](../../reviews/doc-driven-code-review-2026-09-29/README.md#dispositions). Writer: a Sonnet worker with an exact specification; the lane holder reviewed the diff, reran the touched tests (43/43) and committed. Each fix started from a test that failed on the unchanged code. Suite: `npm --prefix app test` 1851/1851 (worker's run).

| ID | Rule | Change | Contract |
|---|---|---|---|
| D6 | An aggregate workspace read returns a file's content or hash only when the aggregate tool's rule and the `ws_read` rule both allow that path. | `ws_grep`: the search worker names the candidate files, the Host answers with the admitted ones, and a withheld file is never opened. `deny` and `ask` are both excluded and counted without naming paths; no permission question opens. This follows `repo_grep`. `ws_list` keeps the entry and drops its `sha256`. With no policy both outputs are byte-identical to before. | [Runtime Control API](../../../docs/runtime-control/api.md) |
| D9 | A Core request whose outcome the Host cannot know is not reported as a refusal. | Such an error is `503` with the Core code, `outcome: "unknown"` and `operation`. A Core refusal stays `409`. | [HTTP API](../../../app/docs/api-v6.md#transport) |
| D10 | The advisory permission evaluation uses the ceiling that dispatch uses. | `evaluateRuntimePermission` calls `hostToolCeiling`. A table test compares it with `createPathAdmission` for each tool with a ceiling, in every permission mode. | [HTTP API](../../../app/docs/api-v6.md) |

Dispositions of what the worker reported:

- **Returned to the UX owner.** After D9 the browser treats an unknown Core outcome as a server error where it used to see a `409`:
  - `web/attention-view.mjs` `send()` shows a refusal and drops the pending entry; an unknown outcome should take the recovery path.
  - `web/app.mjs` `runWorkAction` no longer reloads the surface.
  - The three binding handlers in `web/app.mjs` no longer refresh the binding.

  The Run-start and NDA renderer paths now keep the request identity for a retry, which is the intended behaviour.
- **Adopt as stated.** The `ws_list` and `ws_grep` tool descriptions are unchanged, because a retained request golden pins them and the result itself reports what was withheld.
- **Defer.** `repo_list` and `candidate_list` name a file whose read is denied. Names are not content, and the precedent is deliberate. Reopen if a policy needs to hide that a file exists.
- **Defer.** `ws_list` still hashes a withheld file in memory, and `ws_grep` has no cap on the number of files it names. Reopen when a workspace is large enough for either to be measured.
- **Not verified.** A `decide` request with an unknown outcome through the Host, because the extension adapter holds its own Core client. The mapping was read, not run.

Not independently accepted: the lane holder specified and reviewed this work, so it is author-side review. Acceptance needs a non-author.
