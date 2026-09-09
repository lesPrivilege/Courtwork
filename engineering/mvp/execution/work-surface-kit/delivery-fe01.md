# FE-01 交付 · 产品词表、Settings IA、chrome、Home / Work composition

2026-09-09 · Claude Opus，单一 writer。工单 [WO-FE-round4 §FE-01](work-orders/WO-FE-round4.md) 第 0–7 项；裁定 [intake-round-3](intake-round-3.md) §4g（WK-88…95）、§4h（WK-96 / 97）、§4i（WK-98）、§4j（WK-99…103）。体例 [handoff-convention](handoff-convention.md)。

**作者验证与独验分列。** 本页全部为作者验证；Astra 的独立验收另页。视觉四轴（Maturity / Identity / Quietness / Durability）留用户，本页不自评。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `1688a7b`（WK11 合流后的清洁节点） |
| 分支 | `claude/fe01-vocab-ia` |
| 树 | `/private/tmp/se-agent-fe01` |
| 端口 / 数据目录 | 8885 / `/private/tmp/se-agent-fe01-data`（`main` 与 `rc` 两个子目录，见 §8）；MCP 线路 fixture 8886 |
| 凭据 | 未读取任何凭据文件；全程 local-fake / loopback |

| # | commit | 内容 |
|---|---|---|
| 1 | `fdb4d67` | 第 0 项：WK-98 两处缺陷、WK-102 两个 blur token 与回退、`tools/lint-materials.mjs` 进 `npm test` |
| 2 | `24c6eaa` | 第 1–4 项：词表、Settings IA、chrome、Home / Work composition |
| 3 | `36bd5e1` | 第 1 / 2 / 5 项的体例：copy-convention §3 改写、尺寸 token 表与 border 审计、shell layout contract、text-sweep §6 |
| 4 | `dd8935e` | 收尾：两条重复规则与两个死选择器 |
| 5 | `246737f` | 本页与 `evidence/fe01/`（两支新套件、改写后的 RC 三支、验证原文、九张 Settings 截图） |
| 6 | 本页最后一次提交 | 在 §1 补记 `246737f`。一次提交无法在自己内部写下自己的 SHA，所以这一行只说明它做了什么；分支头以 Astra 收到的为准 |

## 2. 改动文件

| 文件 | 改了什么 |
|---|---|
| `app/web/index.html` | 侧栏 header 收成 safe area + brand；`+ New project` 入 PROJECTS heading；capability badge、头像盘与连接名删除；File access 控件；Settings 九组的面板结构与六个 `data-wk11-mount` 落位 |
| `app/web/app.mjs` | 深链先 bootstrap 再读取；Home 三段的 DOM 次序与 `measureHomeLead()`；`setCapabilityBadge` 删除；File access 控件文案；Approval 词；全站 Chat 词；Settings 入口指向新组 |
| `app/web/settings-view.mjs` | `SETTINGS_GROUPS` 九组；`permissionLabels` 三句；`permissionWords` 导出取消；Theme / Palette（入 Advanced）；Memory 组一句话；finder 跨组 |
| `app/web/runtime-view.mjs` | 裸 `null` 与 revision 缺失；`renderPermissions` 拆出 `renderEnvironment`（第六个挂载点）；`scopeStrip()` 在可编辑的组各出现一次；块标题按所在组重述；用户可见句改 Chat 词 |
| `app/web/home-view.mjs` | Today 模块头（三数字一条 strip，Heatmap Planned 行删除）；runtime 不可达收成一行 + Retry + 诊断 disclosure；空态条件句改词 |
| `app/web/presentation-adapters.mjs` | 两条 tile 定义句与三处缺名回退改词 |
| `app/web/thread-projection.mjs` | 三个 Approval 标题 |
| `app/web/materials-view.mjs`、`app/web/workspace-view.mjs` | Chat 词 |
| `app/web/styles.css` | 两个 blur token 与两处 reduced-transparency 回退；`--home-column` / `--window-safe-area`；Home 版面（lead、measure、composer 初始高、31vh 退役）；Today strip；连接行；chrome 的 `x` / `panel-left` 归位；border 审计两处 |
| `tools/lint-materials.mjs` | 新增：`backdrop-filter` 只在登记类名且取自闭集；每处半透明表面有完整回退 |
| `app/tests/material-governance.test.mjs` | 新增：一条正向 + 三条反向 |
| `app/tests/{presentation-adapters,settings-preferences,ui-event-mapping}.test.mjs` | 随词表与 IA 更新断言（§7） |
| `docs/interface-components.md` | shell layout contract；Settings 与 Runtime Workbench 两节随 IA 改写 |
| `engineering/design/copy-convention.md` | §3 改写为用户可见词表；§1 / §2 三处随之 |
| `engineering/design/ui-composition-standard.md` | 尺寸 token 表、三种 composition state、border 审计 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §6：旧词 · 新词 · 位置 |

