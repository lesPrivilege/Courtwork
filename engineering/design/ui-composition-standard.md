# UI 文本与编排体例 · 2026-09-08

本轮由 Astra 收敛现有 fresh UI；这是当前实现的施工标准，和 `ux-conventions.md`、`surface-hierarchy.md` 一起使用。Court Work 品牌语义注入由用户在 merge 后首轮工单交 Claude，本轮只交付独立品牌包，不把品牌样板当作已接入产品。

## 文本与动作

| 类型 | 标准 | 应用 |
|---|---|---|
| 打开创建流程 | New project / New session | 导航与首页入口 |
| 确认创建 | Create project / Create session | 表单提交；创建成功才切换对象 |
| 消息提交 | Send | 首页和会话共用一个 composer；不自动重发 |
| 人类回答 | Answer | 自然语言回答，不代表授权 |
| 写入授权 | Allow this write / Deny | 绑定当前确切写入，不代表接受成果 |
| 中止运行 | Cancel run | 与表单 Cancel、浮层 Close 区分；后端 stopping 时显示 Stopping |
| 配置提交 | Save connection | 存储连接配置；即时生效的会话权限没有虚构 Save |
| 运行状态 | Waiting for you / Running / Stopping / Completed / Cancelled / Failed | 状态来自 Host；waiting 不显示工作微光；连接状态独立 |
| 帮助文字 | 一句说明作用域或后果，sentence case | 不把内部枚举、调试说明当作普通产品文案 |

同一动作的可见文字、accessible name 与 tooltip 使用同一词；仅图标按钮保留 accessible name。文案增长允许换行，不用缩小字号掩盖拥挤；路径、hash、代码保持独立可滚动或可截断的技术内容区。

## 层级、对齐与边界

| 层级 | 实现体例 |
|---|---|
| 页面 | 主要内容列上限 740px；标题、composer、列表共用列边界。Chat 内容列桌面两侧 40px、受限时 32px，<768 两侧 16px（WO-CS-01），底部保留 safe-area |
| 标题 | 页面 hero 25–32px；弹窗标题 20px；导航标题 17px；section 14px。HTML heading 表示语义层级，视觉尺寸按所在表面角色 |
| 正文与辅助 | 阅读正文 15px，控件/主体 14px，标签 13px，帮助/元数据 12px，caption 11px；不把窄屏元数据压到 10px |
| 节奏 | 基础 4/8/12/16/24/32px；section 分隔 24/32px，标签与字段 6/8px；仅同组内使用紧凑间距 |
| 卡片 | 只有需要整体决定的对象形成卡片；内部 20px、窄屏 16px，12px 组内 gap、12px radius。普通运行记录与列表保留行结构 |
| 弹窗/面板 | 桌面内容 padding 24px，窄屏 16px；头部标题左对齐、关闭右对齐；动作右对齐并允许换行；内容区域纵向滚动 |
| 设置 | label/help 组成一列，control 组成一列；窄屏单列，宽分段控件占整行，不挤压说明文本 |
| Button | primary = 当前提交；secondary = 边框次动作；quiet = 导航/工具/取消；danger = 中止等后果语义叠加。共用高度、圆角、焦点、禁用与 hover 规则 |
| 触控 | 触屏控件至少 44px；窄屏弹窗按钮保持 44px；图标不代替关键授权文字 |

权威 token 位于 `app/web/styles.css` 的 `:root`：`--text-*`、`--space-*`、`--page-gutter`、`--panel-padding`、`--card-padding`、`--column`、`--control`、`--radius-*`。新组件消费同一组 token，新增例外必须注明具体用途，不能为一个页面复制另一套按钮。

## 尺寸 token（WK-94 / WK-96，2026-09-09 FE-01）

层级首先来自尺寸、间距与表面高度，不来自边框。下表是**产品配置**，权威取值在 `app/web/styles.css` 的 `:root`；本页记的是每个数字回答哪一个问题，改数字必须同时改这里。

