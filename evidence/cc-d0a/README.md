# CC-D0-a 证据 · Home 模块带外壳与现有事实投影（WK-114 / WK-116 R4D-2 / WK-117 (b) / WK-120 / WK-129）

2026-09-09 · Claude Opus（`opus-wo-low`），**作者验证**（Astra 独验另计，本页不代它写结论）。
基线 `main` `fa90763`，分支 `claude/cc-d0a-home-modules`，树 `<isolated-checkout>`。
全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。
交付页 [delivery-cc-d0a](../../engineering/mvp/execution/work-surface-kit/delivery-cc-d0a.md)；准入合同 [contracts/home-modules](../../engineering/mvp/execution/work-surface-kit/contracts/home-modules.md)。

## 端口、数据目录与顺序

应用端口 **8905** 按用途轮换，每换一次用途就换一个**全新的空数据目录**并重新播种；FE-T03 的第二台冻结服务器与 RC 的 MCP 线路 fixture 用 **8906**（两者不同时在跑）。

| 用途 | 端口 | 数据目录 | fixture | CDP |
|---|---|---|---|---|
| Home / Work / Settings 几何与安全区（含 HOME-8…16）、Models、探测、FE-T01（rows） | 8905 | `…-data/cw-ccd0a-settings-*` | `seed.mjs` | 20030 |
| FE-T01（无数据） | 8905 | `…-data/cw-ccd0a-empty-*` | 无 | 20030 |
| Primitive（FE-04 复跑，含 FE-T06） | 8905 | `…-data/cw-ccd0a-primitive-*` | `primitive-seed.mjs` | 20030 |
| FE-T11 | 8905 | `…-data/cw-ccd0a-history-*` | `work-seed.mjs` | — |
| Chat / Work / Memory shell | 8905 | `…-data/cw-ccd0a-shell-*` | `work-seed.mjs` | 20030 |
| FE-T07 | 8905 | `…-data/cw-ccd0a-fe-t07-*` | `work-seed.mjs` | 20030 |
| CC-S 第 0 项（Unknown / Home-End / 两条列表） | 8905 | `…-data/ccs` | `cc-s-seed.mjs` + **SIGKILL 重启** | 20040 |
| 布局全量（composition，含本单新增） | 8905 | `…-data/cw-ccd0a-final-layout-*` | `seed.mjs` | 20030 |
| CC-W 行为断言 | 8905 | `…-data/cw-ccd0a-final-behavior-*` | `cc-w-seed.mjs` | 20030 |
| RC 三支 | 8905 | `…-data/cw-ccd0a-runtime-*` | `rc/seed-fixture.mjs`；MCP fixture **8906** | 20031 |
| FE-T03 a–d / e（冻结） | 8905 / 8906 | `…-data/t03`、`…-data/frozen` | `seed.mjs`（`failed` / 默认） | 20050 |

8850–8861、8810、8817、8818、8887–8904、8921–8953 未使用。一次误用 8907 立即被 `EADDRINUSE` 拒绝（那是别人的服务），未启动任何进程，随即改回 8905；记录见 `cc-s/server.log` 首行。本单启动的全部 server、MCP fixture 与 headless Chrome 已停止；8905 / 8906 已释放。

## 脚本来源

`browser.mjs`、`seed.mjs`、`work-seed.mjs`、`shell-checks.mjs`、`probe-checks.mjs`、`models-checks.mjs`、`counterexamples.mjs`、`fe-t01.mjs`、`fe-t07.mjs`、`fe-t11.mjs`、`primitive-seed.mjs`、`primitive-checks.mjs`、`cc-w-seed.mjs`、`cc-w-checks.mjs`、`composition-checks.mjs` 与 `rc/*` 逐字复制自 `evidence/cc-w/`，**只改端口**（8901 → 8905、8902 → 8906、CDP 19960 起 → 20000 起）。`cc-s-seed.mjs` / `cc-s-checks.mjs` 逐字复制自 `evidence/cc-s/`，同样只改端口（8899 → 8905、8900 → 8906、CDP 19925 起 → 20030 起）。

**一处例外**：`composition-checks.mjs` 新增 `HOME-8…HOME-16` 与 `HOME-1 / HOME-6 / HOME-11 / HOME-overflow` 的四次重跑（Simple / Modules × 900 / 1058），并新增 `HOME-4-modules` / `HOME-5-modules` / `HOME-7-modules`。**既有 41 条一字未动**，逐条理由在交付页 §9.2。

