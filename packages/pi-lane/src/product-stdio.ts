/**
 * 产品 stdio 状态机（ADR-022 六-B.1）：一个 sidecar 进程 = 一个 logical session 的一条 leg。
 *
 * 本文件只做**协议层**：framing、双向 per-leg seq、session/request 状态机、tc/op 铸造与
 * host correlation、以及 terminal 优先级矩阵。它不认识 pi、不认识文件系统，也不碰
 * `process.stdin/stdout`——传输与 agent loop 都从构造参数注入，故没有也不需要 executable main。
 *
 * 明确不做（票面边界，留给持 durable journal 的 Rust 宿主）：跨 leg requestId 去重、
 * `leg == previous + 1`、`prior*` 是否精确等于历史 fold、以及 model/limits/grant/container/
 * capability 漂移。新进程没有历史，本文件只做「当前包可判定」的自洽门。
 *
 * 两类错误分得很干净：
 * - **wire 违约**（对端发来的字节不合契约）→ 发 fatal `protocol_error` 并令宿主非零退出；
 * - **runtime 违约**（注入的 agent loop 用错了本 API）→ 抛 {@link ProductSidecarError}。
 *   后者不进 wire，因为它不是对端的错，静默吞掉才是真正的降级。
 */

import {
  LINE_DELIMITER,
  MAX_PACKET_BYTES,
  MAX_TERMINAL_MESSAGE_BYTES,
  SHA256_HEX_PATTERN,
  decodeHostPacketLine,
  encodePacketLine,
  utf8ByteLength,
  type AgentProjectionEvent,
  type BootstrapPacket,
  type BootstrapPayload,
  type BudgetView,
  type CancelReason,
  type HostResultPayload,
  type HostResultStatus,
  type ProductToolName,
  type ProtocolErrorCode,
  type SafeToken,
  type SidecarPacket,
  type Terminal,
  type TerminalFailureCode,
  type ToolOutcome,
  type TurnStopReason,
  type TurnUsage,
  type WorkspaceCapability,
  type WorkspaceHostRequest,
  type WorkspaceOperation,
  type WorkspaceReadArguments,
  type WorkspaceWriteArguments,
} from './product-protocol.js';

/** runtime 侧的编程契约被违反时抛出；wire 侧违反走 `protocol_error`，两者不混。 */
export class ProductSidecarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductSidecarError';
  }
}

/**
 * terminal message 的**唯一**来源：每个 code 一枚独立的本地 source literal。
 * 措辞不是 wire ABI，但「不拼接、不插值、不转发」是——runtime error、provider body、
 * host error 与 bootstrap 的 secret/物理路径都不得由此出包（ADR-022 六-B.1）。
 */
const TERMINAL_MESSAGES: Readonly<Record<TerminalFailureCode, string>> = {
  provider_error: 'provider 调用失败，本轮未能完成',
  host_error: '宿主操作失败，本轮未能完成',
  budget_unknown: '已启用金额限额，但存在费用未知的回合',
  effect_uncertain: '目标可能已是完整新版本，落盘无法证明',
  upstream_event_unsupported: '上游事件序列不在投影闭集内',
  invalid_state: '状态机收到不合法的状态转移',
  unknown: '未归类的失败',
};

/** runtime callback 抛出时对 driver 的**唯一**答复：固定字面量、无 cause。 */
const RUNTIME_CALLBACK_FAILED = '注入 runtime 的 callback 抛出，原错误不予转发';
const REENTRANT_INBOUND = 'runtime callback 未返回时不得同步调用 receive / endOfInput';

/** 注入的传输面。`write` 收到的是**整行**（已含结尾 LF）。 */
export interface ProductSidecarTransport {
  write(line: Uint8Array): void;
  /** 结束本 leg：fatal 协议错用非零码，idle shutdown 用 0。 */
  exit(code: number): void;
}

/**
 * 注入的 agent loop。状态机只在**协议上合法**时才回调它；
 * 它反过来只经 {@link ProductSidecarSession} 的 publish/request/finish 出包。
 */
export interface ProductSidecarRuntime {
  /** bootstrap 通过后宣告能力。状态机负责去重与字典序，并据此闸 `requestHost`。 */
  capabilities(bootstrap: BootstrapPayload): readonly WorkspaceCapability[];
  startPrompt(prompt: { requestId: SafeToken; text: string }): void;
  cancel(cancel: { requestId: SafeToken; reason: CancelReason }): void;
  deliverHostResult(result: HostResultPayload): void;
  shutdown(): void;
}

