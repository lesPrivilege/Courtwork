# return-ui-followthrough-v1 · Claude · 单红 diff、Settings、Chat 与 Pages 串行返回

作者：Claude（Fable 5.1）· 2026-09-11 · 工单 `engineering/release/claude-ui-followthrough-2026-09-11/ONE-SHOT.md`。三阶段一次返回；作者检查 ≠ 独立接受；本地候选 ≠ 合流/部署。无新后端能力、无外部消息、无部署。

## 现场与基线

| 项 | 值 |
|---|---|
| 输入基线 | CourtWork `26d949b7a24b06b3280b0a3d19f721a76b9b5aef` |
| 共享 checkout | HEAD `803cd2a`（26d949b 之后 5 条均为 docs/brand：Paper v1 接收、单红裁定、品牌红统一）；`app/`、`site/`、`tools/` 与 26d949b 相同；共享工作区他人未提交文件未触碰 |
| 隔离施工 | `git worktree add` → scratchpad `uifw-v1/cw`，分支 `claude/ui-followthrough-v1`（基于 26d949b） |
| 固定提交 | `257f3de` 阶段 1 → `44aa938` 阶段 2 → `f4dca5a` 阶段 3（`patch/0001…0003`，`git am` 可应用于 26d949b） |
| 参考 | Motto `a510036` `diff.ts` 仅作显示语义参考（词级只在单删单增、多行回退、± 保留）；未移植 ANSI/inverse；用户两张截图固定三级层级 |
| 基线对照实例 | 另一只读 worktree `uifw-v1/cw-before`@26d949b，端口 8847（截图 `shots/before-*`） |

## 阶段 1 · 共享 diff renderer 与 Settings 同步预览（`257f3de`）

变更记录（frontend-contract change-template）：

```text
Task / scope: 提取纯展示 diff renderer；Settings Appearance 预览改为消费它
Base SHA: 26d949b7 · branch claude/ui-followthrough-v1 · 隔离 worktree
Writer: Claude · reviewer: Astra（待）
Owner fact + contract: 无新事实；显示样例，无 file-diff 请求，不表达接受/拒绝（output.review canonical 不变）
Semantic / projection / control / placement: Visual + Projection（纯函数投影行模型→DOM）；无新控件
Nearest precedent: app/web/settings-view.mjs appearancePreview()@26d949b；app/web/styles.css .diff-line@26d949b（success/danger soft 底）；tools/lint-colors.mjs FILL 表；--attention-review 的 tier:S/R 登记方式
Evidence type: implemented precedent
Governance status: candidate（本包）
Kept relationships: ± 与行号为文本；转义靠 textContent；Settings 保存/重置/live preview 原行为；skin 不改 Review
Intentional changes: 取消绿色与整行底色；旧行/上下文灰字；新行红字；仅新增词段红块深字；删除词段灰块（--selected）；摘要行 "N added, M removed"
New terms / roles / tokens: tier:S --diff-change-foreground/-block/-block-ink（浅 #a13c36/#dd7068/#172025，深 #e28b83/#d4685f/#11171b）；tier:R --diff-add/--diff-add-mark/--diff-add-mark-ink；FILL 登记 .diff-add-word；contrast pairs 4 对（工具与 settings-view CONTRAST_PAIRS 同步）
Reuse / variant / grammar gap: 新 renderer 模块（app/web/diff-view.mjs）+ fixture（diff-fixture.mjs），静态白名单登记
Skin / review / deterministic colour impact: diff 角色独立于 danger/success/attention-review；forced-colors 下新增词段 Highlight/HighlightText，删除词段描边
Exceptions: 无
Fixture: app/web/diff-fixture.mjs（notice.md 6 行：上下文、单删单增词级、上下文、纯新增）
Checks: node --test app/tests/diff-view.test.mjs 5/5；lint-colors ok；contrast-report 4 对 ≥5.0；lint-interaction ok；lint-shapes ok（border-radius 改 --radius-small 后）
```

fixture 覆盖核验（renderer 单元测试 + 截图）：长行（Settings 窄屏内 pre 横向滚动）、无变化（"No changes."）、纯新增（整行红字无块）、多行替换（回退整行）、HTML 字符（textContent，无 `<b>` 元素）、无末尾换行（"\ No newline at end of file" 行）、空输入（"No lines."）。

## 阶段 2 · Chat 入口 / CA-01（`44aa938`）

