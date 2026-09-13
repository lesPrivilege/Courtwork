# Precedent map · 按问题寻址的薄导航表

回答一个问题：**这一类 UI 工作，我从哪里开始？**

读法与前提见 [README.md](README.md)：三条权威轴、四种状态（`canonical` / `reference` / `unverified` / `deferred`）、nearest-precedent 排序、命中即停。

## 0. 使用规则

1. **只导航，不重述。** 本表不放 CSS 数值、组件 API、后端字段、状态机；它们留在 owner 文档。
2. **problem_key 是 Courtwork 的稳定键**，不是库名。`Appica` / `assistant-ui` / `Linear` / `Figma` / `Atlassian` / `Base UI` / `React Aria` 永远不能成为 problem_key；它们只能作为某个 Courtwork 问题**下面**的来源引用（见 [sources.md](../sources.md)、[Atlas](../atlas/README.md)）。
3. **`owner / fact entry` 一栏永远不指向外部来源。**
4. 行内canonical首先表示已裁本地owner/grammar的约束；所附实现/工单/截图不是整包重新接受，必须读取对应固定SHA证据与后续覆盖。具体实现符号和本轮已知缺口见[precedents.md](precedents.md)。外部来源另按其核验等级判断。
5. 表内先例不足时走 `next_if_missing`，不要即兴发挥。

各行共有的两条前置（不再逐行重复）：[AGENTS.md](../../../AGENTS.md)、[engineering/current.md](../../current.md)。

## 1. 壳与导航

### `shell.navigation`

| 字段 | 值 |
|---|---|
| trigger | 侧栏、rail、顶带、全局导航、页面切换、"把 X 放进导航" |
| owner / fact entry | [docs/interface-components.md](../../../docs/interface-components.md)（Shell layout contract）、[docs/surface-assignment.md](../../../docs/surface-assignment.md) |
| grammar entry | [ui-composition-standard.md](../ui-composition-standard.md)、[surface-hierarchy.md](../surface-hierarchy.md) |
| nearest local precedent | [delivery-cc-w.md](../../mvp/execution/work-surface-kit/delivery-cc-w.md)、[app/web/shell-layout.mjs](../../../app/web/shell-layout.mjs) |
| verification entry | [evidence/cc-w](../../../evidence/cc-w)、[evidence/cc-w-main-integration-20260909](../../../evidence/cc-w-main-integration-20260909) |
| status | `canonical` |
| do_not_infer | 新增顶层导航项；把 Settings 期间的全局侧栏当作既定；因为别的 SaaS 有而加 workspace switcher |
| next_if_missing | 回 [roadmap-frontend.md](../../mvp/execution/work-surface-kit/roadmap-frontend.md) 队列，按工单裁定 |

### `settings.navigation`

| 字段 | 值 |
|---|---|
| trigger | 设置页、偏好、分组、设置内导航 |
| owner / fact entry | [docs/interface-components.md](../../../docs/interface-components.md)（Settings 段） |
| grammar entry | [ui-composition-standard.md](../ui-composition-standard.md)、[surface-hierarchy.md](../surface-hierarchy.md) |
| nearest local precedent | [delivery-cc-s.md](../../mvp/execution/work-surface-kit/delivery-cc-s.md)、[WO-WK12-settings-page.md](../../mvp/execution/work-surface-kit/work-orders/WO-WK12-settings-page.md)、[app/web/settings-view.mjs](../../../app/web/settings-view.mjs) |
| verification entry | [evidence/cc-s](../../../evidence/cc-s)、[evidence/cc-s-main-integration-20260909](../../../evidence/cc-s-main-integration-20260909) |
| status | `canonical` |
| do_not_infer | Settings 激活时保留全局侧栏；因为另一个 SaaS 有就新增设置类目；把设置项当作后端能力已存在 |
| next_if_missing | 无 owner fact 的设置项记 `deferred`，不渲染占位开关 |

### `home.composition`

