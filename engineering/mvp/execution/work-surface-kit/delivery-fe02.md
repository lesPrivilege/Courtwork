# FE-02 交付 · Models & Connections

2026-09-09 · Claude Opus，单一 writer。工单 [WO-FE-round4 §FE-02](work-orders/WO-FE-round4.md) 第 0 项与正文；裁定 [intake-round-3](intake-round-3.md) §4g（WK-91）、§4j（WK-100）、§4k（WK-105 ⑤）、§4l（WK-106）。体例沿 [delivery-fe01](delivery-fe01.md)。

**作者验证与独验分列。** 本页全部为作者验证；Astra 的独立验收另页。视觉四轴（Maturity / Identity / Quietness / Durability）留用户，本页不自评。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `2b6c221`（FE-01 合流 + Astra 补丁 `343e59b` 后的清洁节点，WK-106） |
| 分支 | `claude/fe02-models` |
| 树 | `/private/tmp/se-agent-fe02` |
| 端口 / 数据目录 | 8887 / `/private/tmp/se-agent-fe02-data/main`（rows fixture）；8889 / `…/t03`（failed fixture，无等待中的 Run）；8890 / `…/rc`（RC 三支）；MCP 线路 fixture 8888；CDP 19887–19897 |
| 凭据 | 未读取任何凭据文件；全程 local-fake / loopback，未配置真实 provider，fixture 内无任何真实 key |

| # | commit | 内容 |
|---|---|---|
| 1 | `7125e07` | 第 0 项 `--nav` 256；Models 组重建（Connections + Add provider + 统一流程 + Advanced）；Tools 组 MCP 接入说明块；两项几何收敛；新单测 |
| 2 | `37670b5` | copy-convention §3.3 八行与 text-sweep §7 |
| 3 | `583aa9a` | 本页与 `evidence/fe02/` |
| 4 | `8f3472d` · `38717bd` | 在 §1 补记 `583aa9a`；补记 fixture server 的停止日志 |
| 5 | 本页最后一次提交 | **WK-107 ② 修订**：移除本设备 display name（代码、单测、词表、反例脚本），重跑并覆盖证据。一次提交无法在自己内部写下自己的 SHA；分支头以 Astra 收到的为准 |

## 2. 改动文件

| 文件 | 改了什么 |
|---|---|
| `app/web/settings-view.mjs` | `CONNECTION_PATHS` / `CONNECTION_STEPS` / `MCP_INTAKE_STEPS` 三个闭集与 `connectionPathOf` / `connectionRows` / `renderIntegrationsIntake` 三个纯函数；连接控制器改为「列表 + Add provider disclosure + 同一张表单」；Advanced 改名并加 compat 边界句。行名取自 `providerLabels`；本设备偏好未新增任何键（WK-107 ②） |
| `app/web/index.html` | Models 块标题 `Connection` → `Connections`；Tools 组新增 `#settings-integrations-intake` 挂载点 |
| `app/web/styles.css` | `--nav` 250 → 256；`.connection-list` / `.connection-row` / `.connection-flow` / `.connection-paths` 四组；同一行级 input 与 select 同高同 radius；窄屏 `.segment` 命中区 44 |
| `app/tests/models-connections.test.mjs` | 新增六条：三条路径的闭集与 provider 身份、路径反推、列表行、未交付两步、MCP 六步、`--nav` 取值 |
| `engineering/design/copy-convention.md` | §3.3 增八行与一条「未交付的动作不占按钮」 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §7：四条替换 + 九条新增字符串的承重说明 |

未改：`app/server`、`app/runtime`、`app/core`、`domains`、`brand`、任何 HTTP 契约（`git diff 2b6c221..HEAD -- app/server app/runtime app/core domains brand` 为空）。未新增依赖、状态、字段或端点。未画后端未交付的控件。

## 3. 消融表

### 3.1 删除（去掉后不失去判断）

