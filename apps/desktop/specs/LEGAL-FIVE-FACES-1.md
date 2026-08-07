# LEGAL-FIVE-FACES-1 · 五面全链走查与收口（实现回执）

状态：实现完成，待独立验收（本会话不自我验收）。

分支 `claude/legal-five-faces-1`（base `main@6865463`，worktree 分树，与 `CHAT-MD-TABLE-2` 并行；
Playwright 用独占端口 `15433`，遵排程律「全仓同刻至多一条全链」）。

权威：`docs/architecture/implementation-readiness.md`「2026-08-05 真机试用观察批」`LEGAL-FIVE-FACES-1`
行为票面唯一真值；ADR-015（解耦相总纲）、ADR-010（Work 命令端口）、ADR-012 决定四（宿主 blueprint）；
先例回执 `apps/desktop/specs/GENERIC-PACK-1.md`（四面已全迁 `kind:'component'`，走查对象是迁移后的现行链）。

产品定容（同批）：**Legal 轻量包当期验收上限＝合成卷宗上五面全链可演示**；细分实践颗粒度的扩深
不入本票。本票硬边界：只收敛不扩面，不新增法律细分颗粒。

---

## 一 · 走查对象与方法

走查在**合成卷宗（晨曦印务设备纠纷）语境的 grant 真实案**上进行，逐面从**场景条按钮的真实调用**
走到**面内交互**。合同审查面（修订预览）已 OK，作对照基线。

方法两段：①现行链源码走查（场景声明 → 场景条派生 → 启动路由 → 生产命令端口 → 执行器 → 投影 →
renderer → 面内控件），逐环记「调用微妙处」；②以 e2e 在真实链上复现（`tests/e2e/legal-five-faces-1.spec.ts`），
每条缺陷先有红证再改。

**模型回合边界（如实登记）**：本票所有全链证据的模型回合由 DEV/E2E turn 樁承载。真 key 真模型的
五面回合**未执行**——本会话无 key，按票面纪律记 **external-validated blocked**，不得以樁结果宣称。
补证路径：产品负责人持 key 真机走五面并回填截图链（同 `PI-LANE` 真 key 复核的登记形态）。

---

## 二 · 缺陷清单与逐条处置（零悬置）

12 枚。**修 8 枚、显式不修 4 枚**（不修者各带理由与去向，其中两枚是 `[需架构拍板]`）。

| # | 所在面 | 缺陷 | 处置 |
|---|---|---|---|
| D1 | 时间线／关系图谱／矩阵审阅 | 场景条在 production 只渲染「审查合同」：驱动声明 `productionScenarioIds: ['legal.S3']`；且 **S2 连 `launch` 声明都没有**——矩阵审阅面在产品里零启动入口 | **修**：可启动集改装配点声明的闭集；S2 补 `launch` 声明 |
| D2 | 同上 | 生产命令端口硬拒非 S3（`scenarioId !== legal.S3 → rejected/invalid_scope`）；账本头 `scenarioId` 恒写 S3；续行时场景身份也写死 S3 | **修**：闭集判定；头记实际场景；续行身份从信封读回 |
| D3 | 起草画布 | 「起草答辩状」是**死钮**：点击 → 适用性拦截 →「该工作面暂不适用于合同审查」（真机观察②原形） | **修**：适用性声明退役 |
| D4 | 四张具名面 | 空态无下一步指引（承真机试点收尾拍板第四条：显式「暂不适用」正确但无指引） | **修**：`describeViewProducer` registry 派生指引 |
| D5 | 时间线／图谱／矩阵 | production 的 `onLaunchScenario` **只开视图不起跑**；S1 的 `uiTemplateId` 是 passive 面，连视图都开不了——点了零反应 | **修**：launch 路由三分支（view／带预检表单／无预检即起跑） |
| D6 | 时间线／图谱／矩阵 | 产物门禁（`confirmation_requested`）在面内**无确认控件**：场景永远停在 paused，全链最后一步断掉 | **修**：面内门禁确认条 |
| D7 | 壳 | 两处垂类文案硬写：运行中 composer 提示「合同审查正在运行…」、取消控件恒「停止审查」；端口两条 rejected 文案（未就绪／占用）也写死合同审查 | **修**：中性化；取消文案随运行场景派生 |
| D8 | 四张具名面 | 面头／大纲计数在非 demo 案**恒「尚无」**——面上正渲着时间线，抬头却说没有 | **修**：按本面此刻真有无产物派生 |
| D9 | 时间线／图谱／矩阵 | 引语的「回到原件」恒 disabled「尚未接通」（合同审查面已由 `CONTRACT-TRACE-1` 接通） | **不修**（理由见三节）：根因是 D10；此刻接通等于按**模型自报坐标**跳转，违反不变量二 |
| D10 | `packages/legal` 包契约 | `legal.Timeline`／`legal.PartyGraph`／`legal.ReviewMatrix` 无 `draftSchemaId` 与 `citationBinding`——模型须**直接产 `sourceAnchors`**（坐标由模型出），与不变量二「无锚不落格；模型出引语，系统出坐标」相悖；真模型下 S1/S2 因此结构性易失败 | **不修**，`[需架构拍板]`（三节） |
| D11 | 跨场景 | 起新场景 `dispatch __clear__` 清空会话投影：跑完 S1 再跑 S2，时间线／图谱面回到空态——产物只活在自己 session 的投影里 | **不修**，`[需架构拍板]`（三节） |
| D12 | S1／S2 | 无会话指针 ⇒ 无跨切案／重启的恢复入口 | **不修**（显式边界，随 D11 同批；四节「未做与为何」） |

