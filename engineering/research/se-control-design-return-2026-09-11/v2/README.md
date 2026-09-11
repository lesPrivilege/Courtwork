# Claude A架构图 / B画布v2 · Astra接收裁决

2026-09-11；Astra基于 `c127961100871d2db7677a0ebb6ce0b0e1ee3f98` 核对。用户确认同一Claude已交A/B，Pages另立后续任务。结论：**接收原始返回及可用设计方向；候选必须按本页适配，不原样接受为发布资产或产品baseline。** 架构/语义仍由Astra治理，用户后续独立架构review尚未到达。

## 原件与完整性

[原始source.zip](source.zip)为用户指定scratchpad返回包，8,301,277 bytes，SHA256 `6bbf56adcb964f6405b4900051884020a45a364a9ece3fb0649404f8165c8454`。[逐文件manifest](source-manifest.json)记录98个常规文件的原始字节/hash及PNG尺寸；ZIP CRC通过，98项均与用户指定loose目录逐字相等。作者自报语义源3f5daf4，manifest保留完整SHA，不把该声明当所有内容都同步的证明。v1原件保持不变。

ZIP根含 `figures/`、`canvas-v2/`、`CHANGES.md`；可只提取所需SVG/PNG/文本到独立候选目录。审阅读取文件而未执行返回包的render/build脚本。下列 `source.zip:...` 均为可追查的包内路径，不依赖临时目录。后续绘制必须同时消费本页与[原正式DG/DR裁决](../../../design/se-control-one-shot-2026-09-11/return-intake.md)。

## A · 架构图逐项裁决

| 图 | 采用与需修订 | 状态 |
|---|---|---|
| F1 ownership | 保留分owner的解释任务；Expert/Compiler/RunPlan及adapter长标签超框，右侧留白失衡需重排。执行trace与Artifact/evidence不能按单一Work Core存储owner混画；按DEC-013逐边核对 | adapt；未发布就绪 |
| F2 compile/commit | 保留compile→execute→candidate→authority→commit读序；Review副文超框，Runtime→candidate连线起点与框有间隙需接实。record不自动成为正式fact；不能把所有runtime控制归给Core；“a person decides”可保留为本图明确的人类判断实例，不扩成所有运行必经的人类动作 | adapt；未发布就绪 |
| F3 runtime anatomy | 宽屏层次可复用；协议保真是DRT待验证项，不能写作今日已完成。observation/evidence不全由RuntimeAdapter独占，当前service耦合与目标解耦分开 | adapt；未发布就绪 |
| F4 continuity | 保留旧图与原资产；state-to-commit的“运行上下文”改“上下文投影”，pipeline Compile限定为M09 context compilation，不等于完整目标Work Compiler | reuse with corrected caption |
| F5 composition | 宽屏组合方向保留；Schema/Contract/Expert非高低继承关系，Expert内surface限定为presentation metadata，不能暗示UI authority。390图仍显示720 plate左片，不能满足其compact promise，需真正紧凑view | optional/adapt |

16张作者PNG覆盖四图×1440/390×明暗，Astra已查看；390显示720画布左片。工程plate可显式横向滚动，但当前PNG不证明所有内容可遍历，须真实页面检验滚动、文本等价说明及独立文本溢出。F5另做compact view。Pages公开文案应精简实现名；工程版保留可追查owner/成熟度。最终正确关系由[DEC-013](../../../architecture-runtime-canon.md)及[F合同](../../../release/architecture-reconciliation-2026-09-11.md)持有。

## B · 19板v2裁决

接受修正：旧palette不再自称pixel baseline；Settings数值示例独立NOT SHIPPED；ChatSpace换成有依据的只读问题；Composer为source-inferred specimen、Stopping保留28×28；header disclosure补aria语义；Attention选中与状态正交；Rebuild inert且撤回虚构route；Pages产品文案与能力注释分开。上述是候选设计的纠正，未改App。

仍须修订：

- `canvas-v2/shared.mjs` dark authored raised/ink/muted/line为#343b3f/#f4f5f6/#b6bec2/#737e84；当前styles仅覆盖dark authored-surface，其余沿root值。该板可作为候选差异，不能称当前完整cascade parity，更不能暗改现已接受气泡偏好。
- `canvas-v2/boards-spark.mjs` Overview/partial所用“extension inbound-nda not loaded”违反BE-41不要求producer/session的查询合同。改用真实投影返回的reason，或删除该场景；不得根据extension加载状态虚构不可用。
- Main、Settings、ChatActions、SparkStates、AttentionQueue提供的PNG底部仍裁切。增加frame或拆成完整子板，补全内容检查；不能只增加高度参数就称修复。
- PagesStory最后“3 current / none stale”与human Review相邻，易把判断画成自动消除旧派生失效。须明确实际重建/新派生与新版本的因果；旧candidate和原失效事实保留。商业化产品叙事可以完整，因果不能偷换。
- `canvas-v2/RETURN-design.md`旧“Awaiting Astra”五项与Suggested PR order不再是活动派单，统一映射既有DG/DR；原文保留，不能重开已裁分歧。Scout试验8/8与旧SHA、Shape输入SHA、ChatActions registry/glyph计数等历史引用须沿原消费账纠正，不能反向当权威。

A2（`canvas-v2/glyphs/spark-a2.svg`）仅进入DR-02局部光学候选，原A/A adopted specimen方向不变；16/18/20/24真实槽、邻居对照、IC-6与适用a11y证据接续，未canonical。CR-01–04未在本返回中绘制，作者已明示；用户随后截图新增[CR-05](../../../design/chat-reading-2026-09-11.md)，继续接DR-04。

## 审阅范围与接续

Astra查看35张现成PNG（16图+19板），读取SVG、CHANGES、RETURN与相关源码；大长板整体图缩放较多，未完成全部像素的放大审阅。Luna有界核对源码/词表/索引；其核对不能替代Astra架构裁决或整个产品独立接受。未运行返回JS、真实site build、VoiceOver、IME、forced-colors、200%、1280、IC-6 blur或新真实宿主交互；不把作者渲染矩阵当这些检查。

[Pages分层ONE-SHOT](../../../release/fresh-claude-pages-2026-09-11/ONE-SHOT.md)是下一任务入口：先在上述范围修订可用资产，再对选定发布段落给2–3个不同构图候选。用户已明确Pages另起任务，本轮不启动Pages源码施工或部署。

## Luna有界源码核对 · Astra消费

核对基线c127961；原图README引用3f5daf4。`figures/FIGURES-README.md`的roles.svg SHA漏写字符，实际为 `a6ec15e1d79c19e3e443186ebde1ece956043c43a378ad69e00d07eedc211901`；修订副本须更正，原文不改。已核canon、architecture、reconciliation、figures.json、diagram、pipeline等所列来源hash相符；这不使错误roles hash自动通过。

F1 SVG第96–97行合并回流需拆分：service事件/telemetry入RuntimeStore，candidate由extension WorkAdapter入Core。F2第49–50行改为“record, not an accepted work fact”；第88–89行区分Work queries/decisions与runtime control/event owner。F3第58–60行不可声称所有观察与候选只经RuntimeAdapter；第47行保真声明改为owner义务，当前仅有Pi SessionManager journal/continuation证据，DRT-02保真probe未做。

Luna另核当前default palette与dark authored差异、BE-41不依赖producer/session、五类站点先例路径。RETURN第47行的Pages specimen说明本身没有live或授权错误；不因旧账残留否认v2已明确撤回CSS-only与pixel-perfect。所有结论按上表采纳为修订要求，不扩大为整包独立接受。
