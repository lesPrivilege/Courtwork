# SE Paper 发布源与 CourtWork 映射索引

核对日期：2026-09-11。本文是本轮《修订Paper发布版面》输入的有界来源索引，不复制论文正文，不把设计建议写成论文命题，也不把本地候选写成已发布版本。Paper 的正文与编订责任仍在独立的 Schema-Engineering 仓；CourtWork 只保存采用指针、设计输入和跨仓实现证据。

## 1. 输入与证据等级

本轮优先消费的会话是 `修订Paper发布版面`，conversation `6aa3c4f0-ba08-83ec-afad-13c58b69581a`。CourtWork 本地归档位于：

- [原始 connector 返回](connector-response.json)，SHA-256 `fa2e2b4fc812fda513238e0d6e5aa0336f1be28fa7a2fcd0bab8b91d24cc4c12`；
- [可读输入快照](input-snapshot.txt)，SHA-256 `4d4383aa49ee1a0f689bcf1b474c57b0e78aab2fa82fe1eddd97a68f43be18be`；
- [会话 source manifest](source-manifest.json)，SHA-256 `30e07edb1040419e6fa644cceea086ddc4ee04888881d21e26e3c534a1220414`。

manifest 记录 2 轮、3 条可取得消息（2 条用户消息、1 条助手消息）、无附件、`hasMore=false`。首轮只有用户消息，缺少该轮助手正文；末轮 preview 是重复摘要，未重复计数。因此本索引只把两轮用户意图和可取得的末轮设计建议作为输入，不能声称恢复了完整对话。

用户意图是：以 2026-09-11 作为发布面修订标识候选；让 Paper 具有 Frontier Lab 研究文章的出版秩序；保留中文/English、Canonical/Practice/Index 和主题切换；以 CourtWork 冷灰、铅白、石墨的实际语义角色建立材质；另行制作原创编辑插画。末轮助手提出的 Anthropic 文章、社区 skill、尺寸、色号和题材都是设计输入，具体可核验事实与许可证处置见 [external-references.md](external-references.md)，不作为 SE 正文来源。

## 2. 权威层级与版本分离

### CourtWork 采用指针

[当前 CourtWork `PAPER.md`](../../../PAPER.md) 第 7–13 行固定：实现映射采用 **Schema Engineering 9.6 / 2026-09-07**，SHA `d78fd312955c1f594e59cbdcbb0d3074ac355940`；链接指向该 SHA 下的 Canonical、Practice 和 Practice Index。第 15–19 行还明确：产品工单属于 CourtWork，论文反馈只有在形成可泛化观察并带固定工程证据时才进入 SE Practice Index。这个固定采用指针不会因为 Paper 阅读器换肤或发布面候选而自动更新。

### Schema-Engineering 当前真实 ref

本轮从独立 Schema-Engineering 工作区只读核对到：

- 本地 `main`：`2817b8240c34d0754caf623e2a867cc168a260ab`，提交时间 2026-09-11 02:33 +08:00，提交题目为 `Polish reader navigation into two aligned control groups`；
- 本地remote-tracking `origin/main`（本索引不据此声称最新远端或线上）：`8b2839a476267cdc0f223040191b59306ce30996`，是 2026-09-10 的 reviewed bilingual 9.6 reader release；本地 `main` 比它领先一个 reader-surface commit；
- `papers/src/canonical.md` 与 `papers/src/practice.md` 的正文最后改动仍来自 9.6 发布提交 `d78fd312...`；`papers/src/practice-index.md` 的后续变动属于 Index-only 观察，不改变 Canonical/Practice 语义基线；
- 英文译文 manifest 将三份当前中文源字节绑定到 `a0234bc42dda75767554a2da89c247d66c2ad022`。这是译文的 source binding，不是 CourtWork 的 Paper 采用 SHA，也不是当前 reader HEAD。

因此必须使用三条不同的坐标：

| 坐标 | 当前事实 | 用途 |
|---|---|---|
| 语义/内容基线 | 9.6 · 2026-09-07 · `d78fd312...` | CourtWork `PAPER.md` 采用、实现语义与论文引用 |
| 当前 SE 源工作区 | `main` · `2817b824...` | 读取最新 reader source、译文绑定和本地候选 |
| 发布面 revision | 2026-09-10 或 2026-09-11 | 只描述 reader chrome、排版或入口变化，不升级论文 Edition |

