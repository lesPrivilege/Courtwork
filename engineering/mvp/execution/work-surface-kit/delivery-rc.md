# WO-RC 交付 · Runtime 控制面 UI（Opus，2026-09-08）

基线 `9ef1710`（`claude/wk6-home-brand`：Home、品牌接线、CourtWork 命名、窗口控制带）。工作树 `/private/tmp/se-agent-rc`，分支 `claude/rc-runtime-ui`，端口 8850，数据目录 `/private/tmp/se-agent-rc-data`（全新目录，runtime schema 4），Node v25.9.0。

**真实 provider 一列全为 `not_run`**：本机 `/bootstrap` 返回 `capabilities.mode = "local-fake"`，本轮未配置也未调用任何真实 provider；MCP 用的是 loopback wire fixture（`evidence/rc/mcp-fixture.mjs`），不是线上服务。全部结论只覆盖 fixture 列。

## 0. 提交

| SHA | 内容 |
|---|---|
| `d6178ce` | web: add the runtime control module as a work-surface kind —— `app/web/runtime-view.mjs` 新建；`index.html` 的 Runtime tab 与 tabpanel；`app.mjs` 的 WS-09 静态 kind 映射、`activateSurface`、会话切换重置、运行结束后刷新、共用的 composer 草稿路径；`styles.css` 新样式；`app/server/index.mjs` 的 STATIC allowlist 一个文件名 |
| `48e9505` | web: give Settings the runtime entry, next-run context and Planned list —— `app/web/settings-view.mjs` |
| `37a05f3` | web: show a Run's recorded runtime binding in the Run inspector —— `app/web/inspector.mjs` |
| `de5756f` | web: corrections found in browser verification —— 浏览器验证中改正的两处（见 §4），`runtime-view.mjs` + `styles.css` |
| 本提交 | Record the WO-RC delivery, the gaps and the evidence —— 本文、`runtime-ui-gaps.md`、`evidence/rc/**`（`git log --oneline -1` 即是） |

全部用显式 `git add <路径>`，未 `-A`，未 push。工单要求四个提交；实际五个：浏览器验证改出的两处代码修正单独成一提交，比塞进文档提交或改写已有提交更可审。`index.html` 与 `app.mjs` 里三处扩展的接线一并落在第一个提交（它们是同一批 DOM 与状态改动，拆开会留下不可运行的中间状态）。

`git diff --check` 通过，无输出。

## 1. 文件

| 文件 | 改动 | sha256 前 16 |
|---|---|---|
| `app/web/runtime-view.mjs` | 新建。runtime 内容模块 + `renderContextBar` + `renderRecordedContext` | 见 `evidence/rc/manifest.json` |
| `app/web/app.mjs` | WS-09 kind 映射加 `runtime`；`activateSurface` 标题与加载；会话切换清 `recordedContext` 并 `pause()`；运行结束刷新；`applyComposerDraft` 抽出，编辑消息与模板草稿共用同一条路；Settings 的 `onOpenRuntime`；`readRecordedContext` | 同上 |
| `app/web/index.html` | Runtime tab + `runtime-content` tabpanel；Settings 的 `runtime-control-settings` 段与 `planned-capabilities` 折叠段 | 同上 |
| `app/web/styles.css` | runtime 模块、上下文条、Planned 列表的样式，只用既有 role token，未新增颜色/圆角/阴影值 | 同上 |
| `app/web/settings-view.mjs` | 三处扩展：打开 runtime 模块、下一次运行的上下文、Planned 段 | 同上 |
| `app/web/inspector.mjs` | `renderRun` 多接一个 `runtimeContext`，在既有检查栏里渲染 recorded binding | 同上 |
| `app/server/index.mjs` | **一个文件名**进 STATIC allowlist（`"runtime-view.mjs"`），无任何服务端行为改动 | 同上 |

`app/server/**` 本不在写权内。IC-2 规定"新增 SVG/JS 文件逐项进入 STATIC allowlist"，而那份 allowlist 的实现位置在 `app/server/index.mjs`；不加这一行，模块根本不会被服务，整单作废。改动只是数组里多一个字符串。此事记为 gap B-6，建议把 allowlist 改成读一份 `app/web` 的清单，让 `app/web/**` 真正自足。

