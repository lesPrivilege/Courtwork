# R4：packages/output 功能真实度审查——917 行离「唯一可靠执行引擎」有多远

审查方法：只读源码，逐文件读完 `packages/output/src` 全部 8 个生产文件（793 行）+ 1 个演示指令 fixture（124 行，793+124=917，与题目「917 行」口径的差异见附录 A.1）+ 全部 5 个测试文件（325 行，与题目「测试覆盖 325 行」精确吻合）+ golden snapshot 两份 + schemas 契约 + reading-view 安全预检 + 唯一真实调用方（`apps/desktop`）。判定词汇标注于每条结论。

---

## 0. 结论先行

**917 行（准确说 793 行生产逻辑 + 124 行单一手工 demo 指令集）目前实现的是「在一份人工设计、无预置格式、每条指令各自独占一个不含 `w:pPr` 的段落的示范合同上能正确跑通」的最小闭环，离「全生态唯一可靠修订执行引擎」这个 roadmap 承诺还有实质性距离，且距离比测试全绿所暗示的更大。**

三类证据支撑这个判断，按严重性排列：

1. **一个已经在今天的真实产品路径里发生、且没有任何测试覆盖的正确性缺陷**：`applyMinimalReplace`（`apply-instructions.ts:322`）在处理 `replace` 指令时会 `while (p.firstChild) p.removeChild(p.firstChild)`，整段清空段落再重建——这会连同 `w:pPr`（对齐、缩进、行距、编号引用）一起丢弃，且不产生任何 `w:pPrChange` 追踪标记，Word 审阅面板对此完全不可见。这不是一个假设性风险：`apps/desktop` 唯一接入 `packages/output` 的生产代码路径（`compileConfirmedReviewToDocx` → `compileDraftToDocx`）生成的"原始文档"**每个正文段落的 `w:pPr` 都包含 `w:ind w:firstLineChars="200"`（中文公文的首行缩进）**，也就是说，今天只要用户在 desktop 里对合同正文任何一段发起 `replace` 类修订，产出文档里那一段的首行缩进会静默消失——测试测不出来是因为 `packages/output` 自己的 golden fixture（`test/fixtures/original.docx`）里除标题外没有任何段落带 `w:pPr`，`apps/desktop` 自己的集成测试也只断言 `comments.xml` 内容，不检查 `document.xml` 的 `w:pPr` 存续。
2. **契约字段被静默忽略**：`RevisionInstructionSet.locator.paragraphHint` 在 schema（`packages/schemas/src/revision-instruction-set.ts:10`）、`locate.ts` 自己的注释（`locate.ts:72`「歧义交给上层用 paragraphHint 消歧」）、`SPEC.md`（`SPEC.md:45`）里三处都宣称"精确命中多处时用 paragraphHint 消歧"，但 `locateQuote()` 函数签名（`locate.ts:75`）根本不接收这个参数，`apply-instructions.ts` 里也没有任何地方读取 `instruction.locator.paragraphHint`——消歧的"上层"并不存在。10 条 demo 指令里有 6 条带 `paragraphHint`，全部是写了却没人用的字段。
3. **修订/批注的 OOXML 覆盖面明显窄于"Track Changes"这个词面含义**：只有 `w:ins`/`w:del`（含表格整行 `w:trPr/w:del`）与最基础的 `w:comment` 一种 part。`w:moveFrom`/`w:moveTo`、`w:rPrChange`/`w:pPrChange`（真正可追踪的格式变更）、`w:cellIns`/`w:cellDel`/`w:tcPrChange`（表格结构性修订）、`commentsExtended.xml`/`commentsIds.xml`（回复/解决线程）在 793 行生产代码里出现次数为 **0**（全仓 grep 确认）。而 WPS 兼容性方面最值得警惕的两条真实证据——"修订+批注同址显示冲突"和"WPS 产出的 zip 可能不合规范导致严格解析器解压即失败"——都还没有在 2026 环境下用真实 WPS 复测过，`verification-checklist.md` 的 7 大项、`archive/research-2026-07-14/wps-compat.md` 第 6 节 14 行测试矩阵，**全部未勾选、未执行**。

`docs/status/current.md:14` 把"docx 修订/批注管线"作为无条件的「已成立」条目列出，既没有携带 `packages/output/SPEC.md:3` 自己写的「WPS 兼容尚未实测，不得宣称已验证」这句限定语，也没有在「当前架构债」（`docs/status/current.md:47-58`，10 条）里给这条留一席之地。**这个判定站不住**——详见第 6 节。

---

## 1. 917 行到底实现了什么：逐文件能力边界

### 1.1 总量核对

```
wc -l 实测（packages/output/src，不含 dist/spike/test/*.docx）：
  488  apply-instructions.ts
  102  locate.ts
   70  compile-draft-to-docx.ts
   48  comments-part.ts
   38  apply-revision-instruction-set.ts
   27  docx-zip.ts
   16  fonts.ts
    4  index.ts
  ---
  793  合计（8 个生产文件，与题目列出的每行数字逐一吻合）
+ 124  src/test-fixtures/instruction-set.ts（10 条指令的唯一 demo fixture，被 golden test / desktop 集成测试共用）
  ---
  917  793 + 124，与题目「总共 917 行」的口径吻合（题目原文把两者算作一个数但只点名了 8 个"生产文件"，793≠917 的差额已用独立 wc -l 核实为这个 fixture 文件）
```

判定：**代码事实核验通过**，题目给出的单文件行数无误；仅"917 行＝8 个生产文件"这个归类表述有 124 行落差，已用 `wc -l` 定位来源（详见附录 A.1）。这不影响后续任何结论，但既然题目要求"禁止用文档叙事推断代码事实"，这个算术本身也该被核验。

### 1.2 逐文件边界

