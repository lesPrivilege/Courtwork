# RD-006 · Task-first / Deferred Workspace Binding

2026-09-12；状态：Astra选型已裁，后续实现PR文稿待消费。研究基线 `647bc2167efe5437d0ca73a60a406549d9a1e268`。Astra负责架构/迁移/集成；Luna有界源码与donor探索。作者检查不等于独立接受。

问题：用户能否先开始任务，再在需要时连接资源，同时保持会话身份、权限、运行恢复及成果来源一致？输入、逐项处置和证据见[消费包](deferred-workspace-binding-2026-09-12/README.md)。

## 选型

| 候选 | 裁决与理由 |
|---|---|
| workspaceDir改nullable | 拒绝。当前Pi、工具、journal和文件历史依赖托管cwd；字段置空不形成能力边界 |
| 默认继承最近project/cwd | 拒绝。隐藏继承不能表达授权、恢复和跨Session隔离 |
| 另造Standalone Task/独立agent loop | 拒绝。已有global Session，复制会产生第二份运行/权限真源 |
| 现有Session + 托管成果目录 + 显式外部resource binding | **采用**。保留身份与现有执行机制，增量表达外部资源能力 |
| 会话中热换Pi cwd | 第一阶段拒绝。运行配置/工具闭包/恢复身份必须一致 |
| 通用remote environment调度器 | 后置。先完成一个本地只读纵切，不引入新框架依赖 |

托管目录可以在创建Session时分配；“延迟绑定”指用户资源及其能力的绑定，不以推迟mkdir作为成功指标。托管目录不是OS sandbox，不据此声称任意shell或第三方extension安全隔离。已有workspace工具的受限路径范围不自动扩张到本地目录。

## 不变量与owner

1. Session ID、既有global/project scope和projectId保持；目录绑定不是project迁移，也不隐式授予Matter访问。global会话继续不能绑定Matter extension。通用入口先复用已支持身份，独立角色模型另单裁定。
2. Runtime service/store持有资源绑定与修订；权限仍经现有工具治理。拟议binding携带稳定资源ID、规范化locator、访问模式、revision、授权引用和失效原因，字段/API须由DWB-01冻结。不得复制一套独立permission store。
3. 一个会话首版至多一个外部只读目录，默认零个；managed workspace始终独立保留为产物/journal根。连接、替换、断开均是显式命令；同请求ID同内容返回原回执，异内容拒绝，过期expected revision拒绝。
4. 每个新Run固定binding revision、资源身份与有效权限上限；执行前仍校验撤权、路径身份和当前政策。固定快照不延长已撤销授权。模型参数不能选择另一个Session、根目录或actor。
5. 活跃Run期间不改变binding/cwd。需求触发先给出需要资源的明确结果，在当前Run结束或确认取消终态后连接，下一Run显式重试；不能无意重复此前外部效果。撤权即时阻断后续资源调用并请求取消，已完成读取不能抹除。
6. 路径检查在真实访问点执行：绝对路径/上跳/符号链接逃逸、根目录被替换、平台别名及检查后替换均须有处理策略。仅在连接时realpath不够。原有workspace guard不能未经验证用于任意外部目录。
7. 新资源不得自动注入旧指令/skills/MCP、workspace配置或整个文件树；Context按当前披露和预算取显式来源。读取源文件附资源ID、绑定修订、相对路径、内容hash/版本与Run归因；复制内容保留为历史，不表示授权仍有效。
8. managed成果是session文件/候选证据；发布为Core Artifact或关联Matter沿原有显式入口。断开不搬家、不删除托管成果；外部源失效不让历史回执变成功。归档/保留/清理沿现有生命周期，自动GC另单冻结。
9. 旧数据迁移映射为原有managed目录与空外部绑定；不根据cwd推导本地授权，不改旧runtime.bound/hash/历史路径。实施时按真实最新schema升级、严格校验、备份和旧host拒绝读取；失败回到独立备份，禁止共享升级数据给旧host。
10. 本轮不引入provider、编排或文件系统框架依赖。OpenHands/goose为机制与反例参考，不采用为CW执行后端；其他厂商比较不作为裁决所需前提。

## 产品与前端边界

首片免选目录入口仅复用现有Attention创建链。Luna确认普通Chat的BE-23仍开放（一般service要求projectId，UI先选project）；不得将一般Chat偷换成Attention global身份。通用projectless Chat须另冻结产品角色/Session身份、配置链与导航恢复合同，本轮没有关闭BE-23。Standalone是可选文案，不是固定产品术语；无project与无外部目录分别表达。后续[五图语义裁决](deferred-workspace-binding-2026-09-12/semantic-reference.md)补充分离组织归属、执行位置、Git/worktree、权限与模型。Standalone若采用，表示未连接外部资源，托管成果并不让它变成另一种Session。Connect folder、当前范围、断开/撤权的可用性来自服务capability；只读明确表达，不用“连接”暗示write。用户指令中路径本身不直接写入授权。

