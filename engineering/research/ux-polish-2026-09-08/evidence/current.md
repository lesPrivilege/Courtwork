# CourtWork polish current inventory

审阅范围：只读检查 <isolated-checkout> 的 claude/wsk-integration 当前源码，以及 fresh checkout 的当前 WSK 工单/回执。
固定产品快照：整合分支 272680519b9faa4f896b68b46888c247662d6991（HEAD，2026-09-09）。
fresh 基线：f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd。
整合 worktree 当前只有 evidence/rc/*.json 修改；未读私有运行数据。
本轮没有启动 8857、没有浏览器、没有运行测试，也没有改源码、提交或推送。
以下“已存在”是源码事实；“待验证”不等同于像素通过。

> Astra限定复核：对固定2726805源码忽略注释/字符串后检查花括号，唯一未闭合块确认为第2840行desktop media；尚未运行CSSOM/浏览器复核，也未改活动writer源码。此缺口先于后续像素判断；合流时若已有修复，以新SHA重新核对。卷内工单与作者日期保留来源记录。

## 1. 当前交付形状

1. 整合分支包含 Home/brand、Runtime Control Plane UI、三层色彩治理和 polish 层。
2. 主要新增或改动：app/web/runtime-view.mjs（1130 行）、app/web/styles.css、app/web/app.mjs、app/web/index.html。
3. 现有 surface 仍是固定 preview、runtime、run、file 四类；app.mjs:2879-2896 逐类切换 tab/content。
4. 这不是通用 Expert/Preview 编排器交付；WO-WK10 仍是骨架。
5. engineering/current.md:9-12 把 Home/通用 UI/Runtime 后端/Brand 分开描述，且仍写明新控制面 UI待施工；整合分支的 UI 回执需在合流后更新。
6. engineering/mvp/execution/work-surface-kit/delivery-integration.md:18-34 是作者记录，包含未验证项，不能代替 Astra 独验。

## 2. 物性与色彩：已接线，需关系验证

1. app/web/styles.css:112-143 定义 --canvas、--panel、--panel-muted、--frame、--line、--ink、--muted-strong、--glass、--rim、--shadow-float。
2. app/web/styles.css:8-108 有 light/dark scale；组件段复用 role token，未发现新增 runtime 专属色值。
3. .sidebar 使用 background: var(--frame)，主面用 var(--panel)；Runtime banner/details 使用 var(--panel-muted)（styles.css:2857-2867, 3075-3103）。
4. court-symbol 通过 --cw-ink: var(--ink)、--cw-record: var(--muted-strong)、--cw-background: var(--panel) 接主机语义（styles.css:2827-2834）。
5. 这是 token/selector 接线证据；浅深宗、frame→canvas、panel→muted 的四轴仍需在目标浏览器实测。
6. delivery-integration.md:21-23 记载 lint/contrast 为作者回执；本轮未重跑，不能独立复核其数值。

## 3. 一个阻断级静态问题：CSS scope 未闭合

1. app/web/styles.css:2840 打开 @media (min-width: 1024px) {。
2. app/web/styles.css:2841 只有 .app-shell:not(.nav-collapsed) .title-project 规则，文件尾没有对应的独立 }。
3. 机械计数为 { 637、} 636；fresh 基线同计数为 535/535。
4. 因此 runtime-* 段（styles.css:2843-3226）和 composer-below 段（3233-3256）当前处于这个 media block 的后续范围，至少会把它们的宽度行为带入桌面 media。
5. 嵌套的 @media (max-width: 767px) / @media (max-width: 1023px) 也位于该未闭合范围内；手机 Runtime 与 Home composer 的 CSS 需要优先确认。
6. 这是源码可复现的 scope 漏洞，不是视觉意见；Astra 应先修复或证明合流时会补齐括号，再做浏览器判断。

## 4. Motion / feedback

1. 基础 motion token 只有 --duration-fast: 120ms、--duration: 180ms、--ease-out（styles.css:177-180）。
2. polish 层只对颜色、opacity、transform、shadow 过渡（styles.css:2257-2299），包含行尾 chevron 的 2px 反馈。
3. working 状态用 .run-badge.running::before 的 se-pulse；waiting 不循环（styles.css:2300-2321）。
4. toast、popover、dialog、窄屏侧栏/面板有进入过渡（styles.css:2331-2387）。
5. scroll mask 与 thin scrollbar 覆盖 message/surface/file 等读取区（styles.css:2389-2402）。
6. prefers-reduced-motion 关闭全局 transition/animation，且 pulse/shimmer 单独静止（styles.css:2416-2422, 2651-2682）。
7. 这些是 selector 级静态覆盖；未验证打断、键盘、慢设备和壳内合成效果。

## 5. Home 与 composer

1. Home 隐去重复 title/capability badge，保留导航回路（styles.css:2705-2714）。
2. 空 Home 使用 .home-empty .composer-area 的 viewport 比例 padding；有数据 Home 使用较小上边距（styles.css:2716-2721）。
3. home-composer-intro 限制到 --column，hero 字号 26–32px（styles.css:2723-2735）。
4. Home 的 Project / File writes / New project 语义放入上下文控件，移动端可堆叠（styles.css:2737-2762）。
5. WK-55 另将可变上下文放到 .composer-below，稳定部分是输入、附件、连接 chip、Send（styles.css:3233-3256）。
6. index.html:192-252 是实际 composer markup；app.mjs 的 applyComposerDraft 只写草稿并显示 toast，未自动发送（app.mjs 中 WK-55/WK-56 注释附近）。
7. delivery-integration.md:24,30,34 记录 390 与 Home 脚本需独验；本轮不把记录当作验证结论。
8. 受第3节 CSS 未闭合影响，移动端 .composer-below 作用域必须先重新检查。

## 6. Shell / window controls

1. app.mjs 顶部根据 ?shell=desktop 或 navigator.windowControlsOverlay?.visible 设置 html[data-shell="desktop"]。
2. .shell-strip、env(titlebar-area-height, 52px)、env(titlebar-area-x, 80px) 和 app-region 在 styles.css:2785-2825。
3. collapsed/drawer header 也预留左侧交通灯区域，按钮和链接标 no-drag。
4. 这是 Web/CSS 适配层；仓库没有已接入的 Tauri/Electron/Cargo/DMG 配置。
5. delivery-integration.md:32-34 明确壳下 env() 未验证；不得写成桌面壳已通过。

## 7. Brand 使用边界

1. index.html:23-34 只在 sidebar wordmark 放 <court-symbol>；Home/session header 没有第二个符号。
2. styles.css:2697-2703 将 wordmark 设置为 20px、inline-flex、8px gap。
3. app.mjs 的 header 注释说明 run 状态由状态词表达，没有监听 brand animation end。
4. styles.css:2827-2834 使用宿主 ink/record/panel role；品牌动效不进入工作 UI。
5. 需保留“符号只在 wordmark 一处”裁定；像素区分度与 dark/high-contrast 仍需用户视觉轴验收。

## 8. Runtime UI 现状

1. Runtime tab 由 app.mjs:2879-2929 接入，createRuntimeView 在 init 时挂到 #runtime-content。
2. runtime-view.mjs 对 scope、resource rows、MCP child rows、permission/context/source details 做有界渲染；styles 对应 runtime-head 至 runtime-loaded-row（styles.css:2843-3129）。
3. exposure switch 触控尺寸在 styles.css:2986-3036, 3195-3217, 3227-3231 有规则，最终命中仍需浏览器验证。
4. Settings 入口和 recorded context 的接线存在；Run inspector 通过 run id 读取 recorded context，不重新推导当前配置（app.mjs:2942-3007）。
5. engineering/current.md:11、delivery-integration.md:28 仍要求 Astra 验证 RC UI/MCP 真实 fixture。
6. 后端能力边界仍是 schema4/既有 control plane；UI 没有创造 MOE、OAuth、stdio 或 provider chain。

## 9. Rail / Preview / hot-plug 缺口

1. 当前 app 的 surface list 是固定 kind 分支；源码中没有 app/web/surface-modules.mjs 的登记表实现。
2. engineering/mvp/execution/work-surface-kit/work-orders/WO-WK10-rail-host.md:7-12 才定义 registerSurfaceModule、rail host、mount/dispose、H3 fallback 和消融表。
3. 同工单 :3,16-18 标记依赖 RC 合流/WK9 r2，状态仍为骨架，需另开施工与验收。
4. 因此当前 Preview 不是“由 RuntimeComposition/uiSlots 自动热插拔的导轨”。
5. 现有 extension preview 仍沿已有 session binding/renderer/action 生命周期；不能从通用 card 或 runtime tab 推断 Expert composition 已实现。
6. engineering/design/work-surface-boundaries.md:20-35,46-60 保留 Domain Core、Host policy、adapter、presentation primitive 的 ownership 分界；UI polish 不能越权补 domain state。

## 10. 已知后端/数据缺口

1. delivery-integration.md:38-40 列出 GET /work-activity、多文档 tab、“今日”口径仍缺。
2. 同处列出 B-1 provenance[] MCP 闸门、B-2 catalog-only characters、B-4 prompt_template 入 context[]、B-10 unknown effect fixture 缺口。
3. 这些会直接限制 Heatmap、document tabs、Runtime context 和外部效果状态的真实消费。
4. work-surface-boundaries.md:46-60 规定 producer/renderer 缺席时只能走 domain read path/versioned fallback；前端不能推断 Evidence/Decision/accepted Artifact。
5. 当前没有通用 Review/Commit/Effect receipt 卡片契约；现有 question/permission/outcome 投影不可自动冒充专业 review。

## 11. 给 Astra 的最小验收顺序

1. 先修复/确认 styles.css:2840 的 media scope，再做任何截图或 390 结论。
2. 用 clean profile 按整合回执的手工步骤重新导入 loopback MCP，并重跑 control-plane fixture。
3. 逐项检查 390、1024 边界、1440，浅/深宗、keyboard focus、reduced motion、coarse pointer。
4. 对 Home 复测 empty/rows/error/waiting；检查 .composer-below 与 Send 在窄宽、文字变长、浏览器 zoom 下不溢出。
5. 对 Runtime 检查 installed/running/exposed/permitted 分离、active-run freeze、recorded binding 与 MCP unknown/error。
6. 对现有 Preview 检查 renderer unload/failure/absent fallback；不要把这一步扩展成 WK10 热插拔通过。
7. 只有 WO-WK10 实现登记表、rail host、mount/dispose 延迟和 H3 read-only fallback 后，才评价 extensions 编排。
8. 作者回执中的 136/136、7/7、RC 视口数字保留为待复核输入；本报告没有运行它们。


## 12. 未检事项与证据等级

1. 未做浏览器截图、DOM 几何测量或 forced-colors/IME/屏幕阅读器检查。
2. 未检查 Tauri/Electron 窗口拖拽与 titlebar-area env 的真实实现。
3. 未运行 npm test、lint-colors、contrast-report、Home 10 项或 RC fixture；报告只引用作者回执。
4. 未审查全部 WK9 artboard；这里只使用工单所列的对齐/消融依赖作为输入。
5. 未把 e1bd5d9、06e0d93 等组成提交当作当前 HEAD；当前证据锚定整合 HEAD 2726805。
6. 对第3节的 CSS scope 结论来自源码 brace 计数与相邻行结构，需由 Astra 在修复后做 parser/browser 复核。
7. 对 Runtime、Home、rail 的“存在/缺失”判断只涉及本次列出的 selector、文件和工单，不代表全仓库审计。
8. 所有视觉结论应标记为 source-level/provisional，直到 clean profile 下按 390/1440、浅深宗和 reduced-motion 复测。
9. 真实 provider、外部效果、Matter/Review/Commit 语义不在此次 polish 证据中。
10. 合流前先保留单一 writer 与固定基线；不要在未修复 CSS scope 时叠加 WK10 结构变更。
11. 本报告唯一写入物是 /tmp/cw-polish-current.md；fresh 与 integration 产品文件均未改动。
