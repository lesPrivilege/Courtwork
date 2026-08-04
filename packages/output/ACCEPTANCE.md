## AUDIT-SEAL-3 · 包域律守卫铺满验收（2026-07-18）

- **✅ 放行**：新 `package-boundary.test.ts` 复制 core 的 `FORBIDDEN_LITERALS` 同表（逐项核对完全相同）+ `FORBIDDEN_PACKAGES` 按本包实际依赖面裁剪，锁生产源零 vertical/demo 渗漏。验收亲自向 `src/index.ts` 追加含「风险清单」的字面量，测试独立触红（1 failed/2 passed）；撤除后复绿（3/3）。零运行代码、依赖、格式、状态机或公共抽象变化，既有 OOXML/output 行为、golden 与兼容范围不变。完整报告见 `packages/tools/ACCEPTANCE.md` 的 AUDIT-SEAL-3 报告。

---

# W4 验收报告：packages/output

验收日期：2026-07-09  
验收角色：Codex（验收工程师）  
结论：**放行 W6 消费 `packages/output` 与 `RevisionInstructionSet` 新契约**。W4 自身修订产出管线、schemas 新类型、registry S4 同步均通过验收；本轮发现的字体错乱为实现级缺陷，已按授权修复。全量 build 当前被 W7/eval 在途未提交代码阻塞，非 W4 问题，详见下文。

## 本轮修复

- `fix-by-acceptance`：补齐输出文档所有 `w:r` 的字体声明。
  - 先加回归测试：`word/document.xml` 与 `word/comments.xml` 中每个 `w:r` 必须含 `w:rPr/w:rFonts`，且 `w:ascii`、`w:eastAsia`、`w:hAnsi`、`w:cs` 四属性齐全；该测试在修复前实测变红，首个失败点为标题 run 缺 `w:rFonts`。
  - 修复：生成 run 时补 `w:cs`；序列化前规范化 `document.xml` 所有 run；批注正文 run 显式写完整字体。
  - 已重新生成 golden XML 与 `test/manual-verification/sample-redline.docx`。
  - 已把“隔行/隔字交替字体错乱”作为具体病例补入 `verification-checklist.md` 字体核对项。

## 实测结果

- 干净环境：已执行 `rm -rf node_modules packages/*/node_modules eval/node_modules` 后 `pnpm install --frozen-lockfile`，安装成功，lockfile 未重写。
- 全量测试：`pnpm test` 通过，实测 **29 files / 225 tests**。提示中的 196 口径已被当前工作区 W7/eval 在途内容改变；本层定向测试实测 **16 tests**。
- 本层定向：`pnpm vitest run packages/output/src/apply-revision-instruction-set.test.ts packages/output/src/apply-instructions.test.ts packages/output/src/locate.test.ts --reporter=verbose` 通过，**3 files / 16 tests**。
- lint：`pnpm lint` 通过。
- build：`pnpm -r run build` 被 W7/eval 在途文件阻塞：`eval/src/rules/revision-set-match.ts` 对 `tableRow` locator 访问 `quote`。按用户要求未触碰 eval。排除 eval 后 `pnpm --filter '!@courtwork/eval' -r run build` 通过，覆盖 schemas/registry/output/tools/demo-data。
- docx 完整性：`unzip -t packages/output/test/manual-verification/sample-redline.docx` 通过。

## 契约与跨层同步

- `RevisionInstructionSet` 契约通过：四种 `kind` 判别联合（replace/insert/delete/commentOnly），`commentOnly.annotation` 必填，其余三类可选；locator 三策略为 text/tableCell/tableRow。
- Citation refine 通过：`sourceAnchors` 非空或 `statuteRef` 存在至少一腿；纯散文依据引用非法。JSON Schema 导出含 `RevisionInstructionSet`，drift 测试覆盖导出一致性；已知 `.refine()` 不能完整表达到 JSON Schema 的限制已写入 schemas/SPEC。
- `ArtifactTypeEnum` 已扩展 `RevisionInstructionSet`。
- registry S4 通过：`outputArtifacts: [RevisionInstructionSet]`，confirmation gate 已升级为 artifact 引用，builtin 场景测试同步；schemas/registry 对应 TODO 已清。
- 未发现需要修改 schema 字段/语义或 RevisionInstructionSet 契约的问题；无 `[需架构拍板]` 阻塞项。

