# SKIN-B3 · 线级批前后对照

皮层迁移第三批：均一 1px 单线换为两档线级语法——主界＝**文武线**（粗细双线错落），次界＝**乌丝细线**。
**只动线不动版**——版式、组件结构、UX 行为、色值表零触碰。

## 采集条件

同一采集脚本、同一视口 1440×900、同一 demo 案、`VITE_COURTWORK_E2E=1`、`reducedMotion: reduce` + `animations: disabled`。
`before/` 取自 main `74b82b1`（旧皮层），`after/` 取自 `impl/skin-b3`（新皮层）。

| 帧 | 内容 |
|---|---|
| `01-workbench.png` | 工作台首屏：`.panel-head`、`.preview-host-head`、`.scene-strip`、`.rail-user-wrap` 四条主界同帧 |
| `02-settings.png` | 设置层：`.settings-header` 主界，与退次界的 `.settings-nav`（判据 c）同帧对照 |

## 客观差异一 · 逐行像素扫描（第三轮·新基线重证）

设置页头下缘取 400px 宽窄带，逐行采平均亮度（`02-settings.png`，x=500）。
**不预设 y 坐标**——扫描器在区间内自动定位暗带，避免沿用旧坐标而量错地方。

| y | before（B2 字体已上身，线级未上） | after（B2 字体 + B3 线级） |
|---|---|---|
| 78–83 | 244（页头底色） | 244 |
| 84 | 244 | **204** ← 细线（乌丝，1px） |
| 85–86 | 244 | 244 ← 错落间距（gap，2px） |
| 87 | 244 | **204** ← 粗线（文武，2px） |
| 88 | **219** ← 单线 1px | **204** |
| 89+ | 255（白卡） | 255 |

before 是一条 1px 暗行；after 是「暗 1 行 — 亮 2 行 — 暗 2 行」，即 `--rule-minor 1px` + `--rule-gap 2px`
+ `--rule-major 2px` 的光栅形态。**与首轮所得逐位一致**——线级形态不因字体换轨而变（字体不移动边框），
但这一条必须**摄出来**而不是推出来，故第三轮照样实扫。线色由 219 加深到 204 亦复现。

## 客观差异二 · 线级普查（computed style）

| 消费点 | 档 | before | after |
|---|---|---|---|
| `.panel-head` bottom | 主界 | 1px | **2px ＋细线 1px @gap 2px** |
| `.preview-host-head` bottom | 主界 | 1px | **2px ＋细线 1px @gap 2px** |
| `.scene-strip` top | 主界 | 1px | **2px ＋细线 1px @gap 2px** |
| `.rail-user-wrap` top | 主界 | 1px | **2px ＋细线 1px @gap 2px** |
| `.settings-header` bottom | 主界 | 1px | **2px ＋细线 1px @gap 2px** |
| `.dense-row` bottom | 次界 | 1px | 1px（改按名消费，值不变） |
| `.settings-row` bottom | 次界 | 1px | 1px |
| `.settings-nav` right | 次界 | 1px | 1px（单线，判据 c 退档） |
| `.composer-shell` | 不换 | 1px | 1px（控件边，不入线级） |

## 客观差异三 · 版式零漂移（bounding rect）

「只动线」的机器可核证据——首屏七个版式锚，六个逐像素不动，唯一变动等于主界线自身长出的那 1px：

| 锚 | before `[x,y,w,h]` | Δ |
|---|---|---|
| `.workspace` | `[0,0,1440,900]` | `[0,0,0,0]` |
| `.case-rail` | `[8,8,248,884]` | `[0,0,0,0]` |
| `.conversation` | `[284,0,469,900]` | `[0,0,0,0]` |
| `.right-workbench` | `[781,8,651,884]` | `[0,0,0,0]` |
| `.composer-stack` | `[284,730,469,170]` | `[0,0,0,0]` |
| `.scene-strip` | `[284,689,469,41]` | `[0,-1,0,1]` ← 自身上界由 1px 长到 2px |
| `.conversation-scroll` | `[284,88,469,601]` | `[0,0,0,-1]` ← 同列吸收该 1px |

栏宽、卡位、composer 测宽全部不动，增量被本列就地吸收，未外溢到任何相邻区段。
细线走绝对定位（不入流）故不占高度——这正是不用 `margin-top` 画第二线的原因。

## 值面位移（2026-07-19 架构追认：**非越界，销号**；详见 `apps/desktop/SPEC.md` 同名节）

本批**零 hex 编辑、零 token 值改动**；但 8 条主界中有 7 条的渲染线色由 `--border` 位移到 `--rule-ink`（＝`--border-strong`），
因 `tokens.json` 的 `rule.ink` B0 定值即 `{themes.<theme>.border.strong}`。两色皆 B1 既有中性槽，中性色单源律门复跑通过。
退役值只述关系不复述色值：新线色即中性描边组的**较深一档**，旧值为**较浅一档**。

## 行为不变式

全量门在与失败复现一致的条件（app + residue 双 project、隔离端口 1493）下 **299/299**，
残留门 21 例全绿，31 道静态门全通过——行为零触碰由此证明，非自述。

门自身可红（九类反例，逐条实跑）：线宽 token 漂移 / 线重层级倒置 / 文武线掉细线 / 次界回退字面量 /
新增无主裸 1px / 线宽随宗改写 / 细线塞 gradient / 线重入 transition（动效门）/ 运行时主界降档与删细线（e2e 双红）。
复位后全部复绿。
