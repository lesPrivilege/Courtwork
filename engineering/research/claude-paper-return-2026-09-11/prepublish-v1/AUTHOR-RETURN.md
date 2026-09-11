# return-paper-prepublish-v1 · Claude · Paper 发布前串行施工返回

作者：Claude（Fable 5.1）· 2026-09-11。三阶段一次返回；**发布前准备完成，未执行发布**（未 push、未 workflow_dispatch、未部署）。作者检查 ≠ 非作者接受；测试模拟 ≠ 原生检查；当前候选 ≠ 线上版本。

## 基线与实际现场

| 坐标 | 固定值 | 实际 |
|---|---|---|
| CourtWork | `bf4b8081…` | 共享 checkout HEAD = `bf4b808`（干净，除他人未提交的 current.md/研究稿，未触碰）。`brand/les-privilege/` 自 0227673 只改 README，**无新 icon 资产**；`manifest.json` 仍 `proposed-optical-revision`，几何 9/26/8 |
| SE reader | `0f23ad1e…` | 共享 SE 本地 main = 0f23ad1（干净）。`git clone` 到 scratchpad `prepub-v1/se-src`，分支 `claude/paper-prepublish-v1`，本轮提交 `a6bf140`（只改 reader.css 与两份候选 HTML）。DSH 观察分支未合并 |
| 论文 | 9.6 / 2026-09-07 / d78fd312 | 不变；`papers/src`、`translations`、review manifest、README/CHANGELOG、历史 dist 11 文件逐 blob 相同 |
| 已裁选择 | v1 八项裁定 | 全部沿用：E1 仅挂 Canonical、章节 sans/正文 serif、宽屏 details rail、黑宗默认 + 上横红彩宗、Astra 的 alt/元数据/资源失败/打印修补均保留，未重开构图 |

## 阶段 1 · 阅读行为与可访问性证据

新增 `tools/verify_prepublish.mjs`（50 项，中英各 25），在 v1 的 110 项之外补：

| 项 | 结果 | 证据 |
|---|---|---|
| back/forward 经三卷链接 | 通过：卷、`?mode=`、可见卷同步 | `run2-fixed/results.json` `*-history-*` |
| 共享 query+hash 与刷新 | 通过：`?mode=practice#<h3>` 落点 128px；reload 后卷/hash/位置不变 | `*-shared-link`、`*-reload-keeps-position` |
| hash 别名 `#paper-index` `#实践` `#practice`、`?view=` | 通过 | `*-hash-alias-*`、`*-query-alias-view` |
| 长目录末项可达（Index 卷 1440 rail / 390 details） | 通过：末项在视口与目录框内，点击落点 128px | `*-toc-last-*.png` |
| 键盘完整路径与焦点可见 | 通过：skip → Canonical → Practice → Index → 主题 → 语言 → 目录 summary → 目录链接…，每站 outline 可见；skip link 进入正文；Enter 切卷；Space 折叠/展开；390 下 Enter 展开 | `*-keyboard-*` |
| 无脚本 | 通过：三卷可见，鼠标可展开 details，紧凑封面显示，请求全为本地 | `*-noscript-details`、截图 |
| 显式主题覆盖系统偏好（双向） | 通过 | `*-explicit-theme` |
| reduced-motion | 通过：唯一过渡（目录箭头 120ms）归零；页面无 animation | `*-reduced-motion`、`*-motion-inventory` |
| forced-colors | **首次失败**（SVG 无映射）→ 新增 `@media (forced-colors: active)` 角色→系统色映射 → 通过。仅 CDP 媒体特性模拟，不是原生高对比渲染 | run1 FAIL / run2 PASS |
| 打印 ×4（系统深色+黑宗、显式深色+彩宗 × 1440/390） | **系统深色首次失败**（dark 媒体块特异性高于 print 块，打印出深色）→ print 选择器补 `:root:not([data-theme="light"])` → 通过；宽/紧凑封面按宽度切换、署名打印为黑、控件隐藏、署名保留 | run1 FAIL / run2 PASS；`zh-print-*.pdf`（Page.printToPDF） |
| 200% | 沿 QA 以 720 视口 × DPR2 设备尺度模拟，**非原生浏览器缩放** | `qa-110` `*-zoom200*` |
| 离线 | file:// 直接打开可切卷、封面在；断网后继续切卷 | `*-offline-after-load`、探针 |