| 文件 | 行数 | 真实能力 | 不支持 |
|---|---|---|---|
| `index.ts` | 4 | 纯 re-export（`apply-revision-instruction-set`/`compile-draft-to-docx` 全部导出，`apply-instructions`/`locate` 只导出类型） | 无独立逻辑 |
| `fonts.ts` | 16 | 三个常量（仿宋_GB2312/黑体/Times New Roman）+ 一个二选一函数 `eastAsiaFontFor(role)` | 见第 4 节 |
| `docx-zip.ts` | 27 | `loadDocx`＝委托 `reading-view` 的 `preflightDocx`；`getText`/`setText`＝`Record<string,Uint8Array>` 存取；`saveDocx`＝`fflate.zipSync(level:6)` | 不做任何 docx 结构校验，纯 I/O 薄封装 |
| `apply-revision-instruction-set.ts` | 38 | 唯一对外入口：`loadDocx → applyInstructionsToDocumentXml → setText → (comments.length>0 时 writeCommentsPart) → saveDocx` | 无重试、无 idempotency 保护（见 3.3） |
| `comments-part.ts` | 48 | 见第 3 节，本次审查锚点问题 | 见第 3 节 |
| `compile-draft-to-docx.ts` | 70 | 从 `{title, paragraphs: string[]}` 直接拼 6 个 OOXML part 字符串（`[Content_Types].xml`/`_rels/.rels`/`document.xml`/`document.xml.rels`/`styles.xml`），控制字符检测后拒绝写入 | **无表格支持**（`DraftDocxInput` 接口只有 `title`+`paragraphs: readonly string[]`，见 `compile-draft-to-docx.ts:5-8`）、无编号、无页眉页脚、无图片 |
| `locate.ts` | 102 | 见第 5 节 | 见第 5 节 |
| `apply-instructions.ts` | 488 | 见 1.3 | 见 1.3 |

### 1.3 `apply-instructions.ts`（488 行，占全包 61%）逐能力拆解

**输入契约**（来自 `packages/schemas/src/revision-instruction-set.ts:72-116`）：`RevisionInstructionSet = {id, caseId, targetDocument:{fileId}, instructions: RevisionInstruction[]}`；每条指令 = `{id, kind, locator, text?, annotation?}`，`kind ∈ {replace, insert, delete, commentOnly}`（判别联合，`commentOnly` 必须带 `annotation`，其余可选），`locator.strategy ∈ {text, tableCell, tableRow}`。

**生成的 OOXML 元素集合**（全部逐一在源码里确认过存在，也在 `golden-document.xml`/`golden-comments.xml` 里实测比对过）：

- `w:ins`（`apply-instructions.ts:172-179` `wrapAsIns`）、`w:del`（`157-170` `delRun`，157-170 内联包一个 `w:r>w:delText`）——都带 `w:id`/`w:author="Courtwork"`/`w:date`。
- `w:rPr/w:ins`、`w:rPr/w:del`（段落标记本身的插入/删除追踪，`markParagraphMarkIns` 244-252、`markParagraphDeleted` 265-271 里的 `pPr/rPr/del`）——这是 OOXML 里追踪"整个段落是否消失"的正规机制，用对了。
- `w:trPr/w:del`（表格整行删除追踪，`markRowDeleted` 274-284）——ECMA-376 里整行删除的标准落点，不需要 `w:cellDel` 配合（`w:cellDel` 用于单元格结构性增删，是另一个场景，这条包目前也没做，见 2.4）。
- `w:commentRangeStart`/`w:commentRangeEnd`/`w:commentReference`（`attachCommentAround` 192-215、`attachCommentToWholeParagraph` 217-233）。
- `w:rFonts`（四属性 `ascii`/`eastAsia`/`hAnsi`/`cs`，`buildRPr` 102-119、`ensureCompleteRFonts` 121-139）。

**核心算法**：不是完整 LCS diff，是"公共前缀+公共后缀裁剪"（`applyMinimalReplace` 300-320）——`full.split(quote).join(replacement)` 算出新旧全文，然后从两端往中间找最长公共前后缀，中间残余部分才标记删除/插入。SPEC 自陈这是刻意简化（`SPEC.md:42`），对"单条指令=一处已知局部改动"场景够用，但**不是通用 diff**：如果 `quote` 在段落里出现次数≠1 但通过 `full.split(quote).join(replacement)` 全量替换，会把该段落里所有出现过的 `quote` 都改掉，即使指令语义上只想改其中一处（`locateQuote` 在段落级别做去重判断，但 `applyMinimalReplace` 拿到的是"确定是这一段"之后，用字符串 `split/join` 整段全量替换，不做段内第二次去重）——这是一个真实但当前 demo fixture 未触发（因为所有 `quote` 在各自段落内都只出现一次）的潜在正确性缺口，值得记录。

**不支持的具体行为（逐条列出，均已代码内确认）**：

1. `replace` 会清空并重建整个段落，丢弃 `w:pPr`（`322`，见第 0 节，本报告最重要发现）。
2. `insert` 新建的段落（`426` `const newP = el(doc, 'w:p')`）不从锚点段落继承 `w:pPr`——插入到有编号列表中的新条款不会延续编号/样式。
3. `paragraphHint` 字段全链路未被读取（见第 0 节第 2 条）。
4. `applyMinimalReplace` 重建段落时只保留"第一个 run 的 rPr"作为模板（`firstRunTemplate` 181-185），段落内混合格式（部分加粗/部分普通、超链接、书签、既有批注/既有修订）会被拍平成最多 4 个同格式 run——真实合同段落若本身格式不均一，编辑后格式差异会丢失。
5. `markRowDeleted`（286-289）只取每个单元格的**第一个**段落调用 `markParagraphDeleted`（`firstParaOf` 74-76），多段落单元格里第 2 段及以后的文字不会被标记删除，会出现"整行标了删除线但部分文字未标删除线"的不一致渲染。
6. `'text'` 定位策略只能命中 `w:body` 的**直接子** `<w:p>`（`bodyParagraphs` 59-61 = `childrenOf(body,'p')`），表格单元格内的段落嵌套在 `w:tbl/w:tr/w:tc/w:p` 下，不是 `body` 的直接子节点——**`text` 策略天生无法命中表格内文字**，必须提前知道内容在表格里改用 `tableCell`/`tableRow`。这一点 schema 注释未警示，纯靠踩坑发现。
7. 跨段落 `quote`（引语本身包含段落分隔）无法匹配——`locateQuote` 是逐段独立扫描（`locate.ts:87` `paragraphTexts.forEach`），没有跨段拼接。

判定：**契约已定+代码已实现**（四种 `kind`、三种 `locator` 策略在类型层面全部有对应分支，不是"声明了却没写"），但实现的正确性边界明显窄于"修订建议与 Word 产出全链路"这个措辞所暗示的范围，且 1、2、5 三条是当前测试矩阵结构性看不见的盲区（demo fixture 没有 `w:pPr`、没有 `paragraphHint` 消歧场景、没有多段落单元格）。

---

## 2. 修订（Track Changes）覆盖面逐项核实

全仓对 `packages/output/src`（生产代码，不含 dist/spike）用 `moveFrom|moveTo|rPrChange|pPrChange|cellIns|cellDel|tcPrChange` 做过 grep，**零匹配**。逐项结论：

