import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import type { PartyGraph, ReviewMatrix, RiskList, Timeline } from '@courtwork/legal';
import { ProviderSetup } from './credentials/ProviderSetup';
import {
  credentialClient,
  type CredentialStatus,
} from './credentials/client';
import {
  LEGAL_DEMO_INTERACTION_TURN_ID,
  ensureLegalDemoInteraction,
  resolveLegalDemoSource,
} from './demo/legal-interaction';
import {
  EMPTY_SESSION,
  projectSession,
  type ReviewDispositionState,
  type ReviewGateProjection,
  type ScenarioFlow,
  type SessionProjection,
  type WorkProjectionPhase,
  type WorkProjectionPort,
} from './protocol/client';
import type { DemoWorkFixtureAdapter } from './protocol/demo-fixture';
import { replayWorkProjection } from './protocol/work-replay';
import { bindDocxSourceMarkdown, projectRiskListGate } from './work/legal-s3-binding';
import type { LegalS3WorkCommand } from './work/work-command';
import { clearWorkSession, persistWorkSession, readWorkSession, type WorkSessionRecord } from './work/work-session-store';
import { projectPersistableCases, readCaseList, writeCaseList } from './case/case-store';
import type { SessionEvent } from '@courtwork/core';
import type { InteractionAnswer, TurnReplay } from '@courtwork/core/turn-protocol';
import type { ProviderTransport } from '@courtwork/provider/types';
import type { PackageRegistries } from '@courtwork/registry';
import { buildReviewResolution } from './protocol/review-resolution';
import { Composer, CONTAINERIZE_COPY, type ComposerSendPayload, type ContainerizeRequest } from './composer';
import { assembleRequestContent } from './composer/process-upload';
import {
  caseOutputDir,
  caseOutputDocx,
  createDemoCaseSummary,
  DEMO_CASE_ID,
  isDemoCaseId,
  resolveCaseBinding,
  stageLabel,
  type CaseBinding,
} from './case/case-scope';
import { containerOriginLabel, type ContainerKind } from './case/container-copy';
import type { MaterialStore } from './material/material-store';
import { sha256Hex } from './material/sha256';
import { MATERIAL_BLOCK_REASON_COPY, type StoredMaterial } from './material/material-ref';
import { CHROME_COPY } from './chrome/copy';
import { WindowChrome } from './chrome/WindowChrome';
import { InteractionTurnCard, ToolCallRow, TurnCard, interactionViewFromReplay } from './chat/TurnCard';
import { CollapsibleMessage } from './chat/CollapsibleMessage';
import { formatUsageMetering } from './provider/usage-metering';
import { NewCaseDialog } from './case/NewCaseDialog';
import type { CaseSummary } from './case/types';
import { CommandPalette, type PaletteCommand } from './command-palette/CommandPalette';
import {
  applyModuleAutoExpand,
  DEFAULT_MODULE_OPEN,
  progressHeadCount,
  toggleModuleManual,
  type ModuleId,
  type ModuleOpenMap,
  type UserModuleOverride,
} from './modules/module-stack';
import { ContextModuleBody, WorkingFoldersTree } from './modules/ModuleStack';
import { WorkbenchPreviewRenderer } from './preview/renderers/WorkbenchPreviewRenderer';
import { ArtifactHostView, resolveHostArtifact } from './preview/ArtifactHostView';
import type { HostRendererRegistry } from './preview/HostRendererRegistry';
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
import { hostAuthReasonCopy, type HostAuthPort } from './host/host-auth-port';
import { LEGACY_CASE_SCENARIO_COPY, isWorkSafeCaseId, mintCaseId } from './case/case-id';
import { workContextSegmentFor } from './work/work-context';
import { workFailureDisplayCopy } from './work/work-failure-copy';
import { readStreamEvidence } from '@courtwork/provider/evidence';
import { FileOpsPlanPanel } from './system/FileOpsPlanPanel';
import { systemOpenClient } from './system/system-open-client';
import { WorkDraftPanel } from './system/WorkDraftPanel';
// CASE-ROOT-1：样板案的虚拟根仅供 demo 呈现（原件区/工作稿/在访达显示，皆浏览器 mock），
// 非 wire 字段、非真实授权路径；真实案件根一律经 grantId 在宿主侧解析，不入 renderer。
import { DEMO_CASE_ROOT } from './system/demo-case-layout';
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
import { MessageActions } from './chat/MessageActions';
import { sendChatTurn } from './provider/chat-client';
import {
  TurnProtocolClient,
  createLocalStorageTurnJournalBackend,
  workTurnJournalStorageKey,
  type TurnProjection,
} from './provider/turn-protocol-client';
import { ProcessTrace } from './chat/ProcessTrace';
import { processTraceFromTurn, processTraceFromWorkProjection } from './chat/process-trace-projection';
import { RightRailModules } from './rail/RightRailModules';
import { PasteBlock } from './chat/PasteBlock';
import { ChatMarkdown } from './chat/ChatMarkdown';
import { ScrollToLatest, useFollowScroll } from './chat/follow-scroll';
import { continuationHistory } from './chat/session-window';
import { SessionHistory } from './chat/SessionHistory';
import { readTranscriptSessions, type TranscriptSession } from './chat/session-transcript';
import { appendDistilled, distillMemory, memorySegmentFor } from './chat/chat-memory';
// 装配点例外（demo/ 同列先例）：原件阅读 fixture 直取 demo-data 文书 md
import contractSourceMd from '../../../packages/demo-data/data/dossier/04-设备采购合同.md?raw';
import { useDismissOnOutside } from './hooks/useDismissOnOutside';
import { createReviewTelemetryEmitter } from './telemetry/review-telemetry';
import { compileDraftToDocx } from '@courtwork/output';
import { caseOutputClient } from './output/case-output-client';
import { compileConfirmedReviewToDocx, type PendingRevisionConfirmation } from './output/compile-review-output';

const GraphPanel = lazy(() => import('./workbench/GraphPanel'));

type WorkbenchView = 'timeline' | 'graph' | 'matrix' | 'revision' | 'draft' | 'artifact';

interface ReaderDocument {
  name: string;
  markdown: string;
  focusAnchor?: ReturnType<typeof resolveLegalDemoSource>['focusAnchor'];
}

type ChatMessage =
  | {
      role: 'user';
      /** 展示气泡文本（用户原文，可空）；附件与粘贴块另由 chip / PasteBlock 呈现。 */
      text: string;
      /** 送入模型的正文（text + 就绪附件 readingMarkdown + 粘贴块，逐字）；亦作多轮 history 的用户内容。 */
      content: string;
      files: string[];
      pasteBlocks?: string[];
      createdAt: number;
    }
  | {
      role: 'assistant';
      text: string;
      files: [];
      createdAt: number;
      turn: TurnProjection;
    };

const CONTRACT_OUTPUT_FILE = '合同审查报告.docx';
const DRAFT_OUTPUT_FILE = '答辩意见.docx';

const VIEW_LABELS: Record<WorkbenchView, string> = {
  timeline: '时间线',
  graph: '关系图谱',
  matrix: '矩阵审阅',
  revision: '修订预览',
  draft: '起草画布',
  artifact: '结构化产出',
};

const VIEWS = Object.keys(VIEW_LABELS) as WorkbenchView[];
function visibleViews(hasArtifactView: boolean): WorkbenchView[] {
  return hasArtifactView ? VIEWS : VIEWS.filter((view) => view !== 'artifact');
}

function previewViewForArtifact(
  artifactType: string,
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
): WorkbenchView | undefined {
  const resolved = resolveHostArtifact(artifactType, packageRegistries, hostRenderers);
  if (resolved.status === 'unsupported') return 'artifact';
  if (resolved.renderer.kind === 'passive' || !resolved.renderer.autoOpen) return undefined;
  return resolved.renderer.view;
}

function moduleTargetForArtifact(
  artifactType: string,
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
): ModuleId | undefined {
  const resolved = resolveHostArtifact(artifactType, packageRegistries, hostRenderers);
  return resolved.status === 'ready' ? resolved.renderer.moduleTarget : undefined;
}

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

function renderReaderInline(text: string, focusQuote?: string, focusRef?: RefObject<HTMLElement | null>) {
  return text.split(/\*\*([^*]+)\*\*/g).map((part, index) => {
    const quoteAt = focusQuote ? part.indexOf(focusQuote) : -1;
    const content = quoteAt >= 0 && focusQuote ? (
      <>
        {part.slice(0, quoteAt)}
        <mark
          ref={focusRef}
          tabIndex={-1}
          className="reader-focus-anchor"
          data-testid="reader-focus-anchor"
        >
          {focusQuote}
        </mark>
        {part.slice(quoteAt + focusQuote.length)}
      </>
    ) : part;
    return index % 2 === 1 ? <strong key={index}>{content}</strong> : <span key={index}>{content}</span>;
  });
}

function ChatAssistantMessage({ message, index, latest, onStop, onRetry, testIdPrefix = 'chat' }: {
  message: Extract<ChatMessage, { role: 'assistant' }>;
  index: number;
  /** PILOT-LIVE-2 E：最新回复默认全文展开（折叠仅限历史轮次）；推理轨迹折叠不随此豁免（辅助信息）。 */
  latest?: boolean;
  onStop?: () => void;
  onRetry?: () => void;
  testIdPrefix?: 'chat' | 'work-chat';
}) {
  const { turn } = message;
  const terminal = turn.status === 'completed' || turn.status === 'failed';
  return (
    <div
      className={`assistant-message${turn.status === 'failed' ? ' is-failed' : ''}`}
      data-testid={turn.status === 'failed' ? `${testIdPrefix}-assistant-failed` : `${testIdPrefix}-assistant-message`}
      data-turn-id={turn.turnId}
      data-status={turn.status}
    >
      <ProcessTrace
        view={processTraceFromTurn(turn)}
        actions={onStop && (
          <button type="button" className="quiet-button chat-stop" data-testid="chat-stop" onClick={onStop}>Stop</button>
        )}
        renderContent={(content) => turn.status === 'running'
          ? <div className="chat-reasoning-stream">{content}</div>
          : <CollapsibleMessage lines={12}><ChatMarkdown text={content} /></CollapsibleMessage>}
      />
      {turn.assistantMessage && (turn.status === 'running' ? (
        <div className="chat-stream-content" data-testid="chat-stream-content">{turn.assistantMessage}</div>
      ) : latest ? (
        <ChatMarkdown text={turn.assistantMessage} />
      ) : (
        <CollapsibleMessage lines={12}><ChatMarkdown text={turn.assistantMessage} /></CollapsibleMessage>
      ))}
      {turn.status === 'failed' && (
        <>
          <p className="chat-turn-failure" role="alert" data-testid="chat-turn-failure">
            {turn.failure?.kind === 'canceled' ? '已停止' : turn.failure?.message}
          </p>
          {onRetry && (
            <button type="button" className="quiet-button chat-retry" data-testid="chat-retry" onClick={onRetry}>
              <Icon name="rotate-clockwise" scope="turn" />Retry
            </button>
          )}
        </>
      )}
      {terminal && turn.usage && (
        <p className="chat-turn-usage" data-testid="chat-turn-usage">
          {formatUsageMetering(turn.usage)}
        </p>
      )}
      {turn.status === 'completed' && (
        <MessageActions messageId={`${testIdPrefix}-${index}`} text={turn.assistantMessage} createdAt={message.createdAt} />
      )}
    </div>
  );
}

const DEMO_CASE = createDemoCaseSummary();

/**
 * CASE-PERSIST-1：从持久层水合非 demo 案件列表（fail-closed：不可读 → 空列表）。demo 恒挂案由 App 固定注入
 * DEMO_CASE，永不入持久。fileCount 是 MaterialStore 派生（选中案时 listForCase 复算），不入持久以免第二真源漂移。
 */
function hydratePersistedCases(): CaseSummary[] {
  return readCaseList().map((record) => ({
    id: record.id,
    title: record.title,
    grantId: record.grantId,
    label: record.label,
    kind: record.kind,
    fileCount: 0,
    archived: false,
    isDemo: false,
  }));
}

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

