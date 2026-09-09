# 交付 WO-WK13 · Home 三带、表示原语 adapter 与键盘导航（Claude Opus，2026-09-08）

工单 [WO-WK13](work-orders/WO-WK13-home-bands.md)。裁定来源：WK-4 / 27 / 32 / 34 / 36 / 37 / 46 / 47 / 51 / 56 / 59 / 76 / 79 / 80 / 85(2)、DC-1 / DC-2 / DC-3、[review-projection §2 / §6](contracts/review-projection.md)、[presentation-primitives.d.ts](contracts/presentation-primitives.d.ts)、[frontend-layering-spec](../../../design/frontend-layering-spec.md) FN-04 / 05 / 17 / 22 / 23 / 27 / 28、[copy-convention](../../../design/copy-convention.md)、[gaps-wk9](design/wk9/gaps-wk9.md) G-1 / G-3、[EX-WK5](explore/ex-wk5-home-work-data.md)、[EX-WK7 §2–§3](explore/ex-wk7-frontend-consumption-diff.md)。

## 1. 固定 SHA 与工作条件

| 项 | 值 |
|---|---|
| 基线 | `b7fa5e27d013886250c04af07dc40523bd8bd67f`（清洁 `main`，含 WK10b 第一段 + 第二段） |
| 工作树 | `<isolated-checkout>` |
| 分支 | `claude/wk13-home`（未 push） |
| 实现 SHA | 见本轮提交（本文件与代码同提交） |
| 服务端口 | 8875（rows）、8876（empty）、8877（truncate） |
| 数据目录 | `/private/tmp/se-agent-wk13-data{,-empty,-trunc}`（全新、仓外、fake provider，无真实 provider、未读取任何凭据） |
| CDP 端口 | 19671–19677 |
| 运行时 | Node v25.9.0、npm 11.12.1；headless Google Chrome 经 CDP |

未触及：`app/server/**`（见 §8 allowlist 请求与 §9 回退记录）、`app/runtime/**`、`app/core/**`、`app/domains/**`、`app/extensions/**`、`brand/**`、`PAPER.md`、HTTP 契约、`runtime-view.mjs`（WK11）、`settings-view.mjs`（WK12）。

## 2. 受影响文件

| 文件 | 改动 |
|---|---|
| `app/web/presentation-adapters.mjs` | **新建**。`toStatTiles` / `toWorkCards` 按契约签名；另加 `toPendingRows` / `toInspectionRows` 两个提案形状（§4） |
| `app/web/home-view.mjs` | 重写。新增 `renderHomeBand`（上带）与 `homeSets` 导出；下带三集合、行 / 卡两态、筛选、分页 / 错误 / 空态分句、焦点保持 |
| `app/web/app.mjs` | 三带 DOM 次序与 `#home-top-band` 的 `hidden`；`state.home.filter`；`renderHomeState` 经 adapter 渲染两带；列表键盘 `handleListKeys` / `openListItem`；待处理卡加 `data-nav-item`；绑定面按数据排序（`existingProjectWork` + `continueExistingSegment` 改签名） |
| `app/web/index.html` | 新增 `#home-top-band`（`<section aria-label="Recorded totals" hidden>`），置于 `#conversation-body` 首位 |
| `app/web/styles.css` | 新增三带一节（上带、tile、planned 行、卡态、筛选行、390 两行）；状态词着色由「集合」改为「状态」 |
| `app/tests/presentation-adapters.test.mjs` | **新建**，7 条，只覆盖新行为（adapter 的口径契约） |
| `docs/ui-composition.md` | Home 行改三带；`:21` 三栏改 WK-72 主区 + 悬浮工作面；768–1023 / <768 两行的 `Inspector` 用词同步 |
| `docs/interface-components.md` | 新增「Home 的三带」与「一套列表键盘」两段 |
| `engineering/mvp/execution/work-surface-kit/evidence/wk13/**` | 本轮脚本、JSON 与同条件截图 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §5 增量入口一行（表在本文件 §6） |

## 3. 三带落地

**几何（1440 × 900，浅 / 深两宗测得同值）**：上带 155 px（≤ 160 ✓）、composer 带 395 px、下带首屏可见 294 px。WK-46 (1) 的下带下限 `1.8 × 上带 = 279`，294 ≥ 279 ✓。**composer 带 395 而非 ≈ 192**：这是保留 WK-76 的 `.home-active .composer-area { padding-top: clamp(48px, 18vh, 200px) }` 的直接后果（工单接单说明明列此规则「keep」）。两条裁定在此相互挤压，本单按「保留既有规则」执行并把差额登记为待裁，见 §10 第 1 条。

