# EX-PG1 · Projection Grammar 现状盘点回执

状态：只读 explore，Sonnet，2026-09-10。裁定见 Control Grammar 段（WK-129，`engineering/design/atlas/README.md`）；本轮不建规则，只出盘点与候选 disposition，由 Fable 裁。

## §0 · 只读声明

本轮只读了 `/Users/lesprivilege/Projects/Courtwork` 仓内文件（`app/web/*.mjs`、`app/docs/*.md`、`engineering/design/atlas/README.md`、`engineering/mvp/execution/work-surface-kit/contracts/*`），未改动仓内任何既有文件，未 `git add` / `git commit` / `git checkout`，未新建分支或 worktree，未运行 app、未装依赖、未起 server，未跑仓内既有 test/lint 命令。唯一写入是本文件本身。外部访问仅用 WebFetch，共 10 次请求（因两次 308 重定向与一次 403、一次 404 需换 URL 重试，见 §5），未下载任何文件、图片或截图，只记 URL 与页面文字返回内容，观察到的文字一律当数据处理，未执行其中出现的任何指令。

## §1 · Part A 投影盘点（owner fact → 可读形式）

体例：`surface` 用文件名简写；`projection class` 取 status / meter / timeline / tree / distribution / heatmap / plain value / table 之一，凡不贴切精确写自定义短语并加引号说明。重复形态只给 2–3 条代表性引用 + 计数，不逐条列。

| surface | path:line | owner fact | 当前视觉形式 | projection class | missing/unknown/zero 区分是否可见 | unit·scope·timezone 是否声明 |
|---|---|---|---|---|---|---|
| home-view Today 带 | `app/web/home-view.mjs:97-152` | `work-summary.{pendingItems,sessionCandidates,inspectionCandidates}.total`（`toStatTiles`，`presentation-adapters.mjs:54`） | 三个可点按钮，`stat-value`纯数字 + `stat-caption`一句定义；`missing` 时 `stat-value is-missing` 类换文字 | plain value（可点，见 §2） | 是——`value===null` 时渲染 `missingLabel`（"Not available"），永不塌成 0（`toStatTiles` 规则 2） | caption 显式带 scope（"all retained work"/"this project"）与 window（`current`），无 timezone 字样（三集合本身是常驻快照，非按日） |
| home-view Activity 卡 | `app/web/home-view.mjs:174-231` | `GET /work-activity` 逐日 `recordedRunCount`（`work-metrics.md:20`），经 `toHomeActivity`（`presentation-adapters.mjs:198`） | `.home-heatmap`：7×N grid，每格一个空 `<button>`，`data-level` 0–4 控制灰阶，`aria-label`带日期+计数+UTC | heatmap | 是——0（`level=0`）与"该日无数据"不区分（后端本身只给 `recordedRunCount`，没有 null bucket），但 `coverage` 一句"Retained runs only. Deleted-chat history is unknown."把"零=已确认零"与"历史覆盖率未知"分开说 | `aria-label`每格含 `(UTC)`；卡内一句 `${total} 条 · ${days} 天 · all retained work` 声明 scope；无相对时间 |
| usage-view Overview 热力图 | `app/web/usage-view.mjs:54-63` | `work-usage-details.buckets[].tokens`（`usage-details.md`） | `.usage-heatmap`：同结构 grid，但级别来自 `quantileLevels`（相对分位数，非绝对阈值，`usage-projection.mjs:8-11`） | heatmap | 是——`is-incomplete` 类 + `aria-label`里"incomplete runs"计数，与"零"分开；文案"zero is retained zero, not historical inactivity" | 一句"Relative scale over positive reported days. Thresholds: …"声明是相对刻度而非绝对单位；scope 由页头 `select` 声明；interval 尾行声明 UTC 与"historical coverage unknown" |
| usage-view Models 堆叠图 | `app/web/usage-view.mjs:65-70` | 同上，按 model 分组（`modelSeries`，`usage-projection.mjs:2-6`） | `.usage-stacked-bar`：每日一列，`style.height=值/max*100%`的分段按钮 | distribution（堆叠比例条，非 meter：无固定上限，`max` 是该窗口内观测最大值） | 是——`if(!item.values[i])return`跳过空段，不画 0 高度伪造存在 | 文案"Top four configured models plus Other…Model identity and Other membership stay fixed" 声明 scope 规则；`max` 一句声明单位（reported tokens） |
| runtime-view 下一次运行 context bar | `app/web/runtime-view.mjs:2487-2549`（RC-5） | 下一次 run 的 context 构成，按 `item.kind` 分桶字符数（`admittedCharacters`） | `.context-bar`：`role="img"`一条 `flexGrow` 分段条 + 下方 `<dl>` 逐桶字符数 | distribution（比例条，注释明确"没有 maximum，不画 percentage-of-limit"，`runtime-view.mjs:2483-2486`） | 是——`admitted`（`characters>0`）与`deferred`（`characters===0`，另注明 `user-invoked`/`deferred`）分组渲染，deferred 桶显式 `—` 而非 0 | `aria-label`带`toLocaleString()`总字符数与`CHARACTER_NOTE`；无 timezone（非时间量） |
| telemetry-view 请求测量 | `app/web/telemetry-view.mjs:18-33` | `runtime.request.telemetry` 事件（`request-telemetry.md`） | `<dl class="data-list">`纯文字键值对，`<h4>`标题带 requestId/purpose/phase | plain value / table（dl 形态） | 是——`Decode TPS` 固定写"Unavailable · no token deltas"；`row.usage[key]===null?'Not reported':...`；`duration()` 对 `NaN` 显式返回 "Not observed" | 尾行声明"Host timings include transport and adapter work; they are not provider TTFT. Context is a heuristic..."；时长单位秒（`/1000).toFixed(2)+' s'`） |
| model-picker 路由行 | `app/web/model-picker.mjs:36` | `provider-config`/`provider-models` 目录 | 一行纯文字：`provider · api[· custom endpoint]. Context window: N tokens.` | plain value | 是——`contextWindow` 不可解析时写"unavailable" | 单位显式"tokens"；无 timezone |
| inspector.mjs run 详情 | `app/web/inspector.mjs:36-90`（节选，全函数 36-299） | 单个 `run` 对象（状态/时间/usage/artifacts），**未经任何 adapter**（见 §3 Q5） | `<div class="inspector-status">`状态徽章 + 多组 `<dl>`（`datum()`，`inspector.mjs:23`） | plain value / table | 是——`datum()`对空值走各自 caller 的缺省文案（逐处判断，未见统一规则） | 时间字段原样 ISO 传入，交给浏览器本地时区渲染的下游函数（未见本文件内重切时区） |
| workspace-view / materials-view 文件树 | `app/web/workspace-view.mjs:120-162`；`app/web/materials-view.mjs:20-76` | `GET /sessions/:id/workspace` 文件列表 | 按目录分组的行列表（非 `<details>` 折叠树，是平铺分组 list），行内 `formatBytes` | tree（浅一层：目录分组，非递归折叠树） | 是——空目录/空列表走 `emptyLabel`；`materials-view.mjs`对空文件夹与加载失败分两种文案 | 字节用 `formatBytes`（`inspector.mjs:16`）单位化；`mtime` 与 run 的 `writtenAt` 语义分开注释（`presentation-primitives.d.ts:260`） |
| surface-modules railCard 计数/状态词 | `app/web/surface-modules.mjs:56-71`（锚点定义）+ 全文件 43 处调用 | 各 rail 模块（Files/Workspace/Usage/Attention 等）自己的计数/状态 | 统一解剖：glyph 16 + 标题 + 一个 `stateWord` + 一个 trailing action + 行列表；**明文禁止**嵌套卡、进度条、百分比（`surface-modules.mjs:56-57`） | status（stateWord）+ list（rows） | 视各模块调用方而定，未见统一 null 处理，逐模块各自判断 | 视各模块 |
| attention-agent-view 对话列表/未决问题 | `app/web/attention-agent-view.mjs:1-140` | 全局 Attention 对话与其未决 `ask_user`/`permission` | 消息流 + 两钮授权行（同 app.mjs 授权卡形态） | plain value / status | 部分——未见专门缺省文案，跟随消息流本身的 loading/error 状态 | 无 timezone 特殊处理，走通用 `stamp` |
| attention-view 条目详情 | `app/web/attention-view.mjs:60-68` | 单个 Attention item 的 `next_action`/`due_at` | 纯文字段：`Not recorded` 缺省 + 一句"Opening it does not acknowledge or resolve it." | plain value | 是——`next_action?.label??'Not recorded'` | `due_at` 经 `time()` 本地化显示 |
| toStatTiles/toWorkCards 等 adapter 输出 | `app/web/presentation-adapters.mjs:54-253` | work-summary 三集合、work-activity、attention | 见上；adapter 层本身不渲染，只固定 missing/caption/scope/window | （非渲染层，供上游 plain value / heatmap / list 消费） | 是——三条规则贯穿（见 §3 Q5 与文件头注释） | 是——`scopeWords()` 与 `window={kind:'current'}` 在此处固定 |

