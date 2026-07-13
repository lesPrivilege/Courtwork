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
