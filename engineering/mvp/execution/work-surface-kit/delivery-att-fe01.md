# ATT-FE-01 交付 · Attention 处置面（WK-158）

整合补记（2026-09-10）：谱系修复 `9db6fc4` 与当前主线组合 `1097fd4` 已由非作者 Luna 完成[独立验收](../../../../evidence/delivery-rollup-20260910/attention/independent-verification.md)，116/116 浏览器与 29/29 针对测试通过，合流 `055cffc`。BE-40@Attention 默认排序合同仍未关闭；grant / proposal 等后续范围不变。下文为原作者交付时点，数字不与后续组合 643/643 混称。

2026-09-10，Claude Opus，**作者验证**；未独验，未部署，不代表产品验收。
派单 [WO-ATT-FE01 §切片 d](work-orders/WO-ATT-FE01.md) 与本轮执行单（Round 4/6，Fable）。
设计裁定 [attention-triage-2026-09-10](../../../design/attention-triage-2026-09-10/README.md)（WK-152…WK-160）。
后端合同 [attention.md](../../../../docs/work-core/attention.md)（ATT-BE-01，未改一字）。证据 `evidence/att-fe01/`。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 声明的差分基线 | `main` `2e9da09`；实际提交父节点与谱系修复见下方更正 |
| 分支 | `claude/att-fe01-triage` |
| 端口 / 数据 | 8899、CDP 19951；`/private/tmp/se-att-fe01-data/*`，全程 local-fake / loopback，无真实 provider、无凭据读取 |

集成复核更正（Astra，2026-09-10）：`df9fc18` 包含 `2e9da09`。原交付 `6a0459b` 的实际父提交为 `a579929`，但其树夹带了从该父节点回到旧快照的非工单回退。集成方保留原分支作为来源，提取 `2e9da09 → cd1326d` 的 37 个工单文件增量，在 `a579929` 上三方应用；保留 Core 生命周期、连续性规范及 SK-1 Review 语义/测试。本文的 551 项结果仍仅是原作者基线证据；修复后的固定版本另由 Luna 独验。

派单建议的分支名为 `codex/web-gpt-design-attention-triage`。本单由本地 Opus 执行，按 WK-150「本地 Opus 写 `app/web`」的单一 writer 规则取 `claude/` 前缀；除前缀外无差异。

| 提交 | 题 |
|---|---|
| A `6a0459b` | `feat(attention): add explicit triage views, row time and list keys` |
| B `eefe5e0` | `feat(attention): project typed action descriptors into closed editors` |
| C `4fe863f` | `feat(attention): commit typed actions under a recoverable request protocol` |
| D `341f8bf` | `fix(attention): keep the narrow targets and speak refusals in the adjudicated words` |
| E（本页所在提交） | `docs: the ATT-FE-01 delivery and its evidence` |

## 2. 改动文件与写权

| 文件 | 改动 |
|---|---|
| `app/web/attention-view.mjs` | 状态视图组、行内相对时间、`J`/`K`/`Enter`/`Escape`、焦点返回、typed action 选择与编辑器、请求身份与回执恢复、409 文案、分页回退 |
| `app/web/presentation-adapters.mjs` | 新增 `toAttentionActionDescriptors()`：闭集识别器，纯函数 |
| `app/web/styles.css` | 状态视图组、行解剖、动作编辑器；窄屏 44px 目标 |
| `app/tests/tiny-dom.mjs` | 新：原在 `home-presentation.test.mjs` 内的小型 DOM，增事件冒泡、按钮原生激活、`querySelectorAll`、`waitFor` |
| `app/tests/attention-fixtures.mjs` | 新：合同形状的报文构造器 |
| `app/tests/attention-triage.test.mjs` | 新：视图、行时间、键盘、焦点、分页、读取拒绝文案（10 条） |
| `app/tests/attention-actions.test.mjs` | 新：描述符投影与六个编辑器、在途、分页回退（12 条） |
| `app/tests/attention-triage-recovery.test.mjs` | 新：ATT-ACT-1…5、Later 生命周期、无计时器（7 条） |
| `app/tests/fixtures/attention-actions.json` | 新：由运行中的 Core 捕获的真实描述符 |
| `app/tests/home-presentation.test.mjs` | 改：改用共用 DOM，断言未动 |
| `evidence/att-fe01/**` | 新：harness、fixture、检查脚本、结果与截图 |

