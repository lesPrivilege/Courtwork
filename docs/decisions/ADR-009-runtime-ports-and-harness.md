# ADR-009：Runtime Ports、双 Harness 与 Package 双平面

- 状态：Accepted
- 日期：2026-07-14
- 来源：`b0767144271ae165b3a61d79f809b0f9a257652d`、`b8815080501d7775a6e2fa27fefa756588496d92`

## 背景

Provider、Turn、受控交互、Package ABI 与声明式 Scenario 已经成立，但现行实现仍有四处边界漂移：

1. desktop 的 chat orchestration 同时承担 Tauri transport、provider 构造与 UI 投影；
2. Chat 走 `runTurn`，Work 的模型步骤仍直接走 `Provider.generate()`，导致同一 provider 出现两套生命周期保障；
3. `VerticalPackageManifest` 同时携带可序列化声明与 Zod 运行时对象，不能形成稳定的前后端/跨语言契约；
4. desktop 仍按 `legal.*` type id 路由，PM 仍有平行 descriptor，Work 产品面仍以 demo recording 为主要数据源。

本 ADR 不把 Courtwork 改造成通用 agent 平台。目标是保留现有窄底座，用最小接口完成前后端解耦、通用机制与垂类声明解耦，以及 Chat/Work 对同一模型回合真源的复用。

## 决定一：解耦以 Port 为边界，不以新增服务为目标

desktop UI 只消费 command port 与只读 projection；Tauri/Rust 继续作为本机能力宿主，不成为业务后端：

```text
React UI
  ├─ ChatCommandPort / ChatProjection
  ├─ WorkCommandPort / WorkProjection
  └─ CredentialCommandPort
             │
        TS composition root
             │
  core / registry / provider adapters
             │
        HostTransportPort
             │
  Tauri/Rust：受控网络、钥匙串、文件、窗口
```

- React 业务模块不得直接调用 Tauri `invoke`，不得自行拼 provider endpoint/header，也不得读取 secret。
- Rust 从受控 provider catalog 解析目标并取钥匙串；不解析法律 schema、不维护 Turn/Work 状态、不作模型裁决。
- 当期不新增 localhost server、Node sidecar、远程 backend 或数据库。Port 的意义是可替换、可测试和可迁移，不是提前分布式化。
- `packages/provider` 继续兼容 OpenAI Chat Completions 协议形状；产品注册仍只有 DeepSeek。新增 provider 必须是具名 descriptor/adapter，不恢复 arbitrary URL 或能力猜测。

## 决定二：一套 Turn Engine，两种上层 Harness

一次模型调用的唯一运行边界是 Turn Engine。它独占 provider stream 的请求身份、序号、started/terminal 闭集、reasoning、正文、usage、失败、取消与持久终态校验。

- Chat Harness 组织有序 turn，并把 `TurnJournal` 投影为对话；不另建生成状态机。
- Work Harness 继续使用声明式 Scenario 和既有 `SessionEvent`/artifact/revision/confirmation 账本，但每个 `model` 步骤必须通过窄 `TurnRunnerPort` 调用 Turn Engine，并在 Work 账本链接 `turnId`。
- Work 不再直接调用 `Provider.generate()`；Chat/Work 不各写一套 provider stream validator。
- 两个 harness 共用 provider、Turn、interaction resolver 与 runtime guard，但不合并顶层状态：`TurnJournal` 保存模型回合与 ask-user；`SessionEvent` 保存步骤、artifact、引用、修订和人工确认。
- “存入 Work”是显式 promotion command，创建目标容器引用；不能把 chat transcript 偷换成 artifact 或原地改写历史。

Work 第一版步骤种类封闭为：

```text
model | deterministic_tool | interaction | projection | confirmation
```

不开放模型自主选工具、任意 goto、动态图、并行 agent/subagent、session 级 always-allow 或不可逆动作自动批准。Work 继续演进既有 `SessionEvent`，不得新建平行 Work journal。

## 决定三：Package ABI 拆成 data plane 与 runtime plane

现有字段语义保留，但载体拆为两面：

