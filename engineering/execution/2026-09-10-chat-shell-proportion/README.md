# WO-CS-01 · ChatSpace / composer 外壳比例整改

2026-09-10 · Claude（Opus）施工，依据 Astra 的[版式裁定](../2026-09-10-summary-disclosure/layout-ruling.md)。本文只是作者交付，验证都是作者验证，不代表独立验收，也不代表视觉接受。

## 基线、分支与单 writer 声明

- worktree `se-agent-cs`，分支 `claude/chat-shell-proportion`。施工基线 `438bb9c`，即 main `1992e90` 合入 `codex/summary-disclosure-r2` `eff0e41` 后的结果，不是 main。
- 产品提交 `106330b8dbde36aa3eb62114c626e9e9d20a29f0`；证据与本文在其后的提交里。没有 push、没有合入 main、没有部署。
- **单 writer 声明**：本工单期间，这个分支是 Claude 在 `app/web` 上唯一的 writer。后续 EX-IC2 的控件整改叠在本结果之上。请 Astra 确认这一点后再合流。
- RuntimeStore、Core、app schema 都没有改动；server、`summary-disclosure*`、`ui-controls.mjs`、`model-picker.mjs`、`settings-view.mjs`、site/、brand/ 也没有改动。

## 变更记录（frontend-contract §每次局部施工）

| 项 | 内容 |
|---|---|
| 最近先例 | `app/web/styles.css` 的 `.sidebar` / `.nav-home` / `.chat-header` / `.message-stream` / `.composer-area` / `#composer-input`，WK-13 icon tier，WK-42 `--band-top`，WK-72 `.app-shell.surface-cards` 让位规则；`app/web/surface-layout.css` 的 288 卡与 band 下沿；`app.mjs` 的 `measureSurfaceLayout` 与 WK-92 `session-meta`；`app/web/shell-layout.mjs` 的原生 chrome 几何包 |
| grammar | precedent-map 的 `work.composition`（阅读列 740、卡片让位）、`tab.chrome`（Preview tab 与顶带同高）、`button.action`（32/44 命中区） |
| 保持 | 740 阅读列；Home 的 820 列与 Home composer 尺寸；288 卡宽；strip / view-switch / 三栏 / sheet 四档语义；焦点、Escape、returnFocus 路径；文字字阶；32 / 44 命中区 |
| 改变 | 顶带 56→48；导航 glyph 20→16，项距 16→4；标题单行，不再显示默认的 Chat 模式词；正文与 composer 共用 `--chat-inset`；卡片收起阈值改为 640 阅读下限加两侧紧内距；Chat composer 空态约 116px，内容驱动增长，上限 180 |

## 裁定逐条落点

实测都来自 `getBoundingClientRect`，环境为 headless Chrome 152.0.7977.83 与合成数据。完整对照见 [comparison.json](../../../evidence/chat-shell-proportion-20260910/comparison.json)。

### 1 · 侧栏

- **采用**：`.nav-home` 的 `min-height: max(32px, var(--control))`，桌面 32，触屏和窄屏跟随 `--control` 取 44。图标并入已有的 16 档（WK-13 row tier），20 档取消。`.sidebar` 去掉统一的 `gap`，改为 `.sidebar > * + *` 取 `--space-4`（组距 16），`.nav-home + .nav-home` 取 `--space-1`（项距 4）。字号不动，仍继承按钮的 `--text-label` 12px。
- **理由**：原来的 32 行高是 20 图标撑出来的内容高度，图标换成 16 后只剩 30，所以要显式声明 32。选中底色画在按钮本身上，与 32 行完全重合；项距 4 让相邻的选中和 hover 底色之间留出空隙。
- **实测**：行高与图标 32/20 → 32/16；项距与组距 16/16 → 4/16；390 overlay 下导航与会话行都是 44（前后相同）。

### 2 · 顶带

