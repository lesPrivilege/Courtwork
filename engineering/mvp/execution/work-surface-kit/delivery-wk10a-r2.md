# WO-WK10a-r2 交付 · 高度层级、悬浮工作面、composer 解剖（Opus，归并轮）

分支 `claude/wk10-r2`，基线 = 整合头 `5f76b2e`（`claude/wsk-integration`，已含 WK10a r1 六提交）。
worktree `/private/tmp/se-agent-wk10r2`，数据目录 `/private/tmp/se-agent-wk10r2-data`（全新），
端口 8859；WK6 一套另起 `/private/tmp/se-agent-wk10r2-clean` + 8860（该套第一条要求零项目）。
Node v25.9.0。**真实 provider：not_run**——宿主 `capabilities.mode = "local-fake"`，
全程未配置也未调用真实 provider，未读取任何凭据文件。

消费裁定：WK-69 / WK-70 / WK-72 / WK-73 / WK-74 (1)(2)(4)。不含 WK-71 glyph 表、WK-43 热插拔、
WK-57 Chat Flow 卡片、Review 纵切——属 WK10b。

## 1. 提交

| SHA | 题 |
|---|---|
| `0486141` | web: one elevation model, four layers, and a lint that holds it |
| `92df63f` | web: the work surface floats over the main column instead of taking a third one |
| `8589039` | web: the composer states this send inside the box and the standing context below it |
| `5e3ceb2` | docs: the r2 evidence, the two backend gaps and this record |

## 2. 文件

| 文件 | 改动 |
|---|---|
| `app/web/styles.css` | tier:S 三块各加 `--float-s`（浅 `#fdfdfe`；深 `#272a2d` = slate-4）；tier:R 重写为四个层 role（`--frame` / `--panel` / `--panel-muted` / `--float`），`--canvas` 退役为 `--frame` 的别名；`body` 改取 `--frame`；composer / dialog / tooltip / toast / 模块卡改取 `--float` + `--shadow-float` + `--line-strong`；五处 `--canvas` 调用点改 `--panel-muted`；三处 tier:U 直引 scale（`--gray-4/7/8/9/11`）改引 role。版式：`.app-shell` 两列 + 一显式行、`position: relative`；删 `--inspector` 与 `.surface-closed`；新增 `--rail-width: 360px` / `--strip-width: 44px`；新增悬浮层、glyph 竖条、L3 展开面与阅读列让位（`--cards-inset`）四组规则；删 `@media (max-width:767px)` 里已被层级模型覆盖的三条局部取色 |
| `app/web/app.mjs` | `measureSurfaceLayout()`（量 composer 高度与主区宽度，写 `--composer-h`、翻 `state.surface.strip`）、`focusSurfaceRail()`；`renderSurfaceVisibility` 增 `surface-cards` / `surface-strip` / `is-strip` 三个类与 scrim 条件；`surfaceIsModal()` 收紧为「<1024 且（展开 或 <768）」；`renderSurfaceRail` 增 glyph 竖条一支；`#show-surface-button` 变开合同一控件（名称随态改写）；scrim 点击退一步；`renderChatHeader` 写 `#composer-project` 与单词化的 File writes；启动时的两个 permission select 分别取词与取句 |
| `app/web/index.html` | `#app-shell` 去掉 `surface-closed`；`#composer-below` 重排为「项目（会话只读）· Home 的 Project + New project + File writes · File writes 按钮」，选项文本单词化并带整句 `aria-label`。**既有 id、role、`aria-controls` / `aria-labelledby` 关系、tab 次序一律未动。** |
| `app/web/settings-view.mjs` | 只加 `permissionWords`（Ask / Write / Read），`permissionLabels` 原样保留 |
| `app/web/skins/gray-steel.css` | 两宗各加 `--float-s`（`#fff` / `#2a2a2a`），验证换 skin 仍成立 |
| `tools/lint-colors.mjs` | 第二项检查：`app/web/**/*.css\|mjs` 的每条 `background` / `background-color` 必须引用层 role（或 `transparent` / `none` / `inherit` / `currentColor`），否则须登记在 `FILL` 表内并写明它是什么（实心控件与数据标记共 12 条） |
| `tools/contrast-report.mjs` | 底面集合 `canvas` → `float`；仍 19 对 × 两宗 × 两 skin = 76 行 |
| `contracts/color-governance.md` | 新 §7「区域 → 高度层」：四层取色表、五条规则 |
| `runtime-ui-gaps.md` | B 表新增 `BE-12`（provider 不暴露推理强度）与 `BE-13`（MCP disconnect 不回翻，WK-74 (3)，本轮复现） |
| `evidence/wk10a-r2/**` | 新增：30 条 DOM 断言、19 张截图、三套 RC 结果副本、README |

