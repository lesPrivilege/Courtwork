import { describe, expect, it } from 'vitest';

import {
  decodeSidecarPacketLine,
  encodePacketLine,
  type BootstrapPayload,
  type HostResultPayload,
  type ProductPacket,
  type SidecarPacket,
  type WorkspaceCapability,
  type WorkspaceReadArguments,
  type WorkspaceWriteArguments,
} from './product-protocol.js';
import {
  ProductSidecarError,
  createProductSidecarSession,
  type OutboundAgentEvent,
  type ProductSidecarSession,
  type PromptCompletion,
  type ReservedHostRequest,
} from './product-stdio.js';

/**
 * ADR-022 六-B.1 的状态机反例册。
 *
 * 两条 canary 贯穿全册：宿主给的 `apiKey` 与 `caseRoot` 一旦出现在任何写出的字节或
 * 任何错误文案里，即红。
 */

const SESSION = 'sess-1';
const HASH = 'b'.repeat(64);
const CANARY_KEY = 'sk-canary-DO-NOT-LEAK-0001';
const CANARY_ROOT = '/Users/canary/绝密案卷根';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

function bootstrapPayload(overrides: Partial<BootstrapPayload> = {}): BootstrapPayload {
  return {
    containerId: 'ctn-1',
    grantId: 'grant-1',
    caseRoot: CANARY_ROOT,
    provider: { id: 'deepseek', modelId: 'deepseek-v4-pro', apiKey: CANARY_KEY },
    limits: { maxTurns: 12, maxUsd: 0.5 },
    resume: { kind: 'fresh', leg: 1, priorObservedTurns: 0, priorTurns: 0, priorUsd: 0 },
    ...overrides,
  };
}

type Harness = ReturnType<typeof createHarness>;

function createHarness(options: { capabilities?: WorkspaceCapability[]; hash?: string } = {}) {
  const lines: Uint8Array[] = [];
  const exits: number[] = [];
  const calls: string[] = [];
  const hooks: {
    capabilities?: (payload: BootstrapPayload, session: ProductSidecarSession) => void;
    startPrompt?: (prompt: { requestId: string; text: string }, session: ProductSidecarSession) => void;
    cancel?: (cancel: { requestId: string; reason: 'user' | 'host' }, session: ProductSidecarSession) => void;
    deliverHostResult?: (result: HostResultPayload, session: ProductSidecarSession) => void;
    shutdown?: (session: ProductSidecarSession) => void;
  } = {};

  const session = createProductSidecarSession({
    transport: {
      write: (line) => void lines.push(line),
      exit: (code) => void exits.push(code),
    },
    runtime: {
      capabilities: (payload) => {
        calls.push('capabilities');
        hooks.capabilities?.(payload, session);
        return options.capabilities ?? ['workspace_write', 'case_read', 'workspace_read'];
      },
      startPrompt: (prompt) => {
        calls.push(`startPrompt:${prompt.requestId}`);
        hooks.startPrompt?.(prompt, session);
      },
      cancel: (cancel) => {
        calls.push(`cancel:${cancel.requestId}:${cancel.reason}`);
        hooks.cancel?.(cancel, session);
      },
      deliverHostResult: (result) => {
        calls.push(`hostResult:${result.operationId}:${result.status}`);
        hooks.deliverHostResult?.(result, session);
      },
      shutdown: () => {
        calls.push('shutdown');
        hooks.shutdown?.(session);
      },
    },
  });

  let seq = 0;
  const nextSeq = (): number => (seq += 1);

  const sendRaw = (text: string): void => session.receive(encoder.encode(text));
  const sendBytes = (bytes: Uint8Array): void => session.receive(bytes);
  const send = (packet: Record<string, unknown> & { seq?: number }): void => {
    const full = { protocolVersion: 1, seq: packet.seq ?? nextSeq(), ...packet } as ProductPacket;
    const encoded = encodePacketLine(full);
    if (!encoded.ok) throw new Error(`fixture 编码失败：${encoded.code}／${encoded.reason}`);
    session.receive(encoded.line);
  };

  const out = (): SidecarPacket[] =>
    lines.map((line) => {
      const decoded = decodeSidecarPacketLine(line.subarray(0, line.length - 1));
      if (!decoded.ok) throw new Error(`sidecar 写出了自己都解不了的包：${decoded.code}／${decoded.reason}`);
      return decoded.packet;
    });

  const allText = (): string => lines.map((line) => decoder.decode(line)).join('');

  return { session, send, sendRaw, sendBytes, out, allText, exits, calls, lines, hooks, nextSeq };
}

function bootstrap(harness: Harness, payload: BootstrapPayload = bootstrapPayload()): void {
  harness.send({ sessionId: SESSION, requestId: null, type: 'bootstrap', payload });
}

function prompt(harness: Harness, requestId: string, text = '概括一下'): void {
  harness.send({ sessionId: SESSION, requestId, type: 'prompt', payload: { text } });
}

function cancel(harness: Harness, requestId: string, reason: 'user' | 'host' = 'user'): void {
  harness.send({ sessionId: SESSION, requestId, type: 'cancel', payload: { reason } });
}

function hostResult(harness: Harness, payload: HostResultPayload, requestId = 'req-1'): void {
  harness.send({ sessionId: SESSION, requestId, type: 'host_result', payload });
}

type OutboundHostRequest =
  | { capability: 'workspace_write'; arguments: WorkspaceWriteArguments }
  | { capability: 'workspace_read'; arguments: WorkspaceReadArguments };

const WRITE_REQUEST: OutboundHostRequest = {
  capability: 'workspace_write',
  arguments: { logicalPath: 'brief.md', content: '正文', contentSha256: 'c'.repeat(64), byteLength: 6 },
};

const READ_REQUEST: OutboundHostRequest = {
  capability: 'workspace_read',
  arguments: { operation: 'read_file', logicalPath: 'notes.md' },
};

/**
 * 两段式接缝的调用侧替身：模拟 `workspace-write-env`——registry 先铸 op，hasher 再算 hash，
 * 最后把**同一枚** request 原样交给状态机。测试全册只经此路发 host request。
 */
function requestHost(
  session: ProductSidecarSession,
  request: OutboundHostRequest,
  options: { toolCallId?: string; requestId?: string; sessionId?: string; proposalHash?: string } = {},
): string {
  const operationId = session.reserveHostOperation({
    publicToolCallId: options.toolCallId ?? 'tc_1_1',
    capability: request.capability,
  });
  session.sendReservedHostRequest({
    sessionId: options.sessionId ?? SESSION,
    requestId: options.requestId ?? 'req-1',
    operationId,
    proposalHash: options.proposalHash ?? HASH,
    ...request,
  } as ReservedHostRequest);
  return operationId;
}

/** 绝大多数反例只需要「有一枚已登记的公开 tc」这一前置事实。 */
function startTool(session: ProductSidecarSession, toolName: 'read' | 'write' = 'write', rawId = 'call_w'): void {
  session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: rawId, toolName });
}

function writeOk(operationId: string): HostResultPayload {
  return {
    operationId,
    capability: 'workspace_write',
    operation: 'write',
    status: 'ok',
    value: { logicalPath: 'brief.md', disposition: 'created', contentSha256: 'c'.repeat(64), byteLength: 6 },
  };
}

function readOk(operationId: string): HostResultPayload {
  return {
    operationId,
    capability: 'workspace_read',
    operation: 'read_file',
    status: 'ok',
    value: { logicalPath: 'notes.md', content: '正文', contentSha256: 'c'.repeat(64), byteLength: 6 },
  };
}

function writeUncertain(operationId: string): HostResultPayload {
  return {
    operationId,
    capability: 'workspace_write',
    operation: 'write',
    status: 'uncertain',
    error: { code: 'durability_unknown', message: '屏障未确认' },
  };
}

function turnEvent(turn: number, counted: boolean, costUsd: number | null, stopReason: 'stop' | 'aborted' = 'stop') {
  return {
    kind: 'turn_finished' as const,
    turn,
    countedTowardTurnLimit: counted,
    usage: {
      inputTokens: costUsd === null ? null : 10,
      outputTokens: costUsd === null ? null : 5,
      cacheReadTokens: costUsd === null ? null : 0,
      cacheWriteTokens: costUsd === null ? null : 0,
      costUsd,
    },
    stopReason,
  };
}

function lastPacket(harness: Harness): SidecarPacket {
  const packets = harness.out();
  return packets[packets.length - 1];
}

// ── bootstrap / ready ────────────────────────────────────────────────────────

describe('bootstrap 与 ready', () => {
  it('有效 bootstrap 后首枚 sidecar 包是 seq:1 ready，capabilities 去重且字典序', () => {
    const h = createHarness({ capabilities: ['workspace_write', 'case_read', 'workspace_write'] });
    bootstrap(h);
    expect(h.out()).toEqual([
      {
        protocolVersion: 1,
        seq: 1,
        sessionId: SESSION,
        requestId: null,
        type: 'ready',
        payload: { capabilities: ['case_read', 'workspace_write'] },
      },
    ]);
    expect(h.exits).toEqual([]);
    expect(h.session.snapshot()).toMatchObject({ phase: 'idle', sessionId: SESSION, leg: 1 });
  });

  it('首包不是 bootstrap → seq:1 / sessionId:null 的 fatal protocol_error 取代 ready，并非零退出', () => {
    const h = createHarness();
    prompt(h, 'req-1');
    const packets = h.out();
    expect(packets).toHaveLength(1);
    expect(packets[0]).toMatchObject({
      seq: 1,
      sessionId: null,
      requestId: null,
      type: 'protocol_error',
      payload: { code: 'state_violation', fatal: true },
    });
    expect(h.exits).toEqual([1]);
  });

  it('bootstrap 前的非法 JSON 同样用 null session 的 seq:1 protocol_error 取代 ready', () => {
    const h = createHarness();
    h.sendRaw('{ 不是 JSON\n');
    expect(h.out()[0]).toMatchObject({ seq: 1, sessionId: null, type: 'protocol_error', payload: { code: 'invalid_json' } });
    expect(h.exits).toEqual([1]);
  });

  it('bootstrap schema 失败也走同一条 null-session 路径', () => {
    const h = createHarness();
    h.sendRaw(
      `{"protocolVersion":1,"seq":1,"sessionId":"${SESSION}","requestId":null,"type":"bootstrap","payload":{"containerId":"ctn-1"}}\n`,
    );
    expect(h.out()[0]).toMatchObject({ sessionId: null, payload: { code: 'invalid_schema' } });
    expect(h.exits).toEqual([1]);
  });

  it('bootstrap 的 seq 必须是 1', () => {
    const h = createHarness();
    h.send({ sessionId: SESSION, requestId: null, type: 'bootstrap', payload: bootstrapPayload(), seq: 2 });
    expect(h.out()[0]).toMatchObject({ payload: { code: 'seq_mismatch' } });
    expect(h.exits).toEqual([1]);
  });

  it('第二枚 bootstrap 是 state_violation', () => {
    const h = createHarness();
    bootstrap(h);
    h.send({ sessionId: SESSION, requestId: null, type: 'bootstrap', payload: bootstrapPayload() });
    expect(lastPacket(h)).toMatchObject({ sessionId: SESSION, payload: { code: 'state_violation' } });
    expect(h.exits).toEqual([1]);
  });

  it('从宿主给定的 prior 初始化累计器，不从零重开', () => {
    const h = createHarness();
    bootstrap(
      h,
      bootstrapPayload({
        limits: { maxTurns: 12, maxUsd: 5 },
        resume: { kind: 'after_interruption', leg: 3, priorObservedTurns: 7, priorTurns: 4, priorUsd: 1.25 },
      }),
    );
    expect(h.session.snapshot()).toMatchObject({
      leg: 3,
      observedTurns: 7,
      budget: { turns: 4, usd: 1.25, turnLimit: 'open', usdLimit: 'open', stopReason: null },
    });
  });
});

