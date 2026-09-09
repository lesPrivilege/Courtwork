# CC-D0-a / r4d 合流证据

2026-09-10，Astra。从实际 main `7c07ef6b5a19f0eb2c45b8894ab9911de87ea979` 独立树依次 merge `30014cf`、`5b4c981`，组合头 `99ba50ec825c1a2f91b1bd98f15e2d92ea9234ae`，无冲突、无产品补丁。main 相对交接 `0480c17` 仅增加文档。

## 本轮验证

读码核对 Home band 在场、偏好闭集、折叠恢复与写权；无 server/Core/Runtime 变更。`npm --prefix app ci` 成功；全量 **308/308**、colors/materials lint、contrast 全表、local-fake smoke 通过。原始日志在本目录。未复跑浏览器，未运行真实 provider。

Fable 非作者浏览器 **71/71 composition、9/9 cc-w、12/12 shell、8/8 fe-t07** 与作者验证按 [delivery §16](../../engineering/mvp/execution/work-surface-kit/delivery-cc-d0a.md#16-fable-复核wk-1382026-09-09) 归因；本轮不冒称重做。大字号首屏余量 M-18、深色/缩放等未检边界保留，不关闭产品门。过期 docblock 留下次触碰修正，不改产品 hash。

## 裁定与交接

接收两条交付。队列改为 **FE-05a → FE-05 → ATT-FE-01 → CC-I**。Attention 不依赖 CC-I，四项文档前置由 Fable 完成；grant 编辑器和 PropertyRow 原归属不变。FE-05a 由 Fable 取最终 main SHA 建树派出，本轮未启动 writer。

共享 main 的既有 `evidence/fe01-main-integration-20260909/wk98-regression.json` 未提交变更不纳入本次提交。源 CC-D0-a 树删除前核对干净，使用非 force 的 git worktree remove；来源分支保留。未 push、部署或修改 Paper。
