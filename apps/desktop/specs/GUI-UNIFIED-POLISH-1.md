# GUI-UNIFIED-POLISH-1 · 工作态排印层级与数据面可读性收口

状态：**实现在途。** 批准行 `GUP-A01`／`GUP-S01` 已由架构角色于 2026-08-23 同票批准并冻结。
本票不改主题色、copy、runtime、schema、provider、成熟度或 Work diff。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/principles.md`、`docs/design/tokens.json`、
`docs/design/typography-density.md`、`GUI-HIERARCHY-1`、`GUI-PAPER-THEMES-1`、
`GUI-OPTICAL-POLISH-1`、本票。成熟度只认 `docs/status/current.md`；本票不替代
`PI-BASE-GUI-ACCEPT`，不赋予 Agent、product-live 或 external-validated 口径。

## 一、基线实测

以下数值取自 HEAD `fad3ce9` 的真跑实例，非源码推断：dev server `localhost:1420`，
viewport 1440×900，浅宗，样板案 `临江精铸 诉 起云智能 设备采购合同纠纷` 载入后停在 Scenes 面。
测量以 `getComputedStyle` 遍历可见文本元素取得。

| 观测 | 实测值 |
|---|---|
| 同屏并存的排印样式（字号／字重／行高组合） | 20 种 |
| 全部排印样式的字号跨度 | 10px – 15px |
| 工作态全屏最大字号 | 15px |
| 同刻被 ellipsis 截断的元素 | 42 个（含案件题本身） |
| 携带非零描边的元素 | 88 个 |
| 同屏并存的背景色值 | 5 阶，明度跨度约 34/255 |
| 行高显式声明的文本元素占比 | 约 1/4；12px 档 70 个元素取 `normal` |
| 标题轨（思源宋 SC）消费点 | 1 处，13px，且被截断 |
| 文书轨（朱雀仿宋 GBK，16px/1.75）消费点 | 0 处 |
| 对话列宽 ／ 左栏 ／ 右检视栏 | 469px ／ 248px ／ 约 700px |

源级对照（`apps/desktop/src/styles.css`，2157 行）：

| 观测 | 实测值 |
|---|---|
| 字号走 token 的声明（`font-size` + `font` 简写） | 227 处 |
| 写死 px 字面量的字号声明 | 45 处 |
| 其中低于 12px 下限者 | 27 处（11px×21、10px×4、9px×2） |
| 其中高于 20px 上限者 | 3 处（26px、24px、22px 各一） |
| 其中不在 `typography.scale` 七档上者 | 31 处 |
| `line-height` 声明总数 | 67 处 |

`tokens.json` 的 `typography.scale.meta` 明写「全站最小字号，12px 以下禁用」，
`typography.scale.display` 明写「页面级标题上限。工作台不需要更大的字」（20px）。
上表 27 处低于下限、3 处高于上限、31 处离格，与 `docs/design/README.md`
「不得在组件内引入未登记的硬编码色值、阴影、圆角或字体尺寸」同为已立契约的违反项，
不属裁量分歧。其中 9px 两处已低于凡例所规避的 Raycast 极限字阶。

字面量集中在 `font:` 简写：现行排印门只扫 `font-family`，`font-size` 与 `font` 简写均无门，
故这 45 处从未触红。门存在不等于门覆盖该面。

字号声明 227 处而 `line-height` 仅 67 处，与运行时行高显式率约 1/4 相互佐证。

## 二、判断

缺陷不在 token，在消费。`tokens.json` 已经把三轨字体制、墨色律、线级语法与双宗明度阶定完；
工作态没有消费其中承担层级的那部分。三项后果可直接由上表读出：

1. **无排印层级**。工作态全部文字落在 10–15px 的 5px 带内，20 种样式互相之间的差不足以成层级，
   只成噪声。字重即层级、字号即层级两条凡例在工作态失效，层级只能退回描边表达，于是出现第 2 项。
2. **层级只剩线与背景可依**。字号与字重既不成层级，`principles.md` §2「层级优先用字号、字重、
   文字明度、线重和间距表达，背景色块是最后手段」的前两项在工作态失效，结构只能由线与
   5 阶只跨 34/255 的背景承担。（提案初稿据同屏 88 处描边推断为「盒中盒」，该推断已被逐类
   计数否证，见第七节第 2 条：其中 66 处是表格格线。此处只保留可由计数支持的部分。）
3. **数据面不可读**。42 处同刻截断中包含案件题与矩阵面的全部数据格；矩阵面每格皆止于 `…`，
   该面此刻不传递信息。关系图节点标签相互压叠。这两者不是装饰问题，是 schema 工作面
  「版式只从真实数据自然生长」这条最克制档律令未被满足。

标题轨 1 处、文书轨 0 处，是同一判断的另一面：设计系统里最能区别于通用 AI 界面的资产，
在工作态处于熄灭状态。故本票不是再调色，也不是重做信息架构，是把已冻结的 token 接到工作态。

`typography.scale` 已备 12／13／14／15／16／18／20 七档并逐档配对行高。`styles.css:161-170`
已把上三档 `titleSm`／`title`／`display` 的 size／lineHeight／weight 九个变量全部暴露到 `:root`，
注为「仅暴露 tokens.json 已有的槽，消费面不散落数值」。其现行消费点恰三处，且全在 pi 线：

| 变量 | 唯一消费点 |
|---|---|
| `--type-display-size` | `.pi-work-head-title` |
| `--type-title-size` | `.pi-user-text` |
| `--type-title-sm-size` | `.pi-drafts-title` |

场景线（对话列与右检视栏五面）零消费。故缺陷是**线间不对称**，非设计缺席：
`WORK-SURFACE-COMPOSITION-1` 已给 pi work 线接上层级并经独立验收，场景线没有随之接线。
按 var 消费计数，场景线 253 处字号声明中 233 处（92%）落在 12–13px 两档。

`GUP-A01` 因此不新增任何 token，也不新造层级语言：把 pi 线已放行的同一套接法推到场景线。

## 三、批准行

档位不得跨档继承，故按面分两行，各自独立裁决。两行由架构角色于 2026-08-23 同票批准。

### `GUP-A01`（档位：agent-interface）

> 在既有 token 内建立场景线排印层级，接法与 `WORK-SURFACE-COMPOSITION-1` 在 pi 线已放行者同一：
> 字号一律按名消费已登记的字阶变量，退役全部 px 字面量；下限 12px、上限 20px（`scale.meta`
> 与 `scale.display` 的在册边界）；案件题回标题轨 `--type-title-size` 且不再截断；面题取
> `--type-title-sm-size`；`:root` 补 `line-height` 基线以消除 `normal`，凡取 12/13 档以外字阶的规则
> 须同规则配对声明该档行高。对话列在双栏并置时取不小于检视栏的量度。空态补齐动作标签，不留裸图标。
> 不新造 token、色值、阴影档、圆角档或组件族。

### `GUP-S01`（档位：schema-workface）

> 数据面以真实数据定量度：矩阵面与时间线按真实内容给每列最小量度，超出部分整面横向滚动
> （架构角色 2026-08-23 于三案中取此案，代价即右栏出现横向滚动条）；标识列与首列不得截断；
> 关系图节点标签消除压叠。描边按「面的外界与表头取线，面内行与内层卡取地色明度分层」收敛，
> 不为收敛引入新色值或新阴影。数据区维持静止、零新装饰、语义色稀缺。

（末句「描边收敛」的前提在实现期被实测否证，故该分句不实施，见第七节第 2 条。批准行原文不改写。）

## 三之二、机器门

排印门 `apps/desktop/scripts/assert-typography.mjs` 现承门①②③；本票补 **门④ 字阶在册与行高配对**：

- `src/**` 内每一条 `font-size` 只允许 `var(<已登记字阶变量>)` 或 `inherit`，px 字面量一律触红；
- 已登记字阶变量的 `:root` 取值须逐档等于 `tokens.json` 的 `typography.scale`；
- `:root` 须声明 `line-height` 基线，取值等于 `scale.meta.lineHeight`；
- 凡消费 `body`／`reading`／`titleSm`／`title`／`display` 五档字号的规则，须在同规则声明配对行高变量。

变量名与 token 槽的对应走显式登记，不按名推导——承门①附「推名必推错」判例
（`--type-dense-meta-size` 对应槽 `meta`，`--type-dense-body-size` 对应槽 `dense`）。

## 四、已裁决项

1. **App 视觉槽重开**。`docs/architecture/implementation-readiness.md` 原记
   `GUI-OPTICAL-POLISH-1` 为 `PI-BASE-GUI-ACCEPT` 之前最后一个 App 视觉槽；本票开工，
   该记述随本票同批订正。
2. **两行同票**。`GUP-A01` 与 `GUP-S01` 在同一票内并行，共用一轮独立验收；许可仍不互相继承，
   各条款在本票内按行分列。
3. **台账**。`docs/design/r2-tier-ledger.json` 的受签面是文档片段与线级消费点
   （`选择器|边`）。本票改的是字阶、量度与折行，不新增也不改写任何线级消费点，
   `lint:skin-r2-ledger` 与 `lint:rule-grammar` 改前改后同绿，故本票不产生台账条目。
   唯一触及线级之处是 `.settings-recovery` 的悬空 `--border-subtle` 修复：该键早已在
   「不换」清单内（`语义色标线（subtle）`），故保持 `1px` 字面量不按名消费 `--rule-*`。

## 五、外部材料的地位

本票消费 [UI Skills](https://www.ui-skills.com/) 的 `improve-ui`、`better-ui` 与 `rams`
三份方法作非阻塞审计口径，其中 playbook 的 `tabular-nums`（数据列数字对齐）一条与第三节直接相关。
外部材料不安装、不进 lockfile、不形成第二设计系统，不覆盖本仓数据区静止、动效白名单、TDD、
mutation、视觉矩阵或独立验收门。仓根现存未跟踪的 `skills-lock.json` 与 `.agents/`
（内容为 `remocn`，与本票无关）不属本票产物。

## 六、实现落点与实测对照

### 落点

| 面 | 改动 |
|---|---|
| `styles.css` `:root` | 补 `--type-body-line-height`；补 `line-height: 1.5` 基线 |
| `styles.css` 全文 | 45 处 px 字号字面量改按名消费字阶；24 处规则补配对行高；5 处幻影 `--letter-spacing-cjk-title` 改字面量 |
| `.chat-titlebar .chat-case-title` | `dense`(13px) → `title`(18px)，`max-width` 60% → 100% |
| `.panel-head h2` | `dense`(13px) → `titleSm`(16px) |
| `.workspace` 列权重 | chat `.9fr` / schema `1.25fr` → 双 `1fr` |
| `.matrix-wrap` | `table-layout: fixed` + `width:100%` → `auto` + `max-content`；标识列撤 ellipsis |
| `.timeline-grid` | 来源列 64px → 144px 且撤 ellipsis；事件列起量 260px → 420px |
| `.risk-grid` | 四枚状态列 50/52/52/68px → `repeat(4, max-content)`，摘要得回 50px |
| `.file-ops-table` | 自带横滚壳；`width:100%` → `max-content`，工具条与报告不再随表横移 |
| `graph-theme.ts` | label 字栈由 `Inter,…` 改同功能轨；字号 16→14、行高 16→18；新增 `graphMinFitZoom` |
| `GraphPanel.tsx` | 两处 `fitView` 后夹住可读下限 |
| `PiLanePanel.tsx` | 空态三枚主动作接 `.pi-empty-action` 并渲 `PI_COPY` 词条（`GOP-C02-b` 受裁窄化） |
| 悬空变量 | `--border-subtle` / `--bg-elevated` / `--bg-secondary` / `--action-primary` 四枚改指在册 token |

### 实测对照（同一装置：1440×900、浅宗、样板案载入后停在 Scenes 面）

| 观测 | 改前 | 改后 |
|---|---|---|
| 排印样式的字号跨度 | 10 – 15px | 12 – 18px |
| 取 `line-height: normal` 的排印样式 | 多数（12px 档 70 个元素） | 0 |
| 同刻被 ellipsis 截断的元素 | 42 | 11（左栏 5 ＋ 风险摘要 6） |
| 矩阵面被截断的格 | 35 / 60 | 0 / 60 |
| 时间线被截断的来源格 | 47 | 0 |
| 图谱 label 的实际渲染字号 | 9px（0.56× 适配） | ≥ 12px（夹住下限） |
| 对话列 ／ 检视栏 | 469px ／ 约 700px | 560px ／ 560px |
| src 内 px 字号字面量 | 45 | 0 |
| 悬空 CSS 变量 | 4（另 5 枚运行时注入） | 0 |

### 门与反例

- 排印门补 **门④**（字阶在册 · 行高配对 · 别名不脱钩），五枚变异逐一转红：
  重引 11px 字面量 ／ 撤 `:root` 行高基线 ／ 字阶变量漂移 18→17 ／ 拆散一处行高配对 ／
  `--control-font-sm` 别名脱钩。
- 新立 `assert-gui-unified-polish.mjs`（`lint:unified-polish`，已入 `test:e2e`），十枚变异逐一转红：
  列权重回退 `.9fr/1.25fr` ／ 案件题降回 dense 档 ／ 案件题恢复 60% 截断 ／ 矩阵回 `table-layout: fixed`
  ／ 来源列缩回 64px ／ 事件列起量退回 260px ／ 图谱字栈换回 Inter ／ 撤除 fit 可读下限
  ／ 空态钮改回裸图标 ／ 重新引入悬空变量。
- `GOP-C02-b` 窄化的双向咬合另四枚变异转红：空态钮改回裸图标（门与 DOM 测同红） ／
  密集 chrome 的 `pi-send` 偷渲文字（DOM 测红，证窄化不会外溢） ／ 接了 class 却不渲文字 ／
  撤除 `.pi-empty-action` 规则。
- 门集实跑：root `pnpm -r build` 绿 · `pnpm lint` 绿 · `pnpm test` 2251/2251 ·
  desktop `vitest` 932/932 · `pnpm test:e2e` 全静态门 ＋ Playwright 414/414（独占端口 1431、独占锁）。

## 七、未了项与余量冲突

两项如实列出，不并入完成面。（原第 1 项「与 `GOP-C02` 冲突」已于 2026-08-23 由架构角色裁定
并实施，移入第六节；裁定与窄化边界见 `GUI-OPTICAL-POLISH-1` 第八节。）

1. **`GUP-S01` 描边收敛条的前提被实测否证**。提案称同屏 88 处描边为盒中盒，逐类计数后：
   66 处是表格格线（线级语法所规定的数据栅格，非盒）、8 处是控件、14 处是容器，
   其中嵌套于另一容器者 8 处，且多为面头单线与 tab 条单线。无盒中盒可收敛，故本条不实施。
   前提既否，不以「已优化」记账。
2. **散文列在密度律与不截断之间无两全**。`de-slop` 基线锁 `.risk-list .dense-row` 高 28–34px，
   风险摘要与时间线事件列一旦折行即破此律（实测 51px ／ 71px）；而逐行 grid 的
   `max-content` 不能跨行对齐列宽，量度到内容需把事件列钉死 856px。本轮取「密度律优先，
   把宽度尽量还给散文列」：风险摘要单行但多得 50px、事件列起量 260→420px，
   残余截断 6 处（风险摘要）与长事件若干，全文由 `title` 与详情卡承接。
   要同时满足两律，须把时间线与风险列表从逐行 grid 改为单一栅格——属结构改造，另票。
   随之的代价须一并记明：时间线整行 722px 而面宽 546px，来源列默认落在可视区外，
   需横滚 176px 才见。截断为零而位置后移，是本轮所取之案的直接后果，不作已优化记。
3. **量度实测法在 `font:` 简写元素上不可靠**。以 `getComputedStyle(el).font` 复制字体度量时，
   自定义字栈（`var(--mono)` 等）不能逐字序列化，副本会落到更宽的回退字体，读数偏大。
   时间线日期列据此法算得需 116px 而实测 98px 零截断即为一例。凡以该法取的量度，
   须以「实际是否截断」复核后方可入册；本票所有已入册量度均经此复核。

## 八、独立验收边界

- 不采信本会话读数：验收须在独立 clean clone 自起独立端口复跑，逐项复算第六节对照表。
- 反例须实注入观察转红：门④五枚、本票门十枚（第九枚随条款挂拍板）逐一复跑。
- 视觉矩阵：浅／深两宗 × 空态／载入态 × 1440 与 390 两宽，五面（时间线／关系图谱／矩阵审阅／
  修订预览／起草画布）各一帧。
- 本票不改主题色、copy、runtime、schema、provider、成熟度或 Work diff；不替代
  `PI-BASE-GUI-ACCEPT`，不赋予 Agent、product-live 或 external-validated 口径。

### 8.1 · 空态矩阵的有效验收夹具

空态矩阵必须使用**有 opaque grant、已绑定 Legal 包、但没有材料与产出**的 production 案件。
固定入口如下：

1. 通过测试宿主的 `__courtworkHostAuth.setNextAuthorize` 注入 `status: 'granted'` 的 opaque grant，
   打开「新建案件」并完成文件夹授权；
2. 在命名步选择 `data-testid="new-case-pack-legal"`，填写案件名并创建；
3. 切到 `segment-work`，若 `preview-outline` 尚未出现，先点击 `module-preview-toggle` 展开
   Preview 大纲；等待 `outline-timeline`、`outline-graph`、`outline-matrix`、`outline-revision` 与
   `outline-draft` 五枚大纲入口出现；不启动场景，不注入材料，不制造 artifact；
4. 逐一点击五枚 `outline-*` 入口进入浏览器态，再确认对应的 `view-*` 标签出现；在浅／深两宗与
   1440／390 两宽取空态帧。

「不使用文件夹，直接命名」且保持零垂类绑定的案件**不是**本矩阵夹具：按
`PACK-INTERACT-1` 的现行契约，它只展示通用 `draft`，具名垂类工作面应当不存在。用该状态寻找
`view-timeline` 属验收入口错误，不是本票实现缺口。本节只校正验收路径，不改变生产路由、零绑定语义
或新增任何产品 hook。