## 管线语义抽查

- 模糊定位三级策略有测试覆盖：精确唯一、模糊命中、歧义/低置信拒绝；定位失败返回 `locator_not_found` 并跳过，不错插。
- 批注与修订同遍构造：批注锚点挂在当前指令构造的节点/段落，不做 diff 后搜索。
- Golden files 比对 `document.xml` / `comments.xml`，并与 spike 中 docx4j 直接著录黄金参照的结构口径一致（`w:ins`/`w:del`/`commentReference`/表格行删除）。
- 纯 TS 路线保持：`fflate` + `@xmldom/xmldom`，无 JVM/Python 运行时依赖；对外接口仍为 `applyRevisionInstructionSet` 单入口。

## 视觉核验

- WPS：已用 `/Applications/wpsoffice.app` 打开修复后的 `test/manual-verification/sample-redline.docx`，137% 放大核对。
  - 首页截图：`test/manual-verification/screenshots/wps-current.png`。
  - 中后段截图：`test/manual-verification/screenshots/wps-pagedown.png`。
- 观察结论：标题黑体观感正常；正文与新增保密条款为仿宋观感，选中新增条款时 WPS 字体框显示 `FangSong_GB2...`；数字/西文（如 `￥300,000.00`、`20%`、日期数字）观感统一；修订痕迹与批注可见；未再见“隔行/隔字交替”字体错乱。
- Word：本机未安装 Microsoft Word（`mdfind` 仅发现 WPS），因此未做 Word 端截图核验。

## Spike 卫生

- `packages/output/spike/` 三条路径归档存在：py-redlines、docx4j、ts。
- `eslint.config.js` 已忽略 `**/spike/**`。
- `git ls-files packages/output/spike | rg 'target/|__pycache__|\\.venv'` 无输出；构建产物/缓存目录未入库。

## 遗留风险

- WPS 右侧 Design Assistant 仍提示文档缺失若干非本管线指定字体（如 MS Gothic / MS Mincho / Courier），但正文实际选择与 OOXML 不变量均指向仿宋/黑体/Times New Roman；未观察到字体交替错乱。
- `pnpm -r run build` 需待 W7/eval 在途代码修复后恢复全量通过；W4 相关包在排除 eval 后已 build 通过。

---

## LAUNCH-FIX · DOCX 同源预检独立验收（2026-07-13）

对象：`origin/codex/launch-fix@559d8d9`，clean detached worktree。结论：**放行**。

- 静态唯一边：`packages/output/src/docx-zip.ts` 的 `loadDocx` 直接导入 `@courtwork/reading-view/docx-security` 并返回 `preflightDocx(...).files`；output 内无另一份预检或裸 `unzipSync` 读取入口。
- 运行时解析：拓扑 build 后，Node 从 output 包上下文成功解析该子路径到 reading-view 的 `dist/security/docx-preflight.js`；reading-view 自身 `docx-reader.ts` 直接消费同一个源码函数。
- 真 output 路径反例（`applyRevisionInstructionSet`）：宏工程 `word/vbaProject.bin` → `malicious_content`；RELS 中 DOCTYPE/ENTITY → `malicious_content`；2MB 高压缩 XML → inflate 前 `zip_bomb_suspected`。逐名 verbose 实跑 **1 file / 3 tests passed**。
- 联合安全回归：output 集成 + reading-view docx/malformed **3 files / 25 tests passed**；root 全量 **104 files / 850 tests passed**。
- 新建文书：`compileDraftToDocx` 产物通过同一 `preflightDocx`，且 desktop 真实写入桥仅接受预检通过的 bytes。

