# 06 · 能力管理必须被下一次运行真正消费

2026-09-16 · Claude（Fable 5.1）裁决、Host 提案账本与事务实现；Sonnet 5 做只读勘察、回归套件、恢复测试与 Workbench 复审块。消费 [Developer control panel](../../design/developer-control-panel-2026-09-13/README.md) 与 [声明式 Skill 提案原片](../../research/gui-agent-control-plane-2026-09-12/skill-proposal-slice.md)；owner 回写见两文末。

```text
Task / scope: 第一段：MCP / Skill / 本地 Plugin 三条链的回归证据（保存≠启用、启用≠已用、历史绑定不变）；第二段：BE-6/BE-7 首片——Agent 提案 → 人审精确修订 → 配置队列内一次 CAS put → 下一 Run 编译与显式加载留证
Base SHA / branch: 05 片末 f3bbb0a / claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；Sonnet 5 写 capability-consumption / runtime-proposals-recovery / runtime-proposals-view；非作者复核与人的目验未做

Owner fact + contract: RuntimeControlPlane 持有 runtime-control.json（revision、CAS、原子写、audit）；Run 创建时 control.bind 冻结 runtime.bound；runtime_load 留 runtime.context.loaded；配置变更在 #withConfiguration 队列内并受 hasActiveRun 冻结。提案账本 runtime-proposals.json 只持有提案与决定回执（自己的 revision），不是第二个 registry；resolver 给 contentSha256 / artifactSha256 与 frontmatter 校验
比对结论（Sonnet 只读，作者复核）: 三条链在 control-plane / local-extension-intake / release-mcp-failures 已有端到端测试，无缺步；缺的是"同一份证据同时陈述四个事实"的回归与账面；提案概念此前完全不存在（只在 source-resolver.md 以 R4/R5 点名）
Semantic / projection / control / placement: 模型只得 runtime_propose（TOOLS 成员，曝光可配，各模式 allow；作者取自真实 Run）；review 的九个字段与 proposalId/revision 整体 hash 为 approvalSha256，Apply 必须呈交它；Apply 顺序：requestId 重放 → 状态/修订/阻塞/摘要核对 → 持久待决标记 → 一次 CAS put → 回执；失败清标记回 proposed（配置未被碰）；启动 recover 按配置 audit 结算 applying；Reject 持久且不改配置；Edit 出新修订并使旧摘要失效；Rollback 留作后续人类请求。Workbench › Instructions, skills and references 末尾一段 Proposed by the agent：行摘要（标题、local:<name>、run 短 id、修订、状态词），展开读 Source · Target · Change（diff-view 渲染统一 patch）· Permissions · Context · Trust · After apply，动作 Apply / Reject，活动 Run 时 Apply 禁用并写 Available after this run ends.
Affected UX rule IDs: UX-02（Save 不是 enabled，enabled 不是 used；文案分列已录入/已曝光/已绑定/已加载）、UX-05（活动 Run 冻结同一句）、UX-08（模型文本"已创建"不能进 installed list；只有人的 Apply 改配置）
Nearest precedent: changeRuntimeControl（队列、冻结、CAS）；repository binding 回执（requestId + requestHash 幂等、revision+1 不变量）；credentials pending marker（持久待决 + 启动结算）；Runtime Workbench 的 details/settings-row/h5 解剖；diff-view（candidate diff）
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: PUT /runtime-control 合同不变；曝光规则不变（Apply 不设覆盖）；策略不变；历史 Run 绑定不变；Skill 脚本不执行、allowed-tools 只是声明
Intentional changes: TOOLS 增 runtime_propose；新文件 runtime-proposals.json；五条 /runtime-proposals 路由；Workbench 新一段；run-rows / run-activity 认识 runtime_propose
New terms / primitives / dependencies: 模块 runtime-proposals.mjs；`diff` 8.0.4（已在依赖集，pi 亦用）用于统一 patch；copy-convention §3.3c 八行；app/docs/runtime-proposals.md；api.md 五行与一节
Exceptions: 只收 skill、只落发起 Session scope；无 URL/仓库/路径扫描；Rollback 未实现，完整 BE-7 不关闭；Hook/视觉/浏览器/桌面/完整包安装器/有界 subagent 不在本片
```

