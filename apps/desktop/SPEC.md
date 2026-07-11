# SPEC: apps/desktop（W9）

状态：P-1 / P-2 / P-3 / P-4 完成；composer 完成；D-1 完成；UX-1 完成；SET-1 完成；RP-1 完成；**RP-2 UI 完全化完成，待独立验收**；**BUILD-1 首个正式 Build（0.1.0 base 定形版）已产**；**FIX-KC-1 凭证授权流修复已落（trace+F2+F4+F5+F6；F1 Developer ID 仍挂账）**；PartyGraph 矛盾 marker 契约缺口仍标记 `[需架构拍板]`；Developer ID 公证仍挂账。

## RP-2 · UI 完全化提案（实现前，2026-07-11）

权威：docs/49 第四章两次修正 + docs/52 批次四 #18′–#26 + docs/32 motion ladder。范围只在 desktop；凭证 Rust/TS 与 `packages/*` 不动。

### 宽比固定档（#20）

| 档位 | 左栏 | chat | 右栏 | 触发 |
|---|---:|---:|---:|---|
| `balanced` | 248px | minmax(440px, 0.9fr) | minmax(520px, 1.25fr) | 默认 |
| `work-wide` | 48px | minmax(400px, 0.72fr) | minmax(680px, 1.55fr) | 工作面对照/用户折叠左栏 |
| `chat-focus` | 48px | minmax(0, 1fr) | 48px | 双侧折叠 |

只允许以上离散档位，栏折叠 0ms 硬切，不做拖拽无极缩放；展开钮留在原栏位形成 48px 视觉 bar。

### chat 降噪形制（#21）

- 人类消息右对齐、`bg.selected` 浅底、无描边；agent 正文左对齐直接落 L0 画布，不包框。
- D 编号、请求中/成功/失败、审阅提示合并为单列 `event-stream`：12px 元信息 + 状态点 + 一行办案文案，条目间仅 1px hairline；不再各自成卡。
- reasoning 默认折叠，运行时才显示 motion ladder 允许的呼吸；完成后内容静止。artifact（docx、风险结果等可操作产出）保留纯白承重卡。

### 运行反馈阶梯（#26）

| 阶段 | 形制 | 动效纪律 |
|---|---|---|
| 请求中 | composer 发送键就地禁用 + `正在处理`；事件流追加 active 行 | 2–5s 使用 2000ms opacity 呼吸；不裸奔 spinner |
| 成功 | active 行 0ms 硬切 confirmed + `已完成` | 状态本体零 transition；可用独立 150ms border-color 回执层 |
| 失败 | active 行 0ms 硬切 failed + 就地重试 | 琥珀/红只消费既有 semantic token；不显示模型假态 |
| OCR/摄取 >5s | 事实进度数字 + 当前步骤办案文案 + 骨架块 | 2000ms 骨架呼吸；表格/图谱/文书数据区绝对静止 |

hover 统一 120ms ease-out；动画属性只许 transform/opacity/background-color/border-color；`prefers-reduced-motion` 下长任务动画停用但状态文案与进度必须保留。

### RP-2 实现记录

- #18′：唯一模型声明位迁到 composer 发送键旁；connected 显示模型名·强度，pending/failed 不泄露配置模型名；context、toolbar、statusbar、titlebar 旧声明位清零，复用唯一 popover。
- #19/#20/#23：wordmark 唯一；案件头进 chat 且双击编辑、按案件 id 写入 localStorage；宽比采用上述固定三档；左右栏各有独立折叠/原位 48px 展开 bar。
- #21：D 编号、运行进度、审阅提示合并 `event-stream`；用户消息右对齐浅底无框；artifact 卡保留。
- #24′/#25：定稿英文声明逐字落地，feedback 为 mailto；左下负责人菜单含设置、检查更新路由与 feedback，非 demo 不显示律师名。
- #26：事件流 active/success 反馈、附件既有失败/重试和 >5s 进度文案沿用；长任务仅 opacity 呼吸，reduced-motion 停用，数据区静止。
- TDD：新增 `rp2.spec.ts` 5 例；Playwright floor 90→95；Vitest 70/70；RP-1+RP-2 定向 15/15；四静态门禁与生产构建通过。
- visual-audit：frontier 参照 [`24-rp2-frontier-reference.png`](visual-audit/24-rp2-frontier-reference.png)；改后全栏 [`24-rp2-full-layout-1440.png`](visual-audit/24-rp2-full-layout-1440.png)；双折叠 [`25-rp2-chat-focus-1440.png`](visual-audit/25-rp2-chat-focus-1440.png)。改前基线沿用 RP-1 [`23-rp1-full-layout-1440.png`](visual-audit/23-rp1-full-layout-1440.png)。

### RP-2.1 · 分层悬浮纵向贯通（2026-07-11）

- Cowork 范式优先：app shell 清除 titlebar / toolbar / statusbar 三条跨栏横带；左、右 L1 浮面从窗口内容顶部贯通到底部，中栏保持 L0 chat 画布。
- 左右栏各自折叠；按钮位于各栏顶部，折叠后形成 48px 贯通 bar，展开按钮保持原坐标。
- wordmark 迁左栏顶；chat 顶部仅保留案件名、案号、样板标识、阶段短标签及设置/⌘K，不扩写说明文本。
- 死路由清理：未接通的「审阅记录」「导出审阅稿」常驻按钮移除；用量归 context，运行态归事件流，继续阶段归 progress，产出文件夹归左栏产出入口与 artifact 卡。
- visual-audit：[`26-rp2-1-vertical-full-1440.png`](visual-audit/26-rp2-1-vertical-full-1440.png) / [`27-rp2-1-vertical-collapsed-1440.png`](visual-audit/27-rp2-1-vertical-collapsed-1440.png)。
- RP-2.2：composer 声明移出 L1 输入浮卡，保持同宽底对齐并允许自然换行；chat/rail/module/work-surface 标题统一 `min-width:0 + nowrap + ellipsis`，计数与动作固定，收窄时禁止逐字竖排或越界。Playwright floor 95→96。

### RP-2.3 · 比例与 Schema 工作面收口（架构批准 `43d99cd`）

- 数学闭合写死：`1180–1239px` 自动进入左栏 48px 收敛态；`≥1240px` 才允许左栏展开。禁止依赖用户先手动折叠来消除初始溢出。
- 宽度钩子：左栏 248/min224、chat min420/0.9fr、schema min560/1.25fr、折叠 48；全部由根 CSS 变量进入 `minmax()`，本单不做 resize handle/持久化。
- Schema 四层：通用模块头 → 工作面标题/计数 → Tabs → schema 主工作区；正文消费 `type.dense.bodySize=13px`，Tab/表头/计数消费 `type.dense.metaSize=12px`，编号消费 dense mono。
- 560–700px schema 容器内，风险主从区由左右 38/62 切为上下 34/66；图谱索引下移。选中仍只用 `bg.selected`，内部以 hairline 分隔，不新增卡层。
- **阅读不变量**：document preview / draft reading 固定 `15px / 1.6`，不随 schema dense 或容器宽度缩小。
- 自动验收：1180/1280/1440/1600 四档均断言 `scrollWidth ≤ clientWidth`、标题 nowrap/ellipsis、schema 正文 ≥13px；1440 另锁文书 15px。Playwright floor 96→100。
- visual-audit：[`rp2-3-1180.png`](visual-audit/rp2-3-1180.png) / [`rp2-3-1280.png`](visual-audit/rp2-3-1280.png) / [`rp2-3-1440.png`](visual-audit/rp2-3-1440.png) / [`rp2-3-1600.png`](visual-audit/rp2-3-1600.png)。

