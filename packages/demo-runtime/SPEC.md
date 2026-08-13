# SPEC: packages/demo-runtime

状态：`CORE-BOUNDARY-1` 与 `TURN-WORK-1` 均已独立验收放行。

## TOOL-READ-1 · demo/acceptance 消费面（2026-08-11/13，实现留痕；R1 返修已提交，待独立验收）

权威：`apps/desktop/specs/TOOL-READ-1.md` 裁定五（消费者边界圈在 demo/acceptance 族）。

### 本层职责与公开契约

- **`composition/demo-assembly.ts` 新增两枚装配件**：`createDemoReadySource(materials)`（样板材料→`ReadySourcePort`）与 `buildRequestableToolRegistry(materials)`（两枚只读工具入 registry）——与 S3 装配各自一份 registry，互不夹带。
- **集成测试 `acceptance/tool-request.integration.test.ts`**：整条真链（ABI 准入 → registries → 真 executor → 真工具 → 真材料）；闭集外工具被点名不执行不入账本、材料读不到时拒因进下一轮 prompt。
- **第二份 golden**：`acceptance/__golden__/s3-assembly.golden.txt` 随四知文本扩 `request_tool` 重铸（`COURTWORK_UPDATE_GOLDEN=1` 显式过账），由 `s3-assembly-golden.test.ts` 把守。

### 消费边界

demo/acceptance 樁只在 demo 双向隔离内消费通道；production generic/legal 场景接线随各自票面后续声明 `requestableToolIds`，本票不夹带。

### OSS 四选一（R1-3，本票统一裁定）

**借行为或源码范式，零新增直接依赖**：显式 tool-result 配对与内联截断告知借自 pi/opencode；demo 装配与 golden 继续自持。

## AUDIT-SEAL-3 · Legal 绑定投影同步（实现完成，待独立验收）

`demo-assembly.ts` 继续是受信 Legal/demo 组合根：富语料的 `litigationSummary` 在此投影为 tools 中性 `relatedRecords[{reference,summary}]`，Legal 样板案号仅存在于绑定层；工具 verified/source/grade 与 S3 流程不回退。cite-check 当前无 production Legal 注册消费面；其 demo corpus lookup 仍在绑定测试先判 `citationType==='statute'`，证明开放 tools discriminator 没有取消垂类自己的闭集规则。零新依赖、状态、抽象或执行步骤。

## 职责

本包是 Courtwork 唯一 demo/acceptance composition root，负责把 `core` 通用执行机与 legal、demo-data、output、reading-view、provider/registry/tools 组装为脚本化演示、真跑入口和端到端 golden。它只由开发/验收消费；`packages/core` 与 `apps/desktop` 不得反向依赖。

## 边界

- 允许跨 core/legal/demo-data/output/reading-view 绑定，但不得成为生产代码的隐式入口。
- 演示 fixture、场景、事件、引用、确认、修订输出与 golden 语义源自原 core 内实现；搬包不改其字节或流程。
- CLI 等价入口：`demo:s3`、`demo:legal`、`real:s3`。provider 通用 smoke 仍属 `packages/provider`/原 core 兼容脚本，不进本绑定包。
- 本包可删除而不影响 core build/test；依赖图必须无环。

## CORE-BOUNDARY-1 验收目标

原 demo/acceptance 定向测试、S3 全链、LEGAL-DEMO 全链、真跑防污染、六段组装 golden 全部等价；`s3-assembly.golden.txt` 保持原始 SHA-256 `0047e71264f6ddb6aa25cf5ceb10aca7b4a0bd7aee913b9630bb8cafb79bcd07`。

## TURN-WORK-1 装配边界

本包是唯一允许把 provider、TurnStore、`createTurnRunner` 与 core Scenario executor 绑定在一起的
demo/acceptance composition root。迁移后所有 scripted/real S3 与 legal demo 都必须经
`TurnRunnerPort`；不得为保 golden 在本包重造 `Provider.generate()` 旁路、伪终态或 notice side channel。
既有 fixture 字节、引用修复轮数、artifact、确认、修订、docx 与 golden 不变；新增证据只允许是
`turn_linked`/model `step_failed`/Turn journal。真 provider 缺 key 仍必须在读取材料前拒绝。

