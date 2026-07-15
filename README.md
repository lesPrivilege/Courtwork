# Courtwork

面向中国律所与企业法务的本地优先工作代理：案件文件夹级协作、声明式场景、结构化产出、来源锚点和人工确认。

Courtwork 不把模型包装成会自主行动的 chatbot。它把模型放进可验证的工作秩序里：模型生成引语与判断，系统验证坐标、权限和契约，用户决定确认与定稿。原件永远只读；模型出引语，系统出坐标；不可逆动作属于用户。

本 README 是仓库结构与能力的导览快照（2026-07-15）。能力成熟度的唯一状态真源是[当前基线](docs/status/current.md)；各包的职责、公开 API 与验收证据以包内 `SPEC.md` / `ACCEPTANCE.md` 为准。本文与它们冲突时，以后者为准。

## 架构总览

```text
apps/desktop            产品壳与通用 UI 宿主（Tauri v2 + React）
    │
packages/core ────────► packages/provider
    │
    ├── packages/registry ◄── packages/legal / packages/pm
    ├── packages/tools
    ├── packages/output ────► packages/reading-view
    └── packages/schemas ◄── registry / tools / output / reading-view / 垂类包

packages/demo-data      虚构导览、测试与验收语料
packages/demo-runtime   demo/acceptance 唯一装配点与 CLI（只由开发/验收消费）
eval                    中性评测底座 + 垂类数据集适配
services/ingest         Python OCR/分类/实体对齐（当前仅有规格）
```

依赖必须无环并向更稳定的契约层收敛。`schemas` 与 `provider` 是仅有的零内部依赖包；`demo-runtime` 是唯一横跨八包的组合根；core 机器层跑得动 `legal.*`，但读不懂 `legal.*`。

## 逐包导览

### packages/schemas — 契约根

领域无关 wire 契约与基础类型：TS 类型 + JSON Schema 导出 + zod 运行时校验器，零运行时依赖。

关键模块：`source-anchor.ts`（SourceAnchor，全仓可溯源引用的地基）、`revision-event.ts` / `revision-instruction-set.ts`（修订账本与修订指令集）、`confirmation-policy.ts`（留人确认策略）、`artifact-descriptor.ts`、`citation.ts`、`package-identity.ts`、`ingest-status.ts`、`file-ops-plan.ts`、`json-schema-export.ts`（供各包 drift 门复用的导出机制）。11 个单测与源文件一一对应，`json-schema-drift.test.ts` 保证导出的 JSON Schema 与类型定义零漂移。

### packages/registry — 包 ABI 与准入

垂类包 ABI、fail-closed 准入校验与运行注册表。

关键模块：`admission.ts`（准入门）、`package-manifest.ts`、`package-registries.ts`、`schema-export.ts`（垂类包复用的 schema 导出/防远程引用工具）。跨包静态门在此落户：`vertical-package-exports.test.ts` 锁定 legal/pm 的 `/package`、`/schemas`、`/testing` 出口边界，`vertical-package-layout.test.ts` 锁定垂类包物理目录归位。

### packages/core — 执行器与门禁

provider 无关的执行、组装、事件、门禁与续行机制。仓内测试最多的包（24 个测试文件）。

关键模块：`assembly/`（六段 harness 组装，附 golden）、`turn/`（Turn engine：`turn-runner`、`turn-protocol`、`interaction-coordinator`、`turn-journal`、Turn store）、`scenario-executor/`（声明式场景执行器与 `runtime-limits` 运行时预算）、`events/` 与 `revision/`（事件账本与修订账本，含文件持久化）、`session/`（确认账本）、`citation/resolver.ts`（quote → SourceAnchor 解析）、`evidence/grade.ts`（事实等级）、`work/`（Work 协议与存储）。

公开出口含 browser-safe 子路径 `./turn-protocol`、`./work-protocol`（各配 browser 环境测试）。`package-boundary.test.ts` 静态审计生产源码零垂类/demo 依赖、零垂类字面量。

### packages/provider — 唯一 provider 边界

provider port、OpenAI Chat Completions adapter、SSE 流归一、结构化输出降档、能力 profile 与当期 DeepSeek 登记。业务代码不得按模型名分支；desktop 不开放猜测能力的任意 base URL。

