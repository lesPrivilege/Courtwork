# 本地资料治理：可分批施工的 PR 草案

状态：planned，尚无新 API/schema/数据迁移实现。输入为 [T01/T03/T05](source-index.md)，归属与失效原则见 [总览](README.md)。顺序 LG-00 → LG-01 → LG-02；LG-03 依赖 LG-01/02 与现有 Core 接缝，LG-04 在全量基线成立后实施。Explore 和 UI 另按 [运行路线](runtime-roadmap.md)推进，不与本轮 FE writer 争用。

每单开工必须记录实际主线 SHA、隔离树、owner 与独立 fixture；凭据、个人资料及运行数据不入 Git。以下字段是待冻结的语义要求，不能当成已可调用的协议。

## LG-00 · 固定一个可复现资料包和边界

问题：没有冻结输入与反例时，无法区分检索改进、缓存命中和资料已经变化。先用少量自造文本/PDF/扫描件组成一个 MatterPack，包含时间线、两版合同、缺附件、同名改字节、重复副本及文档中的恶意指令。

交付：fixture 来源与生成方法、确切 hash、独立人工 gold spans、未知/缺件答案、处理配置、[六层评测](benchmark-plan.md)的预注册比较规则。先限制本地文本与一类 PDF；其余格式显式 unsupported。原目录只读测试、禁止符号链接逃逸/任意目录扩读、大小与文件数限制、归档解压边界一并冻结。原文中的 Finder/Verifier 维护流程只借职责分离，不借机全仓清理或拆分模块。

验证：同一冻结输入可重复装载；所有引用可定位；删除语料副本不影响用户目录。退出：该资料包不能覆盖重复查询需求时停止扩实现，重写问题。Astra 定合同，Luna 可制作/复核 fixture，独立复核者与 gold 作者分别登记。

## LG-01 · 只读 inventory 与带来源的 rendition

问题：每次重做 OCR 或按当前路径读取，会浪费成本并把历史结论绑定到已变文件。

交付语义：一次观察记录作用域、相对路径、来源身份、内容 hash、字节数/MIME、观察时间与读取失败；身份与路径分离。读取中前后变化要检测并重试或标 unstable，不能声称普通目录遍历是原子快照。目录外符号链接默认不跟随；读取权限按输入 scope，不由文档指令扩大。

确切字节接入现有历史保存边界；只有 metadata 时明确 source bytes unavailable，不能承诺删除原件后重放。rendition cache key 至少含 source hash、extractor/OCR 版本与配置摘要；记录失败/partial、语言与页映射。文本 offset 的单位与编码须冻结；PDF page/bbox/rotation 与 OCR 坐标规范必须能回到对应来源版本。保留原文与派生文本两者区别。

验证：同源同配置命中；变字节/变配置失效；更名不重复 OCR，副本观察仍保留；原文件只读 hash 不变；扫描误识别不被 roundtrip 测试伪装成正确；半途失败不发布 complete rendition。退出/回滚：关闭新 reader，历史来源保持可读；只删除本单派生缓存。保留/删除来源的权限与策略不随 cache eviction 改变。

## LG-02 · 可重建视图与预算化 context

问题：重复全量读取和无出处摘要不能支持稳定复核。先用 exact metadata + lexical retrieval + 原文范围读取，测出缺口再考虑语义索引。

交付语义：索引绑定捕获 generation、来源/rendition hash、索引器版本与配置；查询结果给 source version、range、view generation、命中理由与 freshness。一个查询固定 generation；切换索引原子发布，未完成构建不可见。缓存 key 包含 query、scope/授权范围、过滤条件、generation、预算及 compiler 版本，避免跨范围串读。

context manifest 记录 query scope、选入/排除原因、证据范围、确切 token budget/计数器、截断与未解决问题；正文可追溯到原文。字符数不可冒充 token 数；无法使用目标 tokenizer 时单列估算。只读工具给有界续读游标与读取 ledger；不把任意 350 行阈值硬编码为本产品原则，不强制所有大文件交给便宜模型总结。

验证：预算内证据 recall、重复读取成本、越界/失效引用拒绝、撤回来源从新查询排除、缺证据时保留 unknown；冷/热费用分列。检索不到不等于不存在，负面结论报告覆盖与未读部分。回滚：恢复前一索引 generation 或直接 exact read，正式决定不变。

## LG-03 · typed findings 与现有 Review 接缝

问题：时间线/版本关系/缺件推断需要供人复核，不能通过写 sidecar 自行变成已接受事实。

交付语义：一个有界领域 adapter 输出 finding kind、claim、支持/反对 spans、scope/coverage、uncertainty、producer/model/tool/config 版本与所用 source generation。自动 hash/MIME 事实和语义推断分列；supersedes/同一当事人等关系默认为候选。禁止通用 explorer 直接写 Core accepted state。

复用现有 Core 的 candidate → decision、责任主体、CAS/幂等与修订关系；Astra 先确认如何引用来源版本与依赖，不新增平行 Promotion/Memory owner。验证通过只说明某项检查结果，两个 worker 同意不赋予接受权。人类修改、拒绝及后来 reversal 保留依据。

验证：来源已变或撤回后旧 finding 不能静默新鲜接受；重复提交幂等、并发基线冲突可见；unsupported claim 保持候选；删除 session/producer 后仍可读取已保留来源与决定。UI 合同冻结后才排前端展示与动作消费。回滚：停止生成新 finding，已存候选/决定仍按既有历史合同可读。

## LG-04 · delta refresh 与重建等价

问题：全量基线成立后，持续变化资料仍会带来重新索引成本和陈旧结论。

交付：按内容/配置依赖定位受影响 rendition、索引与 finding freshness；更名、变字节、新增、缺失、撤回、处理器升级分别有事件语义。来源缺失不能默认为合法删除历史；原来的接受决定保留并标受影响，是否修订走 owner。增量失败后重启可恢复，重复观察不得重复发布。

验证：同一冻结输入/config 下，增量结果与独立全量重建的派生逻辑视图等价；时间戳等非语义字段单列，不要求随机 OCR 字节一致。人类决定、修订历史和法律身份不由重建推导。对每种 mutation 比较恢复后 query/spans/coverage，量化维护成本。回滚：discard 未发布 generation 并全量重建派生视图；不能删除治理记录来“恢复一致”。

## 施工裁定与退出条件

先提交 LG-00/01 的最小合同与 fixture，LG-02 用便宜、可解释的 exact/lexical 基线。dense/graph、通用 DB adapter、全格式 OCR、跨机器索引和自动 managed workspace 均延后；只有已测失败且现有公共接口无法解决时才扩大自研。依赖采用前按 [生态纪律](../../ecosystem/README.md)固定版本、许可、退出方法；本包的外链不构成安装清单。
