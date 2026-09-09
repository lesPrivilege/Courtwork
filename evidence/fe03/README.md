# FE-03 证据 · Chat / Work / Memory shell 与第 0 项（BE-17/18 消费）

2026-09-09 · Claude Opus，作者验证。基线 `main` `4d9714e`，分支 `claude/fe03-chat-work`。
全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。

## 端口、数据目录与顺序

一个应用端口（8895）按用途轮换，每次换用途都换一个**全新的空数据目录**并重新播种；
`probe-checks` 自己起的目录 fixture 绑在临时端口（`listen(0)`）上，不占用任何登记端口。

| 用途 | 端口 | 数据目录 | fixture |
|---|---|---|---|
| Models 五轮收敛、Home / Work 几何、FE-T01（无绑定 / 读取失败） | 8895 | `…-data/main` | `seed.mjs`，`stage=rows` |
| FE-T01（无数据） | 8895 | `…-data/t01` | 无（空目录即空态） |
| 第 0 项三种探测展示 | 8895 | `…-data/t01` | `probe-checks.mjs` 自带的 loopback 目录 fixture（临时端口） |
| Chat / Work shell、Settings › Memory、FE-T11 | 8895 | `…-data/work` | `work-seed.mjs`（inbound-nda，逐字复制自 wk10b2） |
| FE-T03 a–d | 8895 | `…-data/t03` | `seed.mjs`，`WK13_STAGE=failed` |
| FE-T03-e（冻结） | 8896 | `…-data/frozen` | `seed.mjs`，`stage=rows`（含等人回答的 Run） |
| RC 三支 | 8895 | `…-data/rc` | `rc/seed-fixture.mjs`；MCP 线路 fixture **8896** |

8850–8861、8810、8817、8818、8887–8893、8921–8923 未使用。本单启动的全部 server、
MCP fixture 与 headless Chrome 已停止；8895 / 8896 已释放。

## 复跑

```sh
npm --prefix app ci && npm --prefix app test
node tools/lint-colors.mjs && node tools/lint-materials.mjs && node tools/contrast-report.mjs
npm --prefix app run smoke

npm --prefix app start -- --data-dir <空目录> --port 8895
APP_URL=http://127.0.0.1:8895 node evidence/fe03/seed.mjs
APP_URL=http://127.0.0.1:8895 WK6_CDP_PORT=19895 node evidence/fe03/models-checks.mjs
APP_URL=http://127.0.0.1:8895 WK6_CDP_PORT=19896 node evidence/fe03/composition-checks.mjs
APP_URL=http://127.0.0.1:8895 WK6_CDP_PORT=19897 T01_CASE=rows  node evidence/fe03/fe-t01.mjs
# 换空目录，不播种
APP_URL=http://127.0.0.1:8895 WK6_CDP_PORT=19898 T01_CASE=empty node evidence/fe03/fe-t01.mjs
APP_URL=http://127.0.0.1:8895 WK6_CDP_PORT=19899 node evidence/fe03/probe-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8895 node evidence/fe03/work-seed.mjs
APP_URL=http://127.0.0.1:8895 WK6_CDP_PORT=19900 node evidence/fe03/shell-checks.mjs
APP_URL=http://127.0.0.1:8895 node evidence/fe03/fe-t11.mjs
# 换空目录（8895，failed stage）与第二个空目录（8896，rows stage）
APP_URL=http://127.0.0.1:8895 FROZEN_APP_URL=http://127.0.0.1:8896 WK6_CDP_PORT=19901 \
  node evidence/fe03/counterexamples.mjs
# 换空目录
MCP_PORT=8896 node evidence/fe03/rc/mcp-fixture.mjs
RC_PORT=8895 MCP_PORT=8896 node evidence/fe03/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8895/ RC_CDP_PORT=19902 RC_CHROME_DIR=<新 profile> node evidence/fe03/rc/verify.mjs
```

`shell-checks.mjs` 与 `fe-t11.mjs` **不是幂等的**：前者把一个 Chat 续成 Work，后者换源并记一条
决定。重跑前必须换一个新数据目录并重新播种，否则第一条断言会读到上一次留下的绑定。

## 结果

| 套件 | 结果 | 文件 |
|---|---|---|
| `npm --prefix app test` | 228 / 228 | — |
| lint-colors / lint-materials / contrast / smoke | ok / ok / 全通过 / 通过（`realProvider: not_run`） | — |
| Models & Tools 五轮收敛 | 18 / 18 | `models-checks.json` |
| Home / Work 几何 | 16 / 16 | `composition-checks.json` |
| Chat / Work / Memory shell 五轮收敛 | 12 / 12 | `shell-checks.json` |
| 第 0 项三种探测展示 | 8 / 8 | `probe-checks.json` |
| FE-T01 | 3 / 3（无数据）· 4 / 4（无绑定 + 读取失败） | `fe-t01-empty.json` · `fe-t01-rows.json` |
| FE-T11 | 6 / 6 | `fe-t11.json` |
| FE-T03 | 5 / 5 | `counterexamples.json` |
| RC 契约 / 反例 / 视口 | 20 / 20 · 9 / 9 · 36 / 36 | `rc/*.json`、`rc/verify.log` |

截图由脚本生成；作者目视核对 `settings-models-probe-1440-light`、`chat-1440-light`、
`work-1440-light`、`continue-in-work-1440-light`、`settings-memory-1440-light` 五张，
其余只做几何 / 文本断言。视觉四轴留用户，本页不自评。
