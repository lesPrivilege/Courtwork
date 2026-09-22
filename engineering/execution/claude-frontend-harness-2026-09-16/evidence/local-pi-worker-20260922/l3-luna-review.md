# L3 Luna bounded review

Date: 2026-09-22. Review target: product source `a863067703a2de6f9fedc749ec85d4db2ef04e3e`. Scope was limited to `local-pi-host.mjs`, `local-pi-state.mjs`, the local service branch, `Subagents` settlement/reconcile/admission, RuntimeStore20 validation/migration, and the specified tests. The uncommitted parent-tool test was included by the test command; no source files were edited.

## Independent verification

Command:

    node --test --test-concurrency=1 app/tests/local-pi-host.test.mjs app/tests/local-pi-schema20.test.mjs

Result: **19/19, exit 0**. The module now contains 19 tests/subtests, including the parent-tool → actual local Pi → serial-lane release scenario.

Covered paths include exact retained findings and provided-only coverage, typed receipt rejection, dispatch/spawn/result/terminal crash fences, source revocation before intent and publication, cancellation after owned process close, source freshness, result-retention failure, generic event-forge rejection, schema19→20 migration, old-host refusal, and admission fencing.

Raw output: [l3-luna-tests.log](l3-luna-tests.log).

## Blocking finding · terminal receipt and final Run status can disagree

`local-pi-state.mjs:20-25` defines an unresolved local Run only when the Run is `unknown`, lacks a terminal receipt, or has a terminal receipt whose status is `unknown`. `validateLocalPiEvents()` validates the typed terminal payload (`local-pi-state.mjs:82-109`) but does not require the final persisted CW Run status to agree with that terminal status. Its only Run/terminal cross-check is the one-way completed check at lines 119-125.

Bounded reproduction against the actual Host path:

```json
{"original":{"runStatus":"completed","terminalStatus":"completed"},"forgedRunStatus":"cancelled","validatorAccepted":true}
```

The forged state is accepted by `validateState()`. With the same state, `localPiRunUnresolved()` returns false because the Run is no longer `unknown` and the terminal receipt is `completed`. The Store admission fence at `store.mjs:1538-1542` and the queue fence at `subagents.mjs:149` can therefore treat the contradictory local attempt as settled and admit another Run.

This is a strict cross-record invariant gap, rather than a failure observed in the normal Host execution path. The validator must permit the active Run status while the terminal event is being appended, then require the terminal status and final Run status to agree on subsequent persisted mutations. At minimum, a terminal `completed` receipt must not coexist with a final `cancelled`, `failed`, or `unknown` Run; equivalent checks are needed for the other terminal classifications. The correction belongs in the Store/local-Pi state validation boundary and needs a regression that mutates the final Run status after a valid terminal receipt, then asserts state validation and admission fail closed.

## Disposition

**Return to owner before final L3 acceptance.** The actual process, Host/restart, receipt, migration, cancellation, source-freshness and serial-lane tests are green. This one cross-record contradiction can clear the local-process fence, so the L3 result is not independently accepted within this review.
