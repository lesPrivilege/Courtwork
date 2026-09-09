# FE-04 交付 · Primitive reconciliation（WK-93）

2026-09-09，Claude Opus（`opus-wo-medium`），**作者验证**。派单 [WO-FE-round4 §FE-04](work-orders/WO-FE-round4.md)、[WK-93](intake-round-3.md)、[WK-112 (d)](intake-round-3.md)。
台账 [EX-WK8](explore/ex-wk8-primitive-ledger.md)。交付契约 [primitive-canon](contracts/primitive-canon.md)。证据 `evidence/fe04/`（仓根，沿 FE-03 先例）。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `af95bcb`（WK-111 清洁节点） |
| 分支 | `claude/fe04-primitives` |
| 端口 / 数据 | 8897（FE-T03 冻结与 MCP fixture 用 8898）；`/private/tmp/se-agent-fe04-data/*`，全程 local-fake / loopback |

| SHA | 题 |
|---|---|
| `0348c64` | `web: a request in flight is a third fact, in all four places that send one` |
| 本页所在提交 | `docs: the primitive canon, its status matrices and the FE-04 delivery` |

## 2. 改动文件

| 文件 | 改动 |
|---|---|
| `app/web/ui-controls.mjs` | `+11`：`SENDING_LABEL` 与 `requestLabel()` |
| `app/web/app.mjs` | `+46 −3`：`renderPermission` 的在途段与失败撤销；问题卡 `role="alert"` 与 `requestLabel`；`renderComposer` 的 Send / Cancel 在途标签与两个标签常量；回执到达时撤掉按 decision 登记的在途记号 |
| `app/tests/primitive-reconciliation.test.mjs` | `+105`（新）：9 条 |
| `engineering/mvp/execution/work-surface-kit/contracts/primitive-canon.md` | 新 |
| `engineering/design/copy-convention.md` | `§3.4b` 一节：`Sending…` 一行 + 在途词不是状态词 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | `§9` FE-04 增量（替换 0、新增 1、未新增 3 条记在案） |
| `evidence/fe04/**` | 新（复制脚本只改端口 + 两个新脚本 + 结果） |

**写权干净**：相对基线，`app/server`、`app/runtime`、`app/core`、`app/domains`、`brand`、`contracts/review-projection.md` 差异为空；无新增依赖；无 allowlist 路径请求（没有新建 web 模块）。

## 3. 消融表

### 3.1 删除（去掉后不失去判断）

| 删除 | 为什么去掉后什么也没少 |
|---|---|
| 问题卡里那处内联的 `submitting ? "Sending…" : "Answer"` | 换成 `requestLabel()`：同一个词在四处只有一个定义，谁改都改到同一个地方 |
| Trace 的"时间线中间层" | **本可以加、审计后不加**。三段结构（收敛条 → 事件列表 → 原始数据）已经在；缺的是时间，而事件记录里没有时间字段。没有时间的时间线只是排版 |
| tool 行 `unknown` 终态的第六个状态词 | 需要在 glyph-semantics §3 登记一个新词，那是 ontology 且越权 |
| 授权卡在途时的第二句解释文本 | 换掉的那个标签已经把话说完 |
| 一个新的 `state.decisionInFlight` Map | 在途记号写进已有的 `state.questionSubmitting` 这一个 Set（键带 decision），没有第二个容器 |

### 3.2 新增（去掉后会失去判断）

| 新增 | 去掉它就看不出什么 |
|---|---|
| `requestLabel()` / `Sending…` | 一次决定**已送出而未回执**。去掉它，Approve 被按下与没被按下在屏幕上一样；Cancel run 被按下与 Run 已停在屏幕上也一样 |
| 在途记号带 decision | 在途的是 Approve 还是 Deny。去掉它，两个按钮要么都换词（看不出送的是哪个），要么都不换（看不出送了没有） |
| 授权卡重试前 `questionErrors.delete(key)` | 「刚刚失败了」与「这一次失败了」的区别 |
| 问题卡的 `role="alert"` | 读屏用户按下 Answer 之后它没被接受这件事 |
| 9 条单测里的四条"钉子"（always-allow、批量键、数字键、两词两来源） | 这些不采纳裁定今天只写在注释与文档里；钉子让它们在被"补全"回来时红掉 |

## 4. 逐 primitive 判据（全表见 [primitive-canon §2](contracts/primitive-canon.md)）

