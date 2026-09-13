# 前端 Audit · 首批交付

2026-09-13。基线 `ad33118a56ae15f1c3244e97147bd63c234e6916` → 产品提交 `9525215`（main）。用户授权直接当前main；Astra裁决与实现，Luna快速探索和非作者有界复核。[Plan](PLAN.md)持任务范围，[工单](work-orders.md)持剩余消费项。没有push或部署，不代表整体前端/Release接受。

## 结果与根因

Spark空关闭按钮已在独立合成Host复现：在线可见，Host停止后重开浮层外部SVG use不再绘出X。共享 `icon()` 改为加载时导入固定源生成的不可变几何，再用 `createElementNS` 注入原生SVG子节点。所有既有调用均沿此入口；原图形、源版本及license不变。原sprite仍保留作溯源，不再是控件重绘的网络依赖。flowRow的文本字符披露箭头改为同族SVG。图标准入与文本配合见[IC-9](../icon-controls.md)。

Spark/Usage复用Files固定header和内部滚动body关系。短视口原Close top=-137px；修复后滚到底部Close保持可见，窄屏命中区44px。两个读面保留各自宽度及数据owner，没有改为新材质或通用导航状态层。

Attention items去掉重复eyebrow、口号及空详情装饰标题；Chat去掉重复导语，将介绍改为默认收起About chats，会话行恢复左对齐；Settings Memory简述本设置面不可用与Sources独立，删除重复说明和Keyboard空介绍。状态、范围、来源、未知与风险语义保留。Usage暗色高值格图例从Darker改为Higher-contrast cells。

## 真实浏览器路径与证据

Chrome原生与Codex内置浏览器，由CUA控制；后续内置浏览器使用独立localhost:8847。个人工作区/凭据未读写。默认示例与实际合成记录在下表明确区分。合成Host使用local-fake，唯一脚本Run读取60段合成材料，5个模拟token，未调用付费Provider。材料r1/r2和会话身份见[fixture](evidence/synthetic-fixture.json)。

| 步骤 | 实际观察与处置 | 证据 |
|---|---|---|
| 1 原图/原断连页 | 空控件外观，不单凭图片认定根因 | [用户图](evidence/00-user-spark.png)、[原断连页](evidence/01-original-disconnected.png) |
| 2 Spark在线→停Host→重开 | 在线X可见，断连重开X空白；修复后X由本地path绘出，Escape回Spark触发点 | [在线](evidence/02-spark-current.png)、[复现](evidence/03-spark-disconnect-repro.png)、[修复后断连](evidence/05-spark-offline-fixed.png) |
| 3 Usage/Settings基线 | Usage与Spark同级观察面；General承重权限说明保留，Memory重复说明裁减 | [Usage](evidence/04-usage-overview-before.png)、[General](evidence/06-settings-general-before.png)、[Memory前](evidence/07-settings-memory-before.png)、[后](evidence/17-memory-fixed.png) |
| 4 Attention示例items→详情→返回 | 原两级返回与触发焦点可用；去装饰保留对象和next/context。最终空态为实际合成项目 | [列表前](evidence/08-attention-before.png)、[详情前](evidence/09-attention-detail-before.png)、[items后](evidence/26-attention-items-after.png) |
| 5 Spark示例长表/窄屏/短屏 | 390×720及640×360检查；原根滚动藏起Close，改内部滚动后退出可达 | [示例](evidence/10-spark-sample-before.png)、[窄屏](evidence/11-spark-narrow-before.png)、[缺陷](evidence/12-spark-short-scroll-before.png)、[修复](evidence/13-spark-short-scroll-fixed.png)、[暗色](evidence/18-spark-dark-fixed.png) |
| 6 Chat入口与按需说明 | 主动作和Continue直接可达，About默认收起，打开后仍有Attention/Spark真入口 | [前](evidence/14-chat-page-before.png)、[后](evidence/15-chat-page-fixed.png)、[About](evidence/16-chat-about-fixed.png) |
| 7 实际合成Usage→日→run→Chat | 固定observation下显示1 run/5模拟tokens，进入对应Run后Back to chat回会话；缺原位回图表动作，登记FA-06 | [暗色实数](evidence/19-usage-live-dark.png)、[下钻](evidence/20-usage-drilldown.png)、[Run](evidence/21-run-tool-native-chevron.png) |
| 8 Chat files→r1 reader→关闭 | reader表明Retained upload r1及采用未知；关闭回Files原r1按钮，展开列表和焦点恢复 | [reader](evidence/22-files-retained-reader.png)、[返回](evidence/23-files-return-focus.png) |
| 9 Files r1→r2 Compare | 实际diff显示1 added/1 removed；按钮仍Comparing…，登记FA-09，不称全链无问题 | [diff](evidence/24-files-diff.png) |
| 10 Attention agent与items分开 | agent面仍有长空态文案，留下一批裁定；不是已修items页面 | [agent原状](evidence/25-attention-after.png)、[items后](evidence/26-attention-items-after.png) |

图21记录工具披露所在Run；DOM检查summary.flow-row含2个SVG、0个use。06起配套同名txt保存DOM快照。截图证明可见状态，焦点/返回通过实际动作及DOM另核。完成后合成浏览器主题恢复System，视口恢复默认。

## 验证及上限

- 作者全量：`node --test --test-concurrency=4 app/tests/*.test.mjs tests/*.test.mjs`，**915/915**，见[原始日志](evidence/tests-full.txt)。覆盖共享SVG变更、静态路由及已有运行时回归。
- 最终仅Usage图例文案增量后：product-icons、spark-live、chat-page、chat-work-shell四文件，**21/21**，见[日志](evidence/tests-final-targeted.txt)。
- `node tools/lint-interaction.mjs`、`lint-colors.mjs`、`lint-materials.mjs`与`git diff --check`均通过。原SVG与生成数据逐枚几何等价，数据嵌套冻结，已在product-icons回归覆盖。
- [Luna非作者复核](independent-review.md)独立记录范围及命令；没有把作者截图冒称第二人浏览器验收。
- **未测**：真实200%浏览器缩放、完整Tab/Enter/Space矩阵、真实触屏、中文长标签、全部skin与降透明设置、全套menu/popover与生产provider/正式Review状态。640×360是短视口测试，不替代200%。Files比较完成按钮异常、Usage原位返回和全局FE-NAV仍开放。

## 后续裁决

优先消费FA-06的同一观察下局部返回和FA-09的比较按钮状态；并补齐200%/键盘代表路径。跨对象历史沿原FE-NAV owner；Home/Attention agent的说明逐句裁定，通用Back/Refresh按IC-1登记SVG或SVG+文字增量，不机械变成icon-only。此轮没有需要新增后端事实的已实施项目；能力未知、生产投影和正式接受仍由原服务/领域合同持有。
