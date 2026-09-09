# 界面文案体例（UI Copy Convention）

2026-09-09 · Fable（WK-59 / 44 / 76）；§3 于同日按 WK-89 由 FE-01 改写。与 [UI 文本与编排体例](ui-composition-standard.md)、[图标体例](icon-controls.md)、[UX 体例](ux-conventions.md) 并用；本页只管文字的去留、形态与词表，不改动作语义。

## 1. 去留

一段可见文字只在承担下列之一时存在：对象名、状态词、条件、范围、后果、定义。装饰、鼓励、重复标题、解释界面自身的话（"这里是你的工作区"）一律删。空态只留一句条件（"Your chats will appear here."），加载只留一句进行时（"Loading your workspace…"）。

## 2. 形态

| 场景 | 形态 | 例 |
|---|---|---|
| 与图标并列的动作 | 单词，sentence case | Send · Deny · Answer · Cancel · Open · Retry · Save · Close · Refresh · Inherit |
| 承载范围或后果的动作 | 短语，保留范围词 | Approve this write · Cancel run · Use as draft |
| 状态 | 单词或两词，灰字；只有 failed / waiting_user 可着色 | Running · Completed · Cancelled · Failed · Waiting for you |
| 模式选择的可见标签 | 说全后果的短语；控件带 disclosure 记号，标签不再重复一次（WK-94） | Ask before editing · Allow edits · Read only |
| 帮助句 | 一句，说明作用域或后果，不解释界面 | Choose or create a project to send. |
| 标题 | 对象名本身，无 eyebrow、无副标题 | Chat 标题；Projects |
| 占位符 | 动作指令，不问候 | Describe the work you want to do… |

可见文字、accessible name、tooltip 三者同词根；icon-only 控件的 accessible name 必须完整。

## 3. 词表（用户可见的全部概念；只用此表，不发明）

2026-09-09 改写（WK-89，FE-01）。上一版为工程内部一致而回避了成熟产品已有的用户心智；本版逆转：**用户看见成熟 agent 的词，架构词退回 Developer 与代码。** 一行的三列是「用户看见什么 / 它是什么 / 什么词不再出现」。

### 3.1 工作对象

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| Chat | 一次会话；未绑定 Matter 时它就是全部 | Session（架构词，见 §3.6）· Thread · Task |
| Work | 绑定了 Matter 的会话；同一个对象换了交互契约，不是另一份存储 | Workspace（那是文件夹）· Workbench |
| Run | Work 内一次执行 | Job · Turn |
| Project | 若干 Chat / Work 与其文件的持久容器 | Folder（那是磁盘上的东西）· Space |
| Matter | SE 的持久治理边界；产品 UI 现在不显 | — |
| Workspace | **只**指一次真实的文件夹绑定 | 泛指右侧工作面、泛指 Matter |
| Run history · Chat overview · Chat files | 上述对象的三个只读入口 | Session overview · Session files |

### 3.2 授权与文件

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| Approval | **一次**动作的批准；按钮写 `Approve this write` / `Approve this action` / `Deny this write` | Permission（那是持久策略）· Allow · Interrupt · Elicitation |
| File access | 一个 Chat 对文件的**持久**模式：`Ask before editing` · `Allow edits` · `Read only` | File writes · Write permission · Ask / Write / Read 三个单词 · Auto · Full access |
| Permissions | Settings 里的持久策略与作用域 | Governance · Policy engine |
| Question · Answer | 运行中向人提问与人的回答；回答不等于授权 | Elicitation |

一次动作与一条策略不共用一个词，也不共用一个按钮：`Approve this write` 只批准这一次写入，`Ask before editing` 是这个 Chat 往后的模式。

### 3.3 模型与接入

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| Models | Settings 组名：provider、connection、默认模型 | Connection（作组名时）· Backend |
| Provider | 模型请求发往哪里 | Vendor · Endpoint（那是 Base URL） |
| Connection | 一个已配置的 provider / MCP / service 实例 | Integration（作单数时） |
| MCP servers | MCP 服务器 | Runtime connections · Remote runtimes |
| Tools & Integrations | Settings 组名：tools、MCP servers、plugins | Capabilities & connections（内部意图名，见 §3.6） |
| Skills | 可复用的 instruction / workflow / resource 包 | Abilities · Recipes |
| Plugins | 可安装的能力包 | Add-ons · Extensions（见 §3.6） |
| Instructions · Skills · References · Prompt templates | 取代泛用的 Context 抽屉；四种不同的准入 | Context（作万能名词） |

### 3.4 记忆

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| Memory | Settings 组名。本版只有一句用户世界的句子：CourtWork 不在 Chat 之间携带记忆 | Session Memory |
| Matter memory · Global memory | 跨 Chat 与跨 Matter 的记忆范围。**词已冻结，控件待 BE-19**，未实现前不画 | — |
| Sources | 文件与已连接的数据；它不是记忆 | Context · Knowledge |
| Temporary chat | 不读写持久记忆的 Chat。**词已冻结，待 BE-20** | Incognito |

### 3.5 外观

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| Theme | Light / Dark / System | Scheme · Colour mode · Appearance mode |
| Palette | 色阶，Appearance › Advanced 的一行：Slate · Gray steel · Custom tokens | Skin（退役）· Theme · Colour theme |
| Text size | Small / Medium / Large | Font size · Zoom |
| Code font | 等宽字体族名 | Monospace font · Editor font |
| Appearance | 本设备偏好的组名 | Personalization · Customization |

### 3.6 只在 Developer 与代码里出现

`Session` · `Runtime` · `Extension` · `adapter` · `compat` · `composition` · `profile` · `kind` · 以及 WK11 的五个意图组名（Overview / Composition / Instructions & context / Capabilities & connections / Permissions & environment）。它们是架构事实，不是用户概念：一个产品在技术上有 runtime，不等于它的 UI 该有一页叫 Runtime。Settings › Developer 是它们唯一的可见落点。

### 3.7 品牌

| 用户词 | 不用 |
|---|---|
| CourtWork | Schema Engineering（仅 Paper 链接）· Courtwork |

新词进入本表须经接管记录裁定；组件内不得自造第二套说法。已冻结但后端未交付的词（Matter memory、Global memory、Temporary chat）只登记，不画控件。

## 4. 尺寸档（引用）

字阶与节奏见编排体例；图标 行 16 / 控件 18 / 导航 20，命中 32 桌面 / 44 窄屏与触屏（IC-1、WK-13）；文案增长允许换行，不缩字号。

## 5. 验收

每轮交付附 `text-sweep.md` 三列（删 / 单词化 / 保留并注明承重）；新增字符串逐条对照 §1–§3；读屏对单词标签的全句读法为独验项。

## Astra 联调补充：通用工具授权

MCP 与策略设为 ask 的非写工具也沿既有 permission 事件请求一次调用授权。仅 `payload.tool === ws_write` 使用 Write / `Approve this write`；非写请求的状态使用 Action，决定按钮使用 `Approve this action` / `Deny this action`；标题按事实区分 `Approve this tool action?` 与 `Approve this remote tool call?`。远程调用显示该 Run 的 recorded runtime.bound 中 tool/server/source。Home summary 未提供具体 tool 时只称 Approval requested。历史缺少 tool 或 binding 时不推断为文件写入，不使用当前 catalog 回填来源。此为既有执行事实的文案修正，不新增授权、Review 接受或 WK10b 能力。
