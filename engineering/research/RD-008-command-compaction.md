# RD-008 · Typed command入口与原生手动压缩

2026-09-13；Astra选型/接缝裁决。基线`de55674939d3a80afaa0f5ecaf0e4bd159adf95f`。
状态：语义采用、缺口已确认；CMD-01/CMP-01为Release后期Developer能力增量，未实现、未派发，不自动新增G1–G5阻断门。来源与核验见[消费账](slash-compaction-2026-09-13/README.md)。全仓查重未发现已分配RD-008，仅旧输入有“由owner查重后分配”的提醒；本轮由Astra分配，不覆盖既有RD。

## 当场采用

斜杠是输入入口，后端处理typed capability。工具、命令、prompt template、skill保持不同执行语义；extension、project、user、MCP是来源维度。`control/setting/prompt/skill/client_ui`可作为命令分类，但一条具体descriptor必须明确唯一行为：`/model`打开picker属于client_ui，带参数提交配置是另一个setting行为，不能在同一含糊kind里混淆。

注册信息至少包含稳定command identity、aliases、kind、source/provenance revision、target、参数schema、作用域、availability及原因、side effects、是否需交互与version。字段名/URL是设计草案，不是现有API。`Run.commandId`继续是幂等key；命令身份不能塞入其中。保持一份Host-owned discovery，Web只投影；执行时重新校验当前scope/revision/capability，不能把先前广告当授权。

`/status`的读取应零模型请求；`/compact`是control，但会调用摘要模型和修改native journal。“不将命令字符串送进普通模型turn”不等于“该命令免费或无模型调用”。prompt/skill按实际获准资源展开，来源文本不扩大工具权限，旧绑定不得回填。

未来命令模式内的unknown/unsupported/冲突/撤权须fail closed，保留草稿并给出原因，0个普通Run、0次模型请求。普通文本如何显式escape、Unix绝对路径、代码片段、前导空白及既有`/fixture`兼容必须先固定，不可为了禁fallthrough直接封禁所有`/`开头文本。Host built-ins禁止shadow；skill使用独立namespace；第三方source必须保留provenance。MCP prompt/tool不能因同名就获得Host control身份。

## 现状与排期裁决

自动压缩、阈值前留余量、overflow恢复、summary持久化/restart、retry/usage missing、cap、cancel/deadline已经有产品实现与合成验证。本轮[15/15](slash-compaction-2026-09-13/baseline-15.tap)复跑相关合同，不能把自动压缩重新登记为待开发。窗口缺失时的限制及Local test默认关闭保持。

手动压缩不只是暴露SDK方法：当前AgentSession每Run创建/释放，Host的独占与预算从Run admission进入；native `compact()`首先`await abort()`，直接对活动session调用会影响原Run。现有`run.notice`是best-effort，而且Host store与Pi journal不是单库原子事务。因此不接受来源讨论“两个很小包即可Release前加完”的工作量/排期断言。

本轮即时消费到当前[使用说明](../../app/docs/commands-and-compaction.md)、Release能力边界和缺口队列；保留现有model/effort/stop/resources GUI作为首版入口。两项新增能力在Release后期Developer验证面推进；若以后对外承诺slash或手动压缩，则相应缺口必须先完成，不能用文档登记替代实现。真实Provider/专业质量/G4/G5仍按原门执行。

## CMD-01 · Host command discovery与dispatcher

owner：Host service/Runtime Control Plane；前端仅消费descriptor并复用现有picker、Runtime视图和Stop。依赖现有配置CAS、scope绑定、admission；不依赖第二Runtime或通用资源治理完成。

首片先做read/client_ui/setting，compact在CMP-01可执行后才advertise。建议session-scoped discovery；`GET /sessions/:id/commands`与`POST .../commands/:name`仅候选URL，前缀沿现有认证API，不新增无token旁路。配置修改复用当前Host provider-config作用域与expectedVersion；**不虚构已有session-local model setter**。`/effort`只接受现有模型capability值，并验证下一Run/wire；不把SDK setting叫作Provider已生效。

