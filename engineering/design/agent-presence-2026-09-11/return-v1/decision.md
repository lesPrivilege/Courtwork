# Agent presence · return-v1 作者裁量记录

2026-09-12 · 作者 Claude Opus 5（`claude-opus-5`，Claude Code 本地agent）。输入为 [HANDOFF](../../../research/agent-presence-2026-09-11/HANDOFF.md) 与同目录索引/裁决，Courtwork `a3a337f`（HANDOFF 基线 `ec240e7`）。本文件只记录作者的比较结论与推荐路线。几何、色阶、深度、节奏与落位的最终裁定由 Astra 在真实视觉调试后作出；这里不构成产品接受。

## 1. 推荐路线（一条）

**A→B route，`=` 眼，放在 composer 状态行，16 px flat。**

- 静止时用 A 嘴（平静括弧 `=]`）；宿主给出明确 thinking 事实时，嘴型在 180 ms 内逐点过渡到 B（几何下垂 `Ʒ`），并做局部压展；事实结束后从当前形状接续回 A。两张嘴共用同一 13 点三次曲线结构，所以任意时刻切换都不会跳帧（`src/geometry.mjs`，测试 “a state change continues from the shape on screen”）。
- 放在 composer 内今天 `composer-run-hint` 的位置，替换那颗 1.6 s 无限脉冲的圆点；后面的事实短语、elapsed 和 “Your input will not be sent automatically.” 沿用现有句式。输入、Stop/Send、Files、模型选择的位置都不移动。
- Chat 内 16/20 px 只用 flat。soft 2.5D 留给 ≥32 px 的身份场景（本片没有 Chat 内落点，Home 空态等由 Astra 另裁）；hard extrusion 不推荐。

理由：

1. B 单独作为 idle 时读成 `=3`（撅嘴/亲吻），在 16 px 下更明显；A 在任何尺寸都读作平静。所以 HANDOFF 的 “B 为 thinking 首选、A 保留 idle 基线” 可以落成同一张脸的两个表情，不需要两套身份。
2. C（`ε`）的腰部尖点在 16 px 糊成一团，两瓣朝向眼睛也挤压了眼嘴间距；作为柔和对照保留，不推荐。
3. 角落落位让 Files 和模型按钮随事实文字的长度左右移动（见 `evidence/states-corner-dark-1440.png`）；在 390 与 200% zoom 下事实只剩 `ws_grep · "…`（`evidence/zoom200-corner-long-label.png`）。若改成只放脸，又会丢掉必须可见的文字事实。状态行没有这两个问题。
4. `:` 眼在 16 px 变成两个小点，重量明显轻于嘴，与原图 `=」` 的双横拓扑也断开，读起来更像通用表情符号。

## 2. 三组比较

| 组 | 使用的参考 | 保留 | 排除 / 风险 |
|---|---|---|---|
| A · 平静括弧 `=]`/`=)` | V-01（`]` `)` 拓扑）、V-02 原图 `=」` 的折角嘴、L-06 光学矩阵方法 | 最稳定的 idle；16 px 清楚；圆角 1.6 单位，介于 `]` 与 `)` 之间 | 单独用时 thinking 只有压展，表情变化小 |
| B · 几何下垂 `Ʒ` | V-01 用户轮 `00307ee0`（下垂嘴、近似字母 3）、L-03 `running ≠ progress` | 平盖＋直斜线＋单碗，thinking 辨识度最高 | 作为 idle 读成撅嘴；碗在 16 px 需要 2.4 单位笔重 |
| C · 柔和下垂 `ε` | V-01（`ε`）、同上 | 64 px 下最柔和 | 腰部尖点在 16/20 px 糊；两瓣朝眼压缩负空间 |
| A→B route（推荐） | 以上＋L-04 品牌短动作的中断规则、X-05 face/action 分离（仅作方法名，未打开） | 同一双眼，嘴随事实变化 | 过渡中间形态只存在 180 ms，未经真实设备观察 |

外部链接（X-01…X-14）与 Scout 层（S-01…S-04）本轮均未打开，也没有联网。X-02 的 “确定性 `sample(t)`、冻结截图回归” 和 X-05 的 “脸与动作分离” 只作为方法名使用，实现全部原创，没有复制任何 donor 代码、字形或资产。

## 3. 几何与材质（实验值）

- 24 单位画布，眼在左、嘴在右，保持横置，不旋转，也不加头壳。`=` 两横位于 x 4.6–9.4、y 9 / 15；嘴的内缘在 x 14.6。
- 光学笔重（viewBox 单位）：16 → 2.4、20 → 2.2、24 → 2.0、32 → 1.9、64 → 1.7；`:` 点直径另表。这些值用来保证 16 px 下笔画约 1.6 px，与相邻 Lucide 18 px 图标同档。
- soft：深度层偏移 (0.5, 0.75)，笔重 +0.3，颜色取 `--line-strong`；sheen 偏移 (−0.2, −0.24)，宽 0.3，浅色用 `--paper` 28%，深色用 `--ink-strong` 22%。sheen 调低过两次（初版在 64 px 读成内描边）。
- hard：五层 (0.32, 0.42) 叠加，仅作静态对照。
- 颜色：tone quiet → `--muted-strong`；active、attention、danger 时脸用 `--ink`；unknown → `--muted`。脸永远不变红，失败只由文字（`--danger`）表达。forced-colors 下隐藏深度层，改用 CanvasText。

