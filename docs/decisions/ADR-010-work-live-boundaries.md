# ADR-010：Work live 的材料、状态与命令边界

- 状态：Accepted
- 日期：2026-07-14
- 来源：`5395e06e45389442a52dca77704ea09d5e1e249e`、`1e08c93a7b42f7ba943253a3a928de4a605b1f1d`
- 关系：细化 ADR-009 的 `WORK-LIVE-1`，不替代其 Turn/Package/Host 决定

## 背景

VIEW-ABI-1/1C 与 TURN-WORK-1 已经成立，但当前 desktop 仍不能诚实地把 demo client 换成真实
Scenario executor：

1. React 模块顶层固定构造 recording client，尚无注入式 Work command/projection port；
2. 新建案件只留下名称和文件数，原件 bytes、宿主授权、哈希与 ReadingView blocks 均未进入案件材料库；
3. core Work stores 是同步接口，file adapter 又直接依赖 `node:*`，不能把异步 Tauri `invoke` 冒充同步持久；
4. `legal.S3` 虽是唯一已经完成 quote → resolver 的安全 live 候选，却缺主体输入、真实
   `party-verify` 装配和逐条处置到 core resume 的确定映射；
5. 当前确认后 docx 编译仍引用 demo 原文，直接接真实 RiskList 会造成跨案件串料。

因此 `WORK-LIVE-1` 不是一张普通接线单。绕过这些缺口只能得到“当前 WebView 可跑一次”的假 live，
不能支持切案、重启、确认续行或回到同一原件。

## 决定一：先固定 UI port，不让 React 构造运行输入

跨 UI 的最小数据契约如下：

```ts
type WorkSessionRef = {
  caseId: string;
  sessionId: string;
};

type WorkModelRoute = {
  providerId: string;
  modelId: string;
  reasoning: 'standard' | 'deep';
};

type StartWorkCommand = {
  commandId: string;
  caseId: string;
  scenarioId: string;
  materialRefs: string[];
  modelRoute: WorkModelRoute;
};

type ResumeWorkCommand = WorkSessionRef & {
  commandId: string;
  requestId: string;
  decision: 'confirm' | 'reject';
  revisions?: RevisionInput[];
};

type CancelWorkCommand = WorkSessionRef & {
  commandId: string;
};

type WorkProjectionPhase =
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'interrupted';

type WorkCommandOutcome =
  | { status: 'completed'; ref: WorkSessionRef }
  | { status: 'paused'; ref: WorkSessionRef; requestId: string }
  | {
      status: 'failed';
      ref: WorkSessionRef;
      reason: 'provider' | 'invalid_output' | 'runtime_limit' | 'configuration' | 'internal';
      message: string;
      retryable: boolean;
    }
  | { status: 'canceled'; ref: WorkSessionRef };

interface WorkProjectionPort {
  replay(
    query: WorkSessionRef & { afterSeq?: number },
  ): Promise<{ ref: WorkSessionRef; phase: WorkProjectionPhase; events: SessionEvent[] }>;
}

interface WorkCommandPort {
  start(
    command: StartWorkCommand,
    publish: (event: SessionEvent) => void,
  ): { sessionId: string; done: Promise<WorkCommandOutcome> };
  resume(
    command: ResumeWorkCommand,
    publish: (event: SessionEvent) => void,
  ): Promise<WorkCommandOutcome>;
  cancel(command: CancelWorkCommand): Promise<
    | { accepted: true }
    | { accepted: false; reason: 'not_running' | 'already_requested' }
  >;
}
```

- UI 只提交 case/scenario/material refs、冻结后的 model route 与人工决定；不得构造
  `ScenarioRunInput`、`inputArtifacts`、`toolInputs`、provider、schema 或系统锚点。
- `ScenarioRunInput` 只能由受信 composition binding 依据已准入 package 与 MaterialStore 构造。
- actor 由 desktop identity dependency 注入，React 不能自报 actor。
- `commandId` first-wins：同 id + 同规范化 payload 返回既有结果；同 id + 不同 payload 返回
  `command_conflict`，不得覆盖。
- 一次 start 创建一枚新 `sessionId`；resume 沿用原 session。rerun 必须重新 start，不能复用旧终态身份。
- scenario、package/schema snapshot 与 model route 在 start 时冻结；resume 不接受 UI 改传。
- 第一版每个 case 只允许一个 active Work command；不支持并行 agent/subagent 或自动 retry。
- cancel 只承诺取消当前活跃 Turn；没有活跃 Turn 时不得伪报成功。
- reload 后无终态、无 pending confirmation 的残缺 session 投影为 `interrupted`，绝不继续显示 running。