`brand/**`、`app/runtime/**`、`home-view.mjs` 未动。DOM id、ARIA 关系、tab/dialog 角色、关闭与返回次序、Run/File 身份、草稿与 renderer owner 均未改：新增的是 `surface-runtime-tab` / `runtime-content` 两个新 id 和一个新 kind，既有 id 与关系原样保留。

## 2. 语言裁定（未按字面满足的一条裁定）

intake §5 的界面文案是中文（"沿用 workspace 设置（点此覆盖）"、"有运行中的 Run，改动在其结束后才可提交"、"需先核对"、"模型未被授权读取"、"字符，不是 token"、"来自 workspace · 用户设定"）。当前 `app/web` 的可见文案**全部是英文**（`ui-composition-standard.md` 的文本表本身就是英文出口：New session / Send / Answer / Allow this write / Waiting for you），CJK 只出现在 `app.mjs:272-273` 的源码注释里。在一个纯英文界面里插六句中文，同时违反"同一动作的可见文字、accessible name 与 tooltip 使用同一词"和成熟产品的单一语域。

因此本轮把 §5 的中文串当作**语义规格**、按下表落到产品既有英文语域；语义、位置、交互形态与裁定逐条一致。若架构要求字面中文，这是六串的一次查找替换，不动结构。

| 裁定原文 | 产品落地文案 | 位置 |
|---|---|---|
| 静态优先级说明 | Session overrides workspace, and workspace overrides user. A narrower scope cannot loosen a deny or ask that a wider one set. | 模块顶部固定一句，作用域 tab 之上 |
| 沿用 workspace 设置（点此覆盖） | 无覆盖：`Exposure: … The switch overrides it for this session.`（一句）／有覆盖：`Inherit the workspace setting` 文字按钮，PUT `exposed:null` | 每行 Exposed 列下方 |
| 来自 workspace · 用户设定 | `Exposure: from workspace · your workspace override.` / `Exposure: the source default.` | 同上 |
| 有运行中的 Run，改动在其结束后才可提交 | A run is active. Changes can be submitted after it ends. | 409 `active_run` 横幅 |
| 需先核对 | Reconcile before sending another command. | unknown 远端效果横幅 |
| 模型未被授权读取 | The model is not authorized to read this. You are reading it as the local administrator. | 源检查栏，`exposed:false` 时 |
| 字符，不是 token | characters, not tokens | Settings 上下文条与 Run 的 recorded 段 |

## 3. 验证

复现命令见 `evidence/rc/README.md`。三套断言都跑在**真实浏览器渲染的 DOM** 上，不是对模块函数的单测；`verify.mjs` 只负责给一个浏览器、模拟媒体和写文件，三个 `*-checks.mjs` 本身是可以手工粘进浏览器的页面脚本。

```
$ node evidence/rc/verify.mjs
{
  "contract": "19/19",
  "counterexamples": "9/9",
  "viewport": "36/36",
  "failures": []
}

$ npm --prefix app test   （尾部，全文见 evidence/rc/app-tests.txt）
ℹ tests 134
ℹ suites 0
ℹ pass 134
ℹ fail 0
ℹ duration_ms 35205.523084

$ git diff --check
（无输出）
```

134 与后端验收记录的 134/134 一致，未增未减。本轮新增的断言全部在 `evidence/rc/*.json` 里，共 64 条。

### 3.1 acceptance.md "New frontend contract" 逐条（fixture 列）

`evidence/rc/runtime-ui-checks.json`，19/19。

