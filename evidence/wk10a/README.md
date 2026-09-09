# evidence/wk10a · WO-WK10a 模块导轨、对齐带、composer 层级

基线 `9cb1d7e`（整合支 `claude/wsk-integration`），分支 `claude/wk10-rail`，worktree
`<isolated-checkout>`。App 端口 8855，数据目录 `/private/tmp/se-agent-wk10-data`
（全新，runtime schema 4）。Node v25.9.0。**真实 provider：not_run** —— 该宿主报告
`capabilities.mode = "local-fake"`，本轮未配置也未调用任何真实 provider；截图里那一次 run
走的是宿主自带的 loopback 假 provider（`Local test`），不读任何凭据。

## 复现

```sh
npm --prefix app ci
npm --prefix app start -- --data-dir /private/tmp/se-agent-wk10-data --port 8855 &
node evidence/rc/mcp-fixture.mjs &                       # loopback MCP 线路 fixture，8851
RC_PORT=8855 node evidence/rc/seed-fixture.mjs           # 项目、会话、每种 kind 一条 runtime 资源
WK10A_BASE=http://127.0.0.1:8855 node evidence/wk10a/dom-assertions.mjs   # 16 条断言 -> dom-assertions.json
WK10A_BASE=http://127.0.0.1:8855 node evidence/wk10a/shoot.mjs            # 13 张 PNG
WK6_BASE=http://127.0.0.1:8855  node evidence/wk6/home-interaction-checks.mjs
RC_APP=http://127.0.0.1:8855/ RC_PORT=8855 node evidence/rc/verify.mjs
```

`shoot.mjs` 会通过产品自己的 composer 发一次消息，好让 Run 模块有事实可陈述；
`materials/` 三个文件用 `POST /sessions/:id/materials`（产品自己的 API）写入。

## 文件

| 文件 | 内容 |
|---|---|
| `dom-assertions.mjs` / `.json` | 16 条 DOM 断言，全部用页内 `getBoundingClientRect()` 读数，不从 CSS 推断：对齐带三栏同 top 同高、卡片 gutter 与零外边距、740 列同一左缘、两态各显示什么、展开态在壳内且非 modal、Escape 两步、tab 键盘、折叠展开三次不重读、390 coarse pointer 无 < 44 控件、两处无横向溢出。16/16。 |
| `home-*.png` | Home，1440 / 390 × 浅 / 深。 |
| `session-collapsed-*.png` | 会话 + 导轨收敛态（Run / Workspace / Runtime 三张卡），1440 / 390 × 浅 / 深。 |
| `session-expanded-*.png` | 会话 + 导轨展开态（tab 条在带内，壳内接管中栏），1440 / 390 × 浅 / 深。 |
| `session-collapsed-1440-reduced-motion.png` | `prefers-reduced-motion: reduce` 下的收敛态；同一轮里读到 `getAnimations()` 中处于 `running` 的元素数为 **0**（无动效残留）。 |
| `shoot.mjs` | 截图脚本；每个状态都经产品自身控件到达（`#show-surface-button`、卡片的 Open、Escape），不直接改 state。 |

## 关键读数（1440 × 900，浅宗；深宗几何相同）

| 量 | 读数 | 对照 |
|---|---|---|
| 侧栏 wordmark 行 / chat header / rail band 的 `top` | 0 · 0 · 0 | 画布 §8.1 相等 ✔ |
| 三者高度 | 56 · 56 · 56 | `--band-top` ✔ |
| 模块卡左缘 | 1085 | 画布 §8.2 的 1085 ✔ |
| 右栏面板左缘 | 1061；卡左 − 面板左 = **24** | 一个 `--col-gap` ✔ |
| 模块卡 `margin` | `0px 0px 0px` | 「模块内容不自带外边距」✔ |
| chat header 内层 / 正文 / composer 左缘 | 285 · 285 · 285 | 画布 §8.2 的 0 差 ✔ |
| 展开态 tab 条 `top` | 0，与侧栏 wordmark 行同带 | WK-42 ✔ |
| 折叠 ↔ 展开切换 3 次触发的 `/workspace`、`/runtime-control` 请求 | 0 · 0 | 两态共用同一次读 ✔ |
| 390 + coarse pointer 下高度 < 44 的可见控件 | 0（共 8 个控件） | 编排体例触控档 ✔ |
| 1440 收敛 / 展开的横向溢出 | 0 · 0 | ✔ |

## 一处与画布数字的出入

画布 `clean-evaluation.md` §8.2 写「rail header 内容左 = 1061，故 rail 标题与卡片左边缘差
24」。产品里 rail band 与 rail body 用的是同一个 `--col-gap` 内距，因此**带内标题与卡片左缘
相等（1085）**，不差 24。保留后者：右栏内一条左缘，与中栏「标题行与正文列同一左缘」是同一条
规则；若照 §8.2 让标题贴面板边，右栏内部就会出现两条左缘。差异登记在此，请架构裁定。

## 未在本目录记录的验证

- `npm --prefix app test`：136/136（见交付 §3）。
- `node tools/lint-colors.mjs` / `contrast-report.mjs`：见交付 §3。
- WO-RC 三套：见 `evidence/rc/*.json`，本轮重跑后 18/19 · 8/9 · 36/36，两条未过项是 README
  记明需手工把 MCP fixture 重指向 `127.0.0.1:8851` 的那两条（`remote-tools`、`mcp-lifecycle`），
  与本单改动无关；`runtime-ui-viewport.mjs` 的 `escape-order` 一条已按 WK-54 的两步次序改写。
- 真实设备的 IME、软键盘、VoiceOver、真实触屏、浏览器 200% 缩放：**未验证**。
