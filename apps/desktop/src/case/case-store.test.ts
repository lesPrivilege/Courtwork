import { describe, expect, it } from 'vitest';
import {
  CASE_LIST_SCHEMA_VERSION,
  CASE_LIST_STORAGE_KEY,
  loadCaseList,
  projectPersistableCases,
  readCaseList,
  writeCaseList,
  type CaseListBackend,
  type PersistedCase,
} from './case-store';
import type { CaseSummary } from './types';

/** 内存背板：单张 Map 背书，跨「实例」共享 → 模拟 localStorage 跨重载存活。隔离每例。 */
function makeBackend(seed?: string): CaseListBackend & { map: Map<string, string> } {
  const map = new Map<string, string>();
  if (seed !== undefined) map.set(CASE_LIST_STORAGE_KEY, seed);
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** 同一底层存储的「另一个实例」——重载后新 backend 读同一字节。 */
function reopen(backend: { map: Map<string, string> }): CaseListBackend {
  return {
    getItem: (key) => backend.map.get(key) ?? null,
    setItem: (key, value) => void backend.map.set(key, value),
    removeItem: (key) => void backend.map.delete(key),
  };
}

const GRANT_CASE: PersistedCase = { id: 'case-1', title: '合同审查案', grantId: 'grant-a', label: '合同案卷夹', kind: 'case' };
const UNBOUND_CASE: PersistedCase = { id: 'case-2', title: '临时工作区', kind: 'workspace' };

describe('case-store：案件列表版本化单键持久（work-session 先例，第三次复用）', () => {
  it('write → read 往返取回全部记录（保序）', () => {
    const backend = makeBackend();
    writeCaseList([GRANT_CASE, UNBOUND_CASE], backend);
    expect(readCaseList(backend)).toEqual([GRANT_CASE, UNBOUND_CASE]);
  });

  it('无记录时 read 返回空列表', () => {
    const backend = makeBackend();
    expect(readCaseList(backend)).toEqual([]);
  });

  it('重载后列表存活：新 backend 实例读同一底层存储仍取回记录', () => {
    const backend = makeBackend();
    writeCaseList([GRANT_CASE], backend);
    // 模拟重启/重载：丢弃旧实例，用新实例读同一底层字节。
    expect(readCaseList(reopen(backend))).toEqual([GRANT_CASE]);
  });

  it('CASE-TITLE-CONVERGE-1：一次性吸收同案旧键标题，写回列表后删除旧键', () => {
    const backend = makeBackend(JSON.stringify({ version: CASE_LIST_SCHEMA_VERSION, cases: [GRANT_CASE] }));
    const legacyKey = `courtwork.case-title.${GRANT_CASE.id}`;
    backend.map.set(legacyKey, '合同审查案 · 最后改名');

    expect(readCaseList(backend)).toEqual([{ ...GRANT_CASE, title: '合同审查案 · 最后改名' }]);
    expect(JSON.parse(backend.map.get(CASE_LIST_STORAGE_KEY) as string).cases[0].title).toBe('合同审查案 · 最后改名');
    expect(backend.map.has(legacyKey)).toBe(false);
  });

  it('CASE-TITLE-CONVERGE-1 fail-closed：列表不可读时不读取、不采用、不清除旧键', () => {
    const backend = makeBackend(JSON.stringify({ version: 999, cases: [GRANT_CASE] }));
    const legacyKey = `courtwork.case-title.${GRANT_CASE.id}`;
    backend.map.set(legacyKey, '不得复活的旧标题');
    const reads: string[] = [];
    const originalGet = backend.getItem;
    backend.getItem = (key) => {
      reads.push(key);
      return originalGet(key);
    };

    expect(readCaseList(backend)).toEqual([]);
    expect(reads).toEqual([CASE_LIST_STORAGE_KEY]);
    expect(backend.map.get(legacyKey)).toBe('不得复活的旧标题');
  });

  it('写入的信封携当前 schema 版本（不另造格式）', () => {
    const backend = makeBackend();
    writeCaseList([GRANT_CASE], backend);
    const raw = backend.map.get(CASE_LIST_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).version).toBe(CASE_LIST_SCHEMA_VERSION);
  });

  it('write 整表替换（非合并）：后一次写入覆盖前一次', () => {
    const backend = makeBackend();
    writeCaseList([GRANT_CASE, UNBOUND_CASE], backend);
    writeCaseList([UNBOUND_CASE], backend);
    expect(readCaseList(backend)).toEqual([UNBOUND_CASE]);
  });

  it('未绑定案不落 grantId/label 字段（只列表元数据，无绝对路径通道）', () => {
    const backend = makeBackend();
    writeCaseList([UNBOUND_CASE], backend);
    const raw = JSON.parse(backend.map.get(CASE_LIST_STORAGE_KEY) as string) as { cases: Record<string, unknown>[] };
    expect(raw.cases[0]).not.toHaveProperty('grantId');
    expect(raw.cases[0]).not.toHaveProperty('label');
  });

  it('fail-closed：未知 schema 版本 → 整库判不可读，read 返回空列表（不静默误用）', () => {
    const seed = JSON.stringify({ version: 999, cases: [GRANT_CASE] });
    const backend = makeBackend(seed);
    expect(loadCaseList(backend).status).toBe('unreadable');
    expect(readCaseList(backend)).toEqual([]);
  });

  it('fail-closed：坏 JSON → 不可读，read 返回空列表', () => {
    const backend = makeBackend('{not json');
    expect(loadCaseList(backend).status).toBe('unreadable');
    expect(readCaseList(backend)).toEqual([]);
  });

  it('fail-closed：cases 非数组 → 不可读', () => {
    const backend = makeBackend(JSON.stringify({ version: CASE_LIST_SCHEMA_VERSION, cases: { 'case-1': GRANT_CASE } }));
    expect(loadCaseList(backend).status).toBe('unreadable');
  });

  it('fail-closed：畸形记录（缺 id）→ 不可读，read 返回空列表', () => {
    const seed = JSON.stringify({ version: CASE_LIST_SCHEMA_VERSION, cases: [{ title: '无 id 案', kind: 'case' }] });
    const backend = makeBackend(seed);
    expect(loadCaseList(backend).status).toBe('unreadable');
    expect(readCaseList(backend)).toEqual([]);
  });

  it('fail-closed：未知 kind → 不可读（枚举漂移不静默接纳）', () => {
    const seed = JSON.stringify({ version: CASE_LIST_SCHEMA_VERSION, cases: [{ id: 'case-1', title: 'x', kind: 'folder' }] });
    const backend = makeBackend(seed);
    expect(loadCaseList(backend).status).toBe('unreadable');
  });

  it('fail-closed：grantId 为空串（畸形 opaque 引用）→ 不可读', () => {
    const seed = JSON.stringify({ version: CASE_LIST_SCHEMA_VERSION, cases: [{ id: 'case-1', title: 'x', grantId: '', kind: 'case' }] });
    const backend = makeBackend(seed);
    expect(loadCaseList(backend).status).toBe('unreadable');
  });
});

