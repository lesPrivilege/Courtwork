# SPEC: packages/demo-runtime

状态：`CORE-BOUNDARY-1` 已实现，待独立验收。

## 职责

本包是 Courtwork 唯一 demo/acceptance composition root，负责把 `core` 通用执行机与 legal、demo-data、output、reading-view、provider/registry/tools 组装为脚本化演示、真跑入口和端到端 golden。它只由开发/验收消费；`packages/core` 与 `apps/desktop` 不得反向依赖。

## 边界

- 允许跨 core/legal/demo-data/output/reading-view 绑定，但不得成为生产代码的隐式入口。
- 演示 fixture、场景、事件、引用、确认、修订输出与 golden 语义源自原 core 内实现；搬包不改其字节或流程。
- CLI 等价入口：`demo:s3`、`demo:legal`、`real:s3`。provider 通用 smoke 仍属 `packages/provider`/原 core 兼容脚本，不进本绑定包。
- 本包可删除而不影响 core build/test；依赖图必须无环。

## CORE-BOUNDARY-1 验收目标

原 demo/acceptance 定向测试、S3 全链、LEGAL-DEMO 全链、真跑防污染、六段组装 golden 全部等价；`s3-assembly.golden.txt` 保持原始 SHA-256 `0047e71264f6ddb6aa25cf5ceb10aca7b4a0bd7aee913b9630bb8cafb79bcd07`。

## 实现留痕（2026-07-14）

- 搬迁前原 core demo/acceptance 定向 19/19；搬迁后本包 8 个测试文件 26/26（含新的依赖无环/反向依赖守卫）。
- `demo:s3` 继续产出 39,713 bytes redline，7/7 预埋考点，事件序列与指令结果不变；`demo:legal` 仍为 8 风险、7 确认 + 1 驳回、11 引用全命中、15 事件，golden PASS。
- 本包不引入新第三方 runtime；仅承接原 core 的 workspace 绑定依赖。
- 全仓最终门禁：`pnpm -r build`、`pnpm lint`、`pnpm test` 116 文件 1000/1000 通过。
