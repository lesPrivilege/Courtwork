// Public project README. Operational evidence lives in engineering/ and evidence/.
import { BUILD } from "./copy.mjs";

export function renderReadme() {
  return `# CourtWork

让 AI 参与的工作持续推进。

CourtWork 是一个本地 AI 工作空间，把材料、执行过程、文件与审阅放在同一件工作里。你可以从一次对话开始，检查工具调用和生成的文件，再把工作接入事项：逐条审阅候选，打开引用的原文，留下决定，跨会话继续。

[体验 CourtWork](https://lesprivilege.github.io/Courtwork/) · [阅读论文](https://lesprivilege.github.io/Schema-Engineering/) · [运行文档](app/README.md)

## 工作如何留下来

一次运行会结束，专业工作往往需要多次交接、修订与确认。CourtWork 把每次执行留下的内容组织成可继续使用的工作状态。

- **过程可见。** 工具调用、提问、回答与运行状态按时间呈现。写入批准包含具体路径、内容与大小。
- **材料可追溯。** 生成文件保留字节身份；候选引用明确的来源版本与原文片段。
- **审阅有落点。** 接受、退回或要求补证据。每次决定绑定候选版本，修订与历史一起保留。
- **工作可续行。** 将 Chat 接入 Matter，在新的会话里继续处理同一事项，查看既有成果、决定与待办义务。
- **运行由你配置。** 选择 provider 或本地模型，管理资源、权限与 MCP。工作数据保存在本地。

仓库内含一个完整的 NDA 审阅场景，贯通材料、逐规则候选、证据引用、人工决定与修订。

## 本地运行

需要 Node.js 22.19+、Python 3 和 Git 2.36+。

\`\`\`sh
${BUILD.commands.slice(0,4).join("\n")}
\`\`\`

打开终端显示的地址。默认运行本地确定性 provider；在 Settings → Models 配置你的模型连接。详细配置、数据迁移与备份见 [运行文档](app/README.md)。

## 组成

- **Web UI** 呈现会话、运行、文件与审阅。
- **Host runtime** 基于 Pi AgentSession，管理模型执行、权限、上下文与 MCP。
- **Domain core** 持有事项、候选、证据与决定，处理版本校验和幂等提交。

CourtWork 将 [Schema Engineering 9.6](PAPER.md) 的工作状态模型落实为可运行的系统。架构与模块边界见 [架构文档](engineering/architecture.md)。

## 深入了解

- [Runtime Control Plane](docs/runtime-control/INDEX.md)：资源、权限、上下文与 MCP。
- [界面组件](docs/interface-components.md)：消息、工作面与交互契约。
- [Continuity conformance](benchmarks/continuity/README.md)：状态连续性的测试方法与复现入口。
- [工程状态](engineering/current.md)：当前进展与交付记录。

## License

[MIT](LICENSE)
`;
}
