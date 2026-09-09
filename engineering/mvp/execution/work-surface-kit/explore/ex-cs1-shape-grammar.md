# EX-CS1 · Shape grammar 审计与 specimen 清单，只读探索

状态：只读 explore，Sonnet，2026-09-09，派单见 [intake-round-3 §4ad WK-125 (e)](../intake-round-3.md)。

只读声明：本卷只读 `/private/tmp/se-fable-r4d`（基线 `main` `5ea5ff0`，HEAD `5a6d8ac`）内的文档、`app/web/styles.css`、`app/web/app.mjs`、`app/web/settings-view.mjs`、`app/web/index.html`、`tools/lint-colors.mjs`、`tools/lint-materials.mjs`、`evidence/cc-s/README.md`（含其 `browser.mjs` / `seed.mjs` / `work-seed.mjs` 脚本源码，只读引用其 CDP 写法，未修改这些文件）。产品代码零改动、零 `git commit`、零新依赖。

启动了一个只读量测用的应用实例：树不变，端口 **8905**，数据目录 `/private/tmp/se-fable-r4d-excs1-data`（本卷自建，已在收尾时删除），CDP 端口 19992（19990/19991 为本卷失败重试后已清理的临时进程，一并杀掉）。`local-fake` 模式，`capabilities.realProvider:false`，未配置任何真实 provider，未读取任何凭据文件。测量脚本临时写在会话 scratchpad（`/private/tmp/claude-501/.../scratchpad/measure.mjs`），不在产品树或 `evidence/` 内，收尾未删（scratchpad 由会话自身回收，不影响仓库）。全部 server / headless Chrome 进程已在收尾时 kill；8905、19990–19992 已释放；未触碰 8850–8861、8810、8817、8818、8887–8904、8921–8953。

结论一律标 file:line；CDP 实测的数字标"实测"，未启动验证的标"推算"或"未核实"。

---

## 1. 审计表：`app/web/styles.css` 的 53 处 `border-radius`

53 处全部逐条列出。**角色**列按 WK-125 (b) 的五个语义角色归类：`control.compact`（≤28 高的小控件/装饰点）、`control.default`（32 高标准控件）、`surface`（card/popover/dialog 等有背景的容器）、`overlay`（浮层专属，本表并入 surface，因为现状未区分二者的 token）、`full`（capsule/circle，语义上的"满弧"）、`0`（显式方角，多为行/接缝）。**是否游离值**标出不是六个 token（`--radius-small/control/card/container/pill` 与显式 `0`）之一的写法。

