# Junicode 2.226 · P5 写本拉丁来源链

- 上游：Junicode，release `2.226`，tag commit `949db3c15ca6f4eaf4553fff30a085bae3c7e79e`。
- 发布页：<https://github.com/psb1558/Junicode-font/releases/tag/v2.226>。
- 发布包：`Junicode_2.226.zip`，58,925,009 bytes，SHA-256 `dae8ebc04a8592445c1878db8451838dd2f49d7c9912b3d4f3cab84c1516c5fe`。
- 源字体：发布包内 `Junicode/WOFF2/JunicodeVF-Roman.woff2`，1,168,784 bytes，name version `Version 2.226`，3,483 cmap codepoints，5,980 glyphs，SHA-256 `1731c456638bc75cd84f8b080505a56a7e137997e2a598cef7fe6e1ab02fcf4d`。
- 许可证：发布包内 `Junicode/OFL.txt`，SIL Open Font License 1.1，SHA-256 `6078ed582d53a416f761fd2fdeb384320b69191bf316234c21aabe71e2416822`；逐字快照见同目录 `LICENSE.txt`。
- 入库子集：`manuscript-latin-subset.woff2`，7 字、8 glyphs、6,872 bytes，SHA-256 `a9107ca58cf646f2c36713734402da9d728987d8587cd405b26b75fa88cb27e6`。
- 用字：`Courtwork`；cmap 精确为 `U+0043,U+006B,U+006F,U+0072,U+0074,U+0075,U+0077`。
- 固定轴值：`wght=400`、`wdth=100`、`ENLA=0`；不以猎奇轴造型。

生成命令：

```sh
pyftsubset JunicodeVF-Roman.woff2 --text='Courtwork' --layout-features='kern,liga,clig' --flavor=woff2 --output-file=manuscript-latin-subset.woff2
```

本批只准四处消费：hero/header 顶部品牌字、promise 标题内品牌字、卷尾品牌字、OG 既有
wordmark。中文标题、文书、功能 UI、数据/mono 与 fixture 引语均不在子集角色内。
