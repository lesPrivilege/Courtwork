# Design return · Astra视觉审阅

2026-09-11 · 输入产品dbd1efe。7页/19画板已逐个打开静态HTML并截图；完整文案/生成源另外核对。截图不执行返回脚本，不修改原板CSS，不使用重新绘图替代原板。最终裁决见[return-intake](../../engineering/design/se-control-one-shot-2026-09-11/return-intake.md)。

## 主要发现

1. **旧palette被误当实际级联**。Main的light frame/panel为#f0f0f3/#fdfdfe，dark为#111113/#212225/#272a2d；这只是styles.css前段。固定产品约5500行的neutral roles覆写default Slate，5966以后固定semantic/material进一步覆写。默认dark panel/float实为#222627/#2e3335。`shared.mjs`和各板未消费完整policy。Main深色depth-chip中的hex又继承了浅色正文ink，黑字落黑底，截图直接可见。拒绝“完全匹配dbd1efe”的总称；也不把某套默认hex升为所有appearance都必须相同。
2. **合法组合表含非法排他推理**。“运行行从不获selected底”错误，运行与选择可以同时成立；“所有深色部件都不可暗于背景”误伤sunken角色；“只有两种时长”也不是全代码已收敛证明。Review独立于skin的事实不能被全灰处理抹去。
3. **原生glyph方向有用，当前光学不足**。Spark A在16px旁置home/activity/panel-right明显更扁小，易读成插接/列表外伸；B明显似趋势梯。Attention A优于列表B/眼睛C，但环的含义需从“必需人处理”收敛为注意对象/判断汇聚。图形是抽象，不固定三条派生/三条工作。mono栏是手画黑白背景，并非forced-colors环境；IC-6未执行。
4. **header分形有帮助，aria设计需改**。三横线与panel-right能在当前并排布局里区分读面与工作位置；overview不折入工作面tab。返回板把变动Open/Hide名称与pressed混用；实施以真实disclosure开合和区域控制同步。text.svg在固定vendor不存在，需核实际donor名称/hash。
5. **停止尺寸和实际状态接线未完成**。ComposerMotion Stop为小方glyph，Stopping却长成宽文字pill，与“same width”描述相反。板是静态分镜，不能把pulse/exit/中断/IME/滚动保持写成已运行，不能仅复制CSS便宣布完成。ChatSpace还出现“rebuild c-9”问题，否定了“Rebuild只在唯一sample板出现”的绝对声明。
6. **样例文案混入产品面/能力总称**。Spark窄板尾部和深色板尾部、Attention窄板、Pages五拍均有实现说明。它们可留在标注区，产品文案须独立承重。Pages第3/5拍把Matter打开/Rebuild后current写成“App已有真实控制的连续路径”，需要与能力证据拆开；商业产品故事可以采用，但不作基线运行证明。
7. **长板导出边界不可靠**。Main声明1380而内容1622；Icons1560→1914；AttentionStates1320→2324；Composer1500→1742；Pages1560→1788；Return5200→6744且1000宽长表右列裁切。固定frame导出可能丢说明。此为交接资产问题，不是产品布局回归。产品型Spark390和Attention390的静态取样未见横向溢出；不据此宣称真实responsive交互通过。

## 19板取样及处置

| 页 / 原始板 | 本地截图前缀 | 审阅与处置 |
|---|---|---|
| System / Main | 01-system-900、01-system-bottom | token级联不符、dark标签对比问题；重写合法组合，保留八轴组织 |
| System / Icons | 02-icons-900、02-icons-bottom | A/A方向进入adopted specimen；修Spark光学；mono不是forced-colors |
| System / HeaderPair | 03-header | 双入口分形采纳，开合属性与donor来源修正 |
| Spark / SparkOverview | 04-spark-overview | 保留只读分组/时间/未知原因；token回接当前产品 |
| Spark / SparkActivityDark | 05-spark-dark | 表格与Refresh只读方向采纳；去产品内工程说明 |
| Spark / SparkStates | 06-spark-states、06-spark-states-bottom | 空/静/未知/冲突分开；live标签按源码逐项核 |
| Spark / SparkRebuild | 07-spark-rebuild | sample保留；拟POST路径不构成接口批准 |
| Spark / SparkNarrow | 08-spark-narrow | 390静态可读，尾部实现说明移出产品 |
| Attention / AttentionQueue | 09-attention-queue、09-attention-queue-bottom | 主从方向保留；打开行是selection，不能以层级理由否认选择事实；编辑器底部需真实viewport复核 |
| Attention / AttentionAssistant | 10-attention-assistant | 全局助手/queue/披露分开；dark角色需修 |
| Attention / AttentionStates | 11-attention-states、11-attention-states-middle-settled、11-attention-states-end-settled | receipt/uncertain/conflict方向保留；不接受all LIVE概括，详见能力核对 |
| Attention / AttentionNarrow | 12-attention-narrow | 390静态可读；Back/list/detail运行路径另验 |
| Chat / ChatSpace | 13-chat-space | 保留窄用户气泡/正文；Rebuild sample边界和动作可见性需修 |
| Chat / ComposerMotion | 14-composer-motion、14-composer-bottom-settled | 九态分镜可用；停止宽度与CSS-only主张不通过 |
| Chat / ChatActions | 15-chat-actions、15-chat-actions-bottom | row/action/能力账沿现实现；不可恢复错误hover隐藏行为 |
| Explore / Explore | 16-explore、16-explore-bottom | Thread/message事实与task ladder样例分开；sample不新增owner |
| Settings / Settings | 17-settings、17-settings-bottom | PropertyRow/tab/filter复用；数值行不能凭样例成为已发布范围 |
| Pages / PagesStory | 18-pages-story、18-pages-story-bottom | 位置采纳，五拍文案改写，源码资产保持独立 |
| Return / Return | 19-return-top、19-return-lower | 长表右侧裁切；完整RETURN-design.md另做45行文本审计，不声称6744高每个像素都捕获 |

所有文件位于[screenshots](screenshots/)，[capture-metrics](capture-metrics.json)保存当时DOM viewport/content尺寸；[screenshot-manifest](screenshot-manifest.json)保存实际文件尺寸/hash。长板取样不等同全页拼接，表中的名称用于定位，正式源文仍在返回archive。

## 捕获限制与排除

早期viewport设为1380/1560高，但原生截图最多返回1116高；`01-system.jpg`、`02-icons.jpg`及`02-icons-tail.jpg`仅作为局部取样。`01-system-full.jpg`由fullPage产生拼接缩放/重复，**排除于视觉判断**。`02-icons-middle.jpg`和`11-attention-states-bottom.jpg`在原生滚动后过早截图出现未绘制空白；后续settled/底部图替代。`14-composer-motion-bottom.jpg`实际仍为顶部，使用`14-composer-bottom-settled.jpg`。上述文件保留用于审计，不删除或冒充产品缺陷。正式取样使用900或更低viewport，每张图片单独检查。

未运行：产品交互、真实动态timing、IC-6模糊、VoiceOver、IME、forced-colors、真200%zoom、1280产品回归。它们分别进入对应施工片验证，不以此次静态审阅关闭产品门。Astra是裁决者，不自称返回稿作者的独立产品接受者；Luna另做有界源码核对。
