# Work Surface Kit · 接管记录（Fable 架构，2026-09-08，准备轮）

用户指令：全量讨论可消费；Fable 掌架构全局、切分任务、多 agent 编排与模型能力瓶颈处的实现；Sonnet 做 explore、只读 diff、外部溯源与本地摸底；Opus 掌关键前端设计与实现；多 agent 工作须在统一体例下开工。随后指令：Codex 正在 merge 与搬迁，本轮只做准备。

本页不派发 agent、不写产品代码。

## 1. 输入转录

| 输入 | 要点 | 消费 |
|---|---|---|
| 索引（sha256 `814ab9b0…`） | Chrome 持基础设施与治理，Expert 持有界编排；Review Primitive Canon 五类；ReviewItem 信封；P0 来源 12 项；Phase A–E；反目标；DEC-UI-01…10 | 检索层。§12 Phase A（本地事实）与 Phase B（Canon 映射）转为 EX-WK1；Phase C 限第一纵切转为 EX-WK2；Phase D 转为 WO-WK3 |
| 品牌图标讨论 | Geometry / Skin / Motion 三层；imagegen 只作探索、SVG 几何为 canonical；第一枚样板 = 文档 + 三行书写；工作语义动画（retrieval / review / commit / diff）；16–64 px、深浅色、reduced-motion 验收 | 与 CW-BRAND-01 逐项对照，见 §2 第 5 行与 WK-2 |
| Opus / Astra 分工讨论 | Opus = architect / archaeologist；Astra = component factory；Expert = composition only；handoff 六件（repo map、decisions、canon、runtime contracts、index、work order）；第一批做 Review 纵切；"可创造 implementation，不可创造 ontology" | 六件对应本目录文件；分工边界见 WK-8 |
| 解耦 presentation primitives 讨论 | Work primitives 与 domain-neutral presentation primitives（Calendar / Heatmap / MessageCard / Timeline / Table…）两类；后者 schema-first + adapter；layout 亦可为 primitive；目标为 Work Surface Kit | 方向接受；工单门槛见 WK-6 |

## 2. 现状事实（2026-09-08 核查）

| 项 | 事实 | 来源 |
|---|---|---|
| 集成候选 | `codex/fresh-integration` `05c6947`；代码合流 `d44fb28` = UI `4fab4bd` + Runtime Control Plane `8722259` + Brand `faef241` + 权限修复 `787bf1c`；后端 134/134，前端反例 18/18 + 2/2 | fresh worktree `engineering/current.md`、`engineering/migration/2026-09-08/README.md` |
| 搬迁 | `<isolated-checkout>` 为 Courtwork 仓 worktree，分支 `codex/fresh-courtwork`，HEAD 仍在冻结 `f9ade85`，全部 legacy 文件已暂存删除，待导入 replacement tree；远端 `main` 不动 | `git status` / `git worktree list` |
| 前端形态 | 原生 ES module，无 React、无 npm 前端依赖；`app/web/app.mjs` 158 KB 为唯一页面状态 owner，另有 home / inspector / materials / settings / thread-projection / ui-controls / user-message / workspace 八个模块与 `styles.css` 52 KB | `app/web/`、`docs/interface-components.md` |
| 已有 Canon 对应 | 授权卡（questionId + toolCallId + path + bytes + sha256，allow 一次写）、问题卡（answer）、工具 ledger 行、Run 检查栏、File 的 Current / Recorded version、work-summary 三集合（Waiting for you / Continue / Needs a look）、`outcome` kind（只读摘要，无端点）| `ux-conventions.md` §1–3、DC-2 / A-3 / A-4 |
| 品牌包 | CW-BRAND-01 已交付并独验（Luna 13/13，Chromium 10/10）：几何源 `brand/geometry/mark.svg`（冻结 `f9ade85` 的 icon-light 四 rect 平移缩放）；八动词 summon / take-floor / write / retrieve / scope / commit / review / withdraw；五材质 mono / hierarchical / glass / depth / luminous；40 静态 SVG；`<court-symbol>` 宿主状态 presence / authority / activity；write 三行 0/40/80 ms 顺序，总 220 ms，说明模式 640 ms；≤24 px 自动降 hierarchical；imagegen 仅作材质参考未描摹；**未接入应用 UI**，需静态资源 allowlist | `brand/README.md`、`CONTRACT.md`、`catalog.json`、`evidence/ACCEPTANCE.md` |
| Runtime 控制面 | 后端契约 `app/runtime/control-contract.d.ts`；前端接管记录 RC-1…RC-10 与 EX-RC1 已随迁至 `engineering/migration/2026-09-08/`；UI 未施工 | 同上目录 |
| Astra 工作约定 | Astra 持架构、集成、搬迁裁定；Luna 研究 / 有界实现 / 独验；`brand/` 为零依赖独立包；SE 目录只维护论文 | fresh `AGENTS.md` |
| 端口 | 8797–8845 已占用 | memory、fresh README |

