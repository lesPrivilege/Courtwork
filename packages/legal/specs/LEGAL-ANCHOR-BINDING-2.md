# LEGAL-ANCHOR-BINDING-2 · S4 引用闭环与准入守卫上收（实现回执）

状态：实现完成，待独立验收（本会话不自我验收）。

分支 `claude/legal-anchor-binding-2`（base `main@1c22389`，worktree 分树；
Playwright 用独占端口，起链前经 `/private/tmp/courtwork-pw-lock` 原子取锁，跑完即释）。

## 一 · 票面锚与范围

权威：`docs/architecture/implementation-readiness.md` 的 `LEGAL-ANCHOR-BINDING-2` 行（票面唯一真值），
源出 `LEGAL-ANCHOR-BINDING-1` 架构裁定一（2026-08-09）；核心不变量二「无锚不落格；模型出引语，系统出坐标」。
方法与边界范本循一票 `packages/legal/specs/LEGAL-ANCHOR-BINDING-1.md` 全文。

两条票面**同批**：
① S4 `legal.RevisionInstructionSet` 草稿形改造——模型自报坐标退出最终形，循一票
   `draftSchemaId` + `citationBinding` 先例；
② `registry/admission.ts` 守卫上收——`rehydrationProjection` 路径此前结构性照不到引用闭环要求；
③ 族门 `OPEN_ANCHOR_DEBT` 随之销记。

边界遵守：只动包契约与绑定层 + 其消费面（output/legal 的 fixture 与确定性编译器）。
未触 wire/journal 闭集外语义，未改 core 的 resolver/executor 一行，未动 desktop 源码一行。

**顺序**（票面实施要点①，逐相留痕）：先闭 S4 草稿形（生产者/消费者/JSON Schema/词表全同步——契约先行），
再上收 admission 守卫；上收时 S4 已闭，故生产面全绿而反例（rehydration 族未闭环 schema）触红。

## 二 · 改动清单

### 基座 wire（`packages/schemas`）

| 文件 | 改动 |
|---|---|
| `src/revision-instruction-set.ts` | 最终形补 `outOfCoverage`（`.default([])`）；新增 `CitationDraftSchema` / `AnnotationDraftSchema` / `RevisionInstructionDraftSchema` / `RevisionInstructionSetDraftSchema` |
| `src/source-anchor.ts` | 抽 `SOURCE_ANCHOR_TITLE` 常量并用于自身 `.meta({title})`（字面漂移结构性不可能） |
| `src/citation.ts` | 同上抽 `RESOLVED_SOURCE_ANCHOR_TITLE`；新增族定义闭集 `SYSTEM_MINTED_ANCHOR_TITLES` |
| `src/export-json-schema.ts` | `SCHEMA_REGISTRY` 补 `RevisionInstructionSetDraft`（10 → 11 份） |
| `json-schema/*.schema.json` | 生成器重跑：`RevisionInstructionSet` 更新 + `RevisionInstructionSetDraft` 新增 |

草稿形与最终形的差别**恰两处**，两处都是系统裁决性事实退出模型输出面：
① 依据引用携 `quoteClaims`（`QuoteClaim`）而非 `sourceAnchors`——坐标字段结构性不存在；
② `evidenceKey` 不在草稿面——它由 core 的信源台账签发（W6.2），不是模型可自报的字段
（该项超出「坐标」字面，但同属不变量二的同一条纪律；作为**收窄**登记在偏离表第 2 条）。

### 准入机器层（`packages/registry`）

| 位置 | 改动 |
|---|---|
| `CollectedSchemaInfo` | 增 `carriesSystemMintedAnchor`；三处内联字面量收敛为 `emptySchemaInfo()` |
| `collectSchemaInfo` | 入口按 `z.globalRegistry.get(schema)?.title` 对 `SYSTEM_MINTED_ANCHOR_TITLES` 判族（置于 visited 短路之前） |
| `checkEnumVocabulary` | 签名由「收 schema 自己走一遍」改为「收调用方已收集的 info」——同一棵树只走一遍 |
| 准入 artifact 环 | 最终 schema 单次 walker，枚举词表与携锚判定是同一次遍历的两个读出面 |
| 场景 `outputArtifacts` 环 | 判据由单一呈现轴改为**两轴并存**：呈现声明含 `format==='anchor'` **或** 最终 schema 结构上携系统铸造锚 |
| `itemObjectBranches`（新） | 覆盖单元 item 根接受「单对象」或「全分支皆对象的联合」；item 级字段判据按**每一支都须满足**收 |

