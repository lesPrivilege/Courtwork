# Courtwork · Harness / Core / 前后端 PR 施工审查与实现方案

**审查日期：2026-09-10（Asia/Singapore）。冻结版本：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。**

本交付是可供本地agent消费的实现方案与派工包，不是已提交的GitHub PR、已实施的改动或产品接受。本次GitHub PR列表返回空；“PR review”实际覆盖仓库内的PR施工稿、backend-requests、前端工单、roadmap及相关已合流源码。派工必须按实际HEAD重新做差异核对。

## 一、裁定

**保留现有Core与Pi薄接入；先修生命周期/配置/持久化边界，把“资料→来源→检索→候选→人决定→换Session继续”打通，再决定是否扩大异步、多专家和外部执行。**

另一条独立短线是现有NDA真实纵切与G1–G5。它不应等待所有新平台能力完成。架构上的自足节点，应当由真实证据收口，而不是由越来越长的roadmap收口。

本包共 **33张工单：27张主线、6张条件工单**。主线不表示同时开工。全体任务均为proposed；实际领取、施工、独验和合流状态只更新仓库唯一current/派工清单。

## 二、当前底座与不能重复建设的内容

| 层 | 此版本支持到哪里 | 本轮应该做什么 |
|---|---|---|
| Core | 单WorkCoreOwner、私有Python bridge、同一SQLite内的Matter/Candidate/Decision/Artifact与相关领域记录 | 扩来源绑定、受限查询与恢复投影；不新造正式决定数据库 |
| 执行 | Pi AgentSession SDK路径；三个Pi包锁0.85.1 | 固定版本符合性、失败恢复与能力声明；不改成Pi RPC后再称原有实现 |
| Runtime持久化 | schema10；Core4/app5；既有Run/事件/问题/配置/异步与通信记录 | 先验证发布边界、配置roundtrip、增长成本 |
| Async | 已有只读task/handle/cancel/reconcile机制 | 根据真实慢任务补adapter；不能称原生异步或默认用于ES完整输入路径 |
| Thread/消息 | durable interaction Thread与本地邮箱 | 保留communication-only；消息不是调度、运行、交接所有权或接受 |
| Child execution | 有符合性helper，显式非production scheduler | 先用故障矩阵验证接口，不据此开启生产多agent |
| Attention | 同一Core内的状态、事件、receipt、披露和人类动作 | 收排序/分页合同，消费稀疏signal；不另做Spark提醒真源 |
| Review/UI | 已有surface宿主与投影模块、Attention conversation回执处理等 | 新功能延续这些边界，按既有单writer队列消费 |
| 新路线 | ME-01–10、确定性Intake/Spark长期治理仍是规划，不因index完整即已实现 | 本包LG/SP/HC/AT任务逐个建立真实闭环 |
| 产品接受 | current明确真实provider未跑，G1–G5未关闭 | RV26-REL01独立收口；不得以522/522历史记录替代本轮实测 |

依据：[S01、S05、S06、S16–S26，阅读范围见SOURCE-INDEX](SOURCE-INDEX.md)。特别注意：Core的决定事务中，reject/request_evidence同样是正式决定记录并按当前代码推进版本；只有accept产生新的正式Artifact。实施时以真实状态转换为准，不将“只有accept产生Artifact”误写成“其他决定无版本变化”。

原BE-1…40及ME/AM/LG/BG的逐项处置见 [BACKLOG-DISPOSITION.md](BACKLOG-DISPOSITION.md)。后置请求仍保留原单，不自动关闭。

## 三、审查发现：证据等级与优先级

### F01 / P1：CoreClient关闭与启动失败生命周期（已局部复现）

`close()`先无期限等待`call('close')`，后面才设置1秒等待退出的计时器；worker不回包时不会进入该计时器。ready超时只reject，未终止原worker。精确源码副本（Git blob与远端相等）的隔离故障注入复现了两项：关闭观察1502ms仍pending；ready超时后worker仍存活。参见[evidence](evidence/README.md)与[原始JSON](evidence/core-client-lifecycle-result.json)。

另有同一风险族：没有一般请求deadline；stderr累积无界；失败transport的pending清空后仍需明确作废；旧worker事件需generation fencing。后几项是源码分析，未全部独立动态复现。修复为RV26-Q01，不能仅添加Promise.race而不回收child，也不能把未知写结果自动重发。

