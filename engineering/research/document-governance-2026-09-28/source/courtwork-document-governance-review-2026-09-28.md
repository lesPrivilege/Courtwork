# Courtwork 文档治理与消费链审阅

审阅日期：2026-09-28  
仓库：`lesPrivilege/Courtwork`  
冻结版本：`d44e0fc5090fa0a2bf9fb22529f82b23181b8620`  
交付性质：只读结构性 review 与待裁决的迁移建议；**不是已采用规范、不是已实施改造，也不是全库逐项清账回执**。

## 如何消费本报告

先读第 1–3 节，确认已复现的入口漂移与结构问题；随后按第 8 节在现有责任文档中裁决和落地。不要把本报告整体加入 Agent 的常驻提示词或默认上下文。报告内“建议”“模板”均未改变现有工程权限、作者分派或产品验收。

本报告关闭条件：每项被采用的建议进入已有 owner 文档和实际修改/验证记录；拒绝项记录理由；后置项进入既有任务并有触发条件。完成后将本报告作为历史 review 保留，而非维护第二份治理规范。

## 1. 结论与覆盖边界

**Courtwork 不缺治理理念，也不缺来源保存。主要问题是：现行状态、现行规范、历史事件、研究输入在若干入口中继续累积，导致新 Agent 仍要替仓库做一次状态重建。下一阶段应让仓库交付“已整理好的当前工作面”，而不是要求更强的模型读懂更长的历史。**

本次读取了根与 engineering 的目录树，并检查了附录所列 34 个文件或文件片段，覆盖主要治理入口、应用/API 导航、设计、研究、执行、发布、迁移、MVP、生态、证据、品牌、站点和评测入口，以及现有 PR 模板与文档链接检查实现。对较长文件，覆盖范围在附录明确标注。

完整递归目录响应发生截断；没有取得可在本地处理的完整 checkout。本次**没有**逐份审读所有历史文档、逐条核验全部外链、复算原始材料哈希、检验全部入向链接或运行仓库检查。也无法由远端 SHA 确認用户本地未提交文件、worktree 与实时作者占用。不得从这份报告推导“全库消费完毕”“没有孤儿文档”“链接全部正常”或“现有原始资料均适合公开”。

因此，下文区分直接观察、结构判断与建议；未检查的历史材料保留 unknown，不代为标记 consumed/closed。

## 2. 已有资产应保留，而不是重新发明

### 2.1 已有责任与来源规则足够作为基底

`AGENTS.md` 已要求检查实际工作区、读取 current，再按任务读取合同与证据；评审意见回写原任务；作者不得将自己的工作称为独立验收。`docs/repository-layout.md` 已规定索引负责导航、原始聊天不作为执行指令、采用内容进入原 owner、历史字节和来源身份保留。`engineering/governance.md` 明确采用手动 loop，而非先开发治理系统。[R01] [R04] [R06]

2026-09-14 的仓库治理裁决明确不引入全局 registry/resolver、通用变更 schema、每个目录的子 AGENTS、新的审批层或强制多模型序列。其采用项是薄 PR 模板及现有 owner 规则。这不是本轮应再次包装成“新规范”的空白。[R08] [R34]

### 2.2 三个可以推广的局部体例

**Attention 研究包**：按 need → next read → stop condition 编排；任务索引连接摘要/裁决、现有 owner、实际实现和精确证据。默认不读 raw。它已经很接近用户要求的新 Agent 接手体验。[R14] [R15]

**Ecosystem / Design Scout**：按本地问题找来源，记录消费者、版本、限制与复查触发器；无消费者的素材只保留短索引，Scout 的节奏是按问题拉取，而非持续推入。此类目录应保留，优化的是寻址与退出，不是取消参考索引。[R26] [R20]

**Superseded handoff / Legacy recall**：旧 brand handoff 顶部明确说明误读、替代项与不要继续派发；legacy index 以完整 SHA + 路径定位历史，并明确 reference not authority。这些都可直接复用为归档体例。[R18] [R27]

## 3. 本次可支持的主要发现

