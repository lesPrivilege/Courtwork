# W4 技术 Spike 报告：docx 修订产出管线选型

日期：2026-07-09
范围：Python-Redlines（DocxodusEngine）vs docx4j，用同一份虚构样例合同 + 十条修改指令对比生成质量与工程复杂度。

## 结论摘要

1. **不建议照搬"Python-Redlines vs docx4j"这个二选一框架本身**。两条路线的本质差异不是"哪个库更好"，而是两种不同的产出架构：
   - **Diff 式**（Python-Redlines 的唯一工作模式）：先把指令套用到原文档产出一份"修改后"副本，再让引擎对比两份完整文档、自动推导出修订标记。
   - **直接著录式**（docx4j 的自然用法，也是本 spike 验证过的另一条路）：逐条指令直接在 OOXML 对象模型里构造 w:ins/w:del/批注标记，因为指令本身已经告诉我们改了哪里、改成什么，不需要靠 diff 算法去猜。
   本层的真实输入从来就是"一份指令集"，不是"两份不知道差异的文档"——这个前提天然更贴合直接著录式架构，而不是 diff 式。
2. **直接著录式架构下，"库选型"的意义被削弱了**：docx4j 提供了类型化的 API（省去手写 XML 的心智负担，但 API 本身晦涩，需要靠反编译/试编译摸索），但 spike 证明同样的技术（构造 w:ins/w:del + 批注）用原始 OOXML/zip 操作在 Python 里 300 行左右就能做到；同一套技术转到 TypeScript（fflate/jszip + 字符串或轻量 XML 拼装）预期成本相当，且能让 packages/output 保持纯 TS，不引入 JVM 或 Python 子进程依赖。**这是本次 spike 最重要的发现，建议作为下一步架构讨论的起点**，详见"关键发现"第 4 条。
3. 若仍然只在原始两个候选之间选：**docx4j 更适合本产品**，因为 Python-Redlines 的 diff 式架构与"批注"需求存在结构性冲突（见下）。但两者都不能"开箱即用"，都需要自研加固，与 docs/architecture/system.md 的预判一致。

## 方法

- 样例合同：`fixtures/original.docx`，虚构买卖合同，8 个条款 + 1 个付款进度表格 + 签署区（脱敏，无真实当事人信息）。
- 十条指令：`fixtures/instructions.json`，草拟的 `RevisionInstructionSet` 形状（非最终契约，字段命名待正式提案时可能调整），覆盖：条款内文字替换（含多次出现需按上下文消歧）、插入新条款、整条删除、表格单元格替换、表格整行删除、纯批注不改文字。每条指令都带 `annotation.text`（批注文本），9 条另带 `citations`（依据引用，法条/条款级别）。
- 两条路径独立实现，产出物见 `py-redlines/out/` 与 `docx4j/out/`，均可通过下方"复现方式"重跑。

## Python-Redlines（DocxodusEngine）路径发现

**环境与分发**
- License 已核实为标准 MIT（直接读取仓库 `LICENSE.md` 原文确认，非 GitHub 启发式标签），docs/architecture/system.md 中"待核实"的疑虑可以解除。
- 与预期不同：**运行期不需要装 .NET SDK**。比较引擎是预编译、自包含的 .NET 8 二进制，随 PyPI wheel（`python-redlines-docxodus`）分发，按平台（本机命中 osx-arm64）自动解压到用户缓存目录。
- **可以完全绕开 Python**：解压后的 `redline` 是一个独立的原生可执行文件（Mach-O arm64），有清晰的 CLI（`redline original.docx modified.docx output.docx [--author=... --detect-moves ...]`），直接调用与经 Python 包装调用产出结果一致，启动开销约 0.08s。这意味着若走这条路线，packages/output（TS 包）可以直接 `child_process.execFile` 调用这个二进制，不需要在生产环境常驻 Python——但获取"这个二进制"仍需要在构建期通过 pip/uv 或直接拉取对应平台的 wheel（zip 包）来完成，相当于多了一道构建期依赖。

