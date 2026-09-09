# 交付 WO-CCI-01 · PropertyRow：modified · reset · provenance（Claude Opus，2026-09-10）

工单 [WO-CCI-01](work-orders/WO-CCI-01-property-row.md)。裁定来源：[WK-150 / WK-149 (c) / WK-146 / WK-143](intake-round-3.md)（§4at / §4as / §4ar）、[atlas Control Grammar 段 · Structure 行](../../../design/atlas/README.md)、[atlas Projection Grammar 段](../../../design/atlas/README.md)（WK-139 (c)「投影不得创造事实」）、[EX-PG1 §3](explore/ex-pg1-projection-inventory.md)、`settings-view.mjs` 既有注释里的 FN-14 / FN-26 / FN-27 / FN-28 与 WK-27 / WK-78 / WK-87 / WK-114 / WK-122 / WK-129。

## 1. 固定 SHA 与工作条件

| 项 | 值 |
|---|---|
| 基线 | `6b8656e`（`main`，"docs: move the app/web writer and order the first CC-I slice"） |
| 工作树 | `/private/tmp/se-agent-cci1` |
| 分支 | `claude/cci1-property-row`（未合流、未 rebase、未 push） |
| 端口 / 数据目录 | 8930 / `/private/tmp/se-agent-cci1-data`（全新、仓外；未读取任何凭据文件） |
| 依赖 | 未新增。工作树里 `app/node_modules` 是指向 `~/Projects/Courtwork/app/node_modules` 的符号链接（同版本 `pi-*` 0.85.1），只为让全量测试跑得起来；未 add、未提交 |

## 2. 受影响文件

| 文件 | 改动 |
|---|---|
| `app/web/settings-view.mjs` | `PREFERENCE_DEFAULTS` 改为导出；新增 `PROVENANCE_WORDS` / `preferenceProvenance()` / `createPreferenceGovernance()` / `propertyFoot()`；`settingsRow` 扩为 PropertyRow 并导出；`createSettingsView` 内新增 `appearanceStatus` 与 `governance`，`savePrefs` 末尾调 `governance.sync()`；`renderAppearance` 开头 `governance.begin()` 并给六行加 `governed(property)` |
| `app/web/styles.css` | 新增 `.property-foot` / `.property-provenance` / `.property-reset` / `.settings-appearance-status:empty` 四条（tier:U 区，无字面色、无新 token、无新材质） |
| `app/tests/settings-preferences.test.mjs` | 新增 10 条 CC-I 断言与一份最小 DOM（`RowNode` / `RowDocument`，与 `home-presentation.test.mjs` 的 TinyDom 同路子） |
| 本文件 | 交付 |

写权外的文件一处未动：`git diff --stat` 只有上述三个源文件。

## 3. `settingsRow` 的新签名与缝切在哪里

```js
export function settingsRow(title, help, control, { id, property, prefs, governance } = {})
```

只多一个语义参数 `property`（`PREFERENCE_DEFAULTS` 的键），另外两个是它需要的两条线：`prefs` 是**画这一帧时的生效值**，`governance` 是页面那一份注册台。行不持有 prefs、不自己写存储、不知道 `cw:prefs` 存在。

调用点因此只多一个词。`renderAppearance` 里：

```js
const governed = (property) => ({ property, prefs, governance });
…
settingsRow("Theme", "…", scheme, governed("scheme")),
settingsRow("Text size", "…", textSize, governed("textSize")),
settingsRow("Code font", "…", codeFont, governed("codeFont")),
settingsRow("Reduced motion", "…", motion, governed("motion")),
settingsRow("Home layout", "…", homeLayout, governed("homeLayout")),
settingsRow("Palette", "…", skin, governed("skin")),   // Advanced 内
```

**为什么切在这里**：`property` 的有无就是"这一行有没有 owner 默认值"，也就是有没有 provenance 可言。没有它的行走同一个函数、走同一条早退（`if (!property || !Object.hasOwn(PREFERENCE_DEFAULTS, property)) return row;`），DOM 一个字都不多——这是 WK-139 (c)「投影不得创造事实」在这一片的形态。实测：Settings 全页 29 个 `.settings-row`，长出 `.property-foot` 的正好 6 个（§7）。`readOnlyRow`、`New sessions` 的 File access、Runtime 组、Planned 行、Keyboard 表全部零改动，一处调用点都没有改。

为什么 `governance` 是一个对象而不是一个 `onReset` 回调：复位需要**重画之后**才能把焦点放回控件，而重画之后行是新的 DOM。注册台让每一行把自己的 `sync` 与 `focus` 交上去，重画时 `begin()` 清表，复位时按 `property` 找回新那一行。`createPreferenceGovernance` 是模块级导出的纯装配，因此复位这条链（保存 → 重画 → 聚焦 → 播报）可以在测试里整条走一遍，而不必起一个真页面。

