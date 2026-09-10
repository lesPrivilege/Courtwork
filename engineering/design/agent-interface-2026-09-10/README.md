# Agent Interface / UI Continuity · 召回与治理索引

## 0. 本页解决的唯一问题

> 一个短上下文的施工 / 设计 agent 只动 Courtwork 的一块局部界面时，如何找到**最近的有效先例**、判断该先例的**权威等级与适用范围**、只改**声明过的那一维**，并在任务实际需要新裁定时**停下来报告**，而不是安静地即兴发挥。

期望链条：

```text
current task
    → resolve authority / owner fact
    → locate nearest local canonical precedent
    → load only the minimum relevant grammar + specimen + evidence
    → declare intended delta and held-constant dimensions
    → implement later under a work order
    → compare against precedent + mechanical checks
    → record a misfit instead of silently diverging
```

## 0.1 非目的

本页**不是**新的 design system、runtime、agent 配置格式或第二个产品事实源。它只是**召回 / 导航文档**：可以指向权威，不得成为权威。

本轮不新增：`AGENT-RULES.md`、`.agent-rules`、`llms.txt` / `llms-full.txt`、重复的 `CLAUDE.md` 规则、package-coupled `agent-rules.md`、MCP context loader、自动 context 编译器、YAML component authority、全局 raw-literal lint、组件库、依赖、产品代码、后端字段。若将来要做机器可加载的设计规则，那是另一个独立的架构 PR。

仓库级 always-on 的 agent 指令权威仍然只有 [AGENTS.md](../../../AGENTS.md) 一处。

