# SPEC: packages/registry（W2）

状态：既有 PACKAGE-ABI/INTERACTION 已验收；`ABI-2A` 已独立验收放行；现行跨包工单 `ABI-2B` 已实现，待独立验收

## 现行架构工单（2026-07-14）

### ABI-2B · PM 迁入唯一 Package ABI

权威：[ADR-008](../../docs/decisions/ADR-008-schema-conformance-and-authority.md) 与 [ADR-009](../../docs/decisions/ADR-009-runtime-ports-and-harness.md)。删除 PM 自建 descriptor/view-resolver 真源，把四类 schema、通用表 presentation、完整值词表与 bindings 收入 `PM_PACKAGE`；与 Legal 一起走同一个 `admitPackages/buildPackageRegistries`。PM 当期是 catalog-only：`scenarios/promptSegments` 为空，不造不能运行的面板或流程；统一声明 `courtwork.artifact-table.v1`，真实 host renderer 由后续 `VIEW-ABI-1` 交付。

presentation 的 collection pointer 从 artifact 根取数组，field pointer 从条目根取值；禁止 dot-path/通配符。enum/status/tags/grade 的 `valueLabels` 必须完整，普通字段不得携无意义 labels；wire 值不得回落 UI。PM 含锚 artifact 在没有 draft/citation binding 时不得被任何 scenario 声明为模型输出，准入需有红测。范围不含 desktop renderer、PM prompt/scenario、法律 schema、provider/core 或模型 tool calling。

#### ABI-2B 实现记录（2026-07-14）

- `ArtifactDescriptorDataV1.presentation.fields[]` 已加入 field-local `valueLabels`；manifest 结构门只接受 RFC 6901 pointer，并拒绝 dot-path 与 `*` 通配符。
- 准入按绑定的 Zod schema 静态解析 `collectionPointer` 与 item-relative field pointer：collection 必须命中数组、field 必须命中；`enum/status/grade` 对应 Zod enum，`tags` 对应 enum array，`valueLabels` 必须与 wire 集合精确覆盖，普通格式携 labels 直接拒载。
- 有 presentation 时，该工作面不再依赖旧 artifact-level `vocabulary.enumLabels`；field-local labels 是唯一显示权威。无 presentation 的 Legal 既有 descriptor 继续走原词表门，行为未迁移。
- scenario 若把含 `format: anchor` 的 artifact 列为 output，缺任一独立 `draftSchemaId` 或 `citationBinding` 即拒载；catalog-only PM 因无 scenario 正常准入。
- PM 四份 schema/presentation/bindings 已接入同一准入面；旧 PM descriptor/view resolver 删除。漏词、pointer 漂移、无 draft anchor output 与逐包隔离均有可注入反例。

### ABI-2A · Descriptor / Bindings 双平面

权威：[ADR-009](../../docs/decisions/ADR-009-runtime-ports-and-harness.md)。新增纯 JSON `VerticalPackageDescriptorV1` 与仅进程内可见的 `VerticalPackageBindings`，通过稳定 id 闭合 artifact schema/draft schema 引用；bindings 精确形状为 `schemas: ReadonlyMap<schemaId, ZodType>`，final/draft 各用自己的逻辑 schema id，不以 artifact type 作隐式 key。先迁 Legal，PM 留给 `ABI-2B`。descriptor 必须可 JSON stringify、深冻结且递归不含 function/Zod/React；未知 ABI、缺 binding、重复/越 namespace id 必须隔离拒载。

迁移期只允许一个有 drift 测试的 compatibility adapter；不得保留第二套准入真源，不改法律 schema 字段语义、renderer UI、desktop 路由或 provider。Zod 继续作为 runtime validator；本单只建立显式 Draft 2020-12 导出入口与不可表达类型 throw 门，`$id` 固定为 `urn:courtwork:schema:<logicalSchemaId>:v<schemaVersion>` 且禁止远程 ref，不引 Ajv 产品依赖或动态插件。

#### ABI-2A 实现记录（2026-07-14）