- **采用**：`--band-top: 48px`。桌面 shell 下改为 `max(48px, var(--native-toolbar-height, 0px))`，原生宿主只能把它抬高，不能压低。`.chat-title-wrap` 改成单行 flex，基线对齐，run 状态词跟在标题后面。`session-meta` 不再输出默认的 `Chat` 模式词，Work 和 Attention 照旧显示，口径与导航里 WK-92「只标 Work」一致。
- **原生宿主**：仓内没有 AppKit 或 WKWebView 宿主，只有 `shell-layout.mjs` 的几何包合同（`window.__CW_NATIVE_CHROME__` 和 `courtwork:native-chrome` 事件）以及 Window Controls Overlay 的探测。这里只做了能在 web 侧验证的部分：用合成事件派发 toolbarHeight 40/52/60，实测带高为 48/52/60，品牌让出 88 的安全区。真实宿主的测量没有验证，见待裁定。
- **实测**：品牌行 / chat header / Preview tab 带 56/56/56 → 48/48/48，四种状态下都在 `top: 0, height: 48`；标题块高 35.5（两行）→ 20.25（一行）；Settings 顶带同为 48。

### 3 · 内容列

- **采用**：在 `.conversation-body` 上定义 `--chat-inset: clamp(--content-inset-tight, (100% − --cards-inset − --column) / 2, --content-inset)`。`.message-stream` 与 `.composer-area` 都用这一个变量做左右内距；卡片打开时，右侧另加 `--cards-inset`。<768 时取 `--page-gutter`（16）。新增 token `--content-inset: 40px`，因为间距阶里没有 40；`--content-inset-tight` 就是 `--space-8`。
- **理由**：两个盒子的百分比都解析到同一个宽度，也就是 conversation body，内距又来自同一个表达式，所以不会各算各的而错边。先扣掉卡片占位再选内距，可用宽度够放 740 时取 40，不够时收到 32，中间连续过渡，不会跳变。这是内容列自己的内距，替代了原来的 `--page-gutter` 24，不和外壳 gutter 叠加。Home 显式保留 `--page-gutter` 和 820。
- **实测**：正文与 composer 左右边差在 1440/1280/390 × 明暗四状态下全部为 0。内距：1440 为 40 加居中余量（共 66，前后相同）；1280 从 24 → 32；390 为 16。1280 带卡片时列宽 664 → 648。

### 4 · 右摘要

- **采用**：卡宽仍为 288（surface-layout 未改）。`measureSurfaceLayout` 的收起阈值从 `480 + 2·col-gap + 288` 改为 `640 + 2·--content-inset-tight + 288 + col-gap`，按实测的 chat 列宽判断，内距从 CSS token 读取。640 取自已有先例：≥1680 三栏里 chat 列的 `minmax(640px, 1fr)`，以及 WORK-4「工作面打开时阅读宽 ≥ 640」。
- **理由**：列宽加两侧内距放不下卡片时，先按已有的 strip 档收起，不压窄正文。卡片与正文之间的间隙就是 `--chat-inset` 加居中余量，最小 32。
- **实测**：1440 时宽度/间隙 288/66（未变）；1280 从 288/24 → 288/32；裁定所用视口 1195×772 从「卡片、列 615、间隙 24」变为「strip、列 740、间隙 83.5」；边界处 1271 为 strip、1272 为卡片（列 640、间隙 32）；1024 与 800 为 strip（列 672/668、间隙 32）。长文件名：卡宽保持 288，名字在卡内换行，没有横向溢出。

### 5 · Composer

