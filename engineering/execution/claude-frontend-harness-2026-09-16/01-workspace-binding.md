# 01 · 连接并读到真正的仓库

2026-09-16 · Claude（Fable 5.1）作者与裁决；Sonnet 5 承担只读探索与两段有界后端实现。owner 事实回写见 [RD-006 · 2026-09-16 节](../../research/RD-006-deferred-workspace-binding.md)；本记录按[变更记录模板](../../design/agent-interface-2026-09-10/change-template.md)登记施工与证据。

```text
Task / scope: RD-006 DWB-01/02 接续 + 第三片 GUI（Workspace 连接/范围/撤权）；DWB-04 写入面留 02
Base SHA / branch / isolated checkout: main f76dd7e / claude-frontend-harness-20260916 / Projects/.worktrees/courtwork-claude-harness-20260916
Writer / reviewer: Claude（Fable 5.1）作者；Sonnet 5 有界实现（c8ac6fb、14dc9ae）；非作者复核与人的目验未做

Owner fact + contract: app/docs/repository-binding.md（Session 至多一个外部目录、requestId/expectedRevision 幂等、Run 冻结快照、撤权取消）；RD-006 2026-09-14 三片裁决
Semantic / projection / control / placement: Workspace = 真实目录绑定（copy-convention §3.1）；composer 上方实色页签（Workspace chip · Local · Branch）；同名卡片 popover；开工后入口移到 This chat 概览
Affected UX rule IDs: UX-02（范围与后果留在动作旁：Read only、Nothing is uploaded）、UX-03（chip 是 button，Local/Branch 是事实不是开关）、UX-05（Branch 只在 Host 读到时出现）、UX-06（Disconnect 有真实撤权合同；Remove 只清草稿）、UX-07（页签不占 composer 行，开工后离开）
Action result / feedback / recovery / draft and scope identity: 绑定命令后读回 Session；失败 inline-error 保留输入；同路径重试复用 requestId；Home 草稿随 Home draft 持久化，首次发送先绑定再开 Run，绑定失败保留 Chat 与输入
Nearest precedent: settings-view.mjs renderConnectionCard / segmentedPermission（卡片分组、"Available after this run ends."）；local-extension-view.mjs（Host 路径输入、inline-error、焦点保持）；app.mjs openConnectionCard + anchorPopover toggle 接线；固定 SHA f76dd7e
Evidence type: implemented precedent
Governance status: candidate（无非作者复核，无人类视觉接受）
Kept relationships: composer 控件行（附件 · Project · File access · 模型 · Send）不变；File access 三值不变；managed workspace / ws_* 不变；Run 期间绑定不可变
Intentional changes: 新增 composer-context-strip 与 workspace-popover；Home Project 选择器标签 Workspace→Project；"No workspace"→"No project"；registry 新增 workspace.connect / workspace.disconnect，workspace.object owner 指向 repository-binding

New terms / roles / tokens / primitives / dependencies: 词：Choose workspace · Open folder… · Connected before · Enter a path instead · Branch · <名>（copy-convention §3.2b）；class：.composer-context-strip .context-tab .context-chip .repository-recent；无新 token、依赖或框架
Reuse / variant / grammar gap decision: gap 为"连接目录"词族与承载面（00 记录）；在 copy-convention 与 registry 各补一处后实现；chip 复用 quiet 控件密度，卡片复用 context-card / data-list / inline-error
Skin / review / deterministic semantic color impact: 页签用 --panel-muted 与 --radius-container，无新色；Review 语义无关
Exceptions: 无

Fixture and setup command: app/tests/fixtures/synthetic-repo/create-synthetic-repo.mjs（两次提交、一个必失败测试、KNOWN_BUG 一行修复）；浏览器验证用 node server/index.mjs --data-dir <scratch> --port 8861，Local test provider
Affected scene + nearest adjacent scene + full composition: Home composer（页签 + 卡片）；Chat composer（有 Run 时无页签，This chat 概览 Workspace 行）；同一 Chat 内 repo_read/repo_grep 工具行
Viewport / scheme / keyboard / failure / zoom / fallback coverage: 浏览器目验 ~800 宽与 390 宽、明暗；键盘焦点：卡片开启落到首个命令，命令后焦点留在卡内（源码与单测，未做读屏）；失败：空路径、Host 400、取消对话框、501 无对话框；200% zoom 与 1440/1280 未做
Checks: 见下
Visual change: 有；未保存 PNG，事实以本记录与作者目验文字为准
Author checks: 见下
Independent review: 无
Remaining work / accepted-baseline decision: 见下
```

