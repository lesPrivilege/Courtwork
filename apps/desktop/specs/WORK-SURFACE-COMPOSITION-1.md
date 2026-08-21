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
- 提交 SHA：`11c65cb`（`feat(desktop): compose pi work surface`）。

### 七-A、实现回执追加：独立验收 TEST-DRIFT 窄修

- 仅改 `apps/desktop/tests/e2e/pi-lane.spec.ts`：拒绝、uncertain、failed、Stop 在当前
  prompt 阶段均断言 `pi-drafts` 不存在；uncertain 在核验前后都保持该断言；上滚在
  `pi-running` 归零后断言 `pi-drafts` 不存在，再核对 `scrollTop` 不变。browser harness
  的 `kind:'terminal'` 只结束当前 prompt（发 `prompt_completed`），同一 session 仍可继续
  下一 prompt，因此这里不等待 `pi-session-closed` 或 `pi-drafts-empty`；真实
  `session_completed`/`session_failed` 的 sessionTerminal 无稿空索引由 DOM 17/17 覆盖。
  未改产品源、runtime、copy、ACCEPTANCE 或 evidence。
- fresh 独立端口 `127.0.0.1:19876` 的 5-case 相关筛选实际为 **5 passed / 0 failed**（9.5s）：
  拒绝、uncertain、failed、Stop、用户上滚均通过。
- fresh 独立端口 `127.0.0.1:19877` 的完整 `pi-lane.spec.ts` 实际为 **13 passed / 0 failed**
  （19.7s，1 worker）。
- DOM 定向门：`pnpm --filter @courtwork/desktop exec vitest run
  src/pi/PiLanePanel.dom.test.ts --reporter=verbose`，**1 file / 17 passed / 0 failed**；
  `git diff --check`：**EXIT 0**。
- 提交：本次 follow-up 由 `test(desktop): distinguish prompt from session terminal` 提交；
  最终 SHA 以提交后 `git rev-parse HEAD` 核验为准。

### 七-B、实现回执追加：capture script Node globals 窄修（2026-08-21）

- 初始红证：`pnpm exec eslint release/evidence/work-surface-composition-1/acceptance-2026-08-21/capture-script.mjs` 实测 **EXIT 1**，`process` 5 处、`console` 3 处，共 **8 个 `no-undef`**；该 evidence 路径不在 ESLint 的 Node globals 覆盖面。
- 最小修复：仅在 `capture-script.mjs` 的 import 区显式引入 `node:console` 与 `node:process`；未移动脚本，未改变 capture 行为、fixture、截图、manifest、产品源或 `ACCEPTANCE.md`。
- 绿证：同一脚本定向 ESLint **EXIT 0**；根 `pnpm lint` **EXIT 0**；`git diff --check` **EXIT 0**。未重新生成或覆盖任何 evidence PNG/manifest，也未进行验收。
- 本次 gate-only 变更随提交 `fix(desktop): declare capture script node globals` 交付；独立验收结论与既有验收留痕保持不变。

## 八、独立验收（验收 Luna 填）

独立验收结论：**`FAIL / REJECT`**。定向 DOM、lint、build 与视觉矩阵通过，
但完整 Pi E2E 仍为 8/13；5 个既有断言要求非 `sessionTerminal` 的 prompt outcome
显示 `pi-drafts-empty`，与本票「非终态无空 draft index」契约冲突。未修改产品实现，
也未以 focused 子集替代完整相关 E2E 的失败。

### 身份、卫生与端口

| 项目 | 实际值 |
|---|---|
| target SHA | `d21aa6d062b32052507f6b96ea7bf8da0eccb602` |
| 独立 clone / branch | `/private/tmp/work-surface-composition-1-acceptance-Ojf5dh/repo` / `acceptance/work-surface-composition-1-2026-08-21` |
| checkout 卫生 | checkout 后 `git status --short --branch` clean；产品源路径在验收后相对 target 零 diff |
| scripted browser port | `127.0.0.1:18741`，`reuseExistingServer=false` |
| e2e ports | full Pi E2E `18732`；contract-focused 8-case subset `18742` |
| fixture | `acceptance-write-script`；`纪要.md`；SHA-256 `e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba` |

