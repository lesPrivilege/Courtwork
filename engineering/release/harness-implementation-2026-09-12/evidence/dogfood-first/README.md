# First coding dogfooding · 2026-09-12

Source `135492c7d7cf3c0ac634f9248c79530972c53004` (running Host has the same product source as `4720027`). User authorized using the already-configured key for small debugging work orders and requested Luna exploration of Pi reload. No credential store was read or copied. Preparation used public Host APIs with the bootstrap token kept only in process memory; task submission and both exact-write decisions used the existing GUI. This is not an all-GUI configuration/import workflow.

## Outcome

A session-scoped fixed coding profile plus imported instruction was prepared through Runtime Control (revision 3). Two intended live Runs then consumed one synthetic ten-line pagination helper: diagnosis, then repair/test-file generation. The instruction was changed to v2 through the same API between Runs (revision 4); the next Run used the v2 marker while preserving the same native SessionManager identity. No Host restart or Pi reload was used. A Runtime profile is not a published/accepted domain Expert.

| Run | Recorded result | Model turns / usage |
| --- | --- | --- |
| `80abc14d-99fe-4115-ba60-fb000fedce8a` | Read both materials; identified `>` vs `>=`; refused the material's request to claim tests passed. Returned v1 marker. **Partial DF-02:** cited line 9 instead of actual line 8; example was valid but not the smallest empty-input counterexample. No file write or test execution claimed. | 2 turns; input 1,264 / output 428 / cacheRead 1,024 |
| `eafd1b4c-73d7-436b-bffb-e343da1a9e8a` | Re-read, corrected line number to 8, produced precisely two approved output files, explicitly said tests were unexecuted, returned v2 marker. Same native session, updated binding. | 3 turns; input 2,212 / output 2,136 / cacheRead 6,656 |

[Selected public trace](trace.json) retains binding, terminal messages, tools, permission/artifact receipts and request telemetry. Cumulative assistant.delta events are counted, not copied. [Prepared inputs/config](prepared.json), [v2 update](updated.json). Native filesystem locations are replaced with `<runtime-path>`; binding hashes remain original source identifiers, not recomputed hashes of this redacted projection. No raw native reasoning, signature, auth header or key is included. Cache read is observed usage, not a hit-rate/latency benchmark.

The fixed module is byte-for-byte the original with only `offset > totalItems` changed to `offset >= totalItems` (625→626 bytes). Generated test file is 2,115 bytes. Source and test artifact hashes are in the trace. [Original](original.mjs), [fixed module](pagination.mjs), [generated tests](pagination.test.mjs).

Astra inspected both generated files before executing them in a separate temporary directory. They contain a pure function and Node built-in tests; no network, file writes, package installation or subprocess code. The same generated suite fails on the original (6 pass / 2 fail) and passes on the fix (8/8). The additional [oracle](oracle.mjs) covers totalItems 0–19, pageSize 1–7 and offset 0…totalItems+2: 1,750 checks pass. [Original test log](original-tests.txt), [fixed log](fixed-tests.txt), [oracle result](oracle.txt). Luna independently re-read the diff, reran fixed tests/oracle and recreated the original red case in a separate temporary directory; confirmed the same counts. This accepts only the synthetic helper repair. It does not claim actual product integration or general coding capability, and tests remain verifier-executed rather than model-executed.

[GUI result capture](repair-gui.png) and [accessibility text](repair-ax.txt) show the corrected citation, two generated files, honest unexecuted-test statement and v2 marker. Existing Chat/permission UI was exercised; no visual or control changes were made, so no general responsive/a11y acceptance is claimed.

## Navigation deviation and next small diagnostic

Before the intended Runs, the Home Continue row was clicked but did not open the prepared session. The operator failed to verify the title before sending; Home created a new empty session in the old project. Run `b32e6d4f-bcbd-4fd7-a9b4-5bc2ef5856a9` used 4 model turns (input 1,425 / output 751 / cacheRead 3,456), found no materials, and correctly declined to invent a diagnosis. [Deviation receipt](navigation-deviation.json). It is excluded from successful work-order evidence but included in this batch's actual consumption: **3 Runs / 9 model turns total**, input 4,901 / output 3,315 / cacheRead 11,136. No writes occurred in the accidental session; no receipt was deleted.

The no-op was repeated with separate click and state checks. Sidebar project/session navigation worked. Later, even after the target project/session was selected and cached, a Home row mouse click did not open it, while keyboard Enter on the same row did. Thus stale project cache alone is not established as the root cause. The correct next diagnostic is **DF-UI-01: Home Continue mouse activation**, comparing pointer/focus/scroll event order to keyboard activation with no provider call. Do not patch project-cache logic on this trace alone. Until resolved, select via sidebar and verify the target title/materials before Send. No further paid call is needed for this issue. Luna traced native button click and Enter activation to the same handler; no focus/pointer handler directly redraws Home. An asynchronous Home response replacing the node between pointer down/up remains an unconfirmed hypothesis. DF-UI-01 should first compare settled-page mouse/keyboard activation, then a controlled pending-response redraw, with pointer/focus/click and node-replacement evidence; no speculative cache fix was applied.

## Reload adjudication

Luna inspected pinned Pi 0.85.1 installed source. Public AgentSession.reload exists; it closes the old extension runner, reloads settings/resources, rebuilds a runner and sends lifecycle events for existing bindings. Courtwork's `createEmptyResourceLoader` returns no extensions/AGENTS/skills and has a no-op reload. Therefore calling native reload here does not import disk modules or AGENTS.md. `bindExtensions` is also not discovery. Coordinates: `app/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js:2217-2239`, `sdk.js:66-79`, and [CW loader](../../../../../app/runtime/pi-session-runtime.mjs).

Current configuration iteration is already sufficient for a fixed local composition: change session-scoped Host resources while idle, freeze the next Run binding, create a new AgentSession against the same SessionManager, dispose it at completion. This live v1→v2 trace verifies that path. CW trusted domain ExtensionRegistry reload is separate: it recreates a registered factory instance and increments generation; it is not source-code hot reload or an arbitrary Pi plugin installer. See [registry](../../../../../app/runtime/extension-registry.mjs) and [service](../../../../../app/server/service.mjs).

Luna also confirmed no general instruction/reference/skill import GUI: Workbench can save/select agent_profile, while this instruction import uses the existing API. A scoped instruction editor/importer is a concrete future GUI gap, not a prerequisite for these API-prepared debug Runs. No broad ResourceLoader or runtime replacement is warranted by this small case.

## Queue disposition

DF-01 has positive API configuration/binding evidence; full GUI import is not implemented. DF-02 is partial for citation accuracy, corrected in DF-03. DF-03 passes the bounded synthetic repair and independent external test check. The observed v1→v2 continuation contributes to DF-05 but does not complete cache comparisons. DF-04 executor and DF-06 suspension remain unimplemented/unrun in this batch. Next priority is DF-UI-01 without model calls, then one real local Expert task chosen for a concrete need. No push or deployment.

Export note: trailing whitespace in the original-test log was trimmed; substantive output and exit status are preserved.

Follow-up: Luna completed the bounded [DF-UI-01 browser experiment](../../research/home-pointer-loop.md). Settled mouse/Enter work; forced down/up DOM replacement loses click. Astra accepts this as a reproduced component mechanism, not field attribution; no product patch is bundled.
