# Luna 有界源码探索 · 语义 polish 准备

2026-09-11。固定基线为 `main@9bc6090`（隔离分支
`codex/semantic-polish-prep-20260911`）。本报告只覆盖 Settings、Runtime、Home、
Attention/coordination、Inspector、Usage/Telemetry 以及 Pages 的相邻接缝；它是
VS-00 的输入，不是全量文字盘点、视觉验收或产品接受。

## 先固定的边界

- 语义 owner 是 Astra：`engineering/design/agent-interface-2026-09-10/frontend-contract.md:13-20` 将 Semantic、Projection/Control、Visual、Placement 分开；实现应继续保留 `sessionId`、`runId`、RuntimeStore、API/schema 等内部身份。`engineering/execution/2026-09-11-semantic-polish/README.md:42-50` 已把 VS-01（词义）和 VS-04（跨面语义）交给 Astra，Luna 只做有界探索、fixture 或非作者复核。
- 后端事实仍由原 owner 持有。Runtime view 自述 controller 只读 control-plane snapshot、只保留本地 draft（`app/web/runtime-view.mjs:3-9`）；Attention 是 Core 的对象与 action（`docs/work-core/attention.md:1-3,25-53`）；Thread 是 Host/RuntimeStore 的 communication-only mailbox，不是 Matter/acceptance owner（`app/docs/coordination.md:3-7,25-27,98-115`）。因此词汇压缩不能把读面变成新的 authority。
- 官方 Braintrust Examine Traces 页面现已核验有 **Spans、Thread、Timeline**，另有 **Debugger**；这只提供外部分层/时序/raw 披露参考。旧 EX-PG1 只核过 logging 页面，不能据此声称 Braintrust 或 Courtwork 没有这些视图；本树也没有因此新增 span-tree 能力。

## 已核到的具体接缝

### Settings / Runtime：已有直接 IA，但 Runtime 仍是技术总括

`app/web/index.html:438-580` 已有 Models → Connections、Tools & Integrations、Skills、
Memory、Access 和 Developer/Runtime 挂载区；同一段仍把 Runtime 作为整块说明，含
“the runtime is the architecture underneath a chat”以及 `Runtime info`。`app/web/settings-view.mjs:6-37`
把没有 host adapter 的项目列为 text-only `Backend pending`，`40-75` 又把 MCP 的
Add/Configure/Test/Review/Enable/Advanced 流程显式列出；这些是缺口可见性设计，不是
可用能力。

已存在的连接/权限表达可复用：`settings-view.mjs:79-85` 明确区分 File access、
持久 permission 与一次性 Approval；`413-473` 的 Connection card 复用 Model、
Connection、File access；`820-853` 的 Advanced、Save and ask once、Save only 保留
真实请求后果。风险点是普通行仍泄漏内部生命周期：`872-879` 写着“Chats already
open keep the model they were bound to”，而 `912-914` 明确 Runtime 五块由
Workbench controller 持有。

**Owner / gap / 建议：**

- 事实 owner 是 provider-connection 与 Runtime control plane；DOM 分别由
  `settings-view.mjs` 与 `runtime-view.mjs` 持有；跨面词义由 Astra 的 VS-01/04 裁。
  `Settings` 不需要新的 umbrella；可按用户任务落到 Agent、Model、Tools、Access、
  Connections、Memory、Usage、Advanced，但必须由 Astra 逐段裁决，不能机械把每个
  `runtime` 替成 `agent setup`。
- 把 `Backend pending`、host adapter、Source/Requested/Effective/Bound 等词限定在
  Advanced/Developer/diagnostic disclosure；普通表面先问“我能选什么、谁能用、何时
  生效”，但保留实际未知、范围和拒绝原因。Runtime 的真实层次在
  `runtime-view.mjs:699-782`，Policy rule editor 在 `2067-2198`，因此不应为“短词”
  删除 authority 差异。
- 这片最小可施工缺口是 copy-contract 例外表与 Settings/Runtime 的代表 fixture，
  不是 schema/API rename。`Backend pending` 的现有文案还需确认是普通 Settings 还是
  Developer 诊断；这是语义决策风险，交 Astra，不由本报告定词。

### Home：投影边界很干净，旧 Run/Attention 词仍可见

