# C1–C10 · 共同验证账

实际测试在 [coordination.test.mjs](../../../app/tests/coordination.test.mjs)。不把第一片通过的局部性质扩展成完整provider conformance。

| 性质 | 本片证据 | 仍待 |
|---|---|---|
| C1 Child identity across retry/recovery | helper冻结原始输入，调用者改origin/ID与迟到结果不改结算；消息的同ID重试/冲突验证 | 持久child intent、provider query/restart尚未实现，完整C1未关 |
| C2 Child cannot widen grant | actions/resources交集、depth减一、tool逐次检查与取消关闭 | Matter policy/持久grant/approval escalation完整组合 |
| C3 Runtime child/session/lane≠Thread | Thread由人显式创建、同scope多Session、子执行无建Thread副作用 | native lane adapter尚未接 |
| C4 Invoke≠handoff | helper仅允许invoke；消息不创建目标Run/不转owner | 正式handoff事务 |
| C5 Child result cannot commit truth | helper只返回finding-only、undelivered/unaccepted；通信无Core调用 | 与真实Expert/Core proposal联调 |
| C6 Reducer preserves provenance/conflicts | permutation/duplicate相等，逐execution来源保留，同ID矛盾拒绝 | richer typed evidence anchors、synthesis联调 |
| C7 Duplicate delivery idempotent | concurrent sends、同ID异payload、SIGKILL outbox后恢复、再重启不重复 | 外部effects/broker不在本片 |
| C8 Late binds origin, never latest | exact source/target、CAS、close/delete/rebind拒绝错投、reply逆向lineage | 实际child/provider迟到与parent迁移组合 |
| C9 Execution≠delivery≠acceptance | 模型消息先permission；目标只进inbox、0自动目标Run；helper三字段分别记录 | provider acknowledgement/模型理解无法由delivered推断 |
| C10 Trace without raw content | 身份字段与三本账边界已定 | 未接OTel/trace bridge，完整causal chain未验 |

附加验证：schema6 global保留；固定 `6921dbd` schema7 store真实生成的含effort数据升级8；旧host拒8且不改字节；原始备份在独立目录以旧host恢复；非法账形拒绝；mailbox分页/重复query拒绝；model directory同scope；read_only inspector/执行一致；renderer精确静态准入。

浏览器和全量结果、作者/非作者范围见 [交付回执](../../../evidence/multi-agent-20260910/README.md)。所有fixture独立目录、local-fake。真实付费provider、OS sandbox、专业质量和G1–G5不在这些测试的接受范围。
