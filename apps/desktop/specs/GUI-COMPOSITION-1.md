# GUI-COMPOSITION-1 · Pi Work 面构图、密度与语料纠偏

状态：**实现完成，待独立验收**。产品基线 `01b6b57`（`GUI-LEAD-WHITE-1` 实现提交，未清账）；
本票冻结提交 `ee7bbd1`，实现分支 `gui-composition-1`。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/principles.md`、`docs/design/tokens.json`、
`WORK-SURFACE-COMPOSITION-1`、`WORK-AGENT-SHOWCASE-1`、`GUI-LEAD-WHITE-1`、本票。
能力成熟度只认 `docs/status/current.md`；本票不改变 `PI-BASE-GUI-ACCEPT` 或 Agent／product-live 口径。

## 一、产品裁定与归因

`WORK-AGENT-SHOWCASE-1` 把 Demo 感归因于构图并冻结颜色；`GUI-LEAD-WHITE-1` 以用户实帧反馈
覆盖该判断、改了颜色。以 `release/evidence/gui-lead-white-1/implementation-2026-08-22/03-proposal-light.png`
复核：**颜色一半已解，构图与密度一半未解**。本票只解后一半，不再动任何 token 数值。

本票归因不取「观感差」这类无判准表述，逐条绑定该帧的可测事实：

| 编号 | 帧上事实 | 代码锚点 |
|---|---|---|
| `GC-F1` | 1440×900 下内容止于 y≈540，其下约 360px 为纯底；composer 独立悬于底部 | `.pi-thread-viewport` 无内容时的纵向分布 |
| `GC-F2` | rail 260 + 正文 `--pi-content-measure: 760px` 居中，1440 视口左右各余约 190／200px 死白，且 pi work 态无右栏 | `styles.css:161`、`styles.css:2112-2116`。**本票不解，转出，见第七节** |
| `GC-F3` | 工具卡灰底块与裸文本行齐平交替，块宽拉满版心，形态与骨架屏同构 | `.pi-tool-card`（`styles.css:2019`） |
| `GC-F4` | 一屏三处同名：左上 `Work`、`当前工作区／设备采购案卷`、右上 binding pill | `pi-copy.ts:19`、`.pi-work-head-binding` |
| `GC-F5` | placeholder 与首条用户消息逐字相同，均为「例如：…」示范句 | `pi-copy.ts:37` |
| `GC-F6` | `运行详情` 折叠符是浏览器默认 `▶` 字符，非既有图标；`.tool-call-row summary` 已抑制该 marker，pi 变体未抑制 | `PiToolCard.tsx:66`、`styles.css:715` 与 `styles.css:1989` 的不对称 |
| `GC-F7` | 左 rail 同屏叠三条空态：`卷宗 0 件`／`未加载垂类包`／`尚无卷宗原件` | case rail 空态分支 |
| `GC-F8` | `允许写入`（黑底实心）与 `拒绝写入`（红描边）尺寸、字重、间距对称，读作等权 CTA 对 | `pi-copy.ts:42-43` 及其按钮样式 |

批准行 **`GC-C01`**：

> Pi Work 面按「一条正在进行的工作」组织，不按「一块待填的画布」组织：正文轴随可用宽度
> 有上界地展开，未成文区不留成屏空场，工具与运行详情降为账行而非灰块，同名标识一屏只出现
> 一次，示范语料退出产品默认，不可逆授权的两个动作按主次分级。

激进度仍为 Agent 通用界面中间档。禁止借本票加卡片、渐变、阴影、装饰、动效、主题几何或新组件。

## 二、允许范围与禁止范围

允许：`apps/desktop/src/pi/` 既有组件的结构与样式类、`apps/desktop/src/styles.css` 的**布局与密度**
规则、`pi-copy.ts` 文案、case rail 既有空态分支的合并、相关静态门与 E2E 断言、截图脚本、本票回执、
`apps/desktop/SPEC.md` 与 readiness 登记。

禁止：`docs/design/tokens.json` 任何数值、双宗任何颜色值、语义色角色、新增 React 组件文件、
新状态机、新 store／port／command、任何新依赖、runtime／provider／schema／ABI、
`docs/status/current.md`、Pages 内容与版式、`GUI-LEAD-WHITE-1` 的既有 diff。

**颜色零改是硬边界**：本票的 diff 中不得出现任何 `#RRGGBB`、`rgb(`、`hsl(` 字面量的增删，
也不得改动任何 `--color-*` / `--bg-*` / `--text-*` / `--border-*` 变量的定义。

