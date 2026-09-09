# 后端有界交付回执

2026-09-09。base `5ea5ff00cdfe5280f255c372e359dca9e48c88c7`；隔离分支 `codex/backend-bounded-20260909`；主实现 `fd3861b15ce4875b37af674d8c9dd0798d258fd4`。实际写权见 [派单](../../engineering/execution/2026-09-09-backend-bounded/README.md)。本回执不替代 current；共享 main/current 由来源 Astra 核对并行写权后合流。

## 实现与消费

BE-1/3/25、BE-29：[正式接口](../../app/docs/work-metrics.md)。新增 `GET /api/v5/work-activity` 和 `work-usage`；summary 可选 `date=today|YYYY-MM-DD`。按 Run id 去重、startedAt UTC 日桶，单次读取已发布状态。Token 分列，保留 missing 和部分值，非计费账单。历史覆盖 unknown：删除 Chat 会移除 Run 记录；0 只表示保留记录无 Run。消费者不能将其涂成完整历史无活动。CC-D0-b 可按该合同接入，前端本轮未改。

无新数据库/状态 owner、无 schema 变化、无迁移、无新依赖、无静态准入变化。BE-17/18临时探测未改、不称保存连接。BE-2 不新增 tab ledger，待最新合同 owner 消费核查事实。ES-01、AM-B、Attention 对象仍未实现。

## 作者验证（Astra）

固定代码 `fd3861b`：

- 安装 `cd app && npm ci --ignore-scripts`：277 packages，锁文件未改；初始测试曾因隔离树缺依赖无法启动，安装后重跑。
- `cd app && node --test tests/work-metrics.test.mjs tests/work-summary.test.mjs`：11/11。
- `cd app && npm test`：249/249，0 skipped / 0 failed。
- `cd app && npm run smoke`：通过，realProvider `not_run`。
- `git diff --check`：通过。

定向测试覆盖 UTC 前/后1ms、跨午夜结束、run id 去重、项目隔离、reported zero vs missing、溢出拒绝、summary 三集合各自日期字段、认证/非法参数、实际 command replay、只读状态不变、重启/删除和发布前写窗口。独立 tmp dataDir、port 0，loopback provider；未读个人凭据或数据。

## 非作者验证与自研配套

Luna 对 `fd3861b` 独立探针五组通过，定向 metrics 5/5、summary 6/6、consistency 2/2 与 smoke 通过，见 [非作者复核](independent-review.md) 和 [可复现探针](independent-metrics.mjs)。极端 usage 总和超 safe integer 时两个 metrics 端点均500，已独立复现；本轮契约明确拒绝而不输出舍入值，保留为可用性限制。

AM-C 测试配套 `87c8818` 由 Luna 实施，作者3/3及连同现有protocol共5/5通过；Astra非作者复读最终HTTP捕获、完整golden及窄路径规范化，并复跑3/3通过。仅local fake completions新golden，不声称native async/cache收益。见 [AM回执](am-baseline.md)。

[BE探索](be-exploration.md)按最新CC-W约束收窄，BE-2后续由合同owner协调，不授新tab容器写权；[ES探索与裁定](es-exploration.md)保留可信record/history/输入覆盖的实施边界。Attention仍仅研究。

组合节点 `87c8818`：Astra运行 `cd app && npm test`，252/252通过，0失败/跳过；相较249仅增加AM-C三项。产品代码未在独验后修改。

## 未检项与回退

真实 provider/cache/billing、浏览器显示、完整历史保留、任意规模性能、机器掉电耐久性未检。无 BE-2 多实例 UI、ES 文件接受、Attention 或原生 async 能力宣称。G1–G5不关闭。

回退代码使用本轮提交的 revert，无数据迁移需恢复；不 reset 或改写共享历史。未自动合流 main、未 push、未部署。来源 owner 应读取最新 main/status，保留 FE 未提交证据和所有并行作者修改，合流后复跑组合检查，再更新 current/BE 台账。
