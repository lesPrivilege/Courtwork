# WO-WK11 · Runtime Workbench（Claude Opus）

2026-09-08。用户授权下一轮施工；基线 `d86eba49ca308fb9f47fc953fe440ffa3289da3e`（main）。现RC已在当前实现，WO-WK10a合流前置已满足。共享 `app/web/app.mjs` 的写入排在 [WK10b第一段](WO-WK10b-work-surface.md) 接收后，不能同时覆盖同一文件。Astra负责契约与接收，Fable既有WK裁定继续作为设计输入。

## 问题与输入

将既有runtime资源检查提升为一致的Workbench编排，分清来源、有效状态、上下文与合法配置；不制造尚未实现的资源能力。

输入：WK-63–68；[runtime讨论](../inputs/runtime-workbench-discussion-2026-09-09.md)；`app/runtime/control-contract.d.ts`；[HTTP API](../../../../../docs/runtime-control/api.md)；[control架构](../../../../../docs/runtime-control/architecture.md)；[文案体例](../../../../design/copy-convention.md)。本单不引入新的Source Resolver/Proposal端点。

## 第一段：当前API即可完成

- 导航按已有裁定容纳Overview、Capabilities、Context、Extensions、Models、Governance及未支持能力的Planned表达。未支持的Registries/Memory/Secrets/Sandboxes等只保留明确状态，不做看似可用的控件；不为导航数量凑内容。
- Capabilities以tool/mcp_server/skill的真实描述与状态显示；Context按instruction/prompt_template/reference与Effective Context Inspector编排。模板仍是用户调用的draft，characters不是tokens，admitted/deferred与历史缺字段明确区分。
- Extensions区分首方实际extension lifecycle与导入plugin声明；后者不自动成为可执行包。Configurable/Inventory形态可以借用，动作只消费真实支持的对象和API。
- Models复用provider-config与用户GUI输入凭据路径；effort未由BE-12提供前不画虚构选项。
- Governance消费现有scope、profile、policy和只读权限解释。`operation: profile/policy`按control-contract原类型，不能发明外层scope或允许放松父deny/ask。
- Source/Effective分别展示；历史Run从recorded binding读取，不能用当前catalog补齐历史。409刷新权威状态并保留用户可检查的草稿，不静默重提。
- `/`搜索只查找和打开当前可读取资源。输入框/contenteditable、IME composition、已有对话输入不被全局快捷键抢占；无安装/应用副作用。

## 后续接缝

[BE-5服务单](../../../../execution/2026-09-08-main-round/WO-BE5-resolver-service.md)验收后，才接入显式inline来源检查；第一段不等待它。URL/仓库/路径解析保持unsupported，不做伪成功toast。

R4 Proposal、R5事务化apply/rollback、R6 Expert快照与模型侧工具仍等各自后端契约。现有PUT配置编辑可以继续使用，但不得更名包装成已交付的持久Proposal/版本批准系统。

## 写权、验收与交付

Opus拥有runtime-view及必要settings/navigation/web样式，新增view模块如需静态服务allowlist改动，向Astra交明确路径请求，不能直接改server路由。Core/runtime/control-plane、schema、权限算法与新的端点不在写权内。

验证真实本地API读取、一次允许的配置更新及权威返回；active Run冲突、stale revision、父门控、缺资源、断线、零/缺失计数、历史partial Context、prompt draft。键盘/缩放/浅深/窄屏及搜索不抢输入有实际检查；触控/读屏/真实provider未跑则明记。运行相关既有RC测试，更新的断言须基于新编排的实际行为，不能只删失败项。

交付固定SHA、受影响文件、同条件截图与消融（删除某元素失去什么判断）、实际API/浏览器结果、未检项和后端请求。作者验证与Astra/非作者独验分开，视觉四轴留用户。完成意味着现有资源Workbench可用，不意味着所有Runtime R2–R6已实现。
