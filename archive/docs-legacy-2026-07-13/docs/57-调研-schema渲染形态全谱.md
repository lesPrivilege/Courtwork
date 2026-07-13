# 调研：schema 渲染形态全谱——为「渲染形态封闭词表」立案（2026-07-11）

状态：调研完成，供架构会话拍板词表 v1。上游裁决：docs/49 第七章（渲染形态 = 有限封闭词表，类 PPT 版面 + cheap 可交互 HTML 形态，首期不开放自定义；SVG 一切原生绘制）。本报告只立案不拍板：词表全谱、token 增量清单、排版组合机制、上架批次建议四件套，逐项供架构过目。

## 〇、背景复述（不重新论证）

- **宿主契约**：右栏 = UtilityRail + SchemaPreviewHost 双宿主（docs/49 三章修正）；PreviewHost 领域无关，renderer 按场景声明 `uiTemplateId` 挂载，`artifact_produced` 自动打开。词表 = PreviewHost 可挂载 renderer 原语的全集。
- **握手协议**（docs/53）：LLM 只填 schema 字段，怎么画归 tokens 与 renderer——词表是握手协议的"呈现端字典"，与 beautiful-mermaid"语法层收窄 + 渲染层收口"同构（docs/43 §1.2 已验证该判断）。
- **设计语言硬约束**（docs/32 tokens.json + principles.md）：浅色唯一；语义色 4 色相（红/琥珀/蓝/绿）+ 板岩灰，白名单极窄（审阅面 + 标题栏凭证异常唯一例外）；文本藏青 #0A2540；字重仅 400/510；tabular-nums 硬性；数据区绝对静止；阴影仅 elevation.shadow 单点供给（L1 浮面）；圆角上限 6（浮面外壳 12）；紧凑列表优先（28–32px 行高）；溯源必达（无锚不上右栏）；命名领域无关。
- **既有 renderer 五件**：时间线（表格式，docs/43 裁定沿用手绘）、关系图谱（G6 5.x + 层次布局）、矩阵审阅（手写 table，AG Grid 触发式引入）、docx 修订预览（红删蓝增）、起草画布（编辑 + 编译为 Word 冻结仪式）。
- **目标消费方**：法律五工作面（已有）、S9 招投标核对、S10 计算器族（CalcArtifact：分项 + 依据 + SourceAnchor）、S11 企业汇报族（周报/复盘/合规报告/管理层简报 = 向模板填表比 PPT 更自由，docs/48）、首屏模块位（热力图/日程看板/提效可视化，docs/49 六章 + docs/53 收束注记）。

## 一、词表全谱：七族十八原语（15 首期 + 3 挂账）

命名纪律先行：原语 id 领域无关（docs/22、principles §12），法律/汇报语义只存在于 schema 数据与文案。每个原语 = 一个 renderer 契约：输入 schema 形状 + 交互动词子集 + 实现基质（SVG/HTML）。

### 交互动词全站封闭集（原语只许从中选子集，不许发明新动词）

| 动词 | 语义 | 防呆点 |
|---|---|---|
| `sort` / `filter` | 列排序 / 按维度过滤 | 纯视图操作，永不改数据；筛选态常显（不许"隐形过滤"让用户误判全集） |
| `expand` | 行内展开详情（主从） | 行内展开非弹窗（principles §2b）；展开态不打断键盘 J/K 巡航 |
| `peek` | hover 溯源预览（引语浮层） | 120ms 统一 hover；引语 mono + verifiedBg，永不与 AI 解释混排 |
| `goto-source` | 点击跳原文并高亮 | 溯源必达（principles §6）；无锚字段该动词禁用而非隐藏 |
| `select` | 选中行/节点/单元格看详情 | 单选为主；选中底 bg.selected，不占语义色 |
| `confirm` / `reject` / `amend` | 门禁三动作 | 仅审阅面出现；批量确认硬边界（principles §10：中低危 + 无 tier.c，高危永不入批量）；驳回无批量 |
| `check` | 勾选核对项 | 勾选 = 记录核对事实，不触发任何执行；执行永远另过门禁 |
| `copy` / `export` | 复制 / 导出该面数据 | 导出落案件产出目录（docs/46 裁决 10），不逐次询问 |
| `zoom` / `pan` | 缩放平移 | **仅图谱类沙盒**（docs/46 全局层裁决），其余原语禁用 |
| `edit` | 结构化字段编辑 | 仅叙事族 document 与表单族；schema 级修正非自由文本（principles §4） |
| `drag` | 拖拽排布/移列 | 拖拽只产生**提案态**（如看板移卡 = 状态变更提案），落定过确认；图谱拖拽仅排布不改数据 |
| `page` | 版面翻页/section 跳转 | 仅叙事族组合页；数据面用滚动不用分页 |

