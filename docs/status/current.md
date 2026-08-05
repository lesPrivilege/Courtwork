# 当前基线

更新时间：随清账滚动（以提交史为准；本轮至 2026-08-05）

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
| Chat 受控提问 | ask-user 使用 registry 冻结模板、严格回答闭集与系统锚点，UI 与 thinking progress 复用同源 Turn 投影 | interaction actor 仍由 desktop 写死为 `desktop/local-user`，真实 identity dependency 未装配；**生产触发面缺席**——全仓唯一 `requestInteraction` 生产调用点在 demo 模块（`assertDemoCaseId` 与 App 层 `isDemoCase` 双闸，另需 S3+confirmation 在场），非 demo grant 案零触发路径，core 通用封装零生产消费者；本行成立范围=投影/journal/resolve 链路已产品化，不含生产触发（2026-08-04 审计双确认补登记） |
| Chat 附件 | ready 附件的 `readingMarkdown`、粘贴块与用户文本经同源组装逐字进入真实请求；needs_ocr 与空内容以类型级 reason 显式阻断发送。`DEBT-DOSSIER-1` 已闭合入库判据与材料计数同源：grant 案仅 `scope==='dossier'` 且 ready 的附件经唯一 `ingestComposerUploads` 路径入库，message-only 逐字进请求零入库；件数不持久、水合先显式「未读取」再由 `listForCase` 逐案派生，CaseRail／Working folders 徽标与树体／原件列表同源，demo 常量与 production 派生物理分流；chip 文案改未然态（随本条存入卷宗）。实现 `7f4699a`…`e5a3dfa`，验收自修 `56bb556`，no-ff 合入 `51fe6ad` | OCR 与图片多模态仍未接入；Composer 单附件上限维持现状（双 scope 同发结构性不可达，混合批判据由单测穷举，放宽属另一票且需求未实证） |
| Provider 设置 | key 与 provider 配置分离，凭证经宿主钥匙串边界；custom/base URL 猜测入口已退役 | — |
| Provider usage 计量 | 原始 usage（rawUsage 真源）与 cache/reasoning 归一化槽位、unknown 传染经 provider→core Turn 持久→desktop 全链成立并独立验收（`ce37d53`+`91afa57`，报告见 provider ACCEPTANCE）；版本化 `CostEstimate` 住 provider 价目层，生产消费点仅场景线预算护栏（读 `.usd`），Turn 账本零 cost 字段、不经其持久（2026-08-04 审计双确认收窄措辞） | DeepSeek 真实响应捕获仍阻塞于带 key 环境，fixture 为构造件，不得宣称 external-validated |
| 通用 loop 线（dev 形态） | `PI-LANE-1` 已交付读面骨架：Node sidecar 内嵌 `@earendil-works/pi-agent-core@0.82.1`（版本锚定、license 逐包核实），read/grep/glob 三件 scoped 到显式授权文件夹（`ExecutionEnv` 层 fail-closed，写/exec 根本不实现），edit/write/bash 三锁禁用并有 R3 扩描静态红证；dev 入口 `packages/pi-lane/dev`（sidecar 自服务，不入产品包）；预算宿主 `abort()` 真停有测；DeepSeek 为 pi-ai 原生 provider。实现 `51c27b6`，验收 `26d4b2b`，no-ff 合入 `6d7a8eb`。`PI-HOST-LOOP-1`（经 1R…1R7 七轮）已交付 Rust product host：Route A 双件 manifest 核验后 spawn、用户显式凭证 bootstrap、单写 durable journal（append+sync 先于发布、十九 payload 闭集）、crash/quarantine/resume、恢复分相（读/计划纯相＋编码成功后 apply）、session 累计预算、headless read/glob/grep、encode-before-effect 与普适不变量电池（152 行/15 字段）。实现 `f915eea`，验收 `6da6aea`，no-ff 合入 `653c121`。`PI-WRITE-HOST-1`（七段链）已交付 write/workspace 宿主面：cap-std exact `=4.0.2` 逐段 nofollow 下降与 swap-race 收口、TempFile 同目录 replace＋四屏障、`HostRequest` 臂四段账序 encode-before-effect、`md-work-v1` 六条 prompt、双端 golden 锁跨端常量、普适电池 152→220；实现链 `3908333…c2b395d`，验收 `4bd2628`，no-ff 合入 `66862ef` | **仍非产品面**：无生产 GUI，且**无任何生产触发路径**（`PiLoopHost::start/prompt/cancel` 皆 `pub(crate)`、`pi_loop*.rs` 零 `#[tauri::command]`；唯一注册的 `open_workspace_markdown` 因 production 造不出 workspace 而恒返「找不到」）；production decision driver 当期 None ⇒ write 恒 `policy_denied` 显式落账（诚实边界，真 driver 落 GUI/headless 验收）；`PI-BASE-HEADLESS-ACCEPT` 总验未跑；loop 证据出自构造 provider 与 scripted control，**真 key 端到端未验**；agent 称谓门（`PI-BASE-GUI-ACCEPT`）未触发，本行不得外推。**2026-08-05 架构/功能层验收（31 员，非 build 层）四枚在册缺口**：①`active_tool_call` 只存 id 不存工具名、不随 prompt 收束——`PI-READ-TOOLCALL-1` 扩 arm 至四工具时删去「只认 write」结构性绑定却未补等价判据，tool↔capability 现仅 Node 侧独家把守（与「Rust 重算不认对端自报」相悖，账本可自相矛盾）；②裸相对路径在 write 下指 `/workspace`、在 read/glob/grep 下静默指 `/case`，四工具 description 仍单根口径（威胁六格 3/4 判读有效性）；③模型叫出四件外工具名即被判上游违约、非可重试关闭 logical session（六格 cell 6 拒绝面不可跑，与 SPEC §三.1「回灌 `Tool X not found`」承诺相反）；④`cancel` 零调用点、`prompt` 阻塞且无总时限、`decide` 同步跑在同泵内——Stop 与逐次授权在 `PI-LANE-UI-1` 首日即撞并发模型（须 ADR）。`/workspace` 回读与 Gate D（resume 漂移门）已随 `PI-WORKSPACE-READ-1`/`PI-HEADLESS-HARNESS-1` 合入，旧「未实现／缺席」措辞同批订正 |
| Work 法律场景窄链 | 非 demo grant 案的 production run/replay/resume/cancel、耐久 store、材料绑定与 docx 文件写入链可达；第六轮真机观察到 RiskList、页内引语展开与本案产出目录中的 docx。`WORK-BUDGET-1` 已把 Settings 金额上限、冻结 DeepSeek route/价目、累计 budget 与持久失败回放装入同一 production 链并独立放行。`CONTRACT-REVIEW-SAFETY-1` 已闭合显式最终提交（逐条填满不自动 resume）、resolve outcome 检查（非 completed 零写）、durable post-revision 分流、completed 指针耐久与零文书诚实终态（零风险/任一待索证/全驳回），production 编译器退役 waiver 参数（`onNonApplied:'block'` 无条件）；实现 `b9dc1e9`，回归锁 `5f4d90d`，异会话验收 `e473fbb`。`CONTRACT-OUTPUT-TRUTH-1` 已闭合显式选择 DOCX 主合同（退役 `ready[0]`）、一次 readOriginal snapshot 从原 DOCX bytes 产批注稿（退役 ReadingView 重建）、persisted createdAt + session SHA-256 版本化产物名与 atomic no-replace 落盘（退役 `overwrite:true`）、non-applied 与数字签名整份阻断；实现至 `b2ba999`，异会话验收一驳回一聚焦复验放行，合入 `78655bd`。`CONTRACT-TRACE-1` 已闭合真实 SourceAnchor 回跳（fileId 同案重验、`textLayerVersion` + `textRange` 的 block-local 坐标高亮，合法 bbox-only 显式 unsupported）、canonical reader 单调用链（`material-actions` 唯一存活，退役第二 shape 与 quote 搜索）、生产 RiskList 面退役 demo 常量与 disabled 死态（`goto-source` 接通）、会话指针 compare-and-clear 生命周期（candidate 不抢写、durable failed/completed 保留）与 completed 只读重开（仅 inspect=ready 显式重试）；`contractOutputExists` 命名残留随票清理。实现至 `c92cdb0`，异会话验收放行 `3e0a0e5`。 | `DEMO-ANCHOR-1` 已闭合：样板案八锚点携真实 `textRange`+`textLayerVersion`（6 枚可定位回跳、2 枚 statute 引语为刻意展品走显式 `anchor_invalid`→non-applied 诚实降级面）。质量打分、Word/WPS 真机 roundtrip 与版本级真机复验未闭合，仍不宣称 Work 全面 product-live / external-validated |

