# Recent 与可选工作区入口 · BE-23 / DWB-05 前置

2026-09-13；Astra裁决，Luna源码核对。用户在真实GUI验证中指出：首次交谈前要求命名不自然，工作区选择应更早出现，未选工作区的普通聊天进入左侧Recent。两张参考图表达入口顺序，不授予外部文件系统能力。本轮采用为下一独立实施片，不把schema/身份改动混入已在运行的Release候选。

## 目标交互

1. Home直接写内容；不先弹Project或Chat标题表单。
2. Composer发送前可选择组织工作区，也可保持未选择。组织工作区沿现有Project owner，不把它等同外部目录、运行位置或权限。
3. 未选工作区时创建普通projectless Chat，出现在顶层Recent；明确选择工作区后创建该工作区内Chat。两条路径都用首次内容形成默认标题，支持之后改名。
4. 点击New chat进入空白起点，保留明确传入的组织位置；不默选最近project。失败保留草稿和所选位置，未知创建回执不盲目重发。
5. Recent按真实最近活动排序；服务给出有定义的activity投影。只有createdAt时只能称最近创建。Attention独立，不混入普通Recent。
6. 选择已有会话与重启恢复按Session ID；可选Project不能成为恢复的前置条件。会话建立后不通过前端换标签迁移归属；后续迁移须另有原owner的显式合同。

## 实施责任与顺序

现有Store仅有project/global scope；global由Service/Control Plane绑定Attention profile、工具和权限链。BE-23先冻结普通projectless身份（独立scope或明确正交role，二选一需迁移设计），然后严格schema升级。保留非空托管workspaceDir、Session ID和历史Run binding；不扩Matter访问、不继承外部目录或workspace配置。普通Chat必须使用普通模型/工具语义，不能复用Attention权限集合。

后端先完成创建、列举、配置解析、运行准入和重启恢复；再接顶层Recent、可选Project chooser和取消标题modal。GET /sessions已有无Project筛选的复用点；前端现有sessionsByProject/activeProjectId和Home提交链必须一起修改。单独删required、假Project或隐式global均不接受。

目录连接留在DWB-01/02的resource binding合同。没有capability时不画可用Connect folder；不把用户提及路径当权限。参见[RD-006](../RD-006-deferred-workspace-binding.md)与[五图语义](semantic-reference.md)。

## 最近先例与验收

源码基线93864cac4cf85da83dbd78c9d076b747413ef545；Luna确认本片相关文件与main11cfe4a相同。最近先例为app/web/app.mjs的Home draft、startNewSession/createEntity、selectProject恢复，app/server/store.mjs的Session schema，app/server/service.mjs与app/runtime/control-plane.mjs的global Attention分支。沿[前端合同](../../design/agent-interface-2026-09-10/frontend-contract.md)，受影响grammar为composer组织上下文、侧栏层级、空态、overlay与焦点返回；Review保持原owner。

退出证据：空数据首次发送不命名/不选工作区；显式选中Project准确归属；两个普通projectless会话隔离；Attention工具不泄漏；失败保留草稿/回执未知不重复；Recent真实排序；刷新与正常重开恢复同一ID；旧schema迁移/旧host拒读；宽窄明暗、键盘、Escape/返回焦点及相邻Project/Attention完整场景。作者与非作者证据分开。本轮只冻结产品方向与工程入口，尚无新schema、Recent或chooser生产实现，不关闭Release门。

## 20:18位置裁决

用户追加两张参考并明确“composer左下角，附件与选择workspace解耦”。采用两个独立入口：附件只管理本次带入的材料；workspace选择只设置新Chat的组织归属。未选显示“选择工作区”，保持可发送并归Recent；选中显示真实工作区名称。模型/effort、context和Send/Stop沿现有右侧顺序，不挪用附件菜单承载workspace、不把选择工作区解释为文件权限。窄屏允许工作区标签截断但保留可访问全名；不靠图标颜色区分授权。弹层沿现有anchorPopover，打开/关闭不丢draft，Escape返回各自触发器。参考中的Local/main、插件、Goal等不是本片能力输入，不能照搬成可用状态。此为DWB-05布局裁决，生产接线仍须先有BE-23身份合同。

Attention独立页只保留附件，不提供workspace选择；它本身不限定单一工作区。这个页面布局不扩张Attention实际工具授权，具体动作仍按原scope/policy。普通Chat的可选组织归属不反向套用到Attention。
