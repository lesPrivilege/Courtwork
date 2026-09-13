# CourtWork · Harness / Maintainability / Public Narrative Review

审查日期：2026-09-13  
固定候选：`24bd9545936dd19a498fc6b7eed5de106ac0d5e8`  
结论：**HOLD 此候选的产品 Release；允许继续有界内部开发与修正 experimental 发布叙事。**  
性质：只读审查与待裁决 handoff。未修改远端、创建 PR、push、tag、部署或使用真实 Provider 凭据。

## 0. 范围与证据边界

本轮实际读取了固定源码、架构/发布证据、GitHub Actions 状态及失败日志，并用 Exa 和官方资料复核相关机制。源码抽查不是全仓逐行证明；远端 CI 的执行结果也不是本轮本地重跑。Product Design 的浏览器截图工作流未执行，因此不出具像素、动画、遮挡、焦点与辅助技术的最终验收。

[S01]–[S20] 与 [E01]–[E04] 均在同包 `SOURCES.md` 解析。包内不包含完整原始源码或日志，不冒充原件归档。`PRODUCT-DEFINITION-DRAFT.md` 是待裁决文本，不是已批准 ADR、已实施功能或可直接发布的最终事实声明。

## 1. 总判定

不是“架构还没有形成，必须先整体重构”，而是已有核心合同与局部闭环，需要完成可复现资格和公开证据的收口。

当前五层责任已经清晰：Adapter、Harness Core、Harness Extension、Work Core、Work Extension。现实现复用 Pi 0.85.1，Host/Core/运行协议/界面分别持有各自事实。应保留这套边界，不为了命名改出五个包、五个服务或第二套总路线图。[S10][S11]

本轮发现三项可定位的发布阻断：README 生成漂移、历史版本测试依赖浅克隆中不存在的 Git 对象、测试临时目录写死 macOS 路径。另有公共叙事把未贯通的通用 Spark/消费追踪环节混写为当前闭环的风险。修复这些不等于自动关闭既有 G1–G5。[S01–S09][S10][S15]

## 2. 已证实 findings

### RV-01 · P1 / Release blocker：README 生成源与成品漂移

**位置**：`README.md`、`site/src/readme.mjs`、`site/build.mjs`。

Pages run `34752311258` / build job `103710791650` 在 `node site/build.mjs` 失败；报错说明 README 与生成模板不同步。[S06][S09]

具体差异可在源码核对：根 README 新增了 `check:product`、默认四文件并发、`test:load` 八文件并发说明；模板在本地运行段之后直接进入“工作如何衔接”，没有这些段落。[S07][S08]

**风险**：公开部署被阻断；直接照报错重生成会删掉根 README 中有价值的运行说明。

**最小修复**：先把应保留内容和本轮产品口径放回生成源，再生成 README；正常 build、文档链接与生成一致性检查全部复验。以后修改公共 README 应从生成 owner 进入，不同时维护两份独立文本。

**退出证据**：修复 SHA；源与生成结果 diff；不带写入参数的正常 build 通过；Pages 同候选成功。一次生成成功不等于部署成功。

### RV-02 · P1 / Release blocker：历史兼容性测试没有显式准备历史对象

**位置**：`.github/workflows/runtime.yml`，以及 async-recovery-independent、coordination、governance-recovery、review-provider-publication-migration、run-lineage 测试。

Runtime workflow 使用 `actions/checkout@v4`，未配置完整历史。Node 24 日志显示 fetch-depth 为 1。七项测试在 `git worktree add` 或 `git show` 读取固定旧版本时失败，尚未进入相应兼容性断言。[S01][S03–S05]

**最小修复**：为需要历史实现的 lane 准备完整历史或一组明确、可验证的历史 refs；启动测试前校验每个 commit 和所需 path。不能保证单独设置 `fetch-depth: 0` 就覆盖所有非祖先/未保留对象，因此必须逐项检查。

```sh
# 示意：从当前测试使用的实际 fixture 清单生成，不手抄一份长期漂移的列表。
git cat-file -e "$sha^{commit}"
git cat-file -e "$sha:$path"
```

**禁止修法**：移除旧实现检查、跳过迁移反例、把当前实现冒充旧 host。长期可把历史 fixture 提取为带来源 SHA 与内容 hash 的可分发测试工件；本次不必先建设通用测试平台。

**退出证据**：两个 Node lane 历史准备成功，原迁移/拒绝/backup 恢复断言实际执行通过；干净 clone 可复现。

### RV-03 · P1 / Release blocker：RuntimeStore 测试依赖 `/private/tmp`

