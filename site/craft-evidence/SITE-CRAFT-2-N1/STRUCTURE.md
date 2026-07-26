# SITE-CRAFT-2 · N1 叙事批 · 结构稿

分支 `codex/site-craft-2-n1`，基线 `main@c180d9f`。本稿先于实现提交（票面要求：结构稿 → 实现，验收逐句核）。

借形来源：OpenWork 五段递进叙事骨架（架构已裁，只借信息架构，不借美学）。宣称上限：`docs/status/current.md`（行号以基线时点为准；合入时如 current.md 前进，按当时行文复核，见「时效标注」列）。

## 一 · 分区清单（目标 DOM 顺序）

| 序 | 分区 | 现状 | N1 动作 | 借形对应 |
|---|---|---|---|---|
| 0 | header + hero（一句定位 + 双 CTA + 刊记）+ hero 微演示窗 | 已有 | **不动** | 骨架①：hero 一句定位 + 双 CTA |
| 1 | 卷一 · 证据链（原件→引语→结论→人工确认） | 已有 | **不动** | 骨架②：任务步骤分解演示（我方形态：schema 工作面，非终端美学） |
| 2 | 卷二 · 真实工作面（对话/确认/修订连续台账） | 已有 | **不动** | 骨架③：能力分区 |
| 3 | 骑缝分隔 + 卷三 · 垂类泛化（场景台账 + 数据区） | 已有 | **不动**（数据区绝对静止不破） | 骨架④前半：场景模块 |
| 4 | 卷四 · 产品边界（承诺四则 + 落定章 + 设计边界井） | 已有 | **不动** | —（我方独有的克制叙事） |
| 5 | **卷五 · 发布事实**（新增） | 无 | **新增**：可核验发布事实台账四行 | 骨架④后半：「集成指南」改造为「验证事实」；冷色杠杆⑤正式落位 |
| 6 | **卷六 · 有问有答**（新增） | 无 | **新增**：常问六则，静态问答台账 | 骨架⑤：FAQ——把诚实边界写成叙事资产 |
| 7 | 卷尾 · closing（下载 CTA + 未公证注记）+ footer | 已有 | **不动** | 骨架⑥：下载/页脚 |

现行分区已天然覆盖骨架①②③④前半与⑥；N1 的净动作 = 新增卷五、卷六两个分区。hero 一句定位（「模型只生成，不裁决。」）与双 CTA 均已在位且受门（release-truth 双 DMG 口 + deslop CTA 状态机），不重写。

## 二 · 票面既有项复核（三项已在磁青宗批闭合，本批零动作）

| 票面项 | 复核结论 | 证据坐标 |
|---|---|---|
| `siteFrozenColors` 冻结表到期处置 | **已按条款整表退役**（到期删除、回绑 token 名，按名绑定 `themes.dark`） | 提交 `ebb5fcb`；`site/craft-evidence/SITE-CRAFT-2/README.md` B4 节；`deslop-scan-lib.mjs` 现行 `siteDarkColors` 按名映射 |
| `site/assets/icon.svg` 品牌一致性挂账 | **已闭合**：B4 换宗、B9 重做为 master 4-rect 谱系登记变体 + `brand-lineage` 门（master 现算比例，双向漂移触红）；og.html 同源消费 | `SITE-CRAFT-2/README.md` B9 节；`deslop-scan.mjs` `checkBrandLineage` 调用；现行 `site/assets/icon.svg` 为 4-rect 形态 |
| hero 微演示落位形态 | **已落位**（B2）：票面「录制回放**或**轻交互重建」二选一，B2 择「诚实重建」并留痕——文本全部取自已验 fixture 字串、mac-bar 标注「微演示重建 · 合成数据试点」、26 帧逐帧采样、`demo-motion` 门锁属性白名单；例外条款留痕在 `docs/design/site-evidence-line.md`（B2 票面授权修订） | `SITE-CRAFT-2/README.md` B2 节；`site-evidence-line.md` 信息结构第 2 条与「微演示动效契约」条 |

N1 沿用 B2 形态不动。派单文本「优先录制回放、重建降级留痕」对应的是**首次落位**的取形次序；该项已由 B2 依票面「或」式二选一落位并经清账（current.md `SITE-CRAFT-2`（`23e2485`）入已清账表），N1 不推翻既有验收。

## 三 · 零新动效声明

卷五、卷六全部静态：零 keyframe、零 transition、零 reveal 挂载（不进 `main.js` 的 `[data-reveal]`/`.evidence-step` 选择面，`main.js` 与其 AST 锁零触碰）。发布事实属数据面，按「数据区绝对静止」处理。因此本批**不触** `docs/design/site-evidence-line.md` 例外条款（新增动效才需重新拍板），与「禁触 docs/」边界自洽。既有五族动效（typer / demo-attn×3+zhu / ghosty / evidence-step 底色 / 按压）原样保留，帧证阶段以「运行动画名集合 ⊆ 既有集合」作机器自证。

