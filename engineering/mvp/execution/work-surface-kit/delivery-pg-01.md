# 交付 · WO-PG-01 · Interaction Grammar lint 与投影契约收敛

工单 [WO-PG-01](work-orders/WO-PG-01-interaction-lint.md)。裁定来源：[intake §4ar / §4as WK-139…149](intake-round-3.md)（施工条款为 WK-140 / WK-146 / WK-148 / WK-149 (f)），现状事实见 [EX-PG1](explore/ex-pg1-projection-inventory.md) §3 Q1 / Q4 / Q5 与 §6 第 1、2、6 问。执行 `opus-wo-medium`。

- 基线：`main` `a274cc8`（工单文头写的 `5b405b3` 是派单时的 SHA，本单实际从工单落库后的 `a274cc8` 起）。分支 `claude/pg01-interaction-lint`，隔离工作树 `/private/tmp/se-agent-pg01`。
- 写权范围内改了三个文件、新增两个：`tools/lint-interaction.mjs`（新）、`tools/README.md`（加一行）、`contracts/presentation-primitives.d.ts`（收敛）、本文件（新）。夹具在 `/private/tmp/se-agent-pg01-fixtures/`，不入库。

## 1. `tools/lint-interaction.mjs`

形式沿 [`tools/lint-materials.mjs`](../../../../tools/lint-materials.mjs)：文件头注写清检查哪条裁定、登记表在文件里、只看字面事实、逐条打印问题、有问题 `process.exit(1)` 并打印计数、通过时一行 ok 摘要、中文注释与信息。无参数时扫描 `app/web/**/*.mjs`（跳过 `vendor` / `node_modules`），带参数时只扫指定文件。无依赖，原生 Node ESM。

### 三项检查怎么写的

检查由一张 `CHECKS` 表驱动，每条是「语义键 → 规则 id + 若干字面正则 + 报错措辞」。规则 id 是三元闭集 `running-not-progress` / `estimate-not-meter` / `numeric-not-slider`。

| 语义键 | 规则 | 字面形式 |
|---|---|---|
| `progress-element` | `running-not-progress` | `el("progress"…` / `element('progress'…`（`app.mjs:230` 的本地别名）/ `createElement(…"progress"…)` / 字面 `<progress` |
| `meter-element` | `estimate-not-meter` | 同上四种形式的 `meter` |
| `role-progressbar` | `running-not-progress` | `role: "progressbar"` / `role="progressbar"` / `setAttribute("role","progressbar")` |
| `role-meter` | `estimate-not-meter` | 同上的 `meter` |
| `aria-valuenow` | `estimate-not-meter` | `aria-valuenow` 任意出现 |
| `input-range` | `numeric-not-slider` | `type: "range"` / `type:'range'` / `type="range"` / `setAttribute("type","range")` |

三种引号（`"` / `'` / 反引号）由反向引用统一覆盖，所以模板串里的 HTML 字面量与对象字面量属性用同一条正则抓。`el` / `element` 前有 `(?<![\w$.])` 负后顾，避免误伤 `panel.element(` 一类的方法调用。

**`aria-valuenow` 归 `estimate-not-meter`**：WK-146 ③ 写的是「`aria-valuenow` 同 ①」，而 ① 是 progress / meter / `role=meter` 那一整组，其登记要求最严（须给出同口径的 current 与 limit）。把它挂在 meter 一侧，等于让 ① 组内所有命中共用同一套登记要求——`aria-valuenow` 本来就是 progressbar 与 meter 共用的「当下值落在 min…max 刻度上的哪里」，没有已测量的上限就不该出现。

### 登记表与「表外一处即失败」

`REGISTERED` 是一张 `Map`，键 `<文件相对路径>:<语义键>`，值 `{ rule, fact, reason }`（① 组另需 `current` / `limit`）。**交付时为空**——EX-PG1 §3 Q1 清点今日 `app/web` 对这三项零命中，空表加上「表外一处即失败」就是 WK-140 这条裁定的冻结形式。ok 摘要显式打印「登记例外 0 条」。

