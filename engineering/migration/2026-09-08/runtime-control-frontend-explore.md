> Historical read-only source comparison copied from SE continuation. It is design input only; no runtime UI implementation or library adoption follows from this document.

# EX-RC1 · runtime 资源 / 权限 / MCP 表面追溯（只读）

作者 Sonnet 5。对象：本地 motto-dsh（`packages/client/*`）、`@earendil-works/pi-coding-agent@0.85.1`（`the historical private UI worktree (not copied into this repository)/app/node_modules/@earendil-works/pi-coding-agent`）；开源 OpenCode（`anomalyco/opencode`，`dev` HEAD `ecbc6ccac85b3e8087b6445e584318419b9e2b34`，另含 opencode.ai 官方文档）、Goose（`aaif-goose/goose`，`main` HEAD `5e90925962f05acf8e255032de44d16c4a7768a2`）、Cline（`cline/cline`，`main` HEAD `c21b17255b228e88a1518c18a73a473ee5876362`）、Claude Code（`code.claude.com/docs` 官方文档，未标注版本号的均为文档现行文本）。契约：`../../../app/runtime/control-contract.d.ts`、`../../../docs/runtime-control/{acceptance,api,architecture}.md`（工作树 `se-runtime-control-20260907`）。架构裁定 RC-1…RC-10 见 `runtime-control-frontend-intake.md`。

方法：本地源码用 `Read`/`Bash cat -n` 直读；开源产品官方文档用 WebFetch，源码用 `gh api`/`curl raw.githubusercontent.com` 按 pin 的 commit sha 直读，坐标为 `文件:行`。找不到对应功能一律写"无对照"，不代入推断。已核对 `gui-polish-explore/explore-oss-gui.md` 与 `gui-reference-intake/`：两卷聚焦消息流/composer/侧栏/设置页整体观感，未覆盖 runtime 资源清单、权限作用域三级呈现、MCP 连接生命周期，故本卷与其结论无重叠，不重复引用。

---

## A. 字段 → 呈现对照表

契约 `RuntimeResource` 字段逐一核对。"塌缩"指该产品将契约要求分离呈现的两个以上维度合并成同一个控件/状态位。