### RP-2.4 · 左栏卷宗分区降噪

- 选中底色只覆盖案件摘要行，不再染满整个展开卷宗；展开体固定白底，以 hairline 分区。
- 展开结构明确为「阶段」→「卷宗原件 · 只读」→「工作区」，撤销抽象且重复的「三区」标题。
- 原件由松散 hover 小卡改为 34px 紧凑列表 + 行分隔线；文件名、原名、只读状态与打开动作保持可达。
- visual-audit：[`rp2-4-rail-sections-1440.png`](visual-audit/rp2-4-rail-sections-1440.png)。

## FIX-KC-1 · 凭证授权流（据 DBG-2，2026-07-11）

权威：docs/55 FIX-KC-1。落点 `src-tauri/src/lib.rs` + `credentials/client.ts` + 设置页诊断/恢复。

| 项 | 实现 |
|---|---|
| DBG-2.1 trace | `COURTWORK_CRED_TRACE=1` → `~/Library/Logs/cn.courtwork.desktop/credential-probe.log`（1MB 轮转）；默认关；无 secret/source 值 |
| F2 ACL 止血 | save：`delete`（忽略 NoEntry）→ `set` 整组重写 |
| F4 分型 | `failKind`：`user_canceled` / `auth_failed` / `acl_denied` / `missing` / `platform`；诊断导出 `credentialFailKind` |
| F5 恢复 | 设置页 failed 态展示钥匙串密码指引 + 手动删除 `cn.courtwork.desktop.provider` 两项 |
| F6 dev 隔离 | `debug_assertions` → service `…provider.dev`；release 仍 `…provider` |
| 不做 | F1 Developer ID（BUILD-2）；F3 单条目合并 |

验证：Rust 9 单测；desktop Vitest 70；Playwright **90/90**（下限 90）。

## Build 记录（SITE-1 下载区引用）

### BUILD-1 · 0.1.0 base 定形版（2026-07-11）

| 项 | 值 |
|---|---|
| 版本 | **0.1.0**（`package.json` / `tauri.conf.json` / `Cargo.toml` 对齐） |
| 裁切 HEAD | `a964baa`（含 F-1.1 `287ca17` + 复验报告代提交） |
| 构建时刻 (UTC) | `2026-07-11T00:40:44Z` |
| 标识 | `cn.courtwork.desktop` · productName `Courtwork` |
| 架构 | `aarch64`（Apple Silicon） |
| 签名 | **ad-hoc**（`signingIdentity: "-"`；`CodeDirectory flags=adhoc,runtime`；TeamIdentifier 未设） |
| 公证 | **未做**（无 APPLE_ID/TEAM_ID/API_KEY；挂账：正式发行需 Developer ID + notarization） |

**产物路径（本机构建输出，不入 git）**

| 产物 | 路径 |
|---|---|
| App | `apps/desktop/src-tauri/target/release/bundle/macos/Courtwork.app` |
| DMG | `apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.0_aarch64.dmg` |
| 可执行文件 | `Courtwork.app/Contents/MacOS/courtwork-desktop` |

**校验（B 阶段判例：DMG 级哈希不可复现为唯一真理；签名 + 前端内容哈希做确定性校验）**

| 校验 | 结果 |
|---|---|
| `codesign --verify --deep --strict Courtwork.app` | **OK** |
| `codesign --verify --strict` 可执行文件 | **OK** |
| `hdiutil verify` DMG | **VALID**（CRC32 校验通过） |
| 可执行文件 SHA-256 | `1bc04921a0d7079add2e942783a5d0c94b924490b0fcb1b7a98d922892fd9395` |
| DMG SHA-256（本机本趟） | `3eb460953f72805e7aaeb5ef134e27998046014c772971ebaaeb26d3bb656192` |
| 前端 dist 清单 SHA-256（`find dist -type f \| sort \| xargs shasum -a 256` 再 hash） | `e3ad17ebcbaaeffff298b532ee70330e260fd8adac032be10628e50adefe8e94` |

dist 文件级哈希（确定性内容）：

| 文件 | SHA-256 |
|---|---|
| `assets/GraphPanel-COcw8UHa.js` | `5bee450b91d9e6c01c49b269116a2c4741f09f4b700797d6cf19482fad94045b` |
| `assets/index-BhnbIzPD.js` | `1ca6fb9378fba0143ba79e192c359b14a3356daadc318fa69825b39b9000ae91` |
| `assets/index-BJ_am3Ro.js` | `946bea5057385262d78465b8ebc996550727fc2a90531265b9637df5aeca5d7d` |
| `assets/index-DFzbYuJD.css` | `0696faeab653a5322cf4157ac1701589cd3442776b32d882d4bb9dad4dddebde` |
| `assets/index-DuJ_cBxF.js` | `de7f32fb04c81152474c6862034de28f0c56ccbaf619e7add7e7b4b708423c2c` |
| `courtwork-mark.svg` | `674284d99c59879595071b0cce1074874cd57885f92765e60e360de93e557b5e` |
| `index.html` | `f73370c6c4c4c925aa22d97d3e6f878b9d9601fa21718c43d7ee613e18c2744b` |

**构建环境**

| 工具 | 版本 |
|---|---|
| Node | v25.9.0 |
| pnpm | 9.15.0 |
| rustc | 1.97.0 (2d8144b78 2026-07-07) |
| cargo | 1.97.0 (c980f4866 2026-06-30) |
| 主机 | macOS 26.5.2 · arm64 |
| 命令 | `pnpm --filter @courtwork/desktop tauri build --bundles app,dmg` |

**挂账（不冒充已公证发行包）**

- Apple Developer ID 证书与 notarization：正式对外分发前必须补齐；当前产物仅 ad-hoc，适用于本机安装验收与 SITE-1 下载区「开发构建」标注。
- DMG 字节级 SHA-256 因时间戳/元数据可能不可跨机复现；复验以 **codesign 通过 + dist 内容哈希一致 + hdiutil verify VALID** 为准。

## RP-1 desktop 最终重排（2026-07-11，Build 门）

权威：`docs/49` 三/四/五章 + `docs/25` 混排修正 + `docs/32` tokens 纪律 + 批次二 `#11/#12` + 批次三 `#16/#17`。

### A 左栏

- 混排时序列表：案件 / 工作区 / 未归档对话同列；前置图标承载类型（卷宗 / 文件夹 / 气泡）；未归档行尾「存入」；**不分区**；Pinned 在上。
- 仅案件行 chevron 展开 → 阶段 + 三区（工作结构非对话史）。
- 导航骨架四位：产出（真路由 → 工作区级产出目录）；定时 / 派发（`aria-disabled` + 「即将支持」tooltip）；Customize 不做。
- `#17`：主办律师 = demo persona；非 demo 不显示；`CASE_SCOPE_AUDIT` 补行。

