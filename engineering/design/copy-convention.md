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
| Continue in Work | 把这个 Chat 绑定到一个 Matter 的那一个动作（既有 / 新建两条都叫它） | Bind to chat · Create binding · Convert · Migrate |
| Existing work in this project · New work | Continue in Work 面板里的两段 | Continue existing · Create new |

WK-92 · Chat 与 Work 是**同一个对象的两种交互模式**，不是两种对象：它们共用一条标题行，模式词作陈述跟在标题下面（`Chat` / `Work`），导航只对 Work 加一个标记。续用不复制、不迁移，走的是既有的绑定路由；Chat 侧因此没有"转换"一词。

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
| Connections | Models 组内的列表块名；一行一条已配置的连接 | Providers（作块名时）· Accounts |
| Add provider | 加一条连接的入口（disclosure） | New connection · Connect a model |
| Catalog provider · Compatible endpoint · Local endpoint | 三条 happy path；差别只在端点归谁决定 | Custom provider · Self-hosted |
| In force | 当前生效的那一条连接 | Active · Default（作徽章时）· Current |
| Base URL · API key · API format | 端点、凭据、线格式三件分开的事 | Endpoint URL（同义反复）· Token · Protocol |
| Advanced | 少数人才改的一档（API format、Base URL） | Connection options · Expert · More |

WK-91 / WK-108 · `Test connection` 与对未保存表单的 `Fetch models` 已随 BE-18 / BE-17 交付而成为控件，只出现在**表单里写得出 Base URL** 的那条路径（Compatible endpoint）上；另外两条路径说明端点归谁，不画一个按不动的按钮。结果只说后端说过的话：状态词加后端原句。`ok` 不得被改写成"已验证 key"、"可推理"或"已配置"——它只说那个目录接受了这次请求。`discover` 报回的模型 ID 是**不可信显示数据**，列出来但不进 Model 下拉、不进保存的配置。

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| The directory reports N models | `discover` 成功后的第二行；说的是目录报了几个 | Found N models · N models available |
| ok · authentication_failed · unsupported · … | 后端的状态词，原样上屏 | Success · Connected · Verified · Invalid key |

### 3.4 记忆

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| Memory | Settings 组名。本版只有一句能力边界与一行 Temporary chat 说明，零控件 | Session Memory |
| Memory · Off | Work（Matter header）上的 scope 位。BE-19 之前只有这一个值，所以它是陈述，不是可点的选择器 | Memory: disabled · No memory（作控件时） |
| Matter memory · Global memory | 跨 Chat 与跨 Matter 的记忆范围。**词已冻结，控件待 BE-19**，未实现前不画 | — |
| Sources | 文件与已连接的数据；它不是记忆 | Context · Knowledge |
| Temporary chat | 不读写持久记忆的 Chat。**词已冻结，待 BE-20** | Incognito |

### 3.4b 一次请求正在路上（FE-04 / WK-93）

送出一次决定与那次决定生效，是两件事；把它们写成同一个标签，等于替宿主先答应了。四个只送一次决定的控件（`Approve this write` / `Deny this write`、`Answer`、`Send`、`Cancel run`）因此共用同一个在途词。

| 用户词 | 它是什么 | 不用 |
|---|---|---|
| Sending… | 这一次请求已经送出、回执还没到。控件同时被关掉，图标不换（review-projection §6） | Approving… · Cancelling… · Stopping… · Please wait · Submitting |

**在途词不是状态词。** Run 的状态词（`Working` · `Stopping` · `Waiting for you` · `Cancelled` · `Failed` · `Interrupted`）只随宿主的回执改变；一次取消请求在路上时，Run 仍写它上一次被确认的那个词——**cancel requested ≠ stopped**（FN-19、FE-T06）。

读取类请求另说：探测用它自己的动词 `Probing…`（WK-108），因为那一行说的是"正在读"而不是"已送出一个决定"。

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
