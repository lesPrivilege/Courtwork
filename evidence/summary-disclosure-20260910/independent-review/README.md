# R2-SD01 摘要模块 · 非作者独立复核

- 复核人：Claude Opus 5。不是该模块或 host 接线的作者，本目录可作为独立复核证据。本轮没有修改产品代码。
- 复核对象：分支 `codex/summary-disclosure-r2`，冻结在 `eff0e41a9cd3ceabd9c79d913f6a80089deb9ea6`。最后一次产品改动是 `1c4138b800e5cb2a78968f83793346aa2f2a9be5`；`9808b08` 与 `eff0e41` 只动了文档和证据。基线是 `67ed0fd`。
- 复核 worktree：`/private/tmp/se-agent-sdr`，分支 `claude/summary-disclosure-review`，开工时 HEAD 为 `eff0e41`，工作树干净。
- 环境：macOS（Darwin 25.6），Node v25.9.0，Playwright 1.59.1。主证据来自本机已安装的 Google Chrome 152.0.7977.83，由 Playwright 以临时 profile 无头启动，通过键盘和鼠标输入事件驱动。另用 Playwright 自带的 Chromium 147.0.7727.15 做 D1 复现，用 Claude 应用内浏览器面板（Chromium 152）手动做鼠标 CUA 抽查；抽查不存截图。截图 scale 为 1，不是原生 200% 缩放。
- 数据：全部合成。本地 fake loopback provider 使用仓库里现成的测试常量；没有跑付费 provider，没有读个人凭据。端口 8885，数据目录 `/private/tmp/se-agent-sdr-data`（`boot()` 通过 `TMPDIR` 在其下建临时目录）。结束时服务器已关闭，8885 已确认空闲。

## 总体结论：有条件通过

投影、身份和代际防护、默认折叠、同对象右 tab、文档关闭与隐藏工作面的区分、生产字节无注入、全量测试，都有实测证据支持。确证两处 P2 缺陷（D1 焦点返回，D2 SHA 行布局），另有两项合同缺口需要 Astra 裁定（Q1、Q2）。

通过条件：
1. D1、D2 由作者修复，并由非作者按本目录脚本重跑确认。
2. Astra 对 Q1（生产路径不提供 loading/error/unavailable 状态）和 Q2（<1024 摘要位置）给出书面裁定。

P3 各项不作为条件。

## 逐条结论与证据

### 1. 写权与边界：通过，附一条 P3

- 实际改动：`app/` 下 8 个文件，与工单所列一致；另外改了 `engineering/current.md`（见 D6）。`git diff --stat 67ed0fd eff0e41 -- app` 为 +1166/−21。
- 授权：`app.mjs`、`index.html`、server 静态白名单、`surface-layout.css` 及相应测试，都在工单「20:01 用户升级完成条件」中追加授权。`app.mjs` 的非摘要改动分别对应以下记录：Expand/Restore preview、文档 × 与 Hide work surface 的区分、strip 的 Run 入口（20:31）；桌面进入 Session 默认显示目录、收起时从原 host 恢复 opener（20:01）。strip 阈值由 740+360 改为 480+288，没有找到逐字对应的记录（见 D5）。
- 只投影、只发 intent：`projectRunSummary` 是纯函数。冻结输入后调用两次结果一致，输出不与输入共享引用。卡片的回调只有 `railHost.openRun` 和 `railHost.openFile`，都是既有的 navigation intent。没有新 endpoint、schema 或 registry。`server/index.mjs` 只追加了静态条目。`maximized` 是不持久化的 UI 状态；localStorage 仍只有 `schema-engineering.ui.v6`，字段不变（见 `browser-results-chrome.json` 的 `no-disclosure-persistence`）。
- 模块内没有 `addEventListener`、observer、定时器、fetch 或 storage。`grep` 结果为空。

### 2. 状态表逐行实测

