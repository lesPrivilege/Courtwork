# Fresh Astra 交接：先跑通通用 Agent 地基，再验证 SE 工作扩展

日期：2026-09-06。本轮收工，下一轮由用户手动调整 Codex 的 agent 功能后开启。本文是最新工程续行入口，不替代 Paper 定本或实际证据。不设置自动化，不在本轮继续功能施工。

## 1. 从哪里继续

持久工作区：`<isolated-checkout>`。`<isolated-checkout>` 只是兼容符号链接。原目录 `<private-source>` 的 engineering 较旧，保持只读，不用旧摘要覆盖本轮事实。

先读本文、[current](../current.md)、[decisions](../decisions.md)、[governance](../governance.md)、根 CONTRIBUTING；随后读 Paper 的 [Canonical（历史路径：`../../papers/src/canonical.md`）](../../PAPER.md) 与 [Practice（历史路径：`../../papers/src/practice.md`）](../../PAPER.md)，重点 Practice §2.1–2.2、§2.7、§3、§5、§7。输入版本见 [pins（历史路径：`fresh-handoff-v5-inputs.json`）](../migration/2026-09-08/evidence-index.md)。再读 [v4结果（历史路径：`execution/framework-v4-result.md`）](../migration/2026-09-08/evidence-index.md)、[接口（历史路径：`execution/framework-contract-v4.md`）](../migration/2026-09-08/evidence-index.md)、[provider源码研究（历史路径：`execution/provider-strategy-v4.md`）](../migration/2026-09-08/evidence-index.md) 与相关 RD。完整26工单保留于 [README](README.md)，按新方向重排受影响项，不能把旧排序当新的例行开工阻塞。

应用可逆源码：`<isolated-checkout>/app`。临时目录可能被清理，优先校验 [源码包（历史路径：`execution/archives/framework-v4-source.tar.gz`）](../migration/2026-09-08/evidence-index.md) 与 [manifest（历史路径：`execution/archives/framework-v4-source.json`）](../migration/2026-09-08/evidence-index.md)，在新的可写目录恢复并验hash；不要依赖仍存活的进程。包排除了 data、凭证和依赖缓存，不是正式安装包。README 包含启动方式，使用独立临时数据目录，禁止以fixture初始化重置已有库。

## 2. 用户最新裁决（DEC-007）

- 先从新地基构建和测试 harness，不 fork Courtwork/DSH 后微调。开源生态和 frontier agent 是能力参考与可观察边界，SE 是治理和工作编排方法；不能为复刻功能而发明另一套模型能力。
- MVP 优先考虑 DSH 类似的适配/热插拔方案及 Pi 极简内核思路；provider 优先 ds（按语境理解为 DeepSeek，精确 route/model/api/endpoint 仍需配置时核实）。这些是方向与优先级，不意味着当前代码已运行 DSH/Pi 或选定具体模型。
- 使用 Web UI 快速迭代。UI Core 接近普通 agent：左侧项目/会话，中间 chat message flow，右侧解耦 preview/browser tab。通用工具进度、消息、ask-user 等保留在对话流程；SE 的专业工作面、额外 extension UI 与非聊天 HITL 放在右侧表面。
- 右侧是可替换浏览器工作面。具体采用独立 tab、内嵌浏览器还是隔离 frame，由能力实查及最小实现对照决定；本条不是绕过鉴权、直接传key或让视图持有提交权限的许可。
- 当前仅调整页面逻辑与通用 agent 信息架构，参考 Codex/Claude 的实际界面；不提前展开大规模视觉探索。Paper 定义的更陌生产品表达留到跑通后的第一轮 Polish，届时用户再开放更多 Design skill。
- 以第一个最小专业场景跑通 runtime、内外部工作链与治理接口。当前文本来源→有Evidence的备忘录可作为该首场景基线，不再让它支配整个通用 chat/harness Core。
- Courtwork 只作按需历史参考。派 Luna 消费时蒸馏成新目录下自足专题，不把原 repo 链接当最终交付，不直接移入其 GUI/架构。技术来源可保留最小版本/hash溯源，但不搬运私人原始材料。旧 Codex/Claude Code施工session也只按明确问题召回。
- 新实现成熟后计划承接 Courtwork 品牌与 Git repo，作为重构；本轮不迁移品牌、remote、历史或发布。届时单独编制可复核迁移方案，不能将这一意图解释为现在覆盖旧repo。

## 3. Paper 对工程解释的约束

Practice §3：Host Adapter 隔离具体宿主命名；Compiled Expert 包含 schema、工具、检索、验证/评测、权限、人类工作面、转换规则、适用边界和发布证据。仅加载prompt或多开Agent不能证明Expert成立。“近似MoE”仅作稀疏选择工作能力的类比，不引入模型级MoE或无依据的复杂router。优先 Preset → approved Expert → 受限 primitive composition；Sparse 不要求每个turn替换全部能力。