`app.mjs` 未改：入口反转（WK-155）不在本单，`attention-button → attentionAgent.open()` 保持原状。
相对基线，`app/core`、`app/server`、`app/runtime`、`docs/work-core/attention.md`、`PAPER.md`、`AGENTS.md`、
`engineering/current.md`、`ui-state-vocabulary.md`、`copy-convention.md` 差异为空；无新增依赖。
`request()` 已经保留 `error.status` 与 `error.body.error.code`（`app.mjs:758-765`），故第 34 条的请求管道改动未发生，也不需要。

## 3. 状态视图、行内时间、键盘

`All states` 下拉已撤，代之以六个显式视图，按钮组 `aria-label="Attention views"`，当前项 `aria-pressed="true"`。
浏览器实测标签为 `All · Investigating · Needs you · Waiting · Later · Resolved`（`checks.json:views.labels`），
390 宽下六个目标各 44px、无一截断、文档无横向滚动（`views.viewTargets`、`narrow.truncated`）。

`All` 用 `registry` 查询，其余用 `exact`/`status` 查询；切视图即 `offset=0`、清选中、清详情；
页内不作任何客户端排序。实测渲染顺序与服务端返回顺序逐项相同（`rows.rendered` ≡ `rows.serverOrder`）。

行仍是「标题 + 状态词 + 更新时间」。时间由视图层从不可变的 `updated_at` 投影为相对文本，
`<time datetime>` 保留原 ISO，`title` 保留本地精确时刻；`presentation-adapters.mjs` 未获得时钟。
`relativeUpdated()` 的四档（分、时、日、绝对日期）有单元测试，并断言源时间戳未被改写。

键盘只加在列表上：`J`/`K`/`ArrowDown`/`ArrowUp` 两端夹紧不回绕，文本控件内不触发；
行仍是普通按钮，`Enter` 由浏览器原生激活（CDP 实测 `openedTitle` 为被聚焦行的标题）；
`Escape` 先关编辑器，再回列表。

## 4. typed actions

按钮只为 `human_actions` 广告且本前端认得其 `payload_schema` 的动作生成。
实测该对象广告七项，出六项之外的两项一个控件也没有：

| 广告 | 本单 |
|---|---|
| `acknowledge` | Mark as seen · 空载荷、无确认对话、非 toggle |
| `snooze` | Snooze · reason + `{kind,label,trigger,due_at}`，`kind` 不含 `none` |
| `set_waiting` | Set waiting · 同上结构，语义由动作决定 |
| `resume` | Resume · reason + 目标状态（Investigating 默认 / Needs you） |
| `resolve` | Resolve · reason 必填，无确认对话 |
| `reopen` | Reopen · 仅 Resolved 广告时出现 |
| `attach_relation` | **不实现**：关系维护需要自己的实体选择评审 |
| `request_disclosure` | **不实现**：policy editor 归 CC-P；详情只读出 `Runtime disclosure: None` 或到期时刻 |

按钮词取 [copy-convention §3.8](../../../design/copy-convention.md)。`acknowledge` 的词是 **Mark as seen**，
与本轮执行单示例里的 `Acknowledge` 不同：§53 把 copy-convention 列为冻结输入，动词表以它为准。此处按合同词表执行，记在案。

`toAttentionActionDescriptors()` 是识别器不是表单生成器：`schema_version ≠ 1`、`expected_revision` 与本次 inspect 的
`revision` 不一致、schema 被放宽（多一个属性即算）、动作不认识、动作出界，各自以具名理由被略去，绝不生成控件。
描述符夹具由 `evidence/att-fe01/capture-action-fixtures.mjs` 从运行中的 Core 捕获，测试因此无法比后端多认一个动作。

## 5. 请求身份、回执与两类冲突

每次人的提交生成一个 `crypto.randomUUID()` 身份，连同 `expected_revision`、动作与载荷留在前端状态里，
按 `projectId + attentionId` 存放，直到结果已知。渲染、切换选中、网络重试都不换身份。
发出的请求正好是合同的六个字段，不含 actor、scope、provenance 或乐观 revision。

在途只改提交控件（`Sending…`），行与详情保持服务端最后确认的状态词。CDP 实测：
`inFlight = {submit: "Sending…", detailStatus: "Needs you", rowStatus: "Needs you"}`，回执并 re-inspect 后才变 `Resolved`。

