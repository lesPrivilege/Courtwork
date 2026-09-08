# WK9 · clean 评估（Home A/B 与工作页两态）

2026-09-09，Opus，WO-WK9 交付件之三。判准取 intake-round-2 WK-36；数据口径取 WK-37 与 EX-WK5；表面与状态规则取 `surface-hierarchy.md`、`ux-conventions.md` §1–§4、`ui-composition-standard.md`。本页只评估已画出的七块 artboard，不代替用户四轴判断。

## 1. 测量方法

七块板都是静态 HTML，只依赖同目录 `tokens.css`（WK7 `claude/wk7-color-governance` 的三个 `:root` 块逐字复制）与 `board.css`（只引用 role token，全文件零 hex，`grep -E '#[0-9a-f]{3,8}|rgb\('` 无命中）。

- 渲染：本机 Chrome `--headless=new --allow-file-access-from-files`，浅深两宗分别取 `?theme=light` / `?theme=dark`，深宗另经 `prefers-color-scheme` 复核。
- 带高：板内 `?measure=1` 读 `getBoundingClientRect()`，同时扫描全部元素的右边界，报告任何超出 `clientWidth` 的溢出源。
- 1440 三块板在 client 1440×900、1440×813、1440×640 三档下均无横向溢出（`scrollWidth = 1440`）。
- 390：headless 窗口在 macOS 上有 500 px 下限，故 390 板经一个 390×844 的 iframe 宿主页渲染；两块窄板 `scrollWidth = 390`，无溢出。

## 2. WK-36 逐项评分

评级：**通过** / **条件**（满足判准但附带需要用户裁的取舍）/ **未过**。

| WK-36 判准 | Home A（卡片网格） | Home B（行） | 工作页 收敛态 | 工作页 展开态 |
|---|---|---|---|---|
| 每屏 accent 使用 ≤ 3 处 | 通过 · 2 处 | 通过 · 2 处 | 通过 · 1 处 | 通过 · 1 处 |
| 每带一个网格、无嵌套卡片 | 通过 · 上带 1 个三列网格、中带 1 个输入面、下带 1 个两列网格；卡内只有文本行 | 通过 · 下带为单列行表，卡片数归零 | 通过 · 三张悬浮卡各只含文本行与数据列表，无卡中卡 | 通过 · 面板内全为 section 与文件行，无卡片 |
| 无装饰插画与渐变 | 通过 | 通过 | 通过 | 通过 |
| 状态一律文字，不用彩色胶囊 | 通过 · 八态固定文案，仅 `waiting_user` 取 `--accent-ink`、`failed` 取 `--danger`，其余灰字 | 通过 · 同 A | 通过 · 只有 `Completed` 灰字 | 通过 |
| 热力图灰阶、单一强度轴 | 通过（以不画满足）· 只有一行 "Planned · Backend pending" | 同 A | 不适用 | 不适用 |
| 三带比例 1 : 1.2 : 1.8，上带 ≤ 160 | **条件** · 见 §3 | **条件** · 同 A | 不适用 | 不适用 |
| 卡片内距 20、间距 12、圆角 12 | 通过 · `--card-padding` 20 / `--space-3` 12 / `--radius-card` 12；390 降为 16（编排体例"窄屏 16"） | 通过（无卡片；行内距 12/8） | 通过 · 三张悬浮卡同上 | 通过（无卡片） |

补充两条不在 WK-36 但影响判断的观察：

- **A 与 B 的真实差异只有一处。** 上带与中带在两块板上逐像素相同，下带用同一批字段。A 的七个对象产生七圈轮廓（SH-5 "Dashboard 每个重复会话都像独立表单卡" 正是被点名要改的形态）；B 用行与一条分隔线表达同一集合，扫描 title 与状态词更快，也更贴 SH-1 的"连续阅读、扫同类对象 → 列表行"。
- **A 的可辩护理由是"整体打开"。** SH-1 允许"可独立打开/选择/处理的对象且多种内容需成组"成卡；WorkCard 确实是一个整卡可点的对象。取舍在于：这批对象没有需要人当场决定的动作（等待回答/授权的对象在上带计数里，不在下带），因此本评估倾向 B，A 留作用户偏好卡片密度时的备选。

