# SPEC: packages/registry（W2）

状态：已完成

## 现行架构工单（2026-07-13）

### INTERACTION-1 · 垂类注入的通用交互模板

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
