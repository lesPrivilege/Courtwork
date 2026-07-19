# 朱雀仿宋 · 来源与许可快照（beta 锁版）

- 上游：TrionesType/zhuque（GitHub 公开仓库），字体名 `Zhuque Fangsong (technical preview)`。
- 锁定版本：release tag `v0.212`（prerelease，2025-07-07 发布）；按选型裁定「beta 锁版」入库，不滚动更新，正式版另评估。
- 许可：SIL Open Font License 1.1。`LICENSE.txt` 为上游仓库 `v0.212` tag 的逐字快照（sha256 `66cc01ad4df62fca6936431a426104cb32a52ce8da49de9a7d643e02d7659043`）。
- 版权行未宣告任何 Reserved Font Name（仅含 OFL 样板条款），子集再分发不受 RFN 改名义务约束；仍保留原始字体名与版权记录（name ID 0–6）。
- OFL 义务对照：随站点分发保留版权声明与许可全文（本目录）；不单独出售字体文件；衍生子集仍按 OFL 授权。

## 制品链

| 制品 | 规格 | SHA-256 |
|---|---|---|
| `ZhuqueFangsong-v0.212.zip`（release 资产） | 5,743,932 bytes | `bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062` |
| `ZhuqueFangsong-Regular.ttf`（zip 内唯一文件） | 13,805 glyphs | `558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4` |
| `site/assets/fonts/zhuque-fangsong-subset.woff2`（入库子集·文书轨） | 104 字 / 128 glyphs / 33,036 bytes | `8577a034b5632b59fc641344bc61169ce2a2b9fee1a74e1726b6dd5563b06f22` |
| `site/assets/fonts/doc-latin-subset.woff2`（入库子集·文书轨拉丁分段） | 25 字 / 94 glyphs / 8,488 bytes | `f3a6ce7a521a03f83943018aeb915ad2e9091efb56f4f3986d3687e895263f48` |

拉丁分段取自 **Noto Serif SC 2.003 Regular**（SIL OFL 1.1，来源与 RFN 核定见 `../noto/SOURCE.md`），
不取朱雀——正是因为仿宋拉丁字形弱（编排义务②）。其 `unicode-range` 与文件覆盖面逐位相等，
声明见 `site/assets/fonts/zhuque-subset.json` 的 `latinSegment` 节。

> **本表数字全部是可解析实测契约**（deslop `font-provenance` 门，二轮驳回回炉后补全）：
> 字数对 cmap 映射码位、glyph 数对 `maxp.numGlyphs`、字节数对文件长度、SHA 对文件内容——
> 四项各自比对实测，任一不符即红；数字被整个删掉也红（**没有数字不等于没有谎**）。
>
> 两轮回炉的教训各不相同，都记在这里：
> 一轮是**族内漏铺**——37 字子集扩容到 104 字时本表未随动，manifest 侧已有「清单 ↔ 字节」双锚
> 而出处记录侧裸奔，链断了一环无人察觉。
> 二轮是**SHA 只锚内容，不锚声称**——补了 SHA 之后，「128 glyphs / 33,036 bytes」这类人读数字
> 仍可在 SHA 全对的前提下静默撒谎（制品换一字节 SHA 必变，但叙述不会）。故凡权威记录里的
> 可解析数字，都要有各自的机器对应，**而不是被交叉抄写**——字数因此也从制品的 cmap 量，
> 不取清单 `text` 长度：取清单只是把抄写链拉长一环，改清单不重切子集时谎照样过门。

## 子集再生成

子集按站面文案精确取字。**取字面自三轨字体制落地起为**：`zh-display`（品牌时刻：hero 母题、
承诺四则、收尾判词）∪ `zh-doc`（文书轨：微演示原件正文、三处引语、修订建议）＝ 104 字。
字符集与字节锚记录在 `site/assets/fonts/zhuque-subset.json`；deslop `display-font` 门校验
「页面 zh-display/zh-doc 用字 ⊆ 清单文本」与「清单 woff2Sha256 = 实际字节」，
`font-provenance` 门另校验「本文件登记 SHA = 实际字节」，任一脱钩即构建失败。

文案改动后的再生成命令（fontTools 4.63.0）：

```bash
# 文书轨主子集
printf '<zhuque-subset.json 的 text 字段完整字符集>' > glyphs.txt
pyftsubset ZhuqueFangsong-Regular.ttf --text-file=glyphs.txt --flavor=woff2 \
  --output-file=zhuque-fangsong-subset.woff2 --name-IDs=0,1,2,3,4,5,6,13,14 --layout-features='*'

# 拉丁分段（取自 Noto Serif SC Regular，非朱雀）
printf '<zhuque-subset.json 的 latinSegment.text 字段>' > latin.txt
pyftsubset NotoSerifSC-Regular.otf --text-file=latin.txt --flavor=woff2 \
  --output-file=doc-latin-subset.woff2 --name-IDs=0,1,2,3,4,5,6,13,14 --layout-features='*'

shasum -a 256 zhuque-fangsong-subset.woff2 doc-latin-subset.woff2
# 回填两处：zhuque-subset.json 的 woff2Sha256 / latinSegment.woff2Sha256，
#          与本文件「制品链」表——两处都回填才算链闭合（font-provenance 门会核）
```

选型与排除记录（汇文系授权不可审计、霞鹜 IPA 与 OFL 不兼容、思源宋不做门面）见调研拍板；
本快照只承载可审计来源事实。
