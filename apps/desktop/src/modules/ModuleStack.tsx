import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../workbench/Icon';
import { materialCountLabel, type MaterialCount } from '../case/material-count';
import type { SessionProjection } from '../protocol/client';
import { workScenarioFailureDisplayCopy } from '../work/work-failure-copy';
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

/** 折叠模块面板头：名称 + 计数 + 状态点（docs/decisions/ADR-006-ui-host.md 三章） */
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
  /** DEBT-DOSSIER-1 件二：与模块头徽标、CaseRail 行内件数同一份派生结果；未读取态如实呈现，不显 0。 */
  originalCount: MaterialCount;
  onFocusOriginals: () => void;
  onOpenWork: () => void;
  onOpenFileOps: () => void;
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
  onOpenWork,
  onOpenFileOps,
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
            <span className="truncate">{materialCountLabel('case', originalCount)}</span>
            <span>Read only</span>
          </button>
        ) : (
          // 徽标已经报出真实件数，树体不能还写着 No originals yet——同一模块的头尾不得互相拆台。
          <p className="wf-empty" data-testid="wf-originals-summary">
            {originalCount.status === 'resolved' && originalCount.count === 0
              ? 'No originals yet'
              : materialCountLabel('case', originalCount)}
          </p>
        )}
      </div>
      <div className="wf-zone" data-zone="drafts">
        <p className="wf-zone-label">Work drafts</p>
        <button
          type="button"
          className="stage-row"
          data-testid="wf-open-pi-work"
          onClick={onOpenWork}
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
  continuation?: {
    done: boolean;
    onContinue: () => void;
  };
}

export function ContextModuleBody({
  usage,
  usageDetail,
  attachmentSources,
  modelLabel,
  modelConnected,
  reasoningLabel,
  onOpenModelConfig,
  continuation,
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
      {continuation && (
        <div className="context-next-step" data-testid="context-next-step">
          <div>
            <span>Next step</span>
            <strong>{continuation.done ? 'Continue in the opened phase' : 'Open a fresh phase with this case context'}</strong>
          </div>
          <button
            type="button"
            className="primary-button continuation-button"
            data-testid="continuation-button"
            disabled={continuation.done}
            onClick={continuation.onContinue}
          >
            {continuation.done ? 'Next phase opened' : 'Continue this case'}
          </button>
        </div>
      )}
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

export function ProgressModuleBody({ projection }: { projection: SessionProjection }) {
  const todo = projection.todo;
  const hasRunLog = projection.progress.length > 0;
  const hasFailure = projection.scenarioFailure !== undefined;
  const hasEmptyState = todo === undefined && !hasRunLog && !hasFailure;

  return (
    <div className="progress-module-list" data-testid="progress-module-body-list">
      {todo !== undefined && (
        <section className="progress-work-plan" data-testid="progress-work-plan" aria-labelledby="progress-work-plan-label">
          <p className="progress-section-label" id="progress-work-plan-label">工作计划</p>
          <ol className="progress-plan-list" data-testid="progress-plan-list">
            {todo.map((step) => (
              <li
                key={step.stepId}
                className="progress-plan-row"
                data-step-id={step.stepId}
                data-status={step.status}
              >
                <span className="progress-plan-label">{step.label}</span>
                <span className="progress-plan-status">{todoStatusCopy[step.status]}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {hasRunLog && (
        <section className="progress-run-log" data-testid="progress-run-log" aria-labelledby="progress-run-log-label">
          {todo !== undefined && <p className="progress-section-label" id="progress-run-log-label">运行记录</p>}
          <ul className="progress-run-log-list">
            {projection.progress.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
          </ul>
        </section>
      )}
      {hasFailure && (
        <p role="alert" data-testid="progress-scenario-failure">
          {workScenarioFailureDisplayCopy(projection.scenarioFailure!)}
        </p>
      )}
      {hasEmptyState && <p className="wf-empty">尚无任务进展 · 开始一项工作后在此查看</p>}
    </div>
  );
}

const todoStatusCopy: Record<NonNullable<SessionProjection['todo']>[number]['status'], string> = {
  pending: '待开始',
  awaiting_confirmation: '等待确认',
  done: '已完成',
};

export type { ModuleOpenMap };
