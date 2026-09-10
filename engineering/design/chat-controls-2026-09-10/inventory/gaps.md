# EX-IC2 分片 A · 缺口账与可见问题观察

固定 SHA `1992e90`。缺口分类与 `ledger.md` 的 disposition 一一对应；本文件
只展开"为什么"与"映射到哪"，不重复整表。产品改造与设计取舍属于分片 B/C，
本文件只陈述现象与证据，不给方案。

## 一、缺后端/宿主合同（无既有 owner 工单，均记「待裁」）

参考图（`inputs/file-delivery-reference.png`）中的候选动作族，在当前产品里
逐项核实为**没有对应后端/宿主能力**，不是前端遗漏接线：

| 候选动作 | 现状 | 待裁原因 |
|---|---|---|
| 朗读（read aloud） | 无 TTS 后端、无播放控件 | 无既有 owner；home-composition/agent-interface 合同均未提及语音输出 |
| 赞 / 踩（thumbs up/down） | 无反馈存储 API | 无既有 owner；`ui-state-vocabulary.md` 未定义 feedback 对象 |
| Assistant 消息级"更多"菜单 | `object.more` 语义已在 interaction-vocabulary.md 登记为"不在当前 24-name allowlist"，未接线 | 该文档已明示待裁，非本单新发现，仅引用 |
| 重试 / 继续 / 再生成 / 分享（同一条回复的四种不同后果） | 均无。产品现有"重试"只出现在**读取失败**处（materials 列表、workspace 树），语义是"重新 GET"，不是"重新生成这条回复" | 无既有 owner；README 必备反例明确要求这四者不能折叠成一个 retry，故逐项分列，逐项均缺 |
| 文件下载（download） | Work surface 只读预览，无导出/下载 API | 无既有 owner |
| 默认应用打开 / 应用选择（open with / choose app） | 无宿主 file-open-with 合同 | 无既有 owner；桌面宿主集成不在当前 runtime 范围 |
| Show in Folder | 同上，无宿主 reveal 合同 | 无既有 owner |
| 文件版本/历史列表（per-file） | 只有 per-Run 的 `artifacts[]` 与单条 "Recorded version" 读取，没有"这个文件所有历史版本"的列表/对比 UI | 无既有 owner；`artifactHistory.save()`（service.mjs）已在写入时保存历史字节，**后端已具备数据**，前端未提供浏览入口——这一条更接近"前端未接已有后端"而非"完全无后端"，故在此特别注明：数据存在，UI 不存在 |
| Chat 会话重命名 / 删除 / 固定（pin） | 侧栏会话行只有 click-to-select；对照 Attention 侧的 `at.recent.rename`（`attention-agent-view.mjs:44-53`）**确实存在**同类能力 | 无既有 owner；这是 README 覆盖表明确列出的"新建/打开/切换/关闭/重命名"里唯一缺失重命名的一项，且产品内已有可参照的同类实现（Attention），待裁 |

## 二、前端未接已有后端（已存在可调用的后端/函数，只是没有对应按钮）

1. **Run 详情读取失败无重试按钮**（`app.mjs:4039-4044`，`readRunDetails()`
   失败分支）：只输出 `<p class="inline-error">`，没有绑定任何按钮去重新调
   用 `refreshRunDetails(id)`（该函数本身已存在且被其它地方正常调用）。对照
   `materials-view.mjs:74-79` 的 Retry 按钮与 `surface-modules.mjs:39-46`
   的 `retryAction`——同一产品里"读取失败"这件事，三处只有两处接了 Retry。
2. **工具调用详情读取失败无重试**（`app.mjs:2402-2434` `appendToolDetails`）：
   失败结果只用 `<pre class="tool-error">` 展示文字，同样没有 Retry。
3. **Attention 的 Allow/Deny/Send answer 未复用 `setRequestLabel`**
   （`attention-agent-view.mjs:173-185`）：主 Chat 的同类按钮
   （`app.mjs:5573-5578`）在提交中会把可见文字换成 "Sending…" 且按
   `decision` 区分是哪个按钮在途（`setRequestLabel`/`permissionPresentation`
   均已存在、已在同一代码库其它地方工作），Attention 侧的三个按钮只是简单
   `button.disabled = state.busy`，可见文字永远不变，用户看不出提交是否已
   发出、发出的是哪一个决定。这不是"Attention 缺一个新后端"——`controller.
   answer()` 本身就是把同一份 `POST /runs/:id/questions/:id` 再包一层，是
   **前端两条路径没有共用同一个已完成的按钮解剖**。

## 三、可纯前端整改的可见问题观察（只陈述现象+证据，不给设计方案）

以下均为静态源码 + 动态截图交叉确认的现象，供分片 B/C 参考；本单不提出
修法。

