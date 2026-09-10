// Public project README. Operational evidence lives in engineering/ and evidence/.
import { BUILD } from "./copy.mjs";

export function renderReadme() {
  return `# CourtWork

让 AI 参与的工作持续推进。

CourtWork 是一个本地 AI 工作空间，把材料、执行过程、文件与审阅放在同一件工作里。你可以从一次对话开始，检查工具调用和生成的文件，再把工作接入事项：逐条审阅候选，打开引用的原文，留下决定，跨会话继续。

[体验 CourtWork](https://lesprivilege.github.io/Courtwork/) · [阅读论文](https://lesprivilege.github.io/Schema-Engineering/) · [运行文档](app/README.md)

## 工作有自己的连续性

**Matter · Work has an address.** 来源、候选、决定与未完事项留在同一件工作里。每个 Matter 携带自己的契约，明确证据、权限与完成条件。

**Attention · Make attention count.** 从全局对话进入工作，让需要人判断的变化有明确对象。候选与依据一起进入 Review，决定绑定具体版本。

**Runtime · Intelligence is replaceable.** 模型与运行配置各有归属；正式来源、成果与决定由工作状态持有。

**Spark & Experts.** Spark 围绕稳定来源组织可重建的派生知识；Experts 通过角色、工具与契约组合专业责任，围绕同一 Matter 接力。

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

材料进入 Matter，模型与工具形成候选，Review 将判断落到具体版本。新的执行者从已有来源、决定与未完事项继续。

CourtWork 将 [Schema Engineering 9.6](PAPER.md) 的工作状态模型落实为可运行的系统。模块归属、执行框架与局部选型见 [内部架构文档](engineering/architecture.md)。

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
