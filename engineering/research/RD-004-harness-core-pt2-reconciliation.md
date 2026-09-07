# RD-004 · Harness Core PT2 Reconciliation

状态：documentation-only reconciliation；作者自检完成，**独立复核未开始**。本文档不构成 Runtime/Host 选定、不关闭 H5、不使 PT2 的门通过、不修改 V8/G1/G2/Polish/server/runtime/Core 或任何 accepted DEC 的正文。作者：本 session（Claude, Sonnet 5，construction/explore 角色）；按项目惯例（[[se-live-doc-root-and-ports]]）author 不得自验，独立接受留给后续 Codex/Luna 复核。

## 0. Baseline

- **Worktree**：`/Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema Engineering`，`git status --branch` 报告 `## HEAD (no branch)`（detached）。
- **HEAD**：`f8ecb091895559389bb4e75f3c6f28052b71c5a3`，commit 时间 `2026-09-05 14:01:02 +0800`。
- **未提交改动**：主树 `CONTRIBUTING.md`、`README.md` 各有 6/5 行未提交增量（与本文档无关，未触碰）；`engineering/` 整体是 untracked 目录（按 [DEC-001](../decisions.md#dec-001--文档先行与独立工程目录) 与 [current.md](../current.md) 的既定安排，`engineering/` 本就不入 SE repo，不是本次遗漏）。
- **观察时间**：2026-09-06（新加坡时间，续前几轮惯例）。
- **本文档依赖的既有承重文档**（均已本 session 直接 Read 复核，非转述）：
  - `decisions.md:71-79`（DEC-006）、`:81-110`（DEC-007 及四条补充）、`:112-118`（DEC-008）。
  - `mvp/execution/frontend-v7/core-round-obligations.md:1-35`（H1–H5 全文）。
  - `pre-takeover-roadmap.md:53-59`（PT2 定义）、`:125-141`（当前位置）。
  - `research/RD-001-runtime-adapter.md`（全文，51–59 行为最新续行）、`mvp/execution/runtime-capability-matrix.md:23,29`。
  - `mvp/execution/runtime-sources/README.md`（确认候选源码卡覆盖范围）、`mvp/execution/frontend-v7/dsh-index.md:1-9`（确认其为前端范围）。
  - `current.md:25`（Harness Core 隔离声明原文）。
  - 主树 `papers/src/practice-index.md:58-60,349-359`（PI-01 Runtime composability 及 DSH 脚注）。
- 存在未提交修改时，本文档不把 `git diff` 之外的 HEAD 内容当作完整快照；上面列出的每处引用均为读取时的实际文件内容，行号可能随后续编辑漂移，若漂移以文件内容为准，不以本文档行号为准。

## 1. Evidence delta

比较对象：外部交付 `mvp/execution/runtime-sources/pt2-harness-core-explore-2026-09-06/{harness-primitive-index.md, source-manifest.json}`（下称"新交付"），与既有 Pi/DSH/Codex/OpenCode 相关材料。

### 1.1 版本再钉版（不构成结论变化，只构成"需重查"标记）

新交付把四个候选钉在比既有 `runtime-sources/` 卡片更新的版本：Pi `v0.83.0→v0.85.1`、Codex `rust-v0.144.4→rust-v0.153.4`、OpenCode `v1.15.11→v1.18.29`；DSH 首次钉版（developer-preview pinned master snapshot `d347e703908d`）。**版本变新不自动使旧卡片结论失效**——`pi-v0.83.0.md`、`codex-v0.144.4.md`、`opencode-v1.15.11.md` 及其独立复核证据（`RD-001-runtime-adapter.md` 全文）保留其原始范围与历史地位；仅当新交付中出现的具体机制描述与旧卡片矛盾或旧卡片依赖的具体行为在新版本确认变化时，才对该具体条目标注"需重查"，不整体退休。本文档未逐条对照新旧版本差异（不在本轮范围），此处只登记该核对尚未执行。

### 1.2 DSH 三处出现，范围不同，不可互相替代

修正新交付报告曾出现的措辞歧义（"DSH source-carded" vs "no DSH card exists"）：这是两个不同意义的"DSH 卡片"，须分开陈述，不构成矛盾：

| DSH 出现位置 | 范围 | 状态 |
|---|---|---|
| `papers/src/practice-index.md:58-60` PI-01 Runtime composability，脚注 `:349-359` | SE 论文层面的通用 composability 观察，引用 DSH 公开架构页作为佐证之一（连同 Cordis） | 早于本轮，论文级，非工程 pinned card |
| `mvp/execution/frontend-v7/dsh-index.md`（连同 `dsh-pins.json`） | **DSH Web 前端**来源索引，V6/V7 消费其成熟 Web UI 机制（PendingWait、session projection 等），供 Fresh 通用壳前端参考 | 已交付（2026-09-06），范围限定为前端，不涉及 runtime/host 选型 |
| `mvp/execution/runtime-sources/` 目录（`README.md` 逐条列出 Codex/OpenCode/Pi 三个"Fixed upstream coordinates"，**没有 DSH 条目**） | **Runtime/执行宿主**层面的 pinned 机制卡片 | 此前确实不存在；新交付（`pt2-harness-core-explore-2026-09-06/`，K03/K04/S03/C02/E04/X01 等卡片）是**此范围内 DSH 的第一份机制级来源** |

因此准确表述是：**DSH 作为"研究方向"在 DEC-006/DEC-007 中早已出现（provider 统一策略、study DSH 式 adapter/热插拔），DSH 作为"Web 前端参考"已在 V6/V7 消费；此次新增的是 DSH 作为 runtime/执行宿主候选的第一份机制级 source card。**"这是 SE 项目第一次研究 DSH"这一表述在整体项目层面不准确，在"runtime host 机制卡"这一具体范围内准确。

### 1.3 Pi 内部分层被明确到可操作粒度

既有 `RD-001`/`DEC-002` 只区分"Pi coding-agent SDK 嵌入路线" vs "OpenCode Server 路线"，未区分 Pi 自身的成熟度分层。新交付把 Pi 拆为三层：简单 `Agent`/`pi-ai`、既有 `coding-agent` v3 `AgentSession`/RPC（稳定）、新 `AgentHarness` v4（`watchSession` 未实现，WIP）。新交付建议优先验证 v3 RPC 路径，把 v4 列为 reference only、不作正式状态默认存储。**这是对既有 Pi-lean 结论的细化，不是反转**——`RD-001:53` 的"Pi 保留为受限嵌入切片的优先研究候选"没有说的是"哪个 Pi 层"，新交付把这个空白填上了，但没有新的运行证据支持哪个具体层，此处仍是**候选裁决，非验证结论**。

### 1.4 Codex / OpenCode 的边界描述更具体

既有材料（`codex-v0.144.4.md`、`opencode-v1.15.11.md`）以工具可见面/权限拒绝为主要观察颗粒度。新交付补充了 Codex `app-server`（Thread/Turn/Item、WebSocket 标为 experimental）与 OpenCode `EventV2`/aggregate cursor 的持久化-恢复机制颗粒度，这是既有卡片没有覆盖的维度，属于新增而非矛盾。

### 1.5 直接回应 H5，但不构成 H5 关闭

`core-round-obligations.md:31-35`（H5）要求"按 SE 编排职责重新比较 Pi、DSH 等可复用局部……需要可替换 adapter 实际对照、真实宿主边界与恢复证据；UI 单元通过、相同 API 外观或多个代理同意均不能证明替换等价或最小必要"。新交付提供了对照维度（coverage matrix、selection matrix）与显式验证队列（Q1–Q8），但 `unexecuted_validation_queue` 明确标注 **Q1–Q8 均未执行**，且新交付第 9 节自陈"没有验证性能、安全性、真实流量、专业收益、GUI 成熟度或完整许可证供应链"。据此，准确状态是：

> **H5：专门 Harness 研究已交付；选型及适用验证义务仍开放。**

不采用"H5 已回应/已充分满足"一类更强措辞，因为 H5 原文要求的是"真实宿主边界与恢复证据"，而新交付明确停在 static-observation 层。

### 1.6 Q3/Q5 是既有要求的具体化，不是新 Canonical 原则

`papers/src/canonical.md` 已经要求 trusted recovery（§11.5 系统组合段落一带涉及）、candidate 隔离与 typed commitment boundary（`:710,743-745` Work Extension / sparse composition 段）、versioned Artifact 与 Review 挂钩制度后果（贯穿 Canonical §13 附近的 commit/reject/revise 语义，本文档未逐条重新摘录，避免与论文正文重复）。Q3（durability window：在工具执行前/执行后未落盘/flush 后三个时点杀进程）与 Q5（version conflict：Reviewer 打开 v3 后产生 v4，仍提交旧 review packet）是把这些已有要求钉在**具体失败边界**上的工程测试用例，供 PT2 使用；它们不扩大或修改 SE 的 ontology，本文档不据此新增或修改 Canonical/Practice 条目。

## 2. DEC-006 reconciliation（open，非裁决）

`decisions.md:71-79` DEC-006 原文关键句：

> "用户决定：provider采用Pi及DSH的统一策略方式……"（:74）
> "Provider：核实Pi/DSH的具体配置/认证/适配模式，二者不是模型服务商；真实key/调用后置，当前不消费已有凭证。"（:77）

三种可能范围，按用户提出的框架逐一核对原文，**均为待核对的解读候选，不代表已裁定**：

| 可能范围 | 原文支持程度 | 对 PT2 的后果（若成立） |
|---|---|---|
| **产品需求**：以某种一致的用户体验支持特定模型/凭据/provider 能力 | 部分支持——`:77` "二者不是模型服务商" 提示 Pi/DSH 是 adapter 层而非 model API 本身，暗示关注点是"如何统一配置/认证/适配"，接近产品需求层 | 与 PT2 host 选择基本正交：无论最终选哪个 host，仍需满足统一 provider 配置/认证体验；不构成对 host 选型的硬约束 |
| **实现承诺**：复用 Pi 与 DSH 具体的 provider 实现 | 原文没有明确到"复用哪一份具体代码"，但 `:74` "统一策略方式" 与 `:77` 的措辞连用 Pi/DSH 两个具体项目名，比单纯"支持多 provider"的产品需求表述更具体 | 若成立，PT2 若最终选 Codex 或 OpenCode 作为 host，需额外处理"如何仍复用 Pi/DSH 的 provider 实现"，即用户所述的 provider translation / 双重生命周期所有权风险 |
| **执行拓扑**：以 Pi 与 DSH 组合作为执行后端本身运行 | 原文未使用"执行后端"或"host"字样，`:77` 明确说二者"不是模型服务商"，语义焦点在 provider 层而非 loop/session/tool 执行层；对该范围的支持证据**弱于**前两种解读 | 若成立，则 DEC-006 已经部分预定了 PT2 的 host 结论（Pi+DSH），与 DEC-008（`:117` "PT2 只读 runtime explore……不施工 runtime core"，隐含选择未定）及 `pre-takeover-roadmap.md:55` "正式 Runtime 选择在此节点作出，不由 GUI demo 代为决定" 形成需要显式核对的张力 |

**本文档的立场**：不裁定上述三种范围哪一种是 DEC-006 的准确解读，也不因新交付的 selection matrix 把 Provider 行写成"所选宿主的 provider"（`harness-primitive-index.md:688` "Adopt：不要建立第二份 provider 兼容矩阵"）而认为 DEC-006 已被静默覆盖或修正。新交付这一行本身标注为 provisional selection matrix（`harness-primitive-index.md:59` "都是候选采用方式，不是已经安装或通过验收"），不具备修订 accepted DEC 的效力。

**待裁决项（留给用户/Astra）**：DEC-006 的"provider 统一策略"是否本就预期与 PT2 的 host 选择相互独立（即无论 host 选谁，provider 配置/认证体验统一）；还是本就预定了 Pi+DSH 的执行拓扑，因而需要在 PT2 开门前先行修正或明确重开。**在此项裁决前，PT2 的候选比较应同时评估"host + provider 组合"的可行性与迁移/维护代价，而非把 host 与 provider 当作两个独立可分别挑选、之后再拼合的维度**——这是新交付 selection matrix 遗漏的比较单元，其 Provider 行目前隐含"provider 随 host 走"，尚未与 DEC-006 交叉核对。

不在此追加正式 DEC-006 补充裁决文字（该操作属于裁决权限，不属于本次文档写入授权范围）；上表以只读记录形式存在，供后续裁决引用。

## 3. Obligation crosswalk（H1–H5 × Q1–Q8，按具体失败情形，非按术语相似度）

| H (既有义务) | 对应/部分对应的 Q | 覆盖程度 | 尚缺的具体测试 |
|---|---|---|---|
| **H1** 命令回执丢失时确认是否生效（幂等、receipt 查询） | 无 Q 直接对应；Q1（单一 owner/无 core patch）触及委派所有权，但不测试"同一命令 ID 重复提交" | **未覆盖** | 需要独立探针：重复命令 ID 提交、丢失回执后重试、同一 ID 被冲突复用；通过判据是产生唯一一次权威状态迁移 + 可恢复回执，不是 GUI 按钮置灰 |
| **H2** 一致读取、订阅与恢复（跨对象共同版本/快照 watermark） | **Q4**（reconnect gap：快照/订阅交界断开、重复或乱序投递）主对应；**Q3**（durability window）在崩溃场景部分重叠 | 部分覆盖 | Q4 未覆盖"同 Matter 多 Session 的正式对象一致性"（H2 原文最后一句明确列出这一反例，Q4 未包含） |
| **H3** 等待、取消与 deadline | **Q2**（cancel settlement：等待模型/工具/用户/后台进程分别取消）主对应 | 较好覆盖 | H3 提到的"wall-clock、执行预算、人工等待预算及 durable pending/reply/resume"必须来自同一运行契约，Q2 判据未显式要求这一"同源"约束，需要在执行 Q2 时补充检查 |
| **H4** 阅读对象与专业工作面协议（多 tab/对象引用/版本） | **Q5**（version conflict）覆盖"版本引用"一角；H4 的 tab/对象身份、跨会话回到 Matter、Browser 引用等**未被任何 Q 覆盖** | 部分覆盖，多数未覆盖 | 需要 H4 专属探针：同名异版本对象、已删除对象、失效 generation、旧 tab 决策 base_version 冲突 |
| **H5** Adapter/生态消费与独立验证（本轮研究的charter本身） | **Q1、Q6、Q8** 共同构成"独立验证"应当证明的内容（无 core patch、跨路径 authority 闭合、work acceptance ≠ run completed） | H5 作为总纲被部分操作化 | Q1/Q6/Q8 仍全部未执行；H5 本身不会因为有了对应 Q 就关闭，关闭需要这些 Q 实际跑过 |

**未被任何 H 命名、但新交付引入的两个新维度**（不建议本文档自行编号为 H6，留待用户/架构裁定是否正式纳入）：

- **Q3 的具体化超出 H2 原有颗粒度**：H2 原文没有点名"flush barrier"或"三个杀进程时点"，Q3 把这个具体测试点钉得比 H2 更细，建议下一轮若正式纳入义务清单，作为 H2 的子项而非独立新 H。
- **Q7（fresh context/cache）在 H1–H5 中完全没有对应物**：现有 H4 只涉及"阅读对象"，不涉及"健康窗口续行 vs fresh projection 分组"的取舍与遗漏/污染测试。这是本次交付相对于既有 H 清单的一个真正空白，建议记录为候选新增项，具体是否编号、编号为何，留给用户/Astra 裁定，本文档不代为决定。

**身份概念不得合并**（按用户指出的四行区分，逐一核对是否已在既有文档中被混用——检查结果：均未发现被混用，仅记录以防后续引入）：

| 身份/版本概念 | 应回答的问题 | 当前状态 |
|---|---|---|
| `connectionEpoch` | 这次回调是否属于当前客户端连接世代 | G2 C3 已用此概念修复（见下） |
| Event sequence / cursor | 已观察到哪些权威更新，是否有遗漏 | 新交付 E01/OC-EVENT 涉及，未在 SE 侧落地 |
| Command ID / idempotency key | 这是否是已准入命令的重试 | H1 需要，当前无对应机制，见上表"未覆盖" |
| Matter version / Candidate identity or hash | 决策是否施加于被审阅过的状态与候选 | Q5、Canonical commitment 边界已要求，未执行验证 |

**G2 证据的边界**：`general-ui-g2/adjudication-r2.md` 记录的 `connectionEpoch` 修复（认可 C1/C2/C4 与 C3 普通恢复，退回 C3 探测生命周期一项，随后 r2 修复交付）建立的是 **GUI 侧对过期回调的不变量**，本文档援引这一事实仅作为"该不变量已在 GUI 层建立"的参照，**不把它当作 durable replay、重复命令处理或多客户端一致性（H1/Q1/Q6/Q8 层面）已经得到验证**。PT2 若需要引用该不变量，应直接引用 `general-ui-g2/adjudication-r2.md`，不重新打开 G2 施工或复述其内容。

## 4. Bounded next research（仍是只读，不构成施工授权）

沿用新交付第 8 节"下一轮源码阅读只需围绕差异最大的三个主题"的收口，结合上表缺口，建议下一轮只读源码阅读聚焦：

1. **Pi H4 的实际恢复/未完 surface**：`watchSession` 具体缺口、v3→v4 迁移路径是否存在、H1（命令幂等）在 v3 RPC 与 v4 AgentHarness 两层是否有不同答案。
2. **DSH flush/单写者/guard 闭合**：`SessionHandle`/flush barrier 的具体命令-返回时序（对应 H1 的空白）、monotonic guard 是否可被可信插件绕过（对应 Q6）。
3. **Codex 与 OpenCode 的取消、snapshot 与 reconnect 契约**：`app-server` WebSocket experimental 边界之外的 stdio bridge 具体行为、OpenCode `EventV2` 是否在公开 wire 上暴露与内部同等的恢复保证（对应 H2/Q4 的"同 Matter 多 Session 一致性"缺口）。
4. **DEC-006 三种范围解读的原文/上下文进一步核对**：若用户或 Astra 能从 `mvp/execution/decision-ledger-v4.md`、`mvp/execution/next-round-plan-v4.md`（DEC-006 正文引用的两份具体边界文档，本文档未展开读取）中找到更明确的范围文字，可以缩小第 2 节三行表格的不确定性，本文档未读取这两份文件的相关章节，留作下一步。
5. **H1 与 Q7 的候选新增地位**：是否需要正式编号（H6 或并入现有 H1/H4），属于架构裁定，不属于本轮只读研究范围。

**明确不做**：不选择 host、不执行任何探针或 crash/cancel/reconnect 测试、不安装依赖、不调用真实 provider、不修改 V8/G1/G2/Polish/runtime/Core/API/SE renderer、不推进 PT1/PT2 任何门的开合、不修改 papers、不触碰 takeover/merge/发布流程。

## 5. 自检 / 交付回执

- **实际落地路径**：
  - `mvp/execution/runtime-sources/pt2-harness-core-explore-2026-09-06/{harness-primitive-index.md, source-manifest.json, README.md}`（新建，原始快照 + provenance 说明）
  - `research/RD-004-harness-core-pt2-reconciliation.md`（新建，本文件）
  - `research/README.md`（追加 RD-004 索引行）
  - `mvp/execution/runtime-sources/README.md`（追加一行指向新子目录，不改动原有三行）
  - `decisions.md`（在 DEC-006 后追加一条"补充"，格式对齐既有 DEC-007 补充惯例，**不改变 DEC-006 状态字段，仍为 accepted**，只记录第 2 节的开放核对）
  - `mvp/execution/frontend-v7/core-round-obligations.md`（H5 段落末尾追加一行"研究状态更新"，不改写原文其余部分）
  - `pre-takeover-roadmap.md`（"当前位置"图后追加一行指向本文档，不改动 PT0/PT1 现状描述）
  - `current.md`（"Harness Core留作独立下一轮"句后追加指向本文档的引用，不改写其余内容）
- **修改文件清单**：见上，逐项为新增文件或既有文件的**追加式**编辑（非整段重写、非全文件格式化）。
- **自检结果**：本 session 直接 Read/Bash 复核了 §0 列出的全部承重文件的实际当前内容（非转述前一 Explore 子代理的报告）；两份外部交付文件的 SHA-256 在复制前后一致（见 §0 无需重列，复制时终端已核对）；DEC-006 原文、H1–H5 原文、RD-001:53 与 runtime-capability-matrix.md:23 均为本 session 本轮亲自读取，不是沿用之前的转述。
- **未决裁决项**：
  1. DEC-006 三种范围解读哪一种准确（第 2 节表格）。
  2. Q3/Q7 是否需要正式编号纳入 H 清单，编号为何（第 3 节）。
  3. 新旧版本 source card 逐条差异核对尚未执行（第 1.1 节）。
- **下一轮有边界的源码阅读问题**：见第 4 节 1–5 项。
- **未运行的检查**：Q1–Q8 全部未执行；H1–H5 除"研究已交付"外均未关闭；G2 r2 基线的独立复核（Codex/Luna）本身也仍待开——本文档未推进、未替代该项独立复核。
