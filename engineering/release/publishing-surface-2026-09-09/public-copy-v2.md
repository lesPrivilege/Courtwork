# 发布面文案 v2（Fable，2026-09-09）

用途：GitHub Pages 与根 README 直接取词的文案与事实绑定。替代 [2026-09-08 版](../2026-09-08/public-copy.md) 的 §2、§3 动作、§5、§6、§8、§12；其余段落在此改写为中文主语后沿用。裁定见 [intake](intake.md)：语言 PS-6，词表与状态档 PS-5，六段骨架 PS-2，标本边界 PS-7，Eval PS-13。叙事以 Paper 为权威；CourtWork 是命题被试验与检验的地方；产品状态只从 [current](../../current.md) 取。

体例：一页，中文为主。English 保留在字标、H1、段标题、产品 UI 词、Paper 术语、命令与代码。产品路径只用 [界面文案体例](../../design/copy-convention.md) §3 词表；命题段只用 Paper 词；两套词不混。状态三档：**verified with synthetic data**（固定 SHA、合成材料、确定性 provider）· **runs locally**（可启动可操作，未做独立验收）· **not yet**（目标）。不用 beta、alpha、coming soon、planned for。页面不出现内部编号。

## 0. 骨架

```text
首屏          字标 · 导航 · H1 · 定位段 · 三个动作 · 一张真实 Home
01           Raw → Governed          同一事实的三个层级
02           A matter in motion      一段已记录工作的只读重放
03           Work that exists beyond the model.   命题与一图
04           Review is a first-class surface      候选、证据、决定、来源
05           Evidence                声称表 · Eval 八问
06           Build / inspect / reproduce
页脚          Experimental · Source · 版本 · MIT · Paper
```

每段先给证据入口，再给文案；证据不足的段落降为"目标"口径，不删段。

## 1. 首屏

字标：**CourtWork**。字标副句：*A place for expert work to take form.*

导航：GitHub · Paper · Docs

H1：

> **Turn AI output into work you can build on.**
> **把 AI 的产出，变成接得下去的工作。**

定位段：

> CourtWork 是一个实验中的本地 AI 工作空间：处理本地材料，检查每一次工具调用，追溯生成的文件。它正在成为可以审阅、裁定，并跨会话续行的工作面。

动作：**Read the paper** · **Run it locally** · **Source**。无 Try live，无 Download。

首帧：一张从发布 SHA 捕获的 Home，1440 light，静态。图注：

> CourtWork `<sha7>` · synthetic data · local deterministic provider · 1440×900 light · Home：两个 Project，一个 Chat 在等待一次写入批准。

无 JS 时首屏到此完整可读。

## 2. 01 · Raw → Governed

引句：

> **Work agents need governed state, not longer transcripts.**
> Agent 需要的是受治理的状态，不是更长的对话记录。

说明段：

> 同一次 Run 留下三样东西，责任各不相同。它们来自同一个来源，但没有一样是另一样的副本。

三个 tab，同一事实：

| Tab | 文案 | 数据来源 | 状态 |
|---|---|---|---|
| **Event log** | 这次 Run 里发生的每件事，按发生顺序：请求、工具调用、批准、回答、结果。它是原始历史；这里没有任何一条自己就能生效。 | Run 事件（EX-PS3 核实端点） | verified with synthetic data |
| **Work state** | 这次 Run 之后，Work 里正式成立的东西：候选、证据、决定、版本。只有通过验证与裁定的变化才写到这里。 | Core surface 投影（`nda-packets.json`） | verified with synthetic data |
| **Compiled context** | 下一次 Run 开始时模型实际拿到的内容：从 Work state 编译出的最小充分投影，不是整段历史。 | 记录的 Context（EX-PS3 核实） | verified with synthetic data |

图注：`synthetic data · recorded at CourtWork <sha7> · 三个视图读取同一份记录`。

## 3. 02 · A matter in motion

标题：**A matter in motion**

引句：

> 一段已经记录下来的工作，可以逐步重放。这里没有模型在运行；每一次点击显示的都是记录下的事实。