## 4. modified 与 provenance 怎么判定

判定只有一处，是**生效值与 owner 默认值的字面比较**：

```js
export const PROVENANCE_WORDS = ["Default", "Changed on this device"];
export function preferenceProvenance(prefs, property) {
  if (!prefs || !Object.hasOwn(PREFERENCE_DEFAULTS, property)) return null;
  return prefs[property] === PREFERENCE_DEFAULTS[property] ? PROVENANCE_WORDS[0] : PROVENANCE_WORDS[1];
}
```

- **词表闭集，今日两个词**。没有 Expert policy、没有组织策略、没有继承链：本设备偏好的 owner 只有这台设备自己，造第三个来源词就是投影创造事实（WK-150 / WK-139 (c)）。表外的键返回 `null` 而不是空字符串——缺失是显式的 `null`（Projection Grammar 第 ② 条）。
- **modified 就是 provenance ≠ `Default`**，没有第二处判断。指示器是那个词本身，不另画色点，不换整行的背景或边框（FN-28：材质表达层次不表达状态）。`data-modified="true|false"` 只是给测试与样式的把手，不承载颜色语义。
- **生效值不是草稿值（FN-14）**。`preferenceProvenance` 的入参只有 `prefs`；`skinDraft` 在这段代码里根本不出现（有一条断言盯着这件事）。Palette 的 select 选到 `Custom tokens` 而没有 Apply 时，`savePrefs({ skin: "custom" })` 只在 `prefs.customSkin` 非空时才发生，因此**没有存过 token 集时选 custom，provenance 仍是 `Default`**；真机实测见 §7。
- **Code font 的两阶段 commit（WK-149 (c)）**。输入框里的编辑不进 `prefs`，所以 `Default`；`commitFont()` 通过 `CODE_FONT_PATTERN` 并 `savePrefs` 之后才翻为 `Changed on this device`；校验失败的那一支在写 prefs **之前** `return`，既有的错误行照常出现，provenance 一字不改。实测 `{"uncommitted":"Default","committed":"Changed on this device","afterInvalid":"Changed on this device","errorShown":true}`。
- **刷新走哪条路**：普通改值只调 `governance.sync()` 更新那一行的脚，**不重画控件**——重建分段控件会把焦点从人正在用的那个控件上夺走（本文件 `render()` 处已有的同一条 FN-27）。只有复位重画。

## 5. Reset 的行为

- **不加确认对话框**。可逆的低风险操作（WK-122 undo over confirmation；WK-140 `high-risk ≠ confirm dialog` 的反面）。全仓 `confirm(` 仍是零命中，有断言盯住。
- **可达名字带属性名**：`aria-label="Reset Text size to default"`，可见文字仍是 `Reset` 且是可达名字的前缀（label-in-name）。
- **通道**：`apply(property, PREFERENCE_DEFAULTS[property])` → `savePrefs({ [property]: value })` → `writePreferences`。不绕过闭集校验，不直接碰 `cw:prefs`。
- **焦点**：保存 → `renderAppearance()` → 按 `property` 找回新行 → `focus()`。落点是控件本身；分段控件（`fieldset` 不可聚焦）的落点是**被选中的那个 radio**，也就是复位后默认值所在的那一格。行若住在 `Advanced` 里，先把那层 `<details>` 打开——`advanced.open = prefs.skin !== "slate"` 会在复位后把它关上，不打开就会把焦点送进一个看不见的控件。真机实测：复位 Text size 后 `activeElement` 是 `input[type=radio][value=medium][checked]`；复位 Palette 后是那个 `select`，且 Advanced 保持展开。
- **播报**：沿用页面既有的 `role="status"`（本文件 413 行探测结果那一处的同一机制），不新造 toast——它是一条状态不是一个决定（FN-26）。文字在重画**之后**才写入，读屏才会念到新插入的那一句。任何一次后续改值都会把它清空（`governance.sync()` 第一行）：那句话说的是上一个动作。

### 5.1 默认态：隐藏还是禁用 —— 选**隐藏**

理由：一个按不动的按钮要人先按一次才知道它不该被按，而 `Default` 这个词已经把"现在就是默认"说完了；这与本文件里 WK-27 / FN-28 反复执行的那一条同源（没有能力就不画控件，Memory 与 Planned 两节都是这么写的）。禁用态还会在 Appearance 六行里各留一个无后果的 Tab 停靠点。

代价是隐藏会带来行高变化，因此 `.property-foot` 的 `min-height` 钉在 `var(--control)`：复位的出现与消失都不挪动下面的行。见 §8 的取舍记录。

