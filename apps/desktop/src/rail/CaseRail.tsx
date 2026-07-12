import { ArchiveConfirmPopover } from '../case/ArchiveConfirmPopover';
import { CHROME_COPY } from '../chrome/copy';
import { containerOriginLabel, fileCountLabel, type ContainerKind } from '../case/container-copy';
import { isDemoCaseId } from '../case/case-scope';
import type { CaseSummary } from '../case/types';
import { CONTAINERIZE_COPY } from '../composer';
import type { ScenarioFlow } from '../protocol/client';
import { OriginalsZone } from '../system/OriginalsZone';
import { ArchiveGlyph } from '../workbench/MiniIcon';
import { Icon } from '../workbench/Icon';
import { useRef, useState } from 'react';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';
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
  selectedCaseId: string | null;
  expandedCaseId: string | null;
  isDemoCase: boolean;
  flow: ScenarioFlow | null;
  dispositionsCount: number;
  caseRoot: string | undefined;
  archiveConfirmCaseId: string | null;
  /** F-1.1：未归档「存入」锚定的容器化仪式行 id */
  containerizeUnfiledId: string | null;
  /** RP-2.11 chat|work 二段（段控落左栏顶 Cowork 位） */
  viewSegment: 'chat' | 'work';
  onSegmentChange: (next: 'chat' | 'work') => void;
  leftCollapsed: boolean;
  onSelectCase: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onNewCase: () => void;
  onOpenArtifacts: () => void;
  onSelectFlow: (flow: ScenarioFlow) => void;
  onArchiveTrigger: (id: string) => void;
  onArchiveConfirm: (id: string) => void;
  onArchiveCancel: () => void;
  /** 打开容器化仪式（用户选名词，docs/49） */
  onRequestContainerizeUnfiled: (id: string) => void;
  onConfirmContainerizeUnfiled: (kind: ContainerKind) => void;
  onCancelContainerizeUnfiled: () => void;
  onExpandLeft: () => void;
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
  archiveConfirmCaseId,
  containerizeUnfiledId,
  viewSegment,
  onSegmentChange,
  leftCollapsed,
  onSelectCase,
  onToggleExpand,
  onNewCase,
  onOpenArtifacts,
  onSelectFlow,
  onArchiveTrigger,
  onArchiveConfirm,
  onArchiveCancel,
  onRequestContainerizeUnfiled,
  onConfirmContainerizeUnfiled,
  onCancelContainerizeUnfiled,
  onExpandLeft,
  onOpenSettings,
  onFeedback,
}: CaseRailProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  // 批次七 #5 连带：Owner 菜单补收敛纪律（点外/Esc 即收——此前与 +菜单/case 下拉同为孤立缺口）
  useDismissOnOutside(userMenuOpen, () => setUserMenuOpen(false), userMenuRef);
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
          title={CHROME_COPY.navigation.expandLeft}
          aria-label={CHROME_COPY.navigation.expandLeft}
          onClick={onExpandLeft}
        >
          <Icon name="panel-left" />
        </button>
        <nav className="collapsed-case-icons" aria-label="Collapsed case sidebar">
          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.title}
              title={item.title}
              onClick={() => onSelectCase(item.id)}
            >
              <span data-testid={(item.isDemo || isDemoCaseId(item.id)) ? 'demo-package-icon' : undefined}>
                <Icon name={(item.isDemo || isDemoCaseId(item.id)) ? 'package' : item.kind === 'workspace' ? 'folder-open' : 'briefcase-business'} />
              </span>
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
          <span className="rail-type-icon" data-testid={`rail-icon-${row.kind}`} title={demo ? `${containerOriginLabel(true)}内容包` : railKindLabel(row.kind)}>
            <span data-testid={demo ? 'demo-package-icon' : undefined}><Icon name={demo ? 'package' : railIconName(row.kind)} /></span>
          </span>
          <div className="case-card-select">
            {item ? (
              <>
                <button type="button" className="case-card-main" onClick={() => onSelectCase(item.id)}>
                  <span className="case-title-line">
                    <strong className="truncate" title={item.title}>
                      {item.title}
                    </strong>
                    {demo && <span className="container-origin-label" data-testid="demo-origin-label">{containerOriginLabel(true)}</span>}
                  </span>
                </button>
                <div className="case-card-meta truncate">
                  {item.caseNumber && (
                    <span className="case-number truncate" title={item.caseNumber}>
                      {item.caseNumber}
                    </span>
                  )}
                  {item.caseNumber ? <span aria-hidden="true"> · </span> : null}
                  <span
                    className="case-file-count"
                    data-testid="case-file-count"
                  >
                    {fileCountLabel(item.kind ?? 'case', item.fileCount)}
                  </span>
                  {item.archived ? <span> · 已归档</span> : null}
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
            {caseRoot && demo && <OriginalsZone caseRoot={caseRoot} onFeedback={onFeedback} />}
            {!demo && <p className="wf-empty rail-pad">尚无卷宗原件</p>}
          </div>
        )}
      </article>
    );
  };

  return (
    <aside className="case-rail surface-float" data-testid="case-rail" data-collapsed="false">
      <div className="case-expanded">
        <header className="panel-head rail-head">
          <h2 className="rail-wordmark">Courtwork</h2>
          <i />
          <button
            className="rail-add-button"
            onClick={onNewCase}
            data-testid="new-case-open"
            aria-label={CHROME_COPY.navigation.newCase}
            title={CHROME_COPY.navigation.newCase}
          >
            <Icon name="plus" />
          </button>
        </header>

        {/* RP-2.11：chat|work 段控落左栏顶（Cowork Home|Code 位），真路由 */}
        <div className="rail-segment" data-testid="view-segment" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            data-testid="segment-chat"
            className={`rail-segment-tab ${viewSegment === 'chat' ? 'is-active' : ''}`}
            aria-selected={viewSegment === 'chat'}
            onClick={() => onSegmentChange('chat')}
          >
            {CHROME_COPY.segment.chat}
          </button>
          <button
            type="button"
            role="tab"
            data-testid="segment-work"
            className={`rail-segment-tab ${viewSegment === 'work' ? 'is-active' : ''}`}
            aria-selected={viewSegment === 'work'}
            onClick={() => onSegmentChange('work')}
          >
            {CHROME_COPY.segment.work}
          </button>
        </div>

        <nav className="rail-nav-skeleton" aria-label="Navigation" data-testid="rail-nav-skeleton">
          <button type="button" className="rail-nav-item" data-testid="nav-artifacts" onClick={onOpenArtifacts}>
            <Icon name="package" />
            <span>{CHROME_COPY.navigation.output}</span>
          </button>
          <button
            type="button"
            className="rail-nav-item is-disabled-feature"
            data-testid="nav-scheduled"
            aria-disabled="true"
            title="Coming soon · Scheduled tasks"
            onClick={(event) => event.preventDefault()}
          >
            <Icon name="calendar-clock" />
            <span>{CHROME_COPY.navigation.scheduled}</span>
          </button>
          <button
            type="button"
            className="rail-nav-item is-disabled-feature"
            data-testid="nav-dispatch"
            aria-disabled="true"
            title="Coming soon · Dispatch"
            onClick={(event) => event.preventDefault()}
          >
            <Icon name="send" />
            <span>{CHROME_COPY.navigation.dispatch}</span>
          </button>
        </nav>

        <div className="case-scroll">
          {pinnedRows.length > 0 && (
            <div className="rail-pinned" data-testid="rail-pinned">
              <p className="rail-label">{CHROME_COPY.navigation.pinned}</p>
              {pinnedRows.map(renderRow)}
            </div>
          )}
          <div className="rail-mixed-list" data-testid="rail-mixed-list">
            {pinnedRows.length > 0 && restRows.length > 0 && <p className="rail-label">{CHROME_COPY.navigation.recent}</p>}
            {restRows.map(renderRow)}
          </div>
        </div>

        <div className="rail-user-wrap" ref={userMenuRef}>
          <button type="button" className="rail-user" data-testid="user-menu-trigger" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen((open) => !open)}>
            <span className="user-avatar">{showLeadAttorney(isDemoCase) ? '林' : '我'}</span>
            <span>{showLeadAttorney(isDemoCase) ? `林律师 · ${CHROME_COPY.account.sampleLead}` : CHROME_COPY.account.owner}</span>
            <span aria-hidden="true">⌃</span>
          </button>
          {userMenuOpen && <div className="rail-user-menu" data-testid="user-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setUserMenuOpen(false); onOpenSettings(); }}>{CHROME_COPY.account.settingsUpdates}</button> {/* 批次七 #5：进设置即收菜单——幽灵开态致关设置后首点被吃 */}
            <a role="menuitem" href="mailto:feedback@courtwork.local?subject=Courtwork%20feedback">{CHROME_COPY.account.feedback}</a>
          </div>}
        </div>
      </div>
    </aside>
  );
}
