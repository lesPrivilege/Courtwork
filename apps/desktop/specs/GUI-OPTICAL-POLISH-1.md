# GUI-OPTICAL-POLISH-1 · Agent UI 几何与光学收口

状态：**实现已提交，等待另一 Luna 会话独立验收；本会话不宣称 PASS。**

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/principles.md`、
`docs/design/tokens.json`、`GUI-COMPOSITION-1`、`GUI-HIERARCHY-1`、
`GUI-PAPER-THEMES-1`、本票。成熟度仍只认 `docs/status/current.md`；本票不替代
`PI-BASE-GUI-ACCEPT`，不赋予 Agent、product-live 或 external-validated 口径。

## 一、基线判断与批准行

现行双宗与层级已经清账；本轮不是再调色、再加卡片或重做信息架构。实帧仍有四类可验证的工艺缺口：

1. Pi composer 仍是一条横贯主面的白色带，textarea 与外层没有明确的 L1／内控件几何关系；
2. 唯一需人工决定的 proposal 虽有 surface 底色，却与普通账行同为直角，卡片层级只靠灰块；
3. 决定按钮以“主动作在左、次动作在右”的正文顺序停在卡片左侧，主要提交动作没有落在动作簇末端；
4. Case rail 的「管理包」从状态文案下方另起一行，像游离按钮；proposal 态还保留一个空 header，制造不可见但可占节奏的层。

批准行 `GOP-C01`：

> 只给真实容器和可操作面必要圆角：Pi composer 取既有 L1 `12px` 外壳，内部输入取现有
> `radius.md=6px`，proposal 取现有卡片 `6px`，按钮继续 `radius.sm=4px`；普通工具账行、工作稿索引、
> 数据列与文书面维持直角／零投影。composer 收成 760px 版心内的唯一浮面；决定动作按
> 「次动作在前、主动作收尾」排到 trailing edge；rail 状态与管理入口同排。光学对齐只用既有
> 4/6/8/12 节奏、现有图标与一次 1px 以内的静态微调，不新造 token、色值、阴影档或组件族。

本轮消费 [UI Skills `better-ui`](https://www.ui-skills.com/skills/jakubkrehel/better-ui) 的三条非权威方法：
同心圆角、光学优先于几何对齐、只给真实层级圆角；以及 playbook 的 pressed feedback。外部材料不安装、
不进 lockfile、不形成第二设计系统，也不覆盖本仓数据区静止、动效白名单或成熟度门。

## 二、冻结目标

### `GOP-C01-a` · 圆角只属于真实容器

- `.pi-composer`：既有 `--elevation-float-radius`（12px），外描边只取
  `--elevation-float-border`，**不新增阴影消费点**；L1 身份由 raised 面、描边、圆角与遮挡关系成立。
- `.pi-composer-input`：`6px`，与 composer 的 `6px` 内边距形成 `12 = 6 + 6` 的同心关系。
- `.pi-tool-card[data-state="proposed"]`：`6px`；它是 Pi 工具流里唯一异构、需决定的卡片。
- `.pi-button`：维持 `4px`。`.pi-tool-card:not([data-state="proposed"])`、`.pi-drafts`、
  `.pi-draft-row`、`.pi-tool-facts` 与正文／数据面不得借本票获得圆角、描边或投影。

### `GOP-C01-b` · composer 与决定动作摆放

- composer 外壳宽度为 `min(calc(100% - 32px), var(--pi-content-measure))`，在主轴居中，使用
  `6px` 内边距与既有 `--control-gap`；不得继续作为横贯整面的 raised 色带。
- textarea 占剩余宽度，Send／Stop 落在 trailing edge 并与输入底边对齐；窄宽 390px 不得横溢或遮挡。
- proposal 动作簇 `justify-content:flex-end`；DOM／键盘顺序改为「拒绝写入 → 允许写入」，主动作最后、
  位于动作簇末端。不得改变 verdict、command、journal 或授权语义。
- `.pi-button` 统一 `inline-flex` 居中文字；proposal／composer 的主动作最小高度取现有
  `--control-height-md`，其余高频密集控件保持现行高度，不把 desktop 密度全局抬成 44px。

### `GOP-C01-c` · rail 与光学轴

- `.rail-pack-section` 在现有宽度内用 `minmax(0, 1fr) auto` 让状态文案与「管理包」同排；可换行的事实留左，
  短动作锚在右上，`.rail-label` 跨两列。不得改文案、事件、包绑定状态或 CaseRail 其他行。
- proposed 状态不渲染空 `.pi-tool-head`；非 proposal 状态字与动作行的基线保持现行 trailing 对齐。
- details chevron 与文字只允许 `<=1px` 的静态光学微调；不得换图标库、画新 SVG 或为对齐引入 transform 动画。

### `GOP-C01-d` · 克制的按压反馈

- `.pi-button-primary` 纳入现有 press 白名单：仅 pointer `:active` 使用 `scale(.98)`，时长只取
  `--motion-press`，transition 明列 `transform/background-color/border-color`；不得 `transition: all`。
- `:focus-visible`、键盘触发与 `prefers-reduced-motion: reduce` 下不得缩放。卡片、账行、数据格与 quiet
  文本动作不得获得按压缩放。

## 三、文件范围与禁止扩张

实现允许触碰：

- `apps/desktop/src/styles.css`
- `apps/desktop/src/pi/PiToolCard.tsx`
- `apps/desktop/src/pi/PiLanePanel.dom.test.ts`
- 新增 `apps/desktop/tests/e2e/gui-optical-polish-1.spec.ts`
- 新增 `apps/desktop/scripts/assert-gui-optical-polish.mjs`，并接入 `apps/desktop/package.json`
- `apps/desktop/scripts/assert-test-count.mjs`（只按真实 `--list` 数字升 floor）
- 新增本票 scripted capture；新 evidence 只能写新目录，不覆盖现有 dirty／历史截图
- 本票 SPEC／`apps/desktop/SPEC.md`／实现回执；实现完成后仅更新 readiness 的票内状态，不改 `current.md`

禁止：`tokens.json`、主题值、copy、组件架构、App.tsx、state/store/port/command、journal、runtime、provider、
schema/ABI、Pages、依赖、Work diff、第二 elevation、全局 control height、历史 SPEC/ACCEPTANCE 和
`docs/status/current.md`。未列文件若成为必经之地，先标 `[需架构拍板]`，不得自行扩张。

## 四、TDD、反例与验收

实现者先在旧实现上写失败测试，至少实际红四项：composer 不是 bounded L1 同心外壳；proposal 无 6px；
动作顺序／trailing 对齐错误；rail 管理按钮另起一行。静态门同时锁：普通账行／数据面零圆角零影、无新色值、
无第二阴影、无 `transition: all`。

mutation 至少六枚并逐一复红：

1. composer 退回全宽 raised 色带；
2. composer 外／内半径改成非 `12/6`；
3. 普通完成态工具行加圆角或阴影；
4. proposal 主动作移回前位或动作簇改回左对齐；
5. rail 管理按钮退回独立行；
6. primary press 改为键盘／reduced-motion 仍缩放，或引入 `transition: all`。

视觉矩阵：light/dark × 1180/1440/390 × empty/proposal/succeeded，另摄 proposal 240px squint；核对按钮顺序、
卡片层级、同心圆角、rail 同排、文本／图标光学轴、零横溢。两宗同 viewport/state bounding-box 必须同构。
截图只证明 scripted browser projection，不替代真实 Tauri/WKWebView。

实现最低门：定向 DOM／E2E、`lint:optical-polish`、`lint:hierarchy`、`lint:elevation`、`lint:neutral`、
`lint:motion`、`lint:icons`、`pnpm lint`、`pnpm test`、`pnpm site:guard`、`pnpm -r build` 与完整 desktop
`test:e2e`。实现回执必须写 born-red、mutation、fresh 端口／single worker、视觉清单和复杂度增量。

独立验收由不同 Luna 会话在新 clean clone／worktree、独立端口、`reuseExistingServer=false` 下执行；不得采信
实现截图，须自行重摄、重注 mutation，并只把报告追加到 `apps/desktop/ACCEPTANCE.md`。同一会话不得实现兼验收。

## 五、实现回执（implementation session）

本回执只记录实现证据，不替代独立验收，也不把 scripted browser projection 升格为真实 Tauri／Agent
或 product-live 事实。

- 实现范围：`styles.css` 收口 bounded composer（12px L1 / 6px input / 6px padding）、proposal 卡与普通账行的必要层级；`PiToolCard.tsx` 移除 proposed 空 header、按「拒绝→允许」排 DOM；rail 状态／管理入口改 `minmax(0, 1fr) auto`；primary 纳入既有 `.98` press whitelist。未改 token、主题、copy、runtime、state/store/port/command、schema、provider、Pages、依赖或 Work diff。
- born-red：旧实现上 `PiLanePanel.dom.test.ts` 的 5 项 `GUI-OPTICAL-POLISH-1 · GOP-C01` 断言全部实红（composer L1／同心圆角、proposal radius、动作顺序／trailing、rail 同排、空 header／press）；同轮亦暴露既有 composition 选择器断言与旧 `:not([data-state="proposed"])` 漂移，随后用等价 base／proposed 规则收口。
- 定向门：最终 Pi DOM `22/22`，本票 `lint:optical-polish`、`lint:hierarchy`、`lint:elevation`、`lint:neutral`、`lint:motion`、`lint:icons` 全绿；Playwright `--list` 实跑 `413`，`assert-test-count` floor 同步为 `413`。
- E2E／视觉：本票 6 项 GUI E2E 以 fresh port、`--workers=1` 实跑；视觉矩阵为 light/dark × 1180/1440/390 × empty/proposal/succeeded（18 帧）及 240px proposal squint，产物见 `release/evidence/gui-optical-polish-1-2026-08-23/`。实现截图只作实现证据，独立验收须另摄。
- mutation：六类反例逐一注入、观察 gate 退出码 `1` 后复原，逐项与红句见 `release/evidence/gui-optical-polish-1-2026-08-23/mutation-red.txt`：full-width composer、错误 12/6 radius、普通账行 shadow、动作顺序／左对齐、rail 独立行、`transition: all`。
- 参考溯源：UI Skills `better-ui` 的同心圆角、optical alignment、pressed feedback 与 shadcnuikit changelog 的 radius/spacing 双宗可调、Chat V2 单一内容焦点／modal actions 仅作现有 GOP-C01 的支持证据；未安装、未引入 Tailwind/shadcn、未形成第二设计系统。
- 复杂度增量：新增 1 个静态门脚本、6 个 Playwright 用例组与新的 evidence 目录；生产组件／依赖／token 数量增量为 0。
- 实现提交：见本票实现提交记录；独立验收会话须在另一 clean clone 重新运行全部门禁并只追加 `ACCEPTANCE.md`。