## 6. `customSkin` 的取舍

**不给它 property，不给它行，也不让它参与 Palette 行的判定。** Palette 行的 `property` 是 `skin`。

三条理由：① provenance 回答的是"这一项的**生效值**是否不同于 owner 默认值"，而生效的色阶就是 `prefs.skin`；一套存着但没应用的 token 集正是 FN-14 已经分开的"请求值 ≠ 有效值"那一侧。② 让 `customSkin` 非空就把 Palette 翻成 `Changed on this device`，是拿一条关于**存储**的事实去断言**色阶**——投影创造事实。③ 那件事已经有自己的话，就在 skin 编辑器里：`A token set is stored but not applied.` / `A token set of your own is applied on this device.`，不需要第二处说法。

因此 **Palette 的复位只把 `skin` 还原成 `slate`，存着的 token 集原封不动**——复位是把这一项还原成它的默认值，不是删数据；删是编辑器里那个 `Remove`。同时 `skinDraft` 一并回到默认，否则 select 还停在 `Custom tokens` 上，界面会比事实更旧。

## 7. 测试、lint 与真机

### 7.1 全量测试

```
$ cd app && node --test tests/*.test.mjs ../tests/*.test.mjs
ℹ tests 456
ℹ suites 0
ℹ pass 456
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 58364.978583
```

基线是 446（本单前 `settings-preferences.test.mjs` 有 17 条，现 27 条，新增 10 条）。工单里写的"约 431"偏低，以实测为准。

新增的 10 条：

```
✔ CC-I · provenance 的词表今日是闭集的两个词，判定是与 owner 默认值的字面比较
✔ CC-I · 默认态：provenance 是 Default，复位不呈现
✔ CC-I · 改一项之后翻为 Changed on this device，复位可用且可达名字带属性名
✔ CC-I · 复位：值回默认、provenance 回 Default、焦点落在本行控件上、有一条可播报的回执
✔ CC-I · 复位之后的下一次改值作废那条回执，回执不是一条会留在页面上的旧话
✔ CC-I · 没有 owner 默认值的行一个字都不多：同一个函数，不长出这三样
✔ CC-I · provenance 挂在控件上，读屏听得到它而不是一段孤立的文字
✔ CC-I · Code font：未提交的编辑不是 modified，提交后才是，校验失败不改 provenance
✔ CC-I · Palette 选了 Custom tokens 但没 Apply 不算 changed：provenance 读生效值不读草稿
✔ CC-I · 这一片没有引入任何数值控件：Value 类仍是空集
```

### 7.2 Lint

```
$ node tools/lint-colors.mjs
lint-colors: ok (26 files · 字面量与高度层两项)

$ node tools/lint-materials.mjs
lint-materials: ok (3 files · 登记类名与 reduced-transparency 回退两项)

$ node tools/check-doc-links.mjs
  "pass": true,
  "documents": 574,
  "checked": 2593,
  "problems": []
```

### 7.3 真机（8930 / `/private/tmp/se-agent-cci1-data`）

```
$ node server/index.mjs --port 8930 --data-dir /private/tmp/se-agent-cci1-data
http://127.0.0.1:8930
```

**1440 × 900，浅**：六行各在控件下方多一条脚。默认态整页只多六个 `Default`，读起来是一条更弱的元数据行（`--text-meta` / `--muted-strong`），首屏节奏没有崩：预览块 + Theme + Text size 仍在第一屏内，Code font 起于第二屏上沿（与本单前相同的分屏位置）。改一项后同一行右端出现 `Reset`（`.text-button`，accent ink），左右对齐到行的两个边界，与上方控件共用右边界。

**1440 × 900，深**：provenance 与 Reset 都取既有 role，深色下 `--muted-strong` 与 `--accent-ink` 对比正常；没有新增任何着色，`data-modified` 不参与取色。

**390 × 844，浅/深**：`.settings-row` 落成单列，脚横跨整行贴在 segmented 控件下方，provenance 左、Reset 右。触控档下 `--control` 是 44，既有的 `@media (max-width: 1023px) .settings-row button { min-height: 44px }` 直接把 Reset 的命中区拉到 44——不需要为它写第二条规则。代价是默认态的脚也占 44 高（钉死高度换来的零位移），六行合计约 264px 的留白，读起来偏松但与这一档本来的触控密度一致；见 §8。

**键盘**：Tab 序是 标题/控件 → Reset（仅 modified 时存在）→ 下一行。复位后焦点实测落在本行控件上，`document.activeElement` 为 `input[type=radio][value=medium]`（Text size）与 `select`（Palette），不掉回 body；`role="status"` 的那一行拿到 `Text size reset to default.` / `Palette reset to default.`。

