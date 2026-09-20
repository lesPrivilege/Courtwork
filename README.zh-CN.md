# CourtWork

[English](README.md) · **简体中文**

Orchestrate your agents. Govern your work.

CourtWork 是一个让人和 Agent 持续工作的本地 AI 工作空间。项目、材料、成果与决定构成共同的工作现场；模型与执行者围绕它参与、分工和接力。工作留在这里，不随一次对话或执行结束。

你可以从一个问题开始，连接自己的资料，委托 Agent 执行，检查成果并作出决定。每个参与者有职责和权限，材料有出处，判断有依据，共同构成我们所说的 Court。

人在其中，工作继续。你可以随时介入、调整指令或改变方向，也可以暂时离开，再从已有记录接着做。

[体验 CourtWork](https://lesprivilege.github.io/Courtwork/) · [阅读论文](https://lesprivilege.github.io/Schema-Engineering/) · [运行文档](app/README.md) · [架构](engineering/architecture.md) · [UX Grammar](engineering/design/ux-grammar.md)

## 让下一次接手有据可循

**留下工作的来路。** 每个 Matter 为一件持续工作保存来源、候选、决定与未完事项。材料有版本，判断有依据。

**明确每次参与的边界。** 工作契约说明适用范围、证据与完成条件。你可以允许 Agent 使用工具，同时保留对成果的审阅。每次决定都对应具体材料与版本。

**从当前工作继续。** 执行过程留下记录，正式工作状态保存有效决定，下一次运行按需取得相关材料。模型与运行配置可以变化，工作的依据继续保留。

## Chat、Spark 与 Attention

Chat 承接交谈与执行，Spark 准备工作所需的材料，Attention 帮助人回到需要判断的地方。三者围绕同一件工作协作。

**Chat · 交谈与交接。** 选择受支持的模型连接，围绕问题与材料持续讨论。CourtWork 管理应用自身保留的对话、附件与引用，按获准范围把材料和工具提供给本次运行，让讨论能够进入后续工作。

**Attention · 跟进与核查。** 把重要请求、已有处置和对应结果放在一起，帮助人和 Agent 找到下一步。中断或切换任务后，沿可检查的记录继续，知道还有什么需要决定。

**Spark · 准备、探索与核对。** Spark 是持续工作的产品角色，围绕本次工作获准提供的已保留材料进行比较与核对，给出可回到精确版本的发现；来源与探索笔记可以按需展开，为后续判断与工作提供依据。

Expert 用专业工作契约组织责任、能力需求与验证要求。这些角色可以选择不同执行配置；正式工作进入 Matter，人的决定对应具体来源与版本。普通交谈不要求先建立 Matter。

**回来，就知道从哪里继续。** Matter 把当前状态、已作决定、未完事项与相关证据组织在一起。新的参与者先看清工作到了哪里，再按需展开材料。连续性来自工作本身留下的状态，不依赖上一位参与者记住全部经过。

[Chat](https://lesprivilege.github.io/Courtwork/chat.html) · [Features](https://lesprivilege.github.io/Courtwork/features.html) · [Product tour](https://lesprivilege.github.io/Courtwork/tour.html) · [Experts](https://lesprivilege.github.io/Courtwork/experts.html)

## 下一实现节点：可接续的工作场

**从一个问题开始，在需要时连接自己的材料或仓库，完成一次可检查、可中断、可接续的真实工作。**

**开始与连接。** 先交谈，再按任务连接资料或仓库；项目归属、连接范围与执行权限分别表达。

**执行与检查。** 在同一条工作流中读材料、修改文件、检查结果。Chat 保持可读，运行细节按需展开；Preview 展示原件、差异与结构化结果，Review 将依据与决定放在一起。

**保留与接手。** 留下确切版本、可复用的准备结果和未完事项。下一次从工作记录继续，按任务取用材料。

[产品形态与功能语义](engineering/product-direction.md)说明这条工作流的稳定职责与接续关系。

## 研发方向：本地 Agent Orchestra

CourtWork 下一阶段基于上游 Pi 补齐 Harness Core 与 Extensions，并接入可替换的本地及托管 Agent Runtime。近期节点是一条真实的读—改—测工作流，成果可检查，中断后可恢复；Runtime 替换与有界委派在这个基础上推进。

**按工作选择 Agent。** Role 说明它的职责，Kit 补充工作方法与预期成果；Pi 等 Runtime 使用可用的 Provider/Model 连接和获准工具执行任务。Expert 是配备专业 Kit 的 Agent。多个 Agent 可以复用 Runtime Adapter，同时分别保有会话、配置、权限和预算。

目标界面优先呈现 Agent 的职责，模型选择就在附近。Settings 的 Agents 分组管理 Agent 配置与 Runtime 连接，Models 管理 Provider 连接。资深 Agent 用户经过简短的产品介绍即可理解和配置；路径、协议与诊断按需展开。这是目标结构，当前支持范围仍以实际实现为准。

目标组合包括 Hermes 挂载 Attention Kit 与 Praxis 处理驻场工作，以及 Pi/Codex 挂载前端、后端或迁移 Kit 形成专项 coding 能力。Praxis 组织业务发现、组织协作、决策材料与实际效果证据；文档、演示和 coding Skill 在选定 Kit 的工作契约内提供局部方法。Context 编译先确定这份契约，再按需加载 Skill，并按任务选择材料、保留其权限层级与出处。

实施顺序沿现有工单推进：

1. 补齐 Pi dogfooding，以及真实读、改、测和接续所需的受控 Extensions。
2. 通过已有 OpenAI Agents API 样板验证 Runtime 边界；本地已安装 Agent 的 Adapter 沿同一生命周期与权限合同接入。
3. 支持跨 Runtime 的有界委派，保留各 Runtime 原生子任务的管理归属及精确结果引用。
4. 接入 Role 优先的 Composer 配置、Spark 独立执行配置及 Hermes/Praxis Attention 工作；browser、computer use、swarm 随具体需求后续展开。

Kit 声明需求，Host 策略与当前授权决定实际可执行权限；正式工作决定继续由 Work Core 持有。可移植 Kit 内容与 Runtime 专属接入分别版本化。当前源码预览仍使用固定 Pi 组合，Agents API 路径在完成接线与 Runtime 验证前保持不可用；上述组合用于指引研发。

[架构裁决与责任映射](engineering/research/architecture-node-2026-09-13/orchestra-direction-20260919.md) · [Praxis Kit 方向](engineering/research/architecture-node-2026-09-13/praxis-kit-20260919.md)

## 能力如何接入

Harness Extensions 面向电脑工作环境，围绕文件、命令、检索、视觉与协作组织可组合的能力。开发者场景以理解仓库、修改文件、检查结果和接续任务来检验这套接入体例；coding 是验证场景，产品可以继续服务其他工作。扩展优先复用开放生态，以明确的配置、权限、运行记录和界面接入。

## Can the work continue?

Work Continuity Evals 检验来源变化、请求重试与执行中断后的工作状态。当前 Continuity 使用合成数据与确定性执行器，比较 CourtWork Core 和普通持久化审批系统的共同符合性。

状态机、故障重放与 Disclosure 的评测设计继续追问：操作组合是否守住有效状态，中断后究竟留下什么，新的执行者需要读多少信息才能正确继续。

[Eval](https://lesprivilege.github.io/Courtwork/eval.html) · [评测契约](benchmarks/SPEC.md) · [运行 Continuity](benchmarks/continuity/README.md)

## 本地运行

需要 Node.js 22.19+、Python 3 和 Git 2.36+。

```sh
git clone https://github.com/lesPrivilege/Courtwork.git
cd Courtwork
npm --prefix app ci
npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845
```

打开终端显示的地址。默认运行本地确定性 provider；在 Settings → Models 配置你的模型连接。源码预览复用固定 Pi 执行组合，Local test 用于检查连接与运行路径。合成 NDA 工作指南使用受支持的真实模型生成候选，再由人检查与决定。详细配置、当前能力范围、数据迁移与备份见 [运行文档](app/README.md)。

本地产品检查使用合成 fixture 和确定性 provider，不需要真实模型凭据：

```sh
npm --prefix app run check:product
```

测试使用完整 Git 历史；历史输入会在运行前校验。

默认测试最多并行运行 4 个测试文件。需要观察资源竞争时，可单独运行
`npm --prefix app run test:load`，其并发上限为 8；该负载入口不替代默认验收命令。

## 工作如何衔接

Schema Engineering 追问：跨越多个会话与执行者时，工作应当保留什么、按什么规则改变？CourtWork 将这些区分落实到日常工作：材料进入 Matter，执行形成候选，验证与授权接受使判断落到具体版本。

产品重心是可持续接手的工作现场。材料由各自资源服务保留，Work Core 管理正式状态、版本关系与决定；编排组织 Agent、模型与运行环境参与执行。工作对象和责任稳定，执行组合沿这些关系接入与更换。当前实现采用 [Schema Engineering 9.6](PAPER.md)，执行集成复用 Pi；专业契约与运行适配分开。这条边界、一次运行的组成，以及从专业要求到正式决定的路径，见 [Features 页的结构图](https://lesprivilege.github.io/Courtwork/features.html#architecture) 与 [Experts](https://lesprivilege.github.io/Courtwork/experts.html)；模块归属见 [架构文档](engineering/architecture.md)，概念与实施边界见 [Runtime 与 Work](engineering/architecture-runtime-canon.md)。

## 开发入口

开工先核对分支、HEAD 与[当前工程状态](engineering/current.md)，再读[产品方向](engineering/product-direction.md)、对应工单和证据。

- **架构**：[模块与责任](engineering/architecture.md) · [Runtime 与 Work](engineering/architecture-runtime-canon.md) · [Core 契约](engineering/core-contracts.md)
- **UX**：[UX Grammar](engineering/design/ux-grammar.md) · [前端连续性规范](engineering/design/agent-interface-2026-09-10/frontend-contract.md) · [文案](engineering/design/copy-convention.md) · [编排](engineering/design/ui-composition-standard.md) · [控件与图标](engineering/design/atlas/README.md)

新增界面先确认对象、动作、状态与恢复语义，再复用已登记的组件、原生 SVG 和实现先例。按[验证选择](engineering/verification.md)确定局部检查、真实用户路径和浏览器目验，交付记录保留证据范围与例外。

文档默认使用英语：根 README 保持英中双语并同步维护；架构、Design、API、契约等二级文档的新写与实质修订优先用英语。历史证据与引用保留原文，既有中文文档按需逐步调整。具体约定见 [AGENTS.md](AGENTS.md#documentation-language)。

## 项目结构

| 目录 | 内容 |
|---|---|
| [app/](app/README.md) | Web UI、本地 Host、运行集成与 Work Core |
| [docs/](docs/README.md) | API、数据与界面契约 |
| [site/](site/README.md) | Pages 源码与交互样本 |
| [brand/](brand/README.md) | 独立 SVG 符号包 |
| [benchmarks/](benchmarks/README.md) | 可复现的符合性评测 |
| [engineering/](engineering/README.md) | 架构、设计与工程进展 |
| [evidence/](evidence/README.md) | 交付与验证记录 |
| [tools/](tools/README.md) | 检查与维护工具 |

## License

[MIT](LICENSE)
