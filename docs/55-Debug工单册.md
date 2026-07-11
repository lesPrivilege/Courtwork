# Debug 阶段工单册（2026-07-11 开册）

docs/11 为全项目总账；Debug 阶段（0.1.x 真机迭代）单据入本册，docs/11 留指针。判例与裁决仍落各权威 ADR。

## FIX-KC-1 凭证授权流修复（Grok，据 DBG-2 回报，架构已拍板）

```
你认领 Courtwork 的 FIX-KC-1：真机凭证授权流修复。依据：DBG-2 诊断（H1 ad-hoc CDHash/ACL 漂移主因成立、H3 错误折叠放大器、H2 双条目为放大副因、H4 环境共因）。架构批准五件合施，均在凭证 Rust/TS 热点内：

1. DBG-2.1 trace 日志（照诊断提案 5.2–5.4 规格）：KeychainOp/KeychainFailKind 内部枚举；点位=启动一次（cdhash/签名态）+ 每次 get/set/delete + credential_status/save 出口；一行 JSON 落 ~/Library/Logs/cn.courtwork.desktop/credential-probe.log，轮转 1MB；默认关闭，env COURTWORK_CRED_TRACE=1 开启；永不记录 secret/source 值/环境变量值；断言测试：日志路径全内容无 key 子串（docs/27 红线）。
2. F2 止血：save 路径改 delete_credential（忽略 NoEntry）→ set_password，整组重写，强制当前身份新建 ACL。
3. F4 错误分型：KeychainFailKind 从 KeyringError 的 source()/Display 解析 OSStatus（-128 canceled / -25293 auth_failed / -25315 no_access / -25308 interaction_not_allowed / NoStorageAccess / platform_other{os_status}）；诊断导出增 credentialFailKind 字段（无密钥、枚举值）；UI 文案按分型映射（照 DBG-2 F4 提案三句），对外保持零技术概念。
4. F5 恢复路径：设置页连接失败态辅助文案——H4 钥匙串密码指引 + 手动删除 cn.courtwork.desktop.provider 两项的指引（照 DBG-2 用户侧文案，文案级不改存储语义）。
5. F6 dev 隔离（显式批准的行为变更）：dev 构建 service 加后缀 .dev（cn.courtwork.desktop.provider.dev），防 dev 污染发行 ACL；判定方式用编译期 cfg/debug_assertions，不引运行时配置。

不做：F1 Developer ID 签名（用户手动项：证书就位后随 BUILD-2）；F3 单条目合并（后置）。

测试：Rust 分型解析单测（构造 OSStatus 样例）；TS mock 三态与文案映射；e2e failed 态文案呈现；trace 开关默认关断言；全门禁 + floor 禁降。显式路径提交，完工报告附：真机采集剧本（照 DBG-2 5.5，用户跑一轮回传 credential-probe.log + codesign 输出）。
```

## RP-2 增补条款（并入既有 RP-2 单，实施时同批）

批次四增补 #18′/#23/#24（docs/52）+ docs/49 四章再修：provider chip 归 composer 发送旁（状态条撤模型名）；双侧折叠钮 + 展开钮驻原位/收敛 bar；三列纵向贯通；composer 下声明与 feedback 小字（英文）。e2e 增：折叠往返、chip 三态在 composer 位、小字存在且不夺焦。

## RP-2 扩编转任命：UI 完全化（sol / Codex GPT-5.6，computer use）

```
你（sol）认领 Courtwork 的 RP-2/UI 完全化单（架构任命，B 阶段 UI 岗回归）。目标：参照 frontier work 界面把 UI 做全——用户会提供 frontier 截图作像素参照，你用 computer use 对自己的 build 截图对照自查，先做全再做细。前置：BUILD-1 已出 0.1.0；FIX-KC-1（凭证热点）可能并行在途，勿碰凭证 Rust/TS 文件。

必读：CLAUDE.md → docs/49 全章（含四章两次修正：声明位归 composer）→ docs/52 批次四全量（#18′–#26）→ docs/32 tokens/motion ladder → apps/desktop/SPEC.md。读完复述范围。

范围（批次四全量）：
1. #18′ provider chip 归 composer 下缘发送键旁：探针三态（connected=模型名·强度/failed=琥珀连接失败/pending=待连接），点开唯一 model-config popover；状态条撤模型名；假态零容忍 e2e。
2. #19 层级：wordmark 全 app 唯一；卷宗标题迁中栏 chat 区上方案件头（自动命名+行内可编辑持久化）。
3. #20 宽比定档：左栏收敛态右栏默认宽屏；档位值 SPEC 提案先行。
4. #21 chat 降噪：系统事件卡合并紧凑事件流；人机分辨=对齐+底色不靠框；artifact 卡保留；形制 SPEC 提案。
5. #23 双侧折叠：左右栏折叠钮；折叠后只剩 chat 底、展开钮驻原位或收敛视觉 bar；三列纵向贯通不分横带。
6. #24′ composer 下小字（一字不改）："Courtwork is an agent and can make mistakes. Please double-check responses." + "Give us feedback" 链接（小字英文不占视觉；feedback 路由预留可 mailto）。
7. #25 左下角用户位：负责人/用户菜单（设置 + 检查更新/下载 badge 路由设置页 + feedback）；非 demo 不显示律师名（#17 语义并入）。
8. #26 运行反馈阶梯（规格提案先行，架构过目后实现）：请求中/成功/失败三态即时反馈；reasoning 流动画；OCR/摄取长任务等待交互（进度或骨架）；全部在 motion ladder 纪律内（hover 120ms/数据区静止不破）。
纪律：TDD；floor 禁降只升；tokens 外零硬编码色；SPEC 提案（宽比档/降噪形制/反馈阶梯）先写后实现供架构过目；对照截图（改前/改后/frontier 参照）入 visual-audit；完工报告含提案全量。凭证文件与 packages/* 不许碰，跨层需求写对方 SPEC TODO。
```

## FIX-KC-1 验收（Claude Code，实现者 Grok，安全敏感件从严）

```
你认领 Courtwork 的 FIX-KC-1 验收（验收工程师，AGENTS.md 全判例；安全敏感件，主张逐条证伪不采信自述）。范围提交：815bf15（11 文件显式路径）。先读：docs/55 FIX-KC-1 工单 + DBG-2 诊断要点（H1 ACL 漂移/F2–F6 提案）+ docs/27 红线（key 永不进事件流日志）。

全局门：干净环境 pnpm -r build → Rust 单测（cargo test，9 例逐名核）→ Vitest → Playwright 90/90 + floor=90（禁降史 88→90）→ 四门禁 → git 卫生（仅 11 文件，他会话脏文件未动）。

安全主张逐条证伪（重点）：
1. trace 无泄漏：读 lib.rs 日志实现逐字段——secret 值/source 值/env 值必须无写入路径；**实测**：COURTWORK_CRED_TRACE=1 跑一轮 save+status（可 dev 环境 mock/真 keychain 任一），grep 日志无 sk-/密钥子串/env 值；断言测试确认存在且真断言（非空测）。
2. 默认关铁证：不设 env 冷启动 → 日志文件不创建不追加（实测文件系统，非只信单测）。
3. F6 双向核：读 cfg 判定代码——debug_assertions 下 service=.dev 后缀；**release 编译产物无后缀**（读代码逻辑 + release build 单测或 cargo test --release 任一证明；防反转 bug：release 带了 .dev 是灾难级）。
4. F4 分型不越权：failKind 只进状态 JSON/诊断导出（枚举值），UI 文案三句对外零技术概念（无 OSStatus/ACL 字样）；**SET-1 诊断导出回归**：新增 credentialFailKind 字段后重导一份实物，全载荷仍无密钥、路径仍 [configured]。
5. F2 顺序核：save 路径读实现——delete（忽略 NoEntry）先于 set，整组两条目都重写；失败中途的半写状态如何呈现（诚实 failed 即可，不许假 connected）。
6. F5 文案对表：settings-credential-recovery 与 DBG-2 用户侧文案语义一致（H4 钥匙串密码指引 + 手动删两项指引），仅 failed 态渲染。
7. e2e 回归红线：既有断言无放宽；新增用例覆盖分型文案与恢复指引呈现。

报告纯追加 apps/desktop/ACCEPTANCE.md「FIX-KC-1 验收」节（工作树若有前序未提交追加，先按判例链代提交）。结论：放行与否；真机采集剧本是否可直接交用户执行。
```

## RP-2.3 批复（2026-07-11，sol 提案 → 架构批准 + 四条件）