| 字段 | 值 |
|---|---|
| trigger | 首页、着陆面、模块带、"打开应用先看到什么" |
| owner / fact entry | [contracts/home-modules.md](../../mvp/execution/work-surface-kit/contracts/home-modules.md) |
| grammar entry | [home-composition-2026-09-10/README.md](../home-composition-2026-09-10/README.md)、[ui-composition-standard.md](../ui-composition-standard.md) |
| nearest local precedent | [delivery-cc-d0a.md](../../mvp/execution/work-surface-kit/delivery-cc-d0a.md)、[app/web/home-view.mjs](../../../app/web/home-view.mjs)、[home-backlog-2026-09-10](../home-backlog-2026-09-10/README.md) |
| verification entry | [evidence/cc-d0a](../../../evidence/cc-d0a)、[evidence/ccd0a-main-integration-20260910](../../../evidence/ccd0a-main-integration-20260910) |
| status | `canonical` |
| do_not_infer | 新增没有 owner fact 的模块；把 backlog 项当作已交付；改动已裁的 composition 常量而不留实测证据 |
| next_if_missing | 走 [home-backlog-2026-09-10](../home-backlog-2026-09-10/README.md) 与 roadmap 队列 |

### `work.composition`

| 字段 | 值 |
|---|---|
| trigger | 工作面、三栏、域工作表面、Expert 组合 |
| owner / fact entry | [docs/interface-components.md](../../../docs/interface-components.md)（Domain work surface）、[contracts/presentation-primitives.d.ts](../../mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts) |
| grammar entry | [work-surface-boundaries.md](../work-surface-boundaries.md)、[frontend-layering-spec.md](../frontend-layering-spec.md) |
| nearest local precedent | [delivery-wk10b-2.md](../../mvp/execution/work-surface-kit/delivery-wk10b-2.md)、[app/web/workspace-view.mjs](../../../app/web/workspace-view.mjs) |
| verification entry | [evidence/wk10b2-main-integration-20260908](../../../evidence/wk10b2-main-integration-20260908) |
| status | `canonical` |
| do_not_infer | 新增域对象；把 presentation primitive 当作数据源；给没有契约的 Expert 组合加入口 |
| next_if_missing | 记 `deferred`，回 [work-surface-boundaries.md](../work-surface-boundaries.md) §6 的契约入口 |

## 2. 会话面

### `composer`

| 字段 | 值 |
|---|---|
| trigger | 输入框、发送、取消、附件、slash、模型选择、"让 Send 更醒目" |
| owner / fact entry | [contracts/primitive-canon.md](../../mvp/execution/work-surface-kit/contracts/primitive-canon.md) §2.2 / §3.2、[contracts/ui-state-vocabulary.md](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) §1 |
| grammar entry | [Atlas](../atlas/README.md)（Control Grammar 段）、[chat-flow-2026-09-10](../chat-flow-2026-09-10/README.md) |
| nearest local precedent | [delivery-cc-w.md](../../mvp/execution/work-surface-kit/delivery-cc-w.md)、[app/web/user-message.mjs](../../../app/web/user-message.mjs)、[app/web/model-picker.mjs](../../../app/web/model-picker.mjs)；排版 / 密度维度走 [WO-FE05A-dispatch-prompt.md](../../mvp/execution/work-surface-kit/work-orders/WO-FE05A-dispatch-prompt.md) |
| verification entry | [evidence/cc-w](../../../evidence/cc-w) |
| status | `canonical` |
| do_not_infer | 附件能力；新的 slash-command 架构；新的 runtime selector；新的 send / cancel 状态 |
| next_if_missing | 只在既有 run 状态词表内表达；缺状态记 `deferred` |

### `tab.chrome`

