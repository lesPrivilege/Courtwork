# packages/reading-view 验收记录

## READING-SDT-1R · 块级直子过滤器 fail-closed 独立验收（2026-08-04）

验收对象：`claude/reading-sdt-1@8f5bf5b`（链 `10e6451` 首轮 → `c9c5f28` 门数字登记 → `8f5bf5b` 返修），基线 `main@8f4e937`。环境：独立 detached worktree `.claude/worktrees/accept-rsdt-2`，`pnpm install --frozen-lockfile` 后拓扑构建；实现会话为另一会话，其回执一律按未证宣称核。

**结论：放行（PASS），含一处 fix-by-acceptance。** 首轮同一验收判 REJECT，拒因已在 1R 结构性根治；本轮专项再攻未能在合法 OOXML 上构造出新的静默丢内容。

### 一、首轮拒因的闭合核实

首轮拒因：四道块级直子过滤器只闭 body 与 `w:tc` 两道，`children(tbl,'tr')`／`children(tr,'tc')` 仍「不认识就跳过」；最重一枚是把合并单元格包进一层 `w:sdt` 即从 `disabled` 变 `ok` 且内容全丢，本包唯一保真出口被绕过。

1R 以 `LevelGate` 四级表 ＋ 唯一门禁 `gatedChildren` 闭合，并以 `readTable` 取代「采集一遍 ＋ `tableHasMergedCells` 再扫一遍」。**结构性宣称经源码核实成立**：`readTable` 的行、单元格与合并探测消费同一份 `gatedChildren` 产物，包装形在 `TBL_GATE` 即被拒、早于任何合并探测；`docx-reader.ts` 内已无第二遍按名扫描——`children()` 的余下两个消费者 `isBoldParagraph`／`hasMergeMark` 都只在已过门元素**内部**做属性查找，不再自行遍历块级直子。

### 二、born-red 复现（验收自跑，不采信回执）

生产面逐字节回退到 `c9c5f28`（`git show` 比对 IDENTICAL），测试面保持 `8f5bf5b`：

- **10 failed / 12 passed（22）**，与回执逐字相符。
- 红形逐条实测为静默丢内容而非「没抛错」：P1／P9／P11／P3 均 `status:'ok'` ＋ `md=""`；P2 退化成空表 `"|  |\n|  |"`；tc 级 `zz:tcPr` 吞掉正文只剩 `"| 期次 |\n| --- |"`。九枚红的断言差异均为「实得 `ok`、应得 `disabled`」。
- 第十枚（`w:tcPr` 内 `zz:gridSpan`）是反方向红（实得 `disabled`、应得 `ok`），对应下方裁断①，回执已如实标出为放宽方向。

### 三、三轴变异复跑（验收自跑）

在 `8f5bf5b` 上逐枚命中校验、复原后 `git status` 空：

| 变异 | 回执宣称 | 验收实测 |
| --- | --- | --- |
| ① `TBL_GATE` 良性名单收编 `'sdt'` | 恰 2 红（P1、P10/P11） | **恰 2 红，枚名相符**；`zzUnknownBlock`／P2／P9 全绿 |
| ② `gatedChildren` 撤命名空间判据 | 恰 5 红 | **恰 5 红**（P3／P4／`zz:tr`／`zz:tc`／`zz:tcPr`），结构族全绿 |
| ③ `children()` 退回 localName-only | 恰 1 红 | **恰 1 红**（`zz:gridSpan`） |

**变异③红面之窄的独立评判：论证成立，但覆盖不完全。** 四道门禁确已把 `children()` 的命名空间感知在所有受门层级上吸收，其唯一独立可观测面确是属性层——此点复核后同意。但该面有两个子情形，SPEC 登记③自己也点了名（`w:tcPr` 内 `zz:gridSpan` 与 `w:rPr` 内 `zz:b`），只配了前者反例。验收实测后者亦为活的区分点：`<w:p><zz:r><zz:rPr><zz:b/></zz:rPr><w:t>第一条 总则</w:t></zz:r></w:p>` 在变异③下产出 `## 第一条 总则`、在 1R 下产出 `第一条 总则`。该子情形只影响 heading 判定、**不丢内容**，且伪造形 Word 不会产生，故记为覆盖注记而非缺口，不阻断放行。

### 四、专项再攻：新 LevelGate 下能否仍静默丢内容

13 枚攻击语料（行内 run 级 `w:sdt`、`w:hyperlink`、属性容器内藏正文、`mc:AlternateContent`、`w:tblPrEx`、tbl/tr 级 range markup、`w:permStart`、无命名空间裸标签、多 `w:body` 等）实测：

