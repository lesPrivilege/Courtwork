# runtime-ui-gaps · 前端画不出来的能力与契约缺口（WO-RC，Opus，2026-09-08）

分支 `claude/rc-runtime-ui`，基线 `9ef1710`。本页记录两类事实：**A. 契约描述、后端没有适配器、因此产品内不画控件的能力**（WK-27：只在 Settings 底部一段折叠的 Planned 文字里出现，静态样张见 [`../../../../evidence/rc/planned-fixture.html`](../../../../evidence/rc/planned-fixture.html)，不从产品链接过去）；**B. 施工中发现的契约与快照缺口**，前端只能绕过或如实说明，需要架构裁定。

真实 provider 一列全部 `not_run`；本机 `capabilities.mode = local-fake`。

## A · 无后端能力，只有文字，没有控件

下表每一行都是我在设计里画过、又按 DC-11 / WK-27 撤掉控件的能力。"需要的 API"是把控件放回来所需的最小服务端契约。

| # | 能力 | 我画过的控件与语义 | 需要的 API | 作用域 |
|---|---|---|---|---|
| G-1 | MCP OAuth | MCP 服务器行下一个 `Authenticate` 文字按钮 + `needs authentication` 状态词；授权后状态词转 `connected` | `POST /mcp/:id/authorize` 起授权、回调登记、以及 `RuntimeResource.authentication` 允许 `oauth` 取值与 `health: 'degraded'` 表达"待授权" | 用户级凭证，与 provider key 同口径（只在 web UI 输入） |
| G-2 | MCP stdio 传输 | 导入表单里 transport 的第二个选项（命令 + 参数 + 工作目录），以及行内 `Restart` 之外的 `Stop process` | `McpSource.transport` 增加 `'stdio'`，服务端进程生命周期与 `running` 的进程语义；`architecture.md` 现在明确 rejected | workspace / user |
| G-3 | 第三方插件隔离 | 插件行的 `Install from file…` 与 `Trust` / `Untrust` 两态，`isolation` 从 `in-process` 变 `sandboxed` | 插件安装、签名校验与沙箱执行的整套服务；当前 `plugin.trust` 恒为 `host-trusted`、`isolation` 恒为 `in-process` | user |
| G-4 | memory_provider 适配器 | 一个 Memory 分组，行内 provider 选择卡 + `characters` 用量 | `kinds` 里 `memory_provider.support` 变 `available`，加持久化/检索 provider 的配置与状态 | workspace |
| G-5 | workflow 适配器 | Workflow 分组，行内 `Run` 与上次运行摘要 | 同上，加 workflow runner 与运行记录 | workspace |
| G-6 | hook 适配器 | Hook 分组，事件 → 动作的绑定行与启用开关 | 同上，加可执行 hook 点；`architecture.md` 明确"No imported JavaScript, hooks or renderer executes" | user / workspace |
| G-7 | registry 适配器 | 一个搜索框 + `Install` 行 | 同上，加包解析与签名 | user |
| G-8 | token 用量 | 上下文条旁一行 `≈ N tokens` 与占比 | `getContext` 的 `tokenUsage` 在 `effective-next-run` 模式下永远是 `null`（`service.mjs:305`）；需要 host 报告估算才可能出现 | session |

产品内落点只有一处：Settings 底部折叠的 **Planned** 段，八行"名称 + 一句说明 + Backend pending"，零个可交互后代（`evidence/rc/runtime-ui-checks.json` 的 `planned-inert` 一行）。

## B · 契约与快照缺口（需要架构裁定）

