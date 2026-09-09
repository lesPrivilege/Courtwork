# Attention human loop：研究消费与派单增量

2026-09-09。用户提供 Email/GitHub human decision queue handoff；读取基线 `main@fb50d2125c4674ea07380298c600f0039e1da4a8`，在隔离分支编写。本包消费该输入并补入既有 ATT、AM、LG、DS 路线；当前状态仍见 [current](../../current.md)。没有启动 Terra、真实账户读取、原生 draft、外发、自动化、UI 或 schema 施工。

输入 [原文](inputs/handoff.txt) 按用户提供字节保存，[manifest](source-manifest.json) 记录 hash、长度和全部显式链接。原文自述“6 workstream / 约58结果 / 7一手文档”仅属于上游研究者，无法从粘贴文本复核；本轮是对显式来源的有界页面核验，不继承其搜索覆盖或成熟度结论。页面处置见 [来源核验](sources.md)，派单与反例见 [工单增量](work-orders.md)。

## Astra 采用裁定

**采用 human decision queue 作为个人 Attention 实验方向。** 它回答哪些事项需要人判断、依据是什么、建议是什么及后续结果，不以 unread 或 notification 总数代替 Attention。对 Courtwork 则消费既有 Attention owner，保留 investigating/waiting/later 等状态，不能把整个对象缩成每张卡都必须批准的 inbox。

沿用原文顺序：外部观察 → 提案 → 人的决定 → 实际效果 → 经治理的学习。保存 proposal 与 human edit 的差异，以及没有发生、无法核对和失效的证据。一次点击、删除分类或模型自报 confidence 不直接生成长期偏好或授权。

### 五种语义对象映射；不是五张新权威表

| 输入对象 | 已有事实 / 归属 | 需要的增量 |
|---|---|---|
| provider_event | 外部 provider 是资源事实 owner；当前 ATT external ref 只是不解引用的 locator，freshness unknown | LG/来源 adapter 捕获有界 observation snapshot 与 cursor/coverage；需要 Astra 先冻结持久/保留/来源引用合同。不能把观测快照称为 provider 完整事件日志 |
| attention_item | [ATT-BE-01](../../../docs/work-core/attention.md) 已有 project+attention 身份、当前状态、event、receipt、CAS、披露和 typed human actions | 复用原 owner。Email disposition、priority、responsible_party 是待定分类/提案元数据，不能替换现有生命周期或直接塞入 strict v1 schema |
| proposal | Core 的 Candidate/Decision 已处理正式工作成果；当前没有通用 Email/GitHub outbound proposal | 由 Astra 定义外部动作提案及所绑定版本、目标、参数摘要和权限。不能直接复用 Matter accept 作为发送授权，也不能把本地文案等同已创建 provider draft |
| human_decision | Attention action receipt 与 Core decision 各有作用域；BE-30 保护 pending permission 载荷 | 外发 approve/edit/reject 要有独立动作语义和 payload 绑定。defer 可消费 snooze 的明确原因/下一步，dismiss 不静默映射成 resolve；acknowledge 仅已看见 |
| effect | provider 持有实际业务效果；AM-B 只读任务 execution/delivery 不等于外发对账 | 接 [DS-04](../data-systems-2026-09-09/pr-plan.md) 意图/回执/核对合同，复用 host 执行 owner；保存 unknown，不能新增一份“已发送”本地权威替代 provider 证据 |

disposition 建议 `needs_reply / waiting / action_required / reference / noise` 仅为邮件分类候选；其中 waiting 与 ATT status 同名并不使二者等价。urgent 可作为 priority 维度；为何现在需要人、谁负责、截止时间与证据必须可追溯。当前 ATT 不接受这些新字段，实施前要版本化，不绕过严格未知字段拒绝。

### 权限与有效性

权限按账户/资源范围及 read、organize、draft、send 分开设计；provider OAuth scope 不一定足够细，host 仍须逐动作检查。用户粘贴未来默认权限表不等于已经授权本次真实账户操作。原生 draft 也是 provider mutation，只有对应权限与模式已配置后才可自动创建；本地 proposed text 可先存在，标签/归档也不默认当纯读。保留人的手动修改，不能后台刷新覆盖原生草稿。

一次批准要绑定 proposal revision、provider account/resource、目标版本、action kind、确切参数 hash（包含收件人/正文/附件等实际会改变效果的字段）与有效权限。编辑生成新的 proposal revision 并保存 delta；旧批准不覆盖新文本、新收件人或新 PR HEAD。动作前重新检查当前条件；provider 不支持原子条件写入时标明竞态限制，不能把 preflight read 称为原子 CAS。