计划照案批准（比例与 Schema 工作面收口，纯视觉不改交互契约，resize handle 另单）。宽比档（左 248/min224，chat 0.9fr/min420，schema 1.25fr/min560，折叠 48）、Schema 四层分层、dense 排版档、板块清晰化（列表+分隔线不堆卡、选中仅 bg.selected、单层圆角容器）、验收矩阵全部采纳。附加条件：

1. **1180 数学修正（必须先解）**：三列最小值合计 1204+间距 > 1180。二选一写死进 SPEC：1180 档 = 左栏收敛态基准（展开态最小窗口 1240）／或 1180–1239 自动收左栏。禁止运行时含糊。
2. **dense 档进 tokens**：`type.dense` 组入 tokens.json（13/12px 档 + mono 位），组件内禁裸 px——与宽度变量同纪律。
3. **不变量：文书预览 15px reading 不缩**（交付轨阅读优先级 > 信息密度）。
4. **验收矩阵自动化**：四档宽度断言、nowrap/ellipsis、schema 正文 ≥13px、无横向溢出（scrollWidth ≤ clientWidth）全部进 Playwright，floor 只升；截图入 visual-audit。

## FIX-KC-1 关账（2026-07-11）+ 对 RP-2（sol）的两条追加指令

FIX-KC-1 验收放行（七主张逐条证伪全立，含 trace 注入实测与 release 反转防护双向证明）；验收补写的真机采集剧本收编（见 ACCEPTANCE.md FIX-KC-1 节，用户照跑回传 log 即关 DBG-2 授权链）。新判例：端口隔离（入 AGENTS.md）。

**sol 注意（并入 RP-2 完工要求）**：
1. 第 0 步代提交：apps/desktop/ACCEPTANCE.md 现有 FIX-KC-1 验收报告 +78/−0 未提交——核实纯追加后原样独立提交（判例链 1800925/8202d18/a964baa）。
2. floor 交叉核对：FIX-KC-1 已把假绿下限升至 90（你在途改动 assert-test-count.mjs 前基线可能还是 88）——完工前 rebase 到 90 之上只升不降，提交前核对勿回退他单的 floor。

## RP-2.5 批复（2026-07-11，sol 提案 → 批准含修宪）

三阶段（a 溢出与层级/b 双宿主拆分/c 设置 modal）+ 场景条 3/2+更多、composer 优先级收敛（发送永不裁切）、免责声明 1600 阈值换行数学、用户消息右对齐浅底 78%/agent 直排无气泡、设置 L2 双栏 modal（导航 280–320、行+分隔线不堆卡、关于与更新收编 #25）——照案批准。第三节为修宪级：docs/49 第三章已改双宿主（见该章修正）。附加条件：

1. 宿主语义修正：SchemaPreviewHost 领域无关，法律=首个渲染器集；宿主内禁法律语义。
2. **import 边界守卫机器化**：UtilityRail ↔ 垂类渲染器互不 import，grep/lint 测试入门禁，越界当场红。
3. 迁移红线：module-stack 既有 e2e 只因结构迁移改不放宽；floor 只升（基线 90）。
4. 自动验收清单照案全收（边界不溢出/8px shell gap/声明换行/双宿主态断言/设置 modal 无溢出/三档 scrollWidth）。

## RP-2.5 验收（Claude Code，实现者 sol，850d956）

```
你认领 Courtwork 的 RP-2.5 验收（AGENTS.md 全判例 + worktree 隔离 + 端口隔离判例——本单实现者已自用独立端口，验收仍须自查 lsof）。范围：850d956（双宿主解耦 + a/b/c 三阶段 + 视觉审计两处回归修正）。先读 docs/55 RP-2.5 批复（四附加条件）+ docs/49 三章修正（双宿主修宪）。

全局门：干净 worktree@850d956 → pnpm -r build → Vitest（自述 70）→ Playwright（自述 107/107，核 --list 与 floor 同步至 107、禁降史 90→107）→ 四门禁 → git 卫生（未触凭证 Rust/TS 与 packages/*、未扫他会话脏文件）。

结构重点：
1. **import 边界守卫是真门禁**：读守卫实现（grep/lint 测试）——UtilityRail 不 import 垂类 renderer、PreviewHost 无法律语义；故意构造一个越界 import 验证守卫会红（然后撤销），防"守卫存在但断言为空"。
2. 双宿主行为：通用态三独立浮卡无 schema tabs；Preview 打开 = 主承重 + 三卡收敛 dock（progress 权威位在 dock 保留——完工自述修过此回归，重点复核）；关闭恢复；artifact 自动打开 + 手动关闭优先。
3. SurfaceCard 阴影 token：解析值必须仍为 none（de-slop #6 不许被"token 化"偷渡投影）；全库 box-shadow 复查。
4. 收口断言实测：四档宽度 scrollWidth；composer/send/provider 右边界不越 chat；8px shell gap；≥1600 声明单行/窄档整体换行；用户消息右对齐浅底 78% vs agent 直排无气泡；设置 L2 modal 1180 无溢出 + Esc/关闭。
5. 回归红线：module-stack 旧 e2e 迁移语义不放宽（diff 逐文件）；D-1/SET-1/FIX-KC-1 关键用例抽跑。
6. 完工自述的两处视觉回归修正（composer popover 裁切/dock 进度权威位）各补一条断言核实已锁。

报告纯追加 apps/desktop/ACCEPTANCE.md「RP-2.5 验收」节（先按判例链代提交任何前序未提交追加）。结论：放行与否；0.1.1 是否可出（BUILD-1 工序复用，版本号 0.1.1）。
```

## RP-2.5 验收裁决（2026-07-11）：一项修宪 + 三项打回 → RP-2.5.1

阻断一（阴影）修宪解决——**de-slop #6 修正案**：阴影解禁但纪律化：①单点供给（仅 --elevation-shadow token，组件内禁写值）；②限位（仅两侧 L1 浮面；L0 chat 区零影；artifact 卡随提案定）；③极轻且过目（sol 在 SPEC 提案具体值，架构过目后落 tokens）。立法本意是防廉价立体感，三栏已分后极轻阴影是精修不是 slop——立法随格局更新。

## RP-2.5.1 补丁单（sol，验收打回三项 + 阴影落宪）

```
你（sol）认领 RP-2.5.1：验收打回三项修复 + 阴影修宪落地。范围窄，冻结结构内改。

1. 阴影落宪：SPEC 提案 --elevation-shadow 具体值（藏青基调低透明度短距，附消费位清单：仅两侧 L1 浮面，L0 chat 区零影）→ 架构过目后写 tokens.json + styles.css；组件内零 shadow 字面量（grep 断言）。
2. Composer 重叠修复：1180/1240 与右栏重叠、1440 侵入 8px gap 的根因修掉；**e2e 断言全面换几何学**——boundingBox 坐标：composer/send/provider 右缘 ≤ chat 右缘、chat 右缘与右栏左缘差恰 8、四档全查。scrollWidth 检查保留但不再作为重叠证明（假绿判例）。
3. Artifact→Preview 真自动打开：artifact_produced 打开对应 PreviewHost renderer（非旧 moduleOpen）；用户手动关闭后同场景再产 artifact 不强制重开（手动优先状态位）；两条 e2e：自动打开、手动关闭优先。
4. Model-config 回归断言：popover 打开/改配置/持久化/单实例四点固化为长期 e2e。
门禁：全绿 + floor 只升（基线 107）；完工报告附阴影提案值截图对照（无影/有影）。
```

## 阴影值拍板（2026-07-11）：批准落 token

RP-2.5.1（e1ae88e，三缺陷修复 + 几何断言 + floor 110 + 阴影白名单门禁）验收前置全绿。阴影值照 sol 提案批准：`0 1px 2px rgba(10,37,64,0.045), 0 4px 12px rgba(10,37,64,0.035)`——藏青同色相（非黑，冷底不发脏）、双层低透明（存在感而非立体感）。消费白名单：CaseRail、右栏卡/dock、收敛 bar、PreviewHost；chat/composer/artifact/设置/popover/数据区**永久零影**（白名单门禁已机器化）。sol 即落 token + 有影对照图 + 单点复验 → 0.1.1。

## RP-2.6 批复（2026-07-11，sol 提案 → 批准，P0 当场拍板）

