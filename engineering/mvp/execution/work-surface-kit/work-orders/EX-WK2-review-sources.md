# EX-WK2 · Review 纵切外部溯源（Sonnet，只读）

状态：骨架；可与 EX-WK1 并行。输出 `../explore/ex-wk2-review-sources.md`，卷首标 `带溯源索引`，转录值直接入表。

## 问题

Review 纵切四个原语（PermissionGate、ReviewCard / outcome、ReviewInbox 三集合、DecisionReceipt）各自在 2–4 个成熟来源中的 anatomy、状态机、键盘与注意力策略。对应索引 §12 Phase C。

## 来源（每原语限此列，不扩）

| 原语 | 来源 | 追什么 |
|---|---|---|
| PermissionGate | CopilotKit governed actions（§4.5）；beUI Tool Approval（§6.3）；agent-indicator（§6.5） | action id 绑定 resume；allow once / always / deny 的 pending → submitting → resolved 收缩；destructive 不批量、unknown reversibility 不视为 safe |
| ReviewCard / outcome | Gatewerk（§5.1）；agent-approval-card（§6.4）；Agent Elements `EditTool`（§4.4） | suggested-vs-approved 字段；host 持执行与持久、组件只持临时编辑；diff + approval 卡 anatomy |
| ReviewInbox | Suna Review Center（§4.8，固定 `ef2a0c70`）；VekInbox（§5.2） | Needs you / Waiting / Done 分段；j/k、approve、ask changes、dismiss、bulk、search 的 reducer；durable queue 的 idempotency / timeout / escalation 字段 |
| DecisionReceipt | Gatewerk 审计历史；CopilotKit verdict 信封 | 不可变记录字段；proposal identity 绑定 committed effect |

## 交付物

1. 溯源索引行（体例 §3），每来源一行，含访问日、许可、固定 SHA 或版本。
2. 每原语一张 anatomy 表：区域 · 状态 · 动作 · 键 · 与 SE 既有词的对应（allow / deny / answer / waiting_user / resolved / expired_restart）· 不可迁移的假设。
3. 与 SE 冲突清单：来源中把 permission、proposal review、commit 合为一键的位置；来源中依赖 React / Postgres / 框架 interrupt 对象的位置。
4. 结论 ≤ 10 行。

## 不得

不下"采用"结论；不复制源码入卷（只 file:line 与转录值）；不访问未列来源。
