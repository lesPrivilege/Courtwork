# AM-B-T1 — async protocol compatibility probe

Date: 2026-09-10.  Writer: Terra.  Base: `main@7c07ef6b5a19f0eb2c45b8894ab9911de87ea979`.  This delivery adds only the T1 loopback probe and its fixtures; it changes no product code, lockfile, or dependency.

## Locked inputs and actual call chain

`app/package-lock.json` locks `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, and `@earendil-works/pi-coding-agent` to `0.85.1`, and `@modelcontextprotocol/client` to `2.0.0`.  The isolated worktree installed those exact packages with `npm ci --ignore-scripts`.

| Item | Package/path | SHA-256 |
| --- | --- | --- |
| Host MCP adapter | `app/runtime/mcp-manager.mjs` | `bc1cb6ac420103f85ef8ebc713e248810cc7d4858de0e8b65a959e3e3e527ddd` |
| MCP Client v2 call/parser implementation | `app/node_modules/@modelcontextprotocol/client/dist/index.mjs` | `af3ec9fcf3a70fb4681e9b3c11aa18a7ce9aca36fed9f138a6e704043695d414` |
| MCP Client package manifest | `app/node_modules/@modelcontextprotocol/client/package.json` | `e82352cb01cda68e239b73ba7ca2065b3078fa9bb8d762e7cff04fcc5a141ccb` |
| Pi coding-agent package manifest | `app/node_modules/@earendil-works/pi-coding-agent/package.json` | `f1738e4b42203e5f22bcb513f13fb2fb224f1e98d1f129ff042f87048665a94c` |
| Pi AgentSession public provider seam | `app/node_modules/@earendil-works/pi-coding-agent/dist/core/sdk.js` | `6969bd56ba8e1628cd033bb15cb15fe38299f00b5ad84f4f8ef37a33a98681c9` |
| Pi OpenAI-completions encoder/parser | `app/node_modules/@earendil-works/pi-ai/dist/api/openai-completions.js` | `1e2097ced37cf0e21aa5711297eecc77916de8a4ed81a9019bc7d97b22825fa3` |

The observed MCP path is `MCPManager.connect()` → pinned `Client`/`StreamableHTTPClientTransport` → `MCPManager.toolsFor(...).execute()` → `client.callTool()`. The separate Pi path is `createSessionRun()` → Pi `AgentSession` → Pi's public OpenAI-completions model seam → a local HTTP loopback. Both are in [the focused test](../../../../app/tests/async-protocol.test.mjs). No provider account, credential, or external MCP server is invoked.

The MCP client is pinned to modern `2026-07-28` mode by the existing manager. The loopback advertises the current Tasks extension as `capabilities.extensions["io.modelcontextprotocol/tasks"]`; the client does **not** advertise that extension in the observed per-request client capabilities. The modern fixture follows the extension's polymorphic `resultType: "task"` form with Task fields inline. The old fixture retains the incompatible 2025-11-25 `{task: ...}` form. The modern cancellation fixture is the ack-only empty complete result. These facts distinguish current installed behavior from end-to-end task support.

## Result by stage

| Stage | Status | Actual observation |
| --- | --- | --- |
| Serializer | tested | The final MCP JSON-RPC message is `tools/call`, with `name: "sync"`, `arguments: {"document":"A"}`, and the installed v2 modern `_meta` envelope. The Pi 0.85.1 OpenAI-completions loopback also observes its final HTTP tool schema: the deliberately declared `async: true` marker is absent from the outgoing schema. |
| Parser | tested | A normal `{resultType:"complete",content:[...]}` is accepted. The valid modern inline `resultType:"task"` fixture and the incompatible old `{task:...}` fixture both become the manager's `MCP result is unknown; remote effects may have occurred. Do not retry automatically.` The Pi loopback sends one tool's JSON arguments in two SSE deltas; Pi invokes the tool only with the completed parsed `{document:"A"}` object. |
| Current adapter loop | tested, bounded | `toolsFor().execute()` maps an accepted synchronous reply into Pi-tool-shaped `{content,details}`. The Pi 0.85.1 AgentSession makes its second provider request only after the streamed tool call is complete and has executed. Neither observation creates a durable task handle or continuation capability. |
| Continuation | unsupported | The connected Client v2 instance has no `getTask` or `cancelTask` method, and the observed requests contain no `tasks/get` or `tasks/cancel`. `MCPManager` has no stored task identity, polling, delivery, or restart contract. Native MCP async continuation is therefore not tested and must not be inferred. |

The Pi 0.85.1 AgentSession/provider loop is exercised only against a local deterministic transport. It proves encoder/parser/ordinary tool-loop behavior, not model-native async scheduling, durable provider state, or recovery.

## Required negative cases

- The partial-arguments fixture is `{}` against a discovered tool whose `document` field is required. The installed client serializes those partial arguments unchanged to `tools/call`; the task-shaped reply then becomes the existing unknown-effect error. It is not a successful completed tool result, but the remote endpoint has already received it. A future dispatch seam must validate full authorized input before remote dispatch rather than regarding the rejection as protection.
- The modern cancellation fixture is the Tasks extension's ack-only empty complete result. The current manager never produces a `tasks/cancel` request, so cancellation remains unsupported rather than being represented as a completed cancellation.
- The separate malformed-async-fields fixture has synchronous content plus unsupported `async` and `deliveryState` fields. The current manager accepts the reply and drops both fields. This is an explicit incompatibility finding, not compatibility: async fields must be rejected/preserved and governed by A0/A1 before any task capability is claimed.

## Reproduction

```sh
cd app
npm ci --ignore-scripts
node --test tests/async-protocol.test.mjs
```

Observed focused result: 4 tests passed, 0 failed. `git diff --check` also passed. The test fixtures are under `app/tests/fixtures/async-protocol/` and deliberately contain no provider or personal data.

## Production gap for Astra

No production seam was changed. `app/runtime/mcp-manager.mjs` currently calls `entry.client.callTool({ name, arguments }, ...)`, converts only text/image (or `structuredContent`) into a Pi tool result, and calls `onUnknown` for every unreported client failure. It does not declare `io.modelcontextprotocol/tasks` as a client extension. It has no task-handle parser/store, input-completeness gate, cancel/get API, result/delivery state preservation, or continuation/recovery boundary. Pi's present OpenAI-completions encoder likewise omits an arbitrary declared `async` tool marker. A0 must freeze ownership and settlement semantics; A1 must add a narrow product seam only if MCP task support is selected. This probe does not authorize a shim, polling loop, replay, or native-model claim.
