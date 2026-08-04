# SPEC: packages/reading-view（W3.0）

状态：已完成

## AUDIT-SEAL-3 · 包域律守卫铺满（实现完成，待独立验收）

复制 core `FORBIDDEN_LITERALS` 同表，新增 `package-boundary.test.ts`，锁 production source 与 package dependencies 零 vertical/demo import/mention 与垂类字面量；向 `src/index.ts` 植入「风险清单」时守卫确定性变红。零运行代码、依赖、格式、状态机或公共抽象变化；现有 reading-view 行为与 golden 不变。

## 背景

本包不属于 `当时的架构工单册` 原始工单编号序列，是 当时的架构工单册 缺口盘点期间新立的 MVP 补强工单（同批的还有 fetch 工具最小实现、provider 首批适配，三张工单可并行）。定位：office 生态原生文件（docx/md/txt/含文本层 PDF）→ md 阅读视图（模型阅读的"母语"）+ 段落级 `SourceAnchor` 映射（UI 溯源与 core 生成节点共用的一等产物）。OCR（扫描件/无文本层）不在范围内，是 W3/W8 ingest v1 的职责；本包对这类输入只负责准确声明"需要 OCR"，不吐半坏的 md，不静默出空文。

只读、单向：呼应 `docs/decisions/ADR-004-documents-and-files.md` 的"定稿后 docx 永不回 md"，本包同理不做任何反向写入，产出只被模型/UI 消费，不回写原件。

## 职责

四条输入路径 → 统一的 `ReadingViewOutcome` 三态产出（`ok` / `needs_ocr` / `disabled`），外加一个到 `CaseFile` 文件清单条目的投影 helper。

## 核心数据模型

`SourceAnchor`（`@courtwork/schemas`）的语义是"永指原件"：`fileId` 指向用户上传的原始文件，不是本包生成的 md。因此 **`textRange` 的坐标系是"原件的文本层"，不是本包渲染出的 md 文本**——两者因 `#`/`**`/`\|` 等 md 语法标记而不等长，混用会导致回指原文时偏移错位。四种格式的文本层定义：

- **docx**：无固定分页概念（`w:br type="page"` 不保证渲染分页），`page` 留空；文本层 = 按文档序拼接的段落纯文本（不含 md 装饰），`textRange` 相对这个线性化文本层。**必须填 `textLayerVersion`**（转换器语义版本 + 文本层内容哈希的组合）——线性化是派生物，转换器版本一变、遍历逻辑一改，偏移量就可能整体漂移，这正是 `SourceAnchor.textLayerVersion` 字段的立项理由（W1 SPEC 原话："本区间相对哪个 OCR 文本层版本…重跑 OCR 会导致文本层重新分段，旧的 textRange 偏移量随之失配"——本包是 OCR 之外第一个需要这个字段的生产方，语义完全平行）。
- **md/txt**：原件本身就是文本，`textRange` 直接相对用户上传的**原始字节/字符**，不得先归一化换行符/空白再解析——解析必须吃原始字符串，否则偏移量对不上原件。`textLayerVersion` 可不填（原件本身即文本层，无派生漂移风险）。
- **PDF**：`page` 必填，`textRange` 相对该页由 pdfjs-dist 抽出的文本层（页内偏移，不是全文档偏移）。**必须填 `textLayerVersion`**（pdfjs-dist 版本 + 该页文本内容哈希）——升级 pdfjs 可能改变文本抽取顺序/断词，同一份原件的偏移量会漂移。

```ts
interface ReadingViewParagraph {
  index: number;
  markdown: string;      // 渲染给模型/UI 的 md 片段（可含 # / ** / 表格语法）
  anchor: SourceAnchor;  // 指向原件；quote 取自原件真实子串
}
interface ReadingView {
  fileId: string;
  markdown: string;       // 全文拼接，模型阅读的"母语"
  paragraphs: ReadingViewParagraph[];
}
type DisabledReason =
  | 'unsupported_format'    // 扩展名/格式不支持（含 .docm/.dotm 宏使能格式）
  | 'file_too_large'
  | 'zip_bomb_suspected'    // 解压比例/总解压量超配置阈值
  | 'malicious_content'     // DOCTYPE/ENTITY/vbaProject 等危险内容探测到
  | 'corrupt_file'          // zip/xml 解析失败、结构不完整
  | 'fidelity_insufficient'; // 内容可解析但结构本包无法安全转出（如合并单元格表格）
type ReadingViewOutcome =
  | { status: 'ok'; fileId: string; fileName: string; view: ReadingView; pageCount?: number }
  | { status: 'needs_ocr'; fileId: string; fileName: string; detail?: string }
  | { status: 'disabled'; fileId: string; fileName: string; reason: DisabledReason; detail?: string };
```

顶层入口 `convertToReadingView(input, options?)` 只接受内存字节（`Uint8Array` + `fileName`/`fileId`），不接受文件路径——保持包纯净、可测、不假设 Node `fs` 可用（Tauri/浏览器语境同样适用）。**契约上永不 throw**：任何内部异常兜底为 `disabled`（不静默崩溃，呼应 tools 层"失败降级不猜、不裸抛"的纪律）。`detail` 是开发者诊断字符串（日志/调试用），不是面向终端用户的文案——用户可见文案的措辞归 UI/产品（`docs/decisions/ADR-002-schema-workflow.md`"零技术概念暴露给普通用户"），本包只出机器可读的 `reason`/`status`。