| 情形 | 处置 | 证据 |
|---|---|---|
| 回执正常 | 校验 `attention_id`/`request_id` → 清身份 → re-inspect → 重读当前页 | ATT-ACT-1；两次 inspect 可数 |
| `VERSION_CONFLICT` | 不动状态、保留草稿、重读对象、`role="alert"` 播报定稿文案；下一次提交是新的人类决定，取新身份与新 revision | ATT-ACT-2；浏览器内另一客户端真实推进 revision，事件表仍只有 `create` + `acknowledge` |
| `IDEMPOTENCY_CONFLICT` | 丢弃冲突身份、重读对象、要求再次显式提交，不提供「重试」 | ATT-ACT-5 |
| 传输无结果 | 既不说失败也不说完成；以同一 `request_id` 走 `request` 查询：有回执即视为已提交并 re-inspect，无回执则只说未找到已提交结果，并提供以**原请求**重发的 `Retry sending` | ATT-ACT-3 / ATT-ACT-4；重发后事件仍只有一条 |

九条 409 文案取 M-3 定稿，读结构化 `error.code`，不解析英文消息。读取被拒同样走这张表：
`NOT_FOUND` 只写 `This item is unavailable.`，线上的 `NOT_FOUND: Attention unavailable` 不出现在人眼前。

## 6. Later 与「没有调度器」

`snooze` 成功后状态为 `later`；实测该项离开 `Needs you` 视图、出现在 `Later` 视图、在 `All` 中仍按服务端返回位置在列。
详情显示 `Recorded due time`，无倒计时、无「多久后返回」、无通知承诺。
`attention-view.mjs` 全文不含 `setTimeout` / `setInterval` / `requestAnimationFrame` / `requestIdleCallback`，有测试守着这条空集。
`datetime-local` 输入在提交时转成带时区的 ISO（实测 `due_at` 以 `Z` 结尾）；非 `at` 触发器一律序列化为 `due_at: null`。

## 7. 焦点、分页、390

详情由哪一行打开，返回时就回哪一行；该行已不在页内则落到最近的存活行，页空则落到当前状态视图控件，
任何路径都不跳到项目选择器。CDP 实测 `returnedFocus = item-counsel`（`Escape`）、`backReturnsToRow = item-renewal`（窄屏 `Back to items`）；
`Needs you` 里最后一项被 snooze 走后，焦点落在 `view-needs_you`（该页已空）。

动作提交后重读当前页；末页最后一行离开时按页回退，不留 `21–20 of 20` 或空页（单元测试覆盖）。
窄屏沿用既有 `has-selection` 架构：列表 → 详情 → 返回同一位置，未新建模态，未把 Attention 塞进 Work surface 的 tab 合同。

## 8. 网络：读与动作都不起 Run

浏览器全程请求路径见 `checks.json:network.requestedPaths`：只有 `/attention/*`、`/bootstrap`、`/projects`、
`/extensions`、`/provider-config`、`/sessions`、`/work-summary`、`/work-activity` 与静态资源；
`/runs` 命中 0 次，`recordedRunCount` 为 0，`sessions` 为 0，页面异常 0。
Node 侧的 Later 用例另断言一次：整条读取与处置流程后，`work-activity` 的 `recordedRunCount` 仍为 0。

## 9. 视觉与可访问性

截图（真实 fixture，1440 明/暗与 390）：
`all-1440-light`、`needs-you-1440-light`、`later-1440-dark`、`action-resolve-1440-light`、
`action-snooze-1440-dark`、`action-waiting-1440-light`、`action-sending-1440-light`、
`conflict-1440-light`、`unavailable-1440-light`、`list-390-light`、`detail-390-light`。

可访问性实测：视图组暴露选中态；行可键盘到达；选中行有非颜色提示（`aria-pressed` 与背景同时在）；
动作按钮是完整动词；reason / label / trigger / due / 目标状态都有真标签；
字段校验错误带 `role="alert"` 且由 `aria-describedby` 与字段绑定；提交拒绝以 `role="alert"` 播报；
提交控件的可访问名为「动作 · 对象标题」（实测 `Resolve · Contract renewal reply`），
选择按钮只用动词——同屏只有一个详情，重复对象名只会让屏幕阅读器更吵。

## 9b. 状态矩阵

每一个可见状态要么指向一个后端事实，要么指向一个具名的本地请求状态；没有第三种来源。