Composer 的「存入卷宗/资料」自 `DEBT-DOSSIER-1` 起即入库判据本身，badge 是判据投影；
它仍不是第二条入库路径——唯一入库仍经 `ingestComposerUploads`，`fileCount` 已退出 `CaseSummary`（第二真源结构性消除）。

## 包、契约与已装配能力的诚实边界

- schemas、registry、namespaced package ABI、JSON Schema drift 与 fail-closed 准入；
- provider-independent core、六段 harness、Turn engine、interaction resolver、事件/修订/确认账本和 runtime guard；
- `@courtwork/core/work-protocol`、`@courtwork/core/turn-protocol` 的 browser-safe 子路径；`@courtwork/core` 根出口不具备同一声明；
- citation resolver、coverage 剪枝和 Legal RiskList 的 quote → system anchor 路径；其他部分模型最终 schema 仍直接含 SourceAnchor；
- reading-view 对 docx/md/txt/文本层 PDF 的解析，以及图片/扫描 PDF 的诚实 `needs_ocr`；
- output 包自身的 docx 安全预检、基础修订/批注、起草与字体自动化已成立；`OUTPUT-CORRECTNESS-1` 自动化范围已完成并独立验收（pPr 保留、字体只落触碰 run、既有批注/关系保全与幂等、paragraphHint 真实消费、non-applied 落盘门禁、真实 Vite consumer 与 OOXML part/rel diff 留证，`968a6cc`+`9720d39`，报告 `733bbe6`）。`CONTRACT-OUTPUT-TRUTH-1` 后现行 desktop production consumer 已经由同一 `materialId` 一次重读并复验**原始 DOCX bytes**，再交给保真修订链；ReadingView Markdown 重建只留在显式 demo 编译器，不能反向描述 production。自动化链成立仍不等于外部兼容：Word/WPS 打开—轻改—保存—回读与 comments/rels 保全的版本矩阵尚未执行，不得声明 external-validated；
- Legal 垂类包；PM 的 descriptor/schema/presentation 与 catalog fixture，PM 仍无 scenario/prompt/live；
- Work command/store/material/Legal S3 binding 与 Tauri 耐久宿主已接通；`CORE-BUDGET-1`
  实现 `7808426` 的首轮验收抓出 paid preflight 晚于 step 计数，修复 `07ecca5` 已闭合该缺陷。
  `GOVERNANCE-CLEAR-1` 在 `94f83ab` 上以七文件 **123/123**、root **1291/1291** 与 paid
  preflight 三反例完成 current-main 独立清账；旧复验的 124 属历史计数/文件口径漂移，不改写旧
  报告。`WORK-BUDGET-1` 的 production 实现 `a82f51d`、架构台账修正 `0ff83f7` 与异会话验收
  `4e301b5` 已成为 `main` 祖先；六类 production mutation 在实现父 `a82f51d` 独立注入后均红并
  恢复，最终目标 `0ff83f7` 的 build/lint、desktop **465/465**、root **1294/1294**、
  Playwright **333/333** 全绿。成立范围只到 production Work 累计预算、冻结 route/价目与持久
  失败可见，不替代下游 SAFETY/OUTPUT/TRACE；
