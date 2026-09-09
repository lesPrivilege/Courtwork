# 后端有界施工：Activity / Usage 与维护基线

开工：2026-09-09，实际 base `5ea5ff00cdfe5280f255c372e359dca9e48c88c7`，干净隔离树，分支 `codex/backend-bounded-20260909`。Astra 实施并整合；Luna 三片只读探索（BE消费、ES恢复、AM/Attention），随后非作者核验。其他作者继续施工，禁止覆盖其编辑。

## 本轮派单

主线 BE-1/3/25 + BE-29：在 RuntimeStore 同步读取已发布状态，按 startedAt UTC 日桶和 run id 聚合。新增受既有 token 保护的只读 Activity/Usage 接口，summary 可选 UTC 日期过滤。只代表保留的 recorded runs；删除会话删运行目录记录，不能声称全历史覆盖。Usage 保留 missing 和 partial 数字，非账单。无新状态、schema 或迁移。

Astra 写权：`app/server/{work-metrics,work-summary,store,service,index}.mjs`、`app/tests/work-metrics.test.mjs`、`app/docs/work-metrics.md`、本派单及本轮证据。`work-metrics.mjs` 和相关文档/测试为新增。前端、Core、Paper、current 及共享台账不在本轮写权；合流 owner 后续按固定 SHA 同步 current。

BE-2 优先核查对象身份及 owner，不因名字 surface 相同而将前端 view state 写入 Core。ES-01 的完整历史字节/依据闭包/迁移不可裁成假接受；本轮不同时争用 Core。AM-A/C 作为独立离线测试配套，实际范围待只读探索回报后精确授权。其余请求保留既有索引，不全部开工。

验证：UTC ±1ms、重复 run id、项目范围、删除/重启、未报告 usage、并发发布窗口、非法 query、认证、summary 三集合日期语义、全量 npm test / smoke；Luna 对固定实现独立反例验证。合成 dataDir/port 0，无个人凭据、paid provider 或部署。回退为代码 revert（无数据变化）；不与共享 main 自动合流，不关闭 G1–G5。
