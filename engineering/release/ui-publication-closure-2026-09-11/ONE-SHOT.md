# Claude Design · 最后一轮产品与发布筹备

最新产品形象修订见[图标氛围方向](icon-atmosphere-20260911/README.md)：Spark与Attention现有拓扑造型为临时实现，重新设计直观轮廓与产品性格；该裁定覆盖旧source→fan-out / streams→ring外形要求，结构接入与通用图标族继续保留。

本单由用户于2026-09-11授权，合并所有已知设计缺口与发布前筹备。一个Claude Design writer在独立worktree串行完成设计、资产与前端实现，再由Astra复核、merge和完成发布筹备。不是只交画板，也不在本单执行线上部署。无需逐阶段重新申请批准。

## 开工与统一来源

读取实际branch/HEAD/status、AGENTS、engineering/current.md，再读本目录[裁定](DECISION.md)、[图标盘点](icon-inventory.md)、[次级界面](secondary-chrome-review.md)、[红色研究](red-control-research.md)、[预览消费](preview-consumption.md)。遵守[前端合同](../../design/agent-interface-2026-09-10/frontend-contract.md)，只加载相关先例。最新本单优先于旧工单的最小Chat按钮范围；已有diff与叙事修改直接继承。

以交付包的固定main为基线，不能从旧f4dca5a重开并覆盖后来的源码。你不是唯一writer，不操作共享UI checkout，不覆写他人文件；无个人凭据、付费provider、外部发送或部署。遇语义冲突记录精确事实交Astra；排版、资产光学、局部实现按本单直接完成。

## 串行交付

### 1. 一套可持续取用的图标

按图标盘点完整补齐已实现入口、近期roadmap和产品专属glyph。先沿既有Design 19板及v2/v3裁定完成SVG资产，再接入产品；不得借机换整套图标族。通用图标复用既有来源，原创Chat/Attention/Spark维持独立主语；Settings所有分组具备一致slot、尺寸、对齐与选中/禁用关系。

交可编辑源、16/18/20/24实际尺寸样张、明暗contact sheet、名称/用途/来源/授权/版本/hash manifest及可重复生成入口。近期未实现功能可完成资产库存，但不制造假可用入口。修正semantic mapping和生成源，确保重新生成不会丢glyph；产品按钮、header、侧栏、菜单的消费清单逐项回报。

### 2. 次级界面与Chat完整页面

依次检查Home、session、Settings、Work Surface、Attention和Spark的header、返回入口、侧栏与overlay。复用已有native chrome packet和safe-area变量，修正全宽secondary surface及窄屏dialog的交叠风险。不得建立另一套host协议。浏览器模拟安全矩形只能称模拟；真实macOS host若不可用，明确留下那一项实机检查，不能以CSS app-region声明代替验证。

完成[Chat专门页面](../../design/chat-product-page-2026-09-11/DECISION.md)：独立App页、专门chat.html与Chat/Attention/Spark三面并置，沿同一Design系统。普通项目聊天仍可达；保留draft、当前运行、选择和返回路径。不以最近session按钮代替独立页面，也不增加Provider/Memory后端。需要未来能力的画面使用下述统一预览，不堆砌假可用开关。

### 3. 红色控件与diff可读性

Astra批准新增普通交互控件accent角色，使开关、选中项等适当采用克制红色。它与Review待决、danger、diffAccent、品牌色分别登记，不复用Review token给普通控件。先按真实控件解剖设计on/off、hover、focus、disabled、readonly、mixed和unknown，再接实际owner状态；不是所有按钮都涂红。普通导航/返回/工具按钮以中性为主，选中switch/radio/checkbox和确有必要的主要动作可使用control accent。

淡红方向用于真实不可用控件的局部表达，浅深分别校验；不把所有浅红解释为disabled。先拆分现Pages Paper CTA借用Review色的用途，普通可点击CTA回到action角色。disabled必须真的不可操作，readonly保持可读，unknown/loading不得推断为off。Review/danger/focus的既有稳定语义不随skin变。新增角色要同步governance、token映射、允许注入范围与验证，不能只改组件hex。

继承当前方角、整行高词块的diff。用户理解双列分别是旧/新行号后明确“不必改”：保持现有行号展示，不增加列标题；删除侧/新增侧缺号留空，不合并丢信息。Settings和Pages共享fixture及语义，不出现两份不同解释。窄屏不缩字、切字或横向挤出页面。

### 4. 一套可实际体验的合成预览