Confidence 是有界提案的模型信号，不是权限。dry-run 是预览/检查，没有保证真实执行必成功；provider 成功响应和后续 readback 也必须区分。未知发送结果先核对，不因本地幂等键存在就宣称 provider exactly-once；补偿是另一个受权动作，发送一般不能靠数据库 rollback 撤回。

### “恢复同一个 interrupted run”的准确范围

OpenAI 文档描述 Agents SDK 对 resumable state 的批准与恢复。本仓使用 Pi；现有进程内 pending permission 由原执行继续，而重启后 Run=unknown、question=expired_restart。ATT resolve、BE-30 CAS 与同名 run ID 都不能单独提供崩溃恢复。

AM-B-A0/A1 必须保存和验证原始调用身份、参数、checkpoint/lineage、结果与权限，不能批准后把旧 prompt 再跑一次冒充续行。若 adapter 无法恢复原 provider 执行，就明确不可恢复或进入显式关联的新执行流程；保留已作决定和原效果核对身份，不能偷偷重发。数据层选择由 Astra 作出，不因外部 SDK 示例换掉 Pi。

### Trace 从 P0 开始，P5 做分析

P0 起保留观察范围/输入版本，P1 加判断与 surfaced 记录，P2 加提案版本，P3 加决定与 edit delta，P4 加 intent/attempt/receipt/verification；P5 只分析这些既有证据。若到 P5 才开始记 trace，之前的依据和 delta 无法可靠补回。

必须区分 presented、acknowledged、decision_at；后端对象 created_at 不能冒充用户已看到。已有事件不含的时间记 unavailable，不回填“实际时间”；BE-32 仍由其 owner 冻结事件时间合同。编辑保留原/新内容的引用和 hash，以及差异；引用读取受原 scope 和保留策略约束，邮件正文与个人决策不进入公共 Git，eval 导出使用显式允许的脱敏/合成资料。

accept rate 只衡量已观察人群中的接受，不能自动解释为正确率或 probability calibration；区分 approve/edit/reject/defer/dismiss、重复 surfacing、未决/失效与未观测样本。发现 missed/dismissed signal 后来应被展示，需要独立复核标签及未展示样本的有界抽样；不能从“没有点击”推断 false negative。模型/提示/规则/runtime/来源与评分版本逐项保留，缺失不猜。

P6 只生成 preference_candidate，需人显式 promote 后才能改变规则，并记录适用 scope/版本/撤销；本包不创建学习服务或修改 Paper。

## 顺序与范围

保留 [AM-B 两只读任务主路径](../../execution/2026-09-09-async-loop/README.md)。来源与 trace 的离线 fixtures 可并行；它们不是 AM-B 开工的新增前置。Gmail/GitHub 分别保持自己的传输、cursor 与核对机制，统一内部引用/证据语义。先手动有界 sync，再按实际运行需求接 watch/renew/reconciliation 调度；不为了架构整齐先部署 Pub/Sub 或两套 scheduler。

P1 复用已实现 ATT；P2 先本地 proposal；P3 的外发批准与 P4 effect 必须由 Astra 完成合同与确定性反例，再接实际账户与动作授权。P4 是 DS-04 明确候选消费者，现在可以做合同/loopback 准备，但原文没有给出真实账户、动作或发送内容，不启动外发。ATT-FE 按 Fable 单 writer 队列接稳定 packets，本包 Today/Needs attention 仅作为产品方向，不新排 UI。

## 交付证据

本包是输入消费、官方页面核验与可派任务增量；未运行产品测试、真实 provider 或产生人类决策样本。文档链接、原文 hash 与 diff 检查另记录在 manifest。Luna 对现有 owner/状态与可派边界做只读探索，结果由 Astra 入账，不冒充新增功能的独立接受。Core3/app4、Runtime4 与 G1–G5 保持。

Luna 在固定基线复读 `app/core/attention.py`、`app/extensions/attention-adapter.mjs` 与正式合同，确认当前五语义对象中只有 attention_item 已作为 Attention 当前对象落地；本地 event/request 不等于 provider_event/effect，其他通用外发对象仍待合同。其复读同时确认 disposition/status 分离、来源与 trace normalizer 必须等待 Astra DTO、外部效果与迁移恢复由 Astra 冻结。上述意见已纳入本包：可立即派的只有离线响应/样本夹具；生产 normalizer、projector、store 与接线均另有前置。既有 Core/HTTP/recovery 测试仅作为后续复用入口，本次未复跑。