| 契约字段 | DSH (motto-dsh) | pi-coding-agent 0.85.1 | OpenCode | Claude Code | Goose | Cline |
|---|---|---|---|---|---|---|
| `installed` | 无独立维度；`PluginCard` 只有 `state.available`——命名空间不存在整卡不渲染，非"已安装未运行" `PluginCard.tsx:50` | 无安装清单；扩展是本地 TS 模块随加载生效，无 UI 层级 | 与 `exposed` 塌缩：`"enabled"` 布尔即代表安装+曝光（opencode.ai/docs/mcp-servers 抓取） | `/mcp` 面板服务器天然=已配置=已安装，无"已装未启用"态；deny 裸工具名="从上下文移除"近似卸载（code.claude.com/docs/en/permissions，"Manage permissions"/"Tool name wildcards"节） | `ExtensionEntry = ExtensionConfig & {enabled: boolean}`，仅一维 `goose_ext_types.ts:7-8` | `server.disabled` 单一布尔，无 installed 单列 `ServerRow.tsx:172-186,261` |
| `running`（`null`=不适用） | 无资源级 running；只有*调用级*状态 running/ok/error/stopped，语义是"这次工具调用的进度"而非"资源本身是否在跑" `SkillRow.tsx:14,63-70` | 无对照 | `status` 塌缩 running+health 于一个词：`connected/failed/disabled/needs_auth/needs_client_registration` `oc_mcp.tsx:11,20-26` | 同样塌缩：`✔ Connected/! Needs authentication/✘ Failed to connect/…`（/mcp 文档），无独立布尔 | 无对照——enabled 即视为"在跑" | `server.status: connected\|connecting\|disconnected` 三态，是六者中最接近"running"独立轴的实现，但无 `null`=不适用语义，恒定三选一 `ServerRow.tsx:277-281` |
| `exposed` | 无资源级 exposed；工具/技能行无"是否暴露给模型"开关 | 无对照 | `permission` 键（`allow/ask/deny`）与是否可见塌缩为一——deny 即不可见，无独立 exposed 位（opencode.ai/docs/permissions 抓取） | deny 裸工具名=从模型上下文整体移除，即 exposed=false，但由 deny 规则触发而非独立 toggle `permissions.md:64,105,191`（见上方 persisted 文件） | 每个 extension 仅一个 enabled 开关，兼代"运行"与"曝光"；工具级只有 permission 下拉，无 expose 开关 `PermissionModal.tsx:78-82` | `server.disabled` 对模型隐藏该服务器全部工具；per-tool "曝光"与"是否需要询问"合并成一个全有全无 toggle，且该 toggle 因后端做不到细粒度而被硬编码隐藏，见 D 节 `McpToolRow.tsx:13-17,59` |
| `health`（healthy/degraded/error） | 无对照 | 无对照 | 5 态映射 4 色：`success/error/textMuted(disabled)/warning(needs_auth)/error(needs_client_registration)`，无"降级"中间态，failed 与 needs_client_registration 同色 `oc_mcp.tsx:20-26` | 无颜色，纯符号+文字 `✔/!/✘/⏸/⊘` + `cached`；非黑即白，除 needs-auth 外无中间态 | 无对照 | 三色点 success(connected)/warning(connecting)/error(disconnected)，是六者最接近的实现，但 disconnected 常态化为 error 色而非中性 `ServerRow.tsx:276-282` |
| `provenance`（数组，来源+值+理由） | 无对照 | 无对照 | 文档语言"agent rules take precedence over global"，无运行时来源标注 UI | `/permissions` 每条规则标注来自哪个 `settings.json` 文件，是六者中最接近的实现 `permissions.md`"Manage permissions"节："The dialog lists all permission rules and the settings.json file each rule comes from" | 无对照 | `isAlwaysEnabled`+锁图标+tooltip "This server can't be disabled because it is enabled by your organization"——唯一一处"来源=组织"文字提示，但只服务单一不可配置态，非通用 trace `ServerRow.tsx:262,269-274` |
| `permission.trace` | 无对照（`PermissionRow` 只呈现当前生效 preset，不呈现推导链）`PermissionRow.tsx:41-63` | 无对照 | 文档"per-agent merged with global, agent rules take precedence"仅文字说明，无 UI trace | 规则求值顺序公开为文字："deny, then ask, then allow. The first match in that order determines the outcome"+按来源文件分组显示，是最接近的实现，但输出单值而非逐层 trace `permissions.md`"Manage permissions"节 | 无对照 | 无对照 |
| `source`（builtin/local-config/remote+uri/hash/version） | `RosterPreset.trust: 'system'\|'user'` 近似 builtin/local-config 二分，无 remote 态 `settings-store.ts:57,69` | 无对照 | `type: "local"\|"remote"` 直接对应（opencode.ai/docs/mcp-servers） | MCP 三级 scope 表附"Stored in"列（`~/.claude.json` / `.mcp.json`），是最接近的"来源位置"产品化文案（/mcp 文档抓取） | 无对照 | `server.config` JSON 含 url/command；`remoteConfigSettings.remoteMCPServers` 含 url+alwaysEnabled，区分"remote-managed(企业下发)"与本地配置，是六者中"source 三态"最落地的实现 `ServerRow.tsx:62-78,199-206` |
| `scope`（org/user/workspace/agent/session/invocation） | 无对照，只有当前用户 settings namespace 单层 | 项目信任按目录粒度、"closest saved decision on current or parent path applies"，是唯一"最近祖先目录覆盖"式继承，但只有二元 trust 非分层 effect（docs/security.md） | 仅 global/per-tool/per-agent 三级，且后两者是配置维度而非空间 scope，与契约的空间语义不同（opencode.ai/docs/permissions 抓取） | 两套并存：settings 5 级precedence（managed/CLI/project local/shared project/user）+ MCP 3 级（local/project/user），互不统一 | 单一"当前会话"scope，无持久多级 | 单一 VSCode 工作区设置一层，企业 managed 是唯一次级来源（`isAlwaysEnabled`） |
| `activation`（always/manual/user-invoked） | 无字面对照 | 无对照 | 连接后立即 available（近似 always），disabled=完全不激活，无"user-invoked/仅草稿"态 | 无独立字段；permission mode 决定"是否需要人工批准"接近 manual，但不是资源级 activation | ask_before 近似 manual，但语义是"每次调用都问"而非"是否需要用户主动触发使用" | 无对照 |
| `configurable` | 最接近实现：`PluginCard`/`PermissionRow` 的 `state.writable`，为 false 时禁用控件并显示"只读"文案 `PluginCard.tsx:52,72`；`PermissionRow.tsx:52,95` | 无对照 | 无独立标注；能否配置由"是否显示该控件"隐式表达 | 无独立标注 | 无对照 | `isAlwaysEnabled` → Switch `disabled` + 锁图标 + tooltip，是六者中"configurable=false"呈现最完整的实现 `ServerRow.tsx:262,269-274` |
| `defaultExposed` | 无对照 | 无对照 | 无对照 | 无对照 | 无对照 | 无对照——六者均只显示当前状态，无一呈现"默认值 vs 当前值"对比 |
| `characters` | 无对照 | 无对照 | 无对照 | 无对照（本次未验证 `/context` 类命令是否显示 token 估算，未查证不代入） | 无对照 | 无对照——六者均无"字符数且非 token"专用呈现先例 |
| `compatibility` | `RosterPreset.broken?: string`——"Why the preset cannot compose a session, absent when it can"，是最接近的"不兼容原因"字段 `settings-store.ts:76-77` | 无对照 | 无对照 | 无对照 | 无对照 | 无对照 |
| `mcp`（serverId/name/configHash） | 无对照 | 无对照 | `sync.data.mcp` 以 name 为 key，无 configHash 展示 `oc_dialog-mcp.tsx:30-44` | 服务器命名冲突警告提及 endpoint 细节，不展示 hash（/mcp 文档抓取） | 无对照 | `server.name`+`config`(JSON) 但不展示 hash；`isRemoteManagedServer` 靠字符串比较 url 而非 hash `ServerRow.tsx:65-78` |

