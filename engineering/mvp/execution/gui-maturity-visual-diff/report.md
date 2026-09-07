# Schema Engineering × 成熟工作台视觉 diff

本报告只审阅冻结基线 `ee1638c`，不把主任务正在修改的 8816 服务当成验收对象。基线通过独立合成数据服务运行在 8817，并用自己的 Chrome 标签页截取；产品源码没有修改。

## 证据与步骤

1. **1440×900 空工作区**：[`se-empty-1440x900.png`](./screenshots/se-empty-1440x900.png)。页面稳定、可读，作为桌面基线。
2. **390×844 工作面打开**：[`se-empty-390x844.png`](./screenshots/se-empty-390x844.png)。页面稳定；右侧 sheet、关闭按钮与背景遮罩可见。
3. **430×932 工作面打开**：[`se-empty-430x932.png`](./screenshots/se-empty-430x932.png)。页面稳定；与 390 宽相同地呈现 sheet 退化。

截图是 DevTools Responsive 的页面捕获，文件尺寸分别为 2880×1800、780×1688、860×1864（均为 DPR 2），对应上面的 CSS 视口。每张已从保存文件重新打开检查。

成熟参考采用 CUA 只读观察：Claude Design 的可见原型呈现左侧工作列表/可收起栏、中间 chat/review 主路、右侧独立 context/folder/task 卡片与预览 tab，并保留底部 composer；已接受的 [`polish.css`](</Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema Engineering/engineering/mvp/execution/gui-completeness/dashboard-design/canvas/parts/polish.css>) 与 [`NarrowHome.dc.html`](</Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema Engineering/engineering/mvp/execution/gui-completeness/dashboard-design/canvas/src/NarrowHome.dc.html>) 也明确了窄屏单列、整幅 sheet、inert、44px 控件和单一 composer。Claude/Codex 参考没有在 1440、390、430 三个尺寸上各自保存截图，因此“同尺寸像素比较”记为 **not_run**；下列只采用可见的结构机制，不复制私有正文或品牌取色。Codex 原生窗口受 CUA 安全限制未读取。

## 高价值差异

### 1. 空状态有三个并列 owner

- **观察证据**：1440 截图同时显示 `No project selected / Create a session to begin`、`No session selected`、`No work surface`；对应冻结 DOM 是 [`app/web/index.html:45-67`](/private/tmp/se-ui-visual-baseline-20260907/app/web/index.html) 与 [`app/web/index.html:89-107`](/private/tmp/se-ui-visual-baseline-20260907/app/web/index.html)。
- **用户问题**：首次进入没有唯一下一步；右侧“没有工作面”与主区“没有会话”平等竞争注意力，用户要先猜项目、会话、工作面之间的顺序。
- **成熟机制**：Claude 原型和接受的 Dashboard/StartView 都把“继续工作/开始新会话”作为主路，附加内容只在有意图时出现；画板的窄屏 `NarrowHome` 也只有单列 Home 内容。
- **SE DOM / primitive 建议**：在 `main.chat-panel` 下提供单一 `section.start-view`（一个 `h1`、一行能力说明、一个 `.primary-button`），无会话时让 `#composer-area` 和 `#surface-panel` 使用 `hidden`，不要用三个空占位拼成首页；保留现有 `#project-list` 作为后续导航入口。
- **类型**：结构 / UX。

### 2. 右侧工作面在桌面空态默认占位

- **观察证据**：1440 截图中右栏固定约 300–380px，面板只有 Preview 与空文案；冻结 CSS 的三栏默认网格在 [`app/web/styles.css:40-45`](/private/tmp/se-ui-visual-baseline-20260907/app/web/styles.css)，DOM 默认带 `.surface-panel.is-open` 在 [`app/web/index.html:90`](/private/tmp/se-ui-visual-baseline-20260907/app/web/index.html)。
- **用户问题**：最宽的主工作区反而没有工作内容，右栏先消耗空间；回到会话时附加 tab 变成必须处理的背景。
- **成熟机制**：Claude 原型的右栏可独立收起，展开后才进入 chrome tab 预览；接受的 `polish.css` 以 `.with-surface` 区分有意打开的三栏（`35–40`），不是默认把附加栏当固定页面骨架。
- **SE DOM / primitive 建议**：继续复用 `#app-shell.surface-closed` / `.surface-panel`，把首次落点设为 closed；显式打开时再加 `with-surface` 或现有 open 状态。关闭态同时设 `hidden`、`aria-hidden="true"`、`inert`，`#show-surface-button` 是唯一恢复入口；不新增第二套面板。
- **类型**：结构 / UX。

