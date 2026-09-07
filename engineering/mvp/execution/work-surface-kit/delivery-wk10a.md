# WO-WK10a 交付 · 右栏模块导轨、三栏对齐带、composer 层级、文本清退（Opus）

分支 `claude/wk10-rail`，基线 = 整合头 `9cb1d7e`（`claude/wsk-integration` = WK6+WK8+RC+WK7）。
worktree `/private/tmp/se-agent-wk10`，数据目录 `/private/tmp/se-agent-wk10-data`（全新，runtime
schema 4），端口 8855。Node v25.9.0。**真实 provider：not_run**——宿主 `capabilities.mode =
"local-fake"`，全程未配置也未调用真实 provider，未读取任何凭据文件。

消费裁定：WK-41 / 42 / 33 / 56 / 45 / 46 / 47 / 13 / 44 / 59 / 55 / 58 / 60 / 51 / 52 / 40 / 30 / 54。
不含 WK-43 热插拔、WK-57 Chat Flow 卡片、WO-WK4 Review 纵切——按 WK-62 属 b。

## 1. 提交

| SHA | 题 |
|---|---|
| `c1b2969` | web: the right column becomes a rail of peer modules |
| `ec9ac6b` | web: three columns share one band and one gutter |
| `919c0cb` | web: the composer is the top floating layer, docked below 768 |
| `4d40019` | web: icon tiers and the site-wide text sweep |
| （末次提交） | web: the ablation, the delivery record and the WK10a evidence |

## 2. 文件

| 文件 | 改动 |
|---|---|
| `app/web/surface-modules.mjs` | **新增**。静态登记表：`{ kind, title, icon, tabId, contentId, repaint?, adapter(facts), card(schema, host), pane(schema, host) }`，四条：run / file / preview(workspace) / runtime。含全表共用的一套卡片解剖（`railCard` / `railRow` / `fileRow` / `openAction`）。 |
| `app/web/app.mjs` | rail host 一处：`surfaceFacts()`（宿主事实）、`railHost`（只读意图）、`renderSurfaceRail()`、`renderSurfacePanes()`、`loadSurfaceKind()`、`loadRailFacts()`、`openSurfaceRail()`、`visibleSurfaceKinds()`、`surfaceKindTitle()`；`renderSurfaceVisibility` / `activateSurface` / `setSurfaceExpanded` / `surfaceIsModal` 改写；`renderWorkspaceFiles()` → `loadWorkspaceTree()`（读入 `state.surface.workspace`）；`renderComposer` 的 composer 落位按视口分两支。 |
| `app/web/index.html` | shell 条移到 `#app-shell` 首子（横贯整窗）；chat header 内容包进 `.chat-header-inner`；`#surface-tabs` 移入 `.surface-header`（带内）；新增 `#surface-rail`；删 `#surface-eyebrow`；编辑弹窗 help 首句删。**既有 id、role、`aria-controls` / `aria-labelledby` 关系、tab 次序一律不动。** |
| `app/web/styles.css` | 修一处整合头遗留的未闭合 `@media`（见 §3 注）；`--band-top` / `--col-gap` 两个 token；带、导轨卡、壳内展开面、窄宗 composer 层、图标三档；删 `.workspace-description` 与 `.workspace-card` 的外框。 |
| `app/web/runtime-view.mjs` | 只加一个只读 `summary()`（读已 fetch 的 snapshot，供导轨卡陈述计数与冻结态）。内部逻辑、文案、请求一律未动。 |
| `app/web/inspector.mjs` `workspace-view.mjs` `home-view.mjs` `materials-view.mjs` `settings-view.mjs` | 仅文本清退（见 `text-sweep.md`）。 |
| `app/server/index.mjs` | **一行**：STATIC allowlist 加 `surface-modules.mjs`。工单允许的唯一 server 侧改动，在此登记。 |
| `evidence/rc/runtime-ui-viewport.mjs` | `escape-order` 一条按 WK-54 的两步次序改写（见 §5）。 |
| 新增文档 | `text-sweep.md`、`ablation-wk10a.md`、`evidence/wk10a/**`。 |

> 整合头 `9cb1d7e` 的 `styles.css` 有一处 `@media (min-width: 1024px)` 未闭合，把其后**全部**规则
> （整个 runtime 模块样式与 WK-55 的 `#composer-below`）关进了 ≥1024。本单顺手补上闭合括号；这也是
> 窄宗 composer 能按 WK-58 / 60 分层的前提。

## 3. 验证（逐字结果）

