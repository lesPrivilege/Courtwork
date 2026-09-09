# 字阶与控件密度约束表（FE-05a，WK-120 / M-11）

2026-09-09，Fable。方法按 WK-112：先约束，后变体，一次只变一个维度（本表只管字阶、字重、字距、行高与控件高度；材质、颜色、动效不动，归 FE-05）。目标不是"更小"，是**层级靠字号与字重差成立，不靠颜色与框线**（WK-120；anti-slop 门 hierarchy 项）。

## 1. 现状（`app/web/styles.css`，`--text-scale` = 1 时）

| 角色 | token | 现值 | 用处（引用次数） | 字重 / 字距 |
|---|---|---|---|---|
| 页标题 | `--text-title` | 20 | Settings 分节标题等（6） | 550 / `--tracking-heading` −0.02em |
| 导航标题 | `--text-navigation-title` | 17 | 顶带 h1 等（3） | 500 |
| 阅读正文 | `--text-reading` | 15 | 消息正文、文档阅读面（7） | 400 |
| 正文 | `--text-body` | 14 | 行标题、表单、按钮默认继承（6） | 400 / 行标题 500 |
| 分节 | `--text-section` | 14 | 块标题（4） | 500 |
| 标签 | `--text-label` | 13 | 控件标签、导航项（30） | 400–500 |
| 元数据 | `--text-meta` | 12 | 说明句、text-button、segment、form-help（68） | 400 |
| 说明 / eyebrow | `--text-caption` | 11 | eyebrow、message-role、session-mode、Today 标签（44） | 500 / 大写 `--tracking-caps` 0.06em |
| 控件高 | `--control` | 32（触控档 44，某些密表 24） | 全部 button / input / select | 按钮 padding 5×10，字号继承 14；primary 550 |
| segment | — | 28 高、字号 meta 12 | 路径 / 模式切换 | — |
| 行高 | — | body 1.5 左右；form-help 1.6 | — | — |
| 三档 | `--text-scale` | 0.929 / 1 / 1.143 | Appearance › Text size | 只整体缩放 |

观察：正文 14 与 chrome（label 13 / meta 12）只差 1–2px，字重多为 400–500，按钮字号与正文同为 14 且高 32——正文与 chrome 读起来是一档，层级只能靠颜色（`--muted-strong`）与框线。frontier 桌面端的差别在于 chrome 一档更小更细、按钮更矮，正文不变。

## 2. 约束（两张变体共同遵守）

| 项 | 约束 | 门槛 / 断言 |
|---|---|---|
| 正文不动 | `--text-reading` 15、`--text-body` 14 不变；消息与文档阅读面字号、行高不变 | composition 既有断言不变 |
| 对比度 | 所有文字 ≥ 4.5:1（不因字号变小而降级到 3:1）；`--muted-strong` 若在 11px 下不足则改色阶而不是加粗 | `contrast-report` 全通过 |
| 命中区 | 390 下可见控件 ≥ 44 不变；桌面控件可矮，键盘焦点环不变 | RC 视口 36/36 |
| 三档 | `--text-scale` 三档保留，比例不变 | settings-preferences 单测 |
| 字体 | 不引新字体；字重只用 400 / 450 / 500 / 550（可变字重轴若不可用则 400 / 500） | lint-colors 不涉；单测枚举 |
| 边框与层级 | WK-69 层级、WK-94 四种边框角色不动；不用新框线补层级 | lint-materials |
| 一次一维 | 不改颜色 token、材质、动效、间距 token（组间 / 行距沿 CC-S） | diff 只触字阶 / 字重 / 字距 / 控件高 |

## 3. 目标值（初值，消融后收敛）

| 角色 | V1 "chrome 收敛，正文不动"（推荐） | V2 "全站一档" |
|---|---|---|
| `--text-title` | 20 → 18，字重 550 → 500 | 20 → 18，500 |
| `--text-navigation-title` | 17 → 15，500 | 17 → 15，500 |
| `--text-reading` | 15 | 15 → 14 |
| `--text-body` | 14 | 14 → 13 |
| `--text-section` | 14 → 13，500 | 13，500 |
| `--text-label` | 13 → 12，450 | 12，450 |
| `--text-meta` | 12 → 11.5，400 | 11，400 |
| `--text-caption` | 11 → 10.5，450，大写字距 0.06 → 0.08em | 10.5，450，0.08em |
| `--control`（桌面） | 32 → 28；按钮字号 → `--text-label`；primary 550 → 500 | 28；同左 |
| segment | 28 → 26，字号 meta | 26 |
| 行高 | 正文 1.5 不变；meta / caption 1.45 | 全站 1.45 |

V1 的赌注：正文不动，chrome 与元数据下移一档，层级差从 1–2px 拉到 2–3.5px 并叠加字重差；V2 的赌注：整体更密，但正文也变小，阅读列 740 上每行字数增加、阅读疲劳风险上升，且 15 → 14 会触动既有阅读断言。Fable 推荐 V1；V2 作为对照必须出，否则无从比较。

## 4. 消融面与比较方法

- 两处消融面：**Settings › General**（行标题 / 说明 / 控件同一屏，CC-S 刚定的组距 40 / 行距 24 不动）与 **Work 头部 + composer 控件**（导航标题、模式词、scope 位、Send / Cancel run、run badge）。
- 每张变体在两处各出 1440 浅色一张截图 + 同一 CDP 脚本量出的数值表（字号、字重、控件高、行高、对比度），与现状并排三列。
- 比较问题只问三条（WK-112 §IX hierarchy）：这一屏第一眼落在哪；正文与 chrome 是否能不靠颜色分开；按钮是否仍像可按的东西而不是标签。
- 用户比较后选一张，再全站落地并全量回归（RC / composition / shell / Models / 探测 / primitive / cc-s / cc-w）。

## 5. 不做

不动颜色与材质（FE-05）；不动间距 token；不引新字；不做每组件单独字号；不把 `--text-scale` 三档合并成密度档（密度是设计决定，不是用户偏好）。

## 6. 消融页（EX-CC4，2026-09-09）

静态三栏页在 [type-density-ablation/](type-density-ablation/index.html)（`settings-general.html`、`work-header.html`），真实 DOM + 原文 styles.css + 七个变量与六类选择器覆盖，`zoom` 拼版。结果：对比度不达标 0；V1 把 chrome 与正文的字号差从 1–2px 拉到 2.5–3.5px；V2 因正文也降一档，差反而收窄到 1–2.5px——支持 Fable 推荐 V1。偏离一处：`.settings-tab.is-current` 字重取 500 而非 450，保留选中态的非颜色信号，接受。未覆盖：可变字重轴渲染、深色宗、390、`--tracking-caps` 在两处消融面无可见效果。待用户比较后 FE-05a 成单。
