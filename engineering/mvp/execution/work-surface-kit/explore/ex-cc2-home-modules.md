# EX-CC2 · Home 现状量测与六模块数据接缝（CC-D0 前置）

状态：直接可消费。Sonnet，只读 explore，2026-09-09。

只读声明：本卷全程只读 `<isolated-checkout>`（Courtwork 文档支，main `386fbc6` + 文档提交至 `00e33f9`）。未修改任何产品代码、未执行任何状态变更类 git 命令、未启动任何服务、未读取任何凭据文件。仓内 `app/` 源码对应的最近一次产品提交是 `24c6eaa`（FE-01，"feat(web): product vocabulary, Settings IA, chrome and Home composition"）；FE-02/FE-03 已在别处交付但均未触及 Home 渲染路径（见 §0 说明），本卷据此认为读到的 Home 实现即为 FE-03 之后的当前状态。

## 0. 版本核对

- `git log -1`：`00e33f9`（"docs: WK-109 FE-03 review, BE-23; WK-110 shell-refinement ruling and queue"）。
- `git log -1 -- app/web/home-view.mjs`：`24c6eaa`；`git log -1 -- app/web/styles.css`：同上。FE-02（`4d9714e` 合流）与 FE-03（分支 `fabfd22`，尚未合入本文档支所在的 main 线）均只动 Settings › Models / Chat-Work chrome，未见 `home-view.mjs`/Home 相关 CSS 改动（intake-round-3.md:120-149 的 WK-105/107/109 条目未提及 Home 文件）。因此本卷读到的 `app/web/home-view.mjs`、`presentation-adapters.mjs`、`app.mjs` Home 段、`styles.css` Home 段即为今天的实际状态。
- 仓根 `evidence/fe03/` 不存在于本文档支（FE-03 未合流到此树的 `app/`）；本卷改用 `evidence/fe02-main-integration-20260909/`（同一套 `composition-checks.mjs`/`.json`/截图，Home 断言与 FE-01 交付页 §4.1 一致，且 FE-03 未改 Home，两者应等价）。此为一处**未核实项**：未能在本树内直接跑一次 FE-03 合流后的 Home 回归，只能确认 FE-03 的改动范围文档记录不含 Home 文件。

---

## 1. 现状量测

全部数值来自 `evidence/fe02-main-integration-20260909/composition-checks.json`（脚本 `composition-checks.mjs`，CDP 实测，1440×900 与 390×844，light + reduced-motion）与对应两张截图；**未使用任何生成图的像素距离**。

