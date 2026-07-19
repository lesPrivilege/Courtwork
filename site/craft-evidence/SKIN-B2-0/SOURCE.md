# SKIN-B2-0 · 字体来源与许可快照

产品壳三轨字体制（`docs/design/typography-density.md` 发凡一）的两条衬线轨用字。
两件均为 SIL Open Font License 1.1，锁版入库、不滚动更新。

## 一 · 朱雀仿宋（文书轨）

- 上游：TrionesType/zhuque（GitHub 公开仓库），字体名 `Zhuque Fangsong (technical preview)`。
- 锁定版本：release tag `v0.212`（prerelease，2025-07-07）。承 SITE-CRAFT-2 的「beta 锁版」裁定，与站面同版同源。
- 许可：SIL OFL 1.1。`zhuque/LICENSE.txt` 为上游 `v0.212` tag 的逐字快照（sha256 `66cc01ad…9043`，与 SITE-CRAFT-2 快照逐字节相同）。
- 版权行未宣告 Reserved Font Name，子集再分发不受 RFN 改名义务约束；仍保留原始字体名与版权记录（name ID 0–6）。
- **取回即校验**：本批重新取回的 release 资产与 SITE-CRAFT-2 早先记录的锚**逐字节相符**——zip 5,743,932 bytes / `bb8b661a…c062`，内含 TTF `558c6273…3bc4`。同一制品两次独立取回同哈希，来源事实可复核。

## 二 · 思源宋体 SC（标题轨）

- 上游：adobe-fonts/source-han-serif（GitHub），release tag `2.003R`（2024-07-30）。
- 取用资产：`14_SourceHanSerifCN.zip`（68,961,106 bytes，sha256 `aa3f9134…d819`），取其 `SubsetOTF/CN/` 下 Regular 与 SemiBold 两个字重。
- 许可：SIL OFL 1.1，`source-han-serif/LICENSE.txt` 为该 release 内 `LICENSE.txt` 的逐字快照（sha256 `9ff5bb56…b903`）。
- **命名陷阱（已立契于子集清单）**：CN 包的内嵌字族名是 `Source Han Serif CN`，且 SemiBold **自成一族**（`Source Han Serif CN SemiBold`），与 token 字栈所写的 `Source Han Serif SC` 不同名。B2-1 必须用 `@font-face` 把两个字重挂到同一 `cssFamily` 别名下；只写 `font-family` 而漏 `@font-face`，字栈会**静默穿透**到系统衬线——静默降级零容忍，故 `subset-manifest.json` 显式记 `cssFamily` 与 `upstreamFamily` 两栏，排印门校验字栈与清单对齐。

## 三 · 制品链

| 制品 | 字节 | SHA-256 |
|---|---|---|
| `ZhuqueFangsong-v0.212.zip`（release 资产） | 5,743,932 | `bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062` |
| `ZhuqueFangsong-Regular.ttf`（zip 内唯一文件，13,805 glyphs） | — | `558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4` |
| `14_SourceHanSerifCN.zip`（release 资产） | 68,961,106 | `aa3f9134809de83bb2add0bd965e61421772ce2fd8628fe98516b77c93e1d819` |
| 三件入库子集 | 见 `apps/desktop/src/assets/fonts/subset-manifest.json` | 同上（`woff2Sha256` 逐件锚定，排印门校验） |

OFL 义务对照：随产品分发保留版权声明与许可全文（本目录）；不单独出售字体文件；衍生子集仍按 OFL 授权。

## 四 · 子集覆盖与再生成

**两轨分档（2026-07-19 定谳）**：文书轨取 **GBK**（法律文书是生僻人名主场，中途换字体是文书感正面伤口）；
标题轨维持 **GB2312** 当期，升档判据＝真机案题缺字实录，挂发行门复议。
字符集由脚本**确定性生成**（逐字节对解码），不手工维护字表——手写字表会漂，解码不会。

| 件 | 轨 | 字符集 | 覆盖 | 体积 |
|---|---|---|---|---|
| `zhuque-fangsong-gbk.woff2` | 文书 | GBK ∩ 字体实有 glyph 集 | GB2312 6,763/6,763 · GBK 11,006/20,902 | 4,433 KB |
| `source-han-serif-sc-400-gb2312.woff2` | 标题 400 | GB2312 | 6,763/6,763 | 1,833 KB |
| `source-han-serif-sc-600-gb2312.woff2` | 标题 600 | GB2312 | 6,763/6,763 | 1,871 KB |
| | | | | **8,137 KB** |

### 缺集口径（如实登记）

朱雀 v0.212 只有 GBK 汉字的 **52.66%**（11,006/20,902）——`∩ 实有 glyph 集`即因此而设：
按 GBK 全集切会得到一堆空 glyph，虚报覆盖。缺的 9,896 字集中在**生僻与历史用字**
（`丂丆丒丠丣` 类），不是人名主场。**人名主场实查**：18 个常见生僻人名字（喆堃玥昇甯燊淼焱鑫珺
頔玚翀彧琀奭夔龘）中朱雀有 17，仅 `頔`（U+9814）缺——定谳的取档理由经此实查成立。

### GB18030 超集回退口径

字栈＝拉丁配衬 → CJK 子集 → 系统衬线。文书轨缺字（如 `頔`）的真实回退是**两级而非三级**：

> **中间那档思源子集对文书轨永不命中。** 朱雀已覆盖 GB2312 全集，而思源子集只到 GB2312——
> 两者缺集不互补，凡朱雀缺的字思源子集必也缺。故文书轨实际是「朱雀 → 系统 Songti SC」。

系统 Songti 为 GB18030 级覆盖，**字必能出**，但字形可见地换宗（仿宋 → 宋体）。消除该跳变需把思源
也升 GBK（+约 4 MB）或换覆盖更全的文书轨字体——属发行门复议项，本批不自决。

```bash
# 字符集（确定性生成，无外部字表依赖）；GBK 版把范围换成 0x81–0xFE / 0x40–0xFE 并滤 CJK 区
python3 -c "
chars=[]
for hi in range(0xB0,0xF8):
    for lo in range(0xA1,0xFF):
        try: chars.append(bytes([hi,lo]).decode('gb2312'))
        except Exception: pass
open('gb2312.txt','w').write(''.join(chars))"
# 文书轨须先与字体实有 cmap 求交，避免切出空 glyph 虚报覆盖
python3 -c "
from fontTools.ttLib import TTFont; import io
cm=set(TTFont('<上游原件>').getBestCmap())
gbk=io.open('gbk.txt',encoding='utf-8').read()
io.open('set.txt','w',encoding='utf-8').write(''.join(c for c in gbk if ord(c) in cm))"
# 子集化（fontTools 4.63.0）
pyftsubset <上游原件> --text-file=set.txt --flavor=woff2 \
  --output-file=<目标>.woff2 --name-IDs=0,1,2,3,4,5,6,13,14 --layout-features='*'
shasum -a 256 <目标>.woff2   # 回填 subset-manifest.json 的 woff2Sha256 与 bytes
```

## 五 · 未入仓项

**方正聚珍新仿不入仓**。凡例争点二已拍板「先朱雀落地、三张许可并行核」；三张许可（个人非商业 / web 嵌入 / 桌面内嵌发行）的核实是外部流程，核清后作为**置换项**经 token 层换字栈接入（机制同换肤，`family.body` 改一行）。任一张未核清即不置换——不悬置、不静默替换。
