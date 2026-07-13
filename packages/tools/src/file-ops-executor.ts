import type { FileOpsPlanEntry, FileOpsVerb } from '@courtwork/schemas';
import { FileOpsPlanSchema } from '@courtwork/schemas';
import { assertRevealOrOpenAllowed, basenamePath } from './case-path.js';
import type { FileOpsHost } from './file-ops-host.js';

/**
 * 事务日志条目：撤销 = 按 reverse 逆向重放。
 * 日志本身不可删（docs/decisions/ADR-004-documents-and-files.md）——执行器只追加、提供 undo 回放，不提供 deleteLog。
 */
export type FileOpsTxnReverse =
  | { kind: 'move-back'; from: string; to: string }
  | { kind: 'remove-copy'; path: string }
  | { kind: 'remove-empty-dir'; path: string };

export interface FileOpsTxnRecord {
  entryId: string;
  verb: FileOpsVerb;
  sourcePath?: string;
  targetPath: string;
  contentHashBefore?: string;
  contentHashAfter?: string;
  reverse: FileOpsTxnReverse;
  appliedAt: string;
}

export interface FileOpsTxnLog {
  planId: string;
  caseRoot: string;
  records: FileOpsTxnRecord[];
  /** 撤销后追加标记，日志仍保留 */
  undoneAt?: string;
}

export interface FileOpsExecuteReport {
  planId: string;
  applied: FileOpsTxnRecord[];
  skipped: Array<{ entryId: string; reason: string }>;
  failed: Array<{ entryId: string; message: string }>;
  /** 更新后的计划条目（含哈希填回） */
  entries: FileOpsPlanEntry[];
  txnLog: FileOpsTxnLog;
}

export interface FileOpsUndoReport {
  planId: string;
  reversed: FileOpsTxnRecord[];
  failed: Array<{ entryId: string; message: string }>;
  txnLog: FileOpsTxnLog;
}

function requireInCase(caseRoot: string, path: string): string {
  const result = assertRevealOrOpenAllowed(caseRoot, path);
  if (!result.ok) throw new Error(result.message);
  return result.absolute;
}

/**
 * 移形级执行器：吃**已确认**的 FileOpsPlan（仅执行 selected=true）。
 * - 目标已存在一律拒绝（无覆盖）
 * - move/rename 前后内容哈希必须一致
 * - 事务日志可 undo；不提供删除日志 API
 */