未改：`app/server`、`app/runtime`、`app/core`、`domains`、`brand`、任何 HTTP 契约、`package.json` 依赖。未新增 review 状态、字段或端点。未画 FE-02 / FE-03 需要而后端未交付的控件（Fetch models、Test connection、Memory 控件、Temporary chat）。

## 3. 消融表

每一处新增或删除的元素过一次删除测试：**去掉它之后，界面上少了哪一个判断？** 少不了任何判断的，删；少得了的，留并写清它承担什么。

### 3.1 删除（去掉后不失去判断）

| 元素 | 位置 | 去掉后失去的判断 | 结论 |
|---|---|---|---|
| header capability badge `Local test` | 原 `index.html` `#capability-badge` | 无。连接身份在同一屏的 composer 上下文行说过一次；这是第二遍（视觉审查 §7） | 删 |
| 侧栏脚的头像盘 + 连接名 | 原 `#account-avatar` / `#account-name` | 无。这是同一屏的第三遍；且圆盘背后没有可打开的身份，WK-39 自陈"it is a label, not a menu"——一个不指向任何东西的圆盘正是 WK-94 禁的持久装饰物 | 删 |
| `Activity by day` + `Backend pending` 行 | 原 `home-view.mjs` `renderHomeBand` | 无。能力缺口仍逐条在 Settings › Developer › Planned；实现态文案不上 production Home（WK-94 (6)） | 删 |
| 三个数字之间的竖分隔线 | 原 `styles.css` `.stat-row > .home-stat + .home-stat` | 无。间距与对齐已经分开三个数字；有线时它们读起来像三个格子，而裁定要的是一条 strip | 删 |
| `.home-card` 的一圈 1px 线 | `styles.css:3138` | 无。卡的身份由内距、表面色与标题行承担；线是第二重边界（WK-94 border 审计） | 改为 `--panel-muted` 表面 |
| 空态的 `clamp(96px, 31vh, 640px)` | 原 `styles.css` `.home-active.home-empty .composer-area` | 无，且去掉后多一个判断：空态与有内容态不再是两套版面，composer 的位置由同一个量出来的 lead 决定 | 删 |
| `File writes` 标签 + `Ask` / `Write` / `Read` 三个单词 | `index.html`、`app.mjs`、`settings-view.mjs` | 无。两半各说一半：标签说主题，单词说取值，合起来才是一句话。合成一句后判断更完整 | 删标签，单词升为整句 |
| `permissionWords` 导出 | `settings-view.mjs` | 无。它是同一件事的第二套说法 | 删 |
| Composition 块里的第二条 scope strip | `runtime-view.mjs` `renderComposition` | 无。它与 Overview 同在 Developer 组，同一个选择在一组里出现两次会多一个 tab stop | 删 |
| `Model, provider and environment` 标题 | `runtime-view.mjs` `environmentFacts` | 无。它现在落在 Models 组 `In force` 块标题之下，两个标题说同一件事 | 删 |
| `#settings/runtime` 深链 | `settings-view.mjs` `SETTINGS_GROUPS` | 失去"旧链接仍可用"。按 AGENTS.md「不保留向后兼容」不加重定向：未知节名落回 General，这是既有行为，不是新分支 | 删 |

### 3.2 新增（去掉后会失去判断）

