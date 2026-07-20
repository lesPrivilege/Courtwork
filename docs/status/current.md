# 当前基线

更新时间：随清账滚动（以提交史为准；本轮至 2026-07-20）

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
- 站面更新（2026-07-15）：SITE-CRAFT-1 三巧思上线，Pages workflow run `29488113178` success（head `d1f6563`），两轮上线复核（首轮抓出幽灵过渡驳回、FADE 修复后第二轮逐帧放行，实录见 `release/DEPLOYMENT.md`）；v0.1.2 DMG 资产与 SHA 不变。
- 站面更新（2026-07-20）：版本学双宗上线（Agent/Pages 冷白/磁青双宗、泥金限重要标题与 Hero、深宗截图重摄六枚），Pages workflow run `29711748914` success（head `e0dc4ac`），两轮线上复核通过（light/dark × 1280/375 零溢出零破图、线上资源逐字节同源，实录 `release/evidence/versional-lang-3-2026-07-20/`）；v0.1.2 DMG 资产与 SHA 不变。

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
| 皮层与站面 Round 4 | `SKIN-B1`（`eb9d9b0`）、`SKIN-B2-0`（`75aa55b`）、`SKIN-B2-1`（`06e9bec`）、`SKIN-B3`（`a4bb84b`）、`SKIN-B4`（`95640a3`）、`SITE-CRAFT-2`（`23e2485`）、`CHAT-MD-TABLE-1`+`CASE-TITLE-CONVERGE-1`（`4014d73`）、`SKIN-R2 P0–P5`、`VERSIONAL-LANG-1/2/3` 与两单 overflow 纠偏（链至 `e0dc4ac`，部署实录见发布真值）；e2e floor 276→323，验收与驳回记录在各批 craft-evidence 与 ACCEPTANCE |
| Round 3 | `WORK-STORE-MEASURE`（放行，独立复跑证实尺寸无关与原子替换 0 撕裂）、`HOST-AUTH-LITE`（放行，四类失败 fail-closed 反例触红，真弹窗/真卷卸载为可复现记录非自动化门）、`CHAT-SESSION-1`（架构放行：自身范围全绿，两条红 e2e 经根因复核属 OUTPUT-CONFIRM-UI-1 缺口）、`WORK-STORE-1`（驳回一轮后聚焦复验放行，屏障次序与 scenario_failed 消费点均补齐）、`CASE-ROOT-1`（放行，opaque ref 与 webkitdirectory 退役，含死配置清理）、`SITE-CRAFT-1`（全链闭环：实现→驳回→复验→部署驳回→FADE→验收→两轮上线复核放行）、`CHAT-MEMORY-1`（放行，ADR-013 全部落地，Chat 线闭环）、`OUTPUT-CONFIRM-UI-1`（放行含合并组合，e2e 225/225 历史两红根治）、`MATERIAL-INGRESS-1`（放行，227/227，两项中场裁定经架构追认：就地入库 + MaterialRef desktop-local）、`UI-SURFACE-1`（两轮驳回后终局放行：31+11 对标清单双锚闭合、失败轮次重试接线、七处显式未开通态 + §9 黑名单静态门、疊层清单纠偏为 UI-RESIDUE-1 输入；floor 231）、`DESIGN-MD-1`（放行含产物守卫加固：tokens+principles 编译 courtwork-design.md，drift 门入 site:guard，效果图管线前置约束就位）、`VOICE-SPEC-1`（放行含验收修复：voice.md 成册 + lint:voice 三规则门 + 唯一违例修复；验收中 design-md drift 门咬住 principles 指针漂移并重生成——新门首次真实生效）、`LEGAL-S3-BINDING-1`（放行：S3 生产装配点闭合 + ArtifactEnvelope + 词表统一，ADR-010 七反例重放，package-ready 不扩大宣称）、`LAYOUT-CONVERGE-1`（Grok 四准则审计驳回后修复放行：死支/幽灵列清除、work 单列 760 测宽收缩、welcome 落 560 token，几何实测闭合，floor 255）、`UI-RESIDUE-1 批一`（文档条件驳回补落痕后终局放行：expectNoOverlayResidue + 17 行开合闭合门 + 点击穿透缺陷修复 + 门禁自证 mutation；成立范围严格为已枚举状态图，批二另单）、`WORK-LIVE-1`+`WORK-HOST-1`（各一轮驳回后合并复验放行：rejected 真实路径/确定性崩溃红证/replay 恢复环，主线工程面闭环） |

ADR-011/012 已冻结最小 harness 与垂类包/blueprint 边界：不引入第二 agent runtime；企业 SDK 编排只进真实垂类 runtime；新 production blueprint 只能由真实 fixture 与 fail-closed projection 拉动。

## 当前阻断与下一序

严格按[实现就绪图](../architecture/implementation-readiness.md)派发：

