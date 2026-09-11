# Semantic polish merge release review

审查日期：2026-09-11。审查目标为候选 worktree
`codex/semantic-polish-prep-20260911`，源码基线 `2bbcdf6591aa8f943fb60351a4ccde44a6ab9ede`，
产品候选 `f99af4695aa5796e703286b0875ec5663cc22c85`。本报告只写入本文件；
同一 worktree 中根 agent 的页面、截图与元数据修补属于并行工作，均不作为本次作者修改。

这是发布面来源、决策落实与证据完整性的独立审查，不是完整的浏览器视觉验收、原生辅助技术验收或线上部署回执。源码/build 检查通过只能证明相应切片，不自动产生产品接受。

## 用户主轴、PR/RD 与落实交叉表

| 来源与裁决 | 当前落实 | 证据与状态 |
|---|---|---|
| 用户的产品语言裁决：一个概念一个词；前端不镜像 RuntimeStore 的内部对象，保留后端事实与权限边界 | [semantic registry](../../engineering/design/product-semantics/registry.json) 47 项；[semantic-controls.mjs](../../app/web/semantic-controls.mjs) 位于现有 icon/action renderer 之上；Home/Attention/Spark 等保留文字身份，Runtime/Core 继续拥有事实与 mutation | [semantic-registry-plan.md](../../engineering/execution/2026-09-11-semantic-polish/semantic-registry-plan.md)、[coverage.md](../../engineering/execution/2026-09-11-semantic-polish/coverage.md)、registry 8/8、semantic consumers 及 Pages map checks 通过。Pages 当前主要以 page markers 做 cross-map，尚未把生成 registry 作为 Pages glyph adapter 的运行时输入；这是有界后续项，不是本轮新增 authority |
| BM-01 评测契约接受；BM-02–05 仍是 implementation briefs，不把计划写成结果 | BM-01 文档已集成；Eval 页公开问题与方法入口，BM-02–05 仅保留 brief/队列状态，未声称有新的 benchmark 结果或 paid-provider 结果 | [benchmark-series README](../../engineering/execution/2026-09-10-benchmark-series/README.md)、BM-01–05；Pages integration 记录 BM-01 `a2e2d3c` → `e2114a1c`。Method export 固定 `publishing_source_sha=b9122180dd0c75fe68ba783c4b70dcb4e3835263`，并有 source-drift failure |
| PR2 `d804883` 的公开产品故事：Spark/Attention → Ideas/Tour → work surfaces → Matter/Experts/Runtime → Eval；产品文案按完整 fictional product 写，不把 caption/animation 当 runtime evidence | 这是 PR2 的原始输入；后续 brief 与 Astra 视觉裁决重开了页面顺序与分栏，本次不把该原顺序描述成当前 renderer 的最终落实。当前只确认相应产品语义、provenance 边界和 build 接缝仍受检查 | [pages-ordered-integration README](../../engineering/release/pages-ordered-integration-2026-09-11/README.md)、PR2 audit。76-file deterministic build、figure/link/material/public-data checks 通过；未把静态图或演示交互升级成运行时证据 |
| VG-01 `2eca488`：沿用既有几何、可访问描述、manifest 与 restrained review colour，不重复 merge；caption 说明关系，maturity 留在 figure registry | Pages 使用 10 个注册 figure 与现有 SVG/manifest；figure checker 验证内部分类，页面文字不塞 development disclaimer | [WO-VG-01](../../engineering/release/publishing-visuals-2026-09-10/work-orders/WO-VG-01-figures.md)、[figures.json](../../site/src/assets/figures/figures.json)、Pages integration evidence。VG-01 已是主线祖先；本审查没有发现图形来源被重新冒充为产品结果 |
| 后续 product brief 的 presentation-first 裁决：产品公开面保持可读，内部 contract、数据来源和成熟度仍由证据链负责；其页面阅读顺序后来由后续 brief/Astra 视觉裁决覆盖 | public narrative 及后续 Pages 实现保留产品语言和 provenance 分层；本次不能把 PR2 的原顺序描述成当前 renderer 的最终落实。最终应以后续 brief、页面视觉 diff 与 Astra 视觉裁决为准 | [public-narrative README](../../engineering/release/public-narrative-2026-09-10/README.md)、[pages-ordered-integration README](../../engineering/release/pages-ordered-integration-2026-09-11/README.md)、[semantic-governance README](../../engineering/research/semantic-governance-2026-09-11/README.md)。当前页面没有把外部研究主张写成 CourtWork 结果 |
| 原先的 publish-first 记录曾允许显式手动 Pages dispatch 使用空 capture slots，但本轮最新用户流程已改为：review → visual diff → clean merge → Luna 在 merged SHA 采集 26 张 → push/deploy | 当前仍保持 pending，13 slots 保留 null/空位；不使用 `ALLOW_PENDING_CAPTURES` 绕过门。新流程要求先完成视觉差异审查和清洁合流，再采集并发布 | [pages-ordered-integration README](../../engineering/release/pages-ordered-integration-2026-09-11/README.md)（旧 publish-first 记录）；本条最新顺序来自本轮用户裁决。最终必须有固定 merged SHA、Luna 采集回执、push 与线上主路径核验 |
| 统一截图裁决：UI 完工后，以同一合并产品状态重取全部 current media；旧 specimen `9e5384f` 与旧 media `e818463` 分开保留，不能只换 SHA 冒充新 capture | 当前 product page 仍从 [media/main/manifest.json](../../site/media/main/manifest.json) 的 `source_sha=e818463` 生成安装/contract/source 链接；[product-pages.mjs](../../site/src/product-pages.mjs) 的 checkout 与 blob URL 也直接消费该值 | P1，见下文。根 agent 将在新 ready batch 切换到合并截图 source SHA；修补后必须用固定 SHA 的 CLI gate、build 后 HTML/link 检查确认每个公开链接都指向同一精确 source commit |
| RD-005 多智能体实践选型及当前 roadmap 的范围：研究/分工可进入工程索引，但不凭 research brief 新建 Task、MAS runtime、第二 runtime 或 Work Core 能力 | RD-005 仅以文档接入；semantic-polish 明确不扩大到新 MAS/Task/第二 runtime/Rust，公开 Pages 没有因此获得新的产品能力 | [RD-005](../../engineering/research/RD-005-multi-agent-selection.md)、[semantic-polish README](../../engineering/execution/2026-09-11-semantic-polish/README.md)、[current.md](../../engineering/current.md)。这是范围落实而非发布页面功能；没有发布义务就不新编功能，也不把研究结果当公开产品事实 |
| P0.5 semantic registry：复用 Lucide/vendor/brand 来源账与现有 renderer，渐进迁移；none 是有意表达，不等于缺失 | [registry.json](../../engineering/design/product-semantics/registry.json)、[product-semantics.mjs](../../tools/product-semantics.mjs)、generated projection 与两个 workspace consumers 已落地；no-glyph control 保留可见文字、handler 和 capability owner | registry review 的 representation、owner-anchor、negative-oracle 与 direct-render follow-up 已在 `272a2f1` 有界关闭；全量候选记录 47 entries。其余 Chat G01–G06 真实 lifecycle/backend contracts 未凭 fake adapter 冒充生产能力，仍是明确缺口 |
| VS-01/VS-06 收束：每行要有 surface/state、owner、representation、precedent、evidence、limit；作者与非作者结论分开 | [coverage.md](../../engineering/execution/2026-09-11-semantic-polish/coverage.md) 与 [semantic-polish evidence README](../../evidence/semantic-polish-20260911/README.md) 对 App、Settings、overlay、Pages、registry、测试与限制分层记录；app suite 767/767 | 通过 bounded source/build gates；仍不宣称 native VoiceOver/IME/forced-colors/真实 200% reflow、完整 Pages dark matrix 或 end-user study |

