# FE-05a 交付 · 缺陷基线修复、Shape 语法与 V1 字阶密度

2026-09-10 · Claude Opus，**作者验证**。独立验收另计；本页不代它写结论，也不自称独验。
工单 [WO-CC-round5 §FE-05a](work-orders/WO-CC-round5.md)、[WO-FE05A 派单提示词](work-orders/WO-FE05A-dispatch-prompt.md)。
上游裁定：WK-120（成熟感 = 密度 + 留白对齐 + 层级）、WK-123 (b)（选向 **V1**）、WK-126 ⑦（M-15）、
WK-128（Shape 落地八条）、WK-131 / WK-132（M-16 / M-17）、WK-138 ②（M-18）。
约束表 [type-density-constraints](../../../design/type-density-constraints.md)；对照基线
[type-density-ablation/v1](../../../design/type-density-ablation/v1/README.md)；证据 [evidence/fe05a](../../../../evidence/fe05a/README.md)。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `2e9da09`（派单快照与执行时 HEAD 同值） |
| 分支 | `claude/fe05a-type-density` |
| 树 / 端口 / 数据 | `/private/tmp/se-fe05a` · 8909（fixture 8910） · `/private/tmp/se-agent-fe05a-data` · CDP 20070 / 20071 |

四个产品提交是**因果序**，不是四堆改动：先把三处既有缺陷修好，再落 Shape 语法，
最后才动字阶——所以 V1 的 A/B 对照是「同一个干净几何基线」对「它 + V1」，
而不是「原来的 main」对「FE-05a 的全部」。

| 提交 | 内容 | 视觉角色 |
|---|---|---|
| `0879b32` | `fix(ui): restore density-safe control anatomy` —— M-15 / M-16 / M-17 | 修复既有缺陷 |
| `915cca9` | `refactor(ui): enforce accepted shape grammar` —— WK-128 八条 + `lint-shapes` + SHAPE-* | 立几何语法（**V1 对照的 A 侧**） |
| `c1a4052` | `style(ui): apply V1 typography and control density` —— V1 全站落地 + TYPE-* | 本单真正的字阶 / 密度介入（**B 侧**） |
| （本页提交） | M-18 三档 + 回归证据 + 本页 + `ui-composition-standard` 的 Shape 角色行 | 无产品行为 |

## 2. 改动文件

| 文件 | 改了什么 |
|---|---|
| `app/web/ui-controls.mjs` | `setAction` 收回动作按钮解剖的全部所有权：字形、可见 / sr-only 标签槽位、`aria-label`、tooltip、`icon-only` 类名；新增 `visible` 取短词、`trailing`、`size` 三个选项；`action()` 透传 |
| `app/web/home-view.mjs`、`app/web/surface-modules.mjs` | 三处 `setAction` 之后手改子节点的写法退回 `setAction` 一处（Open / Retry） |
| `app/web/styles.css` | M-15 的 B 态顶带 gutter；`.button-label` 不折行；M-17 的 390 / 触控命中区；Shape 三处同心派生、`.context-group` 拆 `.context-card`、`50%` → `--radius-pill`、`6px` → 派生式、焦点环统一 offset 2；V1 的字阶 / 字重 / 行高 / 字距 / `--control` / `.segment` |
| `app/web/markdown-reader.css` | 六处游离圆角改角色 token 与派生式（外框 10 → `--radius-card` 12，五处 6 写成 `calc(var(--radius-control) - 2px)`） |
| `app/web/settings-view.mjs`、`app/web/workspace-view.mjs` | `context-group` → `context-card`（三处类名） |
| `tools/lint-shapes.mjs`（新） | 静态形状 lint：只允许 token、显式 `0`、建立在形状角色上的派生式；登记表放行有理由的例外；满弧用法列成清单供人工复核 |
| `app/tests/shape-governance.test.mjs`（新） | 一条正向 + 四条反向，`npm test` 带它 |
| `engineering/design/ui-composition-standard.md` | 尺寸表新增 **Shape 角色**一节（六个角色 → token，两条派生规则，circle 例外的显式边界） |
| `evidence/fe05a/`（新） | 本单脚本、三份 measurements、截图、回归全量 |