`run-regressions.py` 复制自 `evidence/cc-w-main-integration-20260909/`，只改端口，并补上那一版没有携带的四组（shell、fe-t07、cc-s、counterexamples 中的前两组）。cc-s 与 FE-T03 需要 `group()` 做不到的编排（前者要播种后 SIGKILL 停服再起才能得到 `unknown` 终态，后者要第二台冻结服务器），因此从 `run-regressions.py` 里移出，按下面的命令单独跑。

## 结果

| 检查 | 结果与位置 |
|---|---|
| 全量应用测试 | **293 / 293**，`tests.log`（基线 290 + 本单新增 3 条） |
| colors / materials / contrast / smoke | 两项 lint 通过、contrast 76 行通过、smoke 通过；`lint-colors.log`、`lint-materials.log`、`contrast.log`、`smoke.log`；`realProvider: not_run` |
| 布局 / 安全区（含 HOME-8…16） | **71 / 71**，`composition-checks.json`（根目录，首跑）与 `final-layout/composition-checks.json`（新目录复跑） |
| CC-S 第 0 项 | **4 / 4**，`cc-s/cc-s-checks.json`、`cc-s/cc-s.log`（含 SIGKILL 造 `unknown` 终态） |
| CC-W 文档 tab / tooltip / activity 行为 | **9 / 9**，`final-behavior/cc-w-checks.json` |
| FE-T07 | **8 / 8**，`fe-t07/fe-t07.json` |
| Chat / Work / Memory shell | **12 / 12**，`shell/shell-checks.json` |
| Models / 探测 | **18 / 18**、**8 / 8**，`settings/models-checks.json`、`settings/probe-checks.json` |
| FE-T01 | rows **4 / 4**、empty **3 / 3**，`settings/fe-t01-rows.json`、`empty/fe-t01-empty.json` |
| Primitive / Question / Approval（含 FE-T06） | **11 / 11**，`primitive/primitive-checks.json` |
| FE-T11 历史来源 | **6 / 6**，`history/fe-t11.json` |
| FE-T03 配置冻结反例 | **5 / 5**，`counterexamples/counterexamples.json` |
| RC 契约 / 反例 / 视口 | **20 / 20**、**9 / 9**、**36 / 36**，`runtime/rc/*.json` |

截图用于静态复核，**不自评视觉接受**：`home-simple-1440x900-light.png`、`home-simple-1440x1058-light.png`、`home-modules-1440x900-light.png`、`home-modules-1440x1058-light.png`、`home-modules-1440-light.png`、`home-modules-390-light.png`、`settings-appearance-home-layout-1440-light.png`，以及既有六张。headless 不证明真机帧时间、Reduced transparency 系统偏好或触屏体验。

## 复现

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
python3 evidence/cc-d0a/run-regressions.py

# CC-S 第 0 项：播种 → SIGKILL → 重启 → 断言（新空目录）
node app/server/index.mjs --data-dir <新空目录> --port 8905 &
APP_URL=http://127.0.0.1:8905 node evidence/cc-d0a/cc-s/cc-s-seed.mjs
kill -9 $(lsof -ti tcp:8905)          # 优雅停机会得到 cancelled 而不是 unknown
node app/server/index.mjs --data-dir <同一目录> --port 8905 &
APP_URL=http://127.0.0.1:8905 WK6_CDP_PORT=20040 node evidence/cc-d0a/cc-s/cc-s-checks.mjs

# FE-T03：两台服务器，两个新空目录
APP_URL=http://127.0.0.1:8905 WK13_STAGE=failed node evidence/cc-d0a/counterexamples/seed.mjs
APP_URL=http://127.0.0.1:8906 node evidence/cc-d0a/counterexamples/seed.mjs
APP_URL=http://127.0.0.1:8905 FROZEN_APP_URL=http://127.0.0.1:8906 WK6_CDP_PORT=20050 \
  node evidence/cc-d0a/counterexamples/counterexamples.mjs
```

`cc-s-checks.mjs` 与 `counterexamples.mjs` 都不幂等（各自会起新的未决 run / 改有效配置），重跑前换新数据目录并重新播种。
