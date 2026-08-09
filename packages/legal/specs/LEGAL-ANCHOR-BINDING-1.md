# LEGAL-ANCHOR-BINDING-1 · 三面产物的引用闭环与「回到原件」接通（实现回执）

状态：实现完成，待独立验收（本会话不自我验收）。

分支 `claude/legal-anchor-binding-1`（base `main@f96937c`，worktree 分树；
Playwright 用独占端口 `15437`，起链前经 `/private/tmp/courtwork-pw-lock` 原子取锁，跑完即释）。

## 一 · 票面锚与范围

权威：`docs/architecture/implementation-readiness.md` 的 `LEGAL-ANCHOR-BINDING-1` 行（票面唯一真值），
源出 `LEGAL-FIVE-FACES-1` D10 架构裁定（2026-08-07）；核心不变量二「无锚不落格；模型出引语，系统出坐标」。
先例：`legal.RiskList` 的 `draftSchemaId` + `citationBinding`（HARNESS-1 拍板一 / `LEGAL-S3-BINDING-1`）；
回跳判据循 `CONTRACT-TRACE-1`（fileId 同案重验、`textLayerVersion` + `textRange` 的 block-local 高亮、
合法 bbox-only 显式 `anchor_unsupported`）。

四条票面：①三 schema 补 `draftSchemaId` + `citationBinding`，模型自产 `sourceAnchors` 退出最终 schema；
②「回到原件」三面由显式 disabled 转真实回跳；③契约先行——同步生产者、消费者、JSON Schema 与机器门；
④S1/S2 真模型结构性失败风险的评测证据随票登记。

边界遵守：只动包契约与绑定层 + 其消费面（desktop 呈现与 e2e 樁），未触 wire/journal 闭集外语义，
未新增法律细分颗粒，未改 core 的 resolver/executor 一行。

## 二 · 改动清单

### 包契约（`packages/legal`）

| 文件 | 改动 |
|---|---|
| `src/schemas/timeline.ts` | 最终形补 `outOfCoverage`（`.default([])`）；新增 `TimelineDraftSchema`（事件携 `quoteClaims: QuoteClaim[] min(1)`，坐标字段结构性不存在） |
| `src/schemas/party-graph.ts` | 同上；覆盖单元＝**边**（节点不携锚，故不入剪枝面）；新增 `PartyGraphDraftSchema` |
| `src/schemas/review-matrix.ts` | 同上；覆盖单元＝**行**；新增 `ReviewMatrixDraftSchema`，格的 `quoteClaims` **不设 min(1)**——「该文档未提及此问题」是合法答案，与最终形 `sourceAnchors` 允许空数组一致 |
| `src/package/bindings.ts` | 三枚 draft 逻辑 schema id 入 runtime plane（8 → 11） |
| `src/presentation/index.ts` | 三枚 descriptor 补 `draftSchemaId` + `citationBinding`；四枚（含 RiskList）的 `enumLabels.reason` 收敛为同一常量的逐处 spread（缺口表带出 `CitationFailureReasonEnum`，零编码暴露律） |
| `src/scenarios/index.ts` | S1/S2 prompt 补生产者纪律两句：引语一字不差、坐标由系统铸造不要自填 |
| `json-schema/*.schema.json` | 生成器重跑：三枚最终形更新 + 三枚 draft 新增（8 → 11 份） |

### 消费面（`apps/desktop`）

| 文件 | 改动 |
|---|---|
| `src/verticals/legal/panels.tsx` | `TimelinePanel` / `MatrixPanel` 收 `onOpenSource`；两处 `disabled` 死态换真按钮，判据逐字循 CONTRACT-TRACE-1「无锚才禁用」；矩阵图例文案随之改写 |
| `src/verticals/legal/GraphPanel.tsx` | 关系依据的原文定位钮同上接通 |
| `src/verticals/legal/{Timeline,Graph,ReviewMatrix}Renderer.tsx` | 各自从 `useLegalWorkSurface().host.openSourceAnchor` 取宿主 canonical reader 路由，不另造第二条定位链 |
| `src/material/material-actions.ts` | `anchor_invalid` 文案中性化（原写死「请重新运行合同审查」，接通后三面同用）——承 `LEGAL-FIVE-FACES-1` D7 |
| `tests/e2e/{legal-five-faces-1,pack-interact-1}.spec.ts` | turn 樁由「自报 sourceAnchors」改为「只交 quoteClaims」——旧樁在新契约下结构性拒收 |
| `docs/design/schema-exemplar.sources.json` | P0-S02（`presentation/index.ts`）来源哈希重铸 |

### 新增测试面

