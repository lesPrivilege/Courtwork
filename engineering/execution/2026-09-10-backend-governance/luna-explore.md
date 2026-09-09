# Luna 只读源码探索

基线固定为 `main@27d37dad75c07f0bc0aa394c19d208e92c8c9a1f`。本报告只做 owner、契约和缺口映射，不是测试回执，也不是独立接受。报告写作过程中共享 `main` 已继续前进到 `6921dbd`；以下行号和结论仍以固定基线为准，开工时须按最新 main 重查。

## 输入与总判断

已读取 `engineering/current.md`、`PAPER.md` 和用户粘贴附件 `pasted-text.txt` 全文。Paper 固定语义基线是 9.6 / `d78fd312955c1f594e59cbdcbb0d3074ac355940`；当前实现入口仍是 Courtwork 的单一 `main`，Core3/app4，Attention 后的 RuntimeStore schema6。用户附件的主要判断与源码相符：后端应以 governed object space 为中心，保留领域 Schema owner，区分当前状态、append-only 历史、投影、检索和 runtime；不能用一个通用 memory 表或纯 event sourcing 覆盖所有域。

当前最重要的边界是：Attention 已有一个完整而有界的领域实现，Matter 有成熟的 typed owner，但两者之间还没有可供全局 Attention 使用的 Matter disclosure owner。首个薄 PR 应先冻结并验证“授权后的跨对象目录 / Matter 读取”合同；Run/attempt 和 external-effect receipt 应继续作为后续独立切片，不能在首片里借机重构 Core 或 RuntimeStore。

## 真实 owner 与已有事实

### Matter、Schema ref 与领域投影

`app/core/core.py:178-275` 定义 Core SQLite 的 `matter/source/source_set/source_history/candidate/artifact/decision/audit/request_result/event` 表；Matter 的 `contract_version`、版本、source revision 和 active artifact 是当前领域状态。`app/core/core.py:313-398` 的 `Store` 持有 SQLite、事务和事件写入；`app/core/core.py:764-768` 由完整状态计算 envelope/digest；`app/core/core.py:778-867` 在同一事务内做 CAS、证据核验、Artifact/Decision/audit/request receipt 和可选 B1 event。

`app/core/bridge.py:59-105` 是 app-owned 表的 owner：`app_work_data` 保存领域 `domain_json`，`app_work_scope` 保存 `{matter_id, project_id, extension_id}` 唯一项目归属，`app_matter` 保存标题/draft，`app_run` 保存 Core 侧 Run。`app/core/bridge.py:542-554` 的 `list_matters` 只返回 id/title/version/source_version/active_artifact；`app/core/bridge.py:557-601` 只在建 Matter 时检查可选 domain 的 `schemaVersion:1`。这说明 Schema ref 目前是领域 contract string 加领域 payload 的 typed owner，不是一个全局 registry。

`app/extensions/work-adapter.mjs:69-72` 将 binding 收窄为 `matterId`；`:406-428` 由 extension owner 创建 Matter 并写入 contract version/domain；`:431-443` 把 Core snapshot 编成 `workProjection`；`:446-560` 以 Matter 版本、source version、contract version 建 Core Run 和受限工具。`app/core/owner.mjs:31-79` 的 `workProjection` 是现有 Work 读投影，保留 domain、Matter、sources、candidates、artifact、decisions、runs，并把 human action 绑定到 current basis；`:82-107` 的 `compileWorkContext` 只把 bounded metadata 放进 context，正文通过有界工具读取。

已有领域 contract 也明确了边界：`docs/work-core/contract.md:5-11` 指定 `core.py` 是 Matter/Candidate/Decision/Artifact owner，bridge 是 private typed transport/Run admission；`:17-25` 规定 Work 查询、producer 缺席、项目归属和删除保留；`:50-66` 规定 bounded Artifact/source reads、Core Run binding、unknown recovery；`:75-95` 的 ES-01 继续沿同一 Core owner，recorded file bytes 是不可变证据而非通用 memory。

缺口是没有通用、只读、owner-backed 的 object envelope，能同时表达 `kind + schema_ref/version + object revision + descriptor + state class + update time + availability + disclosure handle`。也没有让全局 Attention 在不绑定 Matter expert 的情况下，按 Matter 自身 Schema 读取一页 bounded evidence 的合法入口。`list_work`（`app/core/bridge.py:858-876`）是项目 owner 目录，不是全局 registry；它不能代替对象级 disclosure。