`app/web/home-view.mjs:1-27` 已把事实和文字交给 `presentation-adapters.mjs`；
`32-56` 定义 Today 下三组状态与空态，`77-84` 却把记录时间写成 `Run …`。
`164-170` 注册 Today、Activity、Attention、Models；`186-230` 的 Activity 以
“recorded runs”与 UTC heatmap 展示 retained work，`233-291` 的 Attention card 展示
project、items、state、reason、next action；`501-568` 还把不可达态写成
“Local runtime unavailable”。

**Owner / gap / 建议：**

- `/work-summary`、`/work-activity` 与 Attention query 是事实来源，
  `presentation-adapters.mjs` 是投影 owner，`home-view.mjs` 是 DOM owner。当前
  adapter/view seam 是最近先例，不应因文字整理而把计算移回 view。
- 语义问题集中在 `Run`、`recorded runs`、`Inspection candidates` 及队列名称；
  T2 提议的 Inbox 只能作为队列显示名候选，当前 owner 约束仍保留 Attention 的
  global agent/brand 语义（`engineering/research/semantic-governance-2026-09-11/README.md:20-24`）。
  先由 VS-01 规定普通 Home 的 Working/Activity/Details 读法，再改标题、空态、
  timestamp、ARIA；不要把三组不同的 `waiting_user`、active、failed/unknown 压成
  一个词。
- `app/web/index.html:110,292-322,634-745` 仍有 Attention 导航、Run hint、Cancel run、
  Run tab、Run history；这组静态壳与 `home-view.mjs` 动态文案必须在 VS-04/VS-00
  一起盘，不能只改 adapter 输出。

### Attention / coordination：边界正确，但技术对象词应按披露深度分层

`app/web/coordination-projection.mjs:1-20` 明确 Thread message 不折入
`thread-projection`，也不等同 Run 或 Core acceptance；`22-27` 固定 delivery status。
`coordination-view.mjs:1-23` 与 `37-44` 说明这是嵌在全局 Attention 对话里的 collapsed
panel；`46-124` 负责 Thread/message 控件，`127-158` 保留 receipt、retry 与 capability
状态，`161-235` 只从服务发布的 directory/mailbox 渲染。

Attention 工作面已有独立的状态/动作词：`attention-view.mjs:18-45` 定义 views、
action、trigger，`146-235` 渲染 “Attention items / Why this needs attention / Next step /
Recorded context”，`237-275` 只为对象广告的 action 画按钮；`215-225` 把 Runtime
disclosure 标成只读。全局 Agent 对话在 `attention-agent-view.mjs:14-31`、`58-70`、
`112-124` 使用 Attention conversation、Runtime & memory、recorded/configured for
the next Run；`166-191` 仍需区分 Permission request、Question、tool activity 与
run status。

**Owner / gap / 建议：**

- Coordination 的事实、delivery、membership、capability 由 `app/docs/coordination.md`
  与 Host/RuntimeStore 持有；`coordination-projection.mjs` 是纯 shape/projection，
  `coordination-view.mjs` 只负责 DOM/fetch。`Thread` 在这个 Advanced/coordination
  surface 是真实对象名，不应未经 owner 裁决改成泛化的 Chat/Task。
- 需要裁的是 placement：`Threads & messages`、`Working conversation`、`Delivery is
  not execution` 等可留在专门协调面；`Runtime & memory`、`recorded for this Run`、
  `Runtime permissions` 应由 Astra 判断哪些属于普通对话、哪些应移入 disclosure。
  `NOT_EXECUTION` 的警告不能删，它承担 delivery≠execution、message≠Core acceptance
  的事实边界。
- Thread 的 external reference 只证明成熟参考的视图分层，不授权新增 Trace/Debugger
  产品面。若 VS-02 要引入 Activity/Trace 入口，先补真实父子关系、时间边界和 owner；
  没有这些事实就维持当前线性 Activity/details。

### Inspector / Usage / Telemetry：真值保护已经是强先例

`app/web/inspector.mjs:36-177` 组织 status、Results、recorded version 与 review 未
接受提示；`178-211` 的 Usage 保留 `At least` lower-bound 与 incomplete 语义；
`228-299` 把 recorded context、Run information、Activity event list 放在渐进披露中。
这里的 `Run information`、`Run ID`、Adapter、Native session 等是诊断身份，不能用
普通 Home copy gate 直接禁掉；普通标题是否改为 Details 由 VS-02 结合披露层级决定。

