# Local CLI and Agent Runtime Precedents

**Lookup date:** 2026-09-20. **Scope:** bounded first-party source review for the local-runtime adapter and heterogeneous-child seam. Sources below were read as documentation or source at the stated pin; no provider, agent process, gateway, credential store, or paid API was run. “Adopt” is a CW design input only; it is not capability acceptance.

## 1. Pi: JSONL RPC and bounded child processes

**Pin:** Pi v0.85.1, commit `d981de1229ef899957bbe968bc8dcda02a21f477`.

Sources: [RPC](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/rpc.md), [extensions](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/extensions.md), and the pinned [subagent example](https://raw.githubusercontent.com/earendil-works/pi/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/examples/extensions/subagent/index.ts).

The RPC mode is a headless JSONL protocol over stdin/stdout. Commands are one JSON object per line; request IDs correlate responses, while asynchronous events describe the agent stream. The documented commands include prompt, steer, follow-up, abort, queue clearing, session creation/switching/forking, and state inspection. A prompt response means accepted or queued, not completed: later failure or completion is carried by the event stream. Steer waits until the current tool-call sequence is over; follow-up waits for the current turn to finish; abort waits for idle. The protocol has an explicit JSONL newline requirement, which matters for a robust subprocess adapter.

The subagent extension starts a separate `pi` process per child with `--mode json -p --no-session`, `shell:false`, an explicit cwd, pipes stdout/stderr, parses JSON lines, and records exit code, usage, stop reason, errors, and messages. It bounds parallel work at eight children and local concurrency at four, stops a failed chain, and propagates cancellation with SIGTERM followed by a five-second SIGKILL fallback. Because the example uses `--no-session`, it is an isolated one-shot child pattern, not durable child recovery.

**Adopt:** use Pi as the reference for a local JSONL adapter: request/event separation, correlation IDs, explicit accepted/terminal states, cancellation, exit/error mapping, and a session control surface. Keep stable CW child identity and recovery records in the existing Host/coordination owner.  
**Adjust:** retain per-child cwd, tool/capability scope, budget and runtime revision in the adapter request; bound fan-out and make cancellation observable.  
**Do not adopt as a universal ABI:** Pi extensions run with full system permissions and can execute arbitrary code. They are trusted runtime extensions, not portable Kit content or a sandbox. No Pi process was run in this pass.

## 2. Hermes: full transport boundary, with a clear owner-process limit

**Pin:** Hermes v0.21.3 / release v2026.9.14, commit `345cd2b057a452236de401d3534b8502a7465e8d`.

Sources: [programmatic integration](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/website/docs/developer-guide/programmatic-integration.md), [delegation](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/website/docs/user-guide/features/delegation.md), and [sessions](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/website/docs/user-guide/sessions.md).

The same `AIAgent` core is exposed through ACP JSON-RPC over stdio, a TUI gateway JSON-RPC interface over stdio/WebSocket, and an HTTP/SSE API. The gateway/ACP surfaces include session creation, streaming, approvals, steering, interruption, fork, and authentication. The API server is useful for HTTP compatibility, but it is not a substitute for the richer session and approval transport.

Hermes delegation gives a child fresh context, its own terminal/tool state, optional structured output, and only a final summary in the parent context. Background delivery has at-least-once crash/restart behavior: a child running across owner restart becomes `unknown`; a result completed before restart can be restored and routed when delivery is recovered. Closing or resetting the owner cancels active children. Hermes sessions are persisted in its own SQLite state store, but this does not transfer ownership to CW.

**Adopt:** use Hermes ACP or gateway when an Attention runtime needs session events, approvals, steering, and reconnect behavior. Preserve runtime session IDs, approval/request IDs, queue admission, terminal state, and pending delivery in the Host adapter.  
**Adjust:** treat Hermes’s owner-process and restart boundary as explicit. Recovery records belong in the existing CW Host/coordination owner; Hermes persistence is runtime evidence, not the CW ledger.  
**Do not adopt:** a blind `hermes` shell command as an orchestra protocol, or a generic `hermes --mode rpc` claim. The docs expose named transports, not that CLI mode. No Hermes runtime was run.

## 3. DeepSeek Harness and ACP: identity and capability preflight

**DSH pin:** dsh-v0.1.6-alpha.2, commit `ddefc45fbc7f8e46dd73185e68295696d1297887`. Source: [subagent seam](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/subsystems/subagent.md).

DSH keeps subagents outside the core loop behind a named provider registry. The source lists in-process, ACP, Codex, Claude Code, and DSH SDK providers. Before start, requested capabilities are preflighted; unsupported requests return a typed `UNSUPPORTED_CAPABILITY` instead of being accepted and ignored. A continuable child has a durable Session and at most one process-local Activation. A descriptor records provider, child mode/label, model/reasoning options, persona, and tool filter; direct-parent authorization governs send and interrupt. Cold resume is owned by the continuation manager, while the provider returns a creation specification rather than owning CW lifecycle.

The pin is alpha source evidence, not production reliability or real cross-provider execution.

**Adopt:** name runtime providers, preflight capability support, persist child identity/descriptor, separate durable child state from a live activation, and return typed admission failures. This is the clearest precedent for retaining external-agent identity instead of wrapping a shell command.  
**Adjust:** Host grants still govern execution. Runtime support is revision-specific; provider/model metadata describes model capability but does not grant authority.

**ACP v1:** the [protocol overview](https://agentclientprotocol.com/protocol/v1/overview) defines JSON-RPC initialization/version and capability negotiation, optional authentication, `session/new` or optional `session/load`, prompt/update/cancel flow, and permission requests. The client owns environment, user interaction, and resource access. ACP itself does not guarantee durable persistence, recovery, identity ownership, or sandboxing: `session/load` is capability-dependent.

**Adopt:** use ACP handshake, capability negotiation, request IDs, permission request/response, and session load only when the adapter has verified those capabilities.  
**Do not infer:** ACP support alone is a recovery or authorization guarantee. Absence of `loadSession` must remain an explicit no-recovery or unknown boundary.

## 4. Claude Code and OpenCode: choose the integration surface deliberately

**Claude Code / Agent SDK:** official docs and source read 2026-09-20; package/CLI version was not fixed in this pass. Sources: [CLI usage](https://docs.anthropic.com/en/docs/claude-code/cli-usage), [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview), [sessions](https://code.claude.com/docs/en/agent-sdk/sessions), [streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode), [permissions](https://code.claude.com/docs/en/agent-sdk/permissions), [user input/canUseTool](https://code.claude.com/docs/en/agent-sdk/user-input), and the Python SDK's [subprocess transport](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/_internal/transport/subprocess_cli.py).

The headless CLI supports `-p`, `stream-json` input/output, `--resume`, tool allow/deny lists, permission modes, and max-turn limits. The Agent SDK API and its orchestration/control plane run in the caller's Python/TypeScript process, but the default transport starts a Claude Code CLI subprocess and exchanges messages with it over the process transport; the maintained Python source names this `SubprocessCLITransport`. Thus the SDK is an in-process orchestration API around a child Claude Code runtime, not evidence that the Claude Code runtime loop is embedded in CW. It supports streaming input, session IDs, resume and fork, session persistence/session stores, hooks, subagents, and `canUseTool`. `canUseTool` can allow, deny, or modify an input and may remain pending; auto-approved calls skip it, so a universal gate needs a restrictive configuration plus a PreToolUse hook. The SDK docs also warn against assuming unauthorized claude.ai login or subscription/rate-limit access for third-party applications.

**Adopt:** use the SDK when CW can own both the SDK host process and its Claude Code child process, including hooks, session store, and permission boundary. Use the CLI directly with `-p --output-format json` or `stream-json` where a separate language/process is required, while capturing session IDs, correlating result/error events, enforcing tool policy, and preserving resume state. A custom SDK transport exists in source, but no pure in-process Claude runtime was verified.  
**Do not infer:** a CLI stream is a Host recovery contract, or `canUseTool` alone is an unavoidable gate. No Claude process or subscription path was tested.

**OpenCode:** current official docs read 2026-09-20; the embedded page is explicitly the V2 docs surface, but no exact V2 package/commit pin was established. Sources: [server](https://dev.opencode.ai/docs/server/), [embedded SDK](https://opencode.ai/v2/docs/build/sdk), and the [V1/V2 migration boundary](https://opencode.ai/v2/docs/migrate-v1). The migration page says V2 has breaking server/API-client contracts; the earlier ecosystem report's v1.18.31 source pin is separate and must not be conflated with this V2 SDK.

`opencode serve` exposes a local HTTP/OpenAPI server with sessions, messages, events/SSE, project/path and configuration endpoints. The embedded `@opencode/sdk` lets an owning app create the runtime in-process, create sessions, prompt, subscribe to events, use an AbortSignal, and close the runtime; worktree operations require project identity.

**Adopt:** embedded SDK for an app that owns the same process and lifecycle; server/client SDK for an explicitly isolated local runtime or network boundary.  
**Defer:** treating OpenCode’s sessions, permissions, provider auth, or plugins as the CW identity/authority/recovery contract. The docs establish runtime surfaces, not cross-runtime orchestra semantics, and no OpenCode runtime was run.

## CW boundary recorded from this pass

The minimum adapter evidence should preserve: Host child/work ID; runtime family and revision; runtime session/activation IDs; provider/model configuration; requested versus granted capabilities; permission/approval IDs; accepted, streaming, interrupted, failed, and terminal states; cancellation; and recovery/load support. A role or Kit can request capabilities and impose artifact or workflow constraints, but it cannot grant execution permission. A provider can declare model support, but it cannot grant execution authority. Runtime reuse means one versioned adapter with isolated per-instance session, grants, and budget state; it does not mean shared runtime instance state.

**Status:** source-only research. Adopt/adjust/defer decisions above are recommendations for Astra’s裁决, not implementation or acceptance. Unverified: live adapter behavior, real child execution, provider quality/access, subscription authorization, sandbox security, and recovery under process or machine failure.
