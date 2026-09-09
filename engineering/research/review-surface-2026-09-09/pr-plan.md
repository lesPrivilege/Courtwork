# 可消费的自研 PR 边界

以下ID只在本研究包内定位建议；不是新产品票号或已开工声明。实现前按main实际HEAD重核合同与在途交付，将条目并入既有owner任务。Astra负责架构/迁移/集成；Luna可承担边界明确的实现或另一作者的独验，作者不自称独立接受。

## 当前已有依据

| 接缝 | 当前main事实 | 尚需确认/实现 |
|---|---|---|
| [Core合同](../../../docs/work-core/contract.md)、[投影owner](../../../app/core/owner.mjs) | candidate不可变；base/source/contract版本；humanActions与服务端重验；历史candidate成员来源读取；accepted artifact有digest和basis | 深链接/UI显示是否完整消费这些字段，不能新建第二份审阅状态 |
| [NDA领域](../../../app/domains/inbound-nda/index.mjs)、[规则](../../../app/domains/inbound-nda/rules.mjs) | 来源id/version/digest、Unicode code point半开范围与quote精确校验；missing/conflict/unknown有明确处理 | 通用文档locator、跨轮finding身份/生命周期未由这些函数自动提供 |
| [NDA renderer](../../../app/extensions/inbound-nda/renderer.mjs) | 领域review与版本化candidate修订已接入 | 分组、比较和局部对话需要在既有renderer协议中有界扩展 |
| [Attention准备包](../attention-2026-09-09/README.md)、[Chat Space映射](../chat-space-2026-09-09/courtwork-mapping.md) | 已有队列、状态owner和输入/授权/成果的区分 | 不从研究界面图推导新API已可用 |

## PR-RS-A：历史来源定位与版本提示

问题：用户从历史candidate进入来源后，需要辨认正在看的版本与当前可执行动作。先在既有Review/Inspector路线显示candidate、source版本、basis原因并提供确切来源跳转，沿当前Core查询和humanActions，不修改接受条件。

Ownership：既有前端writer负责导航/呈现；若发现缺失只读字段，交Core/ES owner补最小合同。定位参数绑定Matter/Session、candidate与source身份、版本和已定义的范围单位；服务端继续校验成员和读取权限。不能将ID当任意文件路径或把latest链接包装成固定证据链接。

验收反例：来源升级后旧字节仍可读；历史accepted仍显示其历史事实；旧candidate没有decide却可有合法revise；跨Matter/无权限定位拒绝；emoji与重复quote定位不漂移；深链在重开后仍指原版本，缺失时明确不可用。沿既有合成fixture做API负例与UI键盘/焦点验证。

## PR-RS-B：可验证的阅读分组与文本比较

问题：仅按文件/消息顺序难以阅读跨来源判断。先为一个合成NDA fixture提供Review分组、Sources原顺序与文本source fallback，分组只引用现有finding/rule/source；无需模型、数据库或通用PDF viewer。

Ownership：领域adapter提供解释字段，前端writer消费同一对象。分组缺失、低置信度或不可用时仍列出全部原始条目；摘要有来源链接，图仅在确有结构关系时引入。折叠与viewed是阅读偏好，不写Decision或清除Attention。source与rendered明确表示关系，沿Chat Space下载约定。

验收反例：跨两个来源的一个分组；未分组内容仍可访问；semantic生成失败仍能比较原文；旧/新版本不对齐不造diff；折叠后未处理风险可见；窄屏与键盘往返保持焦点。图片/PDF/DOCX及付费生成留作后续独立选型，不列为本PR完成条件。

## PR-RS-C：领域审阅比较与覆盖说明

问题：第二轮少了一条finding可能只是未执行该规则。先写领域合同与离线fixture，再决定是否需要持久化：比较键至少明确规则身份/版本、候选来源基线及对应关系；返回同一问题的证据与本轮规则覆盖。不能靠列表差集自动resolved。

Ownership：领域owner定义；若新增持久状态，由Astra设计迁移并交另一作者独验。第一步可仅比较已保存的两个领域结果，不发明Core finding表或改写历史candidate。当前状态词保持现有领域语义；“已解决”必须有新结果依据，规则变更/来源不可比/未执行分别说明。

验收反例：同规则新证据确认修复；规则版本改变；producer未运行；来源被移除；运行错误/取消；重复finding；旧accept保持不变。用独立合成数据验证比较不产生正式Decision，必要迁移遵守隔离数据与备份/回退合同。

## PR-RS-D：Attention摘要与局部对话范围

问题：风险排序不等于用户现在能采取行动；旧对象对话也可能在导航后造成版本误解。ATT后端接缝交付后，在已有入口呈现可处理、等待与建议的真实投影；Review局部对话显式显示所选对象/版本，发送前冻结范围。

Ownership：ATT维护Attention生命周期；消息/session owner维护对话，领域维护判断。UI共享控件但不复制状态。局部回答仅生成提案或建议，按既有策略执行已授权动作，不因对话入口增设人审门，也不把回答当工具许可/Core接受。

验收反例：高风险但正在等待外部条件；低风险可处理动作；旧快照对话遇新source；通知重复/抑制后对象仍存在；无可执行动作时不画可点按钮。使用隔离fixture，前端沿当前单writer排期；不以该PR插队或重新定义ATT合同。

## 本轮交付验证

仅文档准备：逐字稿hash/覆盖、上述本地代码与合同映射、相对链接、git diff检查。实际施工需在各PR记录作者、独验者、固定SHA、测试命令/结果与未验边界；本包不宣称已通过这些未来验收。
