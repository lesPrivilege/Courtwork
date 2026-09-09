# EX-PS4 · Eval 证据面：发布 SHA 下可以展示什么

Sonnet，只读 explore。2026-09-09。基线 Courtwork `main` `172130e8d0ba1e6642e967ac0c1e0938e221d4a8`（worktree `<isolated-checkout>`）。

**状态：直接可消费**（表内已含转录值与 file:line，不需再查原文件）。

## 卷首

**只读声明**：本次 explore 未修改、未创建除本文件外的任何文件；未运行 `benchmarks/continuity/run.mjs` 或任何测试命令；未启动任何服务或端口；未访问任何网络 URL。所有事实来自静态读取仓内文件。

**来源文件与 sha256**（读取时状态，均为 worktree `172130e` 下文件）：

| 文件 | sha256 |
|---|---|
| `benchmarks/continuity/README.md` | `37d3f00ed5cb172a9e21fef1ff8d0c7e112f438e9a15fe5d3b698c1c69274e79` |
| `benchmarks/continuity/observation-contract.md` | `3f4ede44375e94131b6d8db838f595f62ad52c4e70d410d5db815863c85cb2cb` |
| `benchmarks/continuity/cases.json` | `1d22241119aa0a8e3d1b5b38732ccefa9dd90a4235d11c7c2ac1f7736a32fa60` |
| `benchmarks/continuity/grade.mjs` | `920f87e6fe4b03c1e880e221318b8013bdf2aee2cd1d2e91a9733b497f644c20` |
| `benchmarks/continuity/observe.mjs` | `b369a1ed7dbf1e7dd4ebaa8d702ade6ae93e0b8a79885066878d15c19e2dcedd` |
| `benchmarks/continuity/run.mjs` | `21daa1ced36dc1aa35f9f72a7e98bed386e4e40e665c206a3bcc113cb1803755` |
| `benchmarks/continuity/courtwork.mjs` | `28b0559888c85d95fea03d3579a68a54554d79d76c430fe697679192eba58119` |
| `benchmarks/continuity/fixture-identities.mjs` | `e59743fb5d000cfd735833406a05b93da9e14633709860657486b2f4b9d9b4b8` |
| `benchmarks/continuity/standard.mjs` | `7c7b092381b4032d2d1b2f41c0b15a0e5cfc00c8d48af33427e4c035b62ef137` |
| `evidence/se-continuity-20260908/README.md` | `da26fed164414478dbd311f8b97e5e5f4f9c9a4f5e7beda4f88dbd0a7eca5dcb` |
| `evidence/se-continuity-20260908/checks.log` | `8c6278a8b5f172b7b33fad2a8c612b69cc38c0b0f59eef68ad54d5aff14b4551` |
| `evidence/se-continuity-20260908/luna-review.md` | `80362699dc8e489ba239a9ab59ea43d85e9961501e9ccb15f14625a0546be752` |
| `evidence/se-continuity-20260908/author-first.json` | `02403328a60550888a38704ab45acc1e1a4c30f4997f4c1d39be97484a66746d` |
| `evidence/se-continuity-20260908/luna-independent.json` | `6a52409310541ffa41210ad63f1b9fe8c6d541136f327f4780e0b73fdfe57a06` |
| `evidence/pro-review-remediation-20260908/README.md` | `e2a3d823ca17de81cb90712e33e0352ea3f3bcbab5da9fbf4e1679e1f485b72d` |
| `engineering/research/se-continuity-2026-09-08/README.md` | `71e0b12914349fcc06900e1a93ac815a19ad931ebceaedf3b17af35f8ffa3ece` |
| `engineering/current.md` | `28fcc0a71fdf8780cc4538b267605ffe1dc5d7e012d0f4e3e922d66c1be23619` |

**未启动的服务 / 未访问的 URL**：无（本卷不涉及）。

**来源清单偏差**：工单 §只读来源 列出 `standard.md`；该路径在仓内不存在。`benchmarks/continuity/` 下与 "standard" 相关的文件是 `standard.mjs`（S 条件执行脚本，调用 Python 子进程）与 `standard.py`（S 的实现，未在工单来源清单内，未读取，也不需要读取即可完成本工单七表）。本卷改读 `standard.mjs`，并如实标注此偏差。

---

