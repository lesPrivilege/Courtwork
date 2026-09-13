# UI 层级 polish · 空间与材质编排登记

2026-09-13 · Astra。用户要求将“信息架构收敛 Auditing”的最新空间层级讨论登记，避免扁平编排使界面失去视觉注意力。基线为 Courtwork main `050f031d45db2e37cbd3155b873e97c7d06303bc`。本片是既有[IA串行队列](ia-plan.md)的横向polish维度；没有启动全站视觉审计或改生产页面。

## 来源与增量边界

对话 `6aa650b4-361c-83ec-a2ae-d72162a6fa5c`，最新完成turn `337214a1-7cfa-43a4-b503-b6803ba72a52`，回复 `2ff289dd-5c83-4be7-b049-f7d035229037`。返回4轮，`hasMore=false`；最新用户/助手全文固定在[hierarchy-source.json](hierarchy-source.json)，SHA-256 `e60d02c0971ad57c66672c220be3fa10fc9012e0372a0e4d53ee9195c2fdd75b`。旧轮次已在[IA来源](ia-source.json)、[Attention消费](attention-consumption.md)、[页面类型登记](surface-classification-registration.md)接入，不重新派同一批工单。返回附件属于较早Tasktori轮次；最新材质讨论是纯文本，本片不以未读附件补推视觉结论。

原回复的“30个候选”“80%由M1解决”以及对Apple/Fluent/Atlassian/Geist的归纳是来源主张，本片没有重跑Exa或核验其比例。施工时按具体用途读取相应官方来源；本登记不把这些主张变成已接受的外部证据。

## 目标与采用原则

目标是在既有配色内建立可感知的任务主次：用户能辨认当前工作对象、选区、下一动作、上下文和临时交互层；滚动或切换后仍知道自己在哪里。视觉注意力优先服务当前任务、失败与待决定事项。

- 优先用内容顺序、留白、密度、边界、容器、独立滚动与必要的遮挡关系表达层级。每个表面必须解释它承载什么对象、相对于哪个父面、为何需要突出。
- **容器承担浮起层级，内部内容保持平整。** 不把每个section都变成浮卡，不通过增加同权KPI、卡片或颜色档位凑“应用感”。普通分组先用原有间距与字阶。
- 继续沿 Courtwork 原grammar；用户刚明确排除的装饰性左侧衬线、伪按钮式标签不重新引入。键盘、selected、review/danger/focus各自保留原语义。
- Glass只用于有实际空间关系、且材质合同允许的chrome/transient候选。正文、Reader、常驻内容与sidebar保持solid；菜单、popover也不因类型名自动获得blur。先比较solid空间方案，再判断blur是否有增益。
- Motion只确认真实层级与对象连续性；不为高频键盘动作增加动画，不延迟输入/焦点，不把动画当回执、进度或完成事实。
- 原文S0/S1/S1−/S2/S3/S4仅作候选分析标签，不新增一套正式token、z-index、primitive或权限层，也不替代现有色彩S→R→U和L1/L2/L3信息层。

## 已核对的内部先例与过时信息

这里只做限定源码/既有证据核对，不声称完成页面像素审计。

| 来源描述 | 当前基线事实 | 登记处置 |
| --- | --- | --- |
| Work Surface外容器raised、内部平整 | [surface-layout.css](../../../app/web/surface-layout.css) 的compact rail使用float、line-strong、radius、rim/shadow，rail-card透明、无阴影、以divider组织；其他视口形态另有规则 | 最近空间先例；按视口/展开态复用关系，不复制一套浮层到所有页面 |
| blur仅有两个登记实例 | [lint-materials.mjs](../../../tools/lint-materials.mjs) 当前仍只登记jump-latest-button/chrome与context-popover/transient；排除L0/L1，检查reduce-transparency实色回退 | 现有边界继续有效。任何新增消费者须随具体实施登记、验证，不在本片放开白名单 |
| Attention仍是border-left分栏 | **已过时**：UI02已采用contained reading plane、独立滚动、窄屏单面；Astra又移除了选中行/alert左轨与next-kind小牌 | 以[UI02接受](../attention-ui-handoff-2026-09-13/astra-acceptance/README.md)为新基线；保留成立部分，仅比较剩余上下文/层级问题，不重复实现 |
| Home各模块仍有同权描边卡片 | [现编排规范](../ui-composition-standard.md)已有Home/Work分离、ragged layout与禁止nested card；当前模块应逐场景截图再判断 | 不直接采信旧描述，不把所有Home模块一律抬高 |
| Context等二级面应推广Glass | 当前[测量卡审计](../context-tps-motion-2026-09-13/card-audit.md)与[产品收尾](../context-tps-motion-2026-09-13/production/closure.md)已沿solid raised接线 | 已接受局部作为先例，选择Glass仍需单独证明，不回退为“所有popover都透明” |