### Attention state、event、relations 与 receipt

`app/core/attention.py:6-23` 由同一 Core SQLite 增加三张表：`attention` 当前状态、`attention_event` append-only 事件、`attention_request` 不可变 request receipt。字段和 action 集合严格限制在 schema1；状态包含 `investigating|needs_you|waiting|later|resolved`。

`app/core/attention.py:87-131` 是 disclosure context、对象加载完整性和权限 owner：host 产生 actor/project/purpose/execution；local-user 可读全部字段，runtime 必须有匹配 adapter、purpose 和未过期 grant，否则统一返回 unavailable。`app/core/attention.py:139-180` 校验 Matter/session/run/external relation 与 exact source refs：Matter 通过 `app_work_scope` 同项目检查，session/run 的 provenance 必须由 host 观察，external 只是不解引用的 ref。

`app/core/attention.py:211-227` 生成按字段过滤的 public state；registry/detail/source/relation/event/signal 彼此分离，不能从一个可见标题推导全部内容。`app/core/attention.py:241-330` 负责 action 的 actor 分离、CAS、request identity、state/event/receipt 同事务提交；`request_disclosure` 在 `:305-313` 写入带 adapter/purpose/fields/expiry/issued revision 的 grant。`app/core/attention.py:333-412` 提供 registry、inspect、exact、literal grep、relation、events、source、request 查询，并在 query 前检查权限；event 读要求 details/sources/relations 皆获授权。

`app/server/service.mjs:805-849` 是 HTTP/host owner：`#attentionContext` 只构造项目内 local-user context；`queryAttention/readAttention/actOnAttention` 把 authenticated HTTP 调用转成 Core query/action，并在提交 relation 前从真实 RuntimeStore 观察 session/run provenance。`app/extensions/attention-adapter.mjs:1-16` 是唯一 host-created runtime seam，只允许 runtime `query` 和 `record_signal`，每次重新取得执行身份；模型不能传 actor/context。

`app/runtime/attention-tools.mjs:4-79` 是全局 Attention 的只读渐进检索工具：先 `attention_projects`，再显式 project 的 `attention_list/attention_inspect`；`memory_list/memory_read` 只读保留的 user/assistant message identity 和按 SHA 校验的原文。`app/docs/attention-agent.md:23-33` 冻结了这一点：历史对话是 historical statement，不是授权或正式接受；global discovery 不授予全部 Attention；通用 memory provider、连接器、scheduler、Expert delegation 都未交付。

已有能力很完整，但作用域仍是 Attention 自己的 object。缺口不是再造一张 Attention 表，而是给 Matter 同样清晰的 object-specific grant/read owner，并让 registry 只投影存在性；跨 Matter relation 不能传递授权，也不能把 handle 当 bearer capability。

### Retrieval、projection 与索引

现有检索路径是分域的：Attention literal grep/filter 在 `app/core/attention.py:333-412`，Work 的 Matter/Candidate/Artifact/source 查询在 `app/core/bridge.py:512-554`、`:750-760`、`:773-798` 及 `file_candidates.py`，Work projection/context 在 `app/core/owner.mjs:31-107`，Runtime memory 在 `app/runtime/attention-tools.mjs:51-79`。所有正文读取都有 project/Matter/Run 绑定、版本、digest 或 bounded page 约束。

当前没有 FTS/SQLite 通用索引、vector store、跨 Matter global search 或可重建的通用 registry。用户附件中的 “search → timeline → full object” 可以作为 future consumer contract，但不能把现有 literal grep 误报成全仓 retrieval。首片应先冻结 discover → inspect → bounded evidence → compile 的读链和错误/分页/预算语义；FTS 仍只能是删除可重建的派生设施，vector 后置。

### Runtime Session/Run/Event、async task 与 Attempt 缺口

