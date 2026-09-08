# Experts / Extensions：以 SE 验证为目标的本地消费

2026-09-08 · Astra 架构整理，Luna 负责外部溯源、本地只读对照与 Paper 命题核验。

本轮产物为本地研究对账、架构建议、PR 说明与长期路线增量。技术建议没有被写成已实现或独立验收事实。首个有界验证候选为 **Inbound NDA Playbook Review**；优先完成既有通用 runtime 上的工作纵切，再由实际失败决定热插拔需要补什么。

## 输入与权威边界

- 用户当前请求：消费 Chat 提案与 index，一切以验证 SE Paper 为准；局部优先成熟社区实践，只作必要自研；Luna 做 explore/外部溯源/只读 diff，Astra 做架构及后续 PR、long-life roadmap。
- Chat：`6a9f02fd-6a2c-83ec-ab6c-2598d6ad6c80`，标题“法律专家探索 ഗവേഷണം”；已读取三轮研究及最终 handoff。其“冻结”“应当”“候选 PR”是研究资料，不是本地授权、事实或技术采纳。
- [原始 index 快照](inputs/research-index.md)：sha256 `f9576d7efcbe6267c2c7fd4cee3f057d7797fc6886e4b91eb0363eebbd8a741a`。保持输入原文；纠正与取舍写在本报告。
- CourtWork 审查基线：`codex/fresh-courtwork`，`f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`。活动 Work Surface Kit 有未提交修改，研究不覆盖它们；后续 PR 须按新 HEAD 和 writer 状态重新绑定。
- [PAPER.md](../../../PAPER.md) 的工程绑定为 SE 9.3 / `f8ecb091895559389bb4e75f3c6f28052b71c5a3`。SE 工作树 HEAD 为 `95c97f807f48030e02b349345f92d8407df50266`，但 Canonical/Practice/Index 等有未提交 9.6 候选；HEAD 不能代表这些候选字节。本轮不升级工程绑定，也不修改 Paper 正文。
- 现行工程责任见 [architecture](../../architecture.md)、[core-contracts](../../core-contracts.md)、[runtime control](../../../docs/runtime-control/INDEX.md) 与 [current](../../current.md)。设计契约与已实现源码分别判断。

## 架构结论

### 1. 用一个工作消费者检验既有边界

Expert 首先是被通用 runtime 消费的 Work Contract、规则、schema、verifier 与呈现资源。保持一个 run lifecycle owner；不把开发协作中的 Luna/Astra 分工复制成产品中的法律多 agent 拓扑。

首版显式选择首方 NDA 配置、顺序处理规则、持久候选和未决项。模型可以在受限能力内迭代，不必把每条规则编成固定调用瀑布。重叠 proposal 与跨条款冲突在顺序执行中也要处理；“暂不并行”不能省掉 reconciliation。

“先稳定逻辑状态”作为设计顺序保留；Chat 中“以后只换 scheduler，schema/UI 无需变化”降为待验证的可替换性假设。并行可能暴露新的冲突、版本和中间态；若需要演进，应显式迁移并缩窄原来的可移植性结论。

### 2. 正式状态的 owner 沿用领域契约

持久 trace、模型 context、UI 投影、正式工作状态各有责任。DSH 的 session log 设计值得参考，但不能据此把 CourtWork 的 `session/event` 直接升级为 Matter/Decision 的唯一真源。

使用现有领域 repository/service 的提交边界承载版本、Candidate、Decision 与有效成果；先核对已有实现再补缺口。`Review Ledger` 是 reviewable state 的工作称呼或投影，不因此新增第二个正式存储。host-owned envelope 保留来源、生产者和 schema 版本；专业 payload 由有版本 Contract 解释，历史读取不能依赖执行旧 producer 代码。

本地已存在的 owner 是 evidence-memo 的开发 Core：SQLite Matter/Candidate/Artifact/Decision/Audit/Evidence、CAS 与幂等 `trusted_decide`。NDA 优先复用其提交服务与存储语义，通过有界 domain adapter 增加逐规则 payload。host 现有 `/sessions/:id/actions` 接入 typed mutation，`/sessions/:id/surface` 提供只读投影；缺少通用 HTTP API 不自动构成新建一套 API 的理由。host inspector 的运行 Artifact 与领域已接受 Artifact 不能混用。

### 3. 热插拔按现有 next-run 语义起步

现有 control plane 已区分 installed/running/exposed/permitted，且配置和连接变更在 active run 中冻结，新 run 绑定版本。首版保留这一边界：停用对后续运行生效；不为“热”承诺运行中替换 Contract 或卸除正在调用的工具。