四裁决采纳：①Demo 身份去水印（内联样板案标签走 container-copy 词表；package 图标；无未读 1；isDemo 数据驱动）；②首装欢迎空态（selectedCaseId:null 真空态；冷启动零 Demo/零 replay；凭证 modal 不覆盖欢迎——**探针照常静默跑，仅 UI 呈现推迟**至发送/主动配置；引言文案后定；HomeModuleDeclaration 仅接口）；③法理之线 12px renderer gutter（线仍贴语义卡边，gutter 是结构位非线位移；阅读面 full-bleed）；④滚动进度归 PreviewHost（领域无关 PreviewProgressModel、每宿主唯一轨、首期只读、无 transition；**追加色彩纪律：轨道灰阶，markers 仅消费既有语义色白名单**；任务进度仍归 UtilityRail）。

P0 token 表当场批准（28/32/13/14/400 510 二元/16/6/12/2/44/40/36），直接落 tokens.json + SPEC，免二次提交。P4 Tab 永不物理消失、P5 图标走既有 SVG 链禁临时内联、自动验收清单（含字重计算样式断言、阴影白名单不扩大、守卫可触红）照案全收。序 P1→P5。

## RP-2.7 省并减法 + 语言分层（sol，接 RP-2.6）

```
你（sol）认领 RP-2.7：一轮全版面减法 polish + 语言分层落地（docs/49 第八章）。原则：只删只并只改文案，不添新功能。

1. 左栏减法：视觉臃肿审计——层级/行高/元信息密度收敛；重复入口合并（同一路由不出现两处触发，全版面 grep 动作 handler 去重）。
2. Composer 简约化：按钮功能重复排查（添加/附件/文件夹一族收进「+」）；保留 添加/chip/provider/send 四位主序；视觉降噪对齐 frontier composer。
3. 语言分层：通用 chrome 全量转英文（导航/设置/状态条/composer/utility dock/欢迎态——词汇对齐 frontier 惯例：Send/Settings/Working folders/Context/New case/Get started with the sample case 等，简洁不造词）；schema 空间保持中文（渲染器内/场景卡/容器词表/门禁动词/法律 artifact）；分层断言：chrome 测试选择器改英文文案后，schema 区断言不受影响——两组 e2e 各自独立。
4. 首屏再 polish：欢迎态排版（引言/建议入口/左栏样板案入口）按减法后重审，对照 visual-audit 37 找臃肿点。
门禁全绿 + floor 只升；完工报告附减法清单（删了什么、并了什么、每项一句理由）+ 改后 1440 首屏截图。
```

## RP-2.5.1 + 2.6 + 2.7 合并验收（Claude Code，实现者 sol，放行即 0.1.1）

```
你认领 Courtwork 的 RP-2.5.1/2.6/2.7 合并验收（AGENTS.md 全判例 + worktree 隔离 + 端口隔离 + 几何断言判例）。范围提交：e1ae88e（2.5.1 三缺陷修复）、阴影 token 落地提交（sol 拍板后落，验收先 git log 定位核对值 = 0 1px 2px rgba(10,37,64,.045), 0 4px 12px rgba(10,37,64,.035)）、7afcd76/1fe5b0d（2.6）、7d2b8cc/4e5a0ca（2.7）。先读 docs/55 三张批复（含 P0 token 拍板、四附加条件、RP-2.7 单）+ docs/49 六/七/八章 + 三章终态注记。

全局门：干净 worktree@最新范围提交 → pnpm -r build → Vitest 70 → Playwright 121/121 + floor=121（禁降史 107→110→116→121）→ 全部门禁（motion/signature/graph/icons/import 边界/阴影白名单/语言分层/重复路由）逐条 exit 0 且**各构造一次反例证明可触红** → git 卫生（未触 credentials/packages/*/他会话文件）。

重点抽验：
1. 阴影：值与白名单逐字对拍板；chat/composer/artifact/设置/popover/数据区零影实测 computed-style。
2. 2.5.1 遗产：四档 bounding-box 几何断言真实（读断言代码非只跑）；artifact→Preview 真自动打开 + 手动关闭优先两条 e2e。
3. 2.6：首装欢迎态（冷启动零 Demo/零 replay/凭证 modal 不覆盖——探针静默照跑核实）；Demo 身份内联无水印无未读 1；法理之线 gutter 12px 且线仍贴卡边（geometry 断言）；滚动轨每宿主唯一、只读、markers 色白名单。
4. 2.7 减法：SPEC 删并清单逐项对照实现（删的真删了、并的真并了、无残留死路由）；语言分层——chrome 全英文/schema 场景容器门禁全中文，grep 抽查两侧无混入；重复路由门禁反例可触红。
5. 三区凡例：44/40/36 高度、13/14+400/510 计算样式断言、Tab 窄档不物理消失。
6. 回归：D-1 切换矩阵/SET-1 导出/FIX-KC-1 分型文案抽跑；首屏视觉对照 visual-audit 40（自截对比，不采信提交截图）。

报告纯追加 apps/desktop/ACCEPTANCE.md「RP-2.5.1/2.6/2.7 合并验收」节（先按判例链代提交前序未提交追加）。结论三问：三单各自放行与否；0.1.1 是否可出（BUILD 工序复用版本号 0.1.1）；首屏第一印象是否达投递演示标准（主观评语一段，供架构参考）。
```

## #26 推理等待动画形制拍板（2026-07-11，用户定调）

等待/推理指示 = **图标锚 + 三行骨架**：spark-lines 图标位起笔，右侧三短行一次写下、轻微闪烁（shimmer）——frontier 驯化过的"它在写"语言，无认知瓶颈。纪律：①三行是骨架占位非数据，闪烁只作用于骨架——**数据区静止律不破**；②内容到达 = 0ms 硬切换（骨架消失正文落格，无过渡动画）；③**法理之线自身永不参与动画**——线是处置状态语义，骨架行居其右侧不借其色不动其形；④shimmer 用中性灰阶低对比，禁语义色。sol 在 #26 规格提案中照此落 token/实现。

### #26 形制修正（2026-07-11 同日）

两处修正：①**无 icon 框线**——图标裸置或省略，不加容器框；②**三行逐行写下**（非一次同现）——法理之线右侧，一行落定再落下一行，传达"推理在推进"而非仅"忙碌"；每行落定后静止，仅未落行轻闪。四纪律不变（数据区静止/0ms 硬切/法理之线不参与/灰阶）。

### #26 静默态拍板（2026-07-11 同日）

三态闭环：**推理中**（三行逐行写下）→ **静默**（骨架与文字消失，icon 内核留驻——静止、灰阶、无框线，即 ThinkingStream 折叠锚，点开回看思考流，#7 折叠语义的最小视觉体）→ **无推理内容**（icon 不出现，零痕迹）。静默即安静：不闪不占行，只留可展开的痕迹。

## #26.1 打回细化（2026-07-11，用户真机评：可凑合非期待）

9c6e657/cd56371 形制与三态对、位置与血统错，两点修正：
1. **随 turn 排列**：指示器是 turn 流的一部分——推理发生在哪个 turn，三行逐行就落在该 turn 的流内位置；静默后 icon 锚留在原 turn 内（成为该 turn 的思考流折叠头），不做页面底部常驻挂件。
2. **元素源自 icon core**：三行的笔画语言从 spark-lines 内核延伸（同一血统：线宽/端点/间距承接图标基因），不是图标旁另摆一组通用灰线。存在感校准随位置修正自然解决（在 turn 内即有上下文存在感，无需加重）。
三态闭环/四纪律/token 不变；并入合并验收范围。

## RP-2.8 chat 流减重与 dock 下拉（sol，接 #26.1，docs/49 第九章）

```
你（sol）认领 RP-2.8：①chat 内卡片按第九章减重——turn 卡四类词表化（event/artifact/file/gate），artifact 卡降视觉级（摘要+点击开 Preview，详情不留卡内），样式与机制归底座组件、法律内容走声明填表（import 边界照旧）；②工具调用行可展开（参数/结果摘要，dense mono 原生绘制，默认收起）；③dock 点击改 L2 临时下拉（不置换 Preview 图景，点外即收）；④全部图标原生 SVG 管线，无框线。门禁全绿 floor 只升；与 #26.1 同批完工，一并入合并验收。
```

## SCHEMA-SPEC-1 分册细则 + 五工作面回灌（sol，RP-2.8 之后）

```
你（sol）认领 SCHEMA-SPEC-1：按 docs/36 骨架填写 schema 空间设计分册细则（各原语规格：间距标注/状态矩阵/窄档行为，全部引用既有 token 不新造），架构过目后：五既有工作面按册回灌对齐（时间线/图谱/矩阵/修订/起草逐面核，册外样式清零）。对齐中册有缺漏先补册过目再改码。门禁全绿 floor 只升；完工附五面前后对照截图。
```

## 合并验收范围扩订（2026-07-11，追加于原 prompt 之上）

