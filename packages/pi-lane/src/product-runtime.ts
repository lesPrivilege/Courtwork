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
  SafeToken,
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
import { assertToolsWithinPolicy, createToolGate } from './tool-policy.js';
import { createReadOnlyTools } from './tools.js';

/** 本票的临时 prompt 身份。`PI-WRITE-HOST-1` 才换成 `md-work-v1`。 */
export const PRODUCT_PROMPT_ID = 'case-read-v1';

/**
 * `case-read-v1` 的 exact snapshot：四行以 LF 相连，**末尾无 LF**。
 * 字节由票面 §二.2 冻结；改一个字都属契约变更。
 */
export const PRODUCT_SYSTEM_PROMPT = [
  '你是一名只读文档助手，案件材料只在虚拟根 /case。',
  '可用工具只有 read、glob、grep；回答前须实际读取，读不到或结果被截断就明确说明。',
  '你不能修改、新建、删除文件，也不能执行命令或声称已经完成这些动作。',
  '引用材料时使用 /case 开头的逻辑路径；不得猜测、回显或索要任何物理路径与凭证。',
].join('\n');

/** system prompt 的字节上限（票面 §二.2）。 */
export const PRODUCT_SYSTEM_PROMPT_MAX_BYTES = 2048;

/** 本票 ready 恰宣告这一枚能力。 */
export const PRODUCT_CAPABILITIES: readonly WorkspaceCapability[] = ['case_read'];

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
 * 收尾 stop reason → prompt completion（PI-HOST-LOOP-1R N2）。
 *
 * 只有 `stop|tool` 是真完成；`error` 归 `provider_error`；其余（`aborted`、`length`、
 * `unknown`）落七格闭集的兜底 `unknown`——截断或中断收尾报 completed 属静默降级，
 * 而闭集不在本票扩展。`aborted` 之所以不需要单独一支：状态机的终态优先级里
 * `budget_stopped > cancel > 其他 outcome`，真有 cancel 或越限时它会压过这里的 intent。
 */
function completionFor(stopReason: TurnStopReason | null): PromptCompletion {
  switch (stopReason) {
    // 一枚回合都没观察到时按完成收——没有可归因的失败，就不凭空造一个。
    case null:
    case 'stop':
    case 'tool':
      return { kind: 'completed' };
    case 'error':
      return { kind: 'failed', code: 'provider_error', retryable: true };
    default:
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
      case 'tool_execution_end':
        publish({
          kind: 'tool_finished',
          rawToolCallId: event.toolCallId,
          toolName: event.toolName as never,
          // 政策/容器拒绝优先于 isError：拒绝就是 denied，不是失败，更不是成功（N3）。
          outcome: isDeniedToolResult(event.result) ? 'denied' : event.isError ? 'failed' : 'succeeded',
        });
        return;
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
      const tools = createReadOnlyTools({ logicalRoot: CASE_LOGICAL_ROOT });
      const gate = createToolGate();
      assertToolsWithinPolicy(
        tools.map((tool) => tool.name),
        gate,
      );

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
          tools: tools.map(
            (tool) =>
              ({
                ...tool,
                execute: (toolCallId: string, params: never, signal?: AbortSignal, onUpdate?: never) =>
                  tool.execute(toolCallId, params, signal, onUpdate, { env }),
              }) as AgentTool<never>,
          ),
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
      void result;
      // 本票不发 host_request，故不可能收到 host_result；静默接受等于给未来留一个默认通路。
      throw new Error('本票不申请 host operation，不接受 host_result');
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
