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

- **笔一（`PANEL-BLUEPRINT-1`）——重构票入队，排位上提**：底座与契约口径确认后，「垂类以硬编码组件进壳」是该口径在仓内的最大存量违例。D1「不提前大爆炸重构、分批交付」不变，但首枚 `matrix` 插入 App 队列 `DEBT-DOSSIER-1` 之后、`C3-1` 之前；其余三 panel 按「过手即拆」随后续触碰分批。**首枚已偿（2026-07-27）**：matrix 迁 `kind:'component'` 全链（实现 `f3d2bf3`、验收一驳回一聚焦复验放行 `b521b34`、no-ff 合入 `1b8c450`；view 扩形与拒载入 ADR-006 修订记录；`revision` 默认落点顺带收口为显式拒绝；高水位 2551→2549）。其余三 panel 仍在 if 链，按「过手即拆」随触碰分批，本笔保持开账。
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

**皮层迁移批次账（2026-07-19 立，随批滚动）**：`SKIN-B1`（色阶批）交付链 `8bb305d→0319aa6→f3eeab7→d432e6d`，独立验收一驳回一复验后合入。**B2（字体批）票面**：①排印光学——仿宋视觉字距+中文标点悬挂（奖级工艺 #1，裁定已批、docs 零落地的挂账落位）；②tertiary 元信息可读性闭合——实测 131 消费点字号 10–13px/字重 ≤510，三面对比 4.23/3.98/3.84:1 均低于 AA 正文 4.5:1（B1 如实标注之既存缺口，未回退未闭合）；闭合杠杆=字号/字重升档或值面复审，以 4.5:1 为的，色值单独加深伤中性阶层级非首选；③字体 C-1 非商用轨显式声明（迁移 Plan 裁决既有）；④编排方向随字体策略二次修订（2026-07-19）：标题通行宋体/正文仿宋轨，壳侧落地须与 tertiary AA 闭合**联测**（仿宋实际度量下重测三面对比与字号补偿，不得沿黑体度量宣称）、并过 C-1 发行门口径。**B2 拆批（2026-07-19，排印凡例立）**：事实源=`docs/design/typography-density.md` 排印凡例；B2-0 定值批（争点拍板后开工：字栈/字号槽 token、槽位表值、四道排印机器门、AA 四元联测、许可快照）→ B2-1 置换批（消费面置换+排印光学）；凡例争点一二已拍板（功能轨甲·系统栈续任；文书轨先朱雀仿宋落地、聚珍新仿三许可并行核后 token 层置换），争点三即 B2-0 工作内容——**B2-0 放行**。**B3（线级批）票面**：文武线/乌丝细线 token 已由 B0 定值，消费面置换随本批；奖级工艺 #2 文武线破格同批；**反面警示（原型盘点 2026-07-19）**：原型「乌丝栏」为引语卡框廓装饰件，与层级线同名实异，不得借形。**B4（记号批）票面**：五记号 SVG 落地——鱼尾几何自原型直取、圈点借形改色（琥珀让位语义宣告）、**朱印纯几何无字**（UI 尺寸印文即墨污；hero 级印文变体另案）；朱印落定章接线＝`line.settled` 唯一消费面（前向守卫既装，接线必携落定数据）；奖级工艺 #3 朱印签名交互同批；**新语义两件（盘点采纳 2026-07-19）**：时间轴节点形状=执行者、图谱边样式=事实等级（ADR-003 视觉投影），各带数据绑定前向守卫（无数据之形即违例），边样式先探 G6 canvas 可行性。盘点全文 `docs/design/prototype-audit-2026-07-19.md`（事件件，B4 清账随批归档）；版式两项（卷宗容器为组织单元/产出先入卷再确认）移交容器化 ADR 议题素材，不入 B 批。**B5（深色批）票面：已销号**（R-4 准，`ARCH-SCOPE-2026-07-20` §1.2 B 组复核）——三项票面内容已由 `SKIN-R2 P4` 实质吸收：`themes.dark` 已上身（单个 `:root[data-theme='dark']` 块纯 token 换值、零组件分支，边界门另锁「组件级 `[data-theme]` selector／`prefers-color-scheme`／暗宗根内几何声明」三类，四类真 mutation 红证在 desktop ACCEPTANCE）；深宗四槽已由独立验收在真 Tauri WKWebView 另摄复核（不复用实现截图，产物在 `site/craft-evidence/SKIN-R2-P4/acceptance-*/`）；`.titlebar` 顺带删已完成并有 mutation 红证。**唯一余量挂账**：settings-optin 贴阈例的深宗复测注记未落——残留门阈值放宽至 3 与校准注记、超阈断言、舍入带成片计数上限均已实现，但该例在深宗底下实测 Δ 为多少、离阈还有多远未留证，`apps/desktop/tests/e2e/ui-residue.spec.ts` 该例前置注释仍是待办态。**该挂账项由下一张皮层相邻票顺带执行**（票丙「标题轨整备」为当前最近载体），不单独立票。

