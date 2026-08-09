# SPEC: packages/demo-data

状态：已完成（当期范围，随 W5.1 落地）

## PM-FIXTURE-1 · 第二垂类权威样板（待 PM rename 后派发）

权威：ADR-012、`docs/product/pm-vertical.md` 与 `docs/design/visualization-kit.md`。本单只建立可校验的
catalog/demo 真值，不创建 PM scenario、prompt 或 live harness。

固定目录：

```text
data/pm/
├── case-bible.md
├── manifest.md
├── materials/
│   ├── 01-prd.md
│   └── 02-feedback.md
└── artifacts/
    ├── prd-review.json
    └── feedback-digest.json
```

- 全部主体、产品与材料显式标注虚构；不使用真实公司、人名、产品指标或线上数据。
- `PrdReview` 固定覆盖六种 defect type，每项含真实存在于 `01-prd.md` 的逐字 clause 与精确 SourceAnchor；初始 status 只允许 `pending`。
- `FeedbackDigest` 至少覆盖两个 cluster、三个 channel 与一个 `out_of_coverage` 条目；每个 item/cluster evidence 都逐字回到 `02-feedback.md`，OOC 的 clusterId/rootCause 保持 null。
- textRange 以 JS UTF-16 string offset 为口径；每枚锚必须满足 `source.slice(start,end) === quote`，并携材料内容 hash 形成 `textLayerVersion`。禁止沿用现有 Legal 旧 fixture 的 `start=0` 占位做法。
- accessor 只读数据；schema、锚点、id 交叉闭合、虚构水印、确定性 hash 与文件全集均有变异可触红测试。
- 本单在 `PM-PACKAGE-RENAME-1` 后只消费 `@courtwork/pm`，不得新增旧 npm 名 consumer。
- `PriorityScore` fixture、排序提案与 PM scenario 继续等待 `PM-SCHEMA-1`；Pages 第一版只能把本样板标为 `schema catalog preview`。

### PM-FIXTURE-1 实现留痕（2026-07-14，待独立验收）

- 按上述冻结目录交付两份虚构材料、两份 schema-constrained artifact、案情册与 manifest；没有 PriorityScore、排序、scenario、prompt、live harness 或 UI。
- `PrdReview` 六类缺陷各一条且均为 `pending`；`FeedbackDigest` 含两个双向闭合 cluster、五个 channel 与一条未归类 OOC。
- 11 条逐字引语全部使用 JS UTF-16 精确区间并绑定材料完整内容 SHA-256；材料在首个锚前含 surrogate 字符，测试会拒绝误用码点偏移。
- `getPmFixture()` 只消费 `@courtwork/pm` 的公开 schema，在模块加载时解析数据并返回递归冻结的单例；访问器不做业务投影、排序或降级。
- TDD 红线先由缺失 `@courtwork/pm` 依赖与 accessor 触发；常驻测试覆盖冻结文件全集、公开 schema、id/cluster 双向闭合、逐字锚、水印、内容 hash 与深层不可变性。门禁结果随本单提交记录，最终放行留给独立验收会话。

## DEMO-ANCHOR-1 · risk-list.json 锚点补真实 textRange 与 textLayerVersion（实现完成，待独立验收）

权威：CONTRACT-TRACE-1 验收派单件裁定四（2026-07-27），就绪图本票行。基线 `main @ 497a288`。

### 改动摘要

- `data/artifacts/risk-list.json`：8 枚 sourceAnchor 中 6 枚补真实 `textRange`（JS UTF-16 string offset，`contractSource.slice(start,end) === quote`）与 `textLayerVersion`（`source-text@1:1250:b936515f`，FNV-1a，与 desktop `CONTRACT_TEXT_LAYER` 同构）。退役旧占位 `{start:0, end:N}`。
- 2 枚指定展品保持无 textLayerVersion、占位 range：risk-02 basis[0]（民法典 496 条）与 risk-06 basis[0]（民法典 497 条），statute 文本结构性不可锚于合同——这是刻意设计的「依据不可定位→待索证」诚实降级展品，output-confirm e2e 的 2 处 nonapplied 修订即由此产生。risk-02 回跳能力由 basis[1] 承担，risk-06 同理。
- risk-01 basis[0] quote 改写（追认为票面必要形态）：原引法条文本，结构性不可锚于合同原文，改为合同中对应条款子句。risk-04 anchor 由含 `**` 标记的合并 span 改为单枚干净第一子句 `设备交付即视为风险转移至乙方`。
- risk-06 basis[1] `本合同未对甲方……` 经核为合同源码原句（demo 源既有设计），登记观察不动。
- anchor count 保持 8，`recordings.ts` 的 `citationStats` 随动：`claims: 8, firstPassResolved: 6, outOfCoverage: 2`。
- `src/risk-list-anchors.test.ts`：去同步账——删 FNV-1a 复制函数与自含谓词反例块（判别力真座位在消费端 resolver，不在数据包自含谓词）；保留本包拥有的结构真值：6 枚 slice===quote/start>0/bounds，2 枚展品具名断言，计数 8，6 risk-id 覆盖，6 枚 textLayerVersion 内部一致，无控制字符。