`WORK-PORT-1` 只落上述类型、App 注入缝和 fixture/live 物理分界，不实现 live。demo recording、paced
replay、硬编码 gate 与 demo telemetry 必须留在显式 fixture adapter；非 demo case 不得把 fixture 当 fallback。

## 决定二：Work 状态仍是一条 SessionEvent 账本，但宿主持久必须可等待

生产状态信封固定为：

```ts
type WorkStateEnvelopeV1 = {
  storageVersion: 1;
  revision: number;
  caseId: string;
  sessionId: string;
  chainId: string;
  predecessorSessionId?: string;
  scenarioId: string;
  packageId: string;
  packageVersion: string;
  schemaVersion: number;
  scenarioFingerprint: string;
  modelRoute: WorkModelRoute;
  materialRefs: string[];
  createdAt: string;
  events: StoredSessionEvent[];
  turnEntries: TurnJournalEntry[];
  pendingConfirmations: PendingConfirmation[];
  revisionEvents: RevisionEvent[];
};
```

这只是既有 Work 账本的持久容器，不是第二套 Work journal。不得保存 secret、endpoint、provider 实例、
AbortSignal、流式 delta 或 UI 临时处置态。

宿主只提供 case-scoped opaque blob 的 read/CAS；Rust 不解析法律 schema 或 Work 事件：

```ts
interface WorkStateHostPort {
  read(ref: WorkSessionRef): Promise<
    | { found: false }
    | { found: true; version: string; bytes: Uint8Array }
  >;
  compareAndSwap(input: {
    ref: WorkSessionRef;
    expectedVersion: string | null;
    bytes: Uint8Array;
  }): Promise<{ applied: boolean; version: string }>;
}
```

TS runtime 独占 envelope 校验、事件状态机与 CAS 重试；Rust 只强制 app-data scope、id 形状、大小上限、
符号链接/路径穿越隔离和原子替换。localStorage 不得充当生产 Work store：pending 内含材料快照，容量、
跨进程 first-wins 与原子性均不足。

core 需要异步、可等待的 durable store 边界。以下顺序是契约，不是性能建议：

1. session header 成功持久后才能执行工具或调用 provider；
2. `turn_linked` 成功持久后才能调用 Turn；
3. Turn terminal 成功持久后才能解析并发布 artifact；
4. pending confirmation 成功持久后才能发布 `confirmation_requested`；
5. resume 必须 validate-before-consume，并使条件消费与 `confirmation_resolved` 成为同一 CAS 状态转换；
6. revision 载荷成功持久后才能发布 `revision_recorded`。

不得用 fire-and-forget、命令结束批量 flush 或同步内存真源 + 异步镜像绕过上述顺序。

## 决定三：持久 artifact 必须使用版本信封

```ts
type ArtifactEnvelope = {
  packageId: string;
  typeId: string;
  schemaVersion: number;
  payload: unknown;
};
```

production `StoredSessionEvent` 的 `artifact_produced` 只存 `ArtifactEnvelope`，不并存第二份裸
`artifactType + artifact` 真源。读侧先按 package/schema version 迁移并校验，再投影成 UI 的
`SessionEvent`；未知版本、缺 migration、迁移后不合 schema 均隔离该 contribution，禁止 raw JSON fallback。
fixture recording 可在 fixture adapter 内一次性上转换，但不能成为生产迁移规则。

Work 终局另作以下收口：

```ts
type ScenarioFailedEvent = {
  type: 'scenario_failed';
  scope: 'scenario';
  reason: 'invalid_output' | 'runtime_limit' | 'configuration' | 'internal';
  message: string;
  retryable: false;
};
```

它取代当前无人消费的泛化 `error` 分支。provider failure/cancel 继续只认 model `step_failed`，不双记；
storage conflict、原件漂移或 envelope 损坏发生在合法落账前时作为 projection/command blocker，不伪写历史。

## 决定四：材料入口只传引用，绝对路径留在宿主

```ts
type MaterialRef = {
  materialId: string;
  caseId: string;
  fileName: string;
  mediaType: string;
  byteLength: number;
  contentSha256: string;
  readingViewVersion: string;
  readingViewSha256: string;
  status: 'ready' | 'needs_ocr' | 'rejected';
};
```