`papers/README.md` 第 34–42、46–64、68–79 行规定了三份文本的责任、观察到裁决的顺序、保留历史产物和按日期编译的规则；`README.md` 第 3–21、38–49 行给出当前版本说明、三份文本入口和构建门。论文正文、Paper reader 与 CourtWork Pages 的状态不得由彼此推断。

## 3. SE 正文实际承重关系

下表只列后续出版面需要避免误读的语义坐标；完整正文保持在独立仓库。

| 来源 | 精确位置 | 可稳定消费的含义 |
|---|---|---|
| `papers/src/canonical.md` | front matter 第 1–7 行；摘要第 15–27 行 | Edition 2026-09-07、Revision 9.6；模型输出不能凭一次生成取得正式效力，Matter/Artifact/Review decision/未完义务须跨 Run 存在；Context 是由正式状态投影出的运行视图；`Store → Govern → Retrieve → Compile` 是 Continuity Profile 管线。 |
| `papers/src/canonical.md` | 第 31–55、59–69 行 | Expert capability、proposal/commitment、生产修订是三条不能混写的链；模型提出并执行，确定性系统维护不变量，Evaluator 测量已声明语义，人承担不可约的专业判断；Runtime 层与 Work/Authority 语义不能互相冒充。 |
| `papers/src/canonical.md` | 第 75–87、104–121 行 | Candidate、Validation、Evidence、Authority、Completion/Review、Committed Event 和 Updated State 有先后边界；执行成功、输出完整或 UI 显示都不能单独证明正式接受。 |
| `papers/src/practice.md` | front matter 第 1–8 行；第 16–25 行 | Practice 是带日期的、可脱离个例阅读的泛化快照；Runtime 只提供执行机制，正式状态、证据、完成和 Authority 需要治理层；UI 不能替代 Work Contract。 |
| `papers/src/practice.md` | 第 54–81、83–109 行 | Capability surface 与 governance surface 分开；完成条件外置；Candidate feedback 只有带 provenance、scope、owner、review、version、rollback 和后续检验才可跨 Run 复用；Context Projection、Human Work Surface 和 Retrieval Index 是不同投影，共享正式状态而不各自维护事实。 |
| `papers/src/practice-index.md` | front matter 第 1–8 行；用途与格式第 10–55 行 | Index 保存来源、证据类型、支持范围、不支持外推、检验、裁决和正文处置；删除 Index 后 Canonical/Practice 仍应自足。具体产品 UI、社区实例和本轮出版设计默认进入索引或 CourtWork，而不是自动进入正文。 |
| `papers/src/practice-index.md` | PI-22 第 303–311 行；V-19–V-23 第 315–341 行 | Attention、能力协商、授权视图和个人关注对象仍有明确验证边界；PI-22 已裁为 indexed，不修订 Edition/Canonical/Practice；未运行的实验保持未运行。 |

设计必须保留这些区分：Paper 的阅读表面可以帮助读者理解状态、候选、证据和 Review，但它不产生 Authority、不把 Candidate 变成 Committed Change，也不把图示或插画当作论文新增证据。

## 4. Paper 发布源与实际字节

### 4.1 中文源、英文派生与构建绑定

当前独立源文件及 SHA-256：

| 路径 | 责任 | SHA-256 |
|---|---|---|
| `papers/src/canonical.md` | Canonical Kernel | `9771dfce3863933db819029e8679b36bfd0933ac2028bab5b6bb2e1f73e4dc59` |
| `papers/src/practice.md` | Generalized Practice Snapshot | `cb5b106899d23429ff93e24a0470c93f8a22abb34c62c760a15426f61a39fc9d` |
| `papers/src/practice-index.md` | Evidence and Revision Ledger | `0ab68d37f07e33bd49c14ab42e75ee5452f1b593e0dd527200246eaf692bc894` |
| `papers/reader/reader.css` | Reader layout/material CSS | `1b2026dd7cfbd544ad8f9005174673294cf70c8b2d4a95d2bdae6992797790e0` |
| `papers/reader/reader.js` | Reader mode/hash/language/theme behavior | `31541e131d7cdaea03fd56c0e53ce86493bee7c5fb2ec5ccd4c832183e8e8d14` |
| `papers/build.py` | Chinese reader compiler | `409b72964a3ce497f23802f573d232d2d0249045b1f8c8db27cc911ba6655048` |
| `papers/build_en.py` | Independent English compiler | `9136d0c65101591289ae4f67015d6b83ca0f747fc857d69480a2dac055f35bf4` |
| `papers/translations/manifest.json` | Source/translation/review binding | `c07526b8d5e7181ce99149481d76007c3ee930b744c46558d8e45a97a76c8367` |
| `papers/translations/review-2026-09-10.md` | Non-author translation review record | `f0c7fdfd1dff6255e375f4bbc4b1f8d843a187bb60f425ffd1246da36c1a151d` |

