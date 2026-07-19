# Noto Serif SC · 来源与许可快照（标题轨）

- 上游：`notofonts/noto-cjk`（GitHub 公开仓库），release tag `Serif2.003`（2024-07-30）。
- 取 **Noto 版**而非 Adobe `source-han-serif`——两者字形同源，但许可细节不同，见下「RFN 核定」。
- 许可：SIL Open Font License 1.1。`LICENSE.txt` 为 release 资产内 `LICENSE` 的逐字快照
  （sha256 `6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2`）。

## RFN 核定（决定子集是否必须改名）

字体 `name` 表实读（platformID 3）：

| name ID | 值 |
|---|---|
| 0 copyright | `© 2017-2024 Adobe (http://www.adobe.com/).` |
| 1 family | `Noto Serif SC` |
| 7 trademark | `Noto is a trademark of Google Inc.` |
| 13 license | `This Font Software is licensed under the SIL Open Font License, Version 1.1. …` |
| 14 licenseURL | `http://scripts.sil.org/OFL` |

**版权行未宣告任何 Reserved Font Name。** OFL 1.1 定义「Reserved Font Name 指版权声明**之后**
被如此指明的名称」，此处无——故子集（属 Modified Version）**不受 §3 改名义务约束**，
可保留原始字体名 `Noto Serif SC`。

对照：Adobe `source-han-serif` 的许可宣告保留字体名 `Source`，其子集必须改名。
选 Noto 版即免掉这层改名义务与随之而来的品牌噪音——这是**选型理由**，不是事后解释。

name ID 7 的 trademark 属商标法范畴，与 OFL 的改名义务是两回事，不构成保留字体名。

OFL 义务对照：随站点分发保留版权声明与许可全文（本目录）；不单独出售字体文件；
衍生子集仍按 OFL 授权；子集内保留 name ID 0/13/14（实测在场，见下）。

## 制品链

| 制品 | 大小 | SHA-256 |
|---|---|---|
| `14_NotoSerifSC.zip`（release 资产） | 68,960,596 B | `c58cd035ab2adb003510846db9ec80c35b1b97755d329486c3a1e88edfe6e98e` |
| `SubsetOTF/SC/NotoSerifSC-Regular.otf`（zip 内，31,058 glyphs） | 11,625,800 B | `e8f396decc1f0963a016a989c3d8852e863d1350996f573860a80767c83a1cd3` |
| `SubsetOTF/SC/NotoSerifSC-Bold.otf`（zip 内，31,058 glyphs） | 12,094,336 B | `24693d48bdb9152f0a06b02af625638a1097abd6de4010ebba027f6e82710527` |
| `site/assets/fonts/noto-serif-sc-regular-subset.woff2`（入库，107 glyphs） | 25,632 B | `0d999937afb73e134236ef0cab2e0ba051a74aa2d314d52dd7b06bb45b4abdc1` |
| `site/assets/fonts/noto-serif-sc-bold-subset.woff2`（入库，107 glyphs） | 25,856 B | `906d006023b007eee2b1683b65412514c4f4fab8c26f15714b289eb205961347` |

原始 OTF **不入仓**，只入库两枚精确子集（合计 51KB）。

## 子集再生成

字符集＝页面 `zh-title` 消费面（h2/h3，87 字）；两枚字重共用同一字符集。清单与字节锚记录在
`site/assets/fonts/noto-subset.json`，deslop `display-font` 门校验「页面 zh-title 用字 ⊆ 清单文本」、
「清单 `weights.400/700.woff2Sha256` = 实际字节」与「`.zh-title` 真消费 `var(--font-title)`」，
任一脱钩即构建失败。文案改动后的再生成命令（fontTools 4.63.0）：

```bash
printf '<清单 text 字段的完整字符集>' > title-glyphs.txt
for W in Regular Bold; do
  pyftsubset SubsetOTF/SC/NotoSerifSC-$W.otf --text-file=title-glyphs.txt --flavor=woff2 \
    --output-file=noto-serif-sc-$(echo $W | tr A-Z a-z)-subset.woff2 \
    --name-IDs=0,1,2,3,4,5,6,13,14 --layout-features='*'
done
shasum -a 256 noto-serif-sc-*.woff2   # 回填 noto-subset.json 的 weights.*.woff2Sha256
```

子集内许可记录实测在场：`family=Noto Serif SC`、`copyright=© 2017-2024 Adobe (http://www.adobe.com/).`、
`licenseURL=http://scripts.sil.org/OFL`——OFL §1「版权声明与许可须随字体软件同行」成立。
