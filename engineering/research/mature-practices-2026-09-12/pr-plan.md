# 前后端PR文稿 · Resource Governance

本页可直接作为后续实现PR正文的起点。**所有RG产品切片当前为planned / not_started**；本轮只交付研究、合同裁决和roadmap，没有创建远端PR。RG编号是本轮消费者别名：实现必须回填LG/DS/BG/Runtime原路线，不能再平行派一份相同改动。

Astra冻结owner、架构、迁移和集成，Luna可按冻结合同实现有界机械部分；实现作者不能独立接受自己代码。开工重读main/current、[Luna固定基线盘点](luna-explore.md)及[RD-007](../RD-007-resource-governance.md)，登记实际文件写权与并行writer。下面路径仅候选，不是预先授权覆盖其他writer。

## RG-BE-01 — 保留上传来源与稳定资源版本

**问题与变化。** 上传/运行文件主要随Session路径或Run内容记录被消费，缺少公用资源的明确身份与读权。接LG-00/01与DS-00，先让一份上传文本拥有稳定Resource ID、不可变revision、保留bytes/manifest与明确scope；metadata-only记录合法，bytes/hash/preview未知不伪造。

**范围。** 扩展LG计划的Intake owner和服务入口；现有 `app/server/service.mjs` 上传/读取链、对应store/新Intake模块、合同与测试。现有addMaterial只写current workspace且不生成消息附件回执；新路径必须给出独立的资源capture/发布回执，不能直接将旧返回值重命名为immutable资源。不能向Run ArtifactHistory开放任意Intake写入口；不能把新Resource叫Core Artifact。首片UTF-8文本与不解析的有界binary原件，OCR/压缩包/任意URL抓取不在范围。

**接口冻结。** 创建/读取/列举需要源actor/scope、request ID、size/MIME、hash或明确unavailable、resource/revision locator、状态和失败码。bytes先安全暂存并校验，发布manifest后才advertise可读；同request同payload返回原结果、异payload冲突；根路径不可由模型提供。物理去重限受支持存储范围，不跨安全域透露命中。

**依赖/验证。** LG-00合成语料、当前Runtime/Core schema审计；上传中断、同名改字节、重复内容不同来源、错误MIME/超限、损坏/丢bytes、非法路径/符号链接、跨Session读取拒绝、分页无隐藏计数泄露。原有Run文件读取和旧接受回执保持。新schema迁移严格校验、字节备份、旧host拒新、独立恢复；无迁移必要不改旧store。

**退出/回退。** manifest不能可靠对应bytes就不发布资源。停用新入口仍可读已保留版本；不删除孤儿bytes来掩盖未完成事务，后由RG-BE-06盘点。

## RG-BE-02 — 消息与附件的稳定引用

**问题与变化。** 同一附件不应永远只能由某条聊天中的当前路径找到。扩展现有Runtime会话/Run/events合同，为新显式消息和附件parts记录稳定引用，并提供当前投影与历史定位，供资源面反查。

**范围。** 原Runtime message/event写者、`app/server/store.mjs`/`service.mjs`、消息projection及定向测试。沿原Chat/消息能力路线，不新建Conversation数据库；不替换Pi journal，不把一般Chat改成Attention，也不在本单解决DWB/BE-23。

**接口冻结。** message ID与产生它的Session/Run/event定位、part ID、resource ID/revision、来源归因、内容版本/编辑关系。旧记录只能按可靠event identity给兼容locator，无证据的附件关联填unavailable；不凭文本重复或文件名猜关系。编辑创建新关系/输入，不重写已执行Run；redaction可见性与实际purge另定。原Run重试键保持，引用内容和权限进入固定输入依据。

**依赖/验证。** RG-BE-01 exact reader；重复发送/断连重试、相同文本不同消息、重复part、编辑后旧Run仍指原版、消息删/Session归档后合法保留版本可解释、损坏引用不退到当前路径、资源撤权不被旧消息绕过。以旧event/journal fixture迁移验证，不运行真实provider。

**退出/回退。** 旧消息无法可靠映射时保留旧读路径及unknown，只为新消息写明确ID。暂停写新parts不能影响历史Run恢复或正式Core数据。

## RG-BE-03 — 可复用保留、资源关系与Core接缝

**问题与变化。** 用户需要把一份Run产物或上传资料用于另一个获准工作范围，同时区分“保存资料”和“接受成果”。从原记录取得exact版本并持久保留，建立目标owner认可的关系；Core source/Candidate/Decision语义保持。

