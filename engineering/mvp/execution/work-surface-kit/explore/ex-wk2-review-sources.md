# EX-WK2 · Review 纵切外部溯源

状态：`带溯源索引`。

只读声明：本卷只通过 WebFetch / curl 读取下列外部 URL 与固定 commit 的 GitHub raw 文件，未克隆、未安装、未执行任何源码，未启动任何服务，未修改本仓库或候选仓库的任何文件（本卷自身除外）。所有转录值（字段名、状态枚举、SQL、TS 类型）已在下方表格中给出 file:line 或原文引用，不整段复制源码。未下"采用"结论。

未访问的 URL：无越界访问；仅访问工单表中列出的十个来源（含其官方文档页与 GitHub 仓库/固定 commit 下的相邻文件，如 Gatewerk 的 schema/audit/decide 系列文件、VekInbox 的 Drizzle schema、Suna review-center 的 reducer/types/actions 系列文件，均在工单"追什么"范围内，未跨到其余仓库路径）。

失败 URL：
- `https://raw.githubusercontent.com/gatewerk/gatewerk/main/README.md` — 404（该仓库默认分支为 `master`，非 `main`）。已改用 `https://raw.githubusercontent.com/gatewerk/gatewerk/master/README.md`（200），本卷 Gatewerk 相关行均以 `master` 分支固定 commit 为准，见索引行 SRC-06。

对照来源（只作对照列，不作评价标准）：`ex-wk1-canon-map.md`（问题卡 / 授权卡 / Home 三集合 / ReviewItem 映射四节）、`engineering/design/ux-conventions.md` §1–§4、`courtwork_se_gui_review_runtime_index_2026-09-08.md` §3、4.4、4.5、4.8、5.1、5.2、6.3、6.4、6.5。

---

## 1. 溯源索引

体例：`<ID> · <URL 或 frozen SHA:path> · 访问日 · 许可 · 消费模式 · 转录到`

| ID | URL / frozen SHA | 访问日 | 许可 | 消费模式 | 转录到 |
|---|---|---|---|---|---|
| SRC-01 | https://docs.copilotkit.ai/teams/langgraph-typescript/human-in-the-loop | 2026-09-08 | MIT（CopilotKit 仓库） | REVERSE + PROTOCOL | 本卷 §2.1 PermissionGate 表 行 1–2 |
| SRC-02 | https://docs.copilotkit.ai/langgraph-typescript/human-in-the-loop/governed-actions | 2026-09-08 | MIT | REVERSE + PROTOCOL | 本卷 §2.1 表 行 3；§2.4 DecisionReceipt 表 行 4 |
| SRC-03 | https://beui.dev/components/agents/tool-approval | 2026-09-08 | 站点声明 MIT（无独立仓库 commit，以访问日为版本锚点） | REFERENCE | 本卷 §2.1 表 行 4–6 |
| SRC-04 | https://beui.dev/components/agents/approval-card | 2026-09-08 | 站点声明 MIT | REFERENCE | 本卷 §2.2 表 行 5 |
| SRC-05 | https://github.com/ladanjohari/agent-indicator @ `21876d84420f00eed25cac1c96266646692422eb`（README.md） | 2026-09-08 | MIT | REFERENCE | 本卷 §2.1 表 行 7；§3 冲突清单 行 5 |
| SRC-06 | https://github.com/gatewerk/gatewerk @ `9b4f7408ccf585ef6770074b98b38d01f97c8e2b`（master）— README.md、`packages/db/migrations/008-review-state-machine.sql`、`030-status-enum-awaiting-iteration.sql`、`apps/api/src/openapi/components/schemas/reviews.ts`、`apps/api/src/routes/reviews/decide.ts`、`apps/api/src/services/reviews/execute-action.ts`、`packages/db/src/schema/audit-log.ts`、`apps/api/src/services/AUDIT-WRITE-CONTRACT.md` | 2026-09-08 | AGPL-3.0（server）/ Apache-2.0（client SDK，README 原文声明） | REVERSE | 本卷 §2.2 表；§2.4 表；§3 冲突清单 行 4 |
| SRC-07 | https://github.com/rifzankhan/agent-approval-card @ `e8b786dc7cf4247554b07f72d0b0244929d8aeac`（README.md） | 2026-09-08 | 未声明（GitHub API 与 package.json 均无 license 字段） | REFERENCE | 本卷 §2.2 表 行 6–7 |
| SRC-08 | https://github.com/21st-dev/agent-elements @ `b04b36cb6381a1dd1a0e86cc7c90564ddcd56d37`（`lib/agent-ui/components/tools/edit-tool.tsx`、`tool-approval-footer.tsx`）+ 文档页 https://agent-elements.21st.dev/docs/edit-tool | 2026-09-08 | MIT | REUSE + REVERSE | 本卷 §2.2 表 行 1–4；§3 冲突清单 行 1 |
| SRC-09 | https://github.com/kortix-ai/suna @ `ef2a0c70596685a9f45eb0d74196a527f494a27b`（`apps/web/src/features/review-center/review-center.tsx`、`types.ts`、`review-reducer.ts`） | 2026-09-08 | Elastic License 2.0（非托管服务限制条款，见仓库 LICENSE） | REVERSE + REUSE | 本卷 §2.3 表；§3 冲突清单 行 3 |
| SRC-10 | https://github.com/LatticeAG/VekInbox @ `facbc4188ee6ca0462cc2ccf24df836e85133450`（README.md、`packages/db/src/schema.ts`） | 2026-09-08 | MIT | REVERSE | 本卷 §2.3 表；§2.4 表 行 3 |