// ── framing / seq / session ──────────────────────────────────────────────────

describe('framing 与双向 seq', () => {
  it('inbound seq 跳号与重复都是 seq_mismatch', () => {
    const skipped = createHarness();
    bootstrap(skipped);
    skipped.send({ sessionId: SESSION, requestId: 'req-1', type: 'prompt', payload: { text: 'a' }, seq: 3 });
    expect(lastPacket(skipped)).toMatchObject({ payload: { code: 'seq_mismatch' } });

    const repeated = createHarness();
    bootstrap(repeated);
    repeated.send({ sessionId: SESSION, requestId: 'req-1', type: 'prompt', payload: { text: 'a' }, seq: 1 });
    expect(lastPacket(repeated)).toMatchObject({ payload: { code: 'seq_mismatch' } });
  });

  it('outbound seq 每发一包加一，含 error', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' });
      session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '乙' });
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    expect(h.out().map((packet) => packet.seq)).toEqual([1, 2, 3, 4]);
    expect(h.session.snapshot().nextOutboundSeq).toBe(5);
  });

  it('session 错配是 session_mismatch', () => {
    const h = createHarness();
    bootstrap(h);
    h.send({ sessionId: 'sess-2', requestId: 'req-1', type: 'prompt', payload: { text: 'a' } });
    expect(lastPacket(h)).toMatchObject({ sessionId: SESSION, payload: { code: 'session_mismatch' } });
  });

  it('分片到达可拼行；一行超 framing 立即 packet_too_large', () => {
    const split = createHarness();
    const encoded = encodePacketLine({
      protocolVersion: 1,
      seq: 1,
      sessionId: SESSION,
      requestId: null,
      type: 'bootstrap',
      payload: bootstrapPayload(),
    });
    if (!encoded.ok) throw new Error('fixture 编码失败');
    split.sendBytes(encoded.line.subarray(0, 10));
    expect(split.out()).toHaveLength(0);
    split.sendBytes(encoded.line.subarray(10));
    expect(split.out()[0].type).toBe('ready');

    const huge = createHarness();
    huge.sendRaw(`{"pad":"${'a'.repeat(1_048_600)}"}\n`);
    expect(huge.out()[0]).toMatchObject({ payload: { code: 'packet_too_large' } });
    expect(huge.exits).toEqual([1]);
  });

  it('EOF 前未见 LF 的 partial packet 拒绝；干净 EOF 不造错', () => {
    const partial = createHarness();
    bootstrap(partial);
    partial.sendRaw('{"protocolVersion":1');
    partial.session.endOfInput();
    expect(lastPacket(partial)).toMatchObject({ payload: { code: 'invalid_json' } });
    expect(partial.exits).toEqual([1]);

    const clean = createHarness();
    bootstrap(clean);
    clean.session.endOfInput();
    expect(clean.out()).toHaveLength(1);
    expect(clean.exits).toEqual([]);
  });

  it('fatal 之后不再收发', () => {
    const h = createHarness();
    bootstrap(h);
    h.send({ sessionId: 'sess-2', requestId: 'req-1', type: 'prompt', payload: { text: 'a' } });
    const after = h.out().length;
    prompt(h, 'req-2');
    expect(h.out()).toHaveLength(after);
    expect(h.exits).toEqual([1]);
    expect(h.session.snapshot().phase).toBe('closed');
  });
});

// ── prompt 与 agent event 投影 ───────────────────────────────────────────────

describe('prompt 与 agent event', () => {
  it('prompt 转交 runtime，事件回同一 requestId', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' });
    };
    prompt(h, 'req-1', '把纪要概括成三条');
    expect(h.calls).toContain('startPrompt:req-1');
    expect(h.out()[1]).toMatchObject({
      requestId: 'req-1',
      type: 'agent_event',
      payload: { kind: 'assistant_text_delta', delta: '甲' },
    });
  });

  it('tc 在 tool_started 首见 raw id 时分配，raw id 零出 wire', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_abc123', toolName: 'write' });
      session.publishAgentEvent({ kind: 'tool_progress', rawToolCallId: 'call_abc123', toolName: 'write' });
      // 每 prompt 至多一枚未 finished tc：第二件工具必须等第一件闭合。
      // 这枚 write 尚无 operation，故只有本地可判定的 failed/denied 可信。
      session.publishAgentEvent({
        kind: 'tool_finished',
        rawToolCallId: 'call_abc123',
        toolName: 'write',
        outcome: 'failed',
      });
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_def456', toolName: 'read' });
    };
    prompt(h, 'req-1');
    const ids = h
      .out()
      .filter((packet) => packet.type === 'agent_event')
      .map((packet) => (packet.payload as { toolCallId?: string }).toolCallId);
    expect(ids).toEqual(['tc_1_1', 'tc_1_1', 'tc_1_1', 'tc_1_2']);
    expect(h.allText()).not.toContain('call_abc123');
    expect(h.allText()).not.toContain('call_def456');
  });

  it('tc 带 leg 前缀，恢复后的新 leg 从 1 重排但不撞号', () => {
    const h = createHarness();
    bootstrap(
      h,
      bootstrapPayload({
        resume: { kind: 'after_interruption', leg: 4, priorObservedTurns: 2, priorTurns: 2, priorUsd: 0.1 },
      }),
    );
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_x', toolName: 'glob' });
    };
    prompt(h, 'req-9');
    expect((h.out()[1].payload as { toolCallId: string }).toolCallId).toBe('tc_4_1');
  });

  it('本 leg raw id 重复 → upstream_event_unsupported 终止', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_x', toolName: 'read' });
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_x', toolName: 'read' });
    };
    prompt(h, 'req-1');
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'failed', error: { code: 'upstream_event_unsupported', retryable: false } },
    });
  });

  it('start 之前先见 progress / finished → upstream_event_unsupported', () => {
    for (const kind of ['tool_progress', 'tool_finished'] as const) {
      const h = createHarness();
      bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
      h.hooks.startPrompt = (_p, session) => {
        session.publishAgentEvent(
          kind === 'tool_progress'
            ? { kind, rawToolCallId: 'call_x', toolName: 'read' }
            : { kind, rawToolCallId: 'call_x', toolName: 'read', outcome: 'succeeded' },
        );
      };
      prompt(h, 'req-1');
      expect(lastPacket(h), kind).toMatchObject({
        payload: { status: 'failed', error: { code: 'upstream_event_unsupported' } },
      });
    }
  });

  it('上游违约一律把累计 usd 传染 null：启用 maxUsd 时 budget_unknown 反压过 upstream 失败', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: 0.5 } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent(turnEvent(1, true, 0.01));
      session.publishAgentEvent({ kind: 'tool_progress', rawToolCallId: 'call_ghost', toolName: 'read' });
    };
    prompt(h, 'req-1');
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: {
        status: 'failed',
        error: { code: 'budget_unknown', retryable: false },
        budget: { usd: null, usdLimit: 'unknown' },
      },
    });
  });

  it('没有活动 prompt 时 publish 即抛', () => {
    const h = createHarness();
    bootstrap(h);
    expect(() => h.session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' })).toThrow(
      ProductSidecarError,
    );
  });

  it('observed turn 必须严格递增，且从 priorObservedTurns 起算', () => {
    const h = createHarness();
    bootstrap(
      h,
      bootstrapPayload({
        resume: { kind: 'after_interruption', leg: 2, priorObservedTurns: 5, priorTurns: 3, priorUsd: 0.2 },
      }),
    );
    h.hooks.startPrompt = (_p, session) => {
      expect(() => session.publishAgentEvent(turnEvent(5, true, 0.01))).toThrow(ProductSidecarError);
      session.publishAgentEvent(turnEvent(6, true, 0.01));
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    expect(h.session.snapshot()).toMatchObject({ observedTurns: 6, budget: { turns: 4 } });
  });

  it('prompting 中再发 prompt 是 state_violation', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = () => {};
    prompt(h, 'req-1');
    prompt(h, 'req-2');
    expect(lastPacket(h)).toMatchObject({ payload: { code: 'state_violation' } });
  });

  it('本 leg requestId 复用是 duplicate_id', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => session.finishPrompt({ kind: 'completed' });
    prompt(h, 'req-1');
    prompt(h, 'req-1');
    expect(lastPacket(h)).toMatchObject({ payload: { code: 'duplicate_id' } });
  });
});

// ── host request / result correlation ────────────────────────────────────────

