# AM-B-T3：AsyncTasks 纯投影提取与 UI 消费 packets

2026-09-10。有界实现单，作者交付；本目录证据不代表独立接受，不自称 Astra 已接收或已合流。

- 指定基线：`85693a6d185f284ecc68324e4dda6d7d677abb03`（main HEAD 与基线一致）。
- 独立临时 worktree：`/private/tmp/cw-am-b-t3-task-view`，分支 `codex/am-b-t3-task-view`。
- 产品固定代码：`184e3f0`。未 merge main、未 push、未部署；共享主树未 checkout/stash/reset，他人编辑保留。

## 范围（冻结设计，未扩大）

从 `AsyncTasks.view` 提取纯投影，交付可供后续 UI 消费的实际 HTTP packets。新增
`projectAsyncTask(task, context, options)`；`context = {sessionExists, adapter}`，
adapter 由调用方按 `task.adapter.id` 选出、只读 `version/sources`、缺席为 null；
`options` 沿用 `{result=true, deliveries=true}`。输出保持 schemaVersion:1 完全兼容。

优先级与字段：session 缺席 → `orphaned`；adapter 缺席或版本不匹配 →
`adapter_unavailable`；source ID/version/digest 不匹配 → `historical`；其余 →
`current`。projection 不查 store、不访问 adapter、不取当前时间、不写状态；返回独立副本。
执行终态、取消请求、Runtime delivery、`provider: 'unknown'` 逐字保留；不新增 accepted、
动作许可、自动恢复或 UI 文案推断。既有 authenticated list/detail/reconcile/cancel、
分页与 owner 均未重复建设或改动。

## 独占写权文件

| 路径 | 变更 |
|---|---|
| `app/server/async-task-view.mjs` | 新增，纯投影模块（唯一导出 `projectAsyncTask`） |
| `app/server/async-tasks.mjs` | 仅替换 `view` 投影实现并补 import；其余未动 |
| `app/tests/async-task-view.test.mjs` | 新增：9 项定向（纯投影 + 真实 HTTP packets） |
| `app/tests/fixtures/async-task-view/` | 新增：`synthetic.mjs`（手写合成文档/adapter）、`scenario.mjs`（port 0 真实 host 场景） |
| `evidence/async-loop-20260910/task-view/` | 本目录：README、packets、compat 矩阵、运行日志 |

未改 service/index/store/Core、策略、调度、schema、app/web、依赖、current、Paper。

## 兼容性：旧 view 对新投影（验收 1）

`compat-matrix.mjs` 在同一任务/上下文矩阵上分别运行「基线 main 树的旧 `AsyncTasks.view`」
与「本树新投影」，输出逐字节比对。矩阵 = 2 session 态 × 6 adapter 变体 × 3 任务态 × 4
options 组 = 144 行。

```
old sha256: 1bbfc4c3a1e5bb194385f2fa56de58f8be532e64f8ee8cc4840d47d981c3dfe5
new sha256: 1bbfc4c3a1e5bb194385f2fa56de58f8be532e64f8ee8cc4840d47d981c3dfe5
diff: IDENTICAL, rows=144
```

复跑：`APP_ROOT=<baseline-main>/app node evidence/async-loop-20260910/task-view/compat-matrix.mjs`
与 `APP_ROOT=<本树>/app …` 后比对（两个树各自解析依赖安装，不改变任何树内容）。

## 定向测试（验收 2–6）

`app/tests/async-task-view.test.mjs`，9 项。关键期望为手写字面量并注释解释，不以实现自身
生成 expected：

- current：完整 schemaVersion:1 字面量 deepEqual；键序固定（schemaVersion 在前、
  availability 最后）；返回独立副本、改输出不影响输入。
- 优先级：orphaned 在 adapter/source 同时陈旧时仍胜出；adapter_unavailable 在 source
  陈旧时仍胜出；digest/version/id 各自不匹配均 historical。
- options：`result:false`/`deliveries:false` 省略对应区段（list 形态键序到
  `execution,availability` 为止），其余字段不动。
- 空值与 prepared：`runtimeRecordedAt:null` 的 delivery 不被伪装成已投递，`provider`
  恒 `unknown`，旧 delivery 快照（低 taskRevision、running、null digest）不被投影
  “修复”为任务的新事实。
- 终态/取消并存：`succeeded` 保留 `cancelRequestedAt`/`cancelAttempted`；`unknown`
  保留 `host_restart` reason，无 accepted/权限/自动恢复/UI 推断字段；陈旧 source 不
  因结果存在而投影为 current。

packets 场景（验收 4）：真实 `startServer` + port 0 + 合成 adapter，经本地 Pi loop 两个
Run 产生 primary（doc-alpha/beta）与 foreign（doc-gamma）任务，再经 HTTP 读取。断言：list
省略 result/deliveries 且 count/分页不含 foreign；detail 保留 result+deliveries（provider
`unknown`、runtimeRecordedAt 已记）；坏/缺 token 401；跨 project detail 404；删 Session 后
读为 `orphaned`（结果仍保留）；adapter 清空 → `adapter_unavailable`；注册陈旧 source →
`historical`。独立合成数据，无真实 provider。

## 命令与结果

均在 `app/`（或仓库根）执行；日志见本目录。

```sh
# 定向（新增 + 既有 async）
node --test tests/async-task-view.test.mjs tests/async-tasks.test.mjs \
  tests/async-boundaries-independent.test.mjs tests/async-fixture.test.mjs \
  tests/async-protocol.test.mjs tests/async-recovery-independent.test.mjs
# => 37/37 pass            (targeted-async-tests.log)

# 全量
node --test tests/*.test.mjs ../tests/*.test.mjs
# => 355/355 pass          (full-tests.log；既有基线 346 + 本单 9)

# smoke
npm run smoke
# => status passed, realProvider not_run   (smoke.log)

# packets 捕获
node evidence/async-loop-20260910/task-view/capture-packets.mjs
# => 写 packets/*.json 与 capture-summary.txt
```

新增定向测试连跑 5 次均 9/9，无时序抖动。brand/web 材质与颜色 lint（tools/）不适用本单
改动（未触 app/web、brand），复跑仍 ok。

## 实际 packets

`packets/01…10`：list-primary（count 2、items 键止于 execution/availability）、
list 分页两页、detail-alpha-current（result+1 条 delivery，provider unknown、
runtimeRecordedAt 已记）、list-foreign（count 1，仅 doc-gamma）、cross-project 404、
unauthorized 401、detail-alpha-orphaned（删 Session 后 availability orphaned、结果保留）、
detail-gamma-adapter-unavailable、detail-gamma-historical。列表项均无 result/deliveries 键，
详情保留；计数与分页不包含另一 project。

## 未检项 / 边界

- 作者交付回执，不构成独立接受；接收与合流由 Astra 在 main 上进行。
- 真实 provider、native async、自动续行、UI 本体均不在本单；projection 只是可被 UI
  消费的读投影，不授予任何动作许可。
- 分页 owner、store/Core/service/schema/策略保持原 owner；本单未改、未复验其语义。
- 适配器 map 的 `clear/set` 仅在测试内用于构造 adapter_unavailable/historical 读态，
  属既有测试手法，不构成产品写权扩大。
