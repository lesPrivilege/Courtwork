# Slash与compaction · 登记与即时消费

2026-09-13；用户要求源会话入账、即时消费，并将Release后期事项登记为RD或缺口。检索会话ID为`6aa6752c-fc94-83ec-9641-1d56d177ba6b`，返回1轮2消息、无附件、无更早页。完整[工具返回](source-conversation.json)、[可读原文](source-conversation.md)与[版本/hash](manifest.json)留存；来源中的派工、门槛和外部引用均是待裁数据，不自动升级为用户指令。

本片从本地main `de55674939d3a80afaa0f5ecaf0e4bd159adf95f`建隔离树。同期UI writer在修改活动行/Review focus，未覆盖其文件。Astra做源码核对、机制裁决与合成验证；不是独立产品接受。

## 即时消费结果

| 来源问题/建议 | 当前核对与裁定 | 落点 |
|---|---|---|
| slash作为Developer验证入口 | 采用typed capability与surface分离；不引入Pi TUI命令继承 | [RD-008](../RD-008-command-compaction.md) / CMD-01 |
| tool、skill、prompt、extension混义 | tool保留独立模型调用schema/权限/lifecycle；effect kind、source、target分开；model picker与直接setting也分开 | RD-008当场采用；[当前能力说明](../../../app/docs/commands-and-compaction.md) |
| CommandDescriptor与session discovery | 采用一份Host-owned registry、执行时重验scope与版本，URL与字段尚非已实现API | CMD-01缺口；不额外复制现Runtime Resource store |
| `/model`改变“session model” | 修正：现picker保存Host provider配置；下一Run绑定，不是已有session-local setter | CMD-01复用原作用域/CAS，不能擅自扩大协议 |
| unknown slash不得进LLM | 采用未来dispatcher的硬条件；本基线确实存在普通文本fallthrough，不能声称已阻止 | 下方2次探针；CMD-01与显式literal escape共同实现 |
| auto compaction是否存在 | 已实现；阈值留余量、overflow、retry/cap、cancel/deadline/restart及context重新注入不是新功能缺口 | 本轮15/15、使用说明；不重复开auto实现工单 |
| `/compact [focus]` | 原生SDK支持，但Host入口/操作回执缺失；native方法先abort，不能直接暴露给正在运行的会话 | CMP-01 idle-only、共享admission、取消/恢复合同 |
| lifecycle与before/after观测 | 当前reason/outcome和request purpose存在；before/after公共字段及manual生命周期未完成 | CMP-01/02，estimate与usage分开 |
| 根规则重新注入 | 采用持久owner重新编译，既有runtime.context已做；不据此宣称历史文本或撤权内容自动擦除 | 现有合同澄清，不新造memory store |
| Gemini双阶段摘要/阈值/输出预算 | 质量优化需实际丢失证据，精确外部值未核验，不移植到Release默认策略 | CMP-02研究候选；[来源复核](sources-review.md) |
| 来源建议Release前两个“小包” | 不直接采用排期估计：manual缺独立admission、操作回执、崩溃/重试记账；slash还有scope/escape兼容合同 | 两项列Release后期Developer增量，不凭来源新增G门 |

## 本轮实际验证

Node22.19.0，Pi 0.85.1，独立合成数据/端口，无真实Provider或个人凭据。依赖只读链接已有clean clone安装结果，不声称本片又做了一次npm ci。

`node --test --test-concurrency=1 app/tests/compaction-runtime.test.mjs app/tests/compaction-lifecycle.test.mjs app/tests/release-input-binding.test.mjs app/tests/runtime-foundation.test.mjs`：[15/15](baseline-15.tap)，13.28秒。覆盖阈值、持久摘要、失败无partial、retry/缺失usage、cap、取消/超时、loopback实际HTTP overflow与重开；另含runtime.context/资源绑定、compaction后撤权、Host关闭合同。`provider overflow`在这里是本地模拟provider真的返回HTTP错误，不是真实供应商证据。

[当前入口探针源码](current-surface-probe.mjs)与[结果](current-surface-probe.json)：对`/compact focus on constraints`及unknown各发起一次普通Run，均为1次local provider请求、原字符串在wire、0个compaction notice。候选commands GET/POST都404。它确认“未实现command surface”，**不是slash验收通过**；不把该错误方向固化成必须保持的回归测试。当前composer仍经普通Run input提交，未另声称本片做了浏览器slash操作。

安装SDK源码还确认`AgentSession.compact()`先`await abort()`，并可返回already-compacted/too-small错误。当前Host每Run实例化/释放session，不能直接拿一个持久全局session接按钮。更完整的操作互斥、回执和恢复要求因此进入CMP-01。

## Release与后续入口

即时更改限于当前能力说明、研究裁决、后端/前端队列与Release支持范围，未改生产JS、schema、provider配置、自动压缩算法或新建UI。CMD-01/CMP-01尚未实现，不能在演示或支持声明中广告slash/manual能力；已有GUI model/effort、Stop、Runtime检查与自动压缩仍沿原合同。

[后端队列](../../mvp/execution/work-surface-kit/backend-requests.md)和[前端队列](../../mvp/execution/work-surface-kit/roadmap-frontend.md)指向同一RD；[Release intake](../../release/review-intake-2026-09-13/README.md)记录其排期与不作现有门替身。后续源码变动时从最新main重新核查，不以本轮15/15覆盖未来实现。未push/tag/deploy。

文档检查：`node tools/check-doc-links.mjs`通过6405项。原文Markdown保留四行来源末尾空格；diff whitespace检查只排除该来源转录，JSON原返回与hash仍完整保留。其余改动通过检查。