## 四条转换路径

**docx**（技术路线：手写复用 `packages/output` 的 OOXML 读取技术——不是导入 output 代码，是用同一技术栈 `fflate`（解压）+ `@xmldom/xmldom`（解析）在本包内独立实现段落遍历器；决策理由见下方"设计取舍"）：

- 按文档序遍历 `word/document.xml` 的 `w:p`/`w:tbl`。
- 标题判定复用 output 已验证的"加粗→标题"启发式（`isBoldRPr` 同款判断），不解析 `w:pStyle` 样式表——与 output 的写入侧判断口径保持一致，为未来"读进来再经 output 改出去"的 round-trip 场景兜底，避免两层对"什么算标题"各判各的。
- 表格**真实转出**：简单网格（无 `gridSpan`/`vMerge` 合并单元格）→ md 表格语法，锚点粒度到行；探测到合并单元格 → **整文件降级**（`fidelity_insufficient`）。硬性纪律：表格要么正确转出、要么整文件降级，**绝不静默丢弃表格内容让模型读到一份"缺付款条款"的合同**（表格常见于合同的付款/交付计划，静默丢内容属于本包硬禁区，不是可协商的降级选项）。
- 不支持列表编号重建（`w:numPr`，中文法律文书惯用行内数字如"第一条"，OOXML 原生编号在这类文档中少见，正文已含足够可读的编号文字）——记入已知边界，不是当期缺口。
- 仅接受 `.docx` 扩展名；`.docm`/`.dotm` 直接判 `unsupported_format`。

**md**：`unified` + `remark-parse` + `remark-gfm`（GFM 扩展是识别 `\|` 表格语法的必要条件，样板案 `03-证据清单.md` 就是真实存在表格的语料）。块级 AST 天然给出标题/段落/列表/表格/代码块边界，`position.start/end.offset` 直接就是精确字符偏移。

**txt**：不做结构化解析，纯空行分块（每块 = 一个 `ReadingViewParagraph`），避免把纯文本里偶然出现的 `#`/`\|` 误判成 md 结构；渲染输出前对每块首字符做 md 特殊字符转义，防止意外长出结构。

**pdf**：`pdfjs-dist` 逐页 `getTextContent()`。全篇所有页均无可提取文本 → `needs_ocr`；只要有一页有文本仍判 `ok`（无文本页的单独提示是 UI 未来可做的细化，不是本包当期粒度）。`jpg`/`png` 直通：扩展名本身即代表天然无文本层，直接短路返回 `needs_ocr`，不进入解析流程。

## 安全基线（呼应 `docs/decisions/ADR-005-data-security.md` MVP 六条中与本包相关的两条，加一条包级延伸）

1. **解压比例上限**：docx 是 zip，`fflate.unzipSync` 会一次性全量解压——必须在调用它之前先只读 zip 中央目录拿到每个 entry 的声明压缩/未压缩大小，比例或总未压缩量超配置阈值（默认 100:1 比例、200MB 总量上限，均可配置）直接判 `zip_bomb_suspected` 降级，绝不对可疑 zip 先跑 `unzipSync` 再补救。
2. **禁 XXE**：解析任何 XML 部件前，先对原始文本做 `<!DOCTYPE`/`<!ENTITY` 字符串级探测（双保险，不单纯信任 `@xmldom/xmldom` 的默认解析行为），命中即判 `malicious_content` 降级。
3. **禁宏**：仅接受 `.docx` 扩展名 + 校验 `[Content_Types].xml` 声明的 content-type 非宏使能类型；zip 内出现 `word/vbaProject.bin` 一律拒绝，不论扩展名怎么写。
4. **文件大小上限**：最先检查（最便宜的检查最先做），默认 50MB，可配置。
5. **超时**：整个转换调用包一层可配置超时（默认 30s），超时判 `disabled`。
6. **进程隔离不在本包职责内**：`docs/decisions/ADR-005-data-security.md` 第①条讲的是 ingest Python 服务的进程级隔离，本包是纯库、被 core 进程内调用，无法自我沙箱化。记入 `packages/core` SPEC 的 TODO（调用不可信文件时是否需要 worker/子进程兜底），不是本包能力缺口。

## CaseFile 对接：自有类型 + 无损投影（`needs_ocr` 已在 schemas 落地，见验收记录）

`CaseFileEntry.documentType` 必填但文书分类是 W8 ingest 分类器的职责，本包不产出、也不该猜。沿用 demo-data/tools 已验证过的先例（"契约取子集，结果存全集，投影责任留给装配点"）：本包只产出自己的 `ReadingViewOutcome`，附一个薄投影 helper `toCaseFileEntryProjection()`，映射 `ok`→`done`、`needs_ocr`→`needs_ocr`、`disabled`→`failed`（**`needs_ocr` 直接对应新枚举值，无损投影，`packages/schemas` 已于本工单同步扩展 `IngestStatusEnum`，见其 SPEC 验收记录**）。`documentType` 字段由调用方（未来的装配点）另行填充，不由本包猜测占位。

## 包结构与依赖