**未改**：`app/server`、`app/runtime`、`app/core`、`domains`、`brand`、`contracts/*`、`intake-round-3.md`、
`misfit-ledger.md`、`PAPER.md`、`AGENTS.md`、`engineering/current.md`。无新增读取、端点、字段、状态；
无新依赖；无新色、新字体、新图标族、新材质、新阴影、新间距刻度、新动效；不做 V2；不做 `corner-shape`；
`HOME_COMPOSER_CENTRE` 0.56 未动。

## 3. 第 0 项 · 三处既有缺陷（Gate A）

### M-15 · B 态顶带对齐

B 态（1024–1679 的视图切换）里聊天列不在屏幕上，顶带下面那块地方是文档面。顶带仍居中到
740，于是它的内容原点落在 500，而文档面的内容原点在 304 —— 差 196px。

沿 CC-S 对 Settings 顶带的做法：这一态不再居中，顶带与文档面共用一条 gutter（主区起缩
`--col-gap`，面板内容再缩一个 `--col-gap`），gutter 的第一件东西是那个按钮，标题跟在它后面——
与 Settings 里 Back to app 与页名的关系一字不差。

| | 修前 | 修后 |
|---|---:|---:|
| 顶带内容原点 x | 500 | **304** |
| 文档面内容原点 x | 304 | 304 |
| 顶带右缘 / 文档面右缘 | 1416 / 1392 | **1392 / 1392** |

C 态（≥1680 三栏）未动：那一态聊天列还在，740 仍是它的阅读列（BASELINE-1-C-1680 盯住这条）。

### M-16 · 动作按钮解剖

病根不是「V1 把按钮做小了」，是**解剖有三个主人**：`setAction` 建好字形、标签槽位、
可访问名、tooltip 与 `icon-only` 的几何锁，然后三处调用方各自把锁去掉再替换子节点。
任何一次重绘漏掉其中一步，按钮就会既锁着 `--control` 见方的零内边距几何、又装着一行看得见的字。

修法不是加选择器例外，是把五件事收回 `setAction` 一处，并给它「看得见的短词 + 完整可访问名」
（WK-59）与尾置字形两个形态。可见标签一律 `white-space: nowrap`。

产品今天的 Send / Cancel run 是 icon-only 呈现（sr-only 标签 + 字形），因此**没有**给它们写
52 / 84 的 min-width：那是 EX-CC5 在「渲染纯文字」的 specimen 里量得的值，产品里没有这个状态，
写进去就是一条为不存在的呈现服务的死约束。记实测：

| 状态 | 按钮 | 可见标签 | 宽 × 高 | scrollWidth / clientWidth | 折行 | 字形 | aria |
|---|---|---|---:|---:|---|---|---|
| Home idle | `#send-button` | 无（sr-only） | 28 × 28 | 26 / 26 | 否 | 有 | `Send` |
| Work 在跑 | `#cancel-run-button` | 无（sr-only） | 28 × 28 | 26 / 26 | 否 | 有 | `Cancel run` |
| 390 在跑 | `#cancel-run-button` | 无（sr-only） | 44 × 44 | — | 否 | 有 | `Cancel run` |
| Work 决定卡 | `.question-card .request-width` | `Answer` | 77.8 宽 | ≤ | 否 | — | `Answer` |

断言写的是契约而不是这四个数：**带可见标签的按钮不携带 icon-only 几何，且没有一个按钮折行**
（BASELINE-2 / TYPE-4 逐个量当前屏上每一个可见按钮）。重绘之后字形、可访问名与几何逐位相同
（BASELINE-2-redraw）。在跑态由产品自己的路径造出来：composer 打字 → 点 Send → 等 Cancel run 露面。

### M-17 · `.segment` 的 44 命中区

`.segment { min-height: 44px }` 早就写在窄屏块里，但 `.settings-row .segment` 等两级选择器排在它
之后，32 因此赢了 44 —— 390 下实测 39px。把窄屏与触控的命中区写成同样两级的显式规则，
放在全部覆写之后。实测 390：三个选项 32/39 → **44**。

### Gate A 结果

