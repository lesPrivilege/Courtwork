/**
 * 产品 agent runtime（PI-HOST-LOOP-1 §二.2）：把 pi 的 `Agent` 接到冻结的 product stdio 上。
 *
 * 本文件只做**装配与投影**，不认识传输：packet 的 framing、seq、状态机与终态优先级全在
 * `product-stdio.ts`（本票只读）。这里负责四件事，每一件都有它必须**不**做的那一半：
 *
 * 1. **凭据只走内存与本次调用**。key 从 bootstrap payload 取出后进闭包，并由
 *    {@link withExplicitApiKey} 显式放进每一次 `streamSimple` 的 options。本文件对进程
 *    环境变量零读写，也不走 dev provider 那一支——它会去环境里找 key（见 `provider.ts`）。
 * 2. **每 leg 恰一枚 Agent**。一个 sidecar 进程就是一条 leg，Agent 在 bootstrap 当场建成，
 *    同 leg 的第二个 prompt 复用它、保留 messages；新 leg 是新进程，messages 天然为空。
 *    不做摘要、不回填旧 messages（票面 §二.7）。
 * 3. **预算跨 prompt 累计**。计数器从 `resume.prior*` 起算，`prompt` 里**没有** reset——
 *    dev `session.ts` 的 per-prompt `budget.reset()` 正是本票 first-red 打掉的那条行为。
 *    pi 不接受来自扩展的「停」（`shouldStopAfterTurn` 不经 Agent 转发），故越限只能 abort。
 * 4. **投影闭集如实转发**。上游事件翻成 `OutboundAgentEvent` 后交给状态机；闭集外的
 *    toolName **不吞**：product stdio 已冻结「不在投影闭集内即 upstream 违约」，
 *    runtime 再立第二套策略就会有两处可漂移的真源。
 *
 * `toolExecution:'sequential'` 是显式固定值，不依赖上游 0.82.1 的 `parallel` 缺省。
 */

import {
  Agent,
  type AgentEvent,
  type AgentMessage,
  type AgentTool,
  type StreamFn,
} from '@earendil-works/pi-agent-core';
import { createModels, type Api, type Model } from '@earendil-works/pi-ai';
import { deepseekProvider } from '@earendil-works/pi-ai/providers/deepseek';

import { CASE_LOGICAL_ROOT, createProductCaseEnv } from './product-case-env.js';
import type {
  BootstrapPayload,
  CancelReason,
  HostResultPayload,
  HostResultStatus,
  SafeToken,
  ToolOutcome,
  TurnStopReason,
  TurnUsage,
  WorkspaceCapability,
} from './product-protocol.js';
import type {
  OutboundAgentEvent,
  ProductSidecarRuntime,
  ProductSidecarSession,
  PromptCompletion,
} from './product-stdio.js';
import { assertToolsWithinPolicy, createToolGate, PRODUCT_TOOL_NAMES } from './tool-policy.js';
import { createReadOnlyTools } from './tools.js';
import {
  bindWorkspaceWriteTool,
  type WorkspaceWritePort,
  type WorkspaceWritePortOutcome,
  type WorkspaceWriteRegistry,
} from './workspace-write-env.js';

/** 产品 prompt 身份（ADR-022 六-0）。`case-read-v1` 是 `PI-HOST-LOOP-1` 的临时身份，已退役。 */
export const PRODUCT_PROMPT_ID = 'md-work-v1';

