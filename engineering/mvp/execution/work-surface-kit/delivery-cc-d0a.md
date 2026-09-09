# CC-D0-a 交付 · Home 模块带外壳与现有事实投影

2026-09-09 · Claude Opus（`opus-wo-low`），**作者验证**。Astra 独验与合流另计；本页不代它写结论，也不自称独验。
工单 [WO-CC-round5 §CC-D0-a](work-orders/WO-CC-round5.md)。上游裁定 WK-114 / WK-116 R4D-2 / WK-117 (b) / WK-120 / WK-123 / WK-129。
准入合同 [contracts/home-modules](contracts/home-modules.md)；证据 [evidence/cc-d0a](../../../../evidence/cc-d0a/README.md)。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `fa90763`（相对上一单基线 `0b5ccd2`，main 只有后端与证据变更，`app/web` 未动） |
| 分支 | `claude/cc-d0a-home-modules` |
| 树 / 端口 / 数据 | `/private/tmp/se-agent-ccd0a` · 8905（fixture 8906） · `/private/tmp/se-agent-ccd0a-data` |

| 提交 | 内容 |
|---|---|
| `2b6c0a8` | `feat(web): Home layout preference and the secondary module band` —— 偏好、带、注册表、CSS、三条单测 |
| （本页提交） | 文档与证据：`contracts/home-modules.md`（新）、`copy-convention.md`、`text-sweep.md`、本页、`evidence/cc-d0a/` |

## 2. 改动文件

| 文件 | 改了什么 |
|---|---|
| `app/web/settings-view.mjs` | `PREFERENCE_DEFAULTS` / `PREFERENCE_VALUES` 增 `homeLayout`（`simple` / `modules`）与 `homeModuleBand`（`expanded` / `collapsed`）；Appearance 增一行 `Home layout`（segmented，WK-129 (b)）；`savePrefs` 回执 `onHomeLayout`；页 API 增 `setHomeModuleBand` |
| `app/web/home-view.mjs` | 新增 `homeModules` 注册表、`homeBandModules()`、`renderHomeModuleBand()` |
| `app/web/app.mjs` | `homeLayoutPreference()` / `homeModuleBandCollapsed()`；`renderChatHeader` 里带的显隐与 DOM 序；`renderHomeState` 里带的渲染；`createSettingsPage` 的 `onHomeLayout` |
| `app/web/index.html` | `#home-module-band` 一个 section |
| `app/web/styles.css` | `--space-5: 20px`；`.home-module-band` / `-inner` / `-list` / `-row` / `-name` / `.home-module-collapse`；一条 Modules-only 的 section margin 规则；390 的命中区与间距 |
| `app/tests/settings-preferences.test.mjs` | 默认值断言补两键；新增三条（闭集、注册表只装两个、Models 无自有读取） |
| `contracts/home-modules.md`（新）· `copy-convention.md` · `text-sweep.md` · 本页 · `evidence/cc-d0a/` | 文档与证据 |

**未改**：`app/server`、`app/runtime`、`app/core`、`domains`、`brand`、HTTP 契约、其他 `contracts`、`intake`。无新增读取、端点、字段；无热力图；无新依赖；无新色、新字、新图形。

## 3. 消融表（removal pass）

### 3.1 删除（去掉后不失去判断）