不存在的动词（结构性排除）：`delete`（全站无删除，docs/46 裁决 7）、`regenerate`（docs/46 排除）、自由缩放文字、任意重排版面。

---

### 族一：数据密度族（3 原语）

**1. `table` — 数据表格**（矩阵审阅归此，作 `matrix` 变体）

- 语义定位：同构记录数组（`items: T[]`，T 字段扁平、列语义一致）；`matrix` 变体 = 行 × 列交叉审阅（`rows × columns × cells`，单元格自带 severity/sourceAnchor），既有矩阵审阅工作面即此变体。
- 动词子集：sort、filter、select、peek、goto-source、export；matrix 变体加 confirm/reject（单元格级审阅）。防呆：金额右对齐 + mono + tabular 是列宽纪律不是可选项。
- SVG vs HTML：**HTML `<table>`**。语义化、可及性、复制粘贴、导出 docx 表格一一对应；SVG 画表格是负资产。虚拟滚动/列管理按 docs/46 裁决 4 触发式引 AG Grid。
- 法律实例：合同风险矩阵（10×7 条款 × 风险维度）。汇报实例：合规报告的义务履行对照表（义务 × 履行状态 × 证据）。

**2. `list` — 紧凑清单 / 主从列表**

- 语义定位：异构或长文本记录数组，每条有"一行摘要 + 展开详情"两态（`items: {summary, detail, status?, sourceAnchors}`）。principles §2b 紧凑列表范式的原语化收编——风险清单、FileOpsPlan 整理计划表、执行报告的事实形态皆此。
- 动词子集：sort、filter、expand、peek、goto-source、select、confirm/reject/amend（带 status 的审阅变体）、copy。防呆：单行省略号截断，完整内容只在展开行；J/K/⏎/⇧⏎ 键盘巡航（principles §7）。
- SVG vs HTML：**HTML**。展开动画、文本流、无障碍全是 HTML 主场。
- 法律实例：S1 风险清单（severity 徽章 + 法理之线 + 展开依据 + 门禁三动作）。汇报实例：周报条目清单（本周事项 + 展开明细 + 数据来源锚点）。

**3. `compare` — 并排对照**

- 语义定位：两个同构对象的字段级对照（`left/right + diffs[]`）；S5 合同对比（docs/40）与"两版本工作稿对照"的原语。与叙事族 revision 的分工：compare 是**结构化字段**对照（左右双栏），revision 是**文档流内**修订痕迹。
- 动词子集：filter（只看差异项）、select、peek、goto-source、export。防呆：差异高亮消费 revision.insert/delete 双色（心智复用），不新增色。
- SVG vs HTML：**HTML 双栏 grid**；连接线（差异项左右连线）可用内联既有 SVG 标记管线绘制。
- 法律实例：合同两版本条款对照（S5）。汇报实例：本期 vs 上期指标对照（复盘报告"计划 vs 实际"）。

### 族二：时序族（2 原语 + 1 挂账）

**4. `timeline` — 时间线**（既有，表格式）

- 语义定位：时间戳事件序列（`events: {date, actors, description, markers, sourceAnchors}[]`）。docs/43 已裁：表格式贴合法律叙事（Wexler/Clearbrief 同行印证），沿用手绘。
- 动词子集：filter（按主体/文书/矛盾点，docs/46 已登记缺口）、expand、peek、goto-source、select、export。防呆：矛盾 marker 消费法理之线，日期列 mono + tabular。
- SVG vs HTML：**HTML 表格式**为体；法理之线/marker 为既有 2px 线规格。
- 法律实例：案件事实时间线（47–数百事件 + 矛盾点标记）。汇报实例：项目复盘的里程碑年表（节点 + 偏差标注）。

**5. `schedule` — 日程/期限板**