| 检查 | 结果 |
|---|---|
| BASELINE-1 B 态顶带 x 对齐 / C 态未动 | 通过 |
| BASELINE-2 idle Send / 在跑 Cancel run / 重绘后解剖不变 | 通过（可见标签按钮 0 个带 icon-only，折行 0） |
| BASELINE-3 390 Settings / Connections 的 `.segment` ≥44 | 通过 |
| 未修复树上的同一份断言 | **2 / 7**（反例存档 `baseline-checks-counterexample.json`） |
| 本提交是否动了字阶 / 材质 / 颜色 | 否（`git show 0879b32 -- app/web/styles.css` 只有三处规则与一条 `.button-label`） |

## 4. 第 0b 项 · Shape 语法（Gate B）

| WK-128 | 落地 |
|---|---|
| ① 三处同心违例 | popover 内的行、composer 外壳内的输入面、dialog 内的内容井，各写成公理本身 `max(var(--radius-small), calc(var(--radius-*) − inset))`，不是算好的一个数字 |
| ② `.context-group` | 同名两份声明拆开：卡是 `.context-card`（上边距并入卡的规则），不再有第二种 `.context-group` |
| ③ circle | 四处 `50%` 全改 `--radius-pill`（都是正方形，渲染逐位相同） |
| ④ lint 两层 | 静态 `tools/lint-shapes.mjs`；同心作运行时断言 SHAPE-1…7 |
| ⑤ focus ring | offset 统一 2（原 1 / 2 / 4）；弧线交给引擎，只有 `.settings-section` 手写 `calc(var(--radius-card) + 2px)` |
| ⑥ `--radius-control` | 保持 8，不随 28 高联动 |
| ⑦ circle 例外 | 写成显式规则与注释：只给 composer 唯一的浮动主动作；`#new-project-button` / `#home-create-project` 保持圆角矩形，SHAPE-6 盯这条对照 |
| ⑧ `6px` | 不提炼新 token，写作 `calc(var(--radius-control) - 2px)` |

`lint-shapes` 的判据（EX-CS1 §6）：允许六个形状 token、显式 `0`、以及**建立在形状角色上**的
`calc()` / `max()` 派生式；派生式里可以出现别的 token，因为内缩本来就是间距事实。拒绝
`50%`、组件私有的游离数值、以及不建立在任何形状角色上的表达式。确有非派生形状的先进登记表
（今天一条：用户消息气泡 `18px 18px 6px 18px`，尾角方向是这条消息属于谁的记号）。
`app/tests/shape-governance.test.mjs` 一条正向 + 四条反向，随 `npm test` 跑。

**与 EX-CS1 的一处推导差异**：EX-CS1 §2.3 把 dialog → content well 的理想值写成 16（假定 inset 0），
但 `.form-dialog` 的 24px 内边距加在 `<dialog>` 元素自己身上，`form` 是被这 24 内缩的那一层，
按同一条公理应得 `max(R_min, 16 − 24)` = R_min = 4。本单取 4 并写成公理；分类：**推导口径差异**，
不是实现缺陷，也不是量法差异（两边的实测值一致：父 16、子 0、内缩 24）。

### SHAPE-1…7（真实渲染实测）

| 断言 | 父 | 子 | 父 radius / inset | 子 radius | 派生值 | 结果 |
|---|---|---|---:|---:|---:|---|
| SHAPE-1-card | `.context-popover` | `.context-card` | 16 / 16 | 12 | 刻度单调 | 通过 |
| SHAPE-1-row | `.context-card` | `.context-row` | 12 / 12 | 4 | 4 | 通过 |
| SHAPE-2 | `.composer-form` | `#composer-input` | 16 / 12 | 4 | 4 | 通过 |
| SHAPE-3 | `#project-dialog` | `form` | 16 / 24 | 4 | 4 | 通过 |
| SHAPE-4 | 焦点环 offset | 四条规则 | — | — | 2 | 通过 |
| SHAPE-5 | 手写 radius 的规则只有一条 | `.settings-section` | — | `calc(--radius-card + 2px)` | — | 通过 |
| SHAPE-6 | 满弧边界 | `#send-button` 999 / `#home-create-project` 8 | — | — | — | 通过 |
| SHAPE-7 | `.segmented` | 轨道 8 / 内缩 2 → thumb 6、segment 6 | 8 / 2 | 6 | 6 | 通过 |

### Gate B · Shape 是基线改动，不是 V1 的效果