- Tauri 文件、钥匙串、网络与窗口宿主能力；宿主存在不等于 CASE-ROOT 授权事实和材料库已经成立；
- host-owned blueprint、有限可视化原语与 descriptor-driven 通用表；Legal 四 panel 中 matrix 已迁 `kind:'component'` 全链（ADR-006 修订记录），其余三枚仍为专用 if 链，PM 仍是 catalog-only。

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
| 2026-07-24 current-main 治理清账 | `FILE-PREVIEW-1`、`CORE-BUDGET-1`、`DEBT-CLEAR-1`、`DEBT-GATE-LABEL-1`、`MD-CONVERGE-1+`、`MODEL-CONFIG-EXPLICIT-1R`；报告门 `GOVERNANCE-CLEAR-1` 提交 `9df31d1`，同一 `94f83ab` 上 build/lint、root 1291、desktop 434、Playwright 329/329 与逐票 mutation 全绿；报告分别见 desktop/core `ACCEPTANCE.md` |
| 2026-07-24 production Work 预算 | `WORK-BUDGET-1`：实现 `a82f51d`，台账契约修正 `0ff83f7`，异会话验收 `4e301b5`；最终 desktop 465、root 1294、Playwright 333/333，六类 production mutation 均红后恢复。只放行累计预算/冻结 route/价目/持久失败回放，不扩大为整条合同审查闭环 |
| 2026-07-25 门禁清点 | `GATE-INVENTORY-1`：清点表 `docs/engineering/gate-inventory-1.md`（65 门 / 8557 行，现读现跑非静态推断；旧计数 `8019` 订正为出处保留）。**该组数字是 2026-07-25 的冻结坐标，非现读值**——2026-08-05 于 `2c8fd7b` 重数为 **68 门 / 9981 行**（`apps/desktop/scripts` 54 + `site/scripts` 11 + `release/scripts` 3，命令见清点表五节）；数字随门增删漂移，任何时点的现读值以门自身与该命令为准，本行与清点表只作出处保留。清点期只读边界被遵守，动作按就绪图另立 `GATE-P5-RESCOPE-1` 与 `CI-TOPOLOGY-1` 两票。副产品捕获两项现行问题并经异会话独立复跑坐实：`assert-p5-font-runtime` 判红（exit 1，八条数据位置断言全漂）且未接任何门链、`capture-rp1-compact` 死支（实跑 30s 超时崩溃）。报告内「跨越十余枚提交」一处计数在任一口径下均不成立，已由复测三口径（全仓 69 / `site/` 7 / `site/index.html` 1）订正 |
| 2026-07-26 合同审查安全面 | `CONTRACT-REVIEW-SAFETY-1`：实现 `d24d62b`+`2a16f44`+`b9dc1e9`，fix-by-acceptance 回归锁 `5f4d90d`，异会话验收 `e473fbb`，合入 `05e0ade`。全量门两轮实跑全绿（root 1294、desktop 501、Playwright 337/337），四项指名 mutation 三项原生红证、一项由回归锁补齐。只放行 SAFETY 票面，不及 OUTPUT/TRACE |
| 2026-07-26 合同审查输出真实性 | `CONTRACT-OUTPUT-TRUTH-1`：实现 `95ab19d`…`3171c08` + 修复 `b2ba999`，异会话验收一驳回（三模块白名单缺录、旧产物名残留消费）一聚焦复验放行，合入 `78655bd`；随批 eslint `.claude/**` 微修缮 `c7897d8`（红绿证）。六类 mutation 与四条回归锁逐项红绿，Playwright floor 342→343。只放行 OUTPUT 票面，不及 TRACE |
| 2026-07-27 合同审查来源回跳 | `CONTRACT-TRACE-1`：实现 `24cccb4`…`c92cdb0`（含高水位 2657→2644 同批下调、两处旧断言按本意改写、`work-recovery`/`material-reader` 吸收删除），SPEC 留痕四项偏离与两处白名单外触碰经验收派单件六裁定一追认定谳后交验；五枚真实模块 mutation 红绿（首枚以等价最小扰动形态获准，裁定七），全量门通过（root 1323、desktop 651、Playwright 346/347，唯一红为在册 `E2E-FLAKY-HOVER-1`），floor 343→347；验收报告 `3e0a0e5`，清账 `c9e7b5e`，快进合入。只放行 TRACE 票面（来源回跳／完成账本可重开／production 预览真实同源），不及 DOSSIER |
| 2026-07-27 沙箱探测与绑定门 | `SANDBOX-PROBE-1`：实现 `bdd539a`+`86baa28`（探测报告＋等级—能力绑定门 12 红绿证），架构复核快进合入并独立抽检门绿。成立范围只到 Seatbelt 于 ad-hoc＋hardened runtime `.app` 内的原语可行性与三类双向反例；2026-07-27 曾据此预定的“Rust 自研窄 profile”与 ADR-018 外采纪律冲突，已于 2026-07-28 撤销。当前没有产品沙箱选型，`EXEC-SCRIPT-1` 不排产，隔离等级 `none` 不变 |
| 2026-07-27 入卷语义与计数同源 | `DEBT-DOSSIER-1`：实现 `7f4699a`…`e5a3dfa`（四提交＋命名残留自查清理），异会话验收放行＋fix-by-acceptance `56bb556`（chip 未然态文案、旧字节水合回归锁），no-ff 合入 `51fe6ad`——主线并行前进致快进不可用，no-ff 保全证据锚点。六类 mutation 独立复红，合并 tip 全量门 root 1323、desktop 674 通过；Playwright 数字经 `COMPOSER-SPEC-SYNC-1` 二分订正：验收轮所记 351/351 系**取数后又改文案未重跑**（`56bb556` 自身使其失效），含该提交起的每个 tip 实为 **350/351**，缺口为 `composer.spec` 旧文案断言。微单已修并 no-ff 合入（`4d4c4f7`）；现行 main tip 实测复核 **351/351**（等价链覆盖合入 tip：`3ac4b42..tip` 非 docs diff 为空，复核轮全量门数字见 desktop ACCEPTANCE 订正块下「复核轮」段）——恢复由预期转为实测。floor 347→351、App 高水位 2644→2551。只放行票面（入库判据／计数同源），不及 OCR 与单附件上限 |
| 2026-07-27 Legal panel 首枚迁移 | `PANEL-BLUEPRINT-1` matrix 首枚：实现 `f8e3d0e`+`f3d2bf3`（迁 `kind:'component'` 全链、view 扩形与拒载、`revision` 默认落点收口、外提两模组、高水位 2551→2549），验收一驳回（独立终局缺失）一聚焦复验放行（`1039433`/`b521b34`，复验 350/351 携记名豁免），no-ff 合入 `1b8c450` 后合入 tip 351/351 全绿。三枚 mutation 独立复红；其余三 panel 保持开账 |
| 2026-08-03 App 宣称修正 | `AGENT-CLAIM-CORRECTION-1`：composer 现在时 agent 宣称改「模型可能出错，请核对回复。提供反馈」（mailto 保留）；实现 `673b7b5`、验收 `f622f79`（352/352，floor 观测 352、floor 文件升档随下一张 desktop 票）、no-ff 合入 `11ca7f7`。不赋予 agent 称谓 |
| 2026-08-03 样板案锚点真实化 | `DEMO-ANCHOR-1`：一轮驳回（消费端同步账假绿＋展品误拆）两轮返修后聚焦复验放行；实现 `19435b4→fd93c2b→4db54a1`、复验 `b742f67`（漂移探针咬合红、output-confirm 2/2、351/351、UI 回跳实证）、no-ff 合入 `a141386`。追认三笔：statute 引语改锚合同文本、905-930 合同原句观察、两枚展品恢复＝原锁定设计 |
| 2026-08-03 pi Host loop 收束 | `PI-HOST-LOOP-1`（七轮 1R…1R7）：六轮独立拒绝逐层闭口（十一项→四项→按族→扫描轴→NUL/fail-closed 扫描→encode-before-effect→恢复分相），终以读/计划与 durable apply 分相收束；实现 `f915eea`、回执 `744c070`、验收 `6da6aea` PASS（M7 双臂对照、27/27 patch-id、七 mutation）、no-ff 合入 `653c121`，六轮拒绝报告以 patch-id 等同随链入树。§五冻结后裁定四则（终态 fold 不经 start 落盘等）随票受理。只放行 Host 读面基础，不及 WRITE/GUI/headless 总验。最终 tip `69d6ddc` 全量门实测（2026-08-03，含三票合入）：build/lint/cargo/Playwright 352/352 绿；root pnpm test 1774 过、唯一红为 pi-lane `sidecar.test.ts` 八枚 5s 超时（两独立环境复现、非本批引入，`PI-LANE-SIDECAR-HANG-1` 在册） |
| 2026-08-04 审计批首三票 | `PI-LANE-SIDECAR-HANG-1`：实现 `19d64b9`（八枚无信息悬挂改具名 fail-fast），外部独立验收 PASS `7fd2fba`（双臂区分力实证：tip 于 deny-bind 0.81s 具名 `EPERM` 快红 vs base 40.04s 八枚无信息超时；正常 shell 三轮 10/10），no-ff 合入 `b2422f8`。`OUTPUT-APPLY-FIDELITY-1`：实现 `5220e7c`（整段批注 range pPr 感知插入＋golden 重烤与结构回归锁、replace/delete 重建预审 fail-closed 新状态 `unsupported_existing_markup`、fuzzy 消费定位器 `matchedText` 零痕兜底），外部验收放行携 fix-by-acceptance `0c94b94`（外来 namespace 同名节点拒于重建预审，架构逐 diff 复核收编），no-ff 合入 `ed0123c`。`PI-HOST-JOURNAL-1`（经 1R）：实现 `98467ec`（目录项 fsync 三处＋写侧序号门与 quarantine 显式化＋隔离内容寻址），首轮独立验收 REJECT `bdba10a`——③族只闭 1/4 调用点、born-red 单入口构造，「闭口按族」判例在实现自身复现；返修 `6005bd9` 结构性收束（隔离摘要自读自证消灭「调用方传对切片」整本账、`turn_finished_follows` 读写同真源、验收探针转 permanent），复验 PASS `442cc68`（四入口六探针带 reason 断言、撤修复 M1 六红、共用函数以恒真变异双侧同红证实），no-ff 合入 `62047d5`。合流 tip `62047d5` 全量门实测见分支与清账纪律节。移交架构两项开账：观察②游标二元性（涌现性质非机器自证，建议随 `PI-WRITE-HOST-1` 收敛为单一来源）、观察④ `cost_usd` Disabled 臂（`Some(+inf)` 原样带出且 `format_js_number` 出裸 `inf`，加界属 wire 面）[需架构拍板] |
| 2026-07-27 通用线首件 | `PI-LANE-1`：实现 `51c27b6`（六枚，含 R3 扩描与两处方法错误自纠留痕），验收放行 `26d4b2b`（七件全核、R3 真树注入独立复证、Playwright 350/351 携豁免与两条 flaky 观察），no-ff 合入 `6d7a8eb` 后合入 tip 351/351。未决四题答卷回 ADR-022 补记；包名供应链陷阱经一手核实入 ADR 修订记录。只放行 dev 读面，不及生产挂载与写面 |

