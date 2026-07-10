# 调研报告：Agent 产品输入区（composer）按钮族形态惯例（2026-07-10）

状态：调研完成，供中栏 composer 按钮族整备出规格输入。不改动 `docs/32-设计语言包/` 已拍板条款，仅在其分界内给出按钮族的形态/位置/状态集/反馈时长与聚合裁定；涉及需架构拍板的点单列于文末。

## 〇、问题定义与既有约束复述

中栏现状：文本框 + 场景按钮（按钮是主入口，聊天是兜底，`docs/30-W9设计brief与handoff规范.md` §二结构清单）。需要整备的按钮族六项：

- **上传文件**（真实，路由 W3.0 阅读视图管线）
- **案件文件夹选择**（真实）
- **发送**（真实）
- **拍照/扫描**（MVP 预留=禁用态，`docs/41` 缺口 #4：扫描件走 OCR，MVP 内声明"需要 OCR，即将支持"+ copy-paste 兜底）
- **语音**（MVP 预留=禁用态）
- **拖放与粘贴文件**（真实，非独立按钮，是输入框整体行为）

三条硬约束贯穿全文，不重新论证：

1. `principles.md §5` 零技术概念暴露——按钮文案与 tooltip 不出现"上传/OCR/token"等技术黑话之外的实现细节，用办案语言。
2. `principles.md §3` 动效八禁 + `docs/19` 反馈阶梯——composer 内一切反馈落在已拍板的时长表内（按压 70ms、hover 120ms、长任务 2–5s 微光/呼吸、>5s 事件流进度、状态本体 0ms 硬切 + 可选 150ms 确认光效衰减）。
3. `docs/19` 空路由判据——结构位永不隐藏用空态；**功能级入口频繁翻转用禁用态（灰按钮+tooltip），不用物理隐藏**。拍照/语音属于此类：MVP 阶段"不可用→可用"会随版本迭代翻转，必须常驻占位，不能等做好了再插入一个新图标（用户会找不到）。

---

## 一、composer 惯例扫描

### 1.1 ChatGPT / Claude / Gemini：统一的"平铺极简 + `+`聚合菜单"骨架

三家 2026 现状高度收敛到同一套骨架（来源见文末，AI UX Playground 的三份实测截图拆解是本次调研最一手的材料）：

- **默认态"空杆"**：composer 首屏不出现任何工具词汇，只有输入框；`+` 在左，模型选择/语音在右。三家共同的产品策略是"降低第一次输入的心理门槛"，工具能力全部折叠进 `+`。
- **`+` 聚合菜单**：附件（Add files/photos）、截图、项目、技能/连接器、联网开关、深度研究、图片生成等 6–10 项全部塞进同一个下拉/弹层，Claude 用快捷键 `⌘U` 奖励高频用户直达"附件"这一项而不必每次展开菜单。
- **子菜单不收起父菜单（flyout）**：技能/更多模型这类二级选项用 flyout 展开，父级 `+` 菜单不关闭——这是"探索一层不丢失上文"的通用手法。
- **附件呈现**：三家都是**卡片内联缩略图 + 移除(×)**，贴在输入框上方、发送前可见；三家都没有做成"文件名+类型+大小"的正式 chip 列表，多文件场景下扫描性偏弱（AI UX Playground 三份 teardown 都把这一点列为"push back"项）。
- **语音**：三家都是文本框右侧独立麦克风图标，**听写(dictation)与"完整语音对话"两个入口视觉相同，只有点开才能分辨**——三份 teardown 都指出这是待改进项，不是最佳实践，Courtwork 不必模仿这一处模糊。

这套"平铺骨架 + `+`聚合"是因为这三款产品的 composer 功能项本身多（模型选择、技能、连接器、深度研究、图片生成……一二十项），聚合是**应对功能数量膨胀的防拥挤手段**，不是"聚合天然更好"的美学结论。

### 1.2 豆包 / Kimi（中文产品参照）

豆包网页版支持 PDF/Word/Excel/PPT 全格式上传解析，输入框基于富文本编辑框架（slate）实现，但公开可查的设计细节较少，未找到权威的图标形态拆解。Kimi 网页版沿用相同的 `+` 聚合模式：点击 `+` 可选择"上传文件/图片、常用语、专业数据库、技能、联网"，上传支持点击选择或拖拽进窗口两种路径，单次最多 50 个文件、每个 100MB。Kimi 一处已知交互缺陷值得引以为戒：**中文输入法在组合候选词状态下按 Enter 会被错误当作"发送"触发**，而不是让输入法先完成候选词确认——这是没有正确处理 `compositionstart/compositionend` 事件的典型 bug，Courtwork 发送快捷键实现时必须避开。

