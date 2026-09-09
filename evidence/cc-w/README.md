# CC-W 证据 · 工作面：1440 主次切换 + tab strip，≥1680 三栏（WK-113 / WK-116 / WK-117 (b) / WK-118 ④⑤ / WK-119 补充 / WK-121 ②）

2026-09-09 · Claude Opus（`opus-wo-medium`），**作者验证**（Astra 独验另计，本页不代它写结论）。
基线 `main` `414b196`，分支 `claude/cc-w-surface-tabs`，树 `/private/tmp/se-agent-ccw`。
全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。
交付页 [delivery-cc-w](../../engineering/mvp/execution/work-surface-kit/delivery-cc-w.md)。

## 端口、数据目录与顺序

一个应用端口（8901）按用途轮换，每换一次用途就换一个**全新的空数据目录**并重新播种；
FE-T03 需要第二台冻结服务器，用 8902；RC 的 MCP 线路 fixture 也用 8902（与前者不同时在跑）。
`probe-checks` 自带的目录 fixture 绑在临时端口（`listen(0)`）上，不占用任何登记端口。

| 用途 | 端口 | 数据目录 | fixture | CDP |
|---|---|---|---|---|
| Home / Work / Settings 几何与安全区（含 WORK-5…9、SHELL-4 / 5）、Models、FE-T01（rows） | 8901 | `…-data/comp` | `seed.mjs` | 19960–19962 |
| FE-T01（无数据）、探测 | 8901 | `…-data/t01e` | 无 / 探测自带 | 19963–19964 |
| Chat / Work / Memory shell（含搬家后的 scope 位） | 8901 | `…-data/sh` | `work-seed.mjs` | 19965 |
| FE-T07（含 CC-W 两条新增） | 8901 | `…-data/t07` | `work-seed.mjs` | 19966 |
| FE-T11 | 8901 | `…-data/t11` | `work-seed.mjs` | — |
| Primitive（FE-04 复跑） | 8901 | `…-data/prim` | `primitive-seed.mjs` | 19967 |
| CC-W 行为断言（文档 tab / M-9 / M-10 / activity） | 8901 | `…-data/ccw` | `cc-w-seed.mjs` | 19968 |
| FE-T03 a–d / e（冻结） | 8901 / 8902 | `…-data/t03`、`…-data/frozen` | `seed.mjs`（`failed` / 默认） | 19969 |
| RC 三支 | 8901 | `…-data/rc` | `rc/seed-fixture.mjs`；MCP fixture **8902** | 19970 |

8850–8861、8810、8817、8818、8887–8900、8921–8953 未使用。本单启动的全部 server、
MCP fixture 与 headless Chrome 已停止；8901 / 8902 已释放。

## 脚本来源

`browser.mjs`、`seed.mjs`、`work-seed.mjs`、`shell-checks.mjs`、`probe-checks.mjs`、
`models-checks.mjs`、`counterexamples.mjs`、`fe-t01.mjs`、`fe-t07.mjs`、`fe-t11.mjs`、
`primitive-seed.mjs`、`primitive-checks.mjs`、`composition-checks.mjs` 与 `rc/*` 逐字复制自
`evidence/cc-s/`，**只改端口**（8899 → 8901、8900 → 8902、CDP 19925 起 → 19960 起）。

三处例外，都是**契约改变而不得不改 / 不得不加断言**，逐条理由在
[delivery-cc-w §9.3](../../engineering/mvp/execution/work-surface-kit/delivery-cc-w.md)：

- `composition-checks.mjs` —— 新增 `WORK-5…9`、`SHELL-4` / `SHELL-5`（桌面宿主与普通浏览器各一次）。
  既有 32 条一字未动。
- `shell-checks.mjs` —— `CW-1` / `CW-2` / `CW-4` / `CW-8` 随 M-2 改写：scope 位从会话 meta 行搬到
  工作面标题带，所以断言在新位置逐条重量（只在 Work 上、只有一个值、零控件、无背景无边框，
  另加"落在那条带里"），并加断言"会话 meta 行上不得再有 scope 位"。条数未减，阈值未放宽。
- `fe-t07.mjs` —— 既有四条一字未动，新增 CC-W 两条（B 态视图切换的位置与草稿；1679 ↔ 1680 跨越）。

本单新增两个脚本：`cc-w-seed.mjs` / `cc-w-checks.mjs`。

**没有合成手段**：文档 tab 由一次真的 `ws_write`（`draft` 模式，无授权卡）记录出来，再由 Chat Flow
上那一行打开；M-9 的在途窗口用 wk10b-1 起就在用的「扣住一个请求」手法观察（扣住的是传输，不是
答案）；M-10 的两次悬停由 CDP 的真实鼠标事件产生，时间由页面自己的 popover 状态读出。
没有向 store 直写，没有 stub 任何 renderer。

## 复跑

