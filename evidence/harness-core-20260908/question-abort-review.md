# HYP-01 question-abort race review

**Date:** 2026-09-08
**Scope:** one bounded question creation/abort probe; local fake provider only
**Reviewer:** Luna, independent runtime audit
**Service baseline:** `aaa61eb` (before the ordering guard)
**Current check:** `133269184468f1adf3b38acfc59091818daeb8e8` (includes the ordering guard and regression)

This probe tested the hypothesis that a Run abort can happen while question
creation is awaiting durable storage, before the service has installed the
abort listener and registered the in-memory waiter. It used the real
`startServer`, `RuntimeService`, `RuntimeStore`, Pi `AgentSession`, and fake
loopback provider. No paid provider or service source edit was used for the
probe.

## Baseline reproduction

At the baseline, `app/server/service.mjs:1119-1130` performed these operations
in this order:

1. `await this.store.openQuestion(...)`;
2. construct the decision promise;
3. add the `abort` listener;
4. insert the question into `questionWaiters`.

The test intercepted only the real store's `_persist` call when the working
state first contained the pending question, and held that persist on a gate.
The real Pi Run was then started with:

```text
/fixture script [{"name":"ask_user","arguments":{"prompt":"race probe"}}]
```

At the gate, the unpublished mutation contained a pending question, while
the published store still reported `run.status = running`, no question for
that id, and `questionWaiters.size = 0`. Calling the active Pi entry's real
`abort()` before releasing the gate set Pi's stopped state while the service
was still awaiting `openQuestion`. Releasing the gate then published the
question and continued into listener/waiter registration after the signal had
already fired.

The baseline observation was reproducible: after release, the question was
pending, `questionWaiters.size = 1`, and the Run remained `waiting_user` for
the bounded 500 ms observation window. The abort promise did not settle until
the test issued a separate cleanup `cancelRun`; cleanup then recorded both
the Run and question as `cancelled`. The original probe test passed by
asserting this observed hang, so that pass was evidence of reachability, not
evidence that the service behavior was correct.

## Boundary of the finding

This confirms the lower-level host abort seam can reach the missed-signal
state through the real RuntimeStore/Pi path. It does **not** by itself prove
that the public `POST /runs/:id/cancel` route reaches the same interleaving.
`cancelRun` first awaits its `store.updateRunWithEvent` mutation at
`app/server/service.mjs:1180-1183`, and only then sets `entry.cancelRequested`
and calls `entry.abort` at `:1194-1206`. The probe therefore invoked the
active Pi abort directly to force the requested ordering and deliberately did
not claim an HTTP cancellation hang.

## Current guard and regression result

The current working-tree change at `app/server/service.mjs:1131-1133` checks
`signal.aborted`, `entry.cancelRequested`, and the persisted Run's
`admissionOpen` flag in the same synchronous block after installing the
listener and waiter. An already-fired signal now rejects the decision promise
and allows normal cleanup to proceed.

The converted regression in
`app/tests/question-abort-race.test.mjs` repeats the exact gated Pi/store
interleaving and asserts:

- the active Pi abort settles after the gate opens;
- the Run reaches `cancelled` without a second cancel request;
- the waiter map is empty; and
- the durable question is recorded as `cancelled`.

The relevant commands were:

```sh
node --test app/tests/question-abort-race.test.mjs
node --test app/tests/cancel.test.mjs app/tests/answer-admission-race.test.mjs app/tests/question-abort-race.test.mjs
```

At `133269184468f1adf3b38acfc59091818daeb8e8`, the focused regression passed
1/1. The combined question/cancel run passed 11/11. The test file and this
report are the only files owned by this audit task; `app/server/service.mjs`
remains the parent implementation's change.