### F02 / P1：Provider HTTP有效域与持久化有效域不一致（静态确认；完整服务复现待本地）

`service.validateProviderDescriptor`允许model至240、baseUrl至2048；`store.validateDescriptor`用统一`id()`将二者限200。`setProviderConfig`的服务路径可接受catalog model配显式endpoint，随后写入store；store setter并未复验整个descriptor。因而存在“HTTP路径允许并落盘、重启严格读取拒绝”的可达风险。compatible connection路径还会先register SDK再写store，失败可能留下与持久目录不同步的注册。

本轮没有运行完整服务来复现重启失败，不能将其写为实测事故。RV26-Q02必须补200/201边界、完整roundtrip及失败注册清理，作为扩provider之前的门。

### F03 / P1验证项：锁持有进程与最终文件发布分离

`RuntimeStore._persist`在异步write/chmod前检查锁，最终rename由Node进程执行；flock由另一个Python子进程持有。应注入“检查后holder死亡→第二host取得锁并发布→第一host继续rename”的交错。这是高优先静态风险，**尚未动态证明发生覆盖**。

修复不能只在rename前再读一次布尔值：仍有检查/使用窗口。若反例成立，优先让现有持锁进程完成最终受控publish，不另造持久化平台。另须明确rename原子可见性与sync/断电耐久性不同；进程SIGKILL通过不是断电测试通过。RV26-Q03先完成故障判定，再选择最小修复。

### F04 / P2：长生命周期的写放大与全量读取容量

store每次mutation深拷贝全局state并序列化/重写；保留事件增长时，单步成本依赖全部历史。Core `_full_state`也读取完整候选/决定/审计，并扫描request_result后过滤；snapshot/context/wire有明确容量限制。这些限制已经部分诚实写入合同，不是发现数据必然已损坏。

但把后台Spark频繁更新和更长history直接压上去，会放大结构风险。RV26-Q05先测，RV26-HC01先保证小型读取/分页可用；只有测量不达目标才启动RV26-OPT05。不得立刻宣布“必须Rust/必须新数据库”。

### F05 / P1工程门：当前仓库内没有产品全量测试workflow

`.github`树只见Pages workflow；其负责站点构建、部分发布数据/链接检查，未运行`app`完整测试与smoke。这不证明不存在仓库外CI，但说明仓库本身尚不能给新PR提供该保证。RV26-Q04补产品job，Pages deploy仍只在明确发布授权后执行。

### F06 / P2：当前入口与历史段落混排、编号冲突

current最新声明Runtime10/Core4/app5，其他入口仍可见更早版本；current亦含显式保留的历史段落。应修正“当前值”的入口与机器可读索引，不应全局改写历史回执。`backend-requests.md`的BE-40同时指Provider capability和Attention registry排序，必须拆ambiguity并保留来源。AM等旧PR稿的not_started不能覆盖后来实现状态。RV26-00处理。

### F07 / P2维护风险：共享大文件仍是多agent施工冲突中心

仓库树所见app.mjs约249KB、service.mjs约104KB，另有大型runtime/settings view；文件体积本身不是bug。真正的问题是多个功能都要修改同一宿主、生命周期和状态接缝。新增Intake/投影应先写独立纯模块，再由单writer做最小接入；不要并发让数个agent修改service/app，也不要捆绑全仓重构。

**未作声明：** 本次没有完成全仓安全审计、浏览器视觉/读屏验收、物理断电实验、真实provider调用或全量测试复跑。具体读取窗口在SOURCE-INDEX逐项标注。

## 四、实现架构：每种数据只归一个合适的owner

```text
用户显式选择资料范围
        │ 只读、捕获race可见
        ▼
Intake capture + raw blobs             持久原始观察；不是可随意删除的cache
        │
        ├─ rendition / lexical index   可重建派生；按版本与权限过滤
        │
        └─ 显式selected sources绑定 ──► 既有Core source membership + provenance
                                           │
Pi薄Harness ──有界工具/Context manifest───┤
                                           ▼
                                  typed finding / Candidate
                                           │
                                 可信人类决定 + CAS/receipt
                                           ▼
                                  Artifact / obligation state
                                           │
                               Recovery projection / 新Session
                                           │
                  既有Attention上获授权的signal（无resolve权）
```

