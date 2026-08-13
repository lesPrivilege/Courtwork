# SPEC: packages/registry（W2）

状态：既有 PACKAGE-ABI/INTERACTION、`ABI-2A` 与跨包工单 `ABI-2B` 均已独立验收放行

## TOOL-READ-1 · 可请求工具白名单声明键（2026-08-11/13，已独立验收放行）

权威：`apps/desktop/specs/TOOL-READ-1.md` 裁定二＋ ADR-011 修订二条件 1（参数闭集由系统当次注入）。

### 本层职责与公开契约

- **`PackageScenarioSchema` 新增可选键 `requestableToolIds: z.array(z.string().min(1)).optional()`**：比照 `toolIds` 的声明形制；`refine` 去重（重复即拒载）。
- 与 `toolIds` 分工：`toolIds` 是声明期工具（产出序列开始前一次性执行）；`requestableToolIds` 是 turn 间可被模型点名请求的闭集，每次 model 步由 core 按此清单当次注入 `z.literal`。缺席与空清单语义同一（零可请求工具，模型不可发现该通道），故取 `.optional()` 而非 `.default([])`——默认值会迫使每份既有场景声明补恒空键。
- 「引用必解析」与「仅 `pure_read`」由 core `resolveRequestableTools` 在执行准入判定——sideEffect 分级住 core ToolRegistry 装配点，包描述面结构上不持有该事实。

### 消费边界

本层只冻结声明形状；执行链、闭集注入与上界全在 `packages/core`。既有 legal/pm 场景声明零改动（缺席键照常准入）。

### OSS 四选一（R1-3，本票统一裁定）

**借行为或源码范式，零新增直接依赖**：闭集 fail-closed 形态借自 pi/opencode；地址闭集机制照 ADR-016 决定二自持。

验收坐标：R2 目标 `b5a8302`，独立 PASS `332e0f5`；既有 production legal/pm 声明仍缺席该键，零行为漂移。

## 现行架构工单（2026-07-14）

### [提案，需架构拍板] VPKG bindings 真只读快照

ADR-012 要求已准入的 runtime bindings 不能由调用方通过 `.set()` 改写。当前 TypeScript 面虽声明
`ReadonlyMap`，准入后仍以普通 `Map` 承载；`Object.freeze` 只冻结外壳，不冻结 Map 内部槽位。
`VPKG-META-1` 只建立包元数据与 JSON Schema drift 门，按范围不修改 registry 语义。后续需由架构角色
拍板采用不可变 facade、查询接口或其他等价实现，并以真实 `.set()` 反例及现有 consumer grep 定义迁移工单。

### ABI-2B · PM 迁入唯一 Package ABI

权威：[ADR-008](../../docs/decisions/ADR-008-schema-conformance-and-authority.md) 与 [ADR-009](../../docs/decisions/ADR-009-runtime-ports-and-harness.md)。删除 PM 自建 descriptor/view-resolver 真源，把四类 schema、通用表 presentation、完整值词表与 bindings 收入 `PM_PACKAGE`；与 Legal 一起走同一个 `admitPackages/buildPackageRegistries`。PM 当期是 catalog-only：`scenarios/promptSegments` 为空，不造不能运行的面板或流程；统一声明 `courtwork.artifact-table.v1`，真实 host renderer 由后续 `VIEW-ABI-1` 交付。

presentation 的 collection pointer 从 artifact 根取数组，field pointer 从条目根取值；禁止 dot-path/通配符。enum/status/tags/grade 的 `valueLabels` 必须完整，普通字段不得携无意义 labels；wire 值不得回落 UI。PM 含锚 artifact 在没有 draft/citation binding 时不得被任何 scenario 声明为模型输出，准入需有红测。范围不含 desktop renderer、PM prompt/scenario、法律 schema、provider/core 或模型 tool calling。

#### ABI-2B 实现记录（2026-07-14）

