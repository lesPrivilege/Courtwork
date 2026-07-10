# SPEC: apps/desktop（W9）

状态：P-1 / P-2 实现完成，等待架构会话比例抽查（2026-07-10）

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
- 生成说明使用常规 sans + 蓝 tint 4px callout；核验原文使用 `provenance.verifiedBg` + citation/编号 mono。结构化数据容器始终纯白；法理之线仅在红/琥珀/蓝/绿语义态出现，贴边通高 2px，普通卡无线。
- W6.1 尚未落地：三个已拍板遥测事件名已在 `ReviewTelemetryEvent` 建模，打开条目/展开依据/提交处置三个发射点已接，demo sink 为有注释的空实现，未越界修改 core。
- Tauri v2 capability 仅 `core:default`，无 shell、文件系统、网络、对话框或外部程序插件权限；只新增应用内部的系统凭证库命令（状态/保存/移除），不对 WebView 暴露读取明文凭证的命令。CSP 继续显式收紧。

## UX polish 实现记录（2026-07-10）

### 空间与交互物理

- Split-Tab Grid：五工作面默认 Tab 切换；对照默认上下对切，分割条支持指针拖动与键盘 5% 步进；窗口达 1600px 解锁左右对切。启动对照后左栏固定收为 48px 图标条、中栏收为 280–300px，Playwright 在 1440px 视口实测右栏增宽不少于 200px；“复位”恢复三栏、50/50 与默认方向。
- 缩放沙盒：只有关系图谱响应 Ctrl/Cmd+滚轮连续缩放和指针平移，带 overview 小地图、加减与适应窗口控件。节点与 SVG 连线改为同一 720×460 世界坐标系，默认视野可见全部 10 个节点。时间线、矩阵、修订预览、起草画布用 non-passive wheel 拦截 Ctrl/Cmd+滚轮，零 transform、零视口缩放。
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
| 1 | 静默/中性线移除；`SignatureLine` 无 tone 直接不渲染，只保留红/琥珀/蓝/绿 2px 语义线。 |
| 2 | 进度、依据栈、矩阵与列表内层改水平分割线/Tabular Layout，静态嵌套卡影和多层圆角清零。 |
| 3 | 操作图标统一为 1.35px `currentColor` 线框 SVG，默认板岩灰，无填充与装饰性彩色。 |
| 4 | 列表项 padding-y 6px，数据行 5px，密集行高 28–34px 回归锁定。 |
| 5 | 微按钮/标签 2–4px，卡与输入 6px，弹层 6px，全局无超出 8px 的非圆形圆角。 |
| 6 | 全局 `box-shadow:none`；静态面板、卡、弹层全部依靠 1px 描边与底色差分层。 |
| 7 | `.app-shell` 全域 `font-variant-numeric:tabular-nums`，日期/案号/金额/编号另叠 mono。 |
| 8 | 色彩全部取 `tokens.json` 现有色值；不采 docs/35 第 8 条的示例映射扩展色义。 |
| 9 | 数据区无自发动效；P-2 已将 hover 全站统一为 120ms ease-out，并保留长任务已拍板呼吸点；语义状态仍 0ms 硬切。 |
| 10 | 各工作面无数据时统一文字 + 1px 虚线框 + 快捷键引导，无插画资产。 |
| 11 | 案件名、风险文本、图谱节点/关系、文件名和矩阵单元格单行省略，`title` 提供完整文本。 |
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
| 关系图谱 | Tab、图谱沙盒、关系列表永久保留 | 主体详情与原文定位未接通，保留禁用入口 + tooltip |
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

- W6.1 最小审阅遥测事件进入 core 后，将 `ReviewTelemetryEvent` 本地兼容类型替换为 core 导出并把空 sink 接到正式事件记录；事件名与字段边界已按裁决预埋。
- 正式发行需配置 Apple Developer ID 与 notarization；当前 ad-hoc 签名产物用于本机安装验收，不冒充已公证发行包。
