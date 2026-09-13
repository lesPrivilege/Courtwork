# Context 与 TPS 前端接线审计

2026-09-13 · 有界只读审计。初检 `main` 为 `f8ffa9bf48062b750b27a5702995fe808950e9d2`；Astra 随后提交 `66b0eb499f3a4ed3786f5766fbdf103341cac077`（灰色代码块样式与证据），两者间仅 `app/web/styles.css` 及相关 code-gray 文档/证据变化，与 context/TPS 无关。本文最终核对 HEAD 为 `66b0eb499f3a4ed3786f5766fbdf103341cac077`；`ccc7bb06859e847221bfc854e5052df17898c3f2`、telemetry 产品变更 `6921dbd`、后续 `4720027`、`ea51ffc` 均为其祖先（`git merge-base --is-ancestor <sha> HEAD` 成功；`git branch --contains 6921dbd` 含 `main`）。遥测/runtime/settings 相关产品文件无未提交差异；其他在途改动不纳入结论。用户的两张 context 参考图保存在 `evidence/40-context-reference-expanded.png` 与 `evidence/41-context-reference-collapsed.png`，作为设计输入，不证明同名数值或能力存在。只读取本地材料，无外部重查。

## 裁决摘要

用户给的示例是待参考内容，不是 owner 数据或能力授权。本地代码目前**没有** `516.7k / 1M` 式模型 context 消耗比例、`97%` 自动压缩阈值读数，或账户/Provider usage-limit 计划。现有界面分别显示：(1) Next-run context 按资源 kind 分桶的字符构成；(2) request 级 `serialized UTF-16 chars ÷ 4` token 启发式；(3) 有来源的 context-window 声明值；(4) 原生 compaction 生命周期文字事件。它们的对象、时点和计量单位不同，不能拼成一根 usage meter。

| 事项 | 已登记 / 已选型 | 已实现 / 已接线 | 当前 main 状态与边界 |
|---|---|---|---|
| **Context 组成** | WK-141(b)、WK-147(a)、WK-140/WK-146 已裁定 `estimate ≠ meter`；Design Scout Projection 行沿用此边界。外部输入里提议的 Context Meter + stacked disclosure 未选为产品形态。 | `renderContextBar` 已按 kind 显示 admitted **characters** 的比例构成及分项；Effective Context Inspector 列 source / admission / scope / admitted / deferred characters。Request telemetry 另记发送请求 JSON 序列化 UTF-16 字符数与 `ceil(chars/4)` 启发式，并在 Run 详情披露。均已挂到当前 UI/Run 事件路径。 | **已实现、已接 main**；这是来源构成及带明示方法的 request estimate，不是精确 token 使用、剩余容量、跨请求峰值或账单。旧记录的 partial、不回算规则仍在。 |
| **Context 容量 / 百分比** | WK-141(b) 拒绝 context meter；WK-147 明确现有 Context bar 是无固定上限的 distribution，不是 capacity meter。`frontend-contract.md` 禁止从 estimates 推导容量或余量。没有采纳示例的 `516.7k / 1M`。 | Context window 有独立来源：catalog 声明，或 compatible connection 上用户填写的数值；UI 在 Model picker / connection 表单说明来源和未知状态。未知窗口时不猜值，并关闭 compaction。 | **声明容量已实现并合 main；消费/余量百分比未实现、未接线**。没有 exact provider input 与同口径 current/limit 可计算比值；不显示 usage-limit 计划。 |
| **自动 compaction** | `api-runtime-mx-r1.md` 冻结 Pi 原生 owner、reserve/keep/maxCompactions 规则及取消语义；不把 compaction 当货币预算或 Run 终止状态。 | Pi 原生自动压缩已实现。已知 window 可启用；未知则禁用。Host 捕获 `compaction_start/end`、limit、retry 并写 run notices；Inspector 将其译成摘要文字。Request telemetry 以 `purpose: compaction` 识别压缩请求；无专属 compaction 次数/时长/context 前后 token 图表。 | **Runtime 机制与事件投影已接 main**；细节不是账户 Usage 限额 UI。没有 97% 阈值事实或可见的容量压力百分比。 |
| **Provider TTFT** | Runtime telemetry 合同区分 provider TTFT 与 host 首输出；WK-141(b) 拒绝以未测量 TTFT 画 metric / distribution。 | Host 记录 dispatch 后首个非空 thinking/text/tool-call delta (`firstOutputMs`) 与首段 text (`firstTextMs`)；Telemetry UI 明确命名 Host first output/text，并写明包含 transport/adapter，不是 provider TTFT。`providerTtftMs` fail-closed 且恒 null。 | **Host timing 已实现、已接 main；Provider TTFT 未实现/未接线**，不能用 run elapsed 或 host first-output 改名代替。 |
| **Decode TPS** | Design Scout §2a Projection 将 TPS 标成当期不成立；WK-141(b) 拒绝 live metric / sparkline。TPS specimen `0d72a9b` 是合成数据候选，`62295b4` 用户裁决将每请求终值列入通用 Harness 缺口；`BE-42` 已分配，但明确是已登记/待 owner 合同，不是实现单。 | Telemetry v1 仍写 `decodeTokensPerSecond: null` 和 `missing: ['provider_token_timing','token_deltas']`；UI 显示 `Unavailable · no token deltas`。没有从 UI chunks、字符数、Run output / wall time 推算。TPS sparkline 仅在 tracked design specimen，不在 `app/web`。 | **产品未实现、未接线**。`BE-42` 在本地 main 已登记；没有真实 provider/runtime 带时钟 token 计数，不满足进入产品图形的测量准入。 |

