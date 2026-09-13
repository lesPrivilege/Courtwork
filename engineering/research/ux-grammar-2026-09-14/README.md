# UX 文案实践参考 · 消费与裁决

2026-09-14 · 用户要求在release前优先登记消费，建立长期维护规范，并在README分别暴露架构与UX开工入口。本片纳入正在进行的发布准备；不改变其他作者的Models/Runtime施工所有权。

## 输入

完整读取任务《UX文案实践参考》`6aa6ce70-31b4-83ec-8dd3-623d0652e8bf`：2轮、4条消息，`hasMore=false`，无附件。原始返回保留在[conversation.json](conversation.json)；对话中的搜索量、引文和选型均为待核对参考，不作为本次研究的已证结果。Luna负责有界来源核查与既有规范映射，Astra负责以下裁决。

## Astra裁决

1. 采用“按任务语义选择交互，再选择视觉”的顺序。现有Core/Host对象与状态合同、Atlas、文案及编排规范继续各自负责事实；新增[UX Grammar](../../design/ux-grammar.md)只组织开工路径并补跨面维护规则，不复制另一份组件库或服务状态机。
2. 第一轮文本减法进入UX-01/02与[文案体例](../../design/copy-convention.md)：常驻文字需承重，重复解释删去或按需披露；必要对象名、状态、来源、权限与后果保留。拒绝“少字等于全部图标化”以及将错误/权限藏在tooltip。
3. 第二轮动作、控件、反馈、恢复、密度与Agent扩展进入UX-03…08。动作方言回写原文案规范；Save/Apply保存时点按实际合同，Delete不天然等于不可恢复，现有Add provider等具名入口不因通用建议被批量改名。
4. 外部等待时长是参考，不增设queued/background运行态或自动后台执行；进度、Undo、重试和撤销须有真实owner支持。机器采纳、工具成功与正式Review接受继续分开。
5. 规则生命周期沿本仓`proposed/adopted/superseded`，与实现先例的canonical/reference及产品接受状态分开。模板补规则ID、常驻文本用途、披露层、反馈/恢复与草稿身份。规则例外和迁移回原工单记录，不为每个页面建立独立体例。
6. README生成源新增“开发入口”，并分别链接架构和UX；AGENTS、engineering/design索引及frontend-contract前置暴露入口。研究链接供溯源，开工不要求反复读完整对话。

## 实施与验证范围

最近已实现先例：`app/web/settings-view.mjs`的PropertyRow与偏好治理，`app/web/runtime-intake.mjs`的显式编辑/预览/保存，以及`app/web/runtime-view.mjs`的Host事实与CAS失败恢复。登记基线`5466c8c83ae22ef7d12413b50dd7e711ddbc32c7`；本次规范不宣称正在修复的retry行为已经接受。

本片是规范、索引与README生成源变更，无产品DOM/CSS或服务schema变更。文档链接、README同步与Pages构建按最终检查留证；没有全站字符串自动lint，也没有因文档登记而关闭原生200%/读屏或Release产品门。最终合流与发布身份见[发布准备](../../release/final-preparation-2026-09-13/README.md)。


## 核源回执与后续输入

[Luna核源与映射](explore.md)、[八项一手来源](sources.json)和[输入回执](receipt.json)已完成。Astra复核后保留上述裁决：外部动作词存在方言差异，反馈采用情境默认，既有owner合同优先。文档链接与README生成检查在完整文件集上复核；本片不扩为产品行为接受。

同一外部会话后来增加仓库治理一轮，完整3轮快照另存[repository follow-up](conversation-repository-followup.json)，原2轮快照不覆盖。用户明确要求先完成当前开放实现任务，再将此轮作为仓库整理收尾优先消费；该轮的Explore、audit与Astra裁决将在收尾记录中单独列出，不混进上面的八项UX来源核查。


## 仓库与验证接续 · Astra裁决

同会话再次扩展后，完整5轮/10消息返回另存[verification follow-up](conversation-verification-followup.json)；[增量回执](followup-receipt.json)登记3轮及5轮快照的消息ID、hash与边界，原2轮/3轮输入保留不覆盖。新增轮次分别讨论发布前仓库治理、AI端到端测试选型与模型额度分配；它们不改变当前产品实现归属。

仓库整理采用现有[目录归属](../../../docs/repository-layout.md)：原始输入、探索、裁决、设计参考与验证证据各归原主题包和owner。下一轮按current最近相关入口读工单，再定向读原文；原始会话不成为默认指令。发布与研究索引新增当前批次链接，current将在主线合流时追加简短状态入口，不改写其他writer的在途内容，不批量搬迁历史文件。Luna的[仓库审计](../../release/final-preparation-2026-09-13/repository-audit.md)提供发现与取舍，Astra只采用这组最小收尾。

验证采用[验证选择](../../verification.md)：先用户结果与不变量，再选最低成本但足够真实的接缝检查；新增E2E说明为何局部测试不足。确定性GUI检查、真实harness能力验证、探索式浏览器和故障恢复各自承担不同问题；已能稳定复现的bug下沉契约/集成测试。最终组合只在产品变化或具体失败需要时重跑；截图留给几何、层级与实际视觉判断，真实模型调用沿既有授权。

[Luna核源](verification-explore.md)将Viking文章限定为单项目实践，不接受100%核心旅程E2E、local-only或固定token节省比例作为普遍要求。Google/Fowler的分层测试、Playwright语义定位及Anthropic的环境结果评估只消费其适用原则；不引入新Playwright runner、XState或新的Runtime状态，不用脚本数量替代架构/产品裁决。本文和测试策略均不关闭真实人审、付费provider或Release G1–G5的未完成证据。

同日用户另指定合流前最后一笔前端注意力审计，并建议直接派 Luna、将 Astra 额度留给真实视觉 computer use；见 [独立输入登记与审计范围](../frontend-attention-audit-2026-09-14/README.md)。其中用户提供的外部引文和减字比例未核验，审计清单与实际浏览器证据分开保存。
