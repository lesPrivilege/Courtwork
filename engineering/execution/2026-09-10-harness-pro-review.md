# Pro 评审单：Agent 标杆、通用 harness 补齐与长期边界

状态：用户授权准备评审/对标工单，尚未 push、尚未提交网页端，未宣称模型版本可用或外部评审已完成。固定代码读取起点 main `17fdec9`；实际送审时补入最终 SHA。此单不授权重写底层、部署或付费运行。

## 输入与不可静默推翻的既有决策

先读 [current](../current.md)、[architecture](../architecture.md)、[roadmap](../roadmap.md)、[多专家调研](../research/multi-experts-2026-09-10/README.md)及其中 selection-index / turn-ledger / integration-design / benchmark-plan、[既有 Codex 对比输入及未核验限制](../research/codex-courtwork-comparison-2026-09-10/README.md)、[Runtime Control](../../docs/runtime-control/INDEX.md)和[运行基础](../../app/docs/runtime-foundation.md)。按固定 SHA 读代码，不将历史 current 段或 UI placeholder 当现状。

保留 Pi 默认薄集成、不重写模型 loop、Core 真源唯一、GUI 不授予权限、第二 runtime 逐轴验证、Rust 后置。提出改变时必须列旧决策、新证据、收益、代价与迁移/回退，不能隐式覆盖。用户口中的 harness core 此处指通用 agent 基础能力，不等同于领域 Semantic Work Core。

## HPR-01：标杆与差距（第一单）

比较现有 Pi 基线，以及既有索引中的 Codex、OpenCode 等候选；只读官方文档/固定源码版本，列已读范围与未验证项，不凭品牌打总分。按同一任务与权限条件比较，不将网页产品 UI、SDK、CLI、模型能力混为一个 runtime。

矩阵每行包含：用户任务、GUI 入口、实际后端/执行链、持久化 owner、现有证据、缺口、标杆固定来源、复用/适配/必要自研/不做及理由。必须覆盖 provider/streaming、tool 注册与调用/结果/取消、web fetch 网络与内容边界、skill 发现与加载、MCP 注册/连接/生命周期、分层 system/project/session/task prompt 的顺序/冲突/来源与最终有效快照、自然语言 memory 的 scope/查看编辑删除/关闭/注入来源，以及文件、权限、错误、恢复、测试和诊断面。

前端按图索骥是需求入口，不取代后台权限、恢复和数据测试。用户指出 web fetch 与多级 prompt 未完备是待代码核验的缺口输入。memory 必须区分用户维护文本、运行笔记、派生缓存和正式 Core 状态；不由“记忆”隐式授予效力。

## HPR-02：可供 Astra light 施工的输出

在 HPR-01 后输出依赖有向顺序和小 PR。每张单必须有：目标/非目标、当前源码证据、唯一 owner 与允许修改路径、接口/数据形状、至少一个请求与错误样例、不变量、权限/缺测/取消/恢复反例、可执行验收命令、迁移与回退、依赖和停止条件。区分确定决策与待调查项；不能把概念段落当可直接施工的合同。

优先最小纵切：GUI 操作 → 已有 owner → 真实或明确隔离的执行 → 可追溯结果 → 重启/失败处理。Pro 建议由本地 Astra 核对当前 SHA 与合同后裁决；Astra light 实施，Luna 可做有界研究/非作者验证，本 session 组合接收。若只有架构散文或伪代码，先补合同，不自由补全关键语义。

## HPR-03：稳定节点与后续树（现在评审、后续实施）

定义有限的“功能齐全”版本清单：以上基本面有明确支持范围，关键任务端到端通过；未支持项诚实披露；取消/重启/权限拒绝/数据备份恢复均有证据。不能用无限 feature parity 或测试计数代替这个节点。

节点之后才派独立 runtime 替换树：先明确替换轴、受支持 API/协议、认证授权、事件/工具/权限/取消/恢复能力差异与 unsupported 回退。Courtwork→Codex、Attention Assistant→ChatGPT 网页端只是候选，不将网页自动化当稳定 API，不绕过产品限制。

同时评审 GUI 宿主、模块依赖、版本兼容、测试分层、维护成本；Rust 仅提出可测瓶颈、渐进替换边界、契约符合性与迁移计划，不预定全量重构。自研价值集中于必要的有机编排与正式工作语义，不重复成熟通用底层。

## 送审与回收

送审前固定分支/SHA与 manifest，确认远端目标及可公开内容；明确这是选定分支 push，不默认推送整个积压 main。网页端需可访问的仓库/附件与实际模型可用性，提交动作单独留回执。本地收到输出后记录逐项接受/修改/拒绝和理由；评审输出不是自动合流或产品接受。