- `ArtifactDescriptorDataV1.presentation.fields[]` 已加入 field-local `valueLabels`；manifest 结构门只接受 RFC 6901 pointer，并拒绝 dot-path 与 `*` 通配符。
- 准入按绑定的 Zod schema 静态解析 `collectionPointer` 与 item-relative field pointer：collection 必须命中数组、field 必须命中；`enum/status/grade` 对应 Zod enum，`tags` 对应 enum array，`valueLabels` 必须与 wire 集合精确覆盖，普通格式携 labels 直接拒载。
- 有 presentation 时，该工作面不再依赖旧 artifact-level `vocabulary.enumLabels`；field-local labels 是唯一显示权威。无 presentation 的 Legal 既有 descriptor 继续走原词表门，行为未迁移。
- scenario 若把含 `format: anchor` 的 artifact 列为 output，缺任一独立 `draftSchemaId` 或 `citationBinding` 即拒载；catalog-only PM 因无 scenario 正常准入。
- PM 四份 schema/presentation/bindings 已接入同一准入面；旧 PM descriptor/view resolver 删除。漏词、pointer 漂移、无 draft anchor output 与逐包隔离均有可注入反例。
- 独立验收以真实 Legal + PM 同次准入、坏 PM 隔离及四类强制变异复核上述边界，registry 62/62、四包合跑 255/255；结论放行。完整证据见 [`packages/pm/ACCEPTANCE.md`](../pm/ACCEPTANCE.md)。

#### VIEW-ABI-1C · estimate presentation 加固（架构增量）

VIEW 独立验收以 schema-valid 的 `pm.PriorityScore` 区间载荷发现：参数 envelope 与 score 区间不能由
`number/mono` 诚实投影。ABI v1 的 field format 因此纯增加 `estimate`，精确接受 number、`{low,high}` 或
`{value,range,status}` envelope；不得让 renderer 猜 sibling pointer。准入必须静态证明形状：envelope 的
status 是 enum 且 field-local `valueLabels` 精确覆盖；直接 number/range 不得携 labels。PM package release
version 随 descriptor 行为增量递增，payload schema 未变，`schemaVersion` 仍为 1。非法 estimate 逐包拒载，
不把失败推迟成运行时空表。

#### VIEW-ABI-1C 实现记录（2026-07-14，已独立验收）

- `ArtifactFieldFormatSchema` 纯增加 `estimate`；既有 format 和 ABI version 均未改名或重解释。
- 准入沿 field pointer 静态解析 Zod 终端形状，只接受非 coercing finite number、严格 `{low,high}` range、二者 union，或含 `value/range/status` 的 envelope。envelope 的 status 必须是 enum，field-local labels 必须精确覆盖；直接 number/range 携 labels、缺漏/多余 labels、未知或复合形状均逐包拒载。
- 反例锁定 coercing number、不完整 range、双值 envelope、非法 status 与 labels 漂移，防止 presentation 错误延迟到 desktop。实现侧定向 registry + PM **3 files / 69 tests**、registry 全量 **4 files / 76 tests** 全绿；最终全仓 **120 files / 1060 tests**。

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

- [VPKG-CONFORMANCE-1] 把目录名、npm 名、descriptor `packageId` 与 version 的跨包校验集中为同一 registry conformance helper。当前 PM 已锁三者一致，Legal 只锁 version；不得以复制更多包内特判或引入新工具链掩盖该缺口。
- [已解决 2026-07-09] ~~S4（文书起草）当前不声明 outputArtifacts，confirmationGates 用 label-only 门禁过渡~~——`RevisionInstructionSet` 已在 `packages/schemas` 落地，S4 声明已同步更新为 `outputArtifacts: [RevisionInstructionSet]` + artifact 引用型确认门禁（由 W4 在架构显式授权下完成，非 registry 会话越界改动）。
- [架构拍板 2026-07-09] S1（卷宗阅卷）当前 `outputArtifacts` 不含"供述/证据矛盾清单"，因为对应的 `ContradictionList` 产物类型待 W3 spike 结论后另行判断是否新增（详见 `packages/schemas/SPEC.md` TODO）。若新增，S1 声明需同步更新。
- [已解决 2026-07-09，W2.1] ~~YAML 声明加载路径收紧为 strict：未知键必须报错~~——`ScenarioDefinitionObjectSchema`/`TriggerConditionSchema`/`ConfirmationGateSchema` 三处均加 `.strict()`（在各自的 `.refine()` 之前），未知键经既有 `parseScenarioYaml → ScenarioValidationError` 管线自动报错并带上文件名（`sourceLabel`）与未知键名。schemas 包数据流 artifact 的默认剥离语义未动。详见下方验收记录。

