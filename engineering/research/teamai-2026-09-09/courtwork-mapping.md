# TeamAI 多专家分析：Courtwork 局部映射

日期：2026-09-09。基线为 `main@3af83ebd35a09b4d029a9b8ce6e9c1979b7f6c54`；本页只做有界只读映射，不实施代码、安装依赖、改 Paper 或创建 TeamAI 工单。输入是个人 Attention 项目 `private/sources/teamai-conversation.md` 的完整 2 turn；其中 TeamAI 的能力、成熟度和修复描述仍是聊天来源主张，不能当作本仓已核验事实或“直接取型”授权。

## 定位

TeamAI 最适合作为 **Expert package / registry / distribution / context control** 的参考，不是 Courtwork 的 Multi-Expert Runtime 母版。它可供消费的是资源治理、scope 组合、canonical → runtime-native renderer、source anchors、渐进 recall、friction signal 和 Git-native maintenance；planner、并行调度、handoff、仲裁和 Matter commit 仍归现有 Runtime/Work owner，不能新造 TeamAI 总平台。

| TeamAI 局部 | Courtwork 现状与实际路径 | 可消费位置 / 限制 |
|---|---|---|
| scope + Expert package taxonomy | `app/runtime/control-contract.d.ts` 定义 `org/user/workspace/agent/session/invocation`，当前可写仍是 user/workspace/session；resource kinds 已含 `agent_profile`、skill、instruction、reference、tool、permission_policy、hook、workflow、registry | 作为 AM-A/M08 的 scope/precedence 与资源分类输入，并与 ATT requester/purpose/disclosure 对齐；不复制 TeamAI 同名覆盖或增加新 owner |
| canonical renderer + effective/bound | `RuntimeComposition`/`uiSlots` 是声明式 profile，`docs/runtime-control/architecture.md` 禁止 imported JS/hook/custom renderer；`docs/runtime-control/api.md` 区分 effective-next-run 与 recorded-run binding | 映射 AM-E host allowlist 和 M08/M09；Expert 语义可由各 Runtime 编译，比较 requested → effective → bound，不把 TeamAI 输出格式当 Courtwork schema |
| registry + install + ownership | Runtime Control catalog 保留 scope/source/installed/running/exposed/health/provenance；`app/runtime/extension-registry.mjs` 只管受信 extension catalog/lifecycle；`registry` adapter-required，package resolution/signing 未实现；`docs/runtime-control/sources.md` 要求 lifecycle owner 和证据 | 消费 AM-A/D 的 provenance、prepare/activate/retire、版本和回退；`app/runtime/source-resolver.mjs` 仅 inline inspect，locator unsupported，不是安装器；安装、曝光、连接、执行分开 |
| recall + source anchors | `app/runtime/control-tools.mjs` 的 `runtime_load` 显式加载；`app/runtime/workspace-tools.mjs` 的 `ws_grep` 有界；tgrep 在 `docs/runtime-control/search-reference.md` 未安装/选定；R2 resolver 绑定 exact content/artifact hash，origin 仍 unverified；`app/core/owner.mjs` 的 `compileWorkContext` 包含 bounded `sourceRefs` | LG-01/02 先 exact/lexical、range、generation、coverage；ATT 按 registry → inspect → grep/relation → bounded semantic → source；把 TeamAI `Sources:` 转成 source version/range/locator/next disclosure，不建知识图谱或 recall subagent |
| friction + promotion boundary | `app/server/store.mjs` 的 RuntimeStore `events` 只是执行观察，当前没有 Expert promotion owner；ATT草案定义 `record_signal`，LG-03计划 finding → Core candidate → decision | interrupt、correction、denied tool、重复错误只能生成 signal/Attention candidate（不自动成为人的待办义务）；已授权且可验证的维护 adapter 可按 Core policy 更新，不能仅凭friction或召回次数提升正确性、promote或resolve |
| Git lifecycle + owned patch | AM maintenance contract 要求 provenance/contract/compatibility/reproduction/maintenance/evidence，AM-F 做非作者维护演练；当前没有通用 owned-patch service，AM-D/F 规定资源归属、禁用、升级/回退 | 作为 Expert version/provenance 候选；若注入 native 文件须有 stable id、manifest、owned paths、reconcile/remove/doctor，并保留用户修改/证据；不建 Expert Store |
| multi-expert orchestration | `engineering/research/local-governance-2026-09-09/runtime-roadmap.md` 的 EX-01 先单个 bounded explorer，EX-02 只有测得串行瓶颈才比较并行；M02/M04 仍拥有 loop/session/adapter | 不引入 mailbox/team/swarm；调度、handoff、reconciliation 沿 EX/AM-B 验证，未有瓶颈不新开编排平台 |

