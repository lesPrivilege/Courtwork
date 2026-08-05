# GENERIC-PACK-1 · 通用底面收口（App 首票）

状态：实现进行中（分支 `claude/generic-pack-1`）

权威：`docs/decisions/ADR-015-optional-vertical-loading.md`（Accepted）总纲；
`docs/architecture/implementation-readiness.md`「解耦相」`GENERIC-PACK-1` 行为票面唯一真值；
ADR-012 决定四（宿主原生组件与版本化 blueprint 分层）、ADR-014（tab＝schema 表）、
ADR-009 决定四（Renderer 是宿主 blueprint）为分层依据；先例 `PANEL-BLUEPRINT-1`（合入 `1b8c450`）。

本文件是本票的实现回执：逐步登记外提物、新增概念、偏离与红证。跨工单判例另进
`docs/engineering/workflow.md`；能力状态只进 `docs/status/current.md`（架构收账，本票不动）。

---

## 一 · 新增概念登记（复杂度节制条要求）

本票**只新增一个概念**：

### 宿主渲染上下文 `WorkbenchRenderProvider` / `useWorkbenchRenderContext`

住 `src/preview/workbench-render-context.tsx`。

**为何非加不可**：component blueprint 的入参契约恒为 `{descriptor, payload}`（ADR-012 决定四）。
矩阵首枚之所以能零上下文迁完，只因矩阵恰好不需要 payload 之外的任何输入；余三 panel
（timeline/graph 要证据等级、revision 要整套审阅编排）都要读**宿主会话派生量**。不给通道，
迁移债结构性无法偿还——这正是三枚长期停在 `kind:'route'` 的原因。

**边界三条（门与测试各锁一次）**：

1. 本上下文是**宿主侧** React context，不入 Package ABI——垂类包仍只声明 `uiTemplateId`，
   `HostRendererComponentProps` 一字未动（「view 扩形与拒载语义不变」的票面边界由此保持）。
2. 载荷必须**领域无关**：当前唯一字段 `evidenceGrades` 是 core `WorkSessionProjection` 的字段，
   不是垂类语义。
3. 无 Provider 即 **throw**，不给默认空值——缺装配是显式失败，不是「渲染成没有等级」的静默降级
   （核心不变量四）。红证：`TimelineRenderer.test.ts`「缺 Provider 即抛」。

---

## 二 · 外提物白名单（外提即入册判例，2026-07-26）

| 模块 | 职责 | 由哪一步外提 |
|---|---|---|
| `src/preview/workbench-render-context.tsx` | 具名工作面 renderer 的宿主渲染上下文（唯一新增概念，见上） | 步骤 ① timeline |
| `src/preview/TimelineRenderer.tsx` | `courtwork.timeline.v1` 宿主 renderer：先整面 `safeParse`，漂移即 fail closed | 步骤 ① timeline |
| `src/demo/demo-artifact-card.ts` | 样板案 chat 侧 artifact 卡的取数与文案（`demoArtifactCardCopy`）；只属显式 demo 回放 | 步骤 ① timeline |
| `src/preview/GraphRenderer.tsx` | `courtwork.party-graph.v1` 宿主 renderer；g6 懒载点随渲染件迁入 | 步骤 ② graph |
| `src/preview/workbench-views.ts` | 可见工作面集、默认落点与标题查询（`resolveWorkbenchViews` / `preferredWorkbenchView` / `workbenchViewLabel`） | 步骤 ③ 工作面集 |
| `src/demo/demo-view-counts.ts` | 样板案页签计数四枚（硬编码展品，非 demo 案不显示） | 步骤 ③ 工作面集 |
| `src/composition/package-runtime.ts`（既有件扩形） | 逐 matter registry 派生 `registriesFor` 与 `resolveMatterPackBinding` | 步骤 ④ 绑定契约 |

---

## 三 · 逐步实施与红证

### 步骤 ① · `legal.Timeline` 迁 `kind:'component'` 全链

改动面：`legal` presentation（artifact + renderer 两处 `uiTemplateId`：`timeline-panel` →
`courtwork.timeline.v1`）、`courtwork-host-renderers.ts`（route → component 携
`TimelineRenderer`）、`App.tsx`（退役 `view === 'timeline'` 分支、`TimelinePanel` 直连、
`timeline` 局部与 `Timeline` 类型持有）、`preview/registry/visual-blueprints.ts` 登记面、
`scripts/assert-view-abi-contracts.mjs` 迁移锁按 view 生成。

**不留 compatibility alias**：同矩阵裁定——artifact 事件只持 `artifactType` 与 payload，
回放从当期 descriptor 解析模板，alias 建成即零消费者。