| 义务 | 断言 id | 结果（verbatim detail） |
|---|---|---|
| runtime 是与 workspace/run/file 并列的一面 | `surface` | `title=Runtime` |
| 静态优先级一句 | `precedence` | 完整句子匹配 |
| 用服务端的 scopes 与 revision | `scopes-from-server` | `tabs=user,workspace,session note=Editing the session layer · 7f1ebfc3-… Revision 33.` |
| installed / running / exposed / permitted 分列 | `four-dimensions` | `25 rows`，每行四列且标签顺序固定 |
| `running:null` = 不适用 | `running-null` | `n/a rows 19, contract nulls 19` |
| 不得从勾选态推断权限 | `no-inferred-authority` | `25 switches agree with the snapshot` |
| 工具的 permission 与 trace | `permission-trace` | `Effect \| Step 1 · host-ceiling \| Step 2 · host-default \| Source \| Owning scope \| …` |
| source 类型 / 作用域 / hash 或 URI | `source-identity` | 同上，含 `Source`、`Owning scope` |
| 不支持的 kind 有标注、无控件 | `unsupported-kinds` | `memory_provider, workflow, hook, registry · interactive=0` |
| 所选 profile 的兼容性 | `profile-compatibility` | `Selected profile agent:general · compatible. Adapter pi-coding-agent@0.85.1/agent-session.` |
| profile 的 UI slot 是声明 | `ui-slots-declarative` | `runtime.inspector, work.surface — declared, not executed` |
| 选择 profile ≠ 曝光 | `selection-not-exposure` | 分组顶部一句 `…a different act from exposing a resource…` |
| MCP 三态分开 + lifecycle 文字按钮 | `mcp-states` | `configured · connected · buttons Connect,Disconnect,Restart` |
| 远端工具缩进 + `remote` + hash | `remote-tools` | `2 of 4 indented rows are remote; contract expects 2` |
| 字符不是 token | `characters-not-tokens` | `Instruction60 characters / Sizes are measured in characters, not tokens.` |
| `tokenUsage: null` 不出现任何 token 行 | `token-usage-null` | `tokenUsage=null` |
| deferred / user-invoked 破折号且不入条 | `deferred-dash` | `Skill · deferred, Reference · deferred, Prompt template · user-invoked` |
| 条只表达构成，无百分比/余量/限额 | `bar-no-limit` | `1 segments` |
| Planned 段零可交互后代 | `planned-inert` | `interactive=0, rows=8, disclosure summary=1` |

两处口径要说清楚：

- `remote-tools` 的 4 个缩进行里只有 2 个是 MCP 远端工具，另外 2 个（`tool:se_read_source`、`tool:se_submit_candidate`）是扩展提供的本地工具，靠 `parent` 缩进在它们的插件之下，标 `builtin` 而不是 `remote`。断言比对的是"契约里有 `mcp` 字段的资源数"，不是"缩进行数"。
- `planned-inert` 断言"零可交互后代"的对象是 `#planned-capabilities` 这个 div 本身；包着它的折叠 `<details>` 有且只有一个 `<summary>`，那是"折叠"这个要求本身带来的、唯一可聚焦的元素。两个数都写进了 detail。

### 3.2 反例（fixture 列）

`evidence/rc/runtime-ui-counterexamples.json`，9/9。每一条都先用 API 造出失败条件，再点产品自己的控件；`window.fetch` 被包了一层只做记录，不改行为。

| 反例 | 断言 id | 结果（verbatim detail） |
|---|---|---|
| inherit = 删除本级覆盖 | `inherit-is-removal` | `button="Inherit the workspace setting" body={"operation":"exposure","id":"tool:ws_grep","scope":{"type":"session","id":"7f1ebfc3-…"},"exposed":null,"revision":19}`；provenance 句由 `Exposure: from session · your session override.` 变为 `Exposure: from workspace · your workspace override. The switch overrides it for this session.`，且返回的权威快照里 session 层已无覆盖 |
| MCP lifecycle 只按返回快照改状态词 | `mcp-lifecycle` | `before="configured connected" disconnected="configured" reconnected="configured connected"`，每步都与快照的 `running` 一致 |
| **409 `runtime_conflict`** 刷新 + 留草稿 + 不重发 | `conflict-draft` | `puts=1`（只有一次 PUT，没有自动重发）；横幅 `The runtime changed while you were editing. Your change was not applied and is kept here as a draft.tool:ws_read · do not expose at session.` + 两个按钮 `Submit this change,Discard the draft` |
| 草稿只在用户明确要求时提交，且用新 revision | `conflict-draft-apply` | `resent revision=21 (server was 21)` |
| **409 `active_run`** 整模块只读 | `active-run-freeze` | `switch was disabled before the attempt: false`（页面本地状态当时还是陈旧的，是 409 让它只读，不是本地猜测）；横幅逐字 `A run is active. Changes can be submitted after it ends.`；`29 controls disabled, 25 rows still open on click` |
| 冻结随快照解除 | `freeze-lifts` | `banner gone=true`，开关重新可用 |
| 模板只落草稿、不发送 | `template-draft-only` | `runs 4 -> 4`，composer 的值等于 `/runtime-resources/:id` 返回的 content |
| 源检查栏是本地管理能力 | `source-inspector` | `exposed=false hash=88089e88d674`，正文等于 API 返回的 content，并显示"模型未被授权读取"那句 |
| unknown 效果不给 Retry | `no-retry` | `40 buttons, 0 named like a retry` |