无契约红项，无 `[需架构拍板]`。允许 desktop/output 消费并进入发布合流。

---

## OUTPUT-CORRECTNESS-1-ACCEPT · 独立验收（2026-07-15）

验收对象：`main @ 968a6cc`，基线 `39ba300`；实现链为 `6ed28aa`、`cad9235`、`0d4e398`、`f38c17a`、`b64161e`、`968a6cc`。其间 `8af98dd` 只改 `README.md` / `docs/architecture/system.md`，不作为代码验收对象。

结论：**放行 `OUTPUT-CORRECTNESS-1` 的本单范围**。七条自动化/契约收口、真实 Vite consumer、两场景 OOXML part/rel 证据与三个真实消费者均通过；无契约红项、无 `[需架构拍板]`。Word/WPS 真机打开—轻改—保存—回读明确未跑，不能据本报告声明 `external-validated` 或完整 Office/WPS 兼容。

### 环境、范围与全量门

- 使用独立 worktree `/tmp/courtwork-output-correctness-accept`，从无 `node_modules`、无 `packages/output/dist`、无工作树/索引差异的 `968a6cc` 建立；`pnpm install --frozen-lockfile` 成功，复用/安装 1047 个包，lockfile 未改。
- `git diff 39ba300..968a6cc --name-only` 实测 20 个文件：`packages/output/**` 16 个、`packages/demo-runtime` 两个指定装配点、`README.md` 与 `docs/architecture/system.md`；`packages/schemas`、`packages/core`、`apps/desktop` 差异为零。
- 目标 SHA 上首次从无预存 dist 跑 `pnpm -r build` 全绿（13/14 workspace project；output 先 build，随后 demo-runtime 与 desktop `tsc -b && vite build` 均通过），`pnpm lint` 全绿，`pnpm test` 实测 **134 files / 1148 tests**。
- 验收补入一条“同一指令集重复应用”精确守卫并留 demo-runtime SPEC 痕迹后，再跑 `pnpm -r build`、`pnpm lint` 全绿；`pnpm test` 实测 **134 files / 1149 tests**。

### 七条反例触红

所有反例均直接修改独立验收树中的真实实现/consumer，观察红后用精确反向 patch 还原；还原后相关六个测试文件实测 **37/37** 全绿。

1. 删除 `applyMinimalReplace` 对 `w:pPr` 的摘出/复位：`apply-instructions.test.ts` **1 failed / 8 passed**，明确报 `replaced paragraph lost its w:pPr entirely`；编号、样式与段前分页守卫有效。
2. 恢复对所有 `w:r` 的全局 `ensureCompleteRFonts`：两文件 **4 failed / 15 passed**；私有楷体被改成仿宋、无 `rPr` 的未触碰 run 被补写、标题被注入 `rFonts`，且 `golden-document.xml` snapshot 漂移。
3. 强制清空既有 comments body：`comments-preservation.test.ts` **4/4 失败**，既有正文/id 丢失、非连续 id 保全与重复应用保全均触红。
4. 强制无条件新增 comments relationship / content-type Override：原守卫触红；另以**完全相同**的 `commentOnly` 指令集连续应用两次，正常实现保持单一 rel、单一 Override、comment id 唯一且无悬挂引用；注入后该精确测试以 `2 !== 1` 触红。既有 id `[2,7]` 时新 id 均 `>=8`。
5. 令定位器忽略 `paragraphHint`：两文件 **3 failed / 17 passed**，两个 hint 选择测试与上层透传测试均红；“两个候选同距”及“hint 无匹配”两项仍维持 `ambiguous`，没有误消歧。
6. 关闭 non-applied 落盘门禁恢复跳过后交付：`apply-revision-instruction-set.test.ts` **2 failed / 8 passed**；默认策略与 confirm 缺精确 id 两项都因“不再抛错”触红。
7. 向真实 Vite consumer 注入 `import 'node:fs'`：browser consumer **1 failed / 1 passed**，bundle 出现 Vite browser-external / `node:fs` 后被守卫抓住。