### 垂类包（`packages/legal`）

| 文件 | 改动 |
|---|---|
| `src/presentation/index.ts` | `legal.RevisionInstructionSet` 补 `draftSchemaId` + `citationBinding` + `enumLabels.reason` |
| `src/package/bindings.ts` | `legal.RevisionInstructionSetDraft` 入 runtime plane（11 → 12） |
| `src/schemas/index.ts` | 草稿三型成对 re-export |
| `src/scenarios/index.ts` | S4 prompt 补生产者纪律两句（引语一字不差 / 坐标与台账键由系统铸造） |
| `src/domain/compile-risk-list-to-revisions.ts` | 返回值补 `outOfCoverage: []`，并注明该路径**结构性**不产生引用闭环缺口 |
| `json-schema/*.schema.json` | 生成器重跑（11 → 12 份） |

### 消费面

`packages/output` 25 处 `RevisionInstructionSet` 字面量补 `outOfCoverage: []`（纯 fixture，
`applyRevisionInstructionSet` 不读该键，语义零变化）。**desktop 源码零改动**。

### 新增/改写测试面（+24，逐项可核）

- `packages/legal/src/package/anchor-binding.test.ts` 21 → **32**：`BOUND_TYPE_IDS` 纳入 S4（6 组 `it.each` 各 +1）
  ＋新增「撤闭环声明即准入拒载」族级反例 describe（4 + 1）
- `packages/demo-runtime/src/acceptance/legal-anchor-binding.integration.test.ts` 5 → **9**：S4 执行器级四例
- `packages/registry/src/admission.test.ts` 69 → **76**：rehydration 上收 5 例 ＋ 判别联合 item 2 例
- `packages/legal/src/json-schema-drift.test.ts` 12 → **13**；`packages/schemas/src/json-schema-drift.test.ts` 10 → **11**

## 三 · 族门：`OPEN_ANCHOR_DEBT` 销记，判据收窄为恒常式

一票的族门写法是：

> 族内未闭环者必须与 `OPEN_ANCHOR_DEBT` **逐字相等**。

本票把那个常量整枚删除，判据改为 `expect(unclosed).toEqual([])`——**不再有「在册债」这条豁免缝**。
族定义（场景 `outputArtifacts` 去重集中，导出 JSON Schema 含 `"title":"SourceAnchor"` 者）一字未改，
族非空前置断言与检出谓词阴性自检两条守门照旧。

清零证据（实测，措辞按实际输出收窄——**不是**「全仓零命中」）：

```
$ git grep -n 'OPEN_ANCHOR_DEBT' -- '*.ts' '*.tsx'
packages/legal/src/package/anchor-binding.test.ts:13: * ……`OPEN_ANCHOR_DEBT` 销记，判据收窄为恒常式「未闭环集恒空」。
```

全仓源码里该标识符**零处仍是活代码**，仅剩这一行说明销记事实的注释。其余命中全在史料面
（`apps/desktop/ACCEPTANCE.md` 一票验收节、`docs/status/current.md` 一票清账行、
`packages/legal/specs/LEGAL-ANCHOR-BINDING-1.md` 与 `packages/legal/SPEC.md` 的一票留痕段）——
按「历史不涂改」纪律原样保留，本票另起状态更新段说明其了结。

同时族门在**两处**同时成立：包内（`anchor-binding.test.ts` 的导出 JSON Schema 轴）与准入层
（`admission.ts` 的 zod meta title 轴）。两轴的族定义同源——都认 wire 包登记的 `SourceAnchor` 标题。

## 四 · 红绿证（撤判据即复红，均带命中校验）

**首红（TDD）**：`anchor-binding.test.ts` 把 S4 纳入 `BOUND_TYPE_IDS`、`OPEN_ANCHOR_DEBT` 改空后，
实现前 **7 红 / 20 绿**。守卫上收的 5 例在实现前 **2 红**（另 3 例是自检/边界，前后恒绿——
如实登记为对该实现零区分力）。

**变异**（每条先做字面命中计数，命中不为 1 即中止；跨包一律重建 dist 后再跑靶谱）：

