# SKIN-R2 P5 · Pages 字体全量覆盖与写本拉丁提案（待架构逐行签署）

状态：**未开工；无实现授权**。基线 `main@434c7fce776145b709d8b5f7c7257901fc8b81af`。

本文件只把 `27990dd` 的产品复裁和排印凡例「发凡五」投影为可签的平铺行；它不是批准本身，
也没有向 `docs/design/r2-tier-ledger.json` 写入任何行。架构签署前，站面消费值、字体资产、门禁与
DOM 均不得修改。

## 1. 为什么停在提案

实查档位账：

```text
jq '[.entries[] | select(.approvedProposalLine | startswith("P5-"))]' docs/design/r2-tier-ledger.json
[]
```

P0 已规定「每一视觉变更绑定唯一档位与唯一已批提案行」。当前零 `P5-*` 行，故不能把
`27990dd` 的段落自行编号后当作授权。本文请求架构逐行签署下表；签署后才把批准行投影进平铺账。

## 2. 前置收尾与既有成果核验

- SITE-CRAFT-2 / SKIN 前置 Pages 两轮上线复核已经记录在 `release/DEPLOYMENT.md`：公开部署精确
  head `19242d2`，Safari 宽窗与 `430px` 窄窗两轮均放行，workflow run `29688703720` 成功。
- 四份原验收提交本身不是 `434c7fc` 的祖先（独立 clone 原始提交不可直接成为 main 祖先），但报告
  已回灌：`daaf0d5` 的稳定 patch-id 对应 `6639645`；`7557543` 对应 `2ff4ef4`；
  `861d04c` 的 SKIN-B3 报告落在 `698b984`；`45d44c0` 的 SKIN-B4 报告落在 `3c0bef2`，且
  `apps/desktop/ACCEPTANCE.md` 首节保留对象 `758553a` 与放行结论。
- hero schema 微演示、磁青宗、朱帧边界与墨迹压线实验均已有 SITE-CRAFT-2 B2/B4/B6/B8/B9
  证据。本批不重做、不扩散，也不把它们算作新成果。

## 3. computer-use 基线状态

已完整读取并依 `browser:control-in-app-browser` 技能连接本地 `http://127.0.0.1:18961/`；按规定的
bootstrap 诊断后，运行时 `agent.browsers.list()` 返回空数组。故本会话**没有新摄前帧**，也没有以
Playwright 或截图脚本冒充 computer-use。既有真帧仅作历史索引：

- `site/craft-evidence/SITE-CRAFT-2/B7/01-full-1440.png`
- `site/craft-evidence/SITE-CRAFT-2/B7/02-hero-1440.png`
- `site/craft-evidence/SITE-CRAFT-2/B7/07-reduced-hero.png`
- `site/craft-evidence/SITE-CRAFT-2/B7/08-nojs-hero.png`
- `release/evidence/pages-2026-07-19/round-1-hero-safari.png`
- `release/evidence/pages-2026-07-19/round-2-narrow-safari.png`

签署后续作的第一项仍是补摄同一代码基线的新前帧；这些旧帧不能替代 P5 前／后对照。

## 4. 现行字体面与精确缺口

| 面 | 现行消费 | P5 事实 |
|---|---|---|
| 中文标题 | Noto Serif SC 双字重精确子集 | 保持；本子批不改中文标题 |
| 文书正文 | 朱雀仿宋 + Courtwork Doc Numerals | 保持；不把写本拉丁放进正文／fixture 引语 |
| 功能正文与 UI | `--sans` 仍含 `-apple-system` / `BlinkMacSystemFont` / `PingFang SC` 等系统栈 | `27990dd` 要求站面正文与 UI 残面清除系统栈，但没有核定替换字体 |
| 数据轨 | `--mono` 系统 mono 栈 | 发凡五和 P5 基本票面均说数据轨不入展示字；是否也要随「全量覆盖」内嵌，文本存在歧义，须显式裁定 |
| 表达性拉丁 | 没有独立轨；`Courtwork` 随所在中文／UI 栈 | 发凡五允许 hero／章题／印记类先在 Pages 试验写本源 |
| OG | `site/og.html` 仍内联同族系统 sans/mono | 若 P5 声称「站面全量」，OG 必须同批裁定，不能留第二张旧脸 |

