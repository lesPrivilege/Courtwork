# WORK-AGENT-SHOWCASE-1 · 作品级 Work 纵切与冷白主宗

状态：契约已冻结，待独立 Claude／Motto 实现会话领取（2026-08-18 架构裁定）。实现者不得验收
本票；独立验收仍由新的 Luna clean clone 执行。

权威：`CLAUDE.md`；`docs/product/vision.md`；`docs/design/principles.md`；
`docs/design/tokens.json`；ADR-022；`WORK-AGENT-GUI-1`；本票。能力状态只认
`docs/status/current.md`。

## 一 · 产品裁定

当前阶段是面向外界的作品展示，不是成熟产品发布。**基本功能完整与 UI 观感／品味并重**：
功能纵切提供可信的状态和动作，视觉工艺使这条纵切值得展示；两者都不是另一个的后置润色。

目标接近成熟 Pi/Cowork 类 GUI 的工作心智，但不做像素复刻。Courtwork 的 matter 级差异只来自
既有真实语义：当前案件、授权文件夹、材料根、逐次写入授权、账本状态、工作稿及只读核验。
不得用法律图标、卷轴装饰、伪数据面板或新持久状态制造差异。

本票不等待 `PI-BASE-GUI-ACCEPT` 的外部凭据／AX 条件。现有 Prompt/Stop、运行与预算、工具提案、
允许／拒绝、结果／错误／恢复、工作稿索引与只读 viewer 已足以组成作品纵切；scripted 状态矩阵
只证明 UI，不取得 Agent/product-live 称谓。实现完成后，`PI-BASE-GUI-ACCEPT` 必须在新 tip 重跑。

## 二 · 已证问题与 born-red

实现前须先以现行 GUI 和测试留下下列失败证据，不得只做静态审美自述：

1. 新安装默认 `themeMode='system'`，深色系统首屏直接落磁青深底；作品默认并非用户裁定的冷白主宗。
2. 未绑定 matter 的 StartGate 只给禁用“开始一段工作”，虽 `App.authorizeCaseFolder` 已能给当前
   未绑定案件授权，Work 面没有直达动作，形成死端。
3. `session.status='unavailable'` 与普通 idle 共用 StartGate，缺少明确的模型连接／设置恢复动作。
4. Pi 顶部把 session id、回合、开销并列为首要信息；matter 身份和授权文件夹反而不在工作面主层。
5. `Scheduled`、`Dispatch`、Pinned 的筛选／更多以禁用占位常驻主 rail，展示的是路线图而非可用产品。
6. 空态大面积留白、工具调用与工作稿区各自平铺，运行→提案→决定→结果→查看没有清楚的单焦点层级。

至少为 1–5 各留一枚自动化 born-red；第 6 项以实现前同视口截图和 text-mask/squint 对照留证。

## 三 · 冻结的功能纵切

### 3.1 matter 上下文与入口

`PiLanePanelProps` 可新增且仅新增三枚 renderer 级输入：

- `matterTitle: string`：当前 matter 标题；
- `bindingLabel?: string`：已有授权文件夹的人类可读标签；
- `onBindFolder(): void`：调用 App 既有 `authorizeCaseFolder`，不得复制授权／入库逻辑。

如现行 credential 恢复入口无法从 Work 到达，可再新增一枚 `onOpenModelSettings(): void`，它只调用
App 既有凭据／模型设置入口；不得新增设置、provider 路由或自动重试语义。`App.tsx` 只做这四枚
投影接线，不新增 Work 状态。

- 未绑定：主动作是“绑定文件夹”，点击真调用 `authorizeCaseFolder`；不得保留不可点击的 Start
  作为视觉主角。授权完成后沿既有 selected case/grant identity 重挂 session。
- 已绑定、可用：主动作是“开始一段工作”；标题和文件夹标签构成轻量 matter context，不另造右栏。
- provider/credential 不可用：明确发生了什么和下一步，主动作打开既有模型设置；不得让 Start
  点击后才以失败代替恢复入口。
