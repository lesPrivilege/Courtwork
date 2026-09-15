# P1 Telemetry · DeepSeek首消费者与活动呈现

2026-09-14 Astra裁决/发单，基线main7e1a1ff及当前在途Chat polish。用户将DeepSeek列首条真实telemetry adapter，Chrome同Host为人类dogfooding主环境。仅登记本合同，不宣称native TPS已可用。

## 已核事实与采用边界

request-telemetry.mjs当前completed才读取cache，providerTtftMs/decodeTokensPerSecond为null，缺少provider_token_timing/token_deltas。沿既有request telemetry与[activity production](production/README.md)接入，不复制计量owner，UI不出现provider名称分支。

2026-09-14读取[DeepSeek官方缓存文档](https://api-docs.deepseek.com/guides/kv_cache/)确认usage提供prompt_cache_hit_tokens与prompt_cache_miss_tokens；[Chat API官方入口](https://api-docs.deepseek.com/api/create-chat-completion/)检索返回usage/chunk示例，全文打开超时。尚未获得逐chunk token计数或供应商token timing的可验证合同，不能从“stream tokens”措辞推断每个SSE chunk是一token。后续必须固定协议/SDK版本及脱敏真实回执，补充核源。

采用DS优先的真实计量接入；调整“必然能实时TPS”承诺为capability驱动：usage总量不等于逐token timing。不得增加付费logprobs、改输出协议或本地tokenizer估算来伪造native值。端到端平均输出率如确有用途需另命名、说明时间窗与推理token覆盖，不能写入decode TPS字段。

## 工单切片

1. **DS normalized telemetry**：Luna核官方协议与现有Pi映射，确认connection/model/API/adapterVersion与每request ID；分别广告cache、usage、timing、token-delta能力。Astra仅对新字段/跨层归属裁决。每个值带单位、来源、测量区间、缺失原因与覆盖（正文/推理/全部输出）。raw provider usage保留事实；计算值标host-derived，直接报告值标provider-reported，缺失标unavailable。不得把Host首输出时间称provider TTFT。
2. **Cache last-confirmed**：当前request unknown时保留最近确认的展示事实，显式last及来源request/time；后端当前cache仍null，不回填旧值。identity fence至少Session、connection稳定身份/配置版本、provider、model、API、endpoint及request用途；普通生成与compaction/retry attempt分开，切换立即失效，不因切回而复活旧当前值。confirmed零值合法，分母0/字段缺失为unknown；百分比只在同request同口径hit/(hit+miss)有正分母时算，不重复计入SDK input。新请求终态无cache也不能把旧值升为current，历史保留须持续标last。回执乱序/重放不覆盖新确认值。
3. **Activity drivers**：同一primitive区分ambient、output-pulse、token-throughput三种来源。无计量时小幅ambient，只在真实活动Run运行；output pulse来自Host实际收到的delta时间/字符量，明确不是TPS。不能用900ms浏览器poll批次时间当provider输出时间。只有真实token增量+时间窗或provider直接指标时启用TPS数字及驱动。EMA/300–500ms窗口、衰减与幅度映射均属待视觉选型，不把动画幅度读成进度/速度刻度。原始计量与平滑视觉值分开；取消、waiting、断连、页面隐藏、终态和reduced-motion沿已有生命周期停/降动效。

先做第一片能力核验与第二片last-confirmed，不等待真实TPS才改善cache；第三片可先接诚实output pulse，缺失native数据则明确限定支持。Run projection与P1 composer分开writer，避免同时争写app/styles。动效实现前读取适用motion skill与UX/frontend合同。

## 验证与闭环

确定性测试覆盖：missing/zero、不同connection/model/API、endpoint变更、新Session、compaction隔离、乱序终态、断流、token总量与delta不等价、重连不重复计数、短窗口及推理token覆盖。真实DS样本只在既有授权范围内留脱敏usage/event，不读/复制key。Luna非作者验证，通过后Chrome人类目验；Astra不重复复验，仅处理语义争议。

Chrome使用现有8859 Host，IAB用于可用时的自动路径复验，测试用于确定性回归。Chrome的偏好/草稿不共享IAB；不复制localStorage、sessionStorage或key迁移。此为本轮测试环境选择，不能从几次工具超时断言所有IAB不适合视觉。2026-09-14自动创建Chrome标签也超时，故不能把故障仅归因IAB；由用户手动打开同一origin，不需第二backend。

Chrome目验分项记录长Run阅读长度、活动driver标识/节奏、cache last/current切换、审批密度。审批减少不属于telemetry验收，不改变权限合同。Context ring可复用“未知当前+可溯历史”的披露语法，但不继承不同window/model的旧占用或把估算当确认量；另片检查。

状态：P1已登记，能力核验/实现待执行；无新增模型调用、依赖、schema、部署或视觉接受。

## 2026-09-15 合流接续

[Slice 1暂停回执](slice1-delivery.md)已按原字节从隔离树保全：暂停于实现前，尚无SDK核验、代码修改或测试，不作为Telemetry交付。后续仍按本合同与RD-006优先顺序接续。