**390 × 900**：上带 213 px，三 tile 排成两行（2 + 1，`tops` 68 / 68 / 156）。WK-36 / 46 的 160 上限是 1440 × 900 下的读法；390 保留完整 caption（契约必填字段）后无法压进 160，故此档不做 160 断言，只记实测值。DOM 读序在 390 为 上带 → 下带 → composer（composer 沉底，WK-58 未改）。

**上带内容**：三个 StatTile 取三集合 `total`，`window = { kind: 'current' }`，caption 逐字写出定义 + 范围 + 窗口（沿 WK9 画布原句；`Needs a look` 一条补上范围词，见 §6）。热力图位置只有一行 `Activity by day … Backend pending`，无格子、无控件（WK-27 / G-1）。tile 是控件：按下把下带筛到该集合，`aria-pressed` 表达状态，再按一次或 `Show all` 复位。`aria-label` = 集合名 + 计数；caption 经 `aria-describedby` 作描述。

**关于契约里那句「StatTile 不发出 intent」**：`presentation-primitives.d.ts` 的 `StatTileProps` 注释写「产品内没有『按集合筛选下带』的能力，画一个可点的 tile 会承诺不存在的动作」。WO-WK13 第 2 项正是创造该能力，因此该注释的前提在本单失效。落地做法仍守住类型：`toStatTiles` 的返回值不含任何 intent 或回调，筛选完全由宿主按 tuple 次序（0/1/2 → pendingItems / sessionCandidates / inspectionCandidates）接管，`.d.ts` 无需改动。请复核时确认是否要把该段注释同步改写。

## 4. adapter 落地与手写 adapter 的字段对应

`app/web/presentation-adapters.mjs` 是 `app/web` 里唯一知道 `/work-summary` 形状的地方。Home 的两带不直接读响应字段。三条贯穿规则按 `.d.ts` 执行：时间原样传 UTC ISO（组件按浏览器本地时区显示，无相对时间）、缺失是显式 null（永不折叠为 0）、adapter 是纯函数（`adapters do not read the clock` 一条测试以替换 `Date.now` 断言）。

**契约内实现**：`toStatTiles(summary, { scope, observedAt, load })`、`toWorkCards(summary, projects)`，签名与返回形状逐字沿 `.d.ts`。`observedAt` 由宿主传 `summary.observedAt`（服务端自己的读取时刻）。

**提案追加（请裁）**：`.d.ts` 只为 `sessionCandidates` 定形。另两集合的已记录字段不同，硬塞进 `WorkCardInput` 必然编造——pending 项没有 title 也没有 run 状态，把它写成 WorkCard 就得用 `missingRunLabel` 承载「Permission requested」，那等于声称「没有 run」而事实是「有一个未决问题」。因此新增两个形状并在此登记，请契约主人决定是否折进 `.d.ts`：

| 导出 | 输入 | 输出字段（全部来自响应） |
|---|---|---|
| `toPendingRows(summary, projects)` | `pendingItems` + `sessionCandidates`（只用来取 title）+ `GET /projects` | `sessionId · projectId · projectName · title · runId · questionId · kind · label · createdAt` |
| `toInspectionRows(summary, projects)` | `inspectionCandidates` + 同上 | `sessionId · projectId · projectName · title · runId · status · errorCode · runStartedAt · runEndedAt · resultAt` |

**Run / File / Workspace 三模块本单不改**，只登记其手写 adapter 与契约的字段对应（EX-WK7 §2 已确认这三者不 import `.d.ts`）：

| 契约类型 | 现源码位置 | 已对齐 | 未对齐 / 缺 |
|---|---|---|---|
| `RunSummaryInput` | `surface-modules.mjs` `runModule.adapter`；展开面 `inspector.mjs:renderRun` | `sessionId` `runId`(=`run.id`) `status` `startedAt` `endedAt` `error{code,message}`；`recordedFileCount` = `run.artifacts.length` | 无 `load`（宿主自行判 loading / error，未构造 `LoadState`）；`usage` 直接读 `run.usage` 而非 `UsageInput`，`missingLabel` 硬编码为字面量 `"Not reported"`，`missing` 前缀在渲染处拼接（`"At least "`）而非由 adapter 定 |
| `FileListInput` | `surface-modules.mjs` `kind:"file"`；`inspector.mjs` artifact 行与 `createFileView` | `sessionId`；`recordedVersions` = `run.artifacts` 过滤 `kind==='content-version'` 且 sha256 为 64 位十六进制；每条 `path` `bytes` `sha256` `kind` `writtenAt` `runId` | 无 `current` 字段（当前文件由 `state.surface.fileRef` 单独持有，不在同一输入里）；无 `emptyLabel`（空态句写死在渲染处）；无 `load` |
| `WorkspaceListInput` | `workspace-view.mjs:renderWorkspaceFilesView`；`surface-modules.mjs` `kind:"preview"` | `sessionId`；分组规则同 `WorkspaceGroupInput`（按 `path.lastIndexOf('/')`，根目录名 `"Workspace root"`）；每条 `path` `bytes` `sha256` | `mtime` 未映射到 `FileEntryInput.writtenAt`（语义不同，见 `.d.ts` 注释）；无 `materialsCount`（materials 以一个按钮出现，不作计数）；`emptyLabel` 写死；无 `load` |
| `HeatmapInput` / `toHeatmap` | — | — | 未实现，端点 G-1 未成立；产品内只有 Planned 文字行 |

