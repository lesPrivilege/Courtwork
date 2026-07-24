# 实现就绪图

状态：Round 3 现行开工图（2026-07-24）

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

**P0 契约纠偏链（2026-07-24，架构裁定）**：源码复核发现 production Work 仍按每次
`runScenario` / `resumeScenario` 新建 `RuntimeGuard`，持久 `runtimeBudget.consumed` 不推进，
Settings 的 `maxUsd` 亦未装配。该行为直接违反 Accepted
[ADR-010](../decisions/ADR-010-work-live-boundaries.md) 的 session 累计、冻结成本基线与
unknown/partial fail-closed 条款；较低层 WORK-STORE 旧文中的“按 leg 重置后置”没有修订 ADR，
故无权形成例外。现行依赖为：

```text
CORE-BUDGET-1（core/provider；不触 App.tsx）
        │ 范围逻辑通过；票外根 lint 清零后 current-main 复验
        ▼
WORK-BUDGET-1（desktop production 装配；触 App.tsx）
```

`FILE-PREVIEW-1` 的实现与修复已在 `main`；独立验收报告 `79ddd16` 已证明本票 A–K、真链、
原件零写与 327/327 全部成立，但因受验主线自身 `capture.mjs` 的全仓 lint 红而按固定门驳回，
尚未清账。不得重复实现；外部红清除后由新会话聚焦复验。`CORE-BUDGET-1` 实现 `7808426` 与修复
`07ecca5` 已由独立聚焦复验以 124/124 定向、包/根全量与 mutation 判定范围逻辑通过，报告
`8130b39`；但它的 clean target 也被同一票外根 lint 驳回，故仍未治理清账。
`WORK-BUDGET-1` 必须同时等待 CORE current-main 根门放行与 FILE 复验释放 `App.tsx` 槽位。两票契约分别只认
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

**忧二 · 减法未足 → OSS 减法评估线**。立一次性盘点票 `OSS-SUBTRACT-1`：对全部自研面（md 渲染、diff、图渲染、OOXML、状态管理、E2E 工装等）逐项问「有无 License 合规（MIT/Apache）的成熟件可换」，输出换/不换理由表——**不换的理由同样是资产**（自研加固清单的验证）；换的逐项立票。此后每张 harness 真实化票自带「OSS 候选评估」节（已入纪律）。

**忧三 · 绿≠功能≠架构 → 版级仪式两件**。成熟度枚举与 current.md 唯一口径不变；新增版级收尾仪式：(a) **真机全链回归清单**——试点台账模板化为脚本化 checklist，每版收尾必跑（工程绿只是入场券）；(b) **解耦审计仪式化**——本轮三腿审计（包边界/路由双轨/effect 授权）定为每版收尾动作，新抓口子按 SEAL 模式入票。「机制不对称」教训固化：立门以族为单位铺满。

**忧四 · 调研未充分利用 → 消费率清账**。归档索引已有时效三态；追加**消费状态 pass**：全部「可借形/仍有效」项逐条裁「入票 / 显式不采纳留痕」，不许悬置——已知未消费清单：oss-gui-source-patterns 采收 8 项、emil polish 规则包、namethatui 词典正式并入、SkillsBench 归因协议（SKILL-REFINERY 验收设计）、OWASP Memory Guard 四态（memory 演进 ADR 素材）。pass 结果写回归档索引。

**忧五 · 前端克制被轻视 → 凡例权威化 + 克制审计**。SCHEMA-EXEMPLAR-1 凡例文档尽快进 `docs/design/`（权威层）；R2 每批验收附**克制审计条款**：新增视觉元素必须指认业务语义（风险色阶/落定感/双值锚类），纯装饰默认拒绝；**减法纪律**与设计原则是正面资产不是欠账，上游口径同表述。（原文作「减法八条」——该编号清单不存在，见方向②的坐标更正；此处所指是归档减法调研的真实主张「减 UI 暴露面不减能力」，与根 `CLAUDE.md` 复杂度节制条并列而非同一条。）

**执行序**：① SEAL-2/3（在途）→ ② ARCH-DEBT 裁定会 + 调研消费 pass（架构执行）→ ③ OSS-SUBTRACT-1（Sonnet 盘点+架构裁）→ ④ 凡例文档权威化 → ⑤ 放行 harness 真实化线（TOOL-READ-1 → GENERIC-PACK-1/PACK-INTERACT-1/SCENARIO-LIVE-2）与 polish R2。开源纪律与 License 红线（pandoc GPL 拒例）全程适用。

**Rust 重构裁定（2026-07-18）**：节点未到。Rust 边界维持「受控宿主能力」，按需逐点下沉（`scoped_write` 下沉即实例）；全量 Rust 化触 ADR-011 第二 runtime 红线。重启判据：性能实测瓶颈 / 第二宿主真实需求 / TS 层门禁封不住的安全面——满足其一再议。

## Round 5 方向登记（2026-07-18 夜，产品定调，待逐项出票/ADR）

