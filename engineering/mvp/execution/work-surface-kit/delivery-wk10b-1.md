# 交付 · WO-WK10b 第一段

2026-09-08，Opus。裁定 WK-43 / 45 / 47 / 57 / 59 / 71 / 72 / 74 / 75 / 76；主规范 [frontend-layering-spec](../../../design/frontend-layering-spec.md)（FN-05 / 11 / 17 / 18 / 20 / 21 / 22 / 23 / 24 / 26 / 27 / 28）；体例 [copy-convention](../../../design/copy-convention.md)、[icon-controls](../../../design/icon-controls.md)、[ui-composition-standard](../../../design/ui-composition-standard.md)、[ux-conventions](../../../design/ux-conventions.md)。

**第二段（NDA 逐规则 Review、决定与修订、回执、续行、只读历史）不在本次交付内。**

## 1. 固定坐标

| 项 | 值 |
|---|---|
| 开工基线 | `a2c2e4cdda08a4976be6eca96b61237555633809`（Astra 合流后的清洁 main，WK-83） |
| 工作树 | `/private/tmp/se-agent-wk10b` |
| 分支 | `claude/wk10b-first`（未 push） |
| 交付 SHA | 见本页末「提交」 |
| 服务器 | `npm --prefix app start -- --data-dir /private/tmp/se-agent-wk10b-data --port 8873` |
| 数据目录 | `/private/tmp/se-agent-wk10b-data`（全新，已随交付停机） |
| provider | 宿主 loopback 假 provider（`capabilities.mode = "local-fake"`）。**真实 provider not_run**；全程未配置也未读取任何凭据文件 |

## 2. 改动的文件

| 文件 | 局部 |
|---|---|
| `app/web/ui-controls.mjs` | `icon(name, { size })`；新增 `flowRow` —— Chat Flow 的唯一行解剖 |
| `app/web/app.mjs` | 工具行 / 问题卡 / 产出行 / 已决定请求行改用同一解剖；`toolGlyph`；槽位声明的读取与解析（`runtimeControlRequest` / `slotDeclaration` / `workSurfaceSlot`）；工作面缺席三态；通用 fallback 去掉「Run action」按钮 |
| `app/web/surface-modules.mjs` | 新增 `surfaceSlots` 槽位契约、`resolveSurfaceSlot`、`slotStatusLine`；Workspace 卡的扩展分支改读宿主的槽位解析 |
| `app/web/thread-projection.mjs` | `permissionPresentation` 增 `glyph`（write / remote / action 三分） |
| `app/web/styles.css` | `.flow-row / .flow-title / .flow-meta` 与 `summary.flow-row` 的 disclosure 标记；删除 activity-group / resolved-question / resolved-permission 三处重复的 flex+32/44 规则与 `.surface-status`、`.action-item` |
| `tools/lint-colors.mjs` | **仅**把一条既有豁免的选择器名跟随 WK-57 改名（`> summary > span` → `> summary > .flow-title`）；豁免理由与条数不变。见 §7「越界与请求」 |
| `docs/interface-components.md` | 三栏读法改写为 WK-72 / 74 的悬浮工作面 + L3 覆盖；新增行解剖一节与 `surface-modules.mjs` 的槽位 owner |
| `docs/surface-assignment.md` | 同上；第 3 条「侧栏退出交互树」按 WK-74 (1) 限定为覆盖态；新增第 6 条槽位与缺席 |
| `engineering/mvp/execution/work-surface-kit/contracts/glyph-semantics.md` | **新建**（WK-71） |
| `engineering/mvp/execution/work-surface-kit/evidence/wk10b-1/**` | **新建**：脚本、断言结果、同条件前后截图 |

未改：`app/server/**`、`app/runtime/**`、`app/core/**`、`app/extensions/**`、`brand/**`、`PAPER.md`、HTTP 契约、`app/web/home-view.mjs`（WK13）、`app/web/runtime-view.mjs`（WK11）、`docs/ui-composition.md`（WK13）。无新增 npm 依赖。

## 3. 做了什么

### 3.1 glyph 语义表（item 1，WK-71）

