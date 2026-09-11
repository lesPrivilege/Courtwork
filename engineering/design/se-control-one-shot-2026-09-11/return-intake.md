# Astra · Design返回裁决与施工边界

2026-09-11 · 固定产品基线 `dbd1efe52d7a078cfdb8af03a82470135f31a9dd`。用户随后提供实际canvas目录，现已取得7页/19画板、RETURN-design.md、6个原创glyph及ZIP。此前[未取到文件的初步记录](return-intake-provisional.md)仅保留历史；当前状态以本文为准。[原始材料与hash](../../research/se-control-design-return-2026-09-11/README.md)、[画板审阅](../../../evidence/se-design-return-20260911/visual-review.md)、[45行消费核对](../../../evidence/se-design-return-20260911/consumption-review.md)、[能力核对](../../../evidence/se-design-return-20260911/capability-review.md)共同构成本次裁决依据。

**裁决：采纳设计方向，按修正后的合同拆施工；不原样接受返回包为当前产品的像素基线或canonical资产。** Astra负责本次架构/视觉判断；Luna的来源与源码检查是有界非作者核对，不替代产品实现后的独立接受。

## DG-01–09

| Gap | 正式处置 | 本轮确定的边界 |
|---|---|---|
| DG-01 | **adapt：A/A概念进入adopted specimen** | Spark采用source→fan-out，Attention采用streams→ring。Spark A在16px明显偏扁，18×10路径占用不能写成已满足Lucide光学；修正尺寸与间距后再验。环表示注意对象/判断汇聚，不定义所有Attention都要人介入；三条线是抽象图形，不是固定关系数。保留文字标签。B梯级似趋势图，Attention B似列表，C/铃/闪光不采用 |
| DG-02 | **adapt：沿现有只读Spark继续** | 接受empty/quiet/partial/unknown/error/conflict区别及可见刷新出口。画板视觉需回到实际级联token；Rebuild无生产owner前仍是样例。Refresh只读，不接受画板拟定的POST路径为后端合同 |
| DG-03 | **adapt：队列/详情/助手各守对象** | 保留列表到详情、scope/revision/typed action/receipt和不确定重试的方向；LIVE标签逐项按能力核对修正。选择、焦点、Needs you可以同时存在；不允许以“判断对象”免除选择语义。全局助手会话与Attention items不合并 |
| DG-04 | **adapt：功能性motion，非CSS-only完成** | 采用文字先于motion、无假进度、正文不逐token动画、重开不重播。每种动效需绑定真实状态和关闭/中断路径；Stopping宽度不得从28px图标跳成宽文字pill。常驻脉冲不作为默认必做项，先验证必要性和reduced-motion |
| DG-05 | **adopt sample边界；defer生产任务梯** | 当前Thread/message继续沿既有projection。任务/Run/result/停止语义待实际owner合同；返回稿自拟Thread→task→result不升为新模型。不因存在flag就把新任务梯接进生产导航 |
| DG-06 | **adapt：header双入口分形，动作沿能力** | Chat overview保留独立入口，使用三横线摘要方向；work surface保留panel-right。donor必须以固定Lucide实际文件名及hash入库，不能虚构text.svg。四种已接动作与其余缺口保持分别记账；不因画板画了hover隐藏条就覆盖现行可见性 |
| DG-07 | **adapt：复用PropertyRow/tab/filter/disclosure** | 工作面按真实展开区域同步aria-expanded/aria-controls及Open/Hide/Collapse名称；不照搬aria-pressed。Request timeout并未在当前Settings实现，拒绝as-shipped称谓；设置样例数值不得反向制造owner单位/范围。Home/End等行为缺口另以真实源码确认，单独修 |
| DG-08 | **adapt：五拍放在双原子后、Research前** | 采纳局部故事位置与静态线图方向；保留Hero/nav/Ideas及f137媒体。重写可独立承重的产品文案，移除“新增section/真实控件/静态SVG/无新motion”等施工旁白；第3拍跳转和第5拍Rebuild不能写成基线已接通的连续路径。商业化产品叙事授权保持，工程能力账独立如实记录 |
| DG-09 | **adapt：只登记真正合法的组合** | 以实际CSS完整级联和appearance policy为准，拒绝旧色阶的pixel-perfect主张。状态与选择正交；Review/danger/focus受固定语义约束；sunken合法，不能泛禁“深色里任何比背景暗的部件”。无新增token家族 |

## 五处分歧的明确裁决

