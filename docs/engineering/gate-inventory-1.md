# GATE-INVENTORY-1 · 自研门归并/降频/失效清点

**工单坐标**：`docs/architecture/implementation-readiness.md:270`，裁决坐标 `A/R-23` 准，源出 `archive/harness-core-1-stage-a.md` §A2.4。
**范围**：`A2.4：8019 行自研门的一次归并/降频/失效清点。先清点再定动作，不预设结论`；依赖层无（清点期只读）；`App.tsx` 列否。
**性质**：一次性证据记录（同「验收报告、craft-evidence」一类，见 `docs/engineering/workflow.md`「文档引码用符号锚」判例的例外条款）——本文档锚定下方固定的仓库树状态，不随后续提交继续演进；行号引用因此在本文档内是恰当的，不代表放弃该判例对**现行 SPEC 类文档**的约束。
**本票不执行**：任何合并、降频或删除动作。清点表是证据；动作另立票。

固定坐标：`impl/gate-inventory-1` 分支，起点 `main` @ `a1c3ae79bf3700096e8506f2a8d04215c63b268d`（2026-07-24 "docs(architecture): freeze v0.2 release truth"）。

---

## 零、清点期间捕获的现行问题（不是清点对象本身，是清点方法论的副产品）

**`site/scripts/assert-p5-font-runtime.mjs` 当前对现行 `site/index.html` 判红——且已经红了至少 4 天，无人发觉。**

「跨越提交数」逐口径实测（订正）：归因提交 `10a354e`（2026-07-20 10:29）之后至本清点固定坐标为止，全仓 **69** 枚、触 `site/` **7** 枚、触 `site/index.html` **1** 枚（`b0f667b`）。原稿此处曾写「跨越十余枚后续提交」，该数字在上述任一口径下都不成立，按「可解析数字须各有机器对应」判例订正为三口径并列，不取单一模糊量词。

这不是「这道门坏了、该清掉」的清点结论，是「清点用现场执行代替静默阅读」这一方法论本身抓到的一个真实的、当下成立的产品缺陷：

- 字体断言（4 处签署消费点 + OG 字重，全部命中 Junicode 子集）**全绿**；数据位置断言（8 条 `data-static`）**全红**（`data render drifted`）。
- 现场实测坐标 vs 冻结基线（`site/craft-evidence/SKIN-R2-P5/runtime-data-baseline.json`，提交 `9a1281b`，2026-07-20 00:32）：纵向系统性下移约 53px，列宽增约 7–8px。
- 归因：同日晚些的提交 `10a354e`（"docs(site): tighten outward maturity claims"）在被测网格正上方的「卷二」区块 header 内插入了一整段新 `<p class="section-body zh-doc">` 对冲文案，把下方网格顶开——`git show 10a354e -- site/index.html` 可复核。
- 为什么四天没人发现：`assert-p5-font-runtime.mjs` 第 5 行自述"不挂 `site:guard`"是**刻意设计**（保持站面构建零浏览器依赖），只能手工唤起。`.github/workflows/pages.yml` 是本仓唯一自动化入口，只跑 `site:guard`。于是这道门自 P5 批次落地后，事实上只在有人记得手动跑它时才执行一次——本次清点是它冻结基线以来第一次被真正跑过。

**本票的处置边界**：确认现象、留证据，**不修**（既不改站面内容、也不改门本身、也不改基线）。这条与本清点票「本票不执行归并」的边界同理适用——发现属清点范围，处置属另立票（建议：接线进 `site:guard` 或至少接线进某种 push-to-main 前的自动化路径，是候选方向之一，但方向选择本身也是「动作」，留给架构角色）。**在此之前，站面这处漂移持续处于未被任何机器捕获的状态，如实登记，不淡化。**

---

## 一、方法论与验证密度

三路并行分类，各自独立读取赋值文件后**现场执行**——不是只做静态阅读：

| 批次 | 范围 | 文件数/行数 | 现场执行 |
|---|---|---:|---|
| A | `apps/desktop/scripts/`（视觉/rpXX/capture 族） | 25 / 1675 | 静态优先，对断言目标逐一 grep 现读源码核对，窄 grep 零命中处二次法交叉（模板字面量追踪/e2e 真源） |
| B | `apps/desktop/scripts/`（契约锁/三角组/rule-grammar） | 26 / 3066 | **16 个可执行门全部现场跑（16/16 exit 0）+ 4 个 `.test.mjs` 全部现场跑（35/35 通过）** |
| C | `site/scripts/` + `release/scripts/` | 14 / 3816 | **8 个可执行门/驱动全部现场跑 + 4 个 `.test.mjs` 全部现场跑（`deslop-scan.test.mjs` 46/46、`versional-language-contract.test.mjs` 15/15、`release-truth.test.mjs` 10/10，另 2 个 Playwright 探针脚本按各自默认参数现场唤起） |

