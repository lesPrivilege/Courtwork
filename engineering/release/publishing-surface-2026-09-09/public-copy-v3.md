# Public copy v3 · product voice

2026-09-10 · PS-26。正文直接讲产品与工作价值，删除保护性措辞与设计动机旁白。结构继续沿 PS-21；定价短标记为 Concept pricing，方案内容见 site/src/pricing.mjs。证据范围保留在 Evidence 和原始回执。

## HERO

```json
{
  "wordmark": "CourtWork",
  "tagline": "A place for expert work to take form.",
  "h1": [
    "Turn AI output into work you can build on.",
    "把 AI 的产出，变成接得下去的工作。"
  ],
  "lede": "在本地处理材料，与 AI 一起推进专业工作。工具调用清晰可见，候选带着证据进入审阅，决定与文件留在事项里，下一次打开就能接着做。",
  "actions": [
    {
      "label": "Read the paper",
      "href": "https://lesprivilege.github.io/Schema-Engineering/"
    },
    {
      "label": "Run it locally",
      "href": "#build"
    },
    {
      "label": "Source",
      "href": "https://github.com/lesPrivilege/Courtwork"
    }
  ]
}
```

## RAW_GOVERNED

```json
{
  "index": "01",
  "title": "Anatomy of a governed matter",
  "subtitle": "从来源到决定，每一步都有据可循",
  "quote": [
    "Work agents need governed state, not longer transcripts.",
    "Agent 需要的是受治理的状态，不是更长的对话记录。"
  ],
  "lede": "一次工作，三个视角：发生了什么、留下了什么、下一次带上什么。",
  "tabs": [
    {
      "id": "events",
      "label": "Event log",
      "text": "按时间追踪请求、工具调用、批准、回答与结果。随时回到工作的任何一步。",
      "status": "verified with synthetic data"
    },
    {
      "id": "surface",
      "label": "Work state",
      "text": "在同一个工作面查看候选、证据、决定与版本。每次审阅，推动事项向前。",
      "status": "verified with synthetic data"
    },
    {
      "id": "context",
      "label": "Compiled context",
      "text": "查看每次运行使用的资源、版本与上下文，以及实际的 token 用量。",
      "status": "verified with synthetic data"
    }
  ],
  "caption": "synthetic data · recorded at CourtWork {sha7} · 三个视图读取同一份记录"
}
```

## MATTER

```json
{
  "index": "02",
  "title": "A matter in motion",
  "quote": "从第一条请求，到一次有据可循的决定。",
  "label": "Replay · synthetic data · recorded at CourtWork {sha7}",
  "note": "跟随一份 NDA，走过工具调用、写入批准、提问、文件生成和候选审阅。选择任一步，查看当时的工作状态。"
}
```

## ARCHITECTURE

```json
{
  "index": "03",
  "title": [
    "Work that exists beyond the model.",
    "让工作存在于模型之外"
  ],
  "paragraphs": [
    "模型负责搜索、比较、起草与执行。CourtWork 把材料、成果、审阅决定和未完事项留在一起。一次运行结束，工作继续。",
    "每次运行从当前状态与相关材料开始。新的提议携带来源进入候选区，经验证与审阅后成为正式变化。",
    "更换模型，开启新的会话，或隔一段时间再回来。已确认的决定、当前版本和待办义务依然有迹可循。"
  ],
  "figureTitle": "From state to committed change",
  "caption": "当前状态 → 运行上下文 → 候选 → 审阅 → 正式变化。",
  "closing": "Built on Schema Engineering 9.6. 从论文中的工作状态模型，到可以运行、审阅与复现的实现。",
  "links": [
    {
      "label": "Read the paper",
      "href": "https://lesprivilege.github.io/Schema-Engineering/"
    },
    {
      "label": "Canonical",
      "href": "https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md"
    },
    {
      "label": "Practice",
      "href": "https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice.md"
    },
    {
      "label": "Practice Index",
      "href": "https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md"
    }
  ]
}
```

## REVIEW

```json
{
  "index": "04",
  "title": "Review is a first-class surface",
  "quote": "把候选、证据与来源放在一起。看清依据，再作决定。",
  "words": [
    {
      "word": "Proposal",
      "text": "逐条规则的候选，绑定它所依据的来源版本。"
    },
    {
      "word": "Evidence",
      "text": "直接查看候选引用的原文、事实与待补证据。"
    },
    {
      "word": "Decision",
      "text": "接受、退回，或要求补充证据。每次决定绑定明确的候选版本。"
    },
    {
      "word": "Provenance",
      "text": "谁、何时、基于哪个版本。产生候选的一方离场后，历史仍然可读。"
    }
  ],
  "distinction": "逐条展开依据，比较修订，保留决定的完整来路。"
}
```

