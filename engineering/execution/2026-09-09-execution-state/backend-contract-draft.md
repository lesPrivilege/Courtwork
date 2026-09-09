# ES-00 → ES-01 · 有界文件成果的首个后端施工合同

2026-09-09；Astra 撰写的施工设计，**尚未实施、不是已发布 ABI、不是独立验收**。读取 `a431650b8c4726adc10905485aaadfdb1983689c`，分支 `codex/astra-execution-state-contract`。本合同收敛 [后端准备稿](PR-BE-exact-file-candidates.md)，产品状态仍由 [current](../../current.md) 维护。实际读取、检查与未检项见 [ES-00 回执](../../../evidence/backend-dispatch-20260909/es-contract.md)。不依赖 LayerFS，不改 Paper。

## 1. 最小消费者与裁定

ES-01 交付一个实际可用的 **source-backed file memo**：用户通过现有绑定 API 创建明确选择 `file-memo-v1` 的新 Matter；一次 Run 经现有 ws_write 产生 recorded 文件版本，再把短 memo、证据与这些小型 UTF-8 文件版本一起提交；用户通过既有 Work actions 接受；新 Session 可分页读回正式文件并用于下一次工作。合成 HTTP/Pi loopback 客户端必须跑通，不能只新增孤立 blob API 或只造 FE fixture。GUI 施工不在本单；测试客户端即首个接口消费者，交付脚本也供后续 FE 对照使用。

选择 **recorded bytes → 一次有界 Core 导入**。为这个新 profile 的 `se_submit_candidate` 增加 `recordedFiles:[{path,sha256}]`；这只是选择器，不是执行证据。可信 host 从当前 Run 的持久 `run.artifacts` 找到对应记录，核对 Run/Session/Matter、kind、bytes，再调用 `ArtifactHistory.read(sessionId,digest,bytes)` 读取完整校验后的 immutable bytes，导入 Core。模型不能指定任意 Session、Run 或 history repo。原 memo 与 NDA 工具 schema 保持原样。

这直接消费既有 `ws_write`：工具保存 history → rename workspace → `appendArtifact` → 返回结果。服务已有 `getArtifactFile` 的 Run/Session 归属检查与完整 history read 接缝，但该 HTTP 投影会截断到 `MAX_READ_BYTES`，因此导入必须调用内部完整 reader，不能导入 preview text。模型给定 path/hash 匹配记录才有解引用权；孤立 history blob、仅现存 workspace 文件或未记录写入均不够。

不新增文件构建工具、分块上传或另一输出集合账本。`ws_write` 保留现有路径检查、权限请求、abort、history 与记录次序；提议与接受不是工具 allow 的后果。read_only/工具准入不变。没有把 workspace 路径重新解释为快照；“inline files”只能作为未来单独的内容提议能力，**不替代本单执行文件纵切**。Core 导入会写数据库，故不称“不触盘”。

选择理由：现有 ArtifactHistory 已提供可信不可变内容；128 KiB 的选定文件集合可在一次 Core save 冻结，无需新建 staging 状态。文件包声明为 selected-recorded-versions，不声称这些文件在某个时刻同时存在于目录、覆盖目录全量或是 Run 的所有输出。未选文件不代表删除；path 只是 recorded version 的逻辑名称，不隐含目录 root。首版拒绝 delete/rename 操作语义，不造 filesystem op 日志。若用户需要真正同时刻目录快照，留给 ES-02 的写排除合同。

`file-memo-v1` 是创建时 opt-in 的版本化工作契约，建议新 contract ID `se-file-memo-v1`。不得原地把既有 memo/NDA Matter 升级成该契约，不自动迁移既有 Candidate，不把未知契约投影成可接受。仍使用 evidence-memo extension ID、现有 project/Matter 绑定与 Core owner；adapter 必须按绑定 Matter 的持久契约选择 schema，不能用全局 `this.contractVersion` 切换影响其他 Matter。创建输入的确切字段名及例子由 ES-01 写入正式 contract；此文的 profile/字段名是施工选择而非现存 API。

## 2. 三种集合及完整身份

**文件包**是输出值：排序清单 + 每个文件的确切字节，不是目录句柄。**source-set** 是既有 Core 指定 revision 的法律/工作材料集合，含成员关系及各 source ID/version/digest。**dependency basis** 是本次检查所依赖的有限输入集合与检查政策；包含 source-set，也可能包含固定 base Artifact、Run 指令、host 注入上下文。包 digest 绝不能充当输入集合 digest。