```ts
interface VerticalPackageDescriptorV1 {
  abiVersion: 1;
  identity: {
    packageId: string;
    version: string;       // package release semver
    schemaVersion: number; // 本包持久 payload 契约版本
    legacyTypeAliases?: Record<string, string>;
  };
  artifacts: ArtifactDescriptorDataV1[];
  scenarios: PackageScenario[];
  promptSegments: PromptSegmentDeclaration[];
  renderers: RendererDescriptor[];
  interactionTemplates?: InteractionTemplate[];
  vocabulary: Record<string, string>;
  anchorColor?: string;
}

interface ArtifactDescriptorDataV1 {
  typeId: string;
  title: string;
  schemaId: string;
  draftSchemaId?: string;
  citationBinding?: CitationBinding;
  rehydrationProjection: RehydrationProjection;
  uiTemplateId: string;
  sideEffect?: SideEffectKind;
  vocabulary?: ArtifactVocabulary;
  presentation?: {
    collectionPointer?: string;
    fields: Array<{
      pointer: string;
      label: string;
      format: 'text' | 'mono' | 'number' | 'enum' | 'status' | 'grade' | 'anchor' | 'tags';
    }>;
  };
}

interface VerticalPackageBindings {
  schemas: ReadonlyMap<string, ZodType>;
  migrations?: ReadonlyMap<number, PackageMigration>;
}
```

- `VerticalPackageDescriptorV1` 必须可以 JSON 序列化、深冻结和稳定 hash；不得含 Zod、React、函数、CSS、任意 URL 或可执行插件。
- bindings 的 key 明确是逻辑 `schemaId`，每个 value 只对应一个 Zod schema。final 的 `schemaId` 与可选 draft 的 `draftSchemaId` 分别独立查表；不得以 artifact `typeId` 充当隐式 key，也不得把 final/draft 藏进同一个 value。
- 逻辑 schema id 使用包命名空间（如 `legal.RiskList`、`legal.RiskListDraft`）；JSON Schema 导出时以该逻辑 id 与 `identity.schemaVersion` 确定性生成绝对 `$id`。`schemaId`/`draftSchemaId` 只能引用同包 bindings；准入时引用必须闭合，重复 id、缺 binding、越 namespace 均拒载。
- Zod 4 继续是 TS authoring 与本进程 runtime validator。构建期以显式 Draft 2020-12、`unrepresentable: 'throw'` 单向导出 JSON Schema；不依赖实验性 reverse conversion。
- JSON Schema 是 IPC/跨语言 wire 契约；Zod 或其他 validator 实例不是 wire。
- Ajv2020 只用于独立 contract/CI 合规验证，必须 strict，禁止 coercion、default 注入、strip unknown 或其他输入改写；正常 TS 产品链不同时跑两套 validator。
- 当且仅当需要 digest/signature 时，descriptor/schema 使用 RFC 8785 JCS 后 SHA-256；digest 表示精确快照，不证明兼容性。

迁移分两步：`ABI-2A` 先建立双平面并迁 Legal；`ABI-2B` 再把 PM 平行 descriptor 迁入唯一 ABI。迁移期只允许一个有测试锁定的 compatibility adapter，不允许长期保留两套准入真源。

## 决定四：Renderer 是宿主 blueprint，垂类只注入投影

- desktop 只按版本化 `uiTemplateId` 查询 host-owned renderer；生产代码不得按 `legal.*`、`pm.*` type id switch。
- 垂类只声明 presentation、词表、动作能力和 anchor policy；不得注入 JSX、函数、CSS 或自由坐标。
- 通用 renderer 只能遍历 `presentation.fields` 白名单，禁止 `Object.entries(payload)`。
- presentation 引用字段缺 label、enum 值缺映射、renderer 未知或版本不兼容时显式拒载/降级。
- 安全兜底只显示人读 title 与“当前版本不支持此工作面”。type id、wire key、原始枚举、绝对路径、hash 和 raw JSON 只允许进入显式 developer diagnostics/导出。
- 既有 `question-card` 以 compatibility alias 迁往 `courtwork.question-card.v1`；历史事件保存当时的模板/文案/锚点快照，回放不重查当前 manifest。