| 状态 | 结论 | 证据 |
|---|---|---|
| 正常 | 通过：默认折叠，显示 `Files · 1`，状态为 Completed | `normal-default-collapsed`，`screens/1440-light-collapsed.png` |
| loading | 待裁定（Q1）：生产路径里卡片不会进入 Loading；对象未读到时不出卡 | 会话读取延迟 2.5 s 期间卡片隐藏：`late-session-reply-does-not-overwrite.during` |
| empty | 通过：已知为 0 时显示 `Files · 0` 与 “No files were recorded”；没有 Run 时不出卡 | `empty-run-known-zero`，`no-run-no-card`，`screens/1440-light-empty-run.png` |
| unknown | 通过（网络层 mock）：未知 status 显示为 Unknown，不当作失败或完成 | `network-mock-unknown` |
| error | 待裁定（Q1）：生产路径不传 error，也不接 `onRetry`；failed Run 显示为 Failed。读取错误由 host 的 Run 面板负责 | `failed-run-status`；单测 `Run card only offers Retry…` |
| 缺文件列表 | 通过（网络层 mock）：`artifacts` 缺失或含非法条目时显示 `Files · unavailable`，不显示为 0 | `network-mock-missing`、`network-mock-malformed`，`screens/1440-light-netmock-*.png` |
| 迟到回包、重复请求 | 通过：A 会话回包迟到 2.5 s，期间已切到 B，最终仍显示 B 的 Run，没有 Loading；Run 读取延迟 2 s 期间切会话，不会展开旧 Run，也不停在 Loading；单次 Enter 只发 1 次 `GET /runs/:id` | `late-session-reply-does-not-overwrite`、`late-run-read-after-switch`、`run-open-requests` |
| 切会话后不停在 Loading（Luna 复现项） | 通过：Luna 复现问题所在的 fixture bridge 已退役，生产投影总是 `phase:"ready"`；延迟回包下实测也没有 Loading | 同上；`serve.mjs` 与产品字节一致见 `served-bytes.txt` |
| 切目标 | 通过：切会话后身份变为新会话最新 Run，两个 disclosure 复位；切回原会话仍为折叠 | `switch-session-new-identity-collapsed`、`return-session-disclosure-cleared` |
| 旧对象的 Open | 通过：先持有旧 Open 按钮，切会话后再点击，不执行 | `stale-open-after-session-switch-ignored` |
| 版本变更（同会话出现新 Run） | 通过：摘要切到新 Run，旧按钮已脱离 DOM，点击也不执行 | `new-run-replaces-summary-identity`、`stale-open-after-new-run-ignored`，`screens/1440-light-after-new-run.png` |
| 撤权（另一客户端删除会话） | 待裁定（Q3）：host 在 6 s 内没有察觉删除，卡片继续显示，旧 Open 仍会执行 | `revoke-check.txt` |
| renderer 缺席或不兼容 | 待裁定（Q1）：生产路径固定 `readerAvailable:true`；只有单测覆盖 | 单测 `readerUnavailable keeps file provenance…` |
| 关闭、重开、重启 | 通过：Hide 后再打开，同一身份的披露状态保留；页面重载后回到 Home，再进入会话时两个 disclosure 都是折叠；storage 里没有披露状态 | `reopen-keeps-local-disclosure`、`reload-check.txt` |

### 3. 交互：通过，D1 除外