**执行范围之外**：`site/scripts/build.mjs`（会写 `site-dist/`，为保持清点只读未直接跑；其唯一门禁委派 `assertFixtureClaims` 与 `deslop-scan.mjs` 共用实现，已经 `deslop-scan.mjs` 现场 PASS 间接验证）。

**总计**：65 文件，8557 行；32 个可执行门/驱动现场跑通过（1 个例外，见零节）；8 个 `.test.mjs` 套件、约 96 条用例现场跑通过。零文件仅凭文件名或目录位置分类——每一行的「主状态」都对应至少一处 `path:line` 级别的现读或现跑证据。

**「8019」是过期数字，如实订正**：源自 `archive/harness-core-1-stage-a.md:141`（`apps/desktop/scripts/` 59 个/4758 行 + `site/`+`release/` 13 个/3261 行），落笔于该文档作者提交 `8eafe07`（2026-07-20 11:04）。逐笔核对：desktop 侧同日 `5d808a9`（14:13，"clear dead interfaces, seams and scripts"）删掉 9 个 `capture-*-audit.mjs`（**该清理正是这份 8019 分析自己 D10/R-15 死代码发现的三小时后落地**）、`aeca386`（13:07）新增 `assert-app-highwater.mjs`，净 59−9+1=51；site 侧 `80407bc`（11:21，文档落笔 17 分钟后）新增 `render-og.mjs`，13+1=14。65 文件精确对账。行数残差（8019→8557，多出 538 行）来自后续 5 天里对既有文件的原地编辑，非文件增减可以解释——`8019` 从未被任何门或脚本自我校验，是一次性人工统计,不是活数字。**本清点采用今日现读的 8557 为真，8019 仅作出处保留。**

**范围边界，明确排除，非遗漏**：本清点严格沿用「8019」出处定义的范围——仅 `apps/desktop/scripts/`、`site/scripts/`、`release/scripts/` 三个目录下的 `.mjs` 文件。以下两类同属「自研门」精神但不在本票范围内，留给未来扩围票裁定是否并入同一清点体系：

- `packages/provider/scripts/generate-catalog.mjs`（44 行，backs `catalog:check`，drift 型门，形态与本清点内的 gates 一致）；
- 15 个跨包 Vitest 结构守卫（`package-boundary.test.ts` ×6、`json-schema-drift.test.ts` ×3、`vertical-package-exports/layout.test.ts`、`no-demo-in-harness.test.ts`、`chat-ui-boundary.test.ts`、`layout-golden.test.ts` ×2，合计 1076 行，已由 `README.md:121-131`「跨包守卫一览」表单独登记，本身覆盖良好，未发现清点必要）。

---

## 二、清点表 · `apps/desktop/scripts/`（51 门，4741 行）