[contracts/glyph-semantics.md](contracts/glyph-semantics.md)：以 [text-sweep](text-sweep.md) 为清单，逐条记录语义 · 出现面 · 频率 · IC-1 裁取 · 已准入 Lucide glyph · accessible name · tooltip，另列「保留文字、不给 glyph」的语义与理由，以及 sprite 现状与缺口。**新增 glyph 数 = 0**：本轮全部取自已 vendoring 的 24 枚（Lucide 1.41.0，`bca7e75`）。`arrow-down` 与 `external-link` 已 vendoring 但产品未消费，登记为缺口，不为用掉它们而造入口。

### 3.2 Chat Flow 行的减法（item 2 的 Chat Flow 部分，WK-57 / 47）

一个解剖，四种行共用：**类型 glyph 16 + 标题（对象名）+ 至多一个元数据词 + 至多一个主动作**（disclosure 行的主动作就是它自己）。glyph 全部 `aria-hidden`；元数据词灰字，只有失败行给状态词着色。消融表见 §4。

Home 下带、分页与三集合按 2026-09-08 的派单移入 WK13，本单未写 `home-view.mjs`。

### 3.3 热插拔槽位（item 4，WK-43 / 45，FN-20 / 21 / 24）

`surface-modules.mjs` 新增宿主自己的槽位表：

```
{ id: "work.surface", title, module: "preview",
  input: "ReviewProjection", inputVersion: 1,
  intents: ["open", "refresh"],
  commands: "projection.humanActions",   // 不是开放命令通道
  fallback: "read-only-row" }
```

宿主保留布局、次序、tab、Escape、生命周期；`resolveSurfaceSlot` 从**两个后端事实**解析：控制面快照里被选中的 profile 的 `uiSlots`（声明），与 `GET /sessions/:id/surface` 带回的扩展注册记录（producer 与它的 renderer）。挂载条件＝ `status === "loaded"` ∧ 记录里有 `surface.module` ∧ 该路径在本地 `/extensions/` allowlist 内。收敛卡与展开面读同一个解析结果，两者不可能对「有没有挂上」给出不同答案。

**声明不是注册**：profile 的 `uiSlots` 只是保存下来的声明式配置（FN-12），单独存在时不挂载任何东西；`incompatible` 的 composition 仍然声明它的槽位，但不计入「已声明」，缺失依赖由拥有该快照的 Runtime 模块原样说明。没有 renderer 的已声明槽位渲染只读文本行（`<title> · renderer not loaded`），**不是按钮、不发请求、不执行任何东西**。

生命周期沿既有的显式 mount / update / dispose 与三层守卫（`requestId` 代次、`sessionEpoch` 请求纪元、`fetchRequestId` 读取纪元，加扩展 identity 的 `generation` 比较）；本轮把挂载判据统一到槽位解析上，没有新增第二套状态机、第二次 fetch 或第二个真源。控制面快照仍由 Runtime 模块单独读取，宿主只是读自己注入给它的 client 的那一次响应（FN-07）。

### 3.4 producer / renderer 缺席的区分（item 5）

| 后端事实 | 界面 |
|---|---|
| 已绑定，正在读 | `Loading work surface` + 读的是谁 |
| 已绑定，读过了，注册表无此记录 | `Extension not installed` + 「此宿主没有它的记录，无法在此读取其工作状态」 |
| 已绑定，尚未读过 | `Work surface not read yet` |
| 记录在、`status !== loaded` | 只读状态行：扩展名 · 状态词；下一行 `generation N · state <12 位> [· read only]`；再一行 `<title> · <status>` |
| 记录在、已加载、`surface: null` | 同上，第三行为 `<title> · renderer not loaded` |
| `projection` 为 null | 「No read-only projection is available yet.」——**只说读不到**，不填 Decision / Evidence / 已接受成果 |
| 无绑定、`projection` 为 null | 纯 Chat：Workspace 模块的文件树与它自己的空态（`No files yet. …`） |

只读卡上的每一个字段名与值都来自服务端返回的 projection 本身（断言 `slot · every field on the read-only card is a field the server returned`）。

### 3.5 item 6

Home 框外状态行、64–160 composer、桌面居中与留白、L0–L3 四层均未改动；本轮不重新裁定。`git diff` 中与 composer / Home 相关的样式改动为 0。