两处消融面在 Commit A → Commit B 之间**只有两处差异**，都是潜伏值：
`#composer-input` 的 8 → 4（透明无底，看不见）、`#cancel-run-button` 的 `50%` → `999px`
（正方形上同值）。字号、字重、行高、控件高、对比度逐项相同——所以 Commit B 这一状态就是
V1 对照的 A 侧。

消融面之外，Shape 清理有三处**看得见**的后果，必须在这里说清楚，不得日后被算作字阶的功劳：

| 位置 | 变化 | 性质 |
|---|---|---|
| `.context-row`（会话概览弹层里的行） | 圆角 8 → 4 | 同心公理的直接结果 |
| `.markdown-reader` 外框 | 圆角 10 → 12（`--radius-card`） | 游离值归入角色表 |
| `.settings-section` 焦点环 | offset 4 → 2，radius 12 → 14 | 焦点环统一派生 |

## 5. 第 1 项 · V1 落地（Commit C）

### token 前后表

| 角色 | A（Commit B） | B（V1） |
|---|---:|---:|
| `--text-title` | 20 / 600 | **18 / 500** |
| `--text-navigation-title` | 17 / 600 | **15 / 500** |
| `--text-reading` | 15 / 400 | 15 / 400（不动） |
| `--text-body` | 14 / 400 | 14 / 400（不动） |
| `--text-section` | 14 / 700 | **13 / 500** |
| `--text-label` | 13 | **12 / 450**（导航项 450，选中 500） |
| `--text-meta` | 12 | **11.5 / 400**，行高 1.45 |
| `--text-caption` | 11 / 400 | **10.5 / 450**，行高 1.45 |
| `--tracking-caps` | 0.06em | **0.08em** |
| `--control`（桌面） | 32 | **28** |
| `.segment` 基线 | 28 | **26** |
| primary 字重 | 550 | **500** |
| 按钮字号 | 继承 14 | **`--text-label`** |
| `--text-scale` 三档比例 | 0.929 / 1 / 1.143 | 不动 |
| `--radius-control` | 8 | 8（不动） |
| 390 / 触控命中区 | 44 | 44（不动） |

### 消融面 A/B（1:1，同一份数据与运行态）

**Settings › General · 1440 · light**

| 角色 | A 字号 / 字重 / 行高 / 高 | B 字号 / 字重 / 行高 / 高 |
|---|---|---|
| 分节标题 | 20 / 600 / 30 / 30 | 18 / 500 / 27 / 27 |
| 块标题 | 14 / 700 / 21 / 21 | 13 / 500 / 19.5 / 19.5 |
| 行标题 | 14 / 500 | 14 / 500（不动） |
| 行说明 | 12 / 400 / 18 | 11.5 / 400 / 16.68 |
| 导航项 / 选中 | 13 / 400·550 / 32 | 12 / 450·500 / 30 |
| segment | 12 / 400 | 11.5 / 400 |
| Back to app | 14 / 21 / 33 高 | 12 / 18 / 30 高 |
| 页标题 | 17 / 600 / 22.95 | 15 / 500 / 20.25 |

**Work 头部 + composer · 1440 · light（idle 与在跑两态同表）**

| 角色 | A | B |
|---|---|---|
| 导航标题 | 17 / 600 / 22.95 | 15 / 500 / 20.25 |
| 消息正文（阅读） | 15 / 400 | **15 / 400（不动）** |
| 用户消息正文 | 14 / 400 | **14 / 400（不动）** |
| 模式词 / run badge | 11 / 400 / 16.5 | 10.5 / 450 / 15.23 |
| 活动行标题 / 元数据 | 12 / 400 / 18 | 11.5 / 400 / 17.25 |
| 时间戳 | 11 / 16.5 | 10.5 / 15.75 |
| scope 位 / 权限位 | 12 / 32 高 | 11.5 / 28 高 |
| Cancel run / 工作面钮 | 14 / 32 见方 | 12 / 28 见方 |
| Answer（决定卡） | 14 / 85.9 宽 | 12 / 77.8 宽 |

**390 与深宗**：命中区不随桌面 28 收缩——390 下 Cancel run 与 Answer 实测仍是 44 高
（两宗同值）；深宗只换色阶，字阶与几何与浅宗逐位相同；两宗每一个取样角色的实测对比度未变
（例：`row-help` 浅 5.46 / 深 8.1，`title` 浅 12.87 / 深 14）。