| 文件 | 行数 | 主状态 | 附加标记 | 依据 |
|---|---:|---|---|---|
| `assert-motion-properties.mjs` | 49 | 仍有效 | 可降频（自身别名 + `test:e2e` 内联 + 根 `site:guard` 三处调用同一命令） | `package.json:13`(site:guard)/`apps/desktop/package.json:11`(test:e2e 链首节点)；断言目标 `styles.css`/`App.tsx`/`Panels.tsx`/`AttachmentChip.tsx`/`Composer.tsx` 现行 |
| `assert-elevation-shadow.mjs` | 50 | 仍有效 | 可降频（同三处） | 白名单 `.case-rail.surface-float` 等与 `styles.css:251-255` 逐字相符；`docs/design/tokens.json` elevation.shadow 一致 |
| `assert-graph-theme.mjs` | 61 | 仍有效 | 可降频（自身+test:e2e，不在 site:guard） | `graph-theme.ts` 十色值、`GraphPanel.tsx:108,113`、`g6-runtime.ts`、`vite.config.ts:14` 逐项现行 |
| `assert-layout-converge.mjs` | 88 | 仍有效 | 可降频 | 六死支字符串生产面命中数=0（仅门自身正则定义处出现）；`--content-measure`/`effectiveLeftCollapsed`(`App.tsx:2090`) 现行 |
| `assert-signature-line.mjs` | 64 | 仍有效 | 可降频（三处） | `.line-{danger,attention,revision,authority,neutral,settled}` 六色闭集与 `styles.css:631-636` 相符；`Panels.tsx:23,108,122,352,384` 消费四处；`App.tsx` 零命中（"App 层不消费"成立） |
| `assert-visual-kit-contracts.mjs` | 61 | 仍有效 | 可降频 | 7 必需文件全存在；`@tanstack`/`react-flow`/`echarts` 禁词 0 命中 |
| `assert-typography.mjs` | 168 | 仍有效 | 可降频 | `subset-manifest.json` 三件 woff2 sha256/体积本会话现算全 MATCH；`PENDING_MIGRATION` 空字典是 B2-1 收口后现状非失效 |
| `assert-view-abi-contracts.mjs` | 36 | 仍有效 | 可降频 | 期望缺席文件确认缺席；`main.tsx:14,43,70-71` 三行现行 |
| `assert-rp26-contracts.mjs` | 57 | 仍有效 | 可降频；rpXX 族（见四之二） | `tokens.json` 八字段、`PreviewHost.tsx`/`styles.css` 消费点均现行 |
| `assert-rp27-contracts.mjs` | 42 | 仍有效 | 可降频；rpXX 族 | `Composer.tsx:466,471` testid 现行；五英文标签/四法律术语命中有余量 |
| `assert-rp28-contracts.mjs` | 38 | 仍有效 | 可降频；rpXX 族 | `TurnCard.tsx` 导出 `TurnCardKind` 闭集现行匹配 |
| `assert-rp29-contracts.mjs` | 52 | 仍有效 | 可降频；rpXX 族 | `tokens.json` home.* 八字段、`tauri.conf.json` titleBarStyle、`MessageActions.tsx` createdAt 均现行 |
| `assert-rp291-contracts.mjs` | 27 | 仍有效 | 可降频；rpXX 族 | 四条逐字 CSS 声明与 `styles.css:606/422/660/1703` 相符；`CaseRail.tsx:311`→`WindowChrome.tsx:87` 委派链符合断言方向 |
| `assert-rp210-contracts.mjs` | 55 | 仍有效 | 可降频；rpXX 族 | 六个类名选择器均现行命中 `styles.css` |
| `assert-rp211-contracts.mjs` | 71 | 仍有效 | 可降频；rpXX 族；与 `verify-icons.mjs` 共享 `stripMarkRefs`（见四之二，故意冗余不建议合并） | 8 testid 现行命中；`composer-add-folder` 确认 0 命中（断言要求的"已退役"成立） |
| `capture-finale-audit.mjs` | 100 | 仍有效 | 可归并（与 `capture-p3-seal-ink.mjs` 共享近逐字引导序列，见四之二） | `package.json:51` `visual:audit` 唯一别名；6 个 testid 直接命中；`turn-card-gate`/`view-graph` 经二次法（默认参数追踪/e2e 真源交叉）确证现行，首次窄 grep 假阴 |
| `capture-p3-seal-ink.mjs` | 137 | 仍有效（内容现行） | 可归并（同上）；孤儿——全仓 `package.json` 零引用 | 3 testid 直接命中；`settle-seal-risk-04` 经二次法确证现行 |
| `capture-rp1-compact.mjs` | 22 | **已失效**（已知线索，本会话独立复核一致） | 可归并（capture-* 族同型引导序列，三份中率先腐烂的一份） | `line:15` `enter-compact-layout` 在 `src/` 零命中，与 `apps/desktop/SPEC.md:2707` 既有登记一致；另 `line:9` 硬编码端口 1420 与 `capture-finale-audit.mjs:16-18` 明令禁复用规则相悖 |
| `export-app-icons.mjs` | 80 | 仍有效 | 无——有意不入门链的 dev 工具，非孤儿疏漏 | `line:1` 自述"dev-only 不入 test:e2e"；`SPEC.md:3086,3094` 独立佐证同一设计判断 |
| `render-site-og.mjs` | 11 | 仍有效 | 无 | `package.json:52` `site:og` 别名；纯捕获工具零断言逻辑，本质构建工具非门禁 |
| `generate-custom-icons.mjs` | 63 | 仍有效 | 无——正向反例：被 `verify-icons.mjs:5` 当库导入复用而非另起重复实现 | `package.json:49`；`src/icons/custom/` 现行 20 SVG |
| `verify-icons.mjs` | 157 | 仍有效 | 可降频；与 `assert-rp211-contracts.mjs` 共享 `stripMarkRefs`（见四之二） | `package.json:16`；SVG/manifest 数一致；`main.tsx:67` strokeWidth 现行 |
| `assert-test-count.mjs` | 68 | 仍有效 | 无——无独立别名是结构性设计（须在链尾统计前序全部用例）非孤儿 | 仅内联 `test:e2e` 链尾；`minimum=333`；`README.md:109,131` 定位为质量门密度旗舰 |
| `assert-app-highwater.mjs` | 68 | 仍有效 | 可降频（三处） | `HIGH_WATER_LINES=2738` 与本会话现跑 `wc -l App.tsx`=2738 精确相等 |
| `assert-process-trace.mjs` | 50 | 仍有效 | 可降频 | `ProcessTrace.tsx`/`App.tsx:220,2181,2316` 均现行 |
| `assert-chat-ui-contracts.mjs` | 63 | 仍有效 | — | 8 目标文件全存在；实跑 exit 0；`Typewriter.tsx`（期望退役）确认不存在 |
| `assert-credential-contracts.mjs` | 116 | 仍有效 | — | 7 目标文件全存在；实跑 exit 0 |
| `assert-host-auth-contracts.mjs` | 193 | 仍有效 | 观察：单文件累积四票契约（HOST-AUTH-LITE+CASE-ROOT-1+AUDIT-SEAL-1+CASE-TITLE-CONVERGE-1），语义健康但检索性弱 | 13 目标文件全存在；实跑 exit 0；`case-store.ts:27,148-159`/`case-scope.ts:35,58` 现行；`webkitdirectory` 全仓零命中 |
| `assert-legal-s3-contracts.mjs` | 97 | 仍有效 | 可归并候选→`assert-work-live-contracts.mjs`（内容级：`DEMO_FORBIDDEN` 九项中七项字面相同，见四之二） | 15 项符号 grep 逐一命中；实跑 exit 0 |
| `assert-material-contracts.mjs` | 129 | 仍有效 | 可归并候选→`assert-host-auth-contracts.mjs`（内容级：composition-root 注入断言七项同形，见四之二） | 6 目标文件全存在；实跑 exit 0 |
| `assert-neutral-source.mjs` | 115 | 仍有效 | 可降频（site:guard×test:e2e 双跑确认） | 实跑 exit 0；`package.json:13`→`lint:neutral`；`test:e2e` 内联 |
| `assert-preview-boundaries.mjs` | 31 | 仍有效 | — | 3 目标目录/文件均存在；实跑 exit 0 |
| `assert-ui-surface-contracts.mjs` | 116 | 仍有效 | — | `data-state="unwired"` 现存 6 处与 `EXPECTED_UNWIRED_MARKERS=6` 吻合；实跑 exit 0 |
| `assert-work-live-contracts.mjs` | 112 | 仍有效 | 可归并候选→`assert-legal-s3-contracts.mjs`（见上） | 7 目标文件全存在；`App.tsx` 四处方法现行；实跑 exit 0 |
| `assert-work-port-contracts.mjs` | 40 | 仍有效——**已核实排除"被 WORK-LIVE-1 取代"的表面猜想** | — | `main.tsx` 同时含 demo fixture 与 WORK-LIVE-1 真实装配，按不变量 7 双向隔离共存非互斥；实跑 exit 0 |
| `assert-work-safe-case-id-parity.mjs` | 32 | 仍有效 | — | TS/Rust 双语言镜像锁，批内无同类第二例；实跑 exit 0 |
| `assert-schema-exemplar.mjs` | 43 | 仍有效 | 可降频（site:guard×test:e2e 双跑） | 实跑 exit 0；三个独立 r2-tier-ledger.json 校验器之一（见四之五） |
| `assert-schema-exemplar.test.mjs` | 137 | 仍有效 | 可降频（同上） | `node --test` 17/17 通过 |
| `schema-exemplar-contract-lib.mjs` | 121 | 仍有效 | — | 纯函数被 driver 与 test 共同消费 |
| `assert-skin-r2-ledger.mjs` | 27 | 仍有效 | 可降频（双跑） | 实跑 exit 0（206 条目全核验通过） |
| `assert-skin-r2-ledger.test.mjs` | 143 | 仍有效 | 可降频（同上） | `node --test` 12/12 通过 |
| `skin-r2-ledger-contract-lib.mjs` | 227 | 仍有效 | — | 206 条硬编码签署行与当前账本逐行核验通过 |
| `compile-design-md.mjs` | 44 | 仍有效 | 观察：仅接线 site:guard，**不在** test:e2e——单点覆盖缺口而非双跑 | 实跑（drift 模式）exit 0 |
| `compile-design-md.test.mjs` | 123 | 仍有效 | 同上 | `node --test` 7/7 通过 |
| `compile-design-md-lib.mjs` | 146 | 仍有效 | 观察：语义是编译器（产出 markdown）非验证器，与另两三角组的 lib 不同类 | 被 driver 与 test 共同消费 |
| `assert-rule-grammar.mjs` | 398 | 仍有效 | 观察：批内单文件行数最大；已核实**非**第四个三角成员（无姊妹 test） | 实跑 exit 0（"主界4·次界93·退16·不换65·共164处"与源内计数吻合）；r2-tier-ledger.json 第三个独立校验器 |
| `rule-grammar-lib.mjs` | 82 | 仍有效 | 观察：批内唯一无姊妹 `.test.mjs` 的 lib（覆盖靠对真实 styles.css 的间接实跑） | 被 driver 消费 |
| `assert-schema-parts.mjs` | 262 | 仍有效 | 观察：含刻意的前向红卫设计（:194-251，字段尚未落地故意保持通过态） | `schema-parts.tsx`/`site/index.html` 均存在；实跑 exit 0 |
| `assert-voice-copy.mjs` | 32 | 仍有效 | — | `docs/design/voice.md` 存在；实跑 exit 0 |
| `assert-voice-copy.test.mjs` | 63 | 仍有效 | 观察：三角形态与 schema-exemplar 一致但从未被 site:guard 引用，不构成双跑 | `node --test` 5/5 通过 |
| `voice-copy-lib.mjs` | 174 | 仍有效 | — | 纯函数零 I/O，被 driver 与 test 共同消费 |

