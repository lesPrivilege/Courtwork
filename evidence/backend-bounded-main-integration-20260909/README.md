# 后端有界交付：主线合流核验

2026-09-09。来源Astra在隔离树复核交付`52f75ddcbdc2181c313d3176eecaf07dc43d17c1`，主线基线`5ea5ff00cdfe5280f255c372e359dca9e48c88c7`。Activity/Usage作者Astra（另一任务），AM-C作者Luna；本次核验者未修改产品代码。原始分工与独立证据见[交付回执](../backend-bounded-20260909/README.md)。

## 组合验证

隔离安装锁定依赖（npm ci --ignore-scripts），锁文件无变化。`cd app && npm test`：252/252通过，0失败/跳过；`npm run smoke`通过，local-fake，真实provider未运行。另复跑`node evidence/backend-bounded-20260909/independent-metrics.mjs`五组探针全部通过；这是复跑Luna已交付的独立探针，不冒称新增五组独立设计。结果摘要见[results.json](results.json)。

代码审阅核对认证GET路由、参数限制、单次已发布store投影、UTC过滤在分页之前、未过滤summary保持原形，以及AM-C最终loopback HTTP捕获/仅临时路径规范化。无集成产品补丁、迁移、Core/前端或新依赖。只更新current、BE交付台账与本证据。

## 接收边界

有界接收BE-1/3/25、BE-29及AM-C离线基线。Activity按Run开始日计，summary按各集合字段过滤；保留记录完整不等于历史完整。旧pending不在today结果中，全量待办继续无date查询。Usage保留部分值与missing，不能当账单。极端usage总和超safe integer会使activity也返回500，探针确认与协议一致，本轮明确保留可用性限制，未称修复。

BE-2不建后端tab台账；ES-01、Attention、原生async、真实缓存效果及GUI均未验收。前端继续原队列，G1–G5保持。合流前重查主线和他人编辑；仅快进，不覆盖已有wk98-regression.json修改。未push或部署。