**去重说明**：`button` 类计数见 §2 起始表；本表未逐一列出 43+ 处 railCard/flowRow 调用，只给锚点定义行 + 代表性消费方。

## §2 · Part A 控件盘点（owner state / local view state / navigation → 可操作元素）

| surface | path:line | 改变什么 | 当前元素 | control class | 选项来源 | confirmation/undo/in-flight |
|---|---|---|---|---|---|---|
| composer Send/Cancel | `app/web/app.mjs:3234-3299` | owner state：发起/取消一次 Run | `<button type=button>` ×2，文字随态原位变（`requestLabel`） | command | 无选项（单一动作） | in-flight：`setRequestLabel`换文字为"Send…"类；无 confirm；cancel 区分"cancel requested ≠ stopped"（注释 3230） |
| composer textarea | `app/web/app.mjs:3226-3299` | local view state：草稿文本（`draftCache`），发送时变 owner | `<textarea>` | value（自由文本，非结构化） | 不适用 | 草稿本地持久（`draftCache`），无 undo |
| 模型选择 `select` | `app/web/model-picker.mjs:26` | owner state：`provider-config`（下一次 run 生效） | native `<select size=7>`（含 `<optgroup>`） | selection | 是——来自 `provider-models` 目录（服务端安装列表），非硬编码 | 无 confirm；"Use for next runs"按钮显式提交，未提交前关闭不生效（"Closing a submitted save does not revoke it"——反之未提交关闭亦不生效） |
| Reasoning effort `select` | `app/web/model-picker.mjs:27,31-34` | owner state：`reasoningEffort` | native `<select>` | value（离散有序集合，用 selection 元素承载） | 是——`selected.supportedEfforts`，来自 provider 目录的 `getSupportedThinkingLevels`（`request-telemetry.md:3`），非硬编码 | 同上，随 save 一并提交 |
| Home 三 stat tile | `app/web/home-view.mjs:107-141` | local view state：`activeSet` 筛选下带列表 | `<button aria-pressed>` | selection（WO-WK13 之后新增能力，见 `presentation-primitives.d.ts:104-111` 的追补注释） | 不适用（固定三个） | `aria-pressed`态；无 confirm；点两次复位（toggle off） |
| Home permission `home-permission-input` | `app/web/app.mjs:6433-6441`，选项来自 `settings-view.mjs:78` `permissionLabels` | owner state：新建会话默认 `permissionMode` | native `<select>` | selection | 选项硬编码于 `settings-view.mjs`（`ask`/`allow`/`deny` 三值闭集，非服务端目录） | 无 confirm；即时生效于表单提交时 |
| Session permission popover（connection card） | `app/web/app.mjs:5121-5134` | owner state：当前会话 `permissionMode`（PUT `/sessions/:id/permission-mode`） | `segmentedPermission`（`settings-view.mjs:241-267`）——原生 radio 组，视觉呈现为一条 segmented track | selection | 同上，硬编码三值 | 提交即生效（PUT），`fieldset.disabled` 承担 in-flight；无二次确认；`showToast`给出结果回执 |
| Developer Runtime Policy 规则表 | `app/web/runtime-view.mjs:2066-2170` | owner state：某 scope 层的工具权限 `rules[]`（action/resource/effect） | `<table>` 行内 `<input type=text>` ×2 + native `<select>`（allow/ask/deny）+ 逐行 Remove 按钮 + Add/Save/Discard 按钮 | structure（Rule builder 形态，见 §6 开放问题） | effect 的三值选项硬编码（`EFFECT_LABELS`）；action/resource 是自由文本输入，非目录选择 | "Save rules"按钮仅在 `dirty` 时可点；"Discard the draft"可整体撤销未保存编辑；服务端二次校验"a narrower layer can only tighten"，前端拒绝会被服务端拒绝而非隐藏（注释 2074-2076） |
| Approval 两钮卡 | `app/web/app.mjs:5507-5560` | owner state：一次 `permission`/`ask_user` 的 decision | 两个 `<button>`：`Deny this {noun}` / `Approve this {noun}`，原位卡内，非 `<dialog>` | governed action | 不适用（闭集两值） | 无 `window.confirm`；按下的那个换词为在途态，另一个只是 disabled（FN-19 注释 5538）；无 Always allow（atlas 明文） |
| Attention 内嵌授权 | `app/web/attention-agent-view.mjs:105-112` | 同上，Attention 对话内 | 两个 `<button>`：`Deny` / `Allow this action` | governed action | 不适用 | 同构；无 confirm dialog |
| Runtime 资源覆盖 switch | `app/web/runtime-view.mjs:595-691`（节选） | owner state：某 scope 层对某资源的布尔覆盖 | `<button>`（"Inherit"/显式布尔态） | value（布尔，用 command-style 按钮承载，非 `<input type=checkbox>` 的可见形态——但草案表单里也见 `<input type=checkbox>`，见下一行） | 是——resource 列表来自 runtime snapshot（服务端已装资源），非硬编码 | `frozen()` 时禁用；"Editing the {layer} layer · Revision N"声明当前编辑的是哪个快照版本 |
| Developer profile 打包 checkbox | `app/web/runtime-view.mjs:1547` | local view state → 提交为 owner `agent_profile` | `<input type=checkbox>` | selection（多选） | 是——resource 列表来自当前 runtime snapshot | "Save profile"提交；无 confirm |
| Attention project `select`（Home 卡） | `app/web/home-view.mjs:200-203` | local view state：Home Attention 卡的当前 project 过滤 | native `<select>` | selection | 是——来自 `GET /projects`（owner 目录） | 无 confirm，`change`即触发重新读取 |
| Usage 对话框控件组 | `app/web/usage-view.mjs:30-39` | local view state：project/period/metric 过滤 + view tab | 3×native `<select>` + Refresh 按钮 + `role=tablist`两个 `<button role=tab>` | selection（前三）+ selection（tab） | project 来自 `getProjects()`（owner 目录）；period 硬编码 `[7,30,84,366]`；metric 硬编码三值 | tab 支持 ArrowLeft/Right/Home/End 键盘模型（`usage-view.mjs:43`）；Refresh 按钮 `disabled=loading` 作 in-flight |
| Usage 热力图单格 | `app/web/usage-view.mjs:57` | navigation：点击 → `inspect({date})` 发起 drilldown 请求，结果内可 → `onOpenRun` 打开真实 run | heatmap cell `<button>` | structure/navigation（drill-down） | 不适用（数据驱动的日期集合） | `drill.loading`/`drill.error` 分状态；无 confirm |
| Home 热力图单格 | `app/web/home-view.mjs:209-222` | local view state：仅更新旁白 `selected.textContent`，**不发起任何请求，不导航** | heatmap cell `<button>`，键盘模型为 7 列网格 ArrowUp/Down/Left/Right + Home/End（`home-view.mjs:213-219`） | value 展示（无实际 drill-down，仅"读出该格") | 不适用 | 无 in-flight（本地即时） |
| Settings 外观 segmented（配色/字号/动效/Home 布局） | `app/web/settings-view.mjs:1625,1652,1687,1696,1823` | local view state（本机偏好，`cw:prefs`） | `segmented()`（`settings-view.mjs:1276-1293`），原生 radio + 视觉滑块 | selection | 硬编码闭集（2–3 值），显式注释"两值的闭集偏好用 segmented，不用 select"（`settings-view.mjs:1694`） | 即时应用，无 confirm，无服务端往返 |
| Settings `/` 搜索唤出 | `app/web/app.mjs:5753-5769` | navigation：聚焦 Runtime 分组搜索框 | 键盘快捷键（非可见控件） | command | 不适用 | 仅在 `state.settings.open` 且非文本输入焦点时生效，严格排除 IME/modifier |
| 新建 project/session 对话框 | `app/web/app.mjs:5891-5921` | owner state：创建对象 | `<dialog>` + `<input>` + （session 分支）`session-permission-input` `<select>` | command（创建）+ selection（权限预设） | permission 选项硬编码三值；其余是自由文本 | 提交时 `controls.forEach(node=>node.disabled=true)`整体锁定；`error` 区域承载失败回执，无二次确认 |

