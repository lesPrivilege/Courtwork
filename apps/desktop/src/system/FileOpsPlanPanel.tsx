import { useMemo, useState } from 'react';
import type { FileOpsPlan, FileOpsPlanEntry } from '@courtwork/schemas';
import type { FileOpsExecuteReport } from '@courtwork/tools/file-ops-executor';
import {
  createDemoFileOpsPlan,
  executeDemoPlan,
  resetFileOpsDemo,
  undoDemoPlan,
} from './file-ops-demo';

interface FileOpsPlanPanelProps {
  caseId: string;
  onFeedback?: (message: string, ok: boolean) => void;
}

const FILE_OPS_VERB_LABEL: Record<FileOpsPlanEntry['verb'], string> = {
  move: '移动',
  rename: '重命名',
  copy: '复制',
  mkdir: '新建文件夹',
};

/**
 * 零编码暴露律：执行器保留绝对路径供审计，画面只显示案件容器内位置。
 * 越界值也不得回退为绝对路径；异常详情留给诊断导出。
 */
function displayCaseRelativePath(path: string, caseRoot: string): string {
  const normalizedRoot = caseRoot.replace(/\/$/, '');
  if (path === normalizedRoot) return '案件目录';
  if (path.startsWith(`${normalizedRoot}/`)) return path.slice(normalizedRoot.length + 1);
  return path.split('/').filter(Boolean).pop() ?? '案件目录';
}

/**
 * S6 卷宗整理：计划表（逐条勾选/理由/目标）→ 确认执行 → 报告 → 一键撤销。
 * 单文件 move 也走本面板轻确认（docs/47）。
 */
export function FileOpsPlanPanel({ caseId, onFeedback }: FileOpsPlanPanelProps) {
  const [plan, setPlan] = useState<FileOpsPlan>(() => {
    resetFileOpsDemo();
    return createDemoFileOpsPlan(caseId);
  });
  const [report, setReport] = useState<FileOpsExecuteReport | null>(null);
  const [undone, setUndone] = useState(false);
  const [undoConfirm, setUndoConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedCount = useMemo(
    () => plan.entries.filter((entry) => entry.selected).length,
    [plan.entries],
  );
  const bulk = selectedCount >= 5;

  const toggle = (id: string) => {
    if (report && !undone) return;
    setPlan((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.id === id ? { ...entry, selected: !entry.selected } : entry,
      ),
    }));
  };

  const run = async () => {
    if (selectedCount === 0) {
      onFeedback?.('请至少勾选一条整理项。', false);
      return;
    }
    setBusy(true);
    try {
      const result = await executeDemoPlan(plan);
      setReport(result);
      setUndone(false);
      setPlan((current) => ({ ...current, entries: result.entries }));
      if (result.failed.length) {
        onFeedback?.(`整理完成，但有 ${result.failed.length} 条失败。`, false);
      } else {
        onFeedback?.(`已执行 ${result.applied.length} 条整理操作。`, true);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmUndo = async () => {
    setBusy(true);
    setUndoConfirm(false);
    try {
      await undoDemoPlan(plan.id);
      setUndone(true);
      onFeedback?.('已撤销整理操作，文件状态已恢复。', true);
    } catch (error) {
      onFeedback?.(error instanceof Error ? error.message : '撤销失败', false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="file-ops-panel" data-testid="file-ops-panel">
      <header className="file-ops-toolbar">
        <div>
          <strong>{plan.title ?? '整理计划'}</strong>
          <span>
            {selectedCount} 条已勾选
            {bulk ? ' · 大批量请抽看理由' : ' · 确认后执行'}
          </span>
        </div>
        <div className="file-ops-actions">
          {!report && (
            <button
              type="button"
              className="primary-button"
              data-testid="file-ops-execute"
              disabled={busy || selectedCount === 0}
              onClick={() => void run()}
            >
              确认并整理
            </button>
          )}
          {report && !undone && (
            <div className="file-ops-undo-wrap">
              <button
                type="button"
                className="quiet-button"
                data-testid="file-ops-undo"
                disabled={busy}
                onClick={() => setUndoConfirm(true)}
              >
                撤销整理
              </button>
              {undoConfirm && (
                <div className="archive-popover file-ops-undo-popover" role="dialog" aria-label="撤销确认">
                  <p>撤销后文件将回到整理前的位置与名称。事务日志仍会保留。</p>
                  <footer>
                    <button type="button" className="quiet-button" onClick={() => setUndoConfirm(false)}>取消</button>
                    <button type="button" className="primary-button" data-testid="file-ops-undo-confirm" onClick={() => void confirmUndo()}>确认撤销</button>
                  </footer>
                </div>
              )}
            </div>
          )}
          {undone && <span className="file-ops-undone" role="status">已撤销</span>}
        </div>
      </header>

      <table className="file-ops-table" data-testid="file-ops-table">
        <thead>
          <tr>
            <th scope="col">勾选</th>
            <th scope="col">动词</th>
            <th scope="col">源</th>
            <th scope="col">目标</th>
            <th scope="col">理由</th>
            <th scope="col">原始文件名</th>
            <th scope="col">哈希</th>
          </tr>
        </thead>
        <tbody>
          {plan.entries.map((entry) => (
            <FileOpsRow
              key={entry.id}
              entry={entry}
              disabled={Boolean(report && !undone)}
              onToggle={() => toggle(entry.id)}
            />
          ))}
        </tbody>
      </table>

      {report && (
        <section className="file-ops-report" data-testid="file-ops-report" aria-label="执行报告">
          <strong>执行报告</strong>
          <span>已执行 {report.applied.length}</span>
          <span>跳过 {report.skipped.length}</span>
          <span>失败 {report.failed.length}</span>
          {report.applied.map((item) => (
            <p key={item.entryId} className="file-ops-report-line">
              {FILE_OPS_VERB_LABEL[item.verb]} · {displayCaseRelativePath(item.targetPath, plan.caseRoot)}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

function FileOpsRow({
  entry,
  disabled,
  onToggle,
}: {
  entry: FileOpsPlanEntry;
  disabled: boolean;
  onToggle: () => void;
}) {
  const verbLabel = FILE_OPS_VERB_LABEL[entry.verb];
  const hash =
    entry.contentHashAfter ?? entry.contentHashBefore;
  return (
    <tr data-testid={`file-ops-row-${entry.id}`} data-selected={entry.selected ? 'true' : 'false'}>
      <td>
        <input
          type="checkbox"
          checked={entry.selected}
          disabled={disabled}
          aria-label={`勾选 ${entry.id}`}
          data-testid={`file-ops-select-${entry.id}`}
          onChange={onToggle}
        />
      </td>
      <td>{verbLabel}</td>
      <td className="mono truncate" title={entry.sourcePath}>{entry.sourcePath?.split('/').pop() ?? '—'}</td>
      <td className="mono truncate" title={entry.targetPath}>{entry.targetPath.split('/').slice(-2).join('/')}</td>
      <td title={entry.reason}>{entry.reason}</td>
      <td className="mono truncate" title={entry.originalFileName}>{entry.originalFileName ?? '—'}</td>
      <td className="mono truncate" title={hash}>{hash ? `${hash.slice(0, 8)}…` : '—'}</td>
    </tr>
  );
}
