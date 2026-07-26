# output 测试原件

## `original.docx`

历史 golden 场景原件（W4 起沿用）。含正文、三行付款表格、Word 原生 styles/settings/theme/numbering。
不含图片、页眉页脚与既有批注。

## `contract-review-complex.docx`

`CONTRACT-OUTPUT-TRUTH-1` 的**唯一**复合原件。数字签名、宏、XXE、zip bomb、大小写/路径变体与阴性
对照件全部在测试内存中由这枚原件派生——不为每个探针再提交 binary fixture。

- 字节数：`39562`
- SHA-256：`546065be238664130b459c9b9f0e236e8a5e9ec7fd1af8b03640cab8ed8b3028`

### 来源与派生方式

从同目录 `original.docx` 机械派生，打包时所有 entry 取同一固定 mtime
`2026-01-05T00:00:00.000Z`、`level: 6`，故可逐字节复现。上表两个数字由
`contract-review-fidelity.test.ts` 断言，README 与实物漂移即翻红。派生动作逐条如下：

1. 新增 `word/media/image1.png`——8×8 truecolor PNG（朱色 `#B32B2B`），由固定 IHDR/IDAT/IEND
   chunk 构造，`zlib.deflateSync(level 9)` 压缩，字节确定。
2. 新增 `word/header1.xml`、`word/footer1.xml`，并在 `w:sectPr` 内加 `headerReference` /
   `footerReference`。
3. 新增 `word/comments.xml`，含两条既有批注（`w:id="0"`、`w:id="1"`，作者「王律师」）；在
   `word/document.xml` 内为价款段与质保段各加一对
   `commentRangeStart` / `commentRangeEnd` + `commentReference`。
4. 在签署段之后插入一段真实 `w:drawing`（`wp:inline` + `pic:blipFill` + `a:blip r:embed="rIdImage1"`）。
5. `word/_rels/document.xml.rels` 追加 header / footer / image / comments 四条关系；
   `[Content_Types].xml` 追加 `png` Default 与 header / footer / comments 三条 Override。

### 结构清单

原件必须实际含下列结构，`contract-review-fidelity.test.ts` 对其逐项断言：

| 结构 | 位置 |
|---|---|
| 表格（3 列 × 4 行付款进度表） | `word/document.xml` `<w:tbl>` |
| 内嵌图片 | `word/media/image1.png` + `r:embed="rIdImage1"` |
| 页眉 / 页脚 | `word/header1.xml`、`word/footer1.xml` |
| 样式 | `word/styles.xml`、`word/stylesWithEffects.xml` |
| 既有批注与 range | `word/comments.xml`（id 0、1）+ document.xml 内的 range 对 |
| 既有关系 | `word/_rels/document.xml.rels` |
| 既有 content type | `[Content_Types].xml` |

### 未包含

**没有** OPC 数字签名、宏、DOCTYPE/ENTITY 或异常压缩比——这枚是**阴性**基线；所有阳性探针由测试
在内存中加签名 part / relationship / content type 后派生。