```
packages/reading-view/
  package.json   deps: @courtwork/schemas, fflate, @xmldom/xmldom, pdfjs-dist, unified, remark-parse, remark-gfm
                 devDeps: @types/node, @courtwork/demo-data（仅测试引入，遵循 demo-data SPEC 的测试专用例外）
  src/
    types.ts, convert.ts（按扩展名分发的顶层入口）
    security/{zip-guard,xml-guard,limits,docx-preflight}.ts
    docx/{docx-reader,docx-to-markdown}.ts(+.test.ts)
    markdown/markdown-to-reading-view.ts(+.test.ts)
    text/text-to-reading-view.ts(+.test.ts)
    pdf/pdf-to-reading-view.ts(+.test.ts)
    manifest/to-case-file-entry.ts(+.test.ts)
    test-fixtures/（手工构造的 docx/pdf 二进制 fixture + malformed/ 恶意样本）
```

## 测试与验收策略

- **md/txt 路径**：`@courtwork/demo-data` 的 20 份 dossier + `main-contract.md`，共 21 个真实文件全量跑 golden 快照——这是 deliverable"样板案 20 份 dossier 文书 + 主合同全量跑通"的字面对应；这批文件当前都是 `.md`，天然只对得上 md 路径，docx/pdf 路径没有对应规模的真实语料可用，不是刻意回避。
- **docx 路径**：语料**有**一份 docx 二进制——`packages/demo-data/data/contracts/设备采购合同.docx`（READING-SDT-1R 核实登记，此前本行写「语料目前没有 docx 二进制」已不成立）。但它是由 `main-contract.md` 派生的**生成器产物，不是真实 Word 导出**：实测部件只有 `[Content_Types].xml`/`_rels/.rels`/`word/document.xml`/`word/_rels/document.xml.rels`，body 标签计数为 `w:p` 42、`w:r` 42、`w:t` 42，**无 `w:tbl`、无 `w:sectPr`、无 `w:sdt`、无任何外部命名空间**。因此它对表格、分节、内容控件的真实频次零证据力，凡涉这些结构的判断仍属无语料状态。其余继续手工构造小体量 fixture：至少一份从 `main-contract.md` 内容派生、真实带 `w:tbl` 付款条款表的 fixture（比 md 原文的行内编号写法更贴近真实 Word 合同的常见写法，用于验证表格转出）；加合并单元格、DOCTYPE 注入、zip 炸弹形态、`.docm` 扩展名等降级触发样本。
- **pdf 路径**：含文本层干净样本（判 `ok`）、图片型无文本层样本（判 `needs_ocr`）、截断/损坏样本（判 `disabled`）。
- 降级路径测试覆盖数量超过 deliverable 要求的"一个"下限——按安全基线类（zip 炸弹/XXE/宏）与保真度类（合并单元格）分别覆盖，不是凑数。

## 已知边界（记录，非当期缺口）

- 表格锚点粒度到行，不到单元格。
- docx 列表编号（`w:numPr`）不重建。
- PDF 页内文本层顺序取 pdfjs-dist 默认抽取顺序，不做跨列/跨栏重排——复杂版式 PDF 可能行序错乱，属于"最小可用"的已知代价。
- **PDF 每页整体作为一个 `ReadingViewParagraph`**，不在页内再切分段落——真正的段内分段需要基于文本项坐标做版面分析，超出"最小可用"范围；锚点粒度因此是页级而非页内段落级，`page` 字段保证了这级粒度仍然精确可溯源。

## READING-SDT-1 · 块级白名单 fail-closed（2026-08-04，首轮独立验收 **REJECT**，返修见下方 1R 节）

票面：就绪图「2026-08-04 审计双确认批」同名行（两条独立审计维度同址命中）。基线 `main@8f4e937`，分支 `claude/reading-sdt-1`。

**裁定痕（票面二选一取乙路：白名单外整文件降级并具名标签）**：甲路（递归收编）对 `w:tc` 内嵌套表结构性无解——`DocxBlock` 闭集无嵌套表形、md 无嵌套表语法，收编须扩块形与锚点粒度，正是合并单元格先例已裁过的局面；且按标签逐个递归对其余未知标签仍 fail-open，过不了合成标签反例。乙路零新类型、复用既有 `fidelity_insufficient` 闭集与既有降级出口。~~fail-closed 由构造成立~~——**此句是首轮的未证宣称，1R 判定作废**：四道块级直子过滤器当时只闭了两道（body 与 `w:tc`），`w:tbl→w:tr`、`w:tr→w:tc` 仍是「不认识就跳过」，且全部判据只比 `localName` 不比命名空间；「由构造成立」只在被检查的那两道上成立，对未检查的两道是空话。实测拒因与闭合表见下方 1R 节。**升格路径具名**：`w:sdt`（内容控件/自动目录/封面）真实合同中在场，仓内**无真实 Word 导出语料**可测频次（唯一在册 docx 是生成器产物，body 只有 `w:p/w:r/w:t`，见本 SPEC 语料节）；以真实频次立据后另票把 `sdt` 从拒绝升为透明展开（白名单一行之移，锚点坐标中性已论证）。

