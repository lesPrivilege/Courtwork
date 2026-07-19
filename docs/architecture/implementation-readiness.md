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

**Round 3 收尾序（2026-07-15 拍板；polish 分轮 2026-07-17 修订）**：主线收敛（MATERIAL-INGRESS → LEGAL-S3-BINDING → WORK-LIVE）→ 终局 UI polish 分两轮：**R1 定向修缮**（产品负责人 + Sonnet 手动定向修小问题/对齐；小修批以「全量门绿 + 架构逐 diff 复核」清账，不派独立验收——残留门/设计门/floor 为质量底座，任一回退即退回工单制）→ **R2 巧思视效**（Fable 主导，消费归档调研与素材包，批次独立验收 + Sol 视觉全量扫终审，先例红线见设计 README 与 SITE-CRAFT 判例史）——**R2 供料包已齐（2026-07-18）**：Claude Design 四面设计稿（RiskReviewSurface variant×domain / TimelineGraphSurface / RevisionSurface / WorkCanvasSurface）+ SchemaParts 17 族元素库（token 路径+reduced-motion 内建），设计件非权威、落地逐件过门；变体选型经产品拍板后出批次票→ **一次小发版**：实现 legal 宣言、奠定 UI/UX 基调。其后其他垂类（PM scenario、roleplay 等）与角色面板/pets 类可召唤 preview 均为轻量包级小增量，不触 core。

## Round 4 对齐计划（2026-07-18 拍板，取代简单开工序）

**总纲：coding 暂缓一拍，对齐先行**——五项结构性忧虑（产品负责人提出）逐条对策化；对齐动作完成前，harness 真实化与 polish R2 不放行。

**忧一 · 代码先于架构 → 追认与清偿线**。已知「实现先行」债清单（从审计与试点累积）：Legal 四 panel 硬编码（`PANEL-BLUEPRINT-1`，最大一笔）；S6 执行时序（已裁 desktop 装配点模式，待实现）；chat 附件「存入卷宗」容器化仪式（current.md 已登记非真入库）；interaction actor 写死 `desktop/local-user`；workContextSegment 死参数（SEAL-2③ 在途）。对策：**ARCH-DEBT 裁定会**——架构出全量清单逐笔裁「ADR 追认为正解 / 重构票入队 / 显式容忍留痕」，三选一不悬置。纪律重申为硬门：实现会话引入新跨层面必须先指认 SPEC/ADR 锚点，无锚即 `[需架构拍板]`，验收查锚。

**忧二 · 减法未足 → OSS 减法评估线**。立一次性盘点票 `OSS-SUBTRACT-1`：对全部自研面（md 渲染、diff、图渲染、OOXML、状态管理、E2E 工装等）逐项问「有无 License 合规（MIT/Apache）的成熟件可换」，输出换/不换理由表——**不换的理由同样是资产**（自研加固清单的验证）；换的逐项立票。此后每张 harness 真实化票自带「OSS 候选评估」节（已入纪律）。

**忧三 · 绿≠功能≠架构 → 版级仪式两件**。成熟度枚举与 current.md 唯一口径不变；新增版级收尾仪式：(a) **真机全链回归清单**——试点台账模板化为脚本化 checklist，每版收尾必跑（工程绿只是入场券）；(b) **解耦审计仪式化**——本轮三腿审计（包边界/路由双轨/effect 授权）定为每版收尾动作，新抓口子按 SEAL 模式入票。「机制不对称」教训固化：立门以族为单位铺满。

**忧四 · 调研未充分利用 → 消费率清账**。归档索引已有时效三态；追加**消费状态 pass**：全部「可借形/仍有效」项逐条裁「入票 / 显式不采纳留痕」，不许悬置——已知未消费清单：oss-gui-source-patterns 采收 8 项、emil polish 规则包、namethatui 词典正式并入、SkillsBench 归因协议（SKILL-REFINERY 验收设计）、OWASP Memory Guard 四态（memory 演进 ADR 素材）。pass 结果写回归档索引。

**忧五 · 前端克制被轻视 → 凡例权威化 + 克制审计**。SCHEMA-EXEMPLAR-1 凡例文档尽快进 `docs/design/`（权威层）；R2 每批验收附**克制审计条款**：新增视觉元素必须指认业务语义（风险色阶/落定感/双值锚类），纯装饰默认拒绝；「减法八条」与设计原则是正面资产不是欠账，上游口径同表述。