最近实现先例为[Attention会话](../../app/docs/attention-agent.md)及[UI控制](../../app/web/ui-controls.mjs)的action/anchorPopover、[app](../../app/web/app.mjs)的openDialog/closeDialog与焦点恢复。受影响grammar为composer、scope显示、permission、overlay；遵守[连续性规范](../design/agent-interface-2026-09-10/frontend-contract.md)。本轮只写合同，无新specimen/视觉验证；实现时补owner状态、失败/陈旧/处理中、Escape/焦点与宽窄明暗实机证据。

## 判别与停止

PR验收见[施工文稿](deferred-workspace-binding-2026-09-12/pr-plan.md)。身份改变、授权隐式扩大、旧回执被重算、路径检查可绕过或恢复无法确定目标时，保持外部能力关闭。需要改变Core/Session scope/第三方cwd生命周期时退回Astra，不把nullable修补冒充本路线完成。本次没有新产品测试、provider调用、迁移、部署或产品门关闭。

## 2026-09-13入口顺序增量

用户真实验证后的[Recent与可选工作区裁决](deferred-workspace-binding-2026-09-12/recent-onboarding-20260913.md)前置BE-23/DWB-05：普通projectless Chat、顶层Recent、发送前可选组织位置、取消前置命名。先补身份/schema/配置与恢复，外部目录仍由DWB-01/02负责；尚未实施，不以Attention替代。

## 2026-09-14 · 真实仓库读写增量裁决

用户明确要求真实仓库挂载及Access grammar，Astra采用Luna只读探索，启动DWB-01/02并将DWB-04从后置提升为本轮串行施工；不把只读片交付当成读写任务完成。当前核验Host schema15，若施工基线未变化则迁移16，Core4/bridge5不变。迁移由RuntimeStore原owner完成，旧Session默认空绑定，保留managed workspace、历史字节与旧Host拒读规则。

第一施工片冻结绑定与读取：Session至多一个外部目录，独立于projectId、managed cwd/journal和ws_*。Runtime service/store持有稳定binding ID、规范化root及文件系统身份、revision、有效/撤销状态；命令使用requestId与expectedRevision，原回执幂等。新Run固定绑定快照；连接/替换须无活跃Run，撤权立即阻断后续调用并请求取消。新增repo_list/read/grep受控工具，模型只传相对路径。每次访问重验当前授权及root身份，源回执有binding/revision/path/hash/Run归因。绝对host路径不自动进入模型Context。采用现有store命令与事件先例，不另造permission store。

第二施工片是独立外部写入效果，不将ws_write换根：Access持久枚举仍read_only/draft/ask，分别拒写/允许已绑定范围写/精确批准。绑定是用户明确连接目录的动作，Access不赋予其他目录或网络权限。repo_write必须携带目标预期hash（创建要求不存在），批准绑定目标、前态、新内容hash和binding revision。执行前重核；冲突拒绝且不覆盖。单Session写入串行；外部竞争者存在，因此不能把普通先检查后rename宣称原子CAS。施工者必须证明所选平台访问/提交机制的路径竞态与冲突边界；做不到时回报具体缺口，由Astra裁决，不悄悄降级覆盖。

外部写入持久记录prepared/已确认结果/unknown及操作身份，故障恢复仅核对实际前后态，不自动重放未知写入；撤权与批准后的等待均须重新验权，已完成效果不能宣称被撤销。文件删除、移动、任意shell与测试recipe不纳入首个repo_write。使用隔离合成仓库验证越界、symlink/root替换、冲突、撤权、重启与重复请求后，再对接真实dogfood隔离树，绝不默认写共享dirty主树。

第三施工片接GUI：Home与已有Chat复用Access选项/说明/选中态的共享primitive，保留各自保存时点。Project组织选择与Connect repository动作分开；本地浏览器不能直接提供Host目录句柄时可使用明确的Host路径输入与校验回执，不伪装上传为挂载。用户可查看真实绑定范围、失败与断开；能力未接通前不绘制成功态。按原UX grammar和相关precedent施工，不引入Full access语义。

串行验收：每片作者交付后非作者Luna定向验收，再发下一片；GUI加Chrome人类目验。Astra仅处理新语义/集成裁决，不重复验收。此次是架构授权与发单，尚未实现、迁移用户数据或关闭产品能力门。

## 2026-09-16 · 在途树恢复、逐路径披露修复与 Workspace GUI 首片（Claude 施工单 01）

施工入口见[Claude 串行施工单](../execution/claude-frontend-harness-2026-09-16/README.md)与[01 记录](../execution/claude-frontend-harness-2026-09-16/01-workspace-binding.md)。本节只登记 RD-006 owner 事实；接受状态仍由 [current](../current.md) 持有。

