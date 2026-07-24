# SPEC: packages/legal（FABLE-HARNESS 第 3 步，2026-07-13 立包）

状态：PACKAGE-ABI 已成立；ABI-2A 双平面迁移已独立验收放行；VPKG-LAYOUT-1 已实现待独立验收

## AUDIT-SEAL-1 · legal.S6 确认前工具声明清理（实现完成，待独立验收）

权威：[实现就绪图 `AUDIT-SEAL-1` 行](../../docs/architecture/implementation-readiness.md) + [ADR-004](../../docs/decisions/ADR-004-documents-and-files.md)。基线 `main @ bcafc5e`，分支 `impl/audit-seal-1`。

- S6 `toolIds` 由 `['copy-file', 'mkdir', 'file-ops-executor']` 收窄为 ADR-004 无损级 `['copy-file', 'mkdir']`；与 prompt 「不执行任何操作，执行发生在用户确认之后」对齐。不改 prompt 字节、artifact/schema、gate label 或 steps。
- 该有意 descriptor 声明收窄使既有整面 golden `sha256(LEGAL_PACKAGE_DESCRIPTOR)` 由 `d9c789baf973786e8022c5545b56391b65eadf7dbbe273cf31cef882a60c882b` 重算为 `6d0b6ea2a1144acc7307dac890314612d675968be0a4266b3b00a2f312efb7bf`；`promptBlob()` hash 不变，不冒充静默 drift。
- **TDD 红证**：新 manifest 反例修复前实得 S6 多出 `file-ops-executor`，**1 failed / 11 passed**；删除悬空声明后与 core 聚焦合计 **21/21** 转绿。
- **复杂度审视**：零新概念、零新依赖/导出/持久化；本层是纯删减一枚与 prompt 矛盾的声明。扫描 S6 声明与现行 consumer 后，未发现已装配的 S6 live 运行入口。
- **[需架构拍板]**：S6 未来进入 live 前，须另行定义 `FileOpsPlan` gate resolve 后如何以已确认输入触发 `file-ops-executor`、如何持久授权与事务日志；本单不自行新增执行步类或改 gate 契约。
- **实现侧终值**：`pnpm -r build`、`pnpm lint` 通过；root Vitest **144 files / 1247 tests**；S3/Legal 两条 demo golden 均 PASS。独立验收未由本会话执行。
- **精确触面**：`src/scenarios/index.ts`、`src/package/manifest.test.ts` 与本 SPEC；不触 core 外的任何垂类契约。

## VPKG 体例迁移（进行中）

权威：`docs/decisions/ADR-012-vertical-package-kit-and-visual-blueprints.md` 与
`docs/architecture/vertical-package-authoring.md`。

- `VPKG-META-1`：与 PM 对齐 test/lint/build/generate 脚本、版本一致性门与 JSON Schema 全集/URN/Draft/remote-ref drift 门；不改 payload、descriptor 或场景语义。
- `VPKG-EXPORTS-1`：根出口保持 browser-safe；三份 demo fixture 迁入显式 `/testing`，只允许 demo-runtime/acceptance 消费。`/package`、`/schemas` 与 `/testing` 形成可被依赖图审计的出口。
- `VPKG-LAYOUT-1`：按 `src/package / schemas / presentation / scenarios / interactions / domain / testing` 逐步归位。纯物理迁移不得顺手改未版本化 blueprint、prompt 字节、typeId 或历史 snapshot。

新增企业接口只可在第一项真实 integration 到来后建立 `/runtime`；不得预建空 adapter 或让 core/registry import 厂商类型。

### VPKG-META-1 实现记录（2026-07-14，待独立验收）

- `package.json` 已补齐与 PM 同体例的 `test / lint / build / generate:json-schema`；包内 metadata conformance 同时锁定脚本文字与 `package.json.version === descriptor identity.version`。
- JSON Schema drift 门现锁定 descriptor 引用的八份文件全集、Draft 2020-12、`urn:courtwork:schema:legal.<Name>:v1` 与禁止 remote/外部 ref；新增残余旧文件会直接触红。
- TDD 红灯分别证明缺 `test/lint` 时 metadata 门失败；临时加入 `Legacy.schema.json` 时全集门失败；最终 Legal 包 **9 files / 73 tests** 全绿。
- 本单未修改 Legal descriptor、bindings、scenario、prompt、payload、JSON Schema 字节、导出或目录；全仓 build/lint 与 Vitest **122 files / 1083 tests** 通过，等待异会话验收。

### VPKG-EXPORTS-1 实现记录（2026-07-14，待独立验收）