| 删除 | 为什么去掉后什么也没少 |
|---|---|
| 模块带自己的标题行（`<h3>Modules</h3>` 加一个 `Hide` 钮） | 一个模块的带上，一行标题是在为一行内容再画一次分组（WK-40）。带的名字由 `aria-label="Home modules"` 承担，读屏仍说得出这是哪一区；折叠控件改说 `Hide modules` 之后自己就说出了对象。**而它换来的高度是可测的**：1440×900 实测把第一条具体待办从可见区推了出去（`HOME-11-modules-900` 反例，顶边 992 > 可见区底 956）。这是本单唯一一次"消融不是审美偏好，是断言逼出来的" |
| 每个模块自己的 `Remove` 控件 | 一个只有一行的带上，一个没有恢复路径的移除是单向门；恢复路径要么是 Settings 里一张模块清单（为一个模块建一张清单），要么是第二个折叠控件。今天"移除"由版面开关承担：`Simple` 就是它的移除态，可逆、可发现、已经有控件。逐条理由与后续条件见 §12 待裁 ① |
| 一个独立的 `home-modules.mjs` 模块文件 | 服务端静态准入是逐文件登记的（`app/server/index.mjs:22`），而 `app/server` 不在本单写权内。注册表放进已登记的 `home-view.mjs` 之后，没有一行代码因此变得更难读，也不需要向 Astra 提 allowlist 请求 |
| 注册表里 Activity / Usage / Mail / Calendar / Attention 五行 | 它们在代码里只能是"有 id 没有实现"的死行。声明属于合同（[home-modules §4](contracts/home-modules.md)），不属于运行时数组。留在代码里就是那个"等着被填的空槽"，正是 WK-117 禁止的东西 |

### 3.2 新增（去掉后会失去判断）

| 新增 | 去掉它会失去什么 |
|---|---|
| `homeLayout` 两值闭集 | 失去"这是一个版面偏好而不是第二个首页"这个事实。没有闭集校验，一个被手改的 `localStorage` 能把 Home 读成第三种版面 |
| `homeModuleBand` 折叠键 | 失去"折起来的带下次还折着"。不存就是每次刷新都重新展开，那个控件等于没有做任何事 |
| `HOME-16` 首屏余量门（≥12） | 失去"第二个模块什么时候装不下"的那个答案。`HOME-11` 只问"露出来了吗"，一条只露 1px 的待办在合同上可见、在产品上不可见 |
| Modules-only 的 section margin（32 → 24） | 失去那 8px——而 900 高下总余量只有 16px。它必须是 Modules-only，否则 `Simple` 就不再逐像素等于从前的 Home |
| `--space-5: 20px` | 失去 20–24 这一档的下限。带的上留白 24 时余量只剩 11，过不了 `HOME-16` |

## 4. 五轮收敛表（Home Simple / Modules × 1440 / 390）

轮次：① 结构 → ② 密度 → ③ 断点 → ④ 状态 → ⑤ 文案。每一格的数字都从渲染出来的文档上读，不从 CSS 反推。

### 4.1 Simple · 1440

| 轮 | 读数 |
|---|---|
| ① 结构 | DOM 序 `composer-area` → `home-top-band` → `home-module-band`（`hidden`、0 子节点、无盒） → `message-stream-wrap`；带既不在盒树也不在无障碍树（`HOME-8`） |
| ② 密度 | composer 820 · 输入本体 96 · orientation 38 · Today strip gap 16（既有，未动）；第一条待办露出 **60**（900 高）/ **130**（1058 高） |
| ③ 断点 | 无横向溢出（900 与 1058 各 0） |
| ④ 状态 | 见 §5 |
| ⑤ 文案 | 与本单之前逐字相同 |

### 4.2 Modules · 1440

| 轮 | 读数 |
|---|---|
| ① 结构 | DOM 序 `composer-area` → `home-top-band` → `home-module-band` → `message-stream-wrap`（`HOME-9`）；带顶 831 > Today 743，带底 ≤ 列表顶 884 |
| ② 密度 | composer **820**、带内列 **820**、两者左边界同为 **438**（`HOME-4-modules`）；带上留白 20；模块间 24（横）/ 12（换行）；带内 0 处可见边、0 处阴影、0 张卡（`HOME-10`）；第一条待办露出 **16**（900 高）/ **85**（1058 高） |
| ③ 断点 | 无横向溢出（900 与 1058 各 0）；容不下即换行（`flex-wrap`），从不横向溢出 |
| ④ 状态 | 见 §5 |
| ⑤ 文案 | `Models` · `Manage connections` · `Hide modules` / `Show modules`（text-sweep §12） |