## 接入既有队列

| 原节点 / 面 | 层级polish消费任务 | 预期交付 |
| --- | --- | --- |
| IA-0 / surface inventory | 逐面记录当前平面、任务锚点、父容器、选中对象、scroll owner、遮挡/裁切、elevation、Glass资格；同时记录当前SHA/截图 | 有证据的当前→候选矩阵；不把来源建议的should-be栏当事实 |
| IA-2 / Settings、Runtime | Settings保留连续配置面，导航/上下文帮助定位；Runtime健康、对象、可执行控制与diagnostics分层，inspector优先solid独立容器 | 与原信息收敛一并施工，权限/失败/未知在动作处可见 |
| IA-3 / Home、Chat composer、Attention | Home保留方向与当前工作锚点；Chat dock检查与消息滚动的关系；Attention以已合UI02为基线比较阅读面和registry连续性 | 先做局部对照；不增加假KPI、timeline、拖拽或新状态 |
| IA-4 / Work、Reader、Usage、其他二三级面 | Work rail内外关系复用；Reader正文稳定；Dataset的筛选/数据/inspector按任务区分 | 相邻面同语义同grammar，允许不同任务使用不同密度和骨架 |
| IA-5 / 验收 | 固定fixture、版本和交互路径，检查注意力主次及回归；作者与非作者证据分开 | 裁决采用/修订/不采用，不以截图更“丰富”或lint绿灯代替产品判断 |

本登记不改变原节点完成状态，不新建并行产品owner或Release门。已完成切片只验证剩余差额，不重复施工。

## 对照方式与验收要点

选择具体切片后，以相同数据、文字量、任务路径比较：

| 对照 | 改变量 |
| --- | --- |
| M0 当前实现 | 冻结真实main截图和行为，不人为削平已存在层级 |
| M1 solid空间编排 | 使用既有geometry、容器、留白、rim/shadow、scroll/clip关系；不增加blur |
| M2 选择性Glass | 在M1上只改变被允许且确有收益的chrome/transient材质；保持内容与行为相同 |

先确认可比较的具体范围再制作对照，不要求每张页面固定做三版；没有Glass用途时停在M1。Attention的contained/inspector、composer的Home锚点/Chat dock都是待比较的关系，不能直接宣告所有S2都必须overlap。

验收要回答：首屏能否识别当前对象与下一动作；错误/未知/待决定事项能否被发现；滚动后是否仍有上下文、内容/控件是否被遮挡；返回是否保持选区、焦点与合理滚动位置；二级面是否增加上下文而非重复文字。采用相同任务的截图与操作证据，不预设80/20收益比例。

按实际影响覆盖1440/1280/390、明暗、长文、空/失败/在途、键盘/Escape/焦点、文字偏好与真实200%能力；材质涉及unsupported/reduced-transparency/forced-colors，motion涉及两条reduce路径。未测项逐项注明。静态检查沿colors/materials/interaction/shapes/contrast/copy/semantic consumers及doc links，行为检查按改动选取。依据[frontend-contract](../agent-interface-2026-09-10/frontend-contract.md)，不把有效窄视口冒称原生zoom或完整可访问性通过。

## 待施工时核验的官方来源

来源回复列出的[Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials)、[Windows Layering](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/layering)、[Atlassian Elevation](https://atlassian.design/foundations/elevation)、[Geist Materials](https://vercel.com/geist/materials)保留作定向阅读入口；本片未打开这些页面、未独立验证其最新内容。

本次仅登记与源码先例校正，不改配色、材质登记表或生产JS/CSS；未做新浏览器审计、未跑产品测试、未push/部署。
