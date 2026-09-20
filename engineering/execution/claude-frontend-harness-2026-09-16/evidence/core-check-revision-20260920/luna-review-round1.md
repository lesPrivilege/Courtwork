# Independent review — first Core check revision slice

**Review target.** Detached worktree `/Users/lesprivilege/Projects/.worktrees/courtwork-harness-core-20260920`, base `83041d158cea01f2272f010c098d538617e0c3c6`, current changes uncommitted. This review is independent of the implementation author. No product files were edited, no provider or credential was used, and no full suite was run.

## Decision

**Hold acceptance on one cancellation boundary blocker.** The candidate/version approval correction is otherwise supported by source and focused synthetic execution. The remaining blocker is a pre-spawn cancellation race: after `check.started` is persisted, cancellation can close Run admission while the runner is preparing its temporary HOME, and the current final fence checks candidate approval but not the Run signal/admission. The runner then spawns the child and kills it immediately.

### F-01 — cancellation can spawn after Run admission closes (blocker)

The stated contract requires no new check process once the Run is closing (`app/docs/check-recipes.md:123-136`; `engineering/research/RD-009-trusted-harness-extensions.md:16-17`). The affected path is:

- `app/runtime/check-tools.mjs:62-75` checks `signal`/`isOpen()` only before `recordStarted`. Its `beforeSpawn` callback at `:74` calls `approvedCandidate(...)`, but never checks `signal.aborted` or `isOpen()`.
- `app/runtime/check-runner.mjs:24-36` awaits `mkdtemp` at `:27`, calls `beforeSpawn` at `:32`, and immediately calls `spawn` at `:35`.
- The runner installs its abort listener only after `spawn` (`app/runtime/check-runner.mjs:90-94`). Therefore an abort during the HOME-preparation await, or inside the final callback, cannot prevent that spawn; it only terminates the newly created process.
- The service supplies the closing-state predicate at `app/server/service.mjs:2738-2755` and the tool signal comes through `governTools` at `app/server/service.mjs:2813-2835`, so the required state is available at the seam.

Independent synthetic reproduction, run from `app` without a provider:

```sh
node --input-type=module -e '
import { runCheckRecipe } from "./runtime/check-runner.mjs";
const controller = new AbortController();
const recipe = { command: process.execPath, argv: ["-e", "setTimeout(() => {}, 1000)"], timeoutMs: 5000, outputLimitBytes: 1024 };
const result = await runCheckRecipe({ recipe, cwd: process.cwd(), signal: controller.signal, beforeSpawn: () => controller.abort() });
console.log(JSON.stringify({ cancelled: result.cancelled, timedOut: result.timedOut, exitCode: result.exitCode, signal: result.signal }));
'
```

Observed output:

```json
{"cancelled":true,"timedOut":false,"exitCode":null,"signal":"SIGTERM"}
```

The callback aborts before the runner's `spawn` line, yet the result carries the child termination signal. That is a deterministic source-level reproduction of “spawn then cancel,” not a claim that the ordinary cancellation test is invalid.

**Minimal correction/evidence.** Make the synchronous final fence reject when `signal?.aborted || !isOpen()` before the candidate approval check, or put the same signal check inside `runCheckRecipe` immediately before `spawn`. Add a synthetic test that flips the signal/admission at the pre-spawn barrier and asserts no child side effect and no post-close process. Preserve the existing rule that a `check.started` already recorded must still receive one settlement; the exact failed/cancelled classification for a start recorded but no child spawned should be recorded by the owner contract.

## Accepted within this review scope

The candidate identity/version correction has no independent blocker found:

- `app/runtime/check-tools.mjs:20-42,50-75` resolves the current candidate, freezes the exact permission descriptor, accepts a same-Run confirmed write, and rechecks before spawn.
- `app/server/store.mjs:1348-1375` performs the candidate/binding/write-revision check atomically before appending `check.started`.
- `app/tests/check-approval-revision.test.mjs` covers write/candidate/binding/path/recipe drift, store-start drift, and a synchronous runner fence. The revised `app/tests/check-recipes.test.mjs:400-446` covers same-Run write → approval at revision 1 → real synthetic `node --test` → reopen.
- The focused command below passed the new approval tests plus existing runner, cancellation, and restart coverage. It does **not** cover F-01's pre-spawn cancellation window.

The documented start-boundary limitation (“not a filesystem snapshot or isolation guarantee for the duration of the process”) is consistent with the requested slice and is not a finding here.

## Independent command/result

From `app`:

```sh
node --test tests/check-approval-revision.test.mjs tests/check-recipes.test.mjs
```

Result: **24 tests passed, 0 failed, exit 0**, captured at `/tmp/cw-core-independent-tests-20260920.log`.

The source hash manifest at `engineering/execution/claude-frontend-harness-2026-09-16/evidence/core-check-revision-20260920/source-sha256.json` matches the inspected bytes. Relevant SHA-256 values:

```text
app/runtime/check-tools.mjs             f8d104ab885f07b9463c61b90ed66ed5a99240dc5c4c2b51a24442c567c362e1
app/runtime/check-runner.mjs            851ac56ecfbc5fc508c55ebe626b669cc4515255546912a5c3f9010b3c8b1e94
app/server/service.mjs                  e4b1cfee60608a9494e5f4e45c59800161493f9b37846ebd601f21cfcf18a16b
app/server/store.mjs                    76fc20732d962673d2d64dce097488a85cee8816aee6ebdfd25aac77ea0a3f72
app/tests/check-approval-revision.test.mjs d26e80b22ac88a2f6a8c944680ceb92ab777e4283cee0c8cc7754d1aede24a8c
app/tests/check-recipes.test.mjs        dd252a305490ab6a5310cdd6154b2228a110eca14b73dda3dd9bdc96d6b5e9c5
app/docs/check-recipes.md               718bfdc29795c9acbc5a9e5ad08bb620869190de9988c40e1a67b5ebad35ecb4
```

Existing concurrent changes remain in the worktree; this review did not stage, reset, or alter them.
