# Agent Presence · 机器人形象探索入账

2026-09-11；Astra 裁决，Luna fast 只读 explore。工作基线 `main@ec240e7a3ff06ba25d4d9e8d1bc82ad45786d0ab`。当前交付为来源登记、方向选型与有界施工计划；未实施产品动画或完成视觉接受。

## 本地Design交接

用户已授权按Luna分层索引→Astra裁决→本地agent Design→Astra真实视觉调试执行。[正式HANDOFF](HANDOFF.md)为施工入口，[参考索引](reference-index.md)按需加载。本地agent负责独立specimen内设计和可运行返件；Astra保留后续视觉调试、模型能力瓶颈修正及生产接线。此分工覆盖下文早期AP-02作者安排；AP-03/04尚待返件。

## 来源与完整性

来源会话《探索机器人形象实践》，ID `6aa418c3-ed6c-83ec-9788-91c7275fa632`。接口返回9轮17消息、hasMore=false，消息无truncated标记；其中一轮只有用户消息。保存[原始消息快照](conversation.json)与[用户截图](attachments/IMG_2431.jpeg)，快照仅将临时附件路径改为包内路径。哈希见 [SHA256SUMS](SHA256SUMS)。

末轮助手声称已生成handoff、机器可读state contract、185词fixture与四张reference board，但返回内容只有不可解析的content-reference标记，附件列表仅有用户截图。本包未取得这些生成文件，不声称已接收、校验或重建原件。截图已目验：绿色气泡内两枚黑色横置折角/双横符号；气泡外壳和绿色不自动进入新形象。

原文的80条搜索、star数量、上游状态数、185默认词与成熟度均为来源自述，本轮不扩展外部核验。外部链接原样留在快照，不能据此安装依赖或宣称兼容。源会话助手早期反对复制短词的建议被后续用户及末轮方案覆盖：允许固定来源的Claude词库作为测试fixture，最终文风另裁。

## Astra 裁决

| 项 | 裁决及接受条件 |
|---|---|
| 形态 | 横置双横/双点加嘴型，GUI以自绘SVG路径表达；不直接使用字体glyph，也不添加完整机器人头。`=]`/`=)`作稳定组，`Ʒ`/`ε`下垂拓扑作thinking首选比较组，`|`、斜线、波形保留少量对照。嘴型不是新增runtime状态。 |
| 材质 | 16–24px以flat silhouette为基线；32–64px比较同几何的soft 2.5D笔画厚度。硬extrusion仅对照，glass/chrome/clay不进默认。绿色明确为探索占位，最终沿现有role token。 |
| 实现路线 | 首选零依赖原生SVG与可确定性采样的纯geometry函数；`sample(state, elapsed, seed, reducedMotion)`是拟定接口而非现有能力。不引入Rive/WebGL/Flutter运行时。bloub仅候选方法donor；agent-robot-avatar仅候选状态分层donor，需消费具体代码前固定SHA、许可和路径。 |
| 动作 | 静止基线、局部压展/错层/视线/嘴型变化与完成后一次settle；无持续bounce、旋转和粒子。状态切换可中断，减弱动态时静态仍可读；后台停时钟，固定时间可复现。 |
| 事实 | owner事件→纯投影→视觉状态。明确等待/受阻/终态优先于氛围；真实工具活动显示实际语义，未知工具保留工具名/通用Working，不按词库猜动作。无工具不等于thinking：须有活动事实，否则unknown/idle按真实状态呈现。并行工具不得伪装成顺序进度。 |
| 词库 | thinking可低频轮播，2.5–4秒是待实测参数；等待/受阻/工具态固定事实短语。185词仅待收原始fixture，不能编造补齐。禁止按耗时宣称almost done；详情来自可披露事实，保留scope与来源。氛围词变化不反复触发读屏播报。 |
| Placement | 先比较Chat/composer底角与长运行状态行；展开细节支持键盘/tap，不能hover-only。与当前Claude单writer的Chat/composer施工串行，不能在登记阶段抢写共享入口。 |
| Identity | Agent/Host形象稳定；Provider标记、模型名称从实际绑定/来源读取，requested/effective/bound保持区别。Provider echo不改Host颜色治理、不用节奏暗示能力，也不替代原生provider身份。 |

完成表情只表达Run终态；不等于产物正确、Core接受或用户验收。受阻与错误、授权请求与一般等待保持原合同，皮肤不生成authority。

## 分工与下一施工片

沿 [RD-005](../RD-005-multi-agent-selection.md)：Luna负责Scout召回、固定donor核验、有成熟先例的边界明确实现与非本人作品的有界复核；Astra承担几何/状态接口裁决、集成，以及瓶颈在模型能力的实现。只派一次窄explore，先复用本地材料，保留额度用于真实视觉computer use。

1. AP-01：来源登记与最近先例召回，本包交付；外部生成附件缺口保留。
2. AP-02：独立specimen目录内做同几何flat/soft-depth、嘴型与固定时钟状态比较；Luna可承担参数矩阵/fixture装配，Astra承担光学修剪和中断语义。取得原handoff后增量消费，不重写当前App。
3. AP-03：Astra在实际Chat writer返回版本裁定接入位置；用已有Run/tool投影，不新设presence store、provider调用或schema。作者定向测试覆盖terminal/wait优先、unknown、切换/取消、并行工具和固定时钟。
4. AP-04：真实浏览器computer use裁视觉。16/20/24/32/64px、1440/1280/390明暗、200% zoom、长短文案、键盘、reduced-motion、forced-colors及工具→等待→终态中断；比较完整Chat与邻接控件。长运行疲劳和60/120Hz只能以实际设备/持续观察记录，不能由单帧截图宣称通过。

AP-02–04为登记后的可执行切片，本轮尚未施工，不把计划计为接受。原有产品glyph重设计继续其既有工单，presence不自动替换Spark/Attention导航标识。

## 验证与归因

Astra已读取当前状态、前端合同与原图，保存返回消息并核对数量。Luna召回见 [explore.md](explore.md)。本轮仅文档/来源检查，产品测试和computer use留给实际视觉实现；未运行付费provider、发布或部署。当前共享工作区其他writer修改完整保留。

验证结果：`node tools/check-doc-links.mjs`通过（1011份文档、4856条链接）；`git diff --check`通过。初轮尚未提交/推送；current采用局部新增，保留原有未提交段落。后续handoff提交见Git历史。
