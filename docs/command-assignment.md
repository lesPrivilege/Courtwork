# V7-01：普通命令、草稿与读取回执的身份边界

2026-09-06，Astra。状态：Astra已按 source-selection.md 冻结，允许Luna在指定web范围开工。反例报告见 command-review.md 与恢复目录 evidence/command-review；V6 app.mjs hash `ea234992379898d4a90347a184210ab6b1afd7f25ae2308a758131dab1c6a9b0`。

## 反例与修复目标

1. A发送已准入、HTTP回执晚到，切B后收到回执，再回A仍显示已提交文本；修复须结清A自己的已提交稿，而不动B。
2. A取消已在Host生效，B开启自己的Run，此时A取消回执晚到，会把A的cancelled Run塞入B；命令目标与当前展示身份必须分开。
3. 旧草稿PUT回执晚到时，较新编辑尚在debounce，会误清dirty并显示Draft saved。保存序号不能替代编辑修订。
4. 同会话Refresh旧detail在后来的Run/取消之后返回，会把新历史/终态清掉。仅用sessionId不能处理同身份的时序。
5. 普通发送的pending需在实际准入前就成立；不能依赖未来Run投影或DOM disabled。首阶段只测到已准入Run时Refresh维持禁用，不代表尚未准入时的重复提交防护。

## 不变量

- 一次用户发送从第一个await前即成为session目标上的pending命令；所有重绘/刷新/切走再切回均从同一pending事实决定Send/输入可用性。不会在pending时重复POST；失败结清本次pending后仍可按明确结果重试。
- 命令携带目标session、必要时run以及本次操作身份。异步成功/失败/清理只处理自己的操作，不写另一session的runs/events、输入或错误状态。不可用blanket clear清理后来的操作。
- 发送成功可以在后台清理目标session的已提交草稿；只在仍对应所发送的编辑版本时清理。若用户已有更新稿必须保留。当前页面可能A→B→A，响应不能把较新权威终态改回旧running；通过已有读接口重新核对或拒绝过期合并，具体最小实现由作者提出。
- 编辑修订在输入发生时就变化；旧save回执只能确认它实际保存的修订，不能清较新dirty。失败后本页切换/返回保稿且仍待保存，成功只确认同修订。尚未发送的debounce草稿立即关页不在持久恢复承诺内；应避免将未保存状态显示为saved。
- detail读取具有同身份内的请求/观察边界。旧读取不得覆盖之后已观察到的新事件或本页命令后果，也不得覆盖更新detail；不引入持久store、改API或把原始历史变SE正式状态。
- 取消只请求Host动作，Run终态仍来源Host；迟到取消不进入其它session。等待按钮pending可以存在但不伪造cancelled。
- 网络断连或不明确的5xx不得写“Run未启动”的确定结论。保留输入，提示未能确认、需核对历史；无自动重发。已明确的拒绝可显示拒绝。当前协议不具备跨断连/重启exactly-once，此义务见core-round-obligations H1。

## 范围与验收

仅拥有 `/private/tmp/se-agent-v7/app/web/**`；本单预计集中app.mjs，必要文案与README可改。不改server/runtime/extensions、package/lock、API或Paper，不移入deferred。允许依据具体不变量删除重复UI状态；禁止仅为复制DSH而加入通用状态库。

作者先做有界自检；独立Reviewer保留基线失败，修订不依赖失败条件的同步脚本，在最终source hash上实跑相同用户路径以及请求尚未准入时重复submit、发送失败保稿/重试、A→B→A、新稿保存成功后reload、旧detail乱序与非作者V6通用UI回归。源码字符串匹配不计行为测试。

独立反例中立即reload丢失尚未保存的新稿只说明未持久，不把它误称持久性契约失败；真正本单缺陷是较旧回执误报新稿已保存。所有报告按该边界修正，不抬高“恢复所有未提交内容”的承诺。