| 元素 | 位置 | 去掉后失去的判断 | 结论 |
|---|---|---|---|
| `Connection options` 作为 disclosure 名 | 原 `settings-view.mjs` advanced summary | 无。它里面装的正是"少数人才改的一档"，`Advanced` 说的是同一件事而且是全站已有的那一档（Appearance 已用） | 删（改名） |
| `Used for every new run in this workspace.` | 原 Model 行说明 | 失去的判断是错的：workspace 在词表里只指真实文件夹绑定，而这句说的是默认模型；且它没说已有会话怎么办 | 换句 |
| 单数块标题 `Connection` | 原 `index.html` Models 组 | 无。下面本来就要长成一个列表；单数会让"只有一条"读成"只能有一条"，而那是后端今天的状态、不是产品结论 | 改 |

### 3.2 新增（去掉后会失去判断）

| 元素 | 承担的判断 | 位置 |
|---|---|---|
| Connections 一行（四个事实 + `In force`） | **现在往哪里发请求、用哪个模型、凭据在不在**。之前这四件事分散在表单的选中值与凭据块的一句话里，读它们要先把表单读成状态 | `settings-view.mjs` `connectionRows` |
| `Add provider` 三条路径 | **端点归谁**：provider 自己、用户填、宿主固定。这是三条路径唯一真正的差别，也是"我该填什么"的答案 | 同上 `CONNECTION_PATHS` |
| 统一流程五步（两步标未交付） | **这条路一共几步、现在能走到第几步**。少了它，缺的两步只能靠"没有按钮"去推断 | 同上 `CONNECTION_STEPS` |
| Advanced 里的 compat 边界句 | **Advanced 里没有的东西不会偷偷生效**（headers / compat quirks 今天不可配） | 同上 |
| Tools 组的 MCP 接入六步 | **同一形态在 MCP 上落到哪里**：三步在下方的既有块里，三步没有落点 | 同上 `MCP_INTAKE_STEPS` |

## 4. 五轮收敛表（WK-100）

### 4.1 Settings › Models

| 表面 | 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Models · Connections | ① | 一行说四个事实，各说一次；`In force` 是唯一的状态词 | 通过 | `settings-view.mjs` `connectionRows`；`models-checks.json` MOD-1 |
| Models · Connections | ① | 全组唯一 primary action（`Save connection`） | 通过 | `models-checks.json` MOD-2 |
| Models · Add provider | ① | 默认收起：加一条连接不是主动作 | 通过 | 同上 MOD-3 |
| Models · Add provider | ① | 三条路径是一个 radio group，一个 tab stop | 通过 | 同上 MOD-3b |
| Models · 流程 | ① | 五步；未交付的两步是文本，其中零控件 | 通过 | 同上 MOD-4 |
| Models · 全组 | ① | 没有任何按钮承诺 Test connection / Fetch models / Detect | 通过 | 同上 MOD-5；`models-connections.test.mjs` |
| Models · Model 行 | ① | 说清默认只影响以后的 Chat，已有会话保持其绑定 | 通过 | 同上 MOD-11 |
| Models · 表单 | ② | label 起点同一条竖线、控件右边界同一条竖线 | 通过（533 / 1131，各一个值） | 同上 MOD-9 |
| Models · 表单 | ③ | 同级 input / select 同高同 radius | 通过（32 px / 8 px，各一个值；改前为 35–39 两档 radius） | 同上 MOD-8 |
| Models · Compatible | ⑤ | 选兼容端点：Advanced 自动展开，Base URL 空时 Save 不可用 | 通过 | 同上 MOD-6 |
| Models · Local | ⑤ | 选本地端点：Base URL 由宿主固定（禁用），API key 块退出 | 通过 | 同上 MOD-7 |
| Models · 全组 | ⑤ | active Run 时整组只读，失败原因照抄后端，不说"已排队" | 通过 | `counterexamples.json` FE-T03-e |
| Models · 全组 | ④ | 不越层、无未登记 blur：整页 L1，零 `backdrop-filter` | 通过 | 同上 MOD-10；`lint-materials.log` |
| Models · 全组 | ③ | 1440 与 390 均无横向溢出；390 下命中区 ≥44 | 通过 | MOD-13 · 1440 / 390；`rc/runtime-ui-viewport.json` |

