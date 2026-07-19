# 设计全量摸底 · 收拢评估单（DESIGN-CONSOLIDATE-SURVEY，2026-07-19）

状态：只读调研事件件。产出=事实、差距、归桶与矛盾点清点，不含实现结论、不含"该怎么做"判断。
观察基线：仓库实测 tip `5a2dfa3`（工作指令给出的 `8a7639a` 为其父提交，两者间仅一枚 site 排印修复，未涉皮层批次）。

引用纪律：`archive/` 内容一律行内码引称，不使用 markdown 链接。本文对"引语卡乌丝栏""界行巡行"等已被裁定拒收的形态只作文字指称，不复现其视觉/代码形态本身。

---

## 桶 A · Design 文档省并图

### A-1 现行 `docs/design/` 全部文件

| 文件 | 职责 | 与他份重叠/矛盾点 | 省并建议 |
|---|---|---|---|
| `README.md` | 目录索引 + 双层 UI 回迁工作流 + 终局收口指针 | 无重叠；是唯一的目录级权威 | 维持；但索引表未收录本目录内实际存在的 `prototype-audit-2026-07-19.md`（见 A-2） |
| `tokens.json` | 颜色/排版/密度/圆角/层级/首页 token 唯一机器真值 | 与 `courtwork-design.md` 为"源→编译产物"关系，非重叠 | 维持权威 |
| `principles.md` | 组件与交互原则十一条 + 激进度梯度 | 与 `typography-density.md` 发凡二（字重即层级）同构复述；与 `signature-line.md` §7 内容逐字重复（法理之线一节两处几乎相同表述） | 法理之线一节可省并：`principles.md` §7 保留指针，正文收拢进 `signature-line.md` |
| `voice.md` | 文案与用语规范全展开，与 `principles.md` §9 合并成册 | 明文声明"与 principles.md §9 合并成册"，结构上是分册非重叠 | 维持 |
| `signature-line.md` | 法理之线状态语义与白名单 | 见上（与 principles §7 重复） | 维持为权威，principles 收拢指向它 |
| `typography-density.md` | 排版密度 + 排印凡例（三轨字体制/字重层级/墨色律/度量律/槽位表/机器门清单/争点裁定记录） | 争点裁定记录 1-7 条已被 `apps/desktop/SPEC.md` SKIN-B2-0/B2-1 两批**执行完毕并产生新事实**（如 tertiary 值面复审定谳、GBK 子集定谳）；本文件的"争点裁定记录"仍是**提案期口径**，未随 SPEC 收口回填最终值 | 需回填：SPEC.md SKIN-B2-0"三项提案与定谳记录"节（`apps/desktop/SPEC.md:2669`）已把三项提案标注为"均已定谳"，本文件对应条目应同步引用最终值而非保留提案期措辞 |
| `site-evidence-line.md` | Pages 首页证据链叙事 + 展示站动效例外条款 | 与 `principles.md` §5 末尾"例外"条款一一对应，不冲突 | 维持 |
| `visualization-kit.md` | Schema 工作面构件/视图原语/有限组合/blueprint 接入门索引 | 明文自称"现行设计索引"非"凡例"；与 SCHEMA-EXEMPLAR-1 要求的"凡例文档"是**不同层级的文档**——本文件是构件目录，凡例要求的是"legal.S3/RiskList 全链"的字段级衍生模板，两者不可互相替代 | 维持，但需在其正文显式声明"本文件不是 SCHEMA-EXEMPLAR-1 所指凡例，凡例另立" 以免下一读者误认已闭合 |
| `svg-standards.md` | SVG-as-code 工程规则（viewBox/白名单标签/命名/门禁） | 与 SchemaParts 件库规则（`assert-schema-parts.mjs` 的"件库纯度"条款，见 `apps/desktop/SPEC.md:2969`）有**交叉但不重复**：本文件管品牌/功能图标，schema-parts 门管记号系；两套白名单目前分别维护，均未在本文件内互相指涉 | 建议本文件补一条指向记号系门禁的旁注，避免下一实现者以为两套白名单是一套 |
| `icon.md` | 品牌图标几何母题与变体谱系记谱 | 无重叠 | 维持 |
| `courtwork-design.md` | tokens.json + principles.md 编译产物，非权威 | 明文自称非权威 | 维持，drift 门（`lint:design-md`）已守同步 |
| `prototype-audit-2026-07-19.md` | 现行壳 B1-B3 vs 原型甲/乙两方对照盘点（评审门 C-3 定谳口径） | **本文件不在 README.md 索引表内**；就绪图明文将其定性为"事件件，B4 清账随批归档"（`docs/architecture/implementation-readiness.md:84`）——B4 已于 `95640a3` 合入主干，但本文件仍原地留在 `docs/design/` 未迁入 `archive/` | **应退役未退役**：按其自身权威（就绪图）的定性，B4 清账后本文件的去处是归档，当前既未归档也未入 README 索引，处于游离态 |

