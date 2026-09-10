# WO-VG-01 · Pages 图的全部施工

执行者：Opus（`opus-wo-medium`），直接施工；施工期间是唯一的 `site/` 写者（intake VG-14）。Fable 做语义复核，用户合流。

- worktree `/private/tmp/se-agent-vg01`，分支 `claude/vg01-figures`，基线 = 本批 docs 分支 `claude/fable-publishing-visuals` 的 head（其中含 intake 与 registry）
- 预览端口 `8961`，CDP 端口 `19971`，Chrome 使用独立 profile
- 交付回执：`engineering/release/publishing-visuals-2026-09-10/delivery-vg-01.md`

## 必读

1. [intake](../intake.md)：VG-1…VG-15。VG-15 的红色规则是硬约束。
2. [registry 草案](../visual-semantic-registry.md)：每张图只能表达 registry 中的概念，图的 `id` 须引用概念 `id`。
3. `site/README.md` 全文；`evidence/pages-polish-20260910/README.md`（Archival Instrument 与 campaign 边界）。
4. `site/src/page.mjs`、`site/src/site.css`（:574 之后是 campaign 段）、`site/src/assets/diagram.svg`、`site/src/pricing.mjs`、`site/build.mjs`、`site/scripts/check-material.mjs`、`site/scripts/verify.mjs`。
5. SE canonical 9.6（本机 `~/Projects/Schema Engineering/papers/src/canonical.md`，只读）`:23-29`、`:121`、`:250`、`:349`、`:366`、`:427-449`、`:519-528`。

## 工作项

**0 · 外部方法（按需）。** 执行 [EX-VG1](EX-VG1-skill-deconstruction.md) 的问题清单，但只读与第 1–6 项相关的部分；许可证与“可写成断言的 QA 项”两栏必须填写。交付写到它规定的路径。无法访问的来源如实记录。不安装、不 vendor、不运行第三方代码。

**1 · 盘点与修订。** 对照 registry 末表的四类现有图（FIG. 00、Anatomy 仪器、`diagram.svg`、pricing 三图），逐图给出结论：保持 / 修订 / 移除，附一行理由（引用 registry 或 VG 编号）。结论为修订的直接施工。FIG. 00 是 Astra 已定的 hero 构图，只修语义错误，不改构图和动效。

**2 · `pipeline` plate（首张新图）。** SVG，`plate` 语法，放在 `#long-work` 的 lede 与三段 stages 之间，作为三段的总图。必须表达以下几点：
- Store 的存量随时间增长；
- Govern 是视觉重心（contract · status · version · authority · applicability）；
- Retrieve 只定位候选，“可读 ≠ 已生效”（canonical `:445`）；
- Compile 产出的工作集宽度不随存量增长（`:526`）；
- 若画出 Compile → Run → 回写 Store 的回路，回路必须真实存在于 canonical 的叙述中。

caption 标注 concept。本图不含需要人的点，因此不用红。

**3 · `#long-work` 三张小图。** 每张挂在对应段落内，全部是 `research`，沿用该区块现有的“尚未交付”caption，不另写能力声称。
- `02 REBUILD` → `spark`：来源层不变，派生层可丢弃、可重建（旧摘要退出，来源、正式判断、未完义务、冲突留下）。不用红。
- `03 ATTEND` → `attention`：大量安静的中性工作中，极少数被提升到人面前。**这是 VG-15 下最主要的一处红**：只染被提升的那一项，其余全部中性。
- `ROLES & EXECUTION` → `expert` + `runtime`：同一 Matter，可换的方法（Expert）；执行载体只画一个在用（Pi），其余以虚线或空位表示“按需验证”，不画成已接入。

**4 · 语法与 renderer。** 只用 `plate` 和 `object` 两种语法；只有能证明比静态图多传达一件事时才用 `ambient`，并在回执中写明这件事是什么。SVG 使用 `currentColor` 与 campaign token，不新增色值（红色除外，只能用 `--campaign-attention-review`）。不引入依赖，不发外部请求，不使用图像模型。

**5 · `site/scripts/check-figures.mjs`。** 对 `site/dist` 执行 VG-10 的全部检查：
- 每个 `figure[data-figure]` 在 manifest 中有条目，且 SVG 有 `<title>` 与 `<desc>`；
- 非 `shipped` 的概念同区块内有状态 caption；
- 红色只出现在 manifest 登记的元素上，且每图 ≤ 1 处；
- 不引用外部资源；
- 文字包围盒不溢出 viewBox，节点不重叠，连线不穿越无关节点（能静态计算的做静态检查，其余交给浏览器 verify）。

注册进 `pages.yml`（紧跟 `check-material`）。必须附一个反例：临时注入第二处红或删掉 `<desc>`，确认退出码为 1，然后撤回；回执记录命令与输出。

**6 · manifest。** `site/src/assets/figures/figures.json`，每图记录：`id`、`concepts[]`、`status`、`grammar`、`renderer`、`source`（文件与 sha256）、`red`（`null`，或 `{element, concept, reason}`）、`reducedMotion`、`alt`。现有图一并登记。

**7 · 浏览器验证。** 在 `verify.mjs` 中增加图的断言，或新建同构脚本。矩阵为 1440 / 390 × 浅 / 深 × reduced-motion × 无 JS；另加去色（`filter: grayscale(1)`）和 forced-colors 截图，确认去色后状态仍可辨。截图存入 `evidence/publishing-visuals-20260910/`，并记录实际 viewport。

## 写入范围

`site/src/assets/**`、`site/src/page.mjs`（仅图的挂载与 caption）、`site/src/site.css`（仅在 campaign 段末新增 `/* Figures */` 小节）、`site/scripts/check-figures.mjs`、`site/scripts/verify.mjs`、`.github/workflows/pages.yml`（仅注册检查）、`evidence/publishing-visuals-20260910/**`、本批目录下的 `explore/` 与 `delivery-vg-01.md`。

**禁止：**
- 改 `app/web`、产品 token、specimen、media manifest、`release.json`；
- 改 Review 区块的红色；
- 改文案的能力声称；
- 部署或 push；
- 修改 registry 与 intake（有异议写进回执）。

## 验收（作者自检，写入回执）

- `node site/build.mjs`、`check-links`、`check-material`、`check-figures`、`public-data.test`、`node tools/check-doc-links.mjs`、`git diff --check` 全部通过；构建可重现（两次构建的 site_sha 相同）。
- 第 7 项矩阵截图齐备；每张新图去色后仍可读。
- 回执逐图列出：概念、status、是否用红及理由、盘点结论；未做或做不到的项如实列出。
- 每个工作项一个 commit 为宜；分支干净。
