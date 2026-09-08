# 消融表 · WO-WK10a（WK-47）

2026-09-09，Opus。判据取 WK-47 (1) 原文：**去掉后用户判断（该做什么 / 发生了什么 / 依据在哪）是否仍成立；成立即删，不成立才保留。**

判断在**它所在的那一态里**做，不以"展开面里还有"作为保留理由——若"别处也有"能救一个元素，收敛态就永远删不掉任何东西，消融实验也就不存在。反过来，收敛态删掉的东西必须在展开面里仍能读到，否则删的是事实而不是重复。

## A. 导轨模块（模块本身）

| 元素 | 去除后失去的判断 | 结果 |
|---|---|---|
| A-1 **Run 模块** | "上一次 Run 做完了没有、留下了什么"。会话正文里只有一行状态词，没有产出计数 | **保留** |
| A-2 **Run 模块在无 run 时的空卡** | 无。没有 run 就没有可判断的事；一张写着"暂无"的卡是没有事实的分隔线 | **删**（`adapter` 返回 null，模块整条不出现；与 Run tab 的隐藏条件同源，卡与 tab 不会互相矛盾） |
| A-3 **File 模块在无选中文件时的空卡** | 无。同上 | **删** |
| A-4 **Workspace 模块** | "这次工作到底落在哪些文件上"。这是唯一跨 run 的文件事实 | **保留**（会话存在即在，因为"这个会话没有文件"本身是一个判断） |
| A-5 **Runtime 模块** | "下一次 Run 会带着什么跑、我的改动现在生不生效"。RC-4 的冻结后果无处可读 | **保留** |
| A-6 **未登记 / 未 exposed 的扩展模块** | 无 | **删**（WK-49 ①②：导轨无痕。本单不实现热插拔，登记表天然只有四条） |

## B. 卡片内的元素

| 元素 | 去除后失去的判断 | 结果 |
|---|---|---|
| B-1 卡片**标题**（Run / File / Workspace / Runtime） | 对象名。四张卡的行结构相似，无名即不可分辨 | **保留** |
| B-2 卡片**图标 16** | 无文字损失，但类型识别要逐字读。IC-1：位置与类型语义交给 glyph | **保留**（16 档，纯装饰 `aria-hidden`） |
| B-3 卡片**计数 / 状态词**（`Completed` / `2 files` / `23 resources` / `Current`） | "这一块现在是什么情况"。没有它，卡片必须展开才知道有没有东西 | **保留**（Codex anatomy 的"计数或状态"位） |
| B-4 卡片**尾部一个动作**（`Open`） | 进入展开面的路。键盘用户尤其没有别的入口 | **保留**（一个，且只有一个；无溢出菜单，因为没有第二个动作） |
| B-5 Run 卡的 **`Recorded 08:31 – 08:47`** | "这是不是我刚发的那一次"。同一会话里连续几次 run 只靠状态词无法区分 | **保留** |
| B-6 Run 卡的 **`Results N files`** | "这次跑出东西没有"。0 与 3 是两种完全不同的下一步 | **保留** |
| B-7 Run 卡的 **`Not accepted by a review.`** | 后果：已记录 ≠ 已接受。卡上没有第二处说这件事 | **保留**（有产出时才出现；0 files 时该句无所指，故不画） |
| B-8 Run 卡的 **usage 四行**（Input / Output / Cached / Turns） | 不失去三问中的任何一问。用量是成本细节，不是"该做什么 / 发生了什么 / 依据在哪" | **删**（WK9 画布曾绘；展开面 Run tab 仍有完整 usage 段与 `Usage is incomplete` 的下界说明） |
| B-9 Run 卡的 **Run ID / Command ID / Provider / Model** | 收敛态问不出这些；它们是排障时的依据 | **删**（展开面 `Run information` 内收，原样不动） |
| B-10 File 卡的 **路径行** | 对象名 | **保留** |
| B-11 File 卡的 **`Current` / `Recorded` 状态词** | "我现在读的是当前文件还是历史版本"。IC-1 明令二者不得混同 | **保留** |
| B-12 File 卡的 **短 hash** | 依据在哪：版本身份 | **保留**（12 位，完整 hash 与复制入口在展开面） |
| B-13 File 卡的 **同一 run 其他已记录版本行** | "还有哪些版本可读"，且可直接切过去 | **保留**（只列同一 run 已上报的 content-version，不另发请求、不推断） |
| B-14 Workspace 卡的 **文件夹分组头** | "这个文件落在 materials 还是 out"。写入位置就是后果 | **保留** |
| B-15 Workspace 卡的 **文件字节数** | "东西真写进去了吗、有多大" | **保留**（右列一栏，tabular-nums） |
| B-16 Workspace 卡的 **mtime / sha256** | 收敛态问不出 | **删**（展开面与 File 面保留） |
| B-17 Runtime 卡的 **按 kind 逐行计数**（13 行） | 不失去判断。十三个数字只是把展开面的清单缩小重画 | **删** |
| B-18 Runtime 卡的 **Capabilities / Context 两行** | "下一次 Run 能做什么、会读什么"。这是 WK-63 给该模块的一级分节，不是本单新造的分类 | **保留**（两行） |
| B-19 Runtime 卡的 **`Frozen until this run ends.`** | 后果：改动延后而非被拒。RC-4 | **保留**（仅冻结时出现） |
| B-20 **卡内嵌套卡** | — | **删**（结构禁令，WK-36 / WK-47 (2)：行内不嵌卡） |
| B-21 **进度条 / 百分比 / 彩色状态胶囊** | 本地无 step / stage / 完成率字段，画出来即发明语义 | **删**（gaps-wk9 排除项；DOM 断言逐条核过：`progress` / `meter` 0 个，`%` 0 处） |
| B-22 **模块卡自带的外边距** | — | **删**（对齐由宿主 grid 与 `--col-gap` 给；DOM 断言 `margin: 0px 0px 0px`） |