### 4.2 Settings › Tools & Integrations

| 表面 | 轮次 | 检查项 | 结果 | file:line |
|---|---|---|---|---|
| Tools · MCP 接入 | ① | 六步与 Models 同形态；每一步只说它今天落在哪里 | 通过 | `settings-view.mjs` `MCP_INTAKE_STEPS`；`models-checks.json` MOD-12 |
| Tools · MCP 接入 | ① | 未交付的三步不长控件：整块零 focusable | 通过 | 同上 MOD-12 |
| Tools · MCP 接入 | ② | 与下方 `Tools, MCP servers and plugins` 共用块的左边界与字号 | 通过 | `settings-tools-1440-light.png` |
| Tools · 全组 | ③ | 无横向溢出；390 下命中区 ≥44 | 通过 | `rc/runtime-ui-viewport.json` |
| Tools · 全组 | ④ | 无 `backdrop-filter` | 通过 | `models-checks.json` MOD-10；`lint-materials.log` |
| Tools · 全组 | ⑤ | 既有 MCP lifecycle（Connect / Disconnect / Restart）与权限解释未改 | 通过（RC 三支未改断言） | `rc/runtime-ui-checks.json` |

## 5. text-sweep 增量

[text-sweep §7](text-sweep.md)：§7.1 四条替换（`Connection` → `Connections`、`Connection options` → `Advanced`、Model 行说明、Base URL placeholder 随路径），§7.2 九条新增字符串的承重说明。词表增量在 [copy-convention §3.3](../../../design/copy-convention.md)。

## 6. 分配反例 FE-T03（结果原文）

`node engineering/mvp/execution/work-surface-kit/evidence/fe02/counterexamples.mjs`（a–d 在 8889 的 failed fixture，e 在 8887 的 rows fixture，CDP 19897）。全文见 [counterexamples.log](evidence/fe02/counterexamples.log) 与 [counterexamples.json](evidence/fe02/counterexamples.json)：

```
PASS FE-T03-a — FN-14 · 三层可分别读出
      {"effective":{"provider":"fake-openai-loopback","model":"fake-model","baseUrl":null},"bound":[{"sessionId":"55a6d6c0-c666-4af3-87f8-bf645919bed7","provider":"fake-openai-loopback","model":"fake-model"},{"sessionId":"1cf14130-ea81-4338-8b4b-01c400d12545","provider":"fake-openai-loopback","model":"fake-model"}]}
PASS FE-T03-b — FN-14 / 16 · 请求值不冒充有效值
      {"drafted":{"provider":"deepseek","model":"deepseek-v4-pro"},"effective":{"provider":"fake-openai-loopback","model":"fake-model","baseUrl":null},"row":["Local testIn forceLocal test · Local deterministic model · Local endpoint fixed by the host · No key neededConfigure"],"claims":[]}
PASS FE-T03-c — FN-14 / 15 · 有效值变、绑定值不变
      {"effective":{"provider":"deepseek","model":"deepseek-v4-pro","baseUrl":null},"row":["DeepSeekIn forceDeepSeek · deepseek-v4-pro · Provider default endpoint · No API key savedConfigure"],"boundBefore":[{"sessionId":"55a6d6c0-c666-4af3-87f8-bf645919bed7","provider":"fake-openai-loopback","model":"fake-model"},{"sessionId":"1cf14130-ea81-4338-8b4b-01c400d12545","provider":"fake-openai-loopback","model":"fake-model"}],"boundAfter":[{"sessionId":"55a6d6c0-c666-4af3-87f8-bf645919bed7","provider":"fake-openai-loopback","model":"fake-model"},{"sessionId":"1cf14130-ea81-4338-8b4b-01c400d12545","provider":"fake-openai-loopback","model":"fake-model"}]}
PASS FE-T03-d — FN-14 · 绑定值自始至终不被改写
      {"effective":{"provider":"fake-openai-loopback","model":"fake-model","baseUrl":null},"bound":[{"sessionId":"55a6d6c0-c666-4af3-87f8-bf645919bed7","provider":"fake-openai-loopback","model":"fake-model"},{"sessionId":"1cf14130-ea81-4338-8b4b-01c400d12545","provider":"fake-openai-loopback","model":"fake-model"}]}
PASS FE-T03-e — FN-16 · 冻结时不假装排队
      {"error":"provider config is frozen during a run","errorShown":true,"effective":"fake-openai-loopback","queueWords":[]}
5 / 5
```

