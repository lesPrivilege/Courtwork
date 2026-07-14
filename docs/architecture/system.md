# 系统架构

状态：现行定本（基线 `f03e742`）

## 分层

```text
apps/desktop
    │  产品壳、宿主能力、renderer host
    ▼
packages/core ─────► packages/provider
    │                         │
    ├── packages/registry ◄── packages/legal / packages/pm
    ├── packages/tools
    ├── packages/output ───► packages/reading-view
    └── packages/schemas ◄── registry/tools/output/reading-view/vertical packages

packages/demo-data    测试、导览与验收语料
eval                  中性评测底座 + 垂类数据集适配
services/ingest       Python OCR/分类/实体对齐（尚待实现）
```

箭头表示消费方指向被依赖方。依赖纪律不是“所有包只能直接依赖 schemas”，而是：机器层依赖必须向更稳定的契约层收敛；跨域绑定只能出现在 manifest、composition、acceptance 或宿主装配边界；不得形成循环依赖。

## 包职责

| 单元 | 唯一职责 |
|---|---|
| `packages/schemas` | 领域无关 wire 契约与基础类型 |
| `packages/registry` | 包 ABI、准入校验与运行注册表 |
| `packages/core` | provider 无关的执行、组装、事件、门禁与续行机制 |
| `packages/provider` | provider port、OpenAI Chat Completions adapter、流归一、能力 profile 与当期 DeepSeek 实现 |
| `packages/tools` | 确定性工具契约及受限宿主执行器 |
| `packages/reading-view` | docx/md/txt/文本层 PDF 到阅读视图与 SourceAnchor |
| `packages/output` | docx 安全预检、定位、修订、批注与编译 |
| `packages/demo-data` | 虚构样板案、导览与测试语料，不含业务逻辑 |
| `packages/legal` | 法律领域 schema、场景、词表、投影与领域编译器 |
| `packages/pm` | PM 垂类 schema、presentation、词表与确定性计算 |
| `apps/desktop` | 通用 UI 宿主、系统权限桥与产品交互 |
| `eval` | 跑分器无关结果格式、规则与 provider 适配 |

## 六段 harness

每次场景请求按稳定顺序组装：

1. 契约段：身份、红线、信源与合法交互动词；
2. 声明段：包内场景正文与步骤树；
3. 租户段：机构约束与私域路由；
4. 续行投影：权威态、artifact 摘要、账本尾部和未决门禁；
5. 会话与材料：用户指令和带数据边界的材料；
6. 视图映射：当前步骤地址、输出信封和 todo。

低频稳定段在前，高频段在后，同时服务语义优先级与 provider 前缀缓存。模型输出必须携目标地址；回填按地址而不是按生成位置猜测。

## 场景与包 ABI

垂类包通过 namespaced id、manifest、artifact descriptor、scenario、renderer、projection、词表与 confirmation policy 接入。core 应能执行 `legal.*`，但机器层不应理解 `legal.*` 的含义。

场景是固定声明式 pipeline。模型只在声明允许的生成节点工作；工具集、产物、确认点和 UI 模板由声明决定。外部 skill 或 MCP 入口若不能补齐 schema 与确认策略，不得进入执行链。

## 事件与状态

- artifact 是当前结构化状态；
- RevisionEvent 是用户修正与确认的不可变账本；
- SourceAnchor 是结论与材料之间的可验证坐标；
- transcript 是附录，不是工作状态真源；
- 续行由声明式投影重建，不依赖模型总结全部历史。

## 宿主边界

desktop 可以承载系统文件选择、钥匙串、打开文件、renderer host 与用户交互，但不得复制垂类类型路由、词表或 demo 语料真值。所有领域显示应由 package registry 和 descriptor 驱动。当前仍有少量 desktop 直连法律/demo 的历史漂移，列入 [当前基线](../status/current.md)。

## Provider 与 Turn 兼容边界

core 只依赖 `packages/provider` 的 provider port 与流事件，不依赖 OpenAI wire 字段或具名 provider。`packages/provider` 当期以 OpenAI Chat Completions 为协议基线，只注册 DeepSeek；结构化输出优先严格 `json_schema`，具名 profile 仅支持 `json_object` 时才显式降档，并继续经过 Zod 校验与受限重试。能力降档、重试耗尽和响应非法都必须变成结构化失败，不能静默返回空 artifact。

base URL、模型、推理字段和 response format 差异集中在具名 profile/adapter；业务代码、场景和垂类包不得按模型名称分支。desktop 不开放猜测能力的 custom provider。详细 Turn、受控提问、持久化与钥匙串边界见 [ADR-007](../decisions/ADR-007-provider-turn-protocol.md)。

## 技术基线

- Node 22+、pnpm workspace、TypeScript strict、Vitest；
- Tauri v2 + React；
- Python ingest 独立服务，uv 管理；
- provider 当期统一走 OpenAI Chat Completions adapter，具名例外必须进入 provider profile；
- agent loop 自研，只借鉴轻量、协议化、provider 无关的设计形状；
- 模型和 provider 不得写死在业务代码。