薄 Core 是职责清晰、专业机制可封装，不能删去 authority、状态一致性、取消准入和提交接口。UI 位置不决定权限：右侧表面和chat动作必须调用同一可信边界，Candidate不能自行晋升；关闭/重开右侧表面不能丢失Matter正式状态。Context、人类工作面与检索是同一正式状态的不同投影。

Practice §7.2 的完整认证要求三类不同责任结构任务及弱commitment对照；用户当前只选一个首场景。因此下一轮只声称最小切片、有限架构反例或扩展机制成立，不宣称Paper泛化认证完成。可使用第二个无业务效果的测试扩展验证加载隔离，不扩成第二个专业产品场景。若Paper命题被实际反例否定，先登记 Practice Index 的最小命题与证据，再裁决修订或悬置；不默改正文，也不为了实现方便降低验收门槛。

## 4. 已有证据与实际缺口

v4：Node ESM HTTP宿主、私有Python JSONL服务、冻结Core v2 B0 SQLite、原生Web功能壳。Matter/Source/草稿、确定性摘录Run、Evidence/Candidate/Review/Artifact已落。13项测试通过，Astra浏览器主链与两Matter切换检查通过；前端曾漏事件、多传字段、hidden被CSS覆盖，已修复后重验。SIGKILL恢复unknown且不重放、双宿主拒绝已验。作者与独验范围见报告，不能累计为全产品验收。

v4仍是垂直卡片功能壳，尚非普通agent chat地基；没有真实模型生成，没有应用内真正Pi/DSH适配器，没有extension registry/lifecycle或可热插拔右侧工作面。旧v3真实Pi SDK→Core假provider实验可按hash消费，不能直接迁移PASS到v4。

专门并发启动/config竞态与未来/残缺/B1 schema独验仍欠；IME/读屏、失败保稿/迟到响应UI竞态、人的Review/Context、真实模型效果/费用、最终Design及全局消融未验。G1/G2未通过。本轮没有Codex/Claude上游实际GUI取证，不能用自家截图替代。

## 5. 下一轮首批有界工单

先核对用户调整后的工具与agent配置，不假设旧会话能力仍在；Astra掌架构和工单，fresh Luna实现和独立复核，作者不能验收自己代码。共享目录要声明文件所有权，不回退其他作者修改。

| 工单 | 输出及所有权建议 | 准入/验收 |
|---|---|---|
| V5-01 架构映射 | Astra：契约/职责/依赖重排；Luna只读复核Paper映射 | 分清通用Runtime、Host Adapter、SE治理、Expert包和右侧renderer；明确目前哪些v4模块保留/移出 |
| V5-02 能力与UI实查 | Luna研究；Astra或指定非作者通过computer use只读查看Codex/Claude可用界面，按实际版本记录 | 左栏/chat/右栏切换、工具事件、ask-user、preview生命周期；只记录看见的能力，不发送消息/执行未知任务；访问不到则保留unknown |
| V5-03 通用agent链 | Luna runtime作者：provider/runtime adapter及chat事件API | DeepSeek优先的非秘密descriptor；先固定源码及依赖；本地假服务验证流、错误、取消、工具闭包、预算与迟到输出；模型输出不直接写正式状态 |
| V5-04 UI逻辑 | 独立Luna前端作者：web壳、右侧表面接缝 | 左栏+中间chat+右侧预览，沿用中性样式；普通agent无SE扩展时也能使用；切换/关闭右面不改变权威状态；无需新视觉方案 |
| V5-05 首个SE扩展 | Luna扩展作者：首场景manifest、工作流程、renderer；不改通用Core | 加载/撤销/重载、权限冻结、版本与失效、重开恢复；在途Run不能被换版悄悄变权，生命周期先明确边界再施工 |
| V5-06 独验与消融 | 非作者Luna：外部脚本/fixture/报告 | No Core Patch、adapter替换、Plugin Reload、候选隔离、最小权限、同状态不同表示效果一致；修复有界、绑定代码/fixture hash |

工单可在冻结接口后并行；不一次搭完整插件市场、跨域专家router或多租户平台。用未加载/加载首扩展、重载、失效、替换adapter等对照检验必要性。若现有Python/Node分层经消融没有必要或阻碍插件边界，可以提出替换；旧代码可用不是保留它的充分理由，也不为追求单语言重做已验语义。

## 6. 费用、边界与下一次开启

用户将在GUI准备好后测试真实key；当前Agent真实调用预算仍0，不读取已有Pi/DSH/系统凭证。GUI凭证输入/私有保管/脱敏/请求绑定需单独实现并用合成key验收，不能把现在的非秘密provider表单称作已可真实测试。

本轮只写交接及治理记录，不改Paper、不迁仓、不外发、不发布、不改全局Codex配置、不设置自动化。下一轮由用户手动开启；不要在后台按计划自唤醒。

建议下一轮启动语：读取此handoff和最新current，核对Paper输入版本，按DEC-007先定义薄Harness/UI Core与可加载SE扩展边界；用fresh Luna分担实际源码/来源实查和独验，先完成V5-01/02，再冻结接口推进V5-03—06。不要把v4卡片页当最终产品方向或将模拟PASS当真实agent已跑通。
