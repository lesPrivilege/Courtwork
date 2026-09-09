# 交付 WO-WK12 · Settings 整页与用户自定义（Claude Opus，2026-09-09）

工单 [WO-WK12](work-orders/WO-WK12-settings-page.md)。裁定来源：[WK-78](intake-round-3.md)（全文）、WK-27 / 69 / 74 / 82、[settings-references](inputs/settings-references-2026-09-08.md)、[frontend-layering-spec](../../../design/frontend-layering-spec.md) §2.1 / §3 / §3.1 / §4.1 / §4.2 / §6（FN-09 / 10 / 11 / 14 / 16 / 17 / 26 / 27 / 28 / 29）、[color-governance](contracts/color-governance.md)、[copy-convention](../../../design/copy-convention.md)、[icon-controls](../../../design/icon-controls.md) IC-1 / IC-2、[ui-composition-standard](../../../design/ui-composition-standard.md)、[interface-components](../../../../docs/interface-components.md)、[delivery-wk10b-1 §5](delivery-wk10b-1.md)（`flowRow` 行解剖）、[delivery-wk13](delivery-wk13.md)。

## 1. 固定 SHA 与工作条件

| 项 | 值 |
|---|---|
| 基线 | `429fdd68febb9998f322a0b53c323651fc8cd7fd`（清洁 `main`，含 WK10b 第一段 + 第二段与 WK13 r2） |
| 工作树 | `<isolated-checkout>` |
| 分支 | `claude/wk12-settings`（未 push） |
| 实现 SHA | 代码、证据与本文件同在一次提交，分支 `claude/wk12-settings` 的唯一一次提交；该 SHA 见交付回执（一次提交无法在自己内部记录自己的 SHA） |
| 服务端口 | 8881 |
| 数据目录 | `/private/tmp/se-agent-wk12-data`（全新、仓外、fake provider；未读取任何凭据文件，X2 用的是一把一次性假 key，跑完即删） |
| CDP 端口 | 19691–19697（每支核对脚本各一个） |

`git diff -- app/server app/runtime app/core app/domains app/extensions brand PAPER.md app/web/runtime-view.mjs app/web/home-view.mjs app/web/presentation-adapters.mjs` 为空：本单没有临时改过服务端，也没有新增 web 模块，因此**没有静态 allowlist 请求**（见 §9）。

## 2. 受影响文件

| 文件 | 改动 |
|---|---|
| `app/web/index.html` | `<head>` 加首帧偏好脚本；删掉 `<dialog id="runtime-dialog">`（是删除不是隐藏）；主区内新增 `#settings-page` 页壳与五个组的骨架，原对话框里的 `#provider-panel` / `#session-settings` / `#runtime-control-settings` / `#runtime-context-summary` / `#runtime-info` / `#extension-list` / `#planned-capabilities` 原 id 迁入对应组 |
| `app/web/settings-view.mjs` | 新增页控制器 `createSettingsPage`、行与分段控件、真实产品片段预览、用户 skin 校验 `validateSkinTokens`、本设备偏好读写；`createSettingsView` 增加 `page` 选项，把已取到的快照推给页 |
| `app/web/app.mjs` | 以 `openSettings` / `closeSettings` / `syncSettingsFromHash` 取代对话框开合；hash 路由与 Escape 顺序；进页收起悬浮工作面；走到会话或 Home 时让页退场；列表键在页在场时静默；`closeSurface` 增加 `restoreFocus` 选项 |
| `app/web/styles.css` | `--text-scale` 与字号角色改乘子；`data-text-size` 三档；`data-motion="reduce"` 强制档；`[data-skin="gray-steel"]` 的三个 tier:S 块；分段控件段数变量；Settings 页的 tier:U 样式 |
| `app/tests/settings-preferences.test.mjs` | 新增 14 条：用户 skin 校验规则、偏好读取闭集、产品内 gray-steel 与 `skins/gray-steel.css` 的逐字一致 |
| `docs/interface-components.md` | 新增 Settings 段；Ownership 增加 `settings-view.mjs`；Composition 首句改为「Chat Flow，或占其位的 Settings 页」 |
| `engineering/design/copy-convention.md` | §3 词表新增五行（Scheme · Skin · Text size · Code font · Appearance 组名），并把「Provider 仅设置对话框内」改为「仅 Settings › General 的表单内」 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §5 增量索引加本轮一行 |
| `engineering/mvp/execution/work-surface-kit/evidence/wk12/` | 夹具 `harness.mjs` + 六支核对脚本 + `shots.mjs`，七份 JSON 与 18 张截图 |