**代表性去重**：43 处 `<button type=button>`（`el`）+ 58 处（`element` 别名，主要在 app.mjs）里，绝大多数是同一 command class 的一次性动作（打开/关闭/重试/复制），本表只挑了行为上有区别的样本；未逐条列出的典型还有：Retry 按钮（≥6 处，如 `home-view.mjs:529`、`materials-view.mjs:76`、`inspector.mjs:471`）、Copy 按钮（`copyAction`，`ui-controls.mjs` 定义）、`chevron-right` Open 按钮（WorkCard/PendingRow/InspectionRow 统一用法）。

## §3 · 五个具体问题

**Q1. HTML 控件种类与计数；有无 range/number/date/progress/meter/slider/stepper/scrub/date-picker/token 字段/tree 控件/浮动工具条？**

| 元素 | `el()`/`element()` 计数（跨 `app/web/*.mjs`） | 备注 |
|---|---|---|
| `button` | 43（`el`）+ 58（`element`，主要 app.mjs） | 绝大多数 `attrs:{type:'button'}` |
| native `select` | 16 | 见 §2 各行 |
| `input` | 16（`el`）+ 部分经 `element`） | 实际 `type` 分布：`text` 6+1、`button`≈67（多数是 `<button>` 标签本身携带 `type=button` 属性，非 `<input type=button>`）、`submit` 4、`radio` 3、`checkbox` 2、`search` 1、`url` 1、`password` 1 |
| `details`/`summary` | 9/14（`el`）+ 13/15（`element`） | 折叠展开是本仓的默认 Structure 元语，见 tool-card（`app.mjs:2607`）、activity-group（`app.mjs:2643`）、settings 帮助块、file-view 详情 |
| `dialog` | 2（`el`，usage-view/model-picker）+ 2（`element`，新建 project/session 等） | 均为 `showModal()` 原生模态，无第三方 modal 库 |
| `textarea` | 2（`el`）+ 3（`element`） | composer、Attention 单行输入等 |
| `fieldset` | 3（`el`） | `segmentedPermission`/`segmented`/policy 相关 |
| `table` | 5（`el`）+ 6（`element`） | usage 明细表、policy 规则表、runtime 资源表等 |

