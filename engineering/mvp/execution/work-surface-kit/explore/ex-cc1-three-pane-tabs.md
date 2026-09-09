# EX-CC1 · 三面贯通与标签式工作区，只读探索

状态：只读 explore，Sonnet，2026-09-09，派单见 [intake-round-3 §4p WK-110 (c)](../intake-round-3.md)。

只读声明：本卷只读 `/private/tmp/se-fable-r4d`（基线 `386fbc6`，HEAD `00e33f9`）内的文档、`app/web/app.mjs`、`app/web/surface-modules.mjs`、`app/web/styles.css`、`app/web/index.html`、既有 evidence 脚本，以及通过 `git show` 只读引用了尚未合入本树的 `claude/fe03-chat-work:delivery-fe03.md`（该文件在本树 HEAD 不存在，见 §0 说明）。未修改任何产品代码、未 `git commit`、未启动任何服务、未新增依赖。结论一律标 file:line；无法核实处写“未核实”而不是猜测。

## 0. 派单要求与实际可读材料的落差

- `engineering/mvp/execution/work-surface-kit/delivery-fe03.md` 在本树（`claude/fable-round4d`）**不存在**：`git log --oneline -1` = `00e33f9`；该文件只存在于 `claude/fe03-chat-work`（`fabfd22`）与其之后未合流的历史里。intake-round-3 §4o（`intake-round-3.md:148`）记录 FE-03 "接受，交 Astra 合流（先 `claude/fe03-chat-work`，再 `claude/fable-round4d`）"——即本树尚未包含这次合流。本卷用 `git show claude/fe03-chat-work:.../delivery-fe03.md` 只读取值，§3 会注明这是"未合入本树"的引用，不是本树 HEAD 的产品事实。
- 派单提到的 `evidence/fe03/composition-checks.mjs` 在本树不存在（`find . -path "*fe03*"` 无结果）；能读到的等价证据是 `engineering/mvp/execution/work-surface-kit/evidence/fe01/composition-checks.mjs`，其断言只跑 **1440×900** 与 **390×844** 两档，没有 1024 档的截图/断言。本卷 §1 的 1024 档数字是从 `app/web/styles.css` 的媒体查询断点**推算**得出，不是从任何截图或断言脚本读出的实测像素——已在表格里标注“推算”。

## 1. 现状几何：Work 态在 1440 / 1024 / 390 下的实际列宽

### 1.1 结构：不是三栏 grid，是两栏 grid + 悬浮/覆盖层

`.app-shell` 的 grid 定义只有两列：

```
.app-shell { grid-template-columns: var(--nav) minmax(0, 1fr); }
```
（`app/web/styles.css:557,561`）

右侧“工作面”不是这个 grid 的第三个轨道。它是绝对定位在主区（第二个 grid 单元）内部的一层：

- 折叠态：`grid-area: -2 / -2 / -1 / -1`，`position: absolute`，`right: var(--col-gap)`，宽度固定 `var(--rail-width)`（`app/web/styles.css:4031-4066`，注释原文见 `styles.css:4008-4013`：“the work surface is an L2 floating layer over the main column, not a third column”）；`pointer-events: none` 落在层本身，只有卡片自己接收指针，层下面的正文仍可滚动。
- 展开态（≥1024px）：同样 `grid-area: -2 / -2 / -1 / -1`，但 `left: var(--col-gap)`、`right: var(--col-gap)`、`width: auto`，`z-index: 29`，配一张 `#surface-backdrop`（`z-index: 28`）盖住主区（`app/web/styles.css:4107-4131`）。这意味着展开态**覆盖整个主区宽度**（1440 下约 1136px，见 1.2），不是"阅读列仍可见、右侧另起一条独立分栏"。侧栏在展开态保持可操作（`interface-components.md:5`："carrying one tab strip and a return control, while the sidebar stays operable"），但阅读列被这层盖住，二者不同时可见。
- <1024px：展开与折叠两态都退化为同一个 `inset:0; width:100%` 的全屏 sheet（`app/web/styles.css:2126-2130`）。