`build.py` 第 33–53 行把 `EDITION=2026-09-07`、`TEXT_REVISION=9.6`、三个中文源与译文路径固定下来；第 137–227 行要求 reviewed manifest、完整三份译文和逐文件 source/translation hash 一致；第 390–435 行把 edition、text revision、reader revision、source commit、source digest 和 translation digest写进单文件 HTML。

### 4.2 9/10 与 9/11 reader surface

9/10 产物：

- `papers/dist/schema-engineering-2026-09-07-reader-2026-09-10.html`：`bb6c87d9ed1c04dd008d285da28be7dfc03cd33574cfb45c872beffc4c575a1f`；
- `papers/dist/schema-engineering-2026-09-07-reader-2026-09-10-en.html`：`3b50eae25d9e5cb52baf7e5e98b3531ad87e2a41ae4c0d8340dcc9c08fd4f445`。

9/11 本地 reader-surface candidate：

- `papers/dist/schema-engineering-2026-09-07-reader-2026-09-11.html`：`5a3ddbc90dafd61268b09fb9cdff1c9ed6a2a44bdf2befd4b213b79d427c6541`；
- `papers/dist/schema-engineering-2026-09-07-reader-2026-09-11-en.html`：`976f24ea766a87729f3c26a305c5dd9c242f66894a5aeeecd267e3f530d1305a`。

四个 reader 文件都在 `<head>` 写入 `paper-edition=2026-09-07`、`text-revision=9.6`、`source-commit=a0234bc42dda75767554a2da89c247d66c2ad022` 和相同的三源 combined digest `63ec2f00e7d1a365b2539124df405324b32b5712dff8f66f6aeeb479a4bc4af9`；英文文件另写 translation digest `056cdc56cff41854c9431e8eab22b0e0d5d718d7da4d37e875c3493a0b3c4171`。HTML 的 `reader-revision` 才分别是 2026-09-10 或 2026-09-11。

`papers/notes/publication-surface.md` 第 66–70 行确认 9/10 的独立双语 reader 不改变论文 9.6；第 72–74 行把 9/11 定义为三卷控制、语言和主题控件的 reader revision。`papers/evidence/reader-controls-20260911/README.md` 第 3–7 行说明 9/11 改动没有 Paper body 或 translation edit，截图覆盖 390px/320px 的局部 controls 检查，Index interaction 在该 receipt 中未声称完成独立浏览器核验，且明确 **No deployment in this change**。

所以，2026-09-11 在本索引中只能作为 release-surface revision/candidate 标识；不能写作已经上线的 Paper 发布日期，也不能用它覆盖 CourtWork `PAPER.md` 的 9.6 adopted SHA。若要把 9/11 作为实际公开入口，仍需独立的 SE release/build/Pages workflow receipt。

## 5. 当前 Paper reader 的可观察契约

### 三卷与标签

`papers/build.py:45-53,274-307` 与 `TEMPLATE` 第 415–431 行表明：一份单文件 reader 同时包含三个独立 article：`canonical`、`practice`、`index`。当前 HEAD 将中英文三宗标签统一为 `Canonical`、`Practice`、`Index`；reader 标题分别是 `工作论文`/`Working Papers`，不是对正文责任的重命名。页脚保持 `9.6 · 2026-09-07` 与编订源链接。

### URL、hash 与返回路径