**实现**：`docx-reader.ts` 两张良性名单（body：`sectPr`/`bookmarkStart|End`/`proofErr`/`commentRangeStart|End`；cell：`tcPr` ＋同前五）＋ `unsupportedBlock(tag)`（detail 具名标签）；`readCellText` 外提携 cell 名单；名单外含未知标签一律 throw，经 `docx-to-markdown` 既有 `DocxReadError`→`disabled` 出口落 `fidelity_insufficient`。**`sectPr` 必须在名单**——真实 docx body 必有而仓内 fixture 全无，漏之即真文件全降级而测试全绿（fixture 盲区，正向名单守卫因此非可选）。converter 与 desktop 零改动。

**本单新增了什么概念、为何非加不可**：两张字面量名单＋一枚错误构造函数。名单是 fail-closed 的定义载体（「不认识就跳过」判例的反面），非加不可；未加块形、未动 `DisabledReason` 闭集与锚点契约。

**红绿证**：fixture 建造器扩 `{type:'raw';xml}` 一形；四枚 born-red 基线实跑四红（sdt 包段落／sdt 包表格／`w:tc` 内嵌套表／合成未知标签 `zzUnknownBlock`），良性名单正向守卫先行即绿；实现后包内 **146/146**。变异：名单收编 `'sdt'` → 恰两枚 sdt 测试红、合成标签反例保持绿——区分力在名单不在断言（循「不为撤断言形变异」判例），复原零残留。

**顺手观察（未处置，desktop 面）**：`outcome-copy.ts` 对 `fidelity_insufficient` 的文案「请简化表格后重试」对内容控件场景失准；其 switch 带 `default:` 使新 reason 无编译面拦截。两项登记不动。

**退出证据（实现会话自测，不代表验收）**：包内 146/146；分支尾 `10e6451` 全量门实测（2026-08-04，机器独占串行）：`pnpm -r build` 0、`pnpm lint` 0、root **1787/1787**（基线 1782＋本批 5 枚）、desktop **690/690**、隔离端口 Playwright **352/352**，全 exit 0。基线为 `main@8f4e937`；其后 main 已前进至 `4ab5671`（审计批首三票合入），本批触碰面与该三票零重叠，验收可按需在合并态复跑。

## READING-SDT-1R · 四道直子过滤器全闭 + 命名空间判据（2026-08-04，返修完成待复验）

**拒因（独立验收）**：首轮只闭了 4 道块级直子过滤器中的 2 道。`walkBody` 与 `tableHasMergedCells` 里的 `children(tbl,'tr')`、`children(tr,'tc')` 仍是「不认识就跳过」——行或单元格被 `w:sdt`（重复节内容控件，付款表常见）、`w:customXml` 包住时整行文本静默消失，且 `status` 仍报 `ok`。**最严重的一枚是 P10/P11 成对**：合并单元格在裸 `w:tr` 下正确降级，同一个合并单元格把行包进一层 `w:sdt` 就变成 `ok` + 内容全丢——本包唯一的保真出口被一层包装绕过。另按协调裁定并入同族的 P3：良性名单只比 `localName`，外部命名空间借名（`<zz:sectPr xmlns:zz="urn:x">`）携正文时被当作自己人跳过，`md` 直接空。

**四道过滤器闭合表**（全部判据均要求 `namespaceURI === W`）：

| 层级 | 内容名单 | 良性名单 | 首轮状态 | 1R 状态 |
| --- | --- | --- | --- | --- |
| `w:body` 直子 | `p`、`tbl` | `sectPr` ＋ 五枚 range markup | 已闭（仅 localName） | 补命名空间判据 |
| `w:tbl` 直子 | `tr` | `tblPr`、`tblGrid` | **fail-open** | 闭合 |
| `w:tr` 直子 | `tc` | `trPr` | **fail-open** | 闭合 |
| `w:tc` 直子 | `p` | `tcPr` ＋ 五枚 range markup | 已闭（仅 localName） | 补命名空间判据 |

**实现**：四级名单收进一张 `LevelGate` 表，`gatedChildren(parent, gate)` 是唯一门禁——非元素跳过；元素必须同时满足「W 命名空间」与「名字在内容或良性名单」，两条缺一即 `unsupportedBlock` 具名降级。`readTable` 取代首轮的「采集一遍 + `tableHasMergedCells` 再按名扫一遍」：行、单元格与合并探测读**同一份已过门的元素**，包装形在 tbl 直子门禁上即被拒，早于合并探测（P10/P11 的结构性根治，不是加一条并列判断）。`children()` 同步只认 W。报错块名对 W 节点用规范前缀 `w:`，对外部命名空间原样带出文档限定名（`zz:sectPr`），不冒充 W 节点。`DisabledReason` 闭集、`DocxBlock` 闭集、锚点契约、converter 与 desktop 全部零改动；未加第二层 OOXML 抽象。命名空间两级判据的写法对齐 `packages/output` 已放行的 `paragraphSupportsRebuild`（`0c94b94`）。

**红绿证**：11 枚新反例，**10 枚在首轮 tip `c9c5f28` 上实测born-red（10 failed / 12 passed）**，红形不是「没抛错」而是逐条量到静默丢内容——

