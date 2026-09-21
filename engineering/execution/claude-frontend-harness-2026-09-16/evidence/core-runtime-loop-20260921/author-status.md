# Core runtime loop C → D → E · author status

Author record for [the dispatch](../../core-runtime-loop-20260921.md). Author evidence only: nothing here is independent acceptance, a live Agents API result, formal Work acceptance or product browser support. Codex reviews each fixed milestone and alone merges main.

| | |
|---|---|
| Branch / worktree | `codex/core-runtime-loop-20260921` · `Projects/.worktrees/courtwork-core-runtime-loop-20260921` |
| Base | `3022b5c` (observed main at pickup `ef6b267`; not merged in) |
| Writer | one authenticated Claude/Fable desktop session (the dispatched background session `1e0858d6` was stopped before any model work; see the [C0 note](c0-implementation-note.md)) |
| Current stage | C `eec2244` and **D complete (offline)** → E next |
| Running jobs | none owned between milestones; tests use OS-assigned loopback ports and `mkdtemp` data only |

## Claimed files

Product: `app/server/store.mjs`, `app/server/remote-action-state.mjs` (new), `app/server/service.mjs`, `app/server/runtime.mjs`, `app/runtime/agents-host-gateway.mjs` (new), `app/runtime/openai-agents-transport.mjs`, `app/runtime/agents-api-adapter.mjs`. Isolated cross-layer hunks: `app/server/index.mjs` (threads `runtimePort` to `createRuntime`), `app/tests/helpers.mjs` (`boot({ runtimePort })`).

Tests/fixtures: `app/tests/p03c-host-consumer.test.mjs`, `app/tests/p03d-host-recovery.test.mjs`, `app/tests/schema19-upgrade.test.mjs`, `app/tests/fixtures/agents-api-loopback.mjs`, `app/tests/fixtures/agents-host-harness.mjs` (new); `spawnWorker({ prelude, serverOptions })` in `app/tests/helpers.mjs` so a killable child Host can take an injected runtime port; additions to `drt03-agents-transport.test.mjs` and `drt03-agents-api-protocol.test.mjs`; current-pointer schema pins (18 → 19) and old-state fabrications in 18 existing test files. No historical fixture bytes changed.

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
