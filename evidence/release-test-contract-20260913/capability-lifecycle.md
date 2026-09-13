# DF-06 预备组合证据 · 一个受控MCP能力

Sol在独立分支实现`7d9100e`，仅新增[组合测试](../../app/tests/release-capability-lifecycle.test.mjs)；没有改生产service、store、MCP manager、权限或schema。Astra裁定场景并要求区分exposure与disconnect，补Run B/C hash和boot失败清理；Luna只读非作者复核。组合候选`8461ff2ff77859d652ab467d78b4939296a5b43c`包含第一片测试合同与前端9525215。

## 实际覆盖

- Run A：真实Pi SDK→本地确定性模型的HTTP工具列表包含受控MCP工具，工具进入精确审批，再执行一次独立远端合成effect。审批等待时配置变更返回409。
- Run B：只隐藏exposure，连接保持；下一Run仍故意请求旧工具名，但实际模型请求不advertise该名、返回工具不存在，没有permission或MCP dispatch/effect。绑定revision/hash改变且descriptor明确exposed=false。
- 断开后，直接由A绑定取得的旧MCP manager执行器在网络前拒绝。此处是manager接缝，不称为重新调用完整service admission路径。
- Run C：重新connect/expose后实际执行第二次effect，新binding revision/hash不同；A的runtime.bound内容仍相等。
- 正常关闭Host并重开后，Run D不自动connect、rediscover或replay；模型工具列表不含旧名，目录、总请求、dispatch、effect计数都不增加。

fixture分别保留收到的RPC与实际effect ledger，不将一次RPC调用计数等同于副作用的证明。所有数据来自独立mkdtemp和loopback，没有真实Provider。

## 非作者证据与上限

Sol作者Node22.19定向1/1，Astra在组合候选独立复跑[1/1](lifecycle-independent.log)。Luna源码复核确认对应断言成立，未自行运行测试。正常关闭后重开不能证明in-flight crash/lost-ACK不重放；P01/P02/P02b已有故障测试继续在完整suite运行，不能由本片替代。

此片只增加DF-06中固定工具绑定与正常生命周期的组合证明，不宣称全部DF-06或P05/P06完成。下一片仍须沿已有control/input/request telemetry/compaction实现，把初始、工具轮、压缩、source版本与下一Run的身份关联起来；真实Provider探针及完整G门另行收口。