| 面 | 状态 | 事实来源 | 可见形态 |
|---|---|---|---|
| 行 | `needs_you` | `status` | Needs you |
| 行 | `later` | `status` | Later |
| 行 | 更新时刻 | `updated_at` | `Updated 8m ago`，`<time datetime>` 保留原 ISO |
| 详情 | 提交在途 | 本地请求状态 `pending.phase = 'sending'` | 只有提交控件写 `Sending…` |
| 详情 | 版本冲突 | 409 `VERSION_CONFLICT` | 冲突播报；状态词保持服务端最后确认值 |
| 详情 | 传输无结果 | 本地请求状态 `pending.phase = 'uncertain'` | 只说未找到已提交结果 + `Retry sending` |
| 详情 | 回执恢复 | `request` 查询命中回执 | re-inspect 后的规范状态 |
| 详情 | `due_at` | `next_action.due_at` | 记录的到期时刻，无倒计时 |
| 详情 | 记录的披露 | `policy.grant` | `Runtime disclosure: None` 或到期时刻，无编辑控件 |
| 动作 | 描述符不认识 | schema / revision 不匹配 | 不出控件，理由留在投影的 `omitted` 里 |
| 动作 | `request_disclosure` | 出界适配器 | 不出控件 |

## 10. 合同缺口与记账

- **registry 默认序无可靠 BE 编号**。设计页把排序请求记作 BE-40，而 `backend-requests.md` 的 BE-40 现为 Provider Connections 能力请求。本单按「未编号的合同缺口」处理：不客户端排序、不分页内排序、不主张 `Needs you` 在 `All` 里靠前。实测服务端当前按 `attention_id` 字典序返回（`counsel · filing · indexing · renewal · served`），此为观察，非合同。
- **`resume` 会覆盖 `next_action`**：核心把它写成 `{kind:'inspect',label:'Inspect'}`（`app/core/attention.py:291`）。详情因此显示 `Inspect`，是如实渲染记录，不是 UI 丢字段。
- **`Escape` 在编辑器内先关编辑器**再回列表。执行单只写了「`Escape` 回列表」；不加这一层，编辑器内按 `Escape` 会连详情一起离开并丢草稿。记为本单新增的一条微行为。
- 出界动作（`attach_relation`、`request_disclosure`）不出禁用按钮，只在本页与 `checks.json:actions.advertised` 里留下痕迹。

## 11. 明确未做

入口反转（WK-155）、source-aware 行与 source-native 详情、proposal 的槽位与渲染、批量动作、saved views、
密度档、调度器与投递提醒、真实 Gmail / GitHub 接入、TPS 与 live instrumentation、新图标族、材质与模糊、
`request_disclosure` 编辑器（CC-P）、`attach_relation` 的实体选择。

## 12. 回归

```sh
npm --prefix app ci
npm --prefix app test
npm --prefix app run smoke
node tools/lint-colors.mjs && node tools/lint-materials.mjs && node tools/lint-interaction.mjs
node tools/contrast-report.mjs
node evidence/att-fe01/seed.mjs && node evidence/att-fe01/checks.mjs
```

结果：`npm --prefix app test` **551 / 551 通过，fail 0，exit 0**（`tests.log`）；`smoke` exit 0（`smoke.log`）；
三个 lint 与 `contrast-report` 全通过（`lint-colors.log`、`lint-materials.log`、`lint-interaction.log`、`contrast.log`）；
浏览器断言 exit 0（`checks.json`、`checks.log`）。

期间另有两次全量跑被外部因素打断，记在案：本机同时有另外两个会话在跑同一套件，
一次因资源竞争出现 `artifact-history` 的 `pollRun` 超时（单独重跑该文件 8 / 8 通过），
一次整个 runner 被 SIGKILL（exit 137）并遗留了持锁的孤儿 server。清掉孤儿、等负载回落后重跑，
即为上面的 551 / 551。三次跑动之间 `app/` 无任何改动。
`tools/lint-shapes.mjs` 在本基线上不存在（FE-05a 未落到 `main`），故未跑；本单也未自造密度 token。

## 13. 验证边界

作者验证。未独验、未合并、未部署、未连真实 provider、未读任何真实邮件或通知。
截图与断言全部来自本地 fixture 与 loopback；`human_actions` 夹具由运行中的 Core 捕获，非手写。