验收最小矩阵：

| 输入/行为 | 判别证据 |
|---|---|
| status/tools读取 | 0普通Run、0模型请求；仅返回当前获准scope信息 |
| model无参数/带参数 | 打开原picker与确定性setting分清；取消不写；CAS冲突不覆盖；实际配置/下一Run绑定一致 |
| effort | 受支持值与省略默认沿现合同，捕获实际provider wire；不支持值0调用 |
| synthetic skill/prompt | 原owner展开、确切资源revision/范围、只进入普通input所需内容；skill与command不混淆 |
| unknown、shadow、旧discovery、参数错误、absolute-path/literal escape | 不静默fallthrough、不丢草稿；命令模式拒绝0请求；明确文本路径保真 |
| 双提交/断线 | 复用幂等/查回机制，未确认不重发副作用；前后端没有第二份固定命令表 |

autocomplete只是可选投影，不能先展示无target的命令。UI沿[frontend合同](../design/agent-interface-2026-09-10/frontend-contract.md)与现有composer/model-picker/Runtime disclosure，需单独明暗宽窄/键盘验证。

## CMP-01 · 原生manual compact的Host操作生命周期

owner：Host service、Pi adapter、现有Session journal；Astra负责admission/迁移，不能只在Web或extension新增直调SDK路径。

首版明确选择：只接受idle Session，active Run或另一compaction时明确拒绝，**不排队、不隐式abort原Run**。实现时必须把Run与manual operation放在同一serialized admission互斥里；检查后再打开SessionManager，不能在竞争获胜前创建第二writer。生命周期应复用Host执行管理接缝，但不能伪造一个普通用户turn或把control串送入prompt。

需冻结并实现以下合同后开放：操作ID/幂等回执和按ID查回；当前provider/config/credential与context绑定；有界focus输入；provider deadline/cancel/close；journal持久化与事件提交顺序；崩溃后unknown/成功查回而不自动重复付费压缩；无历史/已压缩/too-small返回非成功原因。token、usage与费用缺失分别记账，记录前后estimate来源；raw summary/error不默认暴露。采用现有store增量或独立operation记录须经schema/恢复裁决，不能依赖best-effort `run.notice`充当唯一回执。

调用Pi 0.85.1 `compact(customInstructions)`，复用原summarizer/JSONL。执行前后从既有owner编译上下文；恢复后重新绑定当前tools/context；不得从summary恢复权限、抹掉Core source/Decision/Artifact或重写用户历史。没有必要引入第二summarizer或Context专用真源。

验收：低于auto threshold且有足够历史时可手动压缩；focus实到摘要请求；reason=manual；无额外普通用户turn；活动Run并发拒绝且原Run不被abort；取消/超时不写partial summary；ACK丢失后同ID查回/重试不重复调用；空/too-small/already-compacted明确非成功；每轮有新增历史的三次manual compact后当前Host上下文/获准文件和约束仍可用。原threshold/overflow/retry/cap/cancel/restart以及撤权/compaction输入绑定继续回归。连续三次对同一份已压缩历史重复点击不应被硬要求三次成功。

## CMP-02 · 后续质量与可观测性

后于CMP-01和真实长会话证据；不是当前Release门。先利用现有request telemetry与native结果，区分tokensBefore来源、estimatedTokensAfter、真实usage与未知；不从动画或字符数声称Provider窗口/TPS。接现有[BE-42](../mvp/execution/work-surface-kit/backend-requests.md)的测量边界，但不冒称decode测量等同compaction统计。

通过有界真实coding长会话定位具体丢失（路径、constraints、tool结果、未决工作），再决定需否摘要校验器或双阶段probe。Gemini阈值/保留比例/输出预算、truncation回退、双阶段摘要先留研究候选，不直接移植参数。持久治理状态仍归Core/Runtime/LG/RG原owner，memory需求接RD-007及现有Memory Broker，不新增平行存储。
