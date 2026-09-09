# SE Long-life 全场景覆盖核对

**核对时间：** 2026-09-08（Asia/Singapore）  
**仓库：** `<isolated-checkout>`\
**分支 / HEAD：** `codex/fresh-courtwork` / `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`  
**工作树：** `engineering/current.md`、`engineering/roadmap.md`、Work Surface Kit 若干 work-order/contract/explore 文件及 `engineering/research/experts-hotplug-2026-09-08/` 有修改或未跟踪；未把这些候选文档当作已交付产品代码。此次只读核对未改项目文件，也未运行全量测试。

## 判断口径

以下把每个场景分为三层：**设计已有**（architecture/core-contracts/design/roadmap 明确了责任或边界）、**源码已实现**（fresh HEAD 可定位的行为）、**缺口**（不能由现有源码或已记录证据推出闭环）。设计候选本身不等于运行验收；工作树文档的“计划/accepted”也不升级为产品事实。

总体上，当前 fresh 壳已经有一个可复用的单机内核：项目/Session/Run、同一 Session 的 Pi 历史、受限 workspace tools、权限问答、extension Candidate/Decision、host JSON 状态与 Core SQLite 状态分离、MCP unknown 结果封闸。它还不是全场景 Long-life Work 系统。最大的缺口集中在 Matter 作为跨 session 的公开工作身份、正式编辑/修订、宿主失联后的持久任务、外部效果对账、身份/协作，以及稳定的 surface-neutral Work API。

## 场景覆盖矩阵