`docs/interface-components.md:5` 原文对这一结构有明确定性："The work surface is not a third column: collapsed, it is a floating layer of module cards ... Expanded, the same surface becomes an L3 overlay over the main column"。这条契约现在直接与 shell-refinement 提出的"三个上下贯通、各自独立滚动的工作面"（`engineering/design/clean-cool-2026-09-09/shell-refinement.md:26`）冲突：现状是"二栏 + 悬浮/覆盖层"，不是"三栏并排、各自到底"。

### 1.2 三档实际像素（token 值见 `app/web/styles.css:266-292`，断点见 `styles.css:2050-2075,2126-2131`；1024 档为推算）

| viewport | 侧栏 `--nav` | 主区宽 | 折叠态卡片层 | 展开态覆盖层 | 阅读列 measure |
|---|---|---|---|---|---|
| 1440 | 256（`styles.css:288`，≥1200 生效） | 1440−256=1184 | `--rail-width` 360 + `--col-gap` 24 内缩＝392（`styles.css:289,4059-4060`）；阅读列仍保持 740（FE-01 断言 WORK-2/WORK-4 实测，见 1.3） | 主区整宽覆盖，1184−24−24=1136（`styles.css:4107-4116` 算出，未见专门截图核实） | 740（`--column`，`styles.css:274`），实测见 1.3 |
| 1024 | 220（`styles.css:2050-2053`，1024–1199 区间；1024 本身落在此区间内） | 1024−220=804 | 同样固定 360+24=384 内缩，但 804−24−408=372，**推算已小于 740**，即卡片层与 740 阅读列在 1024 会重叠/挤压——本树无实测确认渲染结果，只是算术推算 | 主区整宽覆盖，804−24−24=756（推算） | 目标 740，但主区仅 804，理论上放不下 740+左右 gutter；无 1024 档截图，实际渲染行为未核实 |
| 390 | 不在 grid 里；`max-width:1023px` 起 `.sidebar{display:none}`，折叠时变 `position:fixed` 覆盖层（`styles.css:2064-2075`） | 全宽 390，`--page-gutter`/`--col-gap` 降到 16（`styles.css:2127`） | 不适用：`max-width:767px` 起工作面折叠态与展开态是同一个 `inset:0;width:100%` 全屏 sheet（`styles.css:2126-2130`），FE-01 断言 HOME-narrow 系列在此宽度下验的是 Home，不是 Work surface 本身 | 同上，全屏 sheet | 阅读列不再是固定 740，随视口收窄（无专门断言给出具体像素） |

阅读顺位与 breakpoint 来源：`surfaceOverlayQuery = matchMedia("(max-width: 1023px)")`（`app/web/app.mjs:66`）、`narrowQuery = matchMedia("(max-width: 767px)")`（`app.mjs:69`）；`surfaceIsModal()` 用这两个查询判定展开态/折叠态是否算模态（`app.mjs:3236-3242`）。

### 1.3 已有断言实际测到的数字（只有 1440 与 390，无 1024）

`engineering/mvp/execution/work-surface-kit/evidence/fe01/composition-checks.mjs`：
- `open(url, {width=1440, height=900})` 是默认视口（`composition-checks.mjs:93`），`open(ORIGIN, {width:390, height:844})` 是唯一的窄屏档（`composition-checks.mjs:147`）——**没有 1024 档**。
- `WORK-2` 断言 Work 态 composer 宽度与 740 之差 ≤2px（`composition-checks.mjs:168-170`），`WORK-4` 断言折叠态卡片层打开（`show-surface-button` 点击，`composition-checks.mjs:175`）后 `readingWidth >= 640 && composer.width >= 640`（`composition-checks.mjs:180-187`）——这两条测的都是**折叠态悬浮卡片**（`show-surface-button` 只切换 `state.surface.open`，见 `app.mjs:5651` 与 `app.mjs:5454`"Open work surface"），不是展开态覆盖层，也不是本卷要评估的"tab strip + 文档面"场景。展开态（`is-expanded`）在 FE-01 证据里**没有对应的宽度断言**。
- `SHELL-1` 只断言桌面宿主安全区（80×52）内无可聚焦元素（`composition-checks.mjs:78-87,195-196`），当前只在 Home 视图跑（`shot("home-desktop-shell-1440-light")`，`composition-checks.mjs:190-196`），不含 Settings 与折叠态两态——这正是 WK-110 (b) 点名的缺口（`intake-round-3.md:150`）。

### 1.4 工作面今天怎么“打开”，有没有 tab