## 4. 消融表（WK-47）

判据取 WK-47 (1)：**去掉后「该做什么 / 发生了什么 / 依据在哪」是否仍成立；成立即删。** 判断在它所在的那一态里做。

### C. Chat Flow 行

| # | 元素 | 去除后失去的判断 | 结果 |
|---|---|---|---|
| C-1 | 工具行的 ` · working` / ` · failed` / ` · interrupted` / ` · waiting for you` 后缀 | 不失去事实，失去的是**形态**：状态被拼进对象名，读起来像工具名的一部分，且不是词表里的词 | **改**（不是删）：状态成为独立的灰字元数据词 `Working` / `Failed` / `Interrupted` / `Waiting for you`（copy-convention §2 状态行） |
| C-2 | 已完成工具行的状态词 | 无。组头已写 `Completed`，每行再写一遍答不出新问题 | **删**（完成态不写状态词，与改前一致） |
| C-3 | `.tool-card.has-error` 的整卡红 | 无。失败由状态词 `Failed` 承担，错误原文就在行内的 `Result` 段；颜色从来不是唯一载体（FN-28），而对象名不是状态（copy-convention §2） | **删**（整卡红），**保留**（状态词红） |
| C-4 | 问题卡的 `Answer requested` 抬头 | 无。下面就是 `Answer` 按钮；抬头既不是对象名也不是状态，属"解释界面自身"（copy-convention §1） | **删** |
| C-5 | 未决问题卡的状态词 `Waiting for you` | 无。未答的输入框 + `Answer` 就是状态，同一段落里紧接着的 Run 状态行已由 Host 写出 `Waiting for you`；一屏之内出现三次 | **删**（仅未决卡；已答 / 已关闭的折叠行保留 `Answered` / `Closed`，那里它是唯一载体） |
| C-6 | 问题卡里与抬头并列的独立 `question-prompt` 段 | 无。问题原文改任标题，位置与语义都更准（对象名） | **删**（合并进标题） |
| C-7 | 折叠问题行的 `Answered · <prompt>` 单串 | 不失去事实，失去的是可读性：中点把状态粘进问题原文，窄屏时省略号先吃掉问题 | **改**：标题＝问题原文，元数据＝`Answered` / `Closed` |
| C-8 | 已决定授权行的 `Write allowed · out/x.md` 单串 | 同上 | **改**：标题＝写入目标 / 远程 server / 工具标识，元数据＝`Write allowed` 等 |
| C-9 | 已决定授权行统一的 `file-text` glyph | 判断「这是文件写入还是远程调用」。同一个文件图标区分不了两种工作目的（IC-1） | **改**：write→`square-pen`、remote→`plug`、其它→`activity` |
| C-10 | 产出行的 `.file-name` / `.form-help` 两个专用类 | 无。它们表达的正是「标题」与「元数据」 | **删**（并入解剖类名，`.artifact-thread-row` 与其点击行为不变，`run-chain.mjs` 仍能选中） |
| C-11 | `<summary>` 的原生 disclosure 三角 | **失去**「这一行可以展开」。把 summary 变成 flex 会连带丢掉原生标记 | **补**（唯一一处新增）：`summary.flow-row::after` 的旋转 `›`，与 Activity 组原本自带的标记同一实现，收进解剖内一处 |
| C-12 | `.activity-group > summary`、`.resolved-question > summary`、`.resolved-permission > summary` 各自的 flex / gap / cursor / 16 glyph / 32-44 规则 | 无。三处是同一件事的三份写法 | **删**（并入 `.flow-row` 与 `summary.flow-row` 一处） |
| C-13 | 未决授权卡的整卡结构 | **失去**授权范围、确切字节、hash、来源。本单明令不并入 Review（FN-18） | **保留原样**，本轮只给已决定的折叠行换解剖 |
| C-14 | run 状态行、notice 行、assistant 消息 | 不在本单的三类行内；把 `Run` 做成可见标题是**加法**不是减法 | **不动** |

### S. 工作面 / 槽位