**执行序**：① SEAL-2/3（在途）→ ② ARCH-DEBT 裁定会 + 调研消费 pass（架构执行）→ ③ OSS-SUBTRACT-1（Sonnet 盘点+架构裁）→ ④ 凡例文档权威化 → ⑤ 放行 harness 真实化线（TOOL-READ-1 → GENERIC-PACK-1/PACK-INTERACT-1/SCENARIO-LIVE-2）与 polish R2。开源纪律与 License 红线（pandoc GPL 拒例）全程适用。

**Rust 重构裁定（2026-07-18）**：节点未到。Rust 边界维持「受控宿主能力」，按需逐点下沉（`scoped_write` 下沉即实例）；全量 Rust 化触 ADR-011 第二 runtime 红线。重启判据：性能实测瓶颈 / 第二宿主真实需求 / TS 层门禁封不住的安全面——满足其一再议。

## Round 5 方向登记（2026-07-18 夜，产品定调，待逐项出票/ADR）

1. **统一填格协议**（chat/work 同规范）：LLM 握手后按 schema 注入的字段填入对应板块——把场景 model 步的「schema 约束输出→校验入格」泛化为 chat 面同规范（chat 轻量产出也走同一协议，非自由渲染）。跨层契约，**ADR 议题**。
2. **四项基础 agent 功能**：reading/edits/writing/bash 采 pi 成熟范式为通用底座基础工具集，其余能力走完全解耦的具名注入（既有论定）。**bash 入界属重大边界变更**：与「减法八条·无任意 shell」直接冲突，必须 ADR 定受控形态（白名单/逐次确认/effect 授权先于执行；沙盒后期）后方可实现——不 ADR 不动手。edits 沿 pi 范式不过度设计；work agent 比 coding agent 更轻。
3. **中间文件缓存**：work agent 中间产物落自身缓存区（case-path「工作稿」分区既有先例），edits 作用于缓存/工作稿，原件只读不变。
4. **本地缓存容器化**：不按 session 分，按 **chat 卷宗（project，待泛化）**——chat-as-dossier 容器同构论（归档已有）升格 ADR 议题；roleplay 同态（前端目录构成规则不同，schema 注入/取用/续行同构，纯编排差异）。session 管理只提供召回入口，默认不展示、不交用户管理；chat/work 形态接近但账本隔离不变。
5. **chat flow 全量适配**：CHAT-MD-TABLE-1 扩为 chat flow 全量单（md 列表/paste 卡片/结构块逐项清点拍板）；thinking 同态引用（chat 留图标 vs work 查看 progress）**先盘后拍**——立 CHAT-FLOW-AUDIT 侦察单（chat/work 两面 flow 详细构成对照），产出交架构拍板。

6. **场景声明交互方案（2026-07-18 夜评估定调）**：层次=包加载（应用级+建案选包）→场景声明（composer 上方文本 Button 排=已加载包场景清单，**现状形态追认为正解**，Button 粒度=场景）→预检表单→运行→表入 tab。**声明前零 schema 字段**：不渲染空表骨架（空骨架是幻觉的 UI 形态），Preview 保持窄态+各 tab 显式指引态（「该工作面由 X 场景产出·从场景按钮启动」）。失败三道闸：预检闸（descriptor 携最低材料要求，不足显式反馈不起跑——**唯一新增契约点，随 GENERIC-PACK-1 拍板**）、运行中闸（既有 OOC/coverage 剪枝，「依据不足」显式态非编造）、文案闸（voice + 守门，零红字技术报文）。

