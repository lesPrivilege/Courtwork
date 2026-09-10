# Pro 评审单：Agent 标杆、通用 harness 补齐与长期边界

状态：用户已授权审查合并本送审包并 push，随后由用户自行唤醒网页端 Pro；没有代发网页端消息。固定产品/代码基线 `a2b084da09ba14a92f4e94bae49c9540d2e6dced`，送审文档取交接回执中的最终提交。远端为 `lesPrivilege/Courtwork`，仅推选定送审分支，不自动更新远端 main。未宣称模型版本可用或外部评审已完成；不授权部署、付费运行或破坏性迁移。

## 授权：Pro 主导架构设计与必要自研

用户已同意架构解耦。Pro 不限于顾问，可裁决 donor 复用/替换/淘汰、必要自研、模块与接口设计、依赖顺序及施工拆单；允许提供参考代码与测试。已有裁决可依据新证据重开，但必须明确列出被替代决策和理由，不能静默覆盖。Pro 负责架构 Design，本地 Astra 核对实际基线与可执行性、组织施工和集成，不把关键设计重新留给实现者猜测。超出已授权范围的权限/正式状态归属改变、破坏性迁移及外部效果，必须列为单独决策请求。

目标边界：通用 Agent Harness 负责模型/loop、tools/skills/MCP、分层 prompt、普通自然语言 memory 与运行控制；Semantic Work Core 负责来源版本、候选/证据、人的正式决定、失效关系与持续工作状态，是核心自研部分。前者以成熟实现复用为主，必要处自研适配和编排；后者也复用成熟存储等基础设施。普通 Chat 应可只运行 Harness；GUI 与应用层组合两者，不创建第二权威状态。先逻辑模块解耦，不预设拆仓库、微服务或换语言。

Pro 必须交付当前代码归属图、反向依赖清单、两层最小契约及错误/恢复语义、Pi 保留与替换接缝、不中断前端施工的迁移序列。架构边界可以现在设计，通用基础完备优先；Work Core 深化、第二 runtime 和 Rust 实施继续后置。

## 输入与不可静默推翻的既有决策

先读 [current](../current.md)、[architecture](../architecture.md)、[roadmap](../roadmap.md)、[多专家调研](../research/multi-experts-2026-09-10/README.md)及其中 selection-index / turn-ledger / integration-design / benchmark-plan、[既有 Codex 对比输入及未核验限制](../research/codex-courtwork-comparison-2026-09-10/README.md)、[Runtime Control](../../docs/runtime-control/INDEX.md)和[运行基础](../../app/docs/runtime-foundation.md)。按固定 SHA 读代码，不将历史 current 段或 UI placeholder 当现状。

保留 Pi 默认薄集成、不重写模型 loop、Core 真源唯一、GUI 不授予权限、第二 runtime 逐轴验证、Rust 后置。提出改变时必须列旧决策、新证据、收益、代价与迁移/回退，不能隐式覆盖。用户口中的 harness core 此处指通用 agent 基础能力，不等同于领域 Semantic Work Core。

## HPR-01：标杆与差距（第一单）

比较现有 Pi 基线，以及既有索引中的 Codex、OpenCode 等候选；只读官方文档/固定源码版本，列已读范围与未验证项，不凭品牌打总分。按同一任务与权限条件比较，不将网页产品 UI、SDK、CLI、模型能力混为一个 runtime。

矩阵每行包含：用户任务、GUI 入口、实际后端/执行链、持久化 owner、现有证据、缺口、标杆固定来源、复用/适配/必要自研/不做及理由。必须覆盖 provider/streaming、tool 注册与调用/结果/取消、web fetch 网络与内容边界、skill 发现与加载、MCP 注册/连接/生命周期、分层 system/project/session/task prompt 的顺序/冲突/来源与最终有效快照、自然语言 memory 的 scope/查看编辑删除/关闭/注入来源，以及文件、权限、错误、恢复、测试和诊断面。

前端按图索骥是需求入口，不取代后台权限、恢复和数据测试。用户指出 web fetch 与多级 prompt 未完备是待代码核验的缺口输入。memory 必须区分用户维护文本、运行笔记、派生缓存和正式 Core 状态；不由“记忆”隐式授予效力。

## HPR-02：可供 Astra light 施工的输出

在 HPR-01 后输出依赖有向顺序和小 PR。每张单必须有：目标/非目标、当前源码证据、唯一 owner 与允许修改路径、接口/数据形状、至少一个请求与错误样例、不变量、权限/缺测/取消/恢复反例、可执行验收命令、迁移与回退、依赖和停止条件。区分确定决策与待调查项；不能把概念段落当可直接施工的合同。

优先最小纵切：GUI 操作 → 已有 owner → 真实或明确隔离的执行 → 可追溯结果 → 重启/失败处理。Pro 在上述权限内裁决，本地 Astra 核对当前 SHA、既有合同与冲突并登记消费；有新证据或授权冲突时明确反馈，不静默改写 Pro 设计。Astra light 实施，Luna 可做有界研究/非作者验证，本 session 组合接收。若只有架构散文或伪代码，先补合同，不自由补全关键语义。

## HPR-03：稳定节点与后续树（现在评审、后续实施）

定义有限的“功能齐全”版本清单：以上基本面有明确支持范围，关键任务端到端通过；未支持项诚实披露；取消/重启/权限拒绝/数据备份恢复均有证据。不能用无限 feature parity 或测试计数代替这个节点。

节点之后才派独立 runtime 替换树：先明确替换轴、受支持 API/协议、认证授权、事件/工具/权限/取消/恢复能力差异与 unsupported 回退。Courtwork→Codex、Attention Assistant→ChatGPT 网页端只是候选，不将网页自动化当稳定 API，不绕过产品限制。

同时评审 GUI 宿主、模块依赖、版本兼容、测试分层、维护成本；Rust 仅提出可测瓶颈、渐进替换边界、契约符合性与迁移计划，不预定全量重构。自研价值集中于必要的有机编排与正式工作语义，不重复成熟通用底层。

## 送审与回收

送审前固定分支/SHA与 manifest，确认远端目标及可公开内容；明确这是选定分支 push，不默认推送整个积压 main。网页端需可访问的仓库/附件与实际模型可用性，提交动作单独留回执。本地收到输出后记录逐项接受/修改/拒绝和理由；评审输出不是自动合流或产品接受。

完整回收规范与 manifest 见 [Pro 输出登记与消费](../research/harness-pro-2026-09-10/README.md)。输出尚未返回，不建立虚构的评审结论或接受记录。
