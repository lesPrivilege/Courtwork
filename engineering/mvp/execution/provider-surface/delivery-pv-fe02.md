# 交付 WO-PV-FE02：无感接入与接入回执

作者：Claude Sonnet 施工四提交（`ce01274` / `17be5c4` / `608c430` / `702a318`），后由 Claude Fable 完成收尾两提交（`f4e601b` / `6ddb94a`）——见 §1「作者与分工」。作者验证，非独验；独验与合流归 Astra。
日期：2026-09-10。树：`/private/tmp/se-agent-pvfe02`，分支 `claude/pv-fe02-seamless-connect`，端口 8915（服务）/ 8916（fixture）。全程 local-fake / loopback，未联网，未读取任何凭据文件（含 `~/.pi/agent/auth.json`）。
写权 `app/web`（`app/web/vendor` 除外）与 `app/tests` 中的前端用例；`app/server` / `app/runtime` 未改（`git diff --stat 76cd11f..6ddb94a -- app/server app/runtime` 为空）。
证据目录：`evidence/pv-fe02/`。

## 1. 作者与分工、基线与提交

**分工与交接**：本单由 Sonnet 承接施工（WO-PV-FE02 指定"Sonnet 施工，Fable 修型"）。Sonnet 完成四个提交（`ce01274`…`702a318`，均带 `Co-Authored-By: Claude Sonnet 5`）——实现了工单第 1–8 项的全部代码与首轮测试，但施工在此处停住，没有写交付页。Fable 在此基础上补了两处修型并完成收尾：`f4e601b`（连接行读不到回执的问题、一秒以内显示毫秒而不是被抹成 "0.0 s"，两处均带 `Co-Authored-By: Claude Fable 5.1`）与 `6ddb94a`（作者验证与浏览器证据的记录提交）。本页是这次交接之后补写的交付页。

| 项 | 值 |
|---|---|
| 基线 SHA | `76cd11f`（`claude/pv-be03-open-admission` 头，BE03 + PV-84 补丁，Fable 复核接受，见 intake §19–20） |
| 分支 | `claude/pv-fe02-seamless-connect` |
| 合流单元 | 按 PV-65，本分支合流时一并带入 BE03 的全部提交；BE03 不单独合流 |

### 1.1 commit 表

| SHA | 作者 | 标题 |
|---|---|---|
| `ce01274` | Claude Sonnet | `feat: seamless connect and receipt for the connection form (PV-63/64)` —— 工单项 2–5、6（Settings 半）、8 |
| `17be5c4` | Claude Sonnet | `feat: type-a-model-id entry, reasoningSource and origin copy (PV-59/61/63)` —— 工单项 1、6（选择器半）、7 |
| `608c430` | Claude Sonnet | `style: is-arrived receipt transition and minimal new-row layout (PV-64)` —— 唯一改 `styles.css` 的提交，46 行 |
| `702a318` | Claude Sonnet | `test: cover seamless connect and receipt; rewrite two stale assertions` —— 用例，见 §5/§6 |
| `f4e601b` | Claude Fable | `fix: refresh the connection rows after a verify receipt; show milliseconds under one second (PV-42 / PV-64)` |
| `6ddb94a` | Claude Fable | `test: record WO-PV-FE02 author verification and browser evidence at f4e601b` —— 证据目录与本页自身依据的那次验证 |

作者验证的六条命令与浏览器断言跑在 `f4e601b` 的树上（`evidence/pv-fe02/HEAD-sha-at-verification.txt`）。

## 2. 改动文件

