# GENERIC-SCENARIOS-1 · 通用基线包与首批两场景

状态：票面冻结（2026-08-11 架构会话），待实现。实现与验收须为不同会话；验收由 Codex 独立会话执行。

权威：`docs/decisions/ADR-023-generic-baseline-package.md`（Accepted，本票开工依据）；ADR-015（成品律/零泄漏/激活真源）、ADR-016（填格协议与 launch 同族）、ADR-012 决定四（blueprint 分层）、ADR-014（tab＝schema 表）、ADR-009 决定二（步骤闭集）、ADR-004（文档与文件边界）。`docs/architecture/implementation-readiness.md:293` 的 2026-07 期素材行由本票面取代其排产效力，该行保留作历史真值。

---

## 一 · 票面范围

三件，同一实现分支交付：

1. **通用基线包成立**：`packages/generic`（npm `@courtwork/generic`，packageId `generic`），按 ADR-023 决定一至四接入——descriptor/bindings 双平面、`admitPackages` 数组加员、`PACKAGE_PRESENTATION` 加 `baseline` 条目、`PackageAvailability` 闭集扩员、`registriesForCase` 改并集语义、`assert-vertical-isolation.mjs` 正则扩员、场景词零命中断言扩覆基线 prompt 段与词表。
2. **场景① 通用起草**（场景 id `generic.draft`）：用户经预检表单给出起草要求（`text` 字段，必填），模型回合产出 artifact `generic.DraftDocument`（形制 `{title: string; paragraphs: string[]}`，与 `compileDraftToDocx` 输入同构）；产物按 ADR-014 动态 tab 以只读结构化视图呈现，并提供「送入起草画布」显式动作——用户确认后进入可编辑工作稿，编译落盘走既有 `confirmDraftCompile` 确认流。
3. **场景③ 多文件批处理**（场景 id `generic.batch`）：无表单直启（循 `LEGAL-FIVE-FACES-1` 无预检直启路由）；启动前由装配点现读该 matter 就绪材料列表，零就绪即显式 blocked 不起跑（预检闸精神的宿主判定，不动 ABI，见裁定 B1）；模型回合产出 artifact `generic.BatchReport`——单枚 artifact 携数组 payload，每项 `{materialId, summary, status}`，`materialId` 取值域为系统注入的就绪材料闭集（ADR-016 决定二同族，模型不选择地址）；系统确定性校验逐项完整性：每份就绪材料恰一行，缺行以显式 `missing` 状态落格，不伪造。渲染走 `courtwork.artifact-table.v1` ＋ `presentation.collectionPointer`。

场景② md↔docx 可编辑往返**不在本票**，另立 `GENERIC-SCENARIOS-2`（见裁定 A2/A4）。

### 顺带清偿（复杂度清偿，不扩票面）

- `App.tsx` 内 `DRAFT_OUTPUT_FILE = '答辩意见.docx'` 硬编码：通用壳内垂类文案，随场景①改为版本化中性产物名（循 `CONTRACT-OUTPUT-TRUTH-1` persisted createdAt＋session hash 命名先例，或最小中性化——实现会话按改动面择一并留痕）。
- `case-output-client.ts` draft 路径残留的 `overwrite: true`：改 atomic no-replace，与 production 落盘纪律对齐。

## 二 · 架构裁定集（票面冻结时定谳）

- **A1（通用包形制）**：见 ADR-023。乙读法成立：`baseline` 成熟度、恒在生效 registry、不占 `packBinding` 席位。
- **A2（场景②与 ADR-004）**：往返只住工作稿轨，定稿 docx 不回转，上传原件只读；细则随 `GENERIC-SCENARIOS-2` 冻结，该票开工前置为 Word/WPS 真机核验会话（`packages/output/verification-checklist.md` 22 项现况 0 勾选，未核验不得宣称往返成立）。`remark-stringify`/`mdast-util-to-markdown` 提为显式直接依赖的结论随该票执行，本票不动依赖。
- **A3（fan-out 形制）**：单 artifact 数组 payload＋`collectionPointer`＋逐项状态，步骤闭集不扩（ADR-023 决定六）。`collectionPointer` 此前零生产消费者、零 desktop 投影测试——本票是首个实操者，须自带投影测试与拒载反例。
- **A4（拆票）**：①③＋基线包成立合为本票；②单独成票。依据：②卡外部真机核验与工作稿轨细则，①③的 OOXML 工作面与之不相交；排程律下拆票使本票不被外部阻塞拖住。
- **A5（验收用例范围）**：Socmdia Slop kit 字面全流水不作当期验收判据——其 S0（网络采集）、S3（浏览器自动化取证）、S4（headless 渲染）三段所需能力在当期产品面内不可达（隔离等级 `none`、`web-fetch` 未接线、无浏览器自动化），显式登记不冒进；可编为声明式场景的 S1/S2/S5 形状作设计参照。验收语料**新造中性件**入 `packages/demo-data`（语料墙细则适用：外部 kit 实物零入仓，卷宗类实物同禁）。
- **B1（预检元素集）**：launch 元素集（`select`｜`text`）当期不扩员；③的批处理范围为「该 matter 全部就绪材料」的声明式全集，不做用户多选；多选需求实证后另票扩 ABI。零就绪的显式 blocked 由装配点现读判定，属宿主逻辑非契约扩员。
- **B2（凡例表所指）**：`docs/design/schema-exemplar.md` ＋ `courtwork.artifact-table.v1`。`generic.BatchReport` 即凡例的第二个消费者；`schema-exemplar.sources.json` 十枚封存哈希如被触碰须同批重封（改在册来源须同批重封哈希，判例在案）。
- **B3（门禁覆盖）**：`assert-vertical-isolation.mjs` 正则 `(legal|pm)` 扩员为 `(legal|pm|generic)`；基线包 import 只许受信组合根、demo 与准入机器既有族。
- **B4（工作面驱动）**：`App` 单数 `verticalWorkSurface` 形制维持；基线场景经同一 production work command 链接入可启动场景闭集（装配点声明，循 FIVE-FACES 闭集先例）。驱动内如遇 Legal 语义硬编码阻断基线场景，做最小中性化并逐处留痕；改动越出「最小中性化」即停手 `[需架构拍板]`，不得自行改 schema 语义或第二驱动通道。
- **不变量二边界**：`generic.BatchReport` 为零锚点设计（summary 纯文本、无引语无坐标），不触发 citationBinding 义务；实现中若引语需求出现，停手上报，不得让模型出坐标。

