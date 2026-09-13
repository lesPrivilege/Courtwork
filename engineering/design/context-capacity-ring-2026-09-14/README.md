# Context 占用环与可选 Cache diagnostics

2026-09-14 · 基线 `846b18f`，Astra 实现与作者检查。用户授权实际占用环、默认登记1M，追加 Context Inspector 与 Cache 语义，末张截图只作参考；[canonical contract](contract.md)记录消费裁决。

## 已实现

- `app/runtime/context-capacity.mjs` 在 SDK 公开 fetch seam 只读观察 SSE 原始计量字段；只保留数字，不持久化响应正文、header 或 key。每个 HTTP retry 清空前次观测，传输字节不改写，单事件缓存限1MiB，流错误继续交 SDK。
- Context 的 numerator 是该请求原始 inclusive input：Completions 的 prompt_tokens，Responses 完成/截断事件的 response.usage.input_tokens。缓存不重复相加，输出与会话累计不参与。默认1,000,000仅登记显示窗口；真实 model contextWindow 优先，不修改模型上限或 compaction。
- `runtime.request.telemetry` v1 增加 contextCapacity 与 cache，可沿旧事件 store 保存而无需 schema migration。外层 session/runId + requestId、phase 仍是唯一身份；新的 request 开始/streaming/失败/取消没有 completed count，回未知环。历史记录不从旧 usage 或 UTF16 估计回填“真实占用”。
- `chat-measurements.mjs` 以比例绘制 SVG 渐变环，未知为空环，明确0为0%；超过100%保留原数并仅将弧长限制在整圈。现有14px图形、32/44px按钮、锚定popover与Escape返回继续复用。无模拟流动动画。
- Cache 只在原始数据存在时显示 Runtime diagnostics。可靠 Hit+Miss=Total 时绘制100%横条；只有Hit/Write则只显示计数；没有数据隐藏整块，total=0不生成比例。比例分母是 request input，绝非 context window。

## 字段与口径

contextCapacity 为 `{version:1, scope:request-input, source:provider-reported, usedTokens, contextWindow, windowSource}`。windowSource 是 model-declared 或 default-registration。它只陈述 **Latest completed request input**，不是下一次可见 working set，也不推导 Reserved / Free。

cache 为 `{status, source:provider, scope:request}`，可带 hit_tokens、miss_tokens、write_tokens、total_tokens、hit_rate、rate_source:adapter-calculated、denominator:request-input。映射固定在 adapter：OpenAI cached_tokens、DeepSeek prompt_cache_hit/miss_tokens、已安装 SDK 支持的 top-level cached_tokens；Responses 从 input_tokens_details 读取。Cache write 单独保留，不作为 context source、不加到Hit、不从原始inclusive total重复扣减。矛盾分母不画比例；UI保留来源与request范围。

最近先例：原 `contextRing` / `createChatMeasurements` / `.chat-measurement-popover`（composer局部披露），`telemetry-view` 的request身份投影与data-list，现有色彩roles。新增cache条是已报告数值的图形，提供文本替代，Hit用control-accent、Miss用panel-muted。规范按[frontend contract](../agent-interface-2026-09-10/frontend-contract.md)与[telemetry](../home-composition-2026-09-10/runtime-telemetry.md)，没有新增状态authority、依赖或外观基线接受。

## 验证与限制

- [定向32/32](evidence/targeted-tests.log)：真实本地 SDK → Host store、两种原始协议字段、零/未知/超窗、旧事件与作用域隔离、错误、分块SSE与超长帧、缓存缺失/矛盾/零分母/写入重叠和渲染。
- 先前完整1004/1006的两项失败均是fixture no-reasoning旧期望；[原日志及18/18修订回执](../../research/models-provider-registration-2026-09-14/implementation.md)保留。没有声称本片完整套件全绿；最终组合完整回归由发布任务完成。
- 作者浏览器：本地合成gateway真实响应经相同SDK与存储链，25% / 75% / 0 / unknown请求已记录。桌面及390px明暗目验、390无横溢出、44px按钮、Escape焦点返回；最终cache显示75% Context与50% cache两种独立比例，unknown整节隐藏。
- 颜色/材质/交互lint通过；[对比度报告](evidence/contrast.md)。窗口与主题临时设置已恢复。
- 未运行付费provider。WebSocket、非SSE、未映射协议/字段保持未知；未实现provider-only ratio适配、下一次working-set来源分解、Reserved/Free、账号quota、原生200%与完整读屏矩阵。上述不是额外探索任务。非作者接受留给发布任务。

[25%桌面](evidence/context-25-desktop.png) · [25%详情](evidence/context-25-details.png) · [75%桌面](evidence/context-75-desktop.png) · [75%窄屏深色](evidence/context-75-390-dark.png)是cache追加前的同一占用实现证据。最终[Context+Cache明色](evidence/context-cache-final-light.png)、[390深色](evidence/context-cache-final-390-dark.png)、[无telemetry](evidence/context-cache-unavailable.png)对应本片最终UI。

复现[合成fixture](evidence/fixture.mjs)：从仓库执行 `node engineering/design/context-capacity-ring-2026-09-14/evidence/fixture.mjs`，打印本地临时Host地址。所有响应与key均为固定合成值，不使用个人credentials。fixture通过真实API创建临时测试数据，不把截图数据冒充真实模型测量。

用户原文 SHA-256：`08a420d20b81bfb758c4fcbbe6df23c9fa376d1ad27bc7e07512a3a0a97940af`。
