# 色彩三层治理契约（草案，Fable，2026-09-08）

状态：2026-09-08 冻结（WO-WK7 实现于 `claude/wk7-color-governance`）。值来源 EX-WK3；用户裁定：不用蓝系，默认 skin 为铅灰（冷灰 + 冷白底 + 单色 accent）。依据 intake-round-2 WK-16 / WK-17 / WK-18 / WK-19；既有纪律 PD-KIT、UP-2（"文件内只允许该 scale 与四个稀缺色，其余皆为别名"）继续有效并由本契约扩展到深宗与 skin。

## 1. 三层

| 层 | 内容 | 谁可改 | 何时改 |
|---|---|---|---|
| S · scale | `--gray-1…12`、`--accent-1…12`、`--danger-1…12`（或只保留用到的步）、`--success-*`；浅宗与深宗各一套；hex 只允许出现在此层 | 换宗、换 skin 的工单 | 整套替换，不单点改值 |
| R · role | 角色别名，名称稳定：canvas / panel / panel-muted / hover / selected / pressed / line / line-strong / ink / ink-strong / muted / muted-strong / accent / accent-strong / accent-soft / on-accent / danger / danger-soft / success / success-soft / focus / backdrop / scrim / glass / rim / shadow-* | 只有本契约修订 | 新角色须注明用途与对比门槛 |
| U · usage | 组件 CSS、内联样式、JS 生成的样式 | 各工单 | 只引用 R 层；不写 hex、rgba、scale 号 |

层级比稳定：1–2 纸面，3–5 交互（hover / selected / pressed），6–8 线，9–10 实心（accent 与实心控件），11–12 文字。此比例是判断"某个 role 应取哪一步"的规则，换宗换 skin 时不变。

## 2. 稳定项与可变项

| 项 | 稳定 / 可变 | 说明 |
|---|---|---|
| R 层名称与用途 | 稳定 | 组件永远只知道 role |
| 步号 → role 的分配表（§3） | 稳定 | 深浅宗同号；skin 同号 |
| 对比门槛：正文 ≥ 4.5:1，次要文字 ≥ 4.5:1（`muted-strong`），非文字 ≥ 3:1（`muted`、线、图标），focus ≥ 3:1 对相邻色 | 稳定 | 换任何 scale 后重跑 §6 对比表 |
| 状态色范围：只 failed（danger）与 waiting_user（accent）允许彩色；completed / cancelled / unknown 灰字 | 稳定 | ux-conventions §1 |
| 彩色面积：soft 底只用于卡内一行或标记，不整片着色 | 稳定 | surface-hierarchy SH-2 |
| gray 的色相偏向（gray / slate / mauve / sand …） | 可变（skin） | 与 accent 配对，见 §5 |
| accent 色相 | 可变（skin） | 钢蓝 / indigo / … |
| 深浅宗 | 可变（宗） | 同 role 名切换 S 层 |
| 阴影与 glass 的 alpha | 可变（宗） | 深宗阴影更弱、glass alpha 更低 |

## 3. 步号 → role 分配表（冻结）

与 Radix 12 步语义（EX-WK3 表 A）一致，浅深同号；唯一例外为 §4 的 panel：canvas=2，panel=`--paper`（浅宗冷白 #fdfdfe，高于 1；深宗 = 3，高于 canvas），panel-muted=1，hover=3，selected=4，pressed=5，line=6，line-strong=8，accent（实心）=9，accent-strong=10，muted=10（非文字），muted-strong=11，ink=12，accent-soft=accent-3，danger-soft=danger-3，success-soft=success-3，on-accent=白（须对 accent-9 ≥ 4.5:1）。

## 4. 宗（scheme）

- `:root` 为浅宗；`:root[data-theme="dark"]` 与 `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` 两路；两块只重定义 S 层，R 层别名不重复。
- brand `<court-symbol theme>` 由宿主按当前宗显式传入。
- 深宗抬升面：层级越高越亮（Atlassian / Primer / Apple 同向，EX-WK3 表 B）；实现为 canvas = 2、panel = 3、panel-muted = 1，阴影 alpha 0.4、glass alpha 0.10、rim alpha 0.12。
- 实心 accent 与 accent 文字分角色：`--accent`（9，填充）、`--accent-ink`（11，文字 / 链接 / 等待态状态词）、`--focus`（11，焦点环）、`--on-accent`（实心上的文字）。单色 skin 下三者同值。

## 5. skin