1. **统一填格协议**（chat/work 同规范；**已由 ADR-016 收口，Accepted**——冻结填格模板随垂类包 descriptor 声明并由 registry 冻结、Chat 填格产物以带版本字段的 Turn journal 条目持久而不上 `ArtifactEnvelope`、UI 触发入口另票）：LLM 握手后按 schema 注入的字段填入对应板块——把场景 model 步的「schema 约束输出→校验入格」泛化为 chat 面同规范（chat 轻量产出也走同一协议，非自由渲染）。跨层契约，**ADR 议题**。
2. **四项基础 agent 功能**（**已由 ADR-017 收口**）：reading/edits/writing/bash 采 pi 成熟范式为通用底座基础工具集，其余能力走完全解耦的具名注入（既有论定）。**bash 入界属重大边界变更**——**冲突面的坐标此前记错**：原文引「减法八条·无任意 shell」，实测该清单**不存在**（`coding-agent-strategies-subtraction` 全文 24 行、无编号清单、无「八条」字样，且零次出现 shell/bash/命令行；其「减法」所指是**减 UI 暴露面不减能力**，与本议题不同轴）。真实对手是三处：`ADR-011` 决定二明列不引入的「后台 bash」、归档 legacy 的两句硬承诺「永无任意命令执行」「宿主零 shell」、以及 `ADR-004` 的销毁级动词不进能力面。ADR-017 按后者立论并裁**决定零：bash 当期不入界**（决定一至七封存为「若入界」的既定受控形态，重启议题须携新必要性证据对该 ADR 提修订，不得从零辩论）；决定八生效：reading 走既有 `ToolDefinition`/`ToolEnvelope`，edits/writing 属 effect 面另票。edits 沿 pi 范式不过度设计；work agent 比 coding agent 更轻。
3. **中间文件缓存**：work agent 中间产物落自身缓存区（case-path「工作稿」分区既有先例），edits 作用于缓存/工作稿，原件只读不变。
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
外部 lint 修复 → FILE-PREVIEW-1 聚焦复验
外部 lint 修复 → CORE-BUDGET-1 根门清零
(FILE + CORE) → WORK-BUDGET-1 → CONTRACT-REVIEW-SAFETY-1 → CONTRACT-OUTPUT-TRUTH-1
(FILE + OUTPUT) → CONTRACT-TRACE-1 → DEBT-DOSSIER-1
(TRACE + 治理复验 DEBT-CLEAR/GATE、MD、MODEL) → 全量门 / DMG 候选 / 真机回归
```

`CONTRACT-OUTPUT-TRUTH-1` 直接消费 Safety 票建立的 post-revision replay、零 confirmed 分流和
退役后的本地 dispositions/non-applied waiver，因此依赖关系是严格
`SAFETY → OUTPUT → TRACE`，不得并行改同一 App/compile path。发布候选须明确区分
“自动化/本机成立”与上述外部证据，不以版本号抬高成熟度。

**已清账工单**（完整范围与退出证据见各层 SPEC/ACCEPTANCE 与[当前基线](../status/current.md)，本表不再复述）：`WORK-STORE-1`、`HOST-AUTH-LITE`、`CHAT-SESSION-1`、`CHAT-MEMORY-1`、`CASE-ROOT-1`、`MATERIAL-INGRESS-1`、`LEGAL-S3-BINDING-1`、`WORK-LIVE-1`、`WORK-HOST-1`、`USAGE-LEDGER-1`、`UI-SURFACE-1`、`VOICE-SPEC-1`、`DESIGN-MD-1`、`CASE-PERSIST-1`、`OUTPUT-CONFIRM-UI-1`、`SITE-CRAFT-1`、`LAYOUT-CONVERGE-1`、`PILOT-LIVE-1`、`WORK-TURN-1`、`CONFIRM-GRANULARITY-1`、`PILOT-LIVE-2`、`READER-ISOLATION-1`、`PROJECTION-RESUME-1`、`WORK-TURN-2`、`PROVIDER-STREAM-1`、`AUDIT-SEAL-1`、`AUDIT-SEAL-2`、`AUDIT-SEAL-3`、`KEY-PERSIST-1`、`CHAT-MD-TABLE-1`、`CASE-TITLE-CONVERGE-1`。另：`SITE-CRAFT-2` B1-B3 批已架构复核合入（90be976/d9a75aa/617bc24），票面余量（刻本 title 轨/件库续批/前卫实验田）随评审门后续。另：`UI-RESIDUE-1` 批一已清账，下表行仅余批二范围；`WORK-STORE-MEASURE`、`HOST-AUTH-TRUTH`（被 `HOST-AUTH-LITE` 替代）见历史裁定。遗留便利项：voice 词表扩展扫描面（挂便利单）、真实 DeepSeek usage 捕获（见实测表）。

| 工单 | 最小范围 | 退出证据 |
|---|---|---|
| `PM-SCHEMA-1` | 令 OOC score 与确定性计算同义，并版本化 payload/schema/migration；**顺带（2026-07-18 登记）**：凡例 OOC/Estimate 显式件（score=null 出格态/点值/区间三态）设计缺口随本单一并拍板 | OOC、drift、旧版本迁移与 catalog-only 边界触红；不夹带 PM scenario |
| `SITE-CRAFT-2` | Pages 视效升级（对标 trae.ai 级门面，避免被归入普通 repo）。架构定向：不拼通用工艺（渐变/3D 与克制纪律相悖且拼不过预算），高级感由**产品本体的 schema 可视化承担**——hero 升级为活的 schema 工作面微演示（锚点跳转/逐条确认/修订对照的录制回放或轻交互重建，feldar 台账的活化版）；新增动效逐个走 site-evidence-line 例外条款 + AST 锁扩展 + 逐帧采样。供料：Sol 视觉扫 trae.ai 一类站点（computer use）+ Codex image 穷举存货。**范围扩展（2026-07-17 拍板）**：site/ 为个人非商业 Pages，许可口径放宽——归档调研批次的参考技法、小巧思、素材包（vault 余量、emil、feldar、namethatui 等）与**中文陌生化字体**均可经本单升格使用——**字体策略修订（2026-07-18 夜；2026-07-19 二次修订·产品拍板）**：字体编排定位反转——**标题取通行宋体**（成熟、全字重衬线，首选思源宋体类 OFL 大字重轨；「标题用考究的通行衬线」路线，权威感由成熟字形承担；刻本类字形【齐伋体/汇文明朝体/京华老宋体】降为前卫实验田探索项，不入主轨）；**正文取仿宋陌生化轨**——首选方正聚珍新仿（商业字库：个人非商业授权与 web 嵌入授权**分别**核实留快照，任一未核清即以朱雀仿宋 SIL OFL 为落地值，不悬置不静默替换）；**显式拒苹方/系统黑体做正文**（昔日品味符号、今日 slop 分布中心——陌生化正文即 kill-slop 的字体面）；编排义务四条随裁定：仿宋正文字号/行高补偿（仿宋视觉偏小偏窄，AA 联测以实际度量为准）、标题至少双字重梯度、拉丁与数字配衬字显式指定（仿宋拉丁字形弱，不得裸回退）、中文 webfont 子集化+font-display 显式声明；每项字体/素材落 `site/craft-evidence/` 留许可来源快照。**冷色起疑对治五杠杆（2026-07-18 追加定向）**：①阶的作者性——色相收窄、藏青阶做深（暗部层次+纸感+Inset 材质响应），拒绝均匀平铺；②语义色稀缺性**宣告**——红/琥珀仅风险、绿仅落定，站面一行小注明示「色彩仅承载语义」（被宣告的克制才是作者性）；③文书文化抽象引用——卷宗编号体例/骑缝式分隔/印记式落定章；**左侧彩色竖条退役候选（2026-07-18 夜）**：通用色条换文书系记号——鱼尾（节标）、乌丝栏细界行（结构分隔，无彩）、侧点圈点（强调）、朱色专属裁决落定（朱批/朱印语义，彩色只在人做决定处出现），站面先行验证后经 R2 门评估回迁（**抽象引用，法槌天平类具象 kitsch 一律拒**）。**边框语汇裁定（2026-07-19）**：掐边花纹（回纹/云纹/缠枝类）拒——纯装饰且与数据区静止相冲；「边框感」一律走刻本框廓的结构性语汇：**文武线**（粗细双线）与四周双边，几何抽象零具象，站面前卫端先行、产品壳经克制审计再议。**线级语法（2026-07-19 扩展）**：全面替换「均一 1px 单线」的 AI 工具脸——线重即层级语义：主界=文武线（粗细双线错落），次界=乌丝细线，层级不同线重不同（与色阶「阶的作者性」同构，线的粗细携结构信息非装饰）；落 token 化（--rule-major/--rule-minor 类），皮层迁移的版式置换项之一。常见 AI 衬线同理由刻本/仿宋双轨替换（字体策略既有）。**冷暖调和裁定（2026-07-18 夜）**：陌生化统一溯源**版本目录之学**（市面罕见），冷色适配走**磁青纸宗**——写经传统的深靛蓝纸即冷色古典脉，藏青底天然承接；鱼尾/界行/圈点为墨系记号不择纸温；暖色纸感（米黄+衬线=slop 分布中心）明确拒绝；色彩语法四位：磁青为底、墨为记、朱仅裁决、泥金候选 hero 唯一强调（均核实色值入 token 流程）；④秩序件当主角（hero 微演示既有定向）；⑤克制的机器门叙事——「设计克制是 CI 强制的」一句话连 craft-evidence，把克制从美学主张升格为工程事实。**前卫实验田条款（2026-07-18 夜追加）**：site 定位为前端先锋技法实验田——比产品壳更前卫的版式/交互先上站验证，成熟后经 R2 门回迁（Design 四面已证「从现行语言自然生长+版式可穷举」，站面负责探边界）；SchemaParts 件库以**原生 SVG** 绘制（与 Design 稿约定一致），站/稿共用；调研站点全集（vault/emil/feldar/trae/namethatui/geist/oss-gui 等归档批次）全量供料按需取形。**品牌一致性挂账（2026-07-19，B1 分治裁定③）**：B1 已将壳侧权威源稿 `docs/design/icon-light/dark.svg` 随锚迁 217° 换值，`site/assets/icon.svg` 仍持迁移前旧板——品牌两侧暂不一致，随本单磁青宗批一并置换并做品牌一致性核；site 侧色板现由 `deslop-scan-lib.mjs` 的 `siteFrozenColors` 按值冻结（带到期指针，届时整体删除、回绑 token 名）。**硬边界：仅 site/，产品壳字体与素材不随动**（商用授权另案拍板），归档升格以本单票面为准、site 源码仍不得直接引用 archive/ 路径 | 微演示可视对照与逐帧证据；例外条款留痕；site:guard 全绿；数据区绝对静止不破；字体/素材许可快照齐备，产品壳零渗入（静态门可验） |
| `FILE-PREVIEW-1` | **实现已在 `main`，不得重复施工；范围验收已过，固定门仍驳回。** 顺带条款（2026-07-17 拍板）：执行 READER-ISOLATION-1 SPEC 提案区已批准的 rails-compact 四步退役（删 App 派生与 class → 删 CSS → `assert-layout-converge.mjs` 存在锁转「零出现」反向锁 → `data-compact` 消费点转 `right-narrow`）；主体范围如下。md 文档 preview 入口落 working folders：点击文件直接进入只读预览（frontier 同型交互），内容经 reading-view 派生（复用既有 convertToReadingView，原件只读不变）；先 md/txt，docx/文本层 PDF 视 reading-view 既有覆盖顺带 | 报告 `79ddd16`：功能/架构与 327/327 通过，但目标 `b0f667b` 的站点脚本 lint 红，故不清账。外部 lint 修复成为 `main` 祖先后，由新会话在 clean worktree 复跑全仓 lint、FILE 定向与必要回归并写放行报告 |
| `EXPLORE-RAIL-1` | 右栏新模块 Explore（与 Preview 并列，**不是浏览器**）：从既有 Turn journal 助手回复正文抽取显式 `http(s)` 链接（跳过代码块/provider 地址/用户粘贴内容），展示域名/原始 URL/出现 turn 时间，提供复制、回看该回复与**经受控宿主 openExternal 打开系统浏览器**（2026-07-17 产品定调修订：开链接是既定路线；应用内仍零 `<a>` 直渲、零 `window.open`、零网页加载/DOM/截图/摘要回流，「不是浏览器」边界不变）；零新 core/harness/provider/material 接口（纯 transcript 派生只读索引）。措辞纪律：「agent 提及的链接」，不得表述为已建立连接；不复用 Preview 的 artifact tab 语义；rail 顺序 Progress→Preview→Explore→…；UI 标签过 voice 词表（Explore 为工程名，产品文案中文定名随 voice 规范） | 抽取规则反例（代码块/provider 地址/粘贴内容不入索引）触红；零网络请求（静态门锁 fetch/window.open/href）；回看跳转正确；残留门约束适用 |
| `PREVIEW-TAB-1` | ADR-014 决定一/二：tab 集合按会话 artifact 动态生成（tab=一张 schema 表）、多 artifact 并列、`containerPackBinding` 数组席位（恒 1）；与 Legal panel 迁移解耦，共存语义按 ADR-014 | 多 artifact 动态开 tab、切换不销毁状态（残留门约束）、单 artifact 回退、混包命名空间隔离反例触红 |
| `PANEL-BLUEPRINT-1` | ADR-012 迁移债：Legal 四个 route panel（timeline/graph/matrix/revision）逐个迁为版本化 component blueprint，保留历史 snapshot 回放与 compatibility alias；可分批 | 每迁一个：descriptor→projection 全链、drift/fail-closed 反例、视觉对照记录；App.tsx 对应硬编码分支删除 |
| `UI-RESIDUE-1` | 可逆交互零残留闭合门（架构裁定 2026-07-16：三分区状态矩阵并入本单，同证一个性质；允许单内分批交付，每批独立验收）。批一：`expectNoOverlayResidue()` helper（动画归零/无孤儿 portal/focus 归还/无残留 aria-hidden·inert）+ 全 app 疊层清单纠偏（消费 UI-SURFACE-1-FIX 修正后清单）+ 开合闭合（开→关后像素+DOM+焦点+滚动与基线等价）。批二：三分区状态代数（leftCollapsed/narrowRailRequired/rightCollapsed/focusMode/viewSegment/isWelcome/comparing/右栏双态的合法边与禁止边矩阵）+ 竞态（快速反向/Escape during enter/resize during close/切案切模式无旧区残留）+ 关键交互首帧·中间帧·终帧·反向帧采样。像素基线仅 Chromium 闭环，WKWebView 由 DOM 层兜底。目标措辞：**已枚举状态图内无已知残留/焦点丢失/状态串线/不可逆跳变**（非绝对零 bug 宣称） | 至少一个现存残留缺陷先红测坐实；门禁自身接受 mutation（故意不清 portal/不还 focus/不停动画必须红）；resize 自动收栏不污染用户手动态、focus mode 退出恢复三区、左右同折按原序恢复等矩阵边逐一有测 |
| `GENERIC-PACK-1` | 下一版候选（通用底座补齐线首单，roadmap Stage 1 节 + archive/research-2026-07-15-round-3/generic-base-inventory.md）：通用场景包首批三场景——通用起草→docx（复用 output 流水线，中性 descriptor）/ md↔docx 可编辑往返（自研 OOXML 路径补齐，**pandoc GPL 已拒**）/ 多文件批处理（descriptor 层 fan-out，系统编排非模型自主）。定调：**通用底座即第一个包**——同一插槽/同一 admitPackages 准入/同一凡例表，零绕过 schema 契约的后门；验收律=「只装通用包时产品是合格 work agent」。零新 core 机制预期 | 三场景过既有准入门与凡例表渲染；卸垂类包冒烟（仅通用包）e2e；批处理逐项报告与失败显式；xlsx/pptx/定时/通道均不夹带 |
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

**`App.tsx` 队列序（2026-07-24 P0 插队裁定）**：`WORK-BUDGET-1`
（还须 `FILE-PREVIEW-1` 与 `CORE-BUDGET-1` 已放行）→ `CONTRACT-REVIEW-SAFETY-1` →
`CONTRACT-OUTPUT-TRUTH-1` → `CONTRACT-TRACE-1` → `DEBT-DOSSIER-1` → `C3-1` →
`C3-2` → `C3-3`。MODEL 旧实现被驳回后，1R 已实现并由异会话放行功能逻辑，现只随票外
root lint 等待治理清账，不再占 App 实现锁；FILE 也已实现，外部 lint 清除后只占验收槽，
不授权重复修改 App。WORK-BUDGET 因 Accepted ADR 违约按 P0 插队；其后三票是 v0.2.0
单品真实性门，不得由 C3 polish 抢位。
其余 `App.tsx=是` 的票（`PERSIST-BACKEND-1`／`TOOL-READ-1`／`S6-EXEC-1`／
`C3-4`／`C3-5`）依赖就绪后按此队列尾随入队。**「即刻并行派发」一类旧措辞已被
互斥模型取代**——「即派」指依赖就绪即可**入队**，不指同时**在途**。

#### `GOVERNANCE-CLEAR-1` · 票外 lint 修复后的单批清账（验收票，不计入下表）

本票不实现功能、不占 `App.tsx` 锁，只把已经分别取得“范围逻辑通过、固定门驳回”的
`FILE-PREVIEW-1`、`CORE-BUDGET-1`、`DEBT-CLEAR-1` + `DEBT-GATE-LABEL-1`、
`MD-CONVERGE-1+` 与 `MODEL-CONFIG-EXPLICIT-1R` 桥接到同一个 current-main SHA。

**触发条件**：

1. `site/craft-evidence/VERSIONAL-LANG-3/capture.mjs` 的所有者明确授权，并以只含
   `/* global localStorage, process */` 声明的独立提交进入 `main`；不得把共享 dirty tree 当目标。
2. 新目标是 `main` 祖先；上述五组票的实现与既有独立报告也都是其祖先。
3. 验收先做 target→current 的路径差异审计：CORE/provider、DEBT、Markdown 与 Model-config
   已受验生产面必须无后续行为漂移；FILE 的 `App.tsx` 后续差异只允许已由 1R 独立验收的
   model-config notice 正交接线。任一额外生产漂移先退回架构角色，不得在清账票内顺手解释。

**角色与文件范围**：任命一名未实现上述任一票的新验收会话，在 detached clean worktree、
独立端口且 `reuseExistingServer=false` 下执行。允许同一精确 target 共享一次全仓固定门，但须按票
分别给出 focused 与 mutation 结论；报告只追加
`apps/desktop/ACCEPTANCE.md`（FILE / MD / MODEL）和
`packages/core/ACCEPTANCE.md`（CORE / DEBT）。禁止改产品、SPEC、`current.md`、readiness、
门常量或其他票外文件；清账后的 `current.md` 由架构角色另行更新。

**共享固定门（恢复态只跑一轮，任一红即整批驳回）**：

- `pnpm -r build`、`pnpm lint`、root `pnpm test -- --reporter=dot`；
- desktop 包级单测；
- 独立端口完整 desktop Playwright，floor 与实跑均不得低于当前 329。完整轮任何红都必须保留，
  不得用单例隔离绿抹除。

**逐票 focused 与当前-target 可红性（不能用共享全量数字替代）**：

- FILE：material reader/store TS、Rust material-store、FILE 定向 6 条 Playwright；至少把阻断闭集
  加入未知值及旁路跨案校验各注入一次，分别观察 closed-set/跨案门红。
- CORE：provider pricing + core budget 7 文件（现行基线 124）；删除 paid preflight，必须由
  unknown/version/effectiveAt 三例同时变红，且被拒 step 不再可假绿。
- DEBT：confirmation / assembly / pending projection / executor / store / S3 golden 7 文件
  （现行基线 105）；临时引用已删 `take` / `onTurnEvent` / `pendingGateLabels`，build 必须精确红。
- MD：chat-markdown 44 与定向 8 条 Playwright；移除 `remarkGfm` 后 table/delete/task-list 必须红。
- MODEL：model-config + hook 29 与 Settings 定向 8 条 Playwright；把真实 write fallback 伪报
  `persisted:true` 后 setter 真链必须红。
- lint 修复自身：临时撤掉 `localStorage` global 声明，root lint 必须只恢复
  `capture.mjs` 的 `no-undef`；还原后 root lint 零错。该反例是新提交的承重证，不替代上面逐票反例。

所有 mutation 须逐项 `apply_patch` 注入、观察红灯、反向 patch 还原；报告提交前目标树除两份
ACCEPTANCE 外必须 clean。两份报告进入 `main` 且逐票均放行后，架构角色才可把五组票移入
`current.md` 已清账清单并派发 `WORK-BUDGET-1`。

**由此得到的结构性事实（2026-07-24 单品收束票加入并吸收 reader 重复票后重算）**：下表
**22 行中 15 行触 `App.tsx`**
（逐行可数），仅 7 行不触。也就是说——**在 `App.tsx` 拆分（D1／
`PANEL-BLUEPRINT-1`）落地之前，Stage B/C 这条线实质上是串行的**，并行度上限约等于 1。
这不是排期技巧能绕开的，是 `App.tsx` 体量债的直接代价，`A/R-22` 已裁
「`App.tsx` 体量债走 D1 拆分线，不由换库解决」。**D1 裁定（2026-07-20）：不提前。**
大爆炸重构换并行度是坏交易——D1 自己就是最大的 `App.tsx` 票，提前它等于把串行变成停摆。
`D1`／`PANEL-BLUEPRINT-1` 维持第三梯队分批（首枚 `matrix`，78 行、prop 面最窄）。代之以两件配套：

- **①「过手即拆」纪律**：凡触 `App.tsx` 的票，其所触**状态/JSX 面优先外提为独立模组**，票内 SPEC 留痕（外提了什么、去了哪个模组）。验收查此项。
- **② `App.tsx` 高水位门**（`lint:app-highwater`，已随本批立）：立门当日行数即上限，**只降不升**；票内净增须由等量外提抵消。外提生效后须同批**下调**上限——不收紧则腾出的空间会被下一张票悄悄吃掉，「只降不升」退化为一次性宽限，故门对**净减**同样触红。

于是串行是既成代价，但**随线衰减**：每张票过手，下一张的触碰面就小一分。门的边界如实登记——行数是**代理指标**不是目标，它拦得住「又长胖了」，拦不住「行数没变但耦合更深」；绿灯不等于解耦达标。

| 工单 | 裁决坐标 | 最小范围 | 依赖层 | `App.tsx` | 退出证据 |
|---|---|---|---|---|---|
| `CORE-BUDGET-1` | ADR-010；2026-07-24 P0 漂移裁定 | provider 版本化静态价目补 `deepseek-v4-flash`；core 以信封既有 `runtimeBudget` 为唯一真源，令四项消费跨 start/resume 单调、暂停墙钟不计时、paid Turn usage/unknown coverage 入账、金额上限 fail-closed，并与事件/终态同收敛链 CAS；不改 envelope v1 形状与 storageVersion | 无 | 否 | 同名 provider/core SPEC 的 seed、暂停、failed paid Turn、unknown/版本漂移、CAS 失败 mutation 全红证；完整 build/lint/test；不同会话 clean-worktree 验收放行 |
| `WORK-BUDGET-1` | ADR-010；2026-07-24 P0 漂移裁定 | Settings 预算与 model route 只在 start 冻结入信封，resume 不重读；按冻结 route/价目构造 provider 与 costBasis；store budget port + expected route 注入 production executor；runtime_limit/configuration 失败从持久投影在 Progress 可见，reload 不消失；触 App 时外提 Progress 正文并下调 highwater | `CORE-BUDGET-1` 独立验收 + `FILE-PREVIEW-1` 独立验收 | **是** | Settings/模型改后 resume 均不变；terminal route 漂移 fail-closed；多 leg 四量单调且等待不计；已知超限与 coverage blocker 均持久可重放；provider 调用计数证明 blocker 前零多发；独立端口 Playwright 与 Progress mutation |
| `CONTRACT-REVIEW-SAFETY-1` | ADR-010 决定五 2026-07-24 修订；Legal/Desktop 同名 SPEC | “修正”成为风险结论的受控编辑：非空异值 description + confirmed status 同次 RevisionEvent；S3 gate 与最终按钮逐字为“提交处置并完成合同审查；有已确认风险且无待索证项时生成批注稿”，逐条填满不自动 resume；start/resolve 共用 process-local commandId first-wins，顺序重提与真 CAS 败者保持不同 typed 语义；App 检查 resolve outcome，只有 completed 才从持久 post-revision RiskList 分流，四类非完成 outcome 零写；零风险/任一待索证（含与 confirmed 混合）/全驳回正常完成零文书；编译器退役本地 dispositions 第二真源；production non-applied waiver 退役为整份阻断 | `WORK-BUDGET-1` | **是** | 修正未提交/取消不 resume；填满未提交仍 paused；同帧双击同 Promise、跨 kind 同 id 冲突；重启已消费 request 为 invalid_scope/CAS=0；两个独立 command 实例共享 host 的真并发 CAS loser 仍 failed/internal；零 confirmed 与 mixed OOC 文案/账本诚实；四类非完成 outcome/non-applied 各零 docx；description/status/replay/comment 同源；恢复自动 effect、transient waiver、忽略 outcome 或消费旧闭包的 mutation 必红 |
| `CONTRACT-OUTPUT-TRUTH-1` | ADR-004；ADR-010 决定四/五 2026-07-24 修订；Legal/Desktop/Output 同名 SPEC | 用户显式选一份 ready DOCX 主合同；S3 `materialRefs[0]`/pointer/CaseFile primary 同源并由完整 WorkReplayResult 验真；一次 readOriginal snapshot 同 bytes 复验并直接走 output；唯一 inspect/deliver coordinator 冻结 active-case scope，先分流 normal not_applicable、再触材料/宿主；产物按 persisted createdAt + session SHA-256 版本化命名，以持久 confirmation 时间固定批注并把 UTC 直接编码进 ZIP DOS headers；browser/Tauri 以 case-root/output dirfd + `*at` 实现 typed stat、atomic no-replace 与全 outcome post-stat SHA-256；任一 non-applied 整份阻断，OPC 数字签名 typed 阻断；退役 `ready[0]`、ReadingView 重建与生产伪 redline | `CONTRACT-REVIEW-SAFETY-1` | **是** | 多材料错序、pointer 篡改与切案/grant swap 反例；replay 两分支/demo metadata；单读 TOCTOU mutation；支持锚在前仍选主合同锚；未触 OOXML part 内容 bytes 相等，受触四 part 既有语义保全；non-applied/数字签名/恶意/漂移等零写；同毫秒双 session 不互盖，同 session 跨时区同 hash；dirfd 换目录、hard-link/EEXIST/effect-unknown/symlink 反例不覆盖；coordinator not_applicable/blocked 不显重试；Legal S3 production 路径旧编译/waiver/产物名/`ready[0]` 零出现 |
| `CONTRACT-TRACE-1` | ADR-010 决定五 2026-07-24 修订；desktop 同名 SPEC；吸收原 `MATERIAL-READER-MERGE-1` | SourceAnchor 真实打开同案 FILE reader；合并 `material-reader/actions` 为 canonical doc/outcome 单调用链，以 textRange/textLayerVersion（分页件连 page）验真并按 block-local 坐标高亮，quote 只作切片等式/显示，合法 bbox-only 独占 unsupported 分支；生产 RiskList 面移除固定 demo 合同/4处/del-ins，interactive/read-only props 类型隔离写权限；fresh start 只在首枚 post-CAS event 或 found replay 后建立 pointer，之后按 replay/typed failure 矩阵 compare-and-clear；completed 可只读重开，且仅 output inspect=ready 时可显式重试 | `FILE-PREVIEW-1` + `CONTRACT-REVIEW-SAFETY-1` + `CONTRACT-OUTPUT-TRUTH-1` | **是** | anchor 指向支持材料仍打开正确件；重复 quote 只落坐标指定处；版本/切片漂移/跨案/bbox 显式 typed；reader shape/端口声明一份；production demo 常量零；start rejected 保留旧/空 pointer，candidate 不抢写；ownerless running 清、durable failed/completed 留，unavailable/unknown-version 留、corrupt 才清；账本 artifact 隔离不清 pointer且零 output；完成/重启/切案/删产物后可看且风险操作零 CAS；ready 重试全落点一写、其他结果零写；恢复 quote 搜索或 outcome-only pointer 分支 mutation 必红 |
| `DEBT-CLEAR-1` | `A/R-12`ⓑ删、`A/R-13`ⓑ删、`C/R-15`①、`A/R-26` | 删 D7（`ConfirmationStore.take()`）、D8（`onTurnEvent` 缝）、D10（2 导出 / 9 脚本 / 1 死配置 / `newLine` 死字符串） | 无 | 否 | 删后全链绿；跨包接口面消费方为零须实证；`lint:trace`/`lint:thinking` 去重后门链不缺项 |
| `DEBT-DOSSIER-1` | `A/R-26` 裁接判据 + 第六轮“卷宗 0 件”源码复核；desktop 同名 SPEC | 仅 `scope==='dossier'` 的 ready 附件进入既有 `ingestComposerUploads`，message-only 只进本轮请求；不得产生第二入库路径。`fileCount` 不持久，未水合不伪 0，CaseRail/Working folders/listForCase 同源并覆盖多案重启 | `CONTRACT-TRACE-1`（版本收束序；逻辑无跨票依赖） | **是** | 双 scope 同发只入一件；多案重启计数与 store 一致、加载中诚实；硬编码 0/scope filter 删除 mutation 必红；demo 隔离与 voice 门不破 |
| `DEBT-GATE-LABEL-1` | `A/R-14` **改判（2026-07-20）：ⓑ接线 → 死支退役** | D9 范围重写。原票面「`pauseAt` 时把 gate label 供给投影令『未决确认』行生产可达」经探针实测**推翻**：`scenario-executor` 内**生成时刻与未消费 pending 互斥**（`pauseAt` 落 pending 即 return，`resumeScenario` 先 consume 再续 `produceSequence`），该行结构上不可渲染。前瞻语义读法**明确拒绝**——为无需求拉动的推测性收益改字段语义、破 golden、脱钩同源注释，三项代价换零实证价值；真要来属 ADR 级变更，届时随 ADR 重新引入槽位。新范围：①`pendingGateLabels` 字段与「未决确认」投影行按死码退役（判据同 D8/D10：零供给方 + 结构性不可达；**定性为内部类型故直删**——非版本化 wire，不在 JSON Schema、不持久化、零跨包消费）；②互斥论证升格进 `packages/core/SPEC.md`，带探针结论与证据坐标 | 无 | 否 | 投影输出逐字节等同**以既有 golden 未重铸作证**（恒空分支删除后输出不变，两份 golden 数据零改动而全链绿即证明）；SPEC 升格落痕在场；`awaitingConfirmation` 保留并如实登记「生产供给面为空」（真源在调用方，不适用本单判据） |
| `MD-CONVERGE-1+` | `A/R-18` + `C/R-6` **合票** | S2：chat 面 `ChatMarkdown.tsx` 改用已在生产依赖的 remark、删手写解析器；**同票扩围**链接/单星号斜体/引用/删除线/任务清单（图片、公式除外）——remark 化后多数语法免费获得，**不再扩自研解析器**。链接**渲染**先做，链接**打开**挂 `EXPLORE-RAIL-1` 权限位（capability 白名单缺 `opener:allow-open-url`） | 无 | 否（App.tsx 内 4 处仅为调用点，`text` prop 不变） | `CHAT-MD-TABLE-1` 双层红证重放全绿；扩围语法逐项渲染对照；e2e floor 不降；新依赖须先答 `OSS-SUBTRACT-1` 的换/不换问题 |
| `PERSIST-BACKEND-1` | `A/R-17` 采 + ADR-019 决定一 | S1：五处逐字同构 `defaultBackend` 归并为一份工厂 + 4 处裸 `localStorage` 收编（裸调用**全在 `App.tsx`** 与 `chat/MessageActions.tsx`）；分区维随 ADR-019 决定一**就地补 container 维**。**归并止于 backend 工厂，不越 ADR-019 明确拒绝的通用 KV 线** | ADR-019 | **是** | 五处归并后行为逐字节等同（既有版本化单键 golden 为证）；裸 `localStorage` 零出现（静态门）；通用 KV 未被顺手造出 |
| `TOOL-READ-1` | `A/R-25` 方向裁定 + ADR-016 决定二、ADR-017 决定八 | L1 受控只读工具。**模型请求通道**：走「知交互」封闭动词集显式扩集——新增 `request_tool` 动词，`toolId` 以注入白名单 `z.literal` 闭集锁定，白名单外即普通不可信文本在校验层拒收；执行仍落 `deterministic_tool` 步，**步骤闭集不扩**。toolResult 采 `content`/`details` 二分。此扩集属跨层契约变更，以 **ADR-011 修订**形式落痕 | ADR-011 修订须先落 | **是**（trace 区工具行现只有 demo 路径，生产路径须新开） | 白名单外调用在校验层拒收（反例触红）；`pure_read` 分级校验前置门已在；工具结果可溯源；stub 链不回退；四知文本 golden 同步 |
| `S6-EXEC-1` | ADR-017 决定四（effect 授权面）+ ADR-004 | D2：`FileOpsPlan` gate resolve 后的执行触发、授权持久与事务日志。现状是一条与 scenario 无关的 demo 直连管线（renderer `passive`、宿主内存 FS、plan 来自 demo 构造器；唯一入口是 `App.tsx` 的 `fileOpsMode` 本地 state） | ADR-017 + ADR-004 | **是** | 授权决定持久**先于** effect（事后弹窗不追认）；事务日志可回放；非 demo 案不再返回空态；销毁级动词零出现 |
| `GATE-INVENTORY-1` | `A/R-23` 准 | A2.4：8019 行自研门的一次归并/降频/失效清点。**先清点再定动作，不预设结论** | 无（清点期只读） | 否 | 清点表逐门列「仍有效/已失效/可归并/可降频」+ 依据；动作另立票，本票不执行归并 |
| `C3-1 · 生成控制与错误恢复` | `C/R-2`（不变量 4 违例）、`C/R-7`、`C/R-9` | work-chat 补 Stop/Retry（透传 `signal` + `onStop`/`onRetry`）；失败文案按 kind 接现成 `FAIL_KIND_MESSAGES` + 补 402；超时文案两路径归一去毫秒；Chat 失败路径纳入 `workFailureDisplayCopy` 同源守卫；截断（`finishReason:'length'`）显式提示；evidence 出口并入 Settings→About 既有 Diagnostics 导出席位 | 无 | **是** | 静默降级零残留（不变量 4 反例触红）；失败文案与 kind 一一对应；取消零残留；`lint:voice` 全绿 |
| `C3-2 · 会话可检索` | `C/R-1` 三件全、`C/R-14`ⓑ、`C/R-15`② | 接线 `searchTranscripts` 到 UI；会话自动标题（首条消息派生、**用户不可编辑**，守 ADR-013）；会话内查找。归档仍可搜、删除同步出索引 | 无 | **是**（`sessionHistory` 状态与入口住 `App.tsx`） | 检索命中可回跳；标题派生确定性；删除后索引同步（反例：删后仍搜得到即红）；ADR-013 语义不破 |
| `C3-3 · 输入面效率` | `C/R-3` 口径、§3.5 顺带裁 | textarea 自增高（补齐已有 max-height）；草稿跨视图/跨历史面板保持（**状态提升出 Composer** 即落 `App.tsx`）；↑ 键召回上一条；粘贴阈值校准——**去除「含换行即转块」判据**，字符阈值 500–1000 区间实测定，补 Shift+粘贴旁路。**不做任何斜杠触发**（见 roadmap「已裁不做」） | 无 | **是** | 草稿跨面保持有断言；阈值实测留证；Shift 旁路可验；零 `/command` 入口（静态门） |
| `C3-4 · 可观测性四件` | `C/R-8` 四件全（markdown 扩围**已移出**并入 `MD-CONVERGE-1+`；预算执法与 flash 价目**前移** `CORE/WORK-BUDGET-1`） | 会话累计用量与成本估算的用户可见出口只读消费既有 ledger/runtimeBudget，不另造账、不改变执法；memory 注入逐轮可见；上下文占用可见（`contextWindow` 槽位为协议层**版本化加法扩展**）。上下文占用以**我方自身判断**立论，不以行业基线立论 | `WORK-BUDGET-1` | **是** | usage/cost 与既有 ledger/runtimeBudget 同源不另立；`contextWindow` 缺省时逐字节等同；memory 可见面不泄案件内容跨案 |
| `MODEL-CONFIG-EXPLICIT-1`（票丁） | `ARCH-SCOPE` R-11 准（全案） | **model-config 静默降级显式化**，范围五条：①`loadModelConfig` 现有**五条降级路径全部静默**——无值 / `providerId` 非法 / `modelId` 损坏 / `reasoning` 非法 / 裸 `catch {}`（无绑定变量、异常直接丢弃）；另有第二个裸 catch：`localStorage` 抛异常时静默回落 `memoryStore`，配置跨会话蒸发同样无痕。②**降级必须出现在 UI**——一次性提示「模型配置已重置为默认」。③`loadModelConfig` 返回值须携**降级标记**（现签名 `(): ModelConfig` 与正常路径类型层同构，调用方无从区分）。④`model-config.test.ts` 对「静默落默认」的**正向断言改写为反例**（该测试契约变更已由 R-11 明文授权）。⑤**UI 落点优先 Settings 域**（既有 `model` 分区），非 `App.tsx` 面；若确须触 `App.tsx`，按队列序尾随入队，**不抢槽**。最隐蔽的是路径④：用户曾选 `deep`，降级后静默变 `standard` 且随每次请求发出，账单与延迟特征随之改变，界面始终显示「标准」 | 无 | **是**（范围①要求返回值携降级标记，而 `loadModelConfig` 生产消费点之一即 `App.tsx`；**硬约束**：提示 UI 仍优先落 Settings 域，App.tsx 侧改动收敛到取值处，按队列序尾随入队不抢槽） | 五条降级路径逐条有可见痕迹（反例：任一路径静默即红）；降级标记在类型层可判别；`model-config.test.ts` 旧正向断言已成反例；不变量 4「降档必须显式」在此闭合 |
| `MODEL-CONFIG-EXPLICIT-1R`（回炉已实现；逻辑放行，治理待票外 lint） | desktop SPEC 同名回炉契约；2026-07-24 current-main 独立驳回与 1R 异会话验收 | 两项 P0：六值不扩；`saveModelConfig` 以判别结果暴露真实 `setItem` 回落；hook 保留唯一 session-local notice，App 只透传到 Settings → Model 内联面并退役 reset 专用全局 toast；成功保存才清除；`null`/数组/primitive 归 `unreadable`，不造版本信封 | 无；实现与范围逻辑已闭合，待票外 root lint 清零后聚焦治理清账 | **是**（只透传 notice；净行数不得增加） | 超过 3.2 秒后 Settings 仍见 reset；真实 getter/setter throw 常设门；写失败当前会话持续告知且 reload 实证旧值；删除 App prop/Settings 节点/fallback 信号均红；无值静默、provider/work strip 与持久格式不变；异会话 clean-worktree 已验，固定门清零前不计清账 |
| `C3-5 · 无障碍与未开通态归一` | `C/R-11`、`C/R-12`ⓑ、`C/R-13` | 焦点陷阱（FocusScope，归档留档正式消费；现行 `useDismissOnOutside` 消费点在 `App.tsx`）；`aria-live` 流式播报；`.palette-input` focus 反馈；未开通态措辞与机制归一（英文 chrome 统一 Coming soon 族）+ 门扩围至 Settings 域与 CaseRail；**响应 OS 级无障碍字号**（rem/em 基线化）——产品内不提供调节 ≠ 拒绝响应 OS 设置 | 宜紧随票丙（标题轨整备） | **是** | 焦点陷阱反例（Tab 逃逸即红）；未开通态门扩围后 Settings/CaseRail 纳入；**rem/em 等比换算须零视觉 diff**（既有皮层门作证，帧证留档） |
| `ANCHOR-SWEEP-1` | 第二次复验顺带发现 + 判例「文档引码用符号锚不用行号」 | 小票，两条：①**六处漂移行号改符号锚**——`packages/core/SPEC.md`（`executor.ts:49/261` 实为 50/280；`events/types.ts:116` 指涉已删；`:192` 的 `sumUsage` 实为 208）、`packages/output/SPEC.md:50`（`App.tsx:920` 不可定位）、`apps/desktop/SPEC.md:914`（`App.tsx:1771` 实为 2233；`:359-361` 实为 404-406）。②`workflow.md` 验收固定项已增「自述与实现逐条对照」（本票只需核其被执行，不重复立条）。③**顺带（验收 J 项）**：`assert-layout-converge` 的退役名反向锁已由 2 文件加宽至整个生产源码集，SPEC 与本图中「零出现反向锁」的表述随之收紧为实际覆盖面，不留「读起来像全仓级」的模糊。**判例维持劝告级、不立门**——「现行语境 vs 历史语境」机器不可判（验收报告、craft-evidence 里的行号是当时树的证据，正当且不该被扫红），按判例「判据不可判定不造启发式」，宁可靠人核 | 无 | 否 | 六处逐一改为符号锚且符号在源码内真实存在；改后全仓现行规范文档零硬编码源码行号（一次性核，不留门）；`workflow.md` 固定项在本票验收中被实际执行一次 |
| `E2E-FLAKY-HOVER-1` | FILE-PREVIEW-1 验收 K 项，架构准 | 小票：`global-verbs.spec.ts` 悬停显现例（`toHaveCSS('opacity','1')` 收到 `0`）负载相关抖动。**定性已由验收对照实验坐实**：单文件隔离跑 21/21 绿、全量跑红、父提交同跑失败更多（321/323，另含 `:28`）——既有缺陷非任一新单引入，末次改动 `2c5470d`。本票只处置该例的稳定性，不改其断言意图 | 无 | 否 | 连续三轮全量跑该例零失败；修法不得以放宽断言或加 `retry` 掩盖（须指认抖动根因：悬停时序/动画未落定/并行负载下的渲染延迟） |

**不进 Stage B**（`A/R-7` 决定零、ADR-018 不排期）：沙箱实现；bash 实现；`ADR-016` 的 UI 触发入口（归 UI 单，须 ADR 先拍板）。

**`R-4`ⓑ 通则（`C/R-4`，跨票适用）**：用户会主动寻找的「刻意不做」功能，须有**用户可见的一句说明**；纯工程内部项文档留痕即可。措辞必须与「即将开通」可区分——**「设计上不做」是承诺，不是欠账**。本轮升级两项（会话导出、memory 编辑/单条删除），落点 Settings 既有 Data & privacy / Data promise 席位，与 `C3-5` 的措辞归一联动。

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
