# RV26-Q02 · 配置校验与持久化

用户于2026-09-10同意接续Q02并要求掌握异步节奏。本单从实际main `a579929edd66544e6aa7cd8cd7d2399fae8265d3` 隔离；共享UI分支与未提交证据不修改。相对Q01合流后只有Skin/Review前端与文档变更，没有Provider/store接缝变化。原单映射PV连接注册、BE-21、M01；[原工单](../courtwork-implementation-plan-20260910/work-orders/RV26-Q02.md)。

## Astra冻结的边界

保留模型ID240、URL2048的入站可用域。共享纯字段校验用于连接输入、config与新Run descriptor；reader保留历史宽域而不规范化改写，启动隔离不满足现行域的连接，新Run重新校验所选描述。未变的历史连接可保留，修改记录必须满足现行域。配置setter在写盘前验证完整目标，无效输入拒绝而不是写入后启动失败。

多文件更新不宣称原子。持久化最小pending标记沿现有RuntimeStore owner，**Runtime11**：新增 `providerConfigurationPending` 数组，每项只有 `connectionId` 与 `operation`（connection_save / connection_delete / credential_set / credential_delete），无凭据、目标正文或通用事务动作。Core4/app5保持。Astra亲写严格10→11原字节备份升级，旧host拒11；不得用旧host绕过pending。原schema3–9升级路径及历史证据保持。

操作先验证和probe，再持久pending，写配置及凭据，注册SDK，最后清pending。任何发布失败返回503 `configuration_incomplete`，携connectionId与configurationStatus；marker成功持久化后的失败为recovery_required，marker写入前失败保持原状态；Host新Run先查pending，原command receipt查询不受影响。启动按pending阻止注册/密钥载入，GET可inspect；接受同操作完整重试，未选中的兼容连接可用delete放弃；credential_delete也可放弃credential_set。credentialGeneration在凭据写入前预留，允许失败留空号，不让新凭据冒用旧代。模型注册放在配置持久化之后，失败清理注册并保留不可执行状态。

写权：Luna有界实现零依赖字段helper、provider-connections及store验证段；完成后把store交回Astra，由Astra串行写schema/marker。Astra独占service发布与执行门、credential-file错误传播、契约、证据与合流。另一个Luna只写新roundtrip/failure fixture。`credential-file.mjs`的unlink错误传播与失败tmp清理是Q02必要扩展，不读取任何个人凭据。

没有通用发布平台、UI施工、真实provider、个人数据迁移或部署。待定向验证和非作者复核完成后记录实际交付；此文件的版本预留不等于已升级或接受。

非作者初审促成三处收口：历史非法连接先拒凭据变更，不产生妨碍connection_save的pending；启动密钥载入失败尝试清理SDK注册和key，Host继续隔离；缺失连接/非法所选描述的GET状态为unavailable。删除中变成selected的正常并发路径由同队列与事前selected检查排除；手工历史不一致不视为正常发布结果。固定SHA独验待记录。