| Primitive | 判据 | 动作 |
|---|---|---|
| Thread | 已对齐 | 记入 canon |
| Composer | keyboard / IME / attachment / draft / focus 已对齐；**send-cancel 在途段本单修** | 代码 + 断言 |
| Message | 已对齐 | 记入 canon |
| Tool row | 台账「error vs cancelled 未核实」→ **核实完毕：已对齐**（两词两来源，互斥）；`unknown` 终态 → 待裁定 | 断言 + 待裁定 |
| Approval | always-allow / 批量 / 多渠道 / edit-then-approve **四条不采纳**；**submitting 过渡本单修**；乐观并发 → 待验接口 BE-24 | 代码 + 钉子 + BE 草案 |
| Question | 结构化 schema → 待验接口 BE-25（须连同 MCP 安全约束）；**提交失败无播报本单修** | 代码 + BE 草案 |
| Artifact / File | 已对齐，无外部可迁移项 | 记入 canon |
| Trace | 三层披露 → **考虑后不做**（前置条件是事件时间，BE-26） | 记入 canon + BE 草案 |
| Inbox | 已对齐；Home/End 与容器 role → 待裁定 | 钉子 + 待裁定 |
| Work surface | 自动执行档**不采纳**；FE-T07 复跑通过；「展开重读一次」→ 待裁定 | 记入 canon |
| Decision receipt | 缺时间 → **沿用 BE-14，不另开号** | 记入 canon |

## 5. 五轮收敛表（WK-100）

本单不改版面，只改四个控件在一段时间窗口里的文字与一条 `role`。表只覆盖被触及的表面。
④ 材质在 FE-05 前只验「不越层、无未登记 blur」——本单没有加任何背景、边框或 blur，`lint-colors` / `lint-materials` 双通过即为该轮结论。

### 5.1 Approval 卡

| 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|
| ① 信息层级 | 唯一 primary action（Approve 为 `primary-button`，Deny 为 `secondary-button`）；在途词不新增一段说明文本 | 通过 | `app.mjs:5099-5103` |
| ② 光学对齐 | 标签换词不改按钮盒模型（两个按钮同高同 padding，文字长度变化不移动另一个） | 通过 | `styles.css:474,487`；`primitive-checks.json` 第 5 条读到两个按钮仍并列 |
| ③ 组件几何 | 同级按钮同高同 radius；不换图标（卡上本无图标） | 通过 | `styles.css:468-495` |
| ④ 材质 | 未新增背景 / blur | 通过 | `lint-materials.log` |
| ⑤ 交互状态 | 七态 + running / error：normal / hover / focus / **in-flight** / decided / error / 不可用（不渲染控件）各有落点 | 通过 | [canon §3.5](contracts/primitive-canon.md) |

### 5.2 Question 卡

| 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|
| ① | 一个 primary action（Answer）；失败句不抢标题位 | 通过 | `app.mjs:2784-2795` |
| ② | 失败句与输入框同起点 | 通过 | `styles.css:1212-1223` |
| ③ | 输入与按钮同高一档 | 通过 | `styles.css:1216` |
| ④ | 未新增材质 | 通过 | `lint-materials.log` |
| ⑤ | error 现在可被读屏播报；in-flight 输入只读而不失焦 | 通过 | `primitive-checks.json` 第 8–9 条 |

### 5.3 Composer

| 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|
| ① | Home / Work 两个 variant 的唯一 primary 不变；在途只换词不加行 | 通过 | `app.mjs:3166-3189` |
| ② | 标签变长不改按钮行的对齐（`.composer-buttons` 右对齐，宽度自适应） | 通过 | `styles.css:1324-1330`；390 视口 `composition-checks.json` 溢出 0 |
| ③ | Send / Cancel 同高同 radius | 通过 | `styles.css:468-495` |
| ④ | 未新增材质 | 通过 | `lint-materials.log` |
| ⑤ | normal / disabled / **in-flight** / running / error 五态分列，且 in-flight ≠ running（状态词不动） | 通过 | `primitive-checks.json` 第 1–3 条 |

### 5.4 Tool row / Activity 组

| 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|
| ①②③ | 未改 | 未改 | — |
| ④ | 未改 | 未改 | — |
| ⑤ | `Failed` 与 `Interrupted` 两词两来源、互斥；失败只有状态词着色 | 通过 | `app.mjs:2571-2581`；`primitive-checks.json` 第 7 条 |

