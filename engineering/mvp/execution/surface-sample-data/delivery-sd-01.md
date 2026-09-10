# 交付 WO-SD-01：Spark 样本面

作者：Claude Sonnet（本单前端唯一 writer）。作者验证，非独验；独验与合流归 Astra。
日期：2026-09-10。树：`/private/tmp/se-agent-sd01`，分支 `claude/sd01-spark-sample`。
全程 local-fake / loopback，未联网，未读取任何凭据文件。BE-41 在本基线上确未实现——每一次
`/work-derivations` 探测在真实后端上都是真的 404，不是伪造的。
证据目录：[`evidence/sd-01/`](../../../../evidence/sd-01/README.md)。

## 1. 基线与提交

| 项 | 值 |
|---|---|
| 基线 SHA | `9c8b64e`（`docs: accept five independently verified deliveries and reconcile main evidence`） |
| 分支 | `claude/sd01-spark-sample` |
| 分支 HEAD | `48d17ff` |

### 1.1 commit 表

| SHA | 标题 |
|---|---|
| `3baeffd` | `infra: move Spark sample fixtures to app/web/samples and serve them (SD-18)` —— `git mv` 五份 fixture，`spark-projection.test.mjs` 改读新路径，`app/server/index.mjs` 加唯一一行 |
| `dde2721` | `feat: let Spark show a sample maintenance scenario while unimplemented (WO-SD-01)` —— `spark-view.mjs` 实现，`styles.css` 一行 |
| `3e614b4` | `test: cover WO-SD-01's sample-state control flow and static route` —— `spark-view.test.mjs` 新增 14 条，新文件 `spark-samples.test.mjs` 3 条 |
| `48d17ff` | `test: record WO-SD-01 author verification and browser evidence` —— `evidence/sd-01/**` |

作者验证的三条命令与十条浏览器断言跑在 `48d17ff` 的树上（即本表最后一次提交，`npm ci`/`test`/`smoke`
在其之前一次干净重跑，日志落 `evidence/sd-01/`；浏览器断言同样在这棵树上单独重跑一次，结果同样落盘）。

## 2. 改动文件

| 文件 | 性质 | 做了什么 |
|---|---|---|
| `app/web/samples/spark-derivations/{stale,quiet,empty,partial,truncated}.json` | 移（`git mv`，字节未改） | SD-18：从 `app/tests/fixtures/spark-derivations/` 移入，成为产品资产 |
| `app/server/index.mjs` | 改（**唯一一行**，见 §3） | 在 STATIC 处加一行循环登记这五个 JSON 文件的路由 |
| `app/web/spark-view.mjs` | 改 | 样本态的入口、header、场景切换、只读渲染、与 `load()` 的原子切换逻辑（§4） |
| `app/web/styles.css` | 改（只增一行） | `.spark-sample-label`，量度同 `.form-help`，色用 `--muted-strong`，无新色 |
| `app/tests/spark-projection.test.mjs` | 改（仅路径） | fixture 读取路径改为 `web/samples/spark-derivations/` |
| `app/tests/spark-view.test.mjs` | 改（新增 14 条用例） | §5 |
| `app/tests/spark-samples.test.mjs` | 新增（3 条用例） | §5 |
| `evidence/sd-01/**` | 新增 | 浏览器断言、fixture 无关的截图、日志 |
| `engineering/mvp/execution/surface-sample-data/delivery-sd-01.md` | 新增 | 本页 |

未改：`app/web/app.mjs`（硬性要求）；`app/web/spark-projection.mjs`（DTO 与其校验逻辑原样，样本态复用同一
`validSparkDerivations`，未新增字段）；`contracts/*`；`docs/work-core/**`；任何其它 `app/server` / `app/runtime`
/ `app/core` 文件；未新增任何依赖。

### 2.1 `index.mjs` 唯一一行

紧接在既有 `STATIC.set("/web/vendor/icons.svg", ...)` 之后、`Brand merge gate 3` 注释之前：

```js
for (const name of ["stale", "quiet", "empty", "partial", "truncated"]) STATIC.set(`/web/samples/spark-derivations/${name}.json`, {file:path.join(APP_ROOT,"web","samples","spark-derivations",`${name}.json`),type:"application/json; charset=utf-8"});
```

