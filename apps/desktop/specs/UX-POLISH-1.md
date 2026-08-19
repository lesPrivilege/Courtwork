# UX-POLISH-1 · Work 单焦点状态编排与成熟 GUI 收口

状态：架构冻结，待独立实现会话；实现与验收必须为不同会话。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/README.md`、`docs/design/principles.md`、
`docs/design/tokens.json`、ADR-022、`apps/desktop/SPEC.md`、本票。能力状态只认
`docs/status/current.md`。

## 一、目标与边界

本票是 `WORK-AGENT-SHOWCASE-1` 之后的窄 UX polish：把现有 Pi Work 的事实投影收敛成一条
可持续阅读、可即时决定、可回看核验的工作线。目标是成熟 GUI 的信息层级与反馈节奏，不是新增
agent 能力、重做视觉系统或改变任何运行语义。

唯一产品槽：`apps/desktop` 的既有 Pi Work 面。matter、授权文件夹、工具提案、journal 投影、
工作稿索引和只读 viewer 继续是现有真源；本票只改变它们的呈现顺序、密度、折叠和焦点反馈。

不得把 scripted/faux 截图写成 product-live；`PI-BASE-GUI-ACCEPT` 仍独立负责真实 DeepSeek、
真实 WKWebView、Stop race、AX/读屏/焦点外部证据。本票完成不取得 Agent 称谓，不更新 Pages、
README、官网、公开 release 文案或 `docs/status/current.md`。

## 二、审计基线与问题假设

实现前必须基于当前 HEAD `f5cab2f` 复核以下基线，并将实际观察写入回执：

1. `PiLanePanel` 已有 matter header、status/details、thread、tool card、draft seat、composer，
   但主阅读层仍容易让 session/cost、工具细节、结果席竞争注意力。
2. running → proposal → decision → terminal → draft/viewer 的事实状态已存在，缺口在于每一态的
   当前主动作、终态反馈和下一步落点没有稳定的视觉节拍；不能用额外状态解决。
3. 空态、unavailable、failed、uncertain、stopped/resumed 与 hash-diff 已有显式语义；本票应让
   下一步和核验入口更近、更易辨，不得合并这些语义。
4. 当前 light 以冷白 `#FBFCFE` 为底、藏青为结构/文字/主操作；不得回退到暖灰、米白、重底或新色族。
5. 既有 acceptance 帧是基线而非本票证据：`release/evidence/work-agent-showcase-1/acceptance-2026-08-19/`。

## 三、冻结的实现范围

### 3.1 信息层级与状态编排

- 保留现有 `PiWorkHead` 作为 matter context；把 binding、当前运行态和主动作形成一组稳定的
  阅读顺序。不得把 session id、cost、bytes、hash 提升为首屏主标题。
- 保留 `PiStatusBar` 与 `details` 机制；运行详情默认折叠，但 session id、预算/成本未知态、
  resume、restart 等既有可达性必须保持。
- `PiToolCard` 继续显示真实工具名和真实状态；proposal 先呈现人类动作与目标路径，技术事实
  进入可展开详情。不同状态必须保持不同文案/色彩/按钮语义：running、proposal、approved、
  denied、failed、uncertain、succeeded 不得压成一个 generic card。
- 结果席只消费现有 `view.drafts` 与 viewer 回调；当前稿、上一段稿、hash differs、未验证和
  viewer failure 的入口保持可达。不得新建 output store、结果缓存或“成功”派生字段。
- 同一时刻只允许一个主动作：输入时 composer；proposal 时 allow/deny 决定区；运行中 Stop；
  终态时打开/核验工作稿或另起一段工作。焦点与 tab 顺序必须跟随该约束。

### 3.2 密度、空态、错误态与响应式

- 在 1180×720、1440×900、1600×900 下收紧纵向节奏和留白，使 matter context、工作流正文、
  结果席三段关系清楚；空态可留白，但说明与主动作须形成重心。
- 多工具卡、多工作稿、长中文 matter 名、CJK/Latin 混排不得挤掉 Stop/决定按钮或造成横向溢出。
- unavailable 必须把模型设置恢复动作作为主路径；未绑定必须把既有绑定 callback 作为主路径；
  普通 idle 不显示错误恢复动作。failed、uncertain、stopped/resumed 的下一步必须各自诚实。
- 不改变 scroll ownership、viewer in-panel 语义、body scroll、portal、编辑/保存/晋升边界。

### 3.3 动效、焦点与主题

- 高频提交、Stop、allow/deny、tab/segment、tool state、内容进入不等待动画；仅允许既有 motion
  token 和 `transform`/`opacity`/`background-color`/`border-color`。任何过渡必须可被中断，
  反向动作回到正确基线。
- `prefers-reduced-motion: reduce` 下不依赖动画表达状态、不丢 focus、不改变滚动归属；
  `:focus-visible`、Tab/Shift+Tab、Enter、Escape、viewer close 和 proposal 决定均须保持可达。
- light 继续冷白与藏青宗；dark 只做 smoke/对比/溢出回归，不改 dark token，不添加组件级主题
  分支、渐变、玻璃、阴影、辉光、3D、磁吸或装饰性法务符号。

