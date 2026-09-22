
# Independent non-author review — Core C/D/E runtime loop

Date: 2026-09-22
Candidate final documentation/source HEAD: 45ae12e872cd5423e5a658de8830fbb2e452625f
Milestones: C eec2244, D 37a14a5, E 2978f5a; final documentation commit 45ae12e.
Tree: /Users/lesprivilege/Projects/.worktrees/courtwork-core-runtime-loop-20260921
Scope: Store schema/validators/migration, Host gateway admission/cancel/retry/recovery, native identity/result ownership, and selected C/D/E tests. No source changes, checkout, full suite, provider call, credential inspection, UI operation, or personal-data access.

## Verification

Independent selected suites:

    node --test app/tests/p03c-host-consumer.test.mjs app/tests/p03d-host-recovery.test.mjs app/tests/p03e-write-check-parity.test.mjs app/tests/schema19-upgrade.test.mjs

Result: 32/32, exit 0. Raw log: /tmp/cw-core-cde-independent-tests.log.

The tests cover admission, declaration forwarding, required-action validation, governed reads, duplicate/concurrent claims, creation loss, submission loss, SIGKILL fences, bounded recovery, input retry, cancel confirmation, schema upgrade, and Pi/remote write/check parity. This is targeted evidence, not full-suite or live-service acceptance.

## F01 — root-terminal reconciliation clears execution-unknown without local effect evidence

Severity: release blocker for D/E recovery safety.

The final state transition can mark a native call as resolved when its local execution is unknown and no result bytes exist:

- app/server/remote-action-state.mjs:222-228 defines a call with execution unknown as unresolved only while resolution is null.
- app/server/remote-action-state.mjs:409-432 accepts root_terminal evidence for every unknown call and appends a resolution to the call and its delivery partner. It does not distinguish execution unknown from delivery unknown.
- app/server/service.mjs:2693-2699 automatically queues root_terminal resolution for every unresolved action when the observed root turn has ended.
- app/server/remote-action-state.mjs:224-228 then reports the execution-unknown call as resolved, allowing admission to proceed.
- E exposes repo_write through the same gateway (e-parity-evidence.md, product-source section), so the missing-result state can represent a local write whose effect may or may not have happened.

Executable counterexample using the product state transition functions:

    claim native repo_write call
    set call.execution = unknown with result = null
    record the Run root turn as completed
    resolveRemoteActions with evidence root_terminal
    result: resolution is recorded and remoteActionUnresolved(call) is false

Observed result:

    {"execution":"unknown","result":null,"resolution":{"evidence":"root_terminal","nativeRef":"turn-1","resolvedAt":"2026-09-22T00:00:00.000Z"},"unresolved":false}

Raw counterexample: /tmp/cw-core-cde-counterexample.log.

A root turn ending proves that the remote harness turn ended. It does not prove that a Host-local repo_write/check/read effect happened, did not happen, or has a retained result. Clearing the fence can admit a later Run that repeats a side effect with a new native call. The existing D tests cover SIGKILL while a repo_read claim waits and SIGKILL while a retained result is being submitted; they do not cover a SIGKILL during an execution-unknown repo_write followed by a later root-terminal observation.

Required disposition: keep execution-unknown fenced unless a separate decisive Host-effect receipt exists. Root-terminal evidence may resolve delivery-unknown when the exact result is already retained, and may settle Run liveness, but it must not resolve missing-result execution. Add a regression case for a claimed repo_write with no retained result, a root terminal, reconciliation, and a refused next remote Run.

## Store and identity review

Validated source-backed invariants:

- Pi hostSession remains separate. remote-action-state.mjs:86-126 rejects coexistence with a Pi hostSession and validates native IDs, protocol identity, connection hash/configuration/credential generation, scope and root-turn attribution.
- Native root association requires turn.created attribution and a null subagent identity in agents-host-gateway.mjs:248-252. The gateway filters assistant output and terminal evidence to the recorded root turn at :254-280.
- Claims are atomically serialized through RuntimeStore._mutate. remote-action-state.mjs:354-377 keys a claim by native session/turn/call, rejects argument/tool conflicts, and reserves action/result budget before execution.
- Result retention precedes delivery. agents-host-gateway.mjs:222-245 retains exact bytes/digest, begins the tool-result intent, then submits once; unresolved delivery is not retried.
- Restart fencing is explicit in store.mjs:914-918 and remote-action-state.mjs:436-452: pending intents and claimed calls become unknown, with no re-read, re-run or re-send.
- Bindings contain connection ID/config hash/version/credential generation, not credential values (remote-action-state.mjs:72-75). Remote action arguments are bounded and content-addressed; repo_write payload retention follows existing ArtifactHistory/write precedents. No API-key or secret field was found in the remote binding shape.
- Repository permission ownership is reused: gateway function declarations come from admitted governed tools, strictArguments checks the existing tool schema, and C/E exercise deny, stale, revoke, out-of-scope and write/check parity.

No additional concrete native-session or permission bypass was reproduced in this bounded pass. Cross-record validator completeness remains a design follow-up: validateRunRemoteBinding validates the Run shape but does not itself cross-check every field against Session.remoteBinding; normal admission paths do perform the binding comparison. I did not count this as an acceptance blocker without a persisted-state counterexample.

## Schema 19 status

Final E is the adoption candidate. Direct schema18 → final schema19 upgrade, exact backup, malformed input, unsupported-newer input and old-host refusal all pass the selected 4 schema tests.

The intermediate C commit is not independently compatible with the later D/E validator if it contains a non-null rootTurn lacking D terminal field; the author handoff explicitly records this as test-temp-only state. Do not integrate C intermediate schema19 state as a standalone release. Adopt only the final E tree/migration contract, or add an explicit compatibility migration before any C data could exist outside test directories.

## Decision

Return F01 to the C/D/E owner before integration. The rest of the selected invariants pass targeted verification, but the execution-unknown/root-terminal distinction must remain fenced for safe repository-write parity. No independent acceptance, live API claim, or merge recommendation is made.
