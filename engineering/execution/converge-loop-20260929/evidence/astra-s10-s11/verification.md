# S10–S11 independent verification

Reviewer: Astra, non-author of the product changes. S10 commit `c280f8205c71659b242aa7e324f0cf8b6bb9bb5b`; S11 was uncommitted at review. [Source hashes](sources.json) identify the reviewed code and tests. This review does not accept S1–S9 or integrate this branch.

From the delivery worktree:

```sh
node --test --test-concurrency=1 app/tests/manual-compaction.test.mjs app/tests/repository-restart-settlement.test.mjs app/tests/async-recovery-independent.test.mjs app/tests/check-runner-group-kill.test.mjs
```

Result: **19/19**, no failures or skips; [complete output](focused-tests.log). One suite ran, with file concurrency 1. The compaction recovery scenario restores a saved runtime-state file; it is not an independent SIGKILL-at-compaction test. The async recovery tests do exercise their named crash boundaries. The S11 test kills the Host while the recipe leader remains alive.

Counterexample, run separately after the suite:

```sh
node engineering/execution/converge-loop-20260929/evidence/astra-s10-s11/guard-exit-probe.mjs app
```

[Observed output](guard-exit-result.json): recipe leader and guard had both exited, the check remained unsettled, and the synthetic descendant remained in the guard's process group. Killing the synthetic Host left that descendant alive. The probe asserts this observed defect and explicitly kills and checks removal of its own remaining descendant. All test files and processes were synthetic; no personal data or user's running Host was accessed.

Additional direct `runCheckRecipe` probes, each executed sequentially with timeout 5000 ms and cwd `tmpdir()`: `/bin/sh -c 'exit 7'` returned exitCode 7/signal null; `/bin/sh -c 'kill -TERM $$'` returned exitCode null/SIGTERM; `/bin/sh -c 'kill -KILL $$'` returned exitCode null/SIGKILL; `/nonexistent/cw-synthetic-command` threw `spawn_failed`. These substantiate those four result paths only.

Not run: full suite, Linux, integration with the D4 sandbox branch, hostile attempts to terminate the guard, real provider/model, browser/visual baseline, native zoom/200%, screen reader, forced colors, coarse pointer/touch, dark theme, whole error matrices, other macOS versions, or reproduction of the earlier load-related failures. No push, PR, merge, deployment or product-code change was performed.