| 量测项 | 数值（file:line） | 说明 |
|---|---|---|
| composer 中心相对主区高度比例 | `HOME-1` 实测 `0.56`（阈值 `0.55`），`evidence/fe02-main-integration-20260909/composition-checks.json` HOME-1 节；算法定义在 `app/web/app.mjs:3178`（`HOME_COMPOSER_CENTRE = 0.56`）与 `:3179-3199`（`measureHomeLead()`） | 与 WK-96 的"composer 中心不低于主区高 55%"裁定（`intake-round-3.md:89`）一致；`0.56` 是脚本目标常量，不是"待验初值"，是已实现值 |
| composer 上方非 chrome 内容高度 | `HOME-2` 实测 `38px`（阈值 ≤180），json 同上 | 即 orientation 一句话（"Work that exists beyond the model."）+ 其与 composer 的间距；见 `home-1440-light.png` |
| orientation 块高度与是否含数字 | `HOME-3` 实测 `38px`，`!/\d/.test(introText)` 通过 | `app/web/styles.css:3068-3083`（`.home-composer-intro` `max-height:120px`） |
| composer 宽度 | `HOME-4` 实测 `820px`（阈值 760–880） | `--home-column: 820px`，`app/web/styles.css:279` |
| composer 输入本体初始高 | `HOME-5` 实测 `96px`（阈值 92–112） | `app/web/styles.css:3086`（`.home-active #composer-input { min-height: 96px; max-height: 160px; }`） |
| 首屏下半部有可读续接内容 | `HOME-6` 通过 | `composition-checks.mjs:130` |
| Today strip：三个 tile、composer 之下、无 Planned/热力图行、无"Backend pending"文案 | `HOME-7` 通过（`stats:3, planned:0, backendPendingOnHome:false`） | 断言脚本 `composition-checks.mjs:131-143`；渲染代码 `app/web/home-view.mjs:91-158`（`renderHomeBand`），CSS `app/web/styles.css:3106-3187`（`.home-top-band`/`.stat-row`/`.home-stat`） |
| 390 宽窄屏：composer 沉底、DOM 序为 modules → composer | `HOME-narrow-dock` 通过（`order.at(-1) === "composer-area"`） | DOM 重排逻辑 `app/web/app.mjs:3016-3024`；390 截图 `home-390-light.png` 显示 Today strip 与列表在上、composer 固定在下 |
| `--home-column` 820 与阅读列 `--column` 740 的关系 | `--home-column: 820px`（`styles.css:279`），`--column: 740px`（`styles.css:272`） | 二者是两个不同 token：Home 的 composer/模块用 820（略宽于阅读列，WK-94/96 裁定原文见 `styles.css:274-276` 注释），Work 阅读列沿用 740。当前 Home 未使用 `--column`（`grep` 结果只在 `.home-start-status` 用到 `var(--column)`，`styles.css:3099`，属遗留一行，与主体几何无关） |
| 主区外边距 / 模块 gap / 卡内边距（今日实际 token） | `--page-gutter: 24px`（`styles.css:271`）；`.home-top-band` 用 `padding: var(--space-8) var(--page-gutter) 0`（`styles.css:3107`，即 32px 24px）；`.stat-row { gap: var(--space-4) }`＝16px（`styles.css:3126`）；`.home-card { padding: var(--card-padding) }`＝20px（`styles.css:3233`，`--card-padding:20px` 定义于 `:273`） | 见 §2 逐项对照 |

**当前 Home 完全没有热力图元素。** `home-view.mjs` 全文（465 行）无 `heatmap`/`Activity by day` 字样；`styles.css` 全文 `grep heatmap` 零命中；WK-13 时代的"一行 Activity by day … Backend pending"占位已在 FE-01 删除（`home-view.mjs:1-9` 文件头注释明确："The three recorded totals are no longer a band above the composer"；WK-94 裁定原文引自 `home-view.mjs:88-90` 注释）。这与 `composition-checks.mjs:134`（`plannedRows === 0`）、`:135`（`plannedText === false`）互相印证。

截图交叉核对：`evidence/fe02-main-integration-20260909/home-1440-light.png` 显示 orientation 一行 → composer（含 Project / Ask before editing / Send）→ "Today" 三个数字（Waiting for you 1 / In progress 4 / Needs a look 1）→ "Waiting for you" 列表首屏切出；`home-390-light.png` 显示窄屏下 Today 两行网格 → 列表 → composer 固定底部。两张图均未使用其像素距离作为尺寸依据，只作结构确认。

---

## 2. 设计初值对照（shell-refinement.md §"呼吸感"）

对照表来自 `engineering/design/clean-cool-2026-09-09/shell-refinement.md:89-96`（呼吸感表）与 `:30-37`（首页模块退为辅助段）。