### 4.3 Simple · 390

| 轮 | 读数 |
|---|---|
| ① 结构 | 与本单之前相同：`home-top-band` → `message-stream-wrap` → `composer-area`（composer 沉底，`HOME-narrow-dock`） |
| ② 密度 | 既有 390 规则未动（Today 两行网格、`--page-gutter` 16） |
| ③ 断点 | 无横向溢出（0） |
| ④ ⑤ | 同 4.1 |

### 4.4 Modules · 390

| 轮 | 读数 |
|---|---|
| ① 结构 | `home-top-band` → `home-module-band` → `message-stream-wrap` → `composer-area`；**沉底顺序不变**（`HOME-14`） |
| ② 密度 | 带上留白 12；模块间 8 / 16；折叠控件命中区 **94 × 44**（≥44） |
| ③ 断点 | 无横向溢出（0）；带上一行在 390 内不换行（实测截图 `home-modules-390-light.png`） |
| ④ ⑤ | 同 4.2 |

原始读数在 `evidence/cc-d0a/composition-checks.json`。截图 `home-simple-1440x900-light.png`、`home-simple-1440x1058-light.png`、`home-modules-1440x900-light.png`、`home-modules-1440x1058-light.png`、`home-modules-390-light.png`、`settings-appearance-home-layout-1440-light.png`。**视觉四轴留用户，本页不自评。**

## 5. 状态矩阵（WK-112 (d)）

每格是事实来源（`file:line`）或 `not_applicable` + 理由。词表对照 [ui-state-vocabulary](contracts/ui-state-vocabulary.md)。

### 5.1 模块带（宿主）

| 状态 | 事实 |
|---|---|
| 不在场 | `homeLayout === "simple"`，或 `state.view !== "home"`：`app.mjs` `renderChatHeader` 的 `bandLayout`；`hidden` + `replaceChildren()`，离开盒树与无障碍树 |
| 展开 | `homeModuleBand === "expanded"`：渲染已安装模块 |
| 折叠 | `homeModuleBand === "collapsed"`：行不渲染，控件与 `aria-expanded="false"` 仍在（不是单向门） |
| loading / empty / not connected / unavailable / stale | `not_applicable` —— 宿主自己不读取任何东西。带的内容是模块的，带本身没有可加载或可失败的事实 |

### 5.2 Today（`place: "band"`，原位，本单未动）

| 状态 | 事实 |
|---|---|
| loading | `state.home.loading` → `home-view.mjs` `Loading your workspace…` |
| ready | `GET /api/v5/work-summary` 三集合（`app/server/work-summary.mjs:34-49`）→ `toStatTiles` |
| empty | `emptyLabels` 逐集合一句条件句；答案未带该集合时读成词不是 0（`stat-value.is-missing`，FN-28） |
| not connected / unavailable | `state.home.error` → `connection-line` 一行 + `Retry` + disclosure |
| stale | `load.error` 且有 `observedAt` 时的 `Last confirmed …`（`home-view.mjs` `renderHomeBand`） |

### 5.3 Models（`place: "modules"`）

六格**全部 `not_applicable`，同一条理由**：这一行不陈述任何连接事实。模型名由 composer 底部的 chip 说过一次，第二处展示就是同一事实的第二套说法（WK-114 ⑤、copy-convention §3）。没有事实，就没有 loading / ready / empty / not connected / unavailable / stale 可言。它是一条通往 `Settings › Models` 的路。

`HOME-10` 逐字盯着这一点：带内文本不含数字、不含 composer chip 的当前值（实测 chip = `Local test`，带内不含）、不含 `Backend pending` / `until BE` / `Coming soon` / `Activity` / `Usage` / `Mail` / `Calendar` / `Attention`。

### 5.4 布局开关（Settings › Appearance）