- `state.surface` 是**单一对象**，不是数组/Map：`kind`、`runId`、`fileRef` 均为单值字段（`app/web/app.mjs:139-165`），直接对应 `engineering/mvp/execution/work-surface-kit/backend-requests.md:6` 登记的缺口："BE-2 | 多文档 tab 的 surface 状态（当前为单值 kind / runId / fileRef）"——即"多文档 tab"今天在后端契约层面**根本不存在**，是一条待后端补的请求，不是前端选择不做。
- 今天确实有一条 `role="tablist"` 的 `#surface-tabs`（`app/web/index.html:596-598`），但它的四个 tab 是**固定的模块类型**（`run`、`file`、`workspace`、`runtime`），由静态表 `surfaceModules = [runModule, fileModule, workspaceModule, runtimeModule]` 声明（`app/web/surface-modules.mjs:477-482`），不是"同一类型的多个文档实例各开一个 tab"。点击某类型的 tab 会调用 `activateSurface(kind)`，其中 `state.surface.kind = kind` 直接覆盖单值（`app.mjs:3581-3593`）——即切到 `file` 类型只能显示"当前那一个" `fileRef`，打开第二个文件会覆盖第一个的引用（`openFile`，`app.mjs:3599-3603`），不会新增一个 tab。
- 键盘已经是 WAI-ARIA tablist 的标准实现：`#surface-tabs` 的 `keydown` 处理 `ArrowLeft/ArrowRight/Home/End`，在未隐藏的 tab 之间循环并立刻 `.click()`+`.focus()`（自动激活）（`app.mjs:5522-5539`）。没有"关闭"逻辑——因为这四个 tab 是类型页而非可关闭的文档实例，谈不上"关闭后聚焦邻近 tab"。
- renderer 实例：只有一个可挂载槽位，字段是 `state.surface.{controller, mounted, module, ownedContainer, context}`（`app.mjs:159-164`），挂载/卸载走 `disposeSurfaceRenderer()`（`app.mjs:1249-1272`），只在**换会话**（`app.mjs:1300,1405,1476,1999`）或**换绑定的 extension**（`app.mjs:1290-1298`）时整体销毁；在同一会话内来回切换 `run`/`file`/`workspace`/`runtime` 四个类型 tab 并不会销毁 `preview`（领域工作包）渲染器——四个类型各自有自己的 DOM 容器（`module.contentId`），靠 CSS `hidden` 切换可见性（`app.mjs:3403-3404`），不是逐次拆装。这部分已经具备"折叠不重挂"的雏形，但仅限于四个固定类型之间，不是多文档实例之间。

### 1.5 identity 字段：今天存在两套互不相通的身份

1. **领域工作包（`kind==="preview"`）渲染器身份**——决定要不要重挂 renderer：`{sessionId, extensionId, generation, status, modulePath}`，由 `surfaceIdentityFromExtension()` 产出（`app.mjs:777-786`），`sameSurfaceIdentity()` 逐字段比较（`app.mjs:759-771`）；这里的 `generation` 对应 `frontend-layering-spec.md:109` 的 FN-24"renderer generation 约束旧实例回调"。
2. **File / Run 打开身份**——`presentation-primitives.d.ts` 定义的三种 open intent：`OpenRunIntent{sessionId, runId}`、`OpenFileIntent{sessionId, path, kind: 'current'|'content-version', sha256?, runId?}`（`presentation-primitives.d.ts:61-78`）；`kind` 在这里是"当前文件 vs 历史版本"两种读取类别（`FileReadKind`，`presentation-primitives.d.ts:24`），不是模块类型。
3. **领域来源/候选（Review 阅读）身份**——更深一层，在 `docs/work-core/contract.md` 里：`replace_sources` 的载荷是 `{sources:[{id, version, text, digest}], revision}`（`docs/work-core/contract.md:33`）；`se_read_artifact({artifactId, offset, limit})` 返回 `{artifactId, candidateId, contentDigest, offset/end, lengthCodePoints, text, nextOffset}`（`docs/work-core/contract.md:54`）——"span"在契约里是 **Unicode code point 的 offset/limit 区间**，不是 PDF 页码或像素定位；`claude-handoff.md:29,40` 已经点名过这一点："引用跨度的UI符号应忠实契约，不从绘图推断闭区间"、"不得画未经后端提供的 PDF 页码、定位几何"。

