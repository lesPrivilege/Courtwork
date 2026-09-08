# WK7 浏览器实测（Chromium，8854，`f8aff61` + 本分支）

| 宗 · 宽 | canvas | panel | panel-muted | accent / accent-ink / focus | on-accent | danger | body 背景 | 横向溢出 |
|---|---|---|---|---|---|---|---|---|
| light · 1440 | #f9f9fb | #fdfdfe | #fcfcfd | #1c2024 | #fdfdfe | #9b3c35 | rgb(253,253,254) | 无 |
| dark · 1440 | #18191b | #212225 | #111113 | #edeef0 | #111113 | #ff9592 | rgb(33,34,37) | 无 |
| dark · 375 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 无 |

`color-scheme` 随 `prefers-color-scheme` 切换（浏览器模拟）；`data-theme="dark|light"` 属性路径未在页面上实测（无宿主开关）。截图未存盘；视觉判断留用户。