## 验收记录

- 2026-07-09：W2 完成。场景定义 schema（`ScenarioDefinitionSchema`）、YAML 声明文件加载器（`parseScenarioYaml`/`loadScenarioFile`/`loadScenariosFromDir`）、触发匹配与场景清单查询 API（`createScenarioRegistry`）、内置 S1–S4 四场景声明文件全部交付。`pnpm test` 全绿（86 例：`packages/schemas` 原有 57 例 + `packages/registry` 新增 29 例：scenario 9 + loader 8 + query 8 + builtin-scenarios 4），`pnpm lint` 无 error，`pnpm -r run build` 通过。全部在移除 node_modules 后的干净环境重新 `pnpm install` 复核过。
  - 设计取舍：
    - `inputArtifacts`/`outputArtifacts` 复用 `@courtwork/schemas` 的 `ArtifactTypeEnum`（从 `revision-event.ts` 经 barrel 导出），不平行定义一份产物类型名单——避免两处名单漂移。
    - `confirmationGates[].artifact` 为可选字段：存在时必须 ⊆ `outputArtifacts`（跨字段 refine 校验）；缺省时仅凭 `label` 独立成立，用于产物尚无对应 schema 类型的场景（S4）。门禁的本体是"此处必须留人"，产物引用是它的强化形式，非必要条件——已与架构层确认。
    - `confirmationGates` 强制非空（`.min(1)`）：把 CLAUDE.md"留人确认是产品纪律"落到校验层，场景定义漏掉确认节点会在加载时报错，而非等到运行时才发现产品纪律被违反。
    - `toolIds` 只做结构校验（非空字符串、数组内不重复），不针对具体 id 做白名单限制：`packages/tools`（W5）尚未开工，硬编码具体工具 id 会违背"注册表不用改代码就能上新场景/工具"的设计初衷。（**本段为立段时事实（2026-07-09）**，现已不成立：`packages/tools` W5/W5.1 早已交付并经独立验收放行，记录见 `packages/tools/ACCEPTANCE.md`；不做白名单的**结论**不随之改变——理由从"下游未开工"换成上面那条设计初衷本身，仍是现行决定。）
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

## ADMISSION-ENUM-1 实现记录（2026-08-04，审计双确认批；1R 返修 2026-08-04 追加；2R 返修 2026-08-04 追加，实现完成待独立验收）

权威：`docs/architecture/implementation-readiness.md` 2026-08-04 审计双确认批 `ADMISSION-ENUM-1` 行（逐字为准）；1R 返修按验收第一相四项（F-A/F-B/F-C/F-D）逐条闭合；2R 返修按验收报告 `0b16072`（G-1 驳回依据＋G-2/G-3 并入项）闭合。边界：只改准入门与反例测试；不放松任何既有门。

### 缺陷①：枚举收集 walker 对 record/default 等静默跳过 → 补齐 + fail-closed

