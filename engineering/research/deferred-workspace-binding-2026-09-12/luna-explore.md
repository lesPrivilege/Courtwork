# 延迟工作区绑定 · Luna 有界源码与 donor 探索

日期：2026-09-12。研究基线：Courtwork `main`，`647bc2167efe5437d0ca73a60a406549d9a1e268`。本页是源码核账与有限外部 donor 复核，作者检查不等于架构裁决、产品接受或发布授权；不修改产品代码、schema、权限、部署，也没有运行付费 provider 或访问个人目录。

## 方法与边界

先检查实际主线的分支、HEAD 和工作树，再在隔离研究分支 `codex/deferred-workspace-binding-20260912` 读取当前合同、服务、store、runtime、web 与定向测试。用户原探索会话已完整保存为 [`source-conversation.json`](source-conversation.json)，但其中候选数量、厂商比较和引用 token 都是研究输入，不能当作本轮复测事实。本轮只核验两个一手 donor：Goose working-directory PR 与 OpenHands SDK 源码；Codex、Claude、Antigravity、Warp 以及其他厂商主张未重新核验。

## Courtwork 当前事实

### Session、workspace 和创建路径

- `app/server/store.mjs:30-44` 的 RuntimeStore 当前是 schema 12。`validateState` 在 `:213-231` 对 Session 使用严格字段集合：`id`、`projectId`、`title`、`draft`、`extensionBinding`、`createdAt`、`_nextSeq`、`workspaceDir`、`permissionMode`、`hostSession`、`scope`。`scope=global` 必须同时满足 `projectId=null` 和 `extensionBinding=null`（`:217-222`）；项目 scope 必须引用已存在项目。`workspaceDir` 是必填非空文本（`:223-227`）。
- Store 的 `createSession`（`:567-585`）允许 project scope 或显式 global scope；global 仍必须由调用方明确传入 `scope:'global', projectId:null`，而非由缺失字段推断。`deleteSession`（`:632-643`）只删除 ledger 中的 Session/Run/Event/Question，回执明确 `workspaceRetained:true`，所以托管目录有独立生命周期事实。
- 一般 `POST /api/v5/sessions` 的 service 合同（`app/server/service.mjs:613-630`）只接受 `projectId`、`title`、`permissionMode`，并在 `:618-621` 立即分配 `<dataDir>/workspaces/<sessionId>/materials` 和 `out`；`projectId` 在 `:625` 通过必填文本校验。路由在 `app/server/index.mjs:145-149` 只有一般 sessions CRUD，没有 bind-workspace/resource endpoint。最小反例是向一般创建路径提交 `{title:"x",permissionMode:"draft"}`：请求在 service 的 `text(value.projectId, ...)` 处失败；只把 `projectId` 改成 `null` 也不会形成通用 projectless Chat，因为 project scope 会被 store 拒绝，global scope 需要显式 Attention 创建语义。
- 已有免项目选择路径是专门的 Attention：`createAttentionConversation`（`app/server/service.mjs:599-610`）校验 `conversationId`，创建 `scope:'global'`、`projectId:null`、`permissionMode:'ask'` 的 Session，同时仍建立托管 `workspaceDir`。`app/server/index.mjs:127-133` 将它挂在 `/attention/conversations`；它不能直接替代普通 Chat，且 global Session 不能绑定 Matter extension（`store.mjs:646-652`）。

### Run、Pi journal、tools 和恢复