---

## 三 · 三枚不修项的理由（含两枚架构拍板请求）

### D10 `[需架构拍板]` · 三枚产物缺引用闭环声明

`legal.RiskList` 有 `draftSchemaId: 'legal.RiskListDraft'` 与 `citationBinding`（模型出 `quoteClaims`、
citation resolver 铸 `sourceAnchors`）。Timeline／PartyGraph／ReviewMatrix **三枚都没有**，故它们的
`sourceAnchors`（Timeline/PartyGraph 还是 `min(1)` 必填）只能由模型自己写出 `fileId`/`textRange`/
`textLayerVersion`——**模型在出坐标**。

两个后果：①面内「回到原件」不能接通（D9）——跳到一个系统从未校验过的坐标，比不接通更糟；
②真模型下 S1/S2 极易在 schema 校验处失败（本票的樁能过，是因为樁按格式写死）。

请求裁定：为三枚补 Draft schema 与 `citationBinding`（形态循 RiskList 先例）。这是**包契约变更**
（新增 schema + descriptor 字段 + JSON Schema drift + golden），按治理不变量二属架构角色拍板，
实现会话不得自改 schema 语义，故本票只登记不动手。裁定落地前，D9 保持显式 disabled。

### D11 `[需架构拍板]` · 一个 matter 内多场景产物不并存

现行会话模型是「每案至多一个活跃 session，投影随起跑清空」。五面各自的链因此都能走通
（S1 一次运行内产出时间线＋图谱两枚，两面同活），但**跨场景**不成立：跑完 S1 再跑 S2，
前者的两面回空态。

这不是一处接线遗漏，而是「session 是产物容器」这条既有语义的直接推论；改法（matter 级产物账本 /
多 session 并存 / 跨 session 晋升）触持久与投影契约，属架构拍板范围。本票登记，不在实现层暗改。

### D9 · 「回到原件」不接通

见 D10。**不修不是不做**：它是 D10 裁定的下游，裁定落地后随票接通。此刻把 disabled 改成可点，
是把「系统未校验的坐标」伪装成可信定位——比现行显式态更坏。

---

## 四 · 已修八枚的实现面与判据

### ① 可启动场景闭集（D1/D2）

- `PRODUCTION_SCENARIO_IDS = [legal.S1, legal.S2, legal.S3]` 住装配点 `work/legal-s3-binding.ts`；
  端口只问「在不在闭集内」，闭集外 `rejected/invalid_scope` 且**零账本**（原判据逐字保留）。
  S6 不入闭集（确定性执行器另一条链，不扩面）；S4 是视图入口不是场景启动（包声明 `launch.kind='view'`）。