1. **Spark A胜B，但当前SVG不是canonical**：fan-out表达来源依赖；阶梯太像增长/进度。DR-02修光学，不再重新开整族选型。
2. **Header保持两个入口，不把overview塞进work surface tab**：summary是瞬态读面，工作面是持续工作位置；折叠工作面不应使summary不可达。三横线方案进入候选实现，名称仍为Chat overview；不为两个glyph增加常驻第三种导航。
3. **Attention当前打开行保留现行float样式，但它仍是选择**：本轮不为统一灰阶改已实现pattern；文档撤回“不是selection”的理由。状态词/选择底/键盘ring可叠加，未来改变颜色需对照完整场景裁定。
4. **Pages五拍位于双原子之后、Research之前**：这是用户既有原子优先读序的延续；文案改成来源变化→识别过期→定位工作→记录判断→工作继续，避免把未接Rebuild当成已测端到端。
5. **glyph先adopted specimen，完成局部核验再canonical**：不是等待所有产品门，而是只等本次glyph的16/18/20/24光学、邻接辨识、IC-6、来源/生成器parity、命名、forced-colors/200%/焦点与触摸证据。VoiceOver未测仍明确未测，不补写通过。

## 修正后的Visual Grammar

| 轴 | 应消费的规则 |
|---|---|
| Surface | frame/panel/float/sunken是角色。默认Slate在dbd1efe的light为#e0e4e7/#f4f5f6/#ffffff/#e9edef，dark为#171a1b/#222627/#2e3335/#1c2021；实际appearance可改变获准外观，不能将这组hex硬编码到组件 |
| State | default/hover/pressed/selected/focus与running/waiting/review是不同事实；运行中的行可以被选中。不能用互斥“先后链”描述这些组合 |
| Color | Review固定于scheme并独立于skin；danger、success、focus各守角色。activity不自动取得review或permission含义。对比度以实际组合测量，不能由currentColor推断合格 |
| Type | 继承既有role/scale和排版密度。设计板正文小字号/元信息不能作为全局新标准；Pages campaign serif不进入应用控件 |
| Material | 正文solid；仅消费已登记blur场景及solid回退。光泽与透明度不表达权威、成功或运行状态；不把旧试验当现行新增材质许可 |
| Shape | 使用既有control/card/container角色，密度与hit region分别核；glyph视觉尺寸不等于点击尺寸，不能因画板声称44就算触摸通过 |
| Motion | 按当前状态触发、可打断、阅读位置与输入保持；reduced-motion静态。120/180ms是可用既有值，不证明所有入场/退出生命周期已接通 |
| Icons | Lucide固定子集继续canonical；原创两槽位单独adopted specimen，保留标签与语义key。图标不含状态/权限徽记，新增donor有来源hash和生成器证据 |

## 六个施工PR合同

这些是可执行的分片合同，不等于已经创建六个远端PR，也不等于候选功能已实现。每片开工先重新读取main/HEAD、当前writer和相关合同；允许更细拆，不扩大文件所有权。

| PR | owner / 写入面 | 交付与排除 | 必要验收 |
|---|---|---|---|
| **DR-01 来源与裁决** | Astra：本目录、research返回包、evidence、current/roadmap | 本次交付：全源hash、19板审阅、45行消费、五分歧、DG裁决与后续合同；不写app/site产品 | ZIP CRC/member一致、archive哈希、文档路径、非作者来源/能力核对 |
| **DR-02 glyph与header** | Astra定geometry/语义；Luna可有界实施 `tools/ui-vendor/`、图标生成器输入、`app/web/vendor/`生成物、`app/web/semantic-controls.mjs`及header接线 | 原创A/A光学修订、固定donor、语义映射、完整close/open同步；与brand零依赖包分别记来源。不要改整个图标族 | 生成器三集合与hash parity；1440/1280/390明暗邻接；IC-6；可访问名/焦点/开合；forced-colors和200% |
| **DR-03 Spark/Attention** | Astra整合；单writer拥有`spark-view.mjs`、`attention-view.mjs`/`attention-agent-view.mjs`及必要局部CSS | 只修已拥有事实的呈现和交互，真实projection优先；Rebuild、新调度与授权扩展另单 | partial/unknown/409/晚响应；receipt后重读、uncertain同身份重试、disclosure拒绝/过期；键盘返回与窄屏 |
| **DR-04 Chat/Composer/Settings** | 单composer writer；`app.mjs`、`composer-field.mjs`、`chat-actions.mjs`、`settings-view.mjs`、`ui-controls.mjs`及局部CSS按子片独占 | 状态→motion hook、停止尺寸、消息动作可用性、PropertyRow和键盘；先对现实现做delta，不照抄整板重写 | IME、发送/等待/停止/失败、draft/selection/scroll保持、reduced-motion；原生owner范围；菜单/tooltip焦点与200% |
| **DR-05 Explore/Rebuild specimen** | Astra冻结后端缺口；Luna可做隔离specimen adapter | 只在独立样例入口展示，不新增真实Task store/POST/停止操作；生产接线须进入既有MA/ME/BE工单 | 样例无真实副作用/权限提升、不混入真实投影；逐字段owner与capability缺口账 |
| **DR-06 Pages五拍** | Astra叙事/整合；`site/src/page.mjs`、必要site样式与自有图资产 | 局部接入独立文案和五图；保留双原子/现行导航/Ideas/媒体来源；不以样例重标产品截图 | 构建/链接/媒体hash；桌面与窄屏、静态/reduced-motion；文案与实际证据边界分别复核；部署另按现有发布授权范围 |

