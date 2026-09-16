# 00 · 接单基线与公共语言

2026-09-16 · Claude（Fable 5.1）作者；Sonnet 5 承担只读探索。施工单见[本包 README](README.md)。本片只做盘点、接续与映射，不改产品代码；唯一产品变更是把丢失的 RD-006 在途树重建后原样带入施工树，见下节。

## 基线与工作树

| 项 | 实际值 |
|---|---|
| 主 checkout | `/Users/lesprivilege/Projects/Courtwork`，`main`，HEAD `f76dd7ec9f6cef845f67360cc0a22768ae309ca6`，工作树干净 |
| 本单施工树 | `/Users/lesprivilege/Projects/.worktrees/courtwork-claude-harness-20260916`，分支 `claude-frontend-harness-20260916`，自 `f76dd7e` 建立 |
| 交接包文档补丁 | `git apply --check` 与应用通过；`node tools/check-doc-links.mjs` 1356 份文档 / 7660 条链接 / 0 问题；`git diff --check` 通过；提交 `3867f84`，只含补丁列出的三个路径 |
| worktree 清单 | 接单时 `git worktree list` 共 93 条（本单新建施工树与恢复树后 95 条），其中 59 条 `prunable`：所有 `/private/tmp/courtwork-*` 临时树目录已不存在。仍有未提交修改的树：`Projects/.worktrees/courtwork-agents-api-adapter-20260915`（Agents API adapter 草稿）、`Courtwork-fresh`（退休）、`.codex/worktrees/f757`（2026-09-08 web 集成旧改动）、`expert-sidebar-glyph-20260912`（两张截图）、`summary-be41-home-baseline-20260911`（证据目录）。本单未触碰 |
| 共享 stash | 仅一条 2026-07-30 归档条目，未使用 |

## RD-006 在途树的接续

[2026-09-15 节点回执](../../release/final-preparation-2026-09-13/node-20260915.md)与[分支清理回执](../../release/final-preparation-2026-09-13/branch-cleanup-20260915.md)登记 `codex/workspace-access-20260914` 施工树保留于 `/private/tmp/courtwork-workspace-access-20260914`（HEAD `7e1a1ff`，27 个修改、15 个未跟踪文件）。该目录已随 `/private/tmp` 清理消失；清理前的 bundle 只含已提交 ref，未提交修改不在其中。

来源恢复：原作者会话的 Codex rollout 日志（`~/.codex/sessions/2026/09/14/`）完整保留了该树的 236 次 `apply_patch` 调用与 3 次 Python 直接改写 `current.md` 的脚本。将它们按时间顺序、按原工具的整补丁原子语义重放到 `7e1a1ff`，得到恢复树 `/Users/lesprivilege/Projects/.worktrees/courtwork-rd006-recovery-20260914`（detached）。核对依据是 Luna 于 2026-09-15 06:48 对原树记录的 `git status`、`git diff --numstat` 与 patch-id：

- 42 个路径与原记录逐条相同；
- `app/` 下全部 26 个修改与 11 个新增文件的增删行数与原记录逐文件相同；`app/docs/repository-binding.md` 前 178 行与 Luna 当时的整读逐字相同；
- 5 份工程文档（`AGENTS.md`、`current.md`、`architecture.md`、`verification.md`、RD-006）在原树是从当时脏 main 复制后再改，复制内容无法取回，恢复后行数与原记录不同，故整树 patch-id 不相同。这些文档的原作者增量已另存为补丁文本，在 01 片回写 owner 时按当前 main 版本人工合入，不冒充逐字恢复。

恢复树验证：`node --test tests/repository-candidate.test.mjs tests/repository-binding.test.mjs` 26/26，与原作者最后记录一致；`npm test`（Node 25.9.0，并发 4）1059 项中 1058 通过，唯一失败 `review-core-client-lifecycle` 的 bridge ready 超时在恢复树与 main 分别单独重跑均 13/13，判为并发时限抖动，与 RD-006 改动无关。

