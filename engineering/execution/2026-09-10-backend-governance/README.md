# Backend Governance · 认领与首片合同

2026-09-10。用户授权「认领后端治理 pr，luna explore」。Astra 认领架构、合同与后续集成；Luna 负责有界源码探索。基线 `main@27d37dad75c07f0bc0aa394c19d208e92c8c9a1f`，隔离分支 `codex/backend-governance-20260910`。共享 main 当时存在他人的 WK-98 evidence 修改，未触碰。

初始认领节点交付源码映射和首片范围冻结，当时产品实现尚未开始、未创建远端 PR；后续施工结果见页末。输入按字节保留于 [input](input.txt)，[manifest](source-manifest.json) 固定 hash。上游约40结果、7来源、Engram热度与功能描述仍属输入主张，本次不冒称完成外网或上游源码验证。[Luna 探索](luna-explore.md)负责当前 Courtwork 实现证据。

## 架构裁定

采用 governed object space 的方向，沿 [Paper 固定版本](../../../PAPER.md)与既有 owner 实施。Matter Schema 是受治理状态；Event 是来源与变化历史；Context/registry/index 是有读权的派生视图。禁止用一个通用 memory JSON 表替代领域 Schema，或把 Event replay 改成全仓唯一事实恢复途径。

Attention 已有同一 Core SQLite 的 state/event/request receipt 原子提交、CAS、严格版本与 typed disclosure，见 [ATT v1](../../../docs/work-core/attention.md)。这些是复用边界。未来 registry 从 owner 投影存在性；不得复制可写 Attention/Matter 状态或让目录授予读取权。

探索固定基线为 Core3/app4、Runtime6；部分早期合同正文的 Runtime4/5 是旧交付时点，本单以 [当前 Attention agent 合同](../../../app/docs/attention-agent.md)为准，不因此修改历史迁移证据。

## 首片 BG-01：跨对象目录与渐进披露合同

消费者是全局 Attention agent：先发现被允许知道存在的工作对象，再按明确项目、对象与版本读取有界证据。首片只覆盖 Attention 与 Matter，Artifact/source 先作为原 owner 的 typed ref；后续有真实独立消费者再扩种类。

拟议目录 envelope 必须区分自己的版本与领域 schema：`registry_version`、`object_ref:{project_id,kind,id}`、`schema_ref`、`schema_version`、`object_revision`、`descriptor`、`state_class`、`updated_at`、`disclosure_handle`、`availability`。这是设计字段，不是现有 wire DTO。领域状态不强行归并成统一生命周期；state_class 缺可靠映射时标 unknown。没有真实更新时间不回填时间。Relations 单独有界读取，不内联隐藏端点。

`disclosure_handle` 只定位政策核对，不是 bearer capability。actor、purpose、project、Session/Run 均由 host 捕获；模型不能自报主体或提升范围。读取链为授权后的 discover → typed inspect → bounded evidence → compile，每次重新核对撤销、到期、对象版本和运行准入。授权存在性不等于授权摘要、来源、关系或事件。过滤、排序、计数、分页游标和错误都不得泄漏隐藏对象。跨 Matter 关系不传递授权。

**实现前必须补齐的实质缺口：Matter disclosure。** 当前 Matter 读取依赖绑定与 project ownership；不能把本机 human 可读或全局 agent 身份推导成所有 Matter 默认可读。先冻结 Matter 的最小 object-specific grant 与唯一持久 owner、撤销语义、schema迁移和读端点；未完成前 Matter runtime provider 默认拒绝。不得以 mock allow-all adapter 交付“跨 Matter 已实现”。

目录优先直接查询已有 owner，按显式项目、kind 与稳定对象身份分页。冻结支持的排序、预算、可见计数和变更中分页语义后才写 DTO。现有 ATT literal grep 继续保留其边界；FTS 是有实际成本证据后可删除重建的索引，vector 后置。Registry 删除重建不损失领域事实；来源已删除则明确 unavailable。

### 产品实施与验收