Runtime事件记录“发生了什么执行”；Core记录“哪些工作状态与决定有效”；compiled context只是一轮模型工作集。Intake作为确切字节的物理保留owner不拥有接受权。一个物理blob可以被不同逻辑来源引用，hash相同不合并它们的法律/业务身份。

### 1. 输入方向与输出方向必须分开

现有ArtifactHistory面向受信Run-recorded outputs。任意用户目录不是一个Run输出，不能为了省事伪造Run/recordIndex把它塞进去。Intake raw/rendition经显式绑定接入Core。Core既有文本source digest仍校验文本；raw PDF hash、rendition hash、Core source version都应分别保存，不换名复用。

### 2. 版本不能被压扁成一个“revision”

应分别保留：原始capture observation；逻辑来源及其内容版本；rendition extractor/config；index generation；Core source-set revision；Matter/contract；policy/grant；Run配置；人类request receipt。UI只显示与当前判断相关的部分，但后台不得丢失。

跨页数据一致性不能只绑定Matter.version：候选新增等操作可能尚未推进该版本。第一版可利用既有涵盖候选的state digest保证一致，承认其成本；若增加read epoch，必须在所有相关事务更新并正式迁移。

### 3. 可删派生与不可丢的唯一观察分离

可以删除后重建：词法index、可由固定输入/处理器重现的rendition、缓存、展示报表。

不应随cache删除：确切捕获字节、已经成为依据的rendition版本、唯一模型观察、待审Candidate、人的Decision、来源/责任关系与unknown效果。**模型finding的“重建”是从保留记录恢复视图，不是重新调用随机模型来赌同一输出。**

### 4. 第一种Spark任务

建议只做“资料包内的缺件检查”。先确定性抽取附件期望/显式目录，然后一次有界Pi Run提出finding。表述是“在capture X的已检范围内未找到Y”，不是“Y不存在”。每条finding必须带support/contra、coverage/unread、版本、producer与不确定性。

优先将它放在独立source-review领域adapter，仍用既有Core Candidate/Decision；不把法律字段写进通用Core ontology，不把另一个角色的memory作为真源。强模型作为对照；便宜模型质量门不过就撤掉cheap层，而不是调低验收标准。

### 5. Context编译

保留现有required metadata fail-closed；不得用截断blocking obligations来保证模型能跑。对source body、历史Artifact、findings提供有界exact read。manifest明确selected/omitted理由及定位器。

`text.length`是UTF-16 code units，不是token。token估计需要另带计量来源与版本；未知context window保持未知。新工具必须满足现有scope与input observer纪律，不能让ES/file run在读了未治理材料后还声称complete输入覆盖。

### 6. Attention接缝

现有`record_signal`是观察，不拥有create/resolve/snooze/accept权。第一版只向已有、已授权对象发signal；无法匹配时生成“待关联建议”，由人使用已有create动作。自动创建/调度/外部执行属于后续新授权合同，不在Spark面板实现中暗渡。

Report建议展示：捕获观察数、复用/失效次数、完成/失败/unknown运行、finding数、人审处理结果。各数字必须指向相应owner的记录；不可把不同粒度相加冒充“完成了多少工作”，不可编造time saved。

## 五、局部选型及消费规则

| 局部 | 本轮建议 | 不采用/重开条件 |
|---|---|---|
| Runtime | 现有Pi0.85.1 AgentSession SDK + conformance fixture | 不改成新loop，不为“能替换”先改RPC/Rust |
| Core | 保留Python/SQLite owner与事务 | 新语言仅在自足节点、profiling和迁移证据后另审 |
| Capture | Node已有filesystem能力 + 专用受控Intake物理保留 | 不把LayerFS/新文件系统作为生产唯一真源；不借ArtifactHistory伪造input记录 |
| PDF rendition | 独立worker内的pypdf6.18.0为新增有界候选；BSD-3-Clause与hash已列 | 不自动OCR；不声称bbox准确；资源/许可/效果门不过则文本基线继续 |
| 检索 | known-ID/literal先可用；可重建SQLite FTS5作词法候选 | CJK/短查询单测；trigram短于3字符走fallback；无需求不加vector/graph |
| Async | 现有AM-B read task handle seam | 只补实测慢任务；非native async，不自动暴露给ES complete Run |
| Expert | 既有profile/extension + 冻结resolved execution | 不先建市场/registry平台、私有memory或代理层层套代理 |
| Frontend | 现有surface host、ui-controls与固定packet | 不为了来源面引入第二前端框架；Control Grammar为语义契约而非统一长相 |
| Provider | truthful capability/auth metadata，真实生成与目录握手分离 | Google OAuth独立准入，不拿API key替代用户Google Auth意图 |
| 第二消费者 | 有真实消费者后只选CLI或MCP只读一个 | 不开放通用Core call、tunnel或写权限 |
| 第二runtime | Codex app-server作为单轴候选 | 不同时做ACP/native TUI/MCP App；Pi保持可退默认 |