- **采用**：空态 textarea 为两行 `calc(2lh + 8px)`（约 54），整块 composer 从 150 降到约 116（390 从 158 降到 124，因为控件行是 44）。Chat composer 用 `field-sizing: content` 按内容增长，上限沿用 180，超过后在框内滚动。内部编排不动：文本在上，工具行在下，左侧是附件和模型，右侧是发送；错误说明继续放在 `draft-status` 槽位。粘贴 token（CI-A）和附件（CI-E）不在本单范围内。
- **理由**：两行空态让它读作续写控件而不是搜索框，同时去掉原来固定 88 带来的空白。增长完全交给引擎（Chromium 123+ / Safari 26.2+），没有写 `value`，也没有 JS 写高度，所以撤销栈保留；程序恢复的草稿也会被正确撑开。Home 仍用自己的 96/48 尺寸，不开启增长（WK-97）。
- **实测**：textarea 从空到 1、2、3、5、8、20 行依次为 54.2 → 54.2 → 54.2 → 77.3 → 123.5 → 180 → 180，20 行时 scrollHeight 470，可以滚动，光标行可见；`execCommand('undo')` 能从 20 行退回 8 行；删空后回到 54.2；切换会话再切回来，4 行草稿高 100.4，内容完整显示；错误行与 composer 左边对齐；Tab 能依次到附件、模型、发送，都有焦点环。

### 6 · Home

Home 的 820 列和 composer（820 × 116.19）前后完全相同，顶带随全局变为 48。

## 验证（作者）

| 项 | 结果 | 原始输出 |
|---|---|---|
| 基线捕获（前） | 24 张截图 + 测量；21 项交互检查中 9 项通过，其余是整改目标，符合预期 | `before/` |
| 整改后捕获（后） | 24 张截图 + 测量；21/21 通过 | `after/` |
| `npm --prefix app test` | 706/706 通过（含新增 7 项） | [full-test.txt](../../../evidence/chat-shell-proportion-20260910/full-test.txt) |
| 定向测试（chat-shell-proportion、summary-disclosure、chat-work-shell、work-surface-tabs、shell-layout） | 39/39 | [targeted-tests.txt](../../../evidence/chat-shell-proportion-20260910/targeted-tests.txt) |
| `npm --prefix app run smoke` | exit 0，realProvider `not_run` | [smoke.txt](../../../evidence/chat-shell-proportion-20260910/smoke.txt) |
| lint-colors / interaction / materials / shapes、contrast-report | 全部 exit 0 | [lint.txt](../../../evidence/chat-shell-proportion-20260910/lint.txt) |
| `tools/check-doc-links.mjs` | checked 3538, problems 0 | [doc-links.txt](../../../evidence/chat-shell-proportion-20260910/doc-links.txt) |

上面第一次全量 699/699 是在新测试文件和最后一处 Home 作用域修正落盘之前启动的，不算作最终结果。最终结果是上表的 706/706。

复跑方法：

```sh
CS_PORT=8883 CS_DATA_ROOT=/private/tmp/se-agent-cs-data node evidence/chat-shell-proportion-20260910/serve.mjs &
export CS_CONFIG=<serve 输出的 dataDir>/fixture-config.json
(cd evidence/chat-shell-proportion-20260910 && CS_OUT=after node capture.mjs && CS_OUT=after node checks.mjs && node compare.mjs)
```

`before/` 由 `git archive 438bb9c app brand` 导出的树运行同一个 `serve.mjs` 生成。截图哈希见 `png-sha256.txt`，每张状态截图的哈希也写在 `measurements.json` 里。数据全部是合成的，由本地 fake responder 生成，没有调用付费 provider，也没有读取个人凭据。

未覆盖或受限的项目：原生宿主实机；经典（占位）滚动条，因为 macOS 上的 headless Chrome 始终是 overlay 滚动条，`scrollbars.mjs` 实测宽度为 0，这种情况无法复现；200% 缩放用 640×400 和 720×450 视口加 DSF 2 等效，不是真实浏览器缩放；VoiceOver 和 IME 没有检查。

## 待裁定

