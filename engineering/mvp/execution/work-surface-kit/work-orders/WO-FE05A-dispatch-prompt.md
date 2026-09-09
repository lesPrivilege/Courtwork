# FE-05a 派单提示词（Fable，2026-09-09；以 `opus-wo-low` 派出；待 Astra 合流 CC-D0-a 后建树、填基线 SHA、原样派出）

派单方式：Agent 工具，`subagent_type: opus-wo-low`（effort: low），后台运行。派出前 Fable 做三件事：`git worktree add <isolated-checkout> -b claude/fe05a-type-density <合流后 main>`；`mkdir /private/tmp/se-agent-fe05a-data`；把下文两处 `<BASE>` 换成该 SHA。端口 8909（fixture 8910）当前空闲，派出前再 `lsof` 一次。

---

你是 Claude Opus，CourtWork 前端的单一 writer，执行第五轮工单 FE-05a（字阶与控件密度 V1 + Shape 落地）。Fable 派单，Astra 独验与合流；你只做作者验证，不自称独验。

## 树、分支、端口
- worktree（已建好，基线 main `<BASE>`，含 CC-D0-a）：<isolated-checkout>，分支 `claude/fe05a-type-density`。只在这里工作；不碰 . 或其他树。
- 应用端口 8909，数据目录 /private/tmp/se-agent-fe05a-data（已建、为空，可建子目录）；MCP 线路 fixture 用 8910；CDP 端口自选 20070 起。结束后停掉自己的全部进程。8850–8861、8810、8817、8818、8887–8907、8921–8953 是别人的，不动；起服务前先 `lsof -nP -iTCP:<port> -sTCP:LISTEN`，被占就停下记录，不要换端口试探。
- 不读取任何凭据文件；全程 local-fake / loopback。

## 先读（顺序，均在你树内，除注明者）
1. engineering/mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md §FE-05a —— 工单全文（第 0 / 0 补充 / 0b 项与主项）。
2. engineering/design/type-density-constraints.md —— §2 约束（两张变体共同遵守，含"按钮完整可读"硬约束）、§3 **V1 目标值**（本单只落 V1：用户已于 WK-123 (b) 选向，不出 V2）、§4 消融面、§5 不做。
3. engineering/design/type-density-ablation/v1/README.md + 四页 + `measurements-v1.json` —— 你的对照基线（1:1、深色、390、命中区四项前置已闭合，WK-132）；产品落地后的数值须与之对得上，对不上要解释。
4. engineering/mvp/execution/work-surface-kit/intake-round-3.md：§4y WK-120（成熟感 = 密度 + 留白对齐 + 层级）、§4ab WK-123 (b)（选向 V1 与四项前置）、§4ae WK-126 ⑦（M-15）、§4ag WK-128（Shape 落地八条：①②③⑤⑧ + lint-shapes + SHAPE 断言进本单；⑥ 28 高控件 `--radius-control` 8 不变；⑦ circle 只给 composer 唯一浮动主动作）、§4aj WK-131（M-16）、§4ak WK-132（M-16 / M-17 修正方案）、§4aq WK-138 ②（M-18）。若某节不在你的树内，只读 <isolated-checkout> 下同路径；不要写那棵树。
5. engineering/mvp/execution/work-surface-kit/explore/ex-cs1-shape-grammar.md §1–§6（radius 审计表、三处 concentricity 违例定位、lint-shapes 规则草案；§7 specimen 与 `corner-shape` 不在本单）。
6. engineering/mvp/execution/work-surface-kit/misfit-ledger.md M-15 / M-16 / M-17 / M-18；delivery-cc-d0a.md（体例与 §16 复核格式）与 contracts/home-modules.md §2（HOME-16 首屏余量门）。
7. 代码：app/web/styles.css（`:root` 字阶 token、`--control`、`.segment`、`.icon-only`、`.text-button`、`:focus-visible`、53 处 `border-radius`）、app.mjs 的 B 态顶带（`surfaceViewSwitch` 附近）与 composer `setAction` / `renderComposer`、settings-view.mjs（三档 `--text-scale`）、tools/lint-colors.mjs 与 lint-materials.mjs（新 lint 的样板）、evidence/cc-d0a/ 的脚本作为回归底本（composition-checks 含 HOME-1…16、SETTINGS-*、WORK-*、SHELL-1…5）。

