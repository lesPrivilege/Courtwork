# WO-MA2-02 交付 · Thread 消费面

执行 Opus，工作树 `/private/tmp/se-ma2-fe`，分支 `claude/ma2-frontend`，基线 `6b4f4cd`。裁定见 [本轮 README](README.md) MA2-D09…D16，接缝见 [EX-MA-R3](explore/ex-ma-r3-frontend-seams.md)，设计语法见 [EX-MA-R4](explore/ex-ma-r4-design-grammar.md)，生产合同见 [coordination.md](../../../../app/docs/coordination.md)。未合流，停在分支上待复核。

## 一、做了什么

在既有 Attention 对话面内加一处折叠消费面，证明首片交付的 Thread 合同可被一个真实使用者消费：显式选择来源会话与目标工作线，拿到一张与 Run 和 Core 接受分得开的回执，并在收件箱里看到它。

新增与改动：

| 文件 | 性质 |
|---|---|
| `app/web/coordination-projection.mjs` | 新增，纯投影 |
| `app/web/coordination-view.mjs` | 新增，视图与取数 |
| `app/web/attention-agent-view.mjs` | 改 3 处：import、构造与插入、`deactivate()` |
| `app/server/index.mjs` | 静态白名单数组加两项，无其他改动 |
| `app/web/styles.css` | 末尾追加一整块，块首尾各一行来源标记，块内未穿插既有规则（33 行全为新增，0 行删除） |
| `app/tests/coordination-view.test.mjs` | 新增 |

`app/harness/**`、`app/server/service.mjs`、`app/core/**` 未动一行；`app/web/settings-view.mjs` 未动。未新增依赖，未引组件库，未新建第三个 element builder（仅用 `ui-controls.mjs` 的 `el()`），未新增图标。`git diff --stat` 为三个改动文件、40 增 3 删。

## 二、合同要求逐条落在哪里

| 要求（合同 §Frontend handoff / 本轮裁定） | 实现位置 |
|---|---|
| 显式选择来源 Session 与目标 Thread | `coordination-view.mjs` 的 `load()`：三个 `<select>` 的 option 全部由 `/coordination` 与 `/sessions` 的返回构造；无任意 ID 输入框。option 集合由投影模块的 `attachableThreads`、`messageTargets`、`currentThreadFor` 三个纯函数给出 |
| 未知回执后保留精确 message ID 与载荷 | `createReceipt` 与 `sendReceipt` 两个闭包变量。请求发出前用 `crypto.randomUUID()` 构造回执对象，`??=` 保证重试复用同一对象；`controls()` 在回执在手时冻结来源、目标与正文（`message.readOnly`），按钮文案改为 Retry the same message／creation。仅 4xx 清空回执——已被拒绝的记录不必保留 |
| 投递与 Run／Core 接受分开显示 | `send()` 的回执文案 `Message ${settled.status}. ${NOT_EXECUTION}`，直书服务端原词 `queued\|delivered\|stale_target\|target_unavailable`，后接一句"这不启动目标会话的 Run，不构成 Work Core 接受" |
| 成员关系共享收件箱，不导入对方模型 transcript | 收件箱由 `renderMailbox()` 单独绘制，数据源是 `/coordination/threads/:id`；未接触 `state.events`、`projectThread()` 或 `attention-agent-view.mjs` 的 `stream`（MA2-D10） |
| 收件箱分页，`limit` 最大 20 | `MAILBOX_PAGE = 20`；`projectMailbox` 校验页长不超过该上限、页尾不越 `total`、`nextOffset` 必须落在 `offset + messages.length` 且小于 `total`；`previousOffset` 由 offset 回推，不由服务端提供 |
| 每条显示方向、对方工作线标题、状态 | `projectMessage` 给出 `direction`／`otherThreadId`；`renderMailbox()` 以 `To ⁄ From + 标题` 作标题行，`kind · status` 作状态行 |
| 只在展开时取数，收起即停 | `root.addEventListener('toggle')` 驱动 `active`；`load()` 首行 `if (busy \|\| !active) return`，收起时 `generation++` 作废在途响应。`deactivate()` 同时置 `active=false` 并合上面板，由 `createAttentionAgent` 的 `deactivate()` 调用 |
| 草稿不隐式丢弃 | `drafts` Map 按来源会话保存正文；输入节点自始至终不被 `replaceChildren` 重建，只有 option 子节点重建 |
| 长度上限与服务端一致 | 标题 `maxlength=200`，正文 `maxlength=16000` |
| 能力不得虚报 | `capabilityNote` 由 `/coordination` 返回的 `capabilities` 逐项生成，未读到之前写"展开时从运行时读取"，不预先断言 |

投影模块的三条既有规则（`presentation-adapters.mjs` 体例）：不取数、不缓存、不 `Date.now()`、不覆盖服务端顺序；缺失事实是显式 `null`；不认识的形状返回 `null`。第三项在测试中以缺字段、错 `schemaVersion`、越界分页三类反例分别取证。

## 三、暴露但未改的问题

一、**`POST` 回执与目录行的形状不一致**。`app/docs/coordination.md` 对四条写端点一律记作返回 `{schemaVersion:1,thread}`，未言明 `thread` 的字段集。实现上 `available` 是每次读取时派生的：`Coordination.list()` 与 `mailbox()` 在返回前挂上 `available`，而 `create()` 与 `attach()` 返回的是存储记录本身，不带该字段。首版按目录行的形状校验回执，两条写路径遂被判为"回执不可用"（`attach` 已在服务端成功，界面却提示需刷新对账）。已按事实修正前端一侧：`projectThreadRecord` 接受 `requireAvailability` 参数，目录与收件箱必须携带 `available`，写回执缺失时记为显式 `null`，不猜 `false`——猜出来的 `false` 在界面上会读成"该工作线已关闭"。后端未动。合同若要收敛，宜在写端点处注明其返回不含派生字段。

