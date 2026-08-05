/**
 * `PI-LANE-UI-1` · 账本 → 视图态。
 *
 * 这是本票的**唯一**状态真源：界面上的每一格都从 journal 记录折出来，没有第二本账。
 * 三条纪律逐条落在这里：
 *
 * 1. **决定只认 journal**。点「允许」只是投一枚 command；提案卡的状态在
 *    `authorization_decided` 落账之前一动不动（ADR-009 2026-08-05 窄修订原句）。
 * 2. **未知即拒**。解不出的记录让整条会话进入显式失败态，不静默跳过（总纲不变量 4）。
 * 3. **索引只从 succeeded fold**。`effect_uncertain` 不进成功索引；它的工具卡另有核验动作，
 *    核验结果永远不补写成成功（ADR-022 六-D）。
 */
import {
  decodePiJournalRecord,
  readBoolean,
  readBudget,
  readNumber,
  readObject,
  readString,
  readToolName,
  type PiBudgetView,
  type PiDecodeReason,
  type PiJournalRecord,
  type PiToolName,
} from './pi-journal';

export type PiEffectState = 'started' | 'succeeded' | 'failed' | 'uncertain';

export interface PiWriteProposal {
  readonly operationId: string;
  readonly logicalPath: string;
  readonly byteLength: number;
  readonly contentSha256: string;
  /** `created` ｜ `overwritten`——授权**前**的在场判定结论。 */
  readonly action: string;
}

export interface PiToolCallView {
  readonly toolCallId: string;
  readonly toolName: PiToolName;
  readonly running: boolean;
  /** `tool_finished.outcome`；未收束即 `undefined`。 */
  readonly outcome?: string;
  readonly proposal?: PiWriteProposal;
  readonly decision?: { readonly decision: string; readonly code?: string };
  readonly effect?: {
    readonly state: PiEffectState;
    readonly code?: string;
    readonly logicalPath?: string;
    readonly contentSha256?: string;
    readonly byteLength?: number;
  };
}

export interface PiTerminalView {
  readonly status: string;
  readonly reason?: string;
  readonly error?: { readonly code: string; readonly message: string; readonly retryable: boolean };
  readonly budget?: PiBudgetView;
}

/**
 * 一段里的一块。**保留原始次序**：模型先写一句、再调工具、再写一句，界面就该照这个次序显示。
 * 把文本压成一枚再把工具卡排到前面，读起来是另一件事发生过。
 */
export type PiBlockPart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'reasoning'; readonly text: string }
  | { readonly kind: 'tool'; readonly toolCallId: string };

/** 一段：一枚 `requestId` 的用户输入、模型输出、工具与终态。 */
export interface PiTurnBlockView {
  readonly requestId: string;
  readonly prompt: string;
  /** 全部推理片段的合并（`parts` 保留次序，这一枚供摘要与断言）。 */
  readonly reasoning: string;
  /** 全部正文片段的合并（同上）。 */
  readonly text: string;
  readonly parts: readonly PiBlockPart[];
  readonly toolCallIds: readonly string[];
  readonly terminal?: PiTerminalView;
}

/** 已确认落盘的一份工作稿。**只**由 `effect_succeeded` fold 出，同路径后写覆盖前写。 */
export interface PiDraftEntry {
  readonly logicalPath: string;
  readonly byteLength: number;
  readonly contentSha256: string;
  readonly disposition: string;
  readonly recordedAt: number;
}

export interface PiSessionView {
  readonly containerId: string;
  readonly sessionId: string;
  readonly leg: number;
  readonly modelId?: string;
  readonly maxTurns?: number;
  readonly maxUsd: number | null;
  readonly capabilities: readonly string[];
  readonly blocks: readonly PiTurnBlockView[];
  readonly toolCalls: Readonly<Record<string, PiToolCallView>>;
  /** 最近一次终态带回的预算视图；未跑过即 `undefined`。 */
  readonly budget?: PiBudgetView;
  /** 已计入回合上限的回合数（`countedTowardTurnLimit:true` 才数）。 */
  readonly turns: number;
  /** 尚在等用户回执的那一枚提案；至多一枚（六-C.1：悬置提案只有一枚）。 */
  readonly pendingProposal?: { readonly toolCallId: string } & PiWriteProposal;
  readonly running: boolean;
  readonly drafts: readonly PiDraftEntry[];
  readonly sessionTerminal?: { readonly type: string; readonly detail?: string };
  /** 上一条腿是被中断关掉的——本次是恢复。 */
  readonly interrupted: boolean;
  /** 认不出的记录。非空即**整条会话**进入显式失败态，不接着往下折。 */
  readonly decodeFailure?: { readonly reason: PiDecodeReason; readonly atLine: number };
}