文件 manifest v1：相对 POSIX 路径、UTF-8 byteLength、SHA-256、可信 recorded provenance（Session ID、Run ID、该 Run artifacts 的稳定追加序号、kind、writtenAt）；按路径 UTF-8 字节序排序。路径限可移植 ASCII `[A-Za-z0-9._/-]`，每段非空且不为 `.`/`..`，禁止绝对路径、反斜线、重复斜线、尾斜线、NUL；限制 240 字节，拒绝完全重复和大小写折叠重复。首版路径是逻辑名称，没有 filesystem 解引用，导入只能选择既有受限 ws_write 的普通文件记录，链接/设备或任意路径导入不受支持。文本拒绝孤立 surrogate、NUL、无效 UTF-8；不换行转换、不 Unicode normalization，BOM 若合法即保留为字节。空文件允许，空包不允许。

完整 Candidate identity 由 Core canonicalize，而非相信模型 digest。版本化 canonical JSON（复用 Python `canonical_json` 的 UTF-8、key sort、紧凑分隔、禁止 NaN；新增字段不允许浮点）覆盖：

- Candidate ID、Matter ID、Run ID、base/source/contract versions；领域 payload、artifact_text、evidence、obligations、supersedes/provenance（缺省与 null 不混同，沿既有 exact-key 规则）。
- `fileBundle` 的 schema、manifest digest；bundle digest 对版本标签与完整 manifest canonical bytes 求 SHA-256，各文件 digest 覆盖原始 bytes。内容相同的两个 Candidate 仍有不同决定身份；ES-01 不要求全局去重。
- `basis` 的 schema、冻结 source-set 成员与 revision fingerprint、base Artifact ID/digest 或明确 null、可信 Run 输入描述的 digest、覆盖范围与原因。
- 验证要求的 verifier ID/version、policy digest；检查结果本身不参与 Candidate digest，以免循环引用。

新表中的 bundle/verification 必须通过 Candidate/Matter 外键或同事务严格校验关联。摘要是校验值，不是可恢复内容。原文 byte BLOB 与 manifest 同库存储，不用 file path/hash 替代内容。旧 Candidate 的 canonical payload/hash 原字节不改；新增 file 字段仅新契约可用。签名/真实性含义限本机可信 host/Core 边界，不声称抵抗拥有同用户系统写权的恶意进程。

## 3. 闭合输入：可声明的范围与真实限制

第一版 complete 的定义是 `file-memo-fixed-basis-v1` 的 **声明工作依据闭合**，不是模型全部知识、隐藏推理或全进程依赖被追踪。冻结基底包括 source-set 全成员（含空成员关系）、指定 base Artifact（若有）、Run 指令、host system/current context 与 runtime profile revision/hash。source-set fingerprint 必须包含成员集合而不只命中文本，故新增、删除、替换 source 都失效。目录 list/grep 的范围与不存在结果不能由此推出已覆盖。

新 profile 的首个可接受路径限定为无历史外部输入的干净 Session；新 Session 可绑定已有 Matter 并读取其冻结 base Artifact。服务在 admission 核对 Session 历史与材料输入，无法证明干净时记录 coverage `unknown` 及原因，不自称 complete。不得在继续一个普通历史 Chat 时默默丢弃历史制造闭包。读者可继续常规工作，但该 Candidate 不能接受，需在明确固定依据的新 Session 重提。

保留原有工具体验，不为了 complete 关闭普通 ask_user。**任何未纳入固定基底的实际工具调用或额外输入**（ws_read/list/grep、ask_user 回答、MCP、runtime_load、追加 steering、未冻结历史、恢复/compaction 无法核对）使本 Run coverage 单调变为 unknown/partial，永不靠模型自报恢复 complete。可以保守在工具进入执行前标 unknown，即使最终失败也不恢复。允许且有完整性核验的 se_read_source、指定 base Artifact 分页读、submit 本身不扩大依据。ws_write 是输出操作，精确权限 allow/deny 是授权事实而非新的工作材料，不把正常写入自动标 unknown；其返回的 path/bytes/hash 可作为 recorded selector。其他人工文字输入仍标 unknown。读取其他历史 Artifact 首版也标 unknown。

