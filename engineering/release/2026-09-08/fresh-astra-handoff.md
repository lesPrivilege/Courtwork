# Fresh Astra · Fable收尾后的真实前后端联调交接

**已接到Fable收尾提交 `bcbca1b` 并完成实际前后端联调。固定代码基线 `0a3b9b22f47f5605ccedc227106b0c17a4df6120`；验证、未检项与候选同步见 [最终联调回执](../../../evidence/final-integration-20260908/README.md)。WK10b/WK11继续按现有工单，本页其余第二节点数字保留作历史输入。**

状态：用户已明确第二自足节点 `0a307802b61a6847ee88bfea870bdf340647caee` 交Astra独验合流；本轮接收的是WK10a + r2，WK10b / WK11等待合流基线。双向追溯与补齐正在隔离树进行，最终移交字段按下文固定。

## 固定移交输入

- Fable最终节点：`claude/wsk-integration` @ `0a307802b61a6847ee88bfea870bdf340647caee`；用户明确本节点交Astra，WK10b / WK11等待新基线，不包含在本节点已完成范围。
- 双向追溯、BE-1…13裁取与证据：[node2-independent](../../../evidence/node2-independent/README.md)；产品补充`dbf12b3`，来源因果与上下文计数之外未改布局。
- 合流代码基线：`7df1f6c486db8f1558dc0020ff4a62281856e207`；合流后仅追加证据和交接元数据。源文件hash见`evidence/node2-independent/source-manifest.json`。
- 验证：全量139/139；布局30/30、Home7/7、RC契约20/20、反例9/9、视口36/36；Luna独验18/18及P2修正后的只读复查。真实provider与VoiceOver未跑，flaky未复现且无原失败栈，均保留未闭合。
- 后继任务：已提交创建“Astra 接手第二节点 Web UI 联调”，启动提交 `3926a5eda76f40552bdc8e310a12560b84c6bfb6`；创建请求 `client-new-thread:aca3c296-3eab-4893-953c-f9815adc7ebb`，待app返回正式任务ID。新任务使用从该fresh提交建立的隔离worktree，保存项目标签Courtwork不改变其fresh基线，也不使用冻结main。

## 新任务读取顺序

1. `AGENTS.md`、`engineering/current.md`、`README.md`、`PAPER.md`。Paper仍按仓内固定采用版本，不自动采用SE本地候选。
2. 本交接包、[阶段安排](README.md)、[集成检查](integration.md)，以及移交时指定的最终Fable交付、活动WK/RC契约与gap。
3. [Work Surface边界](../../design/work-surface-boundaries.md)、[UX Polish计划](../../research/ux-polish-2026-09-08/astra-polish-plan.md)。旧研究快照是线索；在merge SHA复核后才能作为修复事实。

## 可直接消费的任务说明

你接手CourtWork已完成双向追溯并合流的候选，承担架构、build和前后端联调。先核对本包填写的merge SHA、干净状态、交付与未检项，在独立工作树和独立数据/端口工作。不得重置其他writer工作树。若交接字段缺失，先从既有交付补证；没有最终合流提交时不要声称已经接收完成。

按实际package scripts建立可复现基线：当前命令为`npm --prefix app ci`、`npm --prefix app test`、`npm --prefix app start -- --data-dir <独立目录> --port <独立端口>`。当前无独立build script；以后若新增，记录真实构建命令和产物。检查静态模块、路由和浏览器加载，再验证Home→Run→工具授权/回答→Preview→停止/重连，以及runtime配置CAS、资源来源、上下文与MCP状态的真实往返。

保留已选前端设计，修复harness与前端之间的具体缺口。Core/权限/外部效果仍由既有owner决定，UI成功不能替代状态提交。真实provider仅沿用户已有配置与授权；不读取或复制个人凭据。对未跑的真实链、MCP步骤、触控与其他未检项逐项如实登记。

先复核研究中`2726805`快照的desktop media未闭合问题在merge SHA是否仍存在，再消费12个polish切片。遵守最终材质层级和品牌选择，以同条件基线、效果移除、最小修正及键盘/触控/reduced-motion验证决定变化。

完成有界修复和相称验证，作者结果与独立验收分开。按阶段安排同步CourtWork候选，记录本地/远端SHA及可复现证据。此交接不等于公开部署、legacy main替换、Paper发版或已完成[网页GPT Pro独立review](review-handoff.md)。输出实际改变、验证、剩余缺口与下一个明确入口。


## 最新用户编排边界

本轮不把桌面composer沉底作为验收要求。沉底范式仅限窄宗，移动端实现当前可以暂缓；产品以Desktop为主。Continue在宽宗的位置、composer进一步位置编排与其他版面由Fable消费用户新补充的参考后处置。已有布局脚本的PASS仅说明当前快照行为，不代表用户批准这些版面为最终设计。fresh Astra聚焦实际build、harness/UI接缝与恢复，不能把旧交付的沉底描述提升为新设计要求。