### F1. 导航文字确有现行事实漂移

`app/docs/README.md` 写“当前 Host schema 10”，目标 `app/README.md` 已明确 `schemaVersion 22`；根 AGENTS 同样写 Host22。这里不是历史材料保存问题，而是现行导航复制了一份已失效的动态事实。旧 v9 锚点在目标文档中仍保留，因此**不能把此例误报为断链**。[R10] [R11] [R01]

同一 API 索引将 slash/manual 入口写成尚未实现，但 `commands-and-compaction.md` 的支持表已经说明 `/status`、`/tools`、`/model`、`/effort`、`/compact` 等具体路径；该正文末尾又保留 dispatcher 属未来条件的旧段落。说明改动有时停留在追加，而没有修订现行完整叙述。这里审阅的是文档一致性，没有重新运行这些功能。[R10] [R12]

**处理建议**：索引只写“运行数据与迁移”“命令与压缩支持范围”，把动态版本和支持事实留给目标 owner。现行规范正文在变更时作语义修订；旧措辞移到有日期的历史说明，不能靠“正文上方有新段落”隐式作废。

### F2. current 的实际承载方式接近事件日志

固定版本的 engineering 树显示 `current.md` 为 **312,391 bytes**。所读取入口按时间倒序排列大量运行、交付、接受、退回、push 和派单记录；同一对象的 pending、active、accepted 在不同条目出现。这保留了追溯，但要求接手者自行计算现行状态。[R05]

**处理建议**：保留 `engineering/current.md` 的唯一总体状态职责，不再新增另一状态账。把它改为维护中的当前快照：当前目标、有效基线、开放事项、责任/作者、阻塞与授权边界、下一入口。详细进展留在原任务/证据；旧 current 原文按固定版本保存到历史读取面。历史接受本身不是无用材料，只是不应继续占据默认第一读。

### F3. 方法规范也在承担重复验收日志

`verification.md` 为 **66,039 bytes**。所读取文件在风险—证据选择正文之前放置多轮带日期的验收回执；具体结论又能在 current 和原交付包找到。由此增加三处同步与读者筛选成本。[R07]

**处理建议**：现行验证方法回到顶部并保持完整；具体回执由原 evidence owner 保持，必要的例子用少量精确链接。历史时间线退出默认规范正文，不丢弃其证据身份。

### F4. 部分“索引只导航”仍在实践中复制动态状态

research、execution、release 索引主要按日期累积，夹有当时的“未实施”“待认领”“当前”等描述。Claude 串行包顶端保留 2026-09-24 的 Current continuation，实际 current 已继续记录 9 月 28 日工作。带日期记录不必然错误，但它们位于接手路径时，需要明确是当时快照，而非让读者判断哪一段“current”更 current。[R13] [R21] [R23] [R22]

**处理建议**：主题索引采用“遇到什么问题 → 读哪里 → 找到什么即可停止”；历史包在独立区域链接。索引不手工复制具体版本、已完成数或未经同步的支持状态。活动工作定位回 current/原 owner；索引只维护自己的路由分类。

### F5. 保存状态与消费状态尚未形成一致的入口表达

Context Window 包清楚写着“已归档、待后续研究与裁定”，同时保留具体待核验主题和后续 owner 路径。这是一种合法状态：原始输入已经保存，但仍未形成产品裁决。它也说明“进归档区”不能等同“已消费或已关闭”。不能因为其他文档出现了相关功能，就自动把这份输入的全部主张标成已消费。[R17]

**处理建议**：在材料包入口把“本材料如何读”“哪些问题已处置”“仍欠什么”“何时再取”分开说明。研究完整处理后可以关闭 intake，即使承接它的实施任务仍开放；无人准备承接的参考材料可以休眠，但不能假装形成了一张已授权任务。

### F6. 原始聊天的来源完整性强于公开发布决策的显式表达

被检查的研究包保存或链接原始 API 文本、消息副本、附件与哈希，且认真区分完整返回、缺少搜索记录和未经核验主张。这是资产。但“正确取得且可校验”与“适合进入公共 Git”不是同一个判断；本次未做逐件隐私或授权核验，不声称发生秘密泄漏。[R14] [R16] [R04]

