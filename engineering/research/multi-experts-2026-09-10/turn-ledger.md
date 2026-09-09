# 全量 turn 处置台账

每行覆盖该 turn 的用户与可访问回复；回复中的推荐是研究主张，最终工程裁决以本列及[选型表](selection-index.md)为准。原始内容按完整 turn ID 在 [conversation.json](inputs/conversation.json) 定位；逐消息 hash 见 [manifest](source-manifest.json)。ME 编号是本包候选变更切片，并非新增运行队列。

| Turn / 原始 ID | 讨论与索引内容 | Astra 处置 | 施工去向 |
|---|---|---|---|
| T01 · 定义与选择<br>`adb39d5e-6fbd-4a4d-92d2-ed84380559ef` | Expert 与 runtime 分层；definition/binding/resolved-run、模型/effort、composer 选择、Matter-first | 采用分层；候选新字段须证明现有 binding 不足；override 不越权限 ceiling。Expert 不是模型别名。 | D01/D02；ME-02 |
| T02 · Court / presence<br>`e7bad430-d548-480c-b738-48fd8e5d537a` | 在场、可用、当前选中、正在工作、assignment | 采用语义区分；presence 先纯投影，不能无需求先造租约/心跳实体。 | D02；ME-02/06 |
| T03 · MoE 类比与双路由<br>`98d4e8a9-524c-4058-8e88-81d45f066919` | 外部事件→Matter；事项→Expert；稀疏召集 | 采用两个判断接缝；MoE 只是类比，无权自动开 Run/建 Matter/赋权。歧义和低置信度显式保留。 | D03；ME-06 |
| T04 · 薄编排与本地目录<br>`a5b7b5e4-d528-42e1-8706-499e76143dde` | Attention envelope、MCP access、manifest-first、workers→single writer、版本失效 | 采用确定性优先，沿 LG-00…04 与 Core；先不引入 durable workflow 框架。 | D04/D10；ME-01/06 |
| T05 · Spark / Explore / sidecar 与推测<br>`f5b212e4-a85e-4b52-bfc0-81f2f5d2e8f0` | 确定性→小模型→强模型→人；DSpark、SpecReason、DeepSpec、verifier blindspots | 采用任务级分层实验；token 推测、语义推测与任务候选分开。评分器同意不证明正确；不照搬论文加速比。 | D05；ME-03/09 |
| T06 · grep-friendly、修订与 checkpoint<br>`8f67acbb-ea62-46b5-accc-d645d3c9ec88` | 来源/index/schema rows，增量构建，Source/Matter/Schema revisions，三类checkpoint | 采用可定位/可重建索引；自动快照、语义整理、人工接受分别归属。禁止一个 updated_at 隐藏多种失效。 | D04/D06；ME-01/03 |
| T07 · URL index 与 freshness（无回复）<br>`ef1666a9-22b9-48e6-ad02-32a2ae9d1f2c` | 选型指针优于盲切块；脚本检查更新 | 采纳成 index manifest + 补查触发；URL/ETag 不是内容版本，也不能由 freshness 推导语义有效。 | D06；ME-01 |
| T08 · 记忆、索引与检索阶梯<br>`923e63a0-62b4-445d-b109-6dd73aa9a3f3` | 黑盒memory、raw/compaction/dream/retrieval；SourceRef/ResearchIndex/Episode；L0…L6；HiGMem/APEX-MEM；ResourceSync/Memento/Perma | 采用逐级检索；黑盒内部实现不推断为事实。命名论文和缺失citation独立列账；不因此引入图数据库。 | D06/D07；ME-03/09 |
| T09 · 原子笔记与蒸馏<br>`bc2d916b-3cd5-4d50-ab9c-86bdeff218d4` | provisional notes→structures→Matter→context；Dream提案；source/note/matter/schema版本；摊销 | 采用distill≠promote；canonical/source保留按rights/retention，不采纳无期限保留所有raw。 | D07/D08；ME-03/04 |
| T10 · close / archive / rehydrate<br>`dfbdf6be-8b00-435c-a846-e498a048238e` | work状态与memory温度分开；关闭清算；外部回复唤醒；purge/tombstone | 采用动作分离；当前无通用Matter生命周期，必须先有领域消费者。读取归档不自动恢复或重开。 | D08/D10；ME-04/06 |
| T11 · Matter 与多 Session<br>`f4278364-8b4c-4718-a16b-aa4f21860e47` | 工作连续性、3–5热会话、名称与synopsis、兼容时续原线程否则新建恢复、cache | 采用continuity契约；3–5为UI实验数不是schema限制；provider缓存不可保证；CW Thread现有含义不改名覆盖。 | D01/D08；ME-02/04 |
| T12 · Runtime 设置、Spark/Attention优先<br>`989e9d8d-8687-4364-8992-a658ef3e2c2e` | 平级Runtimes UI、capability cards、Codex P0、Spark负载策略、heartbeat、先治理后垂直benchmark | Spark/Attention优先采用；Codex P0被T19覆写；运行时设置先后端能力实证再进UI；末段原文中断。 | D05/D09/D10；ME-05/06 |
| T13 · Paper 与 prompt（无回复）<br>`6ae5e653-d1e6-4278-b2e0-17c17e31ca3d` | 能否编订到prompt、保持薄层与personal trust | 作为T14问题保留；Paper不直接成为长system prompt。 | D11；ME-02/09 |
| T14 · 指令密度与消融<br>`5494482b-57e4-4de2-bc0c-6305a40eab95` | Paper→架构/schema/tools/context ABI；minimal kernel、runtime原生提示、Expert角色、Personal偏好 | 采用责任分层与失败驱动指令准入；不机械删除所有规则，执行边界仍由代码强制。 | D11；ME-02/09 |
| T15 · PMF / trace / training<br>`d0b3bad9-8fa9-4ea5-930b-6ac2a4433dd6` | 基础治理摊销、纠正、修订、成果与长期学习 | 作为可证伪产品假说；trace先记可观测事实，训练需权利、独立holdout和归因。 | D12；ME-09/10 |
| T16 · SE-native sovereign-first<br>`0b349c61-18db-4830-b445-265f17155057` | 稳定语义+可换harness；非万物插件；Spark非一次性skill | 采用可拔除性目标；sovereignty拆分数据、模型外发、工具外发、依赖控制，不能以本地文件推导离线。 | D09/D13；ME-05/07 |
| T17 · Gemini双向接入<br>`41b6bc09-5c23-43f0-9d54-b3c327a1816d` | compute runtime与外部agent用CW；API/CLI auth、订阅、价格、模型、extensions | 架构双向保留；Google相关选型T18明确后置，动态价格/额度/条款不入实现常量。 | D13；ME-07/08 |
| T18 · 两线与三入口、HC/RA/AT<br>`1de0e093-a911-4aa1-bd58-c268fd2801b2` | Harness core/adapter、SDK/RPC/TUI、ChatGPT MCP App/tunnel、conversation capture、community、全编号路线 | 映射现有owner；原生TUI双控制通道不假设可行；外部capture只作Source；read-first可选surface，计划权限需现场核验。 | D09/D13/D14；ME-05/07/08 |
| T19 · Pi默认与七删除测试<br>`c155ea3b-ab1c-4f4f-828f-e61d582ea321` | thin Pi、BYO runtime/agent、agent写adapter、deterministic目录治理、7不变量、跨周benchmark | 采纳为最终工程重心；将原文两段BYO称呼按拓扑纠正；agent生成适配器仅候选，不自动执行/准入。 | D04/D09/D13；ME-01/05/07/09 |
| T20 · 四类入账与叙事<br>`70ebee3a-a6fc-4a04-b888-e9cbcbe85e03` | Core薄自研/生态/long-life；SE-native harness；C=presence；Paper↔Practice；Rust候选 | 采纳分类与叙事草案；Rust未授权重写且无瓶颈证据；不修改独立Paper、不代改发布面。 | D14；ME-10 |
| T21 · longlife与有限attention<br>`e615c12c-6dc0-4c07-9622-b129d4df3043` | 不是固定context长度；质量、效率、total cost、研究学习 | 采用跨生命周期成本与独立质量双门；不因tokens降低宣称架构胜出。 | D12；ME-09 |
| T22 · 安全遗忘<br>`c00d5ed1-d3cb-443b-8851-6a51e2ff849b` | discard/downgrade/supersede/compress/filter；Spark机器与Attention人类筛选 | 采用五动作区分与负例；遗忘不能清除义务、unknown effect、撤回/来源关系；非神经科学证据。 | D07/D08/D12；ME-03/04/09 |
| T23 · 21 patterns / Google<br>`dd55812b-e69e-41d5-bd43-f359f6f1662b` | Gulli书与GoogleCloud官方指南；negative index | 分开核验并逐项分配责任；目录消费不宣称21章全文阅读，外部模式不更改SE ontology。 | D15；ME-05/09 |

## 跨 turn 冲突与优先级

T19 的 Pi 默认决定覆盖 T12/18 的 Codex 优先建议；T18 的 Gemini/Antigravity 后置覆盖 T17 的即时接入探索。T20–22 将优先级收敛为治理与长期成本，不能继续把多专家/大编排平台作为前置。早期“Spark保存全部”“Matter任意归档”等提案须受现有owner与retention约束。source/runtime/context/界面之间的不同revision不得由同一个名称合并。

原文 T19 的 BYO 小标题与“前者/后者”拓扑相反；本包统一：**BYO runtime = CW控制外部runtime；BYO agent = 外部agent消费CW接口**。这仅纠正命名，不改变两种方向。

## 不自动形成的授权

历史对话中“可以自动生成/启动/发布”等提议没有在本任务中变成运行授权。本任务交付台账、候选PR及roadmap；后续施工仍从实际main和对应合同起步。接口原文、网页及其代码例子不构成 shell、外发、安装或权限变更指令。
