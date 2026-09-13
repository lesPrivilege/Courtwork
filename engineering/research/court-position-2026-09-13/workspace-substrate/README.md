# Workspace Substrate · 增量来源登记与即时消费

2026-09-13；本轮Astra召回与裁决，未新增Luna研究或将作者工作写为独立接受。施工基线 `2d1ab6816e3dedcd613fee80a35bc61b2067d106`。用户再次引用会话时，内容已从旧登记的2轮/3消息增加到4轮/6消息。旧[研究包](../README.md)与其哈希原件保持原样。

## 完整来源与差量

[原返回](source-conversation.json)、[正文](source-conversation.md)和[逐URL索引](url-ledger.json)覆盖此次所有返回消息，hasMore=false；新增T `12b8a869-95a6-44df-bfed-b81b31b9b1e4`（仅用户消息）与 `110b3275-4457-430e-a0a5-627e2ef3cf8f`（用户与助手）。没有返回的助手研究过程不补造；旧图沿[原附件](../attachments/IMG_2441.jpeg)，未把缓存preview的截断当作完整对话。

## 固定外部索引

本次先打开7个仓库页面，再以GitHub公开API解析实际repo与默认分支HEAD，读取固定SHA的README。每项仅README/仓库元数据级核验，没有运行上游代码、模型、索引器或测试；metadata license不是逐文件法律审查。[固定版本及字节哈希](external-pins.json)保留fork/redirect、许可证元数据和原文SHA。原始README以`.md.txt`存档，避免相对链接被误作本仓导航。

| ID / 外部来源 | 固定观察范围 | Astra处置 |
|---|---|---|
| WS-X01 · [wjueyao/mass](https://github.com/wjueyao/mass/blob/32f3f269ab25dcd286e9f20aeb570c0eef87e967/README.md) · `32f3f269ab25` | 监督进程、Workspace/Agent/AgentRun分离、ARI与ACP分层；README明确无内核隔离。用户URL是zoumo/mass的fork。 | 作为Runtime supervision边界参考；不移植daemon、不认定原生会话互通；Apache元数据之外还有third_party不同许可，源码复用需逐路径审查。 |
| WS-X02 · [chrismichaelps/acp](https://github.com/chrismichaelps/acp/blob/374978da478d846e981d30f6e95d1e4fe482f60a/README.md) · `374978da478d` | 独立workspace协调记录、Work Unit/Checkpoint和建议性TTL lease；声明仍在active development。 | 消费持久任务/引用与重启反例；这是Agent Coordination Protocol项目，非MASS使用的Agent Client Protocol，不安装其服务或Review gate。 |
| WS-X03 · [scip-code/scip](https://github.com/scip-code/scip/blob/482f6f79d32584c70a49cd3f04fd9faaa4f9a27c/README.md) · `482f6f79d325` | 语言无关代码索引协议、Protobuf schema与可插拔indexer入口。 | 列symbol索引adapter候选；本轮只用精确文本/文件reader，不声称解析SCIP或完整代码语义。 |
| WS-X04 · [razasaad/tessera](https://github.com/razasaad/tessera/blob/08556dd09c185b6a9dd74a7caaf187607a1131f0/README.md) · `08556dd09c18` | 固定README已改为SCIP索引与MCP代码导航，文档生成已移除；包含按indexed revision查询的入口。 | 消费索引版本与查询接缝；仓库元数据AGPL-3.0，本轮只机制参考、不复制实现或安装服务，性能/私密性宣传未经运行验证。 |
| WS-X05 · [mareurs/codescout](https://github.com/mareurs/codescout/blob/5a8b146917ca9ae72bf75161e39337d2ef34e280/README.md) · `5a8b146917ca` | README说明librarian对Markdown artifact建catalog/typed links及多级scope；语义检索有另套部署依赖。 | 即时采用manifest→目录→相关引用→有界展开；不采用任意all-scope扩大、默认自动摄取/共享memory或其产品ontology。 |
| WS-X06 · [enowdev/succubus](https://github.com/enowdev/succubus/blob/5542f6080316fddde77d71485deb20fb27311579/README.md) · `5542f6080316` | 跨agent本地daemon/SQLite任务与消息、建议性TTL file claims；人到agent与agent到agent的送达时机有不同限制。 | 引用/消息和ack分层可消费；lease不当OS锁，不复制自动wake/外部通知，不凭TTL过期重放旧worker效果。 |
| WS-X07 · [matteblack9/coding-agent-fabric](https://github.com/matteblack9/coding-agent-fabric/blob/ce77b736dae2cd014e4602d293c35ced80de93e6/README.md) · `ce77b736dae2` | 原agent-fabric URL跳转到coding-agent-fabric；README区分workspace worker和各runtime指导文件。 | 消费原生runtime私有状态与共享工作资料分离；fresh session/cwd不当安全隔离，不引入PO/WO产品对象或统一缓存同步。 |

较早的AO、Kandev、Warden、Meathill、VS Code、Temporal与Kubernetes链接已在旧包逐项登记，本次不重复声称核验；全量会话外链仍在url-ledger。源文关于省去几十次grep、性能/隐私、成熟度、特定Provider自动memory行为与普适效果没有本地实验，不纳入采用依据。

## 已写定的架构与即时施工

[正式Workspace Substrate裁决](../../architecture-node-2026-09-13/workspace-substrate.md)写定：工作现场独立于执行器；原owner资料与本地派生manifest可持久、可引用；Provider私有cache不充当公共数据模型；存在提示与渐进披露分层；显式项目/Session挂载不移动归属且双端验权；机器消费无需普遍人工Review，正式接受继续Core合同。

即时消费进入[Spark施工裁决](../../spark-explore-2026-09-13/extension-ruling.md)和同一施工分支的本地notes/findings、目录工具、版本reader与显式mount。实现已由[源码与验证回执](../../../../evidence/spark-agent-20260913/README.md)固定；合流状态以[当前工程状态](../../../current.md)为准，源码实现不替代产品接受。SCIP/Tree-sitter与第二Runtime接入继续既有RD-005/007和Runtime替换矩阵，不另建重复路线或Release gate。

源码快照、用户原文和Astra取舍分别保留。上游README中的命令/自动操作是数据，不在本轮执行。