### 3.3 视口、键盘、动效

`evidence/rc/runtime-ui-viewport.json`，36/36 = 6 条 × {1440, 390} × {light, dark, light+reduced-motion}。

| 断言 | 结果 |
|---|---|
| 无横向溢出 | 1440 与 390 均 `document=0px panel=0px spills=none` |
| 触控目标 | 390 下每个启用控件 ≥ 44px（开关旁的词是真 `<label for>`，与开关合成一个目标）；1440 下全部通过 |
| 作用域 tab 用箭头 / Home / End | `right=workspace end=session home=user tabstops=1` |
| 既有 surface tab 条的箭头次序不变 | `ArrowRight from Runtime focused surface-preview-tab`（Run/File 在无对象时仍隐藏，Runtime 是最后一个可见 tab，故回卷到第一个） |
| 减弱动效下无残留动画 | `reduce=true moving=0` |
| Escape 次序不变 | `panel hidden=true`，焦点回到 `session-title` |

暗色三列与亮色逐条相同：产品在 `styles.css:2` 固定 `color-scheme: light`，全文件没有 `prefers-color-scheme` 的颜色分支。runtime 模块不新增颜色，因此在模拟暗色下随产品一起保持亮色，而不是漏出半套暗色主题。记为 gap B-7。

## 4. 浏览器验证改出的两处

两处都是"文档上看不出、渲染出来才成立"的错误，值得单列：

1. **冻结曾经用 `inert` 冻掉整个目录。** RC-4 说"只读"，第一版把 `.runtime-catalog` 设成 `inert`，结果活跃 Run 期间连权限 trace、源检查栏都点不开——那不是只读，是不可读。改为只禁用会提交改动的控件（开关、inherit、lifecycle），行的展开一律保留；反例 `active-run-freeze` 的 `25 rows still open on click` 就是这条的守卫。
2. **开关一度显示我自己推导的值。** 第一版按 provenance 链逐层重算每个作用域看到的值。MCP 远端工具的 provenance 只记它自己的默认 `true`，不记服务器闸门，于是开关显示"已曝光"而权威 `exposed` 是 `false`、permitted 是 `deny`——正是 acceptance 里"不得从勾选态推断权限"要禁止的那种画面。改为开关一律读权威 `exposed`；当 provenance 末条与 `exposed` 不一致时，行内多一句指名真正决定它的事实（`Its server "Docs server" is not exposed, so this remote tool is not exposed either.`）。缺口记为 B-1。

## 5. 未验证

| 项 | 为什么 |
|---|---|
| 真实 provider / 真实远端 MCP | 本机 `local-fake`；MCP 是 loopback wire fixture。整个 real-provider 列 `not_run` |
| unknown 远端效果的横幅 | 代码里有 `mcp_effect_unknown` 分支，但配置面的 409 只有 `active_run` 与 `runtime_conflict` 两种；unknown 只在 Run 执行中产生，本轮没有在浏览器里触发过这条横幅。gap B-10 |
| MCP 的 `error` 状态词与 `diagnostics` 呈现 | fixture 服务器一直健康，没造出 `health: 'error'` 的快照 |
| profile 选择、policy 规则编辑 | 契约有 `operation: 'profile'` / `'policy'`，本单范围只到 exposure；只做只读呈现。gap B-8 / B-9 |
| 资源导入（`operation: 'put'`） | 同上，本单是消费面；只做只读源检查栏 |
| 真实触屏、IME、VoiceOver、200% 缩放 | 只做了 CDP 的 `mobile` 模拟与几何断言，没有真实设备 |
| 暗色 | 产品无暗色主题，只验证了"不漏半套暗色" |
| 多会话并发写同一 workspace 作用域 | 只造了单页面对单会话的 CAS 冲突 |