| 元素 | 位置 | 去掉后失去的判断 | 结论 |
|---|---|---|---|
| `Today` 模块名 | `home-view.mjs:143` | 失去"这三个数字属于哪一个模块"；没有名字的三个数字会重新变成一条无归属的带 | 留 |
| 连接行 `○ Local runtime unavailable  Retry` | `home-view.mjs:380` | 失去"不可达的是什么"与"能做什么"。原先是一整块横向 panel，判断没多，重量多了 | 留 |
| 其下的 `Details` disclosure | 同上 | 失去宿主的原话，也就失去了诊断能力 | 留（收进 disclosure：它是诊断，不是首屏事实） |
| `--home-lead`（量出来的 composer 提前量） | `app.mjs:3179`，`styles.css:2968` | 失去"composer 是全页唯一锚点"这一判断本身：没有它，composer 贴在 orientation 下面，与下方模块等权 | 留 |
| `--home-column` 820 | `styles.css:279` | 失去"入口略宽于阅读列"的差别；与 740 同宽时 Home 与 Work 的 composer 读起来是同一件东西 | 留 |
| Settings › Memory 的两句 | `settings-view.mjs:1301` | 失去"这个产品现在不跨 Chat 记忆"这一能力边界。一个空组比一句话更容易被读成"功能没做完" | 留（无控件，BE-19 前不画） |
| Developer › Runtime 的一句定义 | `index.html` Developer 组 | 失去"Runtime 不是 Permissions"的区别，而这正是把 Runtime 从顶层撤下之后最容易混的一处 | 留 |
| 可编辑组各一条 scope strip | `runtime-view.mjs:509` | 失去"正在编辑哪一层"。Permissions 组的策略编辑没有它就不可用（见 §11 待裁定 3） | 留 |
| `Advanced` disclosure（Appearance） | `settings-view.mjs:1256` | 失去"换色阶是少数人做的事"的分级；Palette 与 Theme 并列时二者争同一层注意力 | 留 |
| `Connection · <provider> · <model>` accessible name | `app.mjs:3033` | 失去 icon 化的 composer 连接控件的完整读法（copy-convention §2） | 留 |
| `--blur-chrome` / `--blur-transient` 与两处回退 | `styles.css:262`/`263`、`1260`、`2258` | 失去"模糊是闭集"与"关掉透明效果的人看到实色"两个判断 | 留 |
| `tools/lint-materials.mjs` | 新文件 | 失去机械化检查：两条规则会退回"写在文档里的规矩" | 留 |

## 4. 五轮收敛表（WK-100）

轮次：① 信息层级 · ② 光学对齐 · ③ 组件几何 · ④ 材质层级（FE-05 前只验"不越层、无未登记 blur"）· ⑤ 交互状态（SH-4 七态 + running / error）。

### 4.1 Home

| 表面 | 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Home · orientation | ① | 一句话，无数字，无 greeting；全块 ≤120 | 通过（实测 38） | `styles.css:2979`；`composition-checks.log` HOME-3 |
| Home · composer | ① | 全页唯一 primary action；其上非 chrome 内容 ≤180 | 通过（实测 38） | `app.mjs:3179`；HOME-2 |
| Home · composer | ② | 中心落在主区 55 % 或更下；宽 760–880 | 通过（0.56 / 820） | `app.mjs:3178`、`styles.css:279`；HOME-1 / HOME-4 |
| Home · composer | ③ | 本体初始高 92–112；radius 与 Work 同 token | 通过（96） | `styles.css:2995`；HOME-5 |
| Home · composer | ④ | Home 态 composer 下无滚动内容，保持 `--float` 实色，无 blur | 通过（`.composer-form` 只有 `--float`；`lint-materials` 登记表内无此类名） | `styles.css:1287`；`lint-materials.log` |
| Home · composer | ⑤ | default / hover / pressed / focus-visible / selected / disabled / loading 七态 + Send 的 running | 通过（`:focus-within` 换边色；Send 禁用与 pending 分别可辨） | `styles.css:1284`；`counterexamples.log` FE-T09 |
| Home · Today strip | ① | 同语义 label 同字号 / weight；模块名与三个数字分层 | 通过 | `home-view.mjs:143`、`styles.css:3018` |
| Home · Today strip | ② | 三个 tile 左起点对齐 composer 左边缘；`--home-column` 同边 | 通过 | `styles.css:3023` |
| Home · Today strip | ③ | 无卡感：无边框、无阴影、无第二重边界；divider / border 只用固定 token | 通过（竖线取消，见 §3.1） | `styles.css:3032` |
| Home · Today strip | ④ | 背景只用 L0/L1 role，无 blur | 通过 | `lint-colors.log` |
| Home · Today strip | ⑤ | tile 是控件：hover / pressed / `aria-pressed` selected / focus 各不相同 | 通过 | `styles.css:3061`–`3080` |
| Home · 模块列表 | ① | row 为默认，card 只给可打开的 Work 对象；每节唯一 primary action | 通过 | `home-view.mjs:165`（row）、`:201`（card） |
| Home · 模块列表 | ② | row 的 glyph 16、标题起点、状态词右对齐一致 | 通过 | `styles.css` `.home-row` 组 |
| Home · 模块列表 | ③ | card 的边界改为表面而非线（border 审计） | 通过 | `styles.css:3138` |
| Home · 模块列表 | ④ | 不越层：card 在 L1 panel 上，不取 `--float`、不取 blur | 通过 | `lint-colors.log`、`lint-materials.log` |
| Home · 模块列表 | ⑤ | 键盘 j / k / Enter / o 与指针同目标；focus 可见 | 通过 | `counterexamples.log` FE-T02-a |
| Home · 首屏 | ① | 下半部必须有可见 continuity 内容 | 通过 | HOME-6 |
| Home · 连接不可达 | ① | 一行状态 + 一个动作；诊断退到 disclosure | 通过 | `home-view.mjs:380` |
| Home · 连接不可达 | ⑤ | error 态可辨且不只靠颜色（圆点 + 文字 + 动作） | 通过 | `styles.css:3100` |