迁移属后续单；本单不动这三个模块的任何一行。

## 5. 消融表（WK-47）

| 元素 | 去掉后失去的判断 | 结果 |
|---|---|---|
| 上带整体 | 「有没有事等我？有多少活在跑？有没有出问题？」三问必须先逐条展开下带才能回答；三集合的 `total` 与本页可见条数不同（分页），下带自己答不了「一共多少」 | 保留 |
| tile 1 `Waiting for you` | 唯一「有人在等我」的读数；下带同名段在 total = 0 时按 WK-47 整段不画，读数会消失 | 保留 |
| tile 2 `In progress` | 唯一说明「本页 N 条只是 total 中的一部分」的分子；FE-T12 的截断判断依赖它 | 保留 |
| tile 3 `Needs a look` | 唯一「已记录 failed / unknown 的 run 有几个」的读数；同 tile 1，空集合时下带整段不画 | 保留 |
| 每个 tile 的 caption | 数字失去范围与窗口，「1」既可读成今天也可读成全部；契约把 caption 列为必填正因如此 | 保留 |
| tile 的可按下（筛选） | 三集合重叠时无法只看一集合；且卡态没有出现的条件 | 保留 |
| `Show all` | 复位的唯一可见去路（否则只剩「再按一次另一带里的同一个 tile」，屏幕上没有一句话说过这件事） | 保留 |
| `Activity by day … Backend pending` 一行 | 「按日活动这件事到底是没做还是没有」无法判断；WK-27 要求画了的能力在产品内留可见边界 | 保留 |
| 该行的第二句说明（草稿曾写 `Daily counts of recorded runs.`） | 无。标题词 `Activity by day` 与状态词 `Backend pending` 已把定义与边界说完 | **删** |
| `Last confirmed <time>.` | 读取失败时，屏幕上的三个数字失去时效；ux-conventions §4 的「断连保留最后确认状态」需要一个可见时刻 | 保留（仅 `load.error` 时出现） |
| 上带的热力图格子 | 无可失去的判断——本就没有按日数据；画出来是编造 | **不画**（G-1 / WK-80） |
| 画布中的 accent 底色、卡片框、渐变、吉祥物、`edited 2h ago`、百分比、Today 四格 | 无。逐条无数据源或违反 WK-16 / DC-3 | **不画**（沿 gaps-wk9「不属于 gap 的排除项」） |
| 卡态（`.home-card`） | 已记录 run 时间与一个显式 `Open` 在行态里没有位置；筛到单集合后行态的信息量与三集合并列时相同，等于筛选没带来任何新事实 | 保留 |
| 卡态的第二个动作 / 嵌套卡 / 进度条 | 无。WK-47 (2) 的 anatomy 是一个尾部动作 | **不画** |
| 列表键盘 `j`/`k`/`↑`/`↓`/`Enter`/`o` | 只能用 Tab 逐个穿过每行的内部控件；inbox 式阅读在键盘上不成立 | 保留 |
| 批量键 `a`/`e`/`d`/`x` | 无可失去的判断，且会新增「未读即授权」的通道（本产品无 risk / reversibility 字段） | **不引入**（review-projection §6） |
| 行态状态词按「集合」着色（原 `.home-row.inspection`） | 失去的是一个错误判断：`unknown` 与 `failed` 同段却不是同一件事（FN-28） | **删**，改按状态词着色 |

## 6. text-sweep 增量（删 / 单词化 / 保留并注明承重）

入口已登记在 [text-sweep.md §5](text-sweep.md)。

### 6.1 删

| # | 字符串 | 位置 | 去掉后失去的判断 | 结果 |
|---|---|---|---|---|
| D-17 | `Daily counts of recorded runs.`（Planned 行的第二句，草稿） | `home-view.mjs` 上带 | 无。`Activity by day` + `Backend pending` 已说完定义与边界 | ✅ 删（未进产品） |
| D-18 | `Project`（项目名解析不到时的回退字面量） | `home-view.mjs` 行 meta | 它不承担任何事实：读者会以为项目就叫 "Project"。改为陈述条件的 `Project not resolved` | ✅ 删，见 W-20 |

### 6.2 单词化 / 改名