- 默认不展开；Enter 和 Space 切换 disclosure 时焦点留在 `summary` 上（`enter-opens-files-focus-stays`、`space-toggles-files-focus-stays`）。
- Tab 顺序：Files 展开时依次为 `run-summary-file:0` → `run-summary-information` → 相邻卡片；Run information 展开时 → `run-summary-open`（`tab-order-*`）。
- 同对象右 tab：文件在文档 tab 打开，路径一致；Run 在 Run tab 打开，面板中包含该 Run id（`file-opens-in-right-tab`、`run-opens-in-right-tab`、`run-tab-same-identity`）。
- Escape 返回焦点：Chrome 152 下文件和 Run 两条路径都能回到原触发器；Chromium 147 下两条都落到 `<body>`，即 D1。
- 文档 tab 的 × 只关闭文档，仍停在目录，焦点回到原文件行；标题栏 panel-right 按钮 “Hide work surface” 隐藏整个工作面（`doc-close-only-closes-document`、`hide-work-surface-*`）。
- 相邻模块：Workspace 卡片 Open 后按 Escape，焦点回到 `rail-open:preview`；从标题栏重开工作面时焦点落在 Files 触发器，再按 Escape 落在 `show-surface-button`（`host-checks.txt`）。

### 4. 布局：通过，D2、D3 除外

- 1440 和 1280，明暗两种主题：页面无横向溢出，卡片内没有元素越出目录边界，目录底边在视口内（`layout-*`，`screens/1440-*`、`1280-*`）。
- 390：不在正文中内联；生产行为是按需打开 sheet（`aria-modal="true"`），卡片位于 16–374px，文件预览与 Escape 焦点都正常（`narrow-*`，`screens/390-*`）。位置合同见 Q2。
- 长卡：长文件名场景下两层都展开，目录高 796px（视口 900），`overflow-y:auto`，在卡内滚动（`long-card-bounded-scrolls`，`screens/1440-light-long-*.png`）。
- 长文件名：文件行 basename 截断，完整路径保留在 `title`（192 字符）和 aria-label 中（`long-name-bounded`）。Run information 里的 SHA 行在长路径下失效，即 D2。
- 1024 strip 显示 run、preview、runtime 三个 glyph，Run glyph 打开 Run tab（`strip-*`）。1680 三栏；Expand preview 与 Restore preview 前后，文档渲染节点是同一个实例（`maximize-restore-keeps-renderer`）。720×450 等效重排无横向溢出，这不是原生 200%。
- 邻接的 Home 和 Settings 页面：不出现摘要卡，无横向溢出（`adjacent-*`）。

### 5. 生产模式与 fixture 模式：通过

- `evidence/.../serve.mjs` 在 `eff0e41` 已不含任何 `SD_FIXTURE_ADAPTER` 注入路径。产品代码中没有 fixture 引用（`grep` 为空）。
- 本复核的 `review-serve.mjs` 只做原始代理：9 个关键前端文件的实际下发字节与仓库逐一相同（`served-bytes.txt`）。
- 本目录截图没有一张来自注入模式。`netmock-*` 三张是在网络层改写产品自身 `/api/v5` JSON 得到的，在结果中已单独标注。

### 6. 测试：全部通过

| 命令 | 结果 | 原始输出 |
|---|---|---|
| `node --test tests/summary-disclosure.test.mjs tests/chat-work-shell.test.mjs`（cwd `app/`） | 19/19 | `targeted-tests.txt` |
| `npm --prefix app test` | 657/657，190 s，单次运行，无 flake，无需重跑 | `full-tests.txt` |
| `npm --prefix app run smoke` | exit 0，`realProvider: not_run` | `smoke.txt` |
| `tools/lint-colors`、`lint-interaction`、`lint-materials`、`lint-shapes`、`contrast-report` | 全部 exit 0；新增 CSS 在扫描范围 `app/web/**` 内 | `lint.txt` |
| `git diff --check 67ed0fd eff0e41` | 干净 | `lint.txt` |
| `node tools/check-doc-links.mjs` | pass：743 份文档、3491 条链接、0 问题 | `doc-links.txt` |
| 浏览器检查（Chrome 152） | 41 项通过，0 项失败，10 项仅记录 | `browser-run-chrome.txt`、`browser-results-chrome.json` |

### 7. 代码质量：通过，附 P3