**golden 重铸两枚**（均属呈现绑定变更，payload 契约与 `promptSegments` 未动，故 prompt blob
hash 不漂、`schemaVersion` 不升）：

- `packages/legal/src/package/layout-golden.test.ts` descriptor hash
  `533f9d40…` → `6913f050…`；
- `docs/design/schema-exemplar.sources.json` P0-S02 来源哈希
  `f19a76a2…` → `4d0935e6…`。

**门禁形态订正**：`assert-view-abi-contracts.mjs` 的迁移锁由「矩阵三条手抄」改为**按 view 生成**，
闭集是门自己的字面量清单 `MIGRATED_NAMED_VIEWS`（不从被测的 `courtwork-host-renderers.ts`
反向派生——期望侧由被判物派生正是「被测物不得给自己出考卷」）。另立**反向锁**：宿主注册表里
凡具名 view（非 `artifact`）都必须落在 `MIGRATED_NAMED_VIEWS` ∪ `PENDING_NAMED_VIEWS` 内，
新增 view 不入表即红。`PENDING_NAMED_VIEWS` 是**债的清单不是豁免清单**，随本票逐枚清空。

**红证四枚**（逐枚注入、观察变红、撤除复绿）：

| # | 变异 | 期望红 | 实测 |
|---|---|---|---|
| M1 | 宿主注册表 timeline 由 `component` 降回 `route` | VIEW-ABI 门 | 红 1 项：`timeline workbench view fell back to a route blueprint` |
| M2 | App 渲染链重新插入 `if (view === 'timeline')` | VIEW-ABI 门 | 红 2 项：位置锁 + 数量锁同时咬住 |
| M3 | `TimelineRenderer` 撤 `safeParse` 拒绝分支、改渲原始 payload | 单测 | 红 1 例：漂移 payload 渲出了半张时间线 |
| M4 | 无 Provider 时返回 `{evidenceGrades: []}` 兜底而非抛 | 单测 | 红 1 例：缺装配被静默吃掉 |

高水位：2475 → **2460**（净增 3 行＝上下文 memo 与 Provider 包裹；外提与分支退役共 −18）。

### 步骤 ② · `legal.PartyGraph` 迁 `kind:'component'` 全链

改动面同步骤 ①（`party-graph-panel` → `courtwork.party-graph.v1`）。两处本步特有：

- **懒载点随渲染件迁走**：`lazy(() => import('../workbench/GraphPanel'))` 由 App 顶层移入
  `GraphRenderer`。`GraphRenderer` 本身被宿主注册表静态引用，动态边界仍是那一处 `import()`，
  故 g6 的独立 chunk 切分不变（`pnpm -r build` 实测 `GraphPanel-*.js` 仍为独立块）。
  App 侧 `lazy` / `Suspense` 两枚 React import 随之退役。
- **懒载面的真渲判据**：`GraphRenderer.test.ts` 的正向用例断言 `关系图谱载入中`（Suspense
  fallback）**且不含**拒载文案——静态渲染只到懒载边界为止，故判据是「没有落到 fail closed」，
  不假称已渲出图。这是如实登记，不是放宽。

**门形态收口两处**：①`assert` 改为自计数，通过行的 checks 数不再手写常量（原 `18/18` 属
手抄，逐步加锁必漂）；②删掉 PANEL-BLUEPRINT-1 期的四行「四条锁」注释——迁移锁已改按 view
生成，那段自述与实现不再逐条对应（「注释也是宣称」）。

**红证三枚**：M5 blueprint 降回 route → VIEW-ABI 红 1 项；M6 App 重插 `if (view === 'graph')`
→ VIEW-ABI 红 2 项（位置锁＋数量锁）；M7 renderer 撤 `safeParse` → 单测红 1 例。

golden 重铸两枚（同步骤 ①，逐 panel 各一次）：legal descriptor hash `6913f050…` →
`7a2ac205…`；schema-exemplar P0-S02 `4d0935e6…` → `8a6c296d…`。

高水位：2460 → **2451**（App 侧净增 0）。

### 步骤 ③ · 工作面集由 blueprint 派生（零泄漏的运行时半边）

**问题**：壳里有一份固定枚举 `type WorkbenchView = 'timeline' | 'graph' | 'matrix' | 'revision'
| 'draft' | 'artifact'` 与配套 `VIEW_LABELS`（四条垂类页签标题）、`VIEWS`、`visibleViews`、
`viewCount` 的四条垂类计数。它们与渲染链无关，故三枚 panel 迁完仍原样留着——**卸载态一打开，
页签条照样写着「时间线／关系图谱／矩阵审阅／修订预览」**，正是 ADR-015 决定三禁止的
「零入口渲染、零词表泄漏」反面。