## 三、成熟范式与依赖结论

本票是既有组件的构图与密度纠偏，不存在缺失的交互 primitive：折叠由原生 `<details>` 承担，
按钮层级由既有 Radix 依赖与既有 `.btn-*` 语汇承担，版心由既有 CSS 变量承担。引入布局库或组件库
会与 Courtwork 的私有版心、双宗 AA 与 raw-color／layout-converge 防漂移门形成第二真源。

结论：**直接依赖：无；借行为范式：正文轴上界随视口分档（既有 `--content-measure` 语汇）；
保留自研：版心真源与机器门；删除当期动作：无。**

## 四、逐项冻结的目标形态

实现者对每条给出最小改动，不得越出该条：

- `GC-C01-a`：**已撤销**（2026-08-22 架构裁定，见第七节）。`--pi-content-measure` 维持定值
  760px，实现不得改动它。
- `GC-C01-b`（对 F1）：thread 未成文区不得留成屏空场——运行中与待决态下，正文块与 composer
  之间的空隙不得超过一个既有 section 间距；空场以既有节奏收拢，**不得**用新增插画、卡片或占位块填充。
- `GC-C01-c`（对 F3）：`.pi-tool-card` 退出满宽灰块形态，降为账行：保留既有 `bg.surface` 值，
  但不得再以满版心色块承担；缩进与细界线由既有 `--rule-minor` / `border` 语汇承担。
- `GC-C01-d`（对 F4）：同名标识一屏只出现一次。binding pill 与 `pi-work-head-title` 同名时
  隐去 pill；`当前工作区` 标签与左上段名 `Work` 的重复由实现者择一保留并在回执说明取舍依据。
- `GC-C01-e`（对 F5）：`inputPlaceholder` 改为不含具体案件语料的中性引导句，且**不得**与任何
  demo 语料或测试首条消息逐字相同；`running: '工作中…'` 改为不带省略号的确定式状态词。
- `GC-C01-f`（对 F6）：pi 的 `<details> summary` 与 `.tool-call-row summary` 取同一处理——
  抑制默认 marker，改用既有图标集里已有的展开图标；不得新画图标（`svg-standards.md` 辖）。
- `GC-C01-g`（对 F7）：case rail 三条空态合为一条，保留全部事实（卷宗件数、垂类包未加载、
  无原件），不得删除任何一条所承载的信息，只改其呈现为一处。
- `GC-C01-h`（对 F8）：`允许写入` 保持主动作，`拒绝写入` 降为次级动作（既有次级按钮语汇，
  仍须 focus-visible 可达、点击面积不小于既有最小值）。红只保留在拒绝语义上，不加不减。

## 五、TDD、视觉与验收

实现者先写红：至少四枚断言须在 `6b67857` 上实际红——同名标识一屏只现一次（`GC-C01-d`）、
工具卡非满宽色块（`GC-C01-c`）、placeholder 中性（`GC-C01-e`）、拒绝动作为次级（`GC-C01-h`）。
最小实现后运行：`lint:design-md`、`lint:neutral`、`lint:rp211`、`lint:elevation`、`lint:graph`、
`lint:typography`、`lint:layout-converge`、`lint:ui-surface`、`lint:voice`、`lint:work-agent-gui`、
`site:guard`、定向 Vitest、`pnpm lint`、`pnpm -r build`、独立端口 Playwright 全链、`git diff --check`。

至少保留两枚 mutation：把 `.pi-tool-card` 注回满版心色块必须红；把 placeholder 注回旧示范句
（`例如：把案件材料里的合同编号与金额整理成一份纪要`）必须红。

视觉证据：light 1180／1440／390 三视口 × empty／running／proposal／succeeded 状态矩阵，
另补一枚 dark 1440 smoke 证明深宗未动；截图前须确认测试页已写 `data-theme`（`GUI-LEAD-WHITE-1`
的首帧失真判例）。核对：无成屏空场、工具行非灰块、一屏无同名重复、零横溢。正文轴宽度须与基线逐像素相同。