### A-2 `docs/architecture/implementation-readiness.md` 内设计相关段

- **评审门段**（`implementation-readiness.md:52`「Round 4 对齐计划」忧五 + `:64`）：定义 SCHEMA-EXEMPLAR-1 凡例权威化为对齐计划⑤放行前置条件之一。
- **迁移裁决段**（`implementation-readiness.md:82`「迁移 Plan 裁决」）：C-1~C-4 四冲突定谳 + B0 定值批准，含"朱入语义色预算""文武线不经 icon 门""原型 gradient/box-shadow 逐件过克制审计""界行巡行动效拒"等技法级速裁——这些速裁散落在一段长文字里，未被抽取为独立可查表。
- **批次账段**（`implementation-readiness.md:84`「皮层迁移批次账」）：B1-B5 五批票面滚动记录，是当前**唯一**逐批状态真源，但格式为连续长段落，无表格化的"批次-状态-证据位"索引。
- **SITE-CRAFT-2 行**（`implementation-readiness.md:99` 工单表行）：单行内嵌了字体策略反转、冷色五杠杆、边框语汇裁定、线级语法扩展、品牌一致性挂账等五轮以上追加决策，是全文档信息密度最高、最难定位复核的一段。

矛盾点：`implementation-readiness.md:86`"前端线先行"改序说明与同文件"执行序①…⑤"（`:66`）在时序描述上并非矛盾（改序已声明"对齐计划⑤的门不因改序豁免"），但两段分别在文档前后两处描述同一套门槛，若不细读容易误判为门槛已随前端线完工而解除。

### A-3 `docs/engineering/workflow.md` 判例节

全文七条判例（声明与效力三判例/置换批定式/枚举须含阅读/逐位相等管声明处/在场≠可见/归一化盲区/开口子封口子/不上也要登记）均带出处（源批次号），归档律本身亦已写明"跨工单判例进本文件，单批事实进该层 SPEC.md"。未见与其他设计文档冲突；判例内容与 `apps/desktop/SPEC.md` SKIN-B2-1/B4 两批正文逐字对应（判例是从 SPEC 正文抽取上浮的产物）。

### A-4 `apps/desktop/SPEC.md` 与 `site/SPEC.md` 内设计裁定段

- `apps/desktop/SPEC.md`：`SKIN-B2-0`（2626 行起）/`SKIN-B2-1`（2738 行起）/`SKIN-B3`（2822 行起）/`SKIN-B4`（2899 行起）四段，另有 1953 行「已定约束（Design 阶段的输入）」旧段与 B 阶段/UX polish 实现记录（1961-2052 行一带）——**SKIN-B1 无独立章节**：色阶批交付链只见于就绪图批次账段与 `site/craft-evidence/SKIN-B1/ACCEPTANCE.md`，SPEC.md 内无 B1 专节（与 B2-B4 体例不一致，推断是 B1 验收后按"完工不复述"纪律被移除，但移除动作未留痕说明）。
- `site/SPEC.md`：`SITE-CRAFT-2` 单节内 B1-B10 十个子批全部收在一个二级标题下（178-500 行），是当前最大的单节设计裁定文档，内含独立的"提案区/交架构拍板"栏目（如 B4 节"themes.dark 缺 bg.hover 槽位"）尚未被主文档吸收。

