# Markdown Review · 有界施工与异步节奏

2026-09-10，Astra 持有本单前后端架构、关键实现与合流。Chat 仅作参考。实际状态以 [current](../../current.md) 与本页回执为准。

## 本轮已启动的工作

| 单元 | owner / 写权 | 输入与出口 | 状态 |
|---|---|---|---|
| MR-L1 接缝探索 | Luna；仅 `luna-seams.md` | 已有 source/history/tab/Core/ATT 的精确映射与反例 | 已交付；跨层复核两项收窄已消费 |
| MR-L2 上游核验 | Luna；仅 `luna-sources.md` | 主源、固定 SHA/许可证、源码与 README 证据分列 | 已交付；七仓固定源码，不运行上游 |
| MR-T0 当前 renderer 基线 | Terra；仅 `evidence/markdown-review-20260910/baseline/` | synthetic corpus、真实浏览器调用现有 markdown()、原始 JSON、复跑命令；未来 oracle 不计产品通过 | 已交付并经 Astra 新端口重跑8/8；无后端或模型 |
| MR-A0 架构/坐标 probe | Astra；本研究包、`parser-spike/` | 归属/坐标/异步/选型裁定；原始字节与显示文本反例 | 已形成；10/10并经Luna重跑，非产品实现 |

不得把 fixture 自校验、静态 incomplete snapshots 或时间数字称为完整 annotation、流式稳定或性能验收。Terra 不修改 app/shared UI、Core、依赖清单与 current；Astra 独立检查其输出后接受有界事实。

## 后续可派片：先合同再消费

### MR-A1 · 固定版本 reader 输入与 source projection（Astra）

亲写内容身份 adapter、UTF-8/code-point/UTF-16 映射与 projection profile。从已有 ES file-content 分页读取完整受限文件，处理 4k 页面/完整 hash/unsupported、历史 producer 缺席，禁止拿截断 ArtifactHistory preview 构造完整文档 identity。首个评注目标限 Core file Candidate/Artifact；recorded-file 保持只读。

冻结 DTO 后提供真实 service packets、BOM/CRLF/entity/reference/重复段落向量和映射失败出口。默认先块级目标，不承诺任意选区。parser 候选使用 unified/remark + mdast 的隔离实验结果；是否进入 vendored 生产依赖由 Astra 在 parity/体积/许可验证后裁定。

验收：同版本逐块 raw slice 能回原字节；emoji/combining/CRLF 无 offset 混淆；引用定义改变时正确失效；跨 scope 拒绝、迟到响应失效、分页缺失不装成全文。反例必须从独立 oracle 而非实现输出产生。**本轮 A1/T1 已施工，交付与验证见 [回执](../../../evidence/markdown-reader-a1-20260910/README.md)**。

### MR-T1 · Reader 表示组件（Terra）

成熟工作：语义 reader、outline/find/jump、只读 block target、loading/error/unsupported、键盘与窄屏。仅在 Astra 指定的新模块及局部样式内实施；不持有 app.mjs 路由、Core、server、全局 tokens 或 FE-05a 的 shared CSS 写权。由 Astra 串行接宿主与静态 allowlist。

输入：A1 冻结 profile/DTO、实际 packets、当前实际主线 tokens（V1 未落代码时不提前声明已采用）、当前 File tab 合同。验收：1440/390、浅深、200% 缩放、长文和表格不挤压主文，outline 跳转/返回/focus 正确，read-only 不画保存成功，安全 corpus 不回退；不新增真实 fetch/model。不把“agent 能写一个漂亮页面”当作接口已成熟。**本轮已消费 A1 DTO 施工，Astra 接宿主；见上述回执**。

### MR-A2 · 正式评注事务与回执（Astra）

亲写 Core 评注域、服务端 source recheck、可信 actor、CAS/idempotency、回执恢复及迁移。复用单一 Core DB/client，不引 mdProbe sidecar server 或另一个 review service。DDL/版本、backup/restore、旧 host 拒绝须在此单实际定稿，不能先写 schema 版本号。