`papers/reader/reader.js:7-59` 定义有效 mode 为 `canonical | practice | index`；query 可从 `mode`、`view` 或 `paper` 读取，缺省回到 `canonical`。hash 可用 `#paper-canonical`、`#paper-practice`、`#paper-index`，旧中文/英文别名包括 `#正文`、`#实践`、`#practice`、`#index`；目标章节先在对应 `data-paper-mode` 内查找，再查模式前缀 alias，最后回退到全局 ID。

`reader.js:61-105` 切换卷时同步 `data-active-mode`、`aria-hidden`、`aria-current`，写入 query 和目标 hash，并将目标章节置为焦点后滚动到顶端。`reader.js:107-129` 的语言切换沿当前 active mode 设置目标 query，并根据当前滚动位置挑选最近 heading 作为 hash，因此切换中英时保留当前卷和章节位置；`popstate`、`hashchange` 会重新解析 mode。

### 主题、窄屏和无脚本

`reader.js:9-12,131-146` 使用 `schema-engineering-theme` localStorage、根节点 `data-theme` 和 `prefers-color-scheme`。主题按钮写入 `aria-pressed`；存储不可用时阅读仍继续。`reader.css:95-103` 提供系统深色和显式 `data-theme=dark`，`reader.css:111-130` 保留打印和无脚本回退。

当前 reader 的基础样式在 `reader.css:1-20,39-83`：独立的 `--canvas/--surface/--surface-muted/--ink/--muted/--rule`，`--reading-width:72ch`，serif 正文、sans 控件、mono 标签、边框/圆角目录和表格滚动区。9/11 追加的 `reader.css:136-152` 将三卷 mode controls 与语言/主题 actions 设为两组同一行、最小 44px 触控区；720px 和 390px 下只收紧间距和字号，不删除功能。

这是当前实际 reader baseline 的观察，不是下一版 Paper 视觉方案的强制终稿。若重建出版面，必须保留上述三卷、语言、主题、hash、back/forward、刷新和无脚本阅读行为；控件可以降低 chrome，但不能以装饰性菜单遮蔽这些入口。

## 6. CourtWork Dystopia 实际 token 与 Pages 先例

### 6.1 Dystopia token 源

目标 CourtWork 基线为 `608ed1b35da3d88b3e57568b22120c9620fe5fdd`；当前核对的源码路径与 SHA：

- [`app/web/styles.css`](../../../app/web/styles.css)，`81ed49ed5300f2ed7d2e75bcec18f70edf7c39fdba485f33aa21649cb053f769`；Dystopia authored block 在第 215–261 行，role mapping 在第 288–318 行；
- [`site/src/site.css`](../../../site/src/site.css)，`0448a113b76b5613a3863ea1e5053f9e8dfd5a33247df37aea273cfdb7793ddd`；
- [`site/src/page.mjs`](../../../site/src/page.mjs)，`b29672d5eec26e2ef6d72b9f48319ae3fd0f9d711a59ef56bdd5028349b7d780`；
- [`site/scripts/tokens.mjs`](../../../site/scripts/tokens.mjs)，SHA-256 `76db6b507d5bc3f301dd318442dd5dc214c3437a7cc24bc6a0af4e6b97200808`；其第 1–12、53–112 行定义产品 token 抽取并排除 `[data-skin]` block。

Dystopia authored palette（`app/web/styles.css:217-261`）的完整中性梯度如下：

| 角色 | Light | Dark |
|---|---|---|
| gray-1 / gray-2 | `#f8fafb` / `#e4e9ec` | `#11171b` / `#171f24` |
| gray-3 / gray-4 | `#dde4e8` / `#d3dde2` | `#2b373f` / `#34434c` |
| gray-5 / gray-6 | `#c9d5dc` / `#bdc8cf` | `#3c4c56` / `#465762` |
| gray-7 / gray-8 | `#aab8c1` / `#7e8d96` | `#566a76` / `#738994` |
| gray-9 / gray-10 | `#6f7e88` / `#64737d` | `#82939d` / `#95a5af` |
| gray-11 / gray-12 | `#54616a` / `#242d33` | `#b2c1ca` / `#e4ebef` |
| accent-3 / accent-9 | `#e4e9ec` / `#242d33` | `#2b373f` / `#e4ebef` |
| accent-10 / accent-11 | `#172025` / `#242d33` | `#f5f8fa` / `#e4ebef` |
| paper / float-s / frame-s | `#edf1f3` / `#f9fbfc` / `#dbe2e6` | `#202b32` / `#2a363e` / `#151c21` |
| ink-max / on-accent-s | `#172025` / `#f9fbfc` | `#f5f8fa` / `#151c21` |