- `packages/legal/src/package/anchor-binding.test.ts`（21 例，族门 + 反例注入）
- `packages/demo-runtime/src/acceptance/legal-anchor-binding.integration.test.ts`（5 例，S1/S2 执行器级全链）
- `apps/desktop/src/verticals/legal/anchor-trace.dom.test.ts`（4 例，jsdom 真点击）
- `apps/desktop/tests/e2e/legal-anchor-binding-1.spec.ts`（3 例，真跑回跳与伪锚 fail-closed）
- 三份 schema 谱各补 draft 段（+16）；`json-schema-drift` 参数化随文件数 8 → 11（+3）

## 三 · 机器门：族门而非点名单例

`packages/legal/src/package/anchor-binding.test.ts` 的判据以**族**定义：

> 场景 `outputArtifacts` 去重集中，凡最终 schema 的导出 JSON Schema 含 `"title":"SourceAnchor"` 者，
> 必须声明 `draftSchemaId` + `citationBinding`；未闭环者必须与 `OPEN_ANCHOR_DEBT` **逐字相等**。

成员随包声明增减而门不改一行；新增第四枚携锚模型输出而不补引用闭环即红。族非空由一条前置断言看住
（空集合与全通过同形），检出谓词的区分力由一条阴性自检看住（把 anchor 形状换成不存在的 title → 全族落空）。

`OPEN_ANCHOR_DEBT` 当前恰一枚：`legal.RevisionInstructionSet`（见五节 [需架构拍板] 第 1 条）。

**如实登记准入层判据的上界**（实测得来，非推断）：把 `anchorField` 改成**同节点另一枚数组键**
（Timeline/PartyGraph 的 `markers`）不会被 `admitPackages` 拒载——键形轴与同位轴都过。它不是静默洞：
resolver 会把锚写进 `markers`，最终 `z.array(z.string())` 解析当场硬失败（`GenerationValidationError`），
属显式失败而非无锚落格。准入的判据到「同位数组键」为止，不核 anchor 元素类型。故反例取「写错一字」
（`sourceAnchor`）这一真正会被键形轴接住的形态。

## 四 · 红绿证（撤判据即复红，均带命中校验）

首红（TDD）：`anchor-binding.test.ts` 在实现前 **19 红 / 2 绿**（2 绿是两条守门的自检，前后恒绿——
如实登记为零区分力项）；三份 schema 谱的 draft 段在 `TimelineDraftSchema` 等导出存在前 `tsc -b` 即红。

变异（每条先做字面命中计数，再跑靶谱）：

| # | 变异 | 命中 | 结果 |
|---|---|---|---|
| M1 | 删 `legal.Timeline` 的 `draftSchemaId` + `citationBinding` | 1 | `anchor-binding` **7 红**（含族门）；重建 dist 后 demo-runtime 集成谱 **3 红**（`GenerationValidationError: legal.Timeline 未通过 schema 校验`——模型侧回到自报坐标，最终形拿不到锚） |
| M2 | `TimelineEventDraftSchema` 补回 `sourceAnchors: z.array(SourceAnchorSchema).min(1)` | 1 | **4 红**：族门的「模型侧结构性无坐标」＋ schema 谱三条（含「模型自报 sourceAnchors 不进草稿形」） |
| M3 | `panels.tsx` 两处 `disabled={!anchor}` 改恒 `disabled` | 1+1 | jsdom 谱 **2 红**（点击零调用）；另 2 例（死态文案反向锁）恒绿——同批登记为对该变异零区分力 |

其余 fail-closed 反例常驻在册（非一次性变异）：

- **binding 漂移**：三枚 × 四种写错（`anchorField` 写错一字 / `draftField` 误拼 / `itemScope` 指向非数组 /
  `outOfCoverageField` 不在最终根）共 12 例，逐例断言 `admitPackages` 拒载且拒因点名该字段；
  配一条「未变异的包照常准入」自检，防拒载恒真。
- **伪锚**：`QuoteClaim` 是 strict 形状，草稿里给引语塞 `textRange`/`bbox`/`textLayerVersion` 直接拒收（三谱各一例）；
  给事件/边/格塞 `sourceAnchors` 则被草稿 parse 剥离，断言 parse 后该键不在场。
- **漂移引语**：demo-runtime 集成谱实证「首过拒收 → 重试请求携原判与 `not_found` → 仍不收敛移入
  `outOfCoverage`」，`citationStats` 逐字断言。
- **跨案 fileId**：e2e `legal-anchor-binding-1.spec.ts` 第三例——引语正确但 `fileId` 指向本案没有的文件，
  两轮后整条被剪枝，面上零事件、零回跳入口，且 `preview-host` 不含那个模型自报的文件名。

**回跳的真跑证据**（e2e，只有真跑才成立）：模型一个坐标数字都没写，点「回到原件」打开的是那一份原件，
`reader-focus-anchor` 恰一处且逐字等于 `PRIMARY_CLAUSE`；时间线、关系图谱、矩阵三面各一条。
截图链：`release/evidence/legal-anchor-binding-1-2026-08-09/`（3 帧）。

