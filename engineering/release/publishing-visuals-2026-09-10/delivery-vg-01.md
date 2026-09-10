# Delivery · WO-VG-01 · Pages 图的全部施工

2026-09-10 · Opus（`opus-wo-medium`）· worktree `/private/tmp/se-agent-vg01` · 分支 `claude/vg01-figures`，基线 `36f6bc1`。作者自检，不是独立接受；语义复核归 Fable，合流归用户（VG-14）。未 push、未部署、未合流。

## Commits

| commit | 工作项 | 内容 |
|---|---|---|
| `78854ea` | 0 | [EX-VG1 拆解](explore/ex-vg1-skill-deconstruction.md) |
| `10c22b4` | 1、2、3、4、6 | 现有图修订、四张新图、`figures.mjs` 挂载、`site.css` Figures 小节、`figures.json` |
| `bd44af2` | 5 | `site/scripts/check-figures.mjs`，注册进 `pages.yml`（紧跟 check-material） |
| `019aa16` | 7 | `verify.mjs` 增加 V9 / V10，截图与结果存 `evidence/publishing-visuals-20260910/` |
| `3e9aabd` | 7 | V9 在测量前展开隐藏的 pricing 标签页（此前隐藏面板量得零尺寸，pricing 的几何结论为空转），并对零宽图报错；重跑后覆盖 evidence |
| 本回执 | — | `delivery-vg-01.md` |

第 1–4、6 项合为一个 commit：新图的挂载依赖 manifest 哈希与 Figures 小节，拆开会留下无法构建的中间提交。

## 逐图结论

| id | 位置 | 概念 | status | grammar / renderer | 红 | 盘点结论 |
|---|---|---|---|---|---|---|
| `fig-00-matter-object` | hero FIG. 00 | matter、candidate | concept | object / html-css | 否 | **修订**：registry 要求候选与已提交物在线型上可区分，候选页边框改为虚线（`site.css` Figures 小节一行）。构图、文字与动效未动（Astra campaign）。“决定处没有人”未处理，见待裁定 3。 |
| `anatomy-instrument` | 01 Anatomy | event、state、context | shipped | object / html-css | 否 | **保持**：装饰且 `aria-hidden`，含义由三块录制面板承担；Event 为等距轨迹、Work state 为分组带、Context 为收窄的聚合，差异足以区分（VG-7）。仅加 `data-figure` 挂载属性。 |
| `state-to-commit` | 03 `diagram.svg` | context、candidate、evidence、decision、state | shipped | plate / svg-file | 否 | **修订**：回路原先只靠位置暗示（Updated state 位于 Governed work state 下方），按 VG-2③ 补画 Updated state → Governed work state 虚线回边并标 `next run`，`<desc>` 同步；各连线加 `data-edge`。不用红：门是机制而非待处理事项，Review 区块已有页面的录制红。 |
| `pricing-local` / `-hosted` / `-organization` | 07 pricing | matter / matter、runtime / matter、decision、expert、runtime | concept | plate / inline-svg | 否 | **修订，未施工**：缺 `<desc>` 与 `data-figure`（VG-10），但 `pricing.mjs` 不在写入范围。所在区块的 “CONCEPT PLANS · NOT CURRENTLY OFFERED” 可充当状态 caption；“Expert runtime / Managed runtime” 只出现在该概念框内。manifest 以 `deferred` 登记，见待裁定 1。 |
| `pipeline` | `#long-work` lede 与三段之间 | pipeline | concept | plate / svg-file | 否 | **新**：见下文。 |
| `spark` | 02 REBUILD | spark | research | object / svg-file | 否 | **新** |
| `attention` | 03 ATTEND | attention（CW 义，F8） | research | object / svg-file | **是**：`#fig-attention-elevated` | **新** |
| `roles` | ROLES & EXECUTION | expert、runtime | research | object / svg-file | 否 | **新** |

### 新图的内容与出处

