# Runtime替换 · 能力参照与证明地图

Astra，2026-09-13。这是后续工程的验收设计；当前只有Pi接入，Codex真实adapter尚未实施。首个Provider适配继续DeepSeek，已有真实回执只支持当时固定profile，见[实际实现](explore/implementation.md)。

## 参照来源

Codex采用公开[App Server文档](https://learn.chatgpt.com/docs/app-server)作为候选接口参照：thread/turn/item、初始化、start/resume/fork、steer/interrupt、流式事件、审批与模型能力。其schema生成物随CLI版本；文档标明app-server命令及WebSocket实验性且不支持生产负载。后续probe须固定CLI版本与生成schema，不能将公开可调用等同于当前CW已接通或生产适用。此处参照公开合同，不参照Codex桌面私有实现或本对话的内部工具。查阅日2026-09-13；支持状态在实际接入时重核。

Pi依据仓库锁定三包0.85.1和[上游固定扩展文档](https://raw.githubusercontent.com/earendil-works/pi/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/coding-agent/docs/extensions.md)：工具、生命周期hook、session持久化与UI贡献属于扩展能力；扩展可执行任意本地代码，不因注册成为沙箱。CW采用受信组合和现Host权限边界，网页UI不直接复用TUI贡献。上游支持reload不证明CW的每种扩展或活动Run能热替换。

DeepSeek首适配以实际endpoint与模型描述为单位，[模型目录API](https://api-docs.deepseek.com/api/list-models/)只证明目录接口；完整能力/编码差异复用[已登记官方与Pi证据](../chat-memory-broker-2026-09-12/model-adaptation/provider-evidence.md)及[生产回执](../chat-memory-broker-2026-09-12/model-adaptation/production.md)。本次未进行新的付费请求；thinking指南本轮抓取超时，未据此增补新协议断言。

## 两条独立适配轴

Provider Adapter改变模型协议及参数解释，仍由Pi执行；Runtime Adapter改变整个执行器的控制/事件/恢复接缝。首个DeepSeek lane不是第二runtime。原生Codex lane可内部持有Provider适配，不必套额外Model Adapter。Host资源治理与Work Core不因选择lane更换owner。

`RuntimeSupport = {native, adapted-with-evidence, unsupported, unknown}`按能力逐项标注；native也须附当前固定版本的实测证据，不能只因上游有同名方法便称支持。适配后的限制必须对消费者可见；无能力不渲染可用动作。不能用“OpenAI-compatible”推出thinking、usage或恢复语义一致。

## 最小替换证明矩阵

以下为CourtWork提出的测试义务，不是声明Codex已保证每一项。

| 能力/边界 | 最小对照与反例 | 当前结论 / 后续责任 |
|---|---|---|
| 生命周期与身份 | 同一任务类分别新建Run、正常结束、异常结束；CW Session/Run与原生thread/turn不混用 | Pi已实现局部；Runtime Port应先把SessionManager移出service |
| 能力与配置绑定 | 固定runtime/protocol/model/capability revision；不支持effort必须拒绝或省略并留证 | Pi能力绑定已接；Codex候选需依据实际返回字段映射 |
| 输出与事件 | 增量/终态、重复/乱序、错误/unknown effect；重连不复制工具执行 | Host原事件owner保留；禁止拿文本流结尾猜业务完成 |
| 工具权限 | Deny零动作、Approve精确一次；重启、撤权、版本冲突分别核验 | Pi受限profile有证据；原生工具执行须证明同等权限边界或拒绝该能力 |
| steer/取消 | 活动追加与下一Run区分；cancel requested与实际terminal区分；中途副作用如实回报 | 各lane按公开接口行为证明，不以方法名称等价作为通过 |
| 协议恢复 | 同lane重启恢复或明确不可恢复；损坏/缺metadata不伪造完整历史 | Pi局部已验；跨lane以获准工作投影开启新Run，不迁移私有日志冒充resume |
| 文件与来源 | 相同获准scope读回精确版本；禁止越范围读写、旧引用伪装当前文件 | 复用Host/Core reader与现版本owner；原生文件能力另验证 |
| Work独立性 | Expert/Contract fixture字节不变，两lane各自出候选并经相同Core校验/Review | 未实现；合成第二执行器只能测合同，真实runtime另需真实证据 |
| 状态隔离/退出 | 不同lane的私有存储、升级备份和回退使用独立目录；移除lane仍能读正式成果 | Work语义不导入Pi；数据迁移不能靠git回退共享升级目录 |
| UI与故障披露 | 缺能力、断开、部分结果和待人处理准确展示；overlay关闭不取消Run | 后续接UI时依统一体例；不得建立runtime专属假Review语义 |

验收分三层：合成协议符合性 → 固定版本真实runtime受限任务 → 同Expert/Core工作合同。每层记录作者、非作者、原始结果与未覆盖项；一个绿色wrapper测试不升级到下一层。更换模型质量变化另测，不要求输出逐字相同。

## 初步施工接缝

优先抽出已有生命周期调用的有界Port，不先设计全能SDK。以create/open/start/observe/control/close及opaque恢复句柄为责任候选，实际DTO沿源码消费者逐项定；list/query无需全部经过Work Compiler。原生接法选择版本支持的最小本地传输并确认准入条件，实验性限制未满足时仅做probe。

只有同一工作消费者需要时才扩展Compiler、通用包安装或跨runtime能力桥；Pi固定组合仍可继续dogfooding。正式支持列表必须引用可重复的兼容证据，而非官方功能目录或本页设计。