| OOXML 元素 | 状态 | 证据 |
|---|---|---|
| `w:ins` / `w:del` | **已实现** | `apply-instructions.ts:157-179`；`golden-document.xml` 实测存在，`w:id`/`author`/`date` 齐全 |
| `w:rPr/w:ins`、`w:rPr/w:del`（段落标记增删追踪） | **已实现** | `markParagraphMarkIns` 244-252、`markParagraphDeleted` 265-271 |
| `w:trPr/w:del`（表格整行删除） | **已实现，且是正确的 OOXML 落点** | `markRowDeleted` 274-284；⚠ 训练知识判断"整行删除只需要 `w:trPr/w:del`、不需要 `w:cellDel` 配合"，本报告未接入实时 ECMA-376 文本核实，建议列入 6.4 验收项一并核对 |
| `w:moveFrom` / `w:moveTo` | **无契约无实现** | schema 的 `RevisionInstructionSchema`（`revision-instruction-set.ts:72-102`）没有 `move` 这个 `kind`，代码自然也没有配对 `w:id` 的移动追踪逻辑。real-world"移动一个条款"目前只能表达成"原位置 delete + 新位置 insert"两条独立指令，Word 审阅面板会显示为两处无关改动，不会显示为"移动了"。 |
| `w:rPrChange` / `w:pPrChange`（可被 Word 审阅面板呈现的格式变更） | **无契约无实现**，但有一个不受这个机制覆盖的**隐性格式副作用**需要单独警惕 | schema 没有"仅改格式"的指令类型。但 `ensureCompleteRFontsForAllRuns`（`141-145`，调用于 `481`）会无条件遍历**整份文档**的每一个 `w:r`（不只是被指令触碰的），把 `w:rFonts` 的 `ascii`/`eastAsia`/`hAnsi`/`cs` 四属性强制覆盖为仿宋/黑体/Times New Roman（`135-138`）。用 `test/fixtures/original.docx` 实测：原文档 33 个 `w:r` **零个**带 `w:rFonts`（依赖主题字体 `minorHAnsi=Calibri`/`minorEastAsia`=空），管线跑完后**全部** 33 个 run 都带上了显式仿宋/黑体/Times New Roman——包括从未被任何指令编辑过的段落（如"乙方（出卖人）：恒源贸易有限公司"，`golden-document.xml` 内可查）。这个改动**不经过 `w:rPrChange` 包裹**，Word/WPS 审阅面板不会显示"格式被改动"，用户开着"显示所有标记"也看不出全文字体被整体替换过。这与 `verification-checklist.md:39`「未被本次指令触碰的原文字体保持原样（本管线不应该改动它没有编辑到的内容的字体）」这句话字面冲突——该检查项目前连一次都还没有人工勾选执行过。 |
| 表格内修订：`w:cellIns` / `w:cellDel` / `w:tcPrChange` | **无契约无实现** | schema 的 `tableRow`/`tableCell` locator 只支持整行删除和单元格文字替换/批注，没有"插入新列""删除单元格但保留行""合并单元格"这类结构性操作的建模，代码自然也没有。 |

判定汇总：Track Changes 覆盖面是**"能做替换/插入/删除文字 + 整行删除"这个子集**，**契约已定+代码已实现**；但"移动""可见格式变更追踪""表格结构性修订"三类**无契约无实现**；而"隐性全文字体重写"是一个契约意图良好（SPEC 要求每 run 显式声明完整 rFonts）、但**实现范围超出契约本身表述（波及未编辑内容）且不可被 Word 追踪机制观测**的独立问题，不适合套用五个判定词中的任何一个，单独列出。

---

## 3. 批注覆盖面：`comments-part.ts` 48 行能做到哪一步（本次审查锚点问题）

**直接结论：48 行只产出 `word/comments.xml` 一个 part，正确注册了这一个 part 的 `[Content_Types].xml` Override 与 `document.xml.rels` Relationship，仅此而已。`commentsExtended.xml`、`commentsIds.xml` 在 793 行生产代码里出现次数为 0。**

逐条拆解 `comments-part.ts:14-48`（`writeCommentsPart`）：

- **`word/comments.xml`**（`16-23`）：每条评论生成 `<w:comment w:id w:author="Courtwork" w:date w:initials="CW"><w:p><w:r><w:rPr>(四属性 rFonts)</w:rPr><w:t>...</w:t></w:r></w:p></w:comment>`。**没有 `w:para Id`、没有 `w15:paraId`、没有 `w:done`、没有任何指向"这是对哪条评论的回复"的字段。**
- **`document.xml.rels` 注册**（`25-36`）：读取现有 `Relationship`，取最大数字 id +1（或 1000 起），追加一条 `Type=.../comments` 指向 `comments.xml`——**正确**，但没有先检查是否已存在同类型 Relationship，重复调用（例如对一个已经跑过一次本管线、已有 `comments.xml` 的文档再跑一次）会追加第二条指向同一 target 的 Relationship，属于未声明的非幂等行为。
- **`[Content_Types].xml` 注册**（`38-47`）：追加一条 `Override PartName="/word/comments.xml"`——**同样没有去重检查**。若目标文档本来就带 `comments.xml`（用户自己在 Word 里加过批注后再送进本管线），`setText(files,'word/comments.xml',xml)`（`comments-part.ts:23`）会**整体覆盖**、不合并——**原有的人工批注会被静默丢弃**，且 `[Content_Types].xml` 会出现两条指向同一 PartName 的 `Override`（OPC 规范下这属于未定义行为）。这是本次审查发现的另一处真实风险点，虽然不在题目 8 问的直接问法里，但直接关系"回复/解决"协作场景——如果批注协作真的发生（律师在 Word 里回复了 AI 批注，文件再被送回本管线追加下一轮修订），当前实现会把律师的回复原样冲掉。

**`commentRangeStart`/`commentRangeEnd`/`commentReference` 三个锚点元素本身不在 `comments-part.ts` 里，在 `apply-instructions.ts:192-233`（`attachCommentAround`/`attachCommentToWholeParagraph`）——这一层做得完整**，锚点定位到"这条指令改的就是这个刚构造出来的节点"（`SPEC.md:43` 记录的设计取舍），不依赖事后搜索，这个思路是合理的，也在 golden 文件里能看到批注锚点正确跟随了 `w:ins` 插入的文字（如"违约金"条款 `commentRangeStart w:id="0"` 紧贴 `w:ins` 新插入的"五"字）。

**回到锚点问题「Word 打开，批注能不能显示、能不能回复」**：