## 提交

| 提交 | 内容 |
|---|---|
| `334848c` | Host：runtime-proposals.mjs 账本与事务、runtime_propose 工具、五条路由、启动恢复；runtime-proposals 测试 3 项（链、无效/超限/编辑/拒绝、CAS 冲突与幂等冲突）；api.md、app/docs/runtime-proposals.md、copy-convention §3.3c |
| `c069433` | 第一段回归：capability-consumption 测试 3 项与证据 JSON（MCP dispatchId、Skill 加载正文逐字相等、Plugin 工具真实结果；历史绑定不变） |
| `6df4007` | Workbench "Proposed by the agent" 复审块（diff、Apply/Reject、冻结与过期状态句）；run-rows / run-activity；runtime-proposals-view 测试 |
| `43d498e` | runtime-proposals-recovery 测试 3 项（活动 Run 409 active_run、标记后崩溃回 proposed、put 后崩溃结算 applied 且不重复 put） |

## 作者检查

| 检查 | 结果 |
|---|---|
| `node --test tests/runtime-proposals.test.mjs tests/runtime-proposals-recovery.test.mjs tests/capability-consumption.test.mjs tests/runtime-proposals-view.test.mjs` | 3 + 3 + 3 + 7 全部通过；view 测试随 Host patch 改带 git 头后重指 |
| 相邻套件（control-plane、runtime-*、governance-*、permission、release-*、product-semantics、semantic-guards、static-web-manifest、architecture-boundaries） | 86/86 |
| `npm test` | 1143 项中 1142 通过（Node 25.9，并发 4）；唯一失败为核心 wire golden 看见新工具 `runtime_propose`，沿 Spark 先例在 golden 之外单独断言该工具并过滤（`5fc97b6`），重跑 3/3；golden 文件未改 |
| lint | interaction / colors / shapes / materials / product-copy / semantic-consumers / doc-links 通过 |
| 浏览器目验（Local test Host，8861） | Chat 里发 `/fixture script [{runtime_propose…}]`：Execution · 1 successful tool action，账本出现 `local:paging`（Awaiting review），配置 revision 不动；Settings › Developer › Runtime › Instructions, skills and references 末尾 Proposed by the agent · 1 awaiting review，展开行读到 Source（skill · 71db3ccbf532 · 171 bytes · unverified · agent-created）、Target（configuration revision 0 · New resource）、Change（8 added, 0 removed 的 diff）、Permissions（allowed-tools declared: ws_read (grants nothing)）、Context（59 / 171 characters，Tokens are not estimated）、Trust、After apply；点 Apply → Applied at configuration revision 1，行状态 Applied，摘要 0 awaiting review；同 Session 再发 `runtime_load local:paging` 的 Run：binding revision 1 含该资源，`runtime.context.loaded` 171 字符、hash 同上。屏幕截图因面板未显示未取；390/暗色未做 |

## 未完项

- Rollback（新的人类 CAS 请求）未实现；跨 scope（workspace / user）提案未开；`operation: put` 之外的操作未开。
- 提案的 Chat 侧只有工具行（名称、结果文本含 id/修订/hash）；Chat 里不渲染提案卡，按原片"聊天仅链接真实 proposal id"。
- 第一段的 GUI 四事实（已录入 / 已曝光 / 已绑定 / 已加载）仍由 Workbench 既有 Source · Requested · Effective · Bound 与 Recorded bindings 承担，本片未改其文案；证据在测试与 JSON。
- 非作者复核、真实 provider、200%/读屏未做；未 push、未部署。
