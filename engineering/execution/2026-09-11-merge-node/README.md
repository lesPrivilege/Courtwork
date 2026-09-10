# 2026-09-11 · 下一 merge / push 节点裁决

Astra 裁决；Luna 三路有界只读核账。用户本轮要求核本地工作树、commit 与 PR 消费，并明确当前阶段仍是**前端完成度与通用 Agent Harness 完成度**。本页为[唯一 roadmap](../../roadmap.md)当前串行入口的证据附件，不创建平行总队列。

接单固定本地 main `9097cbfd4b2b3b4c7b1117db5558b73568db67cc`，远端 main `9c8b64e85e1b4a906dcd23cd5be621da1ba90638`；本地领先57提交、远端领先0。现有产品 `app/ docs/ tests/` 与已接受 `654411e` 的比较以[完整SHA记录](git-facts.json)为准，diff为空。资料登记不算新增产品能力。共享 UI checkout 仍是 `claude/ex-ss1-secondary-surface@3a61336` 且dirty；本轮在隔离文档树工作。

## Astra 裁决：下一产品节点

**选择 CI-B/F × CS-01 × Summary 修补的有界前端组合；当前为 NOT_READY，不能将现成候选直接合推。**

候选输入固定为 `main@9097cbf` + `claude/cs01-ci-bf-integration@68b3341`（内含 Summary `eff0e41`、CI-B/F `d55d006/0aca122`、CS-01 `106330b` 与单增长机制整合 `65043fa`），再叠加尚未交付的 **D1/D2 修复 SHA**。待修复与同一最终组合的非作者验证就绪，Astra才可给出实际接收/推送SHA；本页没有虚构那个未来SHA。

- **D1焦点**：Open前先保留真实opener；不能在组件禁用触发按钮后才读activeElement。关闭文件/Run与Escape须返回可用原控件或明确的同scope回退，测试覆盖异步/重绘与已知Chromium147差异。
- **D2长路径**：SHA行的完整路径不能撑爆标签列、使值列为零或把Open推至约1000px以后。保留路径/hash可读、可访问和精确来源，不能以删除证据、改短fixture过关。长Unicode路径、窄卡/窄屏与大字均需真实布局检查。
- **WORK-3现在裁定**：采纳CS-01的内容驱动、两行起步方向。原80–96px是旧textarea高度门，候选约54.2px是textarea，整块composer约116px，不能混淆。依据原layout-ruling已授权Claude提出初始尺寸，且组合已有普通/大字、native-sizing/JS fallback、Home往返测量；**54.2不成为新的固定像素真值**。更新合同与WORK-3为两行内容可见、字号变化相应扩展、输入/工具/错误/发送不裁切、增长及上限有界，保留Home96/160和其位置锚点、Work180及既有短视口28dvh候选。只移除被新设计明确取代的固定高度断言，不删掉可用性验证或随意放宽阈值。作者测量支撑尺寸选向，最终产品接受仍须非作者在修复组合复验。
- **独验与组合门**：固定源码/证据manifest，同一组合验证D1/D2、单增长机制、Home↔Chat草稿/大字、1440/1280/390明暗、sheet焦点/Escape、正文/composer齐边、短视口与真实200%重排、STATIC已声明200与未知404、适用lint及完整回归。原712/712属于作者旧组合，不转记为本次PASS；Chrome152不复现不能覆盖147已复现路径。
- **边界保持**：Q1 read-state缺线、Q3跨客户端同步限制与原生宿主/软键盘/IME/VoiceOver的未验证范围分列；明确未支持不冒充通过。Q3旧删除后404只证明删除路径，不能写成通用撤权接受。

`796c3a5` 后续 Card/Entry 增量（`690af79/731ee5c/337e522/acafe2c`）本轮**不随旧Summary条件通过捎带接受**；单独固定浏览器证据后接续。EX-IC2 B仍是specimen/裁定，C等前述产品基线；保留Claude前端writer，Astra负责Summary缺陷/接缝与合流，写同文件时串行。Luna可领确定性的fixture/反例与另一作者的独验，模型判断或架构密集实现由Astra撰写。

机械预检：`main→68b3341`仅current文档冲突；`68b3341→796c3a5`自动合并干净。详见[merge-preflight](merge-preflight.json)。这不关闭上述门；current冲突按新当前状态与历史归因共同保留，不使用整文件ours/theirs覆盖。

## Harness 下一节点

并行推进**P00式本地事实清账**，产品接收仍由Astra串行。已收到的 `f1700fb0…` 是ZIP hash，不是commit；该包24项/13卡结构可核，localDispositions均未设。后版 `ab8c14cb…` 的316条/14卡字节缺席；不能混P编号，也不能将归档等同于逐项架构接受。[接收包](../../research/harness-pro-2026-09-10/received/f1700fb0/receipt.md)与[回收范围](../../research/harness-pro-2026-09-10/return-coverage.md)继续持有来源事实。

