# ACCEPTANCE: apps/desktop（W9）

验收记录按批次追加。每节结论必须明确回答是否放行下游工单（AGENTS.md 验收处置规则）。验证一律实测（干净环境重装、drift 类实际触发），不采信实现会话自述。

---

## F 批合批验收（2026-07-10）

- **角色**：验收工程师（Opus 4.8 会话）。三不变量核对：实现与验收异会话异模型（实现 = Grok 为主，F-2 前半 = Sonnet；验收 = 本会话，非任一实现前身）；契约未单方面更改（唯一契约缺口 `PartyEdge.markers` 沿用既有 `[需架构拍板]`，本批未动）；纪律对模型一视同仁。
- **对象**：F-1 composer 输入区整备 · F-2 全局动词补全 · F-3 最小 work 能力包。
- **HEAD**：`f6a07c1`（验收开始）。**工作树**：干净；仅 1 份未跟踪文件 `docs/superpowers/plans/2026-07-10-f2-global-verbs.md`（superpowers 计划稿，非本批交付，未纳入任何提交）。
- **环境**：Node v25.9.0 / pnpm 9.15.0 / rustc + cargo 1.97.0。干净重装：`rm -rf` 全部 `node_modules` + `src-tauri/target` 后 `pnpm install`（1046 包全 reuse，6.1s，exit 0）。

### 一、干净环境全链实测

| # | 步骤 | 命令 | 实测 | 判定 |
|---|---|---|---|---|
| 1 | install | `pnpm install`（清空后） | 1046 包，6.1s，exit 0 | ✅ |
| 2 | tools | `pnpm --filter @courtwork/tools test` | **193/193**（11 文件，1.26s） | ✅ 契合 SPEC 193 |
| 3 | desktop 单测 | `pnpm --filter @courtwork/desktop test` | **35/35**（8 文件） | ✅ 契合 SPEC 35 |
| 4 | Playwright | `pnpm --filter @courtwork/desktop test:e2e` | **57/57**（20.3s，4 workers） | ✅ 契合 SPEC 57 |
| 5 | 假绿下限 | `assert-test-count.mjs`（链内前置） | 打印「57 条用例（下限 57）」 | ✅ 下限已随 F-2 余量升至 57 |
| 6 | 四门禁 | motion / signature / graph / icons（链内前置） | 逐条打印「通过」 | ✅ |
| 7 | 根 lint | `pnpm lint`（`eslint .`） | exit 0，零 error | ✅ |
| 8 | 生产构建 | `pnpm -r build` | 全包过；desktop `tsc -b && vite build` 4.63s | ✅ |
| 9 | cargo check | `cargo check`（清 target 从零编） | `Finished dev … in 51.01s`，exit 0 | ✅ |

**四门禁打印原文**（e2e 链前置，全部先于 Playwright 通过）：动效属性门禁（仅 transform/opacity/background-color/border-color）· 法理之线（右栏白名单 + 五色封闭集 + icon 品牌单色）· G6 主题（tokens 对齐 + 边色封闭 + 结构化 marker）· SVG 图标（19 具名 SVG / 17 概念 + Lucide 静态按需导入）。生产构建仅余既声明的「单 chunk > 500 kB」提示（图谱 lazy chunk，SPEC 已如实保留）。

**e2e 用例分布核对**（假绿防线不只看总数）：composer 5 + global-verbs 21 + icons 1 + system-open 4 + workbench 26 = **57**，与下限一致。

> 全链绿。判定：**全局标准一达标**。

### 二、git 考古（本批特别项）

F-2 期间 3–4 个会话在共享索引上同编热点文件（`App.tsx` / `styles.css` / `Icon.tsx`），发生多次误吞与前进式修复。逐笔核对 `App.tsx` 提交链（`--follow`）与五处前进式修复的净效果：