## 3. 实测带高与比例冲突

`home-a-1440` / `home-b-1440` / `home-shell-1440` 三块板的带高一致（shell 条只占侧栏，不进主区）：

| client 高 | band 1 | band 2 | band 3 | 实测比例 |
|---|---|---|---|---|
| 1440 × 900 | 160 | 192 | 548 | 1 : 1.20 : 3.42 |
| 1440 × 813（900 窗口减浏览器外框） | 160 | 192 | 461 | 1 : 1.20 : 2.88 |
| 1440 × 640 | 160 | 192 | 288 | **1 : 1.20 : 1.80** |

WK-36 的两条约束（上带 ≤ 160、比例 1 : 1.2 : 1.8）只在三带总高 = 640 px 时同时成立，因为 1.8 倍数被 160 的封顶锁死在 288。client 高度超过 640 的每一像素都必须落到某处。三种落法：

1. **落进下带**（本画布采用）。上带精确 160、中带精确 192、下带 `minmax(288px, 1fr)` 吸收余量并内部滚动。两条硬约束里"上带 ≤ 160"被逐字满足，1.2 被逐字满足，1.8 退为下带最小值。代价：900 高下实测 3.42。
2. **落进顶部留白**。比例可在任意高度精确成立，但 900 高下 Home 顶端出现 260 px 空白；WK-32 已用三带布局取代 WK-11 的垂直居中，这个方向与该裁定相反。
3. **按比例整体放大**。1 : 1.2 : 1.8 精确成立，但上带在 900 高下变成 225 px，直接违反 ≤ 160。

采用 1 的判断依据：三带里只有下带的内容量是真实可变的（`sessionCandidates` 分页），上带三个数字与中带 composer 的内容高度是固定的，把余量给它们只会制造空洞。请用户裁定是否接受"1.8 作为下带最小值而非固定比例"这一读法；若不接受，方案 2 可在一次改动内切换。

## 4. accent 与状态色计数

计数口径：`--accent` / `--accent-strong` / `--accent-soft` / `--accent-ink` 四个 role token 的可见使用；focus ring 不计（SH-2 明示焦点反馈不受"只用一种装饰"限制）；`--danger` 单独计。

| 板 | accent 使用 | 明细 | danger |
|---|---|---|---|
| home-a-1440 | 2 | composer 的 Send 实心（WK-25：一个表面只有一个当前提交）+ 一处 `Waiting for you` 状态词 | 1（`Failed`） |
| home-b-1440 | 2 | 同上 | 1 |
| home-shell-1440 | 2 | 同上 | 1 |
| home-a-390 | 2 | 同上 | 1 |
| work-collapsed-1440 | 1 | Send 实心 | 0 |
| work-expanded-1440 | 1 | Send 实心（在被 `inert` 的底层） | 0 |
| work-390 | 1 | Send 实心 | 0 |

深宗下的已知退化：铅灰 skin 的 `--accent-ink` 在深宗等于 `--ink`（都是 slate-12 dark `#edeef0`），`Waiting for you` 因此只靠字重与措辞区分，颜色不再承担信息。这符合 WK-21 单色 accent 的裁定，也符合"状态不是仅靠颜色"（IC-1），但意味着深宗下等待态的注意力全部来自措辞与位置；如果用户希望等待态在深宗仍有色相，需要的是 skin 层（tier:S）的新 accent，不是组件层的例外。

## 5. 参考图元素的排除清单