**改法**：具名工作面集改由「已准入 artifact × 在册 blueprint」派生。
`resolveWorkbenchViews(packageRegistries, hostRenderers, hasArtifactView)`：

- 具名面＝在册 blueprint 中 `view` 非通用面、且其 `uiTemplateId` 被某个**已准入** artifact
  descriptor 认领者，按**宿主注册表声明次序**排列；
- 通用面＝`draft`（恒在，ADR-015 成品律点名的通用主工作面）＋ `artifact`（有产出才出现）；
- 卸载态与加载态**共用同一条派生路径**，不存在「未加载时走另一套」的第二分支。

标题与默认落点随之迁入宿主注册表（`HostNamedViewPresentation`：`label` / `preferred`）：

- `courtwork-host-renderers.ts` 自此是**具名工作面排序与标题的唯一真源**；声明次序即页签
  次序，是契约不是排版。为保「加载态零回归」，声明次序按旧 `VIEW_LABELS` 次序重排
  （matrix 前移至 revision 之前），派生结果与旧 `VIEWS` 逐字相同。
- `label` 立在宿主侧而非 Package ABI：标题是宿主呈现事实，包侧 `renderers[].title` 是包对
  自己面的称谓（如「事件时间线」vs 页签「时间线」），两者**不合并**——合并即把宿主排序与
  命名权交给包。
- 具名 blueprint 缺 `label` 即整条派生 **throw**，不回落到 id（静默降级零容忍）。
- `preferred` 全注册表至多一枚，第二枚即拒载；壳据此选默认落点，卸载态落通用 `draft`。
  壳里 `useState<WorkbenchView>('revision')` 与两处 `setActiveView('revision')` 同批退役。

**门形态**：VIEW-ABI 迁移锁由「位置锁＋恰一处」收紧为**全称否定**（`view === '<migrated>'`
全文零处）——旧形态是 `viewCount` 垂类残留逼出的妥协，残留迁走即按本意改写，不放宽。
另立**页签词表锁**：四枚垂类页签标题不得作为整枚字面量出现在 App，且必须出现在宿主注册表
（双向锁：搬走了没接上同样红）。判据是整枚字面量而非子串，故 `'打开时间线'` 这类 demo 卡片
文案与注释提及不误伤——**如实登记**：`'修订预览尚未生成'` 一类仍住 App 的垂类空态文案属
尚未迁移的 `revision` 面，本锁此刻不假称壳已零垂类文案。

**前进式修正（本步随批）**：`assert-graph-theme.mjs` 的「G6 按工作面懒加载」判据钉在
`App.tsx` 的字面量上，步骤 ② 把懒载点迁入 `GraphRenderer` 后该门实为红——步骤 ② 的提交
`16f9e39` 未跑到它（当轮 shell 循环 cwd 出错，`DONE` 是空跑，且 `npx playwright test`
绕过了 `test:e2e` 的前置脚本链）。本步按「红的理由判例」把判据**改锚新家**而非删除，并顺带
补一条唯一性锁：`import(...GraphPanel)` 全 src 恰一处（第二处即把 g6 chunk 拉回主包）。
不重写历史，前进式修正并如实登记。

**红证**（新）：

| # | 变异 | 期望红 | 实测 |
|---|---|---|---|
| M8 | 宿主注册表撤掉某具名面的 `label` | `resolveWorkbenchViews` 抛 | 单测「缺 label 即整条派生显式失败」红 |
| M9 | 两枚 blueprint 同时 `preferred` | 注册表拒载 | 单测「两枚 preferred 即拒载」红 |
| M10 | 懒载点改名（`GraphPanelX`） | graph-theme 门 | 红：「G6 未按关系图谱工作面懒加载」 |
| M11 | App 重新写入页签标题字面量 | VIEW-ABI 页签词表锁 | 见下方步骤记录（随本步跑） |

**卸载态首枚可验事实**：`workbench-views.test.ts` 以 `buildPackageRegistries([])` 直接构造
零垂类准入态，断言页签条只余通用面且四枚垂类标题一个不漏地缺席。这是 ③「卸载态成品」的
第一枚机器判据；整面评审与全链走通仍待后续步骤。

高水位：2451 → **2449**。

### 步骤 ④ · matter ↔ 垂类包绑定契约落 schema

