# GUI-PAPER-THEMES-1 · 冷白藏青墨／铅黑冷灰双宗

状态：**实现完成，等待独立验收；本会话未做独立验收。**

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/principles.md`、
`docs/design/tokens.json`、`GUI-LEAD-WHITE-1`、`SKIN-DYSTOPIA-1`、本票。
成熟度仍只认 `docs/status/current.md`；本票不替代 `PI-BASE-GUI-ACCEPT`，不赋予 Agent、
product-live 或外部验证口径。

## 一、产品裁定

用户要求两宗工作面均退出 Demo 感：浅宗为冷白底纸与低饱和藏青墨，深宗为铅黑底纸与冷灰阶；
砖红 Work diff 另由 `WORK-DIFF-SEMANTICS-1` 管辖，不夹入主题票。

成熟度不由第三方 skin、卡片、阴影或动效提供，而由同一信息架构在两宗下保持可读、可核、可中断，
并以 exact token、AA、状态矩阵、mutation 和 clean-worktree 独立验收证明。外部 UI Skills 只消费
Contract／Runtime／Correction、source trace、viewport matrix 与 squint 方法；不安装、不改 lockfile、
不形成第二套设计系统。

批准行 `GPT-C01`：

> 浅宗保留现行冷白／铅灰三面，只把正文与主操作的近黑铅墨迁为低饱和藏青墨；深宗把现行磁青
> 三面整体迁为铅黑／冷灰阶。链接、focus、Legal revision 与 verified 的语义蓝保持原角色；普通
> selected、hover、border、rail 与 chrome 不得借蓝。两宗同组件、同 DOM、同布局，只在 token 层换值。

本票以用户最新直接定向覆盖 `principles.md` 现行“深＝磁青宗”、`SKIN-DYSTOPIA-1` Q5“不排产”与
`GUI-LEAD-WHITE-1` 的浅宗 primary ink 局部值；不回写历史验收事实。

## 二、冻结值

### 2.1 浅宗 · 冷白藏青墨

现行 `bg.app/surface/raised = #FAFBFB/#F3F4F5/#FFFFFF`、hover／selected／border 铅灰阶保持；
下列文字墨替换：

| token | 旧值 | 新值 | 三面 WCAG（app / surface / raised） |
|---|---:|---:|---:|
| `color.text.primary` | `#272C31` | `#24303C` | 12.960 / 12.200 / 13.435 |
| `color.text.secondary` | `#586168` | `#53616E` | 6.133 / 5.774 / 6.358 |
| `color.text.tertiary` | `#667078` | `#626E78` | 5.038 / 4.743 / 5.223 |

`action.primaryBg`、浅宗 important-title、品牌墨色与 elevation 墨色按既有同源关系跟随
`text.primary`；`text.inverse` 继续跟随 `bg.app`。`action.primaryHoverBg` 冻结为 `#344353`，与
inverse `#FAFBFB` 对比 9.768:1；不得用 semantic blue 代替。

### 2.2 深宗 · 铅黑冷灰

| token | 新值 | 角色 |
|---|---:|---|
| `themes.dark.bg.app` | `#121416` | L0 铅黑底纸 |
| `themes.dark.bg.surface` | `#1C2024` | L1 rail／次级面 |
| `themes.dark.bg.raised` | `#272C31` | L2 composer／唯一 raised 面 |
| `themes.dark.bg.hover` | `#2B3035` | 行 hover |
| `themes.dark.bg.controlHover` | `#30363C` | 控件 hover |
| `themes.dark.bg.selected` | `#313941` | 中性选中，不借蓝 |
| `themes.dark.text.primary` | `#E8ECEF` | 正文／标题 |
| `themes.dark.text.secondary` | `#BCC5CB` | 次级说明 |
| `themes.dark.text.tertiary` | `#98A2AA` | 元信息 |
| `themes.dark.text.disabled` | `#626C73` | 非正文禁用轨 |
| `themes.dark.text.inverse` | `#121416` | 浅按钮上的反相墨 |
| `themes.dark.border.hairline` | `#343B41` | 次界 |
| `themes.dark.border.strong` | `#465058` | 强界／输入边 |