describe('host correlation', () => {
  function withPendingWrite(): { h: Harness; operationId: string } {
    const h = createHarness();
    bootstrap(h);
    let operationId = '';
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      operationId = requestHost(session, WRITE_REQUEST);
    };
    prompt(h, 'req-1');
    return { h, operationId };
  }

  it('op 只在真发 host_request 时分配，且带 leg 前缀', () => {
    const { h, operationId } = withPendingWrite();
    expect(operationId).toBe('op_1_1');
    expect(h.out()[2]).toMatchObject({
      type: 'host_request',
      requestId: 'req-1',
      payload: { operationId: 'op_1_1', proposalHash: HASH, capability: 'workspace_write' },
    });
    expect(h.session.snapshot().pendingOperationId).toBe('op_1_1');
  });

  it('tool_started 本身不分配 op', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_w', toolName: 'write', outcome: 'failed' });
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    expect(h.out().some((packet) => packet.type === 'host_request')).toBe(false);
    expect(h.allText()).not.toContain('op_1_1');
  });

  it('host_result 回同一 op 即回灌 runtime；第二枚同 op 是 duplicate_id', () => {
    const { h } = withPendingWrite();
    hostResult(h, writeOk('op_1_1'));
    expect(h.calls).toContain('hostResult:op_1_1:ok');
    hostResult(h, writeOk('op_1_1'));
    expect(lastPacket(h)).toMatchObject({ payload: { code: 'duplicate_id' } });
  });

  it('未知 op / capability 或 operation 与待办不符都是 request_mismatch', () => {
    const unknown = withPendingWrite();
    hostResult(unknown.h, writeOk('op_1_9'));
    expect(lastPacket(unknown.h)).toMatchObject({ payload: { code: 'request_mismatch' } });

    const mismatched = withPendingWrite();
    hostResult(mismatched.h, {
      operationId: 'op_1_1',
      capability: 'workspace_read',
      operation: 'read_file',
      status: 'ok',
      value: { logicalPath: 'brief.md', content: 'a', contentSha256: 'c'.repeat(64), byteLength: 1 },
    });
    expect(lastPacket(mismatched.h)).toMatchObject({ payload: { code: 'request_mismatch' } });
  });

  it('host_result 的 requestId 必须是活动 prompt', () => {
    const { h } = withPendingWrite();
    hostResult(h, writeOk('op_1_1'), 'req-2');
    expect(lastPacket(h)).toMatchObject({ payload: { code: 'request_mismatch' } });
  });

  it('未宣告的 capability 不得发 request', () => {
    const h = createHarness({ capabilities: ['case_read'] });
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => {
      expect(() => requestHost(session, WRITE_REQUEST)).toThrow(ProductSidecarError);
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    expect(h.out().some((packet) => packet.type === 'host_request')).toBe(false);
  });

  it('同时两个在途 host request 被拒；pending 时 finishPrompt 只闩锁等 host_result', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    let finishError: unknown = 'unset';
    h.hooks.startPrompt = (_p, session) => {
      startTool(session);
      requestHost(session, WRITE_REQUEST);
      expect(() => requestHost(session, WRITE_REQUEST)).toThrow(ProductSidecarError);
      try {
        session.finishPrompt({ kind: 'completed' });
        finishError = null;
      } catch (error) {
        finishError = error;
      }
      expect(() =>
        session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '不得继续' }),
      ).toThrow(ProductSidecarError);
    };
    prompt(h, 'req-1');
    expect(finishError).toBeNull();
    expect(h.out().filter((packet) => packet.type === 'host_request')).toHaveLength(1);
    expect(h.out().filter((packet) => packet.type === 'terminal')).toHaveLength(0);
    expect(h.session.snapshot().pendingOperationId).toBe('op_1_1');

    hostResult(h, writeOk('op_1_1'));
    expect(
      h.out().filter(
        (packet) => packet.type === 'agent_event' && (packet.payload as { kind: string }).kind === 'tool_finished',
      ),
    ).toHaveLength(1);
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'failed', error: { code: 'upstream_event_unsupported', retryable: false } },
    });
  });

  it('第二枚 op 铸新号，不复用', () => {
    const h = createHarness();
    bootstrap(h);
    const ids: string[] = [];
    h.hooks.startPrompt = (_p, session) => {
      startTool(session, 'read', 'call_r');
      ids.push(requestHost(session, READ_REQUEST));
    };
    // read/glob/grep 无 effect，才可在同一 active tc 内重复 host-operation 子循环；
    // 每轮都铸新 op，不复用。write 的单-operation 假设不适用于它们。
    h.hooks.deliverHostResult = (_r, session) => void ids.push(requestHost(session, READ_REQUEST));
    prompt(h, 'req-1');
    hostResult(h, readOk('op_1_1'));
    expect(ids).toEqual(['op_1_1', 'op_1_2']);
  });
});

// ── cancel ───────────────────────────────────────────────────────────────────

describe('cancel', () => {
  it('正常 cancel 转交 runtime，随后收束为 canceled', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = () => {};
    h.hooks.cancel = (_c, session) => session.finishPrompt({ kind: 'completed' });
    prompt(h, 'req-1');
    cancel(h, 'req-1', 'host');
    expect(h.calls).toContain('cancel:req-1:host');
    expect(lastPacket(h)).toMatchObject({ type: 'terminal', payload: { status: 'canceled', reason: 'host' } });
  });

  /**
   * PI-HOST-LOOP-1R2 C1（2026-08-02 裁定甲路）：`PromptCompletion` 扩出的 `canceled`
   * 两形态。runtime 只说「这是一次中止」，是谁中止的由状态机归因。
   */
  it('runtime 报 canceled：闩锁在时沿闩锁的 reason，user 不被洗成 host', () => {
    for (const reason of ['user', 'host'] as const) {
      const h = createHarness();
      bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
      h.hooks.startPrompt = () => {};
      h.hooks.cancel = (_c, session) => session.finishPrompt({ kind: 'canceled' });
      prompt(h, 'req-1');
      cancel(h, 'req-1', reason);
      expect(lastPacket(h)).toMatchObject({
        type: 'terminal',
        payload: { status: 'canceled', reason },
      });
      // canceled 不关 logical session——既有 `closesSession` 语义零变化。
      expect(h.session.snapshot().phase).toBe('idle');
    }
  });

  it('runtime 报 canceled：无闩锁时归因 host（上游 aborted 只可能来自宿主侧 abort）', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => session.finishPrompt({ kind: 'canceled' });
    prompt(h, 'req-1');
    expect(h.calls).not.toContain('cancel:req-1:host');
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'canceled', reason: 'host' },
    });
    expect(h.session.snapshot().phase).toBe('idle');
  });

  it('cancel 后不得再产生 delta 或 host request', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = () => {};
    h.hooks.cancel = (_c, session) => {
      expect(() => session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' })).toThrow(ProductSidecarError);
      expect(() => requestHost(session, WRITE_REQUEST)).toThrow(ProductSidecarError);
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    cancel(h, 'req-1');
  });

  it('race-late cancel 只消费 seq 并 no-op，不发第二 terminal', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => session.finishPrompt({ kind: 'completed' });
    prompt(h, 'req-1');
    const before = h.out().length;
    cancel(h, 'req-1');
    expect(h.out()).toHaveLength(before);
    expect(h.exits).toEqual([]);
    expect(h.session.snapshot().phase).toBe('idle');
    // 之后仍能正常接新 prompt。
    prompt(h, 'req-2');
    expect(h.calls).toContain('startPrompt:req-2');
  });

  it('重复 cancel 是 state_violation；未知 / 更早 request 的 cancel 是 request_mismatch', () => {
    const duplicated = createHarness();
    bootstrap(duplicated, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    duplicated.hooks.startPrompt = () => {};
    duplicated.hooks.cancel = (_c, session) => session.finishPrompt({ kind: 'completed' });
    prompt(duplicated, 'req-1');
    cancel(duplicated, 'req-1');
    cancel(duplicated, 'req-1');
    expect(lastPacket(duplicated)).toMatchObject({ payload: { code: 'state_violation' } });

    const unknown = createHarness();
    bootstrap(unknown);
    unknown.hooks.startPrompt = () => {};
    prompt(unknown, 'req-1');
    cancel(unknown, 'req-2');
    expect(lastPacket(unknown)).toMatchObject({ payload: { code: 'request_mismatch' } });
  });

  it('在途 host request 必须先收束；uncertain 优先于 canceled', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      startTool(session);
      requestHost(session, WRITE_REQUEST);
    };
    h.hooks.cancel = () => {};
    h.hooks.deliverHostResult = (_r, session) => session.finishPrompt({ kind: 'completed' });
    prompt(h, 'req-1');
    cancel(h, 'req-1');
    hostResult(h, writeUncertain('op_1_1'));
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'failed', error: { code: 'effect_uncertain', retryable: false } },
    });
  });

  it('在途 host request 回真实 ok 时，仍可收束为 canceled', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      startTool(session);
      requestHost(session, WRITE_REQUEST);
    };
    h.hooks.cancel = () => {};
    h.hooks.deliverHostResult = (_r, session) => session.finishPrompt({ kind: 'completed' });
    prompt(h, 'req-1');
    cancel(h, 'req-1');
    hostResult(h, writeOk('op_1_1'));
    expect(lastPacket(h)).toMatchObject({ payload: { status: 'canceled', reason: 'user' } });
  });
});

// ── 预算与 terminal 优先级 ───────────────────────────────────────────────────