## 6. 哪一像素改变了哪一判断

| 像素 | 改变的判断 |
|---|---|
| Exposed 列开关旁边那个词（`Exposed` / `Not exposed`），以及它下面那句 provenance | 从"这个开关是开的，所以模型能用"变成"这个值是谁定的"。开关只报权威 `exposed`；决定权在下面那句话里，不在开关的姿态 |
| `n/a` 三个字符占住 Running 列 | 从"这东西没在跑（所以坏了）"变成"这东西没有'在跑'这个维度"。19 行都是 `n/a`，才让 MCP 那行的 `Yes` 有意义 |
| 远端工具行上的 `remote` 与 12 位 hash | 从"这是本机的一个工具"变成"这是某份远端配置在这一版下暴露出来的工具"。hash 变了就是另一份配置，历史绑定不会跟着变 |
| MCP 行的 `configured · connected` 两个词，而不是一个 `Connected` 徽章 | 从"连上了就能用"变成"配置、连接、曝光是三件事"。这一行下面的开关仍然是 `Not exposed`，模型仍然拿不到 |
| 冻结横幅一句话，加上仍然可点开的每一行 | 从"面板坏了"变成"现在不能改，但你仍然可以查清楚现在是什么"。冻结来自 409——页面本地状态当时还写着 `activeRuns: 0` |
| 冲突横幅里那行 `tool:ws_read · do not expose at session.` | 从"操作失败了"变成"你那次改动具体是什么，它还在，没有被发出去"。旁边两个按钮是"提交这次改动"和"丢弃草稿"，都不是 Retry |
| 上下文行末尾 `characters` 这个词，与那句 `characters, not tokens` | 从"这是 token 预算"变成"这是字符计数"。条上没有百分比、没有余量、没有限额，因为契约里根本没有 max |
| 破折号 `—` 占住 Skill / Reference / Prompt template 三行 | 从"这些东西没有大小"变成"这些东西现在不进 prompt"。破折号是裁定要求的形状，但它同时掩盖了 B-2：其中 85 个字符其实已经以目录行的形式进了上下文 |
| 源检查栏那句"模型未被授权读取，你是以本地管理员身份在读" | 从"我能看到它，所以模型也能"变成"看源码是管理能力，模型访问是另一条路（`runtime_load`）"。这一句是两条路唯一的分界线 |
| Planned 段里八行文字旁边的 `Backend pending`，而不是八个禁用的开关 | 从"这些功能坏了/关着"变成"这些功能还不存在"。禁用的控件会让人以为打开它就能用 |
| Settings 里那行 `Open runtime resources`，而不是把目录直接摊进设置弹窗 | 从"运行时配置是一张长表单"变成"设置里是三个入口，检查在工作面里做"。Home 的主入口仍然是 composer（§7 裁定） |

## 7. 缺口

见 [`runtime-ui-gaps.md`](runtime-ui-gaps.md)：A 节八条"画过又撤掉的控件 + 需要的 API + 作用域"（静态样张 `evidence/rc/planned-fixture.html`，不从产品链接、也不在 STATIC allowlist 内，因此在产品里不可达），B 节十条契约与快照缺口需要架构裁定。最需要先裁的三条：

- **B-1**：MCP 远端工具的 `provenance[]` 不记录服务器闸门，照链条推导会得出与权威 `exposed` 相反的值。
- **B-2 / B-3**：`catalog-only` 的 `characters` 其实是"已经进入上下文的目录行"长度（`control-plane.mjs:217`），把它按 intake §6 排除出比例条，会让条少算——本机 fixture 下条内 60、被排除的目录行另有 85，且条恒为单段，"按 kind 分桶的比例条"这个模式在本后端不成立。
- **B-6**：新 web 模块必须改 `app/server/index.mjs` 的 STATIC allowlist，`app/web/**` 的写权因此不自足。
