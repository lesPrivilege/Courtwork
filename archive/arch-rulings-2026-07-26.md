# 架构裁决备忘录（2026-07-26）：ARCH-DEBT 裁定会 · 调研消费 pass · GUI 候选八项

落痕载体：本备忘录文本随下一枚派单件（TRACE 验收清账序或 DOSSIER 派单）的步骤 0 进入
`docs/architecture/implementation-readiness.md` 与相关 SPEC；在落痕提交成为 `main` 祖先前，
本件是裁决的临时权威记录。落痕完成即达成对齐计划⑤前置的前两项；第三项 `OSS-SUBTRACT-1`
派单件另出，其完成后⑤全部解锁，harness 真实化线（`TOOL-READ-1` 前置的 ADR-011 修订随
`TOOL-READ-1` 派单时正式成文）取得开工资格。

## 一 · ARCH-DEBT 裁定会（三笔半，逐笔三选一，不悬置）

**笔一 · Legal 四 panel 硬编码（`PANEL-BLUEPRINT-1`，最大一笔）——裁：重构票入队，排位上提。**
底座与契约口径（2026-07-26 产品拍板）确认后，「垂类以硬编码组件进壳」是该口径在仓内的最大
存量违例。维持 D1「不提前大爆炸重构、分批交付」的既有裁定不变，但排位由第三梯队上提：
**首枚 `matrix`（78 行、prop 面最窄）插入 App.tsx 队列 `DEBT-DOSSIER-1` 之后、`C3-1` 之前**；
其余三 panel 按「过手即拆」随后续触碰分批。理由：架构轴修正优先于 polish 增量；matrix 首枚
风险面最小，且每迁一枚，后续 App.tsx 票的串行代价都下降。

**笔二 · S6 装配点模式（SPEC 悬置项）——裁：模式级定谳，细则随票冻结。**
S6 执行装配点沿 `LEGAL-S3-BINDING-1` 先例：**执行触发经既有 Work command/confirmation 链在
受信组合根装配，renderer 保持 passive，plan 来自 scenario 真实产物；demo 直连管线（`fileOpsMode`
本地 state + demo 构造器 + 内存 FS）退役为 fixture-only，不得成为第二装配点形态。** 授权持久
先于 effect（ADR-017 决定四）不变。SPEC 的 `[需架构拍板]` 按此销记；字段细则在 `S6-EXEC-1`
派单时冻结。

**笔三 · chat scope 判据——已闭合，销记。** `A/R-26` 裁接判据，已入 `DEBT-DOSSIER-1` 票面与
App.tsx 队列，无余量。

**笔四（半）· interaction actor 两笔——裁：显式容忍留痕。**
ⓐ `InteractionActor{channelId:'desktop',actorId:'local-user'}` 与 ⓑ `ConfirmationActor
'desktop/local-user' + role:'主办律师'` 两处硬编码维持现状：当期产品单机单用户，actor 串是
稳定常量，不构成运行时风险；替换的前置（authenticated principal ADR）属 Stage 2，现在铸 ADR
违反「真实需求进入对应阶段才立」的既有纪律。容忍边界两条：新代码不得新增第三处硬编码 actor
（复用现有两常量）；principal ADR 立项时必须携带存量持久事件（InteractionResolved／Revision／
确认账本）的迁移策略，届时本容忍失效。

## 二 · 调研消费 pass（未消费余量逐条，入票／不采纳，零悬置）