### 复杂度审视

新增概念：零。改数据值与测试瘦身，无新抽象、新依赖、新持久化格式或新状态机。

### golden 零受影响枚举与证据

本包无 golden snapshot 文件。`risk-list.json` 本身是数据真值而非 golden——它被测试消费而非由测试生成。消费侧 golden（desktop session-event.contract.test.ts 的 `claims: 8`）因 anchor count 不变而不受影响；`firstPassResolved`/`outOfCoverage` 按展品实况随动。

### 追认与展品指定

1. risk-01 quote 改写：statute 文本（《民法典》条文）结构性不可锚于合同原文——citation 字段仍承载法律依据语义，sourceAnchor 改为合同中对应条款子句是唯一合法形态。
2. risk-02 basis[0] 与 risk-06 basis[0] 指定为 non-applied 展品（G2）：statute 文本结构性不可锚，保持无 textLayerVersion 与占位 range，output-confirm 2 处 nonapplied 修订由此产生。展品是展示面资产——显式降级是产品设计而非缺陷。
3. risk-06 basis[1] `本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准` 经核为 `04-设备采购合同.md` 第 905–930 字符处原句，属 demo 源既有设计（合同文本本身包含对缺失条款的陈述），登记为观察，不动。

### 偏离登记

- 票面「恰一枚指定展品（risk-02[0]）」实际为两枚（risk-02[0] + risk-06[0]）。原因：output-confirm e2e 期望 2 处 nonapplied（risk-02 + risk-06），退出判据「该 spec 全绿」要求两枚展品同时存在。单枚展品不满足退出判据。

## DEMO-ANCHOR-2 · 三面产物锚点真实化与样板案降级文案（实现完成，待独立验收）

权威：`LEGAL-ANCHOR-BINDING-1` 验收须处理项①（`apps/desktop/ACCEPTANCE.md`），就绪图本票行，
`DEMO-ANCHOR-1` 先例。基线 `main @ 7469243`。

### 处置选择：全数走甲（真实化），零新增展品

票面给的是「甲：锚点真实化／乙：改显式展品降级文案」二选一，可逐锚点混用。**现读语料的结论是
三面 137 枚锚点全部可锚**——`review-matrix` 70 枚引语本就逐字存在于合同变体；`timeline` 49 枚
有 38 枚逐字命中，`party-graph` 18 枚有 7 枚逐字命中，其余 22 枚的落空原因全是**排版层面**
（markdown 强调标记 `**` 把标签与值切开、表格行带管道、引语写成了带省略号的摘要），语料里都存在
承载同一事实的干净原句。故全部走甲，三面零新增展品。

乙仍然落地，但落在**文案**而非数据上：`DEMO-ANCHOR-1` 刻意保留的两枚 statute 展品
（`risk-02[0]`／`risk-06[0]`）在样板案上仍会显式阻断，而它们此前得到的下一步是
「请重新运行产出它的场景」——样板案是录播回放，没有那次运行可重跑。该文案由 demo 分流自持
一句（见 `apps/desktop/SPEC.md` 同票段），两枚展品即其活消费者。

### 改动摘要（本包）

- `data/artifacts/timeline.json`（49 枚）、`party-graph.json`（18 枚）、`review-matrix.json`（70 枚）：
  逐枚补真实 `textRange`（JS UTF-16 string offset，`source.slice(start,end) === quote`）与
  `textLayerVersion`（`source-text@1:<utf16Length>:<FNV-1a>`，与 desktop `contentVersion` 同构，
  以合同现有版本串实测对齐口径）。退役全部 `{start:0, end:N}` 占位。共 30 份原件形成 30 个文本层。
