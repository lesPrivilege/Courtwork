# Luna fast explore：共享中间文件、消息、附件与 annotation index

## 范围与结论

本稿是对当前 Courtwork main 源码、现行契约和已经登记的 PR 草稿的只读勘察，供 Astra 做成熟实践调研后的裁决。没有把外部产品观察或未验收的设计稿当成已经存在的 API。源码检查基线为：

- 实际读取位置：共享Courtwork checkout（不是指定隔离树）；分支：main；当时 HEAD：173129e91b84e8dd0b533c7db641ec6cf3394a06
- 指定的隔离树/产品基线分别为 ebd3e52 / 647bc216；本次读取并非在该隔离树中进行。直接比较 647bc216..173129e9 的 app/ 与 docs/ 无路径差异；读取后 main 已前进到 d62f6bb，相关 app/docs 差异仍按 Astra 的对账为无。
- 工作树已有与本稿无关的修改；本稿不触碰这些修改，也不提交。

当前系统已经有三种可复用的“确切内容”事实：运行时对 workspace 路径做 Session 作用域隔离；ws_write 在发布前保存内容历史并在发布后追加 content-version 记录；Work Core 对候选文件包、Artifact、Evidence 和 Decision 使用不可变版本与事务接受。系统还没有跨消息、Run、Session 或项目复用的通用 Resource、Attachment 或 Annotation 索引。

因此，裁决前应先把“内容对象”和“正式工作成果”分开：

1. 普通上传、消息附件、工具产物和候选文件都可以引用同一类不可变内容对象，但引用关系、拥有者、可见性和保留期必须单独记录。
2. Artifact 继续表示 Core 的正式成果版本，Decision 继续表示可信人机通道下的正式后果。可见附件或“已写入”不能自动取得这两种 Authority。
3. annotation 只能是对特定内容版本的可验证坐标和引用，不是把一段标注文字提升为证据或接受结论。内容改变、digest 改变或坐标无法唯一定位时，标注应变为 stale/unresolved。
4. 前端只投影服务返回的 identity、digest、scope、状态和实际动作；不能由 path、文件名、Run completed、tool result 或本地数组推导“已上传”“已接受”或“证据通过”。

外部成熟实践的产品比较由 Astra 另行完成；本稿给出可直接与该比较对照的仓内事实、最小契约边界、后端/前端 PR 分片和验收反例。

## 已有事实和缺口

### Core 正式成果边界

engineering/core-contracts.md:7-34 规定 Run 绑定 Matter、base version、Contract/Extension 和 Session；Session 删除不能级联删除正式成果、裁决和义务。core-contracts.md:21-26 要求幂等 identity 同时绑定请求内容，提交时重新比较 base version，并在一个事务中追加 Committed Event、更新 State、active Artifact 和义务。core-contracts.md:28-34 明确 Artifact 内容不可变、Evidence 要绑定来源版本与坐标；外部大文件须先成为可校验的不可变对象，再提交引用；原件、候选、接受版本、检索摘要和执行 trace 生命周期不同。

docs/work-core/contract.md:5-11 把 app/core/core.py 定为 Matter/Candidate/Decision/Artifact 的事务拥有者，把 bridge 定为 Run admission 拥有者；现行 Core schema 是 4，bridge app schema 是 5，Runtime JSON 是 8（该文档是契约说明，不代替当前源码验收）。docs/work-core/contract.md:29-42 进一步规定 decide 接受才原子创建 Artifact/版本/Decision/audit/receipt，客户端不能从 Run 完成、工具权限或可见按钮推导 Authority。

现有 file-memo seam 已足够说明正确的精确内容模式：docs/work-core/contract.md:75-83 使用已有 Core/Matter/Candidate/Artifact/Decision 所有者；保存 recordedFiles 时读取经过验证的 ArtifactHistory bytes，不读 mutable workspace、HTTP preview、其他 Run 记录或 orphan blob；manifest 带 path、bytes、sha256、Session/Run/recordIndex、kind 和 writtenAt。docs/work-core/contract.md:89-95 规定 file query 必须按 Candidate/Artifact identity 分页，完整 bytes 在切片前核验，接受在现有事务内写 Artifact bundle relation、版本、Decision、audit 和 request receipt；Accept 不写回 workspace。

