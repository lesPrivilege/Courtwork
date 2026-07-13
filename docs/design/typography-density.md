# 排版与密度

数值以 `tokens.json` 为准。

## 字体

- UI 使用系统 sans 栈；编号、日期、金额、来源短引使用 mono 或 tabular numerals。
- 要对齐的数字用 mono；句内数字使用 `font-variant-numeric: tabular-nums`。
- 字重只用 regular 与 emphasized 两档，避免 600/700 的中文糊重。
- ≥16px 中文标题可使用轻微负字距；正文不调字距。

## 四档密度

| 档位 | 用途 |
|---|---|
| `reading` | 文书、修订预览、长阅读 |
| `body` | 对话、说明、按钮与普通卡片 |
| `dense` | 表格、列表、时间线与矩阵 |
| `meta` | 元信息、徽章、角标与 citation |

`meta` 是全站最小正文档位；不得把 12px 当普通正文。列表行通过 padding 形成高度，不用相邻 margin 叠加。

## 对齐

- 正式文书阅读面可以两端对齐并启用严格中文换行。
- UI、卡片、表格和对话统一左对齐，避免窄栏中文 justify 拉伸。
- 金额右对齐；同列日期统一 ISO `YYYY-MM-DD`；域编号同屏位数一致。

## KBD

KBD 是不可点击的低语提示：mono、紧凑、细描边、无 hover。一个视口内不超过四组。它不能替代可发现的按钮，也不占用主操作层级。
