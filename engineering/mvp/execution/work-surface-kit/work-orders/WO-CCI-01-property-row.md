# WO-CCI-01 · PropertyRow：modified · reset · provenance（CC-I 第一片）

派单人 Fable，执行 `opus-wo-medium`，基线 main 见派单提示词。裁定 [WK-143 / WK-149 (c) / WK-150](../intake-round-3.md)，段落 [atlas Control Grammar · Structure](../../../../design/atlas/README.md)，现状 [EX-PG1 §3](../explore/ex-pg1-projection-inventory.md)。

**这一片要证明的事**：同一套 semantic schema（本设备偏好的默认值表）能不能稳定推导出一行 governed state editor——而不是又画一张好看的设置页。Inspector 与 setting form 的差别只有一处：**这个值现在是什么、它本来是什么、是谁把它改成现在这样的**。

## 0. 写权与红线

- 隔离工作树 `/private/tmp/se-agent-cci1`，分支 `claude/cci1-property-row`。端口 8930，数据目录 `/private/tmp/se-agent-cci1-data`（要跑起来看时用；**不要**用 8804 / 8816 / 8818 等既有端口）。
- **写权**：`app/web/settings-view.mjs`、`app/web/styles.css`、`app/tests/settings-preferences.test.mjs`、本单交付文档 `engineering/mvp/execution/work-surface-kit/delivery-cci-01.md`。需要动其它文件时先在交付文档里说明理由，能不动就不动。
- **不得**新增依赖、不得引 React / 任何组件库、不得新建第三个 element builder（现状已有 `ui-controls.mjs` 的 `el()` 与 `app.mjs` 的 `element()` 两条路径，本片只用 `el()`）。
- **不得**新增数值控件：没有 slider、没有 `input[type=range|number]`、没有 `<progress>` / `<meter>` / `role="meter"` / `aria-valuenow`。BE-31 的 number schema 未到，Value 类今日就应该是空集（WK-146）；这一片之后它必须仍然是空集。
- 不改任何偏好的**语义、默认值、存储通道或取值闭集**：`PREFERENCE_DEFAULTS` / `PREFERENCE_VALUES` / `cw:prefs` / `readPreferences` / `writePreferences` 的行为保持逐字不变。本片只增加"这一行如何被读与被复位"。
- 不做 Reset all，不做偏好导出/导入，不碰 Home 那条带的折叠状态（`homeModuleBand` 是 Home 写的同一条通道，按 `settings-view.mjs:1902` 的既有注释，它**不是** Appearance 上的一个控件）。

## 1. PropertyRow 解剖

把现有 `settingsRow(title, help, control, { id })`（`settings-view.mjs:1253`）扩为：

```text
PropertyRow
├── Label
├── Description / help
├── Control（原样，不换控件形态）
├── Validation state（Code font 已有的错误行，保持）
├── Modified indicator
├── Reset
└── Provenance
```

新增三件只在**有 owner 默认值**的行上出现：签名加一个可选 `{ property }`，值是 `PREFERENCE_DEFAULTS` 里的键。**没有 `property` 的行（服务器背书的设置、纯导航行）一个字都不多**——没有 owner 默认值就没有 provenance，这是 WK-139 (c)"投影不得创造事实"在这一片的具体形态。

## 2. Provenance 与 modified 的取值规则

- 词表**闭集，今日只有两个**：`Default` 与 `Changed on this device`。今天没有 Expert policy、没有组织策略、没有继承链——**不得**因为转交材料里写着 `← Expert policy` 就造一个没有 owner 的来源词。第三个词要等真有一个 owner 事实。
- 判定只能是"当前生效值 vs `PREFERENCE_DEFAULTS[property]`"的字面比较，不得靠启发式或 UI 侧推断。
- **生效值不是草稿值**：Palette 行有 `skinDraft` 与 Apply 的两段语义（`settings-view.mjs` 里 FN-14"请求值 ≠ 有效值"），provenance 与 modified 一律读**已生效**的 `prefs.skin`，选了 `Custom tokens` 但尚未 Apply 不算 changed。
- **Code font 的两阶段 commit**（WK-149 (c)）：输入框里未提交的编辑不是 modified；只有 `commitFont()` 通过校验并写入之后才翻转。校验失败时保持既有错误行，不改 provenance。
- 非空的 `customSkin` 是 Palette 行的一部分事实还是另一行，自己判断并在交付文档里写清取舍；不要为它单开一行 UI。

## 3. Reset

- 每行一个，accessible name 含属性名（例如 `Reset Text size to default`），不是光秃秃的 `Reset`。
- 行处于 `Default` 时不呈现 reset（或呈现为不可用），二选一并说明理由；**不要**让它在点击后消失而把焦点丢在 body 上——复位后焦点必须落到该行的控件上，并有一条可被读屏播报的状态（沿用页面既有的 `role="status"` 机制，不要新造 toast）。
- 复位走既有 `savePrefs({ [property]: PREFERENCE_DEFAULTS[property] })` 通道，不绕过校验。
- Reset 是可逆的低风险操作，**不加确认对话框**（WK-122 undo over confirmation；WK-140 `high-risk ≠ confirm dialog` 的反向：低风险更不该有）。

## 4. 视觉与可达性

- Modified indicator **不得只靠颜色**：必须有文字（provenance 那行文字本身就可以承担，若如此就不要再加一个纯色点）。整行不得因为 modified 就换背景色或加边框——材质表达层次不表达状态（FN-28）。
- 只用既有 token 与既有 shape / 间距体例，不新增 elevation、不新增材质、不加 blur。若确实需要一个新 token，先在交付文档里提出，不要就地取值。
- 密度：这三样加进去之后 Appearance 六行的行高与首屏节奏不应崩坏；1440 与 390 两个宽度都要看过。
- `tools/lint-colors.mjs` 与 `tools/lint-materials.mjs` 必须仍然通过。

## 5. 覆盖面

作用于 Appearance 的这些行：Theme、Text size、Code font、Reduced motion、Home layout，以及 Advanced 里的 Palette。其余 Settings 分组的行**保持原样**（它们没有 `property`，走同一个函数但不长出新东西）——这同时是这个签名对不对的检验：如果给一行加 provenance 需要改十处调用，说明缝没切对。

## 6. 测试与交付

- 扩 `app/tests/settings-preferences.test.mjs`，至少覆盖：默认态无 reset / provenance 为 `Default`；改一项后翻为 `Changed on this device` 且 reset 可用；reset 之后值、provenance、焦点三者都对；Code font 未提交的编辑不算 modified、提交后算、校验失败时不改 provenance；Palette 选 custom 但未 Apply 不算 changed；无 `property` 的行不长出这三样。
- 从 `app/` 跑全量：`node --test tests/*.test.mjs ../tests/*.test.mjs`，报实际数字（当前基线约 431，以你实测为准）。另跑 `node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/check-doc-links.mjs`。
- 真机看一眼：起 8930 跑起来，1440 与 390 各看 Appearance 与 Advanced，浅深两宗，键盘走一遍（Tab 到 reset、复位后焦点落点）。截图不必入库，把观察写进交付文档。
- 交付文档 `delivery-cci-01.md` 一页：基线 SHA、改了什么、`settingsRow` 新签名与调用点、provenance / modified 的判定规则各一句、测试与 lint 的命令与实际输出、真机观察、待裁事项（尤其 customSkin 的取舍与 reset 的呈现二选一）、以及本片明确**没有**做的事（无数值控件、无 Reset all、无新 token / 材质、Value 类仍为空集）。
- 提交在 `claude/cci1-property-row` 上，英文祈使句提交信息；不合流、不 rebase、不 push。