**生成质量：好**
- 对连续中文文本做字符级精细 diff：例如"百分之十的违约金"→"百分之十五的违约金"被正确识别为纯插入"五"（不产生任何删除标记），"质保期...壹年"→"...贰年"被识别为单字替换（删"壹"插"贰"），前后文完全保持原样不被扰动——这是专业级的最小化修订效果，比"整句删除+整句插入"的粗暴方案质量高得多。
- 表格整行删除使用标准 OOXML 机制（`<w:trPr><w:del/></w:trPr>` 配合单元格内容 `w:del`），不是取巧的纯内容清空。
- 自定义扩展属性（`pt14:*`，源自 Open-XML-PowerTools 血统）通过 `mc:Ignorable` 正确声明为可忽略扩展，符合 OOXML 前向兼容规范，理论上不应导致合规解析器报错。
- 已知坑：文档中明确警告 `detect_moves=True` 若不同时设置 `simplify_move_markup=True` 会触发 Word 的"内容不可读"错误（ID 冲突已知 bug）。本 spike 全程按文档建议两个参数一起传，未触发该问题；生产管线必须记住这个组合，不能只开 `detect_moves`。

**关键缺陷：批注**
- **DocxodusEngine 完全不支持批注**（`word/comments.xml`），只处理 tracked-changes 这一半需求。批注必须自己在 OOXML 层面手写注入（`comments.xml` + 关系 + content-type + `commentRangeStart/End` + `commentReference`），这部分本 spike 已验证可行（`py-redlines/lib_comments.py`），但要注意两个非平凡的坑：
  1. 已删除文本在 OOXML 里用 `<w:delText>` 而非 `<w:t>`，批注定位逻辑必须两个标签都扫，否则"删除类批注"永远找不到锚点。
  2. `commentRangeStart/End` 和携带 `commentReference` 的 run **不能塞进 `<w:del>`/`<w:ins>` 内部**，否则批注本身会被当成修订内容的一部分，语义错误。必须以修订包裹元素本身为锚点插到其前后。
- **实测证实一个结构性问题**：diff 前把批注写进"修改后"副本，批注在 DocxodusEngine 的输出里**会被完全丢弃**（`redline_with_comments.docx` 里 `comments.xml` 不存在，`commentReference` 计数为 0）——引擎重建输出时只保留它自己 diff 模型认识的内容，批注这类"它不认识"的部件直接被丢。
- 因此批注只能在 **diff 之后** 对着 `redline.docx` 做后处理注入。但此时想用"指令里原来的那句话"做文本搜索来定位批注**大概率失败**：细粒度 diff 会把原文拆成"未变前缀 + 变化片段 + 未变后缀"，尤其像"百分之十→百分之十五"这种纯插入场景，旧文字根本没被标记删除、原样待在文档里，搜索"旧引用文本"这个策略从语义上就是错的。实测 9 条批注里用旧引用文本做 diff 后定位，只有 4 条命中（全段删除/表格行删除这类"整体消失"的情况能命中，句中局部编辑的情况系统性失败）。
- **结论**：diff 式架构下，批注不能依赖"改完之后再用文本去找回锚点"，必须在应用指令的当下就记录好"这条批注最终应该挂在 diff 输出的哪个位置"，这需要额外一层"指令 id → 输出位置"的追踪逻辑，工程量不小，而且这层逻辑现在还没做（本 spike 只验证到"文本搜索法不可靠"这一步，没有继续实现追踪层，因为已经改变了对架构的判断——见结论摘要第 2 条）。

**性能**：冷启动含二进制解压约 5.3s（仅首次），之后单次 diff 约 1.1s；原生二进制直调约 0.08s 启动 + 生成耗时。对"午休之内出时间线"这类耗时预算不构成压力。

## docx4j 路径发现

