# NDA producer contract · 实际缺口与修复

Astra作者/架构，Luna非作者源码复核与定向验证。产品`4cc919c41b661a7eff5a522e6057197c8fd7dc3b`，前基线`01f37f0`。原[Plan](../../engineering/release/review-intake-2026-09-13/README.md)要求真实合成专业闭环，不以已有脚本payload通过冒称模型知道如何提交。

## 缺口

`app/extensions/inbound-nda/index.mjs`原工具只声明`domain: object`，context只有playbook/facts和一句指令；`app/domains/inbound-nda/index.mjs:verifyReview`则要求完整version/findings/reconciliation、精确anchors及逐字reason。实际Pi路径没有二次schema enrichment。既有`nda-runtime`与fixture先调用buildReview再送scriptInput，只证明有效payload的处理。新[修前失败](producer-before.tap)在真实Pi wire上确认缺少required字段。

第一尝试因隔离目录尚无依赖失败，保留[setup错误](producer-setup-failure.tap)，随后仅为隔离测试链接独立clone已安装的只读node_modules；该setup错误不归因产品。中间一次断言把Work context误当system prompt导致[失败](producer-intermediate.tap)，实际Host以任务context消息注入；修正的是测试观察层，未把上下文挪入system。

## 裁定与实现

新增`app/domains/inbound-nda/protocol.mjs`，公开完整model-facing schema和静态canonical reason模板/推导规则。原evaluator的所有reason literals移动到同一字典，动态recipient编号沿同一format函数替换；状态判定、证据范围、verifyReview和Core写入/人的接受逻辑保持。它不导入fixture、source或当前facts来生成答案，不增加tools/state/store/权限；`se_submit_candidate`仍是原工具。

模型仍须读取获准source，按规则与facts选择status、构造真实Unicode code point anchors、选择固定reason并按自己的finding顺序生成reconciliation。这个设计不要求人猜一个隐藏的格式，也不把确定性builder答案偷偷填入prompt。静态模板不是法律判断能力或当前答案。

[新测试](../../app/tests/nda-producer-contract.test.mjs)检查真实Pi最终tool schema/context，并用不调用buildReview的reference producer从公开schema/静态模板/获准Unicode source组包，得到pending Candidate而非Artifact。该reference producer使用已知合成normal facts，**不是模型理解或专业准确率实验**。原domain gold hash与恶意status/accept拒绝测试继续通过。

[作者12/12](producer-author.tap)；Luna按Node22.19、文件并发1执行producer/domain/runtime/architecture-boundaries/input-binding，[非作者18/18](producer-luna.tap)。复核确认静态契约与原source/scalar/各rule/reconciliation分支一致。Luna提出两处precision措辞，最终产品将finding任意顺序明确为合法、first occurrence明确为紧凑producer convention；未改validation。最终源码的完整product检查另在本目录README记录，不把这次18/18移称全量。

[首个工作文档](../../app/docs/first-work.md)给出可复制的既有合成source/facts与GUI路径，并明确Local test普通prompt不执行model-authored review。NDA合同原“renderer未实现”已按实际源码和GUI证据改正。没有修改公开Pages商业展示、个人简历、模型连接或凭据。