## 表 1 · 八问对照表

| 问题 | 当前可给出的事实（文件:行） | 证据等级 | 缺口 |
|---|---|---|---|
| **What was tested** | 每条轨迹在每个 checkpoint 校验完整语义状态：`observation_present`、`raw_reference`、`raw_mapping`、`schema`、`operation`、`workspace`、`revision`、`current_source`/`historical_source`/`source_versions`、`proposal_membership`、`proposal_basis_*`/`proposal_status_*`/`proposal_obligation_semantics_*`、`obligation_semantics`、`effect_counts`、`artifact_content`、`decisions/audits/receipts_binding`、`decisions/audits_authority`、`receipt_payload_binding`、`unique_immutable_effect`、`refusal_or_restart_preserves_state`（`benchmarks/continuity/grade.mjs:20-67`）。协议自陈"This measures protocol fidelity, not SE's incremental value"（`benchmarks/continuity/observation-contract.md:3`）。 | code fact（grade.mjs）+ 文档声明（observation-contract.md 定性句） | 无（问题本身在协议内有明确答案） |
| **Against what** | 当前 `run.mjs`（schemaVersion 2，`protocol:'se-continuity-conformance-v1'`）对每个用例同时跑 E（`courtwork.mjs`）与 S（`standard.mjs`）两条件：`const conditions = {E:courtwork,S:standard};`（`benchmarks/continuity/run.mjs:19,24`）。S 的定义："S uses separate ordinary jobs, versioned sources/documents, submissions, tasks, approvals, audit and receipts tables, a reviewer table, BEGIN IMMEDIATE, CAS and payload-bound idempotency... the minimum conventional mechanism comparator, not a full T/S/E model harness"（`benchmarks/continuity/observation-contract.md:41-45`）。 | code fact（run.mjs、standard.mjs）+ 文档声明（S 定义句） | `evidence/se-continuity-20260908/` 目录内两份运行记录（`author-first.json`、`luna-independent.json`）的 `protocol` 字段为 `"se-continuity-mechanism-v0"`、`schemaVersion:1`（`author-first.json:2-3`），`results` 内每条只有 `id`/`durationMs`/`observations`/`trace`/`error`/`grade`，**无 `condition` 字段**，`id` 集合为 `['normal','stale-source','receipt-replay','restart','actor-spoof']`（旧 5 用例，无 `cas-conflict`），**未见任何 S 条件的执行记录**。也就是说，工单指定来源目录内现存的两份"运行观察"只测了 E，没有测 S；E/S 对照的运行观察只存在于 `evidence/pro-review-remediation-20260908/README.md`（"E/S各6条，合计12/12"，见下表 3），该目录不在工单来源清单内，仅其 README 在清单内。 |
| **With which model** | `model:null` 写入 report 结构（`benchmarks/continuity/run.mjs:22`）；`author-first.json:28` 与 `luna-independent.json:28` 均为 `"model": null`；courtwork.mjs 与 standard.mjs 均调用受信任的脚本化客户端（`CoreClient`、Python 子进程），不经过任何模型（`benchmarks/continuity/courtwork.mjs:13`、`benchmarks/continuity/standard.mjs:15-17`）。 | code fact | 无模型被测试；有界模型 pilot（B2）未运行，见 `engineering/research/se-continuity-2026-09-08/README.md:29`「层次表」B2 行 |
| **Which harness** | `run.mjs` 编排：读取 `cases.json` 为 spec，对每个 case 分别以 E/S 执行、调用 `grade()` 评分、写 `.attempts.json`（执行前落盘）与 `.journal.jsonl`（逐条 fsync）（`benchmarks/continuity/run.mjs:13,25-44`）。E 执行体 `courtwork.mjs` 经 `app/core/client.mjs` 的 `CoreClient` 驱动真实 Core（`benchmarks/continuity/courtwork.mjs:1,5,13`）。S 执行体 `standard.mjs` 经子进程调用 `standard.py`（`benchmarks/continuity/standard.mjs:15-17`）。`observe.mjs` 做 raw→语义映射，`grade.mjs` 做独立 oracle 校验，`fixture-identities.mjs` 提供预先冻结的角色/ID 分配（`benchmarks/continuity/observe.mjs:1-18`；`benchmarks/continuity/grade.mjs:9-11`；`benchmarks/continuity/fixture-identities.mjs:1-10`）。 | code fact | 无 |
| **Which fixture** | 单一"发明证据备忘录"合成语料族：`corpus:"continuity-conformance-dev-v1"`、`split:"development"`、`family:"synthetic-evidence-memo"`，一份 `source`/`replacement`/`artifact`/`obligation` 文本，6 个用例（`benchmarks/continuity/cases.json:1-18`）。角色/ID 分配对 E、S 分别预先冻结在 `fixture-identities.mjs:3-6`，脚注明确"Adapters do not define which work, proposal or reviewer the oracle should consider correct"（`fixture-identities.mjs:1-2`）。 | code fact | 只有一个合成任务族；README 自陈"development fixtures; shared author"（`benchmarks/continuity/run.mjs:23`）与"One authored memo family"（`observation-contract.md:3`） |
| **What was held constant** | `run.mjs` 在报告中固定被测代码的 sha256（`cases.json`、`run.mjs`、`courtwork.mjs`、`standard.mjs`、`standard.py`、`observe.mjs`、`grade.mjs`、`fixture-identities.mjs`、`trace.mjs`、`app/core/client.mjs`、`app/core/bridge.py`、`app/core/core.py`）与 `git.head`/`git.dirty`（`benchmarks/continuity/run.mjs:14-20`）；每次尝试的角色/ID 分配在执行前冻结（`fixture-identities.mjs:1-2`）；`.attempts.json` 在执行任何 attempt 之前落盘并 fsync（`run.mjs:26-27`）。README 声明"E and S should both pass; this is calibration, not evidence of SE advantage"（`benchmarks/continuity/README.md:19-20`）。 | code fact + 文档声明 | 无 |
| **What failed** | 已读到的每一份运行记录汇总均为全通过：`checks.log` 6/6（`evidence/se-continuity-20260908/checks.log:7-14`）；`author-first.json` `summary.attempted:5,summary.passed:5`（`evidence/se-continuity-20260908/author-first.json:2126` 一带，字段名核实见下表 3）；`luna-independent.json` 同为 5/5（同上）。历史上出现过失败并被修复：`evidence/pro-review-remediation-20260908/README.md:26`「D1第一次：11/12」，原因是 CAS 用例误命中 `CANDIDATE_CLOSED`，后修正为同 base 的第二个 pending 候选，「不改变 Core 以迎合测试」，随后「12/12」。 | 运行观察（checks.log、author-first.json、luna-independent.json）+ 文档声明（pro-review-remediation README 对历史失败的叙述） | 在工单指定来源范围内，**没有任何一次对当前 `main` `172130e`（或与之等价的 6 用例、E+S 12 条 schemaVersion 2 协议）的完整运行记录**；`evidence/se-continuity-20260908/` 下两份是旧 5 用例、仅 E、schemaVersion 1 的记录（见上「Against what」行）；`evidence/pro-review-remediation-20260908/README.md` 叙述的 12/12（E/S 各 6 条）发生在该批次的独立分支基线上，不是本次发布 SHA 上的重跑 |
| **Can I reproduce it** | README 给出两条命令："`node --test benchmarks/continuity/grade.test.mjs`" 与 "`node benchmarks/continuity/run.mjs --output /tmp/continuity-result.json`"，前置为"From repository root, Node >=22.19 and Python 3 (standard library only)"（`benchmarks/continuity/README.md:6-11`）；README 另注"Output, `.attempts.json` and `.journal.jsonl` must be new files"（`README.md:13`）与"No providers, personal runtime directories or network calls are used"（`README.md:16`）。 | code fact（命令与文件内代码路径一致，`run.mjs:12` 校验 `--output` 用法） | 本工单明确「不做：运行 benchmark」，故命令本身未在本次 explore 中执行验证 |