`app/web/telemetry-view.mjs:1-16` 只接受 schemaVersion 1 request telemetry，
`18-33` 展示 Host first output/text、Observed request time、effort，并明确
`Decode TPS · Unavailable · no token deltas`、`Context is a heuristic`、host timings
不是 provider TTFT、cache 不推导 billing。`app/web/usage-projection.mjs:1-21` 保留
Top4+Other、relative quantile、UTC/snapshot/model identity/isBillingRecord=false；
`app/web/usage-view.mjs:25-93` 已把 Overview/Models、exact table、matching runs、
incomplete/coverage unknown 与 snapshot 下钻（409 由服务保证）分开。

**Owner / gap / 建议：**

- Inspector 的 Run/event/binding 是 RuntimeStore/service 事实，Inspector 是诊断投影；
  Usage 是 usage-details service + `usage-projection`/`usage-view`；Telemetry 的
  per-request measurement owner 尚待 BE-42 的 generic Harness/runtime 合同。当前
  `request-telemetry` 只有 final/host measurement，不能从字符数或总 output 推 TPS。
- VS-02 可按 Summary→Activity→Files→Usage→Details 组织，但不能在没有父子/因果/精确
  时钟时画 span tree、waterfall 或 progress meter。VS-03 继续复用现有 Usage projection；
  cache/input overlap、lower bounds、historical coverage unknown 和 not-billing 说明
  是判断所需事实，不能为视觉简化删除。
- TPS/specimen 仍是候选：`engineering/design/tps-specimen-2026-09-10/README.md:123-127,143-151`
  把真实 provider/host-tokenizer 时钟、字段来源、null 语义交给 BE-42；在此合同落地
  前，保留 unavailable 文案，不新增 composer slot 或图形。

### Pages：应消费应用裁决，不能反向定义应用语义

`site/src/product-pages.mjs:8-53` 是当前 Pages route/copy 聚合点；它同时写
Product tour 的 `Agent running`、`Attention / what needs you`、`Matter / durable work`、
`Continue in Work`、Models/RUNTIME 与 Features 的 Matter/Spark/Attention/Experts/Runtime
叙事。`engineering/release/pages-ordered-integration-2026-09-11/README.md:7-24` 已规定
Spark/Attention 前置、Runtime 后置、方法与产品事实分开，且 13-slot capture batch
仍 pending；`30-36` 记录 Pages 已在本地整合但发布/截图门另行处理。

**Owner / gap / 建议：**

- Pages IA/视觉由 Astra 裁，site writer 修改 `site/src/copy.mjs`、`page.mjs`、
  `product-pages.mjs` 等；应用语义在 VS-01/02/04 先固定。Pages 不应自行把 Run 改成
  Execution、把 Runtime 改成 Agent setup，或把合成商业叙事当生产 capability。
- 当前明确缺口是应用与 Pages 的词义矩阵（同一概念的中英文、默认/展开/诊断读法）及
  capture provenance 接缝；13 图待固定 UI 后由 VS-06 重采。已有 Braintrust 参考只能
  影响 Trace/Activity 信息深度讨论，不能成为 Pages 新功能声明。

## 推荐后续顺序（有界）

1. **VS-01 / Astra：** 先写普通表面与 Diagnostics/Developer 例外边界，裁 `Run`、
   `Runtime`、`Attention`、`Inbox`、`Access`、`Approval`、`Review` 的唯一职责；
   同时把 Settings/Runtime 的代表字符串纳入 copy fixture。
2. **VS-04 / Astra + Luna bounded implementation：** 先做 Settings ↔ Runtime ↔ Home ↔
   Attention/coordination 的同词回归，保留 owner/status/receipt/unknown 事实；再处理
   静态 `index.html` 与 dynamic view 的接缝。
3. **VS-02/03：** Inspector/Activity 与 Usage/Telemetry 只沿真实 projection；若需要
   Trace/Spans/Timeline，先补真实关系和测量 owner，再决定 disclosure/图形。
4. **VS-05/06：** 应用词义固定后再改 Pages copy/IA，13 图按现有 capture IDs 与来源
   重采；由非作者完成浏览器/视觉/可访问性复核。

## 未覆盖与限制

本次没有穷尽 `app.mjs` 全部导航/路由、`model-picker.mjs`、所有 test fixture、所有
ARIA/tooltip、中英文 Pages literal、站点全部页面或真实 provider；这些留给 VS-00
clean SHA surface×state×viewport×scheme×language ledger。没有改产品代码、RuntimeStore、
schema、API、Pages 或截图，也没有运行付费 provider。本文是作者的源码观察与建议，
不构成独立接受。