---

## 三、清点表 · `site/scripts/` + `release/scripts/`（14 门，3816 行）

| 文件 | 行数 | 主状态 | 附加标记 | 依据 |
|---|---:|---|---|---|
| `site/scripts/build.mjs` | 20 | 仍有效（构建脚本为主） | 观察：非纯门，20 行仅 1 行是委派门禁，其余是文件拷贝 | `package.json` `site:build`；`pages.yml:33` 直接调用；门禁委派与 `deslop-scan.mjs` 共用实现，后者现场 PASS 间接验证 |
| `site/scripts/render-og.mjs` | 85 | 仍有效（但非门） | 观察：纯渲染工具，自身无 pass/fail 语义，目录位置造成的误分类 | 通篇无 `process.exit`；真正绑定门是 `versional-language-contract.test.mjs:116-139`（R-13），已现场 PASS |
| `site/scripts/fixture-claims.mjs` | 212 | 仍有效 | — | 3 个消费点 import；经 `deslop-scan.mjs` 现场 PASS 间接验证 |
| `site/scripts/deslop-scan-lib.mjs` | 1563 | 仍有效 | 观察：15 个导出零死代码，体量是门禁随设计批次线性累积非堆料（见四之三） | 全部 15 导出被 `deslop-scan.mjs:5` 逐一消费；`node --test` 46/46；本体实跑 PASS（927 文件） |
| `site/scripts/deslop-scan.mjs` | 298 | 仍有效 | — | 实跑 PASS；`site:guard` 与 `pages.yml:31` 调用 |
| `site/scripts/deslop-scan.test.mjs` | 862 | 仍有效 | — | `node --test` 46/46，多为对抗式反例注入测试 |
| `site/scripts/versional-language-contract-lib.mjs` | 114 | 仍有效 | — | 两消费点现场均 PASS |
| `site/scripts/versional-language-contract.test.mjs` | 139 | 仍有效 | 观察：15 测试中 3 个（VL3-S01/VL3-T01/R-13）不经过 lib，是独立内嵌字节绑定门，"三件套"标签不完全准确 | 现场 15/15 PASS；截图哈希/OG 卡哈希现场核对吻合 |
| `site/scripts/assert-versional-language.mjs` | 17 | 仍有效 | — | `site:guard` 直接调用；实跑 PASS |
| `site/scripts/assert-p5-font-runtime.mjs` | 85 | **已失效（局部：数据位置断言）**，字体断言仍绿 — 详见零节 | 可归并（与 `assert-reduced-motion.mjs` 共享约 12 行 Playwright 启动样板） | 见零节全文；`line:5` 自述不挂 site:guard 系刻意设计 |
| `site/scripts/assert-reduced-motion.mjs` | 84 | 仍有效 | 可归并（同上，样板级非内容级） | 实跑 PASS（3 条运行动画在名册内、8 点演示层归零、四相位零朱） |
| `release/scripts/assert-release-truth.mjs` | 23 | 仍有效 | — | `site:guard`+`release:guard` 两处调用；实跑 PASS |
| `release/scripts/release-truth-lib.mjs` | 181 | 仍有效 | 观察：属最新一枚仓库提交触及领域，活跃维护区 | 5 处版本源现场读值一致；`a1c3ae7` 未改版本号未使此门失真 |
| `release/scripts/release-truth.test.mjs` | 133 | 仍有效 | — | 实跑 10/10；含 1 条元测试核对 `docs/engineering/release.md` |