- 运行中、Stop、终态、restart、resume、viewer 行为只消费既有 session API；本票不改其语义。

### 3.2 一条完整的可展示工作线

同一 Work 面必须连续呈现：

`matter/文件夹 → 开始 → 输入任务 → 模型流态 → 工具调用 → 逐次允许或拒绝 → 结果 → 工作稿 → 只读查看`

要求：

1. composer 是进行工作时唯一主焦点；proposal 出现后，决定区临时成为唯一主焦点；终态后焦点回到
   工作稿或“另起一段工作”，不得同时出现三枚竞争主按钮。
2. `read/glob/grep/write` 保留真实工具名，但 proposal 先说人类动作与目标文件；bytes/hash、session id
   收进默认折叠的“运行详情”。折叠只是呈现，不改账本或投影。
3. Stop 在运行时可达；取消、拒绝、failed、uncertain 与 succeeded 保持现有不同语义。uncertain
   仍只能核验当前文件，不得因 viewer 可读而补写成功。
4. 工作稿区是本段结果席，不另造 Output 数据源；当前与上一段只读稿继续使用现有索引和
   `openWorkspaceMarkdown`。
5. viewer 仍是 in-panel 只读面；不改 portal、body-scroll ownership、编辑／保存／晋升语义。

### 3.3 展示期 chrome 减法

从生产 DOM 的主 rail 移除 `Scheduled`、`Dispatch`、`pinned-filter`、`pinned-more` 四枚未接线控件。
可以保留内部 copy 或未来实现代码线索，但它们不得以 disabled/coming-soon 形态占据作品主路径。
其他已接线导航、matter 列表与 Scenes 不重命名、不重排契约。

## 四 · 冷白主宗定值

浅宗仍是现有冷调中性阶，不新建色族；本票把底纸从偏重冷灰抬成冷白，并让藏青只承担 ink、结构
与主操作。实现必须在 `docs/design/tokens.json` 单一真源中一次性置换下表，同步生成物、CSS 映射、
对比度账与现有 token 守卫；组件不得出现这些 hex 字面量。

| token | 现值 | 冻结值 | 作用 |
|---|---:|---:|---|
| `color.bg.app` | `#F7F8FA` | `#FBFCFE` | 冷白 L0 画布 |
| `color.bg.surface` | `#F2F4F7` | `#F6F8FB` | 左右 rail 与结果席的轻冷层 |
| `color.bg.raised` | `#FFFFFF` | `#FFFFFF` | composer／viewer／必要浮面 |
| `color.bg.hover` | `#E6E8EC` | `#EEF2F7` | 行悬停 |
| `color.bg.controlHover` | `#DDE0E4` | `#E7ECF3` | 控件悬停 |
| `color.bg.selected` | `#D9E3F6` | `#E7EEF9` | 选中态，保留轻微蓝感 |
| `color.border.hairline` | `#D5DAE3` | `#DFE5EE` | 冷调细线 |
| `color.border.strong` | `#C3CAD6` | `#C9D3E1` | 输入与关键边界 |
| `color.text.inverse` | `#F7F8FA` | `#FBFCFE` | ink 主操作上的文字 |
| `color.semantic.provenance.generatedBg` | `#F7F8FA` | `#FBFCFE` | 与 L0 同源的生成内容底 |

`color.text.primary=#232B38` 及浅宗 secondary/tertiary 保持；实现必须重新计算它们在 app/surface/raised
三面上的 WCAG 对比并更新事实数字。dark token 数值不改，只做同构、对比和溢出烟测。

主题默认语义改为：**无已存偏好的新安装、旧 snapshot 缺 appearance、畸形 theme 值均回退
`light`**；已存 `light|dark|system` 原样尊重，用户显式 `system` 仍跟随 OS。存储 key、闭集和设置 UI
不变，不做迁移写回，也不覆盖现有偏好。

## 五 · 视觉与动效工艺

- 构图先于组件：1280–1600px 下先形成 matter context、工作流主焦点、结果席三段关系；不是把每段
  包成卡片。空态可以宽松，但动作与解释必须形成可读重心。
