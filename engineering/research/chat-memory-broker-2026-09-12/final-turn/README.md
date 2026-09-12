# 最后一轮讨论 · 来源登记与采用

2026-09-12；接单基线 `6bfb23444944d5841df2e7a30806a8a6ddabfcb2`，独立分支 `codex/chat-harness-intake-20260912`。共享main有其他writer的未提交文件，本单不接收、不修改它们。Astra持有架构裁决；Luna快速召回与有界CSS实现。

## 来源与覆盖

引用对话“撰写Harness架构方案”，conversation `6aa52e8b-6208-83ec-8636-372c1f3e2786`，最后turn `1c5dabf7-7452-493c-84bd-9a7c14bf4eaf`，assistant item `8100dff5-a7bd-46c5-a674-cc66ad3be22e`。通过连接器读取最后一轮完整文本，保存于[原始响应](connector-response.json)；移除重复preview，其余turn文本保留。前两轮已由[Harness实施入口](../../../release/harness-implementation-2026-09-12/README.md)持有，本增量不重复分配P/DRT编号。

这是参考材料，不是本地执行指令。原文声称的三个内容引用/交接包未作为附件返回（attachments为空）；不声称本轮已收到、解包或校验它们。原文内部引用ID不能当可复核URL。本轮未独立验证政策、供应商接口、Electron或FTS具体行为；这些外部主张列为实施前待核，不转述为已证实的产品能力。

当前用户请求授权：登记最后一轮；独立tree；Luna负责快速探索与成熟有界实现，Astra负责架构与能力瓶颈；考虑前端先画再反推合同；消息次级操作hover/focus规则适用于其他Chat space。两张截图只作为动作密度与呈现参考，不授予截图中全部动作能力。

## 逐项采用

| 原文主题 | 本地处置 / owner |
|---|---|
| Chat容器与数据能力单列 | 采用四接缝：原生入口、来源接入、本地投影、披露桥接；沿[薄能力层](../thin-capabilities.md)，不新增Runtime journal |
| Provider → CW，与CW → Provider | 分别验证获取与披露；只读connector不证明能够读取上游完整聊天库 |
| 先离线保留再受治理读取 | 沿[RD-007](../../RD-007-resource-governance.md)与既有RG/LG工单；来源原件、阅读表示、派生索引、正式Core决定分别归原owner |
| 身份/版本/组织 | 安全域+本地稳定ID+原生定位（若有）；内容hash独立；集合关系不授予访问、不复制原件 |
| 渐进披露 | 目录→有界命中→精确片段→扩大原文；每层重验身份/grant，覆盖标题/计数/游标/缓存；旧版本不静默换新 |
| Agent可grep | Broker有界词法查询，不授shell；中文短查询、撤权后read、缓存重建列入验收；FTS行为需在实际锁定实现核查 |
| 可观察性 | selected、returned/disclosed、confirmed consumed分开；无原生证据保持unknown；停用不承诺删除已外发历史 |
| 容器研究 | 独立候选；账号隔离与外部浏览器回退；不以网页能显示证明归档或许可 |
| Spark / Attention | 来源变化产生准备候选和待判断事项；新版本不自动撤销旧决定，处理完成不自动关闭义务 |
| A–F实施片 | 作为既有工单的局部消费标签；B/C不等待容器E，D按真实通道另验；不增加DeepSeek GUI节点前置 |

## 下一步消费

[前端反推方案](../frontend-plan.md)先冻结可见状态与DTO缺口，复用共享阅读/composer/actions，不复用Attention的全局工作权限。后端唯一writer接收source/read/grant等缺口后再接线。先取得合成纵切，再验证实际导入/只读通道，最后进入资料变化工作闭环。Harness的GUI→真实Runtime替换→Work顺序保持。

本轮只有登记与共享消息操作呈现修补；数据导入、Broker服务、容器、真实connector与新Chat页面均未实现。验证范围见[本轮证据](verification.md)。
