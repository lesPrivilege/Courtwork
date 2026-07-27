# opencode 定向三题（TOOL-READ-1 派单前置；2026-07-27，源码级）

抓取基准：仓库已由 sst/opencode 迁至 anomalyco/opencode（sst 路径 raw 仍指向同一 dev 分支）；npm `opencode-ai` 最新 1.16.2。源码经代理抓取、由摘要模型提取引文，无法直接核对原文处已标注 UNVERIFIED。

## Q1 · 权限配置的记法与归一化

现存记法五种：顶层 `permission` 三形态（全局字符串／工具→动作 map／工具→{pattern→动作} 嵌套，动作取 allow/ask/deny 三值，pattern 支持 `*`、`?` 与 `~` 展开）；agent 级 `permission`（与全局合并，agent 规则优先）；已弃用的 `tools` 布尔 map（`true` 等价 `{"*":"allow"}`）；运行时 approved 规则（用户选「始终允许」后追加）；启动旗标 `--auto`（自动批准未显式 deny 者）。

归一化机制（`packages/opencode/src/permission/index.ts`）：一切记法先化为 `Rule { permission, pattern, action }`，合并即数组拼接（`rulesets.flat()`），判定取**最后匹配**（`findLast`），无匹配兜底 ask。`tools` 派生规则作底、显式 `permission` 覆盖（`config.ts` 的 `mergeDeep`；`write/edit/patch` 合并为 `edit` 权限）。

优先序（findLast 语义，越靠后越优先）：内置 defaults → 内置 agent 微调 → 全局配置 → agent 级配置 → 会话内 approved 规则。内置 defaults 含 `"*": "allow"`——**有效默认为 allow**；`read` 对 `*.env` 为 ask。docs 称 .env 默认 deny 与代码 ask 不一致，何者为准 UNVERIFIED。

对本仓的判定：归一化的**形**可借（统一 Rule/Ruleset、last-match-wins 的确定性判定）；**默认不借**——本仓三态闭集默认 deny 不变。运行时 approved 规则即 session 级 always，与本仓「授权作用域＝单次提案」相悖，只借皮不借语义（再证）。

## Q2 · 工具结果在会话历史中的形态

ToolPart：`{ id, sessionID, messageID, type:"tool", callID, tool, state, metadata? }`；四态状态机 `pending（input+raw 流式原始入参）→ running（+time.start）→ completed（+output:string, title, time, metadata, attachments）/ error（+error:string）`。metadata 二分：part 顶层（provider 信息）与 completed 态内（工具自报）。每次状态迁移经 `sessions.updatePart` 落盘。

截断双层：工具层生产时截断（`truncate.ts`，默认 2000 行／50KB，全文写旁路文件并内联告知模型续读方式）——会话日志存截断后字符串；送模型另有视图截断（`truncateToolOutput`），不改存储。pending/running 态转 model messages 时按错误结果输出 "[Tool execution was interrupted]"——**每个 tool_use 必须有对应 tool_result** 是 API 硬约束的消化形态。

对本仓的判定：「中断的 tool_use 必补 tool_result」与「截断是显式事实并内联告知」两条可借形；四态状态机与本仓 typed failure 思路同构，加固。

## Q3 · abort/steer 语义

服务端无队列无 steer：`prompt()` 单会话独占运行，忙时抛 BusyError（函数名经 issue #16102 转述，UNVERIFIED）；steering 为三个 open feature requests（#16102/#24298/#32157）。排队是**客户端**正式特性：CLI/TUI 本地入队、turn 结束后 drain；桌面/网页 app 走 `shouldQueue/onQueue` 回调。

显式中断：客户端调 session.interrupt；未完成 assistant message **保留并封口不回滚**——已产出 parts 全留，补记 aborted error 与 completed 时间；运行中 tool part 转 error 态（"Tool execution aborted"，metadata.interrupted）。

对本仓的判定：`CHAT-QUEUE-1` 票面（排队发送、不 steer）与上游收敛一致，加固；benchmark-openwork 所记「busy 即 steer」按客户端排队读，口径已在就绪图该票行订正。中断「保留封口不回滚」与本仓账本纪律同构。

## 来源

opencode.ai/docs/permissions 与 /docs/agents（2026-07-27 版）；raw.githubusercontent.com 的 permission/index.ts、config/config.ts、agent/agent.ts、schema v1/session.ts、session/processor.ts、tool/truncate.ts、session/message-v2.ts、session/prompt.ts、cli/cmd/run/runtime.queue.ts、app components/prompt-input/submit.ts（dev 分支）；issues #16102、#24298、#32157；v2.opencode.ai interrupt API 参考页（抓取 404，端点内容 UNVERIFIED）。