---

## 2. 原语 anatomy 表

列：区域 · 状态 · 动作 · 键 · 对应 SE 既有词 · 不可迁移的假设。

### 2.1 PermissionGate

| 区域 | 状态 | 动作 | 键 | 对应 SE 既有词 | 不可迁移的假设 |
|---|---|---|---|---|---|
| CopilotKit 暂停语义分岔 | 无枚举状态；两种暂停路径并存：model-initiated（`useHumanInTheLoop`）/ graph-enforced（`useInterrupt`） | 无用户键；由 `respond(result)` 回调恢复 | — | 接近 SE"question 与 permission 分属两类"的区分，但 CopilotKit 的轴是"谁发起暂停"而非"决定对象是什么"；引文（SRC-01）：*"the agent keeps its context, the user keeps the steering wheel"* | `useInterrupt` 文档明确写出该能力在 LangGraph TypeScript 侧尚不支持；两个 hook 均绑定 React 组件生命周期与 LangGraph 图节点，非独立协议对象 |
| CopilotKit governed action 信封 | `verdict`: `allow` \| `deny` \| `require_approval` | allow→静默执行；deny→不执行；require_approval→渲染批准卡 | — | `allow`/`deny` 与 SE 既有"allow / deny 两类"字面一致；`require_approval` 是"进入 permission 卡"前置态，SE 未见对应词 | 恢复校验 `response.approved && response.actionId===action.id && response.reference===action.reference`（SRC-02）——绑定关系落在服务端策略层内存对象比对，不落盘，不是独立可查询记录 |
| beUI Tool Approval 卡头部 | `ToolApprovalStatus`: pending / approving / approved / denied / running / complete / error（7 态） | — | — | pending 与 SE question 四态之一同名不同域（此处指"待授权"，非"待回答"） | `ToolApprovalStatus` 是组件内部 TS union，非后端契约字段；颜色映射（amber/blue/green/red）硬编码于组件 |
| beUI Tool Approval 按钮组 | pending 时可操作 | Allow once / Always allow（可选）/ Deny | 未见键盘绑定文档 | Allow once→SE"allow 是一次写授权"；Always allow→SE 无对应（SE 明确 allow 不含"always"变体）；Deny→SE deny | `motion.button` + `SPRING_PRESS`/`SPRING_SWAP` 依赖 `motion/react` 运行时；`useReducedMotion()` 为该库钩子 |
| beUI 参数披露区 | open / closed（disclosure） | "View details" 切换，chevron 旋转 | 未见键盘绑定 | 对应授权卡 preview 字段（SE：400 字 preview，`ux-conventions.md:32`） | `AgentDisclosure` 用 clip-path + opacity 220ms 过渡，`EASE_OUT` 为组件私有缓动令牌 |
| agent-indicator `ApprovalGate` | README 未列出完整状态枚举（仅给出行为规则） | allow / deny；destructive 需长按 1.2 秒而非点击 | 键盘操作与 Reduce Motion 跳过长按（README 原文） | `reversible`: `true` \| `false` \| `'unknown'` 三值——接近索引 §3.2 `ReviewItem.reversibility`，SE 目前无此字段；README 原文将规则概括为可安全批量的请求会合并、不可撤销的请求绝不合并，且明确"unknown"不等同于"已确认可撤销" | 适配器读取 Vercel AI SDK 的 `approval-requested` tool part **消息形状**而非导入库，README 自述不对该 SDK 有运行时依赖或 peer dependency——这是刻意反耦合的例子，而非依赖 |

