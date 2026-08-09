# SKIN-DYSTOPIA-1 · 深宗欠账清偿批（dystopia 取色 = 欠账兑现，非配色改造）

状态：票面冻结（2026-08-09 架构九裁），待实现

权威：`docs/design/principles.md` §12（含 2026-08-09 辖面澄清）；`docs/architecture/implementation-readiness.md` `PI-LANE-UI-1` 行三条后置条款（磁青精修指定供料／暗宗器面阶缺格同批补格／深宗 `--text-tertiary` 随槽收口）——**本票唯一提案锚，批一不越出这三句**；`SKIN-B5` 行贴阈例挂账（Q9 裁「本票即下一张皮层相邻票」）。档位：**中间档 `agent-interface` 唯一档**。

调研出处：2026-08-09 架构会话草案（scratchpad 研究件，非权威；其全部数值经现读实测，本票面已收编所需部分）。

---

## 一、九项架构裁定（2026-08-09，全部落痕于此）

| # | 问题 | 裁定 |
|---|---|---|
| Q1 | §12「数值零新增」辖面 | 辖「为表达气质而新增」；深宗对称补格与门取样面扩宽不在禁内（§12 辖面澄清已落）。批一成立 |
| Q2 | 三本签署账授权 | **逐项授权**：①`desktopDarkColors`/`desktopDarkDeclarations` 项 B 三行映射加行＋三行 color-mix 字面量删除、项 D 一行 `--zhu-fg` 映射加行；②`zhuConsumers` 项 D 新消费选择器逐行加（行数以实现清点为准、逐行在回执登记）；③`signedR2LedgerRows`＋`r2-tier-ledger.json` 每项视觉决定新增签署行，档位 `agent-interface`。**项 B 标登记性条目（non-visual，像素零变）** |
| Q3 | 浅宗 `zhu.fg` 立值 | 同值 `#be4b2f`（graphic==fg，循浅宗 red/amber/slate 三族先例；非新色） |
| Q4 | 深宗 `text.tertiary` 定值 | **`#8b99b0`**（三面 6.29/5.68/4.60；贴阈取法循浅宗 `c636b1c` 先例，保中性阶第三声部层级间距；与 secondary 间距收窄的代价如实登记） |
| Q5 | 批二磁青纸温精修 | **不排产**。重启判据：批一深宗全状态截图链实证浮台层级不足承载层级时，以该实证重启并同批解决壳/站双侧重摄 |
| Q6 | 朱/红深宗分族 | 只留并置可辨性实测帧，不改值不立票 |
| Q7 | `--bg-hover` 壳侧零消费死账 | 只登记不动（删除须动签署账，当期零收益） |
| Q8 | 两处文档事实陈述订正 | 授权随批一顺带订正：`tokens.json` 深宗 tertiary description「无缺口可闭」（被实测证否）、`typography-density.md` 发凡三浅宗 tertiary 旧数（已被 `c636b1c` 取代）。只改事实陈述不改判据，各加日期注 |
| Q9 | 「下一张皮层相邻票」归属 | **是**，本票承接 `SKIN-B5` 贴阈例深宗复测（项 E）；清账时就绪图挂账行销记 |

## 二、批一范围（五项，零新色族、零新概念）

基线实测（2026-08-09 现读现算，WCAG 2.x，三面＝app `#0f1622`／surface `#16202f`／raised `#223047`）：深宗 `--text-tertiary #6e7c92` = **4.28/3.87/3.14**（三面全不达 4.5）；深宗 `--zhu-graphic #d75a3c` 承 `line.settled` = **4.68/4.23/3.42**（两面不达）；壳深宗无 `--zhu-fg`（站面有 `#E2857A`）；暗宗器面阶三格只有 CSS color-mix 消费面无 tokens 真源（解析值 `#404d63`/`#4b586d`/`#233965`）。

