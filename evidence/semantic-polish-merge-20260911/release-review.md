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
| 原先的 publish-first 记录曾允许显式手动 Pages dispatch 使用空 capture slots，但本轮最新用户流程已改为：review → visual diff → clean merge → Luna 在 merged SHA 采集 26 张 → push/deploy | 当前已完成 26 张采集，13 个图位均有 light/dark 配对；不使用 `ALLOW_PENDING_CAPTURES` 绕过门。仍须完成最终文档回执、push/deploy 与线上主路径核验 | [publication.md](publication.md)、[capture records](capture-records.json)、严格 readiness gate；旧 publish-first 记录保留为历史说明 |
| 统一截图裁决：UI 完工后，以同一合并产品状态重取全部 current media；旧 specimen `9e5384f` 与旧 media `e818463` 分开保留，不能只换 SHA 冒充新 capture | 当前 product page 从 [media/main/manifest.json](../../site/media/main/manifest.json) 的 `source_sha=f1373cde` 生成安装/contract/source 链接；[product-pages.mjs](../../site/src/product-pages.mjs) 的 checkout 与 blob URL 消费该值 | 源码、manifest、生成 HTML 与 `check-capture-ready` 通过；独立 reviewer 回执链接仍待补齐，见最终 receipt |
| RD-005 多智能体实践选型及当前 roadmap 的范围：研究/分工可进入工程索引，但不凭 research brief 新建 Task、MAS runtime、第二 runtime 或 Work Core 能力 | RD-005 仅以文档接入；semantic-polish 明确不扩大到新 MAS/Task/第二 runtime/Rust，公开 Pages 没有因此获得新的产品能力 | [RD-005](../../engineering/research/RD-005-multi-agent-selection.md)、[semantic-polish README](../../engineering/execution/2026-09-11-semantic-polish/README.md)、[current.md](../../engineering/current.md)。这是范围落实而非发布页面功能；没有发布义务就不新编功能，也不把研究结果当公开产品事实 |
| P0.5 semantic registry：复用 Lucide/vendor/brand 来源账与现有 renderer，渐进迁移；none 是有意表达，不等于缺失 | [registry.json](../../engineering/design/product-semantics/registry.json)、[product-semantics.mjs](../../tools/product-semantics.mjs)、generated projection 与两个 workspace consumers 已落地；no-glyph control 保留可见文字、handler 和 capability owner | registry review 的 representation、owner-anchor、negative-oracle 与 direct-render follow-up 已在 `272a2f1` 有界关闭；全量候选记录 47 entries。其余 Chat G01–G06 真实 lifecycle/backend contracts 未凭 fake adapter 冒充生产能力，仍是明确缺口 |
| VS-01/VS-06 收束：每行要有 surface/state、owner、representation、precedent、evidence、limit；作者与非作者结论分开 | [coverage.md](../../engineering/execution/2026-09-11-semantic-polish/coverage.md) 与 [semantic-polish evidence README](../../evidence/semantic-polish-20260911/README.md) 对 App、Settings、overlay、Pages、registry、测试与限制分层记录；app suite 767/767 | 通过 bounded source/build gates；仍不宣称 native VoiceOver/IME/forced-colors/真实 200% reflow、完整 Pages dark matrix 或 end-user study |

## 发布前问题与当前处置

### P1：公开 product page 的旧 media source（已切换）

审查基线中的 [site/src/product-pages.mjs](../../site/src/product-pages.mjs) 读取
`media.source_sha`，当时 [site/media/main/manifest.json](../../site/media/main/manifest.json) 记录旧的
`e818463ab31aa06a4c9d52a968a68099fdb02c3e`，因此公开 SOURCE、AVAILABLE TODAY、Run locally 与
contract/method 相关链接可能把用户带回过时 UI。最终批次已切换到 `f1373cde341b5a17299fad6ba5921ba3fcc43824`。

这不是要求回退到旧 specimen：`9e5384f` 仍是独立历史 specimen identity。
新 ready batch 已统一切换 current media 与 manifest source；精确 gate 验证 `ready` 状态、全部 13 slots、
每张图的 source SHA 与指定产品 checkout 一致，build 后生成 HTML 的 checkout/blob 链接也已核对。旧图未被
改 SHA 冒充新 capture；旧 manifest 与图片仍由 archive 保留。该 P1 的 source coupling 已有界关闭。

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
dark pair readiness 规则 P2，最终 `f1373cd` 批次已关闭旧 current-media source coupling；仍须完成
独立 capture-review 回执、push/deploy 与线上主路径核验。
semantic registry、BM/PR2/VG、RD-005 范围与页面产品叙事的有界落实通过源码/build 证据；本报告不替代
最终视觉、线上部署或产品接受。

## Final IA bounded review · candidate at `e12d2e1` (pre-capture source review)

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
当时 `check-capture-ready` 按预期因 batch pending 拒绝，不属于该 IA gate 的失败；最终 ready 批次的 receipt 见下文。

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

## Final merged capture source/provenance receipt · `f1373cde`

最终采集脚本 [finalize-captures.mjs](finalize-captures.mjs) 将产品来源固定为完整 SHA
`f1373cde341b5a17299fad6ba5921ba3fcc43824`。当前 [main manifest](../../site/media/main/manifest.json)
与 [capture records](capture-records.json) 各含 26 条记录、13 个图位，每个图位恰有一组 light/dark；
每对 `state_id` 相同，全部记录的 `source_sha` 均为该 SHA，原生 JPEG 均为 `1440x900`。逐文件的字节数与
SHA-256 已由 finalizer 写入 manifest，并由 `site/build.mjs` 重验。

旧批次交接可复现：归档 [main-e818463.json](../../site/media/archive/main-e818463.json) 与
采集源提交 `f1373cde:site/media/main/manifest.json` 的 pre-switch 字节一致（SHA-256
`47c4a9150a9fb9e556af242d4c3055f2d16b993988b3a48f1e6f00f87a2da4b0`），其 15 个旧 JPEG 的 manifest
哈希逐项匹配；新 JPEG 位于 `site/media/merged-20260911/`，没有复用旧图。`capture-plan.mjs` 已置为
`ready` 并 pin 同一来源，`check-capture-ready` 通过。

Get 页面来源派生也已核对：生成的 `site/dist/get.html` 中 checkout 命令、Installation details 与 roadmap
链接均指向完整 `f1373cde…`，不再指向旧 `e818463`。构建 manifest 同时保留 `9e5384f` 作为固定 specimen/
benchmark evidence identity，并记录 `product_media_source_sha=f1373cde…`；这是两条有意分离的证据链，Get
页面使用当前 product-media 来源。

本轮源码/生成物核对通过：build、capture readiness、Pages semantics（13/10）、figures、copy、links
（104 files/262 refs）、material 与 `git diff --check` 均通过。尚有一个证据接缝待独立 reviewer 回执：当前
manifest 每条记录的 `evidence_path` 指向 [capture-review.md](capture-review.md)，但该文件在本次核对时尚未
落盘，因此 `node tools/check-doc-links.mjs` 以该缺失目标失败。该缺口会使发布 provenance 链不完整；补齐并
提交独立 image/API review 后再重跑文档链接检查即可关闭。上述记录不构成独立浏览器摄影或产品接受声明。
