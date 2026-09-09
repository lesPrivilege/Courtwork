# 来源处置与局部选型 index

2026-09-09，以`4c1c4205a4bc9479e1699471f40342d85cbc2b75`为本地核对基线。下文是有界评估，不是新依赖采用决定；产品状态看 [current](../../current.md)。原始来源正文保留自身历史表述，不能当成当前指令。

## 输入覆盖与对应关系

- C01：[架构插件化调研](chatgpt-conversation://6aa10937-9ad0-83ec-aaca-a63e68fe5969)。接口返回一轮、两条消息，`hasMore=false`、无下一页，答复8025字符，未见截断；turn/user ID `e678a84d-c80e-470a-8e6b-f32c8c24fbc3`，assistant ID `f10110d8-ebda-49cb-a887-8ef49b9ed545`。
- H01：用户随后提供的 [handoff.md原字节副本](inputs/handoff.md)，366行；内容与会话主题及A…F建议相符，作为独立补充来源消费。接口中的`content-reference index=19`未解析出附件，不能证明H01与其字节身份相同。
- [manifest](source-manifest.json)含两条消息hash/长度、H01字节hash、章节与S/R引用原行号。原会话未复制入Git；H01保留原文，不修改其中旧基线或“not_started”。

| 来源章节 | 采用与修订 | 后续去向 |
|---|---|---|
| C01开头/H01 §0–2 | 原研究SHA62556b7只作历史；本次重读当前main。保留Pi局部适配，不迁移整个DSH。 | AM-A与下表 |
| C01 §三/H01 §3 | package/capability/instance/invocation分义，沿既有owner，先普通模块边界。 | Design、AM-D/E |
| C01 §一/四/H01 §4 | 选择性等待、结果归属、执行/交付/工作分离；确认接收不等于模型理解。 | AM-B |
| C01 §五/H01 §5 | 最终payload、两类fingerprint、cache读写分列；provider规则按版本核对。 | AM-C |
| C01 §六/H01 §6 | 安全边界激活、撤权优先、有限旧代际、四种回退；renderer缺席仍可读。 | AM-D/E |
| C01 §七/H01 §7 | 独立CLI复现与维护包；维修者不自改验收。 | AM-F |
| C01 §八/H01 §8–9/11 | A/C先、B纵切、D/E按缺口、F独验；工单建议不视为已启动。 | PR计划与当前路线入口 |
| H01 §10 | 原11个S外部来源、6个R固定仓库来源完整保留；C01不透明citations不伪造对应ID。 | 以下来源卡 |

## 局部选择与退出条件

| 单元 / owner | 当前方向与对照 | 差异成本 / 何时升级抽象 |
|---|---|---|
| Provider/Loop M01/02/04 | 继续锁定Pi，async用窄adapter候选；DSH只借机制 | serializer/parser/loop/continuation四段证明；原生不通则明确adapted，不隐式新loop |
| Activation M08/M14 | 普通模块+显式生命周期；DSH/Cordis为可撤销effect对照 | 只有真实替换/版本冲突/隔离需求才加框架或进程；记录dispose/drain与退出成本 |
| Task M02/03/04 | host运行记录+版本化MCP/provider adapter | MCP旧实验与新扩展两条wire协议分别适配，host状态不依赖其永久字段 |
| Request/Context M01/M09 | 确定性投影与最终请求观测；provider-specific缓存编译 | 本地稳定不等于provider命中；测不出收益则不扩缓存平台 |
| Contributions M08/M10/M11 | typed view/command，沿现有受信renderer与host history | VSCode借manifest/placement，不建marketplace；第三方执行隔离另单 |
| 维护 M14 | Git、固定fixture、CLI、reviewed PR | 独立复现失败则补契约/测试；不以更多说明或整体升级掩盖问题 |

## 原交接来源逐项记录

以下S01…11均完成原始页面有界读取；不代表其代码已安装、文档覆盖全部、协议组合已测或许可已允许再分发。观察日均为2026-09-09；latest/master未pin实施版本。R01…06保留原研究的固定来源，本轮未重新读取历史远端blob，当前事实以本地主线合同与PAPER指针核对。

| ID / 来源 | 消费范围与限制 |
|---|---|
| S01 [Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)（H01:330） | GPT-6 Astra及以后模型的Responses function/custom direct calls支持async；应用执行工具，原call_id回传；hosted tools/PTC不适用，multi-agent mode不可与parallel tool calls组合。原生wait由应用定义，非内置API。 |
| S02 [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)（H01:333） | 按模型代际区分显式/隐式breakpoint、prefix匹配和cache读写；共享前缀不是命中保证。精确lookup数量在指南与参考检索结果间有差异，不冻结为本产品常量。 |
| S03 [Anthropic tool use with prompt caching](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching)（H01:335） | 工具→system→messages的prefix影响层级；defer_loading/tool_reference是该provider协议特例，不能推广为任意动态toolset。 |
| S04 [Claude Code prompt caching](https://code.claude.com/docs/en/prompt-caching)（H01:337） | Claude Code自己的追加历史、MCP deferred与prefix-loaded工具差异、模型/插件/压缩影响；不能外推为Courtwork实现。 |
| S05 [Pi Extensions](https://pi.dev/docs/latest/extensions)（H01:342） | latest扩展文档有before_provider_request和reload生命周期；reload旧handler可能仍处于旧frame，应结束旧流程。此页面不证明锁定0.85.1全链支持。 |
| S06 [MCP Tasks overview](https://modelcontextprotocol.io/extensions/tasks/overview)（H01:344） | 新的opt-in Tasks扩展：durable handle、tasks/get含终态结果、tasks/update补输入，cancel仅确认意图；client/server协商，不默认支持。 |
| S07 [MCP Tasks SEP](https://modelcontextprotocol.io/seps/2663-tasks-extension)（H01:345） | SEP-2663标Final；与2025-11-25实验Tasks非wire-compatible，新扩展移除tasks/result及旧task opt-in字段，取消ack不保证cancelled。 |
| S08 [MCP specification](https://modelcontextprotocol.io/specification/2026-07-28)（H01:346） | 2026-07-28规范入口含per-request能力与可选扩展；入口“初始化协商”概述与扩展详细流须结合实际schema核对，不能以页面版本号代表当前client支持。 |
| S09 [DSH architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)（H01:348） | service/typed event/reversible effect；web与一次性/stdio profile的reload策略不同。master页面是方法参考，动态包持久性仍沿既有EX-WK6的固定证据边界。 |
| S10 [VS Code manifest](https://code.visualstudio.com/api/references/extension-manifest)（H01:350） | manifest有contributes、engines、main/browser、extensionKind，支持一个分发包组合不同贡献；不采纳VS Code产品依赖。 |
| S11 [VS Code extension host](https://code.visualstudio.com/api/advanced-topics/extension-host)（H01:352） | local Node、web worker、remote Node host；placement由能力、entry和extensionKind等决定。host选择与权限隔离仍需独立验收。 |
| R01 [Courtwork architecture](https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/engineering/architecture.md)（H01:357） | 历史固定引用；不替代当前本地同类文件。 |
| R02 [Courtwork current](https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/engineering/current.md)（H01:358） | 历史固定引用；不替代当前本地同类文件。 |
| R03 [Source resolver contract](https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/docs/runtime-control/source-resolver.md)（H01:359） | 历史固定引用；不替代当前本地同类文件。 |
| R04 [既有 DSH explore](https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/engineering/mvp/execution/work-surface-kit/explore/ex-wk6-dsh-plugins-webui.md)（H01:360） | 历史固定引用；不替代当前本地同类文件。 |
| R05 [Dependency declaration](https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/app/package.json)（H01:361） | 历史固定引用；不替代当前本地同类文件。 |
| R06 [SE Canonical 9.6](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md)（H01:362） | 历史固定引用；不替代当前本地同类文件。 |

## 版本差异必须带入施工

[OpenAI async工具](https://developers.openai.com/api/docs/guides/async-tool-calling)支持范围为GPT-6 Astra及以后模型、应用执行的function/custom direct calls；hosted built-ins与programmatic tool calling不适用，multi-agent mode不能组合parallel tool calls。模型继续工作不替应用运行后台任务，结果仍绑定原call。wait是应用定义的同步工具。这些是文档能力，当前Courtwork/Pi的native端到端支持仍待AM-A/B证明。

[MCP SEP-2663](https://modelcontextprotocol.io/seps/2663-tasks-extension)明确新扩展与2025-11-25实验Tasks不wire-compatible。Luna首先抽查的 [N01旧实验页](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)只能作为历史对照；本轮再读S06/S07确认新流使用get携终态result、update补输入与ack-only cancel，不能混用旧tasks/result和旧task参数。协议允许取消后不再保留client状态，不意味着Courtwork可丢掉自己仍需对账的来源/结果记录。

[N02 DSH services](https://deepseek-harness.github.io/deepseek-harness/en/develop/framework/service)支持required服务消失时dependent dispose、恢复后reload和分组实例的机制参考；这不证明安全隔离。动态包的固定历史源见 [EX-WK6](../../mvp/execution/work-surface-kit/explore/ex-wk6-dsh-plugins-webui.md)：`99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`，原卷标MIT，进程内定义/指针不等于持久事务回退；本次沿用该证据，不重新查旧工作树。采用新代码仍须重查确切目录许可。

OpenAI缓存指南的精确lookup范围与检索到的API参考数字并非一致；本包只采纳版本化breakpoint/prefix与真实读写测量原则，不复制数量到永久合同。遇到未知字段不能静默丢弃后标native；兼容表必须说明拒绝或降级及丢失的行为。

原会话自述“已经检索/核对”不作为本次实测证据。所有外部来源只有方法/文档证据；真实运行、回退、安全隔离与专业成果验证保持未运行。原交接中拼写Scale/ICP按上下文解释为多类贡献示例，不自行创造新协议名。

## 本地主线能力映射（只读核对）

Luna沿固定`4c1c420`调用链核对以下入口；未运行产品测试，不能据本表提高证据等级。依赖源码定位采用锁定包名/版本+包内路径，安装目录不是Git治理来源。

| 入口 | 当前事实 / 后续差额 |
|---|---|
| [package](../../../app/package.json)、[lock](../../../app/package-lock.json) | 三个Pi包0.85.1、MCP client2.0.0，lock v3；Node最低版本见实际engines。latest文档不能替代锁定组合 |
| [Pi runtime adapter](../../../app/runtime/pi-session-runtime.mjs) | 每Run新AgentSession，SessionManager保留会话transcript；本地Promise与pending/drain处理事件持久化，非durable job |
| `@earendil-works/pi-agent-core@0.85.1/dist/agent-loop.js`、`dist/agent.js` | loop等待provider/tool batch；Promise.all为本地batch，activeRun/steer/followup均在进程内；native async的解析/等待/交付仍需全链证明 |
| `@earendil-works/pi-ai@0.85.1/dist/api/openai-responses.js`、`openai-completions.js` | 构造payload后发stream请求；Responses当前store:false，无远端background job。AM-C观察最后onPayload之后，不能仅查system prompt |
| [service](../../../app/server/service.mjs) | Run receipt持久、entry.task本地异步；restart将active变unknown，非in-flight resume。cancel/late-event有admission gate，晚question answer经queue再检 |
| [store](../../../app/server/store.mjs) | schema4串行原子JSON写入；有Run/events/questions/配置/extension records，未持久provider continuation、task handle/delivery队列 |
| [registry](../../../app/runtime/extension-registry.mjs)与service | generation/status落盘；active Run阻止配置/扩展mutation；reload失败invalidated/fail-stop，非自动fail-back。新代际drain/prepare是AM-D新增设计 |
| [runtime owner](../../../app/server/runtime.mjs) | 统一构建/关闭顺序；已有close不证明跨进程任务恢复 |
| [静态准入](../../../app/server/index.mjs)、[renderer测试](../../../app/tests/renderer-admission.test.mjs) | 精确allowlist，optional renderer缺字节404；不开放任意动态代码 |
| [web app](../../../app/web/app.mjs)、[surface modules](../../../app/web/surface-modules.mjs) | session/extension/generation/request/abort guards控制late fetch与mount/update/dispose；只读fallback显示packet/actions文本，无通用action按钮 |
| [NDA renderer测试](../../../app/tests/nda-renderer.test.mjs)、[扩展重启](../../../app/tests/extension-restart.test.mjs)、[Work恢复](../../../app/tests/work-http-recovery.test.mjs) | 已有相关测试入口，AM-E增量反例复用；本次未重跑 |

当前所有active Run上的配置/绑定/extension mutation禁止是现状；本包“新代际承接新任务、旧任务排空”是候选能力，不能当作已有热替换。当前重启unknown是可解释恢复事实；AM-B在其上补可恢复任务时必须保留未知结算边界，不以重新执行旧输入冒充resume。