**逐项确认**：`grep -n "type: *'range'\|type:'number'\|type:'date'\|<progress\|<meter\|slider\|stepper\|scrub\|datepicker\|DatePicker"` 对全部 `app/web/*.mjs` **零命中**（本轮命令输出仅命中 `tree` 变量名与注释里的"workspace tree"，与 UI 控件无关）。结论：**没有** `<input type=range>`、`<input type=number>`、`<input type=date>`、`<progress>`、`<meter>`、滑块、stepper、scrub 交互、日期选择器。**没有**独立的 token/tag 输入字段（composer 无 `/`/`@` 附件触发，见 Q5 之外的旁证：`grep attach_relation` 在 `app/web/` 与 `app/docs/` 与 attention-agent-2026-09-10 目录**零命中**，说明 atlas 里"entity picker for matter/session/run（Attention `attach_relation`）"这一候选尚未落地）。**没有**递归折叠的 tree 控件——workspace/materials 的"文件树"实际是按目录分组的平铺行列表（`app/web/workspace-view.mjs:120-162`），唯一命名为"tree"的是数据结构变量名，不是一个可展开/折叠的树控件。**没有** contextual/floating toolbar（`grep -rn "bubble\|contextual toolbar\|floating toolbar"` 零命中），与 atlas 把"contextual toolbar（bubble）"列为候选（→ CC-I）一致。

**Q2. 已有投影样本比较**

