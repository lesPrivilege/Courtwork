# CC-S 证据 · Settings 替换全局导航（WK-116 / WK-115 ① ②）

2026-09-09 · Claude Opus，**作者验证**（Astra 独验另计，本页不代它写结论）。
基线 `main` `683b6d1`，分支 `claude/cc-s-settings-nav`，树 `<isolated-checkout>`。
全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。
交付页 [delivery-cc-s](../../engineering/mvp/execution/work-surface-kit/delivery-cc-s.md)。

## 端口、数据目录与顺序

一个应用端口（8899）按用途轮换，每换一次用途就换一个**全新的空数据目录**并重新播种；
FE-T03 需要第二台冻结服务器，用 8900；RC 的 MCP 线路 fixture 也用 8900（与前者不同时在跑）。
`probe-checks` 自带的目录 fixture 绑在临时端口（`listen(0)`）上，不占用任何登记端口。

| 用途 | 端口 | 数据目录 | fixture | CDP |
|---|---|---|---|---|
| CC-S 第 0 项（Unknown / Home-End / 两条列表） | 8899 | `…-data/ccs2` | `cc-s-seed.mjs` + SIGKILL 重启 | 19953 |
| Settings 几何 / 安全区、Home / Work 几何、Models、FE-T01（rows） | 8899 | `…-data/main3`、`…-data/m4` | `seed.mjs` | 19950–19951 |
| FE-T01（无数据）、探测 | 8899 | `…-data/t01` | 无 / 探测自带 | 19938–19939 |
| Chat / Work / Memory shell | 8899 | `…-data/sh2` | `work-seed.mjs` | 19952 |
| FE-T07 | 8899 | `…-data/t07` | `work-seed.mjs` | 19946 |
| FE-T11 | 8899 | `…-data/hist` | `work-seed.mjs` | — |
| Primitive（FE-04 复跑） | 8899 | `…-data/prim` | `primitive-seed.mjs` | 19947 |
| FE-T03 a–d / e（冻结） | 8899 / 8900 | `…-data/t03`、`…-data/frozen` | `seed.mjs`（`failed` / 默认） | 19948 |
| RC 三支 | 8899 | `…-data/rc2` | `rc/seed-fixture.mjs`；MCP fixture **8900** | 19954 |

8850–8861、8810、8817、8818、8887–8898、8921–8937 未使用。本单启动的全部 server、
MCP fixture 与 headless Chrome 已停止；8899 / 8900 已释放。

## 脚本来源

`browser.mjs`、`seed.mjs`、`work-seed.mjs`、`composition-checks.mjs`、`shell-checks.mjs`、
`probe-checks.mjs`、`models-checks.mjs`、`counterexamples.mjs`、`fe-t01.mjs`、`fe-t07.mjs`、
`fe-t11.mjs`、`primitive-seed.mjs`、`primitive-checks.mjs` 与 `rc/*` 逐字复制自
`evidence/fe04/`，**只改端口**（8897 → 8899、8898 → 8900、CDP 19905 起 → 19925 起）。

两处例外，都是**契约改变而不得不改断言**，逐条理由在 [delivery-cc-s §9.3](../../engineering/mvp/execution/work-surface-kit/delivery-cc-s.md)：

- `composition-checks.mjs` —— 新增 `SETTINGS-1…7`、`SETTINGS-back-label`、`SETTINGS-title`、
  `SHELL-2` / `SHELL-3`（桌面宿主与普通浏览器各一次）。既有 16 条一字未动。
- `models-checks.mjs` —— `NAV-1` 改在 Home 上量 `.sidebar` 宽（WK-116 之后 Settings 页上侧栏
  不渲染，在那里量只会量到 0）。阈值仍是 256，未放宽。

本单新增两个脚本：`cc-s-seed.mjs` / `cc-s-checks.mjs`。

**没有合成手段**：本单不扣任何请求、不注入任何状态。`unknown` 终态由宿主自己的重启恢复
（`app/server/service.mjs:175`）产生 —— 播种时留一个停在授权未决的 run，然后 **SIGKILL** 停服再起，
在途 run 被记成 `unknown`、授权被记成 `expired_restart`。优雅停机走另一条路（`cancelled`），
那是同一对词的另一半，也实测过。

## 复跑