| 设计初值 | 今日实况 | 判定 |
|---|---|---|
| 热力图 280–360px（宽）× 96–140px（高，含标题） | 不存在任何热力图元素（§1） | **无对应实现，非冲突**——今天没有东西可比对；一旦按此初值加回一个模块，会落在 composer **之下**的模块带，见下方分析 |
| 模块 gap 20–24px（`shell-refinement.md:93`） | `.stat-row { gap: var(--space-4) }` = 16px（`styles.css:3126`）；`.home-section { margin-top: var(--space-8) }` = 32px（`styles.css:3296-3297`，即 Today 与下方 section 之间、以及 section 之间） | **冲突**：tile 间 16px 小于建议下限 20px；但 section 间 32px 又高于建议上限 24px。两者是不同粒度（tile-to-tile vs section-to-section），设计初值未区分，需要 Fable 决定这条 20–24 是指哪一级间距 |
| 卡内 20–24px | `.home-card { padding: var(--card-padding) }`＝20px（`styles.css:3233`，token `--card-padding:20px` 于 `:273`） | **满足**（落在区间下限） |
| 主区外边距 24–40px | `.home-top-band { padding: var(--space-8) var(--page-gutter) 0 }`＝32px 24px（`styles.css:3107`）；`--page-gutter:24px`（`:271`） | **满足**（左右 24px 落在区间下限，顶部 32px 落在区间内） |
| "composer 保持首页最强锚点……不让统计成为视觉主角"（`shell-refinement.md:32`） | 今日 Today strip 三个数字用 `calc(20px * var(--text-scale))`（`styles.css:3166`，即 20px 起）大于正文 14px，但仍小于 orientation 标题 `clamp(26px,2.2vw,32px)`（`styles.css:3080`）；且 Today strip 整段在 composer **之下**，DOM 序由 `app.mjs:3016-3024` 固定 | **满足**（composer 视觉权重仍最高，统计未越位） |
| "composer 不会被热力图挤出首屏、挤窄或夺取首屏中心" | 见下方"1440 首屏推演" | **结构性不会冲突**，见下 |

### composer 是否会被挤出 55%/首屏——按视口高 900 与 1058 分别推演

`measureHomeLead()`（`app.mjs:3179-3199`）用的 `area` 是 `#conversation-body` 的 `getBoundingClientRect()`——一个 `overflow:auto` 的**可视**容器（`styles.css:3020`：`.home-active .conversation-body { overflow: auto; min-height: 100%; }`），其高度等于视口减去顶部 chrome（`--band-top:56px`，`styles.css:284`），**不随下方内容多少变化**（`scrollHeight` 会变，`getBoundingClientRect().height` 不会）。算法只用当前 `--home-lead`（composer 上方留白）迭代逼近 `0.56 × area.height`，与 composer **下方**放了多少模块无关——因为 `box`（composer-form 本体）的位置只取决于它自己上方的 margin，不取决于它下方兄弟节点的高度。

结论：**只要新模块（热力图等）像 WK-96/FE-01 现状一样放在 composer 之后的模块带里，就不可能把 composer 挤出 55% 或挤出首屏中心**——这个风险只会在有人把模块重新塞回 composer **之上**（回到 WK-13 时代"上带"的做法）时才会发生，而当前实现（`app.mjs:3011-3024` 的 DOM 重排逻辑）结构性地不允许这种情况：`band.hidden=!home`、`composer.after(band)`（`:3019`）把模块带钉死在 composer 之后。

viewport 900 vs 1058：由于该算法按比例（`0.56 × area.height`）而非固定像素计算留白，1058 高的视口只会让 `--home-lead` 变大、composer 绝对像素位置更靠下，不改变比例本身。这条是**从源码逻辑推出的结论，非本卷实测**（本卷只有 900 与 844 两档 CDP 实测数据，见 §1），标记为待验——若 Fable 要收敛这条，需要新增一组 1058 视口的 `composition-checks` 运行。

真正需要 Fable 裁决的是**内容量**问题，不是"composer 被挤"问题：加入热力图后，Today strip + 热力图 + 至少一条列表是否还能让 `HOME-6`（首屏下半部必须有可见续接内容）在 900px 视口下继续通过——这需要热力图实际组件做出来后重跑 `composition-checks.mjs` 才能确认，本卷不能用生成图的距离代替。

---

## 3. 模块 × 数据接缝表

六个模块的判定逐项列 file:line；「诚实可显状态」按 `shell-refinement.md:81`（"loading、ready、empty、not connected、unavailable/error、stale"）逐项打勾。

### Attention

