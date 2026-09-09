# FE-03 交付 · Chat / Work / Memory shell（含第 0 项 BE-17/18 消费）

2026-09-09 · Claude Opus，单一 writer。工单 [WO-FE-round4 §FE-03](work-orders/WO-FE-round4.md)；裁定 [intake-round-3](intake-round-3.md) §4g（WK-92 / WK-89）、§4j（WK-100）、§4k（WK-105）、§4m（WK-107）、§4n（WK-108，第 0 项）。输入 [语义审查](inputs/review-semantics-2026-09-09.md) §3 / §4，协议 [runtime-foundation](../../../../app/docs/runtime-foundation.md#unsaved-provider-preview-be-1718)。体例沿 [delivery-fe02](delivery-fe02.md)。

**作者验证与独验分列。** 本页全部为作者验证；Astra 的独立验收另页。视觉四轴（Maturity / Identity / Quietness / Durability）留用户，本页不自评。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `4d9714e`（FE-02 合流后的清洁节点，WK-108） |
| 分支 | `claude/fe03-chat-work` |
| 树 | `<isolated-checkout>` |
| 端口 / 数据目录 | 8895（按用途轮换，每次换全新空目录）；FE-T03-e 的冻结源与 RC 的 MCP 线路 fixture 用 8896；探测目标目录 fixture 绑临时端口；CDP 19895–19902 |
| 凭据 | 未读取任何凭据文件；全程 local-fake / loopback，未配置真实 provider，fixture 内无任何真实 key。探测只打本单自己起的 loopback 假目录 |

| # | commit | 内容 |
|---|---|---|
| 1 | `81390de` | 第 0 项：两步变控件、请求体、结果映射、两句旧文案改正；FE-03：Chat / Work 模式词、Matter header 的 `Memory · Off`、Continue in Work 命名、Settings › Memory 重述；两个测试文件 |
| 2 | 本页最后一次提交 | 词表与 text-sweep 增量、本页与 `evidence/fe03/`。一次提交无法在自己内部写下自己的 SHA；分支头以 Astra 收到的为准 |

## 2. 改动文件

| 文件 | 改了什么 |
|---|---|
| `app/web/settings-view.mjs` | `CONNECTION_STEPS` 两步改为 `probe` 控件；新增 `PROBE_PATHS` / `probeAvailableFor` / `PROBE_ABSENT_NOTE` / `PROBE_PROTOCOL` / `providerProbeRequest` / `PROBE_ENDPOINT` / `probeReading` / `probeLine` / `probeCatalogueLine` 九个纯导出；控制器加 `renderFlow` / `runProbe` / 结果区，`lock()` 覆盖两个新按钮；`MCP_INTAKE_STEPS` 改正；`renderMemory` 按语义审查 §4 重述 |
| `app/web/ui-controls.mjs` | `sessionMode` / `sessionModeLabel` / `SESSION_MODE_LABELS` / `MEMORY_SCOPE_OFF` 四个导出：Chat / Work 只读既有的 `extensionBinding` |
| `app/web/app.mjs` | `renderChatHeader` 的 meta 行加模式词与（只在 Work 上的）scope 位；导航行加 `Work` 标记与 `.session-line` 包层；绑定面板改名为 Continue in Work（标题、两段、primary、说明句、toast、Release 的 accessible name） |
| `app/web/styles.css` | `.connection-step-action` / `.connection-probe-result` / `.connection-probe-models` / `.connection-probe-model` 四组；`.session-mode` / `.session-scope` / `.session-mode-tag` / `.session-line` 四组 |
| `app/tests/models-connections.test.mjs` | 第 0 项五条（控件化、路径限定、请求体、结果映射、不注入）；原「未交付两步无控件」一条随后端交付作废并被替换 |
| `app/tests/chat-work-shell.test.mjs` | 新文件，五条：模式判断、Continue in Work 的唯一路由、scope 位无控件、Memory 组词与零控件、导航标记 |
| `engineering/design/copy-convention.md` | §3.1 加两行 + WK-92 一段；§3.3 的 WK-91 注改写为 WK-108 并加两行；§3.4 加 `Memory · Off` 一行、Memory 行改写 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §8：十一条替换 + 九条新增字符串的承重说明 |

未改：`app/server`、`app/runtime`、`app/core`、`domains`、`brand`、任何 HTTP 契约（`git diff 4d9714e..HEAD -- app/server app/runtime app/core domains brand` 为空）。未新增依赖、状态、字段或端点。未新增 `app/web` 模块，因此**无 allowlist 请求**。

## 3. 消融表

### 3.1 删除（去掉后不失去判断）

| 元素 | 位置 | 去掉后失去的判断 | 结论 |
|---|---|---|---|
| `Not available yet: the host has no handshake…` | `CONNECTION_STEPS.test` | 失去的判断是**错的**：宿主现在有握手了。留着它等于用界面否认一次已交付的后端能力 | 删（换成这一步做什么与不做什么） |
| `Not available yet: the same missing handshake as a model connection.` | `MCP_INTAKE_STEPS` | 同上，且它把两个不同协议说成同一个缺口 | 删（换成协议不同这个真正的理由） |
| `Bind to chat` · `Create binding` · `Bind <extension>` | `app.mjs` 三处 | 无。它们说的是内部动词（绑定一个 extension），而用户要做的事是"把这个 Chat 继续成 Work"。三个名字说同一件事，是三次机会去猜它 | 合并为 `Continue in Work` |
| `Continue existing` / `Create new` | 绑定面板两段 | 「existing 什么」「new 什么」要靠上下文补。补上主语之后这两段自己能读 | 改名 |
| Memory 组的第二段（`Instructions, Skills and references…`） | `renderMemory` | 不失去，但它把 Sources 说成"配置在别处"，没说 Sources **不是** Memory。合进第一段之后这句话才承重 | 并入 |

### 3.2 新增（去掉后会失去判断）

| 元素 | 承担的判断 | 位置 |
|---|---|---|
| 两个探测控件 | **这个地址现在通不通**。之前这件事只能靠"保存下去再开一个 Chat 试" | `settings-view.mjs` `renderFlow` |
| `<status> · <backend message>` 一行 | **失败是哪一种失败**：401 / 404 / 超时 / 不可达在后端本来就是不同的状态词，改写成一句"连接失败"会把四件事说成一件 | 同上 `probeLine` |
| `The directory reports N models…` | **报告 ≠ 可用**：这些 ID 不进下拉、不入配置；保存与执行仍受 allowlist | 同上 `probeCatalogueLine` |
| 两条路径上的「没有可探测的端点」说明 | **为什么这里没有那两个按钮**：端点归 provider 或归宿主，不是"暂不支持" | 同上 `PROBE_ABSENT_NOTE` |
| 标题行下的 `Chat` / `Work` | **这是哪一种会话**。之前只能从"右边有没有工作面"反推，而工作面可以被收起 | `app.mjs` `renderChatHeader` |
| 导航行的 `Work` 标记 | 同一件事在**列表里**的读法。Chat 不加标记，标记本身才有信息 | `app.mjs` 会话行 |
| `Memory · Off` | **这个 Matter 的记忆范围**。它今天只有一个值，但"只有一个值"本身是要被读到的事实 | `ui-controls.mjs` |
| 绑定面板的「不复制不迁移」句 | **续用之后我的历史还在不在**。这是 Chat → Work 唯一会让人犹豫的地方 | `app.mjs` `renderBindingPanel` |
| Temporary chat 一行 | **词已冻结、控件待 BE-20**，且说清今天为什么等价 | `settings-view.mjs` `renderMemory` |

## 4. 五轮收敛表（WK-100）

轮 ①信息层级 ②光学对齐 ③组件几何 ④材质（FE-05 前只验不越层、无未登记 blur）⑤交互状态。

### 4.1 Settings › Models（第 0 项）

| 表面 | 轮 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Models | ① | 组内唯一 primary action 仍是 `Save connection`；两个探测控件是 secondary | MOD-2 通过（`primaryActions: 1`） | `settings-view.mjs:399`（`.connection-step-action` 用 `secondary-button`） |
| Models | ① | 探测结果与步骤说明分两档：说明是常驻的灰字，结果是 `role="status"` 的一行 | PRB-1/4/5 通过 | `settings-view.mjs:352` |
| Models | ① | `ok` 不被升级为「已验证 / 可推理 / 已配置」 | PRB-1 通过（`!/verified|configured|can reason|ready/`） | `models-connections.test.mjs`「结果原样呈现」 |
| Models | ② | 控件挂在它所属的那一步下，与该步说明同一条左起点（`grid-column: 2`） | MOD-4b 读到两个控件且都在步骤内 | `styles.css` `.connection-step-action` |
| Models | ③ | 同行级 input / select 仍是 32 / 8px 一档（新控件不引入第三档） | MOD-8 通过（`heights: [32]`, `radii: ["8px"]`） | `models-checks.json` |
| Models | ③ | 1440 / 390 无横向溢出 | MOD-13 两档通过 | 同上 |
| Models | ④ | Models 与 Tools 两组无 backdrop-filter | MOD-10 通过（`blurred: 0`） | 同上 |
| Models | ⑤ | 无 Base URL 时两个控件 disabled；busy / active Run 时随 `lock()` 一起锁 | MOD-4b 通过（两个都 `disabled: true`）；`lock()` 同一把锁 | `settings-view.mjs` `lock()` |
| Models | ⑤ | 请求中 `Probing…`，完成后被同一位置的结果替换；改地址 / 改 key 后旧结果离开 | PRB-8 通过（`hidden: true`） | `settings-view.mjs` `runProbe` / `clearProbeResult` |

### 4.2 Home

| 表面 | 轮 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Home | ①③ | composer 中心 ≥ 55%、其上 ≤180、宽 760–880、初始 92–112 | HOME-1…5 通过（0.56 / 38 / 820 / 96） | `composition-checks.json` |
| Home | ① | 三 StatTile 在 composer 之下，无 Heatmap Planned 行 | HOME-7 通过 | 同上 |
| Home | ③ | 1440 / 390 无横向溢出；窄屏 composer 沉底 | HOME-overflow / narrow 通过 | 同上 |
| Home | ⑤ | 无数据时三 tile 读确认过的 0，不报错、composer 可用 | FE-T01 无数据 3 / 3 | `fe-t01-empty.json` |

本单未触及 Home 的任何几何或文案；这一节是回归。

### 4.3 Chat / Work shell

| 表面 | 轮 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Chat 头部 | ① | 未绑定会话说 `Chat`，且没有 scope 位 | CW-1 通过 | `app.mjs` `renderChatHeader` |
| Work 头部 | ① | 绑定会话说 `Work`，并多出 `Memory · Off` | CW-2 通过 | 同上 |
| 两态 | ② | 模式词 / scope 位 / run badge 同字号（11px）、同基线（top 31）、同色 | CW-4 通过 | `styles.css` `.session-mode, .session-scope` |
| 导航 | ②③ | 只 Work 加标记；两种行同高（38） | CW-5 通过 | `app.mjs` 会话行 |
| Continue in Work | ① | 面板一个 primary action，两段各自命名，说明句含「不复制不迁移」 | CW-6 通过 | `app.mjs` `renderBindingPanel` |
| 两态 | ④ | Chat / Work / Memory 三处无**未登记** backdrop-filter | CW-10 通过（表外 0；登记表见 `tools/lint-materials.mjs`） | `shell-checks.json` |
| 两态 | ③ | 1440 / 390 无横向溢出 | CW-11 两档通过 | 同上 |
| 两态 | ⑤ | 续用之后同一个会话就地变成 Work：头部换词、scope 位出现，id / 项目 / 历史不变 | CW-7 / CW-8 通过 | 同上 |

### 4.4 Matter header（scope 位）

| 表面 | 轮 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Matter header | ① | scope 位与模式词同一档，不是徽章 | CW-4 通过（无背景无边框） | `styles.css` |
| Matter header | ③ | 无背景、无边框、无 radius | CW-3 通过（`background: rgba(0,0,0,0)`, `border: none`） | 同上 |
| Matter header | ④ | 无 backdrop-filter | CW-10 通过 | `shell-checks.json` |
| Matter header | ⑤ | 零 focusable、零 popover、零 `aria-haspopup` | CW-3 通过（`metaFocusable: 0`）；单测同断言 | `chat-work-shell.test.mjs` |

### 4.5 Settings › Memory

| 表面 | 轮 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Memory | ① | 两段：一段能力边界、一行 Temporary chat；无标题以外的第二层 | CW-9 通过（`paragraphs: 2`） | `settings-view.mjs` `renderMemory` |
| Memory | ① | 不用 `Session Memory`；Sources 与 Memory 明确分开 | CW-9 通过；单测同断言 | 同上 |
| Memory | ③⑤ | 零 focusable | CW-9 通过（`focusable: 0`） | `shell-checks.json` |
| Memory | ④ | 无 backdrop-filter | CW-9 通过（`blurred: 0`） | 同上 |

## 5. text-sweep 增量

见 [text-sweep §8](text-sweep.md)：十一条替换、九条新增字符串。词表增量见 [copy-convention](../../../design/copy-convention.md) §3.1（`Continue in Work` 等两行 + WK-92 一段）、§3.3（WK-91 注改写为 WK-108，加两行）、§3.4（`Memory · Off` 一行）。

## 6. 第 0 项 · 三种探测展示（结果原文）

三条都打本单自己起的 loopback 目录 fixture（临时端口，三条路径分别回合法目录 / 401 / 404），经产品自己的控件与 `/api/v5` 流量取得。**没有一个真实 provider 被联系过**。

| # | 断言 | 结果原文 |
|---|---|---|
| PRB-1 | `test` ok：状态与后端原话逐字上屏 | `{"text":"ok · Model directory handshake succeeded; generation was not tested.","models":[]}` |
| PRB-2 | `discover` ok：目录报告 3 个模型，ID 原样列出 | `{"text":"ok · Model directory handshake succeeded; generation was not tested.","catalogue":["The directory reports 3 models. They are listed as reported, and are not added to the Model list or saved."],"models":["probe-model-a","probe-model-b","probe-model-c"]}` |
| PRB-3 | 模型 ID 不进 Model 下拉，也不进已保存配置 | `{"modelOptions":["gpt-4","gpt-4-turbo",…,"o4-mini"],"configUnchanged":true}`（39 项全部来自已安装目录，无一以 `probe-model` 开头） |
| PRB-4 | `authentication_failed` 原样呈现 | `{"text":"authentication_failed · The model directory rejected authentication."}` |
| PRB-5 | `unsupported` 原样呈现，且没有目录行 | `{"text":"unsupported · The target does not support this model directory endpoint.","catalogue":[]}` |
| PRB-6 | 无 key 时省略字段 | `{"requests":[{"url":"/ok/models","authorization":null,"extra":[]},{"url":"/ok/models","authorization":null,"extra":[]}]}` |
| PRB-7 | 有 key 时只作 Bearer 送出 | `{"requests":[{"url":"/ok/models","authorization":"Bearer synthetic-probe-key","extra":[]}],"text":"ok · Model directory handshake succeeded; generation was not tested."}` |
| PRB-8 | 改地址后上一次的结果离开 | `{"hidden":true}` |

**8 / 8**（`evidence/fe03/probe-checks.json`）。PRB-6 / PRB-7 是「无 key 省略字段」的端到端证据：目标目录收到的请求里根本没有 `Authorization` 头，也没有任何 `x-` 自定义头。

## 7. 分配反例（结果原文）

### 7.1 FE-T01（delivery-wk13 §7.3 三条）

| 用例 | 结果原文 |
|---|---|
| 无数据 | `{"tiles":[{"label":"Waiting for you, 0","value":"0"},{"label":"In progress, 0","value":"0"},{"label":"Needs a look, 0","value":"0"}]}` · `{"projects":0,"errors":[],"composerDisabled":false}` · `{"homeError":null,"errors":[],"retries":[],"emptyText":""}` — **3 / 3** |
| 无绑定 | `{"binding":null,"mode":"Chat","scope":null,"composerDisabled":false,"matterHits":0,"bandHidden":true}`；WK-92 追加一条 `{"mode":"Chat","scope":null}` |
| 读取失败 | `{"before":["1","4","1"],"after":["1","4","1"]}`（**不塌成 0**）· `{"error":"The local runtime could not be reached.","retry":true}` |

无绑定 + 读取失败合计 **4 / 4**（`fe-t01-rows.json`）。「无数据」一条的第三项改了**量法**：原文用全文正则找 `failed`，而 Home 的 `Needs a look` 说明句里本来就含 `Runs recorded failed or unknown` —— 那是集合的**定义**，不是这一屏的状态。改为读产品自己的失败通道（`state.home.error`、可见 `.inline-error`、任何 `Retry`），三者皆空。理由写在脚本注释里。

### 7.2 FE-T11（delivery-wk10b-2 §6.3）

| 步骤 | 结果原文 |
|---|---|
| 换源后旧候选的四条状态词 | `before` 与 `after` 同为 `[["purpose-limitation","pass"],["need-to-know-recipients","pass"],["security-and-notice","pass"],["term-duration","pass"]]`，`currentHasClause:false` |
| 旧候选的 `term-duration` 锚点与引文 | `["source-41adb51d-…:1 [672, 765] 4. Term. These confidentiality obligations continue for three years after the Effective Date."]`，`unchanged:true`，`sourceVersion:1` |
| 按冻结 revision 读历史来源 | `{"bytes":765,"hasClause":true}`（当前来源已不含该条款） |
| 重放原 `request_id` | `{"replayStatus":200,"decisions":1,"same":true}` |
| 对旧 base 的新决定 | `{"status":409,"error":{"code":"CANDIDATE_CLOSED","message":"CANDIDATE_CLOSED: accepted"}}` |
| producer 卸载后读历史来源 | `{"unload":200,"read":200,"bytes":765}` |

**6 / 6**（`fe-t11.json`）。本单未触碰工作面与 work-core，这一条是回归。

## 8. 既有回归

| 套件 | 本单如何跑 | 结果 |
|---|---|---|
| `npm --prefix app test` | 全量（含新增十条） | **228 / 228** |
| Settings › Models 五轮收敛（`models-checks.mjs`） | 8895，脚本复制自 FE-02 集成证据，只改端口与**两条断言**（见下） | **18 / 18** |
| Home / Work 几何（`composition-checks.mjs`） | 8895，逐字复制只改端口 | **16 / 16** |
| FE-T03（请求值 / 有效值 / 绑定值） | 8895（failed fixture）+ 8896（冻结源） | **5 / 5** |
| RC 契约 / 反例 / 视口 | 8895，MCP fixture 8896，三支逐字复制只改环境变量 | **20 / 20 · 9 / 9 · 36 / 36** |
| `lint-colors` / `lint-materials` / `contrast-report` / `smoke` | 全部 | ok / ok / 无低于门槛 / 通过（`realProvider: not_run`） |

**`models-checks.mjs` 改了两条断言，理由是后端交付而不是放宽。** FE-02 的 MOD-4 断言「未交付的两步 `pendingControls === 0`」、MOD-5 断言「全站没有按钮承诺 Test connection / Fetch models」。BE-17/18 交付并被本单消费之后，这两条断言的前提消失了——它们断言的是一个**已经不成立的世界**。新断言更严，不更松：

- **MOD-4a / 4b / 4c**（一条拆成三条，按路径分别断言）：catalog 与 local 上探测控件为 0 且各有一句说明；compatible 上恰好两个控件、文字为 `Test connection · Fetch models`、且 Base URL 为空时两个都 `disabled`。
- **MOD-5**：`Detect` 一词全站零命中，且**默认路径**上探测控件为 0。

## 9. allowlist / 后端请求

- **allowlist：无请求。** 本单未新增 `app/web/*.mjs` 模块，`app/server/index.mjs:22` 的静态白名单不需要改。
- **后端请求：BE-17 / BE-18 已消费并关闭。** 两条路径 `POST /api/v5/provider-connection/test` 与 `POST /api/v5/provider-models/discover` 已按冻结协议接线，未新增字段、未加自定义 header、未发明第三条路径。
- **仍未闭合，沿用已登记的两单**：BE-21（连接注册表：保存 / 执行任意 compatible 与 local provider、目录新发现模型的绑定，仍受现有 allowlist 限制）、BE-22（MCP server 注册）。
- **本单新登记建议**（本单无权改 [backend-requests](backend-requests.md)，列此待 Fable 收录）：
  - **BE-23 · 无项目的 Chat**：`POST /api/v5/sessions` 的 `projectId` 是必填的（`app/server/service.mjs:419`），所以 WK-92 说的「无 workspace、无项目文件夹也可」的 Chat 今天**没有创建路径**。本单按裁定不伪造：界面上没有任何入口暗示可以开一个没有项目的 Chat。记为**待验接口**（§11 ①）。
  - **BE-19 / BE-20 保持登记**：memory adapter 与 Temporary chat 未交付，Matter header 的 scope 位与 Memory 组因此都只有陈述、零控件。

## 10. 未检项（分列，一律 not_run）

| 项 | 状态 | 说明 |
|---|---|---|
| 触控（真实触屏） | `not_run` | 390 下命中区由 RC 视口逐组量过尺寸，但没有真实触屏交互；两个新控件未在触屏上按过 |
| 读屏（VoiceOver / NVDA） | `not_run` | 模式词、`Memory · Off`、探测结果的 `role="status"` 播报未在读屏下听过 |
| 真实 IME | `not_run` | 本单新增的自由文本输入只有 Base URL（ASCII 地址），未在 IME 下输入过 |
| 200 % 浏览器缩放 | `not_run` | 只测 1440 / 390 两个 viewport |
| 真实 provider | `not_run` | 全程 local-fake / loopback。探测打的是本单自己起的假目录；从未发出一次真实模型请求，未保存任何真实 key，未读取任何凭据文件 |
| 深色宗（新控件与新文字） | `not_run` | `contrast-report` 覆盖 token 层，但新控件的深色截图未生成 |
| 1024–1439 中间档 | `not_run` | 与前几单同 |
| 视觉四轴 | 留用户 | 不自评 |

## 11. 待裁定

1. **「无项目的 Chat」没有后端创建路径 —— 待验接口。** WK-92 写的是「Chat = 未绑定会话（无 workspace、无项目文件夹也可）」。今天 `createSession` 必须带 `projectId`，且每个会话都会被创建一个 `workspaceDir`。本单按最保守实现：**只在既有能力上把 Chat / Work 两态说清**，不加任何暗示「可以不选项目」的入口，也不在前端造一个假的「无项目」容器。真正的无项目 Chat 需要 BE-23（§9）。同时这意味着词表里「Workspace 是可选绑定」在**产品事实**上今天还不成立（每个会话都有一个目录），只是这件事在界面上不被说出来。
2. **Matter header 落在会话标题行，而不是工作面。** WK-92 说 scope 位在「Matter header」。这个产品今天没有一块独立的 Matter 头：Matter 的事实分散在工作面板与会话头。本单把 scope 位放在**会话标题下的 meta 行**并只在 Work 上出现——那是今天唯一一处「一眼能看到这是哪一个 Matter 的会话」的地方。若裁定 scope 位应随工作面走（`#surface-title` 一带），是一次纯位置改动，不影响它的内容与零控件性质。
3. **`Memory · Off` 是陈述还是「关着的开关」。** BE-19 之前只有一个值，所以本单把它画成一句话，无 popover、无 caret、无 `aria-haspopup`。代价是：BE-19 交付那天，同一处要从陈述变成控件，读者会看到一次形态变化。另一种做法是现在就画一个只有一项的选择器——本单认为那是先许诺再收回，按 FE-02 的先例不取。
4. **探测控件只给 Compatible endpoint 一条路径。** BE-17/18 需要一个显式 `baseUrl`；catalog 的端点归 provider，local 的地址由宿主固定，两者在表单里都写不出 `baseUrl`。所以两个控件只在一条路径上出现，另两条各留一句说明。若裁定 local 路径也应可探测，需要后端先把宿主固定的那个地址暴露出来（今天前端读不到它），归 BE-21 或一条新的只读端点。
5. **成功的探测不改变任何可保存的东西 —— 这是对的，但读起来像半截路。** 用户看到「目录报告 3 个模型」之后，下一步仍然只能从**已安装目录**里选一个模型来保存。这不是本单的实现选择，是 allowlist 的事实（WK-108 明写归 BE-21）。界面按事实写（「不进 Model 列表、不保存」），但这一条值得记：**在 BE-21 之前，`Fetch models` 对 compatible 路径的用户是一次诊断，不是一步流程。**
6. **错误文案抻平仍未做。** WK-107 ⑥ 把它列为「FE-03 后议题」。本单新增的探测结果同样直出后端原话（`authentication_failed · The model directory rejected authentication.`）——这是刻意的：状态词与固定 message 是后端冻结契约的一部分，改写它等于前端替后端解释失败原因。全站 4xx / 409 的文案统一仍是一次独立裁定，本单不代做。
7. **`shell-checks.mjs` 与 `fe-t11.mjs` 不幂等。** 前者把一个 Chat 续成 Work，后者换源并记一条决定；重跑前必须换全新空数据目录并重新播种。已写进 `evidence/fe03/README.md`。这不是缺陷，是「这两条反例检查的正是不可逆的那一步」的直接后果，但独验时会踩到。

## 12. 哪一像素改变了哪一判断

- **标题下多了一个 11 px 的词。** 之前判断「我在 Chat 里还是在 Work 里」要去看右边有没有工作面——而工作面可以被收起，收起之后两种会话长得一模一样。现在这件事在标题下面，和 run badge 同一档、同一条基线，读一次标题就读到了。它没有加一层，它只是把一个已经存在的事实从「要推断」变成「被写出来」。
- **Work 的那一行 meta 比 Chat 多一格。** 多出来的那一格是 `Memory · Off`。它没有颜色、没有边框、不可点——所以它读起来是这个会话的一个属性，不是一个待办。判断从「这个产品有没有记忆」（无从得知）变成「这个 Matter 的记忆是关着的」。
- **导航里只有 Work 那几行多了一个词。** 如果两种行都带标记，标记就退化成装饰；只标一种，列表的默认含义就是 Chat，而例外自己跳出来。行高不变（38 px 两种都是），所以这一列仍然是一列。
- **三个按钮变成一个按钮。** `Bind to chat`、`Bind <extension>`、`Create binding` 说的是同一个动作的三个内部说法。合成 `Continue in Work` 之后，用户第一次读到这个词是在按钮上，第二次是在面板标题上，第三次是在词表里——三次是同一个词。判断从「绑定是什么、和继续有什么关系」变成「我要把这个 Chat 继续成 Work」。
- **两行灰字变成两个按钮，同时多了一句"它不证明什么"。** 这是本单最容易做错的一处：把 `ok` 说成「连接成功」会让人以为 key 验过了、模型能用了。屏幕上写的是后端的原句——`Model directory handshake succeeded; generation was not tested.`——一句话把成功和它的边界一起说完。判断从「我配好了」变成「那个目录接受了这次请求」，这两件事之间隔着一整个 BE-21。
- **探测结果没有绿色，也没有勾。** 失败借 `--danger`，成功只用正文色。因为这里的「成功」不是一个终点，给它一个成功的颜色会让它读起来像流程走完了。
- **模型 ID 用等宽列出来，但下拉框一个都没多。** 两处相邻，差别一眼可见：上面是目录报的，下面是这个 build 能用的。判断从「我发现了新模型，现在能用了吗」变成「我看到目录里有这些，但这个 build 还不能保存它们」——后者是真的。
- **改一个字符，上一次的结果就消失。** 一句关于旧地址的 `ok` 留在新地址旁边，是这一屏能犯的最严重的错误。它现在活不过一次 `input` 事件。
- **Memory 组从两段变成两段，但换了一段。** 之前第二段说 Sources「配置在别处」；现在说 Sources **不是** Memory。前者回答「去哪里改」，后者回答「关掉记忆会不会让它看不见我的文件」——只有后者是读这一节的人真正在问的。

## 13. Fable 复核（WK-109，2026-09-09）

非作者复核，与 §1–§12 的作者验证分列；Astra 独验另页。

| 项 | Fable 所做 | 结果 |
|---|---|---|
| 写权 | `git diff --name-only 4d9714e..HEAD` 对照工单可写清单 | 无越权；server / runtime / core / domains / brand 差异为空；证据目录在仓根 `evidence/fe03/`（仓根已有 wk6 / wk7 / rc 先例），接受 |
| 读码 | `settings-view.mjs`（探测请求体、结果映射、路径限定、锁）、`ui-controls.mjs`、`app.mjs`、两个测试文件全部差异 | 请求体与协议逐字一致；`discover` 的 ID 只显示不注入；Chat / Work 只读 `extensionBinding`，无新状态 |
| 单测 / lint | 228/228；lint-colors / lint-materials ok；contrast 76 行全通过 | 一致 |
| 浏览器 | 自有端口 8893、三个新空数据目录、独立 CDP：`models-checks` 18/18、`composition-checks` 16/16、`probe-checks` 8/8、`shell-checks` 12/12（先 `work-seed`） | 一致 |
| 断言变更 | MOD-4 / MOD-5 因 BE-17/18 交付而重写为按路径断言 | 更严不更松，接受 |
| 七项待裁 | 见 [intake-round-3 §4o](intake-round-3.md) WK-109 | 全部接受；① 登记 BE-23；② 位置待 CC-W 后再议 |
| 未复跑 | FE-T01 / FE-T11 / FE-T03 / RC 三支 | 作者结果原文在 §7–§8；Astra 独验按 `evidence/fe03/README.md`，`shell-checks` / `fe-t11` 须换空目录 |
| 视觉四轴 | 留用户 | 未评 |

结论：接受。合流次序：先 `claude/fe03-chat-work`（头 = 本条提交），再 `claude/fable-round4d`（已变基到 `386fbc6`，含 WK-108…110、BE-23、FE-03 提示词）。