登记本身也被检查，因为把绕过写成登记的一行同样是绕过：条目的 `rule` 必须与命中处所属规则一致且在闭集内、`fact` 与 `reason` 非空、① 组的条目必须另给 `current` 与 `limit` 两个同口径的已测量量。任一不成立就照样报错，措辞是「登记表条目不成立——…」。

### 注释剥离的取舍（工单要求写明）

现有代码里合法地出现这些字样：`surface-modules.mjs:57` 与 `home-view.mjs:354` 的头注逐字写着 `No nested card, no progress bar, no percentage.`，`runtime-view.mjs:2483-2486` 的头注写着拒绝 percentage-of-limit。所以先扫出注释区间，再丢弃落在注释里的命中。

区间扫描器是个字符状态机，认得行注释、块注释与三种字符串（含模板串 `${}` 的嵌套回退）；字符串内容**保留**，因为标签名本身就在串里（`el("progress")`）。**它不认正则字面量**：若某天出现一个内含引号的正则，状态机会错位。这条取舍写在文件头注里，因为失败方向是刻意选的——错位只会把注释当代码（多报），不会把代码当注释（漏报），交人复核，这是 lint 该有的方向。今日 `app/web` 无内含引号的正则字面量。

## 2. 自测：命令与实际输出

夹具九个文件在 `/private/tmp/se-agent-pg01-fixtures/`，不入库。六个反例覆盖三项检查各两种以上写法（含 `element()` 别名与 `type:'range'` 单引号形式）。

```
$ for f in /private/tmp/se-agent-pg01-fixtures/*.mjs; do node tools/lint-interaction.mjs "$f"; done

### bad-progress-el.mjs                （el("progress"…）
../se-agent-pg01-fixtures/bad-progress-el.mjs:3: 创建了 progress 元素（running-not-progress），但不在 WK-146 登记表内：el("progress"
lint-interaction: 1 处违反 WK-140 / WK-146
exit=1

### bad-progress-alias.mjs             （app.mjs 的 element() 别名 + 单引号）
../se-agent-pg01-fixtures/bad-progress-alias.mjs:3: 创建了 progress 元素（running-not-progress），但不在 WK-146 登记表内：element('progress'
lint-interaction: 1 处违反 WK-140 / WK-146
exit=1

### bad-meter-el.mjs
../se-agent-pg01-fixtures/bad-meter-el.mjs:2: 创建了 meter 元素（estimate-not-meter），但不在 WK-146 登记表内：el("meter"
lint-interaction: 1 处违反 WK-140 / WK-146
exit=1

### bad-meter-role.mjs                 （role: "meter" 与 aria-valuenow 同现，两处分别报）
../se-agent-pg01-fixtures/bad-meter-role.mjs:2: 声明了 role="meter"（estimate-not-meter），但不在 WK-146 登记表内：role: "meter"
../se-agent-pg01-fixtures/bad-meter-role.mjs:2: 出现了 aria-valuenow（estimate-not-meter），但不在 WK-146 登记表内：aria-valuenow
lint-interaction: 2 处违反 WK-140 / WK-146
exit=1

### bad-progressbar-markup.mjs         （模板串里的 <progress> 与 role='progressbar'）
../se-agent-pg01-fixtures/bad-progressbar-markup.mjs:1: 创建了 progress 元素（running-not-progress），但不在 WK-146 登记表内：<progress
../se-agent-pg01-fixtures/bad-progressbar-markup.mjs:1: 声明了 role="progressbar"（running-not-progress），但不在 WK-146 登记表内：role='progressbar'
lint-interaction: 2 处违反 WK-140 / WK-146
exit=1

### bad-range-double.mjs               （type: "range"）
../se-agent-pg01-fixtures/bad-range-double.mjs:2: 出现了 input 的 type="range"（numeric-not-slider），但不在 WK-146 登记表内：type: "range"
lint-interaction: 1 处违反 WK-140 / WK-146
exit=1

### bad-range-single.mjs               （HTML 字面 type="range" 与对象字面 type:'range'）
../se-agent-pg01-fixtures/bad-range-single.mjs:1: 出现了 input 的 type="range"（numeric-not-slider），但不在 WK-146 登记表内：type="range"
../se-agent-pg01-fixtures/bad-range-single.mjs:2: 出现了 input 的 type="range"（numeric-not-slider），但不在 WK-146 登记表内：type:'range'
lint-interaction: 2 处违反 WK-140 / WK-146
exit=1

### ok-comments-only.mjs               （六个字样全在注释与可见文案里，且含一个 https:// URL）
lint-interaction: ok (1 files · progress/meter、role 与 aria-valuenow、input[type=range] 三项 · 登记例外 0 条)
exit=0
```

