# ACCEPTANCE: apps/desktop（W9）

验收记录按批次追加。每节结论必须明确回答是否放行下游工单（AGENTS.md 验收处置规则）。验证一律实测（干净环境重装、drift 类实际触发），不采信实现会话自述。

---

## VISUAL-KIT-1 · 十二族可视化组件样板与 schema-first 运行时（2026-07-14）— ✅ 放行

- **角色与对象**：独立验收会话；实现提交 `4f4b4ac6e7ae963b18964b52a40b5026f3219a8b`，基线 `f7532f7`。验收在独立 worktree、独立分支 `codex/accept-visual-kit-1` 完成，不采信实现自述。
- **验收修复**：`670ec29abede695d088d0e95994edea5e7fb0e6c`（runtime 比例白名单、gallery `implemented` 必须绑定真实 primitive，并补强 schema-first/零 wire/展示契约测试）；`16f764d15ccb2feaf11199ab3d55fdca799d9949`（仅消除验收测试的 lint 告警）。两枚均为实现级 fail-closed 小修，无 schema 字段、跨层接口、导出或 ADR 变更。
- **边界核验**：仓库无 `packages/ui`；生产代码未依赖 demo/testing、Node builtin 或第三方可视化运行时；实现只在 desktop `devDependencies` 增加 `@courtwork/demo-data`。G6 仍由既有 `GraphPanel` lazy boundary 管理，本工单未触碰。registry 仅登记 `courtwork.artifact-table.v1`，candidate/deferred 不进入运行时；Legal/PM fixture 复用同一 primitives，锁定各自 provenance/hash。

### 反例注入（均先红后恢复）

| 边界 | 实际注入的反例 | 观察到的红灯 |
|---|---|---|
| 冻结与状态 | shallow freeze；放入未知 status tone | contract 分别 `4 failed`、`1 failed` |
| Estimate / Partial | 同时提供多个 estimate 形态；未知总量伪造 `20%` | contract 各 `1 failed` |
| 组合与 gallery | 接受 `3:2`；伪造 implemented 无 primitive；删 missing-family guard；标题加 `01 ·` | 对应 contract/gallery 测试逐项变红 |
| 零 wire 与命名空间 | primitive 读取 `descriptor/pointer/payload/artifact/store/event/typeId`；加入 PM `typeId` 分支；输出 raw payload | visual-kit guard 或 namespace/zero-wire 测试变红 |
| blueprint 登记边界 | 临时登记 candidate blueprint；临时生产文件导入 demo/testing、`node:path`、`echarts` | static guard 分别报告违规 |
| Interaction | Anchor 无回调仍可点；Decision 无回调不锁；删 first-wins；吞掉 error；提前显示 Recorded；截断 quote | SSR/DOM 测试分别捕获 source-ready、重复 resolve、错误态、阶段与原文完整性漂移 |
| Artifact schema-first | 绕过必填 `documentId`；缺 pointer 默认空串；enum 忽略 `valueLabels`；文件标签泄漏完整 `fileId` | renderer 9 例中的对应 schema/pointer/enum/provenance 断言逐项变红 |
| fixture 固定性 | 改动 PM fixture hash 一位 | fixture hash 测试 `1 failed` |

所有临时 mutation 均已逆向恢复；最终工作树不含反例残留。验收过程中真实暴露的任意 runtime 比例与假 implemented 两个 fail-open 缺口，已由 `670ec29` 前进式修复。

### 最终门禁实跑

| 门禁 | 结果 |
|---|---|
| `lint:visual-kit` | PASS |
| focused Vitest | **25/25**（6 文件） |
| desktop Vitest | **161/161**（39 文件） |
| root Vitest | **1117/1117**（128 文件） |
| `pnpm -r build` | 13 个 workspace project 通过；desktop 3524 modules，仅既有 Tauri dynamic/static import 与 chunk-size 提示 |
| `pnpm lint` | exit 0 |
| `pnpm site:guard` | fixture **12/12**；deslop 扫描 670 个 active text files，neutral/elevation/signature/motion 全绿 |
| 独立 Playwright | `COURTWORK_E2E_PORT=1638 pnpm exec playwright test --workers=1`：**209/209**，明确 `Running 209 tests using 1 worker`，3.2m |

### 真机渲染与人工目检

- Playwright 在真实 Chromium 生成 1180 / 1280 / 1440 / 1600 四档 gallery 全页截图，并逐张以原图/高分辨率人工目检：1180 为两列，1280–1600 为三列；十二族齐全，hairline grid 连续，Legal/PM provenance 与 fixture hash 可见，Partial 显示 `Completed 2/3 · Pending 1` 且不伪造百分比，无全局横向溢出或 card-inside-card 膨胀。
- 普通 ask-user 的 pending/resolved 不出现 Partial 噪音、error 只呈失败态、Recorded 仅在 core acceptance 后出现，并由同一次单 worker Chromium 全量用例及 SSR/DOM focused 测试共同锁定。
- **非阻断 P2 观察**：1280/1440 的个别 Evidence 样板中，`implemented` 状态 badge 靠近单元格边界时存在局部遮挡；不影响 primitive、数据或交互契约，也不进入生产 blueprint，后续仅作 gallery 排版 polish，不扩成本工单契约修复。
- 已按 browser skill 尝试 in-app browser，但本地 browser-client bootstrap 两次均在初始化时报 `Cannot redefine property: process`；因此本报告不伪称完成 in-app 手工点击。该环境阻塞不影响独立真实 Chromium 的 209/209 与四档截图证据；accepted main 上的 in-app browser 真机证据留给主会话补录。

### 结论

**✅ 放行 VISUAL-KIT-1。** 十二族样板、schema-first 校验、零 wire、跨垂类同源 primitive、interaction 阶段语义及静态边界均有绿门与实际 mutation 红灯证据。上述 gallery-only badge 边界观察与 browser-client 本机 bootstrap 故障均已透明留痕，不构成实现/契约阻断；下游可基于 `4f4b4ac + 670ec29 + 16f764d` 继续集成。

---

## F 批合批验收（2026-07-10）

- **角色**：验收工程师（Opus 4.8 会话）。三不变量核对：实现与验收异会话异模型（实现 = Grok 为主，F-2 前半 = Sonnet；验收 = 本会话，非任一实现前身）；契约未单方面更改（唯一契约缺口 `PartyEdge.markers` 沿用既有 `[需架构拍板]`，本批未动）；纪律对模型一视同仁。
- **对象**：F-1 composer 输入区整备 · F-2 全局动词补全 · F-3 最小 work 能力包。
- **HEAD**：`f6a07c1`（验收开始）。**工作树**：干净；仅 1 份未跟踪文件 `历史实施计划`（superpowers 计划稿，非本批交付，未纳入任何提交）。
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

### 三、当时的 UI 清单 活清单一致性

F 批回填的 13 个「真实实现」项逐一对源码核验，全部属实：

| 当时的 UI 清单 控件 | 工单 | 实现位（已核） |
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
- **归档可逆 · 全 app 无删除**：`toggleArchive` 布尔翻转 + `ArchiveConfirmPopover`（文案明示「案件内容不会被删除」「随时可取消归档」）；e2e 锁定归档→`archived` class、取消归档→移除、取消不改状态。**全仓 delete 语义核查**：desktop+tools src 仅 `Map.delete`（cache 淘汰），无 `unlink/fs.rm/std::fs::remove/trash`；Rust `delete_credential` 是 keyring 条目移除。docs/decisions/ADR-004-documents-and-files.md 销毁级永不 = 守住。
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

- **角色**：验收工程师（Opus 4.8 会话，AGENTS.md 全判例适用）。实现者：Grok（四层 `d559678` schemas → `f98a55c` tools → `d49080a` registry → `06cb66c` desktop）。三不变量：实现与验收异会话异模型；契约未单方面改（FileOpsPlan 走 docs/decisions/ADR-004-documents-and-files.md 拍板 + 工单任命的「提案合入」，见下）；纪律一视同仁。
- **HEAD**：`6ae568d`（main）。**环境**：Node v25.9.0 / pnpm 9.15.0 / cargo 1.97.0；干净重装（`rm -rf` 全 node_modules + `pnpm install`，exit 0）。
- **git 现场如实声明**：验收期同仓有并发会话活动（`历史实施计划`、`eval/ACCEPTANCE.md` W7.1、`.obsidian/`、`usecase/*.pdf`、一个 `acceptance-temp` 命名 stash）。本会话诊断期误用 `git stash -u`+`git checkout <sha>` 复核旧提交，触发 stash pop 冲突并短暂 detached HEAD；已前进式收拾：`pnpm-lock.yaml` 冲突还原为 HEAD 版（并发会话的 620 行 lock 改动仍留存于其 stash，无损）、`eval/ACCEPTANCE.md` 撤出暂存（不提交、不还原其内容）、HEAD 重挂 `main`。**未 drop 他人 stash、未提交任何并发会话文件、未重写共享历史**。教训：验收复核旧提交应用独立 worktree，勿在共享工作树上 stash/checkout。

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

- **FileOpsPlan 忠实 docs/decisions/ADR-004-documents-and-files.md**：`FileOpsVerbEnum = z.enum(['move','rename','copy','mkdir'])`，源码注释「故意不含 delete/overwrite——销毁级永不进入能力面」。**无 delete 三重证**：① 类型层 `safeParse('delete'/'overwrite'/'rm')===false`；② schemas `file-ops-plan.test.ts` `.options` 精确断言；③ tools `file-ops-redline.test.ts` **源码 grep** 禁 `verb:'delete'`/enum 带 delete 字面量（允许中文注释「删除」）。`contentHashBefore/After`（move/rename 应相等 = 零字节证据）、`originalFileName`、`selected` 齐；两层 schema `.strict()` + superRefine（mkdir 无 source / 余必带）。
- **ArtifactTypeEnum 扩展消费方核对**：`'FileOpsPlan'` 追加为纯增量。RevisionEvent 可用范围 ✅（`artifactType` 可取 FileOpsPlan，契合 docs/decisions/ADR-004-documents-and-files.md「修正=RevisionEvent」）、registry S6 引用 ✅、UI ✅。**但 `packages/core` 的 `ARTIFACT_SCHEMAS: Record<ArtifactType, ZodType>` 穷尽映射被漏——见发现①（已修复）**。
- **CaseFile 增量纯加法**：`originalFileName?`/`contentHash?` 均 optional，schema 非 strict，既有消费方零破坏。✅
- **「提案合入」格式**：`packages/schemas/SPEC.md:62` 以 W4 先例（RevisionInstructionSet）同款格式记录 F-4（「docs/decisions/ADR-004-documents-and-files.md 已拍板 + 工单任命」，非单方改契约）。✅ 唯「受影响消费方」句漏列 core（发现①的文档面）。

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

计划表列齐：勾选 / 动词 / 源 / 目标 / **理由** / **原始文件名** / **哈希**；执行报告（已执行/跳过/失败 + 每行 verb→target·哈希）；撤销**轻 popover**（「撤销后文件回到整理前位置与名称。事务日志仍保留」+ 取消/确认撤销）；大批量（`selected≥5`）提示「抽看理由」；单文件也过「确认并整理」。**全 app 仍无删除入口**——e2e `file-ops.spec.ts` 显式 `getByRole('button',{name:/删除/}).toHaveCount(0)` + 原名留痕断言，另两例锁 S6 计划执行/报告与撤销 popover 流。当时的 UI 清单 回填属实（行 111–113「卷宗整理计划表/执行报告/撤销整理」F-4 真实实现，行 110 原件区补「展示原始文件名留痕」）。✅

### 七、边界记录 + git 卫生

- **边界（checklist 7）**：演示宿主为内存 FS（`file-ops-demo.ts` `createMemoryFileOpsHost`，与 F-3 mock 同构），不触真磁盘；真磁盘/Tauri host 为已知后续（`file-ops-host.ts` 已留注入点）。此边界原仅在**代码注释**中如实，未上 SPEC——已 fix-by-acceptance 于 `apps/desktop/SPEC.md` F-4 节补一行声明（发现②）。
- **git 卫生（checklist 8）**：四层提交文件清单**各守其层**——schemas 只碰 `packages/schemas/*`、tools 只碰 `packages/tools/*`(+lockfile)、registry 只碰 `packages/registry/*`、desktop 只碰 `apps/desktop/*`(+ 授权的 当时的 UI 清单 回填)；无跨层污染、无他人文件删改。✅

### 八、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | **F-4 消费方补漏**：`ArtifactTypeEnum` 增 `FileOpsPlan` 未同步 core `ARTIFACT_SCHEMAS` 穷尽 Record → `tsc` TS2741、`pnpm -r build`（生产构建）红；companion 测试「六项」硬编断言亦失败 | 🔴（阻塞生产构建） | **已 fix-by-acceptance 修复**：Record 补 `FileOpsPlan: FileOpsPlanSchema`；guard 测试改从 `ArtifactTypeEnum.options` 派生（防再漂移）。core 156/156、`pnpm -r build` 转绿。建议 schemas SPEC 的 F-4「受影响消费方」句补 `packages/core` |
| ② | 内存 FS 演示边界原仅在代码注释、未上 SPEC | 🟡 | 已补写 desktop SPEC F-4 节一行 |
| ③ | `contentHash` 字段 schema 注释写「sha256 hex」，但演示 host `hashBytes` 用 FNV-1a 64-bit | 🟢 | 内存演示做「零字节变动」比对足够（确定性、before==after）；真磁盘 host 若要面向证据完整性宜用 sha256，记录留待真实接线 |
| ④ | `copy` 仅支持文件、不支持目录（`move` 支持目录） | 🟢 | MVP 边界，docs/decisions/ADR-004-documents-and-files.md「整案打包」如需目录复制再扩，记录 |
| ⑤ | 执行器对同 planId「撤销后再执行」会覆盖内存 map 中的已撤销日志（append-only 留痕靠未来真实落盘保证） | 🟢 | 演示不触发（每次 reset 新 planId）；真实落盘存储接入时保证 append-only，记录 |

无契约级违规（FileOpsPlan/ArtifactTypeEnum/CaseFile 增量均合法，走提案合入）。除①（已修复、曾阻塞）外均非阻塞。

### 九、结论（三问）

1. **F-4 是否放行**：**放行 ✅**（附条件已就地满足）。全链绿（生产构建经验收补漏①后转绿）、契约忠实 docs/decisions/ADR-004-documents-and-files.md（无 delete 三重证）、执行器语义亲测（撤销逐字节一致、未确认拒执行、日志不可删）、S6 声明完整、UI 无删除入口 e2e 锁定。**放行前提**：发现① 的 core 补漏为验收 fix-by-acceptance 修复项，需并入本批；若架构要求由实现会话回修，则本单转「有条件放行，待 core 补丁合入」。
2. **S6 卷宗整理是否可进演示剧本**：**可进 ✅**。场景双通道触发、计划表→确认→执行→报告→撤销全链 e2e 锁定，演示宿主内存 FS 剧本自洽（乱文件入库→归档/规范命名/隔离重复→一键撤销）。**演示口径**：内存 FS，不落真实磁盘（真磁盘/Tauri 为后续），演示时如实说明即可，不影响「卷宗整理杀手场景」的对外呈现。
3. **FileOpsPlan 契约是否背书**：**背书 ✅**。动词封闭集（move|rename|copy|mkdir，delete/overwrite 类型+JSON Schema+源码 grep 三拒）、哈希前后 + originalFileName 留痕字段、CaseFile 纯增量、ArtifactTypeEnum 增量，均忠实 docs/decisions/ADR-004-documents-and-files.md 且以 W4「提案合入」格式入档。唯一附注：消费方枚举须含 core `ARTIFACT_SCHEMAS`（本次已补齐并加固 guard）。

> **总判定：F-4 放行（含验收 fix-by-acceptance 修复 core 消费方补漏①）；S6 卷宗整理可进演示剧本（内存 FS 口径）；FileOpsPlan 契约背书。**

---

## D-1 验收（真机三缺陷 + 死路由/容器作用域，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例 + worktree 复核纪律）。实现者：Grok，两提交 `4f59ab9`（凭证探针三态）+ `5541d9c`（容器隔离/溢出/切换矩阵），均只碰 `apps/desktop/*`（层洁）。
- **HEAD**：`debe6e5`（main）。**环境**：Node v25.9.0 / pnpm 9.15.0 / cargo 1.97.0；干净重装 exit 0。
- **worktree 纪律**：本单不复核旧提交、无 stash/checkout（吸取 F-4 教训，`478f5e7` 已修宪）。**git 现场如实**：工作树仍有前批并发会话的未提交 work（`eval/ACCEPTANCE.md` + `.obsidian/`/`usecase/` untracked + `acceptance-temp` stash），**非本会话产物、原样未动**；我的提交仅含显式路径的自有文件。

### 一、干净环境全链实测

| # | 步骤 | 实测 | 判定 |
|---|---|---|---|
| 1 | install | 清空重装 exit 0 | ✅ |
| 2 | desktop Vitest | **45/45**（10 文件） | ✅ |
| 3 | Playwright | 干净全跑初测 **66/67（1 假红）→ 验收修复后稳定 67/67** | ⚠️→✅ |
| 4 | 假绿下限 | `minimum=67`；`--list` 定义 67 条 | ✅ |
| 5 | 四门禁 | motion/signature/graph/icons 逐条通过 | ✅ |
| 6 | pnpm -r build | **9 包**全绿（schemas/registry/core/tools/output/reading-view/demo-data/eval/desktop） | ✅ |
| 7 | cargo test | **2/2**；亲读断言：`status`/`failed` 序列化不含 `secret`/`value`/`Keyring`/`password`，仅 `phase`/`source`/`failureMessage`（`&'static str` 定值） | ✅ |

**Playwright 假红根因（本单最值得记录）**：干净全跑首测 66/67，唯一失败 `global-verbs.spec.ts:213 命令面板·方向键在结果间移动高亮`（`aria-selected` 期望 `true` 实得 `false`，行 217）。该用例 F-2 起就在、F-2/F-4 恰好过。隔离单跑 6/6 绿一度误判并行 flake；深挖发现**顺序重复也 5/12 红**——真因是 `openWorkbench` 点「先查看演示」后光标停在面板中心，命令面板一渲染，光标下选项 `onMouseEnter` 抢占初始高亮，令首项 `aria-selected` 初值随机（非 rAF 聚焦竞态；我的首个 `toBeFocused` 修法定错根因、已自我纠正）。**fix-by-acceptance**：keyboard-only 导航用例前 `page.mouse.move(0,0)` 移开光标。验证：顺序 15/15、并行 8/8、全套 67/67 连过 4 次。属 F-2 遗留的测试脆弱性，非 D-1 产品缺陷。

### 二、凭证连接探针三态（信任级重点）

**无任何「乐观已连接」路径——状态只能由探针派生，代码双侧核实：**
- **TS `client.ts`**：`ConnectionPhase = pending|connected|failed`；`status()` 每次 `invoke('provider_credential_status')`（catch→failed），注释「不缓存乐观态」；`save()` 先格式校验（失败即 failed），Tauri 路径 `connected` **只来自 Rust 返回**（浏览器 `connected` 仅 Playwright 用、且格式门控）。
- **Rust `lib.rs`**：`credential_status()` 的 `connected` **只在真读到钥匙串密钥 + 格式过**（pasted）或**环境变量解析到非空**（environment）时返回；`read_source`/`get_password` 任何 `Err`/`NoEntry`/空/短 → `pending`/`failed`。`save_provider_credential` 末尾**再调 `credential_status()` 复探**，不乐观返回 connected。序列化仅 3 字段、`failure_message` 是 `&'static str` 定值，结构上不可能夹带 secret。
- **Playwright 三分支 + 不关窗**（`d1-case-scope.spec.ts`）：未配置→`data-phase=pending`「待连接」不含「已连接」；强制 failed→「连接失败」+ title 引导文案；合法保存→「已连接」；**短凭证保存失败→`provider-setup-error` 可见、对话框保持 visible、状态条不「已连接」**。`ProviderSetup.save()` 仅 `phase==='connected'` 才 `onClose`。
- **引导文案零技术概念**：「连接文书助手」「粘贴访问凭证/使用电脑已有凭证」「只保存到电脑的安全凭证库，不写入案件记录/运行记录/使用统计」——无 API key/token/keychain 黑话。
- ⚠️ **真实钥匙串拒绝路径无法自动化**：代码路径已核（`get_password → Err(_) → failed(钥匙串授权未通过)`），但真机钥匙串弹窗拒绝/错误密码需**用户真机复测一次**（见结论清单）。

### 三、demo 语料容器隔离

- **isDemo 角标**：标题栏 `demo-case-badge`「样板案·演示」+ 案卡 `data-demo` + `case-demo-badge`。✅
- **DEMO_ARTIFACTS 仅 demo 回落**：`App.tsx` `riskList/timeline/graph/matrix = isDemoCase ? (session ?? DEMO_ARTIFACTS) : session`（注释「禁止 `?? DEMO_ARTIFACTS` 污染真实案件」）；非 demo 得 `undefined`→空态。✅
- **新建案五工作面 + 对话 + chrome（当时的 UI 清单 #8 五处逐一）**：e2e 锁新案→5 视图 `case-empty-state`、无 user-message/风险卡/flow-s1/originals；titlebar=新案名、stage=「尚未开始阶段」、statusbar-progress=「新案件·等待任务」、statusbar-stage=「尚未开始阶段」、viewCount=「尚无」。**四处已闭：标题栏 ✅ / 面包屑阶段 ✅ / 时间线计数 ✅ / 状态条摄取与用量 ✅**。
  - ⚠️ **第五处「composer 文件夹 chip 跨案件粘滞」未闭（发现①）**：`App.tsx:704` 渲染 `<Composer>` **未传 case props/key**，chip 恒取 `DEMO_CASE_OPTIONS`（静态临江案），新建案下仍显示 demo 案名（且附件会挂错案）。`CASE_SCOPE_AUDIT` 与 SPEC 死路由表**均漏登此符号**。此项使 demo 隔离未 100% 关账。

### 四、死路由 / 容器作用域

- **`CASE_SCOPE_AUDIT`（10 行）逐行抽查定性合理**，且与 `App.tsx` 实码交叉核对：容器切换 `useEffect`（selectedCaseId 变）整体 `__clear__` + 重置全部案件域态、demo→S3/非demo→null；死路由三项（DEMO_ARTIFACTS 回落 / caseRoot 回落 / DEMO_OUTPUT 直读）均已按表所述改为派生。唯**漏登 composer chip**（见发现①）。
- **切换矩阵测试真实覆盖**：`d1-case-scope.spec.ts` demo(A) 有 S3 状态 → 新建 B 零继承（无风险卡/output-docx-card、statusbar「新案件」）→ 回 A 恢复 demo → 再进 B 仍空。往返零继承 ✅。
- **产出路径由 caseRoot 派生（F 批发现②销账确认）**：`resolveCaseRoot(active)` 非 demo 无 folderPath 返回 undefined、绝不回落 DEMO 根；`openOutputFolder` 走 `caseOutputDir(caseRoot)`，无 caseRoot 时「本案尚未绑定文件夹」可见反馈。**F-4 报告发现②（openOutputFolder 硬编 DEMO 常量）本单已销账。** ✅

### 五、溢出审计

- **长案名（34 字中文）归档 popover**：`ArchiveConfirmPopover` 的 `.archive-case-title.truncate` + `title=全名`；e2e 断言 `text-overflow:ellipsis` + `title` 属性。✅
- **全局 ellipsis 抽查**：`.truncate`（标题栏案名/案号、案卡、阶段行、状态条进度/阶段）、`.credential-button{max-width:200px;ellipsis}`（凭证钮）、`.mono-ellip`/`.case-chip-label`（composer chip）、`.user-message-attachments span{max-width:160px}`。chip/标题/阶段/凭证钮四类均覆盖。✅

### 六、当时的 UI 清单 #9 蓝色团块

⚠️ **排查结论不在案（发现②）**：SPEC D-1 节、styles.css、两提交 message 均无 #9 结论；静态 CSS 扫描未见 fixed/absolute 蓝色定位元素或 bottom/right 蓝色规则。checklist 6 要求「修复或定性在案」未满足——需实现者真机运行时目视排查（拖拽 ghost / focus outline 残留 / 渲染残留）并记录，本单无法从静态码定性。

### 七、git 卫生