三层的读法：**请求值**是表单里的草稿（`drafted`），**有效值**是后端持有的 `/provider-config`，**绑定值**是既有 Run 的 `runtime.bound` 事件里的 provider / model 资源。三者经产品自己的 `window.__V5_UI__.request` 读出，不直接写 UI 状态，也不伪造后端响应。FE-T03-c 是本单最实的一条：默认模型从 `fake-model` 改到 `deepseek-v4-pro` 之后，两个既有会话的 `runtime.bound` 逐字不变。

## 7. 既有回归

| 套件 | 本单如何跑 | 结果 |
|---|---|---|
| `npm --prefix app test` | 全量（含新增六条） | **218 / 218** |
| Home / Work 几何（`composition-checks.mjs`，含 `--nav` 256 后的 SHELL-1 与 measure） | 端口 8887，脚本逐字复制自 `evidence/fe01/`，只改端口 | **16 / 16** |
| RC 契约 / 反例 / 视口（新 IA 版三支） | 端口 8890，MCP fixture 8888 | **20 / 20 · 9 / 9 · 36 / 36** |
| Settings 偏好（`settings-preferences.test.mjs`） | 断言未改（WK-107 ② 修订后偏好默认值回到修订前的集合） | 通过（在 218 内） |
| `lint-colors` / `lint-materials` / `contrast-report` / `smoke` | 全部 | ok / ok / 无低于门槛 / 通过（`realProvider: not_run`） |

WK-107 ② 修订后重跑的是：`npm --prefix app test`（218 / 218）、`lint-colors`、`lint-materials`、`smoke`、`models-checks`（8887，16 / 16）、`counterexamples`（8889 + 8887，5 / 5），证据已覆盖。**未重跑**：RC 三支与 `composition-checks`——本次修订只从 Settings › Models 的表单里删掉一行 input，不触及 Runtime Control 的 DOM，也不触及 Home / Work 的几何或 `--nav`；上一轮的结果仍然成立，`contrast-report` 同理（配色与层级未动）。

RC 视口脚本改了一处**量法**（不是断言）：视觉隐藏的 radio（1 px）本身不是命中区，命中区是包着它的 `.segment`——与脚本里既有的 `.runtime-switch` 归属同理。Models 组的三条路径是这支脚本第一次量到 segmented control。改动与理由写在 `evidence/fe02/rc/runtime-ui-viewport.mjs` 的注释里。改法之外，它确实抓到一个真缺陷：窄屏下 segment 高 39 px，已在 `styles.css` 补到 44。

## 8. 端口、数据目录与 fixture

| 用途 | 端口 | 数据目录 | fixture |
|---|---|---|---|
| Models 五轮收敛 + Home / Work 几何 + FE-T03-e | 8887 | `/private/tmp/se-agent-fe02-data/main` | `evidence/fe02/seed.mjs`，`stage=rows`（含一个等人回答的 Run） |
| FE-T03-a…d | 8889 | `…/t03` | 同脚本，`WK13_STAGE=failed`（有已完成与失败的 Run，没有等待中的 Run，因而配置未冻结） |
| RC 三支 | 8890 | `…/rc` | `evidence/fe02/rc/seed-fixture.mjs`；MCP 线路 fixture **8888** |

