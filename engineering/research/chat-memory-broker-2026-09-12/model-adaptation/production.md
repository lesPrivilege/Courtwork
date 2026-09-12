# Model / effort生产接线

用户在研究合同后授权 explore 后修改生产。实现从 `main@0fbd898` 合流后的隔离 `8c85da40a000719b8b8a5f39f579d742fa59318f` 开始；Astra负责Host、迁移与集成，Luna分别负责统一UI、Pi最终payload接缝及合成测试。工作目录仍属Courtwork主线的临时隔离分支；不在共享工作目录切换分支或迁移个人数据。

## 最终合同

- `model-capabilities.mjs::describeReasoning`只从安装Pi的精确 `thinkingLevelMap` 或该connection/model/API的 `reasoningEfforts` 人工列表产生枚举；不从布尔值、family名称或目录ID推导档位。未知集合为空。用户提交精确列表时，该列表优先于旧布尔字段，并同步规范化布尔值与SDK注册；列表未知时旧true/false/null保留。Adapter版本固定为 `courtwork-reasoning-1/pi-0.85.1`，来源标签不称上游握手成功。
- GET目录投影 `reasoningCapability`、`reasoningByApi`、`defaultEffort:null` 和版本；GET配置另给实际路由能力。自定义endpoint不同于catalog端点时不继承能力。Provider default是省略参数，Off必须由精确支持集明确提供。
- PUT配置的 `expectedVersion` 在descriptor外，由现配置队列校验；缺失/非法400，陈旧409，运行中仍409。配置与新Run共用能力准入；非法保存保持原配置，旧配置启动Run时再次检查。
- schema13为连接模型增加 `reasoningEfforts:null | string[]`。12→13保留config、旧Run和检查回执，给新字段null并递增原版本使回执失效；旧文件精确字节备份后原子替换。新Run冻结 `reasoningBinding`，含来源、合法集合、adapter/config版本；不改Core schema。
- 兼容连接固定通用OpenAI推理参数与历史字段语法，拒绝SDK凭URL子串偷偷切换厂商格式；此固定不新增厂商私有参数配置。SDK设置和Provider观察分开。上游未返回effective effort就保持未知。BE-39检查仅记录一个无工具请求的API、adapter与默认省略参数覆盖；成功不证明所有参数、多轮或工具能力。

## 前端连续性记录

最近先例为基线上的 `app/web/model-picker.mjs::createModelPicker`、`provider-config.mjs::projectProviderConfig`、`settings-view.mjs` 的Model/connection表单。按[前端合同](../../../design/agent-interface-2026-09-10/frontend-contract.md)复用有限互斥选择、渐进披露、原生dialog及现role tokens；不另造ModelDropdown。作用域仍为Host-wide未来Run；没有session或单turn override。

| Before | After | Why |
|---|---|---|
| 布尔reasoning产生通用档位，默认medium | 仅精确能力枚举；Provider default明确省略 | 展示和发送都不能制造能力 |
| 选模型与effort分散理解 | 同一picker展示当前摘要、修改草稿与模型切换披露 | 用户可一起核对模型与参数 |
| 旧页面整体保存覆盖新配置 | 版本冲突保留草稿并要求重新核对 | 队列序列化不替代陈旧版本校验 |
| 人工“支持推理”复选框 | 明确填写该连接实际支持的枚举值 | 人工声明须有精度及来源 |

## 验证与接受

2026-09-13收尾：

- Astra集成检查：`node --test --test-concurrency=3 --test-timeout=90000 app/tests/*.test.mjs tests/*.test.mjs`，完整[868/868](evidence/full-suite.log)通过。随后对声明优先级及通用兼容语法的最后加固，运行能力/连接/两API协议/verify/telemetry/compaction/DeepSeek等实际受影响集合，[48/48](evidence/final-delta.log)通过；不把较早全量运行声称为最后两个增量的完整重跑。最终补齐历史字段反例断言后，request telemetry再跑[12/12](evidence/wire-final.log)通过。
- [runtime smoke](evidence/smoke.json)通过；颜色43文件、材质5文件、交互38模块和语义消费者39条检查通过；[对比度角色报告](evidence/contrast.log)通过。文档链接检查见[evidence](evidence/doc-links.json)。首次全量的旧schema/旧Off断言、目录端点投影断言、语义消费者登记和新增卡片背景role问题已逐项修正；通过回执对应修正后的检查。
- [浏览器回执与图片hash](evidence/browser.json)：真实生产UI＋独立合成Host，1440/1280/390×明暗六配置无dialog横向溢出；Settings390无页面横向溢出。双标签CAS冲突保留草稿并刷新对照、失效值经搜索仍禁保存、显式默认重选、未知能力、Enter/Tab序列和Escape返回通过，浏览器warn/error为空。200%浏览器缩放在本IAB未生效，不计作通过；物理触屏和forced-colors未补跑。
- Luna UI作者完成有界实现；另一位非作者Luna复核并指出搜索重启Save与文案/endpoint差额，作者修复后32/32有界复核通过。Astra另修Settings作用域/未知不称Off及telemetry标签，非作者Luna41项复核通过。
- Runtime作者Luna完成参数/压缩请求处理；UI作者Luna作为非作者复核，确认最终payload省略/映射与`.result()`只记一次结束。Astra的Host代码另由Runtime作者Luna进行非作者边界复核，所指出的布尔／精确列表冲突及SDK URL推断问题已按本文固定语法和优先级处理。详见[复核边界](evidence/review.md)。

这些是本片有界工程证据，不关闭原G1–G5等产品门。未跑付费Provider，未升级Pi，未新增Anthropic/Gemini原生adapter，未迁移个人数据，未合共享main、push或部署。收尾实读共享main为`7a2e26c6f35f3810d3c3ad4c77b83a3079d7bcc1`且有其他writer未提交内容；本片保持隔离，不替换它们。

