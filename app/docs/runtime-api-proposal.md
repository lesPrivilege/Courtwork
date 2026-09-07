> Historical author proposal, superseded by ../../docs/api-v5.md and ../../docs/framework-contract-v5.md in the combined source/evidence restore. This proposal is not the final HTTP ABI or implementation status. Preserved for provenance only.

# V5 runtime API proposal (bounded first slice)

日期：2026-09-06。本文只冻结 runtime/host/extension 的最小接缝，不实现 HTTP server、UI 或持久化 Core。真实 provider 调用预算为 0；执行路线只有显式注册的本地 `fake-openai-loopback`。fake 响应和 `realProvider: false` 必须进入事件与记录，不能称为真实模型结果。

契约依据是 [`docs/framework-contract-v5.md`](/private/tmp/se-agent-v5/docs/framework-contract-v5.md)。旧 `Projects/Schema Engineering` 只读；运行数据使用独立目录。宿主只加载编译时白名单中的本地可信 extension。没有用户配置、credential、`auth.json`、`models.json`、`.env` 或环境变量发现。

## 已核实的 Pi 最小 API

核查对象是 `/private/tmp/se-mvp-runtime-research/src/pi-0.83.0`，Pi `0.83.0` 的两个包：`@earendil-works/pi-agent-core` 和 `@earendil-works/pi-ai`。Node 要求为 `>=22.19.0`。这不是 `pi-coding-agent` 的默认 coding harness；本切片只使用通用 Agent loop、provider stream 和显式工具列表。

| 接缝 | 实际签名/行为 | 固定源码坐标 |
|---|---|---|
| Agent 构造 | `new Agent({ initialState?, streamFn, convertToLlm?, transformContext?, beforeToolCall?, afterToolCall?, ... })`；`streamFn` 是必需的显式 provider seam | `packages/agent/src/agent.ts:96-120,210-231` |
| 启动/续跑 | `agent.prompt(string\|AgentMessage\|AgentMessage[]) -> Promise<void>`；`agent.continue() -> Promise<void>` | `agent.ts:336-377` |
| 事件 | `agent.subscribe((event, signal) => void\|Promise<void>) -> unsubscribe`；事件 listener 按订阅顺序等待，`agent_end` 后才算 idle | `agent.ts:233-246,522-576` |
| 取消/收束 | `agent.abort() -> void`；`agent.waitForIdle() -> Promise<void>`；`agent.signal` 暴露当前 abort signal | `agent.ts:306-323` |
| 状态 | `agent.state` 提供 `systemPrompt`, `model`, `thinkingLevel`, `tools`, `messages`, `isStreaming`, `streamingMessage`, `pendingToolCalls`, `errorMessage` | `types.ts:327-352` |
| Agent loop | `runAgentLoop(prompts, context, config, emit, signal, streamFn) -> Promise<AgentMessage[]>`；`agentLoop(...) -> EventStream<AgentEvent, AgentMessage[]>` | `agent-loop.ts:31-53,95-118` |
| StreamFn | `(model, context, options?) -> AssistantMessageEventStream\|Promise<AssistantMessageEventStream>`；失败必须变成 stream 的 `error` 与 `stopReason: "error"\|"aborted"`，不能靠 rejected promise | `types.ts:18-32` |
| Provider registry | `createModels(options?) -> MutableModels`；`models.setProvider(provider)`；`models.streamSimple(model, context, options?) -> AssistantMessageEventStream` | `ai/src/models.ts:127-199,489-531` |
| Provider factory | `createProvider({id,name?,baseUrl?,headers?,auth,models,api}) -> Provider`；`api` 为一个 `ProviderStreams` 或按 `model.api` 分派的 map | `ai/src/models.ts:533-556,589-622` |
| Provider stream events | `start`, text/thinking/tool deltas，末端 `done` 或 `error`；`AssistantMessageEventStream.result()` 返回最终 `AssistantMessage` | `ai/src/types.ts:487-513`; `ai/src/utils/event-stream.ts:69-87` |