| 前进式修复 | 事故 | 净效果核验 |
|---|---|---|
| `6dd8b45` / `fdc5458`（revert 并发 icon rename ×2） | 并发 lucide 迁移会话的「别名名→lucide 规范名」rename 漏进本会话 `App.tsx` 提交 | 两次都把 rename 归还迁移会话；本会话 `App.tsx` 保留自有命名，迁移由 `b629332` 独立提交 |
| `96efdb3`（撤回 `b9d5c14` 误吞的 App.tsx） | 文档提交 `b9d5c14`（F-4 工单）扫走并发会话已暂存的 `App.tsx`（含尚未提交的 `NewCaseDialog` import） | `git rm --cached` 归还未提交态（-21 行含早到的 import）；`95142dc` 后按序重新落地，HEAD `NewCaseDialog` 在位可用 |
| `3604573`（keep icon aliases） | 并发窗口内两套 icon 命名并存 | `Icon.tsx` 增 8 个过渡别名（`case`/`conversation`/`panels`/`settings`/`compare`/`stack`/`columns`/`reset`→同一 lucide 组件），令两套命名都解析，化解冲突 |
| `d145e61`（return concurrent App changes） | 并发 `App.tsx` 改动被带入 | 归还工作树 |

**净效果判定**：

1. **无未授权功能性 hunk 残留**：HEAD `App.tsx` 通读连贯，F-1/F-2/F-3 功能齐备；`App.tsx`/`styles.css` 工作树干净；全链绿。
2. **图标迁移未被误吞或回滚**：HEAD `Icon.tsx` 仍 `lucide-react` 具名导入 + `IconName = keyof typeof standardIcons`（严格联合，`satisfies Record<string,LucideIcon>`）；`tsc -b` 通过即证每个 `<Icon name>` 解析。App.tsx 9 个 + 全 desktop 18 个 icon 名 **全部 ⊆** 别名表，**零孤儿**。App.tsx 最终收敛为 lucide 规范名（`cog`/`panels-top-left`/`briefcase-business`/`message-square-text`/`rows-two`/`columns-two`/`rotate-counter-clockwise`）。
3. **纪律遵守**：全程前进式修正、从未重写共享历史——误吞提交（`b9d5c14`）与其归还（`96efdb3`）**并存于线性历史**，无 rebase/force 痕迹，符合 AGENTS.md 第三/第四判例。
4. **唯一残留（非阻塞）**：`Icon.tsx` 8 个「过渡别名」现已成 dead code（App.tsx 全用规范名，全 desktop 无一处用别名）。其注释「并发案件工作流提交后删除」的条件随 `acd74cc` 落地已满足，可择机清理；不影响构建/门禁/运行。

> 判定：**git 考古通过，净效果正确**。

### 三、docs/46 活清单一致性

F 批回填的 13 个「真实实现」项逐一对源码核验，全部属实：

| docs/46 控件 | 工单 | 实现位（已核） |
|---|---|---|
| ⌘K 场景与检索提示 / 命令面板本体 | F-2 | `App.tsx` 标题栏钮 + `Meta/Ctrl+K`；`CommandPalette.tsx`（场景+案件+新建/归档/专注/打开产出文件夹，fuzzy，Esc） |
| composer 按钮族六项 | F-1 | `composer/`（见分项 F-1） |
| AI callout / data-card 复制 | F-2 | `CopyButton` 挂 data-card + generated-callout；e2e 锁定复制文本以 `D04` 起（含来源标记） |
| artifact 放大/全屏（专注模式） | F-2 | `App.tsx` 条件渲染卸装左中栏 + `styles.css:80 transition:none` |
| 新建案件 / 归档案件 | F-2 | `NewCaseDialog`（双入口）/ `ArchiveConfirmPopover`（可逆、无删除） |
| reveal-in-folder / open-file / 打开产出文件夹 | F-3 | `system-open` 工具 + `system-open-client.ts` + 状态条钮 |
| 新建工作稿 / 工作稿编辑面 / 卷宗原件区只读 | F-3 | `WorkDraftPanel`（自动保存、白名单闸）/ `OriginalsZone`（`data-readonly`、无 contentEditable） |

> 判定：**活清单与实现一致**。

### 四、分项验收

#### F-1 composer 输入区整备（Grok）— ✅ 放行

