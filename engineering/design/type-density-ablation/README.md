# EX-CC4 · 字阶与控件密度消融（FE-05a / WK-120 / M-11）

2026-09-09，Sonnet。产品代码之外的静态消融页，供用户比较现状 / V1 / V2，不是验收。

## 来源

- 只读树：`/private/tmp/se-fable-r4d`，基线 `main` `5ea5ff0`。
- 规格：[type-density-constraints.md](../type-density-constraints.md)（§1 现状、§2 约束、§3 V1/V2 目标值、§4 消融面与比较方法）。
- 应用端口 **8903**（local-fake，未配置真实 provider，未读取任何凭据文件），CDP 端口 **19970/19971**。
- 数据目录：`/private/tmp/se-fable-r4d-excc4-data/work2`（Settings 与 composer·idle 取样）+ 一个额外播种的
  会话 "Ablation waiting run"（同一服务器同一数据目录，用于 composer·waiting 取样）。
- 取样时间：见 `measurements.json` 的 `source.sampled_at`（本次生成时的时间戳）。
- 结束时全部 `node server/index.mjs` 进程、headless Chrome 与本地静态文件服务器（8909，仅用于本机截图核对）已停止；8903/8850–8861/8810/8817/8818/8887–8953 未被本单占用或触碰。

## 生成方法

1. `npm --prefix app ci` 后 `npm --prefix app start -- --data-dir <空目录> --port 8903`，`APP_URL=http://127.0.0.1:8903` 复用
   `evidence/cc-s/seed.mjs`（Home 四态）与 `evidence/cc-s/work-seed.mjs`（NDA review 绑定，产生 Work 模式会话）——两个脚本逐字来自
   `evidence/cc-s/`，未改一行；但 `work-seed.mjs` 会把输出写回它自己所在目录的 `work-seed.json`，为了不污染只读树，
   实际运行时把两个脚本连同 `browser.mjs` **复制**到本次会话的 scratch 目录后再跑（复制件把导入路径改成绝对路径、
   把输出文件名改掉），只读树里一个字节都没有被脚本写过（首次不慎覆盖过 `evidence/cc-s/work-seed.json` 一次，已用
   `git checkout --` 立即撤销并核实 `git status` 干净）。
2. 用 `evidence/cc-s/browser.mjs`（原样 import，未拷贝、未修改）驱动 headless Chrome：1440×900、
   `Emulation.setEmulatedMedia({ prefers-color-scheme: light })`，导航到 `#settings/general` 与两处 Work 会话
   （一个 Run 已完成的绑定会话 "Complete NDA review"，一个另外播种、停在 `waiting_user` 的绑定会话
   "Ablation waiting run"），用 CDP 的 `Runtime.evaluate` 取 `outerHTML` 与 `getComputedStyle` 的字号/字重/行高/字距/
   颜色/尺寸，落盘为 `*.html.fragment` 与 `*.styles.json`（这些中间文件留在 scratch 目录，未进本目录）。
3. 一个 Node 构建脚本读取这些真实 DOM 片段与只读树里 `app/web/styles.css` 的**原文**，拼成三份静态页：
   `<style>` 里先原样内联整份 `styles.css`（一字未改），再追加一份很小的 overlay `<style>`（下节列出），
   最后把真实 DOM 片段套进最小必要的祖先容器（`.settings-page` / `.chat-header` / composer 的 `footer`）里，
   分别放进"现状 / V1 / V2"三栏。三栏共享同一份 `styles.css`，V1/V2 栏只是多套了一层 class 作用域的变量覆盖。
4. 三栏原生宽度就是 1440 级布局的真实宽度（Settings 面 1200px 量级、Work 面 1000px 量级），并排放不下，用 CSS
   `zoom`（不是 `transform: scale`）整体缩小到能三栏并排——`zoom` 会在缩小后的尺寸上重新走一次布局，
   不是纯视觉缩放，所以文字之间的相对比例、换行位置都和 1:1 渲染一致，只是绝对像素更小。

## 覆盖的 token 清单（只此七个变量 + 六类选择器覆盖，其余 CSS 一字未动）

变量（在 `.col-v1` / `.col-v2` 这一层重新声明，效果等价于产品里在 `:root` 覆盖；因为一页要放三栏，作用域从
`:root` 下放到各栏的包裹元素）：

| token | 现状 | V1 | V2 |
|---|---|---|---|
| `--text-title` | 20 | 18 | 18 |
| `--text-navigation-title` | 17 | 15 | 15 |
| `--text-reading` | 15 | 15（不变） | 14 |
| `--text-body` | 14 | 14（不变） | 13 |
| `--text-section` | 14 | 13 | 13 |
| `--text-label` | 13 | 12 | 12 |
| `--text-meta` | 12 | 11.5 | 11 |
| `--text-caption` | 11 | 10.5 | 10.5 |
| `--tracking-caps` | 0.06em | 0.08em | 0.08em |
| `--control` | 32 | 28 | 28 |

选择器覆盖（字重、行高、控件字号——变量本身表达不了的四类差量）：

