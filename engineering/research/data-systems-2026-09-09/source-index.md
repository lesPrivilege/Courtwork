# 来源、核验与采用边界

2026-09-09。有界核验，不是重新执行深度研究；没有复现论文实验、安装候选框架或逐项查遍报告所有引用。

## 用户来源

- [架构设计参考](chatgpt-conversation://6aa11cee-2670-83ec-a938-9c1b54a027d9)：接口返回两turn、三条文本，hasMore=false。初始书籍图片未检查；后一个turn只有授权研究的用户消息，研究答复未随会话返回。故以用户补充报告为研究正文，不称已读取隐藏研究过程。
- [报告原文](inputs/deep-research-report.md)：672行（671个换行符），字节/hash/15个显式URL见 [manifest](source-manifest.json)。原文保留内部引用标记；这些标记不能在仓库解析成来源证据，也不被改写成已经核验的链接。
- 当前用户授权的是理念消费与候选PR/roadmap。文中六周日历、阈值、POC和代码均是研究建议，不是当前执行指令。

## 本次补查的七个原始来源

| 来源 | 实际读取范围 | 支持的有界结论 / 处置 |
|---|---|---|
| [O’Reilly DDIA 2e目录](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/) | 官方图书页/目录，非付费全文 | 确认record/derived、非功能需求、encoding/evolution、local-first、streaming相关主题；不能由目录证明报告每项设计或门槛。元数据为February 2026，与会话“3月发布”不统一，本包不依赖具体月份 |
| [Local-First原论文](https://martin.kleppmann.com/papers/local-first.pdf) | 取得可检索原文，未逐页精读 | 留作本地持有/同步路线参考；本次不采纳银行例子或撤权机制的具体论断，不启动CRDT |
| [OPA官方说明](https://www.openpolicyagent.org/docs) | 简介与policy decision/enforcement分离 | 支持职责分离，不要求独立服务；Core已有检查时不默认引入OPA |
| [Temporal Event History](https://docs.temporal.io/workflow-execution/event) | 历史、恢复与版本/容量限制 | 支持研究持久执行的收益与成本；不把workflow history设为领域真源，不固化易变限制数字 |
| [ToolGate v1](https://arxiv.org/abs/2601.04688v1) | 摘要及版本信息 | 前置条件控制调用、后置检查控制symbolic state更新；不把symbolic state的保证扩大成现实业务或外部副作用可回滚 |
| [PCAA v1](https://arxiv.org/abs/2606.04104v1) | 摘要及版本信息 | runtime-neutral action/receipt是相邻研究；仅支持候选问题设计，不采纳其benchmark数字或声称已工业验证 |
| [Correct Is Not Governed v1](https://arxiv.org/abs/2608.12761v1) | 摘要及版本信息 | 摘要同时报告治理收益与role-separated transfer over-blocking；因此加入合法输入正例和阻断成本，不只测拒绝率 |

ToolGate/PCAA/Matrix均按研究来源处理，未全文验证或复跑；其性能不成为Courtwork结果。报告其余AgentSpec、ESAA、traceability、LangGraph、Automerge、Spec Kit、访谈与作者文章仍是未补查阅读线索。显式URL全保留在manifest，内部引用标记缺乏可解引用信息，不凭标题补造来源。

## 工程转译时必须修正的推导

1. **拒绝必须终止。** 原报告sequence diagram在Denied分支后仍画CAS；后端合同须以拒绝终止/抛错，保证无commit或外发。该图只可作讨论素材。
2. **兼容不等于忽略未知语义。** 对可选展示字段可约定宽容读取；动作、权限、验证、完成与持久schema的未知版本必须按能力拒绝或只读。原有exact-key规则不能全局放宽。
3. **事务边界要真实。** Core SQLite、Runtime JSON、Git blobs与远端系统没有自动共享事务。将图画为一条箭头不形成原子性；分别使用原事务、recorded provenance、恢复与必要对账。
4. **接受与适用性独立。** 旧材料变化可能使成果不适用于新工作，不意味着抹去过去的合法决定。输入失效、授权撤销、历史保留三者不能用一个stale字段代替。
5. **DDIA是系统方法输入。** 三面分离、通用ActionEnvelope、六周计划及99.9%/100%门槛均为报告作者综合/建议，不是DDIA标准。DS计划按具体消费者定义分母、支持矩阵和反例。
6. **治理不能替代验证，也不能无条件增加门。** 专业判断、规范正确性、操作系统隔离与模型质量各自需证据。保持现有单人操作与授权，不为所有普通工具或低后果工作新增批准层。

正式采用和工程证据仍回到 [Core合同](../../../docs/work-core/contract.md)、[PAPER](../../../PAPER.md)和 [current](../../current.md)。
