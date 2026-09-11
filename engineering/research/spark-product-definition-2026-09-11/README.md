# Spark产品与发布定义

2026-09-11 · Astra，基线main `16f6337e6072768a61297c0494d31b3c5f278273`。用户授权消费《Gemini Spark 产品解析》并登记定义，随后直接补交受限profile与DeepSeek首选适配方向。

[原始快照](input-snapshot.md)、[连接器响应](connector-response.json)、[时间/消息ID/hash](source-manifest.json)固定读取时的4轮7消息，无剩余分页、无附件。最初读到3轮6消息，保存时会话增加一条用户DeepSeek补充；第4轮仅含用户消息，不声称有完整助手答复。用户在本任务直接粘贴的补充按下文裁定消费，未冒充会话逐字归档。

## 产品定义与发布文案

Spark承担快速、有明确范围的整理、分类、抽取与翻译。它围绕局部材料工作，帮助人和Agent继续推进；后台持续准备由一系列有界任务组成，用户也可直接唤起一次翻译。模型是可替换的执行选择，产品以用户要完成的工作为入口。

可供发布面直接消费的完整文案：

> Spark 帮你准备工作所需的材料。它围绕具体内容进行整理、抽取和翻译，让你和 Agent 能够沿着清楚的来源继续工作。你可以随时交给它一段需要翻译的文字，也可以让它在后台准备资料。

> Spark helps prepare the material your work depends on. It organizes, extracts, and translates focused pieces of information, so you and your agents can continue with clearer sources. Bring it a passage to translate, or let it prepare material in the background while you work.

短句可用 **Fast, focused work for what comes next.** 不重开全站主标题。自然文案不夹预算、execution class或未完成清单；工程状态在本记录中保留。翻译本身可以直接满足需求，不强制所有Spark结果只能是中间件。“Agents solve work. Sparks prepare work.”仅内部概括，避免将重心说成绝对二分。

与[三入口产品理由](../chat-attention-2026-09-11/product-rationale/README.md)及[命名裁定](../../design/spark-surface-2026-09-10/naming-reference-2026-09-11.md)衔接：Chat支持持续交谈，Attention组织值得关注和判断的对象；Spark不吞并所有后台任务。复杂计划、工具执行、恢复仍沿Agent/Expert/Runtime职责。

## 第一阶段裁定

**Spark首先是复用Harness Core的受限execution profile。DeepSeek V4.1 Flash登记为首个适配与评测目标；登记不代表生产catalog已经更新或真实接入已验收。Capability ceiling ≠ execution permission。**

“Spark Core”仅可作该profile的说明标签，不新建第二Core、Runtime层或同名权威store。复用现Pi/Runtime Adapter/Model Adapter接缝，沿[Runtime canon](../../architecture-runtime-canon.md)与[DeepSeek既有登记](../deepseek-runtime-2026-09-11/README.md)的DRT-01–04接续。其他Experts优先适配DeepSeek是用户阶段方向，不是默认给予full权限。

| 维度 | 第一阶段要求 |
|---|---|
| 一次工作 | 一个有界job；不默认自主持续loop或无限tool chaining |
| 输入 | 固定来源版本的scoped projection；显式文件范围，不全盘遍历；模型上限不等于默认预算 |
| 工具与写入 | 默认无工具，按需allowlist；输出为typed result。写回、替换、外发等副作用有单独授权与结果回执 |
| 权限 | 共用权限机制/执行校验，采用不同policy与授权范围。Expert也不拥有天然全权限；不是两套互不相容权限模型 |
| 状态 | 不为局部操作延续独立长对话；底层Run、协议恢复状态、取消、trace、provenance仍由现owner保留 |
| 预算与并发 | 有上限、背压、超时、取消与重试条件；high/cheap是待评测目标，不是无限并发或已验证低成本 |
| 结果 | schema校验与业务验收分开。工具批准不等于专业接受；结果不自动commit为Core正式状态 |
| 模型身份 | 工作动作优先，实际provider/model、数据去向、费用口径与生效配置仍可查；未知usage/latency不补零 |

streaming、retry、structured output、编译、缓存、并发和multimodal是可复用职责的盘点，不是宣称当前Harness已完整提供每一项。具体实现先核已支持能力。typed output不能消除传输数据、写文件或工具造成的副作用。

Codex runtime属于执行适配边界，不能与DeepSeek/Gemini模型API直接并为同一Provider列表；local也须区分模型后端与执行环境。相同模型下对比profile的context/tools/permissions/loop/schema/eval可以检验Harness作用，但行为不同本身不足以证明因果，需固定输入/修订与消融对照。

## 官方核验与未核验输入

2026-09-11读取[DeepSeek官方发布说明](https://www.deepseek.com/en/news/deepseek-v4-1-flash/)与[官方模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash)。发布说明日期为9月10日，宣布API名称deepseek-flash、原生多模态及WorkBuddy/CodeBuddy/OpenCode接入。模型卡描述552B backbone MoE、prefill/decode激活8B/16B、最高1M上下文，并标明MIT。以上是官方声明，不是CW实测；MIT模型许可也不代替托管API条款。

官方同时说明旧deepseek-v4-flash别名暂时路由到新模型；9月14日04:00 UTC起deepseek-v4-pro也计划转路由。故后续运行必须记录验证日期、请求model、实际可得的返回身份及catalog修订，不能凭别名认定权重永久固定。没有不可变修订证据时明确保留限制。

Gemini性能/价格/能力与Google Spark栈、Codex Spark下架/使用量、Luna参数量及后训练推断、20路并发便宜等仍未核验，不作为发布依据。DeepSeek“适合input-heavy局部任务”是选型假设；官方benchmark不证明CW翻译或抽取胜出，不从模型能力推断权限。

后续沿ME-03/04、[WCI profile](../work-capability-input-2026-09-11/README.md)与DRT评估翻译保真/术语、抽取召回/幻觉、分类schema、摘要信息保留、延迟/吞吐/失败/成本。SparkBench先登记为候选，复用现benchmark契约，不从名称另造验收体系。未运行付费provider，也未修改用户配置。

## Claude发布面消费

[最后一轮ONE-SHOT](../../release/ui-publication-closure-2026-09-11/ONE-SHOT.md)继续是唯一施工入口。source→fan-out图形方向沿用；Spark页和三面并置可直接消费上述定义。统一预览可用同一资料故事展示源文、翻译结果和返回工作的路径，保留示例身份，不接成假可用生产Translate/改名/写回按钮。模型供应商不成为产品人格或默认一级选择入口。

这是定义与工程边界登记，不修改App/Pages代码、正式schema、Paper或已发出的16f6337完整ZIP。新内容作为该one-shot的补充，作者可沿原任务接续，不重启或追加writer。当前真实读面仍按[SP裁定](../../design/spark-surface-2026-09-10/integration-ruling.md)、[BE-41 DTO](../../design/spark-surface-2026-09-10/be41-dto.md)与current证据判断。

验证仅做来源计数/hash、文档链接与差异检查；没有新增功能、运行实验、独立产品接受或部署。

## 2026-09-12 · 有界准备与闭环核查

[工作义务闭环裁决](../obligation-closure-2026-09-12/README.md)补入来源整理/pre-review与固定修订核查场景；复用本profile及Attention/ME-06。核查coverage、实际使用证据与关闭权限分开，Spark不自行resolve；调度和stale规则待真实trace。本轮只登记，不改变发布文案或首阶段执行定义。