三个数据目录都是本单自建的空目录。8850–8861、8810、8817、8818 未使用。结束后本单启动的三个 server、MCP fixture 与全部 headless Chrome 已停止。

## 9. allowlist / 后端请求

- **allowlist：无请求。** 本单未新增 `app/web/*.mjs` 模块——Connections、三条路径、流程与 MCP 接入说明全部落在既有的 `settings-view.mjs` / `index.html` 内，`app/server/index.mjs:22` 的静态白名单不需要改。
- **后端请求：BE-17 / BE-18 保持登记，UI 留位。** 二者仍是本组的前置：`Test connection`（BE-18）与对未保存表单的 `Fetch models`（BE-17）在流程里各占一行 `Not available yet: …`，没有对应按钮。交付后前端只需把这两行换成控件，路径与文案已就位。
- **新登记建议（本单无权改 [backend-requests](backend-requests.md)，列此待 Fable 收录）**：
  - **BE-21 连接注册表**：后端今天只持有**一条**生效连接，且 `credentialStatus` 只对当前 provider 有值，`ALLOWED_PROVIDER_IDS` 是三个内置身份的闭集。真正的多条 Connections（每条有自己的 provider、端点、凭据状态与 display name）需要一个注册表端点；在那之前列表只画后端真有的那一条（§11 ①）。
  - **BE-22 MCP server 注册**：`/mcp/:id/lifecycle` 只能对**已声明**的 server 动作，没有任何端点能新增一条；Add / Configure 两步因此没有落点（§4.2）。

## 10. 未检项（分列，一律 not_run）

| 项 | 状态 | 说明 |
|---|---|---|
| 触控（真实触屏） | `not_run` | 390 下命中区由 RC 视口逐组量过尺寸（含本单补到 44 的 segment），但没有真实触屏交互 |
| 读屏（VoiceOver / NVDA） | `not_run` | 三条路径的 radio group、`In force` 徽章与流程列表的读法未在读屏下听过 |
| 真实 IME | `not_run` | 本单已无自由文本输入，not_run 的理由消失，保留 not_run |
| 200 % 浏览器缩放 | `not_run` | 只测 1440 / 390 两个 viewport |
| 真实 provider | `not_run` | 全程 `fake-openai-loopback` 与 `deepseek` 的**配置**路径；从未发出一次真实模型请求，也未保存任何真实 key。FE-T03-c 保存的 DeepSeek 连接没有凭据，随后已改回本地 |
| Test connection / Fetch models 的真实行为 | `not_run` | BE-17 / BE-18 未交付，本单不实现也不模拟 |
| 视觉四轴 | 留用户 | 不自评 |

## 11. 待裁定