- **项 C（首红先行，独立提交）**：`tests/e2e/typography.spec.ts` AA 四元联测扩为 `{light,dark}×{bg-app,bg-surface,bg-raised}` 宗×面二维（每槽取最严面判定）；`COLOR_VARS` 补 `line.settled` 深宗实际消费变量。**深宗 tertiary 与 zhu 两槽必须先红，红数与基线实测逐位相符**；门与修不得同一提交。floor 365→365+N，`assert-test-count.mjs` 同批升档。
- **项 A**：深宗 `text.tertiary` 换值 `#8b99b0`。四处同值：`docs/design/tokens.json`（含 description 订正，Q8）、`apps/desktop/src/styles.css`、`site/styles.css`、`site/scripts/versional-language-contract-lib.mjs` VL3-C01 行；`design:md` 重生成。消费点 139 处零改。
- **项 B（登记性，像素零变）**：`themes.dark.bg` 补 `hover`/`controlHover`/`selected` 三格，值＝现行 color-mix 解析值，description 循浅宗「派生式降为出处记录、解析值为真值」先例措辞；`styles.css` 三行换解析值字面量；`desktopDarkColors` 加三行映射、`desktopDarkDeclarations` 删三行字面量。**补格前后同状态截图逐像素 diff=0 为硬判据**。
- **项 D**：壳双宗补 `--zhu-fg`（深 `#e2857a`＝tokens 已在册值接线；浅 `#be4b2f`＝Q3 同值立值）。现有 3 处 `var(--zhu-graphic)` 消费点逐处判「文字轨/记号轨」，文字轨改吃 `--zhu-fg`；记号轨与朱印（`typography-density.md` §六之二互斥前提）零触碰。`zhuConsumers` 白名单同批登记；`checkColorGrammar` 帧边界反向守卫逐条核（基态朱 vs 帧内朱不得错位）。朱出现处集合前后逐点同名、计数相等。附朱/红并置实测帧（Q6，不改值）。
- **项 E**：`ui-residue.spec.ts` settings-optin 贴阈例深宗实测留证（待办注释改实测值）；17 例叠层 A≡B 的深宗 Δ 分布整体重录一遍入证据。**`maxChannelDelta` 维持 3 不得放宽**；超阈走「舍入带计数上限」既定处方。

## 三、边界（不做清单）

不动：布局／交互语义与触发条件／wire·schema·投影（零 TS 行为码、零 Rust）／动效十枚与 `--motion-seal`／阴影圆角／字体排印／朱印（§六之二互斥前提原样）／线级三档／纸温三值（批二 Q5 未启）／被逐字节断言的选择器（只换值不改选择器、属性名、变量名）。不接 kit 任何暖色（泥金/雌黄/kit 朱皆违 B≥R，结构性拒绝）。站面改动仅限同源门拖出的必要同步值。零新 DOM/SVG/伪元素/filter/gradient。App.tsx 高水位不升。

供料裁定收编：zhimopu kit 15 件——直接消费 0、借值/借律 3（ciqing 三纸留批二、泥银作项 A 旁证、二声部律以 Q6 实测帧兑现）、不采纳 12（含名义最贴题的 `danganshen`：未立宗＋纸墨皆暖违 B≥R——贴题不是准入理由）。

## 四、退出证据

1. 项 C 首红独立提交在先，红数逐位相符；随后 A/D 修绿。撤深宗 `data-theme` 设置语句门必红（防「扩门未扩到取样面」零区分力自伤）。
2. 双宗×三面全槽 AA 表＋前后帧落 `site/craft-evidence/SKIN-DYSTOPIA-1/`；深宗全状态帧集（循 `PI-LANE-UI-1` 浅宗交付面同集）；深宗截图循 `SKIN-R2-P4` 先例真 Tauri WKWebView 另摄，不复用实现截图（此项属验收侧义务）。
3. 项 B 像素 diff=0 证明帧；mutation：删格 `missing` 红／改值 `drifted` 红／加未登记属性 `added unapproved` 红三形态各一。
4. 项 A 四处同值联动：任改一处不改其余即 `site:guard` 红。等价变异双侧同红（深宗改回旧值→深宗用例红；浅宗误植深宗值→浅宗用例红）。
5. 项 D：文字/记号两集合互斥且穷举；朱出现处前后逐点对照零变；轨位错改双向红。
6. 三本签署账每处改行在 `r2-tier-ledger.json` 有 `(rowId, 锚点, 档位)` 三元组，`lint:skin-r2-ledger` 绿。
7. 全量门＋**显式单跑 `pnpm site:guard`**（判例：site:guard 不在全量门相位）；提交前最后动作是跑门。每枚变异带命中校验，等价变异如实登记。

## 五、回执（实现会话，2026-08-09）