关键模块：`openai-compatible-provider.ts`、`sse.ts` / `provider-stream.ts`（流归一）、`structured-output.ts`（json_schema 优先、显式降档、Zod 校验重试）、`quirk-profile.ts`（具名怪癖）、`pricing-table.ts`、`scripted-provider.ts`（demo/测试用回放 provider）、`catalog.generated.ts`（脚本维护的目录，配一致性测试）。九个导出子路径，`package-boundary.test.ts` 校验零 core/desktop/垂类依赖。

### packages/tools — 确定性工具

有权威源的事实交给接口，不让模型猜。统一工具契约（输入/输出 schema、超时、缓存、失败降级），失败只允许标记"未核验"，不得静默回退模型生成。

关键模块：`contract.ts`、`party-verify.ts`（主体核验）、`cite-check.ts`（引用核验）、`web-fetch*` 系列（抓取、正文抽取、SSRF 防护）、`case-path.ts`（卷宗路径解析，含越界判定）、`system-open.ts`（受限宿主动作）、`file-ops-*` 系列（无损文件操作与执行器）。

### packages/reading-view — 阅读视图与锚点

docx/md/txt/含文本层 PDF → markdown 阅读视图 + 段落级 SourceAnchor 映射。只读单向，不回写原件；扫描件不做 OCR，只诚实声明 `needs_ocr`。

关键模块：`convert.ts`（四条输入路径统一入口）、`docx/`、`pdf/`、`markdown/`、`text/` 各解析器、`security/`（docx 安全预检、ZIP/XML 防护与限额，经 `./docx-security` 子路径共享给 desktop）、`types.ts`（`ok / needs_ocr / disabled` 三态结果模型）。16 个测试含畸形输入反例与 demo 语料 golden 回归。

### packages/output — docx 修订与著录

`RevisionInstructionSet` → 带修订痕迹（tracked changes）与批注（附法条/判例依据）的 .docx。用户认 Office，不认 md。`applyRevisionInstructionSet` 与 `compileDraftToDocx` 是仓内唯一权威著录器，任何层不得复制 OOXML 生成逻辑。

纯 TypeScript 直接著录（fflate + xmldom，自实现最小 diff），不引入 JVM/Python 子进程。关键模块：`apply-instructions.ts`（逐条指令应用与 typed outcome）、`locate.ts`（轻改后模糊锚点定位）、`comments-part.ts`（批注读写）、`fonts.ts`（正文仿宋_GB2312、标题黑体、西文 Times New Roman，逐 run 显式 `w:rFonts`）、`docx-zip.ts`。golden 快照 + 安全反例 + WPS 核验清单（`verification-checklist.md`）。

### packages/legal — 法律垂类包

法律领域 schema、场景、词表、投影与领域编译器，经 namespaced ABI 接入 core。

关键模块：`schemas/`（CaseFile、PartyGraph、ReviewMatrix、RiskList、Timeline）、`domain/compile-risk-list-to-revisions.ts`（RiskList → 修订指令集领域编译）、`package/`（descriptor 与 bindings，配 sha256 layout golden）、`testing/`（S3 样板 fixture，仅限 `/testing` 子路径，只许 demo-runtime/acceptance 消费）。

### packages/pm — 第二垂类（catalog-only）

PM 垂类 schema、presentation 与确定性计算（RICE 打分），用于证明包 ABI 的跨垂类泛化。当前 catalog-only：有 descriptor/schema/presentation 与 fixture，无 scenario/prompt/live，`PM-SCHEMA-1` 完成前不得创建 PM scenario。

关键模块：`schemas/`（prd-review、priority-score、feedback-digest、action-items、source-grade）、`domain/score-calc.ts`（确定性 RICE 计算）、`package/`（descriptor + layout golden）。

### packages/demo-data — 虚构语料

虚构样板案、导览与测试语料，不含业务逻辑：`party-corpus.ts`、`citation-corpus.ts`、`pm-fixtures.ts`、合同 PDF 生成脚本与固定数据目录。

### packages/demo-runtime — demo/acceptance 组合根

仓内唯一 demo/acceptance 装配点，把 core 与 legal、output、reading-view、provider、tools、registry、demo-data 组装为可执行演示与端到端 golden；只由开发/验收消费，core 与 desktop 不得反向依赖。

