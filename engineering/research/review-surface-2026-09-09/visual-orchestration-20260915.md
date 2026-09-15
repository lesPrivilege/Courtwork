# Agent可视化编排 · Astra裁决与引用补账

同日后续：[5轮Memory/披露/遗忘增量](../chat-memory-broker-2026-09-12/attention-governance-20260915.md)接Memory Broker与RD-007。原4轮内容无修订；下述首轮范围与证据保持。本次补充引用的Chat States两轮亦与原快照一致。

2026-09-15；用户授权登记，Luna有界探索，Astra负责架构裁决与整合。读取基线为 Courtwork `main@7e1a1ff047721e1ca6c871deba7f367ccea55a06`，工作树已有多位writer在途修改，全部保留。本轮只改登记文档，不启动产品施工。

## 输入与责任

完整读取 ChatGPT「Agent可视化编排方案」（`6aa8c9be-e828-83ec-966f-50ce14e6216f`）：4 turns、8条消息，hasMore=false，无返回附件。[工具返回快照](visual-orchestration-input-20260915.json)保留消息ID和来源文字。历史召回表是该Chat的二手索引，不能证明原会话已读取或旧决定已获正式采用；外部检索数量亦不是本轮核验量。

主责任接[已有Presentation节点](presentation-20260914.md)与本Review Surface owner；资源保留、跨会话Notes增量接[RD-007](../RD-007-resource-governance.md)及[Workspace Substrate](../architecture-node-2026-09-13/workspace-substrate.md)。Host拥有校验、执行身份与持久回执，前端拥有renderer与placement，正式Review/Decision仍由原Core/domain owner持有。最近已实现的资源版本先例为RD-007所列Inspector identity guard；Spark notes则沿[实际合同](../../../app/docs/spark-agent.md)的ArtifactHistory字节与Assignment引用。不能因原Chat使用React示例而迁移当前原生DOM前端。

## 逐项裁决

| 输入 | 处置 | 理由与后续证据 |
|---|---|---|
| 预编译组件、semantic spec、catalog/renderer | adopt | 延续9月14日只读纵切；模型选择意图并填typed数据，Host验证，前端负责布局、响应式、主题和承载位置。保持host-projected与model-derived分源。 |
| Human Review Grammar与shape × intent × mode | adopt / adjust | 采用为合同设计维度，使用允许的组合表；不是三维笛卡尔积全部合法，更不是已经穷尽人类交互的证明。primitive → pattern → surface约束组合，业务内容不成为无限页面枚举。 |
| 第一版6–10个surface、四个工具、任意catalog树 | adjust | 保留原facts首片及单一cw_present候选；不冻结工具名称/数量，不以新讨论扩成同时造十个surface。Compare/Evidence/Decision等在真实消费者出现时接同一路线。 |
| Controlled first / Declarative second / MCP Apps边界 | adopt / defer | 采用分层方向；声明式编排仅允许Host注册pattern。外部协议为adapter候选，未选库、未锁wire、未实现iframe或跨宿主兼容。 |
| hover/sort/zoom与HITL分开 | adopt / adjust | 本地交互不制造模型turn。Runtime question/permission、领域proposal review与commit各走原合同；不能将所有approve统一变成tool result即自动resume，更不能以surface按钮取得正式写权。 |
| Chat/Preview/Inspector/Export多投影 | adopt | 同一实例与精确版本，Host/frontend决定placement；不新建第二Preview，不把export或打开页面当接受。第一片仍沿原重开/失败fallback反例。 |
| 保存spec + data + rendered artifact及provenance | adopt / adjust | 导出进入RD-007资源链：保留spec/version、精确数据引用或获准快照、renderer/theme/transform版本、hash与source refs。SVG/PNG是representation；CSV/JSON仅导出当前获准数据。规范化与缺字节/依赖条件未定前不承诺逐像素重放。Save/Binding/Core接受分开。 |
| Flint等外部后端 | defer | 先核官方实现、许可证、包版本、维护/体积、导出依赖、原生DOM接缝及恶意spec限额，再由真实chart消费者触发采用，不把第三方演示当CW能力。 |
| 通用原子Notes与Memory分轴 | adopt / adjust | 采用可独立引用、更新、复用的意义单元；稳定ID与不可变revision分开，正文、精确来源、关系为最低要求。Binding不是ownership。沿RD-007补合同，不新增平行知识数据库。 |
| Notes尚未命名、所有数据必须经Note→Matter | reject | 当前Spark已有immutable notes/findings。通用用户Notes是范围增量；直接读源、普通Chat与非Matter资源仍合法，Notes不是所有工作必经层。 |
| 对象优先的两阶段recall、hybrid retrieval | adopt / adjust | 作为可测检索策略，先精确引用与获准对象，再按需回源；不用固定全局排序掩盖查询意图、覆盖或旧版本。索引可重建，不能授予读取权或代替源。 |
| Spark自动蒸馏、去重、合并、Memory写入 | defer | 可提出candidate notes/links/冲突；已有Spark notes不等于通用编辑/跨任务检索/共享Memory。合并要保留旧ID/来源，撤权后查询及摘要不泄露，正式promotion仍走原owner。 |

