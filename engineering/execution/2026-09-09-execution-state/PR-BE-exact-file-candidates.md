# ES-BE-01 · 将确切文件候选绑定到现有验证与接受事务

状态：PR 准备稿，未实施。共同基线、责任和不变量见 [准备包](README.md)。下列“应/必须”是实现要求，不描述当前能力。

## 可用 PR 描述

当用户检查候选文件后，工作目录继续变化时，仅保存路径不能保证最终接受的是检查过的内容。本 PR 为现有 Candidate 增加不可变文件包与可核对的验证依据，使 Review、验证和 decide 指向同一份内容；接受仍由现有 Core 事务产生 Artifact/Decision，重启后可按原候选读取。首版处理有界 UTF-8 普通文件，不自动写回用户目录。

验证应覆盖内容替换、依据过期、伪造回执、接受竞争、ACK 丢失与内容损坏；作者执行结果和未检项在实现交付时填写，本准备稿不声称通过。

## 1. 所有权与代码接缝

| 接缝 | 实施责任 |
| --- | --- |
| `app/runtime/workspace-tools.mjs` | 沿既有受限工具采集实际输入/输出身份；保留路径、权限、大小及 abort 约束 |
| `app/server/service.mjs` | 绑定真实 Run/Session/Matter，协调捕获与取消；只让受信调用进入 Core；保留 unknown 恢复语义 |
| `app/core/core.py`、`bridge.py`、`client.mjs` | 不可变文件包归属、验证回执、接受事务、历史查询、迁移与完整性检查 |
| `app/core/owner.mjs` 与实际领域 adapter | 版本化只读投影、适用性和合法动作；领域规则仍由原 adapter 解释 |
| `docs/work-core/contract.md`、`app/tests/` | 更新实际协议与有界反例；交付 FE fixtures |

不得重写 Pi loop、另建 authority/Review 数据库、让模型获得 decide，或改变普通 Chat 自动创建 Matter 的规则。代码文件清单是建议接缝，开工需按最新源码复核。作者不声称独立接受自己的实现。

## 2. 首版范围与捕获一致性

采用普通目录作为执行面；首版只捕获服务控制的有界 UTF-8 普通文件集合，包括路径、字节数与摘要。禁止把凭据、Core 数据库、runtime journal 或任意宿主目录纳入文件包。拒绝链接、特殊文件、非法路径、无效编码以及超限输入；不静默遗漏，不以截断预览当完整候选。文件名、路径规范化、排序、摘要算法与 canonical encoding 必须版本化，不能依靠模糊字符串拼接计算身份。

实现前固定 `maxFiles/maxFileBytes/maxBundleBytes/maxDiffBytes` 和超限错误。实际限额应依据现有工具限制与有界测试确定，不能把单文件上限误当总内存预算。首版不宣称任意 POSIX 目录快照能力。

捕获时暂停同一受控文件集合的写入并等待在途写完成，或直接使用受信工具持有的不可变字节建立包；对外部可写目录，单纯前后 stat/hash 不能证明多文件一致性，应拒绝该模式。复制到私有不可变存储后，验证器读取复制结果，不能再次打开原可变路径。capture/validate 与接受前检查的锁域、失败清理和取消点必须在交付中写明。

文件包引用至少识别 schema、包 ID/摘要、文件清单和内容；不能将裸路径解释为可自由解引用的来源。包所属 Matter、创建 Run、candidate 关系由服务验证。两个相同内容的候选可以共享字节，但决定身份与来源不得被内容去重合并。

## 3. 依据与验证记录

首版沿既有 Candidate 的 base/source/contract 版本扩展。每个 verification record 必须绑定：

| 信息 | 作用 |
| --- | --- |
| Candidate ID + 覆盖完整候选的 digest | 覆盖文件包、领域内容和相关语义字段；不能仅核对单个文件 |
| 文件包 ID/digest | 固定验证实际读取的字节 |
| 输入依据 fingerprint | 包含声明的来源版本、材料/工具输入与适用规则，不等同 filesystem root |
| 依赖覆盖范围 `complete/partial/unknown` | complete 仅相对于明确声明的闭合输入集合；不声称追踪全部进程读取 |
| verifier ID/version + policy digest | 可信代码/配置指定所需检查，结果不能由模型声明替代 |
| 结果、证据引用、运行来源 | `passed/failed/unknown` 等实际冻结枚举；与正式决定回执不同 |

受限工具至少考虑 `read` 的字节身份、`list/grep` 的查询范围、目录成员变化和“不存在”结果；仅记录命中的文件会漏掉新文件或缺失依赖。首版允许保守使用整个受控输入集合的 fingerprint，基底变化即要求重新生成/检查，暂不实现精细增量依赖分析。声明范围外的工具输入不能自动获得 complete。

新的文件候选能力要求声明范围完整且所有必需检查通过；partial/unknown 保留可读候选和原因，禁止接受，不能把缺依赖视为无依赖。此要求只适用于新能力，不追溯改变旧 memo/NDA 候选语义。若输入变化，创建新候选绑定新依据；不能修改旧候选或把新回执贴到旧身份。验证策略变化即使文件未改，也要按当前策略重新检查。

## 4. 接受算法与持久化

