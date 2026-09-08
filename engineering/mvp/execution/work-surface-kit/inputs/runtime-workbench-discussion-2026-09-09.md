# Runtime Control Plane / Frontier Runtime Compatibility · 讨论转录（用户提供，2026-09-09）

来源：用户在 Chat 中与另一助手的两轮讨论（"Runtime Control Plane Index" 与 "Frontier Runtime Compatibility & Authoring Index"），此处为 Fable 的结构化转录，非逐字；用作 WK-63 与 WO-WK11 的输入，不作为已实现能力的证据。

## 1. Runtime 资源枚举（kind · 本质 · UI 主要控制 · 参考）
tool（expose、allow/ask/deny、schema、test）；mcp_server（install、connect、auth、enable、restart、nested capabilities）；skill（discover、enable、load、scope、compatibility；Agent Skills 标准）；plugin/extension（install、trust、enable、hooks、registrations；危险等级最高）；instruction（source、scope、priority、effective view）；prompt_template（/command、参数、scope）；memory_provider（read/write、scope、retention）；reference（mount、scope、index、load）；agent_profile（model + prompt + permissions + capabilities）；workflow/recipe；hook/interceptor；provider/model；permission_policy；secret/credential（不露明文）；sandbox/execution_env；registry；session_context（enable delta、context budget、compaction）。

## 2. 四态分离
installed/configured → running/connected → exposed to this agent/session → allowed to execute。不用单一 enabled 布尔。（与 RC-2 一致。）

## 3. 作用域链与两种视图
Organization → User → Workspace → Agent → Session → Invocation。UI 永远回答 Source view（值从哪来）与 Effective view（本 session 实际拿到什么）。Goose 语义：改默认影响未来 session；mid-session toggle 只影响当前 session；可临时为某 session 加 extension 不安装为默认。

## 4. Permission 为一级 primitive
PolicyRule { action, resource, effect: allow | ask | deny }；built-in / plugin / MCP / skill script / filesystem / subagent 同进一个 policy engine。effective = host floor ∧ admin ∧ user ∧ expert ∧ session（只能收紧；第三方 bundle 不能自我提升——Gemini CLI 原则）。

## 5. 标准原样消费
MCP 2026-07-28（stateless、server/discover、Streamable HTTP；SSE/Roots/Sampling/Logging deprecated；MCP connection ≠ Agent Session）；Agent Skills（SKILL.md + references/scripts/assets，渐进披露；allowed-tools experimental 不作 authority）；Agent Plugins 1.0（skills/ + mcp.json + plugin.json 为 portable floor，vendor namespace 其余）；AGENTS.md。原则：Never normalize what is already standardized; never pretend host dialects are standardized.

## 6. Instructions / prompt / memory 拆分
instruction（被动持续）、prompt_template（主动调用）、agent.system（随 profile）；Effective Context Inspector 按块列 tokens / source / scope / why active / when admitted / hash。Memory 拆为 session history、compaction、matter/work state、user preferences、workspace memory、retrieved external、top-of-mind；UI 为 Memory Providers 表（Read / Write · scope · state），非单一 toggle。

## 7. Runtime Workbench IA（一级结构）
Overview（current runtime + Active 计数 + Attention）· Agents · Capabilities（Tools / MCP / Skills）· Context（Instructions / Prompts / Memory / References）· Extensions（Plugins / Hooks）· Models（Providers / Models）· Governance（Permissions / Secrets / Sandboxes）· Registries · Diagnostics。交互语言取 Cline / Goose / OpenCode / Pi：compact table / inspector / command palette / raw config；不做 marketplace 彩卡。

## 8. 六个 seam 与次序
R1 Runtime Inspector → R2 Source Resolver（"Add to runtime…" 接受 URL / repo / package / path / manifest / SKILL.md / MCP endpoint …）→ R4 Runtime Proposal + Diff（source、operations、effectiveDiff、permissions delta、contextImpact、trustImpact、persistence session|workspace|user|expert、rollback）→ R5 Transactional apply（session-local；DSH 的 immutable package + current pointer + rollback）→ R3 Compatibility Adapter Registry（Capability Matrix：Native / Semantic / Lossy / Unsupported；No silent degradation）→ R6 Expert Snapshot / Fork（Save runtime… → Save as Expert；overlay 而非编辑 package；Preference / Requirement / Policy 三类字段；Expert = composition generation）。模型侧稳定 primitive：runtime.resolve / inspect / propose / apply。

## 9. 与 SE 的关系
SE 不拥有 runtime extension ontology，拥有对既有生态的治理面：provenance、scope、proposal/commit、permission、effective state、trace、version、Expert 固化。SE standardizes mutations, not extensions。