| # | 原可见文字 | 新可见文字 | accessible name | 位置 | 结果 |
|---|---|---|---|---|---|
| W-19 | 下带段标题 `Continue` | `In progress` | 同（`h3` 文本） | `home-view.mjs` 下带 sessionCandidates 段 | ✅ **请裁**：WK-37 与 WK9 画布把该集合的 tile 定名 `In progress`，review-projection §2 的归属表把它记作 `Continue`。同屏两名指同一集合违反 copy-convention §3「组件内不得自造第二套说法」，本单统一到 tile 名。若要反向统一（tile 改 `Continue`），只需改 `setLabels` 与 `toStatTiles` 的 label 各一处 |
| W-20 | `Project` | `Project not resolved` | 同 | 同上 | ✅ 承担条件：该会话的 projectId 不在最近一次 `GET /projects` 里。`loadProjects()` 在 `loadHome()` 之前 await，首屏不会闪现此句 |
| W-21 | 卡态尾部动作 | `Open` | `Open <会话标题>` | `home-view.mjs` 卡态 | ✅ 沿 W-8 既有做法（卡头已写出对象名，可见处只需动词） |

### 6.3 保留（并注明承担何种事实）

| 字符串 | 承担 | 依据 |
|---|---|---|
| `Waiting for you` / `In progress` / `Needs a look` | **对象名**：三集合各自的名字，tile 与下带段共用一个 | review-projection §2；WK-37 |
| `Open questions and write requests, every project, right now.` | **定义 + 范围 + 窗口**：数字本身不能自我解释 | `StatTileInput.caption` 必填；WK9 画布原句 |
| `Sessions with recorded activity, every project, right now.` | 同上 | 同上 |
| `Runs recorded failed or unknown, every project, right now.` | 同上。画布原句缺范围词（`Runs recorded failed or unknown, right now.`），本单补 `every project`，因为契约要求 caption 含范围，三条须一致 | 同上 |
| `Not available` | **缺失事实**：该集合不在上一次答复里；不是 0 | `.d.ts` 规则 2；FN-28 |
| `Activity by day` | **能力名** | WK-27 |
| `Backend pending` | **能力边界**：画了但后端未成立 | WK-27；沿用 `settings-view.mjs` 既有词 |
| `Last confirmed <time>.` | **时效条件**：屏幕上的数字是何时确认的 | ux-conventions §4 |
| `Show all` / accessible `Show all work` | **动作 + 目的地**：回到三集合并列 | WK-59 单词化 |
| `Questions and write requests will appear here.` | **空态条件**：什么会让这里长出东西 | copy-convention §1 |
| `Runs recorded failed or unknown will appear here.` | 同上 | 同上 |
| `This list was not part of the last answer.` | **缺失 ≠ 空**：这一集合不在响应里，与「集合为空」不是一件事 | DC-1；FN-28 |
| `No run recorded` | **缺失事实**：会话尚无 run，不得写成 `Completed` | `WorkCardInput.missingRunLabel` |
| `Project not resolved` | **条件**（见 W-20） | DC-1 |
| `Run started <t>` / `Run <t> – <t>` / `Created <t>` | **已记录时间**：run 起止或会话创建，浏览器本地时区显示，来源为 UTC ISO；不写「多久之前」 | `.d.ts` 规则 1；ux-conventions §3；WK-37 |
| `Your sessions will appear here.` / `No items on this page. Refresh to reconcile this list.` / `Showing N of T. Some items are outside this page.` / `Load more` / `Retry` / `Loading your workspace…` | 原样保留（WK10a 已裁） | text-sweep §3 |
| `Continue existing` / `Create new` / `No work in this project is bound to X yet.` / `Reading the work this project already owns…` | 原样保留，本单只改两段次序与出现条件 | WK10b 第二段；WK-85 (2) |

## 7. 验证

### 7.1 命令与结果（作者验证）

| 命令 | 结果 |
|---|---|
| `npm --prefix app ci` | 通过，0 vulnerabilities |
| `npm --prefix app test`（基线，改动前） | **178 / 178** |
| `npm --prefix app test`（改动后） | **185 / 185**（178 + 新增 7 条 adapter 口径测试） |
| `node tools/lint-colors.mjs` | `ok (15 files · 字面量与高度层两项)` |
| `node tools/contrast-report.mjs` | 全表通过（`muted` on `panel` 3.76 ≥ 3；`accent-ink` / `danger` / `focus` 均达标） |
| `evidence/wk13/home-checks.mjs`（8875，CDP 19671） | **44 / 44** → `evidence/wk13/home-checks.json` |
| `evidence/wk13/home-states.mjs` WK13_STAGE=empty（8876，CDP 19672） | **4 / 4** → `home-states-empty.json` |
| `evidence/wk13/home-states.mjs` WK13_STAGE=truncate（8877，CDP 19673） | **2 / 2** → `home-states-truncate.json` |
| `evidence/wk13/home-states.mjs` WK13_STAGE=rows（8875，CDP 19674） | **2 / 2** → `home-states-rows.json` |
| `evidence/final-integration-20260908/home-geometry.mjs` `HOME_STAGE=rows`（8875，CDP 19675） | **4 / 4**，断言未改 |
| `evidence/final-integration-20260908/home-geometry.mjs` `HOME_STAGE=empty`（8876，CDP 19676） | **4 / 4**，断言未改 |
| `evidence/final-integration-20260908/home-checks.mjs`（8876，CDP 19677） | **7 / 7**，断言未改 |