### 结构与契约复核

- Golden 节点级比较：基线与当前均 59 个 run；只移除 **23** 个未触碰 run 的 `rFonts`。把这 23 处从旧 golden 移除后，整份 canonical document XML 完全相等，其他 run 差异为 0；这 23 个当前 run 均可在输入 docx 找到逐节点相同内容，无夹带。
- `ooxml-diff.test.ts -u` 重新生成两场景证据后，`test/manual-verification/ooxml-part-rel-diff.md` 与入库文件零 diff。场景一为 17→18 parts、单一 comments rel/Override、comment ids `[0..9]`；场景二保持 5→5 parts、既有 id `4` 与新 id `5`、单一 rel/Override。
- `NonAppliedInstructionsError` 默认阻断并携带全部逐条 typed `outcomes` 与未确认的 `nonApplied`；`onNonApplied:'confirm'` 只按 `confirmNonApplied` 的逐条 id 放行，错 id 仍阻断。
- 非 archive 执行码 grep 后，跨包真实消费者只有 desktop `compile-review-output.ts` 与 demo-runtime 两个装配点，未发现遗漏。output 内部测试与 Vite consumer 同步使用新契约；`src/index.ts` 公开导出 typed error/options。
- desktop 定向反例实跑证明 non-applied 会在 `writeDocx` 前抛 `NonAppliedInstructionsError`，携带 `instr-risk-confirmed(locator_not_found)`；`App.tsx` 的既有 catch 以 `ok=false` 展示原错误 message 并跳过后续写入，不是静默失败。还原临时反例后 desktop 定向测试 **1/1** 通过。
- `demo:s3` 实跑产出 **39,651 bytes** docx，6 applied + 1 `locator_not_found`、7/7 考点、golden PASS；`demo:legal` 实跑产出 **4,606 bytes** docx，6 applied + 1 `locator_not_found`、11/11 锚点、golden PASS。两条链在默认必阻断的前提下仍取得含 non-applied outcome 的 docx，证明“先撞门禁→读 `error.nonApplied`→精确 id 确认→再落盘”真实执行；两份产物 `unzip -t` 均零错误。
- `packages/output/SPEC.md` 七条证据所指函数、测试与留档文件逐一存在且匹配。本次以 `9720d39`（`fix-by-acceptance`）补上同一指令集重复应用的精确守卫，并在 `packages/demo-runtime/SPEC.md` 补消费者同步留痕。

### 口径边界

- demo-runtime / core SPEC 中 `39,713 bytes` 与 core W6 的“报错并跳过”均是 2026-07-10/14 的历史验收叙述；本次当前实跑数字与现行落盘契约以上述结果为准。未修改超出工单范围的 core 历史记录。
- 未更新 `docs/status/current.md`，未执行 Word/WPS 真机 roundtrip，未推送。

---

## CONTRACT-OUTPUT-TRUTH-1 独立验收（2026-07-26，output 范围，驳回）

验收对象：`codex/contract-output-truth-1` tip `3171c08`，基线 `c180d9f`。本包证据在独立 clean clone `/tmp/courtwork-contract-output-acceptance` 取得；根门禁与 desktop 门禁结果统一记录于 `apps/desktop/ACCEPTANCE.md` 同名章节。

### 本包证据

- root Vitest 实跑 **152 files / 1323 tests passed**；其中 output/legal 的 deterministic ZIP、OOXML part/relationship 保全、既有批注/关系、签名/恶意/漂移与 non-applied 阻断均随全量测试通过。
- 六项独立 mutation 中，output 直接相关的三项均按“注入变红 → 撤除复绿”完成：non-applied 整体阻断（2 failed / 8 passed，恢复 10/10）、untouched part bytes 保真（1 failed / 5 passed，恢复 6/6）、demo metadata 分支（desktop replay，1 failed / 11 passed，恢复 12/12）。另有单读 TOCTOU、no-replace、主合同锚三项，详见 desktop 报告。
- `packages/output/test/fixtures/` 本票新增仅 `contract-review-complex.docx` 与 README；其他探针为测试内存派生，未形成第二批 binary fixture。
- `packages/demo-runtime/SPEC.md` 已记录架构追认的三处同步修正、判据坐标与 golden 重烤，相关 output 消费者实测通过。