- 语义定位：面向未来的带截止语义条目（`entries: {due, kind, priority, ruleRef}[]`），时效族（docs/48：开庭/举证/上诉期，期限计算零 LLM）与首屏日程看板（docs/49 六章）的消费原语。与 timeline 的分工：timeline 回看事实，schedule 前瞻义务。
- 动词子集：filter、select、peek、confirm（确认已知悉/已办理，产生留痕事件）、export。防呆：临期告警消费 severity（时效属审阅面，语义色合法）；**到期计算永远来自确定性规则引擎字段，renderer 不做任何日期运算**。
- SVG vs HTML：**HTML**（列表/周视图两密度）；月历网格亦 HTML grid，不上 SVG。
- 法律实例：本案期限板（举证截止/开庭/上诉期倒计时）。汇报实例：团队周报的下周日程段。

**6. `gantt` — 轨道式时距图**【挂账】

- 语义定位：多主体并行区间的重叠密度呈现（`spans: {actor, start, end}[]`）。docs/43 已裁：轨道能力当前无场景消费，Stage 2 出现"多方谈判/多案并行"叙事需求再评估。
- 动词子集：filter、select、peek、goto-source。zoom 不开放（数据区静止，时间窗按声明预设档位切换而非连续缩放）。
- SVG vs HTML：**SVG**（区间条与时间轴是坐标绘制，走 P-4 原生绘制管线）。
- 法律实例：多案并行审限总览。汇报实例：项目复盘的阶段甘特。

### 族三：关系族（3 原语）

**7. `graph` — 关系图谱**（既有，G6 5.x）

- 语义定位：节点边网络（PartyGraph：`nodes/edges + 关系类型 + sourceAnchors`），层次布局默认（docs/43 裁定），怎么画归 `courtworkG6Theme(tokens)`。
- 动词子集：select、peek、goto-source、zoom/pan（唯一缩放沙盒）、filter（图例显隐，docs/46 已登记）、drag（仅手动排布逃生舱，不改数据）。
- SVG vs HTML：G6 渲染管线（库内 Canvas/SVG），主题皮肤自控——"自研边界画在主题映射函数"（docs/43 §5.2）。
- 法律实例：当事人/股权穿透图谱。汇报实例：跨部门协作关系图（合规报告的责任主体网络）。

**8. `tree` — 层级树 / 大纲**

- 语义定位：严格单亲层级（`root + children 递归`），缩进列表呈现——文书结构大纲、卷宗目录、组织架构、论点层级。与 graph 的分工：graph 表网状多亲关系，tree 表纯层级；tree 是 HTML 缩进列表不是图布局，成本低一个量级。
- 动词子集：expand（子树折叠）、select、peek、goto-source、filter。防呆：层级深度声明上限（建议 ≤4），超深自动截断为"展开更多"。
- SVG vs HTML：**HTML 缩进列表**（working folders 文件树已是先例）；连接竖线用 border 不用 SVG。
- 法律实例：答辩状论点大纲（争议焦点 → 论点 → 依据）。汇报实例：合规报告章节结构导航。

**9. `flow` — 泳道流程图**

- 语义定位：有向步骤序列 + 可选泳道分组（`lanes[] × steps[] + transitions`）——诉讼可视化三原图之一"程序结构图"（docs/43 引中文实务共识）的原语位，也是审批流的呈现位。步骤有限（≤20）、拓扑由 schema 声明，布局确定性（横向步进 + 泳道分行），**不做自由画布**。
- 动词子集：select、peek、goto-source；当前步骤高亮为只读状态呈现，流程推进永远由门禁动作驱动，flow 本身零执行动词。
- SVG vs HTML：**SVG**（节点/连线/箭头坐标绘制，Lucide 1.35px stroke 同规格线宽体系，走 SVGO/manifest 流水线）；泳道标签行可 HTML 混排。
- 法律实例：本案程序结构图（一审 → 上诉 → 再审节点与当前所处位置）。汇报实例：OA 审批流状态卡（S7"自动到门禁为止"的可视面）。

### 族四：叙事族（3 原语）

**10. `document` — 文档页**（既有起草画布）

- 语义定位：结构化文书流（标题/段落/引用块），编辑态 + 冻结只读态双态；编译为 Word 冻结仪式（principles §8）。
- 动词子集：edit（结构化）、select、peek、goto-source、export（编译仪式专属路径）。
- SVG vs HTML：**HTML**（contentEditable 结构化渲染态）。纸面 radius 0、bg.raised。
- 法律实例：答辩状起草画布。汇报实例：合规报告正文章节的起草面。

**11. `revision` — 修订痕迹预览**（既有）

