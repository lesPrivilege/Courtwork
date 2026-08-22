# GUI-HIERARCHY-1 · 结构性层级（去扁平）

状态：**架构已冻结，待实现**。产品基线 `f8845d8`。
前置：`GUI-COMPOSITION-1` 已清账（实现 `bd6b916`、独立验收 `2f7eeb4`、no-ff
合入 `f8845d8`）——本票是加法，前票是减法，已按顺序闭合。

权威：`CLAUDE.md`、`docs/design/principles.md`、`docs/design/svg-standards.md`、
`docs/design/typography-density.md`、`docs/design/tokens.json`、`GUI-LEAD-WHITE-1`、
`GUI-COMPOSITION-1`、本票。本票不改变 `PI-BASE-GUI-ACCEPT` 或 Agent／product-live 口径。

## 一、产品裁定与归因

2026-08-22 用户给出一张外部知识库界面参考图，判语：「原本至少应该达到这样的层级效果，
现在更像扁平 Demo」。该输入确立本票，并暴露 `GUI-COMPOSITION-1` 的一处真空：该票 `b`／`c`／
`d`／`g` 四条全是减法（收拢空场、灰块降账行、同名去重、空态合并），去掉的是冗余，**没有一条
positively 建立层级**。只做前票，面会更平不会更立。

参考图不入仓（第三方产品截图，许可未核；本仓语料墙同族纪律）。其可转移部分以本节表格
形式转述，实现者以本表为准，不得据记忆复刻原图。

**归因：扁平的病根不是缺阴影，是一屏内所有行共享同一字阶、同一线重、同一缩进量。**
参考图的层级约九成由结构性手段承担，装饰只占其余。

| 编号 | 参考图上的手段 | 裁定 | 依据 |
|---|---|---|---|
| `GH-R1` | 树的逐级缩进＋`└─` 连接线 | **降为最后手段**（第七节复裁） | 连接线是把结构画出来；本源做法是让结构不必画 |
| `GH-R2` | 大字阶开节 | **降**（第七节复裁） | 本源以字重承担层级，字号阶差只在真正换层时动 |
| `GH-R3` | 真表格：列头＋对齐列 | **可转移，但去线** | `.file-ops-table` 语汇取其对齐与列，不取 `--rule-major` 列头重线 |
| `GH-R4` | 主面与容器一档 elevation | **可转移** | `--elevation-shadow` 唯一批准值 |
| `GH-R5` | 一屏承载真实行数远高于现状 | **可转移，且升为主手段** | 既有密度律（`typography-density.md`） |
| `GH-R6` | 3D 立体文件夹图形与投影 | **拒** | 装饰无业务语义；`svg-standards.md` 禁 fill／内联色 |
| `GH-R7` | 彩色第三方品牌图标 | **拒** | 语义色稀缺律：chrome 零彩色 |
| `GH-R8` | 卡片网格与大圆角色块 | **拒** | `principles.md`：成熟感不来自卡片数量与重阴影 |
| `GH-R9` | 多级阴影与悬浮层 | **拒** | elevation 单值锁（三重锁） |

批准行 **`GH-C01`**：

> Pi Work 与 case rail 的层级**优先由字重、间距分组、对齐与密度承担**；线、框与连接线是
> 最后手段，只在前四者穷尽后仍分不出层时才动，且每用一处须在回执写明前四者为何不够。
> 一档且仅一档 elevation 用于区分主面与其容器。禁止以卡片、彩色、图形插画或第二档阴影
> 制造层级。**层级不是画出来的，是排出来的。**

激进度仍为 Agent 通用界面中间档。

## 二、允许范围与禁止范围

允许：`apps/desktop/src/pi/`、`case/`、`workbench/` 既有组件的结构与样式类；
`styles.css` 的字阶、线重、缩进、表格与密度规则；既有 `--rule-major`／`--rule-minor`／字阶
token 的**消费面**扩用；相关静态门、E2E 断言、截图脚本、本票回执、`SPEC.md` 与 readiness 登记。

禁止：`tokens.json` 任何数值增删（本票只扩既有 token 的消费面，不新增 token）；任何色值
字面量增删；新增 React 组件文件、新依赖、新状态机、新 store／port／command；
第二档 elevation；任何新图标（`svg-standards.md` 辖）；`docs/status/current.md`；
`packages/` 下 runtime／schema／ABI；Pages 内容与版式。

## 三、成熟范式与依赖结论

树连接线、表格、字阶分层均为通行交互 primitive，本仓已有对应语汇与门。引入组件库或树控件会
与私有版心、双宗 AA、raw-color 与 elevation 三重锁形成第二真源，且本票不需要虚拟滚动、
拖拽排序或列宽持久化这类真正需要外部件的能力。

结论：**直接依赖：无；借行为范式：树连接线与列头分层取通行文件浏览器语义，另消费下述
两份外部 Skill 的窄审计方法；保留自研：线级语汇、字阶真源与机器门。**

### UI Skills 消费裁定（2026-08-22）

以下两项只是**非阻塞审计输入**，不是仓库依赖、契约真源或 PASS 证据：