- **八裁决对照**（`composer/Composer.tsx`）：① 按钮族平铺不聚合（上传/案件 chip/发送 + 拍照·语音常驻禁用）✓；② 附件文件名 chip（`AttachmentChip` + 移除/重试/存卷宗）✓；③ 禁用态模板文案（camera/voice `aria-disabled` + `DISABLED_TOOLTIPS`，且 click 与 Enter/Space 键盘激活双拦截）✓；④ 存卷宗 popover 单向（`onCommitToDossier` 置 `scope:'dossier'`，无反向路径）✓；⑤ 全窗拖放（window 级 `dragenter/leave/over/drop` + `dragDepth` 计数正确处理嵌套 drag，只认 `Files`）✓；⑥ ⌘V（`onPaste` 抽文件 item→chip，纯文本落 textarea）✓；⑦ IME 防误发（`composingRef` **与** `nativeEvent.isComposing` 双守卫）✓；⑧ KBD（`⏎ 发送 · ⇧⏎ 换行`）✓。
- **上传真实路由 reading-view**：`process-upload.ts` 调真实 `convertToReadingView`（Composer 默认注入），`needs_ocr` → chip 失败态办案语言（`outcome-copy`），e2e「needs_ocr 呈现为 chip 失败态说明（非空文）」锁定；如实呈现，不吐半坏 md。
- **协议壳零业务逻辑**：`handleComposerSend` 仅 append `localMessages`（注释「壳层只呈现…不新增业务编排」）；`process-upload` 注释「不写卷宗、不发 SessionEvent」。
- **遗留补查（本批要求）**：reading-view 跨包 FNV 修复的**对方 SPEC 留痕原缺**（`packages/reading-view/SPEC.md` 仍写 sha256）→ 追认条件② 不满足，**已按裁决补写**（见该 SPEC 2026-07-10 F-1 追认留痕 + 本会话 fix-by-acceptance 提交）。**FNV 充分性**：FNV-1a 双 32-bit 级联、第二 lane 混入位置量、输出 64-bit，确定性且跨壳同算法，漂移检测充分（偶发碰撞仅致漏报一次漂移、非安全绕过；位置 lane 还挡换位碰撞）。

#### F-2 全局动词补全（Sonnet 前半 + Grok 余量）— ✅ 放行

- **⌘K 兑现**（`App.tsx` + `CommandPalette.tsx`）：打开（标题栏钮/`Meta·Ctrl+K`）、Esc（`App` 统一收口，含优先级栈 palette→newCase→archive→focus）、模糊（`fuzzy-match`）、场景（S1/S3/起草）、案件（动态列出含已归档标注）、新建/归档/专注四操作齐备；**「打开产出文件夹」实调 F-3 `openOutputFolder()`→`systemOpenClient.revealInFolder`（非占位）**，源码注释「F-3 已接通真实 reveal」，e2e「⌘K 打开产出文件夹显示访达反馈」锁定。
- **专注模式**：`{!focusMode && …}` 条件渲染**真卸装**左中栏（非 CSS 隐藏）；`styles.css:80 .workspace{transition:none}` → **0ms 硬切**；Esc 退出；进入时清对照态。e2e 锁定退出后 `.case-rail`/`.conversation` 重新可见（真重挂）。
- **归档可逆 · 全 app 无删除**：`toggleArchive` 布尔翻转 + `ArchiveConfirmPopover`（文案明示「案件内容不会被删除」「随时可取消归档」）；e2e 锁定归档→`archived` class、取消归档→移除、取消不改状态。**全仓 delete 语义核查**：desktop+tools src 仅 `Map.delete`（cache 淘汰），无 `unlink/fs.rm/std::fs::remove/trash`；Rust `delete_credential` 是 keyring 条目移除。docs/47 销毁级永不 = 守住。
- **callout 复制含溯源引文**：`CopyButton.getText` 闭包含 domain-badge（D20/D04）等来源标记 + 正文；e2e 锁定 data-card 复制文本 `startsWith('D04')`、callout 复制写入提示全文。
- **十裁决抽查**：裁决 2「全局刷新不做」= 守住（desktop src 无全局刷新控件；`WorkDraftPanel.refresh` 是内部状态同步函数、非全局刷新钮）；裁决 10「下载落点 = 案件文件夹产出子目录 + reveal，不逐次询问」= 落在 `DEMO_OUTPUT_DIR = ${caseRoot}/产出` + `revealInFolder`，无弹窗询问。

#### F-3 最小 work 能力包（Grok）— ✅ 放行

