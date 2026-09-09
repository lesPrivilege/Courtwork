# MatterBench：来源、检索与续行评测草案

输入 [T05](source-index.md)。名字仅表示此计划，不是已运行或已发布的 benchmark。原讨论 B0…B5 实际为六层；原表性能数字是示例，未纳入任何 Courtwork 结果。先用自造非敏感 MatterPack，后续语料的权利、适用法律范围与专业审阅者分别核验。

## 六层分开判断

| 层 | 判断对象与方法 | 不能推出的结论 |
|---|---|---|
| B0 来源保真 | hash/版本/span/page 坐标 roundtrip；另用人工 gold 检查 OCR 错漏 | 定位正确不等于转录或法律事实正确 |
| B1 治理安全 | scope、unsupported/unknown、来源失效、candidate/decision 与恢复反例 | 多 agent 同意不等于正式接受 |
| B2 检索与 compiler | 最小充分证据集 recall/precision、预算命中率、出处完整性、缺证据拒答 | 单片段命中不等于案件全量覆盖 |
| B3 执行轨迹 | 重复读、冗余委派、parent context、尾延迟、费用与失败恢复 | 未被最终引用的证据不一律算浪费；反证和排除也有价值 |
| B4 专业成果 | 时间线、版本图、缺件表的事实/出处/遗漏/可用性；独立专家 rubric | 法律 QA 或单个模型评分不等于专业成果可采纳 |
| B5 连续性 | 来源变化、session/executor 替换、producer 缺席后的状态/出处/决定一致性 | 完成一次查询不等于长期自治或 SE 整体成立 |

B5 接入 [既有连续性协议](../se-continuity-2026-09-08/README.md)与其实际实现证据，保持 S/E 实验条件、raw/角色绑定和任务分离；不重复建立正式状态或另一个总分。B0/B1 任一关键权限/出处不变量失败，停止推广并保留失败，不能靠平均质量分抵消。

## 最小比较与逐步扩展

| arm | 方法 | 启动条件 |
|---|---|---|
| A0 | 冷启动原文 frontier/read 基线，有同等工具/预算 | LG-00 起，基线必有 |
| A1 | exact + lexical + bounded read | LG-02 首个候选 |
| A2 | semantic retrieval | A1 有可重复的词义召回缺口再测 |
| A3 | governed index + provenance/freshness/compiler | LG-02/03 达到可比较条件后 |
| A4 | 单 explorer | 人工给定复杂问题有未解决 frontier 时 |
| A5 | 有限 swarm | EX-01 成立且串行瓶颈已测 |
| A6 | index-first + unresolved frontier explorer | A3/A4 各自成立后比较组合收益 |
| A7 | oracle evidence | gold 冻结后诊断模型/生成上限，不与普通 arm 混称产品能力 |

首轮只做 A0/A1 与机械 B0/B1；随后 A3 与 B2。固定输入、问题、授权、模型版本、工具、tokenizer 和预算，2k/4k/8k 作为待试 budget 点而非必须支持的产品限制。模型 arm 使用配对问题与固定采样策略，多次运行给分布/区间；费用不足则缩小题量并标探索性。调参集与独立保留题集分开，gold/oracle 不进入普通 arm 索引；答案泄漏与训练重叠作为限制记录。

LG-00 先冻结可复核 gold、任务覆盖和接受规则，再观察模型结果。来源越权/错误晋升/无法解析已声称有效的引用属于零容忍反例；质量和成本采用对基线的配对差异，由独立 reviewer 根据最小实际收益预设阈值，不能事后选胜出指标。专业 rubric 必须写明重要遗漏、可接受修改量与 reviewer 分歧处理。

## 成本与突变

总成本按 `C(N) = capture + rendition + index build + refresh + sum(query/review/recovery)` 记录，并分别报告冷启动、热查询与 N 次复用的摊销。索引存储、OCR/API、用户审阅时间和维护成本同时保留；省 trajectory tokens 不能掩盖预处理费用。latency 分总等待和可并行部分；token 与 character 分开，记录计数器版本。质量成本曲线允许结论为直接读更合适。

| mutation | 必须观察 |
|---|---|
| duplicate / rename | 字节缓存复用；路径观察与文档身份不合并丢失 |
| same filename, new bytes | 新版本、旧引用仍可解析或明确缺失；不得静默复用 |
| attachment missing / source withdrawn | coverage 与 unknown；新检索不泄漏撤回内容，历史依保留权限处理 |
| supersedes proposal | 候选关系及决定 provenance；不因较新时间自动覆盖 |
| OCR/config change | 受影响视图失效、误识别单独评分 |
| prompt injection / scope escape | 不扩大工具权限、不外发、不写 accepted state |
| stale index / crash during refresh | query generation 一致、partial 不发布、重启可恢复 |

增量和独立全量重建仅比较同一冻结输入/config 的派生逻辑视图，明确非确定性字段。已接受决定、身份和人工修订链不可由“重建等价”抹除。各 mutation 保留前后 manifest、实现 SHA、命令、原始脱敏结果和复核者身份。

## 外部语料只是后续候选

[LegalBench-RAG](https://arxiv.org/abs/2408.10343)适合最小证据片段检索方法对照；[TREC Legal](https://trec-legal.umiacs.umd.edu/)提供法律资料检索与人机审阅方法入口；[ContractScrub](https://arxiv.org/html/2608.20204)提供针对性合同缺陷审查设计。以上为本轮页面抽查支持的方法用途，不是已下载或已获再分发权的语料。CUAD/Enron、ContextBench、Agent Retrieval Bench、BigLaw Bench、CLAUSE、BrowseComp-Plus、DR3-Eval 等按 [X18…30](source-index.md)追溯，除注明抽查外均未验证。

后续采用前固定 dataset revision、split/hash、原始材料权利与许可、敏感信息处理、任务与法域适用性。许可不明确则继续自造 fixture；公开可下载不等于可再分发。完成模型 pilot 后才决定是否扩大法律专业评测，不用本轮文档关闭 G1–G5。
