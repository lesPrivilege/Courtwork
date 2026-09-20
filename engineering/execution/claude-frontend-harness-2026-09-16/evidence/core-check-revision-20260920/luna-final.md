# Final independent review — first Core check revision slice

**Review target.** Detached worktree `/Users/lesprivilege/Projects/.worktrees/courtwork-harness-core-20260920`, base `83041d158cea01f2272f010c098d538617e0c3c6`, current changes uncommitted. This is a bounded non-author re-review of the F-01 cancellation correction. No product files were edited, no provider or credential was used, and no full suite was run.

## Decision

**Pass within this bounded slice; no remaining independent blocker found.** The prior pre-spawn cancellation race is closed:

- `app/runtime/check-runner.mjs:27-40` returns a no-child cancelled result for an already aborted signal, checks again after asynchronous temporary-HOME preparation, and checks again after `beforeSpawn` returns and immediately before `spawn`.
- `app/runtime/check-tools.mjs:62-77` performs the final signal/admission check together with the exact candidate/recipe approval check. `:81-85` records one null-exit, null-signal cancelled settlement for `run_closed` before spawn.
- `app/tests/check-approval-revision.test.mjs:81-124` covers pre-aborted input, abort inside the final fence with a marker/no-spawn assertion, missing-command no-spawn behavior, and admission closing during start persistence.

The earlier candidate/version correction remains sound: the current descriptor is resolved for same-Run writes, approved context is compared exactly, the Store checks the candidate atomically before `check.started`, and the synchronous runner fence protects the spawn boundary.

## Independent verification

From `app`:

```sh
node --test tests/check-approval-revision.test.mjs tests/check-recipes.test.mjs
```

Result: **27 tests passed, 0 failed, exit 0**, captured at `/tmp/cw-core-independent-final-tests-20260920.log`.

The run included the new approval drift, pre-spawn cancellation, and admission-close tests; existing runner clean/non-zero/limit/timeout/cancel/spawn-failure tests; read-only and unknown-recipe governance; real synthetic check execution; in-flight cancellation; restart-to-unknown fencing; and same-Run write → revision-1 check → reopen.

No full-suite, real-model, paid-provider, browser, or production-environment acceptance is implied. The documented start-boundary limitation remains: this slice does not provide a filesystem snapshot or OS isolation guarantee for the duration of a running process.

## Current inspected file hashes

```text
app/runtime/check-runner.mjs             55be8eedac63b63a257def6ef60dc281c1fb5803602674ef01fa2e1768213b48
app/runtime/check-tools.mjs              60dd673bc06fbfd8ec20b1f2df17b55758aecb47a9a0b9bd0aea7c6181c1e637
app/server/service.mjs                  e4b1cfee60608a9494e5f4e45c59800161493f9b37846ebd601f21cfcf18a16b
app/server/store.mjs                    76fc20732d962673d2d64dce097488a85cee8816aee6ebdfd25aac77ea0a3f72
app/tests/check-approval-revision.test.mjs 1766d804379e920ef460fc424bc9211354290b86cca73bbf33330ae81ffff24c
app/tests/check-recipes.test.mjs        dd252a305490ab6a5310cdd6154b2228a110eca14b73dda3dd9bdc96d6b5e9c5
app/docs/check-recipes.md               6b66b24480636f9ed0b1b0d7cd11bc731cb63ed80e77f081e058fdf5f5ab2e24
```

The worktree still contains concurrent documentation/evidence changes and the supplied `app/node_modules`; I did not stage, reset, or alter them. The reviewed product delta is ready for the parent’s integration decision within the stated scope.