**按本意改写的既有断言**（承「置换批定式：震红既有断言是世界变了」＋「红的理由判例」）：
`schema-polish.spec.ts` 与 `workbench.spec.ts` 各一处把「回到原件 · 尚未接通」的 **disabled 死态**
固化成了断言。改写为「可点 + 面上不再出现『尚未接通』」——旧判据转具名反向锁，不让它以旁效消失。

## 五 · 偏离登记与 [需架构拍板]

### [需架构拍板]

1. **`legal.RevisionInstructionSet`（S4 模型输出）仍是模型自报坐标**。它携 `sourceAnchors`
   （`.default([])`）且是 S4 的 `outputArtifacts`，故与三面同族；但它是**基座 wire**
   （`@courtwork/schemas/revision-instruction-set.ts`，`output` 管线共用），补草稿形属跨层选择，
   超出「包契约与绑定层」的票面边界。已登记进族门的 `OPEN_ANCHOR_DEBT`，增删都要显式改门。
   连带事实：`packages/registry/src/admission.ts` 的既有守卫只在 `presentation.fields.format==='anchor'`
   时要求引用闭环，而三面与 S4 都走 `rehydrationProjection` 路径，故该守卫对本族**结构上照不到**——
   本票的族门因此立在 legal 包内。把它上收进 registry 准入需与第 1 条同批裁定（上收即拒载 S4）。
2. **`identity.schemaVersion` 维持 1**。三枚最终形新增了 `outOfCoverage` 根键，按 ADR-009
   「持久 payload 契约版本单调递增」这是 payload 变更；但它是 `.default([])` 的加法键，存量持久 payload
   双向可读，而升版会改全包每一枚 `$id` URN（含本票未触及的四枚）并触发 ADR-008 的版本范围判定，
   blast radius 超出票面。取维持 1 为过渡，请架构就「additive-default 键是否构成升版事由」下判。

### 偏离（待追认）

1. **S1/S2 prompt 正文改写**（生产者同步）：补「引语一字不差 · 系统精确匹配校验」与「坐标由系统铸造，
   那些字段在你的输出格式里不存在」两句，形态循 S3 既有正文。因此 **prompt blob hash 与 descriptor hash
   两枚同批重铸**（此前几次重铸只漂 descriptor）——`layout-golden.test.ts` 内已逐条注明理由。
   理由：不变量五要求 schema 变化同步生产者；不改正文则真模型仍按旧形态出格，票面第四条不可达。
2. **`material/material-actions.ts` 的 `anchor_invalid` 文案中性化**：`请重新运行合同审查` →
   `请重新运行产出它的场景`。该文案在本票之前只服务合同审查面，接通后三面同用，写死单一场景名即不实指路。
   既有逐字冻结断言同批改写，并补一条族级反向锁（reader 全部文案不得含「合同审查」）。
3. **`enumLabels.reason` 收敛为模块常量的逐处 spread**（含 RiskList 一处的文本替换）：序列化结果逐字节
   不变（descriptor hash 的漂移全部来自新增的 binding 与词表），不制造跨条目对象别名。
4. **`docs/design/schema-exemplar.sources.json` 的 P0-S02 哈希重铸**：本票动了
   `packages/legal/src/presentation/index.ts`（`LEGAL-FIVE-FACES-1` 曾登记「未触及该文件」，本票触及）。
   exemplar 正文的九章判据与 Legal S3/RiskList 全链叙述未受影响（RiskList 的 binding 语义一字未动）。
5. **`assert-rp27-contracts` 的中文法律词判据**：该门要求 `verticals/legal/panels.tsx` 含「卷宗」，
   而旧文案里那两个字正住在被退役的 `title="卷宗原件尚未接通"`。新文案改为「在只读阅读面打开这处**卷宗**引证」
   与「本条事件在**卷宗**里没有可回跳的原件坐标」——判据一条未减，词落在新文案里而不是靠豁免。
6. **PartyGraph 的覆盖单元取 `/edges`**：节点不携锚，故剪枝面只覆盖边；一条边不收敛时整条边移入缺口表，
   节点与其余边照常呈现。ReviewMatrix 取 `/rows`：行内任一格不收敛即整行入缺口表（`itemScope` 是 resolver
   的覆盖单元，格级剪枝需要改 core，不在票面）。两条均在 schema 注释与 descriptor 注释里写明。

## 六 · 复杂度节制登记（本票新增了什么概念）

**零新概念**。三枚 draft schema、三条 `citationBinding` 声明全部复用 `legal.RiskList` 已在册的机制
（`draftSchemaId` / `CitationBinding` 五字段 / `OutOfCoverageEntry` / core 的 `resolveDraftArtifact`），
core 与 registry 一行未改。desktop 侧只是把既有 `host.openSourceAnchor` 多接了三个调用点，
未新增 context、未新增状态机、未新增持久格式。曾试图引入的 `isTraceableAnchor` 谓词在实现中期**删除**：
它比 CONTRACT-TRACE-1 的既有判据更严，会把「合法 bbox-only → 显式 unsupported」这条路径吞掉——
判据只该有一条，不该有第二套。

