# WO-ATT-UI02 · 区块、源码与判断映射

基线 `main@93a8ac4`（产品源码与交接包固定基线 `6e211bd` 在 `app/web` 下逐字节相同；93a8ac4 只增加交接文档）。改动文件：`app/web/attention-view.mjs`、`app/web/styles.css`、新增 `app/tests/attention-ui02.test.mjs`。未改 `presentation-adapters.mjs`、`home-view.mjs`、`app.mjs`、`attention-agent-view.mjs`、Core、server 与 runtime。

## 最近先例与保持的关系

| 先例 | 本单沿用 |
|---|---|
| `attention.triage`（`attention-view.mjs` @93a8ac4，WK-156…158） | 六视图即查询、服务端顺序与分页、行最小字段、J/K 只移焦点、返回原行、typed actions 识别与 CAS / 回执 / 未知恢复协议。协议函数 `mutate/send/refuse/recover` 的请求形状与重试身份未变。 |
| Settings segmented（`styles.css` `.segmented`） | 视图组的轨道、凸起拇指、meta 字号；不采用滑动拇指（见判断 D-3）。 |
| M-9 `setRequestLabel` / `.request-width`（`ui-controls.mjs`） | `Sending…` 原位换词且不改宽度，用于提交与 Mark as seen。 |
| UP-4 motion 层与 WK-78 reduce 档（`styles.css`） | 两个时长、一条曲线、只动 opacity/transform、两条降级路径。 |
| Home Attention 模块（`home-view.mjs` `attentionCard`） | 未改；预览中用真实渲染函数演示进入同一对象与返回焦点。 |

## 区块 → 源码

| 区块 | 层 | 源码（`attention-view.mjs`） | 相对基线的变化 | 文本作用（copy-convention IA 标记） |
|---|---|---|---|---|
| 标题栏 | L1 | `heading()` | `Open Attention` 从详情底部移到标题栏右侧，带 `attention` 字形；`Back to workspace` 改为 quiet-button | 动作 |
| 查询栏 | L1 | `queryBar()` | 项目、Refresh、六视图与计数合为一栏；计数从列表顶部移到视图右侧并 `aria-live=polite`；新增离场说明 `attention-departed` | 标签、状态 |
| 列表 | L1 | `registry()` | 行字段不变（标题两行截断、状态、Updated）；选中行加底色与 2px 左轨；loading 增加无文字占位带；列表错误增加 `Retry`（`list-retry`） | 状态、错误恢复 |
| 分页 | L1 | `registry()` | 三栏布局固定 Previous / 计数 / Next 的位置 | 标签 |
| 阅读面容器 | — | `readingPane()` | 宽屏 sticky、自带滚动并在同对象重绘时保留滚动位置；无可选对象（loading/空/不可用）时不绘制邀请文案 | — |
| 详情头 | L1 | `detailHead()` | 新增 `Seen` / `Not seen`（来自 detail `seen`）与相对更新时间；标题 22px/600 | 状态、标题 |
| 判断块 | L1 | `decision()` | Why / Next step 合入同一内收面；next kind 词（Inspect/Decide/Wait/Follow up）作为标签显示；非 manual trigger 显示 trigger 词；due 时显示 `Recorded due time: … Nothing is delivered at this time.` | 原因、约束 |
| 动作 | L1 | `actionSurface()`、`actionEditor()` | 顺序改为紧随判断块、在披露之前；选项改为 secondary-button；字段错误就地；Kind 与 Trigger 并排；Resolve 提交旁一句后果；回执行 `Recorded · <动作词> · revision N`；冲突后版本行；Mark as seen 在途原位 `Sending…` 并禁止重复发送；re-inspect 期间禁用提交 | 动作、约束、错误恢复 |
| Recorded context | L3 | `recordedContext()` | 移到动作之后；summary 前置 chevron；来源改为列表并显示 `role`（Supports/Reports/Contradicts）；`freshness: unknown` 时显示 `Freshness unknown` | 技术事实 |
| motion | — | `play()`、`runMotion()`、`rowPositions()`、`closeGap()` | 新增，见 motion-spec.md | — |
| 样式 | — | `styles.css` Attention 区块（`WO-ATT-UI02 · Attention items workspace` 注释起） | 原 `.attention-workspace-inner`…`.attention-empty p` 与 `WK-158 disposition`…窄屏 media 块整体替换；`.attention-assistant*`、`.attention-active .chat-title-wrap` 保留 | — |

## 行为修正（作者在施工中确认的基线缺陷）