### 对比度

`node tools/contrast-report.mjs` 82 行全通过、0 低于门槛（V1 不动颜色，所以比值与 A 侧逐位相同）；
渲染面上的实测另算一遍：三份 measurements 各 130 个取样角色，最低 5.46（`--muted-strong` 在
11.5 / 10.5 上），**≥4.5 全通过**。因此**没有触发条件性对比度例外**：颜色一处未改，字重也没有被
拿来当对比度的替代品。

### 三个视觉问题（只作描述，不代用户判断）

| 面 | 第一眼落点（层级） | 正文与 chrome 能否不靠颜色分开（分离） | 28 高控件是否仍像可按的东西（可按性） |
|---|---|---|---|
| Settings › General | 分节标题仍是全屏最大的字（18），与行标题 14 的差从 6 收到 4，但字重差 500 : 500→行标题仍是 500、说明降到 11.5，作者观察到的第一眼落点未变 | 正文（行标题 14 / 500）与说明（11.5 / 400）之间现在是 2.5px + 一档字重；A 侧是 2px + 同一档字重 | Back to app 由 33 高降到 30 高、字 12；边框与背景未动 |
| Work 头部 + composer | 导航标题 15 / 500 与消息正文 15 / 400 同字号、差一档字重；A 侧是 17 / 600 对 15 / 400 | 消息正文 15 与活动行 11.5 之间的差从 3 拉到 3.5，并叠加行高 1.45 | Cancel run 28 见方、字形 18、满弧未变；390 仍 44 |

作者不给这三条打分，也不宣布 V1 更美：**视觉接受是用户的裁定**。

### anti-slop 自查

| 门 | 自查 |
|---|---|
| 靠把所有东西缩小完成 | 阅读 15 与正文 14 一字未动；缩的只有 chrome、元数据与控件 |
| 靠把所有东西变灰 | 颜色 token 一处未改；`lint-colors` 通过 |
| 靠加框线补回层级 | 未加任何 border / separator / card / shadow；`lint-materials` 通过，WK-94 四种边框角色未动 |
| 把每个控件做成胶囊 | 满弧只有 composer 那一个浮动主动作；SHAPE-6 盯住对照组 |
| 收紧阅读内容 | 阅读列 740、行高、消息几何未动 |
| 每组件私有字号 | 新增字号 0 处；只有角色 token 变值 |
| 用装饰补层级 | 未加动效、材质、渐变 |

## 6. 第 0c 项 · M-18 · HOME-16 × 三档 Text size

1440 × 900、Modules 版面、真实内容（seeded），门槛 12：

| Text size | `--text-scale` | 首屏余量（A 侧 Commit B） | 首屏余量（B 侧 V1） | 门槛 | 结果 |
|---|---:|---:|---:|---:|---|
| Small | 0.929 | 208 | **227** | 12 | 通过 |
| Medium | 1 | 192 | **213** | 12 | 通过 |
| Large | 1.143 | 138 | **159** | 12 | 通过 |

三档全过，**因此没有 HOME-16-LARGE 待裁项，`HOME_COMPOSER_CENTRE` 0.56 未动、也不需要动**。
V1 在每一档上把余量抬高了约 20px，这是密度收敛的直接后果。

与 CC-D0-a 时点的 16px 余量差异的分类：**因为当前 main 变了**——Home 在 2026-09-10 被重编
（默认 Modules、composer 上方概览与首屏几何改由 [home-composition-2026-09-10](../../../design/home-composition-2026-09-10/README.md) 覆盖），
不是量法差异，也不是本单的效果；本单只是在今天的 Home 上把三档跑齐。

## 7. 验证

### 7.1 本单新增的断言

| 族 | 结果 | 位置 |
|---|---|---|
| BASELINE-1…3（M-15 / M-16 / M-17） | **7 / 7**；未修复树上同一份断言 **2 / 7** | `evidence/fe05a/baseline-checks.json`、`baseline-checks-counterexample.json` |
| SHAPE-1…7 | **8 / 8** | `evidence/fe05a/shape-checks.json` |
| TYPE-1…6 | **7 / 7** | `evidence/fe05a/type-checks.json` |
| HOME-16 × 三档 Text size | **3 / 3** | `evidence/fe05a/home-text-scale.json` |
| `lint-shapes` 单测（1 正 + 4 反） | **5 / 5** | `app/tests/shape-governance.test.mjs` |