| 文件 | 性质 | 做了什么 |
|---|---|---|
| `app/web/settings-view.mjs` | 改（317 增 / 15 删，2679 行现文件） | `CONNECTION_STEPS` 的 `smoke` 步从留位变完成步，`fetch` 步加 `buttonLabel`；六态回执映射与三个纯函数（`verifyHeadline`/`verifyFailureLine`/`verifySuccessLine`/`verifyDetailLine`/`connectionRowVerificationLine`/`localTime`）；`connectionRows` 增 `verificationLine`/`verificationFailed`/`degraded`；`runVerify`/`renderVerifyReceipt`/`triggerArrive`/`clearVerifyReceipt`；`scheduleAutoDiscover` 与 baseUrl/key 的 `blur`/`input` 去抖接线；提交按钮拆为 `save`（"Save and ask once"）+ `saveOnly`（"Save only"），`event.submitter` 分流；`reasoningCheckbox`/`reasoningRow`（只在兼容路径可见）与 `syncReasoningCheckbox`；`CONFIGURATION_INCOMPLETE_MESSAGE` 常量与降级行 |
| `app/web/model-picker.mjs` | 改（189 增 / 9 删，291 行现文件） | 固定入口 "Use a model ID that is not listed…"（`select` 的兄弟节点，不随搜索过滤消失）；展开面板（模型 ID 输入、连接下拉、reasoning 复选框、回执块、"Use and ask once"/"Use without asking"）；`submitCustomModel(askOnce)` 的三步序（PUT connection → PUT config → 可选 POST verify）；`reasoningSource:"unknown"` 的文案改写；`origin:"connection"` 的路由行追加句 |
| `app/web/styles.css` | 改（46 行新增，5949 行现文件） | 唯一新增着色规则是 `.connection-probe-result.is-arrived` 的一次性到达过渡；其余是复用 `--muted-strong`/`--danger`/`--line` 的最小布局，无新增令牌、无新材质 |
| `app/tests/models-connections.test.mjs` | 改（231 增 / 16 删，587 行现文件） | 改写两条既有断言（§5），新增约 15 条（§6），并在 `f4e601b` 里再改一条（毫秒断言） |
| `evidence/pv-fe02/**` | 新增 | 浏览器断言脚本、fixture、日志、截图、`HEAD-sha-at-verification.txt` |
| `engineering/mvp/execution/provider-surface/delivery-pv-fe02.md` | 新增 | 本页 |

未改：`app/server`、`app/runtime`、`domains`、`brand`、`contracts/*`、`intake.md`、任何 HTTP 契约、`app/package.json`（未新增依赖）。

## 3. 三条旅程的前后步数对照

前值取 `EX-PV5 Q1`（`/private/tmp/se-fable-pv/explore/ex-pv5-flow-and-runtime.md` §1.1–1.3，基线 `9c8b64e`，勿重推）。后值读本分支 `app/web/settings-view.mjs` 与 `app/web/model-picker.mjs`，按函数与行号推导。

### 3.1 情形 (a)：目录 provider（DeepSeek）+ key，选目录模型

| | 前（EX-PV5 §1.1） | 后 |
|---|---|---|
| 打字处 | 1（API key） | 1（API key，不变——催化路径没有 Base URL，`scheduleAutoDiscover` 不适用于非兼容路径） |
| 点击次数 | 6～7 | 6～7（不变：展开 Add provider、可能的路径单选、Provider 选择、Save key、Model 选择、提交按钮；提交按钮从 "Save connection" 改名 "Save and ask once"，仍是同一次点击） |
| HTTP 往返 | 9（4 并发 GET + Save key 的 3 + Save connection 的 2：`PUT /provider-config` + `reloadConnections`） | 9（"Save only"，不变）或 **11**（"Save and ask once"：同 9 + `POST …/verify` + `runVerify` 内部再一次 `reloadConnections`，见 `settings-view.mjs:1416,1451-1453,792-819`） |

引用：提交处理器 `form.addEventListener("submit", …)`（`settings-view.mjs:1411-1460`），`const askOnce = event.submitter === save`（`:1416`），非兼容路径分支的 `PUT /provider-config` + `await reloadConnections()`（`:1427-1439`），askOnce 触发 `void runVerify(target.id, snapshot.config.model, connectionLabel(target))`（`:1453`），`runVerify` 内 `POST …/verify` 与随后 `await reloadConnections()`（`:792-819`）。
**净变化**：目录路径的点击与打字不变——它本来就没有可自动化的输入（没有 Base URL）。变化是可选的 +2 次往返，换来"这个模型确实回答了"的一次证据，而不是靠用户另开一次对话去验证。