### 3. 窄屏 sheet 仍让背景内容露出并参与视觉竞争

- **观察证据**：390 与 430 截图都显示右侧 sheet 约占 92vw，左侧导航/主区露出一条可读的灰色背景；冻结 CSS 的 `width: min(380px, 92vw)` 与独立 `.surface-backdrop` 在 [`app/web/styles.css:253-260`](/private/tmp/se-ui-visual-baseline-20260907/app/web/styles.css) 和 [`app/web/styles.css:302-305`](/private/tmp/se-ui-visual-baseline-20260907/app/web/styles.css)。
- **用户问题**：sheet 看起来像从桌面右栏滑入，而不是当前任务的唯一层；露出的“Projects/No session”会分散触摸与读屏的上下文。
- **成熟机制**：接受的 `NarrowHome` 说明 `<768` 没有 split，导航和附加 tab 都是整幅 sheet；打开时底层 `inert + aria-hidden`，scrim 是底层 sibling，关闭后焦点回 Menu/入口。
- **SE DOM / primitive 建议**：在现有 breakpoint 内对 `max-width:767px` 的附加 tab 将 `.surface-panel` 设 `width:100%`、`inset:0`，保留 `#surface-backdrop` 为 shell sibling；同一事件给 `#navigation-panel`、`.chat-panel` 加 `inert` 与 `aria-hidden`，面板用 `aria-modal="true"`，关闭按钮沿用现有入口回焦点。中间宽度仍保留右侧 overlay，不扩展新布局。
- **类型**：结构 / accessibility / UX。

### 4. 右栏 header 的动作层级不够像“tab 宿主”

- **观察证据**：1440 截图把 `Expand work surface`、`×` 和 `Preview` tab 挤在同一个 header；390/430 截图中 Expand 文案换行，占据主要宽度；冻结 DOM 在 [`app/web/index.html:91-100`](/private/tmp/se-ui-visual-baseline-20260907/app/web/index.html)。
- **用户问题**：展开、关闭、切换内容的关系不清楚；窄屏时展开按钮比内容标题更抢注意力，`×` 仅靠 glyph 识别。
- **成熟机制**：Claude 原型把右侧收敛态与 chrome tab 预览分开，接受的画板用 `role="tablist"`、`aria-selected` 与独立 header actions；行为上也保持栏的独立收敛/展开。
- **SE DOM / primitive 建议**：保留 `#surface-tabs` 的 tab 宿主，把 `surface-expand-button` / `close-surface-button` 放入 `.surface-header-actions`；展开/返回使用同一按钮更新 `aria-expanded` 与明确的 `aria-label`，关闭为 icon button + 可见 tooltip，tab 只承载内容选择。
- **类型**：结构 / UX / accessibility。

### 5. 左侧导航把“开始、管理、开发控制”混成一组

- **观察证据**：1440 截图左栏连续排列 `New session`、`Refresh`、`Runtime setup`，再接 `Projects`、筛选和 `No projects yet`；冻结 DOM 在 [`app/web/index.html:12-42`](/private/tmp/se-ui-visual-baseline-20260907/app/web/index.html)。
- **用户问题**：新用户把开发设置当成开始路径的一部分；没有 Home/Continue 层来承接“我现在要继续哪项工作”。
- **成熟机制**：Claude 原型的左栏有独立工作列表入口、主导航和收起控制；接受的画板将 Home、Needs attention、Continue 分成有明确标题的区块，导航收起后仍保留可访问名称。
- **SE DOM / primitive 建议**：在现有 `<aside>` 内加 `nav[aria-label="Main"]` 和一个 `Home`/`Start` item，把 `Runtime setup` 放入设置/开发者 section；项目列表继续使用 `section[aria-labelledby]`、`aria-current` 与两行 session item，不新增侧栏层级。
- **类型**：结构 / UX。

### 6. 空态 composer 被禁用却保留为主要底部区域