- **越界路径始终可见失败（构造用例亲测）**：直跑 `dist/case-path.js`，10 例全对——相对/绝对/同级兄弟/「工作稿」目录名伪装四类越界均 `outside_case`；原件写入 `original_write_forbidden`、产出写入 `not_work_draft_zone`、工作稿非 md/txt `unsupported_extension`、工作稿 .md 放行。正确性关键：`resolvePath` 先坍缩 `..` 再比前缀，越界判定先于分区判定，伪装路径挡得住。（详见 `packages/tools/SPEC.md` F-3 验收留痕。）
- **宿主零 shell**：`capabilities/main.json` 权限 = `core:default` + `opener:allow-open-path` + `opener:allow-reveal-item-in-dir`（无 shell/fs-write/网络）；`lib.rs` 仅 3 凭证命令 + `tauri_plugin_opener::init()`（注释「任意 shell 执行不在能力面」）；`SystemOpenHost` 仅 reveal/open 两动词。
- **工作稿只写工作稿区 · 原件区无编辑入口（含无障碍树）**：`work-draft-store` 全部写入过 `assertWorkDraftWritable` 闸（越界/原件硬拒、失败经 `onFeedback` 可见）；`OriginalsZone` `data-readonly="true"`、无 `contentEditable`、仅 reveal/open 查看动作，a11y 树只读；e2e「卷宗原件区只读：无 contentEditable、无编辑入口」锁定。工作稿 `WorkDraftPanel` 才是 `contentEditable`（合规——它落在「工作稿」区）。
- **子路径导出未把 node:net/web-fetch 打进 desktop 包**：desktop 生产包 grep `node:net`/`BlockList`/`jsdom`/`readability` 均 **0 命中**，仅 `web_reference` 字面量（contract.ts 判别联合，良性）。`./case-path`/`./system-open`/`./contract` 三子路径导出隔离成功。

### 五、对照记录：同约束体系下 Sonnet 段 vs Grok 段（实验数据，供架构选型）

同一 CLAUDE.md/AGENTS.md 纪律、同一 SPEC 契约、同一门禁体系下，两段实现的装配质量对比。归属（git 核实）：**Sonnet** = `cc42a7a`(fuzzy-match, TDD) · `95142dc`(新建案件) · `1692630`(复制按钮/F-2 第五项)；**Grok** = `16002e2`(F-1 composer) · `7688a3a`+`63d7198`(F-3) · `acd74cc`(F-2 余量)。

| 维度 | Sonnet 段（fuzzy-match / 新建案件 / 复制按钮） | Grok 段（F-1 / F-3 / F-2 余量） |
|---|---|---|
| **任务体量/性质** | 小而独立的纯函数与轻组件（模糊匹配、两步对话框、复制钮） | 大面、含安全关键面（路径白名单、宿主能力、子路径打包隔离）与跨包接通 |
| **缺陷密度** | 0 缺陷（fuzzy 边界干净、CopyButton 剪贴板拒绝优雅兜底、NewCaseDialog 校验齐） | 0 阻塞缺陷；1 低危 demo 边界（见发现②）；1 dead-code 残留源自并发 churn（见考古④） |
| **规格贴合度** | 高、克制——严格落在裁决面，不多做（如 fuzzy 只做子序列打分） | 高、且把红线做成**结构性不可违反**（判别联合失败分支无 data、`resolvePath` 先坍缩、能力面最小化） |
| **自主发现质量** | 中——TDD 纪律好（fuzzy 先测后码），但发现面窄 | 高——自主定位并修 reading-view `node:crypto` 打包阻塞（FNV 换实现）、自造子路径导出挡 `node:net`、越界判定顺序（坍缩先于分区）等非显性正确性 |
| **纪律副作用** | 无 | 1 处**留痕纪律疏漏**：跨包 FNV 修复未在对方 SPEC 留痕（追认条件②），验收补写 |
| **工程惯用** | 干净、可测、注释到位 | 干净、注释密度高（每个红线点有「为什么」注释），防御式（drag 深度计数、IME 双守卫） |

