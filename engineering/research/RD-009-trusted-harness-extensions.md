# RD-009 · 受信Harness扩展接入

2026-09-13，Astra裁决，Luna只读explore。输入是[Harness下一轮提案与本地处置](../release/review-intake-2026-09-13/round-24bd954/README.md)，源码审查基线24bd954。本文登记真实执行/呈现接缝缺口，不新增产品实现，不替换P/DF/G或全局总registry。

## 已有归属与第一消费者

Pi 0.85.1继续持有模型/工具loop与原生会话，Host service持有准入与Run，Runtime Control持有资源/配置/绑定；Work Core/专业扩展持有正式工作。`hook`是已登记的adapter-required资源类；`uiSlots`是声明，不是可执行renderer注册。第二runtime继续P03/P04/DRT-03，scoped memory仍是P07，clean context仍是P08，不能把这些旧编号改义为hooks工单。

第一增量优先[DF-04](../release/harness-implementation-2026-09-12/harness-dogfooding.md)：独立合成coding仓库的一个Host托管检查recipe，复用已交付的文件读搜写、记录版本与Files比较。主版本NDA消费者没有自行执行仓库测试的声明，因此DF-04当前为Developer消费者触发，不改成G1–G5普遍前置。

## DF-04可施工合同

- 模型只选recipe ID与获准输入，不提供任意command/argv/cwd/env；可信Host manifest固定recipe版本、Node可执行入口、执行位置、输入文件版本、环境策略、超时与输出限额。
- 工具只在指定coding支持组合广告。现有`TOOLS`默认exposed、未知工具ceiling默认allow，故实现时必须给新能力独立ask/deny上限并由Host守住；不因注册即向全局开放。复用`governTools`的精确输入批准及配置冻结。
- 以Run.id + toolCallId/callId识别执行，不复用Run.commandId。批准展示实际执行recipe、文件版本/cwd、环境和限额；变换后参数必须重新检查。
- `spawn`采用shell:false，最小显式环境，不继承provider密钥或任意NODE_OPTIONS/PYTHONPATH；允许的代码仍具有普通OS用户权限。无个人数据、无共享写目录的合成fixture减少暴露，不构成OS沙箱。支持不受信程序之前须补真正隔离合同。
- 持久结算需独立于Pi普通tool.result：当前Cancel先关admission，普通迟到tool.*会被丢弃。Host必须保存取消后partial stdout/stderr、退出/信号、duration、限额触发与unknown；确认进程及其进程组终止后才称cancelled。停止未确认、派发后回执丢失不得自动重试。
- UI复用现有permission preview、工具调用卡与Inspector。返回stdout/stderr、exitCode、duration、truncated、terminal state及准确Run/call/source引用；进程结束不等于检查通过，退出0也不等于Work正式接受。

初始写权候选：`app/runtime/test-runner.mjs`（新执行器）、`app/server/service.mjs`（组合/settle）、`app/runtime/control-plane.mjs`（descriptor/ceiling）。只有现有approval不能表达精确recipe时才改store/投影/前端合同；Astra先冻结DTO，避免因一个工具扩通用schema。

验收顺序：合成recipe成功/非零退出→deny零执行→精确批准→超时/超输出→运行中取消/进程组回收→回执失败/unknown与重启不重放→下一Run挂起/恢复与旧binding拒绝→真实模型发起一次检查→精确diff及人检查→重开接续。每条保留独立数据、实际退出码和source hash；DF-03外部oracle不得改称agent自运行。

## Hook与其他贡献的后续片

第一hook必须有明确准备/检查/通知消费者，按观察、拦截、变换分型。观察失败可记录继续；权限守门失败不默许；变换后执行参数重新审批。登记触发映射、顺序、超时、取消、重入/派生事件去重、清理watcher/timer/连接/在途资源；撤注册不撤已发生副作用。这个新缺口归本RD，不能借P07 scoped memory覆盖。

前端控制面在Settings/Runtime显示用途、来源/scope、触发与生效边界；正常触发静默，影响流程才浮现；Run Inspector保留历史版本/binding及结果。纯后端贡献也必须有可理解的默认检查入口，不强制专用永久侧栏。

图片解释、屏幕采集、浏览器操作、桌面操作分别授权/验收；有界subagent引用现有[RD-005](RD-005-multi-agent-selection.md)与coordination合同，不能从本轮开发Luna协作推导产品已支持。Slash/manual继续[RD-008](RD-008-command-compaction.md)。受信源码/构建时组合/重启生效是合格扩展形式，不把任意第三方安装、热替换或统一跨runtime ABI设为第一消费者门槛。

## 本地PR准备与停止条件

后续PR文稿可以分为DF-04 recipe、首个hook消费者和必要共享reader三片；这是待开工文稿，不是已创建GitHub PR。每片按原owner提交代码/负例/升级与退出说明，独立非作者审核，再更新current。若普通扩展仍需改主loop或复制正式状态，先定位共享合同缺口，不靠重复一套前端语法绕过。