| 状态 | 事实 |
|---|---|
| 值 | `readPreferences().homeLayout`，闭集两值，越界读回 `simple`（`settings-view.mjs` `PREFERENCE_VALUES`） |
| 生效 | `savePrefs` → `onHomeLayout` → `renderChatHeader()` + `renderHomeState()`（`app.mjs`）；`HOME-15` 实测按控件切换后带出现 / 消失 |
| 持久 | `cw:prefs:<hash(origin)>`，跨重新加载成立（`HOME-13` 实测折叠态跨一次 reload） |
| modified / reset 指示 | **本单不做**。WK-129 (d) 的 PropertyRow 只对"有默认值事实"的本设备偏好行成立，而那是 Settings 全组的修整，不是这一行的局部改动；并入 CC-D0-a 之后的 Settings 修整（§12 待裁 ③） |

## 6. text-sweep 增量

见 [text-sweep §12](text-sweep.md)：五条新增字符串逐条承重说明；零删除；一整行标题被消融（§12.3），理由是实测而不是偏好。词表条目见 [copy-convention §3.5 / §3.5b](../../../design/copy-convention.md)。

## 7. 断言结果原文

### 7.1 HOME-1…7（Simple，与本单之前同值）

```
PASS HOME-1 {"centre":0.56,"threshold":0.55}
PASS HOME-2 {"aboveComposerHeight":38}
PASS HOME-3 {"orientation":38,"text":"Work that exists beyond the model."}
PASS HOME-4 {"width":820}
PASS HOME-5 {"input":96}
PASS HOME-6 {}
PASS HOME-7 {"stats":3,"planned":0,"backendPendingOnHome":false,"order":["composer-area","home-top-band","home-module-band","message-stream-wrap"]}
PASS HOME-overflow {"overflow":0}
PASS HOME-narrow-dock {"order":["home-top-band","message-stream-wrap","home-module-band","composer-area"]}
PASS HOME-narrow-overflow {"overflow":0}
```

### 7.2 两态 × 两个视口高

```
PASS HOME-1-simple-900   {"centre":0.56,"threshold":0.55}
PASS HOME-6-simple-900   {}
PASS HOME-11-simple-900  {"todoTop":896,"areaBottom":956,"visible":60}
PASS HOME-16-simple-900  {"visible":60,"threshold":12}
PASS HOME-1-simple-1058  {"centre":0.5596,"threshold":0.55}
PASS HOME-6-simple-1058  {}
PASS HOME-11-simple-1058 {"todoTop":984,"areaBottom":1114,"visible":130}
PASS HOME-16-simple-1058 {"visible":130,"threshold":12}
PASS HOME-1-modules-900  {"centre":0.56,"threshold":0.55}
PASS HOME-6-modules-900  {}
PASS HOME-11-modules-900 {"todoTop":940,"areaBottom":956,"visible":16}
PASS HOME-16-modules-900 {"visible":16,"threshold":12}
PASS HOME-1-modules-1058 {"centre":0.5596,"threshold":0.55}
PASS HOME-6-modules-1058 {}
PASS HOME-11-modules-1058{"todoTop":1029,"areaBottom":1114,"visible":85}
PASS HOME-16-modules-1058{"visible":85,"threshold":12}
PASS HOME-overflow-{simple,modules}-{900,1058} {"overflow":0}   （四条）
```

### 7.3 HOME-8…15（本单新增）