1. Astra 冻结 Matter 披露、目录 DTO、读者矩阵、真实 owner 与迁移方案；对照现有 ATT 查询和 Matter binding 路径逐项确认。
2. 再实施 owner-backed provider 与 host 接线；不写第二个 registry 状态库，不加入新的 scheduler 或 runtime loop。
3. 合成反例覆盖：跨project同ID、隐藏标题/数量/关系端点、仅registry授权、撤销后旧handle、查询中权限缩小、旧revision、未知schema、缺失producer、删除Session后保留正式对象、删除来源后不伪造完整结果。
4. 正例须经实际 authenticated HTTP/Runtime consumer；记录发现→查看→证据页的原始packets与来源版本。作者定向、全量和smoke之后，由非作者对固定产品SHA独验，才能记录有界接受。

BG-01预留范围：`app/core/`中既有Core owner及必要薄查询模块、对应bridge/client、host的必要接线、正式合同与定向tests。开工时重查最新main，并与正在进行的多agent/Attention工作核对service/store/index写权；此认领不独占这些共享文件。前端仍沿现有单writer队列。

## 其余输入如何接续

| 输入项 | 现状与归属 | 后续 |
|---|---|---|
| atomic state + event | ATT 已实现；Matter有自身candidate/decision事务 | 保持领域事务，不全局event sourcing |
| Relations + provenance | ATT已有有界、受scope校验关系；不是通用图 | BG-01冻结端点可见性；新增relation词表版本化，不把关系当grant |
| Run / attempt | Runtime Run、Core Run、async task各有grain；当前async是单次dispatch、unknown后query-only | 单独BG-02交执行owner，新增attempt前定义lineage/权限/不可变历史；不为统一字段破坏现有禁止盲重发合同 |
| durable waiting | ATT waiting持久；due/trigger并无调度器 | signal默认只记录，不自动转needs_review；任何自动转换另定受信策略与反例 |
| external-effect receipt | 内部action receipt与只读task settlement不等于外发回执 | BG-03接[DS-04](../../research/data-systems-2026-09-09/pr-plan.md)及[human-loop](../../research/attention-human-loop-2026-09-09/README.md)，先loopback验证unknown、核对、权限和payload版本绑定 |
| 资料分类 / FTS | 沿DS-00与LG；派生索引不能持有唯一来源 | 接已有治理清单，不另立存储治理中心 |

外部effect合同须保存intent、批准所绑定payload/目标版本、稳定幂等身份、每次attempt、provider receipt与核对结果。批准需来自实际适用授权，不能由目录或Matter accept代替。无ACK保留unknown，核对后才能依provider能力决定是否重试；本地幂等不能保证远端exactly-once。此次不接真实账户或发送动作。

## 验证与交接

提交前共享main已推进至 `6921dbd18de153020c87e4438eebe5260762fee0`，新增request telemetry/effort及Runtime7，并修改service/store/index。本探索不声称覆盖该增量；实现须在最新主线重新对齐版本与写权。本认领分支保留固定探索基线，不合并或覆盖共享checkout。

初始认领节点只检查文档链接、输入hash与diff；该节点不报告产品测试通过或独立接受，不改变Paper、G1–G5或schema。后续产品实现按BG-01开始，BG-02/03不作为首片目录实现的隐含大重构要求。

认领包实际检查：`node tools/check-doc-links.mjs` 通过（553 documents / 2490 links）；原文bytes/SHA-256核对通过；`git diff --check`通过。Luna报告已由Astra消费，未发现改变上述首片方向的冲突。


## 用户授权施工后的实际交付

用户随后同意施工并继续指定Luna explore。Astra实施产品 `9a8a13a`，整合main `b4e3f71` 的Runtime8/coordination/Usage为组合 `caa448e`。正式wire/权限与迁移以 [BG-01合同](../../../docs/work-core/governance.md)为准；[验证回执](../../../evidence/backend-governance-20260910/README.md)区分作者检查、在途探索与固定SHA非作者反例。

交付范围为同owner目录、Matter披露政策/事件/回执、认证human HTTP和global Attention的三步工具读取。Core4/app5新增政策持久表，Runtime8由main继承而非本单迁移。授权明确current内容语义；policy版本与对象读取hash分离，正文逐页重新检查。撤权使用human-only政策查询与null内容hash，不能因对象来源超预算而被阻止。Registry无第二份状态库，relations不在本次通用reader内；Run/attempt、scheduler、外部effect与人类policy编辑器UI仍后置。
