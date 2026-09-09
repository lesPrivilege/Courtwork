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
| M-10 | Tooltip | 单例 tooltip 固定 400ms 延迟，无"首个延迟、相邻即时"的分组行为（Atlas Tooltip 行；`ui-controls.mjs:310`） | minor | 1 | tooltip provider shared delay | true | WK-119 补充，用户 2026-09-09 同意；CC-W 第 0 项 |
| M-11 | 全站字阶与控件密度 | frontier 桌面端文本更收敛、字号与按钮更小更细，层级更清（用户 2026-09-09，S12）。现状：body 14 / label 13 / meta 12 / caption 11，`--control` 32（触控 44），primary 字重 550，三档 `--text-scale`（0.929 / 1 / 1.143）只整体缩放不改层级 | major | 1 | typography ramp & control density (systemic, not local) | false | 先写约束表再变体：候选单 FE-05a 字阶与密度，排 FE-05 材质之前（材质在密度定型后再消融） |
| M-12 | app 状态 | "当前哪一屏"由 `state.settings.open` 与 `state.view` 两值合说（CC-S §14 ③） | minor | 1 | view state model | false | WK-121 ③；合并为单一 view 值属状态模型变更，后单裁 |
| M-13 | Settings | 未保存表单离开（Back / Escape）不拦截，无跨表单 dirty 汇总（CC-S §14 ⑤） | minor | 1 | dirty aggregation state | false | WK-121 ⑤；需新状态，后单裁 |

## 聚类（第一轮，2026-09-09，Fable）

| 簇 | 条目 | 判定 | 去向 |
|---|---|---|---|
| 后端契约缺口 | M-1（连接注册表）、M-4 的多实例部分、M-5（surface 读缓存）、M-12（view 状态模型）、M-13（dirty 汇总） | 系统性：都是"前端没有第二真源"原则下等待后端或状态模型裁定的项，不能局部修 | BE-21 / BE-2 / 后单裁定 |
| 层级与密度 | M-7（待办位于计数后）、M-8（消息层级过平）、M-11（字阶与控件密度） | 系统性：同一约束（层级靠字号 / 字重 / 位置而非框线与颜色） | FE-05a（M-11 约束表）；M-7 入 CC-D0-a 信息优先级；M-8 入 CC-W "不默认卡片化" |
| 局部可修 | M-6（在途记号双粒度键）、M-9（在途保持宽度）、M-10（tooltip 共享延迟） | 局部缺陷 | M-9 / M-10 已入 CC-W 第 0 项；M-6 下次触碰时拆 |
| 位置与语义 | M-2（scope 位位置）、M-3（错误文案直出） | M-2 已由 CC-W 承接；M-3 是一次独立文案裁定（全部 4xx / 409） | CC-W；错误文案裁定待排 |

结论：三簇里只有"局部可修"可以不经裁定直接进单；其余两簇每条都对应一个约束或后端接缝，不因单条反馈加控件。下一轮聚类在 CC-W 交付后。
