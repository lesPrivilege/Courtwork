# 市场流通 Work Agent 全景扫描（架构形态）

- **工单**：WORK-AGENT-LANDSCAPE-1
- **日期**：2026-07-19
- **性质**：只读调研原稿；不进权威链；不具约束力
- **不重做**：`archive/research/workbuddy-interaction-bench-2026-07-16/`（交互枚举）；`archive/research-2026-07-15-round-3/session-recall-survey.md`（召回八条）
- **边界**：公开文档为界；不注册不试用付费/需新账号服务；条款不复制大段原文（引称+要点）
- **证据级**：`DOC`=官方手册/知识库/产品页；`STATIC`=已装客户端语义资产只读枚举（不证运行正确性）；`CLUE`=二手仅作线索；`GAP`=公开材料未写清

---

## 0. 产品与来源总表

| 产品 | 厂商 | 形态（公开宣称） | 一手入口（抓取日 2026-07-19） | 置信度 |
|---|---|---|---|---|
| **WorkBuddy** | 腾讯云 CodeBuddy | 全场景职场 AI 智能体桌面工作台；task=会话；本地文件+IM 远程 | [codebuddy.cn/docs/workbuddy](https://www.codebuddy.cn/docs/workbuddy/Overview) 全套 | high |
| **TRAE Work** | 字节跳动 TRAE | AI 原生工作台；网页/桌面/移动；Work·Code·Design 三模式 | [docs.trae.cn](https://docs.trae.cn/work_what-is-trae-solo) Work 专册 | high |
| **QoderWork** | 阿里 Qoder | 桌面智能工作助手；Coding Agent 能力扩展到日常工作 | [docs.qoder.com/qoderwork](https://docs.qoder.com/zh/qoderwork/introduction) + Cloud Agents API 册 | high |
| **Kimi Work** | 月之暗面 | 知识工作者桌面 Agent；本地文件夹+WebBridge+Cron+Python | [kimi.com/products/kimi-work](https://www.kimi.com/zh-cn/products/kimi-work)；技能资源页 | **medium**（帮助中心多页 JS 空壳；产品页/资源页可核） |
| **Frontier 旁节** | Anthropic / OpenAI / Manus / xAI 等 | Computer Use / Operator / 云端通用 agent | 二手线索+既有仓内 `grok-build-patterns` | low–medium |

> 查询写作「Trea Work」= 官方 **TRAE Work**（docs.trae.cn）。  
> 既有 `archive/research-2026-07-15-round-3/trae-work-landscape.md` 为技能 vs 场景包分野定调；本单补八问架构对照，不推翻该定调。

---

## 1. 逐家八问表

### 1.1 WorkBuddy

| # | 问 | 形态要点 | 来源 |
|---|---|---|---|
| ① | **基础工具集** | 公开形态=**本地文件读写 + 脚本/外部程序 + 网络/连接器 + Skill 脚本**，非显式「Read/Edit/Write/Bash」四件命名。**bash/脚本：给**；默认权限下「执行脚本、命令或外部程序」走确认；命令**优先沙箱**，拦截后再按风险确认。Full Access 关闭逐步确认。STATIC：`SandboxHelper`/`NetworkExtension`/`sandbox-config.json`（signingMode=full）；`devtools-terminal` 资产；builtin-skills 含 financial/design 等。 | DOC: [Permission-Modes](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Permission-Modes)（抓取 2026-07-19）「命令会优先在沙箱约束下执行」；STATIC: 本机 WorkBuddy.app |
| ② | **确认与授权** | **效果授权：默认先确认后执行**（默认权限）。确认类：敏感路径写入、重要/批量删除、脚本命令、网络/敏感能力。取消=不执行该步，可续聊改路径。**Full Access=授权先行关闭**（切换时另弹风险确认）。删除保护/回收站；文件备份「修改已有文件前备份」（**仅 Windows**）。 | 同上 Permission-Modes |
| ③ | **文件容器** | **任务 ⊃ 工作空间（文件夹）**；可选手选目录或自动任务目录。建议一任务一独立文件夹副本。右侧：工作空间文件 / 产物 / 变更 / 浏览器。**项目**层：指令+连接器+专家+Skill+资料库（RAG）；任务=项目内会话。产物可上传腾讯文档/ima/乐享。**原件**：授权文件夹内可读写；敏感目录拦截；删除保护兜底——**非「原件只读」架构**，是「工作空间内可改 + 高危确认」。 | DOC: Permission-Modes「工作空间」；[Create-Task](https://www.codebuddy.cn/docs/workbuddy/Create-Task)；[Results](https://www.codebuddy.cn/docs/workbuddy/Results)；[Project](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Project) |
| ④ | **工作流声明** | **模型自主规划为主**（「一句话→自主规划执行」）。专家团=团长拆解并行。无公开「descriptor 预检闸 / schema 不足不起跑」。失败态：可中断；执行阶段说明文案；STATIC 有 `skill-import-errors`/`acp-reconnect-retry`（存在性≠正确性）。自动化=定时 prompt，无人值守——文档要求审慎写删除/资金类 prompt。 | DOC: [Overview](https://www.codebuddy.cn/docs/workbuddy/Overview)；[Conversation](https://www.codebuddy.cn/docs/workbuddy/Conversation)；[Automation-Guide](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Automation-Guide)；Expert-Center |
| ⑤ | **记忆与续行** | **跨会话记忆**：每晚从会话抽取事实/偏好/关系/跟进→记忆数据；注入系统提示；可检索历史。设置：查看/编辑（对话式改）/删除/关闭；支持从其他 AI **导入记忆**。声明：关闭后不追溯已生成输出。任务内续行=同任务上下文。**项目流转**：打包产物+进度摘要+自定义字段→移交。 | DOC: [Memory](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Memory)；Project「任务流转」 |
| ⑥ | **手册/知识库** | **Skill**=脚本+工作流能力包（可第三方，外发风险明示）；**专家**=人设+方法论+工具链；**专家团**=多角色协作；**项目指令/资料库 RAG**；**ima/腾讯文档/乐享**资料库。形态=提示词/Skill 分发 + 连接器，**非版本化 schema 场景包 ABI**。 | DOC: [Skills-Market](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)；Expert-Center；Project |
| ⑦ | **toolResult 入账** | 对话区：阶段说明 + 结果摘要 + **可展开中间步骤**。右侧结果区与对话并置。**无公开「tool 角色消息 / journal 条目族」契约**；偏 UI 折叠展示。 | DOC: Conversation「执行过程展示」；Results |
| ⑧ | **降级诚实度** | 高危确认取消=诚实不执行。隐私：本地处理宣称 + 服务端片段用后即弃（营销口径需另核）。**GAP**：缺配置/模型失败/沙箱失败是否静默降级——公开文档未系统写 fail-closed 表。STATIC 失败面语义存在。记忆「可能概括偏差」要求核验——属文案诚实，非运行时门。 | Conversation；Memory；Permission-Modes |

---

### 1.2 TRAE Work

| # | 问 | 形态要点 | 来源 |
|---|---|---|---|
| ① | **基础工具集** | Code 向：**搜索/编辑/创建文件/终端命令**（智能体「完整工具访问」）。命令运行三态：**沙箱运行（支持白名单）/ 手动运行 / 自动运行（沙箱外）**。沙箱：macOS `sandbox-exec`；Windows 自研 SDK；云端独立磁盘容器。白名单命令**跳过沙箱**在沙箱外执行。高风险（如 `rm -rf`）：跳过 / 加白名单 / 沙箱内运行。Windows Work/Design：**默认沙箱不可关**，项目外写入进隔离区。MCP 另开关「自动运行 MCP」。 | DOC: [work_sandbox](https://docs.trae.cn/work_sandbox)；[work_chat-settings](https://docs.trae.cn/work_chat-settings)；IDE agent 概述工具句式同源 |
| ② | **确认与授权** | **命令级**：手动运行=逐次人批；自动运行=授权先行（沙箱外）；沙箱+白名单=混合。**高风险命令拦截弹窗**（先于执行）。Spec/Plan：**文档首次生成后暂停等人确认**再执行——计划确认先于大批量 effect。MCP 自动运行单独安全提示。自动化任务创建后模式/环境/输出位置**不可改**。 | work_sandbox；work_chat-settings；[work_spec-and-plan](https://docs.trae.cn/work_spec-and-plan) |
| ③ | **文件容器** | **任务 + 项目目录**；云端会话=隔离工作目录。**Worktree**（本地）：每任务独立 Git 工作目录/分支；合并后分割线上方不可回退；清理删目录可保留分支。中间产物：`.trae/specs/`、`.trae/documents/plan.md`、技能 `.trae/skills/`。**原件/主工作树**：worktree 隔离保护主目录；沙箱限制可写范围——非「原件只读卷宗」，是 **Git/沙箱双隔离**。 | [work_worktree](https://docs.trae.cn/work_worktree)；work_sandbox；work_skills |
| ④ | **工作流声明** | **双层**：默认模型自主；**可选声明式轻工作流** Spec（spec.md+tasks.md+checklist.md）/ Plan（plan.md）——文本纲要，**非机器可判定 schema 契约**（与既有 trae-work-landscape 定调一致）。任务完成/失败/等待操作：**横幅/声音/菜单栏通知**（本地）。自动化：固定时间/间隔/自然语言定时；执行历史→对话流。 | work_spec-and-plan；work_chat-settings；[work_automated-tasks](https://docs.trae.cn/work_automated-tasks) |
| ⑤ | **记忆与续行** | **全局记忆** `user_profile.md` + **项目记忆** `project_memory.md`（路径在 `~/.trae-cn/memory/...`）。AI **自动创建/更新**；用户可手编文件或对话指令增删改。敏感/一次性默认不存。**无「一键清除+来源坐标」公开契约**（对比 ADR-013）。任务历史三端同步。 | [work_memories](https://docs.trae.cn/work_memories) |
| ⑥ | **手册/知识库** | **Skill**=`SKILL.md` 按需加载（扫描述→相关才载全文）；项目/全局目录；技能市场；与 agentskills.io 生态互通。**Rule**=全量注入。**MCP**=工具供给。Skill vs Rule vs MCP 官方三分法清晰。**无 schema/词表/场景 descriptor ABI**。 | [work_skills](https://docs.trae.cn/work_skills) |
| ⑦ | **toolResult 入账** | 桌面宣称「实时展示任务进度并自动总结输出」；对话内预览验收。**GAP**：tool 消息角色/折叠/trace 区 journal 形状公开未拆到事件契约级。 | [work_what-is-trae-solo](https://docs.trae.cn/work_what-is-trae-solo) |
| ⑧ | **降级诚实度** | 沙箱失败→询问是否沙箱外重试（显式分支）。隐私模式：关闭训练用途；**退出登录隐私模式自动关**（边界需用户知悉）。代码库：本地索引算 embedding 后删明文（自述）。**GAP**：缺模型/缺 MCP 配置的产品级 fail-closed 表未系统文档化。 | work_sandbox；[work_privacy-mode](https://docs.trae.cn/work_privacy-mode) |

---

### 1.3 QoderWork

| # | 问 | 形态要点 | 来源 |
|---|---|---|---|
| ① | **基础工具集** | 桌面：文件读写（Working Folder）、浏览器自动化、**Computer Use**（键鼠+截图）、定时、IM、MCP/Connector、Skill 内建 docx/pdf/pptx/xlsx。Cloud Agents 内建原子工具表：**Bash / Read / Write / Edit / Glob / Grep / WebFetch / WebSearch / DeliverArtifacts**——**四件切分最清晰的一手契约**。Bash 可 `always_allow|always_ask|always_deny`。桌面 **Secure Work Environment**（隔离空间，可关；清理 workspace 文件不影响对话/artifact）。 | DOC: [qoderwork/introduction](https://docs.qoder.com/qoderwork/introduction.md)；[file-management](https://docs.qoder.com/qoderwork/file-management.md)；[computer-use](https://docs.qoder.com/qoderwork/computer-use.md)；[settings](https://docs.qoder.com/qoderwork/settings.md)；[cloud-agents/tools](https://docs.qoder.com/cloud-agents/tools.md)；[permission-policies](https://docs.qoder.com/cloud-agents/permission-policies.md) |
| ② | **确认与授权** | **Working Folder 显式授权**；越界先问。删除→**系统回收站**（宣称永不永久删）。Computer Use 策略：**Ask every time（默认）/ Auto-execute / Disabled**。Cloud：`evaluated_permission` allow|ask|deny；ask→`user.tool_confirmation`；pending **不自动超时**。Desktop 与 Cloud 策略面不完全同一文档体系——**两层产品**。 | file-management；computer-use；permission-policies |
| ③ | **文件容器** | **Task + Working Folder（一任务一文件夹）**；Workspace 模式：General/Design/Slides/Writing。产物=本地真实文件卡片。Secure Environment 隔离副本语义。Cloud：**Environment 容器 + Session + Files/Artifacts**；Vault 存 MCP 凭证。**原件**：授权目录内可改；非只读卷宗；回收站防删是主防呆。 | chat-basics；file-management；settings；cloud environments 册 |
| ④ | **工作流声明** | **自主规划为主**（outcome-oriented prompt）。Task Monitor：**To-Do plan / Artifacts / Skills&MCP**。Skill=步骤 playbook；Expert Kit=Skill+连接+标准整包；`/` 快捷命令。Scheduled：本地时钟触发新会话跑 prompt——**跳过则标 missed**（诚实）。Cloud：**WakerFlow / Forward Template** 偏编排。**无 descriptor 最低材料预检闸**公开。 | [chat-basics](https://docs.qoder.com/qoderwork/chat-basics.md)；[expert-kits](https://docs.qoder.com/qoderwork/expert-kits.md)；[scheduled-tasks](https://docs.qoder.com/qoderwork/scheduled-tasks.md) |
| ⑤ | **记忆与续行** | **Awareness**：Awareness Mode + **Auto Memory**；文件：`SOUL.md`/`AGENTS.md`/`USER.md`/`MEMORY.md`/`memory/`；可备份导入；Danger：清记忆/重置手册。Cloud：**Memory Stores + Dreams**（异步合并；**输入 store 不改、写克隆输出**；Dream agent 仅 memory/session 工具——**无 bash/网**）。Dreams=显式 API 触发 consolidation，**非完全静默**（对照 Mimo `/dream` 静默压缩）。 | [memory/Awareness](https://docs.qoder.com/qoderwork/memory.md)；[dreams](https://docs.qoder.com/cloud-agents/dreams.md) |
| ⑥ | **手册/知识库** | **Skill**=`SKILL.md` 文件夹 `~/.qoderwork/skills/`；市场+分享链。**Expert Kit**=多 Skill+数据连接+工作流+标准；内置法律/合同/PM/财务等 12 kit；`plugin.json`（兼容 `.claude-plugin`）。Enterprise：**QMind / Knowledge Engine**（企业册）。与垂类包可比：**最接近「打包领域能力」的流通形态**，但仍是 **Skill/提示词+连接器**，公开未见 JSON Schema 场景 descriptor / 事实等级 / 锚点 ABI。 | skills；expert-kits；llms.txt enterprise 条目 |
| ⑦ | **toolResult 入账** | 设置：**Expand tool calls by default**；**Show tool execution steps in IM channels**。对话流流式 thoughts+tool calls；Task Monitor 三栏。Cloud 事件：`agent.tool_use` / `agent.mcp_tool_use` + `evaluated_permission`——**事件形状公开最完整**。 | settings；chat-basics；permission-policies |
| ⑧ | **降级诚实度** | 文件：仅授权目录；越界询问。定时：睡眠**跳过并标 missed**（显式）。Computer Use 限制：验证码/2FA 人工。内建 `install-skill-dependency` / `vm-error-recovery` Skill——失败走诊断技能。FAQ：文件会送模型 API 理解（非「永不上传」绝对化）。**GAP**：Credits 耗尽/模型失败产品文案未全表。 | file-management；scheduled-tasks；skills；introduction FAQ |

---

### 1.4 Kimi Work

| # | 问 | 形态要点 | 来源 |
|---|---|---|---|
| ① | **基础工具集** | 产品页：挂载本地文件夹、**后台 Python**、Shell（Cron 任务类型含 Python/Shell）、**WebBridge** 浏览器自动化、多智能体集群、金融数据原生集成。STATIC：`builtin-skills/kimi-webbridge`。**四件原子切分公开未见表**；bash/**脚本：给**。关法：产品页强调「修改/覆盖/运行代码前询问」——**逐次确认口径**，未见沙箱/白名单专册（本轮公开页）。 | DOC: [kimi-work 产品页](https://www.kimi.com/zh-cn/products/kimi-work) FAQ；STATIC: Kimi.app Resources |
| ② | **确认与授权** | FAQ 原意要点：**操作前询问**——修改、覆盖、本地目录跑代码前明确授权；「未经同意不执行」。= **效果授权默认先于执行**（自述）。**GAP**：Full Access 类总开关、沙箱、命令白名单公开未核到。 | 同上 FAQ「访问本地文件时如何保护隐私」 |
| ③ | **文件容器** | 示例工作区路径 `~/Documents/KimiWorkspace`；「保留原文件目录位置」摘要任务——**倾向旁路产出、原件位置保留**（营销示例，非硬契约）。中间产物：摘要文档等到工作区。**dossier/project 分层公开弱**。 | 产品页示例与能力描述 |
| ④ | **工作流声明** | **自主规划** + 智能体集群拆解；Cron「设置即忘」后台跑。**无公开 Spec 三件套/预检表单**。失败态：产品页未系统表。 | 产品页 |
| ⑤ | **记忆与续行** | 产品页未拆 session/memory 专节。生态旁支：Kimi Claw「长期记忆」；Kimi Code Skills；**本单不对 Claw/Code 等同 Work**。既有仓内 Mimo `/dream` 静默压缩=不变量④反例——**Kimi 产品线命名「Dream」未在 Work 页出现**；Qoder Cloud Dreams 另记。 | 产品页；对照 session-recall-survey |
| ⑥ | **手册/知识库** | 技能=可复用知识包（方法+标准+脚本/模板）；相关时加载。**文档转技能** / skill-creator；导出 `.md`。结构近 Agent Skills 生态，**非 schema ABI**。 | DOC: [create-skills](https://www.kimi.com/zh-cn/resources/create-skills)（2026-07-17）；帮助中心 what-are-skills **本轮 fetch 空壳→GAP** |
| ⑦ | **toolResult 入账** | **GAP**（公开产品页未描述 tool 折叠/角色） | — |
| ⑧ | **降级诚实度** | 隐私 FAQ 强确认口径。Cron：需保持唤醒。**GAP**：缺配置/失败呈现未核。K3 侧「过度自主」官方自陈短板在 `kimi-k3-capability-audit`——属模型行为线索，非 Work UI 契约。 | 产品页；仓内 kimi-k3-capability-audit |

---

### 1.5 Frontier 旁节（非重点）

| 产品/形态 | ①工具 | ②授权 | ③容器 | ④工作流 | ⑤记忆 | ⑥知识 | ⑦tool 入账 | ⑧降级 | 备注 |
|---|---|---|---|---|---|---|---|---|---|
| **Grok Build**（开源 coding agent，既有调研） | Bash+读写+沙箱 OS 级 | deny>ask>allow；危险命令不记 grant | session/工作副本 | Plan Mode 三态审阅 | 先蒸馏后 compaction | 用户文档 skills 形 | ACP 三分流 | 子状态文案 Retrying | 见 `grok-build-patterns.md`；**形状参考非 work 办公产品** |
| **Claude Computer Use / Desktop agent 类** | 截图+键鼠+bash（生态常见） | 厂商/OS 权限对话框；策略因产品而异 | 用户机/项目目录 | 模型自主 | 产品线分裂 | Skills/CLAUDE.md | 厂商 UI | GAP | 本轮不注册不试用；CLUE |
| **OpenAI Operator / ChatGPT agent 类** | 浏览器为主 | 云端操作确认流（二手） | 云会话 | 自主 | 账号记忆 | GPT 生态 | 聊天内步骤 | GAP | CLUE |
| **Manus 等云端 work agent** | 云 VM 工具齐全 | 云隔离=容器授权 | 云 workspace | 自主+断点（仓内 harness 景观曾记） | 会话 | Skill 市场常见 | 步骤时间线 | 平台相关 | CLUE；见 harness-landscape |

Frontier 结论只作边界：流通「办公 work agent」四家与 coding/computer-use frontier **共享工具原子（读改写bash）**，差异在 **授权粒度、容器隔离、知识打包是否契约化**。

---

## 2. 八问横表（四家主对照）

图例：● 强/明确　◐ 有但不完整或双层　○ 弱/营销级　— GAP 或无

| 问 | WorkBuddy | TRAE Work | QoderWork | Kimi Work |
|---|---|---|---|---|
| **① reading** | ● 授权文件夹/read-file | ● 项目文件 | ● Working Folder + Read | ● 挂载文件夹 |
| **① edits/writing** | ● 工作空间内写；敏感确认 | ● 可写项目目录（沙箱表） | ● Write/Edit；产物本地 | ● 改前询问（自述） |
| **① bash** | ● 脚本/命令+沙箱优先 | ● 终端三态+沙箱/白名单 | ● Bash 原子+策略；桌面隔离环境 | ◐ Python/Shell（Cron） |
| **① 关 bash** | 默认确认；Full Access 关确认；沙箱 | 手动/沙箱/自动；白名单外跳 | always_deny / ask；关 Computer Use | 询问闸（公开） |
| **② 不可逆谁批** | 用户（默认权限） | 用户（手动/高风险弹窗/Spec 确认） | 用户（ask 策略/文件夹授权） | 用户（FAQ） |
| **② 授权时机** | 默认：**先批后执行**；Full Access 例外 | 混合；高风险先拦 | 默认先批；Auto-execute 例外 | 先批（自述） |
| **③ 容器** | 任务=工作空间；项目=团队配置+资料库 | 任务+项目；worktree；云会话盘 | 任务+Working Folder；Secure Env；Cloud Env | 工作区路径示例 |
| **③ 中间产物** | 产物/变更/工作空间文件 | `.trae/specs|documents|skills` | artifacts 本地；Cloud files | 工作区输出 |
| **③ 原件** | 可改授权区；删除保护/备份(Win) | 沙箱/worktree 隔离；非只读哲学 | 可改授权区；删进回收站 | 示例保留原路径 |
| **④ 编排** | 自主；专家团分工 | 自主 + Spec/Plan 文本 | 自主 + Skill/Kit + Monitor To-Do | 自主 + 集群 |
| **④ 预检/失败显** | 阶段文案；中断；自动化警告 | 通知三态；沙箱失败询问 | missed/failed 历史；依赖恢复 Skill | — |
| **⑤ session** | 任务会话；项目流转 | 任务；三端同步 | 任务；可归档 | — |
| **⑤ memory** | 每晚自动抽取；可关可导入 | 全局/项目 md；AI 自管 | Awareness 文件树；Cloud Dreams COW | — / 生态旁支 |
| **⑤ 压缩形态** | 定期抽取（日程静默） | 自动增删 md | Auto Memory + 可选 Dream 作业 | — |
| **⑥ 知识打包** | Skill+专家+项目指令+RAG 库 | SKILL.md+Rule+MCP+市场 | Skill+Expert Kit+企业知识引擎 | 技能包+文档转技能 |
| **⑥ vs 垂类包 ABI** | 远（提示词/RAG） | 远（提示词技能） | 近一层（Kit 整包）仍无 schema 契约 | 远 |
| **⑦ tool 形状** | 可展开步骤+右侧结果 | 进度总结（粗） | 可折叠 tool 块+Monitor；Cloud 事件契约 | — |
| **⑧ 降级** | 确认取消诚实；失败系统表 GAP | 沙箱失败显式问；隐私退出登录关 | missed 显式；回收站；部分 FAQ 诚实 | 确认口径；系统表 GAP |

---

## 3. 三桶结论

> 只分类事实与可借形态；**不写「我们该怎样」**（吸收权在 ADR）。

### 3.1 可借形（具名→消费去向）

| 形态 | 出处 | → 消费去向 |
|---|---|---|
| 命令运行三态：**沙箱 / 手动 / 自动** + **白名单绕沙箱** + **高风险命令专用弹窗**（跳过/加白/沙箱跑） | TRAE Work `work_sandbox` + `work_chat-settings` | **bash 受控 ADR** |
| 内建工具原子表 **Read/Write/Edit/Bash/…** + 每工具 `always_allow\|always_ask\|always_deny` + 事件字段 `evaluated_permission` | Qoder Cloud `tools` + `permission-policies` | **bash 受控 ADR**；**TOOL-READ-1**（白名单+结果形状） |
| 默认权限 vs Full Access：**低风险顺畅 / 高风险硬确认**；取消不执行可续聊改方案 | WorkBuddy Permission-Modes | **effect 授权红线** 同行佐证 |
| Computer Use 三策略 Ask/Auto/Disabled；逐步截图-描述-执行-复核 | QoderWork computer-use | effect 授权（GUI effect 分级线索） |
| **pending 确认不超时**（取消会话才清） | Qoder permission-policies | effect 授权（防静默过期放行） |
| 删除→**系统回收站**；永不永久删（产品承诺） | Qoder file-management | 容器化/防呆（与 session-recall 删除三件套同族） |
| Worktree：**任务隔离目录 + 合并分割线不可回退 + 清理确认** | TRAE work_worktree | **容器化 ADR**（隔离层形状；注意其是 Git 向） |
| 一任务一 Working Folder；越界先问 | Qoder + WorkBuddy 工作空间 | **chat-as-dossier / 容器化** |
| Spec/Plan：**生成后暂停确认再执行**；清单随进度更新 | TRAE work_spec-and-plan | **GENERIC-PACK-1 预检闸** 弱对照（文本确认≠材料预检，但「确认后才跑」时序可借） |
| Task Monitor 三栏：To-Do / Artifacts / Skills&MCP | Qoder chat-basics | TOOL-READ-1 GUI 呼应；Work 画布 trace 线索 |
| 设置项：**默认展开 tool 块**；IM 是否透出 tool 步 | Qoder settings | **TOOL-READ-1** |
| Dreams：**COW 不改输入 store；consolidation agent 工具最小集（无 bash/网）** | Qoder Cloud dreams | **ADR-013 演进**（显式巩固作业 vs 静默压缩——正对照） |
| Skill 按需加载（先扫 description 再载全文） | TRAE / Qoder / Kimi 技能通式 | 垂类包「场景 descriptor 摘要 vs 全量 schema」加载策略对照 |
| Expert Kit = Skills + 连接 + 标准 + `/` 命令；团队一键分发 | Qoder expert-kits | **垂类包路线** 最接近流通物（仍非 schema ABI） |
| 项目级：指令/Skill/专家/连接器/资料库一次配置任务继承 | WorkBuddy Project | 垂类/案件绑定配置面线索（≠ package ABI） |
| 定时失败：**睡眠跳过标 missed** | Qoder scheduled-tasks | 降级诚实（不变量④）佐证 |
| 沙箱失败→**询问是否沙箱外重试**（显式分支非静默升级权限） | TRAE sandbox | 降级诚实；bash ADR |

### 3.2 反面教材（违哪条不变量——点名）

| 现象 | 出处 | 触线 |
|---|---|---|
| **Full Access / 自动运行（沙箱外）/ Computer Use Auto-execute**：高风险 effect 无逐步人批 | WorkBuddy；TRAE；Qoder | **不变量③ 留人确认**；effect 授权红线反例 |
| **AI 自动创建/更新记忆**（Trae）；**每晚自动抽取记忆**（WorkBuddy）；**Auto Memory 定期 reflection**（Qoder）——后台写入用户可见偏好库 | 三家记忆专册 | **不变量③**（memory 可撤销要求的对照压力）；**不变量④** 若压缩/蒸馏无显式入口则近 **Mimo/dream 静默压缩**族（session-recall 已点名） |
| 记忆/训练相关：**隐私模式退出登录自动关**（Trae） | work_privacy-mode | **不变量④** 边界陷阱（状态静默变化） |
| Skill/第三方可 **外发输入、订外卖/资金类**（WorkBuddy Skills 明示风险） | Skills-Market | **不变量⑧** 案件/数据外发压力；**不变量③** 若无人批 |
| 自动化无人值守执行写入/删除（各家均有 Cron；文档仅「请审慎」） | WB/Trae/Qoder/Kimi | **不变量③**；与 Courtwork Stage3「授权语义先于自动化」对照——**同行先上、授权后置** 是反例时序 |
| 工作空间内 **直接改用户文件**（默认可写哲学） | 四家主流 | **不变量⑥ 原件永远只读** 的行业反面（我们差异化前提） |
| 专家/Kit 输出「仅供参考」免责声明为主，**无事实等级/无锚不落格** | WB Expert；Qoder Kit 营销 | **不变量①②** 行业空白=护城河论据（既有 trae-work-landscape 同向） |
| WorkBuddy **分享任务公开链接** | Conversation 顶部操作 | 律所场景危险面（session-recall 对 opencode `/share` 已禁——同族） |
| 模型「过度自主/擅自替用户做决定」（K3 官方自陈，能力审计） | kimi-k3-capability-audit | **不变量①③** 模型侧反例线索 |

### 3.3 中性事实

| 事实 | 备注 |
|---|---|
| 四家主产品均为 **「自然语言目标 → 模型规划 → 本地/云工具执行 → 可验收产物」** 通用 agent 形，非声明式场景状态机 | 与 Courtwork「场景声明式固定编排」技术基线对照位 |
| **Skill=`SKILL.md` 文件夹** 已成为跨厂流通标准（agentskills.io / 各家市场） | 技能提示词分发 ≠ 场景包契约编译（trae-work-landscape 已定调） |
| 容器主流命名：**Task / Working Folder / Project / Workspace**；无人使用「dossier/卷宗」产品词 | 中性词表 |
| 定时任务四家均已产品化；触发源=本地时钟或云调度 | 中性；授权语义完整度不一 |
| Qoder 同时有 **桌面 QoderWork** 与 **Cloud Agents API** 两套文档深度 | 桌面偏 UX；Cloud 偏事件契约——调研时勿混为一谈 |
| Kimi Work 公开文档深度 **弱于** 另三家；帮助中心多页本轮不可抓 | 置信度降为 medium；结论勿超产品页+资源页 |
| WorkBuddy 交互六段与失败面 STATIC 已在 BENCH；本单不重复 | 架构问②⑦⑧ 以官方 Permission/Conversation 为准 |
| TRAE 执行隔离（沙箱/worktree/云盘）工程完整度公开材料领先办公向竞品 | 既有定调：护城河应写契约/锚点而非「对手无沙箱」 |
| Expert Kit 内置「Corporate Legal / Contract Management」等 | 垂类商业化意愿信号；非 schema 工程 |

---

## 4. 来源附录（URL + 抓取日 + 用途）

| ID | URL | 日 | 用于 |
|---|---|---|---|
| WB-OV | https://www.codebuddy.cn/docs/workbuddy/Overview | 2026-07-19 | 产品定位 |
| WB-QS | https://www.codebuddy.cn/docs/workbuddy/Quickstart | 2026-07-19 | 界面三区 |
| WB-CT | https://www.codebuddy.cn/docs/workbuddy/Create-Task | 2026-07-19 | 工作空间 |
| WB-CV | https://www.codebuddy.cn/docs/workbuddy/Conversation | 2026-07-19 | 执行展示/中断/隐私边界 |
| WB-RS | https://www.codebuddy.cn/docs/workbuddy/Results | 2026-07-19 | 产物/变更 |
| WB-PM | https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Permission-Modes | 2026-07-19 | ①② 核心 |
| WB-MEM | …/Memory | 2026-07-19 | ⑤ |
| WB-PRJ | …/Project | 2026-07-19 | ③⑥ |
| WB-SK | …/Skills-Market | 2026-07-19 | ⑥ |
| WB-EX | …/Expert-Center | 2026-07-19 | ⑥ |
| WB-AU | …/Automation-Guide | 2026-07-19 | ④ |
| TR-OV | https://docs.trae.cn/work_what-is-trae-solo | 2026-07-19 | 概述 |
| TR-SB | https://docs.trae.cn/work_sandbox | 2026-07-19 | ①② |
| TR-CS | https://docs.trae.cn/work_chat-settings | 2026-07-19 | ①④ |
| TR-SK | https://docs.trae.cn/work_skills | 2026-07-19 | ⑥ |
| TR-MM | https://docs.trae.cn/work_memories | 2026-07-19 | ⑤ |
| TR-SP | https://docs.trae.cn/work_spec-and-plan | 2026-07-19 | ④ |
| TR-WT | https://docs.trae.cn/work_worktree | 2026-07-19 | ③ |
| TR-AT | https://docs.trae.cn/work_automated-tasks | 2026-07-19 | ④ |
| TR-PV | https://docs.trae.cn/work_privacy-mode | 2026-07-19 | ⑧ |
| QD-IN | https://docs.qoder.com/qoderwork/introduction.md | 2026-07-19 | 总览 |
| QD-FM | …/file-management.md | 2026-07-19 | ①③⑧ |
| QD-CU | …/computer-use.md | 2026-07-19 | ①② |
| QD-ST | …/settings.md | 2026-07-19 | ⑦① |
| QD-CB | …/chat-basics.md | 2026-07-19 | ④⑦ |
| QD-SK | …/skills.md | 2026-07-19 | ⑥ |
| QD-EK | …/expert-kits.md | 2026-07-19 | ⑥ |
| QD-MM | …/memory.md | 2026-07-19 | ⑤ |
| QD-SC | …/scheduled-tasks.md | 2026-07-19 | ④⑧ |
| QD-TL | https://docs.qoder.com/cloud-agents/tools.md | 2026-07-19 | ① |
| QD-PP | …/permission-policies.md | 2026-07-19 | ②⑦ |
| QD-DR | …/dreams.md | 2026-07-19 | ⑤ |
| KM-PW | https://www.kimi.com/zh-cn/products/kimi-work | 2026-07-19 | Kimi 全问（有限） |
| KM-CS | https://www.kimi.com/zh-cn/resources/create-skills | 2026-07-19 | ⑥ |
| 仓内 | `trae-work-landscape.md` / `session-recall-survey.md` / `grok-build-patterns.md` / `kimi-k3-capability-audit.md` / `chat-as-dossier-thesis.md` | 既有 | 不重复劳动交叉引用 |

**未采用为事实真源**：需登录付费实测截图、社区二手「企业 RBAC 配置详解」类（未核官方）、帮助中心 Loading 空壳页。

---

## 5. 缺口（若要加深，不在本单）

1. Kimi Work 帮助中心/客户端内权限面板——需活会话只读截图（不发任务）。
2. 四家 tool 消息在 **真实 transcript 协议** 中的角色名（assistant/tool/system）——需抓包或开源客户端；公开文档仅 Qoder Cloud 事件级完整。
3. WorkBuddy Full Access 与沙箱的精确交互矩阵——Permission 文档写清确认类，未给状态机表。
4. Frontier Computer Use 产品专册——本单按红线不试用。

---

*调研会话结束。本文件不修改 `docs/` / `packages/` / 就绪图；登记见 `archive/README.md`。*