范围提交在原四批外追加：阴影 token 落地提交、#26（9c6e657/cd56371）、#26.1（0996ea9/51706c6）、RP-2.8 ①–⑤（d8df0ef/dd0fa1c）、⑥ question 卡（ec14ed1/bfe5547）。门数据更新：Playwright 126/126，floor 禁降史 107→110→116→121→126；Vitest 73。

追加抽验点：
1. #26+26.1：三态闭环 + **随 turn 排列**（指示器在其 turn 流内位置、静默锚留原 turn）+ 三行血统源自 spark-lines 内核（对照截图 41/42 与新实现差异）；数据区静止/0ms 硬切/法理之线不参与动画。
2. RP-2.8：turn 卡四类词表化 + artifact 卡降级（详情不留卡内，点击开 Preview 实测）；工具调用行展开（dense mono，默认收起）；**dock 归地**（L0 底色带非白卡、白卡单义断言）；dock 点击 L2 下拉不置换 Preview 图景。
3. question 卡：封闭选项/Skip 可跳过/不阻塞主流程/答案 enum 留痕入账本（读账本实测一条）；无自由文本注入路径。
4. import 边界/语言分层/阴影白名单三门禁在新增组件上仍可触红（各构造一次反例）。
结论三问不变：各单放行与否；0.1.1 可出否；首屏第一印象达投递演示标准否。

## RP-2.8.1 打回修复（sol，三阻断 + 实跑纪律）

```
你（sol）认领 RP-2.8.1：合并验收打回三阻断（报告 d143e36，RP-2.8 除 question 外整体不放行）。逐项：
1. dock 遮挡既有动作：归地改版后的层叠/命中区回归——dock 带与其下动作的 z-index 与 pointer 边界修正，补几何断言（dock 不覆盖任何可交互元素的命中区）。
2. GraphPanel/minimap 不挂载：宿主迁移断链修复，挂载断言 + minimap 主题回归（#9 判例用例必须复活）。
3. 图标作用域破坏法理之线颜色：SVG 作用域泄漏修正（P-4 管线纪律），法理之线五态色回归全绿。
纪律（判例生效）：完工报告必须附 Playwright 全量实跑原始输出（含逐 spec 结果与退出码）+ 串行复验一轮；八项失败逐一对应修复证据。floor 126 禁降。修复后回同一验收会话单点复验。
```

## DSGN-1 社区反 slop 设计资产调研（Grok，调研+落版连体，与 RP-2.8.1 并行零冲突）

```
你认领 Courtwork 的 DSGN-1：为 SITE-1（产品官网）与设计语言演进做一次社区扫货。方法：顺藤摸瓜到源码——只收有实物的，不收散文。

三条藤：
1. **kill AI slop 类 skill/规则集**：社区流传的反 slop 设计 skill、agent 设计指令集、awesome 清单（Claude skills 生态、GitHub、X 上被反复转的那几份）——读原文与源码，提取它们把"品味"编码成机器可执行纪律的手法（禁令写法/token 化程度/审计方式），与我们 docs/32 de-slop 十二律对拍：已有/可补强/应拒绝三栏。
2. **受盛赞的"品味设计"实物**：X/HN 上被行家夸的产品站与设计系统（Linear/Stripe 一系及更小众的），能拿到源码或可审查 CSS 的优先——提取营销页专用技法：hero 排版、字阶与测宽、滚动叙事节制、og 预览卡规格、零 JS/低 JS 性能纪律。
3. **skill 形态本身**：社区如何把设计纪律打包成可复用 skill（结构/触发/校验）——为我们将来把 docs/32+36 打包成"Courtwork 设计 skill"（场景包工作坊的设计工位）采形状。

产出：docs/59-调研-社区反slop设计资产.md（显式路径单独提交，不碰其他文件），结构：三条藤各一节（实物清单+源码要点+可移植结论）→ 与 docs/32/36 对拍表（已有/补强/拒绝）→ SITE-1 专用技法清单（供建站单直接引用）。回报 ≤10 行摘要，架构裁决后按对拍表一网打尽。
```

## DSGN-1 裁决（2026-07-11，docs/59 对拍表勾选）

采纳四项：①营销 tell 分册（产品十二律之外单列，SITE-1 引用）；②OG 1200×630 规格入建站单硬交付；③deslop 确定性扫描器——建站单 CI 门先行，产品侧门禁化列 SCHEMA-SPEC-1 候选；④六轴自评为设计类工单完工报告标准格式。拒绝栏照单全拒（主题轮换/高 motion/强制衬线/轻影回潮——注：站点阴影跟产品白名单，拒的是营销大柔影）。藤三 skill 形状收档为"Courtwork 设计 skill"预案，真相源恒为 docs/32+36。一网打尽的执行载体 = SITE-1 建站单（验收后随 mirror/pages 计划一并成文）。

## RP-2.9 首启与主屏重绘（sol，RP-2.8.1 三阻断清完后串行）

```
你（sol）认领 RP-2.9（docs/49 六章修正 + 第十一章）。范围：
1. 懒探针：冷启动零钥匙串访问（Rust 侧 credential_status 不在启动调用；TS 首触发点 = 发送/设置入口）；首启序列：欢迎态 → provider 一步式引导卡（傻瓜路由+安全声明+Skip）→ Skip 主动路由进样板案导览；非首启回空态。凭证文件改动限时机不改语义（FIX-KC-1 成果不动）。
2. 红绿灯融合：titleBarStyle Overlay + 自绘标题栏，Mac 原生框合体；三列上下贯通（Cowork 型）；dock 三 tap 悬浮右卡之上全量落地（743da05）。
3. 左栏整体重绘：有容器/空态两态各自自足完备；密度分档——首页/左栏放宽间距/图标/圆角档（新 token 组 home.* 提案先行过目）；衬线仅欢迎语一处对齐修正。
4. 主屏 composer/按钮排列照抄 frontier（Cowork 参照截图用户已供），不自创。
门禁全绿 floor 只升；完工附实跑原始输出（判例）+ 首启全流程录屏或逐屏截图（欢迎→引导→Skip→样板案）。
```

## RP-2.9 追加条款（2026-07-11，视觉批）

5. 用户气泡边框藏青加深（或背景微调），扁平不变；6. 折叠左栏左下留头像位；7. 滚动轨与卡片交叠做渐隐过渡（禁硬拼），条目区分用贯通细横线；8. 左栏选中态：阶段大纲式下排、无框线、SVG 与文字对齐、选中色加深（既有方向确认）；9. **描边与阴影同步律**：有影必有 hairline 描边（含 composer）；composer 框线稍重、色与两侧一致微深，文本块内零按钮全沉底排对齐，除发送外全扁平无外框。

SITE-1 备注：演示区用 **CSS 手绘 Mac 窗框**（红绿灯+圆角）放真截图，禁位图 mockup 与 3D 透视。

schema 兜底形制见 docs/36 第四节（渐进完备性），SCHEMA-SPEC-1 一并回灌。

## RP-2.9 追加二（2026-07-11）

10. paste 扁平按钮入 composer 底排（无框）；**paste 场景封闭清单**：composer（文本+截图/图片粘贴转附件）/provider key 设置（已有）/工作稿画布；Stage 1 +企业库配置。
11. 在途请求 steer = 排队语义：新消息入队 + Queued chip（可撤回）+ "停止当前"选项；不做注入式 steering。
12. message edits 确认不做（docs/58 Stage 1 fork 既裁）；形制预记：扁平框内嵌带框线编辑区、cancel/save 右下、"Editing this message will restart the conversation from here" 警示——fork 语义的 frontier 标准表达。

## RP-2.9 追加三 + AUDIT-1（2026-07-11）

13. 时间戳：事件产生时本地系统时钟记入账本一次定格（绝对时间=留痕事实）；UI 渲染相对时间随时钟刷新；永不取自请求/provider。
14. message 按钮排（copy/朗读/赞/踩/⋯）画齐，三档路由：copy 真做；赞踩接本地反馈事件（一行账本，兼 eval 反馈语料与 docs/28 opt-in 入口）；朗读与⋯预留禁用（⋯future 装 edit fork）。

## AUDIT-1 控件普查（sol + computer use，RP-2.9 完工后、复验前）

```
你（sol）认领 AUDIT-1：穷举式 UI 自查。方法=控件普查法，行列来自清单非目力：以 docs/46 控件清单 + docs/57 词表为行，×状态列（default/hover/active/disabled/empty/loading/error），computer use 逐格截图对照 docs/32/36 凡例；机器底册：Playwright 全路由截图爬取 + deslop 扫描器首跑（DSGN-1 采纳项，先做站点版规则的产品试运行）。产出：差异清单入 docs/52 批次五（每项：控件/状态/凡例出处/差异描述/建议），不顺手改码——清单经架构裁决后才动。
```