**共享文件交接**：DR-02仅在header子片拥有`app/web/app.mjs`与glyph/header所需`app/web/styles.css`块，交付固定commit后释放。DR-03仅拥有Spark/Attention局部模块与对应CSS块，不修改composer/header；如需`app.mjs`入口接线，由Astra在DR-02交接后单独集成commit完成。DR-04在DR-03交接commit后取得`app.mjs`、`styles.css`、`ui-controls.mjs`共享写权。不得并行改同一共享文件，不跨片顺手整理；每个PR描述记录取得/交出的commit及未完成事项。

顺序：DR-01 → DR-02 → DR-03 → DR-04；DR-05是隔离设计资产，可在owner合同待定时整理；DR-06在语义修订后接入。此队列不重开已经接收的深色气泡修补，也不把历史f137截图改成新设计golden。

## 连续性与验证记录

最近已实现先例：`semantic-controls.mjs`的semantic glyph映射；`app.mjs`的context popover与work-surface开合；`spark-view.mjs`的只读dialog/tab；`attention-view.mjs`的registry/detail/typed-action回执；`settings-view.mjs`的PropertyRow；`site/src/page.mjs`的双原子。固定基线均为dbd1efe。影响grammar为Semantic、Projection/Control、Visual、Placement；本片只登记裁决，不改变运行事实。

原始板是静态HTML，CSP禁止所附脚本；截图属于设计审阅，不能当作点击路径、motion执行、原生宿主、VoiceOver、IME、forced-colors或200%测试。19板均有可视取样，长板以相关滚动段加完整原文核对；Return长表存在横向裁切。具体采样与排除文件见visual-review。DR-02–06实现后的接受仍独立；本片未改变Runtime/Core schema、权限、provider或产品门。

## 2026-09-11 · DR-04阅读范围补充

[CR-01–04](../chat-reading-2026-09-11.md)明确文字浮现、syntax color、Markdown阅读层级与色阶/字重的现状、实现边界和证据要求，纳入DR-04同一单writer；已登记可消费，尚未实施。此补充不改变此前DG-04正文不逐token动画、DG-09语义与视觉分层裁定。

## 2026-09-11 · Design方确认回执（用户转交）

Design方报告已阅读正式裁决、能力复核与45行消费账并更新其记忆，认可四项错误：旧顶部palette不能支持像素匹配主张；Request timeout示例误列为已实现；ChatSpace Rebuild缺生产handler应标sample；静态板与不完整motion盘点不能支持CSS-only live结论。此处登记转交声明，不验证其外部记忆写入，也不以作者认可替代工程证据。

A/A adopted specimen、Spark A的16px光学校正、header双入口与真实disclosure、Attention打开行的选择语义、双原子后的五拍方向继续按前文裁决。回执将约5505行级联简称为“Home-neutral覆写”；准确选择器范围仍以实际CSS与既存审阅证据为准，不用这个简称扩展适用面。

Astra接收：DR-01裁决闭合；DR-02–06仍按原写入面/交付门推进，非已实施或已独立接受。Design方无当前派单。其提出的原址修正版是可选补充，未收到、不作为施工阻塞，也未向其外发改图请求。若后续收到，应保存新版本与hash、记录相对旧包差异，保留原始归档；施工直接消费本正式裁决，不能继续把旧板错误标签当能力事实。