| # | 元素 | 去除后失去的判断 | 结果 |
|---|---|---|---|
| S-1 | 通用 fallback 的 `Run action` 按钮 | 无可用判断，反而制造一个假的：一个没有对象、没有范围、没有 payload 的执行按钮，正是 FN-18 禁止的无范围批准与 FN-21 禁止的万能 dispatch；它出现的场合恰恰是 renderer 缺席、即最不该可执行的场合 | **删**（动作改为只读文本；`dispatchSurfaceAction` 保留，只供已挂载的 renderer 经 `dispatch` 使用） |
| S-2 | `Available actions` 标题 | 「这些是已声明的还是可执行的」 | **改**为 `Declared actions`（沿 runtime-view 已有的 `declared, not executed` 说法） |
| S-3 | 扩展状态 pill + `generation N` badge 的独立一行 | 无。同样两个事实进入行解剖的元数据位与其下一条事实行 | **删**（`.surface-status` 与其样式一并删） |
| S-4 | `compatibility` 恒显示 | `supported` 时无判断可加 | **删**（只在非 `supported` 时显示，且拼成词：`read only`） |
| S-5 | `Preview not loaded yet` 一句吃掉三种情形 | **失去**「还在读 / 读过了但宿主没有这个扩展 / 这个会话还没读过」的区别；只有第一种会自己变化（FN-28） | **拆**为三行 |
| S-6 | Workspace 悬浮卡的 `<title> renders this workspace.` | 在 renderer 缺席时它是**错的**：那个扩展此刻并没有在渲染 | **改**为宿主的槽位状态行；仅在槽位可挂载时保留原句 |
| S-7 | 「无绑定但 profile 声明了 `work.surface`」时的槽位行 | 无判断，且 `agent:general` 默认就声明两个槽位，这一行会常驻每个普通会话 | **不画**（声明不是缺口；有绑定才有可读的槽位状态） |
| S-9 | producer 未加载 / 已失效时的 `<title> · <status>` 行 | 无。上一行的状态行已写出扩展名与状态词，这一行只是同一事实的第二份拷贝 | **条件删**（只在 renderer 缺席时保留，那时它是唯一说出「渲染代码不在」的地方；悬浮卡上仍保留，卡头没有扩展名） |
| S-8 | 只读 projection 的 key/value 全量列表 | 「依据在哪」。它是已取得的 payload 的原样呈现，boundaries §4 明确允许 | **保留原样**（断言其每个 key 都来自服务端响应） |

## 5. `text-sweep.md` 增量

### 删

| # | 字符串 | 位置 | 去掉后失去的判断 | 结果 |
|---|---|---|---|---|
| D-8 | `Answer requested` | 问题卡抬头 | 无（消融 C-4） | ✅ 删 |
| D-9 | 未决问题卡的 `Waiting for you` | 问题卡元数据位 | 无（消融 C-5） | ✅ 删 |
| D-10 | `Run action` | 通用工作面 fallback | 无，且是假能力（消融 S-1） | ✅ 删 |
| D-11 | `Loading preview` / `Preview not loaded yet` / `This session is bound to X; the preview has not returned its current projection.` | 工作面缺席态 | 三种情形被合成一句（消融 S-5） | ✅ 删，改写为下表三组 |
| D-12 | `${title} renders this workspace.`（renderer 缺席时） | Workspace 悬浮卡 | 该句在缺席时不成立 | ✅ 条件删（可挂载时保留） |
| D-13 | `Available actions` | 工作面 fallback | 「声明的」与「可执行的」不分 | ✅ 删，改 `Declared actions` |

### 单词化

| # | 原可见文字 | 新可见文字 | accessible name | 位置 | 结果 |
|---|---|---|---|---|---|
| W-11 | `ws_read · failed` | `ws_read` ＋ `Failed` | 行文字即名 | 工具行 | ✅ 状态离开标题，成为词 |
| W-12 | `1 tool action · completed` | `1 tool action` ＋ `Completed` | 同 | Activity 组头 | ✅ |
| W-13 | `Answered · <prompt>` | `<prompt>` ＋ `Answered` | 同 | 已答问题折叠行 | ✅ |
| W-14 | `Question closed · <prompt>` | `<prompt>` ＋ `Closed` | 同 | 已关闭问题折叠行 | ✅ |
| W-15 | `Write allowed · out/x.md` | `out/x.md` ＋ `Write allowed` | 同 | 已决定授权折叠行 | ✅ |
| W-16 | `request closed` | `closed` | 同 | 同上 | ✅（`Write closed` / `Action closed`） |