## 发布前问题与当前处置

### P1：公开 product page 仍绑定旧 media source

在审查基线中，[site/src/product-pages.mjs](../../site/src/product-pages.mjs) 读取
`media.source_sha`，并把它用于 checkout 预览目录和公开 blob 链接；
[site/media/main/manifest.json](../../site/media/main/manifest.json) 仍记录
`e818463ab31aa06a4c9d52a968a68099fdb02c3e`。候选产品为
`f99af4695aa5796e703286b0875ec5663cc22c85`，两者之间已有明显 UI 变化。
因此公开的 SOURCE、AVAILABLE TODAY、Run locally 与 contract/method 相关链接可能把用户带回过时 UI。

这不是要求回退到旧 specimen：`9e5384f` 仍是独立历史 specimen identity。
应在新 ready batch 完成后统一切换 current media 与 manifest source，运行精确 CLI gate
验证 `ready` 状态、全部 13 slots、每张图的 source SHA 与指定产品 checkout 一致，
再 build 并 grep/检查生成 HTML 的 checkout/blob 链接。仅改变 manifest 中的 SHA 而不重取或核验截图，不构成关闭。

### P1：capture manifest 的 PNG/JPEG 证据接缝

原始候选基线的 [capture-manifest.json](../../evidence/semantic-polish-20260911/capture-manifest.json)
是 schema v1：41 个路径带 `.png`，但文件字节均为 JPEG/JFIF；v1 还记录了由错误字节解析产生的异常尺寸
`65536 × 4292542531`。这使 v1 不能作为精确 viewport 证据。

