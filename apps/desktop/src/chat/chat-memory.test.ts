import { afterEach, describe, expect, it } from 'vitest';
import type { TranscriptSession } from './session-transcript';
import {
  MEMORY_SCHEMA_VERSION,
  MEMORY_STORAGE_KEY,
  appendDistilled,
  clearMemory,
  containsCaseContent,
  containsSecret,
  distillMemory,
  formatMemorySegment,
  loadMemory,
  memorySegmentFor,
  searchTranscripts,
  verifyTraceable,
  type MemoryEntry,
  type MemorySource,
} from './chat-memory';

/** 内存背板：隔离每例，替代 localStorage。 */
function makeBackend(seed?: string) {
  const map = new Map<string, string>();
  if (seed !== undefined) map.set(MEMORY_STORAGE_KEY, seed);
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

const SOURCE: MemorySource = { sessionId: 'chat-sess-1', turnId: 'chat-turn-1' };

afterEach(() => {
  /* 每例自带背板，无全局态需清理 */
});

// ── 蒸馏（纯规则，两族：显式标记类 + 实体/偏好模式类）───────────────────────
describe('distillMemory：显式标记类', () => {
  it('“记住…”蒸出 directive，剥离标记词', () => {
    const entries = distillMemory({ userText: '记住：答辩截止是每月 15 号', source: SOURCE, now: 1000 });
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('directive');
    expect(entries[0].text).toBe('答辩截止是每月 15 号');
    expect(entries[0].source).toEqual(SOURCE);
    expect(entries[0].createdAt).toBe(1000);
  });

  it('英文 remember/note 亦命中', () => {
    expect(distillMemory({ userText: 'Remember that I use British spelling', source: SOURCE, now: 1 })[0]?.text)
      .toBe('I use British spelling');
    expect(distillMemory({ userText: 'note: deadlines are hard', source: SOURCE, now: 1 })[0]?.kind)
      .toBe('directive');
  });
});

describe('distillMemory：实体/偏好模式类', () => {
  it('“我叫X”蒸出 entity', () => {
    const e = distillMemory({ userText: '你好，我叫李明。', source: SOURCE, now: 1 });
    expect(e).toHaveLength(1);
    expect(e[0].kind).toBe('entity');
    expect(e[0].text).toBe('李明');
  });

  it('“我更喜欢/偏好X”蒸出 preference', () => {
    expect(distillMemory({ userText: '我更喜欢简短的回答', source: SOURCE, now: 1 })[0]?.kind).toBe('preference');
    expect(distillMemory({ userText: '以后默认用中文', source: SOURCE, now: 1 })[0]?.text).toBe('中文');
  });

  it('普通闲聊不蒸出（高精度，低召回可接受）', () => {
    expect(distillMemory({ userText: '今天天气不错，我们聊聊合同法吧', source: SOURCE, now: 1 })).toHaveLength(0);
  });

  it('多句各自成条并去重同义', () => {
    const e = distillMemory({ userText: '我叫李明。\n记住：我叫李明', source: SOURCE, now: 1 });
    // 两句语义同名，去重后不重复堆叠（id 稳定）
    expect(e.filter((x) => x.text === '李明').length).toBeGreaterThanOrEqual(1);
  });
});

// ── 隔离守卫：案件/Work 内容进入 memory 触红 ──────────────────────────────
describe('隔离守卫（案件内容不入 memory）', () => {
  it('containsCaseContent 命中材料边界标记', () => {
    expect(containsCaseContent('<<<材料:开始 fileId=contract.pdf sha256=abc>>>\n第一条…')).toBe(true);
    expect(containsCaseContent('我们讨论一下这个案件的策略')).toBe(false); // 「案件」词本身不是案件内容
  });

  it('蒸馏输入携案件材料边界 → 零条目（否则内嵌 directive 会被蒸出，触红）', () => {
    const leaked = '<<<材料:开始 fileId=x sha256=y>>>\n记住：本案被告是张三\n<<<材料:结束 fileId=x>>>';
    expect(distillMemory({ userText: leaked, source: SOURCE, now: 1 })).toHaveLength(0);
  });
});

// ── 凭证守卫：密钥/凭证模式进入蒸馏输入触红 ──────────────────────────────
describe('凭证守卫（密钥/凭证不入蒸馏）', () => {
  it('containsSecret 命中常见密钥形态', () => {
    expect(containsSecret('sk-abcd1234efgh5678ijkl')).toBe(true);
    expect(containsSecret('我的 api_key = 9f8e7d6c5b4a3f2e1d0c')).toBe(true);
    expect(containsSecret('Authorization: Bearer eyJhbGciOi.payload.sig')).toBe(true);
    expect(containsSecret('密码：hunter2long')).toBe(true);
    expect(containsSecret('记住我喜欢简短回答')).toBe(false);
  });

  it('蒸馏输入携密钥 → 零条目（否则“记住我的 key 是 …”会入 memory，触红）', () => {
    const secretful = '记住我的 key 是 sk-abcd1234efgh5678ijkl9012';
    expect(distillMemory({ userText: secretful, source: SOURCE, now: 1 })).toHaveLength(0);
  });
});

// ── 存储：版本化单键 + fail-closed 读入 ─────────────────────────────────
describe('memory 存储（版本化单键，fail-closed）', () => {
  it('空存储 → ok 空数组', () => {
    expect(loadMemory(makeBackend())).toEqual({ status: 'ok', entries: [] });
  });

  it('append 去重、按 createdAt 稳定排序', () => {
    const backend = makeBackend();
    appendDistilled(distillMemory({ userText: '我叫李明', source: SOURCE, now: 10 }), backend);
    appendDistilled(distillMemory({ userText: '记住：截止 15 号', source: { sessionId: 's', turnId: 't2' }, now: 20 }), backend);
    // 同义再蒸不叠加
    appendDistilled(distillMemory({ userText: '我叫李明', source: { sessionId: 's', turnId: 't3' }, now: 30 }), backend);
    const read = loadMemory(backend);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') throw new Error('unreachable');
    expect(read.entries).toHaveLength(2);
    expect(read.entries.map((e) => e.createdAt)).toEqual([10, 20]); // 保留最早，稳定排序
  });

  it('未知版本 → fail-closed unreadable（不静默使用、不静默清空）', () => {
    const backend = makeBackend(JSON.stringify({ version: 99, entries: [{ id: 'x', kind: 'directive', text: 'leak', source: SOURCE, createdAt: 1 }] }));
    const read = loadMemory(backend);
    expect(read.status).toBe('unreadable');
    // 组装注入 fail-closed：未知版本不注入任何字节
    expect(memorySegmentFor(backend)).toBe('');
  });

  it('损坏 JSON → unreadable', () => {
    expect(loadMemory(makeBackend('{not json')).status).toBe('unreadable');
  });

  it('条目结构不合 → unreadable（不放行畸形条目）', () => {
    const backend = makeBackend(JSON.stringify({ version: MEMORY_SCHEMA_VERSION, entries: [{ id: 'x' }] }));
    expect(loadMemory(backend).status).toBe('unreadable');
  });
});

// ── 一键清除彻底 ────────────────────────────────────────────────────────
describe('一键清除（彻底，无残留）', () => {
  it('清除后组装零 memory 内容（残留即触红）', () => {
    const backend = makeBackend();
    appendDistilled(distillMemory({ userText: '记住：截止 15 号', source: SOURCE, now: 1 }), backend);
    expect(memorySegmentFor(backend)).not.toBe('');
    clearMemory(backend);
    const read = loadMemory(backend);
    expect(read).toEqual({ status: 'ok', entries: [] });
    expect(memorySegmentFor(backend)).toBe('');
    // 底层键写回的是干净 v1 空信封（非 null，不留旧字节）
    expect(backend.map.get(MEMORY_STORAGE_KEY)).toBe(JSON.stringify({ version: MEMORY_SCHEMA_VERSION, entries: [] }));
  });

  it('清除对未知版本亦生效（重置为干净 v1）', () => {
    const backend = makeBackend(JSON.stringify({ version: 99, entries: [] }));
    clearMemory(backend);
    expect(loadMemory(backend)).toEqual({ status: 'ok', entries: [] });
  });
});

// ── 注入段格式 ──────────────────────────────────────────────────────────
describe('formatMemorySegment：低频前缀段', () => {
  it('空条目 → 空串（不注入、快照不动）', () => {
    expect(formatMemorySegment([])).toBe('');
  });

  it('非空 → 带段头与「作参考不作裁决依据」的数据边界，确定性字节', () => {
    const entries: MemoryEntry[] = [
      { id: 'directive:截止 15 号', kind: 'directive', text: '截止 15 号', source: SOURCE, createdAt: 1 },
      { id: 'entity:李明', kind: 'entity', text: '李明', source: SOURCE, createdAt: 2 },
    ];
    const seg = formatMemorySegment(entries);
    expect(seg).toContain('[长期记忆]');
    expect(seg).toContain('作参考不作裁决依据');
    expect(seg).toContain('截止 15 号');
    expect(seg).toContain('李明');
    expect(formatMemorySegment(entries)).toBe(seg); // 确定性
  });
});

// ── 可追溯：来源坐标指向真实 turn ────────────────────────────────────────
describe('verifyTraceable：来源坐标指向真实 turn', () => {
  const sessions: TranscriptSession[] = [
    {
      id: 'chat-sess-1',
      startedAt: 0,
      endedAt: 10,
      turns: [
        { turnId: 'chat-turn-1', status: 'completed', at: 5, assistantMessage: '好的，我记住了。' },
        { turnId: 'chat-turn-2', status: 'completed', at: 9, assistantMessage: '截止是 15 号。' },
      ],
    },
  ];

  it('真实坐标 → ok', () => {
    const entries = distillMemory({ userText: '我叫李明', source: { sessionId: 'chat-sess-1', turnId: 'chat-turn-1' }, now: 1 });
    expect(verifyTraceable(entries, sessions).ok).toBe(true);
  });

  it('伪造 turnId → 触红（ok:false，指认越界条目）', () => {
    const fake: MemoryEntry = { id: 'x', kind: 'directive', text: 'x', source: { sessionId: 'chat-sess-1', turnId: 'ghost' }, createdAt: 1 };
    const result = verifyTraceable([fake], sessions);
    expect(result.ok).toBe(false);
    expect(result.offending).toEqual(fake);
  });

  it('伪造 sessionId → 触红', () => {
    const fake: MemoryEntry = { id: 'x', kind: 'directive', text: 'x', source: { sessionId: 'ghost', turnId: 'chat-turn-1' }, createdAt: 1 };
    expect(verifyTraceable([fake], sessions).ok).toBe(false);
  });
});

// ── 历史检索 hook（字符串检索，仅系统触发）─────────────────────────────
describe('searchTranscripts：字符串检索 hook', () => {
  const sessions: TranscriptSession[] = [
    {
      id: 's1',
      startedAt: 0,
      endedAt: 10,
      turns: [
        { turnId: 't1', status: 'completed', at: 5, assistantMessage: '合同第三条约定了违约金。' },
        { turnId: 't2', status: 'completed', at: 9, assistantMessage: '答辩要点已整理。' },
      ],
    },
  ];

  it('命中返回坐标与片段', () => {
    const hits = searchTranscripts(sessions, '违约金');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ sessionId: 's1', turnId: 't1' });
    expect(hits[0].snippet).toContain('违约金');
  });

  it('大小写不敏感', () => {
    const withEn: TranscriptSession[] = [{ id: 's', startedAt: 0, endedAt: 1, turns: [{ turnId: 't', status: 'completed', at: 1, assistantMessage: 'The Deadline is fixed.' }] }];
    expect(searchTranscripts(withEn, 'deadline')).toHaveLength(1);
  });

  it('无命中 → 空数组', () => {
    expect(searchTranscripts(sessions, '不存在的词')).toHaveLength(0);
    expect(searchTranscripts(sessions, '   ')).toHaveLength(0); // 空查询不检索
  });
});