独立验收必须由不同会话在 clean worktree、fresh 端口复跑机器门与同视口矩阵，实际注入构图与
语料反例并复原；另须实跑颜色零改的验证（本票 diff 中无色值增删）。只可追加
`apps/desktop/ACCEPTANCE.md` 与本票验收留痕。独立 PASS 前本票不得标记清账，实现会话不得自验收。

## 六、实现回执

**状态：实现完成、全门已跑，待不同会话独立验收。** 前实现会话（Claude Sonnet 5）完成红测、
最小实现、mutation 与视觉矩阵；接手实现会话（Codex，获准使用 Luna 协作）在同一 worktree
`.cw-gui-composition-1`、分支 `gui-composition-1` 完成架构裁定落账、历史 E2E 夹具清障与全门。
本节是完工回执，不构成验收或清账。

### 1 · 逐条 `GC-C01-a…h` 当前状态

| 条目 | 状态 | 落点 |
|---|---|---|
| `GC-C01-a` | 不适用（已撤销） | `--pi-content-measure` 维持 `760px` 未动；另加一枚守位断言锁定该定值 |
| `GC-C01-b` | 已实现 | `styles.css` `.pi-thread` 由 `flex: 1` 改 `flex: 0 1 auto`——thread 按内容收拢，composer 紧随正文；内容长过可用高度时仍由 viewport 自身滚动、composer 归位底部 |
| `GC-C01-c` | 已实现（形态见 §3 存疑） | `styles.css` `.pi-tool-card` 去 `border-top`，改 `margin-left/right: 14px` ＋ `padding-left: 12px` ＋ `border-left: var(--rule-minor) solid var(--border)`；`[data-state="proposed"]` 保留 `var(--bg-surface)` 但只覆内缩后的账行。同批更新 `PiLanePanel.dom.test.ts` 的构图静态门与 `assert-rule-grammar.mjs` 三分类账 |
| `GC-C01-d` | 已实现 | `PiLanePanel.tsx` `PiWorkHead`：删 `pi-work-head-label`（「当前工作区」），binding pill 仅在 `bindingLabel !== matterTitle` 时渲染；`pi-copy.ts` 删 `matterContextLabel`；`styles.css` 删 `.pi-work-head-label` 规则 |
| `GC-C01-e` | 已实现 | `pi-copy.ts`：`inputPlaceholder` → `说清这一段要做完的事`；`running` → `工作中`（去省略号） |
| `GC-C01-f` | 已实现 | `PiToolCard.tsx` / `PiLanePanel.tsx` / `PiDraftViewer.tsx` 三处 `<summary>` 各加既有 `<Icon name="chevron-right" scope="turn" />`；`styles.css` 为 `.pi-run-details`／`.pi-tool-details`／`.pi-viewer-details` 的 summary 抑制 `list-style` 与 `::-webkit-details-marker`，`[open]` 转 90°，与 `.tool-call-row summary` 同一处理 |
| `GC-C01-g` | 已实现 | `CaseRail.tsx` 新增 `railEmptyMerged()`：本案已读取且 0 件原件 ＋ 未加载垂类包时，展开区两条空态并作一条「尚无卷宗原件 · 未加载垂类包，通用能力可用」（testid 仍为 `rail-pack-state-<id>`，`管理包` 动作保留），MaterialsZone 该态不再另出一行。**取舍依据**：行内 `卷宗 0 件` 是常驻元数据（件数非零时同样在场），不属空态，故按架构 2026-08-22 裁定保留不并入；`materials === undefined` 是「尚未读取」而非 0 件，不并 |
| `GC-C01-h` | 已实现 | `PiToolCard.tsx` 拒绝按钮改 `pi-button pi-button-quiet pi-button-deny`；`styles.css` 把 `.pi-button-deny` 移到 `.pi-button-quiet` 之后并只留 `color: var(--red-fg)` 与 hover 底，去实心去围合；高度与点击面积仍走 `.pi-button` 既有值，`:focus-visible` 未动 |

### 2 · TDD 红证（**已实跑**，基线 `ee7bbd1` 未含实现）

