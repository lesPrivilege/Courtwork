# WO-WK11 交付 · Runtime Workbench（Opus，2026-09-09）

工单 [WO-WK11](work-orders/WO-WK11-runtime-workbench.md)（含 2026-09-08 补充与 WK-87 两条追加）。主规范 [frontend-layering-spec](../../../design/frontend-layering-spec.md)（FN-05 / 07 / 14 / 15 / 16 / 17 / 18 / 19 / 20 / 21 / 24 / 26 / 27 / 28，§3.1 意图分组）；体例 [copy-convention](../../../design/copy-convention.md)、[icon-controls](../../../design/icon-controls.md)、[ui-composition-standard](../../../design/ui-composition-standard.md)；契约 `app/runtime/control-contract.d.ts`、[HTTP API](../../../../docs/runtime-control/api.md)、[architecture](../../../../docs/runtime-control/architecture.md)。消费 WK-63 / 64 / 65 / 66 / 68、RC-1…10、[runtime 讨论转录](inputs/runtime-workbench-discussion-2026-09-09.md)、[EX-WK6 r2](explore/ex-wk6-r2-dsh-official.md)。

## 1. 固定 SHA 与环境

| 项 | 值 |
|---|---|
| 基线 main | `14ebd61877545ab71e20ce54a720d4e1e13c6b78`（WK12 合流复验回执） |
| 工作树 | `/private/tmp/se-agent-wk11` |
| 分支 | `claude/wk11-workbench`（未 push） |
| 应用端口 | 8883，数据目录 `/private/tmp/se-agent-wk11-data`（仓外，全新） |
| provider | `fake-openai-loopback`（local-fake），全程零外部模型请求 |
| MCP fixture | `evidence/final-integration-20260908/rc/mcp-fixture.mjs`，`MCP_PORT=8884` |
| 播种 | 同目录 `seed-fixture.mjs`，`RC_PORT=8883 MCP_PORT=8884` |
| CDP 端口 | 19710（verify）、19712（shots），各自独立 Chrome profile |
| Node | 25.9.0 |

## 2. 这一单实际做的是什么

RC 那一轮把 runtime 目录做成了工作面右侧的一个 L2 面板：一张扁平的资源清单，按 `kind` 分节。WK-82 的裁定把导航改成**意图分组**，WK-78 又把 Settings 变成整页，于是这一单要回答的第一个问题不是「Workbench 长什么样」，而是「同一份目录该在几个地方画」。