**综合**：两段在本约束体系下**都达到可放行质量、零阻塞缺陷**。差异在**任务难度而非纪律水位**——Sonnet 段承接的是规格完备的小件、交付克制无瑕；Grok 段承接的是大面 + 安全关键 + 跨包接通，展现了更强的**自主发现**（把三处非显性的正确性/打包/安全问题就地解决），代价是一处**留痕纪律疏漏**（宜以「跨包修复完工必在对方 SPEC 留痕」入手册硬化）。对选型的读法：**Grok 适配「中大型、规格完备但含隐性硬骨头」的装配+接通连体任务**（与现行「实现默认 Grok」任命一致）；**Sonnet 在小而定义清晰的件上稳定无瑕、TDD 自觉好**，可作规格完备小件的可靠承接与 Grok/Opus 不可用时的兜底。样本量小（各 3 件），结论供参考，不作单点定性。

### 六、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | reading-view 跨包 FNV 修复未在 `packages/reading-view/SPEC.md` 留痕（追认条件②），SPEC 仍写 sha256 | 中（纪律） | **已补写**（reading-view SPEC 追认留痕 + 行内更正），fix-by-acceptance 提交 |
| ② | `openOutputFolder`/`revealOutputDocx` 等系统动词调用位硬编 `DEMO_OUTPUT_DIR` 常量，未用 `outputPath(caseRoot)` 从当前案件派生；demo 案件正常，**新建（非 demo）案件点「打开产出文件夹」会得可见 `outside_case` 拒绝** | 低（demo 边界，失败可见非静默） | 记录；建议 F-4/真实接线时改用 `outputPath(caseRoot)`（helper 已在 case-path.ts 存在），不阻塞演示（演示用 demo 案件） |
| ③ | `Icon.tsx` 8 个过渡别名现为 dead code | 低（无害） | 记录；注释预设的清理条件已满足，可择机删 |
| ④ | `opener:*` 权限未在 Tauri ACL 层做路径 scope，案件白名单实际强制在 JS | 低（观察） | 记录；MVP 可接受（CSP 紧 + 无远程内容 + 无损级动词），Stage 1 可加 ACL scope 作纵深防御 |
| ⑤ | desktop SPEC 顶层「验证记录」节仍留 17/17 历史快照（各分期节已有当期数，最新 57） | 低（文档卫生） | 记录，非缺陷（append-only SPEC 的历史层） |
| ⑥ | `CopyButton` 用 `navigator.clipboard`（Web API），仅 Playwright chromium 实测；真实 Tauri WKWebView 未单独验证 | 低（观察） | 记录；用户手势下通常可用，catch 已优雅兜底 |

无契约级问题（唯一契约缺口 `PartyEdge.markers` 沿用既有 `[需架构拍板]`，本批未触）。除发现①（已按裁决补写）外，其余均为非阻塞记录项。

### 七、结论（三问）

1. **三单各自是否放行**：
   - **F-1 composer 整备 —— 放行 ✅**（八裁决全兑现、上传真实路由 reading-view、协议壳零业务逻辑；遗留补查①已补齐）。
   - **F-2 全局动词 —— 放行 ✅**（⌘K 全项兑现含真实 reveal、专注 0ms 真卸装、归档可逆且全 app 无删除、callout 复制含溯源、十裁决抽查守住）。
   - **F-3 最小 work 能力包 —— 放行 ✅**（越界亲测全拒、宿主零 shell、原件只读含无障碍树、子路径导出隔离 node:net 成功）。

2. **产品可用面是否达「对外可演示版」增补标准**：**达标 ✅**。composer + 全局动词（⌘K/新建/归档/专注）+ 系统动词（reveal/open/产出文件夹）+ 工作稿轨（新建/自动保存/原件只读）四面均为**真实实现**，由 193(tools)+35(desktop 单测)+57(e2e) 共 285 项自动化 + 干净构建 + cargo check 锁定。**演示注意**：系统动词在浏览器为 mock、真实访达行为须在 **Tauri app 内**跑；演示用内置 demo 案件（新建案件为 in-app 注册 + 指向既有文件夹，不落盘 mkdir，且见发现②）。以此边界演示，达「对外可演示版」增补标准。

3. **工作树是否安静可放行 F-4 开工**：**可放行 ✅**。全链绿、`App.tsx`/`styles.css` 工作树干净、git 历史线性无重写、无契约悬案（除既有 `[需架构拍板]`）。本次验收新增提交（reading-view 追认留痕 fix-by-acceptance、tools SPEC + 本报告）均路径显式、未吞未跟踪计划稿。建议 F-4 开工前顺手清理发现②③（均低危、非阻塞）。