```
PASS HOME-8  {"layout":"simple","inDocument":true,"shown":false,"children":0,"hidden":true,
              "order":["composer-area","home-top-band","home-module-band","message-stream-wrap"]}
PASS HOME-9  {"order":["composer-area","home-top-band","home-module-band","message-stream-wrap"],
              "bandTop":831,"todayTop":743,"streamTop":884}
PASS HOME-10 {"rows":1,"names":["Models"],"bandText":"ModelsManage connectionsHide modules",
              "framedNodes":0,"cards":0,"modelChip":"Local test","forbiddenFound":[]}
PASS HOME-4-modules {"composer":820,"bandColumn":820,"bandLeft":438,"composerLeft":438}
PASS HOME-5-modules {"input":96}
PASS HOME-7-modules {"stats":3,"order":["composer-area","home-top-band","home-module-band","message-stream-wrap"]}
PASS HOME-12 {"stats":["stat:pendingItems","stat:sessionCandidates","stat:inspectionCandidates"],
              "bandControls":["home-module-models","home-module-collapse"]}
              （完整焦点序：composer-input → …composer 自己的控件… → 三块 stat → 带上两个 → 六条列表行）
PASS HOME-13 {"collapsed":{"rows":0,"expanded":"false"},"afterReload":{"rows":0,"expanded":"false"},
              "reExpanded":{"rows":1,"expanded":"true"}}
PASS HOME-14 {"order":["home-top-band","home-module-band","message-stream-wrap","composer-area"],
              "toggle":{"width":94,"height":44},"overflow":0}
PASS HOME-15 {"before":false,"afterSwitchToModules":true,"afterSwitchBack":false}
```

`71 / 71`（既有 41 + 本单 30）。

## 8. 两条 unresolved 的取舍

工单 §CC-D0-a `unresolved` 两条，逐条给出选择与理由。

### 8.1 Today strip 与模块带是否同一行

**取：各自整行。** 竞争约束是"首屏高度 vs 扫读"。

- 同一行（480 + 320）在合同上就不成立：480 + 320 + gap 已超过 `--home-column` 820，画板尺寸不是合同（工单 constraints.density）。要同行只能压缩 Today 的三个 tile，而三个 tile 是 Home 上唯一的统计，压到读不出来就是"靠缩小文字完成缩小"（shell-refinement 明禁）。
- 各自整行的代价是高度，而高度确实是稀缺的（`HOME-11-modules-900` 只剩 16px 余量）。但这一轮把高度从别处买了回来：消融掉带的标题行（−28）、上留白 24 → 20（−4）、Modules-only 的 section margin 32 → 24（−8）。带最终只花 47px，一行。
- 扫读没有输：带上是一行，与 Today 的 strip 上下相邻、同一条 820 列、同一左边界（实测 438 / 438），眼睛不需要换列。

### 8.2 Models 入口放模块带还是 composer chip 之后

**取：模块带。** 竞争约束是"不重复展示（WK-114 ⑤）vs 发现性"。

- 放在 composer chip 之后那一行，等于在陈述模型名的那一行旁边再放一个通往模型设置的入口——两个控件贴在一起说同一件事的两半，而 chip 本身已经是通往连接卡的入口（`app.mjs` `#model-settings-button`）。那是把一个控件画两遍。
- 放在模块带上，两者的分工是清楚的：chip 陈述**当前是哪一个模型**（事实），带上那一行陈述**去哪里管它们**（目的地）。带上那一行因此**不说模型名**——`HOME-10` 逐字检查带内不含 chip 的当前值。
- 发现性的代价由版面开关承担：`Simple` 下这一行不存在，但 chip 仍在，所以"怎么改模型"在两种版面下都有答案。

## 9. 既有回归（全量）

全部在本树、自有端口 8905（fixture 8906）、每组新空数据目录、独立 CDP。逐组位置见 [evidence/cc-d0a/README](../../../../evidence/cc-d0a/README.md)。