- **能显示**：`comments.xml` + 两个注册齐全，是合法、可被 Word/WPS 解析的最小批注结构，`w:commentRangeStart/End`+`w:commentReference` 锚点也齐全。这部分**契约已定+代码已实现**，且有 `apply-revision-instruction-set.test.ts:53-66` 的结构性测试兜底（检查 part 存在、rels 含 comments.xml、Content-Type 含 comments+xml）。
- **能不能回复**：**不能靠本管线自己产生"回复"**——`commentsExtended.xml` 不存在，contract 里 `Annotation` schema（`revision-instruction-set.ts:66-70`）也没有 `parentCommentId`/`resolved` 之类字段，回复/解决是完全没有建模的能力。用户理论上可以在打开的 Word 里**手动点"回复"**，Word 会自己按需生成 `commentsExtended.xml`（这是 Word 自己的行为，不依赖 Courtwork 预先写好这个 part），但**这一步没有被验证过**（`verification-checklist.md` 未勾选、`wps-compat.md` 也明确列为未实测项）；即便 Word 端手动回复成功，**读取侧 `packages/reading-view` 同样零处理 `commentsExtended`/`commentEx`/`paraIdParent`/`done`**（全仓 grep 确认），也就是说哪怕用户在 Word 里回复了，Courtwork 自己也读不回这条回复——回复协作是一个双向都不存在的能力，不只是"写不出"，也"读不进"。
- 补充一条独立证据（来自本轮已核实的 `wps-compat.md`，第 70-73 行）：WPS 官方 WebOffice API 的 `GetComments()` 只返回 `{auth, content, date}` 三个字段，没有 `parentId`/`paraIdParent`/`done`；`ReplyComment()` 方法虽然存在但官方页面标注**已废弃**（JSSDK v1.1.14+/WebOffice v3.3.1+ 后不再推荐）——这不能直接证明"WPS 桌面客户端不能回复批注"（Web API 和桌面客户端渲染是两回事），但提示即使 Courtwork 未来实现了 `commentsExtended.xml` 著录，"WPS 端能不能正确识别、渲染、允许继续回复"仍然是一个需要用真实 WPS 桌面客户端验证、且目前没有任何证据支持"应该没问题"的开放问题。

判定：批注基础显示＝**契约已定+代码已实现**；批注回复/解决语义＝**契约与 roadmap 冲突**（`archive/docs-legacy-2026-07-13/docs/05-调研报告-开源选型.md:149` 把"批注的『解决/回复』协作语义"列为"必须自研加固"的三条硬性要求之一，但当前 schema 未定义、代码未实现、读取侧也未实现——三层都是空白，不是"实现中"而是"尚未开始"）；已有批注被覆盖的非幂等风险＝**无契约无实现**（契约没有说"再次运行会怎样"，代码的实际行为是静默覆盖，属于未声明行为，与 CLAUDE.md「静默降级零容忍」的精神相悖，尽管这不是"降级"而是"静默覆盖既有用户数据"，性质上更需要警惕）。

---

## 4. 中文排版：`fonts.ts` 16 行能承载这套规则吗

**结论：能承载字体本身的四属性声明这个具体规则，但"多级编号"从来就不是这 16 行、也不是 SPEC 已拍板的字体规则范围内的东西——题目把两者放在一起问，这里需要先拆开。**

- `fonts.ts` 全文只有三个常量 + 一个函数（`fonts.ts:8-16`）：`BODY_EAST_ASIA_FONT='仿宋_GB2312'`、`HEADING_EAST_ASIA_FONT='黑体'`、`LATIN_FONT='Times New Roman'`、`eastAsiaFontFor(role)` 二选一返回。**这 16 行本身只是常量表**，真正"每个 run 显式声明完整 `w:rFonts`"的执行逻辑在 `apply-instructions.ts` 的 `buildRPr`（102-119）和 `ensureCompleteRFonts`（121-139），以及 `compile-draft-to-docx.ts` 的 `run()`（29-34）。
- **`ascii`/`eastAsia`/`hAnsi`/`cs` 四属性齐全**：三处生成点（`apply-instructions.ts:113-116`、`135-138`；`compile-draft-to-docx.ts:33`；`comments-part.ts:15`）全部四个属性都写，且有专门回归测试锁定（`apply-revision-instruction-set.test.ts:17-36` 的 `assertEveryRunHasCompleteRFonts`，对 `document.xml` 和 `comments.xml` 都跑）。**契约已定+代码已实现**，这条测试是本包质量最扎实的一处。
- **`w:hint` 属性**：全仓 grep 零匹配。**无契约无实现**——SPEC/CLAUDE.md 引用的字体规则原文本身也没提 `hint`，所以这不是"没做完"，是"契约本来就没要求"。是否需要 `w:hint`（用于提示应用程序优先按哪套字符集选字体，常见于中西文混排边界字符）**是一个未被本报告核实的 OOXML 细节**——⚠ 训练知识判断这不是四属性缺一不可的必需项，但没有实时核实，建议列入验收清单。
- **`numbering.xml` / 多级编号**：全仓 grep 零匹配，**契约已定+代码未实现**——但这条契约的出处是 `SPEC.md:51`「复杂样式场景（多级编号、批注跨页、表格嵌套表格）未覆盖，样例合同刻意保持简单」这条包自己写的"已知缺口"，不是"字体规则"条目本身（`SPEC.md:27` 的字体规则记录和这条缺口是分开两条）。也就是说，就算把 `fonts.ts` 从 16 行扩到 1600 行也解决不了多级编号问题——那是完全独立的一块能力（需要 `word/numbering.xml` part + `pPr/w:numPr(numId+ilvl)`），题目把它归到"16 行能不能承载"这个问题下略有误导，这里如实拆开说明。且多级编号一旦做了，会立刻撞上第 0/2 节已经指出的 `w:pPr` 丢失问题——不先修复 `applyMinimalReplace` 的段落重建逻辑，加了编号也会在第一次 `replace` 时被抹掉。
- **加粗启发式识别标题**（`isBoldRPr`，`apply-instructions.ts:98-100`）：SPEC 自陈是简化方案，不解析 `w:pStyle` 真实样式表（`SPEC.md:44`）。真实合同若标题走的是"样式表"而非"直接加粗"，会被误判为正文角色、套错字体（仿宋而非黑体）。这条缺口 SPEC 自己承认，判定：**契约已定（SPEC 明确记录该取舍）+代码已实现（就是这个简化版）**，但适用范围有限，不是"标题识别"的通用解。

---

