# Chat阅读与文字浮现 · 可消费合同

2026-09-11 / Astra。接入[DR-04](se-control-one-shot-2026-09-11/return-intake.md)的单writer范围，本片是补充合同，未改产品代码。基线 `16e9d37a47366de195e1217a6440dd88b660be90`。

## 是否已入账

文字与motion在DG-04/DR-04已有原则；Typography、surface/ink在DG-09八轴grammar已有记录。但此前没有足够专门的彩色代码/Markdown阅读交付合同，不能只凭“已polish”认定已覆盖。本页将CR-01–04及后补CR-05明确为可消费、待实现/验证。

| ID | 最近实现先例与现状 | 本轮裁定 / 下轮验收 |
|---|---|---|
| CR-01 文字浮现 | 现stream更新、working ledger与composer状态；DG-04已禁止正文逐token动画 | 新内容到达可研究按稳定块短入场，不能延迟可读正文；滚动、selection、复制、重开不重播；中断/失败/reduced-motion静态可读；先做状态delta，不给已读内容反复动画 |
| CR-02 彩色代码 | `app/web/ui-controls.mjs`安全Markdown+code toolbar；`markdown-source.mjs`输出纯text code，`markdown-reader.mjs`只读投影 | 当前这两条reader路径无syntax token着色；彩色代码登记为未实现。语言显式/unknown回退，保持原文复制与版本/offset，不能以任意class/HTML绕过sanitize；库选型另作最小方案比较，不先安装 |
| CR-03 MD可读性 | 现heading/list/table-scroll/code-copy及user-message渲染 | 同一长文fixture检查user/assistant/文档reader的标题层级、段距、引用、列表、inline code、表格和长行；统一可读角色，不为视觉美化改原文/证据锚点 |
| CR-04 色阶与字重 | 现styles.css完整cascade、Slate与skin/Review合同；顶部旧palette不是当前baseline | body/heading/secondary/meta/quote/code有明确role；正文不能为“安静”降低可读性，层级同时靠weight/spacing；syntax颜色只描述语法，不借Review红表示正确性/权威 |

受影响grammar：Typography、Surface/Ink、Motion与state/focus可辨；语义registry和review状态不变。最近先例路径已列，实施前按[frontend-contract](agent-interface-2026-09-10/frontend-contract.md)载入相关precedent并记录真实delta。

下轮证据需覆盖明暗实际token、长中英混排、代码/未知语言/未闭合fence、流式分块与完成后输出一致、scroll/selection/copy、窄屏与200%、forced-colors/reduced-motion；测试按实际变更选取，原生未跑单列。新语法span不得改变copy字节或source mapping，未识别内容降为原文，不新增动态HTML执行。既有MD双边界、Review与source identity继续有效。

这是可直接放入DR-04施工的要求，不是重做整个Chat的授权，也不是已验收视觉baseline。真实Chat动作G01–G06仍按各自能力账推进。

## CR-05 · 用户消息的完整阅读解剖（2026-09-11补充）

用户提供[参考截图](chat-reading-2026-09-11/user-message-reference.png)，[来源hash](chat-reading-2026-09-11/reference.json)固定；仅作为阅读与动作分层参考，不是整套颜色/尺寸baseline。

当前实现已具备：`user-message.mjs`的安全Markdown正文、超过1200字符或16行时的摘要+Read full message、Source原文、独立消息复制/作为新消息编辑与时间；展开状态按message key保存。代码块复制由`ui-controls.mjs`提供。参考截图的“保留富文本前段再Show more”不同于当前纯摘要预览，尚未实现该变体；引用问题摘要也不能由正文猜出。

采纳的设计粒度：消息级容器→引用/回复对象的摘要（仅有真实identity时）→正文块→代码/表格独立溢出区→长消息展开→消息级footer与动作。代码Copy只复制该块原文，消息Copy始终复制完整消息；折叠只是展示，不能截断持久记录、编辑输入或证据来源。长目录树不撑破气泡；窄屏、大字、focus、selection与展开后的阅读锚点分别验。

CR-02继续持有syntax着色方案；对unknown language/目录树可保留纯文本，不为了仿截图对数字或路径任意赋予语义。截图的省略号、边界与Show more入口需要可发现的展开方式，不能用静态裁切冒充完整阅读。代码块与整体消息的菜单/复制位置分别设计，避免重叠或只在鼠标hover时可达。

本项并入DR-04，不另建消息协议；若未来需要引用问题/回复对象而现row没有字段，登记独立数据需求，UI不发明关联。浅色截图不撤回CW-PREF-20260911-01和已接受暗色authored层级。状态：已登记可消费；上述已有部分按代码确认，截图组合仍待候选与实现验证。
