# pi harness 源码对照与 Work 对话 turn 设计（2026-07-17）

调研原稿，不具约束力。源：`~/Projects/pi`（Pi Agent Harness monorepo）全源码侦察 + 本仓 turn engine/场景执行器/组装层对照。诱因：真机试点 H 项（Work 自由输入零案语境）与 G 项（「Work 状态引用非法」红条）。

## 核心判定

1. **pi 只借形不移植**（与 ADR-009 决定七一致）。pi 的两条核心设计与我们不变量直接冲突：模型自主选工具/决定轮数（vs 不变量 1 + ADR-009 场景声明式）、确认靠可选扩展默认不存在（vs 不变量 3 确认是 core 强制门）。我们已有且更硬的：六段组装+稳定前缀纪律（pi 无分段律）、账本+CAS 耐久（pi session 树无审计/崩溃安全诉求）、工具 sideEffect 分级运行时门（pi 无内建沙箱）。
2. **值得借的三个局部**：①加法式上下文缝的注入时机；②provider 怪癖归一手法（tool-call id 归一化、断头 tool call 补合成 result——日后多 provider profile 直接参考 `packages/ai/src/providers/transform-messages.ts`）；③steering 队列排队在 turn 边界而非流中打断（`steerQueue` + turn 间 drain）——若日后做「场景运行中插话」，这是正确形状，但 steering 不在当前步骤闭集内，属新概念需拍板。
3. **G 项根因（高置信）**：`App.tsx` `case-${Date.now()}-${title}` 把标题原文拼进 caseId → `work_state.rs safe_token` 只认 ASCII 字母数字与 `-_.` → 中文标题案首次 commit 即 `InvalidRef`。读路径静默 `found:false`、写路径抛错，与「场景打开时报红」吻合。修法：caseId 改 UUID/安全 slug、标题只作展示字段；**不得放宽 Rust 侧 safe_token**（路径穿越红线）。
4. **L0 方案（纯组装零新概念）**：比照 CHAT-MEMORY-1 的 `memorySegment` 加法式可选段先例，`generic-chat` 新增 `workContextSegment`（案根标识/材料清单投影/场景状态/续行投影三态——全部从账本确定性编译），排 memorySegment 之后；缺省逐字节不变；journal 不分家（仍是 Chat Turn，聊天不是 promotion，决策仍走 Work 显式操作落账）。
5. **L1（受控只读工具）拍板方向已批、实现后置**：声明式白名单（比照 `ScenarioRuntime.toolIds`）、仅 `pure_read` 工具、复用 resolveForProvider 链；工具结果进 journal 的形状（toolResult 角色 vs 折叠文本）实现单前再拍。**L2（多步循环+steering）登记为 ADR 议题**：五个开放问题（效果授权在多轮自主循环下的形状、声明式编排与模型自决轮数共存、显式触发语义延伸、预算复用、非 pure_read 红线机制）——不排期。

## 落地

`WORK-TURN-1`（P0，就绪图已登记）：G 修复 + L0 注入。L1 另立单后置；L2 入 ADR 议题池。

关键路径：pi `agent-loop.ts`/`agent-harness.ts`/`session.ts`/`transform-messages.ts`；本仓 `generic-chat.ts`/`segments.ts`/`chat-client.ts`/`App.tsx:534-577,1354-1388`/`work_state.rs:53,107-124,213-244`。