额外输入标记必须在 host/tool 执行准入和向 Pi 交付上下文之前生成，并绑定 Core Run；不能只看截断 event 文本或模型声明。并发工具先置标记再产生结果；标记失败时停止新文件提交，不能默认 complete。Capture/submit 冻结时检查该标记。提交后仍可能有额外输入：它不会改变已冻结 Candidate 的输入事实，但后来的新 Candidate 必须携带新标记；新 Run 的初始历史含这些结果也不再是干净基底。

这是 ES-01 的关键待实施验证：现有 service 注入 `compileControlContext`、复用 SessionManager、Pi 可 compaction，并合并 ask_user/workspace/extension/MCP/runtime tools。作者必须用实际调用序列证明所有额外输入入口均受监测；漏一个入口则 **不能开放 complete/accept**。可先交付 unknown-only 诊断，但不算本单纵切完成，不能通过一份 fake PASS fixture 结单。此设计不声称现有 runtime 已有该监测。

## 4. 可信验证与事务

可信生成入口选 **Core 内部文件候选保存处理器**：host 只提交模型 proposal、从受信 recorded reader 解析的完整 bytes/provenance 与 host-owned Run 上下文；bridge 只开放受信 `save_file_candidate` 分支给 adapter，不把任意 `verification` 写入 op 暴露成模型工具。Core 先检查 open Run/Matter/版本绑定，canonicalize 全包，在同一保存事务写入 Candidate、bundle bytes、不可变 verification record。模型输入若带 actor/verifier/result/policyDigest/coverage 等保留字段必须报错。host 声明 coverage 的 private 入口也不能由模型 JSON 调用。

首个 verifier `file-memo-structure-v1` 是确定性、无 shell/network 的函数：重新算 bytes/manifest/identity；校验 source 引用与引文、要求契约约束与包完整；记录 passed/failed/unknown 和原因。失败的语义候选可保存供 review，非法编码/超限/归属错误则不保存。record 绑定 Candidate digest、bundle digest、basis fingerprint、verifier ID/version、policy digest。记录与 Candidate 分离、不可覆盖；不接受 client self-signed PASS。ES-01 不做异步重验队列，政策或依据变化需新 Candidate。

格式 PASS 只证明声明检查通过，不证明 memo 专业正确、法律质量或文件适合业务。接受仍需人意图、服务 loaded producer/generation/无 active Run/actor 检查，Core 既有 evidence 与 obligation 规则。domain 决定 required checks；本 profile 不继承 NDA 的“验证通过即可视作 NDA 完成”。

输入冻结与输出一致性不需要新的 filesystem 写锁：服务先复制选中的持久 artifact records，验证 selector 不重复（同路径两个不同版本不得隐式取最新）；按每条记录读 history immutable bytes，完成后重查 admission/coverage，再以一次有界 Core 请求提交。Node 不保留模型可变对象供异步使用，bridge 不把 id 解释为路径。当前同名 workspace 的继续写入只产生新记录，不能替换已经选定的记录与字节。新记录追加也不改变已选集合；若同 path/hash 出现多次，服务固定选择最早匹配的追加序号并记入 provenance，不声称对应唯一 toolCallId（当前 record 没有该字段）。

Core `BEGIN IMMEDIATE` 与单 worker 顺序操作排除本库 source/contract 更新；host coverage 标记、source/Run 绑定必须在保存事务重查。Run artifacts 到 Core 的导入不是跨 RuntimeStore/SQLite 的原子事务：前者必须已持久记录，后者独立 commit；中断只能留下尚未导入的 recorded 文件或完整 Core Candidate，不能先发布 Candidate 再补 bytes。Session 删除受 active Run gate；复制导入成功后 Core bytes 自足，不能在接受时再依赖原 Session/ArtifactHistory。history reader 在读取中发现缺失/损坏即拒绝，不回读 current path。

接受继续进入 `Store.decide` 的可信 capability 路径，事务内：先查原 request receipt → 同键同内容原样返回 → 校验绑定/CAS/契约/source-set/basis/current policy → 重算文件完整性与验证绑定 → 既有 evidence/obligation → 原子写 Artifact 引用、Matter version、Decision、audit、request_result。依赖只取 Core 持久冻结输入与当前 source/contract；不要在持有 SQLite 锁时调用模型、HTTP、workspace 或外部验证器。政策须在 Core 注册为可信固定版本；服务/Core 版本不匹配拒绝此能力，不能把客户端参数当 current policy。