四族分开，不合成一条大断言：失败时看得出是哪一条契约倒了。

### 7.2 作者复跑的既有全量

| 检查 | 结果 | 分类 |
|---|---|---|
| `npm --prefix app ci` | 成功（277 包） | — |
| `npm --prefix app test` | **527 / 527**（基线 522 + 本单新增 5 条形状 lint 单测） | 见 §7.3 的一条契约修订 |
| `node tools/lint-colors.mjs` | 通过（28 文件） | — |
| `node tools/lint-materials.mjs` | 通过（3 文件） | — |
| `node tools/lint-shapes.mjs`（新） | 通过（3 文件），满弧登记 10 处 | — |
| `node tools/contrast-report.mjs` | **82 行全通过，0 低于门槛** | — |
| `npm --prefix app run smoke` | 通过，`realProvider: not_run` | — |
| composition（布局全量，含 HOME / SETTINGS / WORK / SHELL / 200%） | **60 / 71** | 11 条**先于本单存在**：clean `main` 同样 60 / 71，失败 id 逐个相同 |
| CC-W 行为 | **9 / 9** | — |
| shell | **12 / 12** | — |
| CC-S 第 0 项（播种 → SIGKILL → 重启） | **4 / 4** | — |
| Models | **15 / 18** | 3 条先于本单存在（clean `main` 同样 15 / 18，同 id） |
| 探测 | **7 / 8** | PRB-3 先于本单存在（clean `main` 同样 7 / 8） |
| FE-T01 rows / empty | **4 / 4**、**3 / 3** | — |
| primitive（含 FE-T06） | **11 / 11** | — |
| FE-T11 | **6 / 6** | — |
| FE-T07 | **8 / 8** | — |
| FE-T03 反例 | **4 / 5** | FE-T03-b 先于本单存在（clean `main` 同样 4 / 5，同 id） |
| RC 契约 / 反例 / 视口 | **20 / 20**、**9 / 9**、**30 / 36** | 视口 6 条先于本单存在（clean `main` 同样 30 / 36，detail 逐字相同） |

**「先于本单存在」是量出来的，不是声称的**：每一组失败都在同一棵树上用
`git checkout main -- app/web` 把产品前端换回 clean `main` 之后原样重跑，失败 id 与 detail 逐个
相同，才这样归类；对照产物存档在 `/private/tmp/se-agent-fe05a-data/`（`settings-mainbase`、
`final-layout-mainbase`、`viewport-main.log`）。

这些失败的共同来源是 **`main` 在 CC-D0-a 之后被改过而断言没跟上**，与字阶、密度、形状都无关：

| 失败 | 真正的来源 |
|---|---|
| composition 的 11 条 HOME-* | Home 于 2026-09-10 被重编（默认 Modules、Attention / Activity 模块、composer 上方概览），CC-D0-a 时点的 HOME-1 / 2 / 5 / 9 / 10 / 12 / 13 / 14 描述的是旧版面 |
| Models 的 MOD-1 / 4a / 4b、探测 PRB-3、FE-T03-b | provider-connections 合流（连接成为身份单位）改了 Models 行文与探测步骤 |
| RC 视口 6 条 touch-targets | Developer 分区里的原生 `INPUT`（13 / 39px），与 `--control` 无关 |

**没有一条既有断言被放宽。**

### 7.3 一条契约修订（不是放宽）

`app/tests/work-surface-tabs.test.mjs` 的 CC-W 1 断言写死了 `.tab-activity { … border-radius: 50% }`。
WK-128 ③ 明令满弧改写 `--radius-pill`、`50%` 不再使用，所以这条断言的**取值**被本单的裁定取代。
改法是把正则换成 `var(--radius-pill)`：量的仍然是「这一档记号是圆」，不是把这条检查删掉或改松
（正方形上 999px 与 50% 渲染逐位相同）。这是契约修订，理由在此，且只此一条。

### 7.4 一处不是逐字复制的地方

