# Independent verification of review findings (HEAD ffe68fb, app code unchanged)

Probes: this directory (`race-nodelay.mjs`, `f2-mapping.mjs`, `core-ext.mjs`, `core-http-timeout.mjs`, `timing.mjs`) plus reviewers' probes re-run after reading them (`tmp-host/probe-cancel-*.mjs`, `tmp-harness/p2,p4,p5,p9`, `tmp-control/probeD.mjs`). All run with TMPDIR under this dir, `node` from `app/`.
"Prod path" = reachable via `npm start` -> server/index.mjs (all code paths below are production code; the only injections are observation/widening hooks noted per item).

## Summary table

| # | Finding | Verdict | Severity (my call) | Prod path |
|---|---------|---------|--------------------|-----------|
| 1 host F1 | completed -> stopping -> cancelled | CONFIRMED (also with no artificial delay) | major (invariant), low likelihood | yes |
| 2 host F2 | managed `cancelled` though native root `completed` | PARTIAL: mechanism confirmed; reviewer's literal scenario NOT reproduced | minor-major (same root as F1) | managed port: seam only; Pi: yes |
| 3 host F3 | Pi exception during pending cancel -> `cancelled`, error null | CONFIRMED (code path); trigger rare; RD-001:65 cite is experiment-scoped | minor | yes (rare trigger) |
| 4 harness F1 | check_run = arbitrary code as Host user, next to credentials | CONFIRMED | major | yes (draft default) |
| 5 harness F2 | SIGTERM-ignoring descendants survive cancel/timeout | CONFIRMED (runner + full Host) | minor-major | yes |
| 6 harness F4 | ws_grep leaks what ws_read deny blocks | CONFIRMED (contract-silent for ws_*) | minor | yes |
| 7 core F1 | extensions get raw CoreClient incl. decide/call | CONFIRMED (fact); in-process trust model | minor | yes (built-in + local host-trusted) |
| 8 core F2 | Core accepts candidate with blocking open obligations | CONFIRMED as behavior, REFUTED as defect (deliberate, contract allows adapter gate) | minor / doc ambiguity | only via F7 or an extension without a domain gate |
| 9 core F3 | Core `outcome:"unknown"` dropped at HTTP | CONFIRMED | minor | yes |
| 10 control F1 | evaluate endpoint hard-codes ceiling for ws_write only | CONFIRMED | minor (advisory) | yes (Settings UI) |
| 11 baseline | chat-entry test failure | STALE ASSERTION, no product regression | trivial | n/a |

## Details

### 1. host-runtime F1 - terminal Run status not immutable  (CONFIRMED, major)
- Root cause: `server/service.mjs:3543-3585` (`cancelRun`) checks `terminal(run.status)` on the *published* state (3547), then queues `updateRunWithEvent(stopping)` (3550) unconditionally; `server/store.mjs:1696-1711` (`updateRun*`) does `Object.assign(run, patch)` with no transition guard; `_mutate` (store.mjs:969-981) publishes `this.state` only after `_persist` finishes, so a completion write in flight is invisible to cancel. After the stale `stopping` lands, `cancelRun` (3577-3583) sees non-terminal and writes `cancelled`.
- Repro (reviewer's, delay-widened): `node review/tmp-host/probe-cancel-toctou.mjs` -> `status events ["running","completed","stopping","cancelled"]`, final `cancelled`.
- Repro (mine, NO artificial delay): `race-nodelay.mjs` wraps `store.updateRunWithEvent` only to *observe* the Host's own `completed` write and calls `service.cancelRun` in the same tick (what an HTTP cancel arriving inside the ~persist window does; real tmp-write+rename duration only) -> `{"cancelReturned":"cancelled","final":"cancelled","statuses":["running","completed","stopping","cancelled"]}`. A blind sweep of cancel offsets (80 runs) never hit the window: the window is a few ms (tmp write + chmod + rename), so likelihood is low.
- Scenario: user double-clicks Stop just as the answer finishes; the Run that produced its artifacts is stored as `cancelled`, the event log shows terminal -> active regression.
- Owner docs: app/docs/api-v6.md:29-34 (terminal statuses), app/docs/run-attempts.md:31-53 (supersede targets depend on final status), app/README.md:230-233, RD-001:81.
- Fix direction: make the store reject a status patch on a terminal Run (or make `cancelRun` do its check-and-set inside one `_mutate`).

### 2. host-runtime F2 - managed `cancelled` after user cancel  (PARTIAL)
- Reviewer's literal scenario (`tmp-host/probe-cancel-vs-complete.mjs`: cancel first, remote then completes) is NOT reproduced: 4/4 runs give `hostStatus:"unknown"`, `error.code remote_effects_unreconciled`, native root terminal `completed` recorded. That is the conservative and correct outcome for the contract (gateway `decide` does not treat a completed turn as decisive while the accepted cancel intent is unresolved).
- The mechanism at `service.mjs:3369-3372` is real: `entry.cancelRequested` is tested before `extensionOutcome`, so if the native root turn is already decided `completed` and a cancel lands before the Host's terminal write (same window as #1), the Host says `cancelled`. Repro: `f2-mapping.mjs` (only widening: Host's own `store.recordUsage`, called after `runtime.run()` returned, is delayed 400 ms) -> `{"cancelReturned":"cancelled","final":"cancelled","error":null,"nativeRootTerminal":"completed","statuses":["running","stopping","cancelled"]}`. The same mapping applies on Pi.
- Prod path: managed Agents executor is unreachable from `npm start` (cli.mjs never supplies `managedRuntimePort`); Pi is reachable.
- Owner docs: RD-001:81, app/docs/runtime-foundation.md, agents-host-gateway.mjs:311. Fix direction: same arbitration as #1; when the native outcome is `completed`, do not let a later cancel request relabel it (or record it as `completed` with a cancel note).

