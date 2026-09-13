# P12-A 前置 · 默认测试与独立Runtime检查

2026-09-13，用户授权开始施工并指定Luna explore、Sol worker、Astra裁决/架构/模型能力瓶颈实现。本片沿[增量计划](../../engineering/release/review-intake-2026-09-13/README.md)的第一施工片，不代签完整P12-A或G1–G5。

## 固定候选与分工

初始main为`ad33118`；期间前端修复`9525215f556758f09cd60916edf4ad03db181802`进入main，已在隔离分支合入。Sol实现`d05c347`，组合候选`448e8f1d2fc5382e1dc95a0203c5a24b832c07a9`。Luna只读召回与非作者有界核查；Astra做合同裁决、诊断、全量验证和集成。源码与数据目录隔离；未checkout/stash/reset共享UI工作树。

五个实施文件：app/package.json、app/scripts/product-check.mjs、app/README.md、根README.md、.github/workflows/runtime.yml。默认suite并发4，load同suite并发8，check:product串行test→确定性smoke→文档链接。Runtime CI为独立只读权限workflow，main push/PR/手动触发，Ubuntu下Node22.19.0和24.x矩阵，Python固定3.12。CI文件交付不等于远端执行通过。

## 归因与裁决

Luna召回确认普通fixture的ready2000ms、专用no-ready80ms和生产5000ms分别属于不同合同。历史低并发通过、单测复跑通过都不能证明调度竞争是唯一原因。固定4作为可验证的默认资源预算，不降低超时/取消/未知结果/回收断言，也不修改生产Core。

[初次Node25启动观察](startup-node25.json)的45次中首个并发1冷启动超过2000ms，失败后worker正确回收；同一批其余44次成功。该时段同时安装依赖，结果不足以区分冷启动、主机调度与其它环境因素，不能仅归因高并发。失败原件保留。

[Node22启动观察](startup-node22.json)在1/2/4/8各三批共45次全部通过，最大ready约50ms；未改fixture或生产超时。这是启动/关闭小探针，不是完整suite竞争复现，也不是Node版本因果对照。[诊断脚本](startup-probe.mjs)使用独立合成worker和目录，不打开产品数据库。

Node最低版本来自[官方22.19.0发行](https://nodejs.org/en/blog/release/v22.19.0)，tarball按官方SHASUMS256校验。环境与lock身份见[environment.json](environment.json)。Node的文件并发机制见[官方CLI说明](https://nodejs.org/download/release/v22.19.0/docs/api/cli.html#--test-concurrency)；并发4/8是本地工程合同，不是上游性能保证。

## 验证与后续

结果在各原始log及最终交付表中记录。任何失败保留，不用单测复跑替代完整suite失败；只有固定候选默认命令连续三次通过、专用故障仍成立、独立审阅无阻断后才接受本片。

下一片沿P05/P06与DF-06补组合证据，现有input/control/compaction/request telemetry与MCP反例先消费，不重做P01/P02/P02b。Core待Review摘要和G1–G5继续开放。无真实Provider、个人数据迁移、push或部署。

[DF-06预备组合证据](capability-lifecycle.md)由Sol实现、Astra独立复跑、Luna只读复核，实际覆盖及clean restart/manager seam上限单独列明。

## 本片接受

Astra结合Sol实现、Luna非作者runner反例/源码复核及本地结果，接受测试合同前置片；DF-06组合只接受上述有界范围。完整结果见[results.json](results.json)：Node22.19并发4默认三轮均915/915（214.1s、213.3s、213.9s），首轮check:product含smoke和文档检查通过；增加生命周期测试后的8461ff2并发8完整916/916（183.1s）。专用Core lifecycle 13项随每轮全量通过，所有超时值未变。

默认三轮产品/测试/runner源码一致；第一轮启动于448e8f1，随后7c58f45仅调整CI YAML，等价范围已在环境/结果文件记录。第三轮期间Sol在另一独立树跑过约4.6s的单文件定向验证；默认命令自身仍为并发4。本地fresh npm ci --ignore-scripts在Node22.19完成，lock未变。

这些结果不证明旧冷启动失败的唯一根因或永不flaky，也不证明Linux/Node24 CI已经执行。GitHub Runtime workflow本轮仅交付配置，未push触发。非作者检查上限见[review](non-author-review.md)。

## 本地主线交付

[整合回执](integration.json)固定本地产品main d0b18ce及与8461ff2的源码等价关系。整合前102个未提交文件逐项核对；唯有并行前端writer的ia-full.txt在执行期间继续追加，本片未写入该文件。current仅增量登记本片，既有research段落保留。共享工作区后续UI在途内容不属于上述固定候选测试范围。

本片未push、未触发Pages/Runtime远端workflow或创建Release。下一施工重点为P05/P06实际输入与压缩/下一Run身份关联，再补剩余DF-06与Core Review接线。

格式检查补充：首次对全部已暂存交付运行diff --check时，冻结附件原件的Markdown双空格换行被报告为trailing whitespace。原件必须保留字节，未修剪；随后排除这一原件对本片活动文件检查通过，原件SHA-256再次一致。此项不涉及运行测试失败。
