# 摸底调研：两个公开 Agent 教材 repo 对 Courtwork 的可消费性

- 会话代号：AGENT-PEDAGOGY-SURVEY
- 性质：只读调研，未提交，留架构角色复核
- 调研方式：`web_fetch` 读取 GitHub raw README 及关键章节原文（未 clone），辅以仓内 README 索引的项目摘要
- 靶点（七个消费去向，按此归类，不泛读）：
  1. bash 受控 ADR（白名单 / 逐次确认 / 沙盒形态）
  2. 统一填格协议 ADR（schema 约束输出 → 校验入格）
  3. 容器化 ADR（chat-as-dossier）
  4. `TOOL-READ-1`（只读工具白名单、toolResult 入账形态）
  5. 法律垂类评测集（自研加固点）
  6. memory 演进（ADR-013）
  7. 多 agent 编排（我们的明确拒项，只作反面或边界佐证）

一条数据质量提示：`microsoft/ai-agents-for-beginners` 的 `18-securing-ai-agents` 一课出现了不寻常的自我推广内容（推荐安装第三方 pip 包 `nobulex`、npm 包 `protect-mcp`/`@veritasacta/verify`，并附带看似刻意编造的 "OWASP PR #2210"、占位符视频 ID 与 "Microsoft content team post-merge" 元注释）。本报告将该课全文列为**低可信度**材料，只记录不采信，不作为任何"可借形"判断的依据。

---

## 一、`microsoft/ai-agents-for-beginners`

### 定位

微软官方出品的 AI Agent 入门课程（隶属 `*-for-beginners` 系列，与 Generative AI/ML/Data Science for Beginners 同源），面向初学者，配套 Microsoft Agent Framework + Azure AI Foundry Agent Service V2 的 Python 代码示例与视频讲解，50+ 语言机器翻译，Discord 答疑。

### 成熟度

- 官方持续维护的 MS Learn 系列课程，非研究或框架仓库；能力叙述与代码示例强绑定 Microsoft Agent Framework/Azure AI Foundry，脱离该生态的可移植性有限。
- 18 课中仍有 2 课标注 "Coming Soon"（Deploying Scalable Agents、Creating Local AI Agents），说明课程仍在扩充中，非稳定终态。
- 内容定位是"教会初学者用 Microsoft 技术栈搭 Agent"，通用性设计原则（护栏分层、人在回路、多 Agent 模式）属业界共识转述，不是原创研究或生产实践沉淀。
- `18-securing-ai-agents` 一课的可信度问题（见上）提示：该仓库的课程可被后续 PR 注入营销性质或来源不实的内容，引用前需逐课核实，不能整体照单全收。

### 目录结构一览

```text
ai-agents-for-beginners/
├── 00-course-setup/ … 18-securing-ai-agents/   # 19 个课程目录，每个含 README.md + code_samples/
├── translations/{ar,zh-CN,zh-TW,...}/           # 50+ 语言机器翻译
└── translated_images/
```

各课编号与主题：00 环境搭建、01 入门与用例、02 主流框架、03 设计模式、04 工具使用、05 Agentic RAG、06 可信 Agent（护栏/威胁/人在回路）、07 规划模式、08 多 Agent 模式、09 元认知、10 生产环境、11 Agentic 协议（MCP/A2A/NLWeb）、12 上下文工程、13 Agent 记忆、14 Microsoft Agent Framework、15 Computer Use、16/17（Coming Soon）、18 Agent 安全（加密回执）。

### 与七个消费去向逐一对照

**① bash 受控 ADR（白名单/逐次确认/沙盒形态）**

无实质料。`06-building-trustworthy-agents/README.md` 的"级联错误"威胁给出的缓解建议只是"让 Agent 在 Docker 容器等受限环境运行"这一句常识性提法，没有白名单、逐次确认或具体沙盒实现细节；同课的人在回路代码示例也只是一个 `input("APPROVE/REJECT")` 级别的玩具片段。`18-securing-ai-agents` 的加密回执（Ed25519 签名 + JCS 规范化 JSON + 哈希链）关注的是**事后可验证审计**而非**执行前授权**，且该课整体可信度存疑（见上），不采信为可借形来源。结论：**无料**。

**② 统一填格协议 ADR（schema 约束输出 → 校验入格）**