**环境与分发**
- Maven 坐标：`org.docx4j:docx4j-core` + `org.docx4j:docx4j-JAXB-ReferenceImpl`，均为 11.5.3（当前最新）。需要 JVM（本机用 Java 21/26 均可编译运行，未见版本敏感问题）。
- 确认存在一个久未更新、无文档的 `docx4j-diffx` 模块（内含 2007 年血统的 Topologi DiffX 通用 XML diff 算法 + Eclipse `rangedifferencer`），理论上可能提供"diff 两份文档"能力，但**本 spike 未评估**——零文档、零 GitHub 讨论热度，与 docx4j 主线的活跃维护程度不成比例，不建议作为生产依赖，仅记录存在性以免日后被问起。
- docx4j **没有对外文档化的"输入指令集直接生成修订"能力**，与 docs/architecture/system.md 的判断一致；但这恰好契合本层"直接著录式"的架构需求，不是缺陷。

**API 可发现性：差，需要反编译摸索**
- 官方文档对"如何构造 tracked-changes 标记"这个具体场景几乎没有可用示例。实际类名（`RunIns`/`RunDel`/`DelText`/`CommentRangeStart`/`CommentRangeEnd`/`R.CommentReference`/`CommentsPart`）和非直觉的 JAXB 生成方法名（比如 `RunIns` 的内容列表访问器叫 `getCustomXmlOrSmartTagOrSdt()`，因为它是从 XSD choice group 机械生成的）全部靠 `javap` 反编译 jar 包 + 反复试编译摸出来的，不是能照着文档抄的。这是一次性的探索成本——摸清楚之后写出来的代码本身并不长（构造一个 ins/del/批注锚点大约 10–15 行），但对团队里没碰过 docx4j 的人来说，第一次上手的学习曲线比 Python-Redlines 陡得多。

**生成质量：好，与 Python-Redlines 相当**
- 本 spike 用一个约 15 行的"公共前缀/公共后缀裁剪"算法（不是完整 LCS，只处理单一变化区间）在直接著录场景下达到了和 DocxodusEngine 相当的最小化效果：同样的"百分之十→百分之十五"被正确识别为纯插入，"甲方所在地→标的物所在地"被正确识别为删"甲方"插"标的物"。对本产品场景（每条指令对应一个已知的局部改动，不是两份未知差异的完整文档）这个简化算法已经够用，不需要完整 diff 算法的复杂度。
- 表格整行删除同样产出标准 `<w:trPr><w:del/></w:trPr>` 结构。
- 输出的命名空间比 Docxodus 更干净：`mc:Ignorable="w14 wp14"`，没有第三方扩展属性。

**批注：原生支持，且没有 diff 式架构的锚定问题**
- docx4j 提供类型化的 `CommentsPart` + `Comments`/`CommentRangeStart`/`CommentRangeEnd`/`R.CommentReference` API，虽然调用链繁琐（每条批注要手工管理 id、author、date），但因为是在应用指令的**同一遍**里直接把批注挂在刚构造出来的 ins/del 节点旁边，完全不存在"改完之后回头再找文字在哪"的问题。**10 条指令全部批注一次性正确挂载**（含全部三种情况：段内局部编辑、整段删除、表格整行删除），不需要额外的追踪层。这是相对 Python-Redlines 路径最实质的结构性优势。

**性能**：JVM 单次调用（含启动）约 0.84–1.13s，与 Python-Redlines 的原生二进制路线量级相当，比经 Python 解释器中转的调用更快。

**工程量**：单文件 397 行（含 JSON 解析、定位、指令分发、diff 构造、批注、表格处理全部逻辑），比 Python-Redlines 路径三个文件合计约 310 行略多，但把"diff 算法"和"批注注入"两块本该分别计入两条路径成本的东西都算在内后，两者量级相当。

## 关键发现：diff 式 vs 直接著录式（比库选型更重要的架构判断）