| 检查 | 本单 | 上一单基线 |
|---|---|---|
| 全量应用测试 | **293 / 293** | 290（基线）+ 本单 3 条 |
| lint-colors / lint-materials | 通过 / 通过 | 同 |
| contrast | 76 行全通过 | 同 |
| smoke | 通过（`realProvider: not_run`） | 同 |
| composition（布局 / 安全区） | **71 / 71** | 41（既有一字未动）+ 本单 30 |
| cc-s-checks（CC-S 第 0 项） | **4 / 4** | 4 / 4 |
| cc-w-checks（文档 tab / tooltip / activity） | **9 / 9** | 9 / 9 |
| shell-checks | **12 / 12** | 12 / 12 |
| FE-T07 | **8 / 8** | 8 / 8 |
| Models / 探测 | **18 / 18** · **8 / 8** | 同 |
| FE-T01 rows / empty | **4 / 4** · **3 / 3** | 同 |
| Primitive（含 FE-T06） | **11 / 11** | 11 / 11 |
| FE-T11 | **6 / 6** | 6 / 6 |
| FE-T03 | **5 / 5** | 5 / 5 |
| RC 契约 / 反例 / 视口 | **20 / 20** · **9 / 9** · **36 / 36** | 同 |

### 9.1 一条既有断言被改写吗

**没有。** 既有 41 条 composition 断言、以及上表每一组的既有断言，一字未动、一条未放宽。本单只**新增** 30 条 composition 断言与 3 条单测，并把 `settings-preferences.test.mjs` 里那条默认值 `deepEqual` **补上**两个新键（不是放宽：它仍然是全等比较，只是默认值多了两项）。

### 9.2 新增断言的理由

| 断言 | 为什么它必须存在 |
|---|---|
| `HOME-8` | "`Simple` 与现状逐像素一致"这句话如果只靠 HOME-1…7 复跑，证明的是"几何没变"，不是"带不在场"。带 `hidden` 但仍有子节点，就是 WK-96 说的那种"隐藏的带仍是渲染出来的带" |
| `HOME-9` | 次序是合同（composer → Today → 模块带 → 列表），而且必须由 DOM 序而非 CSS 承担 |
| `HOME-10` | 准入合同的可执行形式：一行、只有 Models、不含数字、不含 chip 的值、无卡框、无实现状态文案、无未安装模块的名字 |
| `HOME-11` / `HOME-16` | M-7 与 WK-117 (b) 的可执行形式，且把"露出多少"写成数字而不是布尔 |
| `HOME-12` | 键盘顺序（工单 accessibility 项） |
| `HOME-13` | 折叠是可逆的、且跨重新加载成立——否则那个控件没有做任何事 |
| `HOME-14` | 390 沉底顺序不变 + 命中区 ≥44 |
| `HOME-15` | 开关本身是真控件：经产品自己的 Settings 页与真实点击到达，不是只写 `localStorage` |
| `HOME-4/5/7-modules` | 带的出现不得改动 composer 的量度，也不得挪走或改词 Today |

## 10. allowlist 与后端请求

- **allowlist**：无。本单没有新增 `app/web/*.mjs` 文件——注册表放进已登记的 `home-view.mjs`（理由见 §3.1）。`app/server/index.mjs:22` 的静态清单未改，也不需要改。
- **后端请求**：无新增。既有登记保持不变，本单不推进也不重编：
  - **BE-1 / BE-3 + BE-25**（`work-activity` 按日桶、时区口径、去重与并发一致性）→ Activity 模块的准入前提，属 CC-D0-b。
  - **BE-29**（跨 run usage 聚合、token 分列、计费来源、`Not reported`）→ Usage 模块的准入前提，属 CC-D0-b。
  - **BE-28**（连接健康时间戳）→ 本单**不依赖它**：Models 那一行不陈述任何连接事实，因此不需要 stale。它仍是 Models 将来成为信息模块（而非入口行）的前提。
  - **BE-26 / BE-27**（Mail / Calendar adapter）→ 候选，属产品裁定，本单未推进。
  - **ATT-BE-01** → Attention 摘要的前提，owner 是并行包，本单不重号、不复述其核验。

## 11. 未检项（分列）

