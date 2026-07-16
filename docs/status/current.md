# 当前基线

更新时间：2026-07-15

文档重整输入基线：`f03e742`

本文件是能力成熟度与发布事实的唯一状态真源；开工依赖见[实现就绪图](../architecture/implementation-readiness.md)。

当前产品阶段：`Stage 0 — 真实 MVP`，尚未满足[产品路线图](../product/roadmap.md)的退出证据。

## 发布真值

- 发布版本：`v0.1.2`；annotated tag object `0c998d45bcc892ac56c8800902659b5ecc78f084`，解引用到 `2fe8bf54dad12f58bccf06a9d692f7c14f65cbd3`。
- Pages：<https://lesprivilege.github.io/Courtwork/>；GitHub Release：<https://github.com/lesPrivilege/Courtwork/releases/tag/v0.1.2>。
- DMG：`Courtwork_0.1.2_aarch64.dmg`，`4,679,277` bytes，SHA-256 `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`；发布后回下载校验通过。
- 制品边界：Apple Silicon、ad-hoc 签名、未 Apple 公证。`codesign`、DMG 完整性与挂载启动通过不等于 Gatekeeper 公证。
- 发布与部署证据：[`release/DEPLOYMENT.md`](../../release/DEPLOYMENT.md)；真机截图清单：[`release/evidence/v0.1.2/README.md`](../../release/evidence/v0.1.2/README.md)。
- `v0.1.2` tag 不含其后的部署实录与文档重整；当前 `main` 继续前进，但不得改写 tag 历史。

## 产品 live

| 能力 | 现行事实 | 未成立边界 |
|---|---|---|
| Chat 文本 | desktop 可用真实 DeepSeek key、受控 transport 与 provider stream 完成文本 Turn；reasoning、正文、usage、失败、取消和刷新回放共享 Turn journal | 只注册 DeepSeek；不能据此宣称任意 OpenAI-compatible provider 已支持 |
| Chat 受控提问 | ask-user 使用 registry 冻结模板、严格回答闭集与系统锚点，UI 与 thinking progress 复用同源 Turn 投影 | interaction actor 仍由 desktop 写死为 `desktop/local-user`，真实 identity dependency 未装配 |
| Chat 附件 | ready 附件的 `readingMarkdown`、粘贴块与用户文本经同源组装逐字进入真实请求；needs_ocr 与空内容以类型级 reason 显式阻断发送；多轮 history 复用组装正文（`6420f50`+`74b5c19`，独立验收 `ab21d6d` 条件放行） | 仅文本阅读正文进请求：MaterialStore、原件 hash、宿主授权、OCR 与图片多模态均未接入；不得宣称超出文本正文的附件理解 |
| Provider 设置 | key 与 provider 配置分离，凭证经宿主钥匙串边界；custom/base URL 猜测入口已退役 | — |
| Provider usage 计量 | 原始 usage（rawUsage 真源）与 cache/reasoning 归一化槽位、unknown 传染、版本化 CostEstimate 经 provider→core Turn 持久→desktop 全链成立并独立验收（`ce37d53`+`91afa57`，报告见 provider ACCEPTANCE） | DeepSeek 真实响应捕获仍阻塞于带 key 环境，fixture 为构造件，不得宣称 external-validated |

Composer 的“存入卷宗/资料”目前是容器化仪式、消息与附件状态迁移，不等于 MaterialStore、原件 hash、宿主授权或 Work materialRef 已持久接入。

## 包与契约成立，但 production 未完全装配

- schemas、registry、namespaced package ABI、JSON Schema drift 与 fail-closed 准入；
- provider-independent core、六段 harness、Turn engine、interaction resolver、事件/修订/确认账本和 runtime guard；
- `@courtwork/core/work-protocol`、`@courtwork/core/turn-protocol` 的 browser-safe 子路径；`@courtwork/core` 根出口不具备同一声明；
- citation resolver、coverage 剪枝和 Legal RiskList 的 quote → system anchor 路径；其他部分模型最终 schema 仍直接含 SourceAnchor；
- reading-view 对 docx/md/txt/文本层 PDF 的解析，以及图片/扫描 PDF 的诚实 `needs_ocr`；
- output 的 docx 安全预检、基础修订/批注、起草与字体自动化；`OUTPUT-CORRECTNESS-1` 自动化范围已完成并独立验收（pPr 保留、字体只落触碰 run、既有批注/关系保全与幂等、paragraphHint 真实消费、non-applied 落盘门禁、真实 Vite consumer 与 OOXML part/rel diff 留证，`968a6cc`+`9720d39`，报告 `733bbe6`）；Word/WPS 真机 roundtrip 仍未执行，不得声明 external-validated；
- Legal 垂类包；PM 的 descriptor/schema/presentation 与 catalog fixture，PM 仍无 scenario/prompt/live；
- Work command/projection 类型、注入缝、Scenario executor 与 Turn 链接；production command/store/material/binding 尚未接通；
- Tauri 文件、钥匙串、网络与窗口宿主能力；宿主存在不等于 CASE-ROOT 授权事实和材料库已经成立；
- host-owned blueprint、有限可视化原语与 descriptor-driven 通用表；Legal 仍有专用 panel，PM 仍是 catalog-only。

