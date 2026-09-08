# 发布面文案（Fable，2026-09-08）

用途：Claude Opus 绘制 GitHub Pages 与根 README 时直接消费的文案与事实绑定。承接 [Opus 交接](opus-public-surface-handoff.md)、[Pages 准备包](pages-preparation/README.md)、[证据契约](pages-preparation/evidence-contract.md)；替代 [public-surface.md](public-surface.md) 的首屏草稿。叙事以 Paper 为权威，CourtWork 是 Paper 的实践与验证项目；产品状态只从 [current](../../current.md) 取，本页不另记状态。

## 1. 叙事关系

| 角色 | 承担 | 不承担 |
|---|---|---|
| Schema Engineering（Paper 9.3，`f8ecb09`） | 命题：概率性提议不能凭一次输出取得正式效力；Matter 而非 Session；State / Context / Proposal / Committed Change 分层；人的 Review 改变正式状态 | 产品功能清单、版本状态 |
| CourtWork | 上述命题的实验实现与验证场：真实 runtime、可检查的权限与来源、领域 Core 样本、合成 NDA 纵切 | 证明 Paper 命题已被验证；宣称法律专业准确、真实客户、生产部署 |

页面顺序按 Pages 准备包：是什么 → 如何工作 → 如何检查与运行。每段文案先给 Paper 依据，再给产品证据入口；两者缺一时该段收窄为"目标"口径，不删段。

## 2. 词表

产品路径用 [界面文案体例](../../design/copy-convention.md) 词表：Project · Session · Run · Question · Write permission · Ask / Write / Read · Connection · Model · CourtWork。命题段落可用 Paper 术语：Matter、Candidate、Committed Change、Review、Work Contract、Evidence。两套词不混：产品截图与操作步骤不写 Matter，命题段落不写 Session。

状态词固定三档：**verified with synthetic data**（固定 SHA、合成材料、确定性 provider）、**runs locally**（可启动可操作，未做独立验收）、**not yet**（路线图或本轮目标）。不用 beta / alpha / coming soon。

## 3. 首屏

字标：**CourtWork**

品牌句（保留）：**A place for expert work to take form.**

命题句（取自 Paper 标题）：**Work that exists beyond the model.** / **让工作存在于模型之外。**

两句分工：品牌句是名字的一部分，命题句是页面第一句论断。已在产品 Home 使用命题句作 hero（WK-26），Pages 与产品同句。

定位段：

> Models can search, draft, compare and call tools. A single output still cannot acquire the effect, permission, completion and accountability that formal work requires. CourtWork is an experimental workspace that keeps materials, candidates, decisions and open obligations outside any one run, lets a person inspect what the agent did, and records what was formally decided.

> 模型已能检索、起草、比较和调用工具，一次输出却取不到正式工作所需的效力、权限、完成状态与责任归属。CourtWork 是一个实验中的工作空间：把材料、候选、决定与未决义务留在任何一次运行之外，让人检查 Agent 做了什么，并记录什么被正式决定。

首屏动作：Read the paper · 中文 · Run it locally · Source。无 Try live、Download。

局部成熟实践：产品对象作首帧内容（reference-index `linear-hero`）；一句定位后立即进入真实情境（`unlost-position`）。取证未完成前只作裁取方向，不作已采用。

## 4. 命题一图

图题：From state to committed change

```text
Governed work state ─▶ Context projection ─▶ Model / human proposal ─▶ Candidate
                                                                          │
                                        validation · evidence · authority · review
                                                                          ▼
Updated state ◀──────────────────────────────────────────────── Committed change
```