这是一条成熟的内部先例：先保存和核验 immutable bytes，再保存引用；读、审阅、验证和接受都携带同一 identity；正式接受由 Core 决定。它不能直接扩展成通用附件表，因为普通 Chat 和消息附件没有 Matter/Decision 语义。

### RuntimeStore 目前只管理执行账本

app/server/store.mjs:29-44 的 SCHEMA_VERSION 为 12，顶层 state 只有 projects、sessions、runs、events、questions、provider 配置与扩展/协调状态；没有 resources、blobs、attachments、annotations 或关系索引。app/server/store.mjs:188-198 的 Artifact 校验明确说它是某次写入时刻的 content version，结构只有 path、bytes、sha256、kind:"content-version"、writtenAt，path 不是 mutable handle。

app/server/store.mjs:200-312 校验 Session、Run、Event、Question 的归属和连续 seq。app/server/store.mjs:394-418 的事件追加和 command receipt 依赖 Session/Run，receipt identity 包括 input 和 supersedes；app/server/store.mjs:660-692 建 Run 时自动追加 user.message 与 run.status。这支持“消息属于一次执行”的线程投影，不支持一个附件同时被多个消息/Run/项目引用。

app/server/store.mjs:702-745 的 appendEvent、appendArtifact 和 listEvents 仍是 Run 事件接口；appendArtifact 只把 path/bytes/sha256 放进该 Run 的 artifacts 并追加 artifact.written。它可以作为旧 Run 产物的兼容投影，不能承载跨 Session 的 blob ownership 或 attachment relation。

app/server/store.mjs:632-643 的 Session 删除会删执行账本、Run、Event 和 Question，但返回 workspaceRetained:true。契约上这不是安全擦除。若未来 Resource 允许项目、Session、消息和 Run 多种拥有者，必须显式定义 owner/lifecycle/retention；不能让 Session 删除或磁盘清理隐式决定共享对象是否可读。

### Workspace、materials 和 ArtifactHistory 是三个不同语义

app/server/service.mjs:665-692 的 addMaterial 只在 materials/<name> 创建或替换当前 workspace 文件，返回 path/bytes/sha256；它不追加 Runtime event，也不写 Run artifact。service.mjs:694-735 的 workspace 读取返回 kind:"current"，对大文件可截断，但 digest/bytes 描述完整当前文件。该返回值不能作为历史 snapshot 或正式附件凭证。

app/server/service.mjs:737-762 的 Artifact file 读取先按 sessionId + runId + path + sha256 查找 Run artifact，再从 ArtifactHistory 取 bytes；历史缺失和损坏会分别返回 410/500 类错误。它是受 Run.artifacts 授权的 content-version 读取，不是通用 blob API。

app/runtime/workspace-tools.mjs:9-17,86-124 把 workspace tools 限制在一个 managed Session directory；绝对路径、.. 和 symlink escape 均拒绝。workspace-tools.mjs:214-281 的 ws_write 将 permission 绑定到精确 toolCallId、path、bytes、contentSha256 和 preview，在 publish 前保存 history，在 rename 后再调用 onWritten，并明确记录 crash windows。这是权限和历史一致性的现成先例。

app/runtime/artifact-history.mjs:65-175 按 Session 建 Git object repository，读取时检查 ref、blob 类型、大小、bytes 和 sha256；该组件没有通用跨 Session reference/GC/attachment relation。另一个 Session 的 history 不能由 path 或相同 digest 自动授权读取。

### Frontend 目前是对象投影，而非 Resource owner

app/web/thread-projection.mjs:1-40 将 user.message 投影为 immutable user row，使用 event seq、Run startedAt、runId；同一个文件或附件没有 relation projection。app/web/user-message.mjs:45-93 已提供完整原文、Source、Copy 和 Edit-as-new；Edit 是新 draft，不覆盖历史。该消息动作是可复用的 attachment display host，但不等于附件存储能力。

app/web/inspector.mjs:37-176 的 Run inspector 把结果显示为 Run artifact content versions，并区分 current 与 recorded；inspector.mjs:261-328 显示事件、通知和文件 identity；inspector.mjs:329-375 通过 identity 读取 workspace 或 artifact 文件，响应不匹配会被拒绝。它没有 accepted-by-review 标记，也没有 Resource/Attachment/Annotation projection。

