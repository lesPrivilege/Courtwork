# GUI-COMPOSITION-1 · Pi Work 面构图、密度与语料纠偏

状态：**架构已冻结，待实现**。基线 `01b6b57`（`GUI-LEAD-WHITE-1` 实现提交，未清账）。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/principles.md`、`docs/design/tokens.json`、
`WORK-SURFACE-COMPOSITION-1`、`WORK-AGENT-SHOWCASE-1`、`GUI-LEAD-WHITE-1`、本票。
能力成熟度只认 `docs/status/current.md`；本票不改变 `PI-BASE-GUI-ACCEPT` 或 Agent／product-live 口径。

## 一、产品裁定与归因

`WORK-AGENT-SHOWCASE-1` 把 Demo 感归因于构图并冻结颜色；`GUI-LEAD-WHITE-1` 以用户实帧反馈
覆盖该判断、改了颜色。以 `release/evidence/gui-lead-white-1/implementation-2026-08-22/03-proposal-light.png`
复核：**颜色一半已解，构图与密度一半未解**。本票只解后一半，不再动任何 token 数值。

本票归因不取「观感差」这类无判准表述，逐条绑定该帧的可测事实：

| 编号 | 帧上事实 | 代码锚点 |
|---|---|---|
| `GC-F1` | 1440×900 下内容止于 y≈540，其下约 360px 为纯底；composer 独立悬于底部 | `.pi-thread-viewport` 无内容时的纵向分布 |
| `GC-F2` | rail 260 + 正文 `--pi-content-measure: 760px` 居中，1440 视口左右各余约 190／200px 死白，且 pi work 态无右栏 | `styles.css:161`、`styles.css:2112-2116` |
| `GC-F3` | 工具卡灰底块与裸文本行齐平交替，块宽拉满版心，形态与骨架屏同构 | `.pi-tool-card`（`styles.css:2019`） |
| `GC-F4` | 一屏三处同名：左上 `Work`、`当前工作区／设备采购案卷`、右上 binding pill | `pi-copy.ts:19`、`.pi-work-head-binding` |
| `GC-F5` | placeholder 与首条用户消息逐字相同，均为「例如：…」示范句 | `pi-copy.ts:37` |
| `GC-F6` | `运行详情` 折叠符是浏览器默认 `▶` 字符，非既有图标；`.tool-call-row summary` 已抑制该 marker，pi 变体未抑制 | `PiToolCard.tsx:66`、`styles.css:715` 与 `styles.css:1989` 的不对称 |
| `GC-F7` | 左 rail 同屏叠三条空态：`卷宗 0 件`／`未加载垂类包`／`尚无卷宗原件` | case rail 空态分支 |
| `GC-F8` | `允许写入`（黑底实心）与 `拒绝写入`（红描边）尺寸、字重、间距对称，读作等权 CTA 对 | `pi-copy.ts:42-43` 及其按钮样式 |

批准行 **`GC-C01`**：

> Pi Work 面按「一条正在进行的工作」组织，不按「一块待填的画布」组织：正文轴随可用宽度
> 有上界地展开，未成文区不留成屏空场，工具与运行详情降为账行而非灰块，同名标识一屏只出现
> 一次，示范语料退出产品默认，不可逆授权的两个动作按主次分级。

激进度仍为 Agent 通用界面中间档。禁止借本票加卡片、渐变、阴影、装饰、动效、主题几何或新组件。

## 二、允许范围与禁止范围

允许：`apps/desktop/src/pi/` 既有组件的结构与样式类、`apps/desktop/src/styles.css` 的**布局与密度**
规则、`pi-copy.ts` 文案、case rail 既有空态分支的合并、相关静态门与 E2E 断言、截图脚本、本票回执、
`apps/desktop/SPEC.md` 与 readiness 登记。

禁止：`docs/design/tokens.json` 任何数值、双宗任何颜色值、语义色角色、新增 React 组件文件、
新状态机、新 store／port／command、任何新依赖、runtime／provider／schema／ABI、
`docs/status/current.md`、Pages 内容与版式、`GUI-LEAD-WHITE-1` 的既有 diff。

**颜色零改是硬边界**：本票的 diff 中不得出现任何 `#RRGGBB`、`rgb(`、`hsl(` 字面量的增删，
也不得改动任何 `--color-*` / `--bg-*` / `--text-*` / `--border-*` 变量的定义。

## 三、成熟范式与依赖结论

本票是既有组件的构图与密度纠偏，不存在缺失的交互 primitive：折叠由原生 `<details>` 承担，
按钮层级由既有 Radix 依赖与既有 `.btn-*` 语汇承担，版心由既有 CSS 变量承担。引入布局库或组件库
会与 Courtwork 的私有版心、双宗 AA 与 raw-color／layout-converge 防漂移门形成第二真源。