describe('projectPersistableCases：demo 与已归档不入持久（创建写入/归档清除对称）', () => {
  it('剔除 demo 案（恒挂语义，永不入持久）', () => {
    const projected = projectPersistableCases([
      { id: 'demo-linjiang', title: '样板案', kind: 'case', isDemo: true },
      { id: 'case-1', title: '合同审查案', grantId: 'grant-a', label: '合同案卷夹', kind: 'case' },
    ]);
    expect(projected).toEqual([GRANT_CASE]);
  });

  it('剔除已归档案（归档即从持久清除，与创建写入对称）', () => {
    const projected = projectPersistableCases([
      { id: 'case-1', title: '合同审查案', grantId: 'grant-a', label: '合同案卷夹', kind: 'case' },
      { id: 'case-2', title: '已归档案', grantId: 'grant-b', kind: 'case', archived: true },
    ]);
    expect(projected).toEqual([GRANT_CASE]);
  });

  it('只投影 {id,title,grantId,label,kind}，剥离 fileCount/caseNumber 等派生或非列表元数据', () => {
    // 真机传入的是完整 CaseSummary（含 fileCount/caseNumber 等）——投影只读五字段，天然剥离其余。
    const rich: CaseSummary = { id: 'case-1', title: '合同审查案', grantId: 'grant-a', label: '合同案卷夹', kind: 'case', fileCount: 12, caseNumber: '(2025)…', archived: false, isDemo: false };
    const projected = projectPersistableCases([rich]);
    expect(projected).toEqual([GRANT_CASE]);
    expect(projected[0]).not.toHaveProperty('fileCount');
    expect(projected[0]).not.toHaveProperty('caseNumber');
  });

  it('kind 缺省按案件（case）承载，不丢容器语义', () => {
    const projected = projectPersistableCases([{ id: 'case-1', title: '无 kind 案' }]);
    expect(projected[0].kind).toBe('case');
  });

  it('未绑定案保留（grantId/label 省略），投影仍含该案', () => {
    const projected = projectPersistableCases([{ id: 'case-2', title: '临时工作区', kind: 'workspace' }]);
    expect(projected).toEqual([UNBOUND_CASE]);
  });
});
