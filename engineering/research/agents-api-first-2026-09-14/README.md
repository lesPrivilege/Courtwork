# Agents API 候选与 GUI dogfooding · Astra 裁决

## 2026-09-16 · 首个新增 Runtime 样板

[官方核源、技术方案与 A–F 施工片](implementation-plan-20260916.md)接用户新要求：OpenAI Agents API 作为首个新增 Runtime 样板，先采用 `none`＋CW 受控函数工具，原生 Session/turn/call、效果结算、取消/恢复与同一 GUI 合流。Pi 保留；完整仓库样板接 RD-006→DF-04，托管环境与 self-hosted executor 后置。接 [Claude 主施工单](../../execution/claude-frontend-harness-2026-09-16/README.md)，不另建 roadmap、不恢复右栏 Runtime 统计卡。

## 2026-09-19 · Local Agent Orchestra connection

The [Orchestra direction](../architecture-node-2026-09-13/orchestra-direction-20260919.md) keeps this as the first new Runtime sample and reuses the existing A–F slices. The minimum Port vocabulary is `describe/admit`, `start/continue`, `observe/recover`, `reply/tool-result`, `interrupt/cancel`, and `dispose`; it does not create a competing DTO or claim the hosted lane is available. A-1 recovery repair is accepted in the existing record; A-2–A-4 remain deferred and `environment:none` plus CW function tools remain unavailable until a bounded real probe. Host/CW Run and native IDs stay separate, and native-only children/environment facts are projected only when actually exposed.

This sample is the hosted side of the same Local/Hosted lifecycle contract. It must not be routed through the Pi loop to manufacture a replacement claim, and it does not move Work/Core ownership. The current Composer/Models binding, permission preview, Files/Review, and active-Run freeze remain the UI precedents. Future Kit/Role composition consumes this record only after a real consumer exists.

本日新增官方协议/SDK 源码核验及施工计划；下文 Sep14 的外部待核状态保留其原时点，未把当时 Local test 记作新 API 实测。本轮没有产品代码、真实 API 调用或能力接受。

## 2026-09-14 · 原登记与现场记录

2026-09-14，实读 `main@7e1a1ff047721e1ca6c871deba7f367ccea55a06`。原工作树有治理与独立评审文档在途，均保留；本轮无产品代码修改。用户授权内置浏览器开始 dogfooding、Luna 探索与复验、Astra 架构与工单切分。附件及所引会话为研究输入，不自行赋予执行、凭据、部署或正式决定权限。

## 裁决与原 owner

采用附件的分层方向：第二执行组合应进入 Runtime Adapter 接缝，不能仅在 Model Provider registry 增加名称，也不能将托管 harness 绕回 Pi loop 来声称替换成立。Host 继续拥有身份、准入、Run 与回执；Core 继续拥有来源、候选、版本与 Decision。Pi 保留当前 dogfooding 责任。

Agents API 提为原 P03/P04/DRT-03 下的优先核验候选；App Server 历史候选和证据保留。外部 beta、SDK、environment、function 与恢复协议主张本轮未独立核验，不能据附件锁依赖或实现可用按钮。当前 service 仍直接引用 Pi SessionManager 与 createSessionRun；第一片应从真实消费者提取最小生命周期，不预建通用框架。

原入口：[Harness 排单](../../release/harness-implementation-2026-09-12/disposition.md)、[DF 队列](../../release/harness-implementation-2026-09-12/harness-dogfooding.md)、[RD-009](../RD-009-trusted-harness-extensions.md)。以下为这些原工单的切片，不增第二份 roadmap。

| 原工单 / 切片 | 用户结果与责任 / 写权 | 先例、主反例与退出 |
| --- | --- | --- |
| DF-04 / 固定检查 recipe | CW Agent 自己执行一个合成代码检查；Host 执行与独立 settle，Runtime Control 暴露与审批；test-runner、service、control-plane，UI 仅必要投影 | 沿 RD-009、workspace-tools、governTools、现有工具卡。先冻结 DTO；deny 零执行、非零退出、限额、取消后收尾、unknown 不重放；再 GUI 真实模型读改测与重开。不得用外部 Codex 检查代替。 |
| P03 / DRT-03 协议与绑定 | 可检查实验执行组合的真实支持范围；Astra 冻结 adapter DTO，Luna 核官方来源/SDK精确版本 | Pi session runtime 与 Host Run binding。映射 native IDs、能力、取消/恢复、凭据边界；Pi parity 通过，未核实能力保持 unavailable；先不改 Core schema。 |
| DRT-03 单根工具往返 | GUI 对两份合成来源发任务，按原 reader 返回精确版本；adapter / Host / source owner 同片接线 | source-resolver 与 permission/tool Inspector；批准绑定 call 与输入，拒绝零执行；真实 function 往返与历史重开可见。协议核验为前置。 |
| DRT-03 断线与取消 | 用户停止或重开后能辨明实际结果；Host 对账与 adapter 生命周期 | 现有 Run 结算 / unknown 语义；远端身份持久化、丢回执不重复副作用、无法确认终止保留未知。与上一片组合复核。 |
| DRT-03 coding / 同 Work | 隔离执行环境产物回收、随后同一 Matter 跨执行组合接续 | Files diff 与 Core candidate/Decision；先证明文件字节/检查身份，再由真实人决定。下载不是接受；不承诺私有 transcript 迁移。 |

前端沿 [UX Grammar](../../design/ux-grammar.md)与[前端合同](../../design/agent-interface-2026-09-10/frontend-contract.md)，优先已有 model/runtime binding、permission preview、工具调用卡及 Files/Review；不另造运行状态方言。每片开工补固定源码、唯一 writer、DTO 与最小检查，Luna 有界实现或非作者复核，Astra 在接缝、集成及真实视觉关键点裁决。

## 本轮真实浏览器记录

原 8847 无监听，打开收到 connection refused。随后从上述 main 源码以 Node v25.9.0 启动独立临时数据实例，端口 8859；启动命令为 `node app/server/index.mjs --data-dir <independent-data-dir> --port 8859`。未复制个人凭据或旧运行数据。该 Node 版本为本次现场环境，不替代已有 Node22 验证基线。

内置浏览器实际打开首页，在 Local test 下发送“Dogfooding 20260914：验证普通 Chat 发送与刷新接续。”；页面显示首 Run 已记录、示例关闭及 Continue 项 Completed。这只证明确定性运行入口，不证明真实模型或 coding 能力。随后页面切入模型配置，点击原页面节点返回无布局对象；实际截图显示 Settings/Models。用户确认正在配置连接并要求暂不操作页面，故暂停 GUI，刷新接续未验。为用户继续配置保留本地实例。

截图由 Astra 实际查看，未保存为视觉接受 baseline；Luna 独立持久化核查另附。未代用户作成果 Decision，G1–G5 / DF-04 未关闭，未 push/部署。

## 2026-09-15 · P03/DRT-03 第一片回填

[协议与绑定裁决及证据](adapter-protocol-20260915.md)：已冻结最小 Runtime Adapter DTO 与 native 映射（创建/续发/取消/观察/恢复/结算责任），离线 fixture 12/12 覆盖创建、事件去重、completed/failed/cancelled/unknown 结算、saved-items 恢复与取消映射；`environment:none` 协议已映射但按未经实测一律 unavailable，self-hosted 整 lane 本轮 unsupported。官方文档固定字节、`OpenAI-Beta: agents=v1` 与 npm `openai@7.15.0` 存于 `evidence/`。未接真实凭据、未接 service/UI、未改 Core schema、未改既有产品文件。