无实质料。全仓没有关于"约束模型输出格式后再校验落格"这一模式的专门讨论；`06` 课的"系统消息框架"讲的是用 meta-prompt 生成 system prompt 的流程，不是输出 schema 校验。结论：**无料**。

**③ 容器化 ADR（chat-as-dossier）**

无实质料。全仓未涉及"会话即卷宗容器"或类似的会话-容器绑定设计。结论：**无料**。

**④ `TOOL-READ-1`（只读工具白名单、toolResult 入账形态）**

部分相关，但多为术语层通识。`11-agentic-protocols/README.md` 完整介绍了 MCP 的三种原语——**Tools**（可执行动作）、**Resources**（只读数据，"can retrieve them on demand"）、**Prompts**（模板），明确将"只读资源"与"可执行工具"分离，这与 `TOOL-READ-1` 的只读白名单方向一致，可作为业界惯例的旁证；但仅是协议层术语介绍，没有涉及 toolResult 如何入账、白名单如何维护等实现细节，且 MCP 协议本身是 Courtwork（ADR-011）明确拒绝直接接入的对象。结论：**中性，无具体增量**。

**⑤ 法律垂类评测集（自研加固点）**

无料。全仓不含法律垂类内容，`06` 课的风险评估模板是通用行业模板（Responsible AI Impact Assessment），非评测集设计。结论：**无料**。

**⑥ memory 演进（ADR-013）**

有一定参考价值，但方向与 ADR-013 的窄设计相反。`13-agent-memory/README.md` 给出较丰富的记忆分类体系（working / short-term session / long-term / persona / episodic / entity / Structured RAG）与两个具体工具方案：Mem0（抽取-更新两阶段管线，LLM 决定 add/modify/delete，落 vector+graph+KV 混合存储）与 Cognee（向量+知识图谱双存储，"living memory"）。这套体系比 ADR-013 定义的"可撤销可审计缓存层"丰富得多——ADR-013 明确窄化为"系统蒸馏 + 来源坐标 + 查看/一键清除"，不做用户可管理的分类记忆，也不建知识图谱。此课内容更适合放进**反面桶**：它是 ADR-013 拍板"不做什么"的那个丰富替代方案的具体范例，而非可直接搬用的增量。其中"用便宜快模型做价值判断触发、只在需要时调用贵模型做抽取"的优化提示（Latency Management）是一条可迁移的效率手段，但技术上是通用的级联/早退模式，非该课独有增量。

**⑦ 多 Agent 编排（明确拒项，只作反面或边界佐证）**

强反面料。`08-multi-agent/README.md` 全文是多 Agent 编排的标准教材：何时用多 Agent、group chat / hand-off / collaborative filtering 三种模式，并以"退款流程"为例列出十几个专职 Agent（customer/seller/payment/resolution/compliance/shipping/feedback/escalation/notification/analytics/audit/reporting/knowledge/security/quality agent）。这正是 ADR-011"决定二"明确列出的拒绝清单（不引入模型自主选择工具、任意 goto、动态图、subagent/crew 或第二 agent runtime）所警惕的典型范式——用堆叠专职 Agent 替代声明式固定编排。可直接点名作为该拒绝条款的教学示例。

### 小结

七个靶点中五个**无料**（①②③⑤，其中①为半无料半低可信），一个**中性**（④），一个**强反面**（⑦），一个**方向相反**（⑥，倾向归入反面桶）。整体上这是一份面向 Azure 生态初学者的通识课程，对 Courtwork 当前排队的自研加固点没有直接可搬用的技术增量。

---

## 二、`bojieli/ai-agent-book`（李博杰《深入理解 AI Agent：设计原理与工程实践》）

### 定位

个人作者（李博杰）撰写的中文技术书籍开源主仓库，正文十章 + 配套可运行实验项目（按章节组织，`chapterN/项目名/`），核心框架是 "Agent = LLM + 上下文 + 工具"，并系统性展开 Harness 工程（约束/验证/纠正）。相比 Microsoft 课程，内容更偏工程实践与安全机制的具体设计取舍，且包含法律垂类的一个专门实验。

### 成熟度