分支 `claude/skin-dystopia-1`，base `main@13415e4`。提交链按四节顺序，首红独立在先。

### 5.1 改动清单

| 提交 | 项 | 面 |
|---|---|---|
| `0140183` | C（首红，不含任何修复） | `tests/e2e/typography.spec.ts` 门④-2 扩宗×面二维并按宗拆两例；`scripts/assert-test-count.mjs` floor 365→366 |
| `c11468d` | A | `tokens.json` `themes.dark.text.tertiary` `#6E7C92`→`#8B99B0`（含 Q8 description 订正）／`apps/desktop/src/styles.css`／`site/styles.css`／`versional-language-contract-lib.mjs` VL3-C01／**`docs/design/icon-dark.svg` rect[3..5]（第五处，由同源门当场拖出）**／`typography-density.md` 两处事实订正／`courtwork-design.md` 重生成／签署账 SD1-A01..A05 |
| `e530c99` | B | `tokens.json` `themes.dark.bg` 补 `hover`/`controlHover`/`selected`／`styles.css` 三行换字面量／`deslop-scan-lib.mjs` `desktopDarkColors` 加三行映射、`desktopDarkDeclarations` 删三行字面量／`schema-exemplar-contract-lib.mjs` 提案行闭集补 `SD1-[A-E]\d{2}`／签署账 SD1-B01..B03 |
| `0b05743` | D | `styles.css` 双宗补 `--zhu-fg`（浅 `#be4b2f`／深 `#e2857a`）／`deslop-scan-lib.mjs` 双宗登记／门④-2 `COLOR_VARS` line.settled 改吃 `--zhu-fg`／签署账 SD1-C01、SD1-D01、SD1-D02、SD1-E01 |
| 本提交 | E ＋ 证据 ＋ 回执 | `ui-residue.spec.ts` 贴阈例待办注释改实测值／`site/craft-evidence/SKIN-DYSTOPIA-1/`／本节 |

消费点零改：项 A 的 139 处 `--text-tertiary` 消费点、项 D 的三处朱消费点，全部一字未动。
App.tsx 高水位 2272 未升；零布局、零交互语义、零 TS 行为码、零 Rust、零动效、零阴影、零字体、
零线级、零纸温；朱印零触碰；kit 暖色零引入。

### 5.2 项 C 首红（实跑原文，逐位与票面基线相符）

```
AA[dark] meta     --text-tertiary --bg-app=4.2836* --bg-surface=3.8705* --bg-raised=3.1364*
AA[dark] sealNote --zhu-graphic   --bg-app=4.6773  --bg-surface=4.2263  --bg-raised=3.4247*
Error: meta@dark     最严面 --bg-raised 四元联测未达 AA 4.5（--bg-app=4.2836* --bg-surface=3.8705* --bg-raised=3.1364*）
Error: sealNote@dark 最严面 --bg-raised 四元联测未达 AA 4.5（--bg-app=4.6773 --bg-surface=4.2263 --bg-raised=3.4247*）
1 failed（磁青宗） / 1 passed（刻本印页宗）
```

两槽同宗同时现红，靠的是逐槽 `expect.soft`——硬 `expect` 会被第一条抛断截住，只现一槽即
「红数与基线逐位相符」无从核对。`*` 标的是该槽的判定面。

门形状说明（扩宽两维，取样面按轨取）：宗维两宗各立一例、由 `data-theme` 真切换给出；面维
三面全测、判定面按轨的真实落座面取（功能/数据轨三面取最严，文书/标题轨维持文书纸面）。
理由：§2「对比度必须配对声明所对底面」——测一张该轨结构上不落座的底面，等于给门喂不存在的
消费点。原门的 `backdrop()` 已是这条规则的单面版，本次只把功能/数据轨从「只测竖栏底」扩到
「三面取最严」。

### 5.3 变异红绿证（每枚带命中校验；未命中即报「变异未命中」而不冒充红证）