这三套身份目前没有一个天然能覆盖 shell-refinement 想要的"跨类型统一 tab key"；§3 会逐条对照。

## 2. 宽度策略选项

前提数字：`--nav` 256（≥1200，`styles.css:288`）/ 220（1024–1199，`styles.css:2050-2053`）；`--column` 740（`styles.css:274`）；`--col-gap` 24（`styles.css:287`，≤767 降到 16，`styles.css:2127`）；WK-96 原文的硬约束："1440px下无法同时容纳256px导航、640px中面和宽文档时,应明确选择折叠/切换策略,不能静默把中面压到550px"（`shell-refinement.md:28`）；claude-handoff 对 `work-tabs.png` 的校正原文同一句话又重申一次（`claude-handoff.md:50`）。

1440 下三者算术：256（导航）+ 24（gap）+ 640（中面下限）+ 24（gap）+ X（文档面）≤ 1440 → X ≤ 496。也就是说，只要中面保持 ≥640 且导航保持 256，留给文档面的宽度上限只有约 496px——比今天悬浮卡片层的 360px 宽一截，但比一个"可舒适阅读的文档面"通常想要的宽度（如 560–640）窄。三个可行方向：

**方案 A：展开时导航收为图标列。** 参考 `interface-components.md:19` 已有的"侧栏折叠"控件（`panel-left`，chrome row），把折叠后的导航宽度（不是隐藏）设为一个更窄的图标列，腾出的宽度让给文档面。
- 1440 下：图标列（约 64–72，需要新裁定，现有 token 无此值）+ gap 24 + 中面 640 + gap 24 + 文档面 ≈ 1440−64−24−640−24=688。
- 冲突点：`docs/interface-components.md:15` 的 shell 三分工里，"侧栏切换"和"侧栏折叠为图标"是同一个 owner（app shell），但现有折叠态（`app.mjs` 的 `nav-collapsed` 类，`styles.css:2065-2066` 提到 `.app-shell.nav-collapsed`）目前语义是"临时收起"，不是"图标常驻"；改成图标列需要重新定义折叠态的可访问性（项目名/会话名今天在折叠态怎么读，需要额外裁定）。
- 与 SHELL-1 的关系：折叠为图标列不改变左上 80×52 安全区的位置，`SHELL-1`（`composition-checks.mjs:78-87`）不需要改断言坐标，但需要新增"折叠态"这一档的截图/断言——这正是 WK-110 (b) 已经点名的缺口（`intake-round-3.md:150`）。

**方案 B：主次视图切换（不同时三面）。** 展开文档面时，中面（chat+composer）临时让出全部或大部分主区宽度给文档面，回到"聚焦一个视图"的模型，用户用 tab strip 顶部的"返回聊天"或类似控件切回。这本质上是把今天的"展开态覆盖层"（`styles.css:4107-4131`，覆盖整个主区、聊天不可见）**保留其"互斥可见"的行为**，只是把承载内容从"单一工作面渲染"换成"tab strip + 文档面"。
- 1440 下：导航 256 保留不动；主次视图各自可以用到主区全部 1184px（减 gutter），文档面因此可以有舒适的 900+ 宽度阅读体验，不必挤进 496px。
- 冲突点：与 shell-refinement 明确写的"三个上下贯通的工作面"（同时贯通、独立滚动）字面冲突（`shell-refinement.md:24-26`），本质是延续现状而非采纳新方向；但完全符合现有 `ui-composition-standard.md:73` 的既有裁定——"右侧 contextual surface：有内容才出现；出现时正文 measure ≥640，不足则 overlay / collapse"，即 WK-96/97 本身已经把"overlay/collapse"列为合法解，不需要新增几何断言，只需要把 tab strip 语义叠加到现有覆盖层上。

**方案 C：只在更宽视口（如 ≥1680 或 ≥1920）才三栏并排，1440 维持现有 overlay/collapse。** 呼应 `shell-refinement.md:28` 原文"更宽视口可保留三面"。
- 1680 下算术：256+24+640+24+X≤1680 → X≤736，可以给文档面一个体面的宽度（接近 --column 740 本身）。
- 冲突点：需要新增一个断点（现有断点只到 1024/1199/1440 的隐含默认），且需要明确"1440–1679 之间"到底走 A 还是 B——不能语焉不详地留白，否则又是"静默压缩"的翻版。