| 参考图元素 | 处置 | 理由 |
|---|---|---|
| Today 四格（按"今日"过滤的计数） | 改为三个"当前"口径 StatTile | EX-WK5 §1：work-summary 三集合没有"今日"过滤字段，`pendingItems` 需前端按 `createdAt` 再筛且无 timezone 保证；WK-37 已裁定取 `total`、时间窗口写成"当前" |
| 活动热力图 | 只画一行 "Planned · Backend pending" 文字行 | 无跨会话 run 列表端点（EX-WK5 §1 末行）；逐会话 `GET /sessions/:id` 是 N+1，`latestRun` 每会话只有一条，不能冒充按日计数。登记为 gap G-1 |
| Progress 步骤卡（done / pending 步骤） | 不画 | run / session / question schema 全无 step / stage 字段；从事件流反推"步骤完成度"是新发明语义（WK-16、ux-conventions §3） |
| 任何百分比 / 进度条 | 不画 | 无字段支撑；WK-34 已裁定不进产品，boundaries §5 明示"阶段名称能够推导进度百分比"是不能从视觉推出来的事实 |
| Context 卡的 "links" | 不画 | session / run / question / artifact 均无 URL 或引用链接概念（EX-WK5 §3） |
| 日历事件、专注小时 | 不画 | 无数据源；boundaries §5 Calendar 行"真实数据源未成立时仅设计/gap"，本轮连设计位也不占，避免暗示能力 |
| "Focus mode"、吉祥物、装饰插画 | 不画 | 违反 WK-36"无装饰插画"；吉祥物另无任何语义承载 |
| 彩色状态胶囊 | 不画 | ux-conventions §1"胶囊底色退役"；状态改为文字，只有 failed / waiting_user 允许颜色 |
| 蓝系强调 | 不画 | WK-21 已让蓝钢退出，铅灰 skin 的 accent 为单色 ink；新增色相属 tier:S 决定 |
| 渐变与多层阴影 | 不画 | WK-36；SH-2"同一边界先选一种主手段"。悬浮卡只用 `--shadow-float` 一次，卡内行不再重复投影 |
| "edited 2h ago" 相对时间 | 改为已记录时刻 | 字段本身不含相对时间字符串，相对量是前端推断；ux-conventions §3"只画已记录字段" |
| 多文档 tab 条 | 只画一行 gap 文字 | 现有 `#surface-tabs` 是固定三 kind 单选 tablist，`state.surface.kind/runId/fileRef` 均为单值（EX-WK5 §3）。登记为 gap G-2 |

## 6. 两态评估补充

- **收敛态**的三张卡与展开态的面板消费同一批字段，差别只有可用宽高与层关系。收敛态里 Run 卡的 usage 用 `dl` 数据列表而不是三个小卡，遵 SH-5"Run 元数据和 usage 保持 DataList，不倒退成统计小卡"。
- **展开态**的面板标题取会话身份（`Exhibit index rebuild` + 项目名），kind 名留给 tab，避免标题与选中 tab 重复同一个词。
- 面板内容列仍受 740 上限约束，因此展开带来的增益主要是纵向与层关系，横向从 380 增到 740。若用户认为文件树值得更宽，需要改的是编排体例的列宽例外，不是本画布。
- Escape 次序按 EX-WK5 §2 现状绘制：面板上同时存在 `Return to chat`（还原布局）与 `Close`（关闭），对应第一次与第二次 Escape。本画布未改动该次序、kind 静态映射或 renderer 身份。

## 7. 需要用户裁的三点

1. 下带用 A（卡片）还是 B（行）。本评估倾向 B；A 的唯一优势是整卡命中区更大。
2. §3 的比例落法：接受"1.8 作为下带最小值"（现状），还是改用顶部留白使比例精确成立。
3. 深宗下 `Waiting for you` 失去色相（§4）是否可接受；若不可，属 skin 层议题。

---

## 8. 对齐带实测（r2，2026-09-09）

r2 消费 WK-39 / WK-40 / WK-41 / WK-42 与 WK-46。本节的每个数字来自量板 `alignment-1440.html`：参考线与表格都由画板自身的 `getBoundingClientRect()` 生成，静态服务在 `http://127.0.0.1:8856/`，视口 1440 × 900，浅深两宗各测一遍（几何与主题无关，两宗读数相同）。

### 8.1 三栏顶部带