（前一行是一句解释性注释，不计入这"一行"；上面这一条 `for` 循环语句本身是唯一的功能性改动。）

## 3. 文案全表（SD-17，逐字）

| 角色 | 文案 | 出现位置 |
|---|---|---|
| header 标签 | `Sample data` | 样本态 header，灰字（`.spark-sample-label` / `--muted-strong`），恰一次，无图标 |
| 入口 | `Show sample data` | 仅 `unimplemented` 态，紧跟 "No source yet. This runtime has no maintenance source connected here." 之后 |
| 退出 | `Hide sample data` | 样本态 header 行内 |
| 再探 | `Check for a source again` | 样本态 header 行内，触发既有 `load()` |
| 场景 select `aria-label` | `Sample scenario` | 五项：`Stale` / `Quiet` / `Empty` / `Partial` / `Truncated`，默认 `stale` |

未使用 "Preview"（EX-SD1 §④已裁定该词被 Appearance 的实时预览占用）。样本态下 matter 标题渲染为纯文字，不
新增任何提示语（与 SD-6/SD-19 的"不逐卡标注"一致）。

## 4. 状态机（对照 §3 契约文本逐句核对）

| 契约条款 | 落地 |
|---|---|
| `sample ⇐ unimplemented(404) ∨ explicit preview` | 入口仅在 `unimplemented` 分支渲染（`spark-view.mjs` `renderContents` 的 `if (unimplemented)` 块内，别无它处） |
| `live ⇐ any valid live payload, empty included` | `load()` 的成功分支（非 rejected-snapshot 的 `else`）无条件 `sample = false; sampleData = null;`，不判断 `matters.length` |
| `live ∩ sample = ∅` | 见上；`renderContents` 里 `if (sample && sampleData)` 分支先于一切其它分支检查并 `return`，两者不会同屏 |
| `error after live ⇒ error state; never sample` | `load()` 的 catch 里，非 404 分支同样清空 `sample`/`sampleData`，路由到既有 error 文案 |
| 404 留在样本态 | `load()` 的 catch 里，`e.status === 404` 分支不触碰 `sample`/`sampleData` |
| 标签一次、字先于形、不着色不用图标 | `sampleBar()` 是唯一构造该标签的位置，`.spark-sample-label` 只设字号与 `--muted-strong` |
| 只读出口在 `chooseAction`/`submitAction` 到 `mutate` 之间 | 不适用于 Spark——Spark 全面只读，没有 `mutate()`；样本态额外把 `onOpenMatter` 的调用点本身short-circuit 成纯文字渲染，是这条规则在只读面上的对应形态 |
| 入口不新造全局开关，会话内有效、不持久 | `sample`/`sampleScenario`/`sampleData` 是 `createSparkView` 闭包内的普通变量；没有 `localStorage`/`sessionStorage`/URL 参数；刷新页面即回到 live 判定 |
| 默认场景 `stale` | `let sample = false, sampleScenario = 'stale', sampleData = null;` |
| 分页状态不覆盖样本态 | 样本分支 `return` 早于分页器代码；五份 fixture 本身也无一触发分页（SD-11，`page.total ≤ limit`） |
| 切换项目回到 live 判定 | 项目 select 的 `change` 处理器显式 `sample = false; sampleData = null;` 再 `load(0)` |

## 5. 新增用例原文

`app/tests/spark-view.test.mjs`（14 条，`SD-01 ·` 前缀）与 `app/tests/spark-samples.test.mjs`（3 条新文件，
`WO-SD-01 ·` 前缀）逐条原文见对应文件；不在此重复全文，标题摘录：