**处理建议**：新增 intake 默认将原始聊天保存在仓外、受控且有备份的来源库；公共仓库保留经消费的摘要、公开外链、裁决与必要的脱敏来源说明。确需提交原文/附件时，单独记录公开范围与实际授权。已有 tracked 原件不在本轮批量删除或改写。

### F7. “链接检查通过”不能作为“材料治理完成”

`check-doc-links.mjs` 检查 Git 跟踪及非忽略新增的 `.md/.html` 本地链接目标；跳过纯锚点，其他链接剥离 fragment 后只检查路径；没有判断引用是否指向现行规范、是否从入口可发现、采纳是否实际回写，也不校验 `.txt/.json` 原始清单里的消费语义。[R33]

Attention 包记录过 9 月 27 日的 1,685 documents / 10,162 local links 检查；这是**此前本地回执**，不是本轮执行结果或固定 SHA 的全库统计。[R14]

**处理建议**：保留现有工具，逐步补稳定可判定的检查；语义消费仍由实际 owner 复核。先报告，再决定哪些适合成为检查失败条件，不做自动“已消费”推断。

### F8. 目录迁移必须识别生成源与不可改写的证据

根英文 README 由 `site/src/readme.mjs` 经 `node site/build.mjs --write-readme` 生成，中文 counterpart 为手写同步；site 的媒体、录制与产品源 SHA 分别固定。brand 也有独立生成与分发资产。不可把这些一概当作临时输出或直接修改生成成品。[R29] [R30]

**处理建议**：全库盘点除了阅读与消费角色，还须登记“手写 / 生成 / 原始冻结 / 分发输入”。治理优先改导航与解释层；必要的生成源修改属于文档生产链，不借机扩展成产品重构。

## 4. 目标结构：现行工作面、可消费参考、历史证据分层

### 4.1 不重新发明顶层分类

保留 `app/`、`docs/`、`engineering/`、`evidence/`、`site/`、`brand/`、`benchmarks/` 的现有责任。`docs/` 与 `app/docs/` 的合同/实现参考边界由现有入口说明，不为名称更整齐做一次全仓迁移。

建议结构增量如下。`archive/` 为候选新增：只有旧 current 等材料确实需要退出原位时再创建；已有历史包不因此必须搬入。

```text
README.md / README.zh-CN.md          产品入口 + 靠前的开发路由
AGENTS.md                           少量驻留约定；不承载整个知识库
docs/repository-layout.md            材料归属、生命周期、公开与归档规则
engineering/
  README.md                         按任务寻址
  current.md                        当前总体快照，非逐次会话日志
  architecture*.md / governance.md   现行责任与方法
  verification.md                   现行风险—证据选择
  research/
    README.md                       问题/主题路由，开放 intake 与历史入口分区
    <existing-topic>/
      README.md                     本包用途、处理状态、下一入口与退出条件
      source-index.md               来源与必要的核验限制（确有需要才拆）
      decisions.md                  本地裁决或指向原 owner 裁决（不重复）
      source/                       仅适合公开且获准提交的原始材料
      explore/                      保留报告、版本与后续更正
  execution/
    README.md                       执行包路由，不复制第二份进度
    <existing-packet>/               合同、派单、回执继续原 owner
      evidence/                     精确证据留原位
  archive/                          可选；逻辑归档优先于物理搬迁
    README.md                       按主题、失效理由与召回问题导航
    status/<dated-snapshot>.md       必要时保存旧 current 的精确历史版本
evidence/                           既有独立证据包，保持身份与入向引用
```

短输入不必创建 README、summary、decision、source-index、manifest 五件套。一个小 README 能说清楚时就放在一起；原件或多个消费者确有独立职责时再拆文件。目录深度随问题和责任展开，不以每次聊天日期增加新的一层语义。

### 4.2 新 Agent 的阅读路线

