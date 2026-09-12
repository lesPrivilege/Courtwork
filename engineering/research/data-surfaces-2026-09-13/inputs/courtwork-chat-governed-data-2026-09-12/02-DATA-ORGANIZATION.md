# 02 · 围绕 Work Core 的数据工程与组织工程

目标不是为全部会话建立更大的聊天库，而是使来源能够保留、重建、查证、受控复用，并让专业决定继续由既有 owner 管理。以下是最小责任设计，新增字段需接单时与真实 schema 对账，不分配新 Core schema 号。

## 1. 四种责任，原 owner 不漂移

| 责任 | 所持事实 | 初始落位 / 约束 |
|---|---|---|
| 来源保留 | 获准原件、来源声明、revision、导入回执 | LG-01 / RG-BE-01 等；既有 Run 历史字节继续 ArtifactHistory |
| 对话与资料组织 | 消息/parts、编辑/分支、集合、引用、衍生表示 | Chat 投影及相应现 owner；原 Runtime journal 不迁成普通 Chat 库 |
| 读取与发现 | 可重建的字面/全文索引、范围 reader、披露回执 | LG-02 / RG-BE-04 / BG 及源 owner；索引不是权威 |
| 正式工作 | Matter source membership、候选、人的决定、有效成果和义务 | Work Core 既有合同，不从 importer 或模型摘要接受事实 |

统一目录和查询不意味着把上述对象复制到一份万能 store；也不要求四个数据库。物理存储选型优先复用既有 owner 与事务。此安排沿 RD-007，不新增通用 Resource Fabric。[R03](SOURCES.md#r03)

## 2. 最小对象语言

**来源身份。** Provider 名称不足以唯一定位：保留 account/tenant/security-domain 的隔离身份、native conversation/message ID（确有时）、本地对象 ID。账号 ID 由可信连接或用户声明建立，并记录 provenanceConfidence；不得从网页标题推断。缺原生 ID 时可以分配 CW 本地 ID，但必须标明不能据此跨批次证明上游同一对象。

**版本与原件。** 稳定身份、revision 与内容 hash 分开。同字节不等于同业务对象；hash 证明保留后字节一致，不证明出处真实或读权。固定 observedAt、可得时的 sourceOccurredAt、导入批次、parser/version/config。源时间未知不能填当前时间冒充。

**Conversation / message / parts。** 保留来源能支持的消息、附件引用、编辑和分支关系；只有确有原始父子边才建原生分支。线性阅读是投影，不能抹平不同回答候选。导出不含附件 bytes 时允许 metadata-only，不能自动下载补全并宣称原导出完整。

**Representation。** 原始数据与 Markdown/文本阅读面分开。Representation 记录 sourceRevision、transform/config、自己的 hash 与坐标约定。对话原始 JSON、规范化 Markdown、抽取字段分别解释；直接改派生文件不得更新源记录。独有人工修正需保留为新事实，不一概视为可丢缓存。

**Relation。** `belongs_to_collection`、`message_attached`、`cites`、`derived_from`、`supersedes`、`matter_source` 的含义与 owner 分开。关联不自动复制正文、不授予权限、不将候选升级为正式成果。跨 owner 提交可留下 pending/unlinked 回执，由同 requestId 对账，不能伪称一个跨库原子事务。

**Finding 与决定。** 模型标注“这是决定/义务”先是提案，带出处、范围、置信和未决；正式 decide/close 沿 Work Core。普通个人笔记/偏好不强制成为 Matter Artifact。[R01/R03](SOURCES.md#r01)

## 3. 组织工程先处理责任与适用性，不先画组织树

首版一个人也有不同职责：材料提供者、数据维护者、任务执行者、成果审阅者、正式决定者。可以由同一人兼任，但命令语义不混用。日常读取沿已授予 scope 执行，不要求用户重复填写角色表或逐页批准。

Provider 是来源维度；项目/Matter 是工作语境；集合和标签是查找视图；角色/grant 决定访问；retention 决定保留；Decision 决定正式效力。它们不是同一条文件夹继承链。

自动记录 ID、来源、日期、hash、导入批次、版本等机械事实；分类、主题和与哪个 Matter 有关可以稍后建议；仅在要共享、形成义务或产生正式效力时要求相应决定。避免每次聊天先填繁重 metadata。

Zotero 的成熟做法是对象可以属于多个集合，而不随视图复制；移出集合也不等于删除对象。本轮消费此关系模型，不把 Zotero 的库/权限实现直接照搬。[D01](SOURCES.md#d01)

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

W3C PROV 的实体、活动、负责主体和派生关系可用于解释“这段资料从哪里来、哪次转换得到”，不引入完整 RDF/知识图谱设施。[D03](SOURCES.md#d03)

OpenLineage 区分处理定义、一次运行与输入/输出。导入器、规范化器、抽取器各记录输入 revision、处理器版本、输出与失败/partial 即可；借其 lineage 思路，不安装一套编排平台，也不把处理完成视为 Work 接受。[D05](SOURCES.md#d05)

原件与 metadata 先可靠保留，再通过可重建索引加速。先使用现有文件/SQLite 责任，新增 FTS 的位置由其 owner 决定；不要为了 Chat 同时换存储、引入事件总线、向量库和图数据库。

## 6. 导入边界与重建

来源采用用户选定导出/片段，先隔离预检、给出会话/附件覆盖，再选保留范围；不默认把整份账号档案持久化。选择性保留只声称保留了对应范围，不能说全包已经存档。

实际官方 export schema 必须由获准的脱敏样本固定，synthetic fixture 仅证明 CW 的合同。旧/未知结构要报 unsupported 或局部失败；允许已有合法记录可读，不默默丢字段冒全量成功。

输入档案按不可信文件处理：路径逃逸、symlink、解压放大、过深/过大 JSON、乱码与恶意 HTML 均有上限/隔离，不执行附件。导入 requestId、来源身份和 revision 共同处理重试；同名同文本跨账号不得误合并。

索引清空后，可在不调用模型/不联网的情况下重建；同版本 parser 输出应可解释地稳定。归档字节、表示和当前索引 generation 要能互相核对；未知引用不支持自动删库。