**推荐**：B + C 组合，A 作为可选的后续加强，不作为第一步必需项。理由：
- B 不需要新几何断言就能上线（现有 WORK-4/WK-96 的"overlay/collapse"选项已经覆盖它的宽度合法性），改动集中在"给覆盖层加 tab strip 语义"而不是"重排 grid 列数"，风险最小，且不违反 `docs/interface-components.md:5` 现有的"work surface is not a third column"定性——除非 Fable 明确要推翻这条定性（那是一次需要显式记录的契约变更，见 `claude-handoff.md:19` "先同步体例、geometry assertions、词表及宿主契约；不要把这些差异伪装成普通 CSS 修复"）。
- C 把"三面同时可见"限定在算术上真正够用的宽视口，避免在 1440 这个产品目前的主力桌面宽度上做妥协几何。
- A 改动面最大（触及侧栏折叠语义、可访问性、SHELL-1 断言维度），且当前没有用户对"导航永久收窄"的明确裁定，建议作为 C 不够时的第二梯队选项，不首批做。

## 3. tab strip 宿主契约：逐条对照

shell-refinement.md §"标签式右区：宿主契约草案"（`shell-refinement.md:100-109`）逐条对照：

| 草案条款（原文出处） | 现有代码/契约对应 | 差距 |
|---|---|---|
| "tab key 必须包含对象identity、scope、读取类型和必要版本；标题和数组序号不充当identity"（`shell-refinement.md:104`） | 与 `frontend-layering-spec.md:109` FN-22 完全同义："实例 key 含 scope、对象 identity、读取类别与必要的内容版本；tab index 与标题不充当身份（WK-56）"——**这条草案不是新规则，是已冻结条款的复述**。可组的字段：文件/Run 用 `presentation-primitives.d.ts:61-78` 的 `{sessionId, runId}` 或 `{sessionId, path, kind, sha256, runId?}`；领域来源用 `docs/work-core/contract.md:33,54` 的 `{sourceId/artifactId, version, digest, candidateId}`；领域工作包渲染器用 `app.mjs:777-786` 的 `{sessionId, extensionId, generation, status, modulePath}`。**scope**（草案要求的字段）今天没有统一位置：`claude/fe03-chat-work:delivery-fe03.md §11②`（未合入本树，见 §0）记录 "Matter header 落在会话标题行"，且承认"若裁定 scope 位应随工作面走（`#surface-title` 一带），是一次纯位置改动"——即 scope 字段存在（session/Matter 绑定），但今天的 UI 落点在会话标题 meta 行，不在工作面/tab 区域。 | 三套 identity 字段已存在但分散在三处契约里，没有一个跨类型的统一 tab key 类型定义；scope 字段需要从会话标题 meta 行搬到工作面（纯位置改动，非新增字段）。 |
| "区分读取tab与领域Review；预览文件不是接受成果"（`shell-refinement.md:105`） | 对应 `presentation-primitives.d.ts:57-60` 的规则 3："全部 intent 是'打开一个已存在的对象'...没有任何 primitive 发出写入、批准、接受或取消"，以及 `docs/interface-components.md:95` "A decision button is drawn for a value the `decide` descriptor's enum names"——决定动作由 packet 自己的 `decide` 描述符门控，与"打开/阅读"是两条完全不同的类型（`OpenSessionIntent`/`OpenRunIntent`/`OpenFileIntent` vs `review-projection.md:19` 的 `answer`/`allow`/`deny`，且 `accept/reject/revise` "在 Core 契约成立前不出现（WS-01/A-4）"）。 | 现有类型系统已经把"读取"与"决定"分成两个不相交的 union，tab strip 只要坚持只发 open 类 intent，就自动满足这条；不需要新写隔离逻辑。 |
| "保存每tab滚动位置和局部草稿；切换/折叠/扩展不重新Run、不重置renderer或提交动作"（`shell-refinement.md:106`） | 折叠不重挂的部分已有先例：四个固定类型 tab 各有独立 DOM 容器，靠 `hidden` 切换（`app.mjs:3403-3404`），`disposeSurfaceRenderer()` 只在换会话/换绑定时调用（`app.mjs:1290-1298,1300,1405,1476,1999`），不在类型切换时调用。**但没有"每 tab 滚动位置"的保存点**：现有滚动保存只有两处——会话消息流的 `scrollTop`（`app.mjs:417-434,2419,2944-2954`）与折叠态卡片 rail 自身的 `scrollTop`（`app.mjs:3527,3553`）——都不是"某个打开的文档在其 tab 内的阅读位置"。局部草稿的保存点存在于 composer（`persistCurrentDraft`，`app.mjs:1398` 附近调用点）与 Edit-as-new-message（`docs/interface-components.md:45`），但没有"文档 tab 内的草稿"这个对象，因为今天还没有"文档 tab 可编辑"的概念。 | 折叠/展开不重挂：已具备。每 tab 独立滚动位置：**不存在**，需要新状态（每个 tab key 对应一个 scrollTop，类似 `readingState` 那样的 Map）。 |
| "关闭活跃tab选择邻近tab；全部关闭回紧凑目录；返回Chat恢复之前focus。键盘支持tablist方向键与明确的关闭动作"（`shell-refinement.md:107`） | 方向键已实现：`ArrowLeft/ArrowRight/Home/End` 循环并自动激活（`app.mjs:5522-5539`），是标准 WAI-ARIA tablist 手动/自动激活模式的一种（见 §4）。`restoreLayerFocus()` 已经在关闭/收起工作面时把焦点还给 `state.surface.returnFocus`（`app.mjs:3272`，对应 `interface-components.md` 的"two-step Escape order"）——这部分焦点归还机制可复用。**没有"关闭"这个语义**：四个类型 tab 不可关闭（它们是常驻类型，不是文档实例），也没有"关闭后选邻近 tab"的代码，因为从未存在过可关闭的实例集合。 | 键盘 tablist 骨架可直接复用；焦点归还机制可复用；"关闭"和"选邻近"是全新语义，今天没有对应实现可抄，需要新写（不是缺陷，是因为当前没有多实例 tab 这个对象）。 |
| "Shell拥有标签、尺寸、focus和实例生命周期；renderer只占宿主分配区域。多实例必须先核对现有BE-2及renderer契约，第一段可以只有一个受信活动文档，不为视觉效果谎称多实例完成"（`shell-refinement.md:109`） | `surface-modules.mjs:1-18` 的注释原文就是这条边界的现有版本："What a module must never own (WK-41): the column layout, the band, the module order, the selected kind, the tab strip, ... Those stay with the host in app.mjs"。多实例能力：`backend-requests.md:6` 的 BE-2 明确写着当前是"单值 kind/runId/fileRef"，多文档 tab 状态是**待后端补的请求**，不是前端能自行决定的范围。当前 `state.surface` 的每个字段（`runId`、`fileRef`、`context`）确实每类只能持有一个值（`app.mjs:139-165`，`activateSurface`/`openFile`/`openRun` 均为覆盖式赋值，`app.mjs:3581-3603`）。 | 与草案原文自己的判断一致：第一段做多实例，前端没有后端状态可依附（BE-2 未交付），只能在前端本地维护一个"最近打开列表"式的伪多实例（例如客户端记住最近几个 fileRef 并各自补一份本地 scrollTop），这与"受信活动文档"只有一个的现状不冲突，但需要明确写清楚：本地维护的"tab 列表"不是服务端持久状态，刷新页面会丢。 |

