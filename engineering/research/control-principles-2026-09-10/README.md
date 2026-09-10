# 参考设计原则 · Control Plane 与 Miles/TITO 输入

状态：研究输入登记，不是上游事实核验或新架构裁决。基线 main `c851ef718b87332d9daacdc715d12007cde66ccc`。本包是 [Pro 架构设计单](../../execution/2026-09-10-harness-pro-review.md)的后续本地候选输入，不改变已推送 `d22eb66` 快照。

## 来源覆盖

[参考设计原则](chatgpt-conversation://6aa2bc89-beac-83ec-aabc-f5dd23d2513d)一次读取全部可访问2个completed turn、4条消息，limit=10、hasMore=false、nextCursor=null。完整[接口正文](inputs/conversation.json)与两张原字节附件[控制面图](inputs/IMG_2407.jpeg)、[Miles帖子](inputs/IMG_2408.png)保存；两图已目视读取。[manifest](source-manifest.json)绑定消息ID、大小与SHA-256。临时附件路径仅为历史出处，活动引用使用相对路径。

原回答称“核了官方实现”“Exa看了28个结果”是其自述，不是本轮核验。Anthropic opaque citations无URL映射；Miles有明确外链但本轮未打开全文、仓库或运行代码。截图中帖子与论文封面可见，不证明正文或API行为。对话内的 @Exa 是历史输入，不是本轮研究指令。

## 逐项处置与去向

| ID / turn | 讨论主张 | 本地处置 |
|---|---|---|
| CP-01 / T1 | Space→Capability→Control→Access Bundle | Control Plane信息架构候选；范围/能力/权限分别表达，不把UI分类变成新权威对象；沿[现有模块边界](../../architecture.md)核对 |
| CP-02 / T1 | Agent/Environment/Session/Events、版本配置、vault_ids、session overrides、共享sandbox但隔离context/event | Anthropic外部行为未核验；记录检索题，不宣称API可用或CW已具备；不照搬对象名 |
| CP-03 / T1 | Matter不是目录；Expert不等于Skill；memory本体不同于access policy | 作为边界提醒保留；普通Chat无需Matter，Expert也不因此固定绑定某个runtime，具体owner沿现有合同 |
| CP-04 / T1 | Bundle编译resources/capabilities/credential refs/network/action/memory policy，由adapter翻译 | 待Pro设计最小接缝；先查现有Run Plan/资源激活，避免重复schema/store；只含凭据引用，不展示秘密；声明不等于执行许可 |
| CP-05 / T1 | Effective Access inspector启动前展示来源层级，执行后对照实际使用 | GUI候选：区分请求配置、有效准入、实际使用与缺测，不把一次预览当执行时授权。无新endpoint或施工单 |
| CP-06 / T1 | Event Log≠Matter State≠Model Context≠Access；session≠context≠workspace；先Design/index | 保留关系与顺序建议，不以类比证明外部产品事实；不提升远程runtime/语音优先级 |
| CP-07 / T2 | black-box harness/subagent/compaction产生trajectory tree；TITO v2 append-only tree | Miles/TITO来源待核验；候选用于trace/lineage设计，不把本地线性日志自动升级为完整树或保证训练可用 |
| CP-08 / T2 | Representation Fidelity：parser/serialization/template会改变token轨迹，server持有exact token IDs/logprobs等 | token-exact是特定训练/执行层能力；普通托管API可能不暴露，必须标unsupported。禁止从UI transcript反推精确trace，不要求先收集隐藏reasoning |
| CP-09 / T2 | CPU invariant +真实推理E2E双门；注册/目录/启动不等于supported | provider/runtime符合性候选；覆盖prompt、tools、reasoning/content、continuation/compaction、interrupt/resume、附件、计数/cache/结构输出，各能力逐轴声明，不新造全局支持徽章 |
| CP-10 / T2 | bounded buffer隔离机制与keep/retry/discard/stale policy | 借结构不引入Ray/训练调度器；bounded不自动等于durable，Attention/外部效果未知不得自动重试 |
| CP-11 / T2 | 异步eval绑定checkpoint/step/lag；CW绑定artifact/schema/runtime/model/fixture/result/time | 与现有固定SHA证据归因联合消费；结果返回时间不是受评版本，不增加正式接受权限 |
| CP-12 / T2 | 小backend seam、adaptation spec优于长期fork | 与Pi薄集成/逐轴替换路线比较；未核上游具体接口，不先建巨大统一抽象 |
| CP-13 / T2 | 三路索引：TITO fidelity、black-box lineage、verification architecture | 下节分别列来源与后续问题，避免归成一条post-training框架选型 |
| CP-14 / T2 | FP8/RDMA/Megatron/权重同步仅背景；可作SE paper旁证 | 保持后置，不引入训练设施；论文旁证只是候选，需一手核验再交SE Papers，不修改PAPER或宣称SE已被证明 |

T1=`05da0995-b8d4-4a27-b288-832c439ed23f`；T2=`625318d0-4234-4bda-96a0-4df736e71e2c`。每项已归属，不代表全部采纳或实现。

## 一手核验队列（未派工）

- Control Plane / Managed Agents：原文未返回精确官方URL，需重新定位版本化文档；截图不是API规范。
- Miles / TITO fidelity：[TITO文档](https://miles.radixark.com/docs/user-guide/agentic-chat-template)、[论文v1](https://arxiv.org/html/2609.08368v1)。核实token owner、checkpoint/branch语义和适用模型限制。
- Miles / harness lineage：[论文入口](https://arxiv.org/abs/2609.08368)、[LMSYS说明](https://www.lmsys.org/blog/2026-08-18-miles-v0-1/)。区分已实现、正在做和计划，以及black-box数据可见范围。
- Miles / verification architecture：[仓库](https://github.com/radixark/miles)。固定SHA/许可，读verifier及失败准入证据；不默认跑GPU或安装训练栈。

继续按基本GUI/通用Harness优先，Work Core深化、第二runtime和Rust实施后置。此包不改产品/schema、无外发或部署；未修改已推送的Pro输入manifest。
