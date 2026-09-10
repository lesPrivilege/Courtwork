# WK7 对比度表（WCAG 2.x 相对亮度）

生成：`node tools/contrast-report.mjs`。门槛：文字 4.5:1，非文字 3:1。边线（line / line-strong）不作为控件的唯一指示（输入有焦点环），不设门槛，见 color-governance §2。

## lead-gray · light

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 12.87 | 4.5 | 通过 |
| ink | float | 14.05 | 4.5 | 通过 |
| ink | frame | 10.98 | 4.5 | 通过 |
| muted-strong | frame | 4.66 | 4.5 | 通过 |
| muted-strong | panel | 5.46 | 4.5 | 通过 |
| muted-strong | float | 5.96 | 4.5 | 通过 |
| muted | panel | 5.46 | 3 | 通过 |
| accent-ink | panel | 12.87 | 4.5 | 通过 |
| accent-ink | float | 14.05 | 4.5 | 通过 |
| on-accent | accent | 13.82 | 4.5 | 通过 |
| on-accent | accent-strong | 13.82 | 4.5 | 通过 |
| danger | panel | 6.22 | 4.5 | 通过 |
| success | panel | 5.30 | 4.5 | 通过 |
| focus | panel | 12.87 | 3 | 通过 |
| focus | float | 14.05 | 3 | 通过 |
| ink | hover | 10.98 | 4.5 | 通过 |
| ink | selected | 10.34 | 4.5 | 通过 |
| ink | accent-soft | 11.92 | 4.5 | 通过 |
| danger | danger-soft | 5.92 | 4.5 | 通过 |
| attention-review | panel | 5.71 | 4.5 | 通过 |
| attention-review | float | 6.23 | 4.5 | 通过 |
| attention-review | panel-muted | 5.29 | 4.5 | 通过 |
| attention-review | hover | 4.87 | 4.5 | 通过 |
| muted-strong | panel-muted | 5.06 | 4.5 | 通过 |

## lead-gray · dark

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 14.00 | 4.5 | 通过 |
| ink | float | 11.72 | 4.5 | 通过 |
| ink | frame | 16.03 | 4.5 | 通过 |
| muted-strong | frame | 9.28 | 4.5 | 通过 |
| muted-strong | panel | 8.10 | 4.5 | 通过 |
| muted-strong | float | 6.78 | 4.5 | 通过 |
| muted | panel | 8.10 | 3 | 通过 |
| accent-ink | panel | 14.00 | 4.5 | 通过 |
| accent-ink | float | 11.72 | 4.5 | 通过 |
| on-accent | accent | 17.28 | 4.5 | 通过 |
| on-accent | accent-strong | 17.28 | 4.5 | 通过 |
| danger | panel | 7.25 | 4.5 | 通过 |
| success | panel | 8.14 | 4.5 | 通过 |
| focus | panel | 14.00 | 3 | 通过 |
| focus | float | 11.72 | 3 | 通过 |
| ink | hover | 10.44 | 4.5 | 通过 |
| ink | selected | 8.30 | 4.5 | 通过 |
| ink | accent-soft | 15.05 | 4.5 | 通过 |
| danger | danger-soft | 7.75 | 4.5 | 通过 |
| attention-review | panel | 7.97 | 4.5 | 通过 |
| attention-review | float | 6.68 | 4.5 | 通过 |
| attention-review | panel-muted | 8.57 | 4.5 | 通过 |
| attention-review | hover | 5.94 | 4.5 | 通过 |
| muted-strong | panel-muted | 8.71 | 4.5 | 通过 |

## gray-steel · light

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 16.29 | 4.5 | 通过 |
| ink | float | 16.29 | 4.5 | 通过 |
| ink | frame | 14.30 | 4.5 | 通过 |
| muted-strong | frame | 5.19 | 4.5 | 通过 |
| muted-strong | panel | 5.92 | 4.5 | 通过 |
| muted-strong | float | 5.92 | 4.5 | 通过 |
| muted | panel | 3.79 | 3 | 通过 |
| accent-ink | panel | 6.93 | 4.5 | 通过 |
| accent-ink | float | 6.93 | 4.5 | 通过 |
| on-accent | accent | 6.93 | 4.5 | 通过 |
| on-accent | accent-strong | 8.32 | 4.5 | 通过 |
| danger | panel | 6.79 | 4.5 | 通过 |
| success | panel | 5.78 | 4.5 | 通过 |
| focus | panel | 14.05 | 3 | 通过 |
| focus | float | 14.05 | 3 | 通过 |
| ink | hover | 14.30 | 4.5 | 通过 |
| ink | selected | 13.30 | 4.5 | 通过 |
| ink | accent-soft | 14.54 | 4.5 | 通过 |
| danger | danger-soft | 5.92 | 4.5 | 通过 |
| attention-review | panel | 6.23 | 4.5 | 通过 |
| attention-review | float | 6.23 | 4.5 | 通过 |
| attention-review | panel-muted | 5.92 | 4.5 | 通过 |
| attention-review | hover | 5.47 | 4.5 | 通过 |

