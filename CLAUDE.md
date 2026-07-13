# Courtwork

法律垂类 Agent，直接对标 Cowork 的交互范式：案件文件夹级协作 + 场景按钮 + 结构化产出 + 留人确认。面向中国律所/企业法务团队。产品与战略文档见 `docs/`（00–05 按顺序读，10 是实施切分）。

## 给 Claude Code 会话的总纲

本仓库的实现方式是：**每个层（package/service）由独立会话认领实现**——默认由 Claude Code（Sonnet 5）担任，架构会话可按工单另行任命（如 B 阶段 UI 任命 sol；角色治理三不变量见 AGENTS.md）。开工前必读三样：本文件、`docs/10-实施切分-层与工单.md`、你认领那层的 `SPEC.md`。只做 SPEC 划定的范围，跨层需求写进对应层的 SPEC 提 TODO，不要顺手实现。

## 架构与依赖方向

```
packages/schemas   ← 一切的根：领域 schema（typed artifacts），零依赖
packages/registry  ← 场景注册表：场景定义 schema + 加载校验（依赖 schemas）
packages/core      ← agent core：headless、协议化、provider 无关（依赖 schemas/registry；作为唯一编排层消费 tools/output；demo-data 仅限 src/composition 装配点——2026-07-12 验收核对与实况同步）；2026-07-13 起 core 增 @courtwork/legal 与 @courtwork/reading-view 依赖（限装配/验收白名单，机器守卫强制），demo-assembly 同时为 legal 包绑定点
packages/tools     ← 确定性接口：主体核验、引用校验（可依赖 schemas，MVP 两工具当前无需，见 packages/tools/SPEC.md TODO）
packages/output    ← 产出管线：md/JSON → 带修订痕迹与批注的 .docx（依赖 schemas）
packages/reading-view ← 阅读视图管线：docx/md/txt/含文本层 PDF → md 阅读视图 + 段落级 SourceAnchor 映射（依赖 schemas）
packages/demo-data ← 演示数据：虚构样板案 fixture（数据 + 薄类型化访问器，零依赖，与消费方 src 完全解耦）
services/ingest    ← 卷宗摄取（Python）：OCR → 文书分类 → 实体对齐（产出符合 schemas 的 JSON）
eval/              ← 评测集与回归跑分（promptfoo/DeepEval）
apps/desktop       ← Tauri v2 成品（三栏：左案件列表/中对话/右 Schema 面五工作面）：门禁交互、阅读视图汇流、e2e+16 门禁守护；对 core 运行时消费只走子路径导出
```

依赖只能向上指向 schemas，禁止横向依赖。schemas 是契约，改 schemas 必须过 review 并同步所有消费方。

**`packages/demo-data` 的特殊规则（见 `docs/21-架构决定-演示数据包与样板案.md`）**：任何 src 包（tools/core/output/ingest 消费侧）不得直接 `import @courtwork/demo-data`，唯一例外是显式的装配点（composition root，已落地：`packages/core/src/composition/demo-assembly.ts`，全仓运行时代码唯一导入点——2026-07-12 验收核对）。消费方（如 `packages/tools` 的 demo-fixture 适配器）只暴露"注入点"（如一个查找函数的类型签名），数据源由装配点注入，src 本身零导入。将来某个产出字段（如 `RiskBasis.sourceAnchors`）需要把工具结果的溯源信息塞进 schemas 定义的 artifact 时，**嵌入的形状定义在 schemas，映射逻辑发生在 core，tools 自身保持不依赖 schemas**——依赖方向不因这类未来需求而弯曲。

## 技术基线（详见 docs/05 开源选型报告）

- TS monorepo：pnpm workspaces；Node 22+；严格模式 TypeScript；测试用 vitest。
- ingest 为独立 Python 服务（OCR 生态原因）：uv 管理，OCR 首选 PaddleOCR-VL + PP-StructureV3，备选 DeepSeek-OCR；对外只暴露 HTTP API + JSON（符合 schemas 契约），不让 Python 类型泄漏到 TS 侧。
- agent loop 自研，**只借鉴 pi-mono 的设计形状**（极简、协议化、provider 无关的 Provider 抽象），不引入其代码依赖（license 已核实为 MIT——2026-07-13 docs/71 实抓销账；自研 loop 已成，维持取形不取码）。依据 docs/24：场景执行是声明式固定编排，工具调用由执行器编排而非模型自主选择，通用 agent loop 的核心能力（ReAct 式模型自主选工具循环）被架构绕开，引入依赖是负资产。场景注册表、schemas、摄取管线永远长在本仓库。
- 模型 provider 无关，走统一封装；模型选型由 eval/ 跑分决定，代码里不许写死 provider。

## 五个必须自研加固的节点（开源填不上，是壁垒所在）

OCR 印章/手写、跨文档法律实体对齐、docx 的 WPS 兼容性、卷宗结构还原、法律垂类评测集。这五处允许写"难看但自有"的代码，不允许为省事绕过。

## 工程纪律

- 契约先行：先改/读 schemas，再写实现。所有跨层交互走 JSON schema 校验。
- 每层必须带测试与 golden files（尤其 ingest 与 output：真实样例进、快照比对出）。
- 留人确认是产品纪律：任何"自动执行不可逆动作"的代码路径都不许出现；产出一律是待确认的 artifact。
- 敏感数据：卷宗样例一律脱敏；测试夹具不得含真实当事人信息。
- 语言：代码注释与文档用中文，标识符用英文。