7. **前端全量替换评审门（2026-07-19 拍板）**：序=Design 原型完工 → 三方对比评审（现行前端 / Fable 已完成 Pages 批 / Design 空跑原型），评估全量替换方案与原生 SVG 重绘清单 → 一切落定后 **Fable 执行迁移**（通用层+Pages 巧思，其反 slop 与前卫技法 context 最强）→ 迁移完成的**验收律：新 schema 表由非前沿（甜点档）模型从凡例+元素集+词表缝一次衍生过门**——「schema 自然生长，不依赖最强模型」是终局判据。Fable 已完成的 Pages 批在评审门前**暂缓合入**（作为三方之一参评，不作既成事实）；评审期间门禁全量保持（残留/floor/设计门零豁免）。**范围收窄（2026-07-19 拍板）**：迁移=皮层置换非重写——转移的是用色/字体/版式/SVG 记号系；既有 UX 行为骨架（显影/落定/收拢等成熟交互与残留门锁住的全部行为）**原样保留不抛弃**（成熟感是资产）；行为断言与 e2e 全程不回退即迁移的硬边界。**深色模式顺带交付（2026-07-19 拍板）**：双宗齐备即双主题——产品壳 dark=磁青宗（与站同源），theme 切换=token 层置换（皮层迁移同机制自证）；暗底语义色可读性重校、残留/对比度门双底各跑、数据区静止不因主题而异。

**迁移 Plan 裁决（2026-07-19，四冲突定谳 + B0 批准）**：C-1 字体硬边界修订——产品壳字体随迁移进 MVP 非商用轨（临时授权姿态显式声明既有），红线改挂**发行门**（商用发行前换正式授权或回退系统字），B2 成立；C-2 深色条款胜——tokens.json「浅色唯一」自述与陈旧 principles 引用随 B0 修订；C-3 评审对象定谳为两方（现行含 B1-B3 vs 原型甲/乙），现行壳由 Plan 盘点画像代表，时序矛盾按「B1-B3=增量线」既有厘清定案；C-4 双底=主题级断言（记号 SVG 于 light/dark 双 theme 渲染一致，宗由 theme 承载）。**B0 定值批准**（评审门内零代码）：磁青系 hex/线级 token 规格/五记号 SVG 规格/泥金值——取值源=Design 原型双宗切换实现+架构核定，落 tokens.json 与设计文档；B1 色阶最先、B5 深色最后、B2/B3 可对调条款批准。技法级速裁：朱入语义色预算（与绿双案并测）；文武线属线级组不经 icon 门（扩门另拍板）；原型 gradient/box-shadow 不自动入壳、逐件过克制审计；界行巡行动效拒；floor 只升不变；site 仅同步 token 命名。

**皮层迁移批次账（2026-07-19 立，随批滚动）**：`SKIN-B1`（色阶批）交付链 `8bb305d→0319aa6→f3eeab7→d432e6d`，独立验收一驳回一复验后合入。**B2（字体批）票面**：①排印光学——仿宋视觉字距+中文标点悬挂（奖级工艺 #1，裁定已批、docs 零落地的挂账落位）；②tertiary 元信息可读性闭合——实测 131 消费点字号 10–13px/字重 ≤510，三面对比 4.23/3.98/3.84:1 均低于 AA 正文 4.5:1（B1 如实标注之既存缺口，未回退未闭合）；闭合杠杆=字号/字重升档或值面复审，以 4.5:1 为的，色值单独加深伤中性阶层级非首选；③字体 C-1 非商用轨显式声明（迁移 Plan 裁决既有）；④编排方向随字体策略二次修订（2026-07-19）：标题通行宋体/正文仿宋轨，壳侧落地须与 tertiary AA 闭合**联测**（仿宋实际度量下重测三面对比与字号补偿，不得沿黑体度量宣称）、并过 C-1 发行门口径。**B2 拆批（2026-07-19，排印凡例立）**：事实源=`docs/design/typography-density.md` 排印凡例；B2-0 定值批（争点拍板后开工：字栈/字号槽 token、槽位表值、四道排印机器门、AA 四元联测、许可快照）→ B2-1 置换批（消费面置换+排印光学）；凡例争点一二已拍板（功能轨甲·系统栈续任；文书轨先朱雀仿宋落地、聚珍新仿三许可并行核后 token 层置换），争点三即 B2-0 工作内容——**B2-0 放行**。**B3（线级批）票面**：文武线/乌丝细线 token 已由 B0 定值，消费面置换随本批；奖级工艺 #2 文武线破格同批；**反面警示（原型盘点 2026-07-19）**：原型「乌丝栏」为引语卡框廓装饰件，与层级线同名实异，不得借形。**B4（记号批）票面**：五记号 SVG 落地——鱼尾几何自原型直取、圈点借形改色（琥珀让位语义宣告）、**朱印纯几何无字**（UI 尺寸印文即墨污；hero 级印文变体另案）；朱印落定章接线＝`line.settled` 唯一消费面（前向守卫既装，接线必携落定数据）；奖级工艺 #3 朱印签名交互同批；**新语义两件（盘点采纳 2026-07-19）**：时间轴节点形状=执行者、图谱边样式=事实等级（ADR-003 视觉投影），各带数据绑定前向守卫（无数据之形即违例），边样式先探 G6 canvas 可行性。盘点全文 `docs/design/prototype-audit-2026-07-19.md`（事件件，B4 清账随批归档）；版式两项（卷宗容器为组织单元/产出先入卷再确认）移交容器化 ADR 议题素材，不入 B 批。**B5（深色批）票面**：`themes.dark` 置换；settings-optin 贴阈例复测（残留门注记既有）；深宗四槽（disabled/hairline/strong/focus）实机覆核（B1 诚实后置项）。