- Run 记录的严格字段在 `app/server/store.mjs:233-264`，没有 workspace binding、resource identity 或 target 字段；它记录 `sessionId`、provider/extension 快照、artifact、hostSession、credentialGeneration 及 Run lineage。`service.mjs:1559-1574` 冻结 provider/connection/credential/context/capability 信息，`service.mjs:1616-1633` 先以 control revision/hash、session scope、resources、content、policies、context 做 `runtimeSnapshot`，再经 store 的幂等 admission 持久化 Run。
- Native host session 的创建/恢复被推迟到幂等 admission 之后：`service.mjs:1507-1515` 对既有 `hostSession.path` 调 `SessionManager.open`，否则用 `session.workspaceDir` 创建 `SessionManager.create`；执行阶段 `:1697-1703` 首次写回 `hostSession`。真正的 Pi run 在 `:1813-1828` 固定 `cwd: entry.workspaceDir`、`agentDir` 和受治理 tools。
- `app/runtime/workspace-tools.mjs:9-17` 明确声明内建 workspace tools 没有 shell、network 或 workspace 外路径能力。`resolveWorkspacePath`（`:86-124`）拒绝绝对路径、`..`、链路中的符号链接，并以 workspace 的 realpath 解析；`ws_write`（`:214-281`）将授权绑定到精确的相对路径、字节数、内容 hash 与 preview，先保存历史再 rename，并通过 `onWritten` 记录 artifact。`createWorkspaceTools`（`:370-375`）按目录闭包生成 list/read/grep/write。
- 运行服务实际把这些 tools 指向 `entry.workspaceDir`，并在 `service.mjs:1744-1755` 传入 permission callback、artifact callback 和 history 保存器；`service.mjs:1821-1828` 再用 `governTools` 和运行 snapshot 做实际治理。因而“把 `workspaceDir` 改成 nullable”不是能力实现：Pi 的 cwd、SessionManager、tool closure、artifact/recovery 之间都依赖一个托管目录。
- Artifact 是内容版本而非可变路径句柄：`store.mjs:188-198` 与 `:724-733` 固定 `{path,bytes,sha256,kind:'content-version',writtenAt}`；`app/runtime/artifact-history.mjs` 和 service 的 artifact-file 路径按 Session/Run/hash 读取私有历史。启动 reconciliation 只报告 rename 后尚未被 ledger 见证的 `unrecorded_files`，不会事后伪造 artifact。将外部目录直接当作 managed workspace 会混淆产物 owner、审计证据和恢复来源。

### Runtime control 与现有资源边界

- `app/runtime/control-plane.mjs:7-32` 将可配置 scopes 限定为 user/workspace/session，另有受限 Attention agent scope；`inspect`（`:153-180`）以 projectId 作为 workspace identity、session id 作为 session identity，并把 `sandbox:workspace.filesystem` 指向该 Session 的 `workspaceDir`。当前没有独立 external-resource/binding 对象、revision、locator 身份或连接/撤权 API。
- `hostToolCeiling`（`:28-31`）只根据现有 Session permissionMode 给 `ws_write` allow/ask/deny；`evaluatePolicy` 和 actual wrapper 的重评估在同一控制面中。因而绑定资源不能另造一份 grant store，也不能让 UI 的“Full access”文案扩大现有能力。
- `docs/runtime-control/architecture.md:11-17,25,35` 进一步固定了 scope inheritance、Run admission 快照、配置队列、撤销后的 call refusal、精确 source 记录与 schema 迁移/旧 host 拒绝规则。这些都是未来 binding contract 的接缝，而非已有外部目录支持的证明。

### Web 入口和 FE-03 证据

- `app/web/app.mjs:5673-5691` 的 `startNewSession` 在没有真实 project 时打开 project dialog（`:5680-5683`），否则从 active/first real project 取得 `newSessionProjectId`。`createEntity`（`:6149-6215`）在 `:6168` 对 Session 强制 `projectId`，并在 `:6178-6189` 以 `{projectId,title,permissionMode}` POST `/sessions`；`loadSessionsForProject`（`:1574-1589`）和 `restoreUiSelection`（`:1703-1719`）也都以 project 作为导航恢复轴。
- `app/tests/chat-work-shell.test.mjs:25-35` 仅测试 `sessionMode({workspaceDir:null,projectId:null})` 的**投影结果**仍是 Chat，不能证明后端能创建此状态。FE-03 交付说明 `engineering/mvp/execution/work-surface-kit/delivery-fe03.md:191-210` 明确登记 BE-23：当前无项目 Chat 没有创建路径、每个一般 Session 都建 `workspaceDir`，本单不伪造入口。

## 反例与设计含义