| 反例 | 首轮实测 | 1R |
| --- | --- | --- |
| P1 `w:tbl>w:sdt>w:tr` | `ok` ＋ `md=""`（整行 预付款/1,140,000元 消失） | 降级具名 `w:sdt` |
| P2 `w:tr>w:sdt>w:tc` | `ok` ＋ `md="\|  \|\n\|  \|"`（退化成空表） | 降级具名 `w:sdt` |
| P9 `w:tbl>w:customXml>w:tr` | `ok` ＋ `md=""` | 降级具名 `w:customXml` |
| **P10/P11 成对** | 裸行 `disabled`；同一合并单元格包进 `w:sdt` → `ok` ＋ `md=""` | 两形皆降级，包装形 detail 具名 `w:sdt`（证明拒在 tbl 门禁而非合并探测） |
| P3 `<zz:sectPr>` 携正文 | `ok` ＋ `md=""`（保密义务条款消失） | 降级具名 `zz:sectPr`，并断言 detail 不含 `w:sectPr` |
| P4 `<zz:p>` | `ok`，被误判为 `w:p` 正常出块 | 落 body 门禁降级具名 `zz:p` |
| tbl 级 `<zz:tr>` | `ok`，外部行被当 W 行采集 | 降级具名 `zz:tr` |
| tr 级 `<zz:tc>` | `ok`，外部格被当 W 格采集 | 降级具名 `zz:tc` |
| tc 级 `<zz:tcPr>` 携正文 | `ok`，「藏在外部节点里的正文」消失 | 降级具名 `zz:tcPr` |
| `w:tcPr` 内 `<zz:gridSpan>` | `disabled`（误判合并，**过度降级**） | `ok` ＋ 内容零损（详见下方登记③） |
| 正向守卫 `tblPr`/`tblGrid`/`trPr` | 先行即绿 | 保持绿（真实 docx 必有而 fixture 全无的盲区，同首轮 `sectPr` 先例） |

**变异（逐枚命中校验，复原后与变异前逐字节同 SHA，零残留）**：①tbl 良性名单收编 `'sdt'` → 恰 **2 红**（P1、P10/P11 成对），而 `zzUnknownBlock`、P2、P9 全绿——区分力锁在 tbl 那一级名单，不在断言；②`gatedChildren` 撤命名空间判据 → 恰 **5 红**（P3/P4/`zz:tr`/`zz:tc`/`zz:tcPr`），结构族全绿——命名空间轴独立可测；③`children()` 退回只比 localName → 恰 **1 红**（`w:tcPr` 内 `zz:gridSpan`）。变异③的红面之窄本身是结论：四道门禁已把 `children()` 的命名空间感知在所有受门层级上**吸收**，它唯一独立可观测的面是属性层（`w:tcPr`/`w:rPr` 内部），故该面专配了一枚反例，否则这处改动将无红证。

**已知观察（登记，本单不修）**：

1. `isBoldParagraph` 只看段落**直子** `w:r`——加粗若写在行内 `w:sdt`/`w:hyperlink` 里就照不到，影响 heading 判定（该段落不加 `##`），**不丢内容**。行内层不在本单块级门禁面内。
2. `textOf` 仍按 `localName === 't'` 收文本，会一并收进非 W 命名空间的 `t`——**增字非丢字**，与「不静默丢内容」不冲突，故不动。
3. **本单唯一放宽方向的行为变化**：`children()` 转 W 感知后，`w:tcPr` 内的 `zz:gridSpan`/`zz:vMerge`、`w:rPr` 内的 `zz:b` 不再被当作 W 标记。后果是原先「误判为合并 → 整文件降级」的过度降级消失，表格正常转出且内容零损。理据：W 语义下合并只由 `w:gridSpan`/`w:vMerge` 表达，外部命名空间元素是生产方扩展数据（Word 自身按 MCE 忽略）。属性层不在本单四道门禁面内，未加第五道门。此变化已由专门反例锁住（即变异③的唯一红），**如实标出供复验裁断**。
4. **[需架构拍板]** tbl/tr 两级良性名单按票面只收 `{tblPr, tblGrid}` / `{trPr}`。但 OOXML schema 里 `EG_RangeMarkupElements`（`bookmarkStart|End`、`commentRangeStart|End`、`proofErr`）在 `w:tbl`、`w:tr` 直子位置同样合法，且都是零正文承载的空元素。当前一律降级——**保守但不丢内容**，方向安全；代价是带书签/批注区间的真实表格文档会整文件降级。是否比照 body/cell 两级把这五枚也收进 tbl/tr 良性名单，请复验裁定；本单按票面不动。

**退出证据（实现会话自测，不代表验收）**：包内 **157/157**（首轮基线 146 ＋ 本批 11 枚）；`pnpm --filter @courtwork/reading-view build`（`tsc`）exit 0；`eslint packages/reading-view/src` exit 0。按票面，全量门归验收二相，本会话未跑。触碰面：`docx-reader.ts`、`docx-to-markdown.test.ts`、本 SPEC 三个文件，无第四个。

## READING-SDT-1R · 独立验收裁决（2026-08-04，**PASS**，含一处 fix-by-acceptance）

完整验收报告见本包 `ACCEPTANCE.md` 同名节。以下只留后续实现会话必须知道的结论。

