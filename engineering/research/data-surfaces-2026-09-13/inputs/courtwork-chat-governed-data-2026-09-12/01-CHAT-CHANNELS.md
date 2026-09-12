# 01 · Chat 通道、政策与容器

本页是设计裁定与接入条件，不是供应商许可或法律意见。执行前按账号、计划、地区、组织策略及具体分发方式复核。没有 blanket “合规=true” 字段。

## 1. 四个接缝，不合成一个 ProviderAdapter

```text
Provider 原生聊天界面 ── SurfaceChannel ── 人主导的 Chat 入口
       │
       │ 官方导出 / 用户明确提供（不是未经许可的后台采集）
       ▼
AcquisitionAdapter ── Intake / Conversation projection ── 受治理资料
                                                        │
                       精确获准 refs / search / read     │
另一 Provider 原生 Chat ◄── Official App / MCP ◄── Disclosure Broker
```

**SurfaceChannel** 负责打开、定位和可用性，不据网页显示声明抓取权限。**AcquisitionAdapter** 负责已获准来源的导入、原定位/版本/coverage。**Projection** 负责用户本地可查看的材料与关系，不伪造上游完整状态。**DisclosureBridge** 向一个获准目的通道提供最小读取；它不是调用消费端私有 API 的反向代理。

上述不是新增四个常驻服务；可以是同 Host 下四组小接口。它们也不替代已有 Runtime Adapter/Model Adapter：原生网页 Chat 是上游产品，不是裸模型。[R01/R02](SOURCES.md#r01)

## 2. 政策事实与工程结论

OpenAI 本轮个人服务条款页面标注 2026-01-01 生效，明确限制自动/程序化提取数据或输出以及绕过保护；API/商业服务另有适用条款。用户享有内容权利不能直接推出第三方任意获取机制获准。[P01](SOURCES.md#p01)

Anthropic 本轮 Consumer Terms 页面标注 2025-10-08 生效，限制未被允许的抓取和自动/非人访问，API 或明确许可路径有不同适用条件。是否 coding 不是这些条款的判断轴；公开分发与商业包装还需核实际服务协议。[P02](SOURCES.md#p02)

因此本轮采用下面的工程准入：

| 路径 | 本轮处置 | 不能声称 |
|---|---|---|
| 用户在官方入口导出后，主动把文件交给 CW | 首选 acquisition；先预览范围后保留 | 自动持续同步、稳定官方 schema、包含所有附件/分支 |
| 用户主动粘贴或提供已获准片段 | 支持并标为 user-provided/partial | 完整历史、上游签名真实性、覆盖不可见内容 |
| 官方自定义 app/MCP 向原生 Chat 提供 CW 数据 | 首选 thin disclosure，首版只读 | 因存在 connector 就可导出全部原生 chats |
| 外部浏览器打开原生 Provider | 首片稳妥的 surface 基线 | CW 已接管其原生工具或内部运行 |
| 隔离的原生 WebContentsView | 有条件 spike；按 Provider 逐一确认技术和政策 | 可自动提取、绕开认证/CSP/保护或永久兼容 |
| 自己的 API 纯 Chat | 可选另一路；适用 API 配置/计费/政策 | 等于消费者网页体验、继承原生历史或订阅权益 |
| 后台 DOM harvesting、私有接口逆向、会话 token 转作模型 API、自动镜像发送 | 不采用 | 不因本地自用、低频或“只聊天”获得例外 |

官方 ChatGPT 和 Claude 均有数据导出说明；具体计划与组织权限不同。官方导出可成为来源，但不等于原生会话可导入任意另一个账号/Provider；Claude 文档对此也明确区分。[P03/P04](SOURCES.md#p03)

## 3. 官方薄能力的推荐路径

**第一次本地 dogfood：** 可优先研究 Claude Desktop 的本地 MCP/desktop extension，用三个只读 CW reader，而不是示例中的通用 filesystem server。官方支持本地接入和私有扩展分发，具体安装仍由用户执行。[P07](SOURCES.md#p07)

**跨到 ChatGPT：** 研究 developer mode 的读/取数 app/MCP。计划和管理员策略是实际准入条件；当前官方页面列出 Pro 的 read/fetch 路径，并说明远端 MCP 与 Secure MCP Tunnel 的本地部署方式。先按一个已支持账号验证，不推断所有套餐/移动端都可用。[P05](SOURCES.md#p05)

**Claude 网页端：** 用已支持的 remote MCP custom connector 接同一授权 reader；不把它与本地 stdio/desktop extension 当同一种网络拓扑。[P06](SOURCES.md#p06)

连接器端执行本地查询，返回给云端模型的正文仍属于实际外发。端口可达、OAuth 登录、工具 `readOnlyHint` 都不能代替 CW 的 scope、用途、目的通道和逐次权限检查。传输/授权 metadata 丢失时缩小能力或拒绝，不凭模型提交的 account/conversationId 建立可信身份。

首版仅提供 bounded search、exact-version read 和来源 inspect；无 shell、任意写文件、安装、deploy、长自治循环。CW 内部为了保存资料产生的写入归用户命令与 Intake owner，不作为模型的通用写工具开放。

这只约束 CW 自己的能力；不能声称禁用了用户在上游原生产品中另外启用的所有工具。公开叙事应写“CW Chat 不提供 coding 执行能力”，而非“CW 完全接管上游执行安全”。[R02](SOURCES.md#r02)

## 4. 容器 spike 的退出条件

候选为 Electron WebContentsView，仅作可消费实现参考，不裁定整个 CourtWork 桌面栈。Electron 文档不推荐依赖 webview tag；普通 iframe 仍受来源 CSP 限制。[T01](SOURCES.md#t01)

每个 Provider/账号独立登录存储分区；不读取已有浏览器凭据库、不把 cookie/token 暴露给 CW 工具。远端内容关闭 Node，开启 context isolation 与 sandbox；限定导航、新窗口、下载与权限；IPC 只允许固定方法并核 sender。不要为兼容而关闭 webSecurity、注入特权接口或放宽证书检查。[T02](SOURCES.md#t02)

测试范围：正常登录/登出、账号隔离、用户发消息、原生附件操作是否明确、窗口返回、下载到用户选择位置、断网/失效、无 CW 特权泄漏。不要求捕获 DOM。上游拒绝此壳或所需登录不支持时，停在 external-browser fallback，保留已合法取得的本地数据功能。

## 5. 包装、投影和同步的事实显示

分别显示“原生入口可打开”“最后一次本地导入时间/范围”“本地来源覆盖”“本次对外返回了哪些范围”。不能合并成一个“已同步”绿灯。

材料复制到另一 Chat，是明确的上下文转交；不是恢复同一个 Provider 私有 Session。上游隐藏 memory、内部工具和未导出附件未知时，保持 unknown，而不是 off/empty/complete。
