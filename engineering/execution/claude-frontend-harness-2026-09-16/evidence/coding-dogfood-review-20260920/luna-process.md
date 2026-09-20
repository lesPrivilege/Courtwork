# Independent process/public-HTTP review — coding dogfood rehearsal

Date: 2026-09-20

## Scope and pin

Reviewed the fixed candidate worktree:

- Path: `/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-review-20260920`
- Candidate HEAD: `94d60d228c525ff1bc80de0d4e97deacd7afff8a`
- Declared author source commit: `3f04f76fa4ffaa742598b19703195575f537c708`
- `app/scripts/coding-dogfood-rehearsal.mjs` SHA-256: `1658d55d9fedbd524314a855d6d0fb68d0cc382b28788e24a93ff4f64f6ded60` (matches `evidence/coding-dogfood-readiness-20260920/source-sha256.json`)
- Worktree state: only the supplied untracked `app/node_modules` entry; no product edits made.

Responsibility was limited to the rehearsal's fresh-process lifecycle, public HTTP assertions, durability/evidence claims, and child teardown. Preparation-root/quoting and browser/UI claims were outside scope.

## Independent run

Ran the rehearsal once with a new scratch root outside all repositories and no provider credentials in the child environment:

```text
env -u OPENAI_API_KEY -u DEEPSEEK_API_KEY -u ANTHROPIC_API_KEY \
  node scripts/coding-dogfood-rehearsal.mjs \
  --root /tmp/cw-dogfood-review-20260920-MC820B
```

Captured console output at `/tmp/cw-dogfood-rehearsal-review-20260920.log`. The script produced a passing report at `/tmp/cw-dogfood-review-20260920-MC820B/rehearsal-report.json` with all 14 steps, including:

- separate Host processes over public HTTP;
- WebUI document/assets and 401 without the work token;
- repository bind, candidate creation, read, approved same-Run write/check;
- public diff/effects readers and unchanged source worktree;
- cancel-before-spawn;
- stop/restart and continuation from the same data directory;
- candidate revoke before approval and no clean stale check.

Both Host processes stopped with exit code 0 and no signal. The report records `realProvider: "not_run"` and `browserInteraction: "not_run"`.

## Findings

### F-01 — Evidence overstates restart event equality (adjust)

`app/scripts/coding-dogfood-rehearsal.mjs:126-130` defines `durableShape()` by filtering to `check.*`/`repository.*` and retaining only `seq`, `runId`, `type`, `callId`, and `status`. The restart assertion at `:320-341` compares that projection, while `/effects` is compared in full.

The readiness README says every `check.*` and `repository.*` event is “byte-identical” (`evidence/coding-dogfood-readiness-20260920/README.md:100-104`). The current run proves the selected durable projection and full write receipts are unchanged; it does not prove byte identity of every event or event payload. Adjust the wording to “selected durable event projection unchanged,” or strengthen the assertion to compare a canonical full event representation. Do not retain the current byte-identical claim as evidence.

### F-02 — Child environment comment is inaccurate (adjust)

`coding-dogfood-rehearsal.mjs:44-50` says the child “inherits no provider environment,” but `spawn()` omits `env`, so Node inherits the parent environment. `app/server/runtime.mjs:11-24` strips only `DEEPSEEK_API_KEY` and `OPENAI_API_KEY`; it does not strip `ANTHROPIC_API_KEY`.

The independent command explicitly unset all three variables, and this scenario used only the deterministic fake provider, so no provider call or credential exposure occurred in the run. The source comment and readiness claim should nevertheless be corrected, or `startHost` should pass an explicitly sanitized environment. This is an accuracy/boundary finding, not a failure of the fake-provider rehearsal.

### F-03 — Startup-timeout child cleanup is not closed (lifecycle follow-up)

Normal-path cleanup is present: the first process is stopped in the `stopOnFailure` catch (`:156-161`, `:321-325`), and the second process is stopped in `finally` (`:416-418`). The independent run exercised the normal path successfully.

However, `startHost()` (`:56-64`) throws after its 30-second URL deadline without stopping a still-live child. A child that starts but never prints its URL can therefore outlive a failed rehearsal. This was not failure-injected in the run. Either add a bounded cleanup in the startup error path or narrow the cleanup claim; the existing run does not establish “no orphan” for startup timeout failures.

## Decision and limits

The bounded offline public-HTTP rehearsal itself passed. I am not independently accepting the implementation or closing N-02. The packet should be held for parent disposition of F-01–F-03; real-model, browser, and human acceptance remain explicitly open.
