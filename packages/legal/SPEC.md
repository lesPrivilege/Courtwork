# SPEC: packages/legal（FABLE-HARNESS 第 3 步，2026-07-13 立包）

状态：PACKAGE-ABI 已成立；ABI-2A 双平面迁移已独立验收放行；VPKG-LAYOUT-1 已实现待独立验收

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
