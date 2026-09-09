# Attention：认领后端架构与前端 UX（Fable，2026-09-10）

基线 `main` `461ab12`。输入：[Sonnet explore 转录](../../mvp/execution/work-surface-kit/inputs/attention-triage-2026-09-10.md)（R-1…R-19）与用户指令「认领 attention assistant 的设计，包括后端架构，和前端 UX」。裁定编号 WK-152…WK-160 记在 [intake-round-3 §4av](../../mvp/execution/work-surface-kit/intake-round-3.md)。

**这是什么**：一次设计裁定与施工排序。**不是**：产品验收、已实现能力、已冻结 HTTP 字段、对 Astra 已交付构造的推翻。本页不新造 ATT-* / HL-* 编号（归 Astra），不代 Astra 冻结 proposal 合同。外部主张在 [EX-AT1](../../mvp/execution/work-surface-kit/explore/ex-at1-attention-triage.md) 一手核验之前不支撑任何裁定；本页凡引用报告处，只引其**已被本仓事实印证**的部分。

## 0. 一句话结论

> Attention 今天是一个**可以对话、可以阅读、不能处置**的表面。缺的不是 inbox 布局，是**处置层**。

三条可验证的事实支撑它：

| 事实 | 位置 |
|---|---|
| 侧栏常驻入口 `#attention-button` 打开的是**助手对话**，不是待处置事项 | `app/web/app.mjs:6018`（`attentionAgent.open()`）；事项面只能从对话内 "Attention items" 或 Home 模块进入（`app.mjs:5230`、`:6444-6445`） |
| 事项面是**只读**的：合同的九个 typed human action 一个都不可达 | `app/web/attention-view.mjs` 全文只有 project / filter / refresh / 分页 / 选中；行内自述 "Opening it does not acknowledge or resolve it." |
| 合同**早已**具备处置所需的全部机制 | [attention.md](../../../docs/work-core/attention.md)：`human_actions` 描述符、`expected_revision` CAS、`request_id` 重放回执、九个 409 code |

所以本轮的施工不是重画列表，是**把已有的后端权能接到人手里**。

## 1. 认领前的既有事实（不重开）

| 已冻结 / 已交付 | owner | 位置 |
|---|---|---|
| Attention 领域合同（身份、五状态、typed actions、CAS、披露、查询、409） | Astra，ATT-BE-01 已接收 | [docs/work-core/attention.md](../../../docs/work-core/attention.md) |
| 全局助手与 Runtime 组合（AG-1…AG-6） | Astra，已交付 | [attention-agent-2026-09-10](../attention-agent-2026-09-10/README.md) |
| Email/GitHub human decision queue 方向**已采用**；五语义对象映射、权限与有效性、trace P0–P6、恢复范围 | Astra，2026-09-09 | [attention-human-loop](../../research/attention-human-loop-2026-09-09/README.md) |
| 来源与 trace 接缝（HL-A0）、proposal / human gate / effect（HL-A1） | Astra，`waiting-contract` | [work-orders.md](../../research/attention-human-loop-2026-09-09/work-orders.md) |
| Gmail / GitHub 离线反例夹具（HL-T1 / HL-T2） | 已在库 | `app/tests/fixtures/attention-ingest/{gmail,github}/` |
| 词表 §6 Attention（含 `Waiting for you` 冲突规则） | Fable，WK-136 | [ui-state-vocabulary §6](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) |

**因此本报告的方向性主张（R-1 / R-9 / R-10 / R-19）是既有裁定的外部印证，不是新方向。**2026-09-09 的输入自述 6 workstream / 约 58 结果，本轮自述 5 workstream / 56 结果，是同一研究线的后一轮。R-11 / R-12 的 Gobii「确切版本批准 / conversation changed / stale」逐条已在 HL-A1 的验收表内（「approve 后目标变化、payload 编辑、撤权、过期……旧批准不覆盖新文本、新收件人或新 PR HEAD」）。**不重复收编，记为印证**（WK-152）。

## 2. 后端架构：三条轴的归属

报告 R-3 提出 `source_state` / `attention_state` / `proposal_state` 三轴。裁定：**三轴成立，但它们不是一张表的三列，是三个不同 owner 的事实**（WK-153）。

