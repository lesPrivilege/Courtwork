# Agent Interface / UI Continuity · 前端规范入口

2026-09-10用户明确要求建立前端规范并派Luna核对。当前施工入口为[UI Continuity v1](frontend-contract.md)、[最近先例](precedents.md)与[变更记录](change-template.md)，新UI与局部修改均消费此入口。规范是现有grammar/owner的收敛，不是新的runtime；完整输入见[3轮转录](input-conversation.md)，一手核验见[sources-review](sources-review.md)。下列候选表保留原接单时点，已提升的项目以本段与v1为准。

已提升为本地规范：四类合同、nearest precedent召回、先复用再登记gap、作者/非作者证据分列、候选baseline与已接受baseline分开。仍为候选：自动context loader、package-coupled rules、独立YAML ontology、全库raw-literal AST lint、自动像素CI。不能把“规范建立”写成这些工具已实现。

本页衔接 Design Scout、Atlas、grammar、specimen、work order 与独立复核。v1规范已经生效；自动化扩展仍为候选。它不是新的runtime层，也不是组件库选型。

原始索引：[control-grammar-supplement-2026-09-10](../../mvp/execution/work-surface-kit/inputs/control-grammar-supplement-2026-09-10.md)。来源登记见 [sources.md S21–S22](../sources.md#s21--agent-facing-design-system-distribution)；裁定见 [intake-round-3 §4ax / WK-162](../../mvp/execution/work-surface-kit/intake-round-3.md)。

## 当前可消费的本地事实

- 项目 always-on 约束在仓库 [AGENTS.md](../../../AGENTS.md) 与 [engineering/current.md](../../current.md)。
- 来源发现走 [Design Scout](../scout/README.md)，按问题寻址并经过 disposition；capture 本身不产生规则。
- 语义、控件、投影和视觉分别由 [UI state vocabulary](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)、[Atlas](../atlas/README.md) 与各 grammar 承载。
- 实施前已有 work order / intake / specimen / 独立复核链；生产实现仍是本地原生 ES module，不由外部 donor 反向决定架构。

## 实施状态与候选扩展

| 候选 | 目的 | 当前处置 |
|---|---|---|
| version-bound agent contract | 让 grammar / component 规则与产品版本保持可追溯 | v1与本仓库版本绑定；package-coupled contract仍不引入 |
| `AGENT-RULES.md` | 小而稳定、每次局部施工必读的硬约束 | 候选；当前由 AGENTS.md、current、Atlas 与工单共同承担 |
| `design/index.md` | 只列目录，不把全量设计正文塞进短 context | 候选；Design Scout + Atlas 已提供部分能力，未另立平行 index |
| nearest canonical precedent | 局部任务先加载最接近的 precedent / specimen | v1必填先例、状态与证据；不改变当前Scout→grammar→specimen→WK链 |
| semantic component registry | 以 intent / schema / owner fact 防止重复 hand-roll | 候选；不得创造新的域对象、状态或权限 |
| role-token / raw-literal lint | 阻止无语义的颜色、圆角、时长、阴影字面量 | 候选；须单独裁定规则范围与例外，不能直接套用外部 token 体系 |
| `do not hand-roll` gate | 先查registry、grammar、component、pattern、specimen | 已成为施工/复核要求；机械组件复用检查尚未实现 |

## 硬边界

1. Appica、Atlassian 及本补充索引中的其它外部库 / 协议均为 `REFERENCE`，未核验者不得成为规则依据。
2. 不引入 Appica、React、Tailwind、AI Elements、assistant-ui、AG-UI 或其它组件 / runtime 依赖。
3. v1是前端施工规范交付；自动loader/像素CI/AST检查仍候选，无新后端schema、依赖或产品行为，不关闭产品门。
4. 只有 owner fact、已裁 grammar、已登记 precedent 与可复现 specimen 才能进入 canonical；候选项保留来源、状态和撤回路径。

## 推荐召回路径

```text
AGENTS.md / current
→ frontend-contract + this index
→ relevant precedent only
→ Scout problem row
→ relevant semantic / control / projection / visual grammar
→ nearest canonical precedent
→ real-content specimen
→ intake / work order / implementation / independent evidence
```

这是文档索引约定，不代表已经存在自动 context loader 或 `llms.txt` 兼容接口。