## EVIDENCE

```json
{
  "index": "05",
  "title": "Evidence",
  "quote": "打开记录，检查方法，亲自复现。",
  "list": [
    {
      "item": "Benchmark",
      "text": "Continuity conformance：六个用例覆盖来源替换、回执重放、重启、身份校验与版本冲突。",
      "entry": "benchmarks/continuity/"
    },
    {
      "item": "Fixture",
      "text": "由真实 HTTP、Pi loopback 与 Core 生成的确定性数据包，附 sha256。",
      "entry": "app/tests/fixtures/work-core/nda-packets.json"
    },
    {
      "item": "Tests",
      "text": "固定产品版本的完整应用测试。",
      "entry": "npm --prefix app test"
    },
    {
      "item": "Version",
      "text": "Paper 9.6 `d78fd31` · 产品 `{sha7}` · 站点 `{site_sha7}`",
      "entry": "PAPER.md"
    },
    {
      "item": "Decisions",
      "text": "架构裁决，从第一条起可读。",
      "entry": "engineering/decisions.md"
    },
    {
      "item": "Paper revision",
      "text": "论文的版本级变化。",
      "entry": "CHANGELOG.md（Schema Engineering）",
      "href": "https://github.com/lesPrivilege/Schema-Engineering/blob/main/CHANGELOG.md"
    }
  ],
  "evalIntro": "从输入、运行方法到原始结果，完整检查一次 continuity conformance 测试。",
  "eval": [
    {
      "question": "What was tested?",
      "text": "Continuity conformance。六个用例，每个 checkpoint 校验完整的语义状态：观察是否在场、来源版本、候选的归属与依据、义务语义、效果计数、成果内容、决定与回执的绑定、拒绝或重启之后状态是否保持。测试范围：协议保真度。"
    },
    {
      "question": "Against what?",
      "text": "S：一个认真实现的普通持久化机制，带版本化来源与文档、提交、任务、审批、审计与回执表、事务与 compare-and-set、绑定 payload 的幂等。E 是 CourtWork 的 Core。两者使用同一组符合性要求。只有 transcript 加检索的条件 T：not yet。"
    },
    {
      "question": "With which model?",
      "text": "Deterministic clients。模型 pilot：not yet。"
    },
    {
      "question": "Which harness?",
      "text": "`benchmarks/continuity/run.mjs` 编排六个用例；E 经 `CoreClient` 驱动真实 Core，S 经 `standard.py`；`observe.mjs` 把原始输出映射为语义字段，`grade.mjs` 独立校验。CourtWork `{sha7}`。"
    },
    {
      "question": "Which fixture?",
      "text": "一个合成的“证据备忘录”族，开发集，六个用例：normal · stale-source · receipt-replay · restart · actor-spoof · cas-conflict。角色与 ID 在执行前冻结，adapter 不决定哪一个候选是对的。"
    },
    {
      "question": "What was held constant?",
      "text": "报告内固定被测文件的 sha256 与 git head 及 dirty 标志；每次尝试的角色与 ID 在执行前冻结；尝试清单在执行任何一条之前落盘。"
    },
    {
      "question": "What failed?",
      "text": "早期 cas-conflict 用例曾命中已关闭候选，修订为同一 base 上的第二个待决候选。当前结果与逐次尝试记录见下方 raw record。"
    },
    {
      "question": "Can I reproduce it?",
      "text": "`node --test benchmarks/continuity/grade.test.mjs`；`node benchmarks/continuity/run.mjs --output /absolute/path/result.json`。需要仓库根目录、Node 22.19 以上、Python 3 标准库；输出文件须是新文件；不用 provider、不联网。"
    }
  ],
  "evalFooter": "拒绝结果的四个名字（stale_source · request_conflict · authority_rejected · version_conflict）是被测系统的正确拒绝，不是评测的失败分类。",
  "evalActions": [
    {
      "label": "method",
      "href": "https://github.com/lesPrivilege/Courtwork/blob/main/benchmarks/continuity/observation-contract.md"
    },
    {
      "label": "raw record",
      "href": "./evidence/continuity-{sha7}.json"
    },
    {
      "label": "reproduce",
      "href": "#build"
    }
  ],
  "claimsNote": "每份记录包含对应版本、运行条件与验证范围。"
}
```

## CLAIMS

