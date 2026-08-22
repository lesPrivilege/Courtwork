# GUI-LEAD-WHITE-1 · 冷白底纸与铅灰浅宗

状态：**实现完成，待不同会话独立验收；未清账**。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/design/principles.md`、
`docs/design/tokens.json`、`WORK-AGENT-SHOWCASE-1`、`WORK-SURFACE-COMPOSITION-1`、本票。
能力成熟度只认 `docs/status/current.md`；本票不改变 `PI-BASE-GUI-ACCEPT` 或 Agent/product-live 口径。

## 一、产品裁定与归因

2026-08-22 用户确认真实 DeepSeek 已跑通，同时要求本轮先修 GUI：现行浅宗的淡蓝 Demo 感过强，
改用冷白与铅灰。该输入只批准视觉置换，不替代独立的真实 Tauri／DeepSeek／AX 验收记录。

上一票把 Demo 感主要归因于构图，并冻结颜色；本票以新的直接产品反馈明确覆盖该局部判断。现行
`selected`、hover、边框、正文与底纸均由 H≈217° 的偏蓝中性阶派生，蓝感不是单个背景值造成，
因此只把 L0 改白不足以闭合问题。批准行 `GLW-C01`：

> 浅宗整体迁为低饱和铅灰阶：L0 冷白、L1 铅灰、L2 白纸，近黑铅墨承担正文与主操作；蓝只保留
> 链接、焦点、修订与已核验来源等既有语义，不再承担导航选中或普通 chrome 气质。

激进度仍为 Agent 通用界面中间档。禁止借本票加卡片、渐变、阴影消费点、装饰、动效或主题几何。

## 二、冻结的浅宗值

| token | 旧值 | 新值 | 角色 |
|---|---:|---:|---|
| `color.bg.app` | `#FBFCFE` | `#FAFBFB` | L0 冷白底纸 |
| `color.bg.surface` | `#F6F8FB` | `#F3F4F5` | rail／次级层的铅灰 |
| `color.bg.raised` | `#FFFFFF` | `#FFFFFF` | 文书／composer 白纸 |
| `color.bg.hover` | `#EEF2F7` | `#ECEEEF` | 行 hover |
| `color.bg.controlHover` | `#E7ECF3` | `#E5E8E9` | 控件 hover |
| `color.bg.selected` | `#E7EEF9` | `#DDE2E4` | 中性选中；不得再借 semantic blue |
| `color.text.primary` | `#232B38` | `#272C31` | 近黑铅墨 |
| `color.text.secondary` | `#55617A` | `#586168` | 次级铅灰 |
| `color.text.tertiary` | `#637083` | `#667078` | 元信息；三面均须过 AA 正文档 |
| `color.text.disabled` | `#8A94A8` | `#90989E` | 禁用态 |
| `color.border.hairline` | `#DFE5EE` | `#DCE0E2` | 细界线 |
| `color.border.strong` | `#C9D3E1` | `#C8CED1` | 输入／强边界 |
| `color.action.primaryHoverBg` | `#3A4658` | `#3B4247` | 铅墨主动作 hover |

`text.inverse`、`action.primaryFg`、`generatedBg` 跟随 `bg.app`；`action.primaryBg`、浅宗
`important-title`、品牌墨色与投影墨色跟随 `text.primary`。tier B／low／rejected／usage normal／
line neutral 跟随 `text.secondary`，其 neutral bg 跟随 `bg.surface`。kbd、gridline、elevation resolved
槽同步到同一浅宗，不留旧值暗门。

浅宗 tertiary 在 app/surface/raised 三面目标对比分别不低于 4.5:1；深宗全部数值、语义蓝绿红琥珀、
布局、copy、runtime、provider、journal、workspace 与 Tauri 均零改。

## 三、成熟范式与依赖结论

