# Files 保留来源与版本比较 · 局部交付

基线 main `4698e0e5036268af40990dd1b5ac12a4c5d124aa`，最终应用提交 `2843116`，隔离分支 `codex/data-surfaces-20260913`。Astra持有Intake、Host、app接线及整合裁决；Luna实现Files/Inspector/Markdown局部消费者，另一Luna独立复核Astra后端与quote/返回glue。作者检查与非作者复核分别记载，不据UI截图声明专业接受。

## 先例与语法

最近已实现先例是基线的 `app/web/materials-view.mjs:createMaterialsView`、`app/web/inspector.mjs:createFileView`、`app/web/markdown-source.mjs:projectMarkdown` 与 `app/web/diff-view.mjs:renderDiff`；原[完整Chat接线回执](../chat-memory-broker-2026-09-12/ui-completion/README.md)保留来源reader和quote证据。这些是实现先例，截图不自动成为已接受baseline。

继续原Files dialog、原生details/select/button、work surface与Markdown reader。增加Session范围的Retained uploads及精确revision身份，当前Workspace files仍是加载时的工作区文件。元数据和hash按需展开；read-only正文可复制/引用，引用保留Session/sourceId/revision/hash及逐行原文。来自Files的原文返回恢复原按钮和列表滚动；Quote返回composer。跨Session关闭旧异步读取。上传保留原草稿，网络重试使用原command ID，内容变化生成新命令；文件选择使用保留BOM的严格UTF-8解码，未编辑时提交原串，避免textarea的CRLF归一改变原字节，编辑后才采用当前文本；CAS失败须显式刷新、尝试打开变化版本再明确保存，该动作不登记已读或专业接受。

版本比较复用现行diff呈现，选择不等于接受，from/to只绑定确切revision/hash；本片没有Core adopted关系。新术语来自[Intake合同](intake-contract.md)，无新增语义色、材质、图标族或动画。显式依赖仅提升原锁定的jsdiff，见[比较合同](compare-contract.md)。保留 source / context / formal / retention owner分离，不建立统一权重或第二资源总线。

## 合成复现与浏览器证据

在仓库根执行 `node engineering/research/data-surfaces-2026-09-13/preview.mjs`，使用生产HTTP端点和独立临时数据库、fake loopback，不访问个人工作区。它输出本次合成端口与Session ID，包含30/45 days的r1/r2、Unicode、长文件名、故意损坏的保留BLOB、无保留历史的旧工作区文件，以及另一Chat的同名独立来源。进程退出即结束预览；临时路径不作为文档事实源。

响应式复用 `app/tests/fixtures/chat-continuity/responsive.html?port=<合成端口>`，用本地静态服务承载该夹具。390×844、1280×900、1440×900为iframe真实CSS布局宽高；宿主截图宽1280，1440使用夹具比例缩放，不能称原生1440设备截图。浅/深六图见[evidence/screenshots](evidence/screenshots)。原始PNG保留宿主余白与夹具标签，不伪装生产页面。

首片实际检查：r1读到30 days，r2为45 days；r1 Quote包含精确身份、焦点在composer且Files关闭。Back与关闭文档恢复同一revision按钮，修复了返回自动刷新替换按钮导致失焦的问题；窄屏键盘关闭同样返回原按钮。损坏BLOB显示完整性失败与Retry，没有回退当前同名文件。另一Chat的同名r1显示独立正文；旧workspace只有legacy.txt而Retained uploads为0，随后通过表单上传新增独立来源，legacy仍未backfill。原文窄屏、长文件名、Files浅深六断点已查看。iframe滚动下自动化坐标点击不稳定的个别步骤改用原控件Enter，未将自动化失败计为产品失败或物理触控通过。

200%系统缩放、原生辅助技术、forced-colors、reduced-transparency及物理触控未跑；本片无新增材质或motion，仍保留既有产品级a11y门。静态token检查不能代替这些设备行为。截图是候选验证证据，未登记为golden。

## 验证记录

- Intake作者8项、独立2项、原workspace14项、最低Node22.19.0的8项见[总回执](README.md)及evidence日志。
- 比较后端与原diff合计8/8，Luna非作者复验范围为精确scope/hash、逐行可重建、限制与无写效应；算法40ms为预算，不是硬实时保证。
- 首片UI作者命令：`node --test app/tests/intake-ui.test.mjs app/tests/inspector-quote-cache.test.mjs app/tests/inspector-presentation.test.mjs app/tests/markdown-source-independent.test.mjs app/tests/markdown-core-read.test.mjs`，26/26。Astra另跑intake-ui/chat-sources/markdown-source三文件11/11。
- `node tools/lint-colors.mjs`、`node tools/contrast-report.mjs`、`node tools/lint-materials.mjs`、`node tools/lint-interaction.mjs`首片通过；最终比较UI颜色/材质/交互/shape检查亦通过，对比度输出见[evidence/contrast-report.md](evidence/contrast-report.md)。

## 最终比较与交互复验

第二片定向UI测试9/9：显式选择与精确sha请求，刷新保留选择，limited不画局部diff，错误重试，pending比较按钮保持可聚焦且响应不抢用户新焦点；文件BOM/CRLF原串与503同command重试；旧Session迟到读文件错误不污染新Session；上传成功与显式刷新焦点恢复。比较成功后错误的Comparing标签及丢焦点已修复。

Astra实际浏览器复验：r1→r2为2 added / 2 removed，完成按钮为Compare且仍聚焦；从比较读取r1再返回，保留选择1→2、已有结果及原读取按钮焦点。显式刷新后选择/结果保持，刷新按钮重新获焦。大来源返回limited、0 diff行且可单独打开原版；损坏旧版拒绝比较并显示Retry comparison。上传成功后表单清空折叠，焦点在新增source summary。最终比较浅/深 × 390/1280/1440六图已逐一查看；[18张截图的hash与尺寸](evidence/screenshots.json)区分第一片和扩展比较fixture，不将iframe宿主缩放等同系统200%缩放。

[独立有界复核](independent-review.md)保留角色、SHA和未跑项；全量结果另随总回执记录。未连接付费Provider、未迁移个人数据，未执行push或部署。

整合首跑为910/912：[原始失败日志](evidence/full-app-tests-initial.log)如实保留。两处遗漏均已修正：renderer admission的隔离源码复制增加Intake目录，仍执行原先404/200/邻接私有路径断言；[raw consumers](../../design/product-semantics/raw-consumers.json)逐条登记named read、既有file.object及CSS identifier，并移除失效旧refresh行，没有放宽扫描器或断言。[修复定向4/4](evidence/integration-fixes-tests.log)通过。

最终同一应用源码的完整重跑[912/912](evidence/full-app-tests.log)通过，耗时185.73秒；原失败日志不覆盖。最终非作者UI9/9及整合修复4/4通过，证据不扩大为全产品或设备辅助技术接受。
