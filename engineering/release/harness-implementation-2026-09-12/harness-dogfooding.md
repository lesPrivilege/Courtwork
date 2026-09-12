# Pi 底座、能力注册与 coding dogfooding · Astra 裁决

2026-09-12，消费用户连续修订：先排小型 coding dogfooding 工单；建立 Courtwork 主体；保留 Pi core，以扩展组合能力。代码核查基于 main `b087e9f` 与遥测修复 `4720027`。本文是工程排单与架构裁决，未把下列工单标成已实现。

## 采用与顺序修订

保留锁定 Pi 0.85.1 的 AgentSession/model-tool loop/session persistence 作为当前执行底座。验收单位收敛为每个局部 Expert：固定任务范围、指令/工具/权限组合、输入与产物、核查回执，逐个跑通。Coding 是第一种局部场景，不先建设全能 coding 产品。先用小型 coding 任务暴露真实缺口，再沿 Host 的资源目录、绑定、权限、执行与回执链添加能力。无需先替换 Pi、升级 SDK 或另建一套 GUI。当前不追求热插拔、通用插件平台或运行时动态换核；固定且可维护的局部组合即可。现有前后端可继续承接 runtime 封装，但 service 当前仍直接调用 createSessionRun；通用可替换执行器契约和第二真实 runtime 尚未实现。

此修订覆盖原三节点的强制串行顺序：节点一真实贯通之后优先进入下面的 DF 工单；P03/P04/DRT-03 保留为后续按需接缝与替换验证，不再以第二 runtime 为 coding dogfooding 的前置条件。原输入包字节不改。Work/Expert/Core 状态继续由原 owner 持有。

“大多数功能可由 Pi 加 extensions 实现”采用为组合方向，不作任意模块仅注册即可正确运行的断言。Host 权限、版本绑定、并发、持久化和副作用结算仍需实现与测试；Pi extension、CW trusted domain extension、MCP tool、声明式 skill/profile 是不同的适配来源。GUI 只管理和展示服务事实。

## 已有能力与边界

- [Pi 接入](../../../app/runtime/pi-session-runtime.mjs)：使用 native AgentSession，但 `noTools: "builtin"` 且 ResourceLoader 不发现 AGENTS.md、skill 或任意扩展。当前不是原版 Pi coding CLI。
- [Host prompt 和执行组合](../../../app/server/service.mjs)：普通会话是 work assistant，工具围绕 materials/ 和 out/；system prompt 由 Host 注入。[控制面](../../../app/runtime/control-plane.mjs)将显式导入 instruction 按 scope 编译进上下文，skill/reference 先目录后 runtime_load。用户提到的 agent.md 应区分“已导入的文本资源”和“自动读取工作目录 AGENTS.md”；后者当前没有实现。
- [工作区工具](../../../app/runtime/workspace-tools.mjs)已有 ws_list/read/write/grep 与 ask_user；可读代码、产出代码和测试文件。当前没有一般 shell/test runner、任意真实仓库编辑或完整 Pi coding 工具集，因此不能把模型口述测试通过当作执行证据。
- [注册/管理](../../../app/runtime/control-plane.mjs)已有受控工具目录、资源导入、scope exposure、policy、profile ceiling 与 Run binding。MCP 是已支持的动态工具来源；已有 server 可由 GUI connect/disconnect/restart、查看子工具与设置 exposure/policy，但 Add/Configure/Test 表单尚未实现，server 定义须由 Host control API 导入。当前 MCP 仅支持无认证的 Streamable HTTP，非 OAuth/stdio 通用安装器。任意 Pi JS extension 安装/热载入不是现有 GUI 能力。新可执行工具须先接可信 Host adapter/extension 或受支持 MCP，并登记 descriptor/policy；`kind:tool` 不是可直接导入的可执行代码。GUI 的 agent_profile 可表达固定能力组合，但不加载代码。Luna 只读核查路径：`app/web/settings-view.mjs:43-81`、`app/web/runtime-view.mjs:1867-1984`、`app/runtime/control-plane.mjs:153-219`、`app/runtime/extension-registry.mjs`。具体核查见 [成熟实践](research/harness-registry-practices.md)。

## Cache 与稳定性裁决

当前使用稳定 system prefix、变化上下文的追加尾部、排序 customTools、持久 SessionManager ID 与 short cacheRetention。这是在支持缓存的 provider 上保留复用条件，不保证命中；不同 provider 的 cache 字段/策略不能混算。[真实五 Run](evidence/live-deepseek/README.md)收到 SDK 归一化 cacheRead 14,336 tokens，input 2,189、output 1,504。保留独立计数；跨 provider 通用 cache-hit 百分比没有已冻结口径，GUI 不新增推算比率。cacheRetention 提示也不证明 DeepSeek 接收了专用缓存键。

