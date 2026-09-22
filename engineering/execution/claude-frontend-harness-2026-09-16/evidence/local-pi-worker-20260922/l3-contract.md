# L3 existing Host consumer contract

Astra author, 2026-09-22. Implements the parent disposition in the [original order](../../local-pi-worker-loop-20260922.md). L0 `7ba5557`, L1 `92df65b`, L2 `316a2ea`; accepted CDE main `ca859a5` and final parent documents through `578d77d` are merged. No UI or Core/bridge changes.

## Responsibility and selection

`createRuntime({localPiWorker:true})` is an internal, explicit offline injection. It constructs the binding from **that Host's owned fake provider**, never an arbitrary supplied URL/key. Only Spark child Runs and the exact default fake provider/model are eligible; incompatible configuration refuses, with no fallback to the in-process Pi port. Normal Runs keep the original port. Run.adapterId is `pi-local-print`, Run.provider keeps the actual fake identity/model/endpoint. No HTTP runtime-selection or Settings entry is added.

`Subagents` still owns queue, attempt, source/grant checks, budgets, retained result publication and explicit consumption. `RuntimeService` still owns the real child Session/Run, cancellation and settlement. `RuntimeStore` remains the only state/event writer. ArtifactHistory retains packet/result bytes. The process adapter owns only private temporary configuration and attributed process observations. These cross-layer edits are required because current Run creation/settlement assumes the in-process port and current reconcile can remove an external-process unknown fence.

## Typed records, no second ledger

Reserve RuntimeStore20 solely for interpreting this event authority; Core4/bridge5 stay unchanged. Existing records are preserved, with exact schema19 backup before migration. Every local event is a normal existing Run event; `data` has common exact fields `{assignmentId,attempt,dispatchId}` where dispatchId is the CW Run ID. No worker-supplied receipt payload reaches Store.

At most one of each event per Run, ordered below. Exact duplicates replay the immutable receipt, conflicting duplicates refuse inside `_mutate`. Every mutation/load checks actual assignment→attempt→Session→Run, adapter identity and source/result references. No new terminal event can be appended after settlement. Generic append APIs refuse this reserved family; a narrow Host-only method owns it.

| Event | Additional strict fields and prerequisites |
|---|---|
| `local_pi.dispatch` | `binding:{adapter,executable,provider,model,baseUrl,configVersion}`, `packet:{sha256,bytes,sourceCount,sources,sourceRevisions}`. `adapter` is exact pinned L1 descriptor; provider/model match Run and owned loopback binding. Packet bytes are already retained in that child Session's ArtifactHistory. Sources equal the assignment's exact refs; material sourceRevisions capture observed latest revision, artifacts use null. Run is active/open and attempt is current. Await persistence **before spawn**. |
| `local_pi.spawn` | `pid` positive safe integer; dispatch exists and no prior spawn/terminal. PID is only a live-process observation; restart never kills from this number. Host awaits this write before supplying prompt stdin. |
| `local_pi.native` | `sessionId` observed from exactly one Pi session header; requires spawn. No guessed native locator or journal path. |
| `local_pi.result` | `sha256,bytes,packetSha256,nativeSessionId`; requires native observation and exact packet/native match. Nonempty <=32768 bytes are already retained/verified by ArtifactHistory. This means retained output, not assignment coverage or acceptance. |
| `local_pi.terminal` | `status,reason,process,nativeSessionId,settled,turns`; process is null for a proven setup/pre-spawn refusal, otherwise bounded `{pid,spawned,inputComplete,exitCode,signal,cancelled,timedOut,escalated,fault}`. Completed requires matching result/native, settled and clean exit. Cancellation requires observed owned-process close or proven pre-spawn cancellation; faults remain unknown. No terminal can invent missing result bytes. |

The process result is retained before `local_pi.result`; that precedes terminal-completed, assistant.message and Spark publication. Run events preserve a crash between those steps. Existing result references cross-check this receipt. Failure to persist after possible launch fences unknown and never repeats dispatch. No full native transcript or raw stderr is retained in authoritative events.

## State and recovery

`prepared attempt → real Run → durable dispatch → observed spawn/native → retained result → terminal → Run settlement → existing Spark publication`. `unknown` is terminal for the Run but remains a dispatch fence. A local Run with no decisive local terminal/result evidence cannot be reconciled merely because its Run ended. Existing reconcile/retry and child Run admission refuse unresolved local attempts; the serial child queue cannot launch another local process while one is unresolved. No new recovery endpoint or PID-based cleanup after restart.

Dispatch-before-spawn crash and spawn-before-receipt crash remain indistinguishable after restart and blocked. Known setup refusal with no spawn, observed no-tool cancellation after close, native failure and verified completion retain their supported classifications. `local_pi.result` without completed publication remains retained evidence but cannot auto-replay a model request. Duplicate command IDs replay the existing Run; they never launch again.

Source reads use existing `readSource(...,{record:false})` to assemble the approved packet and recheck policy/hash before dispatch and publication. Compare captured material latest revisions as well so a changed source cannot silently publish under the old freshness observation. These operations add **no** runtime `sourceReads`. Findings with supplied sources therefore remain `blocked/assigned_source_coverage_incomplete`, with truthful provided/unverified coverage text. Existing human source expansion and explicit read/adopt/reject/defer semantics remain. Empty-source assignments retain the existing vacuous coverage rule. No model result grants Work acceptance.

## Verification

Real service/HTTP, exact loopback subprocess and isolated reopen tests must cover retained result/hash/consumption, request replay, cancel, revoked source before dispatch/publication, dispatch/spawn crash windows, retained-before-publication and old reconcile/retry attempts. Strict state tests cover malformed/wrong-attempt/wrong-native/duplicate/out-of-order/mismatched-result receipts. Migration tests cover exact19 backup, repeat/occupied backup/malformed/newer refusal, remote/Pi records preserved and actual pinned19 Host rejecting20 without changing bytes. Process failure claims use real children, not only helper transitions. No paid provider, personal config/data, UI service restart, push or deployment.