## RP-2.9 追加四（2026-07-11）：发起路由与继续区

15. **不默认路由上个卷宗**（作用域污染，D-1 判例）；主屏欢迎态 composer 下加**继续区**：≤3 张扁平行卡（案件名+阶段+待办计数+一键进入），无装饰不做网格——兼防重复建卷宗；左栏 Recents 存全量，主屏只放最可能续的。
16. composer 选择器两段式：上段 Cases（卷宗图标+阶段计数）/下段 Recent chats（气泡图标），细横线区分——选卷宗与选 chat 的层级差靠排序与图标，不加框。
17. 内容关联引导 = question 卡（分类器命中案号/当事人 → "在该卷宗中继续？"一键采纳可忽略，推荐不触发）。

## RP-2.10 开册（2026-07-11）：chat|work 二段与 chat 轻画布

1. 顶层 chat|work 二段切换（docs/25 修正二）；chat = 单一剪裁 session 轻画布（无列表无管理）；左栏气泡行退场、Recents 纯容器；存入仪式从 chat 收话题入容器。排期：RP-2.9 与 AUDIT-1 之后（RP-2.9 已封单 17 条）。

## RP-2.8.1 收账 + home.* 拍板（2026-07-11）

RP-2.8.1（90b9cb8）八项逐一闭合，两轮串行 126/126 + 原始输出随附——实跑判例首单合规；待原验收会话单点复验。

home.* 八项照案批准（inset16/sectionGap20/itemGap12/rowHeight36/iconSize18/controlRadius8/surfaceRadius16/welcomeMeasure560），两脚注：①iconSize 18 豁免 4 基阶（图标=光学尺寸，判例同 stroke 1.35）；②surfaceRadius 16 仅主屏低密度大面（第三圆角档：4–6/12/16，密度分档合法），继续区行卡视觉冲突可自决回落 12 并注明；schema dense 区禁消费 + 衬线唯一消费点由门禁锁定（具名禁令+token 锁范式）。批准后 sol 续 RP-2.9 全量。

## RP-2.9 收账 + RP-2.9.1 快修单（2026-07-11，真机清单——全为既裁项执行到位）

RP-2.9（a327b57，floor 132，两轮串行+原始输出合规）收账；message edit 未实现=照裁（Stage 1 fork）。RP-2.9.1 七条（sol，AUDIT-1 前快过）：

1. 顶栏照 Codex 形制：红绿灯+边栏折叠钮，**无前进/后退**（无浏览语义）；wordmark 落栏内容顶部。
2. 全按钮扁平无框，唯发送/区域唯一主动作保留实底（RP-2.6 control.weight.primary 既裁）。
3. user message 纯平浅底无边框；**编辑态才描边**（边框线=输入选中信号）。
4. composer 按钮全部沉底排、去框线（追加二 #10 执行到位）。
5. chat 卡片降噪再收：事件流/卡片视觉权重照第九章注意力主从执行到位（现仍太乱占视觉）。
6. dock 上层/schema 画布下层全量落地（743da05 执行到位）；chat 板块右上角零按钮。
7. 左栏卷宗行扁平化完成：大纲式自然下排、无框线（追加四 #15/16 既裁）。
完成后 → AUDIT-1 普查 → 独立终验 → 0.1.1。实跑判例照旧。

### #26.2 锚元素改判（2026-07-11，并入 RP-2.9.1）

推理指示锚 = **品牌 icon 的藏青线元素**（wordmark 线条基因延伸），非星星、非法理之线（法理之线专属处置语义不外借，先前裁决重申）；三行逐行形制不变、从该线元素生长。尺寸略大于 send 按钮；位置 = **整段对话（turn）尾部、message 按钮排之下**；静默态 = 纯 icon 驻留（三行退场，线元素留作思考流折叠锚）。

### #26.3 终judgment（2026-07-11）：推理动画 = app icon 本体动画

app icon 语义 = 藏青竖线 + 三条较粗横杠（书写中的卷宗）。推理指示即 icon 活化：竖线立定、三横杠逐条写下（=三行逐行的最终形制载体）；静默 = 收回静态 icon。品牌识别与功能反馈同体——Dock 图标与对话内思考指示是同一元素。sol 按此实现（icon SVG 已有，动画为其三横杠的逐条显现，纪律照 #26 四条不变）。

## RP-2.10 三卡一纸 + icon 动画（Opus 4.8 实现，sol 验收——任命变更）

```
你（Opus 4.8）认领 Courtwork 的 RP-2.10（docs/49 第十二章 + docs/55 #26.2/26.3）。必读：CLAUDE.md → docs/49 全章（重点九/十一/十二章）→ docs/32/36 → docs/55 判例（实跑/端口隔离/floor 禁降 137）。范围：
1. 三卡一纸全量：至多三卡上下贯通浮底纸；dock 三 tap 坐底纸+折叠钮居留空上部；schema 唯一右卡；chat 面仅两栏。
2. 线影凡例：composer 外框略重（含按钮区）；默认按钮扁平专点才框；user message 扁平略深+编辑态描边；留空即结构（文字不贴边）。
3. chat 内卡片清算：event/artifact/file 全降扁平 message 行；唯 question/门禁轻卡；动作进行时文本惯例式闪烁。
4. #26.2/26.3：品牌 icon（藏青竖线+三横杠）即推理动画本体——turn 尾按钮排下、左下角位形、三横杠逐条写下、静默收回静态 icon；四纪律不变（数据区静止/0ms 硬切/法理之线不参与/灰阶 shimmer 例外品牌线用藏青）。
纪律：TDD；floor≥137 只升；完工附两轮串行原始输出 + 关键屏截图；tokens 外零硬编码；不碰凭证与 packages/*。
```

## 断裂根治律 + PRV-1 provider 最小闭环（2026-07-11）

**断裂律（入 docs/36/49 语义，随 AUDIT-1 核查）**：层级节点仅三态合法——可点有内容（阶段行落切换；归档落只读回顾：投影+台账+产出）/pending 可点（落"将做什么"引导面）/不渲染。**灰色不可点结构性禁止**；着陆点与 prompt 注入范围一一对应。

## PRV-1（sol 功能线，与 RP-2.10 视觉线并行、热点不相交）

```
你（sol）认领 PRV-1：provider 自配最小闭环。范围：
1. 三元组表单：base URL + API key + 模型名；预设档（DeepSeek/Qwen/豆包，quirk 层既有）自动填 URL/推荐模型，自定义档才露 URL；接入既有引导卡与设置页，key 入钥匙串（FIX-KC-1 语义不动）。
2. 模型发现：校验时 GET /v1/models 填模型下拉；不支持则降级预设+手输（诚实降级不阻塞）。
3. 推理路由 quirk 声明化：标准/深思 → 各家映射（DeepSeek=模型名切换/OpenAI 系=reasoning_effort/Qwen=enable_thinking），映射表数据驱动禁代码分支。
4. 真冒烟校验：「验证连接」=最小真实请求（1 token 级），connected 以此为准（强于钥匙串读取）；失败走 F4 分型文案。
托管档（后端积分）仅设置页预留位。TDD；mock 端点单测 + 分型 e2e；floor 只升；实跑判例照旧；不碰 App 视觉热点（Opus 在场）。
```

## PRV-1 验收（Claude Code，实现者 sol，安全件从严）

```
你认领 Courtwork 的 PRV-1 验收（AGENTS.md 全判例 + worktree/端口隔离 + 实跑判例）。范围：6fb92b9/193fa7e。先读 docs/55 PRV-1 单 + FIX-KC-1 节（凭证语义基线）。

全局门：干净 worktree → 9 包 build → Vitest（desktop 79/core 158）→ cargo test 10（顺手装 rustfmt 补跑格式检查，失败不阻断但记录）→ Playwright 143/143 + floor=143（禁降史 137→143）→ 全门禁反例可触红抽一。

安全审计（重点，逐条证伪）：
1. **WebView 无明文读取**：枚举全部 Tauri command/IPC 面——不存在任何返回 key 明文的通道（grep invoke 面 + Rust handler 逐个读）；冒烟请求组装全程 Rust 侧，JS 只见 phase/分型。
2. connected 唯冒烟成功论：读状态机——无乐观路径、无"钥匙串读到即 connected"残留（D-1 判例）；模型发现失败不影响 connected 判定（降级仍可 connected）。
3. key 不进日志：trace 开启跑冒烟一轮，grep 日志无 key 子串/无 Authorization 头值（docs/27 红线回归）。
4. 分型全覆盖：mock 端点逐一驱动鉴权/限流/端点/模型/超时/网络六型，UI 文案零技术概念。
5. quirk 声明化铁证：推理路由映射为数据表非代码分支（grep 无 if(provider==)类分支）；三家映射逐条对 PRV-1 单。
6. 降级诚实：/v1/models 不支持 → 预设+手输可用不阻塞；空列表/畸形响应不崩。
7. 真实网络路径不在本验收（无 key）：结论中明确标注"待用户产品内『验证连接』真 key 首跑"为最终闭环。

报告纯追加 ACCEPTANCE.md「PRV-1 验收」节（判例链代提交前序追加若有）。结论：放行与否；「验证连接」按钮是否可直接交用户执行真 key 首跑。
```

