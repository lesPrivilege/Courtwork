# 调研报告：Office/WPS 与邮件生态嵌入能力、Frontier Work 产品动向（2026-07-10）

状态：调研完成，供 Stage 1「WPS/Word 插件入口」「IM/工作流通道网关」工单拍板前参考。不改动任何契约，仅提出预留建议。

依据背景：docs/04 Stage 1（插件入口、通道无关的 IM/工作流网关）、docs/23（起草画布/单向编译/docx 修订预览三分）、docs/02 §3.2（海外 Word 插件形态盘点）、packages/output/SPEC.md（自有 OOXML 直接著录器、WPS 兼容硬验收）。

---

## 0. 结论先行

1. **Word/WPS 均不能在插件运行时里"干净地程序化插入一条带作者信息的修订"**——这不是我们工程能力不足，是两端宿主 API 本身的结构性缺陷/空白（详见 §1.2、§2.2）。我们自己在 `packages/output` 走的"纯 TypeScript 直接著录 OOXML、不经 diff、批注与指令同一遍构造"的路线，**是唯一在两端都可靠的路线**——这一判断被微软自己刚发布的 Word Legal Agent 的架构选择独立印证（§4）。
2. **插件推荐形态：task pane 薄客户端，只做"触发 + 展示"，不做"执行"**。修订运算永远留在 output 层；插件不出现自己拼 OOXML 或自己调用 Track Changes API 的路径。
3. **邮件的定位是摄取管线的一种源适配器，不是通道网关的一个通道**——它服务的是"合同随邮件到达"和"修订稿回发"这两个管线端点，不是 IM 式的"确认节点推送"交互面。
4. **Frontier 动向**：OpenAI 已把 ChatGPT 拆成 Work/Code 两种模式共享一个桌面壳（验证了我们"轻对话与场景工作台同一 core"的判断）；微软 Copilot Legal Agent 已直接对标我们的核心场景（合同 redline），但美国 Frontier 预览、走 M365 云租户，短期与国内 WPS/私有化市场重叠度低，长期是最需要盯防的对手。

---

## 1. Word 插件能力现状（Office.js / Office Add-ins）

### 1.1 Task pane 能做什么

Task pane 本质是一个运行在 Word/Excel/PowerPoint/Outlook 侧栏里的 webview，能做浏览器能做的几乎一切；通过 `Office.context.document` 读写当前选区，支持 text/HTML/表格数据/OOXML 四种数据形态。2026-03-02 起，Marketplace 上架的插件不再支持 `autoopen`（自动随文档打开任务窗格），但集中部署（centralized deployment）与本地 sideload 仍支持——这意味着**面向企业客户的私有化分发路径不受此限**，只是"打开文档自动弹插件"这个体验在公开市场渠道被收紧了。

### 1.2 修订（tracked changes）与批注的可编程程度——关键结论

Word JavaScript API 有 `Word.ChangeTrackingMode` 枚举、`Word.TrackedChange`/`Word.TrackedChangeCollection` 类，可以**读取**已有修订（作者、日期、类型）、**批量接受/拒绝**。但"程序化插入一条新修订"这条路径存在一个自 2018 年就开着、至今（官方最后回复"已知问题，无 ETA"）未关闭的缺陷：

> 通过 `setSelectedDataAsync` 等 API 写入内容时，即便选区文字本身没有实质变化，Word 也会把整段替换范围标记为"删除+插入"的粗粒度修订，而不是精确到实际改动字符的干净 diff；`Document.TrackRevisions` 开关本身也长期不可读写。（GitHub `OfficeDev/office-js` issue #329，2018 年开至今）

这直接决定了：**插件端调用 Office.js 现场生成的修订，达不到我们 `RevisionInstructionSet` → 直接著录 OOXML 这套管线的精度**（我们的方案是"批注与指令同一遍构造，不做事后 diff 定位"，见 packages/output/SPEC.md 验收记录）。也就是说，"插件端能否复用我们的修订指令集"这个问题的答案是：**语义可以复用（锚点/操作类型/批注结构原样搬进插件 UI 做预览），但执行不能搬进插件运行时**——真正写盘那一步必须仍由 output 层的著录器完成。