1. P0 已清账：`CHAT-MATERIAL-1` 与 `OUTPUT-CORRECTNESS-1` 均已实现并独立验收（见上文产品 live 与包级两节）；Word/WPS 真机 roundtrip 为 output 遗留缺口，另行安排。
2. Work store：`WORK-STORE-MEASURE` 与 `WORK-STORE-1` 均已清账。测量：`b993d8f`（验收 `f91d52e`）。实现：envelope v1 + 全信封 CAS + F_FULLFSYNC 宿主 + executor 六屏障 + `scenario_failed` 终态（`2a34ff3`；首轮驳回 `0876772` 修屏障次序与消费点后 `da911a9` 聚焦复验放行 `75f0734`）。已知边界如实登记：跨 resume 累计预算不实现（RuntimeGuard 按 leg 重置）、ArtifactEnvelope 延后至 `LEGAL-S3-BINDING-1`、软限走 callback 不入账本。
3. 材料链：`HOST-AUTH-LITE` 已清账（`d58701a`+`580e90c`，验收 `1791192`）——系统 picker 最小授权、四类失败（denied/revoked/unavailable/out_of_scope）结构化 fail-closed、renderer 只见 opaque grantId、零新依赖；完整签名/TCC 真机矩阵按 Round 3 拍板后置。`CASE-ROOT-1` 已清账（`2c5470d`，验收 `59c7d12`）——CaseBinding 三态（demo/grant/unbound）、ref=grantId 宿主侧解析、回执剥离绝对路径、webkitdirectory 生产入口零出现（静态门锁定）、跨 case/重授权 fail-closed。`MATERIAL-INGRESS-1` 已清账（`18ea195`，验收 `a236e36` 含合并组合 227/227）：原件就地只读、元数据+派生 hash 入 app-data 扁平记录、source-neutral MaterialRef（desktop-local，经架构追认与 ADR-010 相容）、`resolveForProvider` 六反例闭合（漂移/删除/needs_ocr/跨案/重启/demo 隔离）——成熟度 package-ready，live 接线归 `LEGAL-S3-BINDING-1`（已解锁，主线倒数第二环）。
4. 场景装配：`LEGAL-S3-BINDING-1` 已清账（`bdbb526`+`e2aff97`，验收 `dcff8ec`）——显式主体/真实工具/live gate/逐条 revision/session 原文绑定/ArtifactEnvelope 首个生产者全部闭合，零 demo 依赖经静态门锁定；成熟度严格 package-ready（未接 UI 运行入口，QCC 适配器 not_implemented 诚实降级）。`WORK-LIVE-1` 与 `WORK-HOST-1` 均已清账（各一轮驳回后合并聚焦复验放行 `1f3e26b`）：production run/replay/resume/cancel 全链 + Tauri 耐久宿主（原子替换 5/5 确定性红证）+ rejected 闭集真实路径 + 切案恢复续行 docx——**Work live 主线工程面全环节闭合**（e2e 258/258）。`CASE-PERSIST-1` 已清账（`9a2c909`，rebase 验收尖端 `6ccbd90` 放行）：案件列表 `case-list.v1` 版本化单键持久（第三次复用先例）、真 reload 三层重建（侧栏/caseBinding/恢复入口）、失效 grant 显式态+移除、demo 不入持久恒挂、建/清对称，e2e 261/261——**真机试点前置全部就绪**。成熟度不扩大：真机试点首轮已执行（2026-07-17，台账 [`pilot-2026-07-17.md`](pilot-2026-07-17.md)）——chat 全链/案件持久/材料 fail-closed 显式态真机成立；四项缺陷入账后经 `PILOT-LIVE-1`（含 FIX，一轮驳回后复验放行 `f04d8e5`）工程面闭合：composer 纯回显改真实请求链（正文入 request body 有断言）、previewOpen 回归修复、材料入口统一 `admitEntry` 准入（文件夹路由建案链）、右栏窄/宽双态与全态居中；e2e 276/276（floor 276），residue 偶红根因（时间戳跨分钟翻字）墙钟归一化根治。四项转**待真机复验**（清单见台账），复验通过前不宣称 product-live/external-validated。s3-launcher「跨重启保留」仅侧栏半边成立，宿主耐久半边随试点复验。
5. Chat 线（ADR-013）：**已闭环**。`CHAT-SESSION-1`（`e483236`，架构放行）+ `CHAT-MEMORY-1`（`49d0ef8`，验收 `fc3d9f6` 放行：规则蒸馏携来源坐标、稳定前缀注入、substring 检索 hook、查看+一键清除；案件/密钥隔离与未知版本 fail-closed 反例全部触红；core 注入缝缺省字节等同）。
6. `OUTPUT-CONFIRM-UI-1` 已清账（`bf64fe5`，验收 `d7bda19` 含合并组合全量门）：non-applied 修订逐条产品语言展示、逐项针对性确认后重编译落盘、取消零产出；根因（risk-02/06 的 basis[0] 为法条正文致 locator_not_found）独立 probe 复现闭环。**历史两红 `rp210:43`/`system-open:12` 首次在全量门转绿，e2e 225/225 零悬案。**
7. 独立线：`USAGE-LEDGER-1` 已清账（真实 DeepSeek usage 捕获仍待带 key 环境补做）；`PM-SCHEMA-1` 收口 OOC `score=null`、payload 版本与迁移，完成前不得创建 PM scenario。
8. `READER-ISOLATION-1` 已清账（`04cf728`，验收 `ac46612` 放行）：demo 语料入口按 `isDemoCase` 隔离，非 demo 案右栏「原件阅读」整块诚实缺席（真实案预览归 `FILE-PREVIEW-1`）；不变量 7 UI 面违规闭合，e2e 278/278（floor 278）。rails-compact 四步退役已批准、执行挂 `FILE-PREVIEW-1` 顺带条款。
9. `PROJECTION-RESUME-1` 已清账（`2f6b43c`，验收 `b31c905` 放行）：续行投影新增「未产出/待执行」三态子节（等待确认/曾失败待重试携 reason/从未开始），从既有 `step_failed`+Turn journal 终态确定性编译，零新事件与 schema 变更；pending 缺省时输出逐字节等同（既有 golden 未重铸为证），稳定前缀不动。诚实边界：interrupted/awaitingConfirmation 生产供给面当前为窄（沿 `pendingGateLabels` 恒空先例登记），工具级失败即刻可见、模型级随账本生效。