`app/server/**`、`app/runtime/**`、`brand/**`、模块登记表 API（`surface-modules.mjs`）本轮**一字未改**。

## 3. 验证（逐字结果）

| 项 | 命令 | 结果 |
|---|---|---|
| 单元测试 | `npm --prefix app test` | `ℹ tests 136` / `ℹ pass 136` / `ℹ fail 0` |
| 颜色 lint（两项） | `node tools/lint-colors.mjs` | `lint-colors: ok (14 files · 字面量与高度层两项)` |
| 对比度 | `node tools/contrast-report.mjs` | 76 行「通过」，0 行「未通过」 |
| DOM 断言 | `WK10A_BASE=http://127.0.0.1:8859 node evidence/wk10a-r2/dom-assertions.mjs` | `30/30 checks passed` |
| WK6 交互 | `WK6_BASE=http://127.0.0.1:8860 node evidence/wk6/home-interaction-checks.mjs`（全新数据目录） | `PASS 7/7` |
| RC 契约 | `RC_APP=http://127.0.0.1:8859/ RC_PORT=8859 node evidence/rc/verify.mjs` | **18/19**（未过：`remote-tools`） |
| RC 反例 | 同上 | **8/9**（未过：`mcp-lifecycle`） |
| RC 视口 | 同上 | **36/36** |
| 截图 | `WK10A_BASE=http://127.0.0.1:8859 node evidence/wk10a-r2/shoot.mjs` | 19 张（Home / 收敛卡 / glyph 竖条 / 展开，1440 · 1200 · 390 × 浅深，另一张 reduced-motion） |
| reduced motion | 同上末段 | `{"running":[],"reduced":true}` |

RC 两条未过与 r1 同因、同状态：fixture 的 MCP server 指向 `https://example.org/mcp`，手工重指向后
connect 生效而 disconnect 不回翻。已按 WK-74 (3) 登记为 BE-13，记 **not_run / 待复核**，不冒充通过。
本轮未动 `runtime-view.mjs`。

### 关键读数（1440 × 900，浅宗；深宗几何相同）

| 量 | 读数 |
|---|---|
| 悬浮层 `top` · 右间距 · 宽 | 80（`--band-top` 56 + `--col-gap` 24）· 24 · 360 |
| 悬浮层 `bottom` · composer 顶边 | 692 · 716（差一个 gap） |
| 阅读列左缘：header / composer | 283 · 283 |
| 阅读列右缘 → 卡左缘 | 1023 → 1056（不重叠） |
| 展开面 `top` · 右间距 | 80 · 24（与卡同上缘、同右 gutter） |
| scrim 左缘 · 主列左缘 | 250 · 250（只覆主区） |
| 1200 × 800：主区宽 · 竖条宽 · 右间距 | 950 · 44 · 24（950 < 740 + 48 + 360） |
| 深宗亮度 frame · panel · float | 0.0057 `#111113` < 0.0160 `#212225` < 0.0228 `#272a2d` |
| 浅宗亮度 frame · panel · float | 0.8732 `#f0f0f3` < 0.9829 `#fdfdfe` = 0.9829 |
| 折叠 ↔ 展开三次的 `/workspace`、`/runtime-control` 请求数 | 0 · 0 |
| 390 + coarse pointer 下 < 44 的可见控件 | 0 / 8 |
| 横向溢出（1440 收敛 / 展开 · 1200 · 390） | 0 |

