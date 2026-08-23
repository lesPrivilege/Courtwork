# DATA-FACE-GRID-1 · 数据面由逐行 grid 收敛为单一栅格

状态：**提案待批准。** 批准行 `DFG-S01` 尚未冻结；在架构角色批准档位与提案行之前，实现不得开工。
本票由 `GUI-UNIFIED-POLISH-1` 第七节第 2 条转出，只处理该条留下的结构性两难。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/principles.md`、`docs/design/tokens.json`、
`docs/design/visualization-kit.md`、`GUI-UNIFIED-POLISH-1`、本票。成熟度只认
`docs/status/current.md`；本票不替代 `PI-BASE-GUI-ACCEPT`，不赋予 Agent、product-live 或
external-validated 口径。

## 一、待解的两难

`GUI-UNIFIED-POLISH-1` 把矩阵面与整理计划表的截断清到零，时间线与风险面则未能清干净。原因不是
取值没调好，是两条已签署的律在**逐行 grid** 这一结构上不可兼得：

- **密度律**：`de-slop` 基线锁 `.risk-list .dense-row` 高 `28–34px`。散文列一折行即破
  （实测风险摘要 51px、时间线事件 71px）。
- **量度律**（`GUP-S01`）：列量度由真实内容定，不得截断。

单行且不截断，只剩「把列宽撑到内容宽」一条路。而 `.timeline-grid` 与 `.risk-grid` 是**每行各自
一个 grid**——同一模板在每个 `<button>` 上重复声明，跨行对齐全靠模板里的 px 字面量。CSS 的
`max-content` 在这种结构下只看得见本行，跨行不通约，故只能把列宽钉成常数。钉常数就必须取
全表最宽那一行（实测时间线事件列 856px），于是又把面推成两屏横滚。

三条路互斥，是结构造成的，不是取值造成的。现行留下的残余：风险摘要 6 处截断、长事件若干截断、
时间线来源列须横滚 176px 才见。

## 二、结构事实

| 面 | 现行结构 | 跨行对齐靠什么 |
|---|---|---|
| 时间线 `.timeline-grid` | `.table-head` 一个 grid ＋ 每个 `.dense-row` 各一个 grid | 模板内 px 字面量 |
| 风险 `.risk-grid` | 同上 | 模板内 px 字面量 |
| 矩阵 `.matrix-wrap table` | 真 `<table>` | 浏览器表布局 |
| 整理计划 `.file-ops-table` | 真 `<table>` | 浏览器表布局 |

两张真表在 `GUI-UNIFIED-POLISH-1` 里改 `table-layout: auto` ＋ `width: max-content` 后截断即归零，
一次到位；两处逐行 grid 则只能逼近。**结构不同是唯一变量**，取值与工时都不是。

`display: contents` 不是出路：`.dense-row` 与 `.timeline-grid` 的行本体是 `<button>`，
`display: contents` 会连同它的盒、hover、`selected` 底色与焦点环一并抹掉。

## 三、待批准的提案行

### `DFG-S01`（档位：schema-workface）

> 时间线与风险两面由「每行一个 grid」收敛为「整面一个栅格」，使列宽跨行通约：
> 列量度由真实内容一次定出，散文列单行不折，溢出走既有 `.static-viewport` 单层横滚。
> 行本体保持可点、可选中、可聚焦，行高维持 `de-slop` 基线的 `28–34px`。
> 不改数据、不改列序、不改列语义、不改锚点与「回到原件」链路，不新造 token、色值、
> 阴影档、圆角档或组件族；数据区维持静止、零新装饰、语义色稀缺。

两条候选实现路径，取一由架构角色定：

- **甲 · 改真 `<table>`**：与矩阵、整理计划两面同构，跨行对齐交给浏览器表布局，
  与本仓已验证的两处做法一致。代价是行本体由 `<button>` 变 `<tr>`，点击与键盘可达须另接，
  且 `.dense-row` 的既有样式与残留门断言面须随迁。
- **乙 · 整面一个 grid ＋ 行内子网格**：外层 `display: grid` 持 `grid-template-columns`，
  行用 `grid-column: 1 / -1` ＋ `display: grid; grid-template-columns: subgrid`。
  行本体仍是 `<button>`，交互与样式零迁移；代价是依赖 `subgrid`，须先核宿主
  WKWebView 版本是否满足，核不过即回落甲路。

**开工前置**：`subgrid` 的宿主可用性须以真实 Tauri/WKWebView 实测定谳，不得以浏览器预览代答；
实测未出之前两路都不冻结。

## 四、退出证据（批准后补全）

- 截断实测：时间线与风险两面改前改后各一份逐类计数，目标为零。
- 密度实测：两面行高全量取样，须全部落在 `28–34px`；`de-slop` 基线门不得放宽。
- 横滚实测：整行宽、面宽与 `maxScrollLeft` 三值，并记明来源列在默认视口内是否可见。
- mutation：把列宽改回 px 字面量后，量度门须转红。
- 独立验收：不同会话 clean clone 复跑，不复用实现会话读数。

## 五、禁止扩张

不借本票改主题、copy、runtime、schema、provider、成熟度或 Work diff；不改矩阵与整理计划两面
（已由 `GUI-UNIFIED-POLISH-1` 收口）；不借结构改造顺手加排序、筛选、列宽拖拽或任何新交互。