DSH/Cordis 的 owner/effect 是可复用的机制证据，但仅登记到 effect 的资源具有自动清理。任意副作用不会自动回卷；其动态包定义是 process-local，sandbox 也不构成进程安全隔离。采用局部 disposer/scoping 思路，不因此加入第二个 runtime 或照搬动态执行包。

卸载应该撤销继续执行的能力，并保留已产生的工作与裁决。是否已能做到，要由 scope、重启、部分初始化失败、历史 fallback 的本地用例证明；不能从上游 hot reload 的存在推出。

本地反例已定位：`ExtensionRegistry.unload` 保留 singleton，只改 status；之后的 projection 还能通过 `start()` 重开 Core。catalog 中完全没有 producer 时也没有独立历史投影。因此当前能力准确称为“禁用后续 run，保留活体投影”，不能称为完整可执行资源卸载。H3/H4 的修正方向是让领域存储读取具有独立于 producer 的服务生命周期，并由 host 的版本化 decoder 生成只读 fallback；不能在 fallback 时偷偷执行旧 producer。若生成持久投影，须明确它是可重建派生物及输入版本，不另设正式写入真源。

### 4. 成果接受与工具批准保持独立

NDA 执行写入 finding/proposal，正式接受走可信的 Work API 与版本校验。playbook 经审查不等于获得全部动作权限；正常审阅无需额外的例行 plan 点击，但缺事实、缺规则、变更权限、未决冲突与正式提交各自保留适用边界。

Work Surface Kit 的 permission/question/outcome 仍是其原职责。H3 增加真正的工作 Review 前，必须先有相应后端 Contract；工具授权卡不能兼作成果接受凭证，不能在 WK4 偷加 accept/reject/revise。

### 5. 成熟机制先消费，专业关联才是自研重点

沿用 Pi 的执行、模型与会话，沿用现有 control plane 的资源、profile、权限、MCP 与 extension owner。必要自研集中在规则与 evidence/version 的关联、候选与可信 Decision 的后果、未决义务、可恢复 Review 投影。没有消费者的注册中心、全字段 manifest、多级 scope、schema migration 框架和 marketplace 不进入首版。

MCP 是能力协议，Expert 是工作语义。供应商自有 job/conversation handle 和 MCP Tasks 是不同兼容事实；有 durable handle 不证明该服务实现了 MCP Tasks。远程任务等待实际 consumer 再实现 adapter。

主权模型沿同一 Contract 运行。部署标签不证明无数据外发；model request 与 tool/MCP request 两条路径分别受政策约束。质量不足应留下失败或未决，只有政策允许才选另一模型。

## 局部对账与取舍

源码定位、固定基线与测试边界详见 [Luna 本地 seam / diff 审阅](evidence/local-seams.md)。报告保留审阅当时的草稿问题；H1/H2/H3 已按其中意见修正。以下为 Astra 的本轮工程建议，不将文档采纳等同于代码验收。

| 输入 ref | 本地已有与缺口 | 取舍 / 对应切片 |
|---|---|---|
| C01 / DSH01 | 单一 Pi Run + trusted extension context/tools；profile 是声明数据 | **复用**。NDA 不拥有新 loop；H2 只加领域资源 |
| C02 / F01 | 现有 Candidate 是整体 artifact，没有逐规则状态/冲突集 | **适配**。H0/H1 明确 per-rule payload，H2 顺序执行与 reconciliation；并行延后 |
| C03 / DSH05 | evidence-memo Core 是领域真源；host schema4 events 是执行状态 | **拒绝直接移植权威关系**。复用 Core，不把 DSH session log 变成本地工作 ledger |
| C04 / DSH07 | candidate-only 工具、独立 trusted Decision、CAS/幂等已存在 | **复用并补边界**。H1 增加 NDA action/query 与修订路径，不能重造接受引擎 |
| C05 / DSH08 | 资源来源、曝光、实际执行 recheck 与 HTTP MCP 已存在 | **复用**。egress/principal/trust-zone 与远程持续任务并未因此完成 |
| C06 / DSH02 | registry 的 unload 保留活体实例，没有结构化资源清理 | **按实测缺口修复**。H4 作用于既有 owner；不先造独立 registry |
| DSH03 / RT01 | profile/session/new-run 绑定及 active-run 配置冻结已存在 | **复用并收窄**。双 session 隔离实测；不实现全部理论 scope |
| DSH06 / UI04 | live extension projection、Web renderer 存在；producer 缺席则缺历史 packet | **必要自研**。H3 提供独立读取与版本化 fallback；WK3/4 不能替代 |
| DSH09/10 | 无任意动态包安装/隔离体系；现有首方 backend/UI 可分工 | **延后动态代码**。借生命周期区分，不搬运 process-local VM 包安全模型 |
| MCP02/04 | 本地无 durable RemoteTask；供应商研究 handle 不等于 MCP Tasks 支持 | **等待 consumer**。按实际协商版本和协议适配，首版无需 remote research |