app/web/markdown-source.mjs:3-14,30-40,85-95,99-107 已有可复用的 annotation 相邻模式：source bytes 先做 UTF-8、大小和 digest 检查；identity 包含 Core file 或 content-version 归属；projection 只读并给每个 block 稳定的 revision-local ID、Unicode code-point start/end、raw source 和 outline。它适合作为 annotation 坐标校验的 renderer precedent，但不应被误当作持久 Annotation index。

docs/reference-entrypoint-audit.md:18-40 观察到消息 actions、Run history 和 Workspace/File tabs 是已有入口，Workspace 现在是扁平路径列表；建议复用既有 surface，不创建全局 Changes/Artifacts 队列。这个边界与共享 Resource 的跨对象索引相容：可先在 message/Run/file 详情中挂载关系，等真实跨项目检索需求成立再增加集合入口。

### 编号与术语去重对账

本片不占用现有 BE-24，也不重定义已有 Resource/Preview：

- BE-24 在仓内有历史撞号。delivery-fe04.md:192-201 的早期草案把 BE-24 用作 Approval 乐观并发；同一交付页 :254 说明复核后 BE-24…27 已重编为 backend-requests.md 中的 BE-30…33。另一个历史探索 ex-cc2-home-modules.md:67-71,125-133 把 BE-24 用作 work-summary coverage signal，而且该项后来裁为不开。BACKLOG-DISPOSITION.md:47 明确已读请求表未出现 BE-24，并要求新请求查实际 HEAD。因此共享 content-resource 首片不要复用 BE-24；最终编号由 Astra 按实际 HEAD 另行分配，或挂到一个已有 owner ticket。
- Runtime Resource 是另一套已存在的能力/配置语义。docs/runtime-control/architecture.md:7-29 定义 kind、identity、source、owning scope、activation、exposure、health 和 provenance；backend-requests.md:8-18 的 BE-5/6/7/8/11 及 docs/runtime-control/api.md:7-11 对应 resolver、profile、policy、MCP/skill 等运行时资源。它们不是用户上传的 binary/text content、message attachment 或 annotation anchor。新片使用 content resource / attachment relation 的限定词，不能把 runtime-resources 端点当作内容对象存储。
- Preview 也已有多种不相同的语义：backend-requests.md:58 的 BE-17/18 unsaved provider preview 只做临时模型目录/连接探测，不持久化、不创建 Run；现有 Workspace/File preview 是同源可信 renderer slot，且 summary-disclosure 与 surface 文档要求 Browser 不等于 File Preview。共享 Resource 首片可复用既有 file/detail renderer，不能另开 Preview 端点、把 preview 当 immutable snapshot，或用 Preview 命名新 BE 单。
- BE-2 是多文档工作面 tab 状态，BE-19/20/23 分别是 memory、temporary chat、projectless Chat 方向；这些是消费场景/会话语义，不是 content-resource owner。BE-41 是只读的 Core project derivation，明确不建私有 store。上述编号可作为依赖或消费点，不能吸收新 Resource 事实。

## 最小共享内容 seam（供 Astra 裁决）

以下不是数据库 DDL，而是把 PR 拆开所需的最小可判定语义。Astra 保留最终 owner、schema 和迁移决策。

### 1. 内容对象和版本

每个可引用对象至少需要一个不可猜的 resourceId，以及一个不可变 content version identity，后者绑定：

- resourceId、version/created identity、owner scope；
- media/profile（plain text、markdown、image、PDF 等）和是否可解码；
- 完整 byte length、sha256、immutable storage reference、createdAt；
- write/import origin（message upload、material、Run output、Core candidate 等）；
- lifecycle/status（available、missing、corrupt、stale、deleted/retained 等）；
- capability/visibility，明确谁能读 metadata、完整 bytes 或导出的 projection。

同一 sha256 可以去重物理 bytes，但不能合并 logical identity、owner、permission、source provenance、filename、message position 或 formal authority。相同内容被两个用户上传，仍然是两个可审计引用，除非服务明确给出共享关系。

外部或大对象必须先完整写入、计算 digest、重新读回核验，再创建正式关系。中断留下的 orphan 可以由显式 GC 处理；正式 relation 不得指向尚未完整可读的对象。Digest 只证明读取到的 bytes 一致，不证明来源真实性、专业正确性或用户同意。