`app/web/skins/gray-steel.css` 一字未改：它仍是这套色阶可独立加载的副本，产品内的同名 skin 与它由测试逐字绑定（§8 的第三条）。

## 3. 页壳与路由（交付 1）

- **不是模态。** `#settings-page` 与 `#conversation-body` 是主区里互斥的两块；没有 `dialog`、没有遮罩、没有第二个焦点陷阱，侧栏与顶带的开合按钮全程可用（S1）。原 `<dialog id="runtime-dialog">` 连同 `#close-runtime-button` 的接线一并删除。
- **进出。** `#runtime-setup-button` 进；焦点落在 Back，因为出去的路和 Escape 指的是同一件事。Back 与 Escape 同一条路：回到进入前的画面，焦点还给打开它的控件（S3 / S5）。Escape 的层序是抽屉 → 工作面 → 本页，本页在最后（`handleSurfaceEscape`）。
- **hash。** `#settings` 与 `#settings/<section>` 可深链，未知节名落回 General；换组用 `history.replaceState`，所以浏览器的后退不是在组之间走而是退出这一页（S2 / S4）。
- **窄屏。** < 1024 导航折成顶部下拉、右列单列、命中区 44；1440 下左列在场、命中区 32（T1 / T2）。
- **行的解剖。** 与既有 `.settings-row` 完全相同：标题 + 一句作用域或后果 + 右侧单一控件，没有第二套解剖。

## 4. 五个组

| 组 | 收纳 | 说明 |
|---|---|---|
| General | Connection（原 `settings-form` + `credential-form`，字段与请求一字未改）· New sessions 默认 File writes · Data（只读） | New sessions 写的是 Home 已有的 `state.homePermissionMode`，不是第二份状态（G3）；Data 的数据目录行如实写「Not reported」，因为 `GET /runtime-info` 不报路径（G2，后端请求见 §9） |
| Appearance | Scheme · Skin · Text size · Code font · Reduced motion | 四行下方各一块真实产品片段预览（一条 `flowRow` + 一段带 diff 的代码块），随选择即时变化 |
| Keyboard | 六行只读表（`j`/`↓` · `k`/`↑` · `Enter`/`o` · composer 的 `Enter` · `Escape` · Cancel run 无键）+ 一行 Planned「Rebind a key」 | 「Cancel run 没有快捷键」是如实写出来的一行，不是省略 |
| Runtime | Overview（现有 `#runtime-control-settings` + `#runtime-context-summary`）· Composition · Instructions & context · Capabilities & connections · Permissions & environment | 按 [§3.1](../../../design/frontend-layering-spec.md) 的意图分组；后四节是 WK11 的挂载点（§10）。Models 只读 + 「Edit in General」（R2 / R3） |
| Developer | Extensions 生命周期 · runtime-info · `PLANNED_CAPABILITIES` 八行 | Planned 行零控件（D1） |

**搜索**只过滤本页的行：命中的组留下、其余组整组退场、说明句也参与匹配、无命中时说出来（Q1–Q3）。组合中的中间态不当作查询词，组合结束才过滤（K3）。

## 5. 外观自定义（交付 3）与它的边界