**位置**：`app/tests/runtime.test.mjs` 原文件第 14、67、86、103 行。

四处 `mkdtemp('/private/tmp/...')` 在 Ubuntu runner 报 ENOENT。对应 RuntimeStore、幂等、旧状态拒绝和 credentialGeneration 测试没有进入业务断言。[S02][S05]

**最小修复**：统一使用 `node:os.tmpdir()` + `path.join()`，并按现有 fixture 约定释放 store/worker 和临时目录。

```js
import { tmpdir } from 'node:os';
import path from 'node:path';
const dataDir = await mkdtemp(path.join(tmpdir(), 'v5-store-'));
```

不要在 CI 人工创建 `/private/tmp` 维持隐性平台依赖，也不要据此判定 RuntimeStore 本身不支持 Linux。

**退出证据**：四项测试在干净 Linux 环境实际执行；两个 Node lane 全量、smoke、文档检查通过。上述片段为修改建议，本轮未应用或测试。

### RV-04 · P1 / Public claim blocker：产品目标与已证明闭环混写

**位置**：根 README 和生成模板的“第一个工作闭环”及 Spark 段；当前架构节点的实际成熟度段。

公开文本描述 Spark 整理来源、产生发现、材料更新后重新整理；架构明确目前只有 `work-derivations` 只读投影，通用 Spark 摄取、义务消费/检查回执、Broker、恢复巡检尚未整体贯通。[S07][S08][S10]

这不意味着所有闭环都是假的。NDA 的 Local test GUI 路径、正式接受、同 Matter 新 Session 读成果与正常重启已有固定基线证据；但确定性脚本通过 `buildReview` 构造 domain，不能代替真实模型独立构造候选。[S13]

**最小修复**：分成“产品方向：Chat / Spark / Attention”和“当前可复现：固定 NDA 工作纵切”。将目前可用、受限、规划中三类自然语言与 release capability 表相互绑定。不要把 roadmap 勾选数作为可用性。

**退出证据**：每条当前能力指向代码/测试/运行证据；Readme、生成源、主要 Pages 文案与运行文档用同一口径。语义发生变更时同步相关 UI 帮助文本，而不是盲目全局替换历史记录。

## 3. CI 实际观察，不借历史 PASS 签署当前候选

| 观察面 | 本轮结果 | 不能外推的结论 |
|---|---|---|
| Pages run 34752311258 | build 失败，README drift | 不是“页面已部署并一致” |
| Runtime Node 22.19.0 | job 失败 | 未在本报告赋予 Node 24 的测试总数 |
| Runtime Node 24.x / job 103710791717 | 942 项，931 通过，11 失败；七个历史对象准备失败、四个路径失败 | 不是 11 个已证明的 Harness 业务逻辑 bug |
| 两个 Runtime jobs 的后续 smoke / doc links | 因测试失败跳过 | 不能说本候选完整产品检查通过 |
| 既有 preflight | 原 SHA 的 GUI、迁移与定向复验保留 | 不能升级成 24bd954 全量通过 |

Node 24 的通过项包含审批/CAS/幂等、MCP unknown effect 封闭、重启不自动重放、实际 SIGKILL 边界、历史引用和多项 UI 语义守卫；不能因为 CI 红灯否定所有底座建设。[S05]

先前会话中的 QuickJS/证书归因已被完整日志纠正，**不是本报告 finding**。原 preflight 的 934 项全量曾有一个 raw-consumer 登记失败，后续仅定向复验与源码等价关系；原文自己保留了未重跑第二次全量的边界，不应将其改写为新候选全绿。[S13]

## 4. Harness Release 门槛：沿 G1–G5 收口

| 原门 | 已有证据可继承的范围 | 当前剩余动作 |
|---|---|---|
| G1 独立启动与真实运行 | 旧固定 SHA 的独立本地 clone、真实 GUI 配置 Local test；已有底层故障测试 | 修复当前 CI；最终候选干净安装；用户 GUI 配置已授权真实 Provider；运行/工具/失败/取消/重启身份可查 |
| G2 最小正式工作闭环 | 固定 NDA、Core 决定、producer-contract 修订及反例 | 最终候选真实模型按广告合同独立构造候选；人的 Review；Decision/Artifact 与版本绑定；不得用预生成 gold 代替 |
| G3 连续性与可用界面 | 同 Matter 新 Session / 重启、Review 摘要接线与既有局部 UI 证据 | 对实际发布候选复核关键桌面路径、键盘、断线/过时/错误、来源更新；其他平台按范围标明 |
| G4 可公开演示 | 已有操作稿、合成材料与截图 | 2–4 分钟可复现闭环媒体，source SHA、data kind、是否真实 Provider 明确 |
| G5 公开事实 | 已有事实清单/边界 | Readme/Pages/配置与事实逐条绑定，消除本轮叙事漂移；私人简历不在本轮写入范围 |