| 变异 | 靶 | 结果 |
|---|---|---|
| C-mut 撤深宗 `data-theme` 设置语句 | `setAttribute('data-theme', mode)` → `void mode` | **深宗红**：`磁青宗取样面未落到本宗底纸（data-theme 未生效即整条量的是另一宗）`；浅宗仍绿（浅宗本就是默认宗，这正是「扩门未扩到取样面」的零区分力形态，故须由底纸自证接住） |
| A-mut-1 深宗改回旧值 | `--text-tertiary: #8b99b0` → `#6e7c92` | **深宗红**：`meta@dark 最严面 --bg-raised …（4.2836*/3.8705*/3.1364*）` |
| A-mut-2 浅宗误植深宗值 | 浅宗 `--text-tertiary: #637083` → `#8b99b0` | **浅宗红**：`meta@light 最严面 --bg-surface …（2.7141*/2.6175*/2.8841*）` |
| A-mut-3 四处同值只改站面一处 | `site/styles.css` 深宗 tertiary `#8B99B0`→`#8B99B1` | **`site:guard` EXIT=1**：`raw-color` ＋ `VL3-C01 Pages 磁青宗色阶漂移：--text-tertiary` |
| B-mut-1 missing | 删深宗 `--bg-hover` 行 | `dark root token map is missing --bg-hover` |
| B-mut-2 drifted | 深宗 `--control-hover: #4b586d`→`#4b586e` | `dark root token map drifted --control-hover` |
| B-mut-3 added | 深宗根加 `--sd1-bogus` | `dark root token map added unapproved --sd1-bogus` |
| D-mut-1 记号轨误吃文字轨 | `.line-settled` 改吃 `var(--zhu-fg)` | **`lint:signature` EXIT=1**：`line.settled 未同时消费 --zhu-graphic` |
| D-mut-2 文字轨误吃记号轨 | `COLOR_VARS` line.settled 改回 `--zhu-graphic` | **深宗红**：`sealNote@dark 最严面 --bg-raised …（4.6773/4.2263/3.4247*）` |

`checkColorGrammar` 帧边界与越界五条守卫逐条实测仍活（基线 0 failure）：
① 给 `.demo-actions span` 加直接朱声明 → `朱 is ambient on .demo-actions span`；
② 抽掉 `animation: demo-zhu-b` → `@keyframes demo-zhu-b is declared but never run`；
③ 非白名单选择器吃朱 → `朱 left its adjudication surface: .hero-lead color`；
④ 未登记 keyframe 吃朱 → `朱 left its adjudication surface: @keyframes sd1-bogus`；
⑤ 删 `.settle-seal` 的朱 → `朱 allowlist entry has no consumer: .settle-seal`。
其中①用的是 `var(--zhu-fg)`，故一并证实新变量确实落在该门的辖面内、不是逃逸通道。

### 5.4 项 D 逐处判轨位与 `zhuConsumers` 逐行登记

壳内「3 处 `var(--zhu-graphic)` 消费点」＝三条声明，逐处判定：

| # | 消费点 | 轨 | 判据 | 处置 |
|---|---|---|---|---|
| ① | `.line-settled { color }` | 记号轨 | 供 `.signature-line::after` 渐变吃 `currentColor`，画的是线不是字 | 零改 |
| ② | `.line-settled { background }` | 记号轨 | 2px 法理之线线体本身 | 零改 |
| ③ | `.settle-seal { color }` | 记号轨 | 落定章 SVG 吃 `currentColor`；§六之二互斥前提（`aria-hidden`、opacity .5、不承担唯一信息） | 零改 |

结论：**文字轨在壳内当期零消费点**，故 `zhuConsumers` 白名单**新增 0 行**（Q2② 的「行数以实现
清点为准」按 0 登记；`zhuConsumers` 是站侧 `checkColorGrammar` 的白名单，本项未新增任何站侧
朱消费选择器，加行反而会触「白名单条目无消费」的死登记红——见 5.3 守卫⑤）。
`--zhu-fg` 的消费者是门④-2 的 `sealNote` 定值门；站侧 `--zhu-fg` 早已是同形态（声明在册、
零 `var()` 消费），本次只是把壳补齐到与站同构。

朱出现处集合前后逐点对照（**同名、计数相等**）：

| 面 | 出现处 | 前 | 后 |
|---|---|---|---|
| 壳 | `.line-settled { color }` | ✓ | ✓ |
| 壳 | `.line-settled { background }` | ✓ | ✓ |
| 壳 | `.settle-seal { color }` | ✓ | ✓ |
| 站 | `@keyframes demo-zhu-b { border-color }` | ✓ | ✓ |
| 站 | `.settle-seal { color }` | ✓ | ✓ |
| 计数 | `grep -c 'var(--zhu-[a-z]*)'` | 壳 2 行 / 站 2 行 | 壳 2 行 / 站 2 行 |

