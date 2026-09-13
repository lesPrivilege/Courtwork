# Research lab preparation · 2026-09-11

**状态：筹备与基线设计；不是已运营的实验室，不是 Anthropic 等价性声明，也不是产品接受或部署回执。**
**观察日：2026-09-11（Asia/Singapore）。**
**主线基线：Courtwork `main@2337ada33f1d59543c33ac9e98fcacc5a9e34d21`。**

本件把最新一轮对话收敛为一个可检验的 lab-preparation track：先定义研究对象、比较轴、证据门和真实能力边界，再决定是否值得建立长期的研究/软件实验室。目标不是复制 Anthropic 的组织、模型或商业条件，而是建立一个能对 frontier-lab 公开材料提出同等严肃问题、并能用可复现实验支撑自身主张的研究单元。

## 1. 本轮入账

来源为 ChatGPT task `6aa3cac2-0b64-83ec-86d3-f4556e2bee0e` 的最新同步结果；本次新增 6 个 turn，连同上一轮已登记 5 个 turn，均只作为研究输入，不自动产生产品裁定或外部事实。

| 输入 | 本地处置 |
|---|---|
| “les Privilege”与 Anthropic 的节奏/音韵接近 | 记为品牌与修辞观察；不是语言学事实、商标关系或组织关联 |
| 在 distillation 之后设计受控 deconstruction experiment | 采纳为方法候选：证据编译、盲写作者、盲评审、对照组；尚未执行，不称结果 |
| “危机修辞 / uncanny fake vendor” | 保留为 fictional/editorial frame；工程材料只使用“事实、机构尺度、证据”三分，不虚构供应商或内部消息 |
| 外部新闻截图与 AI 竞速/放缓讨论 | 只记录为需归因的外部语境；截图不作独立核验，不外推为 Anthropic 或 OpenAI 的统一立场 |
| `A/auth`、authority 与 dystopia 的解构 | 记为 semiotic interpretation；可帮助设计 authority/provenance 研究问题，但不证明任何厂商意图 |
| `Juliana Sorel / 朱莉安娜·索蕾尔`、`Sorel Julien` 与中文音译漂移 | 记为 fictional founder / camouflage 设计；不写成现实人物、公司注册或文学史事实 |
| `les → 蕾丝 → lace → Lovelace`、Claude/Shannon 的对位 | 记为品牌符号学暗线；不写成 Anthropic、Claude 或 Ada Lovelace 的命名意图 |
| 开源权重、技术论文、DeepSeek/OpenAI/Anthropic reasoning 路线的知识流动 | 记为待核验的研究命题；不从时间相邻推出因果，不把“开源/闭源”简化成单一道德分类 |
| provider 同时掌握模型、线路、日志与归因的“observation privilege” | 采纳为 authority/provenance 实验问题；报告中的具体指控、用户数据处理和中转行为仍需逐项官方来源与独立复核 |

新增输入的共同结论是：如果要成为“真实 lab”，必须把风格、品牌和新闻语境降为可标注的研究材料，把可重复的实验、来源、权限、评审和失败记录升为一等对象。

## 2. Lab thesis

> **模型可以替换；研究对象、证据链、工作状态和人的裁决必须可持续。**

这条 thesis 延续 Courtwork 与 Schema Engineering 已固定的方向，但不把方向写成已完成能力：

- **Model layer**：模型/provider 是受控变量与替换轴，不把 provider 名称当成真实上游身份认证。
- **Runtime / harness layer**：运行时、工具、context projection、权限和失败恢复是可观察实验变量；工具成功不等于工作接受。
- **Work substrate**：Matter、Candidate、Decision、Artifact、source history 和 commit boundary 是待验证的工作语义，不是页面存在即已闭合的能力。
- **Evidence / authority**：系统事实、模型提议、评估结果、人工决定和发布回执必须分层；读取权不授予提交权。
- **Research narrative**：公开材料用于提出问题和建立可归因的比较，不用于把 Anthropic 的自述或社区口碑改写成独立事实。
- **Operations**：以小型、可复现、可复核的研究循环起步；不虚构团队规模、资金、客户、模型训练集群或生产负载。

## 3. 与 Anthropic 对标的比较轴

