
# CDE-R1 independent non-author review

Date: 2026-09-22
Final candidate: e49232e77b6b797f256a345d951b0d36b23b416f
Parent candidate: 45ae12e872cd5423e5a658de8830fbb2e452625f
Milestones: C eec2244, D 37a14a5, E 2978f5a, CDE-R1 e49232e.
Tree: /Users/lesprivilege/Projects/.worktrees/courtwork-core-runtime-loop-20260921

## Verification

Selected final-tree suites:

    node --test app/tests/p03c-host-consumer.test.mjs app/tests/p03d-host-recovery.test.mjs app/tests/p03e-write-check-parity.test.mjs app/tests/schema19-upgrade.test.mjs

Result: 33/33, exit 0, 21.7 seconds.
Raw log: /tmp/cw-cde-r1-luna-tests.log

Coverage includes:

- C production service admission, declaration forwarding, governed repo_read, native identity, duplicate/concurrent claims, creation loss, submission loss, restart fences and runtime mismatch.
- D cancellation, bounded stream recovery, duplicate observations, retained-result delivery reconciliation, post-restart continuation, lost creation, real SIGKILL process cases, and the new execution-unknown root-terminal regression.
- E Pi/remote write/check parity, deny/stale/revoked/cancelled behavior and argument ceiling.
- Schema18 to final schema19 upgrade, exact backup, malformed legacy/remote state, unsupported newer state and schema18-host refusal.

## Disposition

CDE-R1 is independently accepted within its bounded correction scope.

The prior F01 violation is closed by the final source:

- remote-action-state.mjs now keeps every call with no retained result unresolved, regardless of root-terminal evidence.
- resolveRemoteActions rejects root_terminal/native_item evidence for a call with no retained result.
- service.reconcileRemoteSession skips such calls and reports local_effect_unknown.
- A retained-result delivery-unknown call remains resolvable by root-terminal or native-item evidence.
- The new p03d test drives the real service/reopen/reconciliation/admission path: interrupted repo_write claim, Host reopen, native root ending, reconciliation with no new request/read/write, resolution remains null, next Run returns remote_unreconciled, and the candidate file/effects remain absent.

Relevant source:

- app/server/remote-action-state.mjs:179-184,222-228,409-432
- app/server/service.mjs:2671-2703
- app/tests/p03d-host-recovery.test.mjs:239-269

## Validator, identity and ownership review

Validated:

- Pi hostSession and remote binding remain mutually exclusive; native IDs, binding/configuration identity, root-turn attribution and repository scope are checked.
- Claims remain atomic through RuntimeStore._mutate and keyed by native session/turn/call.
- Exact result retention precedes delivery; unknown delivery is distinct from unknown execution.
- Restart fences do not re-read, rerun or resend.
- No credential/API-key field appears in the remote binding shape; connection data is IDs, hashes, versions and generations.
- Governed repository permission and check/write owners remain shared with Pi; E parity remains targeted and bounded.

No additional concrete violation was reproduced. Cross-record validator completeness remains a review limit: the Run validator does not independently cross-check every Run binding field against Session.remoteBinding, although normal admission performs those comparisons. No persisted-state counterexample was found in this pass.

## Schema boundary

Final E/R1 is the adoption candidate. The direct schema18-to-final-schema19 tests pass. The intermediate C schema19 shape with a non-null rootTurn lacking D’s terminal field is not independently deployable; it remains test-temp-only per the author handoff. No standalone C migration or extra schema version is required for final adoption, provided only the final tree is integrated and any non-temporary C-created data would stop adoption for an explicit compatibility decision.

No full suite, live API, provider, credential, UI, merge, checkout or source edit was performed.
