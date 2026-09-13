# 信息架构收敛 · 串行交付

2026-09-13。产品提交 **`ccc7bb0`**，基线 `449877d`，直接main施工；本轮未push/部署。沿[原前端Plan](PLAN.md)接入[IA执行片](ia-plan.md)，没有新建产品开发线。Astra实现/集成及浏览器检查，Luna来源/库存探索与[非作者源码复核](ia-review.md)。其他writer的current/release/evidence改动保留。

## 引用与裁决

“信息架构收敛 Auditing”完整一轮用户/助手消息留存[原件](ia-source.json)，返回无附件/更多页；SHA-256 `ed5486dd0dbee067cd33de7627dc0feffea67fdda9ef22c1d396c0d187d890ef`。引用对话为候选材料，当前用户的串行施工指令决定授权。外部引用token未冒称已查证；Luna以[四个官方来源](ia-precedents.md)核验适用范围。

采用对象/状态/下一动作优先、上下文与技术细节逐层披露。版本比较保留revision，配置保留scope/权限限制，错误与未知留在决定处。六类floorplan是分类起点，非封闭模板；Markdown不强制serif；不新增presentation runtime或第二语义词表。规则已补入原[编排合同](../ui-composition-standard.md)、[文案合同](../copy-convention.md)和[frontend入口](../agent-interface-2026-09-10/frontend-contract.md)。

## 串行消费

| 节点 | 最终行为 | 最近先例/事实owner |
|---|---|---|
| IA-1 / FA-06 | Usage匹配记录新增Back to usage；恢复触发点、原view与scroll，同snapshot不重读；退出拒绝迟到响应，分页不覆盖原图表返回点 | Files原位返回；Usage snapshot/generation owner保持 |
| IA-1 / FA-09 | Files从历史reader返回后比较完成，Compare按钮恢复；隐藏dialog不再清掉仍存活的按钮引用，session切换/reset照常重建 | Files `returnFromFile` 的保留DOM关系 |
| IA-2 / Settings | 不可用能力使用Not available，技术列表默认披露，去掉BE工单号与自证旁白；MCP接入限制直接显示，插件无sandbox边界在Developer默认层保留 | PropertyRow/Host details；原能力事实未变 |
| IA-2 / Runtime | 作用域控件和deny/ask边界仍可见，scope id/revision/优先顺序入Scope details；默认健康资源不逐行重复source-default，例外、ceiling、override和Inherit仍在行上；披露经重绘保留展开 | 现有source/requested/effective/bound inspector；无权限语义变化 |
| IA-3 / Home | Attention预览的对象、状态、reason、next/due仍可见，revision进入Recorded context；保留更新时间与read-only | Home adapter负责全部事实 |
| IA-3 / Attention agent | 空态去掉装饰标题和口号，保留一句可执行用途及composer | 原Chat/Attention原生dialog生命周期 |
| IA-4 / 数据与阅读面 | 完成[逐面映射](ia-data-surfaces.md)，保留Spark维护列表、Usage聚合、Telemetry单Run诊断、Materials修订比较、Reader连续阅读的任务差异 | 沿既有projection/reader；未新画图或改字体 |

[有限库存](ia-inventory.md)覆盖Settings/Runtime/Home重点路径；不声称全库每条动态字符串完成机器分类。后续新增/修改面沿原变更记录补文本作用、披露层和最近先例，不引入基于句子数或字段黑名单的伪语义CI。

## 作者验证

- 全量 **916/916**，`node --test --test-concurrency=4 app/tests/*.test.mjs tests/*.test.mjs`，[日志](evidence/ia-full.txt)。全量启动后仅补充了MCP约束文案、不同pane的disclosure key，以及已有测试的分页路径；最终定向覆盖如下。
- 9个相关测试文件 **80/80**，[最终定向](evidence/ia-final-targeted.txt)。Usage的26行Next→Previous→Back测试随后单独 **1/1**，[分页回归](evidence/ia-pagination.txt)。Files在修复前同路径测试因Comparing…失败，修复后intake-ui **9/9**，测试保留reader往返触发。
- interaction/colors/materials lint与diff检查通过；[文档链接检查](evidence/ia-doc-links.txt)通过。无新色彩、材质、字体、后端DTO或权限状态。

CUA真实浏览器均使用独立合成Host及上轮fixture，无个人凭据/数据和付费调用。截图配同名DOM快照：

| 路径 | 结果与证据 |
|---|---|
| Settings集成默认页前→后 | [前](evidence/27-ia-integrations-before.png)、[后](evidence/29-ia-integrations-after.png)：默认工具行去重复来源，操作和effective/permission仍在 |
| 展开Scope details→切Inventory | [展开保持](evidence/30-ia-scope-preserved.png)，DOM key仍open；最终不同pane key独立 |
| Developer前→后 | [前](evidence/28-ia-developer-before.png)、[后](evidence/34-ia-developer-after.png)，source id等后置，插件信任限制首层可见 |
| Usage日→Matching runs→Back | [返回入口](evidence/31-ia-usage-back.png)、[原日期](evidence/32-ia-usage-origin.png)，焦点day-29、aria-label同原日期，scrollTop=102.5，drill移除 |
| Chat Files→r1 reader→关闭→r1/r2比较 | [完成按钮](evidence/33-ia-files-compare-fixed.png)，显示1 added/1 removed且Compare恢复 |
| 390暗色Settings | [截图](evidence/35-ia-integrations-narrow-dark.png)，单列配置/MCP限制可读，Scope details Enter/Space开合 |
| 390暗色Attention agent | [截图](evidence/36-ia-attention-empty-dark.png)，空态收敛；Escape回导航drawer中的Attention触发点 |

1280明色与390暗色代表面已验。测试结束System主题与默认视口恢复。Chrome原生200%尝试未取得可靠百分比或截图，工具返回不完整；不把短视口代称200%。

## 接受边界与后续

Luna非作者复核是源码层有界检查，未独立操作浏览器或重跑作者全量；详见[复核记录](ia-review.md)。它不等于全部UI或Release接受。

尚未覆盖：真实200%、触屏、所有scope/override/ceiling的浏览器矩阵、Usage全部图表触发点/分页的浏览器版本、Home非空revision披露的本轮浏览器场景、全库动态文案与所有skin。Home有定向DOM回归，分页/迟到响应有行为回归，不冒称相应浏览器已验。剩余全局FE-NAV、复杂runtime信息、全库文本分类继续沿原owner有界推进；没有以此次收敛隐藏正式Review或后端能力缺口。