朱/红并置实测帧（Q6，值零改）：`site/craft-evidence/SKIN-DYSTOPIA-1/frames/D-03-zhu-vs-red-*.png`。
观察如实登记：深宗**记号轨**两色（朱 `#D75A3C` vs 红 `#B5382F`）三面均可辨；深宗**文字轨**两色
（朱 `#E2857A` vs 红 `#DE8881`）目视几乎不可辨，RGB 距离仅 (4, 3, 7)。当期朱的文字轨零消费点，
故不构成现实混淆；朱旁文一旦上身、与红 fg 同屏即是风险。按 Q6「不改值不立票」原样留帧登记。

### 5.5 项 E 深宗 Δ 分布

取样面自证：量测时实跑打印 `data-theme=dark`、`--bg-app=#0f1622`，不是「以为在深宗」。
量测用一次性插桩（`SD1_MEASURE` 分支绕过逐字节快路径并回报 `maxDelta`），跑完已逐字节复原，
`overlay-residue.ts` 本次零净改动。

16 例 A≡B 深宗实测：13 例逐字节相等；`scope` total=16 max=1；`store-chat` total=18 max=1；
**`settings-optin` total=10 max=2 banded=0 significant=0**。全表见证据 README 五节。

处方落定：`settings-optin` **确实再度贴阈**（max=2，与浅宗同值）。换宗前后同值，正是「成因是
嵌套模态的重栅格化面天然偏大、与底色无关」的证据，故按当初写下的处方走「舍入带计数上限」而
**不放宽阈值**：`maxChannelDelta` 维持 3，舍入带（Δ∈(2,3]）实测计数 0、上限 4 的头寸一格未用
——当期无须动任何阈值。深宗逐字节相等例反比浅宗多两例（13 vs 11），换底不构成检出力下降。

### 5.6 门实测数字

| 门 | 命令 | EXIT | 数字 |
|---|---|---|---|
| 全仓构建 | `pnpm -r build` | 0 | — |
| lint | `pnpm lint` | 0 | — |
| 根测试 | `pnpm test`（先 `build:product-sidecar`） | 0 | Test Files 170 passed / **Tests 1941 passed** |
| desktop 单测 | `pnpm --filter @courtwork/desktop test` | 0 | Test Files 93 passed / **Tests 820 passed** |
| **site:guard 显式单跑** | `pnpm site:guard` | 0 | tests 103 / pass 103 / fail 0 |
| cargo | `cargo test`（先 `build:headless-sidecar`） | 0 | **250 passed / 0 failed / 1 ignored** |
| 完整 Playwright | `pnpm --filter @courtwork/desktop test:e2e` | 0 | **377 passed**，假绿防护「377 条用例（下限 366）」 |

与参考基线对照：root 1941（持平）、desktop 820（持平）、cargo 250/1 忽略（持平）、
PW 377 ＝ 376+1（floor 366 ＝ 365+1，项 C 拆宗两例）。

cargo 首跑 EXIT=101、2 红，根因是缺 `packages/pi-lane/dist/headless-sidecar/headless-sidecar.cjs`
（门自己的报错原文即「先跑 build:headless-sidecar」），补跑该构建后 250/250 绿——环境前置缺失
非代码红，如实登记。

**全量 Playwright 首跑 4 红，如实登记且未归因**：`global-verbs`（`setNextAuthorize` undefined＝
宿主桩未装形态）、`goal1`（`locator.fill` 30s 超时）、`goal2`（`locator.waitFor` 30s 超时）、
`host-auth`（`host-access-row` 未出现）——四枚与本批色值面零交集。四谱隔离重跑 41/41 绿，
但「隔离绿对全链红零区分力」，故不据此结案；**据的是全链独占重跑 377/377 绿**。两跑均为独占
（同刻无第二条全链），红因未查明，登记为环境级不确定，留给验收复核。

### 5.7 偏离与上浮（不自裁）

