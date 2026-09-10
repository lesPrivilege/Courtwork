# ATT-FE-01 证据 · Attention 处置面（WK-158）

2026-09-10 · Claude Opus，**作者验证**（独验另计，本页不代它写结论）。
基线 `main` `2e9da09`，分支 `claude/att-fe01-triage`。交付页 [delivery-att-fe01](../../engineering/mvp/execution/work-surface-kit/delivery-att-fe01.md)。
全程 local-fake / loopback：未配置真实 provider，未读取凭据文件，fixture 内没有任何真实 key，
也没有任何真实邮件、PR 或通知——五个对象都是本页 `seed.mjs` 写出来的。

## 端口、数据目录与顺序

| 用途 | 端口 | 数据目录 | fixture | CDP |
|---|---|---|---|---|
| 浏览器断言与截图 | 8899 | `/private/tmp/se-att-fe01-data/main3` | `seed.mjs` | 19951 |
| 描述符捕获 | 进程内（`listen(0)`） | 临时目录 | `capture-action-fixtures.mjs` 自带 | — |
| ATT-ACT-1…5 与 Later 用例 | 进程内（`listen(0)`） | 临时目录 | 用例自建 | — |

本单启动的 server 与 headless Chrome 均已停止，8899 已释放。

## 脚本来源

`browser.mjs` 逐字复制自 `evidence/fe04/browser.mjs`，**只改端口**（8897 → 8899、CDP 19905 → 19951）。
本单新增三个脚本：

- `seed.mjs` —— 通过 app 自己的 `/api/v5` 造五个对象，覆盖五个状态；不起任何 Run。
- `capture-action-fixtures.mjs` —— 从运行中的 Core 捕获 `human_actions`（open 与 resolved 两态），
  写入 `app/tests/fixtures/attention-actions.json`。视图测试读它，因此不可能比后端多认一个动作。
- `checks.mjs` —— 真实 headless Chromium 的行为断言与截图，结果落 `checks.json`。

**合成手段两处，都在传输，不在答案**：

1. 页内包一层 `window.fetch`，把 `/actions` 扣住 2.4 s，用来拍在途态（loopback 上在途窗口只有几毫秒）。
   请求照发、服务端照处理、回执照给。
2. 一次把 inspect 的 URL 改写成不存在的 id，用来拍「item unavailable」。合同没有删除动作，
   不改写就没有这一态可拍。

版本冲突**不是**合成：脚本以第二个客户端真实推进了 `indexing` 的 revision，浏览器里的提交因此真被 409 拒绝。

## 结果

| 文件 | 内容 |
|---|---|
| `checks.json` / `checks.log` | 视图、行解剖、键盘、动作、并发、窄屏、网络七组观察 |
| `screenshots/*.png` | 11 张：`all` / `needs-you` / `later`（暗） / `resolve` / `snooze`（暗） / `waiting` / `sending` / `conflict` / `unavailable` / 390 列表 / 390 详情 |
| `tests.log` | `npm --prefix app test` 全量 |
| `smoke.log` | `npm --prefix app run smoke` |
| `lint-colors.log`、`lint-materials.log`、`lint-interaction.log`、`contrast.log` | 治理 lint 与对比度 |
| `npm-ci.log` | 依赖安装 |
| `seed.log` | fixture 写入后的 registry 快照 |

`checks.json` 里值得单独指出的三条：

- `rows.rendered` 与 `rows.serverOrder` 逐项相同——`All` 没有客户端排序。
- `actions.inFlight` 三个字段说明在途只改提交控件；`actions.afterReceipt` 说明状态词是 re-inspect 之后才变的。
- `network.runResponses` 为 0、`recordedRunCount` 为 0、`pageExceptions` 为 0——读与处置都不起 Run。

## 复跑

```sh
npm --prefix app ci && npm --prefix app test
node tools/lint-colors.mjs && node tools/lint-materials.mjs && node tools/lint-interaction.mjs
node tools/contrast-report.mjs && npm --prefix app run smoke
node app/server/index.mjs --port 8899 --data-dir /tmp/att-fe01-data &
node evidence/att-fe01/seed.mjs && node evidence/att-fe01/checks.mjs
```