### 1.3 Content Control

`Word.ContentControl` 目前只支持富文本、纯文本、复选框、下拉、组合框五种类型，且部分 API 标注为"预览态，可能变更，不建议生产使用"。可用于"定义项/交叉引用导航"这类轻量条款标记面板（Definely 模式），但作为我们修订指令集的主锚点机制不成熟——我们现有的"文本锚 + 模糊定位三级判定"路线不依赖 Content Control，无需改动。

### 1.4 与本地桌面 app 的通信

Office Add-in 运行在 webview 沙箱里，**没有官方的本地原生消息通道**（不同于浏览器扩展的 Native Messaging）。业界实践是用 WebSocket 连 `127.0.0.1`，微软官方在论坛里承认"目前浏览器不禁止，但未来可能会限制"——即**这条路径没有合规背书，只是"能用"，不是"被支持"**。合规边界结论：不应把"插件与桌面 app 的 localhost 握手"设计成硬依赖；默认路径应该是插件直接调用 Courtwork 云端/core 的 HTTP API（与是否有本地桌面 app 在跑无关），localhost 桥接只作为"桌面 app 恰好在跑"时的可选加速通道，且需要显式的一次性握手确认（不是静默直连）。

### 1.5 Copilot 扩展点开放到什么程度

微软 M365 Copilot 的第三方扩展分两条路：**声明式 agent**（instructions + knowledge + actions，orchestrator/模型仍是微软的，走安全合规基线）与**自定义引擎 agent**（自带 orchestrator 和模型）。2026 年新增：declarative agent 支持 MCP、REST、message extension，甚至可以复用 OpenAI Apps SDK 的 widget 规范渲染交互组件——这是一个值得记录的跨厂商收敛信号（Copilot 生态开始兼容 OpenAI 的 widget 协议）。**Agent Store** 是微软官方的第三方 agent 分发市场，第三方 agent 需过"企业级验证流程"上架，属于"被收编式开放"（你按微软的能力清单接入，不是把自己的 agent 核心整体塞进去跑）。

微软自己的 **Copilot Legal Agent for Word** 目前处于 **Frontier Public Preview，仅面向美国法律从业者**，尚非 GA，也不覆盖中国区/WPS。短期看它和 Courtwork 的重叠度低，但它是需要长期盯防的"原生对手"——详见 §4。

---

## 2. WPS 开放平台现状（国内主战场，重点）

WPS 侧实际是**两条不同的技术路线**，报告前必须先分清楚，否则会在选型阶段踩坑：

### 2.1 WPS 加载项（wpsjs / `window.wps` 对象）——对标 Office.js 的"文档内插件"

通过 npm 全局装 `wpsjs` 工具包开发，能力挂在 `window.wps` 对象下，本质是"VBA 的现代替代者"：低门槛、高兼容性、强本土化，路线选择是"务实、接地气、高覆盖"而非"高门槛高上限的 Copilot 式 agent 网络"（国内技术社区对两条路线的定性对比，见来源清单）。这是我们 Stage 1"文档内轻活"入口对应的路线。

### 2.2 WPS WebOffice 开放平台（solution.wps.cn）——面向 ISV 的"文档组件嵌入 SDK"

这是另一条产品线：把 WPS 的文档预览/编辑能力当作一个 iframe 组件嵌进第三方系统（更接近"OEM 组件"而非"文档内插件"）。它暴露的 `Revisions` API 值得单独记录：

- `Json()`：读取全部修订为 JSON
- `AcceptAll()` / `RejectAll()`：批量接受/拒绝
- `SetRevisionMarkVisibilityByUserInfo()`：按用户过滤修订标记显示
- `RevisionsFilter`：切换"终稿/原稿"视图
- `ShowRevisionsFrame`：控制修订框显示

**这套 API 目前公开文档里只看到"查询/展示/批量接受拒绝"的消费端方法，没有看到"插入一条新的、带作者信息的修订"的生产端方法**——与 Office.js 的结构性空白（§1.2）是同一类问题，进一步佐证了"修订生成必须留在我们自己的 output 层，不能指望任何宿主 API"这个判断。