1. **两套并存的"文件列表"实现**：`materials-view.mjs`（composer 的 Chat
   files 弹窗，扁平列表，点击=唯一动作，无 a11y 名与可见文字分离）与
   `workspace-view.mjs::renderWorkspaceFilesView`（Work surface 的
   Workspace 面板，按目录分组，短标签/完整 a11y 名分离、多一个 "Add
   material" 入口）。两者共享同一个 CSS 类名 `.workspace-file-row`，但是
   两个不同渲染函数、两套不同动作集合，对同一份底层数据（session workspace
   树）呈现方式与可发现的动作数量不一致。证据：`captures/composer-
   materials-dialog-open-with-files.png` 对照源码两处定义。
2. **`nav-filter-input` 的过滤状态文案与实际行为不一致**：`filter-status`
   显示"Filtering loaded names only."，但 `renderProjectList()`
   （`app.mjs` 约 1759-1929 行）的过滤逻辑只把**项目**级别的匹配作为
   显示/隐藏依据（项目名或其任一会话名命中即整项目可见），一旦项目可见，
   项目内**全部**会话都会渲染（`limit = filter ? sessions.length : 8`
   只是取消了 8 条截断，不是按会话名逐条过滤）——键入一个只匹配某一会话的
   关键词，同项目内其余 21 个不相关的会话名依然全部列出。这是本轮 debug
   实测中意外发现的（详见下方"实测方法论"小节），已用真实浏览器交互确认，
   非静态推测。证据：`captures/sidebar-nav-filter-active-clear-visible.png`
   （截图本身不足以证明，行为需要在浏览器里键入验证，见方法论小节）。
3. **`icon()` 24 个白名单中 `external-link` 当前无任何调用方**
   （`grep -rn "external-link" app/web/*.mjs` 只命中 `ui-controls.mjs` 自
   身的白名单声明行）。是否该移除、保留待用，还是遗漏了一个应该用它的
   外链场景（如 markdown 外链、Run history 的"打开"等），属于设计判断，
   本单只记录"已注册未使用"这一事实。
4. **同一 `square-pen` glyph 被三种不同语义复用**：`session.new`（项目内
   "New chat"）、`message.user.edit`（"Edit as new message"）、
   `toolGlyph("ws_write")`（工具卡的写入类型图标）。三者含义分别是"新建
   会话"“把旧消息变成新草稿”“Agent 写了一个文件”，均使用同一几何。
   interaction-vocabulary.md 已警告"Sparkle 不能同时代表 Agent/Tool/
   Expert/Model/Reasoning"，这里是另一个 glyph 的类似复用模式，供分片 B
   评估是否构成需要新语义的缺口。
5. **`.user-message-actions` 内的 `<time>` 元素使用原生 `title` 属性**
   （`user-message.mjs:76-78`），而同一产品绝大多数二级提示走
   `data-tooltip` + `installTooltips()` 单例适配器（IC-3 明确"不能只依赖
   浏览器 `title` 属性"）。这里是唯一发现的例外：一个可见时间戳同时有
   `aria-label` 与原生 `title`，两套 tooltip 机制在同一个文件里并存。
6. **`composer-model` 按钮的 `aria-label` 形如
   "Connection · Local test · Local test"**（本轮真实截图/DOM 读取确认，
   `captures/composer-connection-popover-open.png` 对应态），provider/
   model 名称在标签里重复了一次，疑似字符串拼接时把可见文字又拼了一遍到
   `aria-label` 里；未读源码定位具体拼接点（超出本单静态盘点深度，记录
   现象供分片核对）。
7. **`nav-filter-input` 的 Clear 按钮（`#clear-nav-filter-button`）在
   `index.html` 中无 `aria-label`**（`index.html:129-134`），依赖视觉符号
   传达"清除"，未在源码中找到运行时补充设置该属性的代码（未能在
   `app.mjs` 中 grep 到对 `clear-nav-filter-button` 的 `setAttribute
   aria-label`/`setAction` 调用）；若确实缺失，与 IC-2"icon-only control
   必须有明确 accessible name"冲突，标记待核验（见下）。
8. **`surface-back-button` / `surface-document-close` 未见显式
   `aria-label` 赋值**：静态 grep `app.mjs` 未找到对这两个 id 的
   `aria-label`/`setAction` 绑定；可能通过别的机制（如 `action()` 生成时
   的 label 参数）设置，需要在真实 extension-bound 会话下动态复测才能
   确认，本单归入"待核验"而非直接判定为缺口（避免误报）。

## 四、实测方法论说明（本单发现并修正的测试误报）

捕获脚本 `capture.mjs` 在开发过程中先后产生了几处**测试脚本自身的误报**，
均已定位根因、修正并重新实测，如实记录如下，避免"截图看起来失败=产品有
问题"的错误结论：