1. **[需架构拍板] 项 B「像素零变」硬判据未成立。** 五组同状态深宗帧实测：
   `01-idle`/`02-rail-hover`/`03-stage-hover` 各 17914 px、Δ 全为 1、单一连通区
   (396,116)-(736,172)；`04-settings` 0 px；`05-settings-nav-hover` 9 px、Δ={1:8, 2:1}。
   取帧装置先自证跨次逐字节可复现（同状态连跑两次五帧全 SAME），故差异不是取帧抖动。
   病灶定位到具体消费点：`.user-message` 吃的是
   `color-mix(in srgb, var(--bg-selected) 55%, var(--bg-raised) 45%)`——**二次派生**；派生式在
   浏览器内保持不舍入 (34.54, 57.18, 100.52)，换成 8bit 字面量 (35, 57, 101) 后二次混合跨过
   舍入界，整块气泡 R/B 各偏 1。即「解析值为真值」在只有一次消费时像素中性，在有二次派生消费时
   不中性，代价 Δ≤2/255（落在本仓亚感知律 Δ≤3 内，但票面写的是 diff=0）。浅宗同位早已是字面量，
   这笔舍入是它当年付过的账。两条候选留裁：①接受 Δ≤1 一次性舍入代价（与浅宗同形）；
   ②改半形态「tokens 补格＋CSS 保留派生式」——但那样三格仍无门可绑，补格失去意义。
   本批按票面原文实现，不自裁。
2. **[需架构拍板] 浅宗朱的文字轨值是否应按三面复算。** `--zhu-fg`（浅 `#BE4B2F`）在
   `--bg-surface` 上实测 **4.4983 < 4.5**（贴阈 0.0017）。该面不在文书轨的落座面内，故本门不判；
   若架构认为面集应无条件放成三面，则 Q3「同值 `#be4b2f`」须一并复裁（循 Q4 的贴阈取法压暗）。
   本批不动值、只登记。
3. **[需架构拍板] 浅宗 `zhu.fg` 未新立 token 路径。** 票面 Q3 说「浅宗 `zhu.fg` 立值」，实现取
   「复用 `color.line.settled.value`」——与 `siteLightColors` 里已在册的 `--zhu-fg` 同一绑定。
   理由：`color.semantic.$description` 明载「色相总数仍为 4（红/琥珀/蓝/绿）+ 中性板岩灰」故朱
   结构上不入该组；`color.line.$description` 明载「文字不得消费本组值，须消费 semantic.*.fg」
   故不在该组加 `fg` 字段。两条现行 `$description` 各挡一条路，复用站侧既有绑定是唯一无违的
   形态。若要求独立 token 路径，须同批改上述两条 `$description` 之一。
4. **票面「四处同值」实为五处。** 第五处 `docs/design/icon-dark.svg` rect[3..5] 由 `site:guard`
   的既有绑定当场拖出（品牌标次要色条本就绑 `themes.dark.text.tertiary`）。已同批跟值，对
   `#232B38` 深底的对比 3.3655 → 4.9394，方向与该绑定当初「跟深宗才不糊」的理由一致，几何零改。
   登记为票面清点遗漏，不是范围扩张。
5. **Q8 授权两处订正，实做四处。** 另两处是同一句假陈述的其余两个副本：
   `typography-density.md` 争点裁定 4 的「dark tertiary 保持 `#6E7C92`」、`tokens.json` 浅宗
   `text.tertiary.description` 里的「深宗不随动」。前提同被证否，留在原地即是假陈述，故一并
   订正并各带日期注；只改事实陈述、不改判据。
6. **票面「17 例 A≡B」实为 16 例。** 第 17 枚 `containerize-popover` 是一次性链式仪式，无对称
   基线，只跑残留门不跑 A≡B（`runClosureGate` 调用点实数 16，`ui-residue.spec.ts` 原注亦写
   「16 例」）。按实数登记。
7. **提案行闭集补前缀。** `schema-exemplar-contract-lib.mjs` 的 `isProposalLine` 是闭集正则，
   不补 `SD1-[A-E]\d{2}` 则本批全部签署行被判「缺已批提案行」。循 P0…P5/VL/VL2/VL3 逐批入册的
   既有形态，登记待追认。
8. **`--bg-hover` 壳侧仍零消费（Q7 只登记不动）。** 本批为其补了 tokens 真源（项 B 三格之一），
   但它在壳内仍无任何 `var()` 消费点——补格补的是真源不是消费面，死账状态未变，照 Q7 只登记。

### 5.8 门实测

见提交信息与下方；全部为完整实跑原始输出，无 `--list`、无选择性运行替代。
