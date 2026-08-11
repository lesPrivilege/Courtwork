import { describe, expect, it } from 'vitest';
import goldenJournal from '../../../../packages/pi-lane/fixtures/write-session-journal-v1.jsonl?raw';

import { PI_COPY, piSessionClosedCopy } from './pi-copy';
import { decodePiJournalRecord, PI_JOURNAL_TYPES } from './pi-journal';
import { foldPiRecords } from './pi-projection';

/**
 * 双端 golden：Rust `encode_record` 落盘的**同一份字节**。
 *
 * 用它而不是手写样本，是为了让「宿主换了记法而界面没跟上」这件事在本文件当场红——
 * 手写样本只能证明解码器自洽，证明不了它解的是真账本。
 */
const GOLDEN: string[] = goldenJournal
  .split('\n')
  .filter((raw: string) => raw.trim().length > 0);

function line(
  seq: number,
  type: string,
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    schemaVersion: 1,
    eventId: `event_${seq}`,
    seq,
    containerId: 'cnt-1',
    sessionId: 'sess-1',
    leg: 1,
    requestId: 'req-1',
    type,
    recordedAt: seq,
    payload,
    ...extra,
  });
}

const PROMPT = line(2, 'user_prompted', { text: '把合同编号整理成一份纪要' });
const TOOL_STARTED = line(3, 'agent_event', {
  kind: 'tool_started',
  toolCallId: 'tc_1_1',
  toolName: 'write',
});
const TOOL_FINISHED = line(8, 'agent_event', {
  kind: 'tool_finished',
  toolCallId: 'tc_1_1',
  toolName: 'write',
  outcome: 'ok',
});
const TEXT = line(9, 'agent_event', { kind: 'assistant_text_delta', delta: '已写入 ' });
const TEXT_2 = line(10, 'agent_event', { kind: 'assistant_text_delta', delta: '/workspace/纪要.md' });
const USAGE = line(11, 'turn_usage_recorded', {
  turn: 1,
  countedTowardTurnLimit: true,
  usage: {
    inputTokens: 120,
    outputTokens: 42,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    costUsd: 0.0012,
  },
  stopReason: 'end_turn',
});
const COMPLETED = line(12, 'prompt_completed', {
  status: 'completed',
  budget: { turns: 1, usd: 0.0012, turnLimit: 'open', usdLimit: 'disabled' },
});

/** 一整段成功的写入：golden 四枚 ＋ 前后文。 */
const FULL_WRITE = [
  GOLDEN[0],
  PROMPT,
  TOOL_STARTED,
  ...GOLDEN.slice(1),
  TOOL_FINISHED,
  TEXT,
  TEXT_2,
  USAGE,
  COMPLETED,
];

describe('decodePiJournalRecord', () => {
  it('认得双端 golden 的每一行', () => {
    for (const raw of GOLDEN) {
      const decoded = decodePiJournalRecord(raw);
      expect(decoded.ok, `golden 行未通过解码：${raw.slice(0, 80)}`).toBe(true);
    }
  });

  it('闭集与宿主同源：golden 里出现的每一型都在表内', () => {
    for (const raw of GOLDEN) {
      const type = JSON.parse(raw).type as string;
      expect(PI_JOURNAL_TYPES).toContain(type);
    }
  });

  it('未知 type 显式拒，不静默跳过', () => {
    const unknown = line(1, 'tool_promoted', { toolCallId: 'tc_1_1' });
    expect(decodePiJournalRecord(unknown)).toEqual({ ok: false, reason: 'unknown_type' });
  });

  it('未知 schemaVersion 显式拒', () => {
    const future = JSON.parse(GOLDEN[0]);
    future.schemaVersion = 2;
    expect(decodePiJournalRecord(JSON.stringify(future))).toEqual({
      ok: false,
      reason: 'unknown_schema_version',
    });
  });

  it('envelope 字段类型不符显式拒', () => {
    const bad = JSON.parse(GOLDEN[0]);
    bad.seq = '1';
    expect(decodePiJournalRecord(JSON.stringify(bad))).toEqual({
      ok: false,
      reason: 'bad_field_type',
    });
  });

  it('不是 JSON 就是不是 JSON', () => {
    expect(decodePiJournalRecord('{半行')).toEqual({ ok: false, reason: 'not_json' });
  });
});