/** runtime 发出的 agent event：只给 raw tool call id，公开 tc 由状态机铸造并替换。 */
export type OutboundAgentEvent =
  | { kind: 'assistant_text_delta'; delta: string }
  | { kind: 'assistant_reasoning_delta'; delta: string }
  | { kind: 'tool_started' | 'tool_progress'; rawToolCallId: string; toolName: ProductToolName }
  | {
      kind: 'tool_finished';
      rawToolCallId: string;
      toolName: ProductToolName;
      outcome: ToolOutcome;
    }
  | {
      kind: 'turn_finished';
      turn: number;
      countedTowardTurnLimit: boolean;
      usage: TurnUsage;
      stopReason: TurnStopReason;
    };

/** 两段式接缝第一段的入参：预留 op 时只认公开 tc 与能力，不碰 arguments。 */
export type HostOperationReservation = {
  publicToolCallId: SafeToken;
  capability: 'workspace_write' | 'workspace_read';
};

/**
 * 两段式接缝第二段的入参，逐字同构 `WorkspaceWritePort.write(request)` 的八字段 request。
 * op 与 proposalHash 由**调用方**（`workspace-write-env` 的 registry / hasher）给出，
 * 状态机原样消费：零预测、零重算、零 shared-current。
 */
export type ReservedHostRequest = {
  sessionId: SafeToken;
  requestId: SafeToken;
  operationId: SafeToken;
  proposalHash: string;
} & (
  | { capability: 'workspace_write'; arguments: WorkspaceWriteArguments }
  | { capability: 'workspace_read'; arguments: WorkspaceReadArguments }
);

/**
 * runtime 报告的原始收束；最终 terminal 仍由状态机按 ADR 优先级矩阵裁定。
 *
 * 精确闭集，**没有自由 message**：预算、effect 与上游投影三类失败只能由状态机自行判定，
 * runtime 不得构造；能重试的也只有 provider/host 两枚。
 */
export type PromptCompletion =
  | { kind: 'completed' }
  | { kind: 'failed'; code: 'provider_error' | 'host_error'; retryable: boolean }
  | { kind: 'failed'; code: 'invalid_state' | 'unknown'; retryable: false };

/** 状态机内部的终态意图：比 {@link PromptCompletion} 多出它**自己**才能判定的三枚 code。 */
type TerminalIntent = { kind: 'completed' } | { kind: 'failed'; code: TerminalFailureCode; retryable: boolean };

export type SessionPhase = 'awaiting_bootstrap' | 'idle' | 'prompting' | 'closed';

export type SessionSnapshot = {
  phase: SessionPhase;
  sessionId: SafeToken | null;
  leg: number | null;
  /** 下一枚**期望**收到的 inbound seq。 */
  expectedInboundSeq: number;
  /** 下一枚**将要发出**的 outbound seq。 */
  nextOutboundSeq: number;
  activeRequestId: SafeToken | null;
  pendingOperationId: SafeToken | null;
  observedTurns: number;
  budget: BudgetView | null;
};

export interface ProductSidecarSessionOptions {
  transport: ProductSidecarTransport;
  runtime: ProductSidecarRuntime;
}

export interface ProductSidecarSession {
  /** 喂 stdin 字节。允许任意切分，framer 自行拼行。 */
  receive(chunk: Uint8Array): void;
  /** stdin 结束。缓冲区非空即 partial packet，fatal。 */
  endOfInput(): void;

  publishAgentEvent(event: OutboundAgentEvent): void;
  /**
   * 接缝第一段：所有本地 gate 之后预留 operationId。
   * 其后的异步 hash 若失败而不 send，该 ordinal 永久烧号——不出 wire、不成为 pending、不得复用。
   */
  reserveHostOperation(reservation: HostOperationReservation): SafeToken;
  /** 接缝第二段：原样消费调用方已铸的 op 与已算的 proposalHash，发出 `host_request`。 */
  sendReservedHostRequest(request: ReservedHostRequest): void;
  finishPrompt(completion: PromptCompletion): void;

  snapshot(): SessionSnapshot;
}

/** 已发出 request 的**不可变镜像**；host_result 只与它比对，绝不回读 runtime 仍可变的对象。 */
type PendingOperation = {
  operationId: SafeToken;
  requestId: SafeToken;
  toolCallId: SafeToken;
  toolName: ProductToolName;
  capability: 'workspace_write' | 'workspace_read';
  operation: WorkspaceOperation;
  logicalPath: string;
  /** 只有 write 有这两枚镜像字段；read 一律 null，不虚构比较。 */
  contentSha256: string | null;
  byteLength: number | null;
};