> **总判定：F 批三单全部放行，产品对外可演示面达标，工作树安静，F-4 可开工。**

---

## F-4 验收（文件操作分级与卷宗整理 / FileOpsPlan，2026-07-11）

- **角色**：验收工程师（Opus 4.8 会话，AGENTS.md 全判例适用）。实现者：Grok（四层 `d559678` schemas → `f98a55c` tools → `d49080a` registry → `06cb66c` desktop）。三不变量：实现与验收异会话异模型；契约未单方面改（FileOpsPlan 走 docs/47 拍板 + 工单任命的「提案合入」，见下）；纪律一视同仁。
- **HEAD**：`6ae568d`（main）。**环境**：Node v25.9.0 / pnpm 9.15.0 / cargo 1.97.0；干净重装（`rm -rf` 全 node_modules + `pnpm install`，exit 0）。
- **git 现场如实声明**：验收期同仓有并发会话活动（`docs/superpowers/plans/…openai-compatible-adapter.md`、`eval/ACCEPTANCE.md` W7.1、`.obsidian/`、`usecase/*.pdf`、一个 `acceptance-temp` 命名 stash）。本会话诊断期误用 `git stash -u`+`git checkout <sha>` 复核旧提交，触发 stash pop 冲突并短暂 detached HEAD；已前进式收拾：`pnpm-lock.yaml` 冲突还原为 HEAD 版（并发会话的 620 行 lock 改动仍留存于其 stash，无损）、`eval/ACCEPTANCE.md` 撤出暂存（不提交、不还原其内容）、HEAD 重挂 `main`。**未 drop 他人 stash、未提交任何并发会话文件、未重写共享历史**。教训：验收复核旧提交应用独立 worktree，勿在共享工作树上 stash/checkout。

### 一、干净环境全链实测

| # | 步骤 | 实测 | 判定 |
|---|---|---|---|
| 1 | install | 清空重装 exit 0 | ✅ |
| 2 | schemas | **94/94**（10 文件） | ✅ |
| 3 | tools | **204/204**（13 文件） | ✅ |
| 4 | registry | **38/38**；builtin = `['S1','S2','S3','S4','S6']`，含 S6 专项用例 | ✅ |
| 5 | Playwright | **60/60**（20.5s）；假绿下限 `minimum=60` | ✅ |
| 6 | 四门禁（drift 实跑） | motion/signature/graph/icons 逐条「通过」 | ✅ |
| 7 | 生产构建 `pnpm -r build` | 初测**红（core TS2741）→ 验收补漏后绿** | ⚠️→✅ |
| （附） | core / desktop 单测 | core **156/156**、desktop **35/35** | ✅ |

### 二、契约核对（本单重点）

- **FileOpsPlan 忠实 docs/47**：`FileOpsVerbEnum = z.enum(['move','rename','copy','mkdir'])`，源码注释「故意不含 delete/overwrite——销毁级永不进入能力面」。**无 delete 三重证**：① 类型层 `safeParse('delete'/'overwrite'/'rm')===false`；② schemas `file-ops-plan.test.ts` `.options` 精确断言；③ tools `file-ops-redline.test.ts` **源码 grep** 禁 `verb:'delete'`/enum 带 delete 字面量（允许中文注释「删除」）。`contentHashBefore/After`（move/rename 应相等 = 零字节证据）、`originalFileName`、`selected` 齐；两层 schema `.strict()` + superRefine（mkdir 无 source / 余必带）。
- **ArtifactTypeEnum 扩展消费方核对**：`'FileOpsPlan'` 追加为纯增量。RevisionEvent 可用范围 ✅（`artifactType` 可取 FileOpsPlan，契合 docs/47「修正=RevisionEvent」）、registry S6 引用 ✅、UI ✅。**但 `packages/core` 的 `ARTIFACT_SCHEMAS: Record<ArtifactType, ZodType>` 穷尽映射被漏——见发现①（已修复）**。
- **CaseFile 增量纯加法**：`originalFileName?`/`contentHash?` 均 optional，schema 非 strict，既有消费方零破坏。✅
- **「提案合入」格式**：`packages/schemas/SPEC.md:62` 以 W4 先例（RevisionInstructionSet）同款格式记录 F-4（「docs/47 已拍板 + 工单任命」，非单方改契约）。✅ 唯「受影响消费方」句漏列 core（发现①的文档面）。