**范围。** LG-01/03、DS-01、BG读取/披露及Runtime artifact reader的纵向组合。ArtifactHistory仍只由受信Run写入；Intake可通过合法exact reader保存来源副本/受控存储引用，是否物理复用由保留合同决定。Matter关系只通过原Core入口写，禁止平行relation表替代Core source membership。首片Matter source沿现有受支持文本合同；opaque binary可先保留在资源面，不能冒充Core文本source。PDF/其他格式须先冻结representation/精确来源映射，接口不支持时显式拒绝关联。

**命令语义。** retain与bind分开；每条命令带request ID、源确切revision/hash、目标ID/expected version及授权。LG保留成功而目标写入失败时呈现unlinked/pending，支持同键对账；source-version→Run/attempt→Candidate→Decision关系只能来自真实记录。界面“加入资料”不调用accept；需要正式成果时沿已有候选/决定动作。

**依赖/验证。** RG-BE-01；消息关系依RG-BE-02，单独Run产物纵切不强依它。覆盖工作目录A变B后仍保留记录A、假hash、源损坏、跨Matter、目标CAS冲突、源/目标撤权、保留后kill/ACK丢失、重复retain/bind、旧接受回执不变、producer删除后既有读权合同。若现有read/query足够只组合，不增API。

**退出/回退。** 当前owner无法表达目标关系时拒绝并补原合同，不用自由tag造归属。停止新retain/bind，保留已生效关系和pending回执；补偿需显式新命令。

## RG-BE-04 — 精确检索、可重建索引与上下文引用

**问题与变化。** 资源复用需要可检索，但索引可能陈旧或越权。消费LG-02/04及DS-02，先metadata/exact/lexical，给出版本/range/generation/coverage与明确stale/partial，后按测量增加parser/OCR。

**范围。** LG派生层、已有查询与Context compiler接缝，保持Core/Runtime真源；不首发向量数据库或自动扫描所有workspace。key至少含源revision/hash、representation、pipeline版本/config、安全域，查询还需当前授权范围与预算。初版无全文可用时可只搜metadata。

**依赖/验证。** RG-BE-01/03可合法读取；独立构建generation校验后原子发布，一次查询固定generation。删除索引全量重建与增量等价；源/处理器变化、撤权、构建中断、负查询coverage、跨范围缓存、OCR partial/多义、原文缺失与无法重建均可判别。索引重建前后注释、Core决定和原始bytes不变；费用/耗时用固定合成规模实测，不采源报告门槛。

**退出/回退。** 没有重复读取收益不加索引，保留exact读取；旧generation仅在仍合法时可用。搜索缺失不宣称资源不存在。

## RG-BE-05 — 版本锚定注释与候选finding

**问题与变化。** 对资料的判断要可复用，源改版后不能悄悄漂移。沿LG-03增加有界annotation记录：首次只支持整资源/确定性纯文本range，语义finding继续走原Candidate与Review接缝。

**范围。** Intake的注释记录与revision reader、LG finding adapter、对应query/合同/测试。Body/Target/Selector为设计参考，不实现整套W3C平台；PDF bbox与OCR anchoring等待真实representation规范。Annotation ID、actor、目标源/revision/representation、selector、body版本和修改回执由实际owner记录。

**依赖/验证。** RG-BE-01版本reader、RG-BE-03权限；文本抽取则依RG-BE-04。Unicode/组合字符/重复quote、坐标越界、representation升级、源删除/撤权、并发编辑、旧annotation仍指旧版、错误revision不重定位、索引清除不丢注释。模型finding保持候选，普通标注不冒充reviewer或接受状态；专家accept必须走Core动作。

**退出/回退。** 不可唯一锚定时只显示whole-resource或unresolved，自动reanchor提新候选。停写新注释保留原历史与合法reader。

## RG-BE-06 — 保留策略与引用盘点（仅dry-run首片）

**问题与变化。** 中间文件持续增长，但盲按TTL或可见引用删除会破坏恢复与旧接受。消费DS-00/03及LG/Runtime原保留责任，形成owner范围明确的reachability/retention报告，首片不删除任何bytes。

**范围。** 只读盘点工具/契约/合成测试；覆盖Runtime活动/未决Run、messages、资源revision、Matter历史source/Artifact、pending跨owner关系、pin/hold及旧journal。查询某用户看不到引用不等于无人引用；每owner必须提供完整且授权的维护视图或标unknown。