- **后端事实**：有。`GET /api/v5/work-summary` → `pendingItems`（问答/授权待办，字段 `{projectId,sessionId,runId,questionId,kind,createdAt,label}`，`app/server/work-summary.mjs:40-49`）与 `inspectionCandidates`（失败/unknown，字段 `{projectId,sessionId,runId,status,startedAt,endedAt,errorCode,resultAt}`，`work-summary.mjs:34-35`）。路由 `app/server/index.mjs:101`；契约文档 `app/docs/work-summary-api.md:44-62`。
- **可诚实显示的状态**：loading（`home-view.mjs:395-398` 已有"Loading your workspace…"）、ready（有数据即渲染行）、empty（`emptyLabels` 逐集合一句话，`home-view.mjs:39-43`）、not connected/unavailable（`home-view.mjs:365-394` 的 `connection-line` 分支，一行状态 + Retry + disclosure）。**stale 未实现**：`renderHomeBand` 只在 `load.error` 为真时才显示"Last confirmed …"（`home-view.mjs:150-156`），没有"数据仍是上次确认值但读取已经在重试"这种中间态的独立文案。
- **缺的契约（BE-24）**：`work-summary` 的三集合是**当前快照**的完整投影（`work-summary.mjs` 逐 session/run/question 遍历，`app/docs/work-summary-api.md:24-25`：无隐藏上限），但没有"是否存在未被本次同步扫描覆盖的待办"这一覆盖率信号——一旦 Fable 想在 Attention 模块里说"这是全部待办"，需要后端明确背书。**BE-24 草案**：为 `work-summary` 增加一个显式的覆盖率字段（如 `coverage: "complete"`），供前端区分"这是全部待办"与"这只是能看到的一部分"，避免 Attention 模块隐含承诺自己没有的完整性（对应 `shell-refinement.md:74` 的"不能声称该清单覆盖所有工作未决项"）。

### Activity / 热力图

- **后端事实**：**无**。全仓无跨会话"全部 run"端点（`app/server/index.mjs:88-131` 路由表未提供）；`store.listRuns()` 只服务端内部调用（`app/server/service.mjs:170,261,717`），未路由到 HTTP。`sessionCandidates.latestRun` 每会话只折叠出一条最新 run（`work-summary.mjs:37-38`），无法精确统计"今日 run 数"。
- **时间桶今天从哪来**：不存在。已登记的 `BE-1`（`GET /work-activity?days=N`：按日 UTC 日界返回 recorded run 计数，`backend-requests.md:5`）与 `BE-3`（"今日"口径的过滤字段与时区声明，`backend-requests.md:6`）**均未实现**——这两条是本卷复核的既有请求，不是本卷新发现。全部时间字段目前都是 `new Date().toISOString()`（`app/server/store.mjs:25`）产生的 UTC ISO 字符串，系统内无任何显式时区元数据；前端一律靠 `Date`/`toLocaleString()` 隐式按浏览器本地时区显示（例：`app/web/inspector.mjs` 的时间格式化，`home-view.mjs:62-71` 的 `stamp()`）。
- **去重**：不适用——没有按日聚合的端点就没有"按日去重"这回事；`work-summary` 三集合层面的去重规则是"分页下用 source ID 去重、从 offset 0 重新读取以对齐"（`app/docs/work-summary-api.md:26-27`），这是分页一致性去重，不是按日计数去重，两者不能互相替代。
- **可诚实显示的状态**：今天只能是 **unavailable**（"Backend pending"式一句话）或**不安装**。`shell-refinement.md:75` 已经点名"空白桶可表示无数据；unknown／缺覆盖不能显示0"——这条约束在没有端点的情况下无法验证，只能先不做格子。
- **缺的契约（BE-25）**：`BE-1`/`BE-3` 已登记但未落地；本卷额外指出这两条目前**没有去重/并发一致性说明**（类比 `work-summary` 分页的 offset-0 重读规则）。**BE-25 草案**：`GET /work-activity` 落地时需附带并发写入下的去重规则（例如按 run id 去重而非按计数增量），并显式回答"某天 0 格"与"某天数据未覆盖/未知"两种桶如何在响应里区分（不能都编码成数字 0）。

