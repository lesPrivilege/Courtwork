# Luna 非作者独立复核

复核目标是固定提交 `fd3861b15ce4875b37af674d8c9dd0798d258fd4` 的 Activity / Usage / summary 读路径。复核者没有修改 `app/` 产品代码；只新增本目录的探针和回执。环境为 Node `v25.9.0`、隔离临时 `dataDir`、HTTP `port: 0`、local-fake loopback provider，不读取个人凭据、不运行 paid/real provider。

## 可复现命令

```text
node --check evidence/backend-bounded-20260909/independent-metrics.mjs
node evidence/backend-bounded-20260909/independent-metrics.mjs
npm --prefix app run smoke
git diff --check
```

探针输出为 `{"result":"passed"}`，包含五组检查；smoke 输出 `status: "passed"`、`provider: "local-fake"`、`realProvider: "not_run"`。固定提交上的有界测试也分别复跑：

```text
node --test app/tests/work-metrics.test.mjs                 # 5 pass, 0 fail
node --test app/tests/work-summary.test.mjs                 # 6 pass, 0 fail
node --test app/tests/work-summary-consistency.test.mjs     # 2 pass, 0 fail
```

## 反例与结论

| 检查 | 独立构造 | 结果 |
| --- | --- | --- |
| UTC 边界与范围 | 起始日 `00:00:00.000Z`、前一日 `23:59:59.999Z`、结束日 `23:59:59.999Z`、次日 `00:00:00.000Z`；跨午夜结束；代表 Run 状态（completed/failed/running，另以源码核对无状态过滤）；重复 `run.id`；另一项目 | 只按 `startedAt` 归桶，重复 id 只计一次，按项目隔离，边界正确 |
| Usage 语义 | 空集、四项均为零的已报告 Run、带部分数值的 `missing` Run | 分别得到 `no_runs`、`reported`、`not_reported`；部分数字保留；不生成 billing 结论 |
| HTTP 保护和保留范围 | 无 token、非法/重复/空 query、未知项目、相同 `commandId` replay、关闭重启、删除 Session；前后 state 文件字节比较 | 401/400 正确；replay 不加 Run；重启保留计数；删除后计数为 0 且 `historical: unknown`；读请求不改 state 或文件 |
| summary 日期字段 | `sessionCandidates` 活动落在当天、`inspection` 的 `endedAt` 落在当天、pending 的 `createdAt` 在前一天 | summary 按各自字段过滤；pending 从 `date=2026-09-09` 消失；UTC 字段明确 |
| 已发布视图与失效 | 暂停 `_persist` 后修改 usage；暂停期间读取；再把 `lockLost` 置真请求两个端点 | 暂停期间读取整个旧发布视图，提交后才见新值；store 不可用返回错误而不是空成功（当前 HTTP envelope 为 500 `internal_error`） |
| 不安全聚合 | 两个合法保留 Run，各自 `input = Number.MAX_SAFE_INTEGER`，使合计超 safe integer | 两个端点均 500 `internal_error`；没有四舍五入或静默损坏 |

源代码接缝复读：`app/server/index.mjs:101-103` 只注册三个 GET；`app/server/service.mjs:385-396` 对 metrics 参数做单值/范围校验后调用 store；`app/server/store.mjs:330-339` 从单一已发布 `this.state` 同步读；`app/server/work-metrics.mjs:19-42` 按 id、UTC 起始时间和安全整数累计。

## 有界注意项

`deriveWorkMetrics` 在 `work-metrics.mjs:19-29` 同一遍扫描同时建立 activity 和 usage。因而 usage 聚合超出 safe integer 时，activity 请求也会在返回前失败；独立探针已复现。这与当前文档 `app/docs/work-metrics.md:10` 明确的“unsafe totals fail as errors”一致，避免返回可能被四舍五入的数字。用户影响是极端/损坏 retained state 下 activity 可用性跟随 usage 失败；本轮不拆分派生器，因为那会改变错误原子性和契约。若后续需要 activity 在 usage 损坏时仍可用，应另立契约并将两项派生拆开。

同理，store 不可用在 `store.mjs:337-339` 抛出普通 Error，HTTP 层落到现有 500 `internal_error`；当前文档只要求失败、不承诺 503。若消费者需要区分“运行时不可用”和内部故障，应另立错误码/状态合同。

本复核支持固定提交在“保留 recorded Run 的只读 metrics、UTC 过滤、summary 日期语义”范围内通过独立有界检查；不扩展为真实 provider、历史完整性、billing、性能、GUI 或 G1–G5 接受。