### output 范围阻断

本包代码门禁虽全绿，但整票不能放行：最终 desktop 白名单只列出 `packages/output/src/{apply-revision-instruction-set,docx-zip,index}.ts` 的直接消费点；实现新增并被生产导入的 `apps/desktop/src/output/contract-review-file-name.ts` 未列入 desktop 最终白名单，同时 `work-recovery.ts`、`primary-contract.ts` 也未列入。退出证据引用这些模块不能替代架构白名单扩展。该问题属于契约级范围不一致，验收角色不代补。

此外，`apps/desktop/src/App.tsx` 仍在 grant 生产路径使用固定 `合同审查报告.docx` 做 output existence 检查，并在结果卡作旧名 fallback；这违反生产路径旧产物名零出现的票面要求，虽不属于本包源码缺陷，却阻断本包票面整体放行。

### 结论

**驳回 `CONTRACT-OUTPUT-TRUTH-1`。** output 本包测试与结构证据通过，但整票契约级阻断项未清零；不合并、不删分支、不更新 `current.md`。

---

## CONTRACT-OUTPUT-TRUTH-1 R1 聚焦复验（2026-07-26，output 范围，放行）

对象：`codex/contract-output-truth-1` tip `b2ba999`。R1 三模块白名单补录已在 desktop SPEC 完成并逐模块核对；本包相关证据在独立 clean clone `/tmp/courtwork-contract-output-r1` 取得。

- `contract-review-file-name.ts` 仅承载 UTC 字段格式化与版本化命名纯函数，无文件 IO 或新持久格式。
- output 直接相关的 non-applied、untouched-part bytes fidelity、demo metadata 证据继续通过；三模块/delivery 定向测试 45/45。
- 旧名文件误报 focused E2E 修复前 1 failed、恢复后 1 passed；四条 App 静态回归锁均逐条 red→green。
- root 1323/1323、desktop 591/591、build/lint、Rust 83/83 均通过；Playwright floor=343 通过。全量唯一 1 红为在册 `E2E-FLAKY-HOVER-1`，342 passed，不影响本票放行裁决。

**结论：放行 `CONTRACT-OUTPUT-TRUTH-1` R1（仅 OUTPUT 票面，不宣称 TRACE、Word/WPS external-validated 或 v0.2.0）。**

清账合入 SHA：`78655bd`；`main` 后续状态事实提交：`89926ca`；独立 ESLint 微修缮：`c7897d8`。

---

## OUTPUT-APPLY-FIDELITY-1 · 独立验收（2026-08-04，放行，含 fix-by-acceptance）

### 范围裁定

- 验收对象：分支 `claude/output-apply-fidelity-1`，tip `5220e7c`，base `c4903b9`；在独立 clean worktree `/Users/lesprivilege/Projects/Courtwork/.claude/worktrees/ext-accept-output-apply` 完成。
- 已按授权顺序读取 `AGENTS.md`、`docs/engineering/workflow.md`、implementation-readiness 对应行、`packages/output/SPEC.md` 回执节及本文件先例；`pnpm install --frozen-lockfile` 成功，lockfile 未改。
- `git diff c4903b9..5220e7c` 实测仅触及 5 个文件：`packages/output/src/apply-instructions.ts`、同名测试、golden XML、`packages/output/SPEC.md`、`apps/desktop/src/output/compile-review-output.ts`。未触及 `comments-part.ts`、`fonts.ts`、`compile-draft-to-docx`；desktop 仅新增 `REASON_BY_STATUS` 的 `unsupported_existing_markup` 一行。`NonAppliedReason` 闭集未扩展。
- golden XML 逐结构比较：内容、属性、文本、ID 均相等；仅有两处 `commentRangeStart` 从 `w:pPr` 前移到其后（comment id `9` 与 `2`），未发现夹带结构变化。

