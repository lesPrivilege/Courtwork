# 当前基线

更新时间：随清账滚动（以提交史为准；本轮至 2026-07-24）

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
| Chat 附件 | ready 附件的 `readingMarkdown`、粘贴块与用户文本经同源组装逐字进入真实请求；needs_ocr 与空内容以类型级 reason 显式阻断发送；grant 案的 ready 上传还会复用 `admitEntry` → 宿主 hash → `MaterialStore` 入库链 | Composer 的“存入卷宗/资料”`scope` 目前只供 badge，**不参与入库判据**；grant 案会把所有 ready 上传入库，无论用户是否点该按钮。该语义债归 `DEBT-DOSSIER-1`；OCR 与图片多模态仍未接入 |
| Provider 设置 | key 与 provider 配置分离，凭证经宿主钥匙串边界；custom/base URL 猜测入口已退役 | — |
| Provider usage 计量 | 原始 usage（rawUsage 真源）与 cache/reasoning 归一化槽位、unknown 传染、版本化 CostEstimate 经 provider→core Turn 持久→desktop 全链成立并独立验收（`ce37d53`+`91afa57`，报告见 provider ACCEPTANCE） | DeepSeek 真实响应捕获仍阻塞于带 key 环境，fixture 为构造件，不得宣称 external-validated |
| Work 法律场景窄链 | 非 demo grant 案的 production run/replay/resume/cancel、耐久 store、材料绑定与 docx 文件写入链可达；第六轮真机观察到 RiskList、页内引语展开与本案产出目录中的 docx | 这只证明 Legal S3 窄链可达。源码回溯发现：App 忽略非完成 command outcome 后仍可写文书、最后一项或空清单会自动续行且零 confirmed 被当生成错误、以 `ready[0]` 猜主合同、把 ReadingView Markdown 重建成新 docx、生产预览混入固定 demo redline 且来源按钮未接、completed 指针被清；未落点批注的放行只存 React 内存，输出桥还固定 `overwrite:true`。故既有真机记录不证明原 DOCX 保真、真实 redline、耐久 effect 授权、零文书正常终态、历史产物不被覆盖或可追溯闭环；预算、FILE 固定门、质量打分与复验也未闭合，不宣称 Work 全面 product-live / external-validated |

Composer 的“存入卷宗/资料”不是第二条入库能力；现行缺口恰是 UI scope 与既有唯一入库判据脱节，
不得再把它描述成“MaterialStore 尚未接入”，也不得在 `DEBT-DOSSIER-1` 前宣称按钮语义成立。

## 包、契约与已装配能力的诚实边界

- schemas、registry、namespaced package ABI、JSON Schema drift 与 fail-closed 准入；
- provider-independent core、六段 harness、Turn engine、interaction resolver、事件/修订/确认账本和 runtime guard；
- `@courtwork/core/work-protocol`、`@courtwork/core/turn-protocol` 的 browser-safe 子路径；`@courtwork/core` 根出口不具备同一声明；
- citation resolver、coverage 剪枝和 Legal RiskList 的 quote → system anchor 路径；其他部分模型最终 schema 仍直接含 SourceAnchor；
- reading-view 对 docx/md/txt/文本层 PDF 的解析，以及图片/扫描 PDF 的诚实 `needs_ocr`；
- output 包自身的 docx 安全预检、基础修订/批注、起草与字体自动化已成立；`OUTPUT-CORRECTNESS-1` 自动化范围已完成并独立验收（pPr 保留、字体只落触碰 run、既有批注/关系保全与幂等、paragraphHint 真实消费、non-applied 落盘门禁、真实 Vite consumer 与 OOXML part/rel diff 留证，`968a6cc`+`9720d39`，报告 `733bbe6`）。但现行 desktop production consumer 没有把原 DOCX bytes 交给该保真链，而是从 ReadingView Markdown 重建新文档；因此端到端原稿保真尚未成立。Word/WPS 真机 roundtrip 也仍未执行，不得声明 external-validated；
- Legal 垂类包；PM 的 descriptor/schema/presentation 与 catalog fixture，PM 仍无 scenario/prompt/live；
- Work command/store/material/Legal S3 binding 与 Tauri 耐久宿主已接通；`CORE-BUDGET-1`
  实现 `7808426` 的首轮验收抓出 paid preflight 晚于 step 计数，修复 `07ecca5` 已闭合该缺陷。
  独立聚焦复验报告 `8130b39` 实跑定向 124/124、provider 110/110、core 370/370、root
  1291/1291 与六类 mutation，判定 **工单范围逻辑通过**；但受验 clean SHA 的根 lint 仍被票外
  `capture.mjs` 一项 `localStorage no-undef` 阻断，故治理结论仍是“当前 SHA 驳回”，不能启动
  下游。Settings `maxUsd` 也尚未进入 production Work。`CORE-BUDGET-1 → WORK-BUDGET-1` 仍是现行
  P0，不得把范围通过或实现提交写成“架构全链已实现”；