标签（固定）：`Replay · synthetic data · recorded at CourtWork <sha7>`。控件词：**Step n of m** · **Open in source**（指向 fixture JSON 的对应键）。

步骤与每步一句（无论标本还是退路的六步条，词相同）：

| 步 | 用户看到 | 文案 | 状态 |
|---|---|---|---|
| 1 | Home | 写下要做的工作。选一个 Project，并决定文件如何被编辑：Ask before editing、Allow edits，或 Read only。 | runs locally |
| 2 | Run | 每一次工具调用在发生时显示，不藏在摘要后面。 | verified with synthetic data |
| 3 | Approval | 写入之前 Agent 先问。你看到确切的路径、大小与内容 hash，只批准这一次写入。 | verified with synthetic data |
| 4 | Question | 需要一个事实时 Agent 提问；回答随 Run 一起记录。回答不等于授权。 | verified with synthetic data |
| 5 | File | 打开这次 Run 产生的文件。它的身份是记录下来的字节，不是聊天里的一段文字。 | verified with synthetic data |
| 6 | Stop · reconnect | 取消 Run，关掉页面，再回来：Chat 显示最后一次确认的状态。 | verified with synthetic data |
| 7 | Continue in Work | 把这个 Chat 绑定到一个 Matter。历史与 Project 都保留；不复制，不迁移。 | verified with synthetic data · Astra 核对 |
| 8 | Candidate → Decision | 候选逐条附证据与来源。人接受、退回，或要求补证据；正式成果与候选分开。 | verified with synthetic data · Astra 核对 |

步 7、8 的证据在发布 SHA 下由 Astra 核对；不成立者降为 runs locally，不删行。真实模型下的同一路径是 not yet，写在 05 段声称表，不写在这里。

## 4. 03 · Work that exists beyond the model.

标题：**Work that exists beyond the model.** / **让工作存在于模型之外**

正文（editorial，无卡片；退焦只在这一段：解释到哪一层，哪一层锐化）：

> 概率模型已经能搜索、比较、解释、起草和调用工具，却不能凭一次输出取得正式工作所需的事实效力、行动权限、完成状态和责任归属。一次 Run 会结束，模型会替换，上下文会压缩；Matter、Artifact、Review decision 与未完义务必须继续存在。

> 于是一次 Run 的两端分开治理。输入侧把稳定的 Work Contract、当前状态与相关资源投影为这一次任务的 Context；输出侧把模型或人的提议视为 Candidate，只有经过验证、授权与适用的 Review，才写入 Committed Change 并更新当前状态。

> 单次输出的质量因此不等于跨时间工作的质量。只要 output 会成为后续工作的 input，运行之后留下什么、失效什么、下一次先看什么，就是系统能力的一部分。

一图（静态 SVG，reduced-motion 无差）：

图题：**From state to committed change**

```text
Governed work state ─▶ Context projection ─▶ Model / human proposal ─▶ Candidate
                                                                          │
                                        validation · evidence · authority · review
                                                                          ▼
Updated state ◀──────────────────────────────────────────────── Committed change
```

图注：

> 箭头表示机制关系，不表示自动取得效力；候选进入 Context 不等于正式提交。依据 Schema Engineering 9.6 摘要链 B 与 §4.6 / §4.9。

段尾一句与链接：

> CourtWork 按 Schema Engineering 9.6（`d78fd31`）建造。论文是这一页所有观点的权威；CourtWork 是这些观点被试验与检验的地方。产品状态从不修改论文；能够泛化的工程结果带着固定 commit 进入论文的 Practice Index。

链接：**Read the paper**（最新阅读入口 `https://lesprivilege.github.io/Schema-Engineering/`）· Canonical · Practice · Practice Index（`PAPER.md` 所列固定 SHA 链接）。

## 5. 04 · Review is a first-class surface

标题：**Review is a first-class surface**

引句：

> 候选不是结果。它带着证据、来源和版本进入审阅面；人的决定改变正式状态，工具批准不改变。

四个词，各一句：

