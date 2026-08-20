/**
 * CASE-PERSIST-1（真机试点前置，WORK-LIVE-REPLAY-1 诚实留痕指出）：案件列表跨重启持久。
 *
 * 动因：WORK-LIVE-REPLAY-1 明确留痕——本构建**案件列表未跨重载持久**（`App.tsx` `cases` 初始恒 `[DEMO_CASE]`，
 * reload 后 grant 案不在侧栏、`caseBinding` 退 `unbound`、恢复入口无从呈现）。真机跨重启的 UI 恢复三层
 * （侧栏 / 绑定 / 恢复入口）缺的正是这一层。本模块补上「案件列表元数据」的持久载体。
 *
 * 复杂度上限（**零新增概念**，第三次复用既有存储先例）：沿 [[work-session-store]]（本身沿 [[chat-memory]]）的
 * **版本化单键 localStorage 先例**——
 *  - 单键 `courtwork.case-list.v1`，schema version + fail-closed 读入（未知版本/坏 JSON/畸形记录/枚举漂移 → 整库不可读）；
 *  - 记录是**列表元数据** `{ id, title, grantId?, label?, kind }`：grantId 供 `resolveCaseBinding` 重建绑定、
 *    label 供展示、kind 保容器语义（案件/工作区，缺省会静默漂成案件，故随持久，避免核心不变量四的静默降级）。
 *  - 与 work-session-store 的差异仅在基数：案件列表是**有序列表**（非 caseId→记录映射），App 持有全量列表，
 *    故写入是**整表替换** `writeCaseList(list)`（非 per-entry persist/clear）——同一先例的列表版本，不引新概念。
 *
 * 边界（本模块只碰列表元数据）：案件根/授权持久归 host_auth 宿主（`host-grants.json`，跨重启耐久）；
 * 材料字节归 MaterialStore；会话信封耐久归 WORK-HOST-1 的 Tauri 宿主；会话恢复指针归 work-session-store。
 * 本模块**不碰**上述任一持久面，也**不存案件内容**（件数不入持久，DEBT-DOSSIER-1 起也不再挂在案件摘要上——
 * 它是 `MaterialStore.listForCase` 的清单长度，派生与三态见 `case/material-count.ts`）。
 *
 * browser-safe：仅用 localStorage（含内存回退），零 `node:*`；案件内容/密钥永不进入本存储（只存列表元数据）。
 */

import type { ContainerKind } from './container-copy';

export const CASE_LIST_STORAGE_KEY = 'courtwork.case-list.v1';
export const CASE_LIST_SCHEMA_VERSION = 1 as const;
const LEGACY_CASE_TITLE_PREFIX = 'courtwork.case-title.';

const CONTAINER_KINDS: readonly ContainerKind[] = ['case', 'workspace'];

/** 持久化的案件列表元数据（只列表元数据，绝不含案件内容/密钥/绝对路径）。 */
export interface PersistedCase {
  id: string;
  title: string;
  /** 案件根 opaque 引用（= HOST-AUTH-LITE grantId）；未绑定文件夹的案件省略。**永不携带绝对路径。** */
  grantId?: string;
  /** 已绑定文件夹的展示名（宿主给出的 basename）；纯展示，不参与寻址。 */
  label?: string;
  /** 容器语义（案件 | 工作区）。 */
  kind: ContainerKind;
  /**
   * matter ↔ 垂类包绑定（ADR-015 决定三：「matter 绑定零或一垂类包，全局 registry 只决定可用集」）。
   *
   * 三态且**显式**：
   *  - **字段缺席** = 未声明绑定。本字段落地前建立的 matter 全部如此，取全局可用集
   *    （见 `resolveMatterPackBinding`）。这不是「默认加载全部」的产品决定，只是「这枚 matter
   *    还没被问过」的诚实表示；新建 matter 默认零绑定（`[]`）已随 `PACK-INTERACT-1` ⑤ 拍板
   *    （ADR-015 决定三销条）。
   *  - `[]` = 显式不加载任何垂类。ADR-015 成品律的默认形态，本票的卸载态证据由它构造。
   *  - `['<packageId>']` = 显式绑定一枚。ADR-014 席位条款保数组形制；ADR-015 收窄为长度 ≤ 1。
   *
   * 长度 > 1 与空串成员一律 fail-closed 判整库不可读——多包激活是 ADR-014 明确拒绝项，
   * 静默取第一枚就是把拒绝项实现成默认行为。
   */
  packBinding?: readonly string[];
}

export interface CaseListBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CaseListEnvelope {
  version: typeof CASE_LIST_SCHEMA_VERSION;
  cases: PersistedCase[];
}

export type CaseListReadResult =
  | { status: 'ok'; cases: PersistedCase[] }
  | { status: 'unreadable'; reason: string };

const memoryFallback = new Map<string, string>();
const defaultBackend: CaseListBackend = {
  getItem: (key) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      try {
        return localStorage.getItem(key);
      } catch {
        /* fall through */
      }
    }
    return memoryFallback.get(key) ?? null;
  },
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        /* fall through */
      }
    }
    memoryFallback.set(key, value);
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        /* fall through */
      }
    }
    memoryFallback.delete(key);
  },
};