ADR-011/012 已冻结最小 harness 与垂类包/blueprint 边界：不自研第二 runtime、不引入编排框架；
ADR-022 的成熟开源 loop 是唯一受控引入线。企业 SDK 编排只进真实垂类 runtime；新 production
blueprint 只能由真实 fixture 与 fail-closed projection 拉动。

## 开工指针

本文件不维护开放工单、并行关系或下一序；这些只认[实现就绪图](../architecture/implementation-readiness.md)。
2026-07-28 的 pi 基础底座优先级重排只改变开工图，不改变本节任何当前能力声明。

真机事实只按 [`pilot-2026-07-17.md`](pilot-2026-07-17.md) 读取：第六轮只证明
Legal S3→docx 文件写入可达，源码回溯已下调其“引语回跳 / redline / 报告”解释；chat 全链、
案件持久、材料 fail-closed 仍有实证。六处埋点正式打分、Office roundtrip、签名/公证及本版
Legal 单品真机回归均未闭合，不据工程绿自动晋级成熟度。

后置但仍真实存在的缺口：`services/ingest` 只有规格，OCR/分类/实体对齐与 HTTP/progress wire 均未实现；正式 macOS Developer ID、公证和升级授权矩阵未完成；企业 identity、ACL、伦理墙、MCP/私域 adapter、scheduled invocation、多写者与跨案图谱属于以后阶段，不得插入本轮 Work live。