describe('预算与 terminal 优先级矩阵', () => {
  function runWithTurns(
    payload: BootstrapPayload,
    turns: ReturnType<typeof turnEvent>[],
    completion: PromptCompletion = { kind: 'completed' },
  ): Harness {
    const h = createHarness();
    bootstrap(h, payload);
    h.hooks.startPrompt = (_p, session) => {
      for (const turn of turns) session.publishAgentEvent(turn);
      session.finishPrompt(completion);
    };
    prompt(h, 'req-1');
    return h;
  }

  it('未越限时如实给 completed 与累计值', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 3, maxUsd: 1 } }), [
      turnEvent(1, true, 0.1),
      turnEvent(2, true, 0.2),
    ]);
    expect(lastPacket(h)).toMatchObject({
      payload: {
        status: 'completed',
        budget: { turns: 2, usd: 0.30000000000000004, turnLimit: 'open', usdLimit: 'open', stopReason: null },
      },
    });
  });

  it('只 counted 的回合进 turn 限额', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 2, maxUsd: null } }), [
      turnEvent(1, true, null),
      turnEvent(2, false, null, 'aborted'),
    ]);
    expect(lastPacket(h)).toMatchObject({ payload: { budget: { turns: 1, turnLimit: 'open' } } });
  });

  it('turn 限额达成 → budget_stopped / stopReason turns', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 2, maxUsd: null } }), [
      turnEvent(1, true, 0.1),
      turnEvent(2, true, 0.1),
    ]);
    expect(lastPacket(h)).toMatchObject({
      payload: { status: 'budget_stopped', budget: { turnLimit: 'reached', stopReason: 'turns' } },
    });
  });

  it('usd 限额达成 → stopReason usd；两项同时达成取 turns', () => {
    const usdOnly = runWithTurns(bootstrapPayload({ limits: { maxTurns: 9, maxUsd: 0.2 } }), [
      turnEvent(1, true, 0.2),
    ]);
    expect(lastPacket(usdOnly)).toMatchObject({
      payload: { status: 'budget_stopped', budget: { usdLimit: 'reached', stopReason: 'usd' } },
    });

    const both = runWithTurns(bootstrapPayload({ limits: { maxTurns: 1, maxUsd: 0.2 } }), [turnEvent(1, true, 0.2)]);
    expect(lastPacket(both)).toMatchObject({ payload: { budget: { stopReason: 'turns' } } });
  });

  it('maxUsd 非 null 而某回合费用未知 → failed budget_unknown，且不伪装 budget_stopped', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 1, maxUsd: 1 } }), [turnEvent(1, true, null)]);
    expect(lastPacket(h)).toMatchObject({
      payload: {
        status: 'failed',
        error: { code: 'budget_unknown', retryable: false },
        budget: { usd: null, usdLimit: 'unknown', turnLimit: 'reached' },
      },
    });
  });

  it('maxUsd 为 null 时费用未知只把 usd 保持 null，不阻断 turn 限额', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 1, maxUsd: null } }), [turnEvent(1, true, null)]);
    expect(lastPacket(h)).toMatchObject({
      payload: { status: 'budget_stopped', budget: { usd: null, usdLimit: 'disabled', stopReason: 'turns' } },
    });
  });

  it('effect_uncertain 压过 budget_unknown', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 2, maxUsd: 1 } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent(turnEvent(1, true, null));
      startTool(session);
      requestHost(session, WRITE_REQUEST);
    };
    h.hooks.deliverHostResult = (_r, session) => session.finishPrompt({ kind: 'completed' });
    prompt(h, 'req-1');
    hostResult(h, writeUncertain('op_1_1'));
    expect(lastPacket(h)).toMatchObject({ payload: { status: 'failed', error: { code: 'effect_uncertain' } } });
  });

  it('runtime 报告的失败在无更高优先项时如实上报 code 与 retryability，message 出自本地表', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 9, maxUsd: null } }), [turnEvent(1, true, 0.1)], {
      kind: 'failed',
      code: 'provider_error',
      retryable: true,
    });
    expect(lastPacket(h)).toMatchObject({
      payload: { status: 'failed', error: { code: 'provider_error', retryable: true } },
    });
    const message = ((lastPacket(h).payload as { error: { message: string } }).error).message;
    expect(message.length).toBeGreaterThan(0);
  });

  it('idle 续 prompt 不重置累计预算', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 4, maxUsd: 1 } }));
    let turn = 0;
    h.hooks.startPrompt = (_p, session) => {
      turn += 1;
      session.publishAgentEvent(turnEvent(turn, true, 0.1));
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    prompt(h, 'req-2');
    expect(lastPacket(h)).toMatchObject({ payload: { budget: { turns: 2 } } });
  });

  it('retryable provider_error 后仍回 idle；不可重试的失败关闭 session', () => {
    const retryable = createHarness();
    bootstrap(retryable, bootstrapPayload({ limits: { maxTurns: 9, maxUsd: null } }));
    retryable.hooks.startPrompt = (_p, session) =>
      session.finishPrompt({ kind: 'failed', code: 'provider_error', retryable: true });
    prompt(retryable, 'req-1');
    expect(retryable.session.snapshot().phase).toBe('idle');

    const fatal = createHarness();
    bootstrap(fatal, bootstrapPayload({ limits: { maxTurns: 9, maxUsd: null } }));
    fatal.hooks.startPrompt = (_p, session) =>
      session.finishPrompt({ kind: 'failed', code: 'host_error', retryable: false });
    prompt(fatal, 'req-1');
    expect(fatal.session.snapshot().phase).toBe('closed');
    const before = fatal.out().length;
    prompt(fatal, 'req-2');
    expect(fatal.out()).toHaveLength(before);
  });

  it('budget_stopped 关闭 logical session，不再收包', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 1, maxUsd: null } }), [turnEvent(1, true, 0.1)]);
    expect(h.session.snapshot().phase).toBe('closed');
    const before = h.out().length;
    prompt(h, 'req-2');
    expect(h.out()).toHaveLength(before);
  });

  /**
   * PI-HOST-LOOP-1R2 C1：`canceled` intent 扩入后，既有优先级
   * `effect_uncertain > budget_unknown > 已知 limit reached > cancel > 其他 outcome`
   * 一档都不许挪。新分支落在 cancel 闩锁**之后**，故上面三档必须照旧压过它。
   */
  it('canceled intent 不抬优先级：三档更高项照旧压过它', () => {
    // 一、turn 限额达成压过 canceled。
    const turnLimit = runWithTurns(
      bootstrapPayload({ limits: { maxTurns: 1, maxUsd: null } }),
      [turnEvent(1, true, 0.1)],
      { kind: 'canceled' },
    );
    expect(lastPacket(turnLimit)).toMatchObject({
      payload: { status: 'budget_stopped', budget: { turnLimit: 'reached', stopReason: 'turns' } },
    });

    // 二、budget_unknown 压过 canceled。
    const unknownCost = runWithTurns(
      bootstrapPayload({ limits: { maxTurns: 9, maxUsd: 1 } }),
      [turnEvent(1, true, null)],
      { kind: 'canceled' },
    );
    expect(lastPacket(unknownCost)).toMatchObject({
      payload: { status: 'failed', error: { code: 'budget_unknown' } },
    });

    // 三、effect_uncertain 压过 canceled。
    const uncertain = createHarness();
    bootstrap(uncertain, bootstrapPayload({ limits: { maxTurns: 9, maxUsd: null } }));
    uncertain.hooks.startPrompt = (_p, session) => {
      startTool(session);
      requestHost(session, WRITE_REQUEST);
    };
    uncertain.hooks.deliverHostResult = (_r, session) => session.finishPrompt({ kind: 'canceled' });
    prompt(uncertain, 'req-1');
    hostResult(uncertain, writeUncertain('op_1_1'));
    expect(lastPacket(uncertain)).toMatchObject({
      payload: { status: 'failed', error: { code: 'effect_uncertain' } },
    });

    // 对照：三档都不成立时才轮到 canceled，故上面三条不是恒红。
    const plain = runWithTurns(
      bootstrapPayload({ limits: { maxTurns: 9, maxUsd: null } }),
      [turnEvent(1, true, 0.1)],
      { kind: 'canceled' },
    );
    expect(lastPacket(plain)).toMatchObject({ payload: { status: 'canceled', reason: 'host' } });
  });
});

// ── shutdown ─────────────────────────────────────────────────────────────────

describe('shutdown', () => {
  it('idle shutdown 回 status:shutdown 的 terminal 并退出 0', () => {
    const h = createHarness();
    bootstrap(h);
    h.send({ sessionId: SESSION, requestId: null, type: 'shutdown', payload: { reason: 'host_shutdown' } });
    expect(lastPacket(h)).toMatchObject({ requestId: null, type: 'terminal', payload: { status: 'shutdown' } });
    expect(h.exits).toEqual([0]);
    expect(h.calls).toContain('shutdown');
  });

  it('prompting 中 shutdown 是 state_violation', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = () => {};
    prompt(h, 'req-1');
    h.send({ sessionId: SESSION, requestId: null, type: 'shutdown', payload: { reason: 'host_shutdown' } });
    expect(lastPacket(h)).toMatchObject({ payload: { code: 'state_violation' } });
    expect(h.exits).toEqual([1]);
  });
});

// ── canary ───────────────────────────────────────────────────────────────────

describe('canary', () => {
  it('secret 与 caseRoot 不出现在任何写出字节里', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' });
      startTool(session);
      requestHost(session, WRITE_REQUEST);
    };
    prompt(h, 'req-1');
    hostResult(h, writeOk('op_1_1'));
    h.sendRaw('{"protocolVersion":1,"seq":99,"garbage":true}\n');

    const text = h.allText();
    expect(text).not.toContain(CANARY_KEY);
    expect(text).not.toContain(CANARY_ROOT);
    expect(text).not.toContain('绝密案卷根');
  });

  it('protocol_error message 不回显 raw line / payload 内容', () => {
    const h = createHarness();
    bootstrap(h);
    h.sendRaw(`{"protocolVersion":1,"seq":2,"sessionId":"${SESSION}","requestId":null,"type":"勒索字段","payload":{}}\n`);
    const packet = lastPacket(h);
    expect(packet).toMatchObject({ type: 'protocol_error', payload: { code: 'unknown_type' } });
    const message = (packet.payload as { message: string }).message;
    expect(message).not.toContain('勒索字段');
    expect(new TextEncoder().encode(message).length).toBeLessThanOrEqual(1024);
  });

  it('runtime 侧抛出的错误也不带 secret', () => {
    const h = createHarness({ capabilities: ['case_read'] });
    bootstrap(h);
    let captured: unknown;
    h.hooks.startPrompt = (_p, session) => {
      try {
        requestHost(session, WRITE_REQUEST);
      } catch (error) {
        captured = error;
      }
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    expect(captured).toBeInstanceOf(ProductSidecarError);
    expect(String((captured as Error).message)).not.toContain(CANARY_KEY);
    expect(String((captured as Error).message)).not.toContain(CANARY_ROOT);
  });
});

// ── PI-CODE-STDIO-1R · 六类返修反例 ──────────────────────────────────────────
//
// 每一节直接落在 `PI-CODE-STDIO-1` 独立验收坐实的缺陷上，不测 stub、不测 module load。

const PROOF_HASH = 'a1'.repeat(32);
const SECOND_HASHER_SENTINEL = 'deadbeef'.repeat(8);

/** 上游违约的统一注入口：未经 `tool_started` 的 raw id 先见 `tool_progress`。 */
function injectUpstreamViolation(session: ProductSidecarSession): void {
  session.publishAgentEvent({ kind: 'tool_progress', rawToolCallId: 'call_ghost', toolName: 'write' });
}

