import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PartyGraph, ReviewMatrix, RiskList, Timeline } from '@courtwork/schemas';
import { ProviderSetup } from './credentials/ProviderSetup';
import {
  connectionLabel,
  credentialClient,
  type CredentialStatus,
} from './credentials/client';
import { createDemoClient } from './demo/client';
import { DEMO_ARTIFACTS } from './demo/recordings';
import {
  EMPTY_SESSION,
  projectSession,
  type ReviewDispositionState,
  type ReviewGateProjection,
  type ScenarioFlow,
  type SessionProjection,
} from './protocol/client';
import type { SessionEvent } from '@courtwork/core';
import { buildReviewResolution } from './protocol/review-resolution';
import { Composer, type ComposerSendPayload, type ContainerizeRequest } from './composer';
import { ArchiveConfirmPopover } from './case/ArchiveConfirmPopover';
import {
  caseOutputDir,
  caseOutputDocx,
  createDemoCaseSummary,
  DEMO_CASE_ID,
  isDemoCaseId,
  resolveCaseRoot,
  stageLabel,
} from './case/case-scope';
import { fileCountLabel, type ContainerKind } from './case/container-copy';
import { NewCaseDialog } from './case/NewCaseDialog';
import type { CaseSummary } from './case/types';
import { CommandPalette, type PaletteCommand } from './command-palette/CommandPalette';
import {
  loadModelConfig,
  modelDisplayName,
  saveModelConfig,
  type ModelConfig,
} from './provider/model-config';
import { ModelConfigPopover } from './provider/ModelConfigPopover';
import { FileOpsPlanPanel } from './system/FileOpsPlanPanel';
import { OriginalsZone } from './system/OriginalsZone';
import { systemOpenClient } from './system/system-open-client';
import { WorkDraftPanel } from './system/WorkDraftPanel';
import { CopyButton } from './workbench/CopyButton';
import { ArchiveGlyph, FocusGlyph } from './workbench/MiniIcon';
import { Icon } from './workbench/Icon';
import {
  DraftPanel,
  INITIAL_DRAFT,
  MatrixPanel,
  RevisionPanel,
  TimelinePanel,
  type DraftDocument,
} from './workbench/Panels';
import { SplitView, type SplitDirection } from './workbench/SplitView';
import { ThinkingStream } from './workbench/ThinkingStream';

const GraphPanel = lazy(() => import('./workbench/GraphPanel'));

type WorkbenchView = 'timeline' | 'graph' | 'matrix' | 'revision' | 'draft';

const client = createDemoClient();

const VIEW_LABELS: Record<WorkbenchView, string> = {
  timeline: '时间线',
  graph: '关系图谱',
  matrix: '矩阵审阅',
  revision: '修订预览',
  draft: '起草画布',
};

const VIEWS = Object.keys(VIEW_LABELS) as WorkbenchView[];

const DEMO_CASE = createDemoCaseSummary();

type SessionAction = SessionEvent | { type: '__clear__' };

function reduceSession(state: SessionProjection, action: SessionAction): SessionProjection {
  if (action.type === '__clear__') return EMPTY_SESSION;
  return projectSession(state, action);
}

function useWideSplitAvailable() {
  const [available, setAvailable] = useState(() => window.innerWidth >= 1600);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1600px)');
    const update = () => setAvailable(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return available;
}