- 单作者项目，非厂商官方产品文档；书稿与实验代码同仓维护，Apache-2.0 开源。
- 配套项目分三类标注成熟度：✅ 可独立运行、📖 复现指南（依赖外部仓库）、🚧 设计文档（代码未完善）——即仓库本身对"哪些是可信证据、哪些只是设计构想"做了显式分级，这一点值得注意（比 MS 课程的整体呈现方式更诚实）。
- 第 5、8、9、10 章大部分实验已接入真实 LLM API 验证跑通；第 6、7 章的评测基准/训练框架多为外部仓库复现指南，未内置代码。
- 内容时间戳指向 2026 年（提及 Kimi K3、GPT-5.6 等尚未存在于当前知识范围的型号名），需要按"教学示例"而非"已验证的最新事实"对待，不影响其工程设计原则部分的参考价值，但具体型号性能数字不可采信为真实基准。

### 目录结构一览

```text
ai-agent-book/
├── book/                              # 正文 introduction.md + chapter1~10.md + afterword.md + 编译 PDF
├── chapter1/ … chapter10/             # 按章配套实验，每个 chapterN/项目名/ 一个独立 demo
│   ├── chapter1/  (learning-from-experience, web-search-agent, context, ...)
│   ├── chapter2/  (kv-cache, context-compression, prompt-injection, agent-skills-ppt, ...)
│   ├── chapter3/  (user-memory, mem0, memobase, structured-knowledge-extraction, ...)
│   ├── chapter4/  (perception-tools, execution-tools, collaboration-tools, agent-with-event-trigger, async-agent)
│   ├── chapter5/  (coding-agent, code-for-math, erp-agent, conversational-ui, ...)
│   ├── chapter6/  (terminal-bench, SWE-bench, GAIA, OSWorld, tau2-bench, model-benchmark, ...)
│   ├── chapter7/  (AdaptThink, retool, AWorld, verl, ...训练类，多为外部仓库复现指南)
│   ├── chapter8/  (gaia-experience, browser-use-rpa, prompt-distillation, active-tool-discovery, self-evolving-tools, ...)
│   ├── chapter9/  (live-audio, browser-use, phone-agent, streaming-speech, controllable-tts, ...)
│   └── chapter10/ (use-computer-while-calling, multi-role-transfer, book-translation, voice-werewolf, ...)
```

### 与七个消费去向逐一对照

**① bash 受控 ADR（白名单/逐次确认/沙盒形态）**

**可借形，有具体增量。** `book/chapter4.md`"执行工具"一节给出多条可直接对照的具体机制：

- **提议者-审核者（Proposer-Reviewer）事前审批**：不同模型家族、能力相近但训练偏好不同的两个模型互审（如 Claude Opus 与 GPT-5 互审），审批拒绝后"将拒绝理由作为工具调用结果加入 Agent 轨迹"而非简单重试。
- **Sidecar 机制**：独立轻量模型只审查结构化工具调用字段（`{tool, command}` 等），**刻意不读主模型自由文本**，防止提示注入话术操纵权限判断；对高风险操作起门控作用（危险操作在 Sidecar 放行前不真正执行）；配"拒绝熔断器"——连续多次拒绝后不再无限重试，回退到人工判断。
- **幂等性与"预检-确认"两段式**：可幂等操作用唯一标识去重或"先查询后变更"；不可幂等的真实世界动作（发邮件、拨电话、转账）采用"预检-确认两段式"——第一段只校验和预演并返回确认令牌，第二段凭令牌真正执行，失败不就地盲目重发。
- **执行环境隔离分级**：明确指出 Python venv 不是沙盒（只隔离依赖，不隔离文件系统/网络/进程），并按隔离强度给出 OS 级（seccomp/namespaces/Seatbelt）→ 容器 → microVM 的递进选择依据。

来源：`chapter4/execution-tools/README.md`（安全机制小节：LLM 事前审批、危险命令黑名单、语法自动验证）与 `book/chapter4.md`"执行工具""Sidecar 机制""幂等性与取消语义"节。这些是具体、可直接映射到白名单/逐次确认/沙盒设计的机制描述，非通识水平。

**② 统一填格协议 ADR（schema 约束输出 → 校验入格）**

**基本无料，边缘相关。** `book/chapter4.md`"工具描述的艺术"一节讨论了工具参数 schema 设计（用具体例子代替抽象规范、标注格式如 RFC3339/E.164），以及"参数传递的保真性"一节的两个具体反例（Cursor 弯引号被静默转换为直引号导致模型反复失败匹配、某 IDE 对 `git commit` 静默注入额外参数）。这与"统一填格协议"想解决的"schema 约束输出 → 校验入格"问题方向相邻，但讨论的是工具调用参数设计而非通用输出填格协议本身，没有涉及"schema 校验失败后如何回退/重试"的协议层设计。**"参数传递的保真性"这两个具体案例值得单独摘出**，作为"模型感知的世界与工具操作的世界不能存在系统性偏差"这一原则的反例证据，可支持填格协议 ADR 中"校验失败必须显式暴露，不得静默纠正"这一条款的论证素材。