新增 `apps/desktop/tests/e2e/gui-composition-1.spec.ts` 七枚断言。基线上实跑
`COURTWORK_E2E_PORT=19887 pnpm exec playwright test --project=app tests/e2e/gui-composition-1.spec.ts`
＝ **6 failed / 1 passed**，红的原始读数逐条如下（第七枚是 `GC-C01-a` 撤销守位，基线本就该绿）：

```
✘ GC-C01-d  expect(locator).toHaveCount(expected) failed   Expected: 0        Received: 1
✘ GC-C01-c  expect(received).toBeLessThan(expected)        Expected: < 752    Received: 760
✘ GC-C01-e  expect(received).not.toBe(expected)            Expected: not "例如：把案件材料里的合同编号与金额整理成一份纪要"
✘ GC-C01-h  expect(received).toContain(expected)           Expected substring: "pi-button-quiet"
                                                            Received string:    "pi-button pi-button-deny"
✘ GC-C01-b  expect(received).toBeLessThanOrEqual(expected) Expected: <= 20    Received: 297.8125
✘ GC-C01-f  expect(received).toBe(expected)                Expected: "none"   Received: "disclosure-closed"
✓ GC-C01-a 撤销守位：正文轴维持 760px 定值
```

实现后同一命令（端口 19889）＝ **7 passed**。

`GC-C01-b` 的靶换过一次并如实登记：初版量「最后一枚工具卡 → composer」得 49px（未过 28px 线），
探针实测该 49px 由 viewport 行距 16 ＋ 运行状态行 17 ＋ 下内距 16 组成，**其中并无空场**——
是靶取错了（工具卡之后还有内容）。改量「viewport 最后一个内容子元素 → composer」，上限同时
收紧到 20px（＝一个 `--home-section-gap`），基线复跑仍红（297.8px），实现后绿（16px）。

### 3 · mutation（**两枚都已实跑并复原**）

| mutation | 结果 |
|---|---|
| `.pi-tool-card` 注回满版心色块（恢复 `border-top` + 去内缩） | **红 1 枚**：`GC-C01-c` `Expected: < 752  Received: 760`；其余 6 枚仍绿 |
| placeholder 注回旧示范句 | **红 1 枚**：`GC-C01-e` `Expected: not "例如：把案件材料里的合同编号与金额整理成一份纪要"`；其余 6 枚仍绿 |

两枚均非 0 红，无需换靶；改完即以备份文件逐字复原并复验。

### 4 · 门的真实读数（**已跑的**）

| 门 | 读数 |
|---|---|
| `pnpm install`（worktree 首次） | Done in 6.9s |
| `pnpm -r build` | 全包通过；接手后复跑 desktop `✓ built in 5.06s` |
| `apps/desktop` `npx tsc -b` | exit 0 |
| `apps/desktop` `vitest run` | **103 files / 921 tests 全绿**（含改后的构图静态门） |
| `lint:design-md` | exit 0 |
| `lint:neutral` | exit 0 · 「src 284 文件全部色值 ∈ tokens 声明集」 |
| `lint:rp211` | exit 0 |
| `lint:elevation` | exit 0 |
| `lint:graph` | exit 0 |
| `lint:typography` | exit 0 |
| `lint:layout-converge` | exit 0 |
| `lint:ui-surface` | exit 0 |
| `lint:voice` | exit 0 · 扫描 179 个 UI 源文件 |
| `lint:work-agent-gui` | exit 0 · todo 0 |
| `site:guard` | exit 0 · **112/112** |
| `pnpm lint`（仓根 eslint） | exit 0；`eslint.config.js` 按既有 capture 脚本模式为新摄制脚本声明 browser globals |
| `lint:rule-grammar` | exit 0；P1-N106 落账后：主界 4、次界 91、routine 退 19、具名不换 73，共 170 处；P1 留 82／减薄 11／回单线 2／退 19 |
| 仓根 `pnpm test` | **183 files / 2251 tests** 全绿 |
| 定向 E2E（五份受 stale Sample 阻塞的 spec） | **69/69**；`global-verbs.spec.ts` hover 稳定性修正后单文件 **21/21** |
| **`pnpm test:e2e` 全链** | 独立端口 `19898`，官方脚本（含完整静态前置链）**402/402 passed**，8.8m |
| `git diff --check` | exit 0 |
| 颜色零改验证（相对冻结提交 `ee7bbd1`） | `git diff ee7bbd1 -U0` 的新增／删除行中匹配 raw-color 字面量 **无输出**；零 token 色变量定义改动 |

