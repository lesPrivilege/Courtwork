# FE-02 证据

2026-09-09，Claude Opus 作者验证。交付页：[delivery-fe02](../../delivery-fe02.md)。基线 `main` `2b6c221`，分支 `claude/fe02-models`。

全程 local-fake / loopback；未读取任何凭据文件，未配置真实 provider，fixture 内无任何真实 key。

| 文件 | 内容 |
|---|---|
| `browser.mjs` · `seed.mjs` | 自 `evidence/fe01/` 逐字复制，只改默认端口（8887 / CDP 19887） |
| `models-checks.mjs` · `.json` · `.log` | Models 与 Tools 两组的五轮收敛断言，16 / 16 |
| `counterexamples.mjs` · `.json` · `.log` | FE-T03 请求值 / 有效值 / 绑定值，5 / 5 |
| `composition-checks.mjs` · `.log` | FE-01 的 Home / Work 几何套件（含 `--nav` 256 后重跑），16 / 16 |
| `rc/` | RC 契约 / 反例 / 视口三支，20 / 9 / 36；`runtime-ui-viewport.mjs` 改了一处量法（segment 命中区归属），注释里写明 |
| `tests.log` · `install.log` · `lint-colors.log` · `lint-materials.log` · `contrast.log` · `smoke.log` | 219 / 219、两项 lint、contrast、smoke |
| `settings-models-*.png` · `settings-tools-1440-light.png` | 1440 与 390 的 Models（含 Add provider 展开）与 Tools 截图 |
| `server.log` · `server-t03.log` · `rc/server.log` · `seed*.log` | 三个实例的启动与 fixture 输出 |

复现：

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
# 三个独立进程，三个仓外空数据目录
npm --prefix app start -- --data-dir <main-data> --port 8887
npm --prefix app start -- --data-dir <t03-data>  --port 8889
npm --prefix app start -- --data-dir <rc-data>   --port 8890
MCP_PORT=8888 node engineering/mvp/execution/work-surface-kit/evidence/fe02/rc/mcp-fixture.mjs

APP_URL=http://127.0.0.1:8887 node .../fe02/seed.mjs
APP_URL=http://127.0.0.1:8889 WK13_STAGE=failed node .../fe02/seed.mjs
APP_URL=http://127.0.0.1:8887 WK6_CDP_PORT=19895 node .../fe02/models-checks.mjs
APP_URL=http://127.0.0.1:8887 WK6_CDP_PORT=19896 node .../fe02/composition-checks.mjs
APP_URL=http://127.0.0.1:8889 FROZEN_APP_URL=http://127.0.0.1:8887 WK6_CDP_PORT=19897 node .../fe02/counterexamples.mjs
RC_PORT=8890 MCP_PORT=8888 node .../fe02/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8890/ RC_CDP_PORT=19892 RC_CHROME_DIR=<new-profile> node .../fe02/rc/verify.mjs
```

RC 重跑前用 `RC_PORT=8890 node .../fe02/rc/reset-fixture.mjs` 清掉反例留下的配置覆盖。`counterexamples.mjs` 会在 8889 上把连接改到 DeepSeek 再改回本地（FE-T03-c / d），跑完数据目录回到起点。
