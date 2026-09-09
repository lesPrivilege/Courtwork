# ES-01 实施回执

2026-09-09，基线 `fe73001c841ba3f5234b1071482739a093a114ab`，分支 `codex/harness-next-round`。本文件随固定代码提交；后继独立证据另列被测完整SHA。

已交付 opt-in `file-memo-v1` 完整后端纵切：当前Run持久record选择、ArtifactHistory完整字节导入、Core原子保存字节/manifest/固定依据/可信验证，结束后人类CAS接受，删除producer Session后重新绑定读取。权限allow、输出写入、候选保存和正式接受分别成立。旧memo/NDA默认合同保留。

[正式协议](../../docs/work-core/contract.md#es-01-opt-in-recorded-file-memo)列明profile入口、模型工具、HTTP分页与差异、limits、capability版本、迁移和拒绝码。Core2/app3、runtime4；迁移支持经过形状验证的Core1/app1与app2，POSIX锁下备份后原子升级，拒绝现存备份与畸形数据库，旧host拒绝新schema。

完整覆盖只允许洁净Session、实际Pi初始输入已冻结且compaction禁用；额外工具/steering等在执行或投递前降为unknown，marker失败禁止提交。结构验证不是专业质量判断。当前GUI仅只读fallback；旧action消费者无法决定文件候选。无catalog/FE、部署、外部发信、真实provider或个人凭据操作。

## 作者验证

- `cd app && npm test`：279/279通过，零skip；`npm run smoke`通过，realProvider为not_run。
- `node --test app/tests/execution-file-candidates.test.mjs`：12/12；连续性文件7/7，既有Core5/5（包含于全量）。
- Core反例覆盖身份重放、容量边界、字节/manifest/验证/column损坏、依据与policy变化、unknownschema，以及save/accept六个真实SIGKILL窗口的零或一次效果。
- 实际HTTP/Pi loopback从ws_write回执读取hash再提交，验证accept、跨Session、producer缺席；覆盖MCP调用前持久unknown、历史/compaction/ask/runtime_load/ws读取、steering与Stop竞态、coverage marker失败、丢失/损坏history及两种未record写入故障。
- `node app/scripts/file-candidate-fixture.mjs`生成[实际消费包](../../app/tests/fixtures/work-core/file-candidate-packets.json)，含ready/unknown/failed/stale/accepted/rejected/unsupported/missing-bytes/producer-absent。未检状态不冒充pending-unchecked：验证和保存同事务。

Astra拥有Core/bridge/service/Pi/迁移和最终集成；Luna实现有界adapter/policy，Astra复读并修正Unicode边界。作者验证不称独立接受。非作者迁移与Core反例复验已按最终SHA通过，见 [最终交付包](../harness-next-20260909/README.md)；其有界范围不冒称独立GUI或全部service验收。来源Astra负责最新main合流及current/台账，G1–G5保持未闭合。

最终复读补强：验证记录增加完整record摘要，防止result/reasons单字段损坏被当作可信PASS；accept再查file专属必需来源证据。新增损坏记录和协调修改checksum的无证据反例均拒绝，不产生决定。后继独验按包含修正的最终SHA运行。

私有bridge同时拒绝空Session身份和无效/无时区writtenAt，保留普通Run旧合同；这两项是主机可信输入的结构防御，非新增模型授权。
