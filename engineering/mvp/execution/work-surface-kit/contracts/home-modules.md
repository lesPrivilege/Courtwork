# Home 模块契约（CC-D0-a）

2026-09-09，Claude Opus（`opus-wo-low`），**作者验证**（Astra 独验另计，本页不代它写结论）。
基线 `main` `fa90763`，分支 `claude/cc-d0a-home-modules`，树 `/private/tmp/se-agent-ccd0a`。
上游裁定：[WK-114](../intake-round-3.md)（CC-D0 范围）、[WK-116 R4D-2](../intake-round-3.md)（D0-a / D0-b 拆分）、[WK-117 (b)](../intake-round-3.md)（不装占位、具体待办优先）、[WK-120](../intake-round-3.md)（成熟感来自秩序）、[WK-129](../intake-round-3.md)（Control grammar）。
设计输入：[shell-refinement §首页模块退为辅助 / §模块首页的解耦约定](../../../../design/clean-cool-2026-09-09/shell-refinement.md)、[attention-surface §常驻 Attention 与 Home](../../../../design/attention-surface-2026-09-09/README.md)。
硬边界：[ui-state-vocabulary](ui-state-vocabulary.md)（没有后端事实的状态不画）、[copy-convention §3](../../../../design/copy-convention.md)（同一事实不给第二套说法）。

本页是**准入合同**，不是路线图：一个模块只有在它能到达的每一个显示状态都指得出一条今天已经加载的事实（端点与字段，file:line），或者写明 `not_applicable` 与理由时，才允许被安装。指不出来就不安装——不画空卡，不留占位，不写 "until BE-nn" 一类实现状态文案（WK-114 ③、WK-117 (b)）。

---

## 1. 版面是一个本设备偏好，不是第二个首页

`Settings › Appearance › Home layout`，闭集两值，控件按 WK-129 (b) 用 segmented：

| 值 | 含义 |
|---|---|
| `simple`（默认） | 与这条带出现之前的 Home 逐像素相同。带不在盒树里，也不在无障碍树里（`hidden`，`app/web/app.mjs` `renderChatHeader`）。 |
| `modules` | composer 之后多一条次级带。Today、具体待办列表、composer 的量度都不动。 |

存储：`cw:prefs:<hash(origin)>`，与 Appearance 的 `scheme` / `textSize` / `motion` / `skin` / `codeFont` 同一条通道（`app/web/settings-view.mjs` `PREFERENCE_DEFAULTS` / `readPreferences` / `writePreferences`；首帧应用在 `app/web/index.html` 的内联脚本）。这是纯展示偏好，不是任何后端事实的第二真源，因此不触 WK-107 ② 的边界（WK-114 ⑥）。

闭集之外的值读回默认：一个被手改的 `localStorage` 不能把 Home 读成第三种版面（`app/tests/settings-preferences.test.mjs`）。

| 键 | 闭集 | 默认 |
|---|---|---|
| `homeLayout` | `simple` / `modules` | `simple` |
| `homeModuleBand` | `expanded` / `collapsed` | `expanded` |

---

## 2. 带的位置、次序与几何

DOM 序即阅读序，两个断点都不靠 CSS 搬动任何东西：

| 视口 | 顺序 |
|---|---|
| ≥768 | `composer-area` → `home-top-band`（Today） → `home-module-band` → 列表 |
| <768 | `home-top-band` → `home-module-band` → 列表 → `composer-area`（沉底，WK-58 / WK-97 不变） |

键盘顺序与之相同：composer → Today 三块 → 模块带 → 列表（断言 HOME-12）。

几何合同：

| 项 | 值 | 出处 |
|---|---|---|
| 模块列宽上限 | `--home-column` 820，与 composer、Today 同一列同一左边界 | 断言 HOME-4-modules（实测 820 / left 438 = composer left） |
| 主区外边距 | `--page-gutter` 24 | WO density 24–40 |
| 带的上留白 | `--space-5` 20 | WO density 模块 gap 20–24 |
| 模块之间 | `--space-6` 24（横）/ `--space-3` 12（换行后） | 同上 |
| 宽度分配 | 每个模块取自己内容所需的宽度，容不下即换行（`flex-wrap`），绝不横向溢出 | 断言 `HOME-overflow-*`（四次实测 0） |
| 折叠控件命中区 | 390 下 ≥44×44 | 断言 HOME-14（实测 94×44） |

**820 是上限，不是承诺。** 画板里的 480 + 320 + gap 已经超过 820；画板尺寸不是合同（WO constraints.density）。

**首屏预算。** 带花掉的高度直接从第一条具体待办身上出（M-7、WK-117 (b)）。实测（1440 宽，light，reduced-motion）：

| 版面 | 视口高 | 第一条待办露出的高度 |
|---|---|---|
| Simple | 900 | 60 |
| Simple | 1058 | 130 |
| Modules | 900 | **16** |
| Modules | 1058 | 85 |

900 高下 Modules 只剩 16px 余量，门槛钉在 12（断言 HOME-16）。**这就是第二个模块装不上去的地方**：在 900 高视口上再加一行模块会先打破 HOME-16，而不是悄悄把待办推下去。要越过它，须先由 Fable 显式修订 `HOME_COMPOSER_CENTRE`（0.56）并记下高度 / 内容反例（WK-117 (b)），不得静默放宽断言。

---

## 3. 注册表：本片安装了什么

代码里的注册表是 `app/web/home-view.mjs` 的 `homeModules`。**它只列已安装的模块**——没有接缝的模块不在代码里，只在下面 §4 声明，所以仓里没有一个等着被填的空槽，也没有插件框架（WK-117）。

### Today