## 4. 成熟范式参照（通行做法，非本产品事实）

- WAI-ARIA Tabs Pattern 通行做法：tablist 容器用 `role="tablist"`，每个 tab 用 `role="tab"` + `aria-selected` + 受管理的 `tabindex`（选中的 tab 为 0，其余为 -1），方向键在 tab 之间移动焦点（水平方向用 Left/Right，纵向用 Up/Down），Home/End 跳首尾；"自动激活"（焦点移动即切换面板）与"手动激活"（焦点移动后需 Enter/Space 才切换）是两种被同时接受的模式，二选一即可，不要求同时支持两种。——通行做法，非本产品事实；本产品现有实现属于"自动激活"一支（`app.mjs:5522-5539` 方向键直接 `.click()`）。
- 浏览器/IDE 类 tab strip 的通行做法：关闭按钮的命中区通常独立于 tab 本身的选中命中区（一个 tab 内部有两个可分别点击的区域：选中该 tab 的大区域，与右上角/右侧一个小的关闭命中区），避免"想切换却点到关闭"或"想关闭却点到切换"。——通行做法，非本产品事实。
- 标签截断的通行做法：视觉上截断（省略号）显示的标题，仍通过 `title` 属性或等价的可访问名称保留完整对象名，不因为视觉空间不够就丢失可访问名里的完整信息。——通行做法，非本产品事实。

