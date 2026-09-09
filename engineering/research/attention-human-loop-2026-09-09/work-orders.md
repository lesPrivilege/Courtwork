# Human loop 可派任务增量

接 [AM-B 工单](../../execution/2026-09-09-async-loop/README.md)，不改原优先级。以下 HL 编号是 ATT/LG/DS 的配套单，不另建产品 roadmap。当前均 ready-for-dispatch 或 waiting-contract，未启动 Terra；Luna 仅探索。

| 单 / owner | 接缝与写权 | 明确验收 |
|---|---|---|
| HL-T1 / Terra：Gmail 增量同步反例包，ready-for-dispatch | 只写 `app/tests/fixtures/attention-ingest/gmail/`、`app/tests/attention-gmail-fixture.test.mjs`、对应 evidence；fixture 暴露可控响应，不写产品 cursor/数据存储/调度 | 重复和乱序通知、分页中断、history 404、丢 push、watch 过期/续期失败、账户串线、撤权401/403。cursor 未处理完所有页不得前移；恢复不重复生成同一 observation。先测 fixture 自身，接真实产品必须另验 |
| HL-T2 / Terra：GitHub 通知快照反例包，ready-for-dispatch | 只写 `app/tests/fixtures/attention-ingest/github/`、`app/tests/attention-github-fixture.test.mjs`、对应 evidence；不读真实 repo 通知、不引入 SDK | Last-Modified 原值往返、304不清空快照、动态 X-Poll-Interval、分页断点、同 thread reason author→mention、PR HEAD 改变、unknown reason 保留、participating 仅过滤；模拟不支持令牌/撤权/限流。不把通知消失当 resolve，不把单次轮询当完整历史 |
| HL-T3 / Terra：trace/eval 合成向量，ready-for-dispatch；分析器 waiting-contract | 先只写 `app/tests/fixtures/attention-trace/` 和 evidence；Astra 冻结字段后才可写 `app/scripts/attention-trace-report.mjs` 与定向测试；不写生产 evidence owner | 覆盖原proposal→人改→native draft→人又改→最终效果、approve 后 stale、重复决定、未决/缺时间、effect unknown、重复 surfaced、未展示抽样。delta 可还原原/新版本引用；缺标签不算正确/错误，接受率不冒充准确率；校准分析有真实标签与模型版本才输出 |
| HL-A0 / Astra：来源与 trace 接缝，主路径按需串行 | 冻结 provider/account/resource/version/observation 身份、范围与覆盖、去重、cursor 提交边界、raw_ref 保留/读取、ATT 关系与 schema，决定 owner 和迁移；Core/service/runtime 写权集中 | 同观察重放不重复，变内容不覆盖旧观察；分页失败不提前推进；scope 缩小立即限制读取；external ref 不冒充已验证内容；缺历史保持 gap。确定后才授 Terra 有界 decoder/adapter 生产写权 |
| HL-A1 / Astra：proposal / human gate / effect，waiting-contract | 复用 ATT 关系、BE-30 payload 绑定方法、AM-B 恢复、DS-04 对账；不复用 ATT resolve 或 Matter accept 作外发批准 | approve 后目标变化、payload 编辑、撤权、过期、dispatch 前/后死亡、ACK 丢失、重复 callback、readback 查不到：旧批准不穿透、unknown 不盲重发、补偿另授权；重启不重跑旧 prompt 伪装 resume |

每个 Terra 先行包必须包含可执行自测、输入输出说明和将来 host 接入点；只通过自测不能关闭 ingest/effect 产品门。使用 fake clock/barrier、临时资料、port0；不改 `app/server/{service,store,index}.mjs`、`app/core/`、`app/web/`、package/lock 或用户数据。并行作者不得覆盖他人编辑。

## 给 Astra 的首条完整验收样本

合成 GitHub review_requested 或 Gmail 待回复 thread → 固定版本观察 → 同一 ATT 对象 → 本地 proposal v1 → 人编辑为 v2 → provider 改版本 → v2 stale、旧批准拒绝 → 新提案明确批准 → fake provider 已生效但 ACK 丢失 → host 重启、沿同 effect 身份 readback 核对 → 展示真实结果，保留原提案、编辑、批准和核对链。

这条样本不要求同时上线 Gmail 和 GitHub。先选择一个 fake provider 打通；另一个做不同 transport/身份的兼容反例，待选择真实账户和接口后再接实测。Runtime Run 的结束和外部效果确认都不自动解决 Attention；必须沿现有合法 human action。

## 非作者接受与退出

Terra 回执给出 base/代码 SHA、精确路径、fixtures/命令、正反例与未检项。Astra 冻结合同并复读先行包；生产实现由未参与该实现者设计独立反例，再由 Astra 合流。只读 fixture 单不自动取得 service/schema 写权。与真实 runtime 接线后才按实际变更运行 app 定向、全量与 smoke。

停用 ingestion 停止新读取/dispatch，但已有 observation/intent/unknown 按保留合同处理；删除派生报告不删除原始人类决定。未经真实账户和动作授权，不创建 Gmail watch/PubSub、原生 draft、标签、GitHub评论/审查、外发或定时任务。Fable 仅消费已冻结事实与动作，不在本单安排 UI。