**在途树。** `codex/workspace-access-20260914` 的临时目录已随 `/private/tmp` 清理消失，2026-09-15 清理前的 bundle 只含已提交 ref。作者会话的 Codex rollout 日志保留了该树全部 236 次 `apply_patch` 调用；按时间顺序、按原工具的整补丁原子语义重放到 `7e1a1ff`，`app/` 下 26 个修改与 11 个新增文件的增删行数与 Luna 2026-09-15 06:48 记录逐文件相同，`app/docs/repository-binding.md` 前 178 行与当时整读逐字相同；工程文档因原树曾复制脏 main 内容而无法逐字恢复，其增量另行按当前 main 合入。恢复树定向 26/26，`npm test` 1058/1059（唯一失败为并发下 Core bridge 超时，单独重跑 13/13）。该结果以提交 `ab4b93d` 进入本单施工树；它是原作者工作的保全，不是接受。

**逐路径披露缺口（原第三片预检发现）。** 裁定：聚合读取按文件裁决，取该聚合动作与对应单文件读取动作（`repo_grep`→`repo_read`，`candidate_grep`/`repo_diff`→`candidate_read`）两者中最严者；deny 与 ask 的文件在 worker、补丁与来源回执之前排除，结果只报 `excludedByPolicy` / `excludedPendingApproval` 计数，不点名路径；root 的 allow 不被带 ask 规则的文件继承，逐文件批准经单文件读取发起。选择"过滤并计数"而非"整次失败关闭"：一条 deny 规则不应使根目录搜索不可用，计数使模型知道覆盖不完整。实现为 `control-tools.mjs` 的 `createPathAdmission()`（`governTools` 同源），`repo_diff` 在生成补丁前过滤路径。回归：`repo_read` deny 下 `repo_grep(".")`、`repo_grep` 的 ask 规则不开问题、`candidate_read` deny 下 `candidate_grep` 与 `repo_diff`；定向 52/52。提交 `c8ac6fb`，Sonnet 5 按 Fable 裁定实现。

**GUI 首片的语义裁定。** 用户在施工中要求按 Codex 形态：选目录用原生对话框、列出已连接过的目录、把 workspace / Local / 分支放在 composer 上方的独立卡、开工后只留 composer。采用如下：

- 外部目录这一维统一叫 **Workspace**（[文案体例](../design/copy-convention.md) §3.1 原义）。Home 上原按名词收敛写作 Workspace 的 Project 选择器改回 **Project**，无 Project 的 Chat 写 `No project`。`repository.*` 语义键撤销，登记 `workspace.connect` / `workspace.disconnect`，`workspace.object` 的 owner 改指本合同。
- composer 上方一张实色页签卡（不用 blur）：`Choose workspace` / 目录名、`Local`（执行位置事实）、`Branch · <名>`（仅 Host 读到分支时；未知不画 main，游离 HEAD 不画）。只在 Home 与尚无 Run 的 Chat 出现；开工后事实与入口移到 `This chat` 概览的 Workspace 行。
- Workspace 卡：`Open folder…`（Host 原生对话框，Darwin `osascript`；其他平台 501 后退回路径输入）→ `Connected before`（由 Host 绑定回执得出，找不到的目录保留行写 `Not found`）→ `Enter a path instead`。Home 上卡片只写草稿，首次发送先绑定再开始 Run，每次开始一个 requestId，重试重放不重复绑定；绑定失败保留 Chat 与输入。Chat 内选中即提交绑定命令并读回 Session，不以回执冒充状态。
- 新增 Host 只读辅助接口：`POST /host/choose-directory`、`GET /repositories/recent`、`GET /repositories/inspect`；均不绑定，绑定仍是显式 `PUT .../repository-binding`。

未做与边界：Linux 原生对话框未实现（fail closed 到路径输入）；同 device mounted descendants 的范围合同不变；`repo_write` 的 GUI 批准卡与 candidate 面属 02 片；Work 面板的"Browse workspace / Workspace · N files"仍指托管成果目录，属 10 片文字收敛。

### 2026-09-16 · 02 片：私有 candidate 的 GUI 与人的 diff 入口

沿上节 Workspace 卡片加 Edits 区：从目录当前 commit（`GET /repositories/inspect` 的 live HEAD，不猜 main）创建 Private candidate，显示 `from <commit>` 与 Writes 计数，Stop edits 撤销而不删除文件；活动 Run 中命令禁用，命令后读回 Session。`repo_write` 的批准卡与 `ws_write` 同一解剖，只加一行范围（Private candidate · new file / replaces the file whose hash starts …），批准仍绑定 toolCallId 与内容 hash，Host 在批准后重验 candidate/revision/前态（既有实现）。人看 diff 不经模型：新增 `GET /sessions/:id/repository-candidate/diff`（与 `repo_diff` 同一份有界 Host patch，因目录属于用户本人而不做逐文件策略排除）与 `GET /sessions/:id/repository-candidate/effects`（写入回执，去掉 contentRef）；Session/Run 公共投影改为只带 candidate 摘要，Host 路径与文件系统身份不再随 `GET /sessions/:id` 出站。GUI 用 diff-view 按文件分节渲染 patch。记录见[02 记录](../execution/claude-frontend-harness-2026-09-16/02-candidate-write.md)。写入结算的 GUI 呈现、冲突反例的 GUI 路径与 Core 接受分列仍未做。