## 4. 哪一像素改变了哪一判断

| 像素 | 之前（r1） | 之后（r2） | 改变了哪一判断 |
|---|---|---|---|
| 右栏 380 px 的**列轨消失**，卡片浮在主列右 gutter | 打开工作面，主列被压到 810，正文列从 475 跳到 285 | 主列始终 1190，正文列从 475 移到 283 | 「打开旁边的东西」不再是「重排我正在读的东西」。上一版每次开合都推一次版面；这一版推的是 33 px 的让位，读的那一列几乎不动 |
| 卡片底边停在 composer 顶边上方一个 gap（692 / 716） | 卡片列一直到窗底，与 composer 分属两栏、互不相干 | 卡片明确「压在 thread 上、让开输入」 | 「哪些东西是关于这次工作的、哪些是我要打的字」——层级由停在哪里说出，不由分栏说出 |
| 主区 < 740 + 2·24 + 360 时收成 44 px 竖条 | 1200 下右栏仍占 340，正文列被压到 620 以下 | 正文列保持 740，模块退成四枚图标 | 「窄一点就得在读和查之间二选一」变成「读不受影响，查退一步」。阅读宽度是产品的常数，模块不是 |
| rail header 与「Work surface」标题**删除**（桌面态） | 右栏顶上一条 56 px 带 + 一个标题 + 两个按钮 | 无。卡片自己就是标题，开合走 header 一个控件与 Escape | 三栏对齐带原本要三方对齐；现在只有侧栏 wordmark 与主 header 两方，少一处需要解释的横线 |
| 展开面从「壳内一栏」变成 **scrim 上的浮面**（inset 24，上缘 80） | 展开后侧栏亮、主区整块换成另一栏，没有任何"我在覆盖层里"的提示 | 主区被 `--scrim` 压暗，浮面带阴影浮在其上，侧栏不被压暗、仍可点 | 「我是打开了一个东西，还是换了一个页面」——r1 的答案只能靠 tab 条的存在去猜；scrim 让"下面那层还在、只是暂时不用"成为看得见的事实。ARIA 仍不声明 modal（侧栏真的可用），两者不再矛盾 |
| 深宗 `body` / 主列 / composer 三段亮度 0.0057 / 0.0160 / 0.0228 | 侧栏比主列暗、header 又暗一段、composer 再一种，窄视口下读成互相打架的补丁 | 单调上升的三段 | 用户 §21 的原话（「主列比外围更暗、header 更暗、composer 又是另一层」）由一条规则消掉：区域不取色，层级取色 |
| tooltip 由深底反白改为 `--float` + `--line-strong` | 界面上唯一一块反色 | 与 popover、菜单同一种物性 | 「浮起来的东西长什么样」只有一个答案；反色 tooltip 在深宗里反而比面板还亮，是第五种层 |
| `File writes: Workspace writes allowed` → 可见 **Write**，整句进 accessible name | composer 下方一行长句 | 一个词 | 权限是常设上下文，不是本次发送的一部分；它该在余光里可读，而不是每次都读一遍句子。整句留给读屏与 tooltip（IC-1：后果类文字不删，只换位置） |
| 会话态在 composer 下方补上**项目名（只读）** | 只有权限一项；项目只在侧栏与窄宗的标题前缀里 | 「写到哪个项目 · 能做什么」并排 | 「这次运行会写进哪儿」与「能不能写」是同一个问题的两半，分开摆时用户要自己拼 |

## 5. 我必须裁决的三处裁定冲突