Astra选定首个通用Harness产品候选为 **MCP结果保真与目录/SDK接缝的最小修补**：

1. 先固定实际安装SDK版本、CW调用链及有界loopback fixture；当前 `mcp-manager.mjs` 在content非空时不附structuredContent，是本地源码可见缺口。分别证明模型输入、事件持久化与GUI Inspect中的表示和来源，不把模型侧补字符串当全链已保真。
2. 目录是否需主动分页必须用实际SDK真fixture验证；不能仅根据listTools/listResources/listPrompts调用形式推断。上游参考代码仍是donor，不直接复制为生产实现。
3. 将工具报告失败与远端effect是否已发生分开；Luna指出isError分支不触发onUnknown，但不能因此把每个isError机械改成unknown或成功。先冻结结果/效果与重试边界，未知效果不自动重放，沿现有service/runtime owner。
4. RV26-Q03的publication/lock仍开放，单独冻结失败点及进程反例，沿store/service单writer接收；不把它附赠进MCP小PR。Q01/Q02已有限接收，不重复施工。
5. 已存在Pi、compatible连接和compileControlContext继续复用。行为等价HarnessDriver/WorkBridge、显式输入/prompt/skill来源、用户维护文本memory、受限web fetch及GUI，按P00实际缺口逐片接续；本次不宣称这些纵切完成。

这是本地候选取舍，**不冒充已消费缺失后版Pro的P01/P02**。完整后版缺席不会阻止普通源码核账与已有授权的有界缺陷修补；会阻止按未知工单作关键架构迁移。

BE-41 `30fd470/4c2a56a`保留后端有界交付，前端version0/source fallback、expected snapshot与空页token未接；它不是通用Harness优先门的前置。第二runtime、Rust、MAS新实现和Semantic Work Core/Spark深化沿稳定节点后置。

## PR 与 commit 消费

| 项 | 当前证据 | 裁决 |
|---|---|---|
| 已接受本地PV/SD、VG01及后续文档 | 本地main领先远端57；产品与固定654411e相同 | 已接收事实保留，不能称这57项都未验产品；push时须确认精确目标与差异 |
| CI-B/F、CS-01组合68b3341 | 作者712/712及15/15、21/21；D1/D2未修 | 下一产品节点，先修再独验 |
| Summary r2 796c3a5 | Card/Entry静态有界复核，D1/D2原路径仍在 | 单独后续消费，不借旧条件通过 |
| BE-41 4c2a56a | 代码30fd470，已有独立6/6与相关46/46，未入main | 清洁接收点后置，非Spark纵切完成 |
| RD-005 0c5d224 | 纯研究/分工/来源索引 | 可随本轮文档核账接入本地main，不计产品完成 |
| PR [#1](https://github.com/lesPrivilege/Courtwork/pull/1) | OPEN Draft；head a2e2d3c；对远端main为DIRTY，无review/check | Benchmark合同后置；唯一补丁未在main patch-equivalent消费；不按PR总diff重合旧基础 |
| PR [#2](https://github.com/lesPrivilege/Courtwork/pull/2) | OPEN Draft；head bd1f815；base是#1分支，CLEAN仅对该base；无review/check | Pages叙事后置；4803ea4/bd1f815尚未patch-equivalent消费；不因为CLEAN称可合main |

远端状态是[2026-09-11本地时间快照](remote-status.json)，不是永久结论；[#2本地分支头d804883与远端bd1f815的差异](worktree-inventory.json)也须保留，不能用本地最新头冒充远端PR内容。本轮不更新或关闭这两个PR。

## 本轮收尾与下一次执行

本次范围是核账、架构取舍与可执行的节点条件，没有产品实现/浏览器验收。Luna原始观察及Astra处置见[luna-receipts](luna-receipts.md)，全量工作树是[portable inventory](worktree-inventory.json)，Git事实见[git-facts](git-facts.json)。

文档检查后把RD-005与本裁决快进接入本地main，保留所有作者工作树；产品merge / remote push以本页前端修补组合门为下一执行点，本次不执行。该判断是当前NOT_READY结果，不是再次请求用户批准。现有Pages workflow只有workflow_dispatch可deploy，普通push与部署仍分开。后续执行前重查本地/远端SHA、目标分支、候选scope、dirty文件及归因；不得force push、整树重合历史分支或默认清理工作树。

## 本次验证

作者文档检查：789份文档/3616条本地链接通过，git diff --check通过；inventory的187树/27 dirty/77 ahead、基线一致性、commit引用及portable标签核对通过。主线app/docs/tests与已接受产品的相等检查、两项机械merge预检及远端PR读取均已存JSON。工作树采集不是全仓原子快照；最终接收前必须重查选定ref。没有执行前端修复、浏览器、产品全量测试、真实provider或迁移。Luna本次BE41启动失败与来源包结构校验单列在回执，不计作本次产品通过。
