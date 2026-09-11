# Pages v3 · 集成与验证

2026-09-11；Astra单写，隔离分支`codex/pages-v3-integration-20260911`，基线`f35968cf86d89064141acf5098564ce58183a9c5`。范围为已授权的Claude候选接收、Home/Tour图与用户追加Hero Paper按钮。此记录不关闭App产品门或Runtime研发项。

## 变更与最近先例

- Home选择P1-2，置于双原子/主阅读入口之后、实际Home截图之前；Tour在JUDGE的Review后选择P2-3。来源、选择理由和未采纳项见[v3裁定](../../engineering/research/se-control-design-return-2026-09-11/v3/README.md)。
- 最近实现先例：`site/src/page.mjs`的archive-stack、productAtoms与long-work；`site/src/assets/figures/pipeline.svg`的figure-scroll，以及`state-to-commit`的静态文字等价。此前已发布证据见[回执](../semantic-polish-merge-20260911/publication.md)。
- 保持Matter/Run/Review owner和candidate/正式版本边界。变更的是campaign编排和SVG宽窄view；`figures.json`/pages-map登记四资产及相同语义键。无新App token、状态或权限，App视觉grammar不受Pages样式反向改变。
- Hero沿既有actions：用户先要求Paper红阅读入口，随后明确改红Button。桌面三项横排，窄屏三项各自单行、等宽且左边界齐平（用户后续明确要求拉齐宽度）；48px最小高度，浅/深用既有attention红与paper前景，forced-colors用ButtonFace/ButtonText。该精确selector登记为用户授权阅读强调，非pending Review实例。
- 修正README生成源与main已裁架构段落一致，保留README现内容；无产品文案回退。

## 检查与限定

初轮29/34浏览器检查通过，5个失败是旧门残留：8步而main实际7步、旧pricing/caption/no-JS文案，以及home外层section与实际figure重复slot时取错节点。原[初轮日志](first-verification.log)保留。更新门对应当前main实际编排，仍检查每步可达、键盘、完整回放、真实capture和无JS内容，不以删掉行为门消除失败。

新增门覆盖跨页面figure登记和同claim的宽窄view；V11检查Home/Tour的1440/1280/390明暗、无JS、forced-colors、灰度、200%等效缩小viewport，并保存局部图及Hero。它不是操作系统原生200%缩放或VoiceOver验收。静态图无新motion；空/失败/处理中来自保留的实际合成截图，不虚构新交互状态。

构建、链接、capture-ready、material、figures、public-data/capture-plan测试及仓库color/material检查已跑；最终机器结果见[浏览器记录](browser/verify.json)及[局部矩阵](figures/continuity-matrix.json)。颜色lint适用原App范围，不替代Pages实测contrast。全量App测试不适用本次纯Pages源/门/文档变更。

作者实际画面判断、非作者结果与线上回执在完成后补充；未记录的项目不能推为已通过。共享main现场逐项保留，无checkout/stash/reset，无付费provider、外部消息或个人数据使用。

## 作者视觉检查与扩展检查

作者已查看新P1/P2宽窄浅深局部、Hero浅深及窄屏按钮；原生浏览器现场确认第三按钮由轻链接改实心红，再按用户要求拉齐三项宽度。关系读序与长标签完整，宽/窄切换不复制可见内容。实际矩阵另含灰度/forced-colors/等效200%，未声称VoiceOver或原生系统200%通过。

扩展运行旧`verify-product-pages.mjs`为31/36；[原日志](legacy-product-page-check.log)保留。失败涉及历史get/CLI文案、旧11状态/9图与Capture provenance预期（main已是13/13且移出公开施工旁白），以及浏览器自动请求根favicon被旧子路径检查当外链。该脚本未作为本次发布通过证据，也未在本轮改写；本轮新Tour有V9/V11实测，公开资源有check-links/capture-ready门。get/CLI源码未变，旧门维护另续。

静态负向校验确认改坏Tour挂载名或SVG正文都会拒绝，见[结果](negative-checks.json)。第一次重复构建比较因构建前的测试脚本变更进入manifest而失败；冻结源码后重新做两次构建比较，最终结果另附，不把该准备期比较说成已通过。


最终作者主验证 **54/54通过**；源码冻结后两次构建 **104文件逐字节hash一致**，见[复现记录](build-reproducibility.json)。负向门 **2/2拒绝**。静态检查日志check-0–7依序对应links、capture-ready、material、figures、public-data/capture-plan、colors、contrast-report、materials；文档链接结果见[日志](doc-links.log)。这些结果不覆盖上文列明的旧扩展脚本失败或原生未跑项。


## Astra接收裁定

候选固定`04943b820ff99b177692aef047c496f138f15fbc`。[非作者源码复核](independent-review.md)判定该有界范围PASS，无源码阻断，未独立重跑浏览器或build。Astra据固定源、作者实拍和非作者源码结果接受本次Pages变更并依既有授权合推/发布；独立源码PASS不冒充完整产品接受，旧扩展门/原生未跑项如上保留。部署结果单独记录。


[发布回执](publication.md)：b9dc3f6已合推，手动部署34583848361成功，线上6项字节一致。