| 字段 | 值 |
|---|---|
| trigger | 标签页、tab strip、关闭区、新建 +、视图切换 |
| owner / fact entry | [docs/interface-components.md](../../../docs/interface-components.md)（Chat composition） |
| grammar entry | [tab-view-grammar.md](../home-composition-2026-09-10/tab-view-grammar.md)、[Atlas](../atlas/README.md)（tab-chrome 行） |
| nearest local precedent | [delivery-cc-w.md](../../mvp/execution/work-surface-kit/delivery-cc-w.md)、[ex-cc1-three-pane-tabs.md](../../mvp/execution/work-surface-kit/explore/ex-cc1-three-pane-tabs.md) |
| verification entry | [evidence/cc-w-main-integration-20260909](../../../evidence/cc-w-main-integration-20260909) |
| status | `canonical` |
| do_not_infer | 多文档后端支持；通用浏览器式 tab 模型；新的持久 tab 状态 |
| next_if_missing | tab 与 view-switch 的语义分类先看 [tab-view-grammar.md](../home-composition-2026-09-10/tab-view-grammar.md)，不确定即 `deferred` |

### `button.action`

| 字段 | 值 |
|---|---|
| trigger | 按钮、主次动作、标签文案、hit target、禁用态 |
| owner / fact entry | [docs/interface-components.md](../../../docs/interface-components.md)（Shape and controls） |
| grammar entry | [ui-composition-standard.md](../ui-composition-standard.md)、[surface-hierarchy.md](../surface-hierarchy.md) SH-4、[icon-controls.md](../icon-controls.md) IC-1 |
| nearest local precedent | [delivery-wk8.md](../../mvp/execution/work-surface-kit/delivery-wk8.md)、[app/web/ui-controls.mjs](../../../app/web/ui-controls.mjs) |
| verification entry | [tools/contrast-report.mjs](../../../tools/contrast-report.mjs)、[evidence/fe01-main-integration-20260909](../../../evidence/fe01-main-integration-20260909) |
| status | `canonical` |
| do_not_infer | 新的按钮变体层级；把 hover / pressed / focus / selected 混为一态；无语义的纯图标动作 |
| next_if_missing | 回 [surface-hierarchy.md](../surface-hierarchy.md) SH-4 的状态划分 |

## 3. 人在回路

### `approval`

| 字段 | 值 |
|---|---|
| trigger | 授权卡、permission、允许 / 拒绝、审阅动作 |
| owner / fact entry | [contracts/review-projection.md](../../mvp/execution/work-surface-kit/contracts/review-projection.md)、[contracts/ui-state-vocabulary.md](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) §2、[docs/work-core/contract.md](../../../docs/work-core/contract.md) |
| grammar entry | [contracts/primitive-canon.md](../../mvp/execution/work-surface-kit/contracts/primitive-canon.md) §2.5 / §3.5 |
| nearest local precedent | [delivery-wk4 / WO-WK4-review-slice.md](../../mvp/execution/work-surface-kit/work-orders/WO-WK4-review-slice.md)、[app/web/coordination-view.mjs](../../../app/web/coordination-view.mjs) |
| verification entry | [evidence/work-review-actions-20260908](../../../evidence/work-review-actions-20260908) |
| status | `canonical` |
| do_not_infer | `Always allow`；reviewer identity；quorum；policy expiry；policy version |
| next_if_missing | 先做 authorization scope 的可视化前置（WK-144），按钮后于契约 |

外部审批组件（assistant-ui、AI Elements 等）在此为 `reference`，不能扩张本地封闭动作集。

### `question`

| 字段 | 值 |
|---|---|
| trigger | ask-user、编号选项、自由回复、Skip / Send |
| owner / fact entry | [contracts/ui-state-vocabulary.md](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) §2、[contracts/review-projection.d.ts](../../mvp/execution/work-surface-kit/contracts/review-projection.d.ts) |
| grammar entry | [contracts/primitive-canon.md](../../mvp/execution/work-surface-kit/contracts/primitive-canon.md) §2.6 / §3.6 |
| nearest local precedent | [app/web/coordination-projection.mjs](../../../app/web/coordination-projection.mjs)、[Atlas](../atlas/README.md)（S12 ask-user 结构观察） |
| verification entry | [evidence/work-review-actions-20260908](../../../evidence/work-review-actions-20260908) |
| status | `canonical` |
| do_not_infer | 多轮追问协议；把 Skip 当作已回答；新增问题类型 |
| next_if_missing | 一次合并提问（WK-123 Auto 同源），缺契约即 `deferred` |