- Tauri 文件、钥匙串、网络与窗口宿主能力；宿主存在不等于 CASE-ROOT 授权事实和材料库已经成立；
- host-owned blueprint、有限可视化原语与 descriptor-driven 通用表；Legal 仍有专用 panel，PM 仍是 catalog-only。

## Demo / fixture 集成

- demo-runtime 已穿越样板材料、Legal artifacts、引用、gate、revision 与 output bundle，只证明包间契约和确定性 fixture 自洽。
- Work UI 的 recording、paced replay、demo gate、demo party adapter 与 demo 原文仍只属于
  fixture/demo mode；非 demo grant 案另有真实 production 路径并已在第六轮试点到达 docx。
  demo 证据不能替代该路径的独立验收、运行预算纠偏或真机复验。
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

下列三项实现已进入 `main`，但现有“回炉放行”由同一验收主体完成，且报告所验目标尖端不是
当前 `main` 的祖先；按现行会话治理，**尚不能列入已清账**。需由不同会话对当前 `main` 独立复验：

- `DEBT-CLEAR-1` + `DEBT-GATE-LABEL-1`：实现已退役零消费接口、预留缝、结构性不可达
  gate label 与死代码；治理复验前只记“已实现待清账”。
- `MD-CONVERGE-1+`：实现已汇流 remark/GFM，并有兼容层与长度/游程守卫；治理复验前不以
  旧 floor 数字替代当前主线实跑。
- `MODEL-CONFIG-EXPLICIT-1`：实现已有六类降级 reason 与可见提示门；治理复验前不以同主体
  回炉记录作为独立放行。

ADR-011/012 已冻结最小 harness 与垂类包/blueprint 边界：不引入第二 agent runtime；企业 SDK 编排只进真实垂类 runtime；新 production blueprint 只能由真实 fixture 与 fail-closed projection 拉动。

## 当前阻断与下一序

严格按[实现就绪图](../architecture/implementation-readiness.md)派发：

1. `FILE-PREVIEW-1`：实现 `86b2282` 与修复 `9f5c165` 已在 `main`；独立报告 `79ddd16`
   已证明本票 A–K、原件零写、定向与完整 327/327 均通过，但受验 `b0f667b` 的
   `site/craft-evidence/VERSIONAL-LANG-3/capture.mjs` 触发全仓 lint `no-undef`，故固定门驳回。
   不重复实现；该外部红由其所有者独立修复并进入 `main` 后，再由新会话聚焦复验方可清账。
2. `CORE-BUDGET-1`（P0，不触 `App.tsx`）：实现 `7808426`、修复 `07ecca5` 与两轮独立报告
   `d6ed1c6`/`8130b39` 均已进入 `main`。聚焦复验证明原 B1 已闭合，范围逻辑通过；但当前 clean
   SHA 的根 lint 与 FILE 票同被 `capture.mjs` 的票外 `localStorage no-undef` 阻断，故尚未治理
   清账。该外部修复进入 `main` 后，由新验收会话在 current-main 重跑 root lint 与必要全门；
   清零前不放行下游。
3. `WORK-BUDGET-1`（P0，触 `App.tsx`）：只在 FILE 与 CORE 两项均独立放行后开工；
   把 Settings 上限与冻结价目真实装入 production Work，并令 runtime/configuration 失败持久可见。
4. `WORK-BUDGET-1` 放行后，按 `CONTRACT-REVIEW-SAFETY-1 →
   CONTRACT-OUTPUT-TRUTH-1 → CONTRACT-TRACE-1` 串行收束本版 Legal 单品：只有完成 outcome
   可落盘；显式选择 DOCX 主合同，至少一项 confirmed 且无待索证项时才从原 bytes 产批注稿，
   零风险/任一待索证（含与 confirmed 混合）/全驳回诚实完成零文书；来源回跳、完成账本与生产
   预览真实同源。