ADR-015 决定三「matter 绑定零或一垂类包，全局 registry 只决定可用集」此前**在代码里没有落点**：
全仓零 `containerPackBinding` / `packBinding` 一类符号，`createDesktopPackageRuntime` 里
`[LEGAL_PACKAGE, PM_PACKAGE]` 是编译期常量数组，`buildPackageRegistries([])` 也无人调用过。

本步只落**契约**，不落加载 UX（后者属 `PACK-INTERACT-1`，票面禁区）：

- `PersistedCase.packBinding?: readonly string[]` 入版本化单键持久面（`courtwork.case-list.v1`，
  schema version 不升——追加可选字段，旧档续可读）。**三态显式**：字段缺席＝未声明；`[]`＝显式
  不加载任何垂类（ADR-015 成品律的默认形态，本票卸载态证据由它构造）；`['<id>']`＝显式绑定一枚。
- **长度 > 1 与空串成员判整库不可读**：多包激活是 ADR-014 明确拒绝项，静默取第一枚就是把
  拒绝项实现成默认行为。
- `resolveMatterPackBinding(packBinding, available)`：未声明取全局可用集，已声明逐字取。
  **「未声明取全部」不是「默认加载全部」的产品裁定**，只是本字段落地前既有 matter 的诚实读法；
  新建 matter 是否默认零绑定，随 `PACK-INTERACT-1` 的加载 UX 一并拍板——本票不代拍。
- `DesktopPackageRuntime.registriesFor(packageIds)`：按绑定现算 registry（同绑定复用同一枚）。
  绑定到本制品没有的包一律 **throw**，不静默忽略——静默降级成「加载了别的」正是 ADR-015
  决定四禁止的伪装。

**边界如实登记**：本步**未把 `registriesFor` 接进 App**，故运行期行为零变化（全局
`packageRegistries` 仍是唯一消费者）。接线属「卸载态成品」那一步，与起手引导、空态、
已有垂类产物的 preview 退化同批——见下方「未完成项」。

红证与判据全部住 `src/composition/matter-pack-binding.test.ts`（8 例）：三态可表达、
长度 > 1 拒读、空串/非数组拒读、投影拷贝不共享引用、三态解析、逐 matter registry 的
「只见 legal」「零绑定零 artifact」「绑定全部 ≡ 全局可用集」「未准入包拒载」。

---

## 四 · matter 中立命名清点表（票面 ④ 前半）

口径两枚，均为本会话现读（`/usr/bin/grep`，扫描面 `apps/desktop/src/**`，剔除
`*.test.*`、`src/demo/**` 与 14 枚已知垂类绑定文件）：

- **含词文件数（含注释）＝ 59**；
- **含词文件数（只算真实字符串字面量与 JSX 文本）＝ 34**。

两数之差是注释与 dev-only 审计元数据。下表按**处置**分族，不逐条罗列（逐条清单可由上述
命令现读复现；把 490 条命中抄进文档只会立刻腐坏）。

| 族 | 判据 | 规模 | 处置 |
|---|---|---|---|
| **A · 垂类专属产品文案住通用件** | 文案只在合同审查垂类成立（「合同审查」「风险」「主合同」「修订预览」「答辩状」…） | 主体在 `App.tsx`、`workbench/Panels.tsx`、`work/*-copy.ts`、`rail/CaseRail.tsx`、`modules/ModuleStack.tsx` | **随所属工作面/场景迁往垂类绑定面**。本票已迁走页签标题四枚；其余绑在 `revision` 面与 scene-strip 上，随后续步骤走 |
| **B · 容器词表已有着色机制** | `case/container-copy.ts` 已是「案件说卷宗／工作区说资料」的唯一分叉点，`material-count.ts` 全部经它 | 7 枚导出函数 | **机制成立，保留**。核实结论：`案件`↔`卷宗` 确为 `ContainerKind` 上的词表着色，不是通用件硬写 |
| **C · 标识符编码 legal 词** | `caseId` / `caseRoot` / `CaseSummary` / `ContainerKind='case'` 等 39 个具名符号，全仓约 490 处 | 34 文件 | **登记为债，本票不动**。`caseId` 是 wire／journal／持久键（`courtwork.case-list.v1`、work-state 宿主）的字段名，改名触票面禁区「不动 wire/journal」。中立名应为 `matter`；改名须独立立票并携迁移方案 |
| **D · demo 展品文案住通用件** | 只在样板案回放成立（「整理卷宗」「审查合同」按钮、样板案导览、页签计数） | scene-strip 与 chat 卡片 | **随 demo 族外提**。本票已迁走页签计数与 artifact 卡文案两件；scene-strip 属场景声明面，随该面处置 |