未新增任何 UI 控件。首次失败日志 `verification/run1-baseline/`（36/50），修后 `run2-fixed/`（50/50）；原 QA 重跑 `qa-110/`（110/110）。

## 阶段 2 · 可复现发布候选

- `release-manifest.json`（唯一 release manifest）：论文坐标、reader 源坐标与补丁 hash、品牌资产版本、候选输出四文件 hash、命令、依赖、验证来源、模拟项与未跑项、`signature.status = awaiting-astra-icon-finalization`。
- 可复现：两次构建中英 hash 一致（`a18bfac2…`/`8588c8c9…`）。
- 不变性：src/translations/README/CHANGELOG/build_en/qa/reader.js/署名与封面 SVG 与 0f23ad1 相同；11 个既存 dist 文件 blob 相同；仅 reader.css 与两份 `-paper-v1` 候选 HTML 变化。
- 后缀：保留 `-paper-v1`；不去后缀覆盖已跟踪 HTML（`RELEASE-PLAN.md` §2 给出 A/B 两法）。
- 入口：`index.html`/`index-en.html` 与带日期候选逐字节相同；片段链接 zh/en 各 240 无缺失；4 个外部 GitHub 链接 HEAD 200；`chatgpt-conversation://` 为来源引用，未抓取。
- 补丁：`reader/patch/0001-fix-reader-print-under-system-dark-scheme-and-forced.patch`，基于 0f23ad1，`git am` 可应用；`reader/src/` 为补后文件副本，`reader/dist/` 为隔离副本真实构建产物。

## 阶段 3 · 最终 icon 接入

资产未固定（CourtWork HEAD 无新几何/manifest）。按开工单交出其余完整包与**唯一待接点**：`papers/reader/signature.svg` 的 `<path class="lp-l">` 与两条 `<rect class="lp-bar-*">` 几何。替换步骤、保留项（`aria-hidden`/`focusable="false"`、`lp-mast-title`、`currentColor`、彩宗 class 钩子）与复验清单见 `RELEASE-PLAN.md` §4。现资产已备好同一套检查：`identity/signature-specimen-2x.png`（16/20/24/32 × 单色/彩色 × 明暗）、`identity/masthead-*.png`（1440/1280/390，黑/彩，明暗；masthead 标记实测 21.6px）、打印与 forced-colors 证据。未猜测最终几何。

## 发布方案

`RELEASE-PLAN.md`：预检命令、候选→发布路径（A 保留 paper-v1 / B 新后缀，禁止去后缀覆盖）、`git push` 触发 `pages.yml`、`gh run watch`、线上四文件 `no-cache` 字节核对与 meta 核对、回退（revert 反序、不 force-push、不删历史、不改 PAPER.md）。

## 未跑

push / workflow / 部署；线上字节核对（未发布无对象）；原生 VoiceOver/NVDA/IME、原生浏览器缩放、原生高对比、实体打印；非作者接受。

## 语义疑问与缺失输入

1. icon 最终资产（Astra）：唯一缺失输入，不阻塞其余。
2. 发布路径 A/B 与是否在 `publication-surface.md` 登记候选（`docs:` 提交同样触发 Pages）由 Astra 裁。
3. forced-colors 下红点映射为 `Highlight`（系统高亮色），语义"人在此判断"沿用；如认为高亮不当可改 `CanvasText`。

## 写入边界

只写 scratchpad；未编辑共享 CourtWork/SE checkout；未读取凭据、未用付费 provider；未在 SE 论文目录建产品工单。