两提交文件清单**各守 `apps/desktop/*`**：`4f59ab9` = lib.rs / ProviderSetup.tsx / client.ts+test / main.tsx；`5541d9c` = App.tsx / case-scope.ts+test / d1-case-scope.spec.ts / ArchiveConfirmPopover.tsx / styles.css / SPEC.md / assert-test-count.mjs / workbench.spec.ts / 2 截图。无跨层污染、无他人文件改删。✅

### 八、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | **composer 文件夹 chip 未案件作用域**（当时的 UI 清单 #8 第五处）：`<Composer>` 未传 active case，chip 恒显 demo 案名；audit/SPEC 均漏登 | 🟡（信任级·demo 隔离未闭） | **不属 fix-by-acceptance 范围**（产品行为改动，非测试/类型/构建）→ 打回实现者：给 Composer 注入 activeCase 投影并随切换重置，或非 demo 隐藏该 chip；同时补登 `CASE_SCOPE_AUDIT` |
| ② | 当时的 UI 清单 #9 蓝色团块排查结论不在案 | 🟡（checklist 6 未满足） | 打回：真机目视排查 + 记录（本单静态扫描无明显 CSS 定位元素，需运行时复现） |
| ③ | 命令面板方向键用例假红（F-2 遗留脆弱性，光标 hover 抢初始高亮） | 🟢→✅ | **已 fix-by-acceptance**（`mouse.move(0,0)`），稳定 67/67 |

### 九、结论

**四项信任级缺陷关账判定：**
1. **凭证探针三态 → 关账 ✅**（TS+Rust 双侧无乐观 connected、save 复探、三分支+不关窗 e2e、零技术文案；唯真实钥匙串拒绝流待真机复测一次，属固有不可自动化项、非码缺口）。
2. **demo 语料容器隔离 → 有条件关账 ⚠️**：五处 chrome 已闭四处，**composer 文件夹 chip（#8-⑤）未案件作用域，须打回补一次**方可全闭。
3. **容器作用域 → 关账 ✅**（audit 定性合理且与实码一致、切换矩阵往返零继承 e2e、产出路径由 caseRoot 派生并销账 F 批发现②；唯 audit 漏登 composer chip，随发现①一并补）。
4. **溢出 → 关账 ✅**（长案名截断 + 全局 ellipsis 抽查齐）。

**真机复测清单（留给用户的手动项）：**
1. **错误密码 / 钥匙串拒绝流**（唯一不可自动化的探针路径）：真机构建里输入一次错误凭证或触发钥匙串拒绝，确认显示「连接失败」+「钥匙串授权未通过…」、对话框不关闭、绝不「已连接」。
2. **环境变量凭证真机流**：用真实存在的环境变量名保存，确认仅解析到非空值才「已连接」（否则「电脑中未找到/为空」）。
3. **当时的 UI 清单 #9 蓝色团块**：真机目视右下角是否仍有蓝色团块，排查来源并把结论回填 当时的 UI 清单 #9。
4. （可选）真机确认 composer 文件夹 chip 在新建案件下的呈现（本单静态判定为 demo 案名粘滞，见发现①）。

> **总判定：凭证探针三态 / 容器作用域 / 溢出 三项关账；demo 隔离有条件关账（composer chip #8-⑤ 须打回补一次）。Playwright 假红已 fix-by-acceptance 修复至稳定 67/67；当时的 UI 清单 #9 排查结论待补。真机复测四项清单交付用户。**

## UX-1 / SET-1 合批验收（批次一 10 项 + D-1 打回 0a/0b + 设置页清单，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例 + worktree 复核 + 尾随 echo 判例）。范围两单：**UX-1**（当时的 UI 清单 批次一 #1–#10 + D-1 打回 0a/0b，实现落点已在 当时的 UI 清单 表）与 **SET-1**（当时的 UI 清单 设置页清单，提交 `0f82141`/`841cbe0`/`c9960e8`）。UX-1 实现落于 `34ef2c5`(feat)+`fa3040f`(e2e)+`bbf2fa6`/`08d2f70`(docs)。
- **环境**：Node v25.9.0 / pnpm 9.15.0。清除全部 `dist` + `*.tsbuildinfo` 后从零构建。
- **git 现场如实（HEAD 漂移已记录）**：验收开工 HEAD=`aabd54b`（合批 prompt）；验收进行中并发架构会话（"Courtwork Architecture (Cowork)"）追加两提交 `7d6c06c`+`09f15c8`，HEAD 前移至 `09f15c8`。**两提交经核 docs-only**（当时的 UI 架构裁决 + 手册；`git show --name-only` 不含 `apps/desktop`/`packages/`）。**被验代码即 `c9960e8`（apps/desktop 最后一次落码），全程逐字节未变**——build/test/e2e 证据不因 HEAD 漂移失效。工作树另有前批/他会话遗留 `eval/ACCEPTANCE.md`(M) + `历史实施计划`(??)，非本会话产物、原样未动。

### 一、干净环境全链实测

| # | 步骤 | 实测 | 判定 |
|---|---|---|---|
| 1 | 清 dist/tsbuildinfo + `pnpm -r run build` | **9 包全绿 exit 0**（schemas/registry/core/tools/output/reading-view/demo-data/eval/desktop）；唯 desktop 产物 chunk >500kB 为构建 advisory（非阻断） | ✅ |
| 2 | desktop Vitest | **55/55（13 文件）exit 0** | ✅ |
| 3 | 全库 Vitest | **723/723（83 文件）exit 0**（跨包回归无溢出） | ✅ |
| 4 | Playwright | **78 passed（28.0s）exit 0**，零 flaky/零 skipped；退出码单独查=0。分布：workbench 26 / global-verbs 21 / ux1 7 / d1-case-scope 7 / composer 5 / system-open 4 / settings 4 / file-ops 3 / icons 1 | ✅ |
| 5 | 假绿下限 | `assert-test-count.mjs` minimum=**78**；`playwright --list` Total=**78** | ✅ |
| 6 | 四门禁 | motion（仅 transform/opacity/bg/border-color）✅ ／ signature（右栏白名单+五色封闭集+icon 品牌单色）✅ ／ graph（tokens.json 对齐+边色封闭+矛盾 marker）✅ ／ icons（19 具名 SVG/17 概念+Lucide 静态按需）✅ — 逐条 exit 0 | ✅ |

> 假绿下限演进链自洽：D-1=67 → UX-1(`fa3040f`)=74 → SET-1(`841cbe0`)=78（settings.spec 4 条）。

### 二、UX-1 打回项 0a：composer chip 案件作用域（D-1 发现①关账）

D-1 发现①（`<Composer>` 未传 case props、chip 恒显 demo 临江案名、audit/SPEC 漏登）——本单四证闭环：

- **投影注入**：`ComposerProps` 增 `cases?`/`activeCaseId?`（[Composer.tsx:29-31](apps/desktop/src/composer/Composer.tsx:29)，注释"禁止默认 DEMO 粘滞到真实容器"）；App 真投影 `cases={cases.map(...)}` `activeCaseId={selectedCaseId}`（[App.tsx:801-809](apps/desktop/src/App.tsx:801)）；`DEMO_CASE_OPTIONS` 仅孤立预览/单测回落（[Composer.tsx:63-64](apps/desktop/src/composer/Composer.tsx:63)）。
- **切换重置**：`useEffect([activeCaseId])` 同步 chip、关菜单、清 containerize、真变更时清附件（[Composer.tsx:81-98](apps/desktop/src/composer/Composer.tsx:81)）；chipLabel 取 `selectedCase.name`，无容器示"选择案件"（[Composer.tsx:243](apps/desktop/src/composer/Composer.tsx:243)），零硬编码临江。
- **`CASE_SCOPE_AUDIT` 补行**：新增 `'Composer DEMO_CASE_OPTIONS / case chip'` 定性 `死路由→已改 activeCase 投影注入；随 selectedCaseId 重置；非 demo 禁止粘滞临江案名`（[case-scope.ts:100-104](apps/desktop/src/case/case-scope.ts:100)）。审计漏登已补。
- **切换矩阵 e2e 含 chip 断言**：[d1-case-scope.spec.ts:91-122](apps/desktop/tests/e2e/d1-case-scope.spec.ts:91) A(demo,S3)→新建 B 零继承→回 A 恢复→再进 B 空；**第 118-121 行 chip 断言**：`composer-case` `toContainText('案件乙')` + `not.toContainText('临江')`（标签 UX-1 0a）。单测 [case-scope.test.ts:41-47](apps/desktop/src/case/case-scope.test.ts:41) 断言 audit≥11 行 + `some(symbol.includes('Composer'))` + 无未分类 kind。

**判定：0a 关账 ✅**（D-1 发现①随之关账）。

### 三、UX-1 打回项 0b：e2e 光标依赖（helpers 统一 + mouse.move(0,0)）

- `openWorkbench` 统一入 [helpers.ts:9-17](apps/desktop/tests/e2e/helpers.ts:9)，点"先查看演示"后 `page.mouse.move(0, 0)`（:16），注释记 D-1 根因（光标停面板中心，浮层 `onMouseEnter` 抢初始 aria-selected）。
- **抽查=全查**：8 个 spec 全部 `from './helpers'` 引入，**零本地重定义**（`grep 'function openWorkbench' *.spec.ts` 空）。远超"抽 3 个"要求。

**判定：0b 关账 ✅**。

### 四、UX-1 #9 结案核验：G6 minimap 库蓝渗出（D-1 发现②关账）

- **定性入 SPEC**：[SPEC.md:40](apps/desktop/SPEC.md:40)「结论：G6 minimap 右下角库蓝 → `courtwork-minimap` tokens 压制」。
- **tokens 压制（源）**：[styles.css:489-503](apps/desktop/src/styles.css:489) 强制 `.courtwork-minimap` bg=`--bg-raised`、border=`--border-strong`、`box-shadow:none`；`canvas`=`--bg-raised`；视口遮罩 `[class*="mask"]` border=`--text-primary`、bg=`color-mix(--bg-selected 36%)` — 全 `!important` 盖 G6 默认蓝。[GraphPanel.tsx:113-118](apps/desktop/src/workbench/GraphPanel.tsx:113) 注册 minimap 带 `className:'courtwork-minimap'`。
- **预览真机目视（本验收亲测）**：dev server 起、进 关系图谱、`getComputedStyle` 实测右下角 minimap（120×72 @ vp(1148,520)）：bg `rgb(255,255,255)`、border `rgb(213,219,226)`、遮罩 bg `#E9EEF4@36%`、遮罩 border `rgb(10,37,64)=--text-primary`——**无任何饱和库蓝**；缩放目视右下角为中性白底缩略团，**蓝色团块消失**。gate `assert-graph-theme` 亦绿。

**判定：#9 关账 ✅**（D-1 发现②由静态无解 → 本单运行时定性+目视确认）。

### 五、UX-1 四项交互语义抽查

| 项 | 核验 | 判定 |
|---|---|---|
| 容器化仪式 popover（先聊后建·与存入卷宗同族） | 无绑定容器时"存入"触发 `containerize-popover`（[Composer.tsx:165-168](apps/desktop/src/composer/Composer.tsx:165) → :273-304），同 `scope-popover` 交互族，出 新建工作区/新建案件/取消；确认后 `scope='dossier'` + `onContainerize` | ✅ |
| 「+」菜单内禁用态（平铺仅真实动词） | `composer-plus` 菜单：选择文件夹=真（`composer-plus-folder`），相机/语音=`aria-disabled`+`preventDefault`+keydown 拦截+tooltip（[Composer.tsx:325-378](apps/desktop/src/composer/Composer.tsx:325)）；平铺仅 上传/案件 chip/发送 真实动词 | ✅ |
| 双词表随容器 kind 切换 | [container-copy.ts](apps/desktop/src/case/container-copy.ts) case=卷宗 / workspace=资料（5 函数）；`containerKind=selectedCase.kind`（[Composer.tsx:101](apps/desktop/src/composer/Composer.tsx:101)），`composer-scope-copy` sr-only 随 kind 渲染（:516-518），AttachmentChip 收 `containerKind`（:263） | ✅ |
| model-config 真实读写（改推理强度→持久化·无假活） | [model-config.ts](apps/desktop/src/provider/model-config.ts) 持久化 store+校验+`withProvider` 一致性；`updateModelConfig` 写盘（[App.tsx:347-350](apps/desktop/src/App.tsx:347)）**同一 handler** 供状态条 popover(:898)与设置页(:924)；round-trip 单测 [model-config.test.ts:24-27](apps/desktop/src/provider/model-config.test.ts:24)（含 reasoning:deep）；e2e #10 [ux1.spec.ts:88-100](apps/desktop/tests/e2e/ux1.spec.ts:88) 改 qwen/qwen-max/深思→关闭后 trigger 持久显示 | ✅ |

### 六、UX-1 #7 ThinkingStream 仅壳

[ThinkingStream.tsx](apps/desktop/src/workbench/ThinkingStream.tsx)：默认 content=占位"思考过程将在接通流式生成后显示。"（:16，**无伪造思考内容**）；`SparkLinesIcon`（:2/:30）作"机器的话"区隔标识；折叠交互 `open` 态、body 仅展开时渲染（:34），内容显式接 T-provider.1。e2e [ux1.spec.ts:79-85](apps/desktop/tests/e2e/ux1.spec.ts:79)：body 初始 count 0 → toggle → 含"思考过程"。**判定 ✅**。

### 七、SET-1 双入口 + 全局浮层（容器无关 / Esc / 分组 0ms）

- **双入口**：标题栏齿轮 `open-settings`（[App.tsx:620-624](apps/desktop/src/App.tsx:620)）+ ⌘K 命令面板 `action-settings`（[App.tsx:600-603](apps/desktop/src/App.tsx:600)），均 `openSettings('model')`。
- **全局浮层容器无关**：`role=dialog aria-modal`，标头"全局偏好 · 与当前案件无关"（[SettingsPage.tsx:177-180](apps/desktop/src/settings/SettingsPage.tsx:177)）；预览真机标头亲见。NAV 六组（模型/产出/通道/隐私/承诺/关于，[SettingsPage.tsx:34-41](apps/desktop/src/settings/SettingsPage.tsx:34)）。
- **Esc 关闭**：keydown Escape→onClose（[SettingsPage.tsx:87-97](apps/desktop/src/settings/SettingsPage.tsx:87)）；预览真机按 Esc 实关。
- **分组 0ms**：各 section `{section===x && ...}` 条件渲染、无 transition，结构性瞬切（与 motion 门禁一致）。e2e [settings.spec.ts:8-20](apps/desktop/tests/e2e/settings.spec.ts:8)（双入口开+关）/:22-69（真实组行为）。

### 八、SET-1 真实组逐项行为

| 条目 | 核验 | 判定 |
|---|---|---|
| 凭证入口复用 D-1 探针 | `credentialStatus` 单一 App 态（[App.tsx:117/:919](apps/desktop/src/App.tsx:919)）；`onOpenCredentialSetup` 重开**同一** `ProviderSetup`（:920 `setProviderSetupOpen(true)`，与 :906 同模态），**无第二套连接逻辑**；`ConnectionPhase='pending\|connected\|failed'` 闭合枚举（[client.ts:12](apps/desktop/src/credentials/client.ts:12)）。e2e :96-101 管理凭证开 `provider-setup` | ✅ |
| maxUsd → RuntimeGuard 配置语义 | settings maxUsd（美元、clamp≥0、2 位）↔ core `RuntimeLimits.maxUsd` 真强制（[runtime-limits.ts:67-72](packages/core/src/scenario-executor/runtime-limits.ts:67) checkUsd 累加超限抛错，executor 按 `response.usage`+价目接入）。**语义对齐+持久化真**；见发现① | ✅（配置语义）／见① |
| 默认产出目录 + reveal | webkitdirectory 选择（[SettingsPage.tsx:352-360](apps/desktop/src/settings/SettingsPage.tsx:352)）→ `onRevealPath`→`systemOpenClient.revealInFolder`（[App.tsx:359-361](apps/desktop/src/App.tsx:359)）；无目录时 reveal 真禁用（:345）。e2e :37-45 | ✅（浏览器为虚拟路径，见发现②） |
| 遥测 / opt-in 持久化 | 见下条 docs/decisions/ADR-005-data-security.md 逐条 | ✅ |

**opt-in 语义 docs/decisions/ADR-005-data-security.md 逐条对表**：

| docs/decisions/ADR-005-data-security.md 语义 | 实现 | 判定 |
|---|---|---|
| opt-in（默认关） | `DEFAULT_SETTINGS.behaviorDataOptIn=false`（[settings-store.ts:37-40](apps/desktop/src/settings/settings-store.ts:37)） | ✅ |
| 条款明示 + 确认对话框 | "逐项确认开启"→ `settings-optin-confirm` 对话框（[SettingsPage.tsx:458-465](apps/desktop/src/settings/SettingsPage.tsx:458) → :577-600），文案"仅不可逆脱敏后汇总字段级修正…不含案件实质内容" | ✅ |
| 同意时间戳留痕 | 确认→ `setBehaviorDataOptIn(true)` 写 ISO 戳（[settings-store.ts:147-162](apps/desktop/src/settings/settings-store.ts:147)），UI "同意时间：…"显示（:441-445） | ✅ |
| 可随时关 + 关闭清空不溯及 | "关闭授权"→ `setBehaviorDataOptIn(false)` 清戳（`undefined`）；单测 [settings-store.test.ts:30-37](apps/desktop/src/settings/settings-store.test.ts:30) on 记戳/off 清戳 | ✅ |
| 遥测默认仅本机 | `telemetryEnabled` 默认 true+文案"本机可随时关闭/不含密钥与案件正文"，`setTelemetryEnabled` 持久（单测 :39-43） | ✅ |

### 九、SET-1 诊断导出安全审查（重点）

**主张"无密钥、路径脱敏"逐字段核实 + 实物导出检查：**

- **载荷构造器**：`buildDiagnosticPayload`（[settings-store.ts:174-197](apps/desktop/src/settings/settings-store.ts:174)）仅 7 字段：`exportedAt`/`appVersion`/`credentialPhase`/`modelConfig{providerId,modelId,reasoning}`/`runtimeGuard{maxUsd}`/`output`/`privacy`。**无 key 字段**。`output.defaultOutputDir` → `'[configured]' | null`（**路径脱敏**，绝对路径不出）。
- **credentialPhase 不可夹带密钥**：`= credentialStatus.phase`，类型是 `ConnectionPhase` 闭合枚举（[client.ts:12](apps/desktop/src/credentials/client.ts:12)）；浏览器模式连粘贴值都丢弃（[client.ts:137](apps/desktop/src/credentials/client.ts:137) `browserStatus={phase,source}`），密钥从不入 JS 态。
- **单测护栏**：[settings-store.test.ts:50-59](apps/desktop/src/settings/settings-store.test.ts:50) 断言 `JSON.stringify(payload)` 不匹配 `/sk-\|password\|secret/i` 且 `output={defaultOutputDir:'[configured]'}`（喂 `/Users/secret/path`）。
- **实物导出检查（本验收亲导一份）**：预览真机装载"已连接"凭证 + 敏感路径 `/Users/lin-lawyer/Cases/临江精铸/产出` 后点"导出诊断"，拦截 blob 得实际载荷：`credentialPhase:"connected"`、`output.defaultOutputDir:"[configured]"`、**敏感路径全串缺席**、无 `sk-`/secret、恰 7 顶层键。物件存档 `scratchpad/courtwork-diagnostics-live-export.json`。

**判定：无密钥 + 路径脱敏 逐字段属实，实物验证一致 ✅（重点项通过）。**

### 十、SET-1 预留组零假开关 + 明确不出现

- **预留组 aria-disabled + 「即将支持」逐个点**：`sources`（[SettingsPage.tsx:369-379](apps/desktop/src/settings/SettingsPage.tsx:369)）、通道 wecom/feishu/email/enterprise-lib（:388-413）、clear-prefs（:495-505）、check-update（:560-570）——均 `aria-disabled="true"` + `preventDefault` + `title=RESERVED_COPY.*`；`RESERVED_COPY` 全模板"…即将支持 · 当前可通过…实现"（[data-promise-copy.ts:55-67](apps/desktop/src/settings/data-promise-copy.ts:55)）。e2e [settings.spec.ts:71-94](apps/desktop/tests/e2e/settings.spec.ts:71) 七项逐点断言。预览真机 `检查更新` 可及名含"即将支持"。
- **「明确不出现」三项 grep 确认（全 app 无入口）**：主题/dark-mode → **零命中**；语言/i18n → 仅 `toLocaleDateString`/`localeCompare`（日期与排序，非 UI）；skill/customize/技能管理 → **零命中**。设置 NAV 六组亦无主题/语言/skill。**判定 ✅**。

### 十一、SET-1 数据承诺声明页（docs/decisions/ADR-005-data-security.md 逐条·不改写语义）

`DATA_PROMISE_SECTIONS`（[data-promise-copy.ts:8-52](apps/desktop/src/settings/data-promise-copy.ts:8)）五块逐条对 docs/decisions/ADR-005-data-security.md：案件内容永不训练（红线+委托代理法理+"写进主协议正文非隐私附件"）｜脱敏行为数据（不可逆脱敏字段级修正/opt-in 条款明示·可随时关·不溯及既往）｜使用遥测（不含密钥与案件正文·本机仅存本机）｜公开判例专业判断标注｜我们不会做的事。**无语义改写/增删**。预览真机文书级排版抽查：粗体藏青分节标题、舒展行距、约束栏宽、主协议摘录体例——达标。e2e :60-63 内容断言。**判定 ✅**。

### 十二、git 卫生

- **SET-1**：`0f82141`(App.tsx/SettingsPage.tsx/data-promise-copy.ts/index.ts/settings-store{,.test}.ts/styles.css，7 文件) + `841cbe0`(assert-test-count.mjs/settings.spec.ts) + `c9960e8`(SPEC.md/docs46)——全 `apps/desktop/*` 或 `docs/`，tracked。
- **UX-1**：`34ef2c5`(16 文件 case/composer/provider/workbench/styles) + `fa3040f`(9 e2e/helpers/assert) + `bbf2fa6`(SPEC) + `08d2f70`(5 张 ux1 PNG)——全 tracked（5 张 `*-ux1-*.png` `git ls-files` 实证在库；`--stat` 显"UNTRACKED"系长路径 `...` 截断解析假象，`git status` 工作树净）。
- **desktop 工作树 0 未提交**；跨层无污染、无他人文件改删。HEAD 漂移（并发 docs-only）见抬头"git 现场如实"。

### 十三、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | maxUsd 已按 `RuntimeGuard.maxUsd` 语义持久化（美元/clamp/2 位），core 侧 `checkUsd` 亦真强制，但 **desktop→executor 桥接未接**（`loadSettings().runtimeGuard.maxUsd` 仅设置模块自用，core 无 desktop 耦合）。UI 文案"超限中断生成"为前瞻描述 | 🟢（诚实 MVP 边界，合 当时的 UI 清单"真实"=配置真读写 + "接真实流式 UI 零改动"） | **不打回**；记为 T-provider 流式接入时的桥接跟踪项（届时 executor `deps.limits` 取 `loadSettings()`） |
| ② | 浏览器 webkitdirectory 无绝对路径，产出目录落"虚拟前缀+文件夹名"（代码注释已声明 Tauri 真机替换） | 🟢（平台固有限制，已声明） | 无需处置；真机 Tauri 路径待发行阶段目视一次 |
| ③ | desktop 产物单 chunk >500kB（vite 构建 advisory） | 🟢（非阻断） | MVP 后 code-split polish |

**无 🔴/🟡 阻断级发现。** D-1 两打回（composer chip #8-⑤、#9 蓝团块）本单确认关账。

### 十四、结论（三问）

1. **UX-1 放行？→ 放行 ✅**。批次一 #1–#10 逐项照案；D-1 打回 0a（composer chip 案件作用域 + `CASE_SCOPE_AUDIT` 补行，四证闭环）/0b（helpers 统一 + `mouse.move(0,0)`，8 spec 全统一）关账；#9 蓝团块运行时定性 + 目视确认消失。四项交互语义 + ThinkingStream 仅壳无假内容俱实。
2. **SET-1 放行？→ 放行 ✅**。当时的 UI 清单 设置页 12 行逐项核实（真实/预留禁用/真实静态）；双入口全局浮层容器无关 + Esc + 分组瞬切；真实组行为 + opt-in 语义 docs/decisions/ADR-005-data-security.md 逐条对齐（确认对话框 + 同意时间戳 + 关闭清空不溯及）；**诊断导出无密钥、路径脱敏经实物导出逐字段验证（重点项通过）**；预留组零假开关 + "明确不出现"三项 grep 确认；数据承诺声明页语义未改写。
3. **desktop 就绪进入 RP-1？→ 就绪 ✅**。九门禁全绿（build 9 / vitest 55·全库 723 / playwright 78·退出码 0 / 假绿下限 78 / 四门禁），两单关账、无阻断缺陷、层洁 git 净。唯留两跟踪项**不阻断 RP-1 重排**：maxUsd→executor 桥接（随 T-provider 流式）、真机钥匙串拒绝流复测（D-1 遗留固有不可自动化项）。

