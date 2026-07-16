# 实现就绪图

状态：Round 3 现行开工图（2026-07-15）

本文是 Round 3 的**唯一开工图**：只规定成熟度用语、依赖顺序、验收证据和禁止越界项，不复制完成状态。能力当前是否成立、发布到了哪一枚制品，只认[当前基线](../status/current.md)。跨层字段与语义仍只由 Accepted ADR 拍板。

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

## Round 3 目标链

Round 2 的 P0（`CHAT-MATERIAL-1`、`OUTPUT-CORRECTNESS-1`）已实现并独立验收（见当前基线）。Round 3 经产品负责人拍板：以 `HOST-AUTH-LITE` 替代 `HOST-AUTH-TRUTH` 解冻 Work live 主线（完整签名/TCC/重授权真机矩阵后置到正式签名发布阶段）；Chat 线依 [ADR-013](../decisions/ADR-013-chat-session-and-memory.md) 开工。

```text
Work live 主线
├─ WORK-STORE-MEASURE（已清账）──► WORK-STORE-1
├─ HOST-AUTH-LITE ──► CASE-ROOT-1 ──► MATERIAL-INGRESS-1
└─ MATERIAL-INGRESS-1 ──► LEGAL-S3-BINDING-1 ──► WORK-LIVE-1
                              ▲                       ▲
                              └──── WORK-STORE-1 ─────┘

Chat 线（ADR-013）
└─ CHAT-SESSION-1 ──► CHAT-MEMORY-1

独立契约线
├─ USAGE-LEDGER-1（已清账）
├─ PM-SCHEMA-1
├─ UI-RESIDUE-1
├─ VOICE-SPEC-1
├─ DESIGN-MD-1
└─ SITE-CRAFT-1
```

主线中的箭头是开工依赖，不是建议顺序；前置未独立验收时，后项不得用临时 adapter 越过。Chat 线与 Work 主线互不依赖，可并行施工，但 `CHAT-MEMORY-1` 不得先于 `CHAT-SESSION-1` 的窗口/transcript 语义落地。

**Round 3 收尾序（2026-07-15 拍板）**：主线收敛（MATERIAL-INGRESS → LEGAL-S3-BINDING → WORK-LIVE）→ 终局 UI polish（Fable 巧思回迁 + Sol 视觉全量扫，分工见设计系统 README）→ **一次小发版**：实现 legal 宣言、奠定 UI/UX 基调。其后其他垂类（PM scenario、roleplay 等）与角色面板/pets 类可召唤 preview 均为轻量包级小增量，不触 core。

## 工单边界与退出证据

Round 3 起每张工单附带**复杂度审视义务**（根 CLAUDE.md 复杂度节制条）：实现会话在 SPEC 留痕「本单新增了什么概念、为何非加不可」；并对触碰范围内既有代码做一次复杂度扫描，发现可删的偶然复杂度（死配置、无消费导出、多余抽象）列入该层 SPEC 提案区交架构拍板，不越权顺手删。数单之后全仓即完成一轮复杂度过筛。

