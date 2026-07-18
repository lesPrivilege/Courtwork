# 朱雀仿宋 · 来源与许可快照（beta 锁版）

- 上游：TrionesType/zhuque（GitHub 公开仓库），字体名 `Zhuque Fangsong (technical preview)`。
- 锁定版本：release tag `v0.212`（prerelease，2025-07-07 发布）；按选型裁定「beta 锁版」入库，不滚动更新，正式版另评估。
- 许可：SIL Open Font License 1.1。`LICENSE.txt` 为上游仓库 `v0.212` tag 的逐字快照（sha256 `66cc01ad4df62fca6936431a426104cb32a52ce8da49de9a7d643e02d7659043`）。
- 版权行未宣告任何 Reserved Font Name（仅含 OFL 样板条款），子集再分发不受 RFN 改名义务约束；仍保留原始字体名与版权记录（name ID 0–6）。
- OFL 义务对照：随站点分发保留版权声明与许可全文（本目录）；不单独出售字体文件；衍生子集仍按 OFL 授权。

## 制品链

| 制品 | SHA-256 |
|---|---|
| `ZhuqueFangsong-v0.212.zip`（release 资产，5,743,932 bytes） | `bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062` |
| `ZhuqueFangsong-Regular.ttf`（zip 内唯一文件，13,805 glyphs） | `558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4` |
| `site/assets/fonts/zhuque-fangsong-subset.woff2`（入库子集，41 glyphs / 12,316 bytes） | `84a1e19b3f0d04639009e1ade875a87aedf5aadeaa6efb4e9854fb306b044468` |

## 子集再生成

子集按站面文案精确取字（剂量纪律：hero 母题、承诺四则、收尾判词）。字符集与字节锚记录在
`site/assets/fonts/zhuque-subset.json`；deslop `display-font` 门校验「页面 zh-display 用字 ⊆ 清单文本」
与「清单 woff2Sha256 = 实际字节」，任一脱钩即构建失败。文案改动后的再生成命令（fontTools 4.63.0）：

```bash
printf '<清单 text 字段的完整字符集>' > glyphs.txt
pyftsubset ZhuqueFangsong-Regular.ttf --text-file=glyphs.txt --flavor=woff2 \
  --output-file=zhuque-fangsong-subset.woff2 --name-IDs=0,1,2,3,4,5,6,13,14 --layout-features='*'
shasum -a 256 zhuque-fangsong-subset.woff2   # 回填 zhuque-subset.json 的 woff2Sha256
```

选型与排除记录（汇文系授权不可审计、霞鹜 IPA 与 OFL 不兼容、思源宋不做门面）见调研拍板；
本快照只承载可审计来源事实。