- `getProductionScenario` 闭集外/未注册一律显式失败——**不回落 S3**（「不认识的场景静默当成合同审查」
  正是要消灭的静默降级）。
- `buildIntakeRunInput`：无预检场景的运行输入。与 S3 共用同一条「缺工具输入必须显式阻断」判据
  （把 S3 递进来照样红），故不是绕开 preflight 的第二扇门。
- `deriveCaseFileFromMaterials`：无主合同语义的卷宗清单派生，全部 `supporting`——**结构上写不出**
  `contract.primary`，主合同仍只在用户显式选定时出现。
- 账本头 `scenarioId`／`scenarioFingerprint` 记实际场景；续行的场景身份改从**信封**读回
  （`store.snapshot().scenarioId`），此前写死 S3 会让非 S3 会话以错误场景声明重放。

`LegalS3WorkCommand`／`createLegalS3WorkCommand` 随之更名 `LegalWorkCommand`／`createLegalWorkCommand`
（端口已服务三枚场景，旧名是不实宣称）；`startWithPreflight`／`resolveReview` 仍是 S3 专属入口，名不动。

### ② 起跑路由与面内门禁（D5/D6）

- `useWorkRunLifecycle.start(scenarioId, params)` 显式携场景身份——此前签名里没有这一枚，
  「能起跑的只有 S3」这条事实就写死在了实现里。
- 无预检场景走 `startIntake`：全部 ready 材料入 `materialRefs`、零材料时显式阻断并说下一步。
- `resolveLaunchTargetView`：场景启动后落到哪张面＝先认场景自己的 `uiTemplateId`，认不出
  （S1 的 `case-intake-panel` 是 passive）再落它首枚有在册工作面的产出物。全 registry 派生。
- `GateConfirmBar`（`verticals/legal/`）：文案取账本 `gateLabel`，只在 `artifactType` 与本面一致时出现，
  决定经生产端口 `resume` 落账（留人确认，零本地伪造）。RiskList 有自己的逐条处置面，故驱动侧把它
  排除在 `pendingGate` 之外。

### ③ 适用性退役与空面指引（D3/D4）

`ViewApplicability` 与「该工作面暂不适用于合同审查」双双删除——那两枚是「production 只能跑 S3」的
影子：四张在册面被声明为「不适用」，而真正的事实是产出它们的场景无从起跑。空面改说
`${title}尚未生成 · 由「${launchLabel}」场景产出，在下方场景条启动`，指引由 `describeViewProducer`
从 registry 三段事实（场景 `outputArtifacts` → artifact `uiTemplateId` → blueprint `view`）派生，
**壳零垂类字面量**；说不出「怎么开始」的场景（不在可启动闭集）不作为指引。

### ④ 文案中性化与面头计数（D7/D8）

`runningControlCopy` 由静态字段迁入读出面，随**正在跑的那一枚**派生（S3 仍「停止审查」，
其余取场景名）；composer 运行中提示与端口两条 rejected 文案中性化。面头/大纲计数外提为
`preview/workbench-views.ts` 的 `workbenchViewMeta`，非 demo 案按本面真有无产物说话。

---

## 五 · 新增概念登记（复杂度节制条）

本票新增**两枚**，均无既有落点可用：

1. **`PRODUCTION_SCENARIO_IDS` 闭集 + `buildIntakeRunInput`**（装配点）。
   *为何非加不可*：可启动性此前是端口里的一个 `!==` 比较，加第二枚场景就得在端口里长出第二条
   分支。闭集把「哪些场景可在真实案上跑」变成装配点的一行声明，端口与壳都不认识 id 语义；
   无预检运行输入是它的必要配套（S1/S2 没有 preflight 表单，但仍须过同一条工具输入判据）。
   不新增持久格式、不新增状态机。
2. **`GateConfirmBar` + `VerticalWorkSurfaceValue.pendingGate/confirmGate`**。
   *为何非加不可*：门禁确认此前只有 RiskList 一条逐条处置路径（住提交编排）。S1/S2 的产物门禁
   需要的是**两枚终态决定**，复用逐条处置面等于给没有逐条语义的产物造一套假的审阅编排。
   本件只有「读账本里的待确认 + 两枚按钮 + 调 resume」，无本地状态、无第二真源。