深宗 primary／secondary／tertiary 对 app/surface/raised 分别为
15.541/13.793/11.856、10.539/9.354/8.040、7.107/6.308/5.422；tertiary 对 selected 仍为
4.511。disabled 不承正文信息，不冒充 AA 文字轨。`border.focus` 与语义 blue 保留现行值；全部 semantic
fg 必须以新 raised 为最严面重新计算，未通过不得以旧验收数字放行。

## 三、允许范围与禁区

允许：`tokens.json`、`principles.md`、生成的 `courtwork-design.md`；desktop/site/品牌 SVG/OG/graph 的
既有 token 真源与消费同步；现有主题契约门、AA E2E、截图脚本、本票回执与 readiness。

禁止：组件树、DOM、布局、字阶、copy、状态/store/port/command、runtime/schema/ABI/provider、
新依赖、新颜色语义槽、Work diff、第二 elevation、Pages 内容／版式、历史 SPEC/ACCEPTANCE、
`docs/status/current.md`。不得把真正无色相灰写入原则；本表均为冷偏低饱和阶。

## 四、实现与验收

1. TDD 先把 exact token／同源合同改为本表，在旧实现上实际红；门与修不得同一提交。
2. 更新 `principles.md` 的双主题与 §12 现行描述；`courtwork-design.md` 只由生成器产生，禁止手改。
3. mutation 至少覆盖：深宗 selected 复活旧蓝；浅宗 primary 退回旧铅墨；任一 dark surface 退回磁青；
   semantic blue 被挪作普通 chrome；宗切换引入几何分支。逐项实红并复原。
4. light/dark 各自 1180／1440／390 × empty／running／proposal／succeeded fresh 矩阵，另做 240px
   squint、零横溢与同 viewport DOM bounding-box 同构对照。截图只证明 scripted projection。
5. 完整 `pnpm site:guard`、root test/lint、`pnpm -r build`、desktop `test:e2e` 与 test-count floor 全跑；
   独立验收者在 clean worktree、独立端口重跑，不采信实现截图。

直接依赖：**无**。开源 Agent GUI 只借稳定 task/ledger/result-seat 信息架构，本票不复制 OpenHands、
Cline 或 bolt.diy 的 skin、runtime、VS Code chrome、WebContainer 或 coding-agent 语义。

## 五、实现回执（实现会话）

本会话按冻结值完成 token 真源与既有消费面同步；未改组件树、DOM、布局、字阶、copy、状态／store／
port／command、runtime／schema／ABI／provider、Work diff、第二 elevation、`docs/status/current.md`、
历史验收或共享 dirty evidence。新增的摄制器只用于本票新 evidence，不进入产品运行时。

### 1. 变更面

- `docs/design/tokens.json`、`docs/design/principles.md` 与生成的 `docs/design/courtwork-design.md`：
  冷白藏青墨浅宗、铅黑冷灰深宗、既有同源 neutral followers 与 dark semantic AA 描述同步。
- `apps/desktop/src/styles.css`、`src/icons/icon-audit.css`、`src/workbench/graph-theme.ts`、
  `site/styles.css`、`site/og.html`、品牌 SVG／OG 生成物：只同步既有 token consumer；focus 与 semantic
  blue 角色保持原值。
- `site/scripts/versional-language-contract-lib.mjs` 与其测试：新增 exact light/dark、普通 chrome
  semantic-blue 反例及旧值漂移反例；补回 `VL3-C01|dark-tertiary` 的既有 ledger selector 锚点。
- `apps/desktop/scripts/assert-elevation-shadow.mjs`、`site/scripts/deslop-scan-lib.mjs` 与测试、
  `apps/desktop/tests/e2e/versional-language.spec.ts`：同步既有门与测试取值，不扩契约面。
- `apps/desktop/scripts/capture-gui-paper-themes-1.mjs`：本票专用 scripted projection 摄制器。

### 2. TDD 与 mutation