## 四 · 新增文案 · 逐句真源对照表

「真源」列：能力宣称锚 `docs/status/current.md`（基线 `c180d9f` 时点行号）；工程事实锚仓内文件坐标。「时效」列标 △ 的行与在途 `CONTRACT-OUTPUT-TRUTH-1` 收束面相邻，合入时按当时 current.md 复核措辞。

### 卷五 · 发布事实（id `facts`）

眉：`卷五 · 发布事实`（鱼尾记号，件库 `<use>`）
主句（h2，泥金按既有 `.section-heading h2.zh-title` 白名单）：**「口说无凭，立字为据。」**——本卷只列可核验事实，主句为体例引语，非能力宣称。

| # | 行头 | 正文（逐句） | 真源 | 时效 |
|---|---|---|---|---|
| F1 | 发布制品 | 当前发布是 v0.1.2：Apple Silicon 的 DMG，开发构建、ad-hoc 签名、未公证。制品 SHA-256 以卷首刊记为唯一在页真源，下载后可自行校验。 | current.md:13-16（发布真值节）；刊记 SHA 由 `release-truth` 门与 `release/*.sha256` 逐位核 | — |
| F1 链 | → GitHub Release v0.1.2 | current.md:14 | — |
| F2 | 部署实录 | 发布不是一句宣称，是一串留档记录：构建、回下载校验、Pages 部署与两轮线上逐帧复核，全程可查。 | current.md:15「发布后回下载校验通过」+ :19-20（两次站面更新各记两轮上线复核） | — |
| F2 链 | → release/DEPLOYMENT.md（仓内实存，deslop 新增链接实存门核） | current.md:17 | — |
| F3 | 真机证据 | 发布版的真机截图与运行核对清单按版本归档；本页的工作面截图同样只取真机帧，来源批次都在证据目录里留档。 | current.md:17（`release/evidence/v0.1.2/README.md`）；`site-evidence-line.md` 真实材料纪律；截图源 `site/craft-evidence/MILESTONE-SHOTS-1/` 等 | — |
| F3 链 | → release/evidence/v0.1.2/README.md | current.md:17 | — |
| F4 | 设计门禁 | 每次推送 main，部署前先跑设计与发布真值门禁：词表、色宗、动效、字体、数据与发布事实任何一项漂移，构建失败，页面不更新。克制不是审美自觉，是流水线里的一道闸。 | `.github/workflows/pages.yml:30-33`（guard 先于 build/deploy）；门实现 `site/scripts/`；与卷四设计边界井既有叙事同源（B1/B4 已验） | — |
| F4 链 | → .github/workflows/pages.yml · site/scripts（tree 链接） | 仓内实存 | — |

硬约束自查：不新增第三个 DMG 链接（`release-truth` 钉「恰两个」）；不复制 `data-release-sha`（钉「恰一个」）；不用 `release-fact` 类（可见版本行钉「恰一个」）；SHA 不在卷五重印，指回卷首刊记——单一在页真源，不造第二份可漂移拷贝。

### 卷六 · 有问有答（id `faq`）

眉：`卷六 · 有问有答`（鱼尾记号）
主句（h2）：**「常问六则，照实作答。」**
形态：静态 `<dl>` 台账（问 = dt，答 = dd），全部展开不折叠——诚实边界常驻可见，不藏在交互后面；不采用 feature card（`site-evidence-line.md` 信息结构第 4 条同源纪律）。