1. **Connections 只有一行，是后端的事实还是产品的结论。** `ALLOWED_PROVIDER_IDS` 是三个内置身份的闭集，`/provider-config` 只持有一条连接，`credentialStatus` 也只对当前 provider 有值。本单选最保守的实现：**列表只画后端真有的那一条**，其余目录身份作为 Add provider 里的选项出现，而不是画成三行"未连接的连接"——后者会让界面替后端宣布一个它没有的注册表。若裁定要在列表里就看见全部候选身份，需要先有 BE-21（§9）。
2. **display name（已结）。** WK-107 裁定：**移除**，待 BE-21 交付后作为连接的字段出现，而不是本设备偏好——后端目录今天没有这个字段，把它存进本设备偏好会造成第二真源（同一条连接在两台设备上叫两个名字），也新增了工单禁止的前端状态。本修订已执行：代码、单测、词表、text-sweep 与反例脚本中的 display name 全部删除，不留兼容分支。
3. **provider ID"内部生成"在闭集下无处可生成。** WK-91 说 provider ID 由内部生成、用户只设 display name。今天 ID 由后端目录给（三个），前端既不生成也不应生成；display name 一侧按 WK-107 ② 已移除。本单按后者实现，把"生成"留给 BE-21 真正支持自定义 provider 的那一天。
4. **`ui-composition-standard.md` 的侧栏宽注仍写着 250。** 本单按 WK-105 ⑤ 把 `--nav` 改成 256，但那份文档不在本单写权内（工单列的是 copy-convention / text-sweep / delivery / evidence）。请 Fable 或下一单把 §尺寸 token 表的"250（区间 256–280 的下沿，见下注）"与其后的注一并改掉，否则文档与代码互相矛盾。
5. **`Compatible endpoint` 复用目录身份，不是一个新 provider。** 后端要求非目录 API format 必须配显式 `baseUrl`（DeepSeek）而 fixture provider 不许有 `baseUrl`，所以"兼容端点"在今天只能表现为**给一个目录身份换端点**。界面按这个事实写（路径帮助句里说明"provider 身份决定适用哪份模型目录"）。若产品要的是真正独立的第三方兼容 provider，同样落在 BE-21。
6. **后端错误原文直出。** 冻结时界面显示的是 `provider config is frozen during a run`——后端原话，小写、工程口吻。本单未改写它（改写会让前端替后端解释失败原因，且它同时是 FE-T03-e 的证据）。若要按 copy-convention 抻平，属一次独立的错误文案裁定，涉及所有 4xx / 409 的展示。

## 12. 哪一像素改变了哪一判断

- **表单上方多出一行 44 px 的连接行，`In force` 三个字取代了"读表单猜状态"。** 之前这一屏的第一件事是一排下拉框：要知道"现在往哪里发请求"，得先把 provider / model 两个选中值读出来，再去下面的凭据块看有没有 key——三处凑一个事实。现在第一件事是一行陈述句，四个事实一次读完；表单退到它下面，成了"改它"的地方而不是"读它"的地方。
- **`Add provider` 默认收起。** 展开态的三条路径与五步流程加起来约 300 px。收起之后，Models 组的第一屏是"现在是什么"，不是"你可以加什么"——**这一页是给已经配好的人看的**，加连接是少数时刻的事。
- **两个"没有的按钮"变成两行灰字。** 如果画成禁用按钮，人会去试、会去找为什么灰；一行 `Not available yet: the host has no handshake that runs without starting a chat.` 把同一件事说完了，还顺带说了缺的是什么。判断从"我是不是哪里没配对"变成"这一步产品还没有"。
- **一列控件从 35 / 36 / 37 / 39 四种高度收成 32 一种，radius 从两种收成一种。** 差 3–4 px 时它们读起来像两档控件，眼睛会去找分组的理由；同高之后这一列是一档，分组只由行与行之间的间距承担。
- **窄屏下三条路径的命中区从 39 px 抬到 44 px。** 5 px 的差别在桌面上看不出来，在手上是"点得中"和"点第二次"的差别。这一条是 RC 视口脚本量出来的，不是看出来的。
- **`Connection options` 换成 `Advanced`。** 前者读起来像"这里还有几个连接相关的选项"，人会去看；后者读起来像"这里的东西你多半不需要"。同一个 disclosure，打开率的判断反过来了——而里面装的确实是少数人才改的两项。
- **Model 行的说明从"用于此工作区的每次新 run"变成"用于你接下来开的每个 chat；已经开着的 chat 保持它绑定的模型"。** 前者不回答"我改了默认，正在跑的那个会怎样"；后者把 `runtime.bound` 这件架构事实翻译成一句用户世界的话，而 FE-T03-c 正是它的证据。
- **Tools 组多了六行、少了零个控件。** 那六行没有让 MCP 多出任何能力；它让"为什么这里只能 Connect / Disconnect，不能 Add"有了答案——判断从"这个页面做得不全"变成"这一步在后端还没有"。