G1–G5 原定义见 [S15]。本表是消费切片，不替换原 owner，也不新设一套 Release 编号。

### 固定支持组合而非宣称“支持整个生态”

首版按已选 Pi / Provider / Host / Work Extension 组合声明支持。Provider Adapter 与 Runtime Adapter 是两条轴；换模型不等于已能换完整 runtime。[S10][S11]

每个广告能力都应走到：GUI 输入 → 配置保存 → 新 Run 冻结绑定 → 工具实际准入 → 执行及结果 → 失败/取消/unknown → 重启/继续 → 界面回读。单有设置项、目录可见或后端 symbol 不够。

当前 Host 明确关闭 Pi 自动资源发现并禁用 Pi builtin tools，不能宣称安装任意 Pi skill/extension 即可直接使用。MCP 的发现、模型暴露、执行许可和远端副作用分开；resources/prompts 的 catalog-only 状态不可提升成调用支持。[S10][S12]

如果首版对外包含 coding 场景的“Agent 自己执行测试”，既有 DF-04 条件随该声明触发；NDA 首版对通用 shell 的豁免不能拿来证明 coding 闭环。通用 shell、沙箱、手动 slash compaction 和任意扩展安装没有在本轮重新签署支持。

外部 LangGraph 的 interrupt 恢复会重跑部分代码，说明“可恢复”必须检查副作用和幂等，不是只检查日志还在。这里消费反例，不迁移当前 Pi 或另引入 Temporal/LangGraph。[E01]

## 5. 长期可维护性：保留边界，收敛接缝

### 5.1 已形成的结构，不应推倒

Work Core 持有 Matter/来源/候选/决定/Attention 的正式状态；Host 持有 Session/Run/配置/权限；runtime 持有协议历史；UI 持有视图与交互临时状态。兼容路径 `extensions/evidence-memo/state.db` 不代表 NDA 有自己的第二份数据库。[S10][S11]

`app/harness/` 现在主要是 Thread/通信等责任，不能按目录名误判为又一个模型 loop。五层逻辑责任不要求物理目录立即一一同名。

### 5.2 MR-01 · service 与 Pi SessionManager 耦合：已登记的替换风险

架构明确 service 仍直接依赖 SessionManager。它不阻断固定 Pi 组合，但阻止“仅换 adapter 即可切换 Codex/其他 runtime”的公开承诺。[S10][S11]

后续按真实第二执行器消费者移出最小生命周期 port，保留 native session 恢复语义；不要提前冻结所有 runtime 的通用历史格式，不把 metadata facade 当互操作证明。

### 5.3 MR-02 · App 组合根持续吸收生命周期：风险，不是已证明竞态

抽查 `app/web/app.mjs` 已有多类独立 projection/view 模块，也集中持有导航、各视图实例、会话选择与请求 generation。应复用当前分层，而不是说它完全没组件化。[S17]

下一步按单个页面生命周期拆小：谁 mount/update/dispose，谁拥有请求取消和过期判定，谁保存 return target，谁恢复 draft/focus。先把这些责任在既有文件合同中写清，再按变更热点抽取。不要只为降低行数搬动代码。

### 5.4 MR-03 · 测试与发布源是产品基础设施

RV-01 至 RV-03 说明维护契约不仅在生产 API。生成文件 owner、历史 fixture 依赖、跨平台临时目录、清理约定和源版本必须进入统一测试/写入约定。历史测试标题或注释里的旧 schema 号应区分“输入版本”“当前输出版本”，不要让局部陈旧措辞继续传播成支持表。

## 6. UI Grammar 审查与未完成验收

既有 UI 编排契约已经规定：Host 提供运行事实，Core 提供正式效力，UI 不从模型文字推断接受；请求/选择/草稿/决定各有身份，旧响应不可覆盖新目标。[S16]

本次 CI 通过项也显示已存在色彩层、对比度、材质/形状、语义图标与 raw-consumer 等守卫。不是重新建设设计系统，而是要求新页面按同一份 owner/grammar 消费并补行为证据。[S05]

建议在既有索引增加一张可消费表，每个页面/组件至少明确以下责任：