### 1.3 企业工具参照（Slack）

Slack composer 的骨架更贴近 Courtwork 的定位（非探索性聊天、是工作场景里的确定性小控件）："自测量文本框 + 一个随选区浮现的格式化工具条 + 一条 keydown 规则 + 发送态渲染"；圆角容器聚焦态出现 focus ring；**发送按钮在输入框为空时自我禁用**；输入框下方常驻一行灰字提示"Enter to send · Shift+Enter for new line"。这一骨架同时是 GitHub 评论框、Linear 评论框、Gmail 回复框共用的底层结构——**说明"平铺文本框 + 极少数常驻图标 + 底部 KBD 提示行"是工作类工具（而非探索类 AI 聊天）的收敛形态，与 Courtwork 律师工作台的定位更贴近**，而不是 ChatGPT/Claude 那套面向海量功能扩张的 `+` 聚合。

法律科技参照（Harvey / Legora）未查到公开的 composer 像素级拆解，但产品页面透露的信息是"以卷宗/matter 为容器承接文档上传，而非以单条消息为容器"——这与 Courtwork"案件文件夹级协作"的定位一致，进一步支持"文件上传要和案件文件夹显式关联"这一设计方向（见第二节）。

---

## 二、附件与上下文的呈现

### 2.1 上传后的 chip 形态：三家大厂都不是最佳实践

ChatGPT/Claude/Gemini 三家目前对附件的呈现都停留在"单图内联缩略图 + 移除"，三份独立 teardown 都指出**多文件场景下这套呈现"harder to scan than filename chips"**——即业界公认的更优形态是**文件名 + 类型 + 大小的正式 chip 列表**，只是头部产品尚未做到。Courtwork 律师上传的多是 docx/PDF 类文书而非图片，缩略图价值低，**应直接采用文件名 chip 而非缩略图**，chip 内容规格见第五节。

### 2.2 上传进度与失败重试

行业收敛的做法（来源见文末 SaaS 上传 UX 系列文章、ServiceNow Horizon 设计系统）：

- 展示**真实传输进度**而非无限转圈（呼应 Courtwork 已拍板"禁止 spinner 裸奔"）；多文件场景下**每个文件独立展示自己的状态**，不用一条总进度条糊住个体失败。
- 失败文件**可单独重试**，不必重新选择、重新上传整批已成功的文件。
- 失败原因与解决路径同屏给出：文件过大（标出上限）、类型不支持（标出允许类型）、数量超限（标出上限）——这条直接对应 `principles.md §5` 零技术概念：文案要给出"怎么办"而不是抛错误码。

### 2.3 "进案件 vs 仅本条"的语义区分（重点）

这是 Courtwork 相对通用 AI 聊天产品的**结构性差异**，三家大厂没有对照物（它们没有"案件文件夹"这一层容器），需要类比其最接近的产品形态——**ChatGPT Projects 的作用域切换**与**Notion AI 的知识来源 scope 切换**：

- ChatGPT Projects 的文件与记忆**限定在该 Project 内部**，不会外溢到 Project 外的其他会话；用户能清楚感知"这份文件只在这个工作区内生效"。
- Notion AI 用 scope 切换器让用户显式选择"从这个对话回答 / 从整个工作区知识回答"，作用域是一个**可见、可点击的控件**，不是隐式行为。

映射到 Courtwork：文件上传后默认落在"**仅本条消息**"作用域（不擅自写入卷宗），chip 上带一个**可点击的从属状态标签**——这不是可有可无的装饰，而是 `principles.md §4` 留人确认门禁纪律的自然延伸：**"文件从对话态进入卷宗态"是一次有留痕意义、且会被后续检索/溯源引用的动作，不应该悄悄发生**。具体方案见第五节 chip 规格。这与 `principles.md §8`"编译为 Word 冻结仪式"是同一套语言——凡是"从临时态进入持久态"的转换，都需要显式点击 + 说明后果，且不提供反向操作（要撤回只能走"从卷宗移除"，另走一次确认，不是切回原态）。