稳定性按具体失败窗口核查：P01/P02/P02b、DRT-02 synthetic、真实拒绝/批准/读回与 graceful restart 已有证据；它们不证明 live cancel、长会话 compaction、故障恢复、跨模型历史或 coding 性能。先消费这些回归，再为实际新增工具增加对应故障测试。TPS 保留未测，沿 BE-42 owner 后续处理。

## 小工单队列

共同运行方式：独立合成 fixture/workspace；通过 Courtwork GUI 发任务；保留准确 model/effort、工具与 instruction binding、Run/权限/产物、执行器测试回执和 usage。每张卡限定一个问题和一次可检查交付，失败保留原记录后再决定重试。Astra 负责能力/Host 改动与裁决，Luna 可探索或独立核查，作者不自称独立接受。以下预算是建议默认上限，实际运行前登记；本次仅排单，未新增模型调用。

| 工单 | 小任务与交付 | 开工条件 / 完成证据 |
| --- | --- | --- |
| DF-01 · Courtwork coding 身份与指令来源 | 先定义第一个局部 coding Expert 的轻量 profile/instruction（是否绑定既有领域 Expert 由实际任务需要决定，不凭 profile 冒称领域实例）：先读证据、产生代码与测试、诚实报告已执行/未执行、保留工作产物与下一步；通过现有控制面绑定到合成会话。普通 work/Attention 身份不全局覆盖。 | 首片可用现有导入路径；核查来源/hash/scope、实际 admitted context 与当前工具列表；同名 AGENTS.md 放进材料不应获得更高权限。不得假装自动发现已实现。 |
| DF-02 · 只读代码诊断 | 给一个约百行、含一个确定边界 bug 的材料包，让 agent 用 list/read/grep 定位并提交 out/diagnosis.md，包含文件/行/输入反例。 | 无新增执行工具即可运行；建议 1 Run ≤4 turns；人工或确定性 oracle 核查，禁止把猜测标成测试结果。 |
| DF-03 · 小修复与测试产物 | 同一 fixture，输出 out/ 中的修正版与针对反例的测试；Host/核查者在独立进程执行确定性测试并回存结果。 | 建议 ≤2 Runs、每 Run ≤4 turns；精确版本批准、文件 hash、真实测试退出码/失败文本。首轮外部核查不是 agent 自运行测试。 |
| DF-04 · 受控测试执行能力 | 只有 DF-03 证明闭环需要时，接一个 Host 托管的固定测试 recipe 工具：白名单命令、确定 cwd、超时/取消、输出上限、退出码与不可混淆的 run ID。 | 先实现注册/exposure/policy/调用回执，再走 GUI；先 synthetic 成功/失败/取消/超限。默认不开放通用 shell、网络、包安装或共享仓库写入。真进程执行是明确新增能力。 |
| DF-05 · 连续性与缓存观察 | 在同一 profile/model/工具集合下继续一项小修复，记录相同稳定前缀的第一请求与后续请求；再单独改变一个 instruction/tool exposure。 | 建议 ≤3 Runs、每 Run ≤4 turns；对照上下文/工具 schema hash、request usage 与 cacheRead，不用单次时间差证明缓存收益，不为追 hit rate 增加授权范围。 |
| DF-06 · 能力挂起与恢复 | 下一 Run 隐藏一个工具并再启用；核查 GUI 原因、binding、provider 实际工具列表和 Host 拒绝旧调用；另核查活动 Run 中修改被既有冻结规则拒绝。 | 先 synthetic，无需付费；挂起不清除历史文本、不撤销旧副作用、不默认为中断正在执行的调用；需要清理上下文时另走 P08，效果未知仍走 P02 结算。 |

完成 DF-01/02/03 后决定 DF-04 的实现厚度；DF-06 是局部能力边界核查，不是热插拔里程碑；可用已有控制面先做低成本核查，不阻塞其他局部 Expert 形成固定组合。Coding 是检验检索、规划、文件修改、工具执行、连续性与核查的代表性任务，不代表所有工作能力的数学上限。未来收窄 capability 应在 Host 强制生效，prompt 只解释。

相关：原 [逐卡表](disposition.md)、[DeepSeek 协议研究](research/deepseek-behavior.md)、[composer/TPS 旧裁决](research/composer-projection.md)。本次源码仅包含已独立复核的响应身份遥测修复；本文件没有附带新扩展实现、生产调用、push 或部署。

## 首轮调试回执

用户随后授权使用已配置 key 调试并派 Luna 核查 reload。[首轮结果](evidence/dogfood-first/README.md)：API 准备 session profile/instruction，GUI 两个目标 Run／五个模型 turn 完成诊断及修复；另有一个导航偏差 Run 单列。v1→v2 下一 Run 绑定无需 reload；生成代码 8/8 与独立 oracle 1,750 检查通过，Luna 非作者复核。DF-02 行号误报保留为部分通过，DF-03 已纠正；Home鼠标 Continue 与通用指令导入 UI 缺口独立登记。