新 Artifact 保留短 artifact_text（既有 reader 仍能读说明）并拥有明确 bundle 关系；不能只接受文本丢掉 files。事务失败没有正式效力；保存成功但未决定只是候选。包、候选与验证同一次 save commit 避免 dangling partial upload。Stop 关闭 admission，事务前检查；若 commit 已发生再取消，保留确实已保存候选但不接受。host settlement 失败沿现有 unknown/reconcile，不重放外部工具。

ACK 丢失：save 以稳定 Candidate ID + 完整 digest 精确重试，沿现有 closed Run 精确 replay 规则；decide 用原 request ID/内容查询与重试。检查 commit 前、commit 后 ACK 前 SIGKILL；只能零次或一次正式接受。重启不重新捕获/重验猜测已接受结果。

## 5. 限额、transport 与错误

下列是 **首版保守工程限额，未做性能测定，不是从现有 ABI 推出的容量保证**：

| 项 | ES-01 上限 | 依据 |
| --- | --- | --- |
| 文件数 | 16 | 小型交付可覆盖正文/附件；控制 manifest、diff 与测试组合 |
| 单文件 UTF-8 bytes | 65,536 | 小于现有 ws_read 512 KiB；便于完整校验，非继承 ws_write 4 MiB |
| 全包 UTF-8 bytes | 131,072 | 一次保存无需 chunk staging；计所有文件总和 |
| 新 Candidate 非文件 canonical 元数据 UTF-8 bytes | 32,768 | 防止 100,000 字符 memo + 证据无限数组挤爆 wire；不追溯旧 memo |
| 单次新操作编码后 JSON line | 1,000,000 UTF-8 bytes 且 1,000,000 JS code units | 低于现有 client `MAX_WIRE_LINE=1_500_000`（实际按 JS length）；控制字符最坏 6 倍转义，128 KiB+32 KiB×6 = 983,040，仍必须实测最终 envelope，越界拒绝 |
| 文件读取页 | 1..4,000 Unicode code points | 沿既有 se_read_artifact；附 byteLength/digest，无字节切半乱码 |
| diff 输入总 bytes / 输出 JSON bytes | 131,072 / 32,768 | 超限返回 unavailable/too_large；不截断成“完整 diff” |

当前 Python `send/canonical_json` 使用 `ensure_ascii=False`；JS/Python 都会转义控制字符。不能把中文字节数、UTF-16 length、wire bytes 混为一谈。两个端点实际编码后分别检查 request/response；wire 限额包含 envelope/id，不依赖以上粗界数学保证。完整内容不进入 `snapshot/get_matter` 或 Context，也不得把所有候选的包或 verification 全量数组塞进既有单行 response。manifest/read/diff 是定向分页查询；投影只带有界摘要引用。历史候选无限增长导致的既有整体 snapshot 容量问题不是此单解决的无限规模保证，需明确测试边界并拒绝超限而非崩溃/丢内容。

复用现有 `INVALID`、`BINDING_MISMATCH`、`STALE_INPUT`、`VERSION_CONFLICT`、`IDEMPOTENCY_CONFLICT`、`CANDIDATE_CLOSED`、`INTEGRITY_REFUSAL`、`CONTRACT_UNSUPPORTED`。建议新增 `FILE_LIMIT`（减包重提）、`DEPENDENCY_INCOMPLETE`（新固定依据 Session 重提）、`VERIFICATION_REQUIRED`（新候选检查）、`POLICY_STALE`（按新政策重提）；ES-01 必须冻结确切 code 与 Core 409/host 400 或既有 gate 状态映射、无状态副作用测试。diff 不可展示是正常只读结果，不是接受错误；内容损坏必须 error，不回退当前文件。新增错误尚不存在。

## 6. Schema、迁移与旧版本隔离

选择 Core user schema **2** + bridge app schema **3**，runtime JSON 仍 **4**，Work 原 envelope 保持 1 并增加显式版本化 file capability。原因：文件引用与接受不变量属于 Core，不能只升 app schema 留旧直接 Store writer 继续写库。当前旧 `Store.__init__` 拒绝 user_version >1，旧 bridge 也只接受 Core 1/app 1或2；因此新库可阻止两种旧入口使用。新 Core 与 bridge 的版本检查、初始化 fixture 与迁移须一起更改。

建议新表：candidate_file_bundle（candidate 唯一、schema/digest/manifest/basis）、candidate_file（candidate+path 唯一、BLOB/size/digest）、candidate_verification（不可变检查结果）、artifact_file_bundle（artifact 唯一→candidate bundle）；Run 可信 basis/coverage 可独立附属表避免改写旧 app_run identity。精确 DDL、外键、约束和 schema validator 是 ES-01 交付，不把这份草案当已审核 SQL。