| 角色 | 值 | token | 它回答什么 |
|---|---|---|---|
| 侧栏宽 | 256（区间 256–280 的下沿） | `--nav` | 项目与 Chat 名读得完，主区仍是主角 |
| app / title chrome 高 | 48；desktop shell 取 max(48, 宿主实测 toolbar 高)，原生宿主未验证（WO-CS-01） | `--band-top` | 三列共用一条带；标题单行 |
| 导航行高 | 32；项距 4，分组 16（WO-CS-01） | `--control` 32 | 一行是一个对象，不是一张卡 |
| 行 / 控件 / 导航 glyph | 16 / 18 / 16（导航原 20，WO-CS-01） | `icon()` 的 `size` | IC-1；命中区另计 |
| 命中区 | 桌面 ≥32，触屏与窄屏 ≥44 | — | FN-27 的可用性下限 |
| 阅读 / Work measure | 740（上限，不是最小值） | `--column` | 正文一行的长度；Work 的 composer 与它同宽 |
| Chat 内容列内距 | 40；受限 32；<768 16 | `--content-inset` / `--content-inset-tight` / `--page-gutter`，解析为 `--chat-inset` | 正文与 composer 共用一对边界，不叠加外壳 gutter（WO-CS-01） |
| 右摘要保留下限 | 阅读列 ≥640 + 两侧紧内距 + 288 + `--col-gap`，不足即收成 strip | `app.mjs` 按实测列宽计算 | 暂定下限；不为常驻卡片压窄正文（WO-CS-01） |
| 工作面文档列下限 | 688 | `--doc-min` | ≥1680 时工作面是真正的第三栏；256 + chat ≥640 + 688 在 1680 上刚好成立（WK-113 / CC-W） |
| 工作面正文行宽上限 | 740 | `--doc-measure` | 面板宽 ≠ 正文行宽：文档面 1136 或 688 都不是一行的长度，正文沿阅读列的 740；宽表与代码按内容自己横向滚动（WK-117 (b)） |
| 三栏断点 | ≥1680 | 媒体查询，无 token | 工作面从覆盖 / 切换变成第三栏的那一档；1024–1679 是主次切换 + tab strip，<1024 全屏 sheet（WK-113 ①） |
| tab strip 高 | 展开态 44；≥1680 三栏态沿 `--band-top` 48 | — | B 态 strip 是文档面自己的一条 chrome；C 态它必须与 chat header 同一基线，所以取带高 |
| Settings 导航列宽 | 240（区间 240–256 的下沿） | `--settings-nav` | 九个组名读得完；**不复用 `--nav`**，settings-active 时全局侧栏不渲染，两者不再是同一条列轨 |
| Settings 页左右 gutter | 48；≥1680 为 64；<1024 为 20；<768 为 16 | `--settings-gutter` | 桌面 ≥48、宽屏 56–80、窄屏 16–20（shell-refinement §呼吸感） |
| Settings 内容列上限 | 820 | `--settings-measure` | 760–960 的中位；控件不拉满整个屏幕 |
| Settings 组间距 | 40 | `--settings-group-gap` | 组与组 40–48；组内行 16–24 由 `.settings-row` 的 `--space-4` 给出 |
| Home composer measure | 820 | `--home-column` | 略宽于阅读列（760–880），Home 的模块与它同边 |
| 局部间距 | 4 / 8 / 12 / 16 | `--space-1…4` | 组内 |
| 节间距 | 24 / 32 | `--space-6` / `--space-8` | 组与组之间 |
| 带间距 | 48 / 64 起 | 由 `--home-lead` 量出 | Home 的 orientation、composer、模块三段 |
| window-control 安全区 | 80 × `--band-top` | `--window-safe-area` | 宿主的窗口按钮区，产品不在其中放控件；契约见 [interface-components](../../docs/interface-components.md) |
| 模糊 | 12 / 16 | `--blur-chrome` / `--blur-transient` | WK-102 的闭集；只有登记表面可用 |

### Shape 角色（WK-125 (b) / WK-128，2026-09-10 FE-05a 登记）

圆角与字阶一样是一张有限的角色表，不是每个组件各自的口味。静态取值由
`tools/lint-shapes.mjs` 守（只允许 token、显式 `0`、以及由 token 派生的表达式）；
父子是否同心是布局事实，由 `evidence/fe05a/shape-checks.mjs` 的 SHAPE-* 在真实渲染上量。

| Shape 角色 | 值 | token | 它回答什么 |
|---|---|---|---|
| `control.compact` | 6 = 8 − 2 | `calc(var(--radius-control) - 2px)` | ≤28 高的小控件与分段：它坐在一条 8 圆角、2 内边距的轨道里，弧线要与轨道同心 |
| `control.default` | 8 | `--radius-control`（别名 `--radius`） | 标准控件的外形；28 高不联动收紧（WK-128 ⑥） |
| `surface.card` | 12 | `--radius-card` | 有背景与边界的卡：会话概览的每一组、阅读器的外框 |
| `surface.container` | 16 | `--radius-container` | 容器级的面：composer 外壳、dialog、popover |
| `full` | 999 | `--radius-pill` | 满弧。正方形上它就是圆；`50%` 不再使用（非正方形上 50% 是椭圆，WK-128 ③） |
| `0` | 0 | 显式 `0` | tab strip 与贴死视口边缘的面：没有"暴露边"可圆 |

两条派生规则：

- **同心**：`R_child = max(R_min, R_parent − inset)`，`R_min` = `--radius-small` 4，`inset` 取父级内边距。三处此前沉睡的违例（popover 内的行、composer 外壳内的输入面、dialog 内的内容井）已把公理写进声明本身，而不是写一个算好的数字。
- **焦点环**：offset 一律 2；弧线由引擎沿元素自身的 `border-radius` 走，所以有圆角的元素不重复声明 radius。唯一手写 radius 的是本身没有圆角、却要靠 outline 长出一个圆角边界的容器（`.settings-section`），那里写"视觉预期 + offset"。

**满弧只给 composer 唯一的那个浮动主动作**（Send / Cancel run 是同一位置的两端）。同为 32 见方的图标按钮不因为是图标就变成圆：`#new-project-button` / `#home-create-project` 保持 `control.default`（SHAPE-6 逐次盯住这条对照）。