### TURN-WORK-1 实现留痕（2026-07-14，已独立验收）

- `composeRuntimeTurnRunner` 是本包统一的 provider + TurnStore 装配点；scripted S3、real S3 与 legal demo 都向 `ScenarioExecutorDeps` 注入 `TurnRunnerPort`，Work 路径不再持有 provider。
- S3/legal 全链在各自 workDir 追加 `turns.jsonl`，wire witness 改在 `Provider.stream` 接缝记录，`generate()` 明确拒绝旁路；fixture、引用修复、artifact、确认、修订与 docx 语义未改。
- golden 只增加模型调用前的 `turn_linked` 审计事件：S3 由 8 变 9，legal demo 由 15 变 16。当前定向为 8 files / 29 tests；本节不构成验收放行。
- CLI 实跑：`demo:s3` 仍产出 39,713 bytes redline、7/7 考点、golden PASS；`demo:legal` 仍为 8 风险、11/11 锚点、7 确认 + 1 驳回、golden PASS。

## OUTPUT-CORRECTNESS-1 消费者同步留痕（2026-07-15）

- `run-s3-demo.ts` 与 `run-legal-demo.ts` 已同步 `applyRevisionInstructionSet` 的 non-applied 落盘门禁：先按默认策略调用并接住 `NonAppliedInstructionsError`，逐条读取 `error.nonApplied`，再把这些精确 instruction id 传给 `onNonApplied: 'confirm'` / `confirmNonApplied` 后才取得并写出 docx。
- 两条 demo 链仍显式保留每条 `InstructionOutcome`，包括 `locator_not_found`；不得把捕获异常改回静默跳过，也不得用整批 always-allow 代替逐条确认。
- 本同步只修正 demo/acceptance composition consumer，不改变 output 契约、schema 字段、公开导出或 production 装配边界。

## 实现留痕（2026-07-14）

- 搬迁前原 core demo/acceptance 定向 19/19；搬迁后本包 8 个测试文件 26/26（含新的依赖无环/反向依赖守卫）。
- `demo:s3` 继续产出 39,713 bytes redline，7/7 预埋考点，事件序列与指令结果不变；`demo:legal` 仍为 8 风险、7 确认 + 1 驳回、11 引用全命中、15 事件，golden PASS。
- 本包不引入新第三方 runtime；仅承接原 core 的 workspace 绑定依赖。
- 全仓最终门禁：`pnpm -r build`、`pnpm lint`、`pnpm test` 116 文件 1000/1000 通过。

## 独立验收留痕（2026-07-14）

- 迁移差异经 rename 与逐文件 diff 复核，只包含物理搬迁、跨包 import 改接 core 公共契约、CLI 包名更新和边界守卫；未改 fixture、事件、锚点、确认、修订或 output 语义。
- 本包 **8 files / 26 tests**；S3 与 LEGAL 两条 CLI 均通过既有 golden。迁移前后六段组装 golden SHA-256 完全一致。
- 整包临时移出 workspace 后，core 清空 `dist` 仍可独立 build 并通过 **22 files / 232 tests**；依赖图守卫及注入环自检通过，core/desktop 对本包无反向依赖。
- 详细证据与放行边界见 `packages/core/ACCEPTANCE.md` 的“CORE-BOUNDARY-1 独立验收”。

## WORK-STORE-MEASURE 度量脚本（2026-07-15，dev-only）

为 `WORK-STORE-1` 开工提供 whole-envelope 的实测数字，落 `scripts/work-store-measure/`（dev/acceptance-only，本包唯一允许跨 core/legal/demo-data 绑定的装配根性质不变）。度量项、数字与阈值建议见该目录 `REPORT.md`；一键复现 `bash scripts/work-store-measure/run.sh`。

**复杂度节制留痕——本工单在产品代码新增概念 = 0**：无新依赖、无新持久化格式、无新状态机、无新通用抽象。新增物全部是 dev-only 测量脚本：

