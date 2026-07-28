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
  decodeHostPacketLine,
  encodePacketLine,
  utf8ByteLength,
  type AgentProjectionEvent,
  type BootstrapPacket,
  type BootstrapPayload,
  type BudgetView,
  type CancelReason,
  type HostResultPayload,
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
  type WorkspaceOperation,
  type WorkspaceReadArguments,
  type WorkspaceRequestArguments,
  type WorkspaceWriteArguments,
} from './product-protocol.js';

/** runtime 侧的编程契约被违反时抛出；wire 侧违反走 `protocol_error`，两者不混。 */
export class ProductSidecarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductSidecarError';
  }
}

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

/**
 * proposalHash 由注入件计算。ADR-022 六-B.2 的 frame 拼接归
 * `PI-WRITE-PROOF-1` 的 `workspace-write-env` 所有；本票只铸 operationId、校验 **hash 格式**，
 * 不复制第二份 hash 实现。
 */
export type ProposalHasher = (input: {
  capability: 'workspace_write' | 'workspace_read';
  sessionId: SafeToken;
  requestId: SafeToken;
  operationId: SafeToken;
  arguments: WorkspaceRequestArguments;
}) => string;

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

export type OutboundHostRequest =
  | { capability: 'workspace_write'; arguments: WorkspaceWriteArguments }
  | { capability: 'workspace_read'; arguments: WorkspaceReadArguments };

/** runtime 报告的原始收束；最终 terminal 仍由状态机按 ADR 优先级矩阵裁定。 */
export type PromptCompletion =
  | { kind: 'completed' }
  | { kind: 'failed'; code: TerminalFailureCode; message: string; retryable: boolean };

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
  hashProposal: ProposalHasher;
}

export interface ProductSidecarSession {
  /** 喂 stdin 字节。允许任意切分，framer 自行拼行。 */
  receive(chunk: Uint8Array): void;
  /** stdin 结束。缓冲区非空即 partial packet，fatal。 */
  endOfInput(): void;

  publishAgentEvent(event: OutboundAgentEvent): void;
  /** 铸 op、发 `host_request`，返回 operationId。只有真发包才分配 op。 */
  requestHost(request: OutboundHostRequest): SafeToken;
  finishPrompt(completion: PromptCompletion): void;