- **一个根变量带三档字号。** `--text-scale` 乘进八个字号角色与五处原本写死的显示级字号；13.0 / 14 / 16.0 px 实测（A2）。命中区、间距与行高不随字号缩放。
- **skin 只换 Tier S。** `gray-steel` 以 `[data-skin]` 的三个 tier:S 块住进 `styles.css`——治理位置不变（`hex` 只在 tier:S 内，`lint-colors` 通过）。**没有把它做成第二份 CSS 文件去请 allowlist**：FN-29 说未进 STATIC 的文件不算用户可选能力，而把一份 token 集写进已有的 tier:S 是同一件事的更短做法。
- **用户 token 集是一个色阶，不是一段 CSS。** `validateSkinTokens` 与 `tools/lint-colors.mjs` 同源：只认既有 Tier S token 名（24 个颜色 + 5 个数值），颜色只认 hex；`url(` / `expression` / `@` / `</` / 转义先于逐行解析被拒；半套色阶被拒并列出缺名；一次只收一个块。不通过时逐行指出并整体拒绝，一个字节都不落地（A7 与 14 条单测）。
- **代码字体只是字体名。** 通过 `--font-mono` 前缀落地，带分号或括号的输入被拒且旧值不动（A3）；不下载任何外部字体。
- **Reduced motion 的强制档**只停动效，不改任何状态词与合法动作（A4 / T4）。
- **本设备。** 键 `cw:prefs:<hash(origin)>`，读写各裹 try/catch，坏值读成默认（单测）。服务器一侧没有多出任何外观字段（A10）。首帧之前应用：`<body>` 进入文档的那一刻属性已在场（N1–N3）。

## 6. 消融表（WK-47：删掉之后失去什么判断）

| 组 / 行 | 删掉后失去的判断 | 结论 |
|---|---|---|
| 页壳（对话框 → 页） | 「改设置」变回一件必须先结束才能回去做别的事的阻断步骤；Runtime 五节没有落处（WK11 无处可放） | 留 |
| 左列导航 + 组 | 五组竖排后，Runtime 与 Developer 的边界只能靠阅读顺序猜 | 留 |
| 搜索框 | 二十余行分在五组，找一行只能逐组翻 | 留 |
| hash 深链 | 无法把「去这一节」写进任何回执、文档或工单 | 留 |
| Back 按钮（Escape 之外） | 只有键盘用户回得去 | 留 |
| General › Connection | 唯一能改 provider / model / key 的地方 | 留 |
| General › New sessions | 只能在 composer 那条安静的行里改，且那一行只在 Home 出现 | 留 |
| General › This session（既有 `#session-settings`） | 本会话的写入权限只剩连接卡与 composer 两个入口；且「下次会话的默认」与「这一次的实际」并列时才看得出两者不是一回事 | 留（工单第 2 条未列，作为既有能力保留，请 Fable 裁） |
| General › Data | 无法回答「这个工作区的数据落在哪、主机是什么状态」；数据目录一行同时是后端缺口的记号 | 留 |
| Appearance › Scheme | 只能跟随系统 | 留 |
| Appearance › Skin | 色阶不可换；WK7 的「skin 可整体替换」在产品内无出口 | 留 |
| Appearance › 用户 token 集 | WK-78 (4) 的「更开放」全部落空，只剩两个预置 | 留 |
| Appearance › Text size | 视力与显示密度的差异无处可调，只能靠浏览器缩放（那会一并改变布局断点） | 留 |
| Appearance › Code font | diff 与代码块的可读性不可调 | 留 |
| Appearance › Reduced motion | 系统未设 reduce 的人无法单独关掉本应用的动效 | 留 |
| **四块预览** | 单块预览已足以让人看见选择的后果；**四块的差别只是「就在这一行下面」**。删到一块（置于 Appearance 顶部）不失去任何判断，只失去邻接 | **按工单留四块**，并把这条差异明写在这里交 Fable 裁 |
| Reduced motion 行下的预览 | 静态截图表达不了「有没有过渡」，那块预览与上一块一模一样却不随该行变化 | **删**（该行只留说明句） |
| Keyboard 只读表 | 键的存在只能靠试；「Cancel run 没有键」这一事实无处可读 | 留 |
| Keyboard › Rebind（Planned 行） | 「不能重绑定」与「还没做重绑定」混为一谈 | 留（inert 文字） |
| Runtime › Overview | 现有 runtime 入口与 context 摘要失去落处 | 留 |
| Runtime › 其余四节 | WK11 没有约定好的节位，会各自新造一套分组 | 留（每节一句意图 + 组级一句现状） |
| Runtime › 每节各写一遍「这些读数今天在 Runtime 模块里」 | 同一句重复三遍，不增加任何判断 | **删**，改为组标题下写一次（D-19） |
| Runtime › Models | 「下一次 Run 用哪个模型」在 Runtime 组里无处可读；有了它又必须防止两处编辑 | 留（只读 + 指回 General） |
| Developer 三块 | extension 生命周期、host 事实与未支持能力清单全部失去落处 | 留 |
| 顶带在本页保留 capability badge / 工作面按钮 | 从设置还能再走回设置；且工作面会浮在本页之上 | **删**（本页在场时收起，见 FE-T10 (g)） |