**小结（比例）**：14 个字段 × 6 个产品 = 84 格，其中标"无对照"的格数约 47/84（约 56%）；有部分对照但形态不同（塌缩/近似）的约 31/84；完整对照 0 格。全无一处对照的字段：`defaultExposed`、`characters`；六者中有 ≥1 家较完整对照的字段：`configurable`（DSH/Cline）、`source`（OpenCode/Claude Code/Cline）、`provenance`（Claude Code/Cline）。

---

## B. 作用域与继承的呈现

| 产品 | 层级模型 | UI 呈现方式 | 三态开关？ | 冲突/冻结提示 |
|---|---|---|---|---|
| DSH | 单层（当前用户 settings namespace），无继承 | 无 tab；`PermissionRow` 是单一下拉选择当前 preset `PermissionRow.tsx:65-103` | 无（下拉是多值选择，非布尔三态） | `PluginCard` 在 `!state.writable` 时显示只读段落文案，不显示原因来源 `PluginCard.tsx:72` |
| pi-coding-agent 0.85.1 | 目录路径粒度："closest saved decision on current or parent path applies before the global default"（docs/security.md） | 无 GUI；决策存于 `~/.pi/agent/trust.json`，按目录键值查找，纯文档描述的行为，非可视化继承 | 无（二元 trust: ask/always/never，非三态开关） | 无"运行中冻结"概念；trust 只在会话启动时判定一次 |
| OpenCode | global/per-tool/per-agent 三级，"Agent-level permissions override global settings, with agent rules take precedence"（opencode.ai/docs/permissions） | 纯配置文件语言（`opencode.json` 的 `"permission"` 键），未见对应的 tab 化多 scope UI 实现 | 无（allow/ask/deny 三值枚举，非"继承/覆盖"二元开关） | 无对照 |
| Claude Code | 两套并存：settings 5 级 precedence（managed > CLI > project local > shared project > user）+ MCP 3 级（local/project/user），前者官方文档用"层级堆叠图"呈现（`code.claude.com/docs/en/settings` 的 `SettingsPrecedence` 组件），非交互式 tab | `/permissions` 对话框列出全部规则+来源文件名，不按 scope 分 tab 展示；deny>ask>allow 固定顺序，"rule specificity doesn't change the order" `permissions.md`"Manage permissions"节 | 无三态开关；规则要么在某 scope 的 allow/ask/deny 数组里，要么不在 | 无对照——本次抓取未见"存在活跃 Run/会话时权限面板冻结"的机制 |
| Goose | 单一"当前活跃会话"scope，无持久多级 | `PermissionModal` 抓取失败时区分 `no_session`/`fetch_failed` 两种空态文案，替代了"作用域"概念 `PermissionModal.tsx:195-210` | 无（三选一下拉 always_allow/ask_before/never_allow，非继承开关） | 无对照；`hasChanges` 脏检查+ Cancel/Save Changes 按钮组是"未提交变更"提示，但无 409/冲突语义 `PermissionModal.tsx:92-97,259-268` |
| Cline | 单层 VSCode 工作区设置，企业 managed 是唯一次级来源 | 无 tab；`isAlwaysEnabled` 时 Switch 置灰+锁图标+tooltip 说明原因，是唯一的"来源覆盖"提示 `ServerRow.tsx:262,269-274` | 无（标准二态 Switch） | 局部级：`Restart` 按钮在 `server.status==="connecting"\|\|isRestarting\|\|server.disabled` 时置灰 `ServerRow.tsx:232,403`；`isDeleting`/`isRestarting` 期间同一控件禁用——是"操作进行中锁定该控件"，非"整面板因活跃运行只读" |