### 2.3 与 Office.js 的差异、一套插件双端跑的现实性

两套 API 的对象模型、命名空间、事件模型均不同，国内技术社区（含对 DeepSeek 的横向比较帖）明确指出"WPS 和 MS Office 技术路线不兼容，需要做选型抉择"，不存在"一套代码两端跑"的捷径。现实做法是：**UI 层与业务调用逻辑（如何组装场景请求、如何渲染修订预览）可以共享一套薄客户端代码，但"调用宿主文档 API"这一层必须为 Word/WPS 分别实现**（两套适配器，共享同一套上层协议消费逻辑）。

### 2.4 政企版生态准入

WPS 365 应用市场对 ISV 有考察评估流程决定是否允许上架；金山办公在政企/信创客户上投入明显（报道口径"新增政企客户 1700+ 家"），但**具体的审核周期、资质要求、费用结构未见公开量化说明**，需要在实际接入前另走商务对接确认——这条列为 TODO，不阻塞 Stage 1 技术预研。

### 2.5 金山协作/365 的开放接口

WPS 365 整合了智能文档/表格/协作/会议/企业邮箱，WPS AI 企业版的 "Copilot Pro" 可调用 WPS 365 API 与企业自有 API；WPS AI"灵犀"是金山自己的办公 agent 中枢（自研 Qingqiu Agent 在 SpreadsheetBench 榜单排名第二），并已推出"Agent 开发套件"支持自定义技能/工作流、支持接入第三方模型（如 DeepSeek）。这意味着 WPS 也在往"文档内 agent 化"演进，是我们需要关注的同赛道动向，但目前未见其对法律垂类场景的专门布局。

---

## 3. 邮件生态

### 3.1 Outlook add-ins 能力与 Legora 先例

最新 Mailbox 需求集（1.16）提供事件驱动激活、compose/read API、Smart Alerts、Graph 集成，能力持续在加（如批量解密受保护邮件、单次最多读 1000 个收件人、会话内数据存储上限提到 262 万字符）。**Legora 的 Outlook 插件先例值得直接借鉴**：它做的不是"后台自动摄取"，而是"总结邮件线程 + 一键把邮件/附件存进 Legora"——一个需要用户主动点击的归档按钮，附带明确的权限声明（只能读写当前邮件，不能读整个邮箱）。这与我们"留人确认是产品纪律"的口径完全一致：**邮件插件应该是"一键归档到指定案件文件夹"的按钮，不是静默监听收件箱**。

### 3.2 国内企业邮箱开放接口现状

腾讯企业邮、阿里企业邮箱、网易企业邮箱三家都有开放平台，但接口方向几乎清一色是**IT 管理员主导的企业集成**（通讯录同步、单点登录、邮件收发、日历），授权模式是管理员级 App ID/Secret（阿里邮箱走 OAuth2 + IP 白名单）甚至需要**发邮件人工申请开通**（网易企业邮箱），不是 Outlook/Gmail 那种"用户级 OAuth 委托 + webhook 实时推送"的现代 Add-in 模式。三家邮箱均支持标准 IMAP/SMTP 协议收发。

### 3.3 邮件作为摄取源 vs 交付通道；IMAP vs Graph API 的取舍

- **作为摄取源**（合同随邮件到达→自动入案件文件夹）：Microsoft Graph 的 delta query/webhook 对 M365/Exchange 客户是最优路径（增量同步、无需轮询）；但国内客户的邮箱生态（腾讯/阿里/网易企业邮）API 能力弱且需管理员逐一审批，更现实的兜底协议是**标准 IMAP 拉取**（三家域邮箱都支持），作为协议无关的默认实现，Graph API 仅对确认使用 M365/Exchange 的客户作为增强路径可选启用。
- **作为交付通道**（修订稿回发）：直接走 SMTP/邮箱厂商发信 API 均可，技术门槛低，不是本次调研的难点。

这个判断呼应了仓库既有的"通道无关适配器"设计哲学（docs/04 对 IM 侧的处理）：邮件摄取协议层也应该抽象为一个协议无关的接口，具体实现按客户邮箱类型选择 IMAP 或 Graph，而不是绑死某一家。