### B 右栏模块栈

- 声明渲染折叠栈：通用三件常驻（progress / working folders / context）+ 垂类工作面同栈；默认面板头可见（名称 + 计数 + 状态点）。
- progress 面板头吸收阶段进度 `N/6`（frontier `17 of 17` 形制）；working folders = 三区树（原件只读标记）；context = 用量明细 + 附件来源 + connected 模型 chip。
- `artifact_produced` 自动展开对应模块；用户手动折叠/展开优先于自动。
- Tab / 对照 / 专注不推翻：同栈三种视图密度，增量迁移。

### C 画布-浮面三层

- L0：对话流坐页面底色（冷灰），去卡壳。
- L1：左栏 / 右栏 / composer = 纯白面 + inset 不贴边 + 圆角 12 + 细描边、**零投影**。
- L2：popover 既有（`surface-popover`）。
- 标题栏透明化：wordmark + 全局动作；模型服务常驻状态条；**仅 failed 态**在标题栏浮现琥珀警示。
- 收缩态：左栏折叠 + 右栏全折 → 画布 + composer 浮卡 + 折叠按钮。
- `#16`：model-config 关闭按钮动词直白（「关闭」），主次按钮层级照 docs/32（次要 quiet）。

### Elevation token 提案（实现前写入，供架构过目）

| Token | 提案值 | 用途 |
|---|---|---|
| `elevation.canvas` | `color.bg.app` `#EDEDED` | L0 页面底色 / 对话流地面 |
| `elevation.float` | `color.bg.raised` `#FFFFFF` | L1 浮面填充（左/右/composer） |
| `elevation.floatBorder` | `color.border.hairline` `#EBEBEB` | L1 细描边 |
| `elevation.floatRadius` | `12` | L1 圆角（docs/49 四章；非 `radius.lg` 6 的列表卡） |
| `elevation.floatInset` | `8` | L1 相对画布的 inset 间距（px，4 基阶） |
| `elevation.shellGap` | `8` | 浮面之间水平/垂直缝 |
| `elevation.shadow` | `none` | 硬性：零投影（de-slop #6 / shadow.none） |
| `elevation.titlebar` | `transparent` | 标题栏融入红绿灯 chrome |
| `elevation.warnBg` | `color.semantic.gate.pending.bg` `#FCF6E8` | 标题栏 failed 琥珀警示底（复用既有语义色，不新增色相） |
| `elevation.warnFg` | `color.semantic.gate.pending.fg` `#B45309` | 警示文字 |
| `elevation.warnBorder` | `color.semantic.gate.pending.graphic` `#D97706` | 警示描边 |

纪律：不得引入投影；不得新增语义色相；CSS 只消费 token / CSS 变量。

验证：9 包 build；Vitest 全绿；Playwright 全过且假绿下限随新用例上调；四门禁；e2e 覆盖混排图标与展开、未归档「存入」、progress 面板头计数、artifact 自动展开、标题栏琥珀仅 failed、收缩态。

### RP-1 实现落点（完工自检 2026-07-11）

| 块 | 落点 |
|---|---|
| A 左栏 | `src/rail/CaseRail.tsx` + `types.ts`：混排/Pinned/chevron 展开/导航骨架/存入；#17 `lead-attorney`；**A2** 卷宗计数→展开态 `originals-zone` 滚入/高亮（`focusOriginalsZone` rAF 重试） |
| B 右栏 | `src/modules/*`：progress/working-folders/context + 垂类 Tab 同栈；**B2** context chip 只 `setModelConfigOpen(true)`，与状态条共用同一 popover/`updateModelConfig` |
| C 三层 | elevation 变量；L0/L1；标题栏琥珀仅 failed；收缩态；**C2** 状态条只迁 `N/M` 至 progress 头，用量/摄取/续行/产出/模型原位 |
| #16 | `ModelConfigPopover` 关闭动词「关闭」 |
| #17 audit | `CASE_SCOPE_AUDIT` 补 `rail-footer lead attorney` |
| e2e | `tests/e2e/rp1.spec.ts`（9）；`assert-test-count` floor **87** |
| 截图 | `visual-audit/22-rp1-compact-layout-1440.png` / `23-rp1-full-layout-1440.png` |

Elevation 提案全量（与 tokens.json `elevation` 一致，供架构过目）：

| Token | 值 |
|---|---|
| canvas | `#EDEDED`（bg.app） |
| float | `#FFFFFF`（bg.raised） |
| floatBorder | `#EBEBEB`（border.hairline） |
| floatRadius | `12` |
| floatInset | `8` |
| shellGap | `8` |
| shadow | `none` |
| titlebar | `transparent` |
| warnBg / warnFg / warnBorder | gate.pending 三轨（琥珀，不新增色相） |

## SET-1 设置页（2026-07-11）

规格：docs/46「设置页清单」——分组/条目/路由状态不增不减。

- 入口：标题栏齿轮 `open-settings` + ⌘K「设置」；全局层浮面，容器无关；分组切换 0ms；Esc 关闭。
- 真实：key→D-1 探针；provider/模型/推理→`model-config`；maxUsd→`settings-store`（RuntimeGuard）；默认产出目录+reveal；遥测开关；行为数据 opt-in 确认制+时间戳；数据承诺声明页（docs/28）；版本/许可/诊断导出（无密钥）。
- 预留禁用+tooltip：来源授权、企微/飞书/邮件/企业库、清除偏好、检查更新。
- 明确不出现：主题、语言、skill 管理。

验证：Vitest settings-store；Playwright `settings.spec.ts`；假绿下限 **78**。

## UX-1 微调批次一（2026-07-11）

实现范围：docs/52 #1–#10 + D-1 打回 0a/0b。裁决不重开。

### 0a composer chip 案件作用域

- `App` 注入 `cases` 投影 + `activeCaseId`；禁止非 demo 粘滞 `DEMO_CASE_OPTIONS`。
- 容器切换同步 chip 文案并清空附件；`CASE_SCOPE_AUDIT` 补登 `Composer DEMO_CASE_OPTIONS / case chip`。
- 死路由表补行（下表）；切换矩阵 e2e 断言 chip 不含「临江」。

### 0b e2e 光标依赖

- 统一 `tests/e2e/helpers.ts` → `openWorkbench` 末尾 `page.mouse.move(0,0)`，消除 `onMouseEnter` 抢占初始高亮。

### 批次要点

| # | 落点 |
|---|---|
| 1 | `case-file-count` 点击滚入 `originals-zone` |
| 2 | `container-copy.ts` 双词表；`CaseSummary.kind` |
| 3 | 无容器存入 → `containerize-popover`（创建案件/项目） |
| 4/5 | 平铺上传·chip·发送；`+` 菜单收纳相机/语音/文件夹 |
| 6 | `composer-folder-input` webkitdirectory 批量附件 |
| 7 | `ThinkingStream` 默认折叠 + spark-lines |
| 9 | **结论：G6 minimap 右下角库蓝** → `courtwork-minimap` tokens 压制 |
| 10 | 状态条模型名 → popover 读写 provider/模型/推理强度（标准·深思） |