### Mail

- **后端事实**：**无**。全仓 `grep -rniE "\bmail\b|\binbox\b"` 只命中 `home-view.mjs:90` 的注释原文引用与图标库清单（`app/web/vendor/LICENSES.txt`），没有任何路由、service 方法或 adapter 骨架。
- **可诚实显示的状态**：今天只能是 **not connected**（无法伪造"未连接"以外的任何状态，`shell-refinement.md:76`："未连接与空收件箱不同；没有连接不展示虚构邮件"）。**不安装是唯一诚实选项**，因为 not connected 与 empty 无法区分（没有一个可查询的"是否已连接"字段）。
- **缺的契约（BE-26）**：**BE-26 草案**：邮件只读来源 adapter 的最小契约——账户身份、连接状态字段（connected / not_connected / error）、`lastRefreshedAt`、最近 1–2 条摘要（标题/发件人/时间，不含正文）与一个深链 URL；无此契约前 Home 不应安装 Mail 模块位。

### Calendar

- **后端事实**：**无**。同上 grep 结果，`\bcalendar\b` 只命中图标清单（`app/web/vendor/LICENSES.txt:345`，纯 SVG 图标名列表）与 `home-view.mjs:90` 的注释引用。
- **可诚实显示的状态**：与 Mail 同理，今天只能是 **not connected**；"今天无安排"这句话在没有连接判定字段的情况下无法诚实说出（`shell-refinement.md:77`："未连接不画'今天无安排'"）。
- **缺的契约（BE-27）**：**BE-27 草案**：日历只读来源 adapter 的最小契约——时区来源（谁的时区：账户设置还是浏览器）、全天事件的边界定义、连接状态字段与 `lastRefreshedAt`；无此契约前 Home 不应安装 Calendar 模块位。

### Models

- **后端事实**：有，但只是"当前一条连接"的快照。`GET /api/v5/provider-config` → `service.getProviderConfig()`（`app/server/service.mjs:558-565`）返回 `{config: publicProviderConfig(...), execution:{mode, realProvider, adapterId}, credentialStatus: "configured"|"not_configured"}`；路由 `app/server/index.mjs:136`。前端已经在加载并使用这份数据（`app/web/app.mjs:1618-1622` `loadProviderConfig()`；渲染于 composer 底部的 `#model-settings-button`，`app.mjs:3026-3035`），只是尚未作为 Home 模块行呈现。
- **可诚实显示的状态**：ready（有 `config`）、not connected/unavailable（`credentialStatus: "not_configured"`，或 `loadProviderConfig()` 请求失败时走全局 `connectionLost` 状态机，`app.mjs:135,1038-1039`）。**stale 无法诚实显示**：`provider-config` 响应不带任何"最近一次验证成功时间"字段（`getProviderConfig()` 的返回对象里没有时间戳，`service.mjs:558-565`），今天说不出"这条连接上次确认可用是什么时候"。
- **缺的契约（BE-28）**：**BE-28 草案**：`provider-config`（或 `runtime-info`）增加一个连接健康时间戳（如 `lastVerifiedAt` 或复用 BE-17/18 的探测结果时间），使 Models 摘要能诚实呈现 stale 状态，而不是永远只有 ready/not-configured 两态。（此条与已登记的 `BE-21` 连接注册表不重复——BE-21 是"多条连接各自身份"的结构问题，BE-28 是"单条连接的新鲜度"问题。）

### Usage