## 四、允许修改与禁止范围

允许修改：

- `apps/desktop/src/pi/PiLanePanel.tsx`、`PiToolCard.tsx`、`PiDraftViewer.tsx`、`pi-copy.ts`；
- `apps/desktop/src/styles.css` 现有 Pi/Work surface 规则；
- `apps/desktop/src/App.tsx` 仅限既有 Pi props/回调的呈现接线，不新增状态机；
- 对应 desktop 单测/e2e、截图 manifest、`apps/desktop/SPEC.md` 本票回执；必要时只更新现行
  design token 的消费映射，不新建 token 族。

禁止修改：

- Pi wire、journal、projection 语义、runtime/sidecar、Rust/Tauri command、WorkspaceFsHost、
  workspace 物理格式、provider/DeepSeek、Package ABI、垂类 schema、Scenes executor；
- 新增 edit/delete/rename/bash/plan/queue/branch/subagent/skills/MCP/git/package manager、
  新 store/port/command/persistence format 或第二真源；
- 重新施工 `WORK-AGENT-SHOWCASE-1` 已清账的冷白主宗、matter 入口、基础状态矩阵和既有功能；
- Pages、官网、README、公开 release 文案、`docs/status/current.md`，以及把本票写成 product-live。

复杂度义务：实现会话必须在本票回执记录触碰范围内新增的概念；默认结论应为“无新产品概念，
只有既有事实的呈现投影”，任何新抽象须先标 `[需架构拍板]`。

## 五、TDD / born-red / 功能不回退门

实现会话先让以下断言在基线变红，并保存红证；不得只凭截图证明：

1. 单焦点：proposal 出现时决定区成为唯一主动作，running 只有 Stop，终态可达的工作稿/另起一段
   成为下一步；恢复任一竞争主按钮或错误 tab 顺序必须红。
2. 信息折叠：session id、cost、bytes、hash 默认不占主阅读层，展开运行详情/工具详情后仍逐值可达；
   删除详情或把未知费用折成 0 必须红。
3. 语义分流：approved、denied、failed、uncertain、stopped/resumed、viewer hash-diff 各自保留
   现有 testid/文案契约和可操作入口；任一状态被 generic 成功/失败替代必须红。
4. 既有动作：未绑定→既有 `onBindFolder`，unavailable→既有 `onOpenModelSettings`，proposal→
   既有 allow/deny，running→既有 Stop，draft/viewer→既有回调；删回调或新增旁路必须红。
5. 响应式/无障碍：1180/1440/1600 与窄宽不得溢出；Tab/Shift+Tab/Enter/Escape、focus-visible、
   reduced-motion 断言必须通过；滚动归属和 viewer 关闭后的焦点回归必须保持。
6. 主题/减法：暖灰/米白/组件 raw color、dark 几何分支、gradient/box-shadow/新 Motion 依赖、
   `Scheduled`/`Dispatch`/pinned 占位回归任一必须被静态门触红。

## 六、视觉证据矩阵

作品帧必须由独立端口 scripted matrix 生成，并在 manifest 标注 `scripted`、HEAD、viewport、
状态、fixture、主题、reduced-motion。最低矩阵：

| 维度 | 必须覆盖 |
|---|---|
| 状态 | empty-unbound、empty-bound、unavailable、composed、running、proposal、approved+succeeded、denied、failed、uncertain、stopped、resumed、current draft、prior draft、viewer、hash-diff |
| 压力 | 多工具卡、多工作稿、长中文 matter、CJK/Latin 混排、长路径/长技术详情 |
| 视口 | 1180×720、1440×900、1600×900；另取 390×844 窄宽 smoke |
| 主题 | light 全矩阵；dark 至少 empty/running/proposal/succeeded/viewer smoke，不改 dark token |
| 证据形态 | normal、text-mask、10% squint；键盘 focus-visible、reduced-motion、滚动归属定向帧 |

验收不采信实现自述；须 clean worktree、独立端口、fresh server，并至少对一枚状态做真实注入反例
观察变红后复原。任何生成到其他票目录的 PNG 必须逐文件恢复，不能污染用户已有 release/evidence。

## 七、退出门

实现最低门：`pnpm -r build`、`pnpm lint`、root/desktop 全测、`pnpm site:guard`、cargo test、
独立端口完整 Playwright、`git diff --check`；报告写实际数字，不写预期数字。实现只更新本票回执，
等待不同会话的 Luna clean-worktree 验收。验收报告写入 `apps/desktop/ACCEPTANCE.md`；架构主会话
只有在 PASS、目标 SHA 为 `main` 祖先、SPEC/ACCEPTANCE 有留痕后才清账。

## 八、OSS / 参考消费结论

本票不引入依赖。beUI motion 只借单件 reduced-motion/可中断处理范式，不消费 Motion/Tailwind 或
整包组件；Lody/OpenWork/DeepSeek Harness/Pi 只借“一条工作线、即时状态、上下文决定、结果可回看”
的成熟行为，不借品牌、布局源码、runtime 或 coding-agent 专属能力。参考页不是真源，不产生隐含契约。
