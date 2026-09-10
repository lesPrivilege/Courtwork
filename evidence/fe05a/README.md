# FE-05a 证据 · 缺陷修复、Shape 语法与 V1 字阶密度（M-15…M-18 / WK-128 / M-11）

> Integration freeze: Astra captured the author’s uncommitted delivery documents and synthetic regression evidence on 2026-09-10 without changing the author tree. Product HEAD remains `463d57c`. The capture is author evidence, not an independent acceptance; subsequent review records supersede its current-status claims.

2026-09-10 · Claude Opus，**作者验证**（独立验收另计，本页不代它写结论）。
基线 `main` `2e9da09`（派单快照同值），分支 `claude/fe05a-type-density`，树 `/private/tmp/se-fe05a`。
全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。
交付页 [delivery-fe05a](../../engineering/mvp/execution/work-surface-kit/delivery-fe05a.md)。

## 端口与数据目录

| 用途 | 端口 | 数据目录 | CDP |
|---|---|---|---|
| BASELINE / SHAPE / TYPE / HOME-16 与三份 measurements | 8909 | `/private/tmp/se-agent-fe05a-data/base` | 20070 |
| 回归全量（`regression/run-regressions.py`，每组新空目录） | 8909 | `/private/tmp/se-agent-fe05a-data/cw-fe05a-*` | 20070 / 20071 |
| RC 的 MCP 线路 fixture | 8910 | — | — |

起服务前逐个 `lsof` 过；8850–8861、8810、8817、8818、8887–8907、8921–8953 未使用。本单启动的
server、MCP fixture 与 headless Chrome 已在收尾时停止。

## 脚本来源

`regression/` 下的 `*.mjs`、`rc/*` 与 `run-regressions.py` **逐字复制自 `evidence/cc-d0a/`**，
只改端口（8905→8909、8906→8910、CDP 20030/20031→20070/20071）、数据目录，以及因为多了一层
目录而改的两处路径（`ROOT` 与复制脚本时的相对路径替换）。**既有断言一字未动。**

本单自己的四份脚本在本目录：`browser.mjs`（同样只改端口）、`baseline-checks.mjs`、
`shape-checks.mjs`、`type-checks.mjs`、`home-text-scale.mjs`、`measure.mjs`。

## 三份 measurements 是同一把尺子量的三个状态

| 文件 | 状态 | 用途 |
|---|---|---|
| `measurements/baseline-repaired.json` | Commit A 之后：三处缺陷已修，字阶未动 | 修复后的基线 |
| `measurements/shape-baseline.json` | Commit B 之后：Shape 语法落地，字阶仍未动 | **V1 对照的 A 侧** |
| `measurements/v1.json` | Commit C 之后：V1 字阶与控件密度 | **V1 对照的 B 侧** |

三份都是 Settings › General 与 Work 头部 + composer（idle / 在跑两态）× 1440 / 390 × 浅 / 深，
1:1、不 zoom、同一份种子数据。A 侧与 B 侧的截图分别带 `-shape-baseline` 与 `-v1` 后缀，
**不是同一次运行的两张不同底本**：`measure.mjs` 用 `git checkout <commit> -- app/web` 在同一棵树上
逐个状态回放，harness、端口、数据与运行态逐位相同。

## 结果

| 检查 | 结果与位置 |
|---|---|
| BASELINE-1…3（M-15 / M-16 / M-17） | **7 / 7**，`baseline-checks.json`；未修复树上的反例 **2 / 7**，`baseline-checks-counterexample.json` |
| SHAPE-1…7 | **8 / 8**，`shape-checks.json` |
| TYPE-1…6 | **7 / 7**，`type-checks.json` |
| HOME-16 × 三档 Text size（M-18） | **3 / 3**，`home-text-scale.json`；V1 之前的同一测量在 `home-text-scale-shape-baseline.json` |
| 全量应用测试 / 三项 lint / contrast / smoke | 见交付页 §验证 |
| 浏览器回归全量（composition / cc-w / shell / Models / 探测 / primitive / FE-T01 / T07 / T11 / RC 三支） | `regression/`，逐组 JSON 与 `regression-exits.json` |

截图用于静态复核，**不自评视觉接受**；headless 不证明真机帧时间、Reduced transparency 系统偏好
或触屏体验。视觉四轴（层级 / 分离 / 可按性 / 稳健）留给用户。