1. `createSparkView` 冻结签名不变——样本不引入新依赖、新参数
2. 样本 fetch 读静态样本路由，从不打 `/work-derivations`
3. `Show sample data` 剔除注释后代码中恰一次，且只出现在 `unimplemented` 分支内
4. header 标签 `Sample data` 剔除注释后恰一次；未经过带图标的 `action()` 辅助函数
5. 场景 select 恰好五项、默认 `stale`
6. 退出/再探文案与 SD-17 逐字一致；样本区域不出现 "Preview"
7. 样本行只读：`matterRow` 与 Activity 小节标题都在调用 `onOpenMatter` 前先判 `readOnly`
8. `load()` 在任何有效 live 载荷（含空集）与任何非 404 错误时丢弃样本态，唯独 404 时不丢
9. 样本从不自行发起 `/work-derivations` 请求——只有 `load()`（经 `request()`）会打这个端点
10. 切换项目的 change 处理器在触发实时探测之前先清空样本态
11. 样本分支先于其它一切渲染分支被检查，并在分页器代码之前 `return`
12. 样本渲染复用 `renderOverview`/`renderActivity`——没有第二套渲染器
13. `styles.css` 只新增了样本行需要的那一条规则，颜色只用 `--muted-strong`
14. 静态白名单精确登记了这五个 JSON 文件，且使用 JSON 的 content type
15.（`spark-samples.test.mjs`）真实服务器上 `GET /web/samples/spark-derivations/<name>.json` 对五个场景全部
    200，内容与磁盘逐字节相同，且仍能通过 `validSparkDerivations`
16.（同上）白名单是字面清单：未登记的名字、裸目录、`../` 穿越尝试全部 404
17.（同上）`app/tests/fixtures/spark-derivations/` 目录已不存在

`spark-projection.test.mjs` 仅改了一处 fixture 读取路径（`tests/fixtures/spark-derivations/` →
`web/samples/spark-derivations/`），其余 25 条既有用例逐字未动、逐条仍通过。

## 6. 作者验证原文

| command | concurrency | SHA |
|---|---|---|
| `npm --prefix app ci` | 单进程（npm 自身的包安装并发，非测试相关） | `48d17ff` |
| `npm --prefix app test` | `node --test tests/*.test.mjs ../tests/*.test.mjs`（node:test 默认并发） | `48d17ff` |
| `npm --prefix app run smoke` | 单进程 | `48d17ff` |

**结果**（干净重跑：数据目录清空重建，服务已停止，8919 / 19919 已释放）：

| 检查 | 结果 | 落盘 |
|---|---|---|
| `npm --prefix app ci` | 277 packages, 0 vulnerabilities | `evidence/sd-01/npm-ci.log` |
| `npm --prefix app test` | **660 / 660**，fail 0（较基线新增 17 条，全部命名在 §5） | `evidence/sd-01/npm-test.log` |
| `npm --prefix app run smoke` | `{"status":"passed","provider":"local-fake","realProvider":"not_run"}` | `evidence/sd-01/smoke.log` |
| 浏览器断言 SD01-1…10（`evidence/sd-01/checks.mjs`，headless Chromium，真服务器） | **10 / 10**，`pass: true` | `evidence/sd-01/checks.log`、`checks.json` |
| 截图（1440 宽，light） | `spark-sample-stale-1440-light.png`（样本态 `stale`）、`spark-live-empty-1440-light.png`（切回 live 空态）；另有一张非必需的 sanity 截图 `no-entry-before-check.png`（`unimplemented` 态本身） | `evidence/sd-01/*.png` |

本轮全量测试中另两个测试文件（`lifecycle.test.mjs` 的 `T-USAGE-5`、`run-lineage.test.mjs` 的
`BG02-T1/T7`）在本单动工前的一次探索性全量跑中各超时失败过一次；两者都是计时敏感的用例，与本单改动的文件
（`app/web/spark-*`、`app/server/index.mjs` 的这一行、`app/tests/spark-*`）无引用关系，单独重跑两个文件后全部
通过（`18/18`，日志未留档，因为它先于本单最终一次干净重跑），本页记的 660/660 数字是干净重跑的真实结果，两个
计时用例这次也在其中且通过。如实记录这段插曲，而不是略去。

## 7. anti-slop 门自查

