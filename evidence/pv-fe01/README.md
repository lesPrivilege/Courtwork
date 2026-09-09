# WO-PV-FE01 证据 · 连接面与模型面消费真实连接

2026-09-10 · Claude Opus（本单前端唯一 writer），**作者验证**（独验与合流归 Astra，本页不代它写结论）。
基线 `e61c9d5`（含 WO-PV-BE02 的 `d4b5fa6`），分支 `claude/pvfe01-connections`，树 `/private/tmp/se-agent-pvfe01`。
全程 local-fake / loopback：未联网，未读取任何凭据文件，fixture 内没有任何真实 key。
交付页 [delivery-pv-fe01](../../engineering/mvp/execution/provider-surface/delivery-pv-fe01.md)。

## 端口与数据目录

| 用途 | 端口 | 数据目录 | CDP |
|---|---|---|---|
| 应用 | 8911 | `/private/tmp/se-agent-pvfe01-data/pv`（每次全量重跑前清空重建） | 20080 |
| 兼容端点 fixture | 8912 | —（进程内，转交 `app/runtime/fake-provider.mjs` 的 port 0 实例） | — |
| 「目录不可达」用的死端口 | 8913 | 未启动任何进程（这正是它要证明的） | — |

起服务前逐个 `lsof -nP -iTCP:<port> -sTCP:LISTEN`，三个端口均空闲。本单启动的 server、fixture 与 headless Chrome 已全部停止，8911 / 8912 已释放。

## 脚本来源

`browser.mjs` 逐字复制自 `evidence/cc-d0a/browser.mjs`，**只改端口**（8905 → 8911、8906 → 8912、CDP 20000 起 → 20080 起）；历史来源注释原样保留，首行是本单的复制说明。
`directory-fixture.mjs` 与 `pv-checks.mjs` 是本单新写的：前者是兼容路径需要的**外部**端点（app 内的 fake provider 不是外部端点），它只自己回答目录与那把约定的坏 key，对话原样转交既有 fixture，不另写一份 provider 实现。

## 结果

| 检查 | 结果与位置 |
|---|---|
| `npm --prefix app ci` | 277 包，0 漏洞 · `npm-ci.txt` |
| `npm --prefix app test` | **461 / 461**，fail 0 · `npm-test.txt` |
| `node tools/lint-colors.mjs` | ok（27 files） · `lint-colors.log` |
| `node tools/lint-materials.mjs` | ok（3 files） · `lint-materials.log` |
| `node tools/contrast-report.mjs` | 全部通过 · `contrast.log` |
| `npm --prefix app run smoke` | `{"status":"passed","provider":"local-fake","realProvider":"not_run"}` · `smoke.log` |
| 浏览器断言 PV-FE-1…9 | **9 / 9** · `pv-checks.log`、`pv-checks.json` |

截图：`settings-models-1440-light-before.png`（改动前的三条目录连接）、`-discovered.png`（Fetch models 之后）、`-saved.png`（保存后四行、生效行带后端能力原话）、`-user-window.png`（用户填入窗口后）。

真实 provider：**`not_run`**。凭据只在 Web UI 输入，本单不持有任何真实 key，也未读取任何凭据文件。
