# Fresh Astra · merge后的Web UI联调交接

状态：用户已明确第二自足节点 `0a307802b61a6847ee88bfea870bdf340647caee` 交Astra独验合流；本轮接收的是WK10a + r2，WK10b / WK11等待合流基线。双向追溯与补齐正在隔离树进行，最终移交字段按下文固定。

## 移交时填写

- Fable最终交付：分支、完整SHA、交付/设计选择/契约路径、writer退出与遗留项。
- 双向追溯：关键路径→harness映射、harness→UI覆盖、必要补充提交、验证和未闭合gap。
- 合流：源分支祖先、完整merge SHA、冲突处理、实际修改路径；确认所需文档已在提交中，不能只存在于另一工作树的未提交文件。
- 验证：作者/独立验证分别列命令、环境、fixture、输出和源SHA；真实provider未跑明确`not_run`。
- 下一任务：项目、隔离工作树、起点merge SHA、独立数据目录和端口、任务ID；创建成功后回填，避免重复派发。

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
