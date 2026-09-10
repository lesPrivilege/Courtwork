# 视觉编译器概念 · 研究输入登记

状态：用户授权入账；方法候选，不是产品实现、skill 安装或新架构裁决。基线 main `d22eb66ef1b335b95202c8c0a34c425acb59a2f9`。

## 来源与完整性

[视觉编译器概念](chatgpt-conversation://6aa2b3ac-963c-83ec-934f-894054705403)经一次成功读取取得2个completed turn、4条消息；page limit=10、order=newest_first、hasMore=false、nextCursor=null。已读完整正文，包括用户预览在“三件套”附近截断的后半部分。原始接口返回正文保存在 [conversation.json](inputs/conversation.json)，附件 [IMG_2406.jpeg](inputs/IMG_2406.jpeg)原字节保存并已目视读取；[manifest](source-manifest.json)记录消息ID、字节和SHA-256。

截图是“知识分享官”关于 lan Xiaohei Illustrations 的帖子及插图示例，仅证明截图可见内容，不证明 skill 可用性、许可证或效果。对话中的外部阅读自述、Kami 功能数量、文件形状及设计规则均为转交输入，本轮未访问/核验上游。opaque citation 无 URL 映射，保留原文、不补造引用。原始接口中的临时附件路径仅作历史出处，活动引用使用本包相对路径。

## 逐项处置

| ID / 来源 | 原讨论内容 | 本地处置与召回 |
|---|---|---|
| VC-01 / T1 | 从文字关系到可重复视觉表达，semantic illustration grammar；subject/relation/state/emphasis/audience/surface输入 | 登记方法候选，不创建courtwork-illustration skill；消费时先判断是否需要视觉 |
| VC-02 / T1 | Event/State/Context、Store→Govern→Retrieve→Compile、Attention、Spark、Experts、runtime、schema、compaction、人类判断分叉等解释题材 | 保留完整原文作为选题库，不把隐喻当已交付能力；Spark后台活动、热插拔Expert、runtime替换须按真实合同与成熟度标注 |
| VC-03 / T1–2 | icon稳定交互语义、diagram精确关系、illustration解释隐喻分流 | 与现有[icon controls](../../design/icon-controls.md)及[Visual Grammar](../../release/publishing-visuals-2026-09-10/README.md)分别消费；不允许生成侧栏/工具栏canonical icon，不更换家族 |
| VC-04 / T2 | intent→execution contract→content IR→schema→layout→render→QA；content.json保存brief/content与原子事实 | 候选设计生成协议；“Kami已如此实现”未核验，不新增产品IR/schema或正式状态owner |
| VC-05 / T2 | semantic brief先定claim，再定placement/reference/exclusions/grammar/complexity/focal/direction/QC | 候选brief字段；与来源、成熟度和最小显示尺寸关联，禁止虚构UI/版本；须先有具体消费者再立合同 |
| VC-06 / T2 | 精确SVG与生成图分流；asset source+compiled projection+semantic brief+provenance；HTML+PNG+prompt.md三件套 | 候选资产维护规则，不裁定所有资产必须三件套；精确源与导出一致性优先，不以修PNG替代改源 |
| VC-07 / T2 | preserve boundary、accepted invariants/change surface/rejected evidence；连续两次视觉拒绝改同框alternatives | 作为参考方法，连接既有[前端连续性](../../design/agent-interface-2026-09-10/README.md)；“两次”未升格为本地强制阈值 |
| VC-08 / T2 | 颜色面积/字阶/deletion test等agent-facing invariants；Appica组件暴露与Kami设计判断可联合消费 | 并入同一设计治理研究索引，不安装依赖或新增第二AGENTS；具体外部规则未核验 |
| VC-09 / T2 | 不复制Kami parchment/ink-blue/serif/print风格，借治理方法 | 保持CW现有token、产品/Pages边界；外部house style细节仍未核验，不引入新皮肤 |
| VC-10 / T2 | 四层Visual Compilation：Semantic brief→Representation selection→Surface profile→Verification，renderer可替换 | 候选逻辑模型；icon/diagram/chart/screenshot/generated/no visual及Product/Pages/Paper/README/Social/Slides分档保留；不是新Design Harness实施单 |
| VC-11 / T2 | Kami、Cathryn Lavery diagram-design、lan-xiaohei、Appica归为同一workstream | 登记下表来源队列；名称不能替代精确仓库/版本/许可证；借鉴关系未核验 |
| VC-12 / T1–2 | “真实Fake产品”、Image 2.5与SE同构、Design也可有Harness | 原作者叙事/类比，不作为公开产品口径、模型可用性或SE论证。解释图必须区分实录、概念和示意，不伪造产品事实；不改变通用Harness优先顺序 |

T1：`e7b2d4dd-0973-4c4b-8583-f1cf324527f3`；T2：`b1136c38-1cce-480d-81b4-bd2b5d8cc878`。每项均有处置，非全部采纳/实现。

## 后续来源队列（未派工）

| 来源 | 已有定位 | 后续核验要求 |
|---|---|---|
| Kami | 用户提供 https://github.com/tw93/Kami | 固定commit后读SKILL.md及实际引用，核验许可、content IR/验证脚本/diagram方法，不能执行未知脚本或自动安装 |
| Cathryn Lavery diagram-design | 对话名称，没有可恢复精确URL | 先确认身份与Kami的实际归因，再读原方法 |
| lan-xiaohei | 原截图与对话名称，无仓库URL | 名称/仓库/许可先消歧，截图不证明效果或可安装性 |
| Appica agent rules | [现有来源核验与限制](../../design/agent-interface-2026-09-10/sources-review.md) | 复用已核范围，不将Kami类比抬升为新增外部事实 |

未来有具体Pages/docs解释资产需求时，可据此提出有界specimen及claim-survival反例；本次不画图、不改brand/UI，不建新skill/runtime，未改变Pro送审固定快照或前后端优先顺序，未push/部署。