后置但仍真实存在的缺口：`services/ingest` 只有规格，OCR/分类/实体对齐与 HTTP/progress wire 均未实现；正式 macOS Developer ID、公证和升级授权矩阵未完成；企业 identity、ACL、伦理墙、MCP/私域 adapter、scheduled invocation、多写者与跨案图谱属于以后阶段，不得插入本轮 Work live。

架构评估单 `ARCH-SCOPE-2026-07-20`（候选盘点／对外叙事口径／设计体例实况，R-1…R-17 裁决）已随票乙落痕闭合并归档——去处按归档索引的 `arch-scope-2026-07-20.md` 条目定位（索引是归档的唯一入口，故此处不直书归档路径）。其结论已分别进入实现就绪图、`docs/design/` 与 `maturity-claim`／`source-hashes`／ledger target 三道新门；归档件只作历史线索，能力状态仍只认本文件。

`HARNESS-CORE-1` 两份决策材料（Stage A 口径核实与四份 ADR 草案、Stage C 九域功能对照）已随三线收敛落痕闭合并归档——去处按归档索引的 `harness-core-1-stage-a.md` 与 `harness-core-1-stage-c.md` 两条条目定位。四项事实如下：

- **ADR-016（统一填格协议）、ADR-017（受控命令执行）、ADR-018（执行隔离与沙箱）、ADR-019（卷宗容器与本地缓存）四份状态均为 `Accepted`**；ADR-011 同批修订两处（决定二措辞改「不引入自由 shell 与后台执行」、动词集扩集条款）。
- **bash 当期不入界**（ADR-017 决定零）。理由是 pi 范式的安全性外包给容器，取形弃容器等于承接其明确拒绝的风险；work agent 已知场景无一必须任意命令。决定一至七封存为「若入界」的既定受控形态——重启议题须携新必要性证据对该 ADR 提修订，不得从零辩论。
- **执行隔离等级显式停在 `none`**（ADR-018，R-24 裁不实测）。依据是等级—能力绑定：bash 不入界、`TOOL-READ-1` 为 `pure_read`，当前没有任何票需要超出 `none` 的能力面。Seatbelt 实测挂「首个需要超出 `none` 能力面的票」为强制前置——需求拉动，不预研。**这是显式停留，不是未评估。**
- **Stage B 与 Stage C 各票已入实现就绪图**（`DEBT-CLEAR-1`／`DEBT-DOSSIER-1`／`DEBT-GATE-LABEL-1`／`MD-CONVERGE-1+`／`PERSIST-BACKEND-1`／`TOOL-READ-1`／`S6-EXEC-1`／`GATE-INVENTORY-1`／`C3-1`…`C3-5`），各行带裁决坐标、`App.tsx` 串行约束与波次。入图不等于已实现——成熟度仍逐票按本文件四节读取。

## 分支与清账纪律

`main` 是唯一长期与发布真源。临时 `codex/*` 分支和 clean worktree 只有在目标 SHA 成为 `main` 祖先、对应 SPEC/ACCEPTANCE 留痕且实现与独立验收都完成后才可删除；未提交工作树不由其他会话代为合入。