```text
Task / scope: 左侧 Home/Attention/Spark 同层增加 Chat 位点
Nearest precedent: app/web/index.html nav-home 按钮组；app.mjs goHome / selectSession / selectProject / aria-current 渲染（3200/3230 行附近）
Semantic: Chat = 普通对话位点；不新增 session runtime、personal context 或 provider；Attention 助手实际名称 "Attention · Your global assistant"（attention-agent-view.mjs）保持
Projection / Control: 普通 button，无 tab roles（导航按钮非互斥 tabpanel）；aria-current 与 Home 同规则
Behaviour: 已在会话 → 关导航、焦点回 composer（不 renderAll）；Settings/Attention 覆盖在会话上 → selectSession 同 id 路径关闭覆盖层；否则活动项目（或已展开项目）最近会话 → selectProject/selectSession；再否则 goHome（Home composer 即现有空聊天入口）
Not done: 不自动创建 project/session（New chat 保持原对话框）；不迁移 Attention 对话；不改 Core/Runtime/权限/队列/memory
Overview / work-surface 两个 header 入口: 未动
Checks: app/tests/chat-entry.test.mjs 2/2（源级：顺序、无 role、无 startNewSession/openDialog/request）；浏览器探针（tools 记录于 verification/probe-*.txt）：空数据→Home composer 聚焦、无对话框；有 session→"Sample chat" aria-current=page；经 Attention 对话框与 Home 往返后草稿 "draft kept?" 保留、焦点回 composer；Tab 顺序 workspace-home-link → New chat → Home → Chat → Attention → Spark → New project
```

## 阶段 3 · Settings 主展示与 Pages 同语言（`f4dca5a`）

- Settings Appearance 预览重排：diff 先、`ws_write · notice.md` 工具行后；同 renderer 同 fixture，无第二副本；未新增设置值/开关/schema。
- Pages：`site/scripts/render-diff-figure.mjs` 从同一 fixture 与 `diffModel` 生成 `site/src/assets/figures/change-language.svg`（每段 `textLength` 精确，仅 class 钩子）；site.css 增 `--campaign-diff-change/-block/-block-ink` 与 `.fig-diff-*`；figures.json 登记（status concept，grammar plate，`geometry: browser`，`red: null` + `diffAccent` 说明）；pages-map `change-language → review.open, file.object`；挂载于 Review 段 `.note` 之后、"待人审阅" 之前，图注写明"显示样例，不是已接通的工件比较"。
- 未重开 Home/Tour 主体；未把样例称真实 diff 能力。

## 检查

| 检查 | 结果 | 证据 |
|---|---|---|
| `npm --prefix app test` | 首轮 771/774（3 失败：shape lint 游离 2px、CONTRAST_PAIRS 未同步、semantic-guards figures 计数）→ 修后 **774/774** | `verification/app-test-run1-before-fixes.log`、`app-test-run2-final.log` |
| lint-colors / contrast-report / lint-interaction / lint-shapes / lint-materials / check-doc-links | 全部 ok | `verification/*.txt|md` |
| site build / check-figures / check-links / check-material / check-pages-semantics | pass | `verification/site-check-*.json`、`check-pages-semantics.txt` |
| site verify.mjs（浏览器，含真实字形图几何/对比/红登记） | 首轮 49/54（change-language 块 rect 左溢 2px 与前文重叠）→ 去除出血后 **54/54** | `verification/site-verify-run1/`、`site-verify-run2-final/` |
| 截图 | Settings Appearance 1440/1280/390 × 明暗 + 720×DPR2；导航会话态 1440/1280 明暗、390 展开明暗；相邻面 Attention 对话框、Spark、Settings General；Pages Review 段 1440/1280/390 × 明暗；before 三张 | `shots/` |

**既有失败说明**：`app/tests/semantic-guards.test.mjs` 在基线 26d949b 已失败（期望 figures 10，实际 14）；本单新增一图后更新期望为 15，不是为本单改断言，原失败在 `verification/app-test-run1-before-fixes.log` 与基线复跑中可见。

**200%**：以 720px 视口 × DPR2 设备尺度模拟，非原生浏览器缩放。**键盘**：导航 Tab 顺序与 Chat 探针为真实浏览器；Settings 返回焦点、Escape 未重测（未改）。

## 未测 / 能力缺口

- 原生 VoiceOver/NVDA、IME、forced-colors 真实渲染（仅 CSS 映射）、实体打印。
- 真实 file-diff 工件比较 pane：未实现（工单排除）；后端 `file-diff` 的 codepoint-prefix-suffix-v1 → 行模型转换属另单。
- Pages 发布：本地构建与验证，未部署；`site/verification/*.png` 基线未替换（verify 写出的页面截图已还原）。
- Chat 位点在无任何项目时只能落 Home；纯 Chat provider/personal context 仍是规划。

## 语义疑问

1. Pages 图的红是 diff 强调 token，不是 VG-15 attention 红；registry 以 `red: null` + `diffAccent` 登记，check-figures 通过。若 Astra 认为红规则应把它计入"每图一红"，需扩展 figures.json 语义。
2. 删除词段用 `--selected` 灰块（参照截图的灰底）；若希望更淡可改 `--hover`。
3. 摘要行 "N added, M removed" 为可访问文字等价；是否显示在 Settings 预览内由 Astra 裁。
