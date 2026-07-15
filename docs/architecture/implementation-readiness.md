# 实现就绪图

状态：Round 2 现行开工图（2026-07-15）

本文是 Round 2 的**唯一开工图**：只规定成熟度用语、依赖顺序、验收证据和禁止越界项，不复制完成状态。能力当前是否成立、发布到了哪一枚制品，只认[当前基线](../status/current.md)。跨层字段与语义仍只由 Accepted ADR 拍板。

## 成熟度枚举

每条能力声明必须选用下列一个最窄标签；标签不是自动晋级阶梯，`released` 也不会把其中依赖的能力一并变成 product-live。

| 标签 | 可声明的证据边界 |
|---|---|
| `product-live` | 真实用户输入经过正式 composition 运行；不读取 fixture、recording 或 demo fallback |
| `package-ready` | 包内实现、公开出口与机器门成立，但尚未证明宿主 production 链已装配 |
| `demo-integrated` | fixture/demo 链能跨包运行，只证明契约自洽 |
| `contract-only` | 类型、port、schema、ADR 或 SPEC 已定义，production 实现尚未成立 |
| `external-validated` | 在明确版本、系统与输入输出证据下通过真实外部软件、宿主或数据源验证 |
| `released` | 精确代码和资产进入指定 tag、Release 或 Pages；不扩大其运行能力 |

## 开工时读取成熟度

能力事实只从[当前基线](../status/current.md)的“产品 live / 包与契约 / Demo / 外部兼容”四节读取，再按上表映射标签；本图不保存任何能力快照。工单完成后只更新当前基线和对应 SPEC/ACCEPTANCE，不在本节补写“已完成”清单。

## Round 2 目标链

```text
P0 真实性修复
├─ CHAT-MATERIAL-1
└─ OUTPUT-CORRECTNESS-1

Work live 主线
├─ WORK-STORE-MEASURE ──► WORK-STORE-1
├─ HOST-AUTH-TRUTH ──► CASE-ROOT-1 ──► MATERIAL-INGRESS-1
└─ MATERIAL-INGRESS-1 ──► LEGAL-S3-BINDING-1 ──► WORK-LIVE-1
                              ▲                       ▲
                              └──── WORK-STORE-1 ─────┘

独立契约线
├─ USAGE-LEDGER-1
└─ PM-SCHEMA-1
```

`CHAT-MATERIAL-1` 与 `OUTPUT-CORRECTNESS-1` 是 P0，不因 Work 主线较长而后置。主线中的箭头是开工依赖，不是建议顺序；前置未独立验收时，后项不得用临时 adapter 越过。

`OUTPUT-CORRECTNESS-1` 不阻塞 Work store、材料或 Legal binding 的独立施工，但必须在 `WORK-LIVE-1` 退出验收前放行；否则不能交付该工单所承诺的“确认 → docx”终链。

## 工单边界与退出证据