---

## 三、预留功能的禁用态最佳实践

### 3.1 灰按钮 + tooltip 文案模式

搜索结果（Smart Interface Design Patterns、NN/g 系）收敛的做法：**展示禁用态按钮本体 + hover/focus 时给出 tooltip，说明"为什么不可用"与"当前能做什么"**，而不是让按钮静默失效。可访问性上有一个具体技术点需要在实现层注意：原生 `disabled` 属性的元素不可 focus，键盘用户和屏幕阅读器都拿不到 tooltip 内容；推荐做法是用 `aria-disabled` 代替 `disabled`，保留可 focus 性，让 tooltip 在键盘 focus 时也能触发。这是一条纯前端可访问性建议，不涉及视觉规格，但值得写进实现备注。

### 3.2 语音/拍照在桌面端的取舍：做禁用态，不做隐藏

调研关于"移动端心智"功能的资料（语音 UX 综述类文章）指出：语音输入的核心价值命题是"屏幕空间受限、双手不便"——这两条前提在 Courtwork 的目标场景（律师在桌面端、办公室、打字环境）里都不成立，语音在这里不是刚需，是锦上添花。拍照同理，律师上传的文书多数来自扫描件/已有电子文档，"直接拍照"更贴近移动场景而非桌面办公场景。

**但对照 `docs/41` 缺口三态声明与 `docs/19` 空路由判据，结论是"做禁用态，不做隐藏"，理由有二**：

1. `docs/41` 已把"扫描件 OCR"列为明确缺口（#4），路由声明是"禁用态：功能入口存在但声明即将支持 + 当前替代路径，不隐藏"——这是产品侧已拍板的路由方式，composer 层的拍照/语音图标是这条路由声明在 UI 上的具体落点，不是本报告新提议。
2. `docs/19` 判据：这两项是"依赖前置条件/未来版本会翻转"的功能级入口，翻转频率不算低（OCR、语音识别都在路线图上），若现在隐藏、未来某个版本再插入图标，用户会经历一次"composer 突然多了一个按钮"的位置感丢失——不如现在就占好位置、置灰、tooltip 说明替代路径，版本上线时只是"从灰变亮"这一次 0ms 硬切的状态翻转，不新增布局位移（呼应"禁止入口物理消失后重现"，动效八禁第 8 条）。

一个可以明确排除的方向是：**不要把拍照/语音塞进任何"更多"折叠菜单里"藏起来"**——那等同于变相隐藏，且与 Courtwork 用户画像（35–55 岁律师，非重度数字原生代）冲突，折叠菜单本身就有一次额外的发现成本。

---

## 四、键盘与快捷键

- **Enter 发送 / Shift+Enter 换行**：跨平台跨产品的收敛惯例（历史上 Enter/Return 在不同系统上语义不同，现代实现统一用 Shift 作为"反转默认行为"的修饰键），ChatGPT/Claude/Gemini/Kimi/Slack 无一例外。**必须正确处理输入法组合态**：中文/日文输入法在候选词确认阶段按下的 Enter 不能触发发送，需监听 `compositionstart`/`compositionend`，只在非组合状态下把 Enter 解释为发送——Kimi 网页版这一处的已知交互缺陷是反面案例，Courtwork 实现时应作为验收用例之一。
- **⌘V（Ctrl+V）粘贴文件**：已是 ChatGPT/Claude 等主流产品的既定行为，剪贴板含图片/文件时直接转为 chip，不需要用户先存到本地再走"上传文件"按钮；纯文本粘贴走常规文本插入，两者互不冲突（按剪贴板内容类型分流）。
- **发送快捷键提示的 KBD 呈现**：`principles.md §7` 已拍板"高频动作旁常驻快捷键提示"，composer 场景直接复用 Slack 底部灰字提示的形态——输入框下方常驻一行 mono 小字"`Enter` 发送 · `Shift+Enter` 换行"，Slack 的实测证明这一行提示"让输入框感觉更真实"（"feel real"），且与 Courtwork 已拍板的 KBD 呈现规格（`typography-density.md §五`）是同一套语言，不新增模式。

---

## 五、规格建议

### 5.1 聚合 vs 平铺的裁定：**平铺，不做 `+` 聚合菜单**

理由：

