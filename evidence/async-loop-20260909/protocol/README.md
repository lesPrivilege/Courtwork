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

The observed path is `MCPManager.connect()` → pinned `Client`/`StreamableHTTPClientTransport` → `MCPManager.toolsFor(...).execute()` → `client.callTool()`.  The server is a local HTTP loopback in [the focused test](../../../app/tests/async-protocol.test.mjs); no provider account, credential, external MCP server, or model is invoked.

The client is pinned to modern `2026-07-28` mode by the existing manager. The loopback advertises `tasks` and each relevant tool advertises `execution.taskSupport: "optional"`; this demonstrates what the installed client and current host do with task-shaped replies, not that the remote task protocol is implemented end-to-end.

## Result by stage

| Stage | Status | Actual observation |
| --- | --- | --- |
| Serializer | tested | The last outbound JSON-RPC message is `tools/call`, with `name: "sync"`, `arguments: {"document":"A"}`, and the installed v2 modern `_meta` envelope for `2026-07-28`, client info, and client capabilities. The ordinary synchronous text result returns through the current adapter. |
| Parser | tested | A normal `{resultType:"complete",content:[...]}` is accepted. Both the modern task-shaped `resultType:"accepted"` fixture and the older `{task:...}` fixture are rejected by the client/adapter path and surfaced by the manager as `MCP result is unknown; remote effects may have occurred. Do not retry automatically.` |
| Current adapter loop | tested, bounded | The current `toolsFor().execute()` path maps an accepted synchronous reply into Pi-tool-shaped `{content,details}`. It does not return a task handle or a continuation capability. This is a transport/adapter result only; no Pi `AgentSession`, model, or product Run was started. |
| Continuation | unsupported | The connected Client v2 instance has no `getTask` or `cancelTask` method, and the observed requests contain no `tasks/get` or `tasks/cancel`. `MCPManager` has no stored task identity, polling, delivery, or restart contract. Native MCP async continuation is therefore not tested and must not be inferred. |

The Pi 0.85.1 packages are locked in the probe environment, but an AgentSession/provider loop was intentionally not run: a local loopback serialization test cannot establish model-native async scheduling.

## Required negative cases

- The partial-arguments fixture is `{}` against a discovered tool whose `document` field is required. The installed client serializes those partial arguments unchanged to `tools/call`; the task-shaped reply then becomes the existing unknown-effect error. It is not a successful completed tool result, but the remote endpoint has already received it. A future dispatch seam must validate full authorized input before remote dispatch rather than regarding the rejection as protection.
- The cancellation receipt fixture has a valid synchronous `complete` result plus a cancelled task object. The current manager returns only the text `content` and static `details`; it drops the receipt task object.
- The unknown-async-fields fixture has valid synchronous content plus `async` and `deliveryState`. The current manager accepts the reply and drops both fields. This is an explicit incompatibility finding, not compatibility: async fields must be rejected/preserved and governed by A0/A1 before any task capability is claimed.

## Reproduction

```sh
cd app
npm ci --ignore-scripts
node --test tests/async-protocol.test.mjs
```

Observed focused result: 3 tests passed, 0 failed. `git diff --check` also passed. The test fixtures are under `app/tests/fixtures/async-protocol/` and deliberately contain no provider or personal data.

## Production gap for Astra

No production seam was changed. `app/runtime/mcp-manager.mjs` currently calls `entry.client.callTool({ name, arguments }, ...)`, converts only text/image (or `structuredContent`) into a Pi tool result, and calls `onUnknown` for every unreported client failure. It has no task-handle parser/store, input-completeness gate, cancel/get API, result/delivery state preservation, or continuation/recovery boundary. A0 must freeze those ownership and settlement semantics; A1 must add the narrow product seam if MCP task support is selected. This probe does not authorize a shim, polling loop, replay, or native-model claim.
