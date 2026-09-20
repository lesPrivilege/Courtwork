# Independent process review — coding dogfood round 2

## Scope

This is a bounded, non-author review of candidate `231532a7886963eddca587a61cc8ab7bee813d14` (parent `c6a2b91362df8800453a7b88fa0e57a643f29791`) in `/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-20260920`. The reviewed rehearsal source is `app/scripts/coding-dogfood-rehearsal.mjs`, SHA-256 `fad41bec51429ef3d100ea7e6e0e6809eefffe9d3cb2ae4075493ef635ab0549`. The worktree was clean at review. I reviewed the prior DF11-R4/R5 record, the round-2 source and readiness packet, then ran one fresh rehearsal. No product files, reserved `*-instance` directories, credentials, or real providers were touched.

## Independent reproduction

```text
env -u OPENAI_API_KEY -u DEEPSEEK_API_KEY -u ANTHROPIC_API_KEY \
  node scripts/coding-dogfood-rehearsal.mjs \
  --root /tmp/cw-dogfood-round2-process-root-eV5j9z
```

The command exited `0`. It produced 15/15 `ok` steps and `result: "passed"` in `/tmp/cw-dogfood-round2-process-root-eV5j9z/rehearsal-report.json`; console output is `/tmp/cw-dogfood-round2-process-rehearsal.log`. The independent scratch source copy recorded HEAD `e890d41cef05f5c2c1d8407f1450ff903113f68e`. A post-run `pgrep -af 'server/index.mjs --data-dir'` returned no matching Host process.

## Findings

### F-01 — readiness/termination correction is reproduced; bootstrap stall remains unbounded (medium, follow-up blocker)

The corrected `startHost` owns a child through early exit and readiness deadline and calls `terminate` from its catch (`coding-dogfood-rehearsal.mjs:87-143`). `terminate` waits for SIGTERM, then escalates to SIGKILL and waits for the exit event (`:49-59`). My fresh run exercised the real `LOCK_BUSY` contention path and an announced child that ignores SIGTERM: the report records `leakedProcesses: 0`, escalation to `SIGKILL`, and the child gone. Both ordinary Host shutdowns exited code 0 with no signal or escalation. This closes the concrete DF11-R4 paths that were previously open.

One lifecycle claim is still stronger than the implementation. After the URL is observed, bootstrap is awaited as an unbounded `fetch(...).json()` (`:110-116`). If a child accepts the bootstrap connection but never completes its response, `startHost` cannot reach its catch and therefore cannot run `terminate`; the comment at `:80-85` and readiness README R4 wording say this path is cleaned up. The rehearsal covers an early `LOCK_BUSY` exit and the SIGKILL helper, but does not inject a bootstrap response stall. Add a bounded bootstrap timeout/abort that still runs the existing cleanup, or narrow the claim. This is a process robustness follow-up; it does not invalidate the fresh fake-provider run.

### F-02 — explicit environment allowlist passes credential isolation, but HOME/TMPDIR are caller paths (low, wording/boundary adjustment)

`childEnvironment()` passes only `PATH`, `HOME`, `TMPDIR`, and fixed `LANG` (`:61-77`), and `spawn` uses that object (`:87-90`). The independent command also unset the common provider variables before launch. The current server source only strips `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` as a secondary defense (`app/server/runtime.mjs:11-20`); the rehearsal child receives neither, and `WORK_AGENT_PYTHON`/other parent variables are absent. The fake provider run made no paid-provider call.

`HOME` and `TMPDIR`, however, are copied from the invoking process when set (`:74-75`). The current server sources do not use them for provider authentication, so this run found no credential leak, but the packet sentence that “nothing the invoking shell happens to hold can reach it” is broader than the allowlist actually guarantees. Keep the explicit allowlist and either use scratch values for HOME/TMPDIR or describe the boundary precisely as “no variables beyond PATH/HOME/TMPDIR/LANG; no provider credentials.” Do not claim that native configuration discovery is impossible without an explicit HOME/config policy.

### F-03 — complete-event and receipt restart assertions pass (closed for this slice)

The old five-field projection is gone. `durableEvents` now retains every `check.*` and `repository.*` event object in order (`:176-185`), and restart uses deep parsed-object equality with a non-empty assertion (`:425-430`). Full effect receipts are compared as well. My report records `durableEventsCompared: 12`, `durableEventsUnchanged: true`, and `effectsUnchanged: true`. The readiness packet now accurately says parsed-object equality over full payloads, not raw storage-byte identity. The report label at `:436` contains a harmless typo (`check.*/repository.*`); it does not affect the assertion.

## Decision within this review boundary

The round-2 fixes for DF11-R4’s tested startup ownership, non-cooperative termination, explicit child environment, and DF11-R5’s complete parsed-event comparison are independently reproduced. Keep the fake-provider/browser-not-run limits visible. Hold the process-robustness claim to the bounded bootstrap-stall follow-up in F-01; treat F-02 as a boundary wording/configuration adjustment unless the owner requires HOME/TMPDIR isolation before the WebUI handoff.
