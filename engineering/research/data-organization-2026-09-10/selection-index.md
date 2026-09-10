# 局部选型索引

2026-09-10 核验。链接为原始作者、标准或官方项目。这里只消费概念与反例；没有安装或采用这些运行时。

| 来源 | 核验与可消费内容 | 既有归属 / 限制 |
|---|---|---|
| [Data Mesh](https://martinfowler.com/articles/data-mesh-principles.html) | 原作者四原则同时涉及组织责任与技术结构 | DS-00 归属盘点；分析数据背景不可直接等同正式工作 |
| [ODCS](https://bitol-io.github.io/open-data-contract-standard/latest/) | schema、team、roles、SLA 分节；页面说明自 3.1.0 起分节，不据此声称 3.1 为最新版本 | DS-00 / DS-03；取 contract 检查表，不建 registry |
| [Confluent compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) | backward / forward / full 与 transitive 的区分 | DS-03 / AM 兼容；读写方向和历史版本集合须显式，不绑定 Kafka |
| [OpenLineage](https://openlineage.io/docs/spec/object-model/) | Job 定义与 Run 实例、输入输出、可扩展 facets | BG-02 / Runtime；运行成功不产生 Core 接受 |
| [W3C PROV-DM](https://www.w3.org/TR/prov-dm/) | Entity / Activity / Agent 及生成、使用、派生关系 | LG 来源 / Core 证据；不引 RDF 运行时、不混同归因与授权 |
| [Backstage catalog](https://backstage.io/docs/features/software-catalog/) | 目录中的所有权与来源元数据 | DS-00 / AM-A / ME；目录展示不授予修改权 |
| [TeamAPI as Code](https://github.com/TeamTopologies/TeamAPI-As-Code) | Luna 核验：能力、服务、交互与依赖接口 | ME-D01 / AM 生命周期；不复制人类会议字段 |
| [TeamAPI / SDR](https://teamtopologies.com/news-blogs-newsletters/social-decision-records-and-team-apis-documenting-human-interactions-for-better-collaboration) | Luna 核验：当前接口与决策上下文/后果/历史分开 | 既有 decisions / Core decision，不把每个 Event 升为决策记录 |
| [Cedar](https://docs.cedarpolicy.com/auth/authorization.html) | Luna 核验：principal/action/resource/context、默认拒绝与 forbid 优先 | Core / Runtime / BG 权限；只列候选，不称已接入 |
| [OPA](https://www.openpolicyagent.org/docs) | Luna 核验：结构化输入上的 policy decision 与 enforcement 分离 | LG / AM / Core；是否拆 evaluator 由真实规则规模触发 |
| [Organizational Memory](https://arxiv.org/abs/2607.03228) | 标题与原始论文入口已核验，近期研究信号 | 不作为成熟理论、性能结果或共享组织状态库的采用依据 |
| [Governance by Design](https://arxiv.org/html/2605.20210v1) | 原始论文入口已核验，研究提案 | 不将其架构建议升级为通用必需条件 |

## 已登记、尚未针对接缝核验

输入另提到 dbt contracts、CloudEvents、W3C Trace Context、CODEOWNERS、Backstage Scaffolder、DataHub、OpenMetadata、BPMN/Camunda、Temporal。保留在[完整输入](inputs/2-assistant.md)，不因未入当前短名单而丢失。当前没有由这些条目支持的采用决策。

BPMN 的 wait / escalation / compensation 只作为 MA/Attention/AM 的后续问题表；Temporal 的持久等待/重放候选归 AM-B、MA、DS-04。若有真实消费者，再固定官方版本、恢复语义与适配代价。标准事件外壳、trace correlation 和业务幂等键不互相替代。
