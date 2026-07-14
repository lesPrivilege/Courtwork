# SPEC: packages/pm

状态：`ABI-2B` 与 `VIEW-ABI-1C` 已独立验收放行；`PM-SCHEMA-1` 契约债已登记，完成前不得创建 PM scenario。

## VPKG 体例迁移（进行中）

权威：`docs/decisions/ADR-012-vertical-package-kit-and-visual-blueprints.md` 与
`docs/architecture/vertical-package-authoring.md`。

1. `VPKG-META-1` 已令 `package.json.version` 与 descriptor `identity.version=0.1.1` 同字节，并与 Legal 共用 package version / JSON Schema drift / browser-safe conformance 门。不得改变 `schemaVersion=1`。
2. `PM-PACKAGE-RENAME-1` 将迁移前目录/npm 名 `packages/pm-schemas` / `@courtwork/pm-schemas` 机械改为 `packages/pm` / `@courtwork/pm`，更新全部生产/测试/文档 consumer 与 lockfile；`packageId=pm`、全部 `pm.*` schema/type id、payload 和 fixture 字节不变。实现已完成，待独立验收。
3. `VPKG-EXPORTS-1` 已同步提供 browser-safe `@courtwork/pm/package` 与 `@courtwork/pm/schemas`；根出口语义不变，不创建 `/testing` 或 `/runtime`。
4. `VPKG-LAYOUT-1` 已把 schema 迁入 `src/schemas/`，计算器迁入 `src/domain/`，package data/runtime plane 迁入 `src/package/`；实现待独立验收，不创建空 `scenarios / interactions / runtime / testing`。

PM 在 `PM-SCHEMA-1` 与权威样板项目完成前继续 catalog-only。体例一致不等于补空 scenario、prompt 或企业 stub。

### VPKG-META-1 实现记录（2026-07-14，已独立验收放行）

- `package.json.version` 已从 `0.1.0` 对齐 descriptor release `0.1.1`；`packageId=pm`、全部 `pm.*` id、`schemaVersion=1` 与 payload/fixture 字节均未变化。
- 包内 metadata conformance 锁定 release version 与四枚统一脚本；JSON Schema drift 门继续锁定四份文件全集、Draft 2020-12 与 URN，并改为复用 registry 的递归 remote-ref 守卫覆盖 `$ref/$dynamicRef/$recursiveRef`。
- TDD 红灯证明原 `0.1.0` 版本漂移被拒；临时向提交态 schema 注入远程 `$ref` 时明确以 remote/外部 schema 错误失败；最终 PM 包 **6 files / 37 tests** 全绿。
- 本单未 rename 目录/npm 包，未修改 descriptor、scenario、prompt、payload、JSON Schema 字节或产品 UI；全仓 build/lint 与 Vitest **122 files / 1083 tests** 通过，独立验收已放行。

### PM-PACKAGE-RENAME-1 实现记录（2026-07-14，待独立验收）

- 包目录与 npm 名已唯一对齐为 `packages/pm` / `@courtwork/pm`；desktop composition 与 lockfile importer 只消费新名，没有 alias、双包或 compatibility 出口。
- metadata conformance 新增目录/npm name/descriptor packageId 同字节守卫，并锁定包内 test 脚本的新路径；迁移前定点实际得到 **2 failed / 1 passed**。
- 本单只移动包并更新 active consumer/docs；`manifest.ts`、payload/schema 源、四份 JSON Schema、`packageId=pm`、全部 `pm.*` id、`identity.version=0.1.1`、`schemaVersion=1`、`scenarios=[]` 与 `promptSegments=[]` 均未改变。
- 实现门禁：冻结 lockfile 安装通过；PM **6 files / 38 tests**、Legal **9 files / 73 tests**，两包 lint/build/schema 重生成均通过且无 drift；全仓 build 13 个 workspace、lint 与 Vitest **122 files / 1084 tests** 全绿。本记录不构成验收结论。

### VPKG-EXPORTS-1 实现记录（2026-07-14，待独立验收）