---

## 四、结构性发现（供未来动作票参考，本票不裁定去留）

### 4.1 已失效（1 项确认死亡 + 1 项现行漂移）

- `capture-rp1-compact.mjs`：`enter-compact-layout` testid 已被移除的组件重构甩掉，`apps/desktop/SPEC.md:2707` 早有登记，本票独立复核一致。
- `assert-p5-font-runtime.mjs`：见零节——不是门本身失效，是它监视的目标已经漂移而门从未挂上自动化路径去发现。

两者共享一个根因家族：**从未接入任何自动化路径的门，是这个仓库唯一真正的"失效"风险面**——凡挂在 `site:guard`（本仓唯一 CI 入口）或 `test:e2e` 的 63 门无一例外仍在跟踪现行源码；2 个手工调用门（`assert-p5-font-runtime.mjs`、`assert-reduced-motion.mjs`）里已有一个静默判红。

### 4.2 可归并候选，按证据强度分三档

**内容级（最强证据——断言本身近乎重复，不只是文件名像）**：
- `assert-legal-s3-contracts.mjs` ↔ `assert-work-live-contracts.mjs`：`DEMO_FORBIDDEN` 数组九项中七项字面相同。
- `assert-material-contracts.mjs` ↔ `assert-host-auth-contracts.mjs`：composition-root 注入断言七项同形，仅符号名不同（`MaterialStore`↔`HostAuthPort`）。