这是本次 spike 跑出实测数据之后才浮现的架构性发现，原始的"Python-Redlines vs docx4j"提问框架下不会自然出现：

- Python-Redlines 只能做 diff 式（这是它唯一的工作模式），docx4j 没有内置 diff 能力所以只能做直接著录式（`docx4j-diffx` 存在但未评估，理由见上）。
- 本层的输入契约从设计上就是"一份结构化指令集"（定位+操作+批注+依据），不是"两份不知道哪里不同的文档"。**直接著录式架构完全对应这个输入模型，diff 式架构则是先把结构化信息压扁成两份平面文档，再花一个独立算法去把结构信息猜回来**——多了一次有损转换，还带来了实测证实的批注锚定失败问题。
- 一旦确定用直接著录式架构，"要不要引入 docx4j 这个 JVM 依赖"就变成了一个独立问题，而不是和"选哪个 diff 引擎"绑在一起的问题：直接著录式的核心技术（构造 w:ins/w:del/批注 XML）本身是语言无关的，spike 里在 Python 端（`lib_comments.py`）用原始 zip/lxml 操作实现过一遍，在 Java 端用 docx4j 的类型化 API 实现过一遍，两边都能跑通、质量相当。**没有实质理由认为同样的技术在 TypeScript 里做不到**——用 `fflate`/`jszip` 处理 zip 层、`fast-xml-parser` 或字符串拼装处理 XML 层，工程量预期与本 spike 的两条路径同量级（约 300–400 行核心逻辑）。这样 packages/output 可以保持纯 TS，不需要在生产环境引入 Python 子进程或 JVM 子进程，直接对齐 CLAUDE.md 的"TS monorepo"技术基线。
- 这条"纯 TS 直接著录"路径本次 spike **没有实际验证**（只验证了 Python 和 Java 两种实现），只是基于两次独立实现都成功的证据做的合理推断。是否要在正式管线里走这条路，还是选择更省事但引入 JVM 依赖的 docx4j，是一个需要你拍板的架构决策，见下方"选型建议"。

## 对比表格

| 维度 | Python-Redlines（diff 式） | docx4j（直接著录式） | 纯 TS 直接著录（已验证，拍板选中） |
|---|---|---|---|
| License | MIT（已核实） | Apache-2.0 | fflate MIT、@xmldom/xmldom MIT（均读取 package.json 核实，均为单一 MIT，非旧版 xmldom 包历史上的 LGPL/MIT 双许可争议版本） |
| 运行期额外依赖 | 无需 .NET SDK；可直接调原生二进制 | 需要 JVM | 无 |
| 生成质量（修订） | 优，细粒度 diff | 优，简化算法即可达到同等效果 | 与 docx4j 黄金参照结构完全一致（w:ins 8/8、w:del 13/13） |
| 批注支持 | 无原生支持；diff 后需自建定位追踪层（未实现） | 原生 API，同一遍完成，10/10 全部正确 | 同一遍完成，10/10 全部正确（commentReference 10/10） |
| 表格整行删除 | 标准 OOXML 语义 | 标准 OOXML 语义 | 标准 OOXML 语义（trPr-del 1/1，与黄金参照一致） |
| API 可发现性 | 好，文档清晰 | 差，需反编译摸索 | 中；无需摸索（照搬已验证的 OOXML 结构），但这是"第三次实现"的红利，不代表 TS 生态本身更易上手 |
| 单次调用性能 | ~0.08s（原生二进制）/ ~1.1s（Python 中转） | ~0.9–1.1s（JVM 启动） | 同进程内函数调用，无子进程/运行时启动开销 |
| 与 TS monorepo 架构契合度 | 需子进程集成 | 需子进程集成 | 原生契合，无额外运行时依赖 |
| 已验证程度 | 高（本 spike 实测） | 高（本 spike 实测） | 高（本 spike 实测，10/10 通过 + 与黄金参照语义等价） |