同一 worktree 中当前并行修补已保留 JPEG bytes，并将 manifest 改为 schema v2、`.jpg`、
`format/mimeType` 字段与逐文件解码尺寸。Pillow 逐图核验结果为：41 张全部 JPEG，其中
25 张 `1440×1000`、14 张 `390×844`、2 张 `1280×900`。因此此前“全部
1440×1000”的说法已更正。该修补已在固定 commit `0ddb8543a9c90ee5239b1e6717610f6ce372fec5` 中落地：
41 个文件均为 `R100` 重命名，和历史 `d0ccc09` 的 JPEG bytes 逐项相同；
[metadata-verification.json](metadata-verification.json) 记录 `pass: true`、逐项
`sourceBytesUnchanged` 与解码格式/尺寸。`capture-manifest-v1-invalid.json` 保留原 v1 作为审计材料，
不能继续用于 viewport verification。该 P1 的格式、扩展名和尺寸接缝在 `0ddb854` 范围内关闭；
它不等于 current product media 已更新。

对本次修补涉及的三份文档逐项检查：README 只在历史说明中保留“作者原先保存 `.png` 名称”的文字，
并明确指向新的 `.jpg` manifest；`final-combination-independent-review.md` 与
`inspector-usage.md` 的相关 capture 引用已改为 `.jpg`。其余 `.png` 路径仅存在于故意保留的
`capture-manifest-v1-invalid.json` 或其他历史/独立 Pages 证据中，没有发现指向已重命名 capture
的活动文档链接残留。

### P2：dark pair readiness 需保持硬门

[capture-plan.mjs](../../site/src/capture-plan.mjs) 当前 readiness 的 light slot 条件较窄，
dark pair 在 render path 中可选；而 release capture contract 要求同一状态的 light/dark pair。
该门已在 `9298e485efeec086a6df95f504712a4183b9551e` 固定：每个 slot 必须恰好拥有
`1440×900` 的 light/dark pair，两个 entry 的 `source_sha` 必须等于 batch source，且 `state_id`
非空并相同；缺 dark、错 source、错 state、重复 pair 的负例覆盖通过，测试为 5/5。
这关闭了 readiness 规则缺口，但当前 13-slot batch 仍 pending，26 张新截图尚未采集，故不能把
门禁 closure 误读为截图接受或部署完成。

## Fixed-SHA closure

`0ddb854` 同时恢复了已接受的 research three-figure grouping；该变更与 VG-01 的 geometry、
accessible descriptions、figure manifest 职责一致。`9298e48` 随后把 light/dark 同状态配对变成
可执行 gate。两项均是有界源码/证据 closure，不替代新 merged product SHA 上的实际视觉复核。

## 已通过与明确不阻塞项

35 项 Lucide allowlist、47 项 registry、registry tests 8/8、Pages 13 slots/10 figures、
build/link/figure/material/public-data checks 与 app suite 767/767 均通过。Home non-empty
no-glyph render regression 已由 f99 bounded fix 关闭；Inspector/Usage、Home/Settings、
Attention/Spark、Chat semantic facade 的 source/behavior evidence 与其限制已分别登记。

Fake Chat adapter 只用于合成状态矩阵，生产静态 allowlist 不含 demo server；Copy/Edit/path/hash
是已接线的生产动作，G01–G06 等真实生命周期能力仍未实现。该边界保持诚实，不将 demo 状态计入
产品能力。