/**
 * `md-work-v1` 的 exact snapshot：六行以 LF 相连，**末尾无 LF**。
 *
 * 六条语义逐条来自 ADR-022 六-0，一条不多一条不少：①只凭实读事实；②`/case` 只读、
 * `/workspace` 是过程草稿；③`.md` 只用覆盖式 write；④覆盖前先读、写后回读并报逻辑路径；
 * ⑤无 edit/delete/rename/晋升/bash；⑥授权与 effect 只认 gate 与 journal。
 *
 * **它不是安全边界**（ADR-017 2026-07-28 窄修订）：模型照不照做都不改变闸门、容器、
 * host 授权与 journal 的判定。prompt 只负责让模型正确使用**已经授权**的能力；因此这里
 * 不复制工具 schema、不注入 coding playbook、不放垂类正文或人格，UTF-8 亦不得越
 * {@link PRODUCT_SYSTEM_PROMPT_MAX_BYTES}——snapshot 与 byte gate 两枚一起锁。
 */
export const PRODUCT_SYSTEM_PROMPT = [
  '你是一名文档工作助手；回答与写入都只能基于实际读到的内容，读不到、被截断或没读过就直说，不猜。',
  '你有两个逻辑根：/case 是只读案件材料，/workspace 是你的过程草稿区；一律用逻辑路径，不猜测、不回显任何物理路径与凭证。',
  '在 /workspace 新建或改写 Markdown 只有一种方式：用 write 覆盖式整体写入，目标 basename 必须以 .md 结尾且扩展名前至少一个字符。',
  '覆盖既有文件前先读它；每次写入后回读确认，并把最终逻辑路径报告给用户。',
  '你没有 edit、delete、rename、把文件晋升到用户目录或执行命令的能力，也不得声称做过这些。',
  '一次写入是否真的发生只由宿主的授权结果与 journal 决定；工具文案不是证据，未获授权或结果未确认就如实说明。',
].join('\n');

/** system prompt 的字节上限（票面 §二.2）。 */
export const PRODUCT_SYSTEM_PROMPT_MAX_BYTES = 2048;

/**
 * ready 宣告的能力闭集。字典序与状态机的 `normalizeCapabilities` 同序，
 * Rust 侧 `EXPECTED_CAPABILITIES` 逐值比对同一张表——两端同批改，一端漂移即 `state_violation`。
 *
 * `workspace_write` 在这里只表示「本会话可以**申请** workspace write host operation」；
 * 每一次写是否发生仍由宿主逐次授权（ADR-022 六-C），宣告能力不等于预先批准。
 * `workspace_read` 属 `PI-WORKSPACE-READ-1`，本票不宣告。
 */
export const PRODUCT_CAPABILITIES: readonly WorkspaceCapability[] = ['case_read', 'workspace_write'];

/** 产品 provider 只认这一个 id；未来 provider 由架构另立具名 profile，不在此处开分支。 */
export const PRODUCT_PROVIDER_ID = 'deepseek';

export interface ProductProviderBinding {
  readonly model: Model<Api>;
  readonly streamSimple: StreamFn;
}

/**
 * package 内部 factory seam。测试与 control CJS 由此注入 scripted `streamSimple`；
 * production `product-main.ts` 只传 {@link createDeepSeekProviderBinding}。
 * 注意它**不**从 argv/env/wire 选择 provider——选择权在组合根，不在数据面。
 */
export type ProductProviderFactory = (input: { modelId: string; apiKey: string }) => ProductProviderBinding;

/**
 * 把 key 放进**本次调用**的 options。上游 `resolveProviderAuth` 在 `overrides.apiKey`
 * 存在时直接短路，既不读 credential store 也不读进程环境（0.82.1 `auth/resolve.js` 首分支）。
 */
export function withExplicitApiKey(streamSimple: StreamFn, apiKey: string): StreamFn {
  return (model, context, options) => streamSimple(model, context, { ...options, apiKey });
}

/** production provider 装配：pi-ai 0.82.1 的 DeepSeek catalog，缺型号即显式失败。 */
export function createDeepSeekProviderBinding(input: { modelId: string; apiKey: string }): ProductProviderBinding {
  const models = createModels();
  models.setProvider(deepseekProvider());
  const model = models.getModel(PRODUCT_PROVIDER_ID, input.modelId);
  if (!model) {
    throw new Error(`pi-ai 目录里没有 ${PRODUCT_PROVIDER_ID}/${input.modelId}——不回落其他型号`);
  }
  return {
    model,
    streamSimple: withExplicitApiKey(
      (target, context, options) => models.streamSimple(target, context, options),
      input.apiKey,
    ),
  };
}

