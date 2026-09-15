# 04 · 让真实长 Run 保持可读

2026-09-16 · Claude（Fable 5.1）裁决与实现；Sonnet 5 做缺口比对与共享渲染器的机械抽取。消费 [Run surface 原 PR](../../design/chat-flow-2026-09-10/run-surface-pr-20260914.md)；owner 回写见该 PR 文末。

```text
Task / scope: Run surface PR 的未完项：已完成动作在任意 Run 状态下折叠、用户时间贴气泡右缘、Chat/Attention 共用工具行解剖
Base SHA / branch: 03 片末 2ad30c4 / claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；Sonnet 5 抽取 run-rows.mjs（02b92c6）；非作者复核与人的目验未做

Owner fact + contract: Host 事件日志/Run 身份不变；Chat projection 持有派生分组（thread-projection / execution-disclosure），renderer 持有展开/焦点/滚动
比对结论（Sonnet 只读，作者复核）: 中间叙述不带 footer、确有 final 才有回复动作——已交付（output-message-boundary 测试）；Stop 三态（Sending… / Stopping / 终态）——已交付；刷新只读回原 Run——已交付；"Allow edits for this run"——正确缺席。真实缺口三项，本片全部处置
Semantic / projection / control / placement: "已完成动作"指调用已结算而非 Run 已结束：execution-disclosure 对任意已知 Run 折叠已结算成功调用，当前调用/失败/待批准保持可见；用户消息 footer 内动作行在前、时间在后，时间贴气泡右缘；run-rows.mjs 持有 toolGlyph / 工具与检查详情 / renderToolRow，Chat 与 Attention 同源
Affected UX rule IDs: UX-05（取消请求≠已停，沿既有三态）、UX-07（同类节奏一致：两面同一工具行）、UX-08（模型结果与 Host 结算分列，沿 03）
Nearest precedent: execution-disclosure.mjs 原折叠计划；user-message.mjs footer；app.mjs 原 tool-card 分支（抽取源）；固定 SHA 2ad30c4
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: 折叠控件、成员 id、执行披露的展开记忆不变；Attention 自己的展开记忆保留；键盘顺序动作在前
Intentional changes: execution-disclosure 门槛改为"Run 已知"；user footer 顺序；Attention 工具行改用共享渲染器（不再 JSON 倾倒）
New terms / primitives / dependencies: 模块 run-rows.mjs（静态清单已登记）；无新词、token、依赖
Exceptions: 无
```

## 提交

| 提交 | 内容 |
|---|---|
| `b95609a` | 任意 Run 状态折叠已结算成功调用；测试改写为按状态逐一断言 |
| `f9b271e` | 用户消息时间在 footer 末尾、贴气泡右缘 |
| `ef14077` · `6450911` | 用户中途指令：窄屏停靠带先改页面色、再改透明，composer 自身浮层阴影承担过渡；不引入 blur |
| `67ce328` + `02b92c6` | run-rows.mjs 共享渲染器（app.mjs 侧随前一提交入库）；工作面只属 session 视图（Chat 列表页不再露出面栏与按钮）；Attention 工具行与 Chat 同解剖；6 项渲染测试 + 一致性断言 |

## 作者检查

| 检查 | 结果 |
|---|---|
| `node --test tests/execution-disclosure.test.mjs tests/run-rows.test.mjs tests/attention-agent.test.mjs tests/check-ui.test.mjs tests/chat-actions.test.mjs tests/user-message.test.mjs` | 全部通过（36 + 21） |
| `npm test` | 1117 项中 1116 通过（Node 25.9，并发 4）；唯一失败为 workspace-card 测试里一条源码断言仍指向 app.mjs 的工具字形映射（已随 02b92c6 迁入 run-rows.mjs），断言改指 run-rows.mjs 后 `tests/workspace-card.test.mjs tests/run-rows.test.mjs` 16/16；未改产品代码 |
| 浏览器目验 | 含失败写入的 Run：`repo_write · Failed` 可见，其后成功的检查折进 `Execution · 1 successful tool action`；两次成功的 Run 折为 `2 successful tool actions`；用户气泡右缘 680 / 时间右缘 674（改前 536） |

## 未完项

- app.mjs 的渲染器仍是整体重建 + 外置状态恢复（展开/选区/焦点/滚动都保住，但不是按身份增量 patch）；PR 验收结果满足，DOM 身份保持留作后续性能片。
- 无法从测试导入 app.mjs，footer 门槛与 Stop 三态只有投影级与源码断言，无 DOM 级测试。
- 问题/批准卡的两面一致性只抽了工具行；question/permission 卡仍各自绘制（Attention 手写版），留 10 片。
- 用户时间对齐的 390/200%/明暗人目验未做；SSE/long-poll 按原 PR 继续 defer。