**第一级：我在哪里，应该从哪里继续。** 根 README 的开发入口和 AGENTS 指向 current；先核对真实 cwd、branch、HEAD、worktree 与实际任务。公开产品叙事不需要搬走，但开发路由不应埋在长篇叙事末尾。

**第二级：我现在处理哪个对象、受什么约束。** current 给原工单和局部目录入口；局部 README 给适用合同、最近实现先例和已知边界。

**第三级：为什么这样做，需要核验哪一条。** 仅在必要时读本地裁决、参考摘要和精确 evidence。

**第四级：原来究竟说了什么。** 只有遇到争议、引用或版本变化，才进入特定原始 turn、附件、源码版本或外链。

停止条件不是“已经读完某个目录”，而是已获得：实际基线、任务范围、责任与在途作者、适用规则、尚欠结果、验证路径。未取得某项时沿对应指针继续；不得用原始会话里的指令填补当前授权。

把长文放进 HTML `<details>` 可以改善人的浏览，但不要把视觉折叠当作 Agent 已经少读了原始文本。需要有明确的分文件入口和按问题读取，而不是把完整档案塞入单个必读文件。

### 4.3 权威按事实归属，而不是一条万能优先级

current 持有总体接续状态；原任务/RD 持有本问题的范围与未完义务；contract 持有相应对象与行为规则；decision 保存作出选择的依据；evidence 持有指定版本下的观察；研究摘要提供候选与解释；raw 证明某段输入曾被取得。

“来源更新”不能自动推翻已采纳规则，“文件更旧”也不能自动使其失效。发现冲突应回到相应 owner 裁决，而不是让 model 简单选择最新日期或最高目录。

## 5. 原始 ChatGPT 输入如何变成可复用资料

### 5.1 存储与公开先分开

建议用两层而不是两个知识库：

```text
仓外受控来源库
  原始会话/API 返回、附件、完整性说明、来源身份、hash
      ↓ 经许可的整理与消费
仓库内研究包
  问题摘要、公开来源坐标、核验范围、处置及正式消费者
```

来源库必须有实际可用的备份和检索方式；不是随手放在某台机器的 Downloads。仓内不写个人绝对路径，使用稳定本地来源 ID 和访问说明。无权限的接手者应能仅凭公开摘要完成正常任务；确需原文时明确报告 source unavailable，不编造内容，也不以相似资料替代。

原始 bytes 保留原样；翻译、脱敏、摘要分别标注为派生件。脱敏派生件记录自己的版本和哈希，并关联原始来源身份；不覆盖原件后仍称“verbatim”。原件一旦已入 Git，后续忽略或删除工作树文件也不构成历史清除；这类处理另行审定，本轮不改写共享历史。

### 5.2 最小消费链

```text
取得来源
→ 说明保存范围与完整性
→ 提炼本仓相关的问题/主张
→ 检查会影响选择的原始外部来源
→ 在既有 owner 范围裁决 adopt / adjust / reject / defer
→ 回写现行合同、方法、既有任务或实现/测试
→ 登记实际去向与剩余问题
→ 关闭本次 intake，或明确仍开放的最小问题
```

不是每个外链都必须立即验证。只要处置诚实，未核验的链接可以保留作线索；准备据其作技术选择、更新能力声明或实际实现时，才验证承重部分。网页助手声称“调研完成”不等于本地已核验，源码机制存在也不等于本地真实路径成立。

### 5.3 外部选型条目的最小体例

在现有主题 README/source-index 中，一条可用参考应回答：它服务什么本地问题；实际 URL 与来源类型是什么；观察日期与 revision/具体路径是什么；支持哪一个机制；本地需要或拒绝的部分是什么；去哪个 owner 找裁决；发生什么变化才重查。

网址不能只在原始 ChatGPT 长文里可见。主题摘要应把影响本地选择的来源提升成显式入口。但不要复制整篇网页到每份研究包；一个精确来源可以被多个问题引用，每个问题保留自己的本地用途。

### 5.4 局部消费表模板（示例，非现有事实）

