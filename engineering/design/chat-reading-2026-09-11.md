# Chat阅读与文字浮现 · 可消费合同

2026-09-11 / Astra。接入[DR-04](se-control-one-shot-2026-09-11/return-intake.md)的单writer范围，本片是补充合同，未改产品代码。基线 `16e9d37a47366de195e1217a6440dd88b660be90`。

## 是否已入账

文字与motion在DG-04/DR-04已有原则；Typography、surface/ink在DG-09八轴grammar已有记录。但此前没有足够专门的彩色代码/Markdown阅读交付合同，不能只凭“已polish”认定已覆盖。本页将以下四项明确为可消费、待实现/验证。

| ID | 最近实现先例与现状 | 本轮裁定 / 下轮验收 |
|---|---|---|
| CR-01 文字浮现 | 现stream更新、working ledger与composer状态；DG-04已禁止正文逐token动画 | 新内容到达可研究按稳定块短入场，不能延迟可读正文；滚动、selection、复制、重开不重播；中断/失败/reduced-motion静态可读；先做状态delta，不给已读内容反复动画 |
| CR-02 彩色代码 | `app/web/ui-controls.mjs`安全Markdown+code toolbar；`markdown-source.mjs`输出纯text code，`markdown-reader.mjs`只读投影 | 当前这两条reader路径无syntax token着色；彩色代码登记为未实现。语言显式/unknown回退，保持原文复制与版本/offset，不能以任意class/HTML绕过sanitize；库选型另作最小方案比较，不先安装 |
| CR-03 MD可读性 | 现heading/list/table-scroll/code-copy及user-message渲染 | 同一长文fixture检查user/assistant/文档reader的标题层级、段距、引用、列表、inline code、表格和长行；统一可读角色，不为视觉美化改原文/证据锚点 |
| CR-04 色阶与字重 | 现styles.css完整cascade、Slate与skin/Review合同；顶部旧palette不是当前baseline | body/heading/secondary/meta/quote/code有明确role；正文不能为“安静”降低可读性，层级同时靠weight/spacing；syntax颜色只描述语法，不借Review红表示正确性/权威 |

受影响grammar：Typography、Surface/Ink、Motion与state/focus可辨；语义registry和review状态不变。最近先例路径已列，实施前按[frontend-contract](agent-interface-2026-09-10/frontend-contract.md)载入相关precedent并记录真实delta。

下轮证据需覆盖明暗实际token、长中英混排、代码/未知语言/未闭合fence、流式分块与完成后输出一致、scroll/selection/copy、窄屏与200%、forced-colors/reduced-motion；测试按实际变更选取，原生未跑单列。新语法span不得改变copy字节或source mapping，未识别内容降为原文，不新增动态HTML执行。既有MD双边界、Review与source identity继续有效。

这是可直接放入DR-04施工的要求，不是重做整个Chat的授权，也不是已验收视觉baseline。真实Chat动作G01–G06仍按各自能力账推进。