- Tauri folder/file picker 返回 opaque case/material id；绝对路径和授权只住 host。
- 原件只读；TS reading-view 从宿主读取受限 bytes，确定性产生 markdown、paragraphs/blocks、页码与版本哈希。
- `MaterialInput` 与 deterministic `CaseFile` 只从已持久、哈希一致的 MaterialRef/ReadingView 派生。
- provider 前重验原件/ReadingView hash；漂移、删除、需 OCR 或缺材料必须显式阻断，不读取 demo、不猜内容。
- Browser/E2E adapter 可保存测试 bytes，但必须只在 DEV + E2E 装配，不能进入正式 Tauri composition。

## 决定五：首个 live 场景是 S3，但须先闭合垂类 binding

S1 的 Timeline/PartyGraph 仍直接包含最终 SourceAnchor，不先作为 production live。S3 已有
RiskListDraft → quote resolver，但 `LEGAL-S3-BINDING-1` 必须先完成：

- 主体名称来自显式结构化 preflight/受控提问，不从案名、文件名、正文或模型猜测；
- 缺主体或 `party-verify` 未配置/未实现时显式阻断或发布既有 typed tool failure，禁止换 demo/mock；
- live gate projection 由 Legal host binding 基于真实 RiskList 和 package policy 构造，不复用 demo `GATES`；
- 单项 reject 映射为该风险 `/risks/<index>/dispositionStatus = 'rejected'` 的 RevisionInput；
- 单项 confirm 映射为 `confirmed`；`revise` 保持 pending 并进入编辑，不得当终态 resume；
- 只有全部条目形成合法 revisions 后，才以 core gate `decision='confirm'` 续行。core 整体
  `decision='reject'` 只表达终止整个场景，不能承载单项驳回；
- docx 编译的源文只能从本 session 冻结的 materialRef 读取并复验 hash；demo `contractSourceMd` 在非 demo
  case 的静态或动态消费都必须触红。

新增 executable runtime binding 仍由 host composition 拥有；package descriptor 不注入函数/React/CSS。

## 实施工单与依赖

```text
WORK-PORT-1
├─ WORK-BROWSER-1
│  └─ 拆 Node adapters，建立 @courtwork/core/work-protocol browser-safe 出口与静态门
├─ WORK-STORE-1
│  └─ async/CAS WorkState、ArtifactEnvelope、终局、迁移与 Tauri opaque blob host
└─ CASE-ROOT-1
   └─ 宿主目录授权与 opaque case ref
      └─ MATERIAL-INGRESS-1
         └─ 原件 hash、ReadingView blocks、MaterialRef 与 deterministic CaseFile

上述前置独立验收后
└─ LEGAL-S3-BINDING-1
   └─ 显式主体输入、tool input、gate projection 与逐条 revision mapping
      └─ WORK-LIVE-1
         └─ production run/replay/resume/cancel；recording 永久 fixture-only
```

WORK-BROWSER-1、WORK-STORE-1 与 CASE-ROOT-1 可在 WORK-PORT-1 验收后按不重叠文件面并行；
不得提前把 non-demo UI 标为 live。

## 验收下限

- Work browser graph 注入任意 `node:*` 必须触红；
- UI 直接构造 run input/tool input、按 `legal.*` 猜字段或改 actor 必须触红；
- case A 读取 case B 的 material/session/request 必须 fail closed；
- 延迟/拒绝 `turn_linked` 持久时 provider 必须尚未启动；
- pending 保存失败时不得出现 `confirmation_requested`；两个并发 resume 只能一笔成功；
- paused 后销毁 composition，重建后仍能 replay/resume；残缺 session 必须是 interrupted；
- 原件改一字节、删除或 ReadingView hash 漂移时 provider 前失败；
- 未知 schemaVersion/缺 migration 不得渲染 raw payload；
- `revise` 不得完成门禁，单项 reject 不得终止全场景；
- provider/validation/cancel 后不得再有 artifact 或 `scenario_completed`；
- 非 demo case 任何 recording、DEMO_ARTIFACTS、demo party adapter 或 demo 原文消费必须触红；
- desktop 行为变更除全仓门外，必须用隔离端口完整 Playwright；Tauri host 变化另跑 Rust 全量测试。

## 后果

Work live 被拆成可独立验收的窄边界，短期多三张前置工单，但避免把同步 Node demo runtime、WebView
临时状态或 demo 语料伪装成生产后端。React、通用 executor、垂类 binding 与 Tauri host 各自只拥有一层
事实；后续替换本地 host 或增加具名 provider 时不需要改 UI 与 schema 语义。