验证：desktop Vitest **49**；Playwright **74/74**；假绿下限 **74**。

## D-1 真机实测三缺陷修复（2026-07-11）

### 1. 模型连接状态 — 探针驱动三态

| phase | UI 文案 | 条件 |
|---|---|---|
| `pending` | 待连接 | 未配置 |
| `connected` | 已连接 | 钥匙串/内存读取成功 + 格式校验（粘贴 ≥8 字） |
| `failed` | 连接失败 | 授权拒绝 / 格式非法；title 附「钥匙串授权未通过…」等零技术文案 |

- 任何路径不得乐观默认已连接；`save` 失败不关对话框、不写 connected。
- Playwright 三分支 + 短凭证失败：`tests/e2e/d1-case-scope.spec.ts`；Vitest：`credentials/client.test.ts`。
- 测试注入：`window.__CW_FORCE_CREDENTIAL__` / `__courtworkCredentials`（非 demo 装配）。

### 2. demo 语料容器隔离

- `isDemo` / `DEMO_CASE_ID` 标记样板案；角标「样板案·演示」。
- `DEMO_ARTIFACTS` **仅** demo 容器回落；非 demo 工作面/对话为空态虚线框。
- 新建案件 `isDemo: false`，不绑定 demo 根路径。

### 3. 溢出全局审计与修复

| 控件 | 修复 |
|---|---|
| 归档 popover 案名 | `.archive-case-title.truncate` + title tooltip |
| 归档按钮 | 固定 20×20 icon，title 含全案名 |
| 标题栏案名/案号 | activeCase 派生 + truncate |
| 工具栏阶段 crumb | max-width + truncate |
| 凭证按钮 | max-width 200px ellipsis |
| 阶段行 | 主文案 flex truncate |
| 附件 chip / 用户消息文件名 | max-width + ellipsis |
| 数据卡/矩阵/时间线 | 既有 de-slop #11 保留 |

### 4. 死路由 / 容器作用域审计

权威表：`src/case/case-scope.ts` → `CASE_SCOPE_AUDIT`。

| 符号 | 定性 | 处置 |
|---|---|---|
| `DEMO_ARTIFACTS ??` 渲染回落 | 死路由 | 仅 `isDemoCase` 时回落 |
| `caseRoot ?? DEMO_CASE_ROOT` | 死路由 | `resolveCaseRoot` 非 demo 不回落 |
| `DEMO_OUTPUT_*` 直读 | 死路由 | `caseOutputDir(caseRoot)` 派生 |
| 标题栏硬编码临江案 | 死路由 | `selectedCase.title` |
| `flow` / `session` / 处置态 | 应派生 | `selectedCaseId` 切换整体 `__clear__` + 重置 |
| `createDemoClient` 单例 | 合法全局 | 仅 demo 调 replay |
| 凭证 browserStatus | 合法全局 | 本机域非案件域 |
| `Composer DEMO_CASE_OPTIONS` / case chip | 死路由（UX-1 0a 已修） | activeCase 投影注入；随切换重置 |

**容器切换矩阵**（Playwright）：demo(A) 有状态 → 新建 B 零继承（含 composer chip）→ 回 A 恢复 → 再进 B 仍空。

截图：`visual-audit/22-d1-credential-failed-1440.png` / `23-d1-new-case-empty-1440.png`。

验证（D-1 当时）：desktop Vitest 45；Playwright 67/67。**UX-1 后见上节 49 / 74。**

## 定位

三栏工作台：左 = 案件/session 列表（一案一文件夹一持续上下文）；中 = 对话流 + 场景卡片（按钮是主入口，聊天框是兜底）；右 = 结构化交互（时间线 / 关系图谱 / 矩阵审阅 / 修订预览 / 起草画布，全部可点击溯源回原文）+ 确认节点交互。

## 已定约束（Design 阶段的输入）

- 壳选型倾向 Tauri v2（docs/05 结论），Design 阶段最终定
- UI 是 core 事件流协议的纯客户端，不含业务逻辑
- 前端组件基线：vis-timeline / AntV G6 / AG Grid Community / react-pdf-highlighter（license 已核，见 docs/05）
- 每个关键产出节点留人确认（交互护栏，产品纪律）
- 所有对 artifact 的修正是 schema 级操作，经 core 落 RevisionEvent

## B 阶段实现记录

- 完整工作台帧：40px 标题栏、40px 工具栏、三栏等高面板头、32px 全宽状态条；1280/1440 窗口策略无横向溢出。
- 右栏五工作面全部实现：事件时间线、可选择关系图谱、10×7 合同矩阵、风险主从审阅 + Word 修订预览、起草画布与显式单向冻结仪式。
- UI 通过 `SessionEventClient` 只消费 `SessionEvent` 与确认/续行接口；事件投影器只做判别联合的机械映射。demo 装配点回放 S1/S3 录制事件，样板案 artifact 直接来自 `packages/demo-data`。
- 信源角标只从 `artifact_produced.evidenceGrades` 按确认接口提供的稳定 evidence key 读取，组件不按 citation、文件名或内容推断等级。
- 分层确认资格由确认接口的 `ReviewGateProjection` 提供；壳只渲染 `batch` / `individual`。高危与未核验示例均逐条展开后才解锁；批量范围明确枚举并排除二者。
- 生成说明使用常规 sans + `provenance.generatedBg` 无线 callout；核验原文使用 `provenance.verifiedBg` + citation/编号 mono。结构化数据容器始终纯白；法理之线只在右栏白名单场景按红/琥珀/蓝/绿/灰处置态出现，普通卡无线。
- W6.1 尚未落地：三个已拍板遥测事件名已在 `ReviewTelemetryEvent` 建模，打开条目/展开依据/提交处置三个发射点已接，demo sink 为有注释的空实现，未越界修改 core。
- Tauri v2 capability 仅 `core:default`，无 shell、文件系统、网络、对话框或外部程序插件权限；只新增应用内部的系统凭证库命令（状态/保存/移除），不对 WebView 暴露读取明文凭证的命令。CSP 继续显式收紧。

## UX polish 实现记录（2026-07-10）

### 空间与交互物理

- Split-Tab Grid：五工作面默认 Tab 切换；对照默认上下对切，分割条支持指针拖动与键盘 5% 步进；窗口达 1600px 解锁左右对切。启动对照后左栏固定收为 48px 图标条、中栏收为 280–300px，Playwright 在 1440px 视口实测右栏增宽不少于 200px；“复位”恢复三栏、50/50 与默认方向。
- 缩放沙盒：只有关系图谱响应 Ctrl/Cmd+滚轮连续缩放和指针平移，带 G6 minimap、加减与适应窗口控件。P-3 已用 G6 5.1.1 + 内置 dagre 取代手排坐标，默认视野全量渲染 14 节点 / 15 边。时间线、矩阵、修订预览、起草画布用 non-passive wheel 拦截 Ctrl/Cmd+滚轮，零 transform、零视口缩放。
- 验收缺口销账：临界用量已接 `ContinuationClient.continueSession`的“继续本案工作”；图谱连线坐标已统一；其余三项见下文。

### B 阶段三项回归修复

