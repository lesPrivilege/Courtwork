// Public project README. Operational evidence lives in engineering/ and evidence/.
import { BUILD } from "./copy.mjs";

export function renderReadme() {
  return `# CourtWork

人在其中，工作继续。

一件工作会经历多次对话、不同执行者和人的判断。留下材料、成果、决定与未完事项，下一次接手时，才能知道以什么为准、还需要做什么。

CourtWork 是一个本地 AI 工作空间，让这些内容围绕同一件工作积累。你可以从对话开始，检查执行与生成的文件，审阅带着依据的候选，再从已有决定继续。这里既容纳自由讨论，也支持分工明确的协作。你可以委托 Agent 执行，决定下一步，也可以暂时离开；回来时，仍能了解进展，接着做或改变方向。

[体验 CourtWork](https://lesprivilege.github.io/Courtwork/) · [阅读论文](https://lesprivilege.github.io/Schema-Engineering/) · [运行文档](app/README.md)

## 让下一次接手有据可循

**留下工作的来路。** 每个 Matter 为一件持续工作保存来源、候选、决定与未完事项。材料有版本，判断有依据。

**明确每次参与的边界。** 工作契约说明适用范围、证据与完成条件。你可以允许 Agent 使用工具，同时保留对成果的审阅。每次决定都对应具体材料与版本。

**从当前工作继续。** 执行过程留下记录，正式工作状态保存有效决定，下一次运行按需取得相关材料。模型与运行配置可以变化，工作的依据继续保留。

## 三种入口，三种目的

**Chat · 持续交谈。** 用户主导讨论、选择交谈对象。产品方向是让对话更易保留、引用、携带和交接；独立页面正在准备，跨供应商统一会话、导入导出与分层 memory 属于后续能力。

**Attention · 处理重要变化。** 跨工作查看值得处理的对象，带着依据作判断，再回到工作继续。

**Spark · 围绕来源持续推进。** 组织稳定来源、发现与可重建的派生知识。受限的后台分类、标注与比较是后续探索方向，其权限、成本与效果需要逐项验证。

Expert 用专业工作契约组织责任、能力需求与验证要求。各个入口共享工作的记录，让讨论、执行与判断能够衔接。设计依据见[产品定义与叙事裁定](engineering/release/work-first-narrative-2026-09-11/DECISION.md)。

[Features](https://lesprivilege.github.io/Courtwork/features.html) · [Product tour](https://lesprivilege.github.io/Courtwork/tour.html) · [Experts](https://lesprivilege.github.io/Courtwork/experts.html)

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

产品重心是持有正式来源、状态与决定的 Work Core。当前实现采用 [Schema Engineering 9.6](PAPER.md)，执行集成复用 Pi；专业契约与运行适配分开。完整 Work Compiler、第二 Runtime 替换和角色到外部 Runtime 的绑定仍待验证，不声称任意 Agent 已可直接接入。模块归属见 [架构文档](engineering/architecture.md)，概念与实施边界见 [Runtime 与 Work](engineering/architecture-runtime-canon.md)。

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