- **pipeline**（canonical `:23-27`、`:427-445`、`:519-528`）：四栏宽度不等，Govern 居中、最宽、描边加粗，按 WO 要求列 contract · status · version · authority · applicability。Store 列 sources / events / artifact versions / raw history / current state，并注 “keeps growing”。Retrieve 内的三张候选为虚线，底部 “readable ≠ in effect”（`:445`）。Compile 产出一张工作集卡（assignment / role / stage，“minimal, sufficient”，`:25`）。回路 Run → “candidate → review → commit” → Store 取自 `:23`（输出侧：Candidate Change 经 Review 写入 Committed Event 并更新 Current Semantic State）。下方对照条：EARLIER / LATER 两段存量长短不同，工作集条宽度相同且与 Compile 卡对齐（`:27`、`:526`）。caption 写 “Concept · … 概念示意，不表示产品已具备完整的四段”。
- **spark**（`page.mjs:271`）：上层 “DERIVED · CAN BE REBUILT”：虚线的 old summary（“may exit”）与 rebuilt view，后者以虚细线回指 sources 与 decisions（cyanotype 的接触痕迹只取线型，VG-3）。下层 “STAYS · THE SOURCE LAYER”：sources、decisions、open obligations、conflicts 四块实线。
- **attention**（`page.mjs:272`）：分界线下 48 个安静的描边方块（“QUIET WORK”）；三项相关事件以细线汇合为一项，只有这一项越过分界进入 “HUMAN VIEW”，是实心方块并配加粗标签 “brought to a person”。整页图中唯一的红只染这个方块。
- **roles**（`page.mjs:275`）：三个 Expert 方法框（method A/B/C），一个作用于同一 Matter（“methods change; the work does not”）。下方执行载体只有 `Pi · in use` 为实线，另外两个是虚线空位 “not connected”，下注 “verify one at a time, when needed”。未画成已接入。
- 三张 research 图的 figcaption 统一为 “Research sketch · 研究方向示意，尚未交付；见本节末说明。”，并以 `aria-describedby` 指向原有 caption（新加 `id="long-work-status"`，文字未改）。没有新增能力声称。
- 图内文字只用 canonical 与页面现行用词；未使用 “Compiled Context” 或 “Matter State”。method A/B/C 是占位名，不对应任何已有 Expert。

### 红色登记（VG-15）

全部图中只有一处红：`attention` 的 `#fig-attention-elevated`，class `fig-attention` → `var(--campaign-attention-review)`（浅 `#b3262d` / 深 `#ed9396`，未新增色值）。静态，无动画。去色后仍靠三点辨认：唯一的实心标记、分界线上方的孤立位置、600 字重标签。forced-colors 下解析为 `CanvasText`。manifest 记录 `{element, concept: "attention", reason}`，check-figures 与 verify V9 均校验“只此一处”。pipeline、spark、roles、diagram.svg、FIG. 00 不用红；Review 区块的红未改动。

### 第 4 项：语法与 renderer

只用 `plate`（pipeline、diagram.svg、pricing）和 `object`（FIG. 00、Anatomy、spark、attention、roles），**未用 `ambient`**，因此不需要论证“比静态图多传达的一件事”。SVG 只写几何与语义 class，颜色由 `site.css` 末尾的 `/* Figures */` 小节解析为 `currentColor`、campaign token（`--campaign-raised` / `-soft` / `-rule` / `-attention-review`）与产品 token（`--ink` / `--muted` / `--muted-strong` / `--font-mono`）；未新增色值，未引入依赖，无外部请求，未使用图像模型。`figures.mjs` 在构建时核对每个 SVG 文件的 sha256，与 manifest 不符即中止构建。

## 检查结果

| 检查 | 结果 |
|---|---|
| `node site/build.mjs` ×2 | 均成功；71 个 dist 文件逐字节相同；`site_sha` 两次均为 `54aff810548433c91696715820e04f1e1ea93b93c59bcd59c6209a8210e2e798（head `3e9aabd` 的站点源；`site_sha` 覆盖 `site/scripts`）` |
| `check-links` | pass；71 个文件，184 个本地引用 |
| `check-material` | pass；0 problems |
| `check-figures` | pass；10 张图，0 problems，3 张 deferred（pricing 缺 `<desc>`） |
| `node --test site/scripts/public-data.test.mjs` | 3/3 |
| `node tools/check-doc-links.mjs` | pass；735 份文档，3451 条链接（含本回执） |
| `git diff --check 36f6bc1 HEAD` | 无输出 |
| `verify.mjs`（8961 / CDP 19971，独立 profile） | 28/28：原 18 项全部保持通过，新增 V9 ×4、V10 ×6 |

### check-figures 反例（退出码 1，随后撤回）

直接改 `site/dist/index.html`，每次运行后从备份恢复，最后重新构建。

```text
# N1 · 在 attention 图中给第一个安静方块加上 fig-attention（第二处红）
node site/scripts/check-figures.mjs   → exit 1
  attention  mounted markup differs from its source file
  attention  more than one red element
  attention  registered red element not found as the figure's only red
  —          page carries figure red elements the manifest does not register  {onPage: 2, registered: 1}

# N2 · 删除 pipeline 的 <desc>
node site/scripts/check-figures.mjs   → exit 1
  pipeline   mounted markup differs from its source file
  pipeline   svg lacks <desc> as its second child

# N3（附加）· 把 “artifact versions” 右移到 x=120，越出 Store 框
node site/scripts/check-figures.mjs   → exit 1
  pipeline   mounted markup differs from its source file
  pipeline   text overflows its box            (artifact versions in store)
  pipeline   text overlaps an unrelated node   (artifact versions / govern)

# 撤回：node site/build.mjs && node site/scripts/check-figures.mjs → exit 0；git status 干净
```

