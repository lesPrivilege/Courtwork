# Host check recipes (DF-04)

DF-04 lets a Session run a Host-owned "check recipe" against the
Session's active private Git candidate (see
[`repository-binding.md`](repository-binding.md)). The contract is RD-009
["DF-04可施工合同"](../../engineering/research/RD-009-trusted-harness-extensions.md#df-04可施工合同).
This is a first Developer-consumer increment, not a general G1–G5
precondition, and not a sandbox.

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

`node-test-attention-contract` v1 is titled **Run Attention backend contract
tests**. It uses the same Host Node command, private candidate cwd, 120000 ms
timeout, 65536 byte per-stream limit and minimal environment as `node-test`.
Its exact argv is:

```text
--test
--test-concurrency=1
app/tests/attention-core.test.mjs
app/tests/attention-http.test.mjs
app/tests/attention-recovery.test.mjs
app/tests/attention-github-fixture.test.mjs
app/tests/attention-gmail-fixture.test.mjs
app/tests/attention-trace-fixture.test.mjs
```

These fixed paths are expected in a Courtwork private candidate. They cover
backend and synthetic fixture contracts; the recipe does not use a live
connector or provider. A candidate without those paths is stopped before
spawn as `missing_target` (below). The Host does not install candidate dependencies
or substitute another command; preparing dependencies is an explicit
candidate setup step. A passing result remains process evidence, not formal
Attention or Work acceptance.

`node-test-harness-contract` v1 is titled **Run Harness Core and Extensions
contract tests**. It uses the same Host Node command, private candidate cwd,
120000 ms timeout, 65536 byte per-stream limit and minimal environment. Its
exact argv is:

```text
--test
--test-concurrency=1
app/tests/hermes-api-runs.test.mjs
app/tests/request-summary.test.mjs
app/tests/runtime-load-recovery.test.mjs
app/tests/kit-context.test.mjs
app/tests/control-plane.test.mjs
app/tests/check-recipes.test.mjs
```

It is a selected regression set for Courtwork's own private candidate (the
RL-1 self-check), not all of Harness, Extensions or product acceptance. The
Hermes file is synthetic HTTP conformance, not a native Hermes server. Its
dependencies come from the candidate's own `app/node_modules`, prepared
explicitly before the check; the Host never installs them.

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
not just the recipe id. It does not list the candidate files the recipe will
execute; see the isolation limit under [Environment policy](#environment-policy):

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

The child process runs as a normal OS process with the Host user's own
rights — this is **not** a sandbox. It is spawned with `shell:false` and a
minimal, explicit environment:

- `PATH`: the Host process's own `PATH` (or `/usr/bin:/bin` if unset)
- `HOME`: a fresh temporary directory the runner creates before the process
  starts and removes once it settles
- `LANG`: `C`

No other variable is passed through. In particular the child never sees
`NODE_OPTIONS`, `PYTHONPATH`, provider API keys or any other credential the
Host process holds. Supporting an untrusted program will need a real
isolation contract before extending this slice; today's exposure is bounded
by using a no-personal-data, no-shared-write-directory synthetic fixture, not
by an OS sandbox around the child.

The environment is minimal, but the files are not isolated. The private candidate
lives inside the Host data directory, beside `credentials.json` and the Core store,
and test files the model wrote into the candidate (in `draft` mode, without a
separate approval) run with the Host user's rights. Such a file can read anything
the Host user can read and return it through check output. The architecture rule
for code execution opened to a model — show that it cannot reach formal write
capability or credentials — is therefore not met today ([review D4](../../engineering/reviews/doc-driven-code-review-2026-09-29/README.md#findings)).

## Timeout and output limits

The recipe's `timeoutMs` and `outputLimitBytes` are fixed by the catalog
entry, not negotiable by the model. On timeout the runner kills the child's
whole process group (`SIGTERM`, then `SIGKILL` after 500 ms if still alive)
and reports
`timedOut:true`. The pending `SIGKILL` is cleared once the leader's output
closes, so a descendant that ignores `SIGTERM` and has detached its output can
outlive the settled check ([review D5](../../engineering/reviews/doc-driven-code-review-2026-09-29/README.md#findings)). Captured stdout/stderr are each capped at
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
  exit code), `cancelled`, `timed_out`, `failed` (the process itself could
  not be spawned), or `unknown` (below). Recorded unconditionally once a
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
