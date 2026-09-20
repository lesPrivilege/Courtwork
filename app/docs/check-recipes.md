# Host check recipes (DF-04)

DF-04 lets a Session run one Host-owned "check recipe" — today, the
independent synthetic coding repository's own test command — against the
Session's active private Git candidate (see
[`repository-binding.md`](repository-binding.md)). The contract is RD-009
["DF-04可施工合同"](../../engineering/research/RD-009-trusted-harness-extensions.md#df-04可施工合同).
This is a first Developer-consumer increment, not a general G1–G5
precondition, and not a sandbox.

## Catalog

`app/runtime/check-recipes.mjs` exports a frozen, code-defined catalog. It is
not user-editable in this slice — there is no API to add, remove or change a
recipe. The one recipe today:

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

`listCheckRecipes()` returns the catalog; `getCheckRecipe(id)` looks up one
entry or returns `null`.

## What the model may pass

The `check_run` tool's only parameter is `{recipeId}`. The model never
supplies a command, argument list, working directory, environment or timeout;
the Host resolves the id against the fixed catalog above and runs exactly
that. An id absent from the catalog is rejected as `unknown_recipe` before
anything is asked or spawned.

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

When the Host asks, the approval payload shows exactly what will run — not
just the recipe id:

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
the process group to exit. This is a start-boundary guarantee, not a filesystem
snapshot or isolation guarantee for the duration of the process. This extends
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

## Timeout and output limits

The recipe's `timeoutMs` and `outputLimitBytes` are fixed by the catalog
entry, not negotiable by the model. On timeout the runner kills the child's
whole process group (`SIGTERM`, then `SIGKILL` after 500 ms if still alive)
so a check cannot leave orphaned descendants behind, and reports
`timedOut:true`. Captured stdout/stderr are each capped at
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
  cancelled check's partial output and exit/signal are never lost.

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
