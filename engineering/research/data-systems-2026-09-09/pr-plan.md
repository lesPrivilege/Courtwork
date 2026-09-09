# DS 候选 PR：按消费者和证据决定是否施工

状态均为 `candidate / not_started`，DS-04为 `deferred`。这里只准备可审阅的PR内容，没有创建GitHub PR、执行会话或实现新API。Astra拥有设计、Core/service集成和迁移裁定；未来实现作者与非作者验证分别登记。源文件范围是候选写权，开工按实际main重新冻结；不得覆盖其他writer。本轮文档自检不算独立接受。

## DS-00 · 为关键持久对象登记真源、写者与恢复边界

**问题与消费者。** 维护者需要回答删掉某个目录后丢失的是事实、恢复材料还是缓存。当前Core、RuntimeStore、ArtifactHistory具有不同语义；将它们统称memory或canonical会使备份、迁移和后续索引实现越权。

**最小交付。** 在现有架构/契约旁维护一份有界清单，首批仅覆盖Matter/Candidate/Artifact/Decision/source membership、Run/events/questions/config/extension binding、recorded artifact bytes及其读取权、Context/Work projection。每行列对象与版本、唯一写入口、可信调用者、可读scope、备份/保留/删除责任、恢复依据及消费者。未来LG Intake/索引单列planned，不混入现存目录。对照入口和调用者，不读取用户运行目录、凭据或私人资料。

**归属与范围。** 并入AM-A的数据侧；M05–07/14、R0–R1。候选编辑`engineering/architecture.md`的当前入口说明、`docs/work-core/contract.md`与对应runtime文档；优先链接已有合同，不建立运行时registry数据库。当前有界种子见 [baseline](baseline.md)，它不等于完整writer inventory。

**验收。** 选定范围每行均能定位SHA:path、调用者、读取/恢复策略；排查模型工具、受信host、人类actions、迁移脚本及测试专用入口的差异。无法确定的路径标unknown并缩小覆盖，不能报“全仓零未登记writer”。对一个不存在或被删除的blob，说明为什么不能仅凭hash恢复/授权。

**停止与回退。** 若现有合同已能回答，修正陈旧路径并交索引即完成；不按清单行数拆服务。纯文档可撤回，不改变任何持久数据。

## DS-01 · 从接受回执核对确切成果及依据

**问题与消费者。** 另一位维护者或Reviewer仅拿到request ID，应能判定接受的是哪个Candidate、哪些字节、哪个基础版本；不能靠重放完整聊天或模型自报验证。示例：A已经接受，工作目录后来变成B，回执仍解析A；重新使用旧请求内容返回原结果，换内容必须冲突。

**最小交付。** 先用现有`queryWork(kind=request)`、surface、source history和Artifact reader组成离线核对脚本/fixture，输出有界、只读的receipt manifest：原始ID与版本、Candidate hash、Artifact digest、actor/scope、来源成员及引用、接受回执、当前basis和缺失项。字段从owner记录派生；没有的数据记unavailable，不能回填签名、决定时间或独立验证人。BE-14决定时间仍由原单处理。只有现有查询无法供该消费者核对时，才提出最小后端查询增量，先冻结读权、分页及字节限额。

**依赖与边界。** DS-00＋现有Core合同；文件清单、可信PASS及fixed-basis均并入ES-01，不能在本单先实现另一包格式/verification store。首版现有memo/NDA与未来file profile分别列支持情况。receipt只是核对材料，不是新授权token；导出离开本机后若需要抗篡改真实性，另定信任根，不能称普通hash为签名。

**候选写权。** Core owner负责`app/core/*`与`app/server/service.mjs`的必要查询；通常只需在`app/scripts/`加核对工具、`app/tests/`补缺失消费者反例，并更新正式合同。不改前端。本机工具也不得绕过Matter/binding归属读取任意Core数据库。

**验收先复用。** `work-core.test.mjs`与`work-http-recovery.test.mjs`已有CAS、同键重试、SIGKILL和归属测试。增量必须覆盖：

1. 合法提案→接受→新Session读取的正例；撤去模型transcript仍可解释接受，不要求删除尚有价值的运行证据。
2. 请求A套Candidate B、同ID改payload、跨Matter引用、来源变化、旧generation均按各自边界拒绝；拒绝后没有新Artifact/Decision或外发。
3. UI隐藏按钮之外，直接HTTP也不能绕过；预先允许工具调用不等于允许接受成果。当前本机可信进程假设写明，不冒充OS沙箱。
4. 回执前断连/进程终止，用原请求对账，零或一次接受；不能生成新ID盲重试。缺失/损坏字节标unavailable/integrity failure，不用当前workspace替代。
5. 合法与非法输入配对，记录无理由阻断；文件complete/unknown按ES-00既有定义验证，不能放宽验证只为使正例通过。

**退出与回退。** 若已有读取足够，交脚本与证据即可，不增API。停用新读取不影响历史决定；修复核对器不得改旧hash或历史记录。独立验证者从固定fixture核对，作者输出不自称独立接受。专业正确性单独验。

## DS-02 · 派生视图删除重建与增量失效

**问题与消费者。** 第一个LG检索消费者在索引损坏或处理器升级后仍须检索合法来源；增量更新不能悄悄保留旧版本。此项作为LG-02/04的验收补充，不单独造索引服务。