## RP-2.10 收账裁决（2026-07-11）

三判断批准：①两态去卡——**正式记录：ch12"至多三卡"取代三章修正之"通用态三独立浮卡"条款**（修宪连带效果），data-mode/preview-open 契约保留；②brand-mark 入 P-4 管线（19→20），门禁收严；③floor 留置正确，**143→146 为验收顺手项**。composer:56 留置处置正确（基线即红、证据在案、未越 invariant 2），出 QF-1 清账。并发处置记优：暂停请示/白名单提交/越界守卫/争议文件留置——共享树行为范本。

## RP-2.10 验收（sol，实现者 Opus，任命所定）

```
你（sol）认领 RP-2.10 验收（AGENTS.md 全判例 + worktree/端口隔离 + 实跑）。范围：24c61bd（20 文件）。先读 docs/49 九/十一/十二章 + docs/55 RP-2.10 单与收账裁决。
全局门：干净 worktree → build → Vitest 79 → Playwright 全量两轮（预期 145/146，composer:56 为登记在案的基线红，QF-1 另单——不计本单）→ 全门禁反例触红抽二（RP-2.10 boundaries + icons 20）。
重点：①ch12 契约实测——至多三卡（右列唯一 schema 卡、dock 带坐底纸、折叠钮居留空、base 态零卡 + reopen 入口）；②brand-mark 动画四纪律（数据区静止/0ms 硬切/法理之线不参与/藏青竖线+三横杠逐写、静默收锚、turn 尾左下位形——对照截图与真机目视）；③gate/question 唯二轻卡、event/artifact/file 扁平行、进行态闪烁 settle 收敛；④composer border-strong 含按钮区/user message 微深底/留空 16px 几何断言；⑤rp25:60 修复复验 5 连跑；⑥顺手项：floor 143→146（一行，注明）。
报告纯追加 ACCEPTANCE.md。结论：放行与否；视觉是否达 ch12 终章意图（主观段）。
```

## QF-1 队列语义修复（sol，RP-2.10 验收后）

```
你（sol）认领 QF-1：composer.spec.ts:56（发送→排队）基线红清账（HEAD 95826ac 起 3/3 红，RP-2.10 留置登记）。根因方向：paced 回放使门禁在发送前落定，消息走 localMessages 而非 queued。二选一：修行为（在途请求判定时序使发送正确入队——RP-2.9 #11 契约你所写）或改断言（附语义论证报架构拍板后行）。禁弱化断言了事。全门禁 + floor ≥146 + 实跑两轮。
```

## QF-1 增补第 0 步（2026-07-11）

RP-2.10 验收产物在 codex/accept-rp210 分支——QF-1 第 0 步：将 a7c3e83（验收报告）与 db9c271（floor 146）收编回 main（cherry-pick/merge，禁 force，核纯追加后原样）。

## QF-1 收账（2026-07-11）+ 收尾编排

QF-1（4389bf3）清账：根因 confirmation_requested 误判请求结束；改 session.completed 判定在途；断言零改动；11/12 红→12/12 绿并发复现。第 0 步 merge 9451222 收编验收线。**套件 146/146 全绿零已知红**。

收尾编排：①PRV-1 验收会话追加 QF-1 单点复验（composer:56 三连跑 + 读 App.tsx 判定逻辑一处）；②AUDIT-1（sol）并行开跑——**仅阻断级发现挡 0.1.1，其余入批次五归 0.1.2**；③两线归来 → BUILD 0.1.1（工序照 BUILD-1，版本号 0.1.1，SPEC Build 记录节）。

### AUDIT-1 追加项（2026-07-11）

+可见字符串扫描（docs/36 五节零编码暴露律）：全界面巡内部 id 模式（如 p-xxx-xx/D\d+）与英文枚举字面量直出，命中即列批次五缺陷。SPEC 编年史裁决：历史节"当时为真"不回改，清账由后续节自记。

## AUDIT-1 收账 + 批次五分级（2026-07-11）

AUDIT-1（d7286c5，45 截图，deslop 首跑含误报分类）收账。分级：**#27 排队跨案件污染、#28 整理报告暴露命令/路径/hash = 阻断级挡 0.1.1 → QF-2**；#29–#34 归 0.1.2。

## QF-2（sol 功能线，挡 0.1.1）

```
你（sol）认领 QF-2：AUDIT-1 两项阻断。①#27 排队消息跨案件污染空态——Queued 队列必须随容器作用域（CASE_SCOPE_AUDIT 补行 + 切换矩阵 e2e 扩断言，D-1 家族纪律）；②#28 卷宗整理报告暴露命令/绝对路径/hash——报告内容按零编码暴露律重写（docs/36 五节：动作语义化文案、路径显示相对容器、hash 退诊断层），FileOps 语义不动。全门禁 + floor ≥146 + 实跑两轮。
```

## RP-2.11（Opus 视觉线，七条，与 QF-2 并行热点注意 App.tsx 协调——错峰提交）

```
你（Opus）认领 RP-2.11。①顶部秩序：标题行与红绿灯同排对齐；wordmark 下沉左栏顶；chat|work 段控对齐 Cowork 位；②两侧卡上下贯通 + 三栏间距加大（值提案过目）；③分隔间隙贯通到底，展开/收敛钮驻间隙垂直上部；④右侧三 tap 同层横排、各自向下 L2 浮窗展开、dock 顶对齐左栏；⑤composer 内零框线、五钮沉底（add/add folder/workmode/model/send）；⑥message 按钮缩小一档；⑦全扁平按钮 hover 深色块（token 提案）。推理动画改判：**最小字符版**——竖线字符 terminal 式书写指示替换星号（icon 本体动画等 P-4 全量后另单）。floor ≥146；实跑两轮；完工附对照截图。
```

## QF-2 收账（2026-07-11）

79f72c4/001465b/ed0ee67 三提交清账：#27 排队随 caseId 作用域（D-1 矩阵四步扩展）、#28 报告零编码化（中文动作+容器相对路径，执行器语义零动）、CASE_SCOPE_AUDIT 补行。725 unit/146 e2e 双轮全绿。0.1.1 前阻断项清零。

## RP-2.11 提案批复（2026-07-11）

推理字符版收账（▏terminal 硬闪/静默字符锚/brand-mark 留册待 post-P-4）。七项照案批准，值全过目通过（②8→12——Cowork 参照即 RP-2.9 所要真机证据；⑦--control-hover #e6eaf0 冷灰墨 8%，hover 与 selected 两种语义两色分离）。**正式记录：①案件标题迁顶栏 = 用户 Debug 3 指示覆盖 RP-2 #19**。

**chat|work 降为中间档**：壳与路由全做（二段真路由/chat 轻画布内存态单 session/气泡行退场 Recents 纯容器/存入桥容器化仪式）进 0.1.1；**剪裁/滚动摘要/chatspace 落盘 = HARNESS 系 0.1.2 另单**——切换器须有真功能，记忆体系不随视觉单拉动。chat 重启即逝为 0.1.1 诚实缺口（文件比对话长寿教义），完工登记。

收尾纪律：迁移的 pinned 断言逐条列理由；Opus 线 BUILD 前 merge QF-1/QF-2 收敛，**终验全量在合流 main 上跑**。

### RP-2.11 追加 ⑧（2026-07-11）：长消息收敛

长消息默认收敛 N 行（user 消息阈值短于 agent 正文，值提案过目），**底部渐隐遮罩虚化**（fade 至底纸色，"过渡而非硬切"凡例，与滚动轨遮罩同族）+ "Show more" 扁平文字钮（hover 深色块凡例）；展开后 "Show less" 收回；纯呈现层不动内容与账本；粘贴长文/引用块同规则。

## PRV-1 验收收账（2026-07-11）