> **总判定：UX-1 放行 ✅ · SET-1 放行 ✅。批次一 10 项 + D-1 打回 0a/0b 全闭；设置页清单逐项真实/预留/静态核实，诊断导出安全实物验证无密钥·路径脱敏。desktop 九门禁全绿、无阻断缺陷，就绪进入 RP-1（最后一张重排单）。跟踪项两条（maxUsd executor 桥接 / 真机钥匙串复测）交发行·流式阶段，不阻断重排。**

---

## RP-1 验收（左右栏分层 + 画布-浮面三层 + 混排左栏，Build 门从严，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例 + 尾随 echo 判例 + 干净环境自跑不采信自述）。实现者 Grok。**Build 门**：放行即触发首个正式分发 Build（Build 工序另单）。
- **范围五提交**：`1800925`（代验收会话提交 UX-1/SET-1 报告，核纯追加）/ `014ce0c`（SPEC+tokens elevation 先写）/ `9f52b50`（A/B/C 主体）/ `8a25b78`（e2e 八例 + floor 86 + 截图）/ `03a2f1a`（口径补丁 A2/B2/C2 + floor 87）。HEAD 另含两枚 docs-only 后续提交（`c4da1e4` elevation 白名单补遗 + `7122346` docs/architecture/schema-engineering.md），非本单代码，但白名单是 check 4 对照基准。
- **权威**：docs/decisions/ADR-006-ui-host.md 全五章（含四章补遗 elevation 三拍板 + 琥珀白名单 +1）、docs/decisions/ADR-005-data-security.md 混排修正、当时的 UI 清单 #16/#17、SPEC elevation 节、实现落点对照表（A2/B2/C2 标记）。

### 一、干净环境全链实测（不采信自述：node_modules + dist + *.tsbuildinfo 全清后重装重建）

清 `node_modules`/`*.tsbuildinfo`/`dist` → `pnpm install --frozen-lockfile`（"Lockfile is up to date"）→ 各门退出码单独捕获（**尾随 echo 判例**：不 `&&`/管道掩盖前序码）：

| 门 | 命令 | 结果 | 退出码 |
|---|---|---|---|
| 9 包 build | `pnpm -r build` | 安装 10 workspace（9 包 + root）；build 9 包各 `tsc`（demo-data/schemas/eval/reading-view/output/registry/tools/core/desktop），desktop `tsc -b && vite build` 3424 模块 | `___INSTALL_EXIT=0___` / `___BUILD_EXIT=0___` |
| Vitest 全绿 | `pnpm -r test` | 退出码 0；有套件 5 包实跑 **66 文件 / 503 用例全过**（demo-data 15 / eval 64 / tools 204 / core 156 / desktop 64） | `RC_vitest=0` |
| Playwright | `playwright test` | **87 passed (35.3s)**；末例 de-slop 基线（零投影/无语义线/紧凑行/细滚动条/线框图标）过 | `___PW_EXIT=0___` |
| --list 计数 | `playwright test --list` | **Total: 87 tests in 10 files**（= 假绿下限 87，铁闸咬合） | 0 |
| 门禁 1 动效 | `assert-motion-properties` | 仅 transform/opacity/bg/border | `RC_motion=0` |
| 门禁 2 法理之线 | `assert-signature-line` | 右栏白名单 + 五色封闭 + icon 单色 | `RC_signature=0` |
| 门禁 3 图谱 | `assert-graph-theme` | tokens 对齐 + 边色封闭 + 矛盾 marker | `RC_graph=0` |
| 门禁 4 图标 | `verify-icons` | 19 具名 SVG（17 概念）+ Lucide 静态按需 | `RC_icons=0` |
| 假绿下限 | `assert-test-count` | **87 条（下限 87）** | `RC_floor=0` |

**假绿下限禁降史（`git show <sha>:file` 真实文件值，非采信 commit message）**：`fa3040f`=74 → `841cbe0`=78 → `8a25b78`=86 → `03a2f1a`=87 → HEAD=87，单调不降；命中工单 78→86→87。下限=实测 87=`--list` 87 三者一致。

### 二、git 卫生（五枚提交清单 + 纯追加核 + 工作树）

| 提交 | 文件（增/删） |
|---|---|
| `1800925` docs 代提交 | `ACCEPTANCE.md` +128/-0 |
| `014ce0c` SPEC+tokens | `SPEC.md` +74/-1、`docs/design/tokens.json` +15/-0 |
| `9f52b50` A/B/C 主体 | `App.tsx` +475/-193、`CaseRail.tsx` +353、`rail/types.ts` +74、`rail.test` +56、`ModuleStack.tsx` +205、`module-stack.ts` +83、`module-stack.test` +52、`ModelConfigPopover` +2/-1、`case-scope.ts` +5、`case-scope.test` +2/-1、`styles.css` +148/-11、`Icon.tsx` +14 |
| `8a25b78` e2e+floor+截图 | `assert-test-count` +1/-1、`capture-rp1-compact.mjs` +22、`rp1.spec.ts` +133、`workbench.spec.ts` +8/-5、`22/23-*.png`（二进制） |
| `03a2f1a` 口径补丁 | `SPEC.md` +4/-4、`assert-test-count` +1/-1、`App.tsx` +56/-18、`ModuleStack.tsx` +4、`CaseRail.tsx` +3/-2、`rp1.spec.ts` +47/-2、`ux1.spec.ts` +10/-0、`workbench.spec.ts` +3/-1 |

- **`1800925` 纯追加核**：`ACCEPTANCE.md` **+128/-0，零删除行** → 原样提交无改一字，达标。
- 五提交仅动 `apps/desktop/*` + `docs/design tokens.json`，显式路径分层，无宽 `add` 误吞、无跨会话污染。
- **工作树**：RP-1 scope 零未提交残留；干净重建后 `dist`/`*.tsbuildinfo`/`test-results` 均 gitignore（`git check-ignore` 确认），**未脏任何跟踪文件**。遗留两非 RP-1 项——`eval/ACCEPTANCE.md`（W7.1 eval 补验 +39 纯追加，另垂类）+ `历史实施计划`（未跟踪计划稿，本会话前既存）：均文档、非本单 scope、零 Build 影响；**不越权处置**，记为仓库 housekeeping。

### 三、结构验收逐 ID（重点抽实现，非仅跑测试）

**A2 双证——toggle 对消已死**：App `onSelectCase` 对 case 行 `setExpandedCaseId(id)` **强制展开**（非 toggle），chevron 走独立 `onToggleExpand`；`case-file-count` 点击仅 `onSelectCase + onFocusOriginals`，**不调 toggle**（CaseRail 注释显式"禁止再 toggle——与 select 同批会对消回 null"）。ux1 #1 e2e 含 `data-highlight` + **「收起后再点计数仍自动展开并高亮」**（收 chevron→originals-zone count 0→再点计数→复现可见+高亮），`03a2f1a` 该 spec **+10/-0 纯增零放宽**。双证成立。

**B2 单实例铁证**：全库 `<ModelConfigPopover` 挂载点唯一 `App.tsx:1219`（`ModuleStack:190` 为注释非第二套）；context chip `onOpenModelConfig = () => setModelConfigOpen(true)` 唯一动作、无第二套读写，与状态条共用同一 `modelConfigOpen`/`updateModelConfig`；rp1 #8 e2e：chip 开→popover count **1**→改 provider/model/深思→状态条 trigger 反映 Qwen Max·深思→再开仍 count 1。

**C2 只迁不清**：`N/M` 唯一权威位 = progress 面板头 `progress-module-count`（`progressHeadCount`）；状态条 `statusbar-progress` 改非计数文案（摄取/审阅进行中）。五项原位断言：用量 `usage-ring` / 摄取「摄取余量 1,154」/ 续行「继续本案工作」/ 产出「打开产出文件夹」/ 模型 `model-config-trigger` 全留状态条。既有 workbench e2e **强化非放宽**：`getByText('摄取进行中 16 / 20')`→`progress-module-count='16/20'` + `statusbar-progress contains 摄取进行中`。

**标题栏琥珀仅 failed**：App titlebar warn 仅 `phase==='failed'` 渲染，pending/connected 无；rp1 #5 e2e 三态驱动（pending 无→failed 有 `data-phase=failed`+连接失败）；预览实测 connected 态 `titlebarWarnPresent=false`。白名单：全库 `--elevation-warn` 消费位仅 `.titlebar-credential-warn`（styles.css 76-77）——符合 docs/decisions/ADR-006-ui-host.md 四章补遗「琥珀审阅面外唯一合法使用位」。

**混排列表**：图标三态 `railIconName`（案件 briefcase-business / 工作区 folder-open / 未归档 message-square-text 三具名）；`canExpandRailRow` 仅 `case` 返 true → **案件行独有 chevron**，工作区/未归档为 spacer；Pinned（置顶）在上 + 混排「最近」，**类型不分区**（无案件/工作区/未归档分段标题；置顶/最近为时序分组，同 frontier 五章参照）。**［见七节 F-1：未归档「存入」未接容器化 popover］**

**导航骨架**：产出 `nav-artifacts`→`openOutputFolder`（真 reveal 路由）；定时/派发 `aria-disabled`+「即将支持」tooltip+`preventDefault` 零假活；全库 `Customize` grep **0**。

**#16 / #17**：#16 model-config 关闭钮「关闭」+ `quiet-button` 次要层级（docs/design），全库「先看」grep **0**；#17 `showLeadAttorney(isDemoCase)` 仅 demo 渲染，`CASE_SCOPE_AUDIT` 含 `rail-footer lead attorney` 行（12 行），`case-scope.test` 断言该行存在，rp1 #7 e2e 非 demo 案件 `lead-attorney` count 0。

### 四、elevation 一致性专项（三处逐 token 对表）

SPEC 提案值 ↔ `tokens.json elevation` ↔ `styles.css :root` 11 token 逐一致；关键解析值经浏览器 computed 实测：canvas **#EDEDED** / float **#FFFFFF** / border **#EBEBEB** / radius **12px** / inset **8px** / gap **8px**。

- **无新增色相**：warn 三轨 `--amber-bg/fg/graphic` = `#FCF6E8/#B45309/#D97706` = gate.pending 三值（复用非新增）。
- **box-shadow 全库恒 none**：`*{box-shadow:none}` + `.surface-float{box-shadow:var(--elevation-shadow)=none}`，四处声明全 none。
- **无裸值绕过**：消费侧圆角走 `var(--elevation-float-radius)`；全库无 `border-radius:12px` 字面；warn 走变量（列表卡 radius.md 6px 属既有语义，非浮面壳）。

### 五、真机/预览目视（自跑 1440 视口，不采信 implementer 截图）

**L0/L1 层级（浏览器 computed 实测，非目测）**：L0 app-shell bg **#EDEDED**、对话画布 bg **transparent**（坐底色）；L1 `.surface-float` **恰 3 面**（左栏/右栏/composer），各 白 #FFFFFF + 细描边 #EBEBEB·1px + 圆角 12px + **box-shadow none**，workspace padding **8px**（inset 不贴边）+ gap **8px**；标题栏 bg **transparent**（融入 chrome）。逐值坐实 docs/decisions/ADR-006-ui-host.md 四章三层模型。

**收缩态实测**（自点 `enter-compact-layout`）：左栏折叠 48px + 展开钮 + 三通用模块头折 + 画布/composer 浮卡放大占中——**与截图 22 一致**。活动垂类工作面（修订预览）在窄右栏留存（非全空）：与过目截图 22 既态 + 收缩态 e2e 定义一致，记解读注（七节 F-2）。

**专注/Tab/对照未回归**：Tab 五工作面 + 对照 + 专注钮在位；相关 e2e 在 87 全绿内。

### 六、回归红线（既有 e2e 逐文件 diff 语义核）

- `workbench.spec.ts@8a25b78`：`heading 对话`→`conversation-canvas`+`right-module-stack`（增断言）；`.titlebar .case-number`→`.toolbar .case-number`（案号迁工具栏）；`.case-card`→`.case-card.first()`（混排多卡，box-shadow none + radius 6px 保留）——**结构迁移零放宽**。
- `workbench.spec.ts@03a2f1a`：`摄取进行中 16/20` 文本→面板头 `16/20`+状态条文案——**C2 迁移强化**。
- `ux1.spec.ts@03a2f1a`：**+10/-0 纯增** A2 断言。
- D-1 切换矩阵（`d1-case-scope.spec`）/ SET-1 诊断导出（`settings.spec`）：随 desktop 64 vitest + 87 e2e 全集抽跑通过，未回归。

### 七、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| **F-1** | 左栏未归档「存入」（`handleContainerizeUnfiled`）**直建 `kind:'case'`，跳过容器化仪式 popover**——`containerize-popover` 存在且 composer-first 路径在用（含工作区/案件选择），rail 路径未接、硬编码案件、无选择；rp1 #2 e2e 锁的正是无 popover 直建行为。与 check 5「未归档行尾存入接容器化仪式同一 popover」+ 当时的架构工单册 A.1「接既有容器化仪式」不符。 | 🟡 实现级 UX 路由缺口（**非契约、非安全/数据**；容器化增量可逆、无留人确认违规） | **不由验收顺手改**（属特性路由决策，非 test/type/export/build 类 bug，且触及仪式设计）；据 AGENTS.md 不变量 2，验收无权单方豁免验收标准 → **Build 触发前须清**：rail 存入复用既有 containerize popover（App 内 handler 小改，不动契约/结构）**或**经架构明示豁免 check 5。 |
| F-2 | 收缩态右栏留活动工作面（非「全空仅画布+composer」）；三通用模块头折但垂类工作面不折。 | 🟢 解读注（与过目截图 22 + 收缩态 e2e 一致；base 结构不破） | 无需阻断；「全折至纯底座态」如需归架构后续 polish 定。 |
| F-3 | e2e 覆盖粒度：混排图标三态测 2/3（无 workspace fixture）；C2 五项测 3/5（摄取/续行未显式）；琥珀三态测 2/3（connected 缺省未单测，单条件 `phase==='failed'` 保证 + 预览实测 false）。 | 🟢 覆盖注（实现码全覆盖；机制单条件） | 记覆盖补强项，非阻断。 |
| F-4 | desktop 产物单 chunk >500kB（vite advisory，UX-1 已在册） | 🟢 非阻断 | 沿用处置，MVP 后 code-split。 |

**无 🔴 阻断级发现。** 唯一 🟡（F-1）系实现级 UX 路由缺口，不破 base 结构、不触契约、不涉安全，但偏离一条明列验收标准。

### 八、结论（三问）

1. **RP-1 放行？→ 结构验收通过 · 条件放行 ✅**。全局门全绿（build 9 exit 0 · vitest 503 · playwright 87/87 · 四门禁 · 假绿 87 禁降史 78→86→87 · git 净）；A2 双证 / B2 铁证 / C2 只迁不清 / 琥珀仅 failed / 混排 / 导航骨架 / #16#17 逐 ID 抽实现坐实；elevation 三处对表逐 token 一致、零投影、无新色相；L0/L1 浏览器 computed 逐值成立。**唯 F-1（存入未接容器化 popover）偏离 check 5 验收标准**——验收不擅自豁免（不变量 2），故放行附**硬前置**：F-1 修复或架构豁免，二者其一。
2. **base 是否定形？→ 定形 ✅**。三层（L0 底色 / L1 三浮面 / L2 popover）+ 混排左栏 + 右栏模块栈 + statusbar 迁移 + elevation token 组，结构冻结且逐值实测成立。F-1 修复为 App 内 handler 路由变更，**落在冻结结构内，不重开重排**——base 定形不受 F-1 牵动。
3. **可出首个正式 Build？→ 可出，但触发前须清 F-1 ⏳**。base 定形、无 🔴 阻断、九门全绿，Build 裁切前提已备；唯 Build「放行即触发」故触发闸眼落在 F-1：**推荐实现会话快速补丁（rail 存入接既有 popover）+ 单点复验后触发**为最稳路径；若架构就「从严」判 F-1 可豁免或转 Build 后 fix-forward，则该裁决权归架构（门禁/验收标准独属架构，不变量 2）。

> **总判定：RP-1 结构验收通过 · 条件放行 ✅ · base 定形 ✅ · 首个正式 Build 触发前须清 F-1 ⏳。** 干净环境 9 包 build + 503 vitest + 87/87 playwright + 四门禁 + 假绿 87（禁降史 78→86→87）全绿；A2/B2/C2 三补丁抽实现坐实（toggle 对消死 / 单 popover 实例 / 只迁不清）；elevation 三处逐 token 一致、box-shadow 恒 none、无新色相；L0/L1 三浮面浏览器 computed 逐值成立、标题栏透明、收缩态与截图 22 一致。唯一 🟡 F-1（未归档存入跳过容器化 popover）偏离一条明列验收标准，验收不擅自豁免——记 Build 触发硬前置（修复或架构豁免），不破 base 结构、不改 base 定形结论。

### 九、F-1.1 复验（硬前置清算，2026-07-11）

架构裁决 F-1 **不豁免**（`2da6d28`：直建=替用户选名词）→ 实现补丁 `287ca17` + 第 0 步代提交我方报告 `8202d18`。复验（不采信自述，清 dist/tsbuildinfo 全量重建；无依赖变更故免重装）：

**F-1 闭合核实（读实现非仅跑测试）**：
- App.tsx **废除** `handleContainerizeUnfiled` 直建 `kind:'case'`；新 `confirmContainerizeUnfiled(kind: ContainerKind)` 以**用户所选 kind** 建容器（workspace→项目 / case→案件），经 `containerizeUnfiledId` 锚点。
- CaseRail.tsx「存入」→ `onRequestContainerizeUnfiled`（开 popover）；行内渲染 `scope-popover containerize-popover rail-containerize-popover`，**复用 composer 同一 `CONTAINERIZE_COPY` + 同 `data-testid="containerize-popover"` + 工作区/案件二选**——check 5「接容器化仪式同一 popover」达标。
- styles.css `.rail-containerize-popover`：`var(--border-strong)`/`var(--bg-raised)` + radius 6px（同既有 popover 惯例）——**无投影、无裸 hex、无新色相**。

**门复跑（HEAD=`287ca17`，杀旧 :1420 起新服务跑当前源码）**：

| 门 | 结果 | 码 |
|---|---|---|
| 9 包 build | `pnpm -r build` 全绿 | `BUILD_EXIT=0` |
| Vitest | **503 全过**（desktop 仍 64；补丁只加 e2e 非单测） | `VITEST_EXIT=0` |
| Playwright | **88 passed (39.5s)** | `PW_EXIT=0` |
| --list | **Total: 88 tests**（= 下限 88） | 0 |
| 假绿下限 | **88（禁降 87→88）** | 0 |
| 四门禁 | 动效/法理之线/图谱/图标 | 各 0 |

**e2e 强化非放宽**：旧「存入触发容器化」→ 改为 `#21 选案件`（点存入→popover 可见→选案件→行消失+标题栏见名）+ 新 `#25 选工作区`（同链 + `rail-icon-workspace` 实测）；两分支过，**顺带闭七节 F-3 图标三态覆盖**（workspace 图标 e2e 首次实跑）。de-slop 零投影基线例仍在 88 内。

**git 卫生**：`8202d18` = 我方 RP-1 报告 **+98/-0 verbatim、独立、无夹带**既存两项（`git show` 零删除行、锚点在）；`287ca17` 仅动五显式文件、无 `pnpm-lock.yaml` 变更；工作树复验后仍仅两非本单既存项（`eval/ACCEPTANCE.md` W7.1 / superpowers 计划稿），零新脏。

**复验结论（更新三问）**：
1. **RP-1 → 全数放行 ✅**（F-1 硬前置已清，无遗留 🟡/🔴）。
2. **base → 定形 ✅**（F-1.1 为冻结结构内 handler+popover 增量，未动契约/分层）。
3. **首个正式 Build → 可触发 ✅**（九门全绿于 `287ca17`；BUILD-1 工序单已发，据此裁切）。

> **F-1.1 复验总判：硬前置清算完毕，RP-1 全数放行 ✅ · base 定形 ✅ · 首个正式 Build 可触发 ✅。** 存入接同族容器化 popover（用户选名词）实现+e2e 双证，直建路径废除；干净重建 9 包 build + 503 vitest + 88/88 playwright + 假绿 88（禁降 87→88）+ 四门禁全绿；step-0 代提交我方报告 verbatim 无夹带。RP-1 关账。

---

## FIX-KC-1 验收（凭证授权流·安全敏感件·主张逐条证伪，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例；安全敏感，主张逐条证伪、不采信自述）。实现者 Grok。
- **范围**：`815bf15`（11 文件显式路径）。**权威**：当时的架构工单册 FIX-KC-1 + DBG-2（H1 ad-hoc CDHash/ACL 漂移主因）+ **docs/decisions/ADR-005-data-security.md 红线**「key 永不进事件流/日志/遥测（进验收项）」。
- **五件合施**：DBG-2.1 trace / F2 ACL 止血 / F4 分型 / F5 恢复 / F6 dev 隔离；F1（Developer ID）/F3（单条目合并）明确不做。

### 一、隔离验证方法（安全件从严：并发脏树 + 端口争用两处纠偏）

- **并发脏树**：主工作树被并发 RP-2 会话（sol）重度污染（`App.tsx`/`Composer.tsx`/`CaseRail.tsx`/`styles.css`/`assert-test-count.mjs`/多个 e2e + 新 `rp2.spec.ts` 等 10+ 文件未提交）。据 AGENTS.md 判例（禁共享树 checkout/stash），**建独立 `git worktree` detached@`815bf15`** 验证，彻底隔离 RP-2 在途。
- **端口争用纠偏（不采信自述关键）**：首轮 worktree playwright 因 `reuseExistingServer:true` + 端口 1420，**误连主树 RP-2 dev server**（`lsof` 实证 :1420 属 `/Users/.../Projects/Courtwork/apps/desktop`），跑出 22 假失败（`model-config-trigger`="待连接"、`credential-status-button` 不存在——正是 RP-2 #18′「状态条撤模型名」的在途改动，非 FIX-KC-1 缺陷）。**改 worktree 端口 1421 + `reuseExistingServer:false` 起自有服务重跑 → 90/90 全绿**（两 FIX-KC-1 新例耗时从 38.8s/27.1s 超时降至 984ms/1.2s，佐证系错服务污染）。

### 二、全局门（worktree@815bf15 干净环境，退出码单查）

| 门 | 结果 | 码 |
|---|---|---|
| 9 包 build | `pnpm -r build` 全绿 | `BUILD=0` |
| Rust 单测 | `cargo test` **9 例逐名全过**（classify_keyring_no_entry / classify_os_status_maps_known_codes / dev_service_suffix_matches_build_profile / parse_os_status_from_display_and_debug_text / trace_disabled_by_default / status_payload_contains_no_secret_field / failed_payload_carries_user_facing_message_and_fail_kind / trace_line_never_embeds_secret_fields_or_values / wire_names_and_messages_are_zero_tech） | `CARGO=0` |
| Rust release | `cargo test --release dev_service_suffix…` 过（F6 release 分支实证） | `CARGO_REL=0` |
| Vitest | **509 全过**（demo-data 15 / eval 64 / tools 204 / core 156 / **desktop 70**） | `VITEST=0` |
| Playwright | **90 passed（隔离 :1421）** | `PW=0` |
| --list | **Total: 90 tests**（= 下限 90） | 0 |
| 假绿下限 | **90**；`815bf15` = 90，禁降史 87→88（F-1.1）→**90**（命中工单 88→90） | 0 |
| 四门禁 | 动效/法理之线/图谱/图标 | 各 0 |

### 三、安全主张逐条证伪