| # | 事实 | 前端当前的处理 | 建议 |
|---|---|---|---|
| B-1 | **MCP 远端工具的 `provenance[]` 不记录服务器闸门。** `tool:mcp_*` 的 provenance 只有一条 `{scope: user, value: true, reason: 'source default'}`，而权威 `exposed` 是 `false`——因为它的服务器 `local:docs-mcp` 未曝光。照 provenance 推导会得出与 `exposed` 相反的值 | 开关一律读权威 `exposed`，从不自己推导；当 `provenance` 末条与 `exposed` 不一致时，行内多一句指名真正决定它的事实（"Its server "Docs server" is not exposed, so this remote tool is not exposed either."） | 在 `provenance` 里补一条 `{scope: 服务器作用域, value: false, reason: 'server not exposed'}`，让链条自解释；否则每个消费者都要自己拼这条因果 |
| B-2 | **`catalog-only` 的 `characters` 是"已经进入上下文的目录行"，不是待载入的正文。** `compileControlContext`（`app/runtime/control-plane.mjs:217`）把 exposed 的 skill / reference 的 `id (kind): description` 写进系统上下文；`local:citation` 的 `characters: 68` 正好是那句 description 的长度，`local:brief` 的 `17` 正好是 title 的长度 | 按 intake §6 的裁定执行：`catalog-only` 一律破折号、不计入比例条 | **这条裁定会让比例条少算实际进入的字符**。本机 fixture 下：条内 60，破折号里被排除的目录行另有 85。要么改裁定（catalog-only 计入、正文另算），要么由后端把"目录行字符"和"正文字符"拆成两个字段 |
| B-3 | **比例条在本后端只可能有一段。** 只有 `admission: 'instructions'` 真正进入 prompt，而 instruction 只有一种 kind，所以"按 kind 分桶的比例条"（BoardUI 模式）恒为单段 | 仍然画条（单段），字符行照常逐桶列出 | 与 B-2 同源。若 B-2 改判，条会立刻有 instruction / skill / reference 三段，模式才成立 |
| B-4 | **`prompt_template` 出现在 `/runtime-context` 的 `context[]` 里，但它不进入任何上下文。** `admission: 'user-invoked'`，`compileControlContext` 不包含它（`control-plane.test.mjs:79` 就断言了这一点） | 与 `catalog-only` 一样列为破折号，标注 `user-invoked` | 或者从 `context[]` 里移除它——它不是"上下文项"，是一个人工调用入口 |
| B-5 | **没有列出 Run 的接口。** `/sessions/:id` 返回 `runs`，但没有 `GET /sessions/:id/runs` | 反例脚本改用 `/sessions/:id` | 不影响产品；只影响验收脚本的写法，记录在此免得下一位再撞 |
| B-6 | **新的 web 模块必须进 `app/server/index.mjs` 的 STATIC allowlist。** 这是 IC-2 规定的正规流程，但它在 `app/server/**` 里，而 WO-RC 的写权是 `app/web/**` | 只加了一个文件名（`"runtime-view.mjs"`），无任何服务端行为改动 | 若要让 `app/web/**` 真正自足，allowlist 应该改成读一份 `app/web/manifest.json`，或者由目录扫描 + 后缀白名单产生 |
| B-7 | **产品没有暗色主题。** `styles.css` 第 2 行是固定的 `color-scheme: light`，全文件没有 `prefers-color-scheme` 的颜色分支 | runtime 模块只用既有 role token，因此在模拟暗色下与亮色渲染一致（截图 `*-dark.png` 为证），没有半套暗色泄漏 | 暗色是整个产品的一次裁定，不是 runtime 面的；本单不新增颜色，故不引入 |
| B-8 | **`agent_profile` 的选择动作没有前端入口。** 契约有 `operation: 'profile'`，但 RC-1 的三处 Settings 扩展和 runtime 模块的写权都只到 exposure；选择 profile 会改变整套可用能力 | 只读呈现：选中的 profile、状态、`uiSlots`（标"declared, not executed"）、`missing`；`configurable: false` 的 profile 行不给开关，分组顶部一句说明"选择 ≠ 曝光" | 需要架构决定 profile 选择放在哪一面（Settings 的选择卡？runtime 模块的一个分组？），以及切换时对进行中 session 的说明 |
| B-9 | **`policy` 编辑没有前端入口。** 契约有 `operation: 'policy'`，规则列表整体替换 | 只读：权限解释的 trace 里能看到某条 workspace 规则命中，但看不到、也改不了规则列表本身 | 规则编辑是一个独立表面（一张规则表 + 整体替换语义 + "更窄不能放宽"的校验），不适合塞进资源行，建议单独下单 |
| B-10 | **`unknown` 远端效果没有前端可复现的入口。** 只有真实 MCP 调用在 Run 中失联才会产生；配置面的 409 只有 `active_run` 与 `runtime_conflict` | 代码里有 `mcp_effect_unknown` 分支与"Reconcile before sending another command."横幅，但本轮**未在浏览器中触发过**，见"未验证" | 若要验收这一条，需要一个能在配置面触发 unknown 的路径，或者接受它只在 Run 表面出现（那它就不属于 runtime 模块的义务） |
| BE-12 | **provider 不暴露推理强度（reasoning effort）。** `GET /provider-config` 只返回 `{provider, model, api}`；`GET /provider-models` 的每个模型只有布尔 `reasoning`（`service.mjs:253`），没有当前强度值，也没有可选强度集合 | 按 WK-73 不画：composer 的模型 chip 只写 `<model>`，不写 `<model> · <effort>`；连接 popover 里也没有 effort 项 | `providerConfig` 增加 `effort`（值域随 provider），`provider-models` 每个模型增加 `efforts: string[]`；两者齐备时 chip 与 popover 各加一处，无需改版式 |
| BE-13 | **MCP `disconnect` 不回翻状态词。** 把 fixture 的 MCP server 指向本机后，经产品控件 connect 生效（状态词转 `configured connected`），随后的 disconnect 与再次 connect 都读回同一个 `configured`；`remote-tools` 始终为 0 行（WK-74 (3) 登记，本轮 r2 复现） | 不冒充通过：`evidence/rc/runtime-ui-checks.json` 的 `remote-tools` 与反例的 `mcp-lifecycle` 记为 not_run / 待复核，前端未改 `runtime-view.mjs` 的渲染与请求 | 由 MCP 线路一侧复核：`mcpLifecycle` 的 `disconnect` 之后 `inspect` 是否真的反映断开 |