- `h1`（导航标题角色，两处消融面的页标题都是它）：字重 → 500。
- `.settings-section-title`（标题角色，本页唯一样本）：字重 → 500。
- `.settings-block-title`（分节角色，本页唯一样本）：字重 → 500。
- `.settings-tab` / `.settings-tab.is-current`：非选中 → 450，选中 → 500（见下方"未照抄表格之处"）。
- `.session-mode` / `.session-scope` / `.run-badge`（说明角色）：字重 → 450；V1 额外显式 `line-height: 1.45`
  （V2 靠 `.col-v2` 根变量 `line-height: 1.45` 统一带出，未逐个覆盖）。
- `button`（含 `#send-button` / `#cancel-run-button`）：`font-size: var(--text-label)`；`.primary-button` 字重 → 500。
- V2 额外在 `.col-v2` 本身设 `line-height: 1.45` 与 `font-size: calc(13px * var(--text-scale))`，让"全站一档"
  真的把正文与未显式设字号的元素一起带下去，不是只改标了 role 的元素。

## 未照抄表格之处（一处，已披露）

`--text-label` 目标 450 是"非选中"态；`.settings-tab.is-current` 本单额外设成 500（不是 450），
理由：约束表把选中态和非选中态的字重目标合并成同一个数字会让"当前选中哪个组"这件事**只剩背景色一个信号**，
与 WK-120 的"层级靠字号字重差成立，不靠颜色"直接冲突。500 仍在约束允许的 `400/450/500/550` 集合里，
没有引入新字重档，只是没有把两档压成一档。如果用户认定约束表的 450 就是唯一目标，删掉这一条覆盖即可。

## 对比度

**不达标（<4.5:1）项数：0。** 本消融不改任何颜色 token，三栏文字颜色与背景色逐一相同，对比度因此只算一次、
三栏共用（见 `measurements.json` 每个角色的 `contrast` 字段）：

- ink `#1c2024` on panel `#fdfdfe`：16.12
- muted-strong `#60646c` on panel `#fdfdfe`：5.84
- on-accent `#fdfdfe` on ink `#1c2024`（Send/Cancel 按钮）：16.12
- ink `#1c2024` on selected `#e8e8ec`（settings-tab 选中态背景）：13.41

全部来自 `app/web/styles.css` 的颜色 token 字面值，按 WCAG 相对亮度公式算，不是从渲染截图取色。

## 未覆盖项 / 局限

1. **`--tracking-caps` 无可见效果**：Settings › General 与 Work 头部/composer 这两处消融面today都没有用到
   `text-transform: uppercase` 的 eyebrow/说明元素（那类元素在别处，如 `.settings-preview-label`、
   `.settings-table thead th`），所以 0.06em → 0.08em 的改动在这两页上视觉上没有任何差异，仅为遵守 §3 表而声明。
2. **可变字重轴退化未验证**：约束表允许"可变字重轴不可用时退化到 400/500"，但本机 headless Chrome 用的是
   系统 UI 字体（macOS 上是 San Francisco），本消融未验证 450/550 在目标渲染环境（用户浏览器、可能非 macOS）
   下是否真的插值出中间字重，还是被就近吸附到 400/500/700。这是产品落地时需要单独核实的一项，本消融只是
   按约束表写下 CSS 数值，不代表已验证渲染结果。
3. **静态片段非实时应用**：三栏都是拿一次真实渲染的 DOM 快照 + 原样 CSS 拼出来的静态 HTML，不再跑应用的 JS；
   交互（hover、focus、点击切组）在这页里不存在。
4. **深色宗与 390 未做**：按任务范围排除，只取 1440 浅色。
5. **composer 的 Send / Cancel run 从未同屏出现过**（`send.hidden = Boolean(active run)`，两者互斥），本页把
   两个真实状态分两段纵向排列在同一栏里比较，不是合成出一个假状态。
6. **`#cancel-run-button` 的 44px 高不是本消融造成的**：`waiting_user` 状态下该按钮的 outerHTML 是纯文本
   "Cancel run"（`icon-only` class 仍挂着，但内容已被 `renderComposer()` 的 `textContent` 赋值覆盖成可见文字），
   32px 宽装不下这几个字，撑成两行、高度变 44px。这是应用今天已有的真实渲染事实，与字阶消融无关，本页如实
   保留，未做任何修饰或裁剪；供参考，不代表已登记为缺陷。
7. **一次脚本运行事故**：`work-seed.mjs` 首次直接从只读树运行时，把输出写回了它自己所在目录的
   `evidence/cc-s/work-seed.json`（覆盖了已提交的内容）。发现后立即 `git checkout -- evidence/cc-s/work-seed.json`
   撤销，`git status` 确认只读树干净后才继续（用复制到 scratch 目录、改掉输出路径的脚本副本重新播种）。记录在
   此处以保持透明，不影响本目录任何交付物。

## 不做（与任务范围一致）

不改 `app/**`；不 git commit；不引新字体、新颜色；不动间距 token；不做深色宗与窄屏；不宣称这是验收——
"视觉四轴留用户，本页不自评"（沿用 CC-S 交付页体例）。

## 文件

- `index.html` — 汇总链接 + 全部角色数值表。
- `settings-general.html` — Settings › General 三栏（现状 / V1 / V2）。
- `work-header.html` — Work 头部 + composer 三栏（现状 / V1 / V2；composer 各栏内含 idle 与 waiting 两段真实状态）。
- `measurements.json` — 逐角色数值（含每个角色抓取到的真实 `getComputedStyle` 原始 JSON，见
  `raw_computed_style_captures`）。