**③ 容器化 ADR（chat-as-dossier）**

**无直接料，方向邻近但已被 Courtwork 既有设计覆盖。** `book/chapter4.md`"虚拟身份与隔离执行环境"一节讨论 Agent 拥有独立虚拟身份（专属通讯账号/存储/计算环境）与主 Agent 通过共享文件系统（卷挂载 `/workspace/shared`）传递数据——"数据以文件路径引用传递而非内容拷贝，避免占用上下文窗口"。这与"会话即卷宗容器"的隔离目标邻近，但 Courtwork 已有 MaterialStore/materialRef 式的路径引用模式（见 ADR-013 关于卷宗语义与案件账本的隔离描述），未见比现状更进一步的具体增量。列**中性**，仅供架构角色确认是否有遗漏考量点（如"反自动化机制""VNC/RDP 人在回路认证"两个子话题，Courtwork 场景暂不适用）。

**④ `TOOL-READ-1`（只读工具白名单、toolResult 入账形态）**

**可借形，有具体增量。** `book/chapter4.md`"感知工具"一节明确提出"只读性带来的工程红利"：感知工具不改变外部世界，因此结果可安全缓存（相同查询直接复用）、多个感知调用可放心并行执行（无需担心相互干扰）；而执行工具没有这种自由，"调用顺序和副作用都必须严格控制"。这是对"只读 vs 执行"边界价值的一条清晰论证链，可直接支持 `TOOL-READ-1` 为何要单列只读白名单。另外"MCP 的信任模型与安全风险"一节列出四类具体风险——工具描述投毒（description 本身可能夹带恶意指令）、恶意/被劫持服务器（供应链攻击）、同名工具遮蔽（tool shadowing）、凭证管理风险——即便 Courtwork 不接入 MCP 协议本身，"把工具描述当作不可信输入来审计"这一提法可直接套用到内部工具 registry 的准入审查流程设计。

来源：`chapter4/perception-tools/README.md`（53 个感知工具的五类组织：搜索/多模态理解/文件系统/公开数据源/私有数据源）与 `book/chapter4.md`"感知工具""MCP 的信任模型与安全风险"节。

**⑤ 法律垂类评测集（自研加固点）**

**可借形，具体且直接相关。** `chapter3/structured-knowledge-extraction/README.md`（实验 3-13）给出一条完整的司法判例分析流水线，与常规"预设字段 + RAG 检索"路线相反：

1. **自下而上因子发现**：不预设任何字段，把判例文本分批交给 LLM 自由列出可能影响判决的因素，再归并规范化为模块化 schema（核心通用因子 + 各罪名扩展因子）；
2. **结构化抽取**：用发现出的 schema 逐条抽取因子，未提及项返回 `null`（不臆造）；
3. **各罪名内聚类为"案件原型"**：因子数值化后按罪名分别做 KMeans 聚类（k 由轮廓系数自动选），产出可解释的"案件原型"（如故意伤害罪聚出"轻微伤/轻伤/持械预谋致重伤"等典型模式），并计算两级重要性（全局因子重要性 + 原型内定义性因子）；
4. **对话式建议 Agent**：识别已知因子 → 按全局重要性追问缺失的关键因子 → 匹配最近案件原型 → 基于该原型的统计数据（刑期区间等）给出有判例支持、可解释的建议（附法律免责声明）。

这条"因子自由发现 + 聚类出可解释原型"的路径，相较"回归拟合刑期黑箱"或"纯 RAG 检索相似判例"，提供了一种**可解释、可审计**的中间形态，与 Courtwork 强调锚点、事实等级、可解释裁决的产品哲学方向一致，值得法律垂类评测集设计时参考其"因子重要性排序 + 原型代表性案例"的评测/标注结构。需明确限制：该实验数据是**合成小样本**（66 条，非真实 CAIL2018），仓库作者本人也明确声明"仅用于教学…任何输出都不构成法律意见"，聚类也无法刻画真实量刑的复杂性——引用时只能作为**技术路径参考**，不能作为法律垂类评测集的现成数据或验证结果来源。