“对标”在本件中指研究严肃性与问题覆盖面的可比，不指模型能力、资本规模、员工数量、收入、部署规模或法律身份等价。

| 比较轴 | lab 要回答的问题 | 第一阶段可接受证据 | 当前状态 |
|---|---|---|---|
| 模型与能力 | 在相同任务、预算和 provider 条件下，输出能力与失败模式如何变化？ | 固定 prompt/task split、requested/returned identity、重复实验与盲评 | 研究合同候选，未运行正式 benchmark |
| Runtime / harness | 权限、工具、context、恢复与 runtime 变化是否改变结果？ | request snapshot、执行 trace、失败/取消/恢复记录、独立复核 | 既有 DRT/WCI 输入可接，未升级为 lab benchmark |
| Work substrate | 模型替换或 session 结束后，哪些工作语义仍可回读、审阅和继续？ | synthetic Matter/Run/Decision fixtures、迁移/恢复反例、schema 证据 | Courtwork 合同已有，真实纵切仍开放 |
| Evidence / authority | 哪个事实来自哪里，谁能提出、执行、接受或撤销？ | source hash、provenance、decision receipt、权限反例 | 架构与 Paper 已固定，独立实验门未关闭 |
| Research/publication | 能否把主张、方法、限制和未决问题公开到可复核程度？ | versioned protocol、negative results、raw/derived separation、review log | 筹备中 |
| Operations / continuity | 研究是否可持续，而非单轮聊天或一次截图？ | run ledger、成本/延迟记录、独立复现、变更日志 | 尚未形成实际 lab operations |

## 4. 第一批实验候选

### L0 · Evidence compiler

把固定仓库、Paper、公开来源、会话输入和实验结果编译成带 hash、来源类型、观察时间与权限边界的 evidence bundle。编译器只能整理和标注，不能把 inference 晋升为 fact，也不能把模型摘要当成认证。

### L1 · Blind deconstruction

受控输入分成：

1. **evidence compiler**：只接收带来源的材料与任务合同；
2. **blind writer**：在不知晓研究立场的情况下生成分析或实验计划；
3. **blind reviewer**：按预注册 rubric 评估可追溯性、事实/推断分层、遗漏与越权；
4. **controls**：无 provenance、带立场提示、仅页面截图或仅模型摘要的对照组。

这一设计是方法提案，不是已经完成的 distillation 研究，也不暗示任何模型或厂商被成功解构。

### L2 · Replacement / continuity benchmark

固定同一任务、source set、权限与预算，只替换 model/provider/runtime/context projection，比较：

- accepted work 的语义是否稳定；
- source anchors、decision boundary 和 artifact identity 是否保持；
- context compaction、失败、取消、重试和恢复后是否能解释“发生了什么”；
- 人的 review 成本、误接受率、未决项遗漏率是否变化。

首版只使用 synthetic fixtures、local-fake/loopback 或明确授权的 provider；不读取个人凭据，不默认调用付费服务，不把浏览器截图当 benchmark 结果。

### L3 · Authority / provenance study

把 `A/auth` 的 semiotic 观察翻译成可测问题：用户能否区分模型建议、系统验证、provider 返回、评估分数和人类接受？界面是否把“看见”误导成“拥有权限”？这条线必须独立于品牌视觉裁定，并由可观察行为、权限反例和审阅任务验证。

## 5. 事实、解释、假设的分层

| 标签 | 允许内容 | 本件示例 |
|---|---|---|
| **Observed** | 固定仓库、Paper、官方公开页面、实验日志直接出现的内容 | `main` 的 Work Core 合同；Anthropic 页面上的公开主张；已保存的会话 turn |
| **Interpretation** | 明确标注的结构性连接或设计判断 | “模型之外的工作合同可能是更持久的研究对象” |
| **Hypothesis** | 可被实验反驳的预测 | “相同任务下，显式 provenance 会降低错误接受” |
| **Satire / editorial** | 虚构厂商、品牌戏剧性或 FakesNews 叙事 | fake vendor、危机修辞、April Fools 文案 |
| **Not established** | 尚无足够证据或不能从现有材料推出的内容 | Anthropic 意图、现实组织关系、性能优越、真实用户影响 |

