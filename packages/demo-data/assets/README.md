# 合同 PDF 字体资产

`courtwork-contract-subset.woff2` 是从 Noto Sans CJK SC Regular 仅按样板合同与生成标记所需字符裁出的 WOFF2 子集，用于让 Chromium 生成的 PDF 在不同机器上保持可提取的标准 Unicode 文本，不依赖系统中文字体。

- 上游：https://github.com/notofonts/noto-cjk
- 原始字体：`Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf`
- 许可证：同目录 `OFL.txt`（SIL Open Font License 1.1）
- 子集工具：fonttools `pyftsubset`

如果 `main-contract.md` 新增了字符，需要从上述原始字体重新生成子集，并执行 MATERIAL-0 测试确认没有字体回退或兼容字符漂移。