**正例（命中 + 登记表有对应条目 → 放行）**。交付的登记表必须为空，所以这一项是把仓内文件临时打上一条条目跑完再还原（备份 → 打条目 → 跑 → 还原），仓内文件最终仍是 `const REGISTERED = new Map([]);`：

```
### A · 完整条目（rule 对、fact/reason 齐、current 与 limit 同口径）
["../se-agent-pg01-fixtures/ok-registered.mjs:meter-element",
 { rule: "estimate-not-meter", fact: "GET /disk 的 bytesUsed 与 bytesTotal，同为字节",
   current: "bytesUsed", limit: "bytesTotal", reason: "WK-146 演示条目（夹具专用，不入库）" }]
$ node tools/lint-interaction.mjs /private/tmp/se-agent-pg01-fixtures/ok-registered.mjs
lint-interaction: ok (1 files · progress/meter、role 与 aria-valuenow、input[type=range] 三项 · 登记例外 1 条 · 放行命中 1 处)
exit=0

### B · 同一处，条目缺 current / limit
../se-agent-pg01-fixtures/ok-registered.mjs:2: 登记表条目不成立——meter 类例外须给出同口径的 current 与 limit 两个已测量的量
lint-interaction: 1 处违反 WK-140 / WK-146
exit=1

### C · 同一处，条目 rule 写错
../se-agent-pg01-fixtures/ok-registered.mjs:2: 登记表条目不成立——登记的 rule 是 numeric-not-slider，此处属 estimate-not-meter
lint-interaction: 1 处违反 WK-140 / WK-146
exit=1

### 还原后确认
$ grep -n "const REGISTERED" tools/lint-interaction.mjs
56:const REGISTERED = new Map([]);
```

**真实 `app/web` 无参数扫描**：

```
$ node tools/lint-interaction.mjs
lint-interaction: ok (22 files · progress/meter、role 与 aria-valuenow、input[type=range] 三项 · 登记例外 0 条)
```

`app/web` 对三项检查零命中，**没有一处需要停下来的产品代码**，也就没有往登记表里加任何条目。EX-PG1 §3 Q1 的零命中结论在本单独立复现。

**额外的一次交叉核对**（不是工单要求的验收项，是为了证明上面的 ok 不是注释剥离剥出来的）：把同一批正则对**未剥注释的原始文本**跑一遍，命中数同样是 0。也就是说注释剥离这条逻辑今天在真实产品代码上**没有被触发过**，它只被夹具 `ok-comments-only.mjs` 检验。

## 3. 验收命令

```
$ node tools/lint-interaction.mjs
lint-interaction: ok (22 files · progress/meter、role 与 aria-valuenow、input[type=range] 三项 · 登记例外 0 条)

$ node tools/lint-colors.mjs
lint-colors: ok (26 files · 字面量与高度层两项)

$ node tools/lint-materials.mjs
lint-materials: ok (3 files · 登记类名与 reduced-transparency 回退两项)

$ node tools/check-doc-links.mjs
  "pass": true,
  "documents": 571,
  "checked": 2583,
  "problems": []

$ git status --short
 M engineering/mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts
 M tools/README.md
?? engineering/mvp/execution/work-surface-kit/delivery-pg-01.md
?? tools/lint-interaction.mjs
```