RuntimeStore owner 是 `app/server/store.mjs`：固定基线 `SCHEMA_VERSION=6` 与 state collections 在 `:21-33`，严格校验 Session/Run/Event/Question/async shape 在 `:109-213`。`appendEventToState`（`:222-230`）为每个 Session 维护连续 seq；`commandReceipt`（`:232-244`）以 Session + commandId + 原始 input 做幂等回执。`RuntimeStore.createSession`、`deleteSession`、`bindExtension`、`createRun` 分别在 `:356-460`；Run 一次性记录 sessionId/status/admissionOpen/adapter/provider/command/artifacts/usage/hostSession，且 `createRun` 在串行 mutation queue 内做单 active gate 和同 command replay。`updateRunWithEvent/appendEvent/listEvents` 在 `:467-515`，重启/终止会以 event 保留 unknown/expired/cancelled 事实。

Core 也有独立的 `app_run`（`app/core/bridge.py:84-105`、`:604-724`），其输入冻结 Matter/base/source/contract/provider，terminal 状态不可变；它和 RuntimeStore Run 通过 host adapter 关联，但不是同一 owner。当前没有 `attempt` 子实体、attempt lineage、lease/checkpoint 或“同一 Run 的第 N 次外部执行”持久记录。不要为 BG-01 把两种 Run 强行并成一个统一表；BG-02 应先定义不破坏现有 Core/Runtime/async 契约的 Attempt owner。

AM-B 的 async task 是最接近 attempt 的现有参照，但仍不是通用 Attempt：`app/server/async-task-state.mjs:30-86` 固定 task origin、adapter/source、execution status、`dispatchCount` 至多一次、result digest 和 delivery records，且 provider acknowledgement 永远是 `unknown`；`app/server/async-tasks.mjs:104-165` 在 restart/lost ACK 后置 `unknown`、禁止重发，`:167-207` 只允许按原 task identity query/reconcile，`:208-260` 将 get/wait delivery 与 runtimeRecordedAt 绑定。`app/docs/async-tasks.md:18-58` 明说 handle 不是 authority、single dispatch failure 是 unknown、旧 task query-only、不会 replay prompt/launch；`:68-89` 明说 tool result 和 runtime receipt 不等于 provider acknowledgement，也不接受 Core candidate 或 resolve Attention。

因此 BG-02 可以借用 “intent → one attempt → unknown → query/reconcile” 语义，但不能把 async task 的 `dispatchCount` 改名为全局 Attempt，或因复用字段宣称 Run 可恢复。

### External effect 与 receipt

已有 receipt 有三类，但都不是外部业务效果 receipt：

* Runtime command receipt：`app/server/store.mjs:232-244,439-460`，只证明相同 Session commandId/input 对应同一 Run。
* Core formal decision receipt：`app/core/core.py:240-255,778-867` 的 `request_result + decision + audit (+ event)`，证明本地 Matter 决定事务；`docs/work-core/contract.md:17-42` 明说这不是 workspace/export 或外部批准。
* Attention action receipt：`app/core/attention.py:15-18,74-84,241-330`，证明本地 Attention action 的 request identity/state event 关系；它不代表 external effect。

Async `deliveries` 是读取任务的消费回执，不是 provider 发送回执；其 `provider:'unknown'` 约束见 `app/server/async-task-state.mjs:70-85`。MCP/远端工具只有 host 的 unknown 保险丝：`app/server/service.mjs:1188-1200` 将 remote effect 标为 `externalUnknown` 并阻止继续 tool execution，`:1276-1283` 将 Run 结算为 unknown/`mcp_effect_unknown`。没有持久的 effect intent、批准绑定的 payload/target version、稳定幂等 key、独立 attempt、provider receipt、readback verification 或补偿授权表。

这正是 BG-03/DS-04 的边界。首片不要伪造“发送成功”或新增一份本地权威替代 provider truth；未来 effect contract 必须在现有 host execution owner 下保留 unknown，并按 provider 能力核对后决定是否重试。当前研究包也明确 `effect` 属 provider owner，ATT request receipt 与 AM delivery 不可冒充 effect（`engineering/research/attention-human-loop-2026-09-09/README.md:13-31`）。

## 首个薄治理 PR 建议

首片建议命名 BG-01：跨对象目录与 Matter disclosure contract。它可以先是正式合同、owner/读者矩阵、packets 和确定性反例；如必须带代码，只增加一个 owner-backed、authenticated、project/object/revision bounded 的 Matter 只读入口。范围应限制为：