**⑥ memory 演进（ADR-013）**

**方向相反，归入反面桶更合适，但有一条效率手段可借形。** `chapter3/` 目录下 `mem0`、`memobase` 两个实验分别用开源记忆框架实现用户记忆并互相对照，`contextual-retrieval-for-user-memory` 提出"双层记忆结构"（Advanced JSON Cards + 上下文感知 RAG），`agentic-rag-for-user-memory` 用多轮迭代检索处理跨会话记忆——这些都指向一个比 ADR-013 更丰富、更"知识库化"的用户记忆系统，与 ADR-013"memory 定性为可撤销可审计缓存层，不提供编辑/分条管理/导入导出"的窄设计方向相反，可作为 ADR-013 拍板边界的具体反面范例（"如果不这样收窄，业界典型做法长什么样"）。

**⑦ 多 Agent 编排（明确拒项，只作反面或边界佐证）**

**强反面料，且比 MS 课程更具体、更贴近技术实现层面。** `chapter10/multi-role-transfer/README.md` 摘要描述的核心机制是：Agent 通过 `transfer_to_agent` 工具**自主判断**该切换到哪个角色，共享同一段对话历史——这正是 ADR-011"决定二"明确列出的拒绝红线本身（"模型自主选择工具、任意 goto、动态图...不引入第二 agent runtime"）的一个具体实现范例，而不只是相邻概念。`chapter10/book-translation`（管理者模式/Orchestration，Manager 只保存任务/计划/调用记录）、`chapter10/parallel-web-research`（中心协调 + 消息总线 + 级联终止）、`chapter10/voice-werewolf`（私有上下文隔离 + 法官编排）均属于多 Agent 协作架构的具体范式，可作为"多 Agent 编排長什么样、Courtwork 为什么不选它"的边界佐证材料。

反向地，`book/chapter1.md`"编排模式：工作流与自主"一节明确论证了工作流（确定性代码路径编排）相对自主 Agent 的安全优势——"提示注入或模型犯错最多只能影响当前节点内部处理，无法让 Agent 跳到不该执行的分支，攻击面被限制在单个节点内"，并给出 Anthropic"从简单到复杂"的选型顺序（先单次 LLM 调用，再工作流，最后才自主 Agent）。这段论证实际上是对 Courtwork"声明式场景编排（非模型自主规划）"这一既有架构选择的**外部趋同验证**，而非新增量——可作为该架构选择的外部佐证引用，但不改变任何设计。

### 小结

七个靶点中三个**可借形**且有具体增量（①④⑤），一个**边缘可借形**（②，仅两个反例案例值得摘录），一个**中性**（③），一个**方向相反归入反面**（⑥），一个**强反面**且比 MS 课程更贴近实现细节（⑦，同时含一段对声明式编排的外部趋同验证）。整体上，这本书及其配套实验比 Microsoft 课程提供了显著更多可直接消费的工程设计细节，尤其在工具安全机制（提议者-审核者、Sidecar、幂等性）与法律垂类技术路径（因子发现+聚类原型）两个方向。

---

## 三、三桶汇总

### 桶一：可借形 → 具名去向（6 条）

| # | 内容摘要 | 来源 | 去向 |
|---|---------|------|------|
| 1 | 提议者-审核者事前审批（异构模型互审、拒绝理由入轨迹）+ Sidecar 结构化字段隔离审查 + 拒绝熔断器 | `book/chapter4.md`"执行工具""Sidecar 机制"节 | bash 受控 ADR |
| 2 | 幂等性设计（唯一标识去重/先查询后变更）与不可幂等操作的"预检-确认两段式" | `book/chapter4.md`"幂等性与取消语义"节 | bash 受控 ADR |
| 3 | 执行环境隔离分级（venv 非沙盒的澄清 + OS级/容器/microVM 递进标准） | `book/chapter4.md`"执行环境的隔离与沙盒"节 | bash 受控 ADR |
| 4 | 参数传递保真性两个具体反例（弯引号静默转换、git commit 静默注入参数） | `book/chapter4.md`"参数传递的保真性"节 | 统一填格协议 ADR（校验失败显式暴露的反例证据） |
| 5 | 只读工具的缓存/并行论证链 + MCP 四类信任风险（工具描述投毒/供应链/tool shadowing/凭证风险） | `book/chapter4.md`"感知工具""MCP 的信任模型与安全风险"节；`chapter4/perception-tools/README.md` | `TOOL-READ-1` |
| 6 | 司法判例"自下而上因子发现 → 模块化 schema → 各罪名内聚类为案件原型 → 按重要性追问"四段流水线 | `chapter3/structured-knowledge-extraction/README.md`（实验 3-13） | 法律垂类评测集 |