  snapshot(): SessionSnapshot;
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
  const { transport, runtime, hashProposal } = options;

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
  const resolvedOperationIds = new Set<SafeToken>();
  let pending: { operationId: SafeToken; capability: WorkspaceCapability; operation: WorkspaceOperation } | null =
    null;
  let toolCallOrdinal = 0;
  let operationOrdinal = 0;

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
  function resolveTerminal(completion: PromptCompletion, budget: BudgetView): Terminal {
    if (effectUncertain) {
      return {
        status: 'failed',
        error: { code: 'effect_uncertain', message: '目标可能已是完整新版本，落盘无法证明', retryable: false },
        budget,
      };
    }
    if (maxUsd !== null && usd === null) {
      return {
        status: 'failed',
        error: { code: 'budget_unknown', message: '已启用金额限额，但存在费用未知的回合', retryable: false },
        budget,
      };
    }
    if (budget.turnLimit === 'reached' || budget.usdLimit === 'reached') {
      return {
        status: 'budget_stopped',
        budget: { ...budget, stopReason: budget.turnLimit === 'reached' ? 'turns' : 'usd' },
      };
    }
    if (cancelRequested !== null) {
      return { status: 'canceled', reason: cancelRequested, budget };
    }
    if (completion.kind === 'completed') return { status: 'completed', budget };
    return {
      status: 'failed',
      error: { code: completion.code, message: clampMessage(completion.message), retryable: completion.retryable },
      budget,
    };
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

  /** `force` 只给 upstream 事件违约用：那条路本身就已把 prompt 判死，不再等在途 operation。 */
  function terminate(completion: PromptCompletion, force = false): void {
    if (pending !== null && !force) {
      throw new ProductSidecarError('在途 host request 未收束前不得发 terminal');
    }
    const requestId = activeRequestId;
    const terminal = resolveTerminal(completion, budgetView());
    activeRequestId = null;
    lastTerminatedRequestId = requestId;
    pending = null;
    cancelRequested = null;
    effectUncertain = false;
    if (!emit({ sessionId, requestId, type: 'terminal', payload: terminal })) return;
    phase = closesSession(terminal) ? 'closed' : 'idle';
  }

  function failUpstream(): void {
    terminate(
      {
        kind: 'failed',
        code: 'upstream_event_unsupported',
        message: '上游事件序列不在投影闭集内',
        retryable: false,
      },
      true,
    );
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
    capabilities = normalizeCapabilities(runtime.capabilities(payload));
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
    phase = 'prompting';
    runtime.startPrompt({ requestId, text });
  }

  function handleCancel(requestId: SafeToken, reason: CancelReason): void {
    if (canceledRequestIds.has(requestId)) {
      rejectFatal('state_violation', '同一 request 的 cancel 最多一次');
      return;
    }
    if (phase === 'prompting' && requestId === activeRequestId) {
      canceledRequestIds.add(requestId);
      cancelRequested = reason;
      runtime.cancel({ requestId, reason });
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
    if (payload.capability !== pending.capability || payload.operation !== pending.operation) {
      rejectFatal('request_mismatch', 'host_result 的 capability/operation 必须与待办完全相同');
      return;
    }
    resolvedOperationIds.add(payload.operationId);
    pending = null;
    if (payload.status === 'uncertain') effectUncertain = true;
    runtime.deliverHostResult(payload);
  }

  function handleShutdown(): void {
    if (phase !== 'idle') {
      rejectFatal('state_violation', 'shutdown 只能在 idle 发出');
      return;
    }
    runtime.shutdown();
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
    if (isClosed()) return;
    if (carry.length === 0) return;
    carry = EMPTY;
    rejectFatal('invalid_json', 'stdin 在见到 LF 之前结束，尾部是 partial packet');
  }

  // ── outbound（runtime 侧 API）─────────────────────────────────────────────

  function publishAgentEvent(event: OutboundAgentEvent): void {
    const requestId = requireActivePrompt();
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

  function requestHost(request: OutboundHostRequest): SafeToken {
    const requestId = requireActivePrompt();
    const currentLeg = requireLeg();
    const currentSession = sessionId;
    if (currentSession === null) throw new ProductSidecarError('bootstrap 尚未成立，没有 sessionId');
    if (cancelRequested !== null) {
      throw new ProductSidecarError('cancel 处理后不得再发新的 host request');
    }
    if (pending !== null) {
      throw new ProductSidecarError('同一时刻只允许一个在途 host request');
    }
    if (!capabilities.includes(request.capability)) {
      throw new ProductSidecarError('未在 ready 宣告的 capability 不得发 host request');
    }

    operationOrdinal += 1;
    const operationId = `op_${currentLeg}_${operationOrdinal}`;
    const operation: WorkspaceOperation =
      request.capability === 'workspace_write' ? 'write' : request.arguments.operation;
    const proposalHash = hashProposal({
      capability: request.capability,
      sessionId: currentSession,
      requestId,
      operationId,
      arguments: request.arguments,
    });

    pending = { operationId, capability: request.capability, operation };
    emit({
      sessionId: currentSession,
      requestId,
      type: 'host_request',
      payload:
        request.capability === 'workspace_write'
          ? { operationId, proposalHash, capability: 'workspace_write', arguments: request.arguments }
          : { operationId, proposalHash, capability: 'workspace_read', arguments: request.arguments },
    });
    return operationId;
  }

  function finishPrompt(completion: PromptCompletion): void {
    requireActivePrompt();
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

  return { receive, endOfInput, publishAgentEvent, requestHost, finishPrompt, snapshot };
}