/** pi 的 stopReason → 投影闭集。认不出的一律 `unknown`，不猜。 */
function toTurnStopReason(stopReason: string): TurnStopReason {
  switch (stopReason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'toolUse':
      return 'tool';
    case 'aborted':
      return 'aborted';
    case 'error':
      return 'error';
    default:
      return 'unknown';
  }
}

/** token 计数必须是非负 safe integer，否则如实报 null——不伪造零。 */
function toTokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function toCostUsd(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * case-env / policy 的拒绝信号（PI-HOST-LOOP-1R N3）。
 *
 * 三件只读工具在容器拒绝时回的是带 `details.denied` 的**文本**结果（见 `tools.ts`），
 * 上游 `isError` 因而为 false；首轮只按 `isError` 二分，于是把政策拒绝投影成 `succeeded`，
 * Rust journal 收到与真实授权结果相反的工具账。翻译在此冻结：denied > failed > succeeded。
 */
function isDeniedToolResult(result: unknown): boolean {
  const details = (result as { details?: unknown } | null | undefined)?.details;
  if (typeof details !== 'object' || details === null) return false;
  return (details as { denied?: unknown }).denied === true;
}

/**
 * 已收束 write operation 的工具账（ADR-022 六-B.2）。
 *
 * write 一旦进入 `operation_pending`，`tool_finished.outcome` 的唯一真源就是 host status——
 * 上游 write 工具那一侧只看得到一枚笼统的 `FileError`（binder 把 denied/failed/uncertain 一并
 * 压成它），从工具错误反推 outcome 必然把「未获授权」写成「失败」。
 *
 * 状态机侧有一份同构映射并在 `tool_finished` 当场逐值比对，两处一旦漂移即 upstream 违约收束，
 * 故这份复制是**被机器盯着的**复制，不是第二个自由真源。
 */
function outcomeFromHostStatus(status: HostResultStatus): ToolOutcome {
  return status === 'ok' ? 'succeeded' : status;
}

/**
 * 收尾 stop reason → prompt completion（PI-HOST-LOOP-1R N2、PI-HOST-LOOP-1R2 C1）。
 *
 * 闭集来源是 `product-protocol.ts` 的 `TurnStopReason`
 * （`stop | length | tool | aborted | error | unknown`——由 {@link toTurnStopReason} 从
 * pi-ai 0.82.1 `StopReason` 的五枚归一而来）。这里**逐枚显式列全**：1R 把闭集其余成员
 * 一起交给 default，`aborted` 因而被写成 `failed/unknown`，正是独立复验 blocker 1 抓到的
 * 形状——少一支 case 就少一条能被门看见的语义。
 *
 * - `stop|tool`：真完成。
 * - `aborted`：走 canceled 路径（C1 2026-08-02 裁定甲路）。pi 的 `aborted` 只能由宿主侧
 *   AbortController 触发，provider 结构上产生不了它，故它恒是一次中止而非失败。reason
 *   不在这里指认：有 cancel 闩锁时状态机沿闩锁的 reason，无闩锁时归 `host`。
 * - `error`：`provider_error`，retryable 按既有闭集。
 * - `length|unknown`：截断或认不出的收尾，报 completed 即静默降级，落兜底 `unknown`。
 */
function completionFor(stopReason: TurnStopReason | null): PromptCompletion {
  switch (stopReason) {
    // 一枚回合都没观察到时按完成收——没有可归因的失败，就不凭空造一个。
    case null:
    case 'stop':
    case 'tool':
      return { kind: 'completed' };
    case 'aborted':
      return { kind: 'canceled' };
    case 'error':
      return { kind: 'failed', code: 'provider_error', retryable: true };
    case 'length':
    case 'unknown':
      return { kind: 'failed', code: 'unknown', retryable: false };
    default:
      // 闭集之外。`TurnStopReason` 若来日扩员而此处未跟上，宁可显式收 unknown，
      // 也不落回 completed——兜底只兜「不知道」，不兜「算成功」。
      return { kind: 'failed', code: 'unknown', retryable: false };
  }
}

const INTERRUPTED_USAGE: TurnUsage = {
  inputTokens: null,
  outputTokens: null,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  costUsd: null,
};

export interface ProductRuntimeOptions {
  /** 唯一 provider 接缝。必填：组合根必须当场说清它组合的是哪一支。 */
  readonly createProvider: ProductProviderFactory;
}

export interface ProductRuntime extends ProductSidecarRuntime {
  /** 状态机与 runtime 互相持有，故 session 建成后回灌一次。 */
  bind(session: ProductSidecarSession): void;
  /** 供 production 入口在 shutdown 后等待在途回合收束。 */
  settled(): Promise<void>;
  /** 本 leg 已创建的 Agent 数：未 bootstrap 为 0，其余恒为 1。 */
  agentCount(): number;
  /** 本 leg 的 transcript。新 leg 是新进程，故它天然从空开始。 */
  messages(): AgentMessage[];
}

export function createProductRuntime(options: ProductRuntimeOptions): ProductRuntime {
  let session: ProductSidecarSession | null = null;
  let agent: Agent | null = null;
  let agentCount = 0;

  let maxTurns = 0;
  let maxUsd: number | null = null;
  // 从 bootstrap 的 prior 起算，跨 prompt 累计；本文件没有任何一处 reset。
  let countedTurns = 0;
  let observedTurns = 0;
  let usd: number | null = 0;

  let activeRequestId: SafeToken | null = null;
  let canceled = false;
  let violated = false;
  /** 本次 prompt 最后观察到的收尾 stop reason。终态由它决定，不由「跑完了」决定（N2）。 */
  let lastStopReason: TurnStopReason | null = null;
  let running: Promise<void> = Promise.resolve();

  function requireSession(): ProductSidecarSession {
    if (session === null) throw new Error('product runtime 未绑定 session');
    return session;
  }

  /** wire 上的 session 身份只有状态机知道；runtime 不另存一份，免得两处各自漂移。 */
  function requireSessionId(): SafeToken {
    const current = requireSession().snapshot().sessionId;
    if (current === null) throw new Error('bootstrap 尚未成立，没有 sessionId');
    return current;
  }

  /** host operation 只属于**当前活动 prompt**；没有活动 prompt 就没有可归属的 request。 */
  function requireActiveRequestId(): SafeToken {
    if (activeRequestId === null) throw new Error('没有活动 prompt，不得申请 workspace operation');
    return activeRequestId;
  }

  /**
   * 在途的 workspace operation，同一时刻至多一枚。
   *
   * 它是 `deliverHostResult` 与 write 工具之间**唯一**的接缝：工具那一侧在 await 一枚
   * promise，宿主的 `host_result` 到达时由状态机回灌，这里按 operationId 严格对号后 resolve。
   * 对不上号一律显式抛出——静默接受等于给未来留一个「谁都能收束别人 operation」的默认通路。
   */
  let pendingHostOperation: {
    readonly operationId: string;
    readonly settle: (outcome: WorkspaceWritePortOutcome) => void;
  } | null = null;

  /**
   * 已收束、尚未投影的那一枚 write 的工具账。一 tc 一 op、Agent 又是 sequential，
   * 故同时至多一枚；投影时消费掉，避免它被下一次（可能根本没到 wire 的）write 复用。
   */
  let settledWriteOutcome: ToolOutcome | null = null;

  /**
   * per-leg 登记册。两件事都不在这里发生：public tc 的**首分配**属状态机
   * （`tool_started` 当场铸），op 的分配属状态机的 reserve 段。runtime 只转手，
   * 因此不存在第二份可漂移的 tc/op 真源，也没有「查不到就代分配一枚」的口子。
   */
  const hostRegistry: WorkspaceWriteRegistry = {
    publicToolCallId: (rawToolCallId) => requireSession().publicToolCallId(rawToolCallId),
    allocateOperationId: (publicToolCallId) =>
      requireSession().reserveHostOperation({ publicToolCallId, capability: 'workspace_write' }),
  };

  /**
   * 两段式接缝的第二段。`reserveHostOperation` 已在 registry 那一侧烧过号，这里只把
   * 调用方算好的 op 与 proposalHash 原样交给状态机出包：零预测、零重算。
   *
   * **不接 abort signal**（形参一概不取）：write 一旦出 wire，effect 是否已经发生就只有
   * `host_result` 与 Rust journal 说了算。在这里因 abort 提前 resolve/reject，等于用 Node
   * 的取消意图冒充宿主的 effect 事实——中止路径由状态机的 pending 闩锁承担，它会等到严格
   * 匹配的 `host_result` 再收束（`invokeRuntimeSuppressed`）。
   */
  const hostPort: WorkspaceWritePort = {
    write(request) {
      const current = requireSession();
      return new Promise<WorkspaceWritePortOutcome>((resolve) => {
        if (pendingHostOperation !== null) {
          throw new Error('同一时刻只允许一枚在途 workspace operation');
        }
        pendingHostOperation = { operationId: request.operationId, settle: resolve };
        try {
          current.sendReservedHostRequest({
            sessionId: request.sessionId,
            requestId: request.requestId,
            operationId: request.operationId,
            proposalHash: request.proposalHash,
            capability: 'workspace_write',
            arguments: {
              logicalPath: request.logicalPath,
              content: request.content,
              contentSha256: request.contentSha256,
              byteLength: request.byteLength,
            },
          });
        } catch (error) {
          // 没能出 wire 的 operation 不留在途：这一枚 ordinal 就此烧掉，不复用、不补发。
          pendingHostOperation = null;
          throw error;
        }
      });
    },
  };

  /**
   * 出包统一入口。状态机抛出的 `ProductSidecarError` 说明投影序列已不合法：
   * 记下违约、停止后续投影，由 {@link finish} 交出 `invalid_state`——不把它当无事发生。
   */
  function publish(event: OutboundAgentEvent): void {
    if (violated || activeRequestId === null) return;
    try {
      requireSession().publishAgentEvent(event);
    } catch {
      violated = true;
    }
  }

  function projectUsage(message: { usage?: unknown }, interrupted: boolean): TurnUsage {
    if (interrupted) return INTERRUPTED_USAGE;
    const usage = (message.usage ?? {}) as {
      input?: unknown;
      output?: unknown;
      cacheRead?: unknown;
      cacheWrite?: unknown;
      cost?: { total?: unknown };
    };
    return {
      inputTokens: toTokenCount(usage.input),
      outputTokens: toTokenCount(usage.output),
      cacheReadTokens: toTokenCount(usage.cacheRead),
      cacheWriteTokens: toTokenCount(usage.cacheWrite),
      costUsd: toCostUsd(usage.cost?.total),
    };
  }

  function onTurnEnd(message: AgentMessage & { stopReason?: string }): void {
    const stopReason = toTurnStopReason(String(message.stopReason ?? ''));
    const interrupted = stopReason === 'aborted' || stopReason === 'error';
    const usage = projectUsage(message as { usage?: unknown }, interrupted);
    lastStopReason = stopReason;

    observedTurns += 1;
    if (!interrupted) {
      countedTurns += 1;
      // 费用未知会把累计值传染为 null，绝不伪记为零（与状态机同口径）。
      if (usage.costUsd === null) usd = null;
      else if (usd !== null) usd += usage.costUsd;
    }

    publish({
      kind: 'turn_finished',
      turn: observedTurns,
      countedTowardTurnLimit: !interrupted,
      usage,
      stopReason,
    });

    // 越限即停：pi 的 loop 没有计数器，只能从回合边界外面 abort。
    const exceeded = countedTurns >= maxTurns || (maxUsd !== null && usd !== null && usd >= maxUsd);
    if (exceeded) agent?.abort();
  }

  function onAgentEvent(event: AgentEvent): void {
    switch (event.type) {
      case 'message_update': {
        const upstream = event.assistantMessageEvent;
        if (canceled) return; // cancel 之后不得再产生新的 delta（状态机硬约束）。
        if (upstream.type === 'text_delta' && upstream.delta.length > 0) {
          publish({ kind: 'assistant_text_delta', delta: upstream.delta });
        } else if (upstream.type === 'thinking_delta' && upstream.delta.length > 0) {
          publish({ kind: 'assistant_reasoning_delta', delta: upstream.delta });
        }
        return;
      }
      case 'tool_execution_start':
        // 闭集外的 toolName 如实转发：状态机已冻结「不在投影闭集内即 upstream 违约」。
        publish({ kind: 'tool_started', rawToolCallId: event.toolCallId, toolName: event.toolName as never });
        return;
      case 'tool_execution_update':
        publish({
          kind: 'tool_progress',
          rawToolCallId: event.toolCallId,
          toolName: event.toolName as never,
        });
        return;
      case 'tool_execution_end': {
        // 已有 host status 的 write：只认它。没有 host status 说明这次 write 连 operation
        // 都没铸出来（Node 门先拒），那时才轮到下面两条本地判据。
        const settled = event.toolName === 'write' ? settledWriteOutcome : null;
        settledWriteOutcome = null;
        publish({
          kind: 'tool_finished',
          rawToolCallId: event.toolCallId,
          toolName: event.toolName as never,
          // 政策/容器拒绝优先于 isError：拒绝就是 denied，不是失败，更不是成功（N3）。
          outcome: settled ?? (isDeniedToolResult(event.result) ? 'denied' : event.isError ? 'failed' : 'succeeded'),
        });
        return;
      }
      case 'turn_end':
        if (event.message.role === 'assistant') onTurnEnd(event.message as AgentMessage & { stopReason?: string });
        return;
      default:
        return;
    }
  }

  function finish(): void {
    const current = requireSession();
    // 状态机可能已经自行收束（闩锁、budget、cancel 竞态）；那时没有活动 prompt 可 finish。
    if (current.snapshot().activeRequestId !== activeRequestId || activeRequestId === null) {
      activeRequestId = null;
      return;
    }
    activeRequestId = null;
    if (violated) {
      current.finishPrompt({ kind: 'failed', code: 'invalid_state', retryable: false });
      return;
    }
    // 终态如实：收尾 stop reason 说了算，「prompt() 返回了」不等于 completed（N2）。
    current.finishPrompt(completionFor(lastStopReason));
  }

  return {
    capabilities(bootstrap: BootstrapPayload) {
      if (agent !== null) throw new Error('一条 leg 只接受一枚 bootstrap');
      maxTurns = bootstrap.limits.maxTurns;
      maxUsd = bootstrap.limits.maxUsd;
      countedTurns = bootstrap.resume.priorTurns;
      observedTurns = bootstrap.resume.priorObservedTurns;
      usd = bootstrap.resume.priorUsd;

      const env = createProductCaseEnv({ caseRoot: bootstrap.caseRoot });
      const readTools = createReadOnlyTools({ logicalRoot: CASE_LOGICAL_ROOT });
      /**
       * write 自带 invocation-scoped 虚拟 workspace 容器，**不走**下面那一层 `{ env }` 注入：
       * 那一层注的是 `/case` 只读容器，会把 workspace 容器整个顶掉，写面于是变成读面容器里的
       * 一次越界写。两条容器在此分叉，之后再不合流。
       *
       * `sessionId`/`requestId` 取 getter：一条 leg 只建一枚 Agent、也只建一枚 binder，
       * 而 requestId 每 prompt 换一枚。冻结在 bind 那一刻就会让第二个 prompt 的写带着旧
       * request 上 wire；取值时机因此必须是**执行时**，并由状态机 send 段的 request 同一性门
       * 兜底（两侧都验，不靠对方）。
       */
      const writeTool = bindWorkspaceWriteTool({
        get sessionId() {
          return requireSessionId();
        },
        get requestId() {
          return requireActiveRequestId();
        },
        registry: hostRegistry,
        port: hostPort,
      });
      const gate = createToolGate(PRODUCT_TOOL_NAMES);
      assertToolsWithinPolicy([...readTools.map((tool) => tool.name), writeTool.name], gate);

      const provider = options.createProvider({
        modelId: bootstrap.provider.modelId,
        apiKey: bootstrap.provider.apiKey,
      });

      agentCount += 1;
      agent = new Agent({
        streamFn: (model, context, streamOptions) => provider.streamSimple(model, context, streamOptions),
        beforeToolCall: async (context) => gate.beforeToolCall(context),
        // 显式固定，不依赖上游缺省。write binder 的 executionMode 归 PI-WRITE-HOST-1。
        toolExecution: 'sequential',
        initialState: {
          systemPrompt: PRODUCT_SYSTEM_PROMPT,
          model: provider.model,
          tools: [
            ...readTools.map(
              (tool) =>
                ({
                  ...tool,
                  execute: (toolCallId: string, params: never, signal?: AbortSignal, onUpdate?: never) =>
                    tool.execute(toolCallId, params, signal, onUpdate, { env }),
                }) as AgentTool<never>,
            ),
            // binder 已是四参 execute，且自带容器；再包一层就等于替它选容器。
            writeTool as unknown as AgentTool<never>,
          ],
        },
      });
      agent.subscribe((event) => {
        onAgentEvent(event);
      });

      return PRODUCT_CAPABILITIES;
    },

    startPrompt({ requestId, text }) {
      const current = agent;
      if (current === null) throw new Error('bootstrap 尚未成立，没有 agent');
      activeRequestId = requestId;
      canceled = false;
      violated = false;
      lastStopReason = null;
      running = (async () => {
        try {
          await current.prompt(text);
        } catch {
          // provider 失败按契约走 stream 内的 error 终态；能抛到这里的属未归类失败。
          violated = true;
        }
        finish();
      })();
    },

    cancel({ reason }: { requestId: SafeToken; reason: CancelReason }) {
      void reason;
      canceled = true;
      agent?.abort();
    },

    deliverHostResult(result: HostResultPayload) {
      const waiting = pendingHostOperation;
      if (waiting === null || waiting.operationId !== result.operationId) {
        throw new Error('没有与这枚 host_result 对号的在途 workspace operation，不接受');
      }
      if (result.capability !== 'workspace_write') {
        throw new Error('本票只申请 workspace_write，不接受其他 capability 的 host_result');
      }
      pendingHostOperation = null;
      settledWriteOutcome = outcomeFromHostStatus(result.status);
      // 精确 code 闭集属 wire 与 Rust 宿主；这里只把它原样交给工具侧，不复制第二份判定，
      // 也不从 status 反推「文件到底有没有变」——那只有 host_result 与 journal 说了算。
      waiting.settle(
        result.status === 'ok'
          ? { status: 'ok' }
          : { status: result.status, code: result.error.code, message: result.error.message },
      );
    },

    shutdown() {
      agent?.abort();
    },

    bind(next: ProductSidecarSession) {
      session = next;
    },

    async settled() {
      await running;
    },

    agentCount: () => agentCount,
    messages: () => (agent === null ? [] : agent.state.messages),
  };
}
