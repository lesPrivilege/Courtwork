# WO-WK10b · 通用工作面收尾与领域 Review 接缝

2026-09-08。用户授权下一轮施工；Claude Opus为实现者，沿用Fable WK裁定，Astra负责当前契约和接收。基线 `d86eba49ca308fb9f47fc953fe440ffa3289da3e`（main）；第二节点与收尾均已合流。替代旧WO-WK10中“b待合流”的启动条件，不改变历史作者回执。

本单分两个依赖明确的交付，第一段可立即开工；第二段等H1。总顺序见 [本轮派单](../../../../execution/2026-09-08-main-round/README.md)。

## 输入与写权

消费 [intake-round-2](../intake-round-2.md) 的WK-43/45、57、69–76，[text-sweep](../text-sweep.md)、[ReviewProjection](../contracts/review-projection.md)、[Work Surface边界](../../../../design/work-surface-boundaries.md)、`docs/interface-components.md` 与 `engineering/design/copy-convention.md`。

Opus拥有本单必要的 `app/web/app.mjs`、`surface-modules.mjs`、相关view/样式/图标sprite与这几份UI文档。H3的 `app/extensions/evidence-memo/renderer.mjs` 只在第二段开写。不改server/runtime/Core、HTTP契约或brand几何；同一路径与WK11串行。

## 第一段：只消费已有事实

1. 建 `contracts/glyph-semantics.md`，每个稳定动作记录语义、出现面、频率、文字/图标裁取、已准入Lucide glyph、accessible name与tooltip。用本仓固定sprite源；后果、对象与权限范围保持必要文字，不为单词化牺牲含义。
2. Chat Flow/行卡减法。Home下带三集合、分页、错误与空态显示自 2026-09-08 起移入 [WO-WK13](WO-WK13-home-bands.md)（第三轮派单），本单不再写 `home-view.mjs`；“当前待处理”不改叫“今日”。BE-1/3未交付，不画假heatmap或补0。
3. 工作面沿主区+悬浮卡/展开态，复用既有renderer身份、File/Run引用、Escape和焦点恢复；更新旧“三栏/第三列/rail header”文档到WK-72/74最终模型。
4. 热插拔仅指当前注册模块的呈现生命周期：声明槽位不等于可执行renderer。可复用registry、既有revision/snapshot与mount/dispose，但不能把任意profile uiSlots当新组件代码。active run期间由后端冻结配置，不提供保证稍后执行的前端队列。
5. producer/renderer缺席区分：已有payload而renderer缺席可只读展示；后端返回空projection时明确缺失，不能自造Decision/Evidence或宣称持久fallback已完成。
6. 维持Home框外状态行、64–160输入区、桌面居中/留白与L0–L3层级；不重新裁定桌面沉底、窄宗优先级或四轴设计。

## 第二段：H3 / 领域 Review

依赖H1固定的domain query/action契约与fixture，具体需求继承 [H3](../../../../research/experts-hotplug-2026-09-08/pr-plan.md#h3--为同一-work-state-提供-review-与历史-fallback)。

领域源已有 `matter/candidates/evidence/artifact/humanActions/stateVersion` 投影和 `decide` 样本动作，但NDA逐规则packet、修订和跨Session仍待H1。只消费交付版本中实际存在的字段与合法动作；不要扩充通用permission/question/outcome信封。

至少提供同一候选的来源、检查/未决、修改内容、接受后果与明确合法动作；过时版本/断连/重复点击由权威回执处理。H3历史fallback由后端先提供可读取内容和版本，前端不执行旧producer。没有mutation契约时交只读形态，不放置假accept按钮。

## 必须验证与交付

第一段：代表控件键盘/accessible name、切换renderer零重复订阅、关闭与重新打开、空/失败/分页区别、1440和390浅深、200%缩放、reduced-motion。复用现有受影响回归，有界新增真实反例；视口模拟与真实触控/读屏分开。

第二段：同版本inline/detail、过时决定冲突、断线恢复、候选修改后旧决定失效、renderer缺席与producer缺席分别验证。作者不把local-fake写成真实provider。未实施H1功能不计失败也不计本段完成。

两个交付各自固定SHA、实际路径、运行/数据位置、相称检查、消融表与未检项。第一段可先合流并释放WK11共享文件；第二段随后消费H1，不让整个WK10b被后端依赖卡住。Astra接收并安排非作者独验，用户保留视觉四轴裁定。
