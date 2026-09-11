# Spark 集成裁决 · SP-1…SP-13

产品基线 main `0c60f4f`。样本基线为 `codex/multi-experts-longlife-20260910` 的 `852bd3e`，其产品基线 `8b1e0b1`。本页只作裁决与接单边界，不含实现；SP0 样本的 [README](../../../evidence/delivery-rollup-20260910/spark/source-852bd3e/README.md.txt)、[projection-contract](../../../evidence/delivery-rollup-20260910/spark/source-852bd3e/projection-contract.md.txt) 与 [construction-handoff](../../../evidence/delivery-rollup-20260910/spark/source-852bd3e/construction-handoff.md.txt) 仍为输入，本页在其上收窄。

## 基线核对

`docs/work-core/**` 自 `8b1e0b1` 至 `0c60f4f` 零改动，故样本对 Core 与 Attention 契约的读取仍然有效。`app/web/**` 有实质变化，其中 `coordination-view.mjs` 与 `coordination-projection.mjs` 为该区间新增，共约 503 行；样本未评估其布局与语义，见 SP-8。

## SP-1 · 导航位置

Spark 与 Attention 同级的位置成立为设计候选，写入侧栏推迟至第一类维护事实具备只读来源之后。

侧栏当前顺序为 New chat、Home、Attention、查找、Projects（[index.html:110](../../../app/web/index.html)、[:116](../../../app/web/index.html)、[:119](../../../app/web/index.html)、[:120](../../../app/web/index.html)），Attention 之后即样本所指的那一格。现在入栏只能投影 Run 派生的 activity 与 usage，而这两项已由 Home 承担（[presentation-adapters.mjs:198](../../../app/web/presentation-adapters.mjs)、[:232](../../../app/web/presentation-adapters.mjs)、[usage-view.mjs:4](../../../app/web/usage-view.mjs)）：既是重复入口，也以 Spark 之名承担尚无 owner 的责任。[roadmap.md](../../roadmap.md) 已定"不因名称另建 canonical store"，入口同此。

## SP-2 · 第一类维护事实取派生失效，不取 source check 次数

Core 已持有构成该事实的全部字段：candidate 表的 `source_version`、matter 的 `source_version`（[core.py:187](../../../app/core/core.py)、[:222](../../../app/core/core.py)、[:470](../../../app/core/core.py)）、`source_set` 与带保留触发器的 `source_history`（[core.py:198](../../../app/core/core.py)、[:207](../../../app/core/core.py)、[:213](../../../app/core/core.py)）。`replace_sources` 要求 revision 递增且源字节不可变，旧候选保留可读但对后续决定为 stale；`decide` 仅对 source 仍与当前 Matter 匹配的候选开放（[contract.md](../../../docs/work-core/contract.md) 动作表与准入段）。

派生失效因此是当前状态量：`candidate.source_version < matter.source_version` 即该派生物落后于现行源集修订，其差集可由 `source_history` 复原。它不需要时钟、调度器或新表，可由现有 Core 事实完全导出。

SP1-A 原拟的"一类 source check"要求发生时间与覆盖率。main 上的 source resolver 为 inspect-only，无留存记录，无法给出窗口与覆盖率，故本轮不取。

## SP-3 · BE-41：Matter 范围的派生失效只读投影

该事实今日不可跨 Matter 读取。`GET /api/v5/projects/:id/work` 经 `list_work` 只回 matter 视图，不含 candidates（[bridge.py:911](../../../app/core/bridge.py)）；candidates 仅出现在 `GET /sessions/:id/surface`，须有 session 的 extension binding（[service.mjs:1101](../../../app/server/service.mjs) 与 [index.mjs:153](../../../app/server/index.mjs)）。Spark 的读面按 Matter 组织，不按 session，故需一条新的只读投影。

BE-41 最小责任：

- 输入为 project 范围，权限沿现有 project 归属检查，不扩大 scope。
- 每个 Matter 返回 `matterId`、`title`、`version`、`sourceVersion`，以及按 candidate status 分组的失效计数与 refs（`candidateId`、候选 `source_version`、当前 `source_version`）。
- 返回当前源集修订与其前一修订的成员差，取自 `source_history`。
- 每个数值带 `asOf` 与 coverage；无记录与零须可区分。
- 不新建表、不写入、不要求 producer 加载、不要求 session 绑定、不引入 Spark 私有 store。

未交付前 SP1-FE 无真实数据源。

## SP-4 · SP1-FE 的可见面

收为两页。Overview 只放派生失效与 Attention `needs_you` 引用；Activity 放同一事实的逐条记录与过滤。Reports、Context path、Work mix 撤下，其字段在 main 上无对应真源。Usage 不进 Spark，已有 owner。

## SP-5 · 控件可执行清单

本片无可执行控件，全部只读。

可借既有 owner 行为、但本片不做：Attention 的九类 typed human action 有真实实现与 HTTP 入口，含 `expected_revision` 的 CAS 与 `request_id` 幂等回执（[attention.md](../../../docs/work-core/attention.md) 路由表与动作表）。Spark 行只跳转至对应 Attention 项，不在 Spark 内 resolve 或新建事项。

因无 owner 不展示，且不留空 tab：