## 决定五：版本、事件与迁移

三个版本语义不得混用：

- `abiVersion`：descriptor/registry 形状；host 不认识 major 时拒载。
- `identity.version`：package release semver；不用于解析持久 payload。
- `identity.schemaVersion`：本包持久 artifact/event payload 版本，单调递增。

持久化 artifact 引用在本架构完成后至少携带：

```ts
type ArtifactEnvelope = {
  packageId: string;
  typeId: string;
  schemaVersion: number;
  payload: unknown;
};
```

- 兼容目标是新 reader 读取已声明支持的旧数据，不承诺旧 host 猜测新包。
- migration 是确定性、无副作用的读侧 upcaster；不覆写 append-only 历史，不用 validator default/coercion 代替迁移。
- event/interaction 回放消费写入时的 descriptor/template snapshot；禁止用新 manifest 重解释旧问题、旧 label 或旧 schema。
- 未知未来 ABI/schema、缺迁移、别名冲突/环、迁移后校验失败均产生 typed error，保留原始数据并隔离 contribution，不传染已准入包。
- `replay` 只折叠历史；`resume` 只从合法 pending 续行；`rerun` 必须新建 `runId/turnId` 并记录 parent，不复用旧终态身份。

## 决定六：确认与交互必须 validate-before-consume

- artifact confirmation 与 ask-user 都遵循 first-wins、非法输入零落账、未知/重复回答不消费 pending。
- `ConfirmationStore.take()` 的 destructive read 不能继续作为 resume 的第一步；改为读快照、完整预校验、expected-version/identity 条件消费，再写事件和副作用。
- 保存同一 request id 必须拒绝覆盖；消费竞争只有一方成功。
- 所有不可逆工具第一版仍只能由 Scenario 点名并经过 policy/confirmation；未来模型 tool calling 也只能生成提案，不能直接执行。

## 决定七：开源项目只借形，不接管真源

- Vercel AI SDK：借 transport 与判别 message parts 的设计，不引入 `useChat` 或其 stream 作为内部真源。
- assistant-ui：跟踪 External Store/projection converter；当期不引 runtime、ThreadMessage 状态树或 stock UI。
- AG-UI：未来最多提供边界 adapter；外部事件必须先准入映射，不能直接写 Courtwork journal。
- CopilotKit、Mastra、LangGraph、Backstage runtime：当期不引入。只借 extension point、run ownership、checkpoint 幂等与纯 projection 原则。
- TypeBox、Effect Schema：不迁移；Zod/JSON Schema 双层已经满足当前边界。

本阶段新增第三方 Chat/Agent runtime 依赖数必须为零。

## 实施顺序

1. `CONFIRM-CAS-1`：确认 validate-before-consume 与 first-wins。
2. `ABI-2A`：descriptor/bindings 双平面，Legal 迁移，兼容 adapter 单点。
3. `HOST-PORT-1`：Tauri provider transport 从 chat orchestration 抽离。
4. `CORE-BOUNDARY-1`：demo/legal composition 与 acceptance 退出 core 生产依赖和根导出。
5. `ABI-2B`：PM 迁入唯一 ABI。
6. `VIEW-ABI-1`：renderer registry、版本化 blueprint、zero-wire fallback。
7. `TURN-WORK-1`：Work model 步骤改走 Turn Engine，SessionEvent 链接 turn。
8. `WORK-LIVE-1`：生产 WorkCommandPort 接真实 run/resume；recording 仅保留 fixture/demo mode。

每单必须先红测、后最小实现、全仓 build/test/lint；desktop 行为单另跑隔离端口完整 Playwright。实现与验收必须由不同会话承担。

## 后果

Courtwork 仍是本地优先单体应用，但 UI、core 与宿主能力具有可替换边界；Chat 与 Work 共享模型回合真源而保留各自审计账本；垂类包可以跨进程描述但不能注入可执行 UI；DeepSeek-first 产品面不妨碍未来具名 provider 扩展。代价是短期增加 compatibility adapter 与显式 migration 测试，但避免引入第二 runtime、第二 schema 真源和第二 provider 生命周期。