| 层级 | 允许负责 | 必须避免 |
|---|---|---|
| App shell | 全局导航、入口、组合、页面间返回 | 新建第二份工作状态 |
| Page/workspace | 本页标题、primary action、布局、页面局部读数 | 用点击进入代替 acknowledge/resolve |
| Panel/dialog/popover | 渐进披露、模态性、opener、关闭/返回 | 小屏视觉放大后仍沿用错误交互角色 |
| Domain projection | 读取 DTO、表现 freshness/unknown、展示广告动作 | 重新计算 owner 的权限与完成态 |
| Shared controls/material/motion | token、语义、状态/动画、可访问性 | 页面私加颜色/blur/圆角、靠装饰推断业务状态 |

外部参考只取适用规则：Carbon 的组件 token 不应随意跨组件复用，motion 应服务信息层级且可静态替代；APG 要求真实模态、键盘和焦点行为与声明一致。[E02–E04]

**待浏览器验收**：支持桌面视口上的主路径，以及已广告窄屏范围；明暗模式、长文本/空/错误/unknown/过时、200% 缩放、reduced motion/transparency、键盘、焦点返回、关闭中请求、跨 Session 快速切换。重点不是截图总数，而是每条状态转换与真实 owner 的对应。部分行只能源码确认，不能据此宣称视觉合格。

## 7. 产品定义与对外文案

完整建议见 `PRODUCT-DEFINITION-DRAFT.md`。核心是：三个产品入口不是三个固定模型，也不是三个必须长期并行的进程。

Chat 管理交谈与来源连续性；Spark 做短任务的资料准备、翻译、检索与核对；Attention 维护未闭合请求及其证据，让 Agent 和人都知道下一步。Experts 承载专业差异及检查合同，不抢占前三者的产品定义。

特别要把 Attention 的愿景与当前 single-active-Run 合同分开。短期可用确定性事实检查加显式调用，不必先开放并行自主调度。外部 PR/message 接入是后续能力，不能将本地 Thread/记忆工具说成已经连接真实邮箱或 GitHub。[S12]

## 8. Paper 裁决

**不把 SE Paper 正文改版绑为此次 Release 的前置。** CourtWork 的 PAPER.md 只是入口与版本绑定，当前采用 SE 9.6 / 2026-09-07 / `d78fd312…`；不是当前发布页日期或产品状态的副本。[S18]

本轮抽查该采用版本的 Canonical 前部：已经包含未完义务、有限 Context、Store→Govern→Retrieve→Compile、专家隐性 Human Harness、输出成为后续输入和三链治理。因此 Chat/Spark/Attention 的定义是产品责任映射，不是 Kernel 缺失的证明。[S19]

有价值的工程观察可以先按 Practice Index 格式登记：原消息/版本、运行中断、下一次披露、Agent 处置回执、独立检查；明确它只能观察可见行为，不能证明模型内部真正注意或理解。[S20]

仅当真实实验出现现有命题无法表达或表达错误的反例，才按 Index → Practice → Canonical 的原修订纪律改正文。本次没有全文逐条审查 Paper，也没有比对 SE 最新发布版本；结论限定于工程已采用版本及其修订规则。

## 9. 建议施工顺序与退出标准

| 切片 | 建议写入范围 | 退出条件 |
|---|---|---|
| A / Release reproducibility | Runtime workflow、相关 tests/fixture 准备、README 生成源与成品 | 两 Node lane 全量/后续步骤绿；正常 Pages build 绿；不弱化测试；独立核查 |
| B / Product definition adjudication | 当前架构入口及 Chat/Spark/Attention 产品定义、capability 状态映射 | 三者职责/权限/持久化/缺口清楚；与 single-Run 和当前 tool 支持一致 |
| C / Public surfaces | 源模板、README、相关 Pages/运行配置说明 | 当前能力与目标自然分开；链接正确；生成物可复现；未重新定义内部正式状态 |
| D / Final candidate qualification | 既有 G1–G5 的证据与 current | 真实 Provider 专业纵切、桌面关键路径、演示与事实映射；最终候选 SHA 或明确源码等价 |

第二 runtime、通用 Broker、插件市场、任意沙箱、全平台 UI 和完全自动 Attention 都不默认进入 A–D 的前置。单独声称某项已可用时，对应证据才转为阻断门。

## 10. 本地 Agent 回收要求

逐项将本报告 finding 映射回现有编号，不新建并行总账。每项标为采用、已由其他提交覆盖、延期或拒绝；后两者须写明原因。回收文件原件并记录 SHA-256，保留源码基线、Actions run/job 身份与历史验收范围。后续通过结果不可抹掉原失败。

交付至少区分：改了什么；实际运行了什么；哪条 gate 关闭；未运行什么；是否已经更新发布声明。文案与架构裁决可以先完成，但只有真实证据能把“规划”变成“可用”。
