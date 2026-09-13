# Models 首片修正 · 2026-09-14

用户在架构快照后授权“可以先做修正”。基线 `c4a182fb4b0b004c6f20e507191309ad5a2ba6ff`，Astra实现和作者验证；发布任务负责最终合流与独立组合验收。本片扩展已有owner，不建立第二份配置库。

## 已改行为

- [provider-definitions.mjs](../../../app/runtime/provider-definitions.mjs)以独立定义登记OpenAI、DeepSeek、本地fixture和通用兼容协议：身份、已安装格式、endpoint要求、推理字段格式、凭据类别、来源与声明版本。它描述本机已安装协议，不声称外部模型已验证，也不持有任何凭据、tool list或权限。
- Pi原生provider注册与默认connection、服务准入、公共目录沿同一声明。`GET /provider-models`新增`providerDefinitions`，公共connection新增派生`definitionId`；未增加持久schema。兼容connection仍持有自己的provider identity/credential slot，不能凭URL猜测DeepSeek格式；原生DeepSeek额外模型明确登记thinking与reasoning_content格式。
- UI按Host声明列provider和API格式；资料缺失不猜测可用格式。切换provider或连接类型清空旧endpoint；DeepSeek非目录API的显式endpoint要求在UI保存状态与后端保存/Run准入共用。切换格式即时更新必填文案与保存状态，不静默替换格式、端点或effort。
- Models › In force现在集中展示当前Runtime adapter，链接Tools、Permissions和Developer；General的重复adapter摘要移除，Developer保留诊断/绑定信息。没有Host切换合同，所以adapter只读。链接沿IC-1拥有32px桌面/44px窄屏目标。

已有Run配置冻结、reasoning capability binding、Host曝光与逐次工具执行验权保持原合同。此片不是完整动态provider插件注册或全模型工具能力注册；工具schema方言/parallel/hosted tools的完整能力快照及provider-definition版本写入Run绑定，仍按[架构快照](README.md)后续裁决。当前注册表为随构建安装的声明，不提供热更新。

## 最近先例与 grammar

复用[模型适配生产回执](../chat-memory-broker-2026-09-12/model-adaptation/production.md)、[Settings资源管理](../../design/settings-resource-management-2026-09-13/README.md)和[前端合同](../../design/agent-interface-2026-09-10/frontend-contract.md)。`createSettingsView`继续持有连接表单；`createRuntimeView.renderEnvironment`展示同一已读取Host快照。没有第二个Model picker或注册状态机。Properties使用原settingsRow/readOnlyRow，技术协议说明在Advanced，下一次Run配置和实际adapter状态分列；工具配置/权限为既有owner的导航，不把模型能力当许可。

## 作者验证与限度

- [全量999/999](evidence/full-tests.log)：两种API的真实SDK合成工具循环、连接身份/凭据隔离、CAS、活动Run冻结、能力快照、迁移与重启恢复。新增provider-registration四项覆盖独立语法、未知注册、原有配置不被拒绝请求改写、Models只读harness及真实导航目标。测试未调用付费provider。
- iAB实际页面：OpenAI草稿填入合成旧endpoint后切DeepSeek，Base URL归空；选择Responses立即要求显式地址并禁用保存。[字段证据](evidence/provider-requirements-1280.png)。未提交真实provider配置或输入真实凭据。
- 最终harness区域1440/1280/390 × light/dark目验：[1440 light](evidence/models-runtime-1440-light.png)、[1440 dark](evidence/models-runtime-1440-dark.png)、[1280 light](evidence/models-runtime-1280-light.png)、[1280 dark](evidence/models-runtime-1280-dark.png)、[390 light](evidence/models-runtime-390-light.png)、[390 dark](evidence/models-runtime-390-dark.png)。390px下document宽390、内容scrollWidth=clientWidth=356，无横向溢出；三个链接实测44px高。
- Enter进入[相邻Tools](evidence/tools-neighbor-390.png)，Back to app返回[完整应用](evidence/full-app.png)并聚焦composer。主题恢复原System，临时viewport已释放。链接跳转后目标页焦点落在document，是既有hash导航行为，本片未声称已完成跨组焦点治理。
- 末轮链接命中区仅CSS调整，未重复全量；colors/materials/interaction及文档链接检查另跑。未测原生200%、forced-colors、屏幕阅读器或任意长adapter ID；六主题尺寸图覆盖新增harness区，不扩大为整个连接表单的全矩阵。作者图不是独立视觉接受。

静态UI依赖新增Host协议声明；部署组合需要重启Host读取新模块，不能仅刷新旧Host托管的新前端。合成预览使用独立数据与端口，发布任务另行接收源码、刷新正式Host及验证。

## Independent integration follow-up · 2026-09-14

Release-task Luna review identified that the fixture's `reasoningFormat: none` still produced `supportsReasoningEffort: true` for extra model declarations. Astra corrected the compatibility projection to disable native effort for that protocol. A bounded regression checks that an extra fixture model declaring `high` cannot encode a reasoning parameter, while provider-default removes it. Provider registration tests: 5/5. This fixes the reviewed mismatch without adding new provider capabilities.

The first subsequent full run was 1004/1006 ([original failure log](evidence/context-first-full-tests.log)): two older fixture tests expected declared effort lists to override the fixture's missing protocol encoder. Their assertions now preserve those declarations while expecting no selectable fixture effort. Exact low/high/max and per-connection isolation assertions remain on the compatible protocol that supports them. The affected suites pass [18/18](evidence/fixture-none-targeted.log); no product check was removed. Final combined full verification belongs to the release task.
