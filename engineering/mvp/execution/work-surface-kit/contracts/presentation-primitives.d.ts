// WO-WK9 · presentation primitives（WK-34 / WK-37 定名；WO-PG-01 按 WK-148 以代码为准收敛）
// 只供 app/web 与 fixture；不进 app/runtime。组件不认识 provider、Expert 或数据库（boundaries §5）。
//
// WK-34 当初列的六种里，RunSummary / FileList / WorkspaceList 三种的 adapter 从未实现，
// 且 WK-148 (c) 裁定不要求实现（那三类对象由 view 直读 DTO，是既定架构）；Heatmap 一节写的
// 是端点未建时的目标形状，而 `GET /work-activity` 已上线、Home 已用 `toHomeActivity` 渲染真
// heatmap。三节与四个未实现签名已按事实删除，不留占位。本文件现在只描述实际发运的东西。
//
// 四条贯穿全文件的规则：
//   1. 时间：服务端全部时间字段是 `new Date().toISOString()` 产生的 UTC ISO 字符串（store.mjs:25），
//      系统内无一处携带 timezone 元数据。adapter 原样传 UTC ISO；组件按浏览器本地时区显示。
//      任何"多久之前"都是推断，不由 adapter 生成，也不由组件生成（ux-conventions §3）。
//   2. 缺失：缺失一律是显式的 null 或 undefined，永不折叠为 0 或空串。组件对缺失渲染
//      `missingLabel`，不渲染数字（`usage.missing === true` 时另加 "At least" 前缀，api-v6 §usage）。
//   3. 动作：primitive 只发出打开类 intent。没有任何 primitive 发出写入、批准、接受或取消。
//      answer / allow / deny 属 ReviewProjection（contracts/review-projection.d.ts），不在本文件。
//   4. 投影不得创造事实（WK-139 (c)）：没有 unit / scope / timezone 就不投影，形态只能弱于
//      事实的强度。启发式估算不画成余量刻度，不确定的执行不画成完成度——这条的机械可查部分
//      由 `tools/lint-interaction.mjs`（WK-140 / WK-146）守住，其余由评审承担。
//
// 辖区：本契约只覆盖 Home 与 Usage 的 adapter。`inspector.mjs` / `workspace-view.mjs` /
// `runtime-view.mjs` / `telemetry-view.mjs` 等 view 直读 DTO 是既定架构，不要求把 adapter 层
// 扩张到 RunSummary / FileList / Workspace（WK-148 (c)）；上面四条规则对那些 view **同样适用**，
// 只是由评审而非类型承担。Usage 一侧的纯函数今日住在 `app/web/usage-projection.mjs`
// （`modelSeries` / `validUsageDetails`），本文件不为其冻结形状。

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
 * StatTile 不发出写入或业务 intent。它可以发出一个 filter intent，且只针对自己那一个
 * 集合：WO-WK13 之后"按集合筛选下带"是产品内真实存在的能力（tile 按下 → 下带只留该集合，
 * `aria-pressed` 表达状态，`Show all` 复位），因此可点的 tile 不再承诺不存在的动作
 * （SH-4 "普通信息没有可点击的假外观"仍成立：能力先有，外观才有）。
 * 筛选目标由宿主按 tuple 次序接管（0/1/2 → pendingItems / sessionCandidates /
 * inspectionCandidates），tile 自身不路由、不 fetch、不持有集合以外的状态。
 * 它仍不发出 open / answer / allow / deny：那些属 ReviewProjection。
 */
export type StatTileProps = StatTileInput;

/* ────────────────── 2. Home 读投影（已发运，WK-148 (b)） ──────────────────
 * WK-94 之后 `GET /work-activity` 已上线，Home 的 Activity 卡渲染的是真 heatmap，
 * 不再有 "Planned · Backend pending" 文字行。此处按 `app/web/presentation-adapters.mjs`
 * 的实际返回收敛：**以代码为准**（WK-148 (a)）。三个函数的失败态一律是 `null` ——
 * 不支持的 schemaVersion、内部不自洽的包，都不投影（规则 4），由 view 渲染缺失态。 */

