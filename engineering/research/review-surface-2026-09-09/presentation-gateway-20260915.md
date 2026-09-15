# Presentation Gateway与可组合grammar · 增量裁决

同日后续：[新5轮多源投影/Runtime Review裁决](projection-runtime-20260915.md)明确Gateway只管模型结构化表达，系统命令、资源预览和owner交互可共享投影宿主但不归其authority；完整来源已达10轮，下述5轮为本阶段历史范围。

2026-09-15，Astra登记；Courtwork main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`，保留原工作树在途修改。用户继续授权消费同一Chat的新增讨论；本轮不实施产品。

## 来源与差量

重新读取「Chat状态可视化编排」`6aa76e0c-3c90-83ec-9d15-2ed027159801`，[本轮快照](chat-states-increment-20260915.json)完整5 turns/10消息，hasMore=false。与[上次2轮返回](chat-states-recheck-20260915.json)按turn ID和完整items比较：新增3轮、旧轮修订0、删除0。上次“无增量”仅对应当时返回的2轮，本次记录接续其后；旧快照不改，不重新声明附件目验。

| 新turn | 主题 |
|---|---|
| 9d76c229-eaf0-48e9-96b1-4db86015d257 | 简单chart/flow优先、L0–L4分层、表现复杂度与authority分轴 |
| 3b190b69-4a76-4650-99b7-88579f1335d9 | Markdown与受限Presentation混排、传输与前端编译分工、fallback |
| 91a4b205-19f2-445e-bcee-6c1329c4b07a | 单一Gateway入口、渐进披露schema、content/composition双词汇、Host编译约束 |

主owner仍是[Presentation验证节点](presentation-20260914.md)；组合规则接[前轮裁决](visual-orchestration-20260915.md)，披露预算接[Memory/Context增量](../chat-memory-broker-2026-09-12/attention-governance-20260915.md)。Host负责注册/校验、身份、版本、持久回执和源权限；前端负责grammar到布局及placement；Runtime与Core分别保留执行及正式动作权威。最近先例沿原Preview renderer lifecycle、presentation primitives与原生DOM前端，受影响grammar为Projection/Control、Placement及UX-05/08。这里只补合同，不改owner/API或公共视觉规则。

## Astra逐项处置

| 输入 | 处置 | 采用边界 |
|---|---|---|
| L0 inline、L1通用、L2组合、L3治理、L4外部扩展 | adopt / adjust | 采用为设计分类，不是权限递增链或新runtime枚举。status/progress必须有owner事实；简单图表可以承载正式数据，复杂graph也可能只是模型派生。Host记录不认证内容，人的决定不能从外观推导。 |
| 高频chart/flow | adopt | 在facts最小贯通后，chart与flow列为优先通用验证消费者，不必等待复杂Checklist/Review；不要求同时交付全部family或subtype。使用有限nodes/edges、series/encoding语义，Host决定绘制，不直接执行任意Mermaid/HTML/JS。 |
| 受限声明式“投影代码” | adopt | 明确为版本化数据协议，模型给语义关系与数据，Host校验，前端使用预编译代码。不能将Markdown代码块自动识别成可执行Presentation；入口、来源和回执必须真实。 |
| MarkdownPart + PresentationPart混排 | adopt / adjust | 采用有序内容投影方向；首片可引用持久事件/实例形成混排，不直接重写现有Message或伪造provider原生part支持。固定Session/Run/call与顺序、稳定part/ref身份、重复与重连规则后才能冻结wire。UI-only数据默认不回填Context，短回执另计。 |
| transmission/runtime与grammar/compiler两项责任 | adopt | 两个可独立验证的责任面，共用Spec→Instance合同；不新增平行roadmap。前端可先用固定fixture，后端验证校验/持久/恢复，最终同一纵切验证一致性。 |
| 单一Presentation Gateway渐进披露 | adopt / adjust | 初始只提供用途与入口，按任务披露family、版本和详细schema。可以由一个受限入口处理describe/submit等候选操作，名称/字段尚未冻结；仍受原工具注册与调用治理，不绕过权限。 |
| tool search/deferred loading与静态Provider回退 | adopt / defer | 设计两条adapter路径：已验证支持动态披露时加载有限定义；否则入口返回短catalog/schema，随后经同入口提交。当前不声称任何Provider已支持，不把外部协议作为首片前置。详细schema仍消耗Context，需实测预算与往返。 |
| content与composition双词汇 | adopt / adjust | 从一开始约定可组合的文档结构；content为facts/chart/flow等，composition为极少受限关系。stack/group/split/grid/tabs只是候选，按已批准pattern和槽位限制组合，不开放任意递归UI tree。首片允许单节点，组合片再证明多个renderer协作。 |
| 模型指定ratio/columns，窄屏降级 | adjust | 模型只提供获准关系/hint，Host可选择stack等投影；不得改变阅读顺序、标签关联、选区对象与动作目标。设深度、节点数、尺寸/数据预算及允许嵌套表；拒绝非法组合，可解释降级。具体数值待fixture冻结。 |
| Presentation Compiler | adopt / adjust | 逻辑链为验证→受权dataRef解析/来源绑定→UX/viewport/placement策略→render tree；可以由既有Host和前端共同实现，不要求全权新服务。UI compiler不能直接取得Core写权或任意URL读取权。 |
| 依当前Expert披露domain composition | adopt / adjust | 从真实启用/绑定的能力目录筛选；Expert存在、模型选择review、catalog发现都不授予正式动作。当前generation/版本和源目标权限在提交/读取/动作时重验，避免发现后撤权仍可调用。 |
| prose默认、inline→Preview逐层展开 | adopt | 根据任务按需呈现，不强迫每答复都走Gateway；复用同实例不同placement。Preview展开不把只读实例升级为Review；fallback可读且标失败/不支持，不能伪装渲染成功。 |
| renderer升级但旧event不变 | adjust | 仅在版本兼容与语义保持证据下成立；固定catalog/spec及必要renderer/transform版本，旧版本有对应renderer或fallback。不能以重新排版静默改变历史数据、解释或接受事实。 |

## 接原工单的验证顺序

1. **合同fixture：** 冻结最小Gateway发现/提交协议、catalog版本/能力过滤、数据和组合预算及错误；原cw_present是先前候选名，不因Gateway名称另建第二工具系统。动态与静态披露路径均用合成adapter验证，不默认调用付费Provider。
2. **facts纵切：** 原模型fixture→Host校验/持久回执→Chat inline→同ID Preview→重开恢复保持；补混排顺序、重复提交、迟到返回、unknown renderer版本和文本fallback。成功回执只表示Host处理事实。
3. **chart/flow与组合：** 优先一个简单chart、一个flow，再一个获准facts+chart/flow pattern；验证重复node ID、悬空edge、未知role、超限嵌套、非法slot、缺数据、循环依赖的拒绝或明确支持策略。流程标签“Approve”不产生approval能力，估算/模型派生标记不能在组合时丢失。
4. **失效与投影：** 发现schema后catalog升级/Expert撤挂、跨Session提交、dataRef撤权、取消后迟到调用不能越权；390宽降级保持顺序及对象身份。UI施工沿现有frontend contract检查明暗、长文本、键盘/焦点、缩放及相邻完整场景，不能以fixture代替目验。
5. **后续独立动作：** local sort/filter/expand与navigation先行；正式Runtime HITL/Domain Review继续原owner合同及版本/generation/幂等反例。外部App协议后置。此登记不打断当前RD-006施工。

本轮只做来源差量与文档验证，不引入schema/依赖/工具实现，不关闭产品门，不改PAPER采用pin。原Chat的外部技术主张不在本轮新增核源；采用的是本地设计条件，不是供应商能力宣称。

验证回执：Python完整items差量为新增3/修改0/删除0；输入SHA-256为`d6e6f9e92ffbaa5c8b48b57cfc49752367b0d13fdac1a22a501490360ba518d0`。`node tools/check-doc-links.mjs`通过（1344文档、7434链接），`git diff --check`通过。本轮Astra文档整合，未跑产品测试/浏览器，不冒称非作者产品验收；未commit/push。