export function App() {
  /** 案件域：仅 demo 容器有 flow；非 demo 为 null（D-1 容器隔离） */
  const [flow, setFlow] = useState<ScenarioFlow | null>('S3');
  const [session, dispatch] = useReducer(reduceSession, EMPTY_SESSION);
  const [activeView, setActiveView] = useState<WorkbenchView>('revision');
  const [secondaryView, setSecondaryView] = useState<WorkbenchView>();
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('rows');
  const [splitRatio, setSplitRatio] = useState(50);
  const [gate, setGate] = useState<ReviewGateProjection>();
  const [selectedRiskId, setSelectedRiskId] = useState('risk-03');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [dispositions, setDispositions] = useState<Record<string, ReviewDispositionState>>({});
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [continued, setContinued] = useState(false);
  const [compileOpen, setCompileOpen] = useState(false);
  const [draftFrozen, setDraftFrozen] = useState(false);
  const [draft, setDraft] = useState<DraftDocument>(INITIAL_DRAFT);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>({ phase: 'pending' });
  const [providerSetupOpen, setProviderSetupOpen] = useState(true);
  const [localMessages, setLocalMessages] = useState<Array<{ text: string; files: string[] }>>([]);
  const [cases, setCases] = useState<CaseSummary[]>([DEMO_CASE]);
  const [selectedCaseId, setSelectedCaseId] = useState(DEMO_CASE.id);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [archiveConfirmCaseId, setArchiveConfirmCaseId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => loadModelConfig());
  const [modelConfigOpen, setModelConfigOpen] = useState(false);
  /** 起草画布内切换：交付轨文书 vs 工作稿轨笔记 */
  const [workDraftMode, setWorkDraftMode] = useState(false);
  /** S6 卷宗整理：右栏展示 FileOpsPlan 面板 */
  const [fileOpsMode, setFileOpsMode] = useState(false);
  const [systemFeedback, setSystemFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wideSplitAvailable = useWideSplitAvailable();
  const openedAt = useRef<Record<string, number>>({});
  const lastReplayedFlow = useRef<ScenarioFlow | null | undefined>(undefined);
  const resolvedRequest = useRef<string | undefined>(undefined);
  const prevCaseId = useRef(selectedCaseId);

  const showSystemFeedback = (message: string, ok: boolean) => {
    setSystemFeedback({ message, ok });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSystemFeedback(null), 3200);
  };

  const handleComposerSend = (payload: ComposerSendPayload) => {
    // 壳层只呈现用户输入与附件状态；不新增业务编排进协议客户端。
    setLocalMessages((prev) => [
      ...prev,
      {
        text: payload.text || (payload.attachments.length ? '（附文件）' : ''),
        files: payload.attachments.map((item) => item.fileName),
      },
    ]);
  };

  const probeCredentials = () => {
    void credentialClient.status().then((status) => {
      setCredentialStatus(status);
      // 仅 pending 时强制首启；failed/connected 不乐观改开
      if (status.phase === 'pending') setProviderSetupOpen(true);
    });
  };

  useEffect(() => {
    probeCredentials();
    const onProbe = () => probeCredentials();
    window.addEventListener('courtwork-credential-probe', onProbe);
    return () => window.removeEventListener('courtwork-credential-probe', onProbe);
  }, []);

  useEffect(() => {
    if (!wideSplitAvailable && splitDirection === 'columns') setSplitDirection('rows');
  }, [splitDirection, wideSplitAvailable]);

  // —— 容器切换：案件域状态整体重派生（D-1）——
  useEffect(() => {
    if (prevCaseId.current === selectedCaseId) return;
    prevCaseId.current = selectedCaseId;

    setGate(undefined);
    setExpandedEvidence({});
    setDispositions({});
    setReviewSubmitted(false);
    setContinued(false);
    setLocalMessages([]);
    setWorkDraftMode(false);
    setFileOpsMode(false);
    setDraftFrozen(false);
    setDraft(INITIAL_DRAFT);
    setCompileOpen(false);
    setSelectedRiskId('risk-03');
    setSecondaryView(undefined);
    setActiveView('revision');
    setUsageOpen(false);
    resolvedRequest.current = undefined;
    openedAt.current = {};
    lastReplayedFlow.current = undefined;
    dispatch({ type: '__clear__' });

    if (isDemoCaseId(selectedCaseId)) {
      setFlow('S3');
    } else {
      setFlow(null);
    }
  }, [selectedCaseId]);

  // demo 容器才回放录制；非 demo 永不注入 DEMO_ARTIFACTS
  useEffect(() => {
    if (!isDemoCaseId(selectedCaseId) || !flow) return;
    if (lastReplayedFlow.current === flow) return;
    lastReplayedFlow.current = flow;
    setLocalMessages([]);
    void client.replay(flow, (event) => dispatch(event));
  }, [flow, selectedCaseId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        if (paletteOpen) {
          setPaletteOpen(false);
          return;
        }
        if (newCaseOpen) {
          setNewCaseOpen(false);
          return;
        }
        if (archiveConfirmCaseId) {
          setArchiveConfirmCaseId(null);
          return;
        }
        if (focusMode) {
          setFocusMode(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, newCaseOpen, archiveConfirmCaseId, focusMode]);

  useEffect(() => {
    const requestId = session.confirmation?.requestId;
    if (!requestId) return;
    void client.confirmation.getGateProjection(requestId).then(setGate);
  }, [session.confirmation]);

  useEffect(() => {
    if (!isDemoCaseId(selectedCaseId)) return;
    openedAt.current[selectedRiskId] = Date.now();
    client.emitReviewTelemetry({ type: 'review_item_opened', sessionId: 'demo-s3', itemRef: selectedRiskId, emittedAt: new Date().toISOString() });
  }, [selectedRiskId, selectedCaseId]);

  useEffect(() => {
    const requestId = session.confirmation?.requestId;
    if (!requestId || !gate?.items.length || resolvedRequest.current === requestId) return;
    if (!gate.items.every((item) => dispositions[item.itemRef])) return;

    const dwellMs = gate.items.reduce((total, item) => total + Math.max(0, Date.now() - (openedAt.current[item.itemRef] ?? Date.now())), 0);
    const expandedEvidenceKeys = gate.items.flatMap((item) => item.evidenceKeys).filter((key, index, all) => all.indexOf(key) === index);
    const resolution = buildReviewResolution(gate.items, dispositions, { dwellMs, expandedEvidenceKeys });
    resolvedRequest.current = requestId;
    void client.confirmation.resolve(requestId, resolution).then(() => setReviewSubmitted(true));
  }, [dispositions, gate, session.confirmation]);

  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0];
  const isDemoCase = Boolean(selectedCase.isDemo) || isDemoCaseId(selectedCase.id);
  const caseRoot = resolveCaseRoot(selectedCase);
  // demo 语料只属于 demo 容器——禁止 `?? DEMO_ARTIFACTS` 污染真实案件
  const riskList = (
    isDemoCase
      ? (session.artifacts.RiskList ?? DEMO_ARTIFACTS.riskList)
      : session.artifacts.RiskList
  ) as RiskList | undefined;
  const timeline = (
    isDemoCase
      ? (session.artifacts.Timeline ?? DEMO_ARTIFACTS.timeline)
      : session.artifacts.Timeline
  ) as Timeline | undefined;
  const graph = (
    isDemoCase
      ? (session.artifacts.PartyGraph ?? DEMO_ARTIFACTS.partyGraph)
      : session.artifacts.PartyGraph
  ) as PartyGraph | undefined;
  const matrix = (
    isDemoCase
      ? (session.artifacts.ReviewMatrix ?? DEMO_ARTIFACTS.reviewMatrix)
      : session.artifacts.ReviewMatrix
  ) as ReviewMatrix | undefined;
  const selectedRisk = riskList?.risks.find((risk) => risk.id === selectedRiskId) ?? riskList?.risks[0];
  const gradeByKey = useMemo(() => new Map(session.evidenceGrades.map((item) => [item.key, item.grade])), [session.evidenceGrades]);
  const selectedGate = selectedRisk ? gate?.items.find((item) => item.itemRef === selectedRisk.id) : undefined;
  const selectedGrades = selectedGate?.evidenceKeys.map((key) => gradeByKey.get(key)).filter((value): value is 'A' | 'B' | 'C' => Boolean(value)) ?? [];
  const unverifiedRiskIds = gate?.items
    .filter((item) => item.evidenceKeys.some((key) => gradeByKey.get(key) === 'C'))
    .map((item) => item.itemRef) ?? [];
  const allEvidenceOpened = selectedRisk
    ? selectedRisk.basis.every((_, index) => expandedEvidence[`${selectedRisk.id}:${index}`])
    : false;
  const individualReady = selectedGate?.mode !== 'individual' || allEvidenceOpened;
  const batchRefs = gate?.items.filter((item) => item.mode === 'batch').map((item) => item.itemRef) ?? [];
  const comparing = secondaryView !== undefined;
  const usage = isDemoCase ? (flow === 'S3' ? 91 : 18) : 0;

  const createCase = ({
    title,
    fileCount,
    kind = 'case',
  }: {
    title: string;
    fileCount: number;
    kind?: ContainerKind;
  }) => {
    const newId = `case-${Date.now()}-${title}`;
    setCases((current) => [
      ...current,
      {
        id: newId,
        title,
        fileCount,
        archived: false,
        folderPath: undefined,
        isDemo: false,
        kind,
      },
    ]);
    setSelectedCaseId(newId);
    setNewCaseOpen(false);
  };

  /** docs/52 #3：composer-first 容器化仪式 → 创建案件/项目并选中 */
  const handleContainerize = (request: ContainerizeRequest) => {
    const title =
      request.kind === 'workspace'
        ? `项目 · ${new Date().toLocaleDateString('zh-CN')}`
        : `案件 · ${new Date().toLocaleDateString('zh-CN')}`;
    createCase({ title, fileCount: 0, kind: request.kind });
  };

  const updateModelConfig = (next: ModelConfig) => {
    setModelConfig(next);
    saveModelConfig(next);
  };

  /** docs/52 #1：卷宗/资料计数点击 → 滚到原件区（空间记忆，不展开树） */
  const focusOriginalsZone = () => {
    const zone = document.querySelector('[data-testid="originals-zone"]');
    if (zone instanceof HTMLElement) {
      zone.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      zone.setAttribute('data-highlight', 'true');
      window.setTimeout(() => zone.removeAttribute('data-highlight'), 1200);
      return;
    }
    showSystemFeedback(
      selectedCase.kind === 'workspace' ? '本案工作区尚无资料原件' : '本案尚无卷宗原件',
      false,
    );
  };

  const toggleArchive = (caseId: string) => {
    setCases((current) => current.map((item) => (item.id === caseId ? { ...item, archived: !item.archived } : item)));
    setArchiveConfirmCaseId(null);
  };

  const openOutputFolder = () => {
    if (!caseRoot) {
      showSystemFeedback('本案尚未绑定文件夹', false);
      return;
    }
    void systemOpenClient.revealInFolder(caseOutputDir(caseRoot), caseRoot).then((feedback) => {
      showSystemFeedback(feedback.message, feedback.ok);
    });
  };

  const revealOutputDocx = () => {
    if (!caseRoot) return;
    void systemOpenClient.revealInFolder(caseOutputDocx(caseRoot), caseRoot).then((feedback) => {
      showSystemFeedback(feedback.message, feedback.ok);
    });
  };

  const openOutputDocx = () => {
    if (!caseRoot) return;
    void systemOpenClient.openFile(caseOutputDocx(caseRoot), caseRoot).then((feedback) => {
      showSystemFeedback(feedback.message, feedback.ok);
    });
  };

  const selectFlow = (next: ScenarioFlow) => {
    if (!isDemoCase) return; // 非 demo 不注入样板场景
    setFlow(next);
    setActiveView(next === 'S1' ? 'timeline' : 'revision');
    setWorkDraftMode(false);
    setFileOpsMode(false);
    setGate(undefined);
    setExpandedEvidence({});
    setDispositions({});
    setReviewSubmitted(false);
    setContinued(false);
    resolvedRequest.current = undefined;
  };

  const choosePrimaryView = (view: WorkbenchView) => {
    if (secondaryView === view && activeView !== view) setSecondaryView(activeView);
    setActiveView(view);
    if (view !== 'draft') setWorkDraftMode(false);
    setFileOpsMode(false);
  };

  const openWorkDrafts = () => {
    setWorkDraftMode(true);
    setFileOpsMode(false);
    setActiveView('draft');
  };

  const openFileOps = () => {
    setFileOpsMode(true);
    setWorkDraftMode(false);
    setSecondaryView(undefined);
  };

  const startComparison = () => {
    setSecondaryView(activeView === 'draft' ? 'timeline' : 'draft');
    setSplitDirection('rows');
    setSplitRatio(50);
  };

  const resetComparison = () => {
    setSecondaryView(undefined);
    setSplitDirection('rows');
    setSplitRatio(50);
  };

  const toggleFocusMode = () => {
    setFocusMode((current) => {
      const next = !current;
      if (next) {
        setSecondaryView(undefined);
        setSplitDirection('rows');
        setSplitRatio(50);
      }
      return next;
    });
  };

  const expandBasis = (riskId: string, index: number, evidenceRef: string) => {
    const key = `${riskId}:${index}`;
    setExpandedEvidence((current) => ({ ...current, [key]: !current[key] }));
    client.emitReviewTelemetry({ type: 'review_evidence_expanded', sessionId: 'demo-s3', itemRef: riskId, evidenceRef, emittedAt: new Date().toISOString() });
  };

  const dispose = (itemRef: string, disposition: ReviewDispositionState) => {
    setDispositions((current) => ({ ...current, [itemRef]: disposition }));
    const protocolDisposition = disposition === 'confirmed' ? 'confirm' : disposition === 'rejected' ? 'reject' : 'revise';
    client.emitReviewTelemetry({ type: 'review_disposition_submitted', sessionId: 'demo-s3', itemRef, disposition: protocolDisposition, emittedAt: new Date().toISOString() });
  };

  const batchConfirm = () => {
    setDispositions((current) => Object.fromEntries([...Object.entries(current), ...batchRefs.map((ref) => [ref, 'confirmed' as const])]));
  };

  const emptyWorkbench = (hint: string) => (
    <div className="empty-state" role="status" data-testid="case-empty-state">{hint}</div>
  );

  const renderView = (view: WorkbenchView) => {
    if (fileOpsMode) {
      if (!isDemoCase) {
        return emptyWorkbench(`${selectedCase.title} · 整理计划将在拖入未归档文件后生成`);
      }
      return <FileOpsPlanPanel caseId={selectedCase.id} onFeedback={showSystemFeedback} />;
    }
    if (!isDemoCase) {
      return emptyWorkbench(`${selectedCase.title} 刚建立，尚无卷宗内容 · 从对话或场景开始整理`);
    }
    if (view === 'timeline') {
      if (!timeline) return emptyWorkbench('时间线尚未生成');
      return <TimelinePanel timeline={timeline} grade={session.evidenceGrades[0]?.grade} />;
    }
    if (view === 'graph') {
      if (!graph) return emptyWorkbench('关系图谱尚未生成');
      return <Suspense fallback={<div className="empty-state" role="status">关系图谱载入中…</div>}>
        <GraphPanel graph={graph} grade={session.evidenceGrades[0]?.grade} />
      </Suspense>;
    }
    if (view === 'matrix') {
      if (!matrix) return emptyWorkbench('矩阵审阅尚未生成');
      return <MatrixPanel matrix={matrix} />;
    }
    if (view === 'draft') {
      if (workDraftMode) {
        return (
          <WorkDraftPanel
            caseId={selectedCase.id}
            caseRoot={caseRoot ?? ''}
            onFeedback={showSystemFeedback}
          />
        );
      }
      return (
        <DraftPanel
          value={draft}
          onChange={setDraft}
          frozen={draftFrozen}
          onCompile={() => setCompileOpen(true)}
          onOpenDocx={draftFrozen ? openOutputDocx : undefined}
        />
      );
    }
    if (!riskList || !selectedRisk) return emptyWorkbench('修订预览尚未生成');
    return <RevisionPanel
      riskList={riskList}
      selectedRisk={selectedRisk}
      selectedRiskId={selectedRiskId}
      onSelectRisk={setSelectedRiskId}
      gate={gate}
      selectedGrades={selectedGrades}
      unverifiedRiskIds={unverifiedRiskIds}
      expandedEvidence={expandedEvidence}
      onExpandBasis={expandBasis}
      dispositions={dispositions}
      onDispose={dispose}
      individualReady={individualReady}
      batchRefs={batchRefs}
      onBatchConfirm={batchConfirm}
      submitted={reviewSubmitted}
    />;
  };

  const pane = (view: WorkbenchView, secondary = false) => <section className="workbench-pane" data-pane={secondary ? 'secondary' : 'primary'}>
    <header className="pane-head">
      {secondary
        ? <label><span>对照</span><select aria-label="对照工作面" value={view} onChange={(event) => setSecondaryView(event.target.value as WorkbenchView)}>{VIEWS.map((candidate) => <option value={candidate} key={candidate}>{VIEW_LABELS[candidate]}</option>)}</select></label>
        : <><strong>{VIEW_LABELS[view]}</strong><span>主工作面</span></>}
    </header>
    <div className="pane-content">{renderView(view)}</div>
  </section>;

  const paletteCommands: PaletteCommand[] = [
    ...(isDemoCase
      ? [
          { id: 'scene-s1', section: '场景', label: '整理卷宗', onRun: () => { selectFlow('S1'); setPaletteOpen(false); } },
          { id: 'scene-s3', section: '场景', label: '审查合同', onRun: () => { selectFlow('S3'); setPaletteOpen(false); } },
          { id: 'scene-s6', section: '场景', label: '卷宗整理', onRun: () => { openFileOps(); setPaletteOpen(false); } },
        ]
      : []),
    { id: 'scene-draft', section: '场景', label: '起草答辩状', onRun: () => { setWorkDraftMode(false); setFileOpsMode(false); choosePrimaryView('draft'); setPaletteOpen(false); } },
    ...cases.map((item) => ({
      id: `case-${item.id}`,
      section: '案件',
      label: item.archived
        ? `${item.title}（已归档）`
        : item.isDemo || isDemoCaseId(item.id)
          ? `${item.title}（样板案·演示）`
          : item.title,
      onRun: () => { setSelectedCaseId(item.id); setPaletteOpen(false); },
    })),
    { id: 'action-new-case', section: '操作', label: '新建案件', onRun: () => { setPaletteOpen(false); setNewCaseOpen(true); } },
    {
      id: 'action-archive',
      section: '操作',
      label: selectedCase.archived ? '取消归档当前案件' : '归档当前案件',
      onRun: () => { setPaletteOpen(false); setArchiveConfirmCaseId(selectedCase.id); },
    },
    {
      id: 'action-focus',
      section: '操作',
      label: focusMode ? '退出专注模式' : '进入专注模式',
      onRun: () => { setPaletteOpen(false); toggleFocusMode(); },
    },
    {
      id: 'action-output-folder',
      section: '操作',
      label: '打开产出文件夹',
      // F-3 已接通真实 reveal；命令面板走同一路径
      onRun: () => { setPaletteOpen(false); openOutputFolder(); },
    },
  ];

  return (
    <main className="app-shell" data-testid="workbench">
      <header className="titlebar">
        <div className="brand"><img src="/courtwork-mark.svg" alt="" />Courtwork</div>
        <span className="bar-divider" />
        <strong className="truncate" title={selectedCase.title} data-testid="titlebar-case-title">{selectedCase.title}</strong>
        {selectedCase.caseNumber && (
          <span className="case-number truncate" title={selectedCase.caseNumber}>{selectedCase.caseNumber}</span>
        )}
        {isDemoCase && <span className="demo-badge" data-testid="demo-case-badge">样板案·演示</span>}
        <span className="spacer" />
        <button type="button" className="shortcut shortcut-trigger" onClick={() => setPaletteOpen(true)}>
          <kbd>⌘</kbd><kbd>K</kbd> 场景与检索
        </button>
      </header>

      <nav className="toolbar" aria-label="工作台工具栏">
        <span>案件</span><span className="crumb-sep">›</span>
        <strong className="truncate" title={stageLabel(flow, isDemoCase)} data-testid="toolbar-stage">{stageLabel(flow, isDemoCase)}</strong>
        <span className="spacer" />
        <button
          className="quiet-button credential-button"
          onClick={() => setProviderSetupOpen(true)}
          title={credentialStatus.failureMessage ?? '配置文书助手'}
          data-testid="credential-status-button"
          data-phase={credentialStatus.phase}
        >
          <Icon name="cog" />模型服务 · {connectionLabel(credentialStatus)}
        </button>
        <button className="quiet-button" disabled title="审阅记录 · 待生成">审阅记录</button>
        <button className="primary-button" disabled title="导出审阅稿 · 待完成文书生成">导出审阅稿</button>
      </nav>

      <div
        className={`workspace ${comparing ? 'comparing' : ''} ${focusMode ? 'focus-mode' : ''}`}
        data-testid="workspace"
        data-comparing={comparing ? 'true' : 'false'}
        data-focus-mode={focusMode ? 'true' : 'false'}
      >
        {!focusMode && <aside className="case-rail">
          <div className="case-expanded">
            <PanelHead title="案件" count={String(cases.length)} action={<button className="rail-add-button" onClick={() => setNewCaseOpen(true)} data-testid="new-case-open" aria-label="新建案件" title="新建案件"><Icon name="plus" /></button>} />
            <div className="case-scroll">
              {cases.map((item) => (
                <article key={item.id} className={`case-card ${item.id === selectedCaseId ? 'selected' : ''} ${item.archived ? 'archived' : ''}`} data-testid={`case-card-${item.id}`} data-demo={item.isDemo || isDemoCaseId(item.id) ? 'true' : 'false'}>
                  <div className="case-card-select">
                    <button type="button" className="case-card-main" onClick={() => setSelectedCaseId(item.id)}>
                      <strong className="truncate" title={item.title}>{item.title}</strong>
                      {item.caseNumber && <span className="case-number truncate" title={item.caseNumber}>{item.caseNumber}</span>}
                    </button>
                    <div className="case-card-meta truncate">
                      <button
                        type="button"
                        className="case-file-count"
                        data-testid="case-file-count"
                        title="查看原件区"
                        onClick={() => {
                          setSelectedCaseId(item.id);
                          window.requestAnimationFrame(() => focusOriginalsZone());
                        }}
                      >
                        {fileCountLabel(item.kind ?? 'case', item.fileCount)}
                      </button>
                      {item.archived ? <span> · 已归档</span> : null}
                      {(item.isDemo || isDemoCaseId(item.id)) ? <span> · 样板案·演示</span> : null}
                    </div>
                  </div>
                  {(item.isDemo || isDemoCaseId(item.id)) && (
                    <span className="demo-badge case-demo-badge" title="样板案·演示">演示</span>
                  )}
                  <button
                    className="case-archive-button"
                    onClick={() => setArchiveConfirmCaseId(item.id)}
                    aria-label={item.archived ? `取消归档 ${item.title}` : `归档 ${item.title}`}
                    title={item.archived ? `取消归档：${item.title}` : `归档：${item.title}`}
                    data-testid="archive-trigger"
                  >
                    <ArchiveGlyph />
                  </button>
                  {archiveConfirmCaseId === item.id && (
                    <ArchiveConfirmPopover
                      caseTitle={item.title}
                      archived={item.archived}
                      onConfirm={() => toggleArchive(item.id)}
                      onCancel={() => setArchiveConfirmCaseId(null)}
                    />
                  )}
                </article>
              ))}
              {isDemoCase && <>
                <p className="rail-label">阶段</p>
                <button className={`stage-row ${flow === 'S1' ? 'selected' : ''}`} onClick={() => selectFlow('S1')} data-testid="flow-s1"><Icon name="panels-top-left" /><span className="truncate">阶段一 · 阅卷整理</span><span>已归档</span></button>
                <button className={`stage-row ${flow === 'S3' ? 'selected' : ''}`} onClick={() => selectFlow('S3')} data-testid="flow-s3"><Icon name="panels-top-left" /><span className="truncate">阶段二 · 合同审查</span><span>{Object.keys(dispositions).length}/6</span></button>
                {caseRoot && <OriginalsZone caseRoot={caseRoot} onFeedback={showSystemFeedback} />}
                <p className="rail-label">工作稿</p>
                <button
                  type="button"
                  className={`stage-row ${workDraftMode && activeView === 'draft' ? 'selected' : ''}`}
                  data-testid="open-work-drafts"
                  onClick={openWorkDrafts}
                >
                  <Icon name="file-text" />工作稿 · 笔记备忘<span>新建</span>
                </button>
                <button
                  type="button"
                  className={`stage-row ${fileOpsMode ? 'selected' : ''}`}
                  data-testid="open-file-ops"
                  onClick={openFileOps}
                >
                  <Icon name="folder-open" />卷宗整理 · S6<span>计划</span>
                </button>
              </>}
            </div>
            <div className="rail-footer">主办律师 · 林律师</div>
          </div>
          <nav className="collapsed-case-icons" aria-label="折叠的案件栏">
            {cases.map((item) => (
              <button key={item.id} aria-label={item.title} title={item.title} onClick={() => setSelectedCaseId(item.id)}>
                <Icon name="briefcase-business" />
                {(item.isDemo || isDemoCaseId(item.id)) && item.id === selectedCaseId && <span className="unread-count">1</span>}
              </button>
            ))}
            {isDemoCase && <>
              <button aria-label="阅卷整理" title="阅卷整理" onClick={() => selectFlow('S1')}><Icon name="panels-top-left" /></button>
              <button aria-label="合同审查" title="合同审查" onClick={() => selectFlow('S3')}><Icon name="message-square-text" /></button>
            </>}
          </nav>
        </aside>}

        {!focusMode && <section className="conversation">
          <PanelHead title="对话" count={isDemoCase ? (flow === 'S1' ? '本阶段 3 轮' : '本阶段 6 轮') : '尚无'} shortcut="J K 逐条" />
          <div className="conversation-scroll">
            {!isDemoCase && <div className="empty-state" role="status" data-testid="conversation-empty">{selectedCase.title} 刚建立，尚无对话记录 · 从场景按钮开始</div>}
            {isDemoCase && <>
            <div className="user-message">{flow === 'S1' ? '整理全套卷宗，标出事件矛盾并核对当事人关系。' : '审查这份设备采购合同，重点看付款、验收与违约责任。'}</div>
            <ThinkingStream />
            <article className="data-card">
              <div className="card-heading"><span className="domain-badge">{flow === 'S1' ? 'D20' : 'D04'}</span><strong>{flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'}</strong></div>
              <p>{flow === 'S1' ? '已按卷宗顺序识别文书，并把事件与主体关系交叉核对。' : '已完成条款抽取与当事人核对，审查结果已送达右侧工作面。'}</p>
              <CopyButton label="复制卡片内容" getText={() => `${flow === 'S1' ? 'D20' : 'D04'}\n${flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'}\n${flow === 'S1' ? '已按卷宗顺序识别文书，并把事件与主体关系交叉核对。' : '已完成条款抽取与当事人核对，审查结果已送达右侧工作面。'}`} />
            </article>
            {session.progress.map((message, index) => <div className="progress-card" key={`${message}-${index}`}><span className="progress-pulse" />{message}</div>)}
            <article className="data-card compact-result">
              <div className="card-heading"><span className="domain-badge">{flow === 'S3' ? 'R' : 'E'}</span><strong>{flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}</strong></div>
              <p>{flow === 'S3' ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。' : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}</p>
              <CopyButton label="复制卡片内容" getText={() => `${flow === 'S3' ? 'R' : 'E'}\n${flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}\n${flow === 'S3' ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。' : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}`} />
            </article>
            {flow === 'S3' && (
              <article className="data-card output-file-card" data-testid="output-docx-card">
                <div className="card-heading"><span className="domain-badge">W</span><strong>合同审查报告.docx</strong></div>
                <p>审查报告已写入本案「产出」文件夹，可在访达中查看或用系统程序打开。</p>
                <div className="output-file-actions">
                  <button type="button" className="quiet-button" data-testid="reveal-output-docx" onClick={revealOutputDocx}>在访达中显示</button>
                  <button type="button" className="primary-button" data-testid="open-output-docx" onClick={openOutputDocx}>打开文件</button>
                </div>
              </article>
            )}
            <aside className="generated-callout">
              <strong>审阅提示</strong>
              <p>{flow === 'S3' ? '先核对验收条款的原文依据，再决定是否接受对应修订。' : '催告主体、收款账户与验收结论存在交叉矛盾，建议优先核对。'}</p>
              <CopyButton label="复制审阅提示" getText={() => `审阅提示\n${flow === 'S3' ? '先核对验收条款的原文依据，再决定是否接受对应修订。' : '催告主体、收款账户与验收结论存在交叉矛盾，建议优先核对。'}`} />
            </aside>
            </>}
            {localMessages.map((message, index) => (
              <div className="user-message" key={`local-${index}`} data-testid="local-user-message">
                {message.text}
                {message.files.length > 0 && (
                  <div className="user-message-attachments">
                    {message.files.map((name) => (
                      <span key={name} title={name}>{name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="scene-strip">
            {isDemoCase && <>
              <button onClick={() => selectFlow('S1')}>整理卷宗</button>
              <button onClick={() => selectFlow('S3')}>审查合同</button>
              <button type="button" data-testid="scene-file-ops" onClick={openFileOps}>卷宗整理</button>
            </>}
            <button onClick={() => { setWorkDraftMode(false); setFileOpsMode(false); choosePrimaryView('draft'); }}>起草答辩状</button>
          </div>
          <Composer
            cases={cases.map((item) => ({
              id: item.id,
              name: item.title,
              kind: item.kind ?? 'case',
            }))}
            activeCaseId={selectedCaseId}
            onSend={handleComposerSend}
            onContainerize={handleContainerize}
          />
        </section>}

        <section className="right-workbench">
          <PanelHead title={comparing ? '工作面对照' : VIEW_LABELS[activeView]} count={comparing ? '双面' : viewCount(activeView, draftFrozen, isDemoCase)} />
          <div className="view-tabs" role="tablist" aria-label="结构化工作面">
            {VIEWS.map((view) => <button key={view} role="tab" aria-selected={activeView === view} className={activeView === view ? 'active' : ''} onClick={() => choosePrimaryView(view)} data-testid={`view-${view}`}><span>{VIEW_LABELS[view]}</span><i className="tab-indicator" aria-hidden="true" /></button>)}
            <span className="tab-spacer" />
            {!focusMode && !comparing && <button className="view-action" onClick={startComparison} data-testid="split-start" title="开始上下对照"><Icon name="rows-two" />对照</button>}
            {!focusMode && comparing && <>
              <button className={`icon-button ${splitDirection === 'rows' ? 'active' : ''}`} aria-label="上下对照" title="上下对照" aria-pressed={splitDirection === 'rows'} onClick={() => setSplitDirection('rows')}><Icon name="rows-two" /></button>
              <button className={`icon-button ${splitDirection === 'columns' ? 'active' : ''}`} aria-label="左右对照" title={wideSplitAvailable ? '左右对照' : '窗口宽度达到 1600 后可用'} aria-pressed={splitDirection === 'columns'} disabled={!wideSplitAvailable} onClick={() => setSplitDirection('columns')}><Icon name="columns-two" /></button>
              <button className="view-action" onClick={resetComparison} data-testid="split-reset" title="退出对照并恢复三栏"><Icon name="rotate-counter-clockwise" />复位</button>
            </>}
            <button
              type="button"
              className="view-action"
              onClick={toggleFocusMode}
              data-testid="focus-toggle"
              aria-pressed={focusMode}
              title={focusMode ? '退出专注模式' : '专注模式 · 单工作面全窗'}
            >
              <FocusGlyph /><span>{focusMode ? '退出专注' : '专注'}</span>{focusMode && <kbd>Esc</kbd>}
            </button>
          </div>
          <div className="view-content">
            {secondaryView
              ? <SplitView direction={splitDirection} ratio={splitRatio} onRatioChange={setSplitRatio} primary={pane(activeView)} secondary={pane(secondaryView, true)} />
              : renderView(activeView)}
          </div>
        </section>
      </div>

      <footer className="statusbar">
        <button className="usage-button" onClick={() => setUsageOpen((open) => !open)} aria-expanded={usageOpen} data-testid="usage-ring">
          <span className={`usage-ring ${usage >= 85 ? 'critical' : ''}`} style={{ '--usage': `${usage}%` } as React.CSSProperties} />本阶段用量 {usage}%
        </button>
        {usageOpen && isDemoCase && <div className="usage-popover"><strong>本阶段用量</strong><span>卷宗占用 {flow === 'S1' ? '14%' : '62%'}</span><span>对话占用 {flow === 'S1' ? '4%' : '23%'}</span><span>可整理内容 {flow === 'S1' ? '0%' : '6%'}</span></div>}
        {isDemoCase && <span>摄取余量 <b>1,154</b></span>}
        {isDemoCase && usage >= 85 && <button className="continuation-button" disabled={continued} title={continued ? '下一阶段已开启' : '开启下一阶段'} onClick={() => void client.continuation.continueSession('demo-s3').then(() => setContinued(true))}>继续本案工作</button>}
        {continued && isDemoCase && <span className="continued-note" role="status">已开启下一阶段</span>}
        <span className="spacer" />
        {systemFeedback && (
          <span
            className={`system-feedback ${systemFeedback.ok ? 'ok' : 'error'}`}
            role="status"
            data-testid="system-open-feedback"
          >
            {systemFeedback.message}
          </span>
        )}
        <button
          type="button"
          className="quiet-button status-open-folder"
          data-testid="open-output-folder"
          title={caseRoot ? '在访达中打开本案产出文件夹' : '本案尚未绑定文件夹'}
          disabled={!caseRoot}
          onClick={openOutputFolder}
        >
          打开产出文件夹
        </button>
        <span className="truncate" data-testid="statusbar-progress">
          {!isDemoCase
            ? '新案件 · 等待任务'
            : session.failures.length
              ? '有步骤需要人工处理'
              : flow === 'S1'
                ? '摄取进行中 16 / 20'
                : `${Object.keys(dispositions).length} / 6 项已处置`}
        </span>
        <span className="truncate" data-testid="statusbar-stage">{stageLabel(flow, isDemoCase)}</span>
        <span className="model-config-anchor">
          <button
            type="button"
            className="quiet-button model-config-trigger"
            data-testid="model-config-trigger"
            aria-expanded={modelConfigOpen}
            title="选择服务商、模型与推理强度"
            onClick={() => setModelConfigOpen((open) => !open)}
          >
            {modelDisplayName(modelConfig)}
            <span className="model-config-reasoning-tag">
              {modelConfig.reasoning === 'deep' ? '深思' : '标准'}
            </span>
          </button>
          <ModelConfigPopover
            open={modelConfigOpen}
            config={modelConfig}
            onChange={updateModelConfig}
            onClose={() => setModelConfigOpen(false)}
          />
        </span>
      </footer>

      {compileOpen && <div className="modal-backdrop" role="presentation"><section className="compile-dialog" role="dialog" aria-modal="true" aria-labelledby="compile-title"><h2 id="compile-title">编译为 Word 文档</h2><p>定稿后，本画布将转为只读存档。后续修改将在文书修订中逐条处理，无法返回起草状态。</p><div><button className="quiet-button" onClick={() => setCompileOpen(false)}>取消</button><button className="primary-button" onClick={() => { setDraftFrozen(true); setCompileOpen(false); }}>确认定稿并编译</button></div></section></div>}

      <ProviderSetup
        open={providerSetupOpen}
        allowSkip={credentialStatus.phase !== 'connected'}
        onClose={() => setProviderSetupOpen(false)}
        onStatusChange={setCredentialStatus}
      />
      <NewCaseDialog open={newCaseOpen} onClose={() => setNewCaseOpen(false)} onCreate={createCase} />
      <CommandPalette open={paletteOpen} commands={paletteCommands} onClose={() => setPaletteOpen(false)} />
    </main>
  );
}

function PanelHead({ title, count, shortcut, action }: { title: string; count: string; shortcut?: string; action?: React.ReactNode }) {
  return <header className="panel-head"><h2>{title}</h2><span>{count}</span><i />{shortcut && <small>{shortcut}</small>}{action}</header>;
}

function viewCount(view: WorkbenchView, draftFrozen: boolean, isDemo: boolean) {
  if (!isDemo) return '尚无';
  if (view === 'timeline') return '47 件';
  if (view === 'graph') return '14 · 15';
  if (view === 'matrix') return '10 × 7';
  if (view === 'revision') return '4 处';
  return draftFrozen ? '已定稿' : '起草中';
}