**外壳级（结构雷同，内容不可替代——建议若做也只做 DRY 重构，不合并语义）**：
- rpXX 族 7 门（rp26/27/28/29/291/210/211）：核实后**驳回**内容合并——50 余条断言逐一核对，无一过期，无两条检查同一件事，每门锁的是"哪一轮设计规则"的可追溯性。合并会丢失定位精度，与「静默降级零容忍」纪律相悖。唯一站得住脚的是把"读文件+断言收集+exit"外壳抽成共享 helper（本目录已有 `*-lib.mjs` 先例），语义不变。
- `capture-finale-audit.mjs` ↔ `capture-p3-seal-ink.mjs`：近乎逐字的"进入 demo 会话"引导序列（`provider-setup`→"先查看演示"→`welcome-demo-start`→`provider-skip`→落点 testid）——已死的 `capture-rp1-compact.mjs` 是这种重复的活教材，它的引导序列后续步骤先腐烂，另两份仍工作正常。建议抽 `enterDemoSession(page)` 共享。
- `assert-p5-font-runtime.mjs` ↔ `assert-reduced-motion.mjs`：共享约 12 行 Playwright 启动样板（argv 解析、借道 `apps/desktop` 的 `@playwright/test`、launch/newContext/newPage/goto），断言内容完全不同，只建议共享样板段。

**不建议（表面重复，实为刻意冗余）**：
- `verify-icons.mjs` 与 `assert-rp211-contracts.mjs` 的 `stripMarkRefs` 逐字相同，但 `verify-icons.mjs:128-137` 注释明确说明这是**有意的失效安全冗余**（"两处若漂移，严的那一份先红，方向安全"）——合并会推翻已拍板的设计理由，如实登记，留给架构角色定夺是否仍要维持这个例外。

### 4.3 可降频信号的重新校准