export function emptySessionView(containerId: string, sessionId: string): PiSessionView {
  return {
    containerId,
    sessionId,
    leg: 0,
    maxUsd: null,
    capabilities: [],
    blocks: [],
    toolCalls: {},
    turns: 0,
    running: false,
    drafts: [],
    interrupted: false,
  };
}

interface MutableToolCall {
  toolCallId: string;
  toolName: PiToolName;
  running: boolean;
  outcome?: string;
  proposal?: PiWriteProposal;
  decision?: { decision: string; code?: string };
  effect?: PiToolCallView['effect'];
}

interface MutableBlock {
  requestId: string;
  prompt: string;
  reasoning: string;
  text: string;
  parts: PiBlockPart[];
  toolCallIds: string[];
  terminal?: PiTerminalView;
}

/** 文本／推理片段并进**同族的最后一块**；换族即另起一块，故次序不被合并抹掉。 */
function appendTextPart(block: MutableBlock, kind: 'text' | 'reasoning', delta: string): void {
  const last = block.parts[block.parts.length - 1];
  if (last && last.kind === kind) {
    block.parts[block.parts.length - 1] = { kind, text: last.text + delta };
    return;
  }
  block.parts.push({ kind, text: delta });
}

/**
 * 折一整条会话。**纯函数**：同一串记录恒得同一份视图，故刷新回放与流态推进走的是同一条路径。
 *
 * 增量推进由 {@link foldPiRecords} 在调用方侧以「累计行 → 重折」实现：首版最多 12 回合，
 * 重折的代价是可忽略的，而「增量 reducer 与全量 fold 会不会分叉」这个问题因此**不存在**。
 */
