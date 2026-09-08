# Pro review handoff：自研 Harness Core 与自研 Benchmark

2026-09-08。用户将在网页端发起 Pro review。本文件提供固定输入、审查问题与回传格式；不是 Pro 已审、独立接受或执行新实验的记录。

## 可直接粘贴给 Pro 的任务

请以独立架构及实验方法审查者身份，评估 Courtwork 的自研 Harness Core 与 SE Continuity Evaluation v0。在固定 Schema Engineering Paper 9.6 理念、Courtwork 实际源码与证据下，判断：哪些工作语义值得自研；哪些应复用通用 runtime/数据库/评测基础设施；现有 benchmark 是否足以检验这些选择，以及下一步最小而有判别力的实验是什么。

请先读取下列固定材料，不把本文、自述回执或之前 ChatGPT 对话当作已成立结论。区分 Paper 的规范性主张、源码存在的机制、实际运行证据与尚未验证的效果。对方案可提出保留、缩减、替换或停止建议；无需为 SE 的命名和架构预设正确性。重点检查自研 harness 与自研 benchmark 是否形成循环论证，以及强普通基线能否用更小成本达到同样行为。

这次是审查，不要求实现、部署、付费模型调用或改 Paper。若无法读取某个材料，请列明缺失路径、停止依赖它的结论，不猜测源码或声称运行过测试。请按末尾格式交付可用于后续工程裁决的报告。

## 固定版本与变更范围