---

## 表 2 · 用例表（`cases.json` 逐条转录，不评价）

顶层字段：`schemaVersion:2`、`corpus:"continuity-conformance-dev-v1"`、`split:"development"`、`family:"synthetic-evidence-memo"`、`source:"Synthetic delivery date: 12 October. Confirm owner separately."`、`replacement:"Synthetic delivery date: 19 October. Confirm owner separately."`、`artifact:"Delivery is 12 October; owner confirmation remains open."`、`obligation.text:"Confirm owner separately"`（`benchmarks/continuity/cases.json:1-9`）。

| id | 场景一句（steps 原文） | 观察关系（步骤序列） | 评分项（outcomes 原文） |
|---|---|---|---|
| `normal` | `["observe","accept"]` | 观察后接受 | `["observed","accepted"]` |
| `stale-source` | `["replace","accept"]` | 来源替换后再尝试接受 | `["source_replaced","stale_source"]` |
| `receipt-replay` | `["accept","accept","changed-request"]` | 接受、重放接受、变更请求内容后再接受 | `["accepted","accepted","request_conflict"]` |
| `restart` | `["accept","restart","accept"]` | 接受、重启、再接受 | `["accepted","restarted","accepted"]` |
| `actor-spoof` | `["spoof","accept"]` | 伪造 actor 后接受 | `["authority_rejected","accepted"]` |
| `cas-conflict` | `["accept","stale-base"]` | 接受后以过期 base 提交 | `["accepted","version_conflict"]` |