**成熟 OSS 复核（以现行 HEAD 真实缺口为基线）**：本票新增 UI 面为零（只把既有禁用按钮改为可点，
零新增 CSS 规则、零新色）；新增机制为零（全部复用在册 resolver 与 zod）。候选类目（schema 校验、
引用解析、坐标定位）解决的问题在本仓已由 zod + 自研 resolver 拥有，且引用闭环属「案件真源与
fail-closed 判定」——按纪律不得因接库外包。**结论：删除当期动作（无候选可接，无新依赖）**。

## 七 · 全量门（本会话自跑，分支 tip）

| 相 | 结果 | base `f96937c` 实测 |
|---|---|---|
| build | `pnpm -r build` 绿 | 绿 |
| lint | `pnpm lint` 绿（零输出） | 绿 |
| root test | **1986/1986**（172 文件） | **1941/1941**（170 文件） |
| desktop test | **824/824**（94 文件） | 820/820（93 文件） |
| Playwright | **380/380**，EXIT 0，独占端口 15437，单链 5.4m | 377（floor 366） |
| site:guard | PASS（含 schema-exemplar、app-highwater 2272） | PASS |

root +45 的构成（逐项可核）：`anchor-binding.test.ts` 21 + 三份 schema 谱补 16 +
`json-schema-drift` 参数化 8→11 得 3 + demo-runtime 集成谱 5 = 45。
desktop +4 = `anchor-trace.dom.test.ts`。PW +3 = `legal-anchor-binding-1.spec.ts`。
base 数字取自 `f96937c` 的独立 worktree 实跑（跑完即 `git worktree remove`）。

**cargo 未跑**：本票零 Rust 改动（`git diff --stat` 无 `src-tauri/**`、无 `packages/pi-lane/**`）。
如实登记，不以「与 base 同值」冒充实跑。

**他票证据还原**：`test:e2e` 全量跑会重生成 `legal-five-faces-1-2026-08-07/`（6 帧）与
`generic-pack-1-unloaded-2026-08-06/`（5 帧）的 PNG。跑完已 `git checkout --` 逐目录还原，
提交前 `git status` 复核只剩本票自己的 `legal-anchor-binding-1-2026-08-09/`（承 Bin 行判例）。

## 八 · 诚实边界

- **模型回合由樁承载**：集成谱用 scripted turn runner，e2e 用 DEV/E2E turn 樁。
  **真 key 真模型的 S1/S2 回合未执行**，按票面纪律记 **external-validated blocked**——
  承 `LEGAL-FIVE-FACES-1` 同一条边界，补证路径同样是产品负责人持 key 真机走链并回填截图。
  本票能证的是**通道形状**（模型交引语、系统铸坐标、旧形态 typed 拒收、不收敛诚实入缺口表），
  不是模型在真实卷宗上的引语质量。
- **样板案（demo）三面的回跳**：demo artifact 的锚点携 `textRange` 但无 `textLayerVersion`，
  且 `fileId` 多数不在 demo reader 的路由表内，故点击落显式 `anchor_invalid`——与 `DEMO-ANCHOR-1`
  刻意保留的两枚展品同形（诚实降级面），不是本票新引入的缺陷，也未在本票中扩面处置。
- **报交验点即停**：不自我验收、不合 `main`、不 push。

---

## 架构裁定（2026-08-09，先于独立验收落痕）

1. **S4 同族债（上呈一）**：不随本票拒载 S4。`legal.RevisionInstructionSet` 的草稿形改造与 `registry/admission.ts` 守卫上收（rehydrationProjection 路径结构性照不到引用闭环）**同批**另立 `LEGAL-ANCHOR-BINDING-2`，就绪图立行；本票 `OPEN_ANCHOR_DEBT` 登记正当，族门按现登记面判。
2. **schemaVersion 维持 1（上呈二）**：`outOfCoverage` 为 additive-default 键（`.default([])`，存量 payload 双向可读、序列化零破坏），不构成 ADR-009 升版事由；为其翻动全包 `$id` URN（含四枚未触及 schema）属纯代价零收益。裁定：additive-default 键不升版，此口径可为后例引用。
3. 六条偏离全部追认（两枚 hash 同批重铸／`anchor_invalid` 中性化＋族级反向锁／enumLabels 常量 spread／P0-S02 重铸／assert-rp27 判据落新文案／覆盖单元取边与行）；「同位数组键准入不拒但 parse 硬失败」的实测上界如实登记接受，反例形态取「真会被接住的」正当。