- 32 枚引语按「原文里承载同一事实的干净原句」改写，逐条见下表。
- `src/artifact-anchors.test.ts`（新增）：本包只看守自己拥有的结构真值——切片等式、`start>0`、
  边界、同一 `fileId` 版本唯一、版本长度位等于语料现读长度、引语非退化、以及**显示安全段**判据。
  不复制 FNV-1a、不复制坐标算法（判别力真座位在消费端 resolver，承 `DEMO-ANCHOR-1`）。
  `fileId` 从产物读出、语料路径由目录扫描解析，卷宗实物名零入本谱（语料墙）。

### 新判据：单行单 `**` 片段（阅读面恰一处高亮）

desktop `ReaderPane` 按行渲染并把 `**强调**` 拆成片段。一枚锚点若跨行或跨 `**` 边界，切片等式
仍可成立，但阅读面上会裂成**多处** `reader-focus-anchor`。故本票立判据：锚点区间必须整段落在
同一行的同一 `**` 片段内（该判据同时蕴含「引语不含 `**`」）。`review-matrix` 原有 10 枚 q4 引语
正是含 `**` 的形态，随本判据改锚到强调段内的时长值。

变异实证：把 `V01/q1` 改成跨 `**` 边界的等值区间（切片等式仍真、消费端 resolver 仍绿 18/18），
本包判据单点转红；同一变异下 e2e 的「恰一处高亮」实测 `Expected: 1 / Received: 2`——判据的
产品含义在真跑里坐实。

### 引语改写逐条（32 枚，全部为「同一事实的干净原句」）

| 面 | 处 | 落空原因 | 改写后 |
|---|---|---|---|
| timeline | evt-04 | 原引语是会议纪要背景段整句，其陈述的日期与该事件（2024-08-12 谈判）不符 | 改锚该段的节标，与同源同据的 evt-13／evt-22 现存形态一致（`case-bible` 对这三条均只声明「背景描述」） |
| timeline | evt-08、evt-33（及 party-graph e-15） | 原引语是表格行的去管道摘写 | 改锚同文件「摘要说明」里对应的整句散文——直接承载该事件描述里的迟延与账户不符事实 |
| timeline | evt-09 | 顺延日期在原文里被 `**` 包住 | 截到强调段之前的干净子句 |
| timeline | evt-14／evt-17／evt-20（及 party-graph e-14） | 抬头行的发货单位被 `**` 包住 | 改锚同文件落款行的同事实干净整句 |
| timeline | evt-40 | 原引语在原文前多一个称谓字 | 截为原文逐字子句 |
| timeline | evt-41／evt-42（及 party-graph e-07[1]／e-08[1]） | 抬头行的保证人标签被 `**` 包住 | 改锚落款行的同事实干净整句 |
| timeline | evt-44 | 案号在该文书里**结构性不存在**（案号只出现在案情册与另两份文书） | 改锚该文书里的受诉法院名——承 `DEMO-ANCHOR-1` risk-01 先例：引语退到原文真有的那段，不为凑事实造引语 |
| party-graph | e-02～e-06、e-07[0] | `**标签**：值` 形态 | 改锚冒号后的值段（多处同值者按所属主体区块选定偏移） |
| party-graph | e-11 | 原引语含省略号，是摘写不是引语 | 改锚原文该整句 |
| review-matrix | 10 行 q4 | 引语含 `**` 标记 | 改锚强调段内的时长值（即该格答案本身） |

### 复杂度审视

本包新增概念：零。数据改值 + 一份结构谱。无新抽象、新依赖、新持久化格式、新状态机。
再锚定用一次性脚本完成，**脚本不入仓**——承 `DEMO-ANCHOR-1`「数据本身即真值，不是由测试生成的
golden」的判断；语料一旦漂移，本包切片等式与消费端 resolver 双侧同时转红，是显式失败不是静默。

### golden 零受影响枚举

本包无 golden snapshot。`risk-list.json` 未触碰（8 枚锚点、6 可定位 + 2 展品全部原样），故
`recordings.ts` 的 `citationStats` 与 desktop `session-event.contract.test.ts` 的 `claims: 8` 不受影响。
三面产物不参与任何 golden 快照，只被 schema 解析与本谱／消费端谱消费。

### 偏离登记