| 轴 | owner | 在 Courtwork 里的合法形态 | 硬反例 |
|---|---|---|---|
| `attention_state` | Core，已交付 | `investigating / needs_you / waiting / later / resolved` + event + receipt + CAS | 不得改名、不得加第六个值、不得把 `priority` 塞成状态 |
| `source_state` | **外部 provider，永不镜像** | HL-A0 的**有界观察快照**：`provider/account/resource/version/observation` + `observed_at` + coverage + cursor | 不得存成「当前状态」列；合同里 external ref 是不解引用的惰性 locator，`freshness` 恒 `unknown`——把它画成实时状态就是投影创造事实（Projection Grammar 第四条） |
| `proposal_state` | **待 HL-A1 冻结** | 独立对象，经 `relation_refs` 关联到 Attention | 不得成为 Attention 的字段；`resolve` 是人对注意力的判断，`approve` 是对外部效果的授权，合同明说 Attention 动作「affect Attention only, not a Matter decision, tool permission or external system」 |

**观察快照 ≠ 状态镜像**是这一节的全部重量（WK-154）。一个 `state` 假装自己是当下的；一个 `observation` 自带时间与缺口，可以老、可以缺、可以说 unknown。Courtwork 只被允许持有后者。UI 由此得到一条不可协商的渲染规则：任何来自外部源的字段，旁边必须能读出「observed at T」或 `unknown`，**不得以任何视觉手法暗示它是实时的**。

### 转 Astra 的后端请求

只有一条真的缺口（[BE-40](../../mvp/execution/work-surface-kit/backend-requests.md)）：**registry 的排序口径没有写进合同**。合同 §Queries 定义了 `items / count / offset / next_offset / truncated / disclosure`，但没有说 registry 按什么顺序返回。一个 triage 面的默认顺序是产品事实，不能由前端在分页边界上自行重排（客户端排序会跨页错乱）。请求：合同写明 registry 默认序为 `needs_you > investigating > waiting > later > resolved`，同档内 `updated_at` 降序。

**不请求**的三项，以及为什么：

- **registry 加 `reason` 摘要**——合同刻意把 registry 冻结为最小视图，WO-ATT-FE01 的约束表已断言「不把 registry 当详情权限」。列表行拿不到 `reason`，这是设计边界不是缺陷，见 §3.3。
- **每状态计数**——WK-117 (b)：不以 count 代替具体条目；且需五次查询。
- **snooze 到期自动回归**——需要 scheduler；合同明说「A recorded due time or condition is not a scheduler」。见 §3.6 的无 scheduler 补偿设计。

## 3. 前端 UX 裁定

### 3.1 落点：常驻入口先答「什么需要我」（WK-155）

`#attention-button` 改为打开**事项面**；助手对话降为该面内一个持续可见的显式入口（现有 `Open Attention` 的反向）。

理由：常驻入口存在的意义是回答「谁在等我 / 我阻塞了什么 / Agent 做到哪一步」，不是「我要不要聊天」。这不否定 AG-5 的产品身份——助手仍是同一个常驻角色，只是不再占据入口第一屏。改动落在 `app.mjs:6018` 一行，随时可逆。

**这一条需要 Astra 确认**：它反转的是一个已交付的落点决定。若 Astra 反对，退路是入口保持对话、但对话面顶部常驻一条「N 项需要你」的真实条目行（不是计数卡）——代价是多一层跳转，不是设计上的等价物。

### 3.2 视图：五个状态就是五个视图（WK-156）

报告 R-13 的 `Priority · Inbox · Waiting · Later · Done` **不是新词表，是对已有五状态的改名**。拒绝改名（词表 §6 已定稿，且 `Waiting for you` 的冲突规则依赖现有词）。采用其结构主张：

- 顶层是**状态视图**，不是 `Email | GitHub` 源 tab。源在首版根本不存在（见 §3.4），即使存在也是筛选而非顶层。
- 现有的 `All states` 下拉改为一组显式视图：**All（默认）· Needs you · Investigating · Waiting · Later · Resolved**。
- 默认视图仍是 All，但**顺序**由 BE-40 保证 needs_you 在前。一次查询、无计数、无 scheduler，就交付了 R-13 想要的「先答什么现在需要我」。

### 3.3 行解剖：不加字段，加时间（WK-157）

当前行 = `title` + 状态词（`attention-view.mjs`）。裁定：