`evidence/fe05a/regression/work-seed.mjs` 相对 `evidence/cc-d0a/work-seed.mjs` **只有一行不同**：
`PUT /provider-credential` 现在收 `connectionId` 而不是 `provider`（`app/server/service.mjs`
`#putProviderCredential`），cc-d0a 时点的写法在今天的 clean `main` 上同样 400 `unknown_field`。
不改这一行，history / shell / FE-T07 三组根本起不来。**断言一字未动**，改的是 fixture 的调用形状。

## 8. 待裁定与出圈的错位（本单不改）

| 编号 | 面 | 观察 | FE-05a 之前就有 | 由 FE-05a 造成 | 建议去处 |
|---|---|---|---|---|---|
| OOS-1 | Models / 探测 / FE-T03 | MOD-1 / 4a / 4b、PRB-3、FE-T03-b 断言与 provider-connections 之后的产品不符 | 是 | 否 | provider / Models 线自己的一单 |
| OOS-2 | Home 布局断言 | composition 的 11 条 HOME-* 描述的是 2026-09-10 重编之前的 Home | 是 | 否 | Home composition 合同的 owner |
| OOS-3 | RC 视口 | Developer 分区的原生 `INPUT` 13 / 39px，未进 44 规则 | 是 | 否 | 命中区规则的下一单（与 M-17 同族） |
| OOS-4 | `evidence/cc-d0a/work-seed.mjs` | credential fixture 相对当前 API 已过期 | 是 | 否 | 证据脚本维护 |
| OOS-5 | Settings 分段控件 | 今天每一个 segmented 都是 `.settings-row` 的换行变体（32 高），**V1 的基线 26 没有可见实例** | 是（变体一直在） | 否（V1 只改基线） | 若要让 26 见天日，须裁「换行变体是否也收到 26」，属密度决定 |
| OOS-6 | `#cancel-run-button .button-label { display: none }`（窄屏） | 一条为「Cancel run 曾经显示文字」写的规则，今天是死规则 | 是 | 否 | 下一次触碰 composer 时顺手删 |

**没有 HOME-16-LARGE 待裁项**：三档全过（§6）。`HOME_COMPOSER_CENTRE` 0.56 未动。

## 9. 未做与未检

| 项 | 为什么 |
|---|---|
| V2（全站一档） | 用户已选 V1（WK-123 (b)）；本单不出 V2 |
| 图标族迁移 | EX-IC1 是 Design specimen，不授权产品迁移；本单仍用 Lucide，图标语义未动 |
| 材质 / blur / 阴影 | FE-05，排在本单之后，且必须用本单定型后的几何去评 |
| 间距刻度 | 一次一维；间距不在本单的那一维 |
| `corner-shape` | WK-128 明令只在 specimen board 里并排，不进本单 |
| 后端 / schema / 状态 / 端点 | 写权之外 |
| 真机与触屏 | headless 不证明真机帧时间、Reduced transparency 系统偏好或触屏手感 |
| 可变字重轴的真实渲染 | 450 / 550 在没有可变字重轴的回退字体上会落到最近的静态字重；本单沿用 WK-78 既有约定，未单独验证字体回退矩阵 |
| 视觉四轴的判断 | 作者只描述与记录，不代用户接受 |

## 10. 用户复核面（四块）

### 10.1 字阶层级

`evidence/fe05a/screenshots/settings-1440-light-shape-baseline.png` ↔ `…-v1.png`；
`work-idle-1440-light-shape-baseline.png` ↔ `…-v1.png`。A 侧是干净几何基线，不是原始 main。

### 10.2 控件密度

Send（28 见方 / 390 仍 44）、Cancel run（同）、segmented（基线 26，实例 32）、
Settings 的 Back to app（33 → 30 高，字 14 → 12）。数值见 §5 的两张消融表。

### 10.3 形状完整性

popover → 卡 → 行三层同心、composer 外壳 → 输入面、dialog → 内容井、焦点环 offset 2 —— SHAPE-1…7 的实测值见 §4。

### 10.4 稳健

390（命中区 44 未变）、深宗（字阶与几何与浅宗逐位相同，对比度未变）、三档 Text size（HOME-16 全过，§6）。

作者能说的只有：量过、通过、变了、没变。**V1 是否被接受，是用户的裁定。**