1. **`selectSessionByName` 早期版本存在竞态**：项目展开后
   `loadSessionsForProject()` 是异步网络请求，脚本若不轮询而只用固定
   `sleep()`，在网络抖动时会拿到 0 个 `.session-button`。已改为轮询直到
   目标会话按钮出现（见 `capture.mjs` 内注释）。
2. **CDP 合成的 `Enter` 键不触发原生 `<button>` 的默认激活动作**：脚本用
   `Input.dispatchKeyEvent` 发送 `Enter` 试图"键盘打开" connection popover
   时始终不生效；这是本测试用的原始 CDP 分发方式的限制（未正确设置
   `windowsVirtualKeyCode`），**不是产品的键盘可访问性缺陷**——用真实
   `click()` 打开后，Escape 关闭 popover 与焦点归位均正确工作（见下条）。
   `capture-report.json` 的 `keyboard` 数组如实保留了这条"Enter 未生效"的
   探测结果，但标注为测试方式限制，不计入产品缺口。
3. **客户端事件轮询只在"已知有活跃 Run"时才持续**（`pollEvents`,
   `app.mjs` 约 1050 行：`if (... state.runs.some(isActiveRun))
   schedulePolling(...); else stopPolling();`）。脚本若在**选中一个还没有
   任何 Run 的空会话**之后，再用裸 `fetch` 直接创建 Run（绕过 composer 的
   发送流程），客户端永远不会重新拉取事件，因为它在选中会话的那一刻已经
   判定"无活跃 Run"并停止了轮询。这不是产品缺陷（真实用户总是通过
   composer 发送，发送动作本身会重启轮询），而是本测试脚本用裸 API 播种
   数据时必须处理的时序问题。
4. **未查明根因、如实保留的脚本缺陷：会话选择在脚本运行的中段区间反复
   静默失效**。六次独立完整重跑均观察到同一模式：脚本运行到大约第
   10–30 步（从进入第一个会话，到 `select-perm-pending`/
   `select-question-pending` 前后）之间，`selectSessionByName()`——同一份
   代码，在脚本最开始的侧栏交互和脚本后段（约第 30 步以后，`streaming`/
   `edit-message-dialog`/`chat-overview`/两个 `tooltip-*` 步骤）均稳定
   成功——会静默"选不中"目标会话：不报错、`.session-button` 点击事件正常
   触发，但界面停留在 Home，之后的多次尝试（包括另开一次真实点击、
   `Page.navigate` 整页重载、延长首屏等待到 1.5–2.5 秒）均未能在该区间内
   稳定复现成功。已排除的假设：项目未展开（sidebar 截图显示"IC2 Inventory
   Fixture"项目本身是展开的）、`nav-filter` 未清空、单纯网络竞态（重试
   轮询/整页重载两种完全不同的强制刷新手段都在**同一时间窗口**失败，在
   窗口之外又都成功）。保留这个未解之谜而不是掩盖它：这更像是本机（同一
   台机器上还跑着多个其它 Chrome/Playwright 进程，见下条）资源争用在特定
   时间窗口造成的渲染/事件调度延迟，而不是产品代码的缺陷——因为同一操作
   在脚本更早、更晚的时间点均可靠成功，且一次独立的、短小的诊断脚本
   （不跑完整 40 步序列，只做"打开项目→输入过滤→点会话→读 DOM"四步）
   每次都成功。**结论**：本轮未能对多个消息流/工具卡/问题卡/权限卡状态
   取得可信的动态像素证据，这些状态的验收依据退回到源码静态确认（ledger
   已逐行标注 `path:line`），下方"捕获缺口"表逐项列出。
5. **Attention 助手区的多步交互在本机长时间无人值守运行时出现过 CDP
   响应变慢/单步超时**（`attention-open` 及其后几步整体超时，六次重跑
   均在该区域丢失全部或部分捕获）。已加入每步 20 秒硬超时与错误捕获，
   避免单步卡死拖垮整个脚本；未能在预算内解决，逐项在下方"捕获缺口"
   列出，不假装已捕获。
6. **两处截图被上一步未正确关闭的 Files 弹窗遮挡了一角**
   （`composer-sending-and-assistant-streaming-inflight.png`、
   `chat-overview-context-popover-open.png`）：被遮挡部分之外的正文内容
   经目视核对是真实、正确的（分别是流式回复中的 Run 状态区与 "This chat"
   概览浮层），只是画面里多了一个不该出现的弹窗残留，脚本在这两步之前
   遗漏了关闭 `materials-dialog` 的调用。

## 五、以真实键盘/Escape/焦点实测确认的正面结论（非缺口，纠正早期误报）