- **合法 OOXML 上零新增静默丢失。** 行内 run 级 `w:sdt` 与 `w:hyperlink` 的文本由 `textOf` 深度遍历如实收进（`"前 违约金壹佰万"`／`"链接文本条款"`），故 SPEC 把行内层判在块级门禁面外**属实**，登记如实。
- 良性属性容器（`w:tcPr`／`w:sectPr`／`w:tblGrid`）内部不过门，往里塞正文确实读不到；但 `CT_TcPr`／`CT_SectPr`／`CT_TblGrid` 在 schema 上均不容纳 `w:p`／`w:tr`，Word 自身亦不渲染，故不构成「用户在 Word 看得见而模型看不见」的保真缺口。登记不修。
- `mc:AlternateContent` 出现在 `w:p` 内时，`Choice` 与 `Fallback` 文本被一并收进（`"甲版乙版"`），属**增字非丢字**，与 SPEC 登记 2 同族。body 级同结构走门禁降级，无泄漏。
- 唯一找到的仍在场的同禁区形态是**多 `w:body`**（见第六节登记 1），属本票之前既有面，不阻断。

### 五、两枚裁断项

**①（接受）`w:tcPr` 内 `zz:gridSpan` 不再误判为合并。** XML 中元素身份由「命名空间 ＋ 局部名」共同决定，`zz:gridSpan` 不是 `w:gridSpan`；Word 按 MCE 忽略未知命名空间元素，该单元格在 Word 里本就不合并，故按不合并转出与 Word 渲染一致。真实合并仍只由 `w:gridSpan`／`w:vMerge` 表达且检测未变。此改动消灭的是一个假阳性过度降级，不引入任何内容丢失方向的风险，且已有专配反例锁住。**裁定：接受，无需后续动作。**

**②（补齐，按 fix-by-acceptance 自修）tbl/tr 两级良性名单的不对称。** 验收核 ECMA-376 Part 1 wml.xsd：`CT_Tbl` 的序列以 `EG_RangeMarkupElements*` 起头；`CT_Tbl`／`CT_Row` 的行内容组（`EG_ContentRowContent`／`EG_ContentCellContent`）均含 `EG_RunLevelElts`，其中即含 range markup。故 `bookmarkStart|End`／`commentRangeStart|End`／`proofErr` 在 `w:tbl`、`w:tr` 直子位置**合法且 Word 常发**（跨行书签、表格批注区间）。1R 一律降级的代价不是丢内容，而是**带书签或批注区间的真实表格合同被整文件拒读**——而这类文件在本票之前读得出来（空标记被按名采集天然跳过），1R 把一个正确案例变成了拒绝，属本票引入的真实回归，故补齐。

同时补 `w:tblPrEx`：它是 `CT_Row` 的明文直子、零正文承载，与已在名单里的 `trPr` 是同一类行属性元素，实测 1R 下同样触发整文件拒读。**此枚超出协调授权的「两集合各加 RANGE_MARKUP」范围，验收在此显式声明为自修扩展**，理由是与 `trPr` 二行之隔的同类遗漏若不同批补齐则逻辑不自洽。

收编原则（三条同时满足才进名单，任一不满足留给架构）：schema 合法直子、零正文承载、同一元素已在别的层级被判为良性。据此 `w:permStart`／`w:permEnd`／`w:ins`／`w:del`／`w:altChunk` 一概不动——它们在任何层级都还没有先例，属另一议题，转登记。

fix-by-acceptance 红绿证（验收自跑）：改生产面之前 4 枚新反例先红（tbl 级书签／tr 级书签＋批注＋proofErr／`tblPrEx`／放宽守卫），改后全绿，包内 **161/161**。追加两枚变异：撤 `TBL_GATE` 的 `RANGE_MARKUP` → 恰 2 红（tbl 书签枚 ＋ 放宽守卫枚）；撤 `TR_GATE` 的 `tblPrEx` → 恰 1 红。既有变异①在补齐后由 2 红变 3 红，多出的一枚正是新增的放宽守卫——**是加钉不是稀释**，其余枚名不变。

放宽只及零正文承载的良性面：专设「放宽守卫」反例，在 tbl／tr 直子位置同时放入 range markup 与 `w:sdt`／`w:customXml`，断言仍整文件降级且 detail 具名包装形而非书签，锁住良性面放宽不得渗进内容面。

### 六、登记（不修，转后继票）