**共同做法**：六者中无一实现"user/workspace/session 三个作用域 tab、对象列表在其下"的模式；凡涉及多层配置，均用**静态优先级说明**（文档表格/层级图/固定求值顺序文字）而非交互式切换 tab 呈现给最终用户。三态开关（true/false/null=inherit 的第三种视觉）在六者 UI 控件中**无一实现**——所有可见开关均为标准二态 Switch/Checkbox 或离散枚举下拉，未见专门表达"继承"的第三态图形。"运行中冻结整个权限/资源面板"的模式（对应 contract acceptance.md"While active Runs exist, runtime edits are frozen"）业界同样**无先例**，六者最多做到"单个操作进行中禁用该控件本身"（Cline 的 Restart/Delete、Goose 的 isToggling）。

---

## C. MCP 连接生命周期呈现

### 状态词清单

| 产品 | 状态词 | 坐标 |
|---|---|---|
| OpenCode TUI（sidebar） | `connected` / `failed` / `disabled` / `needs_auth` / `needs_client_registration` | `oc_mcp.tsx:11,16,20-26,61-69` |
| OpenCode TUI（dialog-mcp 选择器） | 与上共用 `status.status`；另有布尔 `Status` 组件三态：Loading(`⋯`) / Enabled(`✓`) / Disabled(`○`)——这是"是否启用"轴，与 connection status 是两个独立展示位 | `oc_dialog-mcp.tsx:10-19,37-43` |
| OpenCode（文档，CLI） | `opencode mcp list` 显示"所有服务器与认证状态"；OAuth 自动检测：检测到 401 → 触发 RFC 7591 动态客户端注册 | opencode.ai/docs/mcp-servers 抓取 |
| Claude Code `/mcp` | `✔ Connected` / `! Needs authentication` / `✘ Failed to connect` / `⏸ Pending approval`（项目级 `.mcp.json` 未批准）/ `✘ Rejected`（被 `disabledMcpjsonServers` 阻止）/ `⊘ Disabled for this project` / `cached`（远程 HTTP/SSE 延迟到首次调用才连接） | code.claude.com/docs/en/mcp 抓取 |
| Cline | `connected` / `connecting` / `disconnected`（三色点）+ 独立 `server.error` 字段（非空即接管整卡视图） | `ServerRow.tsx:277-282,285-317` |
| Goose | 无连接健康状态；扩展只有 `enabled` 布尔，`platform` 内置项硬编码塞入列表 | `PermissionSetting.tsx:72-77` |
| DSH | 无 UI 状态词；后端 `mcp-client` 的重连策略是纯配置对象（`enabled/initialDelayMs/maxDelayMs/maxAttempts`），机制形状与 Claude Code 文档描述的指数退避相似，但零面向用户的呈现 | `connection.ts:27-45` |
| pi-coding-agent 0.85.1 | 无——"it intentionally does not include built-in MCP" | docs/usage.md:309 |