`git status` 只有写权范围内的文件；夹具不在库内（在 `/private/tmp/se-agent-pg01-fixtures/`）。

## 4. `presentation-primitives.d.ts` 逐个签名的处置

先答工单第 37 行的前置问题：**该文件今天纯属文档**。全仓无 `tsconfig*.json`，`app/package.json` 的 scripts 只有 `start` / `test` / `smoke`，无 `tsc` 或任何类型检查；没有任何 `.mjs` / `.ts` import 它，唯一的代码侧引用是 `presentation-adapters.mjs:4` 与 `app/tests/presentation-adapters.test.mjs:3` 两处**注释里的文件名**。所以「契约」的约束力今天完全由评审承担，改它不会让任何检查变红也不会变绿——这正是它能悄悄名不副实的原因。

### 删

| 项 | 依据 |
|---|---|
| §2 Heatmap 段的 gap 注释（`gap: needs GET /work-activity`、「产品内当前只允许渲染 Planned · Backend pending 文字行」） | 事实已反转：端点已上线（`app/docs/work-metrics.md`），`home-view.mjs:92-95` 的 WK-94 注释确认 `Backend pending` 行已移除。WK-148 (a) 以代码为准 |
| `HeatmapBucket` / `HeatmapInput` / `HeatmapProps` | 三者是端点未建时的目标形状，与已发运的 `toHomeActivity` 返回**不同构**（真实返回没有 `metric` / `maxCount` / `accessibleSummary` / `load`，多出 `level` / `coverage` / `days` / `observedAt`）。`HeatmapProps.plannedLabel` 承载的正是那条已被删掉的 Backend pending 文字。留着就是留一份与代码冲突的第二真相 |
| `toHeatmap` | 从未实现（EX-PG1 §3 Q5）。WK-148 (b) 明令删除 |
| `toRunSummary` / `toFileList` / `toWorkspaceList` | 同上，三个签名从未实现。WK-148 (b) |
| §4 `UsageInput` / `RunSummaryInput` / `RunSummaryProps`；§5 `FileEntryInput` / `FileListInput` / `FileListProps`；§6 `WorkspaceGroupInput` / `WorkspaceListInput` / `WorkspaceListProps` | **这一条是本单的判断，超出工单逐字所列，请复核**。工单只点名「四个签名」。但 WK-148 (c) 裁定不要求把 adapter 层扩张到 RunSummary / FileList / Workspace，而工单又要求加一句辖区说明「本契约只覆盖 Home 与 Usage 的 adapter」。若删签名而留这九个类型，文件里就会剩下九个**没有生产者、且辖区声明已明确排除**的形状——那正是「将来会实现的占位」，与工单第 33 行「不留兼容层、不留占位」和项目原则「移除过时路径而不是保留」直接冲突。故整节删除。若裁定者认为这三节应作为「view 直读 DTO 时的渲染约定」保留，回滚这一处即可，其余不受影响 |

`FileReadKind` 与 `RunStatus` **未**随之删除：前者仍被 `OpenFileIntent` 使用，后者仍被 `WorkCardInput` 与 `WorkSummaryResponse` 使用。删除后全文件无悬空引用。

### 留