关键模块：`composition/demo-assembly.ts`（核心装配点）、三个 CLI 入口（`demo:s3` 合同审查演示、`demo:legal` 全链穿越、`real:s3` 真实 provider/卷宗跑通，无 key/无全文即拒跑）。守卫测试：`package-boundary.test.ts`（包可删除不影响 core）、`no-demo-in-harness.test.ts`（防过拟合审计：demo 预置锚点不得污染真实 harness 路径）。

### apps/desktop — 产品壳

Tauri v2 + React，154 个源文件。通用 UI 宿主、系统权限桥与产品交互；Rust 只做受控宿主能力。当前发布版本 `v0.1.2`（Apple Silicon DMG，ad-hoc 签名）。

主要目录：`composer/`（输入与附件管线：解析、needs_ocr/空内容类型级阻断、同源请求组装）、`chat/`（Turn 卡片、受控提问、思考轨迹渲染）、`provider/`（chat/turn 协议客户端与模型配置）、`credentials/`（钥匙串边界）、`protocol/`（Work command/projection port 客户端）、`preview/`（artifact 宿主渲染与十二族可视化组件库）、`workbench/` 与 `rail/`（分栏工作台与卷宗导航）、`system/`（原件只读区、工作稿面板）、`output/`（对接 output 包编译）、`demo/`（demo 模式装配，非 demo case 一律 fail closed）、`case/`（卷宗容器与作用域，真实 case 绝不回落 demo 根）、`composition/`（desktop 侧包运行时组合根）。

质量门密度是仓内之最：39 个 Vitest 文件、212 例 Playwright（`assert-test-count.mjs` 下限只升不降），外加十余个逐轮视觉/交互契约静态门与 `chat-ui-boundary.test.ts`（App 层零垂类字面量）。

### eval — 中性评测底座

跑分器无关的数据集格式、规则评分与 promptfoo 适配。能走规则评分的绝不上 judge。

关键模块：`dataset-loader/schema`（中性数据集契约）、`rules/`（citation-exists、fact-consistency、revision-set-match、risk-list-match、schema-valid）、`promptfoo/` 适配层、S3/S4 数据集目录。

### services/ingest — 摄取服务（规格阶段）

目标：扫描件卷宗 → OCR → 版面结构化 → 文书分类 → 跨文档实体对齐 → 符合 Legal JSON Schema 的结构化输出。当前只有 `SPEC.md`，无实现；在版本化 request/response/error/progress wire 被接受前，不得宣称 HTTP 集成。OCR 印章/手写与实体对齐是自研加固点，不允许假数据或静默降级绕过。

## 跨包守卫一览

| 守卫 | 位置 | 锁什么 |
|---|---|---|
| `json-schema-drift.test.ts` | schemas、legal、pm | JSON Schema 导出与类型零漂移 |
| `package-boundary.test.ts` | core、provider、demo-runtime | 生产源码零跨层/垂类/demo 依赖 |
| `vertical-package-exports/layout` | registry | 垂类包出口边界与目录归位 |
| `layout-golden.test.ts` | legal、pm | descriptor 与 fixture 的 sha256 不变 |
| `no-demo-in-harness.test.ts` | demo-runtime | demo 真值不污染真实执行链 |
| `chat-ui-boundary.test.ts` | desktop | UI 宿主零垂类字面量 |
| `assert-test-count.mjs` 等静态门 | desktop | Playwright 用例数下限与视觉/交互契约 |

## 开始开发

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm -r build
pnpm lint
pnpm test
```

desktop 的完整浏览器回归需自起隔离端口；具体命令与多 worktree 纪律见[工程工作流](docs/engineering/workflow.md)。

## 文档

- [文档入口](docs/README.md)（阅读顺序与权威层级）
- [产品定位](docs/product/vision.md) / [产品路线图](docs/product/roadmap.md)
- [系统架构](docs/architecture/system.md) / [架构原则](docs/architecture/principles.md)
- [架构决定 ADR 索引](docs/decisions/README.md)
- [实现就绪图](docs/architecture/implementation-readiness.md)
- [当前基线](docs/status/current.md)（能力成熟度与发布事实的唯一状态真源）

历史调研、工单与验收过程已归档至 `archive/`，不参与现行规范。
