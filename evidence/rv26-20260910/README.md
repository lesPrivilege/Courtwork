# RV26 · 基线与首片交付

基线 `12eb2208f931c1b530f54c7f947351a041c92c1d`，入账提交 `994fe3c`，Q01 产品/测试固定 `74ab7ca69a928b12631683fbf66341456dbdb67e`。Astra 掌架构、产品实现与合流；Luna `q01_tests` 撰写有界测试；另一个 Luna `baseline_explore` 进行非作者复核。[基线与队列](../../engineering/reviews/2026-09-10/README.md)保留33单依赖、写权、条件触发和原工单映射。

## RV26-00

原包 SHA256SUMS 全部通过，33 单依赖无环/无悬空引用；[可执行账本检查](../../engineering/reviews/2026-09-10/verify-ledger.mjs)与[输出](ledger-verification.json)还检查限定 BE-40 别名以及重复ID/依赖环反例。固定审查SHA之后只有设计文档差异，原 AM-B/MA/BG-02 有界交付继续复用，不从旧标题重复实施。Runtime10/Core4/app5 保持；架构当前入口纠偏，历史 evidence 不改。Luna 的源码/合同/既有证据只读清账不等于全部原门重跑。

## RV26-Q01

CoreClient 增加 ready/request 期限、pending/帧/stderr 上限，失败 transport 作废并 TERM→KILL/reap；关闭先拒绝新 admission，已排队请求不能跨代，完成关闭后仍兼容同实例新调用。已发送请求的失败标记 `outcome:unknown`，不自动重放；决定恢复查询原 request_id。语义见[合同](../../docs/work-core/contract.md)，命令、源码/fixture hash与未检项见[manifest](q01/manifest.json)。没有数据库/schema迁移。

| 验证 | 实际结果与证据 |
|---|---|
| 新故障矩阵红→绿 | 同组旧版1/13通过、12失败；补后13/13通过。[红](q01/lifecycle-red.log) / [绿](q01/lifecycle-green.log) |
| 真实 Core、治理迁移/崩溃恢复、Artifact读取 | 串行13/13通过，[输出](q01/core-tests-serial.log)。包含真实 SQLite SIGKILL 与 receipt 恢复；不是断电耐久性证明 |
| 文件完整性兼容回归 | 既有12/12通过，[输出](q01/file-compatibility.log)。未改变原完整性断言 |
| 固定SHA非作者生命周期 | 独立 detached `74ab7ca`，13/13通过、syntax通过、clean tree；[输出](q01/independent-lifecycle.log)。该 reviewer 未撰写产品或测试；范围仅有界生命周期 |
| 产品 smoke | 固定产品通过，[输出](q01/smoke-final.log)。local-fake；真实provider未运行 |
| 文档链接 | [输出](doc-links.log)，无失效链接 |
| Service 生命周期补验 | 固定产品9/9通过，[输出](q01/lifecycle-service-recheck.log)；不抹去并行全量中的失败 |
| 全量运行 | 并发4为534/535；并发2为532/535，[输出](q01/full-tests-confirmation.log)。未声称单轮全绿；失败涉及的完整文件补验均通过，详见下文 |

### 保留的失败与处置

初次并行定向出现 ready timeout，[原输出](q01/core-tests.log)保留。独立启动探针正常，串行13/13通过；未独立证明初次失败根因。

第一轮全量旧草稿519/522通过，3项失败暴露关闭后同实例重开的兼容回归，[输出](q01/full-tests.log)。Astra 恢复顺序 reopen 并增加 admission epoch，没有改既有测试；对应12/12通过。

修订后并发4全量534/535通过，[输出](q01/full-tests-final.log)。唯一失败为既有 T-BUDGET-1 的400ms运行预算，进入 waiting_user 前已为unknown；该断言原样单跑1/1通过，[复跑](q01/budget-recheck.log)。再以并发2跑全量确认，也触发 T-RESTART-1（6秒内worker尚未到waiting_user）、T-USAGE-5 的等待用例以及 Markdown accepted Artifact 测试的运行轮询超时。固定产品 markdown-core-read.test.mjs 随后2/2通过，见[输出](q01/markdown-read-recheck.log)；完整 lifecycle.test.mjs 随后串行9/9通过，见[输出](q01/lifecycle-service-recheck.log)；此前 main `2e9da09` 的对应两项对照2/2通过，见[输出](q01/baseline-timing.log)。当时主机 load average 观测为22.96/14.49/12.61，但未证明其为唯一根因。所有失败保留，不把分次通过写成单轮全量全绿。

T-RESTART-1 的旧fixture在worker-ready断言失败后未进入清理路径，留下两个仅属于本轮合成测试的worker；按固定PID及本轮脚本路径复核后终止，未操作其他writer进程。该fixture失败清理缺口和定时稳定性转Q04检查；没有修改本轮旧测试断言。

## 边界与后续

本轮交付仅 RV26-00 与 Q01，下一串行单 Q02；其余31单的 queued/conditional 状态以 dispatch 为准，不声称全部施工完成。前端单 writer、公开事实与 G1–G5 维持原门；未跑真实provider、个人数据迁移、浏览器接受、远端Actions或部署。OS不可中断工作下，TERM/KILL升级期限不保证任意进程在固定墙钟时间内被回收；client完成仍等实际close。`outcome` 为内部 CoreClient error 属性，本单没有声称新增HTTP字段。