**前端线先行（2026-07-19 产品拍板改序）**：B3 线级批 → B4 记号批（壳侧）与 `SITE-CRAFT-2` 磁青宗批（Pages 新设计语言落账 + 前卫实验田部署）先行开工，两线并行（壳/站文件面不相交，deslop-scan-lib 共享面由站批独占）；案头序（ARCH-DEBT/调研消费 pass/OSS-SUBTRACT-1/三 ADR）随后。**对齐计划⑤的门不因改序豁免**：壳侧 R2 巧思回迁与 harness 真实化仍待⑤放行——站面先行、成熟后经 R2 门回迁，正是激进技法的唯一合规通道。**SVG 记号解耦预留（随两线同装）**：SchemaParts 件库为站/稿/壳共用单源，原生 SVG、按 token 名消费不带值；C-4 双主题渲染一致为记号系的主题级断言（宗由 theme 承载，记号不择纸温）——此三条即「回迁 R2 时零重绘」的机器可验形态。

以上七项在对齐计划执行序⑤之后排队；bash/统一协议/容器化三项 ADR 先行，不得实现先于契约。

## 工单边界与退出证据

Round 3 起每张工单附带**复杂度审视义务**（根 CLAUDE.md 复杂度节制条）：实现会话在 SPEC 留痕「本单新增了什么概念、为何非加不可」；并对触碰范围内既有代码做一次复杂度扫描，发现可删的偶然复杂度（死配置、无消费导出、多余抽象）列入该层 SPEC 提案区交架构拍板，不越权顺手删。数单之后全仓即完成一轮复杂度过筛。

**已清账工单**（完整范围与退出证据见各层 SPEC/ACCEPTANCE 与[当前基线](../status/current.md)，本表不再复述）：`WORK-STORE-1`、`HOST-AUTH-LITE`、`CHAT-SESSION-1`、`CHAT-MEMORY-1`、`CASE-ROOT-1`、`MATERIAL-INGRESS-1`、`LEGAL-S3-BINDING-1`、`WORK-LIVE-1`、`WORK-HOST-1`、`USAGE-LEDGER-1`、`UI-SURFACE-1`、`VOICE-SPEC-1`、`DESIGN-MD-1`、`CASE-PERSIST-1`、`OUTPUT-CONFIRM-UI-1`、`SITE-CRAFT-1`、`LAYOUT-CONVERGE-1`、`PILOT-LIVE-1`、`WORK-TURN-1`、`CONFIRM-GRANULARITY-1`、`PILOT-LIVE-2`、`READER-ISOLATION-1`、`PROJECTION-RESUME-1`、`WORK-TURN-2`、`PROVIDER-STREAM-1`、`AUDIT-SEAL-1`、`AUDIT-SEAL-2`、`AUDIT-SEAL-3`、`KEY-PERSIST-1`、`CHAT-MD-TABLE-1`、`CASE-TITLE-CONVERGE-1`。另：`SITE-CRAFT-2` B1-B3 批已架构复核合入（90be976/d9a75aa/617bc24），票面余量（刻本 title 轨/件库续批/前卫实验田）随评审门后续。另：`UI-RESIDUE-1` 批一已清账，下表行仅余批二范围；`WORK-STORE-MEASURE`、`HOST-AUTH-TRUTH`（被 `HOST-AUTH-LITE` 替代）见历史裁定。遗留便利项：voice 词表扩展扫描面（挂便利单）、真实 DeepSeek usage 捕获（见实测表）。

