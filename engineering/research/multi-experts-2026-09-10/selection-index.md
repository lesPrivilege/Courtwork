# 选型裁决与负索引

下面是 Astra 在固定基线上的设计裁决，**不是这些候选能力已经实现**。来源编号见 [source-index](source-index.md)，完整需求去向见 [turn-ledger](turn-ledger.md)。不以“成熟实践”替代固定版本测试。

| 裁决 | 当前选择 / 自研边界 | 复用或备选 | 不采纳 / 重开触发 |
|---|---|---|---|
| D01 Expert 分层 | role/contract preset、binding、resolved execution 分开；现有配置优先，按需新增versioned definition | 当前extension/profile/model/effort；S05–08/30 | 不把Expert等同runtime或model；出现第二真实角色与可审阅差异后才推广独立registry |
| D02 在场与选择 | composer显示当前配置，presence先从绑定与Run投影；Assignment属于工作责任 | 现有UI adapter与Thread；S01/09/10 | 不用头像/绿色点推断运行或授权；长期租约必须有离场/断线消费者 |
| D03 双路由 | source event→现有Matter匹配，与已授权Expert候选选择分开 | exact external key、人工关联，后测cheap classifier | 不自动新建/跨Matter写入；歧义测得阻塞后才加模型路由；MoE无算法承诺 |
| D04 确定性资料治理 | LG manifest/rendition、稳定SourceRef、hash、路径边界、增量失效 | filesystem/成熟parser，先exact/lexical | 不新造Spark来源库、不首发向量库；复杂格式按明确失败与收益加入 |
| D05 Spark负载分层 | metadata/diff确定性；模型只给候选；保留强模型兜底与独立核验 | S19–23启发任务级实验；现有async工具/Explore | token推测≠语义推测≠候选任务；不硬绑Luna或论文速度；false accept不达标就取消cheap层 |
| D06 检索阶梯 | L0 known ID→L1 lexical→L2 structured→L3 hybrid→L4展开邻域→L5重读原文→L6 agentic，按需跳级 | LG-02/04、BG-01渐进披露；S11/12 | 不要求每次跑完七级；结构是定位器，hash/权限/适用版本在读取时再验；ETag只作hint |
| D07 笔记/压缩/Dream | 原观察、可删派生、需保留的未接受候选与正式决定分层；Dream输出新候选 | 当前Core候选/来源、runtime compaction；S24/26/27 | 不自动promote、不把事实藏私有memory；有价值的唯一观察先登记再允许删除缓存 |
| D08 长期状态与遗忘 | close/archive/read/rehydrate/reopen/purge分别定义；恢复保留义务/冲突/unknown效果 | 领域Core与Runtime histories；S25/29–31 | 无通用Matter lifecycle先不造表；读archive不resume；固定3–5热session仅UX实验 |
| D09 薄harness与替换 | 保留Pi当前AgentSession路径；在真实调用边界做FakeRuntime/第二adapter符合性 | Codex app-server候选，其次ACP；Pi RPC仅跨进程需要时 | 不为替换而重写Rust、不最低共同分母吞掉能力差异；native/adapted/unsupported分别记 |
| D10 心跳与持久执行 | timer/event只是输入，确定性去重和预算先行；新Run重验绑定与权限 | 已有AM-B只读任务、BG-02 lineage、Attention owner | BG-02不是scheduler；消息不wake；真实长等待/效果压力才比较Temporal/Restate，不先建DAG |
| D11 指令分层 | native runtime提示保留，CW只注入必要上下文与规则，Expert角色/个人偏好分别限定 | 现有AGENTS/skill/extension；S12/36/38 | 不整本Paper注入、不无条件删提示；以指令消融与权限反例判断 |
| D12 质量与生命周期成本 | 合格成果/旧版误引/恢复/人工成本共同门；trace记录可观测事实 | SE continuity基线、Usage/request telemetry | token下降不单独证明收益；PMF/训练必须有真实使用、权利、heldout、reversal |
| D13 双向生态接入 | BYO runtime由CW控制；BYO agent通过受限CW接口消费；read-first | MCP/CLI/SDK、Codex/ACP，Google后置 | 不由MCP可见性授予Core写权；native TUI须证明单控制者，否则只另开独立session；DOM仅Source |
| D14 工程与产品叙事 | SE-native long-running work作为定位候选，C=presence保留解释价值 | 原发布owner、独立brand包 | 不把叙事/图标变成权限或验收；不承诺所有runtime、完全离线、PMF或多专家收益 |
| D15 模式目录 | 下表逐类定位到已有owner；按真实消费者采用局部 | Gulli目录与GoogleCloud拓扑建议 | 不把外部模式变SE ontology，不搬整个agent框架 |