| 控件 | main 现状 |
|---|---|
| Run now / schedule | `capabilities.scheduler` 为 false（[service.mjs:428](../../../app/server/service.mjs)），无可开启的代码路径 |
| Paused | 无该字段与状态 |
| Budget | 仅有 Run 级 `maxTurns` 与 `deadlineMs` 的宿主限制，与样本所画的模型额度语义不同 |
| Retention | 仅有条数上限，无可配置保留期策略 |
| Model tier / fallback | 无 operation policy 分类 |
| Full-content opt-in | 无 capture 合同 |
| Ask about this | 依赖无项目 Chat 创建（BE-23）；`createSession` 现强制 `projectId`（[service.mjs:560](../../../app/server/service.mjs)） |

## SP-6 · 交互契约

只读，无 mutation，不申请新权限。每个数值携 [projection-contract](../../../evidence/delivery-rollup-20260910/spark/source-852bd3e/projection-contract.md.txt) 的 Measurement envelope，`availability` 区分 observed、estimated、partial、unavailable；缺测显示 Unavailable，不涂为零。列表按 project 权限过滤，分页与下钻携同一 snapshot 与 filter；源版本或权限变化时拒绝旧观察或显式失效。行的点击进入既有 Work 面，不新建面。明暗、390 宽度、键盘焦点与错误保留草稿沿现有 grammar。

## SP-7 · 场景收敛

S3 source drift 为主场景。S0、S2、S4、S5、S8 可由真实数据表达。S1 保留，其 working 状态取自 Run，仍不画无分母的进度。S6 budget 与 S7 paused 撤下。

## SP-8 · 接单前置

`coordination-view.mjs` 与 `coordination-projection.mjs` 为样本基线之后新增，样本未评估。Luna 接单前须先核对 Spark 读面与其在布局、路由与语义上是否冲突，结论写入交付。

## SP-9 · 施工顺序

BE-41 由 Astra 实现，含测试与非作者验证；SP1-FE 由 Luna 单 writer 实现，写权限于 `app/web`；Astra 合流、补衔接代码并撰写 PR；再由未参与该代码的 Luna 独立验证。SP0 样本作视觉与交互参考，不整页搬入。

BE-41 未交付前不派 SP1-FE。

## SP-10…SP-12 · 用户裁定后的修订（2026-09-10）

用户裁定：前端先用合成数据施工，真实 run 覆盖后置。以下三条覆盖前文对应部分。

**SP-10 覆盖 SP-1。** Spark 本轮进入侧栏，位置在 Attention 之后、查找之前。SP-1 推迟入栏的理由是与 Home 的 activity/usage 重复；SP-2 把内容收为派生失效之后该重复不再存在，理由消灭。BE-41 未交付期间该面呈 `unimplemented` 态，显示尚无来源，不显示任何合成数字。

**SP-11 覆盖 SP-4 中的 Attention 部分。** SP1-FE 不含 Attention 引用。Spark 与 Attention 之间何时创建、去重、撤回事项尚无合同（SP-5），前端不得自行建立该关系。两页均只投影派生失效。

**SP-12 覆盖 SP-9 的顺序。** 顺序改为 SP1-FE（Luna，合成数据）→ BE-41（Astra）→ 接线与真实覆盖 → 独立验证。DTO 已按 [BE-41 冻结件](be41-dto.md) 固定，前端按该形状写 adapter，不自造字段。

原始 SP0 三份输入按固定 `852bd3e01a06077c105d356004b64021d821b888` 的 SHA + path 原字节归档，见 [来源清单](../../../evidence/delivery-rollup-20260910/spark/source-852bd3e/manifest.json)。`.md.txt` 保留历史正文与当时相对链接，不作为当前实现状态；本合同的后续裁决优先。

## SP-13 · 显式、只读的样本例外（2026-09-10）

依用户 SD-16「允许」及本轮独验合流授权，覆盖 SP-10 的「不显示任何合成数字」一句：BE-41 未交付时，真实请求仍先判定来源；仅合同 404 的 `unimplemented` 面提供 **Show sample data**，用户点击后展示五份既有 canonical 样本，不自动回退、不新增全局预览模式。

来源由 header 一次灰字 **Sample data** 标明；场景切换只读同一份产品 JSON，经与 live 相同的 DTO 校验和渲染。样本 Matter 标题不可导航，假 ID 不进入 Core。**Hide sample data** 退出，**Check for a source again** 显式再探；有效 live（含空集）整体接管，非 404 错误丢弃样本，404 保留已有样本。项目切换和页面刷新重新判定 live。

异步边界同属此合同：旧样本的响应头或 body 均不得跨项目、关闭、隐藏或较新的 live 探测重新发布；样本切换不能取消真实探测，探测期间场景选择禁用。隐藏只取消待发布样本，不取消进行中的 live 结果。

固定输入为 Fable `6d5c444` 的 [SD-16…21 原文](../../../evidence/pv-sd-integration-20260910/sources/sample-intake-6d5c444.md.txt)。此修订只接受 WO-SD-01 的产品样本例外，不交付 BE-41，不实施 Attention 样本，不关闭 SP-12 的后端、接线及真实覆盖阶段。原历史证据中「夹具不进入运行产品数据源」保留历史语义；从此产品可显式读取带标签的样本，不把它们视为维护事实。

## 2026-09-11 · 命名参考补充

[CW Spark定义小单](naming-reference-2026-09-11.md)采纳产品语义与模型命名分层；后台自治/自动续行仅长期候选，不扩大现资料与派生维护owner或只读交付。不改变SP-1…13及BE-41后续接收。
