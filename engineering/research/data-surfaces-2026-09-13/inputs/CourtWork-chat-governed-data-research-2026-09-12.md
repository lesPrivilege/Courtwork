# CourtWork · Chat 自研节点与受治理数据面研究

2026-09-12。增量研究，接续 runtime-composition-v2；非产品实现或许可证明。


---

# CourtWork · Chat 独立节点与受治理数据面

2026-09-12 · 初步研究与实施交接增量。

**采用方向：Chat 是独立自研节点，由原生 Provider 入口/容器、获准本地投影和只读薄能力组成；不是第三套通用 Harness。先形成跨 Provider 的可追溯数据，再让 Chat、Spark、Attention 从同一受治理读取面消费。**

本包接续上一轮 runtime-composition-v2，不重写其原件，不改变「Harness GUI 跑通 → 真实 Runtime 替换 → Work 小场景闭环」的主线。Chat/数据研究可以并行；共享 owner 的实现和迁移仍串行合流。全部工单为拟议，未创建 GitHub PR，未部署或调用真实模型。

## 四项裁定

1. **入口、采集、组织、披露分别设计。** 能显示网页不等于可自动提取全部聊天；能读 CW 的 connector 不等于能读 Provider 原生聊天库。容器成功不是数据连续性的前提。
2. **用途不能替代接入许可。** “不做 coding”是清楚的产品边界，但条款还约束自动提取、认证、再分发等。首片采用官方导出或用户明确提供的材料；薄工具用官方支持的 app/MCP 通道。未经核准的 DOM 抓取、逆向私有 API、登录 token 转用不进入路线。
3. **围绕 Work Core 建数据治理，不把所有数据塞入 Work Core。** 来源保留、消息投影、索引、个人 memory、正式成果继续按原 owner 划分。统一查询面不等于统一写库权。
4. **grep 是受控读取能力，不是全盘访问能力。** 先解析可信身份与当前 grant，再在可披露集合中搜索；每次 exact read 再验证来源版本、范围和撤权。真正的词法引擎可以很简单，治理语义不能省略。

