# evidence/wk10b-1 · WO-WK10b 第一段 的实测

服务器 `http://127.0.0.1:8873`，数据目录 `/private/tmp/se-agent-wk10b-data`（全新建立），
fixture 由 `RC_PORT=8873 node evidence/rc/seed-fixture.mjs` 种下，Chat Flow 的行由
`seed.mjs` 通过产品自己的 composer 与授权卡产生。宿主 `capabilities.mode = "local-fake"`：
**真实 provider not_run**，所有 run 出自宿主自带的 loopback 假 provider，全程未配置也未读取任何凭据文件。

CDP 端口 19650–19670（本轮独占，不与其它轮次冲突）。浏览器＝ playwright 缓存的
`chromium_headless_shell-1228`，与 WK10a-r2 同一具。

| 文件 | 内容 |
|---|---|
| `harness.mjs` | CDP 接线（沿 evidence/wk6、wk10a-r2、final-integration 的同一具） |
| `seed.mjs` / `seed.json` | 通过产品控件造出：一个已答问题、一次 allow 的写入、一次 deny 的写入、一个失败工具行 |
| `checks.mjs` / `checks.json` | 22 条断言：行解剖、槽位三态、FE-T05、FE-T07、生命周期、Escape、可访问名、几何 |
| `shoot.mjs` | 同条件截图，`WK10B_TAG=before\|after` 两遍（before 以 `git stash` 回到基线 `a2c2e4c` 的 web 源码，同一台服务器、同一份数据） |
| `question-live.mjs` | 未决 ask-user 卡（`Answer requested` 消融点）的前后对照；拍完用产品自己的 Stop 关闭该 Run |
| `flow-head-*` / `flow-*` | Chat Flow 头部（已答问题、两次授权决定）与尾部（失败工具行），1440 / 390 × 浅深 |
| `question-live-1440-light-*` | 未决问题卡：before 有 `Answer requested` 抬头 + 独立 prompt 段；after 只有一条行解剖 + Answer |
| `slot-mounted-1440-light-*` | 已加载且贡献 renderer 的 producer：renderer 挂载 |
| `slot-renderer-absent-*` | 已加载但 `surface: null` 的 producer（`inbound-nda`）：只读行，无按钮 |
| `slot-producer-unloaded-1440-light-*` | 同一 producer 被 unload：只读行 + `read only` + `stateVersion` |
| `flow-200pct-light-*` / `viewport-*.json` | 200 % 缩放（720×450 CSS 视口）：横向溢出 0 |
| `flow-1440-reduced-motion-*` | `prefers-reduced-motion: reduce`：仍在 running 的动画 0 |
| `contrast.md` | `node tools/contrast-report.mjs` 的本轮输出 |

## 复跑

```
npm --prefix app start -- --data-dir /private/tmp/se-agent-wk10b-data --port 8873
RC_PORT=8873 node evidence/rc/seed-fixture.mjs
WK10B_BASE=http://127.0.0.1:8873 WK10B_CDP_PORT=19650 node …/wk10b-1/seed.mjs
WK10B_BASE=http://127.0.0.1:8873 WK10B_CDP_PORT=19652 node …/wk10b-1/checks.mjs
WK10B_BASE=http://127.0.0.1:8873 WK10B_CDP_PORT=19655 WK10B_TAG=after node …/wk10b-1/shoot.mjs
```

`checks.mjs` 需要两个已绑定的会话（`Memo review` → `evidence-memo`，`NDA review` → `inbound-nda`）；
它们由 delivery §"数据与位置"记录的 `/api/v5` 调用建立，全部走产品既有路由。

未检：真实触控、真实读屏、真实 provider。视口模拟不是触控实测。