export interface AppProps {
  providerTransport?: ProviderTransport;
  packageRegistries: PackageRegistries;
  hostRenderers: HostRendererRegistry;
  workProjection: WorkProjectionPort;
  workFixture: DemoWorkFixtureAdapter;
  /** WORK-LIVE-1：production Work 命令端口（进程内 callback）。非 demo（grant）案的 run/resume/cancel/replay 走此。 */
  workCommand: LegalS3WorkCommand;
  hostAuth: HostAuthPort;
  materialStore: MaterialStore;
}

export function App({ providerTransport, packageRegistries, hostRenderers, workProjection, workFixture, workCommand, hostAuth, materialStore }: AppProps) {
  const initialCaseId = useRef(storedCaseId());
  /** 案件域：仅 demo 容器有 flow；非 demo 为 null（D-1 容器隔离） */
  const [flow, setFlow] = useState<ScenarioFlow | null>(() => isDemoCaseId(initialCaseId.current) ? 'S3' : null);
  const [session, dispatch] = useReducer(reduceSession, EMPTY_SESSION);
  const [workPhase, setWorkPhase] = useState<WorkProjectionPhase>();
  const [activeView, setActiveView] = useState<WorkbenchView>('revision');
  const [activeArtifactType, setActiveArtifactType] = useState<string>();
  const [secondaryView, setSecondaryView] = useState<WorkbenchView>();
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('rows');
  const [splitRatio, setSplitRatio] = useState(50);
  const [gate, setGate] = useState<ReviewGateProjection>();
  // WORK-LIVE-1：非 demo（grant）案的 production Work 会话态。demo 案走 fixture，二者物理隔离。
  const [workSessionId, setWorkSessionId] = useState<string | null>(null);
  const [workRunning, setWorkRunning] = useState(false);
  // WORK-LIVE-REPLAY-1：本案是否有持久的可恢复 Work 会话指针（切案/重启后 workSessionId 清空，据此重现恢复入口）。
  const [recoverableSession, setRecoverableSession] = useState<WorkSessionRecord | null>(null);
  // CASE-PERSIST-1：宿主实际持有的授权集（跨重启后交叉核对持久案件的 grantId 是否仍有效）；null=尚未核对完成。
  const [knownGrantIds, setKnownGrantIds] = useState<ReadonlySet<string> | null>(null);
  const [workSubject, setWorkSubject] = useState('');
  const [workContractMaterialId, setWorkContractMaterialId] = useState<string | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState('risk-03');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [dispositions, setDispositions] = useState<Record<string, ReviewDispositionState>>({});
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [continued, setContinued] = useState(false);
  const [compileOpen, setCompileOpen] = useState(false);
  const [compilePending, setCompilePending] = useState(false);
  const [draftOutputExists, setDraftOutputExists] = useState(false);
  const [contractOutputExists, setContractOutputExists] = useState(false);
  // OUTPUT-CONFIRM-UI-1：未能落到文书上的修订，逐条待用户确认后才落盘。
  const [nonAppliedPending, setNonAppliedPending] = useState<PendingRevisionConfirmation[]>([]);
  const [confirmedNonAppliedIds, setConfirmedNonAppliedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<DraftDocument>(INITIAL_DRAFT);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>({ credential: { phase: 'absent' }, connection: { phase: 'unverified' } });
  const [credentialProbed, setCredentialProbed] = useState(false);
  const [providerSetupOpen, setProviderSetupOpen] = useState(false);
  const [sampleTourOpen, setSampleTourOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Array<{ text: string; files: string[]; pasteBlocks: string[]; createdAt: number }>>([]);
  // CASE-PERSIST-1：demo 恒挂案固定注入，其后水合持久的非 demo 案件列表（重载后 grant 案回侧栏）。
  const [cases, setCases] = useState<CaseSummary[]>(() => [DEMO_CASE, ...hydratePersistedCases()]);
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
  // tone='info'：中性「未就绪/冲突」反馈（rejected 命令，非错误红条，voice.md §6）；缺省由 ok 映射 ok/error。
  const [systemFeedback, setSystemFeedback] = useState<{ message: string; ok: boolean; tone?: 'info' } | null>(null);
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
  const [readerDoc, setReaderDoc] = useState<ReaderDocument | null>(null);
  const readerFocusRef = useRef<HTMLElement>(null);
  /** Preview 模块大纲目录展开态（默认展开——样板案导览指向此处） */
  const [outlineOpen, setOutlineOpen] = useState(true);
  /** RP-2.11 chat|work 二段（docs/decisions/ADR-005-data-security.md 修正二）：work=容器工作台 / chat=内存态轻画布（重启即逝，持久化归 HARNESS-1）。 */
  const [viewSegment, setViewSegment] = useState<'chat' | 'work'>('work');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  /** chat 面在途请求（真 API）；运行态经 ProcessTrace 渲染 BrandThinking（与 work thought process 同源动画）。 */
  const [chatPending, setChatPending] = useState(false);
  /** state commit 前即生效的单飞行锁，防双击/Enter 在同一渲染帧发出两请求。 */
  const chatFlightRef = useRef(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  /** WORK-TURN-2：Work 对话不复用 Chat transcript/state；按 case 仅保留当前 UI 投影。 */
  const [workChatMessagesByCase, setWorkChatMessagesByCase] = useState<Record<string, ChatMessage[]>>({});
  /** fix-by-acceptance：在途态必须按 case 隔离——否则案 A 在途会静默锁死案 B 的 composer（零提示、零可测信号）。 */
  const [workChatPendingByCase, setWorkChatPendingByCase] = useState<Record<string, boolean>>({});
  const [workChatRecoveryError, setWorkChatRecoveryError] = useState<string>();
  const workChatFlightRef = useRef<Record<string, boolean>>({});
  const turnClientRef = useRef<TurnProtocolClient | null>(null);
  if (turnClientRef.current === null) {
    turnClientRef.current = new TurnProtocolClient(createLocalStorageTurnJournalBackend(window.localStorage));
  }
  const turnClient = turnClientRef.current;
  /** ADR-009：同一 Turn Engine，Work/Chat 各自 journal；对话不写 WorkStateEnvelope。 */
  const workTurnClient = useMemo(() => selectedCaseId
    ? new TurnProtocolClient(createLocalStorageTurnJournalBackend(window.localStorage, workTurnJournalStorageKey(selectedCaseId)))
    : null, [selectedCaseId]);
  const workChatMessages = selectedCaseId ? workChatMessagesByCase[selectedCaseId] ?? [] : [];
  const workChatPending = selectedCaseId ? workChatPendingByCase[selectedCaseId] ?? false : false;
  const [interactionReplay, setInteractionReplay] = useState<TurnReplay>();
  const [turnRecoveryError, setTurnRecoveryError] = useState<string>();
  const [chatRecoveryError, setChatRecoveryError] = useState<string>();
  const [storeChatOpen, setStoreChatOpen] = useState(false);
  /** CHAT-SESSION-1：历史会话列表导航（只读 transcript 缓存派生自持久 Turn journal）。 */
  const [chatSessionsOpen, setChatSessionsOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<TranscriptSession[]>([]);
  const [sessionHistoryError, setSessionHistoryError] = useState<string>();
  const [artifactRevision, setArtifactRevision] = useState(0);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const [sceneMoreOpen, setSceneMoreOpen] = useState(false);
  const activeFixtureRef = useMemo(() => (
    selectedCaseId && flow && isDemoCaseId(selectedCaseId)
      ? workFixture.sessionRefFor(selectedCaseId, flow)
      : undefined
  ), [flow, selectedCaseId, workFixture]);
  const emitReviewTelemetry = useMemo(() => createReviewTelemetryEmitter((event) => {
    if (!activeFixtureRef) return;
    workFixture.telemetry.emit(activeFixtureRef, event);
  }), [activeFixtureRef, workFixture]);
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

  const showSystemFeedback = (message: string, ok: boolean, tone?: 'info') => {
    setSystemFeedback({ message, ok, ...(tone ? { tone } : {}) });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSystemFeedback(null), 3200);
  };

  useEffect(() => {
    try {
      const known = turnClient.knownTurnIds();
      if (known.includes(LEGAL_DEMO_INTERACTION_TURN_ID)) {
        setInteractionReplay(turnClient.replayTurn(LEGAL_DEMO_INTERACTION_TURN_ID));
      }
      setTurnRecoveryError(undefined);
    } catch (error) {
      // Journal corruption and source drift fail closed. Existing raw storage is never cleared here.
      setTurnRecoveryError(readableError(error, 'Unable to recover interaction history'));
    }
  }, [turnClient]);

  useEffect(() => {
    if (!previewOpen || !readerDoc?.focusAnchor) return;
    const frame = window.requestAnimationFrame(() => {
      const target = readerFocusRef.current;
      if (!target) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [previewOpen, readerDoc]);

  const resolveInteraction = async (answer: InteractionAnswer) => {
    if (!interactionReplay?.pendingInteraction) throw new Error('Interaction is no longer pending');
    const replay = turnClient.resolveInteraction({
      requestId: interactionReplay.pendingInteraction.requestId,
      actor: { channelId: 'desktop', actorId: 'local-user' },
      answer,
    });
    setInteractionReplay(replay);
  };

  const openInteractionSource = async (anchor: Parameters<typeof resolveLegalDemoSource>[0]) => {
    try {
      const route = resolveLegalDemoSource(anchor);
      previewDismissedContext.current = null;
      manualPreviewSelected.current = true;
      setReaderDoc(route);
      setPreviewOpen(true);
      setRightCollapsed(false);
      setTurnRecoveryError(undefined);
    } catch (error) {
      setTurnRecoveryError(readableError(error, 'Unable to open source'));
      throw error;
    }
  };

  const workScenarioRunning = workRunning || (selectedCaseId === DEMO_CASE_ID && session.progress.length > 0 && !session.completed);

  const handleComposerSend = (payload: ComposerSendPayload) => {
    if (credentialStatus.connection.phase !== 'ready') {
      probeCredentials();
      openCredentialSurface();
      return false;
    }
    if (workScenarioRunning) return false;
    if (!selectedCaseId || !workTurnClient) {
      showSystemFeedback('尚未选择案件；先创建或选择案件，再在工作面发起对话。', false, 'info');
      return false;
    }
    const workCaseId = selectedCaseId;
    if (workChatFlightRef.current[workCaseId]) return false;
    if (caseBinding.kind === 'grant' && payload.attachments.length > 0) {
      void ingestComposerUploads(selectedCaseId, caseBinding.grantId, payload.attachments);
    }
    const requestContent = assembleRequestContent({
      text: payload.text,
      attachments: payload.attachments,
      pasteBlocks: payload.pasteBlocks,
    });
    const workContextSegment = caseBinding.kind === 'grant' && selectedCase
      ? workContextSegmentFor({
          caseTitle: selectedCase.title,
          ...(selectedCase.label ? { bindingLabel: selectedCase.label } : {}),
          materials: caseMaterials,
          scenarioState: session.confirmation
            ? 'paused_review'
            : recoverableSession
              ? 'recoverable'
              : 'not_started',
        })
      : undefined;
    const historyBase = workChatMessages;
    const createdAt = Date.now();
    setWorkChatMessagesByCase((current) => ({
      ...current,
      [workCaseId]: [...(current[workCaseId] ?? []), {
        role: 'user', text: payload.text, content: requestContent,
        files: payload.attachments.map((item) => item.fileName), pasteBlocks: payload.pasteBlocks, createdAt,
      }],
    }));
    workChatFlightRef.current[workCaseId] = true;
    setWorkChatRecoveryError(undefined);
    setWorkChatPendingByCase((current) => ({ ...current, [workCaseId]: true }));
    const assistantAt = Date.now();
    const history = continuationHistory(historyBase, Date.now()).reduce<Array<{ role: 'user' | 'assistant'; content: string }>>((messages, message) => {
      if (message.role === 'user') messages.push({ role: 'user', content: message.content });
      else if (message.turn.status === 'completed') messages.push({ role: 'assistant', content: message.turn.assistantMessage });
      return messages;
    }, []);
    void sendChatTurn(workTurnClient, modelConfig, [...history, { role: 'user', content: requestContent }], {
      ...(providerTransport ? { transport: providerTransport } : {}),
      ...(workContextSegment ? { workContextSegment } : {}),
      onProjection: (projection) => setWorkChatMessagesByCase((current) => {
        const messages = current[workCaseId] ?? [];
        const index = messages.findIndex((message) => message.role === 'assistant' && message.turn.turnId === projection.turnId);
        const next: ChatMessage = { role: 'assistant', text: projection.assistantMessage, files: [], createdAt: assistantAt, turn: projection };
        return { ...current, [workCaseId]: index === -1 ? [...messages, next] : messages.map((message, messageIndex) => messageIndex === index ? next : message) };
      }),
    })
      .catch((error: unknown) => setWorkChatRecoveryError(readableError(error, 'Unable to recover this work turn')))
      .finally(() => {
        workChatFlightRef.current[workCaseId] = false;
        setWorkChatPendingByCase((current) => ({ ...current, [workCaseId]: false }));
      });
    return true;
  };

  /** Chat transcript remains memory-only; lifecycle truth is streamed and terminalized by core Turn. */
  /**
   * UI-SURFACE-1：新发送与失败轮次重试共用的提交核心（先例：OUTPUT-CONFIRM-UI-1 的
   * `produceContractDocx(confirmedNonApplied?)` 统一首编与重编，同一手法）。`historyBase` 是
   * 「本次提交内容」之前的存活消息（新发送=当前 chatMessages；重试=裁掉失败态与其配对用户消息后的余下部分），
   * `onProjection` 按 turnId find-or-append 落位对新发送与重试都成立：重试时旧失败态已从存活视图裁掉，
   * 新 turnId 必然落在配对用户消息之后，等价于「原位替换」。
   */
  const submitChatContent = (content: string, userTextForMemory: string, historyBase: ChatMessage[], workContextSegment?: string) => {
    chatFlightRef.current = true;
    // CHAT-SESSION-1（ADR-013 §1）：续行历史只取当前连续性会话——距最近一次请求 ≤ 1 小时才延续。
    // 超窗即新 session，续行为空：不回灌历史全文（memory 注入属 CHAT-MEMORY-1，不在本单）。
    const sessionMessages = continuationHistory(historyBase, Date.now());
    const history = sessionMessages.reduce<Array<{ role: 'user' | 'assistant'; content: string }>>((messages, message) => {
      if (message.role === 'user') messages.push({ role: 'user', content: message.content });
      else if (message.turn.status === 'completed') messages.push({ role: 'assistant', content: message.turn.assistantMessage });
      return messages;
    }, []);
    setChatRecoveryError(undefined);
    setChatPending(true);
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const assistantAt = Date.now();
    // CHAT-MEMORY-1（ADR-013 §2）：组装时把蒸馏记忆作为低频前缀段注入（fail-closed：不可读即空段）。
    const memorySegment = memorySegmentFor();
    void sendChatTurn(turnClient, modelConfig, [...history, { role: 'user' as const, content }], {
      ...(providerTransport ? { transport: providerTransport } : {}),
      ...(memorySegment ? { memorySegment } : {}),
      // WORK-TURN-1 H：Work 面案语境段（缺省不供给＝字节等同既有；排 memory 之后守稳定前缀律）。
      ...(workContextSegment ? { workContextSegment } : {}),
      signal: controller.signal,
      onProjection: (projection) => {
        setChatMessages((current) => {
          const index = current.findIndex((message) => message.role === 'assistant' && message.turn.turnId === projection.turnId);
          const next: ChatMessage = {
            role: 'assistant',
            text: projection.assistantMessage,
            files: [],
            createdAt: assistantAt,
            turn: projection,
          };
          if (index === -1) return [...current, next];
          return current.map((message, messageIndex) => messageIndex === index ? next : message);
        });
      },
    })
      .then((run) => {
        // CHAT-MEMORY-1（ADR-013 §2）：请求完成即规则蒸馏。只喂用户 chat 正文
        // （绝不喂附件 readingMarkdown / 组装 content——案件隔离在此结构上成立），案件/密钥守卫在 distill 内兜底。
        // 来源坐标取真实 transcript 会话与本轮答复 turn；蒸馏是尽力而为的缓存写入，异常不影响主对话。
        if (run.terminal.status !== 'completed') return;
        try {
          const sessions = readTranscriptSessions(turnClient.store);
          const session = sessions.find((item) => item.turns.some((turn) => turn.turnId === run.turnId));
          if (!session) return;
          const distilled = distillMemory({
            userText: userTextForMemory,
            source: { sessionId: session.id, turnId: run.turnId },
            now: Date.now(),
          });
          if (distilled.length > 0) appendDistilled(distilled);
        } catch {
          /* 蒸馏失败静默于缓存层：不改事实、不断对话，用户可在设置页一键清除 */
        }
      })
      .catch((error: unknown) => {
        // Only infrastructure/journal exceptions reach this path; provider/cancel terminal states are core events.
        setChatRecoveryError(readableError(error, 'Unable to recover this turn'));
      })
      .finally(() => {
        chatFlightRef.current = false;
        if (chatAbortRef.current === controller) chatAbortRef.current = null;
        setChatPending(false);
      });
  };

  const handleChatSend = (payload: ComposerSendPayload, workContextSegment?: string) => {
    if (chatFlightRef.current) return false; // 未受理：composer 保留草稿（批次七 #3）
    if (credentialStatus.connection.phase !== 'ready') {
      probeCredentials();
      openCredentialSurface();
      return false; // 引导层拦截≠受理——草稿不清空，连接流程走完原文还在
    }
    // CHAT-MATERIAL-1：就绪附件的 readingMarkdown 与粘贴块逐字进入真实请求（同源组装）。
    // 失败 / 需 OCR / 空内容已在 Composer 阻断（failed 态），发送时 payload.attachments 只含 ready。
    const requestContent = assembleRequestContent({
      text: payload.text,
      attachments: payload.attachments,
      pasteBlocks: payload.pasteBlocks,
    });
    const historyBase = chatMessages;
    setChatMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: payload.text,
        content: requestContent,
        files: payload.attachments.map((item) => item.fileName),
        pasteBlocks: payload.pasteBlocks,
        createdAt: Date.now(),
      },
    ]);
    submitChatContent(requestContent, payload.text, historyBase, workContextSegment);
    return true;
  };

  const stopChatTurn = () => chatAbortRef.current?.abort();

  /**
   * UI-SURFACE-1：仅当失败轮次是 chat 存活视图的末位消息时可重试（对标主流产品的通行简化——
   * 只重试最新一次，不对历史中段轮次开放）。复用其配对的上一条 user 消息已组装的 `content`，
   * 先把失败态从存活视图裁掉（Turn journal 内该失败 Turn 的记录不受影响，历史不可涂改的不变量不破），
   * 再走 `submitChatContent` 的同一提交核心。
   */
  const retryChatTurn = () => {
    if (chatFlightRef.current) return;
    const last = chatMessages[chatMessages.length - 1];
    if (!last || last.role !== 'assistant' || last.turn.status !== 'failed') return;
    const userMessage = chatMessages[chatMessages.length - 2];
    if (!userMessage || userMessage.role !== 'user') return;
    const historyBase = chatMessages.slice(0, -2);
    setChatMessages((current) => current.slice(0, -1));
    submitChatContent(userMessage.content, userMessage.text, historyBase);
  };

  /** 打开历史会话列表：从持久 journal 派生只读会话；涂改/损坏 fail closed，不清除原件。 */
  const openSessionHistory = () => {
    try {
      setSessionHistory(readTranscriptSessions(turnClient.store));
      setSessionHistoryError(undefined);
    } catch (error) {
      setSessionHistory([]);
      setSessionHistoryError(readableError(error, '无法读取历史会话'));
    }
    setChatSessionsOpen(true);
  };

  /** 两面唯一的桥：从 chat 收当前话题入容器（docs/decisions/ADR-005-data-security.md 修正二），复用容器化仪式后切 work 面。 */
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
    setCredentialStatus((current) => current.credential.phase === 'stored'
      ? { ...current, connection: { phase: 'verifying' } }
      : current);
    const status = await providerConnectionClient.validate(config);
    setCredentialStatus(status);
    return status;
  };

  useEffect(() => {
    let active = true;
    void credentialClient.status().then((status) => {
      if (active) setCredentialStatus(status);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onProbe = () => probeCredentials();
    window.addEventListener('courtwork-credential-probe', onProbe);
    return () => window.removeEventListener('courtwork-credential-probe', onProbe);
  }, [modelConfig]);

  useEffect(() => {
    if (selectedCaseId) window.localStorage.setItem('courtwork.selected-case-id', selectedCaseId);
    else window.localStorage.removeItem('courtwork.selected-case-id');
  }, [selectedCaseId]);

  // CASE-PERSIST-1：案件列表元数据跨重启持久——每次列表变化以可持久投影整表重写。
  // 创建/授权/改名 → 写入；归档/移除 → 从投影剔除即清出（创建写入与归档清除对称）。
  // demo 恒挂案与已归档案由 projectPersistableCases 剔除；案件内容/密钥不入（只 id/title/grantId/label/kind）。
  useEffect(() => {
    writeCaseList(projectPersistableCases(cases));
  }, [cases]);

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
    setDraftOutputExists(false);
    setContractOutputExists(false);
    setDraft(INITIAL_DRAFT);
    setCompileOpen(false);
    setCompilePending(false);
    setSelectedRiskId('risk-03');
    setSecondaryView(undefined);
    setActiveView('revision');
    setActiveArtifactType(undefined);
    resolvedRequest.current = undefined;
    openedAt.current = {};
    lastReplayedFlow.current = undefined;
    dispatch({ type: '__clear__' });
    setWorkPhase(undefined);
    // WORK-LIVE-1：切案清空 production Work 会话态（切走即弃，不跨案串料）。
    setWorkSessionId(null);
    setWorkRunning(false);
    setWorkSubject('');
    setWorkContractMaterialId(null);
    setReviewSubmitted(false);
    setGate(undefined);
    setNonAppliedPending([]);
    setConfirmedNonAppliedIds([]);

    if (isDemoCaseId(selectedCaseId)) {
      setFlow('S3');
    } else {
      setFlow(null);
    }
  }, [selectedCaseId]);

  // demo 容器才查询 fixture replay；非 demo 永不进入该路径。
  useEffect(() => {
    if (!selectedCaseId || !isDemoCaseId(selectedCaseId) || !flow) return;
    const replayKey = `${selectedCaseId}:${flow}:${replayEpoch}`;
    if (lastReplayedFlow.current === replayKey) return;
    lastReplayedFlow.current = replayKey;
    const myGeneration = ++replayGeneration.current;
    setLocalMessages([]);
    const context = `${selectedCaseId}:${flow}`;
    let previewOpenedForReplay = false;
    const ref = workFixture.sessionRefFor(selectedCaseId, flow);
    void replayWorkProjection(workProjection, workFixture.presentReplay, ref, (event) => {
      // 被后续回放取代的陈旧回放：残余事件全部丢弃（不 dispatch、不动自动开卡）。
      if (replayGeneration.current !== myGeneration) return;
      dispatch(event);
      if (event.type !== 'artifact_produced') return;
      setArtifactRevision((revision) => revision + 1);
      const targetView = previewViewForArtifact(event.artifactType, packageRegistries, hostRenderers);
      if (!targetView || previewOpenedForReplay || previewDismissedContext.current === context || manualPreviewSelected.current) return;
      previewOpenedForReplay = true;
      if (targetView === 'artifact') setActiveArtifactType(event.artifactType);
      setActiveView(targetView);
      setPreviewOpen(true);
    }).then((replay) => {
      if (replayGeneration.current === myGeneration) setWorkPhase(replay.phase);
    });
  }, [flow, replayEpoch, selectedCaseId, packageRegistries, hostRenderers, workProjection, workFixture]);

  // docs/decisions/ADR-006-ui-host.md 三章：artifact_produced 自动展开对应模块；用户手动优先
  useEffect(() => {
    const keys = Object.keys(session.artifacts).sort().join(',');
    if (keys === lastArtifactKeys.current) return;
    lastArtifactKeys.current = keys;
    if (!keys) return;
    setModuleOpen((prev) => {
      let next = prev;
      for (const artifactType of Object.keys(session.artifacts)) {
        const target = moduleTargetForArtifact(artifactType, packageRegistries, hostRenderers);
        next = applyModuleAutoExpand(next, userModuleOverride, target);
      }
      return next;
    });
  }, [session.artifacts, userModuleOverride, packageRegistries, hostRenderers]);

  // 样板案首屏：无 session artifact 键时仍按当前场景预展开（demo 回落语料）
  useEffect(() => {
    if (!isDemoCaseId(selectedCaseId) || !flow) return;
    if (Object.keys(session.artifacts).length > 0) return;
    const scenario = packageRegistries.scenarios.get(`legal.${flow}`);
    const target = scenario?.outputArtifacts
      .map((artifactType) => moduleTargetForArtifact(artifactType, packageRegistries, hostRenderers))
      .find((moduleId) => moduleId !== undefined);
    setModuleOpen((prev) => applyModuleAutoExpand(prev, userModuleOverride, target));
  }, [selectedCaseId, flow, session.artifacts, userModuleOverride, packageRegistries, hostRenderers]);

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
    if (!requestId || !selectedCaseId || !flow || !isDemoCaseId(selectedCaseId)) return;
    const ref = workFixture.sessionRefFor(selectedCaseId, flow);
    void workFixture.review.getGateProjection({ ...ref, requestId }).then(setGate);
  }, [flow, selectedCaseId, session.confirmation, workFixture]);

  useEffect(() => {
    if (!activeFixtureRef) return;
    openedAt.current[selectedRiskId] = Date.now();
    emitReviewTelemetry({ type: 'review_item_opened', sessionId: activeFixtureRef.sessionId, itemRef: selectedRiskId, emittedAt: new Date().toISOString() });
  }, [activeFixtureRef, emitReviewTelemetry, selectedRiskId]);

  const selectedCase = selectedCaseId ? cases.find((item) => item.id === selectedCaseId) : undefined;
  const isWelcome = !selectedCase;
  const isDemoCase = Boolean(selectedCase?.isDemo) || isDemoCaseId(selectedCase?.id);

  useEffect(() => {
    if (!isDemoCase || flow !== 'S3' || !session.confirmation) return;
    try {
      setInteractionReplay(ensureLegalDemoInteraction(turnClient));
      setTurnRecoveryError(undefined);
    } catch (error) {
      setTurnRecoveryError(readableError(error, 'Unable to recover interaction history'));
    }
  }, [flow, isDemoCase, session.confirmation, turnClient]);

  // CASE-ROOT-1：案件根改为 opaque 绑定。真实案件根绝对路径只在宿主侧按 grantId 解析，
  // renderer 只见 binding（demo|grant|unbound）。`demoCaseRoot` 是样板案的虚拟根，仅供 demo
  // 浏览器 mock 呈现（原件区/工作稿/在访达显示），真实案永不在 renderer 暴露绝对路径。
  const caseBinding = useMemo<CaseBinding>(
    () => (selectedCase ? resolveCaseBinding(selectedCase) : { kind: 'unbound' }),
    [selectedCase],
  );
  const demoCaseRoot = caseBinding.kind === 'demo' ? DEMO_CASE_ROOT : undefined;

  // MATERIAL-INGRESS-1：真实（grant）案的已入库材料清单，重启后由宿主 MaterialStore 复列。
  // demo/unbound 永不查询生产 store（双向隔离）；切案即重载，切走清空。
  const [caseMaterials, setCaseMaterials] = useState<StoredMaterial[]>([]);
  useEffect(() => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId) {
      setCaseMaterials([]);
      return;
    }
    let cancelled = false;
    const caseId = selectedCaseId;
    void materialStore.listForCase(caseId).then((materials) => {
      if (!cancelled) setCaseMaterials(materials);
    });
    return () => {
      cancelled = true;
    };
  }, [caseBinding.kind, selectedCaseId, materialStore]);

  // WORK-LIVE-REPLAY-1：切案/重载后从持久层复读本案的可恢复会话指针（fail-closed：不可读即当作无）。
  // 恢复入口据此在 workSessionId 清空后重现——答复 WORK-HOST-1 驳回阻断二「session ref 未成为可恢复 UI 状态」。
  useEffect(() => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId) {
      setRecoverableSession(null);
      return;
    }
    setRecoverableSession(readWorkSession(selectedCaseId));
  }, [caseBinding.kind, selectedCaseId]);

  // CASE-PERSIST-1：跨重启后交叉核对宿主实际持有的授权（host_auth 的 grant 记录跨重启耐久）。持久案件持的
  // grantId 若宿主查无（文件夹被移动/删除、卷卸载或撤权），标记显式失效态供用户移除——绝不静默从侧栏消失
  // （核心不变量四）。开案时也复核（selectedCaseId 变即重查），保证「打开即最新」的 fail-closed 新鲜度。
  const grantSignature = cases.map((item) => item.grantId ?? '').join('|');
  useEffect(() => {
    let cancelled = false;
    void hostAuth
      .listGrants()
      .then((grants) => {
        if (!cancelled) setKnownGrantIds(new Set(grants.map((grant) => grant.grantId)));
      })
      .catch(() => {
        if (!cancelled) setKnownGrantIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [hostAuth, grantSignature, selectedCaseId]);

  // 尚未核对完成（null）前不误判任何案失效（避免冷启动瞬时闪烁）；核对完成后，持 grantId 但宿主查无者即失效。
  const invalidGrantIds = useMemo(() => {
    const invalid = new Set<string>();
    if (knownGrantIds === null) return invalid;
    for (const item of cases) {
      if (item.grantId && !item.isDemo && !knownGrantIds.has(item.grantId)) invalid.add(item.grantId);
    }
    return invalid;
  }, [cases, knownGrantIds]);

  const fixtureRef = isDemoCase ? activeFixtureRef : undefined;
  // fixture fallback 只属于显式 demo ref；非 demo 分支不会询问 fixture adapter。
  const riskList = (
    fixtureRef
      ? (session.artifacts['legal.RiskList'] ?? workFixture.artifactFor(fixtureRef, 'legal.RiskList'))
      : session.artifacts['legal.RiskList']
  ) as RiskList | undefined;
  const timeline = (
    fixtureRef
      ? (session.artifacts['legal.Timeline'] ?? workFixture.artifactFor(fixtureRef, 'legal.Timeline'))
      : session.artifacts['legal.Timeline']
  ) as Timeline | undefined;
  const graph = (
    fixtureRef
      ? (session.artifacts['legal.PartyGraph'] ?? workFixture.artifactFor(fixtureRef, 'legal.PartyGraph'))
      : session.artifacts['legal.PartyGraph']
  ) as PartyGraph | undefined;
  const matrix = (
    fixtureRef
      ? (session.artifacts['legal.ReviewMatrix'] ?? workFixture.artifactFor(fixtureRef, 'legal.ReviewMatrix'))
      : session.artifacts['legal.ReviewMatrix']
  ) as ReviewMatrix | undefined;
  const artifactViewEntries = Object.entries(session.artifacts).filter(([artifactType]) => {
    const resolved = resolveHostArtifact(artifactType, packageRegistries, hostRenderers);
    return resolved.status === 'unsupported' || resolved.renderer.kind === 'component';
  });
  const artifactViewEntry = artifactViewEntries.find(([artifactType]) => artifactType === activeArtifactType)
    ?? artifactViewEntries.at(-1);
  const hasArtifactView = artifactViewEntry !== undefined;
  // LEGAL-DEMO-RUN ③：chat 侧 artifact 卡取数改为投影派生——事件里是多少就呈现多少，
  // 硬编码计数退役；citationStats 仅事件携带（无 demo 兜底，观测字段不冒充）。
  const demoArtifactCard =
    flow === 'S3'
      ? {
          title: `发现 ${riskList?.risks.length ?? 0} 项合同风险`,
          summary: `${riskList?.risks.length ?? 0} 项 · 打开修订预览${
            session.citationStats
              ? ` · 引语公证 ${session.citationStats.resolvedAfterRetry}/${session.citationStats.claims}`
              : ''
          }`,
        }
      : {
          title: '时间线与关系图谱已生成',
          summary: `${timeline?.events.length ?? 0} 个事件 · ${graph?.nodes.length ?? 0} 个主体 · 打开时间线`,
        };
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
  const draftFrozen = draftOutputExists;
  const comparing = secondaryView !== undefined;
  const usage = isDemoCase ? (flow === 'S3' ? 91 : 18) : 0;
  const progressDone =
    !isDemoCase ? 0 : flow === 'S1' ? Math.min(16, 20) : Object.keys(dispositions).length;
  const progressTotal = !isDemoCase ? 6 : flow === 'S1' ? 20 : 6;
  const progressCount = progressHeadCount(progressDone, progressTotal);
  const attachmentSources = localMessages.flatMap((message) => message.files);
  // PILOT-LIVE-2 E：最新助手回复豁免折叠（裁定：最新默认全文展开；折叠仅限历史轮次）。
  // 取最后一条已结束的助手消息而非末位消息：发送在途窗口内新投影会先插入 running assistant，
  // 它尚未成为可阅读回复，不得抢走 latest 席位令上一条完整回复瞬时坍缩；terminal 后再正常交棒。
  const lastAssistantIndex = chatMessages.reduce(
    (last, item, i) => (item.role === 'assistant' && item.turn.status !== 'running' ? i : last),
    -1,
  );
  const lastWorkAssistantIndex = workChatMessages.reduce(
    (last, item, i) => (item.role === 'assistant' && item.turn.status !== 'running' ? i : last),
    -1,
  );
  const usageDetail = isDemoCase
    ? {
        dossier: flow === 'S1' ? '14%' : '62%',
        chat: flow === 'S1' ? '4%' : '23%',
        compressible: flow === 'S1' ? '0%' : '6%',
      }
    : null;

  useEffect(() => {
    let cancelled = false;
    let requestVersion = 0;
    setDraftOutputExists(false);
    setContractOutputExists(false);
    if (caseBinding.kind === 'unbound') return;

    const refreshOutputExistence = () => {
      const currentRequest = ++requestVersion;
      void Promise.all([
        caseOutputClient.exists(caseBinding, DRAFT_OUTPUT_FILE),
        caseOutputClient.exists(caseBinding, CONTRACT_OUTPUT_FILE),
      ]).then(([draftExists, contractExists]) => {
        if (cancelled || currentRequest !== requestVersion) return;
        setDraftOutputExists(draftExists);
        setContractOutputExists(contractExists);
      }).catch(() => {
        if (cancelled || currentRequest !== requestVersion) return;
        setDraftOutputExists(false);
        setContractOutputExists(false);
      });
    };

    refreshOutputExistence();
    // 用户在访达删除/替换产物后回到应用时重新询问宿主；冻结不能由一次 true
    // 永久缓存成裸 UI 状态。
    window.addEventListener('focus', refreshOutputExistence);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshOutputExistence);
    };
  }, [caseBinding]);

  // OUTPUT-CONFIRM-UI-1：审阅确认后编译合同产物。落盘门禁语义（OUTPUT-CORRECTNESS #6）由
  // @courtwork/output 决定，本处只做产品侧编排：未能落到文书上的修订不静默跳过——首次编译遇
  // 未落点项挂起逐条待确认（不产出任何 docx），用户逐条确认后带 confirmedNonApplied 重编译落盘，
  // 取消则从不产出。
  const recompileGuard = useRef(false);
  const produceContractDocx = async (confirmedNonApplied?: string[]) => {
    if (caseBinding.kind === 'unbound' || !riskList) throw new Error('本案尚未绑定可写入的案件目录');
    // WORK-LIVE-1 / ADR-010 决定五：grant（真实）案的 docx 源文只从本 session 冻结、resolveForProvider
    // 刚复验的会话材料取（bindDocxSourceMarkdown），绝不消费 demo `contractSourceMd`；漂移即在此显式阻断。
    let sourceMarkdown = contractSourceMd;
    let targetFileName = '04-设备采购合同.docx';
    if (caseBinding.kind === 'grant') {
      if (!selectedCaseId || !workContractMaterialId) throw new Error('尚未选定可编译的合同原件');
      const resolved = await materialStore.resolveForProvider(selectedCaseId, workContractMaterialId);
      if (resolved.status !== 'ready') throw new Error('合同原件复验未通过，未能编译文书');
      sourceMarkdown = bindDocxSourceMarkdown(resolved.material);
      targetFileName = resolved.material.fileName;
    }
    const result = compileConfirmedReviewToDocx({
      riskList,
      dispositions,
      sourceMarkdown,
      targetFileName,
      evidenceGrades: session.evidenceGrades,
      confirmedNonApplied,
    });
    if (result.status === 'needs_confirmation') {
      recompileGuard.current = false;
      setNonAppliedPending(result.pending);
      return;
    }
    await caseOutputClient.writeDocx(caseBinding, CONTRACT_OUTPUT_FILE, result.docx);
    const exists = await caseOutputClient.exists(caseBinding, CONTRACT_OUTPUT_FILE);
    if (!exists) throw new Error('Word 产物写入后未能在案件产出目录确认');
    setNonAppliedPending([]);
    setConfirmedNonAppliedIds([]);
    setContractOutputExists(true);
    showSystemFeedback(`已写入本案「产出」目录：${CONTRACT_OUTPUT_FILE}`, true);
    // WORK-LIVE-REPLAY-1：grant 案 docx 终链完成即清除恢复指针（会话已办结，无可续行门禁）。
    if (caseBinding.kind === 'grant' && selectedCaseId) {
      clearWorkSession(selectedCaseId);
      setRecoverableSession(null);
    }
  };

  const confirmNonApplied = (instructionId: string) => {
    setConfirmedNonAppliedIds((prev) => (prev.includes(instructionId) ? prev : [...prev, instructionId]));
  };
  const cancelNonApplied = () => {
    recompileGuard.current = false;
    setNonAppliedPending([]);
    setConfirmedNonAppliedIds([]);
  };

  // 逐条确认满即重编译落盘（针对性确认，非笼统放行；覆盖不全由 output 门禁继续阻断）。
  useEffect(() => {
    if (nonAppliedPending.length === 0) {
      recompileGuard.current = false;
      return;
    }
    const allConfirmed = nonAppliedPending.every((item) => confirmedNonAppliedIds.includes(item.instructionId));
    if (!allConfirmed || recompileGuard.current) return;
    recompileGuard.current = true;
    void (async () => {
      try {
        await produceContractDocx(confirmedNonAppliedIds);
      } catch (error) {
        recompileGuard.current = false;
        setContractOutputExists(false);
        showSystemFeedback(error instanceof Error ? error.message : 'Word 产物生成失败', false);
      }
    })();
  }, [nonAppliedPending, confirmedNonAppliedIds]);

  useEffect(() => {
    const requestId = session.confirmation?.requestId;
    if (!requestId || !selectedCaseId || !flow || !isDemoCaseId(selectedCaseId)) return;
    if (!gate?.items.length || resolvedRequest.current === requestId) return;
    if (!gate.items.every((item) => dispositions[item.itemRef])) return;

    const dwellMs = gate.items.reduce((total, item) => total + Math.max(0, Date.now() - (openedAt.current[item.itemRef] ?? Date.now())), 0);
    const expandedEvidenceKeys = gate.items.flatMap((item) => item.evidenceKeys).filter((key, index, all) => all.indexOf(key) === index);
    const resolution = buildReviewResolution(gate.items, dispositions, { dwellMs, expandedEvidenceKeys });
    resolvedRequest.current = requestId;
    void (async () => {
      try {
        const ref = workFixture.sessionRefFor(selectedCaseId, flow);
        await workFixture.review.resolve({ ...ref, requestId, resolution });
        setReviewSubmitted(true);
        // 首次编译：全落点直接落盘；有未落点项则挂起逐条待确认，本次不产出任何 docx。
        await produceContractDocx();
      } catch (error) {
        setContractOutputExists(false);
        showSystemFeedback(error instanceof Error ? error.message : 'Word 产物生成失败', false);
      }
    })();
  }, [caseBinding, dispositions, flow, gate, riskList, selectedCaseId, session.confirmation, session.evidenceGrades, workFixture]);

  // WORK-LIVE-1：grant（真实）案的 production S3 运行触发。显式主体来自受控 preflight（不从案名/文件名/
  // 正文/模型猜测）；材料经 resolveForProvider 复验才入 provider；事件机械发布进同一 session 投影（零 recording）。
  const startWorkRun = () => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || workRunning) return;
    // WORK-TURN-1 G 存量守卫：旧版铸号（标题拼入 id）在 work_state 安全 token 外——原位容忍，
    // 场景运行前显式引导（发生了什么+下一步），不让 Rust 侧技术红条兜底。
    if (!isWorkSafeCaseId(selectedCaseId)) {
      showSystemFeedback(LEGACY_CASE_SCENARIO_COPY, false, 'info');
      return;
    }
    const partyName = workSubject.trim();
    if (!partyName) return;
    const ready = caseMaterials.filter((material) => material.status === 'ready');
    if (ready.length === 0) return;
    dispatch({ type: '__clear__' });
    setGate(undefined);
    setReviewSubmitted(false);
    setNonAppliedPending([]);
    setConfirmedNonAppliedIds([]);
    resolvedRequest.current = undefined;
    const contractMaterialId = ready[0].materialId;
    setWorkContractMaterialId(contractMaterialId);
    setWorkRunning(true);
    const caseId = selectedCaseId;
    const { sessionId, done } = workCommand.startWithPreflight(
      {
        commandId: `s3-${caseId}-${Date.now()}`,
        caseId,
        materialRefs: ready.map((material) => material.materialId),
        modelRoute: { providerId: modelConfig.providerId, modelId: modelConfig.modelId, reasoning: modelConfig.reasoning },
        subject: { partyName },
      },
      dispatch,
    );
    setWorkSessionId(sessionId);
    // WORK-LIVE-REPLAY-1：run 启动成功即持久化最小恢复指针——切案/重启后 workSessionId 清空，恢复入口据此重现。
    persistWorkSession(caseId, { sessionId, contractMaterialId });
    void done.then((outcome) => {
      setWorkRunning(false);
      // WORK-LIVE-1-FIX：rejected（未就绪/冲突，ADR-010 决定一闭集）是明确的产品语言中性反馈，
      // 不是错误红条；failed（provider/内部）才是错误。二者视觉与语义分离。
      if (outcome.status === 'rejected') {
        showSystemFeedback(outcome.message, false, 'info');
      } else if (outcome.status === 'failed') {
        // PROVIDER-STREAM-1 ③：失败报文过产品语守门（协议外守卫/英文技术残文零裸透）；
        // 同时把 provider 侧脱敏留证持久到本地（versioned 单键），供真机复现回填 fixture。
        showSystemFeedback(workFailureDisplayCopy(outcome.message), false);
        try {
          const evidence = readStreamEvidence();
          if (evidence.length > 0) {
            window.localStorage.setItem('courtwork.provider-evidence.v1', JSON.stringify({ version: 1, entries: evidence }));
          }
        } catch {
          /* 留证是尽力而为的诊断缓存：失败不影响主反馈 */
        }
      } else if (outcome.status === 'canceled') {
        showSystemFeedback('已停止合同审查', true);
      }
      // WORK-LIVE-REPLAY-1：非暂停终态（拒绝/失败/取消）无可恢复会话——清除指针，不留悬空恢复入口。
      // paused 保留指针（可恢复）；completed 由 docx 终链清除。
      if (outcome.status === 'rejected' || outcome.status === 'failed' || outcome.status === 'canceled') {
        clearWorkSession(caseId);
        setRecoverableSession(null);
      }
    });
  };

  const cancelWorkRun = () => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || !workSessionId || !workRunning) return;
    void workCommand.cancel({ caseId: selectedCaseId, sessionId: workSessionId, commandId: `cancel-${Date.now()}` });
  };

  // WORK-LIVE-REPLAY-1（答复 WORK-HOST-1 驳回阻断二）：恢复入口——从持久指针调 workCommand.replay 水合投影续行。
  // 切案/重启后 workSessionId 清空，用户经此重新发现并恢复 ref：replay 从宿主读回信封 → 机械回放事件重建
  // riskList/门禁/证据台账 → 停在暂停门禁续行（逐条处置 → resolveReview → docx，与不重启路径等价）。
  const recoverWorkRun = async () => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || workRunning) return;
    const record = readWorkSession(selectedCaseId);
    if (!record) { setRecoverableSession(null); return; }
    const caseId = selectedCaseId;
    const replay = await workCommand.replay({ caseId, sessionId: record.sessionId }).catch(() => null);
    // 失效诚实：读入失败 / 信封已不存在（空事件）/ 非暂停态（残缺·已办结·已失败）→ 无可续行门禁，
    // 显式失效反馈（info 中性态）+ 清除残 ref，零静默降级。
    if (!replay || replay.phase !== 'paused' || replay.events.length === 0) {
      clearWorkSession(caseId);
      setRecoverableSession(null);
      const message = replay?.phase === 'completed'
        ? '上次的合同审查已办结，如需重做请重新开始审查'
        : '未找到可继续的合同审查进度，请重新开始审查';
      showSystemFeedback(message, false, 'info');
      return;
    }
    // 水合：从干净基态机械回放信封事件（riskList/门禁/证据台账），恢复会话态与冻结的合同原件。
    dispatch({ type: '__clear__' });
    for (const event of replay.events) dispatch(event);
    setWorkSessionId(record.sessionId);
    setWorkContractMaterialId(record.contractMaterialId);
    setWorkPhase(replay.phase);
    resolvedRequest.current = undefined;
  };

  // WORK-LIVE-1：grant 案的 live gate 由真实 RiskList + 证据台账派生（projectRiskListGate，绝不复用样板案门禁投影）。
  useEffect(() => {
    const requestId = session.confirmation?.requestId;
    if (!requestId || caseBinding.kind !== 'grant' || !riskList) return;
    setGate(projectRiskListGate(riskList, requestId, session.evidenceGrades));
  }, [caseBinding.kind, riskList, session.confirmation, session.evidenceGrades]);

  // WORK-LIVE-1：grant 案逐条处置满 → resolveReview（内部 mapReviewResolutionToResume 逐条 revision）→ resume → docx。
  useEffect(() => {
    const requestId = session.confirmation?.requestId;
    if (!requestId || caseBinding.kind !== 'grant' || !workSessionId || !selectedCaseId) return;
    if (!gate || resolvedRequest.current === requestId) return;
    if (gate.items.length > 0 && !gate.items.every((item) => dispositions[item.itemRef])) return;
    const dwellMs = gate.items.reduce((total, item) => total + Math.max(0, Date.now() - (openedAt.current[item.itemRef] ?? Date.now())), 0);
    const expandedEvidenceKeys = gate.items.flatMap((item) => item.evidenceKeys).filter((key, index, all) => all.indexOf(key) === index);
    const resolution = buildReviewResolution(gate.items, dispositions, { dwellMs, expandedEvidenceKeys });
    const caseId = selectedCaseId;
    const sessionId = workSessionId;
    resolvedRequest.current = requestId;
    void (async () => {
      try {
        await workCommand.resolveReview({ caseId, sessionId, commandId: `resume-${requestId}`, requestId, resolution }, dispatch);
        setReviewSubmitted(true);
        await produceContractDocx();
      } catch (error) {
        setContractOutputExists(false);
        showSystemFeedback(error instanceof Error ? error.message : 'Word 产物生成失败', false);
      }
    })();
  }, [caseBinding.kind, dispositions, gate, selectedCaseId, session.confirmation, workSessionId]);

  const createCase = ({
    title,
    fileCount = 0,
    kind = 'case',
    grantId,
    label,
  }: {
    title: string;
    fileCount?: number;
    kind?: ContainerKind;
    // CASE-ROOT-1：绑定文件夹时携 opaque grantId + 展示 label（无绝对路径）；未绑定则二者为空。
    grantId?: string;
    label?: string;
  }) => {
    // WORK-TURN-1 G：铸号去标题化——标题只作展示字段；id 恒过 work_state 安全 token（真机红条根因）。
    const newId = mintCaseId();
    setCases((current) => [
      ...current,
      {
        id: newId,
        title,
        fileCount,
        archived: false,
        grantId,
        label,
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

  /**
   * PILOT-LIVE-1 C2：建案携 grantId 时随即就地入库该文件夹（原 NewCaseDialog 建案只绑 grant、
   * 用户还需再点一次「Add folder」才见材料的死端）。createCase 内部已 setSelectedCaseId(newId)，
   * 此处显式传 newId 给 ingestAuthorizedFolder，不依赖 setState 后立即读值。demo/无 grant 建案不入库。
   */
  const createCaseWithFolder = (input: { title: string; grantId?: string; label?: string }) => {
    const newId = createCase({ title: input.title, grantId: input.grantId, label: input.label });
    if (input.grantId) void ingestAuthorizedFolder(newId, input.grantId, input.label ?? '');
    return newId;
  };

  /** docs/design/principles.md：composer-first 容器化仪式 → 创建案件/项目并选中 */
  const handleContainerize = (request: ContainerizeRequest) => {
    const title =
      request.kind === 'workspace'
        ? `项目 · ${new Date().toLocaleDateString('zh-CN')}`
        : `案件 · ${new Date().toLocaleDateString('zh-CN')}`;
    createCase({ title, fileCount: 0, kind: request.kind });
  };

  /**
   * F-1.1：未归档「存入」→ 容器化仪式（与 composer-first 同族）。
   * 禁止直建 kind:'case'（docs/decisions/ADR-006-ui-host.md：用户选名词，不替用户选）。
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
    const connectionChanged = next.providerId !== modelConfig.providerId
      || next.modelId !== modelConfig.modelId
      || next.reasoning !== modelConfig.reasoning;
    setModelConfig(next);
    saveModelConfig(next);
    if (connectionChanged) {
      setCredentialStatus((current) => ({ ...current, connection: { phase: 'unverified' } }));
    }
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

  /**
   * docs/design/principles.md + RP-1 A2：卷宗/资料计数 → 展开态内 originals-zone 滚入/高亮。
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

  // CASE-PERSIST-1：移除一枚失效案件列表项（宿主查无其 grantId）。从活动列表删除即经持久 effect 清出持久层；
  // 若正选中则退回欢迎态。只清列表元数据——不触碰 host_auth 授权本体/MaterialStore/会话信封。
  const removeCase = (caseId: string) => {
    setCases((current) => current.filter((item) => item.id !== caseId));
    if (selectedCaseId === caseId) setSelectedCaseId(null);
  };

  // CASE-ROOT-1：在访达显示/打开只对样板案（虚拟根、浏览器 mock）走原生 reveal；真实案的绝对路径
  // 只住宿主，本单不引入按 grantId 的 reveal 命令（属后续），故显式告知去已授权文件夹查看，绝不静默。
  const notifyRevealUnavailable = () => {
    if (caseBinding.kind === 'grant') {
      showSystemFeedback(
        `产出已写入已授权的案件文件夹〔${selectedCase?.label ?? ''}〕，请在系统文件管理器中查看`,
        false,
      );
    } else {
      showSystemFeedback('本案尚未绑定文件夹', false);
    }
  };

  const openOutputFolder = () => {
    if (!demoCaseRoot) {
      notifyRevealUnavailable();
      return;
    }
    void systemOpenClient.revealInFolder(caseOutputDir(demoCaseRoot), demoCaseRoot).then((feedback) => {
      showSystemFeedback(feedback.message, feedback.ok);
    });
  };

  const revealOutputDocx = () => {
    if (!demoCaseRoot) {
      notifyRevealUnavailable();
      return;
    }
    void systemOpenClient.revealInFolder(caseOutputDocx(demoCaseRoot, CONTRACT_OUTPUT_FILE), demoCaseRoot).then((feedback) => {
      showSystemFeedback(feedback.message, feedback.ok);
    });
  };

  const openCaseOutputDocx = (fileName: string) => {
    if (!demoCaseRoot) {
      notifyRevealUnavailable();
      return;
    }
    void systemOpenClient.openFile(caseOutputDocx(demoCaseRoot, fileName), demoCaseRoot).then((feedback) => {
      showSystemFeedback(feedback.message, feedback.ok);
    });
  };

  const openOutputDocx = () => openCaseOutputDocx(CONTRACT_OUTPUT_FILE);

  // MATERIAL-INGRESS-1：就地入库一个授权文件夹的原件——枚举单层文件 → 逐件读原件、哈希、
  // reading-view 派生 → 持久 source-neutral MaterialRef。原件永远只读、原地不动（grant root 之下）。
  // demo 案不走生产 store（双向隔离）；诚实计数上报（就绪/需识别/不可用/失败），零静默。
  const ingestAuthorizedFolder = async (caseId: string, grantId: string, label: string) => {
    const listing = await materialStore.listDir(grantId);
    if (listing.status === 'failed') {
      showSystemFeedback(hostAuthReasonCopy(listing.reason), false);
      return;
    }
    if (listing.entries.length === 0) {
      showSystemFeedback(`〔${label}〕内没有可入库的文件`, false);
      return;
    }
    let ready = 0;
    let needsOcr = 0;
    let rejected = 0;
    let failed = 0;
    for (const entry of listing.entries) {
      const result = await materialStore.ingest(caseId, {
        grantId,
        relativePath: entry.relativePath,
        fileName: entry.fileName,
      });
      if (result.status === 'failed') {
        failed += 1;
      } else if (result.material.status === 'ready') {
        ready += 1;
      } else if (result.material.status === 'needs_ocr') {
        needsOcr += 1;
      } else {
        rejected += 1;
      }
    }
    const materials = await materialStore.listForCase(caseId);
    setCaseMaterials(materials);
    setCases((current) =>
      current.map((item) => (item.id === caseId ? { ...item, fileCount: materials.length } : item)),
    );
    const parts = [`已从〔${label}〕入库 ${ready} 件卷宗原件`];
    if (needsOcr > 0) parts.push(`${needsOcr} 件需文字识别后方可引用`);
    if (rejected > 0) parts.push(`${rejected} 件无法转为可引用的阅读视图`);
    if (failed > 0) parts.push(`${failed} 件读取失败`);
    showSystemFeedback(parts.join('；'), failed === 0);
  };

  /**
   * PILOT-LIVE-2 F：case 语境上传入库路由——composer 附件经既有 grant 写授权落入已授权项目
   * 文件夹（host_write_file），再按 grant+relativePath 走 material-ingress 原班 ingest（provenance
   * 与 hash 复验天然成立）。同名同内容＝跳过写入、就地入库（不重复上传）；同名异内容＝显式
   * 拒绝不覆写（原件只读红线）。零新入库语义：写授权、ingest、计数反馈全部复用既有链。
   */
  const ingestComposerUploads = async (
    caseId: string,
    grantId: string,
    attachments: ComposerSendPayload['attachments'],
  ) => {
    let ingested = 0;
    const refused: string[] = [];
    const failed: string[] = [];
    for (const attachment of attachments) {
      const fileName = attachment.fileName;
      const existing = await materialStore.readSource(grantId, fileName);
      if (existing.status === 'read') {
        const [existingSha, uploadSha] = await Promise.all([sha256Hex(existing.bytes), sha256Hex(attachment.bytes)]);
        if (existingSha !== uploadSha) {
          refused.push(fileName);
          continue;
        }
        // 同名同内容：原件已在项目文件夹，跳过写入直接就地入库。
      } else {
        const wrote = await hostAuth.writeFile({
          grantId,
          relativePath: fileName,
          bytes: attachment.bytes,
          overwrite: false,
        });
        if (wrote.status !== 'wrote') {
          failed.push(`${fileName}（${hostAuthReasonCopy(wrote.reason)}）`);
          continue;
        }
      }
      const result = await materialStore.ingest(caseId, { grantId, relativePath: fileName, fileName });
      if (result.status === 'failed') failed.push(`${fileName}（${hostAuthReasonCopy(result.reason)}）`);
      else ingested += 1;
    }
    const materials = await materialStore.listForCase(caseId);
    setCaseMaterials(materials);
    setCases((current) =>
      current.map((item) => (item.id === caseId ? { ...item, fileCount: materials.length } : item)),
    );
    const parts: string[] = [];
    if (ingested > 0) parts.push(`已入库 ${ingested} 件到本案卷宗`);
    if (refused.length > 0) {
      parts.push(`同名文件已在项目文件夹且内容不同，未覆写：${refused.join('、')} · 请改名后重试，或经「+」菜单整夹入库`);
    }
    if (failed.length > 0) parts.push(`未能入库：${failed.join('、')}`);
    if (parts.length > 0) showSystemFeedback(parts.join('；'), refused.length === 0 && failed.length === 0);
  };

  // CASE-ROOT-1 授权 + MATERIAL-INGRESS-1 入库：composer「Add folder」经宿主原生 picker 取文件夹授权。
  // 授权成立且当前为真实案 → 就地入库该文件夹原件；未绑定案先绑此 grant 为案件根，再入库。
  // 无选中案 / demo 案 → 只授权不入库（demo 双向隔离），诚实反馈。
  const authorizeCaseFolder = () => {
    void hostAuth.authorizeFolder().then(async (result) => {
      if (result.status !== 'granted') {
        showSystemFeedback(hostAuthReasonCopy(result.reason), false);
        return;
      }
      const targetCaseId = selectedCaseId;
      if (!targetCaseId || isDemoCaseId(targetCaseId)) {
        // PILOT-LIVE-1 C2：welcome/demo 态授权不再只 toast 留悬空 grant——建新案承接该文件夹并即刻入库
        // （案名取 grant label；诚实入库计数 toast 由 ingestAuthorizedFolder 内统一给出）。
        createCaseWithFolder({ title: result.grant.label, grantId: result.grant.grantId, label: result.grant.label });
        return;
      }
      // 未绑定案：把此 grant 记为案件根（label 供展示）；已绑定案保留原案根，材料仍带自身来源 grant。
      setCases((current) =>
        current.map((item) =>
          item.id === targetCaseId && !item.grantId
            ? { ...item, grantId: result.grant.grantId, label: result.grant.label }
            : item,
        ),
      );
      await ingestAuthorizedFolder(targetCaseId, result.grant.grantId, result.grant.label);
    });
  };

  // MATERIAL-INGRESS-1：核验即 provider 前重验（再读原件、比对 content/ReadingView 哈希、status/跨 case 门）。
  // 漂移、删除、需 OCR、跨 case 全部显式呈现闭集原因；通过则报可用于生成。
  const verifyMaterial = (materialId: string) => {
    if (!selectedCaseId) return;
    void materialStore.resolveForProvider(selectedCaseId, materialId).then((resolved) => {
      if (resolved.status === 'ready') {
        showSystemFeedback(`原件校验通过：${resolved.material.fileName} 可用于生成`, true);
      } else {
        showSystemFeedback(MATERIAL_BLOCK_REASON_COPY[resolved.reason], false);
      }
    });
  };

  const confirmDraftCompile = () => {
    if (caseBinding.kind === 'unbound' || compilePending) return;
    setCompilePending(true);
    void (async () => {
      try {
        const docx = compileDraftToDocx(draft);
        await caseOutputClient.writeDocx(caseBinding, DRAFT_OUTPUT_FILE, docx);
        const exists = await caseOutputClient.exists(caseBinding, DRAFT_OUTPUT_FILE);
        if (!exists) throw new Error('Word 产物写入后未能在案件产出目录确认');
        setDraftOutputExists(true);
        setCompileOpen(false);
        showSystemFeedback(`已写入本案「产出」目录：${DRAFT_OUTPUT_FILE}`, true);
      } catch (error) {
        setDraftOutputExists(false);
        showSystemFeedback(error instanceof Error ? error.message : 'Word 产物生成失败', false);
      } finally {
        setCompilePending(false);
      }
    })();
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
    setWorkPhase(undefined);
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
    // 本函数全部调用点都是用户显式导航（scene-strip/更多/⌘K/面板内 tab/大纲行），点击即开面；
    // 十四章「demo 进浏览器态、非 demo 空案停大纲」只作用于切案时刻，由切案 effect 独立承载（PILOT-LIVE-1 B）。
    setPreviewOpen(true);
    setReaderDoc(null);
    previewDismissedContext.current = null;
  };

  // WORK-LIVE-1：grant（真实）案打开合同审查工作面（S3 启动器 / 风险清单审阅）。
  const openWorkReview = () => {
    manualPreviewSelected.current = true;
    setWorkDraftMode(false);
    setFileOpsMode(false);
    setActiveView('revision');
    setPreviewOpen(true);
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
    if (fixtureRef) {
      emitReviewTelemetry({ type: 'review_evidence_expanded', sessionId: fixtureRef.sessionId, itemRef: riskId, evidenceRef, emittedAt: new Date().toISOString() });
    }
  };

  const dispose = (itemRef: string, disposition: ReviewDispositionState) => {
    setDispositions((current) => ({ ...current, [itemRef]: disposition }));
    const protocolDisposition = disposition === 'confirmed' ? 'confirm' : disposition === 'rejected' ? 'reject' : 'revise';
    if (fixtureRef) {
      emitReviewTelemetry({ type: 'review_disposition_submitted', sessionId: fixtureRef.sessionId, itemRef, disposition: protocolDisposition, emittedAt: new Date().toISOString() });
    }
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
      if (caseBinding.kind !== 'grant') {
        return emptyWorkbench(`${selectedCase.title} 刚建立，尚无卷宗内容 · 从对话或场景开始整理`);
      }
      // WORK-LIVE-1：grant（真实）案的 production S3 合同审查——仅「修订」与「结构化产出」两个工作面适用。
      if (view === 'revision' && !riskList) {
        const readyMaterials = caseMaterials.filter((material) => material.status === 'ready');
        if (readyMaterials.length === 0) {
          return emptyWorkbench(`${selectedCase.title} · 入库合同材料后即可开始合同审查`);
        }
        if (workRunning) return emptyWorkbench('合同审查进行中…');
        return (
          <div className="s3-launcher" data-testid="s3-launcher">
            <h3>合同审查</h3>
            <p>对已入库的合同做逐条风险审查。审查前请填写对方主体名称（用于工商核验），系统不从文件名或正文推断。</p>
            {recoverableSession && (
              <div className="work-recover" data-testid="work-recover">
                <p>本案有一次未完成的合同审查。可继续上次进度，或在下方重新开始。</p>
                <button type="button" className="primary-button" data-testid="work-recover-run" onClick={() => void recoverWorkRun()}>
                  恢复审查
                </button>
              </div>
            )}
            <label className="s3-subject-field">
              <span>对方主体名称</span>
              <input
                data-testid="s3-subject"
                value={workSubject}
                onChange={(event) => setWorkSubject(event.target.value)}
                placeholder="例如：临江精铸科技有限公司"
              />
            </label>
            <button type="button" className="primary-button" data-testid="s3-run" disabled={!workSubject.trim()} onClick={startWorkRun}>
              开始合同审查
            </button>
            <p className="s3-session-note">此次审查结果在本次会话内有效；跨重启保留即将开通。</p>
          </div>
        );
      }
      if (view !== 'revision' && view !== 'artifact') {
        return emptyWorkbench('该工作面暂不适用于合同审查');
      }
      // riskList 已产出（revision）或 artifact 面：落到下方与 demo 共享的分支。
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
            caseRoot={demoCaseRoot ?? ''}
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
          onOpenDocx={draftFrozen ? () => openCaseOutputDocx(DRAFT_OUTPUT_FILE) : undefined}
        />
      );
    }
    if (view === 'artifact') {
      if (!artifactViewEntry) return emptyWorkbench('暂无待展示的结构化产出');
      return (
        <ArtifactHostView
          artifactType={artifactViewEntry[0]}
          payload={artifactViewEntry[1]}
          packageRegistries={packageRegistries}
          hostRenderers={hostRenderers}
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
      nonAppliedPending={nonAppliedPending}
      confirmedNonAppliedIds={confirmedNonAppliedIds}
      onConfirmNonApplied={confirmNonApplied}
      onCancelNonApplied={cancelNonApplied}
    />;
  };

  const pane = (view: WorkbenchView, secondary = false) => <section className="workbench-pane" data-pane={secondary ? 'secondary' : 'primary'}>
    <header className="pane-head">
      {secondary
        ? <label><span>Compare</span><select aria-label="Comparison view" value={view} onChange={(event) => setSecondaryView(event.target.value as WorkbenchView)}>{visibleViews(hasArtifactView).map((candidate) => <option value={candidate} key={candidate}>{VIEW_LABELS[candidate]}</option>)}</select></label>
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
  // PILOT-LIVE-1 D：previewOpen 开原件/结构化视图时不得继续用 rails-compact 窄轨压 Preview
  // （左收 + 全折 + Preview 开的组合此前会把 Preview 面板压进 280~320px 窄轨——错态）。
  const compactLayout = effectiveLeftCollapsed && !previewOpen && !moduleOpen.progress && !moduleOpen['working-folders'] && !moduleOpen.context
    && !moduleOpen.timeline && !moduleOpen.graph && !moduleOpen.matrix && !moduleOpen.revision && !moduleOpen.draft;
  // PILOT-LIVE-1 D：右栏默认窄态——Preview 未开时右栏只需容纳 Progress/Working folders/Context
  // 摘要，不应常驻与主内容同级宽度（旧缺陷：DEFAULT_MODULE_OPEN.progress=true 致 compactLayout
  // 事实上恒不触发，右栏恒宽）。排除 welcome/comparing/focus-mode/right-collapsed——那些态右栏
  // 或不存在、或另有专属网格，不应叠加窄态类。
  const rightNarrow = viewSegment === 'work' && !isWelcome && !rightCollapsed && !focusMode && !comparing && !previewOpen;

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
      body: <ContextModuleBody
        usage={usage}
        usageDetail={usageDetail}
        attachmentSources={attachmentSources}
        modelLabel={modelDisplayName(modelConfig)}
        modelConnected={credentialStatus.connection.phase === 'ready'}
        reasoningLabel={modelConfig.reasoning === 'deep' ? CHROME_COPY.composer.deep : CHROME_COPY.composer.standard}
        onOpenModelConfig={() => setModelConfigOpen(true)}
        continuation={isDemoCase && usage >= 85
          ? {
              done: continued,
              onContinue: () => {
                if (!fixtureRef) return;
                void workFixture.continuation.continueSession(fixtureRef).then(() => setContinued(true));
              },
            }
          : undefined}
      />,
    },
  ];

  /** composer 浮卡（chat/work 共用；onSend 与 workmode=viewSegment 同源由调用方注入）。 */
  const renderComposer = (onSend: (payload: ComposerSendPayload) => boolean | void, requestPending = false, disabledReason?: string) => (
    <div className="composer-stack">
      {/* 2026-07-12 修：外卡退役（双层框收一层），框只在 shell 整卡 */}
      <div className="composer-float">
        <Composer
          cases={cases.map((item) => ({ id: item.id, name: item.title, kind: item.kind ?? 'case' }))}
          activeCaseId={selectedCaseId ?? undefined}
          onSend={onSend}
          onContainerize={handleContainerize}
          onAddFolder={authorizeCaseFolder}
          viewSegment={viewSegment}
          onSegmentChange={switchSegment}
          modelConfig={modelConfig}
          modelConfigOpen={modelConfigOpen}
          connectionPhase={credentialStatus.connection.phase}
          onToggleModelConfig={() => {
            if (credentialStatus.connection.phase === 'ready') setModelConfigOpen((open) => !open);
            else void probeCredentials().then((status) => {
              if (status.connection.phase === 'ready') setModelConfigOpen(true);
              else openCredentialSurface();
            });
          }}
          onModelConfigChange={updateModelConfig}
          onCloseModelConfig={() => setModelConfigOpen(false)}
          requestPending={requestPending}
          disabledReason={disabledReason}
        />
      </div>
      <p className="composer-disclaimer" data-testid="composer-disclaimer">
        Courtwork is an agent and can make mistakes. Please double-check responses.{' '}
        <a href="mailto:feedback@courtwork.local?subject=Courtwork%20feedback">Give us feedback</a>
      </p>
    </div>
  );

  const workTraceView = processTraceFromWorkProjection({ ...session, phase: workPhase });
  const workStopped = workTraceView.state === 'failed';

  return (
    <main className="app-shell" data-testid="workbench" data-credential-probed={credentialProbed ? 'true' : 'false'} data-compact={compactLayout ? 'true' : 'false'}>
      {(focusMode || effectiveLeftCollapsed) && <WindowChrome
        detached
        leftCollapsed={effectiveLeftCollapsed}
        onToggleLeft={() => effectiveLeftCollapsed ? exitCompactLeft() : setLeftCollapsed(true)}
        onSearch={() => setPaletteOpen(true)}
      />}
      <div
        className={`workspace ${viewSegment === 'chat' ? 'chat-segment' : ''} ${isWelcome ? 'welcome-mode' : ''} ${comparing ? 'comparing' : ''} ${focusMode ? 'focus-mode' : ''} ${effectiveLeftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''} ${compactLayout ? 'rails-compact' : ''} ${rightNarrow ? 'right-narrow' : ''}`}
        data-view-segment={viewSegment}
        data-testid="workspace"
        data-comparing={comparing ? 'true' : 'false'}
        data-focus-mode={focusMode ? 'true' : 'false'}
        data-left-collapsed={effectiveLeftCollapsed ? 'true' : 'false'}
        data-auto-left-collapsed={narrowRailRequired ? 'true' : 'false'}
        data-right-collapsed={rightCollapsed ? 'true' : 'false'}
        data-compact={compactLayout ? 'true' : 'false'}
        data-right-narrow={rightNarrow ? 'true' : 'false'}
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
            caseRoot={demoCaseRoot}
            materials={caseMaterials}
            onVerifyMaterial={verifyMaterial}
            archiveConfirmCaseId={archiveConfirmCaseId}
            invalidGrantIds={invalidGrantIds}
            onRemoveCase={removeCase}
            containerizeUnfiledId={containerizeUnfiledId}
            viewSegment={viewSegment}
            onSegmentChange={switchSegment}
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
            onCollapseLeft={() => setLeftCollapsed(true)}
            onSearch={() => setPaletteOpen(true)}
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
              /> : <span data-testid="titlebar-case-title"><button type="button" className="chat-case-title" data-testid="chat-case-title" title={`${selectedCase.title} · 双击编辑案件名称`} onDoubleClick={() => { setCaseTitleDraft(selectedCase.title); setEditingCaseTitle(true); }}>
                {selectedCase.title}
              </button></span>)}
              {isDemoCase && <span className="demo-badge" data-testid="demo-case-badge">{containerOriginLabel(true)}</span>}
              {selectedCase && <span className="stage-chip" data-testid="toolbar-stage">{stageLabel(flow, isDemoCase)}</span>}
              {isWelcome && <strong className="welcome-head-label">{CHROME_COPY.welcome.eyebrow}</strong>}
            </div>
            <header className="chat-case-head" data-testid="chat-case-head">
              <span className="spacer" />
            </header>
            {systemFeedback && <span className={`system-feedback chat-feedback ${systemFeedback.tone ?? (systemFeedback.ok ? 'ok' : 'error')}`} role="status" data-testid="system-open-feedback">{systemFeedback.message}</span>}
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
                caseBinding.kind === 'grant' && contractOutputExists ? (
                  // WORK-LIVE-1：grant 案合同审查 docx 终链的持久结果卡（写入走 grant 授权命令）。
                  // 「打开/在访达显示」在 grant 侧尚无宿主 reveal 命令（同 W8 材料侧边界），故为纯状态卡。
                  <div className="work-output-result" role="status" data-testid="work-output-docx">
                    <strong>{CONTRACT_OUTPUT_FILE}</strong>
                    <span>已写入本案「产出」目录</span>
                  </div>
                ) : (
                  <div className="empty-state" role="status" data-testid="conversation-empty">
                    {selectedCase.title} 刚建立，尚无对话记录 · 从场景按钮开始
                  </div>
                )
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
                      result={flow === 'S3'
                        ? contractOutputExists
                          ? 'risk-list=6 output=contract-review.docx'
                          : 'risk-list=6 gate=awaiting-review'
                        : 'timeline=47 parties=14 conflicts=4'}
                    />
                    <div className="turn-event-stream" data-testid="event-stream">
                      <TurnCard kind="event" icon="chevron-right" eyebrow={flow === 'S1' ? 'D20' : 'D04'} title={flow === 'S1' ? '卷宗整理已启动' : '合同审查已启动'} status="success" testId="turn-event-start" />
                      {session.progress.map((message, index) => (
                        <TurnCard key={`${message}-${index}`} kind="event" icon="chevron-right" eyebrow={String(index + 1).padStart(2, '0')} title={message} status={workStopped ? 'idle' : session.confirmation ? 'success' : 'active'} testId={`turn-event-progress-${index}`} />
                      ))}
                      {!workStopped && (session.confirmation || session.completed) && (
                        <TurnCard kind="event" icon="chevron-right" eyebrow="完成" title={flow === 'S3' ? '审阅提示已送达右侧工作面' : '事件与主体关系已完成交叉核对'} status="success" testId="turn-event-finish" />
                      )}
                    </div>
                    <TurnCard
                      kind="artifact"
                      icon="package"
                      eyebrow={flow === 'S3' ? 'R' : 'E'}
                      title={demoArtifactCard.title}
                      summary={demoArtifactCard.summary}
                      routeLabel={flow === 'S3' ? '打开修订预览' : '打开时间线'}
                      onOpen={() => {
                        previewDismissedContext.current = null;
                        setActiveView(flow === 'S3' ? 'revision' : 'timeline');
                        setPreviewOpen(true);
                      }}
                      copyText={`${flow === 'S3' ? 'R' : 'E'}\n${demoArtifactCard.title}\n${demoArtifactCard.summary}`}
                    />
                    {flow === 'S3' && contractOutputExists && (
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
                    {session.confirmation && interactionReplay && interactionReplay.state !== 'idle' && (
                      <InteractionTurnCard
                        view={interactionViewFromReplay(interactionReplay)}
                        onResolve={resolveInteraction}
                        onOpenSource={openInteractionSource}
                      />
                    )}
                    {session.confirmation && turnRecoveryError && (
                      <p className="turn-recovery-error" role="alert" data-testid="turn-recovery-error">{turnRecoveryError}</p>
                    )}
                    <MessageActions messageId="assistant-demo" text={demoArtifactCard.title} createdAt={assistantCreatedAt.current} />
                    <ProcessTrace view={workTraceView} />
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
              {workChatMessages.map((message, index) => message.role === 'user' ? (
                <div className="user-message" key={`work-chat-${index}`} data-testid="work-chat-user-message">
                  {message.text && <CollapsibleMessage lines={6}>{message.text}</CollapsibleMessage>}
                  {message.pasteBlocks?.map((block, blockIndex) => <PasteBlock key={blockIndex} text={block} />)}
                  {message.files.length > 0 && (
                    <div className="user-message-attachments">
                      {message.files.map((name) => <span key={name} title={name}>{name}</span>)}
                    </div>
                  )}
                  <MessageActions messageId={`work-chat-user-${index}`} text={message.text} createdAt={message.createdAt} />
                </div>
              ) : (
                <ChatAssistantMessage
                  message={message}
                  index={index}
                  latest={index === lastWorkAssistantIndex}
                  testIdPrefix="work-chat"
                  key={`work-chat-${index}`}
                />
              ))}
              {workChatRecoveryError && (
                <p className="chat-recovery-error" role="alert" data-testid="work-chat-recovery-error">{workChatRecoveryError}</p>
              )}
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
              {/* WORK-LIVE-1：grant（真实）案的合同审查入口 + 运行中取消控件（只取消当前活跃 Turn，ADR-010 决定一）。 */}
              {caseBinding.kind === 'grant' && !workRunning && (
                <button type="button" className="scene-primary" data-testid="scene-work-review" onClick={openWorkReview}>审查合同</button>
              )}
              {caseBinding.kind === 'grant' && workRunning && (
                <button type="button" className="scene-primary" data-testid="work-cancel" onClick={cancelWorkRun}>停止审查</button>
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
            {!isWelcome && renderComposer(
              handleComposerSend,
              workChatPending || workScenarioRunning,
              workScenarioRunning ? '合同审查正在运行；等待当前步骤完成后再继续提问。' : undefined,
            )}
          </section>
        )}

        {/* RP-2.11 chat 面：内存态轻画布（composer + 会话 + 存入桥接容器化仪式） */}
        {!focusMode && viewSegment === 'chat' && (
          <section className="conversation canvas-layer" data-testid="chat-canvas" data-segment="chat">
            <div className="chat-titlebar" data-tauri-drag-region>
              <strong className="chat-titlebar-label">{CHROME_COPY.segment.chat}</strong>
            </div>
            <header className="chat-case-head chat-mode-head" data-testid="chat-mode-head">
              <button
                type="button"
                className="quiet-button"
                data-testid="chat-history-toggle"
                aria-expanded={chatSessionsOpen}
                onClick={() => (chatSessionsOpen ? setChatSessionsOpen(false) : openSessionHistory())}
              >
                历史会话
              </button>
              <span className="spacer" />
              {!chatSessionsOpen && chatMessages.length > 0 && (
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
            {/* PILOT-LIVE-2 F 连带修：系统反馈原只挂 work 段——A 路由切 chat 后（上传入库回执/
                同名拒绝/写失败）反馈静默丢失（不变量 4）。两段互斥渲染，testid 运行时唯一。 */}
            {systemFeedback && <span className={`system-feedback chat-feedback ${systemFeedback.tone ?? (systemFeedback.ok ? 'ok' : 'error')}`} role="status" data-testid="system-open-feedback">{systemFeedback.message}</span>}
            {chatSessionsOpen ? (
              <SessionHistory
                sessions={sessionHistory}
                {...(sessionHistoryError ? { error: sessionHistoryError } : {})}
                onClose={() => setChatSessionsOpen(false)}
              />
            ) : (
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
                  <ChatAssistantMessage
                    message={message}
                    index={index}
                    latest={index === lastAssistantIndex}
                    onStop={chatPending && message.turn.status === 'running' ? stopChatTurn : undefined}
                    onRetry={!chatPending && index === chatMessages.length - 1 ? retryChatTurn : undefined}
                    key={`chat-${index}`}
                  />
                )
              ))}
              {chatRecoveryError && (
                <p className="chat-recovery-error" role="alert" data-testid="chat-recovery-error">{chatRecoveryError}</p>
              )}
              {chatPending && !chatMessages.some((message) => message.role === 'assistant' && message.turn.status === 'running') && (
                <div className="chat-pending" data-testid="chat-pending">
                  <ProcessTrace
                    view={{ mode: 'reasoning', state: 'running' }}
                    actions={<button type="button" className="quiet-button chat-stop" data-testid="chat-stop" onClick={stopChatTurn}>Stop</button>}
                  />
                </div>
              )}
              <ScrollToLatest follow={chatFollow} />
            </div>
            )}
            {!chatSessionsOpen && renderComposer(handleChatSend, chatPending)}
          </section>
        )}

        {/* RP-2.5：通用能力栏与 Preview 双宿主；renderer 按声明挂载（work 面独有）。
            右栏收拢时整卡退出网格，展开动作由 app-shell 边缘锚点承接。 */}
        {viewSegment === 'work' && !isWelcome && !rightCollapsed && <section className="right-workbench" data-testid="right-module-stack" data-artifact-revision={artifactRevision}>
          {/* 批次七 #4：Focus 态藏收敛钮——布局位移后残留半角仍可点中,收起即主区全空白 */}
          {!focusMode && <button type="button" className="rail-seam-toggle" data-testid="collapse-right-rail" aria-label="Collapse inspector" title="Collapse inspector" onClick={() => setRightCollapsed(true)}><Icon name="panel-right" /></button>}
          {/* 十四章（2026-07-12 拍板）：四模块序 Progress→Preview→Working folders→Context;
              Preview 双态——大纲目录 ↔ 浏览器态（右列唯一,title/tab 条/schema 面三层封闭,back 回目录） */}
          {!previewOpen && <RightRailModules
            modules={utilityItems}
            outline={visibleViews(hasArtifactView).map((view) => ({ id: view, label: VIEW_LABELS[view], meta: viewCount(view, draftFrozen, isDemoCase, hasArtifactView) }))}
            previewOpenState={outlineOpen}
            onPreviewToggle={() => setOutlineOpen((open) => !open)}
            onOpenOutline={(viewId) => {
              setReaderDoc(null);
              previewDismissedContext.current = null;
              manualPreviewSelected.current = true;
              choosePrimaryView(viewId as WorkbenchView);
            }}
            // READER-ISOLATION-1（不变量 7 UI 面）：演示语料阅读入口只属 demo 案——真实案的
            // 原件预览归 FILE-PREVIEW-1（真实材料 + reading-view 派生），此处诚实缺席不留空壳。
            readerEntries={isDemoCase ? [
              { name: '设备采购合同', onOpen: () => { previewDismissedContext.current = null; manualPreviewSelected.current = true; setReaderDoc({ name: '设备采购合同', markdown: contractSourceMd }); setPreviewOpen(true); } },
              { name: '催告函', disabled: true },
              { name: '验收记录扫描件', disabled: true },
            ] : []}
          />}
          {previewOpen && <WorkbenchPreviewRenderer
            onBack={() => { previewDismissedContext.current = `${selectedCaseId}:${flow ?? 'none'}`; setPreviewOpen(false); setReaderDoc(null); }}
            title={readerDoc ? readerDoc.name : comparing ? '工作面对照' : VIEW_LABELS[activeView]}
            meta={readerDoc ? '原件 · 只读' : comparing ? '双面' : viewCount(activeView, draftFrozen, isDemoCase, hasArtifactView)}
            tabs={visibleViews(hasArtifactView).map((view) => ({ id: view, label: VIEW_LABELS[view] }))}
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
                      // 语料 md 行内语法仅 **强调** 一种；focus mark 住在同一 renderer 内，星号不会漏出。
                      return (
                        <p key={index} data-focus-source={readerDoc.focusAnchor?.quote && trimmed.includes(readerDoc.focusAnchor.quote) ? 'true' : undefined}>
                          {renderReaderInline(trimmed, readerDoc.focusAnchor?.quote, readerFocusRef)}
                        </p>
                      );
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
        </section>}
      </div>
      {!focusMode && viewSegment === 'work' && !isWelcome && rightCollapsed && (
        <button
          type="button"
          className="workspace-edge-control right-edge-control"
          data-testid="expand-right-rail"
          aria-label="Expand inspector"
          title="Expand inspector"
          onClick={() => setRightCollapsed(false)}
        >
          <Icon name="panel-right" />
        </button>
      )}

      {compileOpen && <div className="modal-backdrop" role="presentation"><section className="compile-dialog" role="dialog" aria-modal="true" aria-labelledby="compile-title"><h2 id="compile-title">编译为 Word 文档</h2><p>定稿后，本画布将转为只读存档。后续修改将在文书修订中逐条处理，无法返回起草状态。</p><div><button className="quiet-button" disabled={compilePending} onClick={() => setCompileOpen(false)}>取消</button><button className="primary-button" data-testid="confirm-draft-compile" disabled={compilePending} onClick={confirmDraftCompile}>{compilePending ? '正在写入…' : '确认定稿并编译'}</button></div></section></div>}

      <ProviderSetup
        open={providerSetupOpen}
        allowSkip={credentialStatus.connection.phase !== 'ready'}
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
      <NewCaseDialog
        open={newCaseOpen}
        onClose={() => setNewCaseOpen(false)}
        onCreate={createCaseWithFolder}
        onAuthorizeFolder={() => hostAuth.authorizeFolder()}
      />
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
        onFeedback={showSystemFeedback}
        hostAuth={hostAuth}
      />
    </main>
  );
}

function viewCount(view: WorkbenchView, draftFrozen: boolean, isDemo: boolean, hasArtifactView: boolean) {
  if (view === 'artifact') return hasArtifactView ? '已生成' : '尚无';
  if (!isDemo) return '尚无';
  if (view === 'timeline') return '47 件';
  if (view === 'graph') return '14 · 15';
  if (view === 'matrix') return '10 × 7';
  if (view === 'revision') return '4 处';
  return draftFrozen ? '已定稿' : '起草中';
}
