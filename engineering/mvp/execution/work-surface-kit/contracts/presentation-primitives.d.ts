// WO-WK9 · presentation primitives（WK-34 限六种，WK-37 定名）
// 只供 app/web 与 fixture；不进 app/runtime。组件不认识 provider、Expert 或数据库（boundaries §5）。
//
// 三条贯穿全文件的规则：
//   1. 时间：服务端全部时间字段是 `new Date().toISOString()` 产生的 UTC ISO 字符串（store.mjs:25），
//      系统内无一处携带 timezone 元数据。adapter 原样传 UTC ISO；组件按浏览器本地时区显示。
//      任何"多久之前"都是推断，不由 adapter 生成，也不由组件生成（ux-conventions §3）。
//   2. 缺失：缺失一律是显式的 null 或 undefined，永不折叠为 0 或空串。组件对缺失渲染
//      `missingLabel`，不渲染数字（`usage.missing === true` 时另加 "At least" 前缀，api-v6 §usage）。
//   3. 动作：primitive 只发出打开类 intent。没有任何 primitive 发出写入、批准、接受或取消。
//      answer / allow / deny 属 ReviewProjection（contracts/review-projection.d.ts），不在本文件。

/* ────────────────────────── 共用 ────────────────────────── */

/** UTC ISO-8601 瞬时，例：'2026-09-09T08:31:04.220Z'。显示端换算为浏览器本地时区。 */
export type UtcInstant = string;

/** run 八态固定文案的枚举侧（ux-conventions §1）。unknown 只在 Host 报告时出现。 */
export type RunStatus =
  | 'created' | 'running' | 'waiting_user' | 'stopping'
  | 'completed' | 'cancelled' | 'failed' | 'unknown';

/** 文件读取类别，不是成果审批状态（api-v6 §Current file vs content version）。 */
export type FileReadKind = 'current' | 'content-version';

/**
 * 时间窗口。当前后端只能表达 'current'：work-summary 三集合是常驻状态的当下快照，
 * 没有"今日"过滤字段（EX-WK5 §1）。'day' 需要 gaps-wk9.md G-3 的端点先成立。
 */
export type TimeWindow =
  | { kind: 'current' }
  | { kind: 'day'; /** 日界所用时区；后端目前只保证 UTC。 */ zone: 'UTC'; day: string };

/** 指标覆盖范围。projectId 为 null 表示全部项目。 */
export interface MetricScope { projectId: string | null }

/**
 * 分页事实原样传递（work-summary 契约）。`truncated` / `hasMore` 为真时必须显示
 * "还有未显示"，不得显示"就这些"（ux-conventions §4）。
 */
export interface PageFacts {
  total: number;
  offset: number;
  limit: number;
  truncated: boolean;
  hasMore: boolean;
  nextOffset: number | null;
}

/** 读取失败与"没有内容"是两件事（ux-conventions §4，DC-1）。 */
export interface LoadState {
  loading: boolean;
  /** 面向人的失败说明；非 null 时组件渲染失败态与重试入口，绝不渲染空列表。 */
  error: string | null;
}

/* ────────────────────────── intent ──────────────────────────
 * 全部 intent 是"打开一个已存在的对象"。宿主负责路由、选择与焦点；
 * primitive 不自行导航、不自行 fetch、不持有 session 身份以外的状态。 */

export interface OpenSessionIntent {
  type: 'open-session';
  sessionId: string;
  /** 打开后落在哪个 kind 上；沿用既有三 kind 静态映射，不新增 kind。 */
  surface?: 'thread' | 'run' | 'file' | 'workspace';
}
export interface OpenRunIntent { type: 'open-run'; sessionId: string; runId: string }
export interface OpenFileIntent {
  type: 'open-file';
  sessionId: string;
  path: string;
  kind: FileReadKind;
  /** content-version 必填；current 时作为 expectedSha256 传入（inspector.mjs 现状）。 */
  sha256?: string;
  /** content-version 的来源 run。 */
  runId?: string;
}
export type PresentationIntent = OpenSessionIntent | OpenRunIntent | OpenFileIntent;
export type IntentSink = (intent: PresentationIntent) => void;

