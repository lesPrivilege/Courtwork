# Order 3 backend independent review — 2026-09-26

Parent Astra/Codex review of fixed Claude source `162fcce9893ce115c3bf0bba4606b9c055f76ca3` (initial `6da3bbc`), based on `51d0fbe`. Docs-only inventory is committed on main as `10203c0`; product baseline unchanged. Original author and candidate tree are preserved. **Decision: HOLD for STR-R1 and STR-R2; no frontend writer release or backend merge.**

## Independent evidence

- Parent ran `node app/scripts/stream-audit.mjs --out <temporary-output>` from the candidate with Node 25.9.0, isolated temporary data and loopback fake provider. [Full result](audit.json), [console](audit.log): 6/6 (C1, C2, C4, C5a, C5b, C10 as currently asserted). C1 first text 139 ms / terminal 3973 ms. C10: 10,000 characters, 417 chunks at 20 ms, 35 persisted delta events / 170,832 snapshot characters (17.1× output), against 2,091,664 uncoalesced snapshot characters. This is not full serialized durable-byte measurement.
- Luna independently passed 66 synthetic tests: segment stream 9, production Host/gateway/recovery/parity 29, protocol/transport/Pi port 28. This is bounded non-author evidence; author full suite 1687/1687 was not rerun.
- Parent inspected Store mutation ordering, Pi observation drain, Host terminal sites and the stream timer. The independent [fault probe](persist-failure.mjs) imports the checkout's real `app/tests/helpers.mjs`, creates a disposable Host, and makes exactly the second `assistant.delta` append fail once while later writes succeed. Run it with `node <probe-path> <absolute-checkout-path>`. It deletes only its own synthetic data after closing its Host.
- [Candidate result](persist-failure-candidate.json): the failure is logged, but Run becomes `completed`, error null, usage not missing. [Main control](persist-failure-main.json): same injected failure produces `failed`, `runtime_projection_failed`, usage missing. Source audit locates the regression in the timer callback's log-only rejection handler in `app/server/assistant-stream.mjs`; unlike returned observation writes, that promise never reaches Pi's persistence-error drain.

### Luna commands

Executed from the fixed candidate checkout; outputs were returned in the agent tool session, not retained as raw log files. Counts above are attributed to that non-author run.

```sh
node --test app/tests/assistant-stream-segments.test.mjs
node --test app/tests/p03c-host-consumer.test.mjs app/tests/p03d-host-recovery.test.mjs app/tests/p03e-write-check-parity.test.mjs
node --test app/tests/drt03-agents-api-protocol.test.mjs app/tests/drt03-agents-transport.test.mjs app/tests/pi-runtime-port.test.mjs
```

## Original-owner dispositions

| ID / input | Disposition | Required implementation or evidence |
| --- | --- | --- |
| Segment interface / D1(a), D2(a) | **Adopt contract, hold implementation acceptance** | Persisted `(runId, segment)`, authoritative final, legacy finals-before rule and ordered partial/terminal mutation remain the selected interface. No redesign, SSE or schema migration required by this review. |
| STR-R1: coalesced write failure becomes success | **Adjust — blocking** | Original Claude must propagate/retain asynchronous snapshot persistence failure through the Host's execution outcome; logging alone cannot turn the existing persistence failure semantics into success. Cover one-shot timer write rejection, final/terminal ordering and cleanup. Add a production-service regression that fails on `162fcce` and passes after the correction; retain the control evidence. Do not mark the Run completed or erase the error merely because a later final persists. Choose the smallest existing-owner mechanism; do not create another queue/service. |
| STR-R2: C10 asserts only final text | **Adjust — evidence return** | Measure actual serialized durable bytes with a clearly stated scope (e.g. event log plus metadata, separately from snapshot text bytes), record a measured baseline and explicit assertion bound for the fixed length/cadence fixture. Include a failure control so removing coalescing fails that assertion. Continue to state super-linear storage is mitigated, not eliminated. |
| Native interleaved items | **Defer to original managed-runtime owner** | Sequential segments are the bounded selected contract. Current gateway first-seen numbering plus Host rejection is not a no-loss guarantee for interleaved native items. A synthetic interleaving counterexample or verified upstream ordering guarantee is required before that live lane claims support; Pi/frontend release must not be described as acceptance of it. |
| User high-rate jank / weak activity fluctuation / motion grammar | **Adopt original frontend intake, queued** | Continue after these backend returns are independently disposed of. Preserve true measurement versus decoration and existing motion/reading rules. |

Not run: full suite, Node 22/24 matrix, live managed/paid provider, frontend/browser C3/C6–C9, high-throughput rendering measurements, motion specimen or accessibility matrix. No user service, credentials, schema, push or deployment changed.

## Explicit order for the original Claude

This is a request to act, not reference-only text. Continue **only the existing Order 3 backend branch**, from observed `162fcce`, and implement STR-R1 plus STR-R2 above serially. You remain the author; author reruns are not independent acceptance. Preserve the current candidate and other writers' files; do not start the frontend or another backend writer. Consume main's docs commit `10203c0` and this receipt without overwriting either branch's appended task history. Figma is unnecessary.

Record exact commit(s), changed owner/files, failing-before/passing-after tests, actual C10 bytes/bound, remaining limits and author stop/handoff in the original streaming record. Return the fixed source to Parent/Luna for independent disposition. After acceptance, the same Claude may receive the frontend continuation; that gate is not closed by this instruction. No additional routine user confirmation is needed for these already-authorized corrections.