### `attention.triage`

| 字段 | 值 |
|---|---|
| trigger | 事项面、待办、需要我处理、snooze / Later、批量、优先级 |
| owner / fact entry | [docs/work-core/attention.md](../../../docs/work-core/attention.md)、[contracts/ui-state-vocabulary.md](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) §6 |
| grammar entry | [attention-triage-2026-09-10](../attention-triage-2026-09-10/README.md)、[attention-surface-2026-09-09](../attention-surface-2026-09-09) |
| nearest local precedent | [WO-ATT-FE01.md](../../mvp/execution/work-surface-kit/work-orders/WO-ATT-FE01.md)、[app/web/attention-view.mjs](../../../app/web/attention-view.mjs) |
| verification entry | [evidence/attention-agent-20260910](../../../evidence/attention-agent-20260910)、[evidence/attention-independent-20260909](../../../evidence/attention-independent-20260909) |
| status | `canonical`（Core合同、registry/detail及已交付typed triage actions；见[独立回执](../../../evidence/delivery-rollup-20260910/attention/independent-verification.md)） |
| do_not_infer | Priority score；批量动作；email 状态；GitHub 状态；超出 owner fact 的 scheduled snooze 语义 |
| deferred scope | 批量、saved views、density、scheduler、grant/关系编辑与proposal；[增量消费](../frontend-audit-2026-09-13/attention-consumption.md)记录Board/Time准入 |
| next_if_missing | 按钮继续只由 `human_actions` 广告生成；入口反转已由WO-ATT-FE01执行回执确认，勿按旧稿重复施工 |

## 4. Projection（如何读）

四行共用：owner fact 必须先存在，投影必须报口径。负规则见 [Atlas](../atlas/README.md) Projection Grammar 段与 [data-visualization.md](../home-composition-2026-09-10/data-visualization.md)。

### `projection.value`

| 字段 | 值 |
|---|---|
| trigger | 数字、计数、token、用量读数 |
| owner / fact entry | [app/docs/request-telemetry.md](../../../app/docs/request-telemetry.md)、[contracts/ui-state-vocabulary.md](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) |
| grammar entry | [Atlas](../atlas/README.md) Projection Grammar 段、[ex-pg1-projection-inventory.md](../../mvp/execution/work-surface-kit/explore/ex-pg1-projection-inventory.md) |
| nearest local precedent | [app/web/usage-projection.mjs](../../../app/web/usage-projection.mjs)、[app/web/telemetry-view.mjs](../../../app/web/telemetry-view.mjs) |
| verification entry | [tools/lint-interaction.mjs](../../../tools/lint-interaction.mjs) |
| status | `canonical` |
| do_not_infer | `estimate → meter`；`missing → zero`；被冻结为 null 的字段（`decodeTokensPerSecond`、`providerTtftMs`）有值 |
| next_if_missing | 无测量即 `deferred`，不画控件 |

### `projection.status`

| 字段 | 值 |
|---|---|
| trigger | 状态点、徽标、running / failed / unknown |
| owner / fact entry | [contracts/ui-state-vocabulary.md](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) §1 |
| grammar entry | [Atlas](../atlas/README.md) Projection Grammar 段、[contracts/color-governance.md](../../mvp/execution/work-surface-kit/contracts/color-governance.md) |
| nearest local precedent | [app/web/thread-projection.mjs](../../../app/web/thread-projection.mjs)、[app/web/runtime-view.mjs](../../../app/web/runtime-view.mjs) |
| verification entry | [tools/lint-colors.mjs](../../../tools/lint-colors.mjs) |
| status | `canonical` |
| do_not_infer | `running → progress`；用颜色代替标签；`unknown` 与 `unavailable` 混用；复制旧custom/gray-steel→accent回退作为Review规范（见[分离裁决](../skin-injection-2026-09-10/skin-constitution.md)） |
| next_if_missing | 缺状态即记deferred，不新造状态名 |