## 三 · OSS 成熟件复核结论（工程纪律条）

本票**零新增依赖**。场景①复用自研 `compileDraftToDocx`（中性直出链已在册）；场景③零新领域机制。候选逐核结论（一手取证 2026-08-11，registry/源码证据见架构调研）：`remark-stringify`＋`mdast-util-to-markdown` **直接依赖**（结论转 `GENERIC-SCENARIOS-2` 执行）；mammoth **借行为**（诊断通道形状与命名空间判据；其 `w:ins`/`w:del` 静默策略与不变量四冲突，不直接依赖）；dolanmiu/docx **保留自研**（第二套 zip/XML 著录撞确定性 ZIP 与 OPC 签名阻断）；html-to-docx、turndown、remark-docx、docx-preview、pandoc **删除当期动作**（停更/体积/问题域不合/GPL 已拒不复议）。

## 四 · 新增概念登记（复杂度节制条）

1. `PackageAvailability` 第三枚 `baseline`——ADR-023 决定二已批，为何非加不可：通用场景必须住包（ADR-015 决定一），而绑定席位恒一使垂类同形接入自相矛盾；`baseline` 是唯一不破坏绑定语义的居所。
2. `packages/generic` 包实体——验收律「只装通用包时产品是合格 work agent」的承载体。
3. `BatchReport` 逐项完整性校验——系统裁决「每份就绪材料恰一行」，失败显式的机器形态；不加则批处理的「逐项报告与失败显式」退化为模型自证。

此外零新概念：不新增步骤种类、不新增 renderer 注册机制、不新增持久化格式。

## 五 · TDD 与验收要求

- 先证红后实现：`baseline` 扩员前 `loadablePackages` 对第三枚成熟度的排除断言、零绑定 matter 场景条零条目的现状断言（翻转为基线场景在场）、`collectionPointer` 投影缺测试的补齐、`registriesForCase` 并集语义反例（垂类 fail-closed 判据零削弱——他包绑定仍拒）。
- 逐项完整性校验须能注入反例触红（模型漏行→`missing` 显式；模型多行/编造 materialId→整面拒）。
- 卸载态冒烟 e2e：零垂类绑定 matter 上起 `generic.draft` 与 `generic.batch` 全链（E2E 樁承载模型回合，循既有先例）；全程零垂类词表泄漏断言。
- 完工门：`pnpm -r build`、`pnpm lint`、root 全量、desktop `--filter`、cargo、Playwright 完整链（独占端口＋`/private/tmp/courtwork-pw-lock` 原子锁；全仓同刻至多一条）、`site:guard`；floor 只升不降（现行 386）。
- 语料墙：新造中性语料，外部 kit 与卷宗实物零入仓。
- 实现会话在本 SPEC 追加实现回执（偏离、红证、门数）；验收由 Codex 独立会话在 clean worktree 执行并写 ACCEPTANCE，验收逐字复跑 SPEC 自查命令。

## 六 · 二批裁定（2026-08-11 架构会话，针对实现回执 §7.4 三项停手上报）

1. **预检值通道取候选甲**：`StartWorkCommand` 增通用槽 `startParams: Readonly<Record<string, string>>`（`launch.formFields` 提交值的冻结快照，缺省空对象）。语义边界三条：executor 把它作为 task 段结构化输入随 `taskInstruction` 注入（ADR-016 填格协议同族——用户填格进请求，模型只读不改址）；提交值的 fieldId 集必须为该场景声明 `formFields` id 集的子集，越集在 effect 前 fail-closed 拒；S3 垂类专属 `startWithPreflight` 当期保留不迁移（过手即拆挂账，随下次触碰该面偿），新场景一律走通用槽，不得出现第三条预检值路径。
2. **预检承载面改宿主通用承载**：scene-strip 触发后由宿主通用容器渲 `scenario-precheck-form`，不依赖任何目标视图 renderer 在场；提交即 start，产出席位维持既有显式指引空态。S3 现行自渲路径当期不迁，同挂过手即拆。
3. **场景①按票面继续**：送入起草画布、版本化产物名与 no-replace 同批交付；实现会话所做「`generic.draft` 排除出可启动闭集」的临时收口随本段解除，解除须带反向红证（原排除断言翻转为在场断言）。Playwright 完整链与卸载态冒烟 e2e 义务不变（票面五节），续行段必须补跑。

## 七 · 禁区

不触 pi lane 与 `src-tauri` pi 循环；不改 ADR-009 步骤闭集；不扩 launch 元素集；不动 legal/pm descriptor 语义；xlsx/pptx/定时触发/通道均不夹带；不做动态装载；不宣称 external-validated（模型回合由樁承载，真 key 面另账）。

---

## 八 · 实现回执（实现会话 2026-08-11，分支 `claude/generic-scenarios-1`，基线 main@31533d3）

**总状态：部分交付。** 票面三件中「基线包成立」与「场景③ 多文件批处理」已全链闭合并带红证；
「场景① 通用起草」的**包侧声明已落地**，但其起跑链卡在一处结构性缺口（见 §8.4 拍板项一），
未接入可启动闭集——故当期产品面上**不渲染 `generic.draft` 的场景按钮**（不留死钮）。
顺带清偿两项（`DRAFT_OUTPUT_FILE`、draft 路径 `overwrite:true`）**未动**，随场景①一并转出。

### 8.1 逐段红证（测试名 ＋ 红形）