1. **可空 `workspaceDir`**：即使 store 校验被放宽，`SessionManager.create/open`、`cwd`、workspace tool closures、artifact history 和 restart reconciliation 仍需要确定目录；空值会把“没有外部用户资源”误写成“没有执行/产物根”。
2. **隐式继承最近 cwd/project**：当前 owner 是 projectId/sessionId 与 control snapshot；没有持久的授权引用、资源身份或 expected revision 可供恢复核验。隐式继承会把导航偏好升级成跨 Session 能力授权，并让重启后的目标不确定。
3. **热换 Pi cwd**：当前 Run 在 admission 时冻结 runtime binding，之后 SessionManager 与工具闭包使用同一 `entry.workspaceDir`。运行中切 cwd 会使上下文、权限、artifact 归因和未知效果恢复不一致；应在 Run 终止/显式取消后的下一 Run 生效。
4. **复用 global Attention 伪造普通 projectless Chat**：global 是已有 Attention identity，权限与 Matter binding 规则不同；把一般 Chat 偷换成它会改变角色、scope 与可用工具，而不是补一个可选资源关系。
5. **把 `ws_*` 根目录直接扩成用户本地目录**：现有 guard 只证明 Session managed root 内的相对路径与 symlink 规则；它没有完成外部 root 身份、根目录替换、检查后替换、撤权竞态或来源记录。直接扩根会越过现有 artifact owner 与 permission 合同。

## 外部 donor（仅两项，支持范围有限）

- **Goose working-directory PR #6057（已迁移到 `aaif-goose`）**：官方 PR 的 body 明确写的是 changing working dir 会重启 agent 并把它设置到 session；改动同时触及 server route/state、agent、session、desktop UI 与 API schema（49 files，约 1850 additions / 1189 deletions）。具体可见 [Goose PR #6057](https://github.com/aaif-goose/goose/pull/6057)。对本题可采纳的证据是：working-dir 不是一个孤立字段，session/agent/extensions/UI/API 有明显耦合；切换通过显式请求和 agent restart 处理。它**不能**证明 Goose 有真正 unbound Session，也不能直接规定 Courtwork 的权限、恢复或热切换语义。
- **OpenHands SDK `BaseWorkspace` / `ConversationState`**：官方 `BaseWorkspace` 将 `working_dir` 作为 agent operations/tool execution 的字段（[base.py](https://github.com/OpenHands/software-agent-sdk/blob/main/openhands-sdk/openhands/sdk/workspace/base.py)）；`ConversationState.workspace` 是执行命令与读写文件所用的必需 workspace（[state.py](https://github.com/OpenHands/software-agent-sdk/blob/main/openhands-sdk/openhands/sdk/conversation/state.py)）；factory 的 local/remote workspace 都以 `working_dir` 建立（[workspace.py](https://github.com/OpenHands/software-agent-sdk/blob/main/openhands-sdk/openhands/sdk/workspace/workspace.py#L13-L49)）。支持范围仅到“该 SDK 把 workspace/working directory 放在 Conversation/Agent 构造和恢复合同内”；这不是对 OpenHands 产品 UI、project picker 或无 workspace 入口的断言，也不要求 Courtwork 采用其对象模型。

以上OpenHands URL指向可变main，未固定donor SHA；不把网页抽取行号当源码行号。仅用于本轮概念反例，实施若消费源码必须另固定版本与符号。

## 可交给 Astra 的最小结论

源码支持的方向是“Session 身份和托管产物目录先存在；用户资源能力另以显式 binding 表达”，而不是把 `workspaceDir` 置空。第一阶段若要落地，应先由 Runtime/store owner 冻结：零或一个外部资源、稳定 resource identity 与 locator、binding revision、访问模式、授权引用、Run 快照、撤权/失效、幂等 requestId/expected revision、旧数据迁移与旧 host 拒绝；在此之前不开 UI 的 Connect 控件。

OpenHands 说明“workspace 常被视作 Conversation 的执行依赖”，Goose 说明“改变 working dir 会穿透 agent/session/extensions/UI 并触发 restart”。两者只能作为机制/反例输入；它们没有被当作 Courtwork 架构、schema 或产品验收依据。

## 实际检查记录

- `git status --short --branch`、`git rev-parse HEAD`：隔离树为 `codex/deferred-workspace-binding-20260912`，HEAD 为基线 SHA；主线存在其他 writer 的未提交变更，未触碰。
- `rg`/`nl -ba` 读取上述 service/store/runtime/web/contracts；检查结果已按当前源码坐标记录。通过 GitHub 官方 API/PR 页面核对 Goose #6057 标题、状态、body 与 changed-files 摘要；OpenHands 链接读取官方 main 分支源文件。
- 本页为探索文稿，没有新增代码或 schema 测试；完整运行/迁移/真实 provider 验证留给 DWB-01→03 的后续 PR 验收。后续消费不得把本页作者检查当作独立接受。