- `collectEnumFields` 重构为 `collectSchemaInfo`（`packages/registry/src/admission.ts`）：一次遍历同时产出「枚举字段集」与「对象已声明键集」——两样东西共用**同一套** zod 4.4.3 节点分类，不再复制分类逻辑（此前 `collectEnumFields` 与 `unwrapSchema` 一模块两口径的教训；判例「扫描谓词与族定义同宽」「名字清单换材质仍是白名单」）。
- 已处理的容器/包装类：`ZodObject`/`ZodArray`/`ZodOptional`/`ZodNullable`/`ZodDefault`/`ZodReadonly`/`ZodCatch`/`ZodRecord`（keyType+valueType 都走）/`ZodTuple`（`def.items`）/`ZodIntersection`（`def.left/right`）/`ZodLazy`（`def.getter()`，带环保护与求值失败具名拒）/`ZodUnion`/`ZodDiscriminatedUnion`。
- 标量叶子显式列举并静默停走（结构性不可能含枚举/子键）：`ZodString`／`ZodStringFormat` 系（**如实措辞，1R F-A 订正**：zod 4.4.3 中 `z.email()`→`ZodEmail`、`z.uuid()`→`ZodUUID`、`z.url()`→`ZodURL` 等格式类实测**非** `instanceof ZodString`，而是 `ZodStringFormat` 子类——补基类检查并经三枚正例锁定，此前「含全部格式子类」的宣称与实测不符已撤）／`ZodNumber`/`ZodBigInt`/`ZodBoolean`/`ZodDate`/`ZodISODate`/`ZodISODateTime`/`ZodISOTime`/`ZodISODuration`/`ZodSymbol`/`ZodUndefined`/`ZodNull`/`ZodAny`/`ZodUnknown`/`ZodNever`/`ZodVoid`/`ZodLiteral`/`ZodNaN`。
- **fail-closed**：未识别节点必 push issue（`准入检查遇到未识别 zod 节点 <类名>`），包被拒载；新增 zod 容器类必须先扩 walker 再准入。**边界登记**：zod 4.4.3 中 `.transform()`/`.pipe()` 同属 `ZodPipe`，另有 `ZodPreprocess`、`ZodMap`/`ZodSet`/`ZodPromise`/`ZodFunction` 等未列入票面的容器维持 fail-closed——用到的包须先扩 walker（当期 legal/pm binding 实测可达类集不含它们，见下方外溢清单的探针证据）。

### 缺陷②：citationBinding 五字段与 draft/final schema 对账（`checkCitationBinding`）

写错一字不再被 zod strip 静默吞——不命中即拒载，消费面坐标（符号锚，`packages/core/src/citation/resolver.ts`）：

- `itemScope`：在**草稿** schema 解析为数组（`resolveDraftArtifact`/`resolveDraftArtifactWithPruning` 的 `resolvePointerPath` 消费面）；
- **1R F-B 收紧（直接键判据，替代初版「全子树成员资格」）**：验收实证三形——`outOfCoverageField` 只活在元素内层、`anchorField`/`draftField` 只活在数组元素内层的键误拼即静默过门（fail-open）。判据按**消费面位置**收紧：
  - `outOfCoverageField`＝final schema **根对象直接键**（`rebuildFromSurvivors` 的 `root[field]` 落点）；
  - `itemSummaryField`＝draft item **根对象直接键**（`outcome.item[field]` 读面）；
  - `draftField`＝draft item 树中**某对象节点的直接键且值为数组**（`resolveItem` 深走公证面 `key === draftField && Array.isArray(value)`——string 形深层同名键不会被公证，误拼即静默丢引语）；
  - `anchorField`＝final item 树中**某对象节点的直接键且值为数组**（与 draftField 同位的写回点）。
  - 口径说明：draftField/anchorField **未**收紧到 item 根直接键——消费面（resolver 深走）允许键住嵌套对象，legal 的 `quoteClaims`/`sourceAnchors` 恰在 `basis[]` 元素层，收紧到 item 根会误拒合法 legal 包；「直接键＋数组类型」同时挡三形误拼（string 深层键不参与公证）并保 legal 深走形状准入（1R 合跑实测 legal/pm 仍准入）。
  - **2R G-3 位置轴（协调裁定收口，并入本轮）**：键形轴之外补同位判据——`anchorField` 须与 `draftField` **命中同一对象节点**（`resolveItem` 把铸出的锚写在 draftField 命中的那个节点；错位形会过键形轴，但 executor 的 final `safeParse` 把错位写入的锚 strip、`sourceAnchors` 回落 `[]`、`success=true`——成品零锚点零报错，直触不变量二「无锚不落格」）。实现：walker 增路径追踪（shape 键序列＋数组元素 `[]` 占位），`arrayKeyPaths` 收集数组键的命中节点路径集，同位判据＝draftField 与 anchorField 命中路径集非空交集。record 动态键不推进路径（两侧同构时同位仍成立）；共享子 schema 只记首访路径（visited 键控 (schema, fieldName)）。**验收订正（`0b16072` 后第三轮，措辞范围过宽已改）**：记录路径集是真路径集的子集，故该截断只会误拒、不会误放——判据仍 sound，只是 incomplete（验收实测：构造 anchor 侧同一对象两处挂载、同 fieldName 形，门拒而消费面实际可工作、落库锚点 1）。当期**参与同位判据的** schema（`legal.RiskList`/`legal.RiskListDraft`）实测 0 处此形状；`legal.RevisionInstructionSet` 与 pm 的 `FeedbackDigest`/`PriorityScore`/`ActionItems` 确有此形状，但均不携 citationBinding、不进同位判据。原文「当期 legal/pm 无此形状」不成立，按实测收窄至判据参与面。