接续方式：恢复树的 `app/` 差异与 main `f76dd7e` 后的产品提交（`496af6a`，仅 `app/web` 与 chat-actions 测试）无路径重叠，`git apply --check` 通过；已作为提交 `ab4b93d` 进入施工树。该提交是原作者在途工作的保全，不是接受。原记录的未闭合项由 01 片承接：

1. 逐路径 deny 未覆盖聚合读取：`repo_grep`/`candidate_grep` 以 `path:"."` 仍返回被 deny 文件的匹配，`repo_diff` 入口 resource 为 `*`。原作者提出最小修复建议，未改代码。
2. 独立复核曾指出 `app/docs/api-v6.md` 与 `app/README.md` 的 schema/路径说法过时；原作者已在树内修正，恢复后核对 `api-v6.md` 第 110–160 行与第 372–386 行、`README.md` 第 120–131 行均已写 schema 17 与受控只读例外。恢复时失败的两个 README 早期 hunk 被后续成功补丁覆盖，无需重写。
3. 没有 Connect/Access GUI、真实用户绑定、真实 Agent dogfood、Linux 运行验证。

## 公共语言映射

Sonnet 5 只读探索施工树，结论经作者复核。

### 文案变体

| 词族 | 活动消费者现状 | 处置 |
|---|---|---|
| 授权动词 | 代码只用 Approve / Deny：`thread-projection.mjs:184` 生成 `Approve this file write?` / `Approve this tool action?` / `Approve this remote tool call?`；`attention-agent-view.mjs:278` 的 `Approve this action` 属 Attention 决定，另一语义键。[文案体例](../../design/copy-convention.md)§3.2 与代码一致；无活动文档仍写 `Allow this write` | 无需收敛。registry 无 approval 动词条目，只有 `approval.request` 名词；本单新增 `repo_write` 批准卡沿 `Approve this write` / `Deny this write` |
| 停止 | 可见标签唯一为 `Stop working`（`app.mjs:3494`、`index.html:372`）；`Cancel run` 只存在于注释与 DOM id `cancel-run-button`，非可见文案 | 无需收敛；04 片沿用 |
| 连接目录 | `Connect folder` / `Connect repository` / `Connect directory` 在 `app/web` 与设计文档中均不存在；最近邻是 MCP 的 `Connect`、`Choose a local folder`（`local-extension-view.mjs:21`）、`Choose a skill folder` | 真实 grammar gap。01 片在词表与 registry 各补一处定义再实现，见下 |
| 文件访问 | 三值标签唯一定义于 `settings-view.mjs:84-88`：`Ask before editing` / `Allow edits` / `Read only`；单词形式已在 WK-94 退役。`runtime-view.mjs:88` 的 allow/ask/deny 是工具策略效果，另一轴 | 沿用；Connect 面不复制第二套 |

### 已有 primitive

`ui-controls.mjs`（`el`/`icon`/`action`/`setAction`/`anchorPopover`/`installTooltips`/`copyAction` 等，28 个消费者）、`semantic-controls.mjs`（`semanticAction`/`semanticIcon`/`setSemanticControl`）、`model-picker.mjs`（`createModelPicker`，仅 `app.mjs` 消费）、`thread-projection.mjs`（`projectThread`/`permissionPresentation`/`validPermission`）、`presentation-adapters.mjs`、`usage-projection.mjs`、`run-activity.mjs`、`chat-measurements.mjs`、`chat-actions.mjs`、`user-message.mjs`、`execution-disclosure.mjs`、`diff-view.mjs`（`renderDiff`，`materials-view` 与 `settings-view` 消费）。`app.mjs` 是集成点而非 primitive。

### 工作面 owner