- **后端事实**：有，但**只到单个 run 粒度，无聚合端点**。`run.usage = { input, output, cacheRead, cacheWrite, turns, missing }`（校验 `app/server/store.mjs:85-93`；写入 `store.mjs:463-467`；文档 `app/docs/api-v6.md:164-167`）。读取只能经 `GET /api/v5/runs/:id`（`app/docs/api-v6.md:148`），逐 run 单独取，无跨 run/跨会话汇总端点。
- **今天记录的是 characters 还是 tokens**：**tokens**，且是 provider 原生上报的 token（非前端估算的字符数）。数据来源 `app/runtime/pi-session-runtime.mjs:247`（`addUsage(counters, event.message.usage)`）与 `:265-266`（`event.result?.usage`），字段名 `input/output/cacheRead/cacheWrite` 对应 `app/docs/runtime-foundation.md:153`引用的 OpenAI prompt caching token 概念；`missing:true` 表示"这次核算不完整"而非"零用量"（`app/docs/api-v6.md:165-166`："`missing: true` 意味着核算不完整，不是零"）。全仓未出现 `characters` 作为用量单位的任何字段。
- **可诚实显示的状态**：单 run 层面可以做到 ready（`missing:false` 时的确切数字）与 "at least N"（`missing:true` 时，`inspector.mjs` 已有此措辞先例，`delivery-wk13.md:189` 提及"`At least` 下限措辞"）。**跨会话/跨时间段的 Usage 摘要今天完全做不到**——没有聚合端点，逐 run 拉取属 N+1，且 `work-summary.sessionCandidates.items` 的 `latestRun` 字段不含 usage（`work-summary.mjs:37-38` 的 `runFields` 只有 `runId/status/startedAt/endedAt`，见 `work-summary.mjs:7`）。
- **缺的契约（BE-29）**：**BE-29 草案**：一个跨 run/会话的 usage 聚合端点，明确输入/输出/缓存 token 分列、计费来源（是否等于账单）、统计区间与时区，并为"未上报"（对应现有 `missing`）给出聚合层面的"Not reported"语义（呼应 `shell-refinement.md:79`）——在此之前 Usage 模块只能不安装，不能用单 run 数字冒充"总用量"。

---

## 4. CC-D0 可施工范围建议

**只用今天已有的读取**（`work-summary`、`provider-config`；`runtime-info` 目前不含 Home 需要的字段，见下）能做出的一版：

- **Home shell + 显隐预置**：复用现有 `home-view.mjs`/`app.mjs` 的三带 DOM 结构（`app.mjs:3011-3025`），把"是否显示某个模块位"做成纯前端布尔集合，不新建任何后端。存储位置见下。
- **Attention**：直接可做。现有 `pendingItems`/`inspectionCandidates` 已经是 Today strip 的"Waiting for you"/"Needs a look"两块（`home-view.mjs:33-37` `setLabels`），shell-refinement 的"Attention"概念与现有这两个集合**是同一件事的不同命名**——这是一个需要 Fable 裁决的命名冲突（见 §5 第 4 条），不是数据缺口。
- **Models 摘要**：可做，且是**零新增读取**——`state.providerConfig` 已经在全局加载（`app.mjs:1618-1622`），今天只用于渲染 composer 底部的模型 chip（`app.mjs:3026-3035`）；把同一份已加载的数据多渲染一行到 Home 模块列表，不产生第二个真源，只是同一数据的第二处展示位（需要 Fable 确认是否愿意"同一事实出现两处"，见 §5 第 5 条）。
- **Activity / Usage / Mail / Calendar**：今天**只能给诚实空态或不安装**。四者共同点是：没有一个字段能回答"是否已连接/是否有数据源"这个最基本的问题（Activity 连查询端点都没有；Mail/Calendar 连 adapter 骨架都没有；Usage 没有聚合端点）。按 `shell-refinement.md:81`（"缺少接缝时提供诚实空态或不安装该模块"）与 `home-view.mjs` 已经确立的先例（`connection-line` 只在真正读取失败时出现，而不是替所有未知状态画一个通用空卡），**建议直接不安装**这四个模块位，而不是渲染一张通用的"Coming soon"空卡——因为"渲染一张空卡"本身需要决定它长什么样、占多少 gap，这是一个新的视觉决定，不是"零后端读取"能推出的东西。

**模块显隐存哪里**：对照 FE-01/02 先例——