**核实结论（票面点名项）**：「案件」确为词表着色而非通用件硬写——`rail/types.ts` 的
`railKindLabel(kind)` 与 `case/container-copy.ts` 全族都以 `ContainerKind` 为轴取词，
通用工作区一律取「资料」。但**着色轴的成员名 `'case'` 本身是 legal 词**（中立名是 `matter`），
这一枚属 C 族债，随 wire 改名票处置。

---

## 五 · 未完成项与停手点（如实登记）

**权威变更登记**：本会话开工后，架构角色在同一工作树上落了三枚 docs 提交（`74405f7`、
`44caee5`、`09ad895`），其中 `44caee5` 修订了 ADR-015（三笔补记，含上表 ①附 那条新义务）。
本票的权威因此在施工中前进了一版；已按新版补登义务，未按旧版继续。**同时如实登记流程偏差**：
那三枚提交落在了本票分支 `claude/generic-pack-1` 上（它们是 main 面的 docs，与本票无关），
属「落痕先核 HEAD 判例」的共享树情形——本会话不代为改写他人提交，只报回。

本票六条验收边界，本会话交付到以下位置：

| # | 边界 | 状态 |
|---|---|---|
| ① | 零泄漏静态门在册且红绿证 | **未达**：运行时半边已立（工作面集派生 + 卸载态单测 + 页签词表双向锁），**静态 import 门未立**——见下方停手点 |
| ② | 余三 panel 迁 `kind:'component'`、App if 链清零 | **2/3**：timeline ✓ graph ✓；**revision 未迁**——见下方停手点 |
| ③ | 卸载态成品 + 整面评审 | **部分**：卸载态页签条已可机器判定；matter 创建→work→产物→回看全链、起手引导、已有垂类产物的 preview 退化与截图链**未做** |
| ①附 | 零泄漏含 prompt 空间 | **未做**：ADR-015 于 2026-08-05 补记（本会话开工后落痕，`44caee5`）新增一条本票义务——「`GENERIC-PACK-1` 只须证未加载态 prompt 零垂类语义」。本会话未及施工，随①一并结转 |
| ④ | 中立命名清点表 + 绑定契约落 schema | **达成**：清点表见上节；绑定契约与逐 matter registry 派生已落地并带 8 例判据 |
| ⑤ | 加载态 Legal 全链零回归 | **保持**：每步全量门自跑，Playwright 逐步 365/365，pi-lane TS 零改动 |
| ⑥ | SPEC 回执 | **本文件**，随步骤滚动 |

### 停手点（`[需架构拍板]`，按票面「不硬闯不悬置」停手报回）

**停手点一 · revision 面迁移的落点，等价于「Legal S3 编排住哪里」。**
矩阵/时间线/图谱三枚都是纯呈现件，payload 之外只要一枚领域无关的会话派生量。`revision`
不同：它的交互编排（`riskList` / `gate` / `submission` / 选中项 / 逐条处置 / 只读判定）
**住在 `App.tsx` 里**，且其中三项另有**渲染链之外**的消费者——`workRun` 的
`resetReview`/`clearGate`、样板案进度计数、production 产物显示名。故迁 blueprint 不是
搬一段 JSX，而是要先裁定：这套编排迁到哪个受信面，以及壳里那三处通用 chrome（进度模块、
产出卡、`workPhase`）改从哪里取数。在此之前，`App.tsx` 必然保留 `RiskList` 类型持有，
①的静态 import 门也就无法把壳纳入受检面——两件是同一个结的两头。

**停手点二 · scene-strip（场景声明面）的派生形态。**
卸载态成品要求「起手引导与空态完整」，而现行起手面是硬编码的四枚 Legal 按钮
（整理卷宗／审查合同／卷宗整理／起草答辩状）。就绪图第 160 条把该面的形态追认为正解，
并写明**预检表单是「唯一新增契约点，随 `GENERIC-PACK-1` 拍板」**——即它需要一次架构拍板
才能开工，实现会话不代拍。改成 scenario registry 派生同时会触及场景线语义（票面禁区）。

**停手点三 · 新建 matter 的默认绑定。**
ADR-015 决定三写「默认不激活」，而加载动作属 `PACK-INTERACT-1`。若本票把新建 matter 的
默认改成零绑定，Legal 全链在没有加载 UX 的情况下不可达，直接违反边界 ⑤。本票据此只落契约、
不改默认，并把默认态的翻转显式让给 `PACK-INTERACT-1`——若架构认为默认应当本票就翻，
须同批给出 Legal 全链在无加载 UX 时的可达路径。