## 6. 状态矩阵（WK-112 (d)）

十一张表全文在 [primitive-canon §3](contracts/primitive-canon.md)：每个 primitive 一张，列 normal / hover / selected / loading / empty / error / disabled / dense / narrow / long-content，每格 `file:line` 或 `not_applicable` 加一句理由。**不新建 gallery 模块**（需 allowlist；WK-112 (d) 已把 CC-G 列为候选待裁）。

审计中发现并**当场补上**的缺状态只有一个：**四个决定控件的 loading（in-flight）格**，此前四处皆空。
发现而**未补**的：

| 缺格 | 为什么不补 |
|---|---|
| Tool row · `unknown` 终态下的 loading/error 之外的第六格 | 需要新状态词（ontology，且 glyph-semantics 越权）→ 待裁定 |
| Trace · 中间层的 loading / dense | 需要事件时间 → BE-26 |
| Decision receipt · 六格 `not_applicable` | 它是一条只读记录：无 hover、无选中、无 loading、无空态、无错误、无禁用。这不是缺，是这个对象本来就没有这些状态 |

## 7. text-sweep 增量

见 [text-sweep §9](text-sweep.md)：**替换 0 条**，新增 1 条（`Sending…`），另记 3 条"本可新增而不写"的理由。

## 8. 分配反例（结果原文）

### 8.1 FE-T06（FN-18 / 19）· 三类事实不混同、不自动重放 —— **含另半条**

wk10b-2 §6.3 把 FE-T06 的另半条（`allow` 之后工具失败、`cancel requested ≠ stopped`）记为 `not_run`，
理由是"属授权卡与 Run 取消，本轮未改其代码"。**本单持有这两面，因此这半条在这里结清。**

| 步骤 | 结果 |
|---|---|
| `/fixture script [{"name":"ws_write",…}]`（会话 `permissionMode: ask`），卡上有哪些动作 | 恰好两个：`Deny this write` · `Approve this write`。**没有 always-allow**，没有第三个按钮 |
| 扣住决定请求 2.2 s，按 `Approve this write` | 按下的那个变 `Sending…`，另一个仍写 `Deny this write`，两个都 `aria-disabled="true"`。**在途的是哪一个决定看得出来** |
| 放行，等结算 | 未决卡数 0；决定收成一条折叠行：`out/note.txt · Write approved · Approval recorded for this exact write. Review acceptance is not recorded here.`；工具行是**另一行**（`ws_write`），Activity 组另写 `1 tool action / Completed`；全页无 "accepted by a review" 字样 |
| `allow` 之后工具失败 | 另起一个会话跑 `ws_read` 一个不存在的路径：行写 `ws_read / Failed`，`is-failed` 只落在状态词上，Activity 组写 `1 tool action / 1 failed`。**授权是一行、执行结果是另一行、成果接受一行都没有**——三类事实各在各的位置 |
| `cancel requested ≠ stopped` | 扣住 `POST /runs/:id/cancel` 与轮询 2.2 s，按 `Cancel run`：控件写 `Sending…`，run hint 仍写 `Waiting for you · 4s`，run 徽标仍是 `Waiting for you`，**没有出现 `Cancelled` 也没有出现 `Stopping`** |
| 放行 | `runs: ["cancelled"]`，徽标 `Cancelled`，控件收回在途词（`Send` / `Cancel run`）。**先有回执，才有那个词** |
| 不自动重放 | 全程 `/runs`、`/questions`、`/cancel` 各自只发出一次；未离开本 origin 的请求 0；页面异常 0 |

`primitive-checks.json` **11 / 11**。

### 8.2 FE-T07（FN-22 / 23 / 24）· 迟到响应与卡片展开收起

| 步骤 | 结果 |
|---|---|
| 打开 A（`Complete NDA review`），扣住它的 `GET /sessions/A/surface` 2.6 s，期间切到 B（`Unresolved NDA review`）并打开工作面 | 屏幕是 B |
| 放行 A 的迟到响应 | 屏幕**仍是 B**：`activeSessionId` 是 B 的、标题写 `Unresolved NDA review`。A 的响应被读取纪元与 identity 守卫丢弃 |
| 在有草稿的会话里展开再收起一张卡 | 发出的 `/runs`、`/questions`、`/actions` 请求 **0**；草稿与它的持久缓存都还是 `fe04 draft that must survive`；卡片回到原开合态 |
| 折叠 / 展开工作面三次 | 命令 **0**、`/workspace` **0**、`/runtime-control` **0**；`/surface` **2** —— 见下 |
| 关闭并重开工作面 | 每个来源至多 1 次（实测 surface 0、workspace 0、runtime 1）——不是两次，即没有重复订阅 |

