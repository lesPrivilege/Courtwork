> Historical runtime-control frontend intake copied from SE continuation. Backend commit `8722259` is in the fresh candidate; this record defines a future UI seam and does not claim that the runtime UI is implemented.

# Runtime Control Plane · 前端接入接管记录（Fable 架构，2026-09-08）

用户通知：后端 `codex/runtime-control-plane` 提交 `8722259`（工作树 `/Users/lesprivilege/.codex/worktrees/se-runtime-control-20260907`，基于 `b26670c`），实现资源状态、作用域与权限、运行快照、逐步加载、专家组合契约与 MCP（Streamable HTTP）接入；134/134；`app/web` 未动。索引：`docs/runtime-control/INDEX.md`；前端契约：`../../../app/runtime/control-contract.d.ts`；接入要求：`docs/runtime-control/acceptance.md` §New frontend contract。

本页只做架构消费与裁定，不开工前端实现；按标准流程，新表面先出 explore 卷再设计（用户 2026-09-07 裁定）。

## 1. 与当前前端基线的关系

| 项 | 事实 |
|---|---|
| 共同祖先 | `b26670c`；polish 分支 `claude/ui-design-polish`（`891aa13`）与后端分支改动文件**不相交**（polish 只改 `app/web/styles.css`、`app/web/ui-controls.mjs`；后端改 `app/runtime/*`、`app/server/*`、tests、docs、package.json） |
| 合流 | 两支可各自快进到 `codex/gui-completeness`，次序无关；合后前端仍是 b26670c 的 web 契约 + polish 层 |
| 新依赖 | `@modelcontextprotocol/client@2.0.0`（后端）；前端零新增，UP-6 不受影响 |
| 数据 | schema 3 → 4 单向升级；**8816 / 8818 的数据目录一旦被新后端打开即不可用旧主机**。polish 目录暂不升级依赖、不切到该分支，避免 8816 数据被升级 |
| 后端未做 | OAuth、stdio、第三方插件隔离、memory/workflow/hook/registry adapter；前端不得画这些能力的控件（DC-11） |

## 2. 前端接入裁定

| 编号 | 裁定 | 理由 |
|---|---|---|
| RC-1 | **前端消费面 = 一个 `runtime` 内容模块 + 既有 Settings 的三处扩展**，不新建第二套导航或"控制台"应用。`runtime` 作为附加面板 kind（WS-09 静态映射，与 workspace / run / file 并列），承接资源目录、作用域与权限解释、MCP 连接；Settings 只加"当前生效 profile"、"下一次 Run 的上下文"入口与 MCP 连接状态摘要 | 一个工作中心三层检查（ui-composition.md）；`uiSlots: runtime.inspector / work.surface` 与现有面板身份一一对应 |
| RC-2 | **四个维度分四列显示，不合并成一个开关**：installed / running(`null`=不适用) / exposed / permitted（effect + trace）。开关只改 exposure；"inherit" 是删除本级覆盖（`exposed: null`），用文字"沿用 workspace 设置"而非第三态开关图形 | acceptance.md：不得从勾选态推断权限；DC-11 无能力不画控件 |
| RC-3 | **作用域先于对象**：面板顶部是 user / workspace / session 三个作用域 tab（服务端 `scopes` 决定可写项），对象列表在作用域之下；每个值旁一行 provenance（"来自 workspace · 用户设定"），不用颜色表达来源 | 契约 provenance 数组；SH-2 颜色不承担未说明的状态 |
| RC-4 | **409 是权威**：`active_run` 时整个面板只读并说明"有运行中的 Run，改动在其结束后才可提交"；`runtime_conflict` 时刷新快照并保留用户未提交的编辑为草稿，不自动重发。unknown 远端效果显示"需先核对"，不出现 Retry 按钮 | acceptance.md；WS-08 回执不明不重发 |
| RC-5 | **上下文两栏**：effective-next-run（来自 `/runtime-context`，无 token 数，显示字符数并注明"字符，不是 token"）与 recorded-run（Run details 内，来自 binding + loaded 事件）。后者进入既有 Run 检查栏，不另开面 | 契约 `characters`、`tokenUsage: null`；O-1 成果与记录共用 run kind |
| RC-6 | **MCP 三态分开**：configured / connected / exposed 各自可见；connect/disconnect/restart 是 lifecycle 按钮（文字），远端工具在服务器之下缩进列出并标 `remote` 与 URI hash；连接健康 live，不推进 revision | api.md、architecture.md MCP 节 |
| RC-7 | **Prompt template 只出草稿**：invoke 结果落到 composer 草稿（复用 Edit as new message 的"Use as draft"路径），永不发送 | 契约 `disposition: 'draft-only'` |
| RC-8 | **来源检查是本地管理能力**：`GET /runtime-resources/:id` 的正文在 File 检查栏语义下显示（recorded source + hash），标"模型未被授权读取"当 exposed=false | acceptance.md 区分 inspector 与 `runtime_load` |
| RC-9 | **视觉直接套 polish 层**：行/DataList/tab/浮层全部用 UP 批次的 token 与状态规则（SH-1 容器选择：目录=行，权限解释=DataList，MCP 服务器=对象行+缩进子行，profile=选择卡）。不为 runtime 面另起颜色或图标家族 | UP-2/UP-4/UP-12 |
| RC-10 | **顺序**：EX-RC1 explore（成熟 agent GUI 的 runtime/工具/权限/MCP 表面源码级消费）→ 设计契约（画布或直接工单）→ Opus 或 Fable 施工 → Astra 独验。施工前先由 Astra 确认 polish 与 runtime-control 两支合流后的基线 SHA，前端只在该 SHA 上开工 | 用户 2026-09-07 流程裁定；单一 writer |