## Demo / fixture 集成

- demo-runtime 已穿越样板材料、Legal artifacts、引用、gate、revision 与 output bundle，只证明包间契约和确定性 fixture 自洽。
- Work UI 的 recording、paced replay、demo gate、demo party adapter 与 demo 原文都属于 fixture/demo mode；非 demo case 必须 fail closed，当前 production Work 尚不可达。
- Pages 展示 Legal 合同链、卷宗 `20 / 47 / 14 / 8` 与 PM catalog preview；这些是已校验的展示数据，不把 PM preview 或 demo 工作链升级为 product-live。
- gallery 与十二族可视化样板证明有限原语可编排，不证明每一族已经有 production schema 或真实数据管线。

## 外部兼容验证

- output 已有 golden、ZIP/OOXML 安全反例与包级自动化；2026-07-09 W4 验收在 macOS WPS 对样例做过一次基础打开和视觉抽核。
- 本机当时未安装 Microsoft Word；Word/WPS 双端的打开—轻改—保存—回读、现有 comments/rels 保全、Windows WPS 与精确版本矩阵均未完成。因此完整 Office/WPS P0 仍是缺口。
- `v0.1.2` 远端 DMG 已回下载、校验、只读挂载并直接运行；这证明该开发制品可启动，不证明正式签名、公证、升级后 TCC 或持久文件授权。

## 已发布与已清账工单源流

以下工单均已有实现与异会话验收记录进入提交史或对应 `ACCEPTANCE.md`；表格省并过程叙述，不改变各包 SPEC/ACCEPTANCE 的证据权威。

| 主题 | 已清账工单 |
|---|---|
| Provider / Turn / Chat | `PROVIDER-2`、`TURN-1`、`INTERACTION-1A`、`INTERACTION-1B`、`CHAT-UI-1` |
| Ports / ABI / projection | `HOST-PORT-1`、`CONFIRM-CAS-1`、`ABI-2A`、`CORE-BOUNDARY-1`、`ABI-2B`、`VIEW-ABI-1`、`VIEW-ABI-1C`、`TURN-WORK-1` |
| Work 基础边界 | `WORK-PORT-1`、`WORK-BROWSER-1`、`TRACE-UI-1` |
| 垂类包与最小 harness | `VPKG-META-1`、`PM-PACKAGE-RENAME-1`、`HARNESS-KERNEL-1`、`VPKG-EXPORTS-1`、`PM-FIXTURE-1`、`VPKG-LAYOUT-1` |
| UI / 视觉 / 站点 | `BRAND-1`、`POLISH-P0`、`SCHEMA-POLISH-1`、`DESLOP-GATE-2`、`VISUAL-KIT-1`、`SITE-2A`、`SITE-2B`、`SITE-GEN-1` |
| 发布收口 | 遥测真开关、共享 docx 预检、产物存在后冻结、v0.1.2 build/release/Pages 与独立部署验收 |
| Round 2 P0 | `CHAT-MATERIAL-1`（条件放行，含 history 同源守卫）、`OUTPUT-CORRECTNESS-1`（自动化范围放行，真机 roundtrip 除外） |
| Round 2 独立线 | `USAGE-LEDGER-1`（放行，含 unknown 渲染验收守卫；真实捕获后置） |
| Round 3 | `WORK-STORE-MEASURE`（放行，独立复跑证实尺寸无关与原子替换 0 撕裂）、`HOST-AUTH-LITE`（放行，四类失败 fail-closed 反例触红，真弹窗/真卷卸载为可复现记录非自动化门）、`CHAT-SESSION-1`（架构放行：自身范围全绿，两条红 e2e 经根因复核属 OUTPUT-CONFIRM-UI-1 缺口）、`WORK-STORE-1`（驳回一轮后聚焦复验放行，屏障次序与 scenario_failed 消费点均补齐）、`CASE-ROOT-1`（放行，opaque ref 与 webkitdirectory 退役，含死配置清理）、`SITE-CRAFT-1`（驳回一轮后复验放行；后经部署复核再驳回，FADE 单恢复真实淡入待验收）、`CHAT-MEMORY-1`（放行，ADR-013 全部落地，Chat 线闭环） |

