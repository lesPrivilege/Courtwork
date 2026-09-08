# 前端讨论与 GUI / Review Runtime Index 消费回执

2026-09-08 · 用户要求在 Fable 继续施工时消费讨论与 index、落定文档。Astra 负责跨层架构裁定，Luna 负责本地只读核对与限定范围的官方溯源。产出为 [Work Surface 语义与组合边界](../../design/work-surface-boundaries.md)，接入 [Long-life Roadmap §5](../../roadmap.md#5-多种工作表面与执行通道)。本轮没有产品代码、依赖安装、合流或运行验收。

## 输入与权威

| 输入 | 身份与用途 |
|---|---|
| [原始讨论](inputs/discussion.txt) | 用户附件原文归档；SHA256 `a31e24b39a3e5b3d1bde66fbecb5e00b590df67a072cf5681c3e70bc7b713428`。其中角色分配、组件工厂及派发建议是待裁取材料，不自动变更当前 writer。 |
| [GUI / Review Runtime Index](../../mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md) | 与用户 Downloads 定本逐字一致；SHA256 `814ab9b0878f8ffeed851c7b9bd2a782c0aad3a7e1c32bf7618f595d30872d48`。复用已有输入，不再复制索引。P0/P1表示检索优先级。 |
| [Fable 第二轮接管](../../mvp/execution/work-surface-kit/intake-round-2.md)与对应 contracts / work-orders | 当前前端布局、契约与批次施工的维护位置。核对时已到 WK32–36；本回执不是其状态账本。 |
| [PAPER.md](../../../PAPER.md)、[Core 契约](../../core-contracts.md)、[Roadmap](../../roadmap.md) | SE固定来源及本地跨层约束。研究解释不构成 Paper 新版本发布或工程验证结果。 |

本地核对锚定 `codex/fresh-courtwork` 的 `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`，同时读取了活动工作树中的未提交 WSK 文档；因此这不是把所有研究输入归为该提交内容。工单/源码观察见 [Luna 本地回执](evidence/local.md)，随后的当前事实回到 [current](../../current.md) 和活动工单读取。

## 消费裁定

| 讨论/index提案 | 本轮落定 |
|---|---|
| Chrome集中公共基础设施，Expert复用组件 | 采纳职责复用；Chrome管理表面和共享入口，Domain / System of Record持有正式状态与效力。Expert仍承担Work Contract、verifier、版本与领域adapter。 |
| Observation / Elicitation / Permission / Review / Commit | 采纳交互分类；分开执行、请求、认识、机构效力与外部效果，不把五类宣称为全部专业语义。 |
| Inline + Inbox，同一个ReviewItem | 采纳同源投影与身份/版本绑定。索引的扁平status示意不覆盖已冻结的permission/question/outcome契约；outcome是计划中的只读摘要。 |
| approved / committed与外部动作 | 草稿接受、正式提交、发送请求和provider回执按真实协议留证。approved draft不能显示sent；actionId关联本身不保证不可变payload或原子提交。 |
| Calendar / MessageCard / Heatmap等通用表示 | 采纳schema→adapter→component边界。当前六种presentation primitives沿WK34/EX-WK5/WK9；Calendar、Message等由真实consumer和数据源触发，不提前冻结全套DTO。 |
| Expert = composition，声明layout | 作为界面复用方向；专业责任不能仅靠manifest。先由2–3个不同责任结构的consumer检验最小接缝，再考虑更广声明式组合。 |
| React / TSX / source-copy组件工厂 | 不构成迁栈或写权交接。继续既有原生ES modules；按现有工单消费成熟行为、接口与必要实现。 |
| 通用Review/commit与卸载后历史 | 真正领域缺口接入既有 [H1/H3/H4计划](../experts-hotplug-2026-09-08/pr-plan.md)，随后由单独前端单消费，不向WK3/WK4塞入未成立语义。 |

## 外部证据与消费入口

[Luna 官方来源回执](evidence/upstream.md)只核验三个切片：

- assistant-ui：runtime / protocol / framework分层与ExternalStore宿主状态边界；不据此推导持久Matter、权限或commit保证。
- Vercel AI Elements：源码复制分发与React/Next/shadcn/Tailwind假设；可消费组件行为，直接依赖另行判断。
- CopilotKit：governed action envelope、interrupt及恢复校验边界；应用后端仍须绑定确切proposal与版本、重验授权并定义提交/效果回执。

官方链接和访问日期逐项保留在回执。其余项目与P0成熟性判断本轮未复核；没有安装任何这些依赖。当前来源是访问时官方页面/主分支资料，实际引入代码前仍需固定版本/path、核对许可证及本地代价。

Fable 已消费的EX-WK2当前已进入ReviewProjection §6；较早研究快照中的“尚未消费”不再用于判断当前状态。WK32–36已采用Home三带、右栏卡片→tab与六种primitive，本文不恢复旧hero方案。当前工单的完整状态继续在其原文件维护。

## 验证边界

本轮核对输入hash、已有契约与源码接缝、限定官方机制及文档链接/差异。既有样本Core的Candidate/decide存在，不等于通用Review已接入；候选分支作者测试不等于当前HEAD独立通过。未运行UI、真实provider、专业Review、外发或卸载fallback测试，不关闭产品或Paper验证门。最终文档复核见 [final-review](evidence/final-review.md)。