## 3. 裁定

| 编号 | 裁定 | 理由 | 来源 |
|---|---|---|---|
| WK-1 | **事实基线 = Codex 搬迁完成后的 `codex/fresh-courtwork` SHA**；索引是检索层；讨论稿中的 React / TSX 词汇（`ReasoningIcon.tsx`、`CalendarEvent` 类型、Storybook）一律转译为原生 ES module + Custom Elements，brand 包即范式 | 前端无 React；索引 §12 要求以 repo 为 ground truth | §2 前端形态、AGENTS.md |
| WK-2 | **品牌图标线不重做。** 讨论所提第一枚样板（推理图标 + 三行顺序书写、三态、六尺寸、深浅色、reduced-motion）已由 CW-BRAND-01 完成；讨论所列工作语义动画（retrieval 回流、review 对齐、commit 落板）亦已在八动词内，唯 diff（朱笔划去 / 补入）未作，且 A-1 裁定 diff 不画为已支持，故不加。剩余工作只有**应用接入**：allowlist 准入 `brand/src/court-symbol.mjs`；宿主状态映射 run 八态 → `activity`、question 四态 → `authority`、连接状态 → `presence`；日常信息区不循环。材质默认留用户（ACCEPTANCE 已注明取舍权在用户） | 不重复已独验交付；brand 契约禁止 UI 自行产生权限 | §2 品牌包、DC-6 |
| WK-3 | **Canon 五类采纳，词表以 SE 既有为准。** `ReviewItem` 只作前端投影类型，映射既有 question / permission / run / work-summary 字段；不新增后端状态、字段或端点（沿 A-4 "commitment = contract first, no endpoint"）。permission（一次写授权）≠ proposal review（accept / reject / revise，待 Core 契约）≠ commit（Core）三者在 UI 与类型上分开；proposal review 的动作按钮在 Core 契约成立前不出现 | 索引 DEC-UI-03 / 05；ux-conventions §1 动作词表；WS-01 | 索引 §3、A-4 |
| WK-4 | **第一纵切 = Review 纵切，只用已记录事实**：Thread 内问题卡 / 授权卡（inline）与 Dashboard 三集合（inbox）作为同一 store 的两个投影；`outcome` 为只读摘要；fixture 覆盖 streaming / waiting_user / failed / resolved / expired_restart，390 与 1440，深浅色，键盘（j/k 类导航仅当 Suna 溯源确认其成本可控），reduced-motion。不做 j/k 之外的批量审批 | 索引 §4.8 建议两投影同存；DEC-UI-04 | EX-WK2、WO-WK4 |
| WK-5 | **施工次序**：Runtime 控制面 UI（RC-1…10 与 EX-RC1 已备）为基线后第一张 Opus 工单；Review 纵切待 WO-WK3 契约冻结后开工；两者都写 `app.mjs`，串行、单写者。Sonnet 两卷（EX-WK1 / EX-WK2）与 Runtime UI 并行 | 前者已完全规定，后者依赖契约；单文件写权冲突 | 体例 §6 |
| WK-6 | **Domain-neutral presentation primitives（Calendar / Heatmap / MessageCard / Timeline / Table）方向接受，暂不开工单。** 触发条件：某个真实 Expert 表面需要其中一项；届时 schema-first（`CalendarEvent` / `HeatmapDatum` / `MessageArtifact` 类型先冻结）+ adapter，proposal / committed 两态由 WK-3 的类型承载 | 索引 §13 反目标：不为推测建组件；AGENTS 原则不作投机抽象 | 讨论第四段 |
| WK-7 | **Expert = composition 采纳为方向；L2 escape hatch 即现有 extension renderer ABI；L1 声明式 manifest 待 2–3 个 Expert 能以 schema + 复用原语表达后再定；不建 Expert Studio** | 索引 §11、§13 | DEC-007、ui-orchestration-contract |
| WK-8 | **分工边界**：Fable 持 Claude 集群的架构、Canon 与契约冻结；Astra 持集成、搬迁、基线与独立验收（fresh AGENTS.md 已定）。用户提议的 "Astra = component factory" 在 WO-WK3 契约冻结后可行，届时以工单形式交付并保持"可创造 implementation，不可创造 ontology"；此前不并行写 `app/web` | 单写者；作者不自验 | 讨论第三段、AGENTS.md |
| WK-9 | **Sonnet 只出两卷**：EX-WK1 本地 Canon 映射（索引 Phase A/B）；EX-WK2 Review 纵切外部溯源，每原语 2–4 个来源（Suna / CopilotKit / Gatewerk / VekInbox / beUI / agent-indicator / Agent Elements EditTool），不出 landscape 报告 | 一来源一行；知识落到裁定与样板 | 体例 §3 |
| WK-10 | **目录与端口**：本目录迁入 fresh 后为批次根；工单端口 8850（Runtime UI）、8851（Review 纵切）、8852（brand 接入）；各自独立数据目录；schema 4 | 体例 §6 | — |

