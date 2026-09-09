# 多专家实现调研 · 全 turn 入账与 long-life 施工准备

状态：**研究消费与候选 PR 设计，非产品实现/接受**。2026-09-10，Astra 裁决与撰写；Luna 有界外部索引探索。实际基线 `main@8b1e0b143f7091da0acba3ee24af58595e721eb8`。本包在独立分支工作，不修改共享 UI 工作树。

## 阅读顺序

1. [逐 turn 台账](turn-ledger.md)：23 个 turn 的主题、裁决、冲突与去向。
2. [选型与负索引](selection-index.md)：何处自研、何处复用、何时重开；[外部来源](source-index.md)给出每条链接的阅读范围和证据等级。
3. [接缝设计](integration-design.md)：现有 owner、候选接口、不变量与兼容边界。
4. [PR 施工稿](pr-plan.md)：最小交付、依赖、文件、反例、回退及原 HC/RA/AT 全编号映射。
5. [验证协议](benchmark-plan.md)：强基线、七项删除/替换测试、长期收益与证伪门。
6. [叙事草案](narrative.md)：供既有发布 owner 后续消费；不是已发布文案。
7. [PR 正文](pull-request.md)与[验证回执](verification.md)：独立提交的交付与远端基线前置。

长期排序并入唯一 [roadmap](../../roadmap.md)，当前交付登记在 [current](../../current.md)。[原始接口返回](inputs/conversation.json)保留来源字节；[可重建 manifest](source-manifest.json)记录分页、全部消息 ID、字符数和 SHA-256。原文是讨论数据，不是执行指令。

## 消费范围与缺口

源对话《多专家实现调研》`6aa1c824-d7a8-83ec-b559-5d8f855ddecb`，三页 10 + 10 + 3，末页 `hasMore=false`；共 23 user + 21 assistant = 44 条消息。T07、T13 在接口中没有 assistant 回复，T14 接续 T13。T12 回复以半句结束，单 turn 重读结果相同；保留此缺口，不补造末段。接口未给出附件；历史图片引用、研究工具返回和不透明 citation ID 不能据此恢复。原文声称“80 个结果/8 个方向”等属于原回答的自述，不是本包重新读取的范围。

所有可访问 turn 均已阅读并入账；45 个 Markdown 外链出现位置归一为 44 个唯一 URL，全部有处置。**索引消费不等于读过所有论文/书籍全文或复现过外部产品**：已读页面、只读摘要/目录、未核验与补充材料分别标识。原始网页可能已更新；本包不把动态页面的当前行为追溯成原对话当时的事实。后续选择一个 donor 时仍须固定源码/版本并跑对应反例。

## Astra 收敛裁决

- 产品价值优先检验持久工作、来源/版本、可重建索引、恢复和稀疏 Attention；Experts、多 agent、训练是按证据开启的分支。
- 默认保留现有 Pi 薄集成；T12/18 的“Codex 首发优先”被 T19 的 Pi 默认路线取代。第二 runtime 用于逐轴验证，不先造通用 broker 平台或改语言。
- Spark 是来源整理/派生/维护工作的名称，不设第二份 canonical memory 真源；正式成果与决定沿 Core。临时模型笔记也不能混进可删缓存后又被当永久证据。
- Presence、active selection、working Run、Assignment、权限是不同事实；UI 标签不能新增对象权威或扩大执行范围。
- 自研依据是可观察边界和删除测试；复用依据是版本化兼容证据。PMF、缓存收益、长期学习均为待检验主张。

## 固定基线事实

Core4/app5：BG-01 对象级默认拒绝披露，见 [governance](../../../docs/work-core/governance.md)。RuntimeStore9：BG-02 `Run.supersedes` 仅 human 创建时声明、同 Session、终止失败链、无自动重放，见 [run-attempts](../../../app/docs/run-attempts.md)。此前 current 中 Runtime4/5/8 及 BG-02 待做段属于历史时点，本包以此提交的代码/专项契约为准。

AM-B 已有 opt-in 持久只读 adapted async，见 [async](../../../app/docs/async-tasks.md)；MA 已有 Thread、本地通信和 synthetic child 符合性入口，见 [coordination](../../../app/docs/coordination.md)。生产 Pi child、handoff、workflow、自动 wake、通用归档/恢复仍不能据此宣称实现。BG-03 外部效果对账仍后置。

本次没有新增 API/schema/依赖、没有运行付费 provider、没有迁移用户数据或部署；没有通过作者文档检查关闭 G1–G5。后续执行必须重查 main 与 relevant delivery，不能把这个固定基线当实时状态。