| 面 | 视图模块 | 设计 owner | 事实来源 |
|---|---|---|---|
| Home | `home-view.mjs` | [home-composition](../../design/home-composition-2026-09-10/README.md) | `service.getWorkMetrics`/`getWorkSummary` |
| Chat composer | `composer-field.mjs`、`app.mjs` | [chat-flow](../../design/chat-flow-2026-09-10/README.md)、[composer Access 交付](../../design/chat-flow-2026-09-10/composer-access-delivery.md) | draft 路由、`/permission-mode` |
| Chat thread / Run | `app.mjs` + `thread-projection.mjs` | [chat-product-page DECISION](../../design/chat-product-page-2026-09-11/DECISION.md)、[Run surface PR](../../design/chat-flow-2026-09-10/run-surface-pr-20260914.md) | `getEvents`/`createRun` |
| 权限卡 | `thread-projection.mjs` `permissionPresentation` | copy-convention §3.2、precedent-map `approval` | `service.#waitForDecision`（`service.mjs:2190`）、`openQuestion` |
| Preview / Files / diff | `materials-view.mjs`、`diff-view.mjs`、`workspace-view.mjs` | 无单独 README；最近为 [chat-product-page reference-index](../../design/chat-product-page-2026-09-11/reference-index.md)。**gap**，08 片补 | `getWorkspaceTree`/`getWorkspaceFile`/`compareMaterials` |
| Review | `work-review-summary.mjs` | `docs/work-core/contract.md`（registry `review.open`） | `getReviewSummary` |
| Settings Models / MCP / Skills / Plugins | `settings-view.mjs`、`runtime-view.mjs` | [Developer 控制面](../../design/developer-control-panel-2026-09-13/README.md)、[Runtime Index](../../../docs/runtime-control/INDEX.md) | `provider-connections.mjs`、`control-plane.mjs` |
| Attention | `attention-view.mjs`、`attention-agent-view.mjs` | [attention-agent](../../design/attention-agent-2026-09-10/README.md) | `queryAttention`、`attention-tools.mjs` |
| Usage | `usage-view.mjs` | 无 README；registry 指向 `app/docs/request-telemetry.md`。10 片沿 Telemetry P1 | `/work-usage-details`、`/work-usage-runs` |

### 后端接缝

- RuntimeStore `SCHEMA_VERSION` 现为 17（`store.mjs:31`，恢复树自 15 升 16、17）；迁移内联于加载路径，无独立 `migrate()`。
- 工具治理：`governTools`（`control-tools.mjs:22-53`）按 exposure 过滤、按 `hostToolCeiling` 与 `evaluatePolicy` 裁决、`ask` 时经 `requestPermission` 提问；`repo_*`/`candidate_*` 路径策略大小写不敏感。
- Run 配置冻结在 `service.#createRun`（`service.mjs:1713-1719`）；`#withConfiguration` 是串行队列而非快照。
- `cancelRun`（`service.mjs:2255-2291`）立即置 `stopping` 与 `admissionOpen:false`；无进程内 entry 时置 `unknown`。取消后非 `run.*` 事件被 `service.mjs:2169` 丢弃。03 片的检查进程结算须绕过这一准入另行持久。
- HTTP 路由只有 `/api/v5`（`index.mjs:231`）；`app/docs/api-v6.md` 与 registry 多处 ownerRef 仍以 v6 命名。本单不改路由版本，只在 01 片修正文档指针。
- effort：`model-capabilities.mjs:8-27` 返回 `{kind: enum|unsupported|unknown, values}`；05 片直接消费，不硬编码档位。
- 测试约定：`tests/helpers.mjs` 的 `boot()` 起真实服务并返回 `api`/`createSession`/`pollRun`/`scriptInput`；`spawnWorker` 起子进程用于崩溃恢复；`npm test` 并发 4 跑 `tests/*.test.mjs` 与 `../tests/*.test.mjs`。

## 本轮固定场景

01 片建立并沿用到 11 片：