| 词 | 文案 |
|---|---|
| **Proposal** | 逐条规则的候选，绑定它所依据的来源版本。 |
| **Evidence** | 每条候选引用的来源片段与事实。缺证据的候选照样显示，并标为缺。 |
| **Decision** | 接受、退回、要求补证据。同一决定重复提交是幂等的；针对过时版本的决定被拒绝。 |
| **Provenance** | 谁、何时、基于哪个版本。产生候选的一方离场后，历史仍然可读。 |

区别句：

> 这不是把聊天记录换一种排版，也不是把代码 diff 搬过来。审阅的对象是候选与证据，不是消息。

媒体：NDA Review 一张，1440 light 与 dark，390 一张；状态为"一条候选待决定"。图注沿首帧模板。状态：verified with synthetic data（Core 反例与合成浏览器复验）；真实模型：not yet。

四个词只描述现有 renderer 已经显示的对象。M6 捕获时若 Evidence 或 Provenance 没有对应的可见对象，该行由 Fable 收窄，不由实现者补画（PS-17 c）。仓内现无一张完整的 Review 截图，M6 是必捕项。

## 6. 05 · Evidence

标题：**Evidence**

引句：

> 页面上的每一条声称，对应仓库里一条可以打开的证据。没有用户见证，没有虚构指标。

### 6.1 证据清单

| 项 | 文案 | 入口 |
|---|---|---|
| **Benchmark** | Continuity conformance：六个用例检验正式状态在来源替换、回执重放、重启、伪造 actor 与过期 base 之下是否保持。结果只在协议内有意义。 | `benchmarks/continuity/` |
| **Fixture** | 由真实 HTTP、Pi loopback 与 Core 生成的确定性数据包，附 sha256。 | `app/tests/fixtures/work-core/nda-packets.json` |
| **Tests** | 数字由构建时从发布 SHA 计算，不手写。 | `npm --prefix app test` |
| **Version** | Paper 9.6 `d78fd31` · 产品 `<source_sha>` · 站点 `<site_sha>` | `PAPER.md`、页脚 |
| **Decisions** | 架构裁决，从第一条起可读。 | `engineering/decisions.md` |
| **Paper revision** | 论文的版本级变化。 | SE `CHANGELOG.md` |

### 6.2 Eval 八问

固定结构，每问只显示发布 SHA 下真实存在的答案，缺者写 **not yet**。有界模型 pilot 未跑之前不出现任何对比分数；E 与 S 的通过数只从发布 SHA 上重跑生成的记录文件读取（PS-16）。答案依据 [EX-PS4](explore/ex-ps4-eval-surface.md) 表 1–6。

| 问 | 文案 |
|---|---|
| What was tested? | Continuity conformance。六个用例，每个 checkpoint 校验完整的语义状态：观察是否在场、来源版本、候选的归属与依据、义务语义、效果计数、成果内容、决定与回执的绑定、拒绝或重启之后状态是否保持。它衡量协议保真度，不衡量 SE 的增量价值。 |
| Against what? | S：一个认真实现的普通持久化机制，带版本化来源与文档、提交、任务、审批、审计与回执表、事务与 compare-and-set、绑定 payload 的幂等。E 是 CourtWork 的 Core。两者都应通过；这是校准，不是优势证明。只有 transcript 加检索的条件 T：not yet。 |
| With which model? | 没有模型。两个条件都由脚本化的受信客户端驱动，记录里 model 为空。有界模型 pilot：not yet。 |
| Which harness? | `benchmarks/continuity/run.mjs` 编排六个用例；E 经 `CoreClient` 驱动真实 Core，S 经 `standard.py`；`observe.mjs` 把原始输出映射为语义字段，`grade.mjs` 独立校验。CourtWork `<source_sha>`。 |
| Which fixture? | 一个合成的"证据备忘录"族，开发集，六个用例：normal · stale-source · receipt-replay · restart · actor-spoof · cas-conflict。角色与 ID 在执行前冻结，adapter 不决定哪一个候选是对的。 |
| What was held constant? | 报告内固定被测文件的 sha256 与 git head 及 dirty 标志；每次尝试的角色与 ID 在执行前冻结；尝试清单在执行任何一条之前落盘。 |
| What failed? | 首次运行 11/12：cas-conflict 用例误命中一个已关闭的候选。修正的是用例（改为同一 base 上的第二个待决候选），Core 没有为迎合测试而改动；随后 12/12。发布 SHA 上的重跑结果从记录文件读取；没有记录则 not yet。 |
| Can I reproduce it? | `node --test benchmarks/continuity/grade.test.mjs`；`node benchmarks/continuity/run.mjs --output /absolute/path/result.json`。需要仓库根目录、Node 22.19 以上、Python 3 标准库；输出文件须是新文件；不用 provider、不联网。 |