### 4.2 Work（绑定前的 Chat 与绑定后的 Work 同一 shell）

| 表面 | 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Work · 主区 | ① | 不渲染任何 Home dashboard primitive（不是"隐藏"，是"离开文档"） | 通过（实测 0） | `app.mjs:3015`；WORK-1 |
| Work · composer | ① | 是 continuation control，不承担 hero；controls 压成单层 | 通过 | `styles.css:1300`（`.composer-controls` 单行） |
| Work · composer | ② | 沉底；与 reading measure 同宽 | 通过（740） | WORK-2 |
| Work · composer | ③ | 本体初始高 80–96 | 通过（88） | `styles.css:1287`；WORK-3 |
| Work · composer | ④ | Work 态沉底 composer 是否取 `--glass` 属 FE-05 二择；本单保持 `--float` 实色，无未登记 blur | 通过（登记表内只有 `.jump-latest-button` 与 `.context-popover`） | `tools/lint-materials.mjs:29` |
| Work · composer | ⑤ | 七态 + running（Cancel 替换 Send）+ waiting_user 的一行 | 通过 | `app.mjs:3102` |
| Work · File access 控件 | ① | 一个控件说全后果，不再是标签 + 单词 | 通过 | `app.mjs:3046` |
| Work · File access 控件 | ③ | 与相邻的连接控件同高、同 radius、同字号 | 通过 | `styles.css:3867` |
| Work · File access 控件 | ⑤ | `aria-expanded` 随浮层开合；tooltip 与 accessible name 同词 | 通过 | `index.html:336`、`app.mjs:3049` |
| Work · 右侧 surface | ② | 出现时正文 measure ≥640 | 通过（正文列 1190，composer measure 740） | WORK-4 |
| Work · 右侧 surface | ④ | L2 浮层用 `--float` + `--shadow-float`，不做 glass-on-glass | 通过 | `lint-materials.log` |
| Work · 右侧 surface | ⑤ | 打开时焦点不被遮 | 通过 | `counterexamples.log` FE-T10-d |
| Work · Approval 卡 | ① | 一个对象一张卡；两个动作对象化命名 | 通过 | `app.mjs:4980` |
| Work · Approval 卡 | ⑤ | pending / allowed / denied / closed 四态各有自己的句子 | 通过 | `app.mjs:4963`、`:5031` |

### 4.3 Settings

| 表面 | 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Settings · 导航 | ① | 九组按用户任务命名；组名唯一，不与块标题重复 | 通过 | `settings-view.mjs:579` |
| Settings · 导航 | ③ | 九个 tab 同高同 radius；roving tabindex 只有一个 tab stop | 通过 | `rc/runtime-ui-viewport.json` |
| Settings · 导航 | ⑤ | 手动激活：方向键移焦点，Enter 进节并交焦点 | 通过 | `counterexamples.log` FE-T10-a |
| Settings · General | ① | 只剩 New chats、This chat、Data 三块；Connection 已迁出 | 通过 | `index.html:398` |
| Settings · Models | ① | Connection 编辑在上，`In force` 只读在下；一个能力一个编辑入口 | 通过 | `index.html:425`、`runtime-view.mjs` `renderEnvironment` |
| Settings · Models | ② | label / help 一列，control 一列，两块共用同一栅格 | 通过 | `shots/settings-models.png` |
| Settings · Tools & Integrations | ① | 块标题按用户词重述（Tools, MCP servers and plugins） | 通过 | `runtime-view.mjs:1830` |
| Settings · Skills | ① | 块标题 Instructions, skills and references；四种准入各一句 | 通过 | `runtime-view.mjs:1706` |
| Settings · Memory | ① | 一句用户世界的句子；无控件、无 focusable | 通过 | `settings-view.mjs:1301` |
| Settings · Permissions | ① | Policy 块 + 解释；provider / model 不在此组 | 通过 | `runtime-view.mjs:2278` |
| Settings · Permissions | ⑤ | active Run 时整组只读且不称"已排队" | 通过（FN-16 断言未改） | `rc/runtime-ui-checks.json` |
| Settings · Developer | ① | Runtime 一句定义 + Overview / Composition + Extensions + runtime-info + Planned | 通过 | `index.html:523` |
| Settings · Developer | ③ | Planned 行零 interactive 子孙 | 通过 | `rc/runtime-ui-checks.json` |
| Settings · 全部九组 | ② | 无横向溢出；行的 label 起点与控件右边界一致 | 通过（五个持有 runtime 块的组逐组测） | `rc/runtime-ui-viewport.json` |
| Settings · 全部九组 | ③ | 390 下每个可见控件 ≥44 高 | 通过 | 同上 |
| Settings · 全部九组 | ④ | 不越层、无未登记 blur：整页是 L1，无 `backdrop-filter` | 通过 | `lint-materials.log` |
| Settings · 全部九组 | ⑤ | reduced motion 下无动画 | 通过 | `rc/runtime-ui-viewport.json` |
| Settings · Appearance | ① | Theme 在第一层，Palette 退到 Advanced | 通过 | `settings-view.mjs:1256` |
| Settings · Appearance | ⑤ | 换 palette / text size 后状态词与合法动作不变 | 通过 | `counterexamples.log` FE-T09 |

