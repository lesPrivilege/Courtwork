# RD-007 · 资源、消息与持久成果治理

2026-09-12；Astra架构裁决，Luna有界探索；产品基线 `647bc2167efe5437d0ca73a60a406549d9a1e268`。本轮只写后续合同/PR，不新增产品schema或接受。输入见[消费账](mature-practices-2026-09-12/README.md)，实施接[PR文稿](mature-practices-2026-09-12/pr-plan.md)。

## 裁决结论

这里的Resource均指content resource（内容资源），区别于现有Runtime Resource的skill/MCP/profile能力配置语义；不复用其resolver端点存用户附件。采用“既有owner上有界资源治理”，优先让用户上传与一个Run产物在明确权限下进入可复用资源面，保留确切来源版本。选择薄接缝与成熟机制，不引入完整Paperless/Mayan/DataHub，也不另建通用Resource Fabric控制中心。

[LG-01](local-governance-2026-09-09/pr-plan.md)已计划Intake sidecar持有确切来源字节/manifest；[DS](data-systems-2026-09-09/pr-plan.md)维护owner、核对和重建；[BG](../../docs/work-core/governance.md)拥有正式对象披露；Runtime负责Session/Run/events与运行产物。这些不是可随意互换的store。

## 对象与写权

| 概念 | 本轮选定归属 | 不能推导 |
|---|---|---|
| Blob / retained bytes | LG Intake保留来源；已记录Run产物仍由ArtifactHistory持有；未来CAS只是存储机制 | hash不是授权，不保证字节仍在，不跨安全域默认去重 |
| Resource identity + revision | LG-01的最小来源记录增量，首个消费者冻结schema；稳定ID与内容hash分开，locator可变不改旧revision | 同字节不等于同业务对象；不同来源/安全域可共享物理存储也不共享权限 |
| Core Artifact | 继续专指Core正式accept所生成的成果；runtime artifact记录保留原义，并在DTO中区分kind/owner | 用户上传、入Library、agent命名final均不产生Core接受 |
| Representation | 原版本的渲染/文本/OCR输出；固定transform/config与源版本。可重建产物归LG派生层 | 只因扩展名不同不必产生业务revision；人工修正/唯一观察须独立保留，不能一概当缓存 |
| Resource relation | 引用关系由相应owner写入：Matter的source membership归Core，消息/Run引用归Runtime，Library收藏归Intake | 关系不是字节拷贝、目录授权或正式归属迁移；跨owner不能伪造单库原子性 |
| Message / parts | 在现有Session/Run/events读写链增量固定显式消息/附件引用身份；保留旧事件映射 | 不把trace、Pi journal、模型context当同一份会话数据库，不凭显示行号制造历史message ID |
| Annotation / finding | 锚定resource revision与具体representation/range；首版普通注释与LG-03候选finding分清 | confidence/review_state/motivation不能直接实现Expert approval或Core decide |
| Index / collection view | LG-02/04与DS-02可重建投影；BG与源owner在查询时重验披露 | 索引不能授予读取权，saved view/结果数量不泄露隐藏对象 |

这张表是拟议实现边界，不要求一次创建九个独立服务或数据库。对于已有Core source/Artifact，只引用原ID/版本，禁止在Intake克隆另一份accepted记录。现有source bytes若有不可变历史约束继续保留；物理去重不是首片成功标准，也不承诺“永远只存一份”。

## 决策不变量