仓库局部选型依据是ME的D01–D15与negative index、LG和AM的owner/约束，而不是把所有reference一律安装。pypdf与FTS5是本报告新增的具体小范围建议，非已接受依赖；安装/协议冻结在对应工单内完成。外部依据见SOURCE-INDEX。

## 六、前后端PR收口方式

**合同先行，不等于前端可伪造后端完成。** FE01可以先交fixture/对照状态；FE02/03等必须等待真实producer、读取和action合同可用。

Source/Spark的列表、卡片、展开pane消费同一packet。宿主继续拥有tab/layout/focus/lifecycle；模块不持有第二份Matter状态。未知renderer、producer卸载、旧schema都走read-only fallback。跨Session晚响应按generation拒绝；切面不取消Run或发新命令。

人类决定保持`expected_revision`/base_version及原request identity；丢ACK先查原receipt，再刷新当前投影。前端不能通过pending→绿色、勾选行或tool allow推导accept。

Composer/连接面应区分目录发现、认证方式、可执行模型、已保存配置验证和一次真实生成。TPS只有在计数及时间分母明确时显示；provider输出token/请求总时长不得写成decode TPS。cache/usage missing不可当0，SDK的占位零cost不等于免费。

实际前端队列以RV26-00复核为准；冻结版本current写的是FE-05a→FE-05→ATT-FE-01→CC-I。新增工单是对此队列的依赖补充，不代表另起一个并行UI writer。

## 七、执行顺序与并行写权

```text
RV26-00
 ├─ Q01 bridge ───────────────┐
 ├─ Q02 provider → Q03 publish│
 ├─ Q04 product CI           ├→ HC04 runtime conformance → REL01 已有NDA/G1–G5
 ├─ Q05 capacity → HC01 reads┘
 └─ LG00 fixture/contract
      → LG01A capture → LG01B rendition → LG01C Core binding
      → LG02A search → LG02B tools/context → LG04 delta
      → SP01 finding → HC02 rehydrate → EV01评测
                      ├→ HC03 roles
                      └→ AT02 signals
 AT01 ordering → FE01 packets → FE02 source/Spark / FE03 Attention
 Q02 + HC04 → PV01 capabilities → FE04 composer/usage
```

上图省略部分边，准确依赖以tickets.json为准。例如FE02还需HC01，HC02需SP01+HC01。依赖DAG已做完整性/环检查。

**可并行的是不共享源码的工作：** LG00的合成gold/合同、Q04 CI、Q05性能测量可以在各自树推进。backend/core集成负责人一次只允许一个writer触碰service/store/Core bridge等共享区域。前端维持单writer；独验人在作者提交固定SHA后另树运行，不在作者树改断言。

### 首批建议领取

先领取RV26-00；它冻结当前差异与owner后，领取Q01、Q02、Q04、Q05、LG00。Q01/Q02只在写权不相交的树并行；Q03接Q02，HC04接Q01/Q02。现有真实NDA准备可做材料/步骤，但真实provider运行需明确授权。

**不要首批领取：** 通用scheduler、多agent/DAG、Google OAuth执行、第二runtime、外部写/发信、Runtime数据库替换、Rust/GUI大重构。条件工单的“准入研究”可有界开展，但不能被当成准入已通过。

## 八、统一验收与发布边界

### 每单必须给出的证据

实际base/code SHA、原工单映射、显式改动路径、fixture hash、作者自测、独立复核、red→green反例、迁移/回退、未检项。不得统一写“通过全部检查”而没有命令与原始输出。

### 每条纵切必须跨过的失败面