| 项 | 依据 |
|---|---|
| 三条通用规则（UTC 原样透传 / 缺失显式 `null` / adapter 纯函数） | WK-139 (c) 升为 Projection Grammar 通用条款，且 `presentation-adapters.mjs:1-19` 头注逐条复述，代码与契约一致 |
| `UtcInstant` / `RunStatus` / `FileReadKind` / `TimeWindow` / `MetricScope` / `PageFacts` / `LoadState` | 仍被保留下来的形状引用 |
| 三个 intent 与 `IntentSink` | 与 §3 WorkCard 一同仍成立 |
| §1 `StatTileInput` / `StatTileProps`（含 WO-WK13 改写过的可点 tile 注释） | `toStatTiles` 已实现（`presentation-adapters.mjs:54`） |
| §3 `WorkCardInput` / `WorkCardProps` | `toWorkCards` 已实现（`:97`） |
| §3b `PendingRowInput` / `InspectionRowInput` | `toPendingRows` / `toInspectionRows` 已实现（`:137` / `:167`） |
| `WorkSummaryResponse` / `ProjectRef` 与 `toStatTiles` / `toWorkCards` / `toPendingRows` / `toInspectionRows` 四个签名 | 四者与实现一一对应，未改 |

### 增（形状逐字读自 `app/web/presentation-adapters.mjs`，未照抄想象）

| 项 | 对应实现 | 形状要点 |
|---|---|---|
| `HomeActivityBucket` / `HomeActivityProjection` + `toHomeActivity(data, expectedDays?) → … \| null` | `:198-223` | `{ observedAt, total, days, coverage, buckets[] }`；每格 `{ date, count, level: 0\|1\|2\|3\|4, label }`。`level` 记为**绝对固定刻度**（`0 / 1 / <4 / <8 / 其余`），并注明 Usage 的相对分位是同一 class 下的另一条合法语义分支（WK-149 (d)），两者不共用算法。`coverage` 是那句固定披露文本。`expectedDays` 是调用方按档位传的期待天数（`home-view.mjs:187` 传 `activity.days`），传 `null` 表示不校验 |
| `AttentionStatus` / `attentionLabels` / `HomeAttentionItem` / `HomeAttentionProjection` + `toHomeAttention(data) → … \| null` | `:225-241` | 五态取值域即 `attentionLabels` 的键；返回 `{ count, offset, nextOffset, items[] }`，每行 `{ id, title, status, label, revision, updatedAt }`（`attention_id` → `id`、`descriptor.title` → `title` 的改名照实记）。`attentionLabels` 一并补入契约，因为它是被 `attention-view.mjs:2` 直接 import 的已发运导出，且两个形状都指向它 |
| `HomeAttentionDetailProjection` + `toHomeAttentionDetail(data) → … \| null` | `:242-254` | `{ descriptor:{title, summary\|null}, status, reason, next_action:{kind, label, trigger, due_at\|null}, updated_at, revision, freshness }`。`kind` 五值、`trigger` 四值、`freshness` 二值均照实闭集 |

三个签名的入参一律写 `data: unknown`，因为实现的第一件事就是逐字段校验并在不认时返回 `null`；写成一个「正确的响应类型」会把校验说成多余的。三者的 `null` 语义在契约里写成「这一包不可投影」，与规则 2 / 规则 4 同源。

### 头部改动

- 三条规则改四条，第四条是「投影不得创造事实」（WK-139 (c)），并点名机械可查的部分由 `tools/lint-interaction.mjs` 守住、其余由评审承担。
- 加辖区说明（WK-148 (c)）：本契约只覆盖 Home 与 Usage 的 adapter；`inspector.mjs` / `workspace-view.mjs` / `runtime-view.mjs` / `telemetry-view.mjs` 直读 DTO 是既定架构，四条规则对它们同样适用，但由评审而非类型承担。
- 文件第一行原写「WK-34 限六种」。六种里删了三种，故改为「WK-34 / WK-37 定名；WO-PG-01 按 WK-148 以代码为准收敛」，并补一段说明哪三节因何删除——这是出处交代，不是占位。
- **辖区说明的一处措辞留痕**：WK-148 (c) 与工单都写「Home 与 Usage」，但事实上 `presentation-adapters.mjs` 今天**只有 Home**；Usage 一侧的纯函数（`modelSeries` / `validUsageDetails`）住在 `app/web/usage-projection.mjs`，不在本契约里。故辖区句照裁定写「Home 与 Usage」，并加一句点明 Usage 的函数住在哪、本文件不为其冻结形状。是否要把 `usage-projection.mjs` 也收进本契约，留裁定。

