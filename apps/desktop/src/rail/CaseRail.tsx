import { ArchiveConfirmPopover } from '../case/ArchiveConfirmPopover';
import { fileCountLabel, type ContainerKind } from '../case/container-copy';
import { isDemoCaseId } from '../case/case-scope';
import type { CaseSummary } from '../case/types';
import { CONTAINERIZE_COPY } from '../composer';
import type { ScenarioFlow } from '../protocol/client';
import { OriginalsZone } from '../system/OriginalsZone';
import { ArchiveGlyph } from '../workbench/MiniIcon';
import { Icon } from '../workbench/Icon';
import { useState } from 'react';
import {
  buildMixedRailRows,
  canExpandRailRow,
  railIconName,
  railKindLabel,
  showLeadAttorney,
  type UnfiledSession,
} from './types';

interface CaseRailProps {
  cases: CaseSummary[];
  unfiled: UnfiledSession[];
  pinnedIds: ReadonlySet<string>;
  selectedCaseId: string;
  expandedCaseId: string | null;
  isDemoCase: boolean;
  flow: ScenarioFlow | null;
  dispositionsCount: number;
  caseRoot: string | undefined;
  workDraftMode: boolean;
  activeViewIsDraft: boolean;
  fileOpsMode: boolean;
  archiveConfirmCaseId: string | null;
  /** F-1.1：未归档「存入」锚定的容器化仪式行 id */
  containerizeUnfiledId: string | null;
  leftCollapsed: boolean;
  onSelectCase: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onNewCase: () => void;
  onOpenArtifacts: () => void;
  onSelectFlow: (flow: ScenarioFlow) => void;
  onOpenWorkDrafts: () => void;
  onOpenFileOps: () => void;
  onFocusOriginals: () => void;
  onArchiveTrigger: (id: string) => void;
  onArchiveConfirm: (id: string) => void;
  onArchiveCancel: () => void;
  /** 打开容器化仪式（用户选名词，docs/49） */
  onRequestContainerizeUnfiled: (id: string) => void;
  onConfirmContainerizeUnfiled: (kind: ContainerKind) => void;
  onCancelContainerizeUnfiled: () => void;
  onExpandLeft: () => void;
  onCollapseLeft: () => void;
  onOpenSettings: () => void;
  onFeedback: (message: string, ok: boolean) => void;
}