放行（d1e4d9b，七条安全审计全立：无 key 通道/唯冒烟 connected/日志零泄漏/六型分型/quirk 零分支/降级诚实）。🟡P-1 归因为前引用（入宪：提交独立成立判例）；rustfmt 偏差记 P-3（sol 下次顺手）。「验证连接」可交用户——**落点 = BUILD 0.1.1 装包后点一次**（keychain/provider/宣言实证三线同刻闭环）。HEAD 全量下 rp210:6/ux1:81 动画时序 flake 属视觉线，RP-2.11 字符版重写自然消解，不开单。

## 真相复位（2026-07-11 深夜，0.1.1 Ship Gate plan 采纳）

仓库核验：QF-2（79f72c4 系）在 codex/qf2 未合流；PRV-1 验收 d1e4d9b 在 codex/sol-courtwork-rp2ui-b 未合流；RP-2.11 在途未见。此前"阻断清零/PRV-1 收账"两笔为侧支假清账，撤销——**以本节为准**。0.1.1 Ship Gate 采纳（Phase 0 真相复位 → 1 收编 → 2 并行两线 → 3 合流终验 → 4 BUILD → 5 用户闸）；批次五 #29–#34 授权为 PL-1（0.1.2）。

## MERGE-1 收编单（sol 或 Grok，30 分钟级，P0）

```
认领 MERGE-1：两件收编 main。①codex/qf2（79f72c4/001465b/ed0ee67）merge 入 main（禁 force，冲突以 QF-2 语义为准）；②d1e4d9b（PRV-1 验收报告，现在 codex/sol-courtwork-rp2ui-b 上）cherry-pick 入 main（核纯追加原样）。完工回报：merge/pick sha + `git merge-base --is-ancestor` 两条输出 + 独立 worktree 抽跑 d1-case-scope + file-ops + floor 断言原始输出。不做 RP-2.11。通知 Opus：其分支须 rebase 到含收编的 main 再续（第 0 步确认，否则暂停）。
```

## 合流终验 prompt（异实现者，MERGE-1 + RP-2.11 齐后发）

```
你认领 Courtwork 0.1.1 合流终验（放行 BUILD 的唯一钥匙）。干净 worktree @ 合流后 main tip，端口隔离，实跑判例。
门：pnpm -r build 9 包 → Vitest desktop+core → cargo test → Playwright 全量两轮 floor ≥146 零已知红 → 门禁反例抽二（shadow 白名单/thinking 字符契约）→ git 卫生（凭证语义零回退、收编三件祖先核验、无脏吞）。
抽验矩阵：①QF-2 四步切案 + 报告零编码；②RP-2.11 ①–⑧ + gap12 几何 + 字符推理契约（brand-mark 旧断言已迁移退役、两套不并存）；③PRV-1 七主张摘要复核；④ch12 三卡一纸不回归；⑤首屏 1440 主观段：达投递演示否。
三问：各线放行？0.1.1 可 BUILD？首屏达标？报告纯追加 ACCEPTANCE.md（在 main 上提交，显式核对 HEAD 指向）。
```

### 附件 chip 拍板（2026-07-11，并入 RP-2.11 范围⑨）

提交附件管理逻辑照抄 Cowork：chip 卡列 composer 输入区顶部（格式角标+文件名+大小+移除钮）；发送前可移除、**发送后即账本事实不可追溯撤除**；生命周期照 docs/58（chat 面入 chatspace 缓存/容器内走上传管线）。视觉：hairline 描边卡 + **阴影白名单 +1 行（composer 附件 chip，既批藏青双层极轻值）**——经拍板受控扩项，机器门同步收编。

## MERGE-1 收账（2026-07-11 深夜，合流即清账判例首单执行）

架构自验祖先：79f72c4 ✓ / a9b9751（d1e4d9b cherry-pick）✓ / ed0ee67 ✓ 皆 main 祖先（merge 674b21d）；ACCEPTANCE「PRV-1 验收」节在 main。**QF-2 与 PRV-1 验收正式清账**——阻断真清零。Phase 2 开：Opus 第 0 步（rebase 含收编 main）通知文已转，rebase 完成前不叠码。

## DSGN-2 pages 复刻 skill 与 provider 前端力调研（Grok，与主线零冲突）

```
你认领 DSGN-2：SITE-1 开工前最后一轮扫货。三问：
1. 社区网页复刻/落地页生成类 skill 全扫（Claude skills 生态/GitHub/X 热转）：选 3–5 个品味范例顺到源码，提取与我们理念同向的技法（tokens 化/反 slop 禁令/排版系统），与 docs/59 采纳表增量对拍（只补新发现，不重复）。
2. 主流 provider 前端生成力横评：当下谁的前端输出品味最高（Claude 系/GPT 系/Gemini/其他）、怎么用效果最好（单发全量 vs 迭代精修、参照图注入法）、给 SITE-1 落版的模型选择与用法建议。
3. 产出 docs/64-调研-pages复刻与前端力.md（显式路径单独提交，仅此文件）。回报 ≤10 行。
注：SITE-1 的 SVG 资产（域图标/装饰图元/OG 卡）已定由 Opus 全量重绘（P-4 管线），你只调研不画。
```

## DBG-3 · 0.1.1 首轮真机 debug 章程（Claude Code **Fable**，出包即派——窗口期任命）

```
你（Fable @ Claude Code）认领 Courtwork 0.1.1 首轮真机 debug。必读：CLAUDE.md → AGENTS.md 全判例（实跑/端口隔离/裸 HEAD 禁用/提交独立成立/合流即清账/S-2 pathspec）→ docs/90 手册 → docs/55 全册（Ship Gate 与各判例）→ docs/49/36/58 相关章。角色约束：三不变量照旧——你修的东西由异会话验收；契约级发现标 [需架构拍板] 上报不擅动。

职责四块：
1. **真机回报分诊**：用户五项闸（真机四项/trace 剧本/真 key「验证连接」首跑）的回报逐项分诊——按 FIX-KC-1 分型与 DBG-2 假设框架归因；能复现的写复现步骤，不能复现的写排除证据。
2. **快修授权**：实现级缺陷即修（TDD + floor 只升 + 实跑两轮原始输出 + 显式路径提交）；每修一项在 docs/52 批次册登记；热点文件先查是否有并行会话（lsof + git status 双查）。
3. **provider 链路首跑跟进**：真 key 冒烟若异常，读 trace log（credential-probe.log）+ F4 分型定位；DeepSeek quirk 层问题修 quirk 声明不改协议层。
4. **首跑数据采集**：冒烟成功后顺手记录——结构化输出走到三级降级链哪一级、重试率、首 token 延迟——写入 docs/66-首跑观测.md（甜点区报告与 docs/53 宣言实证的原始数据）。
纪律：不做 0.1.2 范围（PL-1/HARNESS/词表）；发现的 polish 项登记不实施；完工报告 = 分诊清单 + 修复清单 + 观测数据 + 遗留登记。
```

## FD-1 · Pages 设计 + UI review（Fable @ Design，即刻开工——窗口期任命一）

```
你（Fable，Design 线）认领 FD-1：产品官网设计稿 + 顺带一轮 UI review。必读：docs/32 设计语言包（tokens 全约束）→ docs/59（反 slop 采纳表：营销 tell 分册/OG 1200×630/deslop 扫描/六轴自评）→ docs/54（叙事骨架/命名彩蛋/展品页）→ docs/92/53（论纲与宣言结论层——机制不出稿）→ docs/49 十二章（三卡一纸视觉语言）。
交付：①单页站设计稿（静态 HTML + tokens，北极星屏技法；区块照 docs/11 SITE-1 骨架：Hero/三招牌场景/信任区/工艺区/联系；法理之线滚动点亮唯一主微交互；Mac 窗框 CSS 手绘放截图占位，真图 RP-2.11 后替换）；②OG 卡 1200×630 设计；③投递展品页版式（两垂类矩阵并排 + 零 core diff 图，docs/54）；④顺带 UI review：对照 visual-audit 截图库与 docs/36/49 出观察清单（登记 docs/52 批次册不实施，不做过强约束——品味判断自由度给你，落版守既有 tokens 与反 slop 采纳表即可）。⑤六轴自评随交付。产出目录 docs/34-sol-review 平级新建 docs/37-pages设计稿/。
```

## FD-2 · workspace 素材库典范集（Fable @ Design，即刻开工——窗口期任命二）