### 三、tools→schemas 依赖 + 浏览器包隔离

- `packages/tools` 新增 `@courtwork/schemas`（`dependencies`，`file-ops-executor` 需校验 FileOpsPlan artifact）。方向向上指向 schemas 根，**合法**，与 CLAUDE.md「可依赖」修正一致。
- desktop 子路径 import `@courtwork/tools/{case-path,contract,system-open,file-ops-executor,file-ops-host}`；生产包实测 `node:net`/`BlockList`/`web-fetch`/`jsdom`/`readability` **均 0 命中**（仅 `web_reference` 字面量 7 次，contract 判别联合，良性）。web-fetch 的 `node:net` 未入浏览器壳。✅

### 四、执行器语义亲测（隔离直跑 + 读断言真实性）

`file-ops.test.ts`+`file-ops-redline.test.ts` 11 例隔离全绿，逐条核断言：
- **吃已确认计划 / 未确认拒执行**：`execute` 先 `FileOpsPlanSchema.safeParse`（非法抛错），仅执行 `selected:true`；`selected:false` → applied 0 / skipped 1；**单文件 move 同样必须勾选才执行**（`selected` 即轻确认形态）。✅
- **哈希比对留痕**：move 记录 `contentHashBefore===After===hashBytes(原文)`；不等则回滚 + 拒绝。✅
- **撤销后内存 FS 快照逐字节一致**（亲跑）：`host.snapshot()` before/after `size` 相等 + 每路径 `[...restored].toEqual([...content])`（真·逐字节，非仅存在性）。✅
- **事务日志无删除路径**：`'deleteLog' in executor===false`、grep 禁 `deleteLog/clearLog` 可调用形态；undo 只 `move-back`/`remove-copy`/`remove-empty-dir`（回退加法创建物，**不删原件**）；`undoneAt` 标记后日志仍在 map、不可二次撤销。`FileOpsHost.removeFile/removeEmptyDir` 注释明确「仅供 undo 逆向，不作为用户/agent 能力」，不入契约/verb 枚举。✅
- **目标已存在拒覆盖**：move 到已存在目标 → failed「拒绝覆盖」、源仍在。✅

### 五、S6 声明完整性（`S6.yaml` + strict）

触发**双通道**（`fileTypes: pdf/docx/md/txt/jpg/png` + `userActions: drop-unsorted-files/open-file-ops-scene`）；`outputArtifacts:[FileOpsPlan]`；工具位 `[copy-file, mkdir, file-ops-executor]` 齐；`uiTemplateId: file-ops-plan-panel`；门禁 `confirmationGates:[{artifact:FileOpsPlan, label:"…单文件也需轻确认；大批量强制抽看"}]`（分层确认）。registry `scenario.ts` `.strict()` + loader `safeParse` → S6 过 strict（registry 38 绿，含「S6 produces FileOpsPlan with plan confirmation gate and move-capable tools」专项）。✅

### 六、UI 走查（`FileOpsPlanPanel` + e2e）

计划表列齐：勾选 / 动词 / 源 / 目标 / **理由** / **原始文件名** / **哈希**；执行报告（已执行/跳过/失败 + 每行 verb→target·哈希）；撤销**轻 popover**（「撤销后文件回到整理前位置与名称。事务日志仍保留」+ 取消/确认撤销）；大批量（`selected≥5`）提示「抽看理由」；单文件也过「确认并整理」。**全 app 仍无删除入口**——e2e `file-ops.spec.ts` 显式 `getByRole('button',{name:/删除/}).toHaveCount(0)` + 原名留痕断言，另两例锁 S6 计划执行/报告与撤销 popover 流。docs/46 回填属实（行 111–113「卷宗整理计划表/执行报告/撤销整理」F-4 真实实现，行 110 原件区补「展示原始文件名留痕」）。✅

### 七、边界记录 + git 卫生

