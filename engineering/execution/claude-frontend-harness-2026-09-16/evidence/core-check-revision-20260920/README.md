# First Core slice: exact check approval after a same-Run write

Base: `83041d158cea01f2272f010c098d538617e0c3c6`, after the completed GUI integration and preservation/cleanup receipt. Branch: `codex/harness-core-closure-20260920`. Architecture and implementation: Astra; independent verification: Luna. DeepSeek was dispatched for bounded implementation but the account channel rejected its model before work began; no credential/provider workaround was attempted.

## Scope and disposition

The original DF-04 / RD-009 / construction 03 owner remains authoritative. [Luna's source exploration](luna-exploration.md) identified the stale admission revision. **Adjust** its minimum suggestion to reject same-Run composition: the Host now resolves the current candidate when opening the check permission. A confirmed write earlier in that Run must be reflected in approval and `check.started`. The exact recipe descriptor and candidate revision must still match approval at execution. Candidate identity, binding, and execution path remain pinned to the admitted candidate. Store admission validates atomically; a synchronous runner fence rechecks after async preparation and before spawn.

No schema, UI, recipe catalog, public Extension hook API, or second agent loop was introduced. Once a start is recorded, a preparation rejection receives a failed settlement; cancellation and restart/unknown retain Host-owned settlement. This guards Host-managed state at process start. It does not provide filesystem snapshot isolation or prevent external mutation during execution.

## Author evidence

- [Before fix](regression-before.log): the real HTTP/scripted same-Run write → check regression fails because approval is revision 0 instead of 1. An earlier draft test used an incorrect HTTP status expectation; that test assertion was corrected before this recorded reproduction.
- [Focused final run](author-focused.log): **79/79** pass, including actual approved write → check in one Run, revision 1 approval and start, real `node --test` exit 0, and byte-identical check events after Host close/Store reopen. A stale revision passed directly to Store admission is rejected without appending a start.
- Negative tests cover stale write revision, candidate identity/revision/status/path, binding identity/revision/missing binding, missing or altered approval, and drift while persisting the start. The runner fence is also exercised against a real command that would write a marker; no marker is created.
- Existing checks retain deny/read-only zero start, unknown recipe, exact approval payload, nonzero exits, output limits, timeout/process-group cleanup, cancellation settlement and unresolved-start recovery without replay.

Command (repository root):

```sh
node --test --test-concurrency=4 app/tests/check-approval-revision.test.mjs app/tests/check-recipes.test.mjs app/tests/repository-candidate.test.mjs app/tests/repository-binding.test.mjs app/tests/control-plane.test.mjs app/tests/check-ui.test.mjs
```

The integrated GUI baseline had already passed the full 1223-test product check and smoke. This slice selects affected Host/runtime seams under `engineering/verification.md`; it does not re-label the old full-suite result as a run on these new bytes.

## Limits and continuation

This is a synthetic Host correctness slice, not a real-model coding task or full N-02 closure. Browser/model read → edit → self-check → interrupt/reopen evidence remains with RD-006/DF-04/03/11. G4's separately deferred visual/accessibility cells and N-13's historical count discrepancy remain unchanged. No paid provider, personal credential store, push or deployment was used. Subsequent Runtime/child work stays with P03/DRT-03/RD-005 and has not started.

**Provider-availability clarification (user, 2026-09-20).** This local Codex setup has not registered CC Switch/DeepSeek; the observed delegation error belongs to the Codex account channel. Separately installed Pi and Hermes are different local runtime targets. Their model configuration and capability must not be inferred from this error; no native credentials or configuration were inspected or changed.

## Final independent acceptance and F-01 disposition

**Accepted for local integration.** Astra adopts [Luna's final non-author review](luna-final.md), **27/27** focused checks, against the exact [final source hashes](source-sha256.json). [First-round review](luna-review-round1.md) held acceptance for pre-spawn cancellation; that finding is **adopted and fixed**, with its original inspected hashes preserved. Cancellation during preparation now prevents spawning and settles an already recorded start once as cancelled with null exit/signal/failure. [Final author verification](author-final.log) passes **82/82**, adding three cancellation-barrier cases to the earlier 79 checks. In-flight group termination and restart fencing remain covered.

The raw Luna reports call the checkout “detached”; actual Git ownership is branch `codex/harness-core-closure-20260920` at the stated base. This wording does not change the recorded file-hash identity. The product source was frozen throughout final verification. No author self-acceptance substitutes for Luna's independent checks.

## Documentation checks

Document links pass (1,433 documents / 8,132 links); the bilingual README direction is aligned and the English generator output is byte-identical. `node site/build.mjs` and `node site/scripts/check-links.mjs` pass. An initial `npm --prefix site run build` invocation failed because this repository uses a standalone build script and has no site package.json; the actual documented command was then used. This is local source validation, not deployment.