现有应用回归由 Luna 执行 `cd app && npm test`：**134/134 通过**；产品源码相对研究 HEAD 无 diff。这不是新增 NDA、producer 缺席、真实 MCP/provider 或专业 Review 的验收。

活动 Work Surface Kit 的源材料状态另有不一致：Luna 观察到 WK3 已标冻结，但 EX-WK2 仍为骨架、对应 explore 输出缺席。这里仅记录接入依赖，保留活动作者文件；H3 启动前须确认来源消费与真实合流状态，不能继承一个未经完成的外部来源审阅结论。

## 外部溯源与 Paper 处置

[Luna 上游报告](evidence/upstream.md) 将 DSH 固定在 `c389f96bf3a9b6807cb71ed6bdad5849be0df6d8`，逐项给出源码永久链接。DSH 的 Conversation 有缺失 keyed renderer 时的 JSON fallback，但仅覆盖特定 node/event 路径；它不保证任意专业状态的来源和裁决可读。动态包的更新通过不可变版本表达，不能从 index 的动作词表推定本地应提供一个独立 `update` API。

另一个重要修正是 MCP：官方 [2026-07-28 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28/) 与 [Tasks draft](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks) 支持远程 durable handle 的研究方向；但固定 DSH bridge 会在调用前拒绝 `taskSupport: required`，且没有 task-ID 持久化与轮询路径。它也只 bridge Tools，不能据普通工具接入宣称 Resources/Prompts/Tasks 全部兼容。参见 [固定 tools.ts](https://github.com/deepseek-ai/deepseek-harness/blob/c389f96bf3a9b6807cb71ed6bdad5849be0df6d8/packages/mcp/mcp-client/src/tools.ts#L294-L361)。本地后续采用哪版协议须重新核对 SDK 与服务协商，无需为最新规范而提前增加 remote-task 框架。

[Luna Paper 与法律样板核验](evidence/paper-validation.md) 分别记录固定 9.3 坐标和未提交 9.6 候选三份文本的 SHA-256。C01–C06 在既有 Paper 的 Work Extension、Candidate/Committed、Authority/Review、State/History 和兼容性论述中有概念对应，不需要新建 Expert ontology；这不是实现结论，C02 逐规则状态、C06 可执行资源清理与 producer 缺席时的历史 fallback 仍有代码和证据缺口。9.6 的相邻论述有整理与加强，不构成本次悄然升级工程绑定的理由。

Harvey 的 per-rule workers、branch/reconcile，Ironclad 的 playbook/approval，Relativity 的 Develop→Validate→Apply 提供成熟机制参照；供应商内部 benchmark、案例数字与帮助文档不能证明这些机制导致本地 accepted-work-product 改善。上述报告保留官方来源、事实与外推边界。

本轮正文处置为 **不改 Canonical/Practice**。若登记研究观察，其层级最多为 Index-only；当前先将研究与未执行的检验留在 CourtWork。固定实现与实验结果出现后，再向 Paper 的唯一 Practice Index 回流最小泛化观察，复用已有验证条目而非新增一份产品进度账本。

## 交付与推进

1. [验证设计](validation.md)：配对对照、反例、证伪与证据分层；允许结论是缩小或停止。
2. [PR plan](pr-plan.md)：H0 固定实验 → H1 补领域闭环 → H2 NDA 顺序执行 → H3 Review/fallback → H4 按缺口补生命周期 → H5 实测裁决。并非 index 中先造一组通用 registry 再找消费者的顺序。
3. [Long-life roadmap](../../roadmap.md#nda--experts-验证路径)：仍用 R0–R5，以证据触发并行、第二任务、远程任务与真实升级；当前实现状态只在 current 维护。

三份 Luna 报告是本轮证据快照，保留审阅当时的草稿坐标与限制；本 README、PR plan、validation 是吸收审阅后的计划。来源报告的建议不自动增加施工范围。

[最终只读文档复核](evidence/final-review.md) 检查 31 个本地文件链接，0 缺失，`git diff --check` 通过；锚点未独立校验。Astra 已按其三项意见澄清 Paper 概念对应与实现缺口、分开 `/actions` mutation 和 `/surface` projection，并清理本地来源报告的坐标标点。上述修订为文档纠正，不追加 runtime 验收宣称。

本轮核对既有基线及其回归，未运行新增 NDA 或完整热插拔实验。供应商文章只支持已公开的产品机制，不能证明效能、跨宿主可移植性或 SE 理论成立。Paper 回流待固定 CourtWork 实现与实验 commit 后，仅将泛化观察写入 Practice Index；目前保留为工程检验设计。