## 5. text-sweep 增量

三列（旧词 · 新词 · 位置）在 [text-sweep §6](text-sweep.md)：§6.1 会话对象 → Chat（29 行）、§6.2 一次动作 → Approval（7 行）、§6.3 文件模式 → File access（8 行）、§6.4 外观（3 行）、§6.5 删（D-27…D-30）、§6.6 新增字符串的承重说明（13 条）。改写后的词表在 [copy-convention §3](../../../design/copy-convention.md)。

## 6. 分配反例（结果原文）

`node engineering/mvp/execution/work-surface-kit/evidence/fe01/counterexamples.mjs`（8885，CDP 19885），全文见 [counterexamples.log](evidence/fe01/counterexamples.log) 与 [counterexamples.json](evidence/fe01/counterexamples.json)：

```
PASS FE-T02-a — the first work row opens the same chat by pointer and by keyboard (FN-05)
      pointer=20e8da83-fc35-4a9c-a7d9-7095916cf966 keyboard=20e8da83-fc35-4a9c-a7d9-7095916cf966 focusAfterJ=home:pendingItems:512086f8-a284-41e5-8998-36673bd4c151
PASS FE-T02-b — the Settings button and the deep link reach one page with one section state; the retired `runtime` section falls back rather than redirecting (FN-05 / WK-90)
      {"fromButton":{"open":true,"section":"general","hash":"#settings/general"},"fromHash":{"open":true,"section":"models","tab":"true","panelVisible":true},"retired":"general"}
PASS FE-T02-c — one capability, one visible entry: the connection card is opened from the composer's context row alone and the connection is named once (FN-05 / WK-94)
      {"visible":["model-settings-button"],"badgeRemoved":true,"connectionNamedTimes":1}
PASS FE-T09 · palette · gray steel — state words and legal actions are unchanged by appearance, size and motion (FN-09 / 10 / 27 / 29)
      {"missing":[],"added":[],"states":6}
PASS FE-T09 · text size · large — state words and legal actions are unchanged by appearance, size and motion (FN-09 / 10 / 27 / 29)
      {"missing":[],"added":[],"states":6}
PASS FE-T09 · reduced motion — state words and legal actions are unchanged by appearance, size and motion (FN-09 / 10 / 27 / 29)
      {"missing":[],"added":[],"states":6}
PASS FE-T09 · 390 wide — state words and legal actions are unchanged by appearance, size and motion (FN-09 / 10 / 27 / 29)
      {"missing":[],"added":[],"states":6}
PASS FE-T09 · dark — state words and legal actions are unchanged by appearance, size and motion (FN-09 / 10 / 27 / 29)
      {"missing":[],"added":[],"states":6}
PASS FE-T10-a — arrow keys move focus in the settings tab list and Enter activates, handing focus to the panel (FN-26)
      arrow=settings-tab-appearance enter={"active":"settings-appearance","section":"appearance"}
PASS FE-T10-b — a `/` inside an IME composition stays a character; the finder does not take it (FN-27)
      {"before":"settings-appearance","after":"settings-appearance","prevented":false}
PASS FE-T10-c — a dialog holds the focus and returns it to the control that opened it (FN-26 / 27)
      {"inside":true,"closed":true,"returned":"materials-button"}
PASS FE-T10-d — with the work surface open the focused composer is not covered by it (FN-27)
      {"surfaceOpen":true,"hidden":0}
12 / 12
```