## 7. text-sweep 增量

### 7.1 删

| # | 字符串 | 位置 | 去掉后失去的判断 | 结果 |
|---|---|---|---|---|
| D-19 | `These readings are in the Runtime module today; this page does not yet organise them.`（每节一遍，共三遍） | Runtime 组的三个挂载节 | 无。同一句在组标题下写一次即可 | ✅ 删，改为组级一句 |
| D-20 | `Workspace`（eyebrow）与 `Model & connection` / `Runtime resources` / `Runtime & extensions` 三个旧节标题 | 原 `<dialog>` | 无。组名与节标题已经说了这是什么面；三个旧标题被 General / Runtime / Developer 的组名与节名取代 | ✅ 随对话框删除 |

### 7.2 单词化 / 改名

| # | 原可见文字 | 新可见文字 | accessible name | 结果 |
|---|---|---|---|---|
| W-22 | `Close settings`（对话框的关闭按钮） | `Back` | `Back`（可见即完整） | ✅ 页面的出口是「回到刚才那里」，不是「关掉一层」；IC-1 明写 Back 与 Close 不能共用一个箭头，这里干脆用文字 |

### 7.3 新增字符串与它们承担的事实（38 条）

| 字符串 | 承担 |
|---|---|
| `Settings` / `General` / `Appearance` / `Keyboard` / `Runtime` / `Developer` | **对象名**：五个组按对象而非功能营销命名（WK-78 (2)） |
| `Search settings…`（占位符） | **动作指令**，不问候（文案体例 §2） |
| `No setting matches “…”.` | **条件**：无命中不是空白页 |
| `Connection` / `New sessions` / `Data` / `Overview` / `Composition` / `Instructions & context` / `Capabilities & connections` / `Permissions & environment` / `Extensions` / `Runtime info` / `Planned` | **对象名**：节名即它收纳的对象 |
| `File writes` + `The value a session starts with. It applies when the session is created; changing it never changes a session that already exists.` | **作用域与后果**：默认值不追改已有会话 |
| `Data directory` + `The runtime does not report its path over the API, so this page cannot state it. It is the --data-dir the host was started with.` + `Not reported` | **缺口如实**（FN-28：缺数据 ≠ 空） |
| `Adapter` / `Host state` / `Tools` + 各自一句 | **事实来源**：读的是主机自己的报告 |
| `Read from the host's own report. Nothing here is editable from the browser.` | **作用域**：这一块只读 |
| `Scheme` + `Light, dark, or whatever this device is set to. It is kept on this device and never sent to the host.` | **作用域**：只在本设备，不进 runtime-state |
| `Skin` + `Swaps the colour scale only. State words, legal actions and what a control does stay exactly as they are.` | **后果边界**（FN-09 / 10） |
| `Slate` / `Gray steel` / `Your tokens` | **对象名**：两个预置与一组自带 token |
| `Paste one Tier S scale: the existing token names, hex colours only. One set serves both Light and Dark. Nothing else is read from this box — no CSS rule, no URL, no font.` | **条件与边界**（FN-11：不是任意 CSS 注入口） |
| `Apply tokens` / `Remove` / `Applied on this device.` | **动作对象化**与**回执** |
| `A token set of your own is applied on this device.` / `A token set is stored but not applied.` / `No token set has been accepted yet.` | **请求值 ≠ 有效值**（FN-14 的 Requested 与 Effective 两层） |
| `The token set was not applied. N problems:` + 每行 `Line n: … — …` | **拒绝的理由逐行可查**，不是一句「格式错误」 |
| `--x is not a Tier S token name.` / `Only a hex colour is accepted here.` / `This token is an r, g, b triple.` / `This token is a number between 0 and 1.` / `A skin is a whole scale. Missing: …` / `Paste one block at a time; this text holds more than one.` / `url( is not a colour` 等 | **每一种不通过各有自己的话** |
| `Text size` + `Scales every text role together. Hit regions, spacing and keyboard order do not change with it.` | **后果边界**：字号不改命中区 |
| `Small` / `Medium` / `Large` | **档位名** |
| `Code font` + `A monospaced family already installed on this device. Nothing is downloaded, and an unavailable name falls back to the default stack.` | **条件**：不加载外部字体 |
| `A font family name only: letters, digits, spaces, quotes and commas.` | **拒绝的理由** |
| `Reduced motion` + `Always reduce stops transitions and animations. Nothing a control does changes with it.` | **后果边界**（FN-27：动效变更不改权威状态） |
| `Follow system` / `Always reduce` | **档位名** |
| `Preview` | **对象名**：下面那块是产品片段不是装饰 |
| `The keys this build already answers to. They are the same commands the controls raise, through the same admission.` | **同一入口同一准入**（FN-05 / 17） |
| `Keys` / `What it does` | 表头 |
| 五条快捷键说明句 | **后果**：每个键做什么、不做什么 |
| `Cancel run` + `No key. Cancelling a run is a control in the composer, so it is never one keystroke away by accident.` | **缺席如实 + 理由** |
| `Rebind a key` + `No command registry records which commands may be bound, so a rebinding could not be checked against the admission the command actually has.` + `Planned` | **能力边界**（WK-27） |
| `These readings are in the Runtime module today. This page names the groups they will be organised into; it does not organise them yet.` | **现状如实**：预留节位不冒充已实现 |
| Runtime 四节各一句意图（`Choosing a profile is not exposing a resource, and neither is a verified Work Expert.` 等） | **必须解释的区别**（§3.1 表第三列） |
| `Policy, model and provider, budgets and sandbox facts belong here. The connection below is the same record General edits — a run freezes the value it was admitted with, and this reading is of the next run, not of one already going.` | **四层里的 Effective 与 Bound 之别**（FN-14 / 16） |
| `Edit in General` | **单一编辑处**（WK-78 (5)） |
| `A runtime is composed for a session. Open a session to read what its next run would carry.` | **条件**：没有会话时不是「没有 runtime」 |
| `Back` | **目的地名**（IC-1：Back 与 Close 不共用一个符号） |

