# Provider指控与Work临时执行能力 · 输入接收

2026-09-11 / Astra。基线 `b7b7be8fdd64261385978e3e41bcc1a9c63aeed1`；用户要求将[总结Anthropic新指控](https://chatgpt.com/c/6aa3b029-1174-83ec-aed7-3e1b68f7fcdc)同样登记入账。会话从新闻指控推进到行为适配、Work/Coding分层、computer use及临时能力重投影；标题不概括后半段工程内容。

## 原始材料与完整性

两页全部12轮/24消息，hasMore=false，无单消息截断标记。[逐轮原文](input-snapshot.txt)、[原始接口响应](connector-response.json)、[附件截图](source-image.jpeg)、[hash/消息索引/原文外链](source-manifest.json)均固定。原文为接口提供的正文，保留措辞、代码和错误，不清洗成裁决。截图已查看：属于社交帖的讽刺性比较，不是技术取证。来源会话自述使用Exa、110候选/13深读是转交作者的工作声明，本轮没有对应搜索日志，不称已复现。

当前用户授权为登记与消费；原会话中的“做PR”、UI开关、测试与选型建议是研究输入，不自动授权本轮产品实现或付费实验。

## 外部核验及证据等级

- [Anthropic September 2026报告](https://www.anthropic.com/threat-intelligence-report-september-2026)本轮可读，GTG-16001确实指控DeepSeek relay用户请求，列出coding harness条件与July/14天/12.1M规模。**已核验的是原报告含该指控，未独立验证服务端归因。** 会话将coding harness细节称主要来自二手报道需更新：当前原报告也明确列出。与7月社区异常是否同一事件、推断上游真实模型及其他厂商逐项数量，本轮不作独立结论。报告不同actor的案例不能合并归给DeepSeek，政治/法律判断不进入工程事实。
- [DeepSeek Harness架构](https://deepseek-harness.github.io/deepseek-harness/en/reference/)本轮可读：插件替换、Web live patch与其他profile启动固定、durable session/live agent区别、request准备后冻结和request-series边界均有说明。这支持机制参考，**不证明CW所提request-scoped coding overlay已现成实现**。没有固定其仓库SHA或跑provider/子进程，具体subagent provider和性能主张仍待源码probe。
- [CUA in-process指南](https://cua.ai/docs/how-to-guides/driver/use-sdk-in-process)初次取得页面入口，后续正文获取超时；本轮未充分核验Rust加载、三拓扑、bounded permissions与精确target等细节。保留优先阅读候选，不升级为已选型或已集成。computer use和代码隔离分别审查，进程内调用不是隔离证据。
- DeepSeek thinking guide本轮获取失败；既有[DeepSeek Runtime核验](../deepseek-runtime-2026-09-11/README.md)继续有效。不能从“不暴露工具”自行推导可丢弃reasoning字段；具体回放按实际provider合同。
- CISA、媒体/社区调查、各厂商产品演化与模型benchmark表、模型较小更易过度工程化、原创性/市场空白评价均为**转交待核验主张**，不用于选型优胜或公开比较文案。行为变化不等于真实模型身份变化。

## 逐轮消费

| 轮（时间顺序，完整ID见manifest） | 内容 | Astra处置 |
|---|---|---|
| 1 af519490 | 新指控、provider provenance、harness envelope差异 | 采纳为DRT风险/实验输入；保留指控归因，不把provider-returned身份标为已验证 |
| 2 8e678aa7 | 7月社区异常与9月报告对应 | 未验证同一事件；输出风格、能力变化不是身份取证 |
| 3 dfc97942 | Harness条件与后训练/恢复耦合 | 纳入DRT-02/04对照；厂商分数不外推CW，不因工具开关破坏协议 |
| 4 09cc61c9 | 普通任务与agent资源分配 | 采纳按任务暴露能力的研究目标；不预报成本/质量收益或默认换模型 |
| 5 b0e8061c | Standard/Agent开关与effort分开 | 分轴思路可用；新UI/DTO待合同，不接受“第一版正式UI”自述 |
| 6 a63abb80 | 过度工程、HTML升级、过程残留 | 采纳最小充分交付与保留重要不确定性；沿现公开叙事/Projection grammar，不建第二投影系统 |
| 7 c5ef4f9a | Work/Native适配、可维护与可review | 作为行为policy候选；Native也不绕过Work权限/commit，不新增全能Work Adaptor owner |
| 8 5239db6b | Composer局部能力切换、异步不同任务 | 会话配置/当前执行快照分开；Matter不拥有runtime协议，切换边界待验证，不先定next turn=next Run |
| 9 b2f2ff96 | Coding子能力、产品端比较 | 采纳执行能力可局部消费；native/child/hybrid均保留，对应RD-005与DRT，不新立自主MAS或主权模型优劣论 |
| 10 fdaff8b6 | CUA、Explore/Worker、PR建议 | 登记WCI候选，Explore读证据/Worker有界写入沿既有角色合同；不因角色名授予capability或接受CUA Tier-1选型 |
| 11 b5e9e893 | 尾端coding overlay、episode裁切 | 仅改变未来model context投影；原trace不删除，结果不能由摘要自证；prefix cache和恢复Work行为是实验问题 |
| 12 9baa5d79 | DSH热插拔与探索清单 | 接收scoped capability方向；拓扑/切换边界保持候选，先固定接口与反例，不热改在途请求 |

## 本地语义裁决与路线接缝

[DEC-013](../../architecture-runtime-canon.md)保持authority：Runtime是组合，不新造一个与Model Adapter/Runtime Adapter/Work API竞争的全能Adaptor。Work身份连续不等于Matter掌握进程、协议或全局会话；执行记录仍由既有Run/store owner持有，不新增“所有Event Log”总库。trace为观察记录而非自动认证事实；按既有保留/脱敏规则留证，不采纳无界永久保存所有内容。

Reasoning投入、获准动作能力、交付呈现复杂度分开考虑。简洁不隐藏失败、重要不确定性、影响决定的信息或用户要求的审计；验证结果留工程回执，不能为了简洁假报完成。现有产物可以承载时优先局部修改；临时代码默认执行手段，是否升级正式Artifact由真实交付需求和Core接受决定。

权限由现授权owner授予，host/runtime在执行边界实施；模型建议、profile名称、Code assist On或UI切换都不扩权。请求快照冻结也不冻结撤权：实际动作仍重新校验当前权限/版本。尚未选择same-worker、fresh child或hybrid；不提前使用固定代码行数作升级阈值。

Result Capsule暂为**实验中的结果投影名称**，不是新正式对象/schema：候选字段映射现结果、artifact identity/version、mutation receipt、检查证据、未决与失败；模型摘要不能制造verified facts，也不自动commit。移出编译context不删除源trace；必须有按权限回读来源的路径。实际副作用成功/失败/未知与模型叙述分开，未知效果不自动重放。

## WCI · 可消费候选，未派工

本编号仅是此输入的消费别名，接[RD-005](../RD-005-multi-agent-selection.md)与DRT-01–04；不占新BE编号、不插队基本GUI/通用Harness自足节点。

| 候选 | 依附路线 | 后续可检验交付 |
|---|---|---|
| WCI-01 provider身份与profile清账 | DRT-01/02 | requested provider/model、实际endpoint、返回身份及缺失值、adapter/profile版本与允许记录的request metadata映射现DTO；客户端观察不冒充真实上游inference认证 |
| WCI-02 有界临时能力合同 | RD-005 + DRT-01 | 角色/能力/权限/执行快照、enter/exit与失败/取消/恢复、transition审计映射；固定request/step/turn/Run差别后再拆实现PR |
| WCI-03 投影与拓扑实验 | DRT-04 | A Work baseline；B同worker完整trace；C同worker episode结果投影；D fresh code child结果投影；same task/tool grant/model修订，比较完成率、后续Work语义、review成本、context/cache及失败恢复 |
| WCI-04 computer-use参考核验 | RD-005外部执行能力接缝 | 固定CUA官方源码/许可/版本，核精确target、撤权、同桌面竞争、crash与隔离边界；与browser-native/provider-native候选按任务比较 |
| WCI-05 局部控制面与呈现 | WCI-02之后，既有frontend grammar | 再比较profile/Code assist/渐进披露是否必要；不把三个研究轴机械变成三个composer开关，不改在途请求 |

EXP-01–06（cache、late injection、same-worker/child、structured/summary、语义保留、transition边界）归WCI-03，原EX-WR-CR-01并入同组，不重复立项。首阶段只冻结可审查合同和反例，后续实验须另定synthetic数据、预算、重复/留出样本、provider授权与回退。当前无新产品实现、外发、付费调用或Pages范围变化。


作者验证：原文/接口/附件hash重算通过；文档链接911份/4313条通过。首个接口请求超出单消息字符上限被拒后以20000成功读取两页；无来源消息截断。原文行尾与空行保持原字节；diff首次报告原始接口JSON末尾空行，原始snapshot与JSON均保留，排除两份原件后的编辑文档检查通过。共享main原15文件hash保持；本片仅研究/索引文档，未跑产品测试，不称独立接受。
