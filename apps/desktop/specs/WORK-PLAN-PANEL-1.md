# WORK-PLAN-PANEL-1 · Work Plan 只读生产消费面

状态：架构冻结，待独立 Luna 实现；实现与验收必须为不同会话。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/architecture/implementation-readiness.md`、
`docs/design/principles.md`、`docs/design/tokens.json`、`packages/core/SPEC.md`、
`apps/desktop/SPEC.md` 与本票。能力状态只认 `docs/status/current.md`；本票不得更新它。

## 一、目标与既有真源

把已经存在但尚无生产 UI 消费方的 `SessionProjection.todo` 投影为 Progress 模块内的
只读 Work Plan。计划的成员、顺序、标签与状态只认 journal 的最新一枚
`todo_snapshot.steps`；LLM `progress` 文案、artifact 数量、演示常量与 React 本地状态均
不得推导或改写计划。

既有契约不变：`TodoStep.status` 闭集仍为 `pending | awaiting_confirmation | done`，
`stepId` 是稳定行身份，`label` 是用户可见文本，`artifactType?` 只作既有投影数据，不在
本票新增交互。desktop 的 `SessionProjection.todo` 必须直接复用
`Extract<SessionEvent, { type: 'todo_snapshot' }>['steps']`（或机器等价的单源类型），不得
另写弱化的 `status: string` 或漏掉 `label` 的第二份结构。

## 二、冻结 UX 语义

1. Progress 模块头计数只从 `session.todo` 派生：`done / total`；
   `awaiting_confirmation` 不算完成。没有 snapshot 时显示 `—`，不得继续把生产案写死为
   `0/6`。demo 也消费自己的录制 `todo_snapshot`，不得保留第二套计数算法。
2. 有 snapshot 时逐条、按事件顺序平铺显示；每行同时给可见状态文案与非颜色提示：
   `pending=待开始`、`awaiting_confirmation=等待确认`、`done=已完成`。行状态须有可读
   名称，不能只靠点色、删除线或图标表达。
3. Plan 是状态摘要，`progress` 是运行记录，两者不得互相冒充。有 plan 时计划在前，既有
   progress 消息仍可在同模块的次级「运行记录」区查看；`scenarioFailure` 继续以 alert
   与两者并存，不能因计划出现而消失。
4. 无 snapshot 且无 progress/failure 时保留显式空态；无 snapshot 但已有 progress/failure
   时如实显示既有内容，不捏造计划行。
5. 本票没有编辑语义：不得出现 checkbox、输入框、拖拽、重排、添加、删除、重试、自动
   勾选或持久化入口。计划只随 journal 投影变化。
6. 视觉只复用现行冷白/冷灰、文字、结构线与语义 token；藏青仍只作 ink/结构/主操作，
   此只读面不新增主按钮。状态行使用现有密度与层级，不新增卡套卡、彩色底板、渐变、
   glow、常驻动效或图标依赖。

## 三、精确实现范围

允许修改：

- `apps/desktop/src/protocol/client.ts`
- `apps/desktop/src/protocol/session-reset.test.ts`
- `apps/desktop/src/demo/session-event.contract.test.ts`
- `apps/desktop/src/modules/ModuleStack.tsx`
- `apps/desktop/src/modules/module-stack.ts`
- `apps/desktop/src/modules/module-stack.test.ts`
- `apps/desktop/src/App.tsx`（仅 Progress module 的 count/status 接线）
- `apps/desktop/src/styles.css`（仅 Work Plan/运行记录的现行 token 皮层）
- `apps/desktop/tests/e2e/generic-scenarios-1.spec.ts`
- `apps/desktop/SPEC.md`（实现回执）

实现会话先写失败测试再做最小实现。若现有测试夹具已能覆盖某条语义，应扩写既有夹具，
不得为本票建立第二套 event/store/runtime。

## 四、验收证据与反例

实现 tip 最低证据：

- 单测证明 projection 逐字保留 `stepId/artifactType?/label/status`，reset 新 session 后 todo
  清空，录制事件消费不漂移；
- DOM 测试同时覆盖三态、顺序、可见/可读状态名、plan + progress + failure 并存及真空态；
- 模块头在非空 snapshot 上显示 exact `done/total`，空 snapshot 显示 `—`；
- generic 场景 E2E 至少一链证明产品面行文来自录制/运行产生的 snapshot，完成态与头计数
  同源，且零垂类词表回归；
- 注入「用 `progress.length` 或 artifact 数代替 todo」「生产空态强制 `0/6`」「丢弃
  `awaiting_confirmation`」「加入 checkbox/edit/add/reorder」任一反例均须让定向门变红；
- `pnpm -r build`、root lint、desktop 单测、独立端口 Playwright、Cargo 与
  `site:guard` 按触及面完整实跑。

独立验收会话只追加 `apps/desktop/ACCEPTANCE.md`；不得采信实现回执中的测试数字。视觉证据
至少含 1280 宽、窄宽与 200% zoom 下的三态、空态、plan+failure 并存；键盘折叠、
focus-visible、读屏状态名及 reduced-motion 实测。

## 五、禁止扩张

- 不改 core event、schema、wire、journal、runtime、provider、Pi lane、workspace 或授权语义；
- 不新增 store、持久字段、依赖、图标包、Morphicons、toast、queue、scheduled、subagent、
  C3 或生产工具 adapter；
- 不把 `todo_snapshot` 改成用户任务系统，不新增写命令或跨 session 合并；
- 不更新 `docs/status/current.md`、版本、release/site/README 口径，不宣称 Agent、
  `PI-BASE-GUI-ACCEPT` 或 product-live。