**既有 Home 回归的断言一条未改。** 两个脚本会把输出写回自己的目录，本轮把产生的 JSON / PNG 复制到 `evidence/wk13/regression/` 后用 `git checkout` 还原了 `evidence/final-integration-20260908/` 的 10 个文件；该目录在提交里保持不变。

复现命令：

```
# 三台服务（全新仓外数据目录，fake provider）
npm --prefix app start -- --data-dir /private/tmp/se-agent-wk13-data       --port 8875
npm --prefix app start -- --data-dir /private/tmp/se-agent-wk13-data-empty --port 8876
npm --prefix app start -- --data-dir /private/tmp/se-agent-wk13-data-trunc --port 8877
# 播种（只经 /api/v5，不直接写 store）
APP_URL=http://127.0.0.1:8875 WK13_STAGE=rows     node engineering/mvp/execution/work-surface-kit/evidence/wk13/seed.mjs
APP_URL=http://127.0.0.1:8877 WK13_STAGE=truncate node engineering/mvp/execution/work-surface-kit/evidence/wk13/seed.mjs
# 检查
APP_URL=http://127.0.0.1:8875 WK6_CDP_PORT=19671 node engineering/mvp/execution/work-surface-kit/evidence/wk13/home-checks.mjs
APP_URL=http://127.0.0.1:8876 WK13_STAGE=empty    WK6_CDP_PORT=19672 node .../evidence/wk13/home-states.mjs
APP_URL=http://127.0.0.1:8877 WK13_STAGE=truncate WK6_CDP_PORT=19673 node .../evidence/wk13/home-states.mjs
APP_URL=http://127.0.0.1:8875 WK13_STAGE=rows     WK6_CDP_PORT=19674 node .../evidence/wk13/home-states.mjs
```

`seed.mjs` 的顺序说明：store 全局只允许一个活动 run，因此终态 run（`/fixture error`）先播，停在 `waiting_user` 的问题 run 最后播。

### 7.2 同条件截图（`evidence/wk13/`）

`home-rows-1440-light|dark.png`、`home-rows-390-light|dark.png`（四张均在 `prefers-reduced-motion: reduce` 下拍）、`home-cards-1440-light.png`（筛到 In progress 的卡态）、`home-truncated-1440-light.png`、`home-read-failure-1440-light.png`、`home-empty-1440-light.png`、`session-unbound-1440-light.png`、`home-rows-200pct-light.png`（720 × 450 等效 200 %）。`regression/` 下为既有两个几何脚本本轮产出的 10 个文件副本。

目视核对了 `home-rows-1440-light`、`home-rows-390-dark`、`home-cards-1440-light`、`home-read-failure-1440-light` 四张；其余生成并做几何 / 文本断言，未逐张目视。

### 7.3 FE-T01 / T02 / T12

| 用例 | 步骤 | 结果 |
|---|---|---|
| **FE-T01 · 无数据** | 8876 无项目无会话；打开 Home | 三 tile 读 `0 / 0 / 0`（确认过的 0，不是缺失），无失败提示；下带只有 `In progress` 一段与一句 `Your sessions will appear here.`；composer 可用（普通探索成立）；上带 Planned 行照常。✅ |
| **FE-T01 · 无绑定** | 8875 打开一个 `extensionBinding === null` 的会话 | 会话可读可写（composer 未禁用），正文与上下文行内 `matter` 字样零命中——未绑定不被叫作空 Matter；上带在会话内 `hidden`。✅ |
| **FE-T01 · 读取失败** | CDP 阻断 `*work-summary*` 后触发一次读取 | 下带出现失败句 + `Retry`；三 tile 保留最后确认的 `1 / 4 / 1`（**不塌成 0**），上带追加 `Last confirmed Sep 8, 09:26 PM.`。截图 `home-read-failure-1440-light.png`。✅ |
| **FE-T02 · 同动作三入口** | 同一行分别用指针点击、`j` 聚焦后按 `o` | 焦点键与目标行一致，两条路径落到同一 `activeSessionId`；`Enter` 在按钮上不被拦截（交给按钮自身激活，避免开两次）。会话内待处理卡：`j` 停在卡上、`o` 把焦点移进卡内的第一个控件，**不代按 Allow / Deny**。✅ |
| **FE-T12 · Heatmap 缺数据** | Home 全文检索 | 无 `heatmap` 元素、无格子；只有一行 `Activity by day … Backend pending`。✅ |
| **FE-T12 · 日界不支持** | Home 正文 | `today` 正则零命中；三条 caption 的窗口一律写 `right now.`；`TimeWindow` 只取 `{ kind: 'current' }`（单元测试另断言 caption 不含 today）。✅ |
| **FE-T12 · 分页截断** | 8877 播 33 个会话，服务端 `limit=30` | 段内 `count-badge` 33 > 本页 30 行；`Showing 30 of 33. Some items are outside this page.` + `Load more`；无「就这些」一类措辞；tile 读服务端 `total`（33）而非本页长度。✅ |
| **FE-T12 · usage missing** | 本单未触及 usage 呈现 | `inspector.mjs` 的 `At least` 下限措辞与 `Not reported` 未改动；本单不在 Home 显示任何 usage。列为未检项（§10） |