| # | 段 | 先红项 | 实测红形 |
| --- | --- | --- | --- |
| 1 | 基线包成立 | `packages/generic/src/package/manifest.test.ts` 全谱 | `Cannot find module './index.js'`（包不存在） |
| 2 | 中性义务 | `neutrality.test.ts` >「prompt 段、词表、标题与 launch 文案对十枚垂类场景词全部零命中」 | `AssertionError: 垂类场景词「风险」泄漏进基线包声明面`——**本门在写作过程中真的触红一次**：`generic.draft` 的 launch placeholder 原文含「进度、风险与下一步」，随即中性化为「进度、阻碍与下一步」。门不是空跑 |
| 3 | 逐项完整性裁决 | `domain/batch-completeness.test.ts` 全谱 | `Cannot find module './batch-completeness.js'` |
| 4 | `baseline` 成熟度 | `package-catalog.test.ts` >「发行成熟度是三枚闭集」「baseline 不进可交互加载子集」「基线包有宿主呈现名」 | `Error: no host display name for admitted package: generic` ×3 |
| 5 | 并集语义 | `package-runtime.test.ts` 新 describe 五例 ＋ `matter-registries.test.ts` 三例 | `expected [] to deeply equal [ 'generic' ]`、`expected [ 'legal' ] to deeply equal [ 'generic', 'legal' ]`、`Error: matter is bound to a package that is not admitted in this build: generic` |
| 6 | 基线场景接入 production 链 | `composition/baseline-scenario-run.test.ts` 七例 | `Cannot find module './production-scenarios.js'` |

`collectionPointer` 的投影与拒载反例（票面 A3「首个实操者须自带投影测试与拒载反例」）落在
`manifest.test.ts` 的 golden 用例 ＋「漏一枚 status valueLabels 即整包拒载」「collectionPointer
漂移到非数组即整包拒载」两条反例上；desktop 侧的 `projectArtifactTable` 消费面因场景③产物已能
真实落账而首次有真生产者。

### 8.2 新增概念对账（票面登记三枚 ＋ 本单实增一枚）

1. **`PackageAvailability` 第三枚 `baseline`** — 票面登记，已落 `composition/package-catalog.ts`。
2. **`packages/generic` 包实体** — 票面登记，已落。
3. **`BatchReport` 逐项完整性校验** — 票面登记，落 `packages/generic/src/domain/batch-completeness.ts`
   （纯裁决 `completeBatchItems` ＋ 会话作用域 schema `batchReportSchemaFor`）。
4. **【多出一枚】会话作用域 registry 收窄缝 `scopeRegistriesForRun`**（`LegalWorkCommandDeps` 上的
   可选注入，实现住 `composition/baseline-session-scope.ts`）。**为何非加不可**：逐项完整性裁决要
   成立，「就绪材料闭集」必须进入**产物成形之前**的校验路径，而闭集只有到起跑那一刻才知道。
   现行执行器把 artifact schema 从 `deps.artifacts` 取，故唯一不改 core、不改 ADR-009 步骤闭集、
   不写读侧补丁的落点就是「按本次运行收窄那一枚 artifact 的 schema」。缺省恒等，垂类路径零行为变化。

**实现形态上的一条硬判据（新判例候选）**：该收窄 schema 只用 Zod 4 的 `.check()`，**禁用
`.transform()`**。实测 `z.toJSONSchema` 对 transform 抛错，而 `packages/provider/src/structured-output.ts`
的 `toJsonSchemaSafe` 对该异常有**无声**兜底（退回 `json_object` 档位、零 notice）——用 transform
会让真 key 路径静默丢掉 provider 侧的结构化约束，属不变量四禁止的静默降档。`.check()` 可就地改写
`ctx.value` 且谓词不进 JSON Schema，两头都满足。判据由
`batch-completeness.test.ts` >「会话作用域 schema 仍可转 JSON Schema」把守。

零新依赖、零新步骤种类、零新 renderer 注册机制、零新持久化格式（与票面一致）。

### 8.3 偏离清单

1. **场景① 未接入可启动闭集**（见 §8.4 拍板项一）。包侧声明（schema/scenario/launch/prompt 段）
   已随基线包落地并过准入与中性门；`generic.draft` 在**声明面**在册
   （`BASELINE_DECLARED_SCENARIO_IDS`），但被 `production-scenarios.ts` 的
   `LAUNCH_CHAIN_PENDING_SCENARIO_IDS` **显式排除**出当期可启动面——预检值送不到命令端口，
   放进闭集就等于在场景条上多一枚点了什么也不会发生的按钮（LEGAL-FIVE-FACES-1 要消灭的死钮）。
   排除是显式而非遗漏：起跑 `generic.draft` 得 `rejected/invalid_scope`，红证在
   `baseline-scenario-run.test.ts` >「排除是显式而非遗漏」。拍板落地后从该表删行即自动在册。
2. **顺带清偿两项未动**：`App.tsx:165` 的 `DRAFT_OUTPUT_FILE = '答辩意见.docx'` 与
   `case-output-client.ts` draft 路径的 `overwrite: true`。二者与场景①的落盘链同批，单独改会让
   既有 Legal 起草画布换名而无对应产品变化，故随场景①转出。
3. **`generic.DraftDocument` 的呈现取舍**：走既有 `courtwork.artifact-table.v1`，
   `collectionPointer: '/paragraphs'` ＋ 单列 `pointer: ''`（RFC 6901 整文档指针，命中字符串数组
   的 item 根）。文稿**标题不入列**——它是整份产物的身份而非某一行的字段，由 `descriptor.title`
   与后续「送入起草画布」动作面承载。代价是产物只读视图当前看不到模型给的标题，随场景①收口。
4. **中性门的落点**：ADR-023 决定四要求「①附场景词零命中断言扩覆基线包 prompt 段与词表」。
   断言落在 `packages/generic/src/package/neutrality.test.ts` 而非 `apps/desktop/src/work/work-context.test.ts`
   ——后者住受检面，而 `@courtwork/generic` 随本票进了零泄漏静态门的包名闭集，壳内测试**不得**
   import 本包。两门分居两处是零泄漏律的结果，不是重复。