1. **多 `w:body` 静默丢内容**：`docx-reader.ts` 的 `doc.getElementsByTagNameNS(W,'body')[0]` 是全树搜索取首枚，不是取 `w:document` 直子。实测两个同级 `w:body` 时，第二个 body 的全部正文静默消失且 `status:'ok'`、`md=""`（对照单 body 正常读出）。该行两次提交均未触碰、属本票之前既有面，且票面范围是直子过滤器而非 body 选取，故不阻断本票；但它是本轮唯一找到的仍在场的同禁区形态，建议单开一票（取直子 ＋ 多 body 显式 `corrupt_file`）。
2. `w:permStart`／`w:permEnd`／`w:ins`／`w:del`／`w:altChunk` 于 body 直子合法但不在名单，触发整文件降级（fail-closed 方向安全）。是否比照收编需架构就 `EG_RunLevelElts` 整组定调。
3. 只含图片（`w:drawing`）无文本的 `w:p` 被静默丢弃（`textOf` 为空即 `continue`）。`DocxBlock` 闭集无图片形，属既有「最小可用」代价，本票未改变其行为。
4. 变异③覆盖注记：`w:rPr` 内外部命名空间加粗标记这一子情形无反例（见第三节）。

### 七、边界与门

- 边界合规：无第二套 OOXML 解析底层；`DisabledReason` 六元闭集、`ReadingViewOutcome` 形状、`DocxBlock` 闭集、锚点契约全部零改动；`docx-preflight.ts`／`xml-guard.ts` 零触碰；converter 与 desktop 零改动。命名空间两级判据与 `packages/output` 已放行的 `0c94b94` 同口径。
- 触碰面与已合三票（`7fd2fba`／`0c94b94`／`442cc68`）零重叠经实测：`8f4e937..8f5bf5b` 三文件与 `8f4e937..4ab5671` 十四文件交集为空，main 侧无一涉 `packages/reading-view`，依赖的 `packages/schemas` 未动。回执该宣称成立。
- **验收自跑全量门**：`pnpm -r build` exit 0；`pnpm lint` exit 0；root **1802/1802**（167 files）；desktop **690/690**（75 files）；隔离端口 `test:e2e` 全链（含链上全部守卫脚本）Playwright **352/352**，exit 0。跑门时机器 Playwright/cargo 均零进程，串行执行。
- `c9c5f28` 登记的首轮全量门数字（root 1787 等）来自已崩溃会话，按「跑腿的数字须自己复测」判例一律作暂记；本记录的数字为验收自跑，是唯一有约束力的一组。
- 门跑毕后只追加了本记录与 SPEC 裁决段两处 markdown（无门读本包 md，已 grep 核实），并复跑 `pnpm lint` 收口。

## AUDIT-SEAL-3 · 包域律守卫铺满验收（2026-07-18）

- **✅ 放行**：新 `package-boundary.test.ts` 复制 core 的 `FORBIDDEN_LITERALS` 同表（逐项核对完全相同）+ `FORBIDDEN_PACKAGES` 按本包实际依赖面裁剪，锁生产源零 vertical/demo 渗漏。验收亲自向 `src/index.ts` 追加含「风险清单」的字面量，测试独立触红（1 failed/2 passed）；撤除后复绿（3/3）。零运行代码、依赖、格式、状态机或公共抽象变化，既有 reading-view 行为与 golden 不变。完整报告见 `packages/tools/ACCEPTANCE.md` 的 AUDIT-SEAL-3 报告。

## LAUNCH-FIX · DOCX 安全预检归底座（2026-07-13）

验收对象：`origin/codex/launch-fix@559d8d9`；环境：clean detached worktree，冻结 lockfile 重装后先执行拓扑 build。结论：**放行 output → reading-view 的已拍板依赖边**。

### 同源证据

- 唯一防线源码为 `src/security/docx-preflight.ts::preflightDocx`：文件大小 → 只读中央目录 → zip bomb → 宏工程 → inflate → macroEnabled → 全部 XML/RELS 的 DOCTYPE/ENTITY 与严格 XML，顺序符合“可疑 zip 不先解压”。
- reading-view 的 `src/docx/docx-reader.ts` 直接消费该函数；output 的 `docx-zip.ts` 经包子路径 `@courtwork/reading-view/docx-security` 解析到同一构建产物。两端没有复制防线。
- 错误闭集由同一 `DocxSecurityError` 给出：`file_too_large | zip_bomb_suspected | malicious_content | corrupt_file`；reading-view 只在边界把该 reason 无损投影到 disabled outcome。

### 运行证据

- 向真实 output `applyRevisionInstructionSet` 入口喂入 zip bomb、宏工程、XXE 三反例，逐条由本包防线拒绝：**3/3 passed**。
- 联合 reading-view docx/malformed 与 output 集成：**3 files / 25 tests passed**；root 全量：**104 files / 850 tests passed**；全仓 build exit 0。

无实现缺口、无契约红项、无 `[需架构拍板]`；允许 LAUNCH-FIX 合流并恢复发布。