- 起草画布改为结构化渲染态编辑：编辑 DOM 与无障碍树只有文书标题/段落，不出现 `## ` 等源标记；冻结后仍为显式单向编译。
- 时间线法理之线直接消费 `TimelineEvent.markers.includes('contradiction')`；不再读 `description` 判语义。回归用 `evt-24`（文本无“矛盾”、有 marker）与 `evt-25`（文本有“矛盾”、无 marker）反向锁定。
- 批量门禁按 core SPEC 拍板改为逐条响应：`buildReviewResolution` 以门禁的稳定 `itemRef` 输出每项 `confirm/reject/revise`，未处置完整时拒绝生成响应；“批量确认”仅是 UI 聚合手势。单测覆盖混合处置，Playwright 覆盖批量 4 项 + 驳回 1 项 + 修正 1 项的逐条提交。

### Provider 凭证边界

- 首启以“连接文书助手”办案话术引导，只允许用户显式粘贴访问凭证或填写电脑已有凭证名称；不扫描任何第三方配置。粘贴框始终 `type=password`，配置后界面只显示“已连接”。
- Tauri Rust 侧使用 `keyring` 的平台默认安全凭证库（macOS Keychain / Windows Credential Manager / Linux Secret Service）；粘贴值只在 Rust 保存命令中写入。指定电脑已有凭证时，只记住用户填写的名称并当场验证可用，不复制其值。
- WebView 只有 `status/save/clear` 三个命令，无读取明文命令；错误文本不包含凭证或系统路径。Rust 测试锁定 status 序列化仅有 `configured/source`；Playwright 锁定凭证不进 DOM 文本、console、localStorage 或 sessionStorage。审计确认凭证代码路径不调用 SessionEvent 客户端与审阅遥测 sink。

### de-slop 12 条销账

| # | 实现结果 |
|---|---|
| 1 | 静默线移除；`SignatureLine` 无 tone 直接不渲染，只保留红/琥珀/蓝/绿/灰五色封闭集。灰只表达已驳回。 |
| 2 | 进度、依据栈、矩阵与列表内层改水平分割线/Tabular Layout，静态嵌套卡影和多层圆角清零。 |
| 3 | 操作图标统一为 1.35px `currentColor` 线框 SVG，默认板岩灰，无填充与装饰性彩色。 |
| 4 | 列表项 padding-y 6px，数据行 5px，密集行高 28–34px 回归锁定。 |
| 5 | 微按钮/标签 2–4px，卡与输入 6px，弹层 6px，全局无超出 8px 的非圆形圆角。 |
| 6 | 全局 `box-shadow:none`；静态面板、卡、弹层全部依靠 1px 描边与底色差分层。 |
| 7 | `.app-shell` 全域 `font-variant-numeric:tabular-nums`，日期/案号/金额/编号另叠 mono。 |
| 8 | 色彩全部取 `tokens.json` 现有色值；不采 docs/35 第 8 条的示例映射扩展色义。 |
| 9 | 数据区无自发动效；P-2 已将 hover 全站统一为 120ms ease-out，并保留长任务已拍板呼吸点；语义状态仍 0ms 硬切。 |
| 10 | 各工作面无数据时统一文字 + 1px 虚线框 + 快捷键引导，无插画资产。 |
| 11 | 案件名、风险文本、文件名和矩阵单元格单行省略；图谱画布通用裁去公司法定后缀，右侧主体/关系索引以 `title` 保留完整文本。 |
| 12 | 全局 5px 滚动条，静止透明，hover 显示 `border.strong` 滑块。 |

### 逐屏视觉走查（固定截图）

| 截图 | 走查结论 |
|---|---|
| [`00-provider-first-run-1440.png`](visual-audit/00-provider-first-run-1440.png) | 首启文字引导，凭证框掩码，无插画/投影/技术概念文案。 |
| [`01-s3-revision-1440.png`](visual-audit/01-s3-revision-1440.png) | 风险主从台仅语义线发光，内层依据用分割线，10 行级密度无横向溢出。 |
| [`02-s1-timeline-1440.png`](visual-audit/02-s1-timeline-1440.png) | 无 marker 行无线，marker 行琥珀线；日期/编号等宽，长文本省略。 |
| [`03-s1-graph-1440.png`](visual-audit/03-s1-graph-1440.png) | 默认适配全节点，连线精确指向节点中心，缩放控件与 overview 仅存于图谱。 |
| [`04-matrix-1440.png`](visual-audit/04-matrix-1440.png) | 10×6 首屏可见，数据行 30px，纯白表格 + 1px 网格线。 |
| [`05-draft-1440.png`](visual-audit/05-draft-1440.png) | 文书纸面绝对静止，编辑态显示标题/段落而非 Markdown 源符号。 |
| [`06-split-rows-1440.png`](visual-audit/06-split-rows-1440.png) | 默认上下对切；左栏 48px 图标条、中栏紧凑态和一键复位均可见。 |
| [`07-split-columns-1700.png`](visual-audit/07-split-columns-1700.png) | 1700px 解锁左右对照，起草与时间线均保留可读行宽。 |

## P-1 法理之线语义收敛微补丁（2026-07-10）

- 权威规格与 token 已收敛为处置状态单维：高危待处理红、未核验琥珀、已修订未确认蓝、已确认绿、已驳回灰；中/低危待处理无线，严重度只由等级徽章表达。
- P-1 增补按使用域白名单落地：法理之线只进入右栏风险处置、修订预览、时间线矛盾行、确认门禁卡；中栏 D/E 芯片与 AI callout 零线，icon 固定品牌中性色。`lint:signature` 同时锁定白名单、五色封闭集与 icon 不随状态变色。
- UI 只从门禁处置与事件流提供的 evidence grade 计算线态。Playwright 锁定 R5 低危待处理无线、中危 R2 确认转绿、中危 R4 驳回转灰。
- 恢复被删除的状态圆盘用量明细回归，并按当前 S3 演示值锁定卷宗/对话/可整理内容；所有 `font` 简写点显式恢复 `font-variant-numeric: tabular-nums`，避免全域数字特性被静默重置。
- 修复前后截图：[`08-p1-signature-before-1440.png`](visual-audit/08-p1-signature-before-1440.png) / [`09-p1-signature-after-1440.png`](visual-audit/09-p1-signature-after-1440.png)。修复后同屏可见 R2 绿、R4 灰、R5 无线。
- `pnpm --filter @courtwork/desktop test:e2e`：20/20 通过，假绿下限同步升至 20；定向生产构建通过。

## P-2 交互反馈与空路由收尾（2026-07-10）

- 时长阶梯全站落地：按钮按压 70ms、hover 120ms ease-out、Tab 指示器 100ms / 内容 0ms、面板对切 0ms、确认/驳回本体 0ms + 150ms border-color 光效层、续行回执 240ms。
- 确认/驳回光效由 Web Animations API 驱动独立叠加层；其余反馈用 CSS transition/keyframes。新增 `lint:motion` 静态门禁并接入 `test:e2e`，只放行 transform / opacity / background-color / border-color。
- 续行入口落定后保留原位并转禁用态，240ms 回执只动 opacity + `translateY(4px→0)`；未引入任何 motion 依赖。