## 5. 裁定未预料到的发现

### (a) 第三、第四个 element builder（工单专门问的一项）

EX-PG1 / WK-145 记的是「两个 element builder 共存」（`ui-controls.mjs:11` 的 `el` 与 `app.mjs:230` 的 `element`）。实际是 **四处**，但后两处与前两处不同类：

| 位置 | 是什么 | 对本 lint 的影响 |
|---|---|---|
| `app/web/ui-controls.mjs:11` `export function el(tag, {className,text,attrs}, ...children)` | DOM builder，导出 | 已覆盖 |
| `app/web/app.mjs:230` `function element(tag, options = {}, ...children)` | DOM builder，本地别名 | 已覆盖 |
| `app/web/markdown-source.mjs:24` `const element = (tag, children, attrs = {}) => ({tag,children,...attrs})` | **不是 DOM builder**：产出一棵纯语义树（普通对象），供 Markdown 阅读器消费，`projectMarkdown` 的注释逐字写「Produces a closed semantic tree, not HTML」 | 名字与检查项撞车，但同名同形。本 lint 的 `el\|element` 正则对它同样生效，属**有意的过度覆盖**：若有人在这里造出 `element('meter', …)`，下游 reader 也会试着渲染，抓到它是对的 |
| `app/web/markdown-reader.mjs:15,33` `doc.createElement(tag)` / `doc.createElement(node.tag)` | **动态标签**的 DOM 创建，标签来自上面那棵语义树 | **正则抓不到**（标签是变量不是字面量）。但这条路径有一道更硬的闸：`markdown-reader.mjs:4` 的 `ALLOWED_TAGS` 是一个 24 项闭集，`progress` / `meter` 均不在内，不在集内的节点被降级为纯文本。所以这处**不是漏洞，是被闭集守住的**，无须登记，也不建议为它写检查项——该守的是那个闭集 |

结论：WK-145 「两个 element builder 共存，是 CC-I 之前要收的一笔」这句仍成立，但收拢时要知道另有一个同名的**语义树** builder（`markdown-source.mjs`）与一个**动态标签**的 DOM 出口（`markdown-reader.mjs`），三者不是一件事，别一并改名。动态标签这条路径是本 lint 的字面扫描原理性够不到的地方，今日由 `ALLOWED_TAGS` 承担——若将来有人放宽那个闭集，本 lint 不会报警。这一点值得写进 atlas 或 CC-I。

### (b) `app/web/index.html` 不在扫描范围内

工单指定「无参数时扫描 `app/web/**/*.mjs`」，照办。但 `index.html` 里有静态标记（`:296` 有 `Run in progress — your input will not be sent automatically.` 这类可见文案），今天没有 `<progress>` / `<meter>`，但它不在本 lint 的默认扫描面上。`lint-colors.mjs` 的默认面是 `.css` / `.mjs` / `.html` 三种。是否把 `.html` 也纳入本 lint 的默认面，留裁定——本单不擅自扩大扫描面。

### (c) 注释剥离逻辑今日未被真实代码检验

见 §2 末。真实 `app/web` 剥不剥注释都是零命中，所以那段状态机今天只有夹具在检验它。记此一笔，是为了不把「ok」读成「注释剥离已在产品代码上验证过」。

### (d) 同一个 adapter 文件里两种字段命名并存

`toHomeAttention` 把服务端字段改写成 camelCase（`attention_id` → `id`、`updated_at` → `updatedAt`），紧邻的 `toHomeAttentionDetail` 却整段保留 snake_case（`next_action` / `due_at` / `updated_at`）。两者是同一个对象的列表投影与详情投影，消费方也重叠（`home-view.mjs` 与 `attention-view.mjs` 都用）。本单按「以代码为准」逐字照录，未统一，也未在契约里把其中一种说成规定；契约里加了一句点明这是现状而非规定。要不要收敛留裁定——收敛要动 `app/web/**`，在写权外。