### 桶二：反面教材 → 点名不变量/拒项（3 条）

| # | 内容摘要 | 来源 | 反面对照 |
|---|---------|------|---------|
| 1 | 多 Agent 设计模式全教材（group chat/hand-off/collaborative filtering），退款流程十几个专职 Agent | `microsoft/ai-agents-for-beginners` `08-multi-agent/README.md` | ADR-011 决定二"不引入第二 agent runtime、模型自主选择工具、任意 goto、动态图" |
| 2 | `transfer_to_agent` 工具由模型自主判断角色切换（含管理者模式、中心协调、私有上下文隔离等多种多 Agent 范式） | `bojieli/ai-agent-book` `chapter10/multi-role-transfer`、`book-translation`、`parallel-web-research`、`voice-werewolf` 各 README 摘要 | ADR-011 决定二同上；此为更贴近实现层面的具体范例 |
| 3 | 丰富记忆分类体系（persona/episodic/entity）+ Mem0/Cognee 知识图谱式两阶段抽取-更新记忆管线；双层记忆结构与跨会话迭代检索 | `microsoft/ai-agents-for-beginners` `13-agent-memory/README.md`；`bojieli/ai-agent-book` `chapter3/mem0`、`memobase`、`contextual-retrieval-for-user-memory`、`agentic-rag-for-user-memory` 各 README 摘要 | ADR-013"memory 定性为可撤销可审计缓存层，不提供编辑/分条管理/导入导出"的窄设计拍板 |

### 桶三：中性（4 条）

| # | 内容摘要 | 来源 | 备注 |
|---|---------|------|------|
| 1 | MCP 三原语 Tools/Resources/Prompts 的只读-可执行分离 | `microsoft/ai-agents-for-beginners` `11-agentic-protocols/README.md` | 术语层佐证 `TOOL-READ-1` 方向，但 MCP 协议本身是 Courtwork 明确不接入对象，无具体实现增量 |
| 2 | 虚拟身份 + 隔离执行环境，数据以共享文件系统路径引用传递 | `bojieli/ai-agent-book` `book/chapter4.md`"虚拟身份与隔离执行环境"节 | 与容器化 ADR（chat-as-dossier）方向邻近，但 Courtwork 已有 MaterialStore/materialRef 式设计覆盖同一原则，未见增量 |
| 3 | 工作流相对自主 Agent 的安全性论证（攻击面限制在单节点内）+ Anthropic"先简单后复杂"选型顺序 | `bojieli/ai-agent-book` `book/chapter1.md`"编排模式：工作流与自主"节 | 对 Courtwork 声明式场景编排（非模型自主规划）的外部趋同验证，非新增量 |
| 4 | 提示注入 3 攻击 × 4 层防御的量化实验（成功率矩阵，执行层校验为确定性兜底） | `bojieli/ai-agent-book` `chapter2/prompt-injection/README.md` | 佐证 fail-closed 分层防御文化的一般性道理，方法论本身是常识性提示注入分层防御，无具体新机制 |
| — | 加密回执（Ed25519+JCS+哈希链）用于事后审计 | `microsoft/ai-agents-for-beginners` `18-securing-ai-agents/README.md` | **低可信度**，页面含可疑第三方包推广与疑似编造引用，仅记录不采信，不计入任何桶的正式条目 |

---

## 四、结论提示（不下"我们该怎样"的结论）

- 两个 repo **不是**"零增量、存档备查"的情形：`bojieli/ai-agent-book` 在 bash 受控 ADR、`TOOL-READ-1`、法律垂类评测集三个方向提供了具体、非通识层面的工程设计细节；`microsoft/ai-agents-for-beginners` 的主要价值集中在多 Agent 编排的反面教材，其余方向基本无料。
- `18-securing-ai-agents` 一课的可信度问题本身值得架构角色知晓：公开教材类仓库存在被后续 PR 注入营销/编造内容的可能性，逐课核实优于整仓采信。