FE-T09 的读数取自主区与其上的浮层，不取导航栏：侧栏在 1024 以下变成 overlay 是 FN-27 允许的导航形态变化，而状态词与合法动作不是。FE-T10-b 是合成事件（`isComposing` 为真的 keydown），**不等于**真实 IME；真实输入法仍为 `not_run`（§10）。

## 7. 既有回归按新 IA 更新后的结果

| 套件 | 原落点 | 本单如何更新 | 结果 |
|---|---|---|---|
| Home 几何（`home-geometry.mjs` / `home-checks.mjs`，`evidence/wk13-main-integration-20260908/regression/`） | 断言 `home-empty` 类、composer 64–160、状态句在框外 | **被取代**：`home-empty` 的 31vh 版面按 WK-94 退役，composer 的取值区间按 WK-97 收紧为 Home 92–112 / Work 80–96。新套件 [composition-checks.mjs](evidence/fe01/composition-checks.mjs) 覆盖原有三条断言（状态句在框外 → HOME-2 的"其上内容"、composer 高 → HOME-5 / WORK-3、无横向溢出 → HOME-overflow / WORK-overflow）并加上 WK-96 的其余约束 | **16 / 16** |
| Settings（`app/tests/settings-preferences.test.mjs`） | 断言五个组的闭集 `general / appearance / keyboard / runtime / developer` | 改为九组闭集，并新增一条：`isSettingsSection("runtime") === false`——旧节名不再解析，落回 General 是被断言的行为，不是意外 | 通过（在 212 / 212 内） |
| `app/tests/presentation-adapters.test.mjs` | 断言缺名回退 `Open session` | 改为 `Open chat`（WK-89） | 通过 |
| `app/tests/ui-event-mapping.test.mjs` | 断言 `Allow this remote tool call?` | 改为 `Approve this remote tool call?`（WK-89） | 通过 |
| RC 契约（`runtime-ui-checks.mjs`） | `#settings/runtime` + `#settings-runtime`；`surface` 一条断言五个块在同一个 tabpanel 内 | 入口改 `#settings/developer`，根改 `#settings-sections`；`surface` 改为逐块断言"存在且唯一、落在 WK-90 指名的那一组、且那一组是 tabpanel"；scope 断言锚到 Developer › Runtime 的那一条 strip 与 `#runtime-precedence` | **20 / 20** |
| RC 反例（`runtime-ui-counterexamples.mjs`） | 同上入口 | 只改入口与根，断言未改 | **9 / 9** |
| RC 视口（`runtime-ui-viewport.mjs`） | 在一个组内测溢出、命中区、键盘、reduced motion | 溢出与命中区改为**逐组**测（developer / skills / tools / permissions / models），因为隐藏的面板没有几何、测出来会把每个控件报成 0 高；scope 键盘在 Developer 测，Configurable / Inventory 键盘在 Tools 测；rail 卡的 Open 断言改为落在 Developer 组 | **36 / 36** |

RC 三支脚本的改写副本在 [evidence/fe01/rc/](evidence/fe01/rc/)，每处改动在脚本注释里写明改的是什么、为什么改的不是断言本身。**给 Astra**：`evidence/wk11-main-integration-20260909/rc/` 下的原副本仍是旧 IA，独验前需要同样的三处更新（入口、根、逐组测量）。

## 8. 端口、数据目录与 fixture

| 用途 | 端口 | 数据目录 | fixture |
|---|---|---|---|
| Home / Work composition 与反例 | 8885 | `/private/tmp/se-agent-fe01-data/main` | `evidence/fe01/seed.mjs`（自 WK13 套件复制，仅改端口）；`stage=rows`，4 chats / 1 pending / 1 inspection |
| RC 三支 | 8885（另起） | `/private/tmp/se-agent-fe01-data/rc` | `evidence/fe01/rc/seed-fixture.mjs`；MCP 线路 fixture 在 **8886** |

两个数据目录都是本单自建的空目录，互不干扰；8850–8861、8810、8817、8818 未使用；结束后本单启动的服务已停止。

## 9. allowlist / 后端请求

