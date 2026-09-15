# Object Command / Context Action Grammar

2026-09-14，Astra采用用户提议，首批Project / Chat / Recent；本次登记排队，不打断RD-006仓库挂载串行施工。接[UX Grammar](ux-grammar.md)和[前端合同](agent-interface-2026-09-10/frontend-contract.md)。

## 责任与结构

一级对象的动作由原domain/service或既有view-state owner负责，菜单只是投影；Recent里的Chat和其他位置同一Chat使用相同身份与命令。采用稳定command ID与共享dispatcher，菜单、更多按钮、inline accelerator与后续快捷键复用。不新建通用权限引擎或无消费者的插件框架。

命令最小描述：id、label、semanticIcon、targetKinds、group/order、when、enablement及禁用原因、execute、destructive、原owner的confirmation规则。context携带targetKind/id、状态版本、capabilities与有效权限；触发时重新解析目标与权限，不能凭打开菜单时的快照执行。后端仍负责实际验权/并发规则，registry不是授权来源。

无能力/不适用的动作隐藏；暂时不可用的真实动作禁用并可获知理由。不新增Planned占位项。破坏性动作最后，按实际对象后果走既有确认/恢复合同，不机械为所有动作添加确认。菜单分组统一：导航、组织、生命周期、互操作、破坏性；空组不留分隔线，最多一层子菜单。

## 首批能力核验

用户列举的Rename/Pin/Archive/Move/Section/Open new window/Delete等均为候选，不能据此声称已支持。本轮源码初查只确认Session PATCH rename与DELETE入口（app/server/index.mjs）；具体服务条件仍须施工探索。Project及其他动作逐项登记owner、实际API或已有本地状态、保存时点和失败恢复后才接入。Share/Fork/unread等无owner能力不出现；不得以UI dismiss替代正式resolution，File evidence删除与Core决定不由菜单授予。

对象空白区域、正文和可编辑输入保留原生浏览器行为。对象row secondary-click不得意外导航、发送或改变另一个已选对象的动作目标；只有成功提供菜单时才拦截原生菜单。可见更多按钮提供相同命令，键盘Menu键/Shift+F10、方向键、Escape、焦点返回与触屏可达。动态删除/失权/断连时关闭或更新，不执行陈旧目标；不提供唯一依赖hover的入口。

## 串行施工与验收

1. 核对象taxonomy、现有命令/owner与最近菜单先例，提取最小registry。
2. 统一菜单primitive：pointer与anchor定位、视口避让、焦点/键盘/生命周期。
3. Project / Chat / Recent接真实命令；同一对象的更多与右键命令集合/执行路径一致。
4. 后续Matter/File/Run/Attention/Spark各自消费同一结构，不本轮批量伪造能力。

每个首批row逐一secondary-click，对象身份正确、可见命令全有真实路径、无dead item；测暂时禁用、目标变更、重复点击、异步失败、键盘/触屏、长标题与390宽/明暗。测试核registry与owner接线，Chrome人类目验交互。非作者Luna验收，Astra仅语义裁决。不以测试绿灯关闭未做的目验。

## 外部参考核验

[VS Code Commands](https://code.visualstudio.com/api/extension-guides/command)确认command ID/handler与UI入口分离、when控制呈现、enablement控制可执行性；采用此结构，不引入其SDK。[Microsoft collection commanding](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/collection-commanding)作为collection多入口参考。[Apple context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus)本次仅取到动态页面壳，用户引述的具体限制未独立核实；本合同的一层子菜单等为Courtwork采用规则，不冒称已核Apple原文。

状态：语法与首批边界登记，尚无产品实现或远端PR。
