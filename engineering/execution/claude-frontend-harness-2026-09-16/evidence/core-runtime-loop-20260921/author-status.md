# Core runtime loop C → D → E · author status

Author record for [the dispatch](../../core-runtime-loop-20260921.md). Author evidence only: nothing here is independent acceptance, a live Agents API result, formal Work acceptance or product browser support. Codex reviews each fixed milestone and alone merges main.

| | |
|---|---|
| Branch / worktree | `codex/core-runtime-loop-20260921` · `Projects/.worktrees/courtwork-core-runtime-loop-20260921` |
| Base | `3022b5c` (observed main at pickup `ef6b267`; not merged in) |
| Writer | one authenticated Claude/Fable desktop session (the dispatched background session `1e0858d6` was stopped before any model work; see the [C0 note](c0-implementation-note.md)) |
| Current stage | **C complete (offline)** → D next |
| Running jobs | none owned between milestones; tests use OS-assigned loopback ports and `mkdtemp` data only |

## Claimed files

Product: `app/server/store.mjs`, `app/server/remote-action-state.mjs` (new), `app/server/service.mjs`, `app/server/runtime.mjs`, `app/runtime/agents-host-gateway.mjs` (new), `app/runtime/openai-agents-transport.mjs`, `app/runtime/agents-api-adapter.mjs`. Isolated cross-layer hunks: `app/server/index.mjs` (threads `runtimePort` to `createRuntime`), `app/tests/helpers.mjs` (`boot({ runtimePort })`).

Tests/fixtures: `app/tests/p03c-host-consumer.test.mjs`, `app/tests/schema19-upgrade.test.mjs`, `app/tests/fixtures/agents-api-loopback.mjs` (new); additions to `drt03-agents-transport.test.mjs` and `drt03-agents-api-protocol.test.mjs`; current-pointer schema pins (18 → 19) and old-state fabrications in 18 existing test files. No historical fixture bytes changed.

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

## Open decisions for Astra (none blocking D)

1. Result bytes are retained in the existing `ArtifactHistory`, bound from the claim by digest + length (the write-payload and MCP-result precedent), rather than inside `runtime-state.json`, which is rewritten whole on every mutation. The claim remains the RuntimeStore-owned receipt. Alternative if rejected: inline base64 in the claim with a much smaller aggregate ceiling.
2. A refusal (`rejected`) is delivered to the service as an error result so the native turn is not left waiting; a call the Host cannot attribute at all (no usable turn/call id) is only noticed and never answered.
3. `REMOTE_CALL_LIMIT` / retention exhaustion fails the Run without answering the native call; the native session is then left in `requires_action`. No eviction exists.