`styles.css:295-318` resolves these authored values into semantic roles. For a Paper mapping, the directly relevant roles are:

| Semantic role | Light | Dark |
|---|---|---|
| `frame` | `#dbe2e6` | `#151c21` |
| `panel` | `#edf1f3` | `#202b32` |
| `float` | `#f9fbfc` | `#2a363e` |
| `ink` | `#242d33` | `#e4ebef` |
| `ink-strong` | `#172025` | `#f5f8fa` |
| `muted-strong` | `#54616a` | `#b2c1ca` |
| `line` | `#bdc8cf` | `#465762` |
| `line-strong` | `#7e8d96` | `#738994` |
| `accent` / `accent-ink` | `#242d33` | `#e4ebef` |
| `accent-strong` | `#172025` | `#f5f8fa` |

The Dystopia block is an appearance skin. It must not be read as a new Paper semantic ontology, review state, or permission signal. Review/danger/success remain separate system roles in `styles.css:313-318`.

### 6.2 Pages does not currently equal a Dystopia Paper export

Current Pages has two relevant token layers:

1. `site/scripts/tokens.mjs:1-12,53-112` and `site/build.mjs:71-74` extract whole default `:root`/dark product blocks from `app/web/styles.css`, while deliberately excluding `[data-skin]` blocks. The published site therefore ships the default product skin token extraction, not a dynamic Dystopia skin switch.
2. `site/src/site.css:1-5` says the Pages campaign owns its visual scale/materials; `site/src/site.css:574-586` defines campaign values (`--campaign-paper:#f4f5f6`, `--campaign-raised:#ffffff`, `--campaign-ink:#282b2d`, `--campaign-soft:#e1e5e8`, `--campaign-rule:#a7aeb2`, Georgia campaign serif). `site/README.md:34-38` confirms this campaign is independent from the recorded product specimen and may use its own campaign materials.

This is an implementation fact that matters for the Paper redesign: the design brief may map Paper roles to the actual Dystopia values above, but it must not claim that current Pages already exports the Dystopia skin or that campaign literals are the Dystopia source. A future integrated Paper implementation needs its own explicit source/hash mapping and light/dark verification.

### 6.3 Pages reading and editorial precedents

The nearest current Pages grammar is source-backed and limited:

| Source | Observed precedent |
|---|---|
| `site/src/site.css:1-5,14-32` | `68ch` reading measure, wide 1040px site, larger section gap, readable CJK line-height; body uses semantic product roles at the base. |
| `site/src/site.css:69-121` | Quiet masthead, lightweight navigation, wide main column, border-led section rhythm and no app toolbar before the hero claim. |
| `site/src/site.css:131-213` | Title/dek/lede/prose/caption hierarchy; long text uses `var(--site-measure)`, with pull quote and hairline rather than dense cards. |
| `site/src/site.css:574-604,739-748` | Current Archival Instrument campaign: large editorial serif title, hero object, register line, layered paper sheets, responsive two-column hero. This is a CourtWork Pages precedent, not an Anthropic asset or Paper baseline. |
| `site/src/site.css:715-723` | Paper is a primary research entrance with a title, description and explicit read links; it remains a CourtWork acquisition/product surface. |
| `site/src/site.css:759-770,983-1007` | Wide explanatory section and continuity figure patterns; figures can widen beyond reading measure, then collapse to a compact mobile variant. |
| `site/src/page.mjs:101-113,286-310` | Current page order is hero → product atoms → primary entries → product sections → long-work/research figures; current figure mounts have text captions and source registry IDs. |
| `site/src/site.mjs:1-5,90-108` | Pages interactions are progressive enhancement; current page story toggle is explicitly illustrative and makes no runtime/network/state claim. |
| `engineering/design/agent-interface-2026-09-10/precedent-map.md:294-317` | `markdown.reading` and `output.review` are separate canonical problem keys; visible reading or review UI does not grant formal acceptance. |
| `engineering/design/agent-interface-2026-09-10/precedents.md:14-15,20-31` | Markdown reader, material roles, evidence status and existing checks are reusable precedents; code presence or static lint does not make a new Paper surface canonical. |