## 选型建议

1. **架构层面**：建议管线整体采用**直接著录式**，不采用 diff 式——这不是"哪个库更强"的问题，是 diff 式架构与"批注挂靠依据引用"这个核心需求存在结构性摩擦，实测已经证实（9 条批注里 diff 后文本定位只命中 4 条）。
2. **库/语言层面**，建议二选一，两个都可行，取舍在于"现在要不要多花一轮 spike 验证纯 TS 路线"：
   - **稳妥路线**：直接基于 docx4j 实现（Java 子进程，通过 shaded jar + `child_process` 从 TS 侧调用）。本 spike 的 `RedlineSpike.java` 已经是一个可用起点，10/10 指令类型（含批注）跑通。代价是给 packages/output 引入一个 JVM 依赖，与"TS monorepo"基线有出入，需要你确认是否接受。
   - **架构更纯路线**：把本 spike 验证过的技术（zip/XML 直接操作 + 最小化 diff 算法）移植到 TypeScript，不引入任何子进程依赖。代价是需要再花一轮实现验证（预估与本次两条 spike 路径同量级的工作量），且团队要自己维护一段"手写 OOXML"的代码，这正是 CLAUDE.md 里"允许写丑但自有代码"的五个自研加固点之一，方向上是对的，但要接受这个事实上的维护成本。
3. **不建议**继续在 Python-Redlines 上投入——它在"修订生成"这一半确实优秀，但"批注"是本产品同等重要的另一半需求，且这一半在 diff 式架构下解决起来比另外两条路线都更别扭。

**这是一个需要你确认的分叉，不是我能替你拍板的默认项**：选"稳妥路线"我可以直接沿用 `RedlineSpike.java` 的技术继续往下做；选"架构更纯路线"我需要先把同样的技术在 TS 里重新验证一遍（等同于再跑一小轮 spike），然后才能进入正式管线实现。请告诉我选哪一个，我据此继续 Task 6（RevisionInstructionSet 提案）与 Task 7（管线实现）。

## 拍板结论与 TS 验证补记（2026-07-09 追加）

**拍板：纯 TypeScript 直接著录**，决定性论据是桌面分发——本管线最终要跑进律所的 Tauri 桌面壳，JVM 子进程意味着安装包要塞一个 Java 运行时，政企内网机器上多一个运维变量，这是长期税不是一次性成本（对照 services/ingest 用 Python 是因为 OCR 生态别无选择且它是独立服务，output 没有这个豁免理由）。附带三个条件：docx4j spike 产出升格为跨引擎黄金参照；引擎收在 `applyRevisionInstructionSet(docx, instructions) → docx` 窄接口后面，docx4j 子进程留档为可逆的 Plan B；TS 小 spike 设止损线，超支到位 2 倍仍未跑通 10/10 就停下上报。

**TS 小 spike 结果：一次性全部跑通，止损线未触发**

- 技术栈：`fflate`（zip 读写）+ `@xmldom/xmldom`（DOM 解析/序列化），代码见 `packages/output/spike/ts/`，黄金参照见 `packages/output/spike/ts/golden/`（docx4j 产出的 `golden-redline.docx` + 对应输入）。
- 十条指令**首次运行即全部 applied**，10/10 批注全部正确挂载——不像 docx4j 路径需要经历"javap 反编译摸 API → 反复编译报错修正"的过程，这次直接照搬已经摸清楚的 OOXML 结构，没有踩新坑。这本身也是一个数据点：**同一项技术的第三次实现（Python 手写 XML → docx4j 类型化 API → TS 手写 XML）比第一次快得多**，不代表 TS 生态天然更容易，是"这次我们已经知道答案"的红利，团队之后维护这段代码时不会再有这种红利，要按"需要理解 OOXML 修订/批注结构"的真实难度评估，不要被这次的顺利误导。
- **语义等价性核验**（按拍板条件，XML 结构比对而非字节比对）：用 lxml 分别解析 TS 输出与 docx4j 黄金参照，`w:ins` 节点数 8/8、`w:del` 节点数 13/13、`commentReference` 数 10/10、`trPr` 含 `w:del` 的行数 1/1，两边完全一致。抽查"百分之十→百分之十五"与"甲方所在地→标的物所在地"两处的具体 diff 切分，逐字符一致。**语义等价性条件达成**。
- zip 完整性通过 `unzip -t` 校验；WPS 冒烟测试（`open` 命令拉起、无异常退出）通过。真实排版/修订可读性/批注气泡定位仍需你在 Word/WPS 里肉眼核验，见下方文件清单新增一项。
- 工程量：392 行（`docx.mjs` 13 + `edit.mjs` 306 + `commentsPart.mjs` 47 + `run.mjs` 26），与 docx4j 路径 397 行、Python-Redlines 路径 310 行同量级，印证了"直接著录技术语言无关、成本同量级"的预判。

