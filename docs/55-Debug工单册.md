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