结论：**直接依赖：无；借行为范式：正文轴上界随视口分档（既有 `--content-measure` 语汇）；
保留自研：版心真源与机器门；删除当期动作：无。**

## 四、逐项冻结的目标形态

实现者对每条给出最小改动，不得越出该条：

- `GC-C01-a`（对 F2／F1）：`--pi-content-measure` 由定值 760px 改为**有上界的分档**——
  正文轴 `min(100% - 2×安全边距, 上界)`，上界在 ≥1280px 视口取值须显著大于 760 且不超过 960，
  精确值由实现者以 1180／1440／1600 三视口实测定，并在回执写明判准（每行字符数落在 40–52 个
  中文字符区间）。760px 以下退回既有 16px 安全边距的行为不变。
- `GC-C01-b`（对 F1）：thread 未成文区不得留成屏空场——运行中与待决态下，正文块与 composer
  之间的空隙不得超过一个既有 section 间距；空场以既有节奏收拢，**不得**用新增插画、卡片或占位块填充。
- `GC-C01-c`（对 F3）：`.pi-tool-card` 退出满宽灰块形态，降为账行：保留既有 `bg.surface` 值，
  但不得再以满版心色块承担；缩进与细界线由既有 `--rule-minor` / `border` 语汇承担。
- `GC-C01-d`（对 F4）：同名标识一屏只出现一次。binding pill 与 `pi-work-head-title` 同名时
  隐去 pill；`当前工作区` 标签与左上段名 `Work` 的重复由实现者择一保留并在回执说明取舍依据。
- `GC-C01-e`（对 F5）：`inputPlaceholder` 改为不含具体案件语料的中性引导句，且**不得**与任何
  demo 语料或测试首条消息逐字相同；`running: '工作中…'` 改为不带省略号的确定式状态词。
- `GC-C01-f`（对 F6）：pi 的 `<details> summary` 与 `.tool-call-row summary` 取同一处理——
  抑制默认 marker，改用既有图标集里已有的展开图标；不得新画图标（`svg-standards.md` 辖）。
- `GC-C01-g`（对 F7）：case rail 三条空态合为一条，保留全部事实（卷宗件数、垂类包未加载、
  无原件），不得删除任何一条所承载的信息，只改其呈现为一处。
- `GC-C01-h`（对 F8）：`允许写入` 保持主动作，`拒绝写入` 降为次级动作（既有次级按钮语汇，
  仍须 focus-visible 可达、点击面积不小于既有最小值）。红只保留在拒绝语义上，不加不减。

## 五、TDD、视觉与验收

实现者先写红：至少四枚断言须在 `01b6b57` 上实际红——正文轴宽度分档（`GC-C01-a`）、
工具卡非满宽色块（`GC-C01-c`）、placeholder 中性（`GC-C01-e`）、拒绝动作为次级（`GC-C01-h`）。
最小实现后运行：`lint:design-md`、`lint:neutral`、`lint:rp211`、`lint:elevation`、`lint:graph`、
`lint:typography`、`lint:layout-converge`、`lint:ui-surface`、`lint:voice`、`lint:work-agent-gui`、
`site:guard`、定向 Vitest、`pnpm lint`、`pnpm -r build`、独立端口 Playwright 全链、`git diff --check`。

至少保留两枚 mutation：把 `--pi-content-measure` 注回定值 760px 必须红；把 placeholder 注回
旧示范句必须红。

视觉证据：light 1180／1440／1600／390 四视口 × empty／running／proposal／succeeded 状态矩阵，
另补一枚 dark 1440 smoke 证明深宗未动；截图前须确认测试页已写 `data-theme`（`GUI-LEAD-WHITE-1`
的首帧失真判例）。核对：无成屏空场、正文轴随视口展开且不越上界、工具行非灰块、一屏无同名重复、
零横溢。

独立验收必须由不同会话在 clean worktree、fresh 端口复跑机器门与同视口矩阵，实际注入构图与
语料反例并复原；另须实跑颜色零改的验证（本票 diff 中无色值增删）。只可追加
`apps/desktop/ACCEPTANCE.md` 与本票验收留痕。独立 PASS 前本票不得标记清账，实现会话不得自验收。

## 六、实现回执

（待实现会话填写：角色、TDD 红证、mutation 命中、逐条 `GC-C01-a…h` 的取舍与实测值、
全门绿证与实际读数、视觉矩阵 manifest、提交 SHA。）
