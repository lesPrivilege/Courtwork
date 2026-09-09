# Luna 外部索引探索回执与 Astra 消费

2026-09-10，用户明确分工“luna explore，Astra 掌握关键裁决、撰写 pr”。Luna仅只读公开来源与导出对话，没有改仓库、运行产品、安装依赖或作架构接受。以下定位与阅读范围由Luna报告；Astra将其作为来源探索证据消费，不称非作者产品验收。

## 书目与目录

[Springer书页](https://link.springer.com/book/10.1007/978-3-032-01402-3)给出前18个模式；[第19章](https://link.springer.com/chapter/10.1007/978-3-032-01402-3_19)、[第20章](https://link.springer.com/chapter/10.1007/978-3-032-01402-3_20)、[第21章](https://link.springer.com/chapter/10.1007/978-3-032-01402-3_21)补齐21标题。准确标题已用于[负索引](selection-index.md)，正文未逐章读完。作者Antonio Gullí的Google背景不使Springer个人署名书成为Google规范。

[GoogleCloud架构指南](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system?hl=en)另列single-agent、sequential/parallel/loop、review/iterative、coordinator/hierarchical/swarm、ReAct/HITL/custom logic等组织方式，页面更新2026-05-28。Astra消费为**先单执行者，按并发/等待/责任需求选择局部拓扑**；不据此增加平台依赖，也不改变已有MA的能力声明。

## 命名资源补全

| 名称 | 补充定位 / 已读范围 | Astra处置 |
|---|---|---|
| codex-from-chatgpt | [joseanu/codex-from-chatgpt](https://github.com/joseanu/codex-from-chatgpt)，README：single-user MCP bridge，community非官方 | 原拓扑有可定位候选；未固定commit/运行，不能证明原citation映射或长期稳定。ME-07/08采用前再固定版本、auth与执行权限 |
| pi-acp-agents | [buihongduc132/pi-acp-agents](https://github.com/buihongduc132/pi-acp-agents)，README标v0.5.0、MIT、测试自报、未实现项及surface drift | 只提取adapter/registry/failure isolation机制；未复跑测试，不搬DAG/mailbox平台，不当生产Pi已接通 |
| HiGMem | [arXiv:2604.18349](https://arxiv.org/abs/2604.18349)，题名/机制概要：Hierarchical and LLM-Guided Memory；event摘要后选择相关turn | 与ME-03分层检索有关；摘要/概述证据，不是全文复现；性能不作为本地阈值 |
| APEX-MEM | [arXiv:2604.14362](https://arxiv.org/abs/2604.14362)、[ACL-long.749](https://aclanthology.org/2026.acl-long.749/)，题名/机制概要：半结构化memory、property graph、append-only temporal events、query-time conflict | 保留时间/冲突检索启发；CW正式冲突/决定仍归Core，query-time判断不能改accepted状态；不据此采用graph store |

这些是本次新找到的公开来源，不把历史不透明citation ID反解为这些页面。社区仓库存在、README的版本/测试数与论文结果均不等于本地可用/可维护证据。ResourceSync/Memento/Perma、Antigravity SDK及历史plan限制仍按source-index的未核验项处理。

## 关键裁决归属

Luna建议中“CW拥有memory/goal/priority”只按责任理解，Astra明确收窄为**复用既有Core、Runtime与Attention owner**，不新增通用goal/approval/memory ledger。外部runtime的retry不适用于未知外部效果；ME-05的适配必须保留AM-B/BG-02/BG-03边界。法律场景不是通用权限模型的唯一依据。最终路线、PR与接受标准均由Astra在本包另行裁定。