### 5 · 架构裁定与留给独立验收的观察

1. **`lint:rule-grammar` 已按架构裁定闭合。** 用户以架构角色批准新增 `P1-N106`：目标
   `.pi-tool-card|left`，tier `agent-interface`，decision `留`，role `minor`，width
   `var(--rule-minor)`，color `var(--border)`，`hairline: false`。`docs/design/r2-tier-ledger.json`
   现为 114 行封闭签署账，`assert-rule-grammar.mjs` 同步把 MINOR 计数由 90 调为 91、P1 `留`
   由 81 调为 82；静态门与两枚 rule-grammar E2E 均绿。
2. **线级语法门有一处静默缝**：`scripts/rule-grammar-lib.mjs` 的 BORDER 正则只认物理边
   （`border-top/bottom/left/right`），`border-inline-start` 一类逻辑边**完全不进普查**。
   我最初用逻辑边写这条线时门直接变绿——那是漏检不是通过。已改回物理边以受检。此缝与本票
   无关但确实存在，建议另立微票。
3. **`GC-C01-b` 把空场从 composer 之上搬到了 composer 之下。** 票面判据（正文块与 composer
   间距 ≤ 一个 section 间距）已达成，但短会话与空态下屏幕仍有大片纯底，只是位置改到 composer
   下方（1440 空态实测约 570px）。票面禁止用插画／卡片／占位块去填，`GC-F2` 的真解已转出
   `GUI-WORK-RAIL-1`，故本层不再动。**这一点请接手会话与架构确认是否接受**。
4. **`GC-C01-c` 的灰块仍占正文轴的绝大部分。** 内缩后宽 732／760（96%），断言（< axis−8）过，
   「不再以满版心色块承担」的字面也过，但肉眼仍近似一条带。更强的读法是把 `bg.surface`
   收到决定簇（`.pi-tool-decision`）而非整张卡上、按内容宽度铺——我**没有**这么做，因为票面
   点名的是 `.pi-tool-card`，且那会改动「唯一 surface 声部先被看见」的既签语义。若验收认为
   内缩力度不足，这是现成的下一手。
5. **`GC-C01-f` 我做到了三处 pi summary（工具卡／运行详情／只读查看面），不止票面点名的一处。**
   理由是票面写的是「pi 的 `<details> summary` 与 `.tool-call-row summary` 取同一处理」，
   只改一处会留下另两处仍是默认 `▶`。如判为越界，删掉 `PiLanePanel.tsx` 与 `PiDraftViewer.tsx`
   两处 `<Icon>` 及对应 CSS 选择器即可。

### 6 · 视觉证据

`release/evidence/gui-composition-1/implementation-2026-08-22/`：light 1180／1440／390 ×
empty／running／proposal／succeeded 十二帧 ＋ dark 1440 proposal smoke 一帧 ＋ `manifest.json`
（逐帧 sha256）。摄制脚本 `apps/desktop/scripts/capture-gui-composition-1.mjs`：**每帧落盘前实测
`data-theme` 已写实，不符即抛不摄**（`GUI-LEAD-WHITE-1` 首帧失真判例）。顺带发现既有
`capture-pi-lane-states.mjs` 的深宗写法有误——它往 `courtwork.settings.v1` 写
`{version, settings:{…}}`，而 `settings-store.ts` 存的就是 settings 本体，故它实际靠加载后
手写 `data-theme` 属性补救；新脚本改为首帧之前就把 `{"appearance":{"themeMode":…}}` 写进真源。

目检（四帧）结论：一屏无同名重复（案件名只出现一次、无 pill、无「当前工作区」）；工具行已是
缩进 ＋ 左界行的账行、交替灰块消失；折叠符为既有 chevron；390 零横溢、rail 按既有断点隐去；
dark 1440 与浅宗改动同构、色相未动。

### 7 · 接手收口与待独立验收项

1. ESLint 只按既有 capture 脚本模式补 browser globals；P1-N106 只按用户架构裁定落账，均未扩
   runtime、schema、ABI、状态机、组件文件或依赖。
