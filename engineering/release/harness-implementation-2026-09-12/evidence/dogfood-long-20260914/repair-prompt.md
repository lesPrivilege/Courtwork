外部核查已读取你实际写出的四个文件，并按sha256固定版本。实现SHA256为32c11281d8c53e8f6b670a41c921415cbc26d83270d942e72ff4ec303256040d。Node v25.9.0实际执行 scheduler.test.mjs：54项，44通过，10失败，退出码1。以下是实际失败，不是新的需求。

请在当前Chat修复两个根因，保留原接口与测试，不删除或放宽正确断言：

1. validateGraph([{id:'a',deps:['missing']}])
实际：抛 TypeError: undefined is not iterable (cannot read property Symbol(Symbol.iterator))。
期望：返回 {valid:false, errors:[包含未知依赖信息的字符串]}，不抛错。
线索：收集未知依赖错误后，Tarjan仍遍历不存在的节点，successors.get(next)为undefined。请保证无效引用不会进入不成立的深层算法；同时保留合法图环检测。它也影响精确ID和INVALID_GRAPH错误码测试。

2. getBlockedTasks([{id:'a',deps:[]},{id:'b',deps:['a']},{id:'c',deps:['b']}],{a:'failed'})
实际：['b']。
期望：['b','c']。
线索：当前逆拓扑遍历时读取依赖的blocked值，但该依赖尚未计算。请修正传播方向，验证failed/blocked祖先、多层、菱形、输入顺序颠倒及穿过succeeded/running中间节点的传递；只输出自身pending节点，按原输入顺序。

请同步更正README/handoff中传播方向及复杂度描述，补最小回归或复用已有正确断言。通过工具修改并读回，交付新版本清单和根因说明。仍无exec工具时诚实标“修复后测试未执行”；上一版的44/54属于外部执行结果，不能算新版本通过。外部核查者将再次执行测试。
