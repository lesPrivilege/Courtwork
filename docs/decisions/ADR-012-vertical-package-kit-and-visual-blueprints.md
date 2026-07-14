# ADR-012：垂类包体例、企业编排与可视化 Blueprint

- 状态：Accepted
- 日期：2026-07-14
- 来源：`1fdd7c8`
- 关系：细化 ADR-001、ADR-006、ADR-008 与 ADR-009

## 背景

Legal 与 PM 已进入同一 descriptor/bindings ABI，但工程体例曾漂移：PM 迁移前的目录和 npm 名为 `pm-schemas`，package 与 descriptor 版本也曾不一致；Legal 根出口转售 demo fixture，两包目录与宿主 renderer 命名仍处于不同代际。

与此同时，新增垂类需要以有限原生组件复用表格、矩阵、时序、关系、证据、指标和确认交互，而不是每个场景新增卡片或让模型输出样式。企业 SDK 与私域接口也必须留在垂类编排层，不能污染 core。

## 决定一：目录、npm 名与 packageId 一致

新体例固定为：

```text
packages/<packageId>/
├── package.json
├── SPEC.md
├── ACCEPTANCE.md
├── json-schema/
├── scripts/generate-json-schema.ts
└── src/
    ├── index.ts
    ├── package/
    │   ├── descriptor.ts
    │   ├── bindings.ts
    │   └── index.ts
    ├── schemas/
    ├── presentation/
    ├── scenarios/       # 有真实可运行场景才建立
    ├── interactions/    # 有真实受控交互才建立
    ├── domain/          # calculator/compiler 等确定性领域逻辑
    ├── runtime/         # 有真实企业/tool 编排才建立
    └── testing/         # fixture/golden；禁止根出口转售
```

- 目录 `packages/<id>`、npm 名 `@courtwork/<id>`、descriptor `identity.packageId=<id>` 必须一致。
- PM 迁为 `packages/pm` / `@courtwork/pm`；`pm.*` typeId、schemaId、packageId 与 schemaVersion 不变。
- `package.json.version` 必须等于 descriptor `identity.version`。payload 契约未变时不得误升 `schemaVersion`。
- artifact/schema id 为 `<packageId>.<PascalCase>`；文件名 kebab-case；公开常量固定为 `<NAME>_PACKAGE_DESCRIPTOR / BINDINGS / PACKAGE`。
- 包必须统一提供 `test / lint / build / generate:json-schema`，并通过共享 conformance kit。

目录迁移允许分批进行；现有 Legal 未版本化 blueprint 与历史事件 snapshot 不在纯物理整理中偷改。

## 决定二：根出口 browser-safe，测试与 runtime 显式分面

公开面固定为：

```text
@courtwork/<id>          稳定 browser-safe schema、descriptor、bindings、纯确定性逻辑
@courtwork/<id>/package  descriptor 与 bindings
@courtwork/<id>/schemas  schema 与类型
@courtwork/<id>/testing  fixture/golden，仅 demo-runtime/acceptance
@courtwork/<id>/runtime  可选；只有真实 runtime 时开放
```

- 根出口不得转售 demo、acceptance fixture、Node adapter、企业 SDK、secret、CSS 或 React。
- `/testing` 不得被 desktop/core/provider/registry 的生产图消费。
- `/runtime` 不得创建空壳；出现第一项真实 integration 后才开放，并单独声明宿主要求。
- `VerticalPackageBindings` 继续只含 schema 与 migration；不因企业接入膨胀为服务定位器。

## 决定三：企业接口与厂商库只住垂类 runtime

企业编排路径固定为：

```text
desktop / server composition root
  → 注入 HostTransportPort、credential reference、container scope
  → @courtwork/<vertical>/runtime 创建领域工具与材料适配
  → core 只消费通用 Tool / Turn / Work port 与 artifact
```