**1. trace 无泄漏（码 + 实测双证）**：读 lib.rs 逐调用点——`trace_op`/`trace_status_exit`/`trace_startup_once` 仅收 account 常量（`provider-secret`/`active-source`，非值）、service、ok、fail_kind 枚举、os_status、phase、source_kind 枚举、签名元数据；**secret 值/source 值/env 名/env 解析值零写入路径**（`rewrite_password` 传 account 不传 value；env 路径注释「不把 env 名写入日志」）。另有 `key_looks_sensitive` 防御式丢弃敏感键。**实测**（`COURTWORK_CRED_TRACE=1` + 临时 HOME 直驱真实写盘路径，故意注入 `secret="sk-…"`/`apiKey`/`password`）：日志实载 = `{event,op,account:"provider-secret",service:"…provider.dev",ok,fail_kind:"auth_failed",os_status:-25293}` 等；**注入的敏感字段整行被丢至仅剩 `{event:"keychain_op"}`**；grep 无 `sk-`/sentinel/`hunter2`。断言测试 `trace_line_never_embeds_secret_fields_or_values` 真断言（含防御丢弃）。→ **docs/decisions/ADR-005-data-security.md 红线成立。**

**2. 默认关（实测文件系统）**：`write_trace_line` 未开先返回。**实测**：不设 env 驱动多条 trace → **日志文件与目录均不创建**（`!log.exists() && !log_dir().exists()`）。单测 `trace_disabled_by_default` 佐证。

**3. F6 dev/release 双向（防反转灾难）**：`#[cfg(debug_assertions)]`→`…provider.dev`；`#[cfg(not)]`→`…provider`。debug `cargo test` 断言 `.dev`；**`cargo test --release` 断言 == `cn.courtwork.desktop.provider`（无 .dev）**——release 不带 .dev 双向证明。

**4. F4 分型不越权**：wire_name 闭集 {user_canceled/auth_failed/acl_denied/missing/platform}；user_message + TS `FAIL_KIND_MESSAGES` 对外零技术（单测断言无 keyring/OSStatus/ACL）；`CredentialStatus` 序列化仅 phase/source/failureMessage/failKind（`status_payload…no_secret` 断言精确 JSON 无 secret）。**SET-1 导出回归**：`buildDiagnosticPayload` 增 `credentialFailKind`（枚举/null），`defaultOutputDir→'[configured]'`；单测重建实物 payload 断言无 `sk-`、不夹带用户长文案、path `[configured]`。os_status 仅落 opt-in dev trace，**不入 status JSON/导出**。

**5. F2 顺序 + 半写诚实**：`rewrite_password` = `delete_credential_ignore_missing`（吞 NoEntry）→ `set_password`；pasted 存 = 重写 secret `.and_then` 重写 source（整组）；**secret 成功但 source 失败 → `and_then` 短路 → `failed_keychain`（非 connected）**；成功后 `reprobe` 复读定态。半写不假 connected。

**6. F5 文案对表**：`KEYCHAIN_RECOVERY_GUIDE` 两段 = H4 钥匙串密码指引（登录钥匙串锁定/改密同步）+ 手动删 `cn.courtwork.desktop.provider` 两项（`active-source`/`provider-secret`，注 dev `.dev`）；SettingsPage **`phase==='failed'` 才渲染**（e2e + 单测断言无 secret）。

**7. e2e 回归红线**：`settings.spec` +29 **纯增**（failed 分型文案 + 恢复指引呈现）；`d1-case-scope` +20 **纯增**（auth_failed 呈状态条 title，既有「钥匙串授权未通过」例保留）；`settings-store.test`/`client.test` 断言**强化非放宽**。零既有断言放宽。

### 四、git 卫生

`815bf15` = 恰 **11 文件**显式路径（lib.rs / client.ts / settings-store.ts / SettingsPage.tsx + 两单测 + 两 e2e + SPEC + assert-test-count），**未含任何 RP-2 热点文件**（App/Composer/CaseRail/rp2.spec）；无 `pnpm-lock.yaml` 变更。验收全程在隔离 worktree，**主树零改动**——RP-2 并发脏文件（10+）与既存两项（eval/superpowers）均未动。

### 五、真机采集剧本评估（结论问二）

- **F-KC-a**：工单要求「完工报告附：真机采集剧本」，但**交付物（SPEC/当时的架构工单册/报告）未见可执行剧本**（当时的架构工单册 仅引用之）→ 未随交付。
- 验收据实现补齐并实证：`codesign` 步已在机跑通——`/Applications/Courtwork.app` 在机，输出 `flags=0x10002(adhoc,runtime)` / `Signature=adhoc` / `TeamIdentifier=not set` / `CDHash=04d33791…`，**实锤 DBG-2 H1**（ad-hoc 签名→每次构建 CDHash 变→ACL 漂移）。trace 步已实测无泄漏（三节 1）。
- **可直接交用户的剧本**（安全：日志无密钥，实测在案）：

```sh
# 1) 退出 Courtwork（若在运行）
# 2) 终端直跑二进制并开 trace（open -a 不传 env，须直跑二进制）：
COURTWORK_CRED_TRACE=1 "/Applications/Courtwork.app/Contents/MacOS/courtwork-desktop"
# 3) 在应用内复现凭证连接（粘贴 key / 完成连接），触发问题；trace 同步回显终端
# 4) 退出后回传两份（均无密钥，可安全外发）：
cat ~/Library/Logs/cn.courtwork.desktop/credential-probe.log
codesign -dv --verbose=4 "/Applications/Courtwork.app/Contents/MacOS/courtwork-desktop"
```

### 六、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| F-KC-a | 完工报告未附「真机采集剧本」（工单明列交付项） | 🟡 交付项缺失（非代码缺陷） | 验收据实现补全并实证（五节），可直接交用户；建议实现/架构收编入正式交付物。不阻代码放行。 |
| N-1（过程注） | 主树被并发 RP-2 会话重度污染，含 `assert-test-count.mjs`（floor）与多 e2e | 🟢 他单在途，非本单 | 记录：本单代提交 / RP-2 提交时须交叉核 floor 与 e2e 计数（避免误吞 / floor 冲突）；本单已隔离验证不受影响。 |

**无 🔴；无安全红线破口**（trace 无泄漏码+实测双证、默认关实测、F6 release 无 .dev、导出无密钥、UI 零技术概念）。

### 七、结论（两问）

1. **放行？→ 放行 ✅**。七条安全主张逐条证伪均立（trace 无泄漏码+实测、默认关实测、F6 双向、F4 分型不越权+导出回归、F2 半写诚实、F5 failed-only 文案、e2e 纯增不放宽）；隔离环境全门绿（build 9 / cargo 9 逐名 + release F6 / vitest 509 / playwright 90/90 / floor 90 禁降 88→90 / 四门禁）；docs/decisions/ADR-005-data-security.md 红线实测成立；git 仅 11 文件、他会话脏未动。
2. **真机采集剧本可直接交用户执行？→ 交付缺失，验收已补可执行版 ✅**。实现完工报告未附剧本（F-KC-a）；验收据实现补一份并实证（codesign 在机跑通证 H1 ad-hoc；trace 步实测无泄漏；路径 `/Applications/Courtwork.app` 在机），**该剧本可直接交用户跑一轮回传**（日志无密钥，安全外发）。建议收编为正式交付物。

> **总判定：FIX-KC-1 放行 ✅（安全敏感·主张逐条证伪·隔离验证）。** trace 无泄漏（读码零写入路径 + 实测注入哨兵整行丢弃 + 默认关不落盘）、F6 release 无 .dev（debug/release 双证）、F4 分型对外零技术且导出无密钥、F2 半写诚实不假 connected、F5 failed-only 恢复指引——docs/decisions/ADR-005-data-security.md 红线守住。干净隔离 worktree 全门绿（9 build / 9 cargo+release / 509 vitest / 90-90 playwright / floor 90 / 四门禁）；仅 11 文件、主树 RP-2 脏未动。唯 F-KC-a（采集剧本未随交付）记 🟡，验收已补可执行版并实证，可直接交用户，建议收编。

---

## RP-2.5 验收（双宿主解耦 + 响应式收口 + 设置 modal，2026-07-11）

- **角色**：独立验收会话（实现者 sol；实现与验收分离）。
- **范围**：`850d956`，以 当时的架构工单册「RP-2.5 验收」+ docs/decisions/ADR-006-ui-host.md 三章修正 + docs/design 为权威。
- **隔离**：主树保持在 `4fe2773` 且有他会话 `eval/ACCEPTANCE.md` 修改与 provider 计划稿未跟踪；本验收新建 `/tmp/courtwork-rp25-accept`、分支 `codex/accept-rp25` 固定 `850d956`，未在共享树 checkout/stash。E2E 前 `lsof -nP -iTCP:1427 -sTCP:LISTEN` 为空，使用 `COURTWORK_E2E_PORT=1427` 且 `reuseExistingServer:false` 自起服务。

### 一、全局门与守卫负测

| 门 | 实测结果 |
|---|---|
| 干净安装 | `pnpm install --frozen-lockfile`，1046 包复用缓存，退出 0 |
| 全仓构建 | `pnpm -r build`，9/9 workspace 项通过；desktop Vite 构建退出 0 |
| Vitest | desktop **70/70**（15 files） |
| Playwright 清单/floor | `--list` **107**；`assert-test-count.mjs minimum=107`，禁降史 90→107 |
| 四门禁 + Preview 门禁 | motion / signature / graph / icons / preview 全绿 |
| Playwright 全量 | 隔离 `:1427`，**107/107 passed（40.8s）** |

**Preview 守卫非空证明**：用临时补丁在 `UtilityRail.tsx` 加 `../preview/renderers/WorkbenchPreviewRenderer` 越界 import，`lint:preview` 实际红：`utility -> renderer import`、exit 1；随即以反向补丁撤销，门禁恢复 `Preview host/import boundaries: OK`，该文件 diff 归零。守卫源码同时递归扫描 `utility/**`、`preview/renderers/**`，并对 `PreviewHost.tsx` 禁词 `(法律|案件|卷宗|合同|风险|修订)`；不是空断言。

### 二、结构、响应式与视觉实测（独立浏览器探针）

**双宿主**：初态 `utility-rail[data-mode=dock]` + Preview 可见；dock 恰 3 项，进度权威位 `0/6`；关闭 Preview 后 `data-mode=base`、恰 3 张 `.utility-card`、schema tab 数 0；等待 800ms 手动关闭仍保持；点击「预览/展开」恢复。旧 e2e 只改两处：D-1 在 dock 点进度回基础态后继续核原断言（+2 无删除），file-ops 从窄档「更多」进入同一路由（结构迁移）；无语义放宽。D-1 / SET-1 / FIX-KC-1 关键例均包含在 107 全量绿色中。

**四档与声明**：1180/1240/1440/1600 的 document `scrollWidth-clientWidth` 均 0，chat↔右栏间隙均精确 8px。免责声明在 1180/1240/1440 为 `white-space:normal`、实高 36.78px（约两行），1600 为 `nowrap`、实高 19.39px；feedback 链接四档均 `nowrap`。场景「更多」popover 在 1180 的盒为 x=142..274、y=651.2..723.2，完整位于 chat；model-config popover 为 x=239..519、y=485.7..775.2，也未被裁切。

**消息与设置**：用户消息右沿与对话流误差 ≤5px，实宽比 0.7664（≤78%）、浅中性底 `rgb(233,238,244)`、border 0；agent bubble 类计数 0。设置页 1180 水平/垂直居中、`scrollWidth-clientWidth=0`，Esc 与关闭按钮均可卸载 dialog。

### 三、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| **F-1** | **阴影契约冲突**：当时的 UI 架构裁决仍写 L1「零投影（de-slop #6 不破）」；当时的设计原则写「阴影全站归零（含弹层）」且 `shadow.none=none`。验收工单第 3 条又明确要求 SurfaceCard 解析值必须仍为 none。实现却把 `elevation.shadow` 改为 `0 1px 2px rgba(...), 0 8px 24px rgba(...)`，CSS `--elevation-shadow` 同值；浏览器 computed 的 SurfaceCard 与 composer 均为两层非零 box-shadow。`workbench` 的“零投影”旧例只查 `.case-card`，因此 107 全绿未覆盖 L1 偷渡。 | 🔴 **契约级阻断**；用户上一轮要求轻影接口与既有宪法冲突，验收者无权自行选择新旧口径 | **[需架构拍板]**：若维持当时的零投影规则，`elevation.shadow` 必须回 `none` 且增加 SurfaceCard/composer computed 断言；若采纳轻影，须按修宪程序同步设计契约与验收标准后再验。验收不代改契约。 |
| **F-2** | **composer 仍越 chat 并与右栏重叠**。内部 overflow 被 `document scrollWidth=0` 掩盖：1180 chat 右=524.45、右栏左=532.45，但 composer 右=562、send 右=553（与右栏重叠 20.55px）；1240 chat 右=591.5、右栏左=599.5，但 composer 右=662、send 右=653、provider 右=619（分别与右栏重叠 62.5/53.5/19.5px）；1440 send 右=753 > chat 右=749.58（侵入 8px gap 3.42px）；仅 1600 全含。现有 `rp25.spec` 只测 document overflow + chat/right gap，未测 composer 控件相对 chat 的边界，故假绿。 | 🔴 明确实现级视觉阻断，正中工单「composer/send/provider 右边界不越 chat」 | 实现会话修 composer 宽度/min-width/containment，并加四档 send/provider/composer `right <= chat.right` 与 `composer.right <= chat.right` 断言；修后隔离复验。 |
| **F-3** | **artifact 自动打开 Preview 未形成真实机制**。`session.artifacts` effect 只调用 `applyArtifactAutoExpand` 更新 `moduleOpen`，从不 `setPreviewOpen(true)`；Preview 仅因默认 true、选场景/切视图等显式动作而打开。旧名为“artifact 自动展开”的 e2e 只断 `module-progress[data-open=true]` 后主动点击 revision，无法证明 artifact 驱动宿主。手动关闭保持成立，但“artifact 自动打开 + 手动关闭优先”没有可区分的 auto/manual override 状态。 | 🟡 明列结构行为未落实、测试存在命名大于断言 | 增 Preview auto-open 策略与用户 override（新 artifact 仅在未手动关闭时打开），用受控 artifact 事件分别锁自动打开与手动关闭优先。 |
| **F-4** | 完工自述称已锁“composer popover 裁切”，但提交内无任何 e2e 打开 `model-config-popover` 并断边界；本验收手动探针证明当前 1180 实现未裁切，但回归门未锁。dock 进度权威位则由 `rp1.spec` 的 `progress-module-count=0/6` 实际锁住。 | 🟡 工单第 6 条的测试交付缺一条 | 增 model-config popover 在窄档完整落于 chat/viewport 的 bounding 断言，不以本次手动探针代替长期门禁。 |

### 四、git 卫生

`850d956` 恰 22 文件：仅 `apps/desktop/*` 与 `docs/design/tokens.json`；**未触 `packages/*`、`src-tauri/*` 或凭证 Rust/TS**，无 lockfile 改动。负测与浏览器探针均已删除/反向补丁归零，报告追加前 worktree 干净。主树两项既存脏文件始终未触。

### 五、结论

1. **RP-2.5 放行？→ 不放行 ❌**。全局机器门虽然全绿（build / Vitest 70 / Playwright 107 / floor 107 / 五静态门），但存在两项 🔴：F-1 阴影违反当前权威契约且需架构拍板；F-2 composer 在 1180/1240 与右栏实质重叠、1440 侵入 gap。另有 F-3 artifact 自动开宿主机制缺失、F-4 popover 回归断言缺失。
2. **0.1.1 可出？→ 不可出 ⛔**。先完成 F-1 架构裁决并按裁决收敛；修 F-2；补 F-3/F-4 自动化后，由独立验收复跑 `pnpm -r build`、70+ Vitest、floor≥107 Playwright、守卫负测与四档浏览器边界，方可触发 BUILD-1 工序复用。

> **总判定：RP-2.5 阻断，不放行；0.1.1 不可出。** 107/107 并非充分证据：现有四档用例只锁全局 scrollWidth，遗漏了内部 composer 越界；现有 de-slop 只锁 case-card，遗漏 SurfaceCard 非零投影。验收实测已分别证实这两处红线。阴影属于契约冲突，标 `[需架构拍板]`，验收不擅改；其余交回实现会话修复后复验。

---

## RP-2.5.1 单点复验（几何 / Artifact→Preview / 阴影白名单，2026-07-11）

- **角色与范围**：独立验收会话；实现提交 `e1ae88e`（三项缺陷修复）+ `e84c9f8`（批准阴影落 token），架构拍板 `1df436e`。严格只复验 当时的架构工单册 指定三点，不重跑已绿的 110 例全量。
- **隔离**：新建 `/private/tmp/courtwork-rp251-spot`、分支 `codex/accept-rp251` 固定 `e84c9f8`；未在共享主树 checkout/stash。E2E 前查 `lsof -nP -iTCP:1428 -sTCP:LISTEN` 为空，使用 `COURTWORK_E2E_PORT=1428` 且 Playwright `reuseExistingServer:false` 自起服务。首次因干净 worktree 尚无 workspace `dist` 而无法解析 reading-view/tools；执行真实 `pnpm -r build`（9/9 workspace 全绿）后重跑，未借用主树产物或服务。

### 一、三点定向证据

| 复验点 | 实测证据 | 结论 |
|---|---|---|
| 四档 bounding-box 几何 | 隔离 `:1428` 定向运行 `rp25.spec.ts` 四档用例：1180 / 1240 / 1440 / 1600 全过。独立浏览器探针实值：四档 chat→右栏 gap 均 **8px**；`chatRight / composerRight / sendRight / providerRight` 分别为 `524.453 / 515.453 / 506.453 / 472.453`、`591.5 / 582.5 / 573.5 / 539.5`、`749.578 / 740.578 / 731.578 / 697.578`、`816.547 / 808.438 / 799.438 / 765.438`。三控件右缘逐档均小于 chat 右缘，旧 scrollWidth 假绿口已由坐标学锁死。 | ✅ |
| `artifact_produced` 真开 Preview + 手动关闭优先 | 定向两例均绿：关闭旧 Preview 后切至新 S1，`data-artifact-revision` 真实变化、Preview 自动出现且 Timeline 为选中 renderer；同案件同 S1 手动关闭后再次回放，revision 仍变化但 Preview 不重开、Utility 恢复 base。与旧 `moduleOpen` 假证明可区分。 | ✅ |
| 阴影 token / 白名单 / L0 零影 | `pnpm --filter @courtwork/desktop lint:elevation` 输出 `Elevation shadow boundary: OK`。源码 token 与 CSS 均精确为 `0 1px 2px rgba(10,37,64,0.045), 0 4px 12px rgba(10,37,64,0.035)`；组件 TS/TSX 无 shadow 字面量，CSS 非零消费选择器唯一为 `.case-rail.surface-float, .right-rail-collapsed.surface-float, .surface-card-raised`。浏览器 computed 复核：CaseRail、Utility dock、三张 Utility base 卡、PreviewHost、右收敛 bar 均呈批准双层藏青影；chat、composer、artifact、model-config popover、settings 均为 `none`。 | ✅ |

定向 Playwright 总计 **6/6 passed（4.4s）**：四档几何 4 例 + Artifact 行为 2 例。未把 model-config 例重复纳入本次三点单测范围；其长期回归已存在于 `rp25.spec.ts` 且全量 110 由实现前置跑绿。

### 二、视觉与卫生

- 对照 `visual-audit/34-rp25-1-shadow-none-1440.png` 与 `36-rp25-1-shadow-approved-1440.png`：批准影在两侧 L1 边缘提供极轻分层，L0 chat、composer 与数据承重区保持平面；未出现黑灰脏边或廉价悬浮感，符合「存在感而非立体感」。
- 验收未修改实现、凭证 Rust/TS 或 `packages/*`。独立 worktree 在追加本节前干净；最终只提交 `apps/desktop/ACCEPTANCE.md` 本节。

### 三、结论

1. **RP-2.5.1 单点复验：通过 ✅**。三项指定证据全部成立，无新增发现、无 🔴/🟡。
2. **0.1.1：放行出包 ✅**。RP-2.5 原阻断的几何重叠、Artifact→Preview 行为与阴影契约/白名单均已闭环；可进入既定 BUILD-1 工序复用。

> **总判定：RP-2.5.1 放行，0.1.1 可出。** 隔离 `:1428` 下四档坐标边界与 8px gap 真断言、Artifact 自动打开与手动关闭优先、批准阴影精确 token + 消费白名单 + L0 computed 零影全部实测通过；全仓构建亦绿，验收仅追加报告。

---

## RP-2.10 验收（三卡一纸 + 品牌 icon 推理动画，2026-07-11）

- **角色与范围**：独立验收会话 sol；实现者 Opus 4.8；固定审查提交 `24c61bd` 的 20 文件。权威逐条对照当时的 UI 架构裁决与架构工单册中的 RP-2.10、#26.2/#26.3 收账裁决；未改 schema、跨层接口或 QF-1 队列语义。
- **隔离**：从 `24c61bd` 新建 `/private/tmp/courtwork-rp210-acceptance`、分支 `codex/accept-rp210`，未在共享主树 checkout/stash。Playwright 配置实核 `reuseExistingServer:false`；全量两轮分别先查空闲端口后自起 `:1431` / `:1432`，定向五连跑使用 `:1433`，目视探针使用 `:1434`。首次 `pnpm install --frozen-lockfile` 虽回报 up to date 却未生成 `node_modules`，首个 build 因 `tsc ENOENT` 未进入编译；以 `pnpm install --frozen-lockfile --force` 重建 1220 个依赖链接后，从 build 重新计次。

### 一、全局门与稳定性

| 门禁 | 原始实跑结果 | 结论 |
|---|---|---|
| 全仓 build | `pnpm -r build`：9/9 workspace 完成；desktop `tsc -b && vite build` 完成（3433 modules） | ✅ |
| desktop Vitest | 17 files passed；**79/79 passed**（699ms） | ✅ |
| 全门禁 + Playwright 第一轮 | `:1431`：motion/signature/graph/icons 20/preview/elevation/RP-2.6/2.7/thinking/2.8/2.9/2.9.1/2.10 全绿；**145 passed / 146**（1.2m） | ✅（仅登记基线红） |
| 全门禁 + Playwright 第二轮 | `:1432`：同一整链门禁再绿；**145 passed / 146**（1.2m） | ✅（仅登记基线红） |
| 唯一失败 | 两轮均仅 `tests/e2e/composer.spec.ts:56`：发送后 `queued-message` 不存在；与 当时的架构工单册 QF-1 登记证据逐字相符，本单不计 | 留置 QF-1 |
| `rp25:60` 竞态修复 | `:1433 --repeat-each=5 --workers=1`：**5/5 passed**（7.6s）；两轮全量中也各过一次 | ✅ |
| 假绿 floor | 按收账裁决仅改 `assert-test-count.mjs` 一行 `143 → 146`；实跑输出 `146 条用例（下限 146）`，提交 `db9c271` | ✅ |

### 二、ch12 契约与视觉实测

| 验收点 | 实测证据 | 结论 |
|---|---|---|
| 至多三卡 / 两态右列 | `rp210.spec.ts` 两轮均绿；Preview 态 `right-module-stack .surface-card = 1` 且唯一为 `preview-host`，dock 透明坐 L0；关闭 Preview 后右列 surface card **0**，`data-mode=base` 且 `preview-open` 可重开。折叠钮 DOM 位于 `right-rail-chrome`、不在卡内，bounding-box 横向居中误差 <28px。 | ✅ |
| dock 带与留空 | 真机 1440×900 新截帧显示三 tap 横带直接落底纸，折叠钮独居其上留空；chat 两侧 computed padding 为 **12px 16px**，正文、turn 行与 composer 均未贴栏边。 | ✅ |
| composer / user message | `.composer-box` computed 为 1px `border-strong`（`rgb(213,219,226)`）、`box-shadow:none`、白底，文本与沉底按钮同住该有界容器；user message computed `border-width:0`、无影、微深藏青混合底；编辑态描边语义未被常态占用。 | ✅ |
| chat 卡片清算 | 两轮实测 gate/question 为白底 1px 轻卡；event/artifact/file 为 `border-radius:0` + transparent 扁平行。active 文本只消费灰阶 `breathe`，`session.confirmation` settle 后切 success，不永久闪烁。 | ✅ |
| 品牌锚位形 | turn 截图与 bounding-box 均显示 `brand-mark` 位于 assistant message actions 之后、turn 尾左下；静默态仅留无框 icon，点击可展开/收回思考摘要。SVG 恰四 path：藏青竖线 + 三横杠；无 spark-lines 替身。 | ✅ |
| 四项动效纪律 | `:1434` 真机逐帧采样：t0 竖线 opacity 1 / animation none，三横杠待写；t420ms 第一横完成、第二横书写中、第三横未开始，证明逐写；正文到达后 React 状态直接换 settled，path `transition:none`。Preview 数据卡与法理之线 computed 均 `animation:none`；motion 门仅准 transform/opacity/background/border。 | ✅ |