原始索引与来源：[control-grammar-supplement-2026-09-10](../../mvp/execution/work-surface-kit/inputs/control-grammar-supplement-2026-09-10.md)、[sources.md S21–S22](../sources.md#s21--agent-facing-design-system-distribution)、裁定 [intake-round-3 §4ax / WK-162](../../mvp/execution/work-surface-kit/intake-round-3.md)。

同目录另有：[precedent-map.md](precedent-map.md)（按问题寻址的薄导航表）、[continuity-checklist.md](continuity-checklist.md)（任务级 continuity header、漂移检查与 dry run）。

## 1. 三条独立的权威轴（不是一条文档层级）

Courtwork 的权威不是线性目录深度，而是三种不同性质的权威。**跨轴不能互相覆盖。**

```text
A. Scope authority ── 我这次被允许改什么
   AGENTS.md
   engineering/current.md
   当前任务 / handoff / work order

B. Fact authority ── 产品事实是什么
   domain / Core / runtime owner contract
   已裁的 schema 与状态词表
   契约允许范围内的实际实现

C. Design precedent ── 该长什么样、怎么动
   已裁的本地 grammar
   canonical 本地实现
   canonical specimen / 对照面
   exact-SHA evidence
   外部先例
```

四条硬规则：

1. design reference 永远不能推翻 domain fact。
2. 历史实现永远不能推翻 [engineering/current.md](../../current.md)。
3. work order 可以授权一次有界改动，但不能凭空发明后端事实。
4. 外部组件库可以示范 anatomy / behavior，不能因为"它正好有这个组件"就成为架构。

轴 A 的入口：[AGENTS.md](../../../AGENTS.md)、[engineering/current.md](../../current.md)、[work-orders/](../../mvp/execution/work-surface-kit/work-orders)。
轴 B 的入口：[docs/work-core/](../../../docs/work-core)、[contracts/](../../mvp/execution/work-surface-kit/contracts)、[docs/interface-components.md](../../../docs/interface-components.md)。
轴 C 的入口：[Atlas](../atlas/README.md)、各 grammar、[Design Scout](../scout/README.md)、[evidence/](../../../evidence)。

## 2. 四种治理状态（只有四种）

本索引引用的每一条**非权威**先例都必须且只能带一个状态：

| 状态 | 含义 | agent 可以做什么 |
|---|---|---|
| `canonical` | 已接受的本地 Courtwork 规则 / 先例，且当前仍适用 | 在其声明范围内直接实施 |
| `reference` | 已核验、对行为或解剖有用，但不具约束力的先例 | 对照、借原则；**不得**据此推断本地权威 |
| `unverified` | 线索存在，但其主张未经独立核验 | 只能当检索线索 |
| `deferred` | 已知但被阻塞、被有意推后、或需要新的 owner 裁定 | 不实施，也不作为"已有能力"对外呈现 |

不新设第五个含糊的 `candidate` 状态。提案表达为：

```text
status: deferred
reason: pending user selection
```

或

```text
status: reference
disposition: candidate for a future specimen
```

**Supersession 不是第五个状态。** 需要时用字段表达：

```text
superseded_by: <path / decision / SHA>
```

这一点重要，因为一份文档可以在它的**历史 SHA** 上是 canonical，而不再是**当前**先例。

## 3. 渐进召回协议

**不要**用"通读整棵 Design 树"开始一个 UI 任务。

第一步只读：

```text
AGENTS.md
engineering/current.md
有界的任务 / handoff
```

第二步先把任务解析成坐标，而不是先找图：

```text
surface
semantic object
operation
state
viewport / density
changed dimension
```

第三步才按需检索，命中即停：

```text
owner fact
→ semantic / state contract
→ 相关 Interaction Grammar
→ 相关 Visual Grammar
→ nearest local precedent
→ 相关 specimen
→ 当前实现
→ 需要时才取 exact evidence / work order
```

以上问题答完就停止检索。**不要**为"保险"批量读无关 grammar、全部 specimen、全部外部调研或全部历史交付。目标是**可追溯的渐进披露**，不是 context 堆积。

## 4. Nearest canonical precedent 算法

"最近"不等于"看起来像"。按此顺序排序候选：

```text
1. 同 semantic + 同 surface + 同 interaction state
2. 同 semantic + 相邻 Courtwork surface
3. 同 primitive + 同 interaction state
4. 同一设计维度上已接受的本地 specimen
5. 同一 grammar role 的本地先例
6. 已核验的外部产品 / 设计系统参考
7. 未核验的外部线索
```

只有 1–5 可以在**没有新裁定**的前提下成为本地实施先例。6–7 是研究参考，不能直接落地。

`primitive` 的口径见 [primitive-canon.md](../../mvp/execution/work-surface-kit/contracts/primitive-canon.md)；`state` 的口径见 [ui-state-vocabulary.md](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)。

## 5. 多个本地先例冲突时

优先级：

```text
current-applicable
> 明确已接受
> 更新的已接受裁定
> 对所触 semantic / surface 更精确
```

**不得**用视觉品味裁决冲突。记录冲突（见下一节），必要时交回 owner。

## 6. Continuity gap：代码、文档、先例互相矛盾时

不要顺手"清理"。按 [continuity-checklist.md](continuity-checklist.md) 的 `CONTINUITY-GAP` 模板登记，判断是否在本 PR 范围内；不在范围内就**保持产品不变并报告**，同时按需登记进 [misfit-ledger.md](../../mvp/execution/work-surface-kit/misfit-ledger.md)。这条规则防止后来的 agent 把无关清理变成一次隐形改版。

## 7. 与 Scout / Atlas / grammar / specimen / evidence 的关系

| 层 | owner | 产出 | 本页的关系 |
|---|---|---|---|
| [Design Scout](../scout/README.md) | 发现层 | capture + disposition，不产生规则 | 本页不复制 capture；`next_if_missing` 会指向它 |
| [Atlas](../atlas/README.md) | 局部行为 / grammar 索引 | Material / Shape / Motion / Projection / Control / Iconography 段 | 本页只指路，不重述 grammar 正文 |
| grammar 文档 | 各自 owner | 规则正文与负规则 | precedent-map 的 `grammar entry` 指向它们 |
| specimen / ablation | 设计对照 | 一次一变量的真实内容对照面 | 作为 rank 4 先例 |
| [evidence/](../../../evidence) | 验证 | 交付与独立复核记录 | precedent-map 的 `verification entry` |
| [work-orders/](../../mvp/execution/work-surface-kit/work-orders) | 授权 | 有界施工范围 | 轴 A；实施仍走工单，不由本页授权 |

本页**不承载**：CSS 数值、组件 API 表、状态机、后端字段。它们留在各自的 owner 文档。

## 8. Raw-literal / role-token 政策（本轮只分类，不落 lint）

本 PR **不**实现全局 raw-literal lint。三类分开：

```text
A. 已有机械治理
   使用现有检查：tools/lint-colors.mjs、tools/lint-materials.mjs、
   tools/lint-interaction.mjs、tools/check-doc-links.mjs、tools/contrast-report.mjs

B. 语义上已治理但无机械检查
   对照既有 grammar 人工复核（如排版、密度、iconography、placement）

C. 未来机械化的候选
   status: deferred —— 更广的排版 / 时长 / 间距 / component-role lint
```

来自 [S22](../sources.md#s22--semantic-token-tooling) 的成熟实践只有一条可消费：**一旦语义 token 政策被接受，廉价的静态检查可以阻止漂移**。政策先于 lint。不得断言 Atlassian 的 ESLint / Stylelint 规则适用于 Courtwork 的原生 vanilla 栈。

## 9. "Do not hand-roll" 的本地口径

它**不**等于"库里有就 import 组件"。在 Courtwork 它意味着：

```text
在自造一个新的本地 UI 形态之前：
1. 确认真正的 semantic；
2. 查 Courtwork 是否已有 primitive / grammar；
3. 查最近的 canonical 本地实现；
4. 查同样的行为在本地别处是否已经存在；
5. 最后才查外部 anatomy / behavior donor。
```

有本地先例 → 复用其 grammar。没有先例但 owner fact 充分 → 做一份有界 specimen / 设计契约。owner fact 不存在 → `deferred`。**外部组件治不了缺失的本地契约。**

## 10. 一次一变量 / 声明式 delta

见 [continuity-checklist.md §3](continuity-checklist.md)。任何本地视觉 PR 都要写明"改了什么 / 什么保持不变"。若实施过程发现必须改一个**未声明**的维度，不得当作顺带；把它归类为

```text
required dependency
existing defect
precedent mismatch
new design decision
```

并报告。不得安静扩张 PR 范围。

## 11. 明确保持 deferred 的未来方案

| 方向 | 状态 | 说明 |
|---|---|---|
| version-bound agent contract | `deferred` | 需先有被接受的分发政策；当前不新建 package-coupled contract |
| `AGENT-RULES.md` | `deferred` | 职责当前由 AGENTS.md + current + Atlas + 工单共同承担 |
| `design/index.md` 平行目录 | `deferred` | Scout + Atlas + 本页 precedent-map 已覆盖召回需求 |
| semantic component registry | `deferred` | 不得借此创造新的域对象、状态或权限 |
| role-token / raw-literal lint | `deferred` | 须单独裁定规则范围与例外（§8 C 类） |
| 自动 context loader / design MCP / component manifest runtime | `deferred` | 属于独立架构 PR，不在文档轮内 |
| `llms.txt` / `llms-full.txt` 兼容接口 | `deferred` | 本轮明确不做 |

本页存在，不代表已经存在自动 context loader 或 `llms.txt` 兼容接口。

## 12. 外部来源的边界（S21 / S22）

Storybook、Figma Code Connect、Appica UI、Atlassian token tooling 一律 `reference`，可消费的与明确拒绝的项见 [sources.md](../sources.md) S21 / S22 行。四者都**不**引入 Courtwork：不加 React、Tailwind、Storybook、Figma / Code Connect、Appica package、Atlaskit tooling 或其 token 名称。