### 连接按钮文案

| 产品 | 文案 | 坐标 |
|---|---|---|
| Cline | "Restart Server" / "Restarting..." / "Retry Connection" / "Retrying..." / "Authenticate"（`oauthRequired && oauthAuthStatus==='unauthenticated'` 时替代 Retry）/ "Delete Server" / "Deleting..."；disabled 态直接把按钮文案整体替换为 "Server Disabled" 而非仅置灰 | `ServerRow.tsx:288-317,406-410` |
| Claude Code | "Reconnect"（仅 `cached` 态可用，"connects it now rather than on its first tool call"）/ "Clear authentication"（撤销该服务器授权）/ 面板内 toggle off-on（"stop Claude Code from connecting to it without losing its configuration"） | /mcp 文档抓取 |
| OpenCode TUI | 单一 `"toggle"` 动作（`dialog.mcp.toggle`），无独立 connect/disconnect/restart 三分——与 RC-6「connect/disconnect/restart 是 lifecycle 按钮（文字）」不同实现路径 | `oc_dialog-mcp.tsx:47-72` |

### 远端工具列表缩进与命名

| 产品 | 呈现 | 坐标 |
|---|---|---|
| Cline | `VSCodePanelTab` 三分 Tools(N)/Resources(N)/Prompts(N)；工具行用 `codicon-symbol-method` 图标，3px 内边距缩进；参数另起带边框卡片展示，必填参数标 `*` | `ServerRow.tsx:322-347`；`McpToolRow.tsx:46-58,80-90` |
| Claude Code | 服务器行附"· 12 tools"计数，并"flags servers that advertise the tools capability but expose no tools"；工具展开列表本身未在本次抓取中核实（文档未展示截图级细节，标 unverified） | /mcp 文档抓取 |
| OpenCode TUI | sidebar 与 dialog 均以**服务器**为粒度一行，不展开到工具级列表 | `oc_mcp.tsx:47-75`；`oc_dialog-mcp.tsx:33-45` |

### 失败与 unknown 文案

| 产品 | 处理 | 坐标 |
|---|---|---|
| Claude Code | 失败态附加"HTTP 状态码或错误码 + 服务器返回的错误文本"，并**主动脱敏**："Claude Code redacts credential-like text from this detail" | /mcp 文档抓取 |
| Cline | `server.error` 原始字符串直接展示，未见脱敏处理 | `ServerRow.tsx:287` |
| OpenCode TUI | `failed` 态用斜体展示 `item.error` 原始文本，未见脱敏 | `oc_mcp.tsx:64` |
| 三者共同点 | **均无 "unknown" 专用状态词**；耗尽重试预算后统一归入 `failed`/`needs_auth` 二选一。Claude Code 重连耗尽后："After five failed attempts, Claude Code marks the server as failed... You can retry manually from `/mcp`" ——**均以"重试"为默认恢复动作**，找不到"需先核对，不出现 Retry 按钮"的先例 | /mcp 文档抓取；`oc_mcp.tsx:61-69`；`ServerRow.tsx:299-306` |

