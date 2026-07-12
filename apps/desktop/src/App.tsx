import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PartyGraph, ReviewMatrix, RiskList, Timeline } from '@courtwork/schemas';
import { ProviderSetup } from './credentials/ProviderSetup';
import {
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
import { Composer, CONTAINERIZE_COPY, type ComposerSendPayload, type ContainerizeRequest } from './composer';
import {
  caseOutputDir,
  caseOutputDocx,
  createDemoCaseSummary,
  DEMO_CASE_ID,
  isDemoCaseId,
  resolveCaseRoot,
  stageLabel,
} from './case/case-scope';
import { containerOriginLabel, type ContainerKind } from './case/container-copy';
import { CHROME_COPY } from './chrome/copy';
import { QuestionTurnCard, ToolCallRow, TurnCard } from './chat/TurnCard';
import { CollapsibleMessage } from './chat/CollapsibleMessage';
import { NewCaseDialog } from './case/NewCaseDialog';
import type { CaseSummary } from './case/types';
import { CommandPalette, type PaletteCommand } from './command-palette/CommandPalette';
import {
  applyArtifactAutoExpand,
  DEFAULT_MODULE_OPEN,
  progressHeadCount,
  toggleModuleManual,
  type ModuleId,
  type ModuleOpenMap,
  type UserModuleOverride,
} from './modules/module-stack';
import { ContextModuleBody, WorkingFoldersTree } from './modules/ModuleStack';
import { WorkbenchPreviewRenderer } from './preview/renderers/WorkbenchPreviewRenderer';
import {
  loadModelConfig,
  modelDisplayName,
  saveModelConfig,
  type ModelConfig,
} from './provider/model-config';
import { providerConnectionClient } from './provider/connection-client';
import { CaseRail } from './rail/CaseRail';
import type { UnfiledSession } from './rail/types';
import { SettingsPage, type SettingsSection } from './settings';
import { FileOpsPlanPanel } from './system/FileOpsPlanPanel';
import { systemOpenClient } from './system/system-open-client';
import { WorkDraftPanel } from './system/WorkDraftPanel';
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
import { MessageActions } from './chat/MessageActions';
import { sendChatTurn } from './provider/chat-client';
import { BrandThinking } from './chat/BrandThinking';
import { RightRailModules } from './rail/RightRailModules';
import { PasteBlock } from './chat/PasteBlock';
import { ChatMarkdown } from './chat/ChatMarkdown';
import { Typewriter } from './chat/Typewriter';
import { ScrollToLatest, useFollowScroll } from './chat/follow-scroll';
// 装配点例外（demo/ 同列先例）：原件阅读 fixture 直取 demo-data 文书 md
import contractSourceMd from '../../../packages/demo-data/data/dossier/04-设备采购合同.md?raw';
import { useDismissOnOutside } from './hooks/useDismissOnOutside';

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

function previewViewForArtifact(artifactType: string): WorkbenchView | undefined {
  if (artifactType === 'Timeline') return 'timeline';
  if (artifactType === 'PartyGraph') return 'graph';
  if (artifactType === 'ReviewMatrix') return 'matrix';
  if (artifactType === 'RiskList') return 'revision';
  return undefined;
}

const DEMO_CASE = createDemoCaseSummary();

function storedCaseId(): string | null {
  // RP-2.9：启动永不继承上次卷宗作用域；继续区提供显式回到容器的入口。
  return null;
}

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
  const initialCaseId = useRef(storedCaseId());
  /** 案件域：仅 demo 容器有 flow；非 demo 为 null（D-1 容器隔离） */
  const [flow, setFlow] = useState<ScenarioFlow | null>(() => isDemoCaseId(initialCaseId.current) ? 'S3' : null);
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
  const [continued, setContinued] = useState(false);
  const [compileOpen, setCompileOpen] = useState(false);
  const [draftFrozen, setDraftFrozen] = useState(false);
  const [draft, setDraft] = useState<DraftDocument>(INITIAL_DRAFT);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>({ phase: 'pending' });
  const [credentialProbed, setCredentialProbed] = useState(false);
  const [providerSetupOpen, setProviderSetupOpen] = useState(false);
  const [sampleTourOpen, setSampleTourOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Array<{ text: string; files: string[]; pasteBlocks: string[]; createdAt: number }>>([]);
  const [queuedMessages, setQueuedMessages] = useState<Array<{ id: string; caseId: string; text: string; createdAt: number }>>([]);
  const [cases, setCases] = useState<CaseSummary[]>([DEMO_CASE]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId.current);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [archiveConfirmCaseId, setArchiveConfirmCaseId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => loadModelConfig());
  const [modelConfigOpen, setModelConfigOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsAutoCredential, setSettingsAutoCredential] = useState(false);
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
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(initialCaseId.current);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  /** 十四章浏览器态开关：false=四模块列（大纲目录）,true=浏览器态（右列唯一 Preview） */
  const [previewOpen, setPreviewOpen] = useState(false);
  /** 视图汇流：原件阅读文档（浏览器态 body 替换为阅读面;切 tab 即离开） */
  const [readerDoc, setReaderDoc] = useState<{ name: string; markdown: string } | null>(null);
  /** Preview 模块大纲目录展开态（默认展开——样板案导览指向此处） */
  const [outlineOpen, setOutlineOpen] = useState(true);
  /** RP-2.11 chat|work 二段（docs/25 修正二）：work=容器工作台 / chat=内存态轻画布（重启即逝，持久化归 HARNESS-1）。 */
  const [viewSegment, setViewSegment] = useState<'chat' | 'work'>('work');
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant';
    text: string;
    files: string[];
    pasteBlocks?: string[];
    createdAt: number;
    /** assistant 消息可携带思考内容（折叠回看）；失败轮为分型文案行。 */
    reasoning?: string;
    failed?: boolean;
    /** 刚到达的 assistant 轮：打字机逐字 reveal，完成后置 false 切富渲染。 */
    revealing?: boolean;
  }>>([]);
  /** chat 面在途请求（真 API）；期间 ▏字符指示（RP-2.11 推理字符版）。 */
  const [chatPending, setChatPending] = useState(false);
  /** state commit 前即生效的单飞行锁，防双击/Enter 在同一渲染帧发出两请求。 */
  const chatFlightRef = useRef(false);
  const [storeChatOpen, setStoreChatOpen] = useState(false);
  const [artifactRevision, setArtifactRevision] = useState(0);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const [sceneMoreOpen, setSceneMoreOpen] = useState(false);
  // popover 收敛纪律（GOAL-1）：点别处/Esc 即收
  const sceneMoreRef = useRef<HTMLDivElement>(null);
  // 批次七首例：会话流跟随滚动（work 与 chat 两容器各自独立钉底态）
  const workFollow = useFollowScroll();
  const chatFollow = useFollowScroll();
  const storeChatRef = useRef<HTMLDivElement>(null);
  const [editingCaseTitle, setEditingCaseTitle] = useState(false);
  const [caseTitleDraft, setCaseTitleDraft] = useState('');
  const [moduleOpen, setModuleOpen] = useState<ModuleOpenMap>(() => ({ ...DEFAULT_MODULE_OPEN }));
  const [userModuleOverride, setUserModuleOverride] = useState<UserModuleOverride>({});
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wideSplitAvailable = useWideSplitAvailable();
  const narrowRailRequired = useNarrowRailRequired();
  const openedAt = useRef<Record<string, number>>({});
  const lastReplayedFlow = useRef<string | undefined>(undefined);
  /** 回放代号：切场景/切容器后，旧 paced 回放的残余事件一律作废（防重叠回放误触自动开卡）。 */
  const replayGeneration = useRef(0);
  /** RP-2.5.1：用户关闭只压住同一案件/场景后续 artifact；切场景后自动恢复。 */
  const previewDismissedContext = useRef<string | null>(null);
  /** 当前场景内用户显式选中的工作面优先于仍在回放中的 artifact 自动路由。 */
  const manualPreviewSelected = useRef(false);
  const resolvedRequest = useRef<string | undefined>(undefined);
  const prevCaseId = useRef(selectedCaseId);
  // 五裁②：chat 内建案=隐式存入——当前话题随建案带入新容器 work 面（切案 effect 定向注入,不破 D-1 隔离）
  const chatHandoff = useRef<{ caseId: string; messages: Array<{ text: string; files: string[]; pasteBlocks: string[]; createdAt: number }> } | null>(null);
  const lastArtifactKeys = useRef('');
  /** UX-1 #1 / RP-1 A2：卷宗计数 → 展开态 originals-zone；展开后 DOM 未就绪时排队重试 */
  const pendingOriginalsFocus = useRef(false);
  const [originalsFocusTick, setOriginalsFocusTick] = useState(0);
  const assistantCreatedAt = useRef(Date.now());

  const showSystemFeedback = (message: string, ok: boolean) => {
    setSystemFeedback({ message, ok });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSystemFeedback(null), 3200);
  };

  const handleComposerSend = (payload: ComposerSendPayload) => {
    if (credentialStatus.phase !== 'connected') {
      probeCredentials();
      openCredentialSurface();
      return;
    }
    const createdAt = Date.now();
    // RP-2.9 #11：confirmation_requested 是在途请求进入留人门禁，不是请求完成。
    if (selectedCaseId && isDemoCase && session.progress.length > 0 && !session.completed) {
      setQueuedMessages((current) => [...current, {
        id: `queued-${createdAt}`,
        caseId: selectedCaseId,
        text: payload.text,
        createdAt,
      }]);
      return;
    }
    // 壳层只呈现用户输入与附件状态；不新增业务编排进协议客户端。
    setLocalMessages((prev) => [
      ...prev,
      {
        text: payload.text || (payload.attachments.length ? '（附文件）' : ''),
        files: payload.attachments.map((item) => item.fileName),
        pasteBlocks: payload.pasteBlocks,
        createdAt,
      },
    ]);
  };

  /** chat 面（内存态轻画布）：发送即入内存会话；不落盘（重启即逝，0.1.1 诚实缺口）。
   *  GOAL-1 链路批：真 API 端到端——发送 → Rust 窄面代理流式请求 → 回复 0ms 落格。 */
  const handleChatSend = (payload: ComposerSendPayload) => {
    if (chatFlightRef.current) return false; // 未受理：composer 保留草稿（批次七 #3）
    if (credentialStatus.phase !== 'connected') {
      probeCredentials();
      openCredentialSurface();
      return false; // 引导层拦截≠受理——草稿不清空，连接流程走完原文还在
    }
    const userText = payload.text || (payload.attachments.length ? '（附文件）' : '');
    chatFlightRef.current = true;
    const history = chatMessages
      .filter((message) => !message.failed)
      .map((message) => ({ role: message.role, content: message.text }));
    setChatMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: userText,
        files: payload.attachments.map((item) => item.fileName),
        pasteBlocks: payload.pasteBlocks,
        createdAt: Date.now(),
      },
    ]);
    setChatPending(true);
    void sendChatTurn(modelConfig, [...history, { role: 'user', content: userText }])
      .then((result) => {
        setChatMessages((prev) => [...prev, {
          role: 'assistant',
          text: result.content,
          files: [],
          createdAt: Date.now(),
          reasoning: result.reasoningContent,
          revealing: true, // 打字机逐字 reveal（B）
        }]);
      })
      .catch((error: unknown) => {
        // 诚实失败：分型/异常文案落格为失败行，不假装成功
        setChatMessages((prev) => [...prev, {
          role: 'assistant',
          text: error instanceof Error ? error.message : '暂时无法完成请求，请稍后重试',
          files: [],
          createdAt: Date.now(),
          failed: true,
        }]);
      })
      .finally(() => {
        chatFlightRef.current = false;
        setChatPending(false);
      });
  };

  /** 两面唯一的桥：从 chat 收当前话题入容器（docs/25 修正二），复用容器化仪式后切 work 面。 */
  const storeChatIntoContainer = (kind: ContainerKind) => {
    const title =
      kind === 'workspace'
        ? `项目 · ${new Date().toLocaleDateString('zh-CN')}`
        : `案件 · ${new Date().toLocaleDateString('zh-CN')}`;
    // 五裁②：当前话题的用户消息随建案收进新容器（存入桥天然场景）——切案 effect 据此定向注入
    const handoff = chatMessages
      .filter((message) => message.role === 'user')
      .map((message) => ({ text: message.text, files: message.files, pasteBlocks: message.pasteBlocks ?? [], createdAt: message.createdAt }));
    const newId = createCase({ title, fileCount: 0, kind });
    if (handoff.length) chatHandoff.current = { caseId: newId, messages: handoff };
    // chatspace 侧原对话照单例语义保留（不清空）——切回 chat 面仍可续
    setStoreChatOpen(false);
    setViewSegment('work');
  };

  const switchSegment = (next: 'chat' | 'work') => {
    setStoreChatOpen(false);
    setViewSegment(next);
  };

  useDismissOnOutside(sceneMoreOpen, () => setSceneMoreOpen(false), sceneMoreRef);
  useDismissOnOutside(storeChatOpen, () => setStoreChatOpen(false), storeChatRef);

  /** 凭证入口路由（2026-07-12）：首启走欢迎引导卡；此后一律 Settings 内嵌（#43 减法律，不再首页弹窗）。 */
  const openCredentialSurface = () => {
    if (!window.localStorage.getItem('courtwork.onboarding.seen')) {
      setProviderSetupOpen(true);
      return;
    }
    setSettingsSection('model');
    setSettingsAutoCredential(true);
    setSettingsOpen(true);
  };

  const probeCredentials = async (config: ModelConfig = modelConfig) => {
    setCredentialProbed(true);
    const status = await providerConnectionClient.validate(config);
    setCredentialStatus(status);
    return status;
  };

  useEffect(() => {
    const onProbe = () => probeCredentials();
    window.addEventListener('courtwork-credential-probe', onProbe);
    return () => window.removeEventListener('courtwork-credential-probe', onProbe);
  }, [modelConfig]);

  useEffect(() => {
    if (selectedCaseId) window.localStorage.setItem('courtwork.selected-case-id', selectedCaseId);
    else window.localStorage.removeItem('courtwork.selected-case-id');
  }, [selectedCaseId]);

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
    // 五裁②：仅当 handoff 定向到本案时带入 chat 话题，其余一律清空（D-1 隔离不破）
    if (chatHandoff.current?.caseId === selectedCaseId) {
      setLocalMessages(chatHandoff.current.messages);
      chatHandoff.current = null;
    } else {
      setLocalMessages([]);
    }
    setWorkDraftMode(false);
    setFileOpsMode(false);
    // 切案即作废任何在途 replay（防 demo 的 paced 回调污染新案——generation 守卫补齐:
    //  非 demo 案 replay effect 不跑,此处必须主动递增,否则旧回调仍匹配 myGeneration）
    replayGeneration.current += 1;
    // 十四章：demo 案有 artifact 进浏览器态;非 demo 空案停四模块列（大纲引导）
    setPreviewOpen(isDemoCaseId(selectedCaseId));
    setReaderDoc(null);
    previewDismissedContext.current = null;
    manualPreviewSelected.current = false;
    setDraftFrozen(false);
    setDraft(INITIAL_DRAFT);
    setCompileOpen(false);
    setSelectedRiskId('risk-03');
    setSecondaryView(undefined);
    setActiveView('revision');
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
    const replayKey = `${selectedCaseId}:${flow}:${replayEpoch}`;
    if (lastReplayedFlow.current === replayKey) return;
    lastReplayedFlow.current = replayKey;
    const myGeneration = ++replayGeneration.current;
    setLocalMessages([]);
    const context = `${selectedCaseId}:${flow}`;
    let previewOpenedForReplay = false;
    void client.replay(flow, (event) => {
      // 被后续回放取代的陈旧回放：残余事件全部丢弃（不 dispatch、不动自动开卡）。
      if (replayGeneration.current !== myGeneration) return;
      dispatch(event);
      if (event.type !== 'artifact_produced') return;
      setArtifactRevision((revision) => revision + 1);
      const targetView = previewViewForArtifact(event.artifactType);
      if (!targetView || previewOpenedForReplay || previewDismissedContext.current === context || manualPreviewSelected.current) return;
      previewOpenedForReplay = true;
      setActiveView(targetView);
      setPreviewOpen(true);
    }, { paced: true });
  }, [flow, replayEpoch, selectedCaseId]);

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

  const selectedCase = selectedCaseId ? cases.find((item) => item.id === selectedCaseId) : undefined;
  const isWelcome = !selectedCase;
  const isDemoCase = Boolean(selectedCase?.isDemo) || isDemoCaseId(selectedCase?.id);
  const caseRoot = selectedCase ? resolveCaseRoot(selectedCase) : undefined;
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
  // 已处置条目退出批量池：批后计数归零禁钮，且批量永不覆写既有逐条处置（用户修正最高优先级）
  const batchRefs = gate?.items.filter((item) => item.mode === 'batch' && !dispositions[item.itemRef]).map((item) => item.itemRef) ?? [];
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
    // 路由律（批次七④）：案件对象住 work 面——建案即切面选中，chat 内建案不再留在原地
    switchSegment('work');
    return newId;
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

  const exitCompactLeft = () => setLeftCollapsed(false);

  const updateModelConfig = (next: ModelConfig) => {
    setModelConfig(next);
    saveModelConfig(next);
    if (credentialStatus.phase === 'connected') void probeCredentials(next);
  };

  useEffect(() => {
    if (!selectedCaseId) return;
    const saved = window.localStorage.getItem(`courtwork.case-title.${selectedCaseId}`);
    if (saved) setCases((current) => current.map((item) => item.id === selectedCaseId ? { ...item, title: saved } : item));
  }, [selectedCaseId]);

  const commitCaseTitle = () => {
    if (!selectedCaseId) {
      setEditingCaseTitle(false);
      return;
    }
    const title = caseTitleDraft.trim();
    if (title) {
      setCases((current) => current.map((item) => item.id === selectedCaseId ? { ...item, title } : item));
      window.localStorage.setItem(`courtwork.case-title.${selectedCaseId}`, title);
    }
    setEditingCaseTitle(false);
  };

  const openSettings = (section: SettingsSection = 'model') => {
    void probeCredentials();
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
      if (expandedCaseId === selectedCaseId && selectedCase) {
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
  }, [expandedCaseId, selectedCaseId, originalsFocusTick, selectedCase]);

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
    switchSegment('work'); // 路由律（批次七④）：阶段对象住 work 面，chat 内点阶段隐式切面
    if (next !== flow) previewDismissedContext.current = null;
    manualPreviewSelected.current = false;
    setFlow(next);
    setReplayEpoch((epoch) => epoch + 1);
    setActiveView(next === 'S1' ? 'timeline' : 'revision');
    setWorkDraftMode(false);
    setFileOpsMode(false);
    setGate(undefined);
    setExpandedEvidence({});
    setDispositions({});
    setReviewSubmitted(false);
    setContinued(false);
    dispatch({ type: '__clear__' });
    resolvedRequest.current = undefined;
  };

  const choosePrimaryView = (view: WorkbenchView) => {
    if (secondaryView === view && activeView !== view) setSecondaryView(activeView);
    manualPreviewSelected.current = true;
    setActiveView(view);
    if (view !== 'draft') setWorkDraftMode(false);
    setFileOpsMode(false);
    // 切案即作废任何在途 replay（防 demo 的 paced 回调污染新案——generation 守卫补齐:
    //  非 demo 案 replay effect 不跑,此处必须主动递增,否则旧回调仍匹配 myGeneration）
    replayGeneration.current += 1;
    // 十四章：demo 案有 artifact 进浏览器态;非 demo 空案停四模块列（大纲引导）
    setPreviewOpen(isDemoCaseId(selectedCaseId));
    setReaderDoc(null);
    previewDismissedContext.current = null;
  };

  const openWorkDrafts = () => {
    manualPreviewSelected.current = true;
    setWorkDraftMode(true);
    setFileOpsMode(false);
    setActiveView('draft');
    setPreviewOpen(true);
    previewDismissedContext.current = null;
  };

  const openFileOps = () => {
    manualPreviewSelected.current = true;
    setFileOpsMode(true);
    setWorkDraftMode(false);
    setSecondaryView(undefined);
    setPreviewOpen(true);
    previewDismissedContext.current = null;
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
    if (!selectedCase) return emptyWorkbench('选择一个案件后开始工作');
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
        ? <label><span>Compare</span><select aria-label="Comparison view" value={view} onChange={(event) => setSecondaryView(event.target.value as WorkbenchView)}>{VIEWS.map((candidate) => <option value={candidate} key={candidate}>{VIEW_LABELS[candidate]}</option>)}</select></label>
        : <><strong>{VIEW_LABELS[view]}</strong><span>Primary view</span></>}
    </header>
    <div className="pane-content">{renderView(view)}</div>
  </section>;

  const paletteCommands: PaletteCommand[] = [
    ...(isDemoCase
      ? [
          { id: 'scene-s1', section: 'Scenes', label: '整理卷宗', onRun: () => { selectFlow('S1'); setPaletteOpen(false); } },
          { id: 'scene-s3', section: 'Scenes', label: '审查合同', onRun: () => { selectFlow('S3'); setPaletteOpen(false); } },
          { id: 'scene-s6', section: 'Scenes', label: '卷宗整理', onRun: () => { openFileOps(); setPaletteOpen(false); } },
        ]
      : []),
    { id: 'scene-draft', section: 'Scenes', label: '起草答辩状', onRun: () => { setWorkDraftMode(false); setFileOpsMode(false); choosePrimaryView('draft'); setPaletteOpen(false); } },
    ...cases.map((item) => ({
      id: `case-${item.id}`,
      section: 'Cases',
      label: item.archived
        ? `${item.title}（已归档）`
        : item.isDemo || isDemoCaseId(item.id)
          ? `${item.title}（${containerOriginLabel(true)}）`
          : item.title,
      onRun: () => { setSelectedCaseId(item.id); switchSegment('work'); setPaletteOpen(false); }, // 路由律：⌘K 跳案即切面
    })),
    { id: 'action-new-case', section: 'Actions', label: CHROME_COPY.navigation.newCase, onRun: () => { setPaletteOpen(false); setNewCaseOpen(true); } },
    ...(selectedCase ? [{
      id: 'action-archive',
      section: 'Actions',
      label: selectedCase.archived ? '取消归档当前案件' : '归档当前案件',
      onRun: () => { setPaletteOpen(false); setArchiveConfirmCaseId(selectedCase.id); },
    } satisfies PaletteCommand] : []),
    {
      id: 'action-focus',
      section: 'Actions',
      label: focusMode ? 'Exit focus mode' : 'Enter focus mode',
      onRun: () => { setPaletteOpen(false); toggleFocusMode(); },
    },
    {
      id: 'action-output-folder',
      section: 'Actions',
      label: 'Open output folder',
      // F-3 已接通真实 reveal；命令面板走同一路径
      onRun: () => { setPaletteOpen(false); openOutputFolder(); },
    },
    {
      id: 'action-settings',
      section: 'Actions',
      label: 'Settings',
      onRun: () => openSettings('model'),
    },
  ];

  const effectiveLeftCollapsed = leftCollapsed || narrowRailRequired;
  const compactLayout = effectiveLeftCollapsed && !moduleOpen.progress && !moduleOpen['working-folders'] && !moduleOpen.context
    && !moduleOpen.timeline && !moduleOpen.graph && !moduleOpen.matrix && !moduleOpen.revision && !moduleOpen.draft;

  const utilityItems = [
    {
      id: 'progress' as const,
      title: CHROME_COPY.utility.progress,
      count: progressCount,
      status: (isDemoCase ? (progressDone >= progressTotal ? 'done' : 'active') : 'idle') as 'done' | 'active' | 'idle',
      open: moduleOpen.progress,
      onToggle: () => toggleModule('progress'),
      body: <>
        <ul className="progress-module-list" data-testid="progress-module-body-list">
          {session.progress.length === 0 && <li className="wf-empty">{isDemoCase ? 'Waiting for task events…' : 'New case · waiting for a task'}</li>}
          {session.progress.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
        </ul>
        {isDemoCase && usage >= 85 && <button className="continuation-button" data-testid="continuation-button" disabled={continued} onClick={() => void client.continuation.continueSession('demo-s3').then(() => setContinued(true))}>{continued ? '已开启下一阶段' : '继续本案工作'}</button>}
      </>,
    },
    {
      id: 'working-folders' as const,
      title: CHROME_COPY.utility.workingFolders,
      count: isDemoCase ? String(selectedCase?.fileCount ?? 0) : '0',
      status: (isDemoCase ? 'active' : 'idle') as 'active' | 'idle',
      open: moduleOpen['working-folders'],
      onToggle: () => toggleModule('working-folders'),
      body: <WorkingFoldersTree isDemo={isDemoCase} originalCount={selectedCase?.fileCount ?? 0} onFocusOriginals={focusOriginalsZone} onOpenWorkDrafts={openWorkDrafts} onOpenFileOps={openFileOps} workDraftSelected={workDraftMode && activeView === 'draft'} fileOpsSelected={fileOpsMode} />,
    },
    {
      id: 'context' as const,
      title: CHROME_COPY.utility.context,
      count: `${usage}%`,
      status: (usage >= 85 ? 'warn' : 'idle') as 'warn' | 'idle',
      open: moduleOpen.context,
      onToggle: () => toggleModule('context'),
      body: <ContextModuleBody usage={usage} usageDetail={usageDetail} attachmentSources={attachmentSources} modelLabel={modelDisplayName(modelConfig)} modelConnected={credentialStatus.phase === 'connected'} reasoningLabel={modelConfig.reasoning === 'deep' ? CHROME_COPY.composer.deep : CHROME_COPY.composer.standard} onOpenModelConfig={() => setModelConfigOpen(true)} />,
    },
  ];

  /** composer 浮卡（chat/work 共用；onSend 与 workmode=viewSegment 同源由调用方注入）。 */
  const renderComposer = (onSend: (payload: ComposerSendPayload) => void, requestPending = false) => (
    <div className="composer-stack">
      {/* 2026-07-12 修：外卡退役（双层框收一层），框只在 shell 整卡 */}
      <div className="composer-float">
        <Composer
          cases={cases.map((item) => ({ id: item.id, name: item.title, kind: item.kind ?? 'case' }))}
          activeCaseId={selectedCaseId ?? undefined}
          onSend={onSend}
          onContainerize={handleContainerize}
          viewSegment={viewSegment}
          onSegmentChange={switchSegment}
          modelConfig={modelConfig}
          modelConfigOpen={modelConfigOpen}
          connectionPhase={credentialStatus.phase}
          onToggleModelConfig={() => {
            if (credentialStatus.phase === 'connected') setModelConfigOpen((open) => !open);
            else void probeCredentials().then((status) => {
              if (status.phase === 'connected') setModelConfigOpen(true);
              else openCredentialSurface();
            });
          }}
          onModelConfigChange={updateModelConfig}
          onCloseModelConfig={() => setModelConfigOpen(false)}
          requestPending={requestPending}
        />
      </div>
      <p className="composer-disclaimer" data-testid="composer-disclaimer">
        Courtwork is an agent and can make mistakes. Please double-check responses.{' '}
        <a href="mailto:feedback@courtwork.local?subject=Courtwork%20feedback">Give us feedback</a>
      </p>
    </div>
  );

  return (
    <main className="app-shell" data-testid="workbench" data-credential-probed={credentialProbed ? 'true' : 'false'} data-compact={compactLayout ? 'true' : 'false'}>
      <header className="window-chrome" data-testid="window-chrome" data-tauri-drag-region>
        <button
          type="button"
          className="window-chrome-button"
          data-testid="collapse-left-rail"
          aria-label={effectiveLeftCollapsed ? CHROME_COPY.navigation.expandLeft : CHROME_COPY.navigation.collapseLeft}
          title={effectiveLeftCollapsed ? CHROME_COPY.navigation.expandLeft : CHROME_COPY.navigation.collapseLeft}
          onClick={() => effectiveLeftCollapsed ? exitCompactLeft() : setLeftCollapsed(true)}
        ><Icon name="panel-left" /></button>
        <button type="button" className="window-chrome-button" aria-label="Search" title="Search" onClick={() => setPaletteOpen(true)}><Icon name="search" /></button>
        <span className="spacer" />
      </header>
      <div
        className={`workspace ${viewSegment === 'chat' ? 'chat-segment' : ''} ${isWelcome ? 'welcome-mode' : ''} ${comparing ? 'comparing' : ''} ${focusMode ? 'focus-mode' : ''} ${effectiveLeftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''} ${compactLayout ? 'rails-compact' : ''}`}
        data-view-segment={viewSegment}
        data-testid="workspace"
        data-comparing={comparing ? 'true' : 'false'}
        data-focus-mode={focusMode ? 'true' : 'false'}
        data-left-collapsed={effectiveLeftCollapsed ? 'true' : 'false'}
        data-auto-left-collapsed={narrowRailRequired ? 'true' : 'false'}
        data-right-collapsed={rightCollapsed ? 'true' : 'false'}
        data-compact={compactLayout ? 'true' : 'false'}
      >
        {/* chatbot 形态：收敛即撤卡（不留窄条），展开钮驻 chrome 同位——与红绿灯零冲突 */}
        {!focusMode && !effectiveLeftCollapsed && (
          <CaseRail
            cases={cases}
            unfiled={[]}
            pinnedIds={pinnedIds}
            selectedCaseId={selectedCaseId}
            expandedCaseId={expandedCaseId}
            isDemoCase={isDemoCase}
            flow={flow}
            dispositionsCount={Object.keys(dispositions).length}
            caseRoot={caseRoot}
            archiveConfirmCaseId={archiveConfirmCaseId}
            containerizeUnfiledId={containerizeUnfiledId}
            viewSegment={viewSegment}
            onSegmentChange={switchSegment}
            leftCollapsed={effectiveLeftCollapsed}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              // 案件行：选中即展开（含已选中但被收起的情况 → 强制 expandedCaseId=id）
              const kind = cases.find((c) => c.id === id)?.kind ?? 'case';
              if (kind === 'case') setExpandedCaseId(id);
              switchSegment('work'); // 路由律（批次七④）：左栏点案隐式切 work
            }}
            onToggleExpand={(id) => setExpandedCaseId((current) => (current === id ? null : id))}
            onNewCase={() => setNewCaseOpen(true)}
            onOpenArtifacts={openOutputFolder}
            onSelectFlow={selectFlow}
            onArchiveTrigger={setArchiveConfirmCaseId}
            onArchiveConfirm={toggleArchive}
            onArchiveCancel={() => setArchiveConfirmCaseId(null)}
            onRequestContainerizeUnfiled={setContainerizeUnfiledId}
            onConfirmContainerizeUnfiled={confirmContainerizeUnfiled}
            onCancelContainerizeUnfiled={() => setContainerizeUnfiledId(null)}
            onExpandLeft={exitCompactLeft}
            onOpenSettings={() => openSettings('model')} // 五裁③：默认落 Model（最高频入口）
            onFeedback={showSystemFeedback}
          />
        )}

        {/* L0：对话流直接坐页面底色，去卡壳（work 面） */}
        {!focusMode && viewSegment === 'work' && (
          <section className="conversation canvas-layer" data-testid="conversation-canvas">
            {/* ① 案件标题居中栏顶栏、与红绿灯同排（约束于 chat 列，不压 dock）；覆盖 RP-2 #19 */}
            <div className="chat-titlebar" data-testid="chat-titlebar" data-tauri-drag-region>
              {selectedCase && (editingCaseTitle ? <input
                autoFocus
                data-testid="chat-case-title-input"
                value={caseTitleDraft}
                onChange={(event) => setCaseTitleDraft(event.target.value)}
                onBlur={commitCaseTitle}
                onKeyDown={(event) => { if (event.key === 'Enter') commitCaseTitle(); if (event.key === 'Escape') setEditingCaseTitle(false); }}
              /> : <span data-testid="titlebar-case-title"><button type="button" className="chat-case-title" data-testid="chat-case-title" title="双击编辑案件名称" onDoubleClick={() => { setCaseTitleDraft(selectedCase.title); setEditingCaseTitle(true); }}>
                {selectedCase.title}
              </button></span>)}
              {isDemoCase && <span className="demo-badge" data-testid="demo-case-badge">{containerOriginLabel(true)}</span>}
              {selectedCase && <span className="stage-chip" data-testid="toolbar-stage">{stageLabel(flow, isDemoCase)}</span>}
              {isWelcome && <strong className="welcome-head-label">{CHROME_COPY.welcome.eyebrow}</strong>}
            </div>
            <header className="chat-case-head" data-testid="chat-case-head">
              <span className="spacer" />
            </header>
            {systemFeedback && <span className={`system-feedback chat-feedback ${systemFeedback.ok ? 'ok' : 'error'}`} role="status" data-testid="system-open-feedback">{systemFeedback.message}</span>}
            <div className="conversation-scroll" ref={workFollow.ref} onScroll={workFollow.onScroll}>
              {/* RP-2.12 待机主屏（Cowork 复刻）：品牌 icon + slogan（非卡）→ 居中 composer → 建议行 */}
              {isWelcome && (
                <section className="welcome-home" data-testid="welcome-state">
                  <div className="welcome-brand">
                    <h1 className="welcome-slogan">{CHROME_COPY.welcome.slogan}</h1>
                  </div>
                  {renderComposer(handleComposerSend)}
                  <div className="welcome-ideas" data-testid="welcome-continuations">
                    <span className="welcome-ideas-label">{CHROME_COPY.welcome.ideasLabel}</span>
                    <button type="button" className="welcome-idea-row welcome-demo-start" data-testid="welcome-demo-start" onClick={() => setProviderSetupOpen(true)}>
                      <span className="welcome-idea-icon"><Icon name="panels-top-left" /></span>
                      <span>{CHROME_COPY.welcome.sample}</span>
                    </button>
                    <button type="button" className="welcome-idea-row" onClick={() => { setSelectedCaseId(DEMO_CASE_ID); setExpandedCaseId(DEMO_CASE_ID); setSampleTourOpen(true); }}>
                      <span className="welcome-idea-icon"><Icon name="folder-open" /></span>
                      <span className="welcome-idea-main"><strong>{DEMO_CASE.title}</strong><small>合同审查 · 6 项待办</small></span>
                    </button>
                  </div>
                </section>
              )}
              {!isWelcome && !isDemoCase && selectedCase && (
                <div className="empty-state" role="status" data-testid="conversation-empty">
                  {selectedCase.title} 刚建立，尚无对话记录 · 从场景按钮开始
                </div>
              )}
              {isDemoCase && (
                <>
                  {sampleTourOpen && <div className="sample-tour" data-testid="sample-tour"><strong>样板案导览</strong><span>从左栏阶段进入卷宗，再在右侧核对结构化工作面。</span><button type="button" onClick={() => setSampleTourOpen(false)}>知道了</button></div>}
                  <div className="user-message">
                    <CollapsibleMessage lines={6}>{flow === 'S1'
                      ? '整理全套卷宗，标出事件矛盾并核对当事人关系。'
                      : '审查这份设备采购合同，重点看付款、验收与违约责任。'}</CollapsibleMessage>
                  </div>
                  <article className="assistant-turn" data-testid="assistant-turn-demo">
                    <ToolCallRow
                      label="Ran command"
                      tool={flow === 'S3' ? 'review-contract' : 'organize-dossier'}
                      args={flow === 'S3' ? 'case=demo-linjiang scope=payment,acceptance,breach' : 'case=demo-linjiang corpus=20'}
                      result={flow === 'S3' ? 'risk-list=6 output=contract-review.docx' : 'timeline=47 parties=14 conflicts=4'}
                    />
                    <div className="turn-event-stream" data-testid="event-stream">
                      <TurnCard kind="event" icon="chevron-right" eyebrow={flow === 'S1' ? 'D20' : 'D04'} title={flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'} status="success" testId="turn-event-start" />
                      {session.progress.map((message, index) => (
                        <TurnCard key={`${message}-${index}`} kind="event" icon="chevron-right" eyebrow={String(index + 1).padStart(2, '0')} title={message} status={session.confirmation ? 'success' : 'active'} testId={`turn-event-progress-${index}`} />
                      ))}
                      <TurnCard kind="event" icon="chevron-right" eyebrow="完成" title={flow === 'S3' ? '审阅提示已送达右侧工作面' : '事件与主体关系已完成交叉核对'} status="success" testId="turn-event-finish" />
                    </div>
                    <TurnCard
                      kind="artifact"
                      icon="package"
                      eyebrow={flow === 'S3' ? 'R' : 'E'}
                      title={flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}
                      summary={flow === 'S3' ? '6 项 · 打开修订预览' : '47 个事件 · 14 个主体 · 打开时间线'}
                      routeLabel={flow === 'S3' ? '打开修订预览' : '打开时间线'}
                      onOpen={() => {
                        previewDismissedContext.current = null;
                        setActiveView(flow === 'S3' ? 'revision' : 'timeline');
                        setPreviewOpen(true);
                      }}
                      copyText={`${flow === 'S3' ? 'R' : 'E'}\n${flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}\n${flow === 'S3' ? '6 项 · 打开修订预览' : '47 个事件 · 14 个主体 · 打开时间线'}`}
                    />
                    {flow === 'S3' && (
                      <TurnCard
                        kind="file"
                        icon="file-text"
                        eyebrow="W"
                        title="合同审查报告.docx"
                        summary="已写入本案「产出」目录"
                        testId="output-docx-card"
                        routeLabel="打开合同审查报告"
                        onOpen={openOutputDocx}
                        actions={<>
                          <button type="button" className="quiet-button" data-testid="reveal-output-docx" onClick={revealOutputDocx}>在访达中显示</button>
                          <button type="button" className="primary-button" data-testid="open-output-docx" onClick={openOutputDocx}>打开文件</button>
                        </>}
                      />
                    )}
                    {session.confirmation && (
                      <TurnCard
                        kind="gate"
                        icon="briefcase-business"
                        eyebrow="Gate"
                        title={session.confirmation.gateLabel}
                        summary="需要确认 · 打开右侧工作面"
                        onOpen={() => {
                          previewDismissedContext.current = null;
                          setActiveView(flow === 'S3' ? 'revision' : 'timeline');
                          setPreviewOpen(true);
                        }}
                      />
                    )}
                    {session.confirmation && (
                      <QuestionTurnCard
                        question="是否继续聚焦付款与验收条款？"
                        options={[
                          { value: 'focus-payment-acceptance', label: '继续聚焦' },
                          { value: 'open-full-review', label: '查看全部风险' },
                        ]}
                      />
                    )}
                    <MessageActions messageId="assistant-demo" text={flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'} createdAt={assistantCreatedAt.current} />
                    {/* #26.2：推理指示锚居 turn 尾、message 按钮排之下 */}
                    <ThinkingStream
                      state={session.progress.length === 0 ? 'empty' : session.confirmation ? 'settled' : 'thinking'}
                      content={session.progress.join('；') || '已梳理请求目标、材料范围与下一步工作面。'}
                    />
                  </article>
                </>
              )}
              {localMessages.map((message, index) => (
                <div className="user-message" key={`local-${index}`} data-testid="local-user-message">
                  {message.text && <CollapsibleMessage lines={6}>{message.text}</CollapsibleMessage>}
                  {message.pasteBlocks?.map((block, blockIndex) => <PasteBlock key={blockIndex} text={block} />)}
                  {message.files.length > 0 && (
                    <div className="user-message-attachments">
                      {message.files.map((name) => (
                        <span key={name} title={name}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  <MessageActions messageId={`local-${index}`} text={message.text} createdAt={message.createdAt} />
                </div>
              ))}
              {queuedMessages.filter((message) => message.caseId === selectedCaseId).map((message) => <div className="queued-message" data-testid="queued-message" key={message.id}>
                <span className="queued-chip">Queued</span><span>{message.text}</span>
                <button type="button" onClick={() => setQueuedMessages((current) => current.filter((item) => item.caseId !== selectedCaseId || item.id !== message.id))}>撤回</button>
                <button type="button" disabled title="停止当前请求将在执行器接线后启用">停止当前</button>
              </div>)}
              <ScrollToLatest follow={workFollow} />
            </div>
            {!isWelcome && <div className="scene-strip" data-testid="scene-strip">
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
              <div className="scene-more-wrap" ref={sceneMoreRef}>
                <button type="button" data-testid="scene-more" aria-expanded={sceneMoreOpen} onClick={() => setSceneMoreOpen((open) => !open)}>更多</button>
                {sceneMoreOpen && <div className="scene-more-popover surface-card" data-testid="scene-more-popover">
                  {isDemoCase && <button type="button" className="scene-more-narrow-only" onClick={() => { openFileOps(); setSceneMoreOpen(false); }}>卷宗整理</button>}
                  <button type="button" onClick={() => { setWorkDraftMode(false); setFileOpsMode(false); choosePrimaryView('draft'); setSceneMoreOpen(false); }}>起草答辩状</button>
                </div>}
              </div>
            </div>}
            {/* L1：composer 浮卡（welcome 态 composer 已居中于 welcome-home,不重复渲染） */}
            {!isWelcome && renderComposer(handleComposerSend)}
          </section>
        )}

        {/* RP-2.11 chat 面：内存态轻画布（composer + 会话 + 存入桥接容器化仪式） */}
        {!focusMode && viewSegment === 'chat' && (
          <section className="conversation canvas-layer" data-testid="chat-canvas" data-segment="chat">
            <div className="chat-titlebar" data-tauri-drag-region>
              <strong className="chat-titlebar-label">{CHROME_COPY.segment.chat}</strong>
            </div>
            <header className="chat-case-head chat-mode-head" data-testid="chat-mode-head">
              <span className="spacer" />
              {chatMessages.length > 0 && (
                <div className="store-chat-wrap" ref={storeChatRef}>
                  <button type="button" className="quiet-button" data-testid="store-chat" aria-expanded={storeChatOpen} onClick={() => setStoreChatOpen((open) => !open)}>
                    {CHROME_COPY.storeChat.action}
                  </button>
                  {storeChatOpen && (
                    <div className="scope-popover containerize-popover store-chat-popover" role="dialog" aria-label={CHROME_COPY.storeChat.title} data-testid="store-chat-popover">
                      <strong>{CHROME_COPY.storeChat.title}</strong>
                      <p>{CHROME_COPY.storeChat.body}</p>
                      <div className="scope-popover-actions">
                        <button type="button" className="quiet-button" onClick={() => setStoreChatOpen(false)}>{CONTAINERIZE_COPY.cancel}</button>
                        <button type="button" className="quiet-button" data-testid="store-chat-workspace" onClick={() => storeChatIntoContainer('workspace')}>{CONTAINERIZE_COPY.createWorkspace}</button>
                        <button type="button" className="primary-button" data-testid="store-chat-case" onClick={() => storeChatIntoContainer('case')}>{CONTAINERIZE_COPY.createCase}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </header>
            <div className="conversation-scroll" data-testid="chat-scroll" ref={chatFollow.ref} onScroll={chatFollow.onScroll}>
              {chatMessages.length === 0 ? (
                <div className="empty-state" role="status" data-testid="chat-empty">{CHROME_COPY.welcome.body}</div>
              ) : chatMessages.map((message, index) => (
                message.role === 'user' ? (
                  <div className="user-message" key={`chat-${index}`} data-testid="chat-user-message">
                    {message.text && <CollapsibleMessage lines={6}>{message.text}</CollapsibleMessage>}
                    {message.pasteBlocks?.map((block, blockIndex) => <PasteBlock key={blockIndex} text={block} />)}
                    {message.files.length > 0 && (
                      <div className="user-message-attachments">
                        {message.files.map((name) => <span key={name} title={name}>{name}</span>)}
                      </div>
                    )}
                    <MessageActions messageId={`chat-${index}`} text={message.text} createdAt={message.createdAt} />
                  </div>
                ) : (
                  /* agent 直排无气泡（ch12）；失败轮 = 分型文案 + 语义角标，不假装成功 */
                  <div className={`assistant-message${message.failed ? ' is-failed' : ''}`} key={`chat-${index}`} data-testid={message.failed ? 'chat-assistant-failed' : 'chat-assistant-message'}>
                    {message.reasoning && (
                      <details className="chat-reasoning" data-testid="chat-reasoning">
                        <summary>思考过程</summary>
                        <CollapsibleMessage lines={12}><ChatMarkdown text={message.reasoning} /></CollapsibleMessage>
                      </details>
                    )}
                    {message.revealing ? (
                      <Typewriter text={message.text} onDone={() => setChatMessages((prev) => prev.map((m, i) => (i === index ? { ...m, revealing: false } : m)))} />
                    ) : (
                      <CollapsibleMessage lines={12}><ChatMarkdown text={message.text} /></CollapsibleMessage>
                    )}
                    {!message.failed && <MessageActions messageId={`chat-${index}`} text={message.text} createdAt={message.createdAt} />}
                  </div>
                )
              ))}
              {chatPending && (
                <div className="chat-pending" role="status" data-testid="chat-pending">
                  <BrandThinking />
                </div>
              )}
              <ScrollToLatest follow={chatFollow} />
            </div>
            {renderComposer(handleChatSend, chatPending)}
          </section>
        )}

        {/* RP-2.5：通用能力栏与 Preview 双宿主；renderer 按声明挂载（work 面独有） */}
        {/* 收敛/展开钮驻缝（2026-07-12 拍板）：chat|right 过渡带顶部，两态同位守恒 */}
        {viewSegment === 'work' && !isWelcome && (rightCollapsed ? <aside className="right-rail-collapsed surface-float" data-testid="right-module-stack">
          <button type="button" className="rail-seam-toggle" data-testid="expand-right-rail" aria-label="Expand inspector" title="Expand inspector" onClick={() => setRightCollapsed(false)}><Icon name="panel-right" /></button>
        </aside> : <section className="right-workbench" data-testid="right-module-stack" data-preview-open="true" data-artifact-revision={artifactRevision}>
          {/* 批次七 #4：Focus 态藏收敛钮——布局位移后残留半角仍可点中,收起即主区全空白 */}
          {!focusMode && <button type="button" className="rail-seam-toggle" data-testid="collapse-right-rail" aria-label="Collapse inspector" title="Collapse inspector" onClick={() => setRightCollapsed(true)}><Icon name="panel-right" /></button>}
          {/* 十四章（2026-07-12 拍板）：四模块序 Progress→Preview→Working folders→Context;
              Preview 双态——大纲目录 ↔ 浏览器态（右列唯一,title/tab 条/schema 面三层封闭,back 回目录） */}
          {!previewOpen && <RightRailModules
            modules={utilityItems}
            outline={VIEWS.map((view) => ({ id: view, label: VIEW_LABELS[view], meta: viewCount(view, draftFrozen, isDemoCase) }))}
            previewOpenState={outlineOpen}
            onPreviewToggle={() => setOutlineOpen((open) => !open)}
            onOpenOutline={(viewId) => {
              setReaderDoc(null);
              previewDismissedContext.current = null;
              manualPreviewSelected.current = true;
              choosePrimaryView(viewId as WorkbenchView);
              setPreviewOpen(true);
            }}
            readerEntries={[
              { name: '设备采购合同', onOpen: () => { previewDismissedContext.current = null; manualPreviewSelected.current = true; setReaderDoc({ name: '设备采购合同', markdown: contractSourceMd }); setPreviewOpen(true); } },
              { name: '催告函', disabled: true },
              { name: '验收记录扫描件', disabled: true },
            ]}
          />}
          {previewOpen && <WorkbenchPreviewRenderer
            onBack={() => { previewDismissedContext.current = `${selectedCaseId}:${flow ?? 'none'}`; setPreviewOpen(false); setReaderDoc(null); }}
            title={readerDoc ? readerDoc.name : comparing ? '工作面对照' : VIEW_LABELS[activeView]}
            meta={readerDoc ? '原件 · 只读' : comparing ? '双面' : viewCount(activeView, draftFrozen, isDemoCase)}
            tabs={VIEWS.map((view) => ({ id: view, label: VIEW_LABELS[view] }))}
            activeTab={readerDoc ? '' : activeView}
            onSelectTab={(id) => {
              const view = id as WorkbenchView;
              setReaderDoc(null);
              choosePrimaryView(view);
              const moduleId = view as ModuleId;
              if (userModuleOverride[moduleId] === undefined) setModuleOpen((prev) => ({ ...prev, [moduleId]: true }));
            }}

            actions={<>
                {!focusMode && !comparing && (
                  <button className="view-action" onClick={startComparison} data-testid="split-start" title="Compare views">
                    <Icon name="rows-two" /><span>Compare</span>
                  </button>
                )}
                {!focusMode && comparing && (
                  <>
                    <button
                      type="button"
                      className={`icon-button ${splitDirection === 'rows' ? 'active' : ''}`}
                      aria-label="Stacked comparison"
                      title="Stacked comparison"
                      aria-pressed={splitDirection === 'rows'}
                      onClick={() => setSplitDirection('rows')}
                    >
                      <Icon name="rows-two" />
                    </button>
                    <button
                      type="button"
                      className={`icon-button ${splitDirection === 'columns' ? 'active' : ''}`}
                      aria-label="Side-by-side comparison"
                      title={wideSplitAvailable ? 'Side-by-side comparison' : 'Available at 1600px and above'}
                      aria-pressed={splitDirection === 'columns'}
                      disabled={!wideSplitAvailable}
                      onClick={() => setSplitDirection('columns')}
                    >
                      <Icon name="columns-two" />
                    </button>
                    <button className="view-action" onClick={resetComparison} data-testid="split-reset" title="Reset comparison">
                      <Icon name="rotate-counter-clockwise" /><span>Reset</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="view-action"
                  onClick={toggleFocusMode}
                  data-testid="focus-toggle"
                  aria-pressed={focusMode}
                  title={focusMode ? 'Exit focus mode' : 'Focus mode · single full-window view'}
                >
                  <FocusGlyph />
                  <span>{focusMode ? 'Exit focus' : 'Focus'}</span>
                  {focusMode && <kbd>Esc</kbd>}
                </button>
              </>}
          >
              <div className="view-content">
                {readerDoc ? (
                  <div className="reader-pane" data-testid="reader-pane">
                    {readerDoc.markdown.split('\n').map((line, index) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      if (trimmed.startsWith('#')) return <h3 key={index}>{trimmed.replace(/^#+\s*/, '')}</h3>;
                      // 语料 md 行内语法仅 **强调** 一种（阅读视图管线约定）；星号字面漏出即渲染缺陷
                      const parts = trimmed.split(/\*\*([^*]+)\*\*/g);
                      return <p key={index}>{parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}</p>;
                    })}
                  </div>
                ) : secondaryView ? (
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
        </section>)}
      </div>

      {compileOpen && <div className="modal-backdrop" role="presentation"><section className="compile-dialog" role="dialog" aria-modal="true" aria-labelledby="compile-title"><h2 id="compile-title">编译为 Word 文档</h2><p>定稿后，本画布将转为只读存档。后续修改将在文书修订中逐条处理，无法返回起草状态。</p><div><button className="quiet-button" onClick={() => setCompileOpen(false)}>取消</button><button className="primary-button" onClick={() => { setDraftFrozen(true); setCompileOpen(false); }}>确认定稿并编译</button></div></section></div>}

      <ProviderSetup
        open={providerSetupOpen}
        allowSkip={credentialStatus.phase !== 'connected'}
        onClose={() => setProviderSetupOpen(false)}
        onStatusChange={setCredentialStatus}
        modelConfig={modelConfig}
        onModelConfigChange={updateModelConfig}
        onSkip={() => {
          window.localStorage.setItem('courtwork.onboarding.seen', 'true');
          setProviderSetupOpen(false);
          setSelectedCaseId(DEMO_CASE_ID);
          setExpandedCaseId(DEMO_CASE_ID);
          setSampleTourOpen(true);
        }}
      />
      <NewCaseDialog open={newCaseOpen} onClose={() => setNewCaseOpen(false)} onCreate={createCase} />
      <CommandPalette open={paletteOpen} commands={paletteCommands} onClose={() => setPaletteOpen(false)} />
      <SettingsPage
        open={settingsOpen}
        section={settingsSection}
        onSectionChange={setSettingsSection}
        onClose={() => setSettingsOpen(false)}
        credentialStatus={credentialStatus}
        onCredentialStatusChange={setCredentialStatus}
        autoOpenCredentials={settingsAutoCredential}
        onAutoOpenConsumed={() => setSettingsAutoCredential(false)}
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