**前端线先行（2026-07-19 产品拍板改序）**：B3 线级批 → B4 记号批（壳侧）与 `SITE-CRAFT-2` 磁青宗批（Pages 新设计语言落账 + 前卫实验田部署）先行开工，两线并行（壳/站文件面不相交，deslop-scan-lib 共享面由站批独占）；案头序（ARCH-DEBT/调研消费 pass/OSS-SUBTRACT-1/三 ADR）随后。**对齐计划⑤的门不因改序豁免**：壳侧 R2 巧思回迁与 harness 真实化仍待⑤放行——站面先行、成熟后经 R2 门回迁，正是激进技法的唯一合规通道。**SVG 记号解耦预留（随两线同装）**：SchemaParts 件库为站/稿/壳共用单源，原生 SVG、按 token 名消费不带值；C-4 双主题渲染一致为记号系的主题级断言（宗由 theme 承载，记号不择纸温）——此三条即「回迁 R2 时零重绘」的机器可验形态。

以上七项在对齐计划执行序⑤之后排队；bash/统一协议/容器化三项 ADR 先行，不得实现先于契约。

## 工单边界与退出证据

Round 3 起每张工单附带**复杂度审视义务**（根 CLAUDE.md 复杂度节制条）：实现会话在 SPEC 留痕「本单新增了什么概念、为何非加不可」；并对触碰范围内既有代码做一次复杂度扫描，发现可删的偶然复杂度（死配置、无消费导出、多余抽象）列入该层 SPEC 提案区交架构拍板，不越权顺手删。数单之后全仓即完成一轮复杂度过筛。

### 当前版本收束线：Legal 合同审查单品（目标 `v0.2.0`）

2026-07-24 架构拍板：下一枚版本不是通用平台扩围，也不是只换皮清账，而是一枚仍处
**Stage 0** 的 Legal 合同审查单品里程碑。用户承诺收窄为：

> 把一份明确选定的 Word 主合同与支持材料放入案件，逐条审阅可回到原文的风险，亲自确认、驳回
> 或修正结论；若至少确认一项风险且没有待索证项，得到以原 DOCX bytes 为底稿、未触 parts 内容
> 不变且受触 parts 保留既有结构语义的合同审查批注稿；零风险、存在任一待索证项或全部驳回时
> 诚实完成但不伪造空文书；
> 并能在重启/切案后查看或继续同一账本。

它**不宣称 Stage 0 已退出**：Word/WPS 精确版本打开—轻改—保存—回读、持续真实试点的采纳/
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
`SAFETY → OUTPUT → TRACE`，不得并行改同一 App/compile path。发布候选须明确区分
“自动化/本机成立”与上述外部证据，不以版本号抬高成熟度。

**`v0.2.0` 发行许可链（2026-07-24，ADR-020）**：产品 App 队列之外另有一条不触
`App.tsx` 的发行前置链：

```text
SAFETY → OUTPUT → TRACE → DOSSIER → VERSION-PREP ─┐
RELEASE-FONT-LICENSE-1 ───────────────────────────┴→ SOFTWARE-AUDIT → SOFTWARE-NOTICES
                                                                         │
                                                                         ▼
                                                                    SMOKE-TRUTH
                                                                         │
                                                                         └──► 全量门 / 唯一候选 DMG / 独立候选验收
```

