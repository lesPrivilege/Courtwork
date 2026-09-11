# DeepSeek Runtime / 架构与发布语义入账

2026-09-11 · Astra裁决，基线 `16e9d37a47366de195e1217a6440dd88b660be90`。用户保留本Astra裁决权，后续独立架构review另行提交；本片完成文档准备，不实施runtime或Pages绘图。

## 来源与完整性

[会话快照](input-snapshot.txt)、[接口原始响应](connector-response.json)、[术语附件](terminology-input.txt)、[Visual Compilation完整附件](visual-compilation-input.txt)和[字节清单](source-manifest.json)保留分离来源。会话6turn/11消息，两条assistant被接口截断；用户附件补全Visual Compilation，架构回答末尾仍缺失。可见术语定义、用户冻结意图与图表请求足够裁决下列范围，不声称全会话完整。引用中的旧filecite及外部研究结论不自动构成本仓证据。

本地裁决：[架构概念与实现映射](../../architecture-runtime-canon.md)、[发布与图表合同](../../release/architecture-reconciliation-2026-09-11.md)、[Chat阅读消费合同](../../design/chat-reading-2026-09-11.md)。DEC-013与主roadmap持有接入关系；本表不另立总路线。

## 逐项消费

| ID | 输入主张 | Astra处置与出口 |
|---|---|---|
| DS-01 | model × harness × context影响能力 | adopt为实验假设；不从社区benchmark推导CW任务收益 |
| DS-02 | 单独DeepSeekRuntime层 | adapt：Runtime是resolved执行组合；先复用Pi，拒绝立即自研loop或绕过现owner |
| DS-03 | Model Adapter / Runtime Adapter分词 | adopt，见概念表；API协议与宿主控制分开 |
| DS-04 | Runtime protocol state独立 | adopt责任边界；runtime-scoped保真恢复，非Matter事实；新存储/schema未定 |
| DS-05 | reasoning replay | adopt为后续反例；缺字段、重启、多轮tools、runtime切换必须分别验 |
| DS-06 | thinking中top_p无效 | reject过时事实；官方当前thinking有效且下限0.95；不据聊天硬编码 |
| DS-07 | 固定deepseek-v4-flash默认 | revise：模型/修订/effort按运行时catalog与验证日冻结；别名会漂移 |
| DS-08 | Minimal / anchor优于全工具 | experiment only；不强制bash+editor，不导入社区实验依赖 |
| DS-09 | DSH/Pi/OpenCode/Codex全面外部结论 | reference；局部官方协议核验见下，不将整套Exa报告标verified |
| DS-10 | 先做DS-R0–4 | adapt为后端DRT-01–04候选，基本GUI/通用Harness优先；真实调用未跑 |
| AC-01 | Schema < Work Contract < Expert | adapt为组合依赖，拒绝严格包含/继承公式；Schema可独立复用 |
| AC-02 | Work Compiler唯一桥 | adapt为编译责任；控制、查询、事件、Review也有独立接口，不能全塞compiler |
| AC-03 | Expert声明tools/MCP/HITL/UI/权重 | adapt：声明要求与review维度；不直接注册宿主工具、授予权限或修改权重 |
| AC-04 | Harness Core provider-neutral | adopt；现有Pi复用不等于已消除service的SessionManager耦合 |
| AC-05 | Runtime可热替换 | target；同Expert的deterministic执行证明和真实外部runtime证明分列 |
| AC-06 | Sigma / Agent OS / Meta-Harness | 不提升正式名词；不新增Expert System实现模块 |
| TM-01 | human expert与Expert区分 | adopt当前CW用语；Expert是专业能力包/契约组合，非persona |
| TM-02 | manual loop → expert-guided work trajectory | adopt解释用语；人工判断按context、policy、review、authority分类 |
| TM-03 | hidden human harness / missing runtime | 当前CW说明改为latent work semantics；历史原文不回写 |
| TM-04 | promotion链与SE Proposition A | 作为SE修订提案保存；本仓不改独立Paper或PAPER固定版本，不宣称理论已发版 |
| VC-01 | Visual Compilation | adopt工作法名称，非新产品子系统 |
| VC-02 | icon / governed diagram / illustration | adopt三类资产；稳定glyph沿现registry，不重新生图 |
| VC-03 | model/view与多图维护 | adopt单语义合同多视图；本轮用docs+图合同，不引入第二registry/DSL |
| VC-04 | Visual IR与语义lint | defer独立实现；先人工核对边界+hash，再由实际重复成本触发 |
| VC-05 | Shape/Material/Identity/Motion | adapt为视觉层，不替代已裁八轴grammar；不冻结新corner/material皮肤 |
| VC-06 | Kami/LikeC4/Structurizr等 | REFERENCE待局部源码核验；不安装、不声称成熟度已验证 |
| VC-07 | annotations | presentation only；不承载Review/Attention权威，重要信息另有文字 |
| VC-08 | F1–F5 | 按发布合同逐图适配；本轮不绘制，后续用户交Claude串行 |
| CH-01 | 浮现、彩色代码、MD、色阶/字重 | 补足专门合同并链接DR-04；已登记可消费≠已实现/视觉接受 |

## 有界外部核验（2026-09-11）

[DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/)当前文档：默认thinking/high；temperature等无效，但top_p在thinking下有效且下限0.95；带tools时需保留此前reasoning_content。这里只把协议作为probe依据，不宣称CW已满足。

[DeepSeek更新记录](https://api-docs.deepseek.com/updates/)须在probe执行日复查模型身份；当前页面已有9月10日V4.1 Flash更新，旧材料的型号与测试日期不能混用。

[Codex App Server官方文档](https://developers.openai.com/codex/app-server)支持把app-server作为集成研究入口；它不是当前CW已实现adapter的证据。API兼容不赋予UI自动化、MCP或成果接受能力。

其余论文、DSH Minimal成绩、OpenCode issue、CMMN同构、Kami/LikeC4等主张保留转交输入/待核验。当前裁决依据本地owner合同，不依赖这些外部主张成立。