### 逐路由走查清单

| 结构位 / 路由 | 走查结果 | 空缺处置 |
|---|---|---|
| 三栏帧 + 案件列表 | 标题栏、工具栏、三栏、状态条永久保留；对照态只收窄左/中栏 | 无数据时沿用文字 + 虚线框空态，不隐藏栏位 |
| 时间线 | Tab 永久保留，事件列表/详情正常 | 卷宗原件尚未连接时，原文定位保留禁用入口 + tooltip |
| 关系图谱 | Tab、G6 图谱沙盒、主体/关系列表永久保留 | 节点点击取首条关联边的 SourceAnchor、边点击取自身 SourceAnchor；卷宗原件未连接时保留禁用定位入口 + tooltip |
| 矩阵审阅 | Tab、表头、10×7 网格永久保留 | 原文定位未接通，单元格按钮禁用并在图例/tooltip 说明门槛 |
| 修订预览 | Tab、风险主从台、文书预览永久保留 | 已实现门禁处置，无空路由 |
| 起草画布 | Tab、编辑纸面、冻结仪式永久保留 | Word 文件尚未生成到本机时，“打开 Word 文档”保留禁用入口 + tooltip |
| 工具栏与输入区 | 模型服务入口可打开首启引导 | 审阅记录、导出审阅稿、自由输入均保留原位，以禁用态 + tooltip 如实声明未接通 |

Playwright 逐一切换五工作面并核对对应内容可见，同时抽查工具栏、自由输入、矩阵与时间线的禁用入口和说明；假绿下限升至 24。

### 八禁自查

| # | 自查结论 |
|---|---|
| 1 整卡/整行位移缩放 | 通过：按压回归同时锁定按钮与数据卡 `transform:none`。 |
| 2 弹簧回弹 | 通过：依赖与源码扫描无 spring / motion，实现只用 ease-out。 |
| 3 spinner 裸奔 | 通过：源码无 spinner；既有长任务仍为骨架呼吸/事件流进度。 |
| 4 状态本体淡入淡出 | 通过：门禁徽章与法理之线 `transition:none/0s`，150ms 仅存在于独立边色光效层。 |
| 5 Tab crossfade | 通过：`.view-content` 无 transition/animation，只有指示器 transform 100ms。 |
| 6 hover 阴影升起 | 通过：全站 `box-shadow:none`，hover 仅背景/边色。 |
| 7 动画 layout 属性 | 通过：`lint:motion` 扫描 CSS transition/keyframes 与 WAAPI，只允许四类属性。 |
| 8 入口物理消失重现 | 通过：五 Tab / 三栏帧常驻；续行、工具栏、输入、溯源空缺均保留原位禁用并说明。 |

视觉对照：[`10-p2-feedback-before-1440.png`](visual-audit/10-p2-feedback-before-1440.png) / [`11-p2-feedback-after-1440.png`](visual-audit/11-p2-feedback-after-1440.png)。修复后可见 Tab 指示器及审阅记录/导出/自由输入的诚实禁用态。

验证：`pnpm --filter @courtwork/desktop test:e2e` 24/24、Vitest 6/6、`pnpm lint`、desktop 生产构建、`lint:motion` 全部通过。

## P-3 关系图谱量产化（2026-07-10）

- 渲染栈切换为 AntV G6 5.1.1，默认只注册 Rect / Polyline / dagre / DragCanvas / Minimap 五项可见运行扩展，并补齐 G6 运行时强制要求的五项内部 transform；布局固定为 G6 内置 dagre 横向层次视图，未自研布局、未预做 force/ELK/sigma.js/Observable Plot/ECharts Stage 2。
- `packages/demo-data/data/artifacts/party-graph.json` 的 14 节点 / 15 边全部进入 G6 数据图。画布用通用法定后缀压缩保证首屏可读，右侧索引保留完整名称；Playwright 读取 dagre 产出的中心坐标与 160×44 节点几何，逐对断言节点/标签零重叠。
- 缩放/平移、minimap、加减与适配控件仍封闭在图谱面板；节点与边都可选中并落到既有 SourceAnchor 依据区。节点不擅造新锚点字段，而是使用首条关联边的结构化来源。
- G6 主题完全覆盖库默认 node/edge/combo 皮肤，颜色由 `tokens.json` 映射到 `graphTokens`，节点 1px 描边、浅色唯一、动画关闭；`lint:graph` 静态核对 token 值、边色封闭集、结构化 marker、按需注册和工作面懒加载。
- `[需架构拍板]` 当前 `PartyEdgeSchema` 没有 `markers`（或等价矛盾结构字段），demo e-14/e-15 只有 relationType 自由文本。实现已预留只读可选 `markers.includes('contradiction')` 消费路径并映射琥珀边，但**没有**按文案或边 ID 猜测，因此当前 demo 的结构化矛盾边计数为 0；待架构给出确切字段/语义后再补 schema 与 fixture。

### 包体积实测

| 构建形态 | 首屏主 chunk（raw / gzip） | 图谱懒加载 chunk（raw / gzip） |
|---|---:|---:|
| P-3 前基线 | 277.12 / 81.26 kB | — |
| G6 官方全预设探针 | 275.01 / 80.75 kB | 1,418.06 / 409.58 kB |
| P-3 最终按需注册 + tree-shaking | 275.03 / 80.76 kB | 821.14 / 234.83 kB（图谱 + 必需 transform） |

图谱代码经 `React.lazy` 只在打开关系图谱工作面时下载，首屏主 chunk 未增长；相对全预设探针，图谱路由总 chunk raw 减少 42.1%，gzip 减少 42.7%。生产构建仍提示单 chunk 超过 500 kB raw，已如实保留，Stage 2 再按既定量级判据评估进一步拆分。

视觉对照：[`12-p3-graph-before-1440.png`](visual-audit/12-p3-graph-before-1440.png) / [`13-p3-graph-after-1440.png`](visual-audit/13-p3-graph-after-1440.png)。修复前只手排 10 节点 / 12 边；修复后 14 / 15 全量、dagre 自动分层、minimap 与完整主体/关系索引同屏。

验证：`pnpm --filter @courtwork/desktop test:e2e` 26/26；G6 定向 3/3；`lint:graph`、`lint:signature`、`lint:motion`、desktop 生产构建通过；1440 实机复核控制台零 warning/error。

## Composer 输入区整备（2026-07-10）

规格：`docs/45-调研报告-composer输入区惯例.md`（架构审定）+ 工单裁决。实现位：`src/composer/`。

### 交付对照