**放行**：首轮拒因（四道块级直子过滤器只闭两道）在 1R 已结构性根治。验收自跑复现：生产面逐字节回退 `c9c5f28` 后 **10 failed / 12 passed**，红形逐条量到静默丢内容（P1/P9/P11/P3 为 `ok` ＋ `md=""`，P2 退化空表，`zz:tcPr` 吞正文）；三轴变异实测 **2 / 5 / 1**，枚名与回执逐字相符。`readTable` 的「行、格、合并探测读同一份已过门元素、无第二遍按名扫描」经源码核实成立——`children()` 余下两个消费者（`isBoldParagraph`／`hasMergeMark`）都只在已过门元素**内部**做属性查找，不再自行遍历块级直子。

**裁断①（接受）**：`w:tcPr` 内 `zz:gridSpan` 不再误判为合并。元素身份由「命名空间 ＋ 局部名」共同决定，Word 按 MCE 忽略未知命名空间元素，该单元格在 Word 里本就不合并；此改动消灭的是假阳性过度降级，不引入内容丢失方向的风险。**无需后续动作。**

**裁断②（补齐，验收自修）**：tbl/tr 两级良性名单补 `RANGE_MARKUP`，tr 级另补 `tblPrEx`。依据 ECMA-376 Part 1 wml.xsd——`CT_Tbl` 序列以 `EG_RangeMarkupElements*` 起头，`CT_Tbl`／`CT_Row` 的行内容组均含 `EG_RunLevelElts`（其中即含 range markup），故这五枚在 tbl/tr 直子位置合法且 Word 常发（跨行书签、表格批注区间）；`tblPrEx` 是 `CT_Row` 明文直子，与已在名单的 `trPr` 同类。不补的后果不是丢内容，而是**带书签／批注区间的真实表格合同被整文件拒读**——这类文件在本票之前读得出来，1R 把正确案例变成了拒绝，属本票引入的真实回归。

**良性名单收编原则（今后照此判，别再逐枚拍脑袋）**：三条同时满足才进名单——(1) ECMA-376 上是该父元素的合法直子；(2) 零正文承载；(3) 同一元素已在别的层级被判为良性。任一不满足留给架构。据此 `w:permStart`／`w:permEnd`／`w:ins`／`w:del`／`w:altChunk` 一概不收（第 (3) 条不满足，属 `EG_RunLevelElts` 整组另议）。

**放宽只及良性面**：专设「放宽守卫」反例，在 tbl／tr 直子同时放 range markup 与 `w:sdt`／`w:customXml`，断言仍整文件降级且 detail 具名包装形而非书签——良性面放宽不得渗进内容面。验收自修的红绿证：4 枚新反例改前全红改后全绿；两枚新变异（撤 `TBL_GATE` 的 `RANGE_MARKUP` → 恰 2 红；撤 `TR_GATE` 的 `tblPrEx` → 恰 1 红）。既有变异①在补齐后由 2 红变 3 红，多的一枚正是新增守卫，**是加钉不是稀释**。

**登记（不修，转后继票）**：

1. **多 `w:body` 静默丢内容**：`docx-reader.ts` 里取 body 用 `doc.getElementsByTagNameNS(W,'body')[0]`，是**全树搜索取首枚**而非取 `w:document` 直子。实测两个同级 `w:body` 时第二个 body 的全部正文静默消失且 `status:'ok'`、`md=""`。该行两次提交均未触碰、属本票之前既有面，票面范围是直子过滤器而非 body 选取，故不阻断本票——**但这是本轮专项再攻唯一找到的仍在场的同禁区形态**，建议单开一票：取直子 ＋ 多 body 显式落 `corrupt_file`。
2. `w:permStart`／`w:permEnd`／`w:ins`／`w:del`／`w:altChunk` 于 body 直子合法但不在名单，触发整文件降级（方向安全）。需架构就 `EG_RunLevelElts` 整组定调。
3. 良性属性容器（`w:tcPr`／`w:sectPr`／`w:tblGrid`）内部不过门，往里塞正文读不到；但这些容器在 schema 上不容纳 `w:p`／`w:tr`，Word 亦不渲染，故不是「Word 看得见而模型看不见」的保真缺口。不修。
4. `mc:AlternateContent` 出现在 `w:p` 内时 `Choice` 与 `Fallback` 文本被一并收进（实测 `"甲版乙版"`）——**增字非丢字**，与 1R 登记 2 同族。body 级同结构走门禁降级，无泄漏。
5. 只含图片（`w:drawing`）无文本的 `w:p` 被静默丢弃（`textOf` 为空即 `continue`）。`DocxBlock` 闭集无图片形，属既有「最小可用」代价，本票未改变其行为。
6. 1R 变异③覆盖注记：其「唯一独立面是属性层」论证成立，但该面有两个子情形（`w:tcPr` 内 `zz:gridSpan`、`w:rPr` 内 `zz:b`），只配了前者反例。验收实测后者亦为活的区分点（变异③下 `<zz:r><zz:rPr><zz:b/>` 伪造出 `## ` 标题，1R 下不会）——只影响 heading 判定、不丢内容，记为覆盖注记。

**验收自跑全量门（唯一有约束力的一组数字）**：worktree `.claude/worktrees/accept-rsdt-2`，base `main@8f4e937`，机器 PW/cargo 零进程时串行跑。`pnpm -r build` exit 0；`pnpm lint` exit 0；root **1802/1802**（167 files；＝基线 1782 ＋ 首轮 5 ＋ 1R 11 ＋ 验收自修 4，算术自洽）；desktop **690/690**（75 files）；隔离端口 `test:e2e` 全链（含链上全部守卫脚本）Playwright **352/352**，exit 0。包内 **161/161**。`c9c5f28` 登记的首轮数字（root 1787 等）出自已崩溃会话，按「跑腿的数字须自己复测」判例作暂记，以本组为准。

