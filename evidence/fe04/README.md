# FE-04 证据 · Primitive reconciliation（WK-93）

2026-09-09 · Claude Opus，**作者验证**（Astra 独验另计，本页不代它写结论）。
基线 `main` `af95bcb`，分支 `claude/fe04-primitives`。
全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。

## 端口、数据目录与顺序

一个应用端口（8897）按用途轮换，每换一次用途就换一个**全新的空数据目录**并重新播种；
FE-T03 需要第二台冻结服务器，用 8898；RC 的 MCP 线路 fixture 也用 8898（与前者不同时在跑）。
`probe-checks` 自带的目录 fixture 绑在临时端口（`listen(0)`）上，不占用任何登记端口。

| 用途 | 端口 | 数据目录 | fixture | CDP |
|---|---|---|---|---|
| Primitive 断言（在途 / FE-T06 / Tool row / Question） | 8897 | `…-data/primitive` | `primitive-seed.mjs` | 19911 |
| FE-T07（迟到响应与折叠） | 8897 | `…-data/t07` | `work-seed.mjs` | 19915 |
| Models 五轮收敛、Home / Work 几何、FE-T01（rows） | 8897 | `…-data/main` | `seed.mjs`，`stage=rows` | 19916–19918 |
| FE-T01（无数据）、第 0 项探测 | 8897 | `…-data/t01` | 无 / 探测自带 | 19919–19920 |
| Chat / Work / Memory shell | 8897 | `…-data/shell` | `work-seed.mjs` | 19921 |
| FE-T11 | 8897 | `…-data/history` | `work-seed.mjs` | — |
| FE-T03 a–d / e（冻结） | 8897 / 8898 | `…-data/t03`、`…-data/frozen` | `seed.mjs`（`failed` / `rows`） | 19922 |
| RC 三支 | 8897 | `…-data/rc` | `rc/seed-fixture.mjs`；MCP fixture **8898** | 19923 |

8850–8861、8810、8817、8818、8887–8896、8921–8937 未使用。本单启动的全部 server、
MCP fixture 与 headless Chrome 已停止；8897 / 8898 已释放。

## 脚本来源

`browser.mjs`、`seed.mjs`、`work-seed.mjs`、`composition-checks.mjs`、`shell-checks.mjs`、
`probe-checks.mjs`、`models-checks.mjs`、`counterexamples.mjs`、`fe-t01.mjs`、`fe-t11.mjs`
与 `rc/*` 逐字复制自 `evidence/fe03/`，**只改端口**（8895 → 8897、CDP 19895 → 19905 起）；断言一字未动。

本单新增两个脚本：

- `primitive-seed.mjs` / `primitive-checks.mjs` —— 本单的行为断言。
- `fe-t07.mjs` —— FE-T07 复跑；断言与 `evidence/wk10b-1/checks.mjs` §4–5 同一套，
  只换 fixture 会话与 harness，并按事实修正了"三次折叠 / 展开"那一条（见下）。

**合成手段只有一种，且只用于时间**：在页内包一层 `window.fetch` 把某一类请求扣住 2.2–2.6 s
（wk10b-1 FE-T07 已用同一手法）。扣住的是**传输**，不是答案——请求照样发出、照样由服务端处理，
回执照样是服务端给的。在 loopback 上在途窗口只有几毫秒，不扣住就无法观察它。
`primitive-checks` 的最后一条 Question 断言另外用了一次合成 409，只为看那条 `role="alert"`
存不存在；该次提交确实没有到达服务端，页面上因此仍是未决状态，断言里一并核对了这一点。

## 复跑