```sh
npm --prefix app ci && npm --prefix app test
node tools/lint-colors.mjs && node tools/lint-materials.mjs && node tools/contrast-report.mjs
npm --prefix app run smoke

# 每一段都换一个新的空目录
npm --prefix app start -- --data-dir <空目录> --port 8901
APP_URL=http://127.0.0.1:8901 node evidence/cc-w/seed.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19960 node evidence/cc-w/composition-checks.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19961 node evidence/cc-w/models-checks.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19962 T01_CASE=rows node evidence/cc-w/fe-t01.mjs
# 换空目录，不播种
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19963 T01_CASE=empty node evidence/cc-w/fe-t01.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19964 node evidence/cc-w/probe-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8901 node evidence/cc-w/work-seed.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19965 node evidence/cc-w/shell-checks.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8901 node evidence/cc-w/work-seed.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19966 node evidence/cc-w/fe-t07.mjs
# 换空目录
WK10B2_BASE=http://127.0.0.1:8901 node evidence/cc-w/work-seed.mjs
APP_URL=http://127.0.0.1:8901 node evidence/cc-w/fe-t11.mjs
# 换空目录
APP_URL=http://127.0.0.1:8901 node evidence/cc-w/primitive-seed.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19967 node evidence/cc-w/primitive-checks.mjs
# 换空目录
APP_URL=http://127.0.0.1:8901 node evidence/cc-w/cc-w-seed.mjs
APP_URL=http://127.0.0.1:8901 WK6_CDP_PORT=19968 node evidence/cc-w/cc-w-checks.mjs
# 换两个空目录（8901 failed、8902 默认）
APP_URL=http://127.0.0.1:8901 WK13_STAGE=failed node evidence/cc-w/seed.mjs
APP_URL=http://127.0.0.1:8902 node evidence/cc-w/seed.mjs
APP_URL=http://127.0.0.1:8901 FROZEN_APP_URL=http://127.0.0.1:8902 WK6_CDP_PORT=19969 \
  node evidence/cc-w/counterexamples.mjs
# 换空目录
MCP_PORT=8902 node evidence/cc-w/rc/mcp-fixture.mjs
RC_PORT=8901 MCP_PORT=8902 node evidence/cc-w/rc/seed-fixture.mjs
RC_APP=http://127.0.0.1:8901/ RC_CDP_PORT=19970 RC_CHROME_DIR=<新 profile> node evidence/cc-w/rc/verify.mjs
```

`primitive-checks.mjs`、`shell-checks.mjs`、`fe-t11.mjs` **不是幂等的**（WK-109 ⑦）。
`cc-w-checks.mjs` 同样不幂等：它自己会写文件、起授权未决 run，并在最后再起一个 run。
重跑前换新数据目录并重新播种。

## 结果

| 套件 | 结果 | 文件 |
|---|---|---|
| `npm --prefix app test` | **255 / 255**（基线 244 + 本单 11） | `tests.log` |
| lint-colors / lint-materials / contrast / smoke | ok / ok / 76 项全通过 / 通过（`realProvider: not_run`） | `lint-colors.log`、`lint-materials.log`、`contrast.log`、`smoke.log` |
| Home / Work / Settings 几何与安全区 | **41 / 41**（基线 32 + 本单 9） | `composition-checks.json`、`composition-checks.log` |
| CC-W 行为（本单新增） | **9 / 9** | `cc-w-checks.json`、`cc-w-checks.log` |
| Models & Tools 五轮收敛 | 18 / 18 | `models-checks.json` |
| Chat / Work / Memory shell | 12 / 12（含改写后的 CW-1 / 2 / 4 / 8） | `shell-checks.json`、`shell-checks.log` |
| 探测（BE-17 / 18） | 8 / 8 | `probe-checks.json` |
| Primitive（FE-04 复跑） | 11 / 11 | `primitive-checks.json` |
| FE-T01 | 3 / 3（无数据）· 4 / 4（rows） | `fe-t01-empty.json`、`fe-t01-rows.json` |
| FE-T07 | **8 / 8**（基线 6 + 本单 2） | `fe-t07.json`、`fe-t07.log` |
| FE-T11 | 6 / 6 | `fe-t11.json` |
| FE-T03 | 5 / 5 | `counterexamples.json` |
| RC 契约 / 反例 / 视口 | 20 / 20 · 9 / 9 · 36 / 36 | `rc/*.json`、`rc-verify.log` |

本单新拍的截图：`work-expanded-1440-light.png`（B 态）、`work-three-pane-1680-light.png`（C 态）、
`work-three-pane-1680x720-light.png`（短高度）、`work-expanded-1440-zoom200-light.png`（200%）、
`work-expanded-desktop-shell-1440-light.png` 与 `work-three-pane-desktop-shell-1680-light.png`
（SHELL-4 / 5），其余是复制来的脚本原有的那些。**视觉四轴留用户，本页不自评。**