最终 disposition：`0ddb854` 已有界关闭 capture manifest 的格式/尺寸 P1，`9298e48` 已有界关闭
dark pair readiness 规则 P2；仍保留 P1 旧 current-media source coupling，且最新流程要求先完成
review/visual-diff/clean-merge，再由 Luna 从 merged SHA 采 26 张并更新 media，随后才 push/deploy。
semantic registry、BM/PR2/VG、RD-005 范围与页面产品叙事的有界落实通过源码/build 证据；本报告不替代
最终视觉、线上部署或产品接受。

## Final IA bounded review · candidate at `e12d2e1`

本次只读复核的候选 HEAD 为 `e12d2e1`；七个目标文件（页面 IA、公开文案、样式及 Roles
figure/manifest）相对 `2bbcdf6` 的 combined binary diff SHA-256 为
`ac412601e48baebbd4e5f336757bcfc2dda42f03d431732c4c1ca2146506575a`。
该提交已固定产品改动；工作树剩余的是 current/evidence 并行内容，本节不宣称线上部署或完整原生视觉接受。

源码与构建投影现在符合根 agent 的新裁定：`renderPage()` 顺序为 Hero → Spark/Attention →
Paper/Tour → Home → Matter → Review → `#long-work` pipeline/三图 → Models/Eval/Pricing/Build，
Architecture 与 raw/event projections 留在折叠的 `Research & architecture` details；`primaryEntries()`
将 Paper 保持 `open`。`copy.mjs` 的导航是三项 `Tour / Paper / Release`，Paper 直接使用
`PAPER_ENTRY.href`，Hero 的主 CTA 独立指向 Get/Release。`site.css` 保持窄屏导航 `nowrap`，320 CTA
改为单列，单个目标的最小高度为 48px。独立旧 `longWork()` 已删除，Tour 仍保留 Start/Know/Judge/
Specialize/Control 五组和 13 个 capture IDs。

对当前生成的 `site/dist/index.html` 做了无浏览器静态核对：global nav 精确为三项并包含 Paper 的
Schema-Engineering URL；Paper details 带 `open`；`research-depth#research` 存在且位于 architecture/
raw projections 之前；`#long-work` 位于 Review 之后；没有旧的独立 `longWork` section。相关 gates：
`check-pages-semantics` 为 13 slots/10 figures，`check-product-copy` 通过，capture/public-data tests
5/5，build、links（76 files / 230 references）、figures 与 material 均通过，`git diff --check` 通过。
`check-capture-ready` 按预期因当前 batch pending 拒绝，不属于 IA gate 的失败。

### Public roles figure semantic review · closed at `e12d2e1`

保留的 [roles.svg](../../site/src/assets/figures/roles.svg) 与 [figures.json](../../site/src/assets/figures/figures.json)
已修订公开图示为 `EXECUTION`、`In use`；SVG accessible description 与 manifest alt 均描述“当前使用的
执行配置”，不再暴露 Pi 或 Runtime 实现名。页面相邻文案也为“Expert 定义责任，执行配置承载这项工作”，
与产品语言边界一致。registry 仍保留 `runtime` concept 作为内部 provenance/治理索引，不把它投影到公开
图中文字。Roles 源 SHA 已同步为 `a6ec15e1d79c19e3e443186ebde1ece956043c43a378ad69e00d07eedc211901`，
并由 `figures.mjs`/`check-figures` 校验；更新后的静态图证据为
[rejudged-execution-final-1440.jpg](visual-diff/rejudged-execution-final-1440.jpg)。

复核结果：`node site/build.mjs`、`check-figures`（10 figures，0 problems）、`check-pages-semantics`
（13 slots/10 figures）、`check-product-copy`、`check-links`（76 files/230 refs）、`check-material` 与
`git diff --check` 均通过。该项 P1 在源码、manifest、生成 HTML 与静态图证据范围内关闭；仍不替代 merged
SHA 上的全量 light/dark capture、原生辅助技术验收或线上部署核验。

Receipt reference correction by Astra: the final image filename above points to e12d2e1. Luna’s closure is source/manifest/generated-HTML review; the image is Astra’s author visual evidence, not independent browser acceptance.