| 量 | work-collapsed-1440 | home-a-1440 | 判读 |
|---|---|---|---|
| 三栏 header `top`（侧栏 wordmark 行 / chat header / rail header） | 0 · 0 · 0 | 0 · 0（Home 无右栏） | 相等 ✔ |
| 三栏 header 高 | 56 · 56 · 56 | 56 · 56 | = `--band-top` ✔ |
| 展开态 tab 条 `top` / 高 | 0 / 56（`work-expanded-1440`，与侧栏 wordmark 行同带） | — | ✔ |
| 桌面壳（`home-shell-1440`） | shell 条 0–52（惰性），带 52–104，带高 52 | 同左 | `--band-top` 在 `.window` 内改写为 52，合 WK-42「52 + shell 条」 ✔ |

### 8.2 gutter 与左边缘

| 量 | 实测（1440 × 900） | 判读 |
|---|---|---|
| 三栏列宽（nav / thread / rail） | 250 · 810 · 380 | — |
| chat header 内容左 − 740 内容列左 | 285 − 285 = **0** | 标题行与正文列共一条左边缘；header 内层与 body 内层用同一个 `max-width: var(--column)` 盒 |
| 模块卡左 − 右栏内容左 | 1085 − 1061 = **24** | = 一个 `--col-gap`；rail header 内容左也是 1061，故 rail 标题与卡片左边缘差 24，卡片自身不带外边距（WK-41） |
| 模块卡左 − 740 内容列右 | 1085 − 1025 = **60** | = 2 × `--col-gap`（两列各出一个 gutter）+ 1 px 分栏线 + 11 px 居中余量；余量随视口收窄而消失，≤ 1418 时该值恰为 49 |
| 侧栏文字左（wordmark / 导航行 / 底部 account 行） | 20 · 20 · 20 | 同一 `--nav-inset` ✔ |
| Home 三带高（900 高） | 160 · 192 · 492（1 : 1.20 : 3.08） | WK-46 (1)：1.8 读作下带下限，实测 3.08 ≥ 1.8 ✔ |
| Home band 1 顶 | 56 = 带下沿 | 统计砖整体落在带以下 ✔ |
| 横向溢出 | 七块板 `scrollWidth` 均等于视口宽 | 无 ✔ |

两处刻意的不对齐，连同理由记在这里，免得后续读成 bug：

- **chat header 对齐 740 内容列（285），surface band 的 tab 条对齐列 gutter（274）。** chat header 陈述的是会话事实，属于正文列，压在正文列上读起来是一条线；展开面的 tab 条与 Return to chat 是宿主控件，且展开面的内容列宽会随 tab 在 740 与 960 之间切换（WK-46 (4)），若让 tab 条跟随内容列，切 tab 时 tab 条会横向跳动。故宿主控件锚在列 gutter，内容列各自居中。
- **中栏 740 与右栏卡片之间是两个 gutter 而不是一个。** 每一列自己出一个 `--col-gap`，这是 WK-42「模块内容不自带外边距、对齐由宿主 grid 与 token 实现」的直接后果；若压成一个 gutter，就必须让右栏卡片贴住分栏线，或让中栏正文列右靠——两者都更差。

### 8.3 Home 顶部带为何留白

Home 的那一格只放导航开合位（侧栏打开时该位为空但保留宽度），右侧不放任何东西。理由：Home 没有会话，因而没有标题、没有 run 状态词；而连接名在这一屏已经出现两次（侧栏底部 account 行、composer 的 context 行），按 WK-40「不承担定义 / 条件 / 后果 / 对象名的文字与控件一律删」，第三次出现不成立。带下沿的那条 1 px 线横贯三栏，本身就是「同一条带」的可见证据，因此这格留白读作预留而非漏画。窄屏（390）另论：侧栏成抽屉，该格改放开合按钮与 wordmark，仍不陈述会话事实。

### 8.4 r2 改了什么