### `projection.distribution`

| 字段 | 值 |
|---|---|
| trigger | 分布、占比、模型用量图、drilldown |
| owner / fact entry | [app/docs/request-telemetry.md](../../../app/docs/request-telemetry.md) |
| grammar entry | [data-visualization.md](../home-composition-2026-09-10/data-visualization.md) |
| nearest local precedent | [app/web/usage-view.mjs](../../../app/web/usage-view.mjs) |
| verification entry | [evidence/ui-maturity](../../../evidence/ui-maturity) |
| status | `canonical` |
| do_not_infer | `complex → graph`；补齐缺失区间；把采样口径隐去 |
| next_if_missing | 先补口径说明，再谈图形 |

### `projection.heatmap`

| 字段 | 值 |
|---|---|
| trigger | 热力图、活动格、按日强度 |
| owner / fact entry | [app/docs/request-telemetry.md](../../../app/docs/request-telemetry.md) |
| grammar entry | [data-visualization.md](../home-composition-2026-09-10/data-visualization.md)（Heatmap scale） |
| nearest local precedent | [app/web/usage-view.mjs](../../../app/web/usage-view.mjs) |
| verification entry | [tools/contrast-report.mjs](../../../tools/contrast-report.mjs) |
| status | `canonical` |
| do_not_infer | 无数据格与零值格同色；自定义色阶脱离 color governance |
| next_if_missing | 回 [contracts/color-governance.md](../../mvp/execution/work-surface-kit/contracts/color-governance.md) |

## 5. 视觉语法

### `material.chrome` / `material.transient`

| 字段 | 值 |
|---|---|
| trigger | 玻璃、blur、backdrop-filter、材质、"让卡片也通透" |
| owner / fact entry | 无后端 owner fact；材质不表达 agent 状态 |
| grammar entry | [material-grammar.md](../home-composition-2026-09-10/material-grammar.md)、[Atlas](../atlas/README.md) Material 段 |
| nearest local precedent | [app/web/materials-view.mjs](../../../app/web/materials-view.mjs)、[ex-cc6-progressive-blur.md](../../mvp/execution/work-surface-kit/explore/ex-cc6-progressive-blur.md) |
| verification entry | [tools/lint-materials.mjs](../../../tools/lint-materials.mjs) |
| status | `canonical`（仅既有material grammar与两处生产blur边界） |
| do_not_infer | 内容层 glass；侧栏 glass；material = agent 状态；glass-on-glass；省略 reduced-transparency / unsupported 回退 |
| specimen evidence | [FE-05 标本](../material-specimen-2026-09-10/README.md) 经真实媒体回退修补后完成[独立检查](../../../evidence/delivery-rollup-20260910/material/independent-verification.md)，原始与 FE-05a 组合证据分列 |
| deferred scope | EX-CC6/progressive blur与新增材质的生产实施、用户选向和真机帧性能仍未接受 |
| next_if_missing | FE-05a 已落地；后续材质实施须另定范围，不把标本合流当生产选择 |

### `shape.control`

| 字段 | 值 |
|---|---|
| trigger | 圆角、concentricity、capsule、分组拓扑 |
| owner / fact entry | [docs/interface-components.md](../../../docs/interface-components.md)（Shape and controls） |
| grammar entry | [Atlas](../atlas/README.md) Shape 段、[ex-cs1-shape-grammar.md](../../mvp/execution/work-surface-kit/explore/ex-cs1-shape-grammar.md) |
| nearest local precedent | [type-density-constraints.md](../type-density-constraints.md)、[type-density-ablation/v1](../type-density-ablation/v1) |
| verification entry | [evidence/fe04-main-integration-20260909](../../../evidence/fe04-main-integration-20260909) |
| status | `canonical`（仅已裁Shape grammar与既有role） |
| do_not_infer | 引入 `corner-shape` 为必需；新增半径档；破坏 concentricity 公理 |
| accepted scope | FE-05a baseline 修补、Shape、V1 与 HOME-16 已独立验收并合入；[验收回执](../../../evidence/delivery-rollup-20260910/fe05a/independent-verification.md)限定证据范围 |
| next_if_missing | 按 FE-05a 已落地约束，不自行加档 |