Settings 注（WK-116 / CC-S）：进入 Settings 后全局侧栏不渲染，这一页的两列因此是它自己的，四个 `--settings-*` 值不与 `--nav` / `--page-gutter` 共享。改其中任何一个都要同时改 `composition-checks` 的 SETTINGS-* 断言。

侧栏宽注：`--nav` 原为 250（WK-42），低于视觉审查建议的 256–280 下沿 6px；WK-105 ⑤ 裁定落到 256，FE-02 第 0 项执行，Home / Work 几何断言随之更新。

## Home / Work / Dashboard 三种 composition state（WK-96 / WK-97）

三种版面状态各有自己的读法，且互不混用。数值为产品配置，机器可检查的部分在
`engineering/mvp/execution/work-surface-kit/evidence/fe01/composition-checks.mjs`。

| | Home | Work | Dashboard |
|---|---|---|---|
| 读法 | 从中心向下展开 | 从顶部向底部推进 | 可组合的背景信息 |
| L1 锚点 | composer，全页唯一 | reading column | 无；card 是模块与编排单位 |
| composer 宽 | 760–880（现 820） | 与 reading measure 同宽（现 740） | — |
| composer 本体初始高 | 92–112（现 96） | 空态两行内容可见（`calc(2lh + 8px)`），随字号相应扩展；输入、工具、错误与发送不裁切（合流节点 2026-09-11 裁定，采纳 WO-CS-01；读数：默认字号 textarea 约 54.2、整块 composer 约 116，二者不混用，均非像素真值；取代旧 textarea 高度门 80–96） | — |
| composer 本体增长（CI-B） | 随内容长到 160，之后框内滚动；锚点按静止高度量，向下长 | 随内容长到 180，之后框内滚动 | — |
| 短视口上限（CI-B，暂定） | `min(160px, 28dvh)`，仅支持 dvh 时覆盖；否则 160 | `min(180px, 28dvh)`，同左；否则 180 | — |
| composer 垂直位置 | 中心落在主区高的 55 % 或更下（现 56 %），由 `--home-lead` 量出 | 沉底 | — |
| 其上非 chrome 内容 | ≤180，其中 orientation ≤120 且不含数字 | 只有 thread | — |
| 下方 | Today 三数字 strip → Continue 行 → 有数据源才出现的 compact card；ragged layout，不填满 grid | 禁止出现任何 Home dashboard primitive | card 内无框内容，禁止 nested card |
| 首屏下半部 | 必须有可见的 continuity 内容 | — | — |
| 右侧 contextual surface | — | 有内容才出现；**按视口分档（WK-113 / WK-116，CC-W）**：≥1680 是真正的第三栏（nav 256 · chat ≥640 · doc ≥`--doc-min` 688，各自滚动，顶部 chrome 同一基线）；1024–1679 折叠为悬浮卡、展开为主区内的视图切换（无遮罩、无模态卡外观，chat 列 `hidden` + `inert` 但 DOM 保留），正文 measure 仍 ≥640；<1024 全屏 sheet | 展开进入独立 surface；正文行宽另受 `--doc-measure` 约束 |

composer 是**一个** primitive 的两个 variant，不是两个组件（WK-97）。

## Border 审计（WK-94，2026-09-09 FE-01）

边框只留四种角色：**input**（输入面的一圈边界）、**selected**（选中态）、**floating**（浮层的描边，与阴影同用）、**error**（失败边界，含 2px 状态侧线）。其余层级由间距、字阶与表面色承担。

本单据此改的：Home 的三个数字之间的竖线（改为间距）、`.home-card` 的一圈线（改为 `--panel-muted` 表面）。

**未收口，留后续单**：`app/web/styles.css` 中另有约六十处 1px `--line` / `--line-strong`，绝大多数是重复行的分隔线与带脚的一条界（sidebar / chat-header / settings block）。SH-2 把「重复行分隔」列为一条独立的视觉通道并允许它，WK-94 的四角色闭集不含它——两条体例在此处冲突，须裁。在裁定之前本单只收口自己触及的表面（Home、chrome、Settings 导航），不做全站清扫：一次性拆掉六十处分隔线会改变每一个表面的读法，而那正是本轮不该在没有像素验收的情况下做的事。

## 缩放与验收

当前产品没有连续缩放画布或 zoom 控件；不新增虚构缩放功能。检查重点为 viewport 变窄时的 reflow、长文案、弹窗内部滚动、动作可达性，以及 browser zoom 的实际能力边界。320px 有效宽度检查不等于已验证浏览器 200% 缩放，更不等于通过整套 WCAG。

本轮修正：首页 composer 12px/列表16px 边距不齐；编辑弹窗独立 padding；设置输入最小宽度挤压；弹窗动作不换行；零散字号统一 token，窄屏 10px 元数据提升到 caption。实际截图、运行与重连证据见 `evidence/final-ui-audit/README.md`。品牌命名与语义注入、完整设备 IME/读屏/浏览器缩放矩阵留有明确后续边界。