1. 并发修改与过时依据：source/contract/policy发生变化，旧授权与旧候选不得复活。
2. 崩溃与丢回执：commit与ACK分开验证；原request可查，不自动重放外部效果。
3. 读取与未知：部分页、抽取失败、无权限、搜索预算耗尽均不能被压成“没有”。
4. 连续性：删除Session、换provider/角色、producer缺席、清除派生cache后，正式状态/义务/引用仍可解释。
5. UI：rapid switch、旧响应、读/决定权限不同、键盘/焦点、窄屏与长中文，动作与背后事实一致。

### 评测不是一个SE总分

T（直接重复读取）/S（治理来源+确定性检索）/E（再加Spark）在同题、同权限、相同模型预算下比较。分别报告正确引用、旧版误引、false accept、unknown保真、重建/恢复、模型/人工成本；不以token少证明专业质量好。先用synthetic oracle证明契约，再以获得授权的模型pilot评价生成质量。held-out不反复调参。

### G1–G5继续独立成立

真实provider、专业正确性、全平台GUI、对外发布是不同门。REL01只把已有NDA闭环拉通；公开材料必须绑定真实产品SHA与数据身份，fixture/实录分开。新功能合流不自动部署，也不自动改简历为“已生产使用”。

## 九、交给本地agent的主指令

```text
请将本包作为Courtwork现有roadmap的执行分解，不把所有工单一次性实施。

1. 先执行RV26-00。读取实际AGENTS/current/原PR草案和固定源码，核对HEAD相对
   0c60f4ffe0e4d939712df3910d2404c226e8bfdf的差异。已实现内容标superseded。
2. 为本次领取的一张工单声明worktree、base、精确写权、依赖与禁区；不改共享未提交工作。
3. 先写失败fixture，再实现最小语义单元；新的schema/action先冻结合同和迁移回退。
4. 只跑合成/loopback测试；不读个人凭据或目录，不调用真实模型、不发布。
5. 交付固定SHA、原始命令结果、反例、not_run；由非作者另树验收后才能标verified。
6. 不把reference当accepted依赖，不重复实现AM-B/MA/BG-02，不新增第二Core/Memory/Task真源。
7. 发现依赖未满足或新HEAD已改变owner时，提交具体差异与最小修订，不跨工单扩大施工。
```

## 十、验证限制与交付性质

本审查通过GitHub工具读取代码和文档，但未获得可运行的完整clone；容器网络DNS失败。已验证精确CoreClient副本的两项故障；Node环境为22.16，低于项目最低22.19，故不称支持环境整体验收。完整app tests/smoke、真实Core集成、浏览器、真实provider都由工单明确列为后续本地执行，不虚报完成。

本包未创建GitHub Issue/PR，未修改仓库，未迁移个人数据。源码范围不是全仓逐行审计；详见SOURCE-INDEX及evidence/README。工单、DTO与技术选择都是待本地owner接受的执行建议。

---

## 工单索引

详细步骤、写权、反例、验收与回退在各单文件；机器依赖见[tickets.json](tickets.json)。

