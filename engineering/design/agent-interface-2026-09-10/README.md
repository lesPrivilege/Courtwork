# Agent Interface / UI Continuity · 候选治理索引

本页记录「补充控制语法」带来的 agent-facing design-system 与 UI Continuity Harness 方向。它是 Design Scout、Atlas、grammar、specimen、work order 与独立复核之间的**候选召回面**，不是新的 runtime 层，也不是组件库选型。

原始索引：[control-grammar-supplement-2026-09-10](../../mvp/execution/work-surface-kit/inputs/control-grammar-supplement-2026-09-10.md)。来源登记见 [sources.md S21–S22](../sources.md#s21--agent-facing-design-system-distribution)；裁定见 [intake-round-3 §4ax / WK-162](../../mvp/execution/work-surface-kit/intake-round-3.md)。

## 当前可消费的本地事实

- 项目 always-on 约束在仓库 [AGENTS.md](../../../AGENTS.md) 与 [engineering/current.md](../../current.md)。
- 来源发现走 [Design Scout](../scout/README.md)，按问题寻址并经过 disposition；capture 本身不产生规则。
- 语义、控件、投影和视觉分别由 [UI state vocabulary](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)、[Atlas](../atlas/README.md) 与各 grammar 承载。
- 实施前已有 work order / intake / specimen / 独立复核链；生产实现仍是本地原生 ES module，不由外部 donor 反向决定架构。

## 候选 agent interface（仅供参考，未裁决）

| 候选 | 目的 | 当前处置 |
|---|---|---|
| version-bound agent contract | 让 grammar / component 规则与产品版本保持可追溯 | 候选；暂不新建 package-coupled contract |
| `AGENT-RULES.md` | 小而稳定、每次局部施工必读的硬约束 | 候选；当前由 AGENTS.md、current、Atlas 与工单共同承担 |
| `design/index.md` | 只列目录，不把全量设计正文塞进短 context | 候选；Design Scout + Atlas 已提供部分能力，未另立平行 index |
| nearest canonical precedent | 局部任务先加载最接近的 precedent / specimen | 参考工作法；不改变当前 Scout → grammar → specimen → WK 链 |
| semantic component registry | 以 intent / schema / owner fact 防止重复 hand-roll | 候选；不得创造新的域对象、状态或权限 |
| role-token / raw-literal lint | 阻止无语义的颜色、圆角、时长、阴影字面量 | 候选；须单独裁定规则范围与例外，不能直接套用外部 token 体系 |
| `do not hand-roll` gate | 先查 registry、grammar、canonical component、pattern、specimen | 参考审查顺序；尚未成为新的机械门 |

## 硬边界

1. Appica、Atlassian 及本补充索引中的其它外部库 / 协议均为 `REFERENCE`，未核验者不得成为规则依据。
2. 不引入 Appica、React、Tailwind、AI Elements、assistant-ui、AG-UI 或其它组件 / runtime 依赖。
3. 不把 agent interface 候选误报为 PR、前端交付或后端 schema；本轮没有新增 work order、依赖、产品代码或产品门。
4. 只有 owner fact、已裁 grammar、已登记 precedent 与可复现 specimen 才能进入 canonical；候选项保留来源、状态和撤回路径。

## 推荐召回路径

```text
AGENTS.md / current
→ this index + supplemental input
→ Scout problem row
→ relevant semantic / control / projection / visual grammar
→ nearest canonical precedent
→ real-content specimen
→ intake / work order / implementation / independent evidence
```

这是文档索引约定，不代表已经存在自动 context loader 或 `llms.txt` 兼容接口。