| 裁决 | 落地 |
|---|---|
| 按钮族平铺不聚合 | 上传（曲别针）/ 案件文件夹 chip / 发送；拍照·扫描与语音常驻 `aria-disabled` + tooltip（模板「即将支持 · 当前可通过…」） |
| Lucide 隐喻 + stroke 1.35 | P-4 已改为 `lucide-react` 1.x 静态具名导入，全局 `LucideProvider` 锁定 `strokeWidth=1.35`；不再维护 TSX 内联路径 |
| 附件文件名 chip | 类型图标 + 中间截断文件名 + 移除；失败内联重试；2–5s 边框微光（`chip-glow` 1800ms opacity）；>5s 进度文案位；成功/失败 0ms 硬切 + 150ms border-color 光效层 |
| 仅本条 vs 存入卷宗 | 默认仅本条；徽章 → popover 轻确认 → 硬切绿「已存入卷宗」；无反向操作 |
| 拖放 / 粘贴 | 全窗 overlay 提示落点（工单覆盖 docs/45 输入框高亮建议）；⌘V 文件进 chip；纯文本粘贴走 textarea |
| Enter / Shift+Enter + KBD | IME `compositionstart/end` 防误发；底部 `⏎ 发送 · ⇧⏎ 换行`（typography-density §五） |
| reading-view 路由 | `convertToReadingView` 真实调用；`needs_ocr` / `disabled` → chip 失败态办案语言（零 OCR/API 黑话） |
| 协议客户端 | 发送只写入中栏本地消息呈现；不新增 SessionEvent 业务逻辑 |

### 跨包支撑（浏览器可打包）

`@courtwork/reading-view` 原依赖 `node:crypto` / `Buffer`，desktop 打包失败。本工单在 reading-view 内改为纯 DataView + FNV 短哈希（**语义不变：漂移检测用短哈希，非安全用途**），reading-view 136 例回归全绿。属「授权消费方接通」所需的实现级适配，非契约变更。

### 验证

- Vitest（desktop）：17/17（协议 6 + composer 11）
- Playwright：31/31（下限升至 31）；新增 `tests/e2e/composer.spec.ts` 5 例覆盖按钮态 / chip 生命周期与作用域 / 键盘 / 拖放粘贴 / needs_ocr 失败态
- `lint:motion` / `lint:signature` / `lint:graph` / 生产构建通过
- 截图：[`14-composer-input-1440.png`](visual-audit/14-composer-input-1440.png)

## P-4 SVG 图标体系与模型编写规范（2026-07-10）

- 通用图标切换为 `lucide-react` 1.24.0（ISC）静态具名导入；应用根与独立审计页都用 `LucideProvider` 将描边锁定为 1.35px。原 `Icon.tsx` 手排路径表及并发新增的 archive/copy/check/focus 内联 SVG 已全部替换；本批 Lucide 无缺口，未引入 Tabler。
- 权威工程规范见 [`docs/32-设计语言包/svg-standards.md`](../../docs/32-设计语言包/svg-standards.md)：24×24 网格、1.35px / `currentColor` / 禁 fill 和内联色、元素/属性白名单、形状命名、SVGO 4 multipass 与 16px/24px 人审纪律均已成文。
- docs/44 的 17 个领域概念已建库；其中门禁一行展开为待处理/已确认/已驳回三态，因此落地 19 个形状命名 SVG。`manifest.json` 登记法律用途，生成模块同时导出可 tree-shake 的具名组件与审计用 registry，产品壳不因建库而全量携带尚未使用的领域图标。
- `verify-icons.mjs` 为自写 CI 门禁：检查根属性、标签/属性白名单、色值/fill/脚本禁止项、两位精度、SVGO 漂移、manifest 一一对应、生成物漂移、全 `src/**/*.tsx` 无内联 SVG、Lucide 静态导入与 Tabler 边界；已接入 `test:e2e` 前置链。
- 完整 16px/24px 审计板：[`15-p4-icon-audit-1280.png`](visual-audit/15-p4-icon-audit-1280.png)。人审确认 19 个变体在 16px 仍可辨，门禁三态与生成/核验双通道不混淆。

### Lucide 按需打包实测

| 形态 | 首屏主 chunk（raw / gzip） | 图谱懒加载 chunk（raw / gzip） |
|---|---:|---:|
| 当前 HEAD、P-4 前基线 | 960.32 / 292.93 kB | 817.42 / 233.29 kB |
| P-4 最终（Lucide 具名导入 + 领域图标不入首屏 registry） | 962.61 / 294.25 kB | 817.43 / 233.30 kB |

首屏实增 2.29 kB raw / 1.32 kB gzip；图谱 chunk 只有 0.01 kB 计量波动。基线在同一 HEAD 独立 worktree 重装/构建，避免把并发 F-2 的体积算入 P-4。

验证：`icons:build` 与 `lint:icons` 通过；Vitest 26/26；Playwright 38/38；`pnpm lint` 和 desktop 生产构建通过。Base UI 未触发，未新建 `packages/ui`。

## F-4 文件操作分级与卷宗整理（2026-07-10）

规格：docs/47。交付：

| 层 | 内容 |
|---|---|
| schemas | `FileOpsPlan` + CaseFile `originalFileName`/`contentHash`；动词无 delete |
| tools | copy/mkdir 无损级；FileOpsPlan 执行器 + 事务日志撤销（字节一致） |
| registry | S6 卷宗整理（产出 FileOpsPlan，门禁计划确认） |
| desktop | 计划表 / 执行报告 / 撤销 popover；原件区原名留痕 |

验证：tools 204 例；Playwright file-ops 3 例；假绿下限 60。

边界（验收补充，如实声明）：F-4 演示宿主为内存 FS（`file-ops-demo.ts` 的 `createMemoryFileOpsHost`，与 F-3 mock 同构）——计划／执行／撤销／字节一致均在内存验证，不触真实磁盘；真磁盘 / Tauri `FileOpsHost` 装配为已知后续（`file-ops-host.ts` 已留「Node 真 FS / 未来 Tauri」注入点），不阻塞本批。

## F-2 全局动词补全（2026-07-10）

规格：docs/46 十项裁决（1/3/6/7 + callout 复制）。五项均落地：

| 项 | 状态 | 落点 |
|---|---|---|
| ⌘K 命令面板 | 真实实现 | `command-palette/`：场景+案件+新建/归档/专注/打开产出文件夹；Meta/Ctrl+K；Esc 关闭 |
| 新建案件 | 真实实现 | 左栏 + ⌘K；`NewCaseDialog` + `webkitdirectory` |
| 归档 | 真实实现 | `ArchiveConfirmPopover` 轻确认，可逆，无删除 |
| 专注模式 | 真实实现 | 条件渲染卸装左中栏，Esc 退出，0ms 硬切 |
| callout/数据卡复制 | 真实实现 | `CopyButton` hover 显现，70ms 按压 |

验证：Playwright global-verbs 21 例 + 全仓 57/57；截图 [`19-f2-command-palette-1440.png`](visual-audit/19-f2-command-palette-1440.png) / [`20-f2-focus-mode-1440.png`](visual-audit/20-f2-focus-mode-1440.png) / [`21-f2-archive-popover-1440.png`](visual-audit/21-f2-archive-popover-1440.png)。

## F-3 最小 work 能力包（2026-07-10）

规格：docs/23 双轨增补 + docs/47 无损级 + docs/46 先登记。实现位：`packages/tools`（case-path / system-open）+ `apps/desktop/src/system/`。

### 交付对照