启动先拿现有 POSIX DB lock，验证旧 schema 完整；升级前用 SQLite backup 到不覆盖既有备份的 `.pre-file-core-v2-app-v3.bak`（已存在则校验/明确拒绝，不盲目覆盖）。所有 DDL、backfill 及 user_version/meta/app version 在同一事务提交；失败回滚。旧 Candidate 不填伪造 bundle/verification，不改 canonical hash、历史决定、来源。Core 1/app1 支持需先执行既有合法迁移再文件迁移，并保留可恢复原始备份；若实现只支持 app2，必须先显式拒绝 app1 而非部分升级，正式 contract 标清该支持范围。

仅在独立 synthetic dataDir 升级/恢复。旧 host 读取新库必须失败；旧备份复制到另一独立目录才可由旧 host 打开。不得把生产 runtime4 目录交给旧 host，不能仅回退二进制当回滚。继承 DELETE journal、synchronous FULL；耐久性声明只针对已跑故障注入和本机 SQLite 语义，不声称未知文件系统电源故障保证。

## 7. 不可变读取、diff 与能力投影

沿 `GET /api/v5/sessions/:id/work-query` 增加 file-manifest/file-content/file-diff kinds；不用新路由，因此无需扩大 server 静态准入。候选/Artifact 选择必须 exact one；服务从 Session binding 推导 Matter，Core join 检查所有权；producer 缺席仍可读。模型使用新 profile 的 `se_read_candidate_file`/`se_read_artifact_file` 有界工具，必须 open Run、Matter 归属；普通 memo/NDA 不自动增工具。具体参数/response 由 ES-01 冻结 fixture。

每页携带 query schema、Candidate ID/digest、Artifact ID（若适用）、bundle digest、path、file digest、offset/end/nextOffset、codePointLength/byteLength；无效 offset 不取模。manifest 分页 limit ≤16、offset 为条目索引、稳定排序。每次先验证整文件字节摘要再切页，不返回当前磁盘路径内容。读历史不授予当前接受资格。未知 schema 只读有界元数据，无法解释的字节不要假称成功解码。

diff base **仅** Candidate 冻结的 base Artifact bundle 内显式指定的对应 path；双方 ID/path 都必须存在且归属校验通过，首版只比较同逻辑 path，不推断 rename。没有 base 时返回 `unavailable:no_corresponding_record`；legacy text Artifact 没有 bundle 则 `unavailable:base_not_file_bundle`，不可拿当前工作目录代替。响应带 base/candidate identities、path 和 modified/unchanged；候选清单可标 only_in_selected_candidate，但这不是文件系统 create 操作，未选入候选的旧文件绝不标 deleted。

同路径文本 diff 用固定算法版本、保留末行无 newline 信息。按两文件合计输入和编码输出双限额，超限 `unavailable:too_large`，仍可分页精确读双方。第一版每请求一个显式对应 path，禁止无界全包 diff；测试超长单行，算法不得做无界二次内存 LCS。接受记录的是本次选定交付集合，不把集合差解释为目标目录变更，delete/rename 操作留给另有授权与执行日志的后续合同。

`humanActions` 仅对 file profile 的 current+complete+required checks passed 候选包含 accept；failed/unknown 仍可 reject/request_evidence，直接 action 再被 Core 拒绝非法 accept。只改图标/去掉按钮不是后端约束。关闭通用文本 `revise_candidate` 对 file profile 的写入口（不允许静默丢 files）；首版修订用新 Run 重提并显式 supersedes。旧客户端不能因认识 `decide` 而误解新契约：file capability 未认识时只读，由契约兼容策略和 fixtures 证明。

## 8. ES-01 写权与验收

ES-01 为单一后端 writer；必须从根 Astra 指定清洁节点重新建树，不按本文旧 SHA 猜当前状态。作者不独立接受自己的实现。仅授予以下精确写权；若真实实现需越界，先向根 Astra说明具体接缝，不顺手扩展全仓：

