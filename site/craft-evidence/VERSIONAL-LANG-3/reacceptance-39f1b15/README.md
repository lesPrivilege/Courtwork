# VERSIONAL-LANG-3 · gallery 自然深宗独立复验

日期：2026-07-20

对象：`39f1b1506cf3bb4b4d08778135c966f8e2d346f7`

首轮拒绝对象：`d32985ff255aa2b9535e2fbfab3fdd998d3bb638`

结论：**✅ 放行 VERSIONAL-LANG-3**

## 1. 隔离与范围

- 本轮由未参与实现和首轮验收的新会话执行；从目标 SHA 建立 fresh clone
  `/tmp/courtwork-vl3-gallery-reacceptance.9cWljT/repo`，分支
  `codex/versional-lang-3-reaccept-39f1b15`。
- 未复用首轮拒绝 clone、Playwright server、测试进程或端口。定向 e2e 使用独立端口
  `20041–20043`，完整 desktop e2e 使用 `20044`。
- 复验只核对 `39f1b15` 是否关闭 gallery 自然深宗和前向守卫缺口；未修改实现、产品契约、
  SPEC 或机器门，未 push、未部署。

## 2. 首轮阻断关闭

从真实入口 `/visual-gallery.html` 自然进入，不通过脚本、URL 或测试 fixture 手写
`data-theme`。Playwright 只把浏览器的 OS 媒体偏好设为 dark；页面内同一
`installDesktopThemeController()` 路径把解析结果投影到根节点。恢复态定向谱两次均为 **2/2**，
并得到：

| 观测 | 实值 |
|---|---|
| `html[data-theme]` | `dark` |
| `.gallery-header h1` computed color | `rgb(217, 174, 106)` |
| `body` computed color | `rgb(228, 233, 241)` |

这关闭了首轮报告中“固定 light、第四白名单消费者未自然吃深宗”的唯一阻断；结构 gallery 的
四档真实 fixture/provenance 对照同时保持通过。

## 3. 真实 mutation 红证

每个反例都直接改活动实现或活动 e2e 期望，观察红后立即逐字恢复；没有用临时副本冒充注入。

| 反例 | 命令与结果 | 定点失败 |
|---|---|---|
| 把 `visual-gallery.html` 的 `color-scheme` 从 `light dark` 改为 `light` | `node --test site/scripts/versional-language-contract.test.mjs` → **13/14，exit 1** | `VL3-T01` 精确报缺少 `content="light dark"` |
| 删除 gallery 对 `installDesktopThemeController` 的 import | 同上 → **13/14，exit 1** | `VL3-T01` 精确报 import regex 不匹配 |
| 删除 gallery 的 `installDesktopThemeController();` 调用 | 同上 → **13/14，exit 1** | `VL3-T01` 精确报安装调用不匹配 |
| 把 e2e 的泥金标题期望改为浅宗墨色 `rgb(35, 43, 56)` | 端口 `20042` 定向 e2e → **1/2，exit 1** | received 标题仍为 `rgb(217, 174, 106)`；正文仍为 `rgb(228, 233, 241)` |

复位后先以 `git diff --exit-code` 覆盖三份活动文件确认零消费 diff，再在端口 `20043` 重跑
gallery 定向谱 **2/2**。完整 `site:guard` 的 `VL3-T01` 也在恢复态通过。

## 4. 独立全门

| 门 | 结果 |
|---|---|
| `pnpm -r build` | PASS；13/14 workspace；desktop **3580 modules** |
| `pnpm lint` | PASS |
| `pnpm test` | PASS；**148 files / 1261 tests** |
| `pnpm site:guard` | PASS；报告 tip **90/90** Node tests；deslop **918 active text files** |
| `pnpm site:build` | PASS |
| gallery 定向 e2e，端口 `20041`／恢复后 `20043` | 两轮均 **2/2** |
| `COURTWORK_E2E_PORT=20044 pnpm --filter @courtwork/desktop test:e2e` | PASS；完整前链全绿；Playwright **323/323（3.2m）** |

完整谱包含新增的 gallery 自然深宗真断言；`themeMode` Settings、双宗 schema 几何、五档尺寸、
收栏／折叠、composer、残留门与真实 Work 数据面均未回退。build 仅保留既有 dynamic-import 与
chunk-size 提示，无失败。

## 5. 裁决边界

本轮放行只解除 `d32985f` 对 VERSIONAL-LANG-3 第四白名单消费者及其前向门的拒绝。它不重裁
P2 字体、P3/P4、P5、LEGAL-FIELD-1 或终局 `pm.PrdReview` one-shot，也不授权 push／部署。
首轮拒绝报告与本轮实际红证共同保留，不能用本报告改写首轮事实。