export function CaseRail({
  cases,
  unfiled,
  pinnedIds,
  selectedCaseId,
  expandedCaseId,
  isDemoCase,
  flow,
  dispositionsCount,
  caseRoot,
  workDraftMode,
  activeViewIsDraft,
  fileOpsMode,
  archiveConfirmCaseId,
  containerizeUnfiledId,
  leftCollapsed,
  onSelectCase,
  onToggleExpand,
  onNewCase,
  onOpenArtifacts,
  onSelectFlow,
  onOpenWorkDrafts,
  onOpenFileOps,
  onFocusOriginals,
  onArchiveTrigger,
  onArchiveConfirm,
  onArchiveCancel,
  onRequestContainerizeUnfiled,
  onConfirmContainerizeUnfiled,
  onCancelContainerizeUnfiled,
  onExpandLeft,
  onCollapseLeft,
  onOpenSettings,
  onFeedback,
}: CaseRailProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const rows = buildMixedRailRows(cases, unfiled, pinnedIds);
  const pinnedRows = rows.filter((r) => r.pinned);
  const restRows = rows.filter((r) => !r.pinned);

  if (leftCollapsed) {
    return (
      <aside className="case-rail surface-float is-collapsed" data-testid="case-rail" data-collapsed="true">
        <button
          type="button"
          className="rail-expand-button"
          data-testid="expand-left-rail"
          title="展开左栏"
          aria-label="展开左栏"
          onClick={onExpandLeft}
        >
          <Icon name="panel-left" />
        </button>
        <nav className="collapsed-case-icons" aria-label="折叠的案件栏">
          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.title}
              title={item.title}
              onClick={() => onSelectCase(item.id)}
            >
              <Icon name={item.kind === 'workspace' ? 'folder-open' : 'briefcase-business'} />
              {(item.isDemo || isDemoCaseId(item.id)) && item.id === selectedCaseId && (
                <span className="unread-count">1</span>
              )}
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  const renderRow = (row: (typeof rows)[number]) => {
    const item = row.caseSummary;
    const isCase = row.kind === 'case';
    const selected = item ? item.id === selectedCaseId : false;
    const expanded = isCase && expandedCaseId === row.id;
    const demo = item ? Boolean(item.isDemo) || isDemoCaseId(item.id) : false;

    // 仅容器行用 case-card（既有 e2e 以 .case-card 计数案件）；未归档用 rail-row
    const rowClass = item
      ? `case-card rail-row ${selected ? 'selected' : ''} ${item.archived ? 'archived' : ''} ${expanded ? 'is-expanded' : ''}`
      : `rail-row unfiled-row`;

    return (
      <article
        key={row.id}
        className={rowClass}
        data-testid={item ? `case-card-${item.id}` : `rail-unfiled-${row.id}`}
        data-demo={demo ? 'true' : 'false'}
        data-row-kind={row.kind}
        data-pinned={row.pinned ? 'true' : 'false'}
      >
        <div className="rail-row-main">
          {/* 主选择按钮须为 card 内第一个 button：既有 e2e 用 getByRole('button').first() */}
          <span className="rail-type-icon" data-testid={`rail-icon-${row.kind}`} title={railKindLabel(row.kind)}>
            <Icon name={railIconName(row.kind)} />
          </span>
          <div className="case-card-select">
            {item ? (
              <>
                <button type="button" className="case-card-main" onClick={() => onSelectCase(item.id)}>
                  <strong className="truncate" title={item.title}>
                    {item.title}
                  </strong>
                  {item.caseNumber && (
                    <span className="case-number truncate" title={item.caseNumber}>
                      {item.caseNumber}
                    </span>
                  )}
                </button>
                <div className="case-card-meta truncate">
                  <button
                    type="button"
                    className="case-file-count"
                    data-testid="case-file-count"
                    title="查看原件区"
                    onClick={() => {
                      // A2：只走 onSelectCase（App 对 case 会 setExpandedCaseId=id）+ focus；
                      // 禁止再 toggle——与 select 同批会把 expand 对消回 null。
                      onSelectCase(item.id);
                      onFocusOriginals();
                    }}
                  >
                    {fileCountLabel(item.kind ?? 'case', item.fileCount)}
                  </button>
                  {item.archived ? <span> · 已归档</span> : null}
                  {demo ? <span> · 样板案·演示</span> : null}
                </div>
              </>
            ) : (
              <div className="case-card-main unfiled-main">
                <strong className="truncate" title={row.title}>
                  {row.title}
                </strong>
                <span className="case-number">未归档对话</span>
              </div>
            )}
          </div>
          {canExpandRailRow(row.kind) ? (
            <button
              type="button"
              className="rail-chevron"
              data-testid={`rail-expand-${row.id}`}
              aria-expanded={expanded}
              aria-label={expanded ? '收起工作结构' : '展开工作结构'}
              onClick={() => onToggleExpand(row.id)}
            >
              <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
            </button>
          ) : (
            <span className="rail-chevron-spacer" aria-hidden="true" />
          )}
          {row.kind === 'unfiled' && (
            <button
              type="button"
              className="rail-store-button"
              data-testid={`unfiled-store-${row.id}`}
              onClick={() => onRequestContainerizeUnfiled(row.id)}
            >
              存入
            </button>
          )}
          {item && (
            <button
              className="case-archive-button"
              onClick={() => onArchiveTrigger(item.id)}
              aria-label={item.archived ? `取消归档 ${item.title}` : `归档 ${item.title}`}
              title={item.archived ? `取消归档：${item.title}` : `归档：${item.title}`}
              data-testid="archive-trigger"
            >
              <ArchiveGlyph />
            </button>
          )}
        </div>
        {demo && <span className="demo-badge case-demo-badge" title="样板案·演示">演示</span>}
        {/* F-1.1：与 composer-first 同一容器化仪式（工作区/案件二选，用户选名词） */}
        {row.kind === 'unfiled' && containerizeUnfiledId === row.id && (
          <div
            className="scope-popover containerize-popover rail-containerize-popover"
            role="dialog"
            aria-label={CONTAINERIZE_COPY.title}
            data-testid="containerize-popover"
          >
            <strong>{CONTAINERIZE_COPY.title}</strong>
            <p>{CONTAINERIZE_COPY.body}</p>
            <div className="scope-popover-actions">
              <button type="button" className="quiet-button" onClick={onCancelContainerizeUnfiled}>
                {CONTAINERIZE_COPY.cancel}
              </button>
              <button
                type="button"
                className="quiet-button"
                data-testid="containerize-workspace"
                onClick={() => onConfirmContainerizeUnfiled('workspace')}
              >
                {CONTAINERIZE_COPY.createWorkspace}
              </button>
              <button
                type="button"
                className="primary-button"
                data-testid="containerize-case"
                onClick={() => onConfirmContainerizeUnfiled('case')}
              >
                {CONTAINERIZE_COPY.createCase}
              </button>
            </div>
          </div>
        )}
        {item && archiveConfirmCaseId === item.id && (
          <ArchiveConfirmPopover
            caseTitle={item.title}
            archived={item.archived}
            onConfirm={() => onArchiveConfirm(item.id)}
            onCancel={onArchiveCancel}
          />
        )}
        {expanded && item && (
          <div className="rail-case-expand" data-testid={`case-expand-${item.id}`}>
            {demo && (
              <>
                <p className="rail-label">阶段</p>
                <button
                  type="button"
                  className={`stage-row ${flow === 'S1' ? 'selected' : ''}`}
                  onClick={() => onSelectFlow('S1')}
                  data-testid="flow-s1"
                >
                  <Icon name="panels-top-left" />
                  <span className="truncate">阶段一 · 阅卷整理</span>
                  <span>已归档</span>
                </button>
                <button
                  type="button"
                  className={`stage-row ${flow === 'S3' ? 'selected' : ''}`}
                  onClick={() => onSelectFlow('S3')}
                  data-testid="flow-s3"
                >
                  <Icon name="panels-top-left" />
                  <span className="truncate">阶段二 · 合同审查</span>
                  <span>{dispositionsCount}/6</span>
                </button>
              </>
            )}
            <p className="rail-label">三区</p>
            {caseRoot && demo && <OriginalsZone caseRoot={caseRoot} onFeedback={onFeedback} />}
            {!demo && <p className="wf-empty rail-pad">尚无卷宗原件</p>}
            <button
              type="button"
              className={`stage-row ${workDraftMode && activeViewIsDraft ? 'selected' : ''}`}
              data-testid="open-work-drafts"
              onClick={onOpenWorkDrafts}
            >
              <Icon name="file-text" />
              工作稿 · 笔记备忘
              <span>新建</span>
            </button>
            {demo && (
              <button
                type="button"
                className={`stage-row ${fileOpsMode ? 'selected' : ''}`}
                data-testid="open-file-ops"
                onClick={onOpenFileOps}
              >
                <Icon name="folder-open" />
                卷宗整理 · S6
                <span>计划</span>
              </button>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <aside className="case-rail surface-float" data-testid="case-rail" data-collapsed="false">
      <div className="case-expanded">
        <header className="panel-head rail-head">
          <h2 className="rail-wordmark"><img src="/courtwork-mark.svg" alt="" />Courtwork</h2>
          <i />
          <button
            className="rail-add-button"
            onClick={onNewCase}
            data-testid="new-case-open"
            aria-label="新建案件"
            title="新建案件"
          >
            <Icon name="plus" />
          </button>
          <button type="button" className="rail-add-button" data-testid="collapse-left-rail" aria-label="折叠左栏" title="折叠左栏" onClick={onCollapseLeft}>
            <Icon name="panel-left" />
          </button>
        </header>

        <nav className="rail-nav-skeleton" aria-label="导航骨架" data-testid="rail-nav-skeleton">
          <button type="button" className="rail-nav-item" data-testid="nav-artifacts" onClick={onOpenArtifacts}>
            <Icon name="package" />
            <span>产出</span>
          </button>
          <button
            type="button"
            className="rail-nav-item is-disabled-feature"
            data-testid="nav-scheduled"
            aria-disabled="true"
            title="即将支持 · 定时任务"
            onClick={(event) => event.preventDefault()}
          >
            <Icon name="calendar-clock" />
            <span>定时</span>
          </button>
          <button
            type="button"
            className="rail-nav-item is-disabled-feature"
            data-testid="nav-dispatch"
            aria-disabled="true"
            title="即将支持 · 派发"
            onClick={(event) => event.preventDefault()}
          >
            <Icon name="send" />
            <span>派发</span>
          </button>
        </nav>

        <div className="case-scroll">
          {pinnedRows.length > 0 && (
            <div className="rail-pinned" data-testid="rail-pinned">
              <p className="rail-label">置顶</p>
              {pinnedRows.map(renderRow)}
            </div>
          )}
          <div className="rail-mixed-list" data-testid="rail-mixed-list">
            {pinnedRows.length > 0 && restRows.length > 0 && <p className="rail-label">最近</p>}
            {restRows.map(renderRow)}
          </div>
        </div>

        <div className="rail-user-wrap">
          <button type="button" className="rail-user" data-testid="user-menu-trigger" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen((open) => !open)}>
            <span className="user-avatar">{showLeadAttorney(isDemoCase) ? '林' : '我'}</span>
            <span>{showLeadAttorney(isDemoCase) ? '林律师 · 样板负责人' : '负责人'}</span>
            <span aria-hidden="true">⌃</span>
          </button>
          {userMenuOpen && <div className="rail-user-menu" data-testid="user-menu" role="menu">
            <button type="button" role="menuitem" onClick={onOpenSettings}>设置</button>
            <button type="button" role="menuitem" onClick={onOpenSettings}>检查更新 <span className="update-badge">设置</span></button>
            <a role="menuitem" href="mailto:feedback@courtwork.local?subject=Courtwork%20feedback">Give us feedback</a>
          </div>}
        </div>
      </div>
    </aside>
  );
}