旧实现上的 exact contract born-red 已实际实跑：**23 pass / 1 fail**，失败为本表浅宗 primary／
secondary／tertiary、深宗 13 槽及 Pages／Agent 同源值漂移；实现后同一 contract **24/24**。
实现后的 `deslop-scan` **52/52** 含宗切换几何分支反例。

以下五类反例均实际注入、观察红灯并复原：

| 反例 | 红证 | 复原后 |
|---|---|---|
| 浅宗 primary 退回旧铅墨 | versional contract 定点失败 | 通过 |
| 深宗 surface 退回旧磁青 | versional contract 定点失败 | 通过 |
| 深宗 selected 复活旧蓝 | versional contract 定点失败 | 通过 |
| semantic blue 挪作普通 chrome | versional contract 定点失败 | 通过 |
| 宗切换引入组件／布局几何分支 | deslop `SKIN-R2-P4` 结构反例失败 | 通过 |

### 3. AA、视觉与门禁

主题 AA 定向 Playwright 在独立端口 `19873`、fresh server、single worker 实跑 **9/9**。三面实测
最严 raised 值为：浅宗 primary/secondary/tertiary **13.4353/6.3582/5.2227**；深宗
primary/secondary/tertiary **11.8558/8.0403/5.4220**。深宗 semantic fg 以新 raised 重算：
朱 **5.2786**、red **5.3288**、amber **6.8504**、blue **5.3452**、green **5.3250**、slate
**6.7276**，均达既有目标；focus／semantic blue 未改。

新 evidence 目录为
`release/evidence/gui-paper-themes-1-2026-08-23/`：主矩阵 **24 帧**（light/dark ×
1180/1440/390 × empty/running/proposal/succeeded）＋两宗各一枚 **240px squint**，共 **26 帧**，
另有 `matrix.json`。机器报告为 `horizontalOverflowFree=true`、
`allBoundingBoxesIsomorphic=true`（13 个同 viewport/state 对照）；目检抽查 light/dark 1440 proposal、
390 succeeded 与 240 squint，未见新增装饰或结构分支。

已实跑并通过：定向 versional contract **24/24**、deslop **52/52**、`lint:neutral`、
`lint:design-md`、`lint:elevation`、`lint:graph`、`lint:signature`、`lint:hierarchy`、
`lint:icons`、`lint:rule-grammar`、`lint:typography`、`lint:skin-r2-ledger`；根
`pnpm site:guard` **116 项测试全绿**、`pnpm lint`、`pnpm test` **183 files / 2251 tests**、
`pnpm -r build` 全包通过。

### 4. 复杂度与交接

本票新增概念只有一个本票专用摄制脚本／evidence manifest：若不将状态矩阵、横溢与双宗同构记录成
机器可核的产物，视觉主张无法复现；脚本不进入运行时、不新增依赖、不造第二设计系统。触碰范围内
未发现可安全删除且属于本票的偶然复杂度，未越权清理。

完整 desktop `test:e2e`、independent clean-worktree mutation 与验收回执留给不同会话；本实现会话
**未做独立验收，不宣称 PASS 或清账**。

### 5. R1 · gallery 深宗正文色消费点同步（2026-08-23）

在实现提交 `202484f` 上保留旧期望实跑红证：`visual-gallery.spec.ts` 定向谱为 **1 passed / 1
failed**；唯一失败在 `visual-gallery.spec.ts:34`，旧断言期望 `rgb(228, 233, 241)`，实际冻结
`text-primary #E8ECEF` 渲染为 `rgb(232, 236, 239)`，标题泥金值不变。

R1 仅将该既有 gallery E2E 消费点同步为 `rgb(232, 236, 239)`，未改产品、门、token 或其他
主题值。修改后 gallery＋主题定向谱（visual-gallery、typography、versional-language）在独立端口
`19954`、fresh server、single worker 实跑 **11/11**。提交 `a4a44b1` 后新 clean clone
`/private/tmp/courtwork-paper-themes-r1-e2e-P8yUm8/repo` 在端口 `19955`、`reuseExistingServer=false`、
single worker 完整实跑 desktop **407/407**（`7.9m`），故本 R1 将该消费点的全链结果从 **406/407**
校正为 **407/407**。