本票是既有 token 的数值和消费面同步，不存在缺失的交互 primitive。现有 Radix 依赖继续承担组件
行为；新增颜色库会引入第二个 palette 真源，且无法替代 Courtwork 的语义色预算、双宗 AA 与
raw-color／graph canvas 防漂移门。结论：**直接依赖：无；借行为范式：中性阶按层级分工；保留自研：
token 真源与机器门；删除当期动作：无。**

## 四、允许范围与禁止范围

允许：`docs/design/tokens.json`、`principles.md` 与编译产物；desktop／site／品牌 SVG／OG／graph 的
既有 token 消费值；相关静态门、合同测试、截图脚本与本票回执；readiness 登记。

禁止：组件树与布局、React 状态、文案、Dark 数值、语义色角色、Pages 内容／版式、runtime／schema／
ABI／provider、任何新依赖、`docs/status/current.md`。历史 SPEC/ACCEPTANCE 的旧值证据不回写。

## 五、TDD、视觉与验收

实现者先把浅宗 exact contract 改为本表，须在旧实现上实际红；最小置换后运行：design-md drift、
neutral、elevation、graph、RP-2.11、site versional/deslop、定向 Vitest、lint、`pnpm -r build` 与
`git diff --check`。至少保留一枚 mutation：把 `selected` 注回旧淡蓝值必须红。

实现侧须重摄 light 1440×900 的 empty/running/proposal/succeeded 与 390×844 proposal；核对冷白画布、
铅灰 rail、白纸 composer、近黑正文、无普通蓝选中、零横溢，并补一枚 dark 1440 smoke 证明深宗未动。

独立验收必须由不同会话在 clean worktree、fresh 端口复跑机器门与同视口矩阵，实际注入 palette
与消费面反例并复原；只可追加 `apps/desktop/ACCEPTANCE.md` 与本票验收留痕。独立 PASS 前本票不得
标记清账，本实现会话不得自验收。

## 六、实现回执（2026-08-22）

- 角色：本会话完成架构冻结与实现，不验收自身；`apps/desktop/ACCEPTANCE.md` 未追加 PASS。
- TDD 红证：先只改 exact contract，旧实现使 versional 主合同报 19 个浅宗漂移，
  `lint:rp211` 定点报旧 `controlHover`；把 `selected` 注回 `#E7EEF9` 的 mutation 用例实际命中
  `GLW-C01`。随后才改 token 与消费面。
- 实现：`tokens.json` 浅宗、semantic neutral、elevation/kbd/gridline 与生成设计册同步；Desktop CSS、
  G6 canvas、icon audit、Pages 同源别名、品牌 SVG 与 OG 只换既有值。Dark token、组件树、布局、copy、
  runtime/provider/schema/ABI 均零改；无新依赖、store、port、command 或状态机。
- 绿证：versional contract 20/20；`site:guard` 112/112＋全串门 PASS；`pnpm lint` EXIT 0；
  `pnpm -r build` 15/16 workspace PASS；`pnpm test` 在默认沙箱先因 127.0.0.1 `EPERM` 得
  182 files / 2241 passed / 10 environment failures，获回环权限后完整 **183 files / 2251 tests PASS**；
  独立端口 `19863` versional E2E 4/4，`19864` Pi Work E2E 13/13；`git diff --check` EXIT 0。
- 视觉证据：`release/evidence/gui-lead-white-1/implementation-2026-08-22/` 共 6 PNG＋manifest；
  light 1440 empty/running/proposal/succeeded、light 390 proposal、dark 1440 proposal smoke。实现侧目检：
  L0 冷白、rail/selected 铅灰、raised 白纸与近黑铅墨分层成立；普通选中无蓝，390 零横溢；Dark
  仍为原磁青。首次 dark 截图因测试页未写 `data-theme` 被识别为失真并重摄，最终 manifest 只登记
  修正帧；running/proposal hash 不同，确为两种状态。
- Pages 同源副产物：`og.html` 改值后字节绑定如期变红，固定渲染器重生成 `site/assets/og.png` 与
  manifest 后复绿；未改 Pages 内容、版式或成熟度文案。
- 提交：本会话未提交；独立验收应以未来明确 target SHA 为准。