### 2.2 ReviewCard / outcome

| 区域 | 状态 | 动作 | 键 | 对应 SE 既有词 | 不可迁移的假设 |
|---|---|---|---|---|---|
| 21st-dev EditTool 卡头部 | animating（pending）/ result | — | — | 无直接对应；接近 SE"工具 ledger 行"的正文态 | `isPending` 由 `state==="animating"` 判定，`state` 来自 `mapToolStateToStepState`，绑定该库内部 `StepState` 联合类型 |
| 21st-dev EditTool diff 主体 | expanded / collapsed（`isCollapsible`） | 展开/收起按钮（chevron） | 无 | 无直接对应 | `MultiFileDiff`（`@pierre/diffs/react`）用 CSS 变量 `--diffs-bg-*` 与 `unsafeCSS` 注入主题；依赖 `document.documentElement` 的 `MutationObserver` 侦测暗色模式 |
| 21st-dev `ToolApprovalFooter` | `decision`: `null` → `approved` \| `rejected`（终态，`useState` 本地） | Approve（默认文案"Next"）/ Reject（默认"Skip"） | 无键盘绑定 | Approve→SE allow 的字面相邻但语义不同：此处 Approve 同时是"继续下一步"与"接受此 diff"，SE 未把两者合一 | 按下后文案变为"Waiting…"/"Canceled"，`decided` 后按钮永久 `disabled`——无 commit/execute 独立态，纯 React 组件本地 state，无持久化 |
| Gatewerk Review 资源 payload 三分 | `suggested_value` / `approved_value` / `edited_payload`（均可空） | 创建时写 `suggested_value`（经 `payload`）；决定时可写 `edited_payload` | — | 直接对应 SE"授权字段来源纪律"精神——agent 提案与人已批准载荷分离存字段，非从文案推断 | 三字段是 Postgres `jsonb` 列（`gw-schemas-reviews.ts:231-233`），Zod schema 只是 API 层镜像，落地靠 Drizzle ORM |
| Gatewerk `status` 生命周期 | `pending` → `awaiting_iteration`（原 `changes_requested`，一分钟版本内并存别名）→ `decided` \| `expired` \| `archived` | `POST /reviews/:id/action`（`action_id`: `approve`\|`reject`\|`request_changes`\|`cancel_iteration`，自定义 action 由模板定义） | — | `decided`/`expired` 与 SE question 的 `resolved`/`expired_restart` 相邻但不同域（Review 资源级 vs 单个问题级） | `reviews_status_chk` 是 Postgres CHECK 约束（`gw-030-status-enum.sql:14-15`），状态合法性由数据库而非应用层枚举强制 |
| Gatewerk 乐观并发 | 版本不匹配 | `expectedVersion` 与 DB 行版本比对，不符即 `ConflictError("version_mismatch")`（`gw-execute-action.ts:214-222`） | — | 对应索引 §3.1E"proposal identity 必须绑定 committed effect"——用行版本号而非文本推断防止过期提案被误批 | 版本号是数据库行的整型列，靠 SQL `WHERE version = expected` 语义实现原子性，非前端状态 |
| Gatewerk `/decide` legacy 路由 | `decision`: approved/rejected/edited/retried/expired（`DecisionSchema`） | 单次 POST 同时写 `decision` 列并触发 `executeReviewAction`（含 webhook 派发） | — | 无直接对应；SE 尚无"批准并派发"合一动作 | 路由基于 Express `Router`，`assertChainStepAllows` 依赖会话/API-key 双认证路径与 Drizzle `and(eq(...))` 查询构造器 |
| agent-approval-card `AgentApproval` | `ApprovalStatus`: idle/approving/rejecting/editing/error/approved/rejected | approve/reject/edit（`onEdit` 仅在显式应用时触发） | 无 | `onApprove` 接收"最新已应用参数"——对应 Gatewerk 的 `edited_payload` 精神，独立到达同一区分 | README 原文将设计规则表述为：host 拥有批准状态与全部异步副作用，组件只拥有编辑期间的临时草稿状态——纯 React props/callback 契约，无持久化、无审计、无传输协议（README 自述不持久化决策） |

