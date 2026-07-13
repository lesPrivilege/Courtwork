# ADR-007：Provider、Turn 与受控交互协议

- 状态：Accepted
- 日期：2026-07-13
- 来源：`0ba871d`

## 背景

当前实现已经有 OpenAI Chat Completions 兼容请求、DeepSeek quirk、钥匙串代理和 reasoning 字段解析，但 provider 代码仍住在 core，desktop 仍暴露会猜测能力的 `custom` 配置；Rust 探针与正式请求重复组装 wire，所谓流式响应也会先读完整个 SSE body，再由 UI 模拟打字。chat 只得到最终正文与可选推理文本，`ask user` 则是 desktop 内的演示卡，没有可回放的请求、暂停与回答协议。

## 决定一：独立 provider 边界

- 新建 `packages/provider`。它拥有 provider port、OpenAI Chat Completions adapter、SSE 归一、能力 profile、结构化输出降档和计价；`packages/core` 只消费 provider 协议，不理解 DeepSeek 或具体 wire 字段。
- 通用兼容的是**协议形状**，不是任意端点产品能力。当期产品注册表只收录 DeepSeek，固定官方 base URL，并以真 wire 测试声明模型、reasoning route、structured-output 档位和参数互斥。
- desktop 移除 `custom` 产品入口和可编辑 base URL。未来 provider 必须通过具名 profile/adapter、能力证据、变异测试和安全评审进入注册表；不得从用户填写的 URL 猜测 `json_object`、`reasoning_content` 或 `reasoning_effort`。
- WebView 只提交 `providerId`、`modelId` 与生成参数。Rust 从同一受控 descriptor 解析目标端点并从钥匙串取 key；key 明文不得返回 JS、日志、事件或遥测。任意自定义 host 若要恢复，须另立安全 ADR。
- 凭证状态与连接状态正交：`credential = absent | stored`；`connection = unverified | verifying | ready | failed`。存入 key 不等于可调用，探针成功也不永久代表连接可用。

## 决定二：真实流与 Turn 生命周期

provider 对 core 发布瞬态 `ProviderStreamEvent`：

```text
started
reasoning_delta
content_delta
usage
completed
failed
```

Rust/Tauri 传输必须逐帧转发，禁止先 `.text()` 聚合再模拟流式。网络、鉴权、限流、协议、取消与非法响应均进入闭集失败；正常结束但正文缺失不得伪装成功。

core 把一次模型调用投影为可回放的 `TurnEvent`：turn started、assistant message started/delta/completed、reasoning started/delta/completed、interaction requested/resolved、turn completed/failed。增量可只存在于在途流；持久层至少保存最终 assistant message、可选 reasoning、usage、失败与交互请求/回答。reasoning 是模型生成内容，不是证据、系统事实或锚点权威；provider 不支持或未返回时必须显式呈现“无可用推理内容”，不得伪造思考过程。

## 决定三：`ask user` 是受控交互，不是模型自治工具

- 垂类 manifest 提供 `InteractionTemplate`：namespaced `id`、`kind`、问题内容、选项、是否可跳过、允许的 `anchorPolicy` 与通用 `uiTemplateId`。
- 模型或声明式场景只能请求 `templateId + anchorRefs`，不能直接生成任意卡片文案、颜色、按钮或坐标。core 通过当前垂类注册表解析模板并校验锚点；未知模板、越权锚点和非法选项一律失败。
- 合法请求写入不可变 `interaction_requested` 事件并暂停 turn；用户回答写入 `interaction_resolved` 事件后才可续行。回答须可审计，不能用改写历史消息代替。
- desktop 只渲染 core 给出的通用 view model，不 import 法律字段或 demo 语料。第一版只实现单选/确认型交互，不开放任意模型 tool calling。

## UI 约束

`ask user` 卡片属于 chat 内的通用协议表面：使用 generated 冷调底色的轻微差异、1px hairline、既有 6px 圆角、无阴影，不新增 L1 白卡。卡片出现不做装饰性入场；主操作与选项只使用既有 70ms / scale(.98) press feedback，并完整支持 focus-visible 与 reduced-motion。内容、选项与锚点由垂类模板注入，桌面只拥有排版和交互状态。

## 依赖与迁移

```text
apps/desktop ──► packages/core ──► packages/provider
      │                 │
      └────────► packages/registry ◄── vertical packages
```

迁移按 Provider-1（抽包与单一 DeepSeek 注册）→ Provider-2（Rust 单一请求路径与真实流）→ Turn-1（生命周期）→ Interaction-1（模板、暂停与回答）→ Chat-UI-1（通用卡片）推进。迁移期允许 core 做薄重导出兼容，但禁止在 core 留第二份 provider 实现。

## 后果

新增 provider 需要显式登记而不是开放任意 URL；短期少一个“看似通用”的配置入口，换来可证明的安全与能力边界。chat 的思考、推理和提问从视觉 demo 变为可取消、可失败、可续行、可回放的状态机，UI 不再承担协议判断。