### 3.2 情形 (b)：兼容端点，Base URL + key，选一个发现的模型

| | 前（EX-PV5 §1.2） | 后 |
|---|---|---|
| 打字处 | 2（Base URL、API key） | 2（不变） |
| 点击次数 | 5～6（含手动点 "Fetch models"） | **4～5**（手动 "Fetch models" 点击被自动发现取代；按钮改名 "Refresh models"，只作手动重跑，见 `settings-view.mjs:215`） |
| HTTP 往返 | 9（4 并发 GET + 手动 discover 1 + Save connection 的 4：POST/PUT + GET catalog + GET connections + PUT config） | "Save only"：**约 11**（4 + 自动 discover 至多 2 次 + Save 的 4）；"Save and ask once"：**约 13**（上一栏 + `POST verify` + 1 次 `reloadConnections`） |

引用：`scheduleAutoDiscover(delay)`（`settings-view.mjs:1332-1340`）只要求 `providerProbeRequest({ baseUrl: baseUrl.value })` 非空（`:246-251`，不要求 key）；`baseUrl` 的 `input` 排 600ms（`:1341-1348`）、`blur` 立即跑（`:1349`）；`key` 同构（`:1350-1356`）。典型序列是 Base URL 失焦触发一次不带 key 的发现、key 失焦再触发一次带 key 的发现（保存时核的是后一份，见工单事实前提第 4 条），因此往返数不降反升，但**手动点击数少一次**——用户不必记得点 "Fetch models" 才能看到模型列表。`saveCompatibleConnection()` 本身的 4 个请求未变（`:1374-1407`）。
**净变化**：自动发现把"点一次 Fetch models"从用户负担挪到宿主负担（多花 1 次静默往返换 1 次少点击），"Refresh models" 仍在，供用户不信任自动结果时手动重跑。

### 3.3 情形 (c)：模型 id 不在任何列表里

| | 前（EX-PV5 §1.3） | 后 |
|---|---|---|
| 可能性 | **今天没有任何路径**（UI 无自由文本入口，服务端两处闭集校验拦死，见 EX-PV5 (c1)/(c2)） | 存在：模型选择器固定入口 "Use a model ID that is not listed…" |
| 打字处 | — | 1（Model ID） |
| 点击次数 | — | 2～4："Use a model ID…" 展开（1）+ 可选改连接下拉（0～1）+ 可选勾 "Offers reasoning effort"（0～1）+ 主/次动作（1） |
| HTTP 往返 | — | "Use without asking"：3（`PUT /provider-connections/:id` → `PUT /provider-config` → `GET /provider-models` 刷新）；"Use and ask once"：4（上一栏 + `POST …/verify`） |

引用：`customToggle`（`model-picker.mjs:129-131`，"Use a model ID that is not listed…" 文案在 `:150`）；`submitCustomModel(askOnce)`（`:198-270`）三步序 `await request(\`/provider-connections/${…}\`, {method:'PUT'})`（`:223`）→ `await request('/provider-config', {method:'PUT'})`（`:232`）→ 呈现层刷新 `catalog = await request('/provider-models')`（`:246`，失败不回滚已成功的两步，见注释 `:244-245`）→（仅 askOnce）`await request(\`…/verify\`, {method:'POST'})`（`:263`）；`customUseAsk`/`customUseOnly` 两个按钮分别调 `submitCustomModel(true|false)`（`:284-285`）。
**净变化**：这是三条旅程里唯一一条从"不存在"变成"存在"的路径，往返数与点击数无从与"前"比较，只能与其自身的两种动作（问一次 / 不问）比较。

## 4. 按钮与回执文案全表