### 三、门禁反例与 git 卫生

1. **RP-2.10 boundaries 反例**：临时把 composer `border-strong` 降为普通 `border`，`lint:rp210` 立即 exit 1，明确报“composer 外框须略重”；反向补丁后复跑 `RP-2.10 ... boundaries: OK`。
2. **icons 20 反例**：临时把期望数 20 改为 21，`lint:icons` 立即 exit 1，明确报“实际 20”；反向补丁后复跑 `20 个具名 SVG（18 概念）` 通过。
3. 两项反例均只存在于隔离 worktree 且已反向补丁归零；未触 credentials、`src-tauri/*`、`packages/*` 或任何契约文件。验收实现级顺手项仅 floor 一行，独立提交前逐项检查 cached name；本节为 `apps/desktop/ACCEPTANCE.md` 纯追加。

### 四、主观视觉判断与结论

**视觉已达到 ch12“壳层视觉终章”的意图。** 1440px 全景里左栏是一张贯通锚卡，chat 回到底纸，composer 成为唯一中栏有界浮面，右侧只由 schema 承重；dock 与折叠钮退到底纸后，三层主从第一次不再互相争抢。gate/question 的轻卡仍可被一眼识别为“需要人回应”，但其描边和体量没有与 schema 卡争级；event/artifact/file 降为账本行后，turn 尾品牌锚成为安静的句号。base 态右栏大片留白不是缺内容，而是清楚表达“工作面已收起”；16px 留空与 composer 强边界把这种克制撑住。品牌横杠逐写短促、静默后只留卷宗形锚，识别度与反馈同体，没有借用法理之线，也没有把数据区带动。

1. **RP-2.10：放行 ✅**。20 文件范围内未发现新增实现级或契约级缺陷；ch12、#26.2/#26.3、chat 清算、composer 凡例与 `rp25:60` 修复均获机器 + 真机双证据。
2. **下游：可放行 QF-1 清账 ✅**。两轮唯一红均为已登记 `composer:56` 队列语义基线，本验收不越权修改、不把它计作 RP-2.10 失败；QF-1 仍须按独立工单修复并重新跑全门。

> **总判定：RP-2.10 放行；视觉达到 ch12 终章意图。** 两轮独立端口全量稳定为 145/146，唯一红严格等于登记 QF-1；Vitest 79/79、build 9/9、两项门禁反例、`rp25:60` 五连跑、floor 146 与实机逐帧/几何证据全部闭环。


---

## PRV-1 验收（provider 自配最小闭环·安全敏感件·主张逐条证伪，2026-07-11）

- **角色**：独立验收会话（Opus 4.8，AGENTS.md 全判例；安全敏感，逐条证伪、不采信自述）。实现者 sol。实现与验收分离。
- **范围**：`6fb92b9`（core：provider 推理路由声明）+ `193fa7e`（desktop：provider 自配闭环）。**权威**：当时的架构工单册 PRV-1 单 + FIX-KC-1 节（凭证语义基线）+ **docs/decisions/ADR-005-data-security.md 红线**「key 永不进事件流/日志/遥测」+「不做静默扫描本地第三方配置」。
- **隔离（复核历史提交判例 + 端口隔离判例）**：范围 tip `193fa7e` 落后当前 HEAD `24c61bd`（RP-2.10）两提交，据 AGENTS.md「复核历史提交一律用独立 worktree」建 detached worktree `/private/tmp/courtwork-prv1-accept@193fa7e`，未在共享主树 checkout/stash；`pnpm install --frozen-lockfile` 干净装。Playwright 起跑前 `lsof :1420/:1421` 均空，用 `COURTWORK_E2E_PORT=1421`、config 本身 `reuseExistingServer:false` 自起服务。集成态交叉核在主树 HEAD `24c61bd`（隔离 `:1422`）。

### 一、全局门（worktree@193fa7e 干净环境，退出码单查）

| 门 | 实测结果 | 码 |
|---|---|---|
| 9 包 build | `pnpm -r build`：`Scope: 9 of 10`（第 10 = 无 build 的根）全 `Done`，desktop `tsc -b && vite build` ✓ | `BUILD=0` |
| Vitest core | **158/158**（22 files） | `VITEST_CORE=0` |
| Vitest desktop | **79/79**（17 files） | `VITEST_DESKTOP=0` |
| cargo test | **10/10 逐名全过**（status_payload_contains_no_secret_field / mock_endpoint_discovers_models_then_runs_real_one_token_smoke / failed_payload_carries_user_facing_message_and_fail_kind / classify_os_status_maps_known_codes / parse_os_status_from_display_and_debug_text / wire_names_and_messages_are_zero_tech / trace_line_never_embeds_secret_fields_or_values / trace_disabled_by_default / dev_service_suffix_matches_build_profile / classify_keyring_no_entry） | `CARGO=0` |
| rustfmt（顺手，非阻断） | 装 `rustup component add rustfmt`；`cargo fmt --check` **报格式偏差**（lib.rs 若干处紧凑 match 臂/长数组/多行签名非 rustfmt 规范）——工单明示「失败不阻断但记录」，记录见五节 P-3 | `FMT=1`（非阻断） |
| Playwright @193fa7e | **139 passed / 141 total（隔离 :1421）**，两红 icons:3 + composer:56 → 二节归因（均非 provider） | `PW=1` |
| floor 门 | `assert-test-count.mjs`（minimum=143）@193fa7e **实抛红**：`Playwright 用例不足：发现 141，至少需要 143`（exit 1）→ 二节归因 | `1` |
| 门禁反例可触红 | `assert-elevation-shadow.mjs`：绿→注入 untracked `src/__redtrip__.tsx`（含 `boxShadow` 字面量）→**红 exit1**（`component contains shadow literal`）→删档→复绿，worktree 归零。门禁非空断言实证 | 复绿 0 |

### 二、Playwright 门归因（关键：`143/143 + floor 143` 不在 193fa7e tip 独立成立，系并行线前引用）

**事实（实跑，不采信自述）**：worktree@193fa7e `--list` = **141**；`assert-test-count.mjs`（floor 143）**实抛** `发现 141，至少需要 143`。全量跑 **139/141**，两红：

1. **`icons.spec.ts:3`（确定性，非 provider）**：`git show 193fa7e -- icons.spec.ts` 实证 PRV-1 把断言 `toHaveCount(19)`→`(20)`；但第 20 个图标 **brand-mark 由下一提交 RP-2.10（24c61bd）交付**——`git diff --stat 193fa7e 24c61bd` 实证 RP-2.10 新增 `src/icons/custom/brand-mark.svg`+`custom-icons.generated.ts`(+33)+`manifest.json`(+1)。故 193fa7e 只渲染 **19**（失败日志 `resolved to 19 elements`），期望 20 → 确定性红。**集成态 HEAD 实测 icons:3 绿**（20 齐）。
2. **`composer.spec.ts:56`（并行 flake，非 provider）**：193fa7e **单跑 composer.spec 5/5 全绿**（隔离 :1421）；仅全量并行下 flake 红——PRV-1 diff 注释自陈「回放进度到达后发送才进入 queued 分支；全量并行下不能只等静态 event-stream 壳」，QF-1 登记为在案基线。集成态 HEAD 单跑亦绿。
3. **计数缺口**：193fa7e=141 < floor 143。PRV-1 把 floor 禁降 137→143，但第 142–146 例由 **RP-2.10 的 `rp210.spec.ts`（+95 行 ≈ +5 例，141→146）** 补齐。

**集成态交叉核（主树 HEAD `24c61bd`，隔离 `:1422`）**：`--list` = **146 ≥ floor 143** ✓；`prv1.spec` **4/4 绿**、`icons:3` 绿；全量并行 flake 3 例（`composer:56` / `rp210:6` / `ux1:81`——均 paced-replay/品牌动画时序，属视觉/UX 线，非 PRV-1）。`prv1.spec` 四例（预设自动填 URL·custom 露 Base URL / 真冒烟标 connected+发现模型 / 诚实降级不阻塞 / 失败按分型不误报 connected）在两态均全绿。

**定性**：provider 闭环自身测试全绿；`143/143 + floor 143` **仅在集成树（HEAD）成立，193fa7e tip 独立不成立**——系 PRV-1（功能线）与 RP-2.10（视觉线）**并行、错峰提交**（当时的架构工单册 明列）且 PRV-1 前引用了 RP-2.10 的 icon#20 与 floor 值所致。**提交卫生问题（193fa7e 非独立门绿），非 provider 逻辑缺陷**；HEAD 已闭环。记 🟡 P-1。

### 三、安全主张逐条证伪

**1. WebView 无明文读取 ✅**：枚举 IPC 面——`invoke_handler`（lib.rs:833-838）恰注册 **4 command**：`provider_credential_status` / `save_provider_credential` / `clear_provider_credential` / `validate_provider_connection`。逐个读返回型：仅 `CredentialStatus`（序列化字段 phase/source/failureMessage/failKind，结构注释 lib.rs:408「永不含 secret」）与 `ProviderProbeStatus`（+ models/model_discovery）——**无 secret 字段**；单测 `status_payload_contains_no_secret_field` 断言精确 JSON `{"phase":"connected","source":"pasted"}`。持 secret 的 `get_password`(436) / `active_secret`(592) 是**私有 Rust fn（非 #[command]），JS 不可达**。key 仅**入**（`save_provider_credential` 的 `value: String` 参，用户粘贴）不**出**。冒烟请求 `bearer_auth(&secret)`（lib.rs:656/678）**全 Rust 侧组装**；JS 只经 `buildProbeInput` 传 base_url/model/reasoning_body，只收 phase/failKind/models（connection-client.ts:8-12,36-44）。

**2. connected 唯冒烟成功论 ✅（D-1 残留证伪）**：状态机读透——App.tsx `credentialStatus` 唯一写入者 `probeCredentials`(240-245) 走 `providerConnectionClient.validate()`（smoke），**非** `credentialClient.status()`（keychain）。`validate`(connection-client.ts:65-85) 以 keychain-connected 为**前置门**（68 早返回非 connected），Tauri 下必 `invoke('validate_provider_connection')`(80) 真冒烟；Rust `probe_provider_endpoint` **唯 `smoke.is_success()` 才 `phase:"connected"`**（lib.rs:680）。三处 `setCredentialStatus`（156 pending 初值 / 243 smoke 结果 / 1245 `onStatusChange`）——ProviderSetup 的 `save` 结果 `onStatusChange` 只在 `stored.phase!=='connected'` 分支触发（ProviderSetup.tsx:36-37），connected 恒来自 smoke `result`（42）。**无「钥匙串读到即 connected」残留**。冷启动零探针（懒探针 RP-2.9，无 mount 时 probe，初值 pending）。**模型发现失败不影响 connected**：probe 中 /models 非 401/403 失败仅置 discovery=unsupported、models=None，冒烟照跑（lib.rs:657-670）。UI 安全声明明写「连接状态只以真实请求成功为准，读取到钥匙串不代表服务可用」（ProviderSetup.tsx:86）。`prv1.spec`「真实请求失败按分型呈现且不得误报 connected」实测（failKind=endpoint → composer-provider `data-phase=failed`）。

**3. key 不进日志 ✅（码 + 实测双证）**：trace builder `build_trace_line`(224) + `key_looks_sensitive`(246) 防御式丢弃敏感键（secret/password/value/key/apiKey/token）；逐个 trace 调用点（`trace_op`/`trace_event`/`trace_status_exit`/`trace_startup_once`）**仅收 account 常量（`provider-secret`/`active-source`，非值）、service、ok、枚举、签名元数据——secret/value/env 名零写入路径**。冒烟路径唯一 trace 是 keychain `get`（记 account 名非值）；`probe_provider_endpoint` 本身零 trace 调用。**实测**：`COURTWORK_CRED_TRACE=1 cargo test -- --nocapture` 一轮（含 mock 冒烟 secret `never-log-this-secret` + 单测注入 `sk-leaked`/`hunter2`/`should-not-appear`）→ 全输出中该等 secret **0 次**、无 `Authorization`/`Bearer` 值；单测 `trace_line_never_embeds_secret_fields_or_values` 真断言（注入敏感键整个被丢弃）。docs/decisions/ADR-005-data-security.md 红线守住。（真机日志文件 `~/Library/Logs/cn.courtwork.desktop/credential-probe.log` 的 grep = 用户真 key 首跑闭环，见七节；FIX-KC-1 已 runtime 注入实测在案。）

**4. 分型全覆盖 + UI 零技术 ✅**：Rust `classify_http_failure`(637-645) **穷举 match**——401/403→`auth_failed`、404→`endpoint`、429→`rate_limited`、400/422→`model`、else→`invalid_response`；`probe_provider_endpoint` `is_timeout()`→`timeout`、`Err(_)`→`network`。**鉴权/限流/端点/模型/超时/网络六型齐**（+ invalid_response/platform 兜底）。文案全零技术（无 HTTP 码/ACL/OSStatus/keyring/bearer，grep 实证 Rust `user_message` 与 TS `PROVIDER_CONNECTION_MESSAGES`/`FAIL_KIND_MESSAGES`）。**自动 mock/hook 驱动覆盖**：成功（Rust mock TCP 端点 + TS + e2e 三层）、`endpoint`（`prv1.spec` + `connection-client.test`）、`auth_failed`（`d1-case-scope.spec:40` + `settings.spec:118`）——共 3 型 + 成功端到端驱动；余 rate_limited/model/timeout/network 由穷举 match + 文案表覆盖（非各自 mock 端点单驱），列覆盖注记（五节 P-4），非缺陷。

**5. quirk 声明化铁证 ✅**：`ReasoningRoute` = 判别联合 `model_switch | request_field`（quirk-profile.ts:3-5）；`resolveReasoningRoute`(40-47) **switch 于 `route.kind`、非 providerId**（注释「调用方只解释 kind，不按 providerId 分支」）。grep 全域（apps/desktop/src + packages/core/src）**零** `if(providerId==)`/`switch(providerId)` 类路由分支——唯 `.find(item=>item.id===config.providerId)` 数据表查 + `providerId==='custom'` 露 Base URL 的 UI 开关；Rust 侧 `let _provider_id`（lib.rs:692）显式弃用、仅诊断标识，路由由声明生成的 `reasoning_body` 驱动。**三家逐条对 PRV-1 单**：DeepSeek=`model_switch`（standard `deepseek-v4-flash`/deep `deepseek-v4-pro`）、Qwen=`request_field enable_thinking`（false/true）、豆包/custom=`request_field reasoning_effort`（low/high）——与单一致。单测 `quirk-profile.test`「without a provider branch」+ `model-config.test`「reasoning request delegates to the declared quirk route」三路由实证。

**6. 降级诚实 ✅**：/models 不支持（非 401/403 失败/空/畸形）→ `discovery=unsupported`、models=None，**冒烟照跑**，成功即 connected（不阻塞）。空列表 `.filter(|items| !items.is_empty())`→None；畸形 `response.json().await.ok()`→None（lib.rs:664-667）**不崩**。`modelOptions` 合并 discovered+预设+当前 modelId（model-config.ts:154-157）——发现失败仍有预设+手输。UI：ProviderSetup 于 `modelDiscovery==='unsupported'` 提示「服务商未提供模型列表；已保留推荐模型与手动填写，不影响连接」(ProviderSetup.tsx:51-52)。单测 `connection-client.test`「honestly degrades discovery while keeping a successful smoke connected」+ `prv1.spec`「模型发现不支持时诚实降级但不阻塞连接」实测。

**7. 真实网络路径不在本验收（无 key）**：见七节结论闭环标注。

### 四、git 卫生

`6fb92b9` = `packages/core/src/provider/*` 9 文件（quirk-profile + openai-compatible-provider + structured-output + http-client + 各单测 + SPEC/package.json）；`193fa7e` = `apps/desktop` 26 文件（src-tauri/lib.rs +149、connection-client.ts 新、model-config.ts、ProviderSetup.tsx、SettingsPage.tsx、prv1.spec.ts 新、assert-test-count.mjs floor 等）。均**未触** demo-data/其它 src 包越界或 lockfile 语义外改动。验收全程隔离 worktree + 主树 HEAD 只读跑，**主树零改动**（他会话脏 docs/AGENTS.md/eval 未动）；反例 `src/__redtrip__.tsx` 已删、worktree `git status` 归零。本报告仅追加 `apps/desktop/ACCEPTANCE.md` 本节。

### 五、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| **P-1** | **`193fa7e` tip 非独立门绿**：`--list`=141 < floor 143（assert-test-count 实抛红）；`icons.spec:3` 前引用 RP-2.10 的 icon#20（19→20）在 193fa7e 确定性红。 | 🟡 提交卫生（并行线前引用 icon/floor，非 provider 缺陷） | 集成态 HEAD（24c61bd）已闭环（floor 146≥143、icons 绿）。记录供架构判并行线错峰提交口径；本单不代改（回退 19 会碾坏 HEAD）。**不阻 provider 放行。** |
| **P-2** | 套件全量并行 flake：`composer:56`（单跑绿）/ `rp210:6` / `ux1:81`——均 paced-replay/品牌动画时序敏感。 | 🟡 非 PRV-1（视觉/UX 线；`composer:56` 由 QF-1 在跟） | 记录。非本单范围；provider 四例（prv1.spec）两态全稳。 |
| **P-3** | `cargo fmt --check` 报 lib.rs 多处格式偏差（紧凑 match 臂/长数组/多行签名）。 | 🟢 非阻断（工单明示「失败不阻断但记录」） | 建议实现会话 `cargo fmt` 一遍归一；不影响功能/安全。 |
| **P-4** | 六型分型仅 3 型（成功/endpoint/auth_failed）端到端 mock/hook 单驱；rate_limited/model/timeout/network 由穷举 match+文案表覆盖，无各自 mock 端点单测。 | 🟢 覆盖注记（映射与文案代码级完备，穷举 match 低风险） | 建议补四型 mock 端点/hook 驱动固化为长期回归。不阻放行。 |

**无 🔴；无安全红线破口**（无明文返回通道 + connected 唯冒烟 + key 不入日志码+实测双证 + 六型齐零技术 + quirk 数据表零分支 + 降级诚实不崩）。

### 六、真实网络路径（无 key）说明

本验收无真实 provider key，故**未跑真实网络冒烟**（工单第 7 条明示「真实网络路径不在本验收」）。已证：冒烟请求组装、鉴权头、分型、connected 判定、降级、日志脱敏全部**代码 + mock/单测层实证**；真实往返（含真机日志文件 grep 无 key）留待用户产品内『验证连接』真 key 首跑——此为 provider 闭环**最终闭环**，承 FIX-KC-1 已在案的 runtime trace 注入实测。

### 七、结论（两问）

1. **PRV-1 放行？→ 放行 provider 闭环 ✅（附 🟡 提交卫生记录）**。安全七主张逐条证伪全立（WebView 无明文通道 / connected 唯冒烟成功 / key 不入日志码+实测 / 六型齐且 UI 零技术 / quirk 数据表零 `if(provider==)` 分支 / 降级诚实不崩）；provider 自身测试全绿（build 9/10、Vitest core 158 + desktop 79、cargo 10、`prv1.spec` 4/4）。两 Playwright 红**均非 provider 缺陷**：`icons:3` = 前引用 RP-2.10 icon#20（HEAD 绿）、`composer:56` = 并行 flake（单跑绿）。**唯 `193fa7e` tip 非独立门绿**（floor 141<143 + icon 前引用）记 🟡 P-1——系 PRV-1/RP-2.10 并行错峰提交后果，**集成态 HEAD `24c61bd` 已闭环**（`--list` 146≥floor 143、icons 绿、prv1.spec 4/4）；「Playwright 143/143 + floor 143」在集成树成立。
2. **「验证连接」按钮可直接交用户执行真 key 首跑？→ 可 ✅**。按钮全路径实现正确：Tauri 下 `验证连接`→`validate`→`invoke('validate_provider_connection')`→`probe_provider_endpoint` 真冒烟；bearer 头 Rust 侧组装无 key 外泄；`connected` 唯 `smoke.is_success()`；失败走 F4 六型零技术文案；/models 降级诚实不阻塞。真实网络往返本验收无 key 未跑——**用户产品内『验证连接』真 key 首跑 = provider 闭环最终闭环**（真机日志无 key 承 FIX-KC-1 runtime 实测在案）。

> **总判定：PRV-1 放行 provider 闭环 ✅（安全敏感·逐条证伪·隔离验证）。** 安全七主张全立（无明文返回通道、connected 唯冒烟、key 不入日志码+trace 实测双证、六型齐零技术、quirk 判别联合数据表零分支、降级诚实不崩）；隔离 worktree@193fa7e 全 provider 门绿（9/10 build、Vitest 158+79、cargo 10 逐名、prv1.spec 4/4）；门禁反例 elevation-shadow 触红即撤复绿实证非空。两 Playwright 红经四轮实跑（193fa7e 全量/193fa7e 单跑/HEAD 双 spec/HEAD 全量）归因确定：`icons:3`=RP-2.10 icon#20 前引用（HEAD 绿）、`composer:56`=全量并行 flake（单跑 5/5 绿），**均非 provider 逻辑缺陷**。唯 🟡 P-1：`193fa7e` tip 因并行线前引用 icon/floor 而非独立门绿，集成态 HEAD `24c61bd`（146≥143、icons 绿）已闭环——记录供架构判错峰提交口径，不阻 provider 放行。P-3 rustfmt 偏差 / P-4 分型 3/6 端到端单驱为 🟢 记录建议。「验证连接」按钮可直接交用户执行真 key 首跑（最终闭环）。


---

## 0.1.1 合流终验（Ship Gate Phase 3 · 放行 BUILD 的唯一钥匙，2026-07-12）

- **角色**：独立终验会话（Grok 4.5；AGENTS.md 全判例：实跑 / 端口隔离 / 裸 HEAD 禁用 / 提交独立成立 / 合流即清账 / 禁宽 add）。**实现与验收分离**——本会话未参与 QF-2 / RP-2.11 / PRV-1 实现。
- **tip**：合流后 `main` @ **`3adb34d`**（`docs(design): 终验第 0 步——tokens 契约同步 controlHover/gap12`）。祖先核验：`79f72c4`（QF-2）+ `d563a1b`（RP-2.11）+ `674b21d`（QF-2 merge）+ `193fa7e`/`6fb92b9`（PRV-1）均为 `merge-base --is-ancestor` 真。
- **隔离**：独立 worktree `/private/tmp/courtwork-final-011` **detached @ 3adb34d**（主树 `main` 当时被 `/private/tmp/courtwork-qf1` 占用且含他会话大量暂存回退，**未**在共享树 checkout/stash；未触 qf1 索引）。`pnpm install --frozen-lockfile` 干净装。Playwright **`reuseExistingServer: false`** + 隔离端口 R1 `:1431` / R2 `:1432`；首屏主观截图另起 `:1435`。

### 第 0 步 · tokens ↔ CSS 契约对表（契约先行·必先）

| 契约键 | tokens.json | styles.css | 期望 | 结果 |
|---|---|---|---|---|
| `color.bg.controlHover` | `#E6EAF0` | `--control-hover: #e6eaf0` | `#E6EAF0` / `#e6eaf0` | ✅ |
| `elevation.floatInset` | `12` | `--elevation-float-inset: 12px` | `12` / `12px` | ✅ |
| `elevation.shellGap` | `12` | `--elevation-shell-gap: 12px` | `12` / `12px` | ✅ |

tip 已含 `3adb34d`，**无需**另落契约提交。不一致即 🔴——未触发。

### 一、全局门（全量实跑，退出码单查）

| 门 | 实测 | 码 |
|---|---|---|
| 9 包 `pnpm -r build` | `Scope: 9 of 10`（根无 build）全 `Done`；desktop `tsc -b && vite build` ✓ | `BUILD=0` |
| Vitest core | **158/158**（22 files） | `0` |
| Vitest desktop | **79/79**（17 files） | `0` |
| `cargo test` | **10/10 逐名全过**（status_payload_contains_no_secret_field / mock_endpoint_discovers_models_then_runs_real_one_token_smoke / failed_payload_carries_user_facing_message_and_fail_kind / classify_os_status_maps_known_codes / parse_os_status_from_display_and_debug_text / wire_names_and_messages_are_zero_tech / trace_line_never_embeds_secret_fields_or_values / trace_disabled_by_default / dev_service_suffix_matches_build_profile / classify_keyring_no_entry） | `0` |
| floor | `assert-test-count.mjs`：**152 ≥ 146** | `0` |
| Playwright R1 | **152/152** 隔离 `:1431`，**零红**（含 `composer:56` 合流后绿） | `0` |
| Playwright R2 | **152/152** 隔离 `:1432`，**零红** | `0` |
| 全部门禁基线 | motion / signature / graph / icons(20) / preview / elevation-shadow / rp26–rp211 / thinking-stream / floor — **15/15 exit 0** | `0` |