/* ────────────────────────── 1. StatTile ────────────────────────── */

/**
 * 一个已记录集合的当前计数。不是"今日"，不是趋势，不是业务量的证明（boundaries §5）。
 * 组件不做二次聚合、不做百分比、不与另一块 tile 相除。
 */
export interface StatTileInput {
  /** 可见标签，与 caption 一起完整表达指标定义。 */
  label: string;
  /** 缺失时为 null——不是 0。 */
  value: number | null;
  /** 缺失时的可见文字，例 'Not available'。 */
  missingLabel: string;
  /** 一行指标定义 + 范围 + 窗口，必填：数字本身不能自我解释（boundaries §5）。 */
  caption: string;
  window: TimeWindow;
  scope: MetricScope;
  /** 快照读到的时刻；用于"最后确认时间"，断连期间保留（ux-conventions §4）。 */
  observedAt: UtcInstant;
  load: LoadState;
}

/**
 * StatTile 不发出 intent：Home 上带是只读读数，产品内没有"按集合筛选下带"的能力，
 * 画一个可点的 tile 会承诺不存在的动作（SH-4 "普通信息没有可点击的假外观"）。
 */
export type StatTileProps = StatTileInput;

/* ────────────────────────── 2. Heatmap（gap） ────────────────────────── */

/**
 * gap: needs GET /work-activity（见 gaps-wk9.md G-1）。
 * 现状：没有跨会话的 run 列表端点，`sessionCandidates.latestRun` 每会话只折叠出一条，
 * 逐会话 `GET /sessions/:id` 是 N+1 且无时间过滤（EX-WK5 §1 末行）。
 * 因此本类型是端点成立后的目标形状，产品内当前只允许渲染 "Planned · Backend pending" 文字行。
 * 禁止用 latestRun 冒充按日计数（WK-37）。
 */
export interface HeatmapBucket {
  /** 日界所属日期，'YYYY-MM-DD'，按 `zone` 切分。 */
  day: string;
  /** 该日已记录 run 数。0 与 null 语义不同：0 = 确认无 run，null = 该日无数据。 */
  count: number | null;
}
export interface HeatmapInput {
  /** 计数口径的一句话说明，例 'Recorded runs started per day'。 */
  metric: string;
  /** 日界时区。后端只保证 UTC；显示端如需本地日界，须由端点另行支持，不在前端重切。 */
  zone: 'UTC';
  buckets: HeatmapBucket[];
  /** 强度轴上界；单一轴、灰阶（WK-36）。null 表示全部 bucket 为空。 */
  maxCount: number | null;
  scope: MetricScope;
  /** 读屏用的整体说明，例 '30 days, 0 to 12 recorded runs per day'。 */
  accessibleSummary: string;
  load: LoadState;
}
/** 端点成立前，宿主传 null，组件渲染 gap 文字行。 */
export type HeatmapProps = { input: HeatmapInput | null; plannedLabel: string };

/* ────────────────────────── 3. WorkCard ────────────────────────── */

/**
 * 一个可整体打开的会话对象。字段全部来自 `work-summary.sessionCandidates.items`
 * 与 `GET /projects`（EX-WK5 §1、§3）。不含相对时间、不含步骤、不含百分比。
 */
