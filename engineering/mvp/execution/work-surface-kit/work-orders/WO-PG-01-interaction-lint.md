# WO-PG-01 · Interaction Grammar lint 与投影契约收敛

派单人 Fable，执行 `opus-wo-medium`，基线 main `5b405b3`。裁定依据 [intake §4ar / §4as WK-139…149](../intake-round-3.md)，现状事实见 [EX-PG1](../explore/ex-pg1-projection-inventory.md)，段落见 [atlas Projection / Control Grammar](../../../../design/atlas/README.md)。

## 0. 写权与红线

- 隔离工作树 `/private/tmp/se-agent-pg01`，分支 `claude/pg01-interaction-lint`，从 `5b405b3` 起。
- **写权仅限**：`tools/lint-interaction.mjs`（新建）、`tools/README.md`（加一行）、`engineering/mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts`、本单交付文档 `engineering/mvp/execution/work-surface-kit/delivery-pg-01.md`、以及自测夹具（放在工作树内 `/private/tmp/se-agent-pg01-fixtures/`，**不入库**）。
- **不得触碰 `app/web/**`、`app/core/**`、`site/**`、任何 evidence 目录**。Home backlog 的单一 composer writer 是 Astra，本单不进那条队列，不改任何产品行为。
- 不新增依赖，不引 npm 包，原生 Node ESM。不运行真实 provider，不迁移个人数据，不部署。
- 若发现某条检查会让当前 `app/web` 失败，**先停下来在交付文档里记下这一处并说明**，不要为了让 lint 通过去改产品代码，也不要把该处静默加进登记表——登记表条目必须是裁定过的例外，不是绕过。

## 1. `tools/lint-interaction.mjs`

形式沿 [`tools/lint-materials.mjs`](../../../../../tools/lint-materials.mjs) 的既有先例：文件头注写清它检查哪条裁定、登记表在文件里、只看字面事实、`node tools/lint-interaction.mjs [files...]` 无参数时扫描 `app/web/**/*.mjs`（跳过 `vendor` / `node_modules`）、逐条打印问题、有问题 `process.exit(1)` 并打印计数、通过时打印一行 ok 摘要。中文注释与信息，与既有两个 lint 同register。

三项检查（WK-146，只做机械可查的）：

1. **`running ≠ progress` / `estimate ≠ meter` 的元素与角色**：`app/web` 内不得创建 `progress` 或 `meter` 元素（`el('progress'…)`、`element('meter'…)`、`createElement('progress')`、字面 `"<progress"` 等形式都要能抓到——注意 `app.mjs` 有本地别名 `element()`，两个 builder 都要覆盖），不得声明 `role="meter"` 或 `role="progressbar"`，不得出现 `aria-valuenow`。
2. **`numeric ≠ slider` 的空集守恒**：不得出现 `input` 的 `type` 为 `range` 的写法（`type: "range"` / `type:'range'` / `type="range"` 三种字面形式）。
3. **登记表**：以上任一命中都必须在文件顶部的 `REGISTERED` 表里有一条条目才允许通过，条目形如 `[<文件相对路径>:<语义键>, { rule, fact, reason }]`，其中 `fact` 必须指向一条**已测量的 owner fact**（对 meter 类需要 current 与 limit 同口径）、`reason` 是一句裁定出处。**本单交付时该表应为空**——今日 `app/web` 对这三项零命中（EX-PG1 §3 Q1），空表加上"表外一处即失败"就是这条裁定的冻结形式。表为空时 ok 摘要要明确说出"登记例外 0 条"。

允许的实现取巧：正则扫描源码字面量即可，不要引入 parser；但要避免把注释里的字样误判为代码——注释中出现这些词是合法的（现有代码里就有多处解释性注释），把行内 `//` 与块注释剥离后再匹配，并在文件头注里写明这条取舍。

自测（不入库，结果写进交付文档）：在 `/private/tmp/se-agent-pg01-fixtures/` 造至少 6 个反例文件，三项检查各两种写法（含 `element()` 别名与 `type:'range'` 单引号形式），证明每一种都会被抓到；再造一个"命中 + 登记表有对应条目"的正例，证明登记后放行。用 `node tools/lint-interaction.mjs <fixture files...>` 逐个跑，把命令与输出抄进交付文档。最后对真实 `app/web` 跑一次无参数扫描，必须 ok。

`tools/README.md` 的表格加一行：`node tools/lint-interaction.mjs` → 交互语法负规则检查（WK-140 / WK-146）。

## 2. `contracts/presentation-primitives.d.ts` 收敛（WK-148）

契约今日名不副实：heatmap 段仍写着"gap: 待后端、产品内只允许渲染 Planned · Backend pending 文字行"，而 `/work-activity` 已上线、`home-view.mjs` 已用不在契约里的 `toHomeActivity` 渲染真 heatmap；`toRunSummary` / `toFileList` / `toWorkspaceList` / `toHeatmap` 四个签名从未被实现。按事实收敛：

- 删除过时的 gap 注释与从未实现的四个签名。**不留兼容层、不留"将来会实现"的占位注释**（项目原则：移除过时路径而不是保留）。
- 补入已发运的 `toHomeActivity` / `toHomeAttention` / `toHomeAttentionDetail` 三个签名，形状以 `app/web/presentation-adapters.mjs` 的实际返回为准，逐个字段对照，不要照抄想象的形状。
- 契约头部那三条规则（服务器 UTC 原样透传 / 缺失是显式 `null` / adapter 纯函数）保留并加第四条：**投影不得创造事实**——没有 unit / scope / timezone 就不投影（WK-139 (c)）。
- 加一句辖区说明：本契约只覆盖 Home 与 Usage 的 adapter；`inspector.mjs` 等 view 直读 DTO 是既定架构（WK-148 (c)），那四条规则对它们同样适用，但由评审而非类型承担。
- 该文件是否被任何代码 import、有无类型检查在跑，先查清楚再改；如果它今天只是文档性质的 `.d.ts`，在交付文档里如实说明这一点。

## 3. 交付文档 `delivery-pg-01.md`

一页：基线 SHA、两项改了什么、自测命令与输出（含反例逐条命中与真实扫描 ok）、`presentation-primitives.d.ts` 逐个签名的处置（删 / 留 / 新增，各一句依据）、发现但未处理的事情（尤其若发现第三处 element builder、或某条检查在真实代码上有命中）、以及本单明确**没有**做的事（未改产品代码、未新增依赖、未进 composer 队列、未宣称四条负规则已全部被代码检验）。

## 4. 验收

- `node tools/lint-interaction.mjs` 对真实 `app/web` 通过，登记例外 0 条。
- 反例夹具逐条被抓到，正例被放行。
- `node tools/check-doc-links.mjs` 通过。
- `node tools/lint-colors.mjs`、`node tools/lint-materials.mjs` 仍通过（本单不应影响，但要跑一次证明没碰坏）。
- `git status` 只有写权范围内的文件；夹具不在库内。
- 提交信息用英文祈使句，与仓库现有 `docs:` / 产品提交风格一致。