### (e) `presentation-primitives.d.ts` 的零约束力

见 §4 开头。这不是本单能改的事（加类型检查会动 `app/package.json`，在写权外），但值得登记：一份没有任何检查在跑的 `.d.ts` 会再次名不副实，本单只是把它对齐到今日，没有装上让它保持对齐的东西。可选的最小做法是给 `app/tests/` 加一个断言导出清单与契约一致的测试——那需要 `app/**` 写权，不在本单。

## 6. 本单明确没有做的事

- **未改任何产品代码**：`app/web/**`、`app/core/**`、`site/**`、任何 `evidence/` 目录零差异。三项检查在真实代码上零命中，没有出现「要么改产品要么加登记」的两难，因此也没有为让 lint 通过而动过产品或往登记表里塞条目——**登记表交付时是空的**。
- **未新增依赖**，无 npm 包，原生 Node ESM，未跑真实 provider，未部署。
- **未进 Home backlog 的 composer 队列**，未抢 Astra 的单一 writer（WK-149 (f)）。
- **未宣称四条负规则已全部被代码检验**。本 lint 只覆盖 WK-146 允许机械检查的两条半：`running ≠ progress` 与 `estimate ≠ meter` 的元素/角色/`aria-valuenow` 形式、`numeric ≠ slider` 的空集守恒。`complex ≠ graph`（今日无拓扑对象，**不适用**）与 `high-risk ≠ confirm dialog`（由 [review-projection §6](contracts/review-projection.md)、无 Always allow、WK-122 承担）**不进 lint**，仍是评审判据。且 `numeric ≠ slider` 今日仍是**空集**而非已验证合规——lint 守的是空集不被悄悄破掉，不是这条规则已被检验（WK-146 三态记法）。
- **未改 atlas**、未改 `intake-round-3.md`、未改 `current.md`，未合并、未 rebase、未推送。
- **未扩大扫描面到 `.html`**、未为 `markdown-reader.mjs` 的动态标签路径写检查项，两处都只记在 §5。

## Fable 复核补（同分支，2026-09-10）

Fable 读码 + 独立重跑（自造 7 处反例全部命中、注释行不误报、真实扫描 ok），接受本单，并就地补两项——都来自本单交付说明里自己指出的两处空隙：

1. **扫描面加 `.html`**：`lint-colors.mjs` 本来就扫 `.html`，本 lint 没有理由只看 `.mjs`。`index.html:296` 的可见文案 "Run in progress" 不含 `<`，不被 `<progress` 命中，实测仍 ok（23 files）。HTML 只剥 `<!-- -->`，不套 JS 状态机。
2. **第四项检查：`ALLOWED_TAGS` 闭集**。`markdown-reader.mjs:15` 的 `doc.createElement(node.tag)` 是变量 tag，正则永远够不着；守它的是 `markdown-reader.mjs:4` 那个 24 项闭集。闭集本身可以字面检查——一旦有人往里加 `progress` / `meter`，前三项会全程沉默。反例（闭集里塞 progress / meter）逐条命中。

命令与输出：`node tools/lint-interaction.mjs` → `ok (23 files · …四项 · 登记例外 0 条)`；反例 `b.mjs`（闭集）2 处、`c.html` 3 处、`a.mjs`（三项六形）7 处，均 exit 1。

未采纳/未处理：`toHomeAttention` 的 camelCase 与 `toHomeAttentionDetail` 的 snake_case 不一致是真的，但收敛它要动 `app/web`，归 CC-I 整备（WK-151），本单不扩。`markdown-source.mjs` 的 `element()` 是语义树构造器不是 DOM builder，与 `el()` / `app.mjs` 的 `element()` 不是同一类东西，WK-145 那条"两个 element builder"的收敛不把它扫进去。