| 工单 | 最小范围 | 退出证据 |
|---|---|---|
| `PM-SCHEMA-1` | 令 OOC score 与确定性计算同义，并版本化 payload/schema/migration；**顺带（2026-07-18 登记）**：凡例 OOC/Estimate 显式件（score=null 出格态/点值/区间三态）设计缺口随本单一并拍板 | OOC、drift、旧版本迁移与 catalog-only 边界触红；不夹带 PM scenario |
| `SITE-CRAFT-2` | Pages 视效升级（对标 trae.ai 级门面，避免被归入普通 repo）。架构定向：不拼通用工艺（渐变/3D 与克制纪律相悖且拼不过预算），高级感由**产品本体的 schema 可视化承担**——hero 升级为活的 schema 工作面微演示（锚点跳转/逐条确认/修订对照的录制回放或轻交互重建，feldar 台账的活化版）；新增动效逐个走 site-evidence-line 例外条款 + AST 锁扩展 + 逐帧采样。供料：Sol 视觉扫 trae.ai 一类站点（computer use）+ Codex image 穷举存货。**范围扩展（2026-07-17 拍板）**：site/ 为个人非商业 Pages，许可口径放宽——归档调研批次的参考技法、小巧思、素材包（vault 余量、emil、feldar、namethatui 等）与**中文陌生化字体**均可经本单升格使用——**字体策略修订（2026-07-18 夜；2026-07-19 二次修订·产品拍板）**：字体编排定位反转——**标题取通行宋体**（成熟、全字重衬线，首选思源宋体类 OFL 大字重轨；「标题用考究的通行衬线」路线，权威感由成熟字形承担；刻本类字形【齐伋体/汇文明朝体/京华老宋体】降为前卫实验田探索项，不入主轨）；**正文取仿宋陌生化轨**——首选方正聚珍新仿（商业字库：个人非商业授权与 web 嵌入授权**分别**核实留快照，任一未核清即以朱雀仿宋 SIL OFL 为落地值，不悬置不静默替换）；**显式拒苹方/系统黑体做正文**（昔日品味符号、今日 slop 分布中心——陌生化正文即 kill-slop 的字体面）；编排义务四条随裁定：仿宋正文字号/行高补偿（仿宋视觉偏小偏窄，AA 联测以实际度量为准）、标题至少双字重梯度、拉丁与数字配衬字显式指定（仿宋拉丁字形弱，不得裸回退）、中文 webfont 子集化+font-display 显式声明；每项字体/素材落 `site/craft-evidence/` 留许可来源快照。**冷色起疑对治五杠杆（2026-07-18 追加定向）**：①阶的作者性——色相收窄、藏青阶做深（暗部层次+纸感+Inset 材质响应），拒绝均匀平铺；②语义色稀缺性**宣告**——红/琥珀仅风险、绿仅落定，站面一行小注明示「色彩仅承载语义」（被宣告的克制才是作者性）；③文书文化抽象引用——卷宗编号体例/骑缝式分隔/印记式落定章；**左侧彩色竖条退役候选（2026-07-18 夜）**：通用色条换文书系记号——鱼尾（节标）、乌丝栏细界行（结构分隔，无彩）、侧点圈点（强调）、朱色专属裁决落定（朱批/朱印语义，彩色只在人做决定处出现），站面先行验证后经 R2 门评估回迁（**抽象引用，法槌天平类具象 kitsch 一律拒**）。**边框语汇裁定（2026-07-19）**：掐边花纹（回纹/云纹/缠枝类）拒——纯装饰且与数据区静止相冲；「边框感」一律走刻本框廓的结构性语汇：**文武线**（粗细双线）与四周双边，几何抽象零具象，站面前卫端先行、产品壳经克制审计再议。**线级语法（2026-07-19 扩展）**：全面替换「均一 1px 单线」的 AI 工具脸——线重即层级语义：主界=文武线（粗细双线错落），次界=乌丝细线，层级不同线重不同（与色阶「阶的作者性」同构，线的粗细携结构信息非装饰）；落 token 化（--rule-major/--rule-minor 类），皮层迁移的版式置换项之一。常见 AI 衬线同理由刻本/仿宋双轨替换（字体策略既有）。**冷暖调和裁定（2026-07-18 夜）**：陌生化统一溯源**版本目录之学**（市面罕见），冷色适配走**磁青纸宗**——写经传统的深靛蓝纸即冷色古典脉，藏青底天然承接；鱼尾/界行/圈点为墨系记号不择纸温；暖色纸感（米黄+衬线=slop 分布中心）明确拒绝；色彩语法四位：磁青为底、墨为记、朱仅裁决、泥金候选 hero 唯一强调（均核实色值入 token 流程）；④秩序件当主角（hero 微演示既有定向）；⑤克制的机器门叙事——「设计克制是 CI 强制的」一句话连 craft-evidence，把克制从美学主张升格为工程事实。**前卫实验田条款（2026-07-18 夜追加）**：site 定位为前端先锋技法实验田——比产品壳更前卫的版式/交互先上站验证，成熟后经 R2 门回迁（Design 四面已证「从现行语言自然生长+版式可穷举」，站面负责探边界）；SchemaParts 件库以**原生 SVG** 绘制（与 Design 稿约定一致），站/稿共用；调研站点全集（vault/emil/feldar/trae/namethatui/geist/oss-gui 等归档批次）全量供料按需取形。**品牌一致性挂账（2026-07-19，B1 分治裁定③）**：B1 已将壳侧权威源稿 `docs/design/icon-light/dark.svg` 随锚迁 217° 换值，`site/assets/icon.svg` 仍持迁移前旧板——品牌两侧暂不一致，随本单磁青宗批一并置换并做品牌一致性核；site 侧色板现由 `deslop-scan-lib.mjs` 的 `siteFrozenColors` 按值冻结（带到期指针，届时整体删除、回绑 token 名）。**硬边界：仅 site/，产品壳字体与素材不随动**（商用授权另案拍板），归档升格以本单票面为准、site 源码仍不得直接引用 archive/ 路径 | 微演示可视对照与逐帧证据；例外条款留痕；site:guard 全绿；数据区绝对静止不破；字体/素材许可快照齐备，产品壳零渗入（静态门可验） |
| `FILE-PREVIEW-1` | **顺带条款（2026-07-17 拍板）**：执行 READER-ISOLATION-1 SPEC 提案区已批准的 rails-compact 四步退役（删 App 派生与 class → 删 CSS → `assert-layout-converge.mjs` 存在锁转「零出现」反向锁 → `data-compact` 消费点转 `right-narrow`）；主体范围如下。md 文档 preview 入口落 working folders：点击文件直接进入只读预览（frontier 同型交互），内容经 reading-view 派生（复用既有 convertToReadingView，原件只读不变）；先 md/txt，docx/文本层 PDF 视 reading-view 既有覆盖顺带 | 点击→预览打开→关闭回基线（残留门约束）；原件零写入；不支持格式显式态非静默 |
| `EXPLORE-RAIL-1` | 右栏新模块 Explore（与 Preview 并列，**不是浏览器**）：从既有 Turn journal 助手回复正文抽取显式 `http(s)` 链接（跳过代码块/provider 地址/用户粘贴内容），展示域名/原始 URL/出现 turn 时间，提供复制、回看该回复与**经受控宿主 openExternal 打开系统浏览器**（2026-07-17 产品定调修订：开链接是既定路线；应用内仍零 `<a>` 直渲、零 `window.open`、零网页加载/DOM/截图/摘要回流，「不是浏览器」边界不变）；零新 core/harness/provider/material 接口（纯 transcript 派生只读索引）。措辞纪律：「agent 提及的链接」，不得表述为已建立连接；不复用 Preview 的 artifact tab 语义；rail 顺序 Progress→Preview→Explore→…；UI 标签过 voice 词表（Explore 为工程名，产品文案中文定名随 voice 规范） | 抽取规则反例（代码块/provider 地址/粘贴内容不入索引）触红；零网络请求（静态门锁 fetch/window.open/href）；回看跳转正确；残留门约束适用 |
| `PREVIEW-TAB-1` | ADR-014 决定一/二：tab 集合按会话 artifact 动态生成（tab=一张 schema 表）、多 artifact 并列、`containerPackBinding` 数组席位（恒 1）；与 Legal panel 迁移解耦，共存语义按 ADR-014 | 多 artifact 动态开 tab、切换不销毁状态（残留门约束）、单 artifact 回退、混包命名空间隔离反例触红 |
| `PANEL-BLUEPRINT-1` | ADR-012 迁移债：Legal 四个 route panel（timeline/graph/matrix/revision）逐个迁为版本化 component blueprint，保留历史 snapshot 回放与 compatibility alias；可分批 | 每迁一个：descriptor→projection 全链、drift/fail-closed 反例、视觉对照记录；App.tsx 对应硬编码分支删除 |
| `UI-RESIDUE-1` | 可逆交互零残留闭合门（架构裁定 2026-07-16：三分区状态矩阵并入本单，同证一个性质；允许单内分批交付，每批独立验收）。批一：`expectNoOverlayResidue()` helper（动画归零/无孤儿 portal/focus 归还/无残留 aria-hidden·inert）+ 全 app 疊层清单纠偏（消费 UI-SURFACE-1-FIX 修正后清单）+ 开合闭合（开→关后像素+DOM+焦点+滚动与基线等价）。批二：三分区状态代数（leftCollapsed/narrowRailRequired/rightCollapsed/focusMode/viewSegment/isWelcome/comparing/右栏双态的合法边与禁止边矩阵）+ 竞态（快速反向/Escape during enter/resize during close/切案切模式无旧区残留）+ 关键交互首帧·中间帧·终帧·反向帧采样。像素基线仅 Chromium 闭环，WKWebView 由 DOM 层兜底。目标措辞：**已枚举状态图内无已知残留/焦点丢失/状态串线/不可逆跳变**（非绝对零 bug 宣称） | 至少一个现存残留缺陷先红测坐实；门禁自身接受 mutation（故意不清 portal/不还 focus/不停动画必须红）；resize 自动收栏不污染用户手动态、focus mode 退出恢复三区、左右同折按原序恢复等矩阵边逐一有测 |
| `GENERIC-PACK-1` | 下一版候选（通用底座补齐线首单，roadmap Stage 1 节 + archive/research-2026-07-15-round-3/generic-base-inventory.md）：通用场景包首批三场景——通用起草→docx（复用 output 流水线，中性 descriptor）/ md↔docx 可编辑往返（自研 OOXML 路径补齐，**pandoc GPL 已拒**）/ 多文件批处理（descriptor 层 fan-out，系统编排非模型自主）。定调：**通用底座即第一个包**——同一插槽/同一 admitPackages 准入/同一凡例表，零绕过 schema 契约的后门；验收律=「只装通用包时产品是合格 work agent」。零新 core 机制预期 | 三场景过既有准入门与凡例表渲染；卸垂类包冒烟（仅通用包）e2e；批处理逐项报告与失败显式；xlsx/pptx/定时/通道均不夹带 |
| `PACK-INTERACT-1` | 下一版候选（包装载真实交互一级，2026-07-18 拍板；与 GENERIC-PACK-1 配对）：①Settings 包管理面——随发行版内置包的启用/停用（状态持久沿版本化单键先例）；②建案时选包——case 级垂类绑定从组合根写死改为建案交互供给（S3 绑定语义不变，绑定来源改用户选择）；③插槽显式空态——未启用垂类包时 Work 面诚实显示「未安装垂类包·通用能力可用」，零伪装零降级。**边界**：包仍随应用发行、构建期 admitPackages 准入不变——本单零动态装载；外部包文件导入（zip→运行时准入→签名/供应链）属二级，ADR-015「包的装载与生命周期」议题入池、需求到来才立 | 启用/停用→Work 面能力集与 tab 集随包切换 e2e；建案选包→绑定正确且跨包命名空间隔离；空态显式（voice 门）；停用不丢已有案件账本 |
| `TOOL-READ-1` | harness 真实化线（L1 受控只读工具，2026-07-17 已批方向、本轮激活；pi 对照调研借形）：Work 对话 turn 可请求**声明式白名单**内的只读工具（首批：读某材料正文/列卷宗清单——复用 resolveForProvider 与 MaterialStore 既有链）；工具白名单静态声明（比照 ScenarioRuntime.toolIds），仅 `pure_read`，零 effect；工具结果进 journal 的形状（toolResult 角色 vs 折叠文本）实现偵察后交拍板再动手；模型不可发现/调用白名单外任何工具；GUI 呼应——工具调用在 Work 画布 trace 区显式呈现（账本条目族） | 白名单外调用拒绝反例触红；pure_read 分级校验（AUDIT-SEAL-1 的全模式门为前置）；工具结果可溯源；stub 链不回退 |
| `ARCHIVE-MANAGE-1` | P1（真机 J 项，设计拍板见台账）：归档案不入侧栏默认视图；Settings「数据管理」面——案件归档区（查看/恢复/删除）+ 会话存档区（查看/删除）；删除留人确认、只删应用侧记录永不触原件、demo 案不可删；**不做旧 session 续行入口**（ADR-013 语义不变）；**召回入口八条采纳（2026-07-19，archive/research-2026-07-15-round-3/session-recall-survey.md）**：非常驻入口/卷宗分组/只读态标注/FTS 查询/原文恒可见/恢复路径唯一显式/删除三件套防呆（二次确认+回收站优先+禁删活跃）/零后台压缩 | 归档案侧栏缺席+Settings 可达；删除确认流 + 原件零触碰断言；demo 不可删反例；残留门适用 |
| `SCHEMA-EXEMPLAR-1` | 收尾拍板（2026-07-17）：schema 契约与 UI 凡例库——以 legal.S3/RiskList 全链为唯一凡例（五列语义/gate 分级/引语锚点回跳/修订映射/未落格确认知悉流），沉淀为新表衍生起点（契约凡例文档 + blueprint 凡例引用）；凡例本身入 polish R2 打磨；目标：新垂类表从凡例衍生 one-shot 过门。与 ADR-012 blueprint 门槛、ADR-014 tab 语义对齐，不新增第二套契约真源。**设计层 one-shot 自证已过（2026-07-18）**：Claude Design 以 RiskReviewSurface+domain 词表缝真渲 PM 事项表，新增视觉件 0、分级门/五列语义跨域同守；如实缺口一条——OOC/Estimate（score=null 出格/点值/区间）为独立语义暂借「待核实」表达，专用件随 PM-SCHEMA-1 拍板补 | 凡例文档落 docs/（权威）；至少一张新表（PM 或阅卷类）从凡例衍生首次过门的实证；准入门/golden 适用 |
| `WORKBUDDY-INTERACTION-BENCH` | 只读研究台（不进权威链）：全量枚举 WorkBuddy 的 sidebar/task/composer/tabs/preview/settings/popover/modal/权限确认/失败恢复交互，按「触发前→动作→过渡可操作性→终态→反向→回基线」六段体例记录（DOM 增删/焦点/三区尺寸/滚动/overlay·aria/动画/Escape·外点·再点/快速反向·resize·切案·中断/reduced-motion 等价反馈）；不复制组件代码 | 行为矩阵 + 截图/逐帧证据入档；作为 UI-RESIDUE-1 枚举完整性输入与失败反例语料；WorkBuddy 非正确性真源的声明留痕 |