- **不加 `reason`、不加 `next_action`**——registry 不返回它们，见 §2。「为什么需要我」（R-5）落在详情，选中即见。合同要求每个动作必填 `reason` 且详情必渲染它，这条报告最强的主张**本仓早已满足**，只是位置在详情而非行内。
- **加 `updated_at` 相对时间**——投影里已有（`toHomeAttention` 已映射 `updatedAt`），行内未渲染，是一处零成本增量。
- **不做 source-aware row renderer**（R-14）。原则接受，构造拒绝：`external` ref 是惰性字符串，registry 里没有任何 source 字段，此刻做出来的「source-aware 行」只能是编造的。等 HL-A0 交出 typed 观察快照再谈。
- **不做 dense / detailed 两档密度**（R-2）——两档密度是给成千上万条设计的；本地上限是每项目 1000 对象，且首版没有第二条信息可供「detailed」展开。

### 3.4 详情即处置面（WK-158，**本轮真正的施工**）

详情面从「只读阅读」改为「读 + 处置」，全部按合同：

| 规则 | 合同依据 |
|---|---|
| 按钮只为 `human_actions` 广告的动作生成；仍处理服务端拒绝 | 「A visible descriptor or button confers no authority」 |
| 每次动作携带最近一次 inspect 的 `revision`；409 后重读再试，不静默重放 | `expected_revision`；`VERSION_CONFLICT` 无部分事件 |
| `request_id` 由前端生成、按对象保存到确认为止；丢响应走 `request` 查询再 inspect | 同 request_id + 相同内容返回原回执 |
| `resolve` 的 reason 为必填文本，**不加确认对话** | 摩擦来自 authority 不来自组件（WK-122 d：undo over confirmation） |
| `snooze` / `set_waiting` 出 `{kind,label,trigger,due_at}` 编辑器，`at` 必带 due_at | 合同 next_action |
| `acknowledge` 不是 toggle | seen 一去不返 |
| **无批量动作** | 每个动作各自需要 `expected_revision` + `request_id`，`resolve` 还需各自的 reason；批量要么为多个对象编造同一条理由，要么是 N 次可部分失败的 CAS。拒绝 R-2 的 bulk actions |

**M-3 错误文案**（409 九 code 的可见句，此前的派单前置，现予定稿）：

| code | 可见句 |
|---|---|
| `VERSION_CONFLICT` | This item changed while you were deciding. Reload it and try again. |
| `IDEMPOTENCY_CONFLICT` | A different request already used this identity. Reload the item before retrying. |
| `NOT_FOUND` | This item is unavailable. |
| `DISCLOSURE_DENIED` | You do not have access to this field. |
| `INVALID_TRANSITION` | That action is not available from the current state. |
| `INVALID` | The request was refused. Check the required fields and try again. |
| `ATTENTION_LIMIT` | This project has reached its recorded item limit. |
| `INTEGRITY_REFUSAL` | The recorded bytes did not match. This item was not changed. |
| `CONTRACT_UNSUPPORTED` | This app does not support the recorded schema. |

`NOT_FOUND` 的句子只说 unavailable，不推断存在性（合同：uniform unavailable，隐藏行不影响 count / offset）。409 以 `role="alert"` 播报。

### 3.5 Proposal layer：定形状，留槽，不安装（WK-159）

报告 R-16 的形状被接受为**目标形状**：提案附着在对象上，人的主要动作是判定 / 修订 / 授权，追问才进对话。落位在详情的 `Recorded context` 之上、动作按钮之上：

```text
Agent prepared
────────────────────────
Summary
Why this needs you
What changed since last seen
Proposed action
[ Review exact draft / diff ]  [ Edit ]  [ Approve ]  [ Deny ]
────────────────────────
sources · policy · model
```

**但本轮不建。** HL-A1 未冻结，`proposal` 对象不存在；按 CC-D0-a 的既有规则，不为未来画空卡、不出现 "until BE-XX" 占位。裁定的是形状与位置，交付的是**一个不渲染任何东西的模块位**。同时预先钉死两条，免得 HL-A1 落地时被 UI 反向绑架：

- `Approve` **不得**复用 `resolve`。批准外发与解决注意力是两个授权。
- proposal 变 `stale`（R-12：PR head SHA 变、收件人变、原对话变）时，UI **不得**让人在看起来相同的批准上顺手改掉——旧批准失效即整块提案回到未批准态，重新生成而非就地编辑。这一条与 HL-A1 的验收表一致。

