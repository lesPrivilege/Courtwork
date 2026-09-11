# 前端优先消费与合流回执

2026-09-12。用户在`ebd3e52d092f2605777ea363a8c8b35a1c3c0fb7`交付后要求“优先消费前端，后端登记缺口，然后merge”。Astra逐张查看五份原图，并复读RD-006、PR文稿与当前Chat/Attention/Runtime入口。原件及历史verification保持原字节；研究分支通过真实merge ancestry接收。

## 本轮前端消费

[frontend-contract](../../design/agent-interface-2026-09-10/frontend-contract.md#任务入口与资源维度2026-09-12消费)已增加任务入口与资源维度规则，成为后续composer/selector施工的活动规范：组织归属、目录、执行位置、Git/worktree、权限、模型分维；No folder与无project不同；未知Git不画main；最近项不自动授予/继承目录；失败保留原scope和草稿。

当前最近实现先例是[app](../../../app/web/app.mjs)的Home project选择、普通Session创建、model/permission控制，以及[Attention agent](../../../app/web/attention-agent-view.mjs)的global创建链。现有界面已能分别表达project、模型和文件访问，Attention不要求先选project。本轮没有证据要求为了这五图重排这些已发运控件；截图中的目录连接、项目切换与worktree动作缺少CW后端owner。因而先消费语义和真实入口规则，新增动作留待服务capability，不制作会误报可用的按钮。

这次是前端规范接入与后端缺口登记，**无App代码或视觉基线变化**，也不把普通Chat伪装成Attention。最终前端26图和8804源码对齐仍对应既有产品版本。

## 登记到既有后端路线

| 前端需要 | 归属与缺口 | 现在的表现 |
|---|---|---|
| 目录为空、连接/替换/断开状态 | DWB-01：绑定DTO、revision、capability、回执、active-Run冻结、恢复/迁移 | 不推断用户目录，不新增Connect控制 |
| 只读范围与撤权 | DWB-02：逐调用路径身份/授权、只读工具、来源hash、撤权及失效 | 现有managed文件权限保持，不扩大root |
| 无project普通Chat | DWB-05 / BE-23：角色、身份、配置、导航/恢复 | 普通Chat仍选project；Attention原入口可用 |
| Git/worktree、跨project迁移 | 后置独立owner合同 | 无操作，无默认main或隐式迁移 |
| Agent-created资源浮现 | BE-6/7：精确Skill草稿、决定与apply | 与[GUI控制面首片](../gui-agent-control-plane-2026-09-12/skill-proposal-slice.md)并账，不新增registry |

[PR文稿](pr-plan.md)的DWB-01→02→03是**运行能力的依赖序列**；前端语义规则可先接入，不等于绕过这些依赖。本回执与[backend requests](../../mvp/execution/work-surface-kit/backend-requests.md)互链，未另造DWB同义编号。

## 验证

合流检查六份source hash（原对话+五张PNG）、文档链接、diff空白及`ebd3e52`祖先关系。原件视觉查看只验证截图语义；没有新增浏览器交互或产品测试，因为产品源码未变。原有793/793与26图接受保持原范围，不给未实现DWB提供运行证明。Astra为本次集成作者，Luna有界只读复核前端依赖，不宣称独立产品接受。未push/deploy，保留其他writer未提交文件。

Luna有界复核确认当前功能没有必须先修的前端缺陷；支持先接维度/空态规范，DWB-01/02/03及BE-23保持待后端能力。

组合候选检查：1017份文档、5037条链接PASS；六份原件hash PASS；产品app/brand源码自647bc21无差异。