**原始日志路径（本机，非摘要）**：`/tmp/courtwork-final-build.log`、`/tmp/courtwork-final-vitest-core.log`、`/tmp/courtwork-final-vitest-desktop.log`、`/tmp/courtwork-final-cargo.log`、`/tmp/courtwork-final-pw-r1.log`、`/tmp/courtwork-final-pw-r2.log`。

### 二、门禁反例抽三（绿→红→撤→复绿）

| 反例 | 注入 | 触红信息 | 撤后 |
|---|---|---|---|
| shadow 白名单 | untracked `src/__redtrip_shadow__.tsx` 含 `boxShadow` 字面量 | exit 1：`component contains shadow literal` | 删档 → elevation OK |
| thinking 字符契约 | `ThinkingStream.tsx` 注入 `thinking-stream-glyph` | exit 1：`Character version must not use an SVG glyph` | 还原 → thinking OK |
| elevation 对 tokens | `styles.css` 将 `--elevation-shell-gap` 暂改为 `8px` | tokens 对表 `shellGap=12`≠`8px`；`assert-rp211` exit 1：`② 三栏间距须 8→12` | 还原 → rp211 OK |

worktree 反例后 `git status` **归零**（无脏吞）。

### 三、抽验矩阵

**① QF-2 四步切案 + 报告零编码 ✅**  
- e2e：`d1-case-scope`「案件 A 有 demo 状态 → 案件 B 零继承 → 回到 A 恢复 demo」含 QF-2 排队随 `caseId` 作用域（A 排队 → B 零 → 回 A 恢复）两轮绿。  
- `file-ops.spec`：报告断言「机器枚举/绝对路径/hash 留诊断层」+ `not.toContainText('/Users/')` 两轮绿。  
- 源：`CASE_SCOPE_AUDIT` queued 行；`FileOpsPlanPanel` 零编码暴露律注释与相对路径呈现。

**② RP-2.11 ①–⑧ + gap12 + 字符推理 ✅**  
- `rp211.spec` 五例全绿（段控真路由 / chat 内存态+存入 / ① 标题居顶栏 / ⑤ workmode 同源 / ⑥⑦ 20px+hover token / ⑧ 渐隐收敛）。  
- 门禁 `assert-rp211-contracts` + `assert-thinking-stream` 绿；gap12 即第 0 步 `floatInset`/`shellGap`=12。  
- **brand-mark 旧断言已迁移退役**：`rp210`/`ux1` 注释标明字符版改判；`ThinkingStream` 无 `BrandMarkIcon`/`thinking-stream-glyph` SVG 路径；icons 审计仍 20 具名 SVG（含 brand-mark 资产）但**推理锚不走 SVG 两套并存**。

**③ PRV-1 七主张摘要复核 ✅（合流态）**  
- 凭证 wire：`CredentialStatus` 序列化仅 phase/source/failureMessage/failKind，注释与单测 `status_payload_contains_no_secret_field` 仍立。  
- `prv1.spec` 4/4 两轮绿；cargo 10/10 含 trace 脱敏与 mock 冒烟。  
- **凭证语义零回退**（相对 PRV-1/FIX-KC-1 基线）：无 secret 出通道、connected 仍经冒烟路径、trace 默认关。

**④ ch12 三卡一纸不回归 ✅**  
- `rp210.spec`「三卡一纸：右列两态皆无 utility 卡，schema 唯一右卡」+ dock 坐底纸 / 折叠钮迁顶栏 两轮绿。  
- `assert-rp210-contracts` 绿。

**⑤ tokens↔CSS 契约 ✅**  
- 复证第 0 步三值对表全过。

**⑥ 首屏 1440 主观段**  
- 实截：`/tmp/courtwork-final-shots/03-work-1440.png`、`04-chat-1440.png`；仓内对照 `visual-audit/57-rp211-work-topchrome-1440.png`、`58-rp211-chat-canvas-1440.png`。  
- **观感**：Work 面三栏秩序清晰（左容器轨 / 中事件账本+composer / 右 schema 修订预览），法理之线与风险分级可读，字符推理锚（`| Thought process`）克制不抢戏，英/中分层不混；Chat 面轻画布+沉底五钮，顶栏标题居中、chrome 透明浮层不抢内容。  
- **判定：达投递演示标准 ✅**（可直接用于装包后对内/对外走查；真 key「验证连接」仍为用户闸最终闭环，不阻 BUILD）。

### 四、git 卫生

| 项 | 结果 |
|---|---|
| 收编祖先 `79f72c4` + `d563a1b` | ✅ 均为 main tip 祖先 |
| 凭证语义零回退 | ✅ 见第三节③ + cargo 脱敏单测 |
| 无脏吞 | ✅ 终验 worktree 始终 clean；反例注入均撤；**未** `git add -A` / 未碰 qf1 他会话暂存 |
| 本报告提交 | 纯追加 `apps/desktop/ACCEPTANCE.md`；提交时显式核对 `HEAD` → `refs/heads/main`（见提交记录） |

### 五、三问结论

1. **各线放行？**  
   - QF-2 ✅  
   - RP-2.11 ✅  
   - PRV-1（合流集成态）✅  
   - tokens 契约第 0 步 ✅  
2. **0.1.1 可 BUILD？→ ✅ 可放行 BUILD 0.1.1**（工序照 BUILD-1，版本号 0.1.1）。全局门 9 包 build / Vitest 158+79 / cargo 10 / Playwright **两轮 152/152 零已知红** / floor 152≥146 / 门禁反例可触红 / 祖先与凭证卫生齐。  
3. **首屏达标？→ ✅ 达投递演示标准**（见⑥主观段）。

> **总判定：0.1.1 合流终验放行 ✅ —— BUILD 钥匙签发。**  
> tip `3adb34d` 干净 worktree 全门实测：第 0 步 tokens 三值↔CSS 三变量对齐；9/9 build；Vitest desktop 79 + core 158；cargo 10/10；Playwright 隔离端口两轮 **152/152**（`composer:56` 合流消解后双轮绿）；15 门禁基线绿 + shadow/thinking/elevation 三反例触红即撤；抽验 QF-2 切案队列 + 报告零编码、RP-2.11 ①–⑧/gap12/字符推理（brand-mark 旧断言退役不并存）、PRV-1 七主张摘要、ch12 三卡一纸、首屏 1440 投递级观感均过。无 🔴。下游：**BUILD 0.1.1** → 用户闸（真 key「验证连接」+ 装包走查）。


---

## RELEASE-1 发版验收（2026-07-12，Fable @ Code · goal 模式——全量验收/debug/polish/push）

角色声明：发版级全量验收 + fix-by-acceptance（AGENTS.md 验收处置规则）；契约零改动，两处实现级缺陷顺手修（独立 commit `09d8b0b`）。

### 一、机器门全量（最终树双轮）

| 门 | 结果 |
|---|---|
| `pnpm -r build`（全仓真实 tsc） | ✅ 零错 |
| `pnpm test`（vitest 全仓） | ✅ 85 文件 / **734/734**（改动后复跑同绿） |
| `pnpm lint` | ✅ 零 error |
| 16 道门禁 + Playwright | ✅ **两轮 169/169** |
| floor | **167→169**（发版验收补测 +2，assert-test-count 禁降史续记） |
| `demo:s3` golden | ✅ PASS，预埋考点 **7/7**，事件序列与 W6 记录一致 |
| push 通道 | ✅ dry-run fast-forward |

### 二、浏览器真走查（dev 1420，全程 console 零错误）

待机主屏（品牌 icon/宋体 slogan/居中 composer/Ideas 行）→ 样板案直入 Preview 浏览器态 → 五视图逐 tab（时间线 47 件含 E08 矛盾行+B 级信源 peek / 图谱 14·15 dagre+关系依据 / 矩阵 10×7+「原文定位待接入」诚实句 / 修订预览高危拆出+民法典 C 级引用 / 起草画布+编译为 Word 钮）→ Gate 卡路由回修订预览 + question 轻卡 → 批量确认真按（阶段 0/6→4/6 联动）→ 大纲态四模块序（Progress 实时 4/6 / Preview 五条目 / Working folders 20 / Context 91%）→ 原件阅读汇流（同一 Preview；催告函/验收记录「待接入」三态诚实）。左栏「打开」走 systemOpen 属设计（Tauri 生效浏览器降级），非缺陷。

### 三、发现与处置

**实现级两缺陷（已修，各附"本应抓住它的测试"，`09d8b0b`）：**
1. 批量确认池不随处置递减——批后仍显"可批量 4 项"且钮可点（假报）；更重语义洞：先逐条驳回批内条目再批量，驳回被覆写回已确认（违"用户修正最高优先级事实"）。修：batchRefs 排除已处置条目；浏览器实证批后 0 项禁钮，e2e 断言驳回条目 data-tone 保持 neutral。
2. 阅读器三处——只读原件标题漏挂前视图「起草中」（话语层事故：原件只读是信任红线）；读态仍高亮工作面 tab；行内 `**强调**` 19 处字面星号漏出。修：meta=「原件 · 只读」、读态五 tab 零选中、行内 strong 渲染（实证 20 strong/0 星号）。

**契约审计（独立 subagent，只读）：违规零发现。** 依赖方向/装配点唯一性（core/src/composition/demo-assembly.ts 全仓唯一导入点实测）/provider 无关（quirk 单 DeepSeek 属既裁排期，通用工厂+custom 入口在）/留人确认（销毁级动词不存在，S3 修订仅 confirm 后产新文件不覆原件）/key 纪律（Rust 结构化脱敏，JS 全仓零 console.*）逐条通过。三项文档-实况漂移收账（`7a42a74`）。

**desktop 源码质量审计（独立 subagent）：在途未回。** 范围为 polish 级（死代码/孤儿样式/残留），非发版阻塞：技术词暴露与色板纪律已有机器门（AUDIT 正则/assert-neutral-source）双轮压过。回报后按需另行追加处置记录——不冒充已完成。

### 四、收束件

RM-1 定形版 README（`0c8a463`，命令全部当日实跑）；当时的架构工单册 镜像材料六件 + career-kit prompt + 当时的 UI 清单 验收册入库、数字对齐实测（`e5cd42f` 等）；根 test-results/ 入 .gitignore（`3241753`）。

### 五、结论

**发版放行 ✅**：build/unit/lint/16 门禁/e2e 双轮 169、demo 全动线真走查零 console 错误、演示无 key 自足、工作树清账、判例卫生（显式路径分批、零宽 add）。push 随本报告提交执行。

### 六、desktop 源码质量审计回报收账（RELEASE-1 追加，2026-07-12）

**通过项（独立 subagent 实测）**：console.log/debugger/TODO/FIXME 双侧（TS+Rust）零命中；组件零裸 hex，styles.css 色值 100% 收束 :root token 块；5 个 tauri command 调用链零 unwrap/expect（唯一生产 .expect 在启动引导，官方模板惯用）；转发白名单（探针公证 origin 四元精确匹配+禁 userinfo/query+固定子路径）与 CSP/capabilities 窄权限被点名为强项；package.json 脚本零断链；UtilityRail 退役零残留。

**[需架构拍板] 一项**：`provider/ModelConfigPopover.tsx:36` composer 模型 chip 弹层直露 "Provider" 标签与下拉——收敛令②（provider 撤入 developer 层，设置页已落 4030e45）与 #40 拍板（允许显式覆盖禁静默，chip 显实际生效模型为刻意设计、源码注释自证）在此并行入口交叉；弹层归属哪条规则待裁，验收不代判。

**慢火池清单（polish 级，非发版阻塞，全部留置待专单）**：①6 处零引用导出（StackModule 族/AttachmentStatusKind/DEMO_WORK_DRAFT_DIR/getDemoHostSnapshot/isConfigured@deprecated/recordingFor）；②9 个 capture-*.mjs 历史审计脚本未接线（visual:audit 之外）；③孤儿 CSS ~30 块——其中 utility-dock 族/generated-callout/chat-global-action 三族有 e2e 负测实锤已死，titlebar/statusbar 族因 rp1/rp2 断言方向未复核置信度降档，长尾未穷举；④icon-audit.css（dev-only 独立页）绕 token 手抄色值。留置理由：宁留置勿误吞——发版前夕批量删码与"克制"相悖，且清单含未定项（statusbar 断言方向）。

**结论不变：发版放行 ✅。**

---

## FABLE-BASE 底座修缮报告（2026-07-12，Fable @ Code——批次七全项 + Button 全量核对 + 滚底首例）

方法照章程：**先分发功能核验**（两支 Sonnet 探针端口隔离 1425/1426，真点真发真量测——批次七探针 9 子场景 23 截图零 console 错误；Button 探针 40 脚本 150+ 次交互全程监听），**证据先行再动码**；每修必附守护测试，floor 只升（169→181，禁降史续记）。

### 一、批次七落地

| 项 | 探针实证现状 | 处置 |
|---|---|---|
| ① system prompt | messages 仅 [user]，零 system 段 | chat-assembly 三件（身份/红线简版/语言约定），systemPrompt 一等字段上 wire，快照锁字节（d7ee188） |
| ② md 渲染 | 标签计数全 0，换行都丢 | 零依赖小解析器：段落/标题/两种列表/围栏代码块（paste 同凡例复用）/行内加重与 code；思考折叠同走（ab5a809） |
| ③ 测宽 | 消息列 75-76% vs composer 95-97%，差值随视口扩大 | **值提案报裁**（见三-1），未擅动 |
| ④ 路由律 | chat 内建案/点案/点阶段三条全不切面 | switchSegment 正门四接线：建案（含容器化/存 chat）/左栏点案/点阶段/⌘K 跳案（4f37359） |
| ⑤ 导入反馈 | 链路全通；"Unnamed container" 英文串泄漏 | 兜底改「未命名容器」（b4202d3）；keychain 多弹与导入怪象照预裁归 DBG-4 等用户 trace |
| ⑦ 思考动画 | chat 品牌三横/work 字符▏两面不统一 | work thinking 态换 BrandThinking，settled 字符锚保留，terminal-blink 随消费者退役，门禁改判随批（87f17be） |
| ⑨ 红绿灯 | —（真机项） | 避让机制核对在位（Overlay+浮层 chrome+避让区）；像素间奏照既裁属 sol 真机核 |

滚底首例（工单点名）：MutationObserver 跟随 + 48px 钉底阈 + 上翻暂停 + sticky 零高槽浮标（无字圆钮），浏览器三步实证 + e2e 双守护（a83f43a）。

### 二、Button 全量核对（验收标准：每一个 Button 都是期待的效果）

探针判定表全量在册（探针产物目录）；**七实锤全修**（67a938e，五条可确定性复现项入守护）：+菜单 overflow 裁剪整层不可见（case-menu 单独豁免过的同病漏项）｜+菜单/case 下拉/Owner 菜单三处收敛纪律孤立缺口｜未连接点 Send 吞草稿（onSend 增受理语义）｜Focus+收栏白屏（Focus 态藏钮）｜Owner 菜单幽灵开态｜剪贴板裸异常｜Ran command 收不起（受控 details 打架）。

### 三、[需架构拍板] 报裁清单

1. **测宽收敛值提案**：内容列统一 max-width **760px 居中**，composer 与消息列同宽对齐（现两者 75% vs 96% 且差值随视口扩大；frontier 惯例单列 720-768 封顶）。批②预裁"值提案过目"，此为提案值。
2. **store-chat 建案后切 work**：照④预裁字面实现，副作用=刚存对话离开当前视野（work 面显示 work 会话）。若观感突兀，可选"切面+chat tab 轻提示"变体。
3. **Settings 默认落地 tab**：现为 About & updates；探针建议候选 Model（近期改造重心）。
4. **Model 设置页中英并存**：英文外壳内嵌中文凭证表单，同页两处"验证连接"（中文凭证区/英文 Reasoning 区），词表归宿待裁。
5. ModelConfigPopover Provider 暴露（RELEASE-1 已上报，仍待裁）。

### 四、留置与他线

- **DBG-4**（keychain 多弹+导入反馈怪）：照批⑤预裁等用户 trace 剧本回传，本单未动。
- **慢火池追加**：R 卡"复制卡片内容"混入 UI 标签文字；Output 导航"已绑定文件夹"路径补测；probe A 未覆盖项清单（原生对话框系/Review and enable/Usage telemetry/Send feedback）。
- **原件「打开」裁定非缺陷**：走 systemOpenClient（Tauri 系统打开/浏览器降级 toast），应用内阅读另有 Working folders 入口（RELEASE-1 已验）——探针存疑项①结案。
- **Panels.tsx 留痕**：他线在途热文件一处 unused param，就地最小修（`(risk, index)`→`(risk)`）不入本会话提交，随他线收编——跨包阻塞性实现级三条件：语义等价/本处留痕/完工回报标出。

### 五、RELEASE-1 更正（假绿自曝）

RELEASE-1 验收表「`pnpm lint` 零 error」为**假绿记录**：历史验证跑法 `pnpm lint | tail` 令管道尾命令吃掉退出码，143 errors 长期隐身（干净 worktree @ HEAD 复现实证）。本批修至 **lint 整仓真绿 exit 0（仓史首次）**：config 补 scripts node 全局与 docs 出面、五处真代码清账（2610c9b）。历史各单 SPEC 中"lint 零 error"记录同疑，未逐条回溯——以今日起的 exit 0 为新基线。同型教训：验证命令一律保真退出码，禁 `| tail`/`| grep` 终端。

### 六、机器门终值（本单收口）

全仓 build 零错（exit 0 保真）｜root vitest **734/734**｜desktop vitest **94/94**（+9 本单）｜**lint 整仓真绿 exit 0（仓史首次）**｜16 门禁 + Playwright：R1 184/185（Split-Tab 单红=环境性 flake：他线共树编辑触发 vite 重载,隔离 3/3 绿,D-1 flake 判例形制分诊）→ **R2/R3 连续 185/185 exit 0**；floor **181**（本单 +12,禁降史 …169→171→172→173→176→181）。总数 185 含他线在途重建 spec（其 4 条,过验归他线收编,本单不代收）。

---

## FABLE-BASE 五裁执行收账（2026-07-12，用户当场清五项）

用户对 FABLE-BASE 报裁五项当场裁决，逐条落地（浏览器实证 + 守护测试 + 双轮门禁）：

| # | 裁决 | 落地 | 提交 |
|---|---|---|---|
| ① | 测宽 760 批准（4 基阶，与 welcome 560 成梯度） | --content-measure 760，内容列与 composer 同源；1280/1600 双测恒 760，病根消除 | ef861c1 |
| ② | 语义解法：chat 内建案=隐式存入 | chatHandoff ref + createCase 返回 id + 切案 effect 定向注入（D-1 隔离不破）；chatspace 单例保留；浏览器三态实证 | 2c44113 |
| ③ | 默认 tab = Model（最高频入口） | openSettings('about')→('model') | af56b0a |
| ④ | Model 页统一英文 + 双验证去重 | CredentialForm 全英译（含信任声明句）；删 Reasoning 区冗余 Verify + 孤儿 prop，页级唯一入口；5 spec 按钮名同步 | af56b0a |
| ⑤ | Popover Provider = 既裁（27d9b2b），非新裁 | ModelConfigPopover 撤 Provider 下拉（并行入口口径就此统一）；3 spec 删 provider 附带步 | 99b1527 |

**机器门终值**：build 零错｜desktop vitest 94/94｜lint 整仓 exit 0｜16 门禁 + Playwright **R1/R2 连续 186/186 exit 0**；floor 181→182。词表归宿（F4 分型/恢复指引中文、Model 页 chrome 律余项）另裁未动，如实标注。

---

## LUNA-UI-001 Minimap 生命周期快修（2026-07-13）

实现提交：`7a60764 fix-by-acceptance: flush minimap before graph destroy`。

根因：G6 5.1.1 Minimap 默认以 128ms debounce 执行 `renderMinimap()`，但插件 `destroy()` 不取消已排队回调；关系图谱渲染后快速切到矩阵等工作面时，Graph 已清空 `context`，迟发回调继续执行 `model.getData()`，形成 `Cannot read properties of undefined (reading 'getData')`。

最小修复：Minimap render delay 归零，并把 Graph 销毁推迟到下一宏任务，使已排队 minimap render 在 context 尚有效时先落完；功能、样式与 `.courtwork-minimap` 既有契约不变。

守护测试先红后绿：新增 `LUNA-UI-001：图谱渲染后快速切面不得留下 minimap 迟发异常`，监听 `pageerror`，在 graph `data-layout-ready=true` 后立即切矩阵并覆盖旧 128ms 窗口。旧代码稳定捕获 `getData` 错误；修复后单跑通过，重复 **10/10**，UX-1 **8/8**。

回归：desktop Vitest **99/99**；`pnpm lint` exit 0；`pnpm -r build` exit 0；独立端口 `1422` 的 16 门禁全部通过，Playwright floor **190→191**，全量 **191/191**。

按“实现与验收分离”不变量，本会话只记录实现与自测，`LUNA-UI-001` 正式关闭仍须另一验收会话复验。

---

## LAUNCH-FIX 独立验收（2026-07-13）

验收对象：`origin/codex/launch-fix@559d8d9`；环境：全新 detached worktree `/Users/lesprivilege/Projects/Courtwork-launch-fix-accept`，`pnpm install --frozen-lockfile`，Playwright 独立端口 `1521/1522`，未复用共享 dev server。

结论：**三项承诺护栏全部放行；允许合流 main 并恢复 SOL-LAUNCH。** 验收中发现并修复一项实现级缺口，提交 `f4a9fb1 fix-by-acceptance: rederive Word freeze after artifact removal`；无契约改动、无 `[需架构拍板]` 项。

### 1. 遥测真开关

- 运行码静态核对：`App.tsx` 三类事件（`review_item_opened`、`review_evidence_expanded`、`review_disposition_submitted`）只调用 `emitReviewTelemetry`；唯一 `.emitReviewTelemetry(` 直连仅存在于门后 sink 装配行。
- 关闭实测：真实 spy sink 收到 **0/3** 事件；开→关→开逐发射重读，sink 只收到第 1、3 枚。定向 Vitest **1 file / 2 tests passed**。
- 拔门变异：临时把 `if (!readEnabled()) return` 改为无条件 sink，原测试实跑 **2/2 failed**；首例明确显示 sink 被调用 3 次，第二例明确多出 `review_evidence_expanded`。随后用补丁原样恢复，复跑 **2/2 passed**，worktree 无变异残留。

### 2. Word 真接线与冻结权威

- S3 UI：确认前 `output-docx-card` 数量为 0；完成六项门禁后复用 `RiskList → RevisionInstructionSet → applyRevisionInstructionSet`，卡片出现并可打开/在访达显示。
- S4 UI：确认编译后桥回报 `答辩意见.docx` 存在，起草面才进入 `.frozen`；浏览器宿主仅承担 UI 接线测试，不作为磁盘证据。
- 删除反例首次实跑稳定红：删除浏览器宿主产物并派发窗口 focus 后，旧实现仍返回 `draft-panel frozen`。验收修复 `f4a9fb1` 后，同一用例证实 focus 会重新查询存在性，冻结与“打开 Word”能力均撤回。
- 真实磁盘证据：Rust 测试把仓内 **37,601 bytes 的真实 OOXML DOCX** 写到临时案件根的 `产出/答辩意见.docx`，核对绝对路径、长度、逐字节内容与 `exists=true`；随后真实 `remove_file`，复查 `exists=false`。`../escape.docx`、`nested/a.docx`、`/tmp/escape.docx`、非 docx 扩展名均被拒。
- Rust 全量：**18/18 passed**；Word/browser 客户端定向：**2 files / 3 tests passed**；`system-open.spec.ts`：**5/5 passed**。

### 3. 全门回归