- **边界（checklist 7）**：演示宿主为内存 FS（`file-ops-demo.ts` `createMemoryFileOpsHost`，与 F-3 mock 同构），不触真磁盘；真磁盘/Tauri host 为已知后续（`file-ops-host.ts` 已留注入点）。此边界原仅在**代码注释**中如实，未上 SPEC——已 fix-by-acceptance 于 `apps/desktop/SPEC.md` F-4 节补一行声明（发现②）。
- **git 卫生（checklist 8）**：四层提交文件清单**各守其层**——schemas 只碰 `packages/schemas/*`、tools 只碰 `packages/tools/*`(+lockfile)、registry 只碰 `packages/registry/*`、desktop 只碰 `apps/desktop/*`(+ 授权的 docs/46 回填)；无跨层污染、无他人文件删改。✅

### 八、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | **F-4 消费方补漏**：`ArtifactTypeEnum` 增 `FileOpsPlan` 未同步 core `ARTIFACT_SCHEMAS` 穷尽 Record → `tsc` TS2741、`pnpm -r build`（生产构建）红；companion 测试「六项」硬编断言亦失败 | 🔴（阻塞生产构建） | **已 fix-by-acceptance 修复**：Record 补 `FileOpsPlan: FileOpsPlanSchema`；guard 测试改从 `ArtifactTypeEnum.options` 派生（防再漂移）。core 156/156、`pnpm -r build` 转绿。建议 schemas SPEC 的 F-4「受影响消费方」句补 `packages/core` |
| ② | 内存 FS 演示边界原仅在代码注释、未上 SPEC | 🟡 | 已补写 desktop SPEC F-4 节一行 |
| ③ | `contentHash` 字段 schema 注释写「sha256 hex」，但演示 host `hashBytes` 用 FNV-1a 64-bit | 🟢 | 内存演示做「零字节变动」比对足够（确定性、before==after）；真磁盘 host 若要面向证据完整性宜用 sha256，记录留待真实接线 |
| ④ | `copy` 仅支持文件、不支持目录（`move` 支持目录） | 🟢 | MVP 边界，docs/47「整案打包」如需目录复制再扩，记录 |
| ⑤ | 执行器对同 planId「撤销后再执行」会覆盖内存 map 中的已撤销日志（append-only 留痕靠未来真实落盘保证） | 🟢 | 演示不触发（每次 reset 新 planId）；真实落盘存储接入时保证 append-only，记录 |

无契约级违规（FileOpsPlan/ArtifactTypeEnum/CaseFile 增量均合法，走提案合入）。除①（已修复、曾阻塞）外均非阻塞。

### 九、结论（三问）

1. **F-4 是否放行**：**放行 ✅**（附条件已就地满足）。全链绿（生产构建经验收补漏①后转绿）、契约忠实 docs/47（无 delete 三重证）、执行器语义亲测（撤销逐字节一致、未确认拒执行、日志不可删）、S6 声明完整、UI 无删除入口 e2e 锁定。**放行前提**：发现① 的 core 补漏为验收 fix-by-acceptance 修复项，需并入本批；若架构要求由实现会话回修，则本单转「有条件放行，待 core 补丁合入」。
2. **S6 卷宗整理是否可进演示剧本**：**可进 ✅**。场景双通道触发、计划表→确认→执行→报告→撤销全链 e2e 锁定，演示宿主内存 FS 剧本自洽（乱文件入库→归档/规范命名/隔离重复→一键撤销）。**演示口径**：内存 FS，不落真实磁盘（真磁盘/Tauri 为后续），演示时如实说明即可，不影响「卷宗整理杀手场景」的对外呈现。
3. **FileOpsPlan 契约是否背书**：**背书 ✅**。动词封闭集（move|rename|copy|mkdir，delete/overwrite 类型+JSON Schema+源码 grep 三拒）、哈希前后 + originalFileName 留痕字段、CaseFile 纯增量、ArtifactTypeEnum 增量，均忠实 docs/47 且以 W4「提案合入」格式入档。唯一附注：消费方枚举须含 core `ARTIFACT_SCHEMAS`（本次已补齐并加固 guard）。

> **总判定：F-4 放行（含验收 fix-by-acceptance 修复 core 消费方补漏①）；S6 卷宗整理可进演示剧本（内存 FS 口径）；FileOpsPlan 契约背书。**