- `app/core/core.py`、`app/core/bridge.py`、`app/core/client.mjs`、`app/core/owner.mjs`：schema/事务/可信检查/有界查询与能力投影。
- `app/extensions/work-adapter.mjs`、`app/extensions/evidence-memo/index.mjs`：按 Matter opt-in profile、工具 schema 与既有 action 检查；新增 `app/extensions/file-memo-policy.mjs` 只放该能力声明/规范化。
- `app/server/service.mjs`、`app/runtime/pi-session-runtime.mjs`：Run 输入冻结、执行前额外输入标记、queryWork 查询。Pi 仅增加必要输入观测接缝，不重写循环/Session 持久化。
- `docs/work-core/contract.md`；新增 `app/tests/execution-file-candidates.test.mjs`、`app/tests/execution-file-continuity.test.mjs`、`app/tests/fixtures/work-core/file-candidate-crash.py`、`app/tests/fixtures/work-core/file-candidate-packets.json`、`app/scripts/file-candidate-fixture.mjs`；既有 `app/tests/work-core.test.mjs` 仅更新 schema fixture 断言和回归。
- 新增 `evidence/backend-dispatch-20260909/es01-implementation.md`，记录固定代码/命令/结果/未检项。

不授予 workspace-tools、ArtifactHistory、RuntimeStore、FE、catalog/manifest、current、Paper、其他 PR 文档的写权；若现有 schema fixture 在别处使这份列表不足，报告根 Astra 后精确追加。schema bump 对直接 Store 的测试不可跳过。

必须通过的反例（待执行，非已通过）：

1. 同文本不同文件/路径/依据/Run 得不同 Candidate identity；同 ID 异包冲突。A 保存后任意 workspace 文件变 B，接受/重启读仍为 A。
2. `after_history` 与 `after_write` 崩溃的孤立 blob/未记录文件不能导入；伪造 selector、跨 Session/Run、仅 hash 存在、history 损坏/缺失均拒绝。模型伪造 PASS/coverage/actor、A 回执套 B、修改包 bytes/manifest、cross-Matter read/decide 均失败；正式版本/Decision 不变。
3. source 新增/删除/版本变化、policy 变化、不相交文件修改但依据已失效均禁止 accept；历史仍可读。
4. ws_read/list/grep、ask_user/MCP/runtime_load/steering/历史/compaction 不可核对各自触发 unknown；在 submit 并发窗口的外部输入不能漏记。新干净 Session + 固定 sources/base 真正能达到 complete，不靠测试绕过 service。
5. 文件大小边界 ±1、全包边界、文件数、ASCII 路径冲突、emoji/surrogate/control-char 转义、metadata/wire 边界、diff 巨长单行、跨页 Unicode；不 truncation 冒充完整。
6. 两个同 base 决定至多一个成功；save/decide 的同键同内容 replay、同键异内容冲突；SIGKILL save 及 accept commit 前后、ACK 前、Stop/admission 关闭；重启保持精确零/一次。
7. 干净真实 service/Pi loopback：opt-in 绑定 → ws_write/权限/recorded → submit selectors/导入 → finish → HTTP page/diff → human decide → 删除旧 Session/新 Session 绑定 → artifact file page；producer absent 保留只读；旧 memo/NDA、plain Chat/read_only 不变。
8. Core1/app2 迁移、失败回滚、旧 Store 与旧 bridge 拒绝、独立 backup 恢复，旧 hash/Decision 不变；Core1/app1 按交付支持矩阵实测或明确拒绝。

作者至少运行定向新 Core/service/crash tests、`npm test` 与 `npm run smoke`（app 目录，隔离数据/无付费 provider），文档链接与 diff check。新增脚本提供真实 HTTP 请求和可重复输入，FE fixtures 分别含 ready/unknown/failed/stale/accepted/producer-absent/unsupported/missing-bytes。非作者随后独验关键竞态、身份、迁移与消费者；根 Astra 才能接受稳定消费 SHA，不关闭产品 G1–G5。

## 9. 后续分单

**ES-02**：有真实多文件大包需求后才做 workspace 受控捕获/分块传输。先制定参与写排除的全部写者、generation 与 closed source-set，再实现 staging finalize/孤儿回收、外部 blob durability（若必要）、完整目录成员/不存在依赖。任何外部可写目录必须明确 unsupported 或实现真正隔离；LayerFS 不是前提。

**ES-03**：扩展验证 policy 与异步检查、精细依赖和重验、文件 revision/更大 diff；按实际消费者再开受权导出/应用合同（目标版本、部分失败与恢复），独立于 accept。ES-FE 依赖 ES-01 冻结协议后进入既有单写者队列，不借 ES-00 改前端顺序。
