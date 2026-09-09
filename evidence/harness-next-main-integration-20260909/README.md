# BE-30 / AM / ES-01 main 合流证据

2026-09-09。来源Astra从实际main `0b5ccd27e9d0be5940714e913f4fc197f9ec7a05` 建隔离树，合入 `codex/harness-next-round@95cfb165ed368e8b4c6afca7ab5c8c838cb4653c`，无冲突，无集成产品补丁。组合测试树为 `6f82e6c439838967d472d5e6f8de9d745511e2fe`；随后仅增加本证据及current/台账。

## 接受范围

- BE-30 `757ea76`：permission可选预期hash/toolCallId在实际resolve事务内比对；旧请求体兼容，ask_user不混入权限字段。前端尚需消费。
- AM `fe73001`：有界静态import边界与正负例。Luna实现、交付Astra复读，来源Astra审阅后在组合全量中复跑；不称完整JS解析或安全隔离。
- ES-01最终产品 `b1ff74b`：包括 `429a2f2` 及验证记录损坏修复。复用Core保存选定记录文件完整字节、manifest、输入basis与verification，接受事务重查并原子关联Artifact；跨Session及producer缺席仍可读取。固定文件profile和实际限制见[正式协议](../../docs/work-core/contract.md#es-01-opt-in-recorded-file-memo)。

来源Astra审阅Core迁移、文件完整性/接受/查询、adapter、service记录选择、Pi输入观察与permission CAS代码，以及作者与非作者回执。原两位Luna的独立反例发现和最终复验在[交付包](../harness-next-20260909/README.md)保留；本次属于另一作者的集成审阅和复跑，不把复用探针称为新设计的独立反例。

## 本次执行

| 命令 | 被测范围 | 结果 |
|---|---|---|
| `cd app && npm ci --ignore-scripts` | 既有锁文件，隔离安装 | 退出0；无依赖/锁文件变更 |
| `cd app && npm test` | 合并最新CC-W的组合树 | 290 pass / 0 fail / 0 skip |
| `cd app && npm run smoke` | 组合树的public runtime service | passed；local-fake；realProvider not_run |
| `node evidence/harness-next-20260909/be30-independent.mjs` | 组合树实际导入 | 七组passed；脚本输出commit为原作者硬编码标签，不当本次SHA |
| `ES_CODE_SHA=b1ff74b08c053fa0e3ab47fb20f510eabb9440e9 node evidence/harness-next-20260909/es-schema-independent.mjs` | git提取最终产品与旧a7a08f0 | 迁移、旧host拒绝、独立备份恢复、三组拒绝/无改写passed |
| `ES_CODE_SHA=b1ff74b08c053fa0e3ab47fb20f510eabb9440e9 ES_EXPECT_FIXED=1 node evidence/harness-next-20260909/es-core-independent.mjs` | git提取最终Core三文件 | 合法接受通过；result损坏、协调digest但缺证据、null Session、非法timestamp均拒绝 |

[机器结果](results.json)保存此次输出和本地日志hash。固定Core脚本确实加载指定SHA，三文件hash与组合树相同。作者279/279对应较早main基线；本次290/290为组合版本，不累加为产品完成度。

## 迁移与未检边界

Core user schema 2 / app schema 3；RuntimeStore仍4。只接收经过验证的旧Core1/app1或app2，备份存在则拒绝覆盖；旧host拒绝升级库，恢复仅在独立目录配旧host。429a2f2未集成的临时合成schema不是迁移来源。此次仅使用合成数据和独立端口，没有升级个人数据。

完整coverage仅适用于洁净Session且compaction禁用；额外输入/已有历史等保守为unknown，不能接受。PASS只证明结构规则。文件profile尚无catalog/创建GUI，旧memo renderer抑制为只读fallback；完整文件Review GUI、真实provider、专业质量与G1–G5仍待。未改Paper、部署或推送。

Attention任务在本次main合流后从最终SHA接续Core/service写权；main/current/台账仍归来源Astra，前端保持单writer队列。现有共享工作树的wk98-regression.json未纳入本次提交。