## 8. 验证

### 8.1 命令与结果（作者验证）

```
npm --prefix app ci                 # 0 vulnerabilities
npm --prefix app test               # 204/204（基线 190 + 本单新增 14）
node tools/lint-colors.mjs          # ok（15 files · 字面量与高度层两项）
node tools/contrast-report.mjs      # 无「低于门槛」
git diff -- app/server              # 空
```

服务：`node app/server/index.mjs --data-dir /private/tmp/se-agent-wk12-data --port 8881`（全新仓外数据目录，fake provider）。播种只经 `/api/v5`（`POST /projects`、`POST /sessions`），不直接写 store。

七支核对脚本，共 **55 条全部通过，页内异常 0，4xx 0**：

| 脚本 | 通过 | 覆盖 |
|---|---|---|
| `checks-shell.mjs` | 12/12 | 页而非模态、hash 深链、Back 与 Escape、焦点归还、导航 ↑/↓ 与 Enter、roving tabindex、IME、列表键静默、搜索三态 |
| `checks-appearance.mjs` | 11/11 | 五行与四块预览、Scheme、三档字号、Code font 接受与拒绝、强制 reduced motion、gray-steel、请求值 ≠ 有效值、用户 token 集拒绝与接受、持久化、服务器无外观字段 |
| `checks-noflash.mjs` | 3/3 | 无偏好与有偏好两种加载下，`<body>` 进场时根元素上的外观属性 |
| `checks-groups.mjs` | 13/13 | General / Runtime / Developer 三组内容 + 四条既有路径回归（provider 保存、key 保存与删除、extension lifecycle、Bind to session） |
| `checks-fe-t09.mjs` | 4/4 | 见 §8.3 |
| `checks-fe-t10.mjs` | 7/7 | 见 §8.3 |
| `shots.mjs` | 5/5 | 1440 / 390 / 200 % 的几何与命中区、强制 reduced motion、18 张截图 |