1. ChatGPT/Claude/Gemini 采用 `+` 聚合是为了容纳 6–10+ 项持续膨胀的功能（模型选择、技能、连接器、深度研究……），是**应对功能数量的工程手段**，不是普适的"更优雅"结论——三份 teardown 反复指出聚合菜单本身有"列表变长""权重相同、发现成本不均"的代价。Courtwork composer 的真实功能只有三项（上传、选案件文件夹、发送）+ 两项预留（拍照/语音），功能密度远低于聚合菜单的适用阈值。
2. Slack/GitHub/Linear/Gmail 这类**工作类工具**（而非探索类 AI 聊天）的收敛形态本身就是"平铺文本框 + 极少数常驻图标 + 底部 KBD 提示行"，这与 Courtwork 律师工作台的定位（信任感优先于新奇感，`docs/30` 一）更贴近。
3. `docs/19` 空路由判据要求拍照/语音这类预留功能**常驻占位**（禁用态而非隐藏）——若塞进聚合菜单，等同于变相隐藏，与该判据冲突。
4. 目标用户 35–55 岁律师，`docs/30` 一已明确"信息密度适中偏高、零技术概念暴露"——多一层菜单点击就是多一次发现成本，与"按钮是主入口"（`docs/30 §二`）的产品设计初衷相悖：按钮要能被"看到就懂"，不该需要先点开一个抽象的 `+` 才能发现。

**唯一的例外条款（写入待将来复核）**：若后续场景扩展带来更多 composer 级动作（例如未来的多模型选择、场景内嵌深度检索开关），功能项一旦超过约 5–6 个常驻图标的可视密度上限，应重新评估是否需要为"次要/低频动作"单独开一个聚合入口——但当前 MVP 六项按钮族不构成这个门槛。

### 5.2 按钮族清单

| 按钮 | 真实性 | 位置 | 形态 | 状态集 | 反馈时长（引用 docs/19 阶梯） |
|---|---|---|---|---|---|
| 上传文件 | 真实 | composer 左侧固定图标位 | 线性图标 + 无文字（图标含义靠通用惯例：曲别针/上传箭头二选一，走内部图标规范） | 默认 / hover / 按压 / 上传中 / 成功 / 失败 | 按压 70ms 底色加深（不缩放，操作型按钮惯例）；hover 120ms；上传 2–5s 用边框微光流转（`motion.longTaskGlow` 1800ms，作用于 chip 边框）；>5s 大文件用事件流进度组件（百分比+"正在上传《XX合同》"文案）；成功/失败状态本体 0ms 硬切，叠加 150ms 衰减确认光效 |
| 案件文件夹选择 | 真实 | composer 左侧固定位，图标右侧 | chip 形态，显示当前案件名（mono，截断），点击展开选择列表 | 未选（占位文案"选择案件"）/ 已选（案件名 mono）/ hover / 展开 | hover 120ms；展开/收起 0ms 硬切（无过渡，呼应面板对切纪律）；切换案件后 chip 文案 0ms 硬切更新 |
| 发送 | 真实 | composer 右侧固定位，ink 主按钮 | 实心按钮，无文字或极简图标（惯例是向上箭头/纸飞机，走内部图标规范） | 禁用（空输入）/ 可用 / 按压 / 生成中（转"停止"态） | 按压 70ms 只加深底色，不缩放（数据卡片零位移零缩放的操作按钮版本）；hover 120ms；生成中→完成 0ms 硬切切回可用态 |
| 拍照/扫描 | 预留=禁用态 | composer 左侧固定位，与上传相邻，常驻不隐藏 | 与上传同尺寸线性图标，灰色（`color.line.*` 中性态） | 禁用 + tooltip（唯一状态，不做 hover 变色，禁用态本身即最终态） | tooltip 出现/消失 120ms hover 节奏；按钮本体不参与任何动效，永远置灰 |
| 语音 | 预留=禁用态 | composer 右侧，发送按钮左侧，常驻不隐藏 | 麦克风线性图标，灰色 | 禁用 + tooltip | 同上 |
| 拖放（非独立按钮） | 真实 | composer 整体输入框区域 | 拖入时**输入框描边加粗变色**（1px→2px，`action.primaryBg` 或蓝色态），不做全窗半透明 overlay | 静止 / 拖入高亮 / 释放后转 chip | 高亮出现 0ms（立即可见，不做渐入）；离开/释放后描边 150ms 衰减恢复，呼应"进入 0ms、退出渐隐"的非对称模型 |
| 粘贴文件（⌘V，非独立按钮） | 真实 | 无独立视觉位置，全局输入框内快捷键行为 | 粘贴后直接转 chip，与拖放共用 chip 呈现 | 同上传中/成功/失败 | 同上传按钮 |

