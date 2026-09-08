# gaps-wk9 · WO-WK9 已绘制但无后端支撑的能力

2026-09-09，Opus。格式按 WK-27：**名称 / 语义 / 所需 API / 所在作用域**，另加"本画布如何处理"一列，说明它在 artboard 上以什么形态出现。

WK-27 的产品侧约束照旧：以下每一项在产品内只允许作为文字行出现，带 "Backend pending" 标记，**不给可交互控件**；静态样板即本目录的 artboard，不入产品。

| # | 名称（控件） | 语义 | 所需 API | 作用域 | 本画布如何处理 |
|---|---|---|---|---|---|
| G-1 | 活动热力图（Heatmap） | 按日显示已记录 run 数，灰阶单一强度轴。0 与"无数据"必须可区分。不表示专注小时、成果质量或完成率（boundaries §5） | `GET /work-activity?days=N` → `{ zone: 'UTC', days: [{ day: 'YYYY-MM-DD', runCount: number }] }`。日界由服务端按 UTC 切分并显式声明；前端不重切日界。现状全仓无跨会话 run 列表端点，逐会话 `GET /sessions/:id` 是 N+1 且 `latestRun` 每会话只有一条（EX-WK5 §1 末行） | Home 上带（band 1），全部项目或单项目 | 三块 Home 板的上带底部一行："**Activity** Planned · Backend pending — daily recorded-run counts need `GET /work-activity?days=N`"。`presentation-primitives.d.ts` 已冻结 `HeatmapInput` 与 `toHeatmap` 签名，标注 `gap: needs GET /work-activity` |
| G-2 | 多文档 tab 条 | 在展开的工作面内同时打开多个文档并在它们之间切换。与现有三 kind tablist 是两件事：现有 `#surface-tabs` 是 workspace / run / file 的固定单选表，`state.surface.kind` / `runId` / `fileRef` 均为单值（EX-WK5 §3） | 前端状态契约先行：需要一个可堆叠的打开文档列表（身份 = sessionId + path + kind + runId + sha256）、其上限、驱逐策略与 Escape 次序中的位置。服务端侧无新增端点即可满足读取，但 `renderSurfaceVisibility` / `handleSurfaceEscape` 的单值假设须先改（app.mjs:2782-2861、4171-4238） | 工作页展开态的 tablist 行 | `work-expanded-1440` 的 tablist 右端一行："**Document tabs** Planned · Backend and state pending"。三 kind tab 照现状绘制，未改 kind 静态映射、renderer 身份或 Escape 次序 |
| G-3 | "今日"口径的时间窗口指标 | 参考图的 Today 四格要求"今天"的计数。work-summary 三集合是当下快照，没有任何"今日"过滤字段；按 `createdAt` 前端再筛既无 timezone 保证，也筛不到同会话当日的更早 run（EX-WK5 §1、§3） | 两条路径任选其一：(a) work-summary 增加显式时间窗口参数并在响应里声明日界时区；(b) G-1 的 `/work-activity` 兼供当日计数。无论哪条，端点必须声明日界时区，不能让前端推断 | Home 上带三个 StatTile 的时间窗口 | 三个 StatTile 的窗口改为"当前"，caption 逐字写出范围与窗口（"…every project, right now."）。`TimeWindow` 类型里 `{ kind: 'day' }` 分支已留出并注明需 G-3 先成立 |
| G-4 | shell 条内的 Back / Forward | WK-30 规定 52 px shell 条上依次为侧栏开合、后退、前进。产品既有的 Lucide 受信子集（`app/web/vendor/icons.svg`）只有 `arrow-up` / `arrow-down` / `chevron-*`，没有可用于导航后退/前进的左右箭头 | 无需后端。需要向受信 SVG 子集新增两枚同族图标并按 IC-2 逐项进入 STATIC allowlist（固定版本、LICENSE、来源 SHA）；另需前端导航历史栈本身（当前无） | `home-shell-1440` 的 shell 条 | shell 条上只画侧栏开合按钮，后退/前进位置留一行灰字 "Back / Forward — gap G-4"，不画无图标的假按钮 |
| G-5 | shell 条的两种读法 | Fable 的构图简报写"52 px 的惰性 shell 条"，WK-30 写"其后依次为侧栏开合、后退 / 前进"，两者对"条内是否有控件"的规定不一致 | 无需 API。需要一次裁定：整条惰性（仅拖拽），还是仅左 80 × 52 惰性、其后可放窗口级控件 | `home-shell-1440` | 按更具体的 WK-30 绘制（左 80 px 惰性留位 + 侧栏开合），本行登记差异待裁；若裁定整条惰性，删掉该按钮即可，不影响其余布局 |
| G-6 | 展开态内容列宽 | 展开工作面后，内容列仍受编排体例的 740 px 上限约束，1440 下面板两侧各余约 325 px。文件树/长路径是否值得列宽例外 | 无需 API。属编排体例（`ui-composition-standard.md` "页面"行）的例外裁定 | 工作页展开态面板 | 按现行 740 上限绘制；`clean-evaluation.md` §6 记录该取舍，未自行开例外 |
| G-7 | 品牌符号的宿主取色 | WK-38 要求两层取色目标为宿主 token（actor = `--ink`，record = `--muted-strong`）。`brand/src/symbol.mjs` 目前在 shadow root 内硬编码 `--cw-ink` / `--cw-record` 两组灰，宿主无法覆盖，且带蓝倾向 | 无需后端。品牌包需接受宿主 CSS 变量覆写（已向 Astra 登记 `brand-requests.md` BR-1） | 侧栏 wordmark 20、会话 header 在场标记 16 | artboard 内联 `renderSymbol(..., material:'hierarchical')` 的浅深两份输出并随主题切换，取色仍为包内值；`board.js` 头部注明这是 BR-1 落地前的临时办法，产品内保持 `<court-symbol>` 自定义元素 |