1. **desktop 侧范围扩展**：票面写「循 DEMO-ANCHOR-1」，DEMO-ANCHOR-1 曾登记 desktop 四文件扩展；
   本票同理触及 `apps/desktop/src/demo/legal-interaction.ts`（路由由单份合同扩为整语料目录）、
   `apps/desktop/src/App.tsx`（两处 demo 分流改吃 demo 侧出口，`demoReaderDoc` 随之外提）与两份谱。
   理由：甲路的「fileId 接 demo 路由」在票面内，路由住 desktop。
2. **evt-04 与 evt-44 的引语退让**：两处改写后引语所承载的信息**窄于**事件描述（evt-04 退到节标、
   evt-44 退到法院名，案号不再有引语支撑）。语料里确无更贴的原句，取「引语必须逐字真」优先于
   「引语必须覆盖描述全部要素」。如需覆盖，须改语料本身（另立票）。
3. **新增 e2e 四例**：`apps/desktop/tests/e2e/demo-anchor-2.spec.ts`。PW floor 维持 366 未升档
   （承 `LEGAL-ANCHOR-BINDING-1` 同一处置）。

## 背景

承接 `docs/decisions/ADR-001-package-abi.md`：演示数据从"放在 packages/tools 内"改为独立成包，与消费方 src 完全解耦。本包不属于 `当时的架构工单册` 原始工单编号序列，是 W5 在途期间的架构增量（见 `packages/tools/SPEC.md` 的 W5.1 验收记录）。

**所有权切分（架构拍板）**：`data/**`（语料本体）由用户侧 subagent 产出（commit `8dcac60`，作者 `Courtwork DemoData (subagent)`），本层（W5 会话）只拥有包外壳（`package.json`/`tsconfig.json`/`SPEC.md`）与 `src/**`（读语料的类型化访问器）。两者在同一个 `data/` 目录下并发写入的时间窗口内互不知情——本层最初按"当期先给个最小占位 fixture"的理解写了一版内联 4 条主体 + 3 条法条的 `party-fixtures.ts`/`citation-fixtures.ts`，subagent 同时产出了一套完整得多（22 条主体、67 条法条判例、20 份卷宗文书、10 份合同变体、5 个预生成 artifact）的真实语料。架构侧确认语料是权威数据源后，占位版本已删除，`src/` 按下方"交付清单"重写为读取真实语料的访问器。此事记入验收记录，供以后回看"多会话并发写同一新目录"这类情况的处置参考。

## 职责

演示数据：虚构样板案的语料（`data/`）+ 薄的类型化访问器（`src/`，typed accessors）。访问器**只读数据、不含业务逻辑**（不做核验、不做缓存、不做降级判断、不做"富记录到工具契约字段"的投影——这些要么是 tools 契约层的职责，要么是装配点的职责，见下）。

## src 只认接口，不认数据（硬边界，含一处经确认的例外）

任何消费方**生产 src**（`tools`/`core`/`output`/`ingest` 的非测试代码）不得直接 `import @courtwork/demo-data`，唯一例外是显式的装配点（composition root）。`packages/tools` 的 `party-verify.ts`/`cite-check.ts` 本身从未、也不会 import 本包——demo-fixture 适配器（`createDemoFixturePartyVerifyAdapter`/`createDemoFixtureCiteCheckAdapter`）只声明一个"注入点"（查找函数的类型签名），数据源由外部注入。

**经确认的例外**：`packages/tools` 的**测试文件**（`party-verify.test.ts`/`cite-check.test.ts`）导入本包，作为 `@courtwork/demo-data`（`devDependency`，不是 `dependencies`——生产构建产物不会带上它）来源，写了一组"wired against the real demo-data corpus"集成烟雾测试，证明装配点未来接线时确实只需要一段投影 lambda。这不违反"src 只认接口"——该规则约束的是**生产代码路径**（会打进 dist、会跟着 `@courtwork/tools` 一起被消费方安装的那部分），测试代码不出现在 `dist/` 里，也不是任何人 `import '@courtwork/tools'` 时会拉到的东西。真正的生产级装配点（把本包接入实际运行的 agent）仍然留给 W6 core 的工具注册表装配代码，当前没有，也不假装有。

字段形状上，本包的富记录类型（`PartyCorpusRecord`/`CitationCorpusRecord` 系列）**不** import `@courtwork/tools` 的 `PartyVerifyData`/`CiteCheckData`，也**不**与它们结构对齐（这点与占位版本不同——占位版本字段少，鸭子类型对齐是免费的；真实语料字段远比工具契约丰富，对齐没有意义）。**契约取子集，语料存全集**：富记录到 `PartyVerifyData`/`CiteCheckData` 的投影逻辑属于装配点（见 `packages/tools/src/party-verify.test.ts`/`cite-check.test.ts` 里的 `projectPartyRecord`/`projectStatuteRecord` 作为投影长什么样的示例），不属于本包，也不属于 `packages/tools` 的生产代码。