5. **既有三处判据按 ADR-023 决定三收窄留痕**（非削弱）：`matter-registries.test.ts`
   「显式零绑定 → 零垂类 registry」、`matter-pack-binding.test.ts`「绑定为零时一枚 artifact 也没有」、
   `matter-execution-scope.test.ts`「授权只认 canonical case store」三处的「零」由「一枚也没有」
   收窄为「一枚**垂类**也没有」。垂类 fail-closed 一字不动，反例在
   `baseline-scenario-run.test.ts`（零绑定起 `legal.S2` 仍 `rejected/invalid_scope`）。
6. **`matter-first-frame.dom.test.ts` 冷装配用例上界 30s→90s**：基线包入准入后冷装配再涨一档
   （三包准入 ＋ 第三张 registry），并行满载下越过 30s、隔离下同例约 3s——是冷装配时长不是挂起，
   判据一字不动。
7. **`LegalWorkCommandDeps` 新增三枚必填 dep**（`launchableScenarioIds` / `verticalScenarioIds` /
   `packageIdentities`）而非给缺省值：缺省会让装配缺陷静默通过。六处既有测试装配点随之补齐。

### 8.4 `[需架构拍板]`（已由票面 §六 二批裁定定谳，执行对账见 §8.7）

**一 · 预检值没有送达 production 命令端口的通用槽位（阻断场景①）。**
`StartWorkCommand`（`apps/desktop/src/protocol/client.ts`）无 preflight slot；S3 的主体输入走的是
**垂类专属**入口 `LegalWorkCommand.startWithPreflight`（形参逐字是 `subject: ContractPartySubject`）。
`generic.draft` 的必填 `text`（起草要求）因此无路可走。三条候选，均越出「最小中性化」，实现会话
不自裁：

- (a) 给 `StartWorkCommand` 加可选 `precheck?: Readonly<Record<string, string>>`。理由：ADR-016
  填格协议已把预检值定形为闭元素集的 `Record<fieldId, string>`；`StartWorkCommand` 是**进程内
  callback 契约**（ADR-009 明文：非 IPC/HTTP/wire），加槽不触任何持久 wire 或 journal。代价：
  动了 ADR-010 的命令形状。
- (b) 在基线包内声明第三枚 artifact `generic.DraftRequest` 作为 `generic.draft.inputArtifacts`，
  由装配点注入（循 S3 的 `legal.CaseFile` 机械派生先例）。代价：包的产物闭集由两枚变三枚，
  越出票面一节的登记。
- (c) 把预检值经 `ScenarioRunInput.toolInputs` 夹带。**不建议**：该字段语义是工具输入，塞非工具
  数据是绕过契约。

**二 · 场景①的宿主起跑面无处挂载。** production 路由（`App.tsx:1049` `onLaunchScenario`）对
「带预检表单的场景」只打开目标视图，由该视图的 renderer 自行渲染 `ScenarioPrecheckForm`——现行
唯一这么做的是 `RiskReviewRenderer`（其 blueprint 声明 `handlesEmpty: true`）。`generic.draft` 的
目标视图解析到通用产出席位 `artifact`，而产物到来前那里没有任何面。可行解是宿主侧按 blueprint
的 `handlesEmpty` 派生一枚**通用场景起跑面**（零垂类字面量，复用既有通用件），但那是新增一处
宿主呈现概念，须与拍板项一同批定谳。

**三 · 场景①「送入起草画布」动作与落盘链**：依赖上两项，随之转出。若采纳 (a)，顺带清偿的
`DRAFT_OUTPUT_FILE` 建议按 `contract-review-file-name.ts` 先例改为纯函数版本化中性名
（`起草文稿-<UTC YYYYMMDD-HHmmss-SSS>.docx`，复用已导出的 `formatUtcStamp`），与 draft 路径改
atomic no-replace 同批——固定名 ＋ no-replace 会让第二次编译恒 `exists`，两项必须同批改。

### 8.5 门数（本会话实跑）

| 门 | 结果 |
| --- | --- |
| `pnpm -r build` | 全绿（12 包 Done，含新 `packages/generic`） |
| `pnpm lint` | 绿（零输出） |
| root `pnpm test` | **2191/2191 绿**（末轮实跑，基线 2171 → +20）。中途两轮曾出现 `packages/output` docx 与 core bundle 谱共 7–10 例 5s/35s 超时；**同命令在 `git stash` 后的改动前树上复现同一族超时**，且用例总数恒为 2191（无用例丢失），故判为并行满载下的环境红、零因果——机器空闲后同命令复绿 |
| desktop `pnpm --filter @courtwork/desktop test` | **864/864 绿**（基线 847 → +17） |
| `cargo test`（`apps/desktop/src-tauri`） | **250/250 绿**（1 ignored）。首跑因本 worktree 缺 `packages/pi-lane/dist/product-sidecar` 与 `dist/headless-sidecar` 而失败，跑 `build:product-sidecar`＋`build:headless-sidecar` 后复绿——环境前置非树上红 |
| `site:guard` | 绿（SKIN-R2 signed ledger passed；App.tsx 高水位 2245/2245，本票零触碰 App.tsx） |
| 零泄漏静态门 `assert-vertical-isolation.mjs` | 绿（受检 217 份零垂类 import；包名闭集已扩员为 `legal\|pm\|generic`） |
| Playwright 完整链 | **未跑**（见下） |

**Playwright 未跑的如实登记**：本会话上下文预算耗尽于场景①的结构性缺口排查，完整链（独占端口
＋ `/private/tmp/courtwork-pw-lock` 原子锁、前台阻塞等完整退出码）未执行，故 floor 386 **未复核**。
本票当期零 `App.tsx`／零壳内交互面改动（改动面全在 `packages/generic`、`composition/`、
`verticals/legal/{work-command,legal-s3-binding,legal-work-surface}`、`work/work-runtime`），
但**这不能替代实跑**——卸载态冒烟 e2e（票面五第三条）同样未写。验收会话须补跑并补票。

### 8.6 续行入口

1. 先定谳 §7.4 拍板项一（预检值槽位），再依次收口拍板项二、三；
2. 场景① 起跑链接通后：`generic.draft` 进产品可达路径 → 「送入起草画布」动作 → 顺带清偿两项同批；
3. 补写卸载态冒烟 e2e（零垂类绑定 matter 上起 `generic.draft` 与 `generic.batch` 全链，E2E 樁承载
   模型回合，全程零垂类词表泄漏断言），跑 Playwright 完整链并把 floor 从 386 上抬。