当前视觉 HTML 的静态文本共有 `464` 个不同码位；因此「精确子集」必须由 DOM 角色重新抽取，不能
把整页字符一股脑塞进每个子集，也不能只以加载成功代替真上身。

## 5. 写本拉丁候选来源（提案，不是定值）

候选为 **Junicode 2.226**。理由限于凡例已给方向：它是面向中古文献／写本研究的开放字体，
不是 Garamond/Cormorant 一类通行展示衬线；官方 release 随 SIL OFL 1.1，字形源与许可链可固定。

| 锚 | 实测值 |
|---|---|
| tag / commit | `v2.226` / `949db3c15ca6f4eaf4553fff30a085bae3c7e79e` |
| release archive | `Junicode_2.226.zip`, 58,925,009 bytes, SHA-256 `dae8ebc0…c5fe` |
| release WOFF2 | name table `Version 2.226`, SHA-256 `1731c456…f4d` |
| OFL snapshot | SHA-256 `6078ed58…6822`；版权行未列 Reserved Font Name |
| coverage | 3,483 codepoints / 5,980 glyphs；`wght 300–700`, `wdth 75–125`, `ENLA 0–100` |

只读探针把现有表达字串 `Courtwork` 精确切为 7 个码位、8 glyph、5,904 bytes
（SHA-256 `736e20de…13a`，只开 `kern,liga,clig`）。这证明子集路线可行，但探针文件不入仓；签署后须
从已锁 release 重新生成、写 SOURCE/许可快照、manifest 与最终制品 SHA。

风险如实登记：tag 仓库内 `webfiles/JunicodeVF-Roman.woff2` 的 name table 仍是旧 `2.003`，
不得拿它冒充 2.226；只能消费 release archive 内 name table 明确为 `Version 2.226` 的 WOFF2。

## 6. 请求签署的平铺行

下列 ID 均为**请求编号**；只有架构逐行签署后才成为 `approvedProposalLine`。

| 请求行 | 唯一 target | 档位 | 提案 | 签署时必须补的值 |
|---|---|---|---|---|
| `P5-F01` | `site/styles.css#@font-face(Courtwork-Manuscript-Latin)` | Pages 激进档 | 以 Junicode 2.226 release 为写本拉丁源；只入精确子集、`font-display: swap`、`unicode-range` 与 cmap 逐位相等 | 核定 Junicode；核定轴值（建议默认 `400/100/0`，不以猎奇轴造型） |
| `P5-F02` | `site/styles.css#.wordmark > span` | Pages 激进档 | 现有 `Courtwork` 作为 hero 顶部品牌记号消费展示轨；中文零触碰 | 核定字腔、baseline、字号与 tracking 上限 |
| `P5-F03` | `site/styles.css#.promise-heading h2 .latin-manuscript` | Pages 激进档 | 只包裹现有标题里的 `Courtwork`；中文继续 Noto 标题轨且为主声部 | 核定是否纳入，或明确退回普通标题轨 |
| `P5-F04` | `site/styles.css#.closing .eyebrow .latin-manuscript` | Pages 激进档 | 只包裹卷尾现有 `Courtwork`，作为章题记号；卷次中文与 mono 角色不变 | 核定是否纳入，或明确退回功能轨 |
| `P5-F05` | `site/og.html#.wordmark` | Pages 激进档 | OG 的现有 `Courtwork` 与站面品牌记号同谱；不另造字体／几何真源 | 核定 OG 是否属于本批；若退，P5 不得宣称 OG 全量覆盖 |
| `P5-F06` | `site/styles.css#:root|--sans` | Pages 激进档 | 兑现 `27990dd`：正文与 UI 残面清除苹方／系统栈，改为许可和实际用字均可锁的开放字体 | **必须核定具体 CJK/UI 字体、版本、字重、fallback 与来源哈希；当前文档没有该值** |
| `P5-F07` | `site/styles.css#body` | Pages 激进档 | body 继续只消费一个 UI 字槽；P5-F06 通过后，以角色提取的静态用字精确子集覆盖继承面 | 核定 P5-F06 后随签；不得绕过文书／标题／数据的具名轨 |
| `P5-F08` | `site/og.html#body` | Pages 激进档 | 清除 OG 独立的系统 sans；与 P5-F06 同源同版本，另按 OG 实际用字切子集或消费同一覆盖包 | 核定是否允许共享站面 UI 子集；不允许则须单列制品与 manifest |
| `P5-F09` | `site/styles.css#:root|--mono` | Pages 激进档 | **建议判「留」**：数据轨不入展示字；保持现行数据语义与静止律 | 架构须明确「留系统 mono」是否与“全量覆盖”措辞相容；若要求替换，须另给开放 mono 值，不能偷渡 |
| `P5-F10` | `site/scripts/deslop-scan-lib.mjs#p5-font-coverage` | Pages 激进档 | 增一条平铺门：系统 UI 栈零残留、每个新 face 的 SOURCE/SHA/cmap/manifest/消费逐位相等、写本类只出批准选择器 | 核定门名与 P5-F01…F09 的 target 集，不引通用字体状态机 |
| `P5-F11` | `site/scripts/deslop-scan-lib.mjs#p5-data-static` | Pages 激进档 | 以既有数据节点白名单守住字符、包围盒与动效 AST 零漂移；字体批不得借机改 hero 微演示数据 | 核定继续复用既有节点集，不新增数据 schema |
| `P5-F12` | `site/SPEC.md#SKIN-R2-P5` | Pages 激进档 | 记录来源链、四律克制审计、红绿证、前后帧、复杂度与拒项；不更新 `current.md` | 随以上行整体签署 |

