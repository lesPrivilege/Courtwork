# A1 independent async boundary review

Reviewed on `b4c98d415ff0ae61d381260e70d49a59dce60e36` using a new production `RuntimeStore` per case and `AsyncTasks` directly. The review does not invoke the author host/Pi responder or reuse its test harness.

`app/tests/async-boundaries-independent.test.mjs` uses a deterministic immutable adapter and covers: historical source catalog reads, policy refusal before adapter I/O while a Run remains unresolved, a late/reversed query that cannot replace cancelled settlement, a lost cancel acknowledgement, dispatch denial after the origin Run is stopped, and bounded wait behaviour.

Run with `node --test tests/async-boundaries-independent.test.mjs` from `app/`. The local worktree uses the existing project dependency installation only to resolve declared package dependencies; no production files or dependency lockfiles are changed.

The current product head `35f4bf0` was merged into this review tree after the independent test commit. The focused independent suite and the production async-task suite then passed together (9/9); the additional passing case is the main-line UTF-8 migration refusal regression.

## Wrapper pre-consumption regression

`host/Pi wrapper denial of an old async_get leaves the new Run unresolved` is a deliberate red test at `35f4bf0`. Its host/Pi setup first creates an unresolved task, applies a session policy that denies `async_get`, then has a new Run request the old task. The wrapper rejects before `AsyncTasks.consume` records the delivery. The old product incorrectly completes the new Run; the expected state is `unknown`, with no adapter query I/O and an unrecorded delivery receipt. The red output is retained in `wrapper-policy-red.log`; this test must turn green only with the product correction.

The original `wrapper-policy-red.log` used a responder counter across the whole retained Pi history. Its second Run returned `final` before making `async_get`, so it is retained only as a rejected probe and does not evidence the wrapper behavior.

The corrected responder counts tool messages after the latest user message. At fixed old product `35f4bf0`, it produced the intended red result: the second Run requested `async_get` and completed although the expected state is `unknown`; see `wrapper-policy-corrected-red.log`. At fix head `74944d052fd84644413f99411243b5a66ef86144`, it passes with a `tool.start` for `async_get`, a policy-denied error result, zero adapter query calls, and a pre-recorded delivery whose `runtimeRecordedAt` remains null; see `wrapper-policy-green.log`.