| # | 变异 | 命中 | 结果 |
|---|---|---|---|
| M1 | 删 `legal.RevisionInstructionSet` 的 `draftSchemaId` + `citationBinding` | 1 | **18 红** / 3 文件：族门 + 准入自证 + S4 集成谱全灭 |
| M2 | `CitationDraftObjectSchema` 补回 `sourceAnchors: z.array(SourceAnchorSchema)` | 1 | **4 红**：草稿无坐标判据 + legal JSON Schema drift + S4 集成两例（模型自报坐标又能落格） |
| M3 | 准入判据撤结构轴（删 `\|\| anchoredArtifacts.has(ref)`） | 1 | **7 红**：registry 上收 2 例 + legal 族级反例 5 例 |
| M4 | 判别联合 item 判据 `every` → `some` | 1 | **1 红**：「只要一支缺 `itemSummaryField` 即拒载」 |
| M5 | 锚族判定恒 false（`carriesSystemMintedAnchor = false`） | 1 | **7 红**，与 M3 同集——两处是同一判据的声明端与检出端 |

五枚变异全部还原，还原后 `packages/legal`＋`packages/registry`＋`packages/schemas`＋`packages/demo-runtime`
**385/385** 复绿。

**常驻反例（非一次性变异）**：

- **binding 漂移**：四种写错（`anchorField` 写错一字 / `draftField` 误拼 / `itemScope` 指向非数组 /
  `outOfCoverageField` 不在最终根）×四枚闭环 artifact = 16 例，逐例断言 `admitPackages` 拒载且拒因点名该字段。
- **旧形态 typed 拒收**：S4 集成谱第二例——模型按 BINDING-2 之前的形态自报 `sourceAnchors`，
  信封校验 `GenerationValidationError`，账本零 `legal.RevisionInstructionSet`、全文零 `textRange`。
- **诚实 partial**：两条指令一条引语编造，重试仍不收敛 → 收敛的那条照常落格、不收敛的整条入 `outOfCoverage`
  （摘要逐字等于 `instr-02`），`citationStats` 逐字断言。
- **全灭硬失败**：唯一一条指令不收敛 → 剪枝后 `instructions: []` 不过 `.min(1)`，抛
  `GenerationValidationError: 剪枝后的最终形未过 schema`，零 artifact 落格（见五节偏离 3）。
- **上收判据的上界**：把锚换成不携 meta title 的同形对象即不触发结构轴（正向反例在册，见五节）。

## 五 · 偏离登记与 [需架构拍板]

### [需架构拍板]

1. **`outOfCoverage` 非空的修订指令集流入 `packages/output` 时是否应有整份阻断门**。
   `compileConfirmedRiskListToRevisionInstructions`（S3 路径）对 `riskList.outOfCoverage` 非空是
   **整份阻断**（`UnresolvedCoverageError`：部分批注稿会让用户误以为这是一次完整审查）。
   本票给 S4 最终形加了同名根键后，「带缺口的指令集去编译 docx」在类型上成为可表达状态。
   **当期零可达路径**（已逐点核实：S4 的 `launch.kind === 'view'`——场景条按钮打开起草画布、
   不启动场景本体；desktop 的 `compile-review-output.ts` 与 demo-runtime 的 `run-legal-demo.ts`
   都从 RiskList 编译，不消费模型产的指令集）。给 `packages/output` 或其调用方加门属**跨层选择**，
   超出「包契约与绑定层」的票面边界，按票面实施要点②停下登记，不自行落地。

### 偏离（待追认）

1. **`packages/registry` 的 item 形态扩面是 S4 的结构性前置，不是可选优化**。
   `/instructions` 是 `z.discriminatedUnion` 的四支指令，旧判据 `draftItem instanceof z.ZodObject`
   直接拒载（实测拒因：「草稿元素不是对象，无法核对 item 级字段」）。新增 `itemObjectBranches`
   按 fail-closed 方向收（全分支皆对象才算合法；item 级字段每一支都须有），并补了独立红证（M4）。
2. **草稿形不含 `evidenceKey`**（收窄）。票面说的是「模型自报坐标退出」，`evidenceKey` 是台账签发键
   而非坐标；但它同属「系统裁决、模型不得自报」的同一条纪律，且草稿里给出该字段就是在邀请伪造。
   代价为零（最终形该字段 optional，S3 编译路径照常签发），收益是模型侧结构性拿不到它。
3. **`instructions` 保留 `.min(1)`，全灭时硬失败而非产出零指令集**。三面的覆盖单元数组无下界，
   剪光即空表；S4 不同——它带 `file_write` 副作用，「什么都不改的批注稿」比显式失败更误导。
   该边界有专谱咬住（四节「全灭硬失败」），不是未考虑的裂缝。
