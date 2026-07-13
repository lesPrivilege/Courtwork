# SPEC: packages/legal（FABLE-HARNESS 第 3 步，2026-07-13 立包）

状态：在建（legal 迁出 core——ABI 施工序第 3 步）

## 职责

法律垂类依赖包（docs/architecture/schema-engineering.md「垂类即依赖包」的首个实体）：法律域的 schema、场景声明、
提示词正文、renderer 声明、容器词表、演示语料投影，全部住本包。底座（schemas/registry/core）
只持机械件——验证标准（docs/architecture/schema-engineering.md 包域律）：**core 对包是纯执行器——跑得动 legal.*，读不懂 legal.***，
由 `packages/core/src/package-boundary.test.ts` 机器守护。

## 交付清单

- `src/schemas/`：法律五 artifact schema（CaseFile/Timeline/PartyGraph/RiskList/ReviewMatrix），
  自 packages/schemas 迁入（git mv 保历史）。**基座契约不迁**：SourceAnchor/RevisionEvent/
  信源分级（拍板既裁）+ RevisionInstructionSet（output 管线 wire 契约）+ FileOpsPlan（tools
  文件执行器 wire 契约）+ IngestStatus（材料管线状态词汇）留中央，本包 re-export 消费。
- `src/manifest.ts`：`LEGAL_PACKAGE`（VerticalPackageManifest）——包身份（含七个旧裸类型名
  的账本读侧迁移别名表）、七 artifact descriptor（含续行投影声明/枚举词表/副作用分级）、
  五场景声明 v2（legal.S1–S4/S6，namespaced + confirmationPolicy + promptSegmentRef + 步骤树）、
  五段声明级提示词正文、七 renderer 声明、两枚受控交互模板、容器词表（卷宗/阶段/卷宗材料）。
- `src/compile-risk-list-to-revisions.ts`：RiskList→RevisionInstructionSet 编译（法律语义，
  自 core/composition 迁入）。信源门禁经 `EvidenceGatekeeper` 注入口绑定——本包零 core 依赖。
- `src/demo/s3-risk-list-response.ts`：S3 演示脚本响应（自 core/composition 迁入）。
- `json-schema/` + drift 测试：法律五 schema 的对外 JSON Schema 契约面（随包迁移，同纪律）。

## 依赖

`@courtwork/schemas`（基座契约）+ `@courtwork/registry`（manifest 类型）。**禁止依赖 core**
（防装配环：core 装配点 import 本包）。

## 验收

- `manifest.test.ts`：包准入自证（admitPackages 零拒载零警告）、五场景 promptBody 闭合、
  七 descriptor 投影就绪、副作用如实声明、账本别名归一、受控交互模板、容器词表。
- 迁移三处基座契约回移记录：RevisionInstructionSet/FileOpsPlan/IngestStatus 判为底座机器
  的 wire 契约非法律专属（消费方：output/tools/reading-view）——**底座机器消费的契约留中央**
  为本次迁移落下的归属判据。

## TODO

- [ ] RiskList 引用闭环草稿形状（draftSchema + citationBinding）随 HARNESS-1 resolver 步落地。
- [ ] [提案，需架构拍板] RevisionInstructionSet 的 statuteRef（法条引用）是基座契约里唯一的
  法律味字段——远期可拆为通用 citation + 包级扩展位；当期保持原状（output 管线依赖稳定优先）。

## 状态更新（2026-07-13 晚，FABLE-HARNESS 收官）

- TODO 首项已落：`RiskListDraftSchema`（模型侧草稿：basis 携 quoteClaims）+ citationBinding 五声明位入 manifest descriptor；final RiskList gains `outOfCoverage` 缺口表（default []，存量夹具零迁移）。
- 演示语料升级草稿形：`S3_RISK_LIST_DRAFT`（引语无坐标；risk-07 blockId 消歧双命中实景）；坐标全部由 core resolver 铸造——演示管线与真管线过同一道公证门。

## 状态更新（2026-07-13，LEGAL-DEMO-RUN）

- 演示语料新增 PDF 卷宗档：`S3_PDF_DOSSIER_DRAFT`（src/demo/s3-pdf-dossier-draft.ts）——引语全部出自 demo-data 生成 PDF（设备采购合同.pdf）真实文本层，按页声明；risk-08 首依据出自信用查询单（blockId 声明 + 编译后 output 侧预期 locator_not_found，"定位失败跳过不错插"的保留展示位）；八条风险对应 reading-view s3-material.test 登记的七条诱饵条款 + 主体核验。**考点常量 `S3_PDF_PRELOADED_ANCHOR_QUOTES`（7 条，门槛 5）随剧本同住本包**——golden 考点住 demo 包不住机器（assert-no-demo-in-harness 断言对象）。消费方：core 装配点 buildLegalDemoRunRuntime 与 `demo:legal` 全链穿越通道。

## 状态更新（2026-07-13，INTERACTION-1A）

- `LEGAL_PACKAGE.interactionTemplates` 增两枚最小真实语义模板：`legal.contract-review-position` 是无锚单选，问题与买方/卖方/中立选项均住 legal；`legal.risk-evidence-confirmation` 是 required 锚点确认，要求风险依据可回到原文。
- 两枚模板不读取 demo-data、不包含样板案人物/条款真值，也不携带 `anchorRefs`、bbox、textRange 或其他运行时坐标。`uiTemplateId` 统一为底座批准的 `question-card`；颜色、布局、键盘与动效不进入 legal。
- manifest 自证经 registry 双键查询核对 kind、anchorPolicy、skippable 与 option id；本工单不新增场景运行步骤，不接 core 暂停续行，不改变既有 artifact/prompt/renderer 声明。
- `manifest.test.ts` 先以 `interactionTemplates === undefined` 稳定证红，再随两枚声明转绿；最终与 registry 契约定点合计 45/45 通过。