- root Vitest：**104 files / 850 tests passed**。
- desktop Vitest：**24 files / 106 tests passed**。
- `pnpm lint`：exit 0；`pnpm -r build`：11/11 workspace projects exit 0。
- 16 道静态门禁：全部 exit 0；Playwright 独立端口 `1521` 全量 **192/192 passed**（4 workers），独立端口 `1522` 顺序复跑 **192/192 passed**（1 worker）。
- 环境事实：clean install 后若在 workspace 依赖尚无 `dist` 时直接单跑 output 跨包测试，会因 export 指向未构建产物而找不到模块；先执行仓库标准拓扑 `pnpm -r build` 后定向/全量均绿。此为现行 workspace 测试顺序要求，不是产品路径红项。

最终放行：**是**。`559d8d9 + f4a9fb1 + 本验收记录` 可由收账会话合流 main；本验收会话不自行 merge/push main。

---

## POLISH-P0 独立验收（2026-07-13）

- 验收角色：独立验收会话，非实现者。
- 权威主线：`main@54629896821b2f5c10a375b5a2a19e0315a5b65c`。
- 被验分支：`codex/polish-p0@3ad54919650978eaed56528c60720ce7b8cabced`；实现链为 `304daac`（Minimap 生命周期）→ `944ee8f`（thinking gate 边界）→ `3ad5491`（视觉证据与 SPEC）。
- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-polish-p0`；Playwright 全部使用 `:1531`–`:1534` 隔离端口，`reuseExistingServer=false`，未复用共享 `:1420`。
- 结论：**✅ 放行合入 main；POLISH-P0 可关闭，并允许依赖其静态门的 SCHEMA-POLISH 验收继续。**

### 1. Minimap 旧反例与修复态

验收会话把 `GraphPanel` cleanup 精确回置为旧逻辑：`instance.rendered` 提前分支 + `MINIMAP_RENDER_DELAY_MS=0` 的 0ms destroy grace；在 `:1531` 对新回归实跑 40 轮 Graph ↔ Timeline 快切：

```text
Received Array [
  "pageerror: Cannot destructure property 'Symbol(Symbol.iterator)' of 'this.options' as it is undefined.",
  ... 共 11 条
]
1 failed
```

exit 1，证明回归不是假绿。随后用精确补丁恢复目标 tip，确认 `GraphPanel.tsx` 对 HEAD 零 diff。

修复态在 `:1532` 以 `--repeat-each=5 --workers=1` 连续 **5/5** 通过，共 **200 轮**快切；每轮同时收集未过滤的 `pageerror` 与 console error，结果均为空。全量 Playwright 另含一次同回归（再 40 轮）并通过。

源码核对：

- Minimap 仍注册、仍使用 `delay=0` 与 `.courtwork-minimap`；没有移除功能规避。
- cleanup 始终等待完整 `renderPromise.finally(...)`，再留 32ms 回调清空窗口后 destroy；不再读取 `instance.rendered` 决定提前销毁。
- 没有吞异常、全局 console/pageerror 过滤、patch `node_modules`，也未修改 `PartyGraph`、renderer ABI、主题语义或布局算法。

### 2. 图谱功能与静止边界

`:1533` 定向 Playwright **5/5**：

1. `.courtwork-minimap` 可见；
2. 放大后 zoom 数值上升，fit view 后回落；
3. 节点与关系选择能切换“节点关联依据 / 关系依据”；
4. G6 dagre 全量渲染 **14 节点 / 15 边**且标签零重叠；
5. 无极缩放仅在关系图谱沙盒生效。

配置与静态门继续锁定 graph/node/edge/layout `animation:false`；`lint:motion` 与 `lint:graph` 均通过，数据区未新增动画。

### 3. 四档视觉证据

`visual-audit/manifest.json` 与 PNG 独立逐项复算：

| 文件 | manifest viewport / 实际像素 | SHA-256 复算 |
|---|---|---|
| `polish-p0-graph-1180.png` | `1180×900 / 1180×900` | `46ac12d56ada80529ddaebe0700d51788b2313c62bd2fc91262246d4474f6beb` ✅ |
| `polish-p0-graph-1280.png` | `1280×900 / 1280×900` | `a1cc64809abd9384dbde04b44249e07db1df6afaa00f07c284704966a9e355e3` ✅ |
| `polish-p0-graph-1440.png` | `1440×900 / 1440×900` | `f72590eee8b12ef0b5a505c759ecb06ef1d0e510b4719c3a9fd9427f24d5b117` ✅ |
| `polish-p0-graph-1600.png` | `1600×900 / 1600×900` | `af5900a1de1aadfd9eb66e5977394a831e4e85bc6687f8db6a63a4b95b4cb8a4` ✅ |

manifest 记录 `actualHead=304daac`、`baseURL=http://127.0.0.1:1523`、`port=1523`、`reducedMotion=reduce`、`screenshotAnimations=disabled`。`304daac` 是被验 tip 祖先，且 `304daac..3ad5491 -- apps/desktop/src` 零 diff，因此截图与当前运行 UI 同源。四张图片逐张目视，均可见完整关系图、图谱控制和右下 Minimap，无旧帧冒充或重复帧。

生成器防污染反例：缺少 `COURTWORK_AUDIT_URL` 时 exit 1；显式传共享 `:1420` 时 exit 1，报 `visual audit must not reuse the shared Playwright port 1420`。

### 4. `944ee8f` thinking gate 阻塞修复

该提交只把 CSS slice 的 end marker 从与 start 相同的 `/* docs/design/principles.md` 改回紧邻的 `/* 状态条模型配置 */`，未修改 `ThinkingStream.tsx`、`App.tsx` 或 CSS 契约。

验收把 gate 单行精确回置旧 marker，对当前相同 UI 源实跑：

```text
Silent anchor must have no frame
Cursor must use the navy ink (竖线用藏青)
OLD_THINKING_GATE_EXIT=1
```

恢复 `944ee8f` 后 `lint:thinking` 输出 `ThinkingStream three-state/char boundaries: OK`、exit 0；完整 e2e 前置 16 门也通过。该修复是静态门自身的既有切片 bug 修复，不改变契约，可随 POLISH-P0 放行。

### 5. 完整门禁原始数字

- `pnpm install --frozen-lockfile`：12 workspace、1047 packages，exit 0。
- desktop 定向 Vitest：**24 files / 106 tests**，exit 0。
- root `pnpm test`：**104 files / 850 tests**，exit 0。
- `pnpm -r build`：**11/12 workspace projects** 全部通过；desktop **3485 modules**，仅既有 chunk size warning。
- `pnpm lint`：exit 0。
- `:1534` 完整 `test:e2e`：16 道前置设计/边界门全绿，假绿防护确认 floor **194**，Playwright **194/194 passed（1.8m，4 workers）**。
- `git merge-tree --write-tree main target`：exit 0，无合流冲突；生成候选 tree `2c8ce6b866768e3fd40c66df54910b5c4486eeff`。

验收未发现实现级缺陷，未产生 `fix-by-acceptance` 代码提交；仅追加本报告。未改契约、未合并、未 push。

> **最终判定：POLISH-P0 放行 ✅。** `3ad5491 + 本验收报告` 允许由架构/收账会话合入 `main@5462989`；Minimap TypeError 已由真实反例与 240+ 轮修复态快切闭环，四档视觉证据与当前代码同源，thinking gate 自身假红亦已由 `944ee8f` 独立反例验证修复。

---

## SCHEMA-POLISH-1 独立验收（2026-07-13）

- 验收角色：独立验收会话，非 `9ec3967` 实现者。
- 被验实现：`codex/schema-polish-1@9ec3967`；独立 worktree `/Users/lesprivilege/Projects/Courtwork-accept-schema-polish-1`。
- 集成基线：任务起点 `main@5462989`，首次合并 `9a344cd`；POLISH-P0 独立放行后前进式合并 `main@7ae3be4`，最终集成 merge `f8724d1`。
- Playwright 均使用隔离端口 `1547/1549/1551/1552/1553`，`reuseExistingServer=false`；未复用共享服务。
- 结论：**✅ 放行。`9ec3967 + 2e25859 + 本验收记录` 允许合入 main；SCHEMA-POLISH-1 可关闭。**

### 1. 边界与契约

- `git show 9ec3967` 只有 11 个 `apps/desktop/**` 文件：SPEC、呈现组件/CSS、Vitest、E2E 与测试 floor；没有 `packages/schemas`、`packages/core`、`packages/legal`、ADR 或 schema 字段/语义改动。
- 矩阵短名只由 `question.text` 机械裁切，没有领域 alias 表，也不写回 schema。临时删除 `是否/有无` 前缀裁切后，定向 Vitest 实跑 **1/2 failed**：`expected '是否约定了书面' to be '约定了书面验收'`；恢复目标实现后 **2/2 passed**，变异零残留。
- 首次完整 `test:e2e` 在进入 Playwright 前被当时 main 的已知 thinking CSS 空切片假红阻塞；该脚本不在 `9ec3967` 差异内，故记为“前置阻塞、非 SCHEMA 回归”。POLISH-P0 独立放行并合入 `main@7ae3be4` 后，本验收只前进式同步 main，没有单独夹带未验提交；最终 ThinkingStream 门与其余 15 道前置门全部通过。

### 2. 呈现、证据与门禁行为

- 矩阵列头呈现 `Q1 · 违约金`；focus 后完整 tooltip 为 `违约金比例（买方逾期付款）是多少？`。真实“查看引语”按钮可 Tab 聚焦、Enter 展开，`aria-expanded/aria-controls` 成对；未接通的“回到原件”保持独立禁用动词，不冒充可跳转。
- 风险行与详情同时显示严重度、核验、处置、下一步；样板案批量范围为 **4 项**、明确排除 **2 项**。高危/未核验项只有逐条通路，未展开全部依据前确认禁用；展开后下一步从“展开依据”变为“逐条确认”。
- 引语正文使用 `white-space: normal` 与 `overflow-wrap: anywhere`；文件名元信息承担截断。Context 承载 `Continue this case`，背景计算值为 ink `rgb(10, 37, 64)`；Progress 中无 continuation。L1 实测仍只有 Preview 一个 `.surface-card`，未新增空壳面板或装饰卡；既有空态、English chrome / 中文法律与 schema 内容边界由 RP-2.6/RP-2.7 与 SCHEMA 定向用例共同通过。

### 3. 验收发现与 `fix-by-acceptance`

四档截图发现首行矩阵引语 peek 向上展开：完整 rect `top=-35.5`，而 Preview host `top=8`；自动化此前只判 DOM `visible`，实际截图只剩底部“回到原件”，引语正文被 overflow 裁掉。

- 先补几何守护，旧 CSS 定向实跑 **1/1 failed**：`Expected >= 8, Received -35.5`。
- 最小修复只把 `.cell-peek` 从 `bottom: calc(100% + 4px)` 改为 `top: calc(100% + 4px)`，不改卡片、锚点、颜色或 schema 语义；提交 `2e25859 fix-by-acceptance: keep matrix evidence inside preview`。
- 修后定向 **1/1 passed**；1180/1280/1440/1600 四档的完整 peek 均为 `top=140.5, bottom=291.5`，位于 host `8..892` 内，页面均 `scrollWidth === clientWidth`。最终全量也包含该几何守护并通过。

### 4. 四档独立视觉证据

隔离预览 `http://127.0.0.1:1550`，`900px` 高、`deviceScaleFactor=1`、`prefers-reduced-motion=reduce`、截图动画禁用。每档分别生成风险详情、矩阵完整列头 tooltip、矩阵完整引语三帧；以下列出承重的风险/矩阵引语帧 SHA-256：

| 宽度 | 风险详情 | 矩阵引语 | 复核 |
|---|---|---|---|
| 1180 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1180.png` · `95dbee3586d2d2797e7a10ede49282b90713526a64c6d4877313ce2445c2e275` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1180.png` · `0b3563300401d96fc0d19e049921d0317a4a8366596a2cf23efbac6b748040da` | 无全局横溢；引语完整 |
| 1280 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1280.png` · `56ddf70ea59291887274b67ae0fdf162d85e1d607f0fe575dcf0bec6cab13412` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1280.png` · `28bc6627d1990ab115f3d226354d040b1ce75792da4eccedf4ef18de88a2214d` | 无全局横溢；tooltip 完整 |
| 1440 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1440.png` · `fd70652c1f3e0f31cb5cccd257eeeeb26073c51a08ec30da160372c748efd5fb` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1440.png` · `191c2d55da574db076f00b43f4b8ab5db554b71ccc744bc8f6717794cbc3eb94` | 无全局横溢；来源动作诚实 |
| 1600 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1600.png` · `2b33f1546cef32f701631e87e2558a58d72499b02806036a180879677b383990` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1600.png` · `e61f429852aa7ec42b7ea89a539e2fc7ce65c1de68284f31db52c7fd2fca5169` | 引语按窄列自然换行；无截断冒充 |

### 5. 最终机器门原始数字

- `pnpm install --frozen-lockfile`：12 workspace、1047 packages，exit 0。
- `pnpm -r build`：scope **11/12 workspace projects** 全部通过；desktop **3485 modules**，仅既有 chunk-size warning。
- `pnpm lint`：exit 0。
- root `pnpm test`：**104 files / 850 tests passed**。
- desktop Vitest：**25 files / 108 tests passed**。
- 提交 `2e25859` 后最终 `:1553` 完整 `test:e2e`：16 道前置静态/设计/边界门全部通过，假绿 floor **198**，Playwright **198/198 passed（4.1m，4 workers）**。

> **最终判定：SCHEMA-POLISH-1 放行 ✅。** 真实证据、状态与下一步动作均达到本单验收标准；验收发现的首行引语裁剪已由红测、最小实现级修复、四档视觉复核与全量回归闭环。无 `[需架构拍板]` 项，无 schema/core 契约变化。

---

## BRAND-1 独立验收（2026-07-13）

