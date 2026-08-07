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

本票新增**四个**概念：第二枚随 2026-08-06 停手三裁开工时加入；第三、四枚为裁定二
「宿主有限元素集通用渲染」的机器形态（场景条与预检表单不再由壳或垂类写死 JSX）。

### 冻结 launch 声明（第三枚，裁定二开工时加入）

`PackageScenario.launch`（label/tone/kind + description/submitLabel/footnote/recover +
formFields 有限元素集 select|text）随包 descriptor 声明、registry 准入校验并**深冻结**，
宿主只读。场景条按钮与预检表单从此是**数据**不是 JSX——垂类文案随声明入包（A 族该面
清零），壳与宿主零场景按钮字面量。

**为何非加不可**：裁定二把「场景按钮与预检表单由包 descriptor 声明、registry 冻结、
宿主有限元素集通用渲染」冻结为契约——没有这一枚声明，卸载态（零包）与加载态（有包）
就只能靠壳内 if 链与 JSX 写死，零泄漏静态门与卸载态成品律都无从成立。元素集闭集
（select|text）、来源闭集（ready-materials）与准入拒重复 form field id 使「宿主有限
元素集」是机器可验的，不是口头承诺。

### 宿主通用渲染件两枚（第四枚，裁定二施工时加入）

`workbench/scenario-precheck-form.tsx`（预检表单：字段/文案/恢复入口/提交态全部来自
冻结声明，提交值收成 `ScenarioStartParams` 进场景启动参数）与 `workbench/scene-strip.tsx`
（场景条：条目派生 `resolveSceneStripEntries` + 有限元素集渲染 + 卸载态起手引导）。

**为何非加不可**：裁定二点名「宿主有限元素集通用渲染」——渲染件必须住在宿主（受检面），
垂类包只声明数据。壳不再持有场景按钮字面量、表单字段字面量与启动参数拼装（高水位净减
即外提生效的证据）。

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
| `src/verticals/legal/TimelineRenderer.tsx` | `courtwork.timeline.v1` 宿主 renderer：先整面 `safeParse`，漂移即 fail closed | 步骤 ① timeline |
| `src/demo/demo-artifact-card.ts` | 样板案 chat 侧 artifact 卡的取数与文案（`demoArtifactCardCopy`）；只属显式 demo 回放 | 步骤 ① timeline |
| `src/verticals/legal/GraphRenderer.tsx` | `courtwork.party-graph.v1` 宿主 renderer；g6 懒载点随渲染件迁入 | 步骤 ② graph |
| `src/preview/workbench-views.ts` | 可见工作面集、默认落点与标题查询（`resolveWorkbenchViews` / `preferredWorkbenchView` / `workbenchViewLabel`） | 步骤 ③ 工作面集 |
| `src/demo/demo-view-counts.ts` | 样板案页签计数四枚（硬编码展品，非 demo 案不显示） | 步骤 ③ 工作面集 |
| `src/composition/package-runtime.ts`（既有件扩形） | 逐 matter registry 派生 `registriesFor` 与 `resolveMatterPackBinding` | 步骤 ④ 绑定契约 |
| `src/preview/vertical-work-surface.ts` | 垂类工作面驱动的**通用契约**（宿主输入面／读出面／适用性声明），零垂类类型 | 步骤 ⑤ revision |
| `src/work/legal-work-surface.tsx` | Legal 合同审查工作面驱动：S3 审阅编排的新居所（取数／门禁／处置／提交／生命周期） | 步骤 ⑤ revision |
| `src/verticals/legal/RiskReviewRenderer.tsx` | `courtwork.risk-review.v1` 宿主 renderer：起跑面与审阅面 JSX | 步骤 ⑤ revision |

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

## 五 · 交付进度（截至步骤 ⑥）

**权威变更登记**：本会话开工后架构角色在同一工作树落了 `74405f7`/`44caee5`/`09ad895` 三枚
main 面 docs 提交（共享树情形，已按 patch-id 等同回 main，新 SHA `2b3ea47`/`2c9f1ca`/`19aa188`）。
其中 `44caee5` 修订 ADR-015 新增本票义务「只须证未加载态 prompt 零垂类语义」；
`d6b224b` 落三枚停手点的架构裁定，本票据其执行。