## 5. 待裁定清单（交 Fable）

1. **是否推翻 `docs/interface-components.md:5` "work surface is not a third column" 的现有定性，改为真正的三栏 grid？** 推翻：能满足"三面同时可见独立滚动"的字面要求，但要重写 `.app-shell` 的 grid 结构、重新量测所有依赖两栏假设的几何断言（WORK-1…4、HOME-1…7 均以两栏结构写成）；不推翻：保留现状的 overlay/collapse 语义，只在覆盖层里加 tab strip，改动小但不满足"贯通"的字面意思，需要用户对"贯通"的字面执着程度做一次确认。
2. **1440 下的宽度策略选哪一种（方案 A / B / C，见 §2）？** 选 B（主次视图切换）：改动小、不新增断点，但今天的聊天与文档不能同时可见；选 A（导航收图标）：能保留"聊天+文档同屏"，但要新设计一套导航折叠为图标列的可访问性方案，且导航项目名/会话名如何读的问题没有现成答案；选 C（提高三栏并排的最低视口）：不动 1440 下的现状，但等于承认"贯通"在当前主力桌宽度下不成立，只在更宽屏幕生效。
3. **tab key 是否需要新增 `scope`（Matter/Project）字段，还是复用会话本身的 `sessionId` 推出 scope？** 新增独立字段：能让 tab 在标题上直接显示"属于哪个 Matter"，但要求"scope 位从会话标题 meta 行搬到工作面"（`claude/fe03-chat-work:delivery-fe03.md §11②`），是一次跨表面的位置改动；复用 `sessionId` 推导：不用挪现有 UI，但 tab strip 本身看不出 scope，要点开才知道。
4. **文档 tab 的多实例，第一段是否只做"前端本地记忆的伪多实例"（无后端持久化），还是等 BE-2 交付后再做？** 先做本地伪多实例：能更快给出可用的 tab 体验，但刷新页面丢状态，且未来 BE-2 交付后要迁移一次数据形状；等 BE-2：形状更稳，但要素排期会卡在后端交付节奏上，CC-W 本身可能因此被推迟。
5. **每 tab 的独立滚动位置这项新状态，要不要现在就做，还是先只做"tab 之间共享同一份阅读位置"？** 现在做独立滚动：更贴近草案原文要求，但要新增一个 Map 结构并接入现有渲染流程（今天没有这个对象，风险不是"改坏"而是"从零设计"）；先共享：实现量小，但用户体验上"切回一个 tab 发现滚动位置变了"，不完全满足草案第 3 条。
6. **`#surface-tabs` 现有的四个"类型 tab"（run/file/workspace/runtime）在引入多实例文档 tab 后要不要保留为固定档位，还是整体并入同一条可关闭的 tab strip？** 保留固定档位 + 新增可关闭文档 tab（两种 tab 并存）：改动面小，但 UI 上出现两类外观相似、行为不同的 tab，需要视觉上区分；全部统一成同一种可关闭 tab：概念更干净，但 `workspace`/`runtime` 这两类今天不对应"一个可关闭的文档对象"（它们是导航入口，`workspace` 打开的是文件树而非单一文件，`runtime` 直接跳转 Settings），统一之后语义会变得含糊。

## 6. 不做（自我核对）

本卷未提出新色彩、新字体或新依赖；未把生成图（`home-modular.png`/`work-tabs.png` 等，`1487×1058`，`shell-refinement.md:52`）上的像素距离当作几何验收依据；§1–3 的每条数字或结论都标了 file:line 或明确写"推算"/"未核实"；未宣称 BE-2、BE-19、BE-20、BE-21、BE-23 等任何未交付的后端能力已经存在（均按 `backend-requests.md` 与 intake-round-3 现状原样引用为"待补"）。