任何公开 lab 文档都必须保留这些标签，尤其不能把“对标 Anthropic”写成现实公司比较结论。

## 6. 证据门与停止条件

在称为“真实 lab”之前，至少需要：

1. **Identity gate**：固定版本、输入、provider 请求与返回身份；缺失值显式记录。
2. **Protocol gate**：预先登记任务、控制组、预算、重复数、排除标准和评分 rubric。
3. **Trace gate**：保留原始 trace、派生 context、模型输出、系统检查、人类决定和失败记录；不以摘要替代原件。
4. **Independent gate**：作者不能独自宣称接受；至少一次独立复核或盲评，并记录分歧。
5. **Reproducibility gate**：另一运行者可在 synthetic 或已授权环境中复现关键结论。
6. **Publication gate**：对外文字区分事实、解释、限制与未完成项，不使用未获授权的外部联络或真实公司内部叙事。

未满足这些门时，状态只能写为“筹备”“研究输入”或“实验候选”，不能写“benchmark complete”“lab validated”“对标完成”。

## 7. 外部比较材料

以下链接是 Anthropic 官方公开材料，用于比较其公开叙事与可研究问题；页面中的指控、数量和自我描述必须归因于 Anthropic，不能改写为本项目独立核验：

- [Detecting and preventing distillation attacks](https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks)
- [Detecting and countering misuse of AI: September 2026](https://www.anthropic.com/threat-intelligence-report-september-2026)
- [Our position on open-weights models](https://www.anthropic.com/news/position-open-weights-models)
- [An alignment assessment of recent cybersecurity incidents](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents)
- [An update on recent Claude Code quality reports](https://www.anthropic.com/engineering/april-23-postmortem)
- [How Claude’s text watermark works](https://www.anthropic.com/news/claude-text-watermark)

这些材料支持提出“模型、harness、授权、provenance、评估与组织叙事如何相互影响”的问题；不支持声称 Courtwork 与 Anthropic 在规模、质量、安全性或商业能力上等价。

## 8. 当前不做的事

- 不宣布成立现实公司、实验室团队或研究组织。
- 不训练 foundation model，不购买 GPU，不接入个人凭据，不使用未授权的真实数据。
- 不把 FakesNews / April Fools 素材发布为新闻，不伪造 Anthropic、OpenAI 或其他现实组织的匿名消息。
- 不因本件关闭 G1–G5、真实 provider、无障碍、产品验收、Paper 发布或 Pages 发布门。
- 不提交、不推送、不部署；本件只是工程研究登记。

## 9. 下一步候选

1. 固定第一版 benchmark protocol 与 synthetic fixture schema。
2. 为 evidence compiler 建立最小 CLI/JSON bundle 规范，先只读。
3. 做一轮盲写作者/盲评审 pilot，保留 raw、评分与失败案例。
4. 由非作者复核 protocol、指标与 evidence bundle，再决定是否扩展到已授权 provider。
5. 只有在证据门满足后，才讨论独立 lab 名称、公开研究页面或长期运行预算。

本轮已另行整理[Claude independent report blind handoff](../claude-independent-report-handoff-2026-09-11/README.md)：可见包只提供中性项目事实、命名材料、公共语境和 review rubric，不告知 Claude Fake、satire、反 Anthropic、预期风格或素材编排意图；宿主边界另存于[operator-only notes](../claude-independent-report-operator-2026-09-11/README.md)，不得挂载给 Claude。Claude 已返回四文件候选，见 [return intake](../claude-independent-report-handoff-2026-09-11/return-intake.md)；当前只计为 candidate-returned-not-accepted，字数元数据与“材料未建立事实”措辞仍需修订。此前显式标签的 [Fake report handoff](../claude-fakesnews-report-handoff-2026-09-11/README.md) 与误建的 [brand SVG handoff](../claude-brand-svg-handoff-2026-09-11/README.md) 均保留并标记为非 Claude 输入；不构成文章接受、品牌接受或产品接入。

**本件结论：** Courtwork 已有一组可以承载 lab 的语义与工程合同，但“真实 lab”目前仍是筹备目标。下一步应先让实验协议和证据链成立，再让品牌、叙事和对标语言跟上。