**夹具说明（如实记）**：本机的 headless Chrome 在一支脚本跑到二十余次交互之后，**浏览器进程**（不是渲染进程）会陷入 run-loop 自旋，CDP 回包要几分钟才到；`sample` 取样确认渲染进程主线程当时停在 `mach_msg`（空闲等 IPC），页面自身没有在循环，且解开之后所有断言仍然通过。这是夹具与环境的问题，不是产品的。两处因此调整：核对拆成七支短脚本，各自开一个浏览器；IME 一节改用 composition 与 `keyCode 229` 的 DOM 事件驱动（产品的两个守卫读的正是 `isComposing` 与 `keyCode === 229`），而不是 CDP 的 IME 通道。真实输入法的手动验证列在 §11 未检项。

### 8.2 同条件截图（`evidence/wk12/`）

每组一张（1440 浅宗）：`group-general` · `group-appearance` · `group-keyboard` · `group-runtime` · `group-developer`。
预览前后：`preview-slate` · `preview-gray-steel` · `preview-user-tokens` · `preview-user-tokens-rejected`（同一条 Chat Flow 行与同一段 diff，只有色阶变）。
条件矩阵：`appearance-1440-dark` · `appearance-390-light` · `appearance-390-dark` · `appearance-text-small/medium/large-1440-light` · `appearance-200pct-light` · `appearance-reduced-motion-1440-light` · `group-general-390-light`。
几何（`shots.json`）：1440 与 1440 深宗横向溢出 0、左列在场、tab 命中 32；390 浅 / 深与 200 % 缩放横向溢出 0、导航折成下拉、命中 44；根字号 13.006 / 14 / 16.002 px。

### 8.3 FE-T09 / FE-T10

**FE-T09**（条款 09 / 10 / 27 / 29）。九种条件：默认（Slate · Medium · 1440 · 浅）、`gray-steel`、用户 token 集、字号 Large、字号 Small、强制 reduced motion、深宗、390 窄屏、200 % 缩放。每种条件下取一份签名：Settings 每一行的标题、说明句、控件种类与可用性、每个按钮的可及名与可用性、Planned 行、快捷键行；以及 Home 的三个计数、Planned 行、状态词与 composer 的合法动作。

| 断言 | 结果 |
|---|---|
| (a) 九种条件下 Settings 的行、说明、控件种类、可用性与 Planned 行一字不差 | 通过（差异集为空） |
| (b) 九种条件下 Home 的三个计数、状态词与合法动作一字不差 | 通过 |
| (c) 每种条件下焦点仍可见（环、边框色或外发光与失焦时不同）、未被悬浮层遮住、命中区不低于本地下限（桌面 32 / 窄屏 44） | 通过 |
| (d) 每种条件下横向不溢出 | 通过 |

**密度与模块顺序两项自定义本轮未实现**（frontend-layering-spec §3 把它们列为「可以」，无消费者前不排单），因此本反例以 skin、字号、宗、窄屏、缩放、强制 reduced motion 六种变更代替，如实记在 `checks-fe-t09.json` 的 `note` 里。

**FE-T10**（条款 26 / 27）。