- 语义定位：带 diff 语义的文档流（insert/delete 痕迹 + 批注锚点），红删蓝增忠实 Word 心智（docs/31 裁定）。
- 动词子集：confirm/reject/amend（逐条 + 合规批量）、expand（依据）、peek、goto-source、export（审阅稿）。
- SVG vs HTML：**HTML**。
- 法律实例：合同修订预览。汇报实例：报告稿的上级批改回执面（Stage 后话，形态同构）。

**12. `narrative` — 叙事版块（幻灯段落）**

- 语义定位：S11 的核心新增——"类 PPT 版面"的最小叙事单元：`{heading, lede?, bullets?, metricRefs?, figureRef?}`，即"一屏一个论点"的段落块。单独可用（管理层简报 = narrative 序列），更常作为 §三 组合页的 section 内容。Gamma 的印证：card 从**有限 layout 集**选版式、AI 只填内容不碰样式，与握手协议同构——narrative 声明位只开放 `variant: statement | bullets | figure-left | figure-right` 四版式，无自由定位。
- 动词子集：page（块间跳转）、peek、goto-source、copy；无 edit（叙事文字的修改走 document 起草面或 amend 事件，不在版面上直改）。防呆：AI 起草的叙事文字全程带 generated 视觉通道（sans + generatedBg），嵌入的指标/引语走 verified 通道（mono + verifiedBg）——一页之内两通道并存且永不混用（principles §11）。
- SVG vs HTML：**HTML**；figureRef 指向的图表位嵌 SVG（chart 原语产物）。
- 法律实例：结案汇报的争议焦点页（论点 + 三要点 + 时间线缩略图引用）。汇报实例：管理层简报"本季合规态势"页（结论句 + 指标卡引用 + 趋势图引用）。

### 族五：表单族（3 原语）

**13. `form` — 结构化表单**

- 语义定位：LLM 预填、人来校正确认的参数表（`fields: {label, value, source?, editable, validation}[]`）——S10 计算器族"LLM 只做填表员"（docs/48）的呈现位：参数从卷宗抽取 SourceAnchor 预填 → 用户核改 → 脚本计算。
- 动词子集：edit（字段级）、peek（预填值溯源）、goto-source、confirm（提交进计算/流程）。防呆：预填值必带来源标记，无源预填以空值 + 占位提示呈现而非假装有值；提交前校验失败字段就地标注（severity 消费合法：表单校验属审阅面）；**提交永不直接触发不可逆动作**，产物仍是待确认 artifact。
- SVG vs HTML：**HTML**（原生 input 族 + 既有 control token）。
- 法律实例：诉讼费计算参数表（标的额预填 + 案由 + 程序类型）。汇报实例：周报模板字段面（本周数据接口预填、叙事栏待起草）。

**14. `checklist` — 核对清单**

- 语义定位：逐项核对事实记录（`items: {text, checked, evidence?, sourceAnchors}[]`）——S9 招投标资质核对、庭前准备清单。与 list 的分工：list 呈现"系统产出待审阅"，checklist 记录"人核对过什么"。
- 动词子集：check（核对留痕，可撤销勾选=同样留痕）、expand（证据）、peek、goto-source、export。防呆：勾选零执行语义；全部勾完只解锁下游门禁按钮的可用态，不自动触发任何事。
- SVG vs HTML：**HTML**。
- 法律实例：投标响应文件核对单（资质项 × 是否齐备 × 出处页码）。汇报实例：复盘报告的整改项核销单。

**15. `gate` — 确认门禁卡 / 审批卡**

- 语义定位：既有门禁组件（principles §4）升格为词表原语：三态徽章（pending/confirmed/rejected）+ 三动作 + 依据区。审批流卡 = gate 序列 + flow 原语组合（每级审批一张 gate，流转位置由 flow 呈现），不另造原语。
- 动词子集：confirm/reject/amend、expand（依据）、peek、goto-source。防呆全套既有：高危不入批量、驳回无批量、门禁未清空下游禁用并注明剩余数（principles §4/§10）、settleFlash 150ms 落定光效。
- SVG vs HTML：**HTML**。
- 法律实例：定稿前风险处置门禁栈。汇报实例：报告发布前的数据核验门禁（"3 项数据来源待确认"）。

### 族六：指标族（3 原语，其一含挂账变体）

**16. `statcard` — 统计卡**