| 工单 | 最小范围 | 退出证据 |
|---|---|---|
| `CHAT-MATERIAL-1` | 让已就绪附件的阅读内容与粘贴块（pasteBlocks）真实进入 Chat 请求；失败、需 OCR 与空内容显式阻断，回显路径与请求路径不得漂移 | 捕获真实请求证明逐字内容存在，附件占位符不能让模型调用成功 |
| `OUTPUT-CORRECTNESS-1` | 收口现行 output P0 结构与非应用指令语义 | 包门、Vite consumer、OOXML diff 和 Word/WPS 记录共同通过；细则见 output SPEC |
| `WORK-STORE-MEASURE` | 在不换存储形状前测 whole-envelope 的 bytes、CAS latency、write count 与崩溃窗口 | 真实或上界 fixture 的可复现实验、阈值和系统调用证据；不产新存储架构 |
| `WORK-STORE-1` | 实现 ADR-010 的异步 whole-envelope CAS、终态、迁移与累计预算 | durable-before-effect 顺序、并发 CAS、重启、崩溃和 runtime limit 反例触红 |
| `HOST-AUTH-TRUTH` | 建立 macOS 签名/TCC/重授权事实矩阵 | 精确签名形态、系统版本、路径来源、拒绝/撤权/升级行为均有真机记录 |
| `CASE-ROOT-1` | 系统 picker、opaque case ref 和 host 授权，不让绝对路径进入 renderer/wire | 取消、TCC 拒绝、卷卸载、重授权和跨 case 访问全部显式失败 |
| `MATERIAL-INGRESS-1` | 原件 bytes/hash、ReadingView/hash 与 source-neutral MaterialRef 持久闭合 | 改字节、删除、需 OCR、hash 漂移、跨 case 引用均在 provider 前阻断 |
| `LEGAL-S3-BINDING-1` | 显式主体、真实工具输入、RiskList gate 与逐条 revision mapping | 缺主体/工具、revise、单项 reject、demo 依赖注入均按 ADR-010 触红 |
| `WORK-LIVE-1` | production run/replay/resume/cancel，只装配已验收前置 | 真实材料跨重启完成证据—确认—docx 链；recording 消费为零 |
| `USAGE-LEDGER-1` | 保存 provider 原始 usage、unknown 语义、cache/reasoning 计量和版本化估算 | DeepSeek fixture 与缺字段反例可重放；原始计量和派生价格不互相覆盖 |
| `PM-SCHEMA-1` | 令 OOC score 与确定性计算同义，并版本化 payload/schema/migration | OOC、drift、旧版本迁移与 catalog-only 边界触红；不夹带 PM scenario |

## 需要实测，不再泛化调研

| 议题 | 下一份有效证据 |
|---|---|
| Work store | whole-envelope benchmark、CAS 延迟/写放大、kill/crash 与恢复实验 |
| macOS 文件授权 | 签名、升级、移动/撤权、TCC 与重授权真机矩阵 |
| docx 兼容 | 精确版本的 Word/WPS 打开—轻改—保存—回读及 OOXML part/rel diff |
| DeepSeek usage | 含 cache hit/miss、reasoning 与字段缺失的原始响应 fixture |
| 法律扫描件 | 经授权且脱敏的真实锚点；许可、用途与不入仓证据齐备 |

继续收集通用文章不能替代这些实验。若外部环境或合法样本尚不可得，工单应明确阻塞，不得用合成材料宣称 external-validated。

## Effect 与授权

存在 confirmation gate 不代表 gate 之前的 side effect 获得授权。每一笔 `external_send`、`file_write` 或改变权限的 effect 都必须在执行前取得与该 effect、scope、actor 和输入快照对应的授权，并把授权决定持久化在 effect 之前。事后弹窗、场景终局确认或笼统的 session always-allow 都不能追认已经发生的动作。

## 明确拒绝

- 在未有实测阈值前把 v1 whole-envelope CAS 改成 snapshot + tail，或自行手写 WAL；
- 借 Work store 工单偷渡 scheduled invocation、多写者、跨案图谱或远程 backend；
- 让非 demo case 回退 recording、demo material、demo party adapter 或 demo docx 原文；
- 把 runtime guard 按 start/resume leg 重置，或把超限留成裸 Promise rejection；
- 先执行 effect，再用后置 gate、日志或人工确认追认；
- 因 executor 对 trigger 不敏感就宣称支持 scheduled、webhook 或通道调用；
- 为第二宿主复制 App 业务编排、Legal 路由或 core 状态机。

## 后续 ADR 队列

以下问题只有真实需求进入对应阶段时才立 ADR；本轮不预造 ADR-013：

1. authenticated principal、组织身份与 trigger context；
2. gateway 的可序列化 command/event wire、effect authorization 与跨进程恢复；
3. shared state、多写者、ACL、伦理墙与跨案治理容器。

scheduled invocation 必须等待第 1–2 项明确身份、触发来源、预算和执行前授权；当前 trigger-blind executor 不能作为支持证据。