| 场景 | 设计已有 | 源码已实现（固定 HEAD） | 缺口 / 最小决定性门 |
|---|---|---|---|
| **自由探索 → 正式工作** | `engineering/design/principles.md:7-9` 允许无 Extension 先开始；`engineering/architecture.md:7-21` 把 Matter、Core、Work API、Runtime 分开；`engineering/core-contracts.md:5-15` 规定 Matter/Candidate/Decision 绑定。 | Host 可创建 project/session、写 draft/material、启动无 extension 的通用 Run（`app/server/index.mjs:95-110`; `app/server/service.mjs:396-413,448-476,724-814`）。绑定 evidence-memo 时只能以 title/sourceText 创建**新** Matter（`service.mjs:614-628`; `app/extensions/evidence-memo/index.mjs:261-275`）。 | 没有把自由探索的 session、材料、候选或 transcript 提升/挂接到已有 Matter 的入口；没有 Assignment/正式工作身份的 promotion 记录，也没有无 producer 时的正式工作读取路径。需要先定义 attach/promote 的 typed contract、版本/来源迁移和失败回退，再谈“探索可转正式工作”。 |
| **跨 session continuity** | `core-contracts.md:5-10` 明确一个 Matter 可关联多个 Session，删除 Session 不应删正式状态；PT3 的门在 `pre-takeover-roadmap.md:63-69`。 | 同一 app Session 的 `hostSession` 会保存 Pi JSONL locator，下一 Run 用 `SessionManager.open` 恢复（`service.mjs:695-703,834-850`）；Core DB 按 extension dataDir 持久化 Matter/Candidate/Decision（`core/bridge.py:378-400`）。 | Host 的 `session.extensionBinding` 只保存 extension binding；`createExtensionBinding` 没有 `matterId` attach 分支，只能创建新 Matter（`service.mjs:616-628`）。因此第二个 Session 不能通过现有 HTTP/API 恢复第一个 Session 的 Matter；也没有同一 Matter 的跨 session projection、待办或 authority 读取。 |
| **人工直接编辑** | `core-contracts.md:11-24,26-32` 区分 Candidate、不可变 Artifact、active pointer、Evidence 版本；PT5 计划差异、citation、逐项 edit（`pre-takeover-roadmap.md:79-85`）；`completion-surface.md:22-24` 要求版本和 Review 可见。 | Host `PUT /sessions/:id/draft` 和受 permission 的 `ws_write` 只改 session 草稿或 workspace 文件（`index.mjs:101-105`; `service.mjs:427-430`; `workspace-tools.mjs:214-281`）。evidence-memo 的正式人类动作只有 `save_draft` 与 `decide`（`evidence-memo/index.mjs:458-479`）；renderer 只有 Draft 保存和 accept/reject/request_evidence（`renderer.mjs:70-119`）。 | 没有“编辑已接受成果/候选后产生新 Candidate”的 typed action、patch/lineage、source revision 或 stale-base conflict 路径。直接改 workspace 文件不能改变 Core 的正式 Artifact，也不能被视为正式 Work edit。 |
| **Agent 提案** | `architecture.md:31-38,44-50`、`core-contracts.md:11-24` 已规定模型只能提 Candidate，人的接受走 Work API；正式提交要 CAS、Evidence、幂等和事务。 | evidence-memo 提供 `se_read_source`、`se_submit_candidate`（`evidence-memo/index.mjs:318-362`），Core candidate 表、Evidence、obligation、Decision/audit/request_result 在 SQLite 内有事务边界（`core.py:198-257,419-457,746-831`）。Host 运行、工具、artifact 事件也有记录（`service.mjs:834-997`; `store.mjs:398-450`）。 | 当前 Candidate 是一个 `artifact_text + evidence + obligations` 结构；没有通用 proposal/patch/finding/unresolved/rule 状态、候选之间 supersedes/revise 链，也没有把 agent identity、能力来源、模型/工具效果绑定为可供所有 surface 使用的 Work packet。NDA 的逐规则状态仍是研究计划，不是现有能力。 |
| **Review / revise / commit** | `core-contracts.md:48-54` 定义 Review packet、过期页面重新验证、permission 与成果 Review 分离；PT4/5 定义 proposal→verification→human review→commit。 | Core `decide` 支持 accept/reject/request_evidence、CAS、Evidence 验证、事务 artifact/obligation/state/audit（`core.py:746-831`）；服务端将 actor 固定为 `local-user` 并在 extension generation 上加栅栏（`service.mjs:665-685`）。 | 没有 revise/edit action；reject/request_evidence 后没有新候选的 lineage contract；没有通用 Review API/Query，只有 extension-specific `/sessions/:id/actions` mutation 和 `/surface` projection（`index.mjs:109-110`）。UI contract 仍把 commit gate 留作占位（`WO-WK3-contract-freeze.md:7-15`; `review-projection.d.ts:5-19`）。 |
| **Async / 长期执行** | `architecture.md:27-30` 要求 Run 取消/排队/恢复责任；`core-contracts.md:34-40` 区分取消、进程退出、unknown effect 和恢复；`completion-surface.md:14-21,27-30` 要求等待、失败和后台项可见。 | Run 在当前 Node 进程的 `active` Map 中执行，支持 deadline/maxTurns、compaction、abort、question wait、shutdown settle（`service.mjs:706-722,816-832,834-997,1114-1155`）。重启将 in-flight Run 置为 `unknown`，下一次只能新建 command（`service.mjs:165-180`; `app/README.md:159-180`）。 | 没有 durable job queue/lease/heartbeat、host crash 后继续执行、pause/resume/steer、任务级 progress checkpoint、跨 session background runner 或通知/回执队列。`getRuntimeInfo` 明确 `scheduler:false`，并注明 orchestration 是外部 caller（`service.mjs:340-360`; `app/README.md:263-265`）。Long-life 不能把当前“unknown 后重新开始”称为长期执行。 |
| **External effects** | `core-contracts.md:34-40` 已写 action intent、接收方幂等或查询/对账、unknown 和 outbox 的边界；runtime control 对 remote MCP 规定失败/unknown 不自动重放（`docs/runtime-control/architecture.md:27-35`）。 | 本地 `ws_write` 会在授权后保存 content version；MCP 只支持显式 Streamable HTTP，transport ambiguity 触发 `mcp_effect_unknown`、关闭后续 tool admission，不自动 replay/reconnect（`workspace-tools.mjs:214-281`; `mcp-manager.mjs:78-99`; `service.mjs:910-917,980-995`）。 | 没有持久 action-intent/effect ledger、外部效果分类/receipt、远端任务句柄、查询/对账 endpoint、可恢复的 unknown Review packet 或 outbox。当前是安全停止和提示，不是 external effect 的长期可治理闭环。 |
| **多人 / 多 agent** | `architecture.md:9` 明确多用户、多 Agent 调度后置；`roadmap.md:32,45,48` 要求先证明单人边界，不把开发分工当产品 multi-agent；`core-contracts.md:15` 只承认单人固定 Reviewer 是 demo。 | HTTP host 以 local bootstrap token 工作；extension humanAction 只接受 `local-user`（`service.mjs:665-685`; `evidence-memo/index.mjs:458-462`）。每个 Session 同时只允许一个 active Run（`store.mjs:364-366,398-418`）；runtime info 为 `fork:false, subagents:false`（`service.mjs:347-359`）。 | 没有 user/role/tenant identity、Matter participant/scope、多人并发写入/claim/merge、审计 actor 体系，也没有 child-run/delegation graph、agent identity、预算/取消树、交叉 agent proposal/review。设计明确后置，但现有 Long-life 路径没有给这些能力预留可验收阶段。 |
| **不同 surface / API / headless** | `architecture.md:12-21,36-39` 把 Work Surface、Work API、Host Adapter、GUI、Trace 分开；`core-contracts.md:48-54` 要求 typed Query/Decision 和 surface cache/version 对齐；`docs/ui-orchestration-contract.md:5-20` 明确 UI 是正式状态投影而不是 owner。 | 有同源 V5 Web UI、projects/sessions/runs/events/workspace/artifact/runtime-control/provider/extension HTTP routes（`app/server/index.mjs:93-129`），事件 cursor 可重连（`service.mjs:1163-1181`; `app/README.md:190-196`），extension surface 受 `/extensions/` allowlist 与 generation guard（`service.mjs:650-685`; `app/web/app.mjs:3290-3376`）。 | 没有公开的 Matter/Work API、跨 session domain query、headless CLI/SDK、另一种 surface 的 capability negotiation 或 offline read-only contract。现有 `/actions` 是 extension-specific mutation，`/surface` 是 projection；它们不能替代 surface-neutral Work API。 |
| **Provider 替换** | `architecture.md:25-30,48-50` 要求 provider/adapter 可替换，变化不能改变 Completion；`roadmap.md:15,45-48` 规定第二 provider/宿主须配对验证。 | 支持 local fake、catalog DeepSeek/OpenAI API descriptors；Run 记录 provider/model/api、credential generation，active Run 冻结配置（`service.mjs:547-611,724-813`; `store.mjs:405-412`）。Pi adapter 通过 `createSessionRun` 注入 model/tools/session manager（`pi-session-runtime.mjs:144-179`）。 | 没有第二 provider 的真实配对 acceptance，也没有 provider-independent Work API contract 对 context、usage、stream/error、unknown effect 和 completion 的一致性证据。当前 provider 配置是 host-global；Matter/Run 的 replacement policy 仍是设计要求。 |
| **Extension 替换 / 卸载** | `architecture.md:34-40`、runtime-control docs 规定 registry、activation、state compatibility、active Run freeze；manifest 还应说明 rollback/deprecation。 | Registry 支持 load/unload/reload/invalidate、generation 和 persisted extension records（`extension-registry.mjs:102-127,179-216`）；service 禁止 active Run 期间 lifecycle/binding/humanAction（`service.mjs:614-685`）。Core 数据在 extension dataDir 持久化，reload 会 dispose 后重建。 | `unload` 为保留只读 projection 而故意保留 executable singleton（`extension-registry.mjs:194-201,238-242`），并非真正撤销代码/资源；catalog 缺少旧 extension 时，dormant record 不能提供旧 state 的 fallback projection。没有 producer-absent durable Work view、package absence policy、schema migration/compatibility gate 的验收。 |
| **Storage 替换 / 恢复** | `architecture.md:31-40,48-50` 与 `core-contracts.md:26-40` 分离 Repository、Artifact、Trace，要求 atomicity、backup、migration、restore 和 replacement axis。 | Host 使用 schema 4 JSON store、schema3 backup/atomic rename；Core 使用 SQLite schema v1/B0/B1 探索；artifact-history 使用按 session 的 Git object store（`store.mjs:237-270`; `app/README.md:77-115,246-252`; `evidence-memo/core/core.py:292-371,857-920`）。 | 没有可替换 Storage adapter、domain repository protocol、双实现读写/迁移/恢复配对；Host JSON、Core SQLite、Pi JSONL、Git history 各自有边界，尚无一个 surface-neutral Matter repository 能在替换存储后保持版本、Evidence、Decision 和 external effect 语义。 |

