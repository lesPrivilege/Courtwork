import { describe, expect, it } from 'vitest';

import {
  decodeSidecarPacketLine,
  encodePacketLine,
  type BootstrapPayload,
  type HostResultPayload,
  type ProductPacket,
  type SidecarPacket,
  type WorkspaceCapability,
} from './product-protocol.js';
import {
  ProductSidecarError,
  createProductSidecarSession,
  type OutboundHostRequest,
  type ProductSidecarSession,
  type PromptCompletion,
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
    startPrompt?: (prompt: { requestId: string; text: string }, session: ProductSidecarSession) => void;
    cancel?: (cancel: { requestId: string; reason: 'user' | 'host' }, session: ProductSidecarSession) => void;
    deliverHostResult?: (result: HostResultPayload, session: ProductSidecarSession) => void;
  } = {};

  const session = createProductSidecarSession({
    transport: {
      write: (line) => void lines.push(line),
      exit: (code) => void exits.push(code),
    },
    runtime: {
      capabilities: () => options.capabilities ?? ['workspace_write', 'case_read', 'workspace_read'],
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
      shutdown: () => void calls.push('shutdown'),
    },
    hashProposal: () => options.hash ?? HASH,
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

const WRITE_REQUEST: OutboundHostRequest = {
  capability: 'workspace_write',
  arguments: { logicalPath: 'brief.md', content: '正文', contentSha256: 'c'.repeat(64), byteLength: 6 },
};

function writeOk(operationId: string): HostResultPayload {
  return {
    operationId,
    capability: 'workspace_write',
    operation: 'write',
    status: 'ok',
    value: { logicalPath: 'brief.md', disposition: 'created', contentSha256: 'c'.repeat(64), byteLength: 6 },
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
      session.publishAgentEvent({ kind: 'tool_started', rawToolCallId: 'call_def456', toolName: 'read' });
      session.publishAgentEvent({
        kind: 'tool_finished',
        rawToolCallId: 'call_abc123',
        toolName: 'write',
        outcome: 'succeeded',
      });
    };
    prompt(h, 'req-1');
    const ids = h
      .out()
      .filter((packet) => packet.type === 'agent_event')
      .map((packet) => (packet.payload as { toolCallId?: string }).toolCallId);
    expect(ids).toEqual(['tc_1_1', 'tc_1_1', 'tc_1_2', 'tc_1_1']);
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
    bootstrap(h);
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
      bootstrap(h);
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
      operationId = session.requestHost(WRITE_REQUEST);
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
      expect(() => session.requestHost(WRITE_REQUEST)).toThrow(ProductSidecarError);
      session.finishPrompt({ kind: 'completed' });
    };
    prompt(h, 'req-1');
    expect(h.out().some((packet) => packet.type === 'host_request')).toBe(false);
  });

  it('同时两个在途 host request 被拒；在途未收束就 finishPrompt 也被拒', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = (_p, session) => {
      session.requestHost(WRITE_REQUEST);
      expect(() => session.requestHost(WRITE_REQUEST)).toThrow(ProductSidecarError);
      expect(() => session.finishPrompt({ kind: 'completed' })).toThrow(ProductSidecarError);
    };
    prompt(h, 'req-1');
    expect(h.out().filter((packet) => packet.type === 'host_request')).toHaveLength(1);
  });

  it('第二枚 op 铸新号，不复用', () => {
    const h = createHarness();
    bootstrap(h);
    const ids: string[] = [];
    h.hooks.startPrompt = (_p, session) => void ids.push(session.requestHost(WRITE_REQUEST));
    h.hooks.deliverHostResult = (_r, session) => void ids.push(session.requestHost(WRITE_REQUEST));
    prompt(h, 'req-1');
    hostResult(h, writeOk('op_1_1'));
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

  it('cancel 后不得再产生 delta 或 host request', () => {
    const h = createHarness();
    bootstrap(h);
    h.hooks.startPrompt = () => {};
    h.hooks.cancel = (_c, session) => {
      expect(() => session.publishAgentEvent({ kind: 'assistant_text_delta', delta: '甲' })).toThrow(ProductSidecarError);
      expect(() => session.requestHost(WRITE_REQUEST)).toThrow(ProductSidecarError);
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
    h.hooks.startPrompt = (_p, session) => void session.requestHost(WRITE_REQUEST);
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
    h.hooks.startPrompt = (_p, session) => void session.requestHost(WRITE_REQUEST);
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
      session.requestHost(WRITE_REQUEST);
    };
    h.hooks.deliverHostResult = (_r, session) => session.finishPrompt({ kind: 'completed' });
    prompt(h, 'req-1');
    hostResult(h, writeUncertain('op_1_1'));
    expect(lastPacket(h)).toMatchObject({ payload: { status: 'failed', error: { code: 'effect_uncertain' } } });
  });

  it('runtime 报告的失败在无更高优先项时如实上报', () => {
    const h = runWithTurns(bootstrapPayload({ limits: { maxTurns: 9, maxUsd: null } }), [turnEvent(1, true, 0.1)], {
      kind: 'failed',
      code: 'provider_error',
      message: '上游 5xx',
      retryable: true,
    });
    expect(lastPacket(h)).toMatchObject({
      payload: { status: 'failed', error: { code: 'provider_error', message: '上游 5xx', retryable: true } },
    });
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
      session.finishPrompt({ kind: 'failed', code: 'provider_error', message: 'x', retryable: true });
    prompt(retryable, 'req-1');
    expect(retryable.session.snapshot().phase).toBe('idle');

    const fatal = createHarness();
    bootstrap(fatal, bootstrapPayload({ limits: { maxTurns: 9, maxUsd: null } }));
    fatal.hooks.startPrompt = (_p, session) =>
      session.finishPrompt({ kind: 'failed', code: 'host_error', message: 'x', retryable: false });
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
      session.requestHost(WRITE_REQUEST);
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
        session.requestHost(WRITE_REQUEST);
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