The resulting local starting point for Paper is `68ch` plus Dystopia role mapping, with independent typography and wider figure treatment. `68–72ch` from the session is still a candidate to test against actual Chinese/English content, long tables, code blocks and narrow widths; it is not an Anthropic measurement claim.

## 7. Minimal Claude read order and return contract

Claude should read only the following in order before creating a candidate:

1. This source index sections 1–5, then [the priority consumption ledger](README.md) and [CLAUDE-BRIEF.md](CLAUDE-BRIEF.md), to separate direct user requirements, assistant proposals and current source facts.
2. The fixed Paper pointer in [CourtWork `PAPER.md`](../../../PAPER.md), then the relevant heads/sections of `papers/src/canonical.md`, `papers/src/practice.md` and `papers/src/practice-index.md`; read `papers/build.py`, `papers/reader/reader.js` and `papers/reader/reader.css` for actual labels, URL behavior, theme persistence and no-script fallback.
3. This index section 6, the Dystopia block and role mapping in [`app/web/styles.css`](../../../app/web/styles.css), and the Pages precedents in [`site/src/site.css`](../../../site/src/site.css), [`site/src/page.mjs`](../../../site/src/page.mjs) and `engineering/design/agent-interface-2026-09-10/precedent-map.md`. Record the source SHA used for any exported mapping.
4. [External references](external-references.md), including the three official article variants and the community `anthropic-art` reference. Do not install, fork, or copy the community skill or external assets in this pass; the community repository is a non-official reference and its license response is `null`.
5. View the actual current Paper reader in at least wide and narrow states before drawing. Return a self-contained candidate package with editable source, exported light/dark assets, 1440/1280/390 screenshots, exact palette-role mapping, alt text, crop/safe-area notes, and a list of checks and unknowns. The illustration is one editorial metaphor; accurate SE mechanism figures remain separate.

Claude's candidate may propose a new reader skin or a publication-view implementation, but it must preserve the three text responsibilities, bilingual switch, theme/system preference, deep links, keyboard focus, back/forward and no-script behavior. A candidate preview is not Paper release acceptance; Astra owns semantic, layout and integration decisions, and a non-author review remains required.

## 8. Open unknowns and next gates

- The 9/11 reader revision is present in local Schema-Engineering `main` and tracked dated HTML, but its own evidence says no deployment. The live SE Pages entry and any later public workflow result still need a release receipt.
- It remains undecided whether the 9/11 controls should be retained as the final Paper chrome or replaced by a new publication view; either choice leaves Edition 9.6 and the adopted CourtWork SHA unchanged until an explicit Paper release decision.
- The exact Paper integration boundary is open: Paper source stays in Schema-Engineering; any CourtWork implementation bridge must use fixed links and hashes and must not copy editable Canonical/Practice text into CourtWork.
- A Dystopia-to-Paper token export has not yet been implemented. The current Pages token extractor excludes skin blocks, while the campaign stylesheet has its own named `campaign-*` values; an eventual export must state whether it snapshots Dystopia roles or introduces a reviewed Paper mapping.
- Chinese/English typography, long-table behavior, figure breakout, 390px controls and 200% zoom need candidate-specific browser evidence. The 9/10 72/72 reader QA and 9/11 local controls receipt cover their recorded scopes only; they do not accept a new Paper skin.
- The official Anthropic pages are three different publishing variants. Their observed structure can guide information order and figure/text rhythm, but no exact common column width, universal hero order or brand imitation is established here. The community illustration repository is a reference only; no dependency, fork, or license grant has been adopted.
- No original hero illustration candidate exists in this source index. The next concrete review is comparison of Claude's self-contained candidates, with Astra's independent layout/semantic decision and later build/link/bilingual/reduced-motion verification.

## 9. Read-only evidence and non-actions

This indexing pass read source files and computed hashes only. It did not modify SE Paper source, reader code, CourtWork UI, token files, Pages assets, deployment state, or external repositories; it did not install or fork a community skill. The only intended new file in the CourtWork target is this `source-index.md`; pre-existing worktree changes remain outside its scope.