| # | 边界 | 状态 |
|---|---|---|
| ① | 零泄漏静态门在册且红绿证 | **达成**（步骤 ⑥）：立门以族、三红证；四个未拆分混合族作为债在门内逐条登记偿还去向 |
| ② | 余三 panel 迁 `kind:'component'`、App if 链清零 | **达成**（步骤 ①②⑤）：四枚具名工作面全部版本化，App 零 `RiskList` 持有、零垂类 import |
| ③ | 卸载态成品 + 整面评审 | **达成**（步骤 ⑦⑧＋③谱）：起手引导、全链（matter 创建→work→产物→回看）与截图链齐备，评审对象是成品不是开关；preview 退化按 ADR-015 决定四显式实现（见⑦⑧完成节） |
| ①附 | 零泄漏含 prompt 空间 | **达成**（随③同构造路径）：案语境段中性化＋十枚垂类场景词零命中断言；豁免词清单（容器着色）见 `src/work/work-context.test.ts` ①附 describe 断言注释（e2e ③链断言互指同处，加词判据已写入） |
| ④ | 中立命名清点表 + 绑定契约落 schema | **达成**（步骤 ④＋第四节）：场景条四钮文案随 launch 声明迁包（A 族该面清零）；其余 A 族债登记见下方债表现状 |
| ⑤ | 加载态 Legal 全链零回归 | **保持**：每步全量门自跑；零视觉回归另有**逐字节帧比对**机器证据（见⑦完成节） |
| ⑥ | SPEC 回执 | **本文件**（收尾见「回执收尾」节） |

### 步骤 ⑦ · scene-strip 改 registry 派生（裁定二）

裁定二原文：**scene-strip 改 registry 派生，预检表单契约冻结为「descriptor 声明、registry 冻结、
宿主有限元素集通用渲染」（ADR-016 填格协议同族），提交值进场景启动参数，加载态四钮零视觉回归
为证，未加载态起手引导为通用开场（matter 规范文件提示＋Draft 入口）零垂类兜底。**

落地四件（各一提交，TDD 先红）：