### 7.4 键盘与读屏

| 项 | 结果 |
|---|---|
| `j` / `k` 在下带移动焦点 | ✅（无焦点时落到第一项） |
| `↑` / `↓` 移动焦点 | ✅（仅在焦点已在列表项上时拦截，页面滚动不受影响） |
| `Enter` / `o` 打开 | ✅（`Enter` 让按钮自己激活；`o` 走同一 controller） |
| 焦点在 `#composer-input` 时不拦截 | ✅（键入 `j` 进入 textarea，焦点不变） |
| IME 组字不拦截 | 代码按 `event.isComposing` 与 `keyCode === 229` 提前返回；**真实 IME 未验**（§10） |
| 对话框 / popover / 工作面内不拦截 | 代码按 `dialog[open]`、`#surface-panel`、`[popover]` 提前返回 |
| tile 的 accessible name = 集合名 + 计数 | ✅ 三档四组视口全部断言 `aria-label === "<label>, <value>"`；caption 经 `aria-describedby` 作描述 |
| 卡态 `Open` 的 accessible name | ✅ `Open <会话标题>`，可见文字只有 `Open` |

## 8. 服务端静态 allowlist 路径请求（交 Astra）

新模块 `app/web/presentation-adapters.mjs` 被 `home-view.mjs` import，浏览器会请求 `/web/presentation-adapters.mjs`。当前 `app/server/index.mjs:22` 的 STATIC 名单里没有它，**未加入前 Home 无法加载**。请求内容（本单未自改该文件）：

- 文件：`app/server/index.mjs`，第 22 行的模块名数组
- 加入项：`"presentation-adapters.mjs"`（建议置于 `"home-view.mjs"` 之后）
- 结果映射：`/web/presentation-adapters.mjs` → `path.join(APP_ROOT,"web","presentation-adapters.mjs")`，`text/javascript; charset=utf-8`
- 无其他服务端改动，无新端点，无契约变化

## 9. 越界改动与回退记录

| 项 | 原因 | 回退 |
|---|---|---|
| `app/server/index.mjs` STATIC 名单临时加 `"presentation-adapters.mjs"` | 不加则本地浏览器验证全部无法进行（模块 404） | 全部浏览器验证完成后 `git checkout -- app/server/index.mjs` 还原；随后重跑 `npm --prefix app test` 得 **185 / 185**，提交里该文件零改动（`grep -c presentation-adapters app/server/index.mjs` = 0） |
| `evidence/final-integration-20260908/` 的 10 个 JSON / PNG 被既有脚本覆写 | 两个既有回归脚本按 `import.meta.url` 写回自己的目录，无法重定向 | 产出复制到 `evidence/wk13/regression/` 后 `git checkout` 还原，该目录在提交里不变 |

## 10. 待裁与未检项

**待裁（本单已实施但需复核确认）**

1. **composer 带高 395 vs WK-46 (1) 的 ≈ 192。** 保留 WK-76 的 `clamp(48px, 18vh, 200px)` 上留白是接单说明的明确要求；但在上带出现之后，这段留白不再是「视口顶部的留白」，而是夹在两带之间的空白（见 `home-rows-1440-light.png`）。下带下限仍满足（294 ≥ 279）。若要合 WK-46，只需把该 padding 降到约 `clamp(24px, 6vh, 72px)`，一行 CSS，不影响其他断言。
2. **`In progress` vs `Continue`**（W-19）。同屏两名指一集合已按 copy-convention §3 统一到 tile 名，反向统一同样是两处改动。
3. **`.d.ts` 里 `StatTileProps` 的「不发出 intent」注释**（§3 末）：前提已随本单第 2 项失效，是否同步改写。
4. **`toPendingRows` / `toInspectionRows` 是否折进 `.d.ts`**（§4）。

**未检项（分列）**