答案是一处。Workbench 就是 Settings 的 Runtime 组，落在 [WK12 §10](delivery-wk12.md#10-留给-wk11-的挂载点) 留下的五个 `data-wk11-mount` 里；工作面导轨里那张 Runtime 卡按 WK-66 保留为**粗粒度**读数（装了多少、有没有被 Run 冻住、有几条 Attention），它的 Open 通向这一组，不再另开一个 L2 面。因此 `#surface-runtime-tab` 与 `#runtime-content` 一并删除：留着它们就意味着同一份目录有两个画法、两处焦点栈、两套断言，而这正是「先消融再增加」要拦的东西。这是本单最大的一处结构决定，写在最前面供 Fable 裁。

其余四件：四层（Source / Requested / Effective / Bound）、Configurable / Inventory、policy 编辑与只读权限解释、`/` 查找。加上 WK-87 的两条（Appearance 单块预览、用户 skin 对比度警告）。

## 3. 受影响文件

| 文件 | 改了什么 |
|---|---|
| `app/web/runtime-view.mjs` | 从「一个 L2 面板视图」改为「一个 controller + 五个意图分组渲染器」。新增：`attentionItems`（导出，可单测）、四层读数、`operation: profile` 与 `operation: policy` 两条写路径、`/runtime-permissions/evaluate` 只读解释、Effective Context Inspector、Configurable / Inventory、kind 过滤 chip、按 draft key 索引的草稿表、`openResource`。`summary()` 增出 `sessionId / revision / composition / profileId / status / uiSlots / missing / attention` |
| `app/web/settings-view.mjs` | 删 `runtimePanel()`、`RUNTIME_MOUNTS`、`renderRuntime()` 与它那一路 `/runtime-context` 请求（改由 Workbench 独占，一个事实一个来源）；页内搜索的行选择器纳入 `.runtime-row` / `.runtime-context-row` / `.runtime-inventory-row`，Runtime 组内 Enter 打开唯一命中；导出 `refilter` / `focusSearch`。WK-87：四块预览收为组顶一块（`settingsRow` 的 `preview` 参数与 `.settings-entry` 包装一并删除），新增 `CONTRAST_PAIRS` / `contrastRatio` / `skinContrastWarnings` 与接受后的警告 |
| `app/web/app.mjs` | **删 `runtimeControlRequest` 包装与 `state.slotDeclaration`**（WK10b-1 登记项）：`slotDeclaration()` 改读 `runtimeView.summary()`。`createRuntimeView` 改为传五个挂载点与 `getRuns / getBinding / loadBinding / onEditConnection / onRendered`。删 runtime 这一 surface kind 的 tab / pane 分支（`surfacePaneModules()`），railHost 增 `openRuntimeSettings`。新增 `handleRuntimeFinderKey`（`/`）。`openSettings` 顺带 `runtimeView.load()` |
| `app/web/index.html` | Overview 挂载点收为一个空 block（`#settings-runtime-overview`），删组级现状句、`#runtime-control-settings`、`#runtime-control-entry`、`#settings-runtime-overview-absent`；删 `#surface-runtime-tab` 与 `#runtime-content` |
| `app/web/surface-modules.mjs` | 只改 runtime 那一张卡：去掉 `tabId` / `contentId` / `pane`，Open 改为 `host.openRuntimeSettings()`，冻结句按 FN-16 改写，增一行 Attention 计数 |
| `app/web/styles.css` | 新增 Workbench 结构样式（四层、Attention、chip、subtab、三张只读表、policy 表、explainer）；`.settings-entry` 与 `.runtime-control-entry` 两处死样式删除；预览改为组顶一块。全部引用既有 role token，`lint-colors` 通过。**修了一处既有笔误**：本单先写成 `var(--space-5)`，而该 token 不存在（`--space-1/2/3/4/6/8`），已全部改为 `--space-6` |
| `app/tests/runtime-workbench.test.mjs` | 新增 4 条：`attentionItems` 两条、`contrastRatio` 一条、以及 `CONTRAST_PAIRS` 与 `tools/contrast-report.mjs` 的**漂移守卫**一条 |
| `docs/interface-components.md` | 新增 "Runtime Workbench" 一节；Appearance 段按 WK-87 改写；Ownership 增 `runtime-view.mjs` 一行 |
| `docs/runtime-control/acceptance.md` | 新增「What the frontend now shows」一节：把 "New frontend contract" 的每条义务对到它现在落在哪里 |
| `runtime-ui-gaps.md` | 新增 D 节：A / B 两表逐行复核，三档判定 |
| `text-sweep.md` | §5 增 WO-WK11 一行；§4 第 2 条（runtime 长句与 RC 检查同源）结清 |
| `evidence/wk11/**` | 三支适配后的 RC 套件 + `verify.mjs` + `reset-fixture.mjs`、结果 JSON、`shots.mjs` 与 21 张同条件截图 |

**未改**：`app/server/**`、`app/runtime/**`、`app/core/**`、`app/domains/**`、`app/extensions/**`、`brand/**`、`PAPER.md`、HTTP 契约、`app/web/home-view.mjs`、`app/web/presentation-adapters.mjs`。`git diff --stat -- app/server app/runtime app/core app/domains app/extensions brand PAPER.md` 为空。**无新增 npm 依赖。无 allowlist 请求**——Workbench 写在既有的 `runtime-view.mjs` 内，没有新模块文件，因此 `app/server/index.mjs` 的 STATIC 表不需要任何改动，也没有做过临时补丁。

## 4. 五个意图分组

| 组 | 画了什么 | 必须解释的区别 |
|---|---|---|
| Overview | `/runtime-control` 的 profile / adapter / 曝光计数 / 活动 Run；`/runtime-context` 的字符计数（标 `characters, not tokens`）；Attention；Recorded bindings | 当前 vs 下次 Run。Attention 为 0 时明写「都健康、没有待答权限、插件都是 host-trusted」，不靠沉默 |
| Composition | profile 选择（`operation: "profile"`，含 Inherit）、四层读数、依赖逐条解析、适用范围（`uiSlots` 标 declared, not executed）、profile 行 | 选 profile ≠ 曝光资源 ≠ 已验证 Expert。`resourceIds: null` 与空列表分开说 |
| Instructions & context | instruction / skill / reference / prompt_template（按 admission 顺序，不按 kind 表顺序）、kind chip、Effective Context Inspector（逐 `ContextItem`）、memory_provider 的 Planned 行 | injected / listed / loaded-on-demand / draft-only 四种 admission，逐行一句 |
| Capabilities & connections | Configurable（tool / mcp_server / extension 提供的 tool，远端 tool 缩进于服务器下并带 `remote` + configHash）、Inventory（包与它声明了什么）、workflow / hook / registry 的 Planned 行 | configured / connected / exposed / permitted 四件事；声明 ≠ 可执行包；lifecycle 在 Developer |
| Permissions & environment | policy 规则整表编辑（`operation: "policy"`）、其他层只读、`POST /runtime-permissions/evaluate` 只读解释、models / provider 只读 + Edit in General、sandbox / session history / host mode / 未报告的预算 | 请求值 / 有效值 / 宿主上限 / Run 冻结值四种读数；只能收紧 |

`kind` 只作过滤与识别，不作导航层级。

## 5. 四层（FN-14）

每个可配置项的展开面第一块就是四行：

| 层 | 来源 | 缺席时怎么说 |
|---|---|---|
| Source | `resource.source`（type / version / uri / hash），可经 `GET /runtime-resources/:id` 读原文 | `no hash recorded` |
| Requested | 当前 scope 内的本地草稿，或服务端已存下的 explicit override | `Nothing requested in the <scope> layer.` |
| Effective | 服务端快照的 `exposed`，附 `server revision N` | 不会缺席；读不到时整组落在最后确认快照上并明写 |
| Bound | Overview 打开的某个 Run 的 recorded binding | `No recorded run is open.` / `Not present in this run's binding.` / legacy 无 binding 一句 |

三处是这一层真正承重的地方：

1. **存下了 ≠ 生效了。** session 层把 `tool:ws_write` 设为 exposed、而 profile 的 capability ceiling 把它压回 false 时，Requested 写 `Exposed — your session override, recorded`，注写 `recorded, and outranked by profile capability ceiling`，Effective 写 `Not exposed to the next run`。开关不再声称「The switch overrides it for this session」，改说「记录你的请求，选中的 profile 仍然决定生效值」。
2. **Bound 从 Run 自己读。** 走宿主已有的 `state.recordedContext`（每个 runId 取一次）；不新开端点，不新开缓存，不用当前 catalog 回填历史。
3. **hash 只说字节身份。** 那一句写在四层下方，UI 不自算第二份 effective。

Inherit 仍是「移除本层 override」（`exposed: null`），一条文字行，没有第三个开关位。precedence 句按 RC-3 保持原文，置于 scope tab 上方。

## 6. FN-16：Run 进行中

`activeRuns > 0` 或服务端回 409 `active_run` 时，五个 block 都带 `data-frozen="true"`，每一个提交型控件 disabled（本机实测 25 个），一句横幅：

> A run is active. This group is read only until it ends. An edit you make now is kept here as a draft; it is not applied, and it will not apply itself later.

没有「已排队」，没有「结束后自动生效」。policy 编辑器仍可本地编辑（它是表单，冻结它等于把草稿也一起没收），Save 置灰，草稿行明写「A run is active, so this is a draft only」。Run 结束后横幅消失、Save 可用、**服务端规则未变**——草稿仍是草稿，要生效必须由人再按一次。

409 `runtime_conflict` 时刷新权威快照、把未发出的编辑按 `<对象>:<scope>` 存成草稿、**不重发**；重发是横幅上「Submit this change」这一次点击。

## 7. RC 套件：改了什么、为什么

三支套件从 `evidence/final-integration-20260908/rc/` 复制到 `evidence/wk11/rc/`，**断言的义务一条没删**。改动逐条：

| 改动 | 原因 |
|---|---|
| 入口由 `$("surface-runtime-tab").click()` 改为 `location.hash = "#settings/runtime"`，root 由 `#runtime-content` 改为 `#settings-runtime` | 目录换了住处（§2）。`$("close-runtime-button")` 在 WK12 之后已不存在，套件此前会在末尾抛 TypeError |
| 「重载模块」由切 surface tab 改为退出并重进 Settings 页 | 同上；`openSettings` 调的正是 Workbench 的 `load()` |
| `surface` 一条改断五个 `data-wk11-mount` block 与 `#settings-tab-runtime` 的 tab 关系 | 断的仍是「runtime 是一个有身份的面，不是别人面里的一块」，只是这个面现在是页里的一组 |
| `running-null` 改为：**只对被画成对象行的资源**断 n/a，并另断「没被画成行的资源全部是 provider / model / secret / sandbox / permission_policy / session_context，且每一种在 Permissions & environment 里都有一行陈述」 | 旧断言默认「全部资源画成一张扁平表」。按 §3.1 分组后环境类事实是只读行不是对象行；新断言比旧的更强——它同时挡住「悄悄少画」 |
| `unsupported-kinds` 改为遍历多个 `[data-kind='unsupported']` 段 | Planned 行现在落在各自的组里，而不是集中在末尾 |
| `planned-inert` 的 `<details>` 断言改为「在 Developer 组内、行数 > 0、零可交互后代」 | WK-78 之后 Planned 不再是折叠面；这条在本单之前就已失效 |
| `selection-not-exposure` 由 `.form-help` 改读 `.settings-row-help` | 组内的句子用页的行内说明类，不是表单帮助类 |
| `conflict-draft` 由断 `tool:ws_read` 改为断 `ws_read` + `at session` | 草稿摘要按行的说法命名对象（title + scope），不再贴原始 id。仍唯一指向一个对象与一个 scope |
| `freeze-lifts` 的开关由「组内第一个」改为 `tool:ws_read` 的那一个 | 组内第一个开关现在属于 profile 行，而 profile 永远 `configurable: false` |
| 反例 4 的横幅原文按 FN-16 改写 | 见 §6。这是裁定改了文案，套件跟着改 |
| viewport 的 `surface-tab-keyboard` 换成 `capability-tab-keyboard`，`escape-order` 换成 `rail-card-opens-the-group` | 前者的被测对象（surface 里的 Runtime tab）不存在了。新的两条测的是本单引入的东西：Configurable / Inventory 的方向键与 roving tabindex；以及导轨卡 Open → 落到 Runtime 组、导轨收起、Escape 退出页 |
| `no-horizontal-overflow` 的 spill 判定排除处在 `overflow-x: auto/scroll` 祖先内的节点 | 宽表在自己的盒子里横向滚动是既定约定；页与文档不横向滚动由同一条里的 `panelOverflow` 断。**先修了真实缺陷再改断言**：`min-width: 0` / `grid-template-columns: minmax(0, 1fr)` 之前，390 下 `#settings-sections` 真的横向滚 201px |

结果：

| 套件 | 结果 | 文件 |
|---|---|---|
| RC 契约 | **20/20** | [runtime-ui-checks.json](evidence/wk11/rc/runtime-ui-checks.json) |
| RC 反例 | **9/9** | [runtime-ui-counterexamples.json](evidence/wk11/rc/runtime-ui-counterexamples.json) |
| RC 视口 | **36/36**（1440 / 390 × light / dark / reduced motion） | [runtime-ui-viewport.json](evidence/wk11/rc/runtime-ui-viewport.json) |

反例里两条值得单独说：`mcp-lifecycle` 本轮**通过**（disconnect 后状态词由 `configured connected` 回到 `configured`，再 connect 又回来），此前 BE-13 记为 not_run / 待复核——这只说明在 8883 + 本地 loopback fixture 下不复现，不等于线路侧已无问题。`active-run-freeze` 记到 25 个控件 disabled、21 行仍可展开：冻结是只读，不是不可读。

## 8. text-sweep 增量

### 删

| # | 字符串 | 位置 | 去掉后失去的判断 | 结果 |
|---|---|---|---|---|
| D-21 | `These readings are in the Runtime module today. This page names the groups they will be organised into; it does not organise them yet.` | `index.html` 组级现状句 | 无。它描述的是 WK12 的中间状态，本单把内容填实后它就是错的 | ✅ 删 |
| D-22 | `Open runtime resources` + `Tools, MCP servers, skills, plugins and instructions, with the scope each value comes from.` | Overview 的入口行 | 无。门后面的东西现在就在门的位置上 | ✅ 删（连同 `.runtime-control-entry` 样式） |
| D-23 | `Profile <id> · <status>.` | `renderContextBar` 末行 | 无。Overview 的 Profile 行在同屏上方三行处已陈述同一事实 | ✅ 删 |
| D-24 | `Revision <n>`（Overview 的 DataList 行） | Overview | 无。scope 行已写 `Revision n`，四层的 Effective 又逐项写 `server revision n` | ✅ 删（保留 scope 行那一处） |
| D-25 | 展开面 `Source` 块里的 `Source` 与 `Version` 两行 | `sourceDetail` | 无。四层的 Source 行就在同一屏上方 | ✅ 删两行，块名改 `Descriptor`（W-24） |
| D-26 | `Selection is made where the profile is chosen, not with these switches.` | agent_profile kind note | 无。选择控件现在就在这一段的上方八行处，指路句失去指向 | ✅ 改写（W-23） |

### 单词化 / 改写

| # | 原 | 现 | 承重 |
|---|---|---|---|
| W-23 | `… Selection is made where the profile is chosen, not with these switches.` | `… These rows are the profiles themselves — the selection is the control above, and none of them has a switch.` | **条件**：说清这些行是什么、为什么没有开关 |
| W-24 | 展开面块名 `Source` | `Descriptor` | **对象名**：与四层的 Source 层分开，两个块不能同名 |

### 保留（41 条新增字符串的承重）

| 类 | 例 | 承担 |
|---|---|---|
| 四层名 | `Source` / `Requested` / `Effective` / `Bound` | **定义**：FN-14 的四个不同问题 |
| 四层注 | `recorded, and outranked by profile capability ceiling`、`a run was active, so the server did not take it`、`the revision moved, so the server did not take it`、`server revision N`、`run <id> · revision N` | **出处与后果**：为什么这一层是这个值 |
| 冻结句 | ACTIVE_RUN_SENTENCE（§6 全文） | **后果**：FN-16 的三句话（只读 / 不生效 / 不会自己生效） |
| policy 草稿句 | `Requested: N rules in the <scope> layer, not yet in effect. Effective is still the M rules the server holds at revision R.` | **请求值 vs 有效值** |
| 收紧句 | `The <scope> layer asked for <effect> and the effective answer is still <effect>. A narrower layer can only tighten; it cannot loosen what a wider one set.` | **授权边界**（FN-15），FE-T03 的可见证据 |
| admission | `injected` / `listed` / `draft only` + 每行一句 | **定义**：四种 admission |
| Attention | `Every resource reports healthy, nothing is waiting for a permission answer, and every plugin is host-trusted.` | **状态事实**：空 ≠ 未检（FN-28） |
| Inventory | `For an extension, trust is who signed it and how it is isolated; for a remote server it is the authentication it accepts and the transport it speaks…` | **定义**：同一列在两种包上读法不同 |
| 未报告 | `Not reported` × 4（data dir / effort / context budget / trust） + `Backend request BE-12` | **能力边界**：缺数据 ≠ 0 |
| 只读性 | `A read-only reading of the bound policy. It grants nothing and changes nothing; the executor re-checks every call.` | **后果**：解释 ≠ 授权 |
| 陈旧读 | `<message> The readings below are the last snapshot the host confirmed, at revision N. Any draft you have is kept.` | **连接状态 + 版本**（FN-24） |
| WK-87 | `Applied, with N contrast pairs below the threshold this build checks…` + 逐对比值 | **后果**：警告不是门 |

## 9. 消融（同条件截图，一次只去掉一个元素）

截图在 [evidence/wk11/shots](evidence/wk11/shots/)，同一会话、同一 revision、同一视口；消融图靠一条只在那一张里注入的 CSS 规则去掉一个元素。

| 去掉 | 图 | 失去的判断 |
|---|---|---|
| 四层块 | `ablate-layers.png` ↔ `layers-open.png` | 「你请求了什么」与「服务器用什么」合并成一个开关状态。存下却没生效的 override 变成无法解释的差异；历史 Run 用了什么彻底不可读 |
| Attention | `ablate-attention.png` ↔ `group-overview.png` | 「都健康」与「没查」不可分。degraded、待答权限、不可信插件都要靠逐行展开才发现 |
| admission 标签 | `ablate-admission-tags.png` | 行上只剩 Exposed；「进了 prompt」与「只进了目录」变成同一件事，一个 instruction 与一个 skill 看起来一样 |
| Effective Context Inspector | `ablate-context-inspector.png` | 只剩按 kind 汇总的比例条：admitted 与 deferred 的差、每项的 hash 与 scope 都没有了，「这次 Run 会带哪几段字」退回一个总数 |
| provenance 句 | `ablate-provenance.png` | 值还在，为什么是这个值没了。父闸门、profile ceiling、override 三种成因塌成一个「Not exposed」 |
| 四态维度 | `ablate-dimensions.png` | configured / connected / exposed / permitted 变成一个开关。「连上了服务器」被读成「模型能用了」——正是 RC-2 要拦的那一步 |
| Configurable / Inventory | `ablate-inventory-tab.png` | 只剩可改的东西。「谁提供了这个 tool」「这个包是不是 host-trusted」「它声明了几件事」无处可读 |
| 其他层规则 | `ablate-other-layers.png` | 只看见本层规则；user / workspace 已经设下的 deny 不可见，于是「我的规则为什么没生效」无法自答 |
| Planned 行 | `ablate-planned.png` | 契约里有、这台宿主没有的能力从界面上消失。缺席变成沉默，读者会以为这台机器只有这些 kind |
| Recorded bindings | `ablate-bindings.png` | Bound 一层永远填不上；改配置之后「上一次 Run 用的是什么」只能靠记忆 |
| kind chip | `ablate-kind-chips.png` | 组内只能整段滚动。资源一多，「只看 MCP servers」这类收窄要靠眼睛做 |

另有两张对照：`capabilities-inventory.png`（Inventory 半边）、`group-overview-dark.png` / `group-overview-390.png` / `group-permissions-390.png`（深宗与窄屏同条件）。

## 10. FE-T03（FN-14 / 15 / 16）

**条件**：seed fixture，session `851afb95…`，全部动作经产品自己的控件。

| 步 | 动作 | 观察 |
|---|---|---|
| 1 | Runtime 组 → scope tab `User` → Add a rule → `ws_write` / `*` / `deny` | 草稿行：`Requested: 1 rule in the user layer, not yet in effect. Effective is still the 0 rules the server holds at revision 11.` |
| 2 | Save rules | 草稿行消失；`GET /runtime-control` 的 user 层出现该规则 |
| 3 | scope tab `Session` → Add a rule → `ws_write` / `*` / `allow` → Save rules | 服务端 **200**（存下允许），`policies` 三层俱在 |
| 4 | Capabilities 组 → `tool:ws_write` 行 | `Permitted` = `deny`。展开后 trace 三步：`host-ceiling allow` → `user · local deny` → `session · … allow`，并多一句 `The session layer asked for allow and the effective answer is still deny. A narrower layer can only tighten; it cannot loosen what a wider one set.` |
| 5 | Permissions 组 → 其他层只读表 | 逐条列出 user 与 workspace 的规则，并写明「a narrower layer can only tighten what these set」 |
| 6 | Composition 组 → Profile 选 `Reader profile`（`operation: "profile"`，session scope） | 四层：Source `local config · hash 407f35f0bd11`；Requested `Nothing requested in the session layer.`；Effective `local:reader · compatible / server revision 14`；**Bound `agent:general · compatible / run af3f31be`** |
| 7 | 同一屏的 `tool:ws_write` 行 | Effective `Not exposed to the next run / server revision 14`；**Bound `Exposed in this run / run af3f31be · revision 13`** |
| 8 | 在 `Reader profile` 下把 `tool:ws_write` 的 session 开关打开 | 服务端 200（override 存下），`exposed` 仍为 `false`。Requested 写 `Exposed — your session override, recorded` + `recorded, and outranked by profile capability ceiling`；Effective 写 `Not exposed to the next run`；行内一句「The switch records your request for this scope. The selected profile still decides the value in force」 |

**结论**：请求值与有效值分列；权限从未被放宽（第 4 步 deny 未变，第 8 步 override 存下但不生效）；历史 bound 在换 profile 后逐字不变（第 6 / 7 步）。附带一条实证：在 `Reader profile` 下发一次 `/fixture question`，得到 `Tool ask_user not found`——profile 的限制是真的在跑，不是画出来的。

## 11. FE-T04（FN-14 / 16 / 19）

### 11.1 两客户端同 revision 提交

| 步 | 动作 | 观察 |
|---|---|---|
| 1 | Workbench 持有 revision 15 | 页上写 `Revision 15` |
| 2 | 第二个客户端（页内 fetch，独立 token）以 revision 15 提交 `tool:ws_grep` 的 user 层 exposure | 200，服务端到 16 |
| 3 | 在页上点 `tool:ws_read` 的 session 开关 | 409 `runtime_conflict`。横幅：`The runtime changed while you were editing. Your change was not applied and is kept here as a draft.` + `ws_read · do not expose at session` + 两个按钮 `Submit this change` / `Discard the draft` |
| 4 | 复核 | 页上 revision 变 16（刷新了权威快照）；开关回到服务端值（仍 exposed）；`GET /runtime-control` 的 `tool:ws_read.exposed` 仍为 true；**只发出一次 PUT**（RC 反例 `conflict-draft` 断 `puts === 1`） |
| 5 | `tool:ws_read` 行的 Requested 层 | `ws_read · do not expose at session — not in effect` + `the revision moved, so the server did not take it` |
| 6 | 点 `Submit this change` | 以新 revision 重发，200（RC 反例 `conflict-draft-apply`） |

无静默覆盖、无乐观应用、无自动重放。

### 11.2 Run 进行中修改

| 步 | 动作 | 观察 |
|---|---|---|
| 1 | 发 `/fixture question`，Run 停在 `waiting_user` | `activeRuns = 1` |
| 2 | 进 Runtime 组 | 五个 block `data-frozen="true"`；横幅为 §6 全文；开关 / Inherit / profile 选择 / MCP 三个按钮 / Save 全部 disabled |
| 3 | 在 policy 表里加一条 `ws_grep` / `*` / `deny` | 表单仍可输入；Save 仍 disabled；草稿行：`Requested: 2 rules in the session layer. A run is active, so this is a draft only — it is not applied and it will not apply itself when the run ends.` |
| 4 | 在页面文本里查 `queued` / `will be applied` / `after it ends` | 零命中 |
| 5 | 答完问题，Run 结束 | `activeRuns = 0`，横幅消失，`data-frozen` 移除，Save 可用 |
| 6 | 复核服务端 | session 层规则仍只有原来那一条——**草稿没有自己生效** |

## 12. 其它实测条件

| 条件 | 结果 |
|---|---|
| 真实本地 API 读取 | `/runtime-control`、`/runtime-context`、`/runtime-resources/:id`、`/runtime-resources/:id/invoke`、`/runtime-permissions/evaluate`、`/mcp/:id/lifecycle` 全部经产品自己的控件跑过 |
| 一次允许的配置更新与权威返回 | exposure（`local:docs-mcp` 曝光 → 两个远端 tool 的开关由 disabled 变可用、`exposed` 翻真）、profile（§10）、policy（§10）三种 operation 各跑过；每次都以返回的快照整体替换 |
| MCP 生命周期 | disconnect → `configured`；connect → `configured connected`；曝光后 → `configured connected exposed`。远端 tool 缩进于服务器下，带 `remote` 与 `2305a98e9848` |
| 父门控 | 服务器未曝光时两个远端 tool 的开关 disabled，行内写「Its server "Docs server" is not exposed…」+「Expose and connect the parent resource before…」；插件未运行时同理 |
| 缺资源 | 页上打开 `local:doomed` 后经 API 删除，再点 View source → 行内错误 `runtime resource not found`，不伪造正文 |
| 断线 | `kill -9` 服务端后点 Refresh → `The local runtime could not be reached. The readings below are the last snapshot the host confirmed, at revision 21. Any draft you have is kept.`；21 行资源仍可读可展开；随后一次提交失败后开关回到快照值（无乐观应用） |
| 零 / 缺失计数 | 新建项目 + 会话（无 workspace 级资源）：kind chip 只剩 Instructions / Prompt templates，context 只两行，Recorded bindings 写「No run has been recorded in this session yet.」 |
| 历史 partial Context | `admittedCharacters` 缺失时 Inspector 写 `(partial)` 与「never recomputed from today's sources」；本机 fixture 的记录都是新格式，partial 分支由 `admittedCharacters` 单测覆盖（既有 `runtime-projection.test.mjs`） |
| prompt draft | `Use as draft` 填 composer，`runs` 数不变（RC 反例 `template-draft-only` 断 7 → 7） |
| 键盘 | scope tab 方向键 / Home / End + 单一 tab stop（viewport 套件）；Configurable / Inventory 方向键 + 单一 tab stop（同上）；`/` 与 Enter 见下 |
| 缩放 | 390 视口作 200% 等效；几何断言（无横向滚动、命中区 ≥ 44）通过 |
| 浅深宗 | 1440 / 390 各在 light 与 dark 下跑同一批断言，36/36；截图 `group-overview.png` / `group-overview-dark.png` 同条件对照 |
| 窄屏 | 390 下组导航折为顶部下拉，右列单列；三张宽表各自在 `overflow-x: auto` 盒内滚动，页与文档不横向滚动 |

### `/` 不抢输入

| 情形 | `/` 是否被拦截 | 焦点 |
|---|---|---|
| Runtime 组 + 焦点在 Back 按钮 | 是 | → `#settings-search` |
| 焦点在 `<input>` | 否 | 留在原处 |
| 焦点在 contenteditable | 否 | 留在原处 |
| `isComposing: true`（IME 组合中） | 否 | 留在原处 |
| `keyCode 229`（IME 中间态） | 否 | 留在原处 |
| 带 Cmd / Ctrl / Alt | 否 | 留在原处 |
| Settings 在别的组（General） | 否 | 留在原处 |
| Settings 未打开 | 否 | 留在原处 |

查到之后：输入 `citation` → Runtime 组内只剩 `local:citation` 一行 → Enter → 该行展开并读出 recorded source，焦点落到行标题。没有安装、没有应用、没有任何写请求。

### WK-87

| 条 | 结果 |
|---|---|
| (a) 四块预览收为一块 | `#settings-appearance-rows` 的第一个子元素是唯一的 `.settings-preview`，`.settings-preview` 计数 = 1；Scheme / Skin / Text size / Code font 四行共用它。`settingsRow` 的 `preview` 参数与 `.settings-entry` 包装（含两条样式）一并删除 |
| (b) 用户 skin 对比度警告 | 粘一套合法但低对比的 Tier S（ink #cccccc / paper #ffffff）：**接受并应用**（`data-skin="custom"`、`--gray-12` 生效），同时列出 19 对低于门槛的对照对，逐条写比值（`ink on panel: 1.61:1, below 4.5:1.`）。粘一套达标的 Tier S：零警告。做法是把候选 token 挂在探针元素上，让浏览器按自己的替换规则解出 tier:R 角色值，因此没有第二份 S→R 映射；对照对与门槛逐条抄自 `tools/contrast-report.mjs`，并由 `app/tests/runtime-workbench.test.mjs` 的漂移守卫钉住 |

## 13. 命令与结果

```sh
npm --prefix app ci                                  # ok
npm --prefix app test                                # 208 / 208（基线 204 + 本单 4）
node tools/lint-colors.mjs                           # ok（15 files · 字面量与高度层两项）
node tools/contrast-report.mjs                       # 退出码 0
# 服务：MCP_PORT=8884 node evidence/final-integration-20260908/rc/mcp-fixture.mjs
#       npm --prefix app start -- --data-dir /private/tmp/se-agent-wk11-data --port 8883
#       RC_PORT=8883 MCP_PORT=8884 node evidence/final-integration-20260908/rc/seed-fixture.mjs
node engineering/mvp/execution/work-surface-kit/evidence/wk11/rc/verify.mjs
                                                     # contract 20/20, counterexamples 9/9, viewport 36/36
node engineering/mvp/execution/work-surface-kit/evidence/wk11/rc/reset-fixture.mjs
node engineering/mvp/execution/work-surface-kit/evidence/wk11/shots.mjs   # 21 张
git diff --stat -- app/server app/runtime app/core app/domains app/extensions brand PAPER.md   # 空
```

复跑次序要紧：`verify.mjs` 的反例会故意关掉资源、改 policy、取消 Run，所以截图前必须先跑 `reset-fixture.mjs`，否则截出来的是那一套反例的残留。

## 14. 后端请求

本单没有新增 BE 编号——需要的东西都已在 [backend-requests.md](backend-requests.md) 里。三条按本轮实测补充依据：

| 编号 | 本轮补充 |
|---|---|
| BE-4 | B-1（provenance 缺服务器闸门）现在有第二个消费点：四层的 Requested 要区分「存下了」与「没生效」，靠的是比较 provenance 末条与 `exposed`。后端补一条闸门 provenance 后，这段推断可以整段删掉 |
| BE-11 | Planned 行现在分散在各自的意图组里，每行写明 BE-11。它们是四个 kind（memory_provider / workflow / hook / registry），不是一张笼统的清单 |
| BE-12 | Permissions & environment 有一行占位的 `Reasoning effort = Not reported` 并写明 BE-12；字段一到位，该行由 `Not reported` 变成读数，无需改版式 |
| BE-13 | 本轮**未复现**（§7）。建议由线路侧决定是关掉这条还是保留为条件性问题 |

### 一处观察（不是请求）

深链直接落在 `#settings/runtime` 时，页面在 bootstrap 拿到 token 之前会先发四条读取，各得一次 401 再重试成功。这是 WK12 就有的引导竞态（`provider-config` / `provider-models` / `runtime-info` 三条本来就这样），本单让 `runtime-control` 也进了这一批，因为 Workbench 随页加载。普通进站（无 hash）零 401、也不发 `runtime-control`。同一情形下 Workbench 还会多读一次无 `sessionId` 的快照（会话尚未恢复），随后以带 `sessionId` 的那次替换。两者都不影响正确性，登记在此免得下一位当成新缺陷。

另有一条不成其为请求、但值得登记：`GET /runtime-resources/:id` 对已删除资源返回 `runtime resource not found`，前端原样显示。这是对的，只是措辞是服务端的；若要在界面上统一措辞，需要错误码而不是错误文案。

## 15. 越权与回滚

无。本单所有写入都在工单授权的文件内：`runtime-view.mjs`、`settings-view.mjs`、`app.mjs`、`index.html`、`styles.css`、`surface-modules.mjs`（仅 runtime 卡）、`app/tests/`、`evidence/`、`docs/interface-components.md`、`docs/runtime-control/acceptance.md` 与三份 work-surface-kit 文档。没有临时补丁需要回滚（没有做过 allowlist 的本地补丁）。

一处需要 Fable 明裁的**范围判断**：删除 `#surface-runtime-tab` / `#runtime-content` 这一 surface kind。工单没有点名要删，但保留它意味着同一份目录两处画、两处状态、两处断言。理由与代价写在 §2；若裁定要保留 L2 面，回滚点是 `index.html` 的两段 DOM、`app.mjs` 的 `surfacePaneModules()` 与 `activateSurface` 守卫、以及 `surface-modules.mjs` 里 runtime 卡的三个键，改动是可逆的。

## 16. 未检项（分列）

| 项 | 状态 | 说明 |
|---|---|---|
| 触控 | 未检 | 命中区按几何量到 44（390）与 32（桌面），没有在真实触摸屏上试过手势、长按与横向滚动那三张表 |
| 读屏 | 未检 | `role=tablist` / `tab` 关系、`aria-pressed`、`aria-expanded`、roving tabindex、`role=status` / `alert` 与焦点落点按 DOM 断言核对；未经 VoiceOver / NVDA 实听。四层的 `<dl>` 读法（term 与 definition 的配对）尤其未听过 |
| 真实输入法 | 未检 | `/` 的守卫由 `isComposing` 与 `keyCode 229` 的合成事件驱动（产品守卫读的正是这两项）；未用真实中日文输入法手打 |
| 真实 provider | 未检 | 全程 fake provider，零外部模型请求 |
| 真实 MCP server | 未检 | 只用本机 loopback wire fixture。OAuth、stdio、真实第三方服务器均未接触 |
| `mcp_effect_unknown` | 未检 | 代码路径在，本轮未在浏览器里触发过（runtime-ui-gaps B-10 仍开） |
| 历史 partial Context | 部分 | 分支由单测覆盖；本机没有旧格式 binding，未在浏览器里看过那一句 |
| 不可信插件的 Attention | 未检 | `trust !== 'host-trusted'` 的分支由单测覆盖；本机三个插件都是 host-trusted，界面上没有触发过 |
| 浏览器后退栈 | 部分 | hash 路由沿 WK12；本单只验了 `#settings/runtime` 深链与 Escape 退出，没有逐步核对多次进出后的历史栈 |
| 视觉四轴 | 未检 | 留用户 |
| 非作者独验 | 未跑 | 交 Astra / Fable。建议独验项：FE-T03 / T04 复跑、三支 RC 套件复跑、`git diff -- app/server app/runtime app/core` 为空、以及 §2 那一处范围判断 |

完成的含义：**现有资源的 Workbench 可用**——读得清、改得动、改不动的时候说得清为什么。R2 Source Resolver、R4 Proposal、R5 事务化 apply、R6 Expert 快照都还没有实现，本单也没有把既有的 PUT 改名包装成它们。

## 17. Fable 复核（2026-09-09）

独立重跑 `644cc43`：`npm --prefix app test` 208/208，`lint-colors` ok，server / runtime / core / extensions / home-view / presentation-adapters 无差异。目视 `group-overview`（作用域 tab、precedence 句、Attention、Next run · Context 字符计数、Recorded bindings）、`group-capabilities-and-connections`（四维分列、MCP 三态、父门控解释、Configurable / Inventory、kind chips）、`layers-open`（Source / Requested / Effective / Bound 四层与权限解释）。

裁定（WK-98）：
1. 删除 `#surface-runtime-tab` / `#runtime-content` L2 面板：接受。同一目录只画一处；导轨 Runtime 卡保留粗粒度读数（WK-66），其 Open 通向 Settings 组。WK-90 将把该组搬入 Developer › Runtime，路径随之改，不改本裁定。
2. RC 套件断言变更按 §7 逐条理由接受；两条在 WK12 时已失效的断言本单修复，登记为 WK12 遗留。
3. 缺陷：`layers-open` 中 Explain permission 下方渲染出裸 `null`（评估结果为空时的原样输出），违反 FN-28"缺数据 ≠ 空值文本"；不阻塞合流，列入 FE-01 首项修复。
4. 深链 `#settings/runtime` 的 bootstrap 401 重试竞态（源自 WK12）：FE-01 一并处理，先取 token 再发读取。
5. BE-13 本轮未复现：保留为条件性问题，不关闭。
6. 交 Astra 合流；独验项：FE-T03 / T04、RC 20 / 9 / 36、`mcp_effect_unknown` 路径（本单未检）。