图注：箭头表示机制关系，不表示自动取得效力；候选进入 Context 不等于正式提交。依据 Paper 9.3 摘要链 B 与 §4.6 / §4.9。不采用"Schema = model context = review surface = work state"等号写法（[SE 发布面说明](https://github.com/lesPrivilege/Schema-Engineering) 同一裁定）。

局部成熟实践：编辑式结构图与旁注（`minard-editorial`）；不加动画，静态 SVG，reduced-motion 无差。

## 5. 真实界面

位置：命题图之后、首屏视口内或紧邻。

图注模板（中英同构）：

> CourtWork `<sha7>` · synthetic data · local deterministic provider · 1440×900 light · Home with two sessions, one waiting for a write permission.

每张媒体按证据契约携带 `source_sha, data_kind, provider_mode, viewport, theme, claim_ids`。缺任一字段不上页。已有可用来源：`evidence/final-integration-20260908/` 的合成数据截图（代码基线 `0a3b9b2`，与 `main` app 字节一致）；重新捕获须从 `main` 独立数据目录启动。

局部成熟实践：产品证据区安静版式、局部放大与回到全貌（`zed-proof`、`things-proof`）；hover 信息同样可由 focus 取得。

## 6. 一条工作路径

当前真实成立、可复现的路径（联调回执 9/9）：

| 步 | 用户看到 | 文案 | 状态 |
|---|---|---|---|
| 1 | Home | Describe the work you want to do. Choose a project and how file writes are handled: Ask, Write, or Read. | runs locally |
| 2 | Session · Run | The run shows each tool call as it happens. Nothing is hidden behind a summary. | verified with synthetic data |
| 3 | Write permission | The agent asks before writing. You see the exact path, size and content hash, and allow or deny this one write. | verified with synthetic data |
| 4 | Question | When the agent needs a fact, it asks; your answer is recorded with the run. | verified with synthetic data |
| 5 | File | Open the file the run produced. Its identity is the recorded bytes, not the chat. | verified with synthetic data |
| 6 | Stop · reconnect | Cancel the run, close the tab, come back: the session shows the last confirmed state. | verified with synthetic data |

中文同表逐句译出，不缩写。路径以真实 Run 链为准；候选 → 审阅 → 正式决定的 NDA 闭环与同一事项换 Session 继续，本轮为 not yet，写在第 8 节，不进本表。

局部成熟实践：步骤条与同步截图（`nova-proof`）；每步一张真实图，不用示意图。

## 7. 它如何组成

三段，各链接契约：

**Web UI.** A native ES-module front end. It projects sessions, runs, files and runtime resources; it owns no work state and no credentials. → `docs/interface-components.md`

**Host runtime.** Pi AgentSession 0.85.1 executes runs; a local control plane owns configuration, scopes, permission policy, MCP lifecycle and run admission. Installed, running, exposed and permitted are four separate facts. → `docs/runtime-control/INDEX.md`

**Domain core.** A sample core (evidence memo) holds matters, candidates, evidence and decisions with compare-and-set versions and idempotent human decisions. It is a development sample, not a general legal product. → `engineering/architecture.md`

上游归属一句：CourtWork runs on the Pi agent SDK (`@earendil-works/pi-*` 0.85.1) and the official MCP client 2.0.0; the harness core adds policy, state and review boundaries on top, it does not reimplement the loop. 自研与复用的逐层清单见 [harness-core](../../execution/2026-09-08-two-lines/harness-core.md)。

局部成熟实践：三栏说明卡（Vercel 文档式），无图标堆砌。

## 8. 已验证与尚未

| 可写的声称 | 状态 | 证据入口 |
|---|---|---|
| 从独立 clone 安装、测试、启动 | verified with synthetic data | `evidence/final-integration-20260908/sync.md`；[Fable 复验](../../execution/2026-09-08-two-lines/merge-recheck.md) |
| Run 链：回答、精确写授权、文件身份、预览、拒绝、停止、断线重连 | verified with synthetic data | `evidence/final-integration-20260908/README.md` |
| 运行控制：配置 CAS、来源、上下文、MCP 生命周期 | verified with synthetic data | 同上 `rc/` |
| MCP 未知效果封闭后续调用 | verified with synthetic data | 同上 `mcp-unknown.json` |
| 领域 Core 样本：候选、证据、可信决定、幂等 | runs locally | `app/extensions/evidence-memo/` |
| 真实模型 provider 路径 | not yet | G1，用户在 GUI 配置 |
| 合成 NDA：逐规则候选 → 审阅 → 正式决定 | not yet | G2，H0–H2 |
| 新 Session 继续同一事项；producer 缺席时读取历史 | not yet | G3，H1 / H3 |
| 桌面安装包、签名 | not yet | 发行阶梯 4–5 |

not yet 行只写目标，不写日期。三档之外不出现"soon""planned for"。

## 9. 本地运行

沿根 README 现有命令，不改：

```sh
npm --prefix app ci
npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845
```

说明句：Requires Node.js 22.19 or later, Python 3 and Git 2.36 or later. The default provider is a local deterministic fake; a real provider is configured in the UI and its key never enters the repository, the chat, or a screenshot.

## 10. Paper

> CourtWork is built against Schema Engineering 9.3 (`f8ecb09`). The paper is the authority for the ideas on this page; CourtWork is where they are tried and tested. Product status never edits the paper; engineering results that generalize enter the paper's Practice Index with a fixed commit.

链接：固定 9.3 三份文本（`PAPER.md` 所列 SHA 链接）；最新阅读入口 `https://lesprivilege.github.io/Schema-Engineering/`。9.6 本地候选不出现。

## 11. 页脚

Experimental · source on GitHub · version manifest `<source_sha> / <site_sha>` · 无许可证声明（仓内尚无 LICENSE，不预填）。

## 12. 交付与核对

- Opus 产出：英文页、中文页、根 README 两语版本、媒体 manifest、站点构建与 Pages 工作流；写权按 Opus 交接。
- 两语共用本页事实表；翻译差异只允许语序与句法，不允许状态档位漂移。
- Astra 核对第 8 节每行的证据路径在发布 SHA 下仍成立；不成立者降档，不删行。
- 视觉四轴（成熟、安静、身份、耐久）留用户裁定。