- 根出口继续只转售 browser-safe schema、descriptor/bindings 与确定性编译逻辑；三份 S3 fixture/考点按原字节机械迁入 `src/testing/`，只能从 `@courtwork/legal/testing` 获取。
- 新增 `@courtwork/legal/package` 与 `@courtwork/legal/schemas`；desktop composition、eval 与 demo-runtime 分别成为 package、schema、testing 的真实 consumer，旧根 fixture 名为零。
- registry 递归解析 root/package/schemas/testing 的本地 import graph，阻止 Node/React/CSS 进入 browser-safe 面；全仓扫描只准 demo-runtime、acceptance 与 test 消费 `/testing`，并以 desktop/core/provider/registry 四类注入反例自证门禁有牙。
- 三份 fixture 与迁移前逐字节 `cmp` 一致；本单未修改 descriptor、bindings、schema、prompt、typeId、blueprint、payload、fixture 内容或 JSON Schema，也未建立 Legal runtime。

### VPKG-LAYOUT-1 实现记录（2026-07-14，待独立验收）

- 唯一 package 真源已拆为 `src/package/{descriptor.ts,bindings.ts,index.ts}`；artifact/renderer、五个真实 scenario 与 prompt、两枚受控 interaction 分别归入 `presentation / scenarios / interactions`，旧 `src/manifest.ts` 不保留 alias 或第二实现。
- RiskList→RevisionInstructionSet 编译器及测试迁入 `src/domain/`；既有 `src/schemas/` 与 `src/testing/` 原样保留，未创建无真实 integration 的 `runtime/`。
- `/package` 改指 `dist/package/index`，根、`/schemas`、`/testing` 的运行时导出集合与对象身份保持不变。固定 hash 锁定完整 descriptor、五段 prompt blob 与三份 fixture；JSON Schema 重生成零 drift。
- layout 门先在旧树得到 Legal/PM 各一项明确失败，再随物理归位转绿；本单没有修改 descriptor JSON、prompt 正文、任何 id/version/binding/payload/fixture、编译结果、blueprint 或 UI。独立放行仍由异会话完成。
- 实现侧实跑：Legal **11 files / 79 tests**、PM **8 / 44**、registry **6 / 84**、demo-runtime **8 / 29**、eval **14 / 64**；全仓 build（13 个 workspace project）、lint 与 Vitest **131 files / 1126 tests** 全绿。

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
- `src/package/`：`LEGAL_PACKAGE_DESCRIPTOR`（纯 JSON）+ `LEGAL_PACKAGE_BINDINGS`（进程内 Zod）及既有 composition 名 `LEGAL_PACKAGE`——包身份（含七个旧裸类型名
  的账本读侧迁移别名表）、七 artifact descriptor（含续行投影声明/枚举词表/副作用分级）、
  并从 `presentation / scenarios / interactions` 组装五场景声明 v2（legal.S1–S4/S6，namespaced + confirmationPolicy + promptSegmentRef + 步骤树）、
  五段声明级提示词正文、七 renderer 声明、两枚受控交互模板与容器词表（卷宗/阶段/卷宗材料）。
- `src/domain/compile-risk-list-to-revisions.ts`：RiskList→RevisionInstructionSet 编译（法律语义，
  自 core/composition 迁入）。信源门禁经 `EvidenceGatekeeper` 注入口绑定——本包零 core 依赖。
- `src/testing/s3-risk-list-response.ts`：S3 演示脚本响应（自 core/composition 迁入）；只从 `/testing` 出口消费。
- `json-schema/` + drift 测试：descriptor 引用的八枚 final/draft schema 对外契约面（含 RiskListDraft、RevisionInstructionSet、FileOpsPlan；随包迁移，同纪律）。

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

- [x] RiskList 引用闭环草稿形状已落地；ABI-2A 后以 `draftSchemaId` + bindings 闭合，citationBinding 字段语义不变。
- [ ] [提案，需架构拍板] RevisionInstructionSet 的 statuteRef（法条引用）是基座契约里唯一的
  法律味字段——远期可拆为通用 citation + 包级扩展位；当期保持原状（output 管线依赖稳定优先）。

## 状态更新（2026-07-13 晚，FABLE-HARNESS 收官）

- TODO 首项已落：`RiskListDraftSchema`（模型侧草稿：basis 携 quoteClaims）+ citationBinding 五声明位入 manifest descriptor；final RiskList gains `outOfCoverage` 缺口表（default []，存量夹具零迁移）。
- 演示语料升级草稿形：`S3_RISK_LIST_DRAFT`（引语无坐标；risk-07 blockId 消歧双命中实景）；坐标全部由 core resolver 铸造——演示管线与真管线过同一道公证门。