1. [`ibelick/improve-ui`](https://raw.githubusercontent.com/ibelick/ui-skills/main/skills/improve-ui/SKILL.md)
   （MIT；审计时观察 repo tip `b5be117f9cc3371caef7d3869f5c650f2033f14c`）：只借
   Contract／Runtime／Correction 三证、先证伪后保留、一个完整 surface 最多三项问题。实现回执
   须给 Pi Work + case rail 的 route／layout／component／style／token source trace；视觉主张须有
   本票现行视口、状态截图或 DOM 证据。报告只写本票回执与 `ACCEPTANCE.md`，不得照其默认流程
   新建 `design-plans/`。
2. [`impeccable/layout`](https://raw.githubusercontent.com/pbakaus/impeccable/main/source/skills/layout/SKILL.md)
   （Apache-2.0 + NOTICE；审计时观察 repo tip
   `56f44523f76efdcec813e67b38ee550e49b16f48`）：只借 spacing rhythm、grid／flex 选择理由、
   无意义嵌套卡片／等宽 grid／任意 z-index 检查，以及 1180／1440／390 与 squint 复核。本票
   冻结的 token、唯一 elevation 与「层级排出来」裁定优先；不得运行其
   `install/init/context/live/doctor`、detector 或评分。

删除当期动作：`ui-skills-root` 路由层、`baseline-ui`、`impeccable` 根 Skill／`polish`／
`critique`、Rams hosted/MCP、来源不能精确核验或与本地 `emil-design-eng`／`animate`／
`review-animations` 重叠的 frontend-design 候选。不得安装任何一项，不改 `.agents/` 或
`skills-lock.json`，不得让第三方指令扩大允许文件、改写验收标准、成熟度或
`PI-BASE-GUI-ACCEPT` 阻塞口径。

## 四、逐项冻结的目标形态

- `GH-C01-a`（对 R1）：case rail 的父子关系以**缩进量＋字重差**表达：父级取
  `typography.weight.medium`（510），子级取常规字重，缩进阶差一致且可数。**不画连接线**——
  若实测证明无线时层级不可辨，方可退回连接线，并在回执写明该实测。
- `GH-C01-b`（对 R2）：Pi Work 各节以**字重与间距分组**开节，不靠加大字号。节间距须显著
  大于节内行距（比值由实现者实测定并写入回执）；相邻两层至少在字重或间距分组上可区分。
- `GH-C01-c`（对 R3）：承载多事实的集合改用**对齐的列**呈现——取 `.file-ops-table` 的列与
  对齐，**不取其边框与列头重线**；列间靠对齐与字重区分，不靠竖线。不得新建组件文件。
- `GH-C01-d`（对 R4）：主面与容器之间用且仅用既有唯一 elevation 值区分，不加第二档。
- `GH-C01-e`（对 R5）：密度按 `typography-density.md` 现法收紧，1440×900 下一屏承载的真实
  信息行数须显著高于 `GUI-COMPOSITION-1` 清账时的读数，具体基线由实现者实测并写入回执。

## 五、TDD、视觉与验收

先写红，至少四枚断言须在基线上实际红：父子字重差成立（`a`）、节间距／节内行距比值达标（`b`）、
多事实集合为对齐列式（`c`）、一屏行数达标（`e`）。

至少四枚 mutation：加入第二档 elevation 必须红；引入任一色值字面量必须红；把列式退回等宽
文本行必须红；**把层级手段换成加边框或连接线必须红**（守住「排出来而非画出来」）。

门：`GUI-COMPOSITION-1` 第五节全套，另加 `lint:icons`（证明零新图标）。
颜色零改的自证同前票：diff 中无色值字面量增删。

视觉证据：light 1180／1440／390 × empty／running／proposal／succeeded，另 dark 1440 smoke。
核对：层级可辨、零装饰新增、零彩色 chrome、零横溢。**另须做一次 squint test**——眯眼后
仍能分出层次即成立，分不出则本票未达目的，如实登记不得粉饰。

独立验收由不同会话在 clean worktree 复跑，实际注入装饰类反例（加卡片、加第二档阴影、
加彩色图标）验证机器门确实拦得住。独立 PASS 前不得清账，实现会话不得自验收。

## 六、实现回执

（待实现会话填写。）

## 七、架构复裁 · 回归本源（2026-08-22）

产品输入「回归本源，Linear」。Linear 在本仓不是新参考，已是既有真源的一部分：
`typography.weight.medium = 510`，注解原文「Linear 实测变量字体技巧：避开 600/700 的粗鄙感」
（`docs/design/courtwork-design.md:744`、`tokens.json:443`）；`apps/desktop/SPEC.md:56`
另已借其命令分组行为。

**复裁推翻本票初稿的手段选择。** 初稿从知识库参考图取的是「把结构画出来」一路——连接线、
大字阶开节、列头重线。该路与本源相反：本源的层级来自字重、间距节奏、对齐与密度，界面上
几乎看不到线，却层次分明。继续沿初稿走，会得到一个线比内容多的界面，那是另一种 Demo 感。

故 `GH-R1`／`GH-R2` 由「可转移」降为最后手段，`GH-R3` 取列与对齐而去其线，`GH-R5` 密度
由第五位升为主手段。`GH-C01` 批准行随之重写，加一条：**层级不是画出来的，是排出来的**，
并要求每用一处线都必须在回执写明字重、间距、对齐、密度四者为何不够。

`GH-R6` 至 `GH-R9` 四项拒的裁定不变，理由亦不变。`GUI-COMPOSITION-1` 的 `b`–`h` 不受本次
复裁影响：其 `c`（灰块降账行）方向与本源一致，是本票的清场步骤。