- **触控**：未在真实触摸屏上验证 tile、行、卡与 `Load more` 的命中区（IC-1 的 44 窄屏 / coarse pointer）。390 为 CDP 的 `mobile: true` 模拟，不是真机。
- **读屏**：tile 的 `aria-label`、`aria-describedby` 与卡态 `Open` 的完整名只做了程序断言，**未经 VoiceOver / NVDA 实际朗读**；`aria-pressed` 的切换播报未验。
- **真实 provider**：全部验证在 `fake-openai-loopback` 下完成，`not_run`。
- **真实 IME**：`isComposing` / `keyCode 229` 的提前返回未经中文 / 日文输入法实测。
- **usage missing 的下限措辞**（FE-T12 一列）：本单未改 `inspector.mjs`，未重跑其呈现。
- **200 % 缩放**：以 720 × 450 视口等效，未用浏览器自身的 200 % 页面缩放验证。
- **1024–1439 中间档**：未单独取样；本单只测 1440 与 390 两档（工单所列）。
- **Astra 独验**：本节全部为作者验证，独验分列待 Astra / Fable。

## 11. r2 · WK-86 裁定落地（Claude Opus，2026-09-08）

裁定 [WK-86](intake-round-2.md) 对 §10 四项待裁的答复：(1) 上带既已常驻，composer 带按 WK-46 (1) 办，WK-76 的顶留白退役；(2) `In progress` 是 review-projection §2「Continue」集合的可见名；(3) `.d.ts` 补记 WK13 已实现的形状；(4) 其余不动。本节记本轮实际改动与实测值。

### 11.1 改动（三处代码 / 契约 + 一处证据脚本）

| 文件 | 改动 |
|---|---|
| `app/web/styles.css` | `.home-active .composer-area` 的 `padding-top` 由 `clamp(48px, 18vh, 200px)` 改为 `var(--section-gap)`（24 px），注释由 WK-76 改述为 WK-86 (1)。**只此一行**；`.home-active.home-empty` 的 `clamp(96px, 31vh, 640px)` 与 `< 768` 的沉底 composer（`padding-top: var(--space-3)`）均未触及 |
| `contracts/review-projection.md` §2 | 归属表后加一句：`Continue` 集合的可见名是 `In progress`，集合键 `sessionCandidates` 与归属规则不变 |
| `contracts/presentation-primitives.d.ts` | `StatTileProps` 注释改写（tile 可为自己那一个集合发出 filter intent，仍不发出写入 / 业务 intent，仍不发出 open / answer / allow / deny）；新增 §3b `PendingRowInput` / `InspectionRowInput` 与 `toPendingRows` / `toInspectionRows` 两条签名，逐字照 `presentation-adapters.mjs` 现状，标明「只搬运已记录字段」。为使两条签名成立，`WorkSummaryResponse` 里 `pendingItems.items` / `inspectionCandidates.items` 的 `unknown[]` 填成服务端实际返回的字段（`work-summary.mjs:34–47`），未新增任何字段 |
| `evidence/wk13/home-checks.mjs` | 1440 档的「measured band geometry」（原恒真、只记数）改为两条真断言：composer 带 ∈ [192, 260]、下带首屏可见 ≥ 1.8 × 上带。390 档仍只记数（沉底 composer 有自己的几何，WK-58）。**本轮唯一改动的断言，且只为本次意图改动而改**；其余断言与两个既有 Home 回归脚本一字未动 |

`app/web/*.mjs`、`index.html`、`app/tests/**` 本轮零改动：adapter 签名未移动，7 条 adapter 测试原样通过。

### 11.2 实测带高（1440 × 900，浅 / 深两宗同值）

| 带 | r1（WK13 提交时） | r2（本轮） | 依据 |
|---|---:|---:|---|
| 上带（band 1） | 155 | **155** | WK-46 (1) 上限 160 ✓ |
| composer 带（band 2） | 395 | **257** | WK-46 (1) ≈ 192–260 ✓ |
| 下带首屏可见（band 3） | 294 | **432** | 下限 1.8 × 155 = 279 ✓ |
| hero 上沿（`#composer-form.top`） | 280（WK13 前基线，无上带） | 297 | — |

390 × 900：上带 213、composer 带 349、下带可见 631，与 r1 **逐像素相同**——`home-rows-390-light.png` 重拍后与提交版字节一致，390 沉底 composer 未受影响。

空态（8879）：`#composer-form.top` = 552，与 r1 同值；`.home-active.home-empty` 的 31vh 未改（见 11.5）。

### 11.3 消融行（WK-47 增补，接 §5）

| 元素 | 去掉后失去的判断 | 结果 |
|---|---|---|
| hero 上方 `clamp(48px, 18vh, 200px)` 的留白（WK-76） | **上带出现之前**：它是页面顶部的留白，承担「Home 的入口是一句话加一个输入框，不是一份文档」——去掉它，hero 会贴在视口上沿，读者第一眼落在标题栏而不是那句话上。**上带出现之后**：hero 不再是屏幕上第一件东西，`Activity by day` 一行已经把「读数到此为止」说完，这段留白不再区隔任何两件事，只是夹在两带之间的空白；它承担的判断已由上带自己的边界承担。同时它把下带从 432 压到 294，让本可见的两行掉到折线以下 | **删**（改为 24 px 带间距，WK-86 (1)） |

