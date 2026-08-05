/**
 * `PI-LANE-UI-1` · 同容器历史 session 的工作稿索引缓存。
 *
 * **为什么非有不可**（复杂度节制：本单新增的概念要写清由来）：12 回合是 session 级硬顶，触顶即
 * 该 logical session 终态；而新 session 的 workspace 初始为空、索引只认同 session 账本 ⇒ 正常用满
 * 就失去了上一段工作稿的入口。2026-08-05 架构裁定取 GUI 侧方案：同 container 的历史 sessionId
 * 持久保留并显式呈现「上一段工作稿（只读）」，经 `openWorkspaceMarkdown` 只读通道；
 * **不改**「新 session workspace 初始为空」这条冻结语义。
 *
 * 它**不是第二真源**，三条边界写死：
 *
 * 1. 存的是同一份 fold 的**缓存**——来源仍只有该 session 自己的账本（`effect_succeeded`）。
 * 2. 打开一律经宿主命令重读当刻字节；缓存里的 hash 只用来和当刻 hash **比对**，
 *    比对不上就照实说「当前内容已不同于已确认版本」，绝不拿缓存内容冒充文件内容。
 * 3. 宿主说 `not_found` 就是没有了——缓存不得把它救回来。
 *
 * 存储沿 [[case-store]] 的**版本化单键 localStorage 先例**（第四次复用，零新增存储概念）：
 * 单键、schema version、fail-closed 读入（未知版本／坏 JSON／畸形记录 ⇒ 整库不可读，当作空）。
 * 只存逻辑路径、字节数、hash 与时间——**零正文**、零绝对路径。
 */
import type { PiDraftEntry } from './pi-projection';

export const PI_HISTORY_STORAGE_KEY = 'courtwork.pi-drafts.v1';
export const PI_HISTORY_SCHEMA_VERSION = 1 as const;
/** 每个容器最多留几段。首版 3 段：入口叫「上一段」，留几段是为了 Stop/失败后仍找得回来。 */
export const PI_HISTORY_MAX_SESSIONS = 3;

export interface PiHistorySession {
  readonly containerId: string;
  readonly sessionId: string;
  readonly recordedAt: number;
  readonly drafts: readonly PiDraftEntry[];
}

interface Envelope {
  version: typeof PI_HISTORY_SCHEMA_VERSION;
  sessions: PiHistorySession[];
}

export interface PiHistoryBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isDraft(value: unknown): value is PiDraftEntry {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.logicalPath === 'string' &&
    typeof draft.byteLength === 'number' &&
    typeof draft.contentSha256 === 'string' &&
    typeof draft.disposition === 'string' &&
    typeof draft.recordedAt === 'number'
  );
}

function isSession(value: unknown): value is PiHistorySession {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.containerId === 'string' &&
    typeof session.sessionId === 'string' &&
    typeof session.recordedAt === 'number' &&
    Array.isArray(session.drafts) &&
    session.drafts.every(isDraft)
  );
}

/** 读全表。坏帧一律当**空表**——不半信半疑地留一半。 */
export function readPiHistory(backend: PiHistoryBackend): PiHistorySession[] {
  const raw = backend.getItem(PI_HISTORY_STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof parsed !== 'object' || parsed === null) return [];
  const envelope = parsed as Partial<Envelope>;
  if (envelope.version !== PI_HISTORY_SCHEMA_VERSION) return [];
  if (!Array.isArray(envelope.sessions) || !envelope.sessions.every(isSession)) return [];
  return envelope.sessions;
}

/**
 * 记一段的索引。同 `(container, session)` 覆盖；**零工作稿的段不入册**——
 * 空入口只会让人点开一个空列表。
 */
export function writePiHistory(
  backend: PiHistoryBackend,
  entry: PiHistorySession,
): PiHistorySession[] {
  const others = readPiHistory(backend).filter(
    (session) =>
      !(session.containerId === entry.containerId && session.sessionId === entry.sessionId),
  );
  const next = entry.drafts.length > 0 ? [entry, ...others] : others;
  const trimmed = trimPerContainer(next);
  backend.setItem(
    PI_HISTORY_STORAGE_KEY,
    JSON.stringify({ version: PI_HISTORY_SCHEMA_VERSION, sessions: trimmed }),
  );
  return trimmed;
}

function trimPerContainer(sessions: readonly PiHistorySession[]): PiHistorySession[] {
  const counted = new Map<string, number>();
  const kept: PiHistorySession[] = [];
  for (const session of [...sessions].sort((left, right) => right.recordedAt - left.recordedAt)) {
    const used = counted.get(session.containerId) ?? 0;
    if (used >= PI_HISTORY_MAX_SESSIONS) continue;
    counted.set(session.containerId, used + 1);
    kept.push(session);
  }
  return kept;
}

/** 同容器、**排除当前段**的历史段，最近的在前。 */
export function priorSessionsFor(
  sessions: readonly PiHistorySession[],
  containerId: string,
  currentSessionId: string | null,
): PiHistorySession[] {
  return sessions
    .filter(
      (session) => session.containerId === containerId && session.sessionId !== currentSessionId,
    )
    .sort((left, right) => right.recordedAt - left.recordedAt);
}
