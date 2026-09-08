# 当前工程状态

Fable收尾 `bcbca1b` 已接收，fresh Astra实际Web↔后端联调完成；固定代码基线 `0a3b9b22f47f5605ccedc227106b0c17a4df6120`。修复通用工具权限误称写入与Home框外状态句错列，纳入只读R2解析切片；实际验证与未检项见 [联调回执](../evidence/final-integration-20260908/README.md)，候选推送/独立clone以该回执的sync记录为准。WK10b/WK11继续按Fable既有工单，不把作者19/27消费报告当作全部产品验收。

第二自足节点已在Astra隔离树合流：Fable `0a30780`（WK10a+r2）+ 接缝修补 `dbf12b3` → 代码基线 `7df1f6c486db8f1558dc0020ff4a62281856e207`。见 [独立集成回执](../evidence/node2-independent/README.md) 与 [fresh Astra交接包](release/2026-09-08/fresh-astra-handoff.md)。候选同步与新任务ID以交接包的实际记录为准；尚未push或公开发布。WK10b / WK11由Fable基于本次合流后派发。最新用户边界：Desktop优先，composer沉底不作为桌面验收要求，窄宗可暂缓，Continue等版面位置留Fable后续参考裁定。

以下迁移说明和表格保留前期已交付基线；第二节点新增结果以上述回执为准。

更新时间：2026-09-08（Asia/Singapore）。当前载荷已合入 Claude UI `dd65d2b`（包含 `4fab4bd`、`f8e3c19`）、Runtime Control Plane `8722259`、Brand `faef241`，以及 Astra 权限修复 `787bf1c`、Home composer 和 UI 编排收敛。已迁入并推送 `codex/fresh-courtwork`，导入基线 `9f13ca3`，远端独立克隆134项与恢复 smoke通过；实际同步结果以 [迁移回执](migration/2026-09-08/README.md) 为准。Legacy `main` 仍冻结。

## 已交付与验证

| 面 | 交付 | 边界 |
|---|---|---|
| Home | composer 主导，显式项目/写权限；草稿隔离与创建收据保护 | Home 10项反例、浏览器创建/等待/重连，非真实provider |
| 通用 UI | Claude 最新 polish，统一字阶、留白、卡片、Button、动作语义和对齐 | [编排标准](design/ui-composition-standard.md)；窄宽重排不等于完整浏览器缩放验收 |
| Runtime Control Plane | schema 4、资源/权限与 MCP 后端 | 后端134项已验；新控制面 UI 待施工 |
| Brand | 8个语义样板、5材质、40 SVG与独立动效组件 | 产品品牌语义注入由用户 merge 后首单交 Claude |
| 修复与回归 | 权限回滚/焦点，waiting 静态状态，Home创建失败后项目选择 | [最终 UI 审核](../evidence/final-ui-audit/README.md)：Home10 + UI20 |

品牌另有 [验收记录](../brand/evidence/ACCEPTANCE.md)：浏览器10项和独立组件13项。独验与作者观察分开登记；不据此声称真实模型、完整读屏/物理IME、全部触控/缩放或最终产品通过。

## 后续施工

1. 候选同步与远端恢复已完成，见 [远端恢复证据](../evidence/remote-recovery-20260908/README.md)。后续提交从当前候选 HEAD 开始。
   Claude 新增的 [Work Surface Kit准备输入](mvp/execution/work-surface-kit/README.md) 已原文迁入；旧SHA/路径是准备时快照，未自动启动其中工单。品牌首单顺序以用户最新安排为准。
2. 用户在 merge 后第一轮向 Claude 提交 Court Work 品牌语义注入；本轮已交付可复用的通用 UI 编排标准与品牌包。
3. Runtime 基础配置/状态应属于第一层 GUI，按 [Astra范围裁定](migration/2026-09-08/runtime-control-frontend-intake.md) 消费真实后端契约；不虚构 MOE 或未接入能力。
4. 用户在 Web UI 配置真实 provider 后补真实运行/tool/恢复链；Matter、完整工作纵切与 legacy distill 按既定边界推进。
5. `main` takeover 留待自足、真实链、legacy distill 与回退条件成立。Paper独立，固定入口 [PAPER.md](../PAPER.md)。
6. Experts / Extensions 的 [NDA 与热插拔本地研究计划](research/experts-hotplug-2026-09-08/README.md) 已消费 Chat/index：Luna 外部溯源与只读对照，Astra 编写验证设计、必要自研 PR 切片与 long-life 路线增量。此为研究/计划交付，新增 NDA、卸载后历史 fallback 与真实配对实验尚未实现或验收；后续复用既有领域状态和 runtime control plane。
7. [Long-life Roadmap](roadmap.md) 已按 SE 全场景/全交互重写：按治理厚度组合三条工作链、表面/执行通道、部署/所有权、长程协作与经验发布；R0–R5 和 NDA H0–H5 保留原责任。见 [来源与设计回执](research/longlife-2026-09-08/README.md)。此为架构设计，不新增已实现能力或关闭任何阶段门。
8. 前端讨论与GUI / Review Runtime Index已形成 [Work Surface跨层边界](design/work-surface-boundaries.md) 和 [来源对账](research/frontend-intake-2026-09-08/README.md)：明确Chrome/Domain/Expert责任、Review/commit/外部效果区别及共享组件adapter边界。Fable当前施工继续由 [第二轮接管与对应工单](mvp/execution/work-surface-kit/intake-round-2.md) 维护；本轮不变更其投影类型、写权或验收状态。
9. 用户已确定 [本阶段合流与两仓发布安排](release/2026-09-08/README.md)：Fable独立UI施工（含Preview extensions编排选型），待Fable竣工后，Astra从前端追溯harness、从harness补充前端，补齐后merge，再按 [fresh Astra交接包](release/2026-09-08/fresh-astra-handoff.md)交接独立任务进行build后的Web UI联调；完成后push CourtWork候选，再沿工程迭代/发布面双线推进至Pages与可构建GUI DMG。端云固定提交一致后准备独立网页GPT Pro全量review。对应 [集成检查](release/2026-09-08/integration.md)、[对外稿](release/2026-09-08/public-surface.md)、[review输入契约](release/2026-09-08/review-handoff.md)已备；当前不记作两笔已完成、已推送/发版或已提交review。
10. 用户追加的材质/层级与局部motion、hover溯源进入 [UX Polish研究包](research/ux-polish-2026-09-08/README.md)：Luna只读盘点index、旧Polish来源和当前整合候选，Astra整理12个细粒度绘制/消融片段，供build联调后消费。遵守WK51–54与最新选型；报告发现整合快照`2726805`的desktop media未闭合，列为polish前首项复核。本轮没有新的产品polish实现或像素验收。

## 等待Fable期间的隔离后端切片

2026-09-08 用户允许在Fable收尾回报前推进后端自研；Web联调仍暂停。BE-5 / Runtime R2 的 [显式声明式来源解析](../docs/runtime-control/source-resolver.md) 提供六kind的只读解析、精确hash和未核验来源边界，复用既有导入校验。已纳入上述联调代码基线，无HTTP/模型工具/UI入口；URL/仓库/包/路径获取和R3–R6继续未实现。证据见 [后端回执](../evidence/runtime-resolver-20260908/README.md)。本条不取代Fable收尾交付与之后的联调门。
