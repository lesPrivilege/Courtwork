# P0 · Chat Copy短暂反馈与pending动作

2026-09-14，用户要求先处理，不等待Run聚合。基线main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`；隔离分支codex/chat-copy-feedback-20260914。Astra架构/接收，Luna有界实现，作者自检与非作者复核分列。

原责任：ui-controls复制按钮先例已使用1600ms；chat-actions持有动作与短暂状态、adapter持有真实结果；app持有pending footer呈现。最近先例copyAction/setAction、createChatActions及TinyDOM行为测试。当前Chat notice没有清理生命周期，成功文字永久占行；确认是局部漂移。

施工写权：ui-controls、chat-actions及必要共享小primitive，app/attention-agent-view两个消费者的pending footer和对应测试。统一成功反馈1.6s自动回idle；成功只按钮Copied状态，error保留inline status。新动作取消旧timer，epoch防过期回执/计时覆盖新busy/error，失效节点不再写。pending assistant不挂普通footer/actions；中间已结束segment是否属于final仍由后续Run聚合片解决，不扩大本片声明。

不改变adapter权限/调用/事件、消息字节、Core或Run终态。跨文件原因是两复制消费者共享同一反馈生命周期，app消费pending语义；无schema或后端变化。沿UX Grammar、frontend-contract及Model无关的Chat Flow先例，不新增外观体系。

验证：复制成功自动恢复、不生成成功文本行、重复copy重置、后续error/busy保留、迟到异步结果、detach不写、pending无chrome及现有action/相邻复制回归。采用定向行为与interaction lint；真实浏览器关键目验如工具恢复则执行，否则准确保留未验，不拿DOM测试冒充视觉接受。当前main已有文档writer，明确路径合流并保留其编辑。

## 实现与验证

已同步当前main工作树的五个明确路径（四个前端文件与chat-actions.test），未commit/push/部署，原文档编辑保留。Luna初稿，Astra修正/合流：ui-controls共用epoch/timer生命周期；Chat paint持有Copied状态以免finally即时覆盖；成功不留status并移除普通Chat复制toast；旧异步结果不写新notice。Chat/Attention均不挂pending footer。

Node v25.9.0组合执行chat-actions、chat-reading、assistant-stream-projection、settings-navigation、coordination-view五文件35/35；interaction lint及git diff --check通过。新增14项chat-actions整体测试中的计时/竞争覆盖使用fake clock和TinyDOM；footer门控是源码断言，不能冒充真实浏览器测试。隔离树首次相邻测试缺pi-ai依赖，主树已有依赖下组合通过；草稿语法/假时钟问题在最终通过前修正。无全量或真实provider重跑。

浏览器控制仍30秒超时，本轮视觉未验；8859保留供用户刷新后观察。非作者复核另记，不将Astra参与修改后的自检称独立接受。Run聚合、user时间右对齐仍属已登记后续片。
