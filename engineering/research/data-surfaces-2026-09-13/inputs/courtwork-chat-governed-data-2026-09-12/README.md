# CourtWork · Chat 独立节点与受治理数据面

2026-09-12 · 初步研究与实施交接增量。

**采用方向：Chat 是独立自研节点，由原生 Provider 入口/容器、获准本地投影和只读薄能力组成；不是第三套通用 Harness。先形成跨 Provider 的可追溯数据，再让 Chat、Spark、Attention 从同一受治理读取面消费。**

本包接续上一轮 runtime-composition-v2，不重写其原件，不改变「Harness GUI 跑通 → 真实 Runtime 替换 → Work 小场景闭环」的主线。Chat/数据研究可以并行；共享 owner 的实现和迁移仍串行合流。全部工单为拟议，未创建 GitHub PR，未部署或调用真实模型。

## 四项裁定

1. **入口、采集、组织、披露分别设计。** 能显示网页不等于可自动提取全部聊天；能读 CW 的 connector 不等于能读 Provider 原生聊天库。容器成功不是数据连续性的前提。
2. **用途不能替代接入许可。** “不做 coding”是清楚的产品边界，但条款还约束自动提取、认证、再分发等。首片采用官方导出或用户明确提供的材料；薄工具用官方支持的 app/MCP 通道。未经核准的 DOM 抓取、逆向私有 API、登录 token 转用不进入路线。
3. **围绕 Work Core 建数据治理，不把所有数据塞入 Work Core。** 来源保留、消息投影、索引、个人 memory、正式成果继续按原 owner 划分。统一查询面不等于统一写库权。
4. **grep 是受控读取能力，不是全盘访问能力。** 先解析可信身份与当前 grant，再在可披露集合中搜索；每次 exact read 再验证来源版本、范围和撤权。真正的词法引擎可以很简单，治理语义不能省略。

既有 repo 已有 Chat Broker/薄能力和 RD-007 的合同基础，本包是外部核验与实施收敛，而非再次发明总架构。[R01/R02/R03](SOURCES.md#r01)

本轮原文与逐项处置见 [INPUT.md](INPUT.md)。

## 文档导航

| 文件 | 负责的决定 |
|---|---|
| [01-CHAT-CHANNELS.md](01-CHAT-CHANNELS.md) | 两个数据方向、政策准入、容器与官方 connector 的分工 |
| [02-DATA-ORGANIZATION.md](02-DATA-ORGANIZATION.md) | owner、稳定身份、来源/版本/表示、组织关系与生命周期 |
| [03-GOVERNED-DISCLOSURE.md](03-GOVERNED-DISCLOSURE.md) | 渐进查询/读取、真实 grep、授权、覆盖与披露证据 |
| [04-IMPLEMENTATION.md](04-IMPLEMENTATION.md) | 有界实施片、既有编号映射、验收负例及产品闭环 |
| [HANDOFF.md](HANDOFF.md) | 本地接单指令、文档落位和维护策略 |
| [SOURCES.md](SOURCES.md) | 固定 repo、官方公开来源、证据上限 |

`channel-register.json` 只是方案登记，不是运行配置、许可证明或 capability advertisement。`work-order-map.json` 只是依赖映射。`verify-package.py` 只检查本包，不能代替产品测试。

## 最先可交付的闭环

用户主动导出的两份聊天/选择的片段 → CW 原件与版本保留 → 本地检索/精确引用 → 用户选择披露集合 → 一个官方 Chat 通道只读查询 → 可回源的交谈。

容器 spike 独立进行。Spark/Attention 的 first slice 等待所需 reader、版本与责任合同成立，不等待一个完整通用资料平台。