另对浏览器检查做了同样的反例：dist 注入 N1 + N3 后运行 verify，`V9 · figures at 1440px light` 报 FAIL（`text overflows its box: artifact versions`，reds `["#fig-attention-elevated","rect"]`），结果为 24/28（该反例在 `3e9aabd` 之前运行）；该运行的输出写到 scratch，没有进入 evidence。

### 第 7 项矩阵

`evidence/publishing-visuals-20260910/`（[README](../../../evidence/publishing-visuals-20260910/README.md)、`matrix.json`、`verify.json`），Chrome 152.0.7977.83 headless。

| 维度 | 取值 | 实际 viewport（`matrix.json`） |
|---|---|---|
| 宽度 × 主题 × 模式 | {1440×900, 390×844} × {light, dark} × {default, reduced-motion, no-js}，每组截 `#long-work`、`state-to-commit`、`fig-00` 三区 = 36 张 | 1440×900 / 390×844，DPR 1；no-js 组是模拟尺寸（页面脚本关闭，未在页内读取） |
| 去色 `filter: grayscale(1)` | 1440 浅、1440 深、390 浅 | 同上 |
| forced-colors | 1440 浅、390 深 | 同上 |

共 41 张。V9 在四个组合下用真实字形核对：文字不越出所属框与 viewBox，节点不重叠，连线不穿越无关节点，图内文字填充色在所在底色上的对比度达到 AA，红只出现在登记元素上，图内无动画或过渡。四张新图去色后均可读（截图已人工看过；断言按计算样式换算，不是逐像素采样）。

## 未做或做不到

1. **pricing 三图未修订**：`pricing.mjs` 在写入范围之外。建议补丁（交 Astra 或另开单）：每个 `<svg>` 加 `data-figure="pricing-{local,hosted,organization}"` 与 `<desc id="pricing-…-svg-desc">`（内容取 manifest 的 `alt`），`aria-labelledby` 同时指向 title 与 desc，各 `<line>` 加 `data-edge`；完成后删除 manifest 中的 `deferred` 并重算哈希。目前 check-figures 将缺 desc 列为 deferred 而不是失败，静态几何交给浏览器 V9：V9 会先展开隐藏的标签页再测量，四个组合下均无问题。
2. **390 宽下 pipeline 在自身容器内横向滚动**（`min-width: 720px`，与既有 `.diagram` 做法一致），页面本身不横向滚动（V8 通过）。没有为窄屏另排一版。
3. 未使用 `ambient`，因此没有浏览 Cue 条目（VG-13），也没有 p5 / seed 相关实现。
4. EX-VG1 全部来源均可访问。唯一例外是 brand-studio：GitHub API 未报告许可，因此只记录机制，不引用其文本。

## 待裁定

1. **pricing 的写入范围缺口**（见上）。WO 同时要求“现有图一并登记”与 VG-10 的 title/desc，但把 `pricing.mjs` 排除在写入范围之外，两者无法同时满足。
2. **Anatomy 的现行标签与 VG-4 / F-表不一致**：`copy.mjs:51` 的 tab 标签是 “Compiled context”，`page.mjs:175` 的导航写 “Matter state”，正是 VG-4 点名禁止的混合词；intake VG-4 与 registry 所记的 “Surface” 实际显示为 “Work state”。这属于文案，不在本单写入范围，未改。
3. **FIG. 00 的“决定处有人”**：registry 的通用禁忌要求决定处永远有人；FIG. 00 只在 03 页脚写 “Source → Candidate → Decision”，没有画人。补画会改变 Astra 的构图，本单未做。
4. **内联图的来源哈希**：FIG. 00、Anatomy 与 pricing 按渲染后的片段计算 sha256，所以今后 Astra 改 hero 或 instrument 的标记时，要用 `node site/scripts/check-figures.mjs --hashes` 同步 manifest，否则 CI 的 check-figures 会失败。这是有意为之（图改了，就要回看它的声称），但会给 campaign 作者增加一步。是否接受，请裁定。
5. **状态 caption 的“区块”定义**：check-figures 以最近的顶层 `section`（class 含 `section` 或 `hero`）作为区块。按这个定义，pricing 标签页里的图继承了 “CONCEPT PLANS” 这一行。如果 VG-10 的本意是“图自身的 caption”，pricing 仍须补 caption。

## 与裁定的分歧

没有实质分歧。只有一处取舍需要说明：VG-15 第 2 条允许在 `decision` 门处用红，我在 diagram.svg 中没有用。理由：该图描述的是机制，不是一件待人处理的事，而同页 Review 区块已有录制中的“待人审阅”红；按第 3 条的“按需”和“不为统一而补红”，这里不补。

## 环境

预览 `node site/scripts/preview.mjs --port 8961`；CDP 19971，profile `/private/tmp/se-agent-vg01-chrome`（verify 结束时自动删除）。预览服务在交付前已停止。`site/verification/` 未改写（`--out` 指向会话 scratch）。