### 11.4 复验（服务端口 8878 / 8879 / 8880，数据目录 `/private/tmp/se-agent-wk13-data-2{,-empty,-trunc}` 全新、仓外、fake provider，CDP 19681–19687）

| 命令 | 结果 |
|---|---|
| `npm --prefix app test` | **185 / 185** |
| `node tools/lint-colors.mjs` | `ok (15 files)` |
| `node tools/contrast-report.mjs` | 全表通过 |
| `evidence/wk13/home-checks.mjs`（8878） | **46 / 46**（44 + 新增两条带高断言；原「measured band geometry」两条恒真项改为真断言） |
| `evidence/wk13/home-states.mjs` rows / empty / truncate（8878 / 8879 / 8880） | **2 / 2**、**4 / 4**、**2 / 2**，断言未改 |
| `evidence/final-integration-20260908/home-geometry.mjs` `HOME_STAGE=rows`（8878） | **4 / 4**，断言未改 |
| 同上 `HOME_STAGE=empty`（8879） | **4 / 4**，断言未改 |
| `evidence/final-integration-20260908/home-checks.mjs`（8879） | **7 / 7**，断言未改 |

证据（新增，r1 文件保留作对照）：`home-rows-1440-light-r2.png`、`home-empty-1440-light-r2.png`、`home-rows-390-light-r2.png`、`home-cards-1440-light-r2.png`、`home-read-failure-1440-light-r2.png`、`home-checks-r2.json`、`regression/home-{rows,empty}-geometry-r2.json`。目视核对了前三张。既有回归目录 `evidence/final-integration-20260908/` 经 `git checkout` 还原，提交里零改动。

服务端越界：本地验证期间在 `app/server/index.mjs:22` 临时加入 `"presentation-adapters.mjs"`，全部浏览器验证结束后 `git checkout` 还原；提交前 `git diff -- app/server` 为空，`grep -c presentation-adapters app/server/index.mjs` = 0。§8 的 allowlist 请求仍待 Astra 落实。

### 11.5 本轮不改、交回裁定的一项

**空态的 `clamp(96px, 31vh, 640px)`（WK-11）。** WK-86 (1) 只点名 WK-76 的 `clamp(48px, 18vh, 200px)`，且第 4 项写明「其余不动」，故本轮未动。但上带在空态同样常驻（三个确认过的 0），`home-empty-1440-light-r2.png` 上那 279 px 已经不是页面顶部的留白，而是与 11.3 同形的带间空白——同一条理由在空态成立。若要一并退役，同样是一行 CSS（`padding-top` 改为带间距或一档更大的值），不影响任何现有断言（`home-geometry.mjs` 只断言 `home-empty` 类、composer 64–160 与状态句在框外）。请裁。

### 11.6 §10 待裁项的结转

第 1 / 2 / 3 / 4 项已由 WK-86 答复并实施。§10 的「未检项」（触控、读屏实读、真实 provider、真实 IME、usage 下限措辞、浏览器自身 200 % 缩放、1024–1439 中间档、Astra 独验）本轮均未新增覆盖，原样结转。

## 12. Fable 复核（2026-09-08）

独立重跑 r2 `6de394e`：`npm --prefix app test` 185/185，`lint-colors` ok，`git diff -- app/server` 为空。目视 `home-rows-1440-light-r2`：上带 155 / composer 带 257 / 下带 432，三集合分节、行态状态词（Answer requested · Waiting for you · Failed · No run recorded）；`home-cards-1440-light`：筛选后卡态沿 railCard 解剖；`home-rows-390-light`：tile 2+1、composer 沉底不变。

裁定（WK-86，已由 r2 实施）：
1. 上带在场时 composer 带按 WK-46，WK-76 的 18vh 留白退役（消融已记）。
2. `In progress` 为 Continue 集合的可见名，集合键与成员规则不变。
3. `.d.ts` 收编 `PendingRowInput` / `InspectionRowInput` 与两个 adapter 签名，只读字段。
4. 空态 Home 的 `clamp(96px, 31vh, 640px)`（WK-11）在上带在场后同样成为带间空白（`home-empty-1440-light-r2`）：架构上应同样退役为带距；因空态 hero 位置曾由用户裁定，留用户四轴确认后一行改动，不阻塞合流。
5. 交 Astra 合流；合流前置：`app/server/index.mjs:22` STATIC 数组加入 `"presentation-adapters.mjs"`（§8）；独验项 FE-T01 / T02 / T12 与 Home 既有回归。
