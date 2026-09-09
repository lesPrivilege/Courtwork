# A1 independent async boundary review

Reviewed on `b4c98d415ff0ae61d381260e70d49a59dce60e36` using a new production `RuntimeStore` per case and `AsyncTasks` directly. The review does not invoke the author host/Pi responder or reuse its test harness.

`app/tests/async-boundaries-independent.test.mjs` uses a deterministic immutable adapter and covers: historical source catalog reads, policy refusal before adapter I/O while a Run remains unresolved, a late/reversed query that cannot replace cancelled settlement, a lost cancel acknowledgement, dispatch denial after the origin Run is stopped, and bounded wait behaviour.

Run with `node --test tests/async-boundaries-independent.test.mjs` from `app/`. The local worktree uses the existing project dependency installation only to resolve declared package dependencies; no production files or dependency lockfiles are changed.