describe('R1 · 固定安全文案与 retryability 闭集', () => {
  it('runtime 报告失败时不得由自由 message 决定 wire：terminal message 只出自本地固定表', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      // 即便调用方 cast 塞入 secret 与绝对路径，也不得出 wire。
      session.finishPrompt({
        kind: 'failed',
        code: 'provider_error',
        retryable: true,
        message: `${CANARY_KEY} ${CANARY_ROOT}`,
      } as unknown as PromptCompletion);
    };
    prompt(h, 'req-1');

    const error = (lastPacket(h).payload as { error: { code: string; message: string } }).error;
    expect(error.code).toBe('provider_error');
    expect(error.message).not.toContain(CANARY_KEY);
    expect(error.message).not.toContain(CANARY_ROOT);
    expect(h.allText()).not.toContain(CANARY_KEY);
    expect(h.allText()).not.toContain(CANARY_ROOT);
  });

  it('每个 failure code 一枚独立本地 literal，互不相同也互不为空', () => {
    const messages = new Map<string, string>();
    for (const code of ['provider_error', 'host_error', 'invalid_state', 'unknown'] as const) {
      const h = createHarness();
      bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
      h.hooks.startPrompt = (_p, session) =>
        session.finishPrompt({ kind: 'failed', code, retryable: false } as PromptCompletion);
      prompt(h, 'req-1');
      const error = (lastPacket(h).payload as { error: { code: string; message: string } }).error;
      expect(error.code, code).toBe(code);
      messages.set(code, error.message);
    }
    expect([...messages.values()].every((message) => message.length > 0)).toBe(true);
    expect(new Set(messages.values()).size).toBe(messages.size);
  });

  it('runtime callback 抛出的 Error 只换成固定无 cause 的 ProductSidecarError', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = () => {
      throw new Error(`${CANARY_KEY} ${CANARY_ROOT}`, { cause: new Error(CANARY_KEY) });
    };
    let caught: unknown;
    try {
      prompt(h, 'req-1');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ProductSidecarError);
    expect((caught as Error).message).not.toContain(CANARY_KEY);
    expect((caught as Error).message).not.toContain(CANARY_ROOT);
    expect((caught as { cause?: unknown }).cause).toBeUndefined();
    expect(h.allText()).not.toContain(CANARY_KEY);
  });

  it('cast 进来的非 provider/host code 不得携 retryable:true', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) =>
      session.finishPrompt({ kind: 'failed', code: 'unknown', retryable: true } as unknown as PromptCompletion);
    prompt(h, 'req-1');
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'failed', error: { code: 'unknown', retryable: false } },
    });
  });
});

describe('R2 · pending upstream failure 闩锁', () => {
  function latched(maxUsd: number | null = null): Harness {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      requestHost(session, WRITE_REQUEST);
      injectUpstreamViolation(session);
    };
    prompt(h, 'req-1');
    return h;
  }

  it('在途 host operation 时的上游违约不清 pending、不提前 terminal', () => {
    const h = latched();
    expect(h.out().some((packet) => packet.type === 'terminal')).toBe(false);
    expect(h.session.snapshot()).toMatchObject({ phase: 'prompting', activeRequestId: 'req-1', pendingOperationId: 'op_1_1' });
    expect(h.exits).toEqual([]);
  });

  it('闩锁期停止后续 runtime 输出', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    const rejected: string[] = [];
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      requestHost(session, WRITE_REQUEST);
      injectUpstreamViolation(session);
      for (const [label, call] of [
        ['delta', () => session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' })],
        ['request', () => requestHost(session, WRITE_REQUEST)],
        ['finish', () => session.finishPrompt({ kind: 'completed' })],
      ] as const) {
        try {
          call();
        } catch (error) {
          if (error instanceof ProductSidecarError) rejected.push(label);
        }
      }
    };
    prompt(h, 'req-1');
    expect(rejected).toEqual(['delta', 'request', 'finish']);
    expect(h.out().some((packet) => packet.type === 'terminal')).toBe(false);
  });

  it('host_result 到达后由状态机自发恰一枚 tool_finished 并自动 terminal，不等 runtime finish', () => {
    const h = latched();
    hostResult(h, writeOk('op_1_1'));
    expect(h.calls).toContain('hostResult:op_1_1:ok');

    const finished = h.out().filter(
      (packet) => packet.type === 'agent_event' && (packet.payload as { kind: string }).kind === 'tool_finished',
    );
    expect(finished).toHaveLength(1);
    expect(finished[0].payload).toEqual({
      kind: 'tool_finished',
      toolCallId: 'tc_1_1',
      toolName: 'write',
      outcome: 'succeeded',
    });
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'failed', error: { code: 'upstream_event_unsupported', retryable: false } },
    });
  });

  it('闩锁收束逐字映射 host status；uncertain 必收束 effect_uncertain', () => {
    const uncertain = latched();
    hostResult(uncertain, writeUncertain('op_1_1'));
    expect(uncertain.out().filter((packet) => packet.type === 'agent_event').pop()?.payload).toMatchObject({
      kind: 'tool_finished',
      outcome: 'uncertain',
    });
    expect(lastPacket(uncertain)).toMatchObject({
      payload: { status: 'failed', error: { code: 'effect_uncertain', retryable: false } },
    });

    const denied = latched();
    hostResult(denied, {
      operationId: 'op_1_1',
      capability: 'workspace_write',
      operation: 'write',
      status: 'denied',
      error: { code: 'user_denied', message: '用户拒绝' },
    });
    expect(denied.out().filter((packet) => packet.type === 'agent_event').pop()?.payload).toMatchObject({
      kind: 'tool_finished',
      outcome: 'denied',
    });
  });

  it('进入闩锁即把 usd 传染 null：maxUsd 启用时收束为 budget_unknown', () => {
    const h = latched(1);
    hostResult(h, writeOk('op_1_1'));
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: {
        status: 'failed',
        error: { code: 'budget_unknown', retryable: false },
        budget: { usd: null, usdLimit: 'unknown' },
      },
    });
  });

  it('闩锁期仍接受当前 request 至多一次 cancel，其 callback 异常不阻断 effect 收束', () => {
    const h = latched();
    h.hooks.cancel = () => {
      throw new Error(CANARY_KEY);
    };
    cancel(h, 'req-1');
    expect(h.calls).toContain('cancel:req-1:user');
    expect(h.out().some((packet) => packet.type === 'terminal')).toBe(false);

    hostResult(h, writeOk('op_1_1'));
    expect(lastPacket(h)).toMatchObject({ type: 'terminal' });
    expect(h.allText()).not.toContain(CANARY_KEY);

    // 第二次 cancel 仍是 state_violation，不因闩锁降格。
    const second = latched();
    cancel(second, 'req-1');
    cancel(second, 'req-1');
    expect(lastPacket(second)).toMatchObject({ payload: { code: 'state_violation' } });
  });

  it('host_result 已到、tool_finished 未到的 race 同样闭合', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      requestHost(session, WRITE_REQUEST);
    };
    // runtime 合法收下 result，却迟迟不发 tool_finished。
    h.hooks.deliverHostResult = () => {};
    prompt(h, 'req-1');
    hostResult(h, writeOk('op_1_1'));
    injectUpstreamViolation(h.session);

    const finished = h.out().filter(
      (packet) => packet.type === 'agent_event' && (packet.payload as { kind: string }).kind === 'tool_finished',
    );
    expect(finished).toHaveLength(1);
    expect(finished[0].payload).toMatchObject({ toolCallId: 'tc_1_1', outcome: 'succeeded' });
    expect(lastPacket(h)).toMatchObject({
      payload: { status: 'failed', error: { code: 'upstream_event_unsupported' } },
    });
  });

  it('无在途 operation 的上游违约仍直接 terminal', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => injectUpstreamViolation(session);
    prompt(h, 'req-1');
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'failed', error: { code: 'upstream_event_unsupported' } },
    });
  });
});

describe('R3 · 五 callback 共用 reentrancy guard', () => {
  const reentrantLine = (): Uint8Array => {
    const encoded = encodePacketLine({
      protocolVersion: 1,
      seq: 2,
      sessionId: SESSION,
      requestId: 'req-reentrant',
      type: 'prompt',
      payload: { text: '重入' },
    } as ProductPacket);
    if (!encoded.ok) throw new Error('fixture 编码失败');
    return encoded.line;
  };

  it('capabilities 内同步 receive 在触碰 carry/seq/phase/wire/exit 前抛，fatal 后不得复活为 ready', () => {
    const h = createHarness();
    h.hooks.capabilities = (_payload, session) => session.receive(reentrantLine());
    expect(() => bootstrap(h)).toThrow(ProductSidecarError);
    expect(h.out()).toEqual([]);
    expect(h.exits).toEqual([]);
    expect(h.session.snapshot().phase).toBe('awaiting_bootstrap');
  });

  it('startPrompt / cancel / deliverHostResult / shutdown 内同步 receive 同样被拒', () => {
    const startPrompt = createHarness();
    bootstrap(startPrompt);
    startPrompt.hooks.startPrompt = (_p, session) => session.receive(reentrantLine());
    expect(() => prompt(startPrompt, 'req-1')).toThrow(ProductSidecarError);
    expect(startPrompt.out().some((packet) => packet.type === 'protocol_error')).toBe(false);

    const canceled = createHarness();
    bootstrap(canceled, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    canceled.hooks.startPrompt = () => {};
    canceled.hooks.cancel = (_c, session) => session.receive(reentrantLine());
    prompt(canceled, 'req-1');
    expect(() => cancel(canceled, 'req-1')).toThrow(ProductSidecarError);
    expect(canceled.out().some((packet) => packet.type === 'protocol_error')).toBe(false);

    const delivered = createHarness();
    bootstrap(delivered, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    delivered.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      requestHost(session, WRITE_REQUEST);
    };
    delivered.hooks.deliverHostResult = (_r, session) => session.receive(reentrantLine());
    prompt(delivered, 'req-1');
    expect(() => hostResult(delivered, writeOk('op_1_1'))).toThrow(ProductSidecarError);
    expect(delivered.out().some((packet) => packet.type === 'protocol_error')).toBe(false);

    const stopped = createHarness();
    bootstrap(stopped);
    stopped.hooks.shutdown = (session) => session.receive(reentrantLine());
    expect(() =>
      stopped.send({ sessionId: SESSION, requestId: null, type: 'shutdown', payload: { reason: 'host_shutdown' } }),
    ).toThrow(ProductSidecarError);
    expect(stopped.exits).toEqual([]);
  });

  it('callback 内同步 endOfInput 同样被拒', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => session.endOfInput();
    expect(() => prompt(h, 'req-1')).toThrow(ProductSidecarError);
  });

  it('guard 用 finally 复位：callback 抛出后，后续 inbound 不被误判为重入', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = () => {
      throw new Error('第一枚 prompt 的 runtime 失败');
    };
    expect(() => prompt(h, 'req-1')).toThrow(ProductSidecarError);
    // callback 抛出不回滚状态机；但 depth 必须已复位，后续合法 cancel 要正常处理。
    h.hooks.cancel = (_c, session) => session.finishPrompt({ kind: 'completed' });
    cancel(h, 'req-1');
    expect(h.calls).toContain('cancel:req-1:user');
    expect(lastPacket(h)).toMatchObject({ type: 'terminal', payload: { status: 'canceled' } });
  });

  it('startPrompt 的合法同步 outbound 不受 guard 禁止', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' });
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      requestHost(session, WRITE_REQUEST);
    };
    prompt(h, 'req-1');
    expect(h.out().map((packet) => packet.type)).toEqual(['ready', 'agent_event', 'agent_event', 'host_request']);
  });
});

