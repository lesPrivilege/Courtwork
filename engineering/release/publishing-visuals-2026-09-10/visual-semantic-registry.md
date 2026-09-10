# Visual semantic registry · 草案

状态：草案，用户接受后迁入 `engineering/design/visual-semantic-registry.md`。依据 intake VG-1、VG-4、VG-5。

每张图都要引用这里的 `id`。`meaning` 回指权威定义，本页不另行定义；`status` 取 `shipped` / `recorded` / `research` / `concept`；`figure` 列出现有承载。SE 引文指 Schema Engineering `papers/src/canonical.md`（9.6）。

## 通用禁忌

- 不画 AI 大脑、吉祥物、小人围桌或经理 / 下属 agent 层级。
- 不把人画成被替代者；画出决定门的图，门处必须有人（VG-19）。
- 不画法律刻板符号（天平、法槌、印章）；法律只是高要求实例（SE `:69`）。
- 不把三层画成三个等价的数据库圆柱。
- 颜色不单独承载状态，去色后仍须可读。
- 红色只按 intake VG-15 使用：冷灰之上唯一的稀疏信号，只标记需要人的那一处。

```yaml
- id: matter
  meaning: 工作本身；Session 是临时交互窗口，Run 是可替换的执行尝试（SE :250）
  status: shipped
  figure: FIG. 00 hero 纸层（concept study）
  motifs: 长期存在、内部持续积累版本与决定的结构空间；被剖开的档案 / 工作台
  avoid: 数据库、聊天窗口、文件夹图标

- id: event
  meaning: Committed Event Ledger，状态转换的权威记录（SE :366）
  status: shipped
  figure: 01 Anatomy 仪器 · Event log
  motifs: 连续、只增不改的轨迹；带时间刻度的线
  avoid: 可编辑列表、聊天气泡

- id: state
  meaning: Current Semantic State，事件的确定性投影，保存权威版本引用（SE :349, :366）
  status: shipped
  figure: 01 Anatomy 仪器 · Work state
  motifs: 经治理的结构体，边界清楚、可重建
  avoid: 摘要文本块、一份越来越长的笔记

- id: context
  meaning: Context Projection，为当前 Assignment、role、task stage 编译的最小充分工作集（SE :25）
  status: shipped
  figure: 01 Anatomy 仪器 · Context
  motifs: 临时的、从更大存量中取出的聚合；会离开
  avoid: 把全部存量塞进一个窗口；“everything loaded”

- id: pipeline
  meaning: Store → Govern → Retrieve → Compile（SE :25, :427-445）；同时解耦总容量与单次注意力成本（SE :27, :526）
  status: concept   # 页面讲的是理念，不宣称产品已有完整四段
  figure: 无（WO-VG-01 首张新 plate）
  motifs: 有状态变化的加工线；Govern 为视觉重心；存量随时间变大，但单次工作集的宽度保持不变
  avoid: 四个等权方块；把 Retrieve 画成已授权（相关性不授予访问权，可读不等于生效，SE :445）

- id: candidate
  meaning: Model / Human Proposal 视为 Candidate Change，可提交、可拒收、可审阅（SE :23, :121）
  status: shipped
  figure: diagram.svg；FIG. 00 · 02 CANDIDATE
  motifs: 尚未落定的一张；与已提交物在材质或线型上可区分
  avoid: 模型输出直接变成结果

- id: evidence
  meaning: 支撑主张的来源锚点，带 provenance
  status: shipped
  figure: diagram.svg 的 gate 标签；05 Evidence 区块
  motifs: 接触痕迹、来源到主张的连线（取 cyanotype 的隐喻，不取蓝色，VG-3）
  avoid: 对勾徽章；置信度仪表

- id: decision
  meaning: 经 validation · evidence · authority · review 后的 Committed change，并更新 state
  status: shipped
  figure: diagram.svg；04 Review 截图
  motifs: 一道门；人在门处；门后才进入持久状态
  avoid: 自动通过；把 review 画成末端装饰

- id: attention
  meaning: CW 义：需要人介入或值得人看的事项（docs/work-core/attention.md）。SE 的注意力预算义归 pipeline
  status: shipped   # scoped triage 与只读事项已交付；ambient 背景工作属于 research
  figure: 04 Review 候选旁 5px 点（唯一红）
  motifs: 大量安静的中性工作里，极少数被提升到人面前的事项；用位置、孤立与字重表达
  avoid: 满屏警报、脉冲、闪烁；红色超出 VG-15（每图至多一处，只标需要人的点）

- id: spark
  meaning: 来源整理 / 派生 / 维护工作；不设第二份 canonical memory（multi-experts README :27）
  status: research  # 自治 Spark 未交付
  figure: 无（第二批，只进 #long-work）
  motifs: 可丢弃、可重建的派生层，覆盖在不变的来源之上；低频沉积
  avoid: 小精灵 / 火花吉祥物；以现在时描绘常驻自治活动

- id: expert
  meaning: Compiled Work Expert，版本化、E2E 验证、权限收敛的激活配置，不是人格化 Agent（SE :29）
  status: research
  figure: pricing Organization 图 · "Expert runtime" 方块（概念定价）
  motifs: 作用于同一 Matter 的可换方法 / 仪器 / 镜片；换 Expert 改变方法，不改变 Matter
  avoid: 一队 AI 头像；多 agent 开会

- id: runtime
  meaning: 执行载体；runtime 负责执行，Expert 负责角色（page.mjs:275）
  status: shipped   # 单一 Pi runtime；第二 runtime 未交付
  figure: 06 Architecture & portability
  motifs: 可替换的 engine / socket；工作留在原处
  avoid: 同时画出多个在用 runtime（未交付）
```

## 已有图对照（VG-7 盘点起点）

| 图 | 概念 | 待核 |
|---|---|---|
| FIG. 00 纸层 | matter、candidate | 三页纸按 Source / Candidate / Matter 平铺，可能把 Source 与 Candidate 画成同类；决定处没有人 |
| 01 Anatomy 仪器 | event、state（Work state）、context | 三投影同为线条变形，材质差异是否足以区分“连续轨迹 / 结构体 / 临时聚合” |
| diagram.svg | candidate、evidence、decision、state | 已含回路（Updated state）；核对 VG-2③ 与 VG-10 |
| pricing 三图 | expert、runtime | `research` 概念出现在概念定价里，核对状态标注是否足够 |
