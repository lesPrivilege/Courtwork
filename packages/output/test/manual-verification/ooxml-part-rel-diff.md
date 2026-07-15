# OUTPUT-CORRECTNESS-1 · OOXML 保存前后 part/rel 结构差异

本文件由 `src/ooxml-diff.test.ts` 自动生成（`vitest -u` 刷新），是 verification-checklist.md
「结构差异」行里程序化可得的部分：保存前（输入 docx）与保存后（Courtwork 著录输出）的
ZIP 部件、[Content_Types].xml、document.xml.rels、document/comments 结构差异。docx zip 字节
（时间戳/压缩细节）非本层契约，故此处只比对部件内容级差异，不记 zip 级 SHA。Word/WPS 真机
打开—轻改—保存—回读的字节/SHA 记录仍按 verification-checklist.md 由人工另行留档。

## 场景一：干净合同 + SAMPLE_INSTRUCTION_SET（十条指令，全部应用）

演示 #2（未触碰 run 不被改写）、#3/#4（首次新增 comments part/关系/override）。

### ZIP 部件差异
- 新增：word/comments.xml
- 移除：（无）
- 部件总数：17 → 18

### [Content_Types].xml Override 差异
- 新增 Override：/word/comments.xml
- comments Override 出现次数（幂等应为 ≤1）：1

### word/_rels/document.xml.rels 差异
- 新增 Relationship：rId9→comments.xml(comments)
- comments 关系出现次数（幂等应为 ≤1）：1

### word/document.xml 结构计数（前 → 后）
- w:r：33 → 59
- w:ins：0 → 8
- w:del：0 → 13
- w:commentRangeStart：0 → 10
- w:commentReference：0 → 10

### word/comments.xml
- 既有批注 id：[]
- 输出批注 id：[0,1,2,3,4,5,6,7,8,9]

## 场景二：已含一条既有批注（id=4）+ 一条带批注的 replace

演示 #3/#4（既有批注/id/range 保全，关系与 override 幂等不重复，新批注 id 避让既有）。

### ZIP 部件差异
- 新增：（无）
- 移除：（无）
- 部件总数：5 → 5

### [Content_Types].xml Override 差异
- 新增 Override：（无）
- comments Override 出现次数（幂等应为 ≤1）：1

### word/_rels/document.xml.rels 差异
- 新增 Relationship：（无）
- comments 关系出现次数（幂等应为 ≤1）：1

### word/document.xml 结构计数（前 → 后）
- w:r：3 → 7
- w:ins：0 → 1
- w:del：0 → 1
- w:commentRangeStart：1 → 2
- w:commentReference：1 → 2

### word/comments.xml
- 既有批注 id：[4]
- 输出批注 id：[4,5]
