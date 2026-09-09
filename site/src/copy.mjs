// The page's words, transcribed from the publishing copy (public-copy-v2).
//
// Nothing here is authored at build time. Every string is taken from that
// document as written; where the page needs a version number it carries a
// placeholder the build fills from the recorded evidence. A change to the words
// belongs in the copy document first and is transcribed here afterwards, so
// that the page and the README can never say two different things.
export const NAV = [
  { label: "GitHub", href: "https://github.com/lesPrivilege/Courtwork" },
  { label: "Paper", href: "https://lesprivilege.github.io/Schema-Engineering/" },
  { label: "Docs", href: "https://github.com/lesPrivilege/Courtwork/tree/main/docs" },
];

export const HERO = {
  wordmark: "CourtWork",
  tagline: "A place for expert work to take form.",
  h1: ["Turn AI output into work you can build on.", "把 AI 的产出，变成接得下去的工作。"],
  lede: "CourtWork 是一个实验中的本地 AI 工作空间：处理本地材料，检查每一次工具调用，追溯生成的文件。它正在成为可以审阅、裁定，并跨会话续行的工作面。",
  actions: [
    { label: "Read the paper", href: "https://lesprivilege.github.io/Schema-Engineering/" },
    { label: "Run it locally", href: "#build" },
    { label: "Source", href: "https://github.com/lesPrivilege/Courtwork" },
  ],
};

export const RAW_GOVERNED = {
  index: "01",
  title: "Raw → Governed",
  quote: [
    "Work agents need governed state, not longer transcripts.",
    "Agent 需要的是受治理的状态，不是更长的对话记录。",
  ],
  lede: "同一次 Run 留下三样东西，责任各不相同。它们来自同一个来源，但没有一样是另一样的副本。",
  tabs: [
    {
      id: "events",
      label: "Event log",
      text: "这次 Run 里发生的每件事，按发生顺序：请求、工具调用、批准、回答、结果。它是原始历史；这里没有任何一条自己就能生效。",
      status: "verified with synthetic data",
    },
    {
      id: "surface",
      label: "Work state",
      text: "这次 Run 之后，Work 里正式成立的东西：候选、证据、决定、版本。只有通过验证与裁定的变化才写到这里。",
      status: "verified with synthetic data",
    },
    {
      id: "context",
      label: "Compiled context",
      text: "这次 Run 实际绑定的内容：resource 修订与 hash、加载了什么、用了多少 token。它是从治理状态编译出的最小充分投影，不是整段历史。这段记录里没有加载任何 skill 或 reference，页面如实显示。",
      status: "verified with synthetic data",
    },
  ],
  caption: "synthetic data · recorded at CourtWork {sha7} · 三个视图读取同一份记录",
};

export const MATTER = {
  index: "02",
  title: "A matter in motion",
  quote: "一段已经记录下来的工作，可以逐步重放。这里没有模型在运行；每一次点击显示的都是记录下的事实。",
  label: "Replay · synthetic data · recorded at CourtWork {sha7}",
  note: "标本本身是一段会话、两次 Run。第一次 Run 产生一次写入批准、一个 Question 与一个文件；第二次 Run 产生候选，随后是决定与修订。每一步同时可看上一段的三个层级。",
};

export const ARCHITECTURE = {
  index: "03",
  title: ["Work that exists beyond the model.", "让工作存在于模型之外"],
  paragraphs: [
    "概率模型已经能搜索、比较、解释、起草和调用工具，却不能凭一次输出取得正式工作所需的事实效力、行动权限、完成状态和责任归属。一次 Run 会结束，模型会替换，上下文会压缩；Matter、Artifact、Review decision 与未完义务必须继续存在。",
    "于是一次 Run 的两端分开治理。输入侧把稳定的 Work Contract、当前状态与相关资源投影为这一次任务的 Context；输出侧把模型或人的提议视为 Candidate，只有经过验证、授权与适用的 Review，才写入 Committed Change 并更新当前状态。",
    "单次输出的质量因此不等于跨时间工作的质量。只要 output 会成为后续工作的 input，运行之后留下什么、失效什么、下一次先看什么，就是系统能力的一部分。",
  ],
  figureTitle: "From state to committed change",
  caption:
    "箭头表示机制关系，不表示自动取得效力；候选进入 Context 不等于正式提交。依据 Schema Engineering 9.6 摘要链 B 与 §4.6 / §4.9。",
  closing:
    "CourtWork 按 Schema Engineering 9.6（`d78fd31`）建造。论文是这一页所有观点的权威；CourtWork 是这些观点被试验与检验的地方。产品状态从不修改论文；能够泛化的工程结果带着固定 commit 进入论文的 Practice Index。",
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
  index: "04",
  title: "Review is a first-class surface",
  quote:
    "候选不是结果。它带着证据、来源和版本进入审阅面；人的决定改变正式状态，工具批准不改变。",
  words: [
    { word: "Proposal", text: "逐条规则的候选，绑定它所依据的来源版本。" },
    { word: "Evidence", text: "每条候选引用的来源片段与事实。缺证据的候选照样显示，并标为缺。" },
    {
      word: "Decision",
      text: "接受、退回、要求补证据。同一决定重复提交是幂等的；针对过时版本的决定被拒绝。",
    },
    { word: "Provenance", text: "谁、何时、基于哪个版本。产生候选的一方离场后，历史仍然可读。" },
  ],
  distinction: "这不是把聊天记录换一种排版，也不是把代码 diff 搬过来。审阅的对象是候选与证据，不是消息。",
};