## 交付清单（当期）

- `party-corpus.ts`：`PartyCorpusRecord`（对齐 `data/registries/party-verify.json` 的 `entries[]` 完整字段：`entityName`/`aliases`/`unifiedSocialCreditCode`/`kind`/`registrationStatus`/`legalRepresentative`/`registeredCapital`/`establishedDate`/`address`/`equityStructure`/`litigationSummary`/`sourceGrade`/`source`/`notes`）+ `findPartyRecord(name)`（按 `entityName` 或任一 `aliases` 精确匹配）+ `listPartyRecords()` + `listPartyOutOfCoverage()`（读取语料自带的 `outOfCoverage` 名单）。
- `citation-corpus.ts`：判别联合 `CitationCorpusRecord = EffectiveStatuteCitation | RepealedStatuteCitation | DemoCaseCitation`（对齐 `data/registries/cite-check.json` 三种条目形状：现行有效法条 / 已失效法条（附 `repealedBy`/`supersededByArticle`）/ 虚构判例（`type: 'judicial_precedent'`））+ `findStatuteCitation(law, article)` + `findCaseCitation(caseNo)` + `listCitationRecords()`。统一附加 `officialTextVerified: boolean` 复核标记位（当前批量 `false`，见下方 TODO）。
- 两个访问器都用 `node:fs.readFileSync` + `import.meta.dirname` 在模块加载时读取 `../data/registries/*.json`，不做懒加载/缓存失效（语料是构建时静态数据，没有热更新需求）。

## 不在当期范围

语料内容本身的已知边界（卷宗为干净 `.md` 文本非扫描件、`SourceAnchor.textRange` 为占位区间未按真实字符偏移校准、S4 无独立产出 artifact 类型等）由 subagent 记录在 `data/manifest.md` 的"五、已知边界"节，权威声明以该文件为准，本 SPEC 不重复。样板案全量扩展（新增场景、新增矛盾点等）如需要，走独立小工单，不在本层范围内顺手做。

## 验收

`pnpm test` 覆盖 `findPartyRecord`/`findStatuteCitation`/`findCaseCitation` 的命中/未命中/别名匹配/空白裁剪路径，语料自带 `outOfCoverage` 名单的可访问性与"名单里的名字确实查不到"互证，`officialTextVerified` 默认值断言。`pnpm lint`/`pnpm -r run build` 通过。`packages/tools` 侧的真实语料集成测试见其 SPEC.md。

## TODO（跨层放入区）

- [挂账，非本层处置] `data/manifest.md`"五、已知边界"已声明：`cite-check.json` 的 67 条法条文本依据训练知识整理，未逐条对照全国人大官网/国家法律法规数据库原文核验（沙箱环境当时无法稳定抓取其 JS 动态渲染页面）。本层用 WebSearch 交叉核对过其中 2 条（民法典第一百四十三条、第五百七十七条，见 `packages/tools/SPEC.md` W5 原始验收记录），不解决全量核验问题。访问器已预留 `officialTextVerified: boolean` 标记位（当前统一 `false`）：未来逐条核验销账时，只需要一个"哪些 id 已核验"的判定源（可以是另一份小 JSON，或未来接入官方接口的结果缓存），改 `withOfficialTextVerified` 这一处，不需要改任何调用方代码。
- [已落地于 demo 绑定层] `packages/demo-runtime/src/composition/demo-assembly.ts` 把 `findPartyRecord` 的富语料投影成 tools 中性 `PartyVerifyData`；`litigationSummary` 自由文本只在该 Legal/demo 装配点转成 `{reference,summary}[]`。真实生产适配器仍须按其正式数据源映射；不得把样板案「全部关联记录共用一个案号」的简化搬入 tools。
- [观察，非缺陷] `party-verify.json` 有 `outOfCoverage` 显式名单，`cite-check.json` 没有对应字段——语料结构上的不对称，如果未来 cite-check 也需要"故意排除以演示覆盖缺口"的引用清单，需要在语料侧（subagent 那一层）新增字段，不是本层能补的。

## 验收记录