- 合成 coding 仓库 fixture：一个含 Git 历史的小型 Node 包，带一个确定的失败测试与一条 Host 受信检查 recipe；置于 `app/tests/fixtures/` 下按需生成，不含个人数据。
- 同一长 Chat：先无 Project 提问，再连接该仓库，读取、精确授权写入 candidate、发起检查、重开。
- 同一权限卡：`repo_write` 的 ask 批准卡与既有 `ws_write` 卡同解剖。
- 同一 Settings 配置：local-fake provider 连接；真实模型只在用户已配置且授权的范围内用于 03/11 的一次验证。

历史 golden 不升级为新基线；每片自建 before/after。

## 退出核对

各待改工作面已有可定位 owner、primitive 与缺口（上表）。已交付项去重：MCP/Skill/Plugin 面、自动压缩、Context 圆环与活动行、Copy/Composer P0/P1 均按 README 表列为复用与回归，不重建。原型与真实功能分清：12 片五项 Prototype 与 Harness 卡在本包分目录登记。本片没有新增 registry、状态机库、UI 框架或目录迁移。

下一片 01 从 `ab4b93d` 开始：先修逐路径 deny 缺口并补回归，再修文档指针，再做 Connect repository 的 Home/Chat 接线。

## 入口存废审查（2026-09-16 · 接 v2 [入口清理增补](frontend-entry-audit.md) 与 v3 [右栏与轨迹增补](sidebar-trace-review.md)）

在 05–07 完成后按 v2/v3 增补回到本片。范围：生产 Shell、Home/Composer、Files/Preview、Settings/Runtime、Attention/Spark 的常驻入口；按当前 `index.html` 与 `app.mjs` 逐项核，不从历史文档想象控件。处置词：删除 / 合并 / 改名归位 / 补真实通路 / 保留 / 移出生产原型化。