### 2. Attachment relation

Attachment 是关系，不是 path 的别名。最小 relation 需要：

- attachment identity；
- resourceVersionId；
- subject kind/id（message、Run、workspace material、candidate、Artifact、project 等）；
- role（input、context、output、evidence-suggested、evidence-accepted 等）；
- ordinal/display metadata（文件名、caption、message position）；
- actor/createdAt、visibility 和 retention owner；
- relation state（active、detached、stale、unresolved），必要时有 supersedes/replaces。

写入消息附件应先创建或确认 immutable Resource，再以同一 request/command identity 写 Attachment relation；同键异内容必须拒绝。Run output 可以继续生成 artifact.written 兼容事件，但跨对象关系必须显式引用 content-version，不得由同名 path 反推。

### 3. Annotation index

Annotation 不直接保存“当前文件第 N 行”这一类可变坐标。最小 anchor 至少绑定：

- annotationId 与 resourceVersionId；
- coordinate unit（建议明确为 Unicode code point 或 byte；不能混用）；
- start/end，必要时 block/paragraph selector；
- quote/snippet digest 或 exact quote，用于重新核验；
- kind/source/author/status（human/model/system、suggested/verified/stale/unresolved）；
- createdAt、updatedAt、supersedes；
- optional provenance to message/Run/Candidate/Evidence。

读取时先核验 resource version 的完整 digest，再检查范围、quote 和 parser/profile 版本。不能唯一定位、bytes 缺失、内容 digest 变化或 parser 不支持时，只返回 stale/unresolved 诊断；不能把 nearest text match 当成同一锚点。Annotation verified 也只表示坐标/引用通过该检查，不能替代 Evidence verification、Decision 或专业 Authority。

## 后端 PR 施工顺序（待 Astra 重新编号/认领）

当前 roadmap 已有大量相邻编号。建议把以下作为依赖顺序附着到既有条目，不另造同义 owner 或提前关闭现有 ticket。

### B0：Resource contract and immutable object seam

目标是先冻结上面的 Resource version、owner scope、visibility、read capability、dedup 与 retention 语义，接入现有 managed storage/ArtifactHistory 能力，提供受限 create/read metadata/read bytes。第一版只支持有界 UTF-8/markdown 或明确的一种 media profile，返回完整 identity、bytes、sha256、truncated=false/原因和 capability。必须具备 idempotency、ownership checks、missing/corrupt diagnostics、crash/restart/recovery fixtures。

这一步应由 Astra 归入现有 Core/Runtime owner 体系；不得把 RuntimeStore.artifacts 或 Core Artifact 静默改成通用 blob table。docs/work-core/contract.md:75-99 的 file-candidate immutable bundle 可以作为 bytes/manifest/verification 的测试 precedent，但普通消息对象不应被迫创建 Matter。

### B1：消息附件 relation

把 user.message 的现有 command identity 扩展成引用已确认的 Resource version，或在同一 owner 下增加独立 message-attachment relation。要求消息重放、丢 ACK、同键异内容、跨 Session/Project 读取和 Session 删除都有确定结果。消息正文仍由 thread-projection 投影；附件只显示服务提供的 identity/status/role。临时 Chat（BE-20）和普通 projectless Chat（BE-23）必须明确是否拥有或仅临时引用资源，不能用 Attention global session 代替 BE-23；现有 roadmap 已记录此边界（engineering/mvp/execution/work-surface-kit/backend-requests.md:30-39,119-121）。

### B2：materials/workspace import bridge

addMaterial 当前是 current workspace file 的写入路径，不能直接冒充 attachment。若产品要把 material 附加到消息或 Run，应新增明确的 import/capture 操作：读取完整 bytes、固定 digest/version、写 relation 和可追溯 event；当前文件后来被替换不应改变已附加版本。Workspace path protection 可复用 resolveWorkspacePath，但路径本身不得成为跨对象 identity。

### B3：Core candidate/Artifact evidence bridge

只在 B0/B1 的 immutable object 和 relation 已有独立验收后，才把 file candidate 或 annotation suggestion 接入 Core。沿 ES-BE-01 的做法，Candidate 保存 exact file bundle/verification，Accept 仍走已有 Core transaction；recordedFiles、annotation anchors 或 attachment role 只作为经过核对的输入，不能从模型 JSON 的 verifier/PASS 字段取得权威。