- 投影是纯函数（见第 1 条）。卡片是 app 生命周期内的单例，`dispose` 从未被调用。这可以接受：卡片本身不持有 listener、observer 或定时器，旧按钮随 DOM 替换被回收。app.mjs 只在模块加载时创建一次 `createRunSummaryCard`，每次 rail 渲染都复用同一个 `element`，不会重复创建实例（静态核对）。
- 重绘：空闲 5 s 内卡片重建 0 次。一个流式 Run 大约持续 6 s，期间卡片被整体 `replaceChildren` 了 35 次。以人速点击（按下 150 ms 后松开）5 次都生效，披露状态也保留。这一项只记录，暂不列为缺陷。
- host 桥接：`activateSurface` 的 opener 记录条件从 `!open` 改为 `!expanded`，`setSurfaceExpanded(false)` 改为恢复 opener。这两处影响所有模块；Workspace 卡片的路径已实测正常（第 3 条）。D1 正是模块 busy 防护与这一 host 行为之间的耦合。

## 缺陷清单

| ID | 严重度 | 描述 | 最小复现 | 建议交给 |
|---|---|---|---|---|
| D1 | P2 | 卡片先禁用触发器，再发 intent。`invoke()` 的 `setBusy(true)` 早于 `callback()`（`summary-disclosure.mjs:152-168`），而 host 的 `openFile()`（`app.mjs:4033`）和 `activateSurface()`（`app.mjs:4011`）要读 `document.activeElement` 作为 opener。同步执行 focus fixup 的引擎会在禁用时移走焦点，于是 opener 被记成 `<body>`，Escape 或文档 × 之后焦点丢失。Chrome 152 把 fixup 推迟到下一次渲染，因此当前能通过；只要回调跨帧，同样会丢焦点。 | `node repro-focus-return.mjs`：Chromium 147 下文件和 Run 两条路径的 `focusAfterEscape` 都是 `BODY`；Chrome 152 下都能回到触发器（`repro-focus-return.txt`） | Astra（host 与模块边界），模块修改交 Luna |
| D2 | P2 | SHA 行把完整路径放在 label 里：`SHA-256 · ${path}`（`summary-disclosure.mjs:317`），行布局为 `grid-template-columns: minmax(0,auto) minmax(0,1fr)`（`summary-disclosure.css:45`）。长路径时 label 占满整行，值列宽 0px，64 位 hash 竖排成每行一个字符，高 1104px，卡片高约 1460px，Open in right panel 被推到下方约 1000px 处。短路径时值列也只有 69px，要折成 8 行。 | `node review-long.mjs`，结果见 `long-sha-row.txt`；截图 `screens/390-light-long-sha-row.png`、`screens/1440-dark-long-sha-row.png`，对照组 `screens/1440-light-normal-sha-row.png` | Luna（模块 CSS/DOM） |
| D3 | P3 | <1024 时 `--control` 为 44px，而 summary 是 `display:list-item`，文字贴顶：盒子 44px，文字距顶 5px，下方空 24px，焦点框和 hover 底色明显偏上。 | `screens/390-*-sheet-files.png`、`screens/720x450-light-reflow.png` | Luna |
| D4 | P3 | “Recorded files are unavailable.” 或 “No files were recorded…” 同时出现在卡头提示和 Files 展开区，内容重复。 | `screens/1440-light-netmock-missing.png`、`screens/1440-light-empty-run.png` | Luna |
| D5 | P3 | strip 阈值写死为 `480 + 2*col-gap + 288`（`app.mjs:3640`），没有使用已有的 `--rail-width` token，也没有找到对应的逐字授权。layout-ruling 要求阈值按实际列宽和内距计算。 | 静态检查 | Astra |
| D6 | P3（流程） | 分支修改了 `engineering/current.md`，不在工单列出的写权（工单目录、evidence 目录）之内；合流时可能与其他 writer 冲突。 | `git diff --name-only 67ed0fd eff0e41` | Astra |

## 待裁定