- 语义定位：单值指标 + 语境（`{label, value, unit, delta?, sparkRef?, sourceAnchor}`）——提效可视化首屏候选（docs/53："本周它帮我核了 40 处引用"）与 S11 简报数字位。
- 动词子集：peek（值的口径与来源）、goto-source、select（联动明细面）。防呆：**delta 升降不消费红绿语义色**（涨跌非风险处置，语义预算不外借）——升降用中性箭头图形 + 文字，只有当 schema 明示"超标/达标"判断字段时才经 severity/gate 消费彩色。
- SVG vs HTML：**HTML 卡**；sparkline 迷你趋势为内嵌 SVG（原生绘制）。
- 法律实例：案件工作量卡（已核引用数/已审条款数）。汇报实例：周报头部三卡（完成事项数/风险数/超期数）。

**17. `chart` — 统计图**（bar / line / area / donut 四子型封闭）

- 语义定位：一维分类或时序聚合数据（`series[] × categories[]`），子型由声明指定不由模型选。子型封闭且刻意窄：不做散点/雷达/3D/双 Y 轴（工作汇报语境的 slop 高发区）；占比优先用水平堆叠条，donut 仅单序列 ≤5 类时合法。
- 动词子集：peek（数据点浮层：值 mono + tabular）、select（联动）、filter（序列显隐图例）、export（SVG/PNG）。防呆：数据区静止——**零入场动画、零 hover 弹跳**，hover 仅浮层与 120ms 变色；坐标轴刻度 mono + tabular；网格线 hairline 点阵化（Craft 参照，docs/43 §1.2）。
- SVG vs HTML：**SVG**（docs/43 分诊：轻量走 Observable Plot 声明式 marks 直吃 token 色值；重仪表盘 Stage 2 再评 ECharts）。
- 法律实例：结案汇报的诉请金额 vs 判赔金额对比条。汇报实例：月度合规事件趋势线。

**18. `progress` — 进度与用量**（`heatmap` 变体挂账）

- 语义定位：完成度/占用度（`{done, total}` 或分段占比）——既有 progress 卡与用量圆盘的原语化；`heatmap` 变体（日历热力：案件活动/用量密度，首屏模块候选 docs/49 六章）挂账，等首屏模块位落版同批。
- 动词子集：peek、select；heatmap 变体加 goto-source（点格子跳当日活动）。
- SVG vs HTML：进度条/圆盘 **SVG**（既有 12px 圆盘规格）；heatmap 为 SVG 网格。
- 法律实例：摄取进度（17/17 文书已识别）。汇报实例：季度目标完成度条。

### 族七：看板族（1 原语，挂账）

**19. `board` — 状态看板（kanban）**【挂账】

- 语义定位：按状态枚举分列的卡片集（`columns: status[] × cards[]`）——任务/派发管理的呈现位。挂账理由：MVP 单律师视角无任务分派需求（docs/46：dispatch 归 Stage 2 团队协作层），S11 项目状态板需求可先由 `table` + status 列覆盖；Stage 1 派发/团队场景立项时上架。
- 动词子集：filter、select、expand、peek、drag（移卡 = 状态变更**提案**，落定过 confirm——看板永不"拖了就改"）、export。
- SVG vs HTML：**HTML**（列 grid + 卡片流）。
- 法律实例：团队案件任务板（待办/进行/待审/完成）。汇报实例：项目复盘的事项状态板快照（导出为静态页）。

### 词表速览

| 族 | 原语 | 状态 | 基质 |
|---|---|---|---|
| 数据密度 | table（含 matrix 变体）、list、compare | matrix 既有；list/compare 待上架 | HTML |
| 时序 | timeline、schedule、gantt | timeline 既有；schedule 待上架；gantt 挂账 | HTML / HTML / SVG |
| 关系 | graph、tree、flow | graph 既有；tree/flow 待上架 | G6 / HTML / SVG |
| 叙事 | document、revision、narrative | document/revision 既有；narrative 待上架 | HTML |
| 表单 | form、checklist、gate | gate 组件既有待升格；form/checklist 待上架 | HTML |
| 指标 | statcard、chart、progress（heatmap 变体挂账） | progress 部分既有；statcard/chart 待上架 | HTML+SVG / SVG / SVG |
| 看板 | board | 挂账 | HTML |

基质总结：文本与记录归 HTML，坐标与图形归 SVG（原生绘制纪律的自然分界）；全表无 Canvas 除 G6 库内管线。

