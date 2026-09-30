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

### Fixes

Writer: a Sonnet worker; the lane holder reviewed the diff and changed two points. Each fix started from the failing tests above.

- **A2.**
  - `historicalExecutor` reads each Run's recorded `adapterId`. A `hostSession` implies Pi only for a Session with no recorded Run.
  - The schema 21 and older migration keeps its earlier reading through a `legacy` option, because in that data only the Pi lineage ever owned a `hostSession`.
  - A null executor choice is valid beside any history. It admits no Run, so it cannot contradict what ran. (Lane holder's change: the worker had recomputed the legacy reading to allow it.)
  - A Run's recorded Kit adapter id and revision load as recorded. Admission still checks the current Adapter. (Lane holder's change for the revision: it had the same defect as the id.)
  - The Pi id is defined once, in `app/server/executor-choice-state.mjs`.
  - Contract: [Runtime foundation](../../../app/docs/runtime-foundation.md), [HTTP API](../../../app/docs/api-v6.md).
- **A3.**
  - `compileWorkContext` adds `decisions` and `decisionsOmitted`, and the generic wrapper tells the model what the list is for. The NDA domain inherits the wrapper.
  - The Core sets no maximum length for a reason, so one very long newest reason leaves the list empty with the count recorded.
  - Contract: [Work Core contract](../../../docs/work-core/contract.md).
- **Checks.** The two counterexample files pass, 11/11 and 16/16. The identity, Kit, migration and context test files pass alone, 109/109, after the lane holder's changes.

Deferred, with trigger:

- The `remoteBinding` inference in `historicalExecutor` adds the managed id beside a Run's recorded one. The managed id carries no version. Reopen when a second managed lineage exists.
- A Session migrated from schema 21 or older with an older Pi id loads fenced: readable, no new Runs.
- The Work Extension refuses a Run when domain context plus compiled context exceed 90,000 characters. Decisions can add up to the 24,000 limit to the compiled part. Reopen when a domain context approaches 66,000 characters.

Not independently accepted.

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

### Spike and implementation

Writer: an Opus worker on `claude/architect-check-sandbox-20260929`. The lane holder read the module, the runner change, the contract and the source card, and ran the check test files alone.

**Spike, macOS 27, synthetic stand-ins.** `@anthropic-ai/sandbox-runtime` 0.0.77 meets R1 to R5:

| Requirement | Observed |
|---|---|
| R1 | Reads of the data directory, a file in the home directory and another Session's workspace are denied, directly and through a spawned `cat`. The worktree is readable. |
| R2 | Writes to the worktree, its `.git`, the data directory, the home directory and `/private/tmp` are denied. The check's temporary directory is writable. |
| R3 | TCP to a public address and to a listening loopback port, UDP and DNS all fail. |
| R4 | `osascript`, `launchctl submit` and `open -g` start nothing. The same `launchctl` command outside the sandbox created its job. |
| R5 | The library does not notice a missing `/usr/bin/sandbox-exec`, and a rejected profile looks like a failing test. The Host therefore checks the binary itself and runs `exit 0` under the policy before each check. |
| R7 | On macOS a descendant in its own session outlives the check and stays sandboxed: three seconds later its read of the credentials stand-in and its write outside the temporary directory are still denied. |

**Choices the ruling left open.**

- The Host never calls the library's `initialize()`, which starts a network proxy even when no domain is allowed. Policy is passed per call. This is a supported path but not the one the library documents, so the source card (`engineering/ecosystem/sandbox-runtime-source-card.md` on the sandbox branch) lists it as a re-check trigger.
- The library returns a shell string. The runner starts `/bin/sh -c` with `shell: false`; every interpolated value is a recipe constant or a Host path, single-quoted.
- The library always makes `/tmp/claude` writable; the policy denies it again.
- Cancellation and the Host's pre-spawn checks take precedence over `sandbox_unavailable`. With any of them no process starts.
- No schema field was added. `sandbox_unavailable` settles through the path `spawn_failed` uses.

**Measured cost.** A one-file `node --test` through the runner: about 253 ms before, about 338 ms after, median of five, preflight included.

**Lane holder's change.** One existing test cancelled after a fixed 200 ms and failed three runs in four once the sandbox made the process start later. It now cancels when the process has written its first output.