---

## D. 可迁移行与禁区

逐行标注适用 SE 面（runtime 面板 / Settings / Run details / composer 草稿），RC 冲突处仅引原文不裁决。

| # | 观察 | 来源 | 适用面 | 与 RC-1…10 对照（仅引原文） |
|---|---|---|---|---|
| 1 | per-tool 曝光开关因后端只能做到全有全无（`useMcp` 单一全局动作），被开发者显式硬编码隐藏而非画出来禁用；代码注释直陈原因 | `McpToolRow.tsx:13-17,59`；`aa_constants.ts:28-33` | runtime 面板 exposed/permission 控件 | RC-2「acceptance.md：不得从勾选态推断权限」；intake.md「RC-1…RC-10」节 DC-11「无能力不画控件」 |
| 2 | `isAlwaysEnabled` 时开关置灰+锁图标+纯文字 tooltip 说明来源，不用颜色 | `ServerRow.tsx:262,269-274` | runtime 面板 configurable=false 呈现 | RC-3「provenance...不用颜色表达来源」 |
| 3 | 失败态整卡替换为原因+按钮组，而非在原行内叠加提示条 | `ServerRow.tsx:285-317` | runtime 面板 MCP 服务器行 | 无直接冲突，供参考 |
| 4 | disabled 态按钮文案整体替换为"Server Disabled"，而非仅置灰保留原文案 | `ServerRow.tsx:406-410` | runtime 面板 | 无直接冲突 |
| 5 | 侧栏按"N active, M error"折叠摘要，服务器数 >2 才允许折叠 | `oc_mcp.tsx:11-18,32-46` | runtime 面板（侧栏/摘要区） | 无直接冲突 |
| 6 | connect/disconnect 合并为单一 toggle 动作，无独立 restart | `oc_dialog-mcp.tsx:47-72` | runtime 面板 MCP lifecycle | RC-6「connect/disconnect/restart 是 lifecycle 按钮（文字）」——实现路径不同，仅记录 |
| 7 | 失败详情"HTTP 状态码/错误码 + 主动脱敏 credential-like text" | /mcp 文档抓取 | runtime 面板 MCP 错误展示 | RC-6 未提及脱敏规则，仅记录空白点 |
| 8 | `/permissions` 每条规则标注来源 settings.json 文件名 | `permissions.md`"Manage permissions"节 | runtime 面板 provenance 一行 | RC-3「每个值旁一行 provenance...不用颜色表达来源」——同样是文字不是颜色，方向一致 |
| 9 | deny>ask>allow 固定顺序，"rule specificity doesn't change the order" | 同上 | Settings/runtime 面板 effect 说明文案 | architecture.md「Policies use last matching rule inside each scope and the most restrictive effect across scopes」——两者优先级模型不同（Claude Code 是纯顺序优先级，contract 是"scope 内最后匹配+跨 scope 取最严格"），仅记录对照面 |
| 10 | `hasChanges` 脏检查 + Cancel/Save Changes 按钮组管理未提交编辑 | `PermissionModal.tsx:92-97,259-268` | runtime 面板/Settings 编辑态保存流程 | RC-4「保留用户未提交的编辑为草稿，不自动重发」——Goose 是显式 Save/Cancel，无 409/revision 语境，形状类似但机制不同 |
| 11 | 乐观更新 Switch + 失败回滚视觉状态（`visuallyEnabled` 与 `extension.enabled` 分离） | `ExtensionItem.tsx:36-59` | runtime 面板 exposure 开关失败处理 | 无直接冲突 |
| 12 | `state.writable=false` 时展示只读提示文案而非仅 disable 控件 | `PluginCard.tsx:72` | Settings 扩展区 configurable=false 呈现 | 无直接冲突 |
| 13 | 切到高权限 preset 前二次确认+"acknowledge"复选框风险门 | `PermissionRow.tsx:104-123` | Settings 权限预设切换 | 无直接冲突，供风险类操作参考 |
| 14 | 项目信任按"最近祖先目录"路径覆盖继承，二元 trust 非分层 effect | docs/security.md | 架构参考（pi 无 GUI 呈现） | 与 RC-3 的空间 scope tab 模式不同维度，仅记录 |
| 15 | "per-agent 合并 global，agent 规则优先"纯文字说明，无 tab 化多 scope UI | opencode.ai/docs/permissions 抓取 | 对照 runtime 面板 scope 呈现选型 | RC-3「面板顶部是 user/workspace/session 三个作用域 tab」——业界无此形态先例，为空白点非冲突 |
| 16 | MCP 三级 scope 用"Loads in/Shared with team/Stored in"三列表格而非 tab | /mcp 文档抓取 | 对照 runtime 面板 scope 呈现选型 | 与 RC-3 tab 化方案是不同实现路径，供参考 |
| 17 | 六产品均无"字符数且标注非 token"专用文案先例 | 见 A 节 `characters` 行 | runtime 面板/Settings 上下文展示 | RC-5「无 token 数，显示字符数并注明'字符，不是 token'」——contract 内生裁定，业界无先例可查 |
| 18 | 六产品均无"unknown/需先核对，不出现 Retry 按钮"先例，均以"重试"为默认恢复动作 | 见 C 节"失败与 unknown 文案" | runtime 面板 MCP 错误/409 处理 | RC-4「unknown 远端效果显示'需先核对'，不出现 Retry 按钮」——业界通行做法相反（提供重试按钮），仅记录对照不裁决 |
| 19 | 六产品均无"运行中冻结整面板"先例，最多做到"单控件操作中禁用自身" | 见 B 节"冲突/冻结提示" | runtime 面板 active_run 呈现 | acceptance.md「While active Runs exist, runtime edits are frozen」——contract 内生裁定，业界无先例可查 |
| 20 | 六产品 UI 控件均为标准二态 Switch/离散枚举下拉，无一实现"三态开关图形" | 见 B 节"三态开关？" | runtime 面板 exposed 控件 | RC-2「用文字'沿用上级'而非第三态开关图形」——业界确无三态开关先例，仅记录对照，不裁决字面是否因此成立 |