## gray-steel · dark

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 13.71 | 4.5 | 通过 |
| ink | float | 12.37 | 4.5 | 通过 |
| ink | frame | 16.28 | 4.5 | 通过 |
| muted-strong | frame | 9.11 | 4.5 | 通过 |
| muted-strong | panel | 7.67 | 4.5 | 通过 |
| muted-strong | float | 6.92 | 4.5 | 通过 |
| muted | panel | 3.76 | 3 | 通过 |
| accent-ink | panel | 7.70 | 4.5 | 通过 |
| accent-ink | float | 6.95 | 4.5 | 通过 |
| on-accent | accent | 5.62 | 4.5 | 通过 |
| on-accent | accent-strong | 4.87 | 4.5 | 通过 |
| danger | panel | 7.55 | 4.5 | 通过 |
| success | panel | 8.48 | 4.5 | 通过 |
| focus | panel | 14.58 | 3 | 通过 |
| focus | float | 13.15 | 3 | 通过 |
| ink | hover | 13.71 | 4.5 | 通过 |
| ink | selected | 12.37 | 4.5 | 通过 |
| ink | accent-soft | 12.82 | 4.5 | 通过 |
| danger | danger-soft | 7.75 | 4.5 | 通过 |
| attention-review | panel | 8.30 | 4.5 | 通过 |
| attention-review | float | 7.49 | 4.5 | 通过 |
| attention-review | panel-muted | 9.17 | 4.5 | 通过 |
| attention-review | hover | 8.30 | 4.5 | 通过 |

## dystopia · light

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 12.33 | 4.5 | 通过 |
| ink | float | 13.50 | 4.5 | 通过 |
| ink | frame | 10.70 | 4.5 | 通过 |
| muted-strong | frame | 4.87 | 4.5 | 通过 |
| muted-strong | panel | 5.61 | 4.5 | 通过 |
| muted-strong | float | 6.14 | 4.5 | 通过 |
| muted | panel | 4.31 | 3 | 通过 |
| accent-ink | panel | 12.33 | 4.5 | 通过 |
| accent-ink | float | 13.50 | 4.5 | 通过 |
| on-accent | accent | 13.50 | 4.5 | 通过 |
| on-accent | accent-strong | 15.93 | 4.5 | 通过 |
| danger | panel | 5.98 | 4.5 | 通过 |
| success | panel | 5.09 | 4.5 | 通过 |
| focus | panel | 12.36 | 3 | 通过 |
| focus | float | 13.53 | 3 | 通过 |
| ink | hover | 10.90 | 4.5 | 通过 |
| ink | selected | 10.15 | 4.5 | 通过 |
| ink | accent-soft | 11.46 | 4.5 | 通过 |
| danger | danger-soft | 5.92 | 4.5 | 通过 |
| attention-review | panel | 5.48 | 4.5 | 通过 |
| attention-review | float | 6.00 | 4.5 | 通过 |
| attention-review | panel-muted | 5.09 | 4.5 | 通过 |
| attention-review | hover | 4.85 | 4.5 | 通过 |

## dystopia · dark

| 角色 | 底面 | 比值 | 门槛 | 结果 |
|---|---|---:|---:|---|
| ink | panel | 11.99 | 4.5 | 通过 |
| ink | float | 10.28 | 4.5 | 通过 |
| ink | frame | 14.29 | 4.5 | 通过 |
| muted-strong | frame | 9.32 | 4.5 | 通过 |
| muted-strong | panel | 7.83 | 4.5 | 通过 |
| muted-strong | float | 6.71 | 4.5 | 通过 |
| muted | panel | 5.70 | 3 | 通过 |
| accent-ink | panel | 11.99 | 4.5 | 通过 |
| accent-ink | float | 10.28 | 4.5 | 通过 |
| on-accent | accent | 14.29 | 4.5 | 通过 |
| on-accent | accent-strong | 16.14 | 4.5 | 通过 |
| danger | panel | 6.86 | 4.5 | 通过 |
| success | panel | 7.71 | 4.5 | 通过 |
| focus | panel | 13.24 | 3 | 通过 |
| focus | float | 11.35 | 3 | 通过 |
| ink | hover | 10.13 | 4.5 | 通过 |
| ink | selected | 8.49 | 4.5 | 通过 |
| ink | accent-soft | 10.13 | 4.5 | 通过 |
| danger | danger-soft | 7.75 | 4.5 | 通过 |
| attention-review | panel | 7.54 | 4.5 | 通过 |
| attention-review | float | 6.46 | 4.5 | 通过 |
| attention-review | panel-muted | 8.71 | 4.5 | 通过 |
| attention-review | hover | 6.37 | 4.5 | 通过 |