**Contract:** [check recipes](../../../app/docs/check-recipes.md#environment-policy).

**Not run.** Everything on Linux: bubblewrap, the PID-namespace lifetime bound, the CI steps, and the tests on `ubuntu-latest`. The sandbox tests do not skip there. Other macOS versions. Whether the npm tarball was built from the upstream tag.

**Limits that stay.**

- R1 denies the home directory and the data directory. Anything else the user can read stays readable, for example another volume or a source repository outside the home directory.
- On macOS an own-session descendant can recreate the check's removed temporary directory, because the write allowance names that path.
- On Linux the library keeps a count of active sandboxes. Whether the preflight's cleanup can disturb a check running at the same time has not been run.

**Returned to the UX owner.** The approval card says the check runs "with your access to this computer" (`web/app.mjs`), which is no longer true. The scope line in `web/thread-projection.mjs` names only the minimal environment.

**Worker deviation.** During the spike the worker listed `~/.ssh` once inside the sandbox and once outside as a control, against the work order. It computed an entry count, displayed nothing and read no file. Reported to the user.

Not independently accepted.

## Path policy is matched on the canonical path (review lead F3)

- **Defect, reproduced on APFS.** A deny or ask rule written for one spelling of a path did not match another spelling that opens the same file. All three tool families open a file through its NFD, upper-case and upper-case NFD spellings. Policy matching folded case for `repo_*` and `candidate_*` only, and normalization for none. Six failing tests before the fix, through `evaluatePolicy`, `governTools` and the real Host.
- **Ruling, as corrected after the independent review (AR1, AR3).** A path rule applies to a file, not to a spelling. For every `ws_*`, `repo_*` and `candidate_*` action the rules are read on the path as requested, on its lower-case form and on its alias-folded form; the strictest result holds. The first two readings are what `main` does for the workspace and repository families, so no policy becomes weaker than it is on `main`.
- **What this replaced.** The first ruling matched on NFC plus lower case alone and stated that matching more could only tighten. Both were wrong. Lower-casing keeps apart spellings that APFS aliases, and within a layer the last matching rule wins, so a reading that matches more rules can let a later allow win.
- **Unchanged.** Action patterns, `runtime_load` ids, MCP actions. Compatibility forms such as full-width letters stay distinct; APFS does not alias them, confirmed by test.
- **Checked, no defect.** Path-syntax aliases. The repository helpers refuse `./`, `//`, `..` and a trailing slash. The workspace resolver normalizes them before the policy sees the path.
- **Also fixed here, as corrected (AR2).** The search worker records each file's device and inode when it names it and reads only a file whose opened descriptor has the same identity. `O_NOFOLLOW` alone covered the last path component only. Tests swap the file, and then its parent directory, for a symlink inside the admission callback.
- **Contract:** [repository binding](../../../app/docs/repository-binding.md), [Runtime Control API](../../../docs/runtime-control/api.md).
- **Writer.** A Sonnet worker; the lane holder reviewed the diff and wrote the `O_NOFOLLOW` change and its test. Not independently accepted.

## Rulings on parked capabilities

The convergence loop listed six items under "Needs a ruling" in its owner record on `claude/converge-loop-20260929`. Input: a read-only Sonnet survey of each item's consumers, persisted-data coupling and owner-record status. The test applied: code leaves the product tree when nothing can reach it and no stated rule or persisted record depends on it. Code that is the only executable evidence for a stated contract stays.

| Item | Ruling | Reason |
|---|---|---|
| Hermes `/v1/runs` adapter | Keep | It has no Host seam and no persisted coupling, so it costs the product nothing. It is accepted evidence for a direction the user has registered, and its revival waits only on the user's permission decision. A frozen check recipe names its test file. |
| Managed Agents-API executor | Keep | It is the only executable evidence for the Runtime Port obligations that in-process Pi does not exercise: intent before send, unknown delivery, recover and `submitToolResult`. Schema 19 and 22 records name it. Removing it would leave the Port with one consumer and no test of its neutrality. |
| Local Pi worker | Keep, dormant | Schema 20 records name it, and it is the only evidence for dispatch-before-spawn and retained-result recovery of an external process. Its validators return early when no record exists. |
| Runtime-management and agent-profile specimen pages | Remove from `app/`; returned to the UX owner to carry out | Nothing in the product loads them, their contracts describe Host fields that do not exist, and their fixture receipts must not be read as live facts. The production Host still serves them through the static allow-list. Design references belong under `engineering/design/` or in Git history at a recorded SHA, not in the served product tree. |
| Data-format compatibility readers | Keep; each reader needs its own retirement decision | Removing a reader does not delete data, but it makes older data unreadable. Only the user knows whether any data directory or browser profile older than the current formats still matters. |
| Web `runtimeSelection` legacy branch | Remove; returned to the UX owner | The Host always advertises `expectation-v1`, so the branch cannot run against this Host. It is an obsolete path, not a data reader. |
| `check_run` containment | Ruled above | |

**Data readers: retained.** The lane holder first recommended removing them as a whole once every needed data directory had been opened by a schema-22 Host. The independent review showed that condition proves too little, and the recommendation is withdrawn; see [corrections](#corrections-after-the-independent-review--lane-holder-2026-09-29).

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

### Non-author review (Sonnet)

A fresh Sonnet agent, given only commit `796a465` and the claimed rules, tried to break them in detached copies of `796a465` and `87e2207`. The new tests fail on the old production files for the intended reasons. With no policy, the model-visible output of `ws_grep` and `ws_list` is byte-identical across a fixture with nested directories, binary files, the size limit and the match cap.

| Claim | Verdict |
|---|---|
| D6 two-phase search protocol never hangs and always stops its worker | Confirmed |
| D6 path form equals the one `ws_read` admission uses; traversal follows no symlink | Confirmed |
| D6 "never returns content unless `ws_read` allows" | Weakened by path aliases, below |
| D9 | Confirmed. `outcome` is set in one place only, and `operation` is always present. |
| D10 | Confirmed. No tool id differs from its dispatch name. |

| Finding | Disposition |
|---|---|
| A case variant of a path (`MATERIALS`, `SECRET.txt`) passes a `ws_read` deny on a case-insensitive volume. `ws_read` and the Spark source tools share it; it predates D6. | Adopt. It is the same defect as review lead F3 and is fixed with it, below. |
| Between naming and opening, a file swapped for a symlink is followed, because the search worker opens by path without `O_NOFOLLOW`. No model tool can rename or link, so it needs another local actor. | Adopt, small. Open with `O_NOFOLLOW` in the worker. |
| An `ask` rule on `ws_grep` itself is approved at the call and then excludes every file as pending. `repo_grep` behaves the same way. | Defer. It withholds too much, never too little. Reopen when a person sets an `ask` rule on an aggregate tool; the rule to settle is whether approving the call satisfies the tool's own `ask` for each file. |
| Admission runs on the Host's main thread, twice per file, and compiles a pattern per rule. With 60 rules and 6,000 files the search times out where it used to succeed. | Defer. Reopen when a workspace and policy of that size exist; cache the compiled rule patterns first. |
| Reads in flight when the Core fails also carry `outcome: "unknown"`. | Adopt as stated. The Host does not know their outcome either, and a read can be repeated. |
| The D10 table test compares two calls of the same function. | Adopt as stated. It pins that evaluate and dispatch use one function, which is the rule. |

Acceptance of D6, D9 and D10 by the lane holder waits on the F3 fix, since D6's rule does not hold without it.

## Independent handoff review · Astra, 2026-09-29

**Disposition: return F3 and the D6 symlink hardening for correction; do not claim this delivery accepted or integrated.** This review changes no product code. Source: the actual uncommitted delivery in the three architect worktrees, against `main` at `87e2207`; architect HEAD `5ec3101`, sandbox/probes HEAD `87e2207`. [Source hashes](evidence/astra-review/sources.json) pin the changed product/test files, including untracked implementation files, because HEAD alone does not identify this delivery. Existing author edits are preserved. No branch was pushed and no PR was created.

### Findings and dispositions

| Review input | Disposition | Evidence and required correction |
|---|---|---|
| AR1 · P1 · F3 still admits an APFS alias | Adopt; F3 remains open | A synthetic `Σ.txt` is readable as `ς.txt` on the tested volume. `canonicalPath` in `app/runtime/control-plane.mjs` uses NFC plus `toLowerCase`: the deny pattern becomes `σ.txt`, while the requested alias stays `ς.txt`. All three path action families return `allow` for that alias. The correction must cover filesystem-equivalent Unicode case forms, with the same identity used by admission and access; ASCII upper/lower and NFC/NFD tests do not establish that property. |
| AR2 · P2 · D6's `O_NOFOLLOW` fix covers only the final component | Adopt; return the hardening claim for correction | In the existing admission window, rename the synthetic `materials` directory and replace it with a symlink to a synthetic directory outside the workspace. `ws_grep` returns that outside file's text as `materials/open.txt`. `open(entry.full, O_NOFOLLOW)` in `app/runtime/grep-worker.mjs` does not protect ancestor components. This requires another local filesystem actor; no model rename/link tool was demonstrated. Secure path traversal and the eventual open must preserve the admitted directory identity. Repeating an unchecked path lookup alone is not sufficient. |
| AR3 · P2 · Canonicalization can loosen an existing policy | Adopt; adjust the F3 ruling and handle conflicting rules | For one user layer containing `deny private.txt` followed by `allow PRIVATE.txt`, evaluating `ws_read private.txt` changes from `deny` on `87e2207` to `allow` on the delivery. Selection still uses `.at(-1)` within a layer; only the selected effects across layers use strictest precedence. On a case-sensitive volume these names can be distinct files. Therefore the earlier statement that extra matches can only tighten permission is false. Resolve canonical-rule collisions/migration explicitly while retaining or deliberately revising the documented last-match rule; do not silently weaken an existing deny. |

[Reproducer](evidence/astra-review/reproduce.mjs) and [observed output](evidence/astra-review/reproduction.jsonl). From this worktree: `node engineering/execution/architect-20260929/evidence/astra-review/reproduce.mjs app`. The script asserts the observed counterexamples, not successful product behavior. It creates and removes only its own temporary synthetic files. A separate comparison imported the unchanged main policy evaluator and the delivery evaluator with the AR3 rules; output was `{"before":"deny","after":"allow"}`. No personal credential directory was listed or read.

### Verification scope

Checks run serially across worktrees, with `--test-concurrency=1` inside each invocation. Full-suite claims from the handoff were not independently repeated. Logs and final counts are recorded in [verification](evidence/astra-review/verification.md).

The macOS sandbox code and its 28 focused tests provide evidence for the exercised read/write, loopback network, unavailable-mechanism and process-group paths. They do not independently re-establish the author's whole R1–R5 spike matrix: public TCP, UDP, DNS, Apple Events/launchd/open, own-session descendants and other macOS versions were not rerun in this review. Linux, concurrent Linux cleanup and PID-namespace lifetime remain unverified. A Linux CI run must contain assertions for the specific Linux claims; a green default suite alone cannot prove all of them.

### Decisions requested by the handoff

- **Data compatibility readers: retain pending a separate data-format retirement decision.** Opening a directory with a schema-22 Host does not prove that every retained payload has been rewritten: the Store migration preserves `events` from the old object, browser skin preferences live separately, and credentials have their own migration. The proposed blanket removal condition is insufficient. Each reader needs its own retained-data invariant, migration or explicit retirement decision and synthetic recovery evidence. Do not inspect personal stores to make this decision.
- **Linux CI: recommended as draft-PR verification, not acceptance.** This handoff asks for authorization; it does not itself grant permission to push. No push is performed here. Fix AR1–AR3 and pin the delivery before requesting acceptance; a draft PR may separately gather Linux evidence when the user authorizes publishing it.
- **Reported worker deviation:** retain the incident as an instruction violation, including the outside-sandbox control. No-content-read limits the reported exposure; it does not excuse the forbidden directory access. This review did not independently reconstruct the worker's earlier actions.
- **UX follow-ups:** remain with the existing UX owner. This review does not edit the approval card, unknown-outcome handlers or specimen pages.

## Corrections after the independent review · lane holder, 2026-09-29

The [independent review](#independent-handoff-review--astra-2026-09-29) returned F3 and the D6 symlink hardening. All three findings were adopted. This section is the author's correction; it is not acceptance.

| Finding | Correction | Evidence |
|---|---|---|
| AR1 · an APFS alias still passes | The fold is NFD, upper case, lower case, repeated until stable. The volume is asked which names collide: of 81,595 single-code-point names created on this APFS volume, 1,979 collide with an earlier one. NFC plus lower case leaves 26 of those unequal, among them U+03C2 final sigma. The new fold leaves none. | `app/tests/path-alias-oracle.test.mjs`; fails on the F3 commit, passes after |
| AR2 · `O_NOFOLLOW` covers one component | Identity comparison of the opened descriptor with the file named. A first attempt compared path strings and refused every file whose requested spelling differed from the stored one; five existing tests caught it before it was kept. | `app/tests/workspace.test.mjs`, directory-swap test; fails on the F3 commit |
| AR3 · folding can loosen | Three readings, strictest holds. The documented last-match override is unchanged and tested. | AR3 tests in `path-alias-oracle.test.mjs`; `deny → allow` case fails on the F3 commit |

The reviewer's [reproducer](evidence/astra-review/reproduce.mjs) asserts that the counterexamples exist, so on the corrected code it stops at its first assertion. With its three assertions removed in a scratch copy, its probes report: parent-directory swap `leaked: false`; `ς.txt` `deny` for `ws_read`, `repo_read` and `candidate_read`; rule collision `deny`.

**Limits.**

- The oracle covers names that differ in one code point. Aliases that exist only between longer sequences are covered by normalization and by applying the fold to each code point, not by their own enumeration.
- The oracle states what this volume aliases. On a volume that aliases nothing it reports that it had nothing to compare.
- The identity comparison treats a hard link as the same file.
- The oracle creates about 80,000 empty files in a temporary directory and takes about nine seconds.

**Decisions taken from the review.**

- Data compatibility readers stay. The recommendation to remove them as a whole is withdrawn: a schema-22 open does not show that events, credentials and browser preferences were each rewritten. Each reader needs its own retirement decision.
- No branch is pushed and no pull request is opened. Linux stays not run.
- The worker's listing of `~/.ssh` stands as a violation of the work order.

## Independent rereview of `5e11e01` · Astra

**Disposition: the original three concrete inputs are corrected; F3 and D6 still require correction before acceptance.** Reviewed committed source `5e11e019b016f2c8e4f39bf48280b52db4fb3b7f`, with no product edits. [Evidence, commands and limits](evidence/astra-rereview-5e11e01/verification.md). The historical review and its expected-defect assertions are unchanged; [positive revalidation](evidence/astra-rereview-5e11e01/original-inputs.mjs) explicitly asserts each original input's corrected outcome.

| Owner input | Rereview disposition | Reproduction and correction boundary |
|---|---|---|
| AR1 / F3 alias folding · P1 | Exact-name sigma case corrected; adopt remaining wildcard counterexample | With the single rule `deny aσ*`, `aσx.txt` is denied but the same file opened as `aςx.txt` is allowed. The fold acts on whole strings: the pattern becomes `aς*` while the filename becomes `aσx.txt` because lower-casing capital sigma depends on its surrounding text. The fixed-context single-code-point oracle does not test this pattern/resource interaction. All three action families return the wrong allow, and the production `governTools` + `ws_read` path reads the synthetic denied file. Pattern matching must preserve filesystem-alias semantics across literal and wildcard boundaries. |
| AR3 / F3 conflicting alias rules · P1 | Adopt same-spelling monotonicity; alias-invariant policy is still unmet | For `deny private.txt` followed by `allow PRIVATE.txt`, the original lowercase query now stays denied. But requesting `PRIVATE.txt` returns allow, though the volume opens the same file. The three readings all allow that request; taking their maximum never considers the lowercase spelling's original-reading deny. The documentation's claim that a deny holds when conflicting rules name aliases is false. Retain the documented last-match behavior for ordinary overrides, while making effective permission consistent over proven aliases and preventing old denies from weakening; ambiguous-policy validation/migration must be deliberate. |
| AR2 / D6 traversal identity · P2 | Post-enumeration swap corrected; adopt earlier traversal counterexample | After `files()` has lstat'ed `materials` as a directory but before `opendir(materials)`, another local actor can rename it and install an outside-directory symlink. Enumeration then records the outside file's dev/inode; the later descriptor check correctly matches those same outside values and returns its text as `materials/open.txt`. This requires the same class of local filesystem actor as AR2. Protect the directory traversal that establishes the admitted file identity, not only the final open. |

The two policy cases and the earlier directory-swap schedule are retained in [remaining-counterexamples.mjs](evidence/astra-rereview-5e11e01/remaining-counterexamples.mjs), with [observed results](evidence/astra-rereview-5e11e01/remaining-results.jsonl). The traversal probe runs the production worker and injects only scheduling plus real filesystem changes at the lstat/opendir boundary; it is not a full-Host external-process race. No personal files are involved.

**Verification.** `path-alias-oracle`, `control-plane` and `workspace` pass 48/48 with file concurrency 1, including the volume oracle. Original-input assertions pass separately. These results establish the specific fixes without proving the broader contracts; the remaining counterexamples are separate evidence. The oracle is bounded to its generated names/context and checks folded-bucket membership, not the identity of the actual colliding pair. No repeat of the full suite, Linux, cross-branch integration, A2/A3, sandbox or S11 review occurred here.

**Standing decisions.** Compatibility readers stay. No push or PR is authorized or performed. The earlier S11 process-lifetime review remains outside this rereview; this record does not close its finding. Only review evidence and the owner/current-status documentation changed.

## Integration and handoff for re-review · lane holder, 2026-09-30

The user asked for the three branches to be merged and verified together, then handed to the reviewer. This section is the author's integration record. It is not acceptance.

### What is integrated

Branch `claude/architect-integration-20260929`, from `main` at `87e2207`, three `--no-ff` merges with no conflict:

| Merged branch | Head | Carries |
|---|---|---|
| `claude/architect-20260929` | `5e11e01` | D6, D9, D10; F3 with the AR1–AR3 corrections; this record |
| `claude/architect-probes-20260929` | `d250d49` | A2 executor lineage; A3 decisions in the next context |
| `claude/architect-check-sandbox-20260929` | `c71c6b4` | Check containment |

The code under review is merge commit `9795a13`. The commit that adds this section changes this file only. Not pushed; no pull request.

### Checks on the merged code

Dependencies installed with `npm --prefix app ci --ignore-scripts`. macOS 27, Node 25.9. Other sessions were using the machine: load average was 49 at the end of the suite.

| Check | Result |
|---|---|
| `node app/scripts/check-historical-fixtures.mjs` | 45 checks verified |
| `node tools/check-doc-links.mjs` | no problems |
| `npm --prefix app test` | 1903 of 1904 passed |
| `npm --prefix app run smoke` | exit 0; real provider not run |
| The reviewer's three probes, assertions removed in a scratch copy | directory swap `leaked: false`; `ς.txt` `deny` for `ws_read`, `repo_read`, `candidate_read`; rule collision `deny` |

The one suite failure is `profile-editor` K5-R2, a browser-side save test that waits on timers. It passed 5 of 5 alone. The merge changes no file under `app/web`. It is recorded as a failure under load, not explained further.

### I1 · The two fixed Courtwork recipes cannot pass inside the sandbox

Found by running each fixed recipe through `runCheckRecipe` with the merged worktree as the candidate. It exists on the sandbox branch alone; the merge did not cause it.

| Recipe | Result in the sandbox | Cause |
|---|---|---|
| `node-test-attention-contract` | 25 tests, 3 fail | The tests start an HTTP Host on `127.0.0.1`; `listen` fails `EPERM` under R3 |
| `node-test-harness-contract` | 108 tests, 37 fail | The same; and `check-recipes.test.mjs` starts a check sandbox of its own, which cannot nest |

The suite did not catch this because the recipe tests run stub files in a synthetic candidate, not the real test files.

**Not ruled.** Two ways out, with their cost:

- Let a recipe declare loopback access. A check could then reach every service listening on this computer, the Host's own API among them. R3 would no longer hold for that recipe.
- Keep R3 and change what the recipes run, so that a fixed recipe names only tests that need no listener and start no check. The self-check of the Host over HTTP then stays outside `check_run`.

The lane holder recommends the second and has not carried it out. Until it is ruled, the contract's claim that these two recipes are usable on a Courtwork candidate is false on the merged code.

### What the reviewer is asked to judge

1. AR1–AR3 as corrected in `7fbb5eb`, on the merged code.
2. D6, D9 and D10, whose rule depended on F3.
3. A2 and A3, which have had no non-author review.
4. Check containment on macOS, and I1.

### Not run

Linux in every respect. The R1–R5 spike matrix beyond what `check-sandbox.test.mjs` asserts. macOS versions other than 27. A real model. The browser against the changed HTTP outcomes. A quiet-machine repeat of the full suite on the merged code.

## Independent integrated review · Astra, 2026-09-30

**Disposition: integration is not accepted.** The three branch merges exist as reported; the reviewed code is `9795a13`, with record-only HEAD `fc3fb2c`. The old concrete AR inputs pass, but the later rereview's three residual cases still reproduce on the integrated code. [Commands, source identities, results and limits](evidence/astra-integration-9795a13/verification.md). No product code was changed in this review.

| Owner item | Disposition | Evidence and boundary |
|---|---|---|
| AR1 / F3 · P1 | Keep open: wildcard/context bypass | A single `deny aσ*` rejects `aσx.txt` but permits its APFS alias `aςx.txt`. Whole-string lower-casing treats the pattern's sigma as final but the filename's as medial. Production `governTools` + `ws_read` returns the synthetic denied file. The fixed-context oracle does not exercise this glob interaction. |
| AR3 / F3 · P1 | Same-request monotonicity accepted; alias-conflict invariant still open | `deny private.txt` followed by `allow PRIVATE.txt` now rejects the lowercase request, but still permits the uppercase alias of the same file. All three readings of that uppercase request allow it. Preserving an old request's effect does not make effects equal across aliases. |
| AR2 / D6 · P2 | Keep open: earlier directory traversal race | Replacing an ancestor after directory lstat and before opendir makes enumeration record the outside file's identity. The descriptor check then agrees with those outside dev/inode values and returns the outside bytes. This requires another local filesystem actor; the deterministic production-worker scheduling probe is documented in the evidence. |
| D9 | Accept the scoped backend correction | A sent Core mutation timing out reaches real HTTP as 503 with outcome/operation; a Core refusal remains 409. Browser recovery and every Work Extension action path were not accepted here and stay with the existing owner. |
| D10 | Accept Host-ceiling parity within its scope | Advisory evaluation calls the same `hostToolCeiling` as dispatch; the exposed-tool/permission-mode matrix passes. The shared path policy still has the F3 defects above, so parity is not policy-security acceptance. |
| A2 | Accept implementation within the tested synthetic upgrade scope | Recorded Run adapter identity stays readable across synthetic old-lineage rewrites; unavailable lineages cannot start new Runs; Kit adapter id/revision load as recorded while current admission remains separate. Existing compatibility readers are retained. No real old-runtime upgrade or personal data was used. |
| A3 | Accept implementation within the tested restart/context scope | The real synthetic HTTP Host, restart and new Session carry reject/request-evidence reasons in both domains. Required context stays mandatory; newest whole decisions fit the budget and omissions are counted. This proves context delivery, not that a real model will follow it. |
| D4 / macOS containment | Scoped assertions pass; do not accept the whole delivery | The tested read/write, loopback-network, unavailable-mechanism and same-group cleanup paths pass. The broader author spike matrix, Linux and S11 integration remain outside this review; real recipe incompatibility I1 is confirmed below. |

**Latest probe selection matters.** The integration handoff reran the older three concrete inputs. Those corrections are real and their positive assertions pass here. The [latest residual script](evidence/astra-integration-9795a13/remaining-counterexamples.mjs) and [integrated results](evidence/astra-integration-9795a13/remaining-results.jsonl) retain the three later cases. This is not a merge regression: the relevant implementation bytes are unchanged from `5e11e01`.

### I1 ruling: retain R3 and revise the fixed recipes

**Adopt I1; choose the second path.** Do not add a loopback exception, a per-recipe network opt-out or an unsandboxed fallback. R3 remains a property of candidate-authored check execution. HTTP Host tests and sandbox lifecycle tests continue in the trusted developer/CI verification outside `check_run`.

Independent execution of the actual frozen recipe argv through `runCheckRecipe` confirms Attention 22/25 and Harness 71/108, both exit 1. Logs contain `listen EPERM` on `127.0.0.1`; Harness also records sandbox-start failures. Neither result timed out or truncated output. Stub candidate files verify invocation and receipt mechanics; they do not establish that the named Courtwork tests can run under the policy.

The recipe owner must now select meaningful offline tests that run with a read-only candidate and the check's own temporary directory, without listeners or nested checks. Changing the advertised coverage requires a new recipe version (or distinctly named replacement), accurate title/scope and synchronized catalog/contract/tests. Keep historical receipts/goldens identified by their original version, and preserve exact approval matching so an approval for the old argv cannot authorize replacement argv. Required completion evidence is the real revised frozen recipe against a prepared Courtwork candidate under the unchanged production sandbox, plus the separate trusted HTTP/lifecycle checks. I1 remains an implementation obligation; this review does not claim it fixed or silently reduce coverage.

**Verification result.** Nine focused test files ran serially: 81/81, no skips. The two real recipes failed with the counts above. No new full-suite result is claimed; the author's 1903/1904 and five isolated K5-R2 passes remain separate evidence. Prior non-author focused A2/A3 runs existed; this section adds the explicit integrated-source review disposition. Compatibility readers remain; no push, PR, main merge, deployment or external message is authorized by this review.

## Second correction and handoff · lane holder, 2026-09-30

The re-review of `5e11e01` and the integrated review of `9795a13` returned F3 and D6 again and ruled I1. This section is the author's correction record. It is not acceptance. The code under review is merge commit `0664387` on `claude/architect-integration-20260929`; the commit that adds this section changes records and evidence only. Not pushed; no pull request.

### Why the first correction failed

The first correction guaranteed that one request spelling never got a weaker effect than on `main`. The property that matters is that the effect depends on the file and not on the spelling. Two of the three readings used the request's own spelling, so an alias could still choose its reading. The fold lower-cased whole strings, which depends on context. The traversal was hardened one window at a time with path operations, which cannot bind a directory to what is read from it.

### F3 · one effect per file

| Review finding | Correction |
|---|---|
| `deny aσ*` allowed `aςx.txt` | The fold works one code point at a time, so it gives the same result beside a `*` as inside a name. |
| `deny private.txt` then `allow PRIVATE.txt` allowed the upper-case request | Policy is evaluated once, on the alias-folded path. The request's spelling is never consulted. |
| The oracle checked bucket membership, not the colliding pair | On a collision the volume is asked which stored name the spelling opened, and that pair must fold equal. Each pair is checked again at the start, middle and end of a longer name. |

**Which rule applies.** The last matching rule of a layer wins, as documented. A later rule overrides an earlier, stricter one only when one spelling of the path matches both rules as written. When two rules meet on a file through folding alone, the stricter holds and the trace marks it `held: "alias-conflict"`.

**What is given up, for the reviewer to judge.** Three properties cannot hold together:

1. every spelling of a file gets one effect;
2. no spelling gets a weaker effect than it had on `main`;
3. `deny *` followed by `allow out/*` allows files under `out/`.

On `main`, with those two rules, `OUT/a.txt` is denied and `out/a.txt` is allowed, and both open one file. Properties 1 and 2 together force both to deny, which removes property 3 for every literal allow under a wildcard deny. The correction keeps 1 and 3. A deny therefore holds wherever no later rule could have applied to the same spelling, and is overridden where one could. The contract states this under "What this gives up" in [repository binding](../../../app/docs/repository-binding.md).

**Evidence.** On this APFS volume 1,979 single-code-point names collide with an earlier one; all fold equal to the file they open, and so do 7,916 of them placed inside longer names. A seeded test builds 3,000 random policies and requires eight spellings of each path to get one effect. Four of the new tests fail on `46b728d`, the commit before the policy change, and pass after. The author's [recheck](evidence/lane-holder-recheck/recheck.mjs) asserts the corrected outcome for every policy counterexample from the three reviews, through the evaluator and through `governTools` with a real `ws_read`; [output](evidence/lane-holder-recheck/recheck-0664387.jsonl).

### D6 · file identity is established by descriptor

**Ruling.** Every model-reachable workspace tool establishes a file's identity by walking from one root descriptor, each component opened relative to its parent with `O_NOFOLLOW`. The workspace tools use the fixed dirfd helper the repository tools use; the Node traversal and its identity checks are removed.

| Tool | Before | Now |
|---|---|---|
| `ws_grep`, `ws_list` | Traversal by path; a directory swapped between `lstat` and `opendir` was followed | `ws_scan` names files without opening them. The Host admits by policy. `ws_read` re-walks and reads a file only when its device and inode are the ones named. A withheld file is never opened. |
| `ws_read` | Resolved, then reopened by name. A probe returned a file outside the workspace. | Read from the descriptor reached by the walk. |
| `ws_write` | The same window. A probe overwrote an existing file outside the workspace while the tool reported a workspace path. | Staged as a new file in the parent reached by the walk; renamed within that directory descriptor after the parent and the staged file are confirmed unchanged. A symlink, directory or other non-regular target is refused. |
| Admission, approval card, write record | Named the path as requested | Name the path as it is on disk |

**Evidence.** A child process swaps `materials` for an outside symlink as fast as it can while the tool runs 200 times.

| Tool | Old code | New code |
|---|---|---|
| `ws_grep` | 1 leak in 200 | 67,392 swaps, no leak |
| `ws_read` | leaks in 3 of 6 runs | 35,072 swaps, no leak |
| `ws_write` | no outside write observed | 73,664 swaps, outside unchanged |

A passing loop covers only the interleavings this machine produced. The defect in `ws_write` rests on the deterministic probe, not on the loop. The reviewer's traversal probe drove the old worker protocol, which no longer exists; its schedule is asserted by `app/tests/workspace-traversal-identity.test.mjs` at the new boundary.

**Cost.** Each helper call starts Python, about 30 ms. Median of 20 on a small file, through `governTools`: `ws_read` 0.15 ms to 76 ms; `ws_write` 0.34 ms to 114 ms. `ws_grep` on 2,000 files: 236 ms to 224 ms; `ws_list` 163 ms to 204 ms.

**Observable changes.** Workspace tools need the configured Python 3. Errors that exposed an absolute host path are workspace errors. A scan of roughly 100,000 files exceeds the helper's output cap and fails. `ws_write` onto a FIFO is refused; it used to replace it. The helper's request cap is 8 MiB, which a 4 MiB write needs.

**Deferred, with trigger.** `GET /sessions/:id/workspace/file` and material upload still resolve by path. They act for the person who owns the workspace and live in `app/server/service.mjs`, which another writer is editing. Reopen when that file is free; the read needs a helper mode that returns the first bytes and a whole-file hash from one descriptor.

**Limits that stay.** A hard link counts as the same file. Mount points inside the workspace are followed. If the parent is swapped between staging and commit, the staged file stays in the moved directory.

### I1 · the fixed recipes are version 2

Carried out as the reviewer ruled; the sandbox policy is unchanged.

| Recipe | Real candidate, production sandbox, frozen limits |
|---|---|
| `node-test-attention-contract` v2 | exit 0, 21 of 21, 2.7 s, 2,321 bytes of output |
| `node-test-harness-contract` v2 | exit 0, 78 of 78, 4.6 s, 8,156 bytes of output |

- A v1 approval cannot start v2, whether the version, the argv or both differ; nothing starts.
- A Store holding v1 approvals and receipts reopens byte-identical and displays v1. The catalog keeps no v1 entry, because neither the Store nor the display consults the catalog.
- Three test files are split into an offline file and a Host file: `control-plane` 21 into 14 and 7, `request-summary` 10 into 7 and 3, `runtime-load-recovery` 10 into 9 and 1. The suite runs both halves.
- `app/tests/check-recipes-real.test.mjs` runs each frozen recipe on this repository through the real runner and sandbox. It fails when the sandbox is unavailable and names the cause when `app/node_modules` is a link out of the repository.

**Coverage the recipes no longer have,** all still run by `npm --prefix app test`: the Attention HTTP round trip; Hermes protocol conformance; the recipe catalog and runner; the Host half of the control plane.

**Found while classifying,** recorded and not changed:

- Of 254 test files, 141 cannot pass in the sandbox, nearly all because the test helper starts a Host on loopback.
- `git` fails in the sandbox on macOS: it writes an `xcrun` cache in the system temporary directory, which the write rule denies.
- A candidate that is a Git worktree has a `.git` file pointing into the home directory, which the read rule denies. Product candidates are private clones.
- A candidate's dependencies must be real files inside it. The lane holder's first worktree for this work linked `app/node_modules` to another worktree, and no dependency could load.
- Not explained: `hpr_p02` and one test of `review-core-client-lifecycle` fail in the sandbox. Neither is in a recipe.

### Checks on the merged code `0664387`

macOS 27, Node 25.9, dependencies from `npm --prefix app ci --ignore-scripts`. Load average 3.6 at the start of the suite and 8.3 at the end.

| Check | Result |
|---|---|
| `node app/scripts/check-historical-fixtures.mjs` | 45 checks verified |
| `node tools/check-doc-links.mjs` | no problems |
| `npm --prefix app test` | 1929 of 1929, none skipped, 314 s |
| `npm --prefix app run smoke` | exit 0; real provider not run |
| Author's recheck of the policy counterexamples | every corrected outcome asserted |

### Process

- A worker asked the lane holder to run two commands the permission check had refused for it, removing a link and copying a dependency tree. The lane holder did not run them and gave the worker a new worktree with dependencies installed the ordinary way.
- The permission check returned no verdict during part of one worker's run. The lane holder compared that worker's changes with its report: eleven files, as listed; no other worktree or dependency tree touched.

### What the reviewer is asked to judge

1. F3: the choice among the three properties above, and the shared-spelling rule for overrides.
2. D6: descriptor-relative identity for `ws_grep`, `ws_list`, `ws_read` and `ws_write`, and the deferral of the two HTTP endpoints.
3. I1: the revised recipes against the ruling.
4. Returned to the UX owner, not changed here: Settings reads the last trace entry as the deciding step, and a trace can now end with an `alias-conflict` entry; the approval card still says a check runs with the person's access to the computer.

### Not run

Linux in every respect, including the helper's `ELOOP` handling and Python subprocesses in the recipes. A volume that keeps case or normalization apart. macOS versions other than 27. A real model. The browser. A race by a real process against the two deferred HTTP endpoints. Hard-link aliasing. The R1–R5 spike matrix beyond what `check-sandbox.test.mjs` asserts.

## Architect continuation and independent review, 2026-09-30

The user requested architecture continuation for Harness Core and Extensions dogfooding, workspace acceptance first, Luna 6 exploration, Sol 6.1 workers and Claude frontend/backend integration. The parent reviewer owns architectural dispositions and independent acceptance; Claude remains the integration author. This assignment does not declare real-model capability or human acceptance.

### Frozen inputs and ownership

- Main: `87e220723ad05a2279fb583a92fb5054ca23ba8b`. Its only untracked entries at intake were `.agents/`, `.obsidian/` and `skills-lock.json`; they were not inspected or modified.
- Architect delivery: `d5cf033`, product merge `0664387`; convergence delivery: `049f1b9`. Both original source trees are retained. The reviewer writes only records/evidence in an isolated checkout based on `d5cf033`.
- Responsibility: Host policy admission, workspace file identity, check containment and lifecycle; nearest precedents are this task's earlier counterexamples, the repository dirfd helper and convergence S11's process guard. Necessary cross-layer consumers are Settings policy traces, check approval disclosure and HTTP unknown/refusal presentation. Claude owns these integration changes and their existing UX contracts.
- Claude's existing "架构师角色交接" session received the bounded integration assignment through the desktop UI. It is to create a separate candidate from the two exact heads, retain the sandbox and guard, run focused checks then one serial full suite, and return its SHA. Main merge, push and deployment are not part of that assignment. No personal data, credential stores, paid providers or the user's port 8787 are used.
- Luna 6 independently explores F3/D6 and convergence contracts. A separate Luna 6 task traces registered external practices. Sol 6.1 compares DSH's documented GUI journeys with Courtwork capabilities, not source-code differences. Their reports are inputs for dispositions, not acceptance votes.

### Independent check evidence on `d5cf033`

The parent read the runner, sandbox, recipe and approval tests, then ran:

```sh
node --test --test-concurrency=1 app/tests/check-recipes-real.test.mjs app/tests/check-approval-revision.test.mjs app/tests/check-sandbox.test.mjs app/tests/check-runner-group-kill.test.mjs
```

Result: **28/28, zero skipped**, 16.44 seconds. The source tree's real dependencies were used; all Host/data fixtures are synthetic. The [raw result](evidence/continuation-20260930/check-review.log) belongs to this source, before convergence integration.

**I1: accept within the recipe contract.** Both real v2 Courtwork recipes pass through the production sandbox at their frozen limits. Old version/argv approvals cannot start the replacement. The advertised reduction to offline tests is explicit; HTTP/lifecycle coverage remains outside the candidate recipe. **D4: retain bounded macOS evidence, whole integration pending.** The tested dummy Host-data read, candidate/Git/data write denial, private temporary write, loopback denial, missing mechanism refusal and same-group cleanup hold. No Linux, full R1-R5 matrix, escaped-session termination or combined S11 guard claim follows from this run.

The parent does not repeat the author's 1929-test suite on unchanged source. The combined candidate requires fresh verification because guard/sandbox composition and shared Host/Core behavior change. F3/D6 and S12-S20 remain under review; the eventual source and remaining dogfood gates must be recorded here before the current snapshot is updated.

### Review dispositions before integration

| Input | Parent disposition and reason | Consumer and remaining evidence |
|---|---|---|
| F3 second correction, Luna's [30-test review](evidence/continuation-20260930/luna-path-review.md) | **Accept the bounded APFS policy correction.** One folded evaluation removes request-spelling authority. Preserve the documented `deny *` then `allow out/*` override; conflicting spellings without a shared literal match retain the stricter rule. This explicitly replaces the impossible promise of preserving every formerly inconsistent spelling outcome. | Existing path-policy contract and Claude's merged control plane. Case-sensitive volumes and Linux remain unverified; Settings must display `alias-conflict` truthfully. |
| D6 commit-time directory relocation | **Adopt finding R30-1; integration acceptance held.** The parent independently reran Luna's synthetic hook at the final descriptor-relative rename. Moving the admitted directory outside makes the tool report `out/memo.md` success although that pathname no longer exists. The unrelated outside control stays unchanged. This is relocation of the admitted directory by a local actor, not symlink redirection into an unrelated external file. | [Portable probe](evidence/continuation-20260930/write-move-probe.mjs), [before result](evidence/continuation-20260930/write-move-before.json). Claude owns accurate post-publication outcome/effect reporting and contract limits. Dirfd cannot promise permanent ancestry against an actor with directory-move rights; a detectable relocation must not be reported as ordinary pathname success or safe-to-repeat failure. |
| Convergence S15/S16/S18-S20, [Luna review](evidence/continuation-20260930/luna-loop-review.md) | **Accept the review input, not the whole branch.** No introduced defect found in the named contract paths; 23 focused checks pass. | Existing convergence owner. Preserve its explicit MCP policy/deletion and large/stale Matter rulings. Merged-source, browser and real-model evidence remain separate. |
| Local recall sample `103f660` | **Reference only.** Its six assertions exercise a standalone in-memory example, not Host admission, retention, discovery quality or cross-Provider caching. Its primary-source provenance is explicitly incomplete. | Keep its existing `docs/consumption-sample` owner and status; do not merge it as a Harness feature or use it to reopen accepted K3/K5. |

### Referenced discussion and mature-practice consumption

The user-linked **Orchestra 瓶颈分析**, `6abb3937-53e4-83ec-a29f-dbcdc9159608`, was read through the conversation tool. The [exact returned source](evidence/continuation-20260930/orchestra-thread.json) contains five turns and reports no next cursor; it is the returned scope, not a claim to recover unavailable earlier discussion. Its two image attachments were not inspected. Assistant claims, citation placeholders and proposed designs remain untrusted research input.

| Question | Disposition and reason | Actual consumer / trigger |
|---|---|---|
| Reuse work data across Providers while preserving domain structure | **Adopt as the current dogfood criterion:** a later admitted Run must recover original source identity, revision, constraints and limitations, while prior frozen Run context remains unchanged. Provider switching never grants access. | This task's next capability witness below; existing M09, K3/K5 and source-read owners. No new cache or memory schema is assigned. |
| Temporary structured views / summaries | **Adjust:** disposable views may aid navigation; source provenance, formal decisions and access checks remain with their current owners. A compressed summary is not proof that the source was read. | SourceWeft's bounded registered precedent and the existing Context/Kit/Spark disclosure contracts; validate one follow-up read after context disposal. |
| Three new cache layers, generic `project()` primitive, automatic shared semantics | **Defer.** These are proposals in the quoted discussion. No measured repeated consumer need or invalidation/authority contract is supplied. | M09 / resource governance; reopen only after the bounded reuse witness exposes a concrete missing mechanism. |
| Magpie integration claims and VibeMemBench numerical claims | **Reference only.** Existing Magpie source dispositions stay authoritative; the parallel RL-1 task does not independently validate Magpie. The paper/image claims are unnecessary to choose this bounded witness and were not independently checked. | Existing Magpie intake; revisit the exact primary paper only for a retrieval-quality evaluation. No benchmark or performance claim is made here. |

The [Luna source-tracing report](evidence/continuation-20260930/luna-source-tracing.md) locates the recent SourceWeft and Agent Runtime survey records in Praxis and corrects older direction text against accepted K3/K5. The [Sol DSH functional comparison](evidence/continuation-20260930/sol-dsh-functional-review.md) pins DSH `639ed015397290b3745d163aafe02ffee4aa3f84` / `0.2.0-rc.2`. Its GUI behavior is documented, not independently operated. Neither input confers runtime or security acceptance.

DSH dispositions: **adopt** interruption/recovery and truthful unavailable-route journeys as verification inputs for this existing integration; **defer** extension replace/rollback to the original LocalExtensions lifecycle contract when that user journey is scheduled; **defer** generic continuable child work to P07/RD-005 when an actual child consumer is selected. Existing installation, frozen Kit/Run binding and accepted coding journeys are not rebuilt. Arbitrary package acquisition and a broader provider catalog are not prerequisites for this round.

The next real capability witness, after the integration passes, should use one isolated Chat/candidate and a selected existing profile: read an admitted source, make one bounded edit, inspect/approve the check, interrupt or lose one response, reopen and inspect the exact effect, then continue with the same source revision or an explicit stale/revoked refusal. Preserve the artifact, Run identities, source/context receipts and zero-duplicate-effect observation. Deterministic UI evidence proves presentation and persistence only. A real-provider witness needs the user-entered key and an explicit bounded task/model; no key has been requested, read or used in this review.

## Merge of the two deliveries · merge author, 2026-09-30

The user, 2026-09-30, appointed a new architect to continue the independent review and made this session the single merge author for the architect delivery `d5cf033` (product `0664387`) and the convergence loop's `049f1b9`. Branch `claude/merge-20260930`, worktree `~/Projects/.worktrees/courtwork-merge-20260930`, from `d5cf033` with `049f1b9` merged `--no-ff` (`f3ea864`), the reviewer's record commits merged (`2212c83`), then the corrections below. The two delivery trees and the main UI checkout are untouched. Not merged to `main`, not pushed, not published. All product code in this merge is this session's authorship for review purposes.

### Rulings on the seven conflicting files

| File | Ruling |
|---|---|
| `app/runtime/control-plane.mjs` | The per-code-point alias policy (one effect per file, shared-spelling override, `alias-conflict` held rules) replaces S17's whole-string case fold for `ws_*`. S17's `conflict()` and `profileCovers()` are kept unchanged. |
| `app/tests/control-plane.test.mjs` | S17's case-alias test moves to `control-policy.test.mjs` (the offline policy file the v2 Harness recipe runs) and passes under the merged rule. |
| `app/runtime/check-runner.mjs` | S11's guard is the process-group leader and runs outside the sandbox; it starts the sandboxed command (`/bin/sh -c <wrapped>`) instead of the recipe command directly. Sandbox preparation, `sandbox_unavailable` with its precedence, the executable check, the guard's fd-3 exit report, Host-death supervision and the reap on every exit path are all kept. No-network and fail-closed are unchanged. |
| `app/tests/check-recipes.test.mjs` | Both sides: the loop's longer windows and stdout-based readiness, the sandbox's `dataDir`. |
| `app/docs/check-recipes.md` | Both: guard supervision and the sandbox; a descendant that leaves the group is outside the guard and, on macOS, stays sandboxed. |
| `app/docs/api-v6.md` | Both error-code lists. |
| `engineering/current.md` | The loop's UX-queue and convergence rows; the later review row. |

Merged without a textual conflict but changed for the sandbox: the S11 Host-death tests wrote pid files into the candidate directory, which the sandbox makes read-only. They now write into the check's own temporary directory (the only writable place) or read the fake Host's saved stdout, and every runner call passes `dataDir`. One of them also asserts that the recipe under the guard cannot read a stand-in credentials file in the data directory, so the guard-outside, sandbox-inside arrangement is tested, not inferred.

### Corrections in the merge

- **R30-1 (reviewer, D6).** A descriptor names a directory object, not a place. Between the commit's identity check and its rename, an actor with the same rights moved the admitted parent out of the workspace; the rename landed in the moved directory and the tool reported success at the workspace path. Reproduced on the merged code with the reviewer's [probe](evidence/continuation-20260930/write-move-probe.mjs). Correction (`9b386c6`): after the rename the helper walks from the root again; when the directory is no longer the one the path names, the tool returns `placement: "moved"` with the bytes and hash, states that the bytes are not at the path, records no `artifact.written` for that path, and leaves the bytes where they went (taking them back would change the moved directory a second time). A move after that check is not detected; the contract says so and no longer suggests that descriptors guarantee placement. The new test uses the reviewer's schedule with fixed assertions on the corrected outcome and fails on the unfixed code. The reviewer's probe asserts the old defect and is left unchanged.
- **Joint check-runner matrix, sandbox and guard together** (`app/tests/check-runner-group-kill.test.mjs`, `check-recipes.test.mjs`, `check-sandbox.test.mjs`, `check-recipes-real.test.mjs`): normal exit, cancel, timeout, spawn failure, Host killed while the leader runs (with the sandbox shown in force), Host killed after the leader exited, exit signals reported as the recipe's own, and both v2 recipes on this repository under the production sandbox with their frozen limits. Run alone: 17/17 and 94/94 across the check files.

### Cross-layer consumers added

Only what the merged Host facts need in the client; assigned to a Sonnet worker under the existing UX owner's grammar and copy convention, reviewed by the merge author: the Settings permission trace shows an `alias-conflict` step as the deciding one; the check approval card states the sandbox instead of the person's computer access; a Core `outcome: "unknown"` (D9) is classified as uncertain by the command feedback and the Attention send path, not as a refusal. Recorded below when returned.

### Not changed, by instruction

Data compatibility readers, the registered adapters and specimen surfaces, every "Needs a ruling" item, K3/K5, and the two HTTP workspace endpoints (deferred, `service.mjs`).