export function foldPiRecords(
  containerId: string,
  sessionId: string,
  lines: readonly string[],
): PiSessionView {
  const base = emptySessionView(containerId, sessionId);
  let leg = base.leg;
  let modelId: string | undefined;
  let maxTurns: number | undefined;
  let maxUsd: number | null = null;
  let capabilities: readonly string[] = [];
  let budget: PiBudgetView | undefined;
  let turns = 0;
  let interrupted = false;
  let sessionTerminal: PiSessionView['sessionTerminal'];
  const blocks: MutableBlock[] = [];
  const toolCalls: Record<string, MutableToolCall> = {};
  const draftsByPath = new Map<string, PiDraftEntry>();
  /** `toolCallId → operationId`：提案是唯一带 operationId 的那一枚记录。 */
  const pendingByToolCall = new Map<string, PiWriteProposal>();
  let openBlock: MutableBlock | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const decoded = decodePiJournalRecord(lines[index]);
    if (!decoded.ok) {
      return { ...base, decodeFailure: { reason: decoded.reason, atLine: index } };
    }
    const record = decoded.record;
    leg = Math.max(leg, record.leg);
    switch (record.type) {
      case 'session_started': {
        const provider = readObject(record.payload, 'provider');
        modelId = provider ? readString(provider, 'modelId') : undefined;
        const limits = readObject(record.payload, 'limits');
        maxTurns = limits ? readNumber(limits, 'maxTurns') : undefined;
        const limitUsd = limits?.maxUsd;
        maxUsd = typeof limitUsd === 'number' ? limitUsd : null;
        capabilities = readCapabilities(record);
        break;
      }
      case 'session_resumed': {
        capabilities = readCapabilities(record);
        turns = readNumber(record.payload, 'priorTurns') ?? turns;
        interrupted = true;
        break;
      }
      case 'user_prompted': {
        openBlock = {
          requestId: record.requestId ?? '',
          prompt: readString(record.payload, 'text') ?? '',
          reasoning: '',
          text: '',
          parts: [],
          toolCallIds: [],
        };
        blocks.push(openBlock);
        break;
      }
      case 'agent_event': {
        applyAgentEvent(record, openBlock, toolCalls);
        break;
      }
      case 'tool_proposed': {
        const toolCallId = readString(record.payload, 'toolCallId');
        const proposal = readProposal(record);
        if (toolCallId && proposal) {
          pendingByToolCall.set(toolCallId, proposal);
          const call = ensureToolCall(toolCalls, toolCallId, 'write');
          call.proposal = proposal;
        }
        break;
      }
      case 'authorization_decided': {
        const toolCallId = readString(record.payload, 'toolCallId');
        const decision = readString(record.payload, 'decision');
        if (toolCallId && decision) {
          pendingByToolCall.delete(toolCallId);
          const call = ensureToolCall(toolCalls, toolCallId, 'write');
          const code = readString(record.payload, 'code');
          call.decision = { decision, ...(code ? { code } : {}) };
        }
        break;
      }
      case 'effect_started':
      case 'effect_succeeded':
      case 'effect_failed':
      case 'effect_uncertain': {
        const toolCallId = readString(record.payload, 'toolCallId');
        if (!toolCallId) break;
        const call = ensureToolCall(toolCalls, toolCallId, 'write');
        const state = EFFECT_STATE[record.type];
        const code = readString(record.payload, 'code');
        const logicalPath = readString(record.payload, 'logicalPath');
        const contentSha256 = readString(record.payload, 'contentSha256');
        const byteLength = readNumber(record.payload, 'byteLength');
        call.effect = {
          state,
          ...(code ? { code } : {}),
          ...(logicalPath ? { logicalPath } : {}),
          ...(contentSha256 ? { contentSha256 } : {}),
          ...(byteLength !== undefined ? { byteLength } : {}),
        };
        // 索引只从 succeeded fold；`uncertain` 与 `failed` 都不进（ADR-022 六-D）。
        if (
          record.type === 'effect_succeeded' &&
          logicalPath &&
          contentSha256 &&
          byteLength !== undefined
        ) {
          draftsByPath.set(logicalPath, {
            logicalPath,
            byteLength,
            contentSha256,
            disposition: readString(record.payload, 'disposition') ?? 'created',
            recordedAt: record.recordedAt,
          });
        }
        break;
      }
      case 'turn_usage_recorded': {
        if (readBoolean(record.payload, 'countedTowardTurnLimit')) turns += 1;
        break;
      }
      case 'prompt_completed':
      case 'prompt_failed':
      case 'prompt_canceled':
      case 'prompt_budget_stopped': {
        const nextBudget = readBudget(record.payload);
        if (nextBudget) budget = nextBudget;
        const terminal: PiTerminalView = {
          status: readString(record.payload, 'status') ?? record.type,
          ...(readString(record.payload, 'reason')
            ? { reason: readString(record.payload, 'reason') }
            : {}),
          ...(readError(record) ? { error: readError(record) } : {}),
          ...(nextBudget ? { budget: nextBudget } : {}),
        };
        const target = blocks.find((block) => block.requestId === (record.requestId ?? ''));
        if (target) target.terminal = terminal;
        openBlock = undefined;
        break;
      }
      case 'session_completed':
      case 'session_budget_stopped':
      case 'session_failed': {
        sessionTerminal = { type: record.type, ...readSessionDetail(record) };
        break;
      }
      case 'session_interrupted': {
        // 中断只关这一条腿；恢复由下一枚 `session_resumed` 记。
        openBlock = undefined;
        break;
      }
    }
  }

  const pendingEntry = [...pendingByToolCall.entries()][0];
  const running = blocks.some((block) => !block.terminal) && !sessionTerminal;
  return {
    ...base,
    leg,
    ...(modelId ? { modelId } : {}),
    ...(maxTurns !== undefined ? { maxTurns } : {}),
    maxUsd,
    capabilities,
    blocks: blocks.map((block) => ({
      ...block,
      parts: [...block.parts],
      toolCallIds: [...block.toolCallIds],
    })),
    toolCalls: Object.fromEntries(
      Object.entries(toolCalls).map(([id, call]) => [id, { ...call }]),
    ),
    ...(budget ? { budget } : {}),
    turns,
    ...(pendingEntry ? { pendingProposal: { toolCallId: pendingEntry[0], ...pendingEntry[1] } } : {}),
    running,
    drafts: [...draftsByPath.values()].sort((left, right) =>
      left.logicalPath.localeCompare(right.logicalPath),
    ),
    ...(sessionTerminal ? { sessionTerminal } : {}),
    interrupted,
  };
}

