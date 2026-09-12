# 技术选型 · 当前基线与待验证候选

2026-09-13，Astra。当前方向由[DEC-014](decisions.md)、[五层架构](research/architecture-node-2026-09-13/architecture.md)和[可接管工作区地图](research/architecture-node-2026-09-13/workspace-governance.md)统一；具体实现由[current](current.md)及各交付回执负责。早期OpenCode优先、TypeScript/React/Core语言等候选未被自动采用，原文按273ad12保存到[历史选型快照](research/architecture-node-2026-09-13/archive/options-273ad12.txt)，不再作为当前施工默认值。

## 当前采用及其边界

| 责任 | 当前事实 | 下一次改变需要的证据 |
|---|---|---|
| 本地执行 | Pi三包0.85.1，Node Host调用AgentSession；仍直接依赖SessionManager | 固定任务类的[Runtime Port/替换矩阵](research/architecture-node-2026-09-13/runtime-replacement.md)，不先重写loop |
| 首个真实Provider | DeepSeek经现Pi适配；能力和参数由Host准入/Run绑定/payload hook区分 | 精确endpoint/model/revision、协议/恢复/权限证据；已证profile不代表通用能力 |
| 执行扩展 | Host显式工具、MCP client2.0.0与受控资源；Pi自动发现关闭 | Pi生态能力逐个准入和退出，可信包不冒充沙箱；无需为命名建立新插件平台 |
| Web UI | 现原生JavaScript模块、DOM builder、CSS token/既有组件 | [前端连续性规范](design/agent-interface-2026-09-10/frontend-contract.md)与实际需求；不因历史React候选迁移框架 |
| Work治理与持久化 | Node CoreClient/WorkCoreOwner、Python bridge/Core与SQLite事务；Host JSON/原件/协议日志分owner | 迁移、CAS/幂等、故障/恢复与权限；语言或数据库替换不改正式效力 |
| 资料读取/比较 | Session精确版本reader、独立Intake、同源双版本jsdiff8.0.4 | [数据交付](research/data-surfaces-2026-09-13/README.md)外的格式、范围和引用关系逐个验证 |
| 测试与公开部署 | Node test runner、合成runtime fixtures；既有GitHub Pages静态构建 | 实际变更的行为/浏览器证据；静态发布不等于本地Host或产品资格验收 |

完整代码/owner/版本映射见[Luna实现登记](research/architecture-node-2026-09-13/explore/implementation.md)。本表不重复每个传递依赖版本；实际锁定以源码package/lockfile为准。

## 待验证方向

| 方向 | 已有索引 / 进入条件 | 当前处置 |
|---|---|---|
| Codex原生执行器 | 公开App Server能力、固定schema与受限任务矩阵 | 第二runtime候选；未实现，不阻塞Pi固定coding-profile dogfooding |
| 工作区目录/接管/渐进披露 | BG、LG/DS/RG与[治理地图](research/architecture-node-2026-09-13/workspace-governance.md) | 先一个获准scope的可证明覆盖和exact reader；不是全盘自动摄取 |
| 解析、检索、注释与来源链 | [RD-007](research/RD-007-resource-governance.md)、[成熟实践路线](research/mature-practices-2026-09-12/roadmap.md) | 精确/lexical基线先行；OCR、embedding、graph和DMS adapter按真实缺口比较 |
| 组织治理、多agent Review与Attention | [治理探索](research/architecture-node-2026-09-13/explore/workspace-governance.md)、既有义务闭环 | 先责任与证据合同；多用户ACL、调度、授权委派未完整实现，不采购全能平台 |
| SDK/进程维护、异步与能力贡献 | [局部维护索引](research/architecture-maintenance-2026-09-09/source-index.md) | 固定消费者与升级/退出成本后采用；不用热插拔作所有工作的前置 |
| 桌面壳、Rust与沙箱 | [架构模块](architecture.md)、实际本地权限/分发或隔离需求 | 保留研究；普通子进程不等于隔离，不能从语言标签推断收益 |

## 采用方法

先比较合同适合度，再比较胶水、维护、许可、平台与退出成本。成熟组件用于通用机制，精度投入语义所有权、提交、来源、恢复和验证；若上游已有等价能力，先评估复用或删除本地实现。stars、文档篇幅和测试数量不换算为可靠性。

每项采用记录具体问题/消费者、候选与版本、必需合同、证据及反例、采用方式（配置/SDK/adapter/fork）、维护owner、迁移/导出/回退和重开条件。未满足时保持候选。新增语言/进程需要具体收益；当前已经是Node与Python组合，历史“单语言起步”不再被用于否认实际实现。