**逐条实测（浏览器 console，真页面）**：

```
六行注册：["scheme","textSize","codeFont","motion","homeLayout","skin"]
全页 .settings-row 29 个，其中带 .property-foot 的 6 个，Appearance 之外 0 个
Palette 选 custom 未 Apply → "Default"；应用 gray-steel → "Changed on this device"
复位 Palette → {prov:"Default", activeTag:"SELECT", advOpen:true, selValue:"slate", dataSkin:null}
复位 Text size → {prov:"Default", modified:"false", resetHidden:true, active:radio[medium] }
Code font → {uncommitted:"Default", committed:"Changed on this device", afterInvalid:"Changed on this device", errorShown:true}
```

## 8. 本片明确**没有**做的事

- **没有任何数值控件**：无 slider、无 `input[type=range|number]`、无 `<progress>` / `<meter>` / `role="meter"` / `aria-valuenow`。**Value 类今日仍是空集**（WK-146 空集守恒），有一条断言同时扫 `settings-view.mjs` 与 `styles.css` 盯住它；`tools/lint-interaction.mjs`（WO-PG-01）的登记表在这一片之后仍应为空。
- 没有 Reset all、没有偏好导出/导入。
- 没有碰 `homeModuleBand`（它是 Home 写的同一条通道，不是 Appearance 上的一个控件），没有碰 `PREFERENCE_DEFAULTS` / `PREFERENCE_VALUES` / `cw:prefs` / `readPreferences` / `writePreferences` 的语义、默认值、闭集或存储通道。
- 没有新 token、没有新 elevation、没有新材质、没有 blur、没有第三个 element builder（只用 `el()`）、没有新依赖。
- 没有做 CC-I 的另两件（applicability 推导 placement、两阶段 commit 的完整形态），也没有做两个 element builder 的收敛（EX-PG1 §3 Q1）。

## 9. 待裁定

1. **脚的高度：钉死（现状）还是随内容**。现在 `.property-foot { min-height: var(--control) }`，默认态与 modified 态等高，复位的出现与消失零位移；代价是每一个有 owner 默认值的行都恒定多出 32px（1440）/ 44px（390）。另一种做法是去掉 `min-height`，默认态压到一行元数据的高度（约 19px），改值时那一行长高 13 / 25px。**取舍**：恒定留白由所有人一直付，位移只在自己刚动过的那一行、只发生一次。本单选了零位移；若视觉四轴上认为 390 太松，改回来只需删一行 CSS。
2. **Reset 在默认态隐藏（现状）而非禁用**——理由见 §5.1，登记备裁。
3. **`customSkin` 不参与 Palette 行的判定，复位不删存着的 token 集**——理由见 §6，登记备裁。
4. **Settings 搜索的取值面变宽了**（非偏好语义，但是可见行为）：行的 `textContent` 现在含 provenance 与 `Reset`，因此搜 `changed on this device` 精确命中"我在这台设备上改过的行"（实测 1 行），搜 `reset` 命中全部 6 个可复位行，搜 `default` 命中 7 行（六行的脚 + 一行本来就含这个词的说明）。倾向保留：第一条是真有用的读法。若认为是噪声，把 `rowText` 改为排除 `.property-foot` 即可。
5. **第三个 provenance 词的门槛**：今日两个词。真出现一个有 owner 的来源（组织策略、继承链、后端下发的默认值）之前不加词；`preferenceProvenance` 的返回值是闭集 `PROVENANCE_WORDS`，加词必须同时给出那条 owner 事实。

## 10. 工单与代码不符之处

- 工单 §6 的基线数字"约 431"偏低，实测基线 446、本单后 456。
- 工单 §1 的骨架把 `Validation state` 画在 `Control` 与 `Modified indicator` 之间。代码里 Code font 的错误行（`codeFontError`）**不是行的一部分**：它是 `appearance` 的一个兄弟节点，跟在 Code font 那一行**后面**（`settings-view.mjs` 的 `renderAppearance` 里 `settingsRow(…codeFont…)` 与 `codeFontError` 平列）。本单按工单要求"保持"，没有把它挪进行内——挪它会改 `applyFilter` 的 `ROW_SELECTOR` 命中面（错误行会跟着行一起被搜索隐藏/显示），那是另一笔账。因此实际解剖是 `Label / Description / Control / [Foot: Provenance · Reset]`，validation state 仍在行外。
- 工单 §0 说端口 8930、数据目录全新，但没提工作树里没有 `node_modules`：新建的隔离工作树跑不了全量测试，需要先接一份依赖（本单用符号链接，见 §1）。