验收：create/reply/resolve/reopen；不同 scope、伪 actor、旧版本、同 id 不同 payload 拒绝且无部分事件；丢回执精确恢复；重启/跨 Session/producer 缺席按合同；comment resolve 不生成 Artifact/Decision、不改变 Attention、不使 Candidate base 版本无故失效。评注 revision 与 Matter.version/Work stateVersion/Attention revision 分开，receipt 与 decide 的请求命名空间分开；独立 schema/capability，拒绝旧 file/decide descriptor。confirm_reanchor 暂不广告，等 A3 的可重验候选 packet。Astra 作者验证不能自称独立接受，交 Luna 新反例复核。**待 A1，未派**。

### MR-T2 · Review rail 与恢复交互（Terra，等待 A2）

只消费 action descriptors 与 packets：评注列表/回复表单、两个状态维度、冲突重读、保留未确认草稿、原版本/候选版本可检查。采用 A1 的块级操作，不擅自实现自动 fuzzy 重锚。新增模块归 Terra；app.mjs 生命周期与接入由 Astra 统筹。

验收：真实 service 测试不止 mock；重复提交/断线/CAS、快速切版本/关闭视图不被迟到响应覆盖；keyboard/focus/非颜色状态；无 highlighter 支持也可操作；提交命令与回执 trace 可追。**待 A2，未派**。

### MR-A3 · 修订匹配、diff、模型建议（Astra）

亲写不确定性和证据语义、只读 block comparison、确认重绑定，成熟 string diff 可局部借用但不能决定 source identity 或正式状态。先形成有界候选读取 packet（原/目标版本、候选身份、范围、quote、算法版本），再开放 confirm_reanchor；写事务只重验明确候选，不在锁内做 fuzzy 搜索。模型只在需要语义比较的有界任务介入；复用现有运行控制，不另造后台 scheduler/loop。先完成确定性负例再评模型增益。

验收：前插/移动只产候选、重复 ambiguous、重写/删除 orphan、不存在历史 unavailable；原 anchor 从不覆写；同词不同语义/否定改写不自动 resolve；code/table/list/whole rewrite 有可解释 fallback；模型超时/中断只留未确认建议。低置信模型结果和权限/接受无耦合。**后置，未派**。

## 异步纪律与合流

L1、L2、T0、A0 可并行，因为写权与验证范围独立。A1/A2 的契约结果到达后才派相应 Terra 消费，不能让 Terra 边猜 DTO 边实现。每个分片交付固定 SHA、写权差异、实际输入、复跑命令、失败/未检与依赖；Astra 先接受后串行合流。需要 long document worker 时使用 bounded job + generation cancellation；模型建议的返回不能更改用户当前选择。

本单前后端决策不再转交 Fable；既有 FE-05a → FE-05 → ATT-FE-01 → CC-I 的共享文件施工顺序保留，Markdown reader 只有在 Astra 核对实际 writer/HEAD 后才接入。公共站、brand 与本单没有产品写权交叉。不会因“排单”自动建立定时守望或对外发送。

## 用户目标补充 · Output Review 与 Markdown

两条相交边界按 [输出评审架构](../../../docs/output-review.md)分别验收。OR-A0 先清点真实 output 接收/记录/表示缺口，再冻结接收与显示 DTO；不把媒体或未知类型静默丢弃，也不把普通 Markdown 自动升级为正式成果。MR-A1/T1 交付只关闭固定文件阅读切片，MR-A2/A3 与其他 Markdown 来源仍保留自身范围。copycard 复用既有 Code/Copy 控件，复制不产生 review 或 acceptance 回执。

Output Review 有界修复 `5f17cde`：完整assistant消息关闭显示段，保留下一条消息，独立6项反例及既有8项映射通过。该修复不改Markdown与存储，OR-A0的非文本接收/持久身份差额仍开放。
