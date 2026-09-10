# RV26-Q02 · 配置校验与失败发布回执

基线 `a579929edd66544e6aa7cd8cd7d2399fae8265d3`；产品固定 `583a1b3c8a0a462400d12b6f540640731abf8dc6`。Astra负责schema/发布顺序/执行门/整合；Luna baseline_explore负责纯字段与迁移夹具，Luna q01_tests负责loopback故障测试；另一个Luna q02_independent负责非作者固定版本复核。[裁决与扩展写权](../../engineering/reviews/2026-09-10/q02/README.md)、[派工清单](../../engineering/reviews/2026-09-10/dispatch.json)与原审查包分开，原包字节不改。

## 实际变更

HTTP与新store/Run写入共享模型240、URL2048、API/contextWindow域；两个凭据入口均拒绝空白/控制字符。无效输入在写盘/SDK前拒绝。历史描述及未变连接保留原样，读兼容不授予执行权；启动隔离非法字段/身份，避免覆盖catalog。

Runtime11只新增现有owner下的最小 `providerConfigurationPending`，无key或目标正文。配置先存、凭据generation先预留、再激活SDK，最后清pending；任一步部分成功保持可inspect且阻止新Run，重启仍隔离。原command receipt可查，同操作重试可恢复。无记录的失败create/delete仍有pending条目；凭据删除可放弃失败set。此处不宣称跨文件事务或断电耐久性。

3–10合法旧状态先严格读取、保存SHA命名原字节备份，再升级；schema10连接与已有Run保留。固定旧host拒11；短字段schema10备份在独立目录由旧host读取。schema10曾写入的240/2048字段由新reader修复可读，旧reader对长字段的旧缺陷不被宣称为已修复。

## 验证

- 作者定向：Q02 13/13、既有Provider 13/13；新迁移4/4；smoke通过，均无真实provider。
- 作者第二轮完整回归：553项中551通过；两项work-summary-consistency旧夹具使用不支持的api，测试字面值修正于 `9380fd5`，定向2/2通过。产品代码仍为583a1b3，不宣称一次完整553/553。
- 非作者固定版本独验：583a1b3的Q02/迁移/既有Provider为30/30，四项独立反例通过；测试字面值修正于9380fd5的独立复验2/2通过。迁移测试临时目录改为os.tmpdir()的可移植性修正52b9330，作者4/4通过，产品未变。
- [机器回执与fixture哈希](receipt.json)；原始日志分列于本目录。四项独立反例保存在[可重跑脚本](../rv26-q02-independent/edge-check.mjs)，默认从脚本位置确定repo root，也可传参数。独立脚本最初的依赖loader失败日志单独保留；修正加载坐标后验证通过，不归因产品。

首轮全量保留于 [未完成日志](author-full-initial-incomplete.log)：旧测试直接写 `provider:{}`，新增写前校验使setup提前抛错并泄漏测试锁helper；另有旧schema断言/合成降级fixture未删除新字段。定位后终止一个自有挂起测试子进程，runner最终exit137且无总计，不计通过、不泛化为产品失败。已适配合法合成描述/降级shape；原冻结fixture与历史证据不改。第二轮采用并发2与90秒测试超时，避免无界等待。

独立初审促成启动密钥失败的SDK清理、凭据变更前连接校验、缺失连接/非法描述的unavailable、空query/fragment拒绝与凭据输入同域。选中连接不能删除的正常并发由同一配置队列控制；不存在“删除检查通过后被另一个配置请求改为selected”的执行缝隙。

## 边界与接续

仅合成dataDir、loopback与固定Git历史源码；未读个人凭据、未迁移个人数据、未调用付费/真实provider、未推送或部署。Core4/app5不变。本单不关闭G1–G5、不代表33单完成，也不证明真实模型质量或全产品接受。下一单Q03仍按串行写权接续RuntimeStore publication/lock，不能以本单的pending语义代替Q03持久化边界验收。