| 余量条目 | 裁决 |
|---|---|
| oss-gui #4：cmdk ResizeObserver→CSS 变量高度动画 | **入票素材**：挂 `UI-TOAST-1`（堆叠动画）与 plan 面板票（展开高度），实施时按需取形 |
| oss-gui #3：面板显隐双模式 + onShow/onHide 生命周期（workbench 半边） | **入票素材**：挂 `UI-RESIDUE-1` 批二状态矩阵 |
| oss-gui #8：分隔条命令式直写 DOM + pointerup 落盘 | **显式不采纳**：现行 `SplitView` 键盘可调实现已验收可用，无性能实证需求；重启判据=分栏拖拽出现可测卡顿 |
| emil polish 规则包 | **入票素材**：挂 polish R2 既有批次通道，不另立票 |
| namethatui 词典 | **并入既挂便利单**（voice 词表扩展扫描面），不另立票 |
| SkillsBench 归因协议 | **显式后置**：当期无 SKILL-REFINERY 类工单；留作 eval 线立项素材，归档索引标注即可 |
| OWASP Memory Guard 四态 | **显式后置**：ADR-013 已 Accepted 且当期 memory 形态冻结；该素材挂「memory 演进 ADR」议题池，scheduled/多写者阶段启用 |

pass 结果按归档纪律写回归档索引对应条目（随落痕批执行）。

## 三 · GUI 候选八项（frontier 对照真空白，逐项裁）

| 候选 | 裁决 |
|---|---|
| 全局 toast 层 | **入票 `UI-TOAST-1`**（纯前端，App.tsx=是，队列尾随）。实施基线：sonner（MIT）借行为骨架（堆叠/dismiss/焦点/aria-live 时序）重皮层为三层表面 token；**前置红线随票冻结：toast 只承载非阻塞回执与失败提示，确认、授权、不可逆动作与任何须留账本的决定一律不得走 toast**（不变量 3 的 UI 面投影）。C3-1 失败文案接线可消费之 |
| 后台完成 OS 通知 | **显式不做留痕**（docs/46 旧裁经复核仍适用：当期无「切走再通知」的后台任务模式）。重启判据=scheduled invocation 或后台运行模式经 ADR 成立 |
| plan/任务清单面板 | **入票 `WORK-PLAN-PANEL-1`**：`deriveTodoSnapshot`/`todo_snapshot` 事件已是 core 真源，缺的只是生产 UI 消费面；自研平铺渲染，零新持久、零新依赖；系统派生只读，无用户编辑面。排队 GUI 线，App.tsx=是 |
| 多会话/多任务总览 | **显式不做当期**：产品现实为单案串行（W5 并行已退役），案件总览由 CaseRail 承担；重启判据=并发 run 真实出现 |
| 卷宗全文检索 | **当期不立票**：中文分词是真实技术缺口，通用 JS 全文库不直接解决；条目转入 `OSS-SUBTRACT-1` 选型评估面，需求实证（试点用户提出检索诉求）后再立票 |
| 材料目录树 | **当期不立票**：信息架构（卷/分区语义）待 `DEBT-DOSSIER-1` 与 ADR-019 容器实施后才有真源可渲染；届时先裁两级折叠 vs 深树，再定是否引 react-arborist |
| 工作稿版本 diff | **并入 R-16 验收条款票**（ADR-019 决定三实施票），不另立。连带裁定：**BSD-3-Clause 纳入许可白名单**（宽松许可、无 copyleft 义务，与 MIT/Apache 同级；jsdiff 因此可用），白名单扩条随落痕批写入工程纪律 |
| 语音输入 | **显式不做留痕**（docs/45 判断经复核仍成立：桌面律所场景非刚需；STT 数据出境与不变量 8 冲突未解）。属 R-4ⓑ 工程内部档，文档留痕不占用户面席位 |

## 四 · 生效与排队

- App.tsx 队列更新为：`CONTRACT-TRACE-1` → `DEBT-DOSSIER-1` → `PANEL-BLUEPRINT-1`（matrix 首枚）→ `C3-1` → `C3-2` → `C3-3`；`UI-TOAST-1`、`WORK-PLAN-PANEL-1` 与既有 `PERSIST-BACKEND-1`／`TOOL-READ-1`／`S6-EXEC-1` 依赖就绪后按互斥模型尾随入队。
- `OSS-SUBTRACT-1` 派单件另出（Sonnet 盘点 + 架构裁）；其交付 + 本备忘录落痕 = 对齐计划⑤全解锁。
- 本备忘录不改变任何能力成熟度；current.md 零触碰。
