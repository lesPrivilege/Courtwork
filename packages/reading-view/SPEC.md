# SPEC: packages/reading-view（W3.0）

状态：设计完成，待实现（承接 `docs/41-MVP缺口盘点与路由声明.md` 的衍生工单"W3.0 阅读视图管线"，架构会话已批准本设计，见 2026-07-10 对话记录）

## 背景

本包不属于 `docs/10` 原始工单编号序列，是 docs/41 缺口盘点期间新立的 MVP 补强工单（同批的还有 fetch 工具最小实现、provider 首批适配，三张工单可并行）。定位：office 生态原生文件（docx/md/txt/含文本层 PDF）→ md 阅读视图（模型阅读的"母语"）+ 段落级 `SourceAnchor` 映射（UI 溯源与 core 生成节点共用的一等产物）。OCR（扫描件/无文本层）不在范围内，是 W3/W8 ingest v1 的职责；本包对这类输入只负责准确声明"需要 OCR"，不吐半坏的 md，不静默出空文。

只读、单向：呼应 `docs/23-架构决定-编辑面与单向编译.md` 的"定稿后 docx 永不回 md"，本包同理不做任何反向写入，产出只被模型/UI 消费，不回写原件。

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

顶层入口 `convertToReadingView(input, options?)` 只接受内存字节（`Uint8Array` + `fileName`/`fileId`），不接受文件路径——保持包纯净、可测、不假设 Node `fs` 可用（Tauri/浏览器语境同样适用）。**契约上永不 throw**：任何内部异常兜底为 `disabled`（不静默崩溃，呼应 tools 层"失败降级不猜、不裸抛"的纪律）。`detail` 是开发者诊断字符串（日志/调试用），不是面向终端用户的文案——用户可见文案的措辞归 UI/产品（`docs/24`"零技术概念暴露给普通用户"），本包只出机器可读的 `reason`/`status`。

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

## 安全基线（呼应 `docs/27-架构决定-sandbox与fetch分期.md` MVP 六条中与本包相关的两条，加一条包级延伸）

1. **解压比例上限**：docx 是 zip，`fflate.unzipSync` 会一次性全量解压——必须在调用它之前先只读 zip 中央目录拿到每个 entry 的声明压缩/未压缩大小，比例或总未压缩量超配置阈值（默认 100:1 比例、200MB 总量上限，均可配置）直接判 `zip_bomb_suspected` 降级，绝不对可疑 zip 先跑 `unzipSync` 再补救。
2. **禁 XXE**：解析任何 XML 部件前，先对原始文本做 `<!DOCTYPE`/`<!ENTITY` 字符串级探测（双保险，不单纯信任 `@xmldom/xmldom` 的默认解析行为），命中即判 `malicious_content` 降级。
3. **禁宏**：仅接受 `.docx` 扩展名 + 校验 `[Content_Types].xml` 声明的 content-type 非宏使能类型；zip 内出现 `word/vbaProject.bin` 一律拒绝，不论扩展名怎么写。
4. **文件大小上限**：最先检查（最便宜的检查最先做），默认 50MB，可配置。
5. **超时**：整个转换调用包一层可配置超时（默认 30s），超时判 `disabled`。
6. **进程隔离不在本包职责内**：`docs/27` 第①条讲的是 ingest Python 服务的进程级隔离，本包是纯库、被 core 进程内调用，无法自我沙箱化。记入 `packages/core` SPEC 的 TODO（调用不可信文件时是否需要 worker/子进程兜底），不是本包能力缺口。

## CaseFile 对接：自有类型 + 无损投影（`needs_ocr` 已在 schemas 落地，见验收记录）

`CaseFileEntry.documentType` 必填但文书分类是 W8 ingest 分类器的职责，本包不产出、也不该猜。沿用 demo-data/tools 已验证过的先例（"契约取子集，结果存全集，投影责任留给装配点"）：本包只产出自己的 `ReadingViewOutcome`，附一个薄投影 helper `toCaseFileEntryProjection()`，映射 `ok`→`done`、`needs_ocr`→`needs_ocr`、`disabled`→`failed`（**`needs_ocr` 直接对应新枚举值，无损投影，`packages/schemas` 已于本工单同步扩展 `IngestStatusEnum`，见其 SPEC 验收记录**）。`documentType` 字段由调用方（未来的装配点）另行填充，不由本包猜测占位。