## 3. Sonnet explore

| 编号 | 工单 | 输出 |
|---|---|---|
| EX-RC1 | the historical explore order (retained in the private evidence snapshot)：Claude Code / Codex / Goose / Cline / OpenCode / DSH 的 runtime 资源、权限、MCP、skills 表面的源码级 anatomy 与行为规范；对照 `control-contract.d.ts` 的每个字段找可迁移呈现 | `runtime-control-frontend-explore.md` |

## 4. 未决（留用户）

- `runtime` 面板是否在第一层 GUI（DEC-010 功能完备）范围内，还是等 polish 合流后再开：架构建议**先合流两支、再开 runtime 面**，避免三方并行写同一 web 目录。
- MCP 连接的输入面（URL）是否与 provider key 一样"只在 web UI 输入"：建议同口径。

## 5. EX-RC1 架构消费记录（2026-09-08）

Sonnet 回执 [runtime-control-frontend-explore.md](runtime-control-frontend-explore.md)：契约 14 字段 × 6 产品，完整对照 0 格、近似 37%、无对照 56%；`defaultExposed` 与 `characters` 无任何先例。三级作用域业界一律用静态优先级表或"最近路径覆盖"，没有交互式 user/workspace/session tab；三态开关（含 inherit）与"运行中冻结整面板"无先例；MCP 状态词各家不同（OpenCode 五态、Claude Code 七态、Cline 三态 + error）。

消费裁定：

- RC-2 的四维分列与 RC-4 的整面冻结**保持**，理由不是先例而是契约（`running:null`、409 权威）；无先例意味着这是 SE 自己要写清楚的表面，验收时不得引用业界做法当通过标准。
- RC-3 改为"作用域 tab + 每值 provenance 一句"与"静态优先级说明"并存：面板顶部一句固定说明"session 覆盖 workspace，workspace 覆盖 user；更窄的作用域不能放宽上级的 deny/ask"，避免用户从 tab 推断错误的覆盖方向。
- MCP 状态词按契约取 SE 自己的四词：`configured / connected / exposed / error`（对应 RC-6），不借任何一家的七态。
- 三态开关不做图形化：exposure 用两态开关 + 一行"沿用 workspace 设置（点此覆盖）"文字入口（RC-2 原文），与 EX-RC1 结论一致。

下一步仍按 RC-10：等 Astra 给出 polish + runtime-control 合流后的基线 SHA，再开设计契约。

## 6. BoardUI Agent Limits 的模式消费（2026-09-08）

用户提供的 BoardUI（UP-S08）中 Agent Limits Card 与 SE 契约 `ContextItem.characters` 对得上：按 kind（instruction / skill / reference / mcp tools / session_context）分桶的一条比例条 + 每桶字符数行。裁定：进入 RC-5 的 effective-next-run 栏，比例只对"本次将进入上下文的总字符"，标"字符，不是 token"；没有 `max`，不画百分比、free space 与限额行；deferred（catalog-only）桶以破折号列出、不计入条，与 BoardUI 的 deferred 处理同形。颜色不按桶分色（PD-L2 色只给失败与等待），用灰阶明度分段 + 文字标签。

## 7. Astra 第一层 GUI 范围裁定（2026-09-08）

基础 runtime 配置与状态进入第一层 GUI：模型/连接、当前能力与可用性、文件写权限、下一次运行的有效资源摘要及来源，以及已配置 MCP 的真实状态。复杂资源管理与作用域覆盖作为渐进展开内容，不占 Home 主任务入口。Home 的主入口是 composer。

此裁定定义后续施工范围，不声称本轮已有 runtime 管理 UI。消费 RC-2/3/4 的真实作用域、provenance与运行冻结契约；BoardUI 比例条只表达已知字符构成，不画缺失的容量/剩余百分比，也不把字符称为token。先以候选合流的实际SHA为起点，单一作者开工；品牌语义首单由用户另交Claude。