拖放选用"输入框高亮"而非"全窗 overlay"的理由：Courtwork 是三栏工作台而非单栏聊天应用，全窗半透明遮罩会临时覆盖左栏案件列表和右栏审阅容器——这两处是 `principles.md §1` 定义的"完整工作台帧"的结构位，不应被任何交互态临时遮盖；用户拖拽文件时也更可能是"拖到案件列表建立新案"或"拖到中栏对话"两种不同意图，全窗 overlay 会抹掉这个意图区分，输入框局部高亮更精确、也更符合"容器有界"的划界原则（1px 描边表达可放置边界，而不是引入一层新的视觉语言）。

### 5.3 附件 chip 规格

- **形态**：文件名 chip，不用缩略图（律师上传的多为 docx/PDF 类文书，缩略图信息密度低于文件名+类型图标）。内容：类型图标（mono 风格线性图标，docx/pdf/图片等区分）+ 文件名（sans，超长中间省略号截断，如"XX合同_2026版…补充协议.docx"）+ 移除按钮(×)。
- **上传中**：chip 边框微光流转（2–5s 档）或转事件流进度（>5s 大文件），文件名旁附百分比或"正在上传…"办案语言文案。
- **失败**：chip 边框转红线态，文件名后附"上传失败，点击重试"内联文字按钮，不单独起一个 toast——失败信息就近展示在 chip 本体上。
- **归属标签（核心新增，对应第二节 2.3）**：chip 右侧附一枚小徽章，默认灰色文案"仅本条"；点击唤起确认层（"存入卷宗后，本文件将出现在《案件名》的卷宗清单中，可被后续对话与场景引用"），确认后徽章 0ms 硬切转绿色态"已存入卷宗"（沿用语义色纪律：绿=已核验/已确认）。**不提供"转回仅本条"的反向操作**——与"编译为 Word 冻结仪式"同一套单向纪律，撤回改走"从卷宗移除"的独立操作入口（在案件文件夹的卷宗清单里，不在 composer chip 上）。

### 5.4 禁用态文案模板（零技术概念话术）

统一模板：**"〔功能〕即将支持 · 当前可通过〔替代路径〕实现"**，直接对应 `docs/41` 缺口三态声明规范的禁用态措辞（"即将支持 + 当前替代路径"），不新造话术：

- 拍照/扫描：**"扫描件识别即将支持 · 当前可直接上传拍摄照片或 PDF"**
- 语音：**"语音输入即将支持 · 当前请直接打字"**

两条都不出现"OCR""ASR""模型""API"等技术词，纯办案/日常语言，符合 `principles.md §5` 硬性纪律。

---

## 六、来源清单