## 横向已实现边界与不可外推项

- **状态所有权有清楚的局部边界：** `architecture.md:21,42-50` 与 `docs/runtime-control/architecture.md:3-17` 把 Host execution/trace、Pi history、Extension/Core formal state、UI projection 分开。当前 host `runtime.bound` 是运行绑定和解释证据，不是 Matter formal state（`store.mjs:398-418`; `service.mjs:303-310`）。
- **当前 Run 恢复不是长期工作恢复：** session JSONL 可在下一 Run reopen，in-flight Run 会变 `unknown`；这验证了诚实终态和 conversation continuity，不能外推为 durable background execution。
- **当前 Core 提交不是通用 Work API：** evidence-memo 的 SQLite transaction、local-user actor、one extension binding 是一个受限 vertical slice；不能外推为多用户、多个 Matter、跨 session 或第二 extension 已通过。
- **当前 MCP unknown 处理不是外部效果对账：** 关闭调用准入、写 notice、拒绝自动重试是安全门；没有 intent/effect reconciliation 的正式状态。
- **当前 renderer 不是 Work surface contract：** renderer 收到 projection 和 dispatch callback，不能读 Core/provider/storage；它保证了一个 trusted local surface 的隔离，却没有提供缺失 producer 时的 fallback 或多 surface API。

## Roadmap 对账

### 仍然有效的分工

