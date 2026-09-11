// The page's words, publishing copy (work-first-2026-09-11).
//
// Copy is shared by the page and README. Version/count placeholders are filled
// from the fixed evidence receipt. The current editorial policy is PS-26.
export const PAPER_ENTRY = {
  href: "https://lesprivilege.github.io/Schema-Engineering/",
  baseline: "https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md",
};
export const NAV = [
  { label: "Tour", href: "./tour.html" },
  { label: "Paper", href: PAPER_ENTRY.href },
  { label: "Release", href: "./get.html" },
];

export const HERO = {
  wordmark: "CourtWork",
  tagline: "A place for work to continue.",
  h1: ["Your work. With you in it.", "人在其中，工作继续。"],
  lede: "CourtWork 是一个本地 AI 工作空间。你可以和 Agent 讨论，把任务交给它执行，查看成果并作出决定。材料、决定与未完事项留在同一件工作里，方便你随时回来接着做。",
  actions: [{ href: "./get.html", label: "Get CourtWork", primary: true }, { ...NAV[0], label: "Explore the product" }],
};

export const RAW_GOVERNED = {
  index: "THREE VIEWS",
  title: "One matter. Three views.",
  subtitle: "从来源到决定，每一步都有据可循",
  quote: [
    "Keep the decisions. Prepare the next context.",
    "决定与依据留存，下一次运行按需取用。",
  ],
  lede: "一次工作，三个视角：发生了什么、留下了什么、下一次带上什么。",
  tabs: [
    {
      id: "events",
      label: "Event log",
      text: "按时间追踪请求、工具调用、批准、回答与结果。随时回到工作的任何一步。",
      status: "verified with synthetic data",
    },
    {
      id: "surface",
      label: "Work state",
      text: "在同一个工作面查看候选、证据、决定与版本。每次审阅，推动事项向前。",
      status: "verified with synthetic data",
    },
    {
      id: "context",
      label: "Context projection",
      text: "查看每次运行使用的资源、版本与上下文，以及实际的 token 用量。",
      status: "verified with synthetic data",
    },
  ],
  caption: "同一件工作：过程、状态与下一次执行需要的材料。",
};

export const MATTER = {
  index: "THE WORKFLOW",
  title: "A matter in motion",
  quote: "从第一条请求，到一次有据可循的决定。",
  label: "Interactive NDA walkthrough",
  note: "跟随一份 NDA，走过工具调用、写入批准、提问、文件生成和候选审阅。选择任一步，查看当时的工作状态。",
};

export const ARCHITECTURE = {
  index: "THE COMMITMENT LOOP",
  title: ["From proposal to decision.", "把提议变成有据可循的决定。"],
  paragraphs: [
    "人和 Agent 参与搜索、比较、起草与执行。CourtWork 为同一件工作保留材料、成果、决定和未完事项，让交接有共同依据。",
    "每项任务都有明确的范围、可用材料与完成要求。成果附上来源和依据，经过必要的检查与确认，再纳入正式工作记录。",
    "一次执行结束后，已确认的决定、当前版本与待办义务仍可查证。下一次工作从这些记录出发。",
  ],
  figureTitle: "From state to committed change",
  caption:
    "当前状态 → 上下文投影 → 候选 → 审阅 → 正式变化。",
  closing:
    "Schema Engineering 研究跨会话工作应当保留什么，以及这些记录如何支持下一次执行。",
  links: [
    { label: "Read the paper", href: "https://lesprivilege.github.io/Schema-Engineering/" },
    {
      label: "Canonical",
      href: "https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md",
    },
    {
      label: "Practice",
      href: "https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice.md",
    },
    {
      label: "Practice Index",
      href: "https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md",
    },
  ],
};

export const REVIEW = {
  index: "REVIEW",
  title: "Review is a first-class surface",
  quote:
    "把候选、证据与来源放在一起。看清依据，再作决定。",
  words: [
    { word: "Proposal", text: "逐条规则的候选，绑定它所依据的来源版本。" },
    { word: "Evidence", text: "直接查看候选引用的原文、事实与待补证据。" },
    {
      word: "Decision",
      text: "接受、退回，或要求补充证据。每次决定绑定明确的候选版本。",
    },
    { word: "Provenance", text: "谁、何时、基于哪个版本。产生候选的一方离场后，历史仍然可读。" },
  ],
  distinction: "逐条展开依据，比较修订，保留决定的完整来路。",
};

export const BUILD = {
  index: "GET STARTED",
  title: "Make it yours",
  commands: [
    "git clone https://github.com/lesPrivilege/Courtwork.git",
    "cd Courtwork",
    "npm --prefix app ci",
    "npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845",
  ],
  note: "需要 Node.js 22.19 以上、Python 3 与 Git 2.36 以上。在 Models 中连接你的模型，密钥保存在本机。",
  entries: [
    ["README", "运行、验证与范围。", "README.md"],
    ["engineering/current.md", "已交付能力、证据边界、下一单。", "engineering/current.md"],
    ["engineering/architecture.md", "模块所有权与边界。", "engineering/architecture.md"],
    ["engineering/roadmap.md", "长期路线与验证门。", "engineering/roadmap.md"],
    ["docs/runtime-control/INDEX.md", "资源、权限、MCP 与上下文绑定。", "docs/runtime-control/INDEX.md"],
    ["docs/interface-components.md", "布局、消息、工作面、焦点与状态 owner。", "docs/interface-components.md"],
    ["PAPER.md", "采用的论文版本与反馈路径。", "PAPER.md"],
  ],
  components: [
    ["Web UI.", "原生 ES module 前端，呈现会话、运行、文件与审阅。"],
    [
      "Host runtime.",
      "组织模型与工具执行，管理配置、权限与上下文。",
    ],
    [
      "Domain core.",
      "Matter、候选、证据与决定，配合版本校验与幂等提交。",
    ],
  ],
  upstream:
    "从模型连接到工作审阅，各层通过明确的契约协作。局部实现与依赖见仓库架构文档。",
};

export const FOOTER = {
  items: ["Open source", "Source on GitHub", "MIT License", "Schema Engineering 9.6"],
};