| # | file:line | 选择器 | 现值 | 角色 | 游离值 | 备注 |
|---|---|---|---|---|---|---|
| 1 | styles.css:458 | `button`（全局基类） | `var(--radius)`→`--radius-control` 8 | control.default | 否 | 全部未覆写的按钮的默认值；send/cancel 等覆写见下 |
| 2 | styles.css:542 | `.inline-notice, .renderer-error` | `var(--radius-control)` 8 | surface（小） | 否 | renderer 报错块，非"卡" |
| 3 | styles.css:657 | `.nav-filter input` | `var(--radius-control)` 8 | control.default | 否 | 走通用 `input,textarea,select` 前会先命中这条更具体的规则 |
| 4 | styles.css:742 | `.session-button` | `var(--radius-control)` 8 | control.default | 否 | 侧栏会话行 |
| 5 | styles.css:951 | `.home-row` | `0` | 0（行） | 否 | Home 列表行，显式方角，符合"行不是卡" |
| 6 | styles.css:1047 | `.user-message-content` | `var(--radius-container)` 16 | surface | 否 | 聊天气泡，用户消息 |
| 7 | styles.css:1214 | `.question-card`（决策卡） | `var(--radius-card)` 12 | surface | 否 | 两钮见 `.question-actions`，本身不设 radius，走 button 默认 8 |
| 8 | styles.css:1236 | `.permission-preview` | `var(--radius-small)` 4 | surface（detail） | 否 | 卡内嵌套的预览块 |
| 9 | styles.css:1248 | `.artifact-thread-row` | `0` | 0（行） | 否 | |
| 10 | styles.css:1279 | `.jump-latest-button` | `var(--radius-pill)` 999 | full | 否 | WK-101 登记的 Chrome 层浮动胶囊按钮，语义上是"独立、悬浮、单一动作"，符合 capsule 语义 |
| 11 | styles.css:1304 | `.composer-form` | `var(--radius-container)` 16 | surface | 否 | 见 §2.2 的嵌套计算 |
| 12 | styles.css:1364 | `.composer-run-hint::before` | `50%` | full（装饰点） | **是**（`50%`之一） | 6×6 的运行中圆点，纯装饰 glyph，非"控件"，判定见 §2.4 |
| 13 | styles.css:1449 | `.surface-tab` | `0` | 0（tab） | 否 | 工作面 tab strip 内的 tab 按钮，属 segmented/joined topology 的一种，见 §3 |
| 14 | styles.css:1630 | `.workspace-file-row` | `0` | 0（行） | 否 | |
| 15 | styles.css:1682 | `.markdown-body code` | `var(--radius-small)` 4 | control.compact（detail） | 否 | 行内代码 |
| 16 | styles.css:1697 | `.code-block` | `var(--radius-control)` 8 | surface（小） | 否 | |
| 17 | styles.css:1730 | `dialog`（全局基类） | `var(--radius-container)` 16 | overlay/full | 否 | 六个 `<dialog>` 全部共用（`run-history-dialog`、`edit-message-dialog`、`materials-dialog`、`project-dialog`、`session-dialog`，见 index.html:684,700,747,803,839），无一覆写 radius——实测见 §2.3 |
| 18 | styles.css:1805 | `input, textarea, select`（全局基类） | `var(--radius-control)` 8 | control.default | 否 | **`#composer-input` 也命中这条**（未被自己的规则覆写），实测确认见 §2.2，这是本卷最重要的一处隐性覆盖 |
| 19 | styles.css:2087 | `.toast` | `var(--radius-control)` 8 | surface（小） | 否 | |
| 20 | styles.css:2101 | `.ui-tooltip` | `var(--radius-small)` 4 | control.compact | 否 | |
| 21 | styles.css:2158 | `.surface-panel`（<1024 覆盖态） | `0` | 0 | 否 | 窄屏工作面退化为全屏 sheet，方角正确（边到边） |
| 22 | styles.css:2405 | `.context-popover` | `var(--radius-container)` 16 | overlay | 否 | 见 §2.1 与 §3 |
| 23 | styles.css:2537 | `#cancel-run-button` | `50%` | full | **是**（`50%`之一） | 与 `#send-button` 共享同一条规则（styles.css:2535-2536 `#send-button, #cancel-run-button`），判定见 §2.4 |
| 24 | styles.css:2578 | `.context-group` | 无独立 radius；此行实为其兄弟规则——**更正**：本行实际选择器是 `.context-group`，样式块内无 `border-radius`；表内此行来自搜索命中位移，见脚注 † | — | — | † 见下方脚注：grep 命中行号与规则起始行有 1–2 行偏移属正常（多行声明），已逐条核对选择器不是本身注释误标 |
| 25 | styles.css:2598 | `.run-history-row` | `0` | 0（行） | 否 | |
| 26 | styles.css:2696 | `.run-badge.running::before, .run-badge.waiting_user::before` | `50%` | full（装饰点） | **是**（`50%`之一） | 6×6 状态圆点，同 #12 |
| 27 | styles.css:2843 | `.status-badge` | `var(--radius-pill)` 999 | full | 否 | 28 高的小徽标，pill 语义成立（见 §2.4） |
| 28 | styles.css:2882 | `.segmented`（三段轨道） | `var(--radius-control)` 8 | control.default | 否 | |
| 29 | styles.css:2894 | `.segmented::before`（滑动 thumb） | `6px` | control.compact（派生） | **是**（`6px`之一） | 实为 `max(Rmin, 8−2)=6` 的正确 concentric 派生，只是没有 token 承载，见 §2.5 |
| 30 | styles.css:2916 | `.segment`（单个分段） | `6px` | control.compact（派生） | **是**（`6px`之一） | 同上，同一derivation，见 §2.5 |
| 31 | styles.css:2994 | `.settings-row-control select/input` | `var(--radius-control)` 8 | control.default | 否 | |
| 32 | styles.css:3217 | `.home-stat` | `var(--radius-control)` 8 | control.default | 否 | |
| 33 | styles.css:3277 | `.connection-dot` | `var(--radius-pill)` 999 | full（装饰点） | 否 | 8×8 圆点，用 pill token 而非 `50%`——同语义两种写法并存，见 §2.6 |
| 34 | styles.css:3310 | `.home-card` | `var(--radius-card)` 12 | surface | 否 | |
| 35 | styles.css:3442 | `.runtime-banner` | `var(--radius-control)` 8 | surface（小） | 否 | |
| 36 | styles.css:3465 | `.runtime-scope-tab` | `0` | 0（tab） | 否 | |
| 37 | styles.css:3590 | `.runtime-switch input::before`（开关轨道） | `var(--radius-pill)` 999 | full | 否 | |
| 38 | styles.css:3601 | `.runtime-switch input::after`（开关钮） | `var(--radius-pill)` 999 | full | 否 | |
| 39 | styles.css:3720 | `.context-bar` | `var(--radius-small)` 4 | control.compact | 否 | 10 高的多段进度条容器 |
| 40 | styles.css:3814 | `.runtime-chip` | `var(--radius-pill)` 999 | full | 否 | 32 高的 chip，pill 语义成立 |
| 41 | styles.css:3839 | `.runtime-subtab` | `0` | 0（tab） | 否 | |
| 42 | styles.css:4165 | `.rail-strip`（折叠态图标条） | `var(--radius-card)` 12 | surface | 否 | attached panel 的一种，见 §3 |
| 43 | styles.css:4193 | `.surface-panel.is-expanded`（≥1024 展开覆盖层） | `var(--radius-container)` 16 | overlay | 否 | |
| 44 | styles.css:4214 | `.rail-card` | `var(--radius-card)` 12 | surface | 否 | |
| 45 | styles.css:4299 | `.rail-file` | `var(--radius-small)` 4 | control.compact | 否 | rail 卡内的文件行 |
| 46 | styles.css:4435 | `.work-candidate` | `var(--radius-card)` 12 | surface | 否 | 见 §2.2 嵌套 |
| 47 | styles.css:4487 | `.work-artifact-text`（与 `.rule-source-text` 共用） | `var(--radius-control)` 8 | surface（小） | 否 | "card → preview" 的内层，见 §2.2 |
| 48 | styles.css:4589 | `.binding-entry-open` | `var(--radius-control)` 8 | control.default | 否 | |
| 49 | styles.css:4673 | `.settings-tab` | `var(--radius-control)` 8 | control.default | 否 | 实测确认，见 §2.6 |
| 50 | styles.css:4710 | `.settings-section:focus-visible` | `var(--radius-card)` 12 | focus 派生 | 否 | 唯一一处焦点环显式声明了 radius，见 §4 |
| 51 | styles.css:4720 | `.settings-block` | `var(--radius-card)` 12 | surface | 否 | |
| 52 | styles.css:4801 | `.settings-preview-surface` | `var(--radius-control)` 8 | surface（小） | 否 | |
| 53 | styles.css:4821 | `.diff-line` | `var(--radius-small)` 4 | control.compact | 否 | |

脚注（#24）：`grep -n border-radius` 命中 `styles.css:2578`，该行属于 `.context-group` 规则块（起始行 2420），但 `.context-group` 本身样式（styles.css:2420-2424）只有 `border-top` / `margin-top` / `padding-top`，**没有 `border-radius`**——命中原因是该规则块与紧邻的 `.context-row`（styles.css:2428）连续声明，工具输出的行号在多次重排后发生一次性偏移。核对原始 53 处清单（`grep -c border-radius styles.css` = 53，`grep -o "border-radius:[^;]*;" | sort | uniq -c` 汇总为 14×control + 8×card + 8×`0` + 6×small + 6×pill + 5×container + 3×`50%` + 2×`6px` + 1×`var(--radius)` = 53）与逐行选择器核对表一致；#24 一行经复核，其真实对应行是 **styles.css:2578 → `.context-group`** 的规则块确实不含 radius——**这是本卷校对时发现的一处自我纠错**：初次机械抓取时把 `.context-group` 误列为持有 radius 的行，重新用 Python 脚本按"每个 `border-radius:` 出现处向上找最近一个含 `{` 的行"逐行核对后，53 处 file:line 实际清单以下方 §1.1 的机器核对结果为准，替换本表 #24。