## 做什么
0. **第 0 项（M-15 / M-16 / M-17）**：B 态顶带内容对齐文档面左缘（gutter），沿 CC-S Settings 顶带做法，断言一条；Send / Cancel run 渲染文字时不带 `.icon-only`（`white-space: nowrap` + 恢复 padding 5×10 + 静止标签量得的 min-width，`renderComposer` 重绘后图标身份、accessible name 与 tooltip 保持，断言一条）；`.segment` 纳入 390 的 44 规则（断言一条）。
0b. **第 0b 项（WK-128 Shape 落地）**：三处沉睡 concentricity 违例改显式派生值 `calc(var(--radius-x) - <inset>)`（popover → context-row、composer 外壳 → `#composer-input`、dialog → content well）；`.context-group` 拆两类名；circle 统一 `--radius-pill` 禁 `50%`（显式规则注释：只给 composer 唯一浮动主动作，icon 按钮默认 rounded-rect）；`:focus-visible` 一处规则派生 offset 2 / radius = 组件 + 2；`6px` 写作 `calc(var(--radius-control) - 2px)`；新增 `tools/lint-shapes.mjs`（禁游离 `border-radius` 数值，允许 token / 0 / `calc(token ± px)`，入 `npm test`）；composition-checks 新增 SHAPE-1…（父子实际 radius 与 inset 实测）；ui-composition-standard 尺寸表登记五个 shape 角色 → token（WK-125 (b)）。`--radius-control` 8 不随 28 高联动（WK-128 ⑥）；`corner-shape` 不进本单。
0c. **第 0c 项（M-18）**：HOME-16（Modules 态 900 高首屏余量 ≥ 12）在三档 `--text-scale` 各跑一次；大字号过不了时**不做**自动折叠，把实测高度与内容反例写进待裁定，`HOME_COMPOSER_CENTRE` 0.56 由 Fable 显式修订。
1. **V1 落地（一次一维：只动字阶 / 字重 / 字距 / 控件高 / 行高）**：按 §3 V1 列改 `:root` token（title 18/500、navigation-title 15/500、reading 15 不动、body 14 不动、section 13/500、label 12/450、meta 11.5/400、caption 10.5/450 大写字距 0.08em；桌面 `--control` 28、按钮字号 → `--text-label`、primary 550 → 500；segment 26；meta / caption 行高 1.45）。三档 `--text-scale` 比例不变；390 与触控 44 不变；不引新字体；颜色 / 材质 / 动效 / 间距 token 不动；WK-69 层级与 WK-94 边框角色不动。若 `--muted-strong` 在 11.5 / 10.5 下对比度不足 4.5，改色阶不加粗，并记录改了哪一阶。
2. **消融面**：Settings › General、Work 头部 + composer（1440 / 390，浅深两宗，1:1 不 zoom）各出"现状 / V1"对照截图与 measurements；逐项写"哪一层级因此更清"。
3. 断言：既有全量不放宽；新增 TYPE-1…（token 值、按钮无折行、Send 52 / Cancel run 84 min-width 或实测值、contrast ≥ 4.5 全表）、SHAPE-1…、HOME-16 × 三档；五轮收敛表（Settings / Work / Home × 1440 / 390）；anti-slop 门（尤其"靠缩小文字完成缩小"、用框线补层级）。

## 写权与禁令
- 可写：app/web/**、app/tests/**、tools/lint-shapes.mjs、engineering/design/ui-composition-standard.md（尺寸表两处：字阶行与 shape 角色行）、copy-convention.md、text-sweep.md、delivery-fe05a.md、evidence/fe05a/（仓根）。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约、contracts/*、intake、misfit-ledger；不新增读取、端点、字段、状态；不引依赖；不引新色、新字、新图形、新材质；不做 V2；不做 `corner-shape`；不改 0.56。

## 交付
- 提交到 `claude/fe05a-type-density`，显式路径 git add；提交信息末尾加 `Co-Authored-By: Claude Opus <noreply@anthropic.com>`。
- 写 engineering/mvp/execution/work-surface-kit/delivery-fe05a.md，体例沿 delivery-cc-d0a.md：基线 SHA、commit 表、改动文件、token 前后表、消融表、五轮收敛表、状态矩阵（按钮 icon / label 槽位、segment、focus ring）、text-sweep 增量、断言原文（TYPE / SHAPE / HOME-16×3 / 既有全量：RC 三支、composition、shell、Models、探测、primitive、cc-s / cc-w / cc-d0a checks、FE-T01 / T03 / T06 / T07 / T11）、对照 v1 基线的差异说明、未检项、待裁定、"哪一像素改变了哪一判断"、anti-slop 门自查。证据放 evidence/fe05a/。
- 作者验证至少：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/lint-shapes.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本沿 evidence/cc-d0a/ 的方式逐字复制只改端口。视觉四轴留用户。
- 冲突或缺口：记入"待裁定"，选最保守实现继续，不停工。

最终回复只需：分支头 SHA、delivery-fe05a.md 路径、验证结果一行、待裁定项列表、未做项与原因。