---

## 九 · 二批裁定执行对账（同一实现会话续行段，2026-08-11）

**总状态：裁定一、二已全链落地；裁定三落地过半。** 场景①现已可在零垂类绑定 matter 上起跑并
产出 `generic.DraftDocument`；顺带清偿两项已交付。**未完成**：「送入起草画布」显式动作、
卸载态冒烟 e2e、Playwright 完整链实跑。

### 9.1 裁定一 · 预检值通道 `startParams`

落地面：`packages/core` 的 `ScenarioRunInput.startParams` → task 段结构化输入随 `taskInstruction`
注入；`apps/desktop` 的 `StartWorkCommand.startParams?`（进程内 callback 契约，不进 case store /
journal / 持久信封）；`normalizeStartPayload` 冻结快照并进 first-wins 键。

三条语义边界逐条对账：

| 裁定原文 | 落地形态 | 红证 |
| --- | --- | --- |
| executor 作为 task 段结构化输入随 `taskInstruction` 注入 | `generateArtifact` 的 `task` 对象加键；**空/缺省不进请求** | 「提交值随 task 段进请求」red=`expected 'rejected' to be 'completed'`；「缺省空对象…零 startParams 键」 |
| fieldId 集须为该场景 `formFields` id 集的子集，越集在 effect 前 fail-closed 拒 | `beginStart` 内、matter 授权之后、`isConfigured`/`case_busy` 之前判定 | 「fieldId 越出…」red 前为 false-green（当时 `generic.draft` 尚被排除），落地后同时断言零 turn、零事件；「无 formFields 的场景收到任何提交值即越集拒」red=`expected {status:'failed'} to match {status:'rejected'}` |
| S3 `startWithPreflight` 当期保留不迁；不得出现第三条预检值路径 | `startWithPreflight` 逐字保留并显式传 `startParams: {}`；通用 `start` 是新场景唯一入口 | 判据落在类型上：`StartPayload.startParams` 必填，两处入口各自显式给值 |

**「空对象不进请求」的取舍留痕**：裁定写「缺省空对象」。实现取「缺省即不出现该键」而非「恒出现
空对象」，两条理由：①不给模型一个恒空的字段去解读；②既有五枚场景的请求字节零变化，
assembled request 的确定性判据不因本票漂移。判据由「缺省空对象…零 startParams 键」用例把守。

### 9.2 裁定二 · 预检承载面

`resolveSceneLaunchRoute`（`workbench/scene-strip.tsx`）把起跑路由定成三态闭集纯函数：
`start`（无表单直启）｜`renderer`（有表单且目标 blueprint 自声明 `handlesEmpty`——当期唯一是
S3 修订预览面）｜`host-form`（有表单但没有面收留 → 宿主通用容器）。判据取 blueprint **既有**的
`handlesEmpty` 声明，不新立第二处开关：产物到来前那一格是不是场景起跑面，本来就由它说了算。

承载件住 `workbench/scene-precheck-host.tsx`：零垂类语义（标题/说明/字段文案全部取自 registry
冻结的 `launch`；`select` 选项按声明的 `source`/`mediaType` 做领域无关材料查询），产出席位维持
既有显式指引空态。S3 自渲路径当期不迁，同挂过手即拆。

**零就绪材料的显式 blocked**（票面 B1）判据随之收窄为「这枚场景还有没有别的任务来源」：携预检
提交值者（用户已显式给出任务定义）可在空工作区起跑；无提交值者其工作**就是**定义在材料上的，
零材料即拒。该判据对现行五枚场景逐一成立（S1/S2/generic.batch 拒、generic.draft 放、S3 走
preflight 另一路径）。

### 9.3 裁定三 · 场景①与顺带清偿

- **临时排除已解除**：`BASELINE_SCENARIO_IDS` 与声明面逐字相等，反向红证在
  `baseline-scenario-run.test.ts` >「基线声明面两枚，当期可启动面同为两枚」
  （red=`expected ['generic.batch'] to deeply equal ['generic.draft','generic.batch']`）。
- **顺带清偿两项已交付**，且二者互为前提：
  - `DRAFT_OUTPUT_FILE` 由垂类文案 `答辩意见.docx` 改中性 `起草文稿.docx`。**取「最小中性化」
    而非版本化命名**（票面给了二选一）：版本化名会让 `caseOutputClient.exists` 的挂载期存在性
    探测失去可问的对象（同 `contract-review-file-name` 的 grant 路径注释「固定名只对样板案
    提问」），而起草画布的**定稿冻结**正是靠那次探测跨重启成立——为一次中性化牺牲冻结的
    持久性不划算。
  - draft 路径 `overwrite: true` 退役，改既有 `writeDocxNoReplace`。固定名 ＋ no-replace 自洽：
    编译成功即画布冻结转只读，产品路径上第二次编译不可达；真出现同名文件（用户在访达手放
    一份）时 no-replace **显式**报出，而不是把用户的文件悄悄盖掉。
- **未完成**：`generic.DraftDocument` 产物 tab 上的「送入起草画布」显式动作。当前产物以只读
  结构化视图呈现（`courtwork.artifact-table.v1`，段落逐条成行），但把它送进可编辑工作稿的那枚
  动作尚未接线，故 `compileDraftToCaseOutput` 当期仍只被 Legal 起草画布消费。续行只需在产出席位
  的 `generic.DraftDocument` 面上加一枚动作，把 `{title, paragraphs}` 写进 `draft` 状态。

### 9.4 「过手即拆」外提对账（App.tsx 高水位 2245 → 2229，只降不升）

本票触碰 App.tsx，故按纪律外提两件，净增由外提抵消有余：

1. **宿主通用起跑面**（预检承载 JSX ＋ 选项解析 ＋ 起跑三态路由接线）→
   `src/workbench/scene-precheck-host.tsx`；