5. `DEBT-DOSSIER-1` 在 CONTRACT-TRACE 后取得 App 槽，闭合 scope 入库判据与真实卷宗计数；
   再依次进入 `C3-1 → C3-2 → C3-3`。C3-4 的预算执法与 flash 价目已前移到预算票，本身只做
   同源可观测出口。
6. `DEBT-CLEAR/GATE-LABEL`、`MD-CONVERGE`、`MODEL-CONFIG-EXPLICIT` 对当前 `main` 做一次
   不同会话治理复验；通过前不计入清账清单，不用旧 target 的绿数替代现行实跑。
7. 真机事实只按 [`pilot-2026-07-17.md`](pilot-2026-07-17.md) 读取：第六轮只证明
   Legal S3→docx 文件写入可达，源码回溯已下调其“引语回跳 / redline / 报告”解释；chat 全链、
   案件持久、材料 fail-closed 仍有实证。六处埋点正式打分、Office roundtrip、签名/公证及本版
   Legal 单品真机回归均未闭合，不据工程绿自动晋级成熟度。

后置但仍真实存在的缺口：`services/ingest` 只有规格，OCR/分类/实体对齐与 HTTP/progress wire 均未实现；正式 macOS Developer ID、公证和升级授权矩阵未完成；企业 identity、ACL、伦理墙、MCP/私域 adapter、scheduled invocation、多写者与跨案图谱属于以后阶段，不得插入本轮 Work live。

架构评估单 `ARCH-SCOPE-2026-07-20`（候选盘点／对外叙事口径／设计体例实况，R-1…R-17 裁决）已随票乙落痕闭合并归档——去处按归档索引的 `arch-scope-2026-07-20.md` 条目定位（索引是归档的唯一入口，故此处不直书归档路径）。其结论已分别进入实现就绪图、`docs/design/` 与 `maturity-claim`／`source-hashes`／ledger target 三道新门；归档件只作历史线索，能力状态仍只认本文件。

`HARNESS-CORE-1` 两份决策材料（Stage A 口径核实与四份 ADR 草案、Stage C 九域功能对照）已随三线收敛落痕闭合并归档——去处按归档索引的 `harness-core-1-stage-a.md` 与 `harness-core-1-stage-c.md` 两条条目定位。四项事实如下：

- **ADR-016（统一填格协议）、ADR-017（受控命令执行）、ADR-018（执行隔离与沙箱）、ADR-019（卷宗容器与本地缓存）四份状态均为 `Accepted`**；ADR-011 同批修订两处（决定二措辞改「不引入自由 shell 与后台执行」、动词集扩集条款）。
- **bash 当期不入界**（ADR-017 决定零）。理由是 pi 范式的安全性外包给容器，取形弃容器等于承接其明确拒绝的风险；work agent 已知场景无一必须任意命令。决定一至七封存为「若入界」的既定受控形态——重启议题须携新必要性证据对该 ADR 提修订，不得从零辩论。
- **执行隔离等级显式停在 `none`**（ADR-018，R-24 裁不实测）。依据是等级—能力绑定：bash 不入界、`TOOL-READ-1` 为 `pure_read`，当前没有任何票需要超出 `none` 的能力面。Seatbelt 实测挂「首个需要超出 `none` 能力面的票」为强制前置——需求拉动，不预研。**这是显式停留，不是未评估。**
- **Stage B 与 Stage C 各票已入实现就绪图**（含 P0 `CORE-BUDGET-1`／
  `WORK-BUDGET-1`、Legal 单品收束三票、`DEBT-DOSSIER-1`、`PERSIST-BACKEND-1`、
  `TOOL-READ-1`、`S6-EXEC-1`、`GATE-INVENTORY-1`、`C3-1`…`C3-5`），各行带裁决坐标、
  依赖与 `App.tsx` 串行约束。入图、实现提交与独立清账是三个不同事实；成熟度仍逐票按本文件
  四节读取。

## 分支与清账纪律

`main` 是唯一长期与发布真源。临时 `codex/*` 分支和 clean worktree 只有在目标 SHA 成为 `main` 祖先、对应 SPEC/ACCEPTANCE 留痕且实现与独立验收都完成后才可删除；未提交工作树不由其他会话代为合入。