### 保留并注明承重（本轮新增字符串）

| 字符串 | 承担 |
|---|---|
| `Completed` / `Failed` / `Working` / `Stopping` / `Interrupted` / `Waiting for you` | **状态事实**，来自 Host 的 run 状态与 tool phase，前端不推断（ux-conventions 运行状态行） |
| `N failed` | **计数事实**：一组里有几个失败，决定要不要展开 |
| `Answered` / `Closed` | **状态**：该请求是被回答还是被关闭，后果不同 |
| `Write allowed` / `Write denied` / `Write closed` / `Action allowed` / `Action denied` / `Action closed` | **范围 + 决定**：哪一类调用、被怎样处置。`Write` 与 `Action` 的分野沿 copy-convention Astra 补充 |
| `Recorded version` | **读取类别**，不是审批状态（IC-1） |
| `<title> · renderer not loaded` | **条件 + 后果**：声明在、producer 在、渲染代码不在，所以只读 |
| `<extensionId> · not installed` | **条件**：此宿主没有这个记录 |
| `<title> · <status>`（`unloaded` / `invalidated`） | **状态**：producer 的生命周期状态，决定能否有动作 |
| `generation N · state <12 位>` | **依据在哪**：这一次读取绑定的代次与工作状态版本，第二段的决定要用它 |
| `read only` | **后果**：这份读取不能被据以行动（服务端 `compatibility` 的原值，拼成词） |
| `Declared actions` | **定义**：producer 声明的动作清单，不是此处可执行的按钮 |
| `No action is declared on this reading.` | **条件**：这次读取没有合法动作，与「有动作但此处不给」区分 |
| `Read-only. An action needs the extension's own renderer.` | **后果**：为什么这里没有按钮 |
| `Loading work surface` / `Reading the work surface of X.` | **进行时**（copy-convention §1 加载只留一句进行时） |
| `Extension not installed` / `This session is bound to X. This host has no record of it, so its work state cannot be read here.` | **条件 + 后果** |
| `Work surface not read yet` / `This session is bound to X. Its work surface has not been read in this session.` | **条件**：与失败、与空区分 |

**词表**：本轮未引入新概念词。裁定里的 `producer` 未进入可见文案——可见处沿用产品既有的 `extension`（copy-convention §3「组件内不得自造第二套说法」）。若 Fable 认为 `producer` 应进词表，改一行 `slotStatusLine` 与三处文案即可。

## 6. 验证

作者验证，**不是验收**。

### 6.1 命令与结果

| 命令 | 结果 |
|---|---|
| `npm --prefix app ci` | ok（lockfile 未改，0 vulnerabilities） |
| `npm --prefix app test` | **170 / 170**，与基线同（无断言改写：本轮没有改变任何后端行为或 `thread-projection` 的投影语义；`permissionPresentation` 只新增一个字段） |
| `node tools/lint-colors.mjs` | ok（14 files · 字面量与高度层两项） |
| `node tools/contrast-report.mjs` | 全部通过，输出留档 `evidence/wk10b-1/contrast.md` |
| `evidence/wk10b-1/checks.mjs` | **22 / 22**，`checks.json` 留档；页面异常 0 |

### 6.2 22 条断言覆盖

行解剖 4 条（每行一个 16 glyph / 一个标题 / ≤1 元数据；无嵌套行且旧后缀已消失；状态词落在词表内；失败行只有状态词着色）· 槽位 4 条（挂载 / renderer 缺席 / producer 未加载 / 只读卡字段来源）· FE-T05 4 条 · FE-T07 2 条 · 生命周期 2 条 · Escape 1 条 · 可访问名 1 条 · 几何 1 条（1440 与 390 的 32/44 与横向溢出）· 页面异常 1 条。

### 6.3 FE-T05（FN-11 / 12 / 13 / 20）· 导入未知槽位、含脚本的 profile、缺依赖

