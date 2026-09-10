# 卡片语义登记与缺口 · R2-SD02

2026-09-10，Astra。消费固定准备包 `13874d32310e4d09817d32c46a9e948925ff4ba0:engineering/design/sidebar-intake-2026-09-10/README.md` 的用户逐级展开裁定。本轮用户授权先补前端、登记缺口；ChatSpace/composer由Claude独立施工，不在本单写权内。此表是呈现映射，不替代领域合同或新增第二套runtime registry；生产静态模块仍由 [surface-modules.mjs](../../../app/web/surface-modules.mjs) 注册。

## 已裁共同规则

有身份和可披露事实才成卡；常驻摘要→默认收敛的局部披露→明确的同对象阅读入口。无事实不造卡，未知不显示0，执行完成不等于Review接受。对象/会话/版本改变清除局部展开记忆；同对象刷新和阅读返回保持。域动作只能由真实能力提供，导航不获得写权限。类型登记齐全不等于每种类型已有生产reader。

## 类别覆盖

|语义|身份/事实owner|前端承载与当前处置|缺口|
|---|---|---|---|
|Run|RuntimeStore Session+Run；已记录状态/文件版本|已接摘要、Files、Run information、原Run reader；记录文件补明确Review效力说明|G-SD01：摘要生产读状态尚未接独立error/retry，读取失败在原reader处理；无Run revision不伪造|
|Progress / Activity|同Run事件，事件identity与覆盖范围|已有Run reader Activity列表；作为Run内的读面，不把事件数画成任务进度条|G-SD02：可提升到局部披露，但当前摘要不重建stream/覆盖事实；无真实分母不画百分比|
|File / Preview|session+path+read kind；recorded另含Run+SHA，Core文件沿artifact/candidate引用|File卡补File information→已有文件tab；Current与Recorded保持区分|无新增reader；Browser不是File Preview别名|
|Workspace|Session workspace，或host解析的extension/slot/projection|Files/Work information局部披露→原workspace pane；未读/空/失败分开，当前文件明确Current|G-SD10：extension缺renderer时当前仍有Open workspace可进入host envelope，与旧slot合同“不出现按钮”存在范围冲突；登记待统一缺席行为，不假装业务表单可执行|
|Runtime|匹配Session的runtimeView snapshot/revision|Resources局部披露→原Settings Developer workbench；紧凑入口修复到同一去向|沿已裁WK-66例外，不复制一套Runtime tab；缺snapshot错误细节时只说未读|
|Context|Run冻结context与下一Run配置是不同事实|冻结Context已有Run reader renderRecordedContext；配置资源已有Runtime reader|G-SD03：独立摘要/局部披露/目标tab尚未接；不得用Runtime Context资源数量冒充冻结token工作集|
|Source / Evidence|Core Source id+source revision/digest；candidate锚点/冻结quote|已有Work packet Source与历史来源reader；文件仅是文件，不改名Source|G-SD04：独立常驻来源摘要与完整版本化列表adapter未接；证据归属不能从文件名推断|
|Diff|明确对象/scope+base/head版本及比较结果|登记卡→变化列表→Diff reader的挂载关系；本分支无独立Diff模块|G-SD05：已有Core file-diff读取（candidate+同路径冻结base），缺右侧版本化比较projection与reader接线，不从ws_write次数或git status伪造变化|
|Task|Host async task identity绑定project/session/run/tool-call/adapter/source version；见[async task合同](../../../app/docs/async-tasks.md)|登记摘要状态→子项/记录→任务reader；已有后端有限只读任务，不称后端全无|G-SD06：现有surfaceFacts无任务列表/读取状态/reader；需前端host读适配与错误、历史/孤儿、cancel-requested分离；默认无adapter|
|Explore|子执行身份/父关系/权限与结果归属，不能由Thread成员替代|登记摘要→执行列表→对应执行阅读面；产品称Explore|G-SD07：[Thread/mailbox](../../../app/docs/coordination.md)不等于子agent执行；缺可用执行projection/reader与能力广告，不造agent计数/重试/停止按钮|
|Browser|连接/session/目标tab身份、权限与资源生命周期|保留同一host挂载语义|G-SD08：本产品无已接连接/权限/reader，不把本次CUA测试工具当产品能力|
|Computer Use|会话/受控surface/操作身份及授权范围|保留摘要→局部状态→操作阅读面语义|G-SD09：本产品无已接能力/生命周期/操作回执；无生产入口，不启动外部操作|

## 本片实际补全

File、Workspace、Runtime原卡内事实改由原生details/summary承载，摘要标题/计数/明确Open保留；原因说明留在折叠层外。无需新增pane/route或依赖。共用Run的控件角色与圆角焦点，host仍拥有布局/tab/Escape/reader。披露记忆按sessionEpoch和对象身份隔离；已提供的extension generation、projection stateVersion、runtime revision加入目标键（workspace当前文件无目录revision不伪造），避免重新绘制或过期toggle串对象；Runtime summary必须匹配当前Session，避免展示前一会话计数。

写路径：app/web/{app.mjs,summary-disclosure.mjs,surface-modules.mjs}与精确测试；不改styles.css、ChatSpace/composer、provider/settings实现、后端schema。此处新增surface-modules写权仅限上述卡片语义与读态/作用域修补。

## 验证与边界

34项针对测试通过（包含新增作用域/对象复位、未知与0、Run、tabs、settings）；颜色/交互/形状/材质lint通过。Astra作者CUA：Workspace Files Enter展开→当前文件tab→Escape返回原文件行且展开保持；Runtime Resources计数披露；切会话复位。增量1195×772浅色，完整明暗/窄屏矩阵仍沿前片版本，不能当本片已验证。新增纯原生披露无动画/材质变化。非作者复核另外记录；语义登记不宣称所有类别已完成或独立视觉接受。