- [Claude composer UX: model picker, skills & attachments — AI UX Playground](https://aiuxplayground.com/teardowns/claude/composer)
- [ChatGPT composer UX: input bar, tools & voice design — AI UX Playground](https://aiuxplayground.com/teardowns/chatgpt/composer)
- [Gemini composer UX: tools, Drive & thinking modes — AI UX Playground](https://aiuxplayground.com/teardowns/gemini/composer)
- [Designing AI chat interfaces: Anatomy, patterns, pitfalls — Setproduct Blog](https://www.setproduct.com/blog/ai-chat-interface-ui-design)
- [ChatGPT — Release Notes — OpenAI Help Center](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)
- [Power users will not love this upcoming ChatGPT UI change — Android Authority](https://www.androidauthority.com/chatgpt-mobile-attachment-ui-update-3631648/)
- [How to Upload Files to Claude: PDFs, CSVs, and Images (2026) — AI Toolbox](https://www.ai-toolbox.co/claude-management-and-productivity/how-to-upload-files-to-claude-2026)
- [Upload & analyze files in Gemini Apps — Gemini Apps Help](https://support.google.com/gemini/answer/14903178)
- [豆包网页版文档解析能力说明（搜索聚合结果，无单一权威来源）](https://www.aigc.cn/web-doubao)
- [仿照豆包实现 Prompt 变量模板输入框 — WindRunnerMax 博客园](https://www.cnblogs.com/WindrunnerMax/p/19104743)
- [Kimi 新手入门指南 — Kimi 帮助中心](https://www.kimi.com/zh-cn/help/new-user-guide/overview)
- [中文输入法组合态下 Enter 误触发送的已知问题 — MoonshotAI/kimi-cli GitHub Issue #1121](https://github.com/MoonshotAI/kimi-cli/issues/1121)
- [I Rebuilt Slack's Message Box With Plain HTML, CSS and JS — Medium](https://dev48v.medium.com/i-rebuilt-slacks-message-box-with-plain-html-css-and-js-6bc89f68d4bc)
- [SaaS File Upload & Drag-and-Drop UX Patterns (2026) — SaaS UI Design](https://www.saasui.design/blog/saas-file-upload-ux-patterns)
- [File upload UI tips for designers — Eleken](https://www.eleken.co/blog-posts/file-upload-ui)
- [Upload manager screen — Horizon Design System, ServiceNow](https://horizon.servicenow.com/native-mobile/screens/upload-manager-screen)
- [Drag-and-Drop UX: Guidelines and Best Practices — Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [Disabled Buttons UX — Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/disabled-buttons/)
- [Inactive GUI Controls: Show, Disable, or Hide? — UX Tigers](https://www.uxtigers.com/post/inactive-buttons)
- [Allow tooltip on "disabled" buttons — adobe/react-spectrum Discussion #9232](https://github.com/adobe/react-spectrum/discussions/9232)
- [Voice User Interface Design: The New Standard for Mobile UX — Resourcifi](https://www.resourcifi.com/voice-user-interface-design-the-new-standard-for-mobile-ux/)
- [Affordance and wayfinding in voice interface design — preston.so](https://preston.so/writing/affordance-and-wayfinding-in-voice-interface-design/)
- [<kbd> HTML keyboard input element — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/kbd)
- [Shift+Enter Is a Secret Shortcut Everyone Should Know — How-To Geek](https://www.howtogeek.com/825393/shift-enter-is-a-secret-shortcut-everyone-should-know/)
- [How to Paste a Screenshot into ChatGPT, Claude & Cursor (2026) — LazyScreenshots](https://www.lazyscreenshots.com/guides/how-to-paste-screenshot-into-chatgpt/)
- [Support pasting images from clipboard into the conversation — github/copilot-cli Issue #2409](https://github.com/github/copilot-cli/issues/2409)
- [Projects in ChatGPT — OpenAI Help Center](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt)
- [Using projects in ChatGPT — OpenAI Academy](https://openai.com/academy/projects/)
- [Everything you can do with Notion AI — Notion Help](https://www.notion.com/help/guides/everything-you-can-do-with-notion-ai)
- [Harvey | AI software for legal and professional services](https://www.harvey.ai/)
- [Legora — AI Legal Platform](https://www.legorai.com/)
- [Legal AI Tools Compared: A Decision Framework for Disputes Practices — Kallam Blog](https://www.kallam.ai/blog/legal-ai-tools-compared-a-decision-framework-for-disputes-practices)

内部依据（复述，未重新论证）：`docs/32-设计语言包/principles.md §1/§3/§3a/§3b/§4/§5/§7/§8`、`docs/19-调研报告-交互反馈动效.md`（反馈阶梯、空路由判据）、`docs/41-MVP缺口盘点与路由声明.md`（缺口三态声明规范、扫描件路由）、`docs/30-W9设计brief与handoff规范.md` 一/§二（审美方向、中栏结构清单）。

---

## [需架构拍板] 清单

1. **上传/发送按钮的图标视觉方案未定**：本报告只给出"曲别针/上传箭头二选一""向上箭头/纸飞机二选一"的通用惯例范围，未指定具体图标资产——这属于 UI 组件量产阶段的具体图标选型，不在本次调研范围内，需 Design 出图标规范时定案。
2. **"存入卷宗"确认层的具体交互形态未定**：本报告只定义了触发点（chip 归属标签点击）与结果状态（灰→绿 0ms 硬切），未定义确认层本身是 popover/modal 哪一种容器——按 `principles.md §2a` 应落在"AI callout 之外"的确认门禁范畴，具体归属（是否复用右栏门禁卡片样式）建议留给 B 阶段 UI 组件量产时统一拍板，避免本报告越界定义门禁组件规格。