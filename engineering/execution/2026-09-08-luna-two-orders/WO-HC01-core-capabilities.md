# HC-01 · Harness Core 反例与基础能力兼容性验证

目标：验证当前通用 Core 的承重边界，并查清用户能否使用正常 coding/work agent 基础能力。既有 Core 交付不是待重写的框架；两种验证结果分别记录，不以功能清单替代状态正确性。

## A · Core 独立验证

固定基线见 [入口](README.md)，消费 `docs/work-core/contract.md`、`docs/work-core/nda.md`、`evidence/harness-core-20260908/` 和当前源码。检查通用 Core 不依赖 NDA/GUI/provider、唯一正式写入 owner、跨 Session 保留、producer 缺席读历史、CAS/幂等/可信 actor、事务中断/回执丢失恢复。

Luna 为非原作者，只写 `evidence/luna-two-orders-20260908/core-verification.md`、`core-probe*.mjs` 与 `core-*.log`。列已有测试实际覆盖后，选择 1–2 个独立反例探针；不能仅复述旧验收。每条结论注明 source inspection / existing test / new probe / not_run。可复用 npm lock 安装依赖；独立合成数据库、port 0。不改 app 源码；发现问题保留失败证据，交 Astra 另授最小修复范围。

## B · Agent capability compatibility index

唯一写权 `evidence/luna-two-orders-20260908/agent-capability-compatibility-index.md`。行至少包含 Session、model/provider/effort、files/tools/shell、AGENTS/skills、MCP、custom agents/delegation、task/plan/goal、permission、context/compaction、Git/diff/browser、UI/RPC。外部列 Pi / OpenCode / Codex / Claude / ZCode / ACP，以官方来源、日期与版本为依据；找不到则 unverified，不继承讨论中的行业结论。

CourtWork 每项标明 native / adapter / fallback / intentionally unsupported / absent / unverified，并附 host 源码消费者、契约/测试、GUI 和非 GUI 入口、一致性状态。上游 Pi 能力不代表宿主已暴露；设计中的支持不代表 runtime 实现；没有证据不写 intentionally unsupported。

开放 GUI 应消费同一真源；模型/agent/MCP/skill/task 的 file/API/runtime 入口须说明能否导入、导出、刷新与冲突处理，未验证则保留。MCP southbound、ACP/RPC northbound、portable declarations 与 SE 正式状态分别归位。能力协商只作为有证据驱动的后续接口提案，不能擅自添加万能 manifest 或第二份 task/goal 真源。

## 交付与退出

返回能力索引、可复现 Core 反例、差距优先级与最小后续切片（owner、依赖、验收）。Astra 核对架构边界；必要时另一 Luna 对高风险结论复读源码。P0/P1 表示后续优先级，不授权本轮实现全部 agent 功能。真实 provider/GUI/法律质量/全 H4 生命周期未运行保持 not_run，不关闭 G1–G5，也不声称整篇 Paper 获证。