export const EVIDENCE = {
  index: "05",
  title: "Evidence",
  quote: "页面上的每一条声称，对应仓库里一条可以打开的证据。没有用户见证，没有虚构指标。",
  list: [
    {
      item: "Benchmark",
      text: "Continuity conformance：六个用例检验正式状态在来源替换、回执重放、重启、伪造 actor 与过期 base 之下是否保持。结果只在协议内有意义。",
      entry: "benchmarks/continuity/",
    },
    {
      item: "Fixture",
      text: "由真实 HTTP、Pi loopback 与 Core 生成的确定性数据包，附 sha256。",
      entry: "app/tests/fixtures/work-core/nda-packets.json",
    },
    { item: "Tests", text: "数字由构建时从发布 SHA 计算，不手写。", entry: "npm --prefix app test" },
    {
      item: "Version",
      text: "Paper 9.6 `d78fd31` · 产品 `{sha7}` · 站点 `{site_sha7}`",
      entry: "PAPER.md",
    },
    { item: "Decisions", text: "架构裁决，从第一条起可读。", entry: "engineering/decisions.md" },
    {
    item: "Paper revision",
    text: "论文的版本级变化。",
    entry: "CHANGELOG.md（Schema Engineering）",
    href: "https://github.com/lesPrivilege/Schema-Engineering/blob/main/CHANGELOG.md",
  },
  ],
  evalIntro:
    "固定结构，每问只显示发布 SHA 下真实存在的答案，缺者写 not yet。有界模型 pilot 未跑之前不出现任何对比分数；E 与 S 的通过数只从发布 SHA 上重跑生成的记录文件读取。",
  eval: [
    {
      question: "What was tested?",
      text: "Continuity conformance。六个用例，每个 checkpoint 校验完整的语义状态：观察是否在场、来源版本、候选的归属与依据、义务语义、效果计数、成果内容、决定与回执的绑定、拒绝或重启之后状态是否保持。它衡量协议保真度，不衡量 SE 的增量价值。",
    },
    {
      question: "Against what?",
      text: "S：一个认真实现的普通持久化机制，带版本化来源与文档、提交、任务、审批、审计与回执表、事务与 compare-and-set、绑定 payload 的幂等。E 是 CourtWork 的 Core。两者都应通过；这是校准，不是优势证明。只有 transcript 加检索的条件 T：not yet。",
    },
    {
      question: "With which model?",
      text: "没有模型。两个条件都由脚本化的受信客户端驱动，记录里 model 为空。有界模型 pilot：not yet。",
    },
    {
      question: "Which harness?",
      text: "`benchmarks/continuity/run.mjs` 编排六个用例；E 经 `CoreClient` 驱动真实 Core，S 经 `standard.py`；`observe.mjs` 把原始输出映射为语义字段，`grade.mjs` 独立校验。CourtWork `{sha7}`。",
    },
    {
      question: "Which fixture?",
      text: "一个合成的“证据备忘录”族，开发集，六个用例：normal · stale-source · receipt-replay · restart · actor-spoof · cas-conflict。角色与 ID 在执行前冻结，adapter 不决定哪一个候选是对的。",
    },
    {
      question: "What was held constant?",
      text: "报告内固定被测文件的 sha256 与 git head 及 dirty 标志；每次尝试的角色与 ID 在执行前冻结；尝试清单在执行任何一条之前落盘。",
    },
    {
      question: "What failed?",
      text: "首次运行 11/12：cas-conflict 用例误命中一个已关闭的候选。修正的是用例（改为同一 base 上的第二个待决候选），Core 没有为迎合测试而改动；随后 12/12。发布 SHA 上的重跑结果从记录文件读取；没有记录则 not yet。",
    },
    {
      question: "Can I reproduce it?",
      text: "`node --test benchmarks/continuity/grade.test.mjs`；`node benchmarks/continuity/run.mjs --output /absolute/path/result.json`。需要仓库根目录、Node 22.19 以上、Python 3 标准库；输出文件须是新文件；不用 provider、不联网。",
    },
  ],
  evalFooter:
    "拒绝结果的四个名字（stale_source · request_conflict · authority_rejected · version_conflict）是被测系统的正确拒绝，不是评测的失败分类。",
  evalActions: [
    { label: "method", href: "https://github.com/lesPrivilege/Courtwork/blob/main/benchmarks/continuity/observation-contract.md" },
    { label: "raw record", href: "https://github.com/lesPrivilege/Courtwork/tree/main/evidence/publishing-surface-2026-09-09" },
    { label: "reproduce", href: "#build" },
  ],
  claimsNote:
    "not yet 行只写目标，不写日期。“Astra 核对”行的证据路径由非作者在发布 SHA 下核对；不成立者降档，不删行。",
};