---

## 摘要（回复用，勿誊入本文件）

- 字段对照比例：14 字段 × 6 产品 = 84 格，"无对照"约 56%（47/84），部分/近似对照约 37%（31/84），完整对照 0 格；`defaultExposed`/`characters` 全无对照。
- 三级作用域共同做法：六者均无 user/workspace/session 三 tab 呈现，均用静态优先级表格/层级图/固定求值顺序文字代替；三态开关（含 inherit 视觉）业界无实现先例；"运行中冻结整面板"业界无先例。
- MCP 状态词清单：OpenCode `connected/failed/disabled/needs_auth/needs_client_registration`；Claude Code `Connected/Needs authentication/Failed to connect/Pending approval/Rejected/Disabled for this project/cached`；Cline `connected/connecting/disconnected`+独立 `error`；Goose/DSH/pi 均无连接健康呈现。
- 与 RC-1…10 冲突/对照条数：D 节共 20 条，其中直接引用 RC 原文对照的 9 条（#1,2,6,8,9,10,15,17-20 中的多条重叠计），业界确无先例（非"冲突"而是"contract 内生裁定，无处比对"）的 3 条（RC-2 三态开关、RC-4 unknown 免重试、RC-5 字符数注记、RC-4 运行中冻结，共计 4 条），实现路径不同但方向一致的 2 条（RC-3 provenance 文字化、RC-6 lifecycle 按钮）。
