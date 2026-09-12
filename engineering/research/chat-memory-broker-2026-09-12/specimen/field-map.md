# Specimen字段与接线差额

这是三场景实验使用的最小字段映射，不是生产API/schema提案。下列责任在绘制前已由[施工单](README.md)限定；字段取舍在可操作页面后按证据收敛。

| 页面事实 / 意图 | 本片fixture字段或方法 | 生产责任 / 接线差额 |
|---|---|---|
| 当前表面与发送条件 | scope.channel、channel.canSend/canChooseModel/canStop/reason | Runtime/provider catalog已有；原生通道支持须逐通道验证，不能因有模型API就声称有网页控制接口 |
| 当前阅读对象 | scope.account/session/scene；messages.id/origin | 普通Session身份沿BE-23；跨Provider Conversation未冻结为同一个对象，不直接照搬fixture枚举 |
| 草稿与编辑 | draft、message.origin、setDraft；authored消息Edit-as-new | 当前composer/不可变输入已存在；retained只复制/明确引用到目标草稿，不编辑原文 |
| 来源精确引用 | ref.id/revision、record.account/representation/range/rangeUnit/coverage/missing | RG-BE-01/02、Intake/exact reader；现Core来源/文件包/治理reader只适用各自对象，不是假定的Chat统一reader |
| 命中与展开 | search(query)、openSource(ref)；每次读取重查grant | RG-BE-04/LG-02 Broker组合reader；中文短词字面匹配为fixture实现，不提前锁定索引产品 |
| 披露可观察性 | record.disclosed | fixture只说返回到本地展示，模型使用unknown；生产需消费真实channel receipt，不从命中数量推断used |
| 工作版本与判断 | judgment.record.id/version/basedOn/latestRevision/status；preview/refresh | Core来源/决定/义务与派生观察；本片没有submit/resolve动作，不能把work-derivations直接称为通用r1/r2历史DTO |
| 瞬时界面与阅读返回 | source/judgment.status、reading.scrollTop/expandedIds、view触发引用 | 沿已有页面访问与overlay生命周期；fixture本地状态不是新的生产导航服务 |
| 晚到与撤权 | scope key、独立请求epoch、adapter返回前重新校验 | 生产由真实request/identity/grant/version合同落实；客户端防晚到不能替代服务端授权 |

## 已有接口可消费范围

Luna在 `ee8d9df` 召回：`createModelPicker({request,onSaved})` 可注入；现 `/provider-models`、`/provider-config`、`/provider-connections` 有实现。Composer主发送路径与app私有Runtime状态绑定，不能直接用于fixture。

`/sessions/:id/work-query?kind=source` 读取冻结Candidate source-set；`file-manifest/file-content` 适用指定文件包；`/governance/query` 按对象版本与授权读取Matter来源/成果；`/work-derivations` 是Work派生观察。上述接口都是既有专门reader，不能把路径拼接当作Chat Memory服务已经成立。

## 下一片最小接线顺序

先以真实owner能够表达的一种保留来源固定exact引用/representation/范围，接获准query/read；源无效或撤权明确失败。之后才接目标通道的披露回执和获准交接草稿。读取、预览、准备草稿与实际启动工作分别验收；原生容器、自动同步及完整数据平台继续独立，不新增Harness首节点前置。

本片只消费已有模块与合成adapter。字段在页面中可操作不意味着生产owner已经接受新DTO；需要生产能力的差额沿原RG/LG/BE合同串行接收。
