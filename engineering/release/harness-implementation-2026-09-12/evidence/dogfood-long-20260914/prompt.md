请完成一个可交接的、零依赖 JavaScript 任务依赖图调度库。这是一个完整 coding 任务：自行规划、实现、编写测试、检查边界并整理交付，不需要每写一个文件就询问。

范围：仅使用当前 Chat 获准的 workspace 工具，在 out/ 写产物。不要访问个人文件、凭据、外网或安装依赖。无需修改 CourtWork 本身。

交付 out/scheduler.mjs，导出以下同步纯函数：

- validateGraph(tasks) → {valid:boolean, errors:string[]}。tasks 为 {id:string, deps:string[]} 数组；空图合法。非数组、字段类型错误、空白ID、重复ID、重复依赖、未知依赖、自依赖或环均不合法，返回可定位问题的错误信息。非空ID按原字符串精确匹配，不静默trim或合并。
- topologicalOrder(tasks) → ID数组。无效图抛错。使用稳定Kahn顺序：每次从当前所有可选节点中取原输入索引最小者，而不是按字母排序或仅按初始队列排序。
- getReadyTasks(tasks, states) → ID数组。自身pending且所有直接依赖均succeeded的任务才ready，按原输入顺序返回。
- getBlockedTasks(tasks, states) → ID数组。自身pending且任一祖先状态为failed或blocked的任务，按原输入顺序返回；支持多层传播。不要把running、succeeded或failed的任务重新列为blocked。

states为以任务ID为键的普通对象，合法值pending/running/succeeded/failed/blocked；遗漏任务视为pending。状态含未知ID或非法值、states非对象（包括null/数组），或图无效时，两种状态查询函数必须抛错。对已知任务的状态组合不额外猜测或纠正。全部函数不得修改输入。注意特殊字符串ID、断开的子图、菱形依赖和多层失败传播。

同时交付：
1. out/scheduler.test.mjs：使用Node内置node:test和assert，覆盖正常流程、上述输入反例、稳定排序、状态边界与输入不变性。
2. out/README.md：接口、示例、设计取舍、复杂度与运行命令。
3. out/handoff.md：已完成内容、关键决策、已执行/未执行的验证、剩余风险，以及下一位接手者如何继续。

请通过工具实际写出文件，并在收尾前读回关键产物进行一致性检查。如果当前没有执行命令/测试的工具，明确写“测试已编写，未执行”，不要把推理检查描述成测试通过；外部核查者会运行独立测试并把失败反馈给你。如果确有获准测试执行工具，保留实际调用、退出码和输出依据。

最后给出产物清单、简短设计说明和诚实的验证状态。不要只给代码块或计划，不要声称人的正式验收已完成。