```markdown
# <Engineering question>

Use: reference. This packet does not define current product behavior.
Intake: partially disposed. Open item: C3.
Current owner: <existing RD/task/contract>.
Read next: <current contract>; open original inputs only for a specific claim.

## Disposition

| Input/question | Ruling and reason | Actual consumer | Remaining work / trigger |
|---|---|---|---|
| C1: proposed invariant | adopt within stated scope | <contract section / exact change> | none for intake; runtime verification is a separate task |
| C2: proposed library | reject; incompatible with the current boundary | <original decision> | reconsider only if that boundary changes |
| C3: unverified mechanism | defer | <existing owner task, or explicitly no active task> | verify when <concrete dependency or user need> arises |

## Source and limits

<Exact source identity, public URL or controlled locator, available revision,
completeness and disclosure limits. Unknown fields remain unknown.>

## Exit

Close this intake after C3 is disposed or explicitly retained as dormant reference.
Closing this intake does not accept a product implementation.
```

处置单位是能形成独立判断的问题，不是每个句子。若原文只是三条线索，一段话足够；不强制生成 claim IDs 或单独的消费 CSV。

### 5.5 本地 Agent 的裁决与实现分开

本地 Agent 可以在已有授权中筛选、修订或拒绝建议；它的判断需要落到原 owner 的可审阅记录。超出当前范围的产品方向变更不能因“已入账”自动生效。作者建议、非作者复核与用户正式接受分别标注。

一项“采用”的真实去向至少应有合同段落、原任务、实现/测试或现成规则中的一种。若只是“建议以后考虑”，应诚实写 defer/reference，而不是 adopted。新增说明已经进入合同，与实现已经通过验收，是两个不同结果。

## 6. 关闭与归档：管理四个不同问题

### 6.1 不用单一 status 代替所有意义

| 问题 | 示例答案 | 不应误解为 |
|---|---|---|
| 这份材料有什么阅读效力？ | 现行规则、参考、历史记录 | 所有 reference 都低价值 |
| 本次输入处理到哪里？ | 未处理、部分处置、已处置 | 已处置意味着采纳或已实现 |
| 承接它的工作是否完成？ | 原任务仍开放 / 已接受 / 后置 | intake 关闭意味着产品门关闭 |
| 内容如何保存与披露？ | 原位冻结、逻辑归档、受控原件、公开派生件 | 移入 archive 意味着消费完成 |

这些不要求全仓每个文件都有 front matter。优先在材料包 README 或原任务的一个小段落表达；图像、日志、附件继承所在包的范围，只有例外才单独登记。

### 6.2 输入什么时候算消费完成

本地相关问题都已有实际处置，并且其采用内容进入正确消费者；拒绝项有足够理由；后置项有责任入口和可识别触发条件，或被明确降为无活动任务的参考。遗漏、不完整、原件不可访问等限制没有被隐去。

**允许不采纳而关闭，允许参考保留而不排进 backlog，允许 intake 关闭但实现继续。** 不允许把“读过”“存过”“被索引到了”直接当作 consumed。

### 6.3 临时计划、施工笔记和中间报告如何退出

先提取仍有效的规则、理由和负例，再把未完义务交回原任务。标出最终结果或替代入口，最后从默认开工路线撤下。确无追溯价值的可重生成草稿，可以按明确范围删除；不能删除唯一的失败反例、采纳依据或未完义务。

中间记录不必全部精加工成长期知识。具有长期意义的少量结论进入规范/先例；原过程留作历史；重复无效输出不无限扩散。维护成本应与实际复用需求相称。

### 6.4 过时规范怎么退出

更新现行正文，使其独立可读，不要求读者拼接多个日期修正。旧决定保留为历史，说明适用时段、被何处替代及为何失效。不要静默改写被引用的历史原件；用独立更正或包入口说明新的解释。

“时效未重查”和“已被取代”不同：浮动网页可能需要重查，固定版本的历史观察依然可以有效地支持当时的结论。不要按文件年龄自动撤销事实。

### 6.5 归档区应是检索目录，而非垃圾桶

