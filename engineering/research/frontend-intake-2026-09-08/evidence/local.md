# 前端讨论 / Runtime Index 本地消费核对

> 归档说明：Luna 只读观察快照；下文工单行号及候选状态只适用于当时工作树，后续以活动契约/current为准。Astra 校正了“无 Core API”的泛化表述，限定为通用 Review 尚未接入领域动作。

**核对日期：** 2026-09-08（Asia/Singapore）  
**Fresh checkout：** `<isolated-checkout>`\
**分支 / HEAD：** `codex/fresh-courtwork` / `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`

## 结论

本轮只做只读消费与接缝核对，不接管 Fable 已施工的架构/契约，也不修改 `app/web`、`app/runtime` 或活动工单。讨论/index 的定本已经被 WSK 第二轮接管记录吸收；索引应继续作为检索层，不再复制成第二份前端契约。

Downloads 与仓库输入文件内容一致：

```text
814ab9b0878f8ffeed851c7b9bd2a782c0aad3a7e1c32bf7618f595d30872d48
<private-source>/courtwork_se_gui_review_runtime_index_2026-09-08.md
engineering/mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md
```

## 当前 writer、工单与状态

| 责任 | 当前依据 | 状态与边界 |
|---|---|---|
| **Fable** | `intake-round-2.md:1-3,18-31`；`work-orders/WO-WK3-contract-freeze.md:1-3`；`delivery-wk7.md:1-11` | 已施工架构消费、前端投影契约冻结和色彩治理候选交付；`WO-WK3` 标为已冻结，`WO-WK7` 有 `claude/wk7-color-governance` 候选交付但未推送、待 Astra 合流。`WO-WK8` 仍是待 `WO-WK6` 合流后执行（`WO-WK8-slogan-buttons.md:1-3`）。本轮不接管其写权或验收。 |
| **Opus** | `work-orders/WO-WK6-home-brand.md:1-3,9-25`；`WO-RC-runtime-ui.md:1-4,21-26`；`WO-WK4-review-slice.md:1-3` | `WO-WK6` 为已派发的首页/品牌实现候选；Runtime 控制面 UI 待 WK6/WK8 合流后派发；Review 纵切仍为骨架，依赖 WK3 与 RC。 |
| **Astra** | `intake.md:3,29-42`；`delivery-wk7.md:3,34` | 负责集成、搬迁、合流及独立验收，不是本轮 Luna 的前端 writer。候选分支/交付记录不能直接当作当前 HEAD 已合入事实。 |
| **Luna** | 本报告；`AGENTS.md:7-12` | 只读核对来源、源码接缝与状态；不改项目，不重跑测试，不宣称接受。 |

`engineering/mvp/execution/work-surface-kit/README.md:1-15` 仍是旧的“准备、不开始”快照，使用旧的 `codex/fresh-integration` / `d44fb28` 叙述；最新消费应以 `engineering/current.md:17-26`、`intake-round-2.md` 和各工单为准。README 不应被本轮改写成第二个状态出口。

## 本文档应落在哪里

- 原始索引继续保留在 `engineering/mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md`；它与 Downloads 定本同 hash，且 `intake.md:19` 已明确“检索层，不作 prompt payload”。不再另建副本。
- 讨论裁定和消费顺序已经落在 `intake-round-2.md:18-89`（WK-11–36），其中最新一批是 Home 三带、工作页右栏两态、六种 presentation primitive 和 clean 判准（WK-32–36）。新的消费记录若出现，应继续追加到该记录或对应工单，不写入本报告之外的平行契约。
- `contracts/review-projection.md:1-58` 与 `contracts/review-projection.d.ts:1-19` 是 Fable 已冻结的**前端投影**类型，明确不新增后端状态、字段或端点；不要把讨论索引的 ReviewItem、Proposal 或 Commit 语义直接加进去。
- `contracts/color-governance.md:1-49` 与 `delivery-wk7.md:1-38` 是色彩候选契约/交付；不覆盖活动 `styles.css` 区域或把未合流候选标成产品验收。
- Home 三带与工作页两态只应由 `EX-WK5-home-work-data.md` 的数据/结构清单、`WO-WK9-home-work-design.md` 的设计画布和后续用户四轴裁决承载。当前 EX-WK5 的 `explore/ex-wk5-home-work-data.md` 尚不存在；`WO-WK9` 仍为“设计先行、不写产品代码”（`WO-WK9-home-work-design.md:1-16`）。
- Runtime UI 进入 `WO-RC-runtime-ui.md`，消费既有 `app/runtime/control-contract.d.ts` 与后端路由；不在 `review-projection` 或 `app/runtime` 新造一套前端协议。
- 本次 Luna 结果只写 `/tmp/se-frontend-intake-local.md`，不修改活动文件。