| 断言 | 结果 |
|---|---|
| (a) 只用 Tab 走这一页 26 步：每个落脚点都有可及名，没有一个被悬浮层遮住，没有高度不足的落脚点 | 通过 |
| (b) Tab 序覆盖搜索、导航与右列控件；导航只留当前项一个落脚点（roving tabindex） | 通过 |
| (c) 展开（Connection options）用 Enter 打开，焦点留在 summary 上，展开出的两行各有标题与关联标签 | 通过 |
| (d) dialog（New project）由键盘打开，焦点进到里面且有名字，Escape 关掉后不留开着的 dialog | 通过 |
| (e) 键盘换会话：Settings 让位，hash 离开设置，标题换成会话，焦点按既有落点交给会话标题 | 通过（**这一条最初是失败的，见 §9 的修正**） |
| (f) IME 组合期间的 Enter / Escape / `j` 都不触发命令：不发送、不关层、不挪焦点 | 通过 |
| (g) 进这一页时悬浮工作面收起，没有一层浮在设置之上；焦点落在 Back | 通过 |

## 9. 越界改动、修正与回退记录

| 项 | 内容 | 理由 | 回退 |
|---|---|---|---|
| `closeSurface()` 增加 `{ restoreFocus }` 选项 | 与 `closeNavigation` 同形 | 进 Settings 页时若照旧把焦点还给 `#show-surface-button`，那个按钮下一刻就被这一页藏起来，焦点掉到 body | 删该选项即恢复旧签名，唯一调用点在 `openSettings` |
| `selectSession` / `goHome` 开头调用 `closeSettings({ restoreFocus: false })` | **修正 FE-T10 (e) 发现的真实缺陷**：侧栏在本页在场时是可点的（这正是页面而非模态的意思），原先点会话后底下换好了会话，顶带却还写着 Settings | 页面承载的必然后果，不加这一句就是一个会骗人的顶带 | 删这两行即回到缺陷状态 |
| `renderChatHeader` 兼管 `#settings-page` / `#conversation-body` 的显隐 | 每条渲染路径的结论一致，避免两个函数各写一半 | — | — |
| 五处写死的显示级字号改为 `calc(N * var(--text-scale))` | 不改的话放大字号后这五处独自不动 | — | 改回字面量即可 |
| `index.html` 的 `<head>` 内联同步脚本 | 首帧之前应用偏好的唯一做法：模块脚本一律 defer，来不及 | 应用逻辑只此一份，settings-view 改动时复用同一函数；schema 与校验都在 settings-view | 删该 `<script>` 即回到「先默认后跳变」 |
| **未发生**：临时改 `app/server/index.mjs` | 本单没有新增 web 模块，`gray-steel` 以 tier:S 块住进已有的 `styles.css` | — | — |

**静态 allowlist 请求：无。** 本单不新增任何 web 模块，也不请求 `app/web/skins/*.css` 的路径。

**后端请求（登记给 Astra，非本单实现）**：`GET /runtime-info` 目前不报数据目录，Settings › General › Data 因此只能写「Not reported」；本设备偏好的 localStorage 键也只能由 `location.origin` 派生，而不是由数据目录派生（同一端口先后挂两个数据目录会共用一份偏好）。建议在 `runtime-info` 增加一个稳定的工作区标识（数据目录的 hash 即可，不必是路径本身）。

**既有缺陷（非本单造成，已登记不修）**：`Bind to session` 按下后 `focusBindingEntry()` 早于 `loadProjectWork()` 返回，那一刻绑定面里还没有可聚焦的字段，焦点留在 body（`checks-groups` 的 X5b 逐条记下了两个时刻）。对话框版本是同一段代码同一顺序（`git show HEAD:app/web/app.mjs` 第 1956–1960 行）。工单要求绑定入口「行为不变」，故本单不动，交 WO-WK11 一并处理。

## 10. 留给 WK11 的挂载点

| DOM | `data-wk11-mount` | 现在放着什么 |
|---|---|---|
| `#runtime-control-settings` + `#runtime-control-entry` + `#runtime-context-summary` | `overview` | 现有 runtime 入口与上下文摘要；无会话时一句 `A runtime is composed for a session.` |
| `#settings-runtime-composition` | `composition` | 节标题 + 一句必须解释的区别 |
| `#settings-runtime-instructions` | `instructions-and-context` | 同上 |
| `#settings-runtime-capabilities` | `capabilities-and-connections` | 同上 |
| `#settings-runtime-permissions` | `permissions-and-environment` | Models 只读摘要 + `Edit in General` |

