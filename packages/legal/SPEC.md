# SPEC: packages/legal（FABLE-HARNESS 第 3 步，2026-07-13 立包）

状态：在建（legal 迁出 core——ABI 施工序第 3 步）

## 职责

法律垂类依赖包（docs/53「垂类即依赖包」的首个实体）：法律域的 schema、场景声明、
提示词正文、renderer 声明、容器词表、演示语料投影，全部住本包。底座（schemas/registry/core）
只持机械件——验证标准（docs/53 包域律）：**core 对包是纯执行器——跑得动 legal.*，读不懂 legal.***，
由 `packages/core/src/package-boundary.test.ts` 机器守护。

## 交付清单

- `src/schemas/`：法律五 artifact schema（CaseFile/Timeline/PartyGraph/RiskList/ReviewMatrix），
  自 packages/schemas 迁入（git mv 保历史）。**基座契约不迁**：SourceAnchor/RevisionEvent/
  信源分级（拍板既裁）+ RevisionInstructionSet（output 管线 wire 契约）+ FileOpsPlan（tools
  文件执行器 wire 契约）+ IngestStatus（材料管线状态词汇）留中央，本包 re-export 消费。
- `src/manifest.ts`：`LEGAL_PACKAGE`（VerticalPackageManifest）——包身份（含七个旧裸类型名
  的账本读侧迁移别名表）、七 artifact descriptor（含续行投影声明/枚举词表/副作用分级）、
  五场景声明 v2（legal.S1–S4/S6，namespaced + confirmationPolicy + promptSegmentRef + 步骤树）、
  五段声明级提示词正文、七 renderer 声明、容器词表（卷宗/阶段/卷宗材料）。
- `src/compile-risk-list-to-revisions.ts`：RiskList→RevisionInstructionSet 编译（法律语义，
  自 core/composition 迁入）。信源门禁经 `EvidenceGatekeeper` 注入口绑定——本包零 core 依赖。
- `src/demo/s3-risk-list-response.ts`：S3 演示脚本响应（自 core/composition 迁入）。
- `json-schema/` + drift 测试：法律五 schema 的对外 JSON Schema 契约面（随包迁移，同纪律）。

## 依赖

`@courtwork/schemas`（基座契约）+ `@courtwork/registry`（manifest 类型）。**禁止依赖 core**
（防装配环：core 装配点 import 本包）。

## 验收

- `manifest.test.ts`：包准入自证（admitPackages 零拒载零警告）、五场景 promptBody 闭合、
  七 descriptor 投影就绪、副作用如实声明、账本别名归一、容器词表。
- 迁移三处基座契约回移记录：RevisionInstructionSet/FileOpsPlan/IngestStatus 判为底座机器
  的 wire 契约非法律专属（消费方：output/tools/reading-view）——**底座机器消费的契约留中央**
  为本次迁移落下的归属判据。

## TODO

- [ ] RiskList 引用闭环草稿形状（draftSchema + citationBinding）随 HARNESS-1 resolver 步落地。
- [ ] [提案，需架构拍板] RevisionInstructionSet 的 statuteRef（法条引用）是基座契约里唯一的
  法律味字段——远期可拆为通用 citation + 包级扩展位；当期保持原状（output 管线依赖稳定优先）。
