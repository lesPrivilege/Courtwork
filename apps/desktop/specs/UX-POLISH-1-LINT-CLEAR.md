# UX-POLISH-1-LINT-CLEAR · 既有 evidence script lint 门清偿

状态：已清账（实现 `721e4ee`；独立 Luna PASS `e4915ad`，收口账本 `6c4804f`；
架构消费 `e5ca354`）。本微票只解除 UX-POLISH-1 的 root-lint 阻断。

权威：`CLAUDE.md`、`AGENTS.md`、`apps/desktop/specs/UX-POLISH-1.md`、
`apps/desktop/ACCEPTANCE.md`、本票。它是 UX-POLISH-1 的 gate-only 清偿微票，
不重做 UX 实现，不改变能力成熟度或 Agent/product-live 口径。

## 目标与精确范围

清除 UX-POLISH-1 独立验收报告记录的 base-pre-existing 根 `pnpm lint` 阻断。
实现者只允许修改：

- `release/evidence/work-agent-showcase-1/acceptance-2026-08-19/capture-script.mjs`
- 本票实现回执（追加在本文件）

禁止触碰产品 renderer、Rust、provider、journal、schema、ABI、测试断言语义、
截图证据、Pages、README、官网、`docs/status/current.md` 或公开成熟度叙事。

## Born-red 与最小修复

在修改前于 clean worktree 实跑根 `pnpm lint`，记录该文件的 18 枚 `no-undef`。
修复只能补充准确的 Node/browser 全局声明或等价 ESLint 作用域元数据；不得关闭
规则、改 eslint 配置、加入目录豁免、删除证据脚本或改运行行为。修复后同一命令
必须通过，并以 `git diff --check` 与脚本语法检查证明无行为性改动。

## 验收证据矩阵

独立 Luna 必须使用 clean worktree、独立临时端口（若启动桌面服务）、不采信实现
自述，亲跑：

1. 修改前反例：`pnpm lint` 失败且命中该文件的 18 枚 `no-undef`。
2. 修改后：`pnpm lint` 退出 0；`git diff --check` 退出 0；脚本 `node --check`
   退出 0。
3. 回归：UX-POLISH-1 定向 Pi 单测/DOM/E2E 与报告所列关键门不退化；不重新宣称
   真 DeepSeek、WKWebView、AX/读屏/焦点或 Agent/product-live。
4. 真实反例：临时移除或反转全局声明时 lint 必须再次变红，恢复后回绿；探针必须
   只改临时副本并还原，不能留在提交中。

## 功能不回退门与禁止范围

本票只允许解除 lint gate，不得把 scripted evidence 升格为 product-live；UX 原票
仍须等待本票 PASS 后由架构消费，而 `PI-BASE-GUI-ACCEPT` 的 external-validated
blocked 边界仍原样保留。验收 REJECT 时只追加 ACCEPTANCE 留痕，不改契约。

## 实现回执

待独立实现会话追加精确提交、born-red/green 数字、触碰文件与命令出口。

### 2026-08-19 Luna 实现回执

- 角色：全新 Luna 实现会话；未执行本票验收，不宣称 UX-POLISH-1、Agent 或 product-live 放行。
- Born-red：修改前根 `pnpm lint` 退出 `1`，仅命中
  `release/evidence/work-agent-showcase-1/acceptance-2026-08-19/capture-script.mjs` 的
  `18` 枚 `no-undef`：`process`×2、`localStorage`×1、`window`×11、`document`×3、`console`×1。
- 最小修复：仅在该脚本首行加入只读文件级全局元数据
  `/* global process:readonly, localStorage:readonly, window:readonly, document:readonly, console:readonly */`；未改 ESLint 规则、配置、目录豁免、脚本逻辑或运行行为。
- Green：修复后同一 `pnpm lint` 退出 `0`；`git diff --check` 退出 `0`；
  `node --check release/evidence/work-agent-showcase-1/acceptance-2026-08-19/capture-script.mjs` 退出 `0`。
- 触碰文件（仅此二者）：
  `release/evidence/work-agent-showcase-1/acceptance-2026-08-19/capture-script.mjs`、
  本文件 `apps/desktop/specs/UX-POLISH-1-LINT-CLEAR.md`（仅追加本回执）。
- 禁止范围保持未触碰：产品 renderer、Rust/Tauri、provider、journal、schema、ABI、测试断言语义、
  PNG/manifest 证据、Pages、README、官网、`docs/status/current.md`、公开成熟度叙事，以及任何 UX/runtime 行为。
- 精确提交：实现提交 `721e4ee13a9021f26491f4314ebab860486fbca5`（`fix(lint): declare evidence capture globals`）；本回执不等同于独立验收通过。