```
你（Fable，Design 线）认领 FD-2：schema 工作面排版架构典范集——素材库的奠基件，后续 SCHEMA-SPEC-1/VOCAB-1/PM-PKG 的设计迁移源。必读：docs/36（五级嵌套/凡例/零编码暴露律）→ docs/57（18 原语词表 + 组合代数 section/grid/repeat/嵌套上限两层）→ docs/62（PM 四场景规格）→ docs/61/63/65（各垂类场景形状）→ docs/32 tokens。
交付：①**排版架构穷举**：把组合代数的可能版面做全（主从/全宽阅读/矩阵密度/表格+statcard/checklist+时间线/文档页/对照……每种一版静态 HTML/SVG，tokens 落版）；②**多垂类最小实现示例**：法律（合同审查矩阵，既有对照）/PM（PRD 评审 + RICE 表）/招投标（核对矩阵）/HR（处分证据链）各 1 版——同一凡例四域换皮，"如出一手"的实证画廊；③素材库结构提案（图元/间距样例/状态矩阵的目录组织，供轻量包 Design 规范预置引用）；④凡例缺漏回报（做的过程中 docs/36 盖不住的地方列清单，补册材料）。产出 docs/38-素材库典范集/。零 core、零产品码；纯设计资产。
```

### FD-1/FD-2 增补批注（2026-07-11 深夜，用户放宽表现力上限）

**克制两分法**：原则性克制不动（de-slop 禁令/语义色白名单/数据区静止/tokens 单源——防廉价感，与执行者无关）；**权宜性克制对 Fable 解除**（此前压低表现力天花板是因执行者有限）。新基准："足以让人眼前一亮、感觉有品味"——在调研基础上放开图元精细度、版面雄心与微交互完成度。分工语义：**通用底座向 frontier 看齐**（熟悉即美德，十一章不变）；**垂类 schema 区是架构震撼的展示时刻**——FD-2 四垂类示例做到 wow 级而非合格级，带锚矩阵/证据链/法理之线的表现力全开。Button 与一切图元 SVG 原生绘制（P-4 管线，Fable 可全量重绘扩充图元库）。

## 回迁与全量策略（2026-07-11 深夜，用户拍板）

1. **MIG-1 预告（Fable 全量，授权 subagent 分发）**：RP-2.11 验收 + FD-2 典范集齐后，设计回迁产品由 Fable 主刀——MVP 阶段最能抓住视野的一步；功能 polish 与之并行持续。
2. **骨架先行策略**：UI/UX 先向 frontier 看齐把 Button/路由**全量做齐**（空位=禁用态+「即将支持」，零假活不破）——完整感先行；随后执行模型按图索骥填实，完成度单调上升。骨架即工单地图：每个禁用位天然是一张待派单。
3. **ICON-ANIM-1 解锁**：品牌 icon 真实推理动画进入实验/评估期（post-P-4 前置由 FD 线图元全量重绘满足）；字符版 ▏ 保底不拆，动画版过目达标才替换。
4. **垂类 schema 全量信心记档**：范式已定（词表封闭/凡例成册/规格模板 docs/62）下，语义推理足以命中全部场景——schema 全量铺设可交执行档模型按册生产，不会走歪。

### FD-2 交付口径九拍（2026-07-11 深夜）

①northstar 自包含 HTML；②取景混合（穷举=白卡视角/画廊=完整帧）；③干净版+页脚消费凡例声明；④穷举①–⑩ 照案 +⑪主从文书三段式 +⑫溯源展开态（嵌套上限两层守）；⑤四独立典范+四域并排总画廊；⑥临江案/栖屋取材+招投标 HR 虚构纪律新造；⑦要索引页（素材库首页=轻量包 Design 规范入口）；⑧缺漏独立 md（缺漏→处置→补册建议）；⑨画廊优先穷举抽样。

## RP-2.11 实现收尾收账 + 交接拍板（2026-07-11 深夜）

实现完成于 codex/sol-courtwork-rp2ui-b（19 文件 +443/−232 全 desktop，未提交守 rebase 纪律；两轮 151/152 唯 composer:56 合流消解项）。顶栏照搬 Cowork 定稿（透明浮层 chrome/标题居 chat 列/左卡全扁平唯 owner 留线/composer grid 五钮沉底）。pinned 迁移三条理由已列。两项过目拍板：**⑤撤 paste 独立钮**（⌘V+「+」收纳，场景清单不变；case chip 保留不计钮排——作用域信任件）；**⑧阈值 user 6 行/agent 12 行、③缝钮 20px 居中驻顶**（提案值可视觉微调）。交接 Fable：rebase 含收编 main → 显式路径一次提交（仅 19 文件）→ 合流态跑 Ship Gate Phase 3 终验（prompt 已备）→ BUILD 0.1.1。不另立 handoff 文件，报告落 SPEC 节。FD 产物的路径依赖清理 = 架构过目专项（第一性保留/惯性清理，对实物裁）。

## FD-1 收账（2026-07-12）+ PMO 常驻确认

FD-1 五件交付（官网单页/OG 卡/展品页/UI review 14 条登记不实施/六轴自评≥4）收账；**迁仓待办**：Design 端产物连同 FD-2 落 docs/37/38，14 条并批次册届时裁决；遗留真值（截图六处/SHA/commit）随 0.1.1 后替换。用户拍板确认：**MIG-1 = Fable 全量主刀 + subagent 舰队（含评审 subagent 生成-评审对，docs/58 十四节采纳①）+ 迁移即顺带 review/debug**；本 Cowork 会话 PMO 常驻不变。

## FD-2 收账 + G6/G11 真裁（2026-07-12）

FD-2 四件齐（14 白卡穷举/四垂类完整帧+总画廊/结构提案含四扩展承接位/缺漏 11 条）——**迁仓为用户手动项**（Design 端导出 → 仓库 docs/38/，架构提交）。真裁两条：**G6 不豁免**——典范像素即执行模型的教材，规格资产比产品更守法，页脚自文档行守 12px（降色缩文不降号）；**G11 语义归并**——"已核对"并入 authority 绿=已确认（不加第六态），线的使用位死守审阅语义面，非审阅位（指标/图表）改灰阶 ✓ 徽标。其余 G1–G10 缺漏按清单临时处置照案，补册条目随 SCHEMA-SPEC-1 一并裁。

## 合流终验收账（2026-07-12）+ BUILD-0.1.1 发单

93e7a00（验收 +96 纯追加）/3adb34d（tokens 契约）祖先自验双真；152/152 双轮零红、15 门禁 + 三反例、抽验六项全过、首屏达投递演示——**Phase 3 关账，BUILD 钥匙签发**。危险物处置：/tmp/courtwork-qf1 挂 72 条他会话暂存（含删 rp211 回退料），用户清理 worktree 即弃其索引，BUILD 严禁在该树打版。

### BUILD-0.1.1（Grok，粘贴即跑）

```
认领 BUILD-0.1.1：干净 worktree detached @ 93e7a00（勿用任何脏树）。工序照 BUILD-1（docs/11）：版本号 0.1.1 三处对齐（package.json/tauri.conf/关于页）→ pnpm -r build → 产 dmg → codesign 校验 + hdiutil verify + 前端内容哈希 → SHA-256 与构建环境（Node/pnpm/rustc）写入 apps/desktop/SPEC.md「Build 记录」节 → 提交（显式路径，版本号+SPEC 两类文件）。ad-hoc 签名如实记录（Developer ID 仍挂账）。不改产品行为。回报：dmg 路径、SHA-256、提交 sha、祖先核验输出。
```

## DBG-3 首轮分诊追加（2026-07-12，用户真机三发现——随章程一并粘 Fable）

1. **keychain 反复弹窗多次才过**：优先假设 = 双条目双弹（DBG-2 既标记的放大器，F3 单条目合并升格候选——若 trace 证实两条目各弹，架构预批 F3 实施）＋ ad-hoc 跨 build 漂移（治本等 Developer ID）。读 credential-probe.log 分辨。
2. **API 真请求未成功**：模型名 `deepseek-v4-flash` 高度可疑（DeepSeek 真实模型为 deepseek-chat/deepseek-reasoner）——查 quirk 预设表与 /v1/models 实返；若预设错值或发现降级占位泄漏为真值，修表（quirk 层数据改动，不动协议）；用 F4 分型定位失败环节。
3. **UI 实现漂移**（不快修，证据移交 MVP-FULL）：三 tap 现为顶栏横条（违 ch12 右列底纸 dock）、右卡未贯通顶、composer 多余图标钮未收五钮、消息按钮超大未缩档、空态虚线占位框（违缺口三态设计）——结构合流但宪法未落地。MVP-FULL 验收标准补一条（用户定调）：**逐屏与 frontier 并排对照**。
