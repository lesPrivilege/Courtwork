# 请求稳定性、局部替换与维护包草案

本文件消费H01 §5–9及 [选型索引](source-index.md)，对应AM-C/D/F。设计要求尚未实施，不是现有runtime验证报告。

## 最终请求是观测边界

执行配置指纹覆盖实现、依赖、配置、激活generation，用于复现；模型可见前缀指纹只覆盖真正进入请求的稳定输入及有关provider渲染设置。指纹不是provider内部KV cache key，也不直接证明命中。布局/日志等非模型可见变化可以改变实现版本而保持前缀；工具含义/权限已变时不能为保缓存隐藏变化。

观察点放在最后一次provider-specific payload改写之后，覆盖serializer及实际发送的字段/顺序，而非只比较getSystemPrompt。保留确切source bytes；仅规范化定义清晰的派生投影，不能为了golden稳定排序/改写provider要求保持的opaque items。对敏感输入只保存经批准的最小摘要/指纹，synthetic fixture才保存完整请求，不把密钥、原材料或headers无条件落日志。

| 输入变化 | 应有变化与检查 |
|---|---|
| 同输入/no-op配置/UI布局或进度 | 无无关prefix变化；不把时间戳、随机ID或全依赖树塞入稳定输入 |
| 相同工具集的不同发现顺序 | 采用契约定义的稳定命名/排序；重新连接不产生无意漂移 |
| 工具schema/description/权限语义变化 | 产生可解释diff并重新判断兼容；不能仅保旧hash掩盖 |
| 已撤权但旧请求已冻结 | 执行边界即时拒绝；允许旧曝光可见但不可执行，后续请求按政策更新 |
| 延迟结果/后续消息 | 尽量追加，保留原call linkage与opaque provider items；不重写已有历史求整齐 |
| 模型/API/effort/response格式改变 | 按具体能力组合重新编译和评测，不能泛用同一cache字段 |
| 原生deferred工具 | 仅在对应provider/API与adapter语义成立时采用，通用动态增删不自动cache-safe |

AM-C先建立确定性golden与expected diff，再在授权provider/model/API/配置及有效窗口内配对测量。记录输入、cached read、cache write、首输出/总延迟、费用、失败与样本范围；未返回usage标unknown，字符数不是tokens，缺少write量不是零。试验含冷/热对照与对照顺序，注明路由、过期、容量及隐藏provider上下文不可由本地fingerprint控制。只宣称消除了可避免的请求扰动，不保证100%命中。

[OpenAI官方缓存指南](https://developers.openai.com/api/docs/guides/prompt-caching)按模型代际区分显式/隐式边界及查找规则；不能把“共享未标记前缀不总命中”扩大为“完全不会回退到早期消息”。本轮指南与检索到的API参考在精确lookup数量上存在表述差异，因此不把数量写死到合同，实施时以实际适用API/schema和配对证据核对。[Anthropic工具缓存](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching)给出工具、system、messages的影响层级；其deferred工具机制仅在对应协议下成立。

## 维护包最小交付

每个真正跨上游接口的adapter把以下内容附在既有docs/tests/evidence目录，不为每个helper建新体系：

- provenance：上游URL、固定SHA/release、确切文件、license范围、本地patch与为何不能直接复用。
- contract：稳定行为、输入输出、权限、取消/unknown、版本边界与不可降低的不变量。
- compatibility：provider/API/model、宿主/adapter/工具协议版本、运行模式；native/adapted/degraded/unsupported与documented/fixture-tested/live-tested/not-tested分开记录，注明能力损失。
- reproduction：独立CLI、干净checkout、固定synthetic fixture、安装/运行命令、预期失败和退出码；不依赖损坏Harness启动。
- maintenance：定位入口、最小修复、升级/禁用/导出/恢复步骤、旧代际退役与外部副作用范围。
- evidence：输入/实现SHA、环境、原始脱敏日志、作者/非作者、通过/失败/未检、剩余依赖；新成功不覆盖旧失败。

文档中的命令模板在AM-F前不能称可执行维护包已存在。AM-F选一个可控不兼容点，由与修复作者不同的人固定golden/不变量；另一agent仅凭包复现并提交最小修复，由非作者比较断言/权限/依赖diff，确认未“改考卷”。再运行独立CLI和必要恢复检查，量化定位耗时、触及范围与失败复现率；没有成功修复亦可交付可复核的失败报告。

维修agent可以定位和提案，不能自主放宽验收、删证据、扩大权限或整体升级来让测试变绿。所需授权沿用户已授范围判断，不制造每个普通修复的重复批准门。控制激活与高影响迁移由现有owner承担；保留无需坏扩展即可禁用、导出和基础读历史的应急路径。

## 退出与重开

真实上游提供等价能力时，优先删除薄适配补丁；新增Cordis或独立进程要用隔离/替换收益与部署维护成本说明必要性。源版本、schema、provider协议、权限、依赖许可证或恢复失败触发局部重开；不自动更新所有依赖、不建设自修改平台。本包不会创建定时监控或外部消息。
