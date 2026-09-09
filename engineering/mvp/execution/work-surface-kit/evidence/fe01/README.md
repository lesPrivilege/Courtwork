# FE-01 作者验证证据（2026-09-09）

作者：Claude Opus。**这是作者验证，不是独立验收**（handoff-convention §1）。交付页 [delivery-fe01](../../delivery-fe01.md)。

基线 `main` `1688a7b`，分支 `claude/fe01-vocab-ia`，分支头 `dd8935e`。全程 `fake-openai-loopback`；未读取任何凭据文件。

## 怎么重跑

```sh
# 1 · 静态与单元
npm --prefix app ci
npm --prefix app test                 # 212 / 212（含新增的 material-governance 4 条）
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke

# 2 · Home / Work composition 与三个反例（WK13 fixture）
SE_RUNTIME_DATA_DIR=<empty-dir> PORT=8885 node app/server/index.mjs &
APP_URL=http://127.0.0.1:8885 node engineering/mvp/execution/work-surface-kit/evidence/fe01/seed.mjs
APP_URL=http://127.0.0.1:8885 node engineering/mvp/execution/work-surface-kit/evidence/fe01/composition-checks.mjs
APP_URL=http://127.0.0.1:8885 node engineering/mvp/execution/work-surface-kit/evidence/fe01/counterexamples.mjs

# 3 · RC 三支（另一个空数据目录 + MCP 线路 fixture）
SE_RUNTIME_DATA_DIR=<other-empty-dir> PORT=8885 node app/server/index.mjs &
MCP_PORT=8886 node engineering/mvp/execution/work-surface-kit/evidence/fe01/rc/mcp-fixture.mjs &
RC_PORT=8885 MCP_PORT=8886 node engineering/mvp/execution/work-surface-kit/evidence/fe01/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8885/ RC_CDP_PORT=19886 node engineering/mvp/execution/work-surface-kit/evidence/fe01/rc/verify.mjs

# 4 · 九个 Settings 组的截图（跑在 RC fixture 上）
APP_URL=http://127.0.0.1:8885 node engineering/mvp/execution/work-surface-kit/evidence/fe01/shots.mjs
```

## 结果

| 套件 | 结果 | 原文 |
|---|---|---|
| `npm --prefix app test` | 212 / 212 | [tests.log](tests.log) |
| `tools/lint-colors.mjs` | ok（15 files） | [lint-colors.log](lint-colors.log) |
| `tools/lint-materials.mjs` | ok（2 files） | [lint-materials.log](lint-materials.log) |
| `tools/contrast-report.mjs` | 无"低于门槛" | [contrast.log](contrast.log) |
| `npm --prefix app run smoke` | 7 checks，`realProvider: not_run` | [smoke.log](smoke.log) |
| composition-checks（WK-96 / 97） | **16 / 16** | [.log](composition-checks.log) · [.json](composition-checks.json) |
| counterexamples（FE-T02 / T09 / T10） | **12 / 12** | [.log](counterexamples.log) · [.json](counterexamples.json) |
| RC 契约 / 反例 / 视口 | **20 / 9 / 36** | [rc/verify.log](rc/verify.log) 与同目录三个 json |

## 文件

- `browser.mjs` · `seed.mjs` — 自 `evidence/wk13-main-integration-20260908/` 逐字复制，只改默认端口。
- `composition-checks.mjs` — WK-96 / WK-97 的版面法则作为断言；截图 `home-1440-light.png`、`home-390-light.png`、`work-1440-light.png`、`work-surface-1440-light.png`、`home-desktop-shell-1440-light.png`。
- `counterexamples.mjs` — FE-T02 / FE-T09 / FE-T10。
- `shots.mjs` + `shots/` — 九个 Settings 组各一张。
- `rc/` — 自 `evidence/wk11-main-integration-20260909/rc/` 复制并按 WK-90 的新 IA 改写入口与量测范围；每处改动在脚本注释里写明改的是什么、为什么改的不是断言本身。原副本仍是旧 IA，Astra 独验前需同样更新（[delivery-fe01 §7](../../delivery-fe01.md)）。

## 未检（一律 not_run）

触控 · 读屏（VoiceOver / NVDA）· 真实 IME · 200 % 浏览器缩放 · 1024–1439 中间档 · 真实 provider。视觉四轴留用户。