- `@courtwork/pm/package` 只暴露既有 descriptor/bindings/manifest 身份，`@courtwork/pm/schemas` 只汇总既有四类 catalog schema 与类型；根出口继续保留原有 browser-safe 能力。
- desktop composition 真实消费 `/package`，desktop conformance test 真实消费根与 `/schemas`；registry 对三入口递归审计 Node/React/CSS 泄漏和出口集合。
- PM 仍为 `scenarios=[]`、`promptSegments=[]`、无 interactionTemplates；没有新建 `/testing`、`/runtime`、scenario、interaction、fixture 或企业 stub。
- 本单未修改 `packageId=pm`、`pm.*` id、descriptor/presentation、schema/payload、blueprint、词表、计算器或 JSON Schema；目录深度整理仍留给 VPKG-LAYOUT-1。

### VPKG-LAYOUT-1 实现记录（2026-07-14，待独立验收）

- 唯一 package 真源已拆为 `src/package/{descriptor.ts,bindings.ts,index.ts}`；四类 artifact 与宿主 table renderer 的纯 presentation 数据归入 `src/presentation/`，旧 `src/manifest.ts` 不保留 alias 或第二实现。
- 四类 payload schema 与包级 `source-grade` 全部归入 `src/schemas/`，RICE 确定性计算器归入 `src/domain/`；PM 仍为 catalog-only，没有创建 `scenarios / interactions / runtime / testing`。
- `/package` 与 `/schemas` 分别改指新 index，根与 subpath 的运行时导出集合、对象身份及 browser-safe 边界保持不变；完整 descriptor hash、空 prompt blob 与单点/区间/OOC 计算 golden 均锁定迁移前结果，JSON Schema 重生成零 drift。
- layout 门先在旧树得到 Legal/PM 各一项明确失败，再随物理归位转绿；本单没有修改 `pm.*` id、版本、bindings、payload/schema、presentation、计算语义、fixture、blueprint 或 UI。独立放行仍由异会话完成。
- 实现侧实跑：PM **8 files / 44 tests**、Legal **11 / 79**、registry **6 / 84**、demo-runtime **8 / 29**、eval **14 / 64**；全仓 build（13 个 workspace project）、lint 与 Vitest **131 files / 1126 tests** 全绿。

## 职责

PM 第二垂类包。拥有反馈归集、PRD 评审、优先级计算与跨纪要行动项的 schema、presentation、词表和确定性计算；不得把 PM 语义放进 core、registry 或 desktop。

## ABI-2B · 唯一 Package ABI

权威：`docs/decisions/ADR-008-schema-conformance-and-authority.md` 与 `ADR-009-runtime-ports-and-harness.md`。

- 删除本包平行 `ArtifactDescriptor` 与只服务该 descriptor 的 view resolver；四类 artifact 全部进入 `PM_PACKAGE: VerticalPackageManifest` 的 descriptor/bindings 双平面。
- identity 为 `packageId=pm`、`version=0.1.1`、`schemaVersion=1`；四个逻辑 schema id 分别绑定现有 Zod schema。data plane 必须纯 JSON、可冻结、可生成 Draft 2020-12。
- 使用宿主 blueprint `courtwork.artifact-table.v1`。`collectionPointer` 从 artifact 根命中数组；字段 pointer 从每条 item 根命中，全部为 RFC 6901 JSON Pointer。枚举、状态、tags、grade 的 `valueLabels` 必须完整且禁止 wire fallback。
- 当期 `scenarios=[]`、`promptSegments=[]`、`interactionTemplates` 缺省；不得为展示完整度虚构 workflow、prompt 或 demo payload。
- FeedbackDigest、PrdReview、ActionItems 的主条目锚点，以及 PriorityScore 四参数的来源锚点，都必须进入 presentation；因为本单不提供 draft/citation binding，registry 必须阻止未来 scenario 把这些 final artifact 直接声明为模型输出。

## 验收

1. PM 与 Legal 同次准入，任一 PM 坏包隔离且不污染 Legal。
2. 删除旧 descriptor/view resolver 后全包无引用；不存在第二准入、第二词表或第二 renderer 真源。
3. 四个 schema binding、collection/field pointer 和 valueLabels 均由 golden/非法样例锁定；漏一枚枚举值、pointer 漂移、wire fallback、锚 artifact 无 draft 的 model-output scenario 必须实际变红。
4. PM package test/build、全仓 build/lint/test 通过；不修改 desktop UI。