（`benchmarks/continuity/cases.json:11-17`）

---

## 表 3 · 运行记录表

| 文件 | 日期 | 执行者 | provider（fake / 真实） | 结果摘要字段 | 是否独立复核 |
|---|---|---|---|---|---|
| `evidence/se-continuity-20260908/author-first.json` | `startedAt:"2026-09-08T10:50:14.561Z"`（文件内字段）；`git.head:"62556b7f65170ecf30efb2869447ae85fe69d721"`，`git.dirty:true`（`author-first.json:5-7`附近，字段核实：`schemaVersion:1`第2行、`protocol` 第3行、`corpus`第24行、`independentTaskFamilies`第26行、`model`第28行、`summary`第2125行起） | 未在文件内标出执行者字段；`evidence/se-continuity-20260908/README.md:3` 归属本轮批次为"Astra 编写协议与 B0 runner" | fake（scripted trusted Core client；`limitations` 数组含 "scripted trusted Core client"，见 README 同批次描述） | `summary:{attempted:5,passed:5,failed:0}`；`protocol:"se-continuity-mechanism-v0"`；`corpus:"continuity-mechanism-dev-v0"`；仅 5 用例、无 `condition` 字段，即**未含 S** | 否（作者自跑，见 `handoff-convention.md` §5「作者检查 ≠ 独立验收」） |
| `evidence/se-continuity-20260908/luna-independent.json` | `startedAt:"2026-09-08T10:52:40.166Z"`；`git.head:"ab500c7ed77289d3de376ee55b5c78c2c3f24410"`，`git.dirty:false`（文件第 2-7 行附近） | Luna（非作者），`evidence/se-continuity-20260908/luna-review.md:3`「非作者 Luna 探索后复核 B0，未修改文件」 | fake（同上，scripted） | `summary:{attempted:5,passed:5,failed:0}`；同 v0 协议、5 用例、无 S | 是（本行即独立复核；`luna-review.md:5`「5/5，退出码 0」） |
| `evidence/se-continuity-20260908/checks.log` | 文件本身无日期字段；据同目录 `README.md:17` 归属本批次（2026-09-08） | 文件本身无执行者字段；据同目录 `README.md:3` 归属本批次 | fake（`node --test app/tests/work-core.test.mjs benchmarks/continuity/grade.test.mjs`，无 provider 概念，纯本地测试） | 6/6 pass（`checks.log:9-14`），含既有 SIGKILL Core 回归与 grader 负例测试 | 未标注（此文件不区分作者/独立） |
| `evidence/pro-review-remediation-20260908/README.md`「D1第一次」引用的 `d1-first.json` | 归属本批次（2026-09-08），文件本身未在本次 explore 中打开 | Astra（`README.md:3`「Astra负责架构/实现」） | fake（scripted） | 「11/12」，CAS 用例因 `CANDIDATE_CLOSED` 误判失败一条（`pro-review-remediation-20260908/README.md:26`） | 否（作者自跑） |
| 同上「下一次」`d1-calibration.json` | 同上批次 | Astra | fake | 「12/12」（`README.md:26`） | 否 |
| 同上「raw绑定阶段D1运行」`d1-linked.json`（+ `d1-linked.attempts.json`、`d1-linked.journal.jsonl`） | 同上批次 | Astra | fake | 「E/S各6条，合计12/12。仍只有一个开发memo族」（`README.md:28`）——这是工单指定来源中唯一明确出现「E 与 S 各 6 条、且用当前 6-用例结构」字样的运行记录 | Luna 在更早的 D1 阶段发现过 raw/normalized 不一致与角色自报问题并被修复（`README.md:27`），但 `d1-linked` 这次运行本身文中未标"独立复核"字样 |
| 同上「D2 focused」`d2-focused.log` | 同上批次 | Astra | fake | 「5/5测试组」，含三种尺寸 HTTP 续行、source/base/contract 投影、作用域分页读取、source 过期→卸载只读→重载修订接受（`README.md:29`） | 否（未标注独立复核） |
| 同上「独立持久化观察日志」`d2-durable-observer.log` | 同上批次 | 「此观察器由本轮实现作者编写，代码依赖独立，不冒充非作者接受；Luna另行复核」（`README.md:31`） | fake | 2/2（`README.md:31`） | 部分：观察器代码独立于生产模块，但执行者是作者本人；文中说明「Luna另行复核」，未给出复核结果的独立文件引用 |
| 同上「全量应用回归」`full-tests-first.log` | 同上批次 | Astra | fake | 179/179（`README.md:33`）——注：这是全仓测试回归，不是 continuity benchmark 本身的用例数 | 否 |

