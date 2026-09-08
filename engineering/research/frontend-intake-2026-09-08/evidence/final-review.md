# Frontend intake / Work Surface final review

**日期：** 2026-09-08（Asia/Singapore）  
**Checkout：** `/Users/lesprivilege/Projects/Courtwork-fresh`  
**分支 / HEAD：** `codex/fresh-courtwork` / `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`

## 结论

**限定范围通过，无阻塞性语义问题。** 新的 `work-surface-boundaries.md`、frontend-intake 回执与 `design/README.md` 已形成一致的文档边界：Fable 的活跃 Work Surface Kit 继续持有布局、投影契约、工单和写权；Astra 负责跨层消费；本轮 Luna 只读核对，不接管前端。

文档也正确保留了以下事实边界：样本 `evidence-memo` Core 已有 Candidate/可信 `decide`，但通用 Review 尚未接入领域 API；`ReviewProjection` 的 `outcome` 仍是只读 Run 摘要；候选分支作者测试、fixture 结果和未合流交付不等于当前 HEAD 的独立验收。

## 核对证据

- `git diff --check`：通过，退出码 0。
- 对 `work-surface-boundaries.md`、frontend-intake 全目录、`design/README.md`、`current.md`、`roadmap.md` 新引用做本地 Markdown 路径/锚点扫描：64 个链接，除下述已知待建文件外无缺失路径或锚点。
- `frontend-intake-2026-09-08/README.md:3` 的 Roadmap §5 链接与 `roadmap.md:93` 标题一致；`current.md:27` 和 `roadmap.md:97` 都明确链接新边界文档并保留 Fable 的当前施工责任。
- `engineering/research/frontend-intake-2026-09-08/README.md:43` 的 `evidence/final-review.md` 尚不存在；这是Astra在复核任务中已说明的复核后由 Astra 创建的已知待建文件，不作为本轮阻塞。

## 已确认的语义覆盖

1. `work-surface-boundaries.md:19-28` 将 Chrome、Runtime/Host、Domain Core/SoR、Shared/Presentation Primitive 与 Expert 的 owner 分开，避免把“Chrome owns governance”读成 Chrome 持有正式业务状态。
2. `work-surface-boundaries.md:30-42` 分开 Observation、Elicitation、Permission、Proposal Review、Commit Gate；明确按钮不构成提交引擎，且不把五类宣称成全部专业语义。
3. `work-surface-boundaries.md:44-66` 复用 Fable 已冻结的 `permission | question | outcome` 投影，并保留 producer/renderer 缺席时需要独立 domain read path 与 fallback 的缺口。
4. `work-surface-boundaries.md:85-96,106-113` 把 Review packet、领域 Core、runtime-control、adapter 与后续工单分开；通用权限卡合流不关闭 proposal/commit/effect/fallback 门。
5. `frontend-intake/evidence/local.md:3,25-27,46-57` 已采用 Astra 的措辞校正：不是“Core 不存在”，而是“通用 Review 尚未接入领域动作”，同时保留样本 Core 事实。
6. `frontend-intake/README.md:16-27,39-43` 明确消费结果是架构/研究回执，不是 Paper 新版本、产品代码、运行验收或 Fable 工单状态账本。

## 非阻塞待澄清项

`engineering/design/work-surface-boundaries.md:83` 写作“Fable 的 `presentation-primitives.d.ts`”，但该文件在当前 WSK 目录中尚未出现；`engineering/research/frontend-intake-2026-09-08/evidence/local.md:59` 与 `WO-WK9-home-work-design.md:5-10` 都将其列为待草案/待冻结。为避免把候选文件误读为已存在契约，后续可改成“Fable 计划中的 `presentation-primitives.d.ts`”或直接写“待 `WO-WK9` 冻结的文件”。这只影响措辞与可追溯性，不改变当前语义结论。

## 未检查与纪律

未跑产品测试、未启动服务、未调用 provider、未读凭据或数据目录；未修改 Fresh 仓、Paper、活动 contracts、work-orders 或源码。候选/待建文件仍按当前文档中的状态处理，没有据此关闭任何产品、Paper、R/PT 或独立验收门。

## Astra 收尾回执

已按复核建议将计划中的 `presentation-primitives.d.ts` 明确标为待工单冻结；本报告现已归档到待建目标，README 引用已闭合。收尾再次运行 `git diff --check` 并核对该目标存在。此处为作者收尾记录，不追加运行验收结论。