---

## 4. Frontier Work 产品动向

### 4.1 OpenAI：Work 与 Code 板块分野（2026-07-09 最新）

OpenAI 于 2026-07-09 发布 GPT-5.6 家族（Sol/Luna/Terra 三档）与 **ChatGPT Work**——一个"给定一个目标结果、跨用户已连接的 App 收集信息、长时间独立推进复杂任务"的 agent，可接 Slack/Teams/Google Drive/SharePoint/邮件/日历/CRM。ChatGPT 桌面应用把 **ChatGPT Work（业务导向、抽象掉技术细节）与 ChatGPT Codex（保留技术细节）** 整合进同一个壳，共享插件生态——这是公开层面对"Work 与 Code 两个板块"分野的实锤呈现，背后是 OpenAI 内部把消费级 ChatGPT、Codex、开发者 API 团队合并、由 Brockman 统管产品战略的组织调整。**这直接印证了我们自己"轻对话模式（chatbot 合并）与案件工作台同一 core、同一客户端，差异仅在 system prompt 与 memory 策略"的判断路径是行业共识方向，不是我们的孤例判断。**

### 4.2 Microsoft：Copilot in Word 的 agent 化进展

Copilot Agent Mode 已于 2026-04-22 在 Word/Excel/PowerPoint GA，从"建议引擎"变成"生产工作流层"。更关键的是 **Copilot Legal Agent for Word**（Frontier Public Preview，仅美国法律从业者）：它的架构公开描述是——把 Word 文档解析成"保留格式/列表/表格/修订"的结构化表示，在这个结构化表示上跑一个**确定性的解析层**生成修订，而不是让大模型直接生成 OOXML。**这与我们 packages/output 的架构选择（纯 TS 直接著录、公共前缀/后缀裁剪代替完整 diff、批注与指令同一遍构造、拒绝置信度不足的模糊定位）在方法论上高度一致**，是我们架构判断的独立第三方印证，而非巧合。它目前 US-only、走 M365 云租户，与国内 WPS/私有化市场短期不重叠，但长期是最直接的同场景对手，需要持续盯防其是否下放到国际版或调整数据合规姿态。

### 4.3 Google：Workspace Gemini

Gemini Enterprise agents 通过 Workspace add-ons、Google 托管的 MCP servers、Workspace API 接入 Docs/Sheets/Slides/Calendar/Drive；2025-12 上线的 Workspace Studio 是无代码自动化编排层。目前未见针对法律垂类的专门布局，威胁级别低于 Copilot Legal Agent。

### 4.4 竞争者还是可嵌入的宿主？

三家平台对第三方都是"部分开放的宿主"：微软有 Agent Store（第三方 agent 需过企业级验证上架）+ declarative agent 的 MCP/REST/message extension 扩展点；Google 有 Workspace add-ons + MCP server 集成点。但这些扩展点的开放程度是"你按平台的能力清单（actions/knowledge/MCP）做浅层接入"，不是"把我们的 agent 核心整体塞进去自主跑"——对 Courtwork 而言，**这些平台的定位是竞争者优先、宿主关系次要**，"被集成"（docs/04 Stage 4 命题）是远期可以评估的边缘增长通道（例如未来把 Courtwork 包装成一个 MCP server 被 Copilot/Gemini 发现），不是 Stage 1 该投入的方向。

---

## 5. 对 Stage 1 的建议

### 5.1 插件推荐形态

**Task pane 薄客户端消费 core 协议，不做独立轻功能自己拼修订**。理由已在结论与 §1.2/§2.2 说明：两端宿主 API 都没有"程序化插入一条干净的、带作者的修订"的生产端能力，我们自己的 output 层直接著录 OOXML 是更可靠的执行引擎。插件的职责边界：

- 展示场景按钮、把当前文档/选区/上下文传给桌面 app 或云端 core；
- 接收 core/output 层已经算好的结果（修订指令应用后的 docx，或修订预览的结构化数据）；
- 引导用户"在 Word/WPS 里重新打开定稿"，或（若宿主 API 支持整份文件写回）用 `getFileAsync`/等价整份替换方式回填——**不在插件运行时里现场调用 Track Changes API 生成修订**。