| 项 | 命令 | 结果 |
|---|---|---|
| 单元测试 | `npm --prefix app test` | `ℹ tests 136` / `ℹ pass 136` / `ℹ fail 0` |
| 颜色 lint | `node tools/lint-colors.mjs` | `lint-colors: ok (14 files)` |
| 对比度 | `node tools/contrast-report.mjs` | 76 行「通过」，0 行「未通过」 |
| DOM 断言 | `WK10A_BASE=http://127.0.0.1:8855 node evidence/wk10a/dom-assertions.mjs` | `16/16 checks passed` |
| WK6 交互 | `WK6_BASE=http://127.0.0.1:8855 node evidence/wk6/home-interaction-checks.mjs`（全新数据目录） | `PASS 7/7` |
| RC 契约 | `RC_APP=http://127.0.0.1:8855/ RC_PORT=8855 node evidence/rc/verify.mjs` → `runtime-ui-checks.json` | **18/19**（未过：`remote-tools`） |
| RC 反例 | 同上 → `runtime-ui-counterexamples.json` | **8/9**（未过：`mcp-lifecycle`） |
| RC 视口 | 同上 → `runtime-ui-viewport.json` | **36/36** |
| 键盘 | DOM 断言 #7 | tab 条 `ArrowRight` / `End` / `Home` 依次落在 `surface-runtime-tab` / `surface-runtime-tab` / `surface-preview-tab` |
| Escape 两步 | DOM 断言 #6 | `[{expanded:true,rail:false,open:true},{expanded:false,rail:true,open:true},{expanded:false,rail:false,open:false}]` |
| reduced motion | `shoot.mjs` 末段 | `{"running":[],"reduced":true}`——处于 running 的动画 0 个，无残留 |

RC 两条未过项**不是本单造成的**：`evidence/rc/README.md` 明写 fixture 默认把 MCP server 指向
`https://example.org/mcp`，要跑通生命周期须手工重指向 `http://127.0.0.1:8851` 并连一次。本轮试过
重指向：`put` 200、经产品控件 connect 后状态词变为 `configured connected`，但 disconnect 未翻回，
`remote-tools` 仍读到 0 行远端工具。两条都落在 MCP 线路一侧（`runtime-view.mjs` 的渲染与请求本单
未动），记为 **not_run / 待复核**，不冒充通过。

### 关键读数（1440 × 900，浅宗；深宗几何相同）

| 量 | 读数 | 画布 §8.2 |
|---|---|---|
| 三栏 header `top` | 0 · 0 · 0 | 相等 ✔ |
| 三栏 header 高 | 56 · 56 · 56 | `--band-top` ✔ |
| 模块卡左缘 | 1085 | 1085 ✔ |
| 卡左 − 右栏面板左（1061） | **24** | 一个 `--col-gap` ✔ |
| 卡 `margin` | `0px 0px 0px` | 模块不自带外边距 ✔ |
| chat header 内层 / 正文 / composer 左缘 | 285 · 285 · 285 | 0 差 ✔ |
| 展开态 tab 条 `top` | 0（与侧栏 wordmark 行同带） | ✔ |
| 折叠 ↔ 展开三次触发的 `/workspace`、`/runtime-control` 请求数 | 0 · 0 | 两态共用同一次读 |
| 390 + coarse pointer 下 < 44 的可见控件 | 0 / 8 | ✔ |
| 横向溢出（1440 收敛 / 展开 / 390） | 0 · 0 · 0 | ✔ |

## 4. 哪一像素改变了哪一判断

| 像素 | 之前 | 之后 | 改变了哪一判断 |
|---|---|---|---|
| 右栏收敛态：一个 tab 面板 → **三张卡** | 打开右栏只看得到当前选中的一种（默认 Workspace） | 一屏同时读到 Run 状态与产出数、Workspace 文件、Runtime 计数与冻结态 | 「这次跑完了没有 / 东西写在哪 / 下一次带什么跑」原来要点三次 tab，现在一眼 |
| Run 卡的 `Results 0 files` | 无（要展开 Run tab 才知道） | 收敛态第二行 | 「跑完了，但什么都没写出来」——这与「跑完了并写了 3 个文件」是完全不同的下一步 |
| Run 卡的 `Not accepted by a review.` | 只在展开面 Results 段末 | 有产出时就在卡上 | 已记录 ≠ 已接受。收敛态是最容易把文件读成「成果」的地方，后果句必须跟到那里 |
| Run 卡删掉 usage 四行（消融 B-8） | 画布上有 | 无 | 不失去判断（用量是成本细节）。卡从七行降到三行，Workspace 卡因此进入首屏 |
| Runtime 卡从 13 行 kind 计数收成 2 行（消融 B-17/18） | — | `Capabilities` / `Context` | 「下一次 Run 能做什么、会读什么」两问一目；十三个数字只是把展开面缩小重画 |
| 三栏 header 由 76 / 56 / 76 三种高度统一到 **56** | 三条横线各在各的高度，右栏还多一条 tab 分隔线 | 一条线横贯三栏 | 三栏读成一个工作面而非三块拼版；也让「右栏是同层级模块」这句话在版式上成立 |
| chat header 内容左缘 285（原贴 24 页边） | 标题贴面板左边，正文在 285 | 标题与正文同一左缘 | 「这条标题说的是下面这段」——两条左缘时标题像面板的属性，一条时像正文的第一行 |
| 展开态由 `position: fixed; inset: 24px` 浮层 → **壳内一栏** | 覆盖层 + scrim + 阴影，侧栏被 `inert` | 侧栏仍可用，tab 条落进带内，无 scrim | 「我在读一份文件，但还没离开这个工作区」；并去掉了一个假 modal（原 `aria-modal` 声明了并不存在的焦点陷阱） |
| 窄宗 composer 由随页滚动 → **沉底浮层**（`--panel` + 1px `--line-strong` + `--shadow-float`，坐在 `--frame` 上） | 三层同色，390 下读成一张纸 | 带 / 面 / 浮层三种物性 | 「哪一块是我要打字的地方」不再靠位置记忆；WK-60 的扁平问题在 390 上最尖锐 |
| 窄宗 Home 的 composer 由列首移到列尾 | 首页 composer 在顶、列表在下 | 列表在上、composer 沉底、上方留白 | 拇指够得到；且「首页留白」在窄屏成立的方式与宽屏不同（宽屏靠上方留白，窄屏靠底部锚定） |
| 图标 14 → 16（六处） | 行内图标比正文小两档，深宗下几乎读不出形状 | 行 16 / 控件 18 / 导航 20 三档 | 类型识别（文件 / 活动 / 文件夹）不再要凑近看 |
| `.workspace-card` 去外框 | 展开面里每个文件夹一个圆角框 | 一个组头 + 若干行 | SH-1：文件夹不是可整体决定的对象；去掉后展开面不再是嵌套卡片的网格 |

