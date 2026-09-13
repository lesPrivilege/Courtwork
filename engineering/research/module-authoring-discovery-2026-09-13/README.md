# 可自定义 Runtime 资源的登记、检索与 Agent 草稿

2026-09-13 · Luna 有界调研与代码映射。只读核验；不改产品、schema、适配器或架构。隔离任务分支起点为 `2d1ab68`；实际代码映射读取于产品提交 `c1bdaa9`。Luna未修改父任务产品文件。

## 判断

“Settings 里有一行”不代表它是可安装模块。Runtime 枚举 18 种资源，其中仅 `instruction`、`skill`、`reference`、`prompt_template`、`agent_profile`、`mcp_server` 接受导入；`memory_provider`、`workflow`、`hook`、`registry` 明确是 adapter-required。Provider、Model、Secret、Sandbox、Permission Policy、session context 等是 Host 事实或配置面，不应被包装成可注册的包目录。[控制面枚举与导入边界](../../../app/runtime/control-plane.mjs#L7) · [Runtime 支持矩阵](../../../docs/runtime-control/INDEX.md#resource-coverage)

成熟实践把搜索目录、写入本机配置、取包安装、连接远端服务、加载代码、对模型开放、授予调用权限分开。Courtwork 已有多数本地接缝；这轮最小缺口是普通上下文资源的 Settings 写入口，不是新的 Module Hub 或通用 Registry 后端。

## 术语边界

| 动词 | 应表示的事实 | Courtwork 对应边界 |
|---|---|---|
| Search / Discover | 在目录中找候选；命中不改变状态 | Settings 已有本机行搜索。没有远端 Marketplace 搜索或全文查询 API。 |
| Register / Add / Save | 把本地内容或配置记入资源目录 | Runtime `put`；新条目可以先保持不 exposed。 |
| Install | 获取并解析特定包版本及文件 | 通用安装器不存在；resolver 对 locator 明确返回 unsupported。 |
| Connect | 建立 MCP 会话并发现远端能力 | 配置已保存后显式 Connect；连接本身不等于模型可见。 |
| Load / Activate | 启动可执行扩展代码 | Plugin 需显式 Load；本地包是 host-trusted、同进程执行，不是沙箱。 |
| Expose / Enable | 让资源进入相应 Host/模型范围 | Scope exposure 是独立状态，按下个 Run 生效；也不会授予工具调用权限。 |
| Configure permission | 为具体 action/resource 设 allow/ask/deny | Runtime policy 与工具执行器持有；Skill 的 `allowed-tools` 只是声明。 |
| Build with agent | 生成等待人审的源稿 | 只产出文本；人审、resolver 预览、scope/revision 确认后才可 Save。 |

因此 MCP 的“Add config → Connect → Inspect → Expose/Policy”不能叫一次 Install；Plugin 的“Preview → Trust → Register”尚未运行，运行要再显式 Load；Prompt Template 的 Use 只把文本交给人审草稿，不启动 Run。既有实现文档也将配置、连接、曝光、权限分别表示，并要求新适配器声明 provenance 和 lifecycle owner。[Runtime 架构合同](../../../docs/runtime-control/architecture.md#ownership)

## 核验出的 10 个可复用实践

| # | 一手实践 | 对 Courtwork 的可用启示 |
|---|---|---|
| 1 | VS Code 的 Marketplace 列表显示简述、发布者、下载量与评分；搜索可按标题/metadata、类别、标签过滤，条目详情再展示唯一 ID。[Marketplace](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace) | 本机已装清单可搜索标题/ID/kind；远端“搜到”必须仍是候选，不隐含 Save/Install。 |
| 2 | Claude Code 先 Add marketplace（只登记目录），再从 Discover 逐个 Install；管理器分 Discover、Installed、Marketplaces、Errors。[插件发现与安装](https://code.claude.com/docs/en/discover-plugins) | 目录登记与资源落地可分，但 Courtwork 当前没有 Marketplace adapter。 |
| 3 | 包 manifest 具有唯一稳定身份与版本/兼容性：VS Code 使用 publisher/name、SemVer 与 engine range；Claude plugin manifest 描述 name/description/version；MCP `server.json` 用标准身份、版本与 package metadata。[VS Code manifest](https://code.visualstudio.com/api/references/extension-manifest) · [Claude plugin manifest](https://code.claude.com/docs/en/plugins) · [MCP server.json](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md) | 不能仅靠显示名识别候选；未来 package adapter 必须讲清来源、版本与目标能力。现有 local resource ID 与 kind/scope 绑定，不等于第三方包版本系统。 |
| 4 | VS Code 安装第三方扩展时要求确认发布者信任，并验证 Marketplace 签名；MCP 官方 Registry 发布还要验证命名空间与底层包所有权，且仅接纳受限公共包源。[VS Code Marketplace](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace) · [Registry 发布校验](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md) | “来源来自目录”不是信任凭据。现有本地 Plugin 明示 host-trusted；不应把它宣传成签名验证或 OS 隔离。 |
| 5 | VS Code 可全局或按 Workspace 禁用/启用；Claude 插件安装也选择 scope。安装存在与当前 scope 可用是不同状态。[VS Code 管理](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace) · [Claude 插件发现](https://code.claude.com/docs/en/discover-plugins) | 保留已有 User/Workspace/Session scope；不要把 profile selection、exposure 或 permission 合成一个总开关。 |
| 6 | 更新、回退和卸载是明确 lifecycle：VS Code 支持版本选择/更新/卸载，启停或更新后可能需重启；Claude marketplace 有显式 refresh/update，再 reload 插件。[VS Code Marketplace](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace) · [Claude marketplace](https://code.claude.com/docs/en/plugin-marketplaces) | UI 只展示已实现的生命周期。当前本地 Plugin 能 Register/Load/Unload/Reload/Invalidate，但没有包更新/删除/依赖安装。 |
| 7 | Backstage Catalog 元数据通常与代码同库、源文件是 source of truth；用户可注册已有 YAML URL、从模板创建或接外部发现源。Catalog 提供归属与发现，不执行软件。[Catalog](https://backstage.io/docs/features/software-catalog/) · [Descriptor schema](https://backstage.io/docs/features/software-catalog/descriptor-format/) | Courtwork 的本地 Settings inventory 与外部 catalog 是两件事；不应假装已有外部目录。 |
| 8 | Backstage Template 用版本化 YAML descriptor 声明 metadata、输入参数和有序 backend actions；生成结果可以再单独注册回 Catalog。[Template 写法](https://backstage.io/docs/features/software-templates/writing-templates/) | 模板输入检查、生成和最终登记是不同阶段；Build 结果不能因为可解析就静默保存或执行。 |
| 9 | n8n AI Builder 允许自然语言创建、改写、debug，再让人检查 credentials/参数并继续 refine；文档明示发送给模型的是 prompt、node definitions/parameters/connections 和已载入的 mock data，不含 credential details 或过往执行。[AI Workflow Builder](https://docs.n8n.io/build/ways-of-building-workflows/ai-workflow-builder) | 生成 UI 要告诉人“模型看到什么”，把结果留在可编辑预览。此项是 n8n 的产品文档描述，不是对其他 Provider 的隐私保证。 |
| 10 | n8n 自动保存草稿；显式 Publish 才把一个版本送入 production，线上触发器使用已发布版本，未发布编辑保留为 draft。[Save and publish](https://docs.n8n.io/build/understand-workflows/save-and-publish-workflows)；模板库另有 browse/search/import 接口，组织自建目录须提供兼容 API。[Templates](https://docs.n8n.io/build/ways-of-building-workflows/use-templates) | Build 与 Save、Save 与 activation 必须分开；给“市场搜索”加 UI 而没有提供目录查询 adapter 不会产生功能。 |

## 当前代码可直接消费的边界

| 对象 | 已有接缝 | 近期 UI 可复用什么 | 不能暗示什么 |
|---|---|---|---|
| Instruction / Reference / Prompt Template | Control plane 已允许 `put/remove/exposure`；source resolver 可校验 inline；API 返回本地目录；Prompt invoke 是 `draft-only`。[control-plane](../../../app/runtime/control-plane.mjs#L116) · [HTTP API](../../../docs/runtime-control/api.md#http-contract-protocol-v1) | 在既有 Runtime Context 组补普通新增/编辑/移除表单，复用 `runtime-intake` 的 local draft、Host resolver 预览、scope、CAS revision、`resourceRow` 与现有 Settings-wide Search。首次保存沿 Skill/MCP intake 先不 exposure。 | `put` 是保存，不是安装；模板调用不送出、不启动 Run。 |
| Skill | Settings Context 目前只有 `intake.view("skill")`；Add Skill 支持 SKILL.md 与目录选择，但 supporting files/scripts 不导入或执行。[runtime-view](../../../app/web/runtime-view.mjs#L1773) · [intake](../../../app/web/runtime-intake.mjs#L3) | 原样复用现有 Add / Review / Save / Edit 与按需加载语义。 | `allowed-tools` 不授权；不等于 skill package/asset installer。 |
| MCP Server | 有 Add/Edit config、inline syntax preview、save；Service 另有显式 connect/disconnect/restart。[intake](../../../app/web/runtime-intake.mjs#L24) · [service](../../../app/server/service.mjs#L404) | 保留配置、连接、能力目录、exposure 和 policy 的分步呈现。 | 不能宣称有公共 MCP Registry 搜索、OAuth/stdio 或“连接即可执行”。 |
| Local Plugin | Preview manifest/文件摘要/hash → 人确认 host trust → Register reviewed byte snapshot；页面明确写 Register 不执行，须再 Load。[local-extension-view](../../../app/web/local-extension-view.mjs#L18) · [service lifecycle](../../../app/server/service.mjs#L1374) | Plugins 只显示资源事实；本地登记及 Load/Unload/Reload/Invalidate 留在 Developer › Host Extensions。Search 查已登记资源。见[Settings resource management 回执](../../../engineering/design/settings-resource-management-2026-09-13/README.md)。 | 无依赖安装、sandbox、远端市场、包更新/删除。 |
| Agent Profile | 已有 JSON schema 校验、Developer 内编辑器与独立 Profile selection；profile 仅限制现有能力/上下文。[control-plane](../../../app/runtime/control-plane.mjs#L79) · [editor](../../../app/web/runtime-view.mjs#L1562) | 仍走专用 profile editor/selector。 | 不能当作普通 exposure row，不能授权、安装插件或注册 renderer。 |
| Workflow / Hook / Registry / Memory Provider | 枚举有名，但 UI 将它们列作计划项；Runtime Index 标为 adapter-required。 | 只保留清楚的 unavailable 状态；做目录搜索前先有真实 source/runner adapter。 | 不加空壳 Add/Install/Enable 控件。 |
| Provider / Model / Secret / Sandbox / Policy / Session Context | 由各自 Service/Core/Host 拥有并投影到 Runtime snapshot。 | 留在其现有配置与只读事实面。 | 不把 Settings 中的所有 Runtime row 汇总为“模块市场”。 |

现有 Settings Search 已在本页的 DOM 行上做本地子串过滤；运行时行会参与搜索，输入唯一匹配后 Enter 可打开条目。它不是外网目录查询。[Settings search](../../../app/web/settings-view.mjs#L2052) API `GET /runtime-resources` 仅接受可选 `kind` 参数，且 resolver locator 会返回 `unsupported`，不会访问 URL/path、拉包或安装。[service list](../../../app/server/service.mjs#L437) · [source resolver](../../../app/runtime/source-resolver.mjs#L18)

## 最小可执行切片建议（待 Astra 裁决）

1. **先补本地登记入口，不新造后台。** 在现有 Runtime Context 分组为 Instruction、Reference、Prompt Template 增加 Add/Edit/Remove；Skill 保留已有 intake，Profile 保留 Developer 专用编辑器。复用现有 Settings-wide 搜索和资源行，注册后的条目自然进入本地搜索。没有理由再造独立 Module Hub 或第二个全局搜索入口。
2. **保存路径沿既有 Host 合同。** 先选目标 scope，Review 调用 `POST /runtime-sources/resolve`，展示解析到的 kind、源 hash、未验证来源/声明及诊断；用户确认 Save 后以当时 revision 走 `PUT /runtime-control` 的 `put`。新内容先显式 `exposed:false`，曝光继续用独立操作；编辑保持原 ID/kind/scope，删除明确确认后走 `remove`。CAS 冲突须刷新并重新检查，不能自动重发。
3. **Build with agent 只做四类文本源的待审草稿。** 第一片限 Instruction、Skill、Reference、Prompt Template；Profile 暂留专用表单，插件/MCP/Workflow/Hook 代码或连接配置不由普通生成按钮直接注册。生成内容保持未保存，用户必须选“Review as …”、确认 title/kind/scope，再经过同一 resolver 预览和人工 Save。普通生成 Chat 自身照常运行 Run；Build 动作不得自动 put/remove/exposure、Connect、Load、Invoke 或执行生成物。
4. **不要覆盖现有 composer。** `applyComposerDraft` 会替换当前 composer 值；Build 入口应开一个普通新 Chat，或先明确征得“替换此草稿”选择并保留可恢复原文。当前 `createSession` 只创建普通会话，`applyComposerDraft` 只放入文本草稿；二者都不登记 Runtime resource。[composer draft](../../../app/web/app.mjs#L5474) · [new session](../../../app/web/app.mjs#L6413)
5. **暂不加远端 Registry Search。** 等 registry adapter 有可核验的目录 schema、来源/版本/完整性、更新/删除与错误语义后再加；当前 resolver 的 declared origin 是 `verified:false`，远端 locator 不读取。

建议该片验收以三项行为反例为准：草稿只在用户明确确认后写入且新内容未曝光；输入变化后旧 preview 不能 Save；坏 schema/过期 revision 保留草稿并阻止静默提交。插件/远端注册若未来加入，另按其实际信任与运行合同验证。

## 消费状态

Astra 已消费其中的本地登记切片：在现有 Skills 的 runtime intake 中加入 Instruction、Reference、Prompt Template 类型选择，并让四种文本资源共用 Add/Review/Save/Edit、resolver/CAS、首次保存 `exposed:false` 和现有 Search；未新建 Module Hub 或第二套搜索。[设计与验证回执](../../../engineering/design/settings-resource-management-2026-09-13/README.md)记录了定向 HTTP readback 与浏览器输入、搜索、编辑证据。该交付未实现删除 UI、远端 Registry 搜索或 Build with agent 草稿回流；本节只是当前消费状态，不替代后续裁决。

## 来源记录

Exa 14 个定向查询共返回 47 个候选结果；去重后直接读取 15 个官方产品/协议页面，覆盖五个上游系统。来源质量均为维护者或规范所有者的一手运行/格式文档，适合核验流程与字段；它们不是独立效果研究或跨产品安全认证。MCP Registry 指南标注 Preview；n8n AI Builder 与模板库文档也包含计划/可用性变化描述，因此只借其显式流程拆分，不借作 Courtwork 可用性承诺。

- VS Code： [Extension Marketplace](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)；[Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)。
- Claude Code： [Discover and install plugins](https://code.claude.com/docs/en/discover-plugins)；[Create plugins](https://code.claude.com/docs/en/plugins)；[Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)；[Plugins reference](https://code.claude.com/docs/en/plugins-reference)。
- MCP Registry： [server.json format](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md)；[official registry requirements](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)；[publishing quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)。
- Backstage： [Software Catalog](https://backstage.io/docs/features/software-catalog/)；[Entity descriptor format](https://backstage.io/docs/features/software-catalog/descriptor-format/)；[Writing templates](https://backstage.io/docs/features/software-templates/writing-templates/)。
- n8n： [Use templates](https://docs.n8n.io/build/ways-of-building-workflows/use-templates)；[AI Workflow Builder](https://docs.n8n.io/build/ways-of-building-workflows/ai-workflow-builder)；[Save and publish workflows](https://docs.n8n.io/build/understand-workflows/save-and-publish-workflows)。

内部基线另参考[Runtime Control Index](../../../docs/runtime-control/INDEX.md)、[Runtime 架构合同](../../../docs/runtime-control/architecture.md)、[开发者控制面板既有调研](../developer-control-panel-2026-09-13/README.md)。
