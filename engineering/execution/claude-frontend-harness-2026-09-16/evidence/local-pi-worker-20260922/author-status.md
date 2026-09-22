# Local Pi process worker — author record

2026-09-22. Astra author; parent Arch retains architecture acceptance and main integration. Base `df74df3a5449d3d6771319e7e97a7cdc2009cb73`, isolated branch `codex/local-pi-worker-20260922`. Existing checkout reused; no additional worktree. This record implements the [serial order](../../local-pi-worker-loop-20260922.md).

## L0 source and responsibility check

Selected executable: the unchanged locked npm package `@earendil-works/pi-coding-agent@0.85.1`, `dist/bundle/cli.js`, invoked with the absolute Node executable. No global Pi substitution. `npm ci --ignore-scripts --no-audit --no-fund` exited 0 (278 packages); package/lock unchanged. Package MIT license; upstream source pin `d981de1229ef899957bbe968bc8dcda02a21f477` from the registered first-party index. npm artifact integrity is `sha512-FGRN+OHbWaefBPGaTggAdLjrIHW+s2PzLyglz/5dfLzb9of7uuXMXYC0fJIeZTw+shS32o2cuQ9jF7YSDuL/oQ==`; installed CLI SHA256 `e6d7fcf36a239cf3746e67ddf4222081ac01a601b85a3ee688bdfe9c161d754c`. Selected protocol is that package's one-shot JSONL print mode, not an independently versioned standard.

Actual no-inference probe: empty temporary HOME/agent directory/cwd, explicit environment, `--mode rpc --no-session --no-tools --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files`, explicit system and append prompts. `get_state` id `l0-state` returned success, native session `01a0c77e-4f0e-75d1-b2ef-9b7848441c87`, zero messages, no model/authentication, idle. Closing stdin exited 0, signal null; temporary data removed. This proves executable/protocol availability only. L2 must test hostile discovery/tool requests and actual deterministic inference.

Read package `dist/main.js`, `cli/args.js`, `core/resource-loader.js`, `core/sdk.js`, `core/agent-session.js`, `modes/rpc/rpc-mode.js`, and `docs/models.md`. Source observations: no-context-files bypasses global/ancestor instructions; no-tools maps to `noTools:"all"` and an empty allowed tool set; explicit append prompt suppresses append-file discovery. RPC prompt response is preflight acceptance; agent_end is separate. get_state exposes native session identity; abort awaits idle; EOF disposes the runtime; SIGTERM has its own shutdown handler. No assumption of OS isolation, native resumability or reliable descendant cleanup follows.

| Reference / decision | Existing owner and application |
|---|---|
| Adopt Pi RPC request/event separation | New `app/runtime/local-pi-transport.mjs` owns bounded process IO and observed exit; no durable state. Print has no command/reply correlation. |
| Adjust upstream subprocess example | Structured argv, shell:false, explicit environment, separately bounded stderr, cancellation/escalation only for owned process group. No concurrency scheduler or copied implementation. |
| Adopt Pi no-tools allow-set | New `local-pi-process.mjs` admits tool-less consultation only, with exact source bytes supplied by Host. No extension/callback or coding mode. |
| Adopt check-runner process ownership | Reuse the ownership principle; cancellation request, native terminal and actual process close remain separate evidence. |
| Adopt existing Pi port / Spark lifecycle | Existing Subagents and RuntimeService remain attempt/admission/source/result owners. Process adapter reports observations, never formal acceptance. |
| Adopt ArtifactHistory placement | Exact result bytes retained by existing content-addressed owner before publication. No parallel artifact ledger. |
| Reject conformance executeChild as production scheduler | Its abort race does not establish process termination. |
| Defer broader runtime/ACP/fleet/coding | No consumer requires them in this slice. Parent preflight and one-shot selection at main `f88f61b` consumed; managed RPC is deferred. |

## Change boundary and verification contract

L1/L2 lease: newly named local-pi runtime modules and dedicated local-pi tests/fixtures/scripts only. No Host, store, UI, settings, schema or capability registration yet. Transport API: `runLocalPiProcess({executable,args,cwd,env,input,signal,limits,onEvent,onSpawn})` resolves only after process close with bounded diagnostics, exit/signal, protocol fault, cancellation/timeout and escalation observations. `onEvent` and `onSpawn` may be asynchronous; stdout is paused while observations are delivered. It does not decide business completion. Bounded invocation wraps it with exact version checks, private process configuration, identity capture, one prompt, bounded result, abort/termination and cleanup. No arbitrary command comes from model input.

User outcome: bounded source-packet consultation returns attributable bytes or a truthful refusal/cancel/unknown. Invariants: no result on acknowledgment alone; no success after contradictory terminal/protocol failure; no settled cancellation before owned process closes; no ambient model-reachable tools/config; no retry after ambiguous dispatch. Process fixtures test byte framing, UTF-8, correlation, limits and ready-handler escalation. Real upstream subprocess + loopback provider tests discovery, native identity, tool denial and lifecycle. Helper tests alone cannot prove these cross-process properties. Inputs are synthetic; no provider cost. Rerun only changed seams or new counterexamples.

Parent main `f88f61b92baa25bf2a66f1e4361bc32e9bfc422f` was fast-forward merged without rewriting history; C/D/E acceptance and writer release at `ca859a5` consumed. L3 still follows L1/L2. No schema version reserved. User 8787/data, M1 and all native credentials/configuration are untouched. No running task-owned services at this checkpoint.


### L0 completion