1. 冻结 registry envelope 自身版本与领域 `schema_ref/schema_version` 的分离；registry 只投影 id/kind/descriptor/revision/availability/disclosure handle，不复制 Matter/Attention 可写状态。
2. 冻结 Matter 最小 object-specific grant：host 捕获 actor/purpose/project/session/run，字段、过期、撤销和 revision 重新检查；默认拒绝，不能从 global Attention 或本机 human visibility 推导授权。
3. 直接查询既有 Core/Matter owner，返回 bounded evidence/ref；不造第二个 registry DB，不做全仓 FTS/vector，不做 relation traversal 权限继承，不安装 scheduler/runtime loop。
4. 把 Run/attempt 和 external intent/receipt 留给 BG-02/BG-03；只在 contract 中明确它们不是当前 BG-01 的隐含交付。

如果首片只做文档，不能写“跨 Matter 已实现”；如果带代码，必须有 authenticated HTTP/真实 Runtime consumer packets，且 producer 缺席、旧 schema、撤销和无权限都走明确拒绝。Attention 现有 registry 可以作为 packet 形状参照，但不能作为 Matter allow-all adapter。

## 首片验证反例

至少应配对以下反例与正例，并由非作者按固定产品 SHA 复核：

* 两个 project 使用相同 Matter/Attention id：只能看到各自 scope，不能由 id 猜跨项目对象；隐藏对象不泄露标题、数量、分页 continuation 或 relation endpoint。
* 只有 registry grant：能读最小存在性摘要，读取 details/source/relation/event 必须拒绝；旧 disclosure handle 在撤销、过期、adapter/purpose 变化后仍拒绝。
* inspect→evidence 多步读取中对象 revision 改变或权限缩小：旧 revision 不静默继续，必须 CAS/拒绝并重新发现。
* unknown/malformed schema、缺失 descriptor、跨 project relation、未观察的 session/run provenance：失败关闭，不把 unknown 映射成可读或可授权。
* Session 删除后：正式 Matter/Attention 状态和历史 receipt 仍按 owner 读取；执行 relation、producer availability 与 current external availability 分开，不伪造“已解决/已接受”。
* source/artifact 已删除或 bytes 缺失：返回 unavailable/integrity failure，不能用当前 workspace、聊天摘要或缓存补齐完整证据。
* global Attention 尝试访问未授予的 Matter、模型自报 actor/project/run、Run completed/unknown 或 signal 试图 resolve/accept：均不得获得读取或正式状态改变。
* 仅有本地 command/action/task receipt 时：不能宣称 provider 外部效果已发生；真实 effect 的 dispatch 前/后死亡、ACK 丢失、重复 callback、readback 查不到应留到 BG-03 loopback。

## 与在途施工的冲突面

以下文件是共享 owner，不能由 BG-01 与 Attention/多 agent 施工并行改写而不协调：

* `app/server/service.mjs`：全局 Attention 路由、Matter binding、Run execution、MCP unknown 与 Runtime→Core 接线均在此；当前 Attention global agent 和后续 AM/HTTP 接缝会触及同一处。
* `app/server/store.mjs`、`app/server/index.mjs`：RuntimeStore schema6、Session scope、Run/Event/async task 与 HTTP routing 的唯一写者；不要在 BG-01 另建状态存储或改 schema 作为目录捷径。
* `app/core/core.py`、`app/core/attention.py`、`app/core/bridge.py`、`app/core/client.mjs`、`app/core/owner.mjs`：Core/Matter/Attention domain owner 与 private bridge；Attention state/event/receipt 和 Matter transaction 必须保持各自事务边界。
* `app/extensions/work-adapter.mjs`、`app/extensions/attention-adapter.mjs`、`app/runtime/attention-tools.mjs`：领域 adapter、Runtime disclosure seam 和 global Attention tools；前者不应被 registry 取代，后两者只消费冻结 DTO。
* `app/server/async-tasks.mjs`、`app/server/async-task-state.mjs`、`app/docs/async-tasks.md`：AM-B 单次 dispatch/unknown/query-only 合同；BG-02/03 只能在此合同之上另定 lineage/effect，不可把它们直接扩大。

`app/web/**` 仍是前端单 writer 队列，本探索不建议触碰。未知的 owner、迁移或外部 provider 能力均应标为 unknown，并缩小首片；本报告没有运行产品测试、没有读取凭据或个人运行目录，也没有声称任何独立接受。