## 4. 依赖图

```
Codex 搬迁完成 + 基线 SHA + 独立 clone 检查
        │
        ├─ EX-WK1 本地 Canon 映射（Sonnet，只读）──┐
        ├─ EX-WK2 Review 溯源（Sonnet，只读）──────┤
        ├─ WO-RC  Runtime 控制面 UI（Opus，8850）  │  ← 与两卷并行
        │            │                              ▼
        │            ▼                       WO-WK3 契约冻结（Fable）
        │      Astra 独验 → 合流                     │
        │                                           ▼
        │                              WO-WK4 Review 纵切（Opus，8851，串行于 WO-RC 之后）
        │                                           │
        └─ WO-WK5 brand 接入（Opus 或 Fable，8852，可与 WO-WK4 串行任一侧）
                                                    ▼
                                             Astra 独验 → 合流
                                                    ▼
                                  门 G-B：presentation primitives（WK-6）
                                  门 G-E：Expert manifest（WK-7）
```

## 5. 未决（留用户）

1. WK-8：是否在 WO-WK3 之后把 Review 纵切的组件制造交 Astra（component factory），Opus 只做设计契约；或维持 Opus 设计 + 实现、Astra 独验。架构建议后者，直至契约稳定一轮。
2. WK-5：Runtime 控制面 UI 是否先于 Review 纵切开工。架构建议先，理由为其输入已齐且不依赖新契约。
3. WK-2：应用内品牌材质默认值（≤24 px 强制 hierarchical；32 px 以上 glass / depth / luminous 取舍），属四轴视觉判断。

## 6. 本轮未做

未派发 agent；未写 fresh 仓；未启动服务；未读取任何凭据目录。