## 固定源码与合同证据

以下均按当前 `main@66b0eb499f3a4ed3786f5766fbdf103341cac077` 的路径/行号核对；完整路径为相对于仓库根。

- `app/web/runtime-view.mjs:1792-1861`：Effective Context Inspector 按 `ContextItem` 列来源、admission、scope、admitted/deferred **字符**数量；明确 Run provider usage 不能分摊回 source rows。`:2483-2574` 的 `renderContextBar` 按 kind 聚合 characters，分段比例条只对比 kind，直接注释无 max、不得画 percentage-of-limit/free space/quota；`:2579+` 为 recorded Run context 披露。
- `app/runtime/request-telemetry.mjs:4-8,39-56,98-117`：请求范围 estimate 的准确算法与字段；monotonic Host elapsed/首输出采样；TPS 与 provider TTFT 固定 null、两种 token-timing 缺项始终列在 missing。`app/runtime/pi-session-runtime.mjs:473-487` 包装真实 Pi stream seam；`app/server/service.mjs:1923` 把事件 append 到 Run log。
- `app/web/telemetry-view.mjs:51-109`：按 latest/历史展开请求读数；`:88-108` 列 host first-output/first-text、elapsed、Unavailable TPS、估算 context 与口径文字。消费者在 `app/web/inspector.mjs:195`、`app/web/attention-agent-view.mjs:149`、`app/web/app.mjs:5404`。
- `app/web/settings-view.mjs:811-815,1142-1154`：compatible endpoint 可选填写 context-window，明确空值时不猜并关闭 compaction；`app/web/model-picker.mjs:116-135` 显示 context-window 数字/unknown 及用户来源。`app/server/service.mjs:993-1025` 解析 capability 与 compaction policy，未知容量不代入目录相似项。
- `app/runtime/pi-session-runtime.mjs:392-405,544-571`：有效 compaction policy 范围、默认值与 native lifecycle event；`app/web/inspector.mjs:300-307` 将 compaction start/end/limit/retry 转成事件文本。参数合同见 `app/docs/api-runtime-mx-r1.md:21-34`；`app/docs/runtime-foundation.md:76-77,281-286` 定义模型 catalog capacity 与 `runtime-info` effective compaction。
- `app/docs/request-telemetry.md:7-13`：当前 v1 的单位、时间范围、context heuristic、缺失口径；`app/tests/request-telemetry.test.mjs:20-25` 与 `app/tests/telemetry-presentation.test.mjs:17-40,61-78` 覆盖始终 null、Host-vs-provider 标签、heuristic 与 compact/history 读面。压缩机制/生命周期另有 `app/tests/compaction-runtime.test.mjs`、`app/tests/compaction-lifecycle.test.mjs`。