| 项 | 值 |
|---|---|
| id / 位置 | `today` · `place: "band"`——它就是既有的 `#home-top-band`，两种版面下都在原位、三个 tile 不改词（WK-114 ①） |
| 数据来源 | `GET /api/v5/work-summary` → `pendingItems` / `sessionCandidates` / `inspectionCandidates`（`app/server/work-summary.mjs:34-49`，路由 `app/server/index.mjs:101`），经 `toStatTiles`（`app/web/presentation-adapters.mjs`） |
| 折叠 / 移除 | 无。它不是次级带上的模块；`Simple` 与 `Modules` 下它都在（WK-114 ①、WK-117 (c)：Today strip 在 ATT-BE-01 交付前保持既定三类投影） |

六态：

| 状态 | 事实来源 |
|---|---|
| loading | `state.home.loading` → `renderHome` 的 `Loading your workspace…`（`home-view.mjs`） |
| ready | `work-summary` 返回三集合，逐集合计数 |
| empty | 逐集合一句条件句（`emptyLabels`，`home-view.mjs`）；答案没带这个集合时读成词不是 0（`stat-value.is-missing`，FN-28） |
| not connected | `state.home.error` → `connection-line` 一行 + Retry + disclosure（`home-view.mjs`） |
| unavailable / error | 同上，同一行；主机返回的原文在 disclosure 里 |
| stale | `load.error` 为真时的 `Last confirmed …`（`home-view.mjs`，取 `summary.observedAt`）。这是本仓今天**唯一**能诚实说出的 stale：它说的是"上次确认这些数字是什么时候"，不是"数据过期了" |

### Models

| 项 | 值 |
|---|---|
| id / 位置 | `models` · `place: "modules"`——次级带上唯一渲染的一行 |
| 数据来源 | **无。** 它自己不读取任何东西（`source: null`） |
| 内容 | 一行：模块名 `Models` + 一个 `Manage connections` → `Settings › Models` |
| 折叠 / 移除 | 随带折叠（`homeModuleBand`）；`Simple` 版面即是它的移除态 |

六态**全部 `not_applicable`，理由同一条**：WK-114 ⑤——模型名已经由 composer 底部的 chip 说过一次，第二处展示就是同一事实的第二套说法（copy-convention §3）。所以这一行**不陈述任何连接事实**：不说模型名、不说 `credentialStatus`、不说健康时间戳。它是通往陈述那件事的地方的路，不是那件事本身。没有事实，就没有 loading / ready / empty / not connected / unavailable / stale 可言。

断言 HOME-10 逐字盯着这一点：带内文本不含数字、不含 composer chip 的当前值、不含 `Backend pending` / `until BE` / `Coming soon` / `Activity` / `Usage` / `Mail` / `Calendar` / `Attention`，且带内没有卡框（可见边或阴影 0 处、`.home-card` 0 个）。

---

## 4. 声明但不安装

以下模块**不在代码里**。本节是它们的准入条件，不是它们的排期。

| 模块（候选 id） | 今天缺的接缝 | 准入前提 |
|---|---|---|
| Activity / 热力图（`activity`） | 无跨会话 run 端点；`store.listRuns()` 未路由（EX-CC2 §3）。时间桶、时区、去重、覆盖完整性均无契约 | BE-1 / BE-3 + BE-25。空白桶 = 无数据，unknown / 缺覆盖不得显示 0 |
| Usage（`usage`） | 只有单 run 的 `run.usage`（`app/server/store.mjs:85-93`），无跨 run 聚合端点 | BE-29。token 分列、计费来源、区间与 `Not reported` 语义 |
| Mail（`mail`） | 无 adapter、无路由。**not connected 与 empty 今天无法区分**——没有任何字段能回答"是否已连接" | BE-26，且是否要邮件模块属产品裁定（WK-114） |
| Calendar（`calendar`） | 同上；时区归属与全天事件边界亦无定义 | BE-27，同属产品裁定 |
| Attention 摘要（`attention`） | ATT-BE-01 未交付。**它不是 Today strip 的改名**：Attention 是一个新对象与新表面，Home 上的摘要只是它的第三个入口（WK-117 (c)） | ATT-BE-01 + ATT-FE-01 切片 b。届时它以 `place: "modules"` 进入本注册表，读的是与常驻导航、独立工作面同一个 service 投影，不复制对象 |

`stale` 一栏对以上五个模块统一是"无契约"（ui-state-vocabulary §4）：没有时间戳就不说新鲜度。

**可扩展性的边界。** 未来的 Attention 摘要需要的只有两样：一个 id，和带上的一个位置。两样今天都在（`homeModules` 的形状与 `place` 字段）。除此之外本片没有造任何东西——没有空卡、没有槽位、没有通用插件框架、没有拖拽网格、没有第三方代码执行（WK-117、shell-refinement §模块首页的解耦约定）。

---

## 5. 消融记录

一条被删掉的结构，记在这里，因为它是靠实测被删的：

带原本有自己的标题行（`Modules` 加一个 `Hide` 按钮），行下才是模块。1440×900 实测 `HOME-11-modules-900` 反例：第一条具体待办的顶边落在 992，可见区底边 956——**标题行换来的高度，正好把待办推出了首屏**。一个模块的带上，那一行标题只是在为一行内容再画一层结构（anti-slop：gratuitous cards / fake dashboard density）。于是标题行被消融：带的名字由 `aria-label="Home modules"` 承担，折叠控件自己说出它折的是什么（`Hide modules` / `Show modules`）。同一轮里带的上留白从 24 收到 20，带下第一条 section 的 margin 从 32 收到 24（**只在 Modules 下**，`Simple` 的 32 一步未动）。待办顶边 992 → 940，可见 16px，HOME-11 与 HOME-16 都过。

这是"哪一像素改变了哪一判断"的那一条：57px 的带高变成 47px，一个标题不见了。
