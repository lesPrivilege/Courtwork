# WO-ATT-FE01 · Attention 前端切片（骨架，WK-136，2026-09-09）

后端合同：[docs/work-core/attention.md](../../../../../docs/work-core/attention.md)（ATT-BE-01，main `0480c17`，产品 `d37704e`，Astra 非作者接受；Fable 非作者复跑 305/305 + 披露探针 5/5，hash 与 [独验记录](../../../../../evidence/attention-independent-20260909/README.md) 一致）。设计输入：[attention-surface §常驻Attention与Home](../../../../design/attention-surface-2026-09-09/README.md)。队列位置：FE-05 之后（WK-117 默认；WK-120 队列 CC-I 之后，换序归用户）。派单方式待定（`opus-wo-medium` 倾向：需按 human_actions 描述符逐项判断）。

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