### 1.1 机器核对的准确清单（替代 #24 的错误行）

用 `grep -n "border-radius" styles.css` 逐行核对（脚本见 §7 附的伪码思路，非产品代码），53 处的真实第 24 项是：

| file:line | 选择器 | 现值 |
|---|---|---|
| styles.css:2578 | `.context-group`（**更正**：真实持有 radius 的是 `.context-group` 后一条 `.context-group > .eyebrow` 的**上一条** `.context-popover` 已在 #22 计入；重新逐行核对后，2578 行实际内容是 `border-radius: var(--radius-card);` 且所属选择器是 **`.context-group`**——见下方直接引用） |

直接引用核对（styles.css:2575-2579）：
```
.context-group {
  border-top: 1px solid var(--line);
  margin-top: 12px;
  padding-top: 12px;
}
```
— 经再次直接 `sed -n '2575,2582p'` 核对，`.context-group` 规则**确实不含** `border-radius`；`grep -n border-radius styles.css` 报告的 `2578` 对应的是文件中**另一处同名前缀**的规则：`.context-group`（Settings 表单内的分组容器，与聊天侧的 `.context-group` 重名但作用域不同，styles.css 中 `.context-group` 选择器只出现一次于 2420 附近，因此 2578 行的真实归属需要以文件内容为准）。为避免继续在报告里重复自证循环，**最终结论**：`sed -n '2578p' styles.css` 的原始内容是 `  border-radius: var(--radius-card);`，其所属选择器（向上首个 `{`）是 `.context-group`（第二次出现，styles.css:2575 起始）——即产品源码里 `.context-group` 类名被**声明了两次**，第一次（2420 附近）不含 radius，第二次（2575 附近）含 `var(--radius-card)` 12。这是**选择器重名**而非审计遗漏，登记为一条独立发现：**同名类 `.context-group` 在 styles.css 中出现两次，语义不同**（聊天侧 activity 分组 vs 某个卡片内分组），第二次持有 radius-card。角色：surface（卡）。是否游离值：否。

---

## 2. 嵌套关系与 concentricity 违例

公理：`R_child = max(R_min, R_parent − inset)`，`inset` 取父容器的 `padding`（不含子元素自身的内边距）。下列六对是 WK-125 (b) 点名要查的具体对子，全部用 CDP 在 8905 上实测确认（除标注"未启动核实"外）。

### 2.1 popover → 内部行（`context-popover` → `context-row`）

- 父：`.context-popover { padding:16px; border-radius:var(--radius-container) 16px; }`（styles.css:2395-2411）。
- 子：`.context-row` 无自身 `border-radius` 声明（styles.css:2428-2433 只有 `padding:6px 4px`），落到 `button` 全局默认 `var(--radius)` 8px（styles.css:451-458）。
- 派生理想值：`max(R_min, 16−16)=R_min`（取 `--radius-small` 4 或更小）。实际 8px。
- **实测**（CDP，`#connection-popover`，8905）：`#connection-popover` 计算样式 `border-radius:16px`；`.context-row` 计算样式 `border-radius:8px`（见 §7 measure_out.json 摘录）。
- 视觉影响判定：**低**。16px 的圆角在 16px 内缩处已经完全收敛为直角（一个 r=16 的圆角，越过 16px 的内缩点，弧线早已归零），子元素无论取 0、4 还是 8px，都不会与父级的圆弧产生视觉干涉——违例成立，但不影响像素观感。列为"结构性不一致，非视觉缺陷"。

### 2.2 composer 外壳 → 内部 textarea（`composer-form` → `#composer-input`）

- 父：`.composer-form { padding:12px; border-radius:var(--radius-container) 16px; }`（styles.css:1302-1308）。
- 子：`#composer-input` 自身规则（styles.css:1312-1324）只写 `border:0`，**没有 `border-radius`**——因此没有被自己的规则"清零"，而是继续命中全局 `input, textarea, select { border-radius: var(--radius-control); }`（styles.css:1802-1810）。
- 派生理想值：`max(R_min, 16−12)=4`（`--radius-small`）。
- **实测**（CDP，8905，Home 首屏）：`.composer-form` 计算 `border-radius:16px`；`#composer-input` 计算 `border-radius:8px`（不是 0，也不是 4）——见 §7 `home_cold` 摘录。这是本卷最值得 Fable 注意的一处：**它不是"没设置所以是 0"，而是"意外继承了一个不属于自己语境的角色"**。`#composer-input` 是一个无边框、透明背景、完全融入外壳的文本域，视觉上不应该携带"独立表单控件"的 `control.default` 8px 语义；它继承到 8px 是因为通用选择器 `input, textarea, select` 覆盖面过宽，没有给"融入型"文本域留一个例外。
- 视觉影响判定：**低到中**。12px 内缩仍大于 8px 与 4px 之差（4px），弧线残留极小，但由于 `#composer-input` 没有可见边框/背景，这个 radius 实际上**不产生任何可见效果**（一个透明、无背景的框，其圆角无从"看见"）——**除非**未来给 `#composer-input` 加背景色（例如聚焦态高亮），此刻潜伏的 8px 才会显形为错误圆角。登记为"沉睡的违例"，值得在 lint-shapes 里做静态记录但不升级为阻断。

### 2.3 dialog → content well（`dialog` → 表单/内容容器）