`describeViewProducer`／`resolveLaunchTargetView`／`workbenchViewMeta` 三枚是**纯派生函数**，不算新概念
（无新状态、无新契约面，全部从既有 registry/blueprint 声明现算）。

### 成熟 OSS 复核（工程纪律条，以现行 HEAD 真实缺口为基线）

本票新增 UI 面＝面内门禁确认条（一行说明＋两枚按钮，样式复用既有 `work-recover` 族）与空面指引
一行文案。**结论：保留自研**。理由一手核实自本仓现状而非 star 数：①候选类目（表单/对话/确认组件库）
解决的是渲染与可达性，而本件的全部实质在**确认账本与 fail-closed 判定**——按纪律不得因接库外包；
②渲染复杂度为零（零新增 CSS 规则、零新色、零阴影），引入依赖是净负；③本件读的是 `SessionEvent`
的 `gateLabel/artifactType/requestId`，任何通用件都得先被包一层适配才能用。故本轮无新增依赖。

---

## 六 · 红证与判据（撤任一修复即复红）

单测（`apps/desktop`，vitest）：

| 谱 | 例数 | 判据 |
|---|---|---|
| `work/production-scenarios.test.ts` | 9 | 闭集恰三枚；闭集外取用即抛、start 即 `rejected/invalid_scope`；S2 真跑到门禁且**账本头记 legal.S2**（撤「头记实际场景」即红：仍记 S3）；通用 resume 续行到 `scenario_completed`；无预检运行输入零工具输入；S3 递进本路径仍显式阻断；`deriveCaseFileFromMaterials` 全 supporting 且未就绪材料不入 |
| `preview/view-producer.test.ts` | 5 | 时间线/图谱同出 S1、矩阵出 S2；闭集外场景不作指引；零垂类准入即零指引 |

首红实证（TDD）：两谱在实现前跑 `tsc -b` 全部红（`has no exported member` 七项，desktop 的真门是
`tsc -b` 非 vitest），实现后绿。

e2e（`tests/e2e/legal-five-faces-1.spec.ts`，4 例）与**按本意改写的既有断言**：

- ①② 整理卷宗一键起跑 → 时间线真渲＋抬头「已生成」（D8 判据）→ 门禁「确认事件时间线」→ 确认续行
  → 关系图谱面第二道门禁 → 确认 → 终局（门禁条消失 **且** 两面产物仍在册 **且** 零空态——
  「条消失」单独不足以证明走完，失败也会消失）。
- ③ 矩阵审阅按钮 → 矩阵真渲 → 门禁「确认矩阵审阅结果」→ 确认 → 终局。
- ⑤ 起草答辩状 → 起草画布可编辑（键入后正文可读回）；`preview-host` 不含「暂不适用」。
- 空面指引：未跑 S2 时矩阵面说得出产出者与启动方式。
- `work-live.spec` 两处「该工作面暂不适用于合同审查」断言按本意改写为起草画布可用（D3 的既有红证：
  这两条在修复前是绿的，正是缺陷被断言固化的形态）；`composer.spec` 禁用文案随中性化更新。

**樁的一处如实登记**：turn 樁按六段组装的「本次产出目标地址」`stepId` 选脚本产物。首版按
「请求里出现过 `legal.Timeline`」匹配——步骤树段把三枚 artifactType 全列了出来，于是每一步都回
同一枚产物，实测首步即 target 不符被拒收。按调用计数选同样不可（失败重试即错位）。

---

## 七 · 八相全量门（本会话自跑，分支 tip）

| 相 | 结果 |
|---|---|
| build | `pnpm -r build` 绿 |
| lint | 绿 |
| root test | **1941/1941**（与 base 同值：root 面不含 desktop 谱；本票的包侧改动只重铸一枚 golden） |
| desktop test | **769/769**（755 → 769：新增 9+5，既有 0 净减） |
| cargo | **250 过 / 1 忽略**（与 base 同值；pi-lane TS/Rust 本票零改动。首跑两红为本树缺 headless 制品，`build:headless-sidecar` 后复绿——环境条件红，非树上红） |
| Playwright | **372/372**（floor 365；`test:e2e` 前置静态门链全通过，独占端口 15433，单链独跑 5.6m） |
| site:guard | PASS |
| sidecar | **547,893 B / `951acf8e…` 零迁**（与 base 逐字同值） |