## 21 个模式的 negative index

目录依据 Gulli 书目/目录及Luna补核的19–21章标题，见[探索回执](exploration.md)；章节全文未逐章消费。下列归属是 CW 的本地判断；“复用runtime”表示优先检查当前runtime是否支持，**不代表锁定Pi已经交付每种能力**。GoogleCloud指南另用于单/多agent拓扑选择，不是本书的发布机构。

| 模式 | 优先复用 / CW必要责任 | 施工约束 |
|---|---|---|
| Prompt Chaining | runtime/tool loop；CW绑定来源与成果版本 | 不另建通用链DSL |
| Routing | runtime内部路由；CW拥有Matter匹配与权限下Expert选择 | route不授予权限 |
| Parallelization | runtime lane；MA child入口与结果归并 | 生产并行仍未接通，不把消息当执行 |
| Reflection | runtime自检；独立评测/人类决定归不同owner | 自评不是接受 |
| Tool Use (Function Calling) | Pi/MCP工具调用；CW执行处scope/审批/效果 | readOnlyHint不等于只读约束 |
| Planning | 模型规划；工作义务与完成条件归Contract | plan完成不是work完成 |
| Multi-Agent Collaboration | MA Thread/消息与候选汇合 | 独立责任才新增Operator |
| Memory Management | runtime窗口管理；Core来源/修订与LG派生 | 不复制canonical memory |
| Learning and Adaptation | 模型/外部学习设施；CW归因、rights、release | 不自动改活跃规则/评分器 |
| Model Context Protocol | 标准客户端/服务端 | transport不拥有业务效力 |
| Goal Setting and Monitoring | runtime执行目标；Core义务、Attention信号 | 不增加通用goal真源 |
| Exception Handling and Recovery | 原生取消/错误；Runtime持久结算/unknown | 查询恢复，不盲重放外部效果 |
| Human-in-the-Loop | runtime审批交互；CWtyped decision与当前版本 | 工具allow不等于成果accept |
| Knowledge Retrieval (RAG) | 检索库/工具；LG版本定位与披露 | 先exact/lexical；旧命中不复活撤回事实 |
| Inter-Agent Communication (A2A) | 现有本地coordination；外部协议另adapter | 通信不wake、不转移authority |
| Resource-Aware Optimization | provider/cache/调度设施；CW预算与全成本证据 | 价格动态；不以便宜替代质量 |
| Reasoning Techniques | 模型/runtime能力 | 不自造CoT引擎或收集私有推理 |
| Guardrails/Safety Patterns | native限制加CW真实权限/版本校验 | 声明、提示词均不能替代执行处检查 |
| Evaluation and Monitoring | 成熟测试/telemetry；CW任务oracle/heldout | fixture符合性≠真实质量增益 |
| Prioritization | 确定性政策+模型建议；Attention队列 | 排序不是生效决定，不无限通知 |
| Exploration and Discovery | runtime探索/搜索；CW来源、候选、证据 | 不因发现新依赖自动安装/启用 |

## 选型回执要求

每次重开一行只处理一个替换轴：固定base与donor SHA、实际调用入口、capability矩阵、权限/历史读取/恢复反例、成本、撤回条件。版本不兼容就报告unsupported，不通过静默降级、替换system prompt或扩大tool allow掩盖缺口。没有第二消费者不发布通用SDK；有运行瓶颈之前不以语言重写作为路线前置。
