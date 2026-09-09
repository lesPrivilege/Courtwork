# WO-ATT-FE01 · Attention 前端切片（骨架，WK-136，2026-09-09）

后端合同：[docs/work-core/attention.md](../../../../../docs/work-core/attention.md)（ATT-BE-01，main `0480c17`，产品 `d37704e`，Astra 非作者接受；Fable 非作者复跑 305/305 + 披露探针 5/5，hash 与 [独验记录](../../../../../evidence/attention-independent-20260909/README.md) 一致）。设计输入：[attention-surface §常驻Attention与Home](../../../../design/attention-surface-2026-09-09/README.md)。队列位置：FE-05 → ATT-FE-01 → CC-I（Astra 2026-09-10 裁定，按本次交接授权换序；四项文档前置仍须补齐）。派单方式待定（`opus-wo-medium` 倾向：需按 human_actions 描述符逐项判断）。

## 切片

- **a · 常驻入口 + 独立工作面**：全局导航稳定入口 → Attention 面（列表 / 筛选 → 详情；桌面列表 + 详情，窄屏列表 → 详情返回）；进入后仍能回原 Chat / Work；切 Session 不重置。
- **b · Home 可选摘要**：CC-D0-a 预留的模块 id 上安装，只显示最有意义条目 + 下一动作 + "查看全部"，读同一 service 投影；隐藏不 resolve / snooze。
- **c（不在首单）**：`request_disclosure` 的 grant 编辑器（adapter_id / fields 子集 / expires_at）= policy editor，归候选 CC-P；首单只显示当前 grant 有无与到期。

## 合同 → 前端事实（constraints 的来源，逐条可断言）

| 合同条 | 前端事实 |
|---|---|
| registry 只回 id / title / status / freshness / revision / time | 列表就是最小视图；summary / reason / next action / basis 逐对象 `inspect`；不把 registry 当详情权限 |
| `human_actions` 只广告当前适用动作 + `payload_schema` + expected revision | 按钮只为广告的动作生成；仍处理服务端拒绝；可见按钮不等于权限（合同原话） |
| 每动作带 `expected_revision`；409 `VERSION_CONFLICT` 无部分事件 | 动作携带最近一次 inspect 的 revision；冲突 → 重读后再试，不静默重放 |
| 同 request_id 精确重放回原回执；丢响应 → `request` 查询再 `inspect` | request_id 由前端生成、按对象保存到确认为止；断线不写"已完成" |
| `NOT_FOUND` 统一 unavailable；隐藏行不影响 count / offset | 文案只说 unavailable，不推断存在性 |
| `resolve` 须 reason；`snooze` / `set_waiting` 须 next_action ≠ none | Governed Action：无一键 resolve；reason 为必填文本；next_action 编辑器 `{kind,label,trigger,due_at}`，`at` 必带 due_at |
| `acknowledge` = seen，一去不返 | 不是 toggle；WK-133 (e) 的 Line ↔ Fill 仍无 schema |
| `attach_relation` kind matter / session / run / external | entity picker 首次有 schema（WK-129 Selection 候选 → 本单内"今日有"）；external 为惰性字符串 |
| limit 1–50，默认 20；1000 对象上限 | 分页显式；不做无限滚动假象 |
| 无 scheduler；due_at 是记录不是闹钟 | 不显示倒计时、不本地计时 |
| 普通刷新零模型调用（attention-surface 要求） | 断言：打开 / 刷新 Attention 面不触发任何 Run |

## 派单前置（Fable 裁定，不派单）

1. 词表 §6 Attention（[ui-state-vocabulary](../contracts/ui-state-vocabulary.md)）定词，含冲突规则：`Waiting for you` 专属 Today strip（work-summary），Attention 的 `waiting` / `needs_you` 不得渲染为 "Waiting for you"。
2. 错误文案裁定（M-3）：409 九个 code 的可见句，至少 VERSION_CONFLICT / IDEMPOTENCY_CONFLICT / NOT_FOUND / DISCLOSURE_DENIED / INVALID_TRANSITION 五条。
3. 入口位置裁定：CC-S 后全局导航已由 Settings 替换，Attention 常驻入口落侧栏分区还是顶带槽位（unresolved ①）。
4. copy-convention §3 增 Attention 动作动词表（Acknowledge / Snooze / Set waiting / Resume / Resolve / Reopen）。

### 交接契约（WK-112 §VI，待填）