### `iconography`

| 字段 | 值 |
|---|---|
| trigger | 图标、glyph、family、fill vs line、新加一个图标 |
| owner / fact entry | [contracts/glyph-semantics.md](../../mvp/execution/work-surface-kit/contracts/glyph-semantics.md) |
| grammar entry | [icon-controls.md](../icon-controls.md)（IC-1…IC-7）、[Atlas](../atlas/README.md) Iconography 段 |
| nearest local precedent | [app/web/ui-controls.mjs](../../../app/web/ui-controls.mjs)、[app/web/vendor](../../../app/web/vendor)（Lucide，IC-5 冻结） |
| verification entry | [evidence/ui-maturity](../../../evidence/ui-maturity) |
| status | `canonical`（仅Lucide既有发货范围） |
| related references | MingCute / Phosphor只作来源参考，不属于本条canonical范围 |
| specimen ruling | [EX-IC1](../icon-specimen/README.md) 已完成，WK-163 选择 D：保留 Lucide；[独立复核](../../../evidence/delivery-rollup-20260910/README.md)验证固定交付与 vendor 一致性 |
| deferred scope | 图标族迁移未授权；specimen 接受不授予混族或替换权限 |
| do_not_infer | 混用家族；自绘"通用动作"字形；无 schema 的 fill = 状态；替换 sprite / 新增依赖 |
| next_if_missing | 走 [S17](../sources.md) 的 donor 归一规则与 manifest，不直接换族 |

## 6. 局部控制

### `contextual.actions`

| 字段 | 值 |
|---|---|
| trigger | 悬浮工具栏、局部动作、bubble / floating toolbar、选中后出现的按钮 |
| owner / fact entry | 每个动作各自的 owner contract（[docs/work-core/](../../../docs/work-core)、[contracts/](../../mvp/execution/work-surface-kit/contracts)） |
| grammar entry | [Atlas](../atlas/README.md) Control Grammar 段、[interaction-vocabulary.md](../home-composition-2026-09-10/interaction-vocabulary.md) |
| nearest local precedent | [WO-CCI-01-property-row.md](../../mvp/execution/work-surface-kit/work-orders/WO-CCI-01-property-row.md)、[delivery-cci-01.md](../../mvp/execution/work-surface-kit/delivery-cci-01.md) |
| verification entry | [tools/lint-interaction.mjs](../../../tools/lint-interaction.mjs) |
| status | `deferred`（通用contextual toolbar与applicability事实表未交付） |
| implemented precursor | PropertyRow第一片是属性行先例，见precedents.md；它不能支撑泛化toolbar的canonical声明 |
| scoped action precedent | [Attention typed actions](../../../evidence/delivery-rollup-20260910/attention/independent-verification.md) 已独立验收：动作来自 human_actions，revision / request_id 由既有合同约束；不是通用 toolbar authority |
| do_not_infer | 通用 command palette；新的域动作；把不可用动作渲染成 disabled 占位 |
| next_if_missing | 先补 `appliesTo / requiresSelection / requiresCapability / risk / frequency / preferredSurface` 事实表 |

### `popover.inspector`