**统一注记**：以上所有行的 provider 均为 fake / 脚本化受信任客户端；工单来源范围内没有任何一行使用真实 model provider。`engineering/current.md:19`「G1真实provider not_run」与此一致。

---

## 表 4 · Baseline 与 SE 两列在协议里的定义原文位置

| 列 | 定义原文 | 位置 |
|---|---|---|
| S（baseline，研究协议层） | 「S：认真实现的普通持久化系统，具有可编辑摘要/任务清单、版本化文件、常规审批与事务保护。」 | `engineering/research/se-continuity-2026-09-08/README.md:49` |
| E（SE，研究协议层） | 「E：Courtwork/SE 的显式契约、正式状态、Context 投影与提交规则。」 | `engineering/research/se-continuity-2026-09-08/README.md:51` |
| T（研究协议层，仅作参照，**未在 `benchmarks/continuity/` 内实现**） | 「T：transcript + 原始文件 + 检索。」 | `engineering/research/se-continuity-2026-09-08/README.md:47` |
| S（代码/可执行层） | "S uses separate ordinary jobs, versioned sources/documents, submissions, tasks, approvals, audit and receipts tables, a reviewer table, BEGIN IMMEDIATE, CAS and payload-bound idempotency... It is the minimum conventional mechanism comparator, not a full T/S/E model harness; no retrieval, professional semantic gate, or performance superiority is claimed." | `benchmarks/continuity/observation-contract.md:41-45` |
| E（代码/可执行层） | 协议文档内**没有**与 S 对等的单独一段"E is..."式定义句；E 的操作定义只能从代码路径反推：`courtwork.mjs` 用 `CoreClient` 驱动真实 Work Core（`courtwork.mjs:1,5,13`），`observe.mjs` 内 `observeCourtwork()` 给出 E 的 raw→语义字段映射（`observe.mjs:2-14`）。 | `benchmarks/continuity/courtwork.mjs:1-13`；`benchmarks/continuity/observe.mjs:2-14`（无独立 prose 定义） |

如实记录：协议在**研究文档层**（`engineering/research/se-continuity-2026-09-08/README.md`）给出了 T/S/E 三者对称的一句话定义；但在**代码实现所依据的 `observation-contract.md`**里，只有 S 有一段对等的散文定义，E 没有——E 的定义要靠读代码（`courtwork.mjs`/`observe.mjs`）拼出来，不是文档显式声明。

---

## 表 5 · 失败分类（failure taxonomy）

协议内**没有**一份统一命名为"failure taxonomy"的类目表；但存在两类不同性质、且不应混同的分类：