字段、文件白名单与 mutation 只认 [`release/SPEC.md`](../../release/SPEC.md)。FONT 可与产品链
并行；VERSION-PREP 等产品链，AUDIT 同时等 FONT 与 VERSION 后再冻结最终图与逐件许可裁定，
NOTICES 只读消费 AUDIT，SMOKE 最后收同一性/直接启动。字体 notice 不等于软件 notices；两账、
图审计与候选直接启动任一未放行，`v0.2.0` 均不可公开。

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
| `PM-SCHEMA-1` | 令 OOC score 与确定性计算同义，并版本化 payload/schema/migration；**顺带（2026-07-18 登记）**：凡例 OOC/Estimate 显式件（score=null 出格态/点值/区间三态）设计缺口随本单一并拍板 | OOC、drift、旧版本迁移与 catalog-only 边界触红；不夹带 PM scenario |
| `SITE-CRAFT-2` | Pages 视效升级（对标 trae.ai 级门面，避免被归入普通 repo）。架构定向：不拼通用工艺（渐变/3D 与克制纪律相悖且拼不过预算），高级感由**产品本体的 schema 可视化承担**——hero 升级为活的 schema 工作面微演示（锚点跳转/逐条确认/修订对照的录制回放或轻交互重建，feldar 台账的活化版）；新增动效逐个走 site-evidence-line 例外条款 + AST 锁扩展 + 逐帧采样。供料：Sol 视觉扫 trae.ai 一类站点（computer use）+ Codex image 穷举存货。**范围扩展（2026-07-17 拍板）**：site/ 为个人非商业 Pages，许可口径放宽——归档调研批次的参考技法、小巧思、素材包（vault 余量、emil、feldar、namethatui 等）与**中文陌生化字体**均可经本单升格使用——**字体策略修订（2026-07-18 夜；2026-07-19 二次修订·产品拍板）**：字体编排定位反转——**标题取通行宋体**（成熟、全字重衬线，首选思源宋体类 OFL 大字重轨；「标题用考究的通行衬线」路线，权威感由成熟字形承担；刻本类字形【齐伋体/汇文明朝体/京华老宋体】降为前卫实验田探索项，不入主轨）；**正文取仿宋陌生化轨**——首选方正聚珍新仿（商业字库：个人非商业授权与 web 嵌入授权**分别**核实留快照，任一未核清即以朱雀仿宋 SIL OFL 为落地值，不悬置不静默替换）；**显式拒苹方/系统黑体做正文**（昔日品味符号、今日 slop 分布中心——陌生化正文即 kill-slop 的字体面）；编排义务四条随裁定：仿宋正文字号/行高补偿（仿宋视觉偏小偏窄，AA 联测以实际度量为准）、标题至少双字重梯度、拉丁与数字配衬字显式指定（仿宋拉丁字形弱，不得裸回退）、中文 webfont 子集化+font-display 显式声明；每项字体/素材落 `site/craft-evidence/` 留许可来源快照。**冷色起疑对治五杠杆（2026-07-18 追加定向）**：①阶的作者性——色相收窄、藏青阶做深（暗部层次+纸感+Inset 材质响应），拒绝均匀平铺；②语义色稀缺性**宣告**——红/琥珀仅风险、绿仅落定，站面一行小注明示「色彩仅承载语义」（被宣告的克制才是作者性）；③文书文化抽象引用——卷宗编号体例/骑缝式分隔/印记式落定章；**左侧彩色竖条退役候选（2026-07-18 夜）**：通用色条换文书系记号——鱼尾（节标）、乌丝栏细界行（结构分隔，无彩）、侧点圈点（强调）、朱色专属裁决落定（朱批/朱印语义，彩色只在人做决定处出现），站面先行验证后经 R2 门评估回迁（**抽象引用，法槌天平类具象 kitsch 一律拒**）。**边框语汇裁定（2026-07-19）**：掐边花纹（回纹/云纹/缠枝类）拒——纯装饰且与数据区静止相冲；「边框感」一律走刻本框廓的结构性语汇：**文武线**（粗细双线）与四周双边，几何抽象零具象，站面前卫端先行、产品壳经克制审计再议。**线级语法（2026-07-19 扩展）**：全面替换「均一 1px 单线」的 AI 工具脸——线重即层级语义：主界=文武线（粗细双线错落），次界=乌丝细线，层级不同线重不同（与色阶「阶的作者性」同构，线的粗细携结构信息非装饰）；落 token 化（--rule-major/--rule-minor 类），皮层迁移的版式置换项之一。常见 AI 衬线同理由刻本/仿宋双轨替换（字体策略既有）。**冷暖调和裁定（2026-07-18 夜）**：陌生化统一溯源**版本目录之学**（市面罕见），冷色适配走**磁青纸宗**——写经传统的深靛蓝纸即冷色古典脉，藏青底天然承接；鱼尾/界行/圈点为墨系记号不择纸温；暖色纸感（米黄+衬线=slop 分布中心）明确拒绝；色彩语法四位：磁青为底、墨为记、朱仅裁决、泥金候选 hero 唯一强调（均核实色值入 token 流程）；④秩序件当主角（hero 微演示既有定向）；⑤克制的机器门叙事——「设计克制是 CI 强制的」一句话连 craft-evidence，把克制从美学主张升格为工程事实。**前卫实验田条款（2026-07-18 夜追加）**：site 定位为前端先锋技法实验田——比产品壳更前卫的版式/交互先上站验证，成熟后经 R2 门回迁（Design 四面已证「从现行语言自然生长+版式可穷举」，站面负责探边界）；SchemaParts 件库以**原生 SVG** 绘制（与 Design 稿约定一致），站/稿共用；调研站点全集（vault/emil/feldar/trae/namethatui/geist/oss-gui 等归档批次）全量供料按需取形。**品牌一致性挂账（2026-07-19，B1 分治裁定③）**：B1 已将壳侧权威源稿 `docs/design/icon-light/dark.svg` 随锚迁 217° 换值，`site/assets/icon.svg` 仍持迁移前旧板——品牌两侧暂不一致，随本单磁青宗批一并置换并做品牌一致性核；site 侧色板现由 `deslop-scan-lib.mjs` 的 `siteFrozenColors` 按值冻结（带到期指针，届时整体删除、回绑 token 名）。**硬边界：仅 site/，产品壳字体与素材不随动**（商用授权另案拍板），归档升格以本单票面为准、site 源码仍不得直接引用 archive/ 路径 | 微演示可视对照与逐帧证据；例外条款留痕；site:guard 全绿；数据区绝对静止不破；字体/素材许可快照齐备，产品壳零渗入（静态门可验） |
| `FILE-PREVIEW-1` | **实现已在 `main`，不得重复施工；范围验收已过，固定门仍驳回。** 顺带条款（2026-07-17 拍板）：执行 READER-ISOLATION-1 SPEC 提案区已批准的 rails-compact 四步退役（删 App 派生与 class → 删 CSS → `assert-layout-converge.mjs` 存在锁转「零出现」反向锁 → `data-compact` 消费点转 `right-narrow`）；主体范围如下。md 文档 preview 入口落 working folders：点击文件直接进入只读预览（frontier 同型交互），内容经 reading-view 派生（复用既有 convertToReadingView，原件只读不变）；先 md/txt，docx/文本层 PDF 视 reading-view 既有覆盖顺带 | 报告 `79ddd16`：功能/架构与 327/327 通过，但目标 `b0f667b` 的站点脚本 lint 红，故不清账。外部 lint 修复成为 `main` 祖先后，由新会话在 clean worktree 复跑全仓 lint、FILE 定向与必要回归并写放行报告 |
| `EXPLORE-RAIL-1` | 右栏新模块 Explore（与 Preview 并列，**不是浏览器**）：从既有 Turn journal 助手回复正文抽取显式 `http(s)` 链接（跳过代码块/provider 地址/用户粘贴内容），展示域名/原始 URL/出现 turn 时间，提供复制、回看该回复与**经受控宿主 openExternal 打开系统浏览器**（2026-07-17 产品定调修订：开链接是既定路线；应用内仍零 `<a>` 直渲、零 `window.open`、零网页加载/DOM/截图/摘要回流，「不是浏览器」边界不变）；零新 core/harness/provider/material 接口（纯 transcript 派生只读索引）。措辞纪律：「agent 提及的链接」，不得表述为已建立连接；不复用 Preview 的 artifact tab 语义；rail 顺序 Progress→Preview→Explore→…；UI 标签过 voice 词表（Explore 为工程名，产品文案中文定名随 voice 规范） | 抽取规则反例（代码块/provider 地址/粘贴内容不入索引）触红；零网络请求（静态门锁 fetch/window.open/href）；回看跳转正确；残留门约束适用 |
| `PREVIEW-TAB-1` | ADR-014 决定一/二：tab 集合按会话 artifact 动态生成（tab=一张 schema 表）、多 artifact 并列、`containerPackBinding` 数组席位（恒 1）；与 Legal panel 迁移解耦，共存语义按 ADR-014 | 多 artifact 动态开 tab、切换不销毁状态（残留门约束）、单 artifact 回退、混包命名空间隔离反例触红 |
| `PANEL-BLUEPRINT-1` | ADR-012 迁移债：Legal 四个 route panel（timeline/graph/matrix/revision）逐个迁为版本化 component blueprint，保留历史 snapshot 回放与 compatibility alias；可分批 | 每迁一个：descriptor→projection 全链、drift/fail-closed 反例、视觉对照记录；App.tsx 对应硬编码分支删除 |
| `UI-RESIDUE-1` | 可逆交互零残留闭合门（架构裁定 2026-07-16：三分区状态矩阵并入本单，同证一个性质；允许单内分批交付，每批独立验收）。批一：`expectNoOverlayResidue()` helper（动画归零/无孤儿 portal/focus 归还/无残留 aria-hidden·inert）+ 全 app 疊层清单纠偏（消费 UI-SURFACE-1-FIX 修正后清单）+ 开合闭合（开→关后像素+DOM+焦点+滚动与基线等价）。批二：三分区状态代数（leftCollapsed/narrowRailRequired/rightCollapsed/focusMode/viewSegment/isWelcome/comparing/右栏双态的合法边与禁止边矩阵）+ 竞态（快速反向/Escape during enter/resize during close/切案切模式无旧区残留）+ 关键交互首帧·中间帧·终帧·反向帧采样。像素基线仅 Chromium 闭环，WKWebView 由 DOM 层兜底。目标措辞：**已枚举状态图内无已知残留/焦点丢失/状态串线/不可逆跳变**（非绝对零 bug 宣称） | 至少一个现存残留缺陷先红测坐实；门禁自身接受 mutation（故意不清 portal/不还 focus/不停动画必须红）；resize 自动收栏不污染用户手动态、focus mode 退出恢复三区、左右同折按原序恢复等矩阵边逐一有测 |
| `GENERIC-PACK-1` | 下一版候选（通用底座补齐线首单，roadmap Stage 1 节 + archive/research-2026-07-15-round-3/generic-base-inventory.md）：通用场景包首批三场景——通用起草→docx（复用 output 流水线，中性 descriptor）/ md↔docx 可编辑往返（自研 OOXML 路径补齐，**pandoc GPL 已拒**）/ 多文件批处理（descriptor 层 fan-out，系统编排非模型自主）。定调：**通用底座即第一个包**——同一插槽/同一 admitPackages 准入/同一凡例表，零绕过 schema 契约的后门；验收律=「只装通用包时产品是合格 work agent」。零新 core 机制预期。**验收用例正式登记（2026-07-26 产品指定）**：Socmdia Slop kit（S0–S5 流水、`scripts/pipeline.py` 断点续行、inbox/outbox 门禁）为通用 work agent 验收用例；其甲路径（S0–S5 编为声明式场景）不受 ADR-017 修订影响可先行——受控脚本执行是补全不是前置 | 三场景过既有准入门与凡例表渲染；卸垂类包冒烟（仅通用包）e2e；批处理逐项报告与失败显式；xlsx/pptx/定时/通道均不夹带 |
| `PACK-INTERACT-1` | 下一版候选（包装载真实交互一级，2026-07-18 拍板；与 GENERIC-PACK-1 配对）：①Settings 包管理面——随发行版内置包的启用/停用（状态持久沿版本化单键先例）；②建案时选包——case 级垂类绑定从组合根写死改为建案交互供给（S3 绑定语义不变，绑定来源改用户选择）；③插槽显式空态——未启用垂类包时 Work 面诚实显示「未安装垂类包·通用能力可用」，零伪装零降级。**边界**：包仍随应用发行、构建期 admitPackages 准入不变——本单零动态装载；外部包文件导入（zip→运行时准入→签名/供应链）属二级，ADR-015「包的装载与生命周期」议题入池、需求到来才立 | 启用/停用→Work 面能力集与 tab 集随包切换 e2e；建案选包→绑定正确且跨包命名空间隔离；空态显式（voice 门）；停用不丢已有案件账本 |
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
放行前没有新的 App 票在途。放行后首票为 `PI-LANE-UI-1`；`PI-BASE-GUI-ACCEPT` 独立放行前，
不并行启动 Dossier、context profile、垂类修订、plan/source 或 UI 巧思。基础 GUI 放行后才开
`CONTEXT-PROFILE-1 → DOSSIER-FLOW-1`，并回到 `C3-1 → C3-2 → C3-3`
（PANEL 余下三枚按「过手即拆」随触碰分批，不再单独占位）。MODEL-1R 与 FILE 已由 current-main 治理清账，不再占 App 锁，也不授权
重复修改。v0.2.0 单品真实性门三票（SAFETY/OUTPUT/TRACE）已全数闭合。
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
| `DEMO-ANCHOR-1` | TRACE 验收派单件裁定四（2026-07-27） | 便利小票：`packages/demo-data` `risk-list.json` 锚点补真实 `textRange` 与 `textLayerVersion`（现恒 `{start:0,end:N}` 且无版本，样板案「回到原件」必落显式 `anchor_invalid`——该显式反馈是判定优先级的正确输出，不是缺陷）；只改 demo-data 及其 golden 重烤，不触 desktop 判定与 production 路径 | `CONTRACT-TRACE-1`（已清账） | 否 | 样板案回跳命中真实坐标高亮；demo golden 重烤留痕；`anchor_invalid` 反例 fixture 仍保留于测试，不因数据修复丢失判别力 |
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
| `DOSSIER-FLOW-1` | ADR-009 Dossier 补充 + ADR-021（Accepted，2026-07-28） | 卷宗工作语义层首票：`app_data/dossier-semantics/<container>.json` 的 container-scoped `DossierStatePort`（逻辑 notebook、attempts、只含 terminal 的 `PersistedTurn[]`、events 同一信封）+ 唯一 compiler；ScenarioExecutorDeps 每 provider 请求 async resolve 后进六段第五段，普通 generic Chat 排除；pi adapter 同票显式迁 transient wire v1→v2，以 typed `dossierContext` 进入单 system prompt，禁止偷塞 user text。蒸馏只经既有 TurnRunnerPort，terminal CAS 先于 schema/语义 CAS。触发只含 descriptor 首读、容量水位 ask-user、用户显式；`pi-observational-memory` 只借 ledger/cut/fold，不直接依赖。首票不解锁后台/每 N turn、自动 rebase、跨容器 recall、全局 memory 或物理工作稿晋升 | `PI-BASE-GUI-ACCEPT` + `CONTEXT-PROFILE-1`（A4 产品排程门） | **否** | 四类 crash 点逐一红绿；terminal 已耐久可续 commit、attempt 无 terminal 才新身份；同 operationId 至多一笔 committed、用户编辑不被旧模型覆盖；Scenario 无 resolver 与普通 Chat golden byte-identical；Scenario/pi 两 adapter 消费同 envelope digest；v2 混跑、context hash/container 错配、text+context raw>131072/packet>1MiB、缺 profile/required source 超限/估计未知均 provider=0；跨 container/global-memory/secret 输入全红 |
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
| `PI-WRITE-PROOF-1` | ADR-004/017/018 窄修订 + ADR-022 决定六 | **可与下两票并行**。只新增 `packages/pi-lane/src/workspace-write-env.ts` 与定向测试，并只写专属 `specs/PI-WRITE-PROOF-1.md` 回执：直接实例化上游 `createWriteTool()`；极薄 binder 保留 metadata/schema 引用，以 raw toolCallId 查取预种 public tc、创建 invocation-scoped env，直到 `writeFile` 真发 port 才分配 op 后 delegate。注入 port 证明 nested `.md` create、existing overwrite 与精确回读；产品 workspace write 最终 basename 只收扩展名前至少一个字符、ASCII 大小写不敏感的 `.md`（恰为 `.md` 必拒）。不得改父级 SPEC、product tool table/session/policy、wire、Rust/Tauri、package/lock 或 GUI | `PI-LANE-1`（已清账） | 否 | characterization 锁上游 open schema/coercion、exact raw gate、调用序列与单次 port、Unicode `4 code units ≠ 10 UTF-8 bytes`、pre/post-write abort、同 env queue vs per-call env 无共享；缺 tc mapping、非 `.md`、全部路径/容量反例均 port 零调用且零 op；binder/Agent sequential 双锁；两真实 port 调用 operation 不串；生产源码零 Node fs 写；明确只到 package/headless proof |
| `PI-CODE-STDIO-1` | ADR-022 六-B.1/B.2 | 实现 `79a13d2`、回执 `223185e`，独立验收曾作最小修复 `0ffae46`，但 6 枚新反例坐实 3 blockers + 2 majors，报告 `cfb4715` 明确 **REJECT**；不得合入或作为 Host 前置完成态。原范围与 OSS“保留窄自研、零依赖”结论不变，返修只由下一行承担 | `PI-LANE-1`（已清账） | 否 | 已有 strict codec/framing/seq 等证据仍可复用，但 build/lint/test 全绿不抵消 message 泄漏、pending effect 丢失、同步重入复活、value correlation 缺失与 retryability 漏门 |
| `PI-CODE-STDIO-1R` | ADR-022 六-B.1/B.2 与 2026-07-28 安全闭口修订 | 从本架构 `main` tip 新建，顺取 `79a13d2→223185e→0ffae46→cfb4715`，只改 `product-protocol.ts/.test.ts`、`product-stdio.ts/.test.ts` 与专属 `specs/PI-CODE-STDIO-1R.md`：删除 runtime 自由失败 message；pending upstream failure 闩锁、usage taint、host_result 后由状态机闭合 tool/terminal；五 callback inbound reentry guard；proof→stdio 改 reserve/send 同一 op/hash；ok value 逐值关联；安全 failed code 强制 retryable false。不得改旧回执/ACCEPTANCE、父级文档、workspace-write-env、导出/装配/依赖/Rust/GUI | `PI-CODE-STDIO-1` 拒绝证据 `cfb4715`；相邻 write proof 接缝复核 | 否 | 六缺陷直接先红；cast/callback secret/path 零出 wire/error/cause；pending 四态、cancel、usd taint与 result-before-violation 收束；五 callback reentry 不推进状态且 startPrompt 合法 outbound 仍通；proof request 的 op/hash 到 wire 逐字同一、无第二 hasher；write 三镜像字段和 exists/read/list path 逐个错配 fatal/consumer 0；非 provider/host retryable:true 全拒。每项有效 source mutation 实红、全仓门绿后仍须异会话复验并补原 semantic mutation 缺口 |
| `PI-SIDECAR-DIST-1` | ADR-022 决定六-E | 实现 `70e6482`、回执 `01ff5e7`/订正 `3207b27`；独立报告 `9b8142f` 因 probe 假绿、缺产物可跳过及 Node archive 未过 SHA 门明确 **REJECT**。不得消费其 SEA-default 建议或据此裁路线；返修只由下一行承担 | `PI-LANE-1`（已清账） | 否 | bundle/licence/ESM 红控等静态证据可复用；八候选功能、冷启、签名与双架构结论均须在 hard verdict 和可信 Node 来源下重跑 |
| `PI-SIDECAR-DIST-1R` | ADR-022 六-E 2026-07-28 返修门 | 从本架构 `main` tip 新建，顺取 `70e6482→01ff5e7→3207b27→9b8142f`；只改票面列名的 fixture harness、原工程报告与新回执，被测 `sidecar-fixture.mjs` 冻结。做共享 pure verdict、十件库存闭集、八候选/两 ESM 负控、stdio/loop/EOF、abort ack+存活、四 crash exact、官方 Node partial→SHA/size/tar→atomic rename、三轮随机化冷启、两次空目录可复现性与 ad-hoc sign matrix。不得改旧回执/ACCEPTANCE、依赖/生产源码/父级文档/Tauri/Rust/GUI | `PI-SIDECAR-DIST-1` 拒绝证据 `9b8142f` | 否 | 缺/多制品及每类语义反例均使 production verdict/进程非零；两架构 archive 与解包身份真验；sealed/default byte-identical、code-cache 非确定与跨架构 warning 复证；README/报告统一 2.27 GiB 和完整 isolation 命令；异会话从空 dist 重跑后才交架构选路 |
| `PI-HOST-LOOP-1` | ADR-022 决定六-A/B；`PI-SIDECAR-DIST-1R` 路线裁定 | Rust 按裁定路线管理 sidecar/credential bootstrap/cancel/crash；Node product `/case` 虚拟 env 隐去 cwd/FileInfo/error 物理路径；单写 `app_data/pi-loop/<container>/<session>.jsonl`，append+sync_all 后才发布；session 累计预算、headless read/glob/grep/replay。interrupted 后可显式起同 session 新 leg，但 pi message context 从空开始并显示断点；不得接 GUI 或文件 effect | `PI-CODE-STDIO-1R` 异会话放行 + `PI-SIDECAR-DIST-1R` 异会话放行及路线裁定 | 否 | 逐 crash 窗实证：未 LF tail 只截 partial；已 LF 坏记录/seq drift quarantine；半闭合 prompt 补对应 session 终态；dangling effect→uncertain/failed，active paid prompt+usd limit→budget_unknown/failed，durable limit reached→budget_stopped，只有预算/effect 安全的 open leg 才 interrupted。Rust 以 journal 独占校验 resume：先落 session_resumed，leg=previous+1，priorObservedTurns/计数/费用精确 fold 且不重置，跨 leg requestId 重用、model/limits/grant/container/capability 漂移必拒；tc 在 start 分配、raw gate block 零 op；两 container 隔离/整删与 key/path 零泄漏 |
| `PI-WRITE-HOST-1` | ADR-022 A2 + ADR-004/017/018 窄修订 | 把 proof port 接到 Rust exact 同版本 `cap-std/cap-fs-ext/cap-tempfile@4.0.2` workspace；在产品 tool table/session/policy 注册原版 write、设 `toolExecution:'sequential'`、逐 toolCall 独立 env/operation，并把 dev 只读 prompt 换成 ADR-022 六-0 的六条/≤2048-byte `md-work-v1` prompt。Rust 逐段 `open_dir_nofollow`、单段建目录再重开，`TempFile` 私有同目录写入/同步/replace；物理根只在 app-data，逐次授权先 durable，Node 仍零 fs 写。不得加 edit/diff/CAS/promotion/bash/GUI | `PI-WRITE-PROOF-1` + `PI-HOST-LOOP-1` | 否 | prompt snapshot/byte gate 与四工具 exact set 有 mutation 红证；两端路径 golden 一致；非 `.md` 在 Node 零 op、注入 Rust 畸形 request 零 effect；root 内/外 symlink 父段、final symlink、swap race、Windows junction/mount/name-surrogate reparse、cross-container 全拒且零 effect；ambient API/`create_dir_all`/canonicalize 授权/`std::fs` mutation/remove-then-rename 零出现；`effect_started` append+sync 失败必须零 temp/replace；并发 reader 只见 old/new；kill 覆盖 temp sync、replace、parent/journal 屏障；Windows 无 delete-share 占用保持旧文件；宽权限 temp 与 fallback mutation 必红；unsupported remote/removable FS effect 前拒绝；replace 后屏障失败或落账前 crash 只落/派生 uncertain，不能伪 failed/completed |
| `PI-WORKSPACE-READ-1` | ADR-022 A2 的“写后可读”闭环 | 只让既有 read/glob/grep 显式路由 `/workspace/...`，由 Rust host-mediated `exists/read_file/list` 在同一 logical session 的新 sidecar leg 回读；`list` 不是新模型工具。另提供 GUI 后续消费的窄 `openWorkspaceMarkdown({containerId,sessionId,logicalPath})` command：只读当前 `.md`，返回逻辑路径/content/hash/byteLength，不落正文 journal。`/case` 仍只读；双根显示逻辑绝对路径，不得出现 `../workspace`，物理根永不进模型/journal/error。不得自动晋升工作稿 | `PI-WRITE-HOST-1` | 否 | agent write→批准→Rust 落盘→agent byte-identical read-back→glob/grep→interrupted/resumed 新 leg read-back；viewer command 对 session/path/UTF-8/131072 cap 双验且物理路径零泄漏；case/workspace 两根无串读、symlink 不跟 |
| `PI-BASE-HEADLESS-ACCEPT` | AGENTS.md 实现/验收分离；ADR-022 A2 | 独立 clean worktree 总验，不实施契约修补，只写 `packages/pi-lane/ACCEPTANCE.md`：真实 pi Agent 跑通单文件问答、多 md 定位汇总、case→新 Markdown、workspace 全量改写、嵌套 Unicode 路径+重启回读与拒绝面；另含取消、崩溃、两容器、session 累计预算与 wire fail-closed。每格同时留 Agent events、host request/result、journal、最终 bytes/hash；build 绿只作入场 | `PI-HOST-LOOP-1` + `PI-WRITE-HOST-1` + `PI-WORKSPACE-READ-1` | 否 | 必要结果完整且未截断后才可把内容错误归模型；缺工具/回灌/显式截断/落盘/回读任一项均判 harness 失败。六格反例实际注入；只在通过后允许基础 GUI 开工，未过不更新 current.md |
| `PI-LANE-UI-1` | ADR-009 决定七窄修订 + ADR-022 六-0/六-D | pi 线基础成熟 GUI 薄投影：直接依赖 exact `@assistant-ui/react` headless primitives + 公共 `useExternalStoreRuntime` hook；React→Rust command，journal→projection。首版只给 Prompt/Stop、真实运行/预算、tool proposal+逐次授权、结果/错误/恢复，以及从 succeeded write fold 出的 workspace `.md` 索引与 host-mediated 只读查看；uncertain 不进成功索引但工具卡可核验当前文件。沿 Courtwork tokens 重皮。Logue/OpenWork/OpenCode/Open WebUI 只作成熟形态证据，不作视觉指定、源码来源或 runtime 依赖 | `PI-BASE-HEADLESS-ACCEPT` 放行；本票独占当前 App 槽，不与 Dossier/context/其他 UI 票并行 | **是**（放行后的 App 首票） | LocalRuntime/cloud/AI SDK/OpenCode adapter/branch/edit/queue/private import 零出现；未知 event fail-closed；审批按钮只发 command，决定只认 journal；viewer 复用 `ChatMarkdown`、正文不持久且无编辑/保存/promotion；首次 uncertain create 可核验且仍标 unverified，当前 hash 异于 succeeded hash 必提示；展示投影的流态更新至多每 rAF 合并一次、所有 terminal 取消 pending frame 并立即 flush；用户上滚后 streaming/Stop/terminal 不夺回视口；WKWebView 键盘/读屏/焦点/Stop race 真测；bundle delta 留证 |
| `PI-BASE-GUI-ACCEPT` | AGENTS.md 实现/验收分离；ADR-022 A3 | 独立 clean worktree + 真实 Tauri WKWebView 总验，不修契约，只写 `apps/desktop/ACCEPTANCE.md`：从现有凭证/授权入口发起通用 `.md` work，观察 stream/Stop、write proposal 逐次允许/拒绝、终态/预算/恢复，并从 workspace 索引打开当前 Markdown；确定性 provider 跑机械反例，真实 DeepSeek 甜点档再跑 headless 同构任务矩阵 | `PI-LANE-UI-1` | 否 | scripted matrix 与真实 provider 均留 journal→projection→workspace bytes/hash 同源证据；真实 key/model 缺席则只能报 external-validated blocked，不得放行“harness 非瓶颈”；键盘/读屏/焦点/reduced-motion/scroll ownership/Stop race 全实跑。仅本票放行后允许 Dossier、修订与 UI 巧思开工并更新 current.md |
| `PI-SIDECAR-RELEASE-1` | ADR-020 + ADR-022 六-E | Developer ID、nested executable 逐件签名、notarize/staple、Finder 首启、`spctl` 与双架构读/写/abort/crash 复跑；不夹功能开发 | `PI-BASE-HEADLESS-ACCEPT` + 已裁 sidecar 分发路线 | 否 | 无凭据如实 external-validated blocked；`codesign --deep` 只 verify 不代签；正式制品证据闭合后才更新 release 成熟度 |



**`R-16`ⓑ 挂账（`C/R-16`）**：「工作稿轨可撤销性在 UI 真实成立」不现在实现、不悬置——登记为 **ADR-019 决定三实施票的验收条款**（须有反例：不可撤销即红）。


## 需要实测，不再泛化调研

| 议题 | 下一份有效证据 |
|---|---|
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

**memory 演进 ADR 议题池（2026-07-26 消费 pass 登记）**：OWASP Memory Guard 四态素材挂此议题，scheduled／多写者阶段启用；ADR-013 当期形态冻结不动。
