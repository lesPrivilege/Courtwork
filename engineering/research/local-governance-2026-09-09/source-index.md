# 来源消费与追溯索引

来源：[本地数据治理查询](chatgpt-conversation://6aa100da-de90-83ec-8921-51d831cf16e7)，用户于2026-09-09授权参考和消费全量 turn。本轮读取接口返回全部五个 turn（`hasMore=false`、无下一页），共九条文本消息和一张图片；未观察到消息截断标记。T02只有用户消息，未返回对应研究报告，不能补写成已读。这里“全量”指该次接口可返回的全部内容，不声称获得隐藏推理、工具附件或未返回的报告。

[清单](source-manifest.json)保留 conversation/turn/message ID、精确返回文本的长度与SHA-256、图片摘要和全部30个明文外链。摘要索引不替代原文；后续可凭ID回读并按清单规则比较hash。完整对话和图片未复制入Git；因此本仓库可定位/校验来源，但脱离原会话授权不能重建完整原文。原文不透明 citation token 没有可解析URL的部分明确未核验。

## 逐 turn 消费

| Turn / 原消息定位 | 内容与处置 | 后续消费者 |
|---|---|---|
| T01 · `4922ac6c-7715-4998-9501-f144c188b13f` | 本地治理和受控读取；采纳 exact/schema→lexical/structural→必要时semantic/model、bounded reads、出处与freshness。Spotify/CodeNib数字只记原作者报告，不外推。 | LG-02、B2/B3 |
| T02 · `ff0574f4-9f5e-4bdd-a553-f7841c629110` | 用户要求按第一性原理为后续自研保留索引、不新增外部依赖；采纳此约束。只有提问，未消费不存在于返回结果的报告。 | 全包边界 |
| T03 · `eb3d4ca1-835a-474f-89ab-c9893a3ca63a` | 法律优先的通用资料Intake、人工目录不变、OCR缓存与结构/关系。采纳只读与派生缓存；改写“sidecar全可删”为仅缓存可重建；accepted状态与来源保留另有owner。维护协议只借measure→find→verify的有界原则。 | LG-00…04 |
| T04 · `5f7d68cd-10c0-40ca-a0da-cc4f00d26046` | Pi/DSH/OpenCode、Session/Run/Profile/Event/Artifact、steer/followup、研究任务与UI。复用已有Run和Core；事件投影只作runtime方法；团队、递归与托管provider接入延后；Review不按投票赋权。 | EX-01/02/FE |
| T05 · `9d9cc485-0158-4129-abd0-f7276febedc4` | B0…B5、A0…A7、corpus与突变。明确六层；先最小arm；成本含预处理；OCR定位与正确性分开；增量只比较派生逻辑视图；示例数值不是实测。 | benchmark-plan |

T01图片 `IMG_2376.jpeg` 已目视读取：中文社交帖子转述Spotify hook、350行分流、90%与漏掉线程安全问题。它是二手截图，不是效果证据；具体方法回到X01原文。原对话中的外部工具@调用是来源内容，不当作新的安装、付费检索或执行指令。

## 外链逐项索引

观察日期2026-09-09。`primary_page_spotchecked`仅表示读到原始页面并核对下列方法范围；未独立复现实验、未安装框架、未下载数据。其余`indexed_unverified`只保留原会话引用，不证明页面标题、存在性、API、数字或许可。所有来源均非本轮新增依赖；实施前须固定release/commit/paper或dataset revision，并重查适用许可。浏览日期不等于版本pin。

| ID | 原文引用入口 | 来自 | 状态 / 消费者 |
|---|---|---|---|
| X01 | [Spotify Engineering 原文](https://engineering.atspotify.com/2026/9/portal-by-spotify-cut-my-claude-code-token-usage-by-90) | T01 | primary_page_spotchecked；LG-02 / B3 |
| X02 | [Developer Experience for Agents](https://engineering.atspotify.com/2026/6/code-with-claude-coding-is-no-longer-the-constraint) | T01 | indexed_unverified；LG-02 |
| X03 | [CodeNib](https://ar5iv.labs.arxiv.org/html/2607.25431) | T01 | indexed_unverified；LG-02 |
| X04 | [Command Code 的 Read Tool](https://commandcode.ai/docs/harness-engineering/read-tool) | T01 | indexed_unverified；LG-02 |
| X05 | [DSH Core](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/core) | T04 | primary_page_spotchecked；EX-01 |
| X06 | [DSH Subagent Capability Seam](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-06-21-subagent-capability-seam.md) | T04 | indexed_unverified；EX roadmap |
| X07 | [Pi SDK](https://pi.dev/docs/latest/sdk) | T04 | indexed_unverified；EX roadmap |
| X08 | [OpenAI Multi-agent](https://developers.openai.com/api/docs/guides/responses-multi-agent) | T04 | indexed_unverified；EX roadmap |
| X09 | [OpenCode Agents](https://opencode.ai/docs/agents/) | T04 | indexed_unverified；EX roadmap |
| X10 | [OpenCode Server](https://opencode.ai/docs/server/) | T04 | indexed_unverified；EX roadmap |
| X11 | [Codex Subagents](https://developers.openai.com/codex/subagents) | T04 | indexed_unverified；EX roadmap |
| X12 | [Gemini Deep Research API](https://ai.google.dev/gemini-api/docs/deep-research) | T04 | indexed_unverified；EX roadmap |
| X13 | [Google Deep Research Max](https://blog.google/innovation-and-ai/models-and-research/gemini-models/next-generation-gemini-deep-research/) | T04 | indexed_unverified；EX roadmap |
| X14 | [OpenAI Deep Research API](https://developers.openai.com/api/docs/guides/deep-research) | T04 | indexed_unverified；EX roadmap |
| X15 | [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) | T04 | indexed_unverified；EX roadmap |
| X16 | [Pi coding-agent](https://github.com/earendil-works/pi) | T04 | indexed_unverified；EX roadmap |
| X17 | [pi-subagents](https://github.com/tintinweb/pi-subagents) | T04 | indexed_unverified；EX roadmap |
| X18 | [TREC Legal Track](https://trec-legal.umiacs.umd.edu/) | T05 | primary_page_spotchecked；B2 / B4 |
| X19 | [LegalBench-RAG](https://arxiv.org/abs/2408.10343) | T05 | primary_page_spotchecked；B2 |
| X20 | [CodeNib](https://arxiv.org/html/2607.25431) | T05 | primary_page_spotchecked；LG-02 / LG-04 |
| X21 | [ContextBench](https://arxiv.org/abs/2602.05892v1) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X22 | [Agent Retrieval Bench](https://arxiv.org/html/2607.24882) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X23 | [BigLaw Bench](https://github.com/harveyai/biglaw-bench) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X24 | [Legal Agent Benchmark 初步结果](https://www.harvey.ai/blog/legal-agent-benchmark-initial-results) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X25 | [Deep Agentic Search for Repository-Level Code QA](https://arxiv.org/html/2608.01507v1) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X26 | [ContractScrub](https://arxiv.org/html/2608.20204) | T05 | primary_page_spotchecked；B4 |
| X27 | [CLAUSE](https://doi.org/10.18653/v1/2026.findings-eacl.305) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X28 | [BrowseComp-Plus](https://arxiv.org/html/2508.06600v1) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X29 | [DR3-Eval](https://arxiv.org/pdf/2604.14683) | T05 | indexed_unverified；B2/B3/B4 candidate |
| X30 | [CUAD](https://arxiv.org/abs/2103.06268) | T05 | indexed_unverified；B2/B3/B4 candidate |

X03与X20是同一论文的不同引用入口；只抽查X20，不把X03镜像标成已验证。X06是可变master路径，X07是latest；均不得直接用于实施版本锁定。

## 六个页面的核验边界

- **X01 [Spotify Engineering 原文](https://engineering.atspotify.com/2026/9/portal-by-spotify-cut-my-claude-code-token-usage-by-90)**（2026-09-03）：受控 bulk-reader/code-writer 与 PreToolUse 有界读取；默认350行是该实现参数。90%为作者场景自报，非本项目结果；线程安全漏报说明委派边界。 消费：LG-02 / B3。许可/版本限制：文章未核验实现/数据许可。
- **X05 [DSH Core](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/core)**（页面未标日期）：typed append-only SessionEvent 与 deriveMessages 投影；仅该 runtime 的权威设计。subagent seam 未由本页核验。 消费：EX-01。许可/版本限制：未核验许可或固定 commit。
- **X18 [TREC Legal Track](https://trec-legal.umiacs.umd.edu/)**（历史轨道主页）：电子商业记录的法律检索、共享集合/基线与人机审阅成本；主页没有统一定义 high-recall 指标。 消费：B2 / B4。许可/版本限制：各 collection distribution package 分别适用，未下载。
- **X19 [LegalBench-RAG](https://arxiv.org/abs/2408.10343)**（2024-08-19）：法律 RAG retrieval 与最小高度相关片段；摘要规模和专家标注为作者声明，未复核数据。 消费：B2。许可/版本限制：publicly available 不等于再分发授权。
- **X20 [CodeNib](https://arxiv.org/html/2607.25431)**（2026-07-28 v1）：按 repo commit 建 lexical/dense/structural views，结果映射 source ranges；独立重建与轨迹 token 减少为论文自报且有实验条件。 消费：LG-02 / LG-04。许可/版本限制：论文授权不自动涵盖实现和数据。
- **X26 [ContractScrub](https://arxiv.org/html/2608.20204)**（2026-08-20 v1）：针对合同最终 scrub review 的 annotated tasks；不能改写成全部注入缺陷。论文中的模型结果未在本项目复现。 消费：B4。许可/版本限制：页面标论文 CC BY-NC-SA 4.0、CUAD CC-BY-4.0；未验证数据发布及源合同再分发权。

原会话中的法律程序/法院做法只有不透明引用的部分，本轮不主张其法律准确性。X21…30的评测数量、最佳模型、作者/机构和数据许可，除上述X26有界页面内容外不当作已核验事实。

## 复查触发器

LG-02考虑受控读或多视图实现时重查X01…04/20；EX控制面冻结时重查X05…17的实际API、cancel/恢复和许可；评测扩语料时重查X18…30的原始仓库、版本、split与材料权利。没有具体消费者或失败证据时只保留索引。来源撤回、更新或回读hash改变时记录新观察，不覆盖本次清单。外部方法不自动改Paper、架构权威或关闭产品门。