- **观察证据**：1440 截图底部保留大面积 textarea，placeholder 为 `Select a session to chat`，Send disabled；冻结 DOM 在 [`app/web/index.html:72-86`](/private/tmp/se-ui-visual-baseline-20260907/app/web/index.html)。
- **用户问题**：用户看到一个不能用的输入框，却没有看到应该点击的唯一开始动作；底部高度还压缩了主区的有效阅读空间。
- **成熟机制**：接受的 StartView 不画 composer；进入 Thread 后才显示带草稿、运行提示、Cancel/Send 的 composer，并在窄屏保持 44px 控件与可编辑草稿。
- **SE DOM / primitive 建议**：无 `activeSessionId` 时让 `#composer-area[hidden]`，由 `start-view` 承接主动作；有会话时保留现有 `form#composer-form`，textarea/Send 的状态只随 session/run 状态切换，不以 disabled 空框代替入口。
- **类型**：结构 / UX / accessibility。

### 7. 通用动作同时使用文字按钮与裸 glyph，缺少统一动作 primitive

- **观察证据**：冻结 DOM/CSS 中创建项目是 `+`，关闭是 `×`，Refresh/Runtime setup 是文字按钮；尺寸基线统一只有 `min-height:32px`，见 [`app/web/index.html:18-24`](/private/tmp/se-ui-visual-baseline-20260907/app/web/index.html) 与 [`app/web/styles.css:76-91`](/private/tmp/se-ui-visual-baseline-20260907/app/web/styles.css)。
- **用户问题**：`+`/`×` 的含义和可点击范围依赖视觉经验；触控时 32px 目标偏小，键盘用户也看不到一致的动作名称。
- **成熟机制**：成熟工作台使用 icon button + accessible name，文字保留给高风险或需要确认的动作；接受的 polish token 明确 `control-sm:32px` 与 `control-lg:44px` 两级，并在窄屏把主要动作提升到 44px。
- **SE DOM / primitive 建议**：建立一个现有 `.icon-button` 的 SVG/Lucide 变体，必须带 `aria-label`/`title`，统一 `:focus-visible`；`Create project`、`Close work surface`、`Refresh` 可 icon 化，`Send`、`Cancel`、`Answer`、`Review` 保留可见文字。`@media (pointer: coarse)` 对关闭、展开、发送、开始动作使用 44×44。
- **类型**：结构 / accessibility / polish。

### 8. 视觉层级偏“空白画布”，信息密度与状态优先级还不够成熟

- **观察证据**：1440 截图的中间与右栏几乎全白，细分隔线、灰色小字和绿色 `Local fake` badge 是主要层级；现有 token 位于 [`app/web/styles.css:1-20`](/private/tmp/se-ui-visual-baseline-20260907/app/web/styles.css)。
- **用户问题**：空白本身没有告诉用户“下一件要做什么”；状态 badge 与空占位的视觉权重高于开始动作，页面像骨架而不是持续工作台。
- **成熟机制**：接受 polish 画板用统一 token 体系把正文列约束在 `--column`、标题/eyebrow/metadata 分级，Composer 和 surface content 各自对齐；状态优先使用 text-first，颜色只承担 waiting/failed 等语义。
- **SE DOM / primitive 建议**：只在现有 token 上做层级收敛：为 `start-view`/`home-inner` 复用 `max-width`、`--space-*`、`--text-*`，把 capability badge 降为 metadata；空态主动作使用现有 primary primitive，分隔线只标区域边界。这里不复制 Claude 的颜色、圆角或材质；Claude 取色仅作为独立的品牌参考，结构与可读性仍以 SE 已接受的 polish token 为准。
- **类型**：视觉 polish / hierarchy（与结构建议分开）。

## 已知限制

- 本轮截图均为冻结基线空态；没有把未提交的 8816 中间态当成证据，也没有用截图推断真实 Host/renderer 生命周期。
- Claude/Codex 成熟参考没有完成同尺寸截图矩阵，报告只采用 CUA 观察到的结构机制和已接受画板源码；颜色、动画、真实 VoiceOver/IME、软键盘遮挡与触控命中仍需单独验收。
- 截图可以证明布局、文案、可见层级和 sheet 遮罩，不能单独证明 `inert`、焦点循环、Escape 协调器或读屏顺序；这些需结合 AX/键盘证据继续验证。