| 工单 | 最小范围 | 退出证据 |
|---|---|---|
| `WORK-STORE-1` | 实现 ADR-010 的异步 whole-envelope CAS、终态与迁移。测量已清账（`b993d8f`+`f91d52e`），拍板阈值：大小上限硬 16 MiB / 软 4 MiB、每屏障 ~10ms、归并到 ~6 次 CAS/场景；F_FULLFSYNC 尺寸无关与原子替换 0 撕裂经独立复跑证实，无 WAL 论证成立。跨 resume 累计预算持久化经 Round 3 复杂度拍板**降级为已知边界登记**：单机单写者 MVP 阶段 RuntimeGuard 按 leg 重置可接受，本单不实现 | durable-before-effect 顺序、并发 CAS、重启、崩溃和单 leg runtime limit 反例触红；已知边界在 SPEC 与当前基线如实登记 |
| `HOST-AUTH-LITE` | 最小授权路径：系统 picker 取得授权、happy path 读写成立；拒绝、撤权、卷卸载、路径失效全部显式 fail-closed，不做完整签名/TCC/重授权真机矩阵。架构裁定（2026-07-15）：预批的 persisted-scope 经实现评估**不采用**（仅持久 fs scope、无 grantId→root 解析、需引 fs 底座），宿主自持扁平授权记录，零新依赖；durable ref 形制归 `CASE-ROOT-1` 拍板 | happy path 与每一类失败态都有自动化或可复现记录；任何失败不得静默降级或回落 demo；矩阵后置声明留痕 |
| `CHAT-SESSION-1` | ADR-013 的会话窗口划界（1 小时连续性）、只读 transcript 缓存与跨窗续行；不改 Turn journal 语义 | 窗口边界、跨窗新开、transcript 只读与分叉不涂改均有反例触红；无用户管理入口 |
| `CHAT-MEMORY-1` | ADR-013 的蒸馏写入（携来源坐标）、低频前缀注入、hook 检索与一键清除；案件内容与密钥隔离 | 蒸馏可追溯、清除彻底、注入位于稳定前缀段、案件内容/密钥进入 memory 的反例触红 |
| `CASE-ROOT-1` | 系统 picker、opaque case ref 和 host 授权，不让绝对路径进入 renderer/wire。架构裁定（2026-07-15）：ref 形制复用 HOST-AUTH-LITE 的 `grantId`（宿主自持扁平记录即 durable ref，不新造第二套授权格式）；case 记录持 `grantId` 退役 `folderPath`；`webkitdirectory` 生产入口 ×3 与 renderer 绝对 `case_root` 一并收口 | 取消、TCC 拒绝、卷卸载、重授权和跨 case 访问全部显式失败 |
| `MATERIAL-INGRESS-1` | 原件 bytes/hash、ReadingView/hash 与 source-neutral MaterialRef 持久闭合 | 改字节、删除、需 OCR、hash 漂移、跨 case 引用均在 provider 前阻断 |
| `LEGAL-S3-BINDING-1` | 显式主体、真实工具输入、RiskList gate 与逐条 revision mapping。架构裁定（2026-07-15）：ADR-010 决定三的 `ArtifactEnvelope`（版本化 artifact + 读侧迁移）由本单作为首个真实 artifact 生产者一并拉动，体量过大时拆 `WORK-STORE-2` | 缺主体/工具、revise、单项 reject、demo 依赖注入均按 ADR-010 触红 |
| `WORK-LIVE-1` | production run/replay/resume/cancel，只装配已验收前置 | 真实材料跨重启完成证据—确认—docx 链；recording 消费为零 |
| `USAGE-LEDGER-1` | 保存 provider 原始 usage、unknown 语义、cache/reasoning 计量和版本化估算 | DeepSeek fixture 与缺字段反例可重放；原始计量和派生价格不互相覆盖 |
| `PM-SCHEMA-1` | 令 OOC score 与确定性计算同义，并版本化 payload/schema/migration | OOC、drift、旧版本迁移与 catalog-only 边界触红；不夹带 PM scenario |
| `SITE-CRAFT-2` | Pages 视效升级（对标 trae.ai 级门面，避免被归入普通 repo）。架构定向：不拼通用工艺（渐变/3D 与克制纪律相悖且拼不过预算），高级感由**产品本体的 schema 可视化承担**——hero 升级为活的 schema 工作面微演示（锚点跳转/逐条确认/修订对照的录制回放或轻交互重建，feldar 台账的活化版）；新增动效逐个走 site-evidence-line 例外条款 + AST 锁扩展 + 逐帧采样。供料：Sol 视觉扫 trae.ai 一类站点（computer use）+ Codex image 穷举存货 | 微演示可视对照与逐帧证据；例外条款留痕；site:guard 全绿；数据区绝对静止不破 |
| `UI-SURFACE-1` | 控件面向成熟 agent 产品对齐（对标 Cowork/Codex 类，只做减法）：补齐 Chat/Work 工作面应有的控件全集（停止/重试/复制/引用回跳/会话导航/模型信息等，以实测对标清单为准）；**未接线控件一律显式未开通态**（disabled + 诚实文案），不伪装可用、不造假交互；零新依赖，全落设计语言 | 对标清单留痕（哪些取/哪些减及理由）；每个未开通控件有显式态测试；已接线控件行为测试；四设计门与残留门约束适用 |
| `VOICE-SPEC-1` | 文案规范入设计系统：动作命名动词+名词、错误文案「发生了什么+下一步」、toast 禁「成功」、进行态与空态体例；与「零技术概念暴露」合并成 `docs/design/voice.md`，可机器断言条款转静态门 | 规范文档 + UI 字符串静态扫描门（扫 `apps/desktop/src`）；注入违例文案（裸「确认」、「成功删除」）触红。架构 2026-07-17 追加：垂类 `presentation` 词表纳入 `lint:voice` 扫描面**已批准但后置**——先待 `LEGAL-S3-BINDING-1` 统一 legal 词表 `需 OCR`→`需文字识别`（连带 `VPKG-LAYOUT-1` golden 重算）落地，再一行 glob 扩展扫描面（否则门立刻红在已批的待修项上）；扩展挂便利单顺带做 |
| `DESIGN-MD-1` | 从 `tokens.json` + `principles.md` 编译机器可读 `courtwork-design.md` 供效果图生成管线前置约束；编译件非权威，tokens.json 仍是唯一真值 | 编译脚本 + drift 门（tokens 变更未重编译触红）；不新增手写第二份 token 真值 |
| `PREVIEW-TAB-1` | ADR-014 决定一/二：tab 集合按会话 artifact 动态生成（tab=一张 schema 表）、多 artifact 并列、`containerPackBinding` 数组席位（恒 1）；与 Legal panel 迁移解耦，共存语义按 ADR-014 | 多 artifact 动态开 tab、切换不销毁状态（残留门约束）、单 artifact 回退、混包命名空间隔离反例触红 |
| `PANEL-BLUEPRINT-1` | ADR-012 迁移债：Legal 四个 route panel（timeline/graph/matrix/revision）逐个迁为版本化 component blueprint，保留历史 snapshot 回放与 compatibility alias；可分批 | 每迁一个：descriptor→projection 全链、drift/fail-closed 反例、视觉对照记录；App.tsx 对应硬编码分支删除 |
| `OUTPUT-CONFIRM-UI-1` | desktop 审阅→docx 流补齐 OUTPUT-CORRECTNESS #6 的产品侧确认：non-applied 指令逐条显式展示 + 针对性确认后落盘（复用 output 包既有 `onNonApplied:'confirm'`+`confirmNonApplied` API，CLI demo 已有同流可参照）；根因台账：`rp210:43`/`system-open:12` 两条 e2e 红即此缺口（此前「环境性/缺宿主桥」归因有误，f38c17a 门禁行为正确、产品确认 UI 缺席） | 两条 e2e 转绿（流程含确认步）；非 demo 语义不变；确认 UI 逐条不整批、遵守留人确认与设计语言 |
| `SITE-CRAFT-1` | Pages 站三处巧思（vault 技法，MIT）：Typer 逐字显影 hero、Inset/Satin 材质 CTA、Ghosty reveal 截图显影；色彩全落藏青派生阶，全部尊重 prefers-reduced-motion。架构裁定（2026-07-15 三修，终局）：reduced-motion 退化恢复为**真实渲染的 opacity 淡入**（用 keyframe 而非 transition 实现，规避同帧赋类跳变；淡入属 reduce 语境公认可接受的非位移动效）；无论形态，**幽灵过渡**（属性在跑但视觉不可见，如 mask:none 下的 mask-position transition）一律违规，reduce 块必须显式中和基础过渡；声称与逐帧实测必须一致。只进 site/，不回迁产品壳 | 三落点可视对照记录（前后截图）；reduced-motion 退化逐帧实测与声称一致；site:guard 与既有 Pages 门全绿；零新构建依赖 |
| `UI-RESIDUE-1` | 可逆交互零残留闭合门（架构裁定 2026-07-16：三分区状态矩阵并入本单，同证一个性质；允许单内分批交付，每批独立验收）。批一：`expectNoOverlayResidue()` helper（动画归零/无孤儿 portal/focus 归还/无残留 aria-hidden·inert）+ 全 app 疊层清单纠偏（消费 UI-SURFACE-1-FIX 修正后清单）+ 开合闭合（开→关后像素+DOM+焦点+滚动与基线等价）。批二：三分区状态代数（leftCollapsed/narrowRailRequired/rightCollapsed/focusMode/viewSegment/isWelcome/comparing/右栏双态的合法边与禁止边矩阵）+ 竞态（快速反向/Escape during enter/resize during close/切案切模式无旧区残留）+ 关键交互首帧·中间帧·终帧·反向帧采样。像素基线仅 Chromium 闭环，WKWebView 由 DOM 层兜底。目标措辞：**已枚举状态图内无已知残留/焦点丢失/状态串线/不可逆跳变**（非绝对零 bug 宣称） | 至少一个现存残留缺陷先红测坐实；门禁自身接受 mutation（故意不清 portal/不还 focus/不停动画必须红）；resize 自动收栏不污染用户手动态、focus mode 退出恢复三区、左右同折按原序恢复等矩阵边逐一有测 |
| `WORKBUDDY-INTERACTION-BENCH` | 只读研究台（不进权威链）：全量枚举 WorkBuddy 的 sidebar/task/composer/tabs/preview/settings/popover/modal/权限确认/失败恢复交互，按「触发前→动作→过渡可操作性→终态→反向→回基线」六段体例记录（DOM 增删/焦点/三区尺寸/滚动/overlay·aria/动画/Escape·外点·再点/快速反向·resize·切案·中断/reduced-motion 等价反馈）；不复制组件代码 | 行为矩阵 + 截图/逐帧证据入档；作为 UI-RESIDUE-1 枚举完整性输入与失败反例语料；WorkBuddy 非正确性真源的声明留痕 |

## 需要实测，不再泛化调研

| 议题 | 下一份有效证据 |
|---|---|
| Work store | whole-envelope benchmark、CAS 延迟/写放大、kill/crash 与恢复实验 |
| macOS 文件授权 | 完整签名/升级/移动/撤权/TCC 重授权真机矩阵已后置到正式签名发布阶段；`HOST-AUTH-LITE` 只要求失败态可见的最小证据 |
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
