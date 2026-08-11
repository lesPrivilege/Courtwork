# @courtwork/generic · 通用基线包

权威：`docs/decisions/ADR-023-generic-baseline-package.md`（Accepted）；票面 `apps/desktop/specs/GENERIC-SCENARIOS-1.md`。

## 定位

通用基线包是**产品本体的一部分**，不是可选垂类。它按同一 Package ABI 成立——目录 `packages/generic`、
npm `@courtwork/generic`、`identity.packageId` 为 `generic` 三者一致（ADR-012 决定一），经同一
`admitPackages` 准入、同一 descriptor/bindings 双平面、同一场景与 launch 声明契约进入宿主。

与两枚垂类包的唯一差别是**宿主发行成熟度**：`baseline`（ADR-023 决定二）。该成熟度是宿主发行事实，
住 `apps/desktop/src/composition/package-catalog.ts`，不进本包、不进 Package ABI、不进 `packBinding`。

## 声明面

| 面 | 内容 |
| --- | --- |
| artifacts | `generic.DraftDocument`（起草文稿）、`generic.BatchReport`（批处理报告） |
| scenarios | `generic.draft`（通用起草，一枚必填 `text` 预检字段）、`generic.batch`（多文件批处理，无预检直启） |
| renderers | 只声明既有宿主 blueprint `courtwork.artifact-table.v1`——ADR-023 决定六「不新增第二套 renderer 注册或命名空间机制」 |
| vocabulary | 逐字取底座中性供词（`NEUTRAL_VOCABULARY`）：基线包不给容器着色，着色是垂类加载带来的加法 |

`generic.DraftDocument` 的形制与 `@courtwork/output` 的 `DraftDocxInput` **同构**（`{title, paragraphs}`）：
通用起草的落盘链复用既有自研 `compileDraftToDocx`，不另立第二套编译输入形状。

两枚产物都是**零锚点设计**（summary/正文纯文本、无引语无坐标），故不声明 `citationBinding`，
不触发不变量二义务。若日后出现引语需求，属另立票的 schema 变更——模型永不出坐标。

## 逐项完整性裁决（`domain/batch-completeness.ts`）

`BatchReport` 的「每份就绪材料恰一行」是**系统**判断，不是模型自述：

- 闭集外 `materialId` → 整面拒（`UnknownBatchMaterialError`）；
- 同一 `materialId` 多行 → 整面拒（`DuplicateBatchRowError`）；
- 缺行 → 系统补一行 `status: 'missing'`、`summary` 留空（绝不代写摘要）；
- 行序恒按就绪材料闭集序（账面次序不随模型输出次序漂移）。

`batchReportSchemaFor(readyMaterialIds)` 把该裁决落在 **schema 边界**上——裁决发生在产物成形之前，
补齐的 `missing` 行进的是产物本体与账本，不是读侧投影。

实现只用 Zod 4 的 `.check()`，**禁用 `.transform()`**：`z.toJSONSchema` 对 transform 抛错，而 provider
侧对该异常有**无声**兜底（退回 `json_object` 档位、零 notice），那是不变量四禁止的静默降档。
该判据由 `domain/batch-completeness.test.ts` 的 `z.toJSONSchema` 用例把守。

## 中性义务

descriptor、prompt 段与词表承担零垂类语义义务，机器判据在 `package/neutrality.test.ts`
（`GENERIC-PACK-1` ①附十枚场景词零命中断言的扩覆）。基线包不得引用任何垂类包；壳侧的对称
判据由 `apps/desktop/scripts/assert-vertical-isolation.mjs` 的包名正则闭集（含 `generic`）把守。
