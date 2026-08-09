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

## 五、回执（实现后填写）

（待实现会话按体例补：改动清单、首红/变异红绿证原文、Δ 分布、门实测数字、偏离登记。）
