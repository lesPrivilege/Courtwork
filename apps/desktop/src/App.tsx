import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PartyGraph, ReviewMatrix, RiskList, Timeline } from '@courtwork/schemas';
import { ProviderSetup } from './credentials/ProviderSetup';
import {
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
import {
  caseOutputDir,
  caseOutputDocx,
  createDemoCaseSummary,
  DEMO_CASE_ID,
  isDemoCaseId,
  resolveCaseRoot,
  stageLabel,
} from './case/case-scope';
import { type ContainerKind } from './case/container-copy';
import { NewCaseDialog } from './case/NewCaseDialog';
import type { CaseSummary } from './case/types';
import { CommandPalette, type PaletteCommand } from './command-palette/CommandPalette';
import {
  applyArtifactAutoExpand,
  collapseAllModules,
  DEFAULT_MODULE_OPEN,
  progressHeadCount,
  toggleModuleManual,
  type ModuleId,
  type ModuleOpenMap,
  type UserModuleOverride,
} from './modules/module-stack';
import { ContextModuleBody, WorkingFoldersTree } from './modules/ModuleStack';
import { WorkbenchPreviewRenderer } from './preview/renderers/WorkbenchPreviewRenderer';
import { UtilityRail } from './utility/UtilityRail';
import {
  loadModelConfig,
  modelDisplayName,
  saveModelConfig,
  type ModelConfig,
} from './provider/model-config';
import { CaseRail } from './rail/CaseRail';
import type { UnfiledSession } from './rail/types';
import { SettingsPage, type SettingsSection } from './settings';
import { FileOpsPlanPanel } from './system/FileOpsPlanPanel';
import { systemOpenClient } from './system/system-open-client';
import { WorkDraftPanel } from './system/WorkDraftPanel';
import { CopyButton } from './workbench/CopyButton';
import { FocusGlyph } from './workbench/MiniIcon';
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

function useNarrowRailRequired() {
  const [required, setRequired] = useState(() => window.innerWidth < 1240);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1239px)');
    const update = () => setRequired(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return required;
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('model');
  /** 起草画布内切换：交付轨文书 vs 工作稿轨笔记 */
  const [workDraftMode, setWorkDraftMode] = useState(false);
  /** S6 卷宗整理：右栏展示 FileOpsPlan 面板 */
  const [fileOpsMode, setFileOpsMode] = useState(false);
  const [systemFeedback, setSystemFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  /** RP-1：未归档对话混排 + 置顶 + 案件展开 + 栏收缩 + 模块栈 */
  const [unfiledSessions, setUnfiledSessions] = useState<UnfiledSession[]>([
    { id: 'unfiled-seed-1', title: '先聊后建的对话', updatedAt: Date.now() },
  ]);
  /** F-1.1：左栏未归档存入 → containerize-popover 锚定行 */
  const [containerizeUnfiledId, setContainerizeUnfiledId] = useState<string | null>(null);
  const [pinnedIds] = useState(() => new Set<string>([DEMO_CASE_ID]));
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(DEMO_CASE_ID);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [sceneMoreOpen, setSceneMoreOpen] = useState(false);
  const [editingCaseTitle, setEditingCaseTitle] = useState(false);
  const [caseTitleDraft, setCaseTitleDraft] = useState('');
  const [moduleOpen, setModuleOpen] = useState<ModuleOpenMap>(() => ({ ...DEFAULT_MODULE_OPEN }));
  const [userModuleOverride, setUserModuleOverride] = useState<UserModuleOverride>({});
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wideSplitAvailable = useWideSplitAvailable();
  const narrowRailRequired = useNarrowRailRequired();
  const openedAt = useRef<Record<string, number>>({});
  const lastReplayedFlow = useRef<ScenarioFlow | null | undefined>(undefined);
  const resolvedRequest = useRef<string | undefined>(undefined);
  const prevCaseId = useRef(selectedCaseId);
  const lastArtifactKeys = useRef('');
  /** UX-1 #1 / RP-1 A2：卷宗计数 → 展开态 originals-zone；展开后 DOM 未就绪时排队重试 */
  const pendingOriginalsFocus = useRef(false);
  const [originalsFocusTick, setOriginalsFocusTick] = useState(0);

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
    setPreviewOpen(true);
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

  // docs/49 三章：artifact_produced 自动展开对应模块；用户手动优先
  useEffect(() => {
    const keys = Object.keys(session.artifacts).sort().join(',');
    if (keys === lastArtifactKeys.current) return;
    lastArtifactKeys.current = keys;
    if (!keys) return;
    setModuleOpen((prev) => {
      let next = prev;
      for (const artifactType of Object.keys(session.artifacts)) {
        next = applyArtifactAutoExpand(next, userModuleOverride, artifactType);
      }
      return next;
    });
  }, [session.artifacts, userModuleOverride]);

  // 样板案首屏：无 session artifact 键时仍按当前场景预展开（demo 回落语料）
  useEffect(() => {
    if (!isDemoCaseId(selectedCaseId) || !flow) return;
    if (Object.keys(session.artifacts).length > 0) return;
    const seed = flow === 'S1' ? 'Timeline' : 'RiskList';
    setModuleOpen((prev) => applyArtifactAutoExpand(prev, userModuleOverride, seed));
  }, [selectedCaseId, flow, session.artifacts, userModuleOverride]);

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
  const progressDone =
    !isDemoCase ? 0 : flow === 'S1' ? Math.min(16, 20) : Object.keys(dispositions).length;
  const progressTotal = !isDemoCase ? 6 : flow === 'S1' ? 20 : 6;
  const progressCount = progressHeadCount(progressDone, progressTotal);
  const attachmentSources = localMessages.flatMap((message) => message.files);
  const usageDetail = isDemoCase
    ? {
        dossier: flow === 'S1' ? '14%' : '62%',
        chat: flow === 'S1' ? '4%' : '23%',
        compressible: flow === 'S1' ? '0%' : '6%',
      }
    : null;

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
    if (kind === 'case') setExpandedCaseId(newId);
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

  /**
   * F-1.1：未归档「存入」→ 容器化仪式（与 composer-first 同族）。
   * 禁止直建 kind:'case'（docs/49：用户选名词，不替用户选）。
   */
  const confirmContainerizeUnfiled = (kind: ContainerKind) => {
    if (!containerizeUnfiledId) return;
    const row = unfiledSessions.find((item) => item.id === containerizeUnfiledId);
    const fallback =
      kind === 'workspace'
        ? `项目 · ${new Date().toLocaleDateString('zh-CN')}`
        : `案件 · ${new Date().toLocaleDateString('zh-CN')}`;
    const title = row?.title?.trim() || fallback;
    createCase({ title, fileCount: 0, kind });
    setUnfiledSessions((current) => current.filter((item) => item.id !== containerizeUnfiledId));
    setContainerizeUnfiledId(null);
  };

  const toggleModule = (id: ModuleId) => {
    setModuleOpen((open) => {
      const result = toggleModuleManual(open, userModuleOverride, id);
      setUserModuleOverride(result.override);
      return result.open;
    });
  };

  const enterCompactLayout = () => {
    setLeftCollapsed(true);
    setModuleOpen((open) => collapseAllModules(open));
  };

  const exitCompactLeft = () => setLeftCollapsed(false);

  const updateModelConfig = (next: ModelConfig) => {
    setModelConfig(next);
    saveModelConfig(next);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(`courtwork.case-title.${selectedCaseId}`);
    if (saved) setCases((current) => current.map((item) => item.id === selectedCaseId ? { ...item, title: saved } : item));
  }, [selectedCaseId]);

  const commitCaseTitle = () => {
    const title = caseTitleDraft.trim();
    if (title) {
      setCases((current) => current.map((item) => item.id === selectedCaseId ? { ...item, title } : item));
      window.localStorage.setItem(`courtwork.case-title.${selectedCaseId}`, title);
    }
    setEditingCaseTitle(false);
  };

  const openSettings = (section: SettingsSection = 'model') => {
    setSettingsSection(section);
    setSettingsOpen(true);
    setPaletteOpen(false);
    setModelConfigOpen(false);
  };

  const revealSettingsPath = (path: string) => {
    // 设置页默认产出目录：浏览器下以路径本身作 root 白名单边界
    void systemOpenClient.revealInFolder(path, path).then((feedback) => {
      showSystemFeedback(feedback.message, feedback.ok);
    });
  };

  /**
   * docs/52 #1 + RP-1 A2：卷宗/资料计数 → 展开态内 originals-zone 滚入/高亮。
   * 锚点随收编迁入案件 chevron 展开态；展开后 rAF 重试直至节点入 DOM。
   */
  const focusOriginalsZone = () => {
    pendingOriginalsFocus.current = true;
    setOriginalsFocusTick((n) => n + 1);
  };

  useEffect(() => {
    if (!pendingOriginalsFocus.current) return;
    let cancelled = false;
    let attempts = 0;
    let raf = 0;
    const run = () => {
      if (cancelled) return;
      const zone = document.querySelector('[data-testid="originals-zone"]');
      if (zone instanceof HTMLElement) {
        zone.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        zone.setAttribute('data-highlight', 'true');
        window.setTimeout(() => zone.removeAttribute('data-highlight'), 1200);
        pendingOriginalsFocus.current = false;
        return;
      }
      // 展开态尚未 commit 时保留 pending，等 expandedCaseId 变化再跑
      if (attempts++ < 24) {
        raf = window.requestAnimationFrame(run);
        return;
      }
      if (expandedCaseId === selectedCaseId) {
        pendingOriginalsFocus.current = false;
        showSystemFeedback(
          selectedCase.kind === 'workspace' ? '本案工作区尚无资料原件' : '本案尚无卷宗原件',
          false,
        );
      }
      // expanded 仍未到位：pending 保持 true，依赖 expandedCaseId 触发本 effect 重入
    };
    raf = window.requestAnimationFrame(run);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [expandedCaseId, selectedCaseId, originalsFocusTick, selectedCase.kind]);

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
    setPreviewOpen(true);
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
    setPreviewOpen(true);
  };

  const openWorkDrafts = () => {
    setWorkDraftMode(true);
    setFileOpsMode(false);
    setActiveView('draft');
    setPreviewOpen(true);
  };

  const openFileOps = () => {
    setFileOpsMode(true);
    setWorkDraftMode(false);
    setSecondaryView(undefined);
    setPreviewOpen(true);
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
    {
      id: 'action-settings',
      section: '操作',
      label: '设置',
      onRun: () => openSettings('model'),
    },
  ];

  const effectiveLeftCollapsed = leftCollapsed || narrowRailRequired;
  const compactLayout = effectiveLeftCollapsed && !moduleOpen.progress && !moduleOpen['working-folders'] && !moduleOpen.context
    && !moduleOpen.timeline && !moduleOpen.graph && !moduleOpen.matrix && !moduleOpen.revision && !moduleOpen.draft;

  const utilityItems = [
    {
      id: 'progress' as const,
      title: '进度',
      count: progressCount,
      status: (isDemoCase ? (progressDone >= progressTotal ? 'done' : 'active') : 'idle') as 'done' | 'active' | 'idle',
      open: moduleOpen.progress,
      onToggle: () => toggleModule('progress'),
      body: <>
        <ul className="progress-module-list" data-testid="progress-module-body-list">
          {session.progress.length === 0 && <li className="wf-empty">{isDemoCase ? '等待任务事件…' : '新案件 · 等待任务'}</li>}
          {session.progress.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
        </ul>
        {isDemoCase && usage >= 85 && <button className="continuation-button" data-testid="continuation-button" disabled={continued} onClick={() => void client.continuation.continueSession('demo-s3').then(() => setContinued(true))}>{continued ? '已开启下一阶段' : '继续本案工作'}</button>}
      </>,
      dockAction: isDemoCase && usage >= 85 ? <button className="continuation-button utility-dock-action" data-testid="continuation-button" disabled={continued} onClick={() => void client.continuation.continueSession('demo-s3').then(() => setContinued(true))}>{continued ? '已开启下一阶段' : '继续'}</button> : undefined,
    },
    {
      id: 'working-folders' as const,
      title: '工作文件夹',
      count: isDemoCase ? String(selectedCase.fileCount) : '0',
      status: (isDemoCase ? 'active' : 'idle') as 'active' | 'idle',
      open: moduleOpen['working-folders'],
      onToggle: () => toggleModule('working-folders'),
      body: <WorkingFoldersTree isDemo={isDemoCase} originalCount={selectedCase.fileCount} onFocusOriginals={focusOriginalsZone} onOpenWorkDrafts={openWorkDrafts} onOpenFileOps={openFileOps} onOpenOutput={openOutputFolder} workDraftSelected={workDraftMode && activeView === 'draft'} fileOpsSelected={fileOpsMode} />,
    },
    {
      id: 'context' as const,
      title: '上下文',
      count: `${usage}%`,
      status: (usage >= 85 ? 'warn' : 'idle') as 'warn' | 'idle',
      open: moduleOpen.context,
      onToggle: () => toggleModule('context'),
      body: <ContextModuleBody usage={usage} usageDetail={usageDetail} attachmentSources={attachmentSources} modelLabel={modelDisplayName(modelConfig)} modelConnected={false} reasoningLabel={modelConfig.reasoning === 'deep' ? '深思' : '标准'} onOpenModelConfig={() => setModelConfigOpen(true)} />,
    },
  ];

  const expandUtilityItem = (id: 'progress' | 'working-folders' | 'context') => {
    setPreviewOpen(false);
    setModuleOpen((open) => ({ ...open, [id]: true }));
  };

  return (
    <main className="app-shell" data-testid="workbench" data-compact={compactLayout ? 'true' : 'false'}>
      <div
        className={`workspace ${comparing ? 'comparing' : ''} ${focusMode ? 'focus-mode' : ''} ${effectiveLeftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''} ${compactLayout ? 'rails-compact' : ''}`}
        data-testid="workspace"
        data-comparing={comparing ? 'true' : 'false'}
        data-focus-mode={focusMode ? 'true' : 'false'}
        data-left-collapsed={effectiveLeftCollapsed ? 'true' : 'false'}
        data-auto-left-collapsed={narrowRailRequired ? 'true' : 'false'}
        data-right-collapsed={rightCollapsed ? 'true' : 'false'}
        data-compact={compactLayout ? 'true' : 'false'}
      >
        {!focusMode && (
          <CaseRail
            cases={cases}
            unfiled={unfiledSessions}
            pinnedIds={pinnedIds}
            selectedCaseId={selectedCaseId}
            expandedCaseId={expandedCaseId}
            isDemoCase={isDemoCase}
            flow={flow}
            dispositionsCount={Object.keys(dispositions).length}
            caseRoot={caseRoot}
            workDraftMode={workDraftMode}
            activeViewIsDraft={activeView === 'draft'}
            fileOpsMode={fileOpsMode}
            archiveConfirmCaseId={archiveConfirmCaseId}
            containerizeUnfiledId={containerizeUnfiledId}
            leftCollapsed={effectiveLeftCollapsed}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              // 案件行：选中即展开（含已选中但被收起的情况 → 强制 expandedCaseId=id）
              const kind = cases.find((c) => c.id === id)?.kind ?? 'case';
              if (kind === 'case') setExpandedCaseId(id);
            }}
            onToggleExpand={(id) => setExpandedCaseId((current) => (current === id ? null : id))}
            onNewCase={() => setNewCaseOpen(true)}
            onOpenArtifacts={openOutputFolder}
            onSelectFlow={selectFlow}
            onOpenWorkDrafts={openWorkDrafts}
            onOpenFileOps={openFileOps}
            onFocusOriginals={focusOriginalsZone}
            onArchiveTrigger={setArchiveConfirmCaseId}
            onArchiveConfirm={toggleArchive}
            onArchiveCancel={() => setArchiveConfirmCaseId(null)}
            onRequestContainerizeUnfiled={setContainerizeUnfiledId}
            onConfirmContainerizeUnfiled={confirmContainerizeUnfiled}
            onCancelContainerizeUnfiled={() => setContainerizeUnfiledId(null)}
            onExpandLeft={exitCompactLeft}
            onCollapseLeft={() => setLeftCollapsed(true)}
            onOpenSettings={() => openSettings('about')}
            onFeedback={showSystemFeedback}
          />
        )}

        {/* L0：对话流直接坐页面底色，去卡壳 */}
        {!focusMode && (
          <section className="conversation canvas-layer" data-testid="conversation-canvas">
            <header className="chat-case-head">
              {editingCaseTitle ? <input
                autoFocus
                data-testid="chat-case-title-input"
                value={caseTitleDraft}
                onChange={(event) => setCaseTitleDraft(event.target.value)}
                onBlur={commitCaseTitle}
                onKeyDown={(event) => { if (event.key === 'Enter') commitCaseTitle(); if (event.key === 'Escape') setEditingCaseTitle(false); }}
              /> : <span data-testid="titlebar-case-title"><button type="button" className="chat-case-title" data-testid="chat-case-title" title="双击编辑案件名称" onDoubleClick={() => { setCaseTitleDraft(selectedCase.title); setEditingCaseTitle(true); }}>
                {selectedCase.title}
              </button></span>}
              {isDemoCase && <span className="demo-badge" data-testid="demo-case-badge">样板案·演示</span>}
              <span className="stage-chip" data-testid="toolbar-stage">{stageLabel(flow, isDemoCase)}</span>
              <span className="spacer" />
              <button type="button" className="quiet-button chat-global-action" data-testid="open-settings" aria-label="设置" title="设置" onClick={() => openSettings('model')}><Icon name="cog" /></button>
              <button type="button" className="shortcut shortcut-trigger" onClick={() => setPaletteOpen(true)}><kbd>⌘</kbd><kbd>K</kbd></button>
            </header>
            {systemFeedback && <span className={`system-feedback chat-feedback ${systemFeedback.ok ? 'ok' : 'error'}`} role="status" data-testid="system-open-feedback">{systemFeedback.message}</span>}
            <div className="conversation-scroll">
              {!isDemoCase && (
                <div className="empty-state" role="status" data-testid="conversation-empty">
                  {selectedCase.title} 刚建立，尚无对话记录 · 从场景按钮开始
                </div>
              )}
              {isDemoCase && (
                <>
                  <div className="user-message">
                    {flow === 'S1'
                      ? '整理全套卷宗，标出事件矛盾并核对当事人关系。'
                      : '审查这份设备采购合同，重点看付款、验收与违约责任。'}
                  </div>
                  <ThinkingStream />
                  <div className="event-stream" data-testid="event-stream">
                    <div className="event-row success">
                      <span className="domain-badge">{flow === 'S1' ? 'D20' : 'D04'}</span><i className="event-dot" />
                      <span>{flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'}</span>
                    </div>
                    {session.progress.map((message, index) => (
                      <div className="event-row active" key={`${message}-${index}`}>
                        <span className="domain-badge">{String(index + 1).padStart(2, '0')}</span><i className="event-dot" /><span>{message}</span>
                      </div>
                    ))}
                    <div className="event-row success">
                      <span className="domain-badge">完成</span><i className="event-dot" />
                      <span>{flow === 'S3' ? '审阅提示已送达右侧工作面' : '事件与主体关系已完成交叉核对'}</span>
                    </div>
                  </div>
                  <article className="data-card compact-result">
                    <div className="card-heading">
                      <span className="domain-badge">{flow === 'S3' ? 'R' : 'E'}</span>
                      <strong>{flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}</strong>
                    </div>
                    <p>
                      {flow === 'S3'
                        ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。'
                        : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}
                    </p>
                    <CopyButton
                      label="复制卡片内容"
                      getText={() =>
                        `${flow === 'S3' ? 'R' : 'E'}\n${flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}\n${
                          flow === 'S3'
                            ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。'
                            : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'
                        }`
                      }
                    />
                  </article>
                  {flow === 'S3' && (
                    <article className="data-card output-file-card" data-testid="output-docx-card">
                      <div className="card-heading">
                        <span className="domain-badge">W</span>
                        <strong>合同审查报告.docx</strong>
                      </div>
                      <p>审查报告已写入本案「产出」文件夹，可在访达中查看或用系统程序打开。</p>
                      <div className="output-file-actions">
                        <button type="button" className="quiet-button" data-testid="reveal-output-docx" onClick={revealOutputDocx}>
                          在访达中显示
                        </button>
                        <button type="button" className="primary-button" data-testid="open-output-docx" onClick={openOutputDocx}>
                          打开文件
                        </button>
                      </div>
                    </article>
                  )}
                </>
              )}
              {localMessages.map((message, index) => (
                <div className="user-message" key={`local-${index}`} data-testid="local-user-message">
                  {message.text}
                  {message.files.length > 0 && (
                    <div className="user-message-attachments">
                      {message.files.map((name) => (
                        <span key={name} title={name}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="scene-strip" data-testid="scene-strip">
              {isDemoCase && (
                <>
                  <button type="button" className="scene-primary" onClick={() => selectFlow('S1')}>整理卷宗</button>
                  <button type="button" className="scene-primary" onClick={() => selectFlow('S3')}>审查合同</button>
                  <button type="button" className="scene-wide-only" data-testid="scene-file-ops" onClick={openFileOps}>卷宗整理</button>
                </>
              )}
              <button className="scene-draft-wide"
                type="button"
                onClick={() => {
                  setWorkDraftMode(false);
                  setFileOpsMode(false);
                  choosePrimaryView('draft');
                }}
              >
                起草答辩状
              </button>
              <div className="scene-more-wrap">
                <button type="button" data-testid="scene-more" aria-expanded={sceneMoreOpen} onClick={() => setSceneMoreOpen((open) => !open)}>更多</button>
                {sceneMoreOpen && <div className="scene-more-popover surface-card" data-testid="scene-more-popover">
                  {isDemoCase && <button type="button" className="scene-more-narrow-only" onClick={() => { openFileOps(); setSceneMoreOpen(false); }}>卷宗整理</button>}
                  <button type="button" onClick={() => { setWorkDraftMode(false); setFileOpsMode(false); choosePrimaryView('draft'); setSceneMoreOpen(false); }}>起草答辩状</button>
                </div>}
              </div>
            </div>
            {/* L1：composer 浮卡 */}
            <div className="composer-stack">
              <div className="composer-float surface-float">
                <Composer
                cases={cases.map((item) => ({
                  id: item.id,
                  name: item.title,
                  kind: item.kind ?? 'case',
                }))}
                activeCaseId={selectedCaseId}
                onSend={handleComposerSend}
                onContainerize={handleContainerize}
                modelConfig={modelConfig}
                modelConfigOpen={modelConfigOpen}
                modelLabel={modelDisplayName(modelConfig)}
                connectionPhase={credentialStatus.phase}
                onToggleModelConfig={() => setModelConfigOpen((open) => !open)}
                onModelConfigChange={updateModelConfig}
                onCloseModelConfig={() => setModelConfigOpen(false)}
                />
              </div>
              <p className="composer-disclaimer" data-testid="composer-disclaimer">
                Courtwork is an agent and can make mistakes. Please double-check responses.{' '}
                <a href="mailto:feedback@courtwork.local?subject=Courtwork%20feedback">Give us feedback</a>
              </p>
            </div>
          </section>
        )}

        {/* RP-2.5：通用能力栏与 Preview 双宿主；renderer 按声明挂载 */}
        {rightCollapsed ? <aside className="right-rail-collapsed surface-float" data-testid="right-module-stack">
          <button type="button" className="rail-expand-button" data-testid="expand-right-rail" aria-label="展开右栏" title="展开右栏" onClick={() => setRightCollapsed(false)}><Icon name="panel-right" /></button>
        </aside> : <section className="right-workbench" data-testid="right-module-stack" data-preview-open={previewOpen ? 'true' : 'false'}>
          <button type="button" className="collapse-right-button" data-testid="collapse-right-rail" aria-label="折叠右栏" title="折叠右栏" onClick={() => setRightCollapsed(true)}><Icon name="panel-right" /></button>
          <UtilityRail mode={previewOpen ? 'dock' : 'base'} items={utilityItems} onOpenPreview={() => setPreviewOpen(true)} onExpandItem={expandUtilityItem} />
          {previewOpen && <WorkbenchPreviewRenderer
            title={comparing ? '工作面对照' : VIEW_LABELS[activeView]}
            meta={comparing ? '双面' : viewCount(activeView, draftFrozen, isDemoCase)}
            tabs={VIEWS.map((view) => ({ id: view, label: VIEW_LABELS[view] }))}
            activeTab={activeView}
            onSelectTab={(id) => {
              const view = id as WorkbenchView;
              choosePrimaryView(view);
              const moduleId = view as ModuleId;
              if (userModuleOverride[moduleId] === undefined) setModuleOpen((prev) => ({ ...prev, [moduleId]: true }));
            }}
            onClose={() => setPreviewOpen(false)}
            actions={<>
                {!focusMode && !comparing && (
                  <button className="view-action" onClick={startComparison} data-testid="split-start" title="开始上下对照">
                    <Icon name="rows-two" />对照
                  </button>
                )}
                {!focusMode && comparing && (
                  <>
                    <button
                      type="button"
                      className={`icon-button ${splitDirection === 'rows' ? 'active' : ''}`}
                      aria-label="上下对照"
                      title="上下对照"
                      aria-pressed={splitDirection === 'rows'}
                      onClick={() => setSplitDirection('rows')}
                    >
                      <Icon name="rows-two" />
                    </button>
                    <button
                      type="button"
                      className={`icon-button ${splitDirection === 'columns' ? 'active' : ''}`}
                      aria-label="左右对照"
                      title={wideSplitAvailable ? '左右对照' : '窗口宽度达到 1600 后可用'}
                      aria-pressed={splitDirection === 'columns'}
                      disabled={!wideSplitAvailable}
                      onClick={() => setSplitDirection('columns')}
                    >
                      <Icon name="columns-two" />
                    </button>
                    <button className="view-action" onClick={resetComparison} data-testid="split-reset" title="退出对照并恢复三栏">
                      <Icon name="rotate-counter-clockwise" />复位
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="view-action"
                  onClick={toggleFocusMode}
                  data-testid="focus-toggle"
                  aria-pressed={focusMode}
                  title={focusMode ? '退出专注模式' : '专注模式 · 单工作面全窗'}
                >
                  <FocusGlyph />
                  <span>{focusMode ? '退出专注' : '专注'}</span>
                  {focusMode && <kbd>Esc</kbd>}
                </button>
              </>}
          >
              <div className="view-content">
                {secondaryView ? (
                  <SplitView
                    direction={splitDirection}
                    ratio={splitRatio}
                    onRatioChange={setSplitRatio}
                    primary={pane(activeView)}
                    secondary={pane(secondaryView, true)}
                  />
                ) : (
                  renderView(activeView)
                )}
              </div>
          </WorkbenchPreviewRenderer>}
        </section>}
      </div>

      {compileOpen && <div className="modal-backdrop" role="presentation"><section className="compile-dialog" role="dialog" aria-modal="true" aria-labelledby="compile-title"><h2 id="compile-title">编译为 Word 文档</h2><p>定稿后，本画布将转为只读存档。后续修改将在文书修订中逐条处理，无法返回起草状态。</p><div><button className="quiet-button" onClick={() => setCompileOpen(false)}>取消</button><button className="primary-button" onClick={() => { setDraftFrozen(true); setCompileOpen(false); }}>确认定稿并编译</button></div></section></div>}

      <ProviderSetup
        open={providerSetupOpen}
        allowSkip={credentialStatus.phase !== 'connected'}
        onClose={() => setProviderSetupOpen(false)}
        onStatusChange={setCredentialStatus}
      />
      <NewCaseDialog open={newCaseOpen} onClose={() => setNewCaseOpen(false)} onCreate={createCase} />
      <CommandPalette open={paletteOpen} commands={paletteCommands} onClose={() => setPaletteOpen(false)} />
      <SettingsPage
        open={settingsOpen}
        section={settingsSection}
        onSectionChange={setSettingsSection}
        onClose={() => setSettingsOpen(false)}
        credentialStatus={credentialStatus}
        onOpenCredentialSetup={() => {
          setProviderSetupOpen(true);
        }}
        modelConfig={modelConfig}
        onModelConfigChange={updateModelConfig}
        onRevealPath={revealSettingsPath}
        onFeedback={showSystemFeedback}
      />
    </main>
  );
}

function viewCount(view: WorkbenchView, draftFrozen: boolean, isDemo: boolean) {
  if (!isDemo) return '尚无';
  if (view === 'timeline') return '47 件';
  if (view === 'graph') return '14 · 15';
  if (view === 'matrix') return '10 × 7';
  if (view === 'revision') return '4 处';
  return draftFrozen ? '已定稿' : '起草中';
}
