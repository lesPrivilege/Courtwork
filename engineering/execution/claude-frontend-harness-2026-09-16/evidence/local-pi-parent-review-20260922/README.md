# Local Pi finite loop — parent review

2026-09-22 · Parent Astra. Packet `6b45fd8e5dd288982df7f28ee981a15676ae4e11`, product `6c87b7d17242ac2f67bb7dacb69f37af48a65e36`; parent main `578d77d`. **Hold integration for LP-R5.** The original fresh Astra task/tree retains this bounded correction. No schema20 code or user data is adopted in this review.

## LP-R5 — adopt; deletion must preserve referenced recovery authority

Parent [actual crash/reopen/HTTP probe](delete-probe.mjs.txt) and [failure log](delete-probe.log), exit1, reproduce against the delivered source. The raw probe preserves its original checkout locators; these are historical reproduction inputs, not a new persistent product path. It uses the author's actual dispatch-before-spawn crash fixture, independent temporary data and no paid provider.

1. A child is reopened from crash state with Run unknown and its local process fence true.
2. Authenticated `DELETE /sessions/<childSessionId>` returns200.
3. The Run and its local receipts are removed; `localPiRunUnresolved` returnsfalse. Its assignment still references the deleted execution.
4. Full `validateState` rejects the resulting persisted shape with `Execution binding mismatch`. No model/provider request occurs in this probe. **A second process was not started or claimed to have started.**

The production chain is RuntimeService.deleteSession → RuntimeStore.deleteSession. The store removes Session/Run/events without checking child-reference ownership. The new `_mutate` local validator returns early after the last local Run/events disappear, leaving dangling assignment/attempt authority. This violates retained recovery evidence and produces data the next open cannot validate, independent of whether the process actually ran before the crash.

Return the smallest existing-owner deletion guard: reject deletion of parent/child Sessions still referenced by local assignments, attempts, sources/results, particularly unresolved dispatch. Enforce it atomically in Store as well as a useful public refusal. Do not build a new deletion framework, silently cascade away history, or weaken the unknown fence. Cover unknown child, parent with a local child and completed retained-result references; refusal preserves memory/disk bytes and a valid reopen, reconcile/retry remains fenced, and unrelated unreferenced Chat deletion still works. If a common existing Spark reference guard is the minimal implementation, document its exact scope rather than creating runtime-specific lifecycle duplication.

Also synchronize app/README.md's runtime-state.json example comment (still19) with its correct20 section in the candidate. This is a minor documentation correction, not a second feature.

## Other evidence and limits

Parent inspected the process/JSONL transcript, Store typed receipts, per-mutation validation, admission, source publication and settled/native distinction. Existing LP-R1–R4 author/internal-review records remain pinned to their actual milestones. [Luna final non-author review](luna-review.md.txt) and [raw log](luna-tests.log) pass56/56, exit0 at the fixed candidate (L1/L2/Host/schema20, single concurrency). It independently inspects the deletion path and consumes the parent probe without claiming to have rerun it; LP-R5 remains the sole reproduced blocker in this bounded review. These passes do not override the deletion finding.

Parent reran the previously failing candidate API case once with the author's diagnostic preload: [1/1 exit0](candidate-diagnostic.log), ~8.1s. The earlier111/112 run and failed targeted retry remain unexplained. A later pass does not diagnose their cause; no resource-flake or full-green claim is made, and no full-suite/stress campaign was started.

All parent probe/test Hosts used disposable data and closed. User8787, credentials, M1 and main product bytes are unchanged. The source tree stays preserved for LP-R5.

Raw reviewer bytes are preserved, including the final blank line in `luna-review.md.txt`; that is the sole intentional diff-whitespace exception. Other changed prose/probe/log paths pass the whitespace check.