export function createFileOpsExecutor(host: FileOpsHost) {
  /** 内存中的日志仓：key = planId。真实落盘由装配点包装。 */
  const logs = new Map<string, FileOpsTxnLog>();

  return {
    getLog(planId: string): FileOpsTxnLog | undefined {
      return logs.get(planId);
    },

    /** 红线：不提供 deleteLog / clearLog */
    listLogIds(): string[] {
      return [...logs.keys()];
    },

    async execute(rawPlan: unknown): Promise<FileOpsExecuteReport> {
      const parsed = FileOpsPlanSchema.safeParse(rawPlan);
      if (!parsed.success) {
        throw new Error(`FileOpsPlan 未通过 schema 校验：${parsed.error.message}`);
      }
      const plan = parsed.data;
      const applied: FileOpsTxnRecord[] = [];
      const skipped: Array<{ entryId: string; reason: string }> = [];
      const failed: Array<{ entryId: string; message: string }> = [];
      const entries: FileOpsPlanEntry[] = [];

      for (const entry of plan.entries) {
        if (!entry.selected) {
          skipped.push({ entryId: entry.id, reason: '未勾选，已跳过' });
          entries.push(entry);
          continue;
        }
        try {
          const record = await applyEntry(host, plan.caseRoot, entry);
          applied.push(record);
          entries.push({
            ...entry,
            contentHashBefore: record.contentHashBefore ?? entry.contentHashBefore,
            contentHashAfter: record.contentHashAfter ?? entry.contentHashAfter,
            originalFileName:
              entry.originalFileName ??
              (entry.sourcePath ? basenamePath(entry.sourcePath) : entry.originalFileName),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failed.push({ entryId: entry.id, message });
          entries.push(entry);
        }
      }

      const txnLog: FileOpsTxnLog = {
        planId: plan.id,
        caseRoot: plan.caseRoot,
        records: applied,
      };
      // 追加合并：同一 plan 多次执行累积日志，从不删除
      const existing = logs.get(plan.id);
      if (existing && !existing.undoneAt) {
        existing.records.push(...applied);
        logs.set(plan.id, existing);
        txnLog.records = existing.records;
      } else {
        logs.set(plan.id, txnLog);
      }

      return { planId: plan.id, applied, skipped, failed, entries, txnLog: logs.get(plan.id)! };
    },

    async undo(planId: string): Promise<FileOpsUndoReport> {
      const log = logs.get(planId);
      if (!log) throw new Error('找不到整理事务日志，无法撤销。');
      if (log.undoneAt) throw new Error('该计划已撤销过，日志保留不可再删。');

      const reversed: FileOpsTxnRecord[] = [];
      const failed: Array<{ entryId: string; message: string }> = [];

      // 逆向重放
      for (const record of [...log.records].reverse()) {
        try {
          await reverseOne(host, record);
          reversed.push(record);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failed.push({ entryId: record.entryId, message });
        }
      }

      log.undoneAt = new Date().toISOString();
      // 日志仍在 map 中，不可删除
      return { planId, reversed, failed, txnLog: log };
    },
  };
}

export type FileOpsExecutor = ReturnType<typeof createFileOpsExecutor>;

async function applyEntry(
  host: FileOpsHost,
  caseRoot: string,
  entry: FileOpsPlanEntry,
): Promise<FileOpsTxnRecord> {
  const target = requireInCase(caseRoot, entry.targetPath);
  if (await host.exists(target)) {
    throw new Error('目标已存在，已拒绝覆盖。');
  }

  const appliedAt = new Date().toISOString();

  if (entry.verb === 'mkdir') {
    await host.mkdir(target);
    return {
      entryId: entry.id,
      verb: 'mkdir',
      targetPath: target,
      reverse: { kind: 'remove-empty-dir', path: target },
      appliedAt,
    };
  }

  if (!entry.sourcePath) throw new Error(`${entry.verb} 缺少 sourcePath`);
  const source = requireInCase(caseRoot, entry.sourcePath);
  if (!(await host.exists(source))) throw new Error('源路径不存在。');

  if (entry.verb === 'copy') {
    if (await host.isDirectory(source)) throw new Error('当前仅支持复制文件。');
    const data = await host.readFile(source);
    const contentHashBefore = await host.hash(source);
    await host.writeFile(target, data);
    const contentHashAfter = await host.hash(target);
    if (contentHashBefore !== contentHashAfter) {
      throw new Error('复制后内容哈希不一致，已中止。');
    }
    return {
      entryId: entry.id,
      verb: 'copy',
      sourcePath: source,
      targetPath: target,
      contentHashBefore,
      contentHashAfter,
      reverse: { kind: 'remove-copy', path: target },
      appliedAt,
    };
  }

  // move | rename
  if (await host.isDirectory(source)) {
    // 目录移形：不做内容哈希（无单一文件哈希）
    await host.rename(source, target);
    return {
      entryId: entry.id,
      verb: entry.verb,
      sourcePath: source,
      targetPath: target,
      reverse: { kind: 'move-back', from: target, to: source },
      appliedAt,
    };
  }

  const contentHashBefore = await host.hash(source);
  await host.rename(source, target);
  const contentHashAfter = await host.hash(target);
  if (contentHashBefore !== contentHashAfter) {
    // 尽力回滚
    try {
      await host.rename(target, source);
    } catch {
      /* ignore */
    }
    throw new Error('移形后内容哈希不一致，已拒绝并尝试回滚。');
  }

  return {
    entryId: entry.id,
    verb: entry.verb,
    sourcePath: source,
    targetPath: target,
    contentHashBefore,
    contentHashAfter,
    reverse: { kind: 'move-back', from: target, to: source },
    appliedAt,
  };
}

async function reverseOne(host: FileOpsHost, record: FileOpsTxnRecord): Promise<void> {
  const rev = record.reverse;
  if (rev.kind === 'move-back') {
    if (await host.exists(rev.to)) throw new Error(`撤销目标被占用：${rev.to}`);
    await host.rename(rev.from, rev.to);
    return;
  }
  if (rev.kind === 'remove-copy') {
    await host.removeFile(rev.path);
    return;
  }
  if (rev.kind === 'remove-empty-dir') {
    await host.removeEmptyDir(rev.path);
  }
}