| 入口 · 用户意图 | 真实目标 · handler | 结果 owner | 失败恢复 | 处置 | 证据 |
|---|---|---|---|---|---|
| 侧栏页脚 `Refresh workspace`（#refresh-button）· "刷新" | 串行重读导航/会话/Review 摘要/extensions/provider 配置/Home，并释放 createAttempts 的 unconfirmed、清 Home 未确认起始，弹 Workspace refreshed. | 混合：多路 reader + 前端锁 | 无对象；用户被文案要求"Refresh" | **删除**；三种责任归位：读态更新沿各 reader/重连；读取失败用局部 Retry（Recent 列表与 Home 已有）；未确认创建在原位 Check status | entry-audit 测试；浏览器页脚只剩 Settings |
| 创建对话框（Project / Chat）未确认 | `createEntity` → POST /projects · /sessions | Host | 原文案要求 Refresh 并按名查找 | **补真实通路**：创建前固定 clientId（chat 用既有 sessionId 合同；project 新增 `projectId` 幂等接缝），未确认时 Check status 按 id 读回同一记录（GET /sessions/:id · GET /projects），找到即按原回执路径接纳，未找到则解锁并保留身份 | api-v6 Projects 段；entry-audit 测试 1 |
| Home 首发未确认 | `submitHomeRun` 固定 sessionId 再 POST | Host | 原文案要求 Refresh；Recent 列表加载时顺带恢复 | **改名归位**：状态行加 Check status（GET /sessions/:id），找到写"Your chat was recovered…"，未找到写"Send to retry the same chat identity."；Recent 顺带恢复保留 | entry-audit 测试 2 |
| Run 发送未确认 | `recoverRunReceipt` 同 commandId 重放 | Host（幂等） | 已有 Recover 动作 | **保留** | 既有 |
| 附件上传未确认 | draft-attachments 同 commandId | Host（幂等） | 已有 attempted 标记 | **保留**（上传是保留字节，不改名为 Open folder） | 既有 |
| 导航 `Expert · Planned`（#expert-seat） | 无 handler，仅加图标 | 无 | 无 | **移出生产原型化**：删除席位与其 CSS；`expert.role` 语义键保留 | entry-audit 测试 2 |
| 侧栏 Home / Chat / Attention / Spark / New chat / Find a chat / Projects + / Settings | 各自导航与创建 handler | 前端导航 owner / Host | 局部 | **保留** | — |
| Home composer `Project`（#home-project-button） | 选组织归属（state.homeProjectId） | Host（创建时提交 projectId） | — | **保留**（01 片已改回 Project；不叫 Workspace） | copy-convention §3.2b |
| composer 上下文条 `Choose workspace` | 打开 Workspace 卡（Host 原生目录对话框 → 绝对路径 → 绑定） | Host（RD-006） | 取消/失败保留旧绑定与草稿 | **改名**：Connect folder（chip 与卡片主动作 Connect folder…）；对象名 Workspace 沿 §3.1 | copy-convention §3.2b；registry `workspace.connect` |
| composer 附件 / File access / Model & effort / Send / Stop working | 各自 owner | Host | 各自 | **保留** | 05 片 |
| 右栏 `Runtime` 卡（surface-modules runtimeModule） | 资源总数/分类/frozen/Attention 计数；Open → Settings | Workbench 快照的二次读 | 无 | **删除**（v3）：资源与配置在 Settings › Developer › Runtime；某次 Run 的绑定在其详情；`loadRailFacts` 不再读 runtime | entry-audit 测试 3；浏览器右栏卡：run-summary · preview · more |
| 右栏 `Workspace` 空卡（Workspace files have not been read.） | 未读树时的占位 | — | — | **删除空态**：未读且无错误时卡不出现（WK-45/47） | 同上 |
| 右栏 Run 卡 / Inspector 的 "Not accepted by a review." | 普通 Chat 记录文件上的免责句 | — | — | **删除**：接受状态只在 Core 候选真实携带时陈述 | 同上 |
| 右栏默认打开（进入 Chat 即 `surface.open`） | 无对象的三张卡 | — | — | **改**：进入 Chat 不开右栏；Open work surface、文件/变更/检查/候选对象打开时才开 | 浏览器：进入 Chat panel/rail hidden，点 Open work surface 后打开 |
| Files 阅读面的 `Refresh workspace files`、Settings 的 `Refresh extensions`、`Refresh current settings`、Attention 的 `Refresh Attention` | 各自对象的确切读态刷新 | 各 owner | 局部 | **保留**（逐对象判断，不一刀切） | raw-consumers 账 |
| Settings 页 chrome（Back to app · 搜索 · 分组）、Runtime Workbench 各块 | 既有 | — | — | **保留** | — |

### 提交与检查

| 项 | 结果 |
|---|---|
| 提交 | `4ab6ef7`（代码与测试）· `7ec73c3`（文案、接口说明、本节） |
| 定向 | entry-audit 4 项；card-disclosure / workspace-card / surface-convergence / chat-work-shell / shell-layout / work-surface-tabs / product-semantics / semantic-guards / static-web-manifest / home-presentation / settings-navigation / projectless-chat / intake-ui / inspector-presentation 共 90/90 |
| `npm test` | __FULL__ |
| lint | interaction / colors / shapes / materials / product-copy / semantic-consumers（53 项账，删去 refresh-button 例外）/ doc-links 通过 |
| 浏览器（Local test Host） | 侧栏页脚只剩 Settings；导航无 Expert 席位；上下文条 chip 为 Connect folder；进入 Chat 时右栏与面板均隐藏；Open work surface 后卡片为 run-summary · preview · more，无 Runtime 卡 |

### 未完项

- v2 §6 的 A/B/上传同名反例 fixture 与"下一 Run 真实读到 A"的 GUI 验收归 01 片增补，尚未做；01 片已有的 Host 原生目录对话框返回绝对路径，属 v2 §4.1 的"Host 提供的目录选择器"分支。
- 创建对话框的 Check status 只有源码断言与 Host 幂等测试，浏览器里未模拟丢 ACK。
- v3 的 Inspector 重排、顺序概览与选中项详情归 04/08/10 片；本片只做右栏存废。