最小真实 loop 连接方式如下。`Models.streamSimple` 是 `AgentOptions.streamFn`，而不是绕过 Agent 直接调用 HTTP：

```ts
const models = createModels();
models.setProvider(fakeOpenAiLoopbackProvider);

const agent = new Agent({
  streamFn: (model, context, options) => models.streamSimple(model, context, options),
  initialState: {
    model: models.getModel("fake-openai-loopback", "fake-1")!,
    systemPrompt: "",
    messages: [],
    tools: modelVisibleTools,
    thinkingLevel: "off",
  },
});

const unsubscribe = agent.subscribe((event, signal) => hostAppendEvent(event, signal));
await agent.prompt(userText);
await agent.waitForIdle();
unsubscribe();
```

Pi loop 的实际事件是 `agent_start`, `turn_start`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `turn_end`, `agent_end`。`Agent` 会在 `message_end` 时把消息追加到自身 transcript；宿主仍必须把事件复制到自己的带 `seq` 的 run log，UI 不直接消费 SDK event。

## 本地 fake provider 方案

注册名固定为 `fake-openai-loopback`，模型为 `fake-1`，协议为 `openai-completions`。每次 Run 在 host 内生成一个 `127.0.0.1` ephemeral listener，并把显式生成的 `baseUrl` 写入该 Run 的 frozen snapshot。Fake server 只实现 `POST /v1/chat/completions`，返回 OpenAI-compatible SSE；不实现 `/models` discovery。测试可注入 `fetch`，但 endpoint 必须仍是 loopback，不能读网络或 proxy 配置。

推荐的 Pi provider 形状是：

```ts
const provider = createProvider({
  id: "fake-openai-loopback",
  name: "Fake OpenAI loopback",
  baseUrl,
  auth: {
    // 这是测试标记，不是 credential；不读取 env 或文件。
    apiKey: { name: "fake-local", resolve: async () => ({ auth: { apiKey: "fake-local" } }) },
  },
  models: [
    {
      id: "fake-1", name: "Fake 1", api: "openai-completions",
      provider: "fake-openai-loopback", baseUrl,
      reasoning: false, input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 4096, maxTokens: 256,
    },
  ],
  api: { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
});
```

Fake SSE 的成功末端映射为 `done`/`stop`；HTTP、JSON、SSE 或 abort 失败映射为 `error`/`aborted`。Fake provider 不应调用 `models.refresh()`, `getAvailable()` 或任何需要 ambient auth 的路径。未来真实 adapter 可以替换 provider 注册和 descriptor；host API、Run/event schema、extension ABI 不随 provider 改名。

已用相关临时工程中的已安装 `0.83.0` 包运行过无网络 Agent smoke：显式 `streamFn` + `fauxProvider` 产生 `agent_start → turn_start → user message_start/end → assistant message_update* → message_end → turn_end → agent_end`，最终 assistant `stop`。这证明实际 package surface 可用；HTTP fake 的 fixture 仍需在新 app 的 runtime 测试阶段运行。

## Host service：HTTP 消费的最小方法

以下是 host service 的内部 typed 方法；HTTP route 只是同源、loopback、内存 token 的薄包装。所有 JSON 请求都限长、拒绝未知字段；业务响应都带 host-owned ID。`provider`、`model`、`api`、`baseUrl` 是非秘密 descriptor，不能携带 key。