### 5.2 修订指令集在插件端的复用可行性结论

**语义可复用、执行不可搬**：`RevisionInstructionSet` 的锚点/操作类型/批注结构可以原样搬进插件 UI 做"待确认预览"渲染（呼应 docs/23 的 docx 修订预览交互），但真正把指令应用成修订这一步，无论 Word 端还是 WPS 端，都必须仍由 packages/output 的著录器完成，插件只是这条既有管线的新触发入口和交付通道，不是新的执行引擎。这条结论不需要现在改 `RevisionInstructionSet` 契约本身。

### 5.3 邮件接入的预留接口形状

邮件是**摄取管线的一种源适配器**，不是通道网关的通道。落地建议（仅接口预留，不要求现在实现）：

- 在摄取触发方式上，与"文件夹拖入"、"扫描件上传"并列增加"邮件源"这第三种触发形态；
- 协议层抽象为协议无关接口，具体实现优先走标准 IMAP（覆盖国内三大企业邮箱的兜底方案），对确认使用 M365/Exchange 的客户可选启用 Graph API 的 delta/webhook 增强；
- Outlook/WPS 邮箱侧如需要插件，也只做"一键归档到指定案件文件夹"这一个按钮（Legora 模式），不做静默自动摄取，守住留人确认纪律。

### 5.4 WPS 与 Word 的开发顺序建议

先做 Word（Office.js）版验证"薄客户端 + 云端/桌面 output 执行"这套架构本身是否可行——Word 生态成熟、参考实现多（Spellbook/DraftWise/Legora/Definely 均可对照）、调试成本更低；验证通过后再移植到 WPS 加载项（`wpsjs`/`window.wps`），业务逻辑层（场景组装、结果渲染）可复用，只需重新实现"调用宿主文档 API"这一层适配器。同时明确：WPS WebOffice 开放平台（solution.wps.cn）是另一条"组件嵌入"路线，服务的是"桌面 app 内嵌文档预览"这类需求（对应 docs/23 的 docx 修订预览面），与"文档内插件"入口是两个不同的技术选型问题，不要混为一谈。

### 5.5 需要现在在 core/output 契约上预留的点

**不需要现在改动 `RevisionInstructionSet` 或 output 层的输入输出契约**——插件只是新增触发入口，不改变管线的输入输出形状。唯一建议现在做的最小预留：在描述"文档从哪里来/由谁触发"的字段设计上（如未来的会话/任务来源枚举），预先把 `word-addin` / `wps-addin` / `email-inbound` 作为可扩展的取值纳入设计考虑，避免将来接插件/邮件触发时对既有类型做破坏性变更——这是把 docs/04"通道无关适配器"的对称设计原则，也应用到"摄取触发源"这一侧,而非实现任何具体逻辑。

---

## 6. 来源清单

### Word / Office.js / Copilot
- https://learn.microsoft.com/en-us/office/dev/add-ins/develop/support-for-task-pane-and-content-add-ins
- https://learn.microsoft.com/en-us/office/dev/add-ins/design/task-pane-add-ins
- https://learn.microsoft.com/en-us/office/dev/add-ins/develop/automatically-open-a-task-pane-with-a-document
- https://learn.microsoft.com/en-us/javascript/api/word/word.changetrackingmode?view=word-js-preview
- https://learn.microsoft.com/en-us/javascript/api/word/word.trackedchange?view=word-js-preview
- https://learn.microsoft.com/en-us/javascript/api/word/word.trackedchangecollection?view=word-js-preview
- https://github.com/OfficeDev/office-js/issues/329（Track Changes API 长期缺陷，2018 年开至今无 ETA）
- https://learn.microsoft.com/en-us/javascript/api/word/word.contentcontrol?view=word-js-preview
- https://github.com/OfficeDev/office-js/issues/2276
- https://learn.microsoft.com/en-us/answers/questions/234390/officejs-add-in-communicate-with-external-local-na
- https://textslashplain.com/2020/09/04/web-to-app-communication-the-native-messaging-api/
- https://news.ycombinator.com/item?id=23171176
- https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agents-overview
- https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/overview-declarative-agent
- https://devblogs.microsoft.com/microsoft365dev/build-declarative-agents-for-microsoft-365-copilot-with-mcp/
- https://learn.microsoft.com/en-us/microsoft-365/copilot/copilot-agent-store
- https://devblogs.microsoft.com/microsoft365dev/introducing-the-agent-store-build-publish-and-discover-agents-in-microsoft-365-copilot/
- https://chrismenardtraining.com/post/how-to-use-the-copilot-legal-agent-to-redline-documents-in-word/
- https://msftnewsnow.com/microsoft-365-copilot-legal-agent-word/
- https://techcommunity.microsoft.com/blog/microsoft365copilotblog/word-legal-agent-in-frontier/4516218
- https://windowsforum.com/threads/microsoft-copilot-agent-mode-now-ga-in-word-excel-and-powerpoint.415032/
- https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins?view=o365-worldwide