### 概念账（复杂度审视：本单新增了什么概念、为何非加不可）

- **「已声明键集」收集**：为 citationBinding 对账而新增的第二输出——与枚举收集同源于一个 walker，避免第三份 zod 分类拷贝；不加新依赖、不加新导出、不改 payload/schema 语义。1R F-B 追加第三输出 `arrayKeys`（值为数组的对象直接键）支撑公证面判据，仍同一 walker。
- **fail-closed 节点分类**：把「未覆盖即静默」改为「未覆盖即拒载」——这是本票两枚缺陷的共同根因形态（unknown → 跳过 的病根，判例 1R4/1R5 同族），不是新概念而是既有纪律的准入端落位。
- **1R F-C**：`visited` 生命周期归每次 `collect()`——draft/final 绑同一 `ZodType` 对象时共享 visited 会让后续 collect 漏收键（假拒且拒因与事实相反），属一行修；环保护仍由单次 collect 内 visited 承担。

### 红绿证表（全部来自完整实跑原始输出）

- **born-red（初版，实现前）**：`admission.test.ts` 新增 10 枚反例全部按预期红——`z.record` 内嵌枚举缺 enumLabels、`.default()` 直接包裹枚举 / 包裹枚举数组两形、合成 `z.map` 未识别节点、citationBinding 五字段各错形（`outOfCoverageField` 误名一字符、`itemScope` 指向 `/caseId` 非数组、`itemScope` 深路径、`draftField`/`anchorField`/`itemSummaryField` 不存在）。实得 **10 failed / 49 passed**。
- **born-red（1R，返修前）**：新增 7 枚红——F-A 格式类三枚正例（`z.email()`/`z.uuid()`/`z.url()` 被误判未识别拒载）、F-B 三形（`anchorField`/`draftField`/`itemSummaryField` 深层误拼准入）与 F-C 共用 schema 正例（假拒）。`outOfCoverageField` 形在 F-C 修复前的「绿」是被 visited bug 偶然掩盖（root 收集跳过已访子树恰好收不到深层键）；F-C 修复后该形独立复红（mutation 复证），born-red 成立。实得 **7 failed / 60 passed**。
- **born-red（2R，返修前）**：G-3 错位形（验收 `0b16072` 语料转 permanent：final item 根另有数组键 `topAnchors`、`basis` 元素 `sourceAnchors` 取 `.default([])`、`anchorField` 误指 `topAnchors`——键形轴过、位置轴应拒）1 枚，实得 **1 failed / 67 passed**。
- **实现后**：registry 全量 1R 后 **6 files / 105 tests**（admission 67 例；G-2 订正：初版 97 为 7a2e3c4 实测，1R 增 8 枚测试后为 105）；legal/pm/registry 合跑 1R **25 files / 237 tests** 全绿（真实 legal 深走形状 `quoteClaims`/`sourceAnchors` 按「数组直接键」判据仍准入）。2R（G-3）后 registry **6 files / 106 tests**、合跑 **25 files / 238 tests** 全绿。
- **mutation 逐枚复红（每枚先备份、注入、定向验证红、恢复、diff 零残留；备份一律落 `$TMPDIR` 仓外，F-D）**：初版九枚（撤 ZodRecord 分支 / 撤 fail-closed / 撤 ZodDefault 分支 / 撤整体 citationBinding 对账 / 撤 itemScope / draftField / itemSummaryField / anchorField / outOfCoverageField 各单字段）全部命中；1R 六枚——撤 `ZodStringFormat` 叶子（F-A 三枚正例红）、撤 outOfCoverageField 根直接键改回全树、撤 anchorField 数组直接键改回全树、撤 draftField 数组直接键改回全树、撤 itemSummaryField 根直接键改回全树、`visited` 恢复跨 collect 共享——逐枚命中；2R 一枚——撤 G-3 同位判据 → 错位形反例红。

