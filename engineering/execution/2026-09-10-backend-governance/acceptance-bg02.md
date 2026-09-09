# BG-02 首片验收记录 · Run 显式承接血缘

2026-09-10。裁定者 Fable；施工 Claude Opus（`opus-wo-medium`，[WO-BG-02](work-orders/WO-BG-02-run-lineage.md)）；只读探查 Sonnet（EX-BG2，固定 `e7e08e0`）。分支 `claude/bg02-run-lineage`，基线 `29e1eac`（产品代码同 `461ab12`），四次提交 `734ebee`/`244d620`/`c1e7595`/`e7e08e0`。合同 [run-attempts.md](../../../app/docs/run-attempts.md)，作者交付 [delivery-bg02.md](delivery-bg02.md)，作者证据 [backend-attempts-20260910](../../../evidence/backend-attempts-20260910/README.md)。

## 裁定

BG-02 首片**有界接受**并合入本地 `main`（合并提交 `4deffcf`，无冲突，无集成产品补丁）。接受范围：RuntimeStore 8→9，Run 记录唯一新增字段 `supersedes`，创建时设定且无更新路径，链不分叉，目标限 `unknown|failed|cancelled`，`mcp_effect_unknown` 目标拒绝，回执身份含血缘，不复制输入，迁移含精确字节备份与旧 host 拒绝。未 push，未部署。

## 核对结果

| 项 | 结论 | 依据 |
|---|---|---|
| 写权 | 全部改动在工单写权内；八份既有测试只改 schema 号/正则/标题；无新依赖 | EX-BG2 A |
| D01–D09 | 逐项确认；`app/core`、`app/web`、async、coordination、`index.mjs` 零差异 | EX-BG2 B |
| D03 统一 404 | 不存在与跨 Session 目标响应体逐字节相同 | `run-lineage.test.mjs:125-129` |
| D06 迁移 | 可升级列表 `[3..8]`；schema 8 的 coordination 保留不清空；备份 `wx`；旧 host 以 `461ab12` 的 store 实体验证拒绝 schema 9 | `store.mjs:329-341`，`run-lineage.test.mjs:264-276` |
| D10 日志头 | 命令、并发、SHA 分三行，实质满足 | EX-BG2 B D10 |
| 测试 | 分支 8/8、475/475（基线 467）；Sonnet 重跑 8/8、475/475，smoke 通过 | EX-BG2 D |
| 合流 | `main@4deffcf` 全量 **485/485**（含 CC-I 等并行合入），smoke 通过 | [合流证据](../../../evidence/bg02-main-integration-20260910/) |

## 待裁定项处置

| 交付 §5 | 处置 |
|---|---|
| 1 显式 `supersedes: null` → 400 | 接受。省略即无血缘；null 不是第二种写法。 |
| 2 `validateState` 文件级不变量弱于创建门（不查分叉、不查 completed 目标） | 接受为非阻断。文件由 host 独占写入并加锁，创建门是权威；文件级链唯一性列为 BG-02 后续项，不阻塞本片。 |
| 3 拒绝优先级按 D03 列举顺序 | 接受，已入合同。 |
| 4 `app/README.md` 与 `app/docs/README.md` 仍写 schema 8 | Fable 合流时补丁：v9 标题与说明、保留 v8 锚点、索引指向新锚点。Fable 作者补丁，未经非作者复核。 |
| 5 `store.updateRun` 无字段守卫 | 接受为非阻断；今日无调用点传入该字段。后续项。 |
| 6 `runtime.test.mjs:13` 标题仍写 schemaVersion 8 | 留待后续，标题非断言。 |
| 7 `supersedes` 随 `publicRun` 出现在 GET 响应与既有投影 | 符合 D07；UI 呈现另单裁定。 |
| 8 completed Run 重做、inspect recovery 提示 | 维持 rulings 文档待裁定。 |

## 未检项

并发同时承接同一 Run 的竞态（以 `store._mutate` 串行论证，未以竞态测试证明）；真实 MCP unknown 路径（夹具直接写 store）；真实 provider。

## 后续

- BG-02 后续项：文件级链唯一性、`updateRun` 字段守卫、测试标题修正，可并入下一后端片。
- BG-03 维持延后至 DS-04 触发；授权编辑器 UI 待 MA2-02 合流后按单 writer 队列进入。