- `measure-envelope.ts`（tsx）：驱动真实 `legal.S3` scripted 全链，在每个真实落账点按 ADR-010 决定二形状组装 whole-envelope 度量字节。内部 `WorkStateEnvelopeV1` 是 ADR 已拍板形状的**本地镜像**，只在脚本内、不落 core（WORK-STORE-1 才拥有真本），不构成新契约。
- `cas-latency.c`（clang 直编）：原子替换 CAS 的系统调用级延迟（`fsync` / `F_BARRIERFSYNC` / `F_FULLFSYNC` / none）。属测量工具非产品依赖：无 benchmark 库、无 npm 包。
- `crash-inject.mjs`（node + 真实 SIGKILL）：kill -9 崩溃注入验证原子替换恢复窗口。无新依赖。

结论：v1 whole-envelope CAS + 原子替换 + F_FULLFSYNC 足够正确，未触任何阈值，**不需要 snapshot+tail / 手写 WAL**（确认 ADR-010 决定二，非推翻）。对 `src/work/` 与 `src/scenario-executor/` 既有偶然复杂度的扫描提案已列入 `packages/core/SPEC.md` 的 TODO（跨层放入区），本工单只列不删。

## CONTRACT-OUTPUT-TRUTH-1 跨包同步留痕（2026-07-26，架构追认）

`packages/legal` 的 `compileConfirmedRiskListToRevisionInstructions` 在本票取得**主合同同源判据**
（按 `anchor.fileId === primaryMaterialId` 逐 basis/anchor 选 locator）。契约变化必须同步全部消费者
（根 `CLAUDE.md` 不变量 5），本包的两条 demo 链因此各改一处——**架构 2026-07-26 追认为不变量 5 的
正常履行，非越界**。

**为何改**：旧编译器硬取 `basis[0].sourceAnchors[0]`，`targetDocument` 传什么都不影响选锚，于是
「编译目标」与「锚所在的件」长期对不上也没人发现。新判据一上线，三处不同源立刻暴露。

**改了哪三处**：

| 位置 | 旧状 | 现状 |
|---|---|---|
| `acceptance/run-s3-demo.ts` 的 `CASE_FILE` / 编译目标 | CaseFile 写 `04-设备采购合同.md`，materials 实际加载 `sample-sale-contract-v1.docx`，编译目标又传 `04-设备采购合同.docx`——**三者互不相同** | 统一为 `S3_DEMO_PRIMARY_FILE_ID = 'sample-sale-contract-v1.docx'`，materials / 锚 / CaseFile / 编译目标同源 |
| `acceptance/run-s3-demo.ts` 的处置 | 只处置首项、其余留 `pending`，靠旧编译器「非 rejected 即编译」蒙混过关 | `RISK_DISPOSITIONS` 逐条处置（六项确认 + `risk-07` 驳回），与真实 gate「逐条填满才可续行」同形 |
| `acceptance/run-legal-demo.ts` 的编译目标 | 传 `设备采购合同.docx`，而全部锚挂在 `S3_PDF_CONTRACT_FILE_ID`（`设备采购合同.pdf`）上 | 传 `S3_PDF_CONTRACT_FILE_ID`，与锚同源 |

**判据坐标**：`docs/decisions/ADR-010-work-live-boundaries.md` 决定五 2026-07-24 修订倒数第二条
（「Legal 编译器不得固定取 `basis[0].sourceAnchors[0]`……支持锚排在前、主合同锚排在后的 fixture
必须仍落到主合同」）；`packages/legal/SPEC.md` 同名节。

**由此产生的两处期望值变化**（都是**修真**，不是改题以迁就实现）：

- `run-legal-demo` 的 `instr-risk-08` 由 `locator_not_found` 变为 `applied`。该风险的
  `basis[0].sourceAnchors[0]` 是信用查询单（支持材料）锚、次枚才是合同锚；旧结果正是 ADR 明令退役的
  「拿支持材料引语去主合同碰运气」。`packages/legal/src/testing/s3-pdf-dossier-draft.ts` 的文件头注释
  同批订正——它原先把这个结果描述成「定位失败即跳过」的纪律展示位。
- `run-s3-demo` 的 `risk-07` 只有支持材料锚，故在处置阶段显式驳回，编译出 6 条指令而非 7 条。

**golden**：`__golden__/s3-assembly.golden.txt` 随 S3 prompt 的主合同纪律重烤；重烤后逐行核 diff，
只含该两段 prompt 文本，无其他夹带（materials/CaseFile 段未出现在该 golden 的比对面内）。