初始 tip 的票面实现通过了 8 枚工单测试及 golden 回归锁。独立边界审计另发现 `paragraphSupportsRebuild` 只按 `localName` 判白名单，外部 namespace 复用 WordprocessingML 同名节点时会被错误重建；该问题不改契约、不改导出、不改闭集，按验收条款以最小 `fix-by-acceptance` 修复并补反例测试。

### 亲手复红与恢复

| 变异 | 红证 | 恢复后 |
| --- | --- | --- |
| 撤掉 pPr 感知的 comment range 插入 | focused：`1 failed / 17 skipped`；失败明确为 start 越过 `w:pPr` 的顺序反转 | pPr 测试通过 |
| 撤掉 4 个 `paragraphSupportsRebuild` 调用点 | foreign-markup 组：`4 failed / 1 passed / 13 skipped`；tracked deletion、既有 comment range、`br`、hyperlink 四类均错误 applied，`proofErr` 正例仍绿 | 5/5 通过 |
| fuzzy replace 改回消费字面 `locator.quote` | focused：fuzzy 实际匹配测试失败，no-op 测试通过；不能产生预期修订 | fuzzy 组通过 |
| 撤掉 `changed === false` 零痕兜底 | no-op focused 测试失败：同值替换错误变为 applied | fuzzy/no-op 组通过 |
| 独立注入 foreign namespace 同名节点 | 新增反例在修复前 `1 failed / 18 skipped / 19 total`，结果为 `applied` 且会抹掉 `<x:r>` | 加 namespace 门禁后反例通过并保留原 XML |

变异均逐 hunk 还原；未留下变异残片。最终 `apply-instructions.test.ts` 为 **19/19**，output 全部源码测试为 **12 files / 77 tests passed**。

### 修复与契约复核

- `paragraphSupportsRebuild` 现在同时要求段落直接子节点与 run 子节点的 `namespaceURI === W`，再检查原有 local-name 白名单；未知节点及外部 namespace 均 fail-closed 为 `unsupported_existing_markup`。
- 新测试验证 foreign `<x:r><x:t>` 不被重建且原文仍在；没有扩展 `NonAppliedReason`，`ApplyStatus` 的新增状态继续经过既有 non-applied 门禁。
- `isApplied` 仍只接受 `applied` / `applied_fuzzy`；desktop 只增加一条状态到原因的映射。未发现契约级问题，无 `[需架构拍板]` 项。

### 最终门禁数字

- `pnpm -r build`：通过，14/15 workspace projects。
- `pnpm lint`：通过。
- `pnpm test`：**167 files / 1792 tests passed**。
- `pnpm --filter @courtwork/desktop test`：**75 files / 690 tests passed**。
- `COURTWORK_E2E_PORT=21425 pnpm --filter @courtwork/desktop test:e2e`：独占端口、4 workers，**352 passed (5.9m)**，退出码 `0`。

验收过程中曾有一轮完整 Playwright 在 4-worker 负载下出现 2 个既有 `global-verbs.spec.ts` 动画时序红（`350 passed / 2 failed`）；同文件独占 focused 为 `21/21`，随后完整复跑为 `352/352`。最终修复后的完整运行再次以端口 `21425` 实测 `352 passed`，本报告只以该明确退出码结果作为最终门证。

### 裁决

**放行 `OUTPUT-APPLY-FIDELITY-1`。**

放行包含本验收会话发现并修复的实现级 namespace fail-closed 缺陷；修复与反例测试将以 `fix-by-acceptance:` 前缀提交，报告与修复同一提交，提交 SHA 见交回。未更新 `docs/status/current.md`，未推送；未据本报告宣称 Word/WPS external roundtrip。