## R2–R6 对照

- **R2**：`docs/runtime-control/source-resolver.md` / `app/runtime/source-resolver.mjs` 是声明式 inline source 的 inspect-only 局部；无 HTTP/UI/model tool、无 locator acquisition、无 install/exposure/acceptance。
- **R3**：Runtime adapter compatibility 尚未完成；现有 source/renderer 只允许声明能力和显式 unsupported，不证明 Expert 在 Pi/OpenCode/Codex 间等价。
- **R4**：Expert 的 Proposal 仍未交付；resolver 明确没有 proposal store 或 resolve route。现有 `operation: "put"` 是 Runtime Control 的声明式配置 mutation（并在 fixture 中覆盖），不能冒充 Expert Proposal/apply。
- **R5**：事务 apply/rollback 不是 R2 parser 的能力；既有 Runtime Control mutation 有 revision/CAS，但新 Expert 安装、source acquisition 和外部效果仍需独立合同。
- **R6**：Expert version 是候选边界；现有 `agent_profile` 只有 resource IDs、restrictive rules 和 declarative UI slots，没有 profile-owned execution authority 或 custom renderer。

“Durable interface 可冻结、loop/实现暂不冻结”的依据应写为 `engineering/architecture.md` 的 M02/M04/M08/M09/M14 与 AM-B/D/E/F，不能归因 DEC-006。前者规定 loop/session/registry/context/maintenance 的责任与替换轴，后者规定适配、生命周期和非作者维护证据。

## 就近并账顺序

1. **AM-A / M08、M14**：先登记 TeamAI 资源的 scope、source conversion/loss、版本、lifecycle owner 和 capability；不复制 TeamAI schema。
2. **Runtime R2→R3**：继续使用 inspect-only resolver 和现有 effective/bound snapshot；只有出现一个真实 Expert renderer 消费者，才开 R3 compatibility 单。
3. **LG-02 + ATT**：把 `Sources:` 作为可定位入口，把 recall depth/预算/freshness/provenance 编进 disclosure plan；不得把“被检索到”写成 accepted knowledge。
4. **AM-D/F**：用一个合成 native patch 演练 prepare/activate/retire、撤权、回退和 owned-file reconciliation；未有消费者时保持文档，不造安装服务。
5. **EX-01/02 + ATT-RT**：先单 explorer、bounded findings 和人可复核 signal；只有串行成本或 coverage 反例成立才评估多专家并行。

## 首个拟验证反例（合成设计，未运行）

TeamAI Expert v2 被渲染到 OpenCode plugin 或 `CLAUDE.md` 后，registry 删除了 v2，但生成文件或 hook 没有被精确撤销；下一 Run 仍收到旧 rule。此时 registry、effective context 与实际 bound input 分叉，违反 Runtime 的 source/provenance、撤权和 renderer allowlist 边界。该反例应由 AM-D/F 的 stable owned patch manifest、reconcile/remove/doctor 和旧代际回退捕获，不能用“重新安装”掩盖。

另一个必须拒绝的 shortcut 是“以recall计数直接promote或提升治理置信度”：retrieved 不等于 useful，useful 不等于 correct，correct 也不等于 authoritative。上游`recalled_count`可作使用统计；若影响治理则先进入ATT草案的 `record_signal`/LG-03 candidate；正式 Expert/Matter 状态仍走既有 Core commit/decision。

本页不宣称 TeamAI 已在 Courtwork 运行、安装或兼容；外部链接、固定版本和页面核验等级见[上游索引](upstream-index.md)。所有候选继续服从 `engineering/current.md`、既有 Runtime/AM/LG/ATT 合同与 Astra 的架构裁决。