### A-5 SCHEMA-EXEMPLAR-1 凡例文档现状回答

**结论：不存在。** `docs/design/` 目录下没有任何文件以"legal.S3/RiskList 全链凡例"为主题独立成篇；`SCHEMA-EXEMPLAR-1` 工单本身仍在 `implementation-readiness.md:109` 的工单表内，退出证据栏写"凡例文档落 docs/（权威）；至少一张新表…首次过门的实证"——两项均未标记完成，且该工单**不在**「已清账工单」表（`implementation-readiness.md:94`）内。已完成的只是其中一个子证据：「设计层 one-shot 自证已过（2026-07-18）」一句话记录（同表同行），描述 Claude Design 用 `RiskReviewSurface`+domain 词表缝真渲了一张 PM 事项表，但该记录**没有对应的可核验附件路径**（见桶 C）。

组装凡例所需的散件清单（逐件定位，当前均分散存在，无一处汇总）：

1. `packages/legal/src/schemas/risk-list.ts` — RiskList schema 权威定义（含风险等级/gate 分级字段）。
2. `packages/legal/src/presentation/index.ts` — presentation 投影/词表实现。
3. `packages/legal/src/domain/compile-risk-list-to-revisions.ts` — 修订映射逻辑（凡例所指"修订映射"的实体代码）。
4. `packages/legal/src/testing/s3-risk-list-response.ts`、`packages/legal/src/testing/s3-risk-list-draft.ts` — S3 fixture，凡例衍生新表时的对照样本。
5. `docs/decisions/ADR-012-vertical-package-kit-and-visual-blueprints.md` — blueprint 门槛跨层拍板（凡例所指"blueprint 凡例引用"的上位契约）。
6. `docs/decisions/ADR-014-preview-tabs-and-package-tiers.md` — tab 语义（多 artifact 并列）。
7. `docs/decisions/ADR-003-evidence-and-anchors.md` — 信源分级 A/B/C 与锚点定义（gate 分级基础）。
8. `docs/design/visualization-kit.md` — 视图原语/有限组合索引（现行，但明确非凡例本身，见 A-1）。
9. `docs/design/signature-line.md` — 法理之线状态语义（gate 处置状态可视化的一部分）。
10. `apps/desktop/src/workbench/Panels.tsx` — 现行 RiskList 面板实现（`riskList`/`selectedRisk` 类型见 `Panels.tsx:221-222`，`risk-detail`/`risk-status-ledger` 渲染见 `Panels.tsx:394,401`）；此面板正是 `PANEL-BLUEPRINT-1` 债务清单中"最大一笔"硬编码 panel（`implementation-readiness.md:56`），凡例衍生的目标恰恰是要替代它，但它同时是当前唯一可读的"五列语义"实体样本。
11. `implementation-readiness.md:109` 一句话记录的"设计层 one-shot 自证"——仅文字，无附件（见桶 C）。
12. `archive/research-2026-07-15-round-3/equity-skill-specimen.md` — 调研笔记提及 RiskReviewSurface 的 domain 词表缝已证跨域（PM），可作为凡例"新表衍生 one-shot"的旁证材料（史料引称）。

矛盾点：凡例的验收标准（`implementation-readiness.md:109`"至少一张新表…首次过门的实证"）本身依赖 PM-SCHEMA-1（OOC/Estimate 收口）先完成，而 PM-SCHEMA-1 完成前"不得创建 PM scenario"（`docs/status/current.md:87`）——凡例衍生验证与其前置条件之间存在时序耦合，就绪图未显式标出这一依赖弧。

---

## 桶 B · 实机差距摸底

三方基线：①现行壳实物（`apps/desktop/src/styles.css` 1836 行 / `App.tsx` 2766 行 / `Panels.tsx` 509 行 + `site/craft-evidence/SKIN-B1~B4` after 帧）；②`archive/design-prototype-2026-07-19-r2/work-agent-prototype-r2.html`（字体维度空跑，不作字体基准，README 已注明）；③应然态（`tokens.json` + `typography-density.md` + 就绪图迁移裁决段）。较 `prototype-audit-2026-07-19.md` 增补的部分：B4 已实测合入主干（`95640a3`），本节在其结论基础上补 B4 之后的现状核验。