## TODO（跨层放入区）

- [已在本工单一并落地，非遗留 TODO] `packages/schemas` 的 `IngestStatusEnum` 增补 `needs_ocr`——架构当场拍板通过，见其 SPEC 验收记录；`packages/registry` 的 `S1.yaml` `trigger.fileTypes` 同步补 `docx`/`md`/`txt`——见其 SPEC 验收记录；根 `CLAUDE.md` 架构图补本包一行。三项均已完成，此处只做索引，不是待办。
- [观察，暂不行动] `packages/output` 与本包如今各自手解 OOXML（一写一读），**暂不抽公共底层包**（过早抽象，架构已确认）——若第三个消费方出现，或两包围绕 OOXML 的重复度显著增长，届时提案 `packages/ooxml` 归拢。
- [nice-to-have，非阻塞] `packages/demo-data` 的 `data/dossier/*.md`、`data/contracts/main-contract.md` 目前没有类型化的"原始文件清单/读取"访问器（现有访问器只覆盖 `party-corpus`/`citation-corpus` 两个结构化注册表）。本包 golden 测试靠解析已安装的 `@courtwork/demo-data` 包路径推导 `data/` 目录位置读取原始文件，可工作但耦合了 demo-data 当前的目录结构约定。未来 demo-data 可补一个轻量访问器（如 `listDossierFiles()`/`readDossierFile(fileId)`）替代这层路径推导。
- [留给 W6] `packages/core` 的工具/装配点接入本包时，需要把 `ReadingViewOutcome` 投影进 S1 场景执行器实际消费的形态（`documentType` 由分类器或占位填充），并决定是否需要对不可信文件调用加 worker/子进程级隔离（见上方安全基线第 6 条）。

## 验收记录

- 2026-07-10：W3.0 完成。TDD 交付类型模型（`types.ts`）、安全基线（`limits.ts`/`zip-guard.ts`/`xml-guard.ts`）、四条转换路径（txt 空行分块、md remark+remark-gfm、docx 手写 fflate+xmldom、pdf pdfjs-dist）、`textLayerVersion` 计算工具、CaseFile 无损投影、测试 fixture 构造器（docx/pdf 各一套，均为手工拼装、无外部库依赖）。`pnpm test` 全仓 619 例全绿（本包 136 例：types 3 + limits 3 + zip-guard 7 + xml-guard 8 + text-layer-version 4 + text-to-reading-view 15 + markdown-to-reading-view 4 + docx-reader 10 + docx-to-markdown 6 + pdf-to-reading-view 4 + convert 10 + to-case-file-entry 4 + malformed-inputs 12 + golden 43 + index 3），`pnpm lint` 无 error，`pnpm -r run build`（9/10 workspace 包，含本包与 `apps/desktop`）全部通过。全部在移除全部 workspace 包 `node_modules` 后的干净环境重新 `pnpm install` 复核过（`pnpm test`/`pnpm lint`/`pnpm -r run build` 结果与增量安装时一致）。
  - 关键设计取舍：
    - **docx/PDF 的 `textLayerVersion` 强制填写，md/txt 不填**：架构会话在设计评审时指出 docx 线性化文本层与 PDF 页文本层都是转换器派生物，版本一变偏移量就可能整体漂移——这正是 W1 `SourceAnchor.textLayerVersion` 字段的立项理由，本包是它的第一个生产方。`computeTextLayerVersion(namespace, text)` = 转换器语义版本 + 文本层内容短哈希（原设计 sha256 前 16 位；**F-1 追认改为 FNV-1a 双 32-bit 级联的 16 位十六进制**，见下方 2026-07-10 F-1 追认留痕，语义不变、仍仅作漂移检测），docx 按整文件计算一次、全部段落共享；PDF 按页计算，各页独立。
    - **docx 表格"要么正确转出、要么整文件降级"是硬性纪律，不是可协商的 MVP 简化**：架构会话明确指出合同付款计划表极常见，静默丢表格内容会让模型读到一份"没有付款条款"的合同。简单网格（无 `gridSpan`/`vMerge`）转出为 md 表格；探测到合并单元格则整文件判 `disabled/fidelity_insufficient`，绝不局部跳过表格保留其余内容。
    - **md 路径的 `markdown` 字段就是原文子串本身，不重新序列化**：因为输入本来就是 md，remark 解析拿到块级 `position.start/end.offset` 后直接 `source.slice()`，天然保证 `markdown` 与 `anchor.quote` 逐字一致，不存在两者对不上的风险——这个性质是设计阶段没有充分预见到的额外收益，直到实现时才意识到"不重新序列化"同时也让这条不变量变得无成本。
    - **docx 段落遍历技术路线选择"手写复用 output 技术栈"而非引入 mammoth**：段落→锚点映射是本包的一等交付物，需要精确知道"第几段对应原文第几段"；mammoth 按整文档吐一坨 HTML，反向拆出段落索引的工作量抵消了引入库省下的工作量。标题判定复用 output 已验证的"加粗→标题"启发式，读写两侧口径统一。
    - **ZIP 解压比例检测手写中央目录读取器，不依赖 fflate 的高层 API**：`readZipCentralDirectory` 只读 EOCD + 中央目录头（不调用 `unzipSync`），5MB 全零内容在 deflate level 9 下实测压出 5377 字节（975:1 真实比例），验证了检测逻辑在真正的高压缩比内容上生效，不是纸面上的阈值判断。
    - **`@xmldom/xmldom` 默认配置下裸 `<!DOCTYPE>`（不含 `<!ENTITY>`）不会被拒绝**——这是实现期间的实测发现，不是预先假设。因此 `xml-guard.ts` 的字符串级 `DANGEROUS_MARKUP_PATTERN` 探测是必要的独立防线，不是与解析器行为重复的冗余代码。
  - 工具链发现：
    - `pdfjs-dist` 在 Node 环境下必须从 `'pdfjs-dist/legacy/build/pdf.mjs'` 导入，裸 `'pdfjs-dist'`（`main` 字段指向的 `build/pdf.mjs`）在 Node 下因缺少 `DOMMatrix` 等浏览器全局对象而报错。`getDocument` 传 `verbosity: VerbosityLevel.ERRORS` 消除标准字体缺失产生的多余警告日志。
    - `unified`/`remark-parse`/`remark-gfm` 的类型依赖 `@types/mdast`（`Root`/`RootContent` 等类型），不显式声明该 devDependency 时 `tsc` 的 declaration-emit 会报"推断类型无法被命名"——沿用 W1 记录过的"@types/* 必须声明在自己包的 package.json 里"同类坑，新增一例。
    - `vitest`（esbuild 转译）会完全擦除 `import type {...}` 语句，纯类型导入的测试文件即使目标模块尚不存在也会"通过"（不会报 `Cannot find module`）——`types.test.ts` 因此需要靠 `tsc --noEmit` 而非 `vitest run` 来验证 TDD 红灯阶段，这是本包所有测试文件里唯一一个纯类型导入的例外情况。
    - `@courtwork/schemas` 的消费方在其 `IngestStatusEnum` 增补 `needs_ocr` 后，若只跑 `pnpm --filter @courtwork/schemas run generate:json-schema`（更新 JSON Schema 导出）而不重新 `build`（更新 `dist/*.d.ts`），消费方的 `tsc` 会看到旧类型报错，`vitest`（直接对 `src` 转译）却会因为类型层面的问题不影响运行时字符串匹配而"通过"——这是实现期间实测发现的真实陷阱，已通过 `pnpm --filter @courtwork/schemas run build` 解决，记录以免未来会话重复踩坑。
  - 跨层动作：`packages/schemas`（`IngestStatusEnum` 增补 `needs_ocr`）、`packages/registry`（`S1.yaml` `trigger.fileTypes` 同步）、根 `CLAUDE.md`（架构图补行）三处已在本工单开工前完成并各自独立提交，详见各自 SPEC.md 验收记录。

