# WO-ATT-UI02 · 交互与 motion 规格

作者 Claude，候选版本，未经 Astra 接受。实现位于 `app/web/attention-view.mjs` 的 `play()`、`runMotion()`、`rowPositions()`、`closeGap()`，以及 `app/web/styles.css` 的 Attention 区块。

## 共同约定

- 只动 `opacity` 与 `transform`。时长与曲线从既有 token 读取：`--duration-fast` 120ms、`--duration` 180ms、`--ease-out` `cubic-bezier(0.2, 0, 0, 1)`。token 读不到时不播放，不回退到局部字面值。本单未新增 motion token。
- 实现用 Web Animations（`Element.animate`），不用 CSS keyframes：方向与位移由运行时决定（上下行、离场前位置），CSS 无法表达。全局 `transition: none !important` 管不到 WAAPI，因此 `motionAllowed()` 自查两条降级路径：系统 `prefers-reduced-motion: reduce` 与根元素 `data-motion="reduce"`，任一成立即不播放。
- 动画只跟随已提交的 DOM。焦点、按钮可用性、状态词和 `role=status/alert` 播报都在 render 同步完成，不等待动画结束。
- 打断规则统一：工作区每次 render 替换节点，旧节点上的动画随节点移除而结束，新节点直接处于终态。连续点击不会排队。
- 反馈类动画（M6–M8）在一次处置的 re-inspect 与 registry 重读都落地后才播放（`motion.hold`），因此承载结果的那次 render 与播放动画的是同一批节点，后续 render 不会截断。

## 即时响应，不加 motion 的操作

| 操作 | 理由 |
|---|---|
| 六个视图切换、项目切换、Refresh、分页 | 高频查询；按下态立即变化，列表以占位带保持位置（见 M3）。视图拇指不滑动：视图是查询按钮组，不是等宽 segmented。 |
| J / K / 方向键 | 只移动焦点，不换对象；原生焦点环立即出现。浏览器检查确认按键期间没有动画。 |
| 行选中 | 选中底色与左侧 2px 轨立即出现；位置关系由 M1 在阅读面表达。 |
| 编辑器关闭（再次点选项或 Escape） | 退出比进入快；节点直接移除，焦点回到对应选项。 |
| hover / pressed 色变 | 沿用全局 120ms 颜色过渡（UP-4），本单未改。 |

## 条目