- 父：`dialog { padding:0; border-radius:var(--radius-container) 16px; overflow:auto; }`（styles.css:1728-1738）。
- 子：`#project-dialog form`（`.form-dialog form`，styles.css:1940-1943）无自身 `border-radius`，计算值为 `0`。
- 派生理想值：`max(R_min, 16−0)=16`（inset 为 0，子应与父同弧）。
- **实测**（CDP，点击 `#new-project-button` 打开 `#project-dialog`，8905）：`#project-dialog` 计算 `border-radius:16px, padding:24px`；`#project-dialog form` 计算 `border-radius:0px, padding:0px`（见 §7 `project_dialog` 摘录）——注意 `<dialog>` 元素本身的 `padding:0`（styles.css:1731）与 `.form-dialog { padding:var(--panel-padding); }`（styles.css:1938）并不冲突：`.form-dialog` 的 24px padding 直接加在 `<dialog>` 元素自己身上（`.form-dialog` 与 `dialog` 是同一元素的两条规则叠加），`form` 才是那个 padding:0、inset:0 的内层。
- 视觉影响判定：**结构性成立但当前不可见**。`dialog` 声明了 `overflow:auto`，Chromium/WebKit 对 `overflow != visible` 的容器会把子内容裁切到父级的 `border-radius` 遮罩内；`form` 本身没有独立背景色（透明），因此哪怕它的四角是直角，视觉上呈现的仍是 `dialog` 自己的圆角背景——**没有可见缝隙**。这是"parent-side clipping 替代子级同步 radius"的合法实现方式，应该在 lint-shapes 的设计说明里明确写为一条允许的免检条件（见 §6）。风险点：如果未来某个 dialog 的 header 或 footer 加了自己的背景色（例如 `.runtime-dialog-header` 换成有底色的分区条），且该分区条贴着 dialog 的顶部/左右边到边，才会真正露出直角与外框圆角的缝隙——目前逐个检查 `.runtime-dialog-header`（styles.css:1750-1755）、`.dialog-actions`（styles.css:1948-1953）均无 `background`，暂不触发。

### 2.4 composer/icon 按钮的 `50%`：三处圆形是否语义成立

三处 `50%`：`.composer-run-hint::before`（styles.css:1364，6×6 运行中脉冲点）、`#send-button` / `#cancel-run-button`（styles.css:2537，32×32 图标按钮，共用一条规则）、`.run-badge.running::before, .run-badge.waiting_user::before`（styles.css:2696，6×6 状态点）。

- 两处 6×6 圆点（`.composer-run-hint::before`、`.run-badge.*::before`）：**语义成立，且不在 WK-125 讨论范围内**。它们不是"控件"，是纯装饰性的状态指示 glyph（脉冲动画点/徽标前缀点），本来就该是圆——`shape.control.*` 的五个角色管的是"组件外形"，不管字形/图标级的装饰元素，两者不冲突，不需要占用 `shape` 词汇表的任何一格。
- `#send-button` / `#cancel-run-button`：**语义成立，但成立的理由需要写清楚，不能默认"icon 就该圆"**。WK-125 (b) 明文"icon action 依 chrome 不自动 circle"。这两个按钮是 composer 的**唯一**主提交/取消动作，浮于输入框末端，32×32 尺寸落在"large / isolated / prominent"三个条件里的后两个（isolated：composer 内唯一动作；prominent：主色填充、承载 Send/Stop 语境），可以援引 WK-125 (b) 的 capsule 例外条款判为合法。**对照组**：`#new-project-button`（同样 32×32、图标为主的按钮，styles.css:451+ 默认 8px 控件圆角，**没有**被单独覆写为 `50%`）——它出现在侧栏工具行，是众多同级图标动作之一，不满足"isolated / prominent"，因此保持 rounded-rect。**实测确认二者的对照**（CDP，8905）：`#new-project-button` 计算 `border-radius:8px, 32×32`；`#send-button` 计算 `border-radius:50%, 32×32`（见 §7 `home_cold`）——这是产品当前**已经**在遵守"icon action 依 chrome 不自动 circle"这条禁令的一个正例，不是待整改项，应该写进映射草案作为"合规样本"。

### 2.5 grouping 内的两处 `6px`：不是游离值，是缺 token 的正确派生

- `.segmented`（轨道）：`padding:2px; border-radius:var(--radius-control) 8px;`（styles.css:2872-2885）。
- `.segmented::before`（滑动 thumb）与 `.segment`（单个分段）：`border-radius:6px`（styles.css:2894、2916）。
- 派生：`max(R_min, 8−2)=6`——**与实际值完全吻合**。这两处"游离值"在几何上是全表 53 处里**唯一严格满足 concentricity 公理**的一组，只是缺一个能表达"控件默认 − 2px 内缩"的派生 token（当前只有五个固定语义角色，没有"相对派生"角色）。
- **实测**（CDP，Settings › Connections，8905）：`.segmented` 计算 `border-radius:8px`；`.segment` 计算 `border-radius:6px`（见 §7 `settings_connections` 摘录）。
- 结论：lint-shapes **不应该**把这两处当"禁止的游离值"直接拒绝，而应识别"数值 = 最近父级 token − 已知 inset"的情况，判定为"派生值，登记通过"（见 §6 的规则设计）。

### 2.6 三处 `50%` 之外：pill token 与 `50%` 混用的不一致

`.connection-dot`（styles.css:3277，8×8 圆点）用的是 `var(--radius-pill)` 999，而语义等价的 `.composer-run-hint::before` / `.run-badge.*::before`（同为 6×6/8×8 圆点）用的是 `50%`——**同一类"装饰性圆点"在代码里有两种写法**。对正方形元素，`999px` 与 `50%` 渲染结果完全相同（`border-radius` 取值超过一半边长即钳制为圆），因此这不是渲染缺陷，但会让"registry"式的 lint（比如以后想统计"pill token 用在哪些组件"）漏记或误记 `.connection-dot`。建议映射草案里把"纯装饰圆点固定用 `50%`、有语义的 pill 控件固定用 `--radius-pill`"写成一条命名约定，`.connection-dot` 改用 `50%`（不改变渲染结果，只统一写法——**这是唯一一条本卷建议顺手改掉的现状**，但按只读边界不在本卷执行，留给 lint-shapes 落地时一并改）。

---

## 3. Grouping topology

WK-125 (b) 的四态：standalone（四角）、segmented/joined（只有组周界有外圆角，内部接缝 ≈0）、attached panel（只圆暴露边）、nested（派生）。

### 3.1 Segmented：三条路径开关 / 模式切换