| 项 | 改动 |
|---|---|
| 侧栏（全部画板） | 按 WK-39 重排：wordmark 行（New project / Close nav 在右，且这一行就是带）→ New session（首行，`square-pen` + 文字）→ Home → 筛选 → Projects → account 式底部行（首字母圆标 `L` + 连接名 `Local test` + Refresh / Settings 两个 icon-only）。工作页画板的当前项目改为 Coastal Freight，与会话所属项目一致 |
| 工作页标题行 | 按 WK-40 收成一行：在场标记 16 + 会话标题 + run 状态词；原第二行 meta（项目 · 状态 · run 时段）删除，时段仍在正文末与 Run 卡内；项目名以 `.title-project` 静音前缀存在但在宽屏 `hidden`，390 板显示 |
| 连接徽标 | icon-only，accessible name `Connection · Local test`。受信 Lucide 子集里没有可表达"连接"的字形（无 plug / wifi / signal），故沿用 composer context 行同一枚在场圆点，不为此新增图标（新增须走 IC-2 的 STATIC allowlist） |
| 右栏 | 按 WK-41 拆成宿主的 band（`Work surface` + 展开动作）与 `rail-body` 卡片纵列；卡片不自带外边距，左边缘由宿主的 `--col-gap` 决定 |
| 展开态 | 由「scrim + 浮在壳上的 modal」改为壳内接管中右两列的面（`.shell--work.is-expanded`），tab 条因此落在同一带内，右端 Return to chat。**这会影响 EX-WK5 §2 记录的两级 Escape**：面不再是 modal，第一次 Escape 即 Return to chat 还原三栏，不再有第二级 Close。实现单 WO-WK10 需一并调 `renderSurfaceVisibility` / `handleSurfaceEscape`；本画布只出设计，未改产品 |
| 展开态列宽 | 按 WK-46 (4)：Workspace / File 两个 tab 用 960（文件列表与版本表），Run tab 与散文仍 740。G-6 由此解决 |
| shell 条 | 按 WK-46 (3) 改为横贯整窗的惰性条（只有左 80 px 红绿灯留位），不放任何按钮，不画 Back / Forward；侧栏开合留在 wordmark 行。G-4 / G-5 由此解决 |
| 带高 | 按 WK-46 (1) 写成 token：`--band-1: 160`、`--band-2: 192`、下带 `minmax(calc(1.8 * var(--band-1)), 1fr)` |
| 新增画板 | `alignment-1440.html`（量板，见 §8.1 / §8.2） |

### 8.5 accent 重新计数（口径同 §4）

| 板 | accent 使用 | 明细 | danger |
|---|---|---|---|
| home-a-1440 / home-b-1440 / home-shell-1440 / home-a-390 | 2 | Send 实心 + 一处 `Waiting for you` | 1（`Failed`） |
| work-collapsed-1440 | 1 | Send 实心 | 0 |
| work-expanded-1440 | **0** | 展开态不再叠在 thread 之上，板内不含 composer，故连 Send 也没有（r1 记 1，本行取代 §4 该行） | 0 |
| work-390 | 1 | Send 实心 | 0 |
| alignment-1440 | 1 | 只有"显示参考线"复选框吃 `accent-color`；参考线本身用 `--line-strong` 与 `--selected`，量板不进产品计数 | 0 |

深宗下 `Waiting for you` 仍只靠字重与措辞（WK-46 (2) 已接受），r2 未改。`board.css` 全文件仍无 hex、无 rgb 字面量（`grep -cE '#[0-9a-fA-F]{3,8}|rgba?\('` = 0）。

### 8.6 r2 之后仍需用户裁的

1. §7 的三点原样保留（下带 A / B、比例落法、深宗等待态）——WK-46 已裁定后两点，第一点（A 还是 B）仍未裁。
2. 展开态从 modal 改为壳内面所带来的 Escape 次序变化（§8.4），需要在 WO-WK10 立项时确认，不是画布能单方面决定的。
3. 连接徽标的字形：现用在场圆点。若要一枚真正的"连接"字形，须按 IC-2 向受信子集新增并锁版本。