- 新增 strict `VerticalPackageDescriptorV1` / `ArtifactDescriptorDataV1` data plane 与 `VerticalPackageBindings.schemas: ReadonlyMap<schemaId, ZodType>` runtime plane。final/draft 各自使用显式逻辑 id；重复引用、缺 binding、越 namespace、未知 ABI 与非纯 JSON 对象均逐包拒载。
- 准入递归拒绝 function/symbol/bigint/accessor/Zod/React-like 非普通对象，再以 V1 schema 解析克隆并深冻结；拒载包不占 id、不泄漏 warning，也不污染后到包。
- `bindArtifactDescriptorCompatibility` 是迁移期唯一兼容适配器，只在 registry 装配点把 binding 接回 core 既有 `descriptor.schema/draftSchema` 消费面；drift 测试证明 data plane 往返不丢字段。
- JSON Schema 出口固定 Draft 2020-12 + `unrepresentable: 'throw'`；包 schema 使用已拍板 URN `$id`，且只允许 fragment `$ref`。
- Legal 已迁移；PM、desktop、provider 与 core 行为未改。PM 后续只由 `ABI-2B` 迁移，不得复制本单准入逻辑。

## 已完成架构工单（2026-07-13）

### INTERACTION-1 · 垂类注入的通用交互模板

实现状态：INTERACTION-1A registry/vertical 段已完成，待异会话验收；core 暂停续行与 desktop 通用 renderer 不在本工单。

在 `VerticalPackageManifest` 增加可选 `interactionTemplates`。每项是 strict、namespaced、装载期可校验的 `InteractionTemplate`：

```ts
type InteractionTemplate = {
  id: string;
  kind: 'single_choice' | 'confirmation';
  question: string;
  options: Array<{ id: string; label: string; description?: string }>;
  skippable: boolean;
  anchorPolicy: 'none' | 'optional' | 'required';
  uiTemplateId: 'question-card';
};
```

内容、选项与锚点策略属于垂类包；颜色、布局、键盘行为属于 desktop 通用 renderer。准入必须拒绝重复 id、空选项、重复 option id、非法 namespace，以及 `required` 却无法由当前请求提供/解析锚点的情形。registry 提供按 package + template id 解析的只读 API，不把法律字段或 demo 真值带入 core/desktop。

解析 API 返回深只读快照；core 在请求时把快照复制进事件，不能在回放时重新查 manifest。模板只声明锚点政策和垂类解析规则，不携带运行时 bbox/textRange，也不接受模型直写系统坐标。

#### INTERACTION-1A 实现记录（2026-07-13）

- `InteractionTemplateSchema` 与嵌套 option 均为 strict；模板 id namespaced，kind 仅 `single_choice | confirmation`，`uiTemplateId` 仅 `question-card`，选项至少一项且 option id 唯一。未知字段会拒载，因此 `anchorRefs`、`bbox`、`textRange` 等运行时事实不能混入包模板。
- `VerticalPackageManifest.interactionTemplates` 可选；未声明的存量包保持原行为。`admitPackages` 逐包校验模板形状、命名空间所有权、包内/跨包 template id 冲突，并保持“一包拒载不传染他包”。只有成功准入包的 template id 才占用全局所有权，失败包不会污染后到包。
- `buildPackageRegistries().interactionTemplates.get(packageId, templateId)` 使用双键查询；装配时复制 template、options 与每个 option 后逐层 `Object.freeze`。调用方既不能经返回值改写，也不能靠事后修改源 manifest 改写已装配快照。
- 本段只落包级声明与查询机械件。`anchorPolicy: required` 的请求期锚点存在性/解析校验属于 ADR-007 后续 core 工单；本段不创建运行时 anchor、不写 interaction 事件、不实现暂停续行。
- TDD 证据：旧实现定点 36 条中 9 条按预期红（schema/准入/查询面缺失）；实现后 registry 三文件与 legal manifest 合计 45/45 绿。最终全仓 build 12/12 workspace、ESLint 通过、Vitest 108 files / 879 tests。

## 职责

场景注册表：场景以声明式定义存在，产品团队可不动 core 增改场景。

## 场景定义 schema

一个场景 = `{ id, 名称, 触发条件（文件类型/用户动作/分类器标签）, 输入 schema 引用, 工具集（packages/tools 的工具 id 列表）, 产出 schema 引用, UI 模板标识, 确认节点（哪些产出必须留人确认后才可继续）, 提示词模板引用 }`。