| # | 用户目的 | 触发 | 起 → 止 | 时长 / 曲线 | 打断、反向、退出 | 焦点时机 | reduced-motion | 失败与恢复 |
|---|---|---|---|---|---|---|---|---|
| M1 | 宽屏上确认“正在读的对象换了”，并区分下一条与上一条 | 选中另一对象后其 detail 首次渲染（`motion.shown !== selectedId`）；同一对象 re-inspect 不触发 | `.attention-detail` opacity 0→1，translateY(+6px→0)；新行位于上一个选中行之上时为 −6px | 180ms / `--ease-out` | 读取中再次选中，旧 detail 未渲染即被替换；无退出动画 | 选中时同步移到 `Back to items`，不等读取 | 不播放，内容直接出现 | 读取失败显示 `Retry item`，无动画 |
| M2 | 窄屏保持“列表与详情是同一层级的左右两面” | 窄屏（≤767px）从列表打开对象；从详情返回列表 | 打开：`.attention-reading` translateX(24px→0) + opacity 0→1。返回：`.attention-registry` translateX(−24px→0) + opacity 0→1 | 180ms / `--ease-out` | 进入途中按返回，新 render 以返回方向重新开始；返回时恢复打开前的列表滚动位置 | 打开时焦点同步到 `Back to items` 且滚动置顶；返回时同步回到原行 | 不播放；滚动与焦点恢复照常 | 与宽屏相同 |
| M3 | 快速读取不闪 “Loading…”，慢读取仍说明状态 | 列表或 detail 进入 loading | `Loading item…` 与列表占位带：opacity 0→1，延迟后才绘制 | 列表占位：延迟 120ms，180ms；detail 文案：延迟 180ms，120ms；`fill: backwards` | 读取完成即替换节点，延迟未到则从未可见 | 不涉及 | 立即可见 | `role=status` 节点在 DOM 中立即存在，读屏立即播报；失败替换为错误与 Retry |
| M4 | 编辑器从所选动作下方展开，建立“这是它的表单” | 点选需要 payload 的动作 | `.attention-action-editor` opacity 0→1，translateY(−4px→0) | 120ms / `--ease-out` | 再点同一选项或 Escape 立即关闭（无退出动画）；切换到另一动作重新播放 | 同步聚焦 `Reason`，不等动画 | 不播放 | 字段错误就地出现在对应字段下，`role=alert`，焦点回该字段 |
| M5 | 已送出不等于已生效 | 提交 / Mark as seen 发出请求 | 不做 motion。按钮原位换词 `Sending…`，沿用 M-9 `request-width` 双影子，宽度不变（浏览器检查宽度差 < 1px） | — | 请求在途时所有提交禁用，Mark as seen 不可重复发送 | 焦点留在按钮；按钮禁用时落到 `Attention actions` 区域（`tabindex=-1`），不掉到 document | 同 | 状态词、行状态保持服务器上次确认值，无乐观更新 |
| M6 | 让变化了的记录事实被看见一次 | 回执与本请求匹配，且 re-inspect 读到 revision ≥ 回执 revision | 只对变化的事实：detail 状态词、对应行状态词、`Seen` 标记 opacity 0.35→1 + translateY(3px→0)；回执行 `Recorded · <动作词> · revision N` opacity 0→1 | 180ms / `--ease-out` | 每个回执只播放一次（`receipt.played`）；换对象或新提交时清除回执 | 焦点保持在原位置；对象离开当前视图时按 WK-158 §11 落到最近存活行 | 不播放；回执行与新状态照常出现 | 回执不匹配：不画回执行，显示 `The recorded receipt did not match this request.`；拒绝、冲突、未知结果都不触发 M6 |
| M7 | 对象离开当前视图时，列表不跳，且说明它去了哪里 | 提交成功后 registry 重读不再包含该对象 | 存活行 translateY(旧位置−新位置 → 0)；视图栏出现 `<标题> · now <状态>, not in this view`，opacity 0→1 | 180ms / `--ease-out` | 切换视图、翻页、重新选择会清除说明 | 同 M6 | 不播放；说明照常出现 | 重读失败显示列表错误与 Retry，不播放 |
| M8 | 拒绝、冲突、未知结果出现时不加戏 | 提示句子内容与上次不同 | `.attention-action-alert`、`.attention-conflict-now` opacity 0→1，无位移、无抖动 | 120ms / `--ease-out` | 同一句子重复 render 不重播 | 未知结果时焦点同步移到 `Retry sending`；冲突时焦点保持在提交按钮，草稿保留 | 不播放 | 未知结果以同一 request_id 原样重发；冲突在 re-inspect 后给出 `Now <状态> (was <状态>) · revision N. Your draft is kept.` |
| M9 | 披露的开合方向 | 展开或收起 `Recorded context` | 前置 chevron rotate(0→90deg) | 120ms CSS transition | 原生 `details` 生命周期，随时可反向 | 焦点留在 summary | 全局 reduce 规则清零 transition | — |

## 录屏

`evidence/motion/`，同一合成 fixture，system Chrome 1440×900 或 390×844：

| 文件 | 内容 |
|---|---|
| `normal-1440-light.webm` | Home 行 → 事项面同对象 → 换对象（上/下行）→ J/K → Needs you 视图 → Mark as seen 回执 → Resolve（1.8 s 慢回执，Sending… 原位）→ 回执、对象离开视图 → Escape → 返回 Home |
| `failure-1440-dark.webm` | Resolve 冲突（草稿保留、版本行）→ 再提交丢失响应且未提交（未知结果、焦点到 Retry sending）→ 重发时提交后丢失响应（恢复查询找到回执）→ Reopen 编辑器开、关、再开、Escape |
| `narrow-roundtrip-390-light.webm` | 分页列表滚动 → 打开详情（右入）→ 返回（左入、滚动恢复）→ 打开另一项、编辑器、两次 Escape |
| `reduced-1440-light.webm` | `data-motion="reduce"` 下同一主路径，全部瞬切 |

录屏的停顿只为观看，产品不等待它们。