| 未检 | 为什么 |
|---|---|
| 视觉四轴（identity / craft / maturity / restraint） | 留用户。本页只报几何、状态与文字，不自评视觉接受 |
| 真机帧时间、触屏体验、系统级 Reduced transparency | headless 证不了。本单没有引入任何动效或材质，但这条边界照旧声明 |
| 深色宗下的模块带 | 本单未新增任何颜色，带上只有既有的 `--muted-strong` / `--accent-ink` / `--hover` / `--pressed`，lint-colors 与 contrast 76 行通过；但**未出深色截图**，属未检项 |
| 200% 缩放下的模块带 | 既有 `SETTINGS-7` / `WORK-9` 覆盖 Settings 与 Work，本单未为 Home Modules 单跑一次 200%。带是一行 flex-wrap，结构上会换行不会溢出，但**这是推论不是实测** |
| 读屏对 `aria-label="Home modules"` 与折叠控件的全句读法 | copy-convention §5 列为独验项 |
| 1058 高之外的其他视口高 | 工单只要求 900 与 1058 两档 |
| 三档 text-size 下的首屏余量 | `HOME-16` 只在默认字号下跑过。字号放大会吃掉那 16px——**这是本单最脆的一处**，见 §12 待裁 ② |

## 12. 待裁定

| # | 事项 | 本单选的最保守实现 | 需要谁裁 |
|---|---|---|---|
| ① | **模块的"移除"今天由版面开关承担，而不是每个模块自己的控件。** 工单 §2 把"折叠 / 移除"并列写进注册表合同 | 只做折叠（可逆、控件常在），移除 = 切回 `Simple`。理由：一个只有一行的带上，一个没有恢复路径的移除是单向门；要做per-module 移除，就要同时决定恢复入口长什么样（Settings 里一张模块清单？），那是一个新的视觉与 IA 决定，不是本单的接缝能推出来的。合同里 `homeModules` 的形状已经能承载 per-module 的显隐，本单只是没有给它 UI | Fable：per-module 移除是否等到带上有第二个模块时再做 |
| ② | **900 高 + 大字号下的首屏余量。** `HOME-16` 的 16px 是默认字号下的实测；`--text-scale` 放大后 Today strip 与列表行都会长高 | 门槛钉在 12 并且只在默认字号下跑。没有静默放宽，也没有为了好看去改 `HOME_COMPOSER_CENTRE`（0.56）——WK-117 (b) 明确那需要 Fable 记显式修订与高度 / 内容反例 | Fable：是否把三档 text-size 加进 `HOME-16` 的跑法；如果大字号下过不了，是改 0.56 还是让 Modules 在小视口自动折叠 |
| ③ | **WK-129 (d) 的 PropertyRow（modified 指示 + reset）没有做。** `Home layout` 与 `homeModuleBand` 都是"有默认值事实"的本设备偏好行，正是那条裁定说可以先做的一类 | 不做。WK-129 (d) 原文把它定为"并入 CC-D0-a **之后**的 Settings 修整"——它是 Appearance 全组六行一起的事，只给新加的这一行做 modified / reset，会造成同一组里两种行的解剖 | Fable：单开一张 Settings 修整单，还是并进 FE-05a |
| ④ | **`Simple` / `Modules` 两个值名。** `Simple` 是相对 `Modules` 而言的，但它其实是"默认" | 沿工单原词，未自造第三种说法 | Fable：如果将来有第三种版面，这两个名字要不要一起重裁 |
| ⑤ | **一次端口误用已记录。** 起 cc-s 组时误用 8907，被 `EADDRINUSE` 拒绝（那是别人的服务），未启动任何进程，随即改回本单的 8905 | 记录在 `evidence/cc-d0a/README.md` 与 `cc-s/server.log` 首行，不隐去 | — |

## 13. 哪一像素改变了哪一判断

**992 → 940。**

模块带原本有自己的标题行。1440×900 实测：`Waiting for you` 的第一条具体待办，顶边落在 992，可见区底边 956——**36px 之外**。断言 `HOME-11-modules-900` 因此是红的。