## 已吸收的讨论 / index 内容

1. **Chrome 与 Expert 的责任分离、Review 五类、阶段与反目标**已经进入 `intake.md:9-14,29-42`；WK-1 将讨论中的 React/TSX/Storybook 词汇转译为当前原生 ES module + Custom Elements，不引入 React 前端依赖。
2. **Review 投影**已由 Fable 冻结为 permission/question/outcome 三种前端投影，以及 Waiting / Continue / Needs a look 三集合、动作和身份绑定（`contracts/review-projection.md:5-58`）。EX-WK2 现在已经消费进同一契约的 §6（授权卡 submitting、无 Always allow、无批量、j/k/Enter/o 的 inbox 交互及 permission ≠ proposal review ≠ commit），不能再报告为“EX-WK2 尚未落地”。
3. **真实源码校正**已进入 WK-24：`outcome` 仍只是规划中的只读摘要，在当前 `thread-projection.mjs` / `app.mjs` / `inspector.mjs` 没有实现；因此冻结类型中的 outcome 是显式占位，不是已交付后端对象（`intake-round-2.md:47-50`; `contracts/review-projection.md:34-45`）。
4. **色彩与深宗**已吸收 EX-WK3 与用户裁定 WK-16–22、WK-21 的 lead-gray 方向；`WO-WK7` 记录候选代码、lint/contrast/test 结果和未验证项。其交付记录声明的 136/136 是候选分支记录，不因该记录自动成为当前 Fresh HEAD 或独立验收结果。
5. **窗口留位**已吸收 EX-WK4 与 WK-29–31：官方 WCO/Tauri/Electron 键名与平台差异在 `explore/ex-wk4-window-controls.md:18-90`；当前 Fresh 没有桌面壳，先做 `data-shell` CSS/fixture，不引入壳依赖（`intake-round-2.md:63-71`）。
6. **Home/工作页版式**已由 WK-32–36 吸收：Home 三横带、右栏收敛卡片与展开 tab、六种解耦 presentation primitive、只使用已有字段、无数据元素进入 gaps、clean 判准（`intake-round-2.md:73-89`）。这属于设计/计划，未表示代码已完成。

## 已知源码接缝与尚未闭合的边界