## C. 展开面（tab pane）

| 元素 | 去除后失去的判断 | 结果 |
|---|---|---|
| C-1 **tab 条** | 四种 kind 之间的切换；箭头 / Home / End 的键盘路径 | **保留**（原 id、role、次序不变） |
| C-2 **面板标题 `#surface-title`** 的可见文本 | 展开态无：tab 条自己就是标题，且带内两处标题互相打架 | **删（视觉）/ 保留（可访问名）**：`aria-labelledby` 关系不动，标题在展开态转为 sr-only |
| C-3 **`Return to chat` 与 `Close`** | 两条不同的退路：还原三栏 vs 关掉导轨。IC-1 明令 Back 与 Close 不共用一个语义 | **保留**（两枚 icon-only，各有 accessible name） |
| C-4 **展开态的 scrim 与浮层阴影** | 无。壳内面不覆盖任何仍需可读的东西，侧栏仍可操作 | **删**（WK-54：由 modal 改壳内面；`aria-modal` 随之取消，见交付 §3） |

## D. composer 行（WK-55 / WK-58）

| 元素 | 去除后失去的判断 | 结果 |
|---|---|---|
| D-1 框内 **附件按钮** | 发送前加文件的唯一入口 | **保留**（稳定行） |
| D-2 框内 **连接 chip**（`Local test`） | "这条消息交给谁跑"。发送前的后果 | **保留**（稳定行） |
| D-3 框内 **Send**（圆形 icon-only） | 当前提交 | **保留**（UP-3 冻结构图，不重画） |
| D-4 框内 **Cancel run** | 中止的唯一入口，且只在运行时出现 | **保留** |
| D-5 框内的 **Project / File writes / New project** | 它们随 Home 与会话变动，不属于"稳定一行" | **删（移出框）**：已在整合支 `06e0d93` 落到 `#composer-below`；本单只确认其仍在框外 |
| D-6 **`Enter to send · Shift+Enter for a new line`** | 无 | 已删（WK-12，先前工单） |
| D-7 窄屏 composer 的 **浮层材质**（`--panel` + 1px `--line-strong` + `--shadow-float`） | 去掉后 header 带、列表行、composer 三层同色同厚，窄屏读成一张扁平纸 | **保留**（WK-60 的三层物性；DOM 断言核过 `position: sticky` 且 `box-shadow ≠ none`） |

## E. 结构性删除（"删除任一模块不留空位与死样式"，WK-47 (3)）

| 项 | 处理 |
|---|---|
| `#surface-eyebrow`（`Inspect`） | DOM 节点与文案一并删 |
| `.workspace-description` | 文案删，CSS 规则同批删（无孤儿样式） |
| `renderWorkspaceFiles()` | 由 `loadWorkspaceTree()` + Workspace 模块的 `card` / `pane` 取代，旧函数不留 |
| `.surface-expanded .surface-panel { position: fixed; inset: 24px }` | 随 C-4 一并删 |
| 宿主内的逐 kind 特判（`kind === "run" ? … : kind === "file" ? …`） | 由登记表遍历取代（`visibleSurfaceKinds`、tab 循环、pane 循环都不再点名 kind），只余 `surfaceKindTitle` 一处仍按 kind 给标题——因为 Run 的面板标题是 `Run details` 而模块名是 `Run`，这一条差异记在这里，未消 |