function isPersistedCase(value: unknown): value is PersistedCase {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return false;
  if (typeof record.title !== 'string' || record.title.length === 0) return false;
  if (!CONTAINER_KINDS.includes(record.kind as ContainerKind)) return false;
  // grantId/label 是可选 opaque 引用/展示名；在场即须为非空串（畸形空引用 fail-closed）。
  if (record.grantId !== undefined && (typeof record.grantId !== 'string' || record.grantId.length === 0)) return false;
  if (record.label !== undefined && typeof record.label !== 'string') return false;
  if (record.packBinding !== undefined) {
    if (!Array.isArray(record.packBinding)) return false;
    if (record.packBinding.length > 1) return false;
    if (!record.packBinding.every((id) => typeof id === 'string' && id.length > 0)) return false;
  }
  return true;
}

/**
 * fail-closed 读入：任何无法确认为当前版本干净信封的情形都判 unreadable——上层据此当作「无持久案件列表」，
 * 绝不静默使用畸形内容，也不静默清空原字节。
 */
export function loadCaseList(backend: CaseListBackend = defaultBackend): CaseListReadResult {
  const raw = backend.getItem(CASE_LIST_STORAGE_KEY);
  if (raw === null) return { status: 'ok', cases: [] };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: 'unreadable', reason: 'invalid JSON' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { status: 'unreadable', reason: 'not an envelope' };
  }
  const envelope = value as Record<string, unknown>;
  if (envelope.version !== CASE_LIST_SCHEMA_VERSION) {
    return { status: 'unreadable', reason: `unsupported version ${String(envelope.version)}` };
  }
  const cases = envelope.cases;
  if (!Array.isArray(cases)) {
    return { status: 'unreadable', reason: 'malformed cases' };
  }
  if (!cases.every(isPersistedCase)) {
    return { status: 'unreadable', reason: 'malformed record' };
  }
  return { status: 'ok', cases: cases as PersistedCase[] };
}

/**
 * fail-closed 取用 + CASE-TITLE-CONVERGE-1 一次性迁移：
 * 先确证 case-list 信封可读，才按其中可信 id 集吸收旧 title 键。legacy-only 永不成为案件 fallback；
 * 吸收后的整表先写回唯一真源，再删除旧键，后续启动只读 case-list.v1。
 */
export function readCaseList(backend: CaseListBackend = defaultBackend): PersistedCase[] {
  const read = loadCaseList(backend);
  if (read.status !== 'ok') return [];

  let changed = false;
  const legacyKeys: string[] = [];
  const cases = read.cases.map((record) => {
    const legacyKey = `${LEGACY_CASE_TITLE_PREFIX}${record.id}`;
    const legacyTitle = backend.getItem(legacyKey);
    if (legacyTitle === null) return record;
    legacyKeys.push(legacyKey);
    const title = legacyTitle.trim();
    if (title.length === 0 || title === record.title) return record;
    changed = true;
    return { ...record, title };
  });

  if (changed) writeCaseList(cases, backend);
  for (const legacyKey of legacyKeys) backend.removeItem(legacyKey);
  return cases;
}

/**
 * 整表替换写入。App 持有全量案件列表，每次列表变化（创建/授权/改名/归档/移除）以当前可持久投影整表重写——
 * 「创建写入 / 归档清除」的对称由 {@link projectPersistableCases} 的过滤达成，无需散落 per-entry persist/clear。
 */
export function writeCaseList(cases: PersistedCase[], backend: CaseListBackend = defaultBackend): void {
  const envelope: CaseListEnvelope = { version: CASE_LIST_SCHEMA_VERSION, cases };
  backend.setItem(CASE_LIST_STORAGE_KEY, JSON.stringify(envelope));
}

/** 投影输入：CaseSummary 的可持久子集（不 import CaseSummary，保持持久契约显式、拒绝夹带新字段）。 */
export interface PersistableCaseInput {
  id: string;
  title: string;
  grantId?: string;
  label?: string;
  kind?: ContainerKind;
  /** matter ↔ 垂类包绑定；缺席即未声明（见 {@link PersistedCase.packBinding}）。 */
  packBinding?: readonly string[];
  /** 样板案只在显式试用态出现，永不入真实案件列表（双向隔离）。 */
  isDemo?: boolean;
  /** 已归档案不入持久（归档即清除，与创建写入对称）。 */
  archived?: boolean;
}

/**
 * 纯投影：从活动案件列表取可持久子集——剔除样板与已归档，剥离到 {@link PersistedCase} 的字段集。
 * 样板案不属于真实列表，仍在此处按 isDemo 标记做防御性隔离；归档案退出持久（与创建写入对称）。
 */
export function projectPersistableCases(cases: PersistableCaseInput[]): PersistedCase[] {
  const out: PersistedCase[] = [];
  for (const item of cases) {
    if (item.isDemo || item.archived) continue;
    const record: PersistedCase = { id: item.id, title: item.title, kind: item.kind ?? 'case' };
    if (item.grantId !== undefined) record.grantId = item.grantId;
    if (item.label !== undefined) record.label = item.label;
    if (item.packBinding !== undefined) record.packBinding = [...item.packBinding];
    out.push(record);
  }
  return out;
}
