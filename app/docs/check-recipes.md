# Host check recipes (DF-04)

DF-04 lets a Session run a Host-owned "check recipe" against the
Session's active private Git candidate (see
[`repository-binding.md`](repository-binding.md)). The contract is RD-009
["DF-04可施工合同"](../../engineering/research/RD-009-trusted-harness-extensions.md#df-04可施工合同).
This is a first Developer-consumer increment, not a general G1–G5
precondition. The recipe's process runs inside an OS sandbox; see
[Environment policy](#environment-policy).

## Catalog

`app/runtime/check-recipes.mjs` exports a frozen, code-defined catalog. It is
not user-editable in this slice — there is no API to add, remove or change a
recipe. The fixed catalog has three recipes, in this order:

| Field | Value |
|---|---|
| `id` | `node-test` |
| `version` | `1` |
| `title` | Run the package tests |
| `command` | the Host's own Node executable (`process.execPath`) |
| `argv` | `["--test"]` |
| `cwd` | the Session's active private candidate worktree |
| `timeoutMs` | `120000` |
| `outputLimitBytes` | `65536` |
| `env` | `minimal` (see below) |

The two Courtwork recipes below are **offline**: each names only test files
that pass with a read-only candidate and the check's own temporary directory,
with no listener and no nested check, because a check has no network at all
(not even loopback) and cannot start a sandbox of its own. Tests that boot a
Host over HTTP and the sandbox lifecycle tests are not in any recipe; they are
trusted developer and CI verification (`npm --prefix app test`), outside
`check_run`. The recipes were changed from v1 to v2 for this reason: v1 named
files that listen on `127.0.0.1` or start checks, so on a real Courtwork
candidate they could not pass (Attention 22 of 25, Harness 71 of 108). v1 is
not in the catalog and not runnable. Receipts and approvals recorded for v1
keep their recorded version and argv, display as v1, and cannot authorize v2:
approval matching is the exact descriptor comparison described under
[Approval](#approval).

`node-test-attention-contract` v2 is titled **Run Attention backend offline
contract tests**. It uses the same Host Node command, private candidate cwd,
120000 ms timeout, 65536 byte per-stream limit and minimal environment as
`node-test`. Its exact argv is:

```text
--test
--test-concurrency=1
app/tests/attention-core.test.mjs
app/tests/attention-recovery.test.mjs
app/tests/attention-github-fixture.test.mjs
app/tests/attention-gmail-fixture.test.mjs
app/tests/attention-trace-fixture.test.mjs
```

It covers the Attention Core (CAS, scope, receipts, signals), its crash
recovery, and the synthetic GitHub, Gmail and trace fixtures. It uses no live
connector or provider. It does not cover the Attention HTTP round trip, actor
ownership over HTTP or the runtime Attention adapter (`attention-http.test.mjs`
starts a Host); those are verified by `npm --prefix app test`.

`node-test-harness-contract` v2 is titled **Run Harness Core and Extensions
offline contract tests**. It uses the same Host Node command, private candidate
cwd, 120000 ms timeout, 65536 byte per-stream limit and minimal environment. Its
exact argv is:

```text
--test
--test-concurrency=1
app/tests/request-summary.test.mjs
app/tests/runtime-load-recovery.test.mjs
app/tests/kit-context.test.mjs
app/tests/kit-context-independent.test.mjs
app/tests/control-policy.test.mjs
app/tests/check-approval-authored-files.test.mjs
```

It covers the bounded `repo_list` request summary, `runtime_load` recovery
hints, Kit context compilation, the control-plane policy rules and path
matching, and the files a check approval lists. It is a selected regression set
for Courtwork's own private candidate (the RL-1 self-check), not all of Harness,
Extensions or product acceptance. It does not cover the Host-level halves of
those areas (`request-summary-host.test.mjs`, `runtime-load-recovery-host.test.mjs`,
`control-plane.test.mjs`), the synthetic Hermes HTTP conformance
(`hermes-api-runs.test.mjs`), or the check runner, sandbox and catalog tests
(`check-recipes.test.mjs`, `check-sandbox.test.mjs`, `check-runner-group-kill.test.mjs`,
`check-approval-revision.test.mjs`), all of which start a Host, a listener or
the check runner. `npm --prefix app test` runs them. `check-recipes-real.test.mjs` there
runs both recipes above against this repository under the production sandbox,
with their frozen limits, and fails when the sandbox is unavailable.

These fixed paths are expected in a Courtwork private candidate. A candidate
without them is stopped before spawn as `missing_target` (below). The Host does
not install candidate dependencies or substitute another command; preparing
dependencies is an explicit candidate setup step, and they must be real files
inside the candidate: the sandbox reads the candidate's real path only, so an
`app/node_modules` that is a symlink to a directory outside the candidate makes
every dependency-needing test fail to load. A passing result remains process
evidence, not formal Attention or Work acceptance.

**Fixed targets must exist.** Node's test runner reads each path argument as a
glob and silently skips one that matches nothing while the others run, which
would report a missing target as a pass. At the synchronous spawn fence, after
the approved-candidate recheck, the Host therefore requires every path argument
of a fixed recipe (every argv entry not starting with `-`) to be a regular file
inside the approved candidate. If one is missing, no process starts and the
check settles once as `failed` with `failure: {code: "missing_target"}` and
empty output. `node-test` has no path arguments. A missing *dependency* still
starts the process and settles as an ordinary nonzero `completed` result
(`ERR_MODULE_NOT_FOUND`). There is no install, fallback command or retry.

`listCheckRecipes()` returns the catalog; `getCheckRecipe(id)` looks up one
entry or returns `null`.

## What the model may pass

The `check_run` tool's only parameter is `{recipeId}`: a string of 1–200
characters. Its model-facing description is derived from `listCheckRecipes()`,
so it offers every catalog entry as `id: title` (for example
`node-test: Run the package tests`) without a second, hard-coded copy of the
catalog. The model never supplies a command, argument list, working directory,
environment or timeout; the Host resolves the id against the fixed catalog
above and runs exactly that. An id absent from the catalog is rejected as
`unknown_recipe` before anything is asked or spawned.

## Where it runs

A recipe runs only inside the Session's active private candidate worktree —
never the connected source repository (`repo_*` tools' root) and never the
managed Session workspace (`ws_*` tools' root). `check_run` is exposed only
while a repository candidate is active, the same exposure rule
`candidate_list`/`candidate_read`/`candidate_grep`/`repo_write`/`repo_diff`
already use (`CANDIDATE_TOOLS` in `app/runtime/control-plane.mjs`); with no
active candidate the tool is not offered at all.

## Approval

`check_run`'s Host ceiling (`hostToolCeiling` in `control-plane.mjs`) is
`deny` under `read_only` and `ask` in every other mode, including `draft` —
unlike `repo_write`, a check always asks, because it spawns a real process
rather than writing one candidate file. Denial happens before any process
starts, with zero spawns.

When the Host asks, the approval payload shows the recipe, command and arguments —
not just the recipe id. The approval card also lists the files the model wrote
into the candidate through `repo_write` (path and content hash) up to the write
revision the request is bound to, read from the Host's confirmed-write receipts;
what that code can reach is set by the [Environment policy](#environment-policy):

```json
{
  "tool": "check_run",
  "recipeId": "node-test",
  "recipeVersion": 1,
  "command": "/path/to/node",
  "argv": ["--test"],
  "cwd": "private candidate",
  "candidateId": "…",
  "candidateWriteRevision": 0,
  "timeoutMs": 120000,
  "outputLimitBytes": 65536,
  "env": "minimal"
}
```

`candidateWriteRevision` is the write revision the Session's active candidate
has when the Host opens this check's permission question. A confirmed
`repo_write` earlier in the same Run is included. Execution requires that exact
approved descriptor: candidate identity/binding remain pinned to the admitted
candidate, and its write revision must still match approval. The Store validates
that state atomically before appending `check.started`; the runner rechecks after
asynchronous preparation immediately before spawning. A later mismatch starts
no process and, if a start was already recorded, settles it as `failed` with
`candidate_changed`. Cancellation/closed admission during preparation prevents
spawn and settles an already recorded start as `cancelled`, with null exit
code/signal/failure and empty output. In-flight cancellation still waits for
the process group to exit. Once it has exited, the Host also records
`status:"cancelled"` with null `exitCode` and `signal`, while retaining the
observed partial stdout/stderr and duration. The runner's child close tuple is
not persisted for cancelled checks: runtimes can report a handled `SIGTERM` as
exit code 1 or report `SIGTERM` directly, and that OS-level race does not change
the Host outcome. Completed and timed-out checks retain their observed process
facts. This is a start-boundary guarantee, not a filesystem snapshot or
isolation guarantee for the duration of the process. This extends
the same permission-question payload shape `repo_write` already uses
(`app/server/store.mjs` validates a `check_run` question's payload with its
own field set, the way it already does for `repo_write`); a permission for any
other tool still accepts only the base six fields.

## Environment policy

A check runs code the model wrote into the candidate, so the recipe's process
and all its descendants run inside an OS sandbox with a fixed, Host-owned
policy. The model cannot change the policy, and no recipe widens it.

**Mechanism.** [`@anthropic-ai/sandbox-runtime`](../../engineering/ecosystem/sandbox-runtime-source-card.md)
`0.0.77` (Apache-2.0), exact-pinned in `app/package.json`: on macOS a
deny-default Seatbelt profile run through `/usr/bin/sandbox-exec`; on Linux
bubblewrap with new user, PID and network namespaces. `app/runtime/check-sandbox.mjs`
builds the policy and uses only the library's per-call wrapper. It never calls
`SandboxManager.initialize()`, which would start the library's network proxy
(and `socat` bridges on Linux) even when no domain is allowed; without it no
proxy port exists, so the policy grants no network at all.

**What the check can do:**

- **Read** everything outside the user's home directory and the Host data
  directory (which holds `credentials.json`, `runtime-state.json`, the Core
  `state.db`, ArtifactHistory, and every Session's workspace and candidate).
  Inside those two it reads only the candidate worktree it checks, its own
  temporary directory, and the Node installation it runs. All of these are
  resolved real paths; a path containing `*`, `?`, `[` or `]`, or a re-allowed
  path that would contain the home or data directory, is refused as
  `sandbox_unavailable`.
- **Write** only its own temporary directory. The candidate worktree,
  including its `.git`, is read-only to the check: a check reads the
  candidate, and candidate files change only through approved `repo_write`. The
  library's own default writable path `/tmp/claude` is denied again.
- **No network.** No TCP or UDP, loopback included, and no DNS. No recipe
  grants any.
- **Nothing outside the sandbox.** On macOS Apple Events and Launch Services
  open requests are denied (the library's `allowAppleEvents` stays off), so
  `osascript`, `open` and `launchctl submit` fail instead of starting code
  outside the sandbox.

**Environment.** The runner spawns `/bin/sh -c <wrapped command>` with
`shell:false` and a minimal environment:

- `PATH`: the Host process's own `PATH` (or `/usr/bin:/bin` if unset)
- `HOME` and `TMPDIR`: a fresh per-check temporary directory the runner creates
  before the process starts and removes once it settles
- `LANG`: `C`

The library adds `SANDBOX_RUNTIME=1` (and its own `TMPDIR`, which the wrapped
command overrides). No other variable is passed through: the child never sees
`NODE_OPTIONS`, `PYTHONPATH`, provider API keys or any other credential the
Host process holds. The wrapped command is a shell string because that is
what the library returns; every value interpolated into it is Host-produced
(the recipe's constant command and arguments, and Host paths), each quoted as
a single POSIX single-quoted word, so no model input is ever interpreted by a
shell.

**Fail closed.** Before the recipe runs, the Host requires the platform to be
supported, the sandbox binary to be present (`/usr/bin/sandbox-exec` on macOS;
`bwrap` on `PATH` on Linux), the library's dependency check to report no error,
and a preflight `exit 0` under the same policy to succeed; a Seatbelt profile
the kernel rejects or a bubblewrap that cannot create its namespaces is caught
there. If any of these fails, no recipe process starts and the check settles
once as `failed` with `failure: {code: "sandbox_unavailable"}` and empty
output, the same shape as `spawn_failed`. There is no unsandboxed fallback, no
setting or environment variable that disables the sandbox, and no
compatibility path. Cancellation and the Host's synchronous pre-spawn checks
(`run_closed`, `candidate_changed`, `missing_target`) take precedence over
`sandbox_unavailable`, since with any of them no process would start anyway.

**Process lifetime.** Whatever its exit path, a check settles only after its
process group is gone: if anything remains when the leader closes, the group is
sent `SIGKILL` and polled (bounded); if it cannot be confirmed gone, the result
carries `groupLingered: true` (see below). A descendant
that starts its own session leaves the group:

- On Linux, bubblewrap runs the check in its own PID namespace with
  `--die-with-parent`, so when the check ends every process inside it ends.
  *Not run: no Linux host was available when this was written.*
- On macOS the sandbox does not bound lifetime. A descendant in its own session
  can outlive the check. It stays inside the sandbox, with the same read,
  write, network and launch restrictions, but the Host does not find or stop
  it, and the Host does not claim that it did.

**System prerequisites.** macOS: `/usr/bin/sandbox-exec` (part of the OS).
Linux: `bubblewrap`, `socat` and `ripgrep` on `PATH` (the library's dependency
check requires all three even though checks use no proxy), and unprivileged
user namespaces that keep their capabilities; on Ubuntu 24.04 and later that
needs `sysctl kernel.apparmor_restrict_unprivileged_userns=0` or an AppArmor
profile for `bwrap`. Other platforms settle every check as
`sandbox_unavailable`.

**Verified.** macOS 27 (Apple silicon, Node 25.9) with synthetic stand-ins:
reads of the data directory, a file in the real home directory and another
Session's workspace are denied directly and through a spawned `cat`; writes
to the candidate, its `.git`, the data directory, the home directory and
`/private/tmp` are denied while the temporary directory is writable; TCP to a
public address and to a listening loopback port, UDP and DNS fail; `osascript`
to Finder, `launchctl submit` and `open -g` start nothing; `node --test` with a
child process and an `os.tmpdir()` write passes; through the runner, wall time
for a one-file `node --test` rose from about 253 ms to about 338 ms (median of
five, preflight included). The
regression tests are in `app/tests/check-sandbox.test.mjs`. Linux: the same
tests run in CI after the steps in `.github/workflows/runtime.yml`; *not run*
at the time of writing.

## Timeout and output limits

The recipe's `timeoutMs` and `outputLimitBytes` are fixed by the catalog
entry, not negotiable by the model. On timeout the runner kills the child's
whole process group (`SIGTERM`, then `SIGKILL` after 500 ms if still alive)
and reports
`timedOut:true`. Every check (normal exit, timeout or cancel) settles only after
its whole process group is gone: if a descendant outlives the leader — for
example one that ignores `SIGTERM` — the group is sent `SIGKILL` and polled for
up to 2 s; if it still cannot be confirmed gone, the runner result carries
`groupLingered: true` ([review D5](../../engineering/reviews/doc-driven-code-review-2026-09-29/README.md#findings)). The group's leader is a small guard (`runtime/check-guard.mjs`) that runs outside the sandbox and starts the sandboxed command; the recipe and everything it starts run inside the sandbox. When the recipe's own process exits, however it ends, the guard reports that exit status to the Host and kills the whole group. A normal exit therefore also ends anything the recipe left running in its group, and the result carries the recipe's own exit code or signal. While the recipe runs, the guard holds a pipe from the Host; if the Host dies without stopping the check, the pipe closes and the guard kills the group. No check outlives the Host that admitted it, and nothing in its group outlives the check ([convergence loop S11](../../engineering/execution/converge-loop-20260929/README.md)). Every exit path then confirms the group is gone. A descendant that left the group into its own session is outside the guard's reach; on Linux the sandbox's PID namespace still ends it, on macOS it stays sandboxed (see [Environment policy](#environment-policy)). Captured stdout/stderr are each capped at
`outputLimitBytes`; a stream that hits the cap is marked
`truncated.stdout`/`truncated.stderr` and the excess is discarded, not
buffered.

## Event types and durable settlement

Because a Run cancel closes admission before an ordinary late `tool.*` event
would otherwise arrive (RD-009), the Host records a check's outcome directly
through the store, independent of Pi's own tool-result path:

- `check.started` — `{callId, recipeId, recipeVersion, candidateId, candidateWriteRevision, startedAt}`.
  Recorded only while the Run is still open; refuses to start a new process
  for a Run that is already closing.
- `check.settled` — `{callId, status, exitCode, signal, durationMs, stdout, stderr, truncated, startedAt, endedAt, failure}`,
  where `status` is one of `completed` (the process exited by itself, at any
  exit code), `cancelled`, `timed_out`, `failed` (no process started:
  `failure.code` names why, for example `spawn_failed`, `sandbox_unavailable`,
  `missing_target` or `candidate_changed`), or `unknown` (below). Recorded unconditionally once a
  process has actually settled or the Host has confirmed its process group
  has exited — even after the Run's admission has already closed, so a
  cancelled check's partial output is never lost. For `cancelled`, Host
  `exitCode` and `signal` are both null to provide one stable outcome; the
  child runner's raw close tuple is deliberately excluded. `completed` and
  `timed_out` retain observed process exit facts.

**Unknown after restart.** If the Host stops between `check.started` and its
matching `check.settled` (same Run id + call id), the outcome is genuinely
unknown — the process may have finished, or may not have. On the next store
open, any such unmatched `check.started` gets a `check.settled` appended with
`status:"unknown"`, `exitCode:null`, empty `stdout`/`stderr` and
`failure:{code:"check_unknown_after_restart"}`. This reconciliation never
re-executes the recipe and never replays a stale result; it only fences the
Run's record so the same call id cannot be settled twice.

## Exit 0 is not Work acceptance

A `check_run` result — including a clean `exitCode:0` — is a Host-recorded
process outcome, not formal Work acceptance. It reports what the recipe's
process did; deciding whether that satisfies the Work still belongs to the
existing review path (diff, human read, explicit acceptance), not to this
tool.