## 二、token 边界：词表 token 增量清单

原则：能复用既有 token 的一律复用；真实增量只有四组，逐项供架构过目。

### 2.1 新增组一：`color.data.*` — 数据可视化色阶（chart/progress/heatmap 消费）

语义色白名单纪律不可挪用：红/琥珀/蓝/绿是**处置状态**，图表序列是**数据类别**，两者混用会让"第三根柱子是红的"被误读为风险。提案独立数据色组，与语义预算物理隔离：

- `color.data.mono[1..5]`：**单色系默认阶**——ink #0A2540 按固定比例向 bg 混合派生 5 档（Craft/beautiful-mermaid"两色派生"同构，docs/43 §1.2；单序列图表、进度、sparkline 一律用此，零新增色相）。
- `color.data.categorical[1..6]`：**分类阶，至多 6 档**——从藏青/冷青/灰蓝/板岩低饱和冷调族派生，**刻意避开纯红/正绿/琥珀色相区**（语义预算保护：数据色永远不与状态色撞脸）；超过 6 序列的图表声明非法（防 slop：工作汇报不需要 7 色图例）。
- `color.data.ramp[1..5]`：**连续阶**（heatmap 变体用）——ink 透明度阶，同 longTaskGlow 的"既有色生成"思路，零新色相。
- 例外通道：当数据本身承载处置判断（超期/合规/高危分布）时，经 schema 明示的判断字段消费 `semantic.*.graphic`——彩色仍只表状态，路径合法。

### 2.2 新增组二：`component.table.*` — 表格密度补充

- 复用为主：行高/列头/字号全部复用 `component.listRow`（28–32px 档）与 `type.dense`；网格线复用 `component.gridline`。
- 增量仅两项：`table.zebra`（斑马纹）——**默认关**：hairline 行分隔线是既有纪律，斑马纹仅在宽表（≥6 列且无展开行）可声明开启，取值锁 `bg.surface`（不新增色）；`table.headerSticky`（列头吸顶开关，长表默认开）。
- 数字列纪律无增量：mono + tabular + 右对齐已是 principles §2b 成文。

### 2.3 新增组三：`layout.report.*` — 报告版面栅格（叙事族组合页消费，§三详述）

- `layout.report.maxWidth`：内容页宽 720–840px 档（屏内预览与 A4 导出双适配，reading 15px 行长约 38–42 中文字符的可读性档）。
- `layout.report.grid`：**6 列简化栅格**（不做 12 列——词表版面只需要 1/2/3 分栏与 2:1 主次栏，6 列全覆盖且防自由布局 slop）。
- `layout.report.sectionGap` = space.12（48px）、`columnGap` = space.6（24px）：全部落在 4/8 基阶，零新数值概念，只是命名位。
- `layout.report.pageBreak`：导出分页提示位（`auto | avoid | before`，§3.3）。

### 2.4 新增组四：`typography.scale.metric` — 指标大数字（statcard 消费）

- 提案：28px / lineHeight 1.2 / weight 510 / mono + tabular。现有字阶顶格 display 20px 是"工作台标题"上限，指标卡数字是**数据不是标题**，需要独立档；28px 不破"工作台不需要更大的字"的标题纪律（它不是字，是数）。此为全清单唯一需要架构真正裁量的新数值。

### 2.5 明确零增量的部分

- 时序/关系/表单/看板全族：法理之线、severity/gate/tier、provenance 双通道、listRow、control、motion 全套复用；schedule 的临期告警、form 的校验错误、gate 三态皆在语义色白名单既有行内，**白名单不加行**。
- 导出面字阶（报告标题 24px+ 之类）：归 output 管线的 docx/PDF 模板管辖（docs/07 既有轨道），**不进 UI token**——屏内预览一律现行字阶，纸面另说。
- 动效：全词表零新动效 token；chart 零入场动画由 `motion.dataRegion: none` 既有硬性覆盖。

## 三、排版架构：原语如何组合成页

### 3.1 组合代数：三个操作符，嵌套至多两层