| 缺陷 @93a8ac4 | 复现 | 修正 |
|---|---|---|
| 提交在途时焦点丢失 | 聚焦提交按钮后发送：render 以 key 恢复焦点，按钮 `disabled`，浏览器拒绝聚焦，焦点落到 document | 目标禁用时聚焦 `Attention actions` 区域（`tabindex=-1`） |
| Mark as seen 可重复发送 | 在途期间再次点击：`chooseAction` 未检查 pending，生成第二个 request_id 并覆盖 pending 项 | 在途时忽略并禁用该选项 |
| 窄屏往返丢失列表位置 | 窄屏滚动列表后打开详情再返回：工作区滚动位置沿用详情页 | 打开时记录并置顶，返回时恢复 |
| 未知结果后焦点丢失 | 丢失响应后只有 `role=alert`；焦点 key 指向禁用的提交按钮，浏览器拒绝聚焦 | 焦点移到 `Retry sending` |
| 成功提交后详情闪空 | `select(keepFocus)` 先清空 detail，再显示 `Loading item…` | re-inspect 期间保留旧 detail 并禁用动作，读到新 detail 后替换 |

## 新增项清单

| 类别 | 内容 |
|---|---|
| 新 token | 无。 |
| 新依赖 | 无（产品）。作者工具 `tools/*.mjs` 使用本机 npx 缓存的 Playwright 1.63 与系统 Chrome，不进入 `app/package.json`。 |
| 新 primitive | 无。沿用 `el`、`icon`、`setRequestLabel`、quiet/secondary/primary button、`inline-notice`、`inline-error`。 |
| 新增字面尺寸 | `.attention-workspace-inner` max-width 1120px（基线 1040px）；列宽 `minmax(280px, 360px)`；标题 22px（基线 24px）；窄屏 h1 24px（基线 26px）；阅读面空态上下 72px；详情头为角落按钮预留右内距 104px。`lint-shapes` 未涉及，列入待裁。 |
| 新文案 | `Not seen` / `Seen`；`Recorded · <动作词> · revision N`；`Now <状态> (was <状态>) · revision N. Your draft is kept.`；`<标题> · now <状态>, not in this view`；`Records your decision on this item only. Nothing outside Courtwork is approved or changed.`；`Nothing is delivered at this time.`（原仅在编辑器 help 中）；`Supports` / `Reports` / `Contradicts`；`Freshness unknown`；列表 `Retry`。 |
| 后端缺口 | 无新增需求。主路径只用现有 registry / exact / inspect / request 查询与六个 typed actions。 |
| 未改动的已知文案问题 | `VERSION_CONFLICT` 文案 “Reload it and try again” 与自动 re-inspect 不一致；该句由现有测试逐字断言，本单只在其后补版本行，交 Astra 决定是否改句。 |

## 需要 Astra 裁决的选择

| 编号 | 选择 | 作者建议与理由 | 备选 |
|---|---|---|---|
| D-1 | `Open Attention` 放在标题栏 | 采用。assistant 是全局对话，放在详情内会读成绑定当前对象（layers.md 边界）。 | 保留在详情底部 |
| D-2 | 动作排在 Recorded context 之前 | 采用。决定所需的限制与错误留在动作附近；版本与出处属于 L3。 | 维持基线顺序 |
| D-3 | 视图拇指不滑动 | 采用。视图是查询按钮组、宽度不等，筛选应立即响应。 | 复用 segmented 的 180ms 滑动 |
| D-4 | 已 seen 时仍显示 Mark as seen | 维持。Core 在 seen=true 时仍广告 acknowledge，UI 只按广告出控件。 | 表现层隐藏（需另立规则：广告与呈现可分离） |
| D-5 | 宽屏 `Back to items` 在阅读面右上角，仍是选中后的焦点落点 | 采用，保持既有焦点合同与测试。 | 宽屏隐藏、焦点改落详情标题（需改测试与 WK-158 §11 描述） |
| D-6 | Resolve 旁的后果句 | 采用。resolve ≠ 外部批准属于决定前约束。 | 移入 Recorded context |
| D-7 | 来源 `role` 词与 `Freshness unknown` 进入 L3 | 采用；均为 inspect 已有字段。 | 不显示 |
| D-8 | 窄屏选中后隐藏查询栏 | 采用；单面阅读，返回后恢复。 | 保留查询栏 |
| D-9 | 宽屏阅读面 sticky 且自带滚动 | 采用；长列表滚动时判断与动作留在视野。 | 随页面滚动 |
| D-10 | `Refresh` 保持文字按钮 | 采用；`refresh-cw` 属受控语义消费者（`raw-consumers.json`），用字形需登记。 | 登记后改为图标 |