该步骤可与现有 ES-BE-01 / ES-FE-01 对齐，不扩展到通用“Accept attachment”动作。BE-41 规定 project derivations 只读现有 Matter/source/candidate，不建 Spark 私有 store（docs/work-core/contract.md:109-113），因此共享 Resource 投影也应只读已登记关系，不维护第二套正式事实。

### B4：Annotation projection and maintenance

先提供 read-only bounded index 和 version-bound query；写入 annotation 的 actor、request identity、anchor validation、supersedes/stale 语义在后端冻结后再开放 mutation。分页/排序必须稳定，snapshot token 改变时返回显式冲突；资源删除、missing bytes、parser profile 升级和 source revision 变化都应留下可解释状态。

### B5：Retention, migration, recovery and GC

以 owner scope 列出保留规则：project-owned、message-owned、Run trace、candidate/Artifact 和 derived annotation 不同生命周期。先做独立备份、schema validation、crash points 和 orphan GC dry-run，再迁移。Session delete 的 workspaceRetained:true 既不是安全擦除，也不应默默删除 project-owned Resource。旧 host/旧 schema 必须 fail closed，不能拿新 Resource state 给旧 RuntimeStore。

## 前端 PR 施工顺序（消费事实）

### F0：Identity-aware attachment display

复用 app/web/user-message.mjs 的 immutable message、Copy/Edit-as-new 和既有 app.mjs event merge；在 message body/footer 增加附件摘要，只显示 filename/profile/bytes/digest-short/status/role 和“打开详情”实际入口。加载和切换都以 messageId + attachmentId + resourceVersionId 作为请求 key，旧响应不能覆盖新消息。缺 bytes、corrupt、stale、unsupported 都提供文字原因和只读入口。

### F1：Composer upload/import

将选择文件、上传进度、cancel/retry 和提交消息看成独立状态维度；发送前必须得到服务端 Resource identity。失败、超限、取消、ACK unknown 不应让消息行显示已附加。复用既有 composer controls、focus restoration 和 tooltip/aria-label；不要把 upload permission、tool approval 和 formal Review Accept 合并为一个按钮。

### F2：Resource relation detail

在现有 Workspace/Run/File tabs 和 inspector 上显示 Resource provenance：source message/Run/material、owner scope、content version、digest、current-vs-recorded、read capability。使用现有 file identity guard 和 markdown renderer；绝不用当前同名 workspace file 替换 recorded bytes。跨 project/session 访问失败时显示服务的 binding/permission 错误。

### F3：Annotation reader

先只读：根据 resourceVersion identity 拉取 bounded annotation page，把 start/end、quote check、status 和 provenance 与 markdown block/outline 对齐。高亮只作为 renderer；verified、accepted、evidence 的词义沿现有 Work Review 词表，不新增“Apply annotation”或“Accept attachment”。anchor mismatch 应显示 stale/unresolved 和查看原文入口。

### F4：Review integration

只有 Core 明确返回 Candidate/Artifact/Decision relation 和合法 humanActions 时，才在现有 Work Review 添加 evidence/attachment context。沿 ES-FE-01：读取、验证、接受使用同一 candidate/base/request identity；Accept 的后果写成保存正式成果，不暗示覆盖磁盘或确认外部上传。普通消息附件、Run output、permission question 和 Core Accept 维持不同词和不同 action。

## 共享状态矩阵

| 服务事实 | 前端可显示 | 前端不可推导 |
| --- | --- | --- |
| Resource upload/import in flight | 正在准备、可取消 | 已附加、已进入 Run |
| Resource available + digest verified | 可打开的版本、bytes、digest、scope | 来源真实、专业正确、已接受 |
| Attachment relation active | 已附加到明确 message/Run/subject | 全局可见、可复用于其他 owner |
| Current workspace file | 当前文件、当前 digest、可能截断 | 它等于某个历史 attachment/candidate |
| Run artifact written | 该 Run 的 content-version 结果 | Core Artifact/Decision、审阅通过 |
| Annotation verified | 坐标和 quote 对该版本通过校验 | Evidence verified、formal acceptance |
| stale/missing/corrupt/unsupported | 原因、历史 identity、可执行读取/修复入口 | 用同名当前文件替代、标绿、静默重绑 |
| ACK unknown/command conflict | 可恢复待确认或冲突详情 | 重发新 key、乐观显示成功 |
| Session deleted, resource retained | retention owner 和可读性 | 安全擦除已完成 |