## Luna官方来源核查

历史召回的22项本地覆盖与额外Deck/Notes检查见[Luna引用表与Astra处置](visual-reference-audit-20260915.md)：已有方向回链，部分覆盖保留缺口；Deck Surface Grammar v1仅二手提及，原始材料与同名本地合同未定位。它不是本轮新增的正式grammar。

2026-09-15，Luna只读核查；下列是外部参考事实，不是本地依赖采用或能力接受。

| 官方来源 | 本次可证范围与限制 |
|---|---|
| [Flint Research](https://www.microsoft.com/en-us/research/blog/flint-a-visualization-language-for-the-ai-era/) / [MCP setup](https://github.com/microsoft/flint-chart/blob/main/docs/tutorials/setup-flint-mcp.md) | semantic types与编译器推导scale/baseline/format/layout，多backend；setup列出create_chart_view、validate_chart、render_chart、compile_chart、list_chart_types与预打包ui资源。具体headless内部流水线本次未核。 |
| [json-render Catalog](https://json-render.dev/docs/catalog) / [Registry](https://json-render.dev/docs/registry) / [Renderers](https://json-render.dev/docs/renderers) | catalog定义组件、actions、functions、props schema、slots、description，平台registry映射，同一受约束spec可投射不同renderer；未测试CW接入与导出一致性。 |
| [assistant-ui API](https://www.assistant-ui.com/docs/api-reference/generative-ui) / [README](https://github.com/assistant-ui/assistant-ui/blob/main/packages/react-generative-ui/README.md) | present注册组件树与standalone placement、prompt_user为HITL prompt；原Chat“立即结束/必然暂停并自动resume”生命周期结论本次未独立证实，不采用为CW合同。 |
| [A2UI](https://a2ui.org/) / [v0.9.1协议](https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9_1/docs/a2ui_protocol.md) | 截至核查页面所示v0.9.1为current production、v1.0为candidate；协议有createSurface/updateComponents/updateDataModel/deleteSurface及结构/数据分离。本地未采用wire。 |

CopilotKit三档、AG-UI、MCP Apps“成熟”及OpenAI Memory/Plugins UI主张本轮未核，保留为输入线索；不将引用Chat的自述检索量作为证据。Luna报告由Astra消费，上表的限制与逐项defer一同保留。

## 原owner下的下一步与退出证据

1. Presentation继续facts只读fixture→Host校验/回执→inline与同ID Preview→重开恢复，不打断当前RD-006真实仓库接入。后续chart片才比较Flint等后端；composition片逐family写输入schema、允许action、placement/export projection、空/错误/未知与体积上限。
2. 导出片在RD-007核查精确版本、来源撤权、失败重试/幂等、renderer失败、跨owner未关联回执与缺字节；不得由导出顺便创建Core accepted artifact。
3. Notes片在RD-007先固定通用身份/revision、创建/修订owner、未绑定scope、跨对象binding、来源定位与删除/保留政策。首个fixture为一条Chat派生Note→两处获准绑定→修订后旧引用仍可解释→撤权不再披露→显式查询命中并可回源。当前Spark限定范围及Store15保持不变；需要迁移时另按实际合同处理。

本轮文档检查与Luna探索仅支持登记覆盖；不等于产品实现、独立产品验收或用户目验。无新工具、schema、依赖、provider调用或部署，PAPER采用pin不变。

## 登记验证

Astra检查：输入快照JSON可解析，4 turns/8消息/无下一页；快照SHA-256为`d9d3206569e7719c015fb89751ceb94092468609696b209061feda4519885635`。`node tools/check-doc-links.mjs`通过（1342文档、7410链接），`git diff --check`通过。两位Luna分别完成本地引用覆盖与官方技术来源探索；最终采用与限制由Astra整合。纯文档登记未跑产品测试/浏览器。未commit/push，保留原工作树在途修改。
