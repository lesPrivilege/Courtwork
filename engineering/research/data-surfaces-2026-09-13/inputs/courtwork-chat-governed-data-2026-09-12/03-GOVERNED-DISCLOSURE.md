# 03 · Agent 可 grep 的渐进披露合同

**采用声明：Agent 能在当前获准的资料集合中进行有界词法检索，并按精确版本逐段展开；每次返回都有出处、范围、覆盖与可用性说明。**

这是待实现与验收的产品承诺，不是“当前全库已治理完毕”的事实。没有搜索命中不等于原始数据不存在；片段有记录不等于模型真正使用了它。

## 1. 最小读取层级

| 层级 | 返回什么 | 不返回什么 |
|---|---|---|
| 目录/manifest | 本次获准对象的身份、类型、可得性、必要状态 | 隐藏集合名称、全库计数、别的账号元数据 |
| search / grep | 在获准语料上的命中、sourceRevision、representation、锚点、局部 coverage | 未经授权正文片段；先搜全库再删掉若干结果的泄漏 |
| exact read | 特定版本和表示的指定范围、next cursor、字节/字符说明 | 悄悄换成最新版本或越界相邻材料 |
| inspect / 展开 | 该来源可披露的 provenance、历史关系与更大范围 | 自动跨权限爬完整关系图或无界全文 |

第一步已有成本预算；初始 manifest 也不能一次倾倒全库。文档内搜索范围和目录范围都由实际授权界定，不凭模型提出一个 Matter ID 就授予访问。

## 2. 拟议调用形状

下列是合同示意，不是已存在的 endpoint 或 SDK：

```text
search(query, selectedScopeRef?, cursor?, limit)
    -> hits[{sourceRef, revision, representationRef, anchor, snippet}], coverage
read(sourceRef, revision, representationRef, range, cursor?)
    -> content, exactAnchor, coverage, nextCursor?, deliveryRecordRef
inspect(sourceRef, revision)
    -> authorizedMetadata, availability, originCoverage
```

可信 principal、account/connector identity、目的 Provider、当前 grant 和允许用途由 Host/认证通道注入，不由模型提供。`selectedScopeRef` 只是缩小请求，不能扩大实际 grant。无法证明原生 conversationId 时，回执只归属已验证连接/请求或用户选定工作集合，不伪造 turn 级精确来源。

每次 query/read 均重新检查撤权；cursor 绑定安全域、查询、index generation 和 grant 状态。过期或跨 scope 使用明确拒绝/重新查询。返回的报错粒度也不得泄露未授权对象是否存在。

## 3. grep 的实现选型

**首选实现：** Host 的 bounded reader 在获准对象集合中进行 literal/受限 regex 搜索；小语料可以直接扫描规范化文本。对模型而言是 `grep` 语义，但没有 shell 或任意路径参数。

**性能优化候选：** 在相同语义下使用固定版本的词法引擎或 SQLite FTS5。若内部调用 ripgrep，使用明确参数数组、固定允许选项、受限查询长度和输出预算；不要允许模型提交完整命令。任何 index 都必须能从当前来源重建，不成为新真源。

**文件投影视图：** 以后某个 coding/本地 runtime 确需直接读目录时，可生成只包含已授权内容的只读 manifest/text view；它是向该执行环境披露后的快照，不是撤权后可追回的权限系统。此模式不进入纯 Chat 首片，主数据目录不得直接挂给任意 Agent。

SQLite FTS5 的 external-content 索引需要显式一致性维护；已有数据不会因为增加触发器而自动被回填。trigram MATCH 对不足三个 Unicode 字符的子串没有命中，像“撤回”“期限”这类查询必须提供有界 fallback 或明确限制，不能返回错误的“没有资料”。[D02](SOURCES.md#d02)

默认 literal 优先，regex 单独限长/限资源。全文 token 匹配、子串 grep、语义检索是不同能力；不用同一个 search 标签掩盖差别。embedding 仅在词法评测暴露具体漏检后作为另一候选通道，不是这一宣言的前置。

## 4. 授权先于片段、排序、计数和缓存

逻辑上先确定可披露语料，再检索/排序并形成片段。SQL/索引实现可以优化，但不得让隐藏文档影响公开计数、可见建议、游标或缓存命中表现而泄露其信息。初版至少测试这些直接可观测通道；不据功能测试宣称消除了全部时间侧信道。

结果缓存按授权与来源版本隔离，撤权后不能继续命中旧缓存。read 必须重新检验源与目标；来源合法入本地，不等于可交给任意云 Provider。用途/敏感分类和当前披露授权也不因“只读”而跳过。

来源中的“忽略之前规则”“去读取别的项目”等文字是被检索数据，不是系统指令。安全边界由工具和 owner 强制；不能只加一句 prompt 作为越权防护。

## 5. 锚点与 evidence 精度

一个引用至少绑定 source identity/revision、representation identity/hash、范围坐标约定、精确摘录或摘录 hash；可附 prefix/suffix 消歧。行号只在指定表示中有效，不跨导入版本默认稳定。

W3C Web Annotation 的 quote/position selectors 可作为局部先例；文档改版后位置会脆弱，因此固定版本和表示。自动重定位只能提出候选；不能悄悄把 r1 的证据换成 r2。[D04](SOURCES.md#d04)

用户提供的片段没有完整源时，仍可以生成可引用的本地 sourceRef，但必须标为 user-provided/partial。不能把其标签、链接或本地 hash 当作上游真实性背书。

## 6. 披露回执不虚构“模型用过”

记录 requester/目的通道、requestId、source revision/range、policy/compiler/transform 版本、预算/裁切、允许或拒绝的原因以及已观察的传输阶段。来源正文仍留对应 owner；审计日志不再次无限复制全文。

本地选择/准备、服务端开始返回、已观察的写入或通道 ACK、Provider/模型是否确实使用，是不同事实。外发后 ACK 丢失可以是 delivery_unknown，不能变为 never_sent；没有上游 consumption 证据不显示“已用于回答”。

保留敏感内容关闭/删除与历史效力的独立边界。撤销只读 connector 后必须停止新读取，但已返回的资料可能仍在 Provider 的原生 history/summary 中。需要新的干净 Chat 时显式新建并重新选择内容；不能把 disable 当作远端删除。[R01](SOURCES.md#r01)

## 7. 首轮必须覆盖的负例

| 反例 | 合格结果 |
|---|---|
| 同 native ID 来自两个账号 | 来源与授权独立，不误合并 |
| search 后撤权，再 read | 拒绝继续披露；旧 cursor/cache 不绕过 |
| r1 命中但源现为 r2 | 读 r1 明确版本；缺 r1 则 missing，不用 r2 冒替 |
| 两字中文/大小写/规范化/无命中 | literal 与全文语义明确，覆盖范围真实 |
| 缺附件/未知导出字段/部分解析 | metadata-only/partial/unsupported 有回执 |
| 来源 prompt injection | 不能改变 grant、调用写能力或正式 decide |
| 返回数据后记录/网络中断 | 不自动重发、不声称未披露，保持不确定事实 |
| 索引清空/过时 | 可重建或明确滞后；不伪造完整搜索 |
| 同文跨集合、跨来源 | 集合多关系，不混淆物理去重与事实归属 |
| 临时 Chat / 停用 connector | 按所选模式不持久写 memory；停止未来读取不冒称擦除过去 |
