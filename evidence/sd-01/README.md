# WO-SD-01 证据 · Spark 样本面

2026-09-10 · Claude Sonnet，**作者验证**（独验另计，本页不代它写结论）。
基线 `main` `9c8b64e`，分支 `claude/sd01-spark-sample`，实现落在 `3baeffd` / `dde2721` / `3e614b4`。
交付页 [delivery-sd-01](../../engineering/mvp/execution/surface-sample-data/delivery-sd-01.md)。
全程 local-fake / loopback：未配置真实 provider，未读取凭据文件，`app/web/samples/spark-derivations/*.json` 是
SD-7 裁定下晋升为产品资产的既有 fixture，字节未改。

## 端口与顺序

| 用途 | 端口 | 数据目录 |
|---|---|---|
| `npm --prefix app test` / `npm --prefix app run smoke` | 各自随机端口（`port:0`） | 各自临时目录 |
| 浏览器断言与截图（`checks.mjs`） | 8919（服务）、19919（CDP） | `/private/tmp/se-sd01-data`（本单启动，已停止并可复现） |

本单启动的 server 与 headless Chrome 均已停止，8919 / 19919 已释放。工单保留的 8920（fixture）本单未用到——
Spark 样本面不发起任何 Run，不需要 provider 目录 fixture。

## 脚本来源

`browser.mjs` 逐字复制自 `evidence/att-fe01/browser.mjs`（该文件本身逐字复制自更早的 `evidence/fe04/browser.mjs`
一路上溯），只改默认 origin 与 CDP 端口。断言在 `checks.mjs`，本单新写。

**合成手段一处，在传输，不在答案**（同 `evidence/att-fe01/README.md`、
`evidence/delivery-rollup-20260910/spark/independent-verify-repair-20260910/browser-checks.mjs` 的一贯做法，
本页开头也已写明）：页面自己的 `window.fetch` 包一层，只拦截 `/api/v5/work-derivations` 这一条路径，按脚本要求
返回一个有效 live 页（非空/空各一次）或一次 404；其余全部请求——bootstrap、创建两个项目、五个样本 JSON 文件本
身——都打在真实、正在运行的服务器上，未被截获。BE-41 在这个基线上确实没有实现：脚本开局那一次 `unimplemented`
判定读到的是后端真实给出的 404，不是脚本编的。

## 结果

`checks.json` / `checks.log`：10 项真实 headless Chromium 断言，**10 / 10 通过**。

| 编号 | 覆盖 |
|---|---|
| SD01-1 | 入口 "Show sample data" 只在 `unimplemented` 态出现 |
| SD01-2 | 点击入口进入样本态：header 标签 "Sample data" 恰一次，`stale` 场景经既有渲染路径画出 |
| SD01-3 | 场景 select 五项各自可渲染，文案互不相同（quiet/empty/partial/truncated/stale 各一句可辨识文本） |
| SD01-4 | 样本 Matter 标题是纯文字（`<span>`），点击不关闭对话框、不导航 |
| SD01-5 | "Check for a source again" + 有效非空 live 载荷 → 原子切 live，样本态消失，入口不重现 |
| SD01-6 | "Check for a source again" + 有效**空** live 载荷 → 同样切 live（SD-3：空集合仍是 live） |
| SD01-7 | "Check for a source again" + 404 → 留在样本态，标签与内容原样 |
| SD01-10 | "Check for a source again" + 非 404 错误 → 样本态消失，按既有 error 文案显示，入口不重现 |
| SD01-8 | 切换项目 → 样本态消失，回到该项目的 `unimplemented` 判定 |
| SD01-9 | 五个样本 JSON 文件经真实 HTTP 由静态白名单取到，`200` + `application/json; charset=utf-8` |

截图：

- `spark-sample-stale-1440-light.png` —— 工单要求的第一张：样本态（`stale`），header 一行显示
  "Sample data" · 场景 select（"Stale"）· "Check for a source again" · "Hide sample data"。
- `spark-live-empty-1440-light.png` —— 工单要求的第二张：切回 live 后的空态，"No Matters in this project's
  scope."，样本 header 一整行随之消失，只剩 "Refresh"。
- `no-entry-before-check.png` —— 非工单要求的第三张，留作 sanity：`unimplemented` 态本身（"No source yet…" +
  "Show sample data"），证明两张必需截图之外入口确实存在且样式一致。

`npm-ci.log` / `npm-test.log` / `smoke.log`：

| 命令 | 结果 |
|---|---|
| `npm --prefix app ci` | 277 packages, 0 vulnerabilities |
| `npm --prefix app test` | **660 / 660**，fail 0（新增 17：`spark-view.test.mjs` 14 条 `SD-01 ·` 前缀 + `spark-samples.test.mjs` 3 条 `WO-SD-01 ·` 前缀） |
| `npm --prefix app run smoke` | `{"status":"passed","provider":"local-fake",...,"realProvider":"not_run"}` |

## 复跑

```sh
npm --prefix app ci && npm --prefix app test && npm --prefix app run smoke
node app/server/index.mjs --port 8919 --data-dir /tmp/sd01-data &
node evidence/sd-01/checks.mjs
```