## 施工顺序与提交

| 提交 | 内容 |
|---|---|
| `ab4b93d` | 从 Codex 会话日志重建的 RD-006 在途树（schema 15→17、`repo_*`/`candidate_*`、`repo_write`/`repo_diff`），26 处修改与 11 个新增 app 文件与原审计逐文件同数 |
| `c8ac6fb` | 逐路径披露修复：`createPathAdmission()`，聚合读取按文件取最严裁决并计数排除（Sonnet 5，Fable 裁定） |
| `783a6f4` → `3f23780` → `c9277f1` → `(本片末)` | GUI：先在 composer 行加 Repository 按钮，随用户三条中途指令改为 composer 上方的 Workspace 页签、原生选目录、Connected before、开工后只留 composer；Workspace 语义收敛 |
| `14dc9ae` | Host 辅助接口：`POST /host/choose-directory`、`GET /repositories/recent`、`GET /repositories/inspect`（Sonnet 5，Fable 规格） |

用户中途指令逐条处置：Open folder 与已登记目录 → 采用（卡片主动作 + Connected before）；类 Codex 的 workspace/Local/tree 条、开工后不显示 → 采用（页签 + 概览行）；运行中更简洁 → 与前项一致，Run 中 composer 只剩既有控件；页签独立卡或 blur → 采用独立实色卡，不用 blur（连续性规范限 blur 于滚动 header）；页签不要框线、口号不必常驻 → 采用（--panel-muted 色阶、有保留 Chat 时不显示口号）；"新版太小、回退上一版"→ 已回退到等宽页签尺寸（`246b04b` 的内收与压低撤销），窄视图有页签时去掉 composer 的浮层阴影，分层只靠色阶；"卡片略小于 composer 以显示层级、图标略小"→ 页签两侧各收 12px、高度不变，图标 16→14。命名保留 Fable 裁决：外部目录为 Workspace。开 02 前的三处 Home 收敛：窄屏停靠的 composer 带改为 chrome 层玻璃（登记 `.composer-area`，reduced-transparency 回退实色，去掉顶部线）；Home 模块带页脚删掉 Connections（composer 的 Model & effort 已通往同一目的地）；Hide/Show modules 改为只画披露箭头，词进可访问名与 tooltip。

## 作者检查

| 检查 | 结果 |
|---|---|
| `node --test tests/repository-binding.test.mjs tests/repository-candidate.test.mjs tests/runtime.test.mjs tests/durability.test.mjs` | 43/43（含新增 8 项：逐路径 deny/ask、picker、recent、inspect） |
| `node --test tests/workspace-card.test.mjs tests/composer-access-placement.test.mjs tests/home-presentation.test.mjs` 等定向 | 25/25；卡片 10 项用 tiny-dom 覆盖 Open folder / Connected before / 路径回退 / 草稿 / 撤权 / 活动 Run |
| `npm test`（Node 25.9，并发 4） | 1086 项中 1085 通过；唯一失败为并发下 `review-core-client-lifecycle` 的 Core bridge ready 超时，与 00 片恢复树同一抖动，单独重跑 13/13，未改任何 Core 代码 |
| `npm run smoke` | 通过（local-fake，realProvider 未运行） |
| `node tools/product-semantics.mjs` · `check-semantic-consumers` · `check-product-copy` · `lint-interaction` · `lint-colors` · `lint-shapes` · `lint-materials` | 通过 |
| `node tools/check-doc-links.mjs` · `git diff --check` | 通过 |
| 浏览器目验（Local test provider，合成仓库） | Home：选 Connected before 一行 → 草稿 → 发送后 Chat 已绑定，`/fixture script` 的 `repo_read` 成功；Chat：页签隐藏，This chat 概览 Workspace 行 → 卡片 → Disconnect → 概览回到 Choose workspace，刷新后一致；明暗、390 宽页签与卡片可读。原生对话框未在浏览器里触发（会在用户桌面弹窗），以 Host 测试钩子覆盖 |

## 未完项

- Linux 原生对话框（501 退回路径输入）；Windows 未考虑。
- 非作者复核与用户目验：1440/1280、200% zoom、键盘/读屏走查未做。
- `repo_write` 批准卡、candidate 面与 diff 打开属 02 片；Work 面板"Browse workspace"等托管目录文字属 10 片。
- 页签在有 Run 的 Chat 里不出现，但侧栏 New chat 建出的无 Run Chat 会出现；该路径未目验。