归档索引按主题或将来会问的问题组织，日期与 SHA 作为坐标。每条主要归档入口至少说明：为何留下、不能再拿它做什么、现行替代入口、什么问题值得再次打开、来源的实际可达方式。

优先逻辑归档：保留已有目录/字节，撤下默认入口，补历史用途和回跳链接。只有在减少误读和目录拥挤的收益明确时才物理迁移，并先扫描入向链接、manifest、锚点、测试/build 依赖与在途 writer。

证据可以永久留在原执行包，archive 只提供索引。不要为了一个中心 archive 复制所有 evidence；也不要因“已归档”让仍支撑现行合同的有效证据变得难以取得。

## 7. 外部体例如何采用

**Diátaxis** 按使用者需要区分教程、操作指南、技术参考和解释。建议借它修订“已经整理成文”的文档正文和局部目录：查字段的人不应被迫先读开发日志，查原理的人也不应只得到命令清单。不建议机械增设四个顶层目录，更不把它当原始材料生命周期或权限模型。[E01]

**ADR 的轻量做法** 保留背景、决定、状态和后果；被替代决定仍留下，并指向替代者。建议借其写法改进现有 decisions/局部裁决，而不是再开一套平行 ADR 编号与权威体系。[E02]

对 CW，最合适的组合是：以现有 owner 制为基础，用 Attention 的任务路由组织阅读，用 ecosystem 的消费者/重查触发组织参考，用现有 superseded/legacy 体例组织退出；外部方法只补写作体例，不接管工程治理。

## 8. 实施顺序与验收

### 第一批：修正已经有证据的入口漂移

修订 `app/docs/README.md` 的 schema 和 command 标签，消除对易变事实的副本；整理 commands 文档的未来态旧段落。先解决可定位的问题，不用等全库分类完成。

收敛 current 与 verification 前，保存原文件的固定版本、内容哈希与关键入向链接。current 留当前工作快照，verification 留现行方法；详细回执回到既有 owner 包或历史入口。涉及实际作者租约或在途工作时先核对本地，不凭远端旧快照改派。

根 README 的开发入口修改必须同步其 `site/src/readme.mjs` 生成源及中文 counterpart。不得仅改会被下次 build 覆盖的成品。

### 第二批：沿既有规范补退出机制，做三类样板

在 `docs/repository-layout.md` 补材料角色、公开边界和归档方式；在 `engineering/governance.md` 补 intake 关闭、临时记录退出和原 owner 回写。`AGENTS.md` 只需保持指路，不复制这些细则。

试点使用三个实际包：Attention 作为成熟路由样板；Context Window 作为已保存但待处置/休眠样板；已 superseded 的 brand handoff 作为退出样板。只对已核对的问题形成消费状态，不能用统一模板批量将未知材料变成 closed。

随后调整 research/execution/release/design 等目录入口，让当前任务、可复用参考和历史入口分开。原始包是否搬迁逐包裁定；默认不移动哈希绑定的证据。

### 第三批：补全全库盘点与冷启动验证

本地审阅必须补做以下盘点，作为一次性 review 工件，而不是第二个日常治理 registry：

- 从实际 Git 跟踪文件与本轮新增文件取得清单；按用途识别 Markdown、纯文本、JSON/JSONL 清单、HTML 阅读面、图像/媒体/附件、许可证、生成分发资产。不是只按扩展名判断“文档/垃圾”。
- 对每个材料包记录实际用途、owner、现行入口、消费依据、剩余问题、生成/原始身份、公开边界和候选处置。未检查明确 unknown；包级规则覆盖附件，不给每张图制造独立流程。
- 检查引用与路径（含 fragment）、入口可达性、替代链接、当前读路径误入历史、失效绝对路径、manifest/hash 与必要来源可达性。公开 URL 的当期可访问性与固定历史来源身份分开。
- 列出疑似重复状态和孤儿材料，交 owner 复核；“没有普通 Markdown 入链”只是候选信号，不能自动删除，因为脚本、manifest、精确引用也可能消费它。

静态检查沿现有工具增量实现，先报告；只有稳定、无歧义的规则才变成失败条件。语义采纳、权限和真正完成度仍用人工/Agent 复核，不能从相似文字或链接存在性推断。