### B-1 版式（三栏结构/卡片形态/工作面组织/hero 感）

| 差距 | 现行壳证据位 | 原型证据位 | 应然态证据位 | 归属 |
|---|---|---|---|---|
| 三栏结构固定为 rail-left/conversation/schema-right 三段网格，无"卷宗四卷分层"容器 | `styles.css:240`（`grid-template-columns`）、`:255-272` 各态变体 | `2a` 帧左栏"卷一/卷二/卷三/卷四"四卷分层 + "会话默认收起" | 未有 token/principles 条款要求容器分层 | **未裁新项 `[需架构拍板]`**——引 `prototype-audit-2026-07-19.md` 桶③"卷宗容器为组织单元"行；`implementation-readiness.md:84`"版式两项…移交容器化 ADR 议题素材，不入 B 批" |
| hero 感：欢迎屏仅 26px 标题 + 建议行列表，无原型式计数型 hero 容器 | `styles.css:545`（`.welcome-slogan` `font-size:26px`）、`:548-556`（`.welcome-idea-row` 列表形态） | `2a` 帧"卷一 事项整理 12 件／卷二 材料核验 34 件…" | 激进度梯度裁定"agent 本体居间"，未强制 hero 形态 | **未裁新项 `[需架构拍板]`**——同上，容器化 ADR 议题素材 |
| 数据卡片形态：同构数据一律紧凑列表/表格，不堆卡片 | `panel-head`/`case-card` 等选择器（`styles.css:369-392`） | 原型未见系统卡片化陈述（audit 未把卡片形态单列为差距项） | `principles.md` §3"同构数据默认用紧凑列表、表格或矩阵，不堆卡片" | **明确拒项**——引 `principles.md` §3 |
| 工作面组织：五工作面 Tab（多 artifact 动态生成，见 `PREVIEW-TAB-1`） | `Panels.tsx` 面板集合 | `2a` 帧"处理中·显示工序，非 spinner"三态 | `docs/design/visualization-kit.md` 视图原语族表 | **已覆盖，无缺口**——`prototype-audit-2026-07-19.md` 桶③明文"此项壳侧已达原型意图" |

### B-2 密度（档位实际用法 vs 原型）

- 现行壳四档密度（reading/body/dense/meta）已落 token 与九槽位表（`typography-density.md` 起例槽位表；`courtwork-design.md:312-336` `typography.scale.*`），原型全篇 377 处 `font-family` 仅两个系统栈、零密度分档概念（`prototype-audit-2026-07-19.md` "字体维度：显式除外"节）。
- 归属：**非缺口，反向记一笔**——`prototype-audit-2026-07-19.md` 原文"该维度原型为空，现行壳已超"。

### B-3 组件形态（表格/时间线/图谱/修订面）

| 项 | 现行状态 | 原型/凡例要求 | 归属 |
|---|---|---|---|
| `table` | 已实现（RiskList/ReviewMatrix/PrdReview 消费） | — | 无差距 |
| `matrix / compare` | 待版本化（`visualization-kit.md:46`） | — | 未列入 B 批，见 `PM-SCHEMA-1`/PANEL-BLUEPRINT-1 债务 |
| `graph` | 已实现（G6），但边样式未携证据分级 | 原型目·一五/一六"事项—材料—判断三分；边的样式＝证据强度" | **已裁待做（独立契约单未出票）**——架构裁定一（`apps/desktop/SPEC.md:2961`）：批准立项 `PartyEdge.factTier`，需先出 `LEGAL-FIELD-1` 契约单，B4 两件视觉投影挂该单后置；`LEGAL-FIELD-1` 当前**未出现在** `implementation-readiness.md:28-46` 的 Round 3 目标链图中，仅在批次账段文字提及（`:84`），属"已裁定但未排入依赖图"的悬空态 |
| 时间轴节点形状 | 统一圆点，无"随执行者而异"语义 | 原型目·一三"节点形状随执行者而异" | **已裁待做**，同挂 `LEGAL-FIELD-1`（`TimelineEvent.executor` 字段），理由：`partyIds`（当事人）≠ 执行者，`apps/desktop/SPEC.md:2956` |
| `revision` 修订预览 | 已实现（Word 修订心智：红删蓝增） | — | 无差距 |