## 5. `locate.ts` 102 行的定位能力：「无锚不落格」在 output 侧的落点

**核心机制**：段落级精确子串匹配优先，唯一命中→`exact`；命中 0 次→退化到模糊匹配（多窗口长度 × Levenshtein 相似度打分，`bestWindowInParagraph` 48-62）；命中 ≥2 次→直接判 `ambiguous`，**不做任何自动消歧**（呼应第 0/1 节：`paragraphHint` 本该在这里用上，但没有）。模糊匹配要求最高分 ≥ 0.82（`DEFAULT_THRESHOLD`，`locate.ts:8`）且比次高分至少高出 0.05（`AMBIGUITY_MARGIN`，`locate.ts:10`），否则同样判失败或歧义，不猜。

**跨 run**：天然支持——`textOf(p)`（`apply-instructions.ts:35-46`）递归拼接段落内所有 `w:t`/`w:delText` 文本内容，不关心 run 边界，所以 `quote` 横跨多个 `w:r` 没问题，这是把定位做在"段落纯文本"这一层的直接好处。

**跨段落**：**不支持**——`locateQuote` 的输入是 `paragraphTexts: string[]`，逐段独立扫描（`locate.ts:87`），一个 `quote` 如果字面包含跨越两个 `<w:p>` 的内容，任何一段单独的文本都不会完整匹配到它，结果必然是 `not_found`。这不是契约违反（schema 的 `quote` 字段没有承诺"任意连续原文，不管跨不跨段"），但容易造成认知落差，值得记录。

**跨表格单元格**：`'text'` 策略完全不覆盖表格内容（见 1.3 第 6 条），必须用 `tableCell`/`tableRow`；而这两种策略**只做精确匹配**（`findRowContaining`/`columnIndex`，`apply-instructions.ts:77-95`），**不走 `locate.ts` 的模糊匹配路径**——SPEC 自己承认这条缺口（`SPEC.md:50`）。**契约已定（schema 定义了 tableCell/tableRow strategy）+代码已实现（但只有精确匹配这一档，模糊定位路径缺失）**。

**定位失败时的行为**（对照「静默降级零容忍」）：**不是静默跳过，是显式分类返回**。`ApplyStatus` 联合类型（`apply-instructions.ts:343-349`）区分 `applied`/`applied_fuzzy`/`locator_not_found`/`locator_ambiguous`/`locator_text_mismatch`/`unsupported_locator` 六种状态，每条指令的结果都逐条塞进 `outcomes` 数组返回给调用方（`applyInstructionsToDocumentXml:476-480`），不抛异常、不中断整批、不静默丢弃——这条设计做得对，也有测试锁定（`apply-revision-instruction-set.test.ts:76-91`「reports locator_not_found (and skips) rather than mis-inserting」）。**但**"显式"止步于 `packages/output` 的函数返回值——本次审查追踪了唯一真实调用方 `apps/desktop/src/App.tsx:907`，发现 `compileConfirmedReviewToDocx` 的返回值 `outcomes` 在调用点**没有被读取或展示给用户**（`App.tsx:907-914` 只解构了 `docx`，没有解构 `outcomes`）——也就是说，`packages/output` 把失败诚实地报出来了，但目前唯一接线的 UI 层把它扔在了地上，用户拿到成品 docx 但不会被告知"有几条指令因为定位失败被跳过了"。这是一个跨包边界的发现（`apps/desktop`，非本包范围），但直接关系"定位失败时报错并跳过"这条 SPEC 硬性要求在**用户能不能感知到**这一层是否真正兑现——目前的答案是不兑现。

判定：`locate.ts` 自身＝**契约已定+代码已实现**（模糊定位三级策略、拒绝猜测的阈值设计，均对应 SPEC 硬性要求，且有 6 个单测覆盖三级状态）；表格模糊匹配缺失、跨段落不支持＝**契约已定+代码未实现**（前者）/ **无契约**（后者，不算违约）；失败状态在 UI 层未被消费＝**契约已定（output 层）+代码已实现（output 层），但下游未接住**，不在本包判定范围内，但纳入报告以免遗漏。

---

## 6.「已成立」这个判定站不站得住

**不站得住，理由有三层，从"文档内部自相矛盾"到"测试性质本身"。**

**第一层：文档内部已经自相矛盾，`status/current.md` 没有采纳更谨慎的那一版。** `packages/output/SPEC.md:3`（本包权威 SPEC 首行）写的是「状态：核心完成；**WPS 兼容尚未实测，不得宣称已验证**（管线与自动化测试全绿；Word/WPS 双端仍须按 `verification-checklist.md` 核验）」——这是包owner自己给出的最谨慎判断。而 `docs/status/current.md:14` 把"docx/md/txt/文本层 PDF 阅读视图与 docx 修订/批注管线"**无条件**列入「已成立」，未携带 SPEC 里的限定语；再查「当前架构债」10 条（`current.md:47-58`），**没有一条**提及 docx 输出的 WPS 兼容性或核验缺口。SPEC 里明确写了的风险，在 rollup 层消失了。

**第二层：`verification-checklist.md` 7 大项，全部未勾选。** 逐行确认，所有 `[ ]` 均为未勾选状态（无一处 `[x]`），包括最基础的"往返打开保存重开不丢内容"这条 P0 项。`ACCEPTANCE.md`（2026-07-09 记录）里描述的"已用 WPS 打开、137% 放大核对、截图"这次人工核验，对照 checklist 逐项看，**只覆盖了第 3 节"字体"这一项**（`ACCEPTANCE.md:41-44` 的观察全部围绕字体展开），完全没有验证第 2 节"批注回复线程往返后是否完整"、第 4 节"接受修订后表格是否真的从 4 行变 3 行"、第 7 节"Word 端"（`ACCEPTANCE.md:45`「本机未安装 Microsoft Word……因此未做 Word 端截图核验」，Word 端核验目前是 0）。也就是说，"docx 修订/批注管线"这条「已成立」背后，**真实执行过的人工核验只有"WPS 打开时字体好不好看"一项**，checklist 剩余六大类（含最基础的往返完整性）从未跑过。

**第三层：325 行测试测的是什么，和"真实 Word 兼容性"有本质区别。** 逐个确认：

