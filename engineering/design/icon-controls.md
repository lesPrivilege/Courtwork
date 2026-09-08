# SVG 操作、文字语义与二级提示体例

2026-09-07 · Astra。用户提供 Codex 截图并明确要求消费原生 SVG Button 和外部库，减少过度文字化的交互。**该新指令替代 DC-4 / PC-6 / UX 体例中“不引入图标家族”的旧限制。** 文字仍承担对象与工作语义；图标承担高频、通用、位置稳定的操作。不是把所有字替换成图形，也不是自建一套符号。

## IC-1 · 优先级与落位

| 部位/动作 | 表示方式 | 必须保留的语义与行为 |
|---|---|---|
| Close、Expand/Restore、侧栏开合、Back、更多菜单 | **P0：SVG 原生按钮** | 按钮名随实际动作变化；expanded/pressed状态正确；Back导航和Close关闭不能只共用一个语义不明的箭头 |
| 行内 Copy、Refresh、Clear、外部打开 | **P0：SVG 按钮/链接** | 对象身份由同一行标题给出，aria-label 指明“复制什么/刷新什么”；外部导航用链接语义；复制成功短反馈，不伪造文件状态 |
| 展开的主导航、项目/会话入口 | **P0：图标 + 文字** | 用户需要扫描名称，不能用一排不熟悉图标取代名称；折叠导航可图标独显并有提示 |
| New session / New project | **P0：图标 + 标签或固定位置图标按钮** | 加号本身不区分两者，accessible name/tooltip必须明确；初次/空态的主要创建入口保留文字 |
| Send / Cancel run | **P1：可采用 SVG 操作** | 只改变视觉，不改变发送/取消状态机、可用性、commandId、同槽布局或输入保留；取消含义在运行状态和提示中明确，不与关闭面板混淆 |
| Open artifact、Run details、成果摘要入口 | **P1：明确对象行内可图标化，菜单内保留文字** | “打开当前文件”与“查看历史版本”必须分清；不同工作目的不能只靠一个文件图标区分；不制造未有的历史读取能力 |
| Retry loading / Continue after failure | **保留可见文字**，可加图标 | 重试读取与另起 Run 后果不同，不能合成同一个循环箭头 |
| Answer、Allow this write、Deny，未来 accept/reject/revise | **保留可见文字、范围和必要后果** | 不用勾/叉或盾牌单独承担授权与裁决，不让 tooltip 成为唯一解释 |
| 项目/任务名、路径、版本、错误、不确定性、用量、run/question状态 | **文字优先** | SVG最多辅助类型/定位，状态不是仅靠颜色/图形；id/hash可收进二级详情并提供明确复制入口 |
| 成功工具记录、事件 trace | **平行文本行 + 必要类型图标** | 不为每个事件创造装饰图标，不把事件投影提升为接受状态 |

图标尺寸与点击尺寸分开：小图形不意味着小 hit area。图形槽建议 16/20，命中区域沿既有 32/44 控件档映射；触屏主要操作至少 44×44，紧凑桌面例外须有实测，不以 SVG 的 viewBox 当命中区域。 32 / 44 是本产品约定，高于 WCAG 2.2 2.5.8 的 24 × 24 CSS px 最低值；验收时两者分记，不以"用了 44"或截图目视代替命中区实测（frontend-layering-spec FN-27）。

## IC-2 · 采用成熟 SVG，交互仍是原生 HTML

使用同一套成熟图标的限定子集，保留它的 viewBox、线帽、线宽与许可，不混搭多个家族。图标颜色跟随 `currentColor`；装饰 SVG `aria-hidden=true`、不可单独聚焦。按钮使用原生 `<button type="button">`，导航使用 `<a>`；SVG 不自己模拟按钮、不挂另一套键盘系统。

Icon-only control 必须有明确 accessible name；开关、展开和当前页分别用正确 aria 状态，不能用 tooltip 文本替代按钮名。加载图标不替代可访问的 processing 文案。来源 SVG 作为固定受信资产，不从模型输出或用户字符串动态拼 markup。