export interface WorkCardInput {
  sessionId: string;
  /** items[].title；为空时宿主传 'Open session'（home-view.mjs 现状）。 */
  title: string;
  /** items[].projectId 经 GET /projects 解析所得的名称；未解析成功时为 null。 */
  projectName: string | null;
  projectId: string;
  /** items[].latestRun.status；会话尚无 run 时为 null。 */
  runStatus: RunStatus | null;
  /** runStatus 为 null 时的可见文字，例 'No run recorded'——不得写成 'Completed'。 */
  missingRunLabel: string;
  /** latestRun.startedAt / endedAt，UTC ISO。running / waiting_user 时 endedAt 为 null。 */
  runStartedAt: UtcInstant | null;
  runEndedAt: UtcInstant | null;
  /** 两个 run 时间都缺失时的回退时间轴：items[].createdAt。 */
  sessionCreatedAt: UtcInstant;
  /** = max(createdAt, 全部 run 的 startedAt/endedAt)，work-summary 的排序键。 */
  recordedActivityAt: UtcInstant;
}
export interface WorkCardProps {
  input: WorkCardInput;
  /** 整卡（或整行）一次点击 → open-session。变体 A 与 B 共用同一 props。 */
  onIntent: IntentSink;
}

/* ────────────────────────── 4. RunSummary ────────────────────────── */

/** run.usage；`missing: true` 时全部数字是下限，显示 'At least N'，不显示为零。 */
export interface UsageInput {
  missing: boolean;
  input: number | null;
  output: number | null;
  cacheRead: number | null;
  cacheWrite: number | null;
  turns: number | null;
  /** 缺失字段的可见文字，例 'Not reported'。 */
  missingLabel: string;
}
/**
 * 最新一次 run 的 Results 与 Usage 摘要。不含步骤、不含进度条、不含百分比
 * （EX-WK5 §3：schema 无 step/stage 字段）。
 */
export interface RunSummaryInput {
  sessionId: string;
  runId: string;
  status: RunStatus;
  startedAt: UtcInstant | null;
  endedAt: UtcInstant | null;
  /** run.artifacts.length。成果未经 review 接受，措辞须保留这一点（A-3）。 */
  recordedFileCount: number;
  /** run.error；非 null 时整块用错误语言呈现（ux-conventions §4）。 */
  error: { code: string; message: string | null } | null;
  usage: UsageInput | null;
  load: LoadState;
}
export interface RunSummaryProps {
  input: RunSummaryInput;
  /** 卡上唯一的 open affordance → open-run。 */
  onIntent: IntentSink;
}

/* ────────────────────────── 5. FileList ────────────────────────── */

export interface FileEntryInput {
  path: string;
  bytes: number | null;
  /** content-version 必有 64 位十六进制；current 读取不返回 sha 时为 null。 */
  sha256: string | null;
  kind: FileReadKind;
  /** artifact.writtenAt（UTC ISO）；工作区当前文件用文件系统 mtime，语义不同，见 WorkspaceList。 */
  writtenAt: UtcInstant | null;
  /** content-version 的来源 run。 */
  runId: string | null;
}
/**
 * Current file 与 Recorded versions 必须分组呈现且措辞可区分（IC-1：
 * "打开当前文件"与"查看历史版本"不能只靠一个文件图标区分）。
 */
export interface FileListInput {
  sessionId: string;
  current: FileEntryInput | null;
  recordedVersions: FileEntryInput[];
  /** 两组都为空时的可见文字。 */
  emptyLabel: string;
  load: LoadState;
}
export interface FileListProps {
  input: FileListInput;
  /** 行点击与卡上 open affordance 均 → open-file，kind 随所在分组。 */
  onIntent: IntentSink;
}

/* ────────────────────────── 6. WorkspaceList ────────────────────────── */

export interface WorkspaceGroupInput {
  /** 目录名；根目录用 'Workspace root'（workspace-view.mjs 现状）。 */
  directory: string;
  entries: FileEntryInput[];
}
/**
 * `GET /sessions/:id/workspace` 的当前文件树，按目录分组，含 materials/ 与 out/。
 * 只反映当前文件系统状态，无版本历史；`mtime` 是文件系统时间，不等于 run 的 writtenAt。
 */