### 实跑门

| 门 | 独立命令结果 |
|---|---|
| Pi DOM | `pnpm --filter @courtwork/desktop exec vitest run src/pi/PiLanePanel.dom.test.ts --reporter=verbose`：1 file / **17 passed, 0 failed** |
| Pi unit | `pnpm --filter @courtwork/desktop exec vitest run src/pi --reporter=verbose`：5 files / **56 passed, 0 failed** |
| Pi E2E（完整相关文件） | `COURTWORK_E2E_PORT=18732 ... playwright test tests/e2e/pi-lane.spec.ts --project=app`：**13 total / 8 passed / 5 failed** |
| Pi E2E（契约相关 focused subset） | fresh port `18742`：**8 passed, 0 failed** |
| lint | `pnpm lint`：**EXIT 0** |
| workspace build | `pnpm -r build`：**EXIT 0**；15/16 workspace scope，desktop `tsc -b` + Vite 4316 modules；仅既有 advisory warnings |
| diff check | `git diff --check`：**EXIT 0** |

完整 E2E 的 5 个失败均为旧 `pi-drafts-empty` 可见性期望，出现在拒绝写入、无法确认、
未能写入、Stop、用户上滚场景；不是浏览器启动或端口复用错误。一次 build 前的端口
`18731` 运行因 clean clone 尚未生成 workspace build outputs 而未计入结果；build 后的
`18732` 是完整实跑数字。

### 视觉矩阵与真实检查

证据目录：
`release/evidence/work-surface-composition-1/acceptance-2026-08-21/`；索引为
`manifest.json`，脚本为 `capture-script.mjs`，共 **31 PNG**。脚本对每个状态实测
`document.documentElement.scrollWidth` 与 `document.body.scrollWidth` 不超过
`window.innerWidth`，manifest 记录均为 `overflow: "0"`。

| theme / viewport | states |
|---|---|
| light 1180×720 | running / proposal / succeeded（normal + text-mask） |
| light 1440×900 | running / proposal / succeeded（normal + text-mask）；succeeded 另有 10% squint `144×90` |
| light 1600×900 | running / proposal / succeeded（normal + text-mask） |
| dark 1440×900 | running / proposal / succeeded（normal + text-mask） |
| light 390×844 | running / proposal / succeeded（normal + text-mask）；任务、决定按钮、composer、result smoke targets 均存在 |

用 `view_image` 检查了 light 1440 running/proposal/succeeded、dark 1440 succeeded、
light 390 proposal/succeeded、light 1440 text-mask 与 10% squint：matter → task →
work/result 是主声部；proposal 是唯一 raised decision block；ledger 保持低声；
succeeded 只保留一个 current draft index 入口且没有 `pi-open-from-card`；390 任务和
控件换行但不横溢。视觉未发现阻断。

### 反例注入与复原

两枚反例均在上述 clean clone 用 `apply_patch` 临时注入，跑同一 Pi DOM 门观察变红，
随后精确还原并复跑 **17/17**：

| 类别 | 临时变更 | 红证 |
|---|---|---|
| DOM | 在 `apps/desktop/src/pi/PiToolCard.tsx` 的 succeeded write 分支加入重复 `data-testid="pi-open-from-card"` 按钮 | **16 passed / 1 failed**；`成功写入只保留工作稿索引入口；uncertain 仍保留核验入口` 断言期望 null，实际得到重复入口 |
| CSS | 在 `apps/desktop/src/styles.css` 将 `--pi-content-measure: 760px` 改为 `640px` | **16 passed / 1 failed**；静态版心门期望 `760px`，实际源为 `640px` |

验收只追加本报告、票面 §八与本目录 evidence；未改 product implementation。验收提交
（若提交）须逐文件核对 cached names，且 `git diff --check` 通过。

### 八-A、二次独立验收（2026-08-21，驳回）

独立复验结论：**`FAIL / REJECT`**。目标 `c26ff1514226a13e9707bf0d8e368eddc4cef2cb` 已修复
第一轮完整 Pi E2E 的测试契约漂移，完整文件实跑 **13/13**；但目标树现有第一轮 evidence 的
`capture-script.mjs` 不在 ESLint 的 `**/scripts/**/*.mjs` Node globals 覆盖面，故
`pnpm lint` 实际为 **EXIT 1（8 个 `no-undef`）**。未修改产品实现或该既有 evidence 脚本，
不能把其余门禁全绿写成 PASS。