### 受控外溢清单（票面「扩紧后若现行 legal/pm 被拒载须补词表/binding 使合规」；接受验收查证）

1. **legal.RiskList 补 `enumLabels.reason`**（`not_found`/`ambiguous`/`file_unavailable` = `CitationFailureReasonEnum`，`@courtwork/schemas`）：walker 补 ZodDefault 后，`outOfCoverage[].failures[].reason` 首次被准入发现——legal 是唯一被扩紧拒载的现行包（实测拒载理由恰一条：`descriptor legal.RiskList 枚举字段 "reason" 缺 enumLabels`）。词条落 `packages/legal/src/presentation/index.ts`；legal descriptor 整面 hash 重铸（`layout-golden.test.ts`），prompt blob 零漂移、`schemaVersion` 不升。
   - **G-1 来源哈希重封存（协调授权在案，2026-08-04）**：`packages/legal/src/presentation/index.ts` 是 schema-exemplar 来源登记 `P0-S02`（role `presentation-contract`）。外溢本为票面所批，哈希重封存是其必要完件——`docs/design/schema-exemplar.sources.json` 的 `P0-S02.sha256` 由 `4c24f2cb…719f829f`（base 登记值）重封存为 `f19a76a2…c29e1892`（受控外溢后现值）。**authorization**：ADMISSION-ENUM-1 票面「扩紧后若现行 legal/pm 被拒载须补词表/binding 使合规——该外溢属受控外溢，须在对应 SPEC 留痕并接受验收查证」＋ 1R 返修宪章「协调授权在案：外溢本为票面所批，哈希重封存是其必要完件」。`schema-exemplar.md` 正文为符号指针式（「payload 字段、枚举、默认值与 token 数值只认各自机器真源；本文不复制它们」），经核无需同改。
2. **两处测试 fixture 按「置换批定式」按其本意重写**（本批改变了世界，非放宽门）：`admission.test.ts` anchor 闭合用例与 `package-registries.test.ts` `manifest()` 的 draft/final schema 形状原先与 binding 自相矛盾（draft item 为空对象、final 无 `outOfCoverage` 根键），重写为语义自洽形状。
3. **外溢探针证据**：以 tsx 探针遍历 legal/pm 全部 binding schema 的可达 zod 类集（`/tmp/admission-enum-1-probe.mts`，一次性工具，未入仓）——可达集为 `ZodObject/ZodArray/ZodOptional/ZodNullable/ZodDefault/ZodEnum/ZodLiteral/ZodString/ZodNumber/ZodBoolean/ZodISODate/ZodISODateTime/ZodRecord/ZodUnion/ZodDiscriminatedUnion`，无其他容器类；故 fail-closed 对现行两包零误伤。

### 定序冲突登记（如实登记，不自裁）

