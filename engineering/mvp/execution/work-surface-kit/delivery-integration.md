# Work Surface Kit · 整合交付（Fable，2026-09-09）

分支 `claude/wsk-integration`，worktree `/private/tmp/se-agent-wsk`，服务 8857（数据 `/private/tmp/se-agent-wsk-data`，含 RC seed）。未推送；合流与独验归 Astra。

## 组成

| 支 | 头 | 内容 |
|---|---|---|
| `claude/wk6-home-brand` | `688e065` | WO-WK6（allowlist、Home 构图、品牌接线）、WO-WK8（slogan、按钮降级、CourtWork 命名、留位条）、BR-1 消费（merge `d799a7f`）、WK-39 侧栏、WK-40 标题行 |
| `claude/rc-runtime-ui` | `8350428` | WO-RC runtime 控制面 UI 五提交 + 证据复跑 |
| `claude/wk7-color-governance` | `10f1afe` | 色彩三层治理、铅灰 skin、深宗、lint / 对比表 / 测试 |
| 整合提交 | `11b5ca8`（rc，styles.css 末尾两段并存）、`623a24c`（wk7，自动）、`e1bd5d9`（WK-51 移除在场标记、WK-52 `--frame`、plug glyph、开关命中区） | |

## 追加

第二节点（2026-09-09 深夜）：合入 `claude/wk10-rail`（WK10a：模块登记表与宿主、对齐带、composer 层、图标尺寸档、文案扫描、消融表）与 `claude/wk10-r2`（WK-69 高度层与 `--float`、`--canvas` 退役、背景 lint；WK-72 悬浮工作面与 glyph 竖条；WK-73 composer 框内 / 框外）。整合头 `e170b99`：136 / 136（一次 135 / 1 偶发，复跑通过）、lint 两项、对比 76 / 76、WK6 7 / 7、断言 30 / 30。交付细节见 `delivery-wk10a.md`、`delivery-wk10a-r2.md`、`text-sweep.md`、`ablation-wk10a.md`。

## 追加（第一节点）

`28c1032` 开关 44 px 命中；`06e0d93` composer 稳定部分 + `#composer-below`（WK-55）。

## 验证（fixture 列，整合头 `e1bd5d9`；追加提交后 136 / 136、lint ok 复跑）

```
node tools/lint-colors.mjs          → ok (13 files)
node tools/contrast-report.mjs      → 0 项低于门槛（含 ink / muted-strong 对 frame）
npm --prefix app test               → 136 / 136
WK6 home-interaction-checks (8858 fresh data) → 7 / 7
RC verify (8857, clean profile)     → 见下表
```

RC verify 的三项 MCP 检查（mcp-states / remote-tools / mcp-lifecycle）需要 README 记载的手工步骤"把 MCP 服务器重新导入为 `http://127.0.0.1:8851` 并连接一次"，本整合未执行该步骤，因此这三项在 8857 上为 fail；RC 自身证据（8850，`988f606`）为 36 / 36。其余项复跑（clean profile）：contract 16/19、counterexamples 8/9、viewport 33/36。除三项 MCP 外的 fail：`bar-no-limit`（0 segments，8857 数据目录累积多次 seed 后上下文条无分段，属数据状态而非代码；与 WK-50 (4) "条只在 ≥ 2 桶时显示"一致）；`touch-targets` 390 三态报 `INPUT=17` × 8–13——headless 无 coarse pointer 且 clean profile 仍复现，真实浏览器 mobile 模拟下 `#runtime-content` 内无 < 44 px 控件，两者不一致，已追加 `@media (max-width: 1023px) .runtime-switch input { height: 44px }`（`HEAD`），请 Astra 以 RC README 的完整步骤（fresh data dir + MCP 重导入）独验定论。

浏览器实测（Chromium，8857）：Home 浅 / 深宗，侧栏 `--frame` 退后一步、工作面冷白 / slate-3；390 下 runtime 模块无 < 44 px 控件（真实 coarse 模拟）；标题行一行、连接徽标 plug icon-only；侧栏次序 New session → Home。

## 未验证

真实 provider（`not_run`）；MCP 手工步骤；Tauri / Electron 壳下 `env()`；Home 10 项脚本（Astra 独验时重跑）；四轴视觉判断（用户）。

## 交 Astra

1. 独验后快进 `codex/fresh-courtwork`；三支可整体以 `claude/wsk-integration` 合入，或按支合入（rc 与 wk7 相对 wk6 只有 `styles.css` 末尾并存段）。
2. 后端 gap（已在 intake WK-46 / WK-50）：`GET /work-activity`（热力图）、多文档 tab、"今日"口径、B-1 provenance 服务器闸门、B-2 catalog-only characters、B-4 prompt_template 入 context[]、B-10 unknown 效果 fixture。
3. 下一前端单 WO-WK10（导轨宿主、热插拔槽位、对齐带、文本清退扫描、消融表）待合流后开工。