/** host_result 已合法收下、对应 write 的 `tool_finished` 尚未发布的中间态。 */
type SettledWrite = { toolCallId: SafeToken; toolName: ProductToolName; status: HostResultStatus };

/**
 * write 进入 `operation_pending` 后，`tool_finished.outcome` **只认** host status，
 * 不认上游 tool result 的 `isError`；read 被异常路径迫停时只保 denied，其余合法 status 收为 failed。
 */
function outcomeFromHostStatus(toolName: ProductToolName, status: HostResultStatus): ToolOutcome {
  if (toolName === 'write') return status === 'ok' ? 'succeeded' : status;
  return status === 'denied' ? 'denied' : 'failed';
}

const EMPTY = new Uint8Array(0);

/** protocol_error.message 有 1024 bytes 硬顶；截断按 code point 走，不切碎 surrogate 对。 */
function clampMessage(message: string): string {
  if (utf8ByteLength(message) <= MAX_TERMINAL_MESSAGE_BYTES) return message;
  let out = '';
  for (const codePoint of message) {
    if (utf8ByteLength(out + codePoint) > MAX_TERMINAL_MESSAGE_BYTES) break;
    out += codePoint;
  }
  return out;
}

function normalizeCapabilities(input: readonly WorkspaceCapability[]): WorkspaceCapability[] {
  return [...new Set(input)].sort();
}