```ts
type Id = string; // host 生成的 UUIDv7/等价不透明 ID
type RunStatus =
  | "created" | "running" | "waiting_question"
  | "succeeded" | "failed" | "canceled" | "unknown";

interface Project {
  projectId: Id;
  name: string;
  createdAt: string;
}

interface Session {
  sessionId: Id;
  projectId: Id;
  title: string;
  draft: string;
  extensionBinding?: ExtensionBindingSnapshot;
  createdAt: string;
  updatedAt: string;
}

interface ProviderDescriptor {
  provider: string;
  model: string;
  api: string;
  baseUrl?: string;
  realProvider: false; // this first slice is fake-only
}

interface Run {
  runId: Id;
  sessionId: Id;
  status: RunStatus;
  admissionOpen: boolean;
  provider: ProviderDescriptor; // frozen copy, no secret
  toolAllowlist: string[];      // frozen copy
  extension?: ExtensionBindingSnapshot; // frozen copy
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

interface RuntimeService {
  createProject(input: { name: string }): Promise<Project>;
  createSession(input: {
    projectId: Id;
    title?: string;
    draft?: string;
    extensionBinding?: ExtensionBindingInput;
  }): Promise<Session>;
  createRun(input: {
    sessionId: Id;
    input: string;
    provider: ProviderDescriptor;
    toolAllowlist: string[];
    extensionBinding?: ExtensionBindingInput;
  }): Promise<Run>;
  events(input: { runId: Id; afterSeq?: number }): Promise<EventPage>;
  cancel(input: { runId: Id; reason?: string }): Promise<Run>;
  answerQuestion(input: {
    runId: Id;
    questionId: Id;
    answer: string;
  }): Promise<Question>;
}
```

The corresponding routes are:

| Method | Route | Semantics |
|---|---|---|
| `POST` | `/api/projects` | Create a project; response is `Project`. |
| `POST` | `/api/projects/:projectId/sessions` | Create a session with independent `draft` and history. |
| `POST` | `/api/sessions/:sessionId/runs` | Validate and freeze provider, extension binding and tool allowlist; create the Run, call extension `begin`, then start `Agent.prompt`. |
| `GET` | `/api/runs/:runId/events?afterSeq=n` | Return persisted events with `seq > n`; old/duplicate seq is ignored by consumers. |
| `POST` | `/api/runs/:runId/cancel` | Await durable extension admission close, then abort Agent, await idle, and finish as canceled. |
| `POST` | `/api/runs/:runId/questions/:questionId/answer` | One answer only; bind answer to `runId` and `questionId`. |

`POST /api/bootstrap` is the only token entry point. The token is held in same-origin memory, never in URL, logs or `localStorage`. Host/Origin checks, no CORS, `127.0.0.1` binding and single-user identity are transport requirements; they do not make arbitrary renderer code trusted.

Run creation rejects a second active Run for one session with `409`. It snapshots adapter ID/version, provider descriptor, extension ID/version, tool allowlist and extension-private binding before the first provider await. A provider/extension/session mutation while a Run is active is `409`. Persistence failure is an error response and cannot be reported as success.

## Event and status contract

```ts
type HostEvent = {
  runId: Id;
  sessionId: Id;
  seq: number;       // host-owned, strictly monotonic per run
  type:
    | "message/user"
    | "assistant/delta"
    | "assistant/final"
    | "tool/start"
    | "tool/update"
    | "tool/result"
    | "question/open"
    | "question/resolved"
    | "run/status"
    | "run/error";
  data: unknown;     // type-specific bounded JSON, no secret
};

interface EventPage {
  events: HostEvent[];
  nextSeq: number;
  done: boolean;
}
```

Mapping from Pi to host is deterministic: user `message_start/end` becomes one `message/user`; assistant `message_update` becomes `assistant/delta` with the current bounded text/tool state; assistant `message_end` becomes `assistant/final`; tool execution start/update/end map to the three tool events; `turn_end` is a runtime checkpoint; `agent_end` is followed by the host's final status write after `waitForIdle`. `stopReason: "stop"` is `succeeded`, `error` is `failed`, and `aborted` is `canceled` only when the host initiated cancellation. A late event after `admissionOpen=false` may be logged for diagnostics but cannot append history or submit a candidate.

The generic ask-user tool is host-owned. Its execution opens a `Question`, emits `question/open`, waits for one `answerQuestion` call, emits `question/resolved`, and returns a normal Pi `toolResult`. An answer for an expired, canceled, wrong-session, already-resolved or unknown question is `409/410`. Pending questions become `unknown` after restart; execution is never auto-resumed.

## Extension ABI draft

The extension owns its Core client and creates the Core Run during `begin`; the host does not pass `readSource` or `submitCandidate` closures into the extension. The host passes only the frozen runtime identity and provider descriptor. The extension returns the model-facing tools/context it created from its own trusted Core client.