- 与 **PM-SCHEMA-1** 的定序：本单触碰 registry 准入面（`admission.ts` 与反例测试）；PM-SCHEMA-1 若同样触碰准入面（OOC/Estimate 语义），须按同包互斥定序，不得并行改。本单未改 estimate 形状门、未改 payload/schema 语义、未改 `PresentationFieldFormatSchema`。
- **vertical-package-exports.test.ts 瞬态红——已结案（1R F-D，验收定位，非 flaky）**：初版 mutation 收尾后的首次合跑中，「全仓只有 demo-runtime、acceptance 与 test 可以消费 /testing」用例出现单次红。**机制结论**：该测试是文件系统扫描器，对「仓内任意 `.ts/.tsx/.mts/.mjs` 文件消费 `@courtwork/*/testing` 且路径不在白名单」触红——当时红因是 mutation 备份的游离 `.ts` 文件短暂落仓内且消费 `/testing`，**门对、红真、非 flaky**（扫描器把游离文件当真实代码审计正是其职责）。对治：备份一律落 `$TMPDIR` 仓外，不留仓内游离 `.ts`。此前「待验收复跑观察」措辞撤销。


## LEGAL-ANCHOR-BINDING-2 · 引用闭环判据上收（2026-08-10，实现留痕）

**缺口来源**：`LEGAL-ANCHOR-BINDING-1` 上呈的连带事实——场景 `outputArtifacts` 的引用闭环守卫
此前只认 `presentation.fields.format === 'anchor'`，即「包自己在呈现声明里说有锚」。走
`rehydrationProjection` 路径的 artifact（legal 全族）不写 `presentation`，**结构上照不到**：
一枚携系统坐标却不声明 `draftSchemaId` + `citationBinding` 的模型输出可以从那条缝里过门。

**上收后的判据**（两轴并存，命中其一即要求闭环）：

1. **呈现轴**（既有）：`presentation.fields` 含 `format==='anchor'`；
2. **结构轴**（新增）：最终 schema 树内出现 `@courtwork/schemas` 的系统铸造锚——判据是
   wire 包登记的 meta title（`SYSTEM_MINTED_ANCHOR_TITLES` = `SourceAnchor` / `ResolvedSourceAnchor`），
   **族定义真源住 wire 包，registry 只消费不重述**，不在准入层写魔法串、不认字段名、不认形状。

实现：`CollectedSchemaInfo` 增 `carriesSystemMintedAnchor`；最终 schema 每包每 artifact **只走一遍**
walker，枚举词表与携锚判定是同一次遍历的两个读出面（此前呈现声明路径根本不走 walker，
上收后同样纳入 fail-closed 未识别节点覆盖）。拒因文案同批改写为「将携系统铸造坐标的 X 列为模型输出时
必须同时声明独立 draftSchemaId + citationBinding（无锚不落格：模型出引语，系统出坐标）」。

**同批的 item 形态扩面（S4 结构性前置，非可选优化）**：`citationBinding` 的覆盖单元此前只接
单一 `ZodObject`，而 `legal.RevisionInstructionSet` 的 `/instructions` 是四支修订指令的
`z.discriminatedUnion`（实测 `instanceof z.ZodUnion === true`，一条判据覆盖两类）。新增
`itemObjectBranches`：单对象或**全分支皆对象**的联合才算合法 item 根，且 item 级字段判据按
**每一支都须满足**收——一支缺 `itemSummaryField` 就足以让缺口摘要静默回落 `(无摘要)`。
有非对象分支即拒载（fail-closed，同 walker 的 unknown 处置：绝不 unknown → 跳过）。

**如实登记的判据上界**：包内自造的同形锚对象（无 meta title）不在结构轴上。它不构成静默洞——
那样的对象不是 resolver 的写回目标，本就没有引用闭环契约可言；但准入层确实照不到它，
已以正向反例（`admission.test.ts`「把锚换成不携该 title 的同形对象即不再触发」）把这条边界钉住。