- 2026-07-12（S3-MATERIAL-0）：补齐 docs/decisions/ADR-001-package-abi.md 分期中的样板卷宗合成 PDF 欠账。`data/contracts/设备采购合同.pdf` 是由 `scripts/generate-contract-pdf.mjs` 读取权威语料 `main-contract.md` 后，经文书级 HTML 排版与 headless Chromium 打印得到的**可再生生成物**；页内和页脚均显式标注虚构样板案与生成来源。生成器是源，PDF 是产物，执行 `pnpm --filter @courtwork/demo-data generate:contract-pdf` 可重新生成。为避免不同宿主中文字体的 PDF ToUnicode 映射漂移，生成器内嵌 OFL 1.1 授权的 Noto Sans CJK SC 最小字符子集（`assets/`，含许可证）。消费侧验收位于 `packages/reading-view/src/pdf/s3-material.test.ts`，覆盖文本层可提取、七条预登记引语、`quote === slice(start,end)`、页码/`textLayerVersion` 与独立字节数组双跑稳定性。

- 2026-07-09：当期范围完成（第二版，替代同日内已删除、从未提交的占位版本）。`party-corpus.ts`/`citation-corpus.ts`/`index.ts` 交付，15 例测试（party-corpus 8 + citation-corpus 7）全绿，`pnpm lint` 无 error，`pnpm -r run build` 通过。新增 `@types/node` devDependency（读文件需要 `node:fs`/`node:path`/`import.meta.dirname`，`lib` 只到 `ES2023` 没有 DOM，沿用 W1 记录过的坑）。
  - 设计取舍：
    - **记录类型不与工具契约字段对齐，如实反映语料形状**：`PartyCorpusRecord`/`CitationCorpusRecord` 系列字段数量远超 `PartyVerifyData`/`CiteCheckData`，投影责任明确留给装配点（见上方"src 只认接口"节），本包不做任何"削足适履"的裁剪。`CitationCorpusRecord` 用判别联合而不是"一个大接口塞满 optional 字段"表达三种条目形状的差异（现行有效/已失效/虚构判例字段集合本就不同），比单一宽接口更诚实。
    - **`@courtwork/demo-data` 进 `packages/tools` 的 `devDependency`，不进 `dependencies`**：只有 `party-verify.test.ts`/`cite-check.test.ts` 两个测试文件导入它，写"装配点未来长什么样"的集成烟雾测试；生产代码（`party-verify.ts`/`cite-check.ts`/`contract.ts`）零导入。选 devDependency 而不是完全不依赖，是因为"证明真实语料能正确喂给 demo-fixture 适配器"本身有验证价值（尤其是配合下一条：out_of_coverage 测试直接读语料自带的名单，而不是抄一份字符串到测试里——语料改了名单，测试自动跟着变，不会静默过期）。
    - **`officialTextVerified` 的落点**：语料 JSON 本身没有这个字段（`manifest.md` 只是在文字说明里承诺"建议核对"），是访问器加的派生字段，当前对全部法条类条目批量给 `false`。刻意不给判例类条目（`status: 'demo'`）加这个字段——虚构判例没有"官方原文"可核对，加了反而制造一个永远无意义的字段。
  - 跨层动作：已在上方 TODO 区记录"67 条法条待逐条官方核验"挂账工单的现状（不要求本层处理）、装配点投影责任的具体交接点、`cite-check.json` 缺 `outOfCoverage` 字段的语料层观察。

- 2026-07-13（LEGAL-DEMO-RUN·docx 修订孪生）：`data/contracts/设备采购合同.docx` 由 `scripts/generate-contract-docx.mjs` 读取同一权威语料 `main-contract.md` 生成——PDF 是"卷宗里被审的原件"，本 docx 是"修订落笔的 Word 原件"，两者文本同源使 RiskList 锚点引语（出自 PDF 文本层）在 docx 里可精确定位。补的是 S3_RISK_LIST_RESPONSE 注释里如实记录的旧缺口（"主合同只有 markdown 形态，还没有对应 docx"，旧 W4.1 挂账），孪生落地后材料/修订目标/剧本首次同源。生成器零 npm 依赖（手写 OOXML + 系统 zip，与 output/reading-view 同哲学）；部件清单以 output 消费为准（writeCommentsPart 硬性要求 word/_rels/document.xml.rels 存在），Word/WPS 可直接打开；首段水印标注虚构样板案与生成来源。消费侧验收：core `demo:legal` 全链穿越（6 条修订指令 applied + 批注部件成型）与 legal-demo-run.integration.test.ts 常驻门禁。
