# LP-R1 · no-tools refusal differential review

Date: 2026-09-22. Scope: bounded non-author verification of the L1/L2 wrapper correction only. Parent Arch retains acceptance. No L3 Host/Store source was reviewed or modified.

## Source attribution

- Pre-fix wrapper: `316a2ea` (`test: exercise upstream Pi process with deterministic loopback faults`). The temporary sibling copied `local-pi-process.mjs`, `local-pi-transport.mjs`, and the current `provider-definitions.mjs`; it was removed after the probe.
- Corrected wrapper: `1f349f5` (`fix: preserve verified no-tool Pi capability refusal`).
- The existing working tree contains unrelated, uncommitted L3 files and edits. They were excluded from this review.

## Differential result

Using the deterministic loopback provider with a synthetic `bash` tool request, the pre-fix wrapper returned:

```json
{"source":"316a2ea","observed":{"status":"unknown","reason":"callback_failed","fault":"callback_failed","result":null,"exitCode":143}}
```

This reproduces the LP-R1 counterexample: the transcript had a typed `local_pi_tool_request`, but transport collapsed the callback rejection to `callback_failed`, so a spawned process was classified as unknown.

The corrected wrapper preserves the transcript fault separately and classifies the same verified no-tools request as `refused` only after the owned process closes. The new upstream assertion passed with `result: null` and confirmed the child PID was gone.

## Independent verification

Command:

    node --test app/tests/local-pi-upstream.test.mjs app/tests/local-pi-process.test.mjs app/tests/local-pi-transport.test.mjs

Result: **34/34, exit 0**. This includes the corrected actual-upstream refusal test, malformed/partial/invalid-UTF8 protocol tests, duplicate/late transcript tests, cancellation-after-close behavior, pre-spawn cancellation, backpressure, timeout escalation, and the actual upstream ambient/no-tools probes.

Raw logs: [pre-fix differential](lp-r1-before.log), [corrected wrapper tests](lp-r1-after.log).

## Disposition

**Adopt.** LP-R1 is independently reproduced and corrected at the wrapper boundary. The refusal classification does not grant acceptance, source coverage, or formal Work acceptance. L3 Host/Store integration and its schema20 recovery evidence remain outside this review.