Actual upstream print probe (exit 0): native session `01a0c780-5adf-72f6-8122-c892b2b4e306`, one synthetic HTTP Completions request to loopback with zero advertised tools, exact UTF-8 result `bounded 中文 reply`. Observed sequence: session header → agent_start → turn_start → assistant message_end(stop) → turn_end → agent_end(willRetry:false) → agent_settled → normal exit 0. Source `dist/modes/print-mode.js` subscribes through session.prompt completion, disposes and flushes; JSON-mode exit zero alone does not certify assistant success. L1 requires matching complete message/terminal evidence and process close, rejecting errors, tool calls, duplicates and late contradictions. This small manual probe is author feasibility evidence; committed reproducible L2 tests will replace manual coverage, not claim model quality.

Luna bounded non-author exploration (base df74df3, no edits) confirms the smallest Host path is a real CW child Session/Run with an explicitly selected process branch. Store already binds Run to attempt atomically; settlement retains ArtifactHistory bytes first. Missing fields belong on that existing attempt: frozen adapter/executable/protocol and source-packet hash/bytes, dispatch phase, native session/pid observation, process terminal/cancellation facts. No new store or ledger. Packet inclusion needs a distinct receipt; existing sourceReads must remain actual source callbacks. Exact L3 layout goes to parent before shared edits. Luna exploration is not acceptance.

L0 selected checks: dependency installation 0; actual empty-config RPC availability 0; actual one-shot loopback/print probe 0; parent source/selection and CDE release consumed. No product code changed. Original RPC-only interface draft superseded by the parent one-shot choice before implementation.

## L1 author delivery

Astra authored `local-pi-process.mjs` and six input/terminal tests. Sol authored `local-pi-transport.mjs`, its process fixture and twenty process tests under a disjoint lease. Astra reviewed the transport and requested two lifecycle regressions before delivery: cancellation after spawn() returns but before its spawn event, and a stalled spawn callback with a full stdout pipe. Both are now covered. No earlier failure is claimed from those review hypotheses.

`node --test app/tests/local-pi-transport.test.mjs app/tests/local-pi-process.test.mjs`: **26/26, exit 0**, [raw log](l1-tests.log). `git diff --check`: exit 0. Tests use real Node child processes for transport, including a readiness-confirmed TERM-resistant parent/descendant before SIGKILL escalation. The Pi wrapper uses the locked CLI and hashes all 51 shipped bundle JS files, aggregate `d7a98e9de03d1b33c863d36d146779c617b49645579827440fea08d32b2d9f5c`; checking only the tiny CLI would miss its imported chunks.

Public consumer remains absent. Binding is explicit synthetic loopback only; default model/provider are the existing fake-provider identities. Completion requires agreeing assistant/turn/agent terminal messages, agent_settled and clean process exit. Tool requests, malformed/oversized output, duplicate/late terminal and conflicting native identity cannot yield a result. Process transport and native failure/cancellation facts remain separate. No managed RPC, native resume, credential or coding capability.

Parent disposition at main `578d77d` was merged without rewriting L0 history. It reserves schema20 for L3, requires typed Run events and recovery fences, and retains Spark's existing source-read criterion. L1 changes no schema/Host/UI and does not consume that lease yet. Preliminary upstream feasibility tests run during wrapper development are recorded under L2 below; they are not independent acceptance.

## L2 actual upstream process delivery

Source adapter `92df65b`; test packet in this milestone. `node --test app/tests/local-pi-upstream.test.mjs`: **7/7 exit 0**, [raw log](l2-tests.log). Every inference request uses a throwaway loopback server and deterministic SSE; no real-model quality/capability or external account claim. Seven tests launch unchanged locked Pi with the production launch flags/environment. Processes close before owned temporary homes/providers are removed.

| Fault / control | Actual evidence |
|---|---|
| Exact source and reply | UTF-8 packet on provider wire, zero tools, native identity, matching result hash/bytes and settled + exit0. |
| Ambient loading | Global/ancestor/project AGENTS, SYSTEM/APPEND_SYSTEM, executable extension markers, skills/templates and project settings planted inside synthetic fixture roots. None enters the provider request; no marker executes; no native session directory is written. |
| Hostile model tool call | Raw upstream process receives synthetic bash tool call despite zero declared tools, returns native tool-not-found error, creates no marker, then answers a second deterministic turn. Wrapper independently rejects any tool request rather than accepting that sequence as supported work. |
| Provider error | HTTP400 cannot produce a successful result even when JSON print may exit0. |
| Cancel / late reply | Cancel only after an actual provider request; process close observed, PID gone, late reply cannot publish. |
| Crash / size | SIGKILL after actual request without terminal stays unknown. 32769-byte output cannot be truncated into a success. |
| Hard termination | Actual Pi reaches provider request, then test SIGSTOP freezes its already-ready handler. Cancellation escalates to SIGKILL after grace, observes process close/PID gone. This is deliberately injected unresponsiveness, not a claim that ordinary Pi ignores TERM. L1 separately proves owned descendant-group escalation with readiness. |

Initial development run was 5/6 exit1: the test decoded the provider's content array as a JSON string (`SyntaxError: "[object Object]" is not valid JSON`, local-pi-upstream.test.mjs:28). Product result had completed; corrected assertion reads text parts without weakening the exact packet check. Subsequent six-test run passed; the readiness-confirmed actual-Pi escalation case was then added, yielding the final7/7. This test-harness failure is retained here rather than as a product lifecycle defect. Malformed/UTF8/duplicate/conflicting/partial JSONL are process-fixture evidence in L1; unchanged upstream cannot be asked to emit an arbitrary malformed protocol frame without a different executable or trusted extension.

Luna is performing a bounded non-author review of L1/L2; no independent acceptance is claimed yet. L3 now proceeds under the recorded parent schema20/coverage/unknown-fence disposition, with exact records and transitions written before shared code edits.