## 状态更新（2026-07-13，LEGAL-DEMO-RUN）

- 演示语料新增 PDF 卷宗档：`S3_PDF_DOSSIER_DRAFT`（src/testing/s3-pdf-dossier-draft.ts）——引语全部出自 demo-data 生成 PDF（设备采购合同.pdf）真实文本层，按页声明；risk-08 首依据出自信用查询单（blockId 声明 + 编译后 output 侧预期 locator_not_found，"定位失败跳过不错插"的保留展示位）；八条风险对应 reading-view s3-material.test 登记的七条诱饵条款 + 主体核验。**考点常量 `S3_PDF_PRELOADED_ANCHOR_QUOTES`（7 条，门槛 5）随剧本同住本包**——golden 考点住 testing 包面不住机器（assert-no-demo-in-harness 断言对象）。消费方：demo-runtime 装配点 buildLegalDemoRunRuntime 与 `demo:legal` 全链穿越通道。

## 状态更新（2026-07-13，INTERACTION-1A）

- `LEGAL_PACKAGE.interactionTemplates` 增两枚最小真实语义模板：`legal.contract-review-position` 是无锚单选，问题与买方/卖方/中立选项均住 legal；`legal.risk-evidence-confirmation` 是 required 锚点确认，要求风险依据可回到原文。
- 两枚模板不读取 demo-data、不包含样板案人物/条款真值，也不携带 `anchorRefs`、bbox、textRange 或其他运行时坐标。`uiTemplateId` 统一为底座批准的 `question-card`；颜色、布局、键盘与动效不进入 legal。
- manifest 自证经 registry 双键查询核对 kind、anchorPolicy、skippable 与 option id；本工单不新增场景运行步骤，不接 core 暂停续行，不改变既有 artifact/prompt/renderer 声明。
- `manifest.test.ts` 先以 `interactionTemplates === undefined` 稳定证红，再随两枚声明转绿；最终与 registry 契约定点合计 45/45 通过。

## 状态更新（2026-07-14，ABI-2A）

- 七个 artifact 的 Zod schema 已全部移出 descriptor，改由八枚显式逻辑 id 闭合到 bindings；RiskList final/draft 分别是 `legal.RiskList` / `legal.RiskListDraft`，不再把 draft 藏在 final binding。
- `LEGAL_PACKAGE_DESCRIPTOR` 可原样 JSON stringify；准入快照递归深冻结。registry 唯一 compatibility adapter 使 core/desktop 现有读取行为保持不变。
- 八份提交态 JSON Schema 均携绝对 URN `$id` 与 Draft 2020-12 声明，drift 门覆盖全部 descriptor 引用；本单没有改法律 schema 字段语义、场景、renderer、交互文案或 PM 包。

## 状态更新（2026-07-17，VOICE-SPEC-1 §9 词表统一，架构拍板的内容契约变更）

- 词表统一（产品负责人 2026-07-17 拍板，随 LEGAL-S3-BINDING-1 载体落地）：`presentation` 的 `enumLabels.ingestStatus.needs_ocr` 由 `'需 OCR'` 改 `'需文字识别'`，与 desktop 全局「文字识别」用语统一（OCR 系工程缩写，`docs/design/principles.md` §9 直接适用）。**这是有意的内容契约变更，非 golden 漂移**：`VPKG-LAYOUT-1` 描述符 golden `sha256(LEGAL_PACKAGE_DESCRIPTOR)` 随之重算为 `d9c789baf973786e8022c5545b56391b65eadf7dbbe273cf31cef882a60c882b`（`layout-golden.test.ts`）；`promptBlob()` hash 不受影响（enumLabel 不在 promptSegments，期望值不变）。VOICE-SPEC-1 侧 `lint:voice` 只扫 `apps/desktop/src`，普查发现此不一致后回滚其改动并登记提案，由正在 legal 领地施工的本单承载，不越权跨包改 golden。

## Legal S3 单品收束契约（2026-07-24，架构拍板）

权威：ADR-010 决定五的 2026-07-24 修订。目标是把既有 RiskList 真链收束成诚实的合同审查
单品，不扩 RiskList schema，也不把本包变成 DOCX 引擎。

- host binding 必须为 production S3 提供确定性 `legal.CaseFile` 输入，不能继续以空
  `inputArtifacts` 运行一个声明了 CaseFile 前置的场景。文件列表由同 session 冻结 materials
  派生：显式主合同 `documentType='contract.primary'`，其余为 `'supporting'`，ready 对应
  `ingestStatus='done'`，并携 contentHash；不在 legal 内读取路径或猜文书类型。
