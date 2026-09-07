# Design 裁决记录

本文件只记录视觉、信息结构和交互选择；工程范围见 [DEC-004](../decisions.md)，技术选择见工程 decisions。当前没有已经选中的视觉方向。

## DS-001 · 陌生化的作用范围

- 日期 / 状态：2026-09-05 / proposed。
- 输入：用户重视成熟 Agent GUI，并希望探索陌生化设计语言。
- 作者建议：新颖性放在对象组织、阅读节奏、证据关系和视觉层级；保持输入、停止、返回、焦点与正式状态含义稳定。
- 替代：直接复刻 Linear/Apple 外观；只在标准聊天页换皮；完全自创操作隐喻。
- 取舍：前两者不足以形成独立语言，后者需要证明不增加学习与误操作。依据见 [原则](principles.md)。
- 采纳者：用户；待原型证据与明确裁决。

## DS-002 · 视觉与信息组织方向

- 日期 / 状态：2026-09-05 / proposed。
- 候选：[A 校勘工作台、B 操作台、C 空间工作室](directions.md)。
- 作者推荐：先比较 A 的成果阅读与 B 的操作效率；C 保留独立方案。没有将任何候选标为胜出。
- 验证：同内容四状态、六路径；静态视觉选择后再以交互行为复核。若接受后发现关键操作被隐藏，重开而非为选定风格辩护。
- 未完成：视觉稿、实际上游 UI 取证、用户试用、组件和 token 选择。

## DS-003 · 成熟度以状态路径判定

- 日期 / 状态：2026-09-05 / proposed。
- 建议：以 [完成面](completion-surface.md) 和 [D0–D5](prototype-plan.md) 组织施工。P0 实际适用状态先闭合，再扩 P1/P2。
- 取舍：增加失败和恢复原型工作，但减少只设计默认页造成的后期返工；不强制复制竞品全部功能。
- 验证：六条路径中出现误提交、无法停止、丢草稿或错误无出口即退回；视觉质量不抵扣。

## DS-004 · 历史参考不替代当前设计语境

- 日期 / 状态：2026-09-05 / accepted（消费边界）；具体巧思仍 proposed。
- 依据：用户明确要求 Motto TUI、Deswrit kit、Courtwork Design 按需消费、不盲从，只选克制有用、符合治理工程的陌生化；网页端讨论是输入材料。
- 决定：从当前任务建立 brief，旧材料仅贡献有来源的局部机制。图标库、外部 DESIGN.md 工具、视觉方向和原项目规则不自动继承。
- 采纳者：用户对消费范围的明确指令；局部筛选与修正建议：当前 Agent。
- 证据与待验证：[参考裁取](reference-consumption.md)。保留任务有/无对照，未生成视觉稿或运行界面。
- 重开：若机制只提高装饰性、增加学习负担或遮蔽状态后果，则不采用；将来采纳某项需要单独记录。

## DS-005 · 通用壳信息架构与交互契约（V8）