2. **起草画布编译落盘与案件产出目录存在性**（`confirmDraftCompile` 的 async 体 ＋ 整块
   `useEffect` 存在性探测与两枚状态）→ `src/output/draft-compile.ts` ＋
   `src/output/use-case-output-existence.ts`。语义逐字不变（固定名提问、demo 专属合同产物名、
   focus 重问、请求版本号 ＋ cancelled 双闸）。

门禁常量已下调至 2229 并在 `scripts/assert-app-highwater.mjs` 内留痕。

### 9.5 续行段门数（本会话实跑）

| 门 | 结果 |
| --- | --- |
| `pnpm -r build` | 绿 |
| `pnpm lint` | 绿 |
| desktop `--filter` | **870/870 绿**（本票起点 847 → +23） |
| 零泄漏静态门 | 绿（受检 220 份） |
| App.tsx 高水位 | 绿（2229/2229，已下调） |
| root `pnpm test` | 上一段末轮 **2191/2191 绿**；本段新增用例只落 desktop 面，root 面未再跑 |
| `cargo test` | 上一段 **250/250 绿**；本段零 Rust 改动，未再跑 |
| Playwright 完整链 | **仍未跑**，floor 386 仍未复核 |

### 9.6 续行入口（剩余三件）

1. `generic.DraftDocument` 产出面加「送入起草画布」显式动作 → 写入 `draft` 状态 → 既有
   `confirmDraftCompile` 确认流落盘（落盘链本身已就绪）；
2. 卸载态冒烟 e2e：零垂类绑定 matter 上起 `generic.draft`（经宿主通用起跑面填「起草要求」）
   与 `generic.batch` 全链，E2E 樁承载模型回合，全程零垂类词表泄漏断言；
3. Playwright 完整链实跑（独占端口 ＋ `/private/tmp/courtwork-pw-lock` 原子锁、前台阻塞等完整
   退出码），floor 由 386 上抬。

---

## 十 · 收尾段（同一实现分支第三段，2026-08-11）

### 10.1 架构追认（2026-08-11 三批）

以下两枚是续行段 §9.1／§9.3 里实现会话所作、与二批裁定原文有出入的取舍。三批架构会话派单时
**逐枚追认**，追认效力等同裁定；清账时由架构会话收账核签。

1. **`startParams` 缺省取「不出现该键」而非恒空对象**（§9.1 末段留痕）——**追认**。既有五枚场景
   assembled request 字节零漂移的用例（`baseline-scenario-run.test.ts` >「缺省空对象…零
   startParams 键」）保留，作为该取舍的守门判据。
2. **产物名取固定中性名「起草文稿.docx」＋ no-replace**（§9.3 第二条）——**追认**。存在性探测
   支撑定稿冻结跨重启成立的论证成立，故不取版本化命名；固定名与 no-replace 必须同批，二者
   互为前提的记述一并追认。

### 10.2 收尾三件与随之坐实的两处基线顶穿

票面收尾范围恰三件（§9.6）。实现过程中另有**两处「判据被基线顶穿」**在本段坐实——它们不是
新需求，是二批裁定落地后**已经发生但无人观测**的行为变化（Playwright 从未实跑，故此前三段的
门数掩盖了它们）。两处都按「与本票面相关的红必须追修」处置，逐处红证见 §10.3。

**总状态：收尾三件全部交付。** 件一（送入起草画布）、件二（卸载态冒烟 e2e）、件三（Playwright
完整链实跑，floor 386 → 388）逐件落地，逐件带红证；另追修两处基线顶穿与一枚自本分支中段起
即红的静态门。

### 10.3 两处基线顶穿的坐实与追修

两处是**同一个代理判据**的两个落点：ADR-023 决定三让基线 registry 恒在之后，「场景条零条目」
不再等价于「这枚 matter 没有加载垂类能力」——零绑定 matter 上基线两枚场景照样在册。二批裁定
落地那一刻这两处就已经失效，只是此前三段的门数照不出来（PW 从未实跑，单测也没有一条问过
「基线在册时卸载态还成不成立」）。

| # | 顶穿点 | 顶穿后的实际行为 | 追修 | 红证 |
| --- | --- | --- | --- | --- |
| 一 | `workbench/scene-strip.tsx` 的 `entries.length === 0` | 卸载态起手引导（《场景规范.md》提示＋起草画布入口）在零绑定 matter 上**整块消失** | 判据改问「条目里有没有非基线包」——新纯函数 `isVerticalCapabilityUnloaded`；引导与基线按钮改为**同框**而非互相顶替（两者说的是两件事：缺什么能力 / 此刻能起什么活） | `scene-strip.test.ts` >「卸载态＋基线场景在册：起手引导与基线按钮同框」red=`expected '<div class="scene-strip"…' to contain 'data-testid="scene-unloaded-hint"'`；判据三例 red=`isVerticalCapabilityUnloaded is not a function` |
| 二 | `App.tsx` 的 `sceneEntries.length === 0`（起草面落轨） | 零绑定 matter 的起草面由**通用工作稿轨**翻回**垂类色起草画布**——抬头「答辩状」与样板案初值「答辩意见」就此出现在零垂类 matter 上（零泄漏律被顶穿） | 同一判据换成 `verticalUnloaded`；并把画布抬头中性化为「起草文稿」（与产物名同词）——画布随件一在零垂类 matter 上真实可达后，写死一种文书名即是壳内垂类文案 | e2e `generic-scenarios-1.spec.ts` 链①（走到画布那一步）的零垂类词表断言，词表含「答辩」；变异复红实测见下方附注 |

**顶穿二的变异实证（附注）**：把画布抬头改回垂类文案「答辩状」，e2e 链①即红——
`卸载态可见面泄漏垂类词「答辩」`（`expected …not to contain '答辩'`）；恢复中性抬头即绿。
**逐字登记断言的作用域**：该断言只在链①红，链②（批处理）全程不经过起草画布，故它对这处
顶穿零区分力——「两链各有一道断言」不等于「两链都守着同一件事」。