4. **`itemSummaryField` 取 `id`**。四支指令唯一共有的标量键：`text` 只在 replace/insert 两支上有，
   `locator` 是对象（`String()` 会落 `[object Object]`）。摘要因此是指令 id 而非人话描述——
   如实登记为可读性上的已知折中，descriptor 注释里写明了理由。
5. **`checkEnumVocabulary` 改收 info、准入环单走 walker**。行为面的净变化是：走 `presentation` 路径的
   artifact 此前根本不进 walker，现在同样纳入 fail-closed 未识别节点覆盖（**收紧**方向）。
   实测 `packages/pm`（唯一的 presentation 路径包）零新增拒载。
6. **两枚 hash 同批重铸**（承一票偏离 1 的先例）：descriptor `ab7c80bc…` → `f3ef3d66…`、
   prompt blob `43133479…` → `56e03f15…`。理由同一票：不变量五要求 schema 变化同步生产者，
   不改 S4 正文则真模型仍按旧形态出格。`identity.version` 与 `schemaVersion` 均不升
   （`outOfCoverage` 为 additive-default 键，2026-08-09 裁定二已判不构成升版事由，此处**引用**该口径）。
7. **`schema-exemplar.sources.json` 两枚来源哈希重铸**：P0-S02（`presentation/index.ts`，本票触及）
   与 P0-S03（`compile-risk-list-to-revisions.ts`，本票补 `outOfCoverage: []`）。exemplar 正文为
   符号指针式，九章判据未受影响。
8. **票面实施要点④（demo/e2e 樁同步）实测为空**：全仓 grep 确认无任何 demo/e2e 樁产出模型侧
   `legal.RevisionInstructionSet`（S4 在产品里是 view 路由，e2e 樁只覆盖 S1/S2/S3）。如实登记为
   「该项无对象」，不以「已同步」冒充做过。

### 如实登记的判据上界（实测得来，非推断）

- **结构轴认的是 wire 包登记的 meta title**，包内自造的同形锚对象（无 title）不在轴上。
  它不构成静默洞——那样的对象不是 resolver 的写回目标，本就没有引用闭环契约可言；
  但准入层确实照不到它，已以正向反例把边界钉住（`admission.test.ts`「把锚换成不携该 title 的同形对象即不再触发」）。
- **缺口表的 UI 呈现**：desktop 当前只渲染 `RiskList.outOfCoverage`；Timeline / PartyGraph /
  ReviewMatrix 自一票起就未渲染，S4 同形。这是**族级既有面**，不是本票新引入的缺陷，
  本票也未扩面处置（票面边界内无此项）。

## 六 · 复杂度节制登记（本票新增了什么概念）

**新增两枚概念，逐枚说明为何非加不可**：

1. `SYSTEM_MINTED_ANCHOR_TITLES`（wire 包的锚族闭集）。准入层要判「模型输出是否携系统坐标」，
   判据必须有个真源。放 registry 是魔法串（机器层不该知道具体类型名）；放 wire 包则是
   「谁定义类型谁定义族」。两枚常量各自直接用在自己的 `.meta({title})` 里，字面漂移结构性不可能，
   因此**不需要**额外的 drift 锁测试。
2. `itemObjectBranches`（item 根的分支形态）。不是抽象，是把既有的 `instanceof ZodObject` 一处判断
   替换成同一语义的两态判断；没有它 S4 结构性无法准入。

**没有新增**：新依赖零、新持久格式零、新状态机零、core/desktop 改动零。草稿形、`citationBinding`、
`OutOfCoverageEntry`、`resolveDraftArtifact` 全部复用 `legal.RiskList` 已在册的机制。

**成熟 OSS 复核（以现行 HEAD 真实缺口为基线）**：本票新增 UI 面为零、新增算法为零；
所触面是 schema 契约声明（zod，已在册）与准入 fail-closed 判定。后者属「案件真源、schema、
授权、fail-closed 判定」——按工程纪律不得因接库外包。候选类目（schema 校验、JSON Schema 导出、
引用解析）在本仓已由 zod + 自研 resolver 拥有，一手复核未发现能替换自研判定层的合规候选。
**结论：删除当期动作（无候选可接，无新依赖）**。

## 七 · 全量门（本会话自跑，分支 tip）

