# 最近先例索引 · UI Continuity v1

基线 `2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`。这里的implemented precedent是已实现的复用入口，不是对整个组件的独立接受声明；具体接受范围仍读各自evidence。路径/符号变更由修改者同步此表。每次只加载有关行，不把全部源码塞入上下文。

| 要做的事 | 最近实现入口 | 合同 / 证据 | 不可继承的假设 |
|---|---|---|---|
| action / icon / tooltip / anchored popover | [ui-controls.mjs](../../../app/web/ui-controls.mjs)：`action`、`icon`、`setAction`、`installTooltips`、`anchorPopover` | [icon-controls](../icon-controls.md)、[overlay分类](../home-composition-2026-09-10/disclosure-overlay.md) | 不新建局部tooltip或换图标家族；anchor定位不等于完整modal焦点合同 |
| Overlay / Settings / Escape与返回焦点 | [app.mjs](../../../app/web/app.mjs)：`openDialog`、`closeDialog`、`openSettings`、`closeSettings`、`handleSurfaceEscape`、`restoreLayerFocus`；`openConnectionCard`、`openContextSummary` | [disclosure/overlay](../home-composition-2026-09-10/disclosure-overlay.md)、[Settings导航测试](../../../app/tests/settings-navigation.test.mjs) | 定位、焦点、返回目标分别保持；不能用anchorPopover替代整个dialog生命周期 |
| Settings属性行、复位与来源 | [settings-view.mjs](../../../app/web/settings-view.mjs)：`settingsRow`、`createPreferenceGovernance`、`preferenceProvenance` | [CC-I交付](../../mvp/execution/work-surface-kit/delivery-cci-01.md)；[偏好测试](../../../app/tests/settings-preferences.test.mjs) | 存着的customSkin不等于已应用；六个Appearance PropertyRow属性的事实不能泛化为所有域属性 |
| Model + effort | [model-picker.mjs](../../../app/web/model-picker.mjs)：`createModelPicker`；[settings-view.mjs](../../../app/web/settings-view.mjs)：`supportedEffortsOf`、`projectProviderConfig` | [Runtime片证据](../../../evidence/home-backlog-20260910/runtime/README.md) | catalog或保存结果不产生新capability；Settings与composer的scope不互换 |
| 纯状态投影 | [presentation-adapters.mjs](../../../app/web/presentation-adapters.mjs)、[usage-projection.mjs](../../../app/web/usage-projection.mjs)、[thread-projection.mjs](../../../app/web/thread-projection.mjs) | [projection约束](../../mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts)、[Atlas](../atlas/README.md) | 不fetch/缓存/造时钟；unknown不变0，不覆盖服务器排序 |
| Usage精确读面与下钻 | [usage-projection.mjs](../../../app/web/usage-projection.mjs)、[usage-view.mjs](../../../app/web/usage-view.mjs) | [usage-details合同](../../../app/docs/usage-details.md)、[Usage证据](../../../evidence/home-backlog-20260910/usage/README.md) | 日桶/模型身份/覆盖/快照口径必须保留；组成不是quota |
| Attention状态、详情与typed actions | [home-view.mjs](../../../app/web/home-view.mjs)、[attention-view.mjs](../../../app/web/attention-view.mjs) | [Attention合同](../../../docs/work-core/attention.md)、[Home交付](../home-composition-2026-09-10/README.md) | 旧review→accent回退是已登记缺陷；动作以human_actions/revision为准；已接入证据见[独立回执](../../../evidence/delivery-rollup-20260910/attention/independent-verification.md)，读取不触发处置 |
| markdown / artifact阅读 | [markdown-reader.mjs](../../../app/web/markdown-reader.mjs) | [交互lint](../../../tools/lint-interaction.mjs)中的ALLOWED_TAGS约束 | 动态标签闭集仍需守住；阅读组件不产生接受/授权 |
| layer / glass / review与skin | [styles.css](../../../app/web/styles.css)的S/R层与两处blur注册 | [色彩合同](../../mvp/execution/work-surface-kit/contracts/color-governance.md)、[Skin/Review新裁决](../skin-injection-2026-09-10/skin-constitution.md)、[Material grammar](../home-composition-2026-09-10/material-grammar.md) | 存在旧whole-skin泄漏，不将全部现状提升为规范 |

## 证据类型与治理状态

- **Canonical contract**：当前词表、Atlas已裁规则及各owner合同；可作为约束，不凭截图替代。
- **Implemented precedent**：上表源码；有明确接受证据且当前适用的范围为canonical，其余只作reference或unverified线索。代码存在本身不授予canonical。已知缺口与接受范围跟随evidence。
- **Accepted visual baseline**：必须另有固定数据、版本、截图和接受记录。此索引没有批量将旧截图升为golden。
- **Candidate**（处置为deferred，或已核验reference下的候选用途）：BE-31通用数值控件、context meter、无provider timing的sparkline、完整ApprovalGate reviewer/expiry/quorum、音频waveform、泛化graph、Dystopia对照及新增review material。查既有工单，不能先画成可用。
- **External reference**（正文已核验部分为reference，未核验主张为unverified）：Appica / React Aria / Base UI / AI Elements / assistant-ui / Figma等；仅取已核验方法/行为，不引依赖或域schema。

Provider connection已有专用原生number input（`settings-view.mjs`，`name=contextWindow`、min=4、step=1）；它是既有配置字段，不是通用NumberField/Stepper/ScrubArea。Atlas已同步纠正“从无数值输入”的旧时点描述。

## 检查入口

`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/lint-interaction.mjs`、`node tools/contrast-report.mjs`均为已有工具；`npm --prefix app test`是现有全量入口。单测可用`node --test <精确文件>`，browser/smoke按对应交付中的fixture和端口运行，不使用个人数据。Shape/type/raw-duration的全库机械gate尚未在此基线发货，不写不存在的lint命令。

有意视觉变化使用[变更记录](change-template.md)，并按[规范](frontend-contract.md)补相邻场景。检查通过的范围与未执行项必须明确，不用一次静态通过替代视觉或产品接受。