**为何不是「把画布挡回去」**：件一要求把产物送进可编辑工作稿，而 `generic.draft` 正是零垂类
matter 上的场景——若卸载态一律落工作稿轨，移交就永远落在一张不显示的面上（静默无事发生，
不变量四）。故取「默认仍落工作稿轨，用户**显式**送入后落画布」：新增一枚会话内粘着的
`draftCanvasOpen`（切案归零），判据成为 `workDraftMode || (verticalUnloaded && !draftCanvasOpen)`。
pi 线的工作稿轨一字未动（票面七节禁区）。

### 10.4 顺带坐实的第三处：静态门自本分支中段起即红

`scripts/assert-work-live-contracts.mjs` 的组合根装配锁原式写死 `createLegalWorkSurface({ workCommand })`
——**参数表恰一枚**。裁定 B4 给驱动加注 `productionScenarioIds`（提交 `e013dbd`）后本门即红，
而续行段的门选择（build／lint／desktop `--filter`／零泄漏／高水位）不含静态门链，故一直没人看见。
改判为「装配点上带着 `workCommand` 这枚参数」：锁的是**注入路径**不是参数表长度。有效性已实证
——删去该参数后本门复红（`mutation exit=1`），恢复即绿。

判例（转 workflow.md 候选）：**门写死「参数表恰 N 枚」就是把无关的扩展算作违例**；锁注入路径
的门应当只咬那一枚参数在不在，加参数不误红、删注入仍触红。

### 10.5 收尾三件的落地

**件一 · 「送入起草画布」显式移交。** 判定住受信组合根 `composition/draft-handoff.ts`
（`planDraftHandoff`）：能不能进画布由包冻结的 `DraftDocumentSchema` 说了算，**不按形状猜**
——`{title, paragraphs}` 谁都可能长成，按形状认就等于宿主替包认领语义。两道闸次序不可交换：
①画布已定稿 → 显式拒绝（定稿转只读是既有确认账，移交不得从背面改回可编辑）；②载荷不合
schema → 显式拒绝，不半份塞进画布。席位件 `ArtifactTabPanes` 只收一枚领域无关声明
（地址＋文案＋处理器）并落到被点名那一格上，**席位件不认识任何具体产物**。
零新确认机制：动作本身就是那次显式确认（票面「复用既有交互形态」），落盘仍走既有
`confirmDraftCompile` 确认流。

先红后绿：`composition/draft-handoff.test.ts` 六例 red=`Cannot find module './draft-handoff.js'`；
`ArtifactTabPanes.test.ts` >「移交动作只落在声明的那一格」red=`expected '<div class="artifact-tab-pane"…' to contain 'data-testid="artifact-handoff-action"'`。
产品级变异实证：抽掉 `App.tsx` 的 `handoff={...}` 声明后 e2e 链①复红
（`waiting for getByTestId('artifact-pane-generic.DraftDocument').getByTestId('artifact-handoff-action')`），
恢复即绿。

**件二 · 卸载态冒烟 e2e**（`tests/e2e/generic-scenarios-1.spec.ts`，floor 386 → 388）。
零垂类绑定的 grant matter（建案不选任何包）上两条链：①`generic.draft` 经宿主通用起跑面填
「起草要求」→ 产出席位见文稿 → 「送入起草画布」→ 画布里逐字是模型那份文稿，且可编辑、
落盘入口在场；②`generic.batch` 无表单直启 → 逐份材料成行，**樁刻意只回一行**，另一份由系统
的逐项完整性裁决补成「缺行·系统补记」（`tbody tr` 恰两行）。模型回合由 DEV/E2E turn 樁承载。

三条如实登记（写作过程中由实跑照出，非事后追述）：
1. **产物到来后活动面不会自动跳到产出页签**——页签出现在页签条上，活动面仍停在原处，须用户
   点选。这不是本段引入的行为（`resolveLaunchTargetView` 给出的是席位标记 `artifact`，而页签 id
   是 `artifact:<type>`，同步收口于是回落到在册默认面）。当期按现状取证（用例显式点页签），
   **不在收尾三件内改路由**——那要动 `resolveLaunchTargetView` 的语义，属另票。
2. `wide` 变体的场景按钮（`generic.batch`）在窄容器下由 CSS 收进「更多」弹层，宽容器下直接在
   条上：同一枚条目的两处呈现。用例按**此刻可见与否**分流（`launchScene` 助手），写死任一条
   路都会在另一态假红——首轮实测正是如此（链②在弹层里找不到该按钮，因为它就在条上）。
3. 零垂类词表断言判在 `document.body.innerText` 而非 `textContent`：非活动产出页签常驻 DOM 只加
   `hidden`（ADR-014 决定一），把它算进来测的就是 DOM 存量而不是用户此刻看见的面。

**「过手即拆」外提两件**（App.tsx 高水位 2229 → 2225）：①起草面席位（工作稿轨/起草画布二选一
的整块渲染分支）→ `workbench/draft-seat.tsx`；②定稿确认编排（`compileOpen`/`compilePending`
两枚 state ＋ `confirmDraftCompile` 本体 ＋ 弹层 JSX）→ `output/use-draft-compile.ts` 与
`output/DraftCompileDialog.tsx`——本票改了这条链的两端（中性产物名、原子 no-replace），按纪律
随手搬出。本段新增的移交处理器、移交声明、卸载态判据与 `draftCanvasOpen` 由这两件抵消并再收紧 4。

### 10.6 本段新增概念对账

零新依赖、零新步骤种类、零新 renderer 注册机制、零新持久化格式（与票面一致）。新增概念一枚：

1. **`draftCanvasOpen`（会话内粘着的一枚壳态）** — 为何非加不可：卸载态起草面默认落工作稿轨
   （GENERIC-PACK-1 ⑧ 的显式诚实呈现分支，本段不推翻），而件一要求把产物送进**画布**；没有
   这枚状态，移交就落在一张不显示的面上，等于静默无事发生。它只影响「同一张通用工作面此刻
   渲哪条轨」，不进 case store、不进 journal、不进任何持久信封，切案即归零。

`composition/draft-handoff.ts` 与两件外提模组不计新概念：前者是既有「受信组合根做跨域绑定」
的又一处落点，后两者是既有代码的搬家（语义逐字不变）。