- S3 prompt 在不改变输出 schema 的前提下明确：主合同 fileId 是批注目标；支持材料只供核验背景；
  每项拟批注风险至少给出一枚主合同逐字引语，材料不足进入现有 out-of-coverage 纪律，不把支持材料
  的引语冒充主合同定位。prompt blob hash 变化是本票有意内容契约变更，须同步 golden。
- S3 package descriptor 的 gate label 改为且只可为
  “提交处置并完成合同审查；有已确认风险且无待索证项时生成批注稿”。desktop production 最终按钮逐字消费该
  label，不另写一份近义文案；descriptor、confirmation_requested 事件、录制与 golden 必须同源。
  该条件式 label 同时覆盖零风险/全部驳回/outOfCoverage 未闭合的零文书正常终态，以及至少一项
  confirmed 且无待索证项时的批注稿 effect，使持久 `confirmation_resolved` 能证明用户授权的是
  同一件事。
- “修正并确认”与 ReviewItemResolution→RevisionInput 映射属于 desktop host binding，不在本包
  新增 UI/command/core 类型。本包只要求收到的 post-revision RiskList 继续满足 schema，模型不得
  参与用户修正文案。
- `compileConfirmedRiskListToRevisionInstructions` 继续只产 `commentOnly`，不得借 UI 的
  “修正”生成模型替换条款。编译只消费 post-revision RiskList 中
  `dispositionStatus==='confirmed'` 的项；任一 pending 以 typed incomplete error 阻断，零 confirmed
  以 typed no-confirmed error 阻断，任一 `outOfCoverage` 以 typed unresolved-coverage error 整份
  阻断，即使同时有 confirmed 也不得部分编译；绝不返回违反
  `RevisionInstructionSet.instructions.min(1)` 的空集合。正常产品在调用本函数前已把这些分支
  分流为 completed + 零文书。targetDocument
  精确指向显式主合同 materialId，不是文件名。每项风险须按 basis/anchor 原顺序遍历，选择稳定首枚
  `anchor.fileId === primaryMaterialId` 的主合同锚作 locator；支持材料锚仍保留在 citation，
  但不能成为主合同定位。可把该主合同锚已经由 resolver 公证的 quote 降格翻译为 output 自身的候选
  TextLocator，但这不改变 SourceAnchor 只认坐标的权威语义；output 必须对
  not_found/ambiguous/text_changed fail closed。若没有主合同锚点，必须进入显式未落点/阻断清单，
  不能拿支持材料 quote 在主合同里碰运气。
- 缺主合同锚由本模块导出的 `MissingPrimaryMaterialAnchorError` 表达，稳定
  `code:'missing_primary_material_anchor'`。`MissingPrimaryMaterialAnchorItem` 精确为
  `{riskId:string; summary:string; quote:string}`，错误携
  `readonly items: readonly [MissingPrimaryMaterialAnchorItem,
  ...MissingPrimaryMaterialAnchorItem[]]`。编译任何 instruction 前，先扫描全部
  confirmed 风险：每项仍按 basis/anchor 原顺序找首枚 `fileId===primaryMaterialId`；把所有找不到
  的风险一次收齐后再抛。`summary` 逐字取 post-revision `risk.description`；`quote` 只取该风险
  全部 anchors 中首个 trim 后非空的原 quote（可以来自支持材料），无则 `''`，且永远只作 blocker
  展示，不能降格成主合同 locator。desktop 只可把 items 机械映为
  `blocked/non_applied` + 既有 `reason:'not_located'`；不得扩 `NonAppliedReason`、伪造
  instruction/waiver 或触发 output。已有主合同锚但其 quote 缺失继续使用既有
  `MissingLocatorQuoteError`，由 desktop 映为 `ledger_unavailable`，不得混并两类错误。
- 本版对外产物语义是“合同审查批注稿”，不是审查报告或条文 redline。若未来要产生替换文本，
  必须先为结构化建议、人工编辑与 RevisionInstruction 映射另立 schema/ADR；不得从 description
  自由文本直接推导删除/插入。

验收至少包括：CaseFile primary/supporting 与 materialRefs 顺序同源；prompt 主合同纪律与精确
gate label golden；post-revision description 被 comment 编译器逐字消费；支持锚排首、主合同锚
排后时仍取主合同；仅支持材料 anchor 时一次 typed 阻断并收齐全部缺锚 confirmed 风险；
summary/quote 只作 blocker 展示且零 instruction；rejected 风险零 instruction；pending/
零 confirmed/OOC-only/OOC+confirmed 均不产无效或部分 instruction set；commentOnly 闭集不扩。
任一实现不得新增 legal→core 依赖。