### B-4 记号消费面（五记号仅 2 消费）

现行 `SchemaParts` 件库（`site/index.html:31-39` 五个 `<symbol>`，`apps/desktop/src/icons/schema-parts.tsx` 对应壳侧五件）：

- **上·鱼尾**（节标）：消费于 `.reader-pane h3`（`apps/desktop/SPEC.md:2931`）。
- **上·落定章**（朱印）：消费于 `.risk-detail`，绑 `disposition === 'confirmed'`（`apps/desktop/SPEC.md:2932`，运行时见 `styles.css:1278` `.settle-seal`）。
- **不上·文武线界行**：结构分隔已由 B3 的 CSS 文武线全额承担（主界 8/次界 105 条），SVG 界行在壳内无独有辖区（`apps/desktop/SPEC.md:2933`）。
- **不上·侧点圈点**：壳内"强调"无独立数据信号，可强调之处已由语义色/徽章编码，圈点是重复编码；"用户自行圈点"未建模（`apps/desktop/SPEC.md:2934`）。
- **不上·骑缝齿痕**：壳内无文书接缝语义面，唯一同名件 `.rail-seam-toggle` 是折叠控件非接缝语义，借形即误用（`apps/desktop/SPEC.md:2935`）。

**三件"不上"均为克制审计裁定，非漏做**：`assert-schema-parts.mjs` 门内立 `UNCONSUMED` 表，双向锁（登记件被接线即红、新件未登记亦红），`docs/engineering/workflow.md`"不上也要登记"判例明文"不上者无帧可摄，这不是证据缺失，是审计结论"。

- **泥金件**：站面已用（hero 唯一强调，`site/SPEC.md:278-280`），产品壳消费面待裁——归属 **未裁新项 `[需架构拍板]`**（`prototype-audit-2026-07-19.md` 桶②"壳侧 hero 面归 Pages，产品壳是否需要此记号待裁"）。

### B-5 深色（B5 未做）

- `tokens.json` 的 `themes.dark`（磁青宗）token 值已全部定义（`courtwork-design.md:143-205`），但 `styles.css` 实测 **零** `data-theme`/`prefers-color-scheme` 消费（grep 命中数 0）。
- `SKIN-B4` 已把"两宗渲染一致"写成前向红卫：`schema-marks.spec.ts:69` 断言当前必然通不过真验证（壳内无第二宗可比），B5 落地时该断言会翻红，逼着替换为真断言（`apps/desktop/SPEC.md:3030-3034`）。
- 归属：**B5 系**——`implementation-readiness.md:84` B5 票面："`themes.dark` 置换；settings-optin 贴阈例复测；深宗四槽（disabled/hairline/strong/focus）实机覆核"。

### B-6 动效与仪式（`--motion-seal` 已有，原型还有什么）

- `--motion-seal: 320ms` 已落地为"全站唯一仪式预算处"（`styles.css:120` 定义，`:1278` `.settle-seal` 唯一消费点，`:1283` `@keyframes seal-press` 只动 `opacity`/`transform`，`:1760` reduced-motion 显式停摆）。
- 原型"界行巡行动效"（目·〇六 token 注"界行上 24px 墨段巡行 2.4s"）：**明确拒项**——引 `implementation-readiness.md:82`"技法级速裁：…界行巡行动效拒"；`prototype-audit-2026-07-19.md` 桶①第三行"不消费，仅归档留形"。
- 原型朱印"倾角 ±3–5° 拟手钤"：已借形但改判为**静态姿态**非动效——`apps/desktop/SPEC.md:2946`"倾角（拟手钤 −4°）是静态姿态不是动效"。

### B-7 原型有而壳无、且未被任何既有裁定拒绝的项（汇总）

