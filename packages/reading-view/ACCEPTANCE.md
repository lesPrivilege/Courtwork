# packages/reading-view 验收记录

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