## 4. 动作（实验值）

| pose | 何时 | 表现 | 循环 |
|---|---|---|---|
| rest | idle、Working（无细分活动）、Cancelled | 静止 | 否 |
| think | 仅明确 thinking 事实 | 嘴变为 B；高度 ±5.5%、周期 2600 ms（seed ±4%），宽度反向 0.6 倍保体积；首四分之一周期淡入振幅 | 是，唯一的循环；可暂停，隐藏页停时钟 |
| look | 工具活动（单个或并发） | 两横右移 0.8、错层 0.45，静止保持 | 否 |
| hold | 等待、授权、Blocked、Stopping、Stop requested、Failed | 嘴轻压 0.18，静止 | 否 |
| settle | Completed | 一次展开并回位，220 ms（品牌上限） | 否 |
| dim | 连接未知、Run unknown | 静止，改用 `--muted` | 否 |

状态切换统一用 180 ms 与 `--ease-out`，从屏幕上当前的参数接续。reduced-motion 下所有 pose 静止，thinking 固定显示 “Thinking”。帧只在确有运动时由 rAF 驱动，其余时间只在下一个词或秒的边界唤醒一次；任何新事实、选项或时钟变化都会作废旧的唤醒（generation token）。

## 5. 文案分层

- 优先级：连接未知 > 终态 > 等待（授权 > 用户）> Stopping > Blocked > Stop requested > 工具 > thinking > Working > idle。
- 工具标签用工具自己的名字加目标（`ws_read · app/web/composer-field.mjs`），与工具行显示 `row.name` 一致；不猜动词。并发时显示 “2 tools running”，详情逐项带 scope，并注明顺序不代表进度。
- 氛围词只在明确 thinking 事实下轮播，每段 thinking 的第一个词固定为 “Thinking”；五个词都是本地测试样本，不是 Claude 的默认词库，也不是源会话提到的 185 词（从未收到）。读屏只播事实变化（`live-region` 检查：4 次变化 4 次播报，轮播词 0 次）。
- “Stop requested · still working” 一直保留到宿主报告终态；Completed 的详情注明不代表 Review 或接受；连接未知不显示 Ready。

## 6. 最近实现先例

| 先例 | 路径 | 本片如何对齐 |
|---|---|---|
| 长运行状态行 | `app/web/app.mjs` `paintWorkingClock` / `renderComposer`；`styles.css` `.composer-run-hint`、`se-pulse` | 同一位置、同一句式与 elapsed 格式（`formatElapsed`）；Stop 与 Send 原位互换；非活动时隐藏提示句 |
| 在途词 | FE-04 `requestLabel`（`cancel requested ≠ stopped`） | 取消在途时 Stop 显示 `Sending…` |
| 品牌短动作 | `brand/CONTRACT.md` Motion lifetime | settle ≤220 ms；可中断；reduced-motion 直接呈现静态终态；不发业务事件 |
| 纯投影 | `presentation-adapters.mjs` 与 presentation-primitives 约束 | `projectPresence` 无时钟、无 fetch，缺失保持缺失 |
| 原生 SVG / currentColor | `ui-controls.mjs` `icon()` | 同样的 SVG 属性，stroke 取 currentColor；场景图标直接引用 `app/web/vendor/icons.svg` |
| 工作中的 ledger 动效 | `styles.css` `.activity-group.is-working` 渐变 | 未改动；与本片的 thinking 循环可能同屏，需要 Astra 观察叠加 |

## 7. Grammar gap（需 owner / Astra 裁决）

- **G-1 身份材质**：Material grammar（FN-28）规定材质只表达层次、不表达状态。soft depth 属于身份材质，`--presence-depth` / `--presence-sheen` 是本片局部 role，若采用需要在 R 层登记并过 `lint-materials`。
- **G-2 长循环**：品牌合同不允许循环；本片的 thinking 循环只存在于独立 specimen。现有产品里 `se-pulse` 已经是 run hint 上的无限循环，本方案用更慢的局部嘴动替换它，循环数量不增加；是否修改品牌合同或另立 presence 合同，由 Astra 决定。
- **G-3 工具动词**：`ws_read → Reading` 这类映射需要登记来源，本片只显示原名。
- **G-4 specimen 独有事实**：`blocked` 没有宿主事实；`cancel requested` 在 App 里是客户端的 `pendingCancels`，不是宿主字段。两者都只作 Design fixture。
- **G-5 终态行的生命周期**：今天的 run hint 在非活动时隐藏；本片保留终态词，以便看到 settle，并让 Failed/Unknown 可读。何时收起（下一次输入、发送，或交给流内 run-status 卡）待定。
- **G-6 与 glyph registry 的关系**：presence 不是 sprite glyph，没有进语义 registry；将来的静态 fallback 可以走 registry 链，动画路径保持独立（与 explore 的收敛一致）。
- **G-7 连接未知时的 Send**：场景中 Send 仍可用，App 的连接横幅负责这件事，本片未改。

## 8. 实验值清单

`OPTICAL`、`MOTION`、`DEPTH`、sheen 透明度、look 的 gaze/stagger、hold 的 press、词间隔 3500 ms（范围 2500–4000 可调）、嘴与眼的全部坐标，以及落位尺寸（状态行 16 / 角落 20）。以上都只是作者首轮值，没有经过真实设备的疲劳或刷新率观察。
