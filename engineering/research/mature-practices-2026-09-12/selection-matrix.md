# Traditional Systems → Courtwork消费矩阵

Astra裁决；V=本轮有限一手核验，R=源会话候选、未重验。V也不表示CW已实现。原始22外链在[source-links](source-links.json)，核验范围见[sources-review](sources-review.md)。

| 谱系/输入 | 等级 | 采纳的机制方向 | 不照搬 / 接入条件 | 归属 |
|---|---|---|---|---|
| Zotero | V集合；R API | 稳定来源记录、集合/标签正交、metadata-only可用 | 不嵌PDF工作台，不写其SQLite；有明确导入消费者才核API | LG-01 / RG-FE-01，connector后置 |
| Tropy | R | 有类型metadata与自由tag分层 | 不开放无约束业务字段；专家schema有真实第二消费者再泛化 | LG-03 / ME |
| DataHub / OpenMetadata | R | identity/typed facet/relationship/observation各生命周期 | 不建万能Matter JSON或通用metadata平台；已接受字段归Core | DS-00 / BG，connector后置 |
| dbt / Dagster | R | 定义、执行结果、观察分离 | 不以观察覆盖accepted state；本轮不装数据管道 | LG-03 / BG-02 / Core |
| lakeFS | R | 候选与正式版本分离、历史可召回 | 不引branch/merge存储引擎；多写者版本需求实测后再比 | Core/DS-03 |
| Temporal / CMMN | R | 执行历史与当前情境/可做动作分层 | 不新增工作流DSL/引擎，不预排知识工作全流程 | AM/DS-04，等待与效果需求触发 |
| A2A | V生命周期 | Message/执行/交付物分离，terminal后新执行 | 不将Task当Matter，不宣称协议已支持 | Runtime/BG-02/RG-BE-02，adapter后置 |
| MCP Resources | V相关段落 | URI与分页读取、host context选择 | 提示非权限；CW读权先行，catalog不等于read/subscribe已接通 | RG后置互操作 / 既有MCP owner |
| OCFL | V1.1 | bytes/digest/逻辑路径/版本manifest分离 | 不全量搬迁现有ArtifactHistory；布局不代替事务或接受 | LG-01 / DS-03 / RG-BE-01 |
| DVC | R | 内容寻址机制与运行复现信息分开 | 不采用DVC项目结构，不承诺全域去重/自动GC | RG-BE-01/06 |
| JMAP | V Blob/lookup；R其他 | bytes与对象引用分层、反向引用不泄露 | 不实现整套邮件协议，不把读者可见引用当GC全集 | RG-BE-01/03/06 |
| Paperless / Mayan | R | ingest入口、virtual collections与Inspector | 不先做Finder clone；OCR、saved view、虚拟FS依实际能力逐项核验 | RG-FE-01…03 / LG |
| W3C Annotation | V selectors | Body/Target/Selector与版本锚定 | 不把Review/Expert approval合并为一个注释type；不强制JSON-LD | RG-BE-05 / LG-03 / RG-FE-03 |
| W3C PROV | R | used/generated/derived/attributed作为候选词汇 | 关系需真实owner证据，不RDF化全库、不凭模型编造 | BG-02 / RG-BE-03 |
| LangGraph | R | 执行checkpoint与跨运行保留资料分离 | 不替换Pi或增加canonical memory副本 | Runtime/DS-00 |
| Matrix / JMAP message | R | 显式消息身份、编辑关系与当前投影 | 不把Run事件一刀切重写为新Conversation服务 | RG-BE-02 / 原Chat路线 |
| OpenTelemetry | R | 可观测trace与内容库分离 | 不默认复制附件/正文或收集隐藏推理；无需求不装SDK | 既有Usage/telemetry owner |
| Scratch→Working→Shared→Record | 输入建议 | 区分中间产物与长期材料 | 不采单一四态升级；retention/disclosure/acceptance分轴 | RG-BE-03/06 |
| 文件/Message/附件公用区 | 用户需求 | 首片上传与Run版本可保留、精确引用、按权限复用 | 不自动public，不把每个运行文件长期索引 | RG-BE-01…03 / RG-FE-01/02 |
| List/Cards/Timeline/Lineage | 输入建议 | 先列表＋按需Inspector | graph/cards不是首片前置；沿现有UI grammar，不拷贝皮肤 | RG-FE-01…03 |
| 全文/OCR/embedding | 输入建议 | exact→lexical→有收益再加复杂检索 | 无原文不伪称可重建，失败partial保留；不默认付费模型 | LG-02/04 / DS-02 / RG-BE-04 |
| Binding+Promotion | 输入建议 | 明确资源关联和保留命令及回执 | 不与DWB目录授权混用，不把保留自动变Core accept | RG-BE-03 / RD-006分工 |

上表ID是本轮消费者映射，不改既有路线接受状态。新依赖采用仍按[生态纪律](../../ecosystem/README.md)；本轮未安装任何依赖。