| # | 问（dt，zh-title 轨） | 答（dd，逐句） | 真源 | 时效 |
|---|---|---|---|---|
| Q1 | 现在支持哪些模型？ | 当期只注册 DeepSeek 一家；任意填 URL 接入的入口已经退役。新的模型服务要以具名适配接入并通过验收，才会出现在这一页上。 | current.md:26（只注册 DeepSeek，不得宣称任意 OpenAI-compatible 已支持）+ :29（custom/base URL 入口已退役） | — |
| Q2 | 合同审查这条链，现在走到哪一步？ | 在合成数据试点里，从原句锚定、风险分级、修订写入受控副本，到逐条人工确认、写出 Word 文件，这条链已经走通；主合同的显式选择、原稿字节保真、历史产物不被覆盖等收束项还在进行。链路已在试点中跑通，但不等同于产品已全面上线。 | current.md:31（Work 法律场景窄链现行事实 + 未成立边界四项）；末句复用已签对冲措辞（`SIGNED_MATURITY_HEDGES` 第一条，第 3 处消费） | △ |
| Q3 | 产出的 Word 文件，经过 Word/WPS 全矩阵验证了吗？ | 尚未。此前只在 macOS 的 WPS 做过一次基础打开与视觉抽核；Word 与 WPS 双端「打开—轻改—保存—回读」的完整矩阵还没有跑，跑完之前不作兼容性承诺。 | current.md:68-69（外部兼容验证节） | — |
| Q4 | 扫描件和图片能直接读吗？ | 还不能。文字识别尚未接入；没有文字层的材料会被显式标记并阻断发送，不会静默混进对话。 | current.md:28（needs_ocr 显式阻断）+ :42（reading-view 诚实 needs_ocr）+ :113（ingest OCR 未实现） | — |
| Q5 | 下载的是公证过的正式版吗？ | 不是。v0.1.2 是 Apple Silicon 开发构建，ad-hoc 签名、未公证；DMG 的 SHA-256 印在卷首刊记，安装前可以自行校验。 | current.md:15-16 | — |
| Q6 | 页面上的数字和演示是真的吗？ | 是可核验的展示数据，不是客户数据。演示与引语来自同一份合成卷宗；卷宗计数在每次构建时对数据实算核对，对不上就构建失败。这一页不引用任何真实案件。 | current.md:57-63（Demo/fixture 集成节「已校验的展示数据」）；机器对应 `site/scripts/fixture-claims.mjs` + `build.mjs:11`（构建期 assert） | — |

措辞门自查：成熟度八词（已上线/全面上线/全面可用/生产可用/生产就绪/正式上线/已商用/production-ready）只在已签对冲区间内出现（Q2 末句）；营销词表（赋能/打造/一站式/革命性/颠覆性/无缝体验/未来已来/streamline/empower/supercharge）零命中；工程词按 voice §6 折成产品语言（「文字识别」，不写 OCR/schema/fixture 于用户句面；「合成卷宗」承接站面既有用语）。

## 五 · 拒项自查（逐条）

| 拒项 | 本批落法 |
|---|---|
| 深色 SaaS 通用美学 / 终端动画 | 零新增动效；新区沿双宗既有台账版式 |
| 渐变 / 3D / 发光 / 阴影 | 新 CSS 只消费既有 token（`var()`/`color-mix`），零 hex、零 shadow、零 gradient、radius 只用既有普通档 |
| 背书标章位 | 不设；信任信号 = 卷五可核验事实链 |
| 越出 current.md 的能力宣称 | 上表逐句锚定；v0.2.0 全页零出现（不预告未发布单品） |
| 具象 kitsch（法槌天平类） | 零新图形；记号只用件库既有五件（`<use>`） |
| 站源引用 archive/ | 零引用（deslop `archive-reference` 门覆盖新文件） |

## 六 · 实现面与门禁影响清单

- `site/index.html`：卷四之后、closing 之前插入两个 `<section>`；件库、hero、卷一至卷四、closing、footer 字节不动。
- `site/styles.css`：新增 `.facts` / `.fact-ledger` / `.faq` / `.faq-ledger` 版式（台账式：容器上框线 + 末行下框线，行间零线——延续 VERSIONAL-LANG 减法体例）；不触任何 VL 契约钉住的选择器。
- 字体：新增标题字形并入 `zh-title` 字符集 → Noto 双字重子集扩容重切（字源 = SOURCE.md 钉定上游制品，SHA 三锚已核：zip `c58cd035…`、Regular `e8f396…`、Bold `24693d48…`）；`noto-subset.json` 与 `noto/SOURCE.md` 制品链按**实测**回填（字节=文件长度、glyph=maxp、字数=cmap，沿 B10 判例）。朱雀/doc-latin/manuscript 三枚子集零触碰（新区正文走功能轨 sans，行头与问句走标题轨）。
- 门禁扩展（唯一新增检查）：`checkRepoTreeLinks`——`index.html` 里指向 `github.com/lesPrivilege/Courtwork/(blob|tree)/main/<path>` 的链接，`<path>` 必须实存于仓内；幽灵路径触红。测试先红后绿 + 门体空转变异证非空转。依据：「可解析坐标须有机器对应」既有判例——卷五四条链接是本批新增的可漂移坐标面。
- 不触碰：`site/main.js`（AST 锁）、`site/og.html`/`og.png`（hero 文案未变）、`site/assets/icon.svg`、数据区、`packages/**`、`apps/**`、`docs/**`。

## 七 · 完工证据规划

`site:guard` 全绿 + `site:build` 通过；双宗（light/dark）× 双宽（1280/375）整页与新区特写帧；reduced-motion 与 JS-off 帧；375/768/1180/1280/1440/1600 双宗横向溢出实测全 0；运行动画名集合 ⊆ 既有集合（零新动效机器证）；本对照表随批入 `site/craft-evidence/SITE-CRAFT-2-N1/`。
