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
  onOpenOutput: () => void;
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
  onOpenOutput,
  workDraftSelected,
  fileOpsSelected,
}: WorkingFoldersTreeProps) {
  return (
    <div className="working-folders-tree" data-testid="working-folders-tree">
      <div className="wf-zone" data-zone="originals">
        <p className="wf-zone-label">
          原件<span className="original-badge" data-testid="wf-originals-readonly">只读</span>
        </p>
        {isDemo ? (
          <button type="button" className="stage-row" data-testid="wf-focus-originals" onClick={onFocusOriginals}>
            <Icon name="file" />
            <span className="truncate">卷宗原件 {originalCount} 件</span>
            <span>只读</span>
          </button>
        ) : (
          <p className="wf-empty">尚无原件</p>
        )}
      </div>
      <div className="wf-zone" data-zone="drafts">
        <p className="wf-zone-label">工作稿</p>
        <button
          type="button"
          className={`stage-row ${workDraftSelected ? 'selected' : ''}`}
          data-testid="wf-open-work-drafts"
          onClick={onOpenWorkDrafts}
        >
          <Icon name="file-text" />
          <span className="truncate">工作稿 · 笔记备忘</span>
          <span>新建</span>
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
      <div className="wf-zone" data-zone="outputs">
        <p className="wf-zone-label">产出</p>
        <button type="button" className="stage-row" data-testid="wf-open-output" onClick={onOpenOutput}>
          <Icon name="package" />
          <span className="truncate">产出目录</span>
          <span>打开</span>
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
          <strong>本阶段用量 {usage}%</strong>
          {usageDetail && (
            <ul>
              <li>卷宗占用 {usageDetail.dossier}</li>
              <li>对话占用 {usageDetail.chat}</li>
              <li>可整理内容 {usageDetail.compressible}</li>
            </ul>
          )}
        </div>
      </div>
      <div className="context-attachments">
        <p className="wf-zone-label">附件来源</p>
        {attachmentSources.length === 0 ? (
          <p className="wf-empty">尚无附件</p>
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
      {modelConnected && (
        <button
          type="button"
          className="context-model-chip"
          data-testid="context-model-chip"
          onClick={onOpenModelConfig}
          title="已连接模型 · 点击配置"
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