- **allowlist：无请求。** 本单未新增 `app/web/*.mjs` 模块——Settings 的九个组、Memory 的一句话、第六个 runtime 挂载点全部落在既有的 `settings-view.mjs` / `runtime-view.mjs` / `index.html` 内，所以 `app/server/index.mjs:22` 的静态白名单不需要改。
- **后端请求：无新增。** [backend-requests](backend-requests.md) 现有的 BE-17 / 18（Fetch models / Test connection）、BE-19 / 20（Memory adapter / Temporary chat）仍是 FE-02 / FE-03 的前置；本单据此不画对应控件，Memory 组只有一句话。BE-1 / 3、BE-12、BE-14 / 15 / 16 状态未变。

## 10. 未检项（分列，一律 not_run）

| 项 | 状态 | 说明 |
|---|---|---|
| 触控（真实触屏） | `not_run` | 命中区在 390 下由 `runtime-ui-viewport` 逐组量过尺寸，但没有真实触屏交互 |
| 读屏（VoiceOver / NVDA） | `not_run` | accessible name 与 `aria-*` 是静态断言；单词标签的全句读法未在读屏下听过 |
| 真实 IME | `not_run` | FE-T10-b 是合成的 `isComposing` 事件；真实输入法的候选窗与 keyCode 229 路径未测 |
| 200 % 浏览器缩放 | `not_run` | 只测了 1440 / 390 两个 viewport 与 Text size 三档；浏览器缩放是另一件事 |
| 1024–1439 中间档 | `not_run` | `x` 只在 <1024 出现的分界点未在中间档逐档验 |
| 真实 provider | `not_run` | 全程 `fake-openai-loopback`；G1 仍待用户在 GUI 配置 |
| 视觉四轴 | 留用户 | 不自评 |

## 11. 待裁定

1. **`composer 中心 ≥ 主区高 55 %` 与参考稿的 `下方主内容自 48–55 % 起` 互斥。** 工单与 WK-96 写"中心不低于 55 %"，[composition 参考](inputs/composition-references-2026-09-09.md)的法则草案写"下方主内容自页面高度约 48–55 % 起"——若 composer 中心在 55 %，下方内容只能从约 62 % 起。本单按**工单**实施（中心 0.56，下方模块自约 68 % 起，首屏下半部仍可见 Continue 内容，HOME-6 通过）。若裁定取参考稿的读法，改的是 `app.mjs:3178` 的一个常数与 `composition-checks.mjs` 的一条断言。
2. **`本体初始 92–112` 指 composer 整体还是输入体。** 本单沿 WK13 既有几何脚本的量法（量 `#composer-input`，原断言 64–160），把区间收紧到 Home 96 / Work 88。若指整个 `.composer-form`（含 controls 行），两个数字都要重定。
3. **scope strip 在四个组各出现一次，是否算"只搬家不改内容"。** WK-90 说 WK11 五节只搬家不改内容，但 `Permissions & environment` 拆开后，Permissions 组的策略编辑失去了它原本共用的作用域选择器。本单选最保守的实现：**同一个控件**（读写同一个 `scopeType`，不是第二个真源）在每一个可编辑的组各画一次，各自有独立 focus key；Overview 与 Composition 同组，只画一次。若裁定"搬家就是搬家、不得增加落点"，则需另裁 Permissions 组如何选择作用域。
4. **WK-94 的 border 四角色闭集与 SH-2 的"重复行分隔"通道冲突。** `styles.css` 尚有约六十处 1px 分隔线（侧栏与 chat header 的带脚、settings block 的分组线、重复行的行分隔）。本单只收口自己触及的表面（Home 的两处），全站清扫留裁定后单独一单——一次拆掉六十处会改变每个表面的读法，而本轮没有对应的像素验收。理由与清单在 [ui-composition-standard § Border 审计](../../../design/ui-composition-standard.md)。
5. **`--nav` 250 低于视觉审查建议的 256–280 下沿 6 px。** WK-42 已裁定的既有值，本单未动。
6. **侧栏脚删掉连接名之后，那一行只剩 Refresh 与 Settings 两个 icon 控件。** 这是"同一事实一屏只说一次"的直接后果，但它也让侧栏脚从一行"账户行"退化成一条工具条。若要保留一个身份，需要先有一个真实可打开的身份对象（现在没有）。

## 12. 哪一像素改变了哪一判断

