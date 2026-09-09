# Browser adapter 行为草案（未发布 ABI）

本草案挂在现有 AM/Runtime/ES owner 下，不增加新的 accepted ledger。下列字段是后续测试必须能辨识的事实，不是已上线 HTTP schema、tool 或数据库列。

## 1. 两层及身份

**Browser Agent** 接收受限任务、可信父 Run/Session 关联、固定来源/权限上下文、输出 schema、模型/adapter 版本与预算。返回执行状态、有界 typed value 或标为 partial 的值、证据引用、真实 usage/missing、warnings 和 provider-specific metadata。上游 runId 是外部关联，不覆盖 Courtwork Run id。

**Browser Driver** 管连接/资源：local/attached/remote，created/attached ownership，明确可关闭的 tab/browser/profile，运行环境与网络策略的已验证能力。最小动作集合随首消费者验证；不能把任意 `evaluate/cdp` 的存在当安全限制。driver 切换不可暗中更换登录身份、目标host或数据所在地。

关联至少包括 adapter版本/上游SHA、invocation identity、父Run/Session、browser instance generation、上游runId（若获得）、策略revision、精确输入/输出引用。模型传入的ID仅选择器；host铸造并验证归属。不存在的恢复支持应标 unsupported，不伪造 resume。

单进程内直接 `BrowserUse.create` 会把第二个 Pi agent loop 放入宿主；上游 JS child process仅隔离可杀死执行，不隔离 parent权限。未来外部执行器若被选用，应将整个 SDK host与JS worker置于已核验的受限执行环境，而不是只fork JS就声称sandbox。实现形态由BR-01反例裁定，本轮不新建进程框架。

## 2. 执行许可和数据披露

原生 `beforeToolCall` 可保留为应用反馈点，不能独自执行 Courtwork 全部许可。`javascript` 中可以一次完成读取、网络请求、CDP动作和文件写入；工具名为javascript而非purchase/upload。`researchTools:false` 仅去掉额外工具，不移除Node访问能力。

公开`execute()`（含暂停时手动调用）与上游stdio入口不经过模型tool hook；adapter必须逐一封装/拒绝未纳入合同的入口，不能转发原SDK或原始stdio命令即称受控。

首个实验只接合成无登录页面和只读观察任务；环境只含合成输入，网络限制由真正的执行环境/网关实施并测试。允许站点上也可能有写请求，域名 allowlist不等于read-only。若无法在执行层拒绝未批准的写/披露动作，实验不得升级到真实登录、用户文件、任意网站或“read_only已保障”宣称。

凭据只用现有host明确解析的窄引用/权限；本轮无通用browser凭据能力。不得读取个人Chrome profile或环境凭据作为默认配置。截图/录屏/下载/派生内容各自受披露策略；字符串替换不证明二进制与编码秘密已脱敏。首试配置明确 `telemetry:false`，不能让引入可选包隐式外发统计。

需许可动作只能经host信任入口决定；许可request与实际操作/输入摘要/目标身份绑定，迟到、修改或跨invocation回答失败。现有BE-30尚未实施，不把browser hook接成一个看似通用的CAS授权服务。

## 3. 结算、预算和恢复

执行结束、结果已存、交付被确认、Core接受是四种事实。`completed` 只说明SDK交付了其schema输出。超时/cancel不证明页面异步工作停止，也不证明购买/提交未发生。缺回执的外部效果必须unknown或unsupported，不能重放来猜测。

maxCostUsd是上游turn之间检查的软限制；host预算不能用它声称硬费用上限。模型请求/compaction都必须经过明确配置的transport、预算和usage观察。上游usage不能在无去重情况下既累计到父Run又独立重复累计；缺少报告标missing，不估成0。

初版可在父Run生命周期内等待一个有界browser任务；若需要跨工具回合/重启handle-get-wait，必须接AM-B，不新建第二scheduler。父Run结束、Session删除、配置撤权或generation变化先关闭新操作准入，再记录真实结算；晚回包不得投到当前活跃Session。恢复仅恢复可核对记录，重建JS heap/登录/浏览器状态属于独立能力，不能由恢复transcript推出。

checkpoint rename成功、IPC未发布的窗口需单列，文件存在不代表parent已确认partial；profile crash后不能自动删锁或复用未停止浏览器。

上游cancel是请求；应等待active run和资源清理的实际结果，另记未确认处置。清理附着浏览器只关闭有权关闭的资源。Cloud provision ACK丢失可能留下计费实例，既不默认重试也不把清理失败写成成功。首实验不用Cloud。

## 4. 证据、事件与文件

事件映射使用原始来源身份和事件发生时间（可用时），host摄入顺序另记。`events()` queue overflow、缺最终event、上游warning、journal截断要保留coverage，不按行序号填造完整trace。上游sequence属于SDK session且可跳过delta；重启/新instance后不能凭sequence去重，至少联合来源instance/run身份。producer缺席仍能读已摄入的有界记录，但这不授权后续动作。

partial checkpoint是观察值，不是已验证结果；读取后的摘要必须绑定实际JSON bytes/版本与来源。上游mutable路径和`files()`只提供清单，不自带内容hash、可信Run record或不可变承诺。截图、附件、下载进入既有来源/Intake或后续受信成果捕获接口；禁止伪造ws_write记录，也禁止接受时回读当前同名路径。ES-01尚未实施，本草案不绕过该门。

ES-00 的 file-memo fixed basis 首版不覆盖任意外部浏览输入：在该Run中引入browser结果应使coverage变为unknown/partial，而非新增一个假称complete的工具例外。可先按来源合同摄入并冻结浏览材料，再由新的固定依据Session/Run消费；本文不修改ES的complete定义。

新文件导入需要路径归属、链接/类型/大小/编码、完整byte digest、输入依据与原子发布的单独合同；远端下载不自动存在于本地host。不能因为SDK返回historyPath/recordingPath就给模型任意读文件权限。默认只把有界结构化结果和引用放进主上下文；完整trace按需披露。

## 5. 替换与降级

能力描述必须逐项标本地合成已验/源码观察/未检/不支持。固定npm artifact完整性和上游SHA是未来安装前任务；当前只核对源码package版本。升级对SDK schema、工具语义、serializer、history读取、cancel和资源归属分别测；同为Pi0.85.1不免除测试。失败后关闭新invocation并保留历史，不能通过删未结算记录回退。