这不是"看起来有点挤"。它是 WK-117 (b) 与 misfit M-7 说的那一件事的精确形状：**统计把具体待办推出了首屏**。而推它出去的东西，是一行为一行内容画的标题。

删掉那一行标题（−28），上留白 24 → 20（−4），Modules-only 的 section margin 32 → 24（−8）：带从 57px 变成 47px，待办顶边回到 940，露出 16px，断言变绿。

顺带被这条断言改掉的还有一个词：折叠控件从 `Hide` 变成 `Hide modules`——因为标题没了，控件必须自己说出它折的是什么。

**一个标题被删掉、一个按钮换了词，是因为一条具体待办要留在屏幕上。** 消融不是审美偏好，是断言逼出来的。

## 14. anti-slop 门自查（WK-112 (c) / WK-112 §IX）

| 门 | 自查 |
|---|---|
| **necessity** | 带上只有一行，那一行只有一个对象名与一个目的地。五个没有接缝的模块一个都没画，连空槽都没有。带的标题行被删掉了——因为它没有承担定义、条件、后果或对象名 |
| **fake dashboard density** | 带上**零个数字**（`HOME-10` 逐字检查带内不含 `\d`）。Home 上唯一的统计仍然是 Today 那三个，一个未增。没有热力图、没有 meter、没有 sparkline、没有百分比 |
| **gratuitous cards** | 带内可见边 **0**、阴影 **0**、`.home-card` **0**（`HOME-10` 实测）。带是一组行，不是一排卡 |
| **decorative badges** | 零。带上没有任何 badge、pill、chip、圆点或图标。`Manage connections` 是文字按钮，`Hide modules` 是文字按钮 |
| **hierarchy（WK-120 增问：字号 / 字重差是否足以让层级不靠颜色与框线成立？）** | 带上两级：模块名 `--text-label` 13px / 600，动作与折叠 `--text-meta` 12px / 400。**去掉颜色与框线之后层级仍然成立**——名字更大更重，动作更小更轻，位置也不同（名字在左起点，折叠在右边界）。带整体又比 Today 弱一级：Today 的数字是 20px，带上最大的字是 13px。这一档是本单能拿到的最好结果，但它落在 FE-05a（M-11 字阶与控件密度）之前，届时全站重定字阶时这一带要一起重量 |
| **system** | 新增一个间距 token `--space-5: 20px`，补的是既有 4 / 8 / 12 / 16 / 24 / 32 阶里缺的一档，取值落在工单 density 的 20–24 区间内。无新色、无新字、无新 radius、无新 shadow、无新图形（lint-colors / lint-materials 通过） |
| **reference fidelity** | 三源：shell-refinement §首页模块退为辅助（模块退次级带、可折叠、无数据不占大空卡）、EX-CC2 §3 / §4（逐模块接缝表与显隐存储建议）、WK-114 / WK-117 (b)（范围与优先级）。`home-modular.png` 的四块大卡与大热力图**未被采用**（工单 references.negative），画板里的 480 / 320 未被当作合同 |
| **AI tells** | 无渐变、无 mesh、无 noise、无遮罩、无浮层材质、无 emoji、无"✨"、无鼓励语、无"Coming soon"。带上四个词全部承重 |
| **reality** | 1440×900、1440×1058、390×844 三个视口、两种版面各量一次；数据是经产品自己的 `/api/v5` 播种出来的真实 run 与 question，不是 fixture 常量。**未量**：200% 缩放下的 Modules、深色宗、三档 text-size（§11） |

## 15. 下一单

CC-D0-b 待 BE-1/3 + BE-25、BE-29 交付；本单的准入合同 [home-modules §4](contracts/home-modules.md) 是那一单的入口条件。队列其余不变：FE-05a（M-11）→ FE-05 → CC-I；ATT-FE-01 在 ATT-BE-01 真实交付后按既定次序进入。