`fe-t07.json` **6 / 6**。

**与 wk10b-1 的读数差（如实记）**：当年"三次折叠 / 展开"记 `/surface` 为 0，本单实测 2。
起点不同：`setSurfaceExpanded`（`app.mjs:3307-3321`）在**收起 → 展开**这一步会调 `loadSurfaceKind("preview")` 重读一次工作面，三次点击里有两次是这一步。
FN-23 禁的是折叠 / 展开**重发命令、取消 Run、丢草稿、换读取版本**——一次读取不在其列，命令数实测 0。
断言按事实写成"不重发任何命令、workspace 与 runtime 不重读、`/surface` ≤ 2"，并把"展开是否应当复用上一次读取"列入待裁定。

## 9. 既有回归

| 套件 | 结果 |
|---|---|
| `npm --prefix app ci` | ok |
| `npm --prefix app test` | **237 / 237**（基线 228 + 本单 9） |
| `tools/lint-colors.mjs` | ok（15 files） |
| `tools/lint-materials.mjs` | ok（2 files） |
| `tools/contrast-report.mjs` | 全通过 |
| `npm --prefix app run smoke` | 通过（`realProvider: not_run`） |
| RC 契约 / 反例 / 视口 | **20 / 20 · 9 / 9 · 36 / 36** |
| composition（Home / Work 几何） | **16 / 16** |
| shell（Chat / Work / Memory） | **12 / 12** |
| 探测（BE-17 / 18） | **8 / 8** |
| Models & Tools | **18 / 18** |
| FE-T01 | 3 / 3（无数据）· 4 / 4（无绑定 + 读取失败） |
| FE-T03 | **5 / 5** |
| FE-T11 | **6 / 6** |

复跑口令与端口表见 [evidence/fe04/README](../../../../evidence/fe04/README.md)。

## 10. allowlist / 后端请求

**allowlist：无。** 本单没有新建 web 模块，`requestLabel` 落在既有的 `ui-controls.mjs` 里。

后端请求草案（编号从 **BE-24** 起；`backend-requests.md` 现存最大号为 BE-23，本单只写草案，不代 Fable 落盘）：

| 编号 | 请求 | 前端消费点 | 依据 |
|---|---|---|---|
| **BE-24** | **授权决定的乐观并发。** `POST /runs/:id/questions/:qid` 接受可选的 `expectedContentSha256` 与 `expectedToolCallId`，与服务端持有的未决载荷比对；不一致时返回 409 `version_mismatch` 而不是接受。今天请求体只有 `{ decision }`（`app.mjs:5115-5118`），载荷若在人读完与人点下之间被替换，前端无从发现——`state.questionSubmitted` 只是本地幂等 Set，不是版本号。**前端不自造 expectedVersion**：那会立刻成为第二个真源 | 授权卡两个按钮的提交体 | EX-WK8 §3 第 2 行 + §4 (10)（本单核实：无等价 CAS）；Gatewerk `expectedVersion`；FN-19 |
| **BE-25** | **Question 的受限结构化 schema。** `question/open` 可带一个扁平的 `requestedSchema`（`string` / `number` / `boolean` / `enum`，无嵌套），并在服务端复验 MCP 规范同一页的另一句——"MUST NOT request sensitive information"。**两句是一个整体**：只给表单渲染而不给该约束，等于用一个更好看的控件去收本不该收的东西 | 问题卡今日的自由文本单值输入（`app.mjs:2763`） | EX-WK8 §2.6 / §3 Question 行；MCP `2025-06-18` elicitation |
| **BE-26** | **事件时间。** `appendEventToState`（`app/server/store.mjs:214-221`）只写 `seq`。Trace 的"时间线中间层"（收敛条 → 时间线 → 原始数据三层里的第二层）没有时间就不成立 | `inspector.mjs:258-291` 的 Activity 段 | EX-WK8 §2.8 / §3 Trace 行；FN-28 |
| **BE-27**（可选，低优先） | **tool 结果带未完成原因。** `tool.result` 或一个 `tool.aborted` 事件带 `reason: "error" \| "cancelled" \| "timeout"`。今天 `Interrupted` 是从「没有 result 且 Run 已离开活动态」推出来的（`app.mjs:2560-2581`），Run 终态为 `unknown` 时这一推断给出的是一个我们并不知道的断言 | tool 行的元数据词 | EX-WK8 §3 Tool row 行；FN-28 `unknown ≠ failed` |