**决定**：Task 7 按纯 TypeScript 实现，`packages/output/spike/` 三条路径全部保留归档（不删除），`spike/ts/` 的 `edit.mjs`/`commentsPart.mjs` 是 Task 7 正式实现的直接起点，`spike/ts/golden/` 转为 Task 9 golden files 测试的基础素材。docx4j 路径记录为 Plan B，触发条件：正式实现中遇到本 spike 未覆盖的复杂场景（多级编号、批注跨页、表格嵌套表格等）且手写 OOXML 无法在合理工作量内解决。

## 需要你在真实 Word/WPS 里核验的部分（本 spike 阶段的程序化验证边界）

本机装有 WPS（`wpsoffice.app`），我用 `open` 命令做了"文件能否正常打开、不报损坏"的冒烟测试（两条路径产出的 `redline*.docx` 均正常打开，无异常退出），但**排版是否正确、修订标记是否可见可读、批注气泡定位是否准确、表格整行删除接受后是否真的消失**——这些视觉/交互层面的判断我做不到，需要你实际打开以下文件用肉眼核验：

- `packages/output/spike/py-redlines/out/redline.docx`（Python-Redlines，无批注版）
- `packages/output/spike/docx4j/out/redline_direct_author.docx`（docx4j，含全部 10 条批注，即拍板后的黄金参照）
- `packages/output/spike/ts/out/redline_ts.docx`（拍板选中的纯 TS 路径产出，与上一份结构等价，值得重点核验——这是实际要走进正式管线的技术路线）

这不是本阶段的正式验收清单（正式清单是 Task 10，在管线实现完成后产出），只是想请你确认 spike 阶段两条路径的产出在视觉上没有明显问题，作为选型判断的补充依据。

## 复现方式

```bash
# Python-Redlines 路径
cd packages/output/spike/py-redlines
.venv/bin/python run_spike.py   # 需要先 uv sync（已在本 spike 环境装好）

# docx4j 路径
cd packages/output/spike/docx4j
mvn -q compile
java -cp "target/classes:$(mvn -q dependency:build-classpath -Dmdep.outputFile=/dev/stdout)" \
  work.courtwork.spike.RedlineSpike ../fixtures out

# 纯 TS 路径（拍板选中，正式管线的技术起点）
cd packages/output/spike/ts
npm install   # fflate + @xmldom/xmldom
node run.mjs
```

## 本次 spike 未覆盖的已知缺口

- `docx4j-diffx` 模块未评估。
- 模糊锚点定位（文档被轻改后指令集仍能定位）不在本次 spike 范围内——两条路径的十条指令都是对着"干净"的原始合同精确定位，定位鲁棒性是 Task 8 的范围，与库选型正交，不影响本次结论。
- 复杂样式场景（多级编号、批注跨页、表格嵌套表格）未覆盖，样例合同刻意保持简单以聚焦"库能力"本身而非"样例复杂度"。