## 7. 签署后固定 TDD 与验收形状

第一枚红测必须在消费值前建立，至少精确触红：

1. 现行 `site/styles.css` 与 `site/og.html` 的系统 UI 栈仍存在；
2. 写本 face、manifest 与批准消费点任一缺失；
3. manifest 多一个或少一个实际码位；
4. 来源 archive / WOFF2 / OFL 任一 SHA 漂移；
5. 写本类落进 `.zh-doc`、`.mono`、fixture 引语、数据节点或未批准 selector；
6. 新增 keyframe、transition 属性或 JS 动画；
7. 缺任一 P5 档位账行或一个 target 绑两行。

实现后还须：

- browser computer-use 补摄签署基线前帧与实现后帧：1440、1600、375，另含 reduced-motion 与 JS-off；
- 逐位核对中文标题、文书、数据字符与数据节点包围盒不变；
- 真渲以像素指纹＋不存在族阴性对照证明新 face 真上身，不能只看 `document.fonts` loaded；
- `pnpm site:guard`、site build、`pnpm lint`、`pnpm test`、`pnpm -r build` 全绿；
- 实现 commit 交不同会话在独立 clone 验收。本会话只实现，不验收。

## 8. 需要架构回复的最小决策

1. 逐行签／退 `P5-F01…P5-F12`；
2. 为 P5-F06 核定一个具体开放 CJK/UI 字体及版本，或明确删去 `27990dd` 的“UI 残面全量覆盖”实现要求；
3. 明确 P5-F09：数据 mono 留系统栈，还是另签开放 mono；
4. 核定 Junicode 2.226 与三处站面 + OG 消费点；
5. 浏览器可用后补摄新前帧，才允许进入消费值实现。

以上五项未齐之前，诚实终态是**提案待签**，不是 P5 实现完成。

## 9. 提案尖端基线门

本提案只新增本目录两份证据文件，未改站面消费值。隔离 clone 实跑：

| 门 | 结果 |
|---|---|
| `pnpm site:guard` | PASS，58/58；deslop 852 active text files |
| `pnpm site:build` | PASS |
| `pnpm lint` | PASS |
| `pnpm -r build` | PASS（13/14 workspace；仅既有 chunk-size 提示） |
| `pnpm test`（workspace build 后） | PASS，148 files / 1261 tests |

fresh clone 初次按 `lint → test → build` 直跑时，test 因 workspace `dist` 尚未生成而出现
62 个 package-entry 缺失 suite；先执行仓库既有的 `pnpm -r build` 后，同一 test 全量转绿。
这是 fresh clone 的前置顺序事实，不是 P5 代码缺陷，也未以重跑隐藏。