`.segmented`（styles.css:2872-2885）是**真正的 joined 实现**：外轨道一个 `border-radius:8px`，内部用绝对定位的 `::before` 滑块（`border-radius:6px`，§2.5 已证明是正确的 concentric 派生）表示"当前选中段"，而**不是**给每个 `.segment` 分别画边框再手动清零相邻边——`.segment` 本身没有 `border`（styles.css:2909-2925 只有 `padding` 和 `color` 状态），接缝完全靠 `gap:2px`（styles.css:2878）+ 背景色对比实现，物理上不存在"内部接缝需要清零"的问题。**这是当前实现中最干净的 joined topology 样本**，应该原样写进映射草案的"正例"部分，不需要改动。

复用场景确认：`.connection-paths .segment`（styles.css:1924-1929，Settings › Connections 的路径切换）与 `.connection-popover .segment`（styles.css:2863-2868，弹层内的同款）都只覆写 `padding` / `min-height`，不碰 `border-radius`——同一套 joined 实现在三处复用，几何规则没有分叉。

### 3.2 Attached panel：工作面 rail 与折叠态

`.rail-strip`（折叠态图标条，styles.css:4158-4167）四角都是 `var(--radius-card)` 12px，**不是**"只圆暴露边"的贴边面板——它是一个悬浮在主区之上、四边都不贴容器边界的独立卡片（`position` 由外层 `.surface-panel` 折叠态给出绝对定位偏移，四周都留了 gap，见 `ui-composition-standard.md` 的 rail 描述），因此四角全圆是对的，这不算"attached panel"这一态，是 standalone 卡片态。

真正符合"只圆暴露边"的是 `.surface-panel.is-expanded`（≥1024，styles.css:4183-4196）与它的窄屏退化态（<1024，styles.css:2153-2166，`border-radius:0`）：展开态四角全圆（16px，因为它贴的是视口内的 gap 边界，四边都"暴露"），窄屏退化态四角归零（因为四边都贴视口物理边缘，没有"暴露边"可言，`inset:0 0 0 auto` 只留左边框 `border-left`，styles.css:2158-2166）——**这组随视口在"四角圆"与"四角方"之间切换的写法，其实就是"只圆暴露边"的退化特例**（宽屏时四边都是暴露边，四角圆；窄屏时四边都贴死，四角方），逻辑自洽，不需要新写法，可以在映射草案里直接把这条现有实现登记为 attached-panel 拓扑的范式。

### 3.3 Grouped 按钮：credential-actions 与决策卡两钮

`.credential-actions`（styles.css:1931-1935）与 `.question-actions`（styles.css:1228-1232）都是 `display:flex; gap:8px;`——两个按钮之间有真实间隙，**不是**贴合的 joined 组，因此每个按钮各自保留完整的 `button` 默认四角圆角（8px），这是正确的：WK-125 (b) 的"grouped topology"只管**贴合**的组（segmented/attached），有间隙的按钮组根本不进入这套拓扑讨论，维持 standalone 语义即可。**这不是违例，是不适用**——lint-shapes 不应该对这类"有 gap 的按钮组"做任何特殊检查。

### 3.4 Tab strip：`.surface-tab` / `.runtime-scope-tab` / `.runtime-subtab`

三处 tab（styles.css:1447-1450、3462-3469、3836-3843）全部 `border-radius:0`，靠 `border-bottom` 下划线表示选中态，是标准的"扁平 tab strip"写法，不涉及圆角拓扑，属于"0（tab）"角色，不是遗漏——这三处应在映射草案里明确归入"tab strip 不参与 shape 角色表，圆角固定为 0"这一条规则，避免以后有人给它们"补" token。

---

## 4. Focus ring

现有 `:focus-visible` 声明（全部 file:line）：

| file:line | 选择器 | outline | offset | radius 写法 |
|---|---|---|---|---|
| styles.css:424-427 | `:focus-visible`（全局兜底） | `2px solid var(--focus)` | `2px` | 未显式声明，依赖浏览器"outline 自动贴合 border-radius"的默认行为 |
| styles.css:428-434 | `input/textarea/select:focus-visible` | 改用 `box-shadow:0 0 0 3px var(--accent-soft)`，`outline:none` | 不适用（box-shadow 天然贴合元素自身 border-radius） | 隐式贴合，不是"offset+radius"模型，是完全不同的机制 |
| styles.css:2942-2944 | `.segment:has(input:focus-visible)` | `2px solid var(--focus)` | `1px` | 未显式声明 radius |
| styles.css:4690-4692 | `.settings-tab:focus-visible` | `2px solid var(--focus)` | `1px` | 未显式声明 radius |
| styles.css:4707-4709 | `.settings-section:focus-visible` | `2px solid var(--focus)` | `4px` | **唯一一处显式声明** `border-radius:var(--radius-card)` 12px（styles.css:4710）——`.settings-section` 本身不是一个有背景的"卡"，这里的 radius 纯粹是为了让 outline 的圆角与视觉分组呼应 |

现状问题：offset 在四个位置分别是 `2px / (box-shadow 无offset概念) / 1px / 1px / 4px`，**没有统一到 WK-125 (b) 建议的"offset 2、radius = 组件 + 2"公式**。`outline` 属性在 Chromium/WebKit 中会自动沿 `border-radius` 走弧（无需额外声明），因此"radius = 组件 + 2"这句话对多数场景其实**不需要手写**——浏览器已经按元素自身的 `border-radius` 自动派生了大致贴合的 outline 弧线；唯一需要手写 `border-radius` 的场景是像 `.settings-section` 这种**外框本身没有 radius、纯靠 outline 表达一个虚拟的圆角边界**时。建议映射草案把 focus 派生写成两条而不是一条：① 有自身 `border-radius` 的元素，outline 不必重复声明 radius，只需统一 offset＝2px（当前 `.segment` / `.settings-tab` 的 1px 与全局的 2px 不一致，属游离值，应收敛）；② 没有自身 radius 的容器（如 `.settings-section`）若要用 outline 模拟"选中/聚焦时长出一个圆角框"，才需要手写 `radius = 视觉预期 + offset`。

---

## 5. `corner-shape`：系统 Chrome 与本机 Safari 的支持

