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
  | { status: 'canceled'; ref: WorkSessionRef }
  | {
      status: 'rejected';
      reason: 'command_conflict' | 'case_busy' | 'invalid_scope' | 'not_configured';
      message: string;
    };

type WorkReplayResult =
  | {
      found: false;
      ref: WorkSessionRef;
      phase: 'interrupted';
      events: SessionEvent[];
    }
  | {
      found: true;
      ref: WorkSessionRef;
      phase: WorkProjectionPhase;
      events: SessionEvent[];
      materialRefs: string[];
      sessionCreatedAt: string;
    };

interface WorkProjectionPort {
  replay(
    query: WorkSessionRef & { afterSeq?: number },
  ): Promise<WorkReplayResult>;
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

`WorkCommandPort` 是 browser-safe、同一进程 composition 内的 service port；`publish` callback 只用于进程内事件投影，不是 wire，也不得直接暴露给 IPC、插件或第二宿主。未来出现跨进程 gateway 或第二宿主时，必须另立等义、可序列化的 command/event wire，并保持身份、顺序、拒绝原因和终态语义一致。

- UI 只提交 case/scenario/material refs、冻结后的 model route 与人工决定；不得构造
  `ScenarioRunInput`、`inputArtifacts`、`toolInputs`、provider、schema 或系统锚点。
- `ScenarioRunInput` 只能由受信 composition binding 依据已准入 package 与 MaterialStore 构造。
- actor 由 desktop identity dependency 注入，React 不能自报 actor。
- `commandId` first-wins：同 id + 同规范化 payload 返回既有结果；同 id + 不同 payload 返回
  typed `rejected/command_conflict`，不得覆盖。已有 active command、scope 非法或 production composition 未装配时分别返回闭集中的 `case_busy`、`invalid_scope` 或 `not_configured`，不得抛裸 Promise rejection 或回退 demo。
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
  runtimeBudget: {
    limits: {
      maxSteps?: number;
      maxSeconds?: number;
      maxToolCalls?: number;
      maxUsd?: number;
    };
    costBasis: {
      currency: 'USD';
      priceTableVersion?: string;
      priceTableEffectiveAt?: string;
      assumptions: string[];
    };
    consumed: {
      steps: number;
      toolCalls: number;
      executionMs: number;
      estimatedUsd: number;
      costCoverage: 'complete' | 'partial';
    };
  };
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

`version` 由 host 在 CAS 成功时铸造为不透明、单调递增的 generation；它与信封内由 TS 状态机维护的
`revision` 相互独立。调用方不得用 mtime、内容 hash 或 `revision` 冒充 host version，以免合法回退、
规范化序列化或跨进程竞争造成 ABA 误判。

TS runtime 独占 envelope 校验、事件状态机与 CAS 重试；Rust 只强制 app-data scope、id 形状、大小上限、
符号链接/路径穿越隔离和原子替换。原子替换至少验证同目录临时文件落盘、rename 与目录项落盘；
macOS/APFS 实现还必须在真机证明文件与目录的 `F_FULLFSYNC` 实际发生，普通 `fsync` 或库级
`sync_all` 名称不能替代该证据。Windows/Linux 的对应耐久调用须在支持该平台时另行验证。localStorage 与 `tauri-plugin-store` 都不得充当生产 Work store：pending
内含材料快照，容量、跨进程 first-wins 与原子性均不足。

core 需要异步、可等待的 durable store 边界。以下顺序是契约，不是性能建议：

1. session header 成功持久后才能执行工具或调用 provider；
2. `turn_linked` 成功持久后才能调用 Turn；
3. Turn terminal 成功持久后才能解析并发布 artifact；
4. pending confirmation 成功持久后才能发布 `confirmation_requested`；
5. resume 必须 validate-before-consume，并使条件消费与 `confirmation_resolved` 成为同一 CAS 状态转换；
6. revision 载荷成功持久后才能发布 `revision_recorded`。

不得用 fire-and-forget、命令结束批量 flush 或同步内存真源 + 异步镜像绕过上述顺序。
若 `turn_linked` 已成功持久，但对应 Turn terminal 尚未持久就发生崩溃，本地无法证明 provider 请求是否
已经发出、计费或完成；恢复时必须把该 attempt 标为 interrupted，以全新 Turn/attempt 身份由用户重新发起，
不得自动重放、重连或假装续接同一次 provider 调用。

### v1 whole-envelope CAS 与测量门

v1 继续把完整 `WorkStateEnvelopeV1` 作为一次 CAS 的权威值。`events`、`turnEntries`、`pendingConfirmations` 与 `revisionEvents` 都是可审计历史，不得为了减小写入而压缩、覆盖或丢弃。`WORK-STORE-MEASURE` 与 `WORK-STORE-1` 同批必须记录实际 envelope bytes、CAS latency、write count 和 kill/crash 恢复窗口；在真实阈值触线前，不得自行换成 snapshot + tail，更不得手写 WAL。

若测量证明 whole-envelope 已触及产品阈值，必须另立 ADR，对成熟嵌入式存储与 snapshot/tail 方案进行比较，并说明迁移、原子性、损坏恢复和历史保留。研究报告中的复杂度推测不能直接改变 v1。

v1 是单机、单写者产品语义；CAS 只用于 first-wins、崩溃恢复与并发反例，不构成多人协作声明。多写者、共享状态、ACL、伦理墙和跨案治理必须后续另立 ADR。actor 仍必须由真实 identity dependency 注入，不能因单写者而硬编码。

### session 累计 runtime budget

`runtimeBudget.limits` 与 `costBasis` 在 start 时冻结，resume 不接受 UI 改传。`consumed.steps`、`toolCalls`、`executionMs` 与 `estimatedUsd` 对同一 Work session 跨 leg 单调累计，并和事件/终态一起 CAS；resume 不得创建新额度。暂停等待人工决定的墙钟时间不计入 `executionMs`，`maxSeconds` 以 `executionMs / 1000` 判定。

`estimatedUsd` 只累计同时具备 usage 与版本化 price 的已知子集，`costCoverage` 明示估算是否完整。缺 `priceTableVersion`、`priceTableEffectiveAt`，或任一 paid attempt 缺 usage/price，都令 coverage 为 `partial`。若配置了 `maxUsd`，不得把未知成本当作零或继续按已知子集放行下一次 paid Turn；必须在下一次调用前形成 `configuration` blocker，并在 UI 同时显示估算值、`costBasis.assumptions` 与覆盖不完整。steps/toolCalls/time 超限必须持久化为 `scenario_failed(reason='runtime_limit')` 并映射为 typed `WorkCommandOutcome`；成本覆盖不足映射 `scenario_failed(reason='configuration')` 与相应 failed outcome。两类都不得只抛异常、留下 running，或在下一次 resume 清零后继续。

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

- Tauri 系统原生 folder/file picker 返回 opaque case/material id；绝对路径和授权只住 host。生产入口不得用
  Web `<input type="file" webkitdirectory>` 代替，因为该控件不能建立可持久复验的宿主绝对路径授权。
- 原件只读；TS reading-view 从宿主读取受限 bytes，确定性产生 markdown、paragraphs/blocks、页码与版本哈希。
- `MaterialInput` 与 deterministic `CaseFile` 只从已持久、哈希一致的 MaterialRef/ReadingView 派生。
- provider 前重验原件/ReadingView hash；漂移、删除、需 OCR 或缺材料必须显式阻断，不读取 demo、不猜内容。
- Browser/E2E adapter 可保存测试 bytes，但必须只在 DEV + E2E 装配，不能进入正式 Tauri composition。

`MaterialRef` v1 保持 opaque、source-neutral：wire 不携带绝对路径，也不提前加入文件、邮件、DMS 等来源判别联合；宿主独占路径、授权和来源 provenance。只有第二个真实来源适配器进入 production 后，才可基于实际差异提案版本化来源契约，不以未来兼容性猜测扩展当前 wire。

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

### 2026-07-24 修订：Legal S3 单品收束的主合同、修正与文书语义

源码复核证明，原决定五仍留下三处可以“全门绿但产品说谎”的空隙：材料数组没有主合同语义，
desktop 可把 ReadingView Markdown 重建为新 docx 后冒充原稿修订；`revise` 虽在 binding 层被拒为
非终态，App 仍可忽略 command outcome 继续产出。为收束下一枚 Legal 合同审查单品，追加决定如下：

- `legal.S3` 开始前必须由用户从本案 ready 材料中**显式选择一份 DOCX 主合同**。PDF、Markdown、
  TXT 可作支持材料，但不得成为本版 Word 批注稿的目标。没有可复验 DOCX 时场景不起跑并说明下一步，
  不取 `ready[0]`、文件名、入库顺序或模型判断作默认。
- 不新增 envelope 字段或 storageVersion：S3 的 `materialRefs` 保持有序，用户选定的主合同稳定放在
  index `0`，其余支持材料去重后顺序稳定；同一输入同时派生 `legal.CaseFile`，以
  `documentType='contract.primary'` / `'supporting'` 显式告知垂类场景。该顺序语义只属于
  `legal.S3` host binding，不扩成 core 对所有场景的领域解释；resume 继续读冻结数组，不重算。
- ReadingView 只用于模型语料、锚点与只读阅读。Word 产出必须经同一 materialId 重读**原始 DOCX
  bytes**、复验 content/ReadingView hash，再把原 bytes 直接交给
  `applyRevisionInstructionSet`。生产路径不得调用 `compileDraftToDocx` 重建原稿；表格、图片、
  样式、页眉页脚、关系、既有批注等保真能力由 output 既有 OOXML 门承接。保真口径明确为：
  未触 ZIP parts 的解压内容 bytes 相等；受触的 `document.xml`、`comments.xml`、
  `document.xml.rels`、`[Content_Types].xml` 只承诺既有节点、comment id/range、relationship 与
  override 的语义保全/幂等，允许必要增补与规范化重序列化；不承诺受触 part、整个 ZIP 或 SHA
  byte-identical。
- output 读取必须以**一次** host `readOriginal` 得到的同一份 bytes 完成 mediaType/content hash/
  ReadingView hash 复验并返回，复验后才作防御性复制；禁止先 `resolveForProvider`、再第二读原件，
  让两次读取之间的文件变化形成 TOCTOU 窗口。
- OPC 数字签名不是可“保全”的普通 part：对副本新增批注也会使其密码学签名失效。共享 DOCX
  预检若发现规范化、大小写无关的 `_xmlsignatures/` part，任一 `.rels` 中 OPC 标准
  origin/signature/certificate relationship，或 Content Types 中对应三种标准 MIME 签名事实，必须在
  output 写入前 typed 阻断并说明“请先另存未签名副本”，不得交付带失效签名的批注稿，也不得删除
  签名后冒充保真。探针只认规范闭集，不用字面包含搜索；普通嵌入图片/可视印章不按数字签名误杀。
- 当前 Legal 编译器只生成 `commentOnly`，没有经 schema 承载的替换文本。因此本版产物的唯一诚实
  名称与承诺是**合同审查批注稿**：原合同的副本 + 已确认风险批注；不得称“保真 redline”“修订
  四处”或“合同审查报告”。真实条文替换须先扩 RevisionInstruction 生产语义并另立契约。
- production 产物不得复用固定文件名并 `overwrite:true`。以 envelope 已持久 `createdAt` 的 UTC
  与完整 `sha256(sessionId)` 组成确定性文件名
  `合同审查批注稿-YYYYMMDD-HHmmss-SSS-<64 lowercase hex>.docx`；同毫秒的不同 session 仍不同名，
  同 session 重试得到同名，不在 localStorage 另存。`createdAt` 与下述授权时间必须是可
  `toISOString()` 逐字往返的 UTC ISO 值；非法/缺失只允许查看账本并 typed 阻断产物。
  写入一律 `overwrite:false`：目标已存在时，宿主 stat 的 SHA-256 与本次编译 bytes 相同才按幂等
  已交付处理；不同则 typed 冲突、零覆盖。旧报告与其他 session 批注稿均保留。写成后再次 stat 并
  核 byteLength/SHA-256，不能只凭 `exists=true` 宣称成功。
- 同 session 的重编译 bytes 必须确定：批注/修订元数据时间取本次 S3 gate 对应、已持久的
  `confirmation_resolved.emittedAt`，`saveDocx`/`zipSync` 的每个 entry mtime 也显式取同一时刻，
  禁止任何 production output 路径回退 `new Date()`/`Date.now()`。跨秒、重启重编译的 SHA-256
  必须相同；这才允许上条按 hash 判幂等。
- UI 的“修正”只表示**修正风险结论文本**，不表示自动改写合同条款。修正必须输入非空的新结论，
  以 `/risks/<index>/description` RevisionEvent 与该项 `dispositionStatus='confirmed'` 同次
  resume 持久；取消编辑仍为 pending。逐条填满只令最终按钮可用，**不得自动 resume**；S3
  package 的 gate label 与 production 最终按钮必须逐字锁为
  “提交处置并完成合同审查；有已确认风险且无待索证项时生成批注稿”。用户点击后，其
  `confirmation_resolved` 与 RevisionEvents 先经 whole-envelope CAS 持久，才构成同一 label
  所述 effect 的授权。App 只有收到
  `WorkCommandOutcome.status='completed'` 后，才能从持久事件重放出的 post-revision RiskList 编译
  文书；rejected/failed/canceled/paused 均为零 docx 写入，不能用 React 闭包里的旧 RiskList 或
  本地 disposition 拼终稿。
- output 授权只认一对相互匹配的账本事件：S3
  `confirmation_requested` 的 exact gateLabel + 同 `requestId`、`decision='confirm'` 的
  `confirmation_resolved`。缺失、重复矛盾、requestId/label/decision 漂移均 typed 阻断，不能拿
  replay 中任意或最新一枚 resolved 代替；其 `emittedAt` 才是确定性 output 时间。现行 actor 仍是
  desktop 注入的本机操作人标识，故本版只可称“本机操作人确认账本”，不得称认证身份、电子签名或
  签署人。这里沿用 ADR-010 既有 gate/CAS，不引入 ADR-017 的 proposal-hash 新协议。
- 任一 `outOfCoverage` 未闭合、零风险或全部风险均为 `rejected` 时仍可经上述显式动作完成审阅，
  但这是**零 DOCX 的正常终态**。outOfCoverage 是整份批注稿 blocker，即使同时有 confirmed 风险
  也不得部分生成；completed 结果与重开面须始终并列全部待索证项，并说明补充材料后新开审查。
  零风险且 `outOfCoverage=[]` 只可说“本次审查未形成可提交的风险项”；若 `outOfCoverage` 非空，
  必须逐项展示未覆盖/待索证并提示补充材料后重新审查，绝不能概括成“未发现风险”；全部驳回说明
  “风险均已驳回”。三者都不构造空的 `RevisionInstructionSet`，也不把 schema 的
  `instructions.min(1)` 放宽。只有至少一项 `confirmed` 且 `outOfCoverage=[]` 时才进入批注稿编译
  与写入。
- production Legal S3 对 non-applied instruction 采取**整份阻断**：任一已确认风险未能唯一落到
  主合同，均列出原因但零 docx；不得用只存在 React 内存的“确认知悉”授权部分交付。既有
  OUTPUT-CONFIRM-UI-1 的 `confirmedNonApplied` 能力只可留在显式 demo/其他已声明消费者，不再是
  本单品 production 路径。completed 账本仍保留；重开时从持久 RiskList + 当次复验原件确定性重算
  阻断清单，材料修正后须新开审查，不新增 delivery ledger、事件成员或 envelope 字段。
- SourceAnchor 的 `fileId` 必须接到同案 MaterialStore 阅读入口；Legal S3 的 resolver 锚必须以
  `textRange + textLayerVersion`（分页件同时核 `page`）作权威定位，并终验
  `quote === 当前文本层.slice(start,end)` 后按坐标高亮。`quote` 只作显示与等式校验，不得退化为
  全文搜索定位；重复 quote 必须仍只落到坐标指定处。bbox-only 锚在现行 FILE reader 没有页面坐标
  overlay 时显式“当前阅读面暂不支持该定位”，不得 quote fallback。版本漂移、越界、切片不等、
  跨案、删除或授权失效继续 fail closed。生产 RiskList 面不得渲染 demo 固定合同、固定“4 处”或
  固定 redline。
- Legal 编译器不得固定取 `basis[0].sourceAnchors[0]`：应按 basis/anchor 原顺序遍历，以
  `fileId === primaryMaterialId` 选择稳定首枚主合同锚作 locator；支持材料锚仍可进入 citation，
  但绝不能成为主合同文本定位。支持锚排在前、主合同锚排在后的 fixture 必须仍落到主合同。
- completed session 仍是审计账本，不因 docx 已存在而删除其轻量指针。重启或切案后可只读重放
  最新一枚 `artifact_produced(legal.RiskList)` 所带的 post-revision RiskList、引证与人工处置；
  `revision_recorded` 只有 id，当前 projection **不得声称能重建 RevisionEvent payload**。paused
  才显示“继续”，completed 显示“查看上次审查”。completed
  若因崩溃尚未写文件，可由用户在同一已持久授权上显式重试“生成批注稿”；这只重读、重编译与写
  派生产物，不修改风险账本。新 start 显式覆盖为本案最新 session。原件、产物与 non-applied
  临时清单均不进入该轻量指针。

## 实施工单与依赖

```text
WORK-PORT-1
├─ WORK-BROWSER-1
│  └─ 拆 Node adapters，建立 @courtwork/core/work-protocol browser-safe 出口与静态门
├─ WORK-STORE-MEASURE
│  └─ whole-envelope bytes/CAS latency/write count/crash 证据
│     └─ WORK-STORE-1
│        └─ async/CAS WorkState、ArtifactEnvelope、终局、迁移、累计预算与 Tauri opaque blob host
└─ HOST-AUTH-TRUTH

> 旁注（2026-07-18）：`HOST-AUTH-TRUTH` 经 Round 3 拍板由 `HOST-AUTH-LITE` 替代（完整签名/TCC 真机矩阵后置到正式签名发布阶段），本图保留为历史决定文本。
   └─ 签名/TCC/重授权真机事实
      └─ CASE-ROOT-1
         └─ 宿主目录授权与 opaque case ref
            └─ MATERIAL-INGRESS-1
               └─ 原件 hash、ReadingView blocks、MaterialRef 与 deterministic CaseFile

上述前置独立验收后
WORK-STORE-1 + MATERIAL-INGRESS-1
└─ LEGAL-S3-BINDING-1
   └─ 显式主体输入、tool input、gate projection 与逐条 revision mapping
      └─ WORK-LIVE-1
         └─ production run/replay/resume/cancel；recording 永久 fixture-only
```

`WORK-PORT-1` 与 `WORK-BROWSER-1` 已完成；后续实际派发顺序只认[实现就绪图](../architecture/implementation-readiness.md)。不得提前把 non-demo UI 标为 live。

## 验收下限

- Work browser graph 注入任意 `node:*` 必须触红；
- UI 直接构造 run input/tool input、按 `legal.*` 猜字段或改 actor 必须触红；
- case A 读取 case B 的 material/session/request 必须 fail closed；
- 延迟/拒绝 `turn_linked` 持久时 provider 必须尚未启动；
- pending 保存失败时不得出现 `confirmation_requested`；两个并发 resume 只能一笔成功；
- paused 后销毁 composition，重建后仍能 replay/resume；残缺 session 必须是 interrupted；
- 原件改一字节、删除或 ReadingView hash 漂移时 provider 前失败；
- CASE-ROOT 必须分别注入系统 picker 取消/TCC 拒绝、卷卸载与需重新授权，三者均显式失败且不返回空来源；
- `turn_linked` 已持久而 Turn terminal 缺席时不得自动重放 provider，必须产生新的 Turn/attempt 身份；
- Work store 的 generation、原子替换与 macOS 强同步路径必须以并发/崩溃反例和系统调用级证据验收；
- 未知 schemaVersion/缺 migration 不得渲染 raw payload；
- `revise` 不得完成门禁，单项 reject 不得终止全场景；
- provider/validation/cancel 后不得再有 artifact 或 `scenario_completed`；
- 同一 session 的 frozen limits 与 consumed 必须跨 start/resume 同 CAS 持久、单调累计；暂停等待不计 `executionMs`，超限必须有持久 `scenario_failed/runtime_limit` 与 typed command 终态；
- 配置 `maxUsd` 且缺 price table 版本/生效时间，或任一 paid attempt 缺 usage/price 时，`costCoverage=partial` 必须阻断下一次 paid Turn并持久映射 `scenario_failed/configuration`；UI 不得隐藏覆盖缺口与 assumptions；
- confirmation gate 只能授权其后的对应 effect；每一笔 `external_send`、`file_write` 或改变权限的 effect 必须在执行前取得匹配 scope/actor/input 的授权，gate 前已经发生的动作不得事后追认；
- 非 demo case 任何 recording、DEMO_ARTIFACTS、demo party adapter 或 demo 原文消费必须触红；
- desktop 行为变更除全仓门外，必须用隔离端口完整 Playwright；Tauri host 变化另跑 Rust 全量测试。

## 后果

Work live 被拆成可独立验收的窄边界，短期多三张前置工单，但避免把同步 Node demo runtime、WebView
临时状态或 demo 语料伪装成生产后端。React、通用 executor、垂类 binding 与 Tauri host 各自只拥有一层
事实；后续替换本地 host 或增加具名 provider 时不需要改 UI 与 schema 语义。
