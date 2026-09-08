# 界面文案体例（UI Copy Convention）

2026-09-09 · Fable（WK-59 / 44 / 76）。与 [UI 文本与编排体例](ui-composition-standard.md)、[图标体例](icon-controls.md)、[UX 体例](ux-conventions.md) 并用；本页只管文字的去留、形态与词表，不改动作语义。

## 1. 去留

一段可见文字只在承担下列之一时存在：对象名、状态词、条件、范围、后果、定义。装饰、鼓励、重复标题、解释界面自身的话（"这里是你的工作区"）一律删。空态只留一句条件（"Your sessions will appear here."），加载只留一句进行时（"Loading your workspace…"）。

## 2. 形态

| 场景 | 形态 | 例 |
|---|---|---|
| 与图标并列的动作 | 单词，sentence case | Send · Allow · Deny · Answer · Cancel · Open · Retry · Save · Close · Refresh · Inherit |
| 承载范围或后果的动作 | 短语，保留范围词 | Allow this write · Cancel run · Use as draft |
| 状态 | 单词或两词，灰字；只有 failed / waiting_user 可着色 | Running · Completed · Cancelled · Failed · Waiting for you |
| 模式选择的可见标签 | 单词；accessible name 保留全句 | Ask / Write / Read（= Ask before writing / Workspace writes allowed / Read only） |
| 帮助句 | 一句，说明作用域或后果，不解释界面 | Choose or create a project to send. |
| 标题 | 对象名本身，无 eyebrow、无副标题 | 会话标题；Projects |
| 占位符 | 动作指令，不问候 | Describe the work you want to do… |

可见文字、accessible name、tooltip 三者同词根；icon-only 控件的 accessible name 必须完整。

## 3. 词表（只用此表内的概念，不发明）

| 概念 | 词 | 不用 |
|---|---|---|
| 工作单位 | Project · Session · Run | Matter（Core 语义，UI 不显）· Task · Thread · Chat |
| 人机请求 | Question · Write permission · Tool permission | Approval · Interrupt · Elicitation |
| 文件写入模式 | Ask · Write · Read | Auto · YOLO · Full access |
| 连接 | Connection · Model | Provider（仅设置对话框内）· Backend |
| 工作面模块 | Run · File · Workspace · Runtime | Inspector · Preview · Panel · Sidebar |
| 运行控制 | Send · Cancel run | Stop · Abort · Submit |
| 品牌 | CourtWork | Schema Engineering（仅 Paper 链接）· Courtwork |

新词进入词表须经接管记录裁定；组件内不得自造第二套说法。

## 4. 尺寸档（引用）

字阶与节奏见编排体例；图标 行 16 / 控件 18 / 导航 20，命中 32 桌面 / 44 窄屏与触屏（IC-1、WK-13）；文案增长允许换行，不缩字号。

## 5. 验收

每轮交付附 `text-sweep.md` 三列（删 / 单词化 / 保留并注明承重）；新增字符串逐条对照 §1–§3；读屏对单词标签的全句读法为独验项。

## Astra 联调补充：通用工具授权

MCP 与策略设为 ask 的非写工具也沿既有 permission 事件请求一次调用授权。仅 `payload.tool === ws_write` 使用 Write / Allow this write；非写请求的状态使用 Action，决定按钮使用 Allow this action / Deny action；标题按事实区分 Allow this tool action? 与 Allow this remote tool call?。远程调用显示该 Run 的 recorded runtime.bound 中 tool/server/source。Home summary 未提供具体 tool 时只称 Permission requested。历史缺少 tool 或 binding 时不推断为文件写入，不使用当前 catalog 回填来源。此为既有执行事实的文案修正，不新增授权、Review 接受或 WK10b 能力。
