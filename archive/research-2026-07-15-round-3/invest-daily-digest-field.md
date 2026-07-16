# 投资讯息每日更新：invest 垂类实验田（2026-07-16 定向）

产品负责人定向。发版后候选，不入本轮；调研原稿不具约束力。

## 定位

一辆标杆电瓶车：invest 垂类（纸面已验证）的第一个具体场景 = 每日投资讯息自动更新。社区有成熟 skill（需求普查已由社区完成），无技术瓶颈——我们做的是同一场景的**契约编译形态**：减法、可视化、下沉防呆。与通用 chatbot 的效果差距即「提示词分发 vs 契约编译」的可视化证据，投递叙事的活演示。

## 形态草案

- `invest.DailyDigest` schema：watchlist 驱动、条目按来源分级（官方公告/行情快照=verified，web 线索=降级显式）、锚定到公告坐标/快照时间戳、确定性指标计算（纯规则）、结构化排布进 preview tab；
- 可视化：table/timeline/stat 三族现成，K 线缺口不阻塞 digest 场景；
- 防呆下沉：无锚条目不落格、数据缺失显式 unknown（usage-ledger 先例）、不可逆动作零（纯读取）。

## 关键依赖：scheduled invocation 最小 ADR

每日自动更新即 scheduled invocation（roadmap 锁在 ADR 后）。本场景是**理想解锁钥匙**：纯读取、零 effect、产物结构化——所需授权语义最小集（触发者身份、session 预算、失败不重复执行、digest 幂等）。用最无害场景驯化最危险机制，先立 scheduled ADR 第一阶（read-only digest 级），Stage 3 完整企业语义仍后置。

## 多 agent / deep research 等预设功能的通例

产品负责人判断：这些最初预设的功能，集成只是加 harness，开源方案充足、无技术与维护瓶颈。架构确认，附既有纪律：只借鉴形状不引第二 runtime（ADR-011）；每项集成在真实需求到来时立 ADR/工单，复杂度预算照常审视——「没有技术瓶颈」不等于「没有复杂度成本」，但确实意味着排期风险低。