- **两个 heatmap**：Home Activity（`home-view.mjs:174-231`，`toHomeActivity`）与 Usage Overview（`usage-view.mjs:54-63`）**用两套不同的分级算法**——Home 是绝对阈值（`count===0?0:count===1?1:count<4?2:count<8?3:4`，`presentation-adapters.mjs:220`），Usage 是相对分位数（`.5/.75/.9` 分位，`usage-projection.mjs:8-11`）。键盘模型也不同：Home 按"星期行"语义（ArrowUp/Down 在同一星期几的格子间跳一整行，`home-view.mjs:216-219`）；Usage 按线性索引 ±1/±7（`usage-view.mjs:59`）。可访问名称：Home 是`"{date} · {count} retained runs (UTC)"`；Usage 是`"{date}, {value} reported tokens, {n} incomplete runs"`。Drill-down：Home 点击/聚焦只更新本地旁白文字（不发请求、不导航，`home-view.mjs:209`）；Usage 点击触发真实 `POST /work-usage-runs` 查询并可从结果打开具体 run（`usage-view.mjs:57,86`）——**两者不是同一投影语义的两份实现，是两种不同成熟度的 heatmap**。
- **Top-4 + Other 排序序列**（`usage-projection.mjs:2-6`，`modelSeries`）：固定 4 个具名系列 + 1 个"Other"聚合，membership 在整个观测窗口内不变（`usage-details.md:11`原文"keeping membership fixed"），消费方渲染成堆叠柱状图（`usage-view.mjs:65-70`）与图例（legend 本身也是可点按钮，触发以模型为过滤条件的 drilldown）。
- **request measurement 列表**（`telemetry-view.mjs:18-33`）：纯 `<dl>`，无图形化；`compact` 模式只取最后一条（用于 connection-card 弹层），非 compact 取全部历史（用于 Inspector）。
- **run/thread 投影**（`thread-projection.mjs:6-100+`）：把 event 流压平成**单一线性消息序列**（user/assistant/tool/question/error 交替），没有第二种"按 turn 分组"或"按 run 分组"的并行视图——与 Part C claim 1（LangSmith messages/turns/details 多投影）形成直接对照，见 §6。
- **stat tile**：见 §1 首行，三个数字是同一份 `work-summary` 的三个既有集合总数，不做二次聚合、不互相除（`presentation-primitives.d.ts:84-86` 明文禁止）。

**Q3. 代码中已经明确"拒绝投影"的位置（因为事实未被测量）**

| 位置 | 原文引用 |
|---|---|
| `app/web/telemetry-view.mjs:25` | `['Decode TPS','Unavailable · no token deltas']` |
| `app/web/telemetry-view.mjs:25-26` | `Request context estimate`，`~${tokens} tokens · serialized text ÷ 4`（标注为 heuristic，非精确值） |
| `app/web/telemetry-view.mjs:32` | `'Host timings include transport and adapter work; they are not provider TTFT. Context is a heuristic, not remaining capacity. Cache counts are separate; no cache ratio or billing is inferred.'` |
| `app/web/home-view.mjs:92-95`（注释，非用户可见字符串，但决定了用户可见结果） | "WK-94 · the Heatmap `Backend pending` row is gone: an implementation state is not production Home copy, and the day-by-day count has no data source to appear for" —— 说明此前确实有一行"Backend pending"的拒绝态，现已因端点落地而移除 |
| `app/web/presentation-adapters.mjs:24` | `MISSING_RUN_LABEL = "No run recorded"`（不写成"Completed"或任何暗示已发生的状态词） |
| `app/web/presentation-adapters.mjs:22` | `MISSING_LABEL = "Not available"` |
| `app/web/runtime-view.mjs:2491-2492` | `"The next-run context is not loaded."` |
| `app/web/runtime-view.mjs:2483-2486`（注释） | "There is no maximum in the contract, so no percentage-of-limit, free space or quota line is drawn" |
| `app/web/surface-modules.mjs:56-57`（注释） | "No nested card, no progress bar, no percentage." |
| `app/web/home-view.mjs:355-356`（注释） | "No nested card, no progress bar, no percentage." |
| `app/web/attention-view.mjs:68` | `'This view reads the recorded item. Opening it does not acknowledge or resolve it.'` |
| `app/web/usage-view.mjs:63` | `'Dotted outline means incomplete accounting; zero is retained zero, not historical inactivity.'` |
| `app/docs/work-metrics.md:18` | "A zero bucket means zero retained recorded runs, never proof of no historical activity...must not color these zeros as verified historical inactivity." |

**Q4. 四条负规则今日是否已有违例，或已有明文合规声明？**

| 负规则 | 违例检查 | 结论 |
|---|---|---|
| numeric ≠ slider | 全仓 `<input type=range>`/滑块 零命中（Q1） | **无违例**；因为从未出现过数值输入控件本身（连 NumberField 也没有），这条规则今日"无从违反也无从遵守"，是空集而非合规证据 |
| running ≠ progress | tool-card 状态词只有 `Working`/`Waiting for you`/`Stopping`/…（`app.mjs:2621-2634`），无百分比；`renderContextBar` 明文拒绝画 percentage-of-limit（`runtime-view.mjs:2483-2486`）；railCard/home workCard 两处注释明文"no progress bar, no percentage"（`surface-modules.mjs:56`、`home-view.mjs:355`） | **无违例，且有三处明文合规声明**（见 Q3 引用） |
| complex ≠ graph | 全仓 `graph`/`node-link`/`d3.` 零命中；无拓扑类 owner 对象存在 | **不适用**（没有复杂拓扑对象可供违反此规则，不是"遵守"，是题目在本产品尚未成立） |
| high-risk ≠ confirm dialog | 全仓 `window.confirm(`/`confirm(` 零命中；唯二两个 `<dialog>` 是 usage 明细弹层与 model-picker，均非破坏性操作确认；Approval 两钮卡（`app.mjs:5507-5560`）与 Attention 内嵌授权（`attention-agent-view.mjs:105-112`）都是**原位卡内命名按钮**（"Deny this {noun}"/"Approve this {noun}"），不是弹出式通用确认框，且 atlas 明文"无 Always allow" | **无违例**；但注意"新建 project/session"对话框（`app.mjs:5891`）本身是 `<dialog>`，只是它承载的是**创建**而非高风险治理动作，不构成对这条规则的测试样本 |

**Q5. adapter 与 view 之间的实际接缝**

