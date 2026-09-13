# Context / TPS 二级卡片源码审计

2026-09-13 · Luna · 只读源码审计；产品基线为 main HEAD `93a8ac49f0a887bff430550441cddfa836690adf`，候选文件在共享工作区持续修改，未冻结候选 SHA。审计仅覆盖本目录 `index.html`、`study.css`、`study.mjs` 与生产 `app/web/styles.css` 的相关局部，以及其最近的浮层、材质、Shape、Motion 和文案合同。此记录不构成浏览器独立验收或候选图接受。

## 先例

- [前端连续性合同](../agent-interface-2026-09-10/frontend-contract.md)：context/TPS 只能投影现有口径；估算不等于 meter；浮层补焦点、窄屏和 reduced-motion 验证。
- [Material grammar](../home-composition-2026-09-10/material-grammar.md)：内容层通常用实色；glass 仅是短浮动 chrome / transient 的可选材料；不对长文本、表格或图表内容做 blur；既有 `context-popover` 是一个已登记例子，不等于全部二级卡片都应玻璃化。
- [Disclosure / overlay grammar](../home-composition-2026-09-10/disclosure-overlay.md)：原位披露与 anchored popover 是不同交互族；浮层应保留焦点和关闭路径，现有小浮层进场使用 180ms、4px 位移，reduced-motion 下瞬切。
- 最近生产对照：[styles.css](../../../app/web/styles.css) 的 `.context-popover`（320px、16px 内距、`--radius-container`、`--shadow-float`，有完整材质回退）、`:popover-open` / `@starting-style` 的 anchored-layer 进场，以及 `.context-card`（会话概览内分组卡）。它们是已实现局部先例，不代表全部被接受为通用组件。

## 发现

| 严重度 | 位置 / 规则 | 最小建议 |
|---|---|---|
| **P1 · 维持当前材质** | 候选 `study.css` 的 `.measure-panel` 用 `var(--float)`，目前是实色；其展开内容含 Context 构成/图例、测量方法和 TPS 请求序列。Material grammar 禁止把 blur 铺到表格与密集内容层。生产 `.context-popover` 的精确玻璃配方是 `--glass-muted` + `blur(var(--blur-transient)) saturate(1.4)` + `--rim` / `--shadow-float`，其 reduced-transparency、unsupported `@supports` 和 forced-colors 分支都回退 `--float` 且关闭 filter；这是特定 Session overview transient，不是通用卡片默认。 | 保留实色浮层。若之后只想让短促 chrome 有玻璃质感，单独限定在无正文的外层/标题 chrome，并复用 `.context-popover` 已有变量与完整回退；不要给整张数据卡加 blur 或 glass-on-glass。 |
| **P1 · 对齐表面几何 · 已改源待审** | 初读 `study.css` 时 `.measure-panel` 是 13px 半径、21px 内距和自定义阴影；Shape grammar 禁止 arbitrary radius。父侧随后按本建议调整，当前源码复读确认面板为 320px、16px、`--radius-container`、`--shadow-float`，与 `.context-popover` 几何一致。 | 当前候选源码已修正这处差额，保留为审计轨迹，不代表整体卡片已接受。保持实色时不加仅供玻璃边缘使用的 `--rim`。 |
| **P2 · 收敛字阶与密度** | `.measure-panel` 内使用多处 8–10px 字号（chart meta、source、caption、method 等），另有 34px 数值。生产 type roles 是 `--text-caption` 10.5px、`--text-meta` 11.5px、正文 14px；copy convention 要求只保留对象、状态、条件、范围、后果或定义。 | 将单位、来源、缺测状态等可读信息映射到 caption/meta token；避免重要单位落在 8–9px。压缩重复小标题/口径文本，详细测量方法留给更深一层展开。大数值可作为唯一显著读数，但应与数值单位成组。 |
| **P2 · 展开语义与动效** | `study.mjs` 以 `<details>` 保留 disclosure 语义，再用自定义 WAAPI、单卡互斥、外点关闭与 Escape 将其做成覆盖面板；Escape 返回 summary。开合为 180ms / 120ms，4px 位移加微缩放；reduced-motion 下即时。生产锚点浮层用 native popover 与 180ms / 4px 入场。 | 父侧报告浏览器已验证无重叠、外点关闭及 Escape 返回；Luna 未独立运行。接受前保留独立的指针/键盘、动画打断、窄屏碰撞和 reduced-motion 证据；装饰 motion 不扩大到 `backdrop-filter`。 |
| **P1 · 保持测量诚实** | `index.html` 的 Context ring 可访问名写着 “Synthetic context, 52 percent”，图例卡明确标 Synthetic；`study.mjs` 是固定场景数据。Atlas Projection Grammar 与 continuity contract 明确 today 的 context 是启发式构成，estimate ≠ meter。 | 一级只显示圆环的视觉决定可保留；辅助名称仍描述可知内容。正式投影没有同口径 current/limit owner measurement 时，不能填充比例环或把估算值画成预算占用；未知态需用无比例/中性 ring。TPS 也只在真实 token-delta 时间口径存在时画速率。 |
| **P2 · 共用触控与焦点 Shape** | 候选 `.composer #context-detail>summary` 与 `#send-preview` 桌面同为 32px 圆，窄屏扩为 44px；二者仍以 `border-radius:50%` 画圆，Shape grammar 指定统一 `--radius-pill`。全局 focus outline offset 4px，合同规定 offset 2。 | 保持两侧同占位与触控尺寸；圆形容器统一用 `--radius-pill`，focus 沿控件弧线派生并采用 2px offset。ring 可视无文案不意味着移除辅助名称。 |

## 范围边界

候选当前已把 Context 压成 composer 左侧圆环、Send 放右侧同占位；TPS 与 thinking 状态在同一活动行，非数值活动由文本轮播和不编码速率的 ambient bar 动画表达，数值缺测仍显示 unavailable。`study.mjs` 监听系统 reduced-motion，源码方向符合“活动≠虚构速率”的分离。以上只核对代码与已登记语法，没有打开或操作浏览器，没有检查真实视觉合成、键盘路径、触控碰撞、200% 缩放或运行中动画帧；父侧的浏览器验证应独立记录。`study.mjs` 的合成测量只用于视觉研究，不证明生产数据接线或接受。