2. 首轮全量 E2E 为 **391/402**：本票新增七枚全绿；十枚确定性红来自旧用例继续把瞬态只读
   Sample 当作可归档、可编辑或可持久切换的真实案件，一枚为并发 hover 指针漂移。为证明非本票
   回归，在冻结提交 `ee7bbd1` 的临时 detached worktree 复跑 `global-verbs.spec.ts:92` 与
   `work-live.spec.ts:236`，两枚同样 **2/2 红**；临时 worktree 已删除，未形成基线改动。
3. 同层最小修复仅改五份 E2E：`global-verbs`／`rp211`／`work-budget`／`work-live`／`workbench`
   通过既有 `createNamedCase` 建真实案件，保持原归档、编辑、跨案与 motion 语义；复制按钮用例
   改为直接 hover 目标按钮（父卡 `:hover` 仍是真触发），消除并发布局位移后指针离卡的抖动。
   未改产品 CSS、helper 导出或任何契约。定向 **69/69**，最终全量 **402/402**。
4. 全量 E2E 覆写的四个历史证据包均按 §8 精确还原，`git status` 无历史 PNG；视觉矩阵仍只保留
   本票自己的 13 帧与 manifest。
5. **剩余动作仅为不同会话独立验收。** 独立验收须在 clean worktree、fresh 端口复跑机器门、
   mutation 与视觉矩阵，并在 `apps/desktop/ACCEPTANCE.md` 留痕；本实现会话不写 PASS、不清账。

### 8 · 附：`release/evidence/` 历史包被写脏的归因（本轮实证）

`tests/e2e/demo-anchor-2.spec.ts`、`generic-pack-1.spec.ts`、`legal-anchor-binding-1.spec.ts`、
`legal-five-faces-1.spec.ts` 四谱把截图直接写进 `../../release/evidence/<包名>/`，
`work-live.spec.ts:183` 另单独覆写 `legal-five-faces-1-2026-08-07/04-revision-live.png`。
故**任何一次跑满 app project 的 Playwright（含 `pnpm test:e2e`）都会覆写这四个已提交的证据包**，
与本票改动无关。本轮的触发命令是红证轮的
`COURTWORK_E2E_PORT=19881 pnpm exec playwright test gui-composition-1 --project=app`——
该位置参数没有生效为过滤（实跑了全部 380 枚），于是四包被重摄。已 `git checkout --` 逐包还原。

### 9 · 提交

见本票分支 `gui-composition-1` 的实现提交；最终 SHA 随交接报告回传。
实现会话未 push、未 rebase、未改基线、未自验收、未写 `ACCEPTANCE.md`。

## 七、架构裁定 · `GC-C01-a` 撤销与 `GC-F2` 转出（2026-08-22）

实现会话在写红测前先算了 `GC-C01-a` 的可满足性，报回互斥并停手。复核其实测成立：
`--type-reading-size: 15px`（`styles.css:99`）是 Pi Work 正文轴（`.pi-turn-assistant .chat-markdown`，
`styles.css:2015`），`--type-title-size: 18px` 只管用户话（`.pi-user-text`，`styles.css:2014`）；
CJK advance 实测为 1em，故正文轴每行字符数 = 版心 ÷ 15。

由此：40–52 字对应 600–780px，与「显著大于 760 且不超过 960」的交集只剩 (760, 780]。
**该互斥是本票起草之误**——「显著大于 760」一句预设了一个并不存在的更大正文字号。

裁定：**判准二存，判准一废**。现行 760px 已等于 50.7 字，本就落在 40–52 的舒适区内；把正文轴
推到 900px 会使每行达 60 字，是排印上的退步。故 `GC-C01-a` 不是让步而是**撤销**：正文轴维持
760px，实现不得改动 `--pi-content-measure`。

`GC-F2` 的死白因此在本票内不解。它的真解须先判 Progress／Preview／Working folders／Context
右栏在 pi work 态的存废，属布局架构变更，超出本票「构图＋密度＋语料，零新组件」的边界，
**转出为后继票 `GUI-WORK-RAIL-1`**，须由架构以 ADR 级判断另立，不得借本票夹带。

本裁定不改动 `GC-C01-b` 至 `h`，不改动第二节的允许／禁止范围，不放宽任何硬约束。
