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

## 缩放与验收

当前产品没有连续缩放画布或 zoom 控件；不新增虚构缩放功能。检查重点为 viewport 变窄时的 reflow、长文案、弹窗内部滚动、动作可达性，以及 browser zoom 的实际能力边界。320px 有效宽度检查不等于已验证浏览器 200% 缩放，更不等于通过整套 WCAG。

本轮修正：首页 composer 12px/列表16px 边距不齐；编辑弹窗独立 padding；设置输入最小宽度挤压；弹窗动作不换行；零散字号统一 token，窄屏 10px 元数据提升到 caption。实际截图、运行与重连证据见 `evidence/final-ui-audit/README.md`。品牌命名与语义注入、完整设备 IME/读屏/浏览器缩放矩阵留有明确后续边界。