describe('R4 · write proof → stdio 的 reserve/send 接缝', () => {
  function reserveAndSend(
    session: ProductSidecarSession,
    overrides: { hash?: string; operationId?: string; requestId?: string; sessionId?: string } = {},
  ): string {
    const operationId = session.reserveHostOperation({
      publicToolCallId: 'tc_1_1',
      capability: 'workspace_write',
    });
    session.sendReservedHostRequest({
      sessionId: overrides.sessionId ?? SESSION,
      requestId: overrides.requestId ?? 'req-1',
      operationId: overrides.operationId ?? operationId,
      capability: 'workspace_write',
      proposalHash: overrides.hash ?? PROOF_HASH,
      arguments: WRITE_REQUEST.arguments as { logicalPath: string; content: string; contentSha256: string; byteLength: number },
    });
    return operationId;
  }

  it('send 原样消费调用方的 op/hash，状态机零预测、零重算、零第二枚 hasher', () => {
    const h = createHarness({ hash: SECOND_HASHER_SENTINEL });
    bootstrap(h);
    let reserved = '';
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      reserved = reserveAndSend(session);
    };
    prompt(h, 'req-1');

    expect(reserved).toBe('op_1_1');
    expect(h.out()[2]).toMatchObject({
      type: 'host_request',
      requestId: 'req-1',
      payload: { operationId: 'op_1_1', proposalHash: PROOF_HASH, capability: 'workspace_write' },
    });
    expect(h.allText()).not.toContain(SECOND_HASHER_SENTINEL);
    expect(h.session.snapshot().pendingOperationId).toBe('op_1_1');
  });

  it('reserve 后未 send 只烧 ordinal：不出 wire、不成为 pending、不得复用', () => {
    const h = createHarness();
    bootstrap(h);
    const reserved: string[] = [];
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      // 第一枚 reservation 的异步 hash 失败，调用方永不 send。
      reserved.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_1', capability: 'workspace_write' }));
      reserved.push(reserveAndSend(session));
    };
    prompt(h, 'req-1');
    expect(reserved).toEqual(['op_1_1', 'op_1_2']);
    expect(h.out().filter((packet) => packet.type === 'host_request')).toHaveLength(1);
    expect(h.session.snapshot().pendingOperationId).toBe('op_1_2');
  });

  it('send 只接受本 prompt 中仍有效、tc/capability/session/request 相同的 reservation', () => {
    const h = createHarness();
    bootstrap(h);
    const rejected: string[] = [];
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      for (const [label, overrides] of [
        ['op', { operationId: 'op_1_9' }],
        ['session', { sessionId: 'sess-other' }],
        ['request', { requestId: 'req-other' }],
        ['hash', { hash: 'NOT-HEX' }],
      ] as const) {
        try {
          reserveAndSend(session, overrides);
        } catch (error) {
          if (error instanceof ProductSidecarError) rejected.push(label);
        }
      }
      // 未登记的公开 tc 不得 reserve。
      try {
        session.reserveHostOperation({ publicToolCallId: 'tc_1_9', capability: 'workspace_write' });
      } catch (error) {
        if (error instanceof ProductSidecarError) rejected.push('tc');
      }
    };
    prompt(h, 'req-1');
    expect(rejected).toEqual(['op', 'session', 'request', 'hash', 'tc']);
    expect(h.out().some((packet) => packet.type === 'host_request')).toBe(false);
  });
});

describe('R5 · pending 不可变镜像与逐值关联', () => {
  function withPendingWriteFor(args: Partial<{ logicalPath: string; contentSha256: string; byteLength: number }> = {}): Harness {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      requestHost(session, {
        capability: 'workspace_write',
        arguments: { ...(WRITE_REQUEST.arguments as Record<string, unknown>), ...args } as never,
      });
    };
    prompt(h, 'req-1');
    return h;
  }

  it('ok 的 write value 逐值关联：三枚镜像字段任一错配即 fatal 且 consumer 零调用', () => {
    const cases = [
      ['logicalPath', { logicalPath: 'other.md', disposition: 'created', contentSha256: 'c'.repeat(64), byteLength: 6 }],
      ['contentSha256', { logicalPath: 'brief.md', disposition: 'created', contentSha256: 'd'.repeat(64), byteLength: 6 }],
      ['byteLength', { logicalPath: 'brief.md', disposition: 'created', contentSha256: 'c'.repeat(64), byteLength: 7 }],
    ] as const;
    for (const [label, value] of cases) {
      const h = withPendingWriteFor();
      hostResult(h, {
        operationId: 'op_1_1',
        capability: 'workspace_write',
        operation: 'write',
        status: 'ok',
        value: value as never,
      });
      expect(lastPacket(h), label).toMatchObject({ type: 'protocol_error', payload: { code: 'request_mismatch' } });
      expect(h.calls, label).not.toContain('hostResult:op_1_1:ok');
      expect(h.exits, label).toEqual([1]);
    }
  });

  it('逐值同构的 ok 正常回灌；disposition 不参与关联', () => {
    const h = withPendingWriteFor();
    hostResult(h, {
      operationId: 'op_1_1',
      capability: 'workspace_write',
      operation: 'write',
      status: 'ok',
      value: { logicalPath: 'brief.md', disposition: 'overwritten', contentSha256: 'c'.repeat(64), byteLength: 6 },
    });
    expect(h.calls).toContain('hostResult:op_1_1:ok');
    expect(h.exits).toEqual([]);
  });

  it('read 的 ok value 只比 logicalPath，错配同样 fatal', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' });
      requestHost(session, { capability: 'workspace_read', arguments: { operation: 'read_file', logicalPath: 'notes.md' } });
    };
    prompt(h, 'req-1');
    hostResult(h, {
      operationId: 'op_1_1',
      capability: 'workspace_read',
      operation: 'read_file',
      status: 'ok',
      value: { logicalPath: 'other.md', content: 'a', contentSha256: 'c'.repeat(64), byteLength: 1 },
    });
    expect(lastPacket(h)).toMatchObject({ payload: { code: 'request_mismatch' } });
    expect(h.calls).not.toContain('hostResult:op_1_1:ok');
  });

  it('非 ok 的四态不虚构 value 比较，逐态正常回灌', () => {
    const nonOk: HostResultPayload[] = [
      {
        operationId: 'op_1_1',
        capability: 'workspace_write',
        operation: 'write',
        status: 'denied',
        error: { code: 'user_denied', message: '用户拒绝' },
      },
      {
        operationId: 'op_1_1',
        capability: 'workspace_write',
        operation: 'write',
        status: 'failed',
        error: { code: 'io', message: '落盘失败' },
      },
      writeUncertain('op_1_1'),
    ];
    for (const payload of nonOk) {
      const h = withPendingWriteFor();
      hostResult(h, payload);
      expect(h.calls, payload.status).toContain(`hostResult:op_1_1:${payload.status}`);
      expect(h.exits, payload.status).toEqual([]);
    }
  });

  it('pending 是 send 入参的不可变镜像：调用方随后改写 arguments 不影响关联', () => {
    const h = createHarness();
    bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
    const mutable = { logicalPath: 'brief.md', content: '正文', contentSha256: 'c'.repeat(64), byteLength: 6 };
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      requestHost(session, { capability: 'workspace_write', arguments: mutable });
      mutable.logicalPath = '被改写.md';
      mutable.byteLength = 999;
    };
    prompt(h, 'req-1');
    hostResult(h, writeOk('op_1_1'));
    expect(h.calls).toContain('hostResult:op_1_1:ok');
    expect(h.exits).toEqual([]);
  });

  it('正常 write 的 tool_finished outcome 必须与已保存 host status 一致', () => {
    const h = withPendingWriteFor();
    h.hooks.deliverHostResult = (_r, session) => {
      // host 判 denied，上游却报 succeeded：投影违约，不得照抄。
      session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_w', toolName: 'write', outcome: 'succeeded' });
    };
    hostResult(h, {
      operationId: 'op_1_1',
      capability: 'workspace_write',
      operation: 'write',
      status: 'denied',
      error: { code: 'policy_denied', message: '策略拒绝' },
    });
    const finished = h.out().filter(
      (packet) => packet.type === 'agent_event' && (packet.payload as { kind: string }).kind === 'tool_finished',
    );
    expect(finished).toHaveLength(1);
    expect(finished[0].payload).toMatchObject({ toolCallId: 'tc_1_1', outcome: 'denied' });
    expect(lastPacket(h)).toMatchObject({
      type: 'terminal',
      payload: { status: 'failed', error: { code: 'upstream_event_unsupported' } },
    });
  });

  it('与已保存 host status 一致的 tool_finished 正常放行', () => {
    const h = withPendingWriteFor();
    h.hooks.deliverHostResult = (_r, session) => {
      session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_w', toolName: 'write', outcome: 'succeeded' });
      session.finishPrompt({ kind: 'completed' });
    };
    hostResult(h, writeOk('op_1_1'));
    expect(lastPacket(h)).toMatchObject({ type: 'terminal', payload: { status: 'completed' } });
  });
});

// ── PI-CODE-STDIO-1R2 · tc 状态表九枚反例 ────────────────────────────────────
//
// 九枚逐条落在 `PI-CODE-STDIO-1R` 独立验收（`4df2e84`）注入的 production 反例上。
// 共同根因是 registry 只记 raw→tc 与 tc→toolName：既没有 owner prompt、没有阶段、
// 没有 toolName↔capability 绑定，也不把「已 settled 的 effect」与「新 reservation」
// 视作结构性互斥。九例分别破坏 effect 最小权限、两个 latch 条件互斥、公开投影稳定性、
// closed event union、host-result truth、write 阶段分型、effect 收束、单向 registry
// 与 request-scoped reservation。

