# Courtwork

法律垂类 Agent，直接对标 Cowork 的交互范式：案件文件夹级协作 + 场景按钮 + 结构化产出 + 留人确认。面向中国律所/企业法务团队。产品与战略文档见 `docs/`（00–05 按顺序读，10 是实施切分）。

## 给 Claude Code 会话的总纲

本仓库的实现方式是：**每个层（package/service）由独立的 Claude Code 会话（Sonnet 5）认领实现**。开工前必读三样：本文件、`docs/10-实施切分-层与工单.md`、你认领那层的 `SPEC.md`。只做 SPEC 划定的范围，跨层需求写进对应层的 SPEC 提 TODO，不要顺手实现。

## 架构与依赖方向

```
packages/schemas   ← 一切的根：领域 schema（typed artifacts），零依赖
packages/registry  ← 场景注册表：场景定义 schema + 加载校验（依赖 schemas）
packages/core      ← agent core：headless、协议化、provider 无关（依赖 schemas/registry）
packages/tools     ← 确定性接口：主体核验、引用校验（依赖 schemas）
packages/output    ← 产出管线：md/JSON → 带修订痕迹与批注的 .docx（依赖 schemas）
services/ingest    ← 卷宗摄取（Python）：OCR → 文书分类 → 实体对齐（产出符合 schemas 的 JSON）
eval/              ← 评测集与回归跑分（promptfoo/DeepEval）
apps/desktop       ← UI 壳（三栏：左案件列表/中对话+场景卡片/右结构化交互）。core MVP 完成前只留占位，不开工
```

依赖只能向上指向 schemas，禁止横向依赖。schemas 是契约，改 schemas 必须过 review 并同步所有消费方。

## 技术基线（详见 docs/05 开源选型报告）

- TS monorepo：pnpm workspaces；Node 22+；严格模式 TypeScript；测试用 vitest。
- ingest 为独立 Python 服务（OCR 生态原因）：uv 管理，OCR 首选 PaddleOCR-VL + PP-StructureV3，备选 DeepSeek-OCR；对外只暴露 HTTP API + JSON（符合 schemas 契约），不让 Python 类型泄漏到 TS 侧。
- agent loop 基于 pi-mono 借壳验证，但**只借 loop 与 provider 抽象**；场景注册表、schemas、摄取管线永远长在本仓库，不长在 fork 里。
- 模型 provider 无关，走统一封装；模型选型由 eval/ 跑分决定，代码里不许写死 provider。

## 五个必须自研加固的节点（开源填不上，是壁垒所在）

OCR 印章/手写、跨文档法律实体对齐、docx 的 WPS 兼容性、卷宗结构还原、法律垂类评测集。这五处允许写"难看但自有"的代码，不允许为省事绕过。

## 工程纪律

- 契约先行：先改/读 schemas，再写实现。所有跨层交互走 JSON schema 校验。
- 每层必须带测试与 golden files（尤其 ingest 与 output：真实样例进、快照比对出）。
- 留人确认是产品纪律：任何"自动执行不可逆动作"的代码路径都不许出现；产出一律是待确认的 artifact。
- 敏感数据：卷宗样例一律脱敏；测试夹具不得含真实当事人信息。
- 语言：代码注释与文档用中文，标识符用英文。