- `apply-revision-instruction-set.test.ts:93-105` 两个 golden snapshot 测试用 vitest 的 `toMatchFileSnapshot`，比对对象是 `src/__snapshots__/golden-document.xml`/`golden-comments.xml`——**这两份 golden 文件本身就是这份代码自己生成后被人工approve收进仓库的**（`SPEC.md:47`「Golden files 用 toMatchFileSnapshot……不比较 docx 原始字节」）。这种测试能保证的是"代码没有在没人注意的情况下改变行为"（防回归），**不能**证明"Word/WPS 真的认得这些 XML"——如果 golden 文件本身固化时就带着一个结构性问题（比如本报告发现的全文字体静默重写、`w:pPr` 丢失），这类测试会**永远绿下去**，因为它比对的是"和上次一样"，不是"和 Word 的真实解析结果一样"。
- `docx-security-integration.test.ts`（58 行）测的是宏工程/XXE/zip bomb 三种恶意输入被正确拒绝——这是安全性测试，和"生成的文档 Word 打不打得开"是两个问题。
- `apply-instructions.test.ts`（91 行）三个测试全部针对**单段落、单 run 的最小 XML 片段**（`minimalDocumentXml` helper），验证字体角色选择——覆盖面窄，且断言方式是「`fonts.every(f => f === '仿宋_GB2312')`」，因为测试夹具本身只有一段文字，这个断言在"全文字体被强制统一"这件事上**天然测不出问题**（没有第二段不同预期字体的文字可以对照）。
- `locate.test.ts`（42 行）6 个用例测的是 `locateQuote` 纯函数的输入输出，不涉及 docx。
- `compile-draft-to-docx.test.ts`（28 行）只测 XML 转义、拒绝空标题/正文、字体常量出现——同样是自洽性检查（生成的东西符合生成代码自己的预期），不是外部一致性检查。

**结论**：测试覆盖的 325 行，验证的是「代码这次生成的东西和代码上次生成的东西一致」「代码生成的东西通过代码自己写的 fflate 解包器」这两类**自洽性**，唯一一次接触真实 Word 生态软件的核验（WPS 截图）只覆盖了七大类核验项里的一类。**判定：`docs/status/current.md:14` 的「已成立」标注对「docx 修订/批注管线」这一条不成立，应改为「核心生成逻辑已实现且自洽性验证通过；真实 Word/WPS 端到端核验（含批注回复、往返编辑、表格接受修订、Word 端全套）尚未开始」——这正是 `SPEC.md:3` 自己的措辞，只是没有被传导到 rollup 文档。**

附带一条文档链路上的小问题：`SPEC.md:23` 把"本层著录器是全生态唯一可靠修订执行引擎"这条判断标注为「依据 `docs/architecture/system.md`」，但检索该文件全文，`packages/output` 只出现在依赖关系图（`system.md:15`）和一行职责描述「docx 安全预检、定位、修订、批注与编译」（`system.md:35`）——**不包含** SPEC 里转述的"Word/WPS 均无程序化插入干净修订的 API""task pane 薄客户端"这些实质性表述。这条引用本身指向的源文件里找不到被引用的内容，属于文档链路内部的可追溯性缺口，不是代码问题，但和本节"已成立判定能不能站住"是同一类问题的另一处症状。

---

## 7. 插件宿主可移植性

**结论：底层 zip/xml 依赖具备浏览器可移植的设计意图和迹象，但"插入 Word/WPS task pane 真实跑通"这件事目前是 0 行代码、0 次验证，纯粹是文档里的意图声明。**

- **依赖清单**（`package.json:17-27`）：`@xmldom/xmldom`、`buffer`、`fflate`、`zod`、`@courtwork/reading-view`、`@courtwork/schemas`。
- **无 Node 专属 API**：对 `packages/output/src` 全部生产文件（不含 `*.test.ts`）grep `require(|node:|process\.|__dirname`，**零匹配**；唯二命中的是 `apply-revision-instruction-set.test.ts`（测试文件用 `node:fs`/`node:path`/`node:url` 读测试夹具，测试本身跑在 Node/Vitest 环境，不影响生产代码可移植性）。生产代码本身没有硬绑定 Node。
- **`buffer` 是显式浏览器 polyfill**：`docx-zip.ts:2` 引入的是 npm 包 `buffer`（`^6.0.3`，Feross 维护的浏览器 Buffer 实现），不是 `node:buffer`，`ACCEPTANCE.md:68` 也明确记录这是为了"使同一 output 代码可在 Tauri WebView 与 Node CLI 运行"而做的选择。
- **`reading-view` 的 zip 检查层有明确的浏览器意图注释**：`packages/reading-view/src/security/zip-guard.ts:1-7`「实现用 DataView + TextDecoder，避免依赖 Node Buffer，以便 apps/desktop 浏览器壳可打包」——这是直接的代码级证据（不是文档叙述），且该文件对 `require|node:|process\.|__dirname|Buffer\.` 的 grep 同样零匹配。
- **`fflate`**：⚠ 训练知识判断该库设计为同构（browser+node），本报告未做实时验证；`@xmldom/xmldom`：⚠ 同样是训练知识判断其为纯 JS 实现、可被打包工具处理，但本报告未做实时 bundle 验证，两者都建议列入插件化 spike 的最早验证项，不要默认可行。
- **`preflightDocx`（`docx-preflight.ts`）内部调用 `fflate.unzipSync`**——如果未来插件场景需要重新解析"用户在 WPS 里编辑保存过"的文件，这条路径直接对上 `wps-compat.md` 5.3 节记录的风险：`readZipCentralDirectory`（`zip-guard.ts:33-75`）是一个**严格**的 EOCD/中央目录解析器（显式拒绝 ZIP64 哨兵值，签名不匹配直接抛错），这正是 2021 年那篇技术博客里描述的"严格遵循 ZIP/OPC 规范的解析器会在解压阶段直接抛异常"那一类实现（该证据本身较老，博客作者提到 Microsoft Word 反而能"修复性"打开这类文件，而 `fflate`/本包的容错行为与该证据涉及的 .NET OpenXML SDK 不同，需要在 2026 环境下用真实 WPS 重新验证）。**这不是猜测式风险，是"如果发生，会精确命中哪一行代码"级别的可追溯风险**——一旦触发，会在 `docx-preflight.ts:51` 被捕获为 `DocxSecurityError('corrupt_file', ...)`，对用户呈现为"文件损坏"，而不是"能修复性打开"。
- **输入输出契约**：`applyRevisionInstructionSet(originalDocx: Buffer | Uint8Array, instructionSet, options) → {docx: Buffer, outcomes}`（`apply-revision-instruction-set.ts:21-25`）——参数类型层面对浏览器友好（接受 `Uint8Array`），返回值是 `Buffer`（来自 `buffer` polyfill，浏览器同样可用）。**接口形状本身没有绑死 Node 或 desktop**。
- **插件宿主适配层：0 行代码**。全仓（含 archive）grep `Office.js|office-js|task-pane|taskpane|word-addin|wps-addin|WPS.*JSAPI`，命中的只有三处**文档**（`SPEC.md`、`wps-compat.md`、一份 archive 调研），**没有任何 `.ts`/`.tsx` 源文件命中**——Office.js（Word 插件官方 JS API）和 WPS 开放平台 JSAPI 两套宿主适配代码目前完全不存在，`SPEC.md:23` 里"未来任何'来源'类枚举设计预留 `word-addin`/`wps-addin`/`email-inbound` 取值空间"这句话准确描述了现状：**只预留了字符串取值位置，没有实现**。