/** Home Activity 一格。`count` 是该 UTC 日的 retained run 数；`level` 是绝对固定刻度
 *  （0 / 1 / <4 / <8 / 其余），不是分位数——Usage 的相对分位是同一 projection class 下
 *  另一条合法语义分支（WK-149 (d)），两者不共用算法。 */
export interface HomeActivityBucket {
  /** 'YYYY-MM-DD'，UTC 日界，由服务端 `interval.start` 逐日推出，adapter 不重切。 */
  date: string;
  /** 已记录 run 数。0 是"已确认的零"，不是"该日无数据"——覆盖率由 `coverage` 一句承担。 */
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** 读屏名，逐格自带日期、计数与时区，例 '2026-09-09 · 3 retained runs (UTC)'。 */
  label: string;
}
/** `GET /work-activity` → Home Activity 卡。校验不过时返回 `null`，绝不部分渲染。 */
export interface HomeActivityProjection {
  /** 服务端自己的读取时刻，UTC ISO，原样透传（规则 1）。 */
  observedAt: UtcInstant;
  /** 各 bucket 之和，且必须等于服务端 `recordedRunCount`，否则整包作废。 */
  total: number;
  /** = `interval.days` = `buckets.length`。 */
  days: number;
  /** 口径披露句，固定为 'UTC · Retained runs only. Deleted-chat history is unknown.'。 */
  coverage: string;
  buckets: HomeActivityBucket[];
}

/** Attention 五态。取值域即 `attentionLabels` 的键，前端不新增状态。 */
export type AttentionStatus = 'investigating' | 'needs_you' | 'waiting' | 'later' | 'resolved';
/** 五态 → 可见文案的唯一映射表，与 adapter 同文件导出。 */
export const attentionLabels: Record<AttentionStatus, string>;

/** Attention 列表的一行。只搬运已记录字段；grant 与 action descriptor 不进投影。 */
export interface HomeAttentionItem {
  id: string;
  title: string;
  status: AttentionStatus;
  label: string;
  revision: number;
  updatedAt: UtcInstant;
}
export interface HomeAttentionProjection {
  /** 服务端口径为 `disclosure.count_scope === 'visible'`，adapter 不另行聚合。 */
  count: number;
  offset: number;
  /** 还有未显示时才非 null，且必须 = offset + items.length（否则整包作废）。 */
  nextOffset: number | null;
  items: HomeAttentionItem[];
}

/** Attention 详情。**字段名照录实现现状**：本形状保留服务端的 snake_case
 *  （`next_action` / `due_at` / `updated_at`），而上面的 `HomeAttentionItem` 改写成了
 *  camelCase（`attention_id` → `id`、`updated_at` → `updatedAt`）。同一个 adapter 文件里两
 *  种命名并存是事实，不是本契约的规定；要不要收敛留裁定（WO-PG-01 §5 登记）。 */
export interface HomeAttentionDetailProjection {
  descriptor: { title: string; summary: string | null };
  status: AttentionStatus;
  reason: string;
  next_action: {
    kind: 'inspect' | 'decide' | 'wait' | 'follow_up' | 'none';
    label: string;
    trigger: 'manual' | 'at' | 'after' | 'external';
    /** trigger 为 'at' 时必有；UTC ISO 原样透传，不算"还有多久"。 */
    due_at: UtcInstant | null;
  };
  updated_at: UtcInstant;
  revision: number;
  freshness: 'current' | 'unknown';
}

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

/* ── 3b. 另两集合的行输入（WK-86 (3)，契约补记 WO-WK13 已实现的形状） ──
 * 本节不是新能力：`toPendingRows` / `toInspectionRows` 已在
 * `app/web/presentation-adapters.mjs` 落地，此处把签名收进契约。两者只搬运
 * **已记录字段**——响应里没有的一律不出现，缺失一律显式 null（规则 2）。
 * 不复用 `WorkCardInput` 的原因：pendingItems 没有 title 也没有 run 状态，把它写成
 * WorkCard 就得用 `missingRunLabel` 承载 'Permission requested'，那等于声称"没有 run"，
 * 而事实是"有一个未决问题"。 */