- 验收角色：独立验收会话，非 `e9bd9c3` 实现者。
- 被验实现：`codex/brand-1@e9bd9c319d2df5e22570136110ae04a552f7fc1a`。
- 合流基线：独立验收树最终合入 `main@c22fe1e`（含 PROVIDER-2、ADR-008 与现行 Evidence Line）；合流提交 `999e41f`。唯一冲突为 `docs/status/current.md` 的已完成任务排序，按 main 现行状态机械解决；BRAND 组件、样式与测试均无冲突。
- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-brand-1`；最终 Playwright 使用隔离端口 `17646`、`reuseExistingServer=false`、单 worker，未复用共享服务。未触碰 `site/` 或 `archive/` WIP。
- 结论：**✅ 放行。BRAND-1 可合入 main。**

### 1. 品牌形制与边界

- 展开态 `.rail-wordmark` 中只有一枚 `BrandMarkIcon`，DOM 顺序恰在 `Courtwork` 文本左侧；SVG 源为 **4 条 `path`**，没有 `rect`、`img`、`title`、背景、底盘或其他装饰几何。
- 图标计算尺寸 **17×17px**，图标与文字水平间距 **7px**，两者垂直中心差不超过 **1px**。wordmark 与图标的计算样式均为透明背景、零边框、零圆角、零阴影。
- 图标 `aria-hidden=true`，没有 `aria-label` 或 `role`；可访问树只有一枚名称为 `Courtwork` 的 heading，没有品牌名重复播报。
- 静止态与 hover 后均为 `animation-name:none`、`transition-duration:0s`、`transform:none`、`opacity:1`，没有 hover、入场、磁吸或其他动画。
- 左栏折叠后品牌标记与 heading 同时撤出，原位展开控制仍可见；再次展开后恰恢复一枚标记与一枚 heading，collapsed 行为无退化。

### 2. 独立反例与验收加固

验收把 `.rail-brand-mark` 宽度从 `17px` 临时改为 `24px`，在隔离端口 `17643`、单 worker 只跑 BRAND 用例。用例真实失败：

```text
Expected: <= 18
Received:    24
1 failed
```

随后用精确补丁恢复 `17px`，确认样式零变异残留。验收另补齐 4-path、无可访问名重复、无 hover/animation 漂移、折叠撤出与再展开恢复断言，提交 `4da4e75 fix-by-acceptance: harden BRAND-1 e2e contract`。该提交只增强既有 E2E，不改变产品契约或实现。

### 3. 合流态最终机器门

- `pnpm -r build`：scope **12/13 workspace projects** 全部通过；desktop **3493 modules**，仅既有 chunk-size warning。
- `pnpm lint`：exit 0。
- root `pnpm test`：**108 files / 868 tests passed**。
- desktop `test:e2e` 前置 **16 道静态/设计/边界门全部通过**，含 motion、signature line、graph theme、SVG icons、preview/elevation、RP-2.6 至 RP-2.11、neutral-source 与 test floor；假绿门确认 **198** 条用例。
- `COURTWORK_E2E_PORT=17646 pnpm --filter @courtwork/desktop test:e2e --workers=1`：**198/198 passed（4.9m，1 worker）**；BRAND 定向用例包含于全量并通过。

无实现缺陷、无契约级问题、无 `[需架构拍板]` 项。

> **最终判定：BRAND-1 放行 ✅。** `e9bd9c3 + 4da4e75 + 本验收记录` 已在 `main@c22fe1e` 合流态完成全门验证，可由架构/收账会话合入 main。

---

## CHAT-UI-1 独立验收（2026-07-14）

- 验收角色：独立验收会话，非 `98826e6` / `bb5bddd` 实现者。
- 被验实现：provider seam `98826e6`，desktop/core/legal 集成 `bb5bddd6ea16fe4ff2e47091c27e0d1a6d0ffd7e`。
- 验收树：以任务基线 `main@5cce90e` 建立独立 worktree `/Users/lesprivilege/Projects/Courtwork-accept-chat-ui-1`，前进式合并为 `fb290f7`；分支 `codex/accept-chat-ui-1`。未在共享树 checkout、stash 或复用 dev server。
- 最终 Playwright 使用隔离端口 `1572`、`reuseExistingServer=false`、`--workers=1`，未复用 `1420`。
- 结论：**✅ 放行。无实现缺陷、无契约级问题、无 `[需架构拍板]` 项。**

### 1. provider / core 流式真值

- 真 HTTP 401 与 transport network failure 均先发 `started(seq=0)`，再分别以 `failed(kind=auth/network, seq=1)` 收敛。验收临时删除 `started` 发布后，provider 定向测试真实 **2/2 failed**：两条失败都从 `seq=0` 开始且缺少 started；恢复后 **2/2 passed**。
- core 对 provider 失败分类作机械透传。验收临时把 `providerTerminal.kind` 强制改为 `invalid_response`，重新 build core 后 auth/network 两条 desktop 定向测试真实 **2/2 failed**，分别收到 `invalid_response` 而非 `auth` / `network`；恢复后 **2/2 passed**。
- production chat 只经 `sendChatTurn → core runTurn → provider.stream`；测试 provider 的 `generate()` 明确抛错且测试确认从未调用。`started/reasoning/content/usage/completed/failed/canceled` 均由 core `TurnEvent` 机械投影，真实 content delta 在 provider terminal 前可见；旧 Typewriter/final responder 已退出生产路径。
- 测试 hook 只在 `import.meta.env.DEV && VITE_COURTWORK_E2E === '1'` 安装，注入面只接受 `ProviderStreamEvent`。验收把安装改为无条件后，`lint:chat-ui` exit 1（`Chat test hook must be explicit DEV+E2E only`），且生产 bundle 可检出 hook；恢复后 production build 中 `__courtworkChatHooks` / `setStreamFactory` / E2E provider 文案均为零命中。

### 2. journal、interaction 与来源授权

- localStorage 只有 `courtwork.turn-journal.v1` 单 envelope，精确字段为 `version/revision/entries/turnIds`。坏 JSON、未知字段、非法 envelope、index drift 均 fail closed 且不改写原始字节；quota 写失败直接抛出并保留前一份合法 envelope。验收临时探针覆盖非法字段、幽灵 turnId 与 quota，结果 **2 tests passed**；另以真实浏览器注入 index drift / 非法 known turn，恢复态 **3/3 passed**。
- 验收临时删除 index/entries 一致性检查，浏览器 recovery 断言真实变红，幽灵 turn 得以绕过；恢复后变绿。临时删除 `knownTurnIds()` 对每个 id 的 core replay，`lint:chat-ui` exit 1（`Known index must not bypass core replay validation`）；恢复后门禁通过。索引只作导航，不能替代 core replay 校验。
- `InteractionTurnCard` 只消费 `TurnReplay` 快照；question/options/anchors/resolution 均不另造本地真值。提交锁定 `submittingRef` first-wins、manifest `skippable`、失败后可重试、刷新后 pending card 恢复且不重复请求；Recorded 只在 core 接受 `interaction_resolved` 后出现。
- legal demo 由 `LEGAL_PACKAGE + registry + requestInteraction` 组装。样板合同引语在当前 `fileId/textLayerVersion` 文本中恰好唯一，range 与 slice 精确相等。source-open 先验证 file/version/range/quote slice，再 focus/scroll 原文；验收临时删掉 fileId 守卫后，未授权 anchor 会错误打开默认合同，定向 E2E 真实失败；恢复后错误可见且 reader 不打开。

### 3. 视觉、输入与静态边界

- interaction card 使用 verified/generated 冷色混合、1px hairline、6px radius；目标 slice 无 shadow、gradient 或 card-in-card。option 采用 ledger 分隔，不新增嵌套白卡。
- 指针按压只在允许控件产生 `.98` feedback；键盘激活不缩放焦点控件，`focus-visible` 保持；reduced-motion 下取消缩放且 source scroll 使用 `auto`。以上 pointer / keyboard / reduced-motion 与刷新恢复均在完整 E2E 中通过。
- `lint:chat-ui` 同时锁 production hook、core replay、TurnReplay 取值、样式 slice 与来源校验；`assert-test-count` 实测 **208**，达到 floor **208**。

### 4. 最终机器门原始数字

按验收要求在 `fb290f7` 代码 tip 顺序实跑：

- desktop Vitest：**30 files / 129 tests passed**。
- provider Vitest：**12 files / 86 tests passed**。
- `pnpm site:guard`：scanner fixture **12/12 passed**，扫描 **585 active text files**；neutral/elevation/signature/motion 全绿。
- `pnpm lint`：exit 0。
- `pnpm -r build`：scope **12/13 workspace projects** 全部通过；desktop **3504 modules**，仅既有 dynamic-import / chunk-size warning。
- root `pnpm test`：**114 files / 981 tests passed**。
- `COURTWORK_E2E_PORT=1572 pnpm --filter @courtwork/desktop test:e2e --workers=1`：16 道静态/设计/边界门全绿，假绿防护确认 floor **208**；Playwright **208/208 passed（2.7m，1 worker）**。

验收未产生产品代码修复或 `fix-by-acceptance` 提交；所有破坏性补丁与临时探针均已精确恢复，提交前工作树仅含本报告。

> **最终判定：CHAT-UI-1 放行 ✅。** `98826e6 + bb5bddd + 本验收记录` 可进入架构收账；provider 生命周期、core 终态语义、持久化防腐、interaction replay、legal source 授权与反 slop 输入边界均由真实反例和全量门禁闭环。

---

## HOST-PORT-1 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与本工单实现，也不是实现会话前身。
- **对象**：`codex/host-port-1@ba6426acdc76b56b183c7b44edd3f33600b608fb`；任务基线 `b8815080501d7775a6e2fa27fefa756588496d92`。
- **验收树**：`/Users/lesprivilege/Projects/Courtwork-worktrees/accept-host-port-1`，分支 `codex/accept-host-port-1`，直接基于实现 tip 建立；未在共享主树 checkout、stash 或复用 dev server。
- **结论**：**✅ 放行。** 无产品代码修复、无契约级问题、无 `[需架构拍板]` 项。

### 1. 差异与架构边界

`git diff b881508..ba6426a` 共 8 个 `apps/desktop/**` 文件：新增 Tauri provider transport adapter 与 fake 测试，修改 composition root、`App` transport 注入、chat client 去宿主依赖、静态边界测试和 SPEC。以下范围在差异中均为零：

- `apps/desktop/src-tauri/**`：Rust command、受控 catalog、keychain、请求 body 与 raw frame 传输未改；
- `packages/provider/**` / `packages/core/**`：DeepSeek-only catalog、OpenAI-compatible adapter、provider stream/Turn 生命周期、失败闭集与 journal 未改；
- `packages/registry/**` / `packages/schemas/**`：manifest/schema/interaction 契约未改；
- `styles.css` 与工作面组件：chat 视觉、credential UI、持久化和 Work 语义未改。

新 `host/tauri-provider-transport.ts` 是从旧 `chat-client.ts` 搬出的同一窄桥：只提交 `requestId/providerId/modelId/reasoningBody/body`，没有 URL、header、authorization 或 key；`Channel`、async queue、`provider_chat_request` 与同 request id 的 `cancel_provider_request` 只留在 host adapter。`App.tsx` 与 `chat-client.ts` 对 `@tauri-apps/api`、`Channel/invoke` 和两枚 Rust command 名均为零命中；production 代码中 adapter 只由 `main.tsx` 在 `isTauriHostRuntime()` 成立时创建并注入。

没有第二 provider 状态机：`sendChatTurn` 仍构造已登记 descriptor 的 OpenAI-compatible provider，并唯一进入 core `runTurn`。浏览器 E2E hook 的形状仍是 `setStreamFactory(context) → AsyncIterable<ProviderStreamEvent>`；测试 provider 的 `generate()` 明确抛出 `E2E stream providers must run through core runTurn`。实际 E2E 脚本逐帧注入 `started/reasoning_delta/content_delta/usage/completed|failed`，没有 final answer 或 terminal projection 捷径。

### 2. fake transport 与边界反例

定向执行 adapter、chat client、静态边界三文件：**3 files / 12 tests passed**。其中 fake host 实测：

1. raw `response_started → chunk(bytes) → end` 原序透传，invoke 入参保持既有窄形；
2. `AbortSignal` 映射到同一 `requestId` 的 cancel command；
3. host invoke rejection 收敛为 typed、non-retryable `network` failure。

按验收纪律实际注入边界反例：在 `chat-client.ts` 临时加入 `@tauri-apps/api/core` 字面依赖，运行 `src/chat/chat-ui-boundary.test.ts` 后真实 **1 failed / 4 passed**，失败点精确为“chat 业务编排不依赖 Tauri host API”；撤除反例、确认 git 零残留后同文件 **5/5 passed**。

### 3. clean 环境与完整机器门

- `pnpm install --frozen-lockfile`：scope **13 workspace projects**，lockfile 无漂移，**1047 packages**，exit 0。worktree 安装前无任何 `node_modules`。
- clean install 后第一次定向 desktop 测试因 workspace package 尚无 `dist`，`@courtwork/core/turn-protocol` 无法解析；先执行仓库规定的真实 `pnpm -r build` 后，同一测试转为 12/12。该失败是 clean workspace 的构建前置证据，不是 HOST-PORT 回归。
- `pnpm -r build`：scope **12/13 workspace projects** 全部通过；desktop **3505 modules**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- `pnpm --filter @courtwork/desktop build`：**3505 modules**，exit 0。
- `pnpm exec eslint apps/desktop` 与 root `pnpm lint`：均 exit 0。
- desktop Vitest：**31 files / 133 tests passed**。
- root Vitest：**114 files / 981 tests passed**。
- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`：lib **25/25 passed**，bin/doc tests 0，exit 0；含 arbitrary provider/input 安全、raw UTF-8 frame 与 cancellation tests。
- `COURTWORK_E2E_PORT=1592 pnpm --filter @courtwork/desktop test:e2e --workers=1`：所有静态/设计/边界前置门通过，假绿守卫确认 **208** 条，Playwright **208/208 passed（3.5m，1 worker）**；`reuseExistingServer=false`。

### 4. 真实 Tauri 壳 smoke 与端口记录

默认 Tauri 配置固定 `:1420`，验收用 CLI 临时 merge config 把 `beforeDevCommand` 与 `devUrl` 改到独立 `:1593`，未写仓库配置。`Vite :1593` ready 后 Rust dev binary 编译并出现：

```text
Running `target/debug/courtwork-desktop`
```

外部核验 PID `45560` 为 `target/debug/courtwork-desktop`，状态 `S+`，持续存活至少 **13 秒**；Vite 仅监听 `127.0.0.1:1593`。验收后 Ctrl-C 正常结束，复核无残留 Tauri 进程、无 `:1593` listener。

操作留痕：首次临时命令误写成 `pnpm dev -- --port 1593`，Vite 把 `--` 后参数当 positional，短暂启动默认 `:1420`。发现 Tauri 正在等待 `:1593` 后立即在 Rust shell 启动前终止，并确认 `:1420/:1593` 均无 listener，再以正确 `pnpm dev --port 1593` 重跑上述真实壳 smoke。未连接、复用或污染其他会话服务。

> **最终判定：HOST-PORT-1 放行 ✅。** `ba6426a + 本验收记录` 可进入架构收账。下游可依赖唯一 `ProviderTransport` 注入缝接 Tauri provider transport；本单只完成 provider host adapter，不把它冒充完整 Work/Credential/File port，也未改变任何 provider、Turn、Rust 或 UI 契约。

---

## VIEW-ABI-1 / VIEW-ABI-1C 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与 `43e617607f4be694834b23005eeb807474f5986c` 的实现，也不是实现会话前身。
- **验收树**：`/Users/lesprivilege/Projects/Courtwork-worktrees/accept-view-abi-1`，分支 `codex/accept-view-abi-1`，直接从实现 tip 建立；未在共享主树 checkout/stash，未复用共享 dev server。
- **合入序列**：初始实现 `43e6176`；验收修正 `9b06175`、`cabdac0`；架构拍板原提交 `5ed2713` 在本树的等价 cherry-pick `3f55f59`；estimate 实现 `e48cc2c` 在本树的 cherry-pick `0b4c5a8`。
- **安装**：`pnpm install --frozen-lockfile`，13 workspace projects、1047 packages，lockfile 零漂移。
- **结论**：**✅ 放行。** 首轮发现的一项契约缺口已由架构角色拍板并由原实现会话补齐；验收会话未自行修改 schema/ADR。最终无未决契约问题或 `[需架构拍板]` 项。

### 1. 准入、路由与零入口边界

composition root 实测同次准入 `legal + pm`，artifact registry 共 **11** 项；scenario registry 共 **5** 项且全部来自 Legal。PM 只贡献 4 个 artifact/schema/presentation 与 `courtwork.artifact-table.v1` renderer 声明，`scenarios=[]`、`promptSegments=[]`，没有 PM 导航、demo 或空工作面。

生产路由先按 admitted artifact descriptor 取 `uiTemplateId`，再查 host blueprint。`App.tsx` 不再用四个 `artifactType === 'legal.*'` 分支、`HOMED_ARTIFACT_TYPES` 或 raw generic tree；模块状态机也不再持有 Legal type-id map。未知 artifact、未知 template、缺 host blueprint、schema/pointer/format drift 全部汇入同一 `UnsupportedArtifactView`，只显示人读标题或中性“结构化产出”与固定不兼容文案。

Legal 七类 template 与旧实现逐项对照：Timeline/PartyGraph/RiskList/ReviewMatrix 保持自动打开对应五面，CaseFile 保持 passive，FileOpsPlan 只展开 Working Folders，RevisionInstructionSet 保持不自动打开。首轮实现给 draft blueprint 留了 `moduleTarget:'draft'`，模块展开路径不读取 `autoOpen:false`，会改变旧行为；验收删除该 target 并把七个 blueprint 的完整形状锁入测试，提交 `cabdac0 fix-by-acceptance(view-abi): preserve draft auto-open behavior`。

### 2. 通用表、证据与 estimate 契约

原始 PrdReview 合法 fixture 证明：表头只来自 field-local label，枚举/status/tags 只显示 field-local `valueLabels`；anchor 只显示来源数、去重页码与完整 quote。含绝对路径、bbox、textRange、textLayerVersion/hash 的 fixture 静态 HTML 对这些值均零命中，quote CSS 为正常换行而非截断。

首轮验收额外构造 schema-valid `pm.PriorityScore`：低置信参数为 `{value:null, range:{low,high}}`，score 也为区间。实测当时 `schema.safeParse=true`，但 renderer 返回 `{status:'unsupported'}`，暴露 `/params/*/value + mono score` 无法承载合法区间。该项属于 presentation 契约，验收未越权修复；架构随后以 ADR-009 增量拍板通用 `estimate` format，原实现会话完成 registry 静态准入、PM descriptor `0.1.1`（`schemaVersion` 仍为 1）与宿主投影。

补丁后实际混合载荷同表投影成功：

- 直接 number score 与 envelope 单值显示 `8` / `10` / `0.8`；
- 直接 range 与 envelope range 显示 `10–12` / `0.4–0.8` / score `4–8`；
- envelope 的 value/range 皆空时只显示 field-local “未覆盖·需补材料”；
- 静态 HTML 对 `low/high/status/filled/out_of_coverage/range/value/fileId` 全部零命中，无 wire key/status 泄漏。

registry 准入只接受 finite number、精确 `{low,high}`、两者 union 或 `{value:number|null, range:{low,high}|null, status:enum}` envelope。envelope status labels 必须精确覆盖 enum；直接 number/range 禁带 labels。非法形状只拒载所属 PM 包，不污染同批 Legal catalog。

### 3. 真实变异与 fail-closed 证据

所有补丁均用 `apply_patch` 临时注入并精确恢复；下列红灯不是读取实现自述：

| 变异 | 实测红灯 |
|---|---|
| host 的通用 table template 改成未知 id | Host/composition 定向 **2 failed / 1 passed** |
| 删除通用 table host blueprint | Host/composition 定向 **2 failed / 1 passed** |
| PrdReview presentation pointer 改为 `/missing` 并重建 PM | desktop renderer 三项因 package admission fail closed，**3 failed** |
| 同时绕过 schema-first 与未知 enum label 拒绝 | malformed payload 泄漏 `wire-secret`，renderer 定向 **1 failed / 2 passed** |
| 在 `App` 恢复 `artifactType === 'legal.Timeline'` | `lint:view-abi` exit 1，精确报 Legal type-id switch |
| 在 fallback 恢复 `JSON.stringify(payload)` | 原门禁曾错误保持 9/9 绿；增强后同一变异 exit 1，精确报 raw payload serialization |
| PriorityScore Reach 退回旧 `/params/reach/value` | PM admission 报 estimate shape 不兼容，**2 failed / 6 passed** |
| 删除 `out_of_coverage` status label | 四参数分别报缺映射，PM 整包拒载，**2 failed / 6 passed** |
| 同时绕过 schema-first 与 envelope 双值守卫 | 双值被错误投影为 `1100`，renderer **1 failed / 7 passed** |
| 同时绕过 schema-first 与逆区间守卫 | 错误显示 `640–400`，renderer **1 failed / 7 passed** |
| 同时绕过 schema-first 与未知 status 拒绝 | 泄漏 `future-wire-status`，renderer **1 failed / 7 passed** |

raw fallback 静态门的首轮假绿是实现级缺陷，验收提交 `9b06175 fix-by-acceptance(view-abi): block raw artifact fallbacks`，新增对 `JSON.stringify(payload)`、`Object.entries/keys/values(payload)` 与 `Reflect.ownKeys(payload)` 的扫描；恢复后 VIEW-ABI 门为 **12/12**。这枚修正不改变 schema/ADR 或产品契约。

### 4. 最终机器门

在所有变异恢复、estimate 架构与实现合入后的最终 tip 顺序实跑：

- registry + PM 定向：**3 files / 69 tests passed**；desktop VIEW 定向：**4 files / 14 tests passed**。
- desktop Vitest：**34 files / 142 tests passed**。
- root Vitest：**120 files / 1060 tests passed**。
- `pnpm lint`：exit 0；`pnpm build`：scope **13 of 14 workspace projects** 全绿，desktop **3519 modules**，仅既有 Tauri dynamic/static import 与 chunk-size warning。
- `pnpm site:guard`：scanner fixtures **12/12**，扫描 **613 active text files**；neutral/elevation/signature/motion 全绿。
- `COURTWORK_E2E_PORT=1601 pnpm --filter @courtwork/desktop run test:e2e --workers=1`：全部静态/设计/边界前置门通过，假绿下限 **208**；Playwright **208/208 passed（2.8m，1 worker）**，配置 `reuseExistingServer=false`。

验收曾为可视抽查建立临时 PM/fallback 页面，但 in-app browser control 返回可用浏览器列表 `[]`，因此没有冒充 computer-use 截图。临时 HTML/TSX 与 Vite `:1599` 服务已全部删除/结束，git 零残留；视觉与几何仍由隔离真实 Chromium 全量用例覆盖，其中包含 1180/1280/1440/1600、品牌 SVG 位置、证据换行、零溢出与反 slop 判例。

> **最终判定：VIEW-ABI-1 与 VIEW-ABI-1C 放行 ✅。** `43e6176 + 9b06175 + cabdac0 + 3f55f59 + 0b4c5a8 + 本验收记录` 可进入架构收账。下游可以依赖 admitted descriptor → host blueprint → schema-first presentation 的唯一工作面链；PM 仍是 catalog-only，不得把本次通用表准入误解为已存在 PM workflow 或产品入口。

---

## WORK-PORT-1 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与本工单实现，也不是实现会话前身。
- **对象**：精确实现 SHA `c2fcf6c149a9733638ebde29e245ecbaa8de1f47`；任务基线 `7be2855`。
- **验收树**：`/Users/lesprivilege/Projects/Courtwork-worktrees/accept-work-port-1`，分支 `codex/accept-work-port-1`；未在共享主树 checkout/stash，未复用共享 dev server。
- **结论**：**✅ 放行。** 无产品代码缺陷、无契约级问题、无 `[需架构拍板]` 项；验收补强一项 fixture 跨 session 回归测试。

### 1. 差异与架构边界

`git diff 7be2855..c2fcf6c` 共 11 个 `apps/desktop/**` 文件：通用 Work port 类型、demo fixture、composition root 注入、App 机械回放、静态边界门、定向测试与 SPEC。差异中没有 `packages/core/**`、`src-tauri/**`、provider、schema、registry、样式或 PM 代码。

- `WorkCommandPort` 只在 `protocol/client.ts` 声明 `start/resume/cancel` 契约；没有实例、React prop、executor 或 live wiring。
- `App` 不再 import/构造 demo client 或 recordings；`main.tsx` 是 `createDemoWorkFixture()` 的唯一装配点，显式注入 `WorkProjectionPort` 与 fixture-only adapter。
- `ScenarioRunInput`、`inputArtifacts`、`toolInputs`、actor/schema 构造在 React 中均为零；本单没有新增 Tauri command、provider path、localStorage Work state 或 PM UI。
- recording、paced replay、固定 gate、DEMO_ARTIFACTS、review/continuation 与 telemetry 空 sink 全留在 `demo/client.ts`。App 对非 demo case 不调用 fixture；已存在的 chat/provider/Tauri transport 路径相对基线没有语义改动。

### 2. 真实反例与 fail-closed 证据

所有破坏性补丁均用精确 patch 注入并恢复，提交前零残留：

| 反例 | 实测红灯 |
|---|---|
| App 临时回引 `createDemoClient` | `lint:work-port` exit 1，精确报 `App must not import or construct demo recordings` |
| `assertDemoRef` 临时取消 caseId 约束 | 定向 **2 failed / 2 passed**；非 demo case 得以读取 recording，被现有测试咬住 |
| 未知 session 临时回退 S3 recording | 定向 **1 failed / 3 passed**；错误 session 得以回放，被现有测试咬住 |
| 临时取消 requestId → session 归属校验 | 定向 **1 failed / 3 passed**；S1 ref 错读 S3 gate 被新增测试咬住 |
| 临时取消 telemetry event.sessionId 校验 | 定向 **1 failed / 3 passed**；S3 ref 携 S1 telemetry 被新增测试咬住 |

实现原测试已覆盖非 demo case、未知 session、非 demo review/continuation/telemetry/artifact 与 injected fake projection；但未永久锁住合法 demo ref 之间的跨 request/telemetry 污染。验收新增一条用例同时覆盖 S1 ref 读取 S3 gate、S3 ref resolve S1 request 与 telemetry session 错配，提交 `5b3441f26cf9cc6770e94052de79a59e837c7687 fix-by-acceptance(desktop): lock fixture session isolation`。该提交只改测试，不改实现或契约。恢复态定向为 **4/4 passed**，静态门全绿。

fake injected projection 由 `replayWorkProjection` 定向用例实测：查询参数精确传给 fake port，返回 events 只经 injected presenter 发布，phase 原样回传；结合 App 静态门对模块 singleton、demo import 与直接 recording 构造的禁止，证明 UI orchestration 不依赖隐藏 singleton。

### 3. clean 环境与完整机器门

- `pnpm install --frozen-lockfile`：scope **14 workspace projects**、**1047 packages**，lockfile 零漂移，exit 0。
- fresh install 尚无 workspace `dist` 时直接跑 desktop，真实出现 **14 failed suites / 21 passed files / 84 passed tests**，均为 workspace exports 指向未构建产物；随后按仓库拓扑执行 build，同一 desktop 全量转绿。该记录是现行 clean workspace 构建前置，不是本工单回归。
- `pnpm -r build`：scope **13 of 14 workspace projects** 全绿；desktop **3520 modules**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- desktop Vitest：**35 files / 146 tests passed**。
- root Vitest：**120 files / 1078 tests passed**。
- `pnpm lint`：exit 0。
- `pnpm site:guard`：scanner fixtures **12/12 passed**，扫描 **618 active text files**；neutral/elevation/signature/motion 全绿。
- `COURTWORK_E2E_PORT=1604` 完整 desktop `test:e2e`：所有静态/设计/边界前置门通过，WORK-PORT 门通过，假绿守卫确认 floor **208**；Playwright **208/208 passed（1.6m，4 workers）**。配置 `reuseExistingServer=false`，启动前确认 `:1604` 无 listener；未复用共享服务。

完整 Playwright 覆盖既有样板案节奏、artifact 自动开面、S3 gate、逐条/批量 review、确认响应、Context continuation 与跨案件清空/恢复；208 条零回归，证明端口抽离保持 demo UX 等价。

> **最终判定：WORK-PORT-1 放行 ✅。** `c2fcf6c + 5b3441f + 本验收记录` 可进入架构收账；验收提交必须与实现一同合入。下游 **WORK-BROWSER-1、WORK-STORE-1、CASE-ROOT-1 均可放行开工**，但本结论只背书 command/projection 注入缝与 fixture/live 物理分界，不代表 executor、durable store、material ingress、Tauri Work host 或 production live 已实现。

---

## TRACE-UI-1 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与本工单实现，也不是实现会话前身。
- **对象**：精确实现 SHA `cef91484258bd15c9458ef619103e6a1ad3603ec`；任务基线 `bed44095133723d33de3e153b58a286a886a612b`。
- **验收树**：`/tmp/courtwork-trace-ui-1-acceptance`，分支 `codex/accept-trace-ui-1`，直接基于实现 tip 建立；未在实现 worktree 或共享 `main` checkout/stash，未复用共享 dev server。
- **结论**：**✅ 放行。** 无产品代码修正、无契约级问题、无 `[需架构拍板]` 项。

### 1. 同源组件与协议投影

Chat reasoning 与 Work progress 实际共用 `ProcessTrace` 组件、状态并集 `running | settled | empty | failed`、同一 `BrandThinking` 与 disclosure 交互；旧 `ThinkingStream` 已删除，Chat 没有独立 `<details>`。差异 grep 与 DOM/SSR 定向测试共同证明，复用不是只共享类名。

- Chat adapter 只读取 core `TurnProjection.reasoning/status`：pending/running、present delta、completed/failed 与 explicit absent 均作机械投影；`absent` 和空 content 不产生占位或伪文案。
- Work adapter 只读取 `progress/failures/completed/confirmation/phase`；正文只由 progress events 连接而来，不叫 model reasoning。`failed/canceled/interrupted` 优先于 completed/confirmation，因此不会渲染 settled 或完成事件。
- 运行态只含品牌 thinking、正确 mode label 与可选 actions；终态 0ms 移除动画。settled/含正文 failed 才提供原生 button disclosure，键盘 Enter 可展开；empty 零 DOM。

### 2. interaction card 与输入边界

`InteractionTurnCard` 只消费 core `TurnReplay` 中首个 `interaction_requested` 及匹配 requestId 的 `interaction_resolved`；question、options、description、skippable、source anchors 与 recorded answer 均来自不可变 replay snapshot。generic card 不按 Legal artifact/template type 分支，source-open 继续把 snapshot anchor 交给授权路由。

真实 Chromium 计算样式为：background `color(srgb 0.966824 0.977882 0.988941)`（位于 `--generated: #f6f9fc` 与 `--bg-raised: #fff` 的批准混合）、`1px` hairline、`6px` radius、`box-shadow: none`。完整引语正常换行，卡内没有第二层白卡、gradient 或 glow。

### 3. 实际变异与红灯

所有反例均用精确补丁临时注入并撤回；恢复后对应门重新变绿，提交前零产品代码残留。

| 变异 | 实测红灯 |
|---|---|
| Chat 退回独立 `<details className="chat-reasoning">`，Work 退回 `<ThinkingStream>` | `lint:trace` exit 1，命中 Work 所属 turn、Turn adapter、并行实现三项；`lint:chat-ui` exit 1，命中共享 adapter 与 native details 两项 |
| explicit `reasoning.absent` 伪造“无可用推理内容”并投影 settled | ProcessTrace 定向 **1 failed / 5 passed**，精确断言应为 empty 且零 markup |
| stopped Work 在 `completed=true` 时绕过 failed 优先级 | ProcessTrace 定向 **1 failed / 5 passed**，实际收到 settled 而非 failed |
| reduced-motion 下把品牌线动画恢复为 `1s infinite` | 独立端口 Playwright 定向 **1/1 failed**，计算值 `1000ms`，门限 `<= 0.01ms`；撤回后 **1/1 passed** |
| interaction card 改成纯白 raised surface 并加 shadow | `lint:chat-ui` exit 1，同时报 approved generated surface 丢失与 shadow 禁令 |
| generic card 按 `legal.risk-evidence-confirmation` 做领域分支 | `lint:chat-ui` exit 1，精确报 generic chat surface 泄漏 vertical content |
| source quote 改为本地伪造锚点，不再取 snapshot | InteractionTurnCard 定向 **1 failed / 2 passed**，精确缺失 replay 中完整引语 |

### 4. 真浏览器行为核验

在独立 `Vite :16652` 启动真实 Chromium，未复用 Playwright suite 的 browser context；临时审计脚本与服务验后均删除/停止。实测：

- Work mutation observer 捕获精确序列 `running → settled`；终态 label 为 `Work progress`，不是 `Thought process`；toggle 聚焦后 Enter 得到 `aria-expanded=true`，正文为真实 progress event。
- Chat 在途 label 为 `Thinking…`，只有 **1** 枚 `.brand-thinking`，Stop 可见；provider terminal 后同一组件成为 settled，键盘展开显示原始 reasoning delta。
- 第二轮点击 Stop 后 core 收敛为 `data-status=failed`、文案“已停止”，保留“已经到达的部分正文”，且 pending reasoning 没有伪造终态 trace。
- interaction source 逐字显示样板合同快照引语和文件名；卡片实际计算样式与上节 token/框线/零阴影一致。

内置浏览器控制连接在初始化时报 `Cannot redefine property: process`，因此未冒充 in-app computer-use；上述视觉与交互证据来自本验收树独立服务上的真实 Playwright Chromium，并另外生成两张 `/tmp` 审计截图作人工目检，未写入仓库。

### 5. 最终机器门

- `pnpm install --frozen-lockfile`：scope **14 workspace projects**、**1047 packages**，lockfile 零漂移。
- `pnpm -r build`：scope **13 of 14 workspace projects** 全绿；desktop **3521 modules**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- root `pnpm lint`：exit 0。
- root `pnpm test`：**120 files / 1078 tests passed**。
- TRACE/interaction 定向：**4 files / 13 tests passed**；`lint:trace` 与 `lint:chat-ui` 均通过。
- `COURTWORK_E2E_PORT=16651 pnpm --filter @courtwork/desktop test:e2e --workers=1`：全部静态/设计/边界前置门通过，假绿守卫确认 floor **208**；Playwright **208/208 passed（3.6m，1 worker）**，`reuseExistingServer=false`。

操作留痕：第一次定向 Vitest 在仓库根执行时被 root include 规则拒绝为 `No test files found`，改用显式 desktop cwd 后 13/13；第一次 E2E 命令误传额外 `--`，Playwright 启动 4 workers，发现后主动 Ctrl-C（22 passed、4 interrupted），随即换新端口以正确参数完成上述 208/208 单 worker 结果。两者均为验收命令问题，不是产品失败，且相关服务已停止。

> **最终判定：TRACE-UI-1 放行 ✅。** `cef9148 + 本验收记录` 可进入架构收账。下游可以依赖“一个 ProcessTrace、两种机械投影”的共享交互原语，以及 replay-snapshot 驱动的通用 interaction card；本结论不把 Work progress 冒充模型推理，也不扩展任何垂类 schema 或 provider 契约。