拒绝结果的四个名字（stale_source · request_conflict · authority_rejected · version_conflict）是被测系统的正确拒绝，不是评测的失败分类；页面不写 "failure classes"。

动作：**method**（`observation-contract.md`）· **raw record**（重跑的 JSON、attempts 与 journal）· **reproduce**（上面两条命令）。

### 6.3 声称表

| 可写的声称 | 状态 | 证据入口 |
|---|---|---|
| 从独立 clone 安装、测试、启动 | verified with synthetic data | `evidence/final-integration-20260908/sync.md`（发布 SHA 下复核） |
| Run 链：回答、精确写入批准、文件身份、预览、拒绝、停止、断线重连 | verified with synthetic data | `evidence/final-integration-20260908/README.md` |
| 运行控制：配置 CAS、来源、上下文、MCP 生命周期 | verified with synthetic data | `evidence/rc/` |
| MCP 未知效果后封闭后续调用 | verified with synthetic data | `evidence/final-integration-20260908/mcp-unknown.json` |
| Continue in Work：Chat 绑定 Matter，历史与 Project 保留 | verified with synthetic data · Astra 核对 | `evidence/fe03/`、`evidence/fe03-main-integration-20260909/` |
| 合成 NDA：逐规则候选 → 审阅 → 正式决定；幂等与过时版本拒绝 | verified with synthetic data · Astra 核对 | `evidence/wk10b2-main-integration-20260908/`、`evidence/harness-core-20260908/` |
| 新 Session 继续同一事项；产生候选的一方缺席时历史可读 | verified with synthetic data · Astra 核对 | `evidence/se-continuity-20260908/`、`benchmarks/continuity/` |
| Models：Catalog provider · Compatible endpoint · Local endpoint；Test connection、Fetch models | runs locally | `evidence/fe02-main-integration-20260909/`、`evidence/fe03-main-integration-20260909/` |
| Settings 整页；Appearance 本设备偏好 | runs locally | `evidence/cc-s-main-integration-20260909/` |
| 真实模型 provider 路径 | not yet | 用户在界面配置 |
| 有界模型 pilot 与对比分数 | not yet | — |
| 事项级记忆、Temporary chat | not yet | — |
| 桌面安装包、签名 | not yet | — |

not yet 行只写目标，不写日期。Astra 核对"Astra 核对"行的证据路径在发布 SHA 下成立；不成立者降档，不删行。

## 7. 06 · Build / inspect / reproduce

标题：**Build / inspect / reproduce**

```sh
git clone https://github.com/lesPrivilege/Courtwork.git
npm --prefix app ci
npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845
npm --prefix app test
```

说明句：

> 需要 Node.js 22.19 以上、Python 3、Git 2.36 以上。默认 provider 是本地确定性 fake；真实 provider 在界面里配置，密钥不进入仓库、聊天或截图。

入口（各一句）：

| 入口 | 文案 |
|---|---|
| README | 运行、验证与范围。 |
| `engineering/current.md` | 已交付能力、证据边界、下一单。 |
| `engineering/architecture.md` | 模块所有权与边界。 |
| `engineering/roadmap.md` | 长期路线与验证门。 |
| `docs/runtime-control/INDEX.md` | 资源、权限、MCP 与上下文绑定。 |
| `docs/interface-components.md` | 布局、消息、工作面、焦点与状态 owner。 |
| `PAPER.md` | 采用的论文版本与反馈路径。 |

