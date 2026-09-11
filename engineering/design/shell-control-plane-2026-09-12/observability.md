# FE-OBS-01…07 · Runtime observability

状态：扩展合同，不是新增统计实现。复用[Usage details](../../../app/docs/usage-details.md)、[work metrics](../../../app/docs/work-metrics.md)与[request telemetry](../../../app/docs/request-telemetry.md)。这些合同各自固定版本描述仍按当前owner解释，本片不改变Runtime schema。

## 已有能力不能重复造

FE-OBS-01已有Usage dialog Overview/Models；02已有UTC daily reported-token calendar与Home retained-Run activity；07已有date/model过滤、snapshotId一致性、分页和精确Run跳转。03小时矩阵尚无；04仅有Input+output/Input/Output metric与project/range controls，05已有configured model分组，06仅有既有reported计数/请求观测的特定事实。

扩展使用同一Metric × Dimension适配合同，不新增一个全能telemetry store或十张重复热图。每个组合必须广告为支持，包含单位、scope、时间字段/timezone、区间边界、分母、source、覆盖、missing、聚合方法和一致snapshot身份。缺字段的组合保持unsupported，不靠前端推导。

| 候选维度/指标 | 数据边界与缺口 |
|---|---|
| 时间、项目、配置Provider/Model、reported input/output | 复用现有retained Run事实、UTC startedAt归桶和配置身份；不改称实际路由或账单时间 |
| Chat/Attention/Spark、Runtime、Expert、Matter、Capability | 必须有Run-start绑定身份/实际调用或明确来源category；页面停留与展示glyph不能充当归因。Matter≠project，计划中的Expert不产生统计 |
| Run状态、失败率、完成率 | 使用真实状态闭集并冻结时点/分母；waiting/HITL不擅加为terminal状态。按最终结果与按失败事件是不同指标，自动恢复不能抹事件或重复计Run |
| Turns、Messages、Tool calls、MCP calls | 各自稳定事件身份与重放去重；现有usage.turns不自动等于规范模型轮数。沿既有Session-turn缺口，不改Run计数标题 |
| Active time、Latency | 冻结起止事件、等待/暂停/并行重叠与观测缺失；wall-clock elapsed不等于active time；Host首输出不称provider TTFT |
| Human interventions、approvals、resumes | 分开动作类型与可信actor，定义同一次交互多事件去重；tool ask、Core review与会话resume不直接相加 |
| Compaction、cache、context peak | 压缩次数/前后量须实际事件；cache与input可能重叠，未给可比口径不得算hit ratio。字符估计不称精确token或context余量；declared capacity不证明实际占用 |
| Cost、active Matters、streak | Cost需可靠计价来源、币种/版本与缺失覆盖；active Matter有Core定义后再用；streak不把未知历史/删除记录当无活动 |

新事件字段先由各owner冻结producer、版本、timestamp、idempotency、Run/object归属、保留/缺失和敏感字段处理；不为了图表记录prompt/正文。聚合读取与Run下钻沿现有snapshot合同，不能从有限分页摘要反算整图。

## 两种时间图与下钻

Calendar用于按日总量密度，延续正值quantile、阈值披露、精确表与无数据/零/不完整区分。Week×hour用于周期分布，须明确是选区内weekday/hour的sum、mean或另一统计；首片若做则保持UTC，无夏令时歧义。若以后支持当地时区，另冻结DST重复/缺失小时与不均匀采样分母。不得由日桶拆24份冒充小时观测。

每个可点图元产生有类型的真实过滤器并绑定snapshot；目标只支持date/model时，不展示不存在的Expert/Capability下钻。切换metric/group/range后旧请求失效，陈旧snapshot继续用现有409提示刷新；不把新Run列表塞在旧图下。返回图面恢复metric、过滤、范围、scroll与focus，沿[FE-NAV](navigation.md)。

验收新增组合时覆盖聚合与下钻集合一致、零/未知/不完整、retention删除、UTC边界、重放/乱序、状态分母、并行时间、过期snapshot、分组Other成员固定、可访问精确值/表和键盘操作。既有测试只支持原date/model/token范围，不继承为全部Runtime维度的接受。
