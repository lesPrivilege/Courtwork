# Core C/D/E — independent review and Astra decisions

2026-09-22 · Parent Astra. Candidate C `eec2244`, D `37a14a5`, E `2978f5a`; documentation tip `45ae12e872cd5423e5a658de8830fbb2e452625f`, base `3022b5c`. **Hold the whole final adoption for CDE-R1 below.** No schema19 source/data or new remote runtime is merged into main in this review. Original core author retains the same branch/tree for the bounded return.

The author reports stopping background session `1e0858d6` before model work and completing the loop in one authenticated Claude/Fable desktop session. This explains the source advancement; it is not a claim that the original CLI login was repaired. The complete offline author report and seven questions are retained at the pinned tip's `engineering/execution/claude-frontend-harness-2026-09-16/evidence/core-runtime-loop-20260921/author-status.md`.

## Independent evidence

[Luna's bounded review](cw-core-cde-independent.md), [targeted test log](cw-core-cde-independent-tests.log): **32/32**, exit0, covering C service consumer, D recovery, E parity and schema19 migration. Author closing1421/1421 remains author evidence; no independent full suite or live API trial. Parent inspected the state/Host resolution chain, the retained result precedent and the actual pinned SDK `sessions.turns.retrieve` implementation. No personal credentials, provider experiment or user data migration.

## CDE-R1 — adopt; native terminal cannot settle unknown local execution

[Executable counterexample](cw-core-cde-counterexample.log): a call with `execution:"unknown"`, `result:null` receives a `root_terminal` resolution, after which `remoteActionUnresolved` returns false. This is produced by the exported state-transition functions, not a browser or a live service. The actual Host `reconcileRemoteSession` queues this resolution for unresolved records of a terminal root, so the unsafe transition is connected to the production reconciliation path.

Source: `remote-action-state.mjs` unresolved predicate and `resolveRemoteActions`; `service.mjs` reconciliation resolution selection. A remote root ending establishes remote liveness, not whether a local `repo_write` or check executed or what it produced. Clearing the execution fence can admit a subsequent Run while that local effect is still uncertain.

Return only this distinction and its evidence:

1. Keep execution-unknown/missing-result calls fenced until decisive matching **Host-effect** evidence exists. Native root-terminal/item evidence alone must not resolve them, directly or through paired claim/intent propagation. Do not fabricate a result to clear the fence.
2. Keep known execution with retained exact result distinct from delivery-unknown. Native terminal may end remote liveness and resolve the remaining remote-delivery uncertainty according to its explicit meaning, while the original unknown receipt remains historical. It must not become proof of local effect completion or function-result consumption.
3. Exercise the actual service/reconciliation/admission boundary: interrupted `repo_write` execution without a retained result, a later observed root terminal, reconcile, and next-Run refusal with zero additional write/check. Preserve the positive retained-result/delivery-unknown case. A state-helper regression alone is not sufficient for the return's final proof.

The smallest safe correction may simply retain the execution fence when no authoritative local effect result exists. A general recovery framework or new mutating recovery endpoint is not required. Preserve reviewed C/D/E ancestors; no standalone merge of the intermediate C schema is requested.

## Seven author questions — parent disposition

| Question | Decision |
|---|---|
| 1. Exact results in existing ArtifactHistory, Store-owned receipt/hash/length | **Adjust/adopt this storage placement.** It reuses the established content-addressed payload owner and avoids duplicating large bytes in whole-file state rewrites. Store still owns the receipt, budget reservation and result-before-submission ordering. Missing/mismatched payload cannot trigger re-execution; native termination cannot substitute for local effect proof. No second artifact-acceptance ledger is created. |
| 2. Refused attributable call sent as an error result; unusable call IDs not answered | **Adopt within scope.** Retain a bounded refusal without executing the tool. Never invent native IDs or expose arbitrary diagnostics. A notice for an unattributable call is not completion of that call. |
| 3. Retention/call-budget exhaustion leaves native action waiting | **Accept as an explicit fail-closed limit of this offline slice.** No eviction of unresolved history, unbudgeted result or automatic remote action to hide exhaustion. Preserve the liveness fence and truthful reason. This is not a complete live UX. |
| 4. How to end a known native root the Host cannot answer | **Select explicit human-requested cancellation of the exact known root as the future recovery direction.** It needs native/session/binding identity, durable intent and terminal confirmation. Do not automatically send a fabricated host_restarted result or perform this mutation inside read-only reconciliation. Register a later finite action; do not widen CDE-R1. |
| 5. Lost creation permanently fences that Chat | **Retain for this contract.** No automatic replacement create, guessed locator or claim that local abandonment stops an unknown remote session. A future explicit abandonment/correlation path needs its own remote-outcome and budget semantics. |
| 6. Add pinned SDK turns.retrieve/readTurn | **Adopt the read-only extension.** The installed7.15.0 SDK provides session-scoped turn retrieval; transport checks requested session/turn identity. Keep availability fixture-only and native root evidence distinct from Host effects. No SDK upgrade or live guarantee follows. |
| 7. Remote16KiB argument ceiling versus Pi4MiB write input | **Keep the approved16KiB ceiling.** Describe E as bounded scenario parity, not equal maximum file-write capability. Surface or declare the effective bound at later real exposure. Larger writes need a separately measured request/payload budget decision; do not raise the ceiling during this return. |

## Schema and release boundary

Only the final corrected E shape is a candidate for the first main schema19 adoption. Intermediate C's schema19 rootTurn shape lacks D's terminal field and is not a separately deployable milestone. Given the author's explicit test-temp-only use and absence of main/user migration, no extra version is required merely to release that intermediate shape; keep its fixtures/evidence honestly pinned and reject incompatible data without rewriting it. If any non-temporary C-created data is later discovered, stop adoption for an explicit compatibility decision.

Current main remains schema18; Core/bridge remain4/5. A rollback by restoring an old backup loses newer local records and does not undo native sessions/effects, so it is not a lossless recovery claim. The eventual schema19 merge must synchronize current entry points and use isolated data until its acceptance is complete.

The proposed reconciliation HTTP route, native-ID disclosure and live UI error/recovery surface remain separate owner proposals, not deployed routes. Cross-record validator completeness is an identified review limit without a reproduced additional blocker. No Core/Preview/M1 writer scope is transferred; no next lane, push/deploy or author-tree cleanup.

Copied reviewer text/probe output has only redundant final blank lines normalized; findings and probe values are unchanged.
