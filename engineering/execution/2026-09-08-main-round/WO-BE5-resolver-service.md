# WO-BE5 · 声明式来源解析的服务接缝

状态：Astra 下一轮后端工单；契约准备就绪，尚未实现/验收。对应 Fable BE-5 / WK-64–65 的 Runtime R2；它不等于 Long-life Roadmap R2 阶段完成。基线及写权顺序见 [本轮派单](README.md)。

## 问题与既有能力

`app/runtime/source-resolver.mjs` 已提供纯 `resolveRuntimeSource`，输入/输出见同目录 `source-resolver.d.ts`，边界见 [source-resolver](../../../docs/runtime-control/source-resolver.md)。现在只有后端模块，Workbench不能通过当前HTTP契约调用它。先开放本地用户的inspect-only服务，不引入安装器、抓取或模型工具。

## 冻结给实现者的接缝

- 拟新增 `POST /api/v5/runtime-sources/resolve`，复用当前loopback/origin、`x-work-token` 和body大小限制。该路由本基线不存在；实现并验收后再登记到正式API文档。
- body直接使用现有resolver输入，不另套proposal信封；只接受已有inline/locator判别和字段。输出直接使用既有Resolved/Unsupported联合，不新增“可安装”或“已验证”状态。
- inline原字节/hash、declaredOrigin verified=false、capabilities.granted=[]、inspect-only不变。locator继续返回unsupported，不读path、不fetch URL、不clone、不安装、不连接MCP。
- 成功解析与明确unsupported返回200；格式/字段/内容错误沿既有400、body过大413、未授权/非法origin沿宿主既有错误。不要把unsupported改成抓取fallback。
- 无session/target/scope选择，无revision、store、inventory、审计或运行状态写入；读取不经过mutation队列。active Run期间仍可做纯解析，不能以“检查”授予该Run新能力。
- 不登记runtime.resolve模型工具，不记录原始请求body进日志，不执行源中脚本。后续import仍需原PUT runtime-control的目标校验/CAS；解析hash不是批准。

## 文件责任

Astra负责 `app/server/index.mjs`、`app/server/service.mjs` 的薄接缝和相关API测试、`docs/runtime-control/{api,source-resolver}.md`。解析规则复用原模块；非确认缺陷不改解析器，不改app/web、模型loop、存储schema或权限模型。H1共享service文件时串行接收。

## 必须验证

1. 经真实HTTP提交inline来源，得到同一原字节identity，声明来源仍未核验。
2. token/origin/body限制与现有API一致；不新开未授权读取/写入入口。
3. locator明确unsupported；测试注入或隔离探针证明未发生获取/连接，而非只断言文案。
4. 解析前后持久配置、资源目录与revision相同；active Run上下文绑定不变。
5. malformed/extra fields得到确定错误；解析成功后不自动import。
6. 运行既有resolver与受影响service/HTTP回归。真实provider不属于本单证据。

交付固定SHA、HTTP示例与对应测试、无副作用检查、未检项。Astra作者自测后由非作者独验；验收后Opus才在WK11后续阶段接入。回退只移除新路由，不涉及数据降级。