### 2.3 ReviewInbox

| 区域 | 状态 | 动作 | 键 | 对应 SE 既有词 | 不可迁移的假设 |
|---|---|---|---|---|---|
| Suna 三段分区 | `ReviewSegment`: `needs_you` / `waiting` / `done`（由 `segmentForStatus` 从 7 个 `ReviewStatus` 派生：`needs_you`/`waiting`/`approved`/`changes_requested`/`rejected`/`done`/`dismissed`） | 切段：数字键 1/2/3 | `1`/`2`/`3` | 三段命名与 SE work-summary 三集合（Waiting for you / Continue / Needs a look）字面相邻，语义不同：Suna 的三段是"审阅进度"，SE 的三集合是"下一步该做什么" | `SEGMENTS`/`KIND_FILTERS` 是组件内 `useState` 驱动的过滤态，无持久化 URL 或服务端排序契约 |
| Suna 键盘导航 | `focusedIdx`（本地 state） | 上下移动 | `j`/`k`/`↓`/`↑` | 无直接对应（SE 尚无 inbox 键盘规范） | `window.addEventListener('keydown', onKey)`（`suna-review-center.tsx:719`）在 `typing`（输入框聚焦）时短路，纯浏览器 DOM 事件，非框架无关协议 |
| Suna 单项决定 | 打开 / 批准 / 请求修改 / 忽略 | `Enter`/`o` 打开；`a` 批准（"Approve / ship"）；`e` 请求修改；`d` 忽略 | `Enter`, `o`, `a`, `e`, `d` | `a`→SE allow 的字面相邻，但 Suna 的"approve/ship"跨越 permission 与 proposal review 两类（`kind='change'`时是 ship，`kind='approval'`时是 allow） | `SHORTCUTS` 常量与 `onKey` 回调硬编码于同一组件文件（`suna-review-center.tsx:118-128`），帮助面板 (`?`) 亦为组件内 modal state |
| Suna 批量选择 | 选中/未选中 | `x` 切换选中，供 bulk | `x` | 无直接对应 | 选中集合是 `Set<string>` 的 React state（`selectedIds`），非服务端持久选择 |
| Suna reducer 批量安全规则 | 单个 action `decided`: undefined→`approved`\|`denied` | `approveAllSafe`：仅动 `isSafeRisk(risk)`（`none`/`low`）且未决的 action，风险项不动（`suna-review-reducer.ts:51-59`） | 无独立键（由批量条触发，未在本卷读取按钮绑定） | 对应索引 §6.5 agent-indicator"destructive 不批量"规则，Suna 独立实现，字段名不同（`risk: none/low/medium/high` vs agent-indicator 的 `reversible: true/false/unknown`） | `rollupApprovalStatus`（`:23-27`）：全部子 action 决定完毕才把整项收敛为 `approved`（只要有一个 approved）或 `rejected`（全部 denied）——聚合规则是该文件的纯函数逻辑，不依赖 React，但仍是内存数组操作，非数据库事务 |
| VekInbox `requests` 表 | `request_status`: pending/approved/declined/timed_out/escalated/cancelled/changes_requested（7 态，Postgres enum） | SDK `create`/`waitForResolution`/`list`/`cancel`；CLI `resolve --action approve\|...` | 无（无 Web UI 键盘文档，本卷未深入 `apps/web`） | `timed_out`/`escalated` 是 SE 目前没有的 run 级失联/升级语义（非 question 语义） | `escalationPolicyId` 外键 + `timeoutAt` 列由 `apps/worker`（BullMQ + Redis）轮询处理；README 明确指出没有 Redis 时请求永不超时、永不升级——超时/升级依赖独立 worker 进程与 Redis 队列，非纯数据库触发 |
| VekInbox 幂等 | 幂等命中 vs 新建 | `key`-based idempotency；`requests_workspace_key_unique`（`workspaceId`,`key`）唯一索引 | — | 对应索引 §5.2 VekInbox 段"idempotency key" | `idempotencyReusedCount` 是整型计数列，靠数据库唯一约束冲突（`ON CONFLICT`风格或应用层查重）实现，非内存去重 |

### 2.4 DecisionReceipt