## 需要实测，不再泛化调研

| 议题 | 下一份有效证据 |
|---|---|
| Work store | whole-envelope benchmark、CAS 延迟/写放大、kill/crash 与恢复实验 |
| macOS 文件授权 | 完整签名/升级/移动/撤权/TCC 重授权真机矩阵已后置到正式签名发布阶段；`HOST-AUTH-LITE` 只要求失败态可见的最小证据 |
| docx 兼容 | 精确版本的 Word/WPS 打开—轻改—保存—回读及 OOXML part/rel diff |
| DeepSeek usage | 含 cache hit/miss、reasoning 与字段缺失的原始响应 fixture；同批核实前缀缓存是否需显式 breakpoint（Manus 手法，harness-landscape 调研 2026-07-17） |
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
- 为第二宿主复制 App 业务编排、Legal 路由或 core 状态机；
- 引入 handoff 文件、链式引用或 staleness 检测状态机，或让模型自由散文（教训总结、options-considered 自证）直接写入续行投影——续行只认系统编译，模型提案唯一通道是 ask_user→RevisionEvent。

## 后续 ADR 队列

以下问题只有真实需求进入对应阶段时才立 ADR；本轮不预造 ADR-013：

1. authenticated principal、组织身份与 trigger context；
2. gateway 的可序列化 command/event wire、effect authorization 与跨进程恢复；
3. shared state、多写者、ACL、伦理墙与跨案治理容器。

scheduled invocation 必须等待第 1–2 项明确身份、触发来源、预算和执行前授权；当前 trigger-blind executor 不能作为支持证据。