## ABI-2B 实现记录（2026-07-14）

- `PM_PACKAGE_DESCRIPTOR` / `PM_PACKAGE_BINDINGS` / `PM_PACKAGE` 已成为四类 artifact 的唯一 Package ABI 真源；identity 当前为 `pm / 0.1.1 / schemaVersion 1`，当期保持 `scenarios=[]`、`promptSegments=[]`，不伪造工作流。
- 四个 artifact 统一声明宿主 blueprint `courtwork.artifact-table.v1`。字段显示名与枚举/状态/tags 词表内聚到各自 `presentation.fields`；collection/field 全部改用 RFC 6901 pointer，三类主条目锚与 PriorityScore 四参数锚均进入 presentation。
- `PriorityScore` 的 Reach/Impact/Confidence/Effort pointer 必须指向完整 `{value,range,status}` envelope 并使用通用 `estimate` format；score 也使用 `estimate` 以覆盖确定单值与传导区间。参数缺口状态 labels 随 field 完整声明。禁止只指 `/value` 而把合法区间显示为破折号；descriptor release version 因本修正递增，schemaVersion 不变。
- 旧 `descriptor.ts`、`descriptors.ts`、`view-resolver.ts` 及 barrel export 已删除；全仓生产代码无旧真源消费点，不保留兼容层。
- 四份 Zod binding 通过 registry 通用出口生成自包含 Draft 2020-12 JSON Schema，`$id` 固定为 `urn:courtwork:schema:pm.<Name>:v1`，drift test 同时锁定文件全集与禁止远程 ref。
- golden 以四份合法 fixture 证明 collection 从 artifact 根、field 从 item 根命中，并证明 UI 值只能取 field-local `valueLabels`；漏词、pointer 漂移及坏包隔离均有反例。
- 实现会话门禁：PM/registry/legal 定点 17 files / 165 tests；全仓 build 12 个 workspace、ESLint、Vitest 118 files / 1034 tests 全绿。另以真实 `LEGAL_PACKAGE + PM_PACKAGE` 同次准入验证零拒载零 warning，并注入坏 PM 验证 Legal 仍独立准入。
- 独立验收实际注入漏 `community` label、pointer 漂移、普通字段 labels 与移除 anchor-output 门禁四类变异，均观察红灯后撤；最终 PM 33/33、四包 255/255、全仓 1034/1034。结论放行，详见 `ACCEPTANCE.md`。

## VIEW-ABI-1C · estimate presentation 实现记录（2026-07-14，已独立验收）

- PriorityScore 的 Reach/Impact/Confidence/Effort 均从参数根 pointer 投影完整 envelope，携带精确状态标签；score 以同一 `estimate` format 投影确定单值或传导区间。descriptor release identity 递增至 `0.1.1`，payload schema 与 `schemaVersion=1` 未变。
- 当期仍为 catalog-only：`scenarios=[]`、`promptSegments=[]`，没有新增 PM workflow、prompt、demo payload 或 desktop 入口。合法 descriptor 与非法 estimate pointer 的逐包隔离均由 registry 通用准入测试覆盖。
- 实现侧 PM 全量 **5 files / 35 tests**，registry + PM 合计 **9 files / 111 tests**；全仓 build（13 个 workspace project）、root ESLint 与 Vitest **120 files / 1060 tests** 全绿。

## PM-SCHEMA-1 · OOC score 契约收口（待派发）

`computeRowScore()` 在任一参数 `status='out_of_contract'` 时确定性返回 `null`，但当前
`PriorityRowSchema.score` 只接受 number/range。该不一致不得由 renderer 用 `0`、破折号或缺省值掩盖，
也不得夹带进 WORK-LIVE-1。

本单须由架构会话先拍板 payload 版本与迁移边界，再使 runtime schema、导出 JSON Schema、descriptor、
golden fixture 与计算函数同义；旧 v1 载荷的读取策略必须显式测试。完成并独立验收前，PM 继续
catalog-only，禁止创建 scenario、prompt、demo payload 或 desktop 入口。