初始假设"挂进 `test:e2e` 的门都在拖慢一条约 6 分钟的慢链、该降频"部分不成立。核实后的真实拓扑：

- `.github/workflows/pages.yml` 只在 `push: branches: [main]` 触发（**无 PR 触发**），且只跑 `site:guard`——这是本仓**唯一**自动化入口。
- `test:e2e` 从不被 CI 调用，是开发者本地手动跑的收口检查（`docs/engineering/workflow.md` 步骤 5-6 描述的人工纪律）。
- 因此 19/25（批 A）+ 若干（批 B/C）门标记的"可降频"，更准确的定位是**`package.json` 命令定义层面的重复**（同一条 `node scripts/X.mjs` 命令被抄写进两个脚本别名），不是已证实的 CI 运行时浪费——32 个可执行门现场计时全部 120–209ms，行数大小与耗时无关（398 行的 `assert-rule-grammar.mjs` 属最快之列）。
- 唯一有真实覆盖含义的是反向缺口：`compile-design-md.mjs`/`.test.mjs` **只**接线 `site:guard`、不接线 `test:e2e`——只跑 `test:e2e` 的开发者会完全跳过这道门，这比"跑两遍"更值得关注。

### 4.4 可发现性问题

`assert-host-auth-contracts.mjs`（193 行）文件名只提 HOST-AUTH-LITE，实际同时锁 HOST-AUTH-LITE + CASE-ROOT-1 + AUDIT-SEAL-1 + CASE-TITLE-CONVERGE-1 四票契约——内容健康（四票断言全部现行为真），是原地累积而非碎片化，但检索性弱：下一个人想找"CASE-TITLE-CONVERGE-1 的契约锁在哪"，从文件名猜不到。

### 4.5 治理分散：`r2-tier-ledger.json` 三门无并集校验

`docs/design/r2-tier-ledger.json`（206 条目）被三个独立维护的门同时校验，覆盖不重叠（按提案行前缀分段）：`assert-schema-exemplar.mjs`（通用形状：任意行 tier 闭集+提案行正则）、`assert-skin-r2-ledger.mjs`（硬编码冻结 P2–P5/VL 系具体行）、`assert-rule-grammar.mjs`（P1 系 113 行与 CSS 消费点交叉）。**没有第四道门校验"三段并集=账本全集"**——一个前缀拼写错误的行理论上可能三门都不认领而悄悄漏检。当前未发现这类漏检的实证（三门各自现场全绿），登记为治理结构观察，非当下缺陷。

### 4.6 目录位置造成的范围噪音（有意排除，非清点疏漏）

- `export-app-icons.mjs`：dev-only 工具，`SPEC.md:3086,3094` 独立佐证不入门链是既有设计判断，非孤儿疏漏。
- `render-site-og.mjs` / `site/scripts/render-og.mjs`：纯渲染/截图工具，自身无 pass/fail 语义，因位于 `scripts/` 目录而被本清点的目录范围定义扫入，本质是构建/工具脚本非验证门。
- `site/scripts/build.mjs`：20 行里 19 行是构建流程，1 行是门禁委派——同上，整体归入"门"是范围定义的粗粒度副作用。

---

## 五、验证方法索引

以下命令可在 `impl/gate-inventory-1` worktree（或 main，因为清点期只读，两处树状态一致）下复现本文档的关键判断：

```bash
# 范围与行数复核（独立于本文档——不得从本文档反推期望值）
find apps/desktop/scripts site/scripts release/scripts -maxdepth 1 -name "*.mjs" | wc -l   # 65
find apps/desktop/scripts site/scripts release/scripts -maxdepth 1 -name "*.mjs" -exec wc -l {} \; | awk '{s+=$1} END {print s}'   # 8557

# 零节：现行漂移复现
node site/scripts/assert-p5-font-runtime.mjs   # 需先起 site/ 静态服务，见脚本内注释；字体绿/位置红
git show 10a354e -- site/index.html             # 归因提交

# 已失效复核
grep -rn "enter-compact-layout" apps/desktop/src/   # 零命中

# 双跑复核
grep -n "lint:schema-exemplar\|lint:skin-r2-ledger" package.json apps/desktop/package.json
grep -n "assert-schema-exemplar\|assert-skin-r2-ledger" apps/desktop/package.json   # test:e2e 链内联同名

# CI 拓扑复核
cat .github/workflows/pages.yml   # 仅 push main 触发，仅跑 site:guard，无 PR 触发、无 test:e2e
```