组成三句（沿 2026-09-08 §7，改为中文主语）：

> **Web UI.** 原生 ES module 前端。它投影 Chat、Run、文件与运行资源；不持有工作状态，不持有凭据。
> **Host runtime.** Pi AgentSession 0.85.1 执行 Run；本地控制面持有配置、作用域、权限策略、MCP 生命周期与 Run 准入。已安装、运行中、已曝光、已许可是四件分开的事。
> **Domain core.** 一个样本 Core 持有 Matter、候选、证据与决定，带 compare-and-set 版本与幂等的人类决定。它是开发样本，不是通用法律产品。

上游归属：

> CourtWork 运行在 Pi agent SDK（`@earendil-works/pi-*` 0.85.1）与官方 MCP client 2.0.0 之上；harness core 在其上加入策略、状态与审阅边界，不重写 loop。

## 8. 页脚

`Experimental` · `Source on GitHub` · `<source_sha> / <site_sha>` · `MIT License` · `Schema Engineering 9.6`

深色页脚只承担收口，不放第二套导航。

## 9. README

一份 README，中文为主，与页面共用 §1 H1 与定位段、§6.3 声称表、§7 命令与入口；不复制 01–04 的叙述。README 末尾的旧句"main takeover 未通过"删除；迁移与冻结召回只保留一条工程入口链接。

## 10. 媒体清单（发布 SHA 下重新捕获）

| id | 画面 | viewport / theme | 状态文字须为 |
|---|---|---|---|
| M1 | Home：两个 Project，Today 带三格，一个 Chat 在 Waiting for you | 1440 light · 1440 dark · 390 light | 现行词表 |
| M2 | Chat：一次 Run 进行中，一条工具调用展开，Approve this write / Deny this write 在场 | 1440 light | Working |
| M3 | Chat：Question 与 Answer | 1440 light | Waiting for you |
| M4 | Chat files：一个文件与其 hash | 1440 light | — |
| M5 | Continue in Work 面板：Existing work in this project · New work | 1440 light | — |
| M6 | Work Review：一条候选待决定，依据与来源版本可见；必捕，现无可用图 | 1440 light · 1440 dark · 390 light | — |
| M7 | Settings › Models：Compatible endpoint 一行，Test connection 与 Fetch models 在场 | 1440 light | 后端原句 |

每张媒体带 `id, kind, source_sha, capture_date, viewport, theme, data_kind, provider_mode, setup_steps, displayed_path, evidence_path, asset_path, sha256, claim_ids, limitations`；缺任一字段不上页。标本 JSON 同表登记，kind 为 `interactive-fixture`。

## 11. 词表核对

产品路径出现的词：Chat · Work · Run · Project · Matter（只在 Continue in Work 与命题段）· Approval · Approve this write · Deny this write · File access · Ask before editing · Allow edits · Read only · Question · Answer · Continue in Work · Existing work in this project · New work · Chat files · Models · Provider · Connection · Catalog provider · Compatible endpoint · Local endpoint · Test connection · Fetch models · Settings · Appearance · Waiting for you · Working · Completed · Cancelled · Failed。

不得出现：Session（命题段可用 Paper 词 Session 之外的表达；产品路径一律 Chat）· Workspace（泛指）· Write permission · Ask / Write / Read 三个单词 · Permission（指一次动作时）· Elicitation · Interrupt · Courtwork（小写 w）· beta · alpha · coming soon · pricing · plan · enterprise。

命题段的词：Matter · Candidate · Committed Change · Review · Work Contract · Evidence · Context · Current Semantic State。

## 12. 交付与核对

- Opus：站点、README、workflow、媒体与标本捕获脚本；写权见 [WO-PS-01](work-orders/WO-PS-01-site.md)。
- Astra：§6.3 每行证据路径在发布 SHA 下成立；媒体 manifest 与截图状态一致；不成立者降档不删行。
- 用户：四轴（成熟、安静、身份、耐久）；U1…U6。
- Fable：文案的每一次改动回到本页，不在站点源码里另改一份。