| 项 | 归属 | 依据 |
|---|---|---|
| 图谱边样式＝事实等级 | 已裁待做，契约单 `LEGAL-FIELD-1` 未出票、未入 Round 3 目标链图 | `apps/desktop/SPEC.md:2957-2963`；`implementation-readiness.md:28-46`（目标链图缺此单） |
| 时间轴节点形状＝执行者 | 同上 | `apps/desktop/SPEC.md:2956` |
| 卷宗容器为组织单元（四卷分层） | 未裁新项 `[需架构拍板]`，移交容器化 ADR 议题素材（当前尚无 ADR 文号，仅 Round 5 方向登记③"本地缓存容器化"占位） | `prototype-audit-2026-07-19.md` 桶③；`implementation-readiness.md:75,84` |
| 产出先入卷再交人确认 | 未裁新项 `[需架构拍板]`，与既有确认账本（`OUTPUT-CONFIRM-UI-1`）语义需比对，"可能已等价" | `prototype-audit-2026-07-19.md` 桶③ |
| 泥金记号产品壳消费面 | 未裁新项 `[需架构拍板]` | `prototype-audit-2026-07-19.md` 桶② |
| 引语卡左右乌丝栏框（装饰性框廓，非层级线） | 若要借形须作为"新增装饰件"单独走克制审计，不得挂 B3/B4 票面 | `prototype-audit-2026-07-19.md` 桶① |
| 工序显示替代 spinner | **非缺口**：已覆盖 | `prototype-audit-2026-07-19.md` 桶③反向记一笔 |

---

## 桶 C · 供料集收拢

### C-1 Design 四面设计稿 + SchemaParts 17 族

- **仓内实测：均查无对应文件。** `RiskReviewSurface`/`TimelineGraphSurface`/`RevisionSurface`/`WorkCanvasSurface` 与"SchemaParts 17 族"两个关键词在全仓（含 `archive/`）grep 命中**仅两处**，且都在同一份文字文档内：`implementation-readiness.md:50`（R2 供料包描述段）与 `:109`（SCHEMA-EXEMPLAR-1 一句话记录）。未找到任何图片、代码、导出文件与之对应。
- `site/index.html` 内联 `<symbol>` 实测**五枚**（`mark-fishtail`/`mark-rule`/`mark-emphasis`/`mark-seal-frame`/`mark-seam`，`site/index.html:31-39`），与壳侧 `schema-parts.tsx`、`assert-schema-parts.mjs` 门核验的件数一致——**"17 族"与仓内实际可核验的"5 枚"之间存在 12 件的数量落差，来源不明**。
- `archive/research-2026-07-15-round-3/equity-skill-specimen.md` 仅提及"RiskReviewSurface 的 domain 词表缝已证跨域（PM）"一句调研性旁注，不含设计稿本体。
- 矛盾点：`implementation-readiness.md:50` 明文"R2 供料包已齐（2026-07-18）"，但供料包本体（设计稿文件、17 族元素库文件）在仓内不可核验，仅有文字转述。

### C-2 奖级工艺八提案裁定

出处：`archive/research-2026-07-15-round-3/award-craft-harvest.md`（史料，行内码引称）。八条裁定与消费去向逐条核验现状：

| # | 提案 | 裁定 | 消费去向现状 |
|---|---|---|---|
| 1 | 排印光学（仿宋视觉字距+中文标点悬挂） | 批准入基线规范 | **已落地**——`typography-density.md` 发凡四 + `apps/desktop/SPEC.md` SKIN-B2-1"排印光学的克制审计"节（`:2768-2772`） |
| 2 | 文武线破格提示层级跃迁 | 批准 | **已落地**——SKIN-B3 全批（`apps/desktop/SPEC.md:2822`起） |
| 3 | 朱印落定签名交互 | 批准，Pages 先行、壳经克制审计 | **已落地**——SKIN-B4"奖级工艺 #3"节（`:2944-2950`），站面 `site/SPEC.md` B3/B8 |
| 4 | 性能即品味→素净即敬业 | 批准入原则 | **未落地**——`docs/status/handoff-2026-07-19.md:10`"#4 素净即敬业入设计文档便利单——裁定已批、docs/ 尚零落地" |
| 5 | 卷轴翻阅节律（鱼尾/栏线作滚动分节锚） | 批准限叙事页 | **部分落地**——站面卷宗编号体例（`site/SPEC.md:248-250`）、鱼尾节标消费（`site/SPEC.md:323`）；壳侧未见对应叙事页滚动锚 |
| 6 | 展卷聚光（非焦点段淡墨） | 有条件批准，仅阅读视图正文 | **未落地**——挂"阅读视图票"，未见对应工单出票 |
| 7 | 墨迹洇染渐显 | 压线单点实验 | **已落地**——`site/SPEC.md` B6 节 `#ink-bleed` 滤镜，单点消费门锁定（`:362-365`） |
| 8 | 专属校色校刻 | 批准 | **已落地**——即 B0/B1 色阶批本体 |

