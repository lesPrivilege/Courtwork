# 08 · Preview 与检查：facts 真实纵切与对象驱动的右侧阅读

2026-09-16 · Claude（Fable 5.1）裁决与实现；Sonnet 5 做只读勘察。消费 [Presentation 验证节点](../../research/review-surface-2026-09-09/presentation-20260914.md)、[Gateway 增量](../../research/review-surface-2026-09-09/presentation-gateway-20260915.md)、[多源投影](../../research/review-surface-2026-09-09/projection-runtime-20260915.md) 与 v3 [右栏增补](sidebar-trace-review.md)；owner 回写见验证节点文末。

```text
Task / scope: facts 最小纵切——模型 fixture → Host 校验/持久回执 → Chat inline → 同 instance/version 的 Preview → 重开恢复，含文本 fallback；右侧按对象打开（v3），不常驻平铺后台卡
Base SHA / branch: 07 片末 d7e788a（v2/v3/v4 入账与 00 增补之后）/ claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；非作者复核与人的目验未做

Owner fact + contract: 勘察结论——此前不存在任何 presentation 工具、事件或实例身份；FACT（repository write effects / artifact history）、CHECK（check.started/settled）、REVIEW（Core decide / humanActions）三源各自真实且已在 Chat/Inspector/rail 呈现。本片新增第四源：模型经 `cw_present` 提交受限 Spec（facts v1：title ≤120、items ≤40 × {label ≤80, value ≤400}，≤16 KiB，无未知字段、无 HTML/代码/URL），Host 用 `validatePresentationSpec` 精确校验、分配 `pres-<uuid>` 与 revision 1、对规范化 JSON 取 sha256、以 `presentation.created` 事件记在 Run 上（origin: runId / callId / source model-derived）；同 callId 重放同实例；回执只陈述 Host 已记录。`GET /sessions/:id/presentations[/:instanceId]` 只经本 Session 读回；重开保留
Semantic / projection / control / placement: thread-projection 把 `presentation/created` 投成自己的一行（事件位置）；`presentation-facts.mjs` 一个渲染器两种 placement——Chat 行（标题、dl、身份行 `Model-derived · facts v1 · revision 1 · <8位>`、Open in work surface）与工作面 Presentation tab 的 pane，同一实例同一版本；未知 kind/version 写 `Shown as text: this build cannot draw <kind> v<n>.` 并以纯文本列出，不冒称绘制成功。工作面新增 `presentation` kind（tab / card / pane），只在人打开实例时可见（v3：右侧按对象打开）；pane 从 Session 事件取实例，窗口不含时按 id 从 Host 读回
Affected UX rule IDs: UX-08（模型派生与 Host 事实分列：身份行明写 Model-derived）、UX-02（回执 ≠ 已渲染/已看到/已接受）
Nearest precedent: artifact 行与 openFile / fileModule（同一对象两处阅读）；runtime_load 工具（受治理工具、短回执）；候选 diff 对话框（Host 读回）
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: 事件白名单不变（appendEvent 自由类型）；工具治理（governTools/isOpen）不变；FACT/CHECK/REVIEW 呈现不变；Chat 不因 presentation 增加摘要卡
Intentional changes: TOOLS 增 `cw_present`；新 kind presentation；wire golden 单独断言 cw_present
New terms / primitives / dependencies: runtime/presentation.mjs、web/presentation-facts.mjs；无新依赖
Exceptions: 只有 facts v1；chart/flow、组合（composition）、本地 sort/filter、正式动作、Gateway 渐进披露与 Review 语法后置（12 片原型）；实例 UI-only，不回填模型 Context
```

## 提交

| 提交 | 内容 |
|---|---|
| `20f46a9` | Host：presentation.mjs 校验器、cw_present 工具、recordPresentation（callId 幂等）、读回路由；presentation 测试 2 项；wire golden 单独断言 |
| `0128bd6` | Web：投影行、presentation-facts 渲染器（inline / pane / fallback）、工作面 presentation kind（tab、card、pane、按 id 读回）、样式；presentation-view 测试 3 项 |

## 作者检查

| 检查 | 结果 |
|---|---|
| 定向 | `tests/presentation.test.mjs` 2、`tests/presentation-view.test.mjs` 3，及 card-disclosure / chat-work-shell / work-surface-tabs / static-web-manifest / surface-convergence / entry-audit / shell-layout / thread-projection / run-rows 通过 |
| `npm test` | __FULL__ |
| lint | shapes / colors / product-copy / semantic-consumers / interaction 通过 |
| 浏览器（Local test Host，1280） | Chat 发 `/fixture script [{cw_present…}]`：行显示 Parcel helper 的三项 facts、身份行 `Model-derived · facts v1 · revision 1 · 27fa3fde`、Open in work surface；点开后工作面 Presentation tab 选中，pane 同标题、同三项、同身份行；刷新后行仍在、再次打开同实例；无 Runtime 卡回流 |

## 未完项

- 未知 renderer 版本、多 payload、跨 Session 拒绝、重复/迟到调用有 Host 测试或治理先例，但取消后迟到 cw_present 的专项测试未写（governTools 的 isOpen 门槛沿用）。
- chart / flow、组合 pattern、本地 sort/filter/expand、Review 语法、Gateway 渐进披露与外部 adapter 均未做（按验证节点顺序后置）。
- 非作者复核、真实 provider、390/暗色/200% 未做；未 push、未部署。
