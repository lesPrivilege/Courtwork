# Misfit / papercut 台账

WK-112 (f) 设立。记录设计反馈与观察到的不合，**先分类后施工**：每条先判断是局部缺陷（`local_fix_safe: true`，可进下一单）还是约束 / 子系统不合（回到裁定与兄弟方案）。周期性聚类；不因单条反馈增加 icon / divider / badge / affordance。

| # | surface | observation | severity | recurrence | suspected_constraint | local_fix_safe | related |
|---|---|---|---|---|---|---|---|
| M-1 | Settings › Models | BE-21 前 Fetch models 对 compatible 路径是诊断而非流程（delivery-fe03 §11 ⑤） | minor | 1 | connection registry absent | false | BE-21 |
| M-2 | Work header | Memory scope 位落在会话 meta 行而非工作面标题带（delivery-fe03 §11 ②） | minor | 1 | no dedicated Matter header | false | CC-W（WK-113 ③ 搬到工作面标题带） |
| M-3 | 全站错误 | 4xx / 409 直出后端原话，未按文风抻平（WK-107 ⑥） | minor | 2 | error copy convention absent | false | 独立裁定 |
| M-4 | Work 1440 | 展开工作面时 256 + 640 + 文档面容不下（X ≤ 496），现行为覆盖层盖满主区（EX-CC1 §1） | major | 1 | composition law WK-96/97 | false | WK-113：≥1680 三栏，1440 主次切换 + strip |
| M-5 | Work surface | 收起 → 展开重读一次 `/surface`（FE-T07 读数 0 → 2）；复用上次读取需失效规则 | minor | 1 | surface read cache / stale revision | false | WK-115 ③ |
| M-6 | Approval / Question | 在途记号与幂等记号共用 `questionSubmitting`，两种粒度键 | minor | 1 | in-flight state shape | true | WK-115 ⑥；下次触碰拆两个 Set |
| M-7 | Home | 具体待办排在计数之后、上半页留白大（图 6）；次级带若加统计会再下压待办（图 7） | major | 2 | information priority: todos vs counts; 0.56 baseline | false | WK-117 (b)；CC-D0-a 具体待办优先，0.56 改动需显式修订 |
| M-8 | Work 消息流 | 每条消息、每类工具都是框，层级过平（图 1 对照） | minor | 1 | message container vocabulary | false | WK-117 (b)；CC-W 不默认全部卡片化 |
| M-9 | 决定类按钮 | `Sending…` 换词改变按钮宽度，邻居位移（Atlas button 行：loading 保持宽度与焦点） | minor | 1 | in-flight label vs width | true | WK-118 (d)；CC-W 第 0 项以静止态标签预留 min-width |