判定：底层 zip/XML 计算层＝**契约未定（没有正式的"浏览器兼容性"契约文档），但代码事实上已经按浏览器可移植的方式实现**，可以打勾；插件宿主集成本身＝**契约已定（SPEC TODO 明确记录）+代码未实现**，且是 0 起点，连脚手架都没有。

---

## 8. 缺口清单简答

要把 793 行（+124 行 fixture）兑现成"全生态唯一可靠修订执行引擎"，缺口分两类：**包内**（OOXML 覆盖面、已发现的正确性缺陷）和**包外**（插件宿主集成、真实文件接入、人工核验闭环）。包内缺口的量级大致与现有代码量同阶或更高（因为好几项本身是几百行级的新能力，而不是打补丁）；包外的插件宿主集成是全新的、当前 0 行的工作面，技术不确定性最高，不能从代码行数推算工作量。详细清单见第 9 节。

---

## 9. 缺口清单与量级

| # | 缺口 | 判定 | 量级（数量级估计，非精确） | 依据 |
|---|---|---|---|---|
| 1 | `applyMinimalReplace` 丢弃 `w:pPr`（对齐/缩进/编号/样式），且是**今天真实产品路径已触发**的缺陷 | 契约已定+代码未实现（SPEC 承诺"著录器"应该忠实反映原文档，未提但隐含不应破坏未声明改动的部分） | 小～中：重写 `applyMinimalReplace` 使其保留/合并 `w:pPr`，加上覆盖"有 `w:pPr` 的段落"的新测试夹具，估计几十到一两百行改动+新测试 | `apply-instructions.ts:322`；`compile-draft-to-docx.ts:39`；`compile-review-output.ts:65` |
| 2 | `insert` 新段落不继承锚点 `w:pPr` | 契约已定+代码未实现 | 小：几十行 | `apply-instructions.ts:426-430` |
| 3 | 全文档字体强制重写波及未编辑内容，且不可追踪 | 契约边界模糊（SPEC 意图是"管线写出的 run"，实现扩大到"文档里所有 run"），需要架构层重新拍板范围 | 小：改为只对指令touch到的run生效，或显式记录为产品决策并同步 checklist 措辞 | `apply-instructions.ts:141-145`, `481` |
| 4 | `paragraphHint` 契约字段从未被消费 | 契约已定+代码未实现 | 小：在 `locateQuote` 或调用方加一层"多候选时按 `paragraphHint` 相似度择一"逻辑+测试，几十行 | `revision-instruction-set.ts:10`；`locate.ts:72` |
| 5 | `w:moveFrom`/`w:moveTo`（移动追踪） | 无契约无实现 | 中：新增 schema `kind`、配对 `w:id` 语义、新增著录函数+测试，数百行，且需要架构拍板 schema 变更 | 全仓 grep 零匹配 |
| 6 | `w:rPrChange`/`w:pPrChange`（可视格式变更追踪） | 无契约无实现 | 中：需要保存"变更前 rPr/pPr"快照作为子节点，OOXML 相对复杂的一类，数百行 | 同上 |
| 7 | 表格结构性修订 `w:cellIns`/`w:cellDel`/`w:tcPrChange` | 无契约无实现 | 中到大：需要新的单元格级 locator 语义设计，数百行 | 同上 |
| 8 | `commentsExtended.xml`/`commentsIds.xml`（批注回复/解决） | 契约与 roadmap 冲突（archive 05 号调研列为"必须自研加固"三项之一，三层均空白：schema/output/reading-view） | 中：`comments-part.ts` 可能从 48 行膨胀到 200+ 行，schema 需要新增 `parentCommentId`/`resolved` 等字段，reading-view 读取侧也要同步补，且 WPS 端渲染效果未知（需要新一轮实测） | `comments-part.ts` 全文；`revision-instruction-set.ts:66-70` |
| 9 | 表格定位模糊匹配（当前只有精确匹配） | 契约已定+代码未实现（SPEC 自认的已知缺口） | 小到中：复用 `locate.ts` 现有模糊匹配思路做变体，几十到一百行 | `SPEC.md:50` |
| 10 | 多级编号 `numbering.xml`/`w:numPr` | 契约已定（SPEC 已知缺口条目）+代码未实现 | 中：新 part + pPr 注入逻辑，且与缺口 1 耦合（不先修 `w:pPr` 保留问题，编号也会被 `replace` 抹掉），数百行 | `SPEC.md:51`；全仓 grep 零匹配 |
| 11 | 批注/Content_Types 非幂等（重复运行覆盖既有内容） | 无契约无实现 | 小：加存在性检查，几十行 | `comments-part.ts:23,38-47` |
| 12 | Word/Office.js 插件宿主适配层 | 契约已定（SPEC TODO 预留枚举位）+代码未实现，0 起点 | 大：task pane UI + 数据通道 + Office.js 适配器，涉及全新的第三方沙箱环境，技术不确定性高，不能从行数推算，wps-compat.md 自己建议单独立项 spike | 全仓 grep 零命中源码 |
| 13 | WPS JSAPI 插件宿主适配层 | 同上 | 大：同上，且额外背负 ZIP 规范风险（5.3 节）与"回复功能已被 WPS 官方 Web API 废弃"的不确定性 | 同上 + `wps-compat.md:70-73` |
| 14 | Word/WPS 双端真实核验闭环（checklist 7 项 + 测试矩阵 14 行） | 契约已定（verification-checklist.md/wps-compat.md 均已就位）+尚未执行 | 人工核验工时量级：数天到一到两周的迭代式核验（含"发现问题→修复→再验证"循环），且存在触发 Plan B（docx4j 子进程路线）重估的尾部风险 | `verification-checklist.md` 全文未勾选；`wps-compat.md` 第6节 |
| 15 | 真实用户文件接入（当前唯一接线路径用 markdown 合成"原始文档"，不是真实上传 docx） | 不在 `packages/output` 范围内，但直接决定 output 的能力用不用得上 | 属于另一层（material ingress / ArtifactEnvelope 持久层）的工作量，`docs/status/current.md:47-58` 债务清单第 2/4 条已记录，不重复估算 | `compile-review-output.ts:65`；`App.tsx:98-99,907-913` |

