# Long-life 全场景架构 · 来源与设计回执

2026-09-08。用户要求：“按照 SE 宣言的全场景或全交互方式，进行 Longlife roadmap 架构设计。”持续沿用分工：Luna 做 Paper/本地覆盖与外部溯源，Astra 负责整体架构及路线撰写。

主文是 [engineering/roadmap.md](../../roadmap.md)。本目录只保存来源和设计检查，不另设 Longlife 阶段、工单状态或 Paper 修订账本。本轮为文档架构设计，没有启动运行服务、实现新产品功能或执行新增场景实验。

## 来源与基线

| 材料 | 证据及使用方式 |
|---|---|
| SE 宣言 | 实际载体为 Canonical《Schema Engineering：让工作存在于模型之外》，并结合 Practice 的共享场景、投影与验证要求。[Luna Paper 覆盖](evidence/paper-coverage.md) 给出固定9.3坐标、候选9.6坐标与三份文本 SHA-256 |
| 当前工程 | `codex/fresh-courtwork` / `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`；工作树含活动 WSK 和前轮研究文档。[Luna 本地覆盖](evidence/local-coverage.md) 按设计/实现/缺口分列，引用的是审阅时源码与旧路线坐标 |
| 成熟机制 | [Luna 外部来源](evidence/upstream.md)：Temporal durable execution/effect boundary、LangGraph interrupt/checkpoint、VS Code view/model/file 生命周期；均为官方文档，访问日期2026-09-08，没有安装依赖或执行上游代码 |
| 首个样本 | [NDA / Experts 研究](../experts-hotplug-2026-09-08/README.md)、其H0–H5及已有DSH/MCP溯源；保留有界消费者，不让其逐规则语义成为全场景 ontology |

CourtWork 仍通过 [PAPER.md](../../../PAPER.md) 绑定 SE 9.3 / `f8ecb091895559389bb4e75f3c6f28052b71c5a3`。9.6 是未提交候选，路线使用其中加强的检验作为设计输入，不声称它已成为工程采用或实验通过的版本。

## Astra 的合成取舍

1. 将路线组织为**场景治理厚度、三条工作链、模块所有权、交互语义、表面与通道、部署/信任、长程协作、代表验证集、R0–R5、触发器、发布与退出**。保留 R 与 PT 的原责任，没有采用 Paper 探索报告建议的第二套 L0–L5 编号。
2. 场景以 judgment × continuity × consequence 分流；普通探索不强制 Matter，单次 consequential action 可只部署 commitment boundary。高保证持续工作才采用完整 profile。
3. 覆盖专家示范编订、日常工作提交和生产反馈改进三条链。部署覆盖 host-loaded/embedded/remote 与不同 system of record owner 的正交组合；保持一类正式对象一个 owner。
4. 交互包括人工直接编辑、提议、委派、检查、补证据、修订、接受/发布、改判、等待、协作、配置、经验晋升及归档/删除。动作后果由领域 Contract 决定，不要求实现一套全局通用按钮。
5. NDA 是结构化逐项裁决的见证；补主张校勘、整改与弱 commitment 对照，再按需验证单次外部提交和既有系统 sidecar。不同领域共享机制，不共享未经验证的专业规则。
6. Runtime、编辑器、存储、持久等待等优先消费成熟机制。Temporal/LangGraph 不被直接选为依赖；VS Code 的内存 document model 不等于持久工作真源，最后一个 view 关闭只允许释放视图/model资源，不能删除正式成果。
7. 对 voice/multimodal、持久等待/通知、多人草稿同步和具体UI组合的展开，是本轮对既有语义边界的架构推导，不是声称 Paper 已提供相应 API 或这些功能已实现。只有真实消费者需要时才进入局部选型。

## 主文与 Paper 对应

| Roadmap 内容 | 固定概念与候选补充 |
|---|---|
| §1、§8 场景分流与见证集 | Canonical §2.4四问、§12.1适用范围；Practice §7.2三种共享场景与弱commitment对照 |
| §2、§11 三链与经验发布 | Canonical摘要A/B/C、§7–§11；Practice §3.5、§6；Evidence/Reviewer/rights独立于评分 |
| §3、§6 所有权与部署 | Canonical §4、§13.2/13.3；Practice §3.1；保留现有M01–M14并映射责任 |
| §4、§5 全交互与投影 | Canonical §4.8双轴状态、§6 Contracts；Practice §5三种投影、renderer/review grammar |
| §7 长程、协作、Attention | Canonical §3–§5、§8三层activation；Practice §2.7、§4、§7.3；9.6加强的trusted recovery/related-failure/context检查单列为候选设计依据 |
| §9、§10、§12 依赖、验收与退出 | Canonical §14/§15及既有R/PT分工；复用Practice Index已有验证队列，不写第二份Paper ledger |

## 本地缺口如何进入路线

本地已具备单机Session/Run、同Session历史、权限和样本Core的提案/裁决。跨Session附着既有Matter、编辑后新Candidate lineage、producer缺席读取、durable async、外部效果对账、组织身份与跨表面接口仍有缺口。路线将其写为条件性施工与反例门，没有从原基线134项测试推断这些能力已通过；本轮未重跑产品测试。

旧roadmap中的“没有prototype/方向”删除，设计并行仍通过模块和全交互切片推进。pre-takeover中的旧“当前位置”和旧只读限制显式标为历史，并保留原叙述及DEC-009来源。活动WSK与V7等历史设计材料保持原文件；其范围和当前合流资格仍从current/相关契约读取。

## 后续交付纪律

本轮更新长期roadmap，并为architecture/core-contracts标清continuity切片适用范围；current只增加设计入口。具体下一张PR先绑定届时真实HEAD、writer与所选场景，再由Luna局部对照、Astra处理必要自研与集成。路线本身不关闭任何R/PT门。

## 文档验证

Luna 最终有界只读复核通过：`git diff --check` exit 0，69个本地Markdown链接/锚点解析成功，原Experts的`#nda--experts-验证路径`链接保持兼容。未发现阻塞性语义矛盾；没有运行产品测试、provider或新增场景实验。[最终复核记录](evidence/final-review.md) 将文档一致性与产品验收分开。

复核中的非阻塞建议已处理：Paper覆盖报告的示例`git show`路径已展开为三份具体源文件，便于按固定SHA重读；不改变来源结论或Paper采用版本。