1. **WK-72「展开态是 L3 覆盖层」 vs WK-74 (1)「展开态是壳内面板，侧栏保持可操作」。**
   取：材质按 WK-69 / WK-72（`--float` 的面 + `--shadow-float` + 1 px `--line-strong`，置于
   `--scrim` 之上），ARIA 按 WK-74（≥1024 不声明 `aria-modal`）。落地为「scrim 只覆盖主区、
   不覆盖侧栏」的浮面：侧栏既不被压暗也不 inert，因此「不是 modal」这句话在视觉与可访问性上
   一致；主区被压暗且 `inert`，因此「可见但不可用」也不再是矛盾态（压暗就是不可用的说明）。
   工单原句允许我在冲突时「材质从 WK-69、ARIA 从 WK-74 并记录」，这就是记录。
2. **WK-72「对齐带简化为两方」 vs r1 断言「三栏 header 共一条带」。**
   取 WK-72：桌面收敛态没有第三条 header，断言改为「侧栏 wordmark 行与主 header 共一个 top
   与一个高度」+「收敛态的 `.surface-header` `display: none`」。展开面不再进对齐带，改为与卡片
   共用上缘（80）与右 gutter（24），即 WK-74 (2)「band 标题与卡片共用一个左缘」的同构：
   浮层的两条边由同一组 token 决定。
3. **WK-73「模型 chip 为 `<model> · <effort>`」 vs 后端事实。**
   `GET /provider-config` 只有 `{provider, model, api}`，`GET /provider-models` 每个模型只有布尔
   `reasoning`（`app/server/service.mjs:253`），没有强度值也没有强度集合。按 WK-73 末句不画，
   chip 保持 `<model>`（假 provider 下即「Local test」），登记 BE-12。**未改任何服务端文件。**

另有一处我从 WK-73 主动收窄：「会话：项目名只读、可打开」——本轮只做**只读**，不做「可打开」。
理由是产品里没有「打开项目」这一意图（侧栏是展开项目下的会话列表，不是项目页），临时造一个
导航语义会越过「不新增本体」的边界。登记在 §6 待裁。

## 6. 未验证 / 未做

- **真实 provider：not_run**（宿主 local-fake）；**RC 的 `remote-tools` 与 `mcp-lifecycle`：not_run**（BE-13）。
- **`#composer-below` 的项目名不可点**（见 §5 末）。若架构要「可打开」，需要先定义「打开项目」是什么。
- **`<option aria-label>` 的读屏覆盖面未实测。** 单词化的 Ask / Write / Read 靠每个 `<option>` 的
  `aria-label` 保留整句；Chrome 的可访问性树里可读，**VoiceOver / NVDA 未在真机验证**。若架构判定
  不可靠，退路是把可见标签写成 `File writes: Ask`（两词），不需要改版式。
- **glyph 竖条只在 1200 实测**；768–1023 之间的竖条与 <1024 的 modal 判定交界只跑了断言，未逐档目视。
- **桌面壳（`env(titlebar-area-*)`）下的两行网格未在真实壳内验证**；只以 `?shell=desktop` 走 CSS 契约。
- **`ResizeObserver` 不是唯一量测入口**：本环境（隐藏的浏览器面板）里 RO 与 `matchMedia` 的 change
  都不投递，因此量测同时挂在 `renderComposer` / `renderSurfaceVisibility` / `resize` 上。真实浏览器
  里 RO 会先到，这只是冗余，不是补丁；但「RO 静默失效」这一条本身**未在真实窗口复验**。
- **真实设备的 IME、软键盘、VoiceOver、真实触屏、浏览器 200% 缩放：未验证**（沿 `docs/ui-composition.md` 末段的既有边界）。
- **`docs/surface-assignment.md` §3 与 `docs/ui-composition.md` 的三栏描述未改字**：它们是本轮的输入而非产出，
  WK-72 / WK-74 已经给出改读方式，改文本应与 WK10b 的体例修订同批。
- **热插拔（WK-43 / WK-45 (1)(2)）、Chat Flow 卡片（WK-57）、glyph 语义表（WK-71）、Review 纵切：未做**（WK10b）。
- **`surfaceKindTitle()` 里 Run 的按 kind 特判仍在**（r1 `ablation-wk10a.md` E 节登记），本轮未消。