一个 skin = 一组 S 层文件（浅 + 深），role 分配表不变。预置两组：**`lead-gray`（默认，styles.css 内三个 tier:S 块）** = Radix Slate 1–12 浅 / 深 + 冷白 paper + 单色 accent（实心 = slate-12，hover = 自定 #0b0d10 / 深宗 #fff）；**`gray-steel`（备用，`app/web/skins/gray-steel.css`）** = 2026-09-08 前的中性 gray + 钢蓝 accent，未接入 STATIC allowlist，仅作可替换性对照。dystopia 经 EX-WK3 核实不存在可引用的同名设计系统，作为用户方向词保留，映射即 lead-gray。accent 色相留待后续 skin，用户裁定蓝系近于常规 SaaS 中台，不取。skin 切换只换 S 层，须通过 §6。

## 6. 验证

- `tools/lint-colors.mjs`：扫描 `app/web/**/*.css|mjs|html`，hex / rgb / hsl / oklch 字面量只允许出现在标记为 `/* tier:S */` 的块内；违例列文件:行。
- 对比表：`tools/contrast-report.mjs`，每宗 × 每 skin 十七对角色 / 底面，全部 ≥ §2 门槛；输出 `evidence/wk7/contrast.md`。边线（line / line-strong）不设门槛：边线不是控件的唯一指示，输入以焦点环（≥ 3:1）指示。
- `tests/color-governance.test.mjs` 把 lint 与对比表纳入 `npm --prefix app test`。
- 四轴视觉判断留用户；本契约只保证兼容与门槛。

## 7. 区域 → 高度层（WK-69，2026-09-09 冻结；WK10a-r2 实施）

界面只有四个高度层，层级由"离观者的距离"定义，**取色由层级决定，区域不单独取色**。深宗层越高越亮，浅宗层越高越白、越靠阴影。

| 层 | 角色 | 取值 | 区域 |
|---|---|---|---|
| L0 frame | `--frame` | 浅 slate-3 `#f0f0f3` / 深 slate-1 `#111113` | `body`、侧栏、抽屉底、桌面壳留位条、窄宗 composer 的底槽 |
| L1 surface | `--panel` | 浅 `#fdfdfe` / 深 slate-3 `#212225` | 主列（Chat Flow）、header 带、展开面之外的一切工作面；相邻 L1 之间只用 1 px `--line` |
| L1 内收 | `--panel-muted` | 浅 slate-2 / 深 slate-2 | L1 内的内收区：用户气泡、代码块、内联通知、权限预览、runtime banner、question 卡 |
| L2 float | `--float` | 浅 `#fdfdfe` / 深 slate-4 `#272a2d`，加 `--shadow-float` 与 1 px `--line-strong` | composer、popover、菜单、tooltip、toast、工作面的悬浮模块卡与 glyph 竖条 |
| L2 float（半透明） | `--glass` / `--glass-muted` | `--alpha-paper` × `--glass-alpha` | 只两处：连接 / 上下文 popover 与 "Back to latest" 药丸（WK-15 的 glass 名额） |
| L3 overlay | `--float` 置于 `--scrim` 之上 | 同 L2 取色 + `--scrim` | dialog、展开态工作面 |

规则：

1. `--canvas` **退役**为 `--frame` 的别名（不再有第二个 L0）；组件不得再引用它。
2. 区域背景只允许引用层 role、层内交互态（`--hover` / `--selected` / `--pressed`）、稀缺色的 soft 底、`--glass`、L3 的 `--scrim` / `--backdrop`，或不着色（`transparent` / `none` / `inherit` / `currentColor`）。
3. 实心控件与数据标记不是"区域"（圆形 Send / Stop、开关滑块、用量数据条、`background-clip: text` 的渐变）；每一处逐条登记在 `tools/lint-colors.mjs` 的 `FILL` 表内，新增一处必须同时写下它是什么。
4. `tools/lint-colors.mjs` 由此有两项检查：颜色字面量只出现在 `tier:S` 块内；`app/web/**/*.css|mjs` 的每一条 `background` / `background-color` 满足第 2 条或已登记。两项任一失败即退出码 1，`tests/color-governance.test.mjs` 纳入 `npm --prefix app test`。
5. 对比表（§6）的底面集合随之改为 `panel` / `float` / `frame` 三个层 role，`canvas` 不再作为底面出现。

## 2026-09-10 · Home review slot

用户授权丰富灰阶和极少量 Attention colour。默认 slate 的新 neutral scale 通过全局既有 R roles 消费；新增 `--attention-review` 只用于 Attention `needs_you` 短标签。默认 slate 映射专用 review scale，custom/gray-steel 回退其自身 `accent-ink`，不强塞固定红色。它不是 danger、selection、focus、send 或 activity intensity。`tools/contrast-report.mjs` 已覆盖新角色/浅深宗；[当前视觉消费](../../../../design/home-composition-2026-09-10/README.md)。
