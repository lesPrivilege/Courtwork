# V7 UI 编排契约与 SE 回溯

2026-09-06，Astra。当前已按 source-selection.md 冻结本轮局部施工，最终行为验收另见结果；不是用户最终技术采纳，也不修改 Paper。

## 问题与责任

人需要能继续一项工作、看清对象与变化、输入问题或作出决定。通用会话负责交互，SE Matter 才持有正式工作连续性；一个面板是否打开、一次请求是否返回、一次 Run 是否 completed，都不能替代正式成果成立。

依据 Canonical §3–6 与 Practice §3、§5：宿主命名与 UI channel 只在适配边界；Human Work Surface 是正式状态的投影；模型提出候选，typed decision 经 authority/validation 后才能改变正式状态。此契约只解释当前前端责任，不发明额外 SE 对象。

| 输入/局部状态 | Owner与前端责任 | 必须防止的反例 |
|---|---|---|
| 项目/会话选择、查询词 | 通用UI；从真实列表校验ID，异步读取带导航身份 | A读响应覆盖已选B；本地储存里有ID便视为真实 |
| 消息、工具结果、Run状态 | 通用Host提供原始历史与执行投影；UI按稳定身份呈现 | Cancel按钮按下就标cancelled；completed视为Artifact获批 |
| 草稿文本与保存确认 | 通用聊天草稿由host持久；UI可保留更新的未确认编辑 | 较旧保存回执清除较新dirty；失败切回后丢失重试义务 |
| 命令等待 | UI按目标session/run和本次操作身份持有短寿命pending | 重绘重启Send；迟到A结果清B输入；把pending当成功事件 |
| SE对象、Evidence、Candidate、正式成果 | 扩展唯一后端提供正式投影；通用UI不解读备忘录业务字段 | 从tool text、tab位置或模型措辞推出正式接受 |
| Preview打开/关闭/阅读布局 | UI视图状态；同身份同投影不重挂renderer；跨身份隔离 | 关闭销毁正式状态；放大视图重启Run或重新授予authority |
| 对象可用性、读取错误 | 当前请求与目标身份绑定；缺失/错误保留可理解的身份与下一步 | 将未加载显示成无内容；失败留下无提示的旧投影冒充最新 |
| 人的决定 | renderer收集typed action，Host绑定人类身份，Core验证并提交 | GUI提交乐观晋升Candidate；通用ask-user冒充专业Review |

## 本轮裁定方法

已有V6、Courtwork和DSH都是可替换实现材料；Claude仅提供可观察行为。采纳必须写清解决何种问题、事实Owner是否变化、哪些现有机制可复用、是否真需要新依赖，以及本项目可失败的反例。各来源的PASS不迁移成本项目PASS。

研究依赖先完成，再开相应实现；非作者检查绑定实际源码。前端可只改通用web并保留既有API/renderer ABI；若发现无法靠已有协议确认的状态，诚实记录待验接口，不以本地状态伪造新权威。

## 分轮边界

本轮允许UI状态与生命周期的必要局部实现。真实浏览器宿主、多对象描述协议、SE内部Review/experts、持久Run恢复、真实provider与Harness Core重构分别编单。视图扩展不自动扩大这些范围。单一合成场景不构成Paper/G1/G2认证。