## P0.5：语义键与 glyph 的实现边界（本次有界补查）

### 已实现的低层边界

`app/web/ui-controls.mjs:25-50` 的 `icons` 集合实际有 **24** 个名字；
`icon(name)` 在 `:56-75` 拒绝未知名字，并统一生成指向
`/web/vendor/icons.svg#<name>` 的静态 SVG。这个 allowlist 是 renderer 入口和
family 边界，不是 Product Semantics Registry：调用者仍直接传 glyph 名，未携带
semantic key、owner、label、capability、状态或 collision 约束。

### 五个可复现的语义碰撞族

以下是同一低层 glyph 被不同产品语义复用的具体 callsite；它们是 P0.5 的候选
collision gate 输入，不是单凭图形宣布错误：

1. **`message-square`**：历史问题行与 live question card 在
   `app/web/app.mjs:2763-2769,2804-2806`；Home 的 Attention 入口在
   `app/web/home-view.mjs:241`，Attention 空态也在
   `app/web/attention-view.mjs:175`。问题对象和 Attention 队列共用一个视觉 token。
2. **`activity`**：Home Activity 模块在 `app/web/home-view.mjs:188-195`，Chat
   tool-action 组头在 `app/web/app.mjs:2680-2688`，workspace 的 Latest Run 在
   `app/web/workspace-view.mjs:105-112`。记录活动、工具执行组和 Run 历史入口未在
   低层 renderer 中区分。
3. **`plug`**：继续已有 Matter 的入口在 `app/web/app.mjs:2168-2178`，extension
   work surface 状态行在 `:4154-4160`，远程工具授权的 projection 在
   `app/web/thread-projection.mjs:174-193`。Matter continuation、extension 和
   remote tool call 共享形状，文字仍各自不同。
4. **`folder`**：Project 导航在 `app/web/app.mjs:1797-1805`，Recorded fields
   disclosure 在 `:4296-4300`，Session files 行在
   `app/web/workspace-view.mjs:94-96`。容器、原始字段集合和文件资源被同一 glyph
   表达。
5. **`file-text`**：formal decision receipt 在 `app/web/app.mjs:2452-2460`，
   Inspector artifact/current-file 在 `app/web/inspector.mjs:126-145`，Attention
   未选择时的 context empty state 在 `app/web/attention-view.mjs:231`，文件 rail
   行在 `app/web/surface-modules.mjs:83-95`。决定回执、可打开文件和阅读上下文的
   入口共享形状。

### Registry 状态、owner 与建议

`engineering/design/home-composition-2026-09-10/interaction-vocabulary.md:33-50`
定义了 semantic entry 应记录的 key/meaning/owner/label/capability/glyph/state 等
字段，但明确当前 YAML 只是 illustrative schema，24-name `icon()` 也没有把每个
consumer 路由到 semantic key；`:60` 还明确 registry wiring、unknown-key、label
agreement、state/a11y 和 family checks 属于未来验收。`engineering/mvp/execution/
work-surface-kit/contracts/glyph-semantics.md:1-11` 是既有 24-glyph 的文档映射，
不是运行时 registry 或 collision gate。故当前实现状态是 **low-level glyph
allowlist 已有；semantic adapter、consumer migration、collision enforcement
未实现**。

Pages 有独立的视觉图形登记：`engineering/release/publishing-visuals-2026-09-10/
visual-semantic-registry.md:1-18` 记录 figure 的 meaning/status/motifs/禁忌，
`site/src/assets/figures/figures.json:1-6` 以 `registry` 字段指向它；这能约束
publishing figure provenance，却没有把 app semantic key 或 glyph consumer 接入
应用。Home 设计 README 也把 semantic adapter 和 family migration 标作 pending
（`engineering/design/home-composition-2026-09-10/README.md:56`）。Astra 负责
裁定 registry contract、owner 边界和迁移顺序；Luna 可在 contract 固定后做 bounded
adapter/consumer slice；各 slice 仍需独立 review/acceptance。

建议 P0.5 先由 Astra 固定每个 key 的唯一职责和例外（尤其 question/Attention、
Activity/Run、file/receipt），再让实现 owner 建一个保持 `icon(name)` 为唯一
renderer 的 typed/explicit adapter，迁移上述五组 callsite，并在 unknown key、
visible/accessibility label、capability/state 及 200%/forced-colors fixture 上做
collision regression。Pages 继续消费已裁定词义；现有 visual registry 不能代替
应用 registry，也不能反向命名生产对象。