1. 服务核对 Session/Matter 绑定、producer generation、无 active Run 与可信 actor。模型与客户端不能指定受信验证身份。
2. 根据现有 request ID 和完整请求内容处理幂等；同键异内容拒绝。
3. 读取不可变 Candidate 和所引用的完整文件包，校验内容、归属与全部必需验证记录。
4. 在正式接受事务内重查 Matter/base/source/contract、策略与受控依赖 fingerprint。若采用事务外验证，事务内必须比较验证所用身份与版本。输入写者必须参与同一锁/版本协议；无法纳入协议的输入不支持该首版接受路径。
5. 通过现有领域完成度、证据与义务规则后，原子创建 Artifact、更新正式版本、写 Decision/audit/幂等回执；Artifact 保留候选文件包的确切引用。
6. 返回同一事务的决定结果。ACK 丢失通过现有 request 查询恢复，不重跑工具、验证器或外部效果来猜测结果。

持久化首选复用现有 Core SQLite，为有界包保存 immutable bytes/manifest 和关系；候选保存时即写入，接受事务引用它。复用现有事务/备份配置，并为新增表制定迁移、旧版本拒绝与独立数据恢复演练。不新设另一条 HEAD 或第二个 accepted ledger。

若实施发现大小要求必须使用外部 blob store，应先交代耐久写入顺序、引用 publication、孤儿回收与备份恢复协议，再调整本单；不能仅存 hash 后声称成果可恢复。私有缓存/目录重建失败不改变历史 Decision；正式字节缺失或 digest 不符必须报告完整性错误，不能回退读当前同名文件。

验证通过后版本竞争返回可识别的“依据变化/需重新检查”，首版不自动三方合并、不自动重放有副作用工具。工具取消与 discard 不能删除已持久接受的内容。候选拒绝沿现有 decide 语义保留历史，不等于物理删除文件包。

## 5. FE 交付契约（逻辑形状，待实施冻结）

沿现有 Work surface/versioned envelope 扩展，不新增独立全局状态面。BE 交付要在正式 contract 中明确：

- 能力及 schema/contract 版本；旧消费者对未知新能力只读，不能误用旧 accept 描述。
- `candidateId`、`stateVersion`、候选/文件包摘要、冻结依据与当前适用性原因。
- 文件清单及有界 diff：明确 Base 与 Candidate 身份；删除/新增/修改、无变化、无法展示和截断分别表达。缺历史基底时不可拿当前路径补作 Base。
- verification：检查结果、覆盖范围、过期原因与证据。状态不压成一个绿色“成功”。
- 决定：仍沿现有 Candidate/Artifact/Decision；`humanActions` 只暴露本时刻实际合法动作，无模型 PASS 授权。
- 按 Matter + Candidate/Artifact 归属读取 immutable bytes 的版本化查询，分页/截断元数据与错误；producer 缺席时仍可安全读历史。延迟响应携带身份以便 FE 丢弃串候选响应。
- 当前路径文件视图和候选快照视图区分；首版不提供写回/restore/discard mutation。

实际 API 路径、错误 code 与版本 bump 由本 PR 交付冻结，不把这些建议名直接当已存在接口。每种错误需给稳定机器码、可显示原因及允许的下一动作。

## 6. 验收反例与 FE fixtures

| 用例 | 必须观察到的结果 |
| --- | --- |
| BE-T01 捕获 A 后原目录变成 B | 预览、验证、接受、重启读取仍为 A；若要 B，需新候选 |
| BE-T02 验证 A 的回执用于候选 B；或模型伪造 PASS | 拒绝，正式版本与 Decision 数不变 |
| BE-T03 写集合不相交但来源、目录成员/缺失依赖或策略变更 | 依据失效，不接受；旧内容仍可读 |
| BE-T04 依赖 partial/unknown、验证 failed/unknown | 可诊断，无合法 accept；直接调用服务也拒绝 |
| BE-T05 验证后两个决定竞争同一 base | 至多一个成功；另一个版本冲突，无覆盖或丢失 |
| BE-T06 同键重试/异内容；真实 SIGKILL 在 commit 前后及 ACK 前 | 原子提交或未提交；同键只产生一个决定、Artifact 与正式版本推进 |
| BE-T07 包写入后接受前中断、原目录丢失、正式字节损坏 | 未接受仍未接受；完整包可独立读取；损坏明确失败，不冒读当前文件 |
| BE-T08 跨 Matter ID、路径逃逸、链接、超限及 active Run | 拒绝且无正式副作用；隔离数据测试，无个人目录 |
| BE-T09 Session 删除/新 Session 绑定/producer 缺席 | 正式内容与决定可读取；缺席时无 mutation |
| BE-T10 旧数据迁移、失败回滚和旧 host 拒绝新 schema | 独立备份可恢复；历史记录不伪造 snapshot/verification |
| BE-T11 capture/validate 期间 Stop；未记录文件恢复通知 | 不隐式接受，不制造历史工具记录；unknown 原样可追溯 |

交付固定 fixture：pending-unchecked、ready、failed、unknown-dependencies、stale-input、accepted、rejected、missing-bytes、producer-absent、unsupported-version；含真实字段与预期合法动作。fixture 是合成契约证据，不冒充专业正确性。实现使用 README 的实际检查命令与隔离数据，补定向 Core/service/crash 用例；只在运行后填结果。非作者复核上述关键边界后再给 FE 稳定消费 SHA。