- 2026-07-10（**F-1 追认留痕，F 批验收会话补写**）：`apps/desktop` F-1 composer（Grok 实现）接通本包 `convertToReadingView` 时实测——`computeTextLayerVersion` 原用 `node:crypto` sha256 + `Buffer`，令 desktop 浏览器壳 Vite 打包因 externalize `node:crypto` 失败。本包据 AGENTS.md「跨包阻塞性实现级修复」追认判例就地改为纯 `DataView`/`charCodeAt` + **FNV-1a 双 32-bit 级联短哈希**（`text-layer-version.ts`，浏览器/Node 同算法、零依赖）。三条件核对：①**语义等价**——短哈希仍仅作文本层漂移检测（非安全用途），docx/PDF `textLayerVersion` 的语义与消费路径不变；②**对方 SPEC 留痕**——本条即是（F-1 完工回报只写进 desktop SPEC「跨包支撑」节，漏在本包留痕，验收核出后按裁决补写）；③**完工回报显著标出**——desktop SPEC 已标。回归：本包 136 例干净环境全绿，无行为变化。**FNV 漂移检测充分性评估**：第二 lane 混入 `(i & 0xff) << 8` 位置量、输出 64-bit，确定性且跨壳同算法；漂移检测只需「内容变→哈希变」高概率成立，偶发碰撞的唯一后果是漏报一次漂移（旧 `textRange` 偏移量被误当仍有效、回指原文可能错位），非安全绕过，对本用途充分——位置 lane 还额外挡住了朴素单 lane 哈希会漏的换位（transposition）碰撞。结论：追认条件补齐，`packages/reading-view` 无独立缺口，随 F 批放行。

- 2026-07-13（**LAUNCH-FIX 异会话验收通过**）：按“管线归底座”拍板把既有 DOCX 防线抽为 `security/docx-preflight.ts`，并以 `@courtwork/reading-view/docx-security` 子路径导出。`readDocxBlocks` 与 `packages/output` 同源消费：中央目录/zip bomb 检查先于 inflate，宏工程与 macroEnabled 拒绝，全部 `.xml/.rels` 在解析前做 XXE 与严格 XML 校验。验收静态追到两端唯一入口，运行时确认 output 解析到本包构建产物；三类恶意输入均由同一 `DocxSecurityError` 闭集拒绝。详见 `packages/reading-view/ACCEPTANCE.md`。