| 相 | 结果 | base `1c22389` 实测 |
|---|---|---|
| build | `pnpm -r build` 绿 | 绿 |
| lint | `pnpm lint` 绿（零输出） | 绿 |
| root test | **2159/2159**（173 文件） | **2135/2135**（173 文件） |
| desktop test | **831/831**（94 文件） | 831（票面基线） |
| Playwright | **384/384**，EXIT 0，独占端口，原子锁 | 384（floor 384） |
| site:guard | PASS（含 schema-exemplar、app-highwater 2248） | PASS |
| cargo | **未跑**（本票零 Rust 改动，`git diff --stat` 无 `src-tauri/**`、无 `packages/pi-lane/**`） | — |

root +24 的构成经**逐文件机器对账**（两侧 `vitest --reporter=json` 后按文件名 diff，不靠估算）：

```
+11 packages/legal/src/package/anchor-binding.test.ts            (21 → 32)
 +7 packages/registry/src/admission.test.ts                      (69 → 76)
 +4 packages/demo-runtime/.../legal-anchor-binding.integration    (5 → 9)
 +1 packages/legal/src/json-schema-drift.test.ts                 (12 → 13)
 +1 packages/schemas/src/json-schema-drift.test.ts               (10 → 11)
```

base 数字取自 `1c22389` 的独立 worktree 实跑（跑完即 `git worktree remove`）。

**如实登记的环境观察**：`packages/output` 的 docx 谱（`signed-docx` / `contract-review-fidelity` /
`deterministic-zip` / `ooxml-diff`）在**全仓并发**跑法下会零星变红，独占重跑全绿；base `1c22389`
同样复现（同一次 base 全跑里出现过 1 红与 3 红两种结果，第三次全绿 2135/2135）。
承「反例期禁并发跑全仓门」判例——本回执引用的所有数字取自无并发的独占跑。

**他票证据还原**：`test:e2e` 全量跑会重生成他票 evidence PNG，跑完已逐目录 `git checkout --` 还原，
提交前 `git status` 与 `git diff --stat` 复核无 Bin 行（承 Bin 行判例）。

## 八 · 诚实边界

- **模型回合由樁承载**：S4 集成谱用 scripted turn runner。**真 key 真模型的 S4 回合未执行**，
  按票面纪律记 **external-validated blocked**——承 `LEGAL-FIVE-FACES-1` / `LEGAL-ANCHOR-BINDING-1`
  同一条边界。本票能证的是**通道形状**（模型交引语、系统铸坐标、台账键不在模型面、
  旧形态 typed 拒收、不收敛诚实入缺口表、全灭诚实硬失败），不是模型在真实卷宗上的引语质量。
- **S4 在产品里仍无场景启动入口**（`launch.kind === 'view'`）。本票闭的是契约与准入，
  不是把 S4 接成可跑的产品链——那不在票面。
- **自伤登记（供后续会话参考）**：变异还原时用了 `git checkout -- <file>`，把该文件**本票尚未提交的
  全部改动**一并抹掉（不只是变异那几行），随后按记忆逐字重建并以 `git diff --stat` 复核行数一致。
  判例早有在册（「未提交面还原一律 stash/cp 备份，禁 checkout」），本会话仍犯一次；
  其后全部变异改用 `cp` 到仓外备份目录还原。同批第二伤：`cmd && grep -c … && cmd` 链里
  `grep -c` 零命中退出 1 会**静默短路**后续命令，一度让一枚变异「以为跑了其实没跑」。
- **报交验点即停**：不自我验收、不合 `main`、不 push。

---

## 架构裁定（2026-08-10，先于独立验收落痕）

1. **上呈（output 阻断门）**：当期不落地——`outOfCoverage` 非空指令集当期零可达 `packages/output`（S4 `launch.kind==='view'`，两侧编译器均从 RiskList），预铸门属投机性防御。**前瞻条款**：S4 未来获执行编译路径的接线票，须同批立 `UnresolvedCoverageError` 同形整份阻断门，届时本条失效。
2. 偏离八条全部追认（registry item 判别联合扩面属结构性前置／草稿去 `evidenceKey` 正合「系统裁决性事实退出模型面」／`min(1)` 保留有专谱／`itemSummaryField` 取 `id` 折中接受／`checkEnumVocabulary` 收 info 净扩 fail-closed 覆盖／两 hash 重铸如实）；实施要点④空集登记接受；结构轴「只认 wire 包 meta title」上界带正向反例钉边界，接受。
3. 两枚自伤（`git checkout --` 抹未提交面再犯、`&& grep -c` 零命中短路）已留痕，处方不变：还原一律 cp 仓外备份、grep 计数不入 && 链。