App 高水位 **2282 → 2279**（`viewCount` 外提为 `workbenchViewMeta`，抵消本票在 App 内的净增）。
零泄漏门受检面 **174 → 176**（新增 `preview/view-producer.ts` 与其谱；`verticals/` 内绑定仍 6 处）。

**本轮自伤如实登记**：倒数第二轮全链曾出 370/372 两红（`contract-output` 版本化产物名一例、
`global-verbs` 复制按压反馈一例）。归因是**我自己违反了排程律**——前一轮 `test:e2e` 未结束就起了
第二条全链（同端口、各 4 workers）。两例以 `--workers=1` 独占端口复跑 27/27 绿，但按本仓判例
「隔离绿对全链红零区分力」不据此结案；**最终以无并发条件下单跑的那一轮为准（372/372，EXIT 0）**。
本条留痕是为了让验收者知道：这两枚红出现过，且它的成因是操作污染而非树上缺陷。

---

## 八 · 偏离登记（待验收/架构追认）

1. **包侧一处改动**：`legal.S2` 补 `launch` 声明（label/tone/kind，无预检字段），形态循 S1/S6 先例。
   descriptor hash golden 重铸一枚（`layout-golden.test.ts`）；`schema-exemplar` 未触及
   （其 P0-S02 锚 `presentation/index.ts`，本票未动该文件——现读实测门通过）。
   理由：无此声明则「矩阵审阅」在产品里没有任何启动入口，票面「场景按钮真实调用」不可达。
2. **`ViewApplicability` 契约删除**（非弃用）：循「不保留兼容层」原则，零声明者的机制不留空壳。
   代价是 `work-live.spec` 两条既有断言按本意改写——已在六节登记为 D3 的红证形态。
3a. **`assert-work-live-contracts` 判据改锚**：场景取用由 `getS3Scenario` 改锚 `getProductionScenario`
   （同一装配模块的同一职责），并**新增** `buildIntakeRunInput` 一条——一条未减、加了一条。
   起因是 lint 抓出 `getS3Scenario` 在端口内已零消费（门要求它在场，码里却已不用它，两者只能有一个是对的）。
3. **端口更名** `LegalS3WorkCommand → LegalWorkCommand`：名实相符，非语义改动；
   `assert-work-live-contracts` 的既有判据（`buildS3RunInput`/`getS3Scenario`/`mapReviewResolutionToResume`…）
   逐条仍在且仍绿，一条未减。
4. **S1/S2 不写会话指针**：指针记录携 `contractMaterialId`、恢复入口文案属合同审查，借它承载第二类
   场景会把「上次审查」指向一次阅卷。故显式不写（D12），跨会话恢复随 D11 裁定。
5. **`runResume` 的占位 header 仍写 `S3_SCENARIO_ID`**：该 header 只在「信封不存在」时被用到，
   而那条路径本就以 typed 失败收场（行为与基线逐字相同）。登记而非顺手改，避免在无判据处动账本头。
6. **S2 的 `tone: 'wide'`**：窄容器（≤520px）下驻「更多」弹层，同「卷宗整理」既有形态。空面指引
   因此只说「在下方场景条启动」，不许诺按钮的具体位置。

---

## 九 · 报交验点

本票六条退出证据：①五面各一条合成卷宗全链演示证据（`release/evidence/legal-five-faces-1-2026-08-07/`
六帧：时间线／关系图谱／矩阵／修订预览／起草画布＋空面指引）；②缺陷清单零悬置（12 枚逐条处置，
不修四枚各带理由与去向）；③撤任一修复复红（六节）；④八相全量门自跑登记（七节）；⑤定容边界遵守
（未新增法律细分颗粒，未扩面）；⑥两枚 `[需架构拍板]` 与六条偏离在册。

**不自我验收**：报 Codex 独立会话验收（独立 clean worktree、独立端口、守卫实际注入反例观察变红）。
真 key 五面回合仍记 **blocked**，与产品负责人约真机截图链补证。