/** work-summary.pendingItems 的一行 = 一个未决问题或未决写入授权。 */
export interface PendingRowInput {
  sessionId: string;
  projectId: string;
  /** 经 GET /projects 解析；未解析成功时为 null（可见处写条件句，不写 'Project'）。 */
  projectName: string | null;
  /** 取自 sessionCandidates 同 sessionId 的 title；该集合未带此会话时宿主传 'Open session'。 */
  title: string;
  runId: string;
  questionId: string;
  kind: 'ask_user' | 'permission';
  /** 服务端自己的请求词，原样传递；客户端不由 kind 反推，也不点名工具。 */
  label: string;
  createdAt: UtcInstant;
}

/** work-summary.inspectionCandidates 的一行 = 一个已记录 failed / unknown 的 run。 */
export interface InspectionRowInput {
  sessionId: string;
  projectId: string;
  projectName: string | null;
  title: string;
  runId: string;
  /** failed 与 unknown 不合并：unknown 不是已确立的失败，是 Host 无法报告的结果（FN-28）。 */
  status: 'failed' | 'unknown';
  /** run 未记录错误码时为 null。 */
  errorCode: string | null;
  runStartedAt: UtcInstant | null;
  runEndedAt: UtcInstant | null;
  resultAt: UtcInstant | null;
}

/* ────────────────────────── adapter 签名 ──────────────────────────
 * adapter 是唯一知道端点形状的地方；它把真实查询结果变成上面的输入，并在这里、
 * 而不是在组件里，固定指标定义、时间窗口、时区、范围与缺失值（boundaries §5）。
 * 全部 adapter 是纯函数：不 fetch、不缓存、不排序覆盖服务端的公开排序契约。 */

/** `GET /work-summary` 的响应形状（EX-WK5 §1；此处只列 adapter 用到的部分）。 */
export interface WorkSummaryResponse {
  /** 已记录字段逐字照录（work-summary.mjs）；本文件不为其新增任何字段。 */
  pendingItems: PageFacts & {
    items: Array<{
      projectId: string;
      sessionId: string;
      runId: string;
      questionId: string;
      kind: 'ask_user' | 'permission';
      /** 服务端自己的请求词：'Permission requested' / 'Answer requested'。 */
      label: string;
      createdAt: UtcInstant;
    }>;
  };
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
  inspectionCandidates: PageFacts & {
    items: Array<{
      projectId: string;
      sessionId: string;
      runId: string;
      status: 'failed' | 'unknown';
      startedAt: UtcInstant | null;
      endedAt: UtcInstant | null;
      errorCode: string | null;
      resultAt: UtcInstant | null;
    }>;
  };
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

/** work-summary.pendingItems → 下带 Waiting for you 段的行。只搬运已记录字段（WK-86 (3)）。 */
export function toPendingRows(
  summary: WorkSummaryResponse,
  projects: ProjectRef[],
): { items: PendingRowInput[]; page: PageFacts | null };

/** work-summary.inspectionCandidates → 下带 Needs a look 段的行。只搬运已记录字段（WK-86 (3)）。 */
export function toInspectionRows(
  summary: WorkSummaryResponse,
  projects: ProjectRef[],
): { items: InspectionRowInput[]; page: PageFacts | null };

/* ── Home 读投影的三个签名（WK-148 (b)，逐字对照 presentation-adapters.mjs 现状） ──
 * 三者都是纯函数，且都以 `null` 表达"这一包不可投影"：schemaVersion 不认、时区不是 UTC、
 * bucket 与 interval 不自洽、分页事实自相矛盾，一律不渲染半张面（规则 2 / 规则 4）。 */

/** `GET /work-activity` → Home Activity 卡。`expectedDays` 是调用方按当前档位（28 / 84）
 *  给出的期待天数，用于拒绝一包"档位不对"的响应；传 null 表示不作此校验。 */
export function toHomeActivity(
  data: unknown,
  expectedDays?: number | null,
): HomeActivityProjection | null;

/** Attention 列表响应 → Home Attention 段。 */
export function toHomeAttention(data: unknown): HomeAttentionProjection | null;

/** 单条 Attention 响应 → 详情。只出显示字段；grant 与 action descriptor 永不成为控件。 */
export function toHomeAttentionDetail(data: unknown): HomeAttentionDetailProjection | null;
