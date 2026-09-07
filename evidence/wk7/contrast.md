# WK7 对比度表（WCAG 2.x 相对亮度）

生成：`node tools/contrast-report.mjs`。门槛：文字 4.5:1，非文字 3:1。边线（line / line-strong）不作为控件的唯一指示（输入有焦点环），不设门槛，见 color-governance §2。

## lead-gray · light

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 16.12 | 4.5 | 通过 |
| ink | canvas | 15.58 | 4.5 | 通过 |
| ink | frame | 14.41 | 4.5 | 通过 |
| muted-strong | frame | 5.22 | 4.5 | 通过 |
| muted-strong | panel | 5.84 | 4.5 | 通过 |
| muted-strong | canvas | 5.65 | 4.5 | 通过 |
| muted | panel | 3.72 | 3 | 通过 |
| accent-ink | panel | 16.12 | 4.5 | 通过 |
| accent-ink | canvas | 15.58 | 4.5 | 通过 |
| on-accent | accent | 16.12 | 4.5 | 通过 |
| on-accent | accent-strong | 19.14 | 4.5 | 通过 |
| danger | panel | 6.68 | 4.5 | 通过 |
| success | panel | 5.69 | 4.5 | 通过 |
| focus | panel | 16.12 | 3 | 通过 |
| focus | canvas | 15.58 | 3 | 通过 |
| ink | hover | 14.41 | 4.5 | 通过 |
| ink | selected | 13.41 | 4.5 | 通过 |
| ink | accent-soft | 13.41 | 4.5 | 通过 |
| danger | danger-soft | 5.92 | 4.5 | 通过 |

## lead-gray · dark

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 13.70 | 4.5 | 通过 |
| ink | canvas | 15.15 | 4.5 | 通过 |
| ink | frame | 16.25 | 4.5 | 通过 |
| muted-strong | frame | 9.06 | 4.5 | 通过 |
| muted-strong | panel | 7.64 | 4.5 | 通过 |
| muted-strong | canvas | 8.45 | 4.5 | 通过 |
| muted | panel | 3.75 | 3 | 通过 |
| accent-ink | panel | 13.70 | 4.5 | 通过 |
| accent-ink | canvas | 15.15 | 4.5 | 通过 |
| on-accent | accent | 16.25 | 4.5 | 通过 |
| on-accent | accent-strong | 18.86 | 4.5 | 通过 |
| danger | panel | 7.55 | 4.5 | 通过 |
| success | panel | 8.48 | 4.5 | 通过 |
| focus | panel | 13.70 | 3 | 通过 |
| focus | canvas | 15.15 | 3 | 通过 |
| ink | hover | 13.70 | 4.5 | 通过 |
| ink | selected | 12.43 | 4.5 | 通过 |
| ink | accent-soft | 12.43 | 4.5 | 通过 |
| danger | danger-soft | 7.75 | 4.5 | 通过 |

## gray-steel · light

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 16.29 | 4.5 | 通过 |
| ink | canvas | 15.48 | 4.5 | 通过 |
| ink | frame | 14.30 | 4.5 | 通过 |
| muted-strong | frame | 5.19 | 4.5 | 通过 |
| muted-strong | panel | 5.92 | 4.5 | 通过 |
| muted-strong | canvas | 5.62 | 4.5 | 通过 |
| muted | panel | 3.79 | 3 | 通过 |
| accent-ink | panel | 6.93 | 4.5 | 通过 |
| accent-ink | canvas | 6.59 | 4.5 | 通过 |
| on-accent | accent | 6.93 | 4.5 | 通过 |
| on-accent | accent-strong | 8.32 | 4.5 | 通过 |
| danger | panel | 6.79 | 4.5 | 通过 |
| success | panel | 5.78 | 4.5 | 通过 |
| focus | panel | 6.93 | 3 | 通过 |
| focus | canvas | 6.59 | 3 | 通过 |
| ink | hover | 14.30 | 4.5 | 通过 |
| ink | selected | 13.30 | 4.5 | 通过 |
| ink | accent-soft | 14.54 | 4.5 | 通过 |
| danger | danger-soft | 5.92 | 4.5 | 通过 |

## gray-steel · dark

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 13.71 | 4.5 | 通过 |
| ink | canvas | 15.15 | 4.5 | 通过 |
| ink | frame | 16.28 | 4.5 | 通过 |
| muted-strong | frame | 9.11 | 4.5 | 通过 |
| muted-strong | panel | 7.67 | 4.5 | 通过 |
| muted-strong | canvas | 8.48 | 4.5 | 通过 |
| muted | panel | 3.76 | 3 | 通过 |
| accent-ink | panel | 7.70 | 4.5 | 通过 |
| accent-ink | canvas | 8.51 | 4.5 | 通过 |
| on-accent | accent | 5.62 | 4.5 | 通过 |
| on-accent | accent-strong | 4.87 | 4.5 | 通过 |
| danger | panel | 7.55 | 4.5 | 通过 |
| success | panel | 8.48 | 4.5 | 通过 |
| focus | panel | 7.70 | 3 | 通过 |
| focus | canvas | 8.51 | 3 | 通过 |
| ink | hover | 13.71 | 4.5 | 通过 |
| ink | selected | 12.37 | 4.5 | 通过 |
| ink | accent-soft | 12.82 | 4.5 | 通过 |
| danger | danger-soft | 7.75 | 4.5 | 通过 |