1. **原生宿主安全区**：仓内没有原生宿主，web 侧按 `max(48, toolbarHeight)` 实现并用合成事件验证过。需要确认真实 AppKit 宿主测得的 toolbar 高度，以及它支持的最低 WebKit 版本（`field-sizing` 需要 Safari 26.2+，更低的版本下 composer 保持两行并在框内滚动，不增长，但不会被裁切）。`shell-layout.mjs` 在非 overlay 分支里的 `toolbarHeight: 56` 是个无效值，那个文件不在本单写权内，所以没动。
2. **文档里的数字与本次冲突**，都不在写权内：`engineering/design/ui-composition-standard.md` 的尺寸 token 表（顶带「56；desktop shell 下 52」、glyph「16/18/20」、Work composer 88，缺 `--content-inset` 一行；该表写明「改数字必须同时改这里」），`docs/interface-components.md` 与 `evidence/home-composition-20260910/apple-window-controls.md` 中的「at least 56px」。
3. **390 下的右摘要**：工单要求「回到文档流且可达」，产品目前沿用 Astra 定下的 <768 按需全屏 sheet。实测可达：从 panel-right 打开，Escape 关闭后焦点回到按钮。把它改成放在文档流里，需要改 host 的放置逻辑或 summary 模块，这超出本单写权，也会推翻「窄屏沿原按需 sheet」。请 Astra 裁定。
4. **阈值写在 `app.mjs`**：收起阈值实际位于 `measureSurfaceLayout`，不在 surface-layout.css，所以这次改了 `app.mjs` 里的一行公式和一个常量 `READING_FLOOR = 640`。这超出了工单对 `app.mjs` 的字面授权（只写了顶带和 composer），但工单明确授权改收起阈值。请确认。
5. **640 这个下限**：采用 640 的结果是 1280 时仍显示卡片，列宽 648。如果要求带卡片时正文保持 740，阈值会变成 chat 列 ≥ 1132，也就是 256 侧栏下窗口 ≥ 1388，1280 就会改为 strip。
6. **Home composer 增长**：Home 维持原尺寸，不增长。WK-97 注释说「两者都随输入增长」，但基线里两者都不增长，这个不一致是原来就有的，留给后续处理。
7. **标题的水平对齐**：侧栏开合按钮在标题前面，所以标题左缘（1280 下为 320）和正文左缘（288）不在一条线上。裁定只要求共用基线，这次没有改。
8. **h1 的焦点环**：切换会话后，`tabindex=-1` 的标题被程序聚焦，headless 截图里能看到焦点环。这是原有行为，不属于本单，可以交给 EX-IC2 的焦点盘点。
9. summary 模块本身不需要改。

## 用户裁定（2026-09-10，交付 `bb0a501` 之后）

原交付提交不改写，以下裁定叠在其后记录。

- **前置条件**：本分支的基线 `438bb9c` 带入了 `codex/summary-disclosure-r2` `eff0e41` 的摘要模块。该模块另行做非作者复核，不因作施工基线而被顺带接受。
- **顺序**：CI-B/F → CS-01 → EX-IC2。增高机制只归 CI-B，包括能力检测、JS 回退和短视口上限；图片提示归 CI-F。整合时删掉本单 `106330b` 里重复的增高规则。Chat「两行起步」保留为尺寸候选，但要和 CI-B 的回退、Home 锚点、大字模式一起复验，不能只删冲突行了事。整合分支保留原 SHA。
- 第 1 项：原生宿主仍标未验证。不能用某个 Safari 或 WebKit 版本推断兼容；上文涉及 `field-sizing` 版本的说法不作兼容依据。
- 第 2 项：三份文档已同步到 48px、16px 导航图标和 Chat 内容列内距，提交紧随本段。composer 初始高那一行（`ui-composition-standard.md` 的 88）留到整合后按 CI-B 的实测值再改。
- 第 3 项：手机端摘要继续用既有的全屏 sheet，不扩大本单范围。
- 第 4 项：`app.mjs` 按实际宽度计算收起阈值，属于本单合理范围，接受。
- 第 5 项：740 是阅读列上限，不是最小值；640 暂作保留右栏的下限，1280 下 648 不判失败。
- EX-IC2 的清点可以继续只读；产品整改等组合基线固定后再开写。
- **摘要模块复核**：非作者复核 `2265649`（分支 `claude/summary-disclosure-review`）的结论是有条件通过，D1、D2 待修。用户对 Q1–Q3 的裁定记在整合分支 `420370c` 的 `evidence/cs01-ci-bf-integration/README.md`，本记录只作引用。