### Outlook / Legora
- https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/apis
- https://devblogs.microsoft.com/microsoft365dev/mailbox-requirement-set-1-16-now-available-for-outlook-add-ins/
- https://legora.com/product/outlook-add-in
- https://legora.com/blog/introducing-legora-outlook-add-in-and-email-the-assistant
- https://marketplace.microsoft.com/en-us/product/saas/wa200009653?tab=overview

### WPS 开放平台
- http://open.wps.cn/previous/docs/client/js-api/introduce
- https://open.wps.cn/documents/app-integration-dev/wps365/client/wpsoffice/wps-integration-mode/wps-addin-development/generate-the-first-wps-addin
- https://open.wps.cn/
- https://solution.wps.cn/docs/client/api/summary.html
- https://solution.wps.cn/docs/client/api/Word/Revisions.html
- https://solution.wps.cn/docs/client/api/Word/RevisionsFilter.html
- https://open.wps.cn/documents/app-integration-dev/guide/isv-app/summary.html
- https://365.wps.cn/home
- https://365.wps.cn/government
- https://bbs.wps.cn/topic/82373（DeepSeek 对 Office.js 与 WPS JS 的比较）
- https://www.36kr.com/p/3399797612644740（WPS 灵犀）
- https://zhuanlan.zhihu.com/p/2043733503863411829

### 国内邮箱开放接口
- http://service.rtxmail.net/api/
- https://exmail.qq.com/qy_mng_logic/client
- https://qiye.163.com/help/l-24.html
- https://qiye.163.com/help/36a33a.html
- https://mailhelp.aliyun.com/openapi/index.html
- https://help.aliyun.com/zh/document_detail/2852847.html

### 邮件协议取舍 / 摄取
- https://cli.nylas.com/guides/imap-vs-gmail-api-vs-graph-api
- https://www.unipile.com/microsoft-graph-api-email-integration-guide/
- https://learn.microsoft.com/en-us/answers/questions/5325120/benefits-of-ms-graph-integration-vs-imap-and-smtp
- https://www.checkbox.ai/software/email-intake
- https://www.mycase.com/blog/ai/automated-legal-intake/

### Frontier 动向
- https://9to5mac.com/2026/07/09/openai-announcing-the-next-chapter-for-chatgpt-today-watch-here/
- https://openai.com/index/introducing-workspace-agents-in-chatgpt/
- https://www.bloomberg.com/news/articles/2026-07-09/openai-unveils-chatgpt-work-agent-to-field-tasks-for-hours
- https://siliconangle.com/2026/07/09/openai-debuts-chatgpt-work-agentic-tool-automating-business-workflows/
- https://www.digitalapplied.com/blog/openai-merges-chatgpt-codex-teams-brockman-2026-analysis
- https://codelabs.developers.google.com/ge-gws-agents
- https://developers.google.com/workspace/add-ons
- https://edu.google.com/intl/ALL_us/workspace-for-education/add-ons/google-workspace-with-gemini/

### 其他（docx 渲染/IM 网关参考）
- https://www.superdoc.dev/
- https://github.com/superdoc-dev/superdoc
- https://zhuanlan.zhihu.com/p/2013706717012186762（飞书/钉钉/企业微信开放平台横向对比）