| 项 | 落地 |
|---|---|
| reveal-in-folder / open-file | tools 契约 + 案件文件夹白名单；越界 `adapter_error` 可见报错；宿主仅 opener 两动词，永无 shell |
| UI 双路径 | 产出 docx 卡「在访达中显示/打开文件」+ 状态条「打开产出文件夹」；反馈「已在访达中显示」「已为您打开〔文件名〕」 |
| 工作稿轨 | 「工作稿」子目录 md/txt；复用 contentEditable 画布 + 自动保存；左栏入口 |
| 原件只读 | `assertWorkDraftWritable` 结构性拒绝原件/产出写入；左栏原件区 `data-readonly`、无编辑入口（Playwright 锁定） |
| Tauri | `tauri-plugin-opener` + capability 仅 `allow-open-path` / `allow-reveal-item-in-dir` |
| 浏览器打包 | desktop 只 import `@courtwork/tools/{case-path,system-open,contract}` 子路径，不拉 web-fetch 的 `node:net` |

### 验证

- tools：193 例（+24）
- desktop Vitest：35/35；Playwright：42/42（假绿下限 42）
- 截图：[`16-f3-reveal-feedback-1440.png`](visual-audit/16-f3-reveal-feedback-1440.png) / [`17-f3-work-draft-1440.png`](visual-audit/17-f3-work-draft-1440.png) / [`18-f3-originals-readonly-1440.png`](visual-audit/18-f3-originals-readonly-1440.png)

## 验证记录

- `pnpm --filter @courtwork/desktop build`：TypeScript project build + Vite 生产构建通过。
- `pnpm --filter @courtwork/desktop test`：协议录制/回放原测试未改，加逐条门禁响应单测，6/6 通过。
- `pnpm --filter @courtwork/desktop test:e2e`：Playwright 17/17 通过；运行前假绿防护核对用例数，下限 17。
- `pnpm lint`：全仓零 error。
- `pnpm --filter @courtwork/desktop tauri build --bundles app,dmg`：Rust release 编译通过，生成 ad-hoc 签名的 `Courtwork.app` 与 `Courtwork_0.1.0_aarch64.dmg`。
- `cargo test`：凭证状态输出不含 secret/value 字段，1/1 通过。
- `codesign --verify --deep --strict`、`hdiutil verify` 均通过；打包后 `Courtwork.app` 实际启动进程存活。可执行文件 SHA-256：`c10809386eb7fed8a9df2991e24dd4f416a7f815cd443d8d8780807ed0809394`。

探索性 QA：computer use 类 agent（Codex / Claude）按场景剧本自由操作找断点，出缺陷报告，不做回归基础——按 docs/10 届时另立 spike 工单。

## TODO（跨层放入区）

## RP-2.5 — Frontier 壳与垂类 Preview 解耦（2026-07-11）

### 规格提案（架构批复 `c17f392`）

- **双宿主**：`UtilityRail` 只承载进度、工作文件夹、上下文等领域无关能力；`PreviewHost` 是按场景声明 `uiTemplateId` 挂载 renderer 的领域无关宿主。法律五工作面是首个 renderer 集，不是宿主内建语义。
- **物理边界**：`utility/**` 与 `preview/renderers/**` 禁止互相 import；`PreviewHost.tsx` 禁法律词汇。`lint:preview` 进入 E2E 前置门禁。
- **状态形态**：基础态为三张独立 Cowork 式能力卡；预览态将能力卡收成顶部 dock，Preview 占据余下空间。既有五工作面行为只迁移结构，不放宽语义断言。
- **通用浮面接口**：L1 外壳统一消费 `SurfaceCard` 与 `elevation.shadow`；组件内禁止裸写阴影，hover 永不抬升，数据卡与阅读区继续零投影。
- **响应式**：场景条宽态显示三项 +「更多」，窄态两项 +「更多」；发送键不可裁切，chat/右栏保持 token 化 8px 间隙。1600px 起免责声明单行，以下允许整体换行，feedback 链接保持原子 nowrap。
- **设置**：L2 居中 modal；导航宽 280–320px，内容按行与分隔线排版；1180px 保证 `scrollWidth <= clientWidth`。
- **消息层级**：用户消息右对齐、浅中性底、最大 78%；agent 内容直接落画布，保留 artifact 卡，不造 agent 气泡。

验收矩阵覆盖 1180/1240/1440/1600：控件边界、免责声明、双宿主切换、设置 modal、import 守卫与全页横向溢出；Playwright floor 只升。

### 实现与验证记录

- `SurfaceCard` + 单一 `elevation.shadow` token 已落地；Utility 基础态、Preview、设置 modal 共用外壳，数据区与 hover 无投影变化。
- `UtilityRail` / `PreviewHost` / `WorkbenchPreviewRenderer` 已物理拆分；基础态三能力卡与 Preview 顶部 dock 可互切，五工作面行为和空态保持。
- 场景区、composer、免责声明、用户消息层级与设置页完成响应式收口；1180 自动收左栏，1600 免责声明单行。
- 门禁：`lint:preview`、Vitest 70/70、Playwright 107/107（floor 107）、全仓 `pnpm -r build` 通过。
- visual-audit：`29-rp25-dual-host-1180.png`、`30-rp25-dual-host-1440.png`、`31-rp25-dual-host-1600.png`、`32-rp25-settings-1180.png`、`33-rp25-utility-base-1180.png`。

## RP-2.5.1 — 验收补丁与 de-slop #6 阴影提案（2026-07-11）

### 阴影修宪提案（待架构过目后落 token）

- 候选 `--elevation-shadow`：`0 1px 2px rgba(10, 37, 64, 0.045), 0 4px 12px rgba(10, 37, 64, 0.035)`。两层均取既有 ink 藏青，近层只收边、远层仅 4px 下移与 12px 模糊；无 hover 增强、无位移。
- 唯一消费白名单：左侧 `CaseRail`；右侧收敛 bar；右侧 `UtilityRail` 卡/dock；`PreviewHost`。全部经 `SurfaceCard elevation="raised"` 或既有 rail 外壳消费。
- 永久零影：L0 chat、composer、artifact/data card、文书预览、设置 modal、popover、图谱与其他数据区。
- `lint:elevation` 扫描组件 shadow 字面量、CSS 非 token 值与消费白名单漂移。具体值获批前 token 保持 `none`。

### 补丁行为

- 四档重叠验收改用 bounding-box：composer/send/provider 右缘不超过 chat 右缘，chat 与右栏坐标差为 8px；`scrollWidth` 仅保留作溢出检查。
- `artifact_produced` 直接驱动 PreviewHost；手动关闭按“案件+场景”记忆，同场景重产不强开，切场景后新 artifact 可自动打开。
- model-config 长期回归覆盖打开、单实例、无遮挡、改配置及 reload 持久化。

当前验证：`lint:elevation` 通过；RP-2.5 定向 10/10；Playwright 全量 110/110（floor 110）；全仓 `pnpm -r build` 通过。视觉证据：`34-rp25-1-shadow-none-1440.png`（候选值落地前基线）、`35-rp25-1-model-popover-1180.png`。

- W6.1 最小审阅遥测事件进入 core 后，将 `ReviewTelemetryEvent` 本地兼容类型替换为 core 导出并把空 sink 接到正式事件记录；事件名与字段边界已按裁决预埋。
- 正式发行需配置 Apple Developer ID 与 notarization；当前 ad-hoc 签名产物用于本机安装验收，不冒充已公证发行包。