// The claim table (public-copy-v2 §6.3), verbatim. `entry` is the path a reader
// opens; `href` is that path in the published repository.
export const CLAIMS = [
  ["从独立 clone 安装、测试、启动", "verified with synthetic data", "evidence/final-integration-20260908/sync.md"],
  ["Run 链：回答、精确写入批准、文件身份、预览、拒绝、停止、断线重连", "verified with synthetic data", "evidence/final-integration-20260908/README.md"],
  ["运行控制：配置 CAS、来源、上下文、MCP 生命周期", "verified with synthetic data", "evidence/rc/"],
  ["MCP 未知效果后封闭后续调用", "verified with synthetic data", "evidence/final-integration-20260908/mcp-unknown.json"],
  ["Continue in Work：Chat 绑定 Matter，历史与 Project 保留", "verified with synthetic data · Astra 核对", "evidence/fe03/"],
  ["合成 NDA：逐规则候选 → 审阅 → 正式决定；幂等与过时版本拒绝", "verified with synthetic data · Astra 核对", "evidence/wk10b2-main-integration-20260908/"],
  ["新 Session 继续同一事项；产生候选的一方缺席时历史可读", "verified with synthetic data · Astra 核对", "evidence/se-continuity-20260908/"],
  ["Models：Catalog provider · Compatible endpoint · Local endpoint；Test connection、Fetch models", "runs locally", "evidence/fe02-main-integration-20260909/"],
  ["Settings 整页；Appearance 本设备偏好", "runs locally", "evidence/cc-s-main-integration-20260909/"],
  ["真实模型 provider 路径", "not yet", "用户在界面配置"],
  ["有界模型 pilot 与对比分数", "not yet", "—"],
  ["事项级记忆、Temporary chat", "not yet", "—"],
  ["桌面安装包、签名", "not yet", "—"],
];

export const BUILD = {
  index: "06",
  title: "Build / inspect / reproduce",
  commands: [
    "git clone https://github.com/lesPrivilege/Courtwork.git",
    "npm --prefix app ci",
    "npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845",
    "npm --prefix app test",
  ],
  note: "需要 Node.js 22.19 以上、Python 3、Git 2.36 以上。默认 provider 是本地确定性 fake；真实 provider 在界面里配置，密钥不进入仓库、聊天或截图。",
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
    ["Web UI.", "原生 ES module 前端。它投影 Chat、Run、文件与运行资源；不持有工作状态，不持有凭据。"],
    [
      "Host runtime.",
      "Pi AgentSession 0.85.1 执行 Run；本地控制面持有配置、作用域、权限策略、MCP 生命周期与 Run 准入。已安装、运行中、已曝光、已许可是四件分开的事。",
    ],
    [
      "Domain core.",
      "一个样本 Core 持有 Matter、候选、证据与决定，带 compare-and-set 版本与幂等的人类决定。它是开发样本，不是通用法律产品。",
    ],
  ],
  upstream:
    "CourtWork 运行在 Pi agent SDK（`@earendil-works/pi-*` 0.85.1）与官方 MCP client 2.0.0 之上；harness core 在其上加入策略、状态与审阅边界，不重写 loop。",
};

export const FOOTER = {
  items: ["Experimental", "Source on GitHub", "{sha7} / {site_sha7}", "MIT License", "Schema Engineering 9.6"],
};