```ts
interface ExtensionBindingInput {
  extensionId: string;
  version: string;
  binding: Record<string, unknown>; // bounded, validated, non-secret
}

interface ExtensionBindingSnapshot extends ExtensionBindingInput {
  bindingHash: string;
}

interface ExtensionBeginContext {
  projectId: Id;
  sessionId: Id;
  runId: Id;
  provider: ProviderDescriptor;
  binding: ExtensionBindingSnapshot;
  signal: AbortSignal;
}

interface ExtensionRun {
  /** Tools/context are returned by the extension's Core Run. */
  tools: readonly AgentTool[]; // first extension: read_source, submit_candidate only
  context?: { systemPrompt?: string; initialMessages?: AgentMessage[] };

  /**
   * Idempotent async close. The first operation gates candidate admission and
   * durably records admissionOpen=false; the promise resolves only after that
   * write is complete. It then performs extension cleanup.
   */
  close(reason: "cancel" | "session_closed" | "reload"): Promise<void>;

  /** Called once after Agent.waitForIdle; writes extension outcome, never human acceptance. */
  finish(result: {
    status: "succeeded" | "failed" | "canceled" | "unknown";
    candidateRefs?: string[];
    errorCode?: string;
  }): Promise<void>;
}

interface TrustedExtension {
  id: string;
  version: string;
  begin(context: ExtensionBeginContext): Promise<ExtensionRun>;
}
```

The host cancellation sequence is fixed:

```ts
await extensionRun.close("cancel"); // admission gate + durable write first
agent.abort();                       // only after close resolves
await agent.waitForIdle();           // includes awaited agent_end listeners
await extensionRun.finish({ status: "canceled" });
```

If durable admission close fails, the host returns an error/`unknown` outcome and does not claim cancellation or completion. `close` and `finish` are idempotent at the host boundary; a different extension version cannot mutate an old Run's candidate or formal state. `finish` is not a Review decision: only a host-authenticated human route may accept/reject a candidate.

The extension's Core Run may expose only these model closures:

```ts
interface ExtensionCoreRun {
  read_source(input: { sourceId: Id; revision?: string }): Promise<SourceView>;
  submit_candidate(input: CandidateProposal): Promise<CandidateRef>;
}
```

The extension validates binding/version/anchor data before `submit_candidate`; host admission and Core version checks are authoritative. The model cannot call `humanAction`, accept a candidate, change permissions, publish, access the provider key, access the database directly, run shell, or perform arbitrary network/file I/O. Chat action cards and the right renderer must call the same host human route, where actor identity is derived from host session identity rather than a client-supplied actor field.

## Dependency-lock evidence and next implementation boundary

Pi's source `package-lock.json` is lockfile v3 with SHA-256 `94dc20758b1bbde6d0fc0ac3a41f1945eb4309165419b41c5892ea75c7b0ecdb`. It resolves both Pi packages to `0.83.0`. The exact direct package dependencies and source hashes are recorded in [`engineering/mvp/execution/provider-strategy-v4.md`](/Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema%20Engineering/engineering/mvp/execution/provider-strategy-v4.md#fresh-luna-v5-runtime-source-lock-2026-09-06). The offline command below returned `up to date` and did not contact a registry:

```text
npm --prefix /private/tmp/se-mvp-runtime-research/src/pi-0.83.0 \
  install --package-lock-only --ignore-scripts --offline --dry-run
```

The future app must declare exact `@earendil-works/pi-agent-core: 0.83.0` and `@earendil-works/pi-ai: 0.83.0`, generate and commit its own npm lock before implementation, and install only with explicit network approval if the local cache is insufficient. This phase intentionally writes no package files and no dependencies.

The next bounded implementation can therefore build: one host service, one in-memory/independent data store, one fake loopback SSE server, zero-extension chat, and the first extension ABI fixture. It must test event sequencing, fake stream/error/abort, tool admission, ask-user answer/cancel, two-session isolation, restart `unknown`, extension close/finish ordering, and human/model capability separation before any UI work.