### 3. host-runtime F3 - exception during pending cancel -> `cancelled`, error null  (CONFIRMED, minor)
- Root cause: `service.mjs:3328` (`extensionOutcome = ... entry.cancelRequested ? "canceled" : "failed"`) and final mapping 3369-3372 (error kept only for failed/unknown).
- Repro: `node review/tmp-host/probe-cancel-exception.mjs` (wraps the *real* Pi port so `run()` throws while a cancel is pending; the catch block is production code) -> `cancel -> cancelled run.error: null | run.error events: [{"code":"provider_error",...}]`; same exception without cancel -> `failed {"code":"provider_error"}`.
- Realistic trigger: `runtime_projection_failed` from `pi-session-runtime.mjs:570-573` (event persistence failed) during a cancel; the error event is still recorded, the Run record loses it.
- Correction to the report: RD-001:65 describes the v3.1 *experiment* wrapper (historical archive), not the product Host; "contradicts RD-001:65" overreaches. The product-facing owners are app/README.md:230-233 and RD-001:81 (unresolved outcome must not be reported as cancelled).
- Fix direction: in the catch block treat any thrown error as `failed`/`unknown` regardless of `cancelRequested`.

### 4. harness F1 - check_run is arbitrary code as Host user  (CONFIRMED, major)
- Structural facts (read): candidate at `<dataDir>/repository-candidates/<sha256(sessionId)>/candidate-<id>/worktree` (service.mjs:1436) while `credentials.json` is `<dataDir>/credentials.json` (server/credential-file.mjs:11-14); runner spawns `node --test` with cwd = candidate under the Host uid, env stripped only (runtime/check-runner.mjs:43-45; the file header itself says "not a sandbox"); `hostToolCeiling` (runtime/control-plane.mjs:31-39): `repo_write` = allow in `draft` (the default, store.mjs:1012), `check_run` always asks; approval descriptor carries recipe/argv/candidateWriteRevision only (check-tools.mjs:52-59).
- Repro: `node review/tmp-harness/p4-e2e.mjs` -> "permission questions so far: ['check_run']" (repo_write of `test/evil.test.mjs` needed none), approval payload `{"recipeId":"node-test","argv":["--test"],"cwd":"private candidate"}`, `check.settled completed 1 | stdout has outside read: true` (test read a dummy file placed at the credentials.json location, 4 dirs above the candidate). Probe used a dummy file, not the real credentials file; the path relation is structural.
- Scenario: a prompt-injected model writes a `*.test.mjs` that prints `../../../../credentials.json`, the human approves "node --test in private candidate", output returns to the model.
- Owner docs: engineering/architecture.md:119 ("if arbitrary shell or code execution is opened to a model ... must be shown that the execution identity cannot reach formal write capability or credentials"), app/docs/check-recipes.md:8,117,163-176 (says not a sandbox, but "shows exactly what will run" overstates), RD-009:13-18 (input file versions in the card - not implemented).
- Fix direction: show hashes/paths of candidate-authored files in the approval (or refuse check_run when unreviewed writes exist), and/or run the child under a different OS identity/sandbox; otherwise record the architecture rule as knowingly unmet.

