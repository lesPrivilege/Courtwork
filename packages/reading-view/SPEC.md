# SPEC: packages/reading-view（W3.0）

状态：已完成

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
- **docx 路径**：语料目前没有 docx 二进制，手工构造小体量 fixture：至少一份从 `main-contract.md` 内容派生、真实带 `w:tbl` 付款条款表的 fixture（比 md 原文的行内编号写法更贴近真实 Word 合同的常见写法，用于验证表格转出）；加合并单元格、DOCTYPE 注入、zip 炸弹形态、`.docm` 扩展名等降级触发样本。
- **pdf 路径**：含文本层干净样本（判 `ok`）、图片型无文本层样本（判 `needs_ocr`）、截断/损坏样本（判 `disabled`）。
- 降级路径测试覆盖数量超过 deliverable 要求的"一个"下限——按安全基线类（zip 炸弹/XXE/宏）与保真度类（合并单元格）分别覆盖，不是凑数。

## 已知边界（记录，非当期缺口）

- 表格锚点粒度到行，不到单元格。
- docx 列表编号（`w:numPr`）不重建。
- PDF 页内文本层顺序取 pdfjs-dist 默认抽取顺序，不做跨列/跨栏重排——复杂版式 PDF 可能行序错乱，属于"最小可用"的已知代价。
- **PDF 每页整体作为一个 `ReadingViewParagraph`**，不在页内再切分段落——真正的段内分段需要基于文本项坐标做版面分析，超出"最小可用"范围；锚点粒度因此是页级而非页内段落级，`page` 字段保证了这级粒度仍然精确可溯源。

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

- 2026-07-13（**LAUNCH-FIX 实现留痕，待异会话验收**）：按“管线归底座”拍板把既有 DOCX 防线抽为 `security/docx-preflight.ts`，并以 `@courtwork/reading-view/docx-security` 子路径导出。`readDocxBlocks` 与 `packages/output` 现在同源消费：中央目录/zip bomb 检查先于 inflate，宏工程与 macroEnabled 拒绝，全部 `.xml/.rels` 在解析前做 XXE 与严格 XML 校验。既有 reading-view 恶意样本 10 例不降，output 新增三条跨包集成反例证明旁路删除会转红。
