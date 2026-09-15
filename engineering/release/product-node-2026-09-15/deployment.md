# 发布回执与下一轮开工基线

2026-09-15 · 用户在上一轮本地交付后明确授权push、部署和登记下一轮基线。Astra执行发布与接续登记；本轮没有产品施工。

## 发布身份

- 公开源提交：`fe7f317b9e14d3ceb1692e1e565b6b8ac71baffe`，已从本地main推送origin/main；推送前远端为`e8f02dd1152acc9e184a43afdba28f6138921bff`，没有强推。
- [Pages手动发布](https://github.com/lesPrivilege/Courtwork/actions/runs/34946272671)：`workflow_dispatch`，固定上述提交，`allow_pending_captures=false`。build与deploy均success，完整状态见[Actions回执](pages-run.json)。
- 站点：[CourtWork](https://lesprivilege.github.io/Courtwork/)。本轮发布README与Pages叙事及产品节点，沿既有GitHub Pages流程。
- 产品源码最后变更仍为`496af6a4aa3232de91c05a5a045885858454430e`；产品媒体/安装预览固定`fd96f96bc40725e301a4c92e0f2f50fd3245458c`，基础合成标本固定`9e5384fcabdac432259b3ffab7928251bea49859`。没有重拍截图、替换安装来源或重做产品实验。
- 本轮构建内容摘要`site_sha`为`14282ab98f1ec144c8cccfd2bbc566e316ce17bcd737c5b52592fd97fbc3af58`。manifest的`publishing_source_sha=b912218...`是构建脚本固定的历史发布文稿来源，不是本次workflow源码HEAD；以Actions的headSha识别本次部署。

上一份[消费回执](README.md)中的“不push或部署”是用户追加授权前的交付状态，由本回执接续；不改原稿或历史验证记录。

## 下一轮开工基线

唯一持久产品入口为Courtwork的main。公开源基线固定`fe7f317`；包含本回执的后续main提交只增加发布证据和开工登记。下一轮先核对实际cwd、main/HEAD、origin/main与工作树状态，再按[当前状态](../../current.md)→[产品方向](../../product-direction.md)→[架构](../../architecture.md)→原合同/证据阅读；不可只凭本页旧SHA推断现场没有新修改。

当前Host RuntimeStore schema15，Core user schema4 / bridge app schema5；Paper采用SE9.6 / `d78fd312955c1f594e59cbdcbb0d3074ac355940`。DWB计划schema16并未在main实施，实际迁移由RuntimeStore owner按新的施工HEAD裁定，升级数据不得交给旧Host。

| 顺序 | 原工单与第一动作 | 交付与验证责任 |
|---|---|---|
| 1 | [RD-006真实仓库接入](../../research/RD-006-deferred-workspace-binding.md)：先读原在途实现和[保全记录](../final-preparation-2026-09-13/node-20260915.md)，收束DWB-01/02绑定与读取，再串行DWB-04写入和GUI。BE-23/DWB-05普通无项目Chat已实现，不重做 | Runtime service/store持绑定与迁移，工具owner做每次访问校验，Access沿现合同。验证越界、撤权、root替换、冲突、旧批准、unknown不重放；每片作者交付后非作者Luna核查，GUI加人类目验 |
| 2 | [DF-04 / RD-009](../../research/RD-009-trusted-harness-extensions.md)：一个Host固定检查recipe，贯通CW内部读→改→测 | 固定cwd/env/命令、限时限输出、取消后settle及Run/call身份；先合成反例，再按授权做真实harness。外部Codex代跑不算CW执行证据 |
| 3 | [Chat原分片](../../design/chat-flow-2026-09-10/polish-slices-20260914.md)、[Presentation](../../research/review-surface-2026-09-09/presentation-gateway-20260915.md)：同一工作流聚合Run事实、差异、精确Preview及facts最小纵切 | Host、前端投影与动作owner分开；提问、执行授权、正式接受不混路由。Copy/Composer已有源码不等于Run聚合与视觉项关闭 |
| 4 | [Spark](../../research/spark-explore-2026-09-13/design.md)与[原义务闭环](../../research/obligation-closure-2026-09-12/README.md)：消费已有有界准备结果，完成一次中断后接手 | 保留来源版本、冲突、未完事项与下一动作；旧basis不覆盖新状态，重新理解工作不等于自动恢复进程或正式接受 |

RD-006原施工树在分支清理后以detached HEAD保留，起点`7e1a1ff047721e1ca6c871deba7f367ccea55a06`。上次审计为27个修改/未跟踪项，mount alias/API schema/path/链接缺口未闭合，repo_write与GUI仍后置；这是一份历史审计，下一作者必须重新检查实际状态并在隔离树迁入所需增量，不checkout/reset/stash原writer现场，也不把旧树整体当已接受提交合入。位置由`git worktree list`定位，活动文档不依赖机器绝对路径。

继续开放：Copy/Composer视觉与200%/焦点等原矩阵、DF-04、相应G1–G5。Agents API保持第二执行组合优先核验候选；当前Pi dogfooding继续，第二Runtime、完整Memory Broker、通用Notes/自动召回、Swarm与后台维护不是本节点总前置。此登记接原单，不创建第二roadmap、不启动真实模型或新后台任务。

## 验证与收尾

Actions完成：capture-ready、两次构建一致性、材质、图示manifest、公开录制/截图计划测试、仓库文档链接、站点子路径检查与Pages部署全部通过。GitHub提示Actions内部Node20运行时转向Node24的弃用提醒，本次未失败；后续workflow维护沿原发布owner处理，不改产品Node22.19基线。

[线上验证](live-verification.json)在2026-09-15 08:21 UTC完成：首页、Features、Chat、两份CSS、两份脚本、build-manifest与媒体manifest共9项HTTP200，全部与固定fe7f317本地构建字节相同。未重复上一轮已覆盖页面目验；此为发布一致性证据，不是新产品截图或全站浏览器回归。

最终文档链接及暂存diff检查通过，登记提交只包含本回执、证据与current/release索引；不会触发Pages站点源码更新，无需重部署相同页面。接收前重核共享main仍是fe7f317且干净，随后快进同步origin/main。发布回执只支持所覆盖的发布事实，不扩大上一轮作者目验或Luna探索为独立产品接受。