首批只选实际用到的 icon，静态 vendoring 或最小 ESM导入；不为二十个图标引入一个 React 应用、全量 icon pack 或新构建链。新增 SVG/JS 文件逐项进入 STATIC allowlist，固定版本、LICENSE与来源 SHA，记录适配，不依赖运行时 CDN。

## IC-3 · Hover / focus 的二级文本

- Tooltip 用于短动作标签、快捷键或简短补充；hover 和键盘 focus 均能打开，Escape 可关闭。焦点不被搬进 tooltip；出现/隐藏不改变原布局，不遮挡必要目标。
- Tooltip内容含可交互控件时，它就应是 popover 或 menu，采用相应语义和焦点行为。不要把 tooltip 当藏着一段说明的微型对话框。
- 图标按钮永久有 accessible name；hover提示是冗余帮助，不是给 screen reader 唯一补名。不能只依赖浏览器 `title` 属性。
- 行内次要操作可以在 hover / focus-within 显露，但预留布局空间；触屏保留可点击“更多”或其他明确路径。操作本身不能只在鼠标经过才存在。
- Tooltip不能藏授权范围、错误原因、状态后果或尚不支持的能力；这些信息应在决定处可见。完整路径/hash可用 tooltip补全，同时提供点击详情/复制，不能只给鼠标用户。
- 快捷键仅在产品真实支持时显示，不从外部 GUI 截图照搬。

延迟和动效使用所选成熟组件的合理默认，再按 SE 工具栏密度验证；不对每个按钮单独定计时器，不新造通用 tooltip 框架。Floating 定位库不自动负责 menu/tooltip全部语义，接线必须覆盖键盘、触屏、失焦、滚动、窗口边界与资源清理。

## IC-4 · 验收清单与既有语义

以 Close/Expand、复制版本、更多菜单、Send/Cancel、Allow/Deny 五组代表控件验证：鼠标、Tab/Enter/Space/Escape、触屏、长中文标签、200%缩放、disabled/loading、selected/current。焦点圈不被裁切，图标名与实际动作相符，tooltip不截断关键内容；没有请求许可或创建能力的假象。

图标替换是可审的视觉/控件增量，独立于 C3 机械拆分；不能借此改变 G1 导航、WS-08 输入/回执、WS-09 生命周期、DC-1落点。与卡片/浮层选择共同消费 [表面层级体例](surface-hierarchy.md)。

## IC-5 · 本轮来源选择（Astra）

- **Lucide static SVG 1.41.0：asset-adopt**，固定 `bca7e75a816dcf1e75e8feb5a3198a68cbb8a052`。采用有限静态子集，不引入 runtime `createIcons` 扫描。保留 ISC 及来源标明的 Feather MIT notice；来源、样例文件 hash 与官方可访问性说明见 [Luna 溯源（历史路径：`../mvp/execution/gui-reference-intake/svg-controls-explore.md`）](../migration/2026-09-08/evidence-index.md) 和 [manifest（历史路径：`../mvp/execution/gui-reference-intake/svg-source-manifest.json`）](../migration/2026-09-08/evidence-index.md)。官方 [static guide](https://lucide.dev/guide/static) 支持该取用方式。
- **Radix Icons 1.0.3：Reference**，本次用于对照，不混入主族；不是宣称该版本为当前最新。
- **Floating UI DOM 1.8.0：有碰撞定位需求时优先 Adopt**，固定 `12d94738472e922e1b3fa31b02b2b61b9ed77e6a`。消费 `computePosition` / `offset` / `flip` / `shift` / `autoUpdate` 的成熟定位，不重写碰撞算法；只在浮层存活时维护和清理。原生按钮/菜单/tooltip语义仍由一个小的公共 adapter 接线，不引入React封装。当前更多菜单与工作面边缘的提示可作为首个真实用例。

以上是可施工的取用范围，不是产品代码已合流。Luna 的 action matrix 是建议输入；发生差异时以本页 IC-1 为准。Send/Cancel 的 icon-only 不是强制项，先用图标+文字验证习惯与状态辨识，不能为减字削弱取消的意义。