| 字段 | 值 |
|---|---|
| trigger | 浮层、inspector、hover 卡、provenance、详情面板 |
| owner / fact entry | 被检查对象自身的契约；provenance 见 [contracts/review-projection.md](../../mvp/execution/work-surface-kit/contracts/review-projection.md) |
| grammar entry | [disclosure-overlay.md](../home-composition-2026-09-10/disclosure-overlay.md)、[Atlas](../atlas/README.md)（popover-inspector 行） |
| nearest local precedent | [app/web/inspector.mjs](../../../app/web/inspector.mjs)、[ex-cc3-popover-inspector.md](../../mvp/execution/work-surface-kit/explore/ex-cc3-popover-inspector.md) |
| verification entry | [tools/lint-interaction.mjs](../../../tools/lint-interaction.mjs) |
| status | `canonical`（仅已有connection/context popover与tooltip的适用行为） |
| do_not_infer | hover-only 的可交互浮层；把浮层当作事实源；无 return path 的焦点跳转 |
| deferred scope | 通用Inspector与CC-I skeleton；Artifact/Trace导航目标不能当作已统一Inspector |
| next_if_missing | 回 [disclosure-overlay.md](../home-composition-2026-09-10/disclosure-overlay.md) 的层级与 Escape 规则 |

## 7. 阅读与成果

`markdown.reading` 与 `output.review` 相交但**不同路**，见 [docs/output-review.md](../../../docs/output-review.md)。

### `markdown.reading`

| 字段 | 值 |
|---|---|
| trigger | 渲染 Markdown、阅读版式、复制、锚点、代码块 |
| owner / fact entry | [docs/markdown-reader.md](../../../docs/markdown-reader.md)、[docs/reading-marks.md](../../../docs/reading-marks.md) |
| grammar entry | [typography-refinement.md](../../../docs/typography-refinement.md)、[type-density-constraints.md](../type-density-constraints.md) |
| nearest local precedent | [app/web/markdown-reader.mjs](../../../app/web/markdown-reader.mjs)、[app/web/markdown-source.mjs](../../../app/web/markdown-source.mjs) |
| verification entry | [tools/markdown-vendor](../../../tools/markdown-vendor)、[evidence/ui-maturity](../../../evidence/ui-maturity) |
| status | `canonical`（fixed revision contract） |
| do_not_infer | Markdown == 全部输出；渲染结果 == 受治理的记录；复制 == 复核 |
| next_if_missing | 版本固定，扩展需先改契约 |

### `output.review`

| 字段 | 值 |
|---|---|
| trigger | 成果、交付物、接受、复核面、diff 复核 |
| owner / fact entry | [docs/output-review.md](../../../docs/output-review.md)、[docs/work-core/contract.md](../../../docs/work-core/contract.md)、[contracts/review-projection.md](../../mvp/execution/work-surface-kit/contracts/review-projection.md) |
| grammar entry | [completion-surface.md](../completion-surface.md)、[work-surface-boundaries.md](../work-surface-boundaries.md) §3 |
| nearest local precedent | [app/web/coordination-view.mjs](../../../app/web/coordination-view.mjs)、[delivery-wk10c.md](../../mvp/execution/work-surface-kit/delivery-wk10c.md) |
| verification entry | [evidence/work-review-actions-20260908](../../../evidence/work-review-actions-20260908) |
| status | `canonical` |
| do_not_infer | output review == 正式接受；UI 显示即授权；复制即复核 |
| next_if_missing | 正式接受语义来自本项目契约，不从 DSH / OpenWork 借 |

## 8. 覆盖与缺口

本表当前 21 个条目 / 21 个 status 行，覆盖 22 个 problem_key（两种 material 合并）。canonical仅限各行明确的合同/已接受范围，不将整行代码、工单、specimen统称为已接受；`contextual.actions`本条为deferred；其PropertyRow前置已实现但不授予toolbar能力。`iconography`的canonical限Lucide，EX-IC1已完成且裁定保留Lucide，MingCute/Phosphor仅外部reference。仍属 `deferred`、未在表内展开的方向：`identity / brand`（GI 轨道，见 [identity-specimen](../identity-specimen/README.md)）、`motion`（[Atlas](../atlas/README.md) Motion 段，尚无本地已裁 specimen）、`empty / error state` 的统一先例。落在这些区域的任务按 [README.md §6](README.md) 登记 gap，不即兴发挥。