## 既有选型与 Git 身份

- **Design Scout**：`engineering/design/scout/README.md:37` 指向 WK-141(b)，明确当期 TPS / TTFT / Context meter 因无测量不成立；`engineering/design/atlas/README.md:54-58` 区分“meter 今日无”“context kind 分布今日有”，并说 TTFT distribution 仍需测量与样本口径。因此 Scout 没选定一款可直接移植到生产的 Context/TPS 组件或数值布局。
- **TPS 外部参考**：`engineering/design/tps-specimen-2026-09-10/reference/README.md` 核验 Pi Pulse、Unsloth 等来源的测量口径，指出不等价来源与适用边界，不给 winner；`engineering/design/tps-specimen-2026-09-10/README.md:1-13,121-127` 明标 synthetic candidate，要求真实 owner clock、字段合同与重新过 WK-141 后才可升为产品。它不能作为生产实现/选型完成的证据。
- **登记状态**：`engineering/mvp/execution/work-surface-kit/intake-round-3.md:329-342` 是 WK-141/147；`backend-requests.md:107-115` 是 BE-42 登记及 Astra 接收“已登记/待合同、不是已实现”的裁决。**交叉核对发现来源状态有演进**：较早 EX-TPS1 `reference/README.md:1-10` 说“当时没有任何工单认领”；后续 specimen 用户裁决分配 BE-42，采用较晚的登记，不把早期语句当当前状态。
- **合流状态**：`6921dbd` 添加 request telemetry，`4720027` 修正 provider response identity，`ea51ffc` 完成 schema/Settings capability 适配；三者均是 `66b0eb499f3a4ed3786f5766fbdf103341cac077` 的 Git ancestor，且 `git branch --contains 6921dbd` 返回 `main`。compaction runtime/docs/tests 的路径也在当前 main。TPS specimen 自己有 `0d72a9b`、`62295b4` 本地提交历史，但其文档声明它不改 `app/`；BE-42 没有对应生产 token-clock 实现提交。当前 `main` 本机领先 `origin/main` 10 个提交，本文只称“已合本地 main”，不称已 push。

## 前端后续门槛

若要从示例推进到剩余容量/百分比，先需要 owner 提供同一请求/同一模型/同一 encoding 范围内可比较的 current 与 limit、source、time boundary、reserved output 与 compaction policy。若要呈现 Provider TTFT/TPS，须有可达 provider/adaptor 对应时钟和 token 数、明确 failed/cancelled/null 规则与真实请求证据；`host-tokenizer` / host 收包时钟需单独命名，不能叫 provider 推理 TPS。完成数据合同前，不复用 Context 分布条去表示 capacity meter，也不把合成 specimen 数值抄入产品。

## 集成复核与验证范围

Astra 收件时 HEAD 已前进至 `321014a9ec942f542e4db17407335f03b698ea31`；从审计基线 `66b0eb4` 起仅新增 Release 输入绑定测试/证据及 runtime 文档的隐藏与历史擦除区别说明，没有更改被审计的产品接线。上文源码行号与本机 ahead 数量固定于 Luna 审计时点。Luna 文档链接检查覆盖 1186 份文档、6120 个链接，无问题；本次未重跑产品测试，测试文件仅作为既有覆盖证据。

参考图 SHA-256：expanded `ea692f4c1b3d47b86f3e4891c2404550dfc67a365f580cb2e08938ac08d3841e`；collapsed `f4c9ae06699e0b7bb109107527ac080feafac50b8672fdc44472b7b1f0f5bc3f`。