既有 repo 已有 Chat Broker/薄能力和 RD-007 的合同基础，本包是外部核验与实施收敛，而非再次发明总架构。[R01/R02/R03](#r01)

## 文档导航

| 文件 | 负责的决定 |
|---|---|
| **01-CHAT-CHANNELS.md**（见本文对应章节） | 两个数据方向、政策准入、容器与官方 connector 的分工 |
| **02-DATA-ORGANIZATION.md**（见本文对应章节） | owner、稳定身份、来源/版本/表示、组织关系与生命周期 |
| **03-GOVERNED-DISCLOSURE.md**（见本文对应章节） | 渐进查询/读取、真实 grep、授权、覆盖与披露证据 |
| **04-IMPLEMENTATION.md**（见本文对应章节） | 有界实施片、既有编号映射、验收负例及产品闭环 |
| **HANDOFF.md**（见本文对应章节） | 本地接单指令、文档落位和维护策略 |
| **SOURCES.md**（见本文对应章节） | 固定 repo、官方公开来源、证据上限 |

`channel-register.json` 只是方案登记，不是运行配置、许可证明或 capability advertisement。`work-order-map.json` 只是依赖映射。`verify-package.py` 只检查本包，不能代替产品测试。

## 最先可交付的闭环

用户主动导出的两份聊天/选择的片段 → CW 原件与版本保留 → 本地检索/精确引用 → 用户选择披露集合 → 一个官方 Chat 通道只读查询 → 可回源的交谈。

容器 spike 独立进行。Spark/Attention 的 first slice 等待所需 reader、版本与责任合同成立，不等待一个完整通用资料平台。


---

# 01 · Chat 通道、政策与容器

本页是设计裁定与接入条件，不是供应商许可或法律意见。执行前按账号、计划、地区、组织策略及具体分发方式复核。没有 blanket “合规=true” 字段。

## 1. 四个接缝，不合成一个 ProviderAdapter

```text
Provider 原生聊天界面 ── SurfaceChannel ── 人主导的 Chat 入口
       │
       │ 官方导出 / 用户明确提供（不是未经许可的后台采集）
       ▼
AcquisitionAdapter ── Intake / Conversation projection ── 受治理资料
                                                        │
                       精确获准 refs / search / read     │
另一 Provider 原生 Chat ◄── Official App / MCP ◄── Disclosure Broker
```

**SurfaceChannel** 负责打开、定位和可用性，不据网页显示声明抓取权限。**AcquisitionAdapter** 负责已获准来源的导入、原定位/版本/coverage。**Projection** 负责用户本地可查看的材料与关系，不伪造上游完整状态。**DisclosureBridge** 向一个获准目的通道提供最小读取；它不是调用消费端私有 API 的反向代理。

上述不是新增四个常驻服务；可以是同 Host 下四组小接口。它们也不替代已有 Runtime Adapter/Model Adapter：原生网页 Chat 是上游产品，不是裸模型。[R01/R02](#r01)

## 2. 政策事实与工程结论

OpenAI 本轮个人服务条款页面标注 2026-01-01 生效，明确限制自动/程序化提取数据或输出以及绕过保护；API/商业服务另有适用条款。用户享有内容权利不能直接推出第三方任意获取机制获准。[P01](#p01)

Anthropic 本轮 Consumer Terms 页面标注 2025-10-08 生效，限制未被允许的抓取和自动/非人访问，API 或明确许可路径有不同适用条件。是否 coding 不是这些条款的判断轴；公开分发与商业包装还需核实际服务协议。[P02](#p02)

因此本轮采用下面的工程准入：

| 路径 | 本轮处置 | 不能声称 |
|---|---|---|
| 用户在官方入口导出后，主动把文件交给 CW | 首选 acquisition；先预览范围后保留 | 自动持续同步、稳定官方 schema、包含所有附件/分支 |
| 用户主动粘贴或提供已获准片段 | 支持并标为 user-provided/partial | 完整历史、上游签名真实性、覆盖不可见内容 |
| 官方自定义 app/MCP 向原生 Chat 提供 CW 数据 | 首选 thin disclosure，首版只读 | 因存在 connector 就可导出全部原生 chats |
| 外部浏览器打开原生 Provider | 首片稳妥的 surface 基线 | CW 已接管其原生工具或内部运行 |
| 隔离的原生 WebContentsView | 有条件 spike；按 Provider 逐一确认技术和政策 | 可自动提取、绕开认证/CSP/保护或永久兼容 |
| 自己的 API 纯 Chat | 可选另一路；适用 API 配置/计费/政策 | 等于消费者网页体验、继承原生历史或订阅权益 |
| 后台 DOM harvesting、私有接口逆向、会话 token 转作模型 API、自动镜像发送 | 不采用 | 不因本地自用、低频或“只聊天”获得例外 |

官方 ChatGPT 和 Claude 均有数据导出说明；具体计划与组织权限不同。官方导出可成为来源，但不等于原生会话可导入任意另一个账号/Provider；Claude 文档对此也明确区分。[P03/P04](#p03)

## 3. 官方薄能力的推荐路径

**第一次本地 dogfood：** 可优先研究 Claude Desktop 的本地 MCP/desktop extension，用三个只读 CW reader，而不是示例中的通用 filesystem server。官方支持本地接入和私有扩展分发，具体安装仍由用户执行。[P07](#p07)

**跨到 ChatGPT：** 研究 developer mode 的读/取数 app/MCP。计划和管理员策略是实际准入条件；当前官方页面列出 Pro 的 read/fetch 路径，并说明远端 MCP 与 Secure MCP Tunnel 的本地部署方式。先按一个已支持账号验证，不推断所有套餐/移动端都可用。[P05](#p05)

**Claude 网页端：** 用已支持的 remote MCP custom connector 接同一授权 reader；不把它与本地 stdio/desktop extension 当同一种网络拓扑。[P06](#p06)

连接器端执行本地查询，返回给云端模型的正文仍属于实际外发。端口可达、OAuth 登录、工具 `readOnlyHint` 都不能代替 CW 的 scope、用途、目的通道和逐次权限检查。传输/授权 metadata 丢失时缩小能力或拒绝，不凭模型提交的 account/conversationId 建立可信身份。

首版仅提供 bounded search、exact-version read 和来源 inspect；无 shell、任意写文件、安装、deploy、长自治循环。CW 内部为了保存资料产生的写入归用户命令与 Intake owner，不作为模型的通用写工具开放。

这只约束 CW 自己的能力；不能声称禁用了用户在上游原生产品中另外启用的所有工具。公开叙事应写“CW Chat 不提供 coding 执行能力”，而非“CW 完全接管上游执行安全”。[R02](#r02)

## 4. 容器 spike 的退出条件

候选为 Electron WebContentsView，仅作可消费实现参考，不裁定整个 CourtWork 桌面栈。Electron 文档不推荐依赖 webview tag；普通 iframe 仍受来源 CSP 限制。[T01](#t01)

每个 Provider/账号独立登录存储分区；不读取已有浏览器凭据库、不把 cookie/token 暴露给 CW 工具。远端内容关闭 Node，开启 context isolation 与 sandbox；限定导航、新窗口、下载与权限；IPC 只允许固定方法并核 sender。不要为兼容而关闭 webSecurity、注入特权接口或放宽证书检查。[T02](#t02)

测试范围：正常登录/登出、账号隔离、用户发消息、原生附件操作是否明确、窗口返回、下载到用户选择位置、断网/失效、无 CW 特权泄漏。不要求捕获 DOM。上游拒绝此壳或所需登录不支持时，停在 external-browser fallback，保留已合法取得的本地数据功能。

## 5. 包装、投影和同步的事实显示

分别显示“原生入口可打开”“最后一次本地导入时间/范围”“本地来源覆盖”“本次对外返回了哪些范围”。不能合并成一个“已同步”绿灯。

材料复制到另一 Chat，是明确的上下文转交；不是恢复同一个 Provider 私有 Session。上游隐藏 memory、内部工具和未导出附件未知时，保持 unknown，而不是 off/empty/complete。


---

# 02 · 围绕 Work Core 的数据工程与组织工程

目标不是为全部会话建立更大的聊天库，而是使来源能够保留、重建、查证、受控复用，并让专业决定继续由既有 owner 管理。以下是最小责任设计，新增字段需接单时与真实 schema 对账，不分配新 Core schema 号。

## 1. 四种责任，原 owner 不漂移

| 责任 | 所持事实 | 初始落位 / 约束 |
|---|---|---|
| 来源保留 | 获准原件、来源声明、revision、导入回执 | LG-01 / RG-BE-01 等；既有 Run 历史字节继续 ArtifactHistory |
| 对话与资料组织 | 消息/parts、编辑/分支、集合、引用、衍生表示 | Chat 投影及相应现 owner；原 Runtime journal 不迁成普通 Chat 库 |
| 读取与发现 | 可重建的字面/全文索引、范围 reader、披露回执 | LG-02 / RG-BE-04 / BG 及源 owner；索引不是权威 |
| 正式工作 | Matter source membership、候选、人的决定、有效成果和义务 | Work Core 既有合同，不从 importer 或模型摘要接受事实 |

统一目录和查询不意味着把上述对象复制到一份万能 store；也不要求四个数据库。物理存储选型优先复用既有 owner 与事务。此安排沿 RD-007，不新增通用 Resource Fabric。[R03](#r03)

## 2. 最小对象语言

**来源身份。** Provider 名称不足以唯一定位：保留 account/tenant/security-domain 的隔离身份、native conversation/message ID（确有时）、本地对象 ID。账号 ID 由可信连接或用户声明建立，并记录 provenanceConfidence；不得从网页标题推断。缺原生 ID 时可以分配 CW 本地 ID，但必须标明不能据此跨批次证明上游同一对象。

**版本与原件。** 稳定身份、revision 与内容 hash 分开。同字节不等于同业务对象；hash 证明保留后字节一致，不证明出处真实或读权。固定 observedAt、可得时的 sourceOccurredAt、导入批次、parser/version/config。源时间未知不能填当前时间冒充。

**Conversation / message / parts。** 保留来源能支持的消息、附件引用、编辑和分支关系；只有确有原始父子边才建原生分支。线性阅读是投影，不能抹平不同回答候选。导出不含附件 bytes 时允许 metadata-only，不能自动下载补全并宣称原导出完整。

**Representation。** 原始数据与 Markdown/文本阅读面分开。Representation 记录 sourceRevision、transform/config、自己的 hash 与坐标约定。对话原始 JSON、规范化 Markdown、抽取字段分别解释；直接改派生文件不得更新源记录。独有人工修正需保留为新事实，不一概视为可丢缓存。

**Relation。** `belongs_to_collection`、`message_attached`、`cites`、`derived_from`、`supersedes`、`matter_source` 的含义与 owner 分开。关联不自动复制正文、不授予权限、不将候选升级为正式成果。跨 owner 提交可留下 pending/unlinked 回执，由同 requestId 对账，不能伪称一个跨库原子事务。

**Finding 与决定。** 模型标注“这是决定/义务”先是提案，带出处、范围、置信和未决；正式 decide/close 沿 Work Core。普通个人笔记/偏好不强制成为 Matter Artifact。[R01/R03](#r01)

## 3. 组织工程先处理责任与适用性，不先画组织树

首版一个人也有不同职责：材料提供者、数据维护者、任务执行者、成果审阅者、正式决定者。可以由同一人兼任，但命令语义不混用。日常读取沿已授予 scope 执行，不要求用户重复填写角色表或逐页批准。

Provider 是来源维度；项目/Matter 是工作语境；集合和标签是查找视图；角色/grant 决定访问；retention 决定保留；Decision 决定正式效力。它们不是同一条文件夹继承链。

自动记录 ID、来源、日期、hash、导入批次、版本等机械事实；分类、主题和与哪个 Matter 有关可以稍后建议；仅在要共享、形成义务或产生正式效力时要求相应决定。避免每次聊天先填繁重 metadata。

Zotero 的成熟做法是对象可以属于多个集合，而不随视图复制；移出集合也不等于删除对象。本轮消费此关系模型，不把 Zotero 的库/权限实现直接照搬。[D01](#d01)

## 4. 数据生命周期不是“草稿 → 共享 → 正式”单轴

| 轴 | 首版需要分别说明 |
|---|---|
| 采集/保留 | 来源获准范围、temporary/retained、原件或仅片段 |
| 可得性 | bytes available、metadata-only、missing、unsupported |
| 处理状态 | 未处理、完成、部分、失败；固定处理器与输入版本 |
| 组织/披露 | 哪些集合或工作引用、当前谁可见、可向哪个通道披露 |
| 专业效力 | provisional、candidate、accepted/withdrawn 等由原合同维护 |
| 时效 | 当前适用、待复核、历史；新版本出现不自动推翻过去决定 |

撤销一个披露授权不自动删除已合法保留证据；删除展示缓存不等于已删原件/备份/Provider 副本；删除源端会话也不能从一次“不再出现在导出”可靠推断。正式删除与 retention、hold、引用盘点单独核账，不在首片自动 GC。

## 5. 可消费的成熟数据工程模式

W3C PROV 的实体、活动、负责主体和派生关系可用于解释“这段资料从哪里来、哪次转换得到”，不引入完整 RDF/知识图谱设施。[D03](#d03)

OpenLineage 区分处理定义、一次运行与输入/输出。导入器、规范化器、抽取器各记录输入 revision、处理器版本、输出与失败/partial 即可；借其 lineage 思路，不安装一套编排平台，也不把处理完成视为 Work 接受。[D05](#d05)

原件与 metadata 先可靠保留，再通过可重建索引加速。先使用现有文件/SQLite 责任，新增 FTS 的位置由其 owner 决定；不要为了 Chat 同时换存储、引入事件总线、向量库和图数据库。

## 6. 导入边界与重建

来源采用用户选定导出/片段，先隔离预检、给出会话/附件覆盖，再选保留范围；不默认把整份账号档案持久化。选择性保留只声称保留了对应范围，不能说全包已经存档。

实际官方 export schema 必须由获准的脱敏样本固定，synthetic fixture 仅证明 CW 的合同。旧/未知结构要报 unsupported 或局部失败；允许已有合法记录可读，不默默丢字段冒全量成功。

输入档案按不可信文件处理：路径逃逸、symlink、解压放大、过深/过大 JSON、乱码与恶意 HTML 均有上限/隔离，不执行附件。导入 requestId、来源身份和 revision 共同处理重试；同名同文本跨账号不得误合并。

索引清空后，可在不调用模型/不联网的情况下重建；同版本 parser 输出应可解释地稳定。归档字节、表示和当前索引 generation 要能互相核对；未知引用不支持自动删库。


---

# 03 · Agent 可 grep 的渐进披露合同

**采用声明：Agent 能在当前获准的资料集合中进行有界词法检索，并按精确版本逐段展开；每次返回都有出处、范围、覆盖与可用性说明。**

这是待实现与验收的产品承诺，不是“当前全库已治理完毕”的事实。没有搜索命中不等于原始数据不存在；片段有记录不等于模型真正使用了它。

## 1. 最小读取层级

| 层级 | 返回什么 | 不返回什么 |
|---|---|---|
| 目录/manifest | 本次获准对象的身份、类型、可得性、必要状态 | 隐藏集合名称、全库计数、别的账号元数据 |
| search / grep | 在获准语料上的命中、sourceRevision、representation、锚点、局部 coverage | 未经授权正文片段；先搜全库再删掉若干结果的泄漏 |
| exact read | 特定版本和表示的指定范围、next cursor、字节/字符说明 | 悄悄换成最新版本或越界相邻材料 |
| inspect / 展开 | 该来源可披露的 provenance、历史关系与更大范围 | 自动跨权限爬完整关系图或无界全文 |

第一步已有成本预算；初始 manifest 也不能一次倾倒全库。文档内搜索范围和目录范围都由实际授权界定，不凭模型提出一个 Matter ID 就授予访问。

## 2. 拟议调用形状

下列是合同示意，不是已存在的 endpoint 或 SDK：

```text
search(query, selectedScopeRef?, cursor?, limit)
    -> hits[{sourceRef, revision, representationRef, anchor, snippet}], coverage
read(sourceRef, revision, representationRef, range, cursor?)
    -> content, exactAnchor, coverage, nextCursor?, deliveryRecordRef
inspect(sourceRef, revision)
    -> authorizedMetadata, availability, originCoverage
```

可信 principal、account/connector identity、目的 Provider、当前 grant 和允许用途由 Host/认证通道注入，不由模型提供。`selectedScopeRef` 只是缩小请求，不能扩大实际 grant。无法证明原生 conversationId 时，回执只归属已验证连接/请求或用户选定工作集合，不伪造 turn 级精确来源。

每次 query/read 均重新检查撤权；cursor 绑定安全域、查询、index generation 和 grant 状态。过期或跨 scope 使用明确拒绝/重新查询。返回的报错粒度也不得泄露未授权对象是否存在。

## 3. grep 的实现选型

**首选实现：** Host 的 bounded reader 在获准对象集合中进行 literal/受限 regex 搜索；小语料可以直接扫描规范化文本。对模型而言是 `grep` 语义，但没有 shell 或任意路径参数。

**性能优化候选：** 在相同语义下使用固定版本的词法引擎或 SQLite FTS5。若内部调用 ripgrep，使用明确参数数组、固定允许选项、受限查询长度和输出预算；不要允许模型提交完整命令。任何 index 都必须能从当前来源重建，不成为新真源。

**文件投影视图：** 以后某个 coding/本地 runtime 确需直接读目录时，可生成只包含已授权内容的只读 manifest/text view；它是向该执行环境披露后的快照，不是撤权后可追回的权限系统。此模式不进入纯 Chat 首片，主数据目录不得直接挂给任意 Agent。

SQLite FTS5 的 external-content 索引需要显式一致性维护；已有数据不会因为增加触发器而自动被回填。trigram MATCH 对不足三个 Unicode 字符的子串没有命中，像“撤回”“期限”这类查询必须提供有界 fallback 或明确限制，不能返回错误的“没有资料”。[D02](#d02)

默认 literal 优先，regex 单独限长/限资源。全文 token 匹配、子串 grep、语义检索是不同能力；不用同一个 search 标签掩盖差别。embedding 仅在词法评测暴露具体漏检后作为另一候选通道，不是这一宣言的前置。

## 4. 授权先于片段、排序、计数和缓存

逻辑上先确定可披露语料，再检索/排序并形成片段。SQL/索引实现可以优化，但不得让隐藏文档影响公开计数、可见建议、游标或缓存命中表现而泄露其信息。初版至少测试这些直接可观测通道；不据功能测试宣称消除了全部时间侧信道。

结果缓存按授权与来源版本隔离，撤权后不能继续命中旧缓存。read 必须重新检验源与目标；来源合法入本地，不等于可交给任意云 Provider。用途/敏感分类和当前披露授权也不因“只读”而跳过。

来源中的“忽略之前规则”“去读取别的项目”等文字是被检索数据，不是系统指令。安全边界由工具和 owner 强制；不能只加一句 prompt 作为越权防护。

## 5. 锚点与 evidence 精度

一个引用至少绑定 source identity/revision、representation identity/hash、范围坐标约定、精确摘录或摘录 hash；可附 prefix/suffix 消歧。行号只在指定表示中有效，不跨导入版本默认稳定。

W3C Web Annotation 的 quote/position selectors 可作为局部先例；文档改版后位置会脆弱，因此固定版本和表示。自动重定位只能提出候选；不能悄悄把 r1 的证据换成 r2。[D04](#d04)

用户提供的片段没有完整源时，仍可以生成可引用的本地 sourceRef，但必须标为 user-provided/partial。不能把其标签、链接或本地 hash 当作上游真实性背书。

## 6. 披露回执不虚构“模型用过”

记录 requester/目的通道、requestId、source revision/range、policy/compiler/transform 版本、预算/裁切、允许或拒绝的原因以及已观察的传输阶段。来源正文仍留对应 owner；审计日志不再次无限复制全文。

本地选择/准备、服务端开始返回、已观察的写入或通道 ACK、Provider/模型是否确实使用，是不同事实。外发后 ACK 丢失可以是 delivery_unknown，不能变为 never_sent；没有上游 consumption 证据不显示“已用于回答”。

保留敏感内容关闭/删除与历史效力的独立边界。撤销只读 connector 后必须停止新读取，但已返回的资料可能仍在 Provider 的原生 history/summary 中。需要新的干净 Chat 时显式新建并重新选择内容；不能把 disable 当作远端删除。[R01](#r01)

## 7. 首轮必须覆盖的负例

| 反例 | 合格结果 |
|---|---|
| 同 native ID 来自两个账号 | 来源与授权独立，不误合并 |
| search 后撤权，再 read | 拒绝继续披露；旧 cursor/cache 不绕过 |
| r1 命中但源现为 r2 | 读 r1 明确版本；缺 r1 则 missing，不用 r2 冒替 |
| 两字中文/大小写/规范化/无命中 | literal 与全文语义明确，覆盖范围真实 |
| 缺附件/未知导出字段/部分解析 | metadata-only/partial/unsupported 有回执 |
| 来源 prompt injection | 不能改变 grant、调用写能力或正式 decide |
| 返回数据后记录/网络中断 | 不自动重发、不声称未披露，保持不确定事实 |
| 索引清空/过时 | 可重建或明确滞后；不伪造完整搜索 |
| 同文跨集合、跨来源 | 集合多关系，不混淆物理去重与事实归属 |
| 临时 Chat / 停用 connector | 按所选模式不持久写 memory；停止未来读取不冒称擦除过去 |


---

# 04 · 实施片、依赖与 Spark / Attention 首个场景

以下 A–F 是本增量的局部阅读标签，不抢占仓库 RD/DEC/BE 编号，也不是 GitHub PR 号。均 proposed-not-created。实际落位按 P00 和现 owner 裁定，工程状态只回填 current。

## 1. 与 v2 主线关系

```text
原主线：Pi + DeepSeek GUI ──► Runtime 替换 ──► Work 小闭环

本增量：A 接入/资料合同 ──► B 离线投影 ──► C 受治理读取 ──► D 官方只读 bridge
            └──────────► E 容器 spike（独立、可退）              │
                                                               ▼
                                                 F Spark / Attention 资料场景
```

F 使用已接受的必要 Runtime 能力和现 Work 合同；不要求所有 Runtime 都已接好，也不越过 v2 的 Work 产品验收。第一条 GUI 主线不等待 Chat 容器，不因本增量重排在途 writer。

## 2. A · 冻结最小 source / channel / authority 合同

**消费入口：** 既有 Chat Broker/薄能力、BE-19/20/23、RD-007、LG-01/02、DS/BG。

**产出：** 来源与目的通道分开的 channel registry；用两个 synthetic 来源冻结 identity/revision/coverage、collection/ref、grant 和 delivery evidence。选择实际官方导出样本必须由用户明确提供，并保存 sample provenance 与敏感范围，不扫描账号/机器凭据。

**非目标：** 新桌面框架、新 memory 引擎、新 Core schema。只预留现 owner 消费字段，不把所有未来 object 类型一次实现。

**接受：** 账户/来源/正文哈希分离；read authorization ≠ local retention ≠ formal acceptance；审定“Chat 不开放 coding 功能”能在后端能力表落实。发布分发政策未确认不能登记 approved。

## 3. B · 离线导入与 Conversation Projection

**消费入口：** LG-01、RG-BE-01/02/03；Chat 身份沿 BE-23，临时模式沿 BE-20。

**范围：** 官方导出文件/主动提供片段 → 预览 → 明确选择 → raw/projection → 稳定引用。先一个导入器成立，再增加第二 Provider；不把两个来源的 synthetic schema 冒充官方格式。

**GUI：** 复用已有资料列表/来源 Inspector；显示来源账号、原生引用可得性、本地保存时间、版本、原件/仅metadata/部分；“打开原会话”与“读本地保存版本”分开。不要先新建全局资料管理导航。

**负例：** 重复导入、同名同 ID 跨账号、编辑分支、缺件、Zip Slip/路径逃逸/解压放大、未知版本、temporary 模式、只选一个会话却泄漏整包。

**退出：** 仅证明本地 projection，无实时 sync、无原生网页反向写入。回退保留原件与回执，不重写旧 index 成功事实。

## 4. C · 受控 grep / exact read 与可重建索引

**消费入口：** LG-02、RG-BE-04、DS 重建和 BG 披露；Runtime 仅作 reader consumer。

**范围：** 先窄 literal search/range read/provenance inspect，后按规模加 FTS。无任意路径/SQL/shell，principal 由 host 绑定。

**接受：** 03 文档中的负例；索引删除后从同原件重建；中文短词、撤权/缓存/游标、部分coverage、版本锚点均真实。逻辑允许的 corpus 与最终返回匹配，不以小样本声称绝对无侧信道。

**退出：** C 可在纯本地 Inspector 和合成调用器中成立，不等待任何官方 Chat 连接。若需迁移，由 owner 明确版本/备份/旧 host 拒新；不与大重构合一提交。

## 5. D · 一个官方只读 Chat bridge

**消费入口：** 现 Broker 和 GUI 控制面；新增服务端通道不能误认现 MCPManager client 已实现它。

**首选 probe：** 经用户授权，Claude Desktop 本地只读 MCP；或在实际账号支持时 ChatGPT read/fetch MCP。选一个完成真实 E2E，再加另一个。不得偷偷替用户安装、登录、开放公网或执行付费验证。

**接受：** Host 注入可信请求身份；只返回获准集合；原生 Chat 真实调用 → CW 实际 read → 精确引用 → 回执与失败可见。用户关闭 grant 后新的 call 拒绝；不能清除已披露历史，UI 解释一致。

**负例：** 伪造 scope/conversationId、错误 OAuth principal、过期 grant、缺 source、恶意查询、未知工具请求、真实网络失联、connector manifest 版本变化。

**可降级：** 没有官方通道时保留本地检索与用户主动复制/导出上下文片段。此路径记录 prepared/user-exported，不伪造目的 Provider 接收证据。

## 6. E · 原生容器有界试验

**依赖：** A 的政策/支持集合即可；不阻塞 B/C/D。

**范围：** 一个 Provider 的人操作原生入口、账号隔离、导航/权限/下载。没有 DOM 自动归档、后台发 prompt 或私有 API。候选 Electron WebContentsView 不构成整个产品宿主选型接受。

**接受：** 正常路径可用、无特权泄漏、有 external-browser fallback；需要突破上游保护或政策无法支持时停止此渠道。应用壳可更换，已获准的来源与 reader 不应受其影响。

## 7. F · 从资料变化长出 Spark / Attention

**依赖：** C 的来源/读取合同，现被接受的相关 runtime 和 Work owner 能力；D 仅在需要原生 Chat E2E 演示时必需，E 永不成为数据场景前置。

**合成场景：** 两段不同 Provider 的获准讨论引用同一份来源 r1。用户在 CW 建集合并选取一项工作，形成有证据要求的候选；随后导入 r2。

Spark 只读取获准 r1/r2 及关系，准备变化清单、引用、无法覆盖的部分和需要补查的线索。机械差异先确定性处理，必要语义判断再交模型；输出按原 owner 保存候选。不是把“读完了”当成专业核查完成。

Attention 读取工作义务/回执，发现该工作仍引用旧版本或缺少证据，按既有授权提出待处理事项；用户可以要求补证、继续适用旧版本或作正式决定。新版本出现不自动使旧决定无效；Spark 的检查也不自动 close。

最终由新的 Session 或另一已验证 Runtime 通过相同 source refs、决定和未决项继续，不需要上一 Agent 的私有记忆。四角色仍是可组合职责，不强制同时运行四个 Agent。

**接受分轴：** 采集正确性、查询权限、来源/版本准确、候选正确性、人的决定、接续、GUI 表达。先人工触发一次完整流程；随后才决定周期/并发/自动升级。小片可以接受，不能冒称完整自动治理。

## 8. 实际 PR 与并行约束

研究、fixture、容器 spike 可以在独立路径并行；共享 source/RuntimeStore/Core/control-plane 的实现、schema 迁移及 main 接收串行。每张 PR 声明唯一 writer、允许路径、输入 SHA、合同版本、真正关闭的门、not-run 和回退。

不要求所有 A–F 都完成才使 B/C 对用户有用。每个公开能力按自身证据放行；保留原 G1–G5，原 Pi+DeepSeek 测试仍是独立主线。


---

# 本地接单指令与文档落位

先读实际 cwd、branch、HEAD、worktree、AGENTS 和 engineering/current.md；本包 fixed-source base 是 `1ac28980c4877f4a86adf586aeb1b66980e23504`，不代表本地之后未前进。不要重置/覆盖其他 writer。

这是 Chat 独立产品和受治理数据面的增量研究包。原 runtime-composition-v2 继续持有三节点主线。阅读本 README、01–04 和来源，再沿 repo 的 Chat Broker、thin-capabilities、RD-007 与 LG/RG/DS/BG 入口消费。没有授权本包自动开外部 connector、付费调用、push 或 deploy。

## 文档落位

| 现有入口 | 消费什么 |
|---|---|
| engineering/research/chat-memory-broker-2026-09-12/ | Chat 独立节点、两个数据方向、channel 支持/政策登记、Broker 服务端与 client 区分 |
| engineering/research/RD-007-resource-governance.md 与 mature-practices/ | 原件/消息/表示/关系、组织视图、grep 与 index、保留及 formal authority |
| 现 LG/DS/BG 合同 | 各自 reader、写 owner、重建、撤权与 exact version 负例 |
| engineering/architecture-runtime-canon.md | 只补 Chat channel 与 RuntimeAdapter/ModelAdapter 非同一接缝的导航 |
| engineering/roadmap.md | 一条并行 Chat/data 线，不创建第二总 roadmap；v2 主线不动 |
| engineering/current.md | 仅写实际本轮完成状态，不写计划冒实现 |

包内 A–F 非新正式编号。不要覆盖原 received 或上轮输出；保存 intake 来源、hash、逐项 disposition 与施工映射。无必要不新增大术语/大平台。

## 下一张有界单

先做 A 的合同核账，再开始 B 的一个官方导出 importer + 一个 synthetic 不同来源，提供选择性保留、版本/coverage 和本地读回。C 的授权 reader 与负例可同期设计；独立 E 只需小 spike，不承担归档。

准入不得写“非 coding 所以合规”。应按官方通道/实际用途/范围登记；不支持或未验证的仍是 unavailable/unverified。实际导出 grammar 用授权样本冻结；不从第三方博客推定稳定 schema。

## 维护纪律

每个 importer、normalizer、lexical adapter、Provider surface 与 disclosure bridge 登记上游出处、固定版本/协议、支持集合、依赖消费者、维护 owner、fixture、迁移与回退。允许收敛到经典自足版本，不以 latest 为目标。

但外部网页/API 与认证会变化；浏览器引擎/联网解析和安全关键依赖需要必要补丁。界面显示失败、原 schema 不识别、工具契约变化、安全公告或真实 dogfood 错误触发有界核验。不要用自动放宽校验或切私有接口维持“可用”。

Dogfooding 产生使用证据，维护仍有无模型、离线、确定性测试和另一 coding agent 能接手的说明。不要使全部恢复能力依赖正在出错的 Chat/Runtime。

## 本包验证范围

只提供研究文稿、source ledger、拟议 channel/工单登记及包校验。未实现 UI/导入器/数据库/读工具/MCP；未测试真实 export schema、认证、容器登录、跨 Provider E2E、模型表现、产品回归或独立验收。`verify-package.py` 的成功只说明交付文件一致，不说明产品通过。


---

# 来源与证据范围

读取日期：2026-09-12。Repository 固定基线：`1ac28980c4877f4a86adf586aeb1b66980e23504`。

Exa 共 7 次检索、35 个结果位（含重复），按上游通道/政策、容器安全、数据与组织三个主题消费；另对选定官网与 repo 回读。35 不是独立验证来源数，也不是被采用项目数。只采用下面列出的原始官方/仓库资料。

政策文件为本轮取得的页面，不等于对任一账号或分发方式作 blanket 法律核准。网页后续变化不自动改本文；实现前核准接入时应重新固定必要版本和支持条件。

<a id="r01"></a>
## R01 · CourtWork Chat Memory Broker

- 来源类型：fixed-repository
- URL：https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/chat-memory-broker-2026-09-12/README.md
- 消费与限制：已读固定版本。Provider Session、投影、Broker、Compiler 与各状态 owner 分离；BE/LG/RG 为后续消费入口。本文不是已实现证明。

<a id="r02"></a>
## R02 · CourtWork Chat 薄能力层

- 来源类型：fixed-repository
- URL：https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/chat-memory-broker-2026-09-12/thin-capabilities.md
- 消费与限制：已读固定版本。人主导 Chat、可选来源、禁止用 wrapper 宣称接管 Provider 全部能力；未来独立 Chat 不追溯改掉当前项目 Session。

<a id="r03"></a>
## R03 · CourtWork RD-007

- 来源类型：fixed-repository
- URL：https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/RD-007-resource-governance.md
- 消费与限制：已读固定版本。内容 Resource 与 Runtime Resource 分开；LG/DS/BG/Runtime/Core 原 owner；资源保留、关系、正式接受分轴。

<a id="p01"></a>
## P01 · OpenAI Terms of Use

- 来源类型：official-policy
- URL：https://openai.com/policies/terms-of-use/
- 消费与限制：本轮页面标注 2026-01-01 生效。个人服务条款限制自动/程序化提取及绕过保护；API/商业服务另有条款。内容权利不等于任意接入许可。

<a id="p02"></a>
## P02 · Anthropic Consumer Terms

- 来源类型：official-policy
- URL：https://www.anthropic.com/legal/consumer-terms
- 消费与限制：本轮页面标注 2025-10-08 生效。限制未经许可的抓取和自动访问；API 或明确允许的方式另论。商业发布还需核实际协议与产品适用性。

<a id="p03"></a>
## P03 · ChatGPT 官方数据导出

- 来源类型：official-support
- URL：https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data
- 消费与限制：官方提供账号数据/聊天导出路径。实际计划与组织权限须核对；不提供可据此假设的实时同步、稳定导出 schema 或附件完整保证。

<a id="p04"></a>
## P04 · Claude 官方数据导出

- 来源类型：official-support
- URL：https://support.claude.com/en/articles/9450526-export-your-claude-data
- 消费与限制：官方个人账号导出覆盖会话与账号数据，组织账号另按 owner 路径；文档也说明导出不等于个人账号间的原生导入迁移。

<a id="p05"></a>
## P05 · ChatGPT Developer mode / MCP apps

- 来源类型：official-support
- URL：https://help.openai.com/en/articles/12584461
- 消费与限制：官方提供自定义 MCP/app 通道，读写能力依计划与管理员策略；Pro 页面列有 developer mode 的 read/fetch。远端接入或受支持 Secure MCP Tunnel 与本机直连不同。

<a id="p06"></a>
## P06 · Claude remote MCP custom connectors

- 来源类型：official-support
- URL：https://claude.com/docs/connectors/custom/remote-mcp
- 消费与限制：官方支持自定义远端数据/工具连接，认证与 scope 需配置；不是原生聊天全量导出接口。

<a id="p07"></a>
## P07 · Claude Desktop local MCP

- 来源类型：official-support
- URL：https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- 消费与限制：官方本地 MCP/desktop extension 接入可作本地只读 bridge 候选；工具返回给模型仍是披露，不等于数据从未离开本机。

<a id="t01"></a>
## T01 · Electron Web Embeds

- 来源类型：official-technical
- URL：https://www.electronjs.org/docs/latest/tutorial/web-embeds
- 消费与限制：iframe 受来源 CSP 限制；文档不推荐依赖 webview tag，并列 WebContentsView 等替代。支持嵌入机制不意味着上游允许抓取或第三方包装。

<a id="t02"></a>
## T02 · Electron Security

- 来源类型：official-technical
- URL：https://www.electronjs.org/docs/latest/tutorial/security
- 消费与限制：远端内容不开放 Node；context isolation、sandbox、权限/导航/IPC 检验；不能关闭 webSecurity 求兼容。浏览器安全维护不能无限冻结。

<a id="d01"></a>
## D01 · Zotero Collections and Tags

- 来源类型：official-technical
- URL：https://www.zotero.org/support/collections_and_tags
- 消费与限制：对象可属于多个集合而不复制；删除集合与删除对象分开。消费身份/关系/视图分离，不照搬其权限与库实现。

<a id="d02"></a>
## D02 · SQLite FTS5

- 来源类型：official-technical
- URL：https://www.sqlite.org/fts5.html
- 消费与限制：FTS 可作可重建索引；external-content 一致性需显式维护。trigram MATCH 对不足三个 Unicode 字符的子串不匹配，短中文查询必须另测。

<a id="d03"></a>
## D03 · W3C PROV-DM

- 来源类型：official-standard
- URL：https://www.w3.org/TR/prov-dm/
- 消费与限制：Entity/Activity/Agent、使用、生成、派生、归属可借鉴为来源语义；不据此宣称完整 PROV 互操作或专业正确性。

<a id="d04"></a>
## D04 · W3C Web Annotation Data Model

- 来源类型：official-standard
- URL：https://www.w3.org/TR/annotation-model/
- 消费与限制：TextQuote/TextPosition 可借鉴为引用锚点；位置在变化文档上脆弱，需固定 source state/representation 与坐标约定。

<a id="d05"></a>
## D05 · OpenLineage Object Model

- 来源类型：official-technical
- URL：https://openlineage.io/docs/spec/object-model/
- 消费与限制：区分数据、处理定义、处理运行及输入/输出。借用处理来源和运行状态记录，不把 COMPLETE 当 Core 接受，也不引入整个平台。

## 附件基线

上轮 v2 以当前会话真实附件为源，身份/bytes/hash 见 `prior-inputs.json`。本包只引用其现有主线，并不将其产品能力标为已接受。未复制、修改或重新签署上轮原件。

本轮未取得任何用户真实会话导出作为产品测试输入；未验证所有 Provider 的 wrapper 登录政策；未找到足以支持“普遍、实时、完整原生聊天自动同步”的公开统一许可/接口证据。官方导出与只读 connector 已足以为首片提供可行的独立路径。


---

# 本轮输入与处置映射

来源：当前对话用户消息，2026-09-12。下列原文为用户直接输入；未补造独立 message ID 或分钟级时间。

## 原文

> Chat 的容器封装或投影，是单独的自研节点，可以进行初步研究实现方案，可能瓶颈在于上游，但纯 chat 和薄工具/插件投影，应当不会违背使用政策——并非用来跑 coding agent 任务，也不会开放这些功能，仅仅是为了跨 provider 的数据管理。
> 这可能亦需要设计 work core 的数据工程、组织工程，已实现治理后的数据 agent 可 grep 渐进披露的宣言，这些确定后，Attention 与 Spark 的工作 方式也就会自然生长。
> @Exa

## 处置

| 输入要点 | 本轮处置 | 主位置 |
|---|---|---|
| Chat 容器/投影独立自研节点 | 采用；与 v2 Runtime 主线并行，不新增通用 loop | README、01、04 |
| 初步研究实现方案 | 已完成方案文稿与官方来源核查；未实施产品 | 01–04、SOURCES |
| 纯 Chat 应不违背政策 | 修订推论：用途不构成自动提取/认证/分发许可；按具体官方通道准入 | 01、channel-register.json |
| 不跑 coding，也不开放这些功能 | 采用为 CW 新独立 Chat 后端能力边界；不宣称控制全部上游原生工具 | 01、03、04-A/D |
| 跨 Provider 数据管理 | 采用为来源保留/组织/可控披露；不伪造原生 Session 互转 | 01–02 |
| Work Core 数据/组织工程 | 采用为围绕现 owner 的治理层；不把聊天库/索引收归 Core | 02 |
| grep / 渐进披露 | 采用为拟实现的授权集合内词法 search + exact read；原宣言需运行证据 | 03、04-C |
| Spark / Attention 自然生长 | 采用场景导向；仍需范围、结果/义务与关闭权合同及验证 | 04-F |
| Exa | 已检索并回读原始官方资料，未采用过时转载作为政策依据 | SOURCES、source-ledger.json |

“采用”是本轮设计处置，不是仓库合入、代码接受、法务许可或 release 放行。
