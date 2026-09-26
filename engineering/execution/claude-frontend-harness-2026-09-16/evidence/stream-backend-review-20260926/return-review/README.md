# Independent return review — 2026-09-26

Fixed source: `9bef03c2aa78785275a3c833e52bd69175e567bc`, containing STR-R1 `0bb5186` and STR-R2 `0fa6eda`. Main inspected at `61073b1`. Original Claude's branch/tree remain unchanged. **STR-R2 accepted within the fixed-fixture scope; STR-R1 remains held for final/in-flight-write failure settlement. No merge or frontend release.**

## What passed independently

Parent ran the original [persistence-failure probe](../persist-failure.mjs) against the new source: [result](original-fault-probe.json) is now `failed / runtime_projection_failed`, usage missing, matching main's prior control. Thus the original log-only failure return is corrected.

Parent also reran the real-Host streaming audit on Node25.9 with isolated loopback fixtures: [audit](audit.json), [console](audit.log), 6/6. C10 reads the actual on-disk state and records 252,937 bytes of state-file growth, 264,177 bytes of data-directory growth, 176,472 compact delta-event bytes and 170,736 snapshot-text bytes over 35 deltas. The two asserted bounds are 380,000 state-growth bytes and 266,000 delta-event bytes. Source inspection confirms the assertions test these actual measurements. The original author's fixed-source control evidence at `9bef03c:engineering/execution/claude-frontend-harness-2026-09-16/evidence/stream-backend-return-20260926/control-no-coalescing.json` reports 2,276,880/2,170,536 bytes respectively and C10 failure when coalescing is disabled; parent inspected that artifact, did not rerun the control. This closes STR-R2 only for the stated fixture and hardware/runtime context. Whole-file rewrite write amplification and general scalability remain unmeasured; G1 remains mitigated.

Luna reran the two stream suites plus the previous Host/recovery/parity, protocol/transport and Pi port suites, 71/71 passing; [raw log](luna-targeted.log) preserves the bounded test runs. Passing author full-suite1692/1692 is not attributed to this review. No browser, live managed provider, Node22/24 or full-suite rerun was performed here.

## STR-R1 remains: failing write while final is already waiting

The new final branch clears `open` and `lastText` before `await settleWrites()`. If that awaited write rejects, the final is correctly refused, but `settle("failed")` sees no open text. There is neither a normal final nor a Host partial final for the segment.

Parent reproduced through the real Host and real Pi port with a synthetic provider, using [this standalone probe](final-inflight-failure.mjs):

1. Hold the second `assistant.delta` append unresolved; allow execution to continue.
2. Wrap the existing Pi observation sink. When `assistant.message` arrives, first call the real sink so it begins awaiting the in-flight snapshot; then reject that held write in a microtask.
3. Read the terminal Run and its persisted events through HTTP.

[Observed result](final-inflight-failure.json): injection and final observation both occurred; Run is `failed / runtime_projection_failed`; three deltas remain persisted for segment0, but `finals` is empty. The original Order3 non-completed settlement contract still requires exactly one readable partial for that open segment. This is a proven production-service seam, not only an unimplemented method or a mock ordering preference.

Luna independently reproduced the same held-write/final sequence at the stream seam: final rejected and `settle("failed")` returned null. That ephemeral probe was not saved as a standalone file; Parent's real-service probe and result above are retained.

Reproduce with `node <receipt-dir>/final-inflight-failure.mjs <absolute-candidate-checkout>`. The probe uses only its own temporary data and closes its Host; it does not edit product files or inspect user credentials.

## Explicit original-Claude continuation

Continue the existing branch and fix **only the remaining STR-R1 settlement race**. Retain enough open-segment state until the normal final is durably accepted. When an in-flight snapshot fails while final is waiting, preserve the latest valid received snapshot for one Host-synthesized error partial, then terminal failure; do not clear the failure or admit a normal final. Keep the original sequencing and idempotence requirements. Check final-write rejection as the adjacent failure boundary so the same premature-close state is not retained there.

Add a failing-before/passing-after production-service regression for the exact sequence above, including one partial with matching segment/text and error stop reason, no duplicate final after late data, and stable reload. Run narrow affected checks and required final verification, record exact source/evidence, then stop and hand back. STR-R2 stays accepted; do not retune its bound or broaden scope without new contrary evidence. The frontend high-throughput/motion work is still queued. Figma and a new permission prompt are unnecessary. Author checks do not substitute for independent disposition.