## 包结构与依赖

```
packages/reading-view/
  package.json   deps: @courtwork/schemas, fflate, @xmldom/xmldom, pdfjs-dist, unified, remark-parse, remark-gfm
                 devDeps: @types/node, @courtwork/demo-data（仅测试引入，遵循 demo-data SPEC 的测试专用例外）
  src/
    types.ts, convert.ts（按扩展名分发的顶层入口）
    security/{zip-guard,xml-guard,limits}.ts
    docx/{docx-reader,docx-to-markdown}.ts(+.test.ts)
    markdown/markdown-to-reading-view.ts(+.test.ts)
    text/text-to-reading-view.ts(+.test.ts)
    pdf/pdf-to-reading-view.ts(+.test.ts)
    manifest/to-case-file-entry.ts(+.test.ts)
    test-fixtures/（手工构造的 docx/pdf 二进制 fixture + malformed/ 恶意样本）
```

## 测试与验收策略

- **md/txt 路径**：`@courtwork/demo-data` 的 20 份 dossier + `main-contract.md`，共 21 个真实文件全量跑 golden 快照——这是 deliverable"样板案 20 份 dossier 文书 + 主合同全量跑通"的字面对应；这批文件当前都是 `.md`，天然只对得上 md 路径，docx/pdf 路径没有对应规模的真实语料可用，不是刻意回避。
- **docx 路径**：语料目前没有 docx 二进制，手工构造小体量 fixture：至少一份从 `main-contract.md` 内容派生、真实带 `w:tbl` 付款条款表的 fixture（比 md 原文的行内编号写法更贴近真实 Word 合同的常见写法，用于验证表格转出）；加合并单元格、DOCTYPE 注入、zip 炸弹形态、`.docm` 扩展名等降级触发样本。
- **pdf 路径**：含文本层干净样本（判 `ok`）、图片型无文本层样本（判 `needs_ocr`）、截断/损坏样本（判 `disabled`）。
- 降级路径测试覆盖数量超过 deliverable 要求的"一个"下限——按安全基线类（zip 炸弹/XXE/宏）与保真度类（合并单元格）分别覆盖，不是凑数。

## 已知边界（记录，非当期缺口）

- 表格锚点粒度到行，不到单元格。
- docx 列表编号（`w:numPr`）不重建。
- PDF 页内文本层顺序取 pdfjs-dist 默认抽取顺序，不做跨列/跨栏重排——复杂版式 PDF 可能行序错乱，属于"最小可用"的已知代价。

## TODO（跨层放入区）

- [已在本工单一并落地，非遗留 TODO] `packages/schemas` 的 `IngestStatusEnum` 增补 `needs_ocr`——架构当场拍板通过，见其 SPEC 验收记录；`packages/registry` 的 `S1.yaml` `trigger.fileTypes` 同步补 `docx`/`md`/`txt`——见其 SPEC 验收记录；根 `CLAUDE.md` 架构图补本包一行。三项均已完成，此处只做索引，不是待办。
- [观察，暂不行动] `packages/output` 与本包如今各自手解 OOXML（一写一读），**暂不抽公共底层包**（过早抽象，架构已确认）——若第三个消费方出现，或两包围绕 OOXML 的重复度显著增长，届时提案 `packages/ooxml` 归拢。
- [nice-to-have，非阻塞] `packages/demo-data` 的 `data/dossier/*.md`、`data/contracts/main-contract.md` 目前没有类型化的"原始文件清单/读取"访问器（现有访问器只覆盖 `party-corpus`/`citation-corpus` 两个结构化注册表）。本包 golden 测试靠解析已安装的 `@courtwork/demo-data` 包路径推导 `data/` 目录位置读取原始文件，可工作但耦合了 demo-data 当前的目录结构约定。未来 demo-data 可补一个轻量访问器（如 `listDossierFiles()`/`readDossierFile(fileId)`）替代这层路径推导。
- [留给 W6] `packages/core` 的工具/装配点接入本包时，需要把 `ReadingViewOutcome` 投影进 S1 场景执行器实际消费的形态（`documentType` 由分类器或占位填充），并决定是否需要对不可信文件调用加 worker/子进程级隔离（见上方安全基线第 6 条）。

## 验收记录

（实现完成后填写）