| 步骤 | 结果 |
|---|---|
| 用产品自己的 client `PUT /runtime-control` 存一个 `uiSlots: ["work.surface.custom"]` 的 agent profile | **400** `invalid_runtime_config` ·「Unsupported UI slot; a profile cannot register renderer code」 |
| 存一个带 `module: "https://example.org/evil.mjs"` 与 `onMount: "alert(1)"` 的 profile | **400** `invalid_runtime_config` ·「Unsupported runtime fields」 |
| 存一个 `resourceIds: ["tool:ws_read", "local:absent"]` 的 profile 并选中它 | **200**（保存是允许的），composition `status: incompatible`、`missing: ["local:absent"]`、`uiSlots: ["work.surface"]` |
| 三步之后 | 已加载模块数不变（3 → 3）；未离开本 origin 的请求 0；工作面未挂载任何东西 |
| 缺口在哪里解释 | Runtime 模块原句：`Selected profile local:t05-gap · incompatible · missing local:absent. Adapter pi-coding-agent@0.85.1/agent-session.` |

**结论：三种输入都没有安装、没有执行、没有取任何代码；缺口在拥有该快照的面上被指名。** 前两种由控制面在服务端拒绝（前端不复述规则，只显示回执）；第三种被保存下来但不可用，且宿主的槽位解析把 `incompatible` 的声明排除在「已声明」之外。

### 6.4 FE-T07（FN-22 / 23 / 24）· 迟到响应与卡片展开收起

| 步骤 | 结果 |
|---|---|
| 打开 A（`Memo review`，已挂载 renderer），扣住它的 `GET /sessions/A/surface` 响应 2.6 s | — |
| 期间切到 B（`NDA review`，renderer 缺席），打开工作面 | 屏幕显示 B 的只读行 |
| 放行 A 的迟到响应 | 屏幕仍是 B：`extension.id === "inbound-nda"`，renderer host 数 0，`mounted === false`。A 的响应被读取纪元与 identity 守卫丢弃，**没有覆盖 B，也没有把 A 的 renderer 挂到 B 上** |
| 在有草稿的会话里展开再收起一张 Activity 卡 | 发出的 `/runs`、`/questions`、`/actions` 请求 **0**；composer 草稿与它的持久缓存都还是 `wk10b draft that must survive`；卡片回到原开合态 |
| 折叠 / 展开工作面三次 | `/surface`、`/workspace`、`/runtime-control` 请求各 0 |
| 关闭并重开工作面 | 每个来源至多 1 次（实测 surface 0、workspace 1、runtime 1）——**不是两次**，即没有重复订阅 |

### 6.5 键盘、Escape、几何

- Escape 两步不变：展开面 → 悬浮卡 → 关闭；关闭后焦点回到打开它的 `show-surface-button`。
- Chat Flow 与工作面里每一个可见控件都有完整 accessible name 且可达（22 条中的 `keyboard` 断言逐个读取 `aria-label` 或行内文字，无一为空）。`<summary>` 的名由行内文字构成，例：`1 tool action / Completed`、`What should the fake run use as its answer? / Answered`。
- 1440 与 390：每一行的实测高度都 ≥ 本地 32 / 44 档；横向溢出 0。
- 200 % 缩放（720 × 450 CSS 视口）：横向溢出 0，13 行全部可读。
- `prefers-reduced-motion: reduce`：仍在 running 的动画 0。
- 浅深两宗：见 `flow-*-{light,dark}-{before,after}.png` 与 `slot-renderer-absent-*`。

### 6.6 截图

`engineering/mvp/execution/work-surface-kit/evidence/wk10b-1/`，同一台服务器、同一份数据、同一具浏览器；`before` 以 `git stash` 把 `app/web` 与 `tools` 回到基线 `a2c2e4c` 后拍摄。索引见该目录的 `README.md`。

## 7. 越界与请求