const EFFECT_STATE: Record<string, PiEffectState> = {
  effect_started: 'started',
  effect_succeeded: 'succeeded',
  effect_failed: 'failed',
  effect_uncertain: 'uncertain',
};

function ensureToolCall(
  table: Record<string, MutableToolCall>,
  toolCallId: string,
  fallbackName: PiToolName,
): MutableToolCall {
  const existing = table[toolCallId];
  if (existing) return existing;
  const created: MutableToolCall = { toolCallId, toolName: fallbackName, running: true };
  table[toolCallId] = created;
  return created;
}

function applyAgentEvent(
  record: PiJournalRecord,
  block: MutableBlock | undefined,
  toolCalls: Record<string, MutableToolCall>,
): void {
  const kind = readString(record.payload, 'kind');
  if (kind === 'assistant_text_delta') {
    const delta = readString(record.payload, 'delta') ?? '';
    if (block && delta) {
      block.text += delta;
      appendTextPart(block, 'text', delta);
    }
    return;
  }
  if (kind === 'assistant_reasoning_delta') {
    const delta = readString(record.payload, 'delta') ?? '';
    if (block && delta) {
      block.reasoning += delta;
      appendTextPart(block, 'reasoning', delta);
    }
    return;
  }
  const toolCallId = readString(record.payload, 'toolCallId');
  const toolName = readToolName(record.payload, 'toolName');
  if (!toolCallId || !toolName) return;
  const call = ensureToolCall(toolCalls, toolCallId, toolName);
  call.toolName = toolName;
  if (kind === 'tool_started' || kind === 'tool_progress') {
    call.running = true;
    rememberToolCall(block, toolCallId);
    return;
  }
  if (kind === 'tool_finished') {
    call.running = false;
    call.outcome = readString(record.payload, 'outcome');
    rememberToolCall(block, toolCallId);
  }
}

function rememberToolCall(block: MutableBlock | undefined, toolCallId: string): void {
  if (!block || block.toolCallIds.includes(toolCallId)) return;
  block.toolCallIds.push(toolCallId);
  block.parts.push({ kind: 'tool', toolCallId });
}

function readCapabilities(record: PiJournalRecord): readonly string[] {
  const value = record.payload.capabilities;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readProposal(record: PiJournalRecord): PiWriteProposal | undefined {
  const operationId = record.operationId;
  const logicalPath = readString(record.payload, 'logicalPath');
  const contentSha256 = readString(record.payload, 'contentSha256');
  const byteLength = readNumber(record.payload, 'byteLength');
  const action = readString(record.payload, 'action');
  if (!operationId || !logicalPath || !contentSha256 || byteLength === undefined || !action) {
    return undefined;
  }
  return { operationId, logicalPath, byteLength, contentSha256, action };
}

function readError(record: PiJournalRecord): PiTerminalView['error'] | undefined {
  const error = readObject(record.payload, 'error');
  if (!error) return undefined;
  const code = readString(error, 'code');
  const message = readString(error, 'message');
  const retryable = readBoolean(error, 'retryable');
  if (!code || message === undefined || retryable === undefined) return undefined;
  return { code, message, retryable };
}

function readSessionDetail(record: PiJournalRecord): { detail?: string } {
  const cause = readObject(record.payload, 'cause');
  if (cause) {
    const code = readString(cause, 'code');
    const kind = readString(cause, 'kind');
    return { detail: code ?? kind ?? undefined };
  }
  const reason = readString(record.payload, 'reason');
  return reason ? { detail: reason } : {};
}
