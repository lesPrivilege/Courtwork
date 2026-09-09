# AM-B adapted read loop：实施与接受

2026-09-10。用户同意派单，Astra持架构、迁移与关键裁决。初始固定main `7c07ef6b5a19f0eb2c45b8894ab9911de87ea979`，Astra在独立树实现，Terra并行做协议/故障/离线human-loop夹具。后续从main接收前端与发布面准备，不修改其产品路径。

## 本单实现

Astra产品 `b4c98d4`，迁移字节修复 `35f4bf0`。正式合同见 [async-tasks.md](../../app/docs/async-tasks.md)。RuntimeStore schema5新增有界持久任务，Core3/app4不变；无默认adapter。只接host登记的不可变只读来源，来源ID/version/SHA绑定到原project/Session/Run/call。完整输入与授权后先记intent、再记至多一次dispatch；执行、取消请求、读取依赖、Runtime投递分别记录。原Run中断不重放，显式同Session新Run查询原任务；删除Session保留orphan。

真实host/Pi loopback证明：A/B分别launch后可继续独立workspace步骤，仅wait A不会等待B；未读终态或读取失败不会悄悄清除依赖并把final记为completed。Get/wait读取结果以原始UTF-8 SHA核验，tool.result事件与Runtime已记录回执同一事务；provider delivery始终unknown。任务成功不授予Core接受或解决Attention。

模型native async、MCP Tasks运行路径、自动续行/scheduler、完整domain绑定输入覆盖、真实provider质量与UI均不在本次实现。A1的有界owner读视图/鉴权路由已实现；T3专门前端消费packets与纯投影包尚未派，不将现有视图当作其验收。A2仍须另列provider和预算。HL生产DTO及写入/effect治理仍待Astra后续合同，不把离线脚本当生产摄取。

## Terra交付与修订

| 单 | 作者固定交付 | 本单接收范围 |
|---|---|---|
| T1协议 | `0c50503` + `aaba970` | [证据](protocol/README.md)，最终4项；Astra指出最初modern/legacy混形，Terra修正inline task、extension能力、ACK-only cancel并补真实Pi出站/partial SSE；只接最终形态 |
| T2夹具 | `1791e86` + `0c5db70` | [证据](fixture/README.md)，最终5项；Astra要求实际UTF-8 SHA与in-flight provider kill；T4再接真实host，不以fixture自测代替 |
| HL-T1 Gmail | `25a4b62` | [证据](../attention-human-loop-20260909/gmail/README.md)，3项离线响应脚本 |
| HL-T2 GitHub | `2452351` | [证据](../attention-human-loop-20260909/github/README.md)，4项离线响应脚本 |
| HL-T3 trace | `d409675` | [证据](../attention-human-loop-20260909/trace/README.md)，3项自测/4向量，只验夹具内部一致；Astra接收必要新增test文件写权，不产生生产trace owner |

以上代码在隔离树依次cherry-pick，原SHA保留用于作者归因。Luna早期只读复跑不是新产品独立验收；最终T1/T2复核及A1非作者新反例另列，不能混算。

## 验证与边界

- 作者 `b4c98d4` 全量328/328，见 [原始日志](integration/author-tests-b4c98d4.log)。后续UTF-8修复定向5/5；最终组合验证另记。
- 迁移只在合成目录进行。schema3/4完整验证后独占写原字节备份，已有文件/悬空symlink/非法UTF-8拒绝并保留原文件。旧host拒schema5、分目录恢复由非作者固定SHA反例验证。
- 本地原子rename沿现有RuntimeStore耐久模型；SIGKILL不等于断电耐久。可信adapter在进程内，不是OS sandbox，远端取消是协作式。
- 任务最多128/project、结果64KiB、投递128/task；目录16 adapters/128 sources/64KiB。达到上限拒新工作，未提供清理GUI或后台驱逐。
- 没有个人数据、真实provider、外发、账户接入、部署或Paper变更；G1–G5继续开放。

## 审阅中修正记录

Astra源码审阅补入非法UTF-8拒绝，防止读取字符串时发生有损替换后仍声称精确备份。T4非作者组合运行发现T2 barrier在persist前触发，T2原作者 `95f118d` 改串行atomic snapshot及persist后barrier；Luna另外发现重复job ID改输入不冲突，作者同期补409。原失败不归为Runtime恢复失败，也不以旧夹具5/5掩盖。

外层policy拒绝与消费依赖的接缝由Astra `74944d0` 修正：Pi beforeTool传callId，先记录有效同Session请求，再进入policy执行边界。初份Terra wrapper red fixture使用全Session历史tool计数，第二Run没有实际发出get；该初份红日志不支持其错误归因。最终接受必须使用修正为按当前user turn计数、显式核验tool.start/result的原产品红测与修复头绿测，另见独验回执。

## 非作者独验接受（有界）

- Terra T4原稿 `ab9e4b7`，Astra指出仅本地GET和新host reopen不足，补强后 `5e8106f` 在产品 `74944d0` 运行恢复7项与fixture/作者集合合计19/19。证据见 [恢复独验](recovery-independent/README.md)。四个真实host SIGKILL窗口均从落盘先固定ID，重启不新建Run/重launch；无远端记录POST reconcile仍unknown；有记录则释放原provider、查询原bytes/digest，再用同Session新Pi Run读取并记录delivery。旧schema3 `b26670c`、schema4 `7c07ef6` 在独立目录读取对应备份，schema4旧host拒5且字节不变。
- Terra边界测试 `3ab6b77` → `fec8a59`，同步改为有界barrier；最终真实wrapper反例 `4b8ba2c`。修正fixture在旧 `35f4bf0` 真正失败（completed），在 `74944d0`通过（unknown）；实际tool.start/拒绝tool.result、零query与未投递receipt均断言。最终独验5项+作者5项10/10，见 [独验、有效红测与绿测](boundaries-independent/README.md)。Astra未改这些验收脚本，产品修复由Astra独立提交。

这些是确定性适配层与恢复接受，不是模型调度质量、领域判断质量或native async接受。没有以模型脚本final作为任务完成的唯一依据。