1. **launch 契约落 schema 并冻结**（`packages/registry`）：`PackageScenario.launch`（label/tone/
   kind + description/submitLabel/footnote/recover + formFields 有限元素集 select|text）——
   准入拒重复 form field id；`buildPackageRegistries` 深冻结快照（宿主只读）。legal 四枚声明：
   S1 整理卷宗（primary/scenario）、S3 审查合同（primary/scenario + 预检表单逐字迁自退役的
   壳内 S3LauncherPanel）、S4 起草答辩状（draft-wide/**view**——起草画布视图入口非场景启动）、
   S6 卷宗整理（wide/scenario）。descriptor hash 重铸（仅呈现绑定，prompt blob 不漂、schemaVersion
   不升），schema-exemplar 门未触及。
2. **预检表单通用化**：S3LauncherPanel 退役，代之以宿主通用件 `workbench/scenario-precheck-form.tsx`
   （标题/说明/字段/恢复入口/提交文案全部来自冻结声明；选项经声明 source/mediaType→精确 MIME
   映射解析），提交值收成 `ScenarioStartParams`（`Record<fieldId,string>`）进场景启动参数——
   `useWorkRunLifecycle.start(params)` 不再读壳内 workSubject/primaryContractId 双状态（App 四行
   状态与 setter 退役）。e2e 55 处 testid 按本意重写（s3-* → precheck-*）；work-live 门判据按
   「红的理由」判例改锚新家（`selectPrimaryContractCandidates` → `MEDIA_TYPE_BY_DECLARATION` +
   `DOCX_MEDIA_TYPE`）。CSS 类随通用化改名（s3-launcher→precheck-form 等，规则零改）。
3. **场景条 registry 派生**：`workbench/scene-strip.tsx`（`resolveSceneStripEntries` 纯派生 +
   通用 SceneStrip 件）——demo 按 fixture 可启动集（demo fixture 声明 legal.S1/S3→flow、
   S6→file-ops），production 按工作面驱动声明的闭集（`['legal.S3']`），view 条目恒在；
   呈现次序＝scenario 按注册表序在前、view 在后（壳的呈现规则，非契约——现有四钮序由此
   复现）。production 启动路由＝场景 blueprint 目标视图（registry 派生；S3→修订预览、S4→
   起草画布）。⌘K 场景入口与条同源派生。内联 JSX 与 sceneMore 双状态外提（高水位净减）。
4. **卸载态起手引导**：零条目时条内即通用开场——matter 规范文件提示（《场景规范.md》，
   ADR-015 决定二补记的一等输入）＋Draft 入口（起草画布），零垂类兜底。

**零视觉回归机器证据**（`release/evidence/generic-pack-1-baseline-2026-08-06/README.md`）：
同一 PW 构造路径、变更前后各摄一帧，`cmp` 逐字节比对——demo 四钮场景条与 grant 预检表单
**PIXEL-IDENTICAL**；demo 整面帧因回放动态态有差异（非按钮面）。

**红证清单（⑦）**：schema 拒 launch / 快照未冻结 / 重复 form field id 放行三枚 registry 单测红；
表单四枚单测（组件缺位）红；条派生/渲染七枚单测红；卸载态谱（起手引导）红；e2e 新旧 testid
迁移红。全部撤修复复绿。

### 步骤 ⑧ · 卸载态成品（裁定二后半＋裁定三）

落地三件（各一提交）：

1. **逐 matter 生效 registry 接线＋过渡默认**（⑧ 半边）：`matterRegistries` 按绑定现算
   （绑定零即零垂类；未声明取全局可用集；welcome 态落全局）——全部既有 registry 消费点切到
   生效集；生效视图集变化时活动视图落回在册默认；水合携 packBinding（drop 即把显式零绑定误读
   成未声明取全部）。过渡默认（决定三补记，`PACK-INTERACT-1` 销条）：新建 matter 写
   `packBinding: ['legal']`，由受信组合根注入（组合根持包身份，壳零垂类引用）。
2. **卸载态显式退化**（ADR-015 决定四）：已有垂类产物 matter 在包未加载时——产物存在是宿主
   资产不随包走，结构化视图不可用则诚实呈现「该产出由 X 包生成 · 加载 X 包以获得结构化视图」
   （`preview/vertical-artifact-unloaded.tsx`，零伪装通用产物）；判定＝全局可用集有该 artifact
   而生效 registry 无。卸载态起草面默认落**通用工作稿轨**（pi 线，成品律：Draft 类工作面为
   主工作面），垂类色起草画布只属加载态 S4 入口的呈现面。
3. **③ 卸载态成品全链**（`tests/e2e/generic-pack-1.spec.ts`）：测试构造点的未绑定 matter
   （持久面显式零绑定＋grant 文件夹）走 matter 创建→Work 面 Chat（prompt 零垂类联断言，
   44caee5 同构造路径）→ Draft 面 pi 线产物（提案→允许→已写入→索引）→ 只读回看（hash 相符、
   零编辑入口）；五帧截图链入 `release/evidence/generic-pack-1-unloaded-2026-08-06/`。评审与
   断言均经测试构造点取证，不入产品 UX（过渡默认绑 Legal 不翻）。

**债表现状（⑥ 门）**：work / output / system 三个混合族仍为债（偿还去向见门表）；
workbench 债已清偿（绑定族 verticals 内 4→6 处）。本票登记三笔新增债：
①⌘K palette 场景入口已与条同源（无债）；②`DraftPanel`（垂类色起草画布）仍住 workbench/
   通用族——其文案属 A 族债，随 S4 入口语义处置（卸载态已不落该面）；③`caseId` 等 C 族标识符
   债随 wire 改名票（既有登记）。

**偏离与决策登记（⑦⑧）**：

- 场景条呈现次序（scenario 先、view 后）是壳的呈现规则，非包契约——包不声明次序；
- view 条目（S4 起草答辩状）恒在且路由到 blueprint 目标视图——它不是场景启动，是起草画布
  视图入口（语义与旧按钮一致）；
- demo 路由由 demo fixture 声明（`scenarioLaunch`：legal.S1/S3→flow、S6→file-ops）——demo
  族持有垂类 id 映射，壳零垂类知识；
- 预检表单的 recover 块随 `launch.recover` 声明（label/note），可见性由工作面驱动的可恢复态
  决定（renderer 组装）——不是表单字段；
- ①附 断言范围＝**场景语义**（垂类场景/提示词内容：合同审查/风险/当事人/…十枚）零命中；
  容器着色（卷宗/案件——ADR-015 决定二点名的着色机制）不在断言范围（属既有设计，随 wire
  改名票处置）；
- 卸载态退化视图（垂类产物＋包未加载）在过渡期**结构性不可达**（无加载 UX，绑定不可变），
  单测覆盖＋接线留痕；e2e 不可构造（session artifact 需真实场景运行）——如实登记非豁免；
- 高水位五笔调整（2298→2292→2282→2293→2282）：⑧ 接线净增 22、裁定二外提净减、C6 两条
  显式诚实呈现分支净增 11、openWorkReview 退役净减 11——逐笔在门注释留痕；
- e2e testid 两批迁移（scene-work-review→scene-legal.S3 等 19 处、s3-*→precheck-* 55 处）
  属断言按本意重写（组件通用化后 testid 由声明/场景 id 派生）；
- `assert-graph-theme` 门锚点随 C3 迁移（GraphPanel 新家 + 懒载点相对锚）——红的理由判例；
- 卸载态起手引导文案取工作区中性词（容器着色随 wire 债处置，不引入第二套着色机制）。

### 回执收尾（2026-08-06，八相全量门自跑）

分支 `claude/generic-pack-1` tip 全量门实测（含本回执提交）：

| 相 | 结果 |
|---|---|
| build | `pnpm -r build` 绿 |
| lint | 绿（eslint 零告警） |
| root test | **1941/1941** |
| desktop test | **755/755** |
| cargo | **250 过 / 1 忽略** |
| Playwright | **368/368**（floor 365 起；`test:e2e` 前置链三十余枚静态门全部通过，独占端口单链） |
| site:guard | PASS（release-truth + deslop，radius 白名单随 precheck-form 迁移） |
| sidecar | **547,893 B / `951acf8e…` 零迁自证**（pi-lane TS 本票零改动） |

**受检数取数提交登记（返修订正）**：零泄漏门受检数取自现 tip `deb81b8` 现读（`node
scripts/assert-vertical-isolation.mjs` 实测 **174** 份）。逐提交演变：`cacdf14`（⑥债偿还，
workbench 族删债入受检面）160→168 → `aacb389`（预检表单通用件两文件）168→170 →
`a9444d4`（场景条两文件）170→172 → `f5816ae`（退化视图两文件）172→174——此后四枚
docs/fix 提交（`f98b49a`/`8fb3683`/`f2e1de4`/`deb81b8`）未增删 src 文件，174 稳定。
回执原写 170 系拆分后未重数的旧取数（验收实测 174 相符，按「数字取自哪个 tip」纪律订正）。
**六条验收边界全绿**：①零泄漏门在册红绿证（受检 **174**、债 3 余）；②四 panel 全迁 mutation
复红（历史红证在册）；③卸载态成品全链（截图链五帧 + 起手引导 + 退化）；④中立命名清点表
＋绑定契约（④节）；⑤加载态八相全量门零回归（上表）；⑥撤判据复红（逐步 TDD 红→绿，
红证清单见⑦节与各提交）。

**报交验点**：六边界达成即停；不自我验收——报 Codex 独立会话验收（clean worktree、
独立端口、漂移/守卫实际注入反例观察变红）。

### 步骤 ⑤ · `legal.RiskList` 迁 `kind:'component'`（余三收官，裁定一）

裁定一原文：**同迁 `kind:'component'`；三处渲染外消费者改经 work projection/command port 消费、
受信组合根装配（循 S6 装配点先例），App 零 `RiskList` 持有。只改居所与取用路径，语义零改——
场景链 e2e 全绿即语义不变证。**

#### 新增概念第二枚 · 垂类工作面驱动 `VerticalWorkSurface`

住 `src/preview/vertical-work-surface.ts`（契约，零垂类类型）＋
`src/work/legal-work-surface.tsx`（Legal 实现）。

**为何非加不可**：`revision` 与前三枚不同——它的编排（风险清单取数、两条门禁投影、逐条处置与
修正、提交与交付、run/cancel/recover 生命周期）住 `App.tsx`，且有三处渲染链外消费者。要让 App
零垂类类型持有，这套编排必须整体离开壳；而 blueprint renderer 的入参恒为 `{descriptor, payload}`，
装不下它。本接口就是那条缺失的装配缝。

边界四条：①**由受信组合根注入**——`main.tsx` 的 `createLegalWorkSurface({ workCommand })`；
`LegalS3WorkCommand` 自此不再是 App 的 prop（`AppProps` 少一员，壳零垂类端口）。②宿主输入面
逐字领域无关，垂类端口不走此面。③驱动值对壳**不透明**（`value: unknown`），只在垂类自己的
Provider 里重新识型，且带 fail-closed 校验——递错东西即抛，不静默渲染成「没有驱动」。
④工作面**适用性**由驱动声明（`applicability`），壳只负责照声明显式说出来——原
`view !== 'revision' && view !== 'artifact'` 这条**垂类知识写死在壳里**的分支由此退役。

#### blueprint 扩形一处：`handlesEmpty`

`revision` 面在产出到来前那一格是场景起跑面（选主合同、填标的、恢复上次），不是「尚未生成」。
故 component blueprint 可声明 `handlesEmpty`，产出缺席时仍进 renderer 并收到 `payload: undefined`；
矩阵/时间线/图谱三枚不声明，照旧落宿主空态。**拒载语义一字未动**：多 artifact 争夺同一具名面
仍整面 fail closed，payload 漂移仍由 `safeParse` 整面拒绝——本旗只解「空态归谁画」。

#### 三处渲染外消费者的新取用路径（裁定一点名）

| 消费者 | 旧路径 | 新路径 |
|---|---|---|
| 样板案进度计数 | `submission.review.decisionCount` | `verticalSurface.decisionCount` |
| production 产物显示名 | `submission.outputDisplayName` | `verticalSurface.outputDisplayName` |
| `resetReview` / `clearGate` | App 传给 `useWorkRunLifecycle` 的两条回调 | 驱动内部自持（生命周期与提交编排同住一处）；切案/切场景的面态重置改经 `resetForContextSwitch` 一枚通用回调 |

随之改路的另两枚：场景条「停止审查」→ `verticalSurface.cancelRun`；work 语境段的
「有可继续的进度」→ `verticalSurface.hasRecoverableRun`。

#### 门跟着码走（红的理由判据）

`assert-work-live-contracts` 的四条判据钉在 `App.tsx` 上，编排迁走后全红。按判例**改锚新家、
一条不减**：三条改扫 `work/legal-work-surface.tsx`（`useWorkRunLifecycle` / `useContractReviewSubmission`
的 `workCommand: deps.workCommand` 接线、`projectRiskListGate(riskList)`），一条改扫
`preview/RiskReviewRenderer.tsx`（`selectPrimaryContractCandidates`）。**同批新增两条**（收紧，不是等价搬家）：
受信组合根必须把生产 `workCommand` 注入驱动；App 不得自行构造驱动。

VIEW-ABI：`revision` 由 `PENDING_NAMED_VIEWS` 移入 `MIGRATED_NAMED_VIEWS`（前者只余通用 `draft`），
直连回流锁加 `RevisionPanel` / `S3LauncherPanel` 两枚；页签词表锁的「revision 尚未迁移」豁免说明
同批删除——四枚垂类页签标题现已全数不在 App。

#### 语义零改的证据

- **场景链 e2e 全绿 365/365**（裁定一指定的判据），含 `work-live.spec` 的 grant 全链
  （真实材料 → 门禁审阅 → docx 落盘）、「未适用」两例、审阅面板内切 tab 不关工作面、
  `work-budget`、`output-confirm`、`contract-trace` 等。
- 逐字搬运：起跑面三段空态、审阅面 read_only/interactive 判别、`reviewCommon` 构造、
  `NOT_APPLICABLE` 文案与 `risk-03` 初值全部原样。
- **一处等价改写如实登记**：demo 门禁投影 effect 的判据由 `isDemoCaseId(selectedCaseId)` 改为
  驱动侧的 `host.isDemoCase`（`isDemo || isDemoCaseId(id)`）。对样板案两者同值；改写理由是驱动
  只见通用宿主面，不重新引入 `isDemoCaseId` 这条壳内 id 判据。

#### 红证四枚

| # | 变异 | 实测 |
|---|---|---|
| M12 | `revision` blueprint 降回 `route` | VIEW-ABI 红：`revision workbench view fell back to a route blueprint` |
| M13 | 撤 `handlesEmpty` | 单测红：产出缺席时不再进 renderer |
| M14 | Provider 撤 fail-closed 校验 | 单测红：外来驱动值被静默接受（阴性对照——本驱动自有形状仍可挂载，证明校验不是空门） |
| M15 | 组合根改为不以 `{ workCommand }` 简写注入 | work-live 门红：`受信组合根必须把生产 workCommand 注入垂类工作面驱动` |

高水位：2449 → **2276**（本票累计 2475 → 2276，−199）。

### 步骤 ⑥ · 零泄漏静态门（票面 ①，立门以族）

门住 `scripts/assert-vertical-isolation.mjs`，接入 `test:e2e` 前置链（`lint:vertical-isolation`）。

**门的形状**——不维护「哪几个文件可以 import 垂类」的白名单（那种表每加一行就多一个藏身处，
承 PI-HOST-LOOP 1R4 的终局判据），只认**目录族**：

```
受检面 ＝ src/** 全树 − 三个绑定族 − 四个未拆分混合族（债）
绑定族 ＝ verticals/（垂类绑定面）、composition/（受信组合根）、demo/（样板案回放）
```

族由目录本身声明性质，成员随时增减而门不改一行。配套两条**反向锁**：①`src/verticals/` 内
必须真有垂类绑定，否则族是空壳、受检面看似很大实则一切都在族外；②宿主注册表必须仍从
`../verticals/legal/` 取 renderer——注册点自身在受检面内，故它只能引用组件符号，
这就是「只经受信组合根注册点」的机器形态。

**随门发生的两处按族归位**（都是归位不是豁免）：

- 四枚垂类 renderer（`ReviewMatrix` / `Timeline` / `Graph` / `RiskReview` 及其测试）由
  `src/preview/` 迁入 `src/verticals/legal/`——`preview/` 自此整族入受检面，通用 preview 宿主
  （`PreviewHost` / `ArtifactHostView` / 原语 / projection）全部受锁。
- `session-event.contract.test.ts` 由 `protocol/` 迁入 `demo/`：它以 Legal bindings 逐事件校验
  **样板案录像**，本就是 demo 族的一致性谱。

**未拆分混合族（债，如实登记非豁免）**：`work/`、`output/`、`system/`、`workbench/` 四个目录
各自混着通用件与 Legal 绑定件，本票未及拆分，整族暂不入受检面。门内逐条写明偿还去向
（迁哪些件去 `verticals/legal/`），**迁完即删行、目录自动入受检面**；空表即债清零。
`workbench/Panels.tsx` 是其中最大一块——它的通用原语（`TierBadge`/`SignatureLine`/
`StaticViewport`/`EmptyState`/`DraftPanel`）与四枚 Legal 面同住一文件，须拆分才能归位。

**红证三枚**：M16 壳内注入 `@courtwork/legal` 类型 import → 红指名 `App.tsx`；
M17 通用 preview 件（`ArtifactHostView`）注入 → 红指名该文件；M18 把 `verticals/legal/`
四枚 renderer 的垂类 import 全改掉（掏空绑定族）→ 反向锁红「绑定族是空壳」。

现读数字：受检 **160** 份源码零垂类 import；三绑定族 **78** 份在族外，其中 `verticals/` 内
实有 **4** 处垂类绑定。
