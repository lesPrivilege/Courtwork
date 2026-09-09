# EX-MA-R4 · 现行设计语法约束（Luna 只读回执）

只读 `engineering/`、`tools/`、`app/web/styles.css`。钉在 `5b405b3`；其后两提交 `a274cc8`、`b4e3f71` 为纯文档交接，不新增裁定。

## 一、产品面身份（决定这不是"另做一个聊天产品"）

- 单一常驻全局 Attention：`design/attention-agent-2026-09-10/README.md:7`。它**覆盖**了 `construction-handoff.md:11` 的 peer-Chat 方案（该文 :5-7 自陈被覆盖）。
- 故 Thread 消费面是**单一 Attention 的一种对话表现**，坐在既有对话壳内，不得另起入口、另起消息列表控件、另起 composer。
- MA-D14（`research/multi-agent-2026-09-10/README.md:24`）把 Chat flow UI 判给单独任务：这是"谁可以建"的程序门，本轮认领即接此门。

## 二、对本消费面直接生效的规则

**材质**：产品阅读面为中性实色，层级先由几何/字号/分组建立（`material-grammar.md:7`）；glass 只用于短时浮层，非默认（:8）；**消息流／长文／证据／diff／表格一律实色**（:41）；不得 glass 叠 glass、不得在长文上加模糊（:12）；`backdrop-filter` 不参与动画（`atlas/README.md:38`）。今日仅两个已登记模糊消费者。

**颜色**：三层治理 Scale→Role→Usage，组件只引 Role（`contracts/color-governance.md:5-13`）；四层高度 L0/L1/L1 内收/L2/L3，区域底色只从层角色取（:63-77）；用户气泡属 L1 内收（:73）；状态色仅 `failed`/`waiting_user` 两种（:16）；**状态事实不得只靠颜色**（`frontend-layering-spec.md:123` FN-28）。

**字形**：Lucide 1.41.0 的 24 图标子集是唯一在产家族，冻结（`design/icon-controls.md:47`）；MingCute 仅候选；字形不得单独承载状态（`atlas/README.md:80`）；IC-1 优先级表——Close/Expand/Back 用图标，Send/Cancel 图标可选但不得改状态机，**Answer/Allow/Deny 必须有文字，不得纯图标**（`icon-controls.md:5-15`）。

**浮层**：同一视觉方向不等于同一交互契约，先分类再选族（`disclosure-overlay.md:5-20`）；**点击外部不得隐式丢弃草稿**（:15）；拒绝万能 Dropdown（:5）；只有真的模态遮断才配 scrim（`material-grammar.md:9`）。

**投影不得创造事实**（`atlas/README.md:42-44`）：服务端 UTC 时间戳原样透传，adapter 不算"多久以前"；缺失事实是显式 `null`，不是 `0` 或 `""`；adapter 是纯函数，不取数、不缓存、不 `Date.now()`、不覆盖服务端顺序；没有 unit/scope/timezone 就不投影，**形态不得强于事实**。五条负规则按证据强度分记，不得简写为"四条全过"。

**气泡**：右对齐、有界、不对称圆角、中性次级面、助手侧不做镜像气泡——已实施，见 `app/web/styles.css:5532-5539`。用户记录不可变，Edit 产生新消息。

## 三、CF-01–10 的实际状态

**仓内没有逐项编号的 CF 裁定表**。`design/chat-flow-2026-09-10/README.md` 是该批唯一入库文件，以整段散文裁定，用户原始编号材料未入版本控制。可核到的分层：

- 已实施（`ee6df72`）：右对齐气泡、去掉 composer 旁重复的终态 Run 状态、会话管理并入既有 Session owner。
- 已采纳未实施：作者 Markdown 的 source/copy/edit 分离、长输入折叠、工具活动在一条回复内成组、问答与权限的独立状态与回执、来源/产物控件归属其对象、Stop 归 composer。
- 明确不可用：**CF-10 Queue/Steer**，需另立 runtime admission/receipt 合同。Regenerate 须有真实替代回复身份，不得贴在普通追加 Run 上。
- 截图只是交互/布局参照，不构成能力或 provider 事实。

若需逐项可追溯，须请用户把原始编号材料入库——Luna 标为应升级处置项。

## 四、机械检查

- `tools/lint-colors.mjs`：`tier:S` 之外的颜色字面量即错；`background` 须落在固定角色集或在 `FILL` 表登记。经 `tests/color-governance.test.mjs` 进入 `npm test`。
- `tools/lint-materials.mjs`：`backdrop-filter` 限 `REGISTERED` 选择器与 `--blur-chrome`/`--blur-transient`；用 `--glass` 或 `backdrop-filter` 者须还 `prefers-reduced-transparency` 兜底。经 `app/tests/material-governance.test.mjs` 进入 `npm test`。
- `tools/contrast-report.mjs`：约 19 组角色对 × 两皮肤 × 明暗，文本 ≥4.5:1、非文本 ≥3:1；**这是暗色与备用皮肤唯一被检查的地方**，新角色不入其 `pairs` 数组就完全不被检查。
- `tools/check-doc-links.mjs`：只在 `.github/workflows/pages.yml` 里跑，且该 workflow 仅由 `site/**`、`README.md`、`app/web/styles.css` 等窄路径触发，不是普遍 PR 门。
- `tools/lint-shapes.mjs` 与 `tools/lint-interaction.mjs` **在 `5b405b3` 不存在**，属未交付工单，不得当作现行门。
- 总体：这些检查**不在通用 CI 上**，靠工单作者自跑并在交付文档中引用输出、再由独立复核者复跑。

## 五、冲突与应升级项

1. CF 编号材料未入库，逐项可追溯性无从核对。
2. **FE-05a（字号/密度 V1 值）已选未实施**，派单模板里还是 `<BASE>` 占位。本轮前端只能继承当前字号与控件高度，并继承 M-16/M-17 的 composer 图标裁切缺陷，不得假定 V1 值已生效。
3. **写权序列**：Home backlog 单一 writer 正处队列中段，Thread 消费面根本不在那张队列上（它是 MA-D14 判出的单独任务）。它是排在该队列之后，还是另开隔离工作树后合入，**账上无裁定**，须先定。
4. WK-142 授权 scope 可视化被后端 grant scope schema 卡住，不得临时自建。
5. Attention typed actions（resolve/snooze/set_waiting）只有后端合同，前端未建，属 ATT-FE-01 未派单元；本消费面不得声称这些动作存在。
6. 五条交互负规则与整张材质组件映射表今日**只有人工复核**，无 lint。
7. `presentation-primitives.d.ts` 名不副实（WK-148），以代码为准。
8. `ui-controls.mjs` 的 `el()` 与 `app.mjs` 内的 `element()` 两个建元函数并存，新 lint 或新家族切换须同时覆盖两条路径。