| 门 | 自查 |
|---|---|
| 不画后端没有的东西 | 样本文案不出现任何数字断言之外的合成描述；README 明写 BE-41 未实现，`unimplemented` 判定读的是真实 404 |
| 不改写既有文案 | "No source yet. This runtime has no maintenance source connected here." 与既有四态文案一字未改；SD-17 的四个新词逐字照裁定实现 |
| 不放宽断言 | `spark-projection.test.mjs` 的 25 条既有断言仅路径变化，判断逻辑逐字未动；`spark-view.test.mjs` 的既有 11 条一字未改 |
| 不引新色新图形 | `styles.css` 只加一条规则，复用 `--muted-strong`；样本标签无图标（`action()` 未被样本代码调用，见用例 4） |
| 不引依赖 | `app/package.json` 零改动；样本 fetch 用全局 `fetch`，不是新 import |
| 不越写权 | `app/web/app.mjs`、`app/web/spark-projection.mjs`、`contracts/*`、其它 `app/server` 文件零改动；`index.mjs` 只改了工单允许的那一行 |
| 不写第二套渲染器 | 样本态复用 `renderOverview`/`renderActivity`，用例 12 钉死这一点 |
| 样本与 live 不合并、不回落 | §4 状态机逐条对照；用例 8 钉死 |
| 证据可复核 | 浏览器断言、日志、截图、JSON 全部落 `evidence/sd-01/`；脚本、命令、复跑步骤见 `evidence/sd-01/README.md` |

## 8. 待裁定

① **`no-entry-before-check.png` 是否也要算进"两张截图"**。工单只点名了样本态（stale）与切回 live 空态两张；
本单额外拍了 `unimplemented` 态本身一张作 sanity（证明入口确实只在该态出现，且与另外两张的取景一致），不计入
工单的"两张"，也未替代任何一张。若认为多余，删除不影响任何断言。

② **`Show sample data` / `Check for a source again` 在网络延迟下的中间态**。当前实现：点击"Show sample data"
期间不显示任何加载态（本地静态文件读取通常极快）；点击"Check for a source again"期间样本内容保持不变，仅该
按钮本身禁用（`check.disabled = loading`）。工单与 SD-1…19 均未对这段中间态提出具体要求，本单按"最小可行实
现"处理，未新增 loading 文案或骨架屏。是否需要更明确的进行中反馈，请裁定。

③ **场景 select 的显示文案是英文首字母大写（`Stale`/`Quiet`/…）**。SD-17 只裁定了 header/入口/退出/再探四句
的确切文案，未裁定五个场景名的显示文案；本单取 fixture 文件名首字母大写作为最小实现。若需要更具描述性的场景
标签（例如把 `stale` 显示为更完整的一句话），请裁定具体文案。

## 9. 未检项

- **真实 provider `not_run`**：未持有任何真实 key，未读取任何凭据文件（含 `~/.pi/agent/auth.json`），未联网。
- **Astra 合流时的 SP-13 编号**：SD-16 已记"请 Astra 在合流时以 SP-13 记录该修订"——本单不代写该编号，只在
  代码与本页里引用 SD-16 的裁定文本。
- **移动视口与暗色模式下的样本 header 行**：本单未新增任何断言检查 `.spark-sample-bar`（其实是复用
  `.spark-controls`）在 390 宽或暗色下的几何或对比度；`styles.css` 唯一新增的 `.spark-sample-label` 规则未引入
  任何新色，理论上继承既有 `@media(max-width:600px)` 的 `.spark-controls` 规则，但未拍窄屏截图验证。
- **`browser-checks.mjs`（`evidence/delivery-rollup-20260910/spark/independent-verify-repair-20260910/`）的
  改造**：intake.md 已把这一项登记为"后续项"（"可改为点击入口而非注入 mock"），本单未动它——它在别的证据目
  录下，不在本单写权范围内，也不影响本单的验收。
- **WO-SD-02（Attention 样本集）**：本单完全未涉及，按工单"不做 Attention"的边界。
- **`spark-projection.mjs` 是否需要改动**：工单允许"如需"，本单判断不需要——样本payload 与 live payload 走
  同一个 `validSparkDerivations`，DTO 未新增字段，因此该文件零改动。
- 未改动本树以外的任何目录；本单启动的两个进程（server 8919、headless Chrome/CDP 19919）均已停止并释放。