/** 反例册反复要数「恰一枚 tool_finished」，故单独取投影出去的该族事件。 */
function finishedEvents(h: Harness): Record<string, unknown>[] {
  return h
    .out()
    .filter((packet) => packet.type === 'agent_event' && (packet.payload as { kind: string }).kind === 'tool_finished')
    .map((packet) => packet.payload as Record<string, unknown>);
}

/** 「不该出 wire 的事件真的没出 wire」比「抛了错」更接近本票的验收面。 */
function agentEventKinds(h: Harness): string[] {
  return h
    .out()
    .filter((packet) => packet.type === 'agent_event')
    .map((packet) => (packet.payload as { kind: string }).kind);
}

function terminals(h: Harness): SidecarPacket[] {
  return h.out().filter((packet) => packet.type === 'terminal');
}

/**
 * 受测 API 一律在 runtime callback 内调用。这里不预设逃逸物的类型——反例四要证明的
 * 恰恰是「现行实现逃逸为 TypeError / callback failure」，若先断言 ProductSidecarError
 * 就把待证事实写进了夹具。
 */
function capture(call: () => void): unknown {
  try {
    call();
    return null;
  } catch (error) {
    return error;
  }
}

function openHarness(): Harness {
  const h = createHarness();
  bootstrap(h, bootstrapPayload({ limits: { maxTurns: 12, maxUsd: null } }));
  return h;
}

const UPSTREAM_TERMINAL = {
  type: 'terminal',
  payload: { status: 'failed', error: { code: 'upstream_event_unsupported', retryable: false } },
} as const;

describe('架构裁定的两处旧非法绿测形态', () => {
  it('原序列仍分别 fail-closed，不能因既有测试再成形而失去反例', () => {
    // 旧形态一：第一件 write 未 finished 就起第二件 read，随后还把 pre-operation write
    // 报 succeeded。重叠 start 当场收束；后续旧 write 的 finished 不得再出 wire。
    const overlap = openHarness();
    let overlapEscaped: unknown = 'unset';
    let lateFinishEscaped: unknown = 'unset';
    overlap.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      session.publishAgentEvent({ kind: 'tool_progress', rawToolCallId: 'call_w', toolName: 'write' });
      overlapEscaped = capture(() =>
        session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' }),
      );
      lateFinishEscaped = capture(() =>
        session.publishAgentEvent({
          kind: 'tool_finished',
          rawToolCallId: 'call_w',
          toolName: 'write',
          outcome: 'succeeded',
        }),
      );
    };
    prompt(overlap, 'req-1');
    expect(overlapEscaped).toBeNull();
    expect(lateFinishEscaped).toBeInstanceOf(ProductSidecarError);
    expect(agentEventKinds(overlap)).toEqual(['tool_started', 'tool_progress']);
    expect(terminals(overlap)).toHaveLength(1);
    expect(lastPacket(overlap)).toMatchObject(UPSTREAM_TERMINAL);

    // 旧形态二：read tc 试图 reserve workspace_write。拒绝必须早于烧号；随后合法 read
    // request 仍拿 op_1_1，证明不是靠“测试不再走这条路”把非法形态藏掉。
    const escalatedRead = openHarness();
    let escalationError: unknown = 'unset';
    let validOperationId = 'unset';
    escalatedRead.hooks.startPrompt = (_p, session) => {
      startTool(session, 'read', 'call_r');
      escalationError = capture(() => requestHost(session, WRITE_REQUEST));
      validOperationId = requestHost(session, READ_REQUEST);
    };
    prompt(escalatedRead, 'req-1');
    expect(escalationError).toBeInstanceOf(ProductSidecarError);
    expect(validOperationId).toBe('op_1_1');
    expect(escalatedRead.out().filter((packet) => packet.type === 'host_request')).toHaveLength(1);
    expect(lastPacket(escalatedRead)).toMatchObject({
      type: 'host_request',
      payload: { operationId: 'op_1_1', capability: 'workspace_read' },
    });
  });
});

describe('R2-1 · tc identity：owner / toolName / capability', () => {
  it('反例一 · toolName↔capability 双向错配都在 ordinal 分配前拒绝', () => {
    // 正向：read tc 升权 workspace_write，把只读工具变成写 effect。
    const escalate = openHarness();
    const escalateOrdinals: string[] = [];
    const escalateRejected: string[] = [];
    escalate.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' });
      const error = capture(() => {
        escalateOrdinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_1', capability: 'workspace_write' }));
      });
      if (error !== null) escalateRejected.push('read→workspace_write');
      // 同一 tc 的合法 read reservation 必须仍拿首枚 ordinal：错配不得烧号。
      escalateOrdinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_1', capability: 'workspace_read' }));
    };
    prompt(escalate, 'req-1');
    expect(escalateRejected).toEqual(['read→workspace_write']);
    expect(escalateOrdinals).toEqual(['op_1_1']);

    // 反向：write tc 借 workspace_read 出请求，同样是 owner/name 绑定缺失。
    const demote = openHarness();
    const demoteOrdinals: string[] = [];
    const demoteRejected: string[] = [];
    demote.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      const error = capture(() => {
        demoteOrdinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_1', capability: 'workspace_read' }));
      });
      if (error !== null) demoteRejected.push('write→workspace_read');
      demoteOrdinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_1', capability: 'workspace_write' }));
    };
    prompt(demote, 'req-1');
    expect(demoteRejected).toEqual(['write→workspace_read']);
    expect(demoteOrdinals).toEqual(['op_1_1']);
  });

  it('反例三 · 同一 tc 不得改 toolName：progress / finished 改名一律 fail-closed', () => {
    const progress = openHarness();
    progress.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      capture(() => session.publishAgentEvent({ kind: 'tool_progress', rawToolCallId: 'call_w', toolName: 'read' }));
    };
    prompt(progress, 'req-1');
    expect(agentEventKinds(progress)).toEqual(['tool_started']);
    expect(lastPacket(progress)).toMatchObject(UPSTREAM_TERMINAL);

    const finished = openHarness();
    finished.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' });
      capture(() =>
        session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_r', toolName: 'glob', outcome: 'succeeded' }),
      );
    };
    prompt(finished, 'req-1');
    expect(agentEventKinds(finished)).toEqual(['tool_started']);
    expect(lastPacket(finished)).toMatchObject(UPSTREAM_TERMINAL);
  });

  /**
   * prompt 1 故意留下一枚**未 finished** 的 tc。这样 owner 门就是唯一能拦住它的判据：
   * 阶段门（finished）与登记门（从未登记）都不适用——否则 stale 反例会被别的门顺手挡下，
   * 于是「owner 门」自身零区分力。
   */
  function withStaleToolCall(): Harness {
    const h = openHarness();
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' });
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    expect(lastPacket(h)).toMatchObject({ type: 'terminal', payload: { status: 'completed' } });
    return h;
  }

  it('反例九 · 上一 prompt 的 stale tc 不得在新 prompt 中 reserve', () => {
    const h = withStaleToolCall();
    const ordinals: string[] = [];
    const rejected: string[] = [];
    h.hooks.startPrompt = (_p, session) => {
      const error = capture(() => {
        ordinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_1', capability: 'workspace_read' }));
      });
      if (error !== null) rejected.push('stale');
      // 本 prompt 自己的 tc 才有效；stale reserve 不得预先烧掉它的 ordinal。
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r2', toolName: 'read' });
      ordinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_2', capability: 'workspace_read' }));
    };
    prompt(h, 'req-2');
    expect(rejected).toEqual(['stale']);
    expect(ordinals).toEqual(['op_1_1']);
  });

  it('stale tc 的 progress / finished 同样 fail-closed，raw id 仍在本 leg 映射内也不例外', () => {
    for (const event of [
      { kind: 'tool_progress', rawToolCallId: 'call_r', toolName: 'read' },
      { kind: 'tool_finished', rawToolCallId: 'call_r', toolName: 'read', outcome: 'succeeded' },
    ] as const) {
      const h = withStaleToolCall();
      h.hooks.startPrompt = (_p, session) => {
        // 'call_r' 的 raw→tc 映射是 per-leg 的，仍指向 tc_1_1；拦住它的只能是 owner prompt。
        capture(() => session.publishAgentEvent(event));
      };
      prompt(h, 'req-2');
      // 全册只该有 prompt 1 那一枚 tool_started；prompt 2 的 stale 事件零出 wire。
      expect(agentEventKinds(h), event.kind).toEqual(['tool_started']);
      expect(lastPacket(h), event.kind).toMatchObject(UPSTREAM_TERMINAL);
    }
  });

  it('反例十 · finished 之后不得用旧 reservation 补发 host_request', () => {
    const h = openHarness();
    const ordinals: string[] = [];
    const rejected: string[] = [];
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w', toolName: 'write' });
      const operationId = session.reserveHostOperation({
        publicToolCallId: 'tc_1_1',
        capability: 'workspace_write',
      });
      ordinals.push(operationId);
      // 本地阶段可判定的 failed：该 tc 就此 finished，这枚尚未 send 的 reservation 随之作废。
      session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_w', toolName: 'write', outcome: 'failed' });

      // reserve 期通过不构成 send 期授权：否则写 effect 会晚于它所属工具的公开生命周期。
      const late = capture(() =>
        session.sendReservedHostRequest({
          sessionId: SESSION,
          requestId: 'req-1',
          operationId,
          proposalHash: HASH,
          ...WRITE_REQUEST,
        } as ReservedHostRequest),
      );
      if (late instanceof ProductSidecarError) rejected.push('finished-send');

      // 已烧的 ordinal 不回收：下一枚合法 tc 的 reservation 只能是 op_1_2。
      capture(() => {
        session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_w2', toolName: 'write' });
        ordinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_2', capability: 'workspace_write' }));
      });
    };
    prompt(h, 'req-1');
    expect(rejected).toEqual(['finished-send']);
    expect(h.out().filter((packet) => packet.type === 'host_request')).toHaveLength(0);
    expect(h.session.snapshot().pendingOperationId).toBeNull();
    expect(ordinals).toEqual(['op_1_1', 'op_1_2']);
  });

  it('已 finished 的 tc 不得再 reserve，且拒绝同样早于 ordinal 分配', () => {
    const h = openHarness();
    const ordinals: string[] = [];
    const rejected: string[] = [];
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' });
      session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_r', toolName: 'read', outcome: 'succeeded' });
      const error = capture(() => {
        ordinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_1', capability: 'workspace_read' }));
      });
      if (error !== null) rejected.push('finished');
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r2', toolName: 'read' });
      ordinals.push(session.reserveHostOperation({ publicToolCallId: 'tc_1_2', capability: 'workspace_read' }));
    };
    prompt(h, 'req-1');
    expect(rejected).toEqual(['finished']);
    expect(ordinals).toEqual(['op_1_1']);
  });
});