### 5. harness F2 - SIGTERM-ignoring descendants survive  (CONFIRMED, minor-major)
- Root cause: `runtime/check-runner.mjs:115-121` `close` handler does `clearTimeout(killTimer)` when the leader's stdio closes; nothing verifies the group (`kill(-pid,0)`) is gone; SIGKILL to the group (line 94) is only scheduled, then cancelled.
- Needs a descendant that ignores SIGTERM *and* has detached stdio (otherwise the pipe keeps `close` from firing and the 500 ms SIGKILL still runs).
- Repro: `node review/tmp-harness/p2-runner.mjs` -> `cancelled: true ... grandchild alive after cancel settled (+1.5s): true`; `timedOut: true ... alive after timeout settled: true`. Full Host: `p5-cancel.mjs` -> run `cancelled`, single `check.settled cancelled`, `pgrep` still shows `/bin/sh -c trap "" TERM; sleep 25` after cancel returned (I killed it).
- Scenario: a cancelled check leaves a live process writing into candidate/HOME while the next Run starts. Requires candidate-authored hostile code (already covered by #4).
- Owner docs: app/docs/check-recipes.md:182-184, RD-009:17. Fix direction: after leader close, re-signal SIGKILL to the group unconditionally (or poll `kill(-pid,0)` until gone) before resolving.

### 6. harness F4 - ws_grep returns content denied for ws_read  (CONFIRMED, minor)
- Root cause: `runtime/control-tools.mjs:120-127` (governTools) resolves the policy resource from `args.path` (the search *root*) and only `repo_*`/`candidate_*` aggregates get per-file admission (`createPathAdmission`, control-tools.mjs:105-113); `ws_grep`/`ws_list` never call `admitPath` per file.
- Repro: `node review/tmp-harness/p9-wsgrep.mjs` -> `ws_read isError: true | leaks sentinel: false`, `ws_grep isError: false | leaks sentinel: true` (deny rule `ws_read materials/secret.txt`).
- Contract status: per-file aggregate rule is stated only for repo_/candidate_ (app/docs/repository-binding.md:61-75, RD-006); nothing documents ws_* - a gap rather than a contradiction. A deny on the `ws_grep` action itself works.
- Fix direction: pass per-file `ws_read` admission into ws_grep/ws_list (as candidate_grep does) or document that ws_read deny does not cover ws_grep.

### 7. work-core F1 - extensions receive the raw CoreClient  (CONFIRMED, minor)
- Root cause: `runtime/extension-registry.mjs:117,213` call every catalog factory with `{dataDir, core: this.workCore}`; `server/runtime.mjs:77` passes `workCore.client`; `runtime/local-extensions.mjs:131-138` forwards the same context to registered packages (`trust:'host-trusted'`, line ~40).
- Repro: `core-ext.mjs` (production `startServer` + production catalog; factory wrapper only captures the context) -> `context keys: ['dataDir','core'] | core.constructor: CoreClient | has decide: function | has call: function`; via that object an extension created a Matter/candidate and `decide accept` succeeded with no Host involvement.
- Nuance: extension code is in-process JS with the Host's rights, so a narrowed facade would not stop deliberately hostile code (it can import core/client.mjs itself); it only protects against accidents. So "convention, not boundary" is accurate but the trust model is already host-trusted by design.
- Owner docs: engineering/architecture.md:15,117, engineering/core-contracts.md:17, docs/work-core/contract.md. Fix direction: pass a narrowed facade (no `decide`, no free `call`) or restate the rule as a trust rule.

### 8. work-core F2 - Core accepts candidate with blocking open obligations  (behavior CONFIRMED, defect REFUTED)
- Repro: `core-ext.mjs` -> candidate with `{blocking:true,status:'open'}` obligation accepted; matter obligations `[{"blocking":true,...,"status":"open"}]`, candidate `accepted`.
- But `core/core.py:708-715` says so deliberately: "Candidate obligations are proposals. A trusted accept promotes new open proposals atomically"; Core gates the *pre-existing* blocking obligations (`OBLIGATION_OPEN`, core.py:699-702) so the promoted obligation blocks the *next* accept. docs/work-core/contract.md:42 explicitly says "Domain completion may further restrict accept", i.e. the NDA gate in `extensions/inbound-nda/index.mjs:45-53` is the intended layer. The only tension is engineering/architecture.md:104 (M05 "owns ... completion") vs that placement: documentation ambiguity, not a code defect. A real user path needs an extension with no domain gate, or #7.
- Fix direction: state in core-contracts.md/architecture.md that Completion for candidate-proposed obligations is domain-adapter-owned (or add a Core flag).

### 9. work-core F3 - Core `outcome:"unknown"` dropped at HTTP  (CONFIRMED, minor)
- Root cause: `server/index.mjs:110` maps `error.source==='core_bridge'` to `{status:409, code, message}`; `outcome` and `operation` (set at core/client.mjs:190) are discarded.
- Repro: `core-http-timeout.mjs` (real CoreClient + real bridge, worker SIGSTOPped so the real 300 ms deadline path fires): client-level `CORE_TIMEOUT | outcome: unknown | operation: snapshot`; HTTP `POST /governance/query` -> `409 {"error":{"code":"CORE_TIMEOUT","message":"CORE_TIMEOUT: bridge request deadline exceeded"}}`.
- Impact: a timed-out `decide` that may have committed is reported as a plain 409; safety preserved by request_id replay + CAS, but the wire has no unknown marker.
- Owner doc: docs/work-core/contract.md:107 (claim is scoped to CoreClient errors; the recovery guidance does not reach the browser). Fix direction: map `error.outcome==='unknown'` to a distinct status (e.g. 202/503) and include `outcome`, `operation`.

### 10. runtime-control F1 - evaluate endpoint diverges from inspector/dispatch  (CONFIRMED, minor)
- Root cause: `server/service.mjs:1027` `const ceiling = descriptor.id === 'tool:ws_write' ? ... : 'allow'` instead of `hostToolCeiling(descriptor.action, mode)` (runtime/control-plane.mjs:31-39) used by `inspect` and `governTools`.
- Repro: `node review/tmp-control/probeD.mjs` -> `inspect spark_explore ... effect ask` vs `evaluate spark_explore 200 allow`; ws_write matches (`ask`/`ask`). Same divergence for check_run, repo_write, message_other_agent by code reading (read_only session: dispatch denies, evaluate says allow).
- Prod path: web/runtime-view.mjs:599 (Settings "evaluate"), route server/index.mjs:222. Advisory only (`advisory:true`), no grant.
- Owner docs: docs/runtime-control/api.md:15, docs/runtime-control/architecture.md:41. Fix direction: call `hostToolCeiling(descriptor.action, mode)`; add a check_run/spark_explore test (control-plane.test.mjs:102 covers ws_read/ws_write only).

### 11. Baseline failure  (STALE ASSERTION - no product regression)
- Test: `app/tests/chat-entry.test.mjs:23-33`; alone: `node --test tests/chat-entry.test.mjs` -> 1 pass, 1 fail; assertion at line 27 `assert.match(body, /chatPage\.open\(/)` on the source text of `openChatPage`.
- Cause: N07-R1 commit 16d5b94 moved the `chatPage.open({...})` call out of `openChatPage()` into the new `refreshChatPage()` (`app/web/app.mjs:6695-6708`); `openChatPage()` (6672-6689) now sets `state.chatOpen = true`, calls `renderAll()`, `refreshChatPage()`, then focuses the title. The other assertions in that test (persistCurrentDraft, no startNewSession/request/etc.) still hold; only the source-shape regex is stale. The commit updated navigation-history.test.mjs but not chat-entry.test.mjs.
- Behavior evidence: `node --test tests/chat-page-commands-browser.test.mjs tests/navigation-history.test.mjs` (real headless Chrome; Chrome present) -> 6/6 pass; browser record asserts `pageOpen:true` after every step and page rows equal sidebar rows.
- Owner: app/tests (test is source-regex, not behavior). Fix direction: assert `refreshChatPage\(` in `openChatPage`'s body and `chatPage\.open\(` in `refreshChatPage`'s body.

## Cross-cutting note
#1 and #2 share one root: no arbitration between cancel and natural completion (no terminal-state guard in the store; `entry.cancelRequested` outranks the native outcome). #4 and #5 share one root: check_run executes candidate-authored code under the Host identity; #5 is only reachable through such code.