参照 Vega-Lite 的组合代数（layer/concat/facet/repeat 四操作符可嵌套成任意多视图，[IDL 论文](https://idl.cs.washington.edu/files/2017-VegaLite-InfoVis.pdf)、[官方 composition 文档](https://vega.github.io/vega-lite/docs/composition.html)）——只借设计形状不引依赖（pi-mono 判例同）。我们取其三、弃其一：

- **`section`（纵向串接 ≈ concat）**：页 = section 流，每 section = 标题 + 一个原语或一个 grid。这是唯一的页级结构。
- **`grid`（横向并置）**：section 内 1/2/3 分栏或 2:1 主次栏（6 列栅格的合法切法枚举），格内放原语实例。
- **`repeat`（数组映射）**：同一原语按 schema 数组自动重复（如"每个争议焦点一个 narrative 块"），声明写一次，实例数据定。
- **弃 layer（叠加）**：无图层叠加需求，叠加是自由画布的入口，封闭词表不开。

嵌套上限硬性：`page → section → grid → primitive` 到此为止，grid 内不得再嵌 section/grid。防 slop 依据：Gamma 的实践印证有限版式集足够——其 card 版式从有限选项集选取、内容自适应高度、AI 不做自由定位（[Gamma card-based layouts](https://gamma.app/explore/content/guides/ai-presentation-tool-card-based-layouts)、[smart layouts 品牌一致性](https://gamma.app/explore/content/guides/how-gammas-smart-layouts-keep-your-presentations-sites-and-docs-on-brand)）；Notion 的数据库视图形状（同一数据源切 table/board/timeline/calendar 视图）给出另一条重要形状：**原语是视图不是部件**——同一 schema 可声明多个原语呈现（时间线数据既可 timeline 也可 schedule），切换是声明位不是数据复制。

### 3.2 声明形状（伪码，schemas 包立案时细化）

```
uiTemplate:
  kind: page                      # 或 single（单原语直挂 PreviewHost，现状五工作面即 single）
  sections:
    - title: 本周概览
      grid: { cols: [1,1,1] }     # 三等分
      cells: [ {statcard: …}, {statcard: …}, {statcard: …} ]
    - title: 事项明细
      primitive: { list: …, verbs: [filter, expand, goto-source] }
    - repeat: { over: $.focusPoints, primitive: { narrative: {variant: bullets} } }
  export: { pageBreak: section, docx: true, pdf: true }
```

纪律映射：`kind: single` 向后兼容既有五工作面零改动；`verbs` 只许列原语动词子集的再收窄（声明可减不可加）；section 序即渲染序（docs/53 裁决三"先渲染哪个模块由声明的模块序决定"同律）。

### 3.3 分页与导出：走既有 output 管线的四条约束

1. **导出 = 单向编译**（docs/23 同律）：组合页导出 PDF/docx 是产出动作过门禁，不是"另存为"；HTML 预览面与导出物同源（同一 artifact + 同一声明），不许出现"屏上一套纸上一套"。
2. **交互全退化**：导出面一切动词消失；有展开态的原语按声明的快照策略落纸（`exportState: expanded | summary`，默认 summary + 附录全量）；溯源锚点在 docx 退化为脚注/尾注引用（output 包既有批注轨道），在 PDF 退化为页码引用。
3. **SVG 直通红利**：chart/flow/gantt/progress 皆原生 SVG，进 PDF 矢量直嵌、进 docx 走 SVG→EMF/内嵌通道，零栅格化损失——"SVG 一切原生绘制"纪律在导出面兑现回报。WPS 兼容性（五自研节点之一）需在 output 包为 SVG 嵌入补一组 golden files。
4. **分页只在 section 边界**：`pageBreak: avoid` 的 section 整体搬页；原语内部（长表格/长清单）跨页由 output 管线按行切并重复表头——分页逻辑长在 output，renderer 不感知纸张。纸面色纪律：bg.app 冷灰不出纸面，纸面白底 + 语义色 fg 轨照旧（打印 AA 天然满足）。

### 3.4 frontier 形状速记（只取形状）

- **Gamma**：卡片流式版面 + 有限版式集 + AI 只填内容——narrative 原语与 §3.1 嵌套上限的直接参照。
- **Notion / 飞书文档**：block 纵向流 + 数据库多视图——section 流与"原语是视图"的参照；其图表配置克制（选类型与维度，不选颜色）与我们 chart 声明位同构（docs/43 §1.3 已记）。
- **Coda**：building blocks 可组合但公式层复杂——反面参照：我们不开放表达式/公式层，一切计算在 schema 上游（确定性脚本）完成，版面只呈现。
- **Linear Insights / BI 仪表盘**：卡片栅格 + 只选 chart 类型与 filter、样式零自由——statcard/chart 栅格页的参照。
- **Vega-Lite**：组合代数的嵌套形状（如上）；其"grammar of graphics 全开放"的另一半（任意 mark × encoding 组合）刻意不取——我们的 chart 子型封闭，正是把 Vega-Lite 的表达力换成防呆。

## 四、上架批次建议

### 4.1 既有五 renderer 归位（零改动，正名）

timeline → 时序族；graph → 关系族；矩阵审阅 → 数据密度族 table 的 matrix 变体；修订预览 → 叙事族 revision；起草画布 → 叙事族 document。另 gate 门禁与 progress 已是既有组件，升格登记即可。词表 v1 起点 = 7 个已在架原语。

### 4.2 第一批补 4 个上架单位（3–5 个之内，按覆盖率排序）

1. **`list`（紧凑清单/主从）**——性价比之王：principles §2b 范式已成文、S1 风险清单与 S6 整理计划表已是事实实现，工作量近于"收编正名 + 契约化"；收编后 S11 周报条目、S9 核对结果、执行报告全部白拿。
2. **`form` + `checklist`（表单族合单）**——S10 计算器族第一批 7 项（docs/56 已回册）的唯一前置缺口：CalcArtifact 有了，参数确认面没有；checklist 同族同批顺手，解锁 S9 招投标核对。这是"确定性工具族"从 schema 到可用的最后一公里。
3. **`statcard` + `chart` 最小版（bar/line 两子型 + data.mono 色阶）**——S11 汇报的硬需求 + 提效可视化首屏候选（docs/53 已登记模块位）双消费方；Observable Plot 路线 docs/43 已裁，选型零悬念；donut/area 与 categorical 色阶随真实需求二批。
4. **`section/grid` 组合容器 + `narrative`**——S11 从"散卡"变"可交付页"的地基：没有组合页，前三项只是右栏卡片；有了它，周报/复盘/简报 = 声明一页纸，且 export 走 output 管线打通"屏内确认 → 纸面交付"闭环。此项是四者中唯一动 PreviewHost 宿主契约的（kind: page），建议排最后、吃前三项的实装反馈。

### 4.3 二批及挂账

二批候选：schedule（时效族 UI 面，等期限规则引擎）、tree（答辩状大纲/卷宗目录，成本低随时可插队）、compare（等 S5 排期）、flow(等 S7/审批场景)。挂账维持：gantt（docs/43 触发条件未到）、board（Stage 1 团队协作）、heatmap（首屏模块位落版同批）。

### 4.4 覆盖率自查

第一批完成后：S9 = checklist + list + gate ✓；S10 = form + table + gate ✓；S11 = section/narrative + statcard + chart + list + timeline ✓；法律五工作面 = 既有 ✓。三个目标消费方场景族全部达到"声明即上架、零新机制"的 docs/48 承诺线。

---

## 来源清单

外部（形状参照，无依赖引入）：
- [Gamma：card-based layouts（有限版式集 + 内容自适应）](https://gamma.app/explore/content/guides/ai-presentation-tool-card-based-layouts)
- [Gamma：smart layouts 与品牌一致性（AI 不碰样式）](https://gamma.app/explore/content/guides/how-gammas-smart-layouts-keep-your-presentations-sites-and-docs-on-brand)
- [Gamma：flexible card layout（卡片流替代幻灯）](https://gamma.app/explore/content/guides/gamma-flexible-card-layout-presentations)
- [Vega-Lite: A Grammar of Interactive Graphics（IDL, InfoVis 2017——组合代数原文）](https://idl.cs.washington.edu/files/2017-VegaLite-InfoVis.pdf)
- [Vega-Lite 官方 Composition 文档（layer/concat/facet/repeat）](https://vega.github.io/vega-lite/docs/composition.html)
- [Vega-Lite View Specification（spec 嵌套形状）](https://vega.github.io/vega-lite/docs/spec.html)

内部依据（复述，未重新论证）：docs/49 第三/四/六/七章、docs/53（握手协议与模块序裁决）、docs/32-设计语言包（tokens.json / principles.md）、docs/43（可视化选型与 Craft 拆解）、docs/46（控件普查与十项裁决）、docs/48（S9–S11 场景族）、docs/56（S10 回册）、docs/23（单向编译）、docs/40（S5）、docs/22（命名领域无关）、apps/desktop/SPEC.md（PreviewHost 双宿主契约）。
