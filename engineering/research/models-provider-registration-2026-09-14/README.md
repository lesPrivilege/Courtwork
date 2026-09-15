# Models统一入口与独立注册 · 架构快照

2026-09-14 用户追加：[Composer模型连接引导与effort快选 PR登记](composer-pr.md)。沿本任务补配置往返和adapter枚举驱动的近端档位；已登记、未实现，不改变下述交付范围。

日期：2026-09-14。用户同意将配置入口统一到Models，同时要求OpenAI、DeepSeek分别注册，保持harness工具暴露与模型能力低耦合；授权Luna探索，**仅登记快照**。Astra登记架构方向，Luna提供[官方资料探索](explore.md)。未修改产品、schema、连接、凭证、模型选择或执行权限，未进行付费调用，不构成实现或Release接受。

后续用户授权“可以先做修正”，已完成[首片实现与验证](implementation.md)。下文保留原快照基线；实现范围及未完成能力以该交付回执分列，不把方向登记整体升级为已实现。

## 基线与现状

主线固定 `f937c98a86b794b79e4b363c19ca56c4cebe39f9`；本快照位于Settings隔离交付 `abb7ef859660a90f97668975b7e30f53265e5105` 之后。主线在途编辑由原writer保留。

- [provider-connections](../../../app/server/provider-connections.mjs)已经以connection为endpoint、wire format、credential identity、model list的记录单位；catalog与用户connection身份分离。本方向应扩展其现有owner，不能另建一份“Models注册库”。
- [provider-fields](../../../app/server/provider-fields.mjs)与[Pi runtime](../../../app/runtime/pi-session-runtime.mjs)目前只接已安装的两种OpenAI命名协议格式；协议名称不等同provider身份。后者已有OpenAI/DeepSeek原生reasoning字段映射和冻结能力校验。
- [model-capabilities](../../../app/runtime/model-capabilities.mjs)区分unknown、unsupported、enum及runtime-catalog/user-declared来源；这只是当前推理设置投影，不能扩称完整tool/vision/parallel能力注册。
- 最近已实现先例为[模型适配生产回执](../chat-memory-broker-2026-09-12/model-adaptation/production.md)：同一connection/model/API映射、精确effort枚举、默认省略参数与Provider观察分列。统一入口复用现有Model picker及配置治理，不把一次无工具连通检查升级为多轮工具兼容性验证。
- [Runtime合同](../../../app/docs/runtime-foundation.md)区分已安装catalog、provider配置与实际Run。Pi session使用Host提供的customTools且禁用SDK builtin tools；beforeTool执行检查不由模型catalog授权。
- Models已有Connection/Environment；adapter目前在General Host details与Developer Runtime只读显示。统一入口尚未施工，也没有任意切换harness的后端能力。

## Astra方向登记

**统一入口不合并架构身份。** Models集中连接、模型及其可用适配信息；Developer保留运行观察、诊断与历史绑定。各注册维度通过稳定ID/版本关联，不能依赖显示名称或endpoint字符串猜测provider行为。

| 维度 | 持有事实 | 不得推出 |
| --- | --- | --- |
| Provider定义/协议适配声明 | 独立provider ID、支持API、auth方式、默认endpoint、参数与错误/流事件编码、定义版本 | OpenAI-compatible即完整OpenAI能力；注册即加载任意代码 |
| Connection实例 | 选用定义、endpoint、凭证引用、模型清单/覆盖、配置revision | 连接可达即支持工具；凭证文本写入快照或Git |
| 模型能力快照 | connection/model/API/版本坐标，能力的值、来源与已验证范围 | reasoning=true即存在所有effort；目录缺字段即unsupported |
| Runtime adapter / harness | 已安装实现及版本、session/run/tool-loop/streaming/cancel/recovery契约 | provider注册即切换harness；具备tool-loop即获得工具权限 |
| Host工具目录与曝光 | 工具ID/schema/版本、来源、scope/profile过滤、请求曝光与有效曝光 | 模型支持function calling即自动曝光全部工具 |
| Policy与执行边界 | Host准入、每次调用参数校验、权限与执行重检、效果/取消记录 | 发送schema即执行授权；provider返回JSON即可信调用 |

这些是责任维度，**不是本轮批准新增六张表或六个服务**。具体存储归属、API与迁移在施工前沿现有connection/control-plane/Run binding合同裁决。

一次Run的可发送工具描述由Host有效曝光、模型/协议可表达能力与harness支持范围共同约束；执行仍由Host独立校验和授权。能力不满足时应报告具体冲突或使用用户明确选择的无工具模式，不静默删除工具、改用另一模型或扩大权限。provider原生托管工具与Host本地/MCP工具分别登记执行位置和回执责任，不能因名称相似合并。

配置保存只作用于未来Run；既有Run冻结connection revision、模型能力来源/版本、adapter版本、实际工具schema集合及策略绑定。可变模型别名/目录变化不能重写旧事实。UI应分别呈现声明、探测与运行验证；Models只展示Host真实广告的配置动作，无运行时切换合同就不画可用切换器。

## 后续施工前需确定

1. 在现有connection记录上增加provider定义引用还是通过现有catalog注册扩展；迁移保持connection/credential身份，失败可恢复。
2. capability的最小字段与来源版本；工具schema方言、tool choice、并行调用、流片段、推理续传等按独立特征登记，避免单一supportsTools布尔包办。
3. provider协议适配与harness适配分别校验；通用兼容连接可声明已知能力，不能根据域名猜测原生协议字段。
4. 在冻结Run前验证配置组合，给出可修正问题；执行期仍防不合法参数、未知工具与过期权限。迁移与假provider反例通过后，再另行授权真实provider验证。

后续候选反例：同名模型不同connection不串凭证/能力；OpenAI配置换DeepSeek不残留不适用参数；unknown能力不冒充已验证；模型支持工具但Host deny不得执行；运行中更新配置不改已绑定工具与模型事实。Luna的外部差异和来源另见探索稿，不把文档声明等同本机已接通。
