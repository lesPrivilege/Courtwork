# evidence/wk10a-r2 · WO-WK10a 归并轮的实测

服务器 `http://127.0.0.1:8859`，数据目录 `/private/tmp/se-agent-wk10r2-data`（全新），
fixture 由 `RC_PORT=8859 node evidence/rc/seed-fixture.mjs` 种下。宿主
`capabilities.mode = "local-fake"`：**真实 provider not_run**，截图里的那次 run 出自
宿主自带的 loopback 假 provider，全程未配置也未读取任何凭据文件。

| 文件 | 内容 |
|---|---|
| `dom-assertions.mjs` / `.json` | 30 条断言，全部读 `getBoundingClientRect()` 与 `getComputedStyle()`，不从 CSS 推断。`WK10A_BASE=http://127.0.0.1:8859 node evidence/wk10a-r2/dom-assertions.mjs` |
| `shoot.mjs` | 截图：Home / 会话收敛（悬浮卡）/ 会话收敛（glyph 竖条）/ 会话展开，1440 · 1200 · 390 × 浅深两宗，另加一张 reduced-motion |
| `session-collapsed-1440-*.png` | 悬浮卡：三张卡锚在主列右 gutter，thread 与 composer 各自让开 |
| `session-collapsed-1200-*.png` | 主区 950 < 740 + 2·24 + 360，卡收成右缘的 glyph 竖条 |
| `session-expanded-*.png` | L3：`--float` 的面置于 `--scrim` 之上，侧栏不被遮、仍可操作 |

## 关键读数（1440 × 900，浅宗；深宗几何相同）

| 量 | 读数 |
|---|---|
| 悬浮层 `top` / `right` 间距 / 宽 | 80（= `--band-top` 56 + `--col-gap` 24）· 24 · 360 |
| 悬浮层 `bottom` | 692 = composer 顶边 716 − 24 |
| 阅读列左缘（header / composer） | 283 · 283（相等） |
| 阅读列右缘 vs 卡左缘 | 1023 < 1056（不重叠） |
| 展开面 `top` / 右间距 | 80 · 24（与卡同一上缘、同一右 gutter） |
| scrim 左缘 vs 主列左缘 | 250 = 250（只覆主区，不覆侧栏） |
| 1200 × 800 主区宽 / 竖条宽 / 右间距 | 950 · 44 · 24 |
| 深宗实测亮度 frame / panel / float | 0.0057 (`#111113`) < 0.0160 (`#212225`) < 0.0228 (`#272a2d`) |
| 浅宗实测亮度 frame / panel / float | 0.8732 (`#f0f0f3`) < 0.9829 (`#fdfdfe`) = 0.9829（float 靠阴影分层） |
| 折叠 ↔ 展开三次触发的 `/workspace`、`/runtime-control` 请求数 | 0 · 0 |
| 390 + coarse pointer 下 < 44 的可见控件 | 0 / 8 |
| 横向溢出（1440 收敛 / 展开 / 1200 / 390） | 0 |
| reduced motion 下仍在 running 的动画 | 0 |

`rc-runtime-ui-*.json` 是本轮在 8859 上重跑 WO-RC 三套的原始结果（18/19 · 8/9 · 36/36），
与 r1 同两条未过：`remote-tools` 与 `mcp-lifecycle`，均落在 MCP 线路一侧（BE-13），
本轮未动 `runtime-view.mjs` 的渲染与请求。`evidence/rc/` 下 r1 的记录保持原样。