- Hover-only 显露的 `.user-message-actions`（Copy/Edit）在真实 `Tab` 到
  该消息内部任意子元素后，`focus-within` 确实让它们进入可视且可 Tab 到
  的顺序（连续 Tab：`.user-message-source summary` → Copy message → Edit
  as new message），键盘用户可达，不是仅鼠标可用。
- `#model-settings-button` 打开的 connection popover：真实点击打开后，
  焦点自动移入弹层内的 "Close connection card" 按钮；按 `Escape` 后弹层
  关闭**且焦点正确返回**到 `#model-settings-button`（不是掉到
  `document.body`）。
- `#refresh-button` 上的 tooltip：键盘 `Tab` 聚焦即打开（`focus-visible`
  路径，非仅 `pointerover`），`Escape` 可关闭。

## 六、捕获缺口（未能动态捕获的状态，及原因）

| 状态 | 原因 |
|---|---|
| 用户/Assistant 消息、tool-card、activity-group、question-card、permission-card（全部状态：pending/resolved/expanded/collapsed）、materials 弹窗（空/有文件）、Work surface 的 file/run 面板、chat 1440/dark/390 baseline | 方法论第 4 点所述、六次重跑均复现的未解时序缺陷：脚本运行到这一区间（大致第 10–30 步）时 `selectSessionByName()` 静默选不中目标会话，画面停在 Home。这些状态的验收依据是 ledger 中逐行给出的源码 `path:line`；对应的 PNG 文件名仍保留在 `captures/`，但内容是 Home，不是该状态的真实像素证据（ledger 开头的"证据可靠性更正"逐一列出了受影响的文件名） |
| `message.assistant.codeblock.copy`（代码块内联 Copy）动态截图 | 本轮合成 fixture 未构造出含 fenced code block 的 assistant 回复（`/fixture` 系列指令只返回纯文本/工具调用），源码路径（`ui-controls.mjs:210-221`）已确认存在且与整条 Copy 使用不同 `data-focus-key`，但未动态验证渲染像素 |
| `connection-status`（断线重连提示）动态截图 | 需要真实网络中断/丢包注入，合成环境未构造该反例；`role="status"` 与文案已从源码确认 |
| `workspace.file.row`（Work surface Workspace 面板文件行）独立动态截图 | 同上时序缺陷区间；即使该区间恢复正常，本轮截图清单也未单列这一条（时间预算取舍），源码路径已在 ledger 登记 |
| 已删除/不可用文件的错误态 | 未构造"文件已被删除后再打开"的合成反例；产品对此路径的具体文案未经动态确认，ledger 标记「待核验」而非下结论 |
| `run.history.*`、`overlay.projectDialog`、`overlay.sessionDialog` 等表单类 dialog 的独立截图 | 与已截取的 `edit-message-dialog`/`materials-dialog` 同构（原生 `<dialog>`、`method=dialog` 或等效关闭路径），未逐一截图；源码路径与状态在 ledger 中已登记 |
| `surface-back-button`/`surface-document-close` 的真实 `aria-label` 值 | 需要一个绑定了 extension 的真实会话（本轮合成数据未构造 extension-bound 场景）才能进入这条渲染路径；标记「待核验」 |
| Attention 助手区全部动态截图（`at.dialog.*`、`at.history.*`、`at.composer.*`、`at.message.*`、`at.tool.*`、`at.permission.*`、`at.question.*`） | 方法论第 5 点：`attention-open` 及其后全部步骤在六次重跑中反复整体超时（20 秒/步硬超时触发），怀疑是本机资源争用而非产品问题（见方法论第 4/5 点），但未在预算内证实；ledger §8 的全部行只有源码静态确认，无动态像素证据 |

## 七、命中区实测

本轮受限于时间预算，**未**对全部 icon-only 控件逐一执行
`getBoundingClientRect()`；已确认的通用事实（源码层面）：

- `ui-controls.mjs:56` 的 `icon()` 固定 `width=height=size`（默认 20），
  这是 **glyph 的 live area**，与按钮本身的 **hit area**（由 CSS class
  `quiet-button`/`primary-button`/`icon-only` 等决定的内边距+最小尺寸）
  是两个不同的盒模型，源码里从未把 `viewBox`/`size` 当作命中区（符合
  IC-1"图形槽 16/20，命中区域沿既有 32/44 控件档映射…不以 SVG 的 viewBox
  当命中区域"的既定约束）。
- 具体到某一枚图标在当前样式表下的**实测像素**（例如 `#refresh-button`
  的 glyph 20×20 vs. 按钮实际可点击矩形），本单未执行
  `getBoundingClientRect()` 采样，留待分片 B（icon/control specimen）在
  对照槽位里做光学与命中区双记录时一并完成——这是分片 B 的既定退出证据
  项（见 pr-plan.md），本单不重复占坑。
