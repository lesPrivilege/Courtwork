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
- 本单在 `PM-PACKAGE-RENAME-1` 后消费 `@courtwork/pm`，不再新增 `@courtwork/pm-schemas` consumer。
- `PriorityScore` fixture、排序提案与 PM scenario 继续等待 `PM-SCHEMA-1`；Pages 第一版只能把本样板标为 `schema catalog preview`。

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
- [留给 W6] 真正的生产级装配点落地时，需要把 `findPartyRecord`/`findStatuteCitation`/`findCaseCitation` 的查找结果投影成 `PartyVerifyData`/`CiteCheckData`，参考 `packages/tools/src/party-verify.test.ts`/`cite-check.test.ts` 里的示例投影函数（那两个函数明确标注是"提前演示装配点长什么样"，不是生产代码，不能直接复用，需要在装配点重新以生产代码的标准写一遍，尤其是 `litigationSummary` 从语料的自由文本投影成 `{caseNumber,summary}[]` 结构化数组这一段——示例里用的是"本语料所有涉诉记录都指向同一个案号"这个仅对当前样板案成立的简化，不是通用解析逻辑）。
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