#### 身份、范围与源不变量

| 项目 | 实际值 |
|---|---|
| target / HEAD | `c26ff1514226a13e9707bf0d8e368eddc4cef2cb`，checkout 后精确匹配 |
| 独立 clone / branch | `/private/tmp/work-surface-composition-1-reaccept-qYeDEO/repo` / `acceptance/work-surface-composition-1-reaccept-2026-08-21` |
| checkout 卫生 | 初始 clean；验收结束产品源相对 target 零 diff；未在共享树 checkout/stash |
| `d21aa6d→target` | 产品源 `PiLanePanel.tsx`、`PiToolCard.tsx`、`styles.css` 零 diff；两端 SHA-256 分别为 `88b24cc9…610a`、`3a2b05bf…11ae`、`572d0bd3…8c0` |
| 第一轮 evidence | 原 `acceptance-2026-08-21/manifest.json` 仍为 target `d21aa6d…b602`、**31 PNG**、port `18741`；本轮未覆盖 |

#### 实跑门禁

| 门 | 独立实测 |
|---|---|
| Pi E2E（完整 `pi-lane.spec.ts`） | fresh port `29642`，`COURTWORK_E2E_PORT=29642 pnpm --filter @courtwork/desktop exec playwright test tests/e2e/pi-lane.spec.ts --project=app`：**13 total / 13 passed / 0 failed**（21.5s，1 worker） |
| Pi DOM | `vitest run src/pi/PiLanePanel.dom.test.ts --reporter=verbose`：1 file / **17 passed / 0 failed**；CSS 反例复原后再次 17/17 |
| Pi unit | `vitest run src/pi --reporter=verbose`：5 files / **56 passed / 0 failed** |
| workspace build | `pnpm -r build`：**EXIT 0**；15/16 workspace scope，desktop Vite **4316 modules**，仅既有 advisory warning |
| lint | `pnpm lint`：**EXIT 1**；`release/evidence/work-surface-composition-1/acceptance-2026-08-21/capture-script.mjs` 的 `process` 5 处、`console` 3 处，共 **8 `no-undef`** |
| diff check | `git diff --check`：**EXIT 0** |

#### 二次 smoke evidence

仅在 fresh target-tip port `29643` 补取两枚 normal frame，未复用或覆盖第一轮目录：
`release/evidence/work-surface-composition-1/reacceptance-2026-08-21/manifest.json`、
`light-1440-succeeded.png`（1440×900）与 `light-390-proposal.png`（390×844）。manifest
记录 target、port、fixture `acceptance-write-script` / `纪要.md` / SHA-256
`e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba`、viewport 与
`scripted: true`；两帧实测 horizontal overflow 均为 **0**，并已用 `view_image` 检查。
1440 succeeded 保持 matter→task→work/result→draft 主序且只有一枚 draft 入口；390 proposal
的任务、allow/deny 与 composer 均可见、无横溢。

#### 反例与复原

| 反例 | 红证 | 复原绿证 |
|---|---|---|
| `apps/desktop/tests/e2e/pi-lane.spec.ts:158` 临时把 proposal 非终态 `expectNoDraftIndex` 改回 `pi-drafts-empty` | fresh port `29644` 的拒绝写入用例 **1 failed**：`pi-drafts-empty` 不存在 | 精确复原后 fresh port `29645` 同用例 **1 passed** |
| `apps/desktop/src/styles.css:161` 临时将 `--pi-content-measure: 760px` 改为 `640px` | DOM 门 **16 passed / 1 failed**，静态版心断言收到 `640px` | 精确复原后 DOM **17/17 passed** |

两枚反例均用 `apply_patch` 注入并恢复；最终产品源相对 target 零 diff。本轮只追加本节、
`apps/desktop/ACCEPTANCE.md` 与 `reacceptance-2026-08-21/` 三个 evidence 文件，不改
产品实现、第一轮 evidence、wire/journal 或契约语义。因 lint 失败，本票仍不放行。
