# Luna引用核对 · Astra处置

2026-09-15，基线main `7e1a1ff`；Luna只读探索，Astra整合并纠正telemetry路径日期。范围是[输入](visual-orchestration-input-20260915.json)召回表22项与额外Deck/Notes引用。本表衡量本地语义登记覆盖，不是逐条原Chat取证或当前产品验收。原召回没有逐条原始会话ID/链接；没有据此查legacy工作树。

| # | 二手召回项 | 本地入口与覆盖 | Astra处置 |
|---|---|---|---|
| 1 | 08-27 Work Extension | [9月8日输入索引](../../mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md)、[Expert](../experts-hotplug-2026-09-08/README.md)；部分 | adjust：接后续Chrome/Expert边界；08-27原文未取得。 |
| 2 | 09-01 Human Work Surface | [RD-003](../RD-003-work-surface.md)、[Core contracts](../../core-contracts.md)；已有语义 | adopt：回链，不将二手日期当原始采用日期。 |
| 3 | 09-06 Work Surface骨架 | [RD-003](../RD-003-work-surface.md)；部分 | adjust：接Session/Run/Context/Result现有合同，不另建骨架。 |
| 4 | 09-07 Kit/Expert composition | [输入索引](../../mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md)、[Expert](../experts-hotplug-2026-09-08/README.md)；已登记 | adopt：bounded composition沿原owner。 |
| 5 | Review Primitive Canon | [输入索引](../../mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md)；已登记 | adopt：回链ReviewItem与primitive，不把历史输入升为当前全量实现。 |
| 6 | Approval语义拆分 | 同上DEC-UI-04/05/09；已登记 | adopt：elicitation/permission/proposal/commit分流。 |
| 7 | Chrome/Expert边界 | [Work Surface boundaries](../../design/work-surface-boundaries.md)；已登记 | adopt：Chrome治理、Expert有界编排。 |
| 8 | UI Continuity Harness | [frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md)；已登记并调整 | adopt：以当前规范为准，不扩外部donor或golden接受声明。 |
| 9 | Spark可视化工作面 | [integration ruling](../../design/spark-surface-2026-09-10/integration-ruling.md)；部分且旧方案已调整 | adjust：Reports/Context path/Work mix无source的旧设想已撤回，不能按召回恢复；当前Spark能力看实际交付。 |
| 10 | Surface Grammar/Resolver | [interaction grammar](../../mvp/execution/work-surface-kit/inputs/interaction-grammar-2026-09-10.md)、[Atlas](../../design/atlas/README.md)；部分 | adjust：已有projection/control语义；未定位同名SurfaceResolver/SurfaceContribution正式合同，不假定已有API。 |
| 11 | Chat Projection/CS-01 | [Chat Space](../chat-space-2026-09-09/README.md)、[mapping](../chat-space-2026-09-09/courtwork-mapping.md)；部分 | adjust：逐能力看现行交付，自动Preview等候选不算完成；本轮延续Presentation节点。 |
| 12 | Secondary Surface Grammar | [SS1探索](../../mvp/execution/work-surface-kit/explore/ex-ss1-secondary-surface.md)、[overlay](../../design/home-composition-2026-09-10/disclosure-overlay.md)；部分 | adjust：rail/card/pane语义回链；旧S2宽面板缺口不自动变成本轮施工要求。 |
| 13 | Tab/Object组织 | [Tab grammar](../../design/home-composition-2026-09-10/tab-view-grammar.md)、[backend requests](../../mvp/execution/work-surface-kit/backend-requests.md)；部分 | adjust：navigation与object organization分开，历史BE-2不能冒称多文档tabs已交付。 |
| 14 | Browser三层 | [Browser候选合同](../browser-capability-2026-09-09/contract-draft.md)；部分/二手 | defer：三层命名与通用resource projection尚未取得独立正式合同，不能等同Computer Use能力。 |
| 15 | Context治理/Silent Continuation | [架构](../../architecture.md)、[Backend治理](../../execution/2026-09-10-backend-governance/README.md)；部分 | adopt / defer：Context/Matter边界已有；silent continuation未定位独立产品合同。 |
| 16 | UI Prior Art Index | [UX grammar](../../design/ux-grammar.md)、[Atlas](../../design/atlas/README.md)；分类部分覆盖，原名未定位 | adjust：回链现有索引，未据二手名称新建治理权威。 |
| 17 | Resource Surface | [RD-007](../RD-007-resource-governance.md)、[data surfaces](../data-surfaces-2026-09-13/README.md)；部分 | adopt / adjust：identity/revision/provenance/Binding已有；完整collection形态不是已接受能力。 |
| 18 | Backend能力可视化管理 | [Settings resources](../../design/settings-resource-management-2026-09-13/README.md)、[RD-009](../RD-009-trusted-harness-extensions.md)；部分 | adjust：Settings/Developer/Host原owner分流，不把完整Expert管理视为已实现。 |
| 19 | Context Window产品化 | [Context研究](../context-window-2026-09-11/README.md)、[ring合同](../../design/context-capacity-ring-2026-09-14/contract.md)；部分 | adjust：最近完成请求input与下一推理working set不同；Reserved/Free/residency不因公式出现成为canonical。 |
| 20 | Context diagnostics | [Telemetry](../../design/context-tps-motion-2026-09-13/telemetry-p1-20260914.md)、[frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md)；已登记/调整 | adopt：cache归Runtime/provider诊断，来源覆盖与unknown保留。 |
| 21 | Agent Run Surface | [Run登记](../../design/chat-flow-2026-09-10/run-surface-pr-20260914.md)；设计已登记 | adopt：继续原切片；局部Copy/Composer交付不等于Run聚合已完成。 |
| 22 | Chat States可视化 | [Presentation节点](presentation-20260914.md)；候选设计已登记 | adopt：接只读纵切；wire/schema未冻结。 |

## 未定位与本轮补账

- **Deck Surface Grammar v1：未定位。** Luna排除本轮输入/草稿后未发现同名本地文件或正式合同；本Chat只提供二手召回，原始材料未取得。Astra处置defer原名/历史采用主张，组成语义可回链上述Review/Atlas/Presentation；不新立Deck合同。
- **精确名称缺口：** SurfaceResolver、SurfaceContribution、UI Prior Art Index、Silent Continuation的同名正式合同未定位；有相关语义不表示拥有该API/完整产品。先保留来源缺口，不重复立项。
- **实质增量：** composition允许组合表、shape/intent/mode、精确版本导出与通用用户Notes/object-first recall，在[主裁决](visual-orchestration-20260915.md)逐项adopt/adjust/defer，并接Review Surface与RD-007。
- **Notes边界：** [Spark合同](../../../app/docs/spark-agent.md)已有Assignment/attempt内immutable notes；[Memory研究](../chat-memory-broker-2026-09-12/README.md)已有受控Memory语境。通用Note修订/跨对象binding/跨会话检索及自动写Memory尚无同等产品合同；本次不泛化Spark权限。

本核对没有取得22个原始Chat，也不声称所有历史材料已经完整归档。后续取得原始材料时更新原owner的来源与处置，保留本次未定位结论的时点。Luna探索不替代独立产品验收。
