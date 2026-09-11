# Chat薄能力层 · Astra补充裁决

2026-09-12，基线main `47099431796302d1ea698e2dbe487e0550026be3`。输入为用户本轮直接粘贴的两段讨论：Provider统一会话与可选来源、Chat/Agent互补、能力梯度、薄检索/connector、设置分类与对外表述；最后要求“裁决后登记main即可”。本文是裁决与主题摘要，不冒称逐字来源导出。仅文档登记，不改发布面、不接Provider或施工UI。

## 定义收敛

采用长期目标：**Chat = Provider Session + Local Conversation Projection + optional Governed Memory Sidecar + optional Thin Capability Layer**。Chat以人主导的讨论、探索、比较与候选判断为目标；Agent/Expert运行以有界任务执行为目标。两者互补，不以自动化程度决定谁是另一者的升级版，也不要求所有模型都Agent化。

这不是模型固有能力的严格二分：Chat可有有界工具，Agent也可讨论，Expert仍是专业能力契约而非Runtime同义词。四角色优化目标分别是交流/判断、任务完成、单位成本的信息准备、长期闭环，不是固定强弱排序、必须串行的pipeline或四套Harness。Spark也可直接完成翻译等有界用户任务；不同角色可复用同一运行基础。

“Provider提供智能和原生会话体验，CW维护连续性、context与handoff”采用为Provider-native通道的产品分工。它不转移模型/源数据所有权，不覆盖CW控制API请求时的本地UX责任；不是当前已实现的跨Provider会话承诺。Provider网页产品不能称为无Harness的裸模型，其内部工具、policy与编排可能不可观察。输入关于DeepSeek裸模型/后训练/特定Harness行为、大小模型知识与推理差异、降低token或漂移等，保留为适用性/因果假设；本轮不独立核验，不作为选型结论。实际比较需固定模型修订、context、工具、policy、任务和评测，不能只从行为差异归因Harness。

## 可选能力边界

| 能力 | 本轮采用 | 后置或排除 |
|---|---|---|
| 外部search / read / retrieve / inspect / preview / cite | 仅补足当前讨论所需的来源取得与出处；Provider已有且符合需求的能力可按验证后通道消费 | 不建通用工具生态；未支持的Provider通道显式unsupported，不偷偷模拟隐藏system注入 |
| Memory / Court / Matter context | 沿[Memory Broker](README.md)的可信身份、当前grant、exact版本/range、预算与披露回执 | 同机可读、同账户、已连接或相关Matter不自动授予披露；历史文本不成为新的高优先级指令 |
| 用户连接的GitHub/Drive/Email/Notion/SaaS等 | 只登记来源类别候选，按实际adapter暴露窄的获准查询 | 本轮不安装/登录/注册MCP，不把登录态或OAuth broad scope当成本次读取授权，也不声称供应商已支持 |
| Shell / 任意写文件 / deploy / destructive API / 长自治loop | 不作为目标Chat薄层的默认能力；有执行需求时交接到实际Work runtime | 不为方便检索开放完整执行环境；Expert/runtime同样受scope、policy与逐动作授权约束 |

“Chat capability帮助思考，Work capability完成工作”采用为用途边界，不是按工具名字发权限。所谓read/search可能带来外发、费用、下载或其他副作用，必须检查实际effect、目标与数据去向；connector不能以只读标签隐藏写入。用户请求中的source/account/matter由可信绑定验证，模型参数只提出查询意图。来源内容按数据处理，不能诱导扩大权限或启动后续工作。

CW只治理自己adapter/broker的披露与动作；未经实际协议控制的Provider原生工具及副作用不能宣称受CW policy全面约束或可完整审计。复用Provider原生功能与CW提供补足能力分别记录可观察性、来源覆盖和限制，不将网页wrapper宣传成安全沙箱。

## 连续性与交接

本地capture、memory治理、Matter登记仍由各自owner与授权决定，不是每段聊天都要由Work Core保存或接受。Chat可以形成判断，但不凭自然语言自动生效为正式决定。handoff携带获准source refs/版本、任务意图、适用约束和未知项；目的runtime重新确认绑定、权限与输入，不复制整份Provider私有context来假装连续性。提出handoff或预览任务不等于已运行/已完成，启动沿实际命令和既有授权。

目标边界不追溯删除当前项目Session中的workspace工具或改变现有API；未来独立Chat产品接线先核实际main与兼容路径。跨Provider memory、自动投影与connector仍是计划，不把本次文字定义升级为产品接受。

## 设置与后续消费

Chat Providers（和谁讨论）、Chat Sources（讨论可查什么）、Agents / Runtimes（谁执行）采用为后续信息分类候选，不现在新增Settings导航、迁移保存配置或画假可用开关。一个Provider可能同时有API/native两类channel，一个Source也可能供不同角色消费；底层身份、凭据引用、授权与连接仍复用原owner，不按分类复制注册表。

沿[BE-19/20/23与既有缺口](../../mvp/execution/work-surface-kit/backend-requests.md)、[LG/RG消费](../mature-practices-2026-09-12/pr-plan.md)、[下一Harness节点](../../release/harness-next-node-2026-09-12/README.md)和[整体闭环](../../release/governed-work-loop-2026-09-12/README.md)接续，不新开同义实现线或改变排单。实现前至少覆盖无Source仍能讨论、unsupported通道、跨账户/越权/撤权、恶意结果、真实effect不符、预算耗尽、handoff未启动与旧引用失效。

“Not every model should be turned into an agent”保留为未来产品观点候选，不作为普遍能力定理或本轮发布文案。验证仅做文档链接与变更范围检查，无产品/Provider/UI测试或独立产品接受。
