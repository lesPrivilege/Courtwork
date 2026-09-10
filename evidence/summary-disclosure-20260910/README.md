# R2-SD01 · 摘要目录与稳定阅读层级

最终产品 `acafe2c3b4fae1f73bbf68d0e00fc2e4f174a42c`，分支 `codex/summary-disclosure-r2`。从 `67ed0fd` 隔离实现；未合流、推送或部署。Runtime11/Core4/app5不变。

## 交付

生产入口已加载Run摘要模块与统一surface布局，server静态白名单完整。摘要在原surface-rail中替换旧Run卡，原host继续管理tab、文档、读请求与焦点；不存在生产fixture注入。桌面Session目录常驻，卡片内容自然增长并限制最大高度；窄屏保留按需sheet。Files清单先展开，完整Run/Session/文件版本信息在更深层。

文件×只关闭文档，panel-right隐藏整个工作面；宽屏Preview支持Expand/Restore而不重建文档tab。保留既有1680三栏、1024主区阅读分档；更紧凑目录按同一Run身份导航。完整路径保留在title/aria与Run information，列表行省略以控制高度。未新增域authority或Review接受。

|验收栏|本次事实|
|---|---|
|设计实现|摘要/Files/Run information/Preview/完全展开共用同一host；留白与动作语义按用户追加截图修订|
|FE视觉|Astra实际CUA：1440/1280明暗、1680三栏/完全展开、390sheet、720×500重排；精确截图版本见manifest|
|FE交互|键盘披露、同版本文件、Run往返、文件关闭/Escape焦点、紧凑↔卡片焦点、Home/Settings/切会话通过|
|生产接线|已实现；serve默认只提供合成数据并透传真实产品原字节|
|非作者复核|Luna固定版本有界静态/测试；无独立浏览器视觉接受。详细SHA及后续复核以independent-review-revised为准|
|部署/主线接受|未执行；本分支可供整合，须与在途PV/SD集成版本组合复核|

## 证据与限制

- [布局收敛图](delivered-summary-1440-light.png)、[布局Files图](delivered-files-1440-light.png)：`1ab7f44`。
- [Preview](final-preview-1680-light.png)、[完全展开](final-expanded-1680-light.png)、[窄屏](final-preview-390-dark.png)：`3226004`，后续Home恢复条件与披露控件CSS微调，截图不覆盖该增量。
- [结构化来源、步骤和图片哈希](manifest.json)、[CUA记录](cua-steps.json)、[非作者报告](independent-review-revised.md)。`product-*`、`balanced-*`与早期无前缀截图明确为被继续修订的候选，不能混作最终视觉接受。
- 最终针对38/38通过，见[原始日志](final-targeted-tests.txt)。初次全量656/657，唯一未改动Core bridge ready timeout；[原始全量](production-full-tests.txt)与[隔离Core13/13复验](core-lifecycle-recheck.txt)分列，不宣称一次657/657。四类lint与文档链接通过。
- 720×500仅等效重排，不是浏览器原生200%缩放；无native宿主、真实provider、个人数据、完整独立视觉验证。

早期fixture模型保留在`2111375`及本目录历史文件中；其Retry/错误/未知状态CUA只属早期候选。最终模块14项测试覆盖这些防护，最终host正常路径与目标切换另有实际CUA。长文件首次合成遇到文件系统临时后缀ENAMETOOLONG，调整为合法长名后实际写入/读取通过；不作为产品回归修复。

[工单、来源和范围演变](../../engineering/execution/2026-09-10-summary-disclosure/README.md)记录用户把fixture-only完成条件升级为稳定生产层级的授权。生产改动限UI与静态资源路由；provider/model/settings及共享styles.css保持。

## 材质与焦点增量审查

1. 卡片现状：发现原生披露行无圆角/内距，导致共享键盘焦点呈方框；[修正前](audit-01-before-focus.png)。
2. Home 对照：正常。Attention用实色渐变和内缘，Activity用较低的实色层；无backdrop blur。[同轮Home](audit-02-home.png)。
3. 披露修正：正常。复用radius-small、hover/pressed与8px内距，外层加入现有rim。计算样式焦点2px、offset2px、圆角4px；展开箭头与键盘焦点语义不同。[修正后](audit-03-rounded-focus.png)。
4. Preview返回：正常。Tab/Enter打开同文件，Escape返回run-summary-file:0；1195px视口无横向溢出。[返回焦点](audit-04-return-focus.png)。

玻璃grammar仍由jump-latest-button与context-popover消费；本卡片持续承载文件与信息，按合同使用solid/raised。没有新增依赖或玻璃名额。短Preview chrome具备未来材质探索资格，当前未新增该效果。末次增量14/14与颜色/交互/材质/形状lint、对比报告通过；误写单数lint-shape命令未找到脚本，改用仓库实际lint-shapes后通过。末次仅在默认1195×772浅色检查CSS增量，前述完整多尺寸明暗矩阵属此前产品版本；不宣称增量完整无障碍或独立视觉接受。

## R2-SD02：卡片语义增量

[类别映射与十项缺口](../../engineering/execution/2026-09-10-summary-disclosure/card-semantics.md)覆盖已裁类型；File/Workspace/Runtime补原生中间披露，Runtime紧凑入口与会话匹配修补，Run记录文件标明不承载接受效力。34项针对通过，见[日志](semantic-tests.txt)。Astra作者CUA验证默认收敛、Workspace当前文件往返焦点/展开保持、Runtime资源披露、切会话复位；1024紧凑Runtime实际进入Settings Developer并返回。截图[收敛](semantic-summary.png)、[返回](semantic-files-return.png)。未跑本增量完整明暗/窄屏矩阵；非作者静态复核单独记录。主线/部署状态不变。

末次731ee5c将已提供的owner版本纳入披露目标键；690af79截图保留其准确版本，不挪用为731视觉证据。

[非作者有界静态复核](semantic-review.md)：固定690af79及731ee5c无阻断；不称独立浏览器或全量接受。

## R2-SD03：入口先行与小视图修复

[入口合同](../../engineering/execution/2026-09-10-summary-disclosure/entry-grammar.md)定义默认More、分组、状态与host注入接缝；未接类别保留文本行，只有真实reader提供动作。修正紧凑More展开暴露旧glyph大卡、手机旧模块浮卡叠放。最终[1024紧凑](entries-compact-final.png)、[390单一目录](entries-390-fixed.png)；其余entries图片为中间过程反例。收起More实测恢复44px，Activity→Run→Escape返回原入口且保持展开。36项针对通过，见[测试](entry-tests.txt)。作者浅色有界检查，不称完整视觉接受。未动ChatSpace/composer、后端或部署。

[非作者入口静态复核](entry-review.md)固定337e522无阻断；末次acafe2c仅去掉Run入口冗余的本地generation→revision映射，作用域仍防迟到，不宣称Run有持久revision。截图保持337版本。