`presentation-adapters.mjs` 只被三个文件 import：`app.mjs`（`toHomeActivity`/`toHomeAttention`/`toHomeAttentionDetail`，`app.mjs:20`）、`home-view.mjs`（含以上三者外加 `toStatTiles`/`toWorkCards`/`toPendingRows`/`toInspectionRows`，`home-view.mjs:17-25`）、`attention-view.mjs`。**以下视图完全绕开 adapter 层，自行内联读取/校验 DTO 字段**：`usage-view.mjs`（直接读 `data.tokens.*`/`data.buckets`，自带 `validUsageDetails` 校验于 `usage-projection.mjs:13-22`）、`telemetry-view.mjs`（直接读 `event.data.*`，自带 `validMeasurement`）、`runtime-view.mjs`（直接读 runtime snapshot/policy/context 字段）、`inspector.mjs`（`renderRun` 直接读 `run.status`/`run.sessionId` 等，见 `inspector.mjs:47-50`）、`workspace-view.mjs`/`materials-view.mjs`（直接读 workspace tree 响应）、`attention-agent-view.mjs`/`model-picker.mjs`/`settings-view.mjs`（各自直接读各自端点响应）。**更关键的一点**：`presentation-primitives.d.ts` 声明的 `toRunSummary`/`toFileList`/`toWorkspaceList`/`toHeatmap` 四个 adapter 签名，在 `presentation-adapters.mjs` 里**一个都未实现**（该文件实际 `export` 清单为 `toStatTiles`/`toWorkCards`/`toPendingRows`/`toInspectionRows`/`toHomeActivity`/`attentionLabels`/`toHomeAttention`/`toHomeAttentionDetail`——后四者反过来又不在 `.d.ts` 里）。也就是说 **contract 文件与实现文件已经出现双向缺口**：.d.ts 里冻结的四个签名没人实现，实现里新增的四个函数没人补进 .d.ts。这直接影响本轮"三条规则只在 adapter 处生效"的判断——对 RunSummary/FileList/Workspace 这三类对象，"时间原样传递/缺失显式 null/adapter 纯函数"这三条规则目前只是**inspector.mjs 等 view 自己遵守的编码习惯**，没有一个独立、可单测的纯函数模块守着，也没有类型层强制。

## §4 · Part B 16 项样本对现实核验

| # | 样本 | 判定 | 依据 |
|---|---|---|---|
| 01 | Model picker + effort | **exists today** | `app/web/model-picker.mjs:1-74`；`<dialog>`+两个 native `<select>`；effort 选项来自 `selected.supportedEfforts`（owner capability list，`request-telemetry.md:3`） |
| 02 | Context meter | **exists today，但不是"meter"** | `renderContextBar`（`runtime-view.mjs:2487-2549`）是一条按 kind 分桶的比例条（`role=img`），**明文拒绝**画成"percentage-of-limit / free space / quota"（注释 2483-2486）；无固定上限，故不构成 W3C `<meter>` 语义要求的"已知范围内的量"。Telemetry 侧的"context estimate"（`telemetry-view.mjs:26`）只是一行 `<dl>` 文字，非任何图形。**两处都不是 meter**，而是 distribution/plain-value |
| 03 | Live generation metric（t/s + TTFT + sparkline） | **owner fact missing**——`decodeTokensPerSecond`/`providerTtftMs` 在协议里被冻结为 `null`（`request-telemetry.md:9`原文"decodeTokensPerSecond and providerTtftMs remain null because the current SDK provides no provider token clock or timestamped token counts"），前端相应显式渲染"Decode TPS · Unavailable · no token deltas"（`telemetry-view.mjs:25`）。无 sparkline，无任何逐 token 时间序列可画 | 需要新增一个提供 per-token 时间戳的 provider/SDK 能力，本仓当前无此契约 |
| 04 | Composer tools | **owner fact exists but no surface（部分）** | composer 本身只有 textarea + Send/Cancel（`app.mjs:3234-3299`），唯一延伸入口是 connection-card 弹层（模型/权限/measurements，`app.mjs:5103-5140`）；没有工具开关列表、没有附件/插件 toggle 面板 |
| 05 | Reference token field | **owner fact missing / 尚无 UI** | atlas 明记"`/` `@` 同一 trigger、attachment 待契约"；`attach_relation`（Attention entity picker 候选）在 `app/web/`、`app/docs/`、`engineering/design/attention-agent-2026-09-10/` 内**零命中**，说明尚未落地，非本轮漏检 |
| 06 | Numeric inspector | **owner fact missing** | 全仓无可编辑数值输入（Q1）；atlas 把 NumberField 列在 Value 类"候选（待 BE-31 number）"一行 |
| 07 | Threshold inspector | **owner fact missing** | 同上，`threshold（BE-31 number）`是 Governed Action 类候选，未见任何后端 schema 落地迹象（`grep threshold` 命中的都是无关的滚动阈值/对比度阈值变量名，非产品级阈值控件） |
| 08 | Time range | **exists today** | Usage 对话框的 period `<select>`（7/30/84/366 天，`usage-view.mjs:33-34`）与 Home Activity 卡的 28d/84d 按钮（`home-view.mjs:184-189`）；均为硬编码离散值，非连续 range 输入 |
| 09 | Tool run（running → receipt） | **exists today** | tool-card `<details>`（`app.mjs:2602-2660`），状态词枚举 pending→running→completed/failed/cancelled/unknown（atlas tool-card 行"已对齐"） |
| 10 | Plan + queue | **no domain object today** | `async-tasks.md:103`原文"The first slice does not install a UI, automatic follow-ups..."；`app/web/*.mjs` 无 queue/plan 渲染（Q1 附带检查零命中） |
| 11 | Approval gate | **exists today** | `app.mjs:5507-5560`；两钮闭集，原位卡非弹窗，无 Always allow（atlas 明文） |
| 12 | Approval policy | **exists today（但可能与报告设想的对象不同）** | `runtime-view.mjs:2066-2170` 的 Developer Runtime 工具权限 rule 表（action/resource/effect，CAS 分层）已经是一个可运行的 Rule builder；但 atlas WK-129 表把"policy editor"列在 Selection 候选（"Attention grant → CC-P"）、"Rule builder"列在 Structure 候选（"待 PolicyRule canonical 文本"），暗示这两者尚未建成——与代码现状不一致，留待 §6 裁定这是"同一件事、atlas 未更新"还是"两件不同的政策对象" |
| 13 | Evidence toolbar | **owner fact exists but no surface** | tool call/artifact 本身是已记录的 owner 对象（run.artifacts、tool 事件），但 bubble/contextual toolbar 渲染零命中（Q1），atlas 列为候选"→ CC-I" |
| 14 | Run timeline | **owner fact exists but no surface（严格意义的时间轴）** | 事件本身带精确 startedAt/endedAt/UTC 时间戳，但 `thread-projection.mjs` 只产出**线性消息序列**（先后顺序，非带刻度的时间轴可视化）；atlas process-trace 行"collapsed → timeline → raw 三层"标注"待后端 BE-32"，即 timeline 层尚未建 |
| 15 | Usage visualization | **exists today** | `usage-view.mjs` 全文件；heatmap + 堆叠图 + 明细表三种投影共存于一个 dialog 内 |
| 16 | Temporal artifact（waveform + transport） | **no domain object today** | 全仓 `audio`/`video`/`waveform`/`<audio`/`<video` 零命中；Courtwork 产品内无任何音视频类 artifact，此样本对本产品目前无锚点 |

