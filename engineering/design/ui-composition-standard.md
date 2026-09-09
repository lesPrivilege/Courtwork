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
| 页面 | 主要内容列上限 740px；标题、composer、列表共用列边界。桌面两侧 24px，窄屏两侧 16px，底部保留 safe-area |
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
| 侧栏宽 | 250（区间 256–280 的下沿，见下注） | `--nav` | 项目与 Chat 名读得完，主区仍是主角 |
| app / title chrome 高 | 56；desktop shell 下 52 | `--band-top` | 三列共用一条带 |
| 导航行高 | 32–36 | `--control` 32 | 一行是一个对象，不是一张卡 |
| 行 / 控件 / 导航 glyph | 16 / 18 / 20 | `icon()` 的 `size` | IC-1；命中区另计 |
| 命中区 | 桌面 ≥32，触屏与窄屏 ≥44 | — | FN-27 的可用性下限 |
| 阅读 / Work measure | 740 | `--column` | 正文一行的长度；Work 的 composer 与它同宽 |
| Home composer measure | 820 | `--home-column` | 略宽于阅读列（760–880），Home 的模块与它同边 |
| 局部间距 | 4 / 8 / 12 / 16 | `--space-1…4` | 组内 |
| 节间距 | 24 / 32 | `--space-6` / `--space-8` | 组与组之间 |
| 带间距 | 48 / 64 起 | 由 `--home-lead` 量出 | Home 的 orientation、composer、模块三段 |
| window-control 安全区 | 80 × `--band-top` | `--window-safe-area` | 宿主的窗口按钮区，产品不在其中放控件；契约见 [interface-components](../../docs/interface-components.md) |
| 模糊 | 12 / 16 | `--blur-chrome` / `--blur-transient` | WK-102 的闭集；只有登记表面可用 |

侧栏宽注：`--nav` 现为 250，低于视觉审查建议的 256–280 下沿 6px。这是 WK-42 已裁定的既有值，本单不动它；若要落进区间，属一次独立的带宽裁定。

## Home / Work / Dashboard 三种 composition state（WK-96 / WK-97）

三种版面状态各有自己的读法，且互不混用。数值为产品配置，机器可检查的部分在
`engineering/mvp/execution/work-surface-kit/evidence/fe01/composition-checks.mjs`。

| | Home | Work | Dashboard |
|---|---|---|---|
| 读法 | 从中心向下展开 | 从顶部向底部推进 | 可组合的背景信息 |
| L1 锚点 | composer，全页唯一 | reading column | 无；card 是模块与编排单位 |
| composer 宽 | 760–880（现 820） | 与 reading measure 同宽（现 740） | — |
| composer 本体初始高 | 92–112（现 96） | 80–96（现 88） | — |
| composer 垂直位置 | 中心落在主区高的 55 % 或更下（现 56 %），由 `--home-lead` 量出 | 沉底 | — |
| 其上非 chrome 内容 | ≤180，其中 orientation ≤120 且不含数字 | 只有 thread | — |
| 下方 | Today 三数字 strip → Continue 行 → 有数据源才出现的 compact card；ragged layout，不填满 grid | 禁止出现任何 Home dashboard primitive | card 内无框内容，禁止 nested card |
| 首屏下半部 | 必须有可见的 continuity 内容 | — | — |
| 右侧 contextual surface | — | 有内容才出现；出现时正文 measure ≥640，不足则 overlay / collapse | 展开进入独立 surface |

composer 是**一个** primitive 的两个 variant，不是两个组件（WK-97）。

## Border 审计（WK-94，2026-09-09 FE-01）

边框只留四种角色：**input**（输入面的一圈边界）、**selected**（选中态）、**floating**（浮层的描边，与阴影同用）、**error**（失败边界，含 2px 状态侧线）。其余层级由间距、字阶与表面色承担。

本单据此改的：Home 的三个数字之间的竖线（改为间距）、`.home-card` 的一圈线（改为 `--panel-muted` 表面）。

**未收口，留后续单**：`app/web/styles.css` 中另有约六十处 1px `--line` / `--line-strong`，绝大多数是重复行的分隔线与带脚的一条界（sidebar / chat-header / settings block）。SH-2 把「重复行分隔」列为一条独立的视觉通道并允许它，WK-94 的四角色闭集不含它——两条体例在此处冲突，须裁。在裁定之前本单只收口自己触及的表面（Home、chrome、Settings 导航），不做全站清扫：一次性拆掉六十处分隔线会改变每一个表面的读法，而那正是本轮不该在没有像素验收的情况下做的事。

## 缩放与验收

当前产品没有连续缩放画布或 zoom 控件；不新增虚构缩放功能。检查重点为 viewport 变窄时的 reflow、长文案、弹窗内部滚动、动作可达性，以及 browser zoom 的实际能力边界。320px 有效宽度检查不等于已验证浏览器 200% 缩放，更不等于通过整套 WCAG。

本轮修正：首页 composer 12px/列表16px 边距不齐；编辑弹窗独立 padding；设置输入最小宽度挤压；弹窗动作不换行；零散字号统一 token，窄屏 10px 元数据提升到 caption。实际截图、运行与重连证据见 `evidence/final-ui-audit/README.md`。品牌命名与语义注入、完整设备 IME/读屏/浏览器缩放矩阵留有明确后续边界。
