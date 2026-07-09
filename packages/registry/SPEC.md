# SPEC: packages/registry（W2）

状态：已完成

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
- [架构拍板 2026-07-09，W2.1 微工单待办] **YAML 声明加载路径收紧为 strict：未知键必须报错**（scenario 对象及嵌套的 trigger/gate 对象全部 `.strict()`，报错含文件名 + 未知键名）。理由：场景声明是产品团队手编配置，拼错的可选字段名被静默剥离是无声故障；声明文件要 loud failure。注意边界：此收紧仅限声明加载路径，schemas 包数据流 artifact 的默认剥离语义不动（向前兼容考量，故意不对称）。来源：W2 验收观察项。

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
