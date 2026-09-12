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