**执行语义（W6 消费契约，2026-07-09 补注，跨层文档补注，架构显式授权）**：`outputArtifacts` 的声明顺序即场景执行器的产出顺序——如 S1 的 `[CaseFile, Timeline, PartyGraph]` 表示先产出 CaseFile，再产出 Timeline 并在其确认门禁通过后才产出 PartyGraph；`confirmationGates` 中缺省 `artifact` 字段的 label-only 门禁没有锚点，落在整条产出序列结束后触发。`toolIds` 声明的全部工具在产出序列开始前一次性执行完毕，其结果对所有后续产出节点可见——MVP 阶段不支持"每个产出前跑不同工具"的按步骤工具绑定，如需要属注册表 v2（`retrievalPolicy`/步骤字段）范围，不预做。场景作者编写 YAML 时应将 `outputArtifacts` 视为有序序列，不是无序集合。

## 交付清单

- 场景定义的 schema 与校验
- 加载器：从 `scenarios/*.yaml`（或 json）加载、校验、注册
- 查询 API：按触发条件匹配场景、列出场景清单（UI 场景卡片的数据源）
- 内置 MVP 四场景声明文件：S1 卷宗阅卷、S2 矩阵审阅、S3 合同审查、S4 文书起草（提示词模板可先占位）

## 验收

四场景加载通过校验；缺字段/引用不存在的 schema/工具时报错清晰；触发匹配有单测。

## TODO（跨层放入区）

- [已解决 2026-07-09] ~~S4（文书起草）当前不声明 outputArtifacts，confirmationGates 用 label-only 门禁过渡~~——`RevisionInstructionSet` 已在 `packages/schemas` 落地，S4 声明已同步更新为 `outputArtifacts: [RevisionInstructionSet]` + artifact 引用型确认门禁（由 W4 在架构显式授权下完成，非 registry 会话越界改动）。
- [架构拍板 2026-07-09] S1（卷宗阅卷）当前 `outputArtifacts` 不含"供述/证据矛盾清单"，因为对应的 `ContradictionList` 产物类型待 W3 spike 结论后另行判断是否新增（详见 `packages/schemas/SPEC.md` TODO）。若新增，S1 声明需同步更新。
- [已解决 2026-07-09，W2.1] ~~YAML 声明加载路径收紧为 strict：未知键必须报错~~——`ScenarioDefinitionObjectSchema`/`TriggerConditionSchema`/`ConfirmationGateSchema` 三处均加 `.strict()`（在各自的 `.refine()` 之前），未知键经既有 `parseScenarioYaml → ScenarioValidationError` 管线自动报错并带上文件名（`sourceLabel`）与未知键名。schemas 包数据流 artifact 的默认剥离语义未动。详见下方验收记录。

## 验收记录

- 2026-07-09：W2 完成。场景定义 schema（`ScenarioDefinitionSchema`）、YAML 声明文件加载器（`parseScenarioYaml`/`loadScenarioFile`/`loadScenariosFromDir`）、触发匹配与场景清单查询 API（`createScenarioRegistry`）、内置 S1–S4 四场景声明文件全部交付。`pnpm test` 全绿（86 例：`packages/schemas` 原有 57 例 + `packages/registry` 新增 29 例：scenario 9 + loader 8 + query 8 + builtin-scenarios 4），`pnpm lint` 无 error，`pnpm -r run build` 通过。全部在移除 node_modules 后的干净环境重新 `pnpm install` 复核过。
  - 设计取舍：
    - `inputArtifacts`/`outputArtifacts` 复用 `@courtwork/schemas` 的 `ArtifactTypeEnum`（从 `revision-event.ts` 经 barrel 导出），不平行定义一份产物类型名单——避免两处名单漂移。
    - `confirmationGates[].artifact` 为可选字段：存在时必须 ⊆ `outputArtifacts`（跨字段 refine 校验）；缺省时仅凭 `label` 独立成立，用于产物尚无对应 schema 类型的场景（S4）。门禁的本体是"此处必须留人"，产物引用是它的强化形式，非必要条件——已与架构层确认。
    - `confirmationGates` 强制非空（`.min(1)`）：把 CLAUDE.md"留人确认是产品纪律"落到校验层，场景定义漏掉确认节点会在加载时报错，而非等到运行时才发现产品纪律被违反。
    - `toolIds` 只做结构校验（非空字符串、数组内不重复），不针对具体 id 做白名单限制：`packages/tools`（W5）尚未开工，硬编码具体工具 id 会违背"注册表不用改代码就能上新场景/工具"的设计初衷。
    - 声明文件格式选 YAML（新增 `yaml` 依赖）而非 JSON：更符合"产品团队周级上新场景"的可读性/可维护性目标。
    - `loadScenariosFromDir` 按文件名排序后逐个加载，遇到第一个非法文件即抛出（fail-fast），错误信息包含文件路径与具体字段路径；额外做了场景 id 跨文件查重。非契约行为，以后若嫌不够友好可切换为收集全部错误再一次性报告。
    - `findByTrigger` 用跨维度 OR（文件类型/用户动作/分类器标签任一命中即算匹配），不做排序/优先级——MVP 阶段注册表是推荐器不是准入门禁，排序留给真实用量数据之后。
  - 已知内容缺口（架构已拍板路径，见上方 TODO）：
    - S1（卷宗阅卷）的"供述/证据矛盾清单"当前不在 `outputArtifacts` 里——对应的 `ContradictionList` 产物类型待 W3 spike 结论后另行判断是否新增。
  - 跨层动作：已在 `packages/schemas/SPEC.md` 的 TODO 区记录上述缺口的架构决定路径。