**沿用不另开号**：Decision receipt 的时间是 **BE-14**（delivery-wk10b-2 §3.5），已登记未解决。

## 11. 未检项（分列，一律 `not_run`）

| 项 | 状态 |
|---|---|
| 触控设备 | `not_run`。命中区只按 CSS 与几何断言核对，未在真机上点过 |
| 读屏（VoiceOver / NVDA） | `not_run`。本单加了一条 `role="alert"` 与四处标签变化，**是按 ARIA 语义加的，不是听出来的**；实际播报未验 |
| 真实 IME | `not_run`。`isComposing` / `keyCode 229` 三路短路只做了源码审计，未用真实输入法敲过 |
| 200 % 缩放 | `not_run`。本单未重量；上一次记录在 wk10b-1 / wk10b-2 |
| 真实 provider | `not_run`。全程 local-fake，`smoke` 自报 `realProvider: not_run` |
| 深色宗与 reduced-motion 下的在途词 | `not_run`。改的是文字不是材质，`contrast-report` 与 `lint-materials` 通过即为静态结论；未逐图目视 |
| 在途状态的截图 | 未拍。要拍到它需要与断言同一套扣住手法；判断已由 `primitive-checks.json` 的逐字读数承担 |
| 多客户端并发（两个浏览器同时决定） | `not_run`。这正是 BE-24 要解决的那件事，今天无从前端验 |
| FlowGate 这个来源是否存在 | 未解决（EX-WK8 §4 (1)）。非前端可解，需用户或 Fable 给坐标 |
| `agentgate` 同名项目的其余候选、`agenttrace-react` 的真实坐标 | 未解决（EX-WK8 §4 (2)(8)） |
| BoardUI / OpenHands / AI Elements 的一手状态机 | 未检（EX-WK8 §4 (3)(4)(5)）；本单的判据不依赖它们的精确取值 |
| Astra 独验 | 未做。本页全部读数出自作者自己的脚本 |
| 视觉四轴 | 留用户 |

## 12. 待裁定

1. **tool 行在 Run 终态为 `unknown` 时仍写 `Interrupted`。** 那是一个关于"怎么结束的"的正面断言，而我们并不知道（FN-28）。诚实的写法需要 glyph-semantics §3 的 tool 行元数据列多一个词。**新增状态词是 ontology，且该文件不在本单写权内**，故本单不改。请裁：是否登记第六个词（`Unknown`），或采 BE-27 由后端给出原因。
2. **inbox 列表键盘缺 `Home` / `End`，且列表容器没有显式 role。** 前者是 WAI-ARIA APG 列表模式的 SHOULD；后者会把 Home 下带与 Chat Flow 的未决卡合并进同一个语义容器——**那是"这两处是不是同一条列表"的判断**，是 ontology 不是实现。请裁。
3. **「展开工作面」会重读一次 `/surface`。** FN-23 不禁止（是读取不是命令，命令数实测 0），但它使 wk10b-1 的那条断言读数从 0 变 2。请裁：展开是否应当复用上一次读取（一次缓存裁定），还是把断言按事实固定为 ≤2。
4. **在途词的两个变体并存。** 决定类控件用 `Sending…`，探测用 `Probing…`（WK-108 已登记）。本单判定这是**正确的分工**（一个送出决定、一个发起读取），未合并。请裁是否接受两个词共存。
5. **Trace 三层披露暂缓。** 前置条件是事件时间（BE-26）。请裁是否同意"没有时间就不造时间线"这一取舍，还是接受一个只按 `seq` 排序的中间层。
6. **在途记号写进已有的 `state.questionSubmitting`（键带 decision）而不是新开一个 Map。** 这样没有新增状态容器，代价是同一个 Set 里有两种粒度的键（`<questionKey>` 与 `<questionKey>:<decision>`）。请裁是否接受这种写法。
7. **Question 的结构化表单必须与 MCP 的"不得索取敏感信息"约束一起来。** 本单据此不先画表单。请裁是否同意这条捆绑（BE-25 的范围因此比"渲染一个表单"大）。