## D · WO-WK11 复核（2026-09-09，Opus）

Workbench 建成后，逐行复核 A / B 两表。判定三档：**已覆盖**（Workbench 画出来了）/ **仍是缺口**（依然只有文字）/ **后端阻塞**（等某条 BE-n）。分支 `claude/wk11-workbench`，基线 `14ebd61`，端口 8883，fake provider。

| 行 | 判定 | 依据 |
|---|---|---|
| G-1 MCP OAuth | 仍是缺口 · 后端阻塞（BE-11 之外另立） | `authentication` 仍恒为 `unauthenticated-only`。Workbench 的 Inventory 把它作为该服务器的 trust 事实读出来（"unauthenticated-only · streamable-http 2026-07-28"），比原先只在 Planned 里出现更靠近事实，但仍无授权控件 |
| G-2 MCP stdio | 仍是缺口 | `transport` 仍恒为 `streamable-http`；Inventory 同上，只陈述不画控件 |
| G-3 第三方插件隔离 | 仍是缺口 | `trust` 恒 `host-trusted`、`isolation` 恒 `in-process`。Inventory 逐行读出这两个字段，Attention 在 `trust !== 'host-trusted'` 时会报警；本机没有这样的包，所以那条从未触发过（未验） |
| G-4 memory_provider | 仍是缺口 · BE-11 | Planned 行现在落在 Instructions & context 组内，并写明 BE-11 |
| G-5 workflow | 仍是缺口 · BE-11 | Planned 行落在 Capabilities & connections 组内 |
| G-6 hook | 仍是缺口 · BE-11 | 同上 |
| G-7 registry | 仍是缺口 · BE-11 | 同上 |
| G-8 token 用量 | 仍是缺口 | `tokenUsage` 仍恒 `null`。Workbench 一处不画 token，并在 Permissions & environment 明写「未报告上限，所以不画占比 / 配额 / 剩余」 |
| B-1 provenance 不含服务器闸门 | **已覆盖（前端侧）** · 后端仍待 BE-4 | 行内那句因果句照旧（"Its server … is not exposed"），并且四层里的 Requested 现在会写「recorded, and outranked by parent not exposed」，把「存下了」与「没生效」分成两件事。后端补一条 provenance 仍是更好的解 |
| B-2 catalog-only 的 characters 语义 | 仍是缺口 · BE-4 | 裁定未改：仍按 `admittedCharacters` 计入、`deferredCharacters` 另列。Effective Context Inspector 现在把两列并排列出，所以「进了多少 / 留了多少」第一次同屏可读，但字段语义仍是后端的事 |
| B-3 比例条恒单段 | **已过时** | 本机 fixture 下条已有 instruction / skill / reference 三段（`admittedCharacters` 使 catalog 文本计入）。B-3 是按旧裁定写的，现在不成立 |
| B-4 prompt_template 出现在 context[] | 仍是缺口 · BE-4 | 仍按 `user-invoked` 列破折号；Inspector 里它是一行 `draft only` + admitted 0 + deferred 80，比破折号多说了一件事，但它是否该在 `context[]` 里仍是后端裁定 |
| B-5 没有列 Run 的接口 | **已覆盖（绕过）** | Overview 的 Recorded bindings 读宿主已有的 `state.runs` 与 per-run 的 `recordedContext` 缓存，不新开端点、不新开缓存 |
| B-6 新 web 模块要进 STATIC allowlist | **本轮不触发** | Workbench 写在既有的 `runtime-view.mjs` 内，没有新增模块文件，因此没有 allowlist 请求。B-6 作为流程问题仍然成立 |
| B-7 产品没有暗色主题 | **已过时** | WK-78 之后 `styles.css` 有完整深宗；本轮四组截图在 light / dark 两宗下同条件生成，状态词与合法动作一致 |
| B-8 profile 选择没有前端入口 | **已覆盖** | Composition 组有 `operation: "profile"` 的选择控件（含 Inherit），四层读数、依赖解析、适用范围与「选 ≠ 曝光 ≠ 已验证 Expert」一句；切 profile 后历史 Run 的 Bound 不变（FE-T03） |
| B-9 policy 编辑没有前端入口 | **已覆盖** | Permissions & environment 组有整表替换的规则编辑（`operation: "policy"`）、其他层只读、以及「只能收紧」的实证：user deny + session allow → effective 仍 deny，且行内一句指名是谁没被放宽 |
| B-10 unknown 远端效果无法复现 | 仍是缺口 | 代码路径仍在（`mcp_effect_unknown` → 一条要求 reconcile 的横幅、无 Retry），本轮同样未在浏览器里触发过。要验收仍需一条能在配置面产生 unknown 的路径 |
| BE-12 推理强度 | 仍是缺口 · BE-12 | Permissions & environment 有一行只读 `Reasoning effort = Not reported`，并写明 BE-12；不画任何强度选项 |
| BE-13 MCP disconnect 不回翻 | **本轮未复现** | 用同一 loopback fixture，经产品控件 disconnect → 状态词由 `configured connected` 回到 `configured`，再 connect 又回来；RC 反例 `mcp-lifecycle` 本轮 **通过**（此前记为 not_run / 待复核）。这不等于线路侧已无问题：只说明在 8883 + 本地 fixture 这一条件下不复现 |

## C · 我没有画的、也不建议画的

- 三态开关图形（RC-2、EX-RC1 B 节：六个成熟产品无一实现）。
- unknown 效果的 Retry 按钮（RC-4；业界通行做法相反，见 EX-RC1 D-18）。
- 资源导入表单（instruction / skill / mcp_server 的 `operation: 'put'`）。契约支持，但 WO-RC 的范围是"消费面"，导入是另一套校验、错误与源文本编辑语义；本轮只做只读的源检查栏。