| 位置 | 文案 | file:line |
|---|---|---|
| Settings 提交按钮（主） | "Save and ask once" | `settings-view.mjs:914` |
| Settings 提交按钮（次） | "Save only" | `settings-view.mjs:919` |
| Settings 提交按钮下说明 | "Saving sends one short prompt to the selected model so you can see it answer. Nothing else is sent." | `settings-view.mjs:923` |
| Fetch models 按钮改名 | "Refresh models"（`CONNECTION_STEPS.fetch.buttonLabel`） | `settings-view.mjs:215` |
| smoke 步标题 | "Ask the model once" | `settings-view.mjs:226`（`title` 字段，紧邻 `:228` 的 note） |
| smoke 步 note（完成态） | "Sends one short prompt with the saved key and the selected model, and shows the first line of the answer. It shows that this model answers now; it is not a check of any other model on this connection." | `settings-view.mjs:228` |
| smoke 步状态词（成功后） | " · Answered"（灰字，追加在步名后，`connection-step-status`） | `settings-view.mjs:671`（逻辑），`659-671`（span 挂载见 `renderFlow`） |
| 冒烟等待态 | "Asking the model…" | `settings-view.mjs:804` |
| 回执成功·第一行 | `` `Answered in ${elapsed} · ${receipt.replyFirstLine ?? ""}` ``（1 秒以内写毫秒，见 §7 待裁定③） | `settings-view.mjs:417-420`（`verifySuccessLine`） |
| 回执成功·第二行 | `` `${receipt.model} on ${connectionLabelText} · key from ${receipt.credentialSource} · ${localTime(receipt.checkedAt)}` `` | `settings-view.mjs:423-424`（`verifyDetailLine`） |
| 回执失败·六态登记文案（四条静态） | `authentication_failed`→"The provider rejected the key"；`timeout`→"No answer within the time limit"；`unreachable`→"The endpoint could not be reached"；`malformed_response`→"The provider answered in a shape this host cannot read" | `settings-view.mjs:391-395`（`VERIFY_STATUS_HEADLINES`） |
| 回执失败·`http_error` | `` `The provider returned HTTP ${receipt.httpStatus}` ``（动态，非静态常量） | `settings-view.mjs:399-401`（`verifyHeadline`） |
| 回执失败·`unknown` | 无登记文案，只转述 `receipt.message` 原话 | `settings-view.mjs:404-406`（`verifyFailureLine`，PV-62①） |
| "Ask again" | "Ask again" | `settings-view.mjs:660` |
| 连接行最近回执·成功 | `` `Answered ${localTime(receipt.checkedAt)} · ${receipt.model}` `` | `settings-view.mjs:429-431`（`connectionRowVerificationLine`） |
| 连接行最近回执·失败 | `` `Last ask failed ${localTime(receipt.checkedAt)} · ${verifyHeadline(receipt) || receipt.message}` ``（不带原话，比回执块短一截） | `settings-view.mjs:432` |
| 降级连接行 | "provider configuration is unavailable; repeat the incomplete operation or remove the compatible connection"（逐字取自后端 `#requireReadyConnection`，`service.mjs:803-804`） | `settings-view.mjs:437-438`（`CONFIGURATION_INCOMPLETE_MESSAGE`） |
| reasoning 行标签（表单） | "Offers reasoning effort" | `settings-view.mjs:887` |
| reasoningSource 为 `unknown` 时的选择器文案 | "Not verified for this model. Turn it on for this model in Connections if the provider offers reasoning effort." | `model-picker.mjs:70` |
| `origin:"connection"` 路由行追加句 | " Added on this connection." | `model-picker.mjs:79` |
| 选择器固定入口 | "Use a model ID that is not listed…" | `model-picker.mjs:131` |
| 自定义模型输入 aria-label | "Model ID" | `model-picker.mjs:134` |
| 自定义面板主动作 | "Use and ask once" | `model-picker.mjs:149` |
| 自定义面板主动作下说明 | "Saves the ID on that connection, uses it for next runs, and sends one short prompt to the model (one request)." | `model-picker.mjs:153` |
| 自定义面板次动作 | "Use without asking" | `model-picker.mjs:158` |
| 自定义面板 reasoning 复选框标签 | "Offers reasoning effort" | `model-picker.mjs:165` |
| 自定义面板失败·连接保存 | "Could not save this model ID on the connection." | `model-picker.mjs`（`customFail` 调用点，见 §6 用例引用） |
| 自定义面板失败·选中配置 | "Saved on the connection, but could not select it for next runs. …" | 同上 |
| 自定义面板失败·冒烟 | "Saved and selected, but the check could not run. …" | 同上 |
| 自定义面板成功·仅保存 | "Saved and selected. It will be used for the next run." | `model-picker.mjs`（`submitCustomModel` 的 `!askOnce` 分支） |