describe('R2-2 · 单向 phase 与 closed event union', () => {
  it('反例八 · finished 之后的同 tc progress / finished 必须 fail-closed', () => {
    const progress = openHarness();
    progress.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' });
      session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_r', toolName: 'read', outcome: 'succeeded' });
      capture(() => session.publishAgentEvent({ kind: 'tool_progress', rawToolCallId: 'call_r', toolName: 'read' }));
    };
    prompt(progress, 'req-1');
    expect(agentEventKinds(progress)).toEqual(['tool_started', 'tool_finished']);
    expect(lastPacket(progress)).toMatchObject(UPSTREAM_TERMINAL);

    const twice = openHarness();
    twice.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' });
      session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_r', toolName: 'read', outcome: 'succeeded' });
      capture(() =>
        session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_r', toolName: 'read', outcome: 'failed' }),
      );
    };
    prompt(twice, 'req-1');
    expect(finishedEvents(twice)).toHaveLength(1);
    expect(lastPacket(twice)).toMatchObject(UPSTREAM_TERMINAL);
  });

  it('每 prompt 至多一枚未 finished tc：重叠 tool_started 由状态机显式拒，不靠上游 sequential 调度', () => {
    const h = openHarness();
    h.hooks.startPrompt = (_p, session) => {
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_a', toolName: 'read' });
      capture(() => session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_b', toolName: 'glob' }));
    };
    prompt(h, 'req-1');
    expect(agentEventKinds(h)).toEqual(['tool_started']);
    expect(lastPacket(h)).toMatchObject(UPSTREAM_TERMINAL);
  });

  it('反例四 · 未知 kind / 未知 toolName 收为 upstream_event_unsupported，不逃逸为 TypeError 或 callback failure', () => {
    const unknownKind = openHarness();
    let escaped: unknown = 'unset';
    unknownKind.hooks.startPrompt = (_p, session) => {
      escaped = capture(() =>
        session.publishAgentEvent({
          kind: 'tool_cancelled',
          rawToolCallId: 'call_w',
          toolName: 'write',
        } as unknown as OutboundAgentEvent),
      );
    };
    prompt(unknownKind, 'req-1');
    expect(escaped).toBeNull();
    expect(agentEventKinds(unknownKind)).toEqual([]);
    expect(lastPacket(unknownKind)).toMatchObject(UPSTREAM_TERMINAL);
    // 未知 event 不得顺手把 turn 累计器写成 undefined。
    expect(unknownKind.session.snapshot().observedTurns).toBe(0);

    const nonRecord = openHarness();
    let nonRecordEscaped: unknown = 'unset';
    nonRecord.hooks.startPrompt = (_p, session) => {
      nonRecordEscaped = capture(() =>
        session.publishAgentEvent(null as unknown as OutboundAgentEvent),
      );
    };
    prompt(nonRecord, 'req-1');
    expect(nonRecordEscaped).toBeNull();
    expect(agentEventKinds(nonRecord)).toEqual([]);
    expect(lastPacket(nonRecord)).toMatchObject(UPSTREAM_TERMINAL);

    const undefinedRecord = openHarness();
    let undefinedEscaped: unknown = 'unset';
    undefinedRecord.hooks.startPrompt = (_p, session) => {
      undefinedEscaped = capture(() =>
        session.publishAgentEvent(undefined as unknown as OutboundAgentEvent),
      );
    };
    prompt(undefinedRecord, 'req-1');
    expect(undefinedEscaped).toBeNull();
    expect(agentEventKinds(undefinedRecord)).toEqual([]);
    expect(lastPacket(undefinedRecord)).toMatchObject(UPSTREAM_TERMINAL);

    const arrayRecord = openHarness();
    let arrayEscaped: unknown = 'unset';
    arrayRecord.hooks.startPrompt = (_p, session) => {
      const disguisedArray = Object.assign([], {
        kind: 'assistant_text_delta',
        delta: '不得投影',
      });
      arrayEscaped = capture(() =>
        session.publishAgentEvent(disguisedArray as unknown as OutboundAgentEvent),
      );
    };
    prompt(arrayRecord, 'req-1');
    expect(arrayEscaped).toBeNull();
    expect(agentEventKinds(arrayRecord)).toEqual([]);
    expect(lastPacket(arrayRecord)).toMatchObject(UPSTREAM_TERMINAL);

    const unknownTool = openHarness();
    let toolEscaped: unknown = 'unset';
    unknownTool.hooks.startPrompt = (_p, session) => {
      toolEscaped = capture(() =>
        session.publishAgentEvent({
          kind: 'tool_started',
          rawToolCallId: 'call_x',
          toolName: 'bash',
        } as unknown as OutboundAgentEvent),
      );
    };
    prompt(unknownTool, 'req-1');
    // 闭集外的 toolName 同样只走 terminal，不得以抛错代替 fail-closed 投影。
    expect(toolEscaped).toBeNull();
    expect(agentEventKinds(unknownTool)).toEqual([]);
    expect(lastPacket(unknownTool)).toMatchObject(UPSTREAM_TERMINAL);
  });
});

describe('R2-3 · write 阶段分型与 host-result truth', () => {
  it('反例六 · write 尚无 operation 时的 succeeded / uncertain 先改投 failed，再按上游违约关闭', () => {
    for (const outcome of ['succeeded', 'uncertain'] as const) {
      const h = openHarness();
      h.hooks.startPrompt = (_p, session) => {
        startTool(session, 'write');
        capture(() =>
          session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_w', toolName: 'write', outcome }),
        );
      };
      prompt(h, 'req-1');
      expect(finishedEvents(h), outcome).toEqual([
        { kind: 'tool_finished', toolCallId: 'tc_1_1', toolName: 'write', outcome: 'failed' },
      ]);
      expect(lastPacket(h), outcome).toMatchObject(UPSTREAM_TERMINAL);
    }

    // 本地阶段真能判定的两枚仍如实放行，改投不得误伤。
    for (const outcome of ['failed', 'denied'] as const) {
      const h = openHarness();
      h.hooks.startPrompt = (_p, session) => {
        startTool(session, 'write');
        session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_w', toolName: 'write', outcome });
        session.finishPrompt({ kind: 'completed' });
      };
      prompt(h, 'req-1');
      expect(finishedEvents(h), outcome).toEqual([
        { kind: 'tool_finished', toolCallId: 'tc_1_1', toolName: 'write', outcome },
      ]);
      expect(lastPacket(h), outcome).toMatchObject({ type: 'terminal', payload: { status: 'completed' } });
    }
  });

  it('反例五 · write 仍 operation_pending 时的上游 tool_finished 只进闩锁，outcome 只认 host status', () => {
    const h = openHarness();
    h.hooks.startPrompt = (_p, session) => {
      startTool(session, 'write');
      requestHost(session, WRITE_REQUEST);
      capture(() =>
        session.publishAgentEvent({ kind: 'tool_finished', rawToolCallId: 'call_w', toolName: 'write', outcome: 'succeeded' }),
      );
    };
    prompt(h, 'req-1');
    // 闩锁：不投影上游 outcome、不提前 terminal、pending 不丢。
    expect(finishedEvents(h)).toEqual([]);
    expect(terminals(h)).toEqual([]);
    expect(h.session.snapshot().pendingOperationId).toBe('op_1_1');

    hostResult(h, {
      operationId: 'op_1_1',
      capability: 'workspace_write',
      operation: 'write',
      status: 'denied',
      error: { code: 'user_denied', message: '用户拒绝' },
    });
    expect(finishedEvents(h)).toEqual([
      { kind: 'tool_finished', toolCallId: 'tc_1_1', toolName: 'write', outcome: 'denied' },
    ]);
    expect(lastPacket(h)).toMatchObject(UPSTREAM_TERMINAL);
  });
});

describe('R2-4 · settled effect 与新 reservation 结构互斥', () => {
  /** host_result 已合法收下、`tool_finished` 尚未投影的那一刻。 */
  function settled(onDeliver: (session: ProductSidecarSession) => void): Harness {
    const h = openHarness();
    h.hooks.startPrompt = (_p, session) => {
      startTool(session, 'write');
      requestHost(session, WRITE_REQUEST);
    };
    h.hooks.deliverHostResult = (_r, session) => void capture(() => onDeliver(session));
    prompt(h, 'req-1');
    capture(() => hostResult(h, writeOk('op_1_1')));
    return h;
  }

  const SETTLED_FINISHED = {
    kind: 'tool_finished',
    toolCallId: 'tc_1_1',
    toolName: 'write',
    outcome: 'succeeded',
  };

  it('反例二 · settled write 未投影前不得再 reserve / send 第二枚 operation', () => {
    const h = settled((session) => void requestHost(session, WRITE_REQUEST));
    expect(finishedEvents(h)).toEqual([SETTLED_FINISHED]);
    expect(h.out().filter((packet) => packet.type === 'host_request')).toHaveLength(1);
    expect(terminals(h)).toHaveLength(1);
    expect(lastPacket(h)).toMatchObject(UPSTREAM_TERMINAL);
  });

  it('反例七 · settled effect 未投影时的普通 finishPrompt 不得抹掉它', () => {
    let escaped: unknown = 'unset';
    const h = settled((session) => {
      escaped = capture(() => session.finishPrompt({ kind: 'completed' }));
    });
    expect(escaped).toBeNull();
    expect(finishedEvents(h)).toEqual([SETTLED_FINISHED]);
    expect(terminals(h)).toHaveLength(1);
    expect(lastPacket(h)).toMatchObject(UPSTREAM_TERMINAL);
  });

  it('settled effect 未投影时起下一枚工具，同样先自发 tool_finished 再 terminal', () => {
    const h = settled((session) =>
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_r', toolName: 'read' }),
    );
    expect(agentEventKinds(h)).toEqual(['tool_started', 'tool_finished']);
    expect(finishedEvents(h)).toEqual([SETTLED_FINISHED]);
    expect(terminals(h)).toHaveLength(1);
    expect(lastPacket(h)).toMatchObject(UPSTREAM_TERMINAL);
  });
});
