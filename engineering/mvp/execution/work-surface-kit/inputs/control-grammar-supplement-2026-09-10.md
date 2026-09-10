# 用户转交 · Control Grammar 补充 / Agent-facing continuity（2026-09-10）

后续消费：用户已明确要求“建立为前端规范，并派Luna核对”。[前端连续性v1](../../../../design/agent-interface-2026-09-10/frontend-contract.md)承接本输入，完整3轮见[转录](../../../../design/agent-interface-2026-09-10/input-conversation.md)。下列未核验/候选是原索引时点；本次限定核验与哪些规则已提升见v1，不直接把全篇外部主张升为规范。

来源对话：`补充控制语法`（conversationId `6aa1b433-6058-83ec-86cc-588841a99017`）。本文件保存三轮已完成讨论的可召回索引；原始对话中的网页主张均视为用户提供的研究材料，不因转录自动成为事实或选型。消费裁定见 [intake-round-3 §4ax / WK-162](../intake-round-3.md)。

## 1. 三轮索引

### 1.1 Appica UI：agent-facing design-system distribution

用户提供 Appica UI 截图与以下入口：

- [Appica UI](https://appica.dev/ui)
- [Set up your coding agent](https://appica.dev/ui/docs/react/agents)
- [Theming](https://appica.dev/ui/docs/react/theming)
- [Accessibility](https://appica.dev/ui/docs/react/accessibility)
- [Installation](https://appica.dev/ui/docs/react/installation)

讨论提出一条值得参考的分发链：design-system implementation → versioned agent rules → always-on project rules → discovery index → 按组件按需读取的 Markdown → typed component API；以及“不要把完整设计系统塞进 context”的 progressive disclosure。还提出 semantic registry、nearest canonical precedent、`Do not hand-roll what exists`、role-based tokens 与 `AGENT-RULES.md` / `index.md` 的候选结构。

**状态：`REFERENCE / 未核验 / 不构成硬性选型`。** Appica 的页面内容、版本绑定方式、组件数量、React/Tailwind 要求均未在本项目本轮独立核验；不引入 Appica、React、Tailwind，不把其 package 结构当作 Courtwork 架构决定。

### 1.2 UI Continuity Harness：让局部 agent 维持同一产品语言

讨论提出以下候选闭环：

```text
Design intent
→ Semantic / Control / Visual / Placement Contract
→ Tokens + Components + Patterns
→ Canonical Specimens / Reference Screens
→ Static Conformance
→ Visual Regression
→ Independent UI Review
```

并引用 [Atlassian token tooling](https://atlassian.design/foundations/tokens/use-tokens-in-code)，建议把颜色、圆角、动效、阴影等 raw literal 约束为 role-based token，并把“先查 canonical component / pattern，再允许 local experimental primitive”作为 agent 施工前置。

**状态：`REFERENCE / 未核验 / 候选治理方向`。** 本地已有 AGENTS.md、Design Scout、Atlas、grammar、specimen、intake 与独立复核链；尚未裁决新建 `AGENT-RULES.md`、`design/index.md`、YAML component schema 或全库 raw-literal lint。Atlassian 页面本轮也未独立核验，不作规则依据。

### 1.3 Control Grammar 扩展索引

第三轮重新提出 94 个结果 / 5 条 workstream 的 Projection + Control Grammar，并扩展：Resource Meter、Property Projection / Provenance、Approval scope、Policy Editor、multi-projection、Heatmap、Waveform、Applicability-driven contextual toolbar，以及 16 项 Control Specimen Board。

该索引已经由既有 [S20 / Projection Grammar](../../../../design/sources.md#s20--projection-grammar) 与 `WK-139…149` 消费。不得另立第二套 authority：

- Projection 与 Control 继续并列于 Schema / intent 之下；
- `numeric ≠ slider`、`running ≠ progress`、`complex ≠ graph`、`high-risk ≠ confirm dialog` 与本地 `estimate ≠ meter` 继续按证据三态记录；
- Base UI NumberField 的五种 modality / 两阶段 commit 已进入 CC-I；wavesurfer 仅作无域对象时的参考；
- LangSmith、Tailscale、assistant-ui 等未核验主张仍不得作为规则依据；
- 16 项 board 不另立，按 owner fact 与现有队列切片消费。

## 2. 召回顺序

后续 agent 施工时只按当前任务加载：

```text
AGENTS.md / engineering/current.md
→ 本文件与 engineering/design/agent-interface-2026-09-10
→ design/scout 与 design/atlas
→ 对应 semantic / control / projection / visual grammar
→ nearest canonical precedent + specimen
→ intake / work order / implementation / independent evidence
```

上面是**当前文档消费建议，不是已实现的自动加载器**。任何未裁决外部库、协议或 UI 形态均保持 `REFERENCE`，不能据此创建依赖、按钮、事实字段或后端 schema。