## 5. 被改写的旧断言与理由（`702a318`）

| 旧断言（原文摘要） | 现在 | 理由 |
|---|---|---|
| `WK-108 · 两步不再是留位说明`：断言未交付的步恰是 `smoke`，`note` 以 "Not available yet" 开头 | 改名 `WK-108/PV-62 · 冒烟不再留位`：断言六步全部 `available`，`smoke.note` 说清楚它做什么、不证明什么 | BE-39 已落地，`smoke.available` 从 `false` 变 `true`；旧断言的前提（"未交付的恰好是这一条"）与事实相反，断言方向随事实反转，不是放宽——反转后仍逐条检查：六步全可用、旧留位句一处不留、新句子有具体内容（`Sends one short prompt` / `not a check of any other model on this connection`） |
| `PV-27 · …不出一个只有一项的下拉`：`assert.match` 用固定 800 字符窗口跨两个锚点 | 窗口放宽到 1400 字符，锚点不变 | PV-61 的 `unknown`-`reasoningSource` 分支与注释插入两锚点之间，源码实测窗口涨到约 1000 字符；锚点（起止两行代码）一字未改，跳过的只是新增注释与一个三元分支，检查的内容没有变弱 |
| （`f4e601b` 追加一处）`verifySuccessLine({latencyMs:812,…})` 期望 `"Answered in 0.8 s · …"` | 改期望 `"Answered in 812 ms · …"`，并新增一条 1840ms → `"1.8 s"` 的用例 | 同一提交里把"一秒以内写毫秒"的行为改对了（§7 待裁定③），旧断言与新行为不符，随之改写；新增的 1840ms 用例钉住"满一秒才切换到秒"的边界，不是删检查 |

## 6. 新增用例（原文摘要，`702a318` + `f4e601b`）

`702a318` 新增约 15 条，覆盖：

- 六态回执的纯函数（`verifyHeadline`/`verifyFailureLine`/`verifySuccessLine`/`verifyDetailLine`/`localTime`）与 `VERIFY_STATUS_HEADLINES` 恰好四个键
- `connectionRowVerificationLine` 的成功/失败/`null` 三态
- `connectionRows` 的 `verificationLine`/`verificationFailed`/`degraded` 字段，含降级行盖过回执行、`Configure` 按钮 `disabled`
- 自动发现的去抖接线：`scheduleAutoDiscover`、`baseUrl`/`key` 的 `input`（600ms）与 `blur`（立即）四个监听器都存在，且真正发请求的仍是既有 `runProbe("discover", …)`
- "Save and ask once"/"Save only" 的 `event.submitter` 分流，且**没有任何** `input`/`change` 监听器直接调用 `runVerify`（PV-38 的自动触发红线）——用正则扫描所有 `addEventListener("input"|"change", …)` 块逐一断言不含 `runVerify(`
- `is-arrived` 一帧后移除的调用序列，及 `styles.css` 里那条唯一的新增过渡规则
- "Ask again" 重放同一个 `{connectionId, model}`
- 键入模型 ID 的三步序：只在 `submitCustomModel` 自身函数体内（用 `indexOf` 切片，避免与既有 "Use for next runs" 流程的另一个 `/provider-config` 调用混淆）断言三个请求按 PUT connection → PUT config → POST verify 的顺序出现；三句失败文案；次动作不发 verify；对话框不自动关闭（`customFlowText` 内没有 `dialog.close()`）
- reasoning 三态在选择器新模型复选框与 Settings 表单 `reasoningTouched`/`syncReasoningCheckbox` 两处的落点
- 回执块六态的渲染落点、等待态无进度条（`styles` 内不含 `<progress`/`role="progressbar"`）