- `app/server/index.mjs:13-22,97-129` 已有静态模块 allowlist、session/surface/actions、runtime-control、runtime-resources、runtime-context、runtime-permissions 和 MCP 路由；后端控制面契约存在，但当前静态 allowlist 没有 `runtime-view.mjs`。
- `app/web/settings-view.mjs:118-511` 仍是 provider/model、permission 和旧 `runtime-info` 调试展示；`settings-view.mjs:472-490` 请求 `/runtime-info`，不是 `control-contract.d.ts` 的完整控制面 UI。`WO-RC-runtime-ui.md:21-26` 仍待实现。
- `app/web/home-view.mjs:33-40` 只显示服务端 `work-summary` 的三个集合；`app.mjs:3897-3934` 负责 Home 数据消费。现有结构没有跨会话 Today 聚合、按日热力图或独立工作对象查询，因此 EX-WK5 的数据可得表仍是必要 source/API 任务。
- `app/web/app.mjs:2745-2884` 是现有 surface 展开/收起/关闭与 Run/File 身份生命周期；`app.mjs:2996-3182` 是 renderer/fallback/action 接缝。它可以作为 Work-card/tab 的改造边界，但不能由视觉设计直接增加新的正式状态或 action。
- `app/web/thread-projection.mjs:21-105` 的当前 kind 没有 `outcome`；`app/web/inspector.mjs:90-206,223-283` 负责 Run Results/Usage/诊断。通用 Review 投影尚未接入 proposal/commit 的领域 API、字段或提交动作。既有 evidence-memo Core 已有样本 Candidate 与可信 decide 路径；这里的缺口不表示 Core 从未实现。
- `app/web/app.mjs:3421-3530` 是 Home composer/新 Run 发起接缝；它不等于跨 session Matter/Work API，也不提供三带所需全部聚合字段。
- `presentation-primitives.d.ts` 被 WK-34、`WO-WK9-home-work-design.md:5-10` 引用，但在当前 WSK 目录中尚未出现；因此 StatTile/Heatmap/WorkCard/ProgressList/PreviewList/ContextList 仍待 schema/API adapter 草案，不应提前写进已有 Review 类型。

## 当前仍待 source / API / implementation / acceptance

| 项 | 当前事实 | 下一边界 |
|---|---|---|
| Runtime 控制面 UI | 后端已有 schema 4 与控制路由；UI 未施工，`settings-view` 仍是旧 runtime-info | Opus `WO-RC`；只消费 `control-contract.d.ts`，缺席能力进入 `runtime-ui-gaps` 的 Planned 文本行 |
| Review proposal / commit | `review-projection` 已冻结为现有 question/permission/outcome 投影；outcome 源码缺席，commit gate 仍待 Core | 不新增 UI 假按钮；等 Core/Work API 有真实字段与动作后再开 Review 纵切 |
| Home 三带数据 | `work-summary`、sessions、runs 可提供局部字段；跨会话聚合、Today/heatmap 边界未由现有 API 证明 | EX-WK5 先做只读字段/端点/分页清单；再由 WO-WK9 设计与用户裁决决定是否实现 |
| Home/工作页两态 | WK-32–36 是已吸收的设计裁定；当前源码仍是既有 Home 与 surface 生命周期 | EX-WK5 → WO-WK9 → 用户四轴 → 单独实现工单；不在本轮接管 |
| Brand 接入 | 候选 allowlist/brand wiring 记录在 `WO-WK5`、`WO-WK6`，候选 commits 存在于分支记录；当前 HEAD 未合流 | Astra 合流与独立验收；保持 `/extensions` allowlist 和宿主状态映射 |
| Color/deep scheme | `WO-WK7` 有候选 delivery、lint/contrast/test 记录；delivery 自列 data-theme、浏览器/设备和截图未验证，未推送 | Astra 合流后按交付单验收；四轴视觉判断仍留用户 |
| Window shell | 官方接口 explore 已直接可消费；Fresh 当前只有 Node + Web，无桌面壳 | CSS/fixture 先行；壳选型另立裁定，不在本轮引依赖 |
| Presentation primitives | 方向已由 WK-34 限定六项，但 schema 文件、adapter 与真实消费者尚无 | 由 `WO-WK9` 设计先行；没有真实 consumer 不扩展更多组件 |
| 真实链 / 最终验收 | 工单和 delivery 记录仍把真实 provider 标为 `not_run`，多数候选尚未合流；本轮不重跑测试 | 由作者之外的 Astra/Luna 按各工单验收，不能用讨论/index 或 fixture 关闭产品门 |

## 约束回执

- 本报告没有修改 Fresh 项目、Paper、活动 contracts、work-orders 或源码。
- 没有重跑测试、启动服务、访问 provider 或读取凭据/数据目录。
- Fable 已施工的架构/契约仍由其既有文件和候选交付持有；本轮只做 Luna 只读对账，不接管、不合流、不替作者验收。
