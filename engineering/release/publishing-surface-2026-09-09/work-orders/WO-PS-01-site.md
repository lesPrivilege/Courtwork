# WO-PS-01 · Courtwork 发布面站点（Opus，`opus-wo-medium`）

状态：已派单（2026-09-09）。EX-PS2 / PS3 / PS4 已消费（PS-16…18）；EX-PS1 不阻塞（PS-19）。体例：[handoff-convention](../../../mvp/execution/work-surface-kit/handoff-convention.md) §2 工单。

## 问题

在 `site/` 下建立可由 GitHub Pages 构建的静态发布面，消费 [public-copy-v2](../public-copy-v2.md) 的全部文案与声称表，实现 [intake](../intake.md) PS-1…PS-9、PS-13、PS-14 规定的六个 proof surface 与材质治理；同时重写根 README（中文为主，一份）。

## 输入

- 裁定：PS-1…PS-15；WK-77（H1）；WK-69 / WK-101 / WK-125（层级、材质、形状）。
- 文案：public-copy-v2 全部；词表 copy-convention §3。
- explore 回执：[EX-PS2](../explore/ex-ps2-proof-patterns.md) 表三（素材映射：全部需捕获）与表二（六站解剖）；[EX-PS3](../explore/ex-ps3-specimen-feasibility.md) 表 1–6；[EX-PS4](../explore/ex-ps4-eval-surface.md) 表 1、6。EX-PS1 不在输入内（PS-19）。
- 证据契约：`engineering/release/2026-09-08/pages-preparation/evidence-contract.md`。

## 基线 SHA

`main` `172130e`（worktree `/private/tmp/se-agent-ps01`，分支 `claude/ps01-site`）。本单文档在 `/private/tmp/se-fable-ps/engineering/release/publishing-surface-2026-09-09/`（分支 `claude/fable-publishing-surface`，未合流），按路径读取。

## 写权路径

`site/**`、`README.md`、`.github/workflows/pages.yml`、`site/scripts/**`（媒体与标本捕获脚本）。不得改动 `app/**`、`brand/src/**`、`PAPER.md`、`engineering/**`（交付文件除外）。

## 不得

- 站点独有的颜色、阴影、圆角 token；
- 任何外部请求（字体、脚本、统计、iframe）；
- 打字动画、假光标、自动播放、scroll reveal；
- 在页面上写内部编号（WK / PS / BE / G）；
- 把 fixture 或 loopback 的运行写成真实模型；
- 出现 pricing / plan / enterprise / beta / coming soon。

## 页面结构（按 [public-copy-v2](../public-copy-v2.md) §0–§8 逐段取词，不改一字；改动回到该文件）

首屏（静态 Home 图 M1）→ 01 三个 tab（Event log / Work state / Compiled context，同一 Run）→ 02 标本 iframe（无 JS 退六步条）→ 03 editorial 与一图（静态 SVG；退焦只此段，`filter` 实现，reduced-motion / reduced-transparency 全锐化）→ 04 四词与 M6 → 05 证据清单、Eval 八问、声称表 → 06 命令与入口 → 深色页脚。导航三项：GitHub · Paper · Docs。语言：一页，中文为主，`lang="zh-CN"`。

## 材质（PS-3 / PS-19）

构建时从产品 `app/web/styles.css` 抽取 `:root` 及深色块生成 `site/dist/tokens.css`（抽取范围与源 sha256 写入 manifest）；页面 `site.css` 只引用这些 token，新增变量仅限布局尺寸。浮层只用 `--shadow-float`；无 backdrop-filter；圆角只用产品既有档位。字体沿产品字体栈；无 webfont。

## 媒体（PS-9 / PS-17）

M1–M7 按 public-copy-v2 §10 从 8908 实例捕获，脚本入 `site/scripts/capture-media.mjs`，manifest 字段齐全；任何既有 evidence 截图不上页；截图内可见文字须为现行词表。

## 交付物

1. `site/` 源码与 `site/dist/` 构建产物；构建命令与子路径检查脚本；
2. 根 README（中文为主，一份，与页面共用声称表）；
3. Pages workflow；
4. 媒体 manifest（证据契约字段齐全）与捕获脚本；标本 JSON、其 sha256 与捕获脚本；
5. 发布 SHA 上重跑 `node benchmarks/continuity/run.mjs --output <绝对路径>`：输出 JSON、`.attempts.json`、`.journal.jsonl` 三文件入 `evidence/publishing-surface-<date>/`（PS-16 c）；页面 Eval 块的 E / S 通过数只从该输出读取，构建时校验文件存在且 `git.head` 等于发布 SHA；
6. `delivery-ps-01.md`：SHA、改动文件、验证命令与原文、未验证清单、"哪一像素改变了哪一判断"、五轮收敛表（WK-100）。

## 标本（PS-18）

- 捕获：`site/scripts/capture-specimen.mjs`，沿 `app/tests/helpers.mjs` 的 `boot()` 与 `app/scripts/work-core-fixture.mjs`；序列与落盘键按 [EX-PS3 表 3](../explore/ex-ps3-specimen-feasibility.md)；Run A 用 `permissionMode:"ask"` + `/fixture script` 的 `ws_write` 与 `ask_user`，Run B 绑定 inbound-nda 后 `se_submit_candidate`，再 `decide`、`revise_candidate`、`unload`。输出 `site/specimen/<sha7>.json`，manifest 记 sha256、`dataClass`、`source_sha`、捕获日期与命令。
- 复制：构建时从 `app/web`（`ui-controls.mjs` 及 `vendor/`、`surface-modules.mjs`、`thread-projection.mjs`、`presentation-adapters.mjs`、`user-message.mjs`、`workspace-view.mjs`、`inspector.mjs`、`runtime-view.mjs`、`styles.css`）与 `app/extensions/inbound-nda/renderer.mjs` 复制到 `site/specimen/vendor-product/`，改写 EX-PS3 表 4 的 7 处根相对路径为相对路径；每文件源 sha256 与改写位置写入 manifest；不手改副本，不改产品源。
- 壳：`site/specimen/shell.mjs` 只做"按步骤从 JSON 取快照喂给纯渲染函数"；`dispatch` 桩返回 replay 拒绝态并在界面显示"replay · not sent"，`query` 桩返回打包源文本，`request` 桩查表。
- 承载：`site/specimen/index.html` 以 iframe 挂到 02 段；无 JS 时 `<noscript>` 六步条与静态图；步骤可键盘切换；无任何网络请求。

## 必须验证

fixture 列：标本 JSON 由捕获脚本两次生成后除时间戳外一致；iframe 内 `performance.getEntriesByType('resource')` 只含同源文件；构建可复现（两次构建产物 hash 一致）；`/Courtwork/` 子路径下无断链、无绝对根路径；无 JS 时首屏与 03 / 05 / 06 段完整可读；reduced-motion 与 reduced-transparency 下无退焦、无运动；键盘可达所有标本步骤；1440 / 390、浅 / 深、200% 缩放截图；对比度报告；页面无任何网络请求（除同源）。真实列：无（站点不接真实 provider）。

## 验收者

Astra 核对声称表每行的证据路径在发布 SHA 下成立（不成立者降档不删行）、媒体 manifest 与截图状态一致；用户按四轴（成熟、安静、身份、耐久）裁定视觉。

## 端口与数据目录

站点预览 8907；标本捕获与媒体捕获用的产品实例 8908（MCP fixture 如需 8909）；数据目录 `/private/tmp/se-agent-ps01-data`（每次捕获前清空）。benchmark 重跑输出到 `/private/tmp/se-agent-ps01-bench/` 后再拷入 `evidence/`。
