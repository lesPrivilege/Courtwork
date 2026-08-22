# GUI-PAPER-THEMES-1 · 冷白藏青墨／铅黑冷灰双宗

状态：**架构已冻结，依赖 GUI-HIERARCHY-1 独立放行；未开工。**

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