`f4e601b` 额外改一条（毫秒边界，见 §5）。

## 7. 作者验证

| 检查 | 命令 | 并发 | SHA | 结果 |
|---|---|---|---|---|
| 单测 | `npm --prefix app test`（即 `node --test tests/*.test.mjs ../tests/*.test.mjs`，`app/package.json:11`） | Node 测试运行器默认并发（未传 `--test-concurrency`，按文件并发、按 CPU 核数节流） | `f4e601b` | **664/664**，fail 0，exit 0（`evidence/pv-fe02/npm-test.txt`） |
| 冒烟 | `npm --prefix app run smoke`（`node scripts/runtime-smoke.mjs`） | 单进程 | `f4e601b` | `{"status":"passed","provider":"local-fake","realProvider":"not_run"}`，exit 0（`evidence/pv-fe02/smoke.log`） |
| 浏览器断言 | `evidence/pv-fe02/pv-checks.mjs`（headless Chromium，真实 `/api/v5` 流量，端口 8915/服务、8916/fixture、CDP 20090 起，全程 local-fake，数据目录为每次运行新建的临时目录） | 单浏览器实例，串行执行六条 | `f4e601b` | PVFE2-1…6 **6/6 pass**，`failures: []`（`evidence/pv-fe02/pv-checks.json`） |
| lint | `node tools/lint-colors.mjs` / `node tools/lint-materials.mjs` | — | `f4e601b` | ok（30 files）/ ok（3 files）（`lint-colors.log`/`lint-materials.log`） |
| 对比度 | `node tools/contrast-report.mjs` | — | `f4e601b` | 全部通过（`contrast.log`） |
| reduced-motion | PVFE2-6 内嵌于浏览器断言：同一元素分别在 `prefers-reduced-motion: no-preference` 与 `reduce` 下读 `transitionDuration` | 见上 | `f4e601b` | 正常动效非零、reduced 下 `0s`（`normalMotion`/`reducedMotion` 字段） |

截图四张（均 1440 宽、light 主题）：`evidence/pv-fe02/model-picker-1440-light-custom-entry.png`、`settings-models-1440-light-connection-row.png`、`settings-models-1440-light-receipt-failure.png`、`settings-models-1440-light-receipt-success.png`。

PVFE2-1…6 逐条对应工单验收项（`evidence/pv-fe02/pv-checks.mjs:9-20`）：保存并问一次的成功回执与连接行；"Save only" 不发 verify；键入模型 ID 的 "Use without asking" 两步序；对 `unknown-ghost` 触发的失败回执（`404` 类，见 §8 待裁定②）；"Ask again" 重放；`is-arrived` 过渡的正常/reduced-motion 对照。

## 8. 待裁定

① **"Offers reasoning effort" 复选框未覆盖工单第 6 项字面写的全部路径。** 工单原文"连接表单：兼容路径与目录连接的额外模型每条带一个复选框"，字面上要求这个复选框同时出现在 Settings 表单的兼容路径**与**目录连接。实现是 `reasoningRow.hidden = pathId !== "compatible"`（`settings-view.mjs:1256`）——Settings 表单只在兼容路径出现这一行；目录连接的额外模型要声明 reasoning，今天唯一的入口是模型选择器的自定义条目面板（`model-picker.mjs:165` 的 `customReasoning`，`submitCustomModel` 的 `body` 对 `connection.kind === 'catalog'` 同样送 `models`，见 `model-picker.mjs:207-209,217`）。两个入口分别覆盖了两条路径中的一部分（兼容路径靠表单、目录连接额外模型靠选择器），但不是"表单里两条路径都有复选框"。是否要在 Settings 表单里也给目录连接的额外模型加一行，请裁定。

