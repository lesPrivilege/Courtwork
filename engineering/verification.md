# 验证选择与证据边界

2026-09-14 · Astra裁决。适用于当前工单的验证选择；不替代Core/Host合同、既有Release门或具体测试命令。输入与核源另见[消费记录](research/ux-grammar-2026-09-14/README.md)。

用户登记的[前端测试技术栈与企业 Agent 讨论](research/frontend-testing-stack-2026-09-14/README.md)只作为历史输入索引；其中外部技术主张未在登记时复核，也不改变本页当前验证选择或采用栈。

先写出用户结果、可能失守的不变量和跨越的真实接缝，再选能够发现该失败的最低成本检查。测试绿灯只支持它实际执行的断言，不能推出架构合理、模型有能力或整个产品可用。没有实际变化、失败或未解疑点，不重复同一全量测试。

动代码前，在原任务合同写明拟声明的交付范围与退出证据：源码可运行、合成路径成立、真实Agent完成任务、人的正式接受分别陈述。它们不是可自动递进的等级；涉及哪项声明，就提供对应证据。作者自检、非作者复核与人的Decision分别记录实际身份和范围，探索报告不能代替独立验收。

| 变化与风险 | 首选证据 | 升级条件 |
|---|---|---|
| 文案、索引、生成物 | 对应源码审阅、链接/生成同步；可见改动看实际页面 | 布局、焦点或动作含义改变时检查相邻完整场景 |
| 纯投影、字段语义、状态分支 | 固定输入的unit或契约测试 | 失败可能发生在HTTP、持久化或SDK边界时加入该接缝 |
| 保存、CAS、权限、异步回执 | 实际Host/服务集成，独立合成数据，验证旧回执与当前草稿 | DOM状态、返回焦点或真实浏览器行为承重时再接GUI |
| 多面用户路径 | 确定性Host/GUI任务：实际操作、状态与用户结果 | 几何、层级、长文本、窄屏、明暗及键盘由实际浏览器检查 |
| Agent完成真实任务的能力 | 经授权的真实harness任务、产物检查与人审 | 按模型/API/工具/权限记录；合成provider不能代替能力证据 |
| 取消、恢复、丢回执与迁移 | 一个明确故障、一个不变量、独立数据与恢复结果 | 只有不同风险或未覆盖边界才扩故障矩阵 |

每条新增端到端路径，在原工单/交付记录注明六项即可：用户结果、跨系统风险、不变量、为什么更便宜的测试不足、固定输入与复现方式、运行成本与重跑触发。不是为每个helper新增审批表或测试框架。

实际浏览器验收保留探索空间：确认结果能否找到、状态是否可辨、操作能否恢复，以及完整页面的视觉关系。自动化用稳定语义定位和必要DOM事实；截图用于几何与视觉判断，不按每个动作全屏采图。工具的token成本随页面与采样变化，不采纳外部固定节省比例作为本仓事实。复杂或反复失败的路径才沉淀长期自动化。

真实harness验证与确定性GUI验证分开记账：前者回答模型是否完成任务，后者回答应用是否正确呈现和保存已知事实。运行、候选、授权与正式接受仍由各自owner决定。遇到可稳定复现的产品bug，优先把最小反例下沉到相应契约/集成测试，保留少量有价值的端到端回归。

交付证据至少标明源码与输入版本、命令/实际路径、结果、作者与非作者范围、未跑项和限制。复用旧证据必须说明源码相关性，不能把旧截图重新标为新版本。真实provider调用、敏感数据和外发沿已有用户授权；不因本文默认启动付费模型或新增后台任务。

当前采用现有Node测试、Host合成fixture与可用浏览器工具。外部文章提到的XState、Playwright CLI或其他框架只作可选方法；本裁决不引入依赖、新runtime状态或第二状态机。具体运行命令见[根README](../README.md)；UI覆盖按[前端连续性规范](design/agent-interface-2026-09-10/frontend-contract.md)结合实际变化记录。

当前指针检查随受影响的变更执行：核对schema及迁移owner、支持清单、媒体manifest、安装源码、论文采用pin和发行状态在各当前入口中的一致性；无关项注明不适用即可。链接可达不能证明这些语义一致。历史回执、标本与媒体保留原SHA，不为同步当前入口改写；论文采用版本仅在明确升级裁决后更新。PR索引已完成的核对与剩余差异，不复制另一份版本台账。

2026-09-16 · Claude 施工单 01（Workspace 绑定 GUI 与逐路径披露）：施工树 `claude-frontend-harness-20260916`；定向 `node --test tests/repository-binding.test.mjs tests/repository-candidate.test.mjs tests/runtime.test.mjs tests/durability.test.mjs` 43/43，`tests/workspace-card.test.mjs` 等 UI 定向 25/25，`npm test` 1086 项中 1085 通过；唯一失败为并发下 `review-core-client-lifecycle` 的 Core bridge ready 超时，与 00 片恢复树同一抖动，单独重跑 13/13，未改任何 Core 代码，`npm run smoke` 通过（local-fake）；语义/文案/交互/颜色/形状/材质 lint 与文档链接、diff 空白检查通过。浏览器目验用 Local test provider 与合成仓库走通 Home 草稿→首发绑定→`repo_read`→概览撤权→刷新；未做非作者复核、真实 provider、1440/1280、200% zoom 与读屏。恢复树（RD-006 在途）单独 `npm test` 1058/1059，失败项单独重跑 13/13。证据与边界见[01 记录](execution/claude-frontend-harness-2026-09-16/01-workspace-binding.md)。

2026-09-16 · Claude 施工单 02（私有 candidate GUI 与人的 diff 入口）：定向 `tests/repository-candidate.test.mjs tests/repository-binding.test.mjs` 34/34，`tests/candidate-ui.test.mjs tests/workspace-card.test.mjs tests/thread-projection.test.mjs` 16/16，web 子集 87/87；`npm test` 1093/1093（Node 25.9，并发 4）；copy/interaction/colors/semantics lint 与 diff 空白检查通过。浏览器目验（Local test，合成仓库）：Start private candidate → `repo_write` ask 卡（范围行 Private candidate · new file）→ Approve → Writes 1 → Review changes 对话框显示同一份 Host patch。写入结算的 GUI 呈现、冲突反例的 GUI 路径、非作者复核与真实 provider 未做。证据见[02 记录](execution/claude-frontend-harness-2026-09-16/02-candidate-write.md)。