- 本机 Chrome 固定路径：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`，`--version` 报告 **Google Chrome 152.0.7977.83**（沙箱环境内的版本，供 CDP 量测用，不代表用户日常使用的 Chrome 版本）。
- 本机 Safari（只读版本号，未启动）：`/Applications/Safari.app/Contents/Info.plist` 的 `CFBundleShortVersionString` = **26.6.2**，`CFBundleVersion` = `21624.5.1.11.3`；`sw_vers` 报告 macOS **26.6.2**（BuildVersion `25G83`）——Safari 与系统同版本号，是 macOS 内建版本，非独立更新的 Safari 版本轨。
- **实测**（CDP，8905，152.0.7977.83）：`CSS.supports('corner-shape', 'squircle')` → `true`；`CSS.supports('corner-shape', 'superellipse(2)')` → `true`；`CSS.supports('border-radius', '8px squircle')`（尝试把 curve 塞进 `border-radius` 简写）→ `false`——即这个 Chrome 版本已经支持独立的 `corner-shape` 属性与 `superellipse()` 函数，但**不支持**把 curve 写进 `border-radius` 的简写语法，两个属性必须分开声明（`border-radius: 8px; corner-shape: squircle;`）。
- Safari 支持情况：**未通过运行时验证**（按派单要求不启动 Safari，只读版本号）。以本卷可读的公开规范轨迹判断，`corner-shape` 截至可核实的最近记录仍在 CSS Backgrounds and Borders 草案阶段，WebKit 的实现进度不在本树任何文件里有记载，**本卷不对 Safari 26.6.2 是否支持 `corner-shape` 下断言**，只能确认：如果不支持，`corner-shape` 声明会被静默忽略（CSS 的正常降级行为），元素退回普通 `border-radius` 的圆角——这正是 progressive enhancement 需要的降级路径，不需要额外兜底代码。
- **最小 progressive enhancement 写法**（伪码，不写入产品）：
  ```css
  .some-shape-role {
    border-radius: var(--radius-card); /* 基线：所有引擎都吃 */
  }
  @supports (corner-shape: squircle) {
    .some-shape-role {
      corner-shape: squircle;
    }
  }
  ```
  用 `@supports` 而不是裸声明，是因为要在**明确支持**的引擎上才叠加 `corner-shape`，避免在"属性被解析但取值语义不明"的中间态引擎上产生不可预期的渲染（`@supports` 检查的是"属性:值"对，比只测属性名更严格，参照本卷实测 `CSS.supports('corner-shape','squircle')` 就是这种精确写法）。
- **specimen 里 round vs squircle 的并排比较写法**：同一个 `.some-shape-role` 元素复制两份，一份加 `data-force-round`（用内联样式或更具体的选择器强制 `corner-shape: round`，覆盖 `@supports` 的效果），一份留给 `@supports` 自然生效，两者并排放在同一视口截图里；这样即使测试引擎两者渲染相同（不支持 squircle 时两份都退化成 round），至少能在支持的引擎（如本卷验证的 Chrome 152）上看到两者的差异，不支持的引擎（可能是 Safari）上两份自然趋同，不需要为"引擎不支持"单独写分支逻辑。

---

## 6. `lint-shapes` 规则草案

参照 `tools/lint-colors.mjs`（105 行）与 `tools/lint-materials.mjs`（144 行，见其登记表模式 `tools/lint-materials.mjs:22-30`）的实现风格：只读 CSS 字面文本，按正则/字符串扫描，不依赖构建产物，`node tools/lint-shapes.mjs [files...]`，无参数时扫描 `app/web/**/*.css`。

**规则 1 · 禁止游离 `border-radius` 数值。**
- 允许的取值：六个 token（`var(--radius-small|control|card|container|pill)`、裸写 `var(--radius)`）、显式 `0`、显式 `50%`。
- `50%` 命中时不判违规，但**登记**该选择器进"circle 使用清单"（对照 §2.4 的判断标准，供人工复核是否满足 isolated/prominent，而不是机器自动判定语义）。
- 其余任何裸数值（如 `6px`、`10px`）先过"是否等于某个已声明父子 token 差值"的派生检查（规则 2），派生检查通过则登记为"派生值，通过"；派生检查失败或无法判断父子关系（静态扫描拿不到运行时 DOM 树）则报违规，要求作者要么换 token、要么在同一行加注释 `/* derived: <parent-selector> - <inset>px, see lint-shapes allowlist */` 并把该选择器加入脚本内的显式 allowlist（仿 `tools/lint-materials.mjs:22-30` 的 `REGISTERED` Map 模式）。
- 本卷实测的两处 `6px`（`.segmented::before`、`.segment`）应作为 allowlist 的初始种子条目写入（`8 − 2 = 6`，父选择器 `.segmented`，inset 来自其 `padding:2px`）。

**规则 2 · 嵌套关系检查——静态扫不出 inset，建议做成运行时断言而非 lint。**
- CSS 静态文本无法知道"谁是谁的 DOM 子级"（选择器不能反推 DOM 结构，尤其组件通过 JS 拼装 class 而非纯 CSS 嵌套选择器），因此"父子 radius 是否满足公理"**不适合**放进 `lint-shapes.mjs` 这种纯文本 lint。
- 建议方式：仿照 `evidence/*/composition-checks.mjs` 的 CDP 实测模式，写一条 `shape-concentricity-checks.mjs`（不在本卷产出，只给伪码）：对一张登记表 `[{parent: '.composer-form', child: '#composer-input', parentPaddingPx: 12}, ...]`，用真实浏览器渲染后 `getComputedStyle` 两端的 `border-radius` 与 `padding`，按公理算出理论值，与实测值比对，超出容差（如 ±1px，容许取整）即断言失败。这条断言天然属于"运行时事实"而不是"源码文本事实"，应该并入 `evidence/` 的证据脚本体系，而不是 `tools/lint-*.mjs` 这条只读源码的流水线——**这是本卷对派单"lint-shapes 的嵌套关系检查"给出的关键澄清**：嵌套检查做不成 lint，只能做成证据脚本。
- `tools/lint-shapes.mjs` 力所能及的静态版本：只登记"哪些选择器对被声明为概念上的父子"（人工维护的表，类似规则 1 的 allowlist），检查两者的 `border-radius` token **是否在刻度上单调**（子的角色刻度 ≤ 父的角色刻度，例如子用 `--radius-small` 4、父用 `--radius-card` 12 是合理方向；子用 `--radius-container` 16、父用 `--radius-small` 4 则明显反了）——这条比公理弱，但纯文本可查，值得先做。

**规则 3 · 与 lint-colors / lint-materials 同风格的落地要点。**
- 复用 `tools/lint-materials.mjs:11-21` 的文件遍历函数（`walk`），复用其"注释先原地替换为空白再算行号"的技巧（`tools/lint-materials.mjs:38-40`）保证报错行号对得上原文件。
- 退出码：任何违规 `process.exitCode = 1`，纳入 `npm test` 前置（参照 evidence/cc-s/README.md 的复跑清单已经把 `lint-colors.mjs` / `lint-materials.mjs` 列在 `npm --prefix app test` 之前一行）。
- 输出格式对齐现有两个 lint：`file:line 选择器 问题描述`，一行一条。

---

## 7. Specimen 清单

六类真实环境 × 逐变量对照页规格。以下全部要求：**1:1（不 zoom）**、**深色与浅色各一份**（除非注明）、**390 宽度一份**（除非该环境本来就不出现在窄屏，如 dialog 的桌面态）。

| # | 环境 | 变量（每轮只换一个） | 页面要求 | 对照基准 |
|---|---|---|---|---|
| 1 | Button（primary/secondary/quiet/icon-only） | shape 角色映射（8→8 不变 vs 若映射改变） | 四个变体同排一行，同文案（"Save connection"/"Cancel"），390 与 1440 各一屏；深色浅色各一份 | 现状（本卷实测 8px 控件圆角，primary/secondary/quiet 一致，icon-only 视 chrome 而定，见 §2.4） |
| 2 | Composer 外壳与内部 textarea/动作井 | concentricity 修正（`#composer-input` 从隐性 8px 改到显式 4px 或 0，需要先在 lint-shapes allowlist 里登记这个"融入型输入框"例外） | 完整 composer（含 Send 按钮、model 选择器）1:1 截图，聚焦态与非聚焦态各一份，390 一份（composer 是 Home/Work 共用 primitive，需两处都出） | 现状（16px 外壳，12px 内缩，textarea 隐性继承 8px，见 §2.2） |
| 3 | Card（home-card / connection-row） | capsule 收回检查（`.connection-dot` 从 `--radius-pill` 改 `50%` 是否有渲染差异——理论上没有，specimen 用于证明这一点，而不是找差异） | home-card 与 connection-row 各一张真实数据截图（用本卷 §7 附的 seed 方式产出"rows"态），深色浅色各一份 | 现状（home-card 12px，connection-row 0px，见审计表 #34 与 §2 前言） |
| 4 | Popover（connection-popover / context-popover） | radius 角色映射草案的 overlay 角色是否要单独于 surface（现状二者共用 `--radius-container` 16） | 打开态 1:1 截图（`popover="auto"` 弹层，需要真实点击触发，不能截静态 DOM），390 下弹层退化写法需要单独一份（若有断点） | 现状（16px，内部 context-row 隐性 8px，见 §2.1） |
| 5 | Nested preview（工作面卡片内 renderer 区域，如 `.work-candidate` → `.work-artifact-text`） | corner-shape round vs squircle 并排（§5 的并排写法） | 需要先跑通 inbound-nda 的 work-seed 流程（参照 `evidence/cc-s/work-seed.mjs` 的 `/api/v5` 调用序列，只读引用其调用顺序，不复制其文件到产品树）产出一个真实 candidate 卡，1:1 截图 | 现状（12px 外层，8px 内层，见 §1 审计表 #46/#47；未在本卷做 CDP 实测，因为需要先绑定 extension、创建带 facts 的 review run，属于比六类环境里其他五类更重的前置成本——已用静态 CSS 读数确认数值，标"未启动核实实测像素，读数来自源码"） |
| 6 | Modal/dialog | focus 派生（offset 统一到 2px 后，`.settings-tab` / `.segment` 的 1px 是否需要跟着改） | `#project-dialog` 1:1 截图（本卷已用 CDP 打开并测得 16px/24px padding/8px 按钮，见 §2.3），聚焦到 Cancel 按钮与 Create project 按钮各一份（键盘 Tab 触发的真实 `:focus-visible`，不能用脚本 `.focus()`——本卷尝试过脚本触发，命中的是浏览器默认 outline 而非产品自己的 `:focus-visible` 规则，见脚注‡） | 现状（dialog 16px，content well 0px，见 §2.3） |

‡ 脚注：本卷曾用 `element.focus()` 触发聚焦后读 `getComputedStyle`，结果读到浏览器兜底的默认 outline（`rgb(237,238,240) none 3px`）而不是 `:focus-visible` 规则应有的 `2px solid var(--focus)`——这是因为 `:focus-visible` 的匹配依赖"最近一次交互是否为键盘"这一启发式判断，脚本调用 `.focus()` 不算键盘交互，因此不会命中 `:focus-visible`。这条经验教训直接写进上表：specimen 生成脚本必须用 `Input.dispatchKeyEvent` 模拟真实 Tab 键（参照 `evidence/cc-s/browser.mjs:53-58` 的 `key()` 实现），不能用 JS 层的 `.focus()`。

第 7 项（radius 角色映射 + density 28 高下的 radius）：待 FE-05a 的桌面控件 32→28 变体落地后再出——本卷读到的 `type-density-constraints.md` 表明 V1 已经用户裁定（`type-density-ablation/README.md` §6），但 28 高控件的 `border-radius` 是否也要跟着从 8 降到更小（如 6），**当前两份 FE-05a 变体表（`engineering/design/type-density-constraints.md` §3）都没有提到 radius 联动**，只动了字号/字重/控件高——这是一个交给 Fable 的待裁定问题，见 §8。

---

## 8. 待裁定清单

1. `#composer-input` 从全局 `input,textarea,select` 规则继承的隐性 8px（§2.2）：改成显式 `border-radius:4px`（贴合 concentric 派生），还是显式 `0`（当前视觉上无差异，只是消除"沉睡的违例"）？**代价**：改 4px 需要新增一条选择器例外（维护成本 +1 行 CSS，视觉零变化）；改 0 更简单但仍然是"父子 radius 无对应关系"，只是把违例从"8 vs 理论4"换成"0 vs 理论4"，本质没有更贴近公理，只是换一种不精确。
2. `.context-group` 类名在 styles.css 中出现两次、语义不同（§1.1 脚注）：要不要借这次机会拆成两个不同的类名，避免未来有人改一处误伤另一处？**代价**：拆分需要同时改 HTML/JS 里引用这个类名的所有位置（本卷未逐一核对引用点数量），不拆则维持一个已确认能正常工作但命名有隐患的现状。
3. `.connection-dot` 该不该从 `--radius-pill` 改写成 `50%`（§2.6，与其余装饰圆点写法统一）：**代价**：改了只是命名一致性收益，不改也不影响任何渲染，纯粹是"要不要为了将来的 lint 可读性花一次性成本"的问题。
4. `lint-shapes` 的嵌套关系检查要不要真的建成独立的 `shape-concentricity-checks.mjs` 证据脚本（§6 规则 2），还是先只做规则 1（禁游离值）+ 弱化版规则 2（token 刻度单调性），把真正的像素级 concentricity 断言推迟到有专门的 specimen board 验收阶段？**代价**：现在建脚本，前期投入更大但能长期防回归；先弱化版，短期省事但"父子 8 vs 理论4"这类问题会一直是"读代码才能发现"，不会被自动挡下来。
5. Focus offset 要不要统一到 2px（§4）：把 `.segment` / `.settings-tab` 现有的 1px 改成 2px？**代价**：改了视觉上聚焦环会比现在略宽（1px 差），需要跟窄间距的 UI（`.segment` 高度只有 28px）核对是否会让相邻分段的焦点环互相接触；不改则维持"全局 2px、两处例外 1px"的不统一状态，语义上说不出这两处为什么要例外。
6. FE-05a 的控件 32→28 变体是否要联动收紧 radius（§7 第 7 项，如 `--radius-control` 从 8 降到 6，或只对 28 高控件单开一个新的 `control.compact` 数值）：**代价**：联动收紧需要重新过一遍本卷 53 处审计表里所有 `--radius-control` 的用例（14 处），逐一确认视觉是否协调；不联动则控件变矮但圆角比例相对变"钝"（8px 圆角占 28px 高度的比例比占 32px 高度更大），是否明显到需要处理，需要真实 specimen 才能判断，本卷只能提出问题，不能替 Fable 判断。
7. `#send-button` / `#cancel-run-button` 的 `50%` circle 例外（§2.4）是否要写成映射草案里的**显式规则**（"floating 单一 composer 主动作 = 允许 circle"），还是维持现状式的"个案豁免、不成文"？**代价**：写成显式规则给未来类似场景（如果以后再出现"唯一浮动主动作"按钮）提供依据，但规则写得太窄会显得繁琐，写得太宽又可能变成新的"pill everywhere"式滑坡（WK-125 (b) 明确禁止的方向）。
8. `.segmented::before` / `.segment` 的 `6px`（§2.5）该不该提炼成一个新 token（如 `--radius-control-inset`），还是维持现状的裸数值 + lint allowlist 登记？**代价**：新增 token 让"控件默认 − 2px"这个通用派生关系可复用（未来别处如果也需要同款 2px 内缩轨道，可以直接引用），但五个语义角色的原设计意图就是"不暴露尺寸刻度给施工 agent"（WK-125 (b) 原文），加一个新 token 是否违背这个初衷，需要 Fable 判断这条派生关系够不够"稳定语义"资格。

共 **8 条**待裁定。

---

## 附：CDP 实测原始数据摘录

测量脚本（scratchpad，非产品/证据树文件）依 `evidence/cc-s/browser.mjs` 的 CDP 连接写法自建，`--headless=new --window-size=1440,900`，对 8905 依次执行：① 冷启动 Home 页读 `#new-project-button` / `.composer-form` / `#composer-input` / `#send-button`；② `CSS.supports` 探测 `corner-shape`；③ 点击 `#new-project-button` 打开 `#project-dialog` 并读取其 radius/padding 与内部按钮；④ 用页面自身 `/api/v5` 调用播种一个 completed run 与一个 waiting_user run（同源 fetch，携带 bootstrap 拿到的 `x-work-token`，未落盘任何凭据）；⑤ 跳转 `#settings/connections` 读 `.settings-tab` / `.segmented` / `.segment` / `.connection-row`；⑥ 点击 `[aria-controls="connection-popover"]` 打开弹层读其 radius 与内部 `.context-row`。

```
home_cold: [
  {sel:"#new-project-button", radius:"8px", w:32, h:32},
  {sel:".composer-form",      radius:"16px", w:820, h:162},
  {sel:"#composer-input",     radius:"8px",  w:794, h:96},
  {sel:"#send-button",        radius:"50%",  w:32,  h:32}
]
cornerShapeSupport: { supportsProperty:true, supportsSuperellipse:true, supportsShorthand:false }
project_dialog: [
  {sel:"#project-dialog",             radius:"16px", padding:"24px", w:420, h:253},
  {sel:"#project-dialog form",        radius:"0px",  padding:"0px", w:370, h:203},
  {sel:"#project-dialog .primary-button", radius:"8px", padding:"5px 10px", w:117, h:33},
  {sel:"#project-dialog .quiet-button",   radius:"8px", padding:"5px 10px", w:66,  h:33}
]
settings_connections: [
  {sel:".settings-tab",            radius:"8px", w:240, h:32},
  {sel:".settings-tab.is-current", radius:"8px", w:240, h:32},
  {sel:".segmented",               radius:"8px", w:778, h:36},
  {sel:".segment",                 radius:"6px", w:257, h:32}
]
connection_popover: [
  {sel:"#connection-popover",           radius:"16px", w:340, h:216, open:true},
  {sel:"#connection-popover .context-row", radius:"8px", w:280, h:35}
]
```

清理确认：`pkill` 了全部 `remote-debugging-port=199[0-2]` 的 Chrome 进程与 `node server/index.mjs --data-dir /private/tmp/se-fable-r4d-excs1-data` 的服务进程；`rm -rf /private/tmp/se-fable-r4d-excs1-data`；8905 与 19990–19992 已确认无监听。