```sh
npm --prefix app ci && npm --prefix app test
node tools/lint-colors.mjs && node tools/lint-materials.mjs && node tools/contrast-report.mjs
npm --prefix app run smoke

# 每一段都换一个新的空目录
# ① CC-S 第 0 项：播种 → SIGKILL → 重启 → 断言
npm --prefix app start -- --data-dir <空目录> --port 8899
APP_URL=http://127.0.0.1:8899 node evidence/cc-s/cc-s-seed.mjs
kill -9 <server pid>            # 优雅停机会得到 cancelled 而不是 unknown
npm --prefix app start -- --data-dir <同一目录> --port 8899
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19953 node evidence/cc-s/cc-s-checks.mjs

# ② Settings 几何与安全区、Home / Work 几何、Models、FE-T01(rows)
# 换空目录
APP_URL=http://127.0.0.1:8899 node evidence/cc-s/seed.mjs
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19950 node evidence/cc-s/composition-checks.mjs
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19951 node evidence/cc-s/models-checks.mjs
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19944 T01_CASE=rows node evidence/cc-s/fe-t01.mjs
# 换空目录，不播种
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19938 T01_CASE=empty node evidence/cc-s/fe-t01.mjs
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19939 node evidence/cc-s/probe-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8899 node evidence/cc-s/work-seed.mjs
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19952 node evidence/cc-s/shell-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8899 node evidence/cc-s/work-seed.mjs
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19946 node evidence/cc-s/fe-t07.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8899 node evidence/cc-s/work-seed.mjs
APP_URL=http://127.0.0.1:8899 node evidence/cc-s/fe-t11.mjs
# 换空目录
APP_URL=http://127.0.0.1:8899 node evidence/cc-s/primitive-seed.mjs
APP_URL=http://127.0.0.1:8899 WK6_CDP_PORT=19947 node evidence/cc-s/primitive-checks.mjs
# 换两个空目录（8899 failed、8900 默认）
APP_URL=http://127.0.0.1:8899 WK13_STAGE=failed node evidence/cc-s/seed.mjs
APP_URL=http://127.0.0.1:8900 node evidence/cc-s/seed.mjs
APP_URL=http://127.0.0.1:8899 FROZEN_APP_URL=http://127.0.0.1:8900 WK6_CDP_PORT=19948 \
  node evidence/cc-s/counterexamples.mjs
# 换空目录
MCP_PORT=8900 node evidence/cc-s/rc/mcp-fixture.mjs
RC_PORT=8899 MCP_PORT=8900 node evidence/cc-s/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8899/ RC_CDP_PORT=19954 RC_CHROME_DIR=<新 profile> node evidence/cc-s/rc/verify.mjs
```

`primitive-checks.mjs`、`shell-checks.mjs`、`fe-t11.mjs` **不是幂等的**（WK-109 ⑦）。
`cc-s-checks.mjs` 同样不幂等：它自己会起一个新的授权未决 run。重跑前换新数据目录并重新播种。

## 结果

| 套件 | 结果 | 文件 |
|---|---|---|
| `npm --prefix app test` | **244 / 244**（基线 237 + 本单 7） | `tests.log` |
| lint-colors / lint-materials / contrast / smoke | ok / ok / 76 项全通过 / 通过（`realProvider: not_run`） | `lint-colors.log`、`lint-materials.log`、`contrast.log`、`smoke.log` |
| Home / Work / **Settings** 几何与安全区 | **32 / 32**（基线 16 + 本单 16） | `composition-checks.json` |
| CC-S 第 0 项（本单新增） | **4 / 4** | `cc-s-checks.json`、`cc-s-checks.log` |
| Models & Tools 五轮收敛 | 18 / 18 | `models-checks.json` |
| Chat / Work / Memory shell | 12 / 12 | `shell-checks.json` |
| 探测（BE-17 / 18） | 8 / 8 | `probe-checks.json` |
| Primitive（FE-04 复跑） | 11 / 11 | `primitive-checks.json` |
| FE-T01 | 3 / 3（无数据）· 4 / 4（rows） | `fe-t01-empty.json`、`fe-t01-rows.json` |
| FE-T07 | 6 / 6 | `fe-t07.json` |
| FE-T11 | 6 / 6 | `fe-t11.json` |
| FE-T03 | 5 / 5 | `counterexamples.json` |
| RC 契约 / 反例 / 视口 | 20 / 20 · 9 / 9 · 36 / 36 | `rc/*.json`、`rc-verify.log` |

截图由脚本自己生成（`settings-general-1440-light.png`、`settings-general-1024-light.png`、
`settings-general-390-light.png`、`settings-general-1440-zoom200-light.png`、
`settings-desktop-shell-1440-light.png`、`home-collapsed-desktop-shell-1440-light.png` 及复制来的脚本
原有的那些）。**视觉四轴留用户，本页不自评。**