- **composer 的中心从主区约 26 % 落到 56 %。** 之前 composer 紧跟 orientation，与其下的数字带等距；一屏上"先看数字还是先写字"没有答案。落到 56 % 之后，它上面是一大片静区，下面是模块——**哪一个是入口**这个判断由位置本身回答，不再需要更大的字号或更重的边框去说。
- **三个数字从 composer 上方移到下方，字号从 25 px 降到 20 px。** 数字在上时它们是页面的第一件事，人先读"1 / 4 / 1"，再找哪里输入；移到下面之后它们变成 Today 这个模块的读数。降 5 px 是同一个判断的第二半：一个模块的读数不该比页面标题还大。
- **三个数字之间的竖线消失。** 有线时它们是三个格子，人会去比较；无线只有间距时它们是一条 strip 上的三个数字，读法从"比较"变成"扫一眼"。这正是 WK-94 说的"无卡感"。
- **`Activity by day  Backend pending` 一行消失。** 那一行占 1 行高、约 14 px 字，但它让 production Home 的最后一句话是"某个功能还没做"。删掉之后 Home 的最后一句话是一个真实的 Continue 行——**这个产品现在能做什么**，判断从"未完成"翻回"可继续"。
- **runtime 不可达从一整块横向 panel 收成一行 24 px。** 之前它是首屏第二重的东西，一个连接问题看起来像一次事故；收成一行之后，它与它所属的连接同一量级，而诊断仍在一次点击之内。
- **`File writes  Ask` 两段文字合成 `Ask before editing ▾` 一段。** 之前可见的是主题加取值，两半都不完整；合成之后可见文字本身就是后果，**"它会不会动我的文件"**这个判断不再需要把两个词拼起来。
- **header 少了一个 `Local test` 徽章，侧栏脚少了一个 24 px 圆盘和一行字。** 三处说同一件事时，人要先判断"它们是不是同一件事"；只说一处之后，那个判断不必再做。
- **侧栏第一行少了 `+` 和 `×`，`+` 出现在 PROJECTS 那一行的右端。** 品牌行原本是"身份 + 两个动作"，读起来像工具栏；`+` 落到 PROJECTS 之后，**它加的是什么**由它旁边的词回答，不再需要 tooltip。
- **Settings 左列从五项变九项，`Runtime` 不再在其中。** 之前一个普通用户要改模型得先在 General 里找连接、要看权限得先理解 Runtime；现在左列的每一项都是一件人想做的事，**"我该点哪一项"**这个判断从"猜架构"变成"读名字"。
- **两处 `backdrop-filter` 的 12 px 与 16 px 变成两个 token，并各加一条 reduced-transparency 回退。** 像素上关掉透明效果时才看得见差别：之前那两处在系统关掉透明后仍然模糊，之后是实色。判断的变化是**"这个界面尊不尊重我的系统设置"**。

## 13. Fable 复核（WK-105，2026-09-09）

独立重跑于本树 `bfefcd2`：`npm --prefix app test` 212/212；`lint-colors` ok（15 files）；`lint-materials` ok（2 files）；`contrast-report` 无低于门槛；`smoke` 通过、realProvider not_run。`git diff 1688a7b..HEAD -- app/server app/runtime app/core domains brand` 为空。目视 `home-1440-light.png`、`work-1440-light.png` 与九张 Settings 截图，与 WK-96 / 97 版面一致；不冒充浏览器独验，四轴留用户。

§11 六项裁定：

1. 取 WK-96 原文（中心 ≥ 55 %），0.56 接受；参考稿的 48–55 % 起点已被 WK-96 冻结值取代，不再引用。
2. 92–112 指 `#composer-input` 本体，沿 WK13 量法；Home 96 / Work 88 接受。
3. scope strip 为同一控件多处挂载、单一 `scopeType` 真源，不是新状态或第二真源；"只搬家不改内容"约束语义与合法动作，不约束挂载次数。接受；FE-T09 已覆盖状态不变。
4. 分隔线（SH-2 行分隔通道，1 px `--line`，不闭合）与对象边框（WK-94 四角色闭集：input / selected / floating / error）是两个通道。全站六十处不清扫；ui-composition-standard 的 border 审计表按"边框 / 分隔线"两列重标，作后续单的台账，不另立工单。
5. `--nav` 改 256，与本单写入的 sidebar 256–280 token 表一致；列 FE-02 第 0 项，附几何断言。
6. 侧栏脚保持两个 icon 控件的工具条；账户行待真实身份对象（无对应 BE，登记为观察，不造能力）。

`Local test` 在 composer 框内稳定行（WK-58 / 73 的连接 chip 位）说一次，header 徽章退役，符合 WK-94 意图；"上下文行"措辞按此理解。给 Astra：`evidence/wk11-main-integration-20260909/rc/` 原副本仍是旧 IA，独验请用 `evidence/fe01/rc/` 三处改写（入口 `#settings/developer`、根 `#settings-sections`、视口逐组量测）。接受，交 Astra 合流；FE-02 从合流后的 main 建树。