不取五条（WebGL 巨制/泛化磁性粒子/横向滚动劫持/写实水墨模拟/声音设计）无消费记录，视为持续拒收。

### C-3 R2 供料包各件现状

- Claude Design 四面设计稿：见 C-1，仓内不可核验。
- SchemaParts 17 族元素库：见 C-1，仓内实为 5 族。
- "变体选型经产品拍板后出批次票"：未找到对应批次票文档。

### C-4 原型

`archive/design-prototype-2026-07-19-r2/work-agent-prototype-r2.html` + 同目录 `README.md`（字体维度空跑说明）——已通读，字体栈实测仅 `ui-sans-serif,-apple-system` 与 `ui-monospace` 两个系统栈、零 `@font-face`，与 `prototype-audit-2026-07-19.md` 的"字体维度：显式除外"记述一致。

### C-5 craft-evidence 各批清单

- `site/craft-evidence/SKIN-B1/`（`before/`、`after/`、`brand-icon/`）
- `site/craft-evidence/SKIN-B2-0/`（`source-han-serif/`、`zhuque/` 两个字体来源快照）
- `site/craft-evidence/SKIN-B2-1/`（`before/`、`after/`）
- `site/craft-evidence/SKIN-B3/`（`before/`、`after/`）
- `site/craft-evidence/SKIN-B4/`（五记号 closeup/context 帧 + app-icon 128/32 前后对照 + `README.md`）
- `site/craft-evidence/SITE-CRAFT-2/`（`B1`~`B9` 逐批帧目录 + `juzhen-rejected/`、`noto/`、`zhuque/` 三个字体许可快照目录 + `README.md`）
- 另有非设计批次的截图证据目录（`MILESTONE-SHOTS-1`、`COMPOSER-FLOW-COMPACT-1`、`SITE-SHOTS-REFRESH*` 等），与皮层迁移非同批，未纳入本条清点。

### C-6 判例节

`docs/engineering/workflow.md` 全文判例已通读（见桶 A-3），逐条均带出处批次号，未见与 SPEC 正文冲突。

### C-7 对齐计划⑤门槛现状（逐项查实况）

对齐计划⑤为"放行 harness 真实化线…与 polish R2"的唯一闸门（`implementation-readiness.md:66`），执行序为「①SEAL-2/3（在途）→②ARCH-DEBT 裁定会+调研消费 pass（架构执行）→③OSS-SUBTRACT-1（Sonnet 盘点+架构裁）→④凡例文档权威化→⑤放行」。逐项实测：

| 门槛 | 现状 | 证据位 |
|---|---|---|
| ① SEAL-2/3 | 已清账（在"已清账工单"表内） | `implementation-readiness.md:94`（`AUDIT-SEAL-2`、`AUDIT-SEAL-3` 均列入） |
| ② ARCH-DEBT 裁定会 | **未启动** | `docs/status/handoff-2026-07-19.md:28`"案头队列（架构，未启动）：ARCH-DEBT 裁定会（七笔三选一）→…" |
| ② 调研消费 pass | **未启动** | 同上；已知未消费清单仍原样挂账（`implementation-readiness.md:62`：oss-gui-source-patterns 采收 8 项/emil polish 规则包/namethatui 词典/SkillsBench 归因协议/OWASP Memory Guard 四态，均未见"入票/显式不采纳"回填） |
| ③ OSS-SUBTRACT-1 | **未启动**，仓内无对应盘点文档（grep 仅命中两处提及本身的文件） | `docs/status/handoff-2026-07-19.md:28`；`implementation-readiness.md:58` |
| ④ 凡例权威化（SCHEMA-EXEMPLAR-1） | **未启动**，`docs/design/` 无对应文件（见桶 A-5） | `implementation-readiness.md:64,109` |
| ⑤ 放行 harness 真实化 + polish R2 | **未放行** | `implementation-readiness.md:86`明文"对齐计划⑤的门不因改序豁免：壳侧 R2 巧思回迁与 harness 真实化仍待⑤放行" |