1. **业务级拒绝结果类目**（针对被测系统对非法操作的"正确拒绝"，非 benchmark 本身的失败）：`stale_source`、`request_conflict`、`authority_rejected`、`version_conflict`，见 `benchmarks/continuity/observation-contract.md:21-22`「Reject outcomes are distinct: stale_source, request_conflict, authority_rejected, version_conflict. Invalid input/transport failure cannot substitute for them.」；`grade.mjs:63` 再次列出同一组类目用于校验拒绝/重启后状态保持；`courtwork.mjs:40` 把这组类目映射回 Core 抛出的错误码 `{INVALID,STALE_INPUT,IDEMPOTENCY_CONFLICT,VERSION_CONFLICT}`。这组类目描述的是"系统应当拒绝并保持何种状态"，不是"这次评测跑失败了、原因是什么"。
2. **评测运行失败的粗分类**（只在研究文档层出现一句话，未见对应代码枚举）：「运行错误、超时、中断、缺失检查点均保留在尝试分母，区分 infrastructure failure 与行为失败」，`engineering/research/se-continuity-2026-09-08/README.md:72`。这句话区分了 infrastructure failure 与「行为失败」两大类，但在 `benchmarks/continuity/grade.mjs` 与 `run.mjs` 的实际代码里，失败只表现为 `{code,message}` 形式的异常对象（`run.mjs:39`）与逐 checkpoint 的 `{checkpoint,field,pass}` 布尔记录（`grade.mjs:13`），没有与"infrastructure / 行为"对应的枚举字段或类目名称写进代码。

如实写：代码里能转录出类目名的，只有第 1 组（4 个拒绝结果名）；第 2 组只是文档里的一句区分声明，代码未实现为可转录的类目。

---

## 表 6 · 复现命令

| 命令 | 前置条件 | 来源 |
|---|---|---|
| `node --test benchmarks/continuity/grade.test.mjs` | 从仓库根目录执行；Node ≥ 22.19；Python 3（标准库） | `benchmarks/continuity/README.md:6-9` |
| `node benchmarks/continuity/run.mjs --output /tmp/continuity-result.json` | 同上；输出路径、`.attempts.json`、`.journal.jsonl` 必须是全新文件（README 原话："Output, `.attempts.json` and `.journal.jsonl` must be new files"）；不使用任何 provider、个人运行时目录或网络调用 | `benchmarks/continuity/README.md:6-16` |

`run.mjs:12` 对参数格式有硬校验：`if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node benchmarks/continuity/run.mjs --output /absolute/result.json')`，即第二参数须为**绝对路径**。本工单未执行以上命令。

---

## 结论

1. 协议对"What was tested"有明确、可转录的答案：每 checkpoint 校验完整语义状态（grade.mjs:20-67）。
2. "Against what"在代码当前版本上是 E vs S（run.mjs:24），但工单来源目录 `evidence/se-continuity-20260908/` 内两份运行记录只测了 E，无 S，且是旧 5-用例、schemaVersion 1 协议。
3. "With which model"答案是 null：所有已读运行记录字段均为 `model:null`，无模型参与过任何一次记录在案的运行。
4. "Which harness"与"Which fixture"在代码里有完整、单一的答案：run.mjs 编排 courtwork.mjs/standard.mjs/grade.mjs/observe.mjs/fixture-identities.mjs，语料是一个合成备忘录族、6 个用例。
5. "What was held constant"有代码级证据：被测文件 sha256 与 git head/dirty 状态在报告里落盘（run.mjs:14-20）。
6. "What failed"在已读文件里全部是通过（0 失败），历史上出现过一次已修复的失败（11/12→12/12，pro-review-remediation README:26）。
7. 工单来源范围内，没有一份运行记录是针对当前发布 SHA（`main` `172130e`）、当前 6-用例、E+S 12 条、schemaVersion 2 协议的完整重跑；最接近的一次（E/S 各 6 条、12/12）记录在另一个独立分支批次的 README 叙述里，不在本工单指定的 JSON 原始来源清单内。
8. "Can I reproduce it"答案是两条命令，前置条件明确写在 README；本工单按指示未执行。
9. Baseline（S）在研究文档与代码文档两层都有散文定义；E 只在研究文档层有一句定义，代码文档层（observation-contract.md）没有与 S 对等的 E 定义句，需从代码拼出。
10. 协议没有统一的"failure taxonomy"；存在的是一组 4 类业务拒绝结果名（code fact）与一句区分 infrastructure/行为失败的文档声明（无对应代码枚举）。