```sh
npm --prefix app ci && npm --prefix app test
node tools/lint-colors.mjs && node tools/lint-materials.mjs && node tools/contrast-report.mjs
npm --prefix app run smoke

# 每一段都换一个新的空目录
npm --prefix app start -- --data-dir <空目录> --port 8897
APP_URL=http://127.0.0.1:8897 node evidence/fe04/primitive-seed.mjs
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19911 node evidence/fe04/primitive-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8897 node evidence/fe04/work-seed.mjs
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19915 node evidence/fe04/fe-t07.mjs
# 换空目录
APP_URL=http://127.0.0.1:8897 node evidence/fe04/seed.mjs
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19916 node evidence/fe04/models-checks.mjs
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19917 node evidence/fe04/composition-checks.mjs
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19918 T01_CASE=rows node evidence/fe04/fe-t01.mjs
# 换空目录，不播种
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19919 T01_CASE=empty node evidence/fe04/fe-t01.mjs
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19920 node evidence/fe04/probe-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8897 node evidence/fe04/work-seed.mjs
APP_URL=http://127.0.0.1:8897 WK6_CDP_PORT=19921 node evidence/fe04/shell-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8897 node evidence/fe04/work-seed.mjs
APP_URL=http://127.0.0.1:8897 node evidence/fe04/fe-t11.mjs
# 换两个空目录（8897 failed、8898 rows）
APP_URL=http://127.0.0.1:8897 WK13_STAGE=failed node evidence/fe04/seed.mjs
APP_URL=http://127.0.0.1:8898 node evidence/fe04/seed.mjs
APP_URL=http://127.0.0.1:8897 FROZEN_APP_URL=http://127.0.0.1:8898 WK6_CDP_PORT=19922 \
  node evidence/fe04/counterexamples.mjs
# 换空目录
MCP_PORT=8898 node evidence/fe04/rc/mcp-fixture.mjs
RC_PORT=8897 MCP_PORT=8898 node evidence/fe04/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8897/ RC_CDP_PORT=19923 RC_CHROME_DIR=<新 profile> node evidence/fe04/rc/verify.mjs
```

`primitive-checks.mjs`、`shell-checks.mjs`、`fe-t11.mjs` **不是幂等的**（前者跑完一次授权与一次取消，
后二者续绑与换源）。重跑前必须换新数据目录并重新播种。

## 结果

| 套件 | 结果 | 文件 |
|---|---|---|
| `npm --prefix app test` | **237 / 237**（基线 228 + 本单 9） | `tests.log` |
| lint-colors / lint-materials / contrast / smoke | ok / ok / 全通过 / 通过（`realProvider: not_run`） | `lint-colors.log`、`lint-materials.log`、`contrast.log`、`smoke.log` |
| Primitive 断言（本单新增） | **11 / 11** | `primitive-checks.json` |
| FE-T07 | **6 / 6** | `fe-t07.json` |
| Models & Tools 五轮收敛 | 18 / 18 | `models-checks.json` |
| Home / Work 几何 | 16 / 16 | `composition-checks.json` |
| Chat / Work / Memory shell | 12 / 12 | `shell-checks.json` |
| 探测（BE-17 / 18） | 8 / 8 | `probe-checks.json` |
| FE-T01 | 3 / 3（无数据）· 4 / 4（无绑定 + 读取失败） | `fe-t01-empty.json`、`fe-t01-rows.json` |
| FE-T11 | 6 / 6 | `fe-t11.json` |
| FE-T03 | 5 / 5 | `counterexamples.json` |
| RC 契约 / 反例 / 视口 | 20 / 20 · 9 / 9 · 36 / 36 | `rc/*.json`、`rc-verify.log` |

截图由复制来的脚本自己生成（`*-1440-light.png`、`*-390-light.png` 等），与 FE-03 同名同法；
本单**没有为在途状态另拍截图**——在途窗口需要与断言同一套扣住手法才能拍到，而那一段的判断
已经由 `primitive-checks.json` 的逐字读数承担。视觉四轴留用户，本页不自评。

## 与 wk10b-1 的一处读数差

`fe-t07.mjs` 的"三次折叠 / 展开"一条：wk10b-1 当年记 `/surface` 为 **0**，本单实测 **2**。
原因是起点不同——`setSurfaceExpanded`（`app.mjs:3307-3321`）在**收起 → 展开**这一步会调
`loadSurfaceKind("preview")` 重读一次工作面；三次点击里有两次是这一步，所以是 2。
FN-23 禁的是折叠 / 展开**重发命令、取消 Run、丢草稿、换读取版本**，一次读取不在其列，
本单同时数了命令数：**0**。断言按事实写成"不重发任何命令、workspace 与 runtime 不重读、
`/surface` ≤ 2"，并把"展开是否应当复用上一次读取"列入待裁定，不在本单改。
