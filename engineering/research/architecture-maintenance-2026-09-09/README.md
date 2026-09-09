# 运行时局部解耦与长期维护：研究消费与后续设计

2026-09-09。用户要求把 [架构插件化调研](chatgpt-conversation://6aa10937-9ad0-83ec-aaca-a63e68fe5969) 一并入账，评估后形成后续 PR、roadmap、局部选型 index 与前后端合流 Design，随后提供 `handoff.md`。本包完成研究消费与设计，未启动A…F产品实现、安装依赖或真实provider验证。

基线 `main@4c1c4205a4bc9479e1699471f40342d85cbc2b75`。本轮来源是一轮完整问答、两条消息与366行补充交接文档；后者按原字节保存在 [inputs/handoff.md](inputs/handoff.md)，是冻结来源，不是执行命令或当前状态。原研究的 `62556b7` 是历史快照，不能覆盖本地主线。[来源索引](source-index.md)区分原始引用、补充核验、未检查内容与采用处置；[manifest](source-manifest.json)保留确切hash和ID。

## 评估结论

采纳稳定契约、局部替换、可独立复现的维护单元。继续使用现有Pi运行循环、Core提交边界与前端投影；优先做最终请求/缓存基线，再做两项只读慢任务的异步纵切。生命周期和UI贡献按这条纵切暴露的缺口扩展。各单进入 [既有路线](../../roadmap.md) 的M01…04/M08…11/M14与Runtime R3→R4→R5，不重新建立总路线或正式状态账本。

| 输入建议 | 本次处置 | 可消费交付 |
|---|---|---|
| A 能力与来源盘点 | 当前路径/版本有界核对；完整端到端组合矩阵仍待施工 | [选型及来源索引](source-index.md) |
| C 请求与缓存 | 先离线最终出站payload，再有界在线测量；不承诺100%缓存命中 | [缓存与维护契约草案](maintenance-contract.md) |
| B 原生async与持久任务 | 区分native/adapted/unsupported；host管理归属、结算、交付，Core管理接受 | [PR计划](pr-plan.md)、[合流Design](integration-design.md) |
| D 生命周期 | 默认安全边界切换，撤权优先；配置/代码/数据/外部补偿分开 | 同上 |
| E 前端贡献 | 复用当前Run/activity和Work Review；宿主独立历史read path | [合流Design](integration-design.md) |
| F Agent维护 | 以独立CLI、固定fixture、非作者复核演练；不自改验收标准 | [维护包与演练](maintenance-contract.md) |

局部模块先用普通接口解耦。package是分发单位，capability是行为契约，instance是激活实例，invocation是执行身份；名称分离不要求立即增加四张数据库表。一个包可提供多种贡献，但安装/声明/激活/模型曝光/执行授权各自成立。同进程扩展不构成安全沙箱。

## 与上一单合并消费

[本地治理准备包](../local-governance-2026-09-09/README.md)的LG-01负责Intake捕获与rendition，LG-02负责索引/context，LG-03走Core候选决定；本包AM-B只处理这些慢工具的执行与交付语义，不重复造Intake、OCR或来源数据库。上一单EX-01的控制需求由AM-B/AM-E落实，不另建两套任务协议；EX-02的多agent并行仍等瓶颈证据。

[ES-00](../../execution/2026-09-09-execution-state/backend-contract-draft.md)继续只处理受信Run-recorded artifacts的确切字节与候选文件版本集合；异步完成不能直接产生已接受文件。Intake sidecar与现有ArtifactHistory写权仍分开。已有producer缺席读取证据不扩大为完整卸载/重装/升级矩阵通过。

Astra负责合同、架构与集成；Luna承担有界来源/源码核对和可独立验证的施工。前端由既有单写者串行。实际产品进度留 [current](../../current.md)，FE-03/04、BE-17/18界面接入、ES-01、G1–G5不因本包完成改变；Paper版本仍由 [PAPER.md](../../../PAPER.md) 固定。

当前Run重启恢复为unknown、active期间配置/扩展mutation被阻止；AM-B的任务恢复与AM-D的新旧代际并行都是待实现差额。[当前源码映射](source-index.md)已单列，不把本地Promise当成持久任务。

[文档校验与有界非作者复核](verification.json)记录本次范围；未运行产品测试或模型评测。
