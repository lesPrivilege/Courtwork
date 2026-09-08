# Luna 两笔新单 · 2026-09-08

用户授权：落工单并启动 Luna 有界执行。来源讨论：[Luna集群应用建议](chatgpt-conversation://6aa01097-d018-83ec-aa7c-94e6cf1b3a39)。讨论是范围输入，外部能力声称须重新核查。实际读取 Courtwork/main `429fdd68febb9998f322a0b53c323651fc8cd7fd`，工作树干净；从该 SHA 建临时隔离树，分支 `codex/luna-maintenance-core-validation`。唯一持久产品入口仍为 Courtwork。

| 工单 | 目标 | 执行与写权 |
|---|---|---|
| [CB-01](WO-CB01-clarity-pilot.md) | 有界 clarity 优化试点，独立验证后才改代码 | Luna Finder → 独立 Verifier → Fixer → 非作者 Reviewer；Astra 最终裁定 |
| [HC-01](WO-HC01-core-capabilities.md) | Core 反例复验 + 基础 agent 能力/兼容性缺口 | Luna Core Verifier 与 Capability researcher 各自证据分片；Astra 负责架构接缝 |

实际启动三个 Luna max 子代理：`clarity_finder`、`core_verifier`、`capability_index`。它们是本任务内执行者，不是另建的用户任务。三个分片只写各自 evidence，第一阶段均无产品源码写权；current 由 Astra 单写。具体运行结果与未检项进入 [证据包](../../../evidence/luna-two-orders-20260908/README.md)。当前产品状态仍只在 [current](../../current.md)。

## 共用门

先读 AGENTS/current、具体契约和固定交付，不以旧聊天或设计文档中的“待实现”覆盖当前源码。Paper 仍按 PAPER.md 的 9.6 固定 SHA；本轮不改论文。M05/M06 正式状态、M02 运行状态、M11 投影各守现有 owner。

所有 fixture 用仓外独立合成数据和端口 0；不访问个人凭据、不运行付费 provider、不部署、不 push。禁止 checkout/stash/reset 共享 UI 树。WK12/WK11、app/web、renderer、根 README/site/brand 不在写权内。缺口先保留可复现反例；跨服务或架构改动返回 Astra 新切片裁定。

交付记录实际 SHA、路径范围、命令、输出、失败、not_run，作者测试与独验分列。stage barrier：候选 → 独验 → 授予精确修复路径 → 检查 → 非作者复核 → Astra 合流。0 个确认候选也是合法结果，不能为凑交付制造 diff。显式路径提交并核对 staged names；不改共享历史。
