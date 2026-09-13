# 信息架构文案盘点 · Settings / Runtime / Home

2026-09-13 · 只读源码审计。开工时 `main` HEAD 为 `449877d5a99b4fd7b4f140d2b895de2cd0f504a5`；Astra 后续在共享工作树进行的 IA 改动尚未固化为提交。以下把开工时观察与当前工作树状态分开，避免把施工候选称为已合流。读取了 [frontend contract](../agent-interface-2026-09-10/frontend-contract.md)、[copy convention](../copy-convention.md) §1–3.6，以及 precedent map 中 `settings.navigation` / `home.composition` 和 implementation precedents 中 Settings 属性行、Runtime resource inspector、Home 状态投影。以下是有限的 Settings/Runtime/Home 文案与披露层库存，不是全库字符串审计，也不是浏览器视觉接受。

## 最优先的具体收敛点

**P1 · Settings › Developer › Unavailable capabilities**（`app/web/settings-view.mjs`：`PLANNED_CAPABILITIES`、`renderPlanned`; mount 位于 `app/web/index.html` `#settings-developer`）。开工时此列表是常驻的 8 行，组头叫 `Planned`，解释 runtime contract / host adapter、逐项解释实现原因并重复 `Backend pending`。对象与“现在不可用”状态有用；host adapter、workflow runner、executable hook point 等实现原因是技术来源或内部实现细节。

**当前工作树已采用主要收敛**：组摘要变为 `Unavailable capabilities` 并放入默认关闭的原生 `<details>`；组内前导为 `Not available in this host.`，行尾状态为 `Not available`，移除 `Backend pending`。Runtime 的 Skills/Tools pane 也把 unavailable rows 放进 `Unavailable capabilities` disclosure；没有为缺失能力造按钮。该改动让实现理由按需查看，不承诺排期。`index.html` 同时新增常显句 **“Only host-trusted extensions load; third-party code is not sandboxed.”**，因此插件隔离风险不再依赖打开列表才可发现。安全边界保留的作者方案仍待运行和非作者验证。

以下语义不能跟着收起，且应留在发生决策的产品表面：

- **Third-party plugin isolation**：当前 Developer 面板有常显句 “Only host-trusted extensions load; third-party code is not sandboxed.”。“第三方代码未沙箱隔离”是安全边界，必须保持常显；不能因其能力状态在不可用列表中而收起风险句。
- **MCP OAuth**：Settings › Tools & Integrations › Adding an MCP server 的可见说明写明 “only unauthenticated Streamable HTTP is supported.”。只支持未认证 server 的限制直接影响接入/认证预期，须留在此操作上下文的首层；不能把 unavailable 简化成仿佛支持认证连接。
- **Memory providers**：保留 Attention 当前读取 retained conversation messages、外部/派生 provider 缺失的范围事实，避免“Memory 不可用”被误读为完全没有保留对话。
- **Per-source token counts**：保留 work inspector 的 Usage 是 reported tokens、source 单项仍以 characters 计的口径差异，不能把“暂无 token 分项”写成零或已覆盖。

其余 `MCP stdio transport`、`Workflows`、`Hooks`、`Registries` 的“本 host 当前不支持”状态仍可见；其“本地进程无法被启动/监督”“没有执行器”“没有可执行 hook point”“尚未实现包解析/签名”等后端原因可在 disclosure 内检查。这里没有安全依据将 unavailable 的事实改成笼统的“Planned”；也没有事实支持对可用日期作承诺。

## 相邻 surface 与必须保留的边界

