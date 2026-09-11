# 缺口与有界 PR 提案

这些是一次 Design 的共同输入，不是已接收资产或施工派单。各项必须先消费 [决策索引](decision-index.md)，按 [RETURN](RETURN.md) 返回。Astra 保留最终架构与合流裁决；Luna做有界研究/非作者复核。

| ID / 优先级 | 具体缺口与目标 | 最近实现 / 禁止越界 | Design 输出与后续 PR 边界 |
|---|---|---|---|
| DG-01 / P0 | Spark、Attention缺少用户本轮要求的原生识别系列 | 当前text-reserved是既往裁定，47项registry/36 glyph已存在；不借sparkle/bell自动改义 | 原生SVG及16–24px光学/语义碰撞矩阵；独立资产PR，再接两个semantic槽，不迁移全族 |
| DG-02 / P0 | Spark来源变化→过期派生→相关工作→后续处理的完整控制面 | BE41查询已live；刷新查询不是重建，重建/恢复缺口仍开放 | 整体场景及状态/控件矩阵；只读呈现一片，真实后端动作另片 |
| DG-03 / P0 | Attention队列、全局助手、披露与人的动作需连续系列 | 已有typed actions、scope/revision与共享消息动作；不要重造Inbox或权限owner | 队列/详情/会话/授权/回执系列；所有请求和授权绑定真实对象版本 |
| DG-04 / P0 | Composer、thinking、streaming、tool/stop的功能性动效尚未成系统 | 当前120/180ms、固定curve；pending投影已有，不能伪造内部思维、进度、TPS | 状态→视觉→中断→静态回退时间线；不改草稿/选区/滚动，不用持续shimmer填未知状态 |
| DG-05 / P1 | Explore agent协作状态与返回来源需要共同语法 | coordination记录是通信事实，不是执行调度；没有生命周期owner不可冒充生产能力 | 真实状态与sample adapter分列；单独登记后端接口，不在动效PR中创造runtime |
| DG-06 / P1 | Chat Space消息、tool、file、source与全量action光学/交互一致性 | 已接共享actions；EX-IC2旧WIP只作定向donor，G01–G06缺口未消失 | 采用/适配/拒绝账、touch/focus/hover/不可用矩阵；源码接线按handler分片 |
| DG-07 / P1 | Settings、tab/view-switch与tap反馈需可视化体例 | settingsRow、model picker、manual-activation tabs、Floating UI已存在 | 属性/控件/反馈解剖；Home/End等行为缺口单独测试，不以换皮替代修复 |
| DG-08 / P0 | 发布面要以Spark/Attention连续控制面表达SE治理 | 保留现行导航/Ideas与Paper权威；真实图源固定f137，非本轮设计golden | Home核心故事、Features/Tour配套、原生概念SVG；资产、文案、媒体来源分别验 |
| DG-09 / P0 | Surface/Color/Material/Type/State需要统一检索与合法组合表 | 现有S/R/U、material、productive/expressive、focus/review独立；不新增平行token系统 | 在现有grammar上给组件合法组合、反例、明暗映射、迁移清单；逐条处置新研究主张 |

## 已明确裁定的局部修正

用户追加：深色composer与user message气泡应比阅读面浅。composer已用L2 float；Astra修正气泡的跨主题固定暗底，深色改用同一float角色，浅色保持既有authored对比。这项是明确授权的修补，不等待Design，不允许Design回报把旧深色截图当未变baseline。见 [实际证据](../../../evidence/dark-authored-20260911/README.md)。

## 顺序与接受条件

推荐先交完整Design系统，再按 DG-09基础映射 → DG-01资产 → DG-02/03控制面 → DG-04/06/07共同组件 → DG-05独立能力 → DG-08发布面组织PR；可按真实依赖调整。所有PR带最近先例、影响grammar、版本固定证据和非作者复核。没有领域owner的设计必须明确样本，不靠视觉假装能力完成。用户提交Design后Astra填裁决，再决定施工，当前无Design接受结论。

## 用户截图：相邻相同分栏 glyph

[原图](../../research/ui-ecology-2026-09-11/header-controls-user.png)显示两个相邻分栏图标。源码 `app/web/app.mjs` 的 `show-run-button` 为 Chat overview（openContextSummary），`show-surface-button` 为 Open work surface（工作面开关），两者当前均取 `panel-right`。这是**同形异动作、相邻位置辨识不足**的具体DG-06/07输入；aria-label和tooltip名称不同不能替代视觉区分。Design需比较overview与work surface的对象、入口、打开/关闭状态及是否需要同时存在，再给推荐标识或组合布局；不得把截图本身当成用户已选择某个替代glyph。