- 2026-07-09（W4 跨层同步，架构显式授权）：`RevisionInstructionSet` 落地后，S4（文书起草）的 `outputArtifacts` 由 `[]` 更新为 `[RevisionInstructionSet]`，`confirmationGates[0]` 从 label-only 升级为 `artifact: RevisionInstructionSet` 引用型门禁，`builtin-scenarios.test.ts` 对应用例同步更新。仅改动 S4 声明与该测试文件，registry 其余部分未触碰。
- 2026-07-09（W2.1 微工单，W6 core 会话在开工前完成，独立提交）：TDD 落地 strict 声明加载。先在 `scenario.test.ts`/`loader.test.ts` 写 7 条反例测试（顶层未知键、`trigger` 嵌套未知键、`confirmationGates` 条目嵌套未知键，schema 级与 YAML 加载级各三条 + 一条"良构声明在 strict 下仍通过"的哨兵测试），确认全部按预期失败（未知键当前被静默剥离，`success` 误判为 `true`）后，给三个 `z.object` 加 `.strict()`。`pnpm test -- packages/` 203 例全绿（含四个内置场景 YAML 未被误伤，`builtin-scenarios.test.ts` 4 例照常通过），`pnpm lint`、非 eval 全包 `build` 通过。
- 2026-07-10（W3.0 阅读视图工单跨层同步，架构显式授权，见对话记录）：当时的架构工单册"S1 以阅读视图版运行"拍板落地——S1（卷宗阅卷）`trigger.fileTypes` 由 `[pdf, jpg, png]` 扩展为 `[docx, md, txt, pdf, jpg, png]`。docx/md/txt 经 `packages/reading-view` 直接产出阅读视图；pdf/jpg/png 保留在触发范围内，但会被该包判定为 `needs_ocr`（禁用态声明），不是从触发条件里移除。`fileTypes` 是无枚举白名单的自由字符串数组（`scenario.ts`/`query.ts` 均无固定取值集合），此次是纯数据层追加，无 schema 改动。`builtin-scenarios.test.ts` 新增 1 例断言 S1 完整 `fileTypes` 列表。仅改动 S1 声明与该测试文件，registry 其余部分未触碰。

## FABLE-HARNESS · PACKAGE-ABI（2026-07-13，实现留痕）

- **包 manifest + 准入 + 五 registry** 落地：`VerticalPackageManifest`（身份/descriptor/场景 v2/声明段正文/renderer 声明/词表节/锚色席位）；`admitPackages`（引用闭合：artifact 与 prompt ref 装载期解析、同 id 拒载、命名空间所有权、词表完备性——必备键 + 枚举字段 enumLabels 零编码暴露律机器化、none×副作用 artifact 契约护栏；**一包拒载不传染他包**=加载兜底④底座义务）；`buildPackageRegistries` 五面（artifact schema 注入式+读侧别名归一 / scenario：promptSegmentRef 闭合为 promptBody、steps 确定性派生 / renderer：缺声明→渲染兜底 / projection / vocabulary：包词优先缺词落底座中性话）。
- **v1 装载面退役**：scenario.ts/loader.ts/query.ts 与 scenarios/*.yaml 五张随 legal 迁包删除——场景声明随包 manifest 走 ABI 门。文案归宿律照裁：不设第六文案 registry。
