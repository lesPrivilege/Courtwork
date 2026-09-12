# 数据工作面 · 接收、裁决与串行实施

2026-09-13；基线main `4698e0e5036268af40990dd1b5ac12a4c5d124aa`。用户补交资料后授权Luna explore登记缺口、继续串行实现，优先成熟机制，由Astra持有架构与共享owner写权。当前施工保持独立合成数据，不使用个人账号导出或凭据。

## 原件与缺口登记

[接收回执](receipt.json)保留新ZIP、完整版本/优先级稿与用户粘贴原文；两份重复Harness ZIP与原归档SHA一致，不重复建实施线。[资料治理包](inputs/courtwork-chat-governed-data-2026-09-12/README.md)13文件hash、17来源、7通道和6片依赖校验通过。其状态为研究输入，包内HANDOFF不改变本地权限。[完整数据工作面稿](inputs/CourtWork-data-surfaces-version-priority-2026-09-12.md.txt)与[粘贴](inputs/pasted-text.txt)完整保留。粘贴所提 `CourtWork-data-surfaces-2026-09-12.zip` 未作为本次附件提供；完整MD足以支持本轮消费，不据此声称该ZIP已收到。MD内部U1相对链接指向该未附包中的研究原件，未得到该文件；原MD以`.md.txt`原字节归档，明确保留缺口，不伪造目标或将其当已核验来源。

此前最后turn的“附件未收到”是历史事实；本次实际补收上述文件。新包A–F不新增PR编号或覆盖旧包20卡。当前顺序沿[保留Pi与局部Expert](../../release/harness-implementation-2026-09-12/harness-dogfooding.md)，同步修正roadmap的旧强制串行表述。

## Astra采用与施工顺序

采用资料列表、工作纲要、正文优先、版本比较、关系清单先于图。保留、披露、专业接受、工作优先级与context偏好分别归原owner；不建设第二Resource Fabric，不把上传变成Core Artifact。复用原生DOM、Files/Inspector、Markdown和diff呈现；存储事务采用SQLite公共接口，领域判断由现Core负责。

| 片 | 当前实际缺口 | 决定 |
|---|---|---|
| A / LG-00责任与场景 | 输入/版本/效力容易合并；旧roadmap顺序过时 | 本页、第一片合同及反例先冻结 |
| B / LG-01 / RG-BE-01、03 → RG-FE-01、02 | 上传只覆盖工作区，无保留来源身份/历史；现Sources仅Core/Run | 首片：主动上传UTF-8文本的Intake保留、精确版本reader、原Files入口列表与引用 |
| C / RG-FE-03（RG-BE-04/05仍保留各自缺口） | 没有资料版本比较；泛化检索尚无合法来源集合 | 第二片：同一保留来源两个确切版本的确定性比较；不冒充已实现索引、annotation或授权检索 |
| 选择与准备 / LG-02 | 缺字段owner、scope和预算回执 | 保留合同，不画总weight或伪可用偏好控件 |
| D / E | 官方bridge与容器无真实账号/通道验证 | 无自动安装/登录/公网或付费调用；本地读取可独立成立 |
| F / 工作闭环 | 跨工作源关系和正式判断需原owner合同 | 保留typed关系与原Work Review接缝，不把来源变化/已阅变成关闭 |

Luna只读核到：没有可直接复用的通用Intake ledger；`RuntimeService.addMaterial`只写当前工作区，Core source_history受Matter owner管辖，ArtifactHistory仅保留Run/受信回执。可复用原机制，不能借已有store名字混同写权。首片反例见[合同](intake-contract.md)。本页随实际交付补充证据，不把登记等同实现。

## 第一片后端回执

Intake schema1已接现上传端点；列表/版本/精确reader按Session限制，正文与manifest同SQLite事务，工作区投递由独立回执对账。[作者8项](evidence/intake-tests.log)与原workspace14项通过；Luna指出复用BLOB完整性和删除/上传竞态，修复后两项[独立测试](../../../app/tests/intake-independent.test.mjs)与作者合计10/10通过。独立测试覆盖删除前后顺序与关闭等待/拒新。最低Node22.19.0 [8/8](evidence/intake-node22-tests.log)通过，官方临时运行时[hash](evidence/node22-runtime.json)已核验；本机Node25.9.0亦通过。第一片前端已接入Files、Inspector和quote，详见[UI交付](ui-delivery.md)。不据此关闭LG/RG整单或专业接受门。

## 第二片与边界

第二片采用已锁定的jsdiff实现同来源精确版本比较，严格读取两端revision/hash，超限显式limited且不发布局部结果。[比较合同](compare-contract.md)与[8/8测试](evidence/compare-tests.log)保留字节重建、scope/hash、无写效应及大行回退证据；最低Node22.19.0亦[8/8](evidence/compare-node22-tests.log)。

本次实际交付限于主动上传UTF-8文本；现材料入口有可留存原文、精确reader和版本比较。不具备通用来源授权、多账号官方导入、目录捕获/PDF/OCR、跨工作retain/bind、annotation、索引/context优先级或图谱关闭逻辑。下一步按真实工作消费者先补合法范围与Core绑定接缝，再推进索引/上下文；不因局部库可用提前创建总线或泛化评分。

[非作者有界复核](independent-review.md)登记后端、比较和composer glue的实际范围；修复发送中Quote绕过只读锁的问题，5场景源片段复验通过。它不代替全量应用集成回归。

## 整合结果

最终应用提交 `2843116687869aa32e0f2716284aa6f5feef5086`。[全量应用测试](evidence/full-app-tests.log) **912/912** 通过；首跑两处集成遗漏与修复如实保留在[UI交付](ui-delivery.md)。最终UI非作者9/9，整合修复非作者4/4，静态语义消费者46项、copy/Pages映射、颜色/材质/交互/shape与文档链接检查通过。Files与比较各浅深六断点、原文/引用/返回、空历史、跨Chat、完整性失败和超限已做合成浏览器验证。

代码完成不等同运行中Host已热更新：已有本地主机需正常重启后加载新的Intake后端；本轮没有重启个人Host或读取其数据。合成预览可独立复现；没有push、部署或付费请求。现有其他写入者的工作区改动在本地main合流时保留。

[本地main合流记录](evidence/main-integration.json)：83个交付路径，原有61个文件字节不变，current.md原12行局部改动经三方合并保留，原暂存区为空。