export interface WorkspaceListInput {
  sessionId: string;
  groups: WorkspaceGroupInput[];
  /** materials/ 的独立入口计数；无文件时为 0。 */
  materialsCount: number;
  emptyLabel: string;
  load: LoadState;
}
export interface WorkspaceListProps {
  input: WorkspaceListInput;
  /** 文件行 → open-file（kind: 'current'）；卡上 open affordance → open-session（surface: 'workspace'）。 */
  onIntent: IntentSink;
}

/* ────────────────────────── adapter 签名 ──────────────────────────
 * adapter 是唯一知道端点形状的地方；它把真实查询结果变成上面的输入，并在这里、
 * 而不是在组件里，固定指标定义、时间窗口、时区、范围与缺失值（boundaries §5）。
 * 全部 adapter 是纯函数：不 fetch、不缓存、不排序覆盖服务端的公开排序契约。 */

/** `GET /work-summary` 的响应形状（EX-WK5 §1；此处只列 adapter 用到的部分）。 */
export interface WorkSummaryResponse {
  pendingItems: PageFacts & { items: unknown[] };
  sessionCandidates: PageFacts & {
    items: Array<{
      projectId: string;
      sessionId: string;
      title?: string;
      createdAt: UtcInstant;
      recordedActivityAt: UtcInstant;
      latestRun?: { runId: string; status: RunStatus; startedAt: UtcInstant | null; endedAt: UtcInstant | null };
    }>;
  };
  inspectionCandidates: PageFacts & { items: unknown[] };
}
export interface ProjectRef { id: string; name: string }

/** work-summary → 上带三个 tile。observedAt 由宿主传入读取时刻，adapter 不调 Date.now()。 */
export function toStatTiles(
  summary: WorkSummaryResponse,
  context: { scope: MetricScope; observedAt: UtcInstant; load: LoadState },
): [StatTileInput, StatTileInput, StatTileInput];

/** work-summary → 下带卡片/行。变体 A 与 B 消费同一批输出。 */
export function toWorkCards(
  summary: WorkSummaryResponse,
  projects: ProjectRef[],
): { items: WorkCardInput[]; page: PageFacts };

/** run（`GET /runs/:runId` 或 session 内嵌 runs[]）→ 右栏 Run 卡。 */
export function toRunSummary(
  run: {
    id: string; sessionId: string; status: RunStatus;
    startedAt: UtcInstant | null; endedAt: UtcInstant | null;
    error?: { code: string; message?: string } | null;
    artifacts?: Array<{ path: string; bytes: number; sha256: string; kind: FileReadKind; writtenAt: UtcInstant }>;
    usage?: { missing?: boolean; input?: number; output?: number; cacheRead?: number; cacheWrite?: number; turns?: number };
  },
  load: LoadState,
): RunSummaryInput;

/** run.artifacts + 当前打开的文件引用 → 右栏 File 卡。 */
export function toFileList(
  run: { id: string; sessionId: string; artifacts?: Array<{ path: string; bytes: number; sha256: string; kind: FileReadKind; writtenAt: UtcInstant }> },
  current: { path: string; bytes: number | null; sha256: string | null } | null,
  load: LoadState,
): FileListInput;

/** `GET /sessions/:id/workspace` → 右栏 Workspace 卡。分组规则同 workspace-view.mjs。 */
export function toWorkspaceList(
  sessionId: string,
  tree: { files: Array<{ path: string; bytes: number; sha256: string; mtime: UtcInstant }> },
  load: LoadState,
): WorkspaceListInput;

/**
 * gap: needs GET /work-activity（G-1）。端点成立前不导出实现；宿主传 null 给 HeatmapProps。
 * 签名先冻结，避免端点上线时组件反过来定义指标口径。
 */
export function toHeatmap(
  activity: { zone: 'UTC'; days: Array<{ day: string; runCount: number }> },
  context: { metric: string; scope: MetricScope; load: LoadState },
): HeatmapInput;