② **失败回执原样转述上游报文，包含裸 JSON 正文。** `verifyFailureLine` 对 `http_error` 类拼出的字符串在 fixture 下实测为 `"The provider returned HTTP 404 · 404: {\"message\":\"The model \`unknown-ghost\` does not exist\"}"`（`evidence/pv-fe02/pv-checks.json` 的 `PVFE2-4.status`）——`message` 字段本身携带了一段原始 JSON 字符串，不是一句人话。这是 PV-62① "不得为未结构化信号正则出精度"原则的直接后果：前端不解析这段文本，原样呈现。是否要求后端把这段 body 在结构化字段里拆开（例如单独给出上游 `message` 字段而不是整个 JSON 串），或前端做一次浅层 JSON 提取，请裁定。

③ **一秒以内写毫秒是 Fable 在收尾时加的改动，不在工单原文里。** 工单第 4 项只写"成功态一行：'Answered in 0.8 s · …'"，没有规定一秒以下如何显示；`ce01274` 最初实现对任意耗时都除以 1000 取一位小数，导致 30ms 级别的回执显示成 "Answered in 0.0 s"（`f4e601b` 提交信息："0.0 s" 是一个把真值抹掉的数字）。Fable 在 `f4e601b` 里补了这条分支：`receipt.latencyMs < 1000` 时写毫秒整数，否则写秒的一位小数（`settings-view.mjs:417-420`）。这是收尾阶段发现问题后的修正，不是工单原文要求的格式，记此以防日后误认为是工单规格。

④ **model-picker.mjs 的自定义面板三处失败文案未在 §4 给出精确 file:line。** `customFail` 的三处调用点（"Could not save…"、"Saved on the connection, but…"、"Saved and selected, but…"）分散在 `submitCustomModel` 内三个 `catch` 块里，本页 §4 只给了函数名定位（`model-picker.mjs:198-270` 区间内），未逐行标注——三处文案本身都是模板字符串拼接错误对象的 `error.message`，不是纯静态常量，行号会因未来小改动漂移，此处不作进一步精确化；核对以 `grep -n "customFail(" app/web/model-picker.mjs` 为准。

## 9. 未检项

- **真实 provider `not_run`**：凭据只在 UI 输入，未持有任何真实 key，未读取任何凭据文件；DeepSeek / OpenAI / 任何远端网关均未接触（`evidence/pv-fe02/smoke.log` 的 `realProvider: not_run`）。
- **`openai-responses` 路径未被本单 loopback fixture 端到端跑过**：fixture 只实现 `chat/completions` 形态，`POST …/verify` 走的是与 run 同一条 pi 路径，但 `api:"openai-responses"` 这条 wire 格式在本单证据里一次未被实际请求触发（沿 BE02/BE03 的同一未检项）。
- **深色主题与窄宽度未截图**：四张截图均为 1440 宽、light 主题；暗色主题下 `--danger`/`--muted-strong` 的实际渲染、以及移动宽度（<768）下自定义模型面板与回执块的换行未验证。
- **`onResponse`/`options.fetch` 钩子在真实网络重试下的行为未验**：PV-86 记录"pi 内部重试时以最后一次响应的状态为准，回执不区分重试"，这是后端边界，本单前端未针对多次重试的场景另行截图或断言。
- **自动发现的去抖时序未用真实网络延迟验证**：`scheduleAutoDiscover` 的 600ms/立即两档在 fixture（本机 loopback，近乎零延迟）下跑通，未验证在真实网络往返延迟下用户体验是否合适（例如输入过程中连续触发多次 debounce 是否会造成请求堆叠——代码用 `probeRevision` 令牌丢弃过期响应，但未做压力测试）。
- **连接行 `verificationLine` 在多条连接同时存在回执时的视觉密度未截图**：截图 `settings-models-1440-light-connection-row.png` 只展示一条本地连接带回执，未展示三条以上连接同时各自带回执行时的布局。
- **未改动本树以外的任何目录；未起除 8915/8916 与 headless Chrome 之外的任何进程，且均已停止**（沿 `evidence/pv-fe02/browser.mjs` 的既有约定）。