- 领域包可以在 `src/runtime/` 拥有领域专用 port、厂商 adapter 与响应到本垂类 draft/claim 的编排。
- core、registry、provider、schemas 不得 import 企业厂商类型或维护 vendor switch。
- React 不持 secret、不直连 vendor；凭证与目标仍由 HostTransportPort/受控 catalog 裁决。
- descriptor 不含 endpoint、SDK client 或可执行 binding。工具注册必须和已准入 Scenario 的 toolIds 在 composition/admission 阶段闭合，缺失时拒载，不静默降级。
- 系统锚点、schema 验证、confirmation、事件 terminal 与不可逆动作政策仍由通用底座执行，垂类 runtime 不能覆盖。

没有真实 integration 时，不为“企业级”造接口、mock client 或空 adapter。

## 决定四：宿主原生组件与版本化 Blueprint 分层

可视化分为四层：

```text
schema-valid payload
  → 纯 TS projection / ViewModel
  → host-owned native primitives
  → versioned blueprint + finite composition
```

- primitives 只拥有结构与交互工艺：行、字段、锚点、状态、证据、确认、区间、关系、时序等。
- blueprint 通过版本化 `uiTemplateId` 登记，例如 `courtwork.table.v1`、`courtwork.timeline.v1`；领域包只引用，不注入 React。
- 每个 blueprint 拥有独立、可静态准入的 presentation config。现有 table 的 `presentation.fields` 不扩张成万能 DSL。
- 组合只允许 `section`、有限比例 `grid` 与对数组的 `repeat`；禁止自由坐标、嵌套 grid、模型生成 HTML/CSS/SVG 和任意布局数值。
- renderer 必须先验证完整 artifact，再投影白名单；pointer、词表、输入形状或版本漂移时整面 fail closed，不渲染半张表、不暴露 wire。
- blueprint ID 冲突时，完全相同的共享声明可复用；同 ID 不同声明必须拒载，禁止 silent last-wins。

现行 Legal 的 `*-panel` 与 `question-card` 属迁移债。改为版本化 ID 时必须保留历史 snapshot 回放与 compatibility alias，另立工单处理。

## 决定五：素材库是设计索引，不是协议真源

组件样板可以一次性覆盖已实现、候选与 deferred 形态，帮助新 schema 选型；但图片不能成为 renderer 契约，不能推动没有真实场景的生产组件。

- 原生组件只由真实 fixture 和场景拉动，生产 UI 仍以 React/CSS/token 实现。
- 生成样板不得包含假案号、随机法律碎片、假进度、自由颜色、glow、渐变、3D 设备或 card soup。
- 每个样板标记 `implemented / candidate / deferred`，并指向现行 blueprint/fixture；新 schema 只能引用版本化 `uiTemplateId`，不能引用图片坐标。
- 暂不新建 `packages/ui`。原语先在 desktop 宿主内经至少两个垂类/场景验证；出现第二个真实 UI 宿主后再抽包。

## 决定六：Pages 用真实状态证明泛化

首页保留 Evidence Line 母题，并增加连续的“同一底座，换的是判断”台账：

1. Legal 合同审查：标记为已验收 live/demo 工作链；
2. Legal 卷宗阅卷：以真实 Timeline/PartyGraph/Matrix fixture 展示时序与关系；
3. PM 决策：只有权威 PM fixture 与 host renderer 验收后才展示，并在 scenario 未接通时明确标为 `schema catalog preview`。

Pages 不把测试对象包装成已运行场景。计数、引语、状态与公式必须来自仓库 fixture；产品截图仍从已验收 main 经真机操作取得。

## 门禁

- package path/name/id/version 漂移、orphan binding、远程 `$ref`、旧 JSON Schema 残留必须触红。
- Legal/PM 同宿主 conformance 必须覆盖 namespace、presentation、词表、锚点职权与坏包隔离。
- fixture 从包根出口泄漏、生产代码消费 `/testing`、core 出现 vendor SDK/import 必须触红。
- runtime bindings 必须是真只读快照；调用方不能通过 `.set()` 改写已准入 schema map。
- Pages 的 live/catalog 状态标签与 fixture 数据漂移必须触红。

## 后果

新增垂类有一致的工程骨架、公开面、企业编排席位和 UI 接入方式；底座不因某一家企业接口或某一种图表膨胀。Legal 与 PM 可以逐步迁移而不改变现有 payload 语义，Pages 也能诚实证明同一宿主的泛化能力。