```yaml
design_task:
  intent:
    user_goal: 看到"什么事、为什么现在需要我、下一动作"，并能以有回执的动作推进它
    primary_action: 对单个 Attention 执行一个 typed action
    information_priority: needs_you > waiting（到期）> investigating > later > resolved
  constraints:
    functional: 见上表；无 scheduler；无模型调用；grant 编辑器不在首单
    business_states: investigating / needs_you / waiting / later / resolved（合同）；freshness unknown 不画 stale；seen 不画徽章只画词
    navigation: 常驻入口 → 面 → 详情 → 回原处（focus / scroll 保留）
    density: 列表沿 Chat Flow 行解剖；详情沿 settings row / PropertyRow
    responsive: ≥1680 三栏含 Attention 面？（unresolved ②）；<768 列表→详情
    accessibility: 动作按钮 accessible name = 动作全名 + 对象标题；409 以 alert 播报
  existing_system:
    components: 侧栏分区、tab strip、settings row、question-card（reason 文本）、connection-popover（详情披露参照）
    tokens: 无新 token
    screens: Home（模块 id）、Work surface（tab 是否承载 Attention 详情：unresolved ②）
  references:
    positive:
      - {source: S12 frontier 项目面（图 8）, exact_element_to_borrow: 全局稳定入口 + 局部上下文动作, why: attention-surface 图 8 复核}
      - {source: Primer undo over confirmation（WK-122 d）, exact_element_to_borrow: 可逆动作不加确认；resolve 因 reason 必填天然有摩擦, why: 摩擦来自 authority 不来自组件}
    negative:
      - {source: Today strip 词, avoid: 复用 "Waiting for you", why: 两个对象一个词}
      - {source: dashboard 计数卡, avoid: 以 count 代替具体条目, why: WK-117 (b)}
  unresolved:
    - {question: 常驻入口在侧栏分区还是顶带, competing_constraints: CC-S 已撤全局导航 vs 常驻可发现}
    - {question: 详情在 Attention 面内还是作为 Work surface 一个 tab 类型, competing_constraints: 四类型合同（CC-W）改约成本 vs 回原处}
  exploration: {variant_count: 3, require_structural_difference: true}
  review: {removal_pass: required, constraint_recheck: required, state_review: required, real_data_review: required}
```

---

## 2026-09-10 重新划界（Fable，WK-152…WK-160）

上文（WK-136 骨架）写于 ATT-BE-01 刚合流时。此后 Astra 已交付 [全局助手与 Runtime 组合](../../../../design/attention-agent-2026-09-10/README.md)（AG-1…AG-6），**切片 a 与切片 b 已以只读形态存在**：

| 原切片 | 现状 | 位置 |
|---|---|---|
| a 常驻入口 + 独立工作面 | 已交付，但入口打开的是**助手对话**不是事项面；事项面本身只读 | `app/web/index.html:119`；`app/web/app.mjs:6018`、`:6444-6445`；`app/web/attention-view.mjs` |
| b Home 可选摘要 | 已交付 | `app/web/app.mjs:5228-5230`；`home-view.mjs` |
| c grant 编辑器 | 不变，仍归 CC-P | — |

因此本单**不重做 a / b**，改为一件事：**把已有的后端权能接到人手里**。完整裁定见 [attention-triage-2026-09-10](../../../../design/attention-triage-2026-09-10/README.md)。

### 新切片 d · 处置面（唯一待派）

| # | 交付 | 裁定 |
|---|---|---|
| 1 | 侧栏入口直达事项面；助手降为面内持续可见的显式入口 | WK-155（**需 Astra 确认**：反转已交付落点；退路见裁定） |
| 2 | `All states` 下拉改为显式状态视图组（All 默认 · Needs you · Investigating · Waiting · Later · Resolved）；Later 不折叠不隐藏 | WK-156 / WK-160 |
| 3 | 行内渲染 `updated_at` 相对时间（投影已有、未使用）；**不加** `reason` / `next_action` / source 字段 | WK-157 |
| 4 | 详情出 typed actions：只为 `human_actions` 广告者出按钮；带 inspect 的 `revision`；`request_id` 按对象保存到确认为止；`resolve` reason 必填且不加确认对话；`snooze` / `set_waiting` 出 `{kind,label,trigger,due_at}` 编辑器（`at` 必带 due_at）；**无批量** | WK-158；动词表 [copy-convention §3.8](../../../../design/copy-convention.md) |
| 5 | M-3 九条 409 文案 + `role="alert"` 播报 | WK-158（文案已定稿于设计页 §3.4） |
| 6 | 列表 `J`/`K`、`Enter` 进详情、`Escape` 回列表；沿用现有 `data-attention-focus` 保持机制 | WK-157 / 设计页 §3.7 |
| 7 | proposal 模块位：只留位置，**不渲染任何内容**，不出占位卡、不出 "until BE-XX" | WK-159 |

**写权**：只 `app/web/`（`attention-view.mjs` 为主，`app.mjs` 入口一行、`presentation-adapters.mjs` 若需）。不改 `app/core/`、`app/server/`、`app/runtime/`。单一 writer 规则不变（WK-150：本地 Opus 写 `app/web`）。

**前置**：[BE-40](../backend-requests.md) 排序口径（不阻塞第 3–7 项，只阻塞第 2 项的默认序主张）；WK-155 的 Astra 确认（不阻塞第 2–7 项）。[EX-AT1](../explore/ex-at1-attention-triage.md) 只影响记账，不阻塞。

**明确不在本单**（留待后续施工）：source-aware 行与 source-native 详情（等 HL-A0 typed 观察快照）、proposal 的实际渲染与批准流（等 HL-A1）、批量动作、saved views、密度档、batching / bundles / delivery schedule（需 scheduler owner）、TPS 与 live instrumentation（已冻结为 null）、真实 Email / GitHub 接入（需真实账户与外发授权，均未授权）。

**四项派单前置已全部关闭**：词表 §6 已定（WK-136）；M-3 定稿（WK-158）；入口位置由既有事实关闭（侧栏 `index.html:119`，与 `New chat` / `Home` 同排——unresolved ① 消解）；动作动词表见 copy-convention §3.8。原 unresolved ②（详情在 Attention 面内还是作为 Work surface 一个 tab 类型）由既有事实关闭：详情已在 Attention 面内，四类型合同未动。
