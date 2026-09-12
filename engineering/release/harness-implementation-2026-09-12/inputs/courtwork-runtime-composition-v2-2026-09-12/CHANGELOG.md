# 覆盖关系 · v1 → v2

本轮用户提出更明确的组合与维护路线。本表覆盖的是上一版交接包中的设计条款，不宣称仓库文件已修改。

| 上一版位置 / 结论 | 本轮处置 | v2 有效结论 |
|---|---|---|
| 01 §3/§4：Spark 薄执行器须先证明比受限 Pi 更有收益，才扩大自研 | **拆分** | Spark 产品运行封装现在确认自研；优先复用 Pi core。性能实验决定实现厚度/默认选型，不决定 Spark 是否有自研资格。重写通用 loop 仍需实际必要性。 |
| 03 §1：P00→P01→P02→P02b→P03→P04a/b→P05→P06→P11-A→P12-A 为首条刚性链 | **替换排序** | 按 GUI、真实 Runtime 替换、Work 闭环三节点推进。节点一只做实路径所需的正确性、协议与 GUI 合流，不等待全部解耦或完整 Compiler。 |
| 04 DRT-03：完整通用自足节点及同 NDA Expert 为真实第二 Runtime 的前置 | **拆为两层证明** | 节点二先用独立于 Work 的合成任务合同证明 Runtime 真替换；同 Expert、同 Core 的正式工作替换验收放节点三。不能形成“先有完整 Work 才能替换，先替换才能开发 Work”的循环依赖。 |
| Work Core 主导模块化单体 | **保持并澄清** | Work Core 是正式工作语义 owner，不是通用运行的必经依赖；可整体替换的 core 指 Harness Core，绝非 Work Core。 |
| Runtime Adapter + Model Adapter | **细化** | RuntimeAdapter 管整套执行器；ModelAdapter 管模型协议；provider-specific execution profile 管已证实的上游使用方式。后两者不重复串在封闭 Runtime 后面。 |
| extensions 泛称 | **拆分** | runtime 私有扩展、CW 共享能力服务、Work/Expert 专业扩展分别定义；只有第一类随原生 runtime 一起替换。 |
| 热插拔长期愿景 | **降为分级能力** | 构建可替换、重启可配置、运行边界可切换优先；运行中 live swap 逐项验证，不作为共同前提。 |
| 所有局部跟进最新版 | **不采用** | 支持固定自足版本组合；安全、协议断裂、数据正确性等触发必要维护。外部 API 和模型语义不能被本地 lockfile 冻住。 |
| 等 Codex 官方开放 Runtime 接口 | **按事实校正** | 官方已于 2026-02-04 介绍 App Server，当前公开文档可供研究。节点二需核具体版本/所需能力，不泛称全部云端/桌面 Runtime 已开放。 |
| 原 P01/P02/P02b MCP 负例 | **保留** | 暴露的 MCP 必须完成相应正确性；真未支持/已关闭的能力可从首节点支持集合排除，不能只把按钮藏起来。 |
| P05/P06 完整快照/Compiler 为首 GUI 前置 | **拆片** | 首节点保留必要 runtime/model/profile、tool/permission、请求和事件证据；完备通用快照服务按真实消费者递进。未观测不能冒 sent。 |
| G1–G5 与历史状态 | **保留归属** | 三节点是本轮排序，不是重命名或自动关闭 G1–G5。前两个工程里程碑不冒称完整 Work 产品 release。 |

原件 SHA-256 见 `input-receipt.json`。新文件只构成补充/覆盖包；不改写原 received 返件，不给旧包整包盖“已修复”。