## §5 · Part C 外部核验

| # | 待核验主张 | URL | 核验结果 |
|---|---|---|---|
| 1 | LangSmith 是否命名 messages/turns/details 等多个 thread 投影，并支持从消息 drill-down 到 run | `docs.smith.langchain.com/observability/how_to_guides/trace_a_thread`（308 → `docs.langchain.com/langsmith`） | **未核验**——原 URL 永久重定向到产品总览页；总览页只提到"View traces"、"Filter, export, share, and compare traces via the UI or API"，未见"messages/turns/details"这类具体投影措辞，也未描述"从消息 drill-down 到 run"；页面本身指向更深的 `/langsmith/filter-traces-in-application` 等子页，本轮未追（超出 8 次预算的边界，判断价值有限） |
| 2 | Braintrust 是否把 spans/thread/timeline 命名为三种不同视图 | `braintrust.dev/docs/guides/logging` | **不成立（有核验，非未核验）**——页面原文只提到"Browse traces and individual spans, in the UI or from the terminal"和"Each row represents a complete trace with its root span"；未出现"thread"或"timeline"作为并列视图名词。原报告这条主张**在此页面未被证实** |
| 3 | Base UI NumberField 实际文档的输入方式与 commit 语义 | `base-ui.com/react/components/number-field` | **核验成立**——文档明确列出 typing（`input-change`）、键盘 stepping（`keyboard`，方向键/Home/End）、增减按钮（`increment-press`/`decrement-press`）、滚轮（`allowWheelScrub`，`wheel`）、scrub 拖拽区（`ScrubArea` 组件，`scrub`）五种模态；commit 分两阶段：`onValueChange`（交互中即时触发）与 `onValueCommitted`（blur 或指针释放时才提交） |
| 4 | Tailscale 视觉策略编辑器与规范策略文件、GitOps 下"文件是唯一真相源"的关系 | `tailscale.com/kb/1429/policy-editor`（无关）、`tailscale.com/kb/1493/gitops`（文档索引页，非正文） | **未核验**——两次都未取到含该主张的正文段落：`1429/policy-editor` 页只泛泛提到策略"stored in the tailnet policy file"，未比较可视化编辑器与文件的权责；`1493/gitops` 只返回一个话题索引列表，未含 GitOps 正文。需要更精确的 URL（本轮未追加第三次尝试，超出预算边界） |
| 5 | wavesurfer.js 的 package/plugin 结构 | `github.com/katspaugh/wavesurfer.js`（原定 `wavesurfer.xyz` 403 后改用官方 GitHub repo） | **核验成立**——核心库自述"an interactive waveform rendering and audio playback library"，只管波形渲染与音频播放；Regions/Timeline/Minimap/Envelope/Record/Spectrogram/Hover 均为"official plugins that add various extra features"，即官方文档原文明确区分 core 与 optional plugins |
| 6 | assistant-ui 是否文档化"model + reasoning effort"合并控件 | `assistant-ui.com/docs/copilots/model-context`（404 效果的内容不含此控件）、`assistant-ui.com/docs/guides/ModelPicker`（404 Not Found） | **未核验，倾向不存在**——两次尝试，第一次拿到的页面只讲 system instructions/tools/context providers，不含模型或 effort 选择器；第二次直接 404。没有找到一个 assistant-ui 官方页面文档化"模型选择器 + reasoning effort"的合并控件；不能排除该功能存在于本轮未定位到的另一个 URL |