describe('foldPiRecords', () => {
  it('从 golden 全链折出一段完整工作：提案—授权—落盘—终态', () => {
    const view = foldPiRecords('cnt-1', 'sess-1', FULL_WRITE);
    expect(view.decodeFailure).toBeUndefined();
    expect(view.modelId).toBe('deepseek-v4-flash');
    expect(view.maxTurns).toBe(12);
    expect(view.capabilities).toEqual(['case_read', 'workspace_read', 'workspace_write']);
    expect(view.blocks).toHaveLength(1);
    expect(view.blocks[0].prompt).toBe('把合同编号整理成一份纪要');
    expect(view.blocks[0].text).toBe('已写入 /workspace/纪要.md');
    expect(view.blocks[0].toolCallIds).toEqual(['tc_1_1']);
    // 次序即事实：工具卡在前、收尾正文在后，与账本到达顺序逐枚一致。
    expect(view.blocks[0].parts).toEqual([
      { kind: 'tool', toolCallId: 'tc_1_1' },
      { kind: 'text', text: '已写入 /workspace/纪要.md' },
    ]);
    expect(view.blocks[0].terminal?.status).toBe('completed');
    expect(view.turns).toBe(1);
    expect(view.budget?.usd).toBe(0.0012);
    expect(view.running).toBe(false);

    const call = view.toolCalls['tc_1_1'];
    expect(call.toolName).toBe('write');
    expect(call.running).toBe(false);
    expect(call.proposal?.logicalPath).toBe('纪要.md');
    expect(call.proposal?.operationId).toBe('op_1_1');
    expect(call.decision?.decision).toBe('approved');
    expect(call.effect?.state).toBe('succeeded');
  });

  it('索引只从 succeeded fold，且带已确认 hash', () => {
    const view = foldPiRecords('cnt-1', 'sess-1', FULL_WRITE);
    expect(view.drafts).toEqual([
      {
        logicalPath: '纪要.md',
        byteLength: 37,
        contentSha256: 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba',
        disposition: 'created',
        recordedAt: 7,
      },
    ]);
  });

  it('uncertain 不进成功索引——工具卡另有核验，核验结果不补写成成功', () => {
    const uncertain = [
      GOLDEN[0],
      PROMPT,
      TOOL_STARTED,
      GOLDEN[1],
      GOLDEN[2],
      GOLDEN[3],
      line(7, 'effect_uncertain', { toolCallId: 'tc_1_1', code: 'durability_unknown' }, {
        operationId: 'op_1_1',
      }),
    ];
    const view = foldPiRecords('cnt-1', 'sess-1', uncertain);
    expect(view.drafts).toEqual([]);
    expect(view.toolCalls['tc_1_1'].effect?.state).toBe('uncertain');
    // 提案本身仍在卡上：核验动作要拿它的 logicalPath 去问宿主。
    expect(view.toolCalls['tc_1_1'].proposal?.logicalPath).toBe('纪要.md');
  });

  it('failed 同样不进索引', () => {
    const failed = [
      GOLDEN[0],
      PROMPT,
      TOOL_STARTED,
      GOLDEN[1],
      GOLDEN[2],
      GOLDEN[3],
      line(7, 'effect_failed', { toolCallId: 'tc_1_1', code: 'symlink_forbidden' }, {
        operationId: 'op_1_1',
      }),
    ];
    const view = foldPiRecords('cnt-1', 'sess-1', failed);
    expect(view.drafts).toEqual([]);
    expect(view.toolCalls['tc_1_1'].effect?.code).toBe('symlink_forbidden');
  });

  it('同路径后写覆盖前写，索引不留旧 hash', () => {
    const second = line(
      20,
      'effect_succeeded',
      {
        toolCallId: 'tc_1_2',
        logicalPath: '纪要.md',
        disposition: 'overwritten',
        contentSha256: 'f'.repeat(64),
        byteLength: 99,
      },
      { operationId: 'op_1_2' },
    );
    const view = foldPiRecords('cnt-1', 'sess-1', [...FULL_WRITE, second]);
    expect(view.drafts).toHaveLength(1);
    expect(view.drafts[0].contentSha256).toBe('f'.repeat(64));
    expect(view.drafts[0].disposition).toBe('overwritten');
  });

  it('提案落账而回执未到 ⇒ 恰一枚待授权；回执落账即消失', () => {
    const waiting = [GOLDEN[0], PROMPT, TOOL_STARTED, GOLDEN[1]];
    const view = foldPiRecords('cnt-1', 'sess-1', waiting);
    expect(view.pendingProposal).toEqual({
      toolCallId: 'tc_1_1',
      operationId: 'op_1_1',
      logicalPath: '纪要.md',
      byteLength: 37,
      contentSha256: 'e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba',
      action: 'created',
    });
    expect(view.running).toBe(true);

    const decided = foldPiRecords('cnt-1', 'sess-1', [...waiting, GOLDEN[2]]);
    expect(decided.pendingProposal).toBeUndefined();
  });

  it('被拒的提案带着拒绝理由留在卡上，effect 一段都没有', () => {
    const denied = [
      GOLDEN[0],
      PROMPT,
      TOOL_STARTED,
      GOLDEN[1],
      line(5, 'authorization_decided', {
        toolCallId: 'tc_1_1',
        decision: 'denied',
        code: 'user_denied',
      }, { operationId: 'op_1_1' }),
    ];
    const view = foldPiRecords('cnt-1', 'sess-1', denied);
    expect(view.pendingProposal).toBeUndefined();
    expect(view.toolCalls['tc_1_1'].decision).toEqual({
      decision: 'denied',
      code: 'user_denied',
    });
    expect(view.toolCalls['tc_1_1'].effect).toBeUndefined();
    expect(view.drafts).toEqual([]);
  });

  it('认不出一行即整条会话进显式失败态，不接着往下折', () => {
    const poisoned = [GOLDEN[0], PROMPT, '{"schemaVersion":1,"type":"tool_promoted"}', TEXT];
    const view = foldPiRecords('cnt-1', 'sess-1', poisoned);
    expect(view.decodeFailure).toEqual({ reason: 'unknown_type', atLine: 2 });
    expect(view.blocks).toEqual([]);
    expect(view.drafts).toEqual([]);
  });

  it('文本—工具—文本的次序不被合并抹掉', () => {
    const interleaved = foldPiRecords('cnt-1', 'sess-1', [
      GOLDEN[0],
      PROMPT,
      line(3, 'agent_event', { kind: 'assistant_text_delta', delta: '先读一下 ' }),
      line(4, 'agent_event', { kind: 'assistant_text_delta', delta: '案件材料。' }),
      TOOL_STARTED,
      TOOL_FINISHED,
      line(9, 'agent_event', { kind: 'assistant_text_delta', delta: '写好了。' }),
    ]);
    expect(interleaved.blocks[0].parts).toEqual([
      { kind: 'text', text: '先读一下 案件材料。' },
      { kind: 'tool', toolCallId: 'tc_1_1' },
      { kind: 'text', text: '写好了。' },
    ]);
  });

  it('取消与失败各自带回自己的终态与预算', () => {
    const canceled = foldPiRecords('cnt-1', 'sess-1', [
      GOLDEN[0],
      PROMPT,
      line(4, 'prompt_canceled', {
        status: 'canceled',
        reason: 'user',
        budget: { turns: 0, usd: null, turnLimit: 'open', usdLimit: 'disabled' },
      }),
    ]);
    expect(canceled.blocks[0].terminal).toEqual({
      status: 'canceled',
      reason: 'user',
      budget: { turns: 0, usd: null, turnLimit: 'open', usdLimit: 'disabled' },
    });
    expect(canceled.running).toBe(false);

    const failed = foldPiRecords('cnt-1', 'sess-1', [
      GOLDEN[0],
      PROMPT,
      line(4, 'prompt_failed', {
        status: 'failed',
        error: { code: 'provider_error', message: '服务未响应', retryable: true },
        budget: { turns: 0, usd: null, turnLimit: 'open', usdLimit: 'disabled' },
      }),
    ]);
    expect(failed.blocks[0].terminal?.error).toEqual({
      code: 'provider_error',
      message: '服务未响应',
      retryable: true,
    });
  });

  it('恢复：session_resumed 带回已计回合并标记本次是续跑', () => {
    const resumed = foldPiRecords('cnt-1', 'sess-1', [
      GOLDEN[0],
      line(3, 'session_interrupted', { reason: 'sidecar_ended', costCoverage: 'complete' }, {
        requestId: null,
      }),
      JSON.stringify({
        schemaVersion: 1,
        eventId: 'event_4',
        seq: 4,
        containerId: 'cnt-1',
        sessionId: 'sess-1',
        leg: 2,
        requestId: null,
        type: 'session_resumed',
        recordedAt: 4,
        payload: {
          startedEventId: 'event_1',
          previousLeg: 1,
          priorObservedTurns: 3,
          priorTurns: 3,
          priorUsd: 0.02,
          messageContext: 'empty',
          promptId: 'md-work-v1',
          capabilities: ['case_read', 'workspace_read', 'workspace_write'],
        },
      }),
    ]);
    expect(resumed.interrupted).toBe(true);
    expect(resumed.leg).toBe(2);
    expect(resumed.turns).toBe(3);
    expect(resumed.running).toBe(false);
  });

  it('会话终态之后不再算作运行中', () => {
    const closed = foldPiRecords('cnt-1', 'sess-1', [
      GOLDEN[0],
      PROMPT,
      line(4, 'session_failed', { cause: { kind: 'runtime', code: 'sidecar_exit' } }, {
        requestId: null,
      }),
    ]);
    expect(closed.running).toBe(false);
    expect(closed.sessionTerminal).toEqual({ type: 'session_failed', detail: 'sidecar_exit' });
  });

  it('未知费用不得被折成 0', () => {
    const unknownCost = foldPiRecords('cnt-1', 'sess-1', [
      GOLDEN[0],
      PROMPT,
      line(4, 'prompt_completed', {
        status: 'completed',
        budget: { turns: 1, usd: null, turnLimit: 'open', usdLimit: 'unknown' },
      }),
    ]);
    expect(unknownCost.budget?.usd).toBeNull();
    expect(unknownCost.budget?.usdLimit).toBe('unknown');
  });

  /**
   * `PI-JOURNAL-TIGHTEN-1` 段④：`budget_unknown` 与「真达上限」是两件事，文案必须分流。
   *
   * 真缺陷面：maxUsd 开启时单回合 `costUsd:null` 使累计 usd 永久置 null → `budget_unknown`
   * → `retryable:false` → 本段关闭且 resume 拒绝。瞬时 provider 行为换来不可逆惩罚，
   * 用户却只看到一句与其他关闭同源的「这一段工作已经结束」，看不出成因是「有一回合没拿到
   * 计费数据」。成因在账本里（`prompt_failed.error.code`），界面必须把它取出来。
   */
  it('maxUsd 开启而某回合费用未知：终态成因具名到 budget_unknown，文案与真达上限分流', () => {
    const startedWithLimit = JSON.parse(GOLDEN[0]) as {
      payload: { limits: { maxUsd: number | null } };
    };
    startedWithLimit.payload.limits.maxUsd = 5;
    const view = foldPiRecords('cnt-1', 'sess-1', [
      JSON.stringify(startedWithLimit),
      PROMPT,
      line(3, 'turn_usage_recorded', {
        turn: 1,
        countedTowardTurnLimit: true,
        usage: {
          inputTokens: 120,
          outputTokens: 42,
          cacheReadTokens: null,
          cacheWriteTokens: null,
          costUsd: null,
        },
        stopReason: 'stop',
      }),
      line(4, 'prompt_failed', {
        status: 'failed',
        error: {
          code: 'budget_unknown',
          message: '已启用金额限额，但存在费用未知的回合',
          retryable: false,
        },
        budget: { turns: 1, usd: null, turnLimit: 'open', usdLimit: 'unknown' },
      }),
      line(5, 'session_failed', { cause: { kind: 'prompt', promptEventId: 'event_4' } }, {
        requestId: null,
      }),
    ]);

    const terminal = view.sessionTerminal;
    if (!terminal) throw new Error('对照：这一串必然折出会话终态');
    expect(view.maxUsd).toBe(5);
    expect(terminal).toEqual({ type: 'session_failed', detail: 'budget_unknown' });
    expect(piSessionClosedCopy(terminal)).toBe(PI_COPY.budgetUnknown);
    // 禁形：不得复用「已达本段上限」，也不得塌回不说成因的通用关闭句。
    expect(piSessionClosedCopy(terminal)).not.toBe(PI_COPY.budgetStopped);
    expect(piSessionClosedCopy(terminal)).not.toBe(PI_COPY.sessionClosed);
  });

  it('真达上限仍走 budgetStopped；其余关闭走通用句——三档互不相等', () => {
    expect(piSessionClosedCopy({ type: 'session_budget_stopped' })).toBe(PI_COPY.budgetStopped);
    expect(piSessionClosedCopy({ type: 'session_failed', detail: 'sidecar_exit' })).toBe(
      PI_COPY.sessionClosed,
    );
    expect(piSessionClosedCopy({ type: 'session_completed' })).toBe(PI_COPY.sessionClosed);
    const three = new Set([PI_COPY.budgetStopped, PI_COPY.budgetUnknown, PI_COPY.sessionClosed]);
    expect(three.size).toBe(3);
  });
});