| Surface / 符号 | 当前首层文案与披露 | 审计判断 / 建议 |
|---|---|---|
| Settings 分组（`settings-view.mjs` `SETTINGS_GROUPS`; `index.html` panels） | `General`、`Appearance`、`Models`、`Tools & Integrations`、`Skills`、`Memory`、`Permissions`、`Keyboard`、`Developer`；Runtime 位于 Developer | 保留按用户任务划分的分组，不把 Runtime 升为一般配置的顶层组。copy convention §3.6 将 `Runtime`、`composition`、`profile` 等列为 Developer/代码词；既有 `settings.navigation` precedent 也禁止无 owner fact 的占位设置项。Astra diff 将 Runtime 顶部摘要改为 “Configuration for future runs and records of what past runs used.”；Composition 另留有 “saving its configuration does not grant permissions or accept work.” 边界。 |
| Settings › General › Data（`settings-view.mjs` `renderData`） | 默认只读；`Host details` disclosure 内含 “Data directory”、“Adapter”、“Host state”、“Tools” 及 `Not reported` / `Not loaded` | 这是合适的先例：事实未知时说未知，主界面不摊开 host 字段。继续保留 disclosure，不把 unknown 改成空值/零。 |
| Runtime Overview（`runtime-view.mjs` `renderOverview`、`scopeStrip`） | Overview 仍有 Refresh、`Profile` id/status、`Adapter` id、exposed count、active runs 与 `Attention`；scope tabs 后显示 “Editing the … layer.” 或 “No writable scope.” | 当前 diff 将 scope id/revision 与 precedence 次序移入受控 `Scope details` disclosure；并在 tabs 邻处保留 “Narrower scopes cannot loosen a wider deny or ask.”。已满足技术标识延后、权限警告常显。Profile/Adapter id 仍是 Developer 内默认可见的技术事实；可在后续证据支持下收敛，但不得移走 profile compatibility / exposed / ask 风险等决策事实。 |
| Runtime 资源默认来源与异常（`runtime-view.mjs` `exposureLines`、`attentionItems`） | default source match 的常规 provenance 不再每行重复；source/requested/effective/bound inspector 仍能看到来源。非默认 provenance、parent gate、profile ceiling、effective value 不一致及可用 `Inherit` 动作保留近控件显示。 | 当前 diff 的 `routineDefault` 只跳过可配置、无 parent gate、`source default` provenance 且其值与真实 exposed 值一致的常规来源句；例外继续解释。这是可接受的源文案去重，需差分覆盖有/无 override 与 gate，防止误藏影响请求是否生效的原因。空 Attention 文案变为 “No resource issues reported.”；有风险项时仍逐项显示。 |
| Runtime 权限与 scope 编辑（`runtime-view.mjs` `scopeStrip`、`renderPermissions`、`permissionExplainer`、`attentionItems`） | scope controls 前显示 “Narrower scopes cannot loosen a wider deny or ask.”；Permissions 说明 requested/effective/host ceiling/bound-run 是四种不同读数；Attention 在有 ask 时点名 exposed capability 并提供 `Open` | 保持该风险句、`Effect` 与每次调用重查 policy 的说明常显；它们不应藏进仅诊断用的 disclosure。scope precedence 完整顺序现位于 `Scope details`，编辑时安全边界仍常显。验证需确认 `ask`、`deny`、host ceiling、未受信任插件或 profile 不兼容有实际值时仍作为对象化例外显示；不要把 exposed 改写成 permitted。 |
| Home 加载失败（`home-view.mjs` `renderHome`，error branch） | `Local runtime unavailable` + `Retry`；原错误文本在默认关闭的 `Details` disclosure | 结构已经保留状态、恢复动作及技术诊断的渐进披露。若后续按产品 copy contract 收敛，可用面向任务的 “Could not load your work” 作为首层对象/状态，`Retry` 不变，`Details` 改为 `Connection details`；底层 host 原句仍可检查。若错误本身表示授权/权限拒绝，则必须把该阻塞原因留在首层，不能被通用错误标签掩去。 |
| Home 导航动作（`index.html` `#home-button`; `app.mjs` `setAction(..., "house", "Home")`） | Home 文本动作配语义图标 `house` | 保持现有语义图标映射；不以 `message-square` 或自绘字符替代房屋图标。 |
| Home Attention 预览（`home-view.mjs` `attentionCard`） | 项目范围、title、status、reason、`Next:` action；当前 diff 将 `Revision` 从常显更新时间行移入 `Recorded context` disclosure | 保留对象、状态、原因、下一动作和范围并列；Revision 是精确记录识别信息，按需披露可接受。不要把预览变成 raw Runtime inspector，也不要为减字移除 `reason` / `Next`。 |

## 最近先例与后续验证

- `settings.navigation`：`precedent-map.md` §1；实现近例 `settings-view.mjs` `SETTINGS_GROUPS`、Settings 搜索/导航及 `settings-navigation.test.mjs`。
- Runtime inspector/disclosure：`engineering/mvp/execution/work-surface-kit/evidence/wk11/rc/runtime-ui-checks.mjs` 中 `permission-trace`、`source-identity`、`unsupported-kinds` 和 `selection-not-exposure` 检查；对应 `runtime-workbench.test.mjs` 验证 `attentionItems` 会显式生成 health、ask、trust、missing 与 profile compatibility 例外。source/provenance 在 resource disclosure 内，不以普通行文字代替。Astra 当前 `routineDefault` 与 scope/unavailable-details 改动仍是共享工作树变化，需行为/浏览器复核，特别核对 override、profile/parent gate、ask/deny，以及 details 开合在重绘后保持。
- Home 状态与模块：`precedent-map.md` §1 `home.composition`、[Home composition contract](../../mvp/execution/work-surface-kit/contracts/home-modules.md)、`home-view.mjs`。`home-presentation.test.mjs` 的 “changed facts, removed targets, filters, and errors” 覆盖当前错误显示；其 tiny DOM 断言不能证明 native disclosure 的浏览器行为。

本轮未改产品、未运行测试、未操作浏览器。作者的 [ia-targeted evidence](evidence/ia-targeted.txt) 记有 80/80 定向通过；我只读取此日志，不将其报作独立执行或浏览器接受。后续验证仍应检查 8 个对象及 unavailable 状态可发现、没有虚假按钮、插件无 sandbox 风险在 Developer 首层可见，以及 MCP 未认证限制在 Tools & Integrations 的添加上下文可见、Memory 与 token 口径在各自表面保留；Runtime browser suite 检查 scope warning、ask/deny effect、permission trace、source disclosure、override/gate 例外和 scope/unavailable `<details>` 在重绘后开合保持。Home 已把 Attention Revision 移入 `Recorded context`；如果调整加载错误文案，仍需验证 Retry 与原错误披露可达，且以实际 permission error fixture 覆盖任何授权失败摘要规则。