架构评估单 `ARCH-SCOPE-2026-07-20`（候选盘点／对外叙事口径／设计体例实况，R-1…R-17 裁决）已随票乙落痕闭合并归档——去处按归档索引的 `arch-scope-2026-07-20.md` 条目定位（索引是归档的唯一入口，故此处不直书归档路径）。其结论已分别进入实现就绪图、`docs/design/` 与 `maturity-claim`／`source-hashes`／ledger target 三道新门；归档件只作历史线索，能力状态仍只认本文件。

`HARNESS-CORE-1` 两份决策材料（Stage A 口径核实与四份 ADR 草案、Stage C 九域功能对照）已随三线收敛落痕闭合并归档——去处按归档索引的 `harness-core-1-stage-a.md` 与 `harness-core-1-stage-c.md` 两条条目定位。四项事实如下：

- **ADR-016（统一填格协议）、ADR-017（受控命令执行）、ADR-018（执行隔离与沙箱）、ADR-019（卷宗容器与本地缓存）四份状态均为 `Accepted`**；ADR-011 同批修订两处（决定二措辞改「不引入自由 shell 与后台执行」、动词集扩集条款）。
- **bash 当前仍不入界**。ADR-017 决定一至八已经启封为“若有真实需求时的受控形态”，但启封契约不等于实现或排产；`EXEC-SCRIPT-1` 仍 parked，自由 shell、后台与 TTY 继续禁止。
- **执行隔离等级显式停在 `none`**。`SANDBOX-PROBE-1` 已证明特定签名条件下 Seatbelt 原语可行，但未选出符合 ADR-018 外采纪律的产品沙箱；曾预定的自研窄 profile 已撤销。后续 host-mediated app-data workspace 是受信 Rust effect 的架构许可，也不构成当前隔离升档。
- **Stage B 与 Stage C 各票已入实现就绪图**（含 P0 `CORE-BUDGET-1`／
  `WORK-BUDGET-1`、Legal 单品收束三票、`DEBT-DOSSIER-1`、`PERSIST-BACKEND-1`、
  `TOOL-READ-1`、`S6-EXEC-1`、`GATE-INVENTORY-1`、`C3-1`…`C3-5`），各行带裁决坐标、
  依赖与 `App.tsx` 串行约束。入图、实现提交与独立清账是三个不同事实；成熟度仍逐票按本文件
  四节读取。