```json
[
  [
    "从独立 clone 安装、测试、启动",
    "verified with synthetic data",
    "evidence/final-integration-20260908/sync.md"
  ],
  [
    "Run 链：回答、精确写入批准、文件身份、预览、拒绝、停止、断线重连",
    "verified with synthetic data",
    "evidence/final-integration-20260908/README.md"
  ],
  [
    "运行控制：配置 CAS、来源、上下文、MCP 生命周期",
    "verified with synthetic data",
    "evidence/rc/"
  ],
  [
    "MCP 未知效果后封闭后续调用",
    "verified with synthetic data",
    "evidence/final-integration-20260908/mcp-unknown.json"
  ],
  [
    "Continue in Work：Chat 绑定 Matter，历史与 Project 保留",
    "verified with synthetic data",
    "evidence/fe03/"
  ],
  [
    "合成 NDA：逐规则候选 → 审阅 → 正式决定；幂等与过时版本拒绝",
    "verified with synthetic data",
    "evidence/wk10b2-main-integration-20260908/"
  ],
  [
    "新 Session 继续同一事项；产生候选的一方缺席时历史可读",
    "verified with synthetic data",
    "evidence/se-continuity-20260908/"
  ],
  [
    "Models：Catalog provider · Compatible endpoint · Local endpoint；Test connection、Fetch models",
    "runs locally",
    "evidence/fe03-main-integration-20260909/"
  ],
  [
    "Settings 整页；Appearance 本设备偏好",
    "runs locally",
    "evidence/cc-s-main-integration-20260909/"
  ],
  [
    "真实模型 provider 路径",
    "not yet",
    "用户在界面配置"
  ],
  [
    "有界模型 pilot 与对比分数",
    "not yet",
    "—"
  ],
  [
    "事项级记忆、Temporary chat",
    "not yet",
    "—"
  ],
  [
    "桌面安装包、签名",
    "not yet",
    "—"
  ]
]
```

## BUILD

```json
{
  "index": "08",
  "title": "Build / inspect / reproduce",
  "commands": [
    "git clone https://github.com/lesPrivilege/Courtwork.git",
    "cd Courtwork",
    "npm --prefix app ci",
    "npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845",
    "npm --prefix app test"
  ],
  "note": "需要 Node.js 22.19 以上、Python 3、Git 2.36 以上。默认 provider 是本地确定性 fake；真实 provider 在界面里配置，密钥不进入仓库、聊天或截图。",
  "entries": [
    [
      "README",
      "运行、验证与范围。",
      "README.md"
    ],
    [
      "engineering/current.md",
      "已交付能力、证据边界、下一单。",
      "engineering/current.md"
    ],
    [
      "engineering/architecture.md",
      "模块所有权与边界。",
      "engineering/architecture.md"
    ],
    [
      "engineering/roadmap.md",
      "长期路线与验证门。",
      "engineering/roadmap.md"
    ],
    [
      "docs/runtime-control/INDEX.md",
      "资源、权限、MCP 与上下文绑定。",
      "docs/runtime-control/INDEX.md"
    ],
    [
      "docs/interface-components.md",
      "布局、消息、工作面、焦点与状态 owner。",
      "docs/interface-components.md"
    ],
    [
      "PAPER.md",
      "采用的论文版本与反馈路径。",
      "PAPER.md"
    ]
  ],
  "components": [
    [
      "Web UI.",
      "原生 ES module 前端，呈现会话、运行、文件与审阅。"
    ],
    [
      "Host runtime.",
      "Pi AgentSession 0.85.1 驱动运行，本地控制面管理配置、权限、资源与 MCP。"
    ],
    [
      "Domain core.",
      "Matter、候选、证据与决定，配合版本校验与幂等提交。"
    ]
  ],
  "upstream": "CourtWork 运行在 Pi agent SDK（`@earendil-works/pi-*` 0.85.1）与官方 MCP client 2.0.0 之上；harness core 管理策略、状态与审阅。"
}
```

## FOOTER

```json
{
  "items": [
    "Open source",
    "Source on GitHub",
    "{sha7} / {site_sha7}",
    "MIT License",
    "Schema Engineering 9.6"
  ]
}
```

## Pricing

Plans for the way you work / 从个人工作，到团队协作。

在本地开始，按自己的节奏扩展。独立工作、托管运行或组织部署，共用一套可追溯的工作基础。

Your work. Your models. Room to grow. / 工作留在手里，模型自由选择。

Local $0 · Open source；Professional $29 / month · Managed；Organization Custom · Private deployment。三列能力清单沿 pricing-specimen；Explore hosted / Explore organization 为页内图表导航，不是购买入口。
