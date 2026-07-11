import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../workbench/Icon';
import type { ModuleId, ModuleOpenMap } from './module-stack';

interface StackModuleProps {
  id: ModuleId;
  title: string;
  count: string;
  status?: 'idle' | 'active' | 'done' | 'warn';
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
  testId?: string;
}

/** 折叠模块面板头：名称 + 计数 + 状态点（docs/49 三章） */
export function StackModule({
  id,
  title,
  count,
  status = 'idle',
  open,
  onToggle,
  children,
  testId,
}: StackModuleProps) {
  return (
    <section
      className={`stack-module ${open ? 'is-open' : 'is-collapsed'}`}
      data-module={id}
      data-open={open ? 'true' : 'false'}
      data-testid={testId ?? `module-${id}`}
    >
      <button
        type="button"
        className="stack-module-head"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={`${testId ?? `module-${id}`}-toggle`}
      >
        <Icon name={open ? 'chevron-down' : 'chevron-right'} />
        <strong className="stack-module-title">{title}</strong>
        <span
          className="stack-module-count"
          data-testid={id === 'progress' ? 'progress-module-count' : undefined}
        >
          {count}
        </span>
        <span className={`stack-module-dot status-${status}`} aria-hidden="true" />
      </button>
      {open && children != null && (
        <div className="stack-module-body" data-testid={`${testId ?? `module-${id}`}-body`}>
          {children}
        </div>
      )}
    </section>
  );
}

interface WorkingFoldersTreeProps {
  isDemo: boolean;
  originalCount: number;
  onFocusOriginals: () => void;
  onOpenWorkDrafts: () => void;
  onOpenFileOps: () => void;
  workDraftSelected: boolean;
  fileOpsSelected: boolean;
}

/**
 * 三区树：原件（只读标记）/ 工作稿 / 产出。
 * 完整原件列表仍在左栏案件展开态（originals-zone），此处为右栏摘要入口，避免重复 testid。
 */
export function WorkingFoldersTree({
  isDemo,
  originalCount,
  onFocusOriginals,
  onOpenWorkDrafts,
  onOpenFileOps,
  workDraftSelected,
  fileOpsSelected,
}: WorkingFoldersTreeProps) {
  return (
    <div className="working-folders-tree" data-testid="working-folders-tree">
      <div className="wf-zone" data-zone="originals">
        <p className="wf-zone-label">
          Originals<span className="original-badge" data-testid="wf-originals-readonly">Read only</span>
        </p>
        {isDemo ? (
          <button type="button" className="stage-row" data-testid="wf-focus-originals" onClick={onFocusOriginals}>
            <Icon name="file" />
            <span className="truncate">卷宗原件 {originalCount} 件</span>
            <span>Read only</span>
          </button>
        ) : (
          <p className="wf-empty">No originals yet</p>
        )}
      </div>
      <div className="wf-zone" data-zone="drafts">
        <p className="wf-zone-label">Work drafts</p>
        <button
          type="button"
          className={`stage-row ${workDraftSelected ? 'selected' : ''}`}
          data-testid="wf-open-work-drafts"
          onClick={onOpenWorkDrafts}
        >
          <Icon name="file-text" />
          <span className="truncate">Notes and drafts</span>
          <span>New</span>
        </button>
        <button
          type="button"
          className={`stage-row ${fileOpsSelected ? 'selected' : ''}`}
          data-testid="wf-open-file-ops"
          onClick={onOpenFileOps}
        >
          <Icon name="folder-open" />
          <span className="truncate">卷宗整理 · S6</span>
          <span>计划</span>
        </button>
      </div>
    </div>
  );
}

interface ContextModuleBodyProps {
  usage: number;
  usageDetail: { dossier: string; chat: string; compressible: string } | null;
  attachmentSources: string[];
  modelLabel: string;
  modelConnected: boolean;
  reasoningLabel: string;
  onOpenModelConfig: () => void;
}

export function ContextModuleBody({
  usage,
  usageDetail,
  attachmentSources,
  modelLabel,
  modelConnected,
  reasoningLabel,
  onOpenModelConfig,
}: ContextModuleBodyProps) {
  return (
    <div className="context-module-body" data-testid="context-module-body">
      <div className="context-usage-block">
        <span
          className={`usage-ring ${usage >= 85 ? 'critical' : ''}`}
          style={{ '--usage': `${usage}%` } as CSSProperties}
          aria-hidden="true"
        />
        <div className="context-usage-text">
          <strong>Current usage {usage}%</strong>
          {usageDetail && (
            <ul>
              <li>Case files {usageDetail.dossier}</li>
              <li>Chat {usageDetail.chat}</li>
              <li>Compressible {usageDetail.compressible}</li>
            </ul>
          )}
        </div>
      </div>
      <div className="context-attachments">
        <p className="wf-zone-label">Attachment sources</p>
        {attachmentSources.length === 0 ? (
          <p className="wf-empty">No attachments yet</p>
        ) : (
          <ul>
            {attachmentSources.map((name) => (
              <li key={name} className="truncate" title={name}>
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/*
        RP-1 B2/C2：connected 声明位。点击只打开 App 层同一 modelConfigOpen /
        同一 ModelConfigPopover / 同一 updateModelConfig——禁止本组件内第二套读写。
      */}
      {modelConnected && (
        <button
          type="button"
          className="context-model-chip"
          data-testid="context-model-chip"
          onClick={onOpenModelConfig}
          title="Connected model · Configure"
        >
          <span className="stack-module-dot status-done" aria-hidden="true" />
          {modelLabel}
          <span className="model-config-reasoning-tag">{reasoningLabel}</span>
        </button>
      )}
    </div>
  );
}

export type { ModuleOpenMap };