- 日期 / 状态：2026-09-06 / proposed（作者建议；用户裁决待定）。
- 问题：九步审计发现首页/开始流程、composer 焦点与反馈身份、会话辨识、日常设置与窄屏附加 tab 遮挡五类缺口；独立 Claude 设计按 handoff v8 给出统一契约。
- 建议：在 DEC-007 三区骨架内，会话视图为主层、附加 tab 默认关闭并按意图打开；开始流程是一个意图串联项目与会话创建；异步操作拆为结果登记、导航准入、焦点交接三段，各自按流程身份与导航/焦点意图代次判定，迟到成功不改落点也不抢焦点；反馈按 session+操作身份投影；会话行加 current 语义与创建时间副行；设置分偏好/运行/开发者三节并声明配置 owner；窄屏单层可见可聚焦。见 [work-surface.md（历史路径：`../mvp/execution/frontend-design-v8/work-surface.md`）](../migration/2026-09-08/evidence-index.md) WS-01–WS-12。
- 来源类型：自有提案 + 既有审计证据 + Chat explore 合并裁定（[explore-merge.md（历史路径：`../mvp/execution/frontend-design-v8/explore-merge.md`）](../migration/2026-09-08/evidence-index.md)）；未运行界面。
- 取舍：不显性化 Matter、不画权限卡、不做乐观发送、不引入组件库；改名/归档/设置版本化等待 Host 接口（I1–I4）。
- 验证：[acceptance.md（历史路径：`../mvp/execution/frontend-design-v8/acceptance.md`）](../migration/2026-09-08/evidence-index.md) A–E 组，全部 not_run；视觉方向 A/B/C 仍未选，本决定不绑定。
- 复核：Codex 架构复核（[architecture-review.md（历史路径：`../mvp/execution/frontend-design-v8/architecture-review.md`）](../migration/2026-09-08/evidence-index.md)）指出五处须修正；已按其修订为 r1（WS-02/03/06/08/09/11/12 与验收表），状态仍 proposed。r2 并入 Courtwork 只读 diff 的四项机制（[courtwork-diff.md（历史路径：`../mvp/execution/frontend-design-v8/courtwork-diff.md`）](../migration/2026-09-08/evidence-index.md)）；r3 按[第二轮复核（历史路径：`../mvp/execution/frontend-design-v8/architecture-review-r2.md`）](../migration/2026-09-08/evidence-index.md)修正创建守卫与取消契约，并提出先 G2 后 G1 串行的冻结范围，五项分歧建议维持当前范围。
- 重开：用户改变栏数或落点规则；Chat explore 未收材料带入后差异比较；Core 专轮改变 session/run 语义。

## DS-006 · 会话主区与独立 Tab 工作区

- 日期 / 状态：2026-09-06 / accepted（用户确认产品组织方向；技术接缝与实现仍需施工验证）。
- 用户指令：设计类似 Codex 与 Chrome tab，完全解耦，便于构建；同时提供六张界面截图。
- 决定：会话主区独立成立；附加内容采用统一 tab 壳承载，文档、工作面、subagent、context、browser 等内容模块分别实现。壳负责页签与布局，模块负责自身内容与对象动作；只通过显式对象引用和服务契约协作。
- 证据与解释：[用户方向与模块责任（历史路径：`../mvp/execution/frontier-visual-reference/user-direction.md`）](../migration/2026-09-08/evidence-index.md)、[六张用户截图 manifest（历史路径：`../mvp/execution/frontier-visual-reference/user-input-manifest.json`）](../migration/2026-09-08/evidence-index.md)。Codex 截图由用户提供，不计作 Agent 实操；图内聊天文字不作为授权。
- 消费边界：[Claude 实操观察（历史路径：`../mvp/execution/frontier-visual-reference/observations.md`）](../migration/2026-09-08/evidence-index.md)仅贡献局部颗粒度，不决定 SE 整体布局或输入区配置能力。Tab 壳机制与内容所需 Core 接口分别立项，避免将全部多 tab UI 视为 Core 前置依赖。
- 施工传播：G2 冻结内容不变；G1 沿既有单槽实现壳与内容接缝，仍待 G2 独验通过。此方向不自动开启所有 tab、框架迁移或 Core 改写；DS-005 其他未裁决项不因此整体转为 accepted。
- 待验证：内容模块能独立显示/测试；切换 tab 不丢草稿；关闭 tab 不取消 Run；模块失败不阻塞会话主链；窄屏与焦点规则成立。源码未改，这些均未由本次截图验证。

## 后续单项格式

```text
局部问题 / UI-ID / 原型阶段
候选与来源类型（官方规范 / 社区 skill / 产品观察 / 自有提案）
目标用户任务、关键状态与硬失败
视觉/行为证据、版本、参与者与局限
作者建议 / 复核意见 / 用户裁决分别记录
选择后果、需改工程接口、降级路径
重开触发、被替代决定、后续义务
```