**总体量级判断**：仅在 `packages/output` 包内，要补齐第 1-11 项，新增/改动代码量级与现有 793 行体量**同阶或更高**（多项是数百行级的全新能力，不是打补丁）；插件宿主集成（12/13）是当前 0 行、技术不确定性最高的独立工作面，参照 `wps-compat.md` 自己的建议，不应该从代码行数推算，需要专项 spike；真实核验闭环（14）是纯人工工时，不是代码量。三者合计，比较合理的态度是：**"唯一可靠执行引擎"这个说法目前只在"能对着一份没有格式、没有编号、没有嵌套表格、没有既有批注的示范合同生成语法合法的修订/批注 XML"这个范围内成立，距离"全生态唯一可靠"的字面含义，还有一个与现有体量相当甚至更大的包内工作量，外加一个从零开始、不确定性最高的插件宿主集成工作面，外加一轮从未真正执行过的双端人工核验。**

---

## 10. 证据附录

### A.1 「917 行」口径核对

用户题目给出的 8 个"生产文件"行数逐一核实无误（`wc -l` 精确复现）：488/102/70/48/38/27/16/4，**这 8 个数字加总为 793，不是 917**。差额 124 行经核实来自 `packages/output/src/test-fixtures/instruction-set.ts`（10 条 demo 指令的唯一 fixture，793+124=917，精确吻合）。这个文件技术上位于 `src/` 下、不是 `*.test.ts`，但内容是"手工编写的一份合同的十条编辑指令"，本质是测试/演示数据而非生产逻辑——不影响本报告任何实质结论，但作为"审查纪律要求核验一切可核验的数字"的示范，一并记录。测试覆盖行数（325 行 = 28+42+58+91+106）与题目口径精确吻合，未发现出入。

### A.2 `docs/research/wps-compat.md` 的实际位置

题目称其为「docs/research/wps-compat.md（本轮刚产出）」，但该路径**不存在**。实际内容位于 `archive/research-2026-07-14/wps-compat.md`（233 行），与本 session 自身 `outputs/E-wps-compat.md`（233 行）逐字节相同（`diff` 确认零差异）。按 `CLAUDE.md`「历史材料只在 `archive/`；现行文档、源码与脚本不得引用归档内容」这条工程纪律，该材料目前**未被正式收录进 `docs/`**，严格意义上现行文档尚不能引用它。本报告按题目指示引用了其内容（因为这是审查任务本身需要核实的既有调研成果，不是本报告新增到现行文档树的引用），但如实记录这个位置落差，供后续决定是否要把它正式迁入 `docs/research/`。

### A.3 关键 file:line 索引（按主题归类，供复核）

**修订核心逻辑**：`apply-instructions.ts:7`(W ns) `:8`(AUTHOR hardcode) `:102-119`(buildRPr) `:121-145`(ensureCompleteRFonts/ForAllRuns) `:157-179`(delRun/wrapAsIns) `:192-233`(批注锚点) `:244-290`(段落/行删除标记) `:292-341`(applyMinimalReplace，含 `:322` 的 pPr 清空) `:357-457`(定位分派与 applyOne) `:465-488`(总入口，`:481` 全文字体重写调用点)。

**定位**：`locate.ts:8-12`(阈值常量) `:14-37`(Levenshtein/相似度) `:48-62`(窗口扫描) `:75-102`(locateQuote 主逻辑，无 paragraphHint 参数)。

**批注 part**：`comments-part.ts:14-48`(全文件)。

**字体**：`fonts.ts:8-16`(全文件)；`apply-instructions.ts:102-119,121-145`；`compile-draft-to-docx.ts:29-41`。

**契约**：`packages/schemas/src/revision-instruction-set.ts:4-22`(locator 三策略，`:10` paragraphHint) `:72-102`(四种 kind) `:104-116`(顶层 schema)。

**安全预检**：`packages/reading-view/src/security/docx-preflight.ts:36-105`；`zip-guard.ts:1-7`(浏览器兼容注释) `:33-75`(严格 EOCD 解析) `:82-104`(zip bomb 检查)。

**唯一真实调用方**：`apps/desktop/src/output/compile-review-output.ts:27-35`(markdownToDocument) `:41-72`(compileConfirmedReviewToDocx，`:65` 原始文档来自 markdown 合成) `:44-52`(空 risk 拒绝) `:54-63`(证据分级门禁)；`apps/desktop/src/App.tsx:98-99`(contractSourceMd 来自 demo-data，代码注释自认"装配点例外") `:907-913`(调用点，未读取 `outcomes`)。

**文档声称来源**：`docs/product/vision.md:30`；`docs/status/current.md:14`（"已成立"列表）`:47-58`（架构债清单，未提及本包缺口）；`docs/architecture/system.md:15,35`（`packages/output/SPEC.md:23` 引用的依据文件，实际不含被引用的实质内容）；`packages/output/SPEC.md:1-56`（全文，尤其 `:3` 状态行、`:21-29` TODO、`:41-53` 已知缺口）；`packages/output/ACCEPTANCE.md:1-70`（全文，尤其 `:39-45` WPS 视觉核验范围、`:60-70` LAUNCH-FIX 安全预检验收）；`packages/output/verification-checklist.md`（全文 7 节，全部未勾选）；`archive/docs-legacy-2026-07-13/docs/05-调研报告-开源选型.md:139,147,149`；`archive/research-2026-07-14/wps-compat.md:13-26`(结论先行) `:41-58`(修订覆盖证据) `:68-76`(批注覆盖证据) `:108-120`(ZIP 规范风险)。

**golden 快照**：`packages/output/src/__snapshots__/golden-document.xml`、`golden-comments.xml`（10 条指令实测输出，用于比对未触碰段落的字体重写现象）；`packages/output/test/fixtures/original.docx`（33 个 `w:r`，0 个 `w:rFonts`，仅标题段落带 `w:pPr`，经 `unzip`+脚本实测确认）。

**测试文件行数**（`wc -l` 实测）：`compile-draft-to-docx.test.ts`28、`locate.test.ts`42、`docx-security-integration.test.ts`58、`apply-instructions.test.ts`91、`apply-revision-instruction-set.test.ts`106，合计 325。