### 3.6 无 scheduler 下的 Later（WK-160）

合同没有调度器，`due_at` 只是记录。因此 `snooze` 到期后**没有任何东西会把事项送回来**。若照 Slack / Linear 的直觉把 Later 做成隐藏抽屉，snooze 就等于丢失。裁定：

- Later 是**默认可见的一等视图**，与其他状态同级，不折叠、不隐藏。
- 详情显示 `Recorded due time`（已实现），**不显示倒计时、不本地计时**。
- 拒绝 R-8 的 batching / bundles / delivery schedule：三者都需要调度器 owner。留待后续施工。

### 3.7 键盘与 Runtime inspector

- 键盘（R-7）：列表 `J`/`K` 移动、`Enter` 进详情、`Escape` 回列表。现有 `data-attention-focus` 的 focus 保持机制已具备承载条件，成本低，纳入首片。
- Runtime inspector（R-18）：报告主张的「平时折叠、极薄」**已经是现状**（`attention-agent-view.mjs` 的 `<details> Runtime & memory`），事项面本就没有 instrument strip。无需改动。两条拒绝：**TPS 不做**（`request-telemetry.md` 已把 `decodeTokensPerSecond` / `providerTtftMs` 冻结为 null，WK-146 / WK-149 已两次裁过）；**运行中不自动展开**（`running ≠ progress` 的邻域，运行态已由真实 Run 状态词承担）。

## 4. 记账：拒绝与延后

| 主张 | 处置 | 依据 |
|---|---|---|
| R-2 bulk actions | 拒绝 | 每动作需独立 CAS + request_id；resolve 需各自 reason |
| R-2 dense / detailed 密度档 | 拒绝 | 1000 对象上限；首版无第二条信息可展开 |
| R-2 saved views | 延后 | 五个状态视图先跑；saved view 需要一份本地偏好合同 |
| R-8 batching / bundles / delivery schedule | 延后 | 需 scheduler owner |
| R-13 `Priority / Inbox / Done` 改名 | 拒绝 | 词表 §6 已定稿 |
| R-14 source-aware row / R-15 source-native detail | 原则接受，构造延后 | 等 HL-A0 typed 观察快照 |
| R-17 参考图的 instrument strip 视觉 | 不消费 | design reference 非行为证据；且与 R-18 自相矛盾 |
| R-18 TPS live instrumentation | 拒绝 | 已冻结为 null |
| R-19 Email + GitHub dogfood | 方向已采用（2026-09-09），本轮不推进 | 需真实账户 / 凭据主义 / 外发授权，全部未授权 |

## 5. 首个可施工切片（有界）

**WO-ATT-FE01 重新划界**（详见 [工单](../../mvp/execution/work-surface-kit/work-orders/WO-ATT-FE01.md)）：原切片 a（常驻入口 + 独立面）与切片 b（Home 摘要）**已由 Astra 交付为只读形态**，不重做。剩下的第一单是**处置面**：

1. 落点改为事项面（§3.1，一行，可逆）
2. 五状态视图 + 行内 `updated_at`（§3.2 / §3.3）
3. 详情的 typed actions + M-3 文案 + 409 处置（§3.4）
4. J/K/Enter/Escape（§3.7）
5. proposal 模块位（不渲染，§3.5）

前置：BE-40（排序口径）；EX-AT1 回执（外部主张核验，只影响记账不影响这五项）。四项派单前置本页已全部关闭：词表 §6 已定（WK-136）、M-3 已定稿（§3.4）、入口位置已由既有事实关闭（侧栏 `index.html:119`，与 `New chat` / `Home` 同排）、动作动词表见 [copy-convention §3.8](../copy-convention.md)。

## 6. 未检

未运行产品测试、未连真实 provider、未读任何真实邮件或通知、未产生任何人类决策样本、未部署。报告的 56 结果 / 5 workstream 自述无法复核。八条外部主张在 EX-AT1 回执前一律未核验，本页任何裁定都不以它们为唯一依据。§3.1 的落点反转需 Astra 确认。`app/core/attention.py` 的实际返回顺序未读（BE-40 请求的正是把它写进合同）。
