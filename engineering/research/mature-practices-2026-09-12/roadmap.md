# Resource Governance roadmap · 有依赖的消费顺序

2026-09-12；Astra裁决。先保持[工程总路线](../../roadmap.md)“基本GUI/通用Harness闭环→稳定节点→扩展与替换”的顺序；本页准备后续需求，不打断在途前端writer，也不以九个PR编号承诺全部要建。

## 分期

| 阶段 | 后端/合同 | 前端 | 准入与退出 |
|---|---|---|---|
| R0 · 本轮文档 | [RD-007](../RD-007-resource-governance.md)、源码/来源核验、RG映射 | 语义与先例登记 | 已撰写；无新API/schema、无产品接受 |
| R1 · 一个资源能被找回 | RG-BE-01接LG-00/01和DS-00：稳定ID、保留原件、权限list/exact read | RG-FE-01只读列表/Inspector | 一份上传文本与metadata-only记录、缺件/权限失败可解释；先闭最小场景 |
| R2 · 跨交流可复用 | RG-BE-02消息parts；RG-BE-03 exact Run版本保留与目标owner关系 | RG-FE-02保留/关联动作，消息引用接入 | 同一资料两处合法引用、源/目标双权限、跨owner故障对账；不自动accept |
| R3 · 可检索、可判断 | RG-BE-04接LG-02/04/DS-02；RG-BE-05接LG-03 | RG-FE-03搜索与版本注释分批 | 有重复读取需求；索引可重建，注释锚定可判别、finding与接受分开 |
| R4 · 可维护、可外接 | RG-BE-06只读retention盘点；按需MCP/Zotero等adapter | 仅真实可用export/read能力 | 先完整引用/保留责任，再另裁自动GC；跨系统接入必须固定协议与loss matrix |

R2中消息引用与单独Run产物保留可以按不同文件写权分别推进，**不默认多writer抢service/store**。R3的annotation可先整资源/确定性文本，不要求先有OCR/向量；metadata搜索也不要求全文。FE可先基于明确标fixture做specimen，但实际动作接受须等真实后端闭环。

## 第一条完整用户路径

上传自造文本A → Session里出现资源A/rev1 → Inspector可读exact bytes与来源 → 新Run产生结果B的记录版本 → 用户保留B → 显式关联到Matter来源/候选 → 原Core决定动作接受确切成果 → A变化产生新revision → 旧判断仍可读且当前适用性/权限重新判断。

反向路径同样属于首片：无bytes的题录 → 仅显示metadata；上传失败 → 无可用资源；撤权 → 新查询不泄露；目标CAS冲突 → 保留原回执；断连 → 查询同ID而非再次复制；源文件删失 → 缺件不回退到同名当前文件。整个路径不依赖个人文件、付费模型或Finder。

## 与既有路线对账

| 原路线 | 本轮新增消费者 | 保持的权威边界 |
|---|---|---|
| [LG-00/01](../local-governance-2026-09-09/pr-plan.md) | RG-BE-01/03上传和Run产物入资源面 | Intake保留bytes/manifest；不冒充Run ArtifactHistory写者 |
| LG-02/04 + [DS-02](../data-systems-2026-09-09/pr-plan.md) | RG-BE-04 / FE-03检索 | 可删派生层；不重写源/接受状态 |
| LG-03 + Core | RG-BE-05注释/finding | 普通注释不授予accept，正式变更沿Candidate/Decision |
| DS-00/01/03 | RG-BE-01/03/06 owner、回执与保留/迁移 | 不复制第二份verification/accepted store |
| [BG](../../execution/2026-09-10-backend-governance/README.md) | 来源/版本/Run关系解释、渐进披露 | BG已有能力按实际交付消费，不因旧计划标planned重开已交付单 |
| Runtime/原Chat路线 | RG-BE-02消息身份/附件parts | Conversation record、Run trace、model context分开；不擅改产品角色 |
| [RD-006 / DWB](../RD-006-deferred-workspace-binding.md) | 可选的未来目录输入adapter | DWB是执行授权，RG是内容保留/关联；已上传内容的R1无需等待DWB |
| 现有前端队列 | RG-FE-01…03 | 单composer/Inspector writer，先例/grammar与Review语义保留 |

## 暂不实施与重开证据

- 全局Library独立导航、Cards/Timeline/Graph、Finder只读挂载、批量拖放：需要真实跨范围定位痛点和后端支持；列表/Inspector先验证价值。
- OCR/embedding/hybrid/graph retrieval：exact/lexical基线实测缺口与有界成本后，选一个格式/处理器增加；不一次采购平台。
- Zotero/Paperless/Mayan/DataHub/metadata connector：明确导入/导出消费者、稳定外部ID、权限、重复/版本映射、删除语义与回退后才选adapter；不直写外部数据库。
- MCP server/resource subscription：现有MCP能力先清账，冻结URI、认证、分页/缓存/撤权和版本损失后做一个read-only消费者，不能只列URI就宣称兼容。
- 自动purge/GC：R4 dry-run完整性和故障验证之后单独裁；不把Scratch TTL加到历史workspace。
- Temporal/CMMN/通用workflow、RDF、全域CAS：没有实际瓶颈/第二消费者时不建；成熟实践是机制参考，不是依赖采购清单。
- 一般projectless Chat、跨项目Session迁移：按BE-23/DWB原边界另裁，不靠Resource surface解决身份问题。

## 消费方式

下一实施任务先选R1，重读最新main与原LG/DS事实，把RG-BE-01和RG-FE-01进一步冻结成一个实际可验收纵切；分支中本轮文稿合流不等于能力完成。每阶段留下固定SHA、数据/来源hash、实际命令和非作者范围；若原接口足够，就交消费者而不加新API。没有资源复用需求或收益的后续阶段可以停止，不为了凑齐路线推进。
