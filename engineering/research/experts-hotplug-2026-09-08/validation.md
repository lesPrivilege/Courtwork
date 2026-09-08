# NDA / Hot-plug 验证设计

状态：预注册候选，尚未执行。目标是检验 SE 的治理收益和边界；供应商样板、类型通过和演示成功分别不能替代这一结论。工程切片见 [PR plan](pr-plan.md)。

## 场景与对照

首个场景为 Inbound NDA Playbook Review。只消费一份合成 NDA、明确的被代表方与交易事实、固定版本的合成 playbook 和 approved fallback；这些是实验规则，不是生产法律建议。正常路径无自主联网查法。首版使用文本与稳定坐标；DOCX 解析、OCR、tracked changes 的格式保真另设有真实格式需求时的验证。

每次冻结 corpus、规则、来源版本、模型/provider、运行配置、可用工具、预算、人工 gold 与评价程序的 hash。先用开发集修正规则，再锁定未见过的 holdout；发现 holdout 问题后修订规则须保留旧结果、提升版本并补新的 holdout，不能把调参后的同一数据当独立泛化证据。

| 配对 | 保持相同 | 改变 | 能回答什么 |
|---|---|---|---|
| A / B | 文档、playbook、模型、工具、预算与 Reviewer | A 为现有通用 runtime 的 transcript + 最终输出；B 增加 typed candidate、evidence 与独立 Decision | 结构化治理是否改善审阅、恢复与错误归因，及其成本 |
| B / B-context | B 的持久状态和权限边界 | 新 session 的 context 是否包含开放义务、来源版本与当前有效成果 | sufficient state 的收益；遗漏失败不能归咎于存储本身 |
| B / B-policy（仅合成隔离探针） | 同一越权请求 | prompt-only 限制与执行处限制 | 权限边界是否实际阻断绕过；不得拿真实外发作消融 |
| B / B-provider（后续） | Contract、corpus、工具和 verifier | policy 允许的第二 provider/model | 状态兼容与专业输出质量分开测量 |
| B / B-unload | 同一已产出/已裁决 Matter | producer/renderer 在场与缺席 | 无执行插件时历史可读、可审计、可恢复是否成立 |

各对照须交替顺序并记录重复运行离散度。评价者对 variant 标签盲化；记录任务经验与学习效应。没有独立 Reviewer 时只报告工程可用性，不能声称减轻真实律师认知负担。A 不得被故意削弱来源访问或有效规则。

A/B 只能估计组合变化的效果，不能单独归因到持久状态或独立 Review。若组合有收益且确需拆解，可追加“持久 typed state 有/无 × typed review gate 有/无”的 2×2 fixture 消融；若两因素不能独立实现，明确混杂，不为完成矩阵造四套产品路径。正式写入边界的移除仅在隔离合成探针中进行。

## 最小反例集

初始 corpus 候选为 12 个成对变体：完整合规、条款缺失、同义改写、解析不完整、证据重复/歧义、相互冲突规则、未知事实、未知规则、重叠修改、跨条款定义冲突、过期文档版本、材料内恶意指令。开发/holdout 的实际数量在 PR H0 固定；同一模板的小变体不算独立样本量。

工程探针另覆盖：同键同请求重试、同键异内容、过时 Candidate、模型伪造 Reviewer、取消后迟到结果、提交成功但响应丢失、进程重启、session 删除、同进程 A/B scope、active run 中配置变更、UI 缺席、producer 缺席、schema 不兼容。只针对实际引入的边界运行，不复制无消费者的故障矩阵。

B-unload 配对只是历史读取探针。H4 的生命周期证据须另串起：首方资源登记/启用 → scope 绑定 → 产出 → 人的裁决 → run 结束 → 卸载/registration 清理 → 进程重启且 producer 缺席 → fallback → 显式 v2 安装/兼容读取或迁移 → 恢复先前可读状态。不存在的 installer、mid-run swap 或通用 migration 标成不支持，不能用手工 fixture 赋值冒充真实生命周期通过。迁移只有实际版本差异需要时才实现；未执行迁移/回退，就不宣称验证了这两项。

## 通过条件与证伪条件

| 主张 | 可观察指标 / 门 | 不成立时的处置 |
|---|---|---|
| Work state 独立于 transcript | 删除/替换 session 后，从指定 Repository 取得相同生效版本、候选、Decision、义务与 evidence 引用；无需重跑工具 | 修复存储/恢复边界；不能把 transcript 摘要命名成 Matter |
| Proposal 与 commitment 分离 | 模型伪造身份、直接调用接受、陈旧候选、无效 evidence 均不能改变生效指针；提交重试仅一个效果 | 任一失败阻断正式接受能力，保留 proposal-only |
| Evidence 与规则可检查 | 所有具体文本 finding 有可定位的源版本与 span；所有 judgment 引用存在的规则；missing 必须有完整覆盖检查，否则 unresolved | 报告分类错误，禁止用 schema-valid 冒充语义正确 |
| 未知没有被闭合 | 不完整解析/缺事实/缺规则/规则冲突进入可追踪未决；没有私造规则或 fallback | 缩小 Contract，保留失败样本 |
| Review 改变合法对象 | accept/reject/edit 绑定具体 Candidate 版本；edit 形成新候选；原 finding 和历史 Decision 可追溯 | 修复 Work API；前端动作不可绕过服务校验 |
| 卸载不擦除工作 | runtime/tool/context registration 撤销；历史 fallback 仍呈现内容、版本、证据与 Decision；旧 run 不被新版静默接管 | 停留静态 preset，撤回 hot-plug 宣称 |
| scope 与政策有效 | A 激活不向 B 暴露能力；不可用能力不进入新 run，绕过直接调用仍被拒绝 | 修复现有 admission/execution owner；不以额外 prompt 补洞 |
| 治理收益大于成本 | 记录完成审阅所需时间、回看 transcript 次数、漏判、误接受、未决识别、恢复成功率，以及 latency/token/维护代码量 | 若只增加表格或点击而无收益，先删减投影与元数据，再重测；不以外部成熟性抵消失败 |

确定性完整性与权限反例门为零违例；这只表示固定用例通过。模型质量报每个 rule/variant 的分子分母、错误类型及离散度，不设没有数据支撑的总分。人类效果另报 accepted-work-product、实质修改、后来撤回、错误识别与 Reviewer 分歧；在看结果前由 H0 固定可接受差异与样本局限。若研究专业效果，至少两位合格独立 Reviewer 并预定分歧裁决；只有单人操作则如实限定。未经预注册不得宣称优于对照。

## 证据与 Paper 回流

每份回执列实现 SHA、依赖版本、输入 hash、运行命令、结果、未验证范围与复核者。mock/provider-stub、真实 provider、浏览器操作、真实专业 Reviewer 四类独立标注。真实 provider 仍沿用户在 Web UI 配置的路径，不读取个人凭据。

仅有一次 demo 只能支持有界可行性。跨领域/跨宿主/长期维护分别需要第二任务、第二 adapter、真实升级与恢复。先在 CourtWork 保存固定提交证据；确有泛化观察后，才在 SE Practice Index 登记最小命题、反例与正文处置。现阶段不修订 Canonical/Practice，也不升级 PAPER.md 的 9.3 绑定。