三份架构会话交接件（2026-07-19 / 2026-07-26 / 2026-07-27）在途事项已清零，2026-08-05 由架构角色移入 `archive/`——去处按归档索引的 `status-handoffs-2026-07/handoff-2026-07-19.md`、`status-handoffs-2026-07/handoff-2026-07-26.md`、`status-handoffs-2026-07/handoff-2026-07-27.md` 三条条目定位（索引是归档的唯一入口，故此处不直书归档路径）。三件均只是索引与取舍记录，能力状态本就只认本文件；其中两项须留在册的事实随本次移档前置登记：

- **2026-07-26 件所指的 `docs/status/pending-2026-07-26/` 未提交实物目录已不存在**：该批四件（`ARCH-RULINGS-2026-07-26` / `ADR-DRAFTS-2026-07-26` / `BENCHMARK-OPENWORK-2026-07-26` / `PI-ECOSYSTEM-2026-07-26`）已于 2026-07-27 成文落痕并各自归档，归档索引有对应条目；交接件里指向 pending 目录的路径此后是死指针，不得据以复原。
- **`PI-LANE` 真 key 端到端复核仍未执行**，责任方为产品负责人（持 key 者），复核步骤见 `packages/pi-lane/SPEC.md` 第七节六步，结果另行登记。本条与本文件通用 loop 线行的「真 key 端到端未验」、就绪图 `PI-LANE-1` 行与 `PI-BASE-HEADLESS-ACCEPT` / `PI-BASE-GUI-ACCEPT` 两票的真 key 前置是同一笔债，此处登记以免其唯一来路随交接件归档而失落。

## 分支与清账纪律

`main` 是唯一长期与发布真源。临时 `codex/*` 分支和 clean worktree 只有在目标 SHA 成为 `main` 祖先、对应 SPEC/ACCEPTANCE 留痕且实现与独立验收都完成后才可删除；未提交工作树不由其他会话代为合入。

**在途分支**：`CONTRACT-REVIEW-SAFETY-1` 已于 `e473fbb` 合入 `main` 并清账；
`CONTRACT-OUTPUT-TRUTH-1` 已于 `78655bd` 合入 `main` 并清账（独立验收报告见
`apps/desktop/ACCEPTANCE.md` 与 `packages/output/ACCEPTANCE.md` 对应节）；`CONTRACT-TRACE-1`
已于 `3e0a0e5` 合入 `main` 并清账；`DEBT-DOSSIER-1` 已于 `51fe6ad` **no-ff** 合入并清账
（主线并行前进致快进不可用，no-ff 保全实现与验收提交的证据锚点；独立验收报告见
`apps/desktop/ACCEPTANCE.md` 对应节）；`SANDBOX-PROBE-1` 探测线已于 `86baa28` 快进合入；`COMPOSER-SPEC-SYNC-1` 已于 `4d4c4f7`
no-ff 合入（小修批，架构逐 diff 复核清账）；`PANEL-BLUEPRINT-1` matrix 首枚已于 `1b8c450`、
`PI-LANE-1` 已于 `6d7a8eb` no-ff 合入并清账。`PI-HOST-LOOP-1` 已于 `653c121` no-ff 合入并
清账：`codex/pi-host-loop-1…1r7` 与 `codex/accept-pi-host-loop-1…1r7` 全系分支及其
`/private/tmp` worktree 的内容已以 patch-id 等同随合入链入树，随清账可删。`AGENT-CLAIM-CORRECTION-1` 已于 `11ca7f7`、`DEMO-ANCHOR-1` 已于 `a141386` no-ff 合入并
清账；`worktree-impl+agent-claim-correction-1`、`worktree-demo-anchor-1`、
`codex/accept-agent-claim-correction-1`、`codex/accept-demo-anchor-1` 随清账可删。审计批
首三票已于 2026-08-04 清账合入（链见已清账工单源流表同日行）：`claude/pi-lane-sidecar-hang-1`（tip `7fd2fba`）、`claude/output-apply-fidelity-1`（tip `0c94b94`）、`claude/pi-host-journal-1`（tip `442cc68`）三分支目标 SHA 均已为 `main` 祖先、SPEC/ACCEPTANCE 留痕齐备，随清账可删。当前在途：无实现票。`PI-READ-TOOLCALL-1` 已于 2026-08-05 晨清账合入：pump `ToolStarted` arm 由 write-only 改 `tool_name` 穷举 `match`（无 `_`，`ProductToolName` 加员即编译失败、结构性杜绝缺口再生），四工具皆 arm `active_tool_call`（write take／read peek 分野下游未动）；闭 `PI-WORKSPACE-READ-1` 套件级覆盖洞（5 读臂用例由 Write 顶名转真 Read×3/Glob×1/Grep×1，harness characterization 转正 `headless_workspace_readback_succeeds_after_read_toolcall_fix`）；顺修陈旧辅助门 `verified-node-gate.mjs`（首包 caps 单员→三员，base 亦红）。验收 PASS `b199bc2`（born-red 6 红逆向复现、穷举 E0004 结构证、覆盖洞族核无漏转）／合入 `ca7bf1c`，合并 tip 八相全绿 root **1916**、cargo **236 过/1 忽略**、PW **352**，双制品身份零漂移。**HEADLESS-ACCEPT 六格 3/4/5（/workspace 回读）现代码层可跑**，格 1/2（/case 直读）本就通。

## pi 通用 loop 自足 plumbing 里程碑（2026-08-05）