## 5. 与既有契约的两处偏离（须架构确认）

1. **展开态不再是 modal。** `docs/surface-assignment.md` §3 写「展开后聊天与侧栏退出可见和键盘 /
   可访问性树的交互范围」——那是展开态为整窗浮层时的写法。WK-54 把展开面改为壳内接管中栏，侧栏
   仍**可见**，因此也必须**可操作**（可见而 `inert` 是更坏的状态）。实现取：`aria-modal` 只在
   < 1024 的覆盖层态声明；桌面展开态不声明 modal，但 chat 栏 `display:none` 并 `inert`，仍合
   「不得隐藏后仍让 Tab 进入不可见控制」。**Escape 两步次序未变**（WK-54 原句），DOM 断言 #6 逐步核过。
2. **`evidence/rc/runtime-ui-viewport.mjs` 的 `escape-order` 一条改写。** 原条断言「从 runtime kind
   按一次 Escape 关闭面板」——那是导轨只有一态时的行为。现在按 kind 打开落在展开面，次序是展开 →
   收敛卡 → 关闭，与 WK-54 一致。改写后该条断言三段状态（在面内 / 回到卡 / 已关闭且焦点还原），
   36/36 通过。契约与反例两套（19 / 9）未改一字。

## 6. 未验证 / 未做

- **真实 provider：not_run。** 宿主为 local-fake；截图里那一次 run 出自宿主自带的 loopback 假 provider。
- **RC 的 `remote-tools` 与 `mcp-lifecycle`：not_run。** 需 README 记明的手工 MCP 重指向；本轮重指向后
  connect 生效而 disconnect 未翻回状态词，判为 MCP 线路侧问题，留复核。
- **真实设备的 IME、软键盘、VoiceOver、真实触屏、浏览器 200% 缩放：未验证**（沿 `docs/ui-composition.md`
  末段的既有边界）。
- **桌面壳下的带高 52：未在真实壳内验证。** 无桌面壳，只以 `?shell=desktop` fixture 开关走 CSS 契约；
  `env(titlebar-area-*)` 一路无法在纯浏览器里取值。
- **热插拔（WK-43 / WK-45 (1)(2)）、Chat Flow 卡片（WK-57）、Review 纵切：未做**，按 WK-62 属 b。
- **画布 §8.2 的一处数字出入**：产品里 rail band 标题与卡片左缘**相等**（1085），非画布所述的差 24。
  产品的 band 与 body 用同一个 `--col-gap` 内距，右栏内因此只有一条左缘，与中栏「标题行与正文列同一
  左缘」是同一条规则。取舍见 `evidence/wk10a/README.md` 末节，请架构裁定。
- **`Load more` 与 `Show more` 未统一**；`runtime-view.mjs` 的长句未收敛（其原文被 RC 检查断言，须与
  检查同批改）。两项登记在 `text-sweep.md` §4。
- **窄屏顶带未放 wordmark**（画布 §8.3 提及）：品牌符号只许出现在侧栏 wordmark 一处（WK-51），在顶带
  另置一份须先裁定。
- **模块登记表中仍有一处按 kind 的特判**：`surfaceKindTitle()`——Run 的面板标题是 `Run details` 而模块名
  是 `Run`。已记在 `ablation-wk10a.md` E 节，未消。
