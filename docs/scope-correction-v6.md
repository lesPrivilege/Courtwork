# V6 范围纠偏：通用 work agent 地基

2026-09-06，用户补充明确：本轮重点仍只有通用 work agent 的 Harness Core 和 UI，以及 SE 引入通用面的必要兼容改动；extensions/experts 实现下一轮。SE 引入的工作面仅是额外 preview Chrome tab，Courtwork 的编排仍可参考。

此页覆盖此前 ux-assignment-v6.md 中“SE renderer 三项变化”和相应验收承诺。已施工的 renderer 内部草稿、Review reason、pending/失败反馈增强不进入 V6 活动源码。原 renderer 与 renderer 测试恢复 V5 原字节；WIP 放入独立 deferred 材料供下一轮重新裁定，不能读成已接纳或已独验。

本轮保留：

- 通用导航名称筛选、真实身份校验后的选择恢复、异步导航身份门。
- 通用 Run/工具活动/错误和长文信息层次。
- 通用问答输入、重复提交防护、阅读位置与工具详情展开连续性。
- 通用 Runtime setup 与 preview 容器生命周期。SE 使用现有 V5 renderer 作为额外preview tab的接入样例；tab标题/关闭重开/可见性/身份与代次属于通用宿主职责。
- V5通用backend/runtime/Core/API/依赖锁不变；只有有证据的必要兼容才单独记录。此轮不实现expert、不新增SE业务状态。

“preview Chrome tab”在当前本地Web壳落实为通用预览页签/容器；当前提供的是同源受信renderer，不声明新增真实嵌入浏览器宿主、任意URL导航或Chrome扩展能力。Courtwork提供编排机制参考，不引入其schema/权限或第二账本。

验收必须围绕通用宿主进行；先前 SE 内部输入的浏览器诊断仅为deferred WIP观察，不再列入本轮成果。