| 别名 | 任务 | 依赖 | 准入 |
|---|---|---|---|
| [RV26-00](work-orders/RV26-00.md) | 冻结现状、消除编号与版本漂移、建立唯一派工清单 | — | 主线 |
| [RV26-Q01](work-orders/RV26-Q01.md) | CoreClient有界生命周期与失败后的worker清理 | RV26-00 | 主线 |
| [RV26-Q02](work-orders/RV26-Q02.md) | 统一Provider入站/落盘校验与失败发布顺序 | RV26-00 | 主线 |
| [RV26-Q03](work-orders/RV26-Q03.md) | 验证并封闭Runtime锁丢失后的发布窗口 | RV26-00, RV26-Q02 | 主线 |
| [RV26-Q04](work-orders/RV26-Q04.md) | 建立产品级CI而非仅Pages检查 | RV26-00 | 主线 |
| [RV26-Q05](work-orders/RV26-Q05.md) | 建立长会话写放大与Core读取容量基线 | RV26-00 | 主线 |
| [RV26-LG00](work-orders/RV26-LG00.md) | MatterPack、反例与数据合同冻结 | RV26-00 | 主线 |
| [RV26-LG01A](work-orders/RV26-LG01A.md) | 只读Capture与不可变原始字节 | RV26-LG00, RV26-Q03 | 主线 |
| [RV26-LG01B](work-orders/RV26-LG01B.md) | 有界Rendition：UTF-8文本与文字层PDF | RV26-LG01A | 主线 |
| [RV26-LG01C](work-orders/RV26-LG01C.md) | 原始Capture到现有Core来源的原子绑定 | RV26-LG01B, RV26-Q01, RV26-LG00 | 主线 |
| [RV26-LG02A](work-orders/RV26-LG02A.md) | 可重建、固定Generation的exact/lexical检索 | RV26-LG01C | 主线 |
| [RV26-LG02B](work-orders/RV26-LG02B.md) | 有界资料工具与Context manifest | RV26-LG02A, RV26-Q01 | 主线 |
| [RV26-LG04](work-orders/RV26-LG04.md) | Delta refresh、撤回与独立全量重建等价 | RV26-LG02B | 主线 |
| [RV26-SP01](work-orders/RV26-SP01.md) | 第一种Spark finding：限定资料包内的缺件检查 | RV26-LG04 | 主线 |
| [RV26-HC01](work-orders/RV26-HC01.md) | Core历史读取分页与小型Recovery Projection | RV26-Q05, RV26-Q01 | 主线 |
| [RV26-HC02](work-orders/RV26-HC02.md) | 显式Rehydrate：换Session不等于重放Run | RV26-SP01, RV26-HC01 | 主线 |
| [RV26-HC03](work-orders/RV26-HC03.md) | 两个角色的配置快照与权限交集 | RV26-SP01, RV26-Q02 | 主线 |
| [RV26-HC04](work-orders/RV26-HC04.md) | Pi真实接入面与FakeRuntime符合性矩阵 | RV26-00, RV26-Q01, RV26-Q02 | 主线 |
| [RV26-AT01](work-orders/RV26-AT01.md) | Attention排序与分页合同收口 | RV26-00 | 主线 |
| [RV26-AT02](work-orders/RV26-AT02.md) | Spark到Attention的稀疏Signal与去重 | RV26-SP01, RV26-HC02 | 主线 |
| [RV26-FE01](work-orders/RV26-FE01.md) | 前后端共享Packet fixture与控制语义验收 | RV26-LG00, RV26-AT01 | 主线 |
| [RV26-FE02](work-orders/RV26-FE02.md) | Source Review与Spark面板的最小真实消费 | RV26-FE01, RV26-SP01, RV26-HC01 | 主线 |
| [RV26-FE03](work-orders/RV26-FE03.md) | Attention triage与丢回执恢复消费 | RV26-AT01, RV26-AT02, RV26-FE01 | 主线 |
| [RV26-PV01](work-orders/RV26-PV01.md) | 能力/认证方式/已保存连接验证的真实模型 | RV26-Q02, RV26-HC04 | 主线 |
| [RV26-FE04](work-orders/RV26-FE04.md) | Composer/连接/Usage遥测消费与统一体例 | RV26-PV01, RV26-FE01 | 主线 |
| [RV26-EV01](work-orders/RV26-EV01.md) | 纵切对照与全生命周期证据包 | RV26-LG00, RV26-HC02, RV26-FE02 | 主线 |
| [RV26-REL01](work-orders/RV26-REL01.md) | 现有NDA真实闭环：独立于新平台路线收G1–G5 | RV26-Q01, RV26-Q02, RV26-Q04, RV26-HC04 | 主线 |
| [RV26-OUT01](work-orders/RV26-OUT01.md) | 一个只读外部消费面：先CLI后MCP选择门 | RV26-HC02, RV26-HC04 | 条件 |
| [RV26-OPT01](work-orders/RV26-OPT01.md) | 慢Intake任务消费现有AsyncTasks | RV26-LG01B, RV26-HC04 | 条件 |
| [RV26-OPT02](work-orders/RV26-OPT02.md) | Google Auth路线的固定版本准入与实现 | RV26-PV01, RV26-HC04 | 条件 |
| [RV26-OPT03](work-orders/RV26-OPT03.md) | 第二Runtime：只选Codex app-server一个轴 | RV26-HC04, RV26-HC02 | 条件 |
| [RV26-OPT04](work-orders/RV26-OPT04.md) | 外部副作用与Intent/Receipt恢复 | RV26-AT02, RV26-HC04 | 条件 |
| [RV26-OPT05](work-orders/RV26-OPT05.md) | Runtime持久化Backend替换门 | RV26-Q05, RV26-Q03, RV26-HC04 | 条件 |