**矛盾/悬空点**：前端线（B1-B4 + SITE-CRAFT-2）已按"前端线先行"改序完工，但对齐计划⑤四项门槛（②③④）在本次摸底实测时点**全部未动**；`LEGAL-FIELD-1` 契约单已被架构裁定批准立项（`apps/desktop/SPEC.md:2961`）但未出现在 Round 3 目标链图（`implementation-readiness.md:28-46`）或任何独立工单表行中，处于"已裁定但未排队"的悬空态。

---

## 统计

- 桶 A（Design 文档省并图）：文件清点 15 项（含 1 项游离态 `prototype-audit-2026-07-19.md`）+ 4 段就绪图设计相关段 + 1 段 workflow 判例节 + 1 处凡例散件清单（12 件）= **A 桶条目合计约 21 条独立发现**。
- 桶 B（实机差距摸底）：版式 4 条 + 密度 1 条（反向记一笔）+ 组件形态 4 条 + 记号消费面 5 条（2 上/3 裁定不上）+ 深色 1 条 + 动效仪式 2 条 + 汇总表 7 条 = **B 桶条目合计约 24 条差距/事实**。
- 桶 C（供料集收拢）：设计稿+17 族缺失 1 项重大发现 + 奖级工艺 8 条裁定核验 + craft-evidence 6 个批次目录清点 + 对齐计划⑤门槛 5 项逐查 = **C 桶条目合计约 20 条**。

## 本次摸底发现的最重要三个事实

1. **R2 供料包"已齐"的核心承诺件在仓内不可核验。** `implementation-readiness.md` 两处提及的 Claude Design 四面设计稿（RiskReviewSurface/TimelineGraphSurface/RevisionSurface/WorkCanvasSurface）与"SchemaParts 17 族元素库"，全仓 grep 只命中这两处**文字转述**本身，无任何图片、代码或导出文件与之对应；仓内实测可核验的 SchemaParts 件库只有 5 枚 symbol（`site/index.html:31-39`），与"17 族"存在 12 件的数量落差且来源不明。
2. **对齐计划⑤的四项前置门槛（ARCH-DEBT 裁定会/调研消费 pass/OSS-SUBTRACT-1/凡例权威化）在本次摸底时点全部未启动**，而就绪图明文"壳侧 R2 巧思回迁与 harness 真实化仍待⑤放行"（`implementation-readiness.md:86`）——即当前拟收拢给一个实现会话的"全量实现"，按现行架构文件本身的门槛设定，尚处于未被允许开工的状态，这与"前端线先行已全清"造成的观感（皮层迁移四批已完工）存在落差。
3. **五记号"仅 2 消费"里有 3 件是明确的克制审计裁定而非未完成项**（文武线界行/侧点圈点/骑缝齿痕，逐件理由见 `apps/desktop/SPEC.md:2933-2935`），且该裁定已用双向锁写成机器门（`UNCONSUMED` 表）；同时 SCHEMA-EXEMPLAR-1 所需的"凡例文档"当前完全不存在于 `docs/design/`，只有一句话的"设计层 one-shot 自证"记录，二者共同说明：本轮摸底所见的"未做"，相当一部分是有意登记的裁定结果，另一部分（凡例文档、17 族供料）是被文字描述为"已完成/已齐"但实际未落地的悬空承诺——全量实现会话开工前需要先分清这两类差异，而不是把裁定结果当漏做补上、把悬空承诺当既成事实消费。
