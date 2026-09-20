# 开发者控制面板 · 来源消费与接续

2026-09-13。用户发送“补全开发者控制面板”链接；完整返回两轮已固定：[可读全文](conversation.md)、[原始返回](conversation.json)、[hash](sha256.txt)。无附件、无更早页。本文消费该参考，不将被引用助手的建议自动升为实现或产品门。

## 基线与裁决

接单时实际持久工作树 `Courtwork main @ 11cfe4a5b5e9012a5d21c369ad2808703f37e5d2`；当前施工独立分支起点 `e9a1c05`。来源的 `main @ 24bd954` 存在于Git但不是本轮实际HEAD；其74结果/7线与70–80%没有完整可复核检索清单或度量，不采为工程事实。未触碰main并行编辑。

采用补齐已有adapter闭环、保持配置/连接/曝光/权限四维、Tool归属有来源父对象、Skill不能抬高Host权限。Plugin继续作为现有kind，CW Host Extension可作本地格式说明；不新增无adapter的extension kind。Hook/Registry具体事件与执行ABI先由独立adapter合同定义，七个外部事件名不直接视为已有支持。

导航四域属于候选信息分组，当前用户已接受Settings容器，本次不凭参考重排为另一套导航。原生SVG沿[语义registry](../../design/product-semantics/registry.json)与生成链：tool.object/plugin.object已经登记为text且无glyph；mcp.server已映射plug。因此下一片应补缺与校正映射，不能宣称八对象都从零缺失，也不创建Settings私有图标族。对象图形与运行状态分开。

## 官方资料核验（2026-09-13）

- [Agent Skills specification](https://agentskills.io/specification)：SKILL.md为必需入口，scripts/references/assets可选，渐进读取。allowed-tools仍为实验字段且各Host支持不同；CW只投影请求工具，不因源文件自称pre-approved而授予执行权。
- [MCP 2026-07-28 basic](https://modelcontextprotocol.io/specification/2026-07-28/basic)：协议端点与Tools/Resources/Prompts分开，能力协商和具体操作由已实现协议版本负责。来源提到server/discover不能直接假定CW的Streamable HTTP适配器已实现该消息；实施前对实际SDK/协商版本核验，不能借模型probe代替MCP测试。
- [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference)支持包组合方向，不能据此推导CW已有第三方安装器或sandbox。OpenAI、OpenCode、VS Code等其余外部主张本片未逐一复核，不声称重做原74条检索。

## 接续到既有工程队列

[Runtime Control Index](../../../docs/runtime-control/INDEX.md)继续拥有资源支持矩阵。[Runtime详情M1](../../design/frontend-audit-2026-09-13/runtime-hierarchy/README.md)只完成已有对象阅读层级；接入闭环独立承接原IA-2 / Runtime开发者队列，按以下验收切片：

1. MCP intake：新增草稿、校验并保存、显式Connect及能力发现、展示身份和catalog；Save和Connect分开。若要实现“先发现再保存”，须单独补无持久化的临时probe合同，现有connect不能冒充dry-run。遵循已有scope/CAS/active-run冻结；独立本地MCP证明新增配置→持久化→bound Run→调用与provenance。OAuth/stdio若不实现须保持明确限制。
2. Skill intake：SKILL.md文本/目录解析与验证、元数据预览、scope、保存/曝光、requested tools；按既有source inspector与bound内容快照证明新Run实际加载。目录安全/资源支持另有明确合同，scripts存在不等于执行。
3. Plugin本地入口：由ExtensionRegistry执行load/unload/reload与generation，清楚说明host-trusted/in-process；包路径获取、manifest验证和启停分别留证，不以UI开关虚构sandbox。
4. Hook / Registry：继续显式adapter-required，先定义owner、事件/解析协议、dry-run语义与失败恢复，再做表单。marketplace/signature/update channel不在当前最小切片。

以上为参考核验和后续工程接续，本次未实现这些adapter或新增Release门。端到端新增Skill/MCP闭环可作为该切片验收证据，正式Release仍沿既有门。下一单先MCP intake；SVG与真实对象接线同时评审。

## Luna 非作者仓库核对

核对固定 `e9a1c057` 的 `git show HEAD:`，不把在途UI改动作为基线。纠正来源的一项关键误读：MCP缺的是Add/configure界面，后端导入持久化已经存在，不重复造保存API。

| 对象 | 已有接线 | 真正缺口 |
|---|---|---|
| MCP | [control contract](../../../app/runtime/control-contract.d.ts)定义mcp_server/put；[control plane](../../../app/runtime/control-plane.mjs)校验JSON、CAS与原子保存；[service](../../../app/server/service.mjs)承接配置变更；[manager](../../../app/runtime/mcp-manager.mjs)的connect握手并枚举tools/resources/prompts | Settings缺导入/配置表单，现有动作仅作用于已存在资源；无独立先发现后保存probe |
| Skill | control plane已有内联SKILL.md验证与put；[source resolver](../../../app/runtime/source-resolver.mjs)可inspect inline | 无导入UI或文件/目录获取；locator仅检查，不读取安装；scripts/assets未解析 |
| Plugin | [固定catalog](../../../app/extensions/catalog.mjs)、[ExtensionRegistry](../../../app/runtime/extension-registry.mjs)与现有Developer生命周期 | 固定主机自带扩展不等于任意本地目录导入；无通用installer/sandbox |
| Hook / Registry | 类型枚举与不可用投影已存在 | ImportedResource不接受；无执行/解析adapter |

首个可交付闭环是表单→既有PUT runtime-control put→显式MCP lifecycle connect→权威catalog→另行曝光/策略→bound Run调用与provenance。若选预保存发现，则先实现临时连接隔离与销毁；不把外部建议的顺序当成现有API事实。`24bd954`为`11cfe4a5`祖先，其间369文件变化，不能等价使用。审阅期间main另有作者推进，独立片不自动继承后续提交；交付前重读tip为`4cf5ed9ebdaf1894ebae039cd69a0227e6991db3`，其并行编辑保留。

## 2026-09-20 · Agent and Runtime settings boundary

The [Astra local-runtime ruling](../architecture-node-2026-09-13/local-agent-runtimes-20260920.md) registers a target Settings → Agents group with Agent profiles (Role/Kit/default Runtime binding) and Runtimes (installed or hosted executor connections). This is future UI, conditional on actual Host binding and lifecycle facts; today's technical Runtime surface remains under Developer. Models continues to own provider/model/effort configuration. CC Switch's explicit application scope and native writeback/restart disclosure are consumed there, without creating another config authority. Developer displays diagnostics for the same objects, not a second editable truth. Reuse implemented model CAS/future-run scope, MCP Save/Connect separation and trusted Plugin inspection as precedents; a Runtime is not automatically a Plugin and a Kit is not merely a Skill. No new panel, installer, credential import or native-config writeback is implemented by this registration.

## 2026-09-20 · Comprehension acceptance for the future management surface

Follow the [existing presentation/ownership contract](../architecture-node-2026-09-13/local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership). Show responsibility, Kit and execution/model choice before technical connection fields; keep permission consequences, errors and effective scope next to the action. Use Pi consistently while preserving underlying IDs and exact native facts in diagnostics. Agent profiles/Runtimes, Models and Developer retain their respective owners; no additional object layer is needed. A short introduction plus task-based review with an experienced agent user should check choosing/configuring an agent, locating runtime/model ownership, understanding future-run scope, resolving unavailable/permission states and finding results. These are future acceptance questions, not executed user tests or additions to active G1–G4 construction.
