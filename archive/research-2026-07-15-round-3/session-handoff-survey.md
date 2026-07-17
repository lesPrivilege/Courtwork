# 通行 session 续行/handoff 方案调研（2026-07-17）

调研原稿，不具约束力。命题：通行 handoff.md/续行方案值得吸收什么，如何集成到 harness；立足点是下沉与防呆（用户永不手写 handoff，系统代劳），schema 语义只是其中一部分。

## 核心判定

**外部方案全线同构**：Claude Code `/compact`、Codex compact、opencode compaction、Amp thread-handoff、mattpocock/softaworks/hermes 的 handoff.md——本质都是「一次 LLM 调用把历史压成自由散文」，唯一质量闸是格式检查（secret 扫描、TODO 占位检测），**没有一家做事实校验**。我们的续行投影（`buildProjectionSegment` 从权威态确定性组装、禁 LLM 压缩）在立场上已经赢了；该吸收的不是形式，而是它们字段分类学里我们缺字段的族。

## 字段分类学 × 我们的覆盖

十一族：目标/当前状态/未决阻塞/工作假设/下一步/工具环境/文件坐标/用户偏好/教训陷阱/验证证据/会话链路。

- **已覆盖且更硬**：当前状态（artifact 投影纯函数）、门禁类阻塞（pendingGateLabels）、决策（RevisionEvent 是账本事实而非模型转述）、下一步（todo-snapshot 确定性派生）、会话链路（chainId/turn_linked 已结构化）。
- **最大诚实性缺口**：**「未验证/曾失败待重试」与「从未开始」无显式区分**——未落格=默认未完成是隐含语义，续行会话分不清上次是失败中断还是没开始。底层数据已全在（`step_failed` 事件携 reason/retryable、`WorkProjectionPhase='interrupted'`、replaySession 已承诺重建两类 failed steps），只是投影没编译它。这恰是 hermes checklist 反复强调、三家 compact 完全没做到的短板。
- **混合形态族（模型提案+系统校验，后置）**：工作假设、策略性建议——正确通道是既有 `ask_user` 受控提问，经用户确认沉淀为 RevisionEvent（类比 QuoteClaim 铸造），不允许模型自由文字直入投影。
- **拒绝族**：教训散文（除非锚定 step_failed）、options-considered 类模型自证、handoff 文件/链式引用/staleness 检测状态机（Work 侧 envelope 本身就是权威续行源，不存在「handoff 过期」问题；Chat 侧 ADR-013 一小时窗口+蒸馏已是更轻机制）。

## 集成方案

不新增段：续行投影段内部新增纯编译子节「未产出/待执行」，紧跟 pendingGateLabels 之后，区分**从未开始 / 失败待重试（携 reason）/ 等待确认**三态。触发点复用既有四个（artifact 落格、gate 产生、失败/中断终态、跨窗 memory 注入），用户零操作。不触 ADR-009 port 类型、ADR-010 envelope schema、ADR-013 决定四（Work 不复用 chat memory 语义）——属投影内部编译规则扩展，SPEC 留痕即可，不必升 ADR。「用户中途改目标」若要吸收则是新事件类型，需另行拍板，本轮不做。

## 风险防线

模型提案字段唯一安全路径是 ask_user/RevisionEvent 通道，绕过即双重触线（禁 LLM 压缩 + 不变量 1）；未来若吸收环境态字段，复用 ADR-013 密钥禁令并补混入反例；外部方案的 chain/staleness/quality-score 复杂度全部拒绝——能用规则解决的不上模型。

## 下游价值（对外口径素材）

「续行投影 vs handoff.md」是继「schema vs skill」之后第二个同构对照：通行方案让模型写散文自证，我们让系统编译可 golden 测试的投影——**下沉与防呆不是功能是立场**。可入上游演示证据线。

## 时机

落地为 `PROJECTION-RESUME-1`（已登记就绪图），排入发版后 Fable 实现队列。

来源：code.claude.com/docs/en/sessions；gist badlogic compaction research（四家对照）；github mattpocock/skills handoff、softaworks/agent-toolkit session-handoff（含 handoff-template）；hermes-agent.ai handoff checklist；本仓 system.md 六段 harness、ADR-009/010/013、segments.ts、todo-snapshot.ts。
