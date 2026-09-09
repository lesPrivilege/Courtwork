# 上游实现核验与原讨论校正

固定 `browser-use/browser-use-pi@e0df2743e680125a4378d4d578420917620711f2`；以下为源码/文档观察，未运行上游。路径均相对该固定SHA；URL见[source-index](source-index.md)。Astra负责SDK/事件/文件/依赖复读，Luna负责政策/恢复及本地owner交叉核查。

## 可解耦，但未形成两个独立包

`package.json` exports仅根入口，Pi agent-core/ai/coding-agent都固定0.85.1。`src/browser.ts:27–44`公开Browser选项与factory；`src/index.ts:94–174`选择模型、workspace、browser、runtime及恢复history；`src/agent.ts:196`构造另一个Agent。Browser/Agent在概念上不同，但没有据此证明物理包可零成本拆分。新增BrowserUse不是复用Courtwork当前AgentSession的同一次run，而是另一个loop及其私有状态。

`src/index.ts:100–114`有特定模型路由兼容分支，进一步说明相同Pi版本并不推出任意model/API请求无变化。应以AM-C最终出站观测核对，而不是按依赖名判断兼容。`streamFn/models`接缝可作为后续测试和网关候选，本轮没有验证其全覆盖。

## 多种状态不能互相替代

`src/index.ts:207–218`每次run生成新runId，普通run清messages但沿用browser/JS/files；followUp保留对话。`src/index.ts:94–96,165–177`恢复history后明确提示heap/连接已重置。`docs/sessions.md:23–30`分列profile、workspace、history生命周期；并发session不意味着同profile可并发或跨Run持久任务已交付。

`src/types.ts:97–107`仅completed有output，非完成结果可有partial。`src/runtime.ts:48–53,87–89`使用独立的内部run generation筛选partial，不应把该内部标识与SDK外层runId或Courtwork Run id混为一列。`docs/api.md:85–93`与worker/runtime的publication机制只保证已发布partial在SDK parent存活时可保留；partial不受最终schema校验。路径文件可以随后改变，不能自动当Core immutable bytes或正式Candidate。

## 事件、历史、文件

`src/events.ts:16–60`有256条/8,000,000 JS字符的live队列界限，overflow结束该consumer并抛错；不是无限可追补的持久订阅。`src/index.ts:239–262`先emit，再写journal，跳过message_update/agent_end；大data会被替换，大event只保留带truncated标记的身份头。大小阈值用JS string length，不能表述成UTF-8字节上限。

`src/index.ts:325–352`保存history/最终journal失败可成为warning，结果仍可返回。`src/history.ts:46–65`history temp文件sync后rename，但不能由此推出所有journal/checkpoint/目录同步或机器掉电耐久性相同。live事件早于持久写，不能以观察到event当已durable ACK。

`src/history.ts:127–156`的files inventory是普通文件路径、size、mtime，排除symlink及若干内部目录；没有内容digest或可信执行记录。下载路径也可能在远端浏览器主机。Courtwork导入必须走原owner的完整字节与来源归属合同；不靠inventory变成ES录制成果。

## 明确收窄原答复

`docs/api.md:64`说明hooks是应用控制，任意JS仍可直接CDP。`docs/sessions.md:78–84`说明domain规则仅导航，Node、fetch、subresources、另建CDP越出该边界，脱敏也不包含所有像素/转换秘密/直接文件。`docs/browser.md:42–46`说明child worker是可杀死执行单元而非sandbox，CDP超时不证明页面异步工作停止。`src/runtime.ts:79–84`虽清空worker环境并限定V8 heap，却明确不构成OS sandbox；provider key留在SDK parent也不等于任意宿主文件不可读。因此“购买/上传都可在hook层完成治理”没有足够依据。

`src/types.ts:65–66`及`docs/api.md:84`定义cost为turn间检查的soft cap，不保证硬预算。`src/browser.ts:103–123`避免重试Cloud provisioning并单独处理stop，表明ACK不确定和清理失败不能省略。`src/telemetry.ts:8–17,35–42`默认会外发计数，首次集成应显式关闭，不能仅因任务内容不在payload就当无外发。

结论：可以借用行为和局部机制，但先完成合同/隔离反例；不将上游成功status、hook、partial、JSONL、路径或SDK worker误当Courtwork authority、权限强制或持久接受。详细待验证反例在[PR计划](pr-plan.md)。

## Luna 政策/恢复专项补充

以下仍为固定源码及测试源码观察，未执行测试：

- `src/agent.ts:266–272`的hook只覆盖模型工具调用；`src/index.ts:431–452`公开`execute()`直接到runtime，`src/server.ts:194–196`暴露该入口，暂停时手动execute也走此路径。即便beforeToolCall全拒绝，host调用execute中的fetch仍不经过该hook；worker在`src/worker.ts:113–130`提供fetch。这是“只接hooks就完成治理”的首个具体静态反例。
- `src/policy.ts:58–161`限制Document拦截和Page.navigate/Target.createTarget，不能据此限制页面XHR/fetch、Node fetch、所有CDP或独立连接。`test/policy.test.mjs:30–74`的文档请求测试不是完整网络隔离测试。
- `src/history.ts:22–43`替换文本原始secret且保留图片bytes；`test/policy.test.mjs:170–201`反映该范围。编码/变换及像素/录屏/任意文件应另受披露策略，不把redact当防外泄机制。
- `src/runtime.ts:139–150,183–239`取消/超时会重置worker，不能回滚浏览器动作；`test/evaluation-deadline.test.mjs:47–64`及`test/runtime.test.mjs:326–345`的测试源码专门检查deadline后页面异步工作和reset后浏览器mutation保留。本轮没有复跑这些上游测试。
- `src/worker.ts:160–186`checkpoint先write/rename再IPC、没有file.sync。rename后IPC前可出现文件已有而parent partial未更新；不能套用history的sync保证。parent崩溃与worker崩溃分别测。
- `src/browser.ts:179–246`及`docs/sessions.md:61`要求crash后核对SDK/Chrome退出再处理profile lock；不能自动删锁并复用仍在运行的profile。
- Python wrapper本轮不采用：`python/browser_use_next/__init__.py:275–295`的同步工具在`asyncio.to_thread`运行，取消等待不撤销线程外部效果。未来若采用，应单列transport/cancel兼容测试，不能从TS worker可杀死推断Python同步工具也可回滚。