冷启动测试给一个没有历史会话和个人 memory 的 Agent 一份干净 checkout，以及一个真实的有边界任务。它应仅通过仓库文件：

1. 找到当前工作状态、正确 schema 来源与真实作者边界，不从旧 current 段落重新派发已结束工作。
2. 找到一个目标问题的现行合同、最近实现先例和适用验证方法，不通读整个 research/archive。
3. 对一份原始 ChatGPT 输入指出哪些内容被采用、在哪里生效、哪些被拒绝/后置，以及下一次何时需要它。
4. 在原文不可访问时报告限制，不编造来源，也不把历史指令作为当前授权。
5. 结束工作后，正确更新原 owner 和 current 指针，并使本次输入或临时文档按规则退出。

记录实际打开的文件、错误跳转、错误重开、缺失来源与遗漏的义务。少读本身不是成功；**在不依赖历史记忆的条件下继续了正确的工作**才是成功。本轮没有运行该测试，也不把仓内 Disclosure 的设计合同当作已通过证明。

## 9. 本次报告的明确边界

没有修改仓库、创建 commit/PR、推送、移动档案、删除文件、更新权限或执行 provider。没有重新验收产品功能。全部建议待现有 owner 按实际工作区和授权范围裁决。

完整全库语义盘点仍未完成；本报告提供的是有具体文件依据的结构性审阅、可复用体例与施工边界。后续消费应将结果归回原有文档，不保留另一份长期并行的“本报告状态表”。

## 附录 A：读取覆盖

“完整返回”指连接器返回的正文完整，不表示已逐条重新验证正文中的外部事实、测试结果或所有子链接。长文件的局部覆盖明确保留。

| 文件 | 读取范围 | 本次用途 |
|---|---|---|
| `AGENTS.md` | 完整返回 | 接手入口、责任与历史材料边界 |
| `README.md` | 首份 content 完整；重复字段截断 | 产品入口、开发入口与语言同步 |
| `engineering/README.md` | 完整返回 | 工程导航与职责 |
| `docs/repository-layout.md` | 完整返回 | 材料归属、生成物、研究输入、公开边界 |
| `engineering/current.md` | 入口与近期记录；全文未逐项审阅 | 状态页事件化、当前与历史混读 |
| `engineering/governance.md` | 完整返回 | 手动治理、裁决与收工 |
| `engineering/verification.md` | 开头记录及方法正文相关部分；全文未逐项审阅 | 验证规范与验收记录混排 |
| `engineering/research/repository-governance-2026-09-14/README.md` | 完整返回 | 既有治理裁决及已否决的额外机制 |
| `docs/README.md` | 完整返回 | 技术契约及历史交付分区 |
| `app/docs/README.md` | 完整返回 | schema 与 command 导航文案漂移 |
| `app/README.md` | 运行与 schema 等相关部分；全文未逐项审阅 | schema 22 及兼容锚点 |
| `app/docs/commands-and-compaction.md` | 完整返回 | 现行 command/compact 与末尾旧未来态冲突 |
| `engineering/research/README.md` | 主要入口与相关段落；全文未逐项审阅 | 按日期累积的研究入口 |
| `engineering/research/attention-assistant-20260927/README.md` | 完整返回 | 按需求阅读、停止条件、来源完整性 |
| `engineering/research/attention-assistant-20260927/INDEX.md` | 完整返回 | 任务 → 摘要 → owner → 证据路由 |
| `engineering/research/attention-assistant-20260927/source-index.md` | 完整返回 | 原始会话、外链、核验边界 |
| `engineering/research/context-window-2026-09-11/README.md` | 完整返回 | 已归档但待消费的合法状态 |
| `engineering/research/claude-brand-svg-handoff-2026-09-11/README.md` | 完整返回 | superseded、替代指针与禁止再派发 |
| `engineering/design/README.md` | 完整返回 | 设计 grammar、先例与候选索引 |
| `engineering/design/scout/README.md` | 主要问题索引、消费规则及后续部分；全文未逐项审阅 | 按问题寻址、pull 而非无限积累 |
| `engineering/execution/README.md` | 完整返回 | 执行包入口与日期列表 |
| `engineering/execution/claude-frontend-harness-2026-09-16/README.md` | 入口与主要合同部分；全文未逐项审阅 | dated current、合同、在途与历史状态混合 |
| `engineering/release/README.md` | 完整返回 | 发布历史、派单与当前入口 |
| `engineering/migration/README.md` | 完整返回 | 历史迁移的限定召回 |
| `engineering/mvp/README.md` | 完整返回 | 历史 MVP 范围与后续授权说明 |
| `engineering/ecosystem/README.md` | 完整返回 | 来源卡、消费者、复查触发器与退出 |
| `engineering/ecosystem/legacy-recall-index.md` | 首份 content 完整；重复字段截断 | 固定 SHA 与路径的只读召回 |
| `evidence/README.md` | 首份 content 完整；重复字段截断 | 证据包归属、原始字节与非状态索引 |
| `site/README.md` | 请求第 1–100 行，返回完整正文 | README 生成源、媒体 pins 与构建输入 |
| `brand/README.md` | 请求第 1–90 行，返回完整正文 | 独立品牌包、source/exports/manifest 边界 |
| `benchmarks/README.md` | 请求第 1–100 行，返回完整正文 | 评测设计与实际执行的区分 |
| `tools/README.md` | 完整返回 | 现有文档检查工具 |
| `tools/check-doc-links.mjs` | 完整返回；仅为核对治理检查能力读取此源码 | 只验路径、不验锚点或消费 |
| `.github/pull_request_template.md` | 完整返回 | 现有 owner、证据与 current 指针交接 |

