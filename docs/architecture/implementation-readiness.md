# 实现就绪图

状态：Round 3 现行开工图（2026-07-28）

本文是 Round 3 的**唯一开工图**：只规定成熟度用语、依赖顺序、验收证据和禁止越界项，不复制完成状态。能力当前是否成立、发布到了哪一枚制品，只认[当前基线](../status/current.md)。跨层字段与语义仍只由 Accepted ADR 拍板。

## 成熟度枚举

每条能力声明必须选用下列一个最窄标签；标签不是自动晋级阶梯，`released` 也不会把其中依赖的能力一并变成 product-live。

| 标签 | 可声明的证据边界 |
|---|---|
| `product-live` | 真实用户输入经过正式 composition 运行；不读取 fixture、recording 或 demo fallback |
| `package-ready` | 包内实现、公开出口与机器门成立，但尚未证明宿主 production 链已装配 |
| `demo-integrated` | fixture/demo 链能跨包运行，只证明契约自洽 |
| `contract-only` | 类型、port、schema、ADR 或 SPEC 已定义，production 实现尚未成立 |
| `external-validated` | 在明确版本、系统与输入输出证据下通过真实外部软件、宿主或数据源验证 |
| `released` | 精确代码和资产进入指定 tag、Release 或 Pages；不扩大其运行能力 |

## 开工时读取成熟度

能力事实只从[当前基线](../status/current.md)的“产品 live / 包与契约 / Demo / 外部兼容”四节读取，再按上表映射标签；本图不保存任何能力快照。工单完成后只更新当前基线和对应 SPEC/ACCEPTANCE，不在本节补写“已完成”清单。

## Round 3 目标链

Round 2 的 P0（`CHAT-MATERIAL-1`、`OUTPUT-CORRECTNESS-1`）已实现并独立验收（见当前基线）。Round 3 经产品负责人拍板：以 `HOST-AUTH-LITE` 替代 `HOST-AUTH-TRUTH` 解冻 Work live 主线（完整签名/TCC/重授权真机矩阵后置到正式签名发布阶段）；Chat 线依 [ADR-013](../decisions/ADR-013-chat-session-and-memory.md) 开工。

```text
Work live 主线
├─ WORK-STORE-MEASURE（已清账）──► WORK-STORE-1
├─ HOST-AUTH-LITE ──► CASE-ROOT-1 ──► MATERIAL-INGRESS-1
└─ MATERIAL-INGRESS-1 ──► LEGAL-S3-BINDING-1 ──► WORK-LIVE-1
                              ▲                       ▲
                              └──── WORK-STORE-1 ─────┘

Chat 线（ADR-013）
└─ CHAT-SESSION-1 ──► CHAT-MEMORY-1

独立契约线
├─ USAGE-LEDGER-1（已清账）
├─ PM-SCHEMA-1
├─ UI-RESIDUE-1
├─ VOICE-SPEC-1
├─ DESIGN-MD-1
└─ SITE-CRAFT-1
```

主线中的箭头是开工依赖，不是建议顺序；前置未独立验收时，后项不得用临时 adapter 越过。Chat 线与 Work 主线互不依赖，可并行施工，但 `CHAT-MEMORY-1` 不得先于 `CHAT-SESSION-1` 的窗口/transcript 语义落地。

**P0 契约纠偏链（2026-07-24，架构清账）**：源码复核曾发现 production Work 按每次
`runScenario` / `resumeScenario` 新建 `RuntimeGuard`，持久 `runtimeBudget.consumed` 不推进，
Settings 的 `maxUsd` 亦未装配。`WORK-BUDGET-1` 已以实现 `a82f51d`、台账契约修正 `0ff83f7`
及异会话验收 `4e301b5` 闭合该 Accepted ADR 违约，并成为 `main` 祖先；完整证据只认
desktop/core SPEC 与 ACCEPTANCE。本图不再把它保留为开放工单，现行首项是
`CONTRACT-REVIEW-SAFETY-1`。

```text
WORK-BUDGET-1（已清账）
        │
        ▼
CONTRACT-REVIEW-SAFETY-1（当前 App 首票）
```

`GOVERNANCE-CLEAR-1` 已在 `94f83ab` 上放行 `FILE-PREVIEW-1` 和 `CORE-BUDGET-1`；
WORK-BUDGET 验收在实现父 `a82f51d` 独立注入六类 production mutation 并逐项观察红灯、恢复；
最终目标 `0ff83f7` 取得 build/lint、desktop 465、root 1294 与 Playwright 333/333 全绿。
`App.tsx` 槽位现只释放给 SAFETY。预算三层契约只认
[`packages/provider/SPEC.md`](../../packages/provider/SPEC.md)、
[`packages/core/SPEC.md`](../../packages/core/SPEC.md) 与
[`apps/desktop/SPEC.md`](../../apps/desktop/SPEC.md) 的同名章节。

**Round 3 收尾序（2026-07-15 拍板；polish 分轮 2026-07-17 修订）**：主线收敛（MATERIAL-INGRESS → LEGAL-S3-BINDING → WORK-LIVE）→ 终局 UI polish 分两轮：**R1 定向修缮**（产品负责人 + Sonnet 手动定向修小问题/对齐；小修批以「全量门绿 + 架构逐 diff 复核」清账，不派独立验收——残留门/设计门/floor 为质量底座，任一回退即退回工单制）→ **R2 巧思视效**（Fable 主导，消费归档调研与素材包，批次独立验收 + Sol 视觉全量扫终审，先例红线见设计 README 与 SITE-CRAFT 判例史）——**R2 供料口径修正（2026-07-19 摸底核实）**：原「四面设计稿+17 族已齐」为仓外悬空承诺（仓内零实物，触成熟度不混写条）；现行供料真身=**定版原型**（`archive/design-prototype-2026-07-19-r2/`，封版五件含 2b 元素集双底）+ SchemaParts 5 枚仓内实物 + 奖级工艺八裁 + craft-evidence 六批；设计件非权威、落地逐件过门；**改序拍板（2026-07-19）**：R2/版式全量线放行、凡例权威化并入其首件；⑤余三项（ARCH-DEBT/消费 pass 余量/OSS-SUBTRACT-1）仍锁 harness 真实化，两线解绑。

**梯度律已升格（2026-07-19 夜）**：规则全文与档位定义只认 [`docs/design/principles.md`](../design/principles.md)；本图只登记 R2 依赖、批次状态和验收出口。

**P1 线级复调状态**：8 主界与 105 次界提案已签并完成消费值迁移；精确 1280×720、2400×1000 WebKit 完整帧、五类 mutation 与独立端口 312/312 e2e 均已核，验收由 `5b74588` 放行。签署表、前后帧与迁移账见 `site/craft-evidence/SKIN-R2-P1/`，线级法只认设计原则与既有机器门。

**SKIN-R2 v2 执行状态（2026-07-19 夜；2026-07-20 P2/P5 签署更新）**：P0/P1 已逐行签署并独立放行；**P2 已签**——排印 T01…T14 保 C（盲测 C 86.5/D 87.8 落预锁同分区【+916KB、无 WKWebView 权威 AA】，产品追认；复议门见排印凡例 R2 裁量节）、版式 L01…L16 全签（零消费 diff+全量验证）；**P5 已签**——F01-F05/F09-F12 签、F06-F08 退：`27990dd` 的「站面 UI/正文残面全量覆盖」要求**正式收回**（同分区结论跨面适用，站/壳 UI 轨同源不分叉），全量陌生化收敛为表达轨写本拉丁（Junicode 2.226），F10 门范围随收窄；前帧补摄为 P5 消费值前置。顺序 P2 TDD/验收 → P3 → P4，P5 并行。P0 权威落点是 [`schema-exemplar.md`](../design/schema-exemplar.md)；P2 C/D 裁量与字体退役律只认 [`typography-density.md`](../design/typography-density.md)；P4 `themeMode` 接口已预签。各批须独立 clone 验收，终局 `pm.PrdReview` one-shot 只在 P0–P5 全部放行后启动。

→ **一次小发版**：实现 legal 宣言、奠定 UI/UX 基调。其后其他垂类（PM scenario、roleplay 等）与角色面板/pets 类可召唤 preview 均为轻量包级小增量，不触 core。

## Round 4 对齐计划（2026-07-18 拍板，取代简单开工序）

**总纲：coding 暂缓一拍，对齐先行**——五项结构性忧虑（产品负责人提出）逐条对策化；对齐动作完成前，harness 真实化与 polish R2 不放行。

**忧一 · 代码先于架构 → 追认与清偿线**。已知「实现先行」债清单经 `ARCH-SCOPE-2026-07-20` 逐笔源码复核后修正为**三笔半**（R-2 准，原七笔中三笔已清偿、一笔措辞失实、一笔实为两件）：

| 笔 | 现状 | 待裁 |
|---|---|---|
| Legal 四 panel 硬编码（`PANEL-BLUEPRINT-1`，最大一笔） | 全额未偿。硬编码为 `App.tsx` 的顺位 `if` 链（`revision` 无判等、是末尾默认落点，20 个 prop 手工穿线）；同套 view 字面量在 App.tsx 另硬编码 5 处 + flow 映射 3 处；四 panel 本体约 533 行。**`kind:'route'` 载荷只有 view 字符串不携组件，故 descriptor→view 已通、view→component 仍全靠 if 链**；只有 `courtwork.artifact-table.v1` 走通 `kind:'component'` 全链 | 分批重构票 |
| S6 执行时序 | 「待实现」属实（renderer 登记为 `passive`，唯一入口是本地 `fileOpsMode` boolean 且非 demo 直接返回空，plan 来自 demo 构造器、宿主为内存 FS）。**装配点模式「未裁」**——`packages/legal/SPEC.md` 与两处 ACCEPTANCE 均为 `[需架构拍板]` 悬置；`LEGAL-S3-BINDING-1` 的 desktop 装配点裁定属 S3，不及 S6 | 按未裁项裁 |
| chat 附件「存入卷宗」 | 问题实为**按钮语义与实际入库判据不一致**，非「无入库能力」：按钮只翻 `scope` 字段（该字段唯一消费面是一枚 badge，不进请求不进 store）；真入库另在一条路径已接通，判据是 `caseBinding.kind === 'grant'`，对该案所有 ready 附件一律 ingest，与用户是否点按钮无关 | 二选一：接判据（3 处）或裁掉该 UI 字段（6 处） |
| interaction actor（**实为两笔**） | ⓐ `App.tsx` 的 `InteractionActor` 是 `{channelId:'desktop', actorId:'local-user'}`（**无 `desktop/` 前缀**）；ⓑ `work/work-runtime.ts` 的 `ConfirmationActor` 才是 `'desktop/local-user'`，另带硬编码 `role:'主办律师'`。两处**均落持久事件**（InteractionResolvedEvent／RevisionEvent + 确认账本） | 拆两笔；替换须带存量事件迁移策略，前置 authenticated principal ADR（当前不存在） |

**已销号三笔**（`ARCH-SCOPE-2026-07-20` §1.4 复核）：`workContextSegment` 死参数（AUDIT-SEAL-2 已放行并上静态锁，现存三处全是真链）；`.titlebar` 顺带删（裸选择器零命中，死账已清，删除有 mutation 红证）；`schema-marks.spec.ts` 前向红卫（已于 dark theme 落地同 commit 翻红并置换为真断言）。

对策不变：**ARCH-DEBT 裁定会**——架构对上表逐笔裁「ADR 追认为正解 / 重构票入队 / 显式容忍留痕」，三选一不悬置。纪律重申为硬门：实现会话引入新跨层面必须先指认 SPEC/ADR 锚点，无锚即 `[需架构拍板]`，验收查锚。

**裁定会已执行（2026-07-26 三笔半逐笔定谳；2026-07-27 落痕，原件 `arch-rulings-2026-07-26.md` 按归档索引定位）**：

- **笔一（`PANEL-BLUEPRINT-1`）——重构票入队，排位上提**：底座与契约口径确认后，「垂类以硬编码组件进壳」是该口径在仓内的最大存量违例。D1「不提前大爆炸重构、分批交付」不变，但首枚 `matrix` 插入 App 队列 `DEBT-DOSSIER-1` 之后、`C3-1` 之前；其余三 panel 按「过手即拆」随后续触碰分批。**首枚已偿（2026-07-27）**：matrix 迁 `kind:'component'` 全链（实现 `f3d2bf3`、验收一驳回一聚焦复验放行 `b521b34`、no-ff 合入 `1b8c450`；view 扩形与拒载入 ADR-006 修订记录；`revision` 默认落点顺带收口为显式拒绝；高水位 2551→2549）。其余三 panel 仍在 if 链，按「过手即拆」随触碰分批，本笔保持开账。**（2026-08-10 订正：其余三 panel 已随 `GENERIC-PACK-1` 全部迁 `kind:'component'`（合入 `9b5a321`），本句自彼时起陈旧；笔一全额清偿，开账关闭——PREVIEW-TAB-1 验收观察①上浮）**
- **笔二（S6 装配点模式）——模式级定谳，细则随票冻结**：沿 `LEGAL-S3-BINDING-1` 先例，执行触发经既有 Work command/confirmation 链在受信组合根装配，renderer 保持 passive，plan 来自 scenario 真实产物；demo 直连管线（`fileOpsMode` 本地 state + demo 构造器 + 内存 FS）退役为 fixture-only，不得成为第二装配点形态。授权持久先于 effect（ADR-017 决定四）不变。SPEC `[需架构拍板]` 按此销记，字段细则在 `S6-EXEC-1` 派单时冻结。
- **笔三（chat scope 判据）——已闭合销记**：`A/R-26` 裁接判据，已入 `DEBT-DOSSIER-1` 票面与 App 队列，无余量。
- **笔四（半，interaction actor 两笔）——显式容忍留痕**：当期产品单机单用户，两处 actor 串是稳定常量，不构成运行时风险；替换前置（authenticated principal ADR）属 Stage 2，现在铸 ADR 违反「真实需求进入对应阶段才立」纪律。容忍边界两条：新代码不得新增第三处硬编码 actor（复用现有两常量）；principal ADR 立项时必须携存量持久事件（InteractionResolved／Revision／确认账本）迁移策略，届时本容忍失效。

**忧二 · 减法未足 → OSS 减法评估线**。2026-07-28 以 `main@3ddb14e` 的真实消费点重新逐面
裁定；loop 最大一问已由 ADR-022 先答（内嵌 `@earendil-works/pi-agent-core`）。对已经漂移或
新进入产品路径的 OpenWork/OpenCode、pi write、agent GUI 与 capability filesystem 重回一手源；
其余面只在既有调研仍足以回答当前“接/不接/删除”时消费，不把旧版本号伪装成当前事实。下表是
当期架构基线，不是“所有候选已完成生产兼容实测”的报告；每张直接依赖票仍须在开工时复核 exact
version、license/传递依赖、维护状态、bundle/Tauri 兼容与反例门。

