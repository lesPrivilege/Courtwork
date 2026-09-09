# Browser capability：可选 Browser Agent / Driver 接缝

2026-09-09。消费用户给出的[“考虑解耦提供”讨论](chatgpt-conversation://6aa15944-d4ac-83ec-b667-5264664e6da6)：一轮、两条完整文本，无附件或更多分页。研究基线 `751be02939cd458965b7bdfbe20cb00a13b6e45b`；上游 `browser-use/browser-use-pi@e0df2743e680125a4378d4d578420917620711f2`，源码声明 `@browser_use/pi` 0.1.0 / Pi 0.85.1 / MIT。这是研究与后续 PR 准备，没有安装或实现产品 adapter。

## 裁定

**保留为可选 Browser Agent adapter 候选；Browser Driver 的连接/资源生命周期单独描述。当前为 evaluate，不继承原答复的 ADOPT 为安装或产品接受。** 有价值的是可替换行为接缝及反例，不是另建总 Runtime、Core、session storage 或任务账本。

源码确实把 `BrowserUse` 的 loop/context/result 与 `Browser` 的 local/cloud/Chrome 选择区分开；公开包目前仍整体依赖 Pi。两层在概念合同上分离，不要求立即 fork 或拆成两个 npm 包。仅有一个实现时，不把未经消费者验证的 `connect/snapshot/evaluate/input` 方法表冻结为通用 ABI。

原讨论的关键修正：

| 原讨论建议 | 核验后的处置 |
| --- | --- |
| hooks 可承载 purchase/submit/upload/login 的治理 | hooks 可拦截命名 tool call，但任意 JavaScript/CDP 能绕过该命名层；不能由此声称完整授权或披露边界。上游明确不提供 sandbox |
| partial checkpoint 可在 worker crash 后保留 | 限 SDK parent 存活且已收到 publication；partial 不经最终 schema 验证。parent/机器崩溃恢复、正式成果耐久性需独立证明 |
| typed final 是“经验证 execution result” | schema 证明形状，不能证明来源真实或专业正确；`validateResult` 也不替代 Core 验证/决定 |
| JSONL event log 可接入 Event Log | 可作来源；live queue 会失败、journal 会省略/截断内容、持久化失败可变 warning。不能原样充当 Courtwork 完整事件记录 |
| 小型 raw CDP/AX/screenshot 集合已证明充分 | 是上游实现选择与可研究方向，不是跨站点、安全或维护成本的充分性证明 |
| 薄 adapter + pin 即可直接采用 | pin、权限/资源边界、准确结算和可重放的故障测试都须具备；相同 Pi 版本不等于兼容或无隔离需求 |

依据见 [上游核验](upstream-review.md)；原文与来源限度见 [source-index](source-index.md)。

## 在 Courtwork 中的位置

- **Runtime owner**：主 Run 下的受限 browser invocation。主模型只接收有界结果和证据引用；browser transcript、JS heap、登录 profile 分别保留适用范围。多个会话可并发不等于已有 AM-B 持久任务能力。
- **Driver owner**：准确标明 created/attached 的 browser、tab、profile、CDP 连接及 close 行为。附着用户 Chrome 不等于拥有整个浏览器；首个实验不用真实用户 profile 或 Cloud。
- **Core owner**：保留 Candidate/Artifact/Decision 及人意图。browser `completed`、checkpoint、下载成功或 `validateResult` 通过都不产生正式接受。
- **来源/文件**：URL、时间、截图、JSON、下载路径是 observation。正式材料由既有 Intake/来源合同引入；文件成果按 ES 的可信记录和完整历史字节合同。不能将上游 `files()` 路径清单伪装成 `run.artifacts`。

[接缝草案](contract-draft.md)固定哪些事实不能丢；[候选 PR](pr-plan.md)给首消费者、写权候选和失败退出条件。

## 先后关系与交付范围

AM-A当前仅完成有界源码/owner盘点，provider×API×model×adapter×mode的完整兼容矩阵尚未交付。AM-C 已在 `87c8818` 完成 local-fake 出站请求基线并由 `751be02` 合流；原 AM 准备包中的未开工描述是旧时点。Browser 接入必须扩展同一请求/兼容验证，不能自称现有三项 golden 已覆盖它。AM-B、ES-01、Attention 产品对象仍未实施。

本轮只新增本研究目录，Astra 整合、Luna 分片只读探索；保持上一轮 `52f75dd` 交付分支固定。main/current/BE 台账写权由来源 Astra 持有，合流时才登记研究索引。未改前端队列、Core、schema、Paper或G1–G5；未运行上游代码、浏览器、模型、安装脚本、遥测或付费服务。原来源建议的目录形状不作为本轮产品写权。