### 10.7 判例候选（转 workflow.md）

1. **门写死「参数表恰 N 枚」是把无关扩展算作违例**（§10.4）：锁注入路径的门只该咬那一枚参数
   在不在——加参数不误红、删注入仍触红，且有效性须当场变异实证。
2. **代理判据会被新维度顶穿，且顶穿是静默的**：「零条目 ⇒ 卸载态」在基线包恒在之后既不报错
   也不改变任何门数，只是**悄悄不再成立**。凡以「某集合为空」代指一件事实的判据，新增该集合
   的成员来源时必须逐处复核——顶穿点往往不止一处（本票是两处），且往往由从未实跑的门把守。
3. **门链选择漏一支等于那一支不存在**：续行段的门选择不含静态门链，于是一枚自中段起就红的门
   静默存活了两段。触碰装配点的票，门选择须含 `test:e2e` 的静态前缀段。
4. **负载轮的归因取时长数量级差，不取「重跑就绿」**（§10.8）：同一断言空闲 5–14s、负载下撞 30s
   上界，才构成「红形是等待超时而非判定改口」的证据；只说「再跑一次绿了」不成立。

### 10.8 本段未做与转出

1. **产物到来后不自动跳到产出页签**（§10.5 登记项一）：要改须动 `resolveLaunchTargetView` 的
   返回语义（席位标记 `artifact` vs 页签 id `artifact:<type>`），属另票，本段只如实取证。
2. **S3 的 `startWithPreflight` 与自渲预检面**：二批裁定明写「当期保留不迁移，挂过手即拆」，
   本段未触碰该面，故不偿还。
3. **画布定稿态的固定时间文案**（`已定稿 · 2026-07-10 17:40`）：壳内写死的展示时间，对真实案件
   不成立。与本票面无因果（既有行为，且不属垂类词表），如实登记，不夹带修改。

### 10.9 门数（本段实跑）

| 门 | 结果 |
| --- | --- |
| `pnpm -r build` | 绿（12 包 Done） |
| `pnpm lint` | 绿（零输出） |
| root `pnpm test` | **2191/2191 绿**（与前段同值：本段新增用例全部落 desktop 面） |
| desktop `pnpm --filter @courtwork/desktop test` | **883/883 绿**（本段起点 870 → +13；本票起点 847 → +36） |
| `cargo test` | 未再跑；本段**零 Rust 改动**（`src-tauri` 零触碰，`git diff --stat` 可证），引前段 250/250（1 ignored）作等价 |
| 静态门链（`test:e2e` 内 `playwright test` 之前的 40 余枚） | **全绿**，含本段修好的 `assert-work-live-contracts`、高水位 2225/2225、floor 388/388、零泄漏（受检面含新增五件）、voice、skin-r2 ledger、schema-exemplar、isolation-binding |
| Playwright 完整链 | **381/388 绿，7 红全部定向复跑转绿**（详见下方环境登记；floor 386 → 388） |

**Playwright 的环境登记（如实，不粉饰）**

本段共起三轮完整链，两轮在**外部负载**下作废、第三轮见下：

| 轮 | 起跑时机 | 观测 | 处置 |
| --- | --- | --- | --- |
| R1 | load1≈32 起跑，中途升至 88 | 116 例跑完 18 例红，红形全是 30–60s 等待超时；本段自建的两条链亦在其中 | 判负载轮，中止 |
| R2 | 等到 load1=11 才起跑，跑到第 31 例时外部负载升至 166 | 31 例跑完 12 例红，红形同上 | 判负载轮，中止 |
| **R3** | 等到 load1 连续三次 < 7（实测 4）才起跑，中途外部负载再次冲到 167 又回落 | **381 passed / 7 failed（16.1m）**；本段自建的两条链在完整链内**双绿** | 取作正式轮，7 红逐条定向复跑 |

负载来源经 `ps` 逐条核实**全在本仓之外**：Claude/ChatGPT 两个 GUI 宿主各占约一颗核、
`pdftoppm` 批量转 PDF、iOS 模拟器、Spotlight 索引、另一项目的 `vitest` 与一枚 `pi` 进程；
本机 8 核，`/private/tmp/courtwork-pw-lock` 原子锁全程在手（该锁只互斥本仓的 PW，管不到别的项目）。
**判据本身不因负载改口**：中止的两轮一律作废，不取其中任何一例作证据。

**R3 的 7 红逐条定向复跑（同一树、同一命令族、独占端口、锁在手）：8 例全绿（24.1s）**——

| 用例 | R3 内 | 定向复跑 |
| --- | --- | --- |
| `demo-anchor-2.spec.ts:78` 样板案矩阵引语回原件 | 红 1.5m | 绿 12.7s |
| `follow-scroll.spec.ts:30` 钉底自动滚底 | 红 1.5m | 绿 13.6s |
| `debt-dossier.spec.ts:180` 多案件数分格 | 红 1.2m | 绿 14.2s |
| `file-ops.spec.ts:49` 原件区文件名留痕 | 红 1.0m | 绿 11.1s |
| `system-open.spec.ts:77` 原件区只读 | 红 17.9s | 绿 5.0s |
| `typography.spec.ts:143` 门④-2 AA 二宗 | 红 15.5s | 绿 5.8s／2.8s |
| `ui-surface.spec.ts:35` 失败轮次重试 | 红 31.6s | 绿 6.8s |

归因**取时长的数量级差**而非「重跑就绿」：同一断言在空闲机上 5–14s 完成，在负载机上撞 30s
上界——红形是等待超时，不是判定改口。七例的面与本票改动面无交（本票触碰的是场景条、
产出席位、起草面席位与定稿编排）。

**本段自建两条链的取证等级**：在 R3 完整链内**双绿**（非单文件孤证），另有两道产品级变异红证——
①抽掉 `App.tsx` 的移交声明 → 链① 复红于 `artifact-handoff-action` 不在场；②把画布抬头改回
「答辩状」 → 链① 复红于 `卸载态可见面泄漏垂类词「答辩」`。两次恢复后均复绿（`2 passed`）。
