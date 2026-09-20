# Final independent process review — coding dogfood integration candidate

## Scope and bytes

Reviewed the exact integration tree `/Users/lesprivilege/Projects/.worktrees/courtwork-dogfood-integration-20260920` at HEAD `3618947a6441c644bfaded75d41e96a6b4251b38` (parent `46409b2e20d42fc7b37cda5276b9a65ec6d2ca3c`). The tree was clean apart from the supplied untracked `app/node_modules` symlink. Relevant hashes:

- `app/scripts/coding-dogfood-rehearsal.mjs`: `ae8a3a9e29b15d94cc26497932a47c8bfa2b23ec02ecfcfc38170f458cfe5854`
- `app/tests/coding-dogfood-lifecycle.test.mjs`: `99a85e858110b71c52c545f9065f04cddc845ea92d86be75c8865fd37416eff6`

This review was read-only. No reserved instance, provider, credential, or personal configuration was accessed.

## Targeted lifecycle tests

Command from `app/`:

```text
env -u OPENAI_API_KEY -u DEEPSEEK_API_KEY -u ANTHROPIC_API_KEY \
  node --test tests/coding-dogfood-lifecycle.test.mjs
```

Result: **2/2 passed**, exit `0`, duration ~26.9 s. The two tests mock a real Host's bootstrap response at both stalled headers and stalled body stages, assert the startup signal aborts, and successfully reopen the same data directory afterward. This closes the prior bounded-bootstrap cleanup gap with direct lock-release evidence. Full output: `/tmp/cw-dogfood-final-process-tests.log`.

## Fresh 15-step rehearsal

Command:

```text
env -u OPENAI_API_KEY -u DEEPSEEK_API_KEY -u ANTHROPIC_API_KEY \
  node scripts/coding-dogfood-rehearsal.mjs \
  --root /tmp/cw-dogfood-final-process-root-UoomRA
```

Result: exit `0`, **15/15** steps passed. The structured report is `/tmp/cw-dogfood-final-process-root-UoomRA/rehearsal-report.json`; console log is `/tmp/cw-dogfood-final-process-rehearsal.log`.

Observed evidence:

- `realProvider: "not_run"`, `browserInteraction: "not_run"`.
- Contending startup failed with `LOCK_BUSY`, `leakedProcesses: 0`.
- The SIGTERM-ignoring child escalated to `SIGKILL` and was gone.
- Both ordinary Host stops exited code `0`, with no signal and no escalation.
- Restart compared 12 complete `check.*`/`repository.*` events as parsed objects, with unchanged effects/receipts.
- A post-run `pgrep -af 'server/index.mjs --data-dir'` found no remaining Host process.

## Delta findings

1. **Bootstrap deadline: closed.** `startHost` now derives the remaining startup deadline and applies `AbortSignal.timeout(...)` to the bootstrap fetch (`app/scripts/coding-dogfood-rehearsal.mjs:96-115`). The two independent stalled-header/body tests prove the catch path terminates the child and releases the real data-directory lock; successful reopen and clean stop both pass.
2. **Environment boundary: corrected wording.** The allowlist remains `PATH`, `HOME`, `TMPDIR`, and fixed `LANG`, while the comment and readiness packet now explicitly state that caller paths remain and this is not filesystem isolation (`:61-78`; readiness README lines 73-75). Provider credential/configuration environment variables are not forwarded. The rehearsal used the fake provider with common provider variables unset.
3. **Complete-event assertion: closed.** The full event objects, including payloads, are retained by `durableEvents` and compared with parsed-object equality after restart; the fresh report records 12 events and unchanged receipts. The packet correctly avoids claiming raw storage-byte identity.

## Scope decision

The bootstrap fix, environment-boundary correction, non-cooperative termination path, startup ownership check, and complete-event restart assertion all pass this independent bounded review. The synthetic evidence does not claim real-provider or browser acceptance, and no full suite was rerun.
