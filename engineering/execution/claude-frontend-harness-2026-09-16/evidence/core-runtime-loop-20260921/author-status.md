# Core runtime loop C → D → E · author status

Author record for [the dispatch](../../core-runtime-loop-20260921.md). Author evidence only: nothing here is independent acceptance, a live Agents API result, formal Work acceptance or product browser support. Codex reviews each fixed milestone and alone merges main.

| | |
|---|---|
| Branch / worktree | `codex/core-runtime-loop-20260921` · `Projects/.worktrees/courtwork-core-runtime-loop-20260921` |
| Base | `3022b5c` (observed main at pickup `ef6b267`; not merged in) |
| Writer | one authenticated Claude/Fable desktop session (the dispatched background session `1e0858d6` was stopped before any model work; see the [C0 note](c0-implementation-note.md)) |
| Current stage | **C, D and E complete (offline). Author loop stopped; writer released.** See [final handoff](#e--checks-and-final-handoff) |
| Running jobs | none owned between milestones; tests use OS-assigned loopback ports and `mkdtemp` data only |

## Claimed files

Product: `app/server/store.mjs`, `app/server/remote-action-state.mjs` (new), `app/server/service.mjs`, `app/server/runtime.mjs`, `app/runtime/agents-host-gateway.mjs` (new), `app/runtime/openai-agents-transport.mjs`, `app/runtime/agents-api-adapter.mjs`. Isolated cross-layer hunks: `app/server/index.mjs` (threads `runtimePort` to `createRuntime`), `app/tests/helpers.mjs` (`boot({ runtimePort })`).

Tests/fixtures: `app/tests/p03c-host-consumer.test.mjs`, `app/tests/p03d-host-recovery.test.mjs`, `app/tests/p03e-write-check-parity.test.mjs`, `app/tests/schema19-upgrade.test.mjs`, `app/tests/fixtures/agents-api-loopback.mjs`, `app/tests/fixtures/agents-host-harness.mjs` (new); `spawnWorker({ prelude, serverOptions })` in `app/tests/helpers.mjs` so a killable child Host can take an injected runtime port; additions to `drt03-agents-transport.test.mjs` and `drt03-agents-api-protocol.test.mjs`; current-pointer schema pins (18 → 19) and old-state fabrications in 18 existing test files. No historical fixture bytes changed.

Current entry points synchronized for schema 19: `app/README.md`, `AGENTS.md`, `engineering/architecture.md`, `app/docs/repository-binding.md`. Root `README.md` / `README.zh-CN.md` carry no RuntimeStore schema pointer — not applicable. Support lists, media manifest, install source, paper pin, release state — not applicable (no capability is exposed).

Not touched: `app/web/**`, 06d files, shell/browser packages, Settings, provider configuration, Pi/Hermes configuration, Work Core/bridge schema, `engineering/current.md`, integration/acceptance records.

## Source references consumed

Contract and index as linked from the C0 note; pinned SDK types under `app/node_modules/openai/resources/beta/agents/` (`AgentToolConfigParamFunction`, `SessionRequiredActionResourceFunctionCall`, `SessionCreateParams.agent.tools`); owners `repository-tools.mjs` (`repo_read`), `control-tools.mjs` (`governTools`), `artifact-history.mjs`, store precedents `repositoryWriteEffects` / `operations`. Three bounded Sonnet source maps (store/migration, service run path, write/check owners) were read-only.

## C · checks

Production path exercised: `startServer` → HTTP routes → `RuntimeService.#createRun/#executeRun` → `RuntimeStore` 19 → `agents-host-gateway` → `agents-api-adapter` → `openai-agents-transport` → unmodified `openai@7.15.0` → loopback sockets; governed `repo_read` through `governTools` + `createRepositoryTools` against a disposable synthetic repository; retained bytes in `ArtifactHistory`.

| Check | Result |
|---|---|
| `tests/p03c-host-consumer.test.mjs` | 10/10 — see the [C evidence](c-evidence.md) for the case-to-contract map |
| `tests/schema19-upgrade.test.mjs` | 4/4 — upgrade once + exact backup; occupied backup path, malformed legacy input, newer schema; malformed remote ledger; the actual schema-18 Host (`3022b5c`) refuses 19 and opens the backup |
| `tests/drt03-agents-transport.test.mjs`, `tests/drt03-agents-api-protocol.test.mjs` | 21/21 incl. declaration forwarding and `attachSession` |
| schema-pin owners (18 files) + `pi-runtime-port` + `architecture-boundaries` | pass after pin update |
| `npm --prefix app test` (Node 25.9.0, concurrency 4) | 1402/1402, exit 0, 252 s. The run started before the `resolution` field was added to the remote-action records; after that edit the remote and schema suites were re-run (`p03c-host-consumer`, `schema19-upgrade`, `schema18-upgrade`: 15/15). The full suite is not repeated for C; D's closing run covers the final tree |
| `node tools/check-doc-links.mjs` | 8,802 links checked, 0 problems |

Not executed: any live/paid provider, browser, the runtime smoke and product check (no UI or default-path change beyond the schema number), independent review.

## D · checks

Source `eec2244` + D. Additions and the 19-row fault matrix are in [the D record](d-fault-matrix.md).

| Check | Result |
|---|---|
| `tests/p03d-host-recovery.test.mjs` | 15/15, run three times in a row with the C suite without a flake; includes two real `SIGKILL` process cases |
| `tests/p03c-host-consumer.test.mjs` | 10/10 under D (the revoked-scope case was corrected, see [C evidence](c-evidence.md)) |
| `tests/drt03-agents-transport.test.mjs`, `tests/drt03-agents-api-protocol.test.mjs` | 22/22 incl. `getTurn` / `readTurn` |
| `tests/schema19-upgrade.test.mjs`, `tests/durability.test.mjs` (uses the extended `spawnWorker`) | pass |
| `npm --prefix app test` (Node 25.9.0, concurrency 4) | 1418/1418, exit 0, 256 s, on an unchanged tree. Two edits followed it — `abort()` can no longer reject, and the C revoked-scope test/evidence correction — after which the C and D suites were re-run: 25/25 |
| `node tools/check-doc-links.mjs` | 0 problems |

Not executed: live/paid provider, browser, runtime smoke, product check, independent review.

## E · checks and final handoff

E's only product change is the transport allowlist (`repo_read`, `repo_write`, `check_run`); see [the parity evidence](e-parity-evidence.md).

| Check | Result |
|---|---|
| `tests/p03e-write-check-parity.test.mjs` | 3/3, 22 s, clean exit: write → approval → fixed check, diff/effects/reopen, deny, stale, cancel, unknown, revoked — normalized Host transcripts `deepEqual` between the unchanged Pi baseline and the remote consumer; plus the remote-only receipts and the 16 KiB argument ceiling |
| `npm --prefix app test` (Node 25.9.0, concurrency 4) | **1421/1421, exit 0, 265 s, on the final tree, unchanged during the run** |
| `node tools/check-doc-links.mjs` | 0 problems |
| Harness defect found and fixed in E | the shared test `closeAll` called `.catch` on a non-promise when a Host had no loopback, aborting cleanup and leaving Hosts open; it never occurred in C/D (every Host there has a loopback). Test-only; no product effect |

### Final handoff

| | |
|---|---|
| Commits on `codex/core-runtime-loop-20260921` (base `3022b5c`) | **C** `eec2244` · **D** `37a14a5` · **E** `2978f5a` (this line was added by the docs-only commit after it) · **CDE-R1 return**: the commit after `45ae12e` |
| Production paths exercised | `startServer` → `/api/v5` routes → `RuntimeService` (`#createRun`, `#executeRun`, `cancelRun`, `answerQuestion`, `changeRepositoryBinding`, `changeRepositoryCandidate`, `reconcileRemoteSession`) → `RuntimeStore` 19 (+ 18→19 migration, restart fences) → `agents-host-gateway` → `agents-api-adapter` → `openai-agents-transport` → unmodified `openai@7.15.0` over loopback sockets; existing governed `repo_read`, `repo_write`, `check_run` via `governTools`; `ArtifactHistory`; real child-process `SIGKILL` + reopen |
| Author evidence | everything in this directory. **Independent evidence: none.** Codex reviews each fixed milestone and alone merges main |
| Not claimed | the account-authorized live C milestone; any live Agents API behaviour; formal Work acceptance; product browser support; capability exposure (every Agents capability row still resolves `unavailable`) |
| Retained unknowns | listed in [C](c-evidence.md#retained-unknowns), [D](d-fault-matrix.md#retained-unknowns-and-limits) and [E](e-parity-evidence.md#parity-gap-returned-to-astra) |
| Migration | 18 → 19 is additive, validated before and after, with the exact original bytes kept as `runtime-state.schema18.<sha256>.json`. The `rootTurn.terminal` field arrived in D: a state file written by commit C that holds an associated root turn does not validate under D/E (test temp data only) |
| Rollback limits | a schema-19 data directory cannot be opened by a schema-18 Host (it refuses without writing — tested against `3022b5c`). Roll back by restoring the exact backup file; remote records written since are lost with it, and native sessions created meanwhile are orphaned on the service. No user data was migrated by this work |
| Owned processes / ports / data | none running. Every test used OS-assigned loopback ports and `mkdtemp` directories; no paid call, no credential lookup, no user Host touched |
| Preserved for integration | branch, worktree, and all untracked/ignored content (`app/node_modules`, etc.) left as they are. No push, deployment, cleanup deletion or Host restart |
| Writer | released. Returns are incorporated on this same branch without rewriting the three milestone commits |

## Return CDE-R1 (parent review 2026-09-22) — adopted

Finding: a call with `execution:"unknown"`, `result:null` could receive a `root_terminal` resolution through `resolveRemoteActions`, after which `remoteActionUnresolved` was false and the chat's next Run was admitted while the local effect was still uncertain; `reconcileRemoteSession` queued exactly that resolution for every unresolved record of an ended root. Disposition: **adopt**, root cause confirmed in `remote-action-state.mjs` (the predicate treated execution-unknown and delivery-unknown alike) and `service.mjs` (resolution selection did not distinguish them).

Correction, on this branch after `45ae12e`, reviewed ancestors untouched:

- `remoteActionUnresolved`: a call with no retained result is unresolved, whatever else is on it. A call with a retained result is unresolved only while delivery is `pending`, or `unknown` without a resolution.
- `resolveRemoteActions` refuses `root_terminal`/`native_item` for a call with no retained result (`REMOTE_RESOLUTION_INVALID`); paired propagation cannot reach such a call because it never has a delivery intent, and `append` now requires a retained result as well.
- Validator: a `resolution` is valid only on a delivery-unknown call **with** a retained result (or an unknown intent).
- `reconcileRemoteSession` skips such calls and reports them `local_effect_unknown`; it still records the root ending (remote liveness) and still resolves retained-result/delivery-unknown records, which stay historical `unknown` receipts.
- No fabricated result, no eviction, no new mutating endpoint.

Evidence: fault-matrix row 20 / test *CDE-R1: a repo_write whose execution was interrupted without a retained result…* drives the production path — candidate bound, `repo_write` claimed and waiting for approval, Host reopened from the crash state, native root turn ended outside the Host, `reconcileRemoteSession` → root ending recorded, call `local_effect_unknown`, `resolution` null, store refuses the native resolution directly, next Run `409 remote_unreconciled`, zero write effects / write or check events / requests, candidate file absent. The positive case (*a lost submission reply is never re-sent…*) still resolves both the claim and its intent by `root_terminal`. Targeted: `p03c` 10, `p03d` 16, `p03e` 3, `schema19-upgrade` 4 → 33/33. `npm --prefix app test` (Node 25.9.0, concurrency 4): the first run on this tree ended 1419/1422 exit 1 in 749 s — three `run-lineage` tests (Pi-only, fake provider, no remote code) failed on `ECONNRESET` against the test's own loopback fetch and one 446 s `pollRun`; the suite alone then passed 9/9 in 148 s and a second full run on the byte-identical tree passed **1422/1422, exit 0, 262 s**. Both runs are stated; the first is read as host contention, not a defect, and no test was changed to make it pass. `node tools/check-doc-links.mjs` 0 problems.

Seven-question dispositions received and reflected: 1, 2, 6 adopted as built; 3, 5 accepted as explicit limits; 4 registered as a later finite action (human-requested cancel of the exact known root), not widened here; 7 kept, E reworded as bounded scenario parity.

## Frontend / route contract gaps (owner proposals, no 06d edit)

1. `RuntimeService.reconcileRemoteSession(sessionId)` has no HTTP route. Proposal: `POST /api/v5/sessions/:id/remote-reconciliation` returning `{ resolved, settledRuns, unresolved, unsettledRuns }`; the surface shows why a chat is fenced (`remote_unreconciled`) and offers this one read-only action.
2. New Run error codes a surface may meet: `remote_*_unknown`, `remote_cancellation_unconfirmed`, `remote_recovery_failed`, `remote_contradictory_terminal`, `remote_stream_closed_before_terminal`, and admission refusals `runtime_mismatch`, `remote_unreconciled`, `remote_binding_mismatch`, `remote_binding_changed`, `remote_action_history_full`. New notices: `remote_stream_recovering`, `remote_call_rejected`, `remote_call_conflict`, `remote_call_unattributable`.
3. `GET /sessions/:id` now carries `remoteBinding` (no secret; native session id included) and Runs carry `remoteBinding`. `remoteActions` is not projected. Whether the native id should be projected at all is the surface owner's call.

## Open decisions for Astra (none blocking E)

1. Result bytes are retained in the existing `ArtifactHistory`, bound from the claim by digest + length (the write-payload and MCP-result precedent), rather than inside `runtime-state.json`, which is rewritten whole on every mutation. The claim remains the RuntimeStore-owned receipt. Alternative if rejected: inline base64 in the claim with a much smaller aggregate ceiling.
2. A refusal (`rejected`) is delivered to the service as an error result so the native turn is not left waiting; a call the Host cannot attribute at all (no usable turn/call id) is only noticed and never answered.
3. `REMOTE_CALL_LIMIT` / retention exhaustion fails the Run without answering the native call; the native session is then left in `requires_action`. No eviction exists.
4. **Ending a native turn the Host will never answer.** After a restart or a refused/lost delivery the native turn waits in `requires_action` and the chat stays fenced until that turn ends by other means (D rows 15, 17, 18). Options: (a) an explicit, human-triggered cancel of a known root turn outside any Run, confirmed by `turns.retrieve`; (b) delivering a `host_restarted` error result for a call that is still listed as required; (c) leave as is. Both (a) and (b) are new remote mutations in recovery, so neither was implemented.
5. **A `create` that was lost fences its chat for good** (contract). An explicit "abandon this chat's remote runtime" is a product decision, not taken here.
6. The decisive read `turns.retrieve` was added to the accepted transport/adapter as a read-only extension and the capability row moved to `supported`/`fixture`. If Astra prefers recovery limited to subscribe/buffer/read/merge, rows 2, 5, 13 and 15 degrade to "unknown until a stream happens to replay the terminal".
7. **16 KiB argument ceiling vs `repo_write`.** The contract's bound refuses a remote write larger than 16 KiB of JSON arguments before approval; Pi accepts 4 MiB. See [E](e-parity-evidence.md#parity-gap-returned-to-astra).
