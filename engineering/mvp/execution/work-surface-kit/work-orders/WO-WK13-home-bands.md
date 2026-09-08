# WO-WK13 · Home 三带、表示原语 adapter 与键盘导航（Claude Opus）

2026-09-08。依据 [EX-WK7](../explore/ex-wk7-frontend-consumption-diff.md) §2–§3 局部 1 / 2 / 8：`presentation-primitives.d.ts` 在 `app/web` 零消费，Home 仍为单列行表，j/k 零实现。裁定来源：WK-32 / 34 / 37 / 46 / 56 / 76 / 79 / 80、WK-4 与 [review-projection §6](../contracts/review-projection.md)、DC-2 / DC-3、[boundaries §5](../../../../design/work-surface-boundaries.md)。基线 `main` `8023e1b`，接单重查 HEAD；排在 WK10b 第一段之后、WK12 之前（同写 `app.mjs` / `styles.css`）。

## 交付

1. **三带版式（WK-32 / 46 / 76）。** Home 主区分上带（≤ 160）、中带 composer（保持 64–160 输入区、框外状态句与上下文行）、下带（吸收余量）；侧栏不变。1440 与 390 两档；390 上带三 tile 改两行。
2. **上带 StatTile × 3（WK-37）。** Waiting for you / In progress / Needs a look，取 `work-summary` 三集合 `total`，窗口 "current"，无"今日"口径；tile 点击 = 下带筛选到该集合（DC-2 允许重叠）。Heatmap 位置为一行 Planned 文字（"Activity by day · backend pending", WK-27 / WK-80），不画假格子；BE-1 / 3 交付后另单。
3. **下带 WorkCard 两态（WK-56）。** 行态 = 现有 `.home-row`；卡态 = 复用 `surface-modules.mjs` 的 `railCard` anatomy（icon 16 + 标题 + 一个状态词 + 一个动作），同一 `WorkCardInput` 字段集，只画已记录字段（DC-3）；分页、错误、空态三者区分（WK10b 原第 2 项移入本单）。
4. **adapter 落地（WK-34 / 80）。** 新建 `app/web/presentation-adapters.mjs`，实现 `toStatTiles` / `toWorkCards`（签名沿 `contracts/presentation-primitives.d.ts`），Home 只经 adapter 取数；Run / File / Workspace 三模块本单不改，只在文档登记其手写 adapter 与契约的字段对应，后续单迁移。服务端静态 allowlist 需加该模块：向 Astra 提交明确路径请求，不自改 `app/server/index.mjs`。
5. **键盘（WK-4，review-projection §6 已裁定采纳）。** Home 下带与会话内 pending 卡：`j` / `k` / `↑` / `↓` 移动焦点，`Enter` / `o` 打开；焦点在输入控件或 IME composition 时不拦截；不引入 `a` / `d` / `x` 等批量键。
6. **绑定面顺序（WK-85 第 2 条）。** `#binding-panel` 两段按数据排序：项目内已有工作时 Continue existing 在上、Create new 在下；无工作时只显示 Create new 与一句条件句。不改两段内容。
7. **文档。** `docs/ui-composition.md:21` 的 "Navigator | Work | Inspector" 改写为主区 + 悬浮工作面（WK-72，EX-WK7 局部 9）；Home 段按三带更新；`text-sweep.md` 追加本单新增字符串三列。

## 不做

- 热力图格子、日历、任何未记录字段或百分比（WK-80、DC-3）。
- Home 品牌符号（WK-32 取消）、accent 超过每屏 3 处（WK-36）。
- 改 Chat Flow 卡片、glyph、热插拔（WK10b）；改 Settings（WK12）。

## 验证

- 1440 / 390 × 浅 / 深：三带几何、tile 与行 / 卡切换、Planned 行文案。
- 键盘：j/k/↑/↓/Enter/o 全路径；输入框内不拦截；读屏对 tile 的 accessible name（集合名 + 计数）。
- 现有 Home 回归（`evidence/final-integration-20260908/home-checks.mjs` 与几何脚本）通过或按新版式更新断言并说明；`npm --prefix app test`、`lint-colors` 通过。
- 消融表：上带、每个 tile、卡态、键盘各一行"删除后失去什么判断"。

## 交付物

固定 SHA、受影响文件、同条件截图、消融表、allowlist 路径请求、未检项（触控 / 读屏 / 真实 provider 分列）；作者验证与 Astra 独验分列。