## 不属于 gap 的排除项

以下元素在参考图里出现，但**不是**缺后端，而是无语义或违反已裁定规则，因此不登记为 gap、也不在产品内留"Planned"位（详表见 `clean-evaluation.md` §5）：Progress 步骤与任何百分比（schema 无 step/stage 字段，属新发明语义，WK-16）、Context 卡的 "links"（无字段概念）、日历事件与专注小时（boundaries §5：真实数据源未成立）、"Focus mode"、吉祥物与装饰插画、彩色状态胶囊、蓝系强调、"edited 2h ago" 一类相对时间。

## r2 更新（2026-09-09，WK-46 消费后）

| # | r2 状态 | 说明 |
|---|---|---|
| G-1 | **仍未决** | 三块 Home 板的上带底部仍是一行 "**Activity** Planned · Backend pending"，位置随 WK-42 的带下移，文字未改。WK-46 (5) 已转交 Astra 作后端 gap |
| G-2 | **仍未决** | 多文档 tab 的 gap 行从 tablist 右端移到展开面内容列末尾——tab 条现在落在顶部带内（WK-42），带内放不下一行虚线说明，且带是宿主控件区，不陈述"计划中的能力"。文字加长为一句完整事实（现有 tab 条 = 三个固定 kind；同时打开多个文档需要可堆叠的 open-document 列表）。WK-46 (5) 已转交 Astra |
| G-3 | **仍未决** | StatTile 的"当前"口径与 caption 未改。WK-46 (5) 已转交 Astra |
| G-4 | **已解决（不再是 gap）** | WK-46 (3) 作废了 WK-30 里"其后依次为侧栏开合、后退 / 前进"一句：应用无历史导航，不画 Back / Forward，也就不需要向受信子集新增左右箭头。`home-shell-1440` 的 shell 条内已无任何按钮与灰字 |
| G-5 | **已解决** | WK-46 (3) 裁定整条惰性。r2 把 shell 条从侧栏内提到横贯整窗（`.window > .shell-strip`），只保留左 80 px 红绿灯留位；侧栏开合留在 wordmark 行。这样带下沿在三栏上仍是一条线，`--band-top` 在壳内改写为 52，合 WK-42 的"52 + shell 条" |
| G-6 | **已解决** | WK-46 (4) 开出例外：展开面的 Workspace / File 两个 tab 用 960（`.tabpanel-inner--wide`），散文与 Run tab 仍 740。`work-expanded-1440` 已按此绘制并在板内注明用途 |
| G-7 | **仍未决** | 品牌符号取色仍待 BR-1；`board.js` 继续内联浅深两份 `renderSymbol` 输出 |

r2 新登记一条不构成 gap 的图标缺口，记在 `clean-evaluation.md` §8.4：受信 Lucide 子集里没有可表达"连接"的字形，WK-40 要求的 icon-only 连接徽标因此沿用 composer context 行的在场圆点；若要专用字形，须按 IC-2 新增并锁版本，属图标体例而非后端能力。
