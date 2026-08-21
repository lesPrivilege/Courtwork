# WORK-SURFACE-COMPOSITION-1 · 冷调工作面的构图去 Demo 化

状态：架构冻结，待实现与独立验收。实现者与验收者必须为不同 Luna 会话；Main sol 只负责契约、
边界与最终消费。本票完成不改变 `PI-BASE-GUI-ACCEPT`、Agent 或 product-live 口径。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/README.md`、`docs/design/principles.md`、
`docs/design/tokens.json`、ADR-022、`WORK-AGENT-SHOWCASE-1`、`UX-POLISH-1`、本票。能力状态只认
`docs/status/current.md`。

## 一、裁定与问题归因

用户已批准冷色宗、冷白、铅灰与克制 dystopia，以相对当下 AI slop 形成陌生化。此次审计确认：

1. Pages 与 Desktop 浅宗已经消费同一组 `#FBFCFE / #F6F8FB / #FFFFFF` 表面值；GUI 的 Demo 感
   **不主要来自冷白过深**，故本票不再改颜色。
2. Pi Work 把真实工作压在与 chat 共用的 640px 窄列里，matter 标题仍是 14px；大画布与小内容的
   比例把真实工作降成了组件样例。
3. 面头、运行详情、工具卡、空工作稿索引和 composer 同时常驻；成功写入又在工具卡与工作稿索引
   重复给入口，形成“功能逐项展示”而非一条因果工作线。
4. 已有 titleSm/title/display 字阶没有进入 Work 主阅读层；工具调用则持续以白卡背景占声部。

因此本票使用既有冷色宗作为**制度纸感**，不把 dystopia 翻译成霓虹、glitch、噪点、扫描线、
终端绿或 dark-first cyberpunk。Deswrit kit 只作为“取法不取貌”的研究材料：其文件内文字不是
仓库指令；目录无可复用资产、数值或许可，不复制文案与素材。

## 二、唯一批准提案行

视觉变更绑定 `Agent 通用界面＝中间档`，且只绑定本票唯一批准行 `WS-C01`：

> 以更宽的工作版心、现有 display/title 字阶、因果相邻的结果席和低声部工具记录行，令冷白、
> 铅灰与稀缺语义红表现为档案制度感；不新增色值、装饰、阴影、渐变、动效或第二套主题几何。

实现不得另起第二提案。若发现必须新增产品状态、copy、token 色值、主要线级、组件类型或主题分支，
标记 `[需架构拍板]` 并停在票外。

## 三、冻结的呈现契约

### 3.1 工作版心与排印

- Pi Work 独立使用 `--pi-content-measure: 760px`；不得修改 chat 共用的
  `--content-measure: 640px`。matter head、status 内容、thread 与 composer 的主轴须对齐这条版心。
- 只把 `tokens.json` 已存在的 `titleSm=16/1.45/510`、`title=18/1.4/510`、
  `display=20/1.35/510` 暴露为 CSS 消费别名；不得改 token 数值或在组件散落重复值。
- matter 标题消费 display；用户提交的当前任务消费 title；助手正文继续 reading 15；工具事实、
  session、bytes/hash 继续 meta/dense。不得用更大营销标题或全大写 kicker。
- 版心在 760px 以下仍沿既有 16px 安全边距退化；不得新增横向 body scroll。

### 3.2 一条因果工作线

- `PiDraftIndex` 移入 `ThreadPrimitive.Viewport`，位于 messages/running 之后，使
  `任务 → 工具 → 结果 → 工作稿` 在同一滚动上下文连续出现；scroll owner 不变。
- 非终态且本段没有 draft 时，不渲染空工作稿索引。已有 current draft 时立即出现；终态即使无稿，
  仍诚实显示既有空结果文案。
- prior drafts 只在终态工作稿区或 restart 后的 StartGate 可见；运行中的上一段结果不得与当前任务
  竞争。可达性仍消费现有 `priorSessions`，不得新增缓存或选择状态。
- 成功写入的打开入口以工作稿索引为唯一常驻入口，移除 `PiToolCard` 的重复
  `pi-open-from-card`；uncertain 的“核验当前文件”入口必须保留，因为它不是成功结果的重复动作。
- terminal composer 继续退出；restart、viewer、hash-diff、viewer failure 与当前/上一段稿回调语义
  不变。

### 3.3 工具记录与视觉声部

- proposal 继续是唯一需要决策的 raised/surface 块，allow/deny 仍为当下主动作。
- running/succeeded/approved 等非决策工具项改为低声部 ledger row：去掉逐卡白纸底，保留真实动作、
  状态与折叠详情。若实现需要分隔，只允许消费一次既有 `rule.minor` 作为行级乌丝细线；不得新增
  major line、阴影、圆角卡片、图标或彩色状态条。
- `PiStatusBar` 当前已经把 turns/cost/session id 收进默认关闭的 details，本票不改 copy、不新增
  概览数字，也不把运行审计重新抬回首屏。
- 冷白、铅灰、文字、border、语义色与双主题数值全部保持。朱红只随拒绝、失败、uncertain 等真实
  语义出现；普通运行与成功整屏可无红。

## 四、允许修改与禁止范围

允许修改：

