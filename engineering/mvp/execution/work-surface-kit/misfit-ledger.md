# Misfit / papercut 台账

WK-112 (f) 设立。记录设计反馈与观察到的不合，**先分类后施工**：每条先判断是局部缺陷（`local_fix_safe: true`，可进下一单）还是约束 / 子系统不合（回到裁定与兄弟方案）。周期性聚类；不因单条反馈增加 icon / divider / badge / affordance。

| # | surface | observation | severity | recurrence | suspected_constraint | local_fix_safe | related |
|---|---|---|---|---|---|---|---|
| M-1 | Settings › Models | BE-21 前 Fetch models 对 compatible 路径是诊断而非流程（delivery-fe03 §11 ⑤） | minor | 1 | connection registry absent | false | BE-21 |
| M-2 | Work header | Memory scope 位落在会话 meta 行而非工作面标题带（delivery-fe03 §11 ②） | minor | 1 | no dedicated Matter header | false | CC-W |
| M-3 | 全站错误 | 4xx / 409 直出后端原话，未按文风抻平（WK-107 ⑥） | minor | 2 | error copy convention absent | false | 独立裁定 |
| M-4 | Work 1440 | 展开工作面时 256 + 640 + 文档面容不下，现行为压中列（shell-refinement） | major | 1 | composition law WK-96/97 | false | EX-CC1 / CC-W |