## Adjudication-ready acceptance and counterexamples

后端和前端各自的 PR 都应交 synthetic fixtures、真实 HTTP/服务纵切和独立复核 evidence。至少覆盖：

| 反例 | 必须观察到 |
| --- | --- |
| 同一 sha256 从两个 owner 上传 | bytes 可去重，logical Resource/Attachment identity、权限和审计不串 |
| 消息 A 附件版本 v1，随后 workspace 同名文件变成 v2 | A 仍读 v1；当前文件单独显示 v2 |
| 同 command key 重试但附件 digest/subject 不同 | 明确 conflict；无第二 relation、无消息伪造 |
| upload/write 在 object 完整落盘前 crash | 不出现正式 relation；orphan 仅进入显式清理 |
| object bytes 被破坏或 history 缺失 | corrupt/missing；不返回替代内容，不变成 accepted |
| 跨 Session/Project 用同一 resourceId/path 读取 | binding/permission refusal；不能由 digest 或 filename 越权 |
| Annotation 绑定 v1，内容换成 v2 | stale/unresolved；不能按相同文字邻近匹配自动转移 |
| bytes 相同但 parser/profile/coordinate unit 不同 | identity/profile 不合并；坐标单位显式 |
| message edit / retry / Run supersedes | 历史消息与旧 Attachment 保留，新消息/Run 有新 identity |
| Session 删除、项目继续存在 | project-owned Resource 按 retention 可读；execution trace 的删除规则单独生效 |
| producer/Core 缺席或旧 schema | 只读兼容投影或明确 unsupported；不出现 mutation |
| ACK 在 relation commit 后丢失 | 原 request query 返回同一 relation；前端不重复创建或显示确定失败 |
| annotation / attachment 大于 page limit | 有界分页和 snapshot token；不以空页表示“没有更多事实” |
| permission ask 允许一次精确 ws_write | permission 绑定 call/path/bytes/hash；后续异内容不能复用 |
| Run completed、tool result 或 visible “Accept” | 仍不能单独取得 Core Artifact/Decision Authority |

## 不应在本轮登记的设计

- 不在 RuntimeStore 旁边再建一个前端-only Resource/Attachment/Annotation truth store。
- 不把 path、filename、URL、sha256 或 event seq 当作全局 identity。
- 不把普通 message attachment 直接塞入 Core Matter/Candidate，迫使普通 Chat 创建 Matter。
- 不把 Artifact 改成可变文件 handle，不把 addMaterial 返回值称作历史 snapshot。
- 不把 permission approval、tool result、Run completed、annotation verified 或 renderer 视为正式 Accept。
- 不新增全局 Changes/Artifacts/Annotations 队列、restore/fork/discard 或 Apply 按钮，除非一个已有 roadmap item 先冻结其真实后端事实和 owner。
- 不以 BE-41 的只读派生查询或现 Attention global session 代替通用 Resource seam；已有 roadmap 明确 BE-23 projectless Chat 保持开放，且不新增同义 BE 编号。

## 给 Astra 的裁决输入

1. 先裁决 Resource owner 与 content-version/Attachment relation 的最小语义，再决定是否需要 Runtime schema migration；当前源码证据只支持 Run/Session execution ledger、Core formal work 和 per-Session workspace/artifact history 三个边界。
2. 以 B0 immutable object + B1 message relation 为前置，B2 workspace import、B3 Core evidence、B4 annotation projection、B5 retention/recovery 依次施工；FE 只在每个后端 fixture/HTTP seam 固定后接入。
3. 将 B3/B4 绑定到已有 ES-BE-01/ES-FE-01 和 Work Review/markdown precedents，将 B1/B2 对齐 BE-2、BE-19/20/23 的真实消费场景；不要创建重复 owner，也不要把 BE-41 只读派生查询当作通用 content-resource backend。
4. 合流证据应分别列作者实现、Luna 独验和 Astra 组合裁决；本稿只提供源码事实和反例，不能代替外部成熟实践比较、产品接受或部署授权。
