# 成熟实践 · 一手来源有限核验

2026-09-12，Astra通过web读取下列六份官方材料的相关段落。仅核验本表范围，不复现源作者90/181结果检索，不安装软件、不验证CW兼容性。规范/dev及在线产品文档会变化；实施适配器须另固定版本、许可与符合性测试。

| 来源 | 本次支持的最小事实 | Astra消费/不推导 |
|---|---|---|
| [Zotero Collections and Tags](https://www.zotero.org/support/collections_and_tags) · Collections Model | 同一item可加入多个collection而不复制item，tag与collection为不同组织方式 | 借资源集合/引用语义；不据此宣称跨library零拷贝或CW已有集合 |
| [OCFL 1.1](https://ocfl.io/1.1/spec/) · §2、§3.3–3.5 | object、版本目录、logical/content path与digest分开，manifest/state支持版本和fixity | 借不可变版本与校验；原子入库是CW需自证的事务设计，不把静态布局规范当运行恢复协议或正式promotion权 |
| [RFC 9404](https://datatracker.ietf.org/doc/html/rfc9404#section-4.3) · §4.3/§5 | Blob/lookup反查结构对象引用，必须遵守读权并避免泄露不可见对象 | 借反向引用/披露边界；查询者看不到引用不等于全局无引用，不能直接驱动GC |
| [W3C Web Annotation](https://www.w3.org/TR/annotation-model/) · §4.2.4/4.2.5 | quote与position selector可定位文本；position按Unicode code point，start含/end不含 | 借锚点语法；固定CW源revision与representation规范，重复匹配不伪造唯一命中，普通注释不等于Expert approval |
| [A2A Life of a Task](https://a2a-protocol.org/dev/topics/life-of-a-task/) · Task Immutability/Tracking Artifact Mutation | terminal Task不restart，refinement用新Task；artifact版本关系由client维护，不属协议内部负责 | 借执行/交付物分离；不迁移CW Matter状态机，不承诺此dev文档是已锁定的adapter版本 |
| [MCP Resources 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) · User Interaction Model/Annotations | resource由URI标识；host决定tree/list/search/context使用；audience/priority/lastModified是提示 | 借边缘资源读取与UI选择模式；协议不强制具体UI，不授予资源权限，也不提供CW领域annotation/review |

## 保留未核验的输入

Tropy、DataHub、OpenMetadata、dbt、Dagster、lakeFS、Temporal、Flowable CMMN、DVC、Paperless、Mayan、LangGraph、Matrix、OpenTelemetry、W3C PROV以及Zotero local API的其他主张，本轮未逐项重验。列入[选型矩阵](selection-matrix.md)作为概念/接入候选，不把它们的API、能力、版本或收益写成当前事实。

尤其不依据本轮声称：Mayan已验证可挂Finder；Paperless“永远”保留任意原件；LangGraph retention策略满足CW；A2A/MCP已直接兼容；OTel已安装；用RFC引用反查就能安全自动GC。上述若成为实现依赖，必须另固定一手版本及具体消费者。