| 面 | 当期裁定 | 边界 |
|---|---|---|
| Chat stream / Stop / Retry | **借行为，不直接依赖** [Vercel AI SDK](https://github.com/vercel/ai) / [assistant-ui](https://github.com/assistant-ui/assistant-ui) | 现有 `provider → Turn Engine → append-only journal → projection` 已成立；接 runtime 会重建 provider、thread、retry 与持久真源。C3-1 只补 Work 缺口 |
| Toast | **直接依赖** [Sonner](https://github.com/emilkowalski/sonner)（MIT）的 `unstyled` 模式 | 保留其 Toaster DOM、堆叠、update/dismiss、计时与时序状态机，只重皮；确认、授权、不可逆动作与账本决定永禁 |
| Modal focus | **直接依赖** [`@react-aria/focus`](https://www.npmjs.com/package/%40react-aria/focus)（Apache-2.0）的公开 `FocusScope` | 逐个既有 modal 迁焦点闭环；exact pin、量 bundle delta，禁止 `react-aria/private/*`；`@radix-ui/react-focus-scope` 上游自述为 internal utility，不作为直接 API |
| 会话检索 / 中文全文检索 | C3-2 **保留现有 substring**；卷宗全文索引**删除当期接库动作** | 小型派生 transcript 无需第二索引；中文语料、召回准则、删除/隔离与性能需求实证后再评 FlexSearch/Orama 等 |
| Plan / todo、状态持久 | **保留自研投影/窄 store** | `todo_snapshot`、版本信封、CAS、container partition 是项目真源；任务库/Zustand 类不能替代 |
| Diff | **直接依赖 npm [`diff`](https://www.npmjs.com/package/diff)**（上游项目 jsdiff，BSD-3-Clause） | 只做展示 diff；desktop manifest 必须显式 exact pin，不借 pi core 的传递版本，更不得误装 npm `jsdiff`；accept 仍进确认账本，大文本须 timeout/maxEditLength 或 worker |
| pi workspace 文件边界 | **直接依赖 exact 同版本** [cap-std](https://github.com/bytecodealliance/cap-std) / `cap-fs-ext` / `cap-tempfile@4.0.2` | `Dir` 持 capability，`open_dir_nofollow` 逐段下降，`TempFile` 同目录替换；本仓薄层只编排私有权限、平台支持的持久化屏障与 journal 状态机。三件均非 OS sandbox，`cap-std` 单独也不证明 root 内 no-link |
| pi agent GUI | **直接依赖** [assistant-ui](https://github.com/assistant-ui/assistant-ui) 的 headless primitives + 公共 `useExternalStoreRuntime`；[Open WebUI v0.11.0](https://github.com/open-webui/open-webui/releases/tag/v0.11.0) **只借行为证据** | 只用于 pi lane；Courtwork journal/projection 仍是真源，LocalRuntime/cloud/AI SDK adapter/branch/edit/queue 禁用。Open WebUI 的 Svelte/Socket.IO/runtime 不接入，其现行 Open WebUI License 也不满足本项目直接复制/依赖口径 |
| Markdown / graph / E2E | **维持已直接依赖** unified/remark、G6、Playwright | 安全 AST、事实等级/token、Tauri/Office 真机边界仍由本仓门禁拥有 |
| OOXML / DOCX | **保留自研加固** | 通用 docx/Mammoth 不证明宏/ZIP/rel/comments/签名/no-replace 与 Word/WPS roundtrip；只能作独立对照 |
| 材料 tree / 全文 index | **删除当期选库动作** | 容器真源、深树/两级需求和试点检索诉求未实证，先接库会提前造第二真源 |

**忧三 · 绿≠功能≠架构 → 版级仪式两件**。成熟度枚举与 current.md 唯一口径不变；新增版级收尾仪式：(a) **真机全链回归清单**——试点台账模板化为脚本化 checklist，每版收尾必跑（工程绿只是入场券）；(b) **解耦审计仪式化**——本轮三腿审计（包边界/路由双轨/effect 授权）定为每版收尾动作，新抓口子按 SEAL 模式入票。「机制不对称」教训固化：立门以族为单位铺满。

**忧四 · 调研未充分利用 → 消费率清账**。归档索引已有时效三态；追加**消费状态 pass**：全部「可借形/仍有效」项逐条裁「入票 / 显式不采纳留痕」，不许悬置——已知未消费清单：oss-gui-source-patterns 采收 8 项、emil polish 规则包、namethatui 词典正式并入、SkillsBench 归因协议（SKILL-REFINERY 验收设计）、OWASP Memory Guard 四态（memory 演进 ADR 素材）。pass 结果写回归档索引。**pass 已执行（2026-07-26 七条零悬置；2026-07-27 写回归档索引）**：oss-gui #4 入 `UI-TOAST-1`／`WORK-PLAN-PANEL-1` 素材；#3 挂 `UI-RESIDUE-1` 批二；#8 显式不采纳（重启判据＝分栏拖拽出现可测卡顿）；emil polish 挂 R2 既有通道不另立票；namethatui 并入 voice 词表便利单；SkillsBench 归因协议显式后置（eval 线立项素材）；OWASP Memory Guard 四态显式后置（挂「后续 ADR 队列」memory 演进议题）。

**忧五 · 前端克制被轻视 → 凡例权威化 + 克制审计**。SCHEMA-EXEMPLAR-1 凡例文档尽快进 `docs/design/`（权威层）；R2 每批验收附**克制审计条款**：新增视觉元素必须指认业务语义（风险色阶/落定感/双值锚类），纯装饰默认拒绝；**减法纪律**与设计原则是正面资产不是欠账，上游口径同表述。（原文作「减法八条」——该编号清单不存在，见方向②的坐标更正；此处所指是归档减法调研的真实主张「减 UI 暴露面不减能力」，与根 `CLAUDE.md` 复杂度节制条并列而非同一条。）

**执行序**：① SEAL-2/3 → ② ARCH-DEBT 裁定会 + 调研消费 pass（架构执行）→
③ OSS-SUBTRACT-1 → ④ 凡例文档权威化 → ⑤ harness 真实化线（TOOL-READ-1 →
GENERIC-PACK-1/PACK-INTERACT-1/SCENARIO-LIVE-2）与 polish R2。开源纪律与 License 红线
（pandoc GPL 拒例）全程适用。**进度（2026-07-28）**：①②已有在案结果；③已在现行
`main@3ddb14e` 完成阶段裁定并以上表直接进入权威链，原「已起跑」口误与云端快照失效不再构成
开工事实；这不替代各直接依赖票的 exact preflight。⑤不再受一张泛化 OSS 报告阻塞，但各票自身
ADR/SPEC 依赖、`App.tsx` 锁和独立验收纪律不变。

**Rust 重构裁定（2026-07-18）**：节点未到。Rust 边界维持「受控宿主能力」，按需逐点下沉（`scoped_write` 下沉即实例）；全量 Rust 化触 ADR-011 第二 runtime 红线。重启判据：性能实测瓶颈 / 第二宿主真实需求 / TS 层门禁封不住的安全面——满足其一再议。

## Round 5 方向登记（2026-07-18 夜，产品定调，待逐项出票/ADR）

1. **统一填格协议**（chat/work 同规范；**已由 ADR-016 收口，Accepted**——冻结填格模板随垂类包 descriptor 声明并由 registry 冻结、Chat 填格产物以带版本字段的 Turn journal 条目持久而不上 `ArtifactEnvelope`、UI 触发入口另票）：LLM 握手后按 schema 注入的字段填入对应板块——把场景 model 步的「schema 约束输出→校验入格」泛化为 chat 面同规范（chat 轻量产出也走同一协议，非自由渲染）。跨层契约，**ADR 议题**。
2. **四项基础 agent 功能**（**已由 ADR-017/022 收口**）：reading 与 pi 覆盖式 writing 先组成
   通用底座；edits 只等后续垂类“修订”契约，bash 继续不入界。原案曾把 ADR-017 决定一至七写成
   封存；2026-07-26 已启封为“若有真实需求时的受控脚本形态”，但 `EXEC-SCRIPT-1` 因成熟外采
   隔离方案未裁仍 parked，启封不等于实现。**bash 入界属重大边界变更**——冲突面的坐标此前
   记错：归档“减法”主张是减 UI 暴露面而非任意 shell 纪律；真实约束仍是 ADR-011 的后台 bash
   禁令、ADR-017 的宿主零 shell 与 ADR-018 的等级—能力绑定。现行唯一写例外是 ADR-022 的
   Rust host-mediated app-data workspace，不触用户文件。
3. **中间文件缓存（2026-07-28 订正）**：通用 agent 过程 artifact 先落
   `app_data/pi-workspaces/<container>/<session>`，不直接进入 case-path「工作稿」；覆盖式
   `write` 只作用该可整删 workspace。edits/晋升用户工作稿由后续垂类“修订”契约另行确认，
   原件只读不变。
4. **本地缓存容器化**（**已由 ADR-019 收口，Accepted**——就地补 container 维而非另起布局、渐进披露 index 惰性建立且失效即重建、未归档区设上限并诚实提示而不拒新建不静默丢；隔离面另见 ADR-018，当期显式停在等级 `none`）：不按 session 分，按 **chat 卷宗（project，待泛化）**——chat-as-dossier 容器同构论（归档已有）升格 ADR 议题；roleplay 同态（前端目录构成规则不同，schema 注入/取用/续行同构，纯编排差异）。session 管理只提供召回入口，默认不展示、不交用户管理；chat/work 形态接近但账本隔离不变。
5. **chat flow 全量适配**：CHAT-MD-TABLE-1 扩为 chat flow 全量单（md 列表/paste 卡片/结构块逐项清点拍板）；thinking 同态引用（chat 留图标 vs work 查看 progress）**先盘后拍**——立 CHAT-FLOW-AUDIT 侦察单（chat/work 两面 flow 详细构成对照），产出交架构拍板。

6. **场景声明交互方案（2026-07-18 夜评估定调）**：层次=包加载（应用级+建案选包）→场景声明（composer 上方文本 Button 排=已加载包场景清单，**现状形态追认为正解**，Button 粒度=场景）→预检表单→运行→表入 tab。**声明前零 schema 字段**：不渲染空表骨架（空骨架是幻觉的 UI 形态），Preview 保持窄态+各 tab 显式指引态（「该工作面由 X 场景产出·从场景按钮启动」）。失败三道闸：预检闸（descriptor 携最低材料要求，不足显式反馈不起跑——**唯一新增契约点，随 GENERIC-PACK-1 拍板**）、运行中闸（既有 OOC/coverage 剪枝，「依据不足」显式态非编造）、文案闸（voice + 守门，零红字技术报文）。

7. **前端全量替换评审门（2026-07-19 拍板）**：序=Design 原型完工 → 三方对比评审（现行前端 / Fable 已完成 Pages 批 / Design 空跑原型），评估全量替换方案与原生 SVG 重绘清单 → 一切落定后 **Fable 执行迁移**（通用层+Pages 巧思，其反 slop 与前卫技法 context 最强）→ 迁移完成的**验收律：新 schema 表由非前沿（甜点档）模型从凡例+元素集+词表缝一次衍生过门**——「schema 自然生长，不依赖最强模型」是终局判据。Fable 已完成的 Pages 批在评审门前**暂缓合入**（作为三方之一参评，不作既成事实）；评审期间门禁全量保持（残留/floor/设计门零豁免）。**范围收窄（2026-07-19 拍板）**：迁移=皮层置换非重写——转移的是用色/字体/版式/SVG 记号系；既有 UX 行为骨架（显影/落定/收拢等成熟交互与残留门锁住的全部行为）**原样保留不抛弃**（成熟感是资产）；行为断言与 e2e 全程不回退即迁移的硬边界。**深色模式顺带交付（2026-07-19 拍板）**：双宗齐备即双主题——产品壳 dark=磁青宗（与站同源），theme 切换=token 层置换（皮层迁移同机制自证）；暗底语义色可读性重校、残留/对比度门双底各跑、数据区静止不因主题而异。

**迁移 Plan 裁决（2026-07-19，四冲突定谳 + B0 批准）**：C-1 字体硬边界修订——产品壳字体随迁移进 MVP 非商用轨（临时授权姿态显式声明既有），红线改挂**发行门**（商用发行前换正式授权或回退系统字），B2 成立；C-2 深色条款胜——tokens.json「浅色唯一」自述与陈旧 principles 引用随 B0 修订；C-3 评审对象定谳为两方（现行含 B1-B3 vs 原型甲/乙），现行壳由 Plan 盘点画像代表，时序矛盾按「B1-B3=增量线」既有厘清定案；C-4 双底=主题级断言（记号 SVG 于 light/dark 双 theme 渲染一致，宗由 theme 承载）。**B0 定值批准**（评审门内零代码）：磁青系 hex/线级 token 规格/五记号 SVG 规格/泥金值——取值源=Design 原型双宗切换实现+架构核定，落 tokens.json 与设计文档；B1 色阶最先、B5 深色最后、B2/B3 可对调条款批准。技法级速裁：朱入语义色预算（与绿双案并测）；文武线属线级组不经 icon 门（扩门另拍板）；原型 gradient/box-shadow 不自动入壳、逐件过克制审计；界行巡行动效拒；floor 只升不变；site 仅同步 token 命名。

**皮层迁移批次账（2026-07-19 立，随批滚动）**：`SKIN-B1`（色阶批）交付链 `8bb305d→0319aa6→f3eeab7→d432e6d`，独立验收一驳回一复验后合入。**B2（字体批）票面**：①排印光学——仿宋视觉字距+中文标点悬挂（奖级工艺 #1，裁定已批、docs 零落地的挂账落位）；②tertiary 元信息可读性闭合——实测 131 消费点字号 10–13px/字重 ≤510，三面对比 4.23/3.98/3.84:1 均低于 AA 正文 4.5:1（B1 如实标注之既存缺口，未回退未闭合）；闭合杠杆=字号/字重升档或值面复审，以 4.5:1 为的，色值单独加深伤中性阶层级非首选；③字体 C-1 非商用轨显式声明（迁移 Plan 裁决既有）；④编排方向随字体策略二次修订（2026-07-19）：标题通行宋体/正文仿宋轨，壳侧落地须与 tertiary AA 闭合**联测**（仿宋实际度量下重测三面对比与字号补偿，不得沿黑体度量宣称）、并过 C-1 发行门口径。**B2 拆批（2026-07-19，排印凡例立）**：事实源=`docs/design/typography-density.md` 排印凡例；B2-0 定值批（争点拍板后开工：字栈/字号槽 token、槽位表值、四道排印机器门、AA 四元联测、许可快照）→ B2-1 置换批（消费面置换+排印光学）；凡例争点一二已拍板（功能轨甲·系统栈续任；文书轨先朱雀仿宋落地、聚珍新仿三许可并行核后 token 层置换），争点三即 B2-0 工作内容——**B2-0 放行**。**B3（线级批）票面**：文武线/乌丝细线 token 已由 B0 定值，消费面置换随本批；奖级工艺 #2 文武线破格同批；**反面警示（原型盘点 2026-07-19）**：原型「乌丝栏」为引语卡框廓装饰件，与层级线同名实异，不得借形。**B4（记号批）票面**：五记号 SVG 落地——鱼尾几何自原型直取、圈点借形改色（琥珀让位语义宣告）、**朱印纯几何无字**（UI 尺寸印文即墨污；hero 级印文变体另案）；朱印落定章接线＝`line.settled` 唯一消费面（前向守卫既装，接线必携落定数据）；奖级工艺 #3 朱印签名交互同批；**新语义两件（盘点采纳 2026-07-19）**：时间轴节点形状=执行者、图谱边样式=事实等级（ADR-003 视觉投影），各带数据绑定前向守卫（无数据之形即违例），边样式先探 G6 canvas 可行性。盘点全文见 `archive/design-prototype-2026-07-19-r2/prototype-audit.md`（**史料线索**：事件件，已随 B4 清账于 `c5a249b` 归档并更名，只说明结论从何而来，不构成现行依据）；版式两项（卷宗容器为组织单元/产出先入卷再确认）移交容器化 ADR 议题素材，不入 B 批。**B5（深色批）票面：已销号**（R-4 准，`ARCH-SCOPE-2026-07-20` §1.2 B 组复核）——三项票面内容已由 `SKIN-R2 P4` 实质吸收：`themes.dark` 已上身（单个 `:root[data-theme='dark']` 块纯 token 换值、零组件分支，边界门另锁「组件级 `[data-theme]` selector／`prefers-color-scheme`／暗宗根内几何声明」三类，四类真 mutation 红证在 desktop ACCEPTANCE）；深宗四槽已由独立验收在真 Tauri WKWebView 另摄复核（不复用实现截图，产物在 `site/craft-evidence/SKIN-R2-P4/acceptance-*/`）；`.titlebar` 顺带删已完成并有 mutation 红证。**唯一余量挂账**：settings-optin 贴阈例的深宗复测注记未落——残留门阈值放宽至 3 与校准注记、超阈断言、舍入带成片计数上限均已实现，但该例在深宗底下实测 Δ 为多少、离阈还有多远未留证，`apps/desktop/tests/e2e/ui-residue.spec.ts` 该例前置注释仍是待办态。**该挂账项由下一张皮层相邻票顺带执行——已由 `SKIN-DYSTOPIA-1` 项 E 承接并清偿（Q9 裁定，2026-08-09 清账销记：深宗 16 例 Δ 分布实测留证、待办注释改实测值、`maxChannelDelta` 维持 3）**（票丙「标题轨整备」为当前最近载体），不单独立票。

**前端线先行（2026-07-19 产品拍板改序）**：B3 线级批 → B4 记号批（壳侧）与 `SITE-CRAFT-2` 磁青宗批（Pages 新设计语言落账 + 前卫实验田部署）先行开工，两线并行（壳/站文件面不相交，deslop-scan-lib 共享面由站批独占）；案头序（ARCH-DEBT/调研消费 pass/OSS-SUBTRACT-1/三 ADR）随后。**对齐计划⑤的门不因改序豁免**：壳侧 R2 巧思回迁与 harness 真实化仍待⑤放行——站面先行、成熟后经 R2 门回迁，正是激进技法的唯一合规通道。**SVG 记号解耦预留（随两线同装）**：SchemaParts 件库为站/稿/壳共用单源，原生 SVG、按 token 名消费不带值；C-4 双主题渲染一致为记号系的主题级断言（宗由 theme 承载，记号不择纸温）——此三条即「回迁 R2 时零重绘」的机器可验形态。

以上七项在对齐计划执行序⑤之后排队；bash/统一协议/容器化三项 ADR 先行，不得实现先于契约。

## 工单边界与退出证据

Round 3 起每张工单附带**复杂度审视义务**（根 CLAUDE.md 复杂度节制条）：实现会话在 SPEC 留痕「本单新增了什么概念、为何非加不可」；并对触碰范围内既有代码做一次复杂度扫描，发现可删的偶然复杂度（死配置、无消费导出、多余抽象）列入该层 SPEC 提案区交架构拍板，不越权顺手删。数单之后全仓即完成一轮复杂度过筛。

### 已闭合垂类窄链与停放的公开候选线

2026-07-24 曾把下一枚公开版本收窄为仍处 **Stage 0** 的 Legal 合同审查单品；2026-07-28
产品再裁：这条窄链已经跑通，但它不能替代 Pi 交互，也不能让产品取得 agent 称谓或
`v0.2.0` 候选授权。下列承诺作为已完成垂类链的边界与未来发行输入保留：

> 把一份明确选定的 Word 主合同与支持材料放入案件，逐条审阅可回到原文的风险，亲自确认、驳回
> 或修正结论；若至少确认一项风险且没有待索证项，得到以原 DOCX bytes 为底稿、未触 parts 内容
> 不变且受触 parts 保留既有结构语义的合同审查批注稿；零风险、存在任一待索证项或全部驳回时
> 诚实完成但不伪造空文书；
> 并能在重启/切案后查看或继续同一账本。

它**不宣称 Stage 0 已退出或产品已是 agent**：Word/WPS 精确版本打开—轻改—保存—回读、持续真实试点的采纳/
驳回/修正/交付基线、六处考点正式打分仍是外部证据；没有这些证据时 release notes 必须继续写
`not external-validated`。`GENERIC-PACK-1` / `PACK-INTERACT-1` 后置到本单品闭合之后，不以
“下一版候选”字样越过 roadmap 的先 Legal 后泛化方向。

版本内代码与治理依赖为：

```text
(FILE-PREVIEW-1 + CORE-BUDGET-1) → WORK-BUDGET-1（均已清账）
CONTRACT-REVIEW-SAFETY-1（已清账） → CONTRACT-OUTPUT-TRUTH-1（已清账）
(已清账 FILE + OUTPUT + TRACE) → DEBT-DOSSIER-1（产品链出口；不直接授权候选）
```

`CONTRACT-OUTPUT-TRUTH-1` 直接消费 Safety 票建立的 post-revision replay、零 confirmed 分流和
退役后的本地 dispositions/non-applied waiver，因此依赖关系是严格
`SAFETY → OUTPUT → TRACE`，不得并行改同一 App/compile path。未来若重启公开发布，候选仍须
明确区分“自动化/本机成立”与上述外部证据，不以版本号抬高成熟度。现阶段唯一收敛节点是
`PI-BASE-HEADLESS-ACCEPT → PI-LANE-UI-1 → WORK-AGENT-GUI-1 → PI-BASE-GUI-ACCEPT → PI-DEBUG-BUILD-1`；
前三节点赋予 agent 称谓所需的产品能力，最后一节点只证明维护者个人安装形态。

**收敛节点前置新立票 `PI-HEADLESS-HARNESS-1`（2026-08-05 侦察定谳，协调立票）**：`PI-BASE-HEADLESS-ACCEPT`
是纯验收（「不实施契约修补，只写 ACCEPTANCE.md」），但其六格矩阵要求跑一条 real-Agent↔real-stdio-wire↔
real `WorkspaceFsHost`(注入 Approve driver)↔real-disk＋restart 的合成链——现读实证该链**不存在**：Rust
golden 走 `Scripted::Line` 回放（`pi_loop.rs` `dual_end_golden_wire_session…`），Node faux 走 `createHarness`
host 桩（`product-runtime.test.ts`），每枚测试只桩住 seam 一侧。故 HEADLESS-ACCEPT 前须先立最小实现票
`PI-HEADLESS-HARNESS-1`，范围两件：**(A) Gate D 清偿**——`session_resumed` 记实收 promptId/capabilities，
journal 闭集**循裁定A先例扩员**（旧档续 valid，读侧闭集非通配），关闭「注入 driver 后账实不符」（[需架构拍板]A
的 resume 孪生，协调裁定＝扩员，留架构推翻窗）；**(B) headless 合成 harness**——dev/acceptance-only 入口
（不入 production wiring，faux provider 不进产品 provider 注册，守 demo/real 隔离），composes 真 pi Agent＋
pi-ai 自带 faux provider（真 key 属 GUI-ACCEPT，本票不触网）＋真 stdio wire＋`WorkspaceFsHost.with_decision_driver(Approve)`
显式注入（ADR-022 六-C:650 明令 headless 须显式注入、禁 always-allow 冒充产品授权）＋真 disk，可驱动六格脚本
对话与 restart/resume 新 leg 回读。退出证据：六格各产 Agent events＋host req/result＋journal＋最终 bytes/hash；
两注入点（Approve driver／faux provider）为 ADR 明批的显式延迟，其余全走 production 代码路径；App 槽无关（纯
headless）。**已放行合入（2026-08-05，验收 `b055d7a`）；provider 更正为可插拔注入点（自身 smoke 用 faux 不触网，API 接真 key 供 HEADLESS-ACCEPT）。SPEC §九 亲核定谳：HEADLESS-ACCEPT 六格矩阵需真 DeepSeek key（cell 1-6 须真模型推理，:744「无 key/model 证据只能记 external-validated blocked」），非 faux——faux 只辖 §七自动化 CI 门。故 HEADLESS-ACCEPT 尚缺两前置：真 key（产品负责人提供）＋下条 `PI-READ-TOOLCALL-1`。**

**`PI-READ-TOOLCALL-1`（2026-08-05 harness 验收定谳立票，HEADLESS-ACCEPT 前置）**：真 Agent 经 read/glob/grep 读 `/workspace`（workspace_read host op）今日恒 `StateViolation`——`serve_read_request` 的「读须归属在场 tool call」翻红，根因 `active_tool_call` 只在 pump 的 `Write` 臂 arm、读工具落 `_=>{}`（harness 验收源级＋wire 探针＋一行修复变异三证定谳，唯一充分）。**兼 `PI-WORKSPACE-READ-1` 套件级覆盖洞兼真实产品缺口**（第四例放行后逃逸，与 golden-坏形／quarantine／五-7 同族）：该票全部 Rust 读臂集成用例（`pi_loop.rs` 8035/8119/8205/8302/8370）一律 `tool_started_line→ProductToolName::Write` 顶名，唯一 Read tool_started 用例读 `/case`（直读无 host op），故读 host op 路径从未被真驱动。范围两件：(A) `active_tool_call` 由 write-only 改「凡能发 host op 的工具，write 取/read peek」（读臂 peek 不 take，一次 glob 逐层发 list——沿 WORKSPACE-READ 读臂 peek 语义），转绿 harness 的 `headless_workspace_readback…blocker` characterization 测试；(B) 复核并改造那批 Write-顶名读门为真 Read tool_started 驱动（闭覆盖洞，born-red 须以真 read op 触 StateViolation 先红）。挡 HEADLESS 六格 3/4/5（/workspace 回读），格 1/2（/case 直读）不受影响。禁区：不改 wire schema、fold() 推进臂、uncertain 压扁；核状态机语义变更须极窄且回执单列。随本票顺修陈旧辅助门 `gate:verified-node-production`（`verified-node-gate.mjs:462` 硬编码首包 ready caps 恰 `["case_read"]`，PI-HOST-LOOP-1R3 `8e217e4` 遗留、早于 workspace caps 上线、base 亦红、不在例行门集故长期无察，校准为现行三员握手）。

**GUI 后下一相（2026-08-04 产品定向落痕）**：`PI-BASE-GUI-ACCEPT` 收敛后，下一相为垂类/demo
材料解耦成独立装载的插件包——路径沿既有冻结票阶梯：`GENERIC-PACK-1`（构建期解耦，验收律
「只装通用包时产品是合格 work agent」＋卸垂类包冒烟 e2e）→ `PACK-INTERACT-1`（启停/建案
选包/显式空态）→ 真动态装载属 ADR-015 预留位，需求已由产品声明到来，届时先立 ADR 再动工。
该相全程携带 **matter 不变量**：卸垂类后 chat/work 仍以案件（matter）为单位——ADR-013 案件域
记忆、ADR-021 Dossier 蒸馏与案上确认账本原样有效，续行自主，人工 review 面在案上产物与账本
而非 session 清单；`DOSSIER-FLOW-1` 作为该不变量的实现票按票面开工。本注只记相序与不变量，
不改动任何票面与依赖。

**停放的 `v0.2.0` 公开发行许可链（2026-07-24；2026-07-28 parked，ADR-020）**：下图只保留
为未来显式重启时的依赖基线，不是现行可派队列：

```text
SAFETY → OUTPUT → TRACE → DOSSIER → VERSION-PREP ─┐
RELEASE-FONT-LICENSE-1 ───────────────────────────┴→ SOFTWARE-AUDIT → SOFTWARE-NOTICES
                                                                         │
                                                                         ▼
                                                                    SMOKE-TRUTH
                                                                         │
                                                                         └──► 全量门 / 唯一候选 DMG / 独立候选验收
```

字段、文件白名单与 mutation 只认 [`release/SPEC.md`](../../release/SPEC.md)。未来重启时 FONT
可与产品链并行；VERSION-PREP 等产品链，AUDIT 同时等 FONT 与 VERSION 后再冻结最终图与逐件
许可裁定，NOTICES 只读消费 AUDIT，SMOKE 最后收同一性/直接启动。字体 notice 不等于软件
notices；两账、图审计与候选直接启动任一未放行，`v0.2.0` 均不可公开。现阶段**所有
`RELEASE-*` 票（包括 FONT）均不得派发**；恢复时还须重新冻结版本、最终图和许可输入，不能
沿用旧 hash。

### CONTRACT-OUTPUT-TRUTH-1 开工补充裁决（2026-07-24）

以下只冻结 SAFETY 放行后的实现边界，不授权 OUTPUT 抢跑：

- Rust 安全面只新增 `apps/desktop/src-tauri/src/case_output_fs.rs`；dirfd/no-follow/stat/hash/
  no-replace 与可注入 syscall seam 全住该模块，`lib.rs` 只留 command/wiring，不得再拆第二模块。
- macOS production 以 `#[cfg(target_os = "macos")]` 消费 `O_NOFOLLOW_ANY` 与 `*at` 强语义；
  非 macOS 必须编译，但 case-output stat/write 只返回 typed `failed/unavailable`，不得以
  canonicalize/path/rename 或较弱 no-follow 形成 fallback。browser bridge 独立镜像同一结果联合。
- replay 失败只在 desktop `WorkReplayError` 映射：宿主读取拒绝/未知异常为 `unavailable`，
  `UnknownEnvelopeVersionError` 为 `unsupported_version`，`CorruptEnvelopeError` 为 `corrupt`；
  读出 envelope 后显式比较 query ref 与 header 才产生 `ref_mismatch`。artifact isolation 不算
  corrupt；不扩 host wire 或 core schema。
- output fixture 只新增一枚 `packages/output/test/fixtures/contract-review-complex.docx` 与可选
  同目录 README；签名、宏、XXE、zip bomb 等探针全部在测试内存中从该原件派生，不堆第二批
  binary fixture。
- Legal 缺主合同锚以导出的 `MissingPrimaryMaterialAnchorError` 一次收齐全部 confirmed 风险，
  desktop 机械映为 `blocked/non_applied` + 既有 `not_located`，不扩 `NonAppliedReason`、不铸
  instruction/waiver，也不触 output。
- 既有 `work-live.spec.ts`、`case-persist.spec.ts`、`work-turn.spec.ts`、`work-budget.spec.ts`
  只获准机械迁移到真实 DOCX、显式主合同选择、SAFETY 最终提交与版本化产物名；行为扩张仍只进一枚
  专用 OUTPUT e2e。既有 work-live/legal-s3/work-port/material/host-auth 静态门只可同步本票新
  真源纪律。正式派单前实现者须在 accepted SAFETY tip 重 grep 全部 consumer。
- 顺带（架构裁定 2026-07-26，SAFETY 验收发现）：删除 `compile-review-output.ts` 内零消费的
  `useContractReviewOutput` 遗留 hook（约 90 行，「过手即拆」策略调整期草稿）。删除前留 grep
  零消费证据入 SPEC 留痕，删除不改任何现行行为，build 与既有测试为证。属复杂度清偿，不扩大票面。

**已清账工单**（完整范围与退出证据见各层 SPEC/ACCEPTANCE 与[当前基线](../status/current.md)，本表不再复述）：`WORK-STORE-1`、`HOST-AUTH-LITE`、`CHAT-SESSION-1`、`CHAT-MEMORY-1`、`CASE-ROOT-1`、`MATERIAL-INGRESS-1`、`LEGAL-S3-BINDING-1`、`WORK-LIVE-1`、`WORK-HOST-1`、`USAGE-LEDGER-1`、`UI-SURFACE-1`、`VOICE-SPEC-1`、`DESIGN-MD-1`、`CASE-PERSIST-1`、`OUTPUT-CONFIRM-UI-1`、`SITE-CRAFT-1`、`LAYOUT-CONVERGE-1`、`PILOT-LIVE-1`、`WORK-TURN-1`、`CONFIRM-GRANULARITY-1`、`PILOT-LIVE-2`、`READER-ISOLATION-1`、`PROJECTION-RESUME-1`、`WORK-TURN-2`、`PROVIDER-STREAM-1`、`AUDIT-SEAL-1`、`AUDIT-SEAL-2`、`AUDIT-SEAL-3`、`KEY-PERSIST-1`、`CHAT-MD-TABLE-1`、`CASE-TITLE-CONVERGE-1`、`FILE-PREVIEW-1`、`CORE-BUDGET-1`、`WORK-BUDGET-1`、`DEBT-CLEAR-1`、`DEBT-GATE-LABEL-1`、`MD-CONVERGE-1+`、`MODEL-CONFIG-EXPLICIT-1R`。另：`SITE-CRAFT-2` B1-B3 批已架构复核合入（90be976/d9a75aa/617bc24），票面余量（刻本 title 轨/件库续批/前卫实验田）随评审门后续。另：`UI-RESIDUE-1` 批一已清账，下表行仅余批二范围；`WORK-STORE-MEASURE`、`HOST-AUTH-TRUTH`（被 `HOST-AUTH-LITE` 替代）见历史裁定。遗留便利项：voice 词表扩展扫描面（挂便利单）、真实 DeepSeek usage 捕获（见实测表）。

| 工单 | 最小范围 | 退出证据 |
|---|---|---|
| `AGENT-CLAIM-CORRECTION-1` | **已清账**（实现 `673b7b5`、验收 `f622f79`、no-ff 合入 `11ca7f7`；floor 观测 352，floor 文件升档随下一张 desktop 票顺带）。历史票面：**当前唯一可抢在 Pi headless 前执行的 App 正确性小票**：实现会话只改 `apps/desktop/src/App.tsx`、`apps/desktop/tests/e2e/rp2.spec.ts` 与 `apps/desktop/SPEC.md` 留痕，把 composer 现行 `Courtwork is an agent...` 改为「模型可能出错，请核对回复。提供反馈」，保留 mailto 行为；不改布局、样式、组件、功能、其他文案或发布面。先让旧 exact copy / `Courtwork is an agent` 零出现断言见红，再做最小替换；验收会话只能追加 `apps/desktop/ACCEPTANCE.md` | 定向 Vitest/Playwright 与全仓门绿；静态反例把现在时 agent 文案复活即红；桌面 1280/窄宽可见、链接焦点/读屏名不退；实现与验收不同会话/clean worktree。此票不赋予 agent 称谓，也不授权公开 build |
| `PM-SCHEMA-1` | 令 OOC score 与确定性计算同义，并版本化 payload/schema/migration；**顺带（2026-07-18 登记）**：凡例 OOC/Estimate 显式件（score=null 出格态/点值/区间三态）设计缺口随本单一并拍板 | OOC、drift、旧版本迁移与 catalog-only 边界触红；不夹带 PM scenario |
| `SITE-CRAFT-2` | Pages 视效升级（对标 trae.ai 级门面，避免被归入普通 repo）。架构定向：不拼通用工艺（渐变/3D 与克制纪律相悖且拼不过预算），高级感由**产品本体的 schema 可视化承担**——hero 升级为活的 schema 工作面微演示（锚点跳转/逐条确认/修订对照的录制回放或轻交互重建，feldar 台账的活化版）；新增动效逐个走 site-evidence-line 例外条款 + AST 锁扩展 + 逐帧采样。供料：Sol 视觉扫 trae.ai 一类站点（computer use）+ Codex image 穷举存货。**范围扩展（2026-07-17 拍板）**：site/ 为个人非商业 Pages，许可口径放宽——归档调研批次的参考技法、小巧思、素材包（vault 余量、emil、feldar、namethatui 等）与**中文陌生化字体**均可经本单升格使用——**字体策略修订（2026-07-18 夜；2026-07-19 二次修订·产品拍板）**：字体编排定位反转——**标题取通行宋体**（成熟、全字重衬线，首选思源宋体类 OFL 大字重轨；「标题用考究的通行衬线」路线，权威感由成熟字形承担；刻本类字形【齐伋体/汇文明朝体/京华老宋体】降为前卫实验田探索项，不入主轨）；**正文取仿宋陌生化轨**——首选方正聚珍新仿（商业字库：个人非商业授权与 web 嵌入授权**分别**核实留快照，任一未核清即以朱雀仿宋 SIL OFL 为落地值，不悬置不静默替换）；**显式拒苹方/系统黑体做正文**（昔日品味符号、今日 slop 分布中心——陌生化正文即 kill-slop 的字体面）；编排义务四条随裁定：仿宋正文字号/行高补偿（仿宋视觉偏小偏窄，AA 联测以实际度量为准）、标题至少双字重梯度、拉丁与数字配衬字显式指定（仿宋拉丁字形弱，不得裸回退）、中文 webfont 子集化+font-display 显式声明；每项字体/素材落 `site/craft-evidence/` 留许可来源快照。**冷色起疑对治五杠杆（2026-07-18 追加定向）**：①阶的作者性——色相收窄、藏青阶做深（暗部层次+纸感+Inset 材质响应），拒绝均匀平铺；②语义色稀缺性**宣告**——红/琥珀仅风险、绿仅落定，站面一行小注明示「色彩仅承载语义」（被宣告的克制才是作者性）；③文书文化抽象引用——卷宗编号体例/骑缝式分隔/印记式落定章；**左侧彩色竖条退役候选（2026-07-18 夜）**：通用色条换文书系记号——鱼尾（节标）、乌丝栏细界行（结构分隔，无彩）、侧点圈点（强调）、朱色专属裁决落定（朱批/朱印语义，彩色只在人做决定处出现），站面先行验证后经 R2 门评估回迁（**抽象引用，法槌天平类具象 kitsch 一律拒**）。**边框语汇裁定（2026-07-19）**：掐边花纹（回纹/云纹/缠枝类）拒——纯装饰且与数据区静止相冲；「边框感」一律走刻本框廓的结构性语汇：**文武线**（粗细双线）与四周双边，几何抽象零具象，站面前卫端先行、产品壳经克制审计再议。**线级语法（2026-07-19 扩展）**：全面替换「均一 1px 单线」的 AI 工具脸——线重即层级语义：主界=文武线（粗细双线错落），次界=乌丝细线，层级不同线重不同（与色阶「阶的作者性」同构，线的粗细携结构信息非装饰）；落 token 化（--rule-major/--rule-minor 类），皮层迁移的版式置换项之一。常见 AI 衬线同理由刻本/仿宋双轨替换（字体策略既有）。**冷暖调和裁定（2026-07-18 夜）**：陌生化统一溯源**版本目录之学**（市面罕见），冷色适配走**磁青纸宗**——写经传统的深靛蓝纸即冷色古典脉，藏青底天然承接；鱼尾/界行/圈点为墨系记号不择纸温；暖色纸感（米黄+衬线=slop 分布中心）明确拒绝；色彩语法四位：磁青为底、墨为记、朱仅裁决、泥金候选 hero 唯一强调（均核实色值入 token 流程）；④秩序件当主角（hero 微演示既有定向）；⑤克制的机器门叙事——「设计克制是 CI 强制的」一句话连 craft-evidence，把克制从美学主张升格为工程事实。**前卫实验田条款（2026-07-18 夜追加）**：site 定位为前端先锋技法实验田——比产品壳更前卫的版式/交互先上站验证，成熟后经 R2 门回迁（Design 四面已证「从现行语言自然生长+版式可穷举」，站面负责探边界）；SchemaParts 件库以**原生 SVG** 绘制（与 Design 稿约定一致），站/稿共用；调研站点全集（vault/emil/feldar/trae/namethatui/geist/oss-gui 等归档批次）全量供料按需取形。**品牌一致性挂账（2026-07-19，B1 分治裁定③）**：B1 已将壳侧权威源稿 `docs/design/icon-light/dark.svg` 随锚迁 217° 换值，`site/assets/icon.svg` 仍持迁移前旧板——品牌两侧暂不一致，随本单磁青宗批一并置换并做品牌一致性核；site 侧色板现由 `deslop-scan-lib.mjs` 的 `siteFrozenColors` 按值冻结（带到期指针，届时整体删除、回绑 token 名）。**硬边界：仅 site/，产品壳字体与素材不随动**（商用授权另案拍板），归档升格以本单票面为准、site 源码仍不得直接引用 archive/ 路径 | 微演示可视对照与逐帧证据；例外条款留痕；site:guard 全绿；数据区绝对静止不破；字体/素材许可快照齐备，产品壳零渗入（静态门可验） |
| `FILE-PREVIEW-1` | **实现已在 `main`，不得重复施工；范围验收已过，固定门仍驳回。** 顺带条款（2026-07-17 拍板）：执行 READER-ISOLATION-1 SPEC 提案区已批准的 rails-compact 四步退役（删 App 派生与 class → 删 CSS → `assert-layout-converge.mjs` 存在锁转「零出现」反向锁 → `data-compact` 消费点转 `right-narrow`）；主体范围如下。md 文档 preview 入口落 working folders：点击文件直接进入只读预览（frontier 同型交互），内容经 reading-view 派生（复用既有 convertToReadingView，原件只读不变）；先 md/txt，docx/文本层 PDF 视 reading-view 既有覆盖顺带 | 报告 `79ddd16`：功能/架构与 327/327 通过，但目标 `b0f667b` 的站点脚本 lint 红，故不清账。外部 lint 修复成为 `main` 祖先后，由新会话在 clean worktree 复跑全仓 lint、FILE 定向与必要回归并写放行报告 |
| `EXPLORE-RAIL-1` | 右栏新模块 Explore（与 Preview 并列，**不是浏览器**）：从既有 Turn journal 助手回复正文抽取显式 `http(s)` 链接（跳过代码块/provider 地址/用户粘贴内容），展示域名/原始 URL/出现 turn 时间，提供复制、回看该回复与**经受控宿主 openExternal 打开系统浏览器**（2026-07-17 产品定调修订：开链接是既定路线；应用内仍零 `<a>` 直渲、零 `window.open`、零网页加载/DOM/截图/摘要回流，「不是浏览器」边界不变）；零新 core/harness/provider/material 接口（纯 transcript 派生只读索引）。措辞纪律：「agent 提及的链接」，不得表述为已建立连接；不复用 Preview 的 artifact tab 语义；rail 顺序 Progress→Preview→Explore→…；UI 标签过 voice 词表（Explore 为工程名，产品文案中文定名随 voice 规范） | 抽取规则反例（代码块/provider 地址/粘贴内容不入索引）触红；零网络请求（静态门锁 fetch/window.open/href）；回看跳转正确；残留门约束适用 |
| `PREVIEW-TAB-1`（**已清账 2026-08-10**：实现 `85d2a07`——ADR-014 决定一/二落地（页签按 artifact 动态生成、多产物并列、格栈常驻只翻 hidden、单产物回退、混包命名空间隔离）＋D11 并存（`resetSessionForNewRun` 三处 `__new_run__`，durable 产物不随新场景清空；切案/demo flow 两处整本清空边界正当）；独立验收 PASS `a7facc5`（八变异复注＋零区分力探针、四轮 PW 如实登记取无负载轮 386/386、+16 逐文件归因）；no-ff 合入 `8100917`，floor 384→386。**观察在案**：对照面双侧同为产出页签时格栈渲两遍（testid 重名，用户可见行为正确，随下次触碰该面处置）；`recover` 臂零红证；格栈存活范围止于产出席位（切起草画布全卸载）；加载态多产物并列只由单测取证不宣称真跑。原 D11 转挂批注沿革：2026-08-07 转挂一笔：LEGAL-FIVE-FACES-1 D11——一 matter 内多场景产物并存属本票多 artifact 并列票面本体；当期「起新场景清空投影」为过渡态，durable 账本产物不随投影清空而丢已经验收实测） | ADR-014 决定一/二：tab 集合按会话 artifact 动态生成（tab=一张 schema 表）、多 artifact 并列、`containerPackBinding` 数组席位（恒 1）；与 Legal panel 迁移解耦，共存语义按 ADR-014 | 多 artifact 动态开 tab、切换不销毁状态（残留门约束）、单 artifact 回退、混包命名空间隔离反例触红 |
| `PANEL-BLUEPRINT-1` | ADR-012 迁移债：Legal 四个 route panel（timeline/graph/matrix/revision）逐个迁为版本化 component blueprint，保留历史 snapshot 回放与 compatibility alias；可分批 | 每迁一个：descriptor→projection 全链、drift/fail-closed 反例、视觉对照记录；App.tsx 对应硬编码分支删除 |
| `UI-RESIDUE-1` | 可逆交互零残留闭合门（架构裁定 2026-07-16：三分区状态矩阵并入本单，同证一个性质；允许单内分批交付，每批独立验收）。批一：`expectNoOverlayResidue()` helper（动画归零/无孤儿 portal/focus 归还/无残留 aria-hidden·inert）+ 全 app 疊层清单纠偏（消费 UI-SURFACE-1-FIX 修正后清单）+ 开合闭合（开→关后像素+DOM+焦点+滚动与基线等价）。批二：三分区状态代数（leftCollapsed/narrowRailRequired/rightCollapsed/focusMode/viewSegment/isWelcome/comparing/右栏双态的合法边与禁止边矩阵）+ 竞态（快速反向/Escape during enter/resize during close/切案切模式无旧区残留）+ 关键交互首帧·中间帧·终帧·反向帧采样。像素基线仅 Chromium 闭环，WKWebView 由 DOM 层兜底。目标措辞：**已枚举状态图内无已知残留/焦点丢失/状态串线/不可逆跳变**（非绝对零 bug 宣称） | 至少一个现存残留缺陷先红测坐实；门禁自身接受 mutation（故意不清 portal/不还 focus/不停动画必须红）；resize 自动收栏不污染用户手动态、focus mode 退出恢复三区、左右同折按原序恢复等矩阵边逐一有测 |
| `GENERIC-PACK-1`（本行为 2026-07 期票面；票名已由 2026-08-05 解耦相重定义为「通用底面收口」并于 2026-08-07 清账。本行通用场景包三场景未随之交付，重排产另立 `GENERIC-SCENARIOS-1`（2026-08-07 架构拍板确认），本行留作素材） | **parked，Pi 基础 GUI 与个人 debug 放行后的通用底座补齐线首单**（roadmap Stage 1 节 + archive/research-2026-07-15-round-3/generic-base-inventory.md）：通用场景包首批三场景——通用起草→docx（复用 output 流水线，中性 descriptor）/ md↔docx 可编辑往返（自研 OOXML 路径补齐，**pandoc GPL 已拒**）/ 多文件批处理（descriptor 层 fan-out，系统编排非模型自主）。定调：**通用底座即第一个包**——同一插槽/同一 admitPackages 准入/同一凡例表，零绕过 schema 契约的后门；验收律=「只装通用包时产品是合格 work agent」。零新 core 机制预期。**验收用例正式登记（2026-07-26 产品指定）**：Socmdia Slop kit（S0–S5 流水、`scripts/pipeline.py` 断点续行、inbox/outbox 门禁）为通用 work agent 验收用例；其甲路径（S0–S5 编为声明式场景）不受 ADR-017 修订影响可先行——受控脚本执行是补全不是前置 | 三场景过既有准入门与凡例表渲染；卸垂类包冒烟（仅通用包）e2e；批处理逐项报告与失败显式；xlsx/pptx/定时/通道均不夹带 |
| `PACK-INTERACT-1`（本行为 2026-07 期票面；现行票面与开工事实以 2026-08-05 解耦相行为准——`GENERIC-PACK-1` 已清账，前置解除、parked 失效。本行 Settings 包管理/建案选包/空态三件留作该票 UX 素材） | **parked，不早于 `PI-BASE-GUI-ACCEPT → PI-DEBUG-BUILD-1`；与 GENERIC-PACK-1 配对**（包装载真实交互一级，2026-07-18 拍板）：①Settings 包管理面——随发行版内置包的启用/停用（状态持久沿版本化单键先例）；②建案时选包——case 级垂类绑定从组合根写死改为建案交互供给（S3 绑定语义不变，绑定来源改用户选择）；③插槽显式空态——未启用垂类包时 Work 面诚实显示「未安装垂类包·通用能力可用」，零伪装零降级。**边界**：包仍随应用发行、构建期 admitPackages 准入不变——本单零动态装载；外部包文件导入（zip→运行时准入→签名/供应链）属二级，ADR-015「包的装载与生命周期」议题入池、需求到来才立 | 启用/停用→Work 面能力集与 tab 集随包切换 e2e；建案选包→绑定正确且跨包命名空间隔离；空态显式（voice 门）；停用不丢已有案件账本 |
| `TOOL-READ-1` | harness 真实化线（L1 受控只读工具，2026-07-17 已批方向、本轮激活；pi 对照调研借形）：Work 对话 turn 可请求**声明式白名单**内的只读工具（首批：读某材料正文/列卷宗清单——复用 resolveForProvider 与 MaterialStore 既有链）；工具白名单静态声明（比照 ScenarioRuntime.toolIds），仅 `pure_read`，零 effect；工具结果进 journal 的形状（toolResult 角色 vs 折叠文本）实现偵察后交拍板再动手；模型不可发现/调用白名单外任何工具；GUI 呼应——工具调用在 Work 画布 trace 区显式呈现（账本条目族） | 白名单外调用拒绝反例触红；pure_read 分级校验（AUDIT-SEAL-1 的全模式门为前置）；工具结果可溯源；stub 链不回退 |
| `ARCHIVE-MANAGE-1` | P1（真机 J 项，设计拍板见台账）：归档案不入侧栏默认视图；Settings「数据管理」面——案件归档区（查看/恢复/删除）+ 会话存档区（查看/删除）；删除留人确认、只删应用侧记录永不触原件、demo 案不可删；**不做旧 session 续行入口**（ADR-013 语义不变）；**召回入口八条采纳（2026-07-19，archive/research-2026-07-15-round-3/session-recall-survey.md）**：非常驻入口/卷宗分组/只读态标注/FTS 查询/原文恒可见/恢复路径唯一显式/删除三件套防呆（二次确认+回收站优先+禁删活跃）/零后台压缩 | 归档案侧栏缺席+Settings 可达；删除确认流 + 原件零触碰断言；demo 不可删反例；残留门适用 |
| `SCHEMA-EXEMPLAR-1` | 收尾拍板（2026-07-17）：schema 契约与 UI 凡例库——以 legal.S3/RiskList 全链为唯一凡例（五列语义/gate 分级/引语锚点回跳/修订映射/未落格确认知悉流），沉淀为新表衍生起点（契约凡例文档 + blueprint 凡例引用）；凡例本身入 polish R2 打磨；目标：新垂类表从凡例衍生 one-shot 过门。与 ADR-012 blueprint 门槛、ADR-014 tab 语义对齐，不新增第二套契约真源。**设计层 one-shot 自证：仓内无实物**（D-4 更正，`ARCH-SCOPE-2026-07-20` §1.2 A 组）——原记「2026-07-18 已过：Claude Design 以 `RiskReviewSurface`+domain 词表缝真渲 PM 事项表」，但该标识符在 `apps`/`packages`/`docs` 全仓 grep 命中 **0**，无对应 presentation config、fixture、golden 或 craft-evidence；`r2-tier-ledger.json` 内 `PrdReview` 命中亦为 0。该自证只存在于本图叙述，按成熟度不混写条**降级为未发生**，退出证据仍以下栏为准。如实缺口一条——OOC/Estimate（score=null 出格/点值/区间）为独立语义暂借「待核实」表达，专用件随 PM-SCHEMA-1 拍板补 | 凡例文档落 docs/（权威）；至少一张新表（PM 或阅卷类）从凡例衍生首次过门的实证；准入门/golden 适用 |
| `WORKBUDDY-INTERACTION-BENCH` | 只读研究台（不进权威链）：全量枚举 WorkBuddy 的 sidebar/task/composer/tabs/preview/settings/popover/modal/权限确认/失败恢复交互，按「触发前→动作→过渡可操作性→终态→反向→回基线」六段体例记录（DOM 增删/焦点/三区尺寸/滚动/overlay·aria/动画/Escape·外点·再点/快速反向·resize·切案·中断/reduced-motion 等价反馈）；不复制组件代码 | 行为矩阵 + 截图/逐帧证据入档；作为 UI-RESIDUE-1 枚举完整性输入与失败反例语料；WorkBuddy 非正确性真源的声明留痕 |

### HARNESS-CORE-1 派生工单（Stage B / Stage C，2026-07-20 逐项裁决入图）

裁决坐标写在每行首格：`A/R-n` 指 Stage A 架构裁决第 n 项，`C/R-n` 指 Stage C 第 n 项；两份材料随本批归档，按归档索引条目定位。

**排期模型（第二轮验收驳回后重制）**。初版把「依赖」与「`App.tsx` 互斥」压进一个「波次」列，结果是表**自己违反了自己声明的硬约束**——波三两行都标着触 `App.tsx`，波二另有两张未声明的触碰者。根因不是数错：**波次号是一个依赖未来改动面的结论，而改动面在开工前不可精确知**，把结论写死在纸上必然漂。故拆成两个各自可判定的量：

- **依赖层**：什么必须先落。这是稳定的、开工前即可知的。
- **`App.tsx` 互斥**：该票是否触碰全仓最大串行文件。逐票显式声明，**不留空**。

**派单规则**（取代波次号）：取任一「依赖层已满足」的票；**若该票 `App.tsx` 列为「是」，须确认当前无第二张 `App.tsx=是` 的票在途**。互斥是运行时的锁，不是纸上的分组。

**`App.tsx` 队列序（2026-07-28，产品重排）**：SAFETY（`e473fbb`）、OUTPUT
（`78655bd`）、TRACE（`3e0a0e5`）与 `DEBT-DOSSIER-1`（`51fe6ad`，no-ff）均已清账；
matrix 首枚已清账（`1b8c450`）。当前先施工**不触 App** 的 pi agent 底座；其 headless 总验
放行前除 `AGENT-CLAIM-CORRECTION-1` 这一枚现时错误声明修正外，没有新的 App 票在途；该小票
放行后继续空出 App 槽。headless 放行后首票为 `PI-LANE-UI-1`；`PI-BASE-GUI-ACCEPT` 独立放行前，
不并行启动 Dossier、context profile、垂类修订、plan/source 或 UI 巧思。基础 GUI 放行后才开
`PI-DEBUG-BUILD-1` 做维护者本人安装态复核；该票不占 App 实现槽，也不授权公开发行。
随后才开 `CONTEXT-PROFILE-1 → DOSSIER-FLOW-1`，并回到 `C3-1 → C3-2 → C3-3`
（PANEL 余下三枚按「过手即拆」随触碰分批，不再单独占位）。MODEL-1R 与 FILE 已由 current-main 治理清账，不再占 App 锁，也不授权
重复修改。Legal 单品真实性门三票（SAFETY/OUTPUT/TRACE）已全数闭合，但 `v0.2.0` 公开链
现行 parked，不得由此推导候选。
`PI-LANE-UI-1` 前不另排 wireframe/token 定稿票：ADR-022 六-D 与现行 design 真值提供护栏，
Opus 在同票以真实状态截图完成构图和浅色 craft；这是实现自由，不放宽 journal/授权/workspace
职权或独立验收。
恢复入口三态文案议题（TRACE 验收派单件裁定三）不立票，`DEBT-DOSSIER-1` 后按需重估。
其余 `App.tsx=是` 的票（`PERSIST-BACKEND-1`／`TOOL-READ-1`／`S6-EXEC-1`／
`C3-4`／`C3-5`／`UI-TOAST-1`／`WORK-PLAN-PANEL-1`／`CHAT-QUEUE-1`）依赖就绪后按此队列尾随入队。**「即刻并行派发」一类旧措辞已被
互斥模型取代**——「即派」指依赖就绪即可**入队**，不指同时**在途**。

`GOVERNANCE-CLEAR-1` 已执行完毕：target `94f83ab`，报告提交 `9df31d1`；共享门与逐票
mutation 见 desktop/core `ACCEPTANCE.md`，不再作为开放工单保留。

**由此得到的结构性事实（2026-07-27 `DEMO-ANCHOR-1` 入表后重算）**：下表
**16 行中 12 行触 `App.tsx`**
（逐行可数），仅 4 行不触。也就是说——**在 `App.tsx` 拆分（D1／
`PANEL-BLUEPRINT-1`）落地之前，Stage B/C 这条线实质上是串行的**，并行度上限约等于 1。
这不是排期技巧能绕开的，是 `App.tsx` 体量债的直接代价，`A/R-22` 已裁
「`App.tsx` 体量债走 D1 拆分线，不由换库解决」。**D1 裁定（2026-07-20）：不提前。**
大爆炸重构换并行度是坏交易——D1 自己就是最大的 `App.tsx` 票，提前它等于把串行变成停摆。
`D1`／`PANEL-BLUEPRINT-1` 维持分批交付；排位经 2026-07-26 裁定会笔一上提——首枚 `matrix`（78 行、prop 面最窄）插入 `DEBT-DOSSIER-1` 之后、`C3-1` 之前，其余三 panel 按「过手即拆」随后续触碰分批。代之以两件配套：

- **①「过手即拆」纪律**：凡触 `App.tsx` 的票，其所触**状态/JSX 面优先外提为独立模组**，票内 SPEC 留痕（外提了什么、去了哪个模组）。验收查此项。
- **② `App.tsx` 高水位门**（`lint:app-highwater`，已随本批立）：立门当日行数即上限，**只降不升**；票内净增须由等量外提抵消。外提生效后须同批**下调**上限——不收紧则腾出的空间会被下一张票悄悄吃掉，「只降不升」退化为一次性宽限，故门对**净减**同样触红。

于是串行是既成代价，但**随线衰减**：每张票过手，下一张的触碰面就小一分。门的边界如实登记——行数是**代理指标**不是目标，它拦得住「又长胖了」，拦不住「行数没变但耦合更深」；绿灯不等于解耦达标。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `CONTRACT-REVIEW-SAFETY-1` | ADR-010 决定五 2026-07-24 修订；Legal/Desktop 同名 SPEC | 已清账（实现 `b9dc1e9`、验收 `e473fbb`、合入 `05e0ade`；范围与证据见 desktop ACCEPTANCE 与当前基线） | 已清账 `WORK-BUDGET-1` | **是** | 已交付；四项指名 mutation 三红一锁，报告在案 |
| `CONTRACT-OUTPUT-TRUTH-1` | ADR-004；ADR-010 决定四/五 2026-07-24 修订；Legal/Desktop/Output 同名 SPEC | 已清账（实现 `3171c08`+`b2ba999`、验收一驳回一复验、合入 `78655bd`；范围与证据见 desktop/output ACCEPTANCE 与当前基线） | `CONTRACT-REVIEW-SAFETY-1` | **是** | 已交付；驳回轮两项契约级阻断（白名单缺录、旧产物名）经 R1 修复复验闭合 |
| `CONTRACT-TRACE-1` | ADR-010 决定五 2026-07-24 修订；desktop 同名 SPEC；吸收原 `MATERIAL-READER-MERGE-1` | 已清账（实现 `24cccb4`…`c92cdb0`、验收 `3e0a0e5`、清账 `c9e7b5e`；SPEC 留痕四项偏离与两处白名单外触碰经验收派单件六裁定一追认定谳；范围与证据见 desktop SPEC/ACCEPTANCE 与当前基线） | `FILE-PREVIEW-1` + `CONTRACT-REVIEW-SAFETY-1` + `CONTRACT-OUTPUT-TRUTH-1`（均已清账） | **是** | 已交付；五枚真实模块 mutation 红绿（首枚以等价最小扰动形态获准，裁定七），floor 343→347，报告在案 |
| `DEMO-ANCHOR-1` | TRACE 验收派单件裁定四（2026-07-27） | **已清账**（实现 `19435b4→fd93c2b→4db54a1`、聚焦复验 `b742f67`、no-ff 合入 `a141386`；一轮驳回＋一次首轮报告重放判无效力＋两轮返修；追认：statute 引语改锚合同文本、两枚展品恢复＝output-confirm 原锁定设计、desktop 侧四文件范围扩展）。历史票面：便利小票：`packages/demo-data` `risk-list.json` 锚点补真实 `textRange` 与 `textLayerVersion`（现恒 `{start:0,end:N}` 且无版本，样板案「回到原件」必落显式 `anchor_invalid`——该显式反馈是判定优先级的正确输出，不是缺陷）；只改 demo-data 及其 golden 重烤，不触 desktop 判定与 production 路径 | `CONTRACT-TRACE-1`（已清账） | 否 | 样板案回跳命中真实坐标高亮；demo golden 重烤留痕；`anchor_invalid` 反例 fixture 仍保留于测试，不因数据修复丢失判别力 |
| `DEBT-DOSSIER-1` | `A/R-26` 裁接判据 + 第六轮“卷宗 0 件”源码复核；desktop 同名 SPEC | 已清账（实现 `7f4699a`…`e5a3dfa`、验收＋fix-by-acceptance `56bb556`、no-ff 合入 `51fe6ad`；四则架构裁定——白名单外四件准予〔含 `fileCount` 退出 `CaseSummary` 的第二真源结构性消除〕、chip 未然态文案、「双 scope 同发」口径改写为单测穷举＋两次发送、跨重启计数单测替位——见 desktop ACCEPTANCE 与当前基线） | `CONTRACT-TRACE-1`（已清账） | **是** | 已交付；六类 mutation 独立复红，floor 347→351、高水位 2644→2551 |
| `PERSIST-BACKEND-1` | `A/R-17` 采 + ADR-019 决定一 | S1：五处逐字同构 `defaultBackend` 归并为一份工厂 + 4 处裸 `localStorage` 收编（裸调用**全在 `App.tsx`** 与 `chat/MessageActions.tsx`）；分区维随 ADR-019 决定一**就地补 container 维**。**归并止于 backend 工厂，不越 ADR-019 明确拒绝的通用 KV 线** | ADR-019 | **是** | 五处归并后行为逐字节等同（既有版本化单键 golden 为证）；裸 `localStorage` 零出现（静态门）；通用 KV 未被顺手造出 |
| `TOOL-READ-1` | `A/R-25` 方向裁定 + ADR-016 决定二、ADR-017 决定八 | L1 受控只读工具。**模型请求通道**：走「知交互」封闭动词集显式扩集——新增 `request_tool` 动词，`toolId` 以注入白名单 `z.literal` 闭集锁定，白名单外即普通不可信文本在校验层拒收；执行仍落 `deterministic_tool` 步，**步骤闭集不扩**。toolResult 采 `content`/`details` 二分。此扩集属跨层契约变更，以 **ADR-011 修订**形式落痕。**借形坐标（2026-07-26 pi 生态摸底）**：官方 `permission-gate`/`protected-paths`/`tool-override` 三例＋cc-safety-net 外置反例（fail-closed 语义分析范本）；**派单前置已完成（2026-07-27）**：opencode 三题有源码级答案（`archive/research-2026-07-27-parallel-survey/opencode-three-questions.md`，史料线索）——归一化借形（统一 Rule/Ruleset、last-match-wins 确定性判定）不借默认（其有效默认 `"*": allow`，本仓默认 deny 不变）；其运行时 approved 规则即 session 级 always，与「授权作用域＝单次提案」相悖，只借皮再证；「中断 tool_use 必补 tool_result」与「截断显式内联告知」两条可借 | ADR-011 修订须先落 | **是**（trace 区工具行现只有 demo 路径，生产路径须新开） | 白名单外调用在校验层拒收（反例触红）；`pure_read` 分级校验前置门已在；工具结果可溯源；stub 链不回退；四知文本 golden 同步 |
| `S6-EXEC-1` | ADR-017 决定四（effect 授权面）+ ADR-004 | D2：`FileOpsPlan` gate resolve 后的执行触发、授权持久与事务日志。现状是一条与 scenario 无关的 demo 直连管线（renderer `passive`、宿主内存 FS、plan 来自 demo 构造器；唯一入口是 `App.tsx` 的 `fileOpsMode` 本地 state） | ADR-017 + ADR-004 | **是** | 授权决定持久**先于** effect（事后弹窗不追认）；事务日志可回放；非 demo 案不再返回空态；销毁级动词零出现 |
| `GATE-INVENTORY-1` | `A/R-23` 准 | **已清账**（清点表 `docs/engineering/gate-inventory-1.md`，65 门/8557 行现读现跑；`8019` 订正为出处保留）。清点期只读的边界被遵守，动作按下两行另立票 | — | 否 | 已交付：逐门四态分类 + 依据；两项现行问题作副产品捕获并独立复核 |
| `GATE-P5-RESCOPE-1` | 本图 2026-07-25 架构裁定；`GATE-INVENTORY-1` §0 | 小票：`site/scripts/assert-p5-font-runtime.mjs` 现行判红（exit 1，八条数据位置断言全漂）。**根因是门的口径写错，不是设计违例**——它把一次性前后帧对照实现成「八个节点永远待在这些绝对视口坐标」的常驻断言，而冻结基线 `9a1281b` 之后 `site/` 已过 7 枚提交（含 `VERSIONAL-LANG-1/2/3`、`SKIN-R2 P3/P4/P5`、`72f5543` 换色板等**已签署已验收**批次）。故本票只做两件：①把断言从绝对坐标改为「字体轨前后态的 delta 不变」或重签基线（二选一，须留裁定痕）；②**接线**——一道不在任何门链上的门，它的红不构成信号，接线是本票的实质交付。字体断言与 OG 断言现为全绿，不得在重构中丢失 | 无 | 否 | 门接入某条自动化链后可被机器唤起；重构后对「插入无关段落」不再误红、对「字体轨真扰动数据渲染」仍必红（须有注入反例）；`capture-rp1-compact.mjs` 死支（`enter-compact-layout` testid 零命中，实跑 30s 超时崩溃）随本票一并处置或显式留痕 |
| `CI-TOPOLOGY-1` | 本图 2026-07-25 架构裁定（产品负责人裁「先记录不动」） | **只登记，本轮不开工。** 实测：`.github/workflows/` 全仓仅一枚 `pages.yml`，`on: push: branches:[main]` + `workflow_dispatch`，跑 `pnpm site:guard` + `site/scripts/build.mjs`；`grep -rn "test:e2e\|playwright" .github/` **零命中**。即 36 道 desktop 静态门与 333 条 Playwright **全靠本地手跑**，且无 `pull_request` 触发。这是 `assert-p5-font-runtime` 能静默烂四天、以及类型层抓不到的运行时缺陷能进 main 的**系统性原因**。开工前须先评估 runner 成本与抖动治理（`E2E-FLAKY-HOVER-1` 尚未清账），属跨层变更，**不得夹在任何产品票里顺手做** | `E2E-FLAKY-HOVER-1` 宜先清 | 否 | 立票时逐条给出：触发面（push/PR）、纳入门集、runner 时长实测、抖动用例处置方案 |
| `C3-1 · 生成控制与错误恢复` | `C/R-2`（不变量 4 违例）、`C/R-7`、`C/R-9`；ADR-007 2026-07-28 修订 | **现状收窄**：普通 Chat 已有 AbortSignal/Stop/末位失败 Retry；本票只给 Work free-chat 接同一 signal、`onStop`/`onRetry`，Retry 必须追加新 Turn、旧 journal 不删。`ProviderFailureKind` 全链扩 `billing`，DeepSeek 402=`billing + retryable:false`；全部 Chat/Work 失败按 kind 走单一 display-copy，raw message 不直出，timeout 去毫秒；`finishReason:'length'` 显式提示。Chat/Work 共用容量 5 的 versioned provider-evidence store，Settings→About Diagnostics 只导出既有白名单元数据（零正文/message/key/URL/body）。AI SDK/assistant-ui **只借行为，不加依赖** | ADR-007 修订已落；OSS-SUBTRACT 已裁 | **是** | Work Stop/Retry 真走同一 Turn 链；取消零残留、Retry 不涂改旧 Turn；401/402/429/timeout/length 逐类红绿，闭集消费者漏 `billing` 即红；两路径文案逐字同源；Diagnostics 持久/重启可导出且注入自由文本字段必拒；`lint:voice` 全绿 |
| `C3-2 · 会话可检索` | `C/R-1` 三件全、`C/R-14`ⓑ、`C/R-15`② | 接线现有 `searchTranscripts` 到 UI；会话自动标题（首条消息派生、**用户不可编辑**，守 ADR-013）；会话内查找。首版继续确定性、大小写不敏感 substring，**不引全文库、不建持久索引**；归档仍可搜、删除直接从 journal 派生结果消失。中文卷宗全文检索另待语料/召回需求实证 | OSS-SUBTRACT 已裁 | **是**（`sessionHistory` 状态与入口住 `App.tsx`） | 检索命中可回跳；中英文 substring 与标题派生确定性；删除后检索零命中（反例：删后仍搜得到即红）；零第二索引/embedding；ADR-013 语义不破 |
| `C3-3 · 输入面效率` | `C/R-3` 口径、§3.5 顺带裁 | textarea 自增高（补齐已有 max-height）；草稿跨视图/跨历史面板保持（**状态提升出 Composer** 即落 `App.tsx`）；↑ 键召回上一条；粘贴阈值校准——**去除「含换行即转块」判据**，字符阈值 500–1000 区间实测定，补 Shift+粘贴旁路。**不做任何斜杠触发**（见 roadmap「已裁不做」） | 无 | **是** | 草稿跨面保持有断言；阈值实测留证；Shift 旁路可验；零 `/command` 入口（静态门） |
| `C3-4 · 可观测性四件` | `C/R-8` 四件全；ADR-021 决定四（markdown 扩围**已移出**并入 `MD-CONVERGE-1+`；预算执法与 flash 价目**前移** `CORE/WORK-BUDGET-1`） | 会话累计用量与成本估算的用户可见出口只读消费既有 ledger/runtimeBudget，不另造账、不改变执法；memory 注入逐轮可见；上下文占用可见。`ModelContextProfile` 协议与具名 route 解析已拆给不触 App 的 `CONTEXT-PROFILE-1`；本票只消费其投影，缺 profile 明示未知。上下文占用以**我方自身判断**立论，不以行业基线立论 | 已清账 `WORK-BUDGET-1` + `CONTEXT-PROFILE-1` | **是** | usage/cost 与既有 ledger/runtimeBudget 同源不另立；context profile 缺省时既有 Chat/Work 逐字节等同且 UI 明示未知；memory 可见面不泄案件内容跨案 |
| `C3-5 · 无障碍与未开通态归一` | `C/R-11`、`C/R-12`ⓑ、`C/R-13`；OSS-SUBTRACT 2026-07-28 | 直接依赖 Apache-2.0 `@react-aria/focus` 的公开 `FocusScope`，逐个现有 modal 补焦点陷阱与归还；不接上游自述 internal 的 Radix focus-scope。另含 `aria-live` 流式播报、`.palette-input` focus 反馈、未开通态措辞与机制归一（英文 chrome 统一 Coming soon 族）+ 门扩围至 Settings 域与 CaseRail；**响应 OS 级无障碍字号**（rem/em 基线化）——产品内不提供调节 ≠ 拒绝响应 OS 设置 | 宜紧随票丙（标题轨整备） | **是** | FocusScope 在真实 Tauri WKWebView 的 Tab/Shift+Tab、嵌套 modal、Esc/显式关闭与 trigger restore 反例（逃逸/落 body 即红）；未开通态门扩围后 Settings/CaseRail 纳入；**rem/em 等比换算须零视觉 diff**（既有皮层门作证，帧证留档） |
| `ANCHOR-SWEEP-1` | 第二次复验顺带发现 + 判例「文档引码用符号锚不用行号」 | 小票，两条：①**六处漂移行号改符号锚**——`packages/core/SPEC.md`（`executor.ts:49/261` 实为 50/280；`events/types.ts:116` 指涉已删；`:192` 的 `sumUsage` 实为 208）、`packages/output/SPEC.md:50`（`App.tsx:920` 不可定位）、`apps/desktop/SPEC.md:914`（`App.tsx:1771` 实为 2233；`:359-361` 实为 404-406）。②`workflow.md` 验收固定项已增「自述与实现逐条对照」（本票只需核其被执行，不重复立条）。③**顺带（验收 J 项）**：`assert-layout-converge` 的退役名反向锁已由 2 文件加宽至整个生产源码集，SPEC 与本图中「零出现反向锁」的表述随之收紧为实际覆盖面，不留「读起来像全仓级」的模糊。**判例维持劝告级、不立门**——「现行语境 vs 历史语境」机器不可判（验收报告、craft-evidence 里的行号是当时树的证据，正当且不该被扫红），按判例「判据不可判定不造启发式」，宁可靠人核 | 无 | 否 | 六处逐一改为符号锚且符号在源码内真实存在；改后全仓现行规范文档零硬编码源码行号（一次性核，不留门）；`workflow.md` 固定项在本票验收中被实际执行一次 |
| `E2E-FLAKY-HOVER-1` | FILE-PREVIEW-1 验收 K 项，架构准 | 小票：`global-verbs.spec.ts` 悬停显现例（`toHaveCSS('opacity','1')` 收到 `0`）负载相关抖动。**定性已由验收对照实验坐实**：单文件隔离跑 21/21 绿、全量跑红、父提交同跑失败更多（321/323，另含 `:28`）——既有缺陷非任一新单引入，末次改动 `2c5470d`。本票只处置该例的稳定性，不改其断言意图。根因已由 OUTPUT 轮实证：断言 `opacity:1` 紧跟 `hover()` 零等待、撞 CSS transition（`--motion-hover`），`retries:0` 下并行负载即硬红；单跑 3/3 绿、全量偶发。修法方向=等待过渡落定或 poll 断言，不得放宽断言或加 retry | 无 | 否 | 连续三轮全量跑该例零失败；修法不得以放宽断言或加 `retry` 掩盖（须指认抖动根因：悬停时序/动画未落定/并行负载下的渲染延迟） |

**`TOOL-READ-1` 清账登记（2026-08-13；提交归因同日订正）**：源码实现链 `f1fa33e→7df426f→247d8a4→e644afd→05ad0f8`；R2 `37a34ce` 只修 demo dependency/test 边界，`b5a8302` 是最终 SPEC 回执，不是 production consumer 证据。首轮 REJECT `c04be88`、R1 REJECT `ac20b209` 与 R2 独立 clean-clone PASS `332e0f5` 依次保全，no-ff 合入 `8d6f3b9`。交付范围为通用 L1 只读请求内核、两枚领域无关工具、demo/acceptance 装配与 trace；表中「生产路径须新开」仍是边界而非未完成实现——production generic/legal 声明与 desktop MaterialStore adapter 须由后续各自票面接线。`App.tsx` 槽随清账释放；验收唯一红为在册 `E2E-FLAKY-HOVER-1` 同形观察，不归责本票且不据此销号该抖动票。

**不进 Stage B**（`A/R-7` 决定零、ADR-018 不排期）：沙箱实现；bash 实现；`ADR-016` 的 UI 触发入口（归 UI 单，须 ADR 先拍板）。

**`R-4`ⓑ 通则（`C/R-4`，跨票适用）**：用户会主动寻找的「刻意不做」功能，须有**用户可见的一句说明**；纯工程内部项文档留痕即可。措辞必须与「即将开通」可区分——**「设计上不做」是承诺，不是欠账**。本轮升级两项（会话导出、memory 编辑/单条删除），落点 Settings 既有 Data & privacy / Data promise 席位，与 `C3-5` 的措辞归一联动。

### 2026-07-26 裁决批新增票（裁定会·GUI 八项·标杆实测·ADR-017 修订；2026-07-27 落痕）

原件三份按归档索引定位（`arch-rulings-2026-07-26.md`／`benchmark-openwork-2026-07-26.md`／`pi-ecosystem-2026-07-26.md`）。当期不立票留痕两项：卷宗全文检索转入 `OSS-SUBTRACT-1` 评估面（见忧二）；材料目录树待 `DEBT-DOSSIER-1` 与 ADR-019 容器实施后有真源可渲染，届时先裁两级折叠 vs 深树、再定是否引 react-arborist。工作稿版本 diff 并入 R-16 验收条款票（ADR-019 决定三实施票）不另立，npm `diff`（上游项目 jsdiff）经 BSD-3 白名单扩条可用（工程纪律见 workflow）。pi 生态摸底另记：深读新增三仓（cc-safety-net／gondolin／pi-review）各票开工前本地 clone 取用。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `UI-TOAST-1` | GUI 八项裁决①（2026-07-26）+ OSS-SUBTRACT 2026-07-28 | 全局 toast 层：**直接依赖** Sonner（MIT）的 `unstyled` 模式，消费其 Toaster DOM、堆叠、update/dismiss、计时与时序状态机，重皮为三层表面 token；不复制其内部状态机。**红线随票冻结：toast 只承载非阻塞回执与失败提示——确认、授权、不可逆动作与任何须留账本的决定一律不得走 toast**（不变量 3 的 UI 面投影）。`C3-1` 失败文案接线可消费之；通知中心（OpenWork 实测参照）作二期候选不入当期票面 | 无 | **是** | 红线静态门（确认/授权路径零 toast 调用，mutation 必红）；单一 Toaster、堆叠/update/dismiss/焦点归还过残留门；`aria-live` 在真实 WebKit 有测 |
| `WORK-PLAN-PANEL-1` | GUI 八项裁决③（2026-07-26） | plan/任务清单生产 UI：`deriveTodoSnapshot`/`todo_snapshot` 事件已是 core 真源，缺的只是生产消费面；自研平铺渲染，零新持久、零新依赖；系统派生只读，无用户编辑面。OpenWork `TodoPanel`（composer 上方折叠计数/展开逐条）作落位形态参照 | 无 | **是** | 渲染与 `todo_snapshot` 同源（改快照渲染必变的 mutation）；零编辑通道（静态门）；空态显式 |
| `SANDBOX-PROBE-1` | ADR-017 修订三／ADR-018 未决 1（2026-07-26） | 强制前置探测票：macOS Seatbelt（`sandbox-exec` 或替代原语）在当前 macOS + Tauri v2 打包形态的可行性实测，含越界反例证伪（读策略外路径、连策略外地址未拒即不成立）；选型对比按 ADR-018 决定二——候选对＝`@anthropic-ai/sandbox-runtime`（进程级）vs gondolin（microvm，预期作对照组），许可/维护/体积/逃逸面逐项；**已清账（部分成立）**：实现 `bdd539a`+`86baa28`，架构复核合入（快进）＋合入后独立抽检门 12/12＋CLI 绿；Seatbelt 于 ad-hoc＋hardened runtime `.app` 内可行，三类越界双向反例、约束随 fork/exec 继承、TCC 与 Seatbelt 拒绝同形（errno 不可归因）等实测见报告。2026-07-27 曾预定“Rust 自研窄 profile”，但它与 ADR-018“沙箱外采、不自研”正文冲突，已于 2026-07-28 撤销；探测只证明原语可行，不构成实现选型。`EXEC-SCRIPT-1` 继续不排产；未测边界分别挂 Developer ID、真机回归与未来选型实测。报告 `docs/engineering/sandbox-probe-1.md`；当期等级 `none` 不变 | ADR-017 修订已落 | 否 | 越界反例双向（拒得住＋测得出）；未来方案须重新做成熟 OSS/维护/许可/Tauri 对照，不能把探测脚本直接升产品沙箱 |
| `EXEC-SCRIPT-1` | ADR-017 修订三（2026-07-26；2026-07-28 路线撤回） | 受控脚本执行实施票（argv 三段式、三态闭集默认 deny、白名单即能力声明、授权持久先于执行、决定七禁项全部保持）。**只登记不排产**：除真实 kit 脚本需求实证外，还须按 ADR-018 重新选成熟外采隔离方案；`@anthropic-ai/sandbox-runtime` 当前 beta 且内部 shell `-c`、Gondolin experimental/heavy，均无放行证据。不得自研窄 profile，也不得把 `cap-std` 路径能力冒充执行沙箱 | `SANDBOX-PROBE-1` 证据 + kit 需求实证 + 新 OSS 选型裁定 | 派单时定 | 立票时逐决定给退出证据；无成熟方案则继续 parked，不以基础 agent write 拉动 bash |
| `CONTEXT-PROFILE-1` | ADR-021 决定四；provider/core 同名 SPEC 待派单前冻结 | 基础 GUI 放行后的 Dossier 前置小票：把 `ModelContextProfile` 作为具名 provider/model route 的版本化机器数据，字段固定 `providerId/modelId/version/effectiveAt/contextWindowTokens/reservedOutputTokens`；只改 `packages/provider/catalog/deepseek.json`、生成器/生成物/registry 与定向测试，以及 core 的只读解析/保守估计器契约，不触 App。真实数值必须回 DeepSeek 一手资料并带生效版本；无可信数值则保持 absent，不猜。不得让既有 Chat/Work 因 profile 缺失改变请求字节或失败；只有 Dossier compiler 缺 profile 才 fail-closed | `PI-BASE-GUI-ACCEPT`（**产品排程门，非 profile 技术依赖**） | 否 | catalog 仍为 TS/Rust 单一机器源、手写第二表触红；route/profile 错配、未知版本、`reserved>=window`、非正整数全拒；同输入估计 byte-identical 且实测 tokenizer corpus 不低估；缺 profile 时 Dossier 调 provider=0，既有 Chat/Work golden 不变 |
| `DOSSIER-FLOW-1` | ADR-009 Dossier 补充 + ADR-021（Accepted，2026-07-28） | 卷宗工作语义层首票：`app_data/dossier-semantics/<container>.json` 的 container-scoped `DossierStatePort`（逻辑 notebook、attempts、只含 terminal 的 `PersistedTurn[]`、events 同一信封）+ 唯一 compiler；ScenarioExecutorDeps 每 provider 请求 async resolve 后进六段第五段，普通 generic Chat 排除；pi adapter 同票显式迁 transient wire v1→v2，以 typed `dossierContext` 进入单 system prompt，禁止偷塞 user text。蒸馏只经既有 TurnRunnerPort，terminal CAS 先于 schema/语义 CAS。触发只含 descriptor 首读、容量水位 ask-user、用户显式；`pi-observational-memory` 只借 ledger/cut/fold，不直接依赖；loopx 素材（工作语义核四字段/编译预算回执/回执准入形态）按归档索引 `research-loopx-matter-memory-2026-08-03.md` 条目召回，只作 SPEC 冻结参照。首票不解锁后台/每 N turn、自动 rebase、跨容器 recall、全局 memory 或物理工作稿晋升 | `PI-BASE-GUI-ACCEPT` + `CONTEXT-PROFILE-1`（A4 产品排程门） | **否** | 四类 crash 点逐一红绿；terminal 已耐久可续 commit、attempt 无 terminal 才新身份；同 operationId 至多一笔 committed、用户编辑不被旧模型覆盖；Scenario 无 resolver 与普通 Chat golden byte-identical；Scenario/pi 两 adapter 消费同 envelope digest；v2 混跑、context hash/container 错配、text+context raw>131072/packet>1MiB、缺 profile/required source 超限/估计未知均 provider=0；跨 container/global-memory/secret 输入全红 |
| `CHAT-QUEUE-1` | 标杆实测裁决①（2026-07-26；2026-07-28 时效订正） | 票池（不入当期队列）：Courtwork 若做 busy 输入，仍选择“排队、不 steer”，但这是本仓产品语义，不再借上游事实背书。当前 OpenCode 已是“先持久 user message、复用 running loop、下一轮重读”的 immediate steer；OpenWork 同时有 immediate steer 与 Zustand 内存队列，Stop 会先清队列，队列不 durable。旧“server busy reject、无 steer”结论已失效 | `C3-1` 清账后按互斥模型排队 | **是** | 排队消息跨重启不丢不重；Stop/失败后的队列去向显式；S3 禁 steer 回归不破；不得复制上游非耐久队列 |
| `REVIEW-PRIMITIVE-1` | 2026-07-27 产品问答定调 | 通用修订评审面原语：中性 edits 提案 schema（ADR-017 决定八形状）＋ npm `diff`（上游项目 jsdiff）重皮 diff 渲染 ＋ 逐块 accept 喂既有确认账本；artifact 类型开在预览 tab。垂类加载后的转变＝结构化注解／gate 挂载／编译目标替换／词表换装，骨架不变；md 只作存储不作交互面。`PANEL-BLUEPRINT-1` 迁移时 Legal 修订面改为消费此原语 | `PREVIEW-TAB-1` + edits effect 票 | 派单时定 | 立票时 exact pin npm `diff`；通用面零垂类词汇（voice 门） |
| `BRAND-2` | 散条登记（2026-07-26） | 品牌谱系扩面：app icon 为 master 的谱系延展（含 thinking 动画）；范围与素材清单随票冻结，产品壳字体/素材边界沿 `SITE-CRAFT-2` 既有硬边界 | 无 | 否 | 立票时冻结 |

### 2026-07-27 pi lane 立线（ADR-022，产品定调＋架构裁）

通用 agent loop 线引入 `pi-agent-core`（内嵌库、Node sidecar 承载），读面先行。2026-07-28
产品再裁：pi 覆盖式 `write` 以 Rust host-mediated app-data workspace 进入，不把写权授给 Node；
`bash` 仍锁隔离与真实需求。ADR-011 修订三随批落痕。叙事口径反转与 `OSS-SUBTRACT-1`
重定向见 ADR-022「两处反转」节。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `PI-LANE-1` | ADR-022 决定一/二/三（2026-07-27） | 已清账（实现 `51c27b6`、验收 `26d4b2b`、no-ff 合入 `6d7a8eb`；七件全交——sidecar 锚定 `@earendil-works/pi-agent-core@0.82.1`、`ExecutionEnv` 层只读容器〔写/exec 根本不实现〕、三锁禁用面、`packages/pi-lane/dev` sidecar 自服务 dev 入口〔落点已裁〕、DeepSeek 原生 provider、未决四题答卷已回 ADR-022 补记、R3 扩描双向锁真树注入复证；范围与证据见 `packages/pi-lane` SPEC/ACCEPTANCE。真 key 复核未执行，按其 SPEC 第七节由持 key 者另行登记） | ADR-022（已落） | 否 | 已交付；74 例单测、变异对照两例、R3 真树注入红绿、合入 tip Playwright 351/351 |
| `PI-WRITE-PROOF-1` | ADR-004/017/018 窄修订 + ADR-022 决定六 | **已清账**（实现 `c0b7989`、回执 `3d45775`、验收修复 `4fee6d2`、放行 `9caa8ae`、no-ff 合入 `7216b2f`）。直接实例化上游 `createWriteTool()`；极薄 binder 保留 metadata/schema 引用，以 raw toolCallId 查取预种 public tc、创建 invocation-scoped env，直到 `writeFile` 真发 port 才分配 op 后 delegate。注入 port 证明 nested `.md` create、existing overwrite 与精确回读；产品 workspace write 最终 basename 只收扩展名前至少一个字符、ASCII 大小写不敏感的 `.md`（恰为 `.md` 必拒）。未改 product tool table/session/policy、wire、Rust/Tauri、package/lock 或 GUI | `PI-LANE-1`（已清账） | 否 | characterization 锁上游 open schema/coercion、exact raw gate、调用序列与单次 port、Unicode `4 code units ≠ 10 UTF-8 bytes`、pre/post-write abort、同 env queue vs per-call env 无共享；缺 tc mapping、非 `.md`、全部路径/容量反例均 port 零调用且零 op；binder/Agent sequential 双锁；两真实 port 调用 operation 不串；生产源码零 Node fs 写；独立验收 99 例与有效 production mutation 复证通过；明确只到 package/headless proof |
| `PI-CODE-STDIO-1` | ADR-022 六-B.1/B.2 | 实现 `79a13d2`、回执 `223185e`，独立验收曾作最小修复 `0ffae46`，但 6 枚新反例坐实 3 blockers + 2 majors，报告 `cfb4715` 明确 **REJECT**；不得合入或作为 Host 前置完成态。原范围与 OSS“保留窄自研、零依赖”结论不变，返修只由下一行承担 | `PI-LANE-1`（已清账） | 否 | 已有 strict codec/framing/seq 等证据仍可复用，但 build/lint/test 全绿不抵消 message 泄漏、pending effect 丢失、同步重入复活、value correlation 缺失与 retryability 漏门 |
| `PI-CODE-STDIO-1R` | ADR-022 六-B.1/B.2 与 2026-07-28 安全闭口修订 | 实现 `9f9255b`、回执 `7c8c9c3` 保住固定安全文案、pending latch、五 callback guard、reserve/send 单一 op/hash、逐值关联与 retryability 闭集；但独立验收 `4df2e84` 在原 227 绿测外注入 9 枚 production 反例全部见红，明确 **REJECT**。不得合入或作为 Host 前置完成态；USD 一律传染、预登记 tc、callback 不回滚和两段式接缝不回退 | `PI-CODE-STDIO-1` 拒绝证据 `cfb4715` | 否 | build/lint/test 162 files / 1550 tests 与 R3 全绿仍不抵消 read→write 越权、settled effect 被 finish/新 pending 抹掉、tc 改名/倒退/跨 prompt 复用、unknown event 逃逸及 pre-operation 伪成功；返修只由下一行承担 |
| `PI-CODE-STDIO-1R2` | ADR-022 六-B.1 2026-07-28 tc 状态表闭口 | **已清账**（实现 `7686dfd`、回执 `710faaa`、验收修复 `43b3796`、放行 `cc5faf5`、no-ff 合入 `db4f360`）。实现 request-scoped `{requestId,toolName,phase}` 单向 tc registry、每 prompt 至多一枚 active tc、`write↔workspace_write` / `read|glob|grep↔workspace_read`、write 单 sent-op、pending/settled 结构互斥、premature finish 自闭合、send-time tc 有效性复核及 unknown runtime event 闭集；未改 workspace-write-env、导出/装配/依赖/Rust/GUI | `PI-CODE-STDIO-1R` 拒绝证据 `4df2e84`（历史输入）；1R 的六项修复均保留 | 否 | 九枚验收反例与 late-send 反例先红后绿；双向 capability 错配在 ordinal 前拒；tc 改名/finished 倒退/stale prompt 全拒；pre-op succeeded 改投 failed+upstream terminal；pending 提前 finished/finish 只闩锁等 result；settled 后普通 finish/新 tool/request 先按保存 status 发恰一 finished 再 terminal；unknown event 不抛 TypeError；17 枚实现 mutation（15 红、2 结构性等价）及独立验收 mutation 通过；只到 package/headless protocol 前置 |
| `PI-SIDECAR-DIST-1` | ADR-022 决定六-E | 实现 `70e6482`、回执 `01ff5e7`/订正 `3207b27`；独立报告 `9b8142f` 因 probe 假绿、缺产物可跳过及 Node archive 未过 SHA 门明确 **REJECT**。不得消费其 SEA-default 建议或据此裁路线；返修只由下一行承担 | `PI-LANE-1`（已清账） | 否 | bundle/licence/ESM 红控等静态证据可复用；八候选功能、冷启、签名与双架构结论均须在 hard verdict 和可信 Node 来源下重跑 |
| `PI-SIDECAR-DIST-1R` | ADR-022 六-E 2026-07-28 返修门 | 实现 `ba71df8`、回执 `61c2b09` 保住来源门、共享 verdict、stdio/abort/crash 语义、冷启/可复现性与签名矩阵；但独立验收 `f261347` 以实际磁盘多制品、首坏后正 identity drift、`[null,null]` SHA 三枚 production 反例判定 **REJECT**，并确认 crash 无界等待与 SEA 重签失败不决定 build status。不得消费报告或裁路线；返修只由下一行承担 | `PI-SIDECAR-DIST-1` 拒绝证据 `9b8142f` | 否 | 102 verdict tests、31 枚自报 counterexample 与全仓 1397 绿测不抵消三项假绿；R1 报告删除旧 SEA-default 建议这一点保留，但其余路线推论不进入架构输入 |
| `PI-SIDECAR-DIST-1R2` | ADR-022 六-E 2026-07-28 物理证据闭口 | 实现 `42858b2`、回执 `33100d8` 保住 assembly 实物闭集、逐样本 identity/EOF、有效 SHA、bounded crash 与 SEA 原子发布；独立验收先以 `850fa11` 修 success `publishedPath` exact-cell 假绿，随后 `9ebb92a` 在其 seatbelt execution domain 观察到官方 Node XML extraction 为 exit 0 / stdout 0 / invalid blob、两枚签名格 blocked，明确 **REJECT**。架构成对复核后已定位为受限域 preflight，而非 Node blob 损坏；但 R2 没记录/判定该前提，故仍不得消费其报告或裁路线。exact-cell 修复和前三轮已成立门不得回退 | `PI-SIDECAR-DIST-1R` 拒绝证据 `f261347` | 否 | 正常 measure、物理多件、crash.ignored、SEA 四阶段与 reproducibility 已由验收实跑；sign matrix 在未登记的受限域无法完成，build/lint/test 绿不抵消。返修只由下一行承担 |
| `PI-SIDECAR-DIST-1R3` | ADR-022 六-E 2026-07-29 entitlements 四层证据契约 | 实现 `7b4184b`、回执 `47fd7e5` 建立了 canonical 上游输入、双 execution domain、签后回读、绝对 Apple 工具、deadline 与不可覆盖 manifest；独立验收 `eb71d6f` 仍以六枚 production 反例判定 **REJECT**：完整 host/runtime identity 未进 hard verdict、DER human 未从 raw stdout 严格重解析、blocked-first 掩盖 control 启动/协议失败。不得消费报告或裁路线；返修只由下一行承担 | `PI-SIDECAR-DIST-1R2` 拒绝 `9ebb92a`；保留 `850fa11` 与 R2/R3 全部既有门 | 否 | build/lint/test 绿、built seatbelt control 准确 blocked 与 632-byte 上游来源复核都不抵消 false-green；R3 的四层证据和零路线建议不回退 |
| `PI-SIDECAR-DIST-1R4` | ADR-022 六-E 2026-07-29 R3 hard-verdict 闭口 | 实现 `891c23d`、回执 `07d2dbc` 已闭合 R3 的完整 receipt、DER raw parser 与 preflight 分类三项假绿；独立验收仍坐实三项 P1，明确 **REJECT**：跨架构 code-cache ready 后无界等 exit 且 verdict 不核最终退出；command time 只作副本 identity，整列缺失或同一常量可绿；preflight/full 仍能由 producer summary 洗绿 raw command、run、actual-entitlements 与 nested `.app` 失败。验收树约 1800 行未提交返修只作诊断输入，不得接管或代提交；不得消费报告或裁路线 | `PI-SIDECAR-DIST-1R3` 拒绝 `eb71d6f`；R2–R4 既有门保留 | 否 | 356 verdict、76 counterexamples、600 cold-start、双 cycle、十件/source、seatbelt/批准域物理矩阵与仓库门虽绿，不抵消三项 production false-green；返修只由下一行承担 |
| `PI-SIDECAR-DIST-1R5` | ADR-022 六-E 2026-07-30 R4 evidence-truth 闭口 | **已清账**：exact target `6cdb9ba`、独立验收 `0b0d985`、no-ff 合入 `5aef222`。验收从空 assembly 独立取得 384/384 verdict、600 cold samples、历史 76 项（68 negative + 8 controls）、strengthened 8/8、R5 五枚有效反例 + 验收自造 SIGTERM 反例、四枚 production mutation 与 seatbelt blocked／缺 build `probe_failed`／批准非受限域 full 三格；二次只读审计无 PASS blocker。scratchpad 未入 Git 与 `crash.ignored` JSON 写入时序如实保留为 packaging 缺口 | `PI-SIDECAR-DIST-1R4` 拒绝 `07d2dbc`；R2–R4 全部门保留 | 否 | 架构已消费报告并裁 Route A：`node22-runtime-sealed-cjs-v1`（官方 Node v22.23.1 externalBin + sealed CJS resource，code-cache off）为现行 default；SEA 留作已验证备选。只解锁 Host，不升级 `current.md`、GUI、DMG 或发行事实 |
| `PI-HOST-LOOP-1` | ADR-022 决定六-A/B/六-E；Route A `node22-runtime-sealed-cjs-v1` | **待 Fable 实现，依赖已满足**。Rust 把官方 Node v22.23.1 externalBin + sealed `sidecar.cjs` resource 当同版 manifest pair，spawn 前核 target/regular/non-symlink/正字节/exact SHA；Rust-only 解析资源路径并以 argv 启动，零 route switch/fallback。随后管理用户显式保存的 credential bootstrap/cancel/crash，不做固定 env fallback；Node product `/case` 虚拟 env 隐去 cwd/FileInfo/error 物理路径，Agent 从首次产品化起固定 sequential；单写 `app_data/pi-loop/<container>/<session>.jsonl`，append+sync_all 后才发布；session 累计预算、headless read/glob/grep/replay。interrupted 后可显式起同 session 新 leg，但 pi message context 从空开始并显示断点；任何 runtime callback 逃逸的 `ProductSidecarError` 都须终止 sidecar 并按 journal 恢复，driver 不得吞错续用；不得接 GUI 或文件 effect | `PI-CODE-STDIO-1R2` 已清账 + `PI-SIDECAR-DIST-1R5` 已清账 + ADR-022 Route A 已裁 | 否 | 双件缺/多/错版/错架构/hash 漂移须 effect 前失败且物理路径零泄漏；官方 Node22 的 production ready/shutdown 与 scripted read hard gate 分离，shared Rust↔TS golden 锁 wire/固定终态文案；逐 crash 窗实证：未 LF tail 只截 partial；尾端 durable `turn_finished` 缺 usage 才逐值补写，其余 LF 坏记录/seq drift/半对 quarantine；半闭合 prompt补对应 session 终态；dangling effect→uncertain/failed，active paid prompt+usd limit→budget_unknown/failed，durable limit reached→budget_stopped，只有预算/effect 安全的 open leg 才 interrupted。Rust 以 journal 独占校验 resume：先落 session_resumed，leg=previous+1，priorObservedTurns/计数/费用精确 fold 且不重置，跨 leg requestId 重用、model/limits/grant/container/capability 漂移必拒；tc 在 start 分配、raw gate block 零 op；两 container 隔离/active 拒删/inactive 整删与 key/path 零泄漏 |
| `PI-HOST-LOOP-1R` | 原票合同＋`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R.md`（**史料线索**）（2026-08-01 冻结） | 上行 target `0d4799c` 经独立验收 `314117d` **REJECT**：Node 三枚（物理根经 FileError 回显、provider error 伪 `completed`、政策拒绝伪 `succeeded`）与 Rust 八枚（凭证读取先于 route 身份门、config/prompt 门后置于 journal/spawn、终态预算采信 sidecar 自报、wire fault 裸 `?` 逸出不 fold、shutdown 后 exit 7 伪 `completed`、resume 只核 `previousLeg`、同一 live session 双 Host 可并写）全部命中 production 方法；正向 Route A controls 不抵消。1R 只闭合十一项、不回退既有门；基线从 main tip 顺取 `4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d` 六枚 patch-id 等同（拒绝报告随链入树） | `PI-HOST-LOOP-1` 拒绝证据 `314117d` | 否 | 十一枚验收反例原形转 permanent 首红（untouched 链尖先红）；≥6 枚 production mutation（撤序/撤前置/撤 fold 真值/撤 fold-before-throw/撤逐值/撤锁）逐枚命中红恢复；九门全量非受限域取数；停在待独立验收，PASS 后才开 `PI-WRITE-HOST-1` |
| `PI-HOST-LOOP-1R2` | 原票＋1R 合同＋`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R2.md`（**史料线索**）（2026-08-02 冻结） | 上行 target `fa9e2f8` 经独立复验 `427f4fa` **REJECT**：N2 的 `aborted` 实落 `failed/unknown` 非 canceled（`completionFor` 只特判 error）；R2 上界（`maxTurns<=12`/`maxUsd<=100000`/`modelId<=256B`）漏检且 `maxTurns=13` 已实际 spawn（错误拖到后置 encoder）；journal 载入接受孤儿 usage 与倒序 observed turn（`2→1`）为 `LoadedJournal`；verified-node gate 对同尺寸 runtime 篡改（尾字节 XOR）、runtime symlink 与 manifest 字段漂移三类假绿，另录 builder 回执 resource 前缀同源漂移。1R 十一项常驻与正向 controls 全绿不抵消。1R2 只闭四项、不回退既有门；基线从 main tip 顺取 `4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa` 九枚 patch-id 等同（两枚拒绝报告随链入树） | `PI-HOST-LOOP-1R` 拒绝证据 `427f4fa` | 否 | 四类复验反例原形转 permanent 首红（untouched 链尖先红）；≥4 枚 production mutation（撤 aborted 分支/撤上界/撤 turn 连续与孤儿拒/撤 runtime SHA 或 lstat）逐枚命中红恢复；九门全量非受限域取数、只收紧不回退；停在待独立验收，PASS 后才开 `PI-WRITE-HOST-1` |
| `PI-HOST-LOOP-1R3` | 原票＋1R＋1R2 合同＋`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R3.md`（**史料线索**）（2026-08-02 冻结） | 上行 target `1ab9c03` 经独立复验 `23f8339` **REJECT**：`apiKey ≤8192`／`caseRoot ≤4096` 两枚 ADR 冻结上界仍后置（8193-byte key 先落 journal 再 spawn 才由 encoder 拒；4097-byte root 以 `lstat` 外观代替配置门）；verified-node gate 未独立冻结 `bundle.bytes/sha256`，实物与被判 manifest 同步漂移 FALSE_GREEN。1R2 四原形已转常驻绿、六项偏离获追认，两枚 blocker 均为同批判据的未点名同族成员。1R3 按族闭口：D1 有界输入闭集全部前置于 journal/spawn 并以手写清单＋encoder 源码扫描双向自证覆盖、D2 gate expected side 一律锚 tracked manifest（layout manifest 先 byte-identical 才可 decode）且每类比较值带同步漂移反例、D3 对全部 `MAX_*` 与全部判据期望来源穷举清账入回执。基线顺取十二枚 patch-id 等同（三枚拒绝报告随链入树） | `PI-HOST-LOOP-1R2` 拒绝证据 `23f8339` | 否 | 两枚复验反例＋清单自证＋同步漂移各自先红；每闭口 ≥2 枚 production mutation（含「encoder 加上界不补清单」与「expected 改回自取」两枚指名形态）；九门全量非受限域取数、只收紧不回退、身份漂移按 1R Stage-2 仪式同批；停在待独立验收，PASS 后才开 `PI-WRITE-HOST-1` |
| `PI-HOST-LOOP-1R4` | 原票＋1R…1R3 合同＋`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R4.md`（**史料线索**）（2026-08-02 冻结） | 上行 target `51369e4` 经独立复验 `a0644cd` **REJECT**：D2 已闭合；决定性恰一枚——D1 覆盖自证扫描轴按 `MAX_*` 常量枚举而族定义是受验输入，SafeToken 函数型判据不在轴上，prompt `requestId` 同时躲过清单与扫描，撤其 production 门（`pi_loop.rs:678` `is_safe_token`）后清单/MAX ledger/既有 prompt 常驻全部假绿；production 语义本身正确（`invalid_ref` 先于 `user_prompted`/send）。另回执两处计数失实（实为 10 行/28 枚、12 Fronted+27 Other）且所引清账表不在 exact target。E1 requestId 入册双轴＋扫描轴扩函数型判据＋SafeToken 七成员全员清账；E2 回执计数据实、真源必须在树。基线顺取十五枚 patch-id 等同（四枚拒绝报告随链入树） | `PI-HOST-LOOP-1R3` 拒绝证据 `a0644cd` | 否 | 撤门假绿实录与扫描轴缺行各自先红；≥3 枚 mutation（撤 requestId 门／扫描轴回退仅 `MAX_*`／清单删行）逐枚命中红恢复；九门全量非受限域取数、只收紧不回退；停在待独立验收，PASS 后才开 `PI-WRITE-HOST-1` |
| `PI-HOST-LOOP-1R5` | 原票＋1R…1R4 合同＋`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R5.md`（**史料线索**）（2026-08-02 冻结） | 上行 target `d4163df` 经独立复验 `5271342`（澄清 `be0d9ad`）**REJECT**：requestId 门/七成员清账/M1–M4/E2 全成立；唯一决定性——扫描轴仍语法白名单，协议既有 wire NUL 门（`scan_string` `unit==0` 具名 InvalidSchema）不在轴上，`modelId`/`apiKey` 含 NUL 先 durable `session_started` 并 spawn、prompt `text` 含 NUL 先 durable `user_prompted` 并占 requestId；另以未登记 `contains('/')` 门证明 allowlist 机制假绿。裁定：NUL 归 Fronted（先污染后拒绝／不可编码＝无效输入；lone surrogate 于 Rust String 结构性不可达具名入账）；扫描器 fail-closed 化（拒绝分支全枚举、unknown 判红、协议判据对照面逐枚入账、排除只住具名理由行）。G3 以新轴全面复扫本轮清尾。基线顺取十九枚 patch-id 等同 | `PI-HOST-LOOP-1R4` 拒绝证据 `5271342` | 否 | 三枚 NUL 副作用实录＋未登记门旧轴全绿实录＋新轴缺行红各自先红；≥4 mutation（撤 NUL 门／扫描器退白名单／协议加判据不入账／前置加未登记门）逐枚命中红恢复；九门全量、生产前缀 SHA 如实报新值、sealed CJS 零漂移；停在待独立验收，PASS 后才开 `PI-WRITE-HOST-1` |
| `PI-HOST-LOOP-1R6` | 原票＋1R…1R5 合同＋`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R6.md`（**史料线索**）（2026-08-02 冻结） | 上行 target `a082257` 经独立复验 `9d4013e` **REJECT**：G1 四门/副作用边界/阳性对照全成立；唯一决定性——`scan_refusal_branches()` 以 `body.find("return Err(")` 定义种群，验收以合法等价 `return Err::<(), HostError>(...)` 改写票面 M4 门，扫描/账本/行为反例/整套 pi-loop 全 FALSE_GREEN（文本模式枚举语义构造三层同败之第三层）。1R6 结构性裁定：encode-before-effect（journal/spawn 前真实编码 exact packet，失败具名拒、成功 bytes 复用，wire 判据前置结构性成立）；文本扫描双轴＋75 行同步账受契约祝福退役（行为反例/手写清单/G1 门全保留）；新增普适不变量探针（Err⇒副作用恰零，违规电池自 protocol 常量派生）。基线顺取二十二枚 patch-id 等同（六轮拒绝报告随链入树） | `PI-HOST-LOOP-1R5` 拒绝证据 `9d4013e` | 否 | turbofish 原形旧装置全绿实录＋普适探针红＋撤 G1 门的 encode-early 前后对照各自先红；≥5 mutation（撤 encode-early/复合撤门/turbofish permanent/bytes 不等/映射丢 code）逐枚命中红恢复；九门全量、退役判据名清单逐名对应 H2 授权、生产前缀如实报新、sealed CJS 零漂移；停在待独立验收，PASS 后才开 `PI-WRITE-HOST-1` |
| `PI-HOST-LOOP-1R7` | 原票＋1R…1R6 合同＋`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R7.md`（**史料线索**）（2026-08-03 冻结；§五回执受理裁定同批） | **已清账**（实现 `f915eea`、回执 `744c070`、独立验收 `6da6aea` PASS、no-ff 合入 `653c121`；七轮拒绝链随合入入树；合入 tip 全量门复跑待本机执行）。历史票面：上行 target `57a19a5` 经独立复验 `cd3810a` **REJECT**：encode-before-effect 的 fresh/prompt/cancel/shutdown 形状、bytes 复用、H2 退役边界与 142 电池全成立；唯一决定性——`start_inner()` 在真实编码前调用会写盘的 `load_session()`，恢复既有会话时 partial-tail 截断、usage 补写与 crash fold 的 durable append 先于编码（codec-only future rule 反例实测 journal 558 B→790 B、spawn 0、writes 0），「任何 append 前编码」「Err⇒字节零增」「∀ future codec」三项担保在 resume/recovery 路径不成立；电池 142 行全 fresh，recovery 分支结构性照不到。1R7 裁定**恢复分相**：`load_session` 拆读/计划（纯）与 durable apply 两相、apply 后置于编码成功，担保不撤而观察面精确化（inode 级创建获准、quarantine 人口不相交、`reclaim_after_fault` 立即 apply）；电池扩 recoverable existing-session 四类形状、断言升逐字节不变＋修复未应用；`pi_loop.rs:211-222` 自陈漂移与 R6 回执计数随票订正。零漂移已源码核实（fold 纯函数、恢复态字段与追加互不作用、截断对解析不必要）。基线顺取二十五枚 patch-id 等同（七轮拒绝报告随链入树） | `PI-HOST-LOOP-1R6` 拒绝证据 `cd3810a` | 否 | resume 漂移拒＋open idle leg 现行红转分相绿对照、电池 recovery 行雏形红、partial-tail 未截断言各自先红；≥5 mutation（apply 前移/折叠一致断言撤除/电池删 recovery 族/漂移拒后 apply 照跑/reclaim 延迟 apply）逐枚命中红恢复；九门全量、R6 全部装置不回退、生产前缀如实报新、sealed CJS 零漂移；停在待独立验收，PASS 后才开 `PI-WRITE-HOST-1` |
| `PI-LANE-SIDECAR-HANG-1` | 本图 2026-08-03 架构登记（`69d6ddc` 全量门实测捕获） | 小票：`packages/pi-lane/src/sidecar.test.ts` 八枚（全文件）5s 超时——fresh checkout 于两独立环境复现（DEMO 验收沙箱 `4db54a1`、维护者本机 `69d6ddc`），同日 1R7 实现 worktree root 全绿。八测共用 beforeEach（mkdtemp→`createPiLaneSession`→127.0.0.1 `listen`→fetch），整文件级悬挂指向 beforeEach 环境依赖而非单测逻辑。本票只做：①在失败环境定位悬挂点（listen 回调不达/session 初始化/并行 worker 负载/OS 本地网络权限）；②按根因修——若环境前置缺失改**具名 fail-fast**（报缺什么），若时序竞态按 E2E-FLAKY-HOVER-1 判例等待派生信号；禁止放宽断言、加 retry 或放大 timeout 掩盖 | 无 | 否 | 连续三轮全量 root test 零超时；根因留痕入 SPEC；悬挂形态有注入反例可红；修法不得为 skip/retry/timeout 放大 |
| `PI-WRITE-HOST-1` | ADR-022 A2 + ADR-004/017/018 窄修订 | **前向债（HOST-LOOP 1R3 D3 表①登记，开工必偿；偿债形态 2026-08-02 随 1R6 改写）**：`read_host_result_payload`×3、`read_list_entry`、`read_logical_path` 出站面共 5 枚有界输入在 Host 票内因「ready capability 恰 `['case_read']`、宿主零 `host_result`」而未进前置闭集；本票首次生成 `host_result` 时须连同前置门一并补。自证形态按 1R6 装置：host→sidecar 侧由 encode-before-effect 结构性覆盖（`host_result` 出包同样先编码后 effect/append）；违规电池与普适不变量探针（`Err ⇒ 副作用恰零`）扩至该 5 枚字段；D1 手写清单增行带行为反例。1R3 的「源码扫描双向自证」已依 1R6 H2 退役，不再是偿债形态。把 proof port 接到 Rust exact 同版本 `cap-std/cap-fs-ext/cap-tempfile@4.0.2` workspace；在产品 tool table/session/policy 注册原版 write、保持 Host 已固定的 Agent sequential、给 write binder 设 `executionMode:'sequential'`、逐 toolCall 独立 env/operation，并把 dev 只读 prompt 换成 ADR-022 六-0 的六条/≤2048-byte `md-work-v1` prompt。Rust 逐段 `open_dir_nofollow`、单段建目录再重开，`TempFile` 私有同目录写入/同步/replace；物理根只在 app-data，逐次授权先 durable，Node 仍零 fs 写。不得加 edit/diff/CAS/promotion/bash/GUI | `PI-WRITE-PROOF-1` + `PI-HOST-LOOP-1` | 否 | prompt snapshot/byte gate 与四工具 exact set 有 mutation 红证；两端路径 golden 一致；非 `.md` 在 Node 零 op、注入 Rust 畸形 request 零 effect；root 内/外 symlink 父段、final symlink、swap race、Windows junction/mount/name-surrogate reparse、cross-container 全拒且零 effect；ambient API/`create_dir_all`/canonicalize 授权/`std::fs` mutation/remove-then-rename 零出现；`effect_started` append+sync 失败必须零 temp/replace；并发 reader 只见 old/new；kill 覆盖 temp sync、replace、parent/journal 屏障；Windows 无 delete-share 占用保持旧文件；宽权限 temp 与 fallback mutation 必红；unsupported remote/removable FS effect 前拒绝；replace 后屏障失败或落账前 crash 只落/派生 uncertain，不能伪 failed/completed |
| `PI-WORKSPACE-READ-1` | ADR-022 A2 的“写后可读”闭环 | 只让既有 read/glob/grep 显式路由 `/workspace/...`，由 Rust host-mediated `exists/read_file/list` 在同一 logical session 的新 sidecar leg 回读；`list` 不是新模型工具。另提供 GUI 后续消费的窄 `openWorkspaceMarkdown({containerId,sessionId,logicalPath})` command：只读当前 `.md`，返回逻辑路径/content/hash/byteLength，不落正文 journal。`/case` 仍只读；双根显示逻辑绝对路径，不得出现 `../workspace`，物理根永不进模型/journal/error。不得自动晋升工作稿 | `PI-WRITE-HOST-1` | 否 | agent write→批准→Rust 落盘→agent byte-identical read-back→glob/grep→interrupted/resumed 新 leg read-back；viewer command 对 session/path/UTF-8/131072 cap 双验且物理路径零泄漏；case/workspace 两根无串读、symlink 不跟 |
| `PI-BASE-HEADLESS-ACCEPT` | AGENTS.md 实现/验收分离；ADR-022 A2 | 独立 clean worktree 总验，不实施契约修补，只写 `packages/pi-lane/ACCEPTANCE.md`：真实 pi Agent 跑通单文件问答、多 md 定位汇总、case→新 Markdown、workspace 全量改写、嵌套 Unicode 路径+重启回读与拒绝面；另含取消、崩溃、两容器、session 累计预算与 wire fail-closed。每格同时留 Agent events、host request/result、journal、最终 bytes/hash；build 绿只作入场 | `PI-HOST-LOOP-1` + `PI-WRITE-HOST-1` + `PI-WORKSPACE-READ-1` | 否 | 必要结果完整且未截断后才可把内容错误归模型；缺工具/回灌/显式截断/落盘/回读任一项均判 harness 失败。六格反例实际注入；只在通过后允许基础 GUI 开工，未过不更新 current.md |
| `PI-LANE-UI-1` | ADR-009 决定七窄修订 + ADR-022 六-0/六-D | pi 线基础成熟 GUI 薄投影：直接依赖 exact `@assistant-ui/react` headless primitives + 公共 `useExternalStoreRuntime` hook；React→Rust command，journal→projection。首版只给 Prompt/Stop、真实运行/预算、tool proposal+逐次授权、结果/错误/恢复，以及从 succeeded write fold 出的 workspace `.md` 索引与 host-mediated 只读查看；uncertain 不进成功索引但工具卡可核验当前文件。浅色 craft 与 GUI 同票交 Opus：方向锁冷白/深墨、扁平、版本目录学、克制反乌托邦及 anti-slop，构图/比例/间距/浅色 token 微调/合规微交互由真实截图迭代，不给指定 wireframe；dark 只守同构回归，磁青精修后置（届时指定供料：`archive/zhimopu-kit-2026-07-25/`，消费裁定见归档索引同名条目——ciqing v0.5 值表＋校勘三因＋二声部不同族律；暗宗器面阶 hover/controlHover/selected 缺格同批补格；深宗 `--text-tertiary` 三面 AA 不达（4.28/3.87/3.14＜4.5，2026-08-05 UI-1 上浮，暂以移出核验类文字缩小暴露）随槽收口）。assistant-ui 只给机制；OpenDesign/Moda/Logue/OpenWork/OpenCode/Open WebUI 只作筛选过的参考，不作视觉真源、源码来源或 runtime 依赖；证据索引见 `archive/research-gui-design-direction-2026-07-28.md`。**2026-08-05 派单增补**：设计凡例 §12（冷调与克制反乌托邦）为权威护栏，craft 基调「明快的冷色」（浅宗先行、高对比冷中性、朱砂稀缺）；Vercel `https://vercel.com/design.md`（2026-08-05 读取）与既有参考同格——只借工艺判断（构图先于组件、单焦点关系、squint/text-mask 自检、「拒生成式反射」清单与克制审计同族），其 vbg-*/Geist 字体/壳资产/网络资产一概不接，token/字体/动效仍只认仓内现法；随票面落地同日裁定：同 container 历史 session 工作稿显式「上一段工作稿（只读）」入口，经 `openWorkspaceMarkdown` 只读通道，不改「新 session workspace 初始为空」冻结语义 | `PI-BASE-HEADLESS-ACCEPT` 放行——**2026-08-05 产品负责人拍板重排：本票提前开工，与真 key 六格并行；`PI-BASE-GUI-ACCEPT` 与 agent 称谓仍锁真 key＋headless 证据，scripted/faux 不得顶名**；本票独占当前 App 槽，不与 Dossier/context/其他 UI 票并行；不开阻塞它的前置 Design 票；resume prompt/capability 漂移门（`PI-WRITE-HOST-1` 验收上浮 D：真 driver 注入后 `session_resumed` 不记两值即账实不符）须随 HEADLESS 前置或本票落地 | **是**（放行后的 App 首票） | LocalRuntime/cloud/AI SDK/OpenCode adapter/branch/edit/queue/private import 零出现；未知 event fail-closed；审批按钮只发 command，决定只认 journal；viewer 复用 `ChatMarkdown`、正文不持久且无编辑/保存/promotion；首次 uncertain create 可核验且仍标 unverified，当前 hash 异于 succeeded hash 必提示；展示投影的流态更新至多每 rAF 合并一次、所有 terminal 取消 pending frame 并立即 flush；用户上滚后 streaming/Stop/terminal 不夺回视口；浅宗交空/运行/proposal/succeeded/denied/failed/uncertain/resume/viewer/overlay 全状态截图，dark 做结构/对比/溢出烟测；WKWebView 键盘/读屏/焦点/Stop race 真测；bundle delta 留证 |
| `WORK-AGENT-GUI-1` | ADR-022「2026-08-13 产品中心修订」；票面 `apps/desktop/specs/WORK-AGENT-GUI-1.md` | 把信息架构与已存在的 Pi GUI 对齐：顶层 `Work`＝Pi lane，原顶层 `Work` 改称 `Scenes`；选中/创建授权工作区后的默认入口、零垂类 CTA 与 Working folders 的工作稿入口同落 Pi lane。删除 browser-only `WorkDraftPanel`/`work-draft-store` 及 `DraftSeat.workTrack` 伪真源；generic DraftDocument→起草画布交付轨保留。只迁 UI/路由/测试，不改 Pi wire/journal/runtime、Package ABI、场景 executor 或垂类语义 | `PI-LANE-UI-1`、`GENERIC-SCENARIOS-1`、`PACK-INTERACT-1`（均已清账） | **是**（当前 App 唯一实现票） | born-red 先证真实 grant 的旧面可把空 `caseRoot` 铸成伪 `/工作稿/...`、仅写 renderer Map 却回“已新建”；零垂类 CTA/Working folders 仍可达它；顶层标签仍 `Work=Scenes/Draft=Pi`。修后非 demo grant 三入口同落 `PiLanePanel`，内存 store 源码/生产 import/testid 零残留，场景按钮与 generic/Legal artifact handoff 不退化；App 高水位 2218 只降不升；完整 build/lint/root/desktop/cargo/site:guard/独占 PW。scripted 只证明路由，不能取得 agent 称谓门 |
| `PI-BASE-GUI-ACCEPT` | AGENTS.md 实现/验收分离；ADR-022 A3 | 独立 clean worktree + 真实 Tauri WKWebView 总验，不修契约，只写 `apps/desktop/ACCEPTANCE.md`：从现有凭证/授权入口发起通用 `.md` work，观察 stream/Stop、write proposal 逐次允许/拒绝、终态/预算/恢复，并从 workspace 索引打开当前 Markdown；确定性 provider 跑机械反例，真实 DeepSeek 甜点档再跑 headless 同构任务矩阵 | `WORK-AGENT-GUI-1` | 否 | scripted matrix 与真实 provider 均留 journal→projection→workspace bytes/hash 同源证据；真实 key/model 缺席则只能报 external-validated blocked，不得放行“harness 非瓶颈”；键盘/读屏/焦点/reduced-motion/scroll ownership/Stop race 全实跑。本票放行取得 agent 称谓门，并同时解锁 A4 的 Dossier/垂类修订/UI 巧思与 `PI-DEBUG-BUILD-1`；架构消费 PASS 后据实更新 `current.md`。debug build 只验证维护者个人安装制品，不是 agent 称谓、A4 或 current 状态的前置 |
| `PI-DEBUG-BUILD-1` | ADR-020 决定零 + ADR-022 产品称谓门/六-E 的物理证据闭口 | `PI-BASE-GUI-ACCEPT` 后只构建 exact accepted `productSha`（build receipt 前、clean local `main` 上已含 GUI 放行记录的产品 tip）的 arm64 Tauri `.app`/DMG，命名 `Courtwork_debug_<short-product-sha>_aarch64.dmg`；仓库外按 full product SHA + DMG SHA 拒绝覆盖、只读保全。现行 routeId 固定 `node22-runtime-sealed-cjs-v1`，但构建前仍须由架构从真实 Tauri inventory 冻结该路线的 exact signing plan 与 strict manifest JSON Schema，且两 blob 已属于 `productSha` tree；未冻结不可派。构建会话只新增 `packages/pi-lane/specs/PI-DEBUG-BUILD-1.md`，且不得判 acceptance；不同验收会话从独立 clean worktree 只读消费回执指定的 manifest + exact DMG，只追加 `apps/desktop/ACCEPTANCE.md`。零功能开发、零版本变化 | `PI-BASE-GUI-ACCEPT` + `PI-SIDECAR-DIST-1R5` 已放行并裁 Route A + 架构已冻结 schema/signing-plan 两 blob | 否 | strict manifest 原子落定并双绑 productSha tree 内 schema/plan path+hash，锁 `productSha/tree/locks/route/build argv/toolchain/host/DMG/app/build-vs-mounted inventory/signing`；回执引用 manifest path/hash，少/多/换件即红。逐件 inside-out 签名/entitlements/strict verify 与 `spctl` 预期拒绝如实留证。验收先跑随包 sidecar deterministic control，再从 mounted WKWebView 以维护者真实 key 跑 read→proposal→允许/拒绝 write→回读、Stop/crash/restart；物理/确定性失败=`debug-blocked`，key/model 缺席=`external-validated blocked`，证据零 secret/Authorization/raw prompt/workspace 正文。禁止 tag/push/Release/asset/Pages、四处版本到 `0.2.0`、release/current/site/README 真值变化、Developer ID/notarize/staple 及 `released`/`product-live` 宣称；成功最多记 `external-validated`，范围只到维护者个人 debug |
| `PI-SIDECAR-RELEASE-1` | ADR-020 + ADR-022 六-E | **parked：未来公开发行重启时才可派。** Developer ID、nested executable 逐件签名、notarize/staple、Finder 首启、`spctl` 与双架构读/写/abort/crash 复跑；不夹功能开发 | `PI-BASE-GUI-ACCEPT` + `PI-DEBUG-BUILD-1` + 已裁 sidecar 分发路线 + 架构显式恢复公开发行 | 否 | 无凭据如实 external-validated blocked；`codesign --deep` 只 verify 不代签；正式制品证据闭合后仍须重冻版本/许可/候选链，不能单独更新 release 成熟度 |
**回执去处（2026-08-05 归档批）**：上表已清账各票的独占回执共 24 份已移出 `packages/pi-lane/specs/`，入 `archive/pi-lane-receipts-2026-07-28--08-05/`（**史料线索**，逐条索引见 `archive/README.md` 该目录的五枚条目，每条附逐轮 SHA 表）——`PI-WRITE-PROOF-1`、`PI-CODE-STDIO-1{,R,R2}`、`PI-SIDECAR-DIST-1` 六轮及 `-1R5-ACCEPT` 验收令、`PI-HOST-LOOP-1` 原票与 `1R`…`1R7`、`PI-WRITE-HOST-1-STAGE2`…`STAGE6`。归档件恒不具约束力；`specs/` 内**留下**的十一份是仍在承载移交、未偿项或源码引用的现行件（`PI-TOOLS-HONESTY-1`、`PI-WRITE-HOST-1-PREFLIGHT`／`-RECON`／`-STAGE7`、`PI-WORKSPACE-READ-1{,-RECON}`、`PI-HEADLESS-HARNESS-1`、`PI-READ-TOOLCALL-1`、`PI-HOST-JOURNAL-1`、`PI-TOOLCALL-BINDING-1`、`PI-UNKNOWN-TOOL-1`），不得随批归档。

### 2026-08-04 审计双确认批（七枚缺陷修复票，产品负责人批立）

七枚均经双确认——V1 逐条反驳失败、V2 复核既有测试/门/文档零覆盖，坐标全部在 `c4903b9` 现读现核。CONTESTED 项不单独立票，按同一改动面并入对应票的**待复核**子项：不因 contested 免于查证，核后二选一（随本票修 / 显式登记为已知边界），禁止悬置。全批共同边界：任一票若须改 schema 语义、wire 闭集或跨层契约，即停下报架构，实现会话不得自裁；退出证据一律要求反例注入红证（根 `CLAUDE.md`「边界守卫必须能注入反例触红」），坐标一律用符号锚不用行号（判例「文档引码用符号锚」）。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `OUTPUT-APPLY-FIDELITY-1` | 2026-08-04 审计双确认，产品负责人批立票；`packages/output/SPEC.md` 实现留痕 1（`w:pPr` 保持 `w:p` 首子）/2（字体只落触碰 run）/6（未应用指令落盘门禁）；不变量 4、6 | 三枚同文件缺陷，全住 `packages/output/src/apply-instructions.ts`。①`attachCommentToWholeParagraph` 无条件把 `w:commentRangeStart` 插在 `p.firstChild` 前，凡段落带 `w:pPr` 即出 CT_P 序违例 OOXML；两条可达路径——`delete` 带批注与 `commentOnly` 命中任何带 `w:numPr`/`w:pStyle`/`w:jc` 的段落。**committed golden `src/__snapshots__/golden-document.xml` 已固化该坏形**（comment id 2 与 9），须同批重烤并核 diff 只含位序修正。②`applyMinimalReplace` 保 pPr 后清段重建，把 `textOf` 拉平进来的 `w:delText` 复活为 live `w:t`，他方 `w:ins`/`w:del`/`w:commentRangeStart\|End`/`w:bookmarkStart`/`w:hyperlink` 一并抹除，状态仍报 `applied`——不变量 6 的正面违例。改法：重建前 fail-closed 预审段内结构（白名单外含未知节点一律拒绝），命中即返 typed 非落格态。③fuzzy 定位下仍以字面 `quote` 做 `split/join`，而 `locate.ts` 的 fuzzy 分支结构性保证无段落字面含该 quote，故必然零编辑，却报 `applied_fuzzy` 过 `isApplied` 门。改法：消费定位器本就携带的 `matchedText` 作有效 quote，另以「零修订痕迹即一个节点不动、返非落格」兜底（等值替换同路径）。**待复核（CONTESTED）**：`markParagraphDeleted` 经 `childrenOf(p,'r')` 只认直子 run，内容住 `w:ins`/`w:hyperlink` 时零 `w:del` 却报 `applied`——实现已以同一 fail-closed 重建预审覆盖该触发面，验收核到达性。**边界：不扩 `NonAppliedReason` 闭集**——output 层新增 typed 状态 `unsupported_existing_markup`，desktop 仅 `compile-review-output.ts` 的 `REASON_BY_STATUS` 补一行映射到既有 `'unsupported'`（防 `?? 'not_located'` 兜底错标理由），此外不触 desktop；不做 `FuzzyCandidate` 窗口拼接式真 fuzzy（能力扩张，另票）；不碰 `comments-part.ts`、`fonts.ts`、`compile-draft-to-docx` | 无（`CONTRACT-OUTPUT-TRUTH-1` 已清账）；**2026-08-04 产品负责人指定即刻开工，实现于 `claude/output-apply-fidelity-1` 待独立验收** | 否 | 三缺陷各先红：带 pPr 段落跑 `commentOnly` 断言 `p.firstChild` 为 `pPr`（现行必红）；含他方 `w:del`/`w:delText`/`commentRangeStart` 的段落跑 `replace` 断言原修订与 range 逐一存活且状态非 `applied`（现行必红）；fuzzy 段落断言真产生修订痕迹、等值替换断言非落格（现行必红）。golden 重烤逐条核 diff 只含 pPr 位序修正，夹带任何其他结构变化即驳。mutation：撤 pPr 感知插入、撤重建预审、撤零痕兜底，逐枚复红。`pnpm -r build`／`pnpm lint`／`pnpm test` 与既有 comments 幂等、字体作用域两族用例零回归 |
| `CASE-LIST-GUARD-1` | 2026-08-04 审计双确认，产品负责人批立票；`apps/desktop` 持久化 fail-closed 自述；不变量 4 | 两枚。①`App.tsx` 挂载即跑的 `useEffect(() => writeCaseList(projectPersistableCases(cases)), [cases])` 没有「读是否成功」闸，而 `hydratePersistedCases()` 经 `readCaseList()` 把每一种 `unreadable` 判定（未知 `ContainerKind`、schema 版本不符、字节损坏）折成 `[]`，首帧即以空表无条件覆盖——真实案件清单永久消失，且该判定零用户可见面。改法：`unreadable` 存状态位、置位期间跳过 `writeCaseList` 并显式呈现（`chat-memory` 的「不合入不 clobber」同构先例）。②`work/work-session-lifecycle.ts` 的 `retryOutput` 把 `runContractOutput` 两条 `undefined` 返回（scope 闸与 replay 失败支）吞成零反馈空点击；`workReplayFailureCopy` 现成未用。改法：判别式返回、两支各给可区分显式反馈。**待复核（CONTESTED）**：`createContractReviewSubmitter` 首胜闸不按 case/session 加键且 `reset()` 不清 `submitterRef`——本票核到达性并二选一登记。边界：不改 `CASE_LIST_SCHEMA_VERSION` 与持久格式、不写迁移器；不铸新 `WorkReplayError` 变体；不碰 `PERSIST-BACKEND-1` 的归并面 | 无；**触 `App.tsx`，与在途 App 队列政策冲突，须产品显式再授一次方可开工**（先例 `AGENT-CLAIM-CORRECTION-1`，不得由实现会话援引自开）；与 `PERSIST-BACKEND-1` 互斥定序 | **是** | 读闸即红：注入未知 `ContainerKind`、`version:2`、截断 JSON 三形，断言原字节逐字节不变且有用户可见显式态（现行三形均清空必红）。反馈即红：host read 抛错时点「生成批注稿」须出对应文案（现行零反馈必红）。mutation：撤读闸、撤两支反馈，逐枚复红。desktop 全量静态门与隔离端口 Playwright 全绿，floor 不降；`lint:app-highwater` 净增须由等量外提抵消 |
| `PI-HOST-JOURNAL-1` | 2026-08-04 审计双确认，产品负责人批立票；ADR-010 决定二「目录项落盘」；`PI-HOST-LOOP-1R7` 恢复分相裁定 | 三枚，全住 `apps/desktop/src-tauri/src/`。①`pi_loop_journal.rs` 的 `open_append` 以 `.create(true)` 建 journal、`plan_session_locked` 的 `fs::create_dir_all(&container)` 均不同步目录项；全写路径唯一的 `sync_directory` 锁在 `PlannedSession::apply` 的 truncate 支内，新会话结构性不到达。硬断电后目录项可缺，下次读得空 → fresh 支 leg=1、`prior_turns=0`、`prior_usd=Some(0.0)`——已计费腿静默归零。改法比照同仓 `work_state.rs` 先例补目录 fsync。②turn ordinal 连续性只在读侧 `validate_records` 成立，`pump` 写侧零校验——本机可 durable 写入自家 validator 必拒的记录，下次 start 整档 quarantine 后静默零预算重启。改法：`pump` 在 append 前加 ingest 门，quarantine 后 fresh start 显式。③`quarantine_session` 以 `sha256_hex(original)` 命名、调用点却全传 LF 完整前缀，rename 移的是仍含 partial tail 的原文件——内容寻址失真、同前缀异尾两档撞名卡死 sessionId（R7 分相的副产品，PASS 验收未捕获）。改法：传全字节。**待复核（低危）**：`cost_usd` 无界 f64 累加，核后二选一。边界：不改 wire/记录形状/codec；R6 encode-before-effect 与 R7 恢复分相装置不回退；不接 GUI、不碰 write 面 | `PI-HOST-LOOP-1R7`（已清账）；**须早于 `PI-WRITE-HOST-1`**，两票不得同时在途；**2026-08-04 同日实现于 `claude/pi-host-journal-1` 待独立验收** | 否 | 目录项：注入「文件数据已落、目录项未落」崩溃窗，断言 resume 后 leg/prior_turns/prior_usd 精确 fold 而非归零（现行必红）；mutation 撤任一目录 fsync 复红。ordinal：sidecar 首腿报 `turn:2` 须在 append 前拒——坏事件与 usage 第二笔零落盘，失败经 `fail_protocol` 显式落 `session_failed`（pump 既有门同形），定向反例锁定；quarantine 后新 start 拒绝静默零预算（现行静默必红）。摘要：构造「末条完整＋尾部 partial」档，断言 `sha256(fs::read(target)) == target_sha256`（现行必红）；同前缀异尾两档不撞名。`cargo` 前须先 `build:product-sidecar` |
| `READING-SDT-1` | 2026-08-04 审计双确认（两条独立审计维度同址命中）；`packages/reading-view/SPEC.md`「静默丢内容属本包硬禁区」；不变量 4 | `packages/reading-view/src/docx/docx-reader.ts` 的 `walkBody` 只认 body 直子 `w:p`/`w:tbl`，其余块级子节点（内容控件 `w:sdt`/`w:sdtContent`、自动目录、`mc:AlternateContent`）落无 `else` 空分支静默丢弃；单元格只取直子 `p`，嵌套表同丢且 `tableHasMergedCells` 照不到。被跳过正文在 markdown、textRange、quote 三处一致「不存在」，仍报 `status:'ok'`——与同包合并单元格整文件 `fidelity_insufficient` 的口径自相矛盾。产品路径：Composer 落档 → `kind:'ready'` → 用户看到「已完整读取」的合同缺条款。二选一并留裁定痕：递归收进，或白名单外块级节点按合并单元格先例整文件降级并具名标签。边界：不新增第二套 OOXML 解析底层；不改 `ReadingViewOutcome` 形状与锚点契约、不动 `docx-preflight` 安全面 | 无 | 否 | 三枚 fixture 各先红：body 级 `w:sdt` 包 `w:p`、包 `w:tbl`、`w:tc` 内嵌 `w:tbl`（现行均 `ok` 且 markdown 缺正文）。修后按所选路径断言正文/textRange 精确出现或整文件降级携具名标签；白名单外未知块级节点必不静默通过（合成标签触红）。mutation：撤递归或撤降级分支复红。既有 docx-reader 用例与合并单元格降级零回归 |
| `PROVIDER-FINISH-1` | 2026-08-04 审计双确认，产品负责人批立票；`packages/provider/SPEC.md` PROVIDER-STREAM-1 章节；不变量 4 | 两枚，住 `packages/provider/src/provider-stream.ts`。①空正文终态丢弃已解析的 `observedFinishReason`：`content_filter`（过滤先于首 token）、`length`（预算被 reasoning 吃光）、DeepSeek `insufficient_system_resource` 三种结构不同的结局塌成同一 `invalid_response` 同一句带 Retry 的文案——重试必得同一失败。改法：让终态携观察到的 reason，最低限度停止三态复用同一串。②同文件六道 fail-closed 协议门零反例覆盖，而现存 SSE 测试全跑不在 exports、语义与实装相反的死模块 `src/sse.ts`——覆盖假象。改法：六枚负向 transport 各断言恰一终态与具名 kind；`sse.ts` 退役或降为测试 helper。**边界：与 `C3-1` 严格分工**——本票不新增 `ProviderFailureKind`、不改 UI 文案面；若确需扩闭集或改失败载荷，停下请裁并与 C3-1 合并排期。不碰 http-client 重试与超时语义 | 无技术依赖；**排期与 `C3-1` 定序**（同一失败闭集面，不得并行改） | 否 | `delta:{}` 携 `finish_reason:'content_filter'` 的 transport 先红：断言终态可与「服务商无正文」区分；`length` 与 `insufficient_system_resource` 各一枚同形。六道协议门各一枚负向 transport（重复 `[DONE]`／`[DONE]` 后载荷／`ping:` 行／异 requestId／两枚 `response_started`／`response_started` 前 chunk），逐门 mutation 必红。`sse.ts` 退役后全仓 `parseSseEvents` 零引用；**退役 5 枚测试净减须先核 floor/高水位口径**（净减亦触红判例在案） |
| `ADMISSION-ENUM-1` | 2026-08-04 审计双确认；`packages/registry/SPEC.md`「零编码暴露律机器化」宣称；ADR-001；判例「扫描谓词与族定义同宽」 | 两枚。①`admission.ts` 的 `collectEnumFields` 只走七类 zod 节点，其余静默返回；其注释前提「record/lazy 等当期包 schema 用不到」**今日为假**——`legal.ReviewMatrix` 的 `z.record(...)` 内嵌 `ConfidenceEnum` 正走此门，`ZodDefault` 同漏（`risk-list` 的 `outOfCoverage`、pm `action-items` 的 `markers`），而同文件 `unwrapSchema` 恰恰解 ZodDefault——一模块两口径。后果：这些枚举缺词表照常准入，wire 码可无词表直达 UI。改法：补 ZodRecord/ZodDefault/ZodReadonly/ZodCatch/ZodTuple/ZodIntersection/ZodLazy，未识别节点 fail-closed。②`package-manifest.ts` 的 `CitationBindingDataSchema` 五字段名从不与 draft/final schema 对账，写错一字即整批缺口条目被 zod strip 静默吞——风险清单少条目、缺口表为空、零报错。改法：`itemScope` 须命中数组、其余字段须为对应 schema 已声明键，不命中即拒载。边界：只改准入门与反例测试；扩紧后若现行 legal/pm 被拒载须补词表/binding 使合规，**不得为过门放宽门**；补词表属受控外溢，SPEC 留痕并接受验收查证，与 `PM-SCHEMA-1` 定序 | 无 | 否 | 反例逐枚先红：`z.record` 内嵌枚举缺 enumLabels 必拒载；`.default()` 包裹枚举两形各必拒载；未识别 zod 节点必 push issue（合成节点注入）；`outOfCoverageField` 误名一字符、`itemScope` 指向非数组、`anchorField`/`draftField` 不存在，各一枚必拒载。mutation：撤 ZodRecord 分支、撤 fail-closed、撤任一字段对账，逐枚复红。现行 legal/pm 补齐后仍准入；既有 admission 用例与 `json-schema-drift` 零回归 |
| `PI-TOOLS-HONESTY-1` | 2026-08-04 审计双确认，产品负责人批立票；`packages/pi-lane/SPEC.md` 五-7「超限在结果里显式告知模型」；ADR-022 决定三；不变量 4 | 两枚，住 `packages/pi-lane/src/tools.ts`。①200 条命中上限只在 glob（`matches.length < MAX_MATCHES`）与 grep（两处 `hits.length >= MAX_MATCHES` 早返）静默生效；`truncated` 只由 `MAX_FILES_SCANNED` 产出，满 200 条时返回 `truncated:false` 且无注记——与文件头自述合同、SPEC 五-7 双双相反。②`walkFiles` 对 `listDir` 失败 `continue`、grep 对 `readTextLines` 失败 `return`，容器拒读（含 `permission_denied`）的整棵子树被丢弃且不计数，仍报完整——对法律材料的自信假阴。**生产面同受影响**（`product-runtime.ts` 以 `CASE_LOGICAL_ROOT` 消费同一 `createReadOnlyTools`）。改法：返回独立 `matchesTruncated` 与 `skipped`（可带 FileError code），文本结果附具名注记，`details` 同步出字段。**待复核（CONTESTED）**：`sidecar-main.ts` 的 `PI_LANE_MAX_TURNS`/`PI_LANE_MAX_USD` 无 `Number.isFinite` 校验，NaN 使 `evaluate()` 的 `>=` 恒假、预算失守——核后二选一（startup fail-closed 或 dev-only 显式登记），禁止悬置。边界：不改上限值、不扩 glob 语法、不改 symlink 保守解；不动 write 与 host 面；SPEC 五-7/五-8 措辞随实装同批订正，不留两版真值 | 无；与 `PI-LANE-SIDECAR-HANG-1`（在途）同包不同文件，按同包门互斥定序；**须早于 `PI-WORKSPACE-READ-1`** | 否 | 超 200 命中语料跑 grep、超 200 条目跑 glob 各先红（现行 `truncated:false` 无注记）；修后「扫描上限」与「命中上限」两类可区分。chmod-0 目录与不可读文件 fixture 各先红；修后 `skipped` 计数与注记如实、可分辨拒读与真无命中。mutation：撤 `matchesTruncated`、撤 `skipped`、注记改回只报文件上限，逐枚复红。SPEC 五-7/五-8 与实装逐字对照；`packages/pi-lane` 全量单测与全仓门绿 |



**`R-16`ⓑ 挂账（`C/R-16`）**：「工作稿轨可撤销性在 UI 真实成立」不现在实现、不悬置——登记为 **ADR-019 决定三实施票的验收条款**（须有反例：不可撤销即红）。


### 2026-08-05 架构/功能层验收批（四枚，31 员六维＋对抗否证）

产品负责人明示「build 全绿不等于功能实现逻辑和架构设计通过」，遂对已合入 pi 五票做**设计成立性与功能可用性**层验收（不复核 build/计数）。干净面如实登记：两线账本零混写、provider 例外未反向扩大、write 链系统裁决结构性成立（缺 driver 恒 `policy_denied` 显式落账、proposalHash 与 contentSha256 双重算、授权后 effect 前二次 probe 收 swap-race）、模型工具恰四件且 bash/edit 双锁。以下四枚为确认缺口，均**先于 `PI-LANE-UI-1`／`PI-BASE-HEADLESS-ACCEPT` 兑现**。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `PI-TOOLCALL-BINDING-1` | 2026-08-05 架构验收①（回归）；ADR-022 六-B.2「Rust 重算不认对端自报」＋:285-290 tool↔capability 冻结映射 | **`PI-READ-TOOLCALL-1` 引入的回归**：该票把 `ToolStarted` arm 由 write-only 扩为四工具穷举时，删去原「只认 `write`」结构性绑定（`git show 6ae50e7` 的 `-` 行逐字在案）却未补等价判据——`active_tool_call: Option<String>` 只存 id，写臂 `take` 只问有主不问主是不是 write，读臂 `peek` 同理接受 write tc 名下的读 op；tool↔capability 现仅存于 Node 侧 `TOOL_CAPABILITY`（Rust 按设计不信任的那一方）。作用域同缺：`active_tool_call` 不随 prompt 起止收束，cancel/retryable 失败后陈旧 tc 可跨 prompt 存活。改法：字段改 `Option<(String, ProductToolName)>`，写臂要求 `Write`、读臂要求读三件，与 Node 表同源；prompt 起点与终态各显式清空。边界：不改 wire/journal 形状、不动 Node 侧 | `PI-READ-TOOLCALL-1`（已清账） | 否 | 两枚反例：`ToolStarted{Read}` 后发 `workspace_write` 须 `StateViolation` 且零落账零 effect；prompt1 留活 tc → prompt2 首枚 write 须拒而非落账。撤任一判据复红；既有 236 枚 cargo 零回归 |
| `PI-UNKNOWN-TOOL-1` | 2026-08-05 架构验收③；`packages/pi-lane/SPEC.md:48-50`（「模型请求 edit/bash 得到内核 `Tool X not found`、isError 回灌可见」）与 §九 六格 cell 6 | 内核在**查表之前**即以模型自填的 `toolName` 发 `tool_execution_start`（`agent-loop.js:299-305`），product runtime 原样转发（`product-runtime.ts:484-486`），状态机判上游违约 → `upstream_event_unsupported`、`retryable:false`、logical session 关闭（`product-stdio.ts:841-845→540-553`）。于是模型随口叫一声 `bash`／`edit`／`list_files` 就非可重试地杀掉会话，`/workspace` 既有工作稿随之停摆——与 SPEC 承诺相反，且属 ADR-022 六-0 自定判据下的 **harness 缺陷**，使 cell 6 在真 key 到位前已不可能通过。既有测试以 `as unknown as` cast 构造该事件，威胁模型只设想代码违约、未设想模型输入。改法：在投影入口把「闭集外 toolName」与「上游违约」拆开——闭集外 `tool_execution_start` 不上 wire，只待同 tc 的 `tool_execution_end`（内核必发 `Tool X not found` isError）照常回灌；真实现层违约（同 tc 重复登记、finish 无 start、改名）仍 fail-closed。边界：不扩工具闭集、不改 wire、不动 Rust | 无 | 否 | 反例：模型发 `bash`/`edit`/未知名 → session 存活、模型收到 isError 结果、可继续 write；实现层违约三形仍关闭 session。mutation 撤拆分即复红。SPEC §三.1 与六格 cell 6 措辞同批对齐 |
| `PI-DUALROOT-CONTRACT-1` | 2026-08-05 架构验收②；ADR-022 六-B 双根寻址＋六-C 逻辑根口径（2026-08-05 修订）| 裸相对路径写面绑 `/workspace`（`workspace-write-env.ts:80-83`）、读面经 `dual-root-env.ts:44-49` 的 `roots[0]` fallback 静默绑 `/case` 且 `/case` 容器照收——同一字符串两义、无任何一层拒绝；四件工具 description 与 `path` 参数说明仍是单根口径（write/read 保留上游原文、glob/grep 为「相对授权文件夹」），而 system prompt 第四条要求「写后回读确认」，模型复用同一路径即落到另一根。改法已裁（2026-08-05 拍板，ADR-022 六-C 逻辑根口径修订落痕）：读侧对称绑 `/workspace`——四件工具裸相对路径同一口径落 `/workspace`，`/case` 强制显式前缀；四件工具契约文案同批改双根口径（工具契约是模型唯一能读到的寻址规则，prompt 不能替它）并落 SPEC。边界：不改 wire、不动 Rust 容器判据；若 `md-work-v1` 文案与新口径冲突，登记 [需架构拍板] 不得自行改 prompt（prompt id 属 `session_started` 闭集） | 无；**须早于六格 3/4 判读**（否则 harness 缺陷会被误记为模型能力不足） | 否 | 反例：裸相对路径在四件工具下一致落 `/workspace`；write→同串 read-back 必命中同一文件；显式 `/case/...` 读照常可达；工具 description 双根口径静态断言。撤判据复红 |
| `PI-HOST-CONCURRENCY-1` | 2026-08-05 架构验收④；**ADR 修订已落痕（2026-08-05 拍板）**：ADR-022 六-C.1（授权面）／ADR-009 同日窄修订（端口面）；readiness `PI-LANE-UI-1` 行「首版只给 Prompt/Stop……审批按钮只发 command」与 `PI-BASE-GUI-ACCEPT`「Stop race 真测」 | `prompt()` 落 `user_prompted` 后直接 `pump(request_id, None, …)`——无总时限且独占 `&mut self`；`cancel()` 需同一独占借用，故 prompt 在泵中时结构性无人可调（全 `src-tauri/src` 内 `cancel` 唯一出现即其定义行，零调用点被 `#![allow(dead_code)]` 遮住）；`WriteDecisionDriver::decide` 同步返回、跑在同一阻塞泵内 ⇒ 等待用户点击期间 host 线程整体卡住。以现 API 形状，「Stop race 真测」**写不出来**（借用检查器先拦），零覆盖是零可达的影子。对照：同 crate 场景线已有 `cancellation_store()`＋oneshot/`select!`＋`cancel_provider_request` 先例。**这不是覆盖率问题而是形状问题，且会在 UI-1 开工首日撞上**，而 ADR-022 A1 已把 cancel 列为可交付能力。模型已由六-C.1 冻结：宿主专属线程＋入站命令通道（运行期闭集 `prompt|cancel|decision|teardown`）、泵任一等待点可被命令唤醒、decide 投提案等回执、Stop 收束悬置提案为 `user_denied`、回执不追溯生效、悬置提案不跨 leg；wire/journal 闭集零变化。随批收口（①验收上浮两项，循 current.md 挂账）：同工具形槽位 fail-closed（write tc-A 被 tc-B 覆盖即状态违约，不静默丢弃）、Rust 侧 tool↔capability 双写收敛为单点 `capability_for(ProductToolName)`（循「同步消灭优于同步验证」判例）。可派实现 | **阻塞 `PI-LANE-UI-1`** | 否 | Stop-在-prompt-中 与 授权等待期间 Stop 两枚真竞态测试；回执不追溯生效反例（提案收束后回执到达，effect 恰零次）；同工具形槽位覆盖反例；`capability_for` 收敛后双写点归零；`#![allow(dead_code)]` 收窄（它正把「A1 宣称已交付的能力无人调用」静默掉）。撤判据复红 |

**随批小票（不属上表四枚，独立可派）**：本批复核期间两个独立会话各自撞上同一枚测试抖动并如实登记，坐标一致、归因一致，故随批立票。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `PI-TEST-WAITER-1`（已清账 2026-08-09：实现 `9883f3c`＋返修 `dd1e950`，首轮 REJECT `f589461`——`waitForTraceLength(1)` 对否定断言零区分力（等待终止点＝观测窗口起点，反例装置独立 env 注入交付绿而 main 原形红）；返修两职分离（正向信号证前置＋`VIOLATION_WINDOW_MS` 显式违例窗口注入，正向可观测量经上游 WeakMap 私有面亲核不可得），聚焦复验 PASS `118a6cd`（结构性不可伪红论证＋20 路争用 load 峰值 101 下 20/20），no-ff 合入 `0fc1541`。「否定断言没有正向派生信号」判例入 workflow.md；:971 判有意延迟注入保留） | 判例「异步前置不赌时长」（`docs/engineering/workflow.md` 在册）；两处独立观察——`packages/pi-lane/specs/PI-UNKNOWN-TOOL-1.md:163-171`（实现者，`load average 6.79`）与 `packages/pi-lane/ACCEPTANCE.md:3913-3921`（其验收者，load 峰值 `7.50`） | 一枚，住 `packages/pi-lane/src/workspace-write-env.test.ts`。`:705` 的 `const settle = () => new Promise((resolve) => setTimeout(resolve, 20))` 是**裸墙钟赌注**——赌 20ms 够三条异步链各跑到 `enter`；三处调用点 `:724`／`:755`／`:774`，塌红的是 `:764`「经 binder 的同路径并发调用同样不被串起来」与 `:707`「characterization：共享同一 env 对象时…」两枚。**与本批四票无因果**：该文件对 `product-stdio` 引用计数 `/usr/bin/grep -c` = **0**，两会话各自独立确认。改法：换成由被测对象自身派生的信号——`recordingPort` 已逐次记 `port.requests`／`port.trace`，等「trace 达到期望长度」或「port 收到第 n 枚请求」即可，不再等挂钟；派生信号须带上界并在超时时报出**当时的实际 trace**（否则只是把赌注换了个地方且更难归因）。**边界**：只改该测试文件的等待器与其调用点，不改被测语义、不改断言的期望值、不动生产源码、不加依赖 | 无 | 否 | 注入负载下必绿：跑该文件时同机压满（如并行 `cargo test` 或等价 CPU 负载，登记实测 load average），两枚用例 **10/10** 通过；同批记无负载对照。**mutation：把派生信号等待撤回 `setTimeout(resolve, 20)`，在同一注入负载下必复红**——不复红说明负载注入无效，须先修注入再判。既有 540 枚 pi-lane 用例零回归，净增/净减须据实登记。**待复核（低危）**：同文件 `:926` 的 `await new Promise((resolve) => setTimeout(resolve, 5))` 是 port 侧**伪延迟**（构造慢 port 以验顺序），角色与等待器不同；本票核其是否也在赌时长，核后二选一（随本票改 / 显式登记为有意的延迟注入），不得悬置 |
| `PI-BOUNDED-SITE-1`（已清账 2026-08-09：走乙路——1R4 双向锁宣称订正为单向，实现 `203cb1c`＋返修 `7064dd8`，首轮 REJECT `0227947`（两枚注释残留、残留族按文本模式定义同族失守）、聚焦复验 PASS `b807b09`，no-ff 合入 `7e097c5`；架构同批裁定**不重开甲路、不放宽边界**——既有两条已验证单向关系覆盖行为约束，track_caller 型结果锁增益仅锚点定位不符复杂度预算，留痕 PI-HOST-CONCURRENCY-1.md §十；复验观察项①「任何清账表」措辞略宽，下次触碰时收窄） | 2026-08-05 ④实现随批上浮（dead_code 收窄照出）；坐标 `packages/pi-lane/specs/PI-HOST-CONCURRENCY-1.md` §七 | `BoundedInput::site` 零断言消费——`PI-HOST-LOOP-1R4` 回执宣称的 `(site, judgment)` 双向锁只存在于注释，宣称的源码锚点扫描并不存在。二选一并留痕：补真实断言（site 源码锚点扫描）使宣称成立，或把 1R4 宣称订正为单向。边界：只动测试与文档宣称，不改 `BoundedInput` 生产语义 | 无 | 否 | 宣称与实况一致：或新断言撤改复红，或订正后旧宣称零残留。既有 cargo 面零回归 |
| `SKIN-DYSTOPIA-1`（**已清账 2026-08-09**：实现链 `0140183→8fda8bd`（首红先行、九枚变异带命中校验）＋偏离九裁 `f5594c4`/`8dfbfda`，独立验收 PASS `724ca34`（拒因零、11 枚变异独立复注、两轮独占 PW 377/377、floor 366），no-ff 合入 `d96eb06`/`ffe50b7`。`PI-LANE-UI-1` 行三条后置条款其二已偿（深宗 tertiary 收口、器面阶补格）；磁青纸温精修＝批二，Q5 裁不排产带重启判据；WKWebView 深宗重摄移交 `PI-BASE-GUI-ACCEPT`。九裁与偏离九条见票 SPEC） | `PI-LANE-UI-1` 行三条后置条款（本票唯一提案锚）＋ `SKIN-B5` 贴阈例挂账（Q9 裁本票承接）＋ §12 辖面澄清（2026-08-09） | 深宗欠账清偿批一五项：C 首红先行（AA 门扩宗×面、floor 升档）→A 深宗 tertiary `#8b99b0` 四处同值→B 器面阶补格（登记性、像素 diff=0）→D 双宗 `zhu.fg` 轨位切分→E 贴阈例深宗 Δ 留证；三本签署账逐项授权见九裁 Q2；批二纸温精修不排产（Q5 重启判据在册） | 无 | 否（token/门/文案层，App 高水位不升） | SPEC 四节逐项：首红红数逐位相符、四处同值联动红、像素 diff=0、朱集合零变、Δ 分布留证、签署账三元组齐、显式单跑 site:guard；等价变异双侧同红 |

**同批登记（不立票，待架构裁）**：ADR-022:66-68/:621-622 冻结「journal 与 workspace 二者随 container 整删」，实现只删 `pi-loop/<containerId>`，`pi-workspaces/<containerId>` 无任何删除原语（`PI_WORKSPACES_DIR` 生产码零消费）——否证员以「`delete_container` 当期生产零可达」判非紧急，两说已收敛（2026-08-05 架构裁定）：取「显式登记的未兑现边界」——`delete_container` 当期生产零可达，workspace 删除面待 container 删除真实入产品面时随票补齐（ADR-022 修订记录同日条为正文现行读法，正文行号坐标不动）。另：12 回合为 session 级累计硬顶且触顶即 logical session 终态，而新 session workspace 初始为空、索引只认同 session journal ⇒ 正常用满即失去工作稿入口——已裁（2026-08-05，随 `PI-LANE-UI-1` 派单）：取 GUI 侧方案，同 container 历史 sessionId 持久保留并显式呈现「上一段工作稿（只读）」，经 `openWorkspaceMarkdown` 只读通道；不改「新 session workspace 初始为空」冻结语义，跨 session 晋升仍等垂类修订契约。

## 解耦相（ADR-015 · 2026-08-05 拍板）

加载粒度＝逐 matter 绑定＋全局可用集；`GENERIC-PACK-1` 与等 key 并行开工，`PI-BASE-GUI-ACCEPT` 可跑时其真机总验插队优先；动态装载显式后置（ADR-015 决定三）。

**清账登记（2026-08-07）**：`GENERIC-PACK-1` 已清账——实现 26 枚至 `cd58517`，首轮验收 REJECT `c9fdc5f`，返修后聚焦复验 PASS `79d78a6`，no-ff 合入 `9b5a321`；能力事实见当前基线，票面行保留作历史真值。`PACK-INTERACT-1` 与 `LEGAL-FIVE-FACES-1` 前置解除，即日可开工。⑥门（`assert-vertical-isolation.mjs`）内 work/output/system 三族债随清账转本图 `DEBT-VERTICAL-SPLIT-1` 行。同批消双真源：本图 2026-07 期同名 parked 两行（通用场景包票面与旧 `PACK-INTERACT-1` 票面）已加「由解耦相重定义」批注；通用场景包三场景范围未随本票交付，重排产另立 `GENERIC-SCENARIOS-1`（2026-08-07 架构拍板确认）。

**排产登记（2026-08-11 架构会话；产品负责人当日排产「work agent 全量功能」线）**：`ADR-023`（通用基线包与垂类绑定的并立）Accepted——availability 闭集扩员 `baseline`、恒在生效 registry 不占 `packBinding` 席位、执行授权语义收窄为垂类辖域、验收律与成品律合一。三票同批冻结票面：①`GENERIC-SCENARIOS-1`（通用基线包成立＋场景 `generic.draft` 起草→docx＋场景 `generic.batch` 多文件批处理；票面唯一真值 `apps/desktop/specs/GENERIC-SCENARIOS-1.md`，触 `App.tsx`＝是，依赖层已满足即可开工）；②`GENERIC-SCENARIOS-2`（md↔docx 工作稿轨往返，含 `remark-stringify` 直接依赖执行；**开工前置＝Word/WPS 真机核验会话**，未核验不排产）；③`PI-JOURNAL-TIGHTEN-1`（四项 [需架构拍板] 结转项裁定落地：`logicalPath` 值域收窄＋游标归一＋费用溢出 fold 面降级＋`budget_unknown` 文案同源；④裁丙＋带真 key 实测升级甲支前瞻条款；票面唯一真值 `packages/pi-lane/specs/PI-JOURNAL-TIGHTEN-1.md`，不触 `App.tsx`，与①异面可并行）。2026-07 期素材行（本表 `GENERIC-PACK-1` 行与工单边界表同名行）的排产效力由①②票面取代，Socmdia kit 字面全流水不作当期验收判据（S0/S3/S4 能力面不可达显式登记，语料新造中性件）。

**清账登记（2026-08-11 夜；提交归因 2026-08-13 订正）**：③`PI-JOURNAL-TIGHTEN-1` 已清账（实现 `5f1ab0f`／验收 PASS `cc25623`／no-ff 合入 `8b262ae`），四项 [需架构拍板] 结转项全数销号。①`GENERIC-SCENARIOS-1` 已清账：源码实现链 `4e5e08d→bea529e→e013dbd→f2816a8→a213fe9→7d67fab`，`65700cd` 是最终 SPEC/E2E 回执，验收 PASS `02b65bc`，no-ff 合入 `9eef484`；能力事实见当前基线。②`GENERIC-SCENARIOS-2` 维持不排产（前置＝Word/WPS 真机核验会话）。随本批转出的产出页签自动切换与 S3 预检双面过手即拆维持在册。2026-08-13 的 `WORK-AGENT-GUI-1` 另纠正旧卸载态 browser-only 工作稿伪真源，不改该票已交付的 generic scenes/artifact/handoff 事实。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `GENERIC-PACK-1`（已清账 2026-08-07，合入 `9b5a321`） | ADR-015 决定一/三/四（成品律、零泄漏、诚实降级）；ARCH-DEBT 笔一「过手即拆」 | 底面收口三件：①零泄漏静态门——壳与通用件零垂类 import（只经受信组合根注册点），立门以族；其前置组成＝Legal 余三 panel（timeline/graph/revision）迁 `kind:'component'` 全链（循 matrix 先例 `1b8c450`，view 扩形与拒载语义不变），`App.tsx` if 链清零；②卸载态成品——未加载垂类的 matter 全链可用（成品律：起手引导/空态/matter 生命周期/Draft 主面），已有垂类产物 matter 显式「加载 X 包」提示＋通用 preview 退化（ADR-015 决定四）；③matter 中立命名清点——通用件文案与标识符去 Legal 色、「案件」词表着色机制核实；matter↔包绑定契约落 schema（绑定 UI 属 `PACK-INTERACT-1`，勿做）。边界：不做加载按钮 UX、不动 wire/journal、不动场景线语义与 tokens；加载态 Legal 全链零回归。**2026-08-06 停手三裁（ADR-015 修订记录同日条为准）**：revision 面同迁授权（渲染外三消费者改经 projection/command port，语义零改）；scene-strip registry 派生＋预检表单契约冻结（ADR-016 同族）；默认绑定不翻（过渡默认见 ADR-015 决定三补记，评审用测试构造未绑定 matter）；44caee5 新增之 prompt 零垂类义务随测试构造路径同批完成。**2026-08-06 五项契约疑点架构追认（首轮验收上呈）**：①呈现次序（scenario 先、view 后）属壳呈现规则、非包契约，类内次序取 registry 冻结的声明序；②scene-strip 双类入口（场景启动／视图入口）语义各清、皆由包声明派生，「恒在」只谓不随运行态显隐；③demo 的垂类 id 映射（scenarioLaunch）住 demo 族 fixture，正是 demo 双向隔离的合法居所；④prompt 零垂类断言范围＝场景语义十枚，容器着色词（卷宗/案件）豁免——豁免词须显式枚举成清单、加词过清单，着色本体随 wire 改名债处置；⑤卸载退化视图过渡期结构性不可达属过渡默认直接推论，单测覆盖＋留痕即足，产品面 e2e 义务转挂 `PACK-INTERACT-1` | 无（2026-08-05 排序：与等 key 并行） | **是** | 零泄漏门红绿证（注入壳内垂类 import 即红）；三 panel 迁移逐枚 mutation 复红；卸载态整面评审全链截图（matter 创建→work→产物→回看）；中立命名清点表；加载态八相全量门零回归；撤判据复红 |
| `PACK-INTERACT-1`（已清账 2026-08-09：3R 实现 `2f89fd2`、独立验收 PASS `791063a`、全链 no-ff 合入 `c330ea7`＋合并整合修 `620b3eb`（与 `DEBT-VERTICAL-SPLIT-1` 的静默语义冲突：PACK 侧新增测试引用已迁模块，git 零文本冲突；三行 import 改指 `verticals/legal/`）；合并 tip 八相实测 build/lint 0、root 1941、desktop 820、cargo 250/1 忽略、site:guard PASS、PW 376/376 独占带锁、sidecar 零迁；验收观察项②在案：3R 票面第②项之清除实由架构基线 `5c70254` 完成，实现侧贡献为「未再引入」） | ADR-015 决定三（加载动作、准入 UX、2026-08-08 三则补裁）；PACK SPEC §十一 | A/B/C/D 已由独立验收成立，不得重做。3R 仅收：①历史 PM `catalog-only` keep 态尾注不得承诺结构化面/场景，说明须随「保持／不加载／Legal」当前选择诚实切换；②现行 SPEC/源码/测试清除过渡期旧代码标识符字面，历史 ACCEPTANCE 可保留。边界：零新概念，不动 ABI/持久 schema/execution seam/首帧/pi/wire/journal/依赖 | `GENERIC-PACK-1`（已清账）；继承 2R 独立 full 376/376 与 A/B/C/D mutation 证据 | 是（仅 MatterPackDialog 文案/测试；App 零改） | PM keep DOM + e2e ④：无场景承诺、有 catalog-only 诚实说明；Legal 选择态仍有 loadable 说明；不加载态只说资产不删除；恢复无条件尾注 mutation 必红；现行 SPEC/源码/测试旧标识符零命中；聚焦门与完整 Playwright 零回归 |
| `DEBT-VERTICAL-SPLIT-1`（已清账 2026-08-09：实现 `65a812e`→`9c98d29`，独立验收 PASS `210e93d`，no-ff 合入 `e0c0fbf`；受检面 176→205、债表清零；四项文档订正见票 SPEC「七」节，本行 ADR 引用按其第 3 项订正为决定一＋决定三） | GENERIC-PACK-1 ⑥门债表转出（2026-08-07 清账随批）；ADR-015 决定一（两层定义）／决定三（零泄漏静态门）；ARCH-DEBT「过手即拆」 | `src/work/`、`src/output/`、`src/system/` 三个混合族逐族拆分：Legal 绑定件迁 `src/verticals/legal/`（work＝legal-s3-binding／work-command／contract-review-flow／primary-contract／use-contract-review-submission／legal-work-surface；output＝compile-review-output／contract-review-delivery；system＝FileOpsPlanPanel／file-ops-demo），通用件留族内；`assert-vertical-isolation.mjs` 债表迁完删行、目录自动入受检面，空表即债清零。边界：只改居所与 import 路径，语义零改；可按族分批 | 无（与 `PACK-INTERACT-1` 异面可并行） | 否（至多 import 路径改写，不动壳逻辑） | 债表逐族删行后零泄漏门全绿、受检面自 174 单调扩大；掏空绑定族反向锁仍红（门形不放宽）；全量门零回归；撤迁移复红 |

## 2026-08-05 真机试用观察批（产品负责人随批立票）

真 key 真机试用合成卷宗（晨曦印务设备纠纷）首轮观察两枚。同批产品定容：**Legal 轻量包当期验收上限＝合成卷宗上五面（时间线/关系图谱/矩阵审阅/修订预览/起草画布）全链可演示——此即单人可维护边界**；细分实践颗粒度的扩深属 ADR-014 重度包与后续阶段，不入当期任何票面。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `CHAT-MD-TABLE-2`（已清账 2026-08-07，合入 `c0ab214`；定性经真实 journal 定形订正为三病因，整表律裁定与滚动账判例见 current.md 行与 workflow） | 2026-08-05 真机观察①；`CHAT-MD-TABLE-1`（`4014d73`）先例 | Chat 流态 markdown 表格**体未成表**（表头成表、体行以裸管道文本呈现，行内 code/加粗在场时复现；截图在案：合成卷宗任务 C 材料表）。先以 Turn journal 回放取真实消息文本定形，诊断属流态分块、空行分隔还是行内标记；修复循 CHAT-MD-TABLE-1 判据，不重写渲染器。边界：只动 chatflow markdown 面，不触 `App.tsx`、不动 journal | 无（与 `GENERIC-PACK-1` 异文件可并行，worktree 分树） | 否 | journal 回放复现该消息即红→修后成表；既有 md 表格用例零回归；撤修复复红 |
| `LEGAL-FIVE-FACES-1`（已清账 2026-08-07，合入 `4a182eb`；12 缺陷八修四不修零悬置，D10/D11 裁定与债票见 current.md 行） | 2026-08-05 真机观察②＋产品定容 | 五面在合成卷宗上的全链走查与收口：逐面从场景按钮真实调用到面内交互，登记全部「调用微妙处」为缺陷清单，逐条修复或显式登记不修理由（合同审查面已 OK，作对照基线）。定容硬边界：只收敛不扩面，不新增法律细分颗粒 | `GENERIC-PACK-1`（已清账，前置解除） | 是 | 五面各一条合成卷宗全链演示证据（截图链）；缺陷清单零悬置；撤任一修复复红 |
| `PI-SCAN-TIMEOUT-1`（已清账 2026-08-09：实现 `3fa39be`——保 2001 份规模（判据本体＝生产常量 `MAX_FILES_SCANNED=2000` 真被触发，缩规模等于删判据）加 60s 显式上界（load 峰值实测最长 30.1s ×2）；独立验收 PASS `1f01c79`——20 路包级并发对照 17/20 红 vs 20/20 绿且绿臂负载更高、上界余量 2.95×、sidecar 缓存预播经 SHA 三重校验不损独立性；no-ff 合入。**验收观察①：回执「glob 无同族问题」的经验宣称被证否（同负载 6/20 红），决定层面仍正确（票面只点名 grep），后继不得引用该句作已核结论**） |  PI-TEST-WAITER-1 聚焦复验观察；判例「否定断言没有正向派生信号」同族（正向侧赌时长） | `packages/pi-lane` `tools.test.ts:404`「grep 满 2000 份扫描」以真实扫描耗时对赌 vitest 5000ms 缺省超时（复验实测 load 121 下 5128ms 红）。改为显式超时上界或缩减扫描规模并留证；边界只动该测试 | 无 | 否 | 高负载下必绿实证；改动零回归 |
| `PI-SCAN-TIMEOUT-2`（已清账 2026-08-10：实现 `a548000`——超时族三枚 60s 上界＋第四枚独立归因非超时（`drive()` 900ms 裸 sleep 赌回合完成，负载下 shutdown 撞回合中触 `state_violation`，改等 terminal 信号）；独立验收 PASS `1ab8540`——归因以脱离 vitest 的确定性探针独立坐实（零等待下裸 sleep 红/条件等待绿）、三臂对照 armB 绿臂负载更高、5000ms 边界切割干净；注释数字订正随合入执行（列对调＋姊妹值 5/20）；**在案风险：SCAN-1 最重成员 60s 上界在 armA 被击穿 6/20（60003-60115ms），回执余量倍数（>100×/>30×/>16×）实测低一个量级（7.1×/7.1×/9.8×）后继不得引用**；no-ff 合入 `7e38d6b`） | PI-SCAN-TIMEOUT-1 验收实测；同族统一处置 | `packages/pi-lane` tools.test.ts 同族三枚在负载下命中缺省 5000ms：`glob 满 2000 份扫描`（6/20）、`grep/glob 满 200 条命中`（7/20、5/20）；另一枚 `同一枚 runtime factory + scripted provider…` 两臂皆红（20/20，与超时票无因果，须独立归因）。循一票判据本体分析逐枚处置（显式上界或其他不削判据形态）；边界只动测试 | `PI-SCAN-TIMEOUT-1`（已清账） | 否 | 逐枚负载对照红绿；两臂皆红枚独立归因结论；零回归 |
| `PI-TIMEOUT-SWEEP-1`（已清账 2026-08-10：首轮实现 `ff31296` REJECT `1c1c181`——枚举轴＝`MAX_*` 字面在场而非族定义本体，「语法标记不得反过来定义族」1R3 判例复现，三枚结构同型成员逃逸其一真红；返修 `2680d76` 换轴数值量级求解（具名常量解引用＋数字字面量＋一跳生产常量＋简单算术皆入轴，不可解 fail-closed 入候选、形状 B 不钉 helper 名），全包普查 30 候选/8 具名豁免/22 已上界/0 违例，M1 簇 11 枚逐枚结论；聚焦复验 PASS `825daba`——真实文件四注入含「运行时极小仍判族」证 fail-closed 真形、簇结论 8 枚亲核、普查独立重数吻合；no-ff 合入后两观察随批收口（行号绝对化＋守卫自身补上界）。120s 复裁经双方独立数据支持；CJK 命名 helper 逃逸正则在案备查（合规码内不可达） | SCAN-TIMEOUT-1/2 范式；判例「异步前置不赌时长」 | `packages/pi-lane` 包级同族普查：静态枚举「无显式 timeout 且判据本体为重计算或真 I/O」的用例，按 SCAN-1/2 范式成批处置并留机器形态守卫；同批复裁 SCAN-1 最重成员 60s 上界（armA 击穿在案）。**两条边界**：①票面自带负载形态定义（验收实测峰值 219-364 远高于典型 CI，无定义则红绿不可配对）；②`sidecar.test.ts` 是全仓唯一真发网络往返的测试（PI-LANE-SIDECAR-HANG-1 在案），其红须独立归因、不得与超时族合并处置。已知稳定重合红三枚：product-protocol raw cap（13/10/13×）、sidecar 绿证三（18/2/4×）、绿证一（14/3/0×） | 无 | 否 | 枚举清单与逐枚处置表；负载形态定义下红绿配对；sidecar 枚独立归因结论；零回归 |
| `PI-FETCH-TIMEOUT-1`（已清账 2026-08-10：实现 `34e3f12`——60s 超时＋3 次有界重试＋具名报错保 SHA 链，含实现自查修正 body 阶段保护缺口（首版只护 header，真下载 63s 裸 TimeoutError 复现后并入同一尝试预算）＋18 枚永久回归；独立验收 PASS `6a571ed`——三臂慢 body 对照（现形态 2.5s 具名红 connections=2／撤 signal 挂 12s／重建首版形态裸红零重试）决定性；验收后订正：回执「代理不生效」被证伪（undici 初始化期读 env），见 SPEC 订正节；回归用例门相位观察挂 `CI-TOPOLOGY-1`；no-ff 合入） | PI-SCAN-TIMEOUT-1 验收观察；静默降级零容忍 | `build-product-sidecar.mjs:315` 裸 `fetch` 无超时无重试——网络失速即静默无限挂起（验收环境实测两次各 14/16 分钟）。加显式超时＋有界重试＋失败具名报错；SHA 校验链不变 | 无 | 否 | 注入失速环境（代理黑洞/拒绝）具名快红；正常路径零回归；撤判据复红 |
| `LEGAL-ANCHOR-BINDING-1`（已清账 2026-08-09：实现 `18cf713`＋架构三裁 `24e5e11`，独立验收 PASS `f78921d`（拒因零、六变异复注、root 1986/desktop 824/PW 380 独占、cargo 补跑零回归），no-ff 合入 `95d44ac`；验收须处理项三条随批立行见下） | LEGAL-FIVE-FACES-1 D10 架构裁定（2026-08-07）；核心不变量二「模型出引语，系统出坐标」 | Timeline/PartyGraph/ReviewMatrix 三 schema 补 `draftSchemaId`＋`citationBinding`（quote→system anchor 路径，循 S3/RiskList 与 `LEGAL-S3-BINDING-1` 先例），模型自产 `sourceAnchors` 退出最终 schema；「回到原件」由显式 disabled 转真实回跳。过渡期边界（已生效）：S1/S2 production 可启动维持，产物面模型 anchor 不得以系统已核语义呈现。边界：包契约与绑定层，不动 wire/journal 闭集外语义 | 无 | 视接线面定 | 三面锚点回跳全链（fileId 同案重验＋textRange 高亮，循 CONTRACT-TRACE-1 判据）；漂移/伪锚 fail-closed 反例触红；S1/S2 真模型结构性失败风险的评测证据随票登记；撤判据复红 |
| `LEGAL-ANCHOR-BINDING-2`（已清账 2026-08-10：实现 `106ca82`＋架构裁定 `2b7ff75`（output 阻断门当期不落地带前瞻条款——S4 接线票须同批立 `UnresolvedCoverageError` 同形门），独立验收 PASS `b7ae224`——自造 rehydration 缝反例拒载红、自设 M6 坐实判别联合扩面为结构性前置、root 2159 逐文件对账、cargo 补跑零回归、PW 384 独占；验收后三条闭集宣称订正落生产注释与 SPEC 正文；no-ff 合入。S4 仍 `launch.kind===view` 产品面零真实流量、真 key S4 回合 external-validated blocked） | LEGAL-ANCHOR-BINDING-1 架构裁定一；不变量二同族 | S4 `legal.RevisionInstructionSet` 草稿形改造（模型自报坐标退出）与 `registry/admission.ts` 守卫上收（`rehydrationProjection` 路径结构性照不到引用闭环）**同批**；族门 `OPEN_ANCHOR_DEBT` 随之销记。边界循一票先例 | `LEGAL-ANCHOR-BINDING-1`（已清账） | 视接线面定 | S4 闭环反例触红；admission 上收后 rehydration 族拒载反例；OPEN_ANCHOR_DEBT 清零；撤判据复红 |
| `DEMO-ANCHOR-2`（已清账 2026-08-09：实现 `94cb3a0`——语料现读判定 137 枚全可锚故全走甲（32 枚引语改写为逐字真原句、evt-04/44/09 三处引语窄于描述的退让登记）、demo 侧诚实降级文案、「锚点整段落在单行单强调片段内」新判据；独立验收 PASS `8237750`——137 枚全量独立复算、六变异复注含绕过简单断言的构造变异、cargo 补跑零回归；no-ff 合入 `cc9d28c`；随批 floor 366→384 补档（验收观察③裁定，384/384 门证）。语料级债在案：evt-04/13/22 共用 4 字节标签锚且所在文书日期与三条无一相合——base 既有形态、本票净改善，后续语料触碰时处置） | LEGAL-ANCHOR-BINDING-1 验收观察；`DEMO-ANCHOR-1` 先例 | 样板案 timeline/party-graph 锚点零 `textLayerVersion` 且 fileId 不在 demo 路由内，三面「回到原件」接通后必落 `anchor_invalid`，且文案「请重新运行产出它的场景」在 demo 路径不实指路。循 DEMO-ANCHOR-1 把样板锚点真实化或改显式展品降级文案 | `LEGAL-ANCHOR-BINDING-1`（已清账） | 否 | demo 三面回跳可达或诚实降级文案；双向隔离不破；撤判据复红 |

## 需要实测，不再泛化调研

| 议题 | 下一份有效证据 |
|---|---|
| DeepSeek 新 API 面：response-format＋server-side `web_search`（产品定调 2026-08-05：成本与 agent 能力使其为全场景首选） | 2026-08-06 调研已一手核实结构性前提（去处按归档索引 `research-loop-continuation-2026-08-06.md` 条目）：pinned pi-ai 0.82.1 零 `response_format`、DeepSeek strict 须 `/beta` 而 pi-ai provider 固定非 beta、`web_search` 只在 Responses API（限 `deepseek-v4-flash`）——三者皆非现行路径可达。下一份有效证据＝pi-ai 上游支持登陆（盯 changelog）或具名 adapter 议案（先 ADR，禁第二 transport 暗造）＋届时带 key 实测（exact 参数/限制/计费）；具名 quirk 只入 `packages/provider`，不开放任意 URL |
| Work store | whole-envelope benchmark、CAS 延迟/写放大、kill/crash 与恢复实验 |
| macOS 文件授权 | 完整签名/升级/移动/撤权/TCC 重授权真机矩阵已后置到正式签名发布阶段；`HOST-AUTH-LITE` 只要求失败态可见的最小证据 |
| docx 兼容 | 精确版本的 Word/WPS 打开—轻改—保存—回读及 OOXML part/rel diff |
| DeepSeek usage | 含 cache hit/miss、reasoning 与字段缺失的原始响应 fixture；同批核实前缀缓存是否需显式 breakpoint（Manus 手法，harness-landscape 调研 2026-07-17） |
| 法律扫描件 | 经授权且脱敏的真实锚点；许可、用途与不入仓证据齐备 |

继续收集通用文章不能替代这些实验。若外部环境或合法样本尚不可得，工单应明确阻塞，不得用合成材料宣称 external-validated。

## Effect 与授权

存在 confirmation gate 不代表 gate 之前的 side effect 获得授权。每一笔 `external_send`、`file_write` 或改变权限的 effect 都必须在执行前取得与该 effect、scope、actor 和输入快照对应的授权，并把授权决定持久化在 effect 之前。事后弹窗、场景终局确认或笼统的 session always-allow 都不能追认已经发生的动作。

## 明确拒绝

- 在未有实测阈值前把 v1 whole-envelope CAS 改成 snapshot + tail，或自行手写 WAL；
- 借 Work store 工单偷渡 scheduled invocation、多写者、跨案图谱或远程 backend；
- 让非 demo case 回退 recording、demo material、demo party adapter 或 demo docx 原文；
- 把 runtime guard 按 start/resume leg 重置，或把超限留成裸 Promise rejection；
- 先执行 effect，再用后置 gate、日志或人工确认追认；
- 因 executor 对 trigger 不敏感就宣称支持 scheduled、webhook 或通道调用；
- 为第二宿主复制 App 业务编排、Legal 路由或 core 状态机；
- 引入 handoff 文件、链式引用或 staleness 检测状态机，或让模型自由散文（教训总结、options-considered 自证）直接写入续行投影——续行只认系统编译，模型提案唯一通道是 ask_user→RevisionEvent。

## 后续 ADR 队列

以下问题只有真实需求进入对应阶段时才立 ADR；本轮不预造 ADR-013：

1. authenticated principal、组织身份与 trigger context；
2. gateway 的可序列化 command/event wire、effect authorization 与跨进程恢复；
3. shared state、多写者、ACL、伦理墙与跨案治理容器。

scheduled invocation 必须等待第 1–2 项明确身份、触发来源、预算和执行前授权；当前 trigger-blind executor 不能作为支持证据。

**负面判例登记（OPENWORKER-SURVEY-1，2026-07-24）**：OpenWorker 排程自动化的 `_scheduled_approver`（`manager.py:2320-2350`，commit `4766e59`）对四个本地写盘工具无条件 auto-approve，首次运行即成立、无需既往授权，且因写盘工具无 `target_arg` 而不出现在自动化的同意卡片上——其 README「unattended 只入箱不自行动作」对写盘路径为假。此例作第 1–2 项 ADR 立项时的负面对照：无人值守若不把 effect 授权做成**执行前持久、且在同意面可见**，「无人值守不升自主权」会退化为「某类风险从未被放上台面」的静默旁路。与本图「Effect 与授权」节及不变量 3（授权持久先于 effect）同轴——scheduled invocation 立项须以此为最低门槛，trigger-blind 自动批准不得作为支持证据。

**memory 演进 ADR 议题池（2026-07-26 消费 pass 登记；2026-08-03 增）**：OWASP Memory Guard 四态素材挂此议题，scheduled／多写者阶段启用；ADR-013 当期形态冻结不动。loopx 记忆写入网关谱系（五动作人工复核、edit/retire 强制理由回执）与陈旧化显式十态同挂（归档索引 `research-loopx-matter-memory-2026-08-03.md`）；其 quota 确定性状态机另登记为 scheduled invocation ADR 的 trigger context 正面参照，与上段 OPENWORKER 负判例成对。