1. **持久、可见、接受分轴。** Scratch/Working/Shared/Record作为来源讨论的用途标签，不采用单一四态业务状态机。Retention class、scope/disclosure、Core decision分别来自自己的owner；Record可作为已接受证据的只读投影，不是“升级”按钮。
2. **默认保守保留。** 首片不自动清理既有journal、workspace、source或Run artifact。Scratch TTL只是未来新建临时对象的候选策略；GC须覆盖所有引用、历史接受、in-flight、pin/hold与保留政策，当前只安排dry-run，未知引用阻断删除。
3. **上传不自动公开。** 默认留在源Session/允许的资源范围，单次上传只建立明确的附件引用。关联到Matter/其他Session时再次检验目标与来源权限；“Shared/Library”不是public或permissionMode。
4. **保存与正式promotion拆分。** 将Run exact content-version保留为可复用Resource需要可信来源和幂等回执；将Resource设为Matter source使用已有Core membership合同；形成成果仍走Candidate→Decision→Artifact。三个动作不能以一次“加入Library”偷偷连做。
5. **跨owner保留中间态。** LG保存bytes/manifest后，目标owner提交引用；失败或崩溃留下unlinked/pending并可按同request ID对账。Core不accept前不能呈现已接受，ACK丢失先查询，不能盲重放。除非真实需求证明必要，不新增消息总线/outbox平台。
6. **源与目标双检验。** 查询、预览、搜索、relations和索引计数均受当前权限约束；跨范围复用不继承原owner授权。删除源可见性不能抹除已合法保留历史，但必须停止新披露；历史策略由原合同明确。
7. **精确版本。** 固定resource revision、内容hash、representation版本与字符/页坐标规范。Annotation换版不自动重定位为同一判断；缺字节、OCR partial、多处匹配、源已失效均有可见unknown/stale。自动reanchor只能提出新候选。
8. **消息历史兼容。** 先固定新显式消息及附件parts、旧事件定位映射和编辑关系。编辑产生新版本/关系，不改旧Run输入；redaction的展示与实际字节保留/删除分开。一般Chat产品身份和多Provider迁移仍归原Chat路线，本单不顺便替换它。
9. **Context最小披露。** 消费来源是数据，不加载其内部指令。全文/lexical先于embedding；索引键含源/处理器/配置/安全域，查询结果携generation与覆盖。旧index不能复活撤权，摘要/embedding不替代源。
10. **观测不改正式字段。** MIME/hash是机器观测，OCR/字段抽取/分类是派生或候选，工具/模型自报不改accepted metadata。PROV词汇可用作解释，但具体actor/used/generated必须来自记录。
11. **协议在边缘。** A2A Task不映射为Matter生命周期；MCP annotations是上下文提示，不是治理注释或授权；OpenTelemetry不存完整会话/附件。只在真实adapter消费者出现后声明逐项兼容，不因参考规范就称直接兼容。
12. **DWB分开。** [RD-006](RD-006-deferred-workspace-binding.md)处理执行资源能力绑定，本单处理保留内容和关系。连接目录不自动import/索引/共享；Library引用也不授予本地目录读写。来自已上传或已记录Run产物的首片无需等待DWB本地目录功能。

## 首片产品与前端

入口放在已有Session/Matter的资源/产物面；用户不必打开Finder找文件。先列表＋单对象Inspector，先回答来源、版本、可读性、是否已正式接受。支持仅metadata的条目且明确无bytes/preview；不强迫PDF/OCR或整体工作台。Library为工作名，不先加全局导航与巨型graph。

选择/过滤/预览不做隐式写入。显示“加入资料/关联到Matter”时说明实际关系，正式accept沿已有Review动作。展示不同owner的资源时不得混用同名Artifact的接受样式。Card/Timeline/Lineage、拖放批处理、自动分类和多目录管理后置。

前端沿[连续性规范](../design/agent-interface-2026-09-10/frontend-contract.md)及现有文件卡、Work Inspector、action/overlay先例；最近文件/消息实现是 `app/web/inspector.mjs` 的current/recorded identity guard、`user-message.mjs` 的Edit-as-new与 `markdown-source.mjs` 的revision-local block和Unicode坐标；后者不是已实现的annotation store。具体符号与缺口见[Luna回执](mature-practices-2026-09-12/luna-explore.md)。本轮不绘制新UI或称截图验收。

## 判别与退回

首个合成场景：上传一份文本→两处获准引用→生成一版Run结果→保留exact版本→Matter候选与正式接受→源改版→旧结论可解释且新读不误新鲜。跨权限串读、丢失旧接受字节、重复promotion、annotation漂移或索引越权任一发生即保持相应动作关闭。metadata-only和失败/未知必须是合法状态。

开工以实际最新Runtime/Core schema和当前合同为准；所有迁移必须严格校验、原始备份、旧host拒新、独立恢复目录。作者检查、非作者固定SHA复核、领域质量接受分开；本轮不关闭既有产品门。