二、**`tools/contrast-report.mjs` 的 `pairs` 不覆盖本片用到的角色对**。消息卡片取 `--panel-muted` 作底、`--ink` 作正文、`--muted-strong` 作次级文字。其中 `muted-strong | panel-muted` 只在 `lead-gray` 皮肤下被检查，`ink | panel-muted` 四种皮肤下均未检查。该缺口早于本片：`styles.css:5533` 的用户气泡用的是同一组角色。`tools/` 不在本单写权内，未改。

三、**面板展开时 Attention transcript 被压到 `min-height`**。消息流已按同一对话面内 Runtime & memory 面板的先例限高 280px 并内部滚动，但面板整体仍占据可观高度，短视口下 `.attention-agent-stream` 落到其 80px 下限。此为折叠面挂在同一列布局内的固有后果，未另改 `shell-layout.mjs`。

四、`el()` 与 `app.mjs` 内的 `element()` 两个建元函数并存（EX-MA-R4 §五.8）。本片只用 `el()`，未触及该分叉。

## 四、未交付的范围

- 消息 `kind` 固定为 `request`。`reply` 需要指名一条反向且已 delivered 的消息，回复选取控件不在本片。
- `POST /coordination/threads/:id/close` 未接。关闭工作线仍无人类入口。
- 收件箱内不提供"打开对方会话"跳转。撤出的原型有该动作；本片略去，以免在模态对话面开启时改变主界面选中会话。
- Attention typed actions（resolve／snooze／set_waiting）未涉及，属 ATT-FE-01（EX-MA-R4 §五.5）。
- 未预支 FE-05a：字号与控件高度全部继承，未改 `--text-*` 变量，未顺手修 M-16／M-17 的 composer 图标裁切。

## 五、验收

**全量测试**。命令 `node --test tests/*.test.mjs ../tests/*.test.mjs`（工作目录 `app/`）。

- before（本片开工前，同一工作树同一命令）：`tests 467 · pass 467 · fail 0`，57.1s
- after：`tests 475 · pass 475 · fail 0`，63.2s

差额 8 项即本片新增的 `app/tests/coordination-view.test.mjs`。未改任何既有测试的断言。基线以本次自测为准，非本轮 README 所记的 446/446——主线在动。

**smoke**。`npm --prefix app run smoke`：

```
{
  "status": "passed",
  "provider": "local-fake",
  "transport": "public runtime service",
  "checks": [ "material read", "tool write", "persisted artifact",
              "runtime close/reopen", "session continuation", "revision",
              "historical bytes" ],
  "realProvider": "not_run"
}
```

**三项 lint**。

```
$ node tools/lint-colors.mjs
lint-colors: ok (28 files · 字面量与高度层两项)

$ node tools/lint-materials.mjs
lint-materials: ok (3 files · 登记类名与 reduced-transparency 回退两项)

$ node tools/contrast-report.mjs
# WK7 对比度表（WCAG 2.x 相对亮度）
… 四张皮肤／明暗表共 82 行，全部"通过"，0 行未通过；退出码 0
```

`tools/lint-interaction.mjs` 在基线 `6b4f4cd` 已存在（EX-MA-R4 §四将其记为不存在，该节钉在更早的 `5b405b3`），一并跑过：`ok (25 files · … · 登记例外 0 条)`。

## 六、浏览器手工观察

**这不是完整视觉验收。**下述为一次人工操作记录，端口 8940、数据目录 `/private/tmp/se-ma2-fe-data`、合成数据、未配置真实 provider（`fake-openai-loopback` 亦未配）。未作明暗两皮肤对照，未作键盘遍历与读屏核对，未作跨浏览器核对；材质与颜色的五类规则中，除 lint 覆盖的两项外仍只有人工复核（EX-MA-R4 §五.6）。

合成数据：一个项目、五个项目域会话、三条工作线、26 条消息。

1. **展开时才加载**。折叠状态下网络面板只有 `/web/coordination-view.mjs` 与 `/web/coordination-projection.mjs` 两条 200（静态白名单生效），无 `/api/v5/coordination`。展开后才出现 `/api/v5/coordination` 与 `/api/v5/sessions`。
2. **创建工作线**拿到回执，提示"Thread created. Members share its inbox; no conversation history is imported."。
3. **接续会话**拿到回执，提示"Conversation attached to the Thread…"。首版此处误报，见 §三.一。
4. **发送**后提示"Message delivered. Delivery is not execution: this does not start a Run in the target conversation and is not a Work Core acceptance."。收件箱出现一条 `To Filing review thread · request · delivered`。
5. **目标会话没有新起 Run**。发送前后各查一次 `GET /sessions/:id`，来源与目标两侧均为 `runs: 0 · events: 0`。
6. **切换目标后旧消息仍在真实收件箱里**。把来源切到目标侧会话，同一条消息以 `From Opposing counsel thread · request · delivered` 出现。
7. **分页**。26 条消息下首页显示 1–20 并只出现 More messages；翻页后显示 21–26 并只出现 Previous messages。
8. **草稿**。输入未发送正文，收起面板再展开，正文仍在，输入节点未被重建。
9. **390 宽窄屏**。`documentElement.scrollWidth === clientWidth === 390`，面板内无一节点 `scrollWidth > clientWidth`；无横向溢出。

观察中改了两处样式：`.coordination-row.is-stacked` 的子项须复位 `flex`（列方向下 `flex: 1 1 160px` 的基准会变成高度，选择框被撑成 160px 高）；`.coordination-mailbox` 限高 280px 并内部滚动。两处都在追加块内。
