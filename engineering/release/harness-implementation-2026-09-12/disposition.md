# 逐卡采用与串行队列

此表登记全部20张原卡，覆盖旧包依赖排序；当前进度仅由 current 与证据回执持有。原 plan.json 保持原字节与 proposed 状态。

| 原卡 | 责任 | v2 落位 / 处置 |
|---|---|---|
| P00 · 基线、原包处置与唯一 owner 清账 | Astra；Luna有界探索 | baseline |
| P01 · 锁定 SDK 的 MCP 目录完整性 | Astra；Luna有界探索 | gui-harness |
| P02 · MCP 错误与效果未知结算 | Astra；Luna有界探索 | gui-harness |
| P02b · 当前源码新增：结构化结果和错误正文保真 | Astra；Luna有界探索 | gui-harness |
| P03 · Pi native seam / DRT-01 | Astra；Luna有界探索 | runtime-replacement |
| P04a · Work application façade | Astra；Luna有界探索 | runtime-replacement |
| P04b · Core-free Harness 组合根 | Astra；Luna有界探索 | runtime-replacement |
| P05 · 实际输入证据与历史解释 | Astra；Luna有界探索 | split-across-nodes |
| P06 · 指令层次、能力拒绝与 compaction | Astra；Luna有界探索 | split-across-nodes |
| P11-A · 基础能力最小前端消费 | Astra；Luna有界探索 | per-node |
| P12-A · 第一列有界非作者接受 | 非作者核查；Astra裁决 | per-node |
| P07 · 人维护 scoped memory_text | Astra；Luna有界探索 | consumer-triggered：保留合同，实际消费者触发 |
| P08 · 显式 clean context / native generation | Astra；Luna有界探索 | consumer-triggered：保留合同，实际消费者触发 |
| P09 · 受限 web_fetch 与响应版本 | Astra；Luna有界探索 | consumer-triggered：保留合同，实际消费者触发 |
| P10 · 授权目录下 Skill inspect/import | Astra；Luna有界探索 | consumer-triggered：保留合同，实际消费者触发 |
| P11-B · 能力补齐前端消费 | Astra；Luna有界探索 | consumer-triggered：保留合同，实际消费者触发 |
| P12-full · 完整通用节点独立接受 | 非作者核查；Astra裁决 | consumer-triggered：保留合同，实际消费者触发 |
| DRT-02 · 协议与持久化 synthetic probe | Astra；Luna有界探索 | gui-harness |
| DRT-03 · 真实第二 runtime / Codex App Server | Astra；Luna有界探索 | runtime-replacement-and-work-loop |
| DRT-04 · profile 与薄 Spark 对照 | Astra；Luna有界探索 | work-loop-after-correctness |

DRT-01 与 P03 共用接缝清账；RD-006/DWB/BE-23、RD-007/LG/DS/BG、BE-6/7 维持现 owner，三类 futureConsumers 全部登记为按需消费。G1–G5 各保留原门，未因登记或首节点自动关闭。

唯一后端 writer 为本任务 Astra；Luna explore 不改 service/store/control-plane。实际源码变更逐片串行。P00 → P01 SDK red fixture → P01 修复/复核 → P02 → P02b → DRT-02 与最小 GUI 证据 → 节点一有界核查；随后节点二、节点三。MCP 当前已暴露为可选受控能力，采用修复路径，不为跳门移除能力。

P05/P06 只将首节点所需绑定/权限证据前置；P11/P12 分节点消费，完整能力门仍开放。节点二需要真实第二 runtime；节点三才做同 Expert / 同 Core 与 Spark、Attention 闭环。原包的远端 PR 创建、安装、付费调用和发布语句不自动提供授权。