| 区域 | 状态 | 动作 | 键 | 对应 SE 既有词 | 不可迁移的假设 |
|---|---|---|---|---|---|
| Gatewerk `audit_log` 表 | 每行不可变（无 UPDATE 路径，本卷未见对该表的更新语句） | 写入即定型：`action`/`actor`/`resource_type`/`resource_id`/`details`/`signature` | — | 对应索引 §3.1E"immutable DecisionReceipt"——本卷十来源中唯一满足"不可变记录"技术前提的表 | `signature`/`prev_signature`/`signature_version`（1 legacy HMAC 单行 / 2 = `"v2\|"`前缀链式输入 / 3 = v2 + 字段名排序后序列化）——链式签名依赖应用层 HMAC 计算与列上 `prev_signature` 指针，非数据库原生防篡改机制；`project_id` 允许 `NULL`（迁移遗留），"不可变"承诺不覆盖租户归属字段 |
| Gatewerk 审计写入分级 | SEALED / 二三层（本卷仅读到 SEALED 定义起始，其余两层未读全文） | `auditService.log(data, {tx})` 与同事务内状态变更绑定 vs `.catch(() => {})` 的 fire-and-forget | — | 对应 SE"字段来源纪律"精神：区分"这行审计是唯一证据"与"另有其他证据" | 判定标准是人工在每个调用点声明的三层分类（文档明确将其定性为调用点自身的属性，必须在调用点声明，而非自动推导），不是自动推导的属性 |
| Gatewerk `decided_by` 防伪 | 认证 actor 与自称 `reviewer` 字段分离 | 会话认证的 `decided_by` 只能是当前登录身份；不一致的自称值单独记 `attested_reviewer`，不覆盖 `decided_by`（`gw-routes-decide.ts:87-99` 注释） | — | 对应索引 §3.1E"proposal identity 必须绑定 committed effect"，此处是"决定者身份必须绑定认证身份"的姊妹约束 | 依赖会话中间件注入的 `req.authType`/`req.reviewer` 对象，属该 Express 应用自有的认证层结构 |
| CopilotKit `ApprovalResponse` | `{approved, actionId, reference}` | 恢复时与原 `GovernedAction.id`/`reference` 相等比对通过才执行 | — | 同上"proposal identity 绑定"要求的另一种实现，但只是运行时相等性检查，不产出持久记录 | 比对逻辑运行在图执行的服务端进程内存中，未见落盘表；本卷两页文档均未描述该比对失败后的审计记录形态 |
| VekInbox `requests` 决定字段 | `resolvedBy`/`resolvedAt`/`resolutionAction`/`resolutionNote`/`resolutionPayload` 直接落在同一行，非独立收据表 | CLI `request resolve --action approve --note "..."` | — | 接近 DecisionReceipt 但不满足"独立不可变记录"：这些列可被同一行后续 UPDATE 覆盖（本卷未见防覆盖约束） | 字段是 `requests` 表上的可变列（`vekinbox-schema.ts:274-280`），"决定"与"请求"共用一行生命周期，而非分离成追加式表 |

---

## 3. 与 SE 冲突清单

1. 21st-dev `ToolApprovalFooter`（SRC-08）：Approve 按钮同时承担"批准工具继续"（permission 语义）与"接受已生成 diff"（proposal review 语义），按下后文案只到"Waiting…"，组件内无 commit/执行确认态（`tool-approval-footer.tsx:21-40`）。
2. beUI Tool Approval（SRC-03）：`Allow once`/`Always allow` 点击后直接进入 `running`（执行开始），"允许调用"与"执行已发生"在该状态机里是同一次转移，无独立的"仅授权、尚未执行"停留态供二次确认。
3. Suna reducer（SRC-09）：`kind='approval'` 的 `a` 键（"Approve / ship"）横跨 permission（工具/连接器调用）与 proposal review（发布产出）两类场景，`rollupApprovalStatus` 把两者统一收敛为同一对 `approved`/`rejected` 终态，reducer 层面不区分"已批准"与"已生效"（`suna-review-reducer.ts:23-27`）。
4. Gatewerk `/decide` legacy 路由（SRC-06）：单次 POST 内完成"写决定列"与"触发 `executeReviewAction`（含 webhook 派发给下游系统）"，approve 分支没有独立的"已批准、尚未对外生效"停留窗口（`gw-routes-decide.ts:233-249`）。
5. 依赖 React/框架特有对象的位置：CopilotKit `useHumanInTheLoop`/`useInterrupt` 绑定 LangGraph TS 图节点与 React hook 生命周期（SRC-01，文档明确写出 interrupt 在 LangGraph TypeScript 侧尚不支持）；beUI 与 agent-approval-card 全部状态由 React `useState`/`useReducedMotion`/`motion/react` 承载（SRC-03、SRC-04、SRC-07）；21st-dev EditTool 依赖 `@pierre/diffs/react` 的 `MultiFileDiff` 与其私有 CSS 变量体系（SRC-08）。
6. 依赖 Postgres/ORM 特有对象的位置：Gatewerk 状态合法性由 `reviews_status_chk` CHECK 约束与 Drizzle 乐观并发列强制（SRC-06，`gw-030-status-enum.sql`、`gw-execute-action.ts:214-222`）；VekInbox 幂等靠 `requests_workspace_key_unique` 唯一索引，超时/升级靠 BullMQ + Redis worker，无 Redis 则"requests never expire or escalate"（SRC-10 README 原文）。