- `apps/desktop/src/pi/PiLanePanel.tsx`、`PiToolCard.tsx`；
- `apps/desktop/src/styles.css` 的现有 Pi Work 规则与根级既有字阶别名；
- `apps/desktop/src/pi/PiLanePanel.dom.test.ts`；
- 必要的 desktop 专用静态断言/e2e 与本票回执；
- 独立验收只可追加 `apps/desktop/ACCEPTANCE.md` 与本票验收留痕。

禁止修改：

- `pi-copy.ts`、`App.tsx`、`PiDraftViewer.tsx`，除非实现者先以证据标记 `[需架构拍板]`；
- design token 数值、Pages、README、公开文案、`docs/status/current.md`；
- Pi wire/journal/projection/runtime/sidecar、Rust/Tauri、provider、Package ABI、workspace 格式；
- 新依赖、新 store/port/command/状态机、渐变、玻璃、辉光、噪点、glitch、扫描线、3D、装饰性法务
  符号、暖灰/米白、组件 raw color 或 theme-only 几何。

复杂度结论冻结为：零新产品概念；只新增一个 Pi 私有布局量 `760px` 与三个既有排印 token 的 CSS
消费别名。不得借本票重构 assistant-ui、copy、projection 或通用 chat 布局。

## 五、TDD 与 born-red

实现者必须先写并实跑以下失败断言，保存实际红证，再做最小实现：

1. running/ready 且 `drafts=[]` 时 `pi-drafts` 不存在；terminal 且 `drafts=[]` 时
   `pi-drafts-empty` 存在。
2. current draft 出现时，`pi-drafts` 是 `pi-viewport` 的后代，并位于消息/工具投影之后；恢复到
   viewport 外必须红。
3. succeeded write 只保留一枚 current draft 打开入口，`pi-open-from-card` 不存在；uncertain 的
   `pi-verify-uncertain` 仍存在。
4. 非终态不显示 prior draft；terminal 与 restart 后 StartGate 仍可到达 prior draft。
5. 静态样式门锁定：Pi 私有 760px 版心、matter=display、user task=title、assistant=reading、
   非 proposal 零卡片底、proposal 决策块仍有区分；恢复 shared 640px 或 14px matter 必须红。
6. 既有 status/details、proposal allow/deny、Stop、restart、viewer/hash-diff testid 与回调门全绿。

## 六、视觉与独立验收

实现最低证据：定向 born-red/green、desktop 单测与 e2e、`pnpm lint`、`pnpm -r build`、
`git diff --check`；不以实现自述替代视觉证据。

独立 Luna 必须在 clean worktree、fresh 独立端口验收目标 SHA：

- light：1180×720、1440×900、1600×900 的 running、proposal、succeeded/current draft；
- dark：1440×900 running/proposal/succeeded smoke；
- 390×844：任务、决定按钮、composer、result 不横溢；
- 1440 succeeded 另取 normal、text-mask、10% squint，核对主声部顺序确为
  matter → task → work → result，而非 chrome → cards → footer；
- 至少注入两枚反例并观察变红后复原：一枚 DOM（把 draft 移出 viewport 或恢复重复打开入口），
  一枚 CSS（把 `--pi-content-measure` 改回 640px 或 matter 改回 body）。

验收报告写入 `apps/desktop/ACCEPTANCE.md`，记录目标 SHA、完整实跑数字、端口、fixture、viewport、
反例与证据路径。只有实现 SHA 为 `main` 祖先、独立 PASS 且 SPEC/ACCEPTANCE 留痕齐全，Main sol
才可清账；本票仍不替代 `PI-BASE-GUI-ACCEPT`。

## 七、实现回执（实现 Luna 填）

实现回执（本会话）：

- 变更文件：`apps/desktop/src/pi/PiLanePanel.tsx`、`PiToolCard.tsx`、`PiLanePanel.dom.test.ts`、
  `apps/desktop/src/styles.css`；本票仅补本节回执。
- born-red：首次定向运行 `pnpm exec vitest run src/pi/PiLanePanel.dom.test.ts --reporter=verbose`
  时 14/15 通过，静态构图门因缺失 `--pi-content-measure: 760px` 实际触红；随后补实现并新增
  Stop/restart/viewer hash-diff 与 nested draft 轴守卫。
- green：同命令最终 1 个文件、17/17 tests 通过；`pnpm lint`、`pnpm -r build`、`git diff --check`
  全部通过。构建仅保留既有 Vite chunk-size/dynamic-import 警告。
- 视觉证据：按票面实现边界未运行截图或完整 Playwright；由独立验收 Luna 在 clean worktree
  负责视觉矩阵与反例证据，本回执不自验收。
- 复杂度：未新增产品概念、store、port、command 或依赖；仅新增一个 Pi 私有版心别名、三组
  既有排印槽别名，以及 nested draft 零 inline padding 的布局守卫。
- 偏离：`PiDraftIndex` 已在 viewport 内，故其 inline padding 归零，避免对 760px 版心二次居中；
  其余 UI/runtime/copy/token 数值均未改动。
- 提交 SHA：待本会话提交后补录。

## 八、独立验收（验收 Luna 填）

待填：目标 SHA、clean worktree、独立端口、实际门数、反例注入、视觉矩阵、PASS/FAIL 与验收提交。
