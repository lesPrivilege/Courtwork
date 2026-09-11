# Agent presence · return-v1

2026-09-12 · 本地 Design 返件（synthetic specimen）。按 [HANDOFF](../../../research/agent-presence-2026-09-11/HANDOFF.md) 施工；它不是产品接线，也不是视觉接受。下一步由 Astra 做真实视觉调试。

- **输入**：Courtwork `main@a3a337f`（HANDOFF 基线 `ec240e7`）。开工时实际 HEAD 为 `a3a337f`。
- **分支**：`codex/agent-presence-design-20260911`，从上述 HEAD 建立的隔离 worktree。固定 commit 随交接消息给出。
- **作者 / 模型**：Claude Opus 5（`claude-opus-5`），Claude Code 本地 agent。
- **写权**：只新增本目录。没有修改 `app/`、`brand/`、`site/`、语义 registry、Spark/Attention glyph 或 `engineering/current.md`。

## 2026-09-12 · Astra接收修订

原作者版本固定7fbbda6，以下作者记录保留历史归因。Astra真实CUA修复刮条丢失输入与16s上限；用户追加Claude Code截图后，默认落位改为当前assistant消息/工作块下方，新增 `placement=message`（默认），line/corner仅对照。详情随消息正常流展开，Escape返回trigger。几何和状态采样保持；[Astra裁决与本轮证据](../../../../evidence/agent-presence-review-20260912/README.md)为最新采用口径，覆盖下文作者的line推荐。当前本目录SHA256SUMS对应修订文件；原56文件清单及7fbbda6原提交可召回。未接入App生产面。

## 启动

在 Courtwork worktree 根目录执行：

```bash
node engineering/design/agent-presence-2026-09-11/return-v1/tools/serve.mjs --port 8893
```

然后打开：

- 工具面：`http://127.0.0.1:8893/engineering/design/agent-presence-2026-09-11/return-v1/`
- 独立 Chat 场景：`…/return-v1/chat.html?candidate=AB&placement=line&state=thinking&t=1400&theme=dark`

server 零依赖，只绑定 127.0.0.1，只读服务仓库根目录（场景直接引用 `app/web/vendor/icons.svg`）。不需要 provider、凭据或外部字体，也没有 analytics。

URL 参数（仅 `chat.html`）：`candidate` = `A|B|C|AB|AB:`，`placement` = `message|line|corner`，`state` = fixture id，`sequence` = 序列 id，`t` = 固定毫秒（给出即暂停；加 `play=1` 则从该时刻播放），`theme` = `light|dark`，`rm=1`，`seed`，`interval`，`material` = `flat|soft`，`size`，`depth=off`。

工具面控件：候选、材质、明暗、reduced-motion、深度不支持、状态/序列、播放/暂停/重来、时间刮条、seed、词间隔、落位、场景宽度（1440/1280/390），以及序列自检。以上控件都只在工具面；Chat 场景里没有任何工程参数。

## 推荐

**A→B route，`=` 眼，状态行落位，16 px flat**：静止时是 A（`=]`），只有明确的 thinking 事实才过渡到 B（`=Ʒ`）并做局部压展。理由、三组比较、参考 ID、实验值与 grammar gap 见 [decision.md](decision.md)。

## 文件

| 路径 | 内容 |
|---|---|
| `index.html`、`src/specimen.mjs`、`styles/specimen.css` | 工具面：比较板、动效台、嵌入的 Chat 场景、序列自检 |
| `chat.html`、`src/chat-scene.mjs`、`styles/chat.css` | 完整 Chat 场景（按 `a3a337f` 的 shell/stream/composer 规则复刻），含两种落位与详情展开 |
| `src/geometry.mjs` | 几何源：候选、光学笔重、pose 采样 `sample(pose, elapsed, {seed, reducedMotion})`、路径与材质层 |
| `src/projection.mjs` | 纯投影：fixture 事实 → pose / 文案 / 读屏 / 详情；氛围词采样 |
| `src/model.mjs`、`src/sequence.mjs`、`src/clock.mjs`、`src/presence.mjs` | 帧模型（无时钟）、序列重放、可冻结时钟、DOM 视图 |
| `styles/tokens.css`、`styles/presence.css` | 从 App 复制的 token 子集；presence 组件与两个实验材质 role |
| `assets/*.svg`、`assets/manifest.json` | 由几何源导出的原创 SVG：稳定候选 ID、viewBox `0 0 24 24`、光学尺寸表 |
| `fixtures/states.json`、`sequences.json`、`words.json` | Design fixture（不是生产 DTO）：15 个状态、4 条序列、5 个本地测试词、真实工具标签格式；seed 与 elapsed 均显式给出 |
| `tests/presence.test.mjs` | 定向测试（17 项） |
| `tools/serve.mjs`、`build-assets.mjs`、`assets.mjs`、`capture.mjs` | 静态 server、资产导出、证据截图与浏览器检查 |
| `evidence/` | 候选截图、`results.json`、[结果表、修正与未测项](evidence/README.md) |
| `SHA256SUMS` | 除自身外本目录全部文件的哈希 |

## 已测 / 未测

已测（作者定向）：`node --test engineering/design/agent-presence-2026-09-11/return-v1/tests/presence.test.mjs` 17/17；浏览器检查 17/17（序列 19/19 探针、键盘详情、200% zoom 与 390 布局 8 组、reduced-motion、forced-colors、深度回退、非 thinking 无帧循环、隐藏页停时钟、live region）；对本目录运行 lint-colors / lint-materials 均通过。重跑证据需要本地 Playwright：

```bash
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" node engineering/design/agent-presence-2026-09-11/return-v1/tools/capture.mjs --port 8893
```

未测：真实设备的刷新率与疲劳、Safari/Firefox/真机触控、真实读屏、其他 skin 与字号档、1280 角落，以及与工作中 ledger 渐变同屏的效果。逐项见 [evidence/README.md](evidence/README.md)。本片没有非作者复核。

## 后续接线点（供 Astra 裁决，本片未实施）

1. **位置**：`app/web/index.html` 的 `#composer-run-hint`，由 `app.mjs` 的 `paintWorkingClock` / `renderComposer` 驱动。脸替换 `::before` 的 `se-pulse` 圆点，句式与 elapsed 不变。
2. **事实来源**：`currentRun()` 的 status、工具行（`row.name` 与 phase）、`pendingRuns` / `pendingCancels`（客户端在途，G-4）、问题与授权卡、连接状态。`projectPresence` 的输入需要一个接在现有投影后面的纯 adapter；不新建 presence store 或 schema。
3. **thinking 事实**：Run 词表与前端投影里都没有 thinking 活动事实。`app/server/store.mjs` 中的 `reasoningEffort` 是配置，`model.reasoning` 是能力位，都不是活动事实；runtime 事件流是否带 thinking delta 本片没有核查。在 owner 提供明确事实之前，产品里只会出现 “Working”，不会出现轮播词（这是本片的核心约束）。
4. **材质 role**：若采用 soft，需要在 App 的 R 层登记 `--presence-depth` / `--presence-sheen`，并补跑 lint 与对比度（G-1）。
5. **动效合同**：是否放开品牌短动作的不循环规则，或另立 presence 动效条款（G-2）；终态行何时收起（G-5）。