- `engineering/roadmap.md:1-18` 的 R0–R5 是 SE 研究/验证阶梯，不承载每日状态；`engineering/pre-takeover-roadmap.md:1-7` 的 PT0–PT9 是 Fresh 壳到 takeover 的施工门。两者不应合成一个编号系统。
- `engineering/current.md:17-26` 是当前状态出口；`engineering/architecture.md` / `engineering/core-contracts.md` 持有设计责任；`docs/runtime-control/*` 持有 Runtime Control 实际契约；`engineering/design/*` 与 Work Surface Kit 持有界面/投影约束。候选研究目录 `engineering/research/experts-hotplug-2026-09-08/` 只能记录该候选的验证与 PR 计划。
- 因此不应另立一个平行“Longlife status ledger”。若 Long-life 场景被裁定采用，应把阶段/退出条件补入现有 roadmap，具体状态写入 `current.md`，具体契约写回 architecture/core-contracts 或对应 runtime/design contract，证据落到 evidence。

### 需要标为过时或重新核对的内容

1. `engineering/pre-takeover-roadmap.md:127-145` 的“当前位置”仍写 G2 r1 当前、G1 待冻结、PT2 C3/C4 待验，而 `engineering/current.md:3-24` 已记录 Claude UI、Runtime Control Plane、Home composer、迁移/恢复和 134 项后端交付。文件开头说下方旧快照保留历史，但标题仍叫“当前位置”；应改成明确的历史快照或按当前候选 HEAD 重写，否则会误导 Long-life 依赖判断。
2. `pre-takeover-roadmap.md:147-151` 先写“同期只读 explore、不施工 runtime core”，随后 `:149` 又按 DEC-009 允许隔离目录受控集成。正文说明前句是历史记录，但这仍是容易被复制为现行门的冲突；应保留 provenance 并显式标注“superseded by DEC-009”。
3. `engineering/roadmap.md:24` 说当前没有 prototype/设计方向采纳；当前仓库已经有 UI composition/surface hierarchy/completion/Work Surface Kit 施工标准和交互契约。若原意是“没有最终视觉方向被用户采纳”，应明确这个限定，避免与已交付的通用 UI 编排和待验 contract 混读。
4. `docs/ui-orchestration-contract.md:28-30` 是 V7（2026-09-06）轮次边界，仍把持久 Run 恢复、真实 provider、Harness Core 重构写成另编范围；现有 runtime 已增加持久 host session、restart→unknown、control plane，但真实 provider/完整 Core vertical 仍未验收。该页应继续保留历史 provenance，同时在当前入口注明哪些条款已经被后续 runtime contract 取代、哪些仍未完成。
5. `engineering/design/completion-surface.md:5,22-30` 把完整 Review/修订/跨工作后台项列为产品 P0/P1 完成面，而 `WO-WK3-contract-freeze.md:7-15` 和 `review-projection.d.ts:5-19` 明确当前冻结投影仅覆盖 permission/question/outcome，commit gate 仍待 Core。两者不是同一验收门，需在 roadmap 引用处写清“产品完成要求”与“当前 WSK scope”，不能把 WK3 冻结误称为 Review 已交付。
6. `app/README.md:263-265` 明确当前 orchestration 是外部 caller、没有 scheduler/planner；这与长期异步工作的目标不矛盾，但 roadmap 必须为 durable queue/lease/reconciliation/notification 单独设验证门，不能把 current Run API 当 scheduler。

### 建议新增的最小验证阶梯（只列门，不预设实现）

1. **Formalization gate：** 给自由 Session 一个可追溯的 Matter attach/promotion 反例，证明草稿、source、candidate、transcript 和 formal state 的迁移/不迁移关系。
2. **Continuity gate：** Session A 关闭、Session B attach 同一 Matter；不重塞 transcript 也能恢复有效 Artifact、Evidence、Decision、义务和 next Context；无 producer 时有只读 fallback。
3. **Revision gate：** 人类编辑产生新 Candidate/patch，旧版本不被覆盖；旧页面、重复请求、过期 base、Evidence 错版均可解释拒绝。
4. **Long-run/effect gate：** host crash、worker replacement、cancel race、provider timeout、external unknown 均能恢复到持久的 job/effect/Review 状态；重试依据 idempotency/query，不盲目 replay。
5. **Identity/collaboration gate：** 两个合法 actor 或 agent 在同一 Matter 上并发提案/裁决时，scope、CAS、审计、冲突、撤销、子 Run provenance 均可查询；若仍后置，明确关闭入口和退出条件。
6. **Surface/replace gate：** 同一 Work API 被 Web、headless/read-only 和另一 adapter/Storage 实现消费；projection 不授予 authority，provider/extension/storage 替换后 version/Evidence/Decision 语义不变。

这些是验证门和现有接缝的覆盖结果，不是对 schema、实现顺序或产品范围的最终架构裁定。