**依赖与最小实现。** LG-01已有保留字节和manifest；LG-02已有exact/lexical消费者。先固定generation、来源/rendition版本、transform/config、scope、预算及逻辑输出的比较规则。生成到临时generation，校验完成后原子发布；一个查询固定同一generation。以现有source snapshot为起点全量构建；只有实测更新传播会丢失且轮询版本不足时，才在原owner事务内考虑outbox。B0当前状态不能直接假定是可重放的完整事件源。

**验收。** 自造两版文本、同名改字节、撤回、重复观察、变处理配置、构建中断、权限缩小；隔离目录中删除派生索引后重建，比较合法source coverage、spans、缺失项和逻辑查询结果。OCR若非确定性，单列允许差异与gold，不伪称全部字节一致。增量与独立全量基线等价；旧generation即使仍在磁盘也不能绕过新读权。正式Decision/Artifact前后不变。

**选择性失效。** 首阶段保持source-set revision的保守失效。待LG-04/ES-03确有重算成本，再记录显式依赖边；集合成员与负面查询也算依赖，unknown闭包不能推断“不受影响”。失效只改变当前适用性，不能自动撤销历史接受。将过度失效率、漏失效率和合法接受阻断分别测量，不能只优化速度。

**范围、回退与停点。** 归LG owner，M07/09，UI只消费freshness/unknown。独立数据目录测rebuild耗时、空间、可用退路，不沿用报告99.9%或30分钟门槛。失败丢弃未发布generation，回到仍合法的旧视图或exact read；来源已被合法清除时明确不可重建。若查询无重复成本，保留直接读取、取消索引建设。

## DS-03 · 分轴验证历史兼容与实现替换

**问题与消费者。** 下一次升级者需要知道可读什么、可写什么、回退到哪里。换provider能输出文本，不足以证明Run恢复、工具事件、历史读取和接受语义等价。

**最小交付。** 并入AM-F及ES迁移。矩阵分别记录Runtime schema、Core user/application schema、Work/domain/action/context版本、provider API、adapter实现。每格是supported read/write、read-only、explicit refusal或not-tested，并绑定两个固定代码版本和fixture。不得要求所有N/N-1组合都支持；对于已声明支持的组合，正反例全部满足才通过。

**实验顺序。** 先在独立备份副本读旧记录/运行现有迁移，核对Candidate hash、来源成员、Artifact和Decision语义；再仅换一个合成provider adapter，保持Core schema与合同不变跑提案→决定→新Session读取；最后按实际需要单独换runtime/renderer。mock仅证明协议路径；真实provider质量、取消与流事件需要其自身有界验证，不复用mock结论。

**反例。** 未知动作版本不可执行；未知权限/完成字段不得静默丢失；受支持读模型的非语义展示字段可按明确策略兼容。旧bridge拒绝新schema，迁移中断恢复，升级失败保留可用备份；旧reader不可打开升级的共享数据目录。producer缺席仍能读历史，但不据此声称任意插件升级兼容。更换实现若确需领域schema变化，分析是领域需求还是adapter泄漏，收窄替换主张。

**候选写权与回退。** AM-F维护工具/fixtures；ES负责自身Core迁移；本单不另改同一迁移脚本。数据备份、代码回退、配置回退、外部补偿分别出回执。先定义观察者的合法读取方式，不能以裸数据库读取代替应用兼容。未知结果保留，修复不得改验收标准；无第二消费者就不抽通用SDK。

## DS-04 · 首个外部效果的意图与对账（deferred）

**触发。** 产品出现一个明确的受权发送、发布或外部system-of-record提交需求，且需要在断连后回答是否已生效。当前只读AM-B和本轮资料研究都不满足该条件。

**设计先行。** 选一个外部owner、目标版本、动作内容hash、身份/授权依据、幂等键、effect reference及查询/对账方法；在现有host执行owner保存最小intent。外部业务owner决定实际效力，Core接受只代表本地工作结果，不能复制一份外部approved truth。外部幂等/查询能力不明时显式unknown，不承诺exactly-once。授权记录不因重试延长有效期。

**有界验证。** 先loopback模拟：dispatch前死亡、远端成功本地ACK前死亡、重复回调、取消竞争、撤权、目标变更、结果查不到。能查则核对同一目标/幂等键；不能查则保持unknown并给出后续核对路径。补偿是新的受权动作，不等于回滚数据库。真实写操作须另有相应授权，本计划不授权外发。

**采用与停点。** 确有跨进程持久等待时再比较成熟workflow方案；有独立派生消费者才考虑outbox。实现位置沿M03–06与AM恢复协议，不增加总控平台。无法观察外部结果就缩小自动化范围；停止新dispatch保留已有intent和回执，不能删除unknown来结单。

## 共同交付格式与顺序

每单记录问题/消费者、实际base与产品SHA、修改路径、固定输入、正反例、历史测试复用、结果/未检项、回退及独立复核人。实施后运行与变更相关的Core/service/迁移测试，涉及运行链再跑app全量与smoke；UI若后续新增则先冻结后端fixture再排现有单writer。数据、端口和真实/合成证据分开。

建议依赖为DS-00→DS-01；LG具备消费者后消费DS-02，AM/ES升级时消费DS-03，真实外部效果需求触发DS-04。它们不是必须全部实施的承诺，也不把报告六周计划变成日程。最终价值用“能否独立解释一个成果、恢复一次失败、替换一个组件且成本可接受”判断；不用五项总分掩盖权限绕过或无法解释的状态。