| 项 | 说明 |
|---|---|
| `tools/lint-colors.mjs` | 写权清单未列 `tools/`，但也不在禁止清单内，且交付要求本轮跑通该 lint。改动只有一条：既有豁免项的**选择器名**跟随 WK-57 的行解剖改名。豁免的理由、条数与判据全部不变。若 Fable 认为该文件应由别人改，可把这一行摘出单独处理——摘出后 lint 会以 `.flow-title` 未豁免报 1 处，产品代码无需变动 |
| 静态 allowlist | **本段无请求**。未新增 `app/web/*.mjs` 文件，也未新增 renderer 路径。第二段的 `app/extensions/inbound-nda/renderer.mjs` 与 WK13 的 `app/web/presentation-adapters.mjs` 仍是登记在 [dispatch-round-3](dispatch-round-3.md) 的 Astra 前置项 |
| 给 WK11 的接口请求（不阻塞本段） | `runtime-view.mjs` 的 `summary()` 目前不暴露 `composition`。本轮的做法是宿主读它自己注入给该模块的 client 的那一次 `/runtime-control` 响应（`runtimeControlRequest`），因此**没有第二次请求、没有第二个真源**。若 WK11 重排 Runtime 模块，建议把 `{ profileId, status, uiSlots, missing, revision }` 并入 `summary()`，届时 `runtimeControlRequest` 这层包装可整段删除 |
| `window.__V5_UI__.slot()` | 为非作者独验暴露宿主自己的槽位解析（只读，调用无副作用），与既有的 `state` / `request` / `renderAll` 同一性质 |

## 8. 未检项（作者验证不是验收）

**分开列，不与已检混写。**

| 未检 | 为什么 |
|---|---|
| 真实触控 | 只做了 390 + `mobile` 视口模拟与命中区几何实测；模拟不是触控。IC-1 的 44×44 触屏要求需要真机 |
| 真实读屏（VoiceOver / NVDA） | `aria-hidden` 的类型 glyph、`<summary>` 由两个 span 组成的可访问名、单词标签 `Ask / Write / Read` 的全句读法（WK-75 (2) 的既有独验项）都只做了 DOM 层断言 |
| 真实 provider | 全程 `local-fake`；G1 未动 |
| 长中文标签下的行解剖 | IC-4 清单里的一项；本轮 fixture 全为英文与路径 |
| `disabled` / `loading` 态的代表控件 | 授权卡的 `aria-disabled` 路径未在本轮断言中覆盖（既有行为未改） |
| 悬浮层与 tooltip 的碰撞定位 | 未新增 tooltip 行为，未回归 Floating UI 的边界情形 |
| 第二段的一切 | NDA 逐规则 Review、决定与修订、回执可见、续行、只读历史；FE-T06 / T08 / T11 仍 `not_run` |
| Astra 独验 | 未做。本页全部读数出自作者自己的脚本 |
| 视觉四轴 | 留用户 |

## 9. 提交

| SHA | 题 |
|---|---|
| `84803ad` | web: one row anatomy for the Chat Flow, and a slot the host owns |
| 本页所在提交 | docs: the glyph contract, the two rewritten surface docs, and this record |

分支 `claude/wk10b-first`，未 push。基线 `a2c2e4c`。

## 10. Fable 复核（2026-09-08）

独立重跑：`npm --prefix app test` 170/170，`lint-colors` ok；目视 `slot-renderer-absent-1440-light` 前后图：缺席态由"loaded · generation 0 + 标题 + JSON"改为状态行（标题 · renderer not loaded）、`generation · state` 依据行、`Declared actions` 与只读原因句，符合 FN-20 / 24 / 28 与 S-5 消融。

裁定（WK-84）：
1. `tools/lint-colors.mjs` 一行选择器改名接受；豁免理由与条数未变。
2. 可见词沿用 `extension`，`producer` 只留在裁定与契约文本；copy-convention 词表不增词。
3. 消融 S-1 删除通用 `Run action` 按钮、S-7 不为仅声明的 `uiSlots` 画行、C-13 未决授权卡不并入行解剖：均接受。
4. 交 Astra 合流；独验项：FE-T05 / T07 复跑、`docs/surface-assignment.md` 第 3 条覆盖态限定、WK11 登记项（`summary()` 暴露 `composition` 后删 `runtimeControlRequest`）。

未检项沿 §8；第二段从合流后的 main 建树。
