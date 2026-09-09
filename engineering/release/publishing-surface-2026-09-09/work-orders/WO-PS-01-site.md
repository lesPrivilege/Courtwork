# WO-PS-01 · Courtwork 发布面站点（Opus，`opus-wo-medium`）· 骨架

状态：骨架，待 EX-PS1…PS4 回执后由 Fable 填值再派单。体例：[handoff-convention](../../../mvp/execution/work-surface-kit/handoff-convention.md) §2 工单。

## 问题

在 `site/` 下建立可由 GitHub Pages 构建的静态发布面，消费 [public-copy-v2](../public-copy-v2.md) 的全部文案与声称表，实现 [intake](../intake.md) PS-1…PS-9、PS-13、PS-14 规定的六个 proof surface 与材质治理；同时重写根 README（中文为主，一份）。

## 输入

- 裁定：PS-1…PS-15；WK-77（H1）；WK-69 / WK-101 / WK-125（层级、材质、形状）。
- 文案：public-copy-v2 全部；词表 copy-convention §3。
- explore 回执：EX-PS1 表 2–4（token 值与缺口）、EX-PS2 表 3（素材映射）、EX-PS3 表 1–6（标本模块、数据源、子路径、ABI）、EX-PS4 表 1（Eval 八问）。行号在派单时填。
- 证据契约：`engineering/release/2026-09-08/pages-preparation/evidence-contract.md`。

## 基线 SHA

派单时填（Astra 合流后的清洁 main）。

## 写权路径

`site/**`、`README.md`、`.github/workflows/pages.yml`、`site/scripts/**`（媒体与标本捕获脚本）。不得改动 `app/**`、`brand/src/**`、`PAPER.md`、`engineering/**`（交付文件除外）。

## 不得

- 站点独有的颜色、阴影、圆角 token；
- 任何外部请求（字体、脚本、统计、iframe）；
- 打字动画、假光标、自动播放、scroll reveal；
- 在页面上写内部编号（WK / PS / BE / G）；
- 把 fixture 或 loopback 的运行写成真实模型；
- 出现 pricing / plan / enterprise / beta / coming soon。

## 交付物

1. `site/` 源码与 `site/dist/` 构建产物；构建命令与子路径检查脚本；
2. 根 README（中文为主，一份，与页面共用声称表）；
3. Pages workflow；
4. 媒体 manifest（证据契约字段齐全）与捕获脚本；标本 JSON、其 sha256 与捕获脚本；
5. 发布 SHA 上重跑 `node benchmarks/continuity/run.mjs --output <绝对路径>`：输出 JSON、`.attempts.json`、`.journal.jsonl` 三文件入 `evidence/publishing-surface-<date>/`（PS-16 c）；页面 Eval 块的 E / S 通过数只从该输出读取，构建时校验文件存在且 `git.head` 等于发布 SHA；
6. `delivery-ps-01.md`：SHA、改动文件、验证命令与原文、未验证清单、"哪一像素改变了哪一判断"、五轮收敛表（WK-100）。

## 必须验证

fixture 列：构建可复现（两次构建产物 hash 一致）；`/Courtwork/` 子路径下无断链、无绝对根路径；无 JS 时首屏与 03 / 05 / 06 段完整可读；reduced-motion 与 reduced-transparency 下无退焦、无运动；键盘可达所有标本步骤；1440 / 390、浅 / 深、200% 缩放截图；对比度报告；页面无任何网络请求（除同源）。真实列：无（站点不接真实 provider）。

## 验收者

Astra 核对声称表每行的证据路径在发布 SHA 下成立（不成立者降档不删行）、媒体 manifest 与截图状态一致；用户按四轴（成熟、安静、身份、耐久）裁定视觉。

## 端口与数据目录

站点预览端口与标本捕获用的产品端口、数据目录在派单时分配。
