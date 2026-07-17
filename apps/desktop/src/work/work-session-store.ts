/**
 * WORK-LIVE-REPLAY-1（WORK-HOST-1 驳回阻断二的修复）：per-case 持久化「最近可恢复的 Work 会话指针」。
 *
 * 驳回根因（ACCEPTANCE.md WORK-HOST-1-ACCEPT 阻断二）：`workSessionId` 只在 React state，重启/切案即清空，
 * 全 App 对 `workCommand.replay` 零消费点——用户无法在重启后重新发现该 ref 并续行。本模块补上持久载体：
 * 让会话指针跨切案/重载存活，恢复入口据此调 `workCommand.replay` 水合投影续行。
 *
 * 复杂度上限（本单唯一新增概念，非新持久格式）：沿 [[chat-memory]] 的版本化单键 localStorage 先例——
 *  - 单键 `courtwork.work-session.v1`，schema version + fail-closed 读入（未知版本/坏 JSON/畸形记录 → 整库不可读）；
 *  - 记录是**最小恢复指针** `{ sessionId, contractMaterialId }`：sessionId 供 `replay(ref)`/`resolveReview`，
 *    contractMaterialId 供恢复后 docx 终链编译（不重算，避开材料集漂移与异步载入竞态）；
 *  - 案件根/授权持久归 CASE-ROOT-1，材料字节归 MaterialStore，会话信封耐久归 WORK-HOST-1 的 Tauri 宿主——
 *    本模块只存「指向哪一个会话」的轻量指针，不碰上述任何持久面。
 *
 * browser-safe：仅用 localStorage（含内存回退），零 `node:*`；案件内容/密钥永不进入本存储（只存 id）。
 */

export const WORK_SESSION_STORAGE_KEY = 'courtwork.work-session.v1';
export const WORK_SESSION_SCHEMA_VERSION = 1 as const;

/** 最小恢复指针：指向某案最近一次可恢复的 Work 会话。 */
export interface WorkSessionRecord {
  /** production Work 会话 id（供 workCommand.replay(ref) / resolveReview）。 */
  sessionId: string;
  /** 冻结的合同原件 id（供恢复后 docx 终链编译，不从材料集重算）。 */
  contractMaterialId: string;
}

export interface WorkSessionBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type WorkSessionMap = Record<string, WorkSessionRecord>;

interface WorkSessionEnvelope {
  version: typeof WORK_SESSION_SCHEMA_VERSION;
  /** caseId → 恢复指针。 */
  sessions: WorkSessionMap;
}

export type WorkSessionReadResult =
  | { status: 'ok'; sessions: WorkSessionMap }
  | { status: 'unreadable'; reason: string };

const memoryFallback = new Map<string, string>();
const defaultBackend: WorkSessionBackend = {
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
};

function isWorkSessionRecord(value: unknown): value is WorkSessionRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sessionId === 'string' && record.sessionId.length > 0 &&
    typeof record.contractMaterialId === 'string' && record.contractMaterialId.length > 0
  );
}

/**
 * fail-closed 读入：任何无法确认为当前版本干净信封的情形都判 unreadable——上层据此当作「无可恢复会话」，
 * 绝不静默使用畸形内容，也不静默清空原字节。
 */
export function loadWorkSessions(backend: WorkSessionBackend = defaultBackend): WorkSessionReadResult {
  const raw = backend.getItem(WORK_SESSION_STORAGE_KEY);
  if (raw === null) return { status: 'ok', sessions: {} };
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
  if (envelope.version !== WORK_SESSION_SCHEMA_VERSION) {
    return { status: 'unreadable', reason: `unsupported version ${String(envelope.version)}` };
  }
  const sessions = envelope.sessions;
  if (typeof sessions !== 'object' || sessions === null || Array.isArray(sessions)) {
    return { status: 'unreadable', reason: 'malformed sessions' };
  }
  const entries = Object.values(sessions as Record<string, unknown>);
  if (!entries.every(isWorkSessionRecord)) {
    return { status: 'unreadable', reason: 'malformed record' };
  }
  return { status: 'ok', sessions: sessions as WorkSessionMap };
}

function writeEnvelope(backend: WorkSessionBackend, sessions: WorkSessionMap): void {
  const envelope: WorkSessionEnvelope = { version: WORK_SESSION_SCHEMA_VERSION, sessions };
  backend.setItem(WORK_SESSION_STORAGE_KEY, JSON.stringify(envelope));
}

/** fail-closed 取用：不可读或缺该案 → null（当作无可恢复会话，不静默误用畸形字节）。 */
export function readWorkSession(caseId: string, backend: WorkSessionBackend = defaultBackend): WorkSessionRecord | null {
  const read = loadWorkSessions(backend);
  if (read.status !== 'ok') return null;
  return read.sessions[caseId] ?? null;
}

/**
 * 写入某案的恢复指针（run 启动成功时）。既有信封不可读时以干净当前版本重写（不静默保留畸形字节），
 * 同版本则保留他案记录。
 */
export function persistWorkSession(
  caseId: string,
  record: WorkSessionRecord,
  backend: WorkSessionBackend = defaultBackend,
): void {
  const read = loadWorkSessions(backend);
  const sessions: WorkSessionMap = read.status === 'ok' ? { ...read.sessions } : {};
  sessions[caseId] = record;
  writeEnvelope(backend, sessions);
}

/** 清除某案的恢复指针（docx 终链完成 / 失效 / 终态）。对未知版本亦重置为干净空信封。 */
export function clearWorkSession(caseId: string, backend: WorkSessionBackend = defaultBackend): void {
  const read = loadWorkSessions(backend);
  const sessions: WorkSessionMap = read.status === 'ok' ? { ...read.sessions } : {};
  delete sessions[caseId];
  writeEnvelope(backend, sessions);
}