ADR-011/012 已冻结最小 harness 与垂类包/blueprint 边界：不引入第二 agent runtime；企业 SDK 编排只进真实垂类 runtime；新 production blueprint 只能由真实 fixture 与 fail-closed projection 拉动。

## 当前阻断与下一序

严格按[实现就绪图](../architecture/implementation-readiness.md)派发：

1. P0 已清账：`CHAT-MATERIAL-1` 与 `OUTPUT-CORRECTNESS-1` 均已实现并独立验收（见上文产品 live 与包级两节）；Word/WPS 真机 roundtrip 为 output 遗留缺口，另行安排。
2. Work store：`WORK-STORE-MEASURE` 与 `WORK-STORE-1` 均已清账。测量：`b993d8f`（验收 `f91d52e`）。实现：envelope v1 + 全信封 CAS + F_FULLFSYNC 宿主 + executor 六屏障 + `scenario_failed` 终态（`2a34ff3`；首轮驳回 `0876772` 修屏障次序与消费点后 `da911a9` 聚焦复验放行 `75f0734`）。已知边界如实登记：跨 resume 累计预算不实现（RuntimeGuard 按 leg 重置）、ArtifactEnvelope 延后至 `LEGAL-S3-BINDING-1`、软限走 callback 不入账本。
3. 材料链：`HOST-AUTH-LITE` 已清账（`d58701a`+`580e90c`，验收 `1791192`）——系统 picker 最小授权、四类失败（denied/revoked/unavailable/out_of_scope）结构化 fail-closed、renderer 只见 opaque grantId、零新依赖；完整签名/TCC 真机矩阵按 Round 3 拍板后置。`CASE-ROOT-1` 已清账（`2c5470d`，验收 `59c7d12`）——CaseBinding 三态（demo/grant/unbound）、ref=grantId 宿主侧解析、回执剥离绝对路径、webkitdirectory 生产入口零出现（静态门锁定）、跨 case/重授权 fail-closed。下一环 `MATERIAL-INGRESS-1` 可开工：原件 bytes/hash、ReadingView/hash 与 source-neutral MaterialRef 持久闭合。
4. 场景装配：`LEGAL-S3-BINDING-1 → WORK-LIVE-1`。主体输入、真实工具、逐条 gate/revision 与 session 原文绑定未闭合；非 demo 不得接 recording fallback。
5. Chat 线（ADR-013）：**已闭环**。`CHAT-SESSION-1`（`e483236`，架构放行）+ `CHAT-MEMORY-1`（`49d0ef8`，验收 `fc3d9f6` 放行：规则蒸馏携来源坐标、稳定前缀注入、substring 检索 hook、查看+一键清除；案件/密钥隔离与未知版本 fail-closed 反例全部触红；core 注入缝缺省字节等同）。
6. 已根因的产品缺口：desktop 审阅→docx 流缺 non-applied 确认 UI（OUTPUT-CORRECTNESS #6 门禁 fail-closed 正确触发于 demo fixture 的 locator_not_found 指令），致 `rp210:43`/`system-open:12` 两条 e2e 红；此前「环境性/缺 Tauri 宿主桥」归因经复核有误。收口工单 `OUTPUT-CONFIRM-UI-1` 见就绪图。
7. 独立线：`USAGE-LEDGER-1` 已清账（真实 DeepSeek usage 捕获仍待带 key 环境补做）；`PM-SCHEMA-1` 收口 OOC `score=null`、payload 版本与迁移，完成前不得创建 PM scenario。

后置但仍真实存在的缺口：`services/ingest` 只有规格，OCR/分类/实体对齐与 HTTP/progress wire 均未实现；正式 macOS Developer ID、公证和升级授权矩阵未完成；企业 identity、ACL、伦理墙、MCP/私域 adapter、scheduled invocation、多写者与跨案图谱属于以后阶段，不得插入本轮 Work live。

## 分支与清账纪律

`main` 是唯一长期与发布真源。临时 `codex/*` 分支和 clean worktree 只有在目标 SHA 成为 `main` 祖先、对应 SPEC/ACCEPTANCE 留痕且实现与独立验收都完成后才可删除；未提交工作树不由其他会话代为合入。
