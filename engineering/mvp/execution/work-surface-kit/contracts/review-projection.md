# Review 投影契约（WO-WK3，Fable，2026-09-08 冻结）

依据 intake WK-3 / WK-4、EX-WK1 §2–§3、ux-conventions §1–§4。只定义前端投影类型与映射，不新增后端状态、字段或端点；类型文件 `review-projection.d.ts` 只供 `app/web` 与 fixture。

## 1. 类型

```
ReviewProjection
  kind        'permission' | 'question' | 'outcome'
  id          question: row.id；permission: 同源；outcome: runId
  sessionId   投影时的 session
  summary     question: row.prompt；permission: payload.preview（≤ 400 字）；outcome: run 完成页脚一行
  target?     permission: payload.path + bytes + contentSha256 + toolCallId
  status      question: pending | resolved | expired_restart | cancelled
              permission: pending | allow | deny | expired_restart | cancelled
              outcome: completed | cancelled | failed | unknown（run 终态；不含 accepted）
  actions     question pending → [answer]；permission pending → [allow, deny]；其余 → []
  decision?   permission: row.decision；question: row.answer（自由文本）
  createdAt?  question.createdAt；outcome: run.endedAt
```

`ReviewItem` 信封中本地无对应的字段（matterId、actor、proposal、patch、evidence、risk、reversibility、policy、expiresAt）不出现在类型里（EX-WK1 §3）。commit gate 只作注释占位："待 Core 契约（core-contracts §2）"。

## 2. 三集合归属（DC-2，允许重叠）

| 集合 | 归属规则 |
|---|---|
| Waiting for you | status = pending 的 question / permission（`pendingItems`） |
| Continue | 会话有非终态 run 或最近活动（`sessionCandidates`） |
| Needs a look | run failed / unknown、`unrecorded_files` notice（`inspectionCandidates`） |

WK-86 (2)：`Continue` 集合在产品内的可见名是 **`In progress`**（tile 与下带段标题共用这一个名字，copy-convention §3），集合键 `sessionCandidates` 与上表的归属规则均不变。

## 3. 动作表

permission → allow / deny（一次写授权，不是成果接受）；question → answer（自然语言，不授权）；outcome → 无动作。accept / reject / revise 在 Core 契约成立前不出现（WS-01 / A-4）。

## 4. 身份与不变量

- 授权项绑定 questionId + toolCallId + path + bytes + contentSha256 + preview；参数变化即新项。
- inline（Thread 卡）与 inbox（Home 三集合）读同一 `work-summary` 与 thread 投影，解决一项后两处即时一致；非 pending 永不显示按钮。
- 已关闭项退灰字；失败不静默折叠；断连保留最后确认状态并禁用动作。
- `outcome` 当前无实现（EX-WK1 / WK-24）：WO-WK4 若引入，只作只读摘要，字段限本表。

## 5. 验证

对 fixture 四会话（rich / waiting-permission / waiting-question / empty）逐项填出投影，无 `无` 字段。真实 provider 列 `not_run`。

## 6. 微交互附注（EX-WK2 消费，2026-09-08；不改 §1 类型）

| 项 | 采纳 | 不采纳 | 来源 |
|---|---|---|---|
| 授权卡状态过渡 | pending → submitting（按钮禁用、文字 "Sending…"，不换图标）→ 服务端确认后收成 ledger 一行 | beUI 的 7 态与 "allow 即 running"：SE 的 allow 是一次写授权，执行与否由 tool.result 事件另行投影 | EX-WK2 §2.1 beUI、§3.2 |
| Always allow | — | 不出现在卡上；策略级放行属 runtime 控制面（WO-RC 的 PolicyRule effect），与单次授权分面 | §2.1 beUI；RC-2 |
| 批量与风险 | 无批量（SE 无 risk / reversibility 字段，unknown 即不安全） | Suna `approveAllSafe`、agent-indicator 长按 | §2.1、§2.3；WK-4 |
| 身份绑定 | questionId + toolCallId + path + bytes + sha256（等价于 CopilotKit actionId + reference 的相等比对） | Gatewerk 行版本号：前端无持久版本 | §2.4 |
| 组件边界 | 宿主持执行与持久，卡只持临时 UI；answer 文本在提交前留在卡内草稿 | agent-approval-card 的 edit-then-approve：SE 授权不可改参数 | §2.2 |
| inbox 键盘 | `j` / `k` / `↑` / `↓` 移动焦点，`Enter` / `o` 打开；焦点在输入控件时不拦截 | `a` / `e` / `d` / `x` / `1-3` / `/`：合并了 permission 与 proposal review，或引入批量与搜索 | §2.3 Suna；§3.3 |
| 决定收据 | 本轮只显示 permission/resolved 事件的 decision 与时间 | 审计表、链式签名、resolvedBy 防伪：待 Core（core-contracts §2） | §2.4 Gatewerk、VekInbox |
| 分离原则 | permission ≠ proposal review ≠ commit 在 UI 与类型上分开 | 四个来源把两类合进一个 Approve（§3.1–3.4），不迁移 | §3、§4.4 |

## Astra 联调补充：一次工具调用授权

既有 runtime control 的 permission 也覆盖策略为 ask 的非写工具及 MCP 调用，动作仍只有 allow / deny。`payload.tool` 明确为 `ws_write` 才使用一次写入语义；其他工具的 path 是被评估的 resource（可能为 `*`），bytes / contentSha256 / preview 绑定序列化参数，而不是文件内容。名称与远程来源从同一 Run 的 recorded runtime.bound 读取，不从当前资源目录回填。旧记录缺少 tool 时使用保守通用动作词。此补充不提供 Proposal/commit 或成果接受，也不关闭 WK10b/H1 的未实施范围。
