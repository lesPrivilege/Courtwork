# GUI-HIERARCHY-1 · 结构性层级（去扁平）

状态：**架构已冻结，待实现**。基线 `6b67857`。
前置：`GUI-COMPOSITION-1` 必须先清账——本票是加法，前票是减法，倒序做会互相盖写。

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

| 编号 | 参考图上的手段 | 裁定 | 仓内既有语汇 |
|---|---|---|---|
| `GH-R1` | 树的逐级缩进＋`└─` 连接线＋右侧计数徽标 | **可转移** | 乌丝栏细界线；`--rule-minor` |
| `GH-R2` | `Folders`／`Files` 以大字阶开节，节与节之间有真实断点 | **可转移** | `--type-display-size` 20px；`--type-title-size` 18px |
| `GH-R3` | 下方是真表格：列头＋对齐列＋每行承载多个事实 | **可转移** | `.file-ops-table`（`styles.css:516`）、`--rule-major` 列头界 |
| `GH-R4` | 主面与其容器之间有一档 elevation | **可转移** | `--elevation-shadow` 唯一批准值 |
| `GH-R5` | 一屏承载的真实行数远高于现状 | **可转移** | 既有密度律（`typography-density.md`） |
| `GH-R6` | 3D 立体文件夹图形与投影 | **拒** | 装饰无业务语义；`svg-standards.md` 禁 fill／内联色 |
| `GH-R7` | 彩色第三方品牌图标（Drive／Notion／Word 等） | **拒** | 语义色稀缺律：chrome 零彩色 |
| `GH-R8` | 卡片网格与大圆角色块 | **拒** | `principles.md`：成熟感不来自卡片数量与重阴影 |
| `GH-R9` | 多级阴影与悬浮层 | **拒** | elevation 单值锁（`assert-elevation-shadow.mjs` 三重锁） |

批准行 **`GH-C01`**：

> Pi Work 与 case rail 的层级由**结构**承担，不由装饰承担：同屏内不同语义层必须在字阶、
> 线重、缩进三者中至少两项上可区分；多事实的集合以真表格呈现而非等宽文本行；一档且仅一档
> elevation 用于区分主面与其容器。禁止以卡片、彩色、图形插画或第二档阴影制造层级。

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

结论：**直接依赖：无；借行为范式：树连接线与列头分层取通行文件浏览器语义；
保留自研：线级语汇、字阶真源与机器门；删除当期动作：无。**

## 四、逐项冻结的目标形态

- `GH-C01-a`（对 R1）：case rail 的层级以缩进＋连接线显式化，父子关系不再只靠缩进量猜。
  连接线用既有 `--rule-minor` 与 `border` 语汇画，不新增 token、不新增图标。
- `GH-C01-b`（对 R2）：Pi Work 面的节（工作流、结果席、账行区）以既有字阶开节，
  节间断点由线重承担；同屏相邻两层不得字阶相同且线重相同。
- `GH-C01-c`（对 R3）：承载多事实的集合（运行详情、账行、材料列表）改用既有 `.file-ops-table`
  语汇的列式呈现，列头以 `--rule-major` 与正文分界。不得为此新建组件文件。
- `GH-C01-d`（对 R4）：主面与容器之间用且仅用既有唯一 elevation 值区分，不加第二档。
- `GH-C01-e`（对 R5）：密度按 `typography-density.md` 现法收紧，1440×900 下一屏承载的真实
  信息行数须显著高于 `GUI-COMPOSITION-1` 清账时的读数，具体基线由实现者实测并写入回执。

## 五、TDD、视觉与验收

先写红，至少四枚断言须在基线上实际红：连接线存在（`a`）、相邻层字阶或线重可区分（`b`）、
多事实集合为列式（`c`）、一屏行数达标（`e`）。

至少三枚 mutation：加入第二档 elevation 必须红；引入任一色值字面量必须红；
把列式退回等宽文本行必须红。

门：`GUI-COMPOSITION-1` 第五节全套，另加 `lint:icons`（证明零新图标）。
颜色零改的自证同前票：diff 中无色值字面量增删。

视觉证据：light 1180／1440／390 × empty／running／proposal／succeeded，另 dark 1440 smoke。
核对：层级可辨、零装饰新增、零彩色 chrome、零横溢。**另须做一次 squint test**——眯眼后
仍能分出层次即成立，分不出则本票未达目的，如实登记不得粉饰。

独立验收由不同会话在 clean worktree 复跑，实际注入装饰类反例（加卡片、加第二档阴影、
加彩色图标）验证机器门确实拦得住。独立 PASS 前不得清账，实现会话不得自验收。

## 六、实现回执

（待实现会话填写。）