## 13. 哪一像素改变了哪一判断

| 像素 | 判断 |
|---|---|
| `Approve this write` 变成 `Sending…`，而它旁边的 `Deny this write` 一字不动 | **我按下的是哪一个决定，它送出去了没有。** 此前两个按钮同时变灰，屏幕上分不出"我按了但还没回"与"这张卡本来就不能按" |
| `Cancel run` 变成 `Sending…`，而它上面那行仍写 `Waiting for you · 4s` | **取消请求 ≠ 已停。** 一个动词变了、一个状态词没变，这两件事第一次在同一屏上被分开。放行之后徽标才变 `Cancelled`——先有回执，才有那个词 |
| 问题卡的失败句多了一个 `role="alert"`（屏幕上一个像素也没变） | **看不见屏幕的人现在也知道它没被接受。** 这一条恰恰证明"像素"不是唯一的载体：同一族的授权卡一直有这条播报，问题卡没有，而两处发生的是同一件事 |
| 授权卡重试时那条红字先消失，再出现 `Sending…` | **「刚刚失败了」与「这一次失败了」。** 不撤掉旧的那条，一条 alert 和一个在途词会同时在场，读起来像"这次也失败了" |
| `ws_read / Failed` 与（未发生的）`ws_write / Interrupted` 是两个不同的词 | **工具失败与因取消而未完成是两件事。** 台账把这条标成"未核实"，审计的结论是它一直成立，只是没有人钉住过它——现在有钉子了 |
| 没有一个像素叫 `Always allow` | **一次授权与一条策略不共用一个按钮。** 十个成熟来源里有四个把它们合成一个 Approve，本单没有迁移那一格，并给它加了一条会红的测试 |

## 14. Fable 复核（WK-115，2026-09-09）

非作者复核，与 §1–§13 的作者验证分列；Astra 独验另页。

| 项 | Fable 所做 | 结果 |
|---|---|---|
| 写权 | `git diff --name-only af95bcb..HEAD` 对照工单可写清单；server / runtime / core / domains / brand / review-projection / glyph-semantics 差异 | 无越权；差异为空；无 allowlist 请求 |
| 读码 | `app.mjs`、`ui-controls.mjs` 全部差异与九条新单测 | 一个在途词四处共用；状态词（Working / Stopping / Cancelled）不受在途影响；不新增状态容器、字段或端点 |
| 单测 / lint | 237/237；lint-colors / lint-materials ok；contrast 76 行全通过 | 一致 |
| 浏览器 | 自有端口 8893、两个新空目录、独立 CDP：`primitive-checks` 11/11（FE-T06 含另半条）、`fe-t07` 6/6（先 `work-seed`） | 一致 |
| 读数差 | 三次折叠 / 展开 `/surface` 0 → 2 | 读取非命令，按事实接受；记 misfit M-5 |
| 七项待裁 | 见 [intake-round-3 §4t](intake-round-3.md) WK-115 | ① 登记第六个词 `Unknown`（glyph-semantics 已改）、② Home / End 与两条列表各自 role → CC-S 第 0 项；③④⑤⑥⑦ 接受 |
| 后端草案 | §10 的 BE-24…27 重编为 BE-30…33 入 backend-requests（BE-24…29 已被 EX-CC2 占用） | 已登记 |
| Anti-slop 门（WK-112 (c)） | necessity：新增只有一个词与一条 alert，无新控件 / icon / badge；hierarchy：在途按钮换词不换权重；system：复用 `ui-controls`，无新 radius / spacing；reference fidelity：review-projection §6 + assistant-ui 两源；AI tells：无；reality：long text / 窄屏未涉，在途态截图 not_run | 通过 |
| 未复跑 | RC 三支、composition、shell、探测、Models、FE-T01 / T03 / T11 | 作者结果原文在 §9；Astra 独验按 `evidence/fe04/README.md` |
| 视觉四轴 | 留用户 | 未评 |

结论：接受。合流次序：先 `claude/fe04-primitives`（头 = 本条提交），再 `claude/fable-round4d`。