- **Q1**：生产路径只向 `projectRunSummary` 传 `generation`，因此 loading、error、unavailable、incompatible 这些卡片状态和 Retry 只在单测里出现，生产中到不了。实际行为是：对象没读到就不出卡，读取错误由 host Run 面板显示。状态表对应的几行，是按“不出卡加 host reader”视为满足，还是要求接上 adapter 读取状态，需要 Astra 裁定。
- **Q2**：本单复核要点写的是“<1024 时摘要位于 chat header 之后、正文之前”，而工单 20:01 的生产方案写的是“窄屏沿原按需 sheet”。生产实现按后者：卡片不在正文中内联。本复核按 20:01 记录判定，需要 Astra 或用户确认哪一条为准。
- **Q3**：另一客户端删除当前会话后，host 在 6 s 内没有察觉，卡片继续展示，旧 Open 仍会执行。这是 host 事实层原有的限制，模块本身无从得知，但状态表的“撤权”一行在生产中目前无法满足。
- 另外两点只作记录。第一，桌面进入会话时总会打开目录，覆盖已存的 `surfaceOpen:false`；这符合 20:01 的记录。第二，桌面打开工作面后把窗口缩到 <1024，会直接显示 modal sheet；这是 host 原有行为。

## 未能覆盖的项

- WebKit、Safari 和原生宿主：本机没有安装 Playwright WebKit，D1 在 WebKit 上的表现未验证。
- 原生 200% 缩放：只做了 720×450 等效重排。
- 真实 provider 和真实数据：按要求未运行。
- 触屏命中：390 宽度只用鼠标事件验证，没有做 touch 模拟。
- 服务端进程重启：没有测。“重启”只以页面重载验证，并确认披露状态没有持久化。
- 屏幕阅读器播报：没有测，只核对了 role 和 aria-label。

## 本目录文件

- 脚本（端口和数据目录都可通过参数设置）：`review-serve.mjs`（`REVIEW_PORT`、`REVIEW_DATA_DIR`）；`review-capture.mjs`（`REVIEW_PORT`、`REVIEW_OUT`、`REVIEW_BROWSER_CHANNEL`）；`review-host-checks.mjs`、`review-long.mjs`、`review-reload.mjs`、`review-revoke.mjs`、`repro-focus-return.mjs`。
- 运行顺序：先启动 `REVIEW_PORT=8885 REVIEW_DATA_DIR=/private/tmp/se-agent-sdr-data node review-serve.mjs`，再运行 `REVIEW_BROWSER_CHANNEL=chrome node review-capture.mjs`，最后运行其余脚本。`review-capture.mjs` 会在 normal 会话里新建一个 Run，所以要复现截图，需要每次从一个新启动的服务器开始。
- 输出：`serve-start.json` 记录合成会话和 Run 的 id；`browser-results-chrome.json` 记录每项结果，以及每张截图的 viewport、sha256 和说明。另外 3 张 `*-sha-row.png` 的 sha256 前缀分别是：`390-light-long` 为 `6625100dbc288868`，`1440-dark-long` 为 `4ee14605a6908b3b`，`1440-light-normal` 为 `de3da7a5482074bc`。
- 截图数据说明：布局矩阵中的 normal 会话截图，是在“同会话新 Run”检查之后拍的，所以显示的是 `out/second-note.txt`。

## 用户对 Q1–Q3 的裁定（引用，不另写）

用户于 2026-09-10 裁定了 Q1–Q3。裁定原文只记在整合分支 `claude/cs01-ci-bf-integration` `420370c` 的 `evidence/cs01-ci-bf-integration/README.md`（「User rulings on the review's Q1–Q3」一节），这里只作引用。按该裁定，D1、D2 修补并经非作者复验后，摘要模块可以进入有界组合接受。Q1 中尚未接线的卡片状态、Q3 的 host 同步限制仍保留，本复核结论不能用来关闭完整状态矩阵。
