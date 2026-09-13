// Public project README. Operational evidence lives in engineering/ and evidence/.
import { BUILD } from "./copy.mjs";

export function renderReadme() {
  return `# CourtWork

Orchestrate your agents. Govern your work.

让不同 Agent 分工、调用模型与工具、彼此接力，是 CourtWork 的产品方向。一件持续的工作还需要明确每个参与者的职责与权限，保留材料的出处、决定的依据和未完事项，让下一次接手有据可循。

CourtWork 把这些关系放在同一个本地 AI 工作空间中。你可以围绕自己的项目、文件与材料展开讨论，委托 Agent 执行，查看成果并作出决定。自由协作与明确的工作规则在这里相遇，构成我们所说的 Court。

人在其中，工作继续。你可以随时介入、调整指令或改变方向，也可以暂时离开，再从已有记录接着做。

[体验 CourtWork](https://lesprivilege.github.io/Courtwork/) · [阅读论文](https://lesprivilege.github.io/Schema-Engineering/) · [运行文档](app/README.md) · [架构](engineering/architecture.md) · [UX Grammar](engineering/design/ux-grammar.md)

## 让下一次接手有据可循

**留下工作的来路。** 每个 Matter 为一件持续工作保存来源、候选、决定与未完事项。材料有版本，判断有依据。

**明确每次参与的边界。** 工作契约说明适用范围、证据与完成条件。你可以允许 Agent 使用工具，同时保留对成果的审阅。每次决定都对应具体材料与版本。

**从当前工作继续。** 执行过程留下记录，正式工作状态保存有效决定，下一次运行按需取得相关材料。模型与运行配置可以变化，工作的依据继续保留。

## Chat、Spark 与 Attention

三个入口表达 CourtWork 的产品分工；当前源码的使用范围见[预览说明](app/docs/supported-preview.md)。

**Chat · 交谈与交接。** 选择受支持的模型连接，围绕问题与材料持续讨论。CourtWork 管理应用自身保留的对话、附件与引用，按获准范围把材料和工具提供给本次运行，让讨论能够进入后续工作。

**Attention · 跟进与核查。** 把重要请求、已有处置和对应结果放在一起，帮助人和 Agent 找到下一步。中断或切换任务后，沿可检查的记录继续，知道还有什么需要决定。

**Spark · 独立探索与核对。** 独立 Explore Agent 围绕本次工作获准提供的已保留材料进行比较与核对，给出可回到精确版本的发现；来源与探索笔记可以按需展开，为后续判断与工作提供依据。

Expert 用专业工作契约组织责任、能力需求与验证要求。这些角色可以选择不同执行配置；正式工作进入 Matter，人的决定对应具体来源与版本。普通交谈不要求先建立 Matter。

**回来，就知道从哪里继续。** Matter 把当前状态、已作决定、未完事项与相关证据组织在一起。新的参与者先看清工作到了哪里，再按需展开材料。连续性来自工作本身留下的状态，不依赖上一位参与者记住全部经过。

[Chat](https://lesprivilege.github.io/Courtwork/chat.html) · [Features](https://lesprivilege.github.io/Courtwork/features.html) · [Product tour](https://lesprivilege.github.io/Courtwork/tour.html) · [Experts](https://lesprivilege.github.io/Courtwork/experts.html)

## 产品方向：Harness Extensions

Harness Extensions 面向电脑工作环境，围绕文件、命令、检索、视觉与协作组织可组合的能力。开发者场景以理解仓库、修改文件、检查结果和接续任务来检验这套接入体例；coding 是验证场景，产品可以继续服务其他工作。扩展优先复用开放生态，以明确的配置、权限、运行记录和界面接入。

## Can the work continue?

Work Continuity Evals 检验来源变化、请求重试与执行中断后的工作状态。当前 Continuity 使用合成数据与确定性执行器，比较 CourtWork Core 和普通持久化审批系统的共同符合性。

状态机、故障重放与 Disclosure 的评测设计继续追问：操作组合是否守住有效状态，中断后究竟留下什么，新的执行者需要读多少信息才能正确继续。

[Eval](https://lesprivilege.github.io/Courtwork/eval.html) · [评测契约](benchmarks/SPEC.md) · [运行 Continuity](benchmarks/continuity/README.md)

## 本地运行

需要 Node.js 22.19+、Python 3 和 Git 2.36+。

\`\`\`sh
${BUILD.commands.slice(0,4).join("\n")}
\`\`\`

打开终端显示的地址。默认运行本地确定性 provider；在 Settings → Models 配置你的模型连接。源码预览复用固定 Pi 执行组合，Local test 用于检查连接与运行路径。合成 NDA 工作指南使用受支持的真实模型生成候选，再由人检查与决定。详细配置、当前能力范围、数据迁移与备份见 [运行文档](app/README.md)。

本地产品检查使用合成 fixture 和确定性 provider，不需要真实模型凭据：

\`\`\`sh
npm --prefix app run check:product
\`\`\`

测试使用完整 Git 历史；历史输入会在运行前校验。

默认测试最多并行运行 4 个测试文件。需要观察资源竞争时，可单独运行
\`npm --prefix app run test:load\`，其并发上限为 8；该负载入口不替代默认验收命令。

## 工作如何衔接

Schema Engineering 追问：跨越多个会话与执行者时，工作应当保留什么、按什么规则改变？CourtWork 将这些区分落实到日常工作：材料进入 Matter，执行形成候选，验证与授权接受使判断落到具体版本。

产品重心是持有正式来源、状态与决定的 Work Core。先有编排：Agent、模型与运行环境各司其职，也可以更换；再有 Court：工作本身留在 CourtWork 手中。当前实现采用 [Schema Engineering 9.6](PAPER.md)，执行集成复用 Pi；专业契约与运行适配分开。这条边界、一次运行的组成，以及从专业要求到正式决定的路径，见 [Features 页的结构图](https://lesprivilege.github.io/Courtwork/features.html#architecture) 与 [Experts](https://lesprivilege.github.io/Courtwork/experts.html)；模块归属见 [架构文档](engineering/architecture.md)，概念与实施边界见 [Runtime 与 Work](engineering/architecture-runtime-canon.md)。

## 开发入口

开工先核对分支、HEAD 与[当前工程状态](engineering/current.md)，再读对应工单和证据。

- **架构**：[模块与责任](engineering/architecture.md) · [Runtime 与 Work](engineering/architecture-runtime-canon.md) · [Core 契约](engineering/core-contracts.md)
- **UX**：[UX Grammar](engineering/design/ux-grammar.md) · [前端连续性规范](engineering/design/agent-interface-2026-09-10/frontend-contract.md) · [文案](engineering/design/copy-convention.md) · [编排](engineering/design/ui-composition-standard.md) · [控件与图标](engineering/design/atlas/README.md)

新增界面先确认对象、动作、状态与恢复语义，再复用已登记的组件、原生 SVG 和实现先例。交付记录保留验证范围与例外，供后续维护接续。

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
`;
}
