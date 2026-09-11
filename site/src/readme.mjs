// Public project README. Operational evidence lives in engineering/ and evidence/.
import { BUILD } from "./copy.mjs";

export function renderReadme() {
  return `# CourtWork

Orchestrate your agents. Govern your work.

编排让不同 Agent 分工、调用模型与工具、彼此接力。一件持续的工作还需要明确每个参与者的职责与权限，保留材料的出处、决定的依据和未完事项，让下一次接手有据可循。

CourtWork 把这些关系放在同一个本地 AI 工作空间中。你可以围绕自己的项目、文件与材料展开讨论，委托 Agent 执行，查看成果并作出决定。自由协作与明确的工作规则在这里相遇，构成我们所说的 Court。

人在其中，工作继续。你可以随时介入、调整分工或改变方向，也可以暂时离开，再从已有记录接着做。

[体验 CourtWork](https://lesprivilege.github.io/Courtwork/) · [阅读论文](https://lesprivilege.github.io/Schema-Engineering/) · [运行文档](app/README.md)

## 让下一次接手有据可循

**留下工作的来路。** 每个 Matter 为一件持续工作保存来源、候选、决定与未完事项。材料有版本，判断有依据。

**明确每次参与的边界。** 工作契约说明适用范围、证据与完成条件。你可以允许 Agent 使用工具，同时保留对成果的审阅。每次决定都对应具体材料与版本。

**从当前工作继续。** 执行过程留下记录，正式工作状态保存有效决定，下一次运行按需取得相关材料。模型与运行配置可以变化，工作的依据继续保留。

## 三种入口，让工作连贯

**Chat · 持续交谈。** 从一个问题或想法开始，选择交谈对象，逐步形成判断。对话中的材料和思路可以被保留、引用与交接，让讨论成为下一步工作的起点。

**Attention · 处理重要变化。** 把分散在不同工作中的变化带到眼前，连同相关材料与可采取的行动一起查看。你可以了解发生了什么，作出判断，再回到工作继续。

**Spark · 围绕来源持续推进。** 从持续积累的资料中整理线索、比较变化、形成发现。每项发现都能回到来源；材料更新时，相关知识也能重新整理，为后续工作提供依据。

Expert 用专业工作契约组织责任、能力需求与验证要求。各个入口共享工作的记录，让讨论、执行与判断能够衔接。

[Chat](https://lesprivilege.github.io/Courtwork/chat.html) · [Features](https://lesprivilege.github.io/Courtwork/features.html) · [Product tour](https://lesprivilege.github.io/Courtwork/tour.html) · [Experts](https://lesprivilege.github.io/Courtwork/experts.html)

## Can the work continue?

Work Continuity Evals 检验来源变化、请求重试与执行中断后的工作状态。当前 Continuity 使用合成数据与确定性执行器，比较 CourtWork Core 和普通持久化审批系统的共同符合性。

状态机、故障重放与 Disclosure 的评测设计继续追问：操作组合是否守住有效状态，中断后究竟留下什么，新的执行者需要读多少信息才能正确继续。

[Eval](https://lesprivilege.github.io/Courtwork/eval.html) · [评测契约](benchmarks/SPEC.md) · [运行 Continuity](benchmarks/continuity/README.md)

## 本地运行

需要 Node.js 22.19+、Python 3 和 Git 2.36+。

\`\`\`sh
${BUILD.commands.slice(0,4).join("\n")}
\`\`\`

打开终端显示的地址。默认运行本地确定性 provider；在 Settings → Models 配置你的模型连接。详细配置、数据迁移与备份见 [运行文档](app/README.md)。

## 工作如何衔接

Schema Engineering 追问：跨越多个会话与执行者时，工作应当保留什么、按什么规则改变？CourtWork 将这些区分落实到日常工作：材料进入 Matter，执行形成候选，验证与授权接受使判断落到具体版本。

产品重心是持有正式来源、状态与决定的 Work Core。先有编排：Agent、模型与运行环境各司其职，也可以更换；再有 Court：工作本身留在 CourtWork 手中。当前实现采用 [Schema Engineering 9.6](PAPER.md)，执行集成复用 Pi；专业契约与运行适配分开。这条边界、一次运行的组成，以及从专业要求到正式决定的路径，见 [Features 页的结构图](https://lesprivilege.github.io/Courtwork/features.html#architecture) 与 [Experts](https://lesprivilege.github.io/Courtwork/experts.html)；模块归属见 [架构文档](engineering/architecture.md)，概念与实施边界见 [Runtime 与 Work](engineering/architecture-runtime-canon.md)。

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