- 冷白承担气质，藏青承担文字／结构／主操作；语义红绿蓝仍只在真实状态出现。禁暖灰、米白、
  大面积藏青、渐变、玻璃、辉光、3D、磁吸与装饰性法务符号。
- 高频键盘提交、Stop、tab/segment、工具状态和内容变化 0ms；hover/press 只用现有 120ms token。
  只允许 `transform/opacity/background-color/border-color`，reduced-motion 保持现有门。
- [beUI Motion](https://beui.dev/components/motion) 只作组件源码与 reduced-motion 处理的参考。本票
  没有拖拽、手势、shared-layout 或物理弹簧需求，故不新增 Motion/Tailwind/shadcn/Base UI 依赖，
  不整包消费组件；确需借形时手写进现有 React/CSS 并遵守仓内 token、焦点和动效门。
- 成熟 Pi/Cowork/OpenWork/Lody 只提供心智参照：一条工作线、即时状态、决定在上下文中发生、结果
  可回看。不得复制其品牌资产、布局源码或把 coding-agent 的 diff/terminal/branch 控件带入。

## 六 · 精确改面与禁止扩张

允许修改：

- `apps/desktop/src/pi/PiLanePanel.tsx`、`PiToolCard.tsx`、`PiDraftViewer.tsx`、`pi-copy.ts`；
- `apps/desktop/src/App.tsx` 仅作既有 matter／授权／设置动作接线；
- `apps/desktop/src/rail/CaseRail.tsx` 与 `chrome/copy.ts` 仅作未接线 chrome 减法；
- `apps/desktop/src/settings/settings-store.ts` 仅改缺省／回退宗；
- `apps/desktop/src/styles.css`、`docs/design/tokens.json`、生成设计文档／账本和对应测试、截图证据；
- 可新增一个 Pi 纯呈现 helper；不得新增 store、port、command 或持久格式。

禁止修改 Pi wire/journal/runtime、Rust/Tauri command、workspace 物理格式、Package ABI、垂类 schema、
Scenes executor、`@assistant-ui` 机制或工具闭集；禁止新增 edit/delete/rename/bash/plan/subagent/skills/
MCP/git/package manager。`WORK-PLAN-PANEL-1`、`UI-TOAST-1` 与新的调度/并行能力均非本票前置，
不得夹带。不得更新 `docs/status/current.md` 或宣称 Agent/product-live。

## 七 · TDD、截图与实现退出证据

实现必须先留 born-red，再做最小修改：

1. theme 三类回退（无存储／旧 snapshot 缺 appearance／畸形值）先证 system，修后均为 light；显式
   system 在深色 OS 下仍解析 dark，已有 dark/light 不变。
2. 未绑定 Work 点击“绑定文件夹”真调用既有 callback；删 callback 或退回 disabled Start 必红。
3. unavailable 点击恢复动作真调用既有模型设置 callback；普通 idle 不显示该动作。
4. session id/hash/bytes 默认不在主阅读层，展开“运行详情”后仍可达；删详情内容必须红。
5. 四枚未接线 rail testid 在生产 DOM 零出现；恢复任一占位必须红。
6. proposal allow/deny、Stop、restart/resume、failed/uncertain、当前／历史 draft、viewer hash-diff 既有
   行为全部回归；不得以截图替代行为测试。
7. token 守卫逐值锁上表；注入暖灰、组件硬编码、dark 几何分支、Motion/Tailwind 依赖必须红。

作品帧必须来自独立端口 scripted matrix，并在标题或 manifest 明标 scripted；冷白默认至少交：

- 未绑定、已绑定待开始、unavailable；
- 空会话、运行中、proposal、approved+succeeded、denied、failed、uncertain、stopped/resumed；
- 当前工作稿、上一段工作稿与 viewer（含 hash differs）；
- 1180×720、1440×900、1600×900；长中文 matter 名、CJK/Latin 混排、多工具卡、多工作稿压力态；
- 同组 dark smoke，不改 dark token。

每个主视口交 normal、text-mask 与 10% 缩图 squint 三证；要求唯一主焦点仍可辨、空态重心不漂、
长标题不挤掉 Stop/决定动作、scroll ownership 不变。另做键盘 Tab/Enter/Escape、focus-visible、
reduced-motion 与 WCAG AA 定向验证。

实现最低门：`pnpm -r build`、`pnpm lint`、root/desktop 全测、`pnpm site:guard`、cargo、独立端口且
不复用共享 server 的完整 Playwright；显式登记测试数与 `git diff --check`。完成后只更新本票回执，
等待 Luna 在 clean clone 独立验收；验收报告写 `apps/desktop/ACCEPTANCE.md`。

## 八 · OSS 与复杂度结论

四选一：**当期不引入**。现有 React、assistant-ui headless primitives、CSS token 与 in-panel viewer
足够完成本票。beUI 可供抄读单件实现和可访问性处理，但其 Motion/Tailwind 技术栈与本票的交互
需求不匹配；Lody/OpenWork/Pi 只借成熟信息层级，不成为 runtime 或视觉真源。

本票不新增产品概念。新增的仅是既有事实的可见投影（matter context、绑定／模型恢复动作、运行详情
折叠）与展示期 chrome 减法。

---

## 实现回执（WORK-AGENT-SHOWCASE-1）

- 实现 SHA：`f3a854f94f813165d88ab77cf57a66555b13cd87`（writable clone
  `/Users/lesprivilege/Projects/Motto/courtwork-work`，基线 `f77e3af`）。
- born-red：`release/evidence/work-agent-showcase-1/born-red/README.md`；
  实现前截图同目录 `pre/`（1440×900 light，12 状态 normal/text-mask/squint 共 36 帧）。
- 测试数字（全量门）：
  - `pnpm -r build`：pass。
  - `pnpm lint`：pass。
  - root `pnpm test`：183 files / 2251 tests passed。
  - desktop `vitest run`：103 files / 906 tests passed。
  - `pnpm site:guard`：pass。
  - cargo test：259 passed / 0 failed / 1 ignored。
  - Playwright：391 passed / 0 failed（`reuseExistingServer:false`，独立端口 1420）。
  - `git diff --check`：pass。
- 截图 manifest：`release/evidence/work-agent-showcase-1/README.md`（scripted matrix；
  implementation 180 帧：light 1180×720 / 1440×900 / 1600×900，dark 1440×900，
  15 状态 × normal/text-mask/squint）。
- 偏离：
  1. 本执行环境对原始仓库 `/Users/lesprivilege/Projects/Courtwork` 只读
     （git update-ref/index.lock 与文件创建均 EPERM），故实现、全量门与提交均在
     writable clone 完成；原始仓库工作树可由文件编辑工具同步，但 ref 未能在原仓更新。
  2. 为保持现有 token 守卫与版本学契约门全绿，允许文件清单外同步了
     `site/styles.css`、`site/og.html`、`docs/design/icon-*.svg`、
     `apps/desktop/src/icons/icon-audit.css`、`apps/desktop/src/workbench/graph-theme.ts`、
     `apps/desktop/scripts/assert-rp211-contracts.mjs` 与 site 侧契约测试/lib 的浅宗值。
  3. 既有 e2e 断言按票面更新：`pi-lane.spec.ts` 未绑定主行动作、
     `rp1.spec.ts`/`rp27.spec.ts` 四枚 rail 控件零出现、
     `settings.spec.ts`/`versional-language.spec.ts`/`visual-gallery.spec.ts` 主题默认回退 light。
- 剩余阻断：`PI-BASE-GUI-ACCEPT` 未重跑（需新 tip 干净 clone 与真实 DeepSeek key/model）；
  真实 WKWebView/DeepSeek/Stop/AX 外部证据仍按 current.md 保持 external-validated blocked。
  本票不宣称 Agent/product-live，也未更新 `docs/status/current.md`。