| 输入 | 固定版本与用途 |
|---|---|
| Courtwork 被审快照 | [`d879e2ff94d234120f902e15101c103943719e33`](https://github.com/lesPrivilege/Courtwork/tree/d879e2ff94d234120f902e15101c103943719e33)，包括当前 Core 和 B0 benchmark |
| Benchmark 之前基线 | [`62556b7f65170ecf30efb2869447ae85fe69d721`](https://github.com/lesPrivilege/Courtwork/tree/62556b7f65170ecf30efb2869447ae85fe69d721) |
| Benchmark 增量 | [`62556b7…d879e2f`](https://github.com/lesPrivilege/Courtwork/compare/62556b7f65170ecf30efb2869447ae85fe69d721...d879e2ff94d234120f902e15101c103943719e33)，仅协议、runner、证据、研究索引与 current 一行；没有生产 Core 修改 |
| B0 独立复跑代码 | `ab500c7ed77289d3de376ee55b5c78c2c3f24410`；后继 `d879e2f` 只追加 Luna 复核与施工义务 |
| Core 历史交付 | `133269184468f1adf3b38acfc59091818daeb8e8` 的测试证据属于其历史范围；当前源码以 `d879e2f` 为准 |
| SE doctrine | Paper 9.6 / `d78fd312955c1f594e59cbdcbb0d3074ac355940`，与产品仓库分开 |

远端审查分支为 `codex/se-continuity-benchmark`；其最新 handoff 文档可后继更新，实际技术审查仍固定上述 SHA。不要追逐浮动 main，也不要使用退休的 Fresh checkout 或冻结 legacy 作为当前实现。

## 阅读顺序

### 1. Paper 的主张及允许的替代实现

- [Canonical 9.6](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md)：优先 §2.4 删除测试与捕获成本、§3–4 工作持续/权威边界、Context/Output 治理、Work Eval 与 F12。不要把事件溯源、某种数据库或某组对象名称当作唯一实现。
- [Practice](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice.md)、[Practice Index](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md)：核对实践与验证边界。
- [当前产品状态](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/current.md)、[架构](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/architecture.md)。

### 2. Harness Core：先契约，再源码与反例

- [共享 Core 契约](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/docs/work-core/contract.md)、[NDA 契约](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/docs/work-core/nda.md)。
- [Core 源码目录](https://github.com/lesPrivilege/Courtwork/tree/d879e2ff94d234120f902e15101c103943719e33/app/core)：`core.py` 的事务/裁决，`bridge.py` 的可信入口与 Run admission，`client.mjs` 的进程协议，`owner.mjs` 的投影与 Context。
- [Work adapter](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/extensions/work-adapter.mjs)、[Pi adapter](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/runtime/pi-session-runtime.mjs)、[host service](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/server/service.mjs)、[NDA domain](https://github.com/lesPrivilege/Courtwork/tree/d879e2ff94d234120f902e15101c103943719e33/app/domains/inbound-nda)。
- [Core 交付证据](https://github.com/lesPrivilege/Courtwork/tree/d879e2ff94d234120f902e15101c103943719e33/evidence/harness-core-20260908)：先 README，再 adoption、core-independent、adapter-independent 与 pro-review-disposition；历史 Paper 9.3 映射不能重标为 9.6 验证。
- [Core 测试](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/tests/work-core.test.mjs)、[宿主续行测试](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/tests/work-continuity.test.mjs)、[NDA runtime 测试](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/tests/nda-runtime.test.mjs)。

当前自研对象是 work semantics / commitment / continuity 层，执行循环复用 Pi。请核对是否真的守住了这个边界，是否仍有重复 owner、样本耦合、抽象过早或复杂度无法回收的问题。旧 Pro 对其他 SHA 的审查不构成本次接受。

### 3. Benchmark：协议、评分器、原始观察

- [协议](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/research/se-continuity-2026-09-08/README.md)、[下一能力](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/research/se-continuity-2026-09-08/next-capability.md)。
- [完整 B0 源码](https://github.com/lesPrivilege/Courtwork/tree/d879e2ff94d234120f902e15101c103943719e33/benchmarks/continuity)：`cases.json` 期望，`courtwork.mjs` 操作/观察适配，`grade.mjs` 评分，`run.mjs` 记录，`grade.test.mjs` 负例。
- [证据目录](https://github.com/lesPrivilege/Courtwork/tree/d879e2ff94d234120f902e15101c103943719e33/evidence/se-continuity-20260908)：README、author-first.json、luna-independent.json、luna-review.md、checks.log。JSON 过长时可使用 GitHub Raw；检查文件哈希与被审代码对应。

B0 只有一个开发 memo 族、五条脚本机制轨迹。作者和 Luna 5/5 是两次运行，不是十个独立样本。6/6 包括既有 Core 回归，不是新增 benchmark 样本。当前独立性仅指 grader 无生产 validator 依赖、Luna 非代码作者；没有独立专业语料或人的接管数据。

## 必须回答的判别问题

1. **自研边界**：哪些不变量必须由 Courtwork 自有工作层负责？哪些通用 runtime/事务/审批/存储设施即可满足？给出可删减的具体模块、替代方式及会失去什么行为，避免抽象地“建议复用”。
2. **Paper→实现**：单一正式 owner、候选不生效、权限与结果接受分离、来源失效、跨 Session/producer 连续性是否成立？区分元数据机制和领域判断；不要从合成 NDA 规则正确推出法律判断正确。
3. **自证风险**：oracle 是否只是重复产品约束？不同命名和存储模型能否得满分？合法正例能否识别全拒绝系统？观察适配器是否可能把错误状态正常化？请提出至少一个能让当前评分误通过的候选反例，或解释实际排查范围。
4. **强基线与可归因性**：T transcript、S 常规持久化/审批、E SE 三组是否公平？共同安全设施、信息量、额外 verifier 调用、人工补位和状态维护成本应如何控制？哪些消融真正能区分结构化 prompt、常规事务与 SE 语义的贡献？
5. **证据强度**：B0 应称 conformance suite、mechanism evaluation 还是 benchmark seed？何时才足以对外称 benchmark 或支持 systems paper？指出最小必要补证，不把“大量更多样本”作为唯一答案。
6. **下一实验**：从 B1a NDA/HTTP、新 Session、B1b SIGKILL 到 B2 对照，哪个顺序最有判别力？是否应先实现 S 基线或跨实现 observation contract？列清投入、产物、正反控制与停止条件。
7. **人的边界**：模型换手、可读历史、短时人类接管与长期能力保留分别能支持什么？C3 是否应在第一篇实证中后置？
8. **反证与收缩**：什么结果应导致缩减 schema、放弃某个自研组件或停止扩建 benchmark？请认真检验 F12，而非把任何结果解释成 SE 成功。

已知待补包括语义拒绝分类、HTTP actor 路径、runner 自己的强制 kill、独立 NDA 语料、强基线和真实人/模型数据。请判断优先级并寻找额外问题；不要仅复述本列表当成新发现。

## 如具备执行环境

在独立 clone/worktree 检出固定 `d879e2f`；Node >=22.19、Python 3。B0 不需 npm 安装或模型：

```sh
node --test benchmarks/continuity/grade.test.mjs
node benchmarks/continuity/run.mjs --output /tmp/pro-continuity-result.json
node --test app/tests/work-core.test.mjs
```

输出文件须未存在。宿主/NDA runtime 测试需先 `npm --prefix app ci` 再按具体文件运行；使用临时数据与 loopback，不配置付费 provider。无执行能力则仅做静态审查，明确未运行。不要读取个人凭据、运行旧宿主访问新数据或复制实际案件。

## 希望收到的报告

1. **总判断**：分别给 Harness Core 与 benchmark 的保留/修改/收缩建议，以及证据强度。
2. **问题清单**：严重性、固定 SHA+路径/行、触发条件、错误后果、证据类别（源码观察/已复现/待验证假设）、最小修复或实验。推测不能写成已复现。
3. **Claim–Mechanism–Evidence–Gap 表**：每项命题对应现有实现、实际证据、缺口、能推翻它的结果。
4. **自研/复用裁决表**：工作语义 owner、通用 infra、领域 adapter、benchmark runner/grader 分列；说明成本与替代行为。
5. **下一轮最小计划**：最多三个有界交付，明确各自正例/反例、观察点、通过/停止条件与所需独立复核。
6. **公开口径**：现在可以说什么、必须等什么证据；不要将设计符合 Paper 等同于 Paper 被实验证明。

回传报告由 Astra 对每项做事实核验、采纳/修改/延期/拒绝和证据链接，再决定工程变更；本 handoff 不预设 Pro 建议自动成为契约或产品接受。