（第 1/4/6 项因重定向或 404 各多试了一次，累计 10 次 WebFetch，超出建议上限 2 次；均属于同一条主张的第二次定位尝试，非新增主张，如需严格卡在 8 次以内，第 1/4/6 项应直接判"未核验"而不追加重试。）

## §6 · 留给裁定者的开放问题

1. **HeatmapInput/HeatmapProps 契约已经名不副实**：`presentation-primitives.d.ts:114-143` 把 heatmap 标注为"gap: needs GET /work-activity...产品内当前只允许渲染 Planned · Backend pending 文字行"，但 `work-metrics.md`（2026-09-09）确认该端点已上线，`home-view.mjs` 也已经用一套**不在 .d.ts 里**的 `toHomeActivity` 实现了真正的 heatmap（WK-94 注释也确认"Backend pending"行已移除）。.d.ts 该不该更新、要不要把 `toHomeActivity`/`toHomeAttention`/`toHomeAttentionDetail` 补进契约，这是一个纯粹的文档维护决定，但在此之前任何"Projection Grammar 的 heatmap 语义以 .d.ts 为准"的假设都是错的——需要先确认这次盘点该以代码还是以 .d.ts 为准。
2. **`toRunSummary`/`toFileList`/`toWorkspaceList`/`toHeatmap` 四个签名从未被实现**（§3 Q5），RunSummary/FileList/Workspace 三类对象的"时间/缺失/纯函数"三规则目前无强制层。是否要求 CC 系列或 FE-05 之后补齐这三个 adapter，还是接受 inspector.mjs 等 view 直接读 DTO 是既定架构（即 presentation-adapters.mjs 的范围本来就只覆盖 Home），这是一个需要明确的边界裁定，Projection Grammar 若要统一"owner fact → 投影"的路径，必须先知道这条路径今天在哪些对象上根本不存在。
3. **runtime-view.mjs 的 Policy 规则表（`runtime-view.mjs:2066-2170`）是否等同 atlas WK-129 表里的候选"policy editor"/"Rule builder"**：atlas 把这两者都标"候选"（Selection 行"Attention grant → CC-P"、Structure 行"待 PolicyRule canonical 文本"），暗示未建成；但代码里已经有一个可运行、有 CAS 分层收紧规则的工具权限规则编辑器。是同一件事只是 atlas 没更新，还是这是另一个不同的 policy 对象（工具权限 CAS vs. Attention grant policy），需要裁定者判断——这直接决定 Governed Action 类今天到底有没有一个"policy editor/rule builder"的今日实现。
4. **atlas 所称"Attention typed actions（resolve 须 reason；snooze / set_waiting 须 next_action ≠ none）"在 `app/web/` 内未找到对应 UI**：`attention-view.mjs` 明文自称只读（"Opening it does not acknowledge or resolve it."），`attention-agent-view.mjs` 只有 allow/deny 两钮。`human_actions` 字符串只出现在 `app/core/attention.py`（后端）而非任何 `app/web/*.mjs`。这条"今日有"是否指后端 Core 能力尚未有前端界面，还是本轮检索有遗漏，需要确认——如果确实无前端界面，Governed Action 类"今日有"这一格的准确性需要重新核对。
5. **Home heatmap 与 Usage heatmap 该不该统一成一种 heatmap 语义**：两者分级算法（绝对阈值 vs 相对分位数）、键盘模型（星期网格 vs 线性索引）、drill-down 深度（仅本地旁白 vs 真实查询+开 run）都不同。Projection Grammar 如果要把"heatmap"定成一个类，需要先确认这种分歧是"两个未完成度不同的同构件"还是"故意两种不同产品意图"（Home 是概览、Usage 是可核算明细）——这决定了新 grammar 该不该强制统一算法，还是允许同一 projection class 下存在合法的语义分支。
6. **"numeric ≠ slider"与"complex ≠ graph"两条负规则在本产品目前是空集，不是已验证的原则**：因为从未出现过数值输入控件或复杂拓扑对象，这两条规则"从未被违反"这件事本身不构成对规则正确性的证据。是否需要在 WK 条目里区分"已验证合规"（running≠progress、high-risk≠confirm dialog 都有正面证据）与"尚无验证机会"（这两条），避免后续误读为四条规则已同等程度地被代码检验过。
7. **Part B specimen 12 与 02 都触及"owner fact exists but no surface" vs "exists today"的边界**：例如 context bar 是否算 specimen 02 的"exists today"还是该记"存在一个不同形态的等价物，原样本本身不存在"？本轮判定为"exists today，但不是 meter"，这个措辞本身是否要收进 WK 条目，还是要留一个专门的第五种 disposition（"存在但形态不同"），需要裁定者决定 schema 是否要扩展。

---

合计：Part A 投影行 14 条、控件行 18 条（含去重说明覆盖的 43+58 处 button 与 16 处 select 等）；Q1 结论零命中 6 类控件（range/number/date/progress/meter/slider 等）；Q4 四条负规则：2 条有正面合规证据（running≠progress、high-risk≠confirm dialog）、1 条空集无法判断（numeric≠slider）、1 条不适用（complex≠graph）；Part B 16 项样本：6 项 exists today（01/08/09/11/12/15）、3 项 owner fact exists but no surface（04/13/14）、4 项 owner fact missing（03/05/06/07）、2 项 no domain object today（10/16）、02 单独判"exists today 但非 meter 形态"；Part C 6 项主张：2 项核验成立（3 Base UI、5 wavesurfer）、1 项经核验证明不成立（2 Braintrust 未命名三视图）、3 项未核验（1 LangSmith、4 Tailscale、6 assistant-ui）。