---

## 4. 结论（≤10 行，仅观察）

1. 十个来源的状态词都比 SE 既有的 question 四态 / run 八态更细（beUI 7 态、Suna 7 态、VekInbox 7 态、Gatewerk 5 canonical 态），SE 四态更像是它们的粗粒度投影，未见任何来源直接使用 `pending/resolved/expired_restart/cancelled` 四值集合。
2. "allow 是一次写授权，不是成果接受"在源码层面最接近的独立实现是 agent-approval-card 的"host 持执行与持久、组件只持临时编辑 UI"边界，以及 Gatewerk 的 `suggested_value`/`approved_value`/`edited_payload` 三字段分离；两者互不引用，各自到达同一区分。
3. proposal identity 绑定 committed effect（索引 §3.2 E 类）有两种独立实现：Gatewerk 用数据库行版本号做乐观并发（`expectedVersion`→`version_mismatch`），CopilotKit 用 `actionId`+`reference` 的内存相等性比对；两者都不天然产出一条不可变收据记录。
4. 十来源中至少四处（21st-dev EditTool、beUI Tool Approval、Suna reducer、Gatewerk `/decide`）把 permission、proposal review、commit 三类中的两类合并到同一个 Approve 动作里，索引 §13 的反模式在成熟开源项目中普遍存在，非本地独有风险。
5. destructive 不批量、unknown reversibility 不安全的规则在 agent-indicator（`reversible: true/false/'unknown'`）与 Suna reducer（`isSafeRisk`/`approveAllSafe`）中各自独立实现，字段名与取值域都不同，未见共享词表或互相引用。
6. j/k 与批量键盘操作只在 Suna 一处完整出现（`j/k`、`Enter/o`、`a`、`e`、`d`、`x`、`1/2/3`、`/`、`?`，`suna-review-center.tsx:118-128,697-717`）；VekInbox 的 Web inbox 未见对应键盘层文档（本卷未展开读取 `apps/web`）。
7. 幂等字段命名与持久化位置不统一：Gatewerk 是请求体上的 `idempotency_key`（应用层查重语义，OpenAPI 描述"terminal conflict returns 409"），VekInbox 是 `requests.key` 加数据库唯一索引 `requests_workspace_key_unique` 加 `idempotencyReusedCount` 计数列。
8. 十个来源均无与 SE `waiting_user`/`expired_restart` 完全对应的字符串；最接近的是 VekInbox 的 `timed_out`/`escalated`，但那是 run 级失联/升级语义，不是 question 级语义。
9. 十来源中只有 Gatewerk 的 `audit_log` 表满足"不可变记录"的技术前提（`prev_signature` 链式签名、`signature_version` 演进注释明确说明历史签名方案不回填）；VekInbox 的决定字段落在 `requests` 表的可变列上，可能被同一行后续更新覆盖。
10. 框架耦合在源码可见处几乎无一幸免：React state 及其动画库（beUI、agent-approval-card、21st-dev）、LangGraph 图节点生命周期（CopilotKit）、Postgres CHECK 约束与行版本号（Gatewerk）、Redis/BullMQ worker（VekInbox）——本卷未见任何来源把这四个原语的状态机完整剥离出前端框架或关系型存储层单独描述。