export function createProductSidecarSession(
  options: ProductSidecarSessionOptions,
): ProductSidecarSession {
  const { transport, runtime } = options;

  let phase: SessionPhase = 'awaiting_bootstrap';
  let sessionId: SafeToken | null = null;
  let leg: number | null = null;
  let maxTurns = 0;
  let maxUsd: number | null = null;
  let capabilities: WorkspaceCapability[] = [];

  let expectedInboundSeq = 1;
  let nextOutboundSeq = 1;
  let carry: Uint8Array = EMPTY;

  // 累计器从 bootstrap 的 prior 起算，不从零重开；idle 续 prompt 也不重置。
  let countedTurns = 0;
  let observedTurns = 0;
  let usd: number | null = 0;

  let activeRequestId: SafeToken | null = null;
  let lastTerminatedRequestId: SafeToken | null = null;
  let cancelRequested: CancelReason | null = null;
  let effectUncertain = false;

  const seenRequestIds = new Set<SafeToken>();
  const canceledRequestIds = new Set<SafeToken>();
  /** 本 leg 的 raw→公开 tc 映射。跨 leg 唯一性靠 leg 前缀 + Rust 的 previous+1 校验。 */
  const toolCallIds = new Map<string, SafeToken>();
  /** 公开 tc→toolName：reservation 与闩锁收束都要凭它自行发 `tool_finished`。 */
  const toolNames = new Map<SafeToken, ProductToolName>();
  const resolvedOperationIds = new Set<SafeToken>();
  let pending: PendingOperation | null = null;
  let settledWrite: SettledWrite | null = null;
  /** `pending_upstream_failure`：不清 pending、不提前 terminal，只等 effect 收束。 */
  let upstreamLatched = false;
  let reservation:
    | { operationId: SafeToken; requestId: SafeToken; toolCallId: SafeToken; toolName: ProductToolName; capability: 'workspace_write' | 'workspace_read' }
    | null = null;
  let toolCallOrdinal = 0;
  let operationOrdinal = 0;
  /** 五枚 runtime callback 共用；>0 时同步 inbound 属 runtime 编程错误。 */
  let callbackDepth = 0;

  /**
   * 包裹全部五枚 runtime callback。两件事同时成立：
   * 1. 期间的同步 `receive`/`endOfInput` 被 {@link assertNotInsideCallback} 拒；
   * 2. 逃逸的原 Error/message/cause 一律不转发，只换成固定字面量、无 cause 的错误。
   */
  function invokeRuntime<T>(call: () => T): T {
    callbackDepth += 1;
    try {
      return call();
    } catch {
      throw new ProductSidecarError(RUNTIME_CALLBACK_FAILED);
    } finally {
      callbackDepth -= 1;
    }
  }

  /** 闩锁收束期专用：callback 的二次失败不得再次丢掉已发生的 effect。 */
  function invokeRuntimeSuppressed(call: () => void): void {
    try {
      invokeRuntime(call);
    } catch (error) {
      if (!(error instanceof ProductSidecarError)) throw error;
    }
  }

  function assertNotInsideCallback(): void {
    if (callbackDepth > 0) throw new ProductSidecarError(REENTRANT_INBOUND);
  }

  function requireNotLatched(): void {
    if (upstreamLatched) {
      throw new ProductSidecarError('上游违约收束中，不再接受新的 runtime 输出');
    }
  }

  function emit(packet: Omit<SidecarPacket, 'protocolVersion' | 'seq'>): boolean {
    const encoded = encodePacketLine({ protocolVersion: 1, seq: nextOutboundSeq, ...packet } as SidecarPacket);
    if (!encoded.ok) {
      // 自己的产物过不了自己的 decoder（或装不进 framing）就一个字节都不写。
      // protocol_error 本身失败时不能再递归发错，只能直接非零收场。
      if (packet.type === 'protocol_error') {
        phase = 'closed';
        transport.exit(1);
        return false;
      }
      rejectFatal(encoded.code, `sidecar 出包未过自检：${encoded.reason}`);
      return false;
    }
    nextOutboundSeq += 1;
    transport.write(encoded.line);
    return true;
  }

  function rejectFatal(code: ProtocolErrorCode, reason: string, requestId: SafeToken | null = null): void {
    emit({
      sessionId,
      requestId,
      type: 'protocol_error',
      payload: { code, message: clampMessage(reason), fatal: true },
    });
    phase = 'closed';
    carry = EMPTY;
    transport.exit(1);
  }

  function budgetView(): BudgetView {
    const turnLimit = countedTurns >= maxTurns ? 'reached' : 'open';
    const usdLimit =
      maxUsd === null ? 'disabled' : usd === null ? 'unknown' : usd >= maxUsd ? 'reached' : 'open';
    return { turns: countedTurns, usd, turnLimit, usdLimit, stopReason: null };
  }

  /**
   * ADR 固定的终态优先级：
   * `effect_uncertain > budget_unknown > 已知 limit reached > cancel > 其他 outcome`。
   * 注意最后一档：limit reached 压过 runtime 自己报的 provider/host 失败，这是 ADR 的明文次序，
   * 不是本实现的取舍。
   */
  function failedTerminal(code: TerminalFailureCode, retryable: boolean, budget: BudgetView): Terminal {
    return {
      status: 'failed',
      // retryability 闭集与 decoder 同源：只有 provider/host 两枚可重试，cast 也翻不过来。
      error: {
        code,
        message: TERMINAL_MESSAGES[code],
        retryable: (code === 'provider_error' || code === 'host_error') && retryable,
      },
      budget,
    };
  }

  function resolveTerminal(intent: TerminalIntent, budget: BudgetView): Terminal {
    if (effectUncertain) return failedTerminal('effect_uncertain', false, budget);
    if (maxUsd !== null && usd === null) return failedTerminal('budget_unknown', false, budget);
    if (budget.turnLimit === 'reached' || budget.usdLimit === 'reached') {
      return {
        status: 'budget_stopped',
        budget: { ...budget, stopReason: budget.turnLimit === 'reached' ? 'turns' : 'usd' },
      };
    }
    if (cancelRequested !== null) {
      return { status: 'canceled', reason: cancelRequested, budget };
    }
    if (intent.kind === 'completed') return { status: 'completed', budget };
    return failedTerminal(intent.code, intent.retryable, budget);
  }

  /** 只有 completed / canceled / 可重试的 provider|host 失败留在 idle，其余关闭 logical session。 */
  function closesSession(terminal: Terminal): boolean {
    switch (terminal.status) {
      case 'completed':
      case 'canceled':
        return false;
      case 'failed':
        return !(
          (terminal.error.code === 'provider_error' || terminal.error.code === 'host_error') &&
          terminal.error.retryable
        );
      default:
        return true;
    }
  }

  function terminate(intent: TerminalIntent): void {
    // 在途 operation 一律不许被 terminal 甩掉——upstream 违约走闩锁，不走 force。
    if (pending !== null) {
      throw new ProductSidecarError('在途 host request 未收束前不得发 terminal');
    }
    const requestId = activeRequestId;
    const terminal = resolveTerminal(intent, budgetView());
    activeRequestId = null;
    lastTerminatedRequestId = requestId;
    cancelRequested = null;
    effectUncertain = false;
    upstreamLatched = false;
    settledWrite = null;
    reservation = null;
    if (!emit({ sessionId, requestId, type: 'terminal', payload: terminal })) return;
    phase = closesSession(terminal) ? 'closed' : 'idle';
  }

  /**
   * 闩锁收束：状态机凭 reservation 保存的 public tc/toolName 与 host status **自行**发恰一枚
   * `tool_finished`，随后按 ADR 优先级自动 terminal——不等 runtime 再调 finish。
   */
  function settleUpstreamFailure(settled: SettledWrite): void {
    settledWrite = null;
    const published = emit({
      sessionId,
      requestId: activeRequestId,
      type: 'agent_event',
      payload: {
        kind: 'tool_finished',
        toolCallId: settled.toolCallId,
        toolName: settled.toolName,
        outcome: outcomeFromHostStatus(settled.toolName, settled.status),
      },
    });
    if (!published) return;
    terminate({ kind: 'failed', code: 'upstream_event_unsupported', retryable: false });
  }

  /**
   * 上游投影违约。ADR-022 六-B.1：一律把累计 `usd` 传染为 null——该事件已证明 provider turn
   * 在跑，合法 `turn_finished`/usage 闭合已不可再信；maxUsd 启用时 `budget_unknown` 因此更高优先。
   *
   * 只有既无在途 operation、也无待收束 write 时才可直接 terminal；否则进闩锁等 effect 收束。
   * 二者不会同时成立：产品 Agent 是 `toolExecution:'sequential'`，write 的单 operation 必在
   * 下一件工具起手前由 `tool_finished` 闭合。
   */
  function failUpstream(): void {
    usd = null;
    if (pending !== null) {
      upstreamLatched = true;
      return;
    }
    if (settledWrite !== null) {
      // host_result 已合法收下、tool_finished 未到的 race：直接消费已保存的 outcome。
      upstreamLatched = true;
      settleUpstreamFailure(settledWrite);
      return;
    }
    terminate({ kind: 'failed', code: 'upstream_event_unsupported', retryable: false });
  }

  function requireActivePrompt(): SafeToken {
    if (phase !== 'prompting' || activeRequestId === null) {
      throw new ProductSidecarError('当前没有活动 prompt');
    }
    return activeRequestId;
  }

  function requireLeg(): number {
    if (leg === null) throw new ProductSidecarError('bootstrap 尚未成立，没有 leg');
    return leg;
  }

  /**
   * `phase` 由 {@link handleLine} 的下游（`rejectFatal` / `terminate`）改写，
   * 而 TS 不会因跨函数赋值失效对捕获 `let` 的收窄——直接写 `phase === 'closed'`
   * 会被判成「不可能的比较」。经函数读一次，收窄不成立，运行期判定才留得住。
   */
  function isClosed(): boolean {
    return phase === 'closed';
  }

  // ── inbound ────────────────────────────────────────────────────────────────

  function handleBootstrap(packet: BootstrapPacket): void {
    if (phase !== 'awaiting_bootstrap') {
      rejectFatal('state_violation', '一条 leg 只接受一枚 bootstrap');
      return;
    }
    const { payload } = packet;
    sessionId = packet.sessionId;
    leg = payload.resume.leg;
    maxTurns = payload.limits.maxTurns;
    maxUsd = payload.limits.maxUsd;
    countedTurns = payload.resume.priorTurns;
    observedTurns = payload.resume.priorObservedTurns;
    usd = payload.resume.priorUsd;
    capabilities = normalizeCapabilities(invokeRuntime(() => runtime.capabilities(payload)));
    phase = 'idle';
    emit({ sessionId, requestId: null, type: 'ready', payload: { capabilities } });
  }

  function handlePrompt(requestId: SafeToken, text: string): void {
    if (phase !== 'idle') {
      rejectFatal('state_violation', 'prompt 只能在 ready 之后、上一 prompt 已 terminal 时发出');
      return;
    }
    if (seenRequestIds.has(requestId)) {
      rejectFatal('duplicate_id', '本 leg 内 requestId 不得复用');
      return;
    }
    seenRequestIds.add(requestId);
    activeRequestId = requestId;
    cancelRequested = null;
    effectUncertain = false;
    pending = null;
    settledWrite = null;
    upstreamLatched = false;
    reservation = null;
    phase = 'prompting';
    invokeRuntime(() => runtime.startPrompt({ requestId, text }));
  }

  function handleCancel(requestId: SafeToken, reason: CancelReason): void {
    if (canceledRequestIds.has(requestId)) {
      rejectFatal('state_violation', '同一 request 的 cancel 最多一次');
      return;
    }
    if (phase === 'prompting' && requestId === activeRequestId) {
      canceledRequestIds.add(requestId);
      cancelRequested = reason;
      // 闩锁期仍照发 cancel，但其 callback 失败不得阻断 effect 收束。
      if (upstreamLatched) invokeRuntimeSuppressed(() => runtime.cancel({ requestId, reason }));
      else invokeRuntime(() => runtime.cancel({ requestId, reason }));
      return;
    }
    // race-late：terminal 已先发出，随后才读到同一 request 的 cancel。
    // 只消费它的 seq，不发第二枚 terminal，也不把一次正常 Stop 竞态升级为协议崩溃。
    if (requestId === lastTerminatedRequestId) {
      canceledRequestIds.add(requestId);
      return;
    }
    rejectFatal('request_mismatch', 'cancel 只能引用当前活动 prompt 或刚刚收束的同一 request');
  }

  function handleHostResult(requestId: SafeToken, payload: HostResultPayload): void {
    if (phase !== 'prompting') {
      rejectFatal('state_violation', '没有活动 prompt 时不接受 host_result');
      return;
    }
    if (requestId !== activeRequestId) {
      rejectFatal('request_mismatch', 'host_result 必须回当前活动 prompt 的 requestId');
      return;
    }
    if (resolvedOperationIds.has(payload.operationId)) {
      rejectFatal('duplicate_id', '同一 operationId 只允许收束一次');
      return;
    }
    if (pending === null || pending.operationId !== payload.operationId) {
      rejectFatal('request_mismatch', 'host_result 未对应任何在途 operation');
      return;
    }
    if (requestId !== pending.requestId) {
      rejectFatal('request_mismatch', 'host_result 必须回发出该 operation 时的 requestId');
      return;
    }
    if (payload.capability !== pending.capability || payload.operation !== pending.operation) {
      rejectFatal('request_mismatch', 'host_result 的 capability/operation 必须与待办完全相同');
      return;
    }
    // 只有 ok 才有 value；逐值比对**已发出包的不可变镜像**，不重读 runtime 仍可变的 arguments。
    if (payload.status === 'ok') {
      if (payload.capability === 'workspace_write') {
        if (payload.value.logicalPath !== pending.logicalPath) {
          rejectFatal('request_mismatch', 'write ok 的 logicalPath 必须与已发出 request 相同');
          return;
        }
        if (payload.value.contentSha256 !== pending.contentSha256) {
          rejectFatal('request_mismatch', 'write ok 的 contentSha256 必须与已发出 request 相同');
          return;
        }
        if (payload.value.byteLength !== pending.byteLength) {
          rejectFatal('request_mismatch', 'write ok 的 byteLength 必须与已发出 request 相同');
          return;
        }
      } else if (payload.value.logicalPath !== pending.logicalPath) {
        rejectFatal('request_mismatch', 'read ok 的 logicalPath 必须与已发出 request 相同');
        return;
      }
    }

    resolvedOperationIds.add(payload.operationId);
    const settled: SettledWrite = {
      toolCallId: pending.toolCallId,
      toolName: pending.toolName,
      status: payload.status,
    };
    pending = null;
    if (payload.status === 'uncertain') effectUncertain = true;

    if (upstreamLatched) {
      // 先解开既有 deferred；callback 的返回或异常都不再拥有终态。
      invokeRuntimeSuppressed(() => runtime.deliverHostResult(payload));
      settleUpstreamFailure(settled);
      return;
    }
    // write 的 tool_finished 只认这枚 status，故先记再回灌（runtime 可能同步就发 finished）。
    if (settled.toolName === 'write') settledWrite = settled;
    invokeRuntime(() => runtime.deliverHostResult(payload));
  }

  function handleShutdown(): void {
    if (phase !== 'idle') {
      rejectFatal('state_violation', 'shutdown 只能在 idle 发出');
      return;
    }
    invokeRuntime(() => runtime.shutdown());
    if (!emit({ sessionId, requestId: null, type: 'terminal', payload: { status: 'shutdown' } })) return;
    phase = 'closed';
    carry = EMPTY;
    transport.exit(0);
  }

  function handleLine(line: Uint8Array): void {
    const decoded = decodeHostPacketLine(line);
    if (!decoded.ok) {
      rejectFatal(decoded.code, decoded.reason);
      return;
    }
    const packet = decoded.packet;

    if (packet.seq !== expectedInboundSeq) {
      rejectFatal('seq_mismatch', 'inbound seq 必须从 1 起逐枚递增，不得跳号或重复');
      return;
    }
    expectedInboundSeq += 1;

    if (phase === 'awaiting_bootstrap') {
      if (packet.type !== 'bootstrap') {
        rejectFatal('state_violation', '本 leg 的首包必须是 bootstrap');
        return;
      }
    } else if (packet.sessionId !== sessionId) {
      rejectFatal('session_mismatch', 'sessionId 必须与 bootstrap 建立的 session 一致');
      return;
    }

    switch (packet.type) {
      case 'bootstrap':
        handleBootstrap(packet);
        return;
      case 'prompt':
        handlePrompt(packet.requestId, packet.payload.text);
        return;
      case 'cancel':
        handleCancel(packet.requestId, packet.payload.reason);
        return;
      case 'host_result':
        handleHostResult(packet.requestId, packet.payload);
        return;
      default:
        handleShutdown();
    }
  }

  function receive(chunk: Uint8Array): void {
    // 必须早于消费字节、推进 seq/phase、写 wire 或 exit 的任何一步。
    assertNotInsideCallback();
    if (isClosed()) return;
    let data: Uint8Array;
    if (carry.length === 0) {
      data = chunk;
    } else {
      data = new Uint8Array(carry.length + chunk.length);
      data.set(carry);
      data.set(chunk, carry.length);
    }

    let start = 0;
    for (let index = 0; index < data.length; index += 1) {
      if (data[index] !== LINE_DELIMITER) continue;
      const line = data.subarray(start, index);
      start = index + 1;
      handleLine(line);
      if (isClosed()) {
        carry = EMPTY;
        return;
      }
    }

    const rest = data.subarray(start);
    // 还没见到 LF 就已经装不下一整包：立刻拒，不给对端用无 delimiter 的洪流撑爆缓冲。
    if (rest.length + 1 > MAX_PACKET_BYTES) {
      carry = EMPTY;
      rejectFatal('packet_too_large', '单 packet 连结尾 LF 超过字节上限');
      return;
    }
    carry = rest.length === 0 ? EMPTY : Uint8Array.from(rest);
  }

  function endOfInput(): void {
    assertNotInsideCallback();
    if (isClosed()) return;
    if (carry.length === 0) return;
    carry = EMPTY;
    rejectFatal('invalid_json', 'stdin 在见到 LF 之前结束，尾部是 partial packet');
  }

  // ── outbound（runtime 侧 API）─────────────────────────────────────────────

  function publishAgentEvent(event: OutboundAgentEvent): void {
    const requestId = requireActivePrompt();
    requireNotLatched();
    const currentLeg = requireLeg();

    const publish = (payload: AgentProjectionEvent): void => {
      emit({ sessionId, requestId, type: 'agent_event', payload });
    };

    switch (event.kind) {
      case 'assistant_text_delta':
      case 'assistant_reasoning_delta': {
        if (cancelRequested !== null) {
          throw new ProductSidecarError('cancel 处理后不得再产生新的 delta');
        }
        publish({ kind: event.kind, delta: event.delta });
        return;
      }
      case 'tool_started': {
        if (toolCallIds.has(event.rawToolCallId)) {
          failUpstream();
          return;
        }
        toolCallOrdinal += 1;
        const toolCallId = `tc_${currentLeg}_${toolCallOrdinal}`;
        toolCallIds.set(event.rawToolCallId, toolCallId);
        toolNames.set(toolCallId, event.toolName);
        publish({ kind: 'tool_started', toolCallId, toolName: event.toolName });
        return;
      }
      case 'tool_progress': {
        const toolCallId = toolCallIds.get(event.rawToolCallId);
        if (toolCallId === undefined) {
          failUpstream();
          return;
        }
        publish({ kind: 'tool_progress', toolCallId, toolName: event.toolName });
        return;
      }
      case 'tool_finished': {
        const toolCallId = toolCallIds.get(event.rawToolCallId);
        if (toolCallId === undefined) {
          failUpstream();
          return;
        }
        if (settledWrite !== null && settledWrite.toolCallId === toolCallId) {
          // 已进入 operation_pending 的 write：outcome 只认 host status，上游改型即违约。
          if (event.outcome !== outcomeFromHostStatus(settledWrite.toolName, settledWrite.status)) {
            failUpstream();
            return;
          }
          settledWrite = null;
        }
        publish({ kind: 'tool_finished', toolCallId, toolName: event.toolName, outcome: event.outcome });
        return;
      }
      default: {
        if (event.turn <= observedTurns) {
          throw new ProductSidecarError('observed turn ordinal 必须跨 prompt 与 leg 严格递增');
        }
        observedTurns = event.turn;
        if (event.countedTowardTurnLimit) countedTurns += 1;
        // 费用未知会把累计值传染为 null，不得伪记为零。
        if (event.usage.costUsd === null) usd = null;
        else if (usd !== null) usd += event.usage.costUsd;
        publish({
          kind: 'turn_finished',
          turn: event.turn,
          countedTowardTurnLimit: event.countedTowardTurnLimit,
          usage: event.usage,
          stopReason: event.stopReason,
        });
      }
    }
  }

  /** reserve 与 send 共用的前置门；两段都要在自己那一刻重验，不靠对方兜底。 */
  function requireHostRequestWindow(): { requestId: SafeToken; currentSession: SafeToken } {
    const requestId = requireActivePrompt();
    requireNotLatched();
    const currentSession = sessionId;
    if (currentSession === null) throw new ProductSidecarError('bootstrap 尚未成立，没有 sessionId');
    if (cancelRequested !== null) {
      throw new ProductSidecarError('cancel 处理后不得再发新的 host request');
    }
    if (pending !== null) {
      throw new ProductSidecarError('同一时刻只允许一个在途 host request');
    }
    return { requestId, currentSession };
  }

  function reserveHostOperation(input: HostOperationReservation): SafeToken {
    const { requestId } = requireHostRequestWindow();
    const currentLeg = requireLeg();
    if (!capabilities.includes(input.capability)) {
      throw new ProductSidecarError('未在 ready 宣告的 capability 不得发 host request');
    }
    const toolName = toolNames.get(input.publicToolCallId);
    if (toolName === undefined) {
      throw new ProductSidecarError('reserve 只接受本 leg 已登记的公开 toolCallId');
    }

    // 上一枚未 send 的 reservation 就此烧号：不出 wire、不成为 pending、不得复用。
    operationOrdinal += 1;
    const operationId = `op_${currentLeg}_${operationOrdinal}`;
    reservation = { operationId, requestId, toolCallId: input.publicToolCallId, toolName, capability: input.capability };
    return operationId;
  }

  function sendReservedHostRequest(request: ReservedHostRequest): void {
    const { requestId, currentSession } = requireHostRequestWindow();
    const reserved = reservation;
    if (reserved === null || reserved.operationId !== request.operationId) {
      throw new ProductSidecarError('send 只接受本 prompt 中仍有效的那一枚 reservation');
    }
    if (request.sessionId !== currentSession || request.requestId !== requestId || reserved.requestId !== requestId) {
      throw new ProductSidecarError('reserved request 的 session/request 必须是当前活动 prompt');
    }
    if (reserved.capability !== request.capability) {
      throw new ProductSidecarError('send 的 capability 必须与 reservation 相同');
    }
    // 本票只校验 hash **格式**：frame 拼接归 `workspace-write-env`，不在此复制第二份实现。
    if (!SHA256_HEX_PATTERN.test(request.proposalHash)) {
      throw new ProductSidecarError('proposalHash 必须是小写 64 位 hex');
    }

    // 恰一次复制：同一枚 snapshot 既出包、又做 pending correlation。
    const payload: WorkspaceHostRequest =
      request.capability === 'workspace_write'
        ? {
            operationId: request.operationId,
            proposalHash: request.proposalHash,
            capability: 'workspace_write',
            arguments: {
              logicalPath: request.arguments.logicalPath,
              content: request.arguments.content,
              contentSha256: request.arguments.contentSha256,
              byteLength: request.arguments.byteLength,
            },
          }
        : {
            operationId: request.operationId,
            proposalHash: request.proposalHash,
            capability: 'workspace_read',
            arguments:
              request.arguments.operation === 'list'
                ? { operation: 'list', logicalPath: request.arguments.logicalPath }
                : { operation: request.arguments.operation, logicalPath: request.arguments.logicalPath },
          };

    reservation = null;
    pending = {
      operationId: request.operationId,
      requestId,
      toolCallId: reserved.toolCallId,
      toolName: reserved.toolName,
      capability: payload.capability,
      operation: payload.capability === 'workspace_write' ? 'write' : payload.arguments.operation,
      logicalPath: payload.arguments.logicalPath,
      contentSha256: payload.capability === 'workspace_write' ? payload.arguments.contentSha256 : null,
      byteLength: payload.capability === 'workspace_write' ? payload.arguments.byteLength : null,
    };
    emit({ sessionId: currentSession, requestId, type: 'host_request', payload });
  }

  function finishPrompt(completion: PromptCompletion): void {
    requireActivePrompt();
    requireNotLatched();
    terminate(completion);
  }

  function snapshot(): SessionSnapshot {
    return {
      phase,
      sessionId,
      leg,
      expectedInboundSeq,
      nextOutboundSeq,
      activeRequestId,
      pendingOperationId: pending === null ? null : pending.operationId,
      observedTurns,
      budget: phase === 'awaiting_bootstrap' ? null : budgetView(),
    };
  }

  return {
    receive,
    endOfInput,
    publishAgentEvent,
    reserveHostOperation,
    sendReservedHostRequest,
    finishPrompt,
    snapshot,
  };
}