- 已有的纯 UI 偏好（非数据事实）走 `localStorage`：`UI_STORAGE_KEY = "schema-engineering.ui.v6"`（`app.mjs:64`，存 `activeProjectId`/`activeSessionId` 等选择状态，`app.mjs:233-260`）；另一条独立的偏好通道是 `cw:prefs:<hash(origin)>`（`app/web/index.html:26,67-68`），今天已经装着 Appearance 的 `scheme`/`textSize`/`motion`/`skin`/`codeFont`（`app/web/settings-view.mjs:1030-1067`）。
- `WK-107 ②` 的裁定边界是："连接属性"（数据事实）不能存本地偏好，否则是第二真源（`intake-round-3.md:132`）；但**模块显隐是纯展示偏好**，与 Appearance 的 `motion`/`skin` 同类，不涉及任何后端拥有的事实，落在 `cw:prefs` 这条已有通道里不违反该裁定。
- 建议：在 `PREFERENCE_DEFAULTS`（`settings-view.mjs:1030`）旁新增一个 `homeModules` 字段（各模块 id → 布尔），复用 `readPreferences`/`writePreferences`（`settings-view.mjs:1045-1067`），不新建第二套存储机制。

---

## 5. 待裁定清单

1. **"Attention"命名 vs 现有 Today strip 三分（Waiting for you / In progress / Needs a look）是否合并**——不合并：两套名字同屏共存违反 copy-convention §3（同一事实两种说法）；合并：需要重新设计 Today strip 的视觉与筛选交互（今天 tile 是可点筛选控件，`home-view.mjs:105-138`），改动面比命名本身大。
2. **模块化 Home 的入口形态**——默认展示：新用户首屏立刻更"重"，但发现性最好；用户显式开关（Settings 一行）：首屏保持现有简洁版不受影响，但模块化版本可能长期零曝光。WK-110(d) 已裁"不替代默认简洁 Home"，但没有裁"如何被看到"。
3. **热力图落地前，Activity 模块位是否放一个占位/说明行**——放：首屏预留位置，未来加数据时不用重新量布局；不放：避免用户点开一个永远"Backend pending"的死模块，且不产生"渲染空卡长什么样"这个新视觉决定（§4 已建议不放）。
4. **0.56（WK-96 的"55%或更下"）是否要因模块内容变多而调整**——不调：算法与模块数量解耦（本卷 §2 已证明结构上不冲突），维持现状最省事；调：如果 Fable 认为"composer 下面东西太多会让整体页面观感偏挤"，可能想收紧到更低比例给下方更多首屏空间，但这是审美判断非几何冲突。
5. **Models 摘要是否与 composer 底部的模型 chip 重复展示**——重复展示：两处都能看到同一件事，用户在模块列表和 composer 分别确认一次；只留 composer chip：不新增模块位，Models 在 CC-D0 里就只剩"跳转到 Settings 的入口"而非真正的信息模块。
6. **模块显隐偏好走 Tier S（跨设备同步）还是纯本设备 `cw:prefs`**——纯本设备：实现最简单，与 Appearance 偏好同级（本卷 §4 建议方案）；Tier S：如果 Fable 认定"我在哪台设备上都想看到一样的 Home 布局"是核心体验，需要新的同步机制，超出 CC-D0 范围。
7. **Attention 的�covery率信号（BE-24）是否值得为了一句"不完整披露"专门开一条后端请求**——开：为诚实性买保险，成本是一个新字段；不开：先在文案里加一句"仅显示这次同步命中的待办"作为免责声明，不动后端，等真正出现"用户抱怨列表漏项"再补。

**待裁定条数：7。**

---

## 6. 不做（复述边界，未越界确认）

本卷未提出任何新色彩、新字体或新依赖；§1/§2 的全部尺寸取自 CSS token 与 `composition-checks.json` 实测值，未使用 `home-modular.png` 等生成图的像素距离；§3 逐模块判断均标注"无后端事实"或给出具体 file:line，未宣称任何 Mail/Calendar/Activity/Usage 聚合能力已存在；截图仅用于确认 DOM 结构顺序，未把图中数字（如"4"个 In progress）当作产品数据引用。