补充约定：组级现状句在 `<p class="settings-section-note">`，WK11 填实后删；`createSettingsPage` 的 `update({ config, info, session, active })` 已由 `createSettingsView` 推送，WK11 不必另开一路请求；本页的行只要带 `.settings-row` 就自动进搜索，不需要额外登记。

## 11. 未检项（分列）

| 项 | 状态 | 说明 |
|---|---|---|
| 触控 | 未检 | 命中区按几何量到 44（窄屏）与 32（桌面），但没有在真实触摸屏上试过手势与长按 |
| 读屏 | 未检 | 可及名、`role=tab` / `tabpanel` 关系、`aria-selected`、`aria-current` 与焦点落点按 DOM 断言核对；未经 VoiceOver / NVDA 实听 |
| 真实输入法 | 未检 | IME 一节由 composition 与 `keyCode 229` 的 DOM 事件驱动（产品守卫读的正是这两项）；未用真实中文输入法手打 |
| 真实 provider | 未检 | 全程 fake provider；X2 的 key 保存与删除走的是真实端点与一把一次性假 key，没有发出任何模型请求 |
| 用户 skin 的对比度 | 未检 | 校验只保证「是一组合法的 Tier S token」，不保证对比度达标；`tools/contrast-report.mjs` 只覆盖两个预置 skin。是否要在接受前跑一遍对比度并给出警告（而不是拒绝），留 Fable 裁 |
| 浏览器后退键 | 部分 | hash 路由用 `location.hash` 与 `hashchange`；换组用 `replaceState` 所以后退是退出这一页。多次进出后的历史栈没有逐步核对 |
| 桌面壳 | 未检 | 菜单栏与壳位按 WK-30/31 仍为预留，本单未画 |

## 12. 待裁项（交 Fable）

1. **四块预览还是一块。** 工单第 3 条写「每行下方一块」，参考图也是逐行放；但四块内容一模一样，消融表里这条只失去邻接。
2. **General › This session 行。** 工单第 2 条只列了 Connection / New sessions / Data；本单保留了既有的「这一次会话的 File writes」，因为删掉等于删一项既有能力，且它与「新会话的默认」并列时正好说清两者不是一回事。
3. **用户 skin 的对比度**是否在接受前给警告（见 §11）。

## 13. Fable 复核（2026-09-09）

独立重跑 `7599a91`：`npm --prefix app test` 204/204，`lint-colors` ok，`git diff -- app/server app/runtime app/core app/extensions runtime-view.mjs home-view.mjs` 为空。目视 General / Appearance / Runtime 1440 浅宗与 General 390 深宗：页壳、分组导航、行解剖（标题 + 一句作用域 / 后果 + 右侧控件）、Ask / Write / Read 分段、Scheme 与 Skin 预览、Runtime 五个意图分组与挂载点、Models 只读 + Edit in General、窄屏顶部下拉，均符合 WK-78 与 spec §4.1 / §6。

裁定（WK-87）：
1. 四块预览按消融收为一块，置于 Appearance 顶部，Scheme / Skin / Text size / Code font 共用；随 WK11 同一 writer 实施，本单不返工。
2. 保留 General › This session 行：与 New sessions 默认并列正是"这一次 vs 下次"的区别，承重成立。
3. Settings 打开时点击侧栏会话须先离开页面：已修，接受；FE-T10 应保留该反例。
4. 用户 skin 对比度：接受前按 `contrast-report.mjs` 同一对照对计算并**警告**，不阻止；随 WK11 实施。
5. 首帧偏好脚本为内联 `<script>`：当前无 CSP，接受；将来加 CSP 时以 nonce 或外置模块处理，登记于 spec FN-29 备注。
6. 后端请求 BE-16：`GET /runtime-info` 报告数据目录或稳定工作区标识，供 Data 行与偏好键使用。
7. 交 Astra 合流；独验项：FE-T09 / T10、既有 Settings 回归（provider 保存、key 保存 / 删除、extension lifecycle、Bind to session）。