以[预览消费](preview-consumption.md)为代码入口，统一固定数据的来源、ID、时间、项目、会话、来源工件、变更和待处理事项。既有capture fixture能复用则直接收敛，禁止每个页面另造一套矛盾样例。交可进入、可浏览、可返回的完整产品体验，用自然的简短入口或状态标识说明示例身份，不在正文堆工程免责声明。

预览数据与真实数据隔离，不写入正式usage、history、approval或执行回执。预览中的交互仅在预览本地状态内工作；真实执行入口由既有能力与运行生命周期持有。首次真实执行成功建立其真实工作身份后，退出默认预览并清除预览投影；不能因点击失败、仅编辑或刷新而误删，也不能删除用户项目、草稿、来源或历史。已存在真实工作时默认进入真实状态。保留明确可重新打开示例的入口，演示不重新覆盖真实工作。

若受现有契约限制，选择不改Core/schema的最小独立预览层，并记录入口/状态机/退出触发/重载行为。覆盖未连接runtime、新用户、已有真实数据、执行启动失败和真正启动后的交接。不得借预览宣称真实provider或尚未实现的Chat后端已连接。

### 5. 工程图及最后发布面

消费[逐图合同](../architecture-reconciliation-2026-09-11.md)：F1/F2修布局与关系阅读，F3标清已实现/候选，F4复用，F5按窄屏实际需要处理。每图维持来源、节点/边、成熟度与文字等价；不将工作编译器、第二runtime或执行成功画成已正式commit。

首页、README真实生成源、Chat/Features/Experts/Paper导读沿“先编排，再引出Court”的自然叙事。中文不顺就采用完整自然英文，不硬译；对外完整表达用途，具体缺口在工程记录。不得回滚已合入的大标题或恢复“待准备”等保护性旁白。

全部产品接入后，用同一合成数据重拍受影响的真实App画面，更新Pages/README媒体登记与hash、alt和来源；旧截图留档，不能只改manifest称已重拍。Paper为独立SE来源，本包不改论文正文或擅自推送SE。清点其既有预发布回执并列入最终移交，避免把Courtwork提交当作SE部署。

## 验证与返回

每阶段写固定提交与最近先例/受影响grammar，再继续下一阶段，不另开多人共享writer。运行实际改动对应unit/行为与生成器parity，颜色/contrast/interaction/shape/material、文档/Pages links、site构建与浏览器检查。视觉覆盖1440/1280/390明暗，局部、相邻面、完整场景，键盘、返回焦点、长文本、空/失败/处理中、200%及适用的forced-colors/reduced-motion。native chrome补104×64 packet、零inset、fullscreen/overlay关闭和各leading control矩形交集；精确区分真实与模拟。

返回一个return-publication-final-v1目录及ZIP：RETURN.md逐项核销本单1–5；base/head与提交顺序；可应用bundle或补丁；完整编辑源与生成源；统一fixtures及一条启动命令；前后图和最终完整画面；测试原始日志；source/outputs逐文件hash；未测项、能力缺口与需Astra裁定项。未完成项必须明确，不能靠删除测试、替换baseline或更改产品文案闭门。

作者完成候选，Astra负责非作者审阅、集成及最终采图/发布准备复核。若出现新的明确工程阻塞，只报告具体阻塞及最小补片，不再拆成无穷的设计探索。预发布准备通过不等于所有长期runtime/产品门接受，也不等于线上已发布。

## Spark定义接续 · 2026-09-11

消费[Spark产品与发布定义](../../research/spark-product-definition-2026-09-11/README.md)：快速有界的整理、抽取、分类、翻译，后台准备与直接唤起并存；第一阶段是Harness Core受限profile，DeepSeek V4.1 Flash为首个适配目标，非已接入声明。纳入既有Spark面、三面并置及统一预览，产品glyph按最新形象裁定重设计；局部翻译只能在明确示例身份中设计，不新增假可用生产按钮或后端。普通文案取登记稿，不采用未经CW实测的供应商性能结论。原16f6337完整ZIP保持原字节，此为同一工单补充。


## 2026-09-12 用户澄清 · 覆盖此前 control accent 范围

用户以 Appearance 的 System 选项框截图明确：这类选项框不引入红色，历史红色裁决指滑动式 Button（switch）。因此 segmented 的选中浮层保留中性底色/阴影，普通 native radio/checkbox 沿中性 ink；红色 control accent 保留在滑动 switch 的 on 状态。键盘 focus、真实 disabled 与 Review/danger/diff 语义各自保持。此前允许普通选中项红色的宽泛表述由本条覆盖。
