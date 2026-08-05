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