## 附录 B：固定来源

下列仓内链接统一固定到本报告审阅 SHA，不随 main 漂移。文件字节大小来自该版本的 Git tree 元数据；这不是 token 数或整个仓库体量。

[R01]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/AGENTS.md
[R02]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/README.md
[R03]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/README.md
[R04]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/docs/repository-layout.md
[R05]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/current.md
[R06]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/governance.md
[R07]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/verification.md
[R08]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/research/repository-governance-2026-09-14/README.md
[R09]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/docs/README.md
[R10]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/app/docs/README.md
[R11]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/app/README.md
[R12]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/app/docs/commands-and-compaction.md
[R13]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/research/README.md
[R14]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/research/attention-assistant-20260927/README.md
[R15]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/research/attention-assistant-20260927/INDEX.md
[R16]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/research/attention-assistant-20260927/source-index.md
[R17]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/research/context-window-2026-09-11/README.md
[R18]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/research/claude-brand-svg-handoff-2026-09-11/README.md
[R19]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/design/README.md
[R20]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/design/scout/README.md
[R21]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/execution/README.md
[R22]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/execution/claude-frontend-harness-2026-09-16/README.md
[R23]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/release/README.md
[R24]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/migration/README.md
[R25]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/mvp/README.md
[R26]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/ecosystem/README.md
[R27]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/engineering/ecosystem/legacy-recall-index.md
[R28]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/evidence/README.md
[R29]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/site/README.md
[R30]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/brand/README.md
[R31]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/benchmarks/README.md
[R32]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/tools/README.md
[R33]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/tools/check-doc-links.mjs
[R34]: https://github.com/lesPrivilege/Courtwork/blob/d44e0fc5090fa0a2bf9fb22529f82b23181b8620/.github/pull_request_template.md

目录元数据：
- [冻结根目录](https://api.github.com/repos/lesPrivilege/Courtwork/git/trees/d44e0fc5090fa0a2bf9fb22529f82b23181b8620)
- [engineering 目录及文件大小](https://api.github.com/repos/lesPrivilege/Courtwork/git/trees/b77162294a7264a7fd003a6c26a401e8b6924f4b)

[E01]: https://diataxis.fr/
[E02]: https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions

外部方法仅核对以上原始方法文献；本次未声称对所有文档治理生态作穷尽研究。
