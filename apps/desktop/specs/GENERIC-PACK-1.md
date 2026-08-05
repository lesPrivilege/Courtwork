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