**依赖/验证。** RG-BE-01…03有可核对ID与保留义务，DS owner清单闭合。测试共享引用、删一处仍保留、历史接受、pending/unknown、Run取消中、hold、损坏manifest、重启及读取与盘点并发；所有不能证明不可达的对象禁止列为可清理。报告区别缓存可重建/唯一字节/恢复资料/有保留要求，不自动执行政策。

**退出/回退。** 自动GC必须另发实现PR，冻结quarantine/grace/revalidation/恢复与删除竞态，并有独立故障验证。全域证明不成立就保持保守保留，不能为节省空间降低接受证据完整性。

## RG-FE-01 — Session/Matter资源列表与Inspector

**问题与变化。** 用户无需到Finder找刚上传的资料或输出；在现有工作范围内看到资源、来源版本及可读性。首片列表＋按需Inspector，可选metadata-only，预览按capability提供。

**范围。** 原资源/文件卡与Work Inspector renderer，纯projection和本地UI tests；Astra裁语义，前端单writer实施。依赖RG-BE-01真实list/exact reader与既有可读Core/Run投影；跨范围关系详情依RG-BE-03，不用fixture替代接口完成。Library是工作名，不先新建全局导航；render不可写store。

**行为/先例。** 展示owner/kind、版本、原件/派生、retained/missing/partial、实际formal acceptance；不把所有Artifact都画accepted。选择/过滤/打开Inspector为只读；不支持预览就保留metadata与实际可用读取，不画假的Open in Finder。沿[frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md)、现有文件卡/Inspector及[Luna符号](luna-explore.md)；projection/control/disclosure/empty-error grammar受影响。

**验证/退出。** 真实合成后端显示上传、Run版本、Core已接受三类不同身份；空/加载/读失败/缺件/陈旧/长名/无bytes、分页/切scope竞态不串数据。1440/1280/390、明暗、键盘、200%缩放、Escape与焦点；目标局部＋相邻＋完整Session/Matter。缺owner事实不显示相应facet，回退现有文件读面。

## RG-FE-02 — 显式保留与关联动作

**问题与变化。** 用户能将确切版本保留并关联到获准范围，且知道改变的是关系还是正式决定。接RG-BE-03与RG-FE-01；消息来源动作依RG-BE-02，复用原消息/文件动作位置。

**范围/行为。** 单writer新增retention/bind动作投影、目标选择与回执状态；composer选文件、上传准备、收到资源ID、附到消息、发送Run分开，消息提交必须引用服务确认的版本。上传失败/取消/ACK未知不可先画已附加，已上传但未发送按未关联资源保留/对账；操作名称反映后端真实动词，正式accept仍走Review。mutation只来自capability与schema，expected revision与request ID留到对账完成；失败保留原选择，不自动重复新ID，不把取消弹层当取消后端动作。跨ownerpending明确呈现，不提前画成功。拖放后置于同一命令合同且必须有键盘等价。

**验证/退出。** 绑定到两处不搬原件；目标变更/权限失效/ACK丢失/重复点击/服务拒绝/后台完成后旧UI重开；资源bind不等于DWB目录读写。键盘、焦点、滚动与窄屏覆盖；后端无动作就保持只读，不能仅禁用样式代替服务拒绝。

## RG-FE-03 — 检索与版本注释

**问题与变化。** 用户按来源/版本检索并给确切文本做注释，切换版本可看到旧判断及适用性。检索依RG-BE-04；注释依RG-BE-05，二者可分批发布，不能互相冒充已完成。

**范围/行为。** 现有list/Inspector增量，不首发Graph/Lineage大图。命中显示source revision与coverage/partial，点击跳exact reader；注释target固定版，旧版提示与当前版分明。普通注释、模型finding、正式Review使用各自owner/action；缩略图/OCR等待不冒充索引完整。

**验证/退出。** 搜索scope/查询竞态、空与未覆盖、旧generation撤权、unicode定位、重复quote、换版/缺件、注释保存冲突、清缓存后注释保持；键盘选择替代与读屏标签、窄屏、长内容。无法锚定明确unresolved，不高亮任意近似文本；未交付facet不画可操作控件。

## 共用接受要求

后续每PR提供实际base/product SHA、准确路径、source/fixture hash、运行命令/原始日志、失败及未跑项、回退策略。后端用独立synthetic data/端口，相关Run/权限/恢复/Core反例通过后再适度全量；不默认付费provider。前端跑相关行为与interaction lint，涉及颜色/材质再跑对应检查，并交真实服务浏览器证据。作者验证和非作者复核分开，本轮文档链接通过不替代任一实现验收。