write＋read＋journal＋headless 合成 harness 全链落地并逐票独立验收合入（`PI-HOST-LOOP-1`→`PI-WRITE-HOST-1`→`PI-WORKSPACE-READ-1`→`PI-HEADLESS-HARNESS-1`→`PI-READ-TOOLCALL-1`），faux-smoke 端到端证（真 Agent read /case→write /workspace→授权→四段账落盘→byte-identical 回读→restart resume 记 md-work-v1）；所有已知覆盖洞闭合。**`PI-BASE-HEADLESS-ACCEPT` 六格矩阵代码层现可跑，唯二前置：真 DeepSeek key（产品负责人提供，SPEC §九:744「无 key/model 证据只能记 external-validated blocked」，非本轮自主可达）＋六格断言随真模型行为首轮迭代。** 此为 loop 线自足版本边界：plumbing 完整可 merge/可 push，agent 称谓门（`PI-BASE-GUI-ACCEPT`）与产品 live 均未据此外推。结转 [需架构拍板]：logicalPath 空串两侧异源、②游标二元性、④`cost_usd` Disabled 臂裸 inf、maxUsd 开启时 retryable 抖动永久关 session（体验待架构复核）。`PI-HEADLESS-HARNESS-1` 已于 2026-08-05 晨清账合入：Gate D 清偿（session_resumed 记实收 promptId/capabilities，循裁定A 扩员，旧档续 valid、wire 零改）＋headless 合成 harness（dev/acceptance-only，provider 可插拔注入、faux 不入 production，ScriptedApprove 显式注入 per ADR-022 六-C，两注入点为唯一 production 偏离；smoke 真跑 write→approve→byte-identical 落盘→restart resume 记 md-work-v1，A×B 合拢）；验收 PASS `b055d7a`／合入 `56559e7`，合并 tip 八相全绿 root **1916**、cargo **236 过/1 忽略**、PW **352**，headless 制品 **554,327 B/`52b65d16…`**（product sidecar 身份零漂移）。**HEADLESS-ACCEPT 尚缺两前置**：①`PI-READ-TOOLCALL-1`——真 Agent 读 `/workspace` 恒 `StateViolation`（`active_tool_call` 只在 Write 臂 arm；兼 `PI-WORKSPACE-READ-1` 套件级覆盖洞：8 读臂用例全 Write 顶名，第四例放行后逃逸），挡六格 3/4/5；②真 DeepSeek key（SPEC §九 亲核：六格须真模型推理，:744「无 key/model 证据只能记 external-validated blocked」，非 faux；faux 只辖 §七自动化门）——须产品负责人提供，非本轮自主可达。**自主可达终点＝plumbing 全链（write+read+journal+harness）merge，faux-smoke 证；真跑六格待 key＋READ-TOOLCALL。**`PI-WORKSPACE-READ-1` 已于 2026-08-05 晨清账合入：实现链 `1117569→06e777b→dbf4d4f→8af1db9`（Node 读面双根路由/Rust 读臂 peek 不 take 零落账/`openWorkspaceMarkdown` 三元组双验/`../workspace` 结构性消除/UTF-8 fail-closed 拒 lossy；wire 零 schema 变更、journal 十九型闭集零变化），独立验收 PASS `17f6822`（九枚变异自施含 M2 复现票面禁形、37 种子独立点算、制品独立重建同一；fix-by-acceptance 一枚反事实注释）→ no-ff 合入 `0c59911`，合并 tip 八相全绿 root **1916/1916**、desktop **690/690**、cargo **232 过/1 忽略**、Playwright **352/352**；sidecar 身份五、六录至 **546,906 B/`36615e5b…`**。验收三上浮登记：Rust `list` grammar 过滤静默 continue 属五-8 家族形状（协调倾向：登记第四员并收窄 SPEC 句，写路径结构性不可达在案；终裁随 env 契约票）；双根同前缀兄弟判据零覆盖（补测建议挂 HEADLESS）；读容器 `fileInfo` 编造三值（当期零消费，登记观察）。**write＋read＋journal 全链落地，`PI-BASE-HEADLESS-ACCEPT` 前置齐备。**`PI-TOOLS-HONESTY-1` 已于 2026-08-05 晨三轮清账合入（定序「须早于 WORKSPACE-READ」经侦察证为工程实质）：实现 `f9cbc26` → 验收 REJECT `fa01eca`（同函数邻行 `MAX_LINE_LENGTH` 行截断证伪本票新全称句）→ 1R `801f522`（可观察性分层：行截断/symlink 甲路出账；grammar 排除结构性不可观察取乙路收窄全称句）→ 复验 REJECT `13eab2e`（第九条丢弃分支：裸 NUL 行于 matcher 前无账压真命中，三臂反例）→ 2R `84b8b7b`（NUL 出账、六类来源闭集、九分支族表进回执双向指回「改此函数先对表」）→ 三验 PASS `0fffdd0`（独立扫描对差**无第十条**、补 `FileKind` 闭三集穷尽性前提；fix-by-acceptance 一枚陈旧数词）→ no-ff 合入 `fb9f578`，合并 tip build/lint 绿、root **1885/1885**、desktop **690/690**、cargo **218 过/1 忽略**、Playwright **352/352**；sidecar 身份随本票**四录三迁**至 **536,123 B/`060cc00a…`**（工具字节即身份，钉值随迁）。挂 `PI-WORKSPACE-READ-1` 收口：容器层三边界（grammar 排除/单条目 lstat/U+FFFD 替换）与 `/case/` 斜杠形态。追认三枚：D13 分层/D16 行粒度/D17 族表（`FileKind` 前提补表）。`PI-WRITE-HOST-1` 已于 2026-08-05 凌晨清账合入：七段链 ①`3908333` ②`32ad737` ③`f9e6a1b` ④`dcbd53f` ⑤`5ba36f1` ⑥`cc81eaa` ⑦`c2b395d`（偏离总账 38＝37 协调追认＋裁定A 待追认——session_started payload 闭集扩员{case-read-v1,md-work-v1}×两能力集、写侧记实况、旧档续 valid），独立验收 PASS `4bd2628`（裁定A 四角变异箱再裁成立、抽样红证全反向复现、制品自验收树源码独立重建同一、fix-by-acceptance 一枚 SPEC §十 订数 469/15；上浮三项：capability 种子计数以验收实测 **40** 为唯一真值、D＝resume 漂移门缺席挂 UI/HEADLESS 开工门、B＝`logicalPath` 空串两侧异源仍 [需架构拍板]），no-ff 合入 `66862ef`，合并 tip 全量门 build/lint 绿、root **1854/1854**、desktop **690/690**、cargo **218 过/1 忽略**、Playwright **352/352**；sidecar 制品身份随本票 `523235 B/75eff9b9…` → **534,219 B/`8520026c…`**（正式根 fail-closed 拒原地覆盖实证一次，处方＝显式 clean snapshot 重建，cargo 复绿）——票面与其余开放票见就绪图（`d6a4cc5`）。`ADMISSION-ENUM-1` 已于 2026-08-04 深夜清账合入：外部实现 `7a2e3c4` → 一相独立验收四发现 → 1R `b5a172c`（直接键镜像判据/ZodStringFormat/visited 生命周期/瞬态结案）→ 复核驳回 `0b16072`（G-1 schema-exemplar 封存哈希缺件致 e2e 链 PW 前短路——「跑了 e2e」≠「跑到 PW」；G-3 anchorField 位置轴：错位锚经 strip 成品零锚点零报错）→ 1R2 `b53d303`（哈希重封存协调授权、同位判据路径交集、G-2 订数）→ 复核 PASS `38fb351`（G-3 双驱证门与消费面同判；共享子 schema 边界措辞 fix-by-acceptance 收窄，误拒向）→ no-ff 合入 `c1837a1`，合并 tip 全量门 build/lint 绿、root **1835/1835**、desktop **690/690**、cargo **174 过/1 忽略**、Playwright **352/352**。`READING-SDT-1` 已于 2026-08-04 夜清账合入：一轮独立验收 REJECT（四道块级直子过滤器只闭两道、合并单元格降级可被 `w:sdt` 包裹旁路）→ 1R 返修 `8f5bf5b`（四级 `LevelGate` 唯一门禁＋命名空间两级判据对齐 `0c94b94`，验收探针 11 枚转 permanent）→ 复验 PASS `aab5d6a`（含 fix-by-acceptance：tbl/tr 两级收编 RANGE_MARKUP＋`tblPrEx`，良性收编三条件入册；专项再攻 13 语料零新增静默丢失）→ no-ff 合入 `7fbd6e5`，合并 tip 全量门 build/lint 绿、root **1814/1814**、desktop **690/690**、cargo **174 过/1 忽略**、Playwright **352/352**。随验收登记：**多 `w:body` 静默丢第二 body 属票前既有同族缺口，候选新票待立**；journal 侧 `logicalPath` 允空与 wire 侧非空两侧异源维持 [需架构拍板]（序②移交）。合流 tip `62047d5` 全量门实测（2026-08-04，覆三票合入）：build/lint/site:guard 绿，root **1794/1794**，desktop **690/690**，cargo **174 过/1 忽略**，Playwright **352/352**。最终 tip 全量门本机复跑已于 2026-08-03 深夜至 08-04 凌晨在 `8d90aa8` 完成（与 `69d6ddc` 只差状态登记提交，同覆三票合入）：build/lint 绿；root **1782/1782**——sidecar 八枚全绿（本轮 shell 实测可 bind；与 `69d6ddc` 轮八枚 5s 超时并观，坐实该红属环境条件红、非树上无条件红，与 HANG-1 票面根因相容）；desktop **690/690**；cargo **167 过/1 忽略**——fresh checkout 缺 `product-sidecar` 制品时 build script 显式拒绝，先 `pnpm --filter @courtwork/pi-lane build:product-sidecar` 后过，制品可复现且身份（523235 B / `75eff9b9…`）与 spec 在册一致；Playwright 一轮 **352/352**。随跑 site:guard 抓出 9 处既往未见命中（deslop 门不在全量门相位，两处来源 `0e50b03`/`12cd201` 均晚于其上次实跑）：ADR-022 六-D 归档链接体例 1 处已改反引号史料体例复绿（`9292aed`）；`packages/pi-lane/dev/index.html` raw-color 8 处已按 OS chrome 钉值先例落具名例外（`ffe6310`，产品负责人 2026-08-04 批）：仅此一文件逐条对值，漂移/新增声明/第二 dev 文件照常红，目录级 skip 变异红绿证在册；site:guard 复全绿，2026-07-27 后首次。各票分支与验收 worktree 随清账删除，
远端仅剩 `main`。合入条款一律「快进或 no-ff 按届时分叉实况定」；Playwright 全链全仓同刻
至多一条（排程律）。
